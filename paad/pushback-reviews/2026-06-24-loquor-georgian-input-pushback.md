# Pushback Review: Loquor Input Translation — Georgian (Zork I × ქართული) Phase 2 Design

**Date:** 2026-06-24
**Spec:** `docs/superpowers/specs/2026-06-24-loquor-georgian-input-design.md`
**Commit:** 63a45f2de98097d7641eab17f554d8600afb60b6

> Note: this spec had **already** been through one `/pushback` pass (its own header
> records "revised after adversarial /pushback review, same day" — findings 1–10).
> This review verified those resolutions against the actual code and looked for what
> the revision missed or introduced. The three issues below are **new**.

## Source Control Conflicts

None — no conflicts with recent changes. Every commit after the spec is the spec
docs themselves; recent work is all Phase-1 `ka` *output* translation, which Phase 2
leaves untouched. The spec's line-number pins were spot-checked and hold:
`translatePipeline.ts:972` queue bail ✓, `useNaturalLanguage.ts:265` lex memo ✓,
`LexLang = 'fr'|'de'|'es'` ✓, `isMetaCommand` runs before `metaAlias` ✓,
`OUTPUT_ONLY_LANGS = Set(['ka'])` ✓, `directions.ts` "Covers en/fr/de/es; extend
DIRECTION_WORDS/LEAD" extension point ✓.

**Two "current state" claims in §7 are inaccurate** (feed Issue [2]):
- §7 says the help block is "today en/fr/de/es only" — false. `help.ts` already has a
  `ka` arm (`case 'ka':`, `HELP_ALIASES.ka = new Set(['help'])`), currently Phase-1
  "type in English" copy.
- §7 says notices are "mostly absent → English fallback" — `notices.ts` already has
  `ka` entries (e.g. `ka: 'აკრიფეთ ინგლისურად — მაგ. open the mailbox'`). The work is
  *revising* existing entries, not authoring fresh ones.

## Scope Shape

One cohesive feature (Georgian input). **Large but inherently so** — the lexicon
data, the one gated pipeline stage, the ~5 runtime seams, the 6 gates, and the copy
across 3 files are mutually load-bearing (can't ship the route without the copy, or
claim the bar without the gates). The `(beta)` + `NATIVE-REVIEW-DRAFT` gating already
serves incremental rollout. **No split worth forcing.**

## Issues Reviewed

### [1] Georgian input isn't gated to Zork I, but only Zork I has a `ka` noun lexicon
- **Category:** omissions / player-experience
- **Severity:** serious
- **Issue:** The spec scopes input to **Zork I only** (§1, §8: "`NOUNS.ka` holds only
  `ZORK1_SIG`"), but the runtime graduation keys everything on `language === 'ka'`,
  never on the story signature:
  - §5.2 lex memo admits `ka` for **any** signature; `nounLexicon('ka', zork2_sig)`
    returns `null` (verified: `NOUNS[lang][sig] ?? null`) → `{ core: KA_CORE, nouns: null }`.
  - §5.3 Terminal route sends **all** `ka` input through `nl.translate`, not just Zork I.
  - §7 copy (placeholder "type in Georgian or English", activation notice "Georgian
    input now works (beta)") fires **unconditionally** on `outLang === 'ka'`.

  Net effect on **Zork II/III** (where `ka` already displays in English, no corpus): the
  player is invited to "type Georgian (beta)," directions and meta-aliases resolve, but
  **every object-bearing command abstains** (`nouns` is `null`). Today (Phase 1) those
  players are correctly told "type in English." This is the CLAUDE.md "talk to me first"
  shape: a natural command (`აიღე ფანარი` on Zork II) structurally guaranteed to fail,
  presented as if it works. It also bites a gate — §6 adds `'ka'` to the round-trip
  `LANGS`, which iterates `GAMES (zork1/2/3) × LANGS`, so `ka × zork2` hits a `null`
  noun lexicon and must be skipped (NPE risk).
- **Resolution:** **Option 1.** Gate the whole input graduation on
  `signature === ZORK1_SIG` via one shared `kaInputActive(lang, sig)` predicate, reused
  at all four sites (lex-memo admit, Terminal route, placeholder, activation notice).
  Zork II/III `ka` stays Phase-1 type-English (no regression, no misleading invite). Add
  a test that Zork II `ka` still raw-sends + shows the type-English copy, and make the
  round-trip gate skip `ka × {zork2,zork3}` null lexicons.

### [2] The "no-English-leak" gate passes on the stale Phase-1 copy
- **Category:** ambiguity / gate-completeness
- **Severity:** moderate
- **Issue:** §6's `ka`-notice no-English-leak gate (finding-5) and §7's "tests assert the
  updated `ka` copy is Georgian" enforce *script*, not *semantics*. The `ka` copy already
  exists and is already mostly-Georgian — and currently tells the player to type English
  (`notices.ts`: `აკრიფეთ ინგლისურად — მაგ. open the mailbox`; `help.ts` `case 'ka':`
  Phase-1 arm). A gate asserting "`ka` copy is non-English" is **already green on the
  wrong copy**, so it would pass without the §7 copy change ever being made — it cannot
  fail on the one regression it exists to prevent (stale "type English" copy surviving the
  migration). Compounded by §7's inaccurate "today en/fr/de/es only" / "mostly absent"
  wording, a plan written literally from §7 could author duplicate arms instead of
  inverting the existing ones.
- **Resolution:** **Option 1.** Make the gate assert the new *semantics*: pin that the
  activation notice mentions Georgian input (and `(beta)`), the placeholder is the "type
  in Georgian or English" form, and the *old* "type-English-only" strings are **gone** —
  kept as a separate assertion from the no-English-script check. Reword §7 to "revise the
  existing `ka` arms (currently Phase-1 type-English)" so the plan inverts rather than
  re-authors.

### [3] `isForcedGrammarOnly` is a second source of truth for a flag `model` already carries
- **Category:** feasibility / design-clarity
- **Severity:** minor
- **Issue:** §5.4 proposes a new `isForcedGrammarOnly(lang)` predicate, but grammar-only
  is **already** derived from `internal.model === 'grammar'`, and `model` is
  **session-global**, not per-language (`useNaturalLanguage.ts:202` builds public
  `state.model` from it; `:252` passes `model: internal.model`). The real hole the
  predicate plugs — a player who downloaded the model for fr/de/es (`model: 'full'`) then
  switches to `ka` — is genuine. But a `ka`-only predicate at the *input dispatch point*
  leaves the **public `state.model` reading `'full'` for `ka`**, so anything keyed on it
  (picker `· basic` / `✦ improve` markers, the §5.3 `:423` "no model-download modal"
  expectation) would treat a `ka` session as model-capable. The predicate patches one of
  several readers.
- **Resolution:** **Option 1.** Force `model: 'grammar'` for `ka` at the state boundary
  (where the reducer/derivation sets `internal.model` for a `ka` session). Every existing
  `model === 'grammar'` consumer — input `grammarOnly`, public `state.model`, picker
  markers, modal suppression — becomes correct for free; no new predicate, one choke
  point instead of N.

## Summary

- **Issues found:** 3
- **Issues resolved:** 3
- **Unresolved:** 0
- **Spec status:** ready for implementation, **pending three spec edits** — (1) a shared
  `kaInputActive(lang, sig)` Zork-I gate across §5.2/§5.3/§7; (2) §6 gate pins the new
  Phase-2 copy semantics + §7 reworded "revise" not "author"; (3) §5.4 forces
  `model: 'grammar'` for `ka` at the state boundary instead of a new input-only predicate.
  This report records the decisions; the spec file was left unchanged per the author's
  choice of a separate report.
