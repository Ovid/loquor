# Loquor Input Translation — Georgian (Zork I × ქართული) Phase 2 Design

**Status:** Approved design (brainstormed 2026-06-24; revised after adversarial
`/pushback` review, same day). Phase 2 of the two-phase Georgian effort. Branch:
`ovid/georgian-input`.

**Source-of-truth lineage:** This is the explicit Phase 2 promised by
`2026-06-17-loquor-output-translation-georgian-design.md` (Phase 1, output). It
extends the deterministic input-lexicon pipeline built for fr/de/es
(`2026-06-09-loquor-nl-multilingual-design.md`) to Georgian. **This document is
the Phase 2 authority** and intentionally supersedes two Phase-1 deferrals:

- Phase-1 §2 said "Phase 2 adds `ka` to `LexLang`." **It does not** — `LexLang`
  keys the LLM machinery and `ka` must never reach an LLM. Phase 2 instead adds a
  separate `InputLexLang` for the input lexicon (§5.3, finding-2 fix).
- Phase-1 §6 deferred round-trip enrolment to Phase 2 — **done here** (§6).

On merge, add this spec to CLAUDE.md's numbered source-of-truth list as the top
Georgian authority (§13).

---

## 0. Why this matters (read this first)

Phase 1 let a Georgian speaker *read* Zork I in ქართული but still type commands
in English. Phase 2 closes the loop — type `აიღე ფანარი`, the lamp is taken, in
Georgian end to end. For a language with almost no localized software and
essentially no interactive fiction, native *input* is the half that makes the
game feel genuinely yours.

It is achievable now for the same reasons Phase 1 was: the deterministic
input-lexicon pipeline (fr/de/es) is proven and data-driven, the author has
direct access to **native Georgian playtesters in Tbilisi**, and one structural
insight (§2) collapses Georgian's morphology to a small, closed authoring task.
As in Phase 1, the spine is: **automated gates enforce structural completeness;
native speakers enforce naturalness.**

---

## 1. Goal & scope

**Goal:** Selecting **Georgian** graduates `ka` from *read-Georgian/type-English*
to *read-Georgian/**type-Georgian***. Typed Georgian commands are parsed
**deterministically (grammar-only, NO LLM, ever — §5.4)** to canonical English
game commands. A command the lexicon cannot parse **abstains** with a Georgian
notice + the quoted-English escape hatch — it never guesses. **English (ASCII)
input still raw-sends** as it does today, so nothing currently working regresses
(§5.5, the finding-6 player-experience decision).

**The bar — "walkthrough-completable":** a Georgian speaker following an
in-language walkthrough can drive Zork I from *West of House* to a **350/350 win**
by typing Georgian. Forcing function: a Georgian walkthrough-parse gate (§6).

**In scope (Phase 2):**
- A Georgian Zork I **input** lexicon: `ka.core.ts` (verbs, postpositions, meta)
  + `ka.zork1.ts` (nouns, bare-stem form).
- One new **data-driven, gated** parse stage (`expandGeorgian`) + one optional
  `CoreLexicon.postpositions` field — a no-op for fr/de/es (§3).
- Georgian direction words added to `directions.ts` (its documented extension
  point — §3.3).
- Runtime graduation: a new `InputLexLang` type; `ka` joins the input lexicon
  **(Zork I only)**, **stays in `OUTPUT_ONLY_LANGS`** (output is still
  corpus-only — review-fix C2), routes through `nl.translate`
  **when `kaInputActive` (Zork I)**, is forced grammar-only via the `model` field,
  and keeps English-ASCII raw-send (§5). On Zork II/III `ka` stays Phase-1
  type-English (§5.6).
- **Georgian `ka` strings for every input-path notice the player can hit** —
  activation, abstain/couldn't-translate, help block + escape instruction, input
  placeholder (§7). This is a hard CLAUDE.md "no forced English" requirement, not
  a nicety.
- **Convert the `ka` disambiguation `{raw}`-echo to the drop-the-noun reframe**
  (`zork1.ka.templates.ts`). Today the which-print prompt echoes the player's
  typed noun verbatim (`რომელ {raw}-ს გულისხმობ — …`) — acceptable in Phase 1
  only because `ka` input was English. Once the player types **Georgian**, an
  echoed English vocab word is forced English (a CLAUDE.md "no forced English"
  violation). fr/de/es already **drop** the queried noun and let the translated
  candidates disambiguate; mirror that for `ka` (§7). Invert the `ka` UAT pins
  that currently assert the English noun is kept verbatim.
- The gates: walkthrough-parse, both round-trips, validate, input-UAT,
  `NATIVE-REVIEW-DRAFT` marker, and a `ka`-notice no-English-leak assertion (§6).

**Explicitly out of scope (deferred, stated — §8):**
- **"it"-anaphora.** Georgian object pronouns are verb suffixes, not tokens.
  **Verified safe:** the canonical walkthrough (`walkthrough-commands.ts`) has
  **zero** pronoun command steps, so the walkthrough bar does not need it.
- **Zork II / III Georgian input** (II/III stay English by design; `NOUNS.ka`
  holds only `ZORK1_SIG`).
- **General morphology** beyond the closed suffix set (the rejected "segmenter").
- **Free-play naturalness breadth** (fills via the Tbilisi loop + escape hatch).
- **Dropping the `(beta)` marker** (native review is BLOCKING — §9).

---

## 2. The structural insight that keeps this small

1. **Game commands are imperatives.** A Georgian imperative is built on the
   aorist stem; in the aorist series the **direct object is nominative** = the
   **citation (dictionary) form**. So a direct-object noun is just its citation
   form (`აიღე ფანარი` = "take lamp"). **No case tables for direct objects** —
   the input mirror of Phase-1 §4's "minimize case forms."
2. **Only indirect-object / prepositional slots carry morphology**, and it is a
   **closed, finite postposition set** (`-ში` in, `-ზე` on, `-ით` with, `-დან`
   from, `-თან` at, `-კენ` toward). `ჩადე X ყუთ-ში` = "put X in box".

Everything else Georgian has (split-ergativity, seven cases, polypersonal verb
agreement, preverbs) is irrelevant to the **imperative command** sublanguage Zork
accepts. We author that sublanguage, not the language.

> **Notation:** the `-` prefixes on suffixes in this document (`-ში`, `-ით`) are
> notation only. Real typed Georgian has **no hyphen** (`ყუთში` is one token).
> All authored `ka` data is stored **fold()-normalized and hyphen-free** (§3.2);
> a gate asserts `fold(entry) === entry` for every `ka` datum (finding-7 fix),
> because `fold()` maps `-` → space and would split a hyphenated suffix away.

---

## 3. Architecture — reuse the pipeline, add one gated stage

The fr/de/es deterministic pipeline (`src/llm/lexicon/parse.ts`,
`translatePipeline.ts`) is reused **unchanged in behavior**. Georgian is added as
**data plus one gated stage**, so fr/de/es are provably untouched.

### 3.1 One optional `CoreLexicon` field (`src/llm/lexicon/types.ts`)

```ts
/** Georgian postposition suffix (folded, hyphen-free) → canonical English prep.
 *  The English value MUST be in vocab.preps. Present only for languages whose
 *  adpositions are noun-suffixes (Georgian); absent for fr/de/es, so every
 *  expandGeorgian code path is unreachable for them. */
postpositions?: Readonly<Record<string, string>>   // { 'ში':'in', 'ზე':'on', 'ით':'with', … }
```

(There is **no** `directions` field — directions are owned by `directions.ts`,
§3.3, finding-1 fix.)

### 3.2 One new parse stage: `expandGeorgian(tokens, core)`

Runs **after the verb is resolved, on the remaining object-span tokens** (NOT on
the whole clause — **review-fix C1**), and only when `core.postpositions` is
present (i.e. only for `ka`). The verb must be resolved against its **unreduced**
form first: a Georgian imperative routinely ends in `-ი` (`მიეცი` give, `მოკალი`
kill, `გახსენი` open, `მიაბი` tie), and an unconditional `-ი` strip applied
*before* the verb lookup would mangle the verb into a non-key and MISS with no LLM
net. So `parseLexicon` resolves the verb on the raw tokens, then applies
`expandGeorgian` to the object-span remainder. `tokenize`/`fold` are
pass-through-safe for Mkhedruli (caseless, no NFD decomposition — Georgian is
single-codepoint in NFC and NFD; verified, not assumed). For each remaining token,
in this
**fixed precedence** (finding-4 fix — the order is part of the contract, not left
to the plan):

1. **Postposition split — first, to a fixpoint, longest-first over the full
   closed suffix set (including `-ით`).** If a token ends in a postposition
   suffix `S`, replace it with **`[S, stem]`** in that order, so a prep token
   precedes the noun and the existing **prep-split** stage (`verb obj PREP ind`)
   fires unchanged. `S` resolves to its English prep via the effective prep table
   (the `postpositions` map merged into prep lookup — plan picks the tidier
   wiring, but the *merge* is required, not optional). `ჩადე X ყუთში`: the verb
   `ჩადე` (put) is resolved first; the remainder `[X, ყუთში]` → `[X, ში, ყუთ]`
   → "put X in box".
2. **Nominative `-ი` strip — second, only on a token that matched NO
   postposition.** A trailing nominative `-ი` is stripped to reach the stem. This
   ordering guarantees an instrumental like `ფანრით` is consumed as `-ით`
   (postposition) and never mis-split by the `-ი` rule.

The nominative-`-ი` strip is **safe for the closed, enumerated Zork I noun set,
gate-enforced by the round-trips** (§6) — *not* "provably safe" in general:
genuine `-ი`-final stems exist in Georgian (mostly borrowings), so if any Zork
object maps to one it is **hand-tuned in the lexicon** (listed in both its
`-ი`-bearing and bare forms) and the round-trip gate catches any stem/lexicon
disagreement. The **noun lexicon stores bare stems**; both `ფანარი` (nominative)
and `ყუთში` (postpositional) reduce to the stored stem. No stemmer, no general
analyzer — only this fixed, closed suffix list.

### 3.3 Direction words (`src/llm/directions.ts`, NOT a `CoreLexicon` field)

`parseDirection(input, movement)` is a standalone module that hardcodes every
language's direction words in `DIRECTION_WORDS` / `LEAD`; its own header comment
says *"Covers en/fr/de/es; extend DIRECTION_WORDS/LEAD."* Georgian directions are
added there, matching the established pattern (finding-1 fix). The closed Georgian
cardinal set (`ჩრდილოეთი` north, `სამხრეთი` south, `აღმოსავლეთი` east,
`დასავლეთი` west, `ზემოთ` up, `ქვემოთ` down, `შიგნით` in, `გარეთ` out, the
diagonals, with/without the adverbial `-ით`) maps to the movement canonicals. A
`directions.test.ts` case covers Georgian. (The walkthrough-parse fixture omits
pure movement — `directions.ts` owns it — so Georgian directions are gated here,
not in the walkthrough fixture.)

**Blast-radius guarantee:** every new branch is gated by `core.postpositions`
presence (only `ka`) or lives in `directions.ts`'s per-language maps. A regression
test asserts an fr/de/es clause produces byte-identical output before and after.

---

## 4. Data to author

### 4.1 `src/llm/lexicon/ka.core.ts` (`KA_CORE: CoreLexicon`)
- **`verbs`** — natural Georgian imperative forms for the walkthrough action set
  (take/get, drop/put-down, open, close, go, look, examine, read, attack/kill,
  put, light/extinguish, enter/board, move, …); list common aspect/preverb pairs
  a player would type.
- **`postpositions`** — §3.1 closed set.
- **`metaAliases`** — Georgian inventory/look/save/quit/etc. → raw English meta.
  **English meta verbs stay reachable** for `ka` too: `isMetaCommand` is consulted
  before the lexicon, so `i`, `l`, `save`, `quit` still work for a `ka` player
  (finding-8 fix). The "Mkhedruli can't collide" claim (§6) scopes to the *noun*
  collision guard only.
- **`particleVerbs` = []** (Georgian preverbs are fused, not separable);
  **`verbIdioms`** only for genuine multiword commands.
- **Pronoun arrays empty** (Georgian object pronouns are verb suffixes — "it"
  deferred, §8).

### 4.2 `src/llm/lexicon/ka.zork1.ts` (`KA_ZORK1: NounLexicon`)
- The closed Zork I object set (~50–80 canonicals) → Georgian **bare-stem**
  surface words/phrases (folded, hyphen-free). Multi-word and synonym forms as
  fr/de/es author them. `-ი`-final-stem objects (if any) listed in both forms.

Every entry is **`NATIVE-REVIEW-DRAFT`** until the Tbilisi loop confirms it (§9).

---

## 5. Runtime graduation (the contained logic edits)

This section names **every** seam, including the two the first draft omitted (the
`lex` memo and the Terminal route — findings 2, 3, 10).

### 5.1 Input-only language type (finding-2 fix)
**`src/llm/lexicon/types.ts`** — add, and leave `LexLang` (the **LLM**-keyed
type) as `'fr' | 'de' | 'es'`:
```ts
/** Languages with an INPUT lexicon. ka has one (Phase 2) but must NEVER key the
 *  LLM machinery (FEWSHOTS, xlPrompt TARGET/SHIMMER, notices ByLang, fallbackResolve),
 *  which stay Record<LexLang,…> so a ka LLM entry is a type error by construction. */
export type InputLexLang = LexLang | 'ka'
```
**`src/llm/lexicon/index.ts`** — `CORES`, `NOUNS`, `coreLexicon`, `nounLexicon`,
`lexiconWordSet`, `KNOWN_COLLISIONS` re-key from `LexLang` to `InputLexLang`; add
`ka: KA_CORE` and `ka: { [ZORK1_SIG]: KA_ZORK1 }` (Zork I only). The LLM modules
keep importing `LexLang` and gain nothing for `ka`.

### 5.2 The `lex` memo (finding-3 fix) — gated to Zork I
**`src/llm/useNaturalLanguage.ts:266`** guards `if (language !== 'fr' && language
!== 'de' && language !== 'es') return null`, so today `ka` gets no lexicon.
Generalize it to admit any `InputLexLang` (membership, not a hardcoded triple) **but
gate `ka` on the signature** via `kaInputActive(language, signature)` (§5.6), so `ka`
routes to `parseLexicon` **only on Zork I**; on Zork II/III `ka` keeps `lex === null`
and stays Phase-1 type-English.

### 5.3 The Terminal route + test inversions (finding-3 fix) — Zork I only
**`src/ui/Terminal.tsx`** raw-sends for `ka` today (so the picker drives display
only). Phase 2 routes the `ka` command field through `nl.translate` **only when
`kaInputActive(outLang, signature)` (Zork I, §5.6)**; on Zork II/III `ka` keeps
raw-sending (Phase-1 behavior). The pinned tests change:
- `Terminal.test.tsx:296` ("ka raw-sends English, never nl.translate") → inverts:
  ka routes through `nl.translate`; **plain-ASCII English still reaches the engine**
  via the §5.5 fallback (so the *spirit* of "English works" is preserved).
- `Terminal.test.tsx:388` ("type in English" placeholder) → "type in Georgian or
  English" (§7).
- `:335` (help intercept) → now reached through the normal `nl` path (ka is no
  longer output-only), still lands on the Georgian help block.
- `:423` (no model-download modal for ka) → **unchanged**; ka still offers no
  model (forced grammar-only).
- **NEW** — a Zork II `ka` test pins that input still raw-sends and the
  placeholder/notice stay the Phase-1 type-English copy (the `kaInputActive` gate,
  §5.6).

### 5.4 Forced grammar-only for `ka` (findings 2, 10 fix) — via the `model` field
Grammar-only is **already** derived from `internal.model === 'grammar'`
(`useNaturalLanguage.ts:202` builds public `state.model` from it; `:252` threads it
into the pipeline's `grammarOnly` flag). `model` is **session-global**, so a player
who downloaded the model for fr/de/es (`model: 'full'`) then switched to `ka` would
carry `'full'` into the `ka` session and could reach the LLM. **Fix it at the state
boundary: force `internal.model = 'grammar'` whenever the active language is `ka`.**
That makes **every** existing `model === 'grammar'` consumer correct for free — the
input `grammarOnly` dispatch in `translatePipeline.ts`, the public `state.model`,
the picker `· basic` / `✦ improve` markers, and the model-download-modal suppression
— with **no new `isForcedGrammarOnly` predicate** to keep in sync across read sites
(the same single-source-of-truth discipline §5.1 applies to `LexLang`). So `ka`
never calls `generateRaw` even when a model is downloaded for fr/de/es. **`CORPUS_ONLY_LANGS`
(output) is unchanged** — output stays corpus-only; this is the input twin.

**`OUTPUT_ONLY_LANGS` is NOT emptied (review-fix C2 — the first draft was wrong).**
The set has **five** other consumers that stay correct for `ka`: the WebLLM-modal
suppression (`useModelDownload.ts:324`), the screen-reader announce routing
(`useNaturalLanguage.ts:233`), the title-only display (`nlModeSummary.ts:53`), the
picker copy (`NlLanguagePicker.tsx`), and a `types.test.ts` invariant
`OUTPUT_ONLY_LANGS ⊇ CORPUS_ONLY_LANGS`. `ka` output **stays** corpus-only
(`ka ∈ CORPUS_ONLY_LANGS`), so the invariant requires `ka ∈ OUTPUT_ONLY_LANGS`;
the set means *"no output LLM / corpus-only display,"* which is still true for
`ka`. Phase 2 changes only the **input** decision, and gates it on `kaInputActive`
(§5.6), not on `!OUTPUT_ONLY_LANGS`. The queue bail at `translatePipeline.ts:972`
switches from `OUTPUT_ONLY_LANGS.has(live.language)` to **`!liveRef.current.lex`**
(no input lexicon present): it bails for en/off and `ka`-on-non-Zork-I (no `lex`)
and **drains** for `ka`-on-Zork-I (which has a `lex`), verified by test.
**`src/llm/types.ts` is unchanged.**

### 5.5 English-ASCII raw-send fallback (finding-6 decision: "keep English raw-send")
On a Georgian parse **miss**: if the input line is **plain ASCII** (English),
**raw-send it to the Z-parser exactly as the `en` path does** — do not abstain.
Only a line **containing Georgian** that misses abstains (Georgian notice + escape
hatch, §7). Georgian (non-ASCII) and English (ASCII) cannot collide, so this is
purely additive and nothing currently working for a `ka` player regresses. (This
is the decided resolution of the §7 behavior-change concern — see §7.)

fr/de/es input routing is unchanged: every new branch is reachable only via
`InputLexLang` membership / the `ka` predicates.

### 5.6 The Zork-I input gate (`kaInputActive`) — issue-1 fix

`ka` graduates to Georgian *input* **only on Zork I**, because `NOUNS.ka` carries a
noun lexicon for `ZORK1_SIG` alone (Phase 1 scoped the corpus the same way). A
single shared predicate

```ts
const kaInputActive = (lang: NlLanguage, sig: string) =>
  lang === 'ka' && sig === ZORK1_SIG   // ka has a noun lexicon only here
```

is consulted at **all four** `ka` input sites so they cannot drift apart:
1. the **lex memo** (§5.2) — admit the `ka` lexicon only when `kaInputActive`;
   otherwise `lex === null` (no Georgian input).
2. the **Terminal route** (§5.3) — send the `ka` command field through
   `nl.translate` only when `kaInputActive`; otherwise raw-send (Phase-1 behavior).
3. the **input placeholder** (§7) — "type in Georgian or English" only when
   `kaInputActive`; else the Phase-1 "type in English".
4. the **activation notice** (§7) — the Georgian-input bilingual message only when
   `kaInputActive`; else the Phase-1 type-English message.

On **Zork II/III**, `ka` is therefore byte-for-byte its Phase-1 self: English
display (no `ka` corpus there), English raw-send input, type-English copy — **no
regression and no misleading invite** to type Georgian that would only abstain
(`nounLexicon('ka', sig)` is `null` for those signatures). A test pins Zork II `ka`
raw-sends + shows the type-English copy.

---

## 6. Gates (executable acceptance criteria)

- **NEW — Georgian walkthrough-parse gate** (`parse.ka-walkthrough.test.ts`). A
  Georgian fixture mapping every `walkthrough-commands.ts` step to its Georgian
  typed form; each must parse via the **grammar-only path** to the same canonical
  the English walkthrough uses. **Zero misses.** Fixture is `NATIVE-REVIEW-DRAFT`.
  (Movement is owned by `directions.ts` — covered by §3.3's directions test.)
- **Input-lexicon round-trip** (`src/llm/lexicon/roundtrip.test.ts:22`). Add `'ka'`
  to `LANGS` (now `InputLexLang[]`). Every `ka` noun word, fed `<take> <word>`,
  parses to `take <emit>` through `fold()` + `expandGeorgian`. Pin an `-ით`
  instrumental form and any `-ი`-stem noun (finding-4). **`ka` has a noun lexicon
  only for Zork I** (`NOUNS.ka = { [ZORK1_SIG]: … }`), so the `GAMES × LANGS` loop
  must **skip `ka × {zork2,zork3}`** (null `nounLexicon`) — confirm fr/de/es already
  skip a null lexicon, or add the guard (issue-1).
- **Display↔input round-trip** (`src/translate/corpus/roundtrip.test.ts:34`). Add
  a `ka` `Row` (`headExtra: []`). **Finding-9 task:** this folds the Phase-1
  *display* object forms back to the new input lexicon — audit them; expect
  possible edits to the **display** corpus if any form doesn't reduce to a bare
  stem (the gate enforces it; the audit is so it's planned work, not a surprise).
- **Validate gate** (`src/llm/lexicon/validate.test.ts`). Every `ka` verb target ∈
  vocab; `KNOWN_COLLISIONS.ka[ZORK1_SIG]` reviewed — expected `[]` (Mkhedruli is
  non-ASCII; the *noun* collision guard has nothing to catch). This claim scopes
  to that guard only (finding-8).
- **Input UAT pins** (`src/llm/lexicon/parse.ka-uat.test.ts`). Puzzle-critical
  verbs + every confirmed finding, mirroring `parse.es-uat.test.ts`.
- **`ka`-notice copy gates** (finding-5 + issue-2, **two complementary
  assertions**). **(a) No English-script leak:** every input-path notice `ka` can
  surface (abstain, help, escape instruction, placeholder) contains no English
  script — the minimize-English-leak discipline. **(b) New-semantics pin (§7):** the
  activation notice mentions Georgian input + `(beta)`, the placeholder is the "type
  in Georgian or English" form, and the **old type-English-only `ka` strings are
  gone**. **(a) alone is insufficient** — the existing Phase-1 `ka` copy is already
  Georgian *script* yet says "type English", so (a) is already green on the
  un-inverted copy and cannot catch the migration; **(b) is what enforces Phase 2.**
- **`NATIVE-REVIEW-DRAFT` marker test** (mirrors Phase 1).
- `make all` clean.

---

## 7. Accessibility & copy (mandatory — finding-5 + finding-6)

**The player-experience decision (finding-6), made with the owner:** Phase 2
*changes* how `ka` handles typed input, and that was not waved away — we chose
**"keep English raw-send"** (§5.5). A `ka` player who types English today keeps
working; Georgian input is added on top. So there is **no regression** to escalate
— by design choice, not by an incorrect "nothing changed" claim.

**Georgian copy to revise** (hard "no forced English" requirement). **NOTE
(issue-2):** `ka` arms **already exist** — `help.ts` (`case 'ka':`,
`HELP_ALIASES.ka`) and `notices.ts` (`ka:` entries) carry Phase-1 *type-English*
copy (e.g. `ka: 'აკრიფეთ ინგლისურად — მაგ. open the mailbox'`). This is a
**revision (inversion)** of existing entries, **not** greenfield authoring; a plan
must find and flip them, not add duplicate arms. The Georgian-**input** copy below
shows **only when `kaInputActive` (Zork I, §5.6)** — on Zork II/III `ka` the
Phase-1 type-English copy is retained unchanged:
- **Activation notice** — replace the Phase-1 "commands are typed in English"
  message with a bilingual one: Georgian input now works (beta); an unrecognized
  command can be sent verbatim via `"quoted English"`. Reuse the existing
  `aria-live` notice plumbing; no new live region.
- **Help block + escape instruction** (`help.ts`) — **revise** the existing `ka`
  arm (currently Phase-1 type-English). The escape *example* `"wind up canary"`
  stays English by necessity (quoting bypasses translation); the *instruction
  around it* is Georgian.
- **Abstain / couldn't-translate / nothing-sent / ran-out notices**
  (`notices.ts`) — **revise** the existing `ka` entries (the type is already
  `Partial<Record<'ka'>>`; the present Phase-1 `ka` strings say "type English").
- **Input placeholder** — "type in Georgian or English" (was "type in English"),
  **Zork I only** (`kaInputActive`).
- **Disambiguation drop-the-noun reframe** (`zork1.ka.templates.ts`, review
  cross-cut) — replace the three `{raw}`-echo which-print templates (2/3/4
  candidate) with the noun-dropped Georgian frame (e.g. `რომელი გულისხმობ —
  {obj.indef} თუ {obj2.indef}?`), so no English vocab word is forced once input is
  Georgian. Invert `zork1.ka.uat.test.ts`'s `toContain('lamp')`/`'button')`
  assertions to `not.toContain`, and update the `ka-native-review-draft.test.ts`
  locator (it finds the entry by `{raw}` + `{obj.indef}`, which the reframe
  removes from `out`).
- **`(beta)` marker** stays (textual, non-colour, announced); drops only on native
  sign-off (§9).
- **Tests** assert the **new Phase-2 semantics** (§6 gate (b)), not merely "is
  Georgian": the activation notice mentions Georgian input + `(beta)`, the
  placeholder is the "type in Georgian or English" form, and the old
  type-English-only strings are gone — a *separate* assertion from the
  no-English-script leak check (§6 gate (a)), which is already green on the stale
  Phase-1 `ka` copy. An a11y/English-leak regression fails the suite.

---

## 8. Explicitly deferred (with reasons)

| Deferred | Why | Covered meanwhile by |
|----------|-----|----------------------|
| "it"-anaphora | Georgian object pronouns are verb suffixes; **walkthrough has zero pronoun steps (verified)** | Native loop + later pass; escape hatch |
| Zork II / III input | II/III stay English by design | English input still works for II/III |
| General morphology | Rejected "segmenter"; overkill for the bar | Closed suffix set + citation forms |
| Free-play breadth | Naturalness-first, large | Tbilisi loop + escape hatch |
| Dropping `(beta)` | Native review is BLOCKING | §9 loop |

---

## 9. Native-speaker correction loop (post-ship, ongoing)

As Phase 1 §8, now for input:
1. Phase 2 ships behind `(beta)`, all gates green, every lexicon/notice entry
   `NATIVE-REVIEW-DRAFT`.
2. Tbilisi playtesters drive Zork I by typing Georgian.
3. Forms they actually type — and any the lexicon failed to parse (visible because
   the command abstained, or because they saw `window.loquorMisses()`) — are
   added to `ka.core.ts` / `ka.zork1.ts` as data edits, pinned in
   `parse.ka-uat.test.ts`.
4. When input is confirmed natural (alongside Phase-1 output review), `(beta)`
   drops — a one-line change in `languageOptions.ts`.

---

## 10. What does not change

- `parse.ts` verb/idiom/quantifier/prep-split logic — reused; only the gated
  `expandGeorgian` pre-stage is added.
- `fold.ts` — unchanged; Mkhedruli is pass-through-safe (caseless; NFC===NFD;
  verified).
- **`LexLang` and all LLM machinery** (`FEWSHOTS`, `xlPrompt` TARGET/SHIMMER,
  `notices` ByLang, `fallbackResolve`) — **unchanged**; the `InputLexLang` split
  (§5.1) keeps `ka` out of them, preserving the type-level "ka never reaches an
  LLM" guarantee.
- fr/de/es cores, noun lexicons, routing, output — untouched.
- Phase-1 Georgian **output** corpus and `CORPUS_ONLY_LANGS` — untouched.

**Does change (was wrong/omitted in the first draft):** `directions.ts` (Georgian
maps), `useNaturalLanguage.ts:266` (lex memo), `Terminal.tsx` + its `ka` tests,
the `translatePipeline.ts:972` guard's `ka` coverage, and the `ka` notice/help
strings.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Model-authored Georgian forms aren't what players type | Native Tbilisi loop (§9); **beta**; abstain + English-ASCII raw-send + escape hatch ⇒ a missed form degrades, never blocks. |
| `expandGeorgian` mis-splits a stem (`-ი` vs `-ით`) | Fixed precedence (§3.2): postposition split to fixpoint **before** the `-ი` strip; round-trip gate + `-ით`/`-ი`-stem UAT pins catch disagreement. ka has no LLM net, so this ordering is contractual, not plan-deferred. |
| Widening the input type leaks `ka` into LLM maps | `InputLexLang` ≠ `LexLang` (§5.1); a `ka` LLM-map entry is a type error by construction. |
| Editing the input pipeline regresses fr/de/es | Every new branch gated by `InputLexLang` membership / `core.postpositions` / `ka` predicates; regression test pins fr/de/es byte-identical output. |
| `ka` accidentally reaches the LLM (e.g. model downloaded for fr/de/es, then switch to `ka`) | Force `internal.model='grammar'` for `ka` at the state boundary (§5.4); the existing `model==='grammar'`→`grammarOnly` path then abstains. Test pins `ka` abstains rather than calling the LLM even with a model present. |
| `ka` input invited on Zork II/III, where it has no noun lexicon (objects always abstain) | `kaInputActive(lang, sig)` gates the lex memo, route, placeholder, and notice to `ZORK1_SIG` (§5.6); Zork II/III `ka` stays Phase-1 type-English; test pins it. |
| `ka` abstain shows **English** notice | Author Georgian `ka` notice/help/escape strings (§7); no-English-leak gate (§6). |
| Emptying `OUTPUT_ONLY_LANGS` regresses the modal/announce/title/picker consumers + the `⊇ CORPUS_ONLY` invariant | **review-fix C2**: keep `ka ∈ OUTPUT_ONLY_LANGS` (output still corpus-only); gate the INPUT on `kaInputActive`; switch the line-972 bail to `!liveRef.current.lex`; test the queue drains for `ka`-on-Zork-I. |
| Disambiguation `{raw}`-echo forces English once `ka` input is Georgian | Convert the `ka` which-print templates to the **drop-the-noun reframe** (mirror fr/de/es); invert the `ka` UAT pins (§7). |
| Mkhedruli in CI / fixtures | BMP (U+10A0–10FF); hyphen-free fold-normalized data + `fold(entry)===entry` gate; verify the suite green in CI before merge. |

---

## 12. Self-review (design coverage)

- **Grammar-only, no LLM for ka input; type-enforced via `InputLexLang`** → §1, §5.1, §5.4. ✓
- **Walkthrough-completable bar + forcing-function gate** → §1, §6. ✓
- **Imperative-nominative insight collapses morphology** → §2. ✓
- **One gated stage + one optional field; fr/de/es untouched** → §3, §10. ✓
- **Suffix precedence contractual (postposition before `-ი`); not "provably safe"** → §3.2. ✓
- **Directions via `directions.ts`, not a dead core field** → §3.3. ✓
- **Real seams named: lex memo, Terminal route + test inversions, line-972 guard** → §5.2–5.4. ✓
- **Input gated to Zork I via shared `kaInputActive`; Zork II/III stays type-English (no misleading invite)** → §1, §5.6, §6, §11. ✓
- **Forced grammar-only via the `model` field at the state boundary, not a fragile new predicate** → §5.4, §11. ✓
- **English-ASCII raw-send kept (finding-6 owner decision); no regression** → §5.5, §7. ✓
- **Georgian notice/help/escape/placeholder strings _revised_ (arms already exist); two-part copy gate (no-English-script + new-semantics pin)** → §6, §7. ✓
- **Both round-trips enrolled; display-corpus audit; validate scoped; input-UAT + marker** → §6. ✓
- **"it" deferral verified against the real walkthrough (zero pronoun steps)** → §1, §8. ✓
- **Native-review loop first-class** → §9. ✓

---

## 13. On merge

Add this spec to CLAUDE.md's numbered source-of-truth list as the **top Georgian
authority**, noting it supersedes Phase-1 §2 (`LexLang` → `InputLexLang`) and §6
(round-trip deferral resolved).
