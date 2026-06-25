# Loquor — hide the LLM fallback behind one preference (design)

**Date:** 2026-06-25
**Status:** approved (design); plan pending
**Branch:** `ovid/hide-llm-fallback`
**Revision:** revised 2026-06-25 after an adversarial spec review — reworked the
live mechanism (B1/B2/M1), added a one-time migration notice for opted-in users
(M2), a live mode-change a11y announcement (M3), pinned all deferred strings
across four languages (M4/m3), and expanded the test list to the live-transition,
mid-download-abort and cached-boot cases (t1–t5). **Re-revised 2026-06-25 after a
plan-alignment pass:** added the grammar-only first-miss upgrade-pitch suppression
to *Behavior when off* (+ a `translatePipeline.ts` gate point), corrected the M2
delivery channel (a dedicated Terminal-owned `aria-live` region — the prior
`~413` reference was the `ka`-only region), and confirmed t3/t5 get explicit
tests.

## Problem

The WebLLM-powered natural-language layer (the "LLM fallback" — richer input
understanding and the LLM output-translation fallback) is an experimental
feature to be returned to later. For now every user-facing trace of it should be
**hidden by default**, controllable by **one toggle** in the preferences panel,
placed directly **below the existing "debug" toggle**. Turning the toggle on
restores today's behavior in full.

The codebase already has a first-class **grammar-only / corpus-only floor** (the
"basic mode" from the grammar-only-fallback design). So "hide the LLM" is
mechanically "force everyone to that floor and remove the upgrade affordances."
The game picker and language picker are **not** affected — you still pick a game
and a language exactly as today.

## The single lever

A new persisted boolean preference, **`loquor.llm`**, default **off** (= LLM
hidden), exposed through a `useLlmFeature()` hook that mirrors the existing
`useDebug()` hook (`src/ui/useDebug.ts`): localStorage value `'1'` when on, key
removed when off; `[enabled, toggle]` return shape. `Terminal` owns the hook next
to `useDebug` and threads `llmEnabled` to the consumers below.

This is the one toggle. It is **one preference, but not "a handful of reads"** —
making it correct and live touches the points enumerated in *Gate points* below.
The discipline that keeps it correct is a **single derived value**:

```
effectiveModel = llmEnabled ? internal.model : 'grammar'
```

computed once (in `useNaturalLanguage`, where `internal` from `useModelDownload`
is combined into the public `NlState` and into `liveRef`). **No consumer reads
raw `internal.model`** — the picker, the bottom-bar summary, the input pipeline's
grammar-only gate (via `liveRef`), and the output `lexLang` gate all read the
effective value. This is what makes "off" inert even when `internal` says `full`
(see *Cached models* below).

## Behavior when off (default): every LLM trace hidden

- **Download modal** (`ModelDownloadModal`) never opens. Its `open` prop in
  `Terminal` is additionally gated on `llmEnabled` so neither the auto-on-pick
  offer, an in-flight `downloading` phase, nor a stray `requestUpgrade` can show
  it.
- **`✦ improve` / "try the model anyway" button** is not rendered
  (`NlLanguagePicker`).
- **`installed / not installed` chip** is not rendered (it reports model state).
- **`basic` tier markers** are gone: the status-bar `basic` chip
  (`NlLanguagePicker`) and the tier token in `nlModeSummary`.
- **The grammar-only first-miss upgrade pitch is suppressed.** The
  `grammarOnlyFirstMiss` notice ("…add the optional upgrade for full sentences")
  is a user-facing trace shown to a fr/de/es player in basic mode on their first
  abstain — a common path. When hidden, stage 8 of the input pipeline falls back
  to the plain `couldntTranslate` notice instead (the upgrade it pitches no longer
  exists). This is carried via `llmEnabled` on the pipeline's live state and gated
  so **`ka` is unchanged** (its first-miss notice already carries no pitch and is
  the no-LLM language's chosen wording — `(live.llmEnabled || activeLang ===
  'ka')`).
- **Landing caveat** shows a short form with no mention of a model or tier (see
  *Pinned strings*).
- **Functionally**, input stays grammar-only and output stays corpus-only — and
  the engine is **never lazy-loaded**, because the pipeline (reading
  `effectiveModel === 'grammar'`) never reaches the LLM clause stage that would
  trigger the lazy load.

### Cached models (the "even if downloaded, never used when off" guarantee)

A previously cached model is promoted to `internal.model = 'full'` by two paths —
`setLanguage` (`src/llm/useModelDownload.ts:~330`) **and** the on-mount
cache-restore probe (`~98-135`). The guarantee does **not** come from gating
those writes; it comes from the `effectiveModel` derivation dominating every
read. `internal.model` may say `full`; every consumer still sees `grammar`, the
pipeline never hits the LLM stage, and the engine never loads. (Gating the writes
too would be belt-and-braces but is unnecessary; the plan should not bother.)

### Output is corpus-only (defense-in-depth, with the real reason)

The output LLM fallback **never initiates an engine load itself** — it only
generates when `engine.isLoaded()` is already true (`fallbackResolve.ts:~176`).
So with the input path suppressed and the engine never loaded, the output LLM is
already dormant. The explicit gate — **`lexLang = null` when `!llmEnabled`** in
`useOutputTranslation` — is therefore *defense-in-depth*: it also covers the
case where a model was loaded by an earlier on-session and the user then toggles
off mid-session, and it suppresses shimmer/`pending` UI state. The risky case to
test is exactly that one (engine already loaded, flag off ⇒ still corpus-only).

## Behavior when on

Exactly today's behavior returns: the download modal, the improve button, the
installed/basic chips, the full caveat, the LLM input fallback and the LLM
output-translation fallback.

## Live application

Flipping the toggle takes effect **mid-session**, like `debug`. Almost all of it
is free: because consumers read `effectiveModel`, flipping `llmEnabled` re-renders
the picker/summary and re-derives `lexLang` and `liveRef` automatically.

The mechanism, by phase, on **turn-off**:

- `on/full`, `on/grammar`, `off`, `disabled` → derivation alone makes it inert;
  no imperative action.
- **`downloading` → an imperative is required.** A download in flight must be
  **aborted**, or its `.then` will flip `internal` to `on/full` *after* the user
  turned the feature off (`useModelDownload.ts:~239`). `Terminal` runs an effect
  on `llmEnabled` going true→false that calls the existing
  `cancelDownload()`/`abortInFlight()` (`useModelDownload.ts:~286`) when
  `internal.phase === 'downloading'`. (`demoteToGrammar()` is **not** the lever —
  it no-ops on every phase except `on/full`.)

On **turn-on**: affordances reappear via render; **no surprise auto-modal** — the
`✦ improve` button is the re-entry. The `declined` flag continues to suppress the
unsolicited auto-modal, so rapid off→on→off is idempotent (test t5).

## Accessibility (mandatory)

Two dynamic changes must reach assistive tech (CLAUDE.md a11y rule 3); the
status-bar controls that appear/disappear are **outside** the prefs modal the
user is focused in, so a silent DOM mutation is not acceptable:

1. **Live mode change.** Flipping the toggle announces a localized message via an
   `aria-live` region — "Natural-language model enabled." / "…hidden." A test
   asserts the announcement (test t4).
2. **Migration notice (M2).** Delivered through a **dedicated Terminal-owned
   visible `aria-live="polite"` region** (shared with the mode-change
   announcement above). It is deliberately **not** `role="status"`: `Terminal`
   already has one `role="status"` region (`Terminal.tsx:~306`) that existing
   tests query singularly, and a second status landmark would collide with it
   (and recreate exactly what the `ka`-region comment at `~399-401` avoids). A
   bare `aria-live` region announces without claiming the role. (An earlier draft
   pointed at `Terminal.tsx:~413` — that is the **`ka`-only** announce region,
   gated on `outLang==='ka'`, so it cannot carry an en/fr/de/es migration notice.)

The toggle control itself: a checkbox row directly **below the debug row** in
`PreferencesModal`, same markup as debug (a `<label>` wrapping
`<input type="checkbox">` plus an `aria-describedby` help paragraph),
keyboard-operable, correct accessible name and role, visible focus, localized
label + help. A test asserts its accessible name/role
(`getByRole('checkbox', { name: … })`) and its position below debug.

## M2 — one-time notice for already-opted-in users

A returning player who downloaded the model before this feature shipped would
otherwise find it silently gone on next load. Per the chosen decision, show a
**one-time** notice instead. Model weights stay cached on disk, so re-enabling
needs no re-download.

- **Trigger:** `!llmEnabled && engine.isCached() && !hiddenNoticeSeen`. The cached
  model is the pre-feature opt-in signal, so brand-new users (no cache) never see
  it; `ka` players (output-only, never cache a model) never trigger it.
- **Once:** a write-once marker key `loquor.llm.hiddenNoticeSeen` (set when the
  notice is shown) prevents it nagging on every load. It is independent of the
  `loquor.llm` boolean (which is present/absent and cannot encode "seen").
- **Delivery:** the dedicated Terminal-owned `aria-live="polite"` region (see
  *Accessibility* §2 — shared with the mode-change announcement; not
  `role="status"`), in the active display language. The language is read
  synchronously from `readNlPref().language` (mapped `off→en`) so the notice isn't
  English before the async cache-restore resolves the active language.
- **Copy** (see *Pinned strings*), authored for en/fr/de/es + a `ka`
  native-review draft (it will not normally render for `ka`).

## Approach (recommended) and rejected alternatives

**Recommended:** the single `effectiveModel` derivation read at every
`internal.model` consumption point, plus one imperative (abort an in-flight
download on turn-off) and render-gated affordances. Live behavior falls out of
React reactivity.

**Rejected:**

- A build-time constant in `src/llm/config.ts` — the requirement is a runtime
  toggle in the preferences panel.
- "Reuse `demoteToGrammar()`" as the turn-off lever (the original draft) — it
  no-ops on the `downloading` and cached-boot paths, so it fails to hide the LLM
  in exactly the active-download and returning-power-user cases.
- Gating only `setLanguage` — misses the on-mount cache-restore probe; the
  derivation-dominates-reads approach covers both without per-write gating.

## Multilingual and Georgian (ka)

The caveat reword, the basic-marker hiding, the affordance gating, and the M2
notice apply uniformly across **en/fr/de/es** (CLAUDE.md multilingual rule — and
all strings are pinned below, not English-only).

**Georgian (`ka`)** has no input or output LLM in either toggle state, so it is
**functionally unaffected**: it is in `OUTPUT_ONLY_LANGS` (`types.ts:22`), never
reaches `full`, its modal is already suppressed, and `nlModeSummary` already
returns `''` for it. None of the gated affordances render for `ka` regardless of
the flag — the plan must **leave `ka` functionally alone** (do not "helpfully"
gate it). The only new `ka` strings are the prefs-toggle label/help and the (rarely
reached) M2 notice — native-review drafts, added to the existing `ka`
review-pending bucket. Its `(ალფა)` caveat is about translation maturity, not the
LLM, and is unchanged.

## Player-experience note (eyes-open)

Defaulting off means fr/de/es players lose the LLM's richer understanding: more
input abstains, and more English leaks on uncovered output lines (the documented
"basic mode" English-fallback exception becomes the default). This is an explicit,
temporary hide of an experimental feature, fully reversible via the toggle, and
the one sharp edge — a returning opted-in user — is handled by the M2 notice
above (decision: one-time notice, taken with Ovid).

## Pinned strings (no deferral)

**Landing caveat, short form (flag off)** — replaces the "Basic commands work
now… optional, experimental model…" text:

- en: "Commands work in all four languages."
- fr: "Les commandes fonctionnent dans les quatre langues."
- de: "Befehle funktionieren in allen vier Sprachen."
- es: "Los comandos funcionan en los cuatro idiomas."

(When the flag is on, the existing full caveat is shown unchanged. `ka` caveat
unchanged in both states.)

**`nlModeSummary` (flag off)** — drop the tier token and its separator entirely;
return just the localized input indicator (no leading `·`):

- en: "input"  fr: "saisie"  de: "Eingabe"  es: "entrada"

(When on, the existing `` `${tier} · ${INPUT[lang]}` `` is unchanged.)

**M2 migration notice:**

- en: "The experimental natural-language model is now hidden — re-enable it in
  Preferences."
- fr: "Le modèle expérimental de langage naturel est maintenant masqué —
  réactivez-le dans les Préférences."
- de: "Das experimentelle Sprachmodell ist jetzt ausgeblendet — aktivieren Sie
  es in den Einstellungen wieder."
- es: "El modelo experimental de lenguaje natural ahora está oculto — vuelve a
  activarlo en Preferencias."
- ka: native-review draft.

**Live mode-change announcement:** "Natural-language model enabled." /
"Natural-language model hidden." (localized en/fr/de/es + `ka` draft).

**Prefs toggle copy:**

- label (en): "Natural-language model (experimental)"
- help (en): "Adds an optional on-device model that understands more of what you
  type. Hidden by default."
- fr/de/es localized; `ka` native-review draft.

(Notice and prefs strings should reference the *localized* name of the
Preferences panel, matching `PreferencesModal`'s existing copy.)

## Gate points (for the plan)

- `src/storageKeys.ts` — add `llm: 'loquor.llm'` and
  `llmHiddenNoticeSeen: 'loquor.llm.hiddenNoticeSeen'` to `LS_KEYS`.
- `src/ui/useDebug.ts` — pattern to mirror for `useLlmFeature()`.
- `src/ui/Terminal.tsx` — own `useLlmFeature()`; thread `llmEnabled` to the
  consumers below; effect that aborts an in-flight download on true→false; the
  M2 migration-notice check on mount; gate the `ModelDownloadModal` `open` prop on
  `llmEnabled`; the live mode-change announcement.
- `src/llm/useNaturalLanguage.ts` — accept `llmEnabled`; compute `effectiveModel`
  and feed it into the public `NlState` and `liveRef` (so the picker, summary, and
  the input pipeline's `grammarOnly` calc — `translatePipeline.ts:~663` — all read
  the effective value).
- `src/llm/useModelDownload.ts` — `cancelDownload()`/`abortInFlight()` (~286) is
  reused for the turn-off abort. No per-write gating needed (derivation dominates).
- `src/llm/translatePipeline.ts` — add `llmEnabled` to `LiveState` (~169) and
  carry it from the `liveRef`; gate the first-miss upgrade-pitch in stage 8
  (~967) so the `grammarOnlyFirstMiss` notice is suppressed when hidden
  (`couldntTranslate` instead), preserving `ka`. See *Behavior when off*.
- `src/translate/useOutputTranslation.ts` — **signature change**: accept
  `llmEnabled`; `lexLang = (llmEnabled && lang && !CORPUS_ONLY_LANGS.has(lang)) ?
  lang : null` (~140). Updates the Terminal wiring and existing test call sites.
- `src/ui/PreferencesModal.tsx` — toggle row below the debug row (~93-104), with
  localized copy in the existing per-language block.
- `src/ui/NlLanguagePicker.tsx` — gate the `✦ improve` button (~67-97), the
  `basic` chip (~73), and the `installed / not installed` chip (~58-66) on
  `llmEnabled`.
- `src/ui/nlModeSummary.ts` — drop the tier token when off (~55), per *Pinned
  strings*.
- `src/ui/Landing.tsx` + `src/ui/landingStrings.ts` — short-vs-full caveat per
  flag for en/fr/de/es; `ka` caveat and `KA_INPUT_COPY` unchanged.
- notice strings — co-locate with the existing NL notices (`src/llm/notices.ts`)
  for the M2 and mode-change messages, following its `byLang` pattern.

## Testing (TDD)

Static / render:

- `useLlmFeature`: default off, toggle flips, persistence.
- `PreferencesModal`: toggle has the correct accessible name/role, sits below the
  debug row, renders localized copy.
- `NlLanguagePicker`: off ⇒ no improve button, no `basic` chip, no installed
  chip; on ⇒ all three (regression of current behavior).
- `nlModeSummary`: off ⇒ just the input indicator (no separator, no tier); on ⇒
  unchanged.
- `Landing`: short caveat off, full caveat on, across en/fr/de/es.

Live transitions / races / boot (the cases the first draft missed):

- **t1:** engine already loaded, flag toggled off mid-session ⇒ output corpus-only
  (`lexLang === null`, no shimmer) and input grammar-only/abstains.
- **t2:** toggle off during the `downloading` phase ⇒ download aborts; chip and
  modal disappear; state does **not** complete into `full`.
- **t3:** boot with `loquor.nl = {language:'fr'}` + a cached model + flag default
  off ⇒ boots to `fr`/grammar-only, never `full`; engine never loads.
- **t4:** flipping the toggle announces the mode change via `aria-live`.
- **t5:** rapid off→on→off ⇒ no stuck modal, no orphaned download, no
  re-triggered auto-modal (the `declined` interaction).
- **M2:** cached model + flag off + marker unset ⇒ one-time notice via `aria-live`,
  in the active language; marker set; not shown on the next load; not shown to a
  user with no cached model.
- Multilingual: caveat-reword, basic-marker omission, and the M2/mode-change
  notices asserted for en/fr/de/es.

## Out of scope

- Removing or unloading cached model weights when off (kept on disk, unused).
- Any change to the game picker, the language picker, or Georgian input/output
  behavior.
- A general "experimental features" framework — this is one named toggle (YAGNI).
- Grandfathering opted-in users to default-on (rejected in favor of the M2
  one-time notice).
