# Loquor — hide the LLM fallback behind one preference (design)

**Date:** 2026-06-25
**Status:** approved (design); plan pending
**Branch:** `ovid/hide-llm-fallback`

## Problem

The WebLLM-powered natural-language layer (the "LLM fallback" — richer input
understanding and the LLM output-translation fallback) is an experimental
feature to be returned to later. For now every user-facing trace of it should be
**hidden by default**, controllable by **one toggle** in the preferences panel,
placed directly **below the existing "debug" toggle**. Turning the toggle on
restores today's behavior in full.

The codebase already has a first-class **grammar-only / corpus-only floor** (the
"basic mode" from the grammar-only-fallback design). So "hide the LLM" is
mechanically "force everyone to that floor and remove the upgrade affordances,"
gated by a single persisted preference read at a handful of points. The game
picker and language picker are **not** affected — you still pick a game and a
language exactly as today.

## The single lever

A new persisted boolean preference, **`loquor.llm`**, default **off** (= LLM
hidden), exposed through a `useLlmFeature()` hook that mirrors the existing
`useDebug()` hook (`src/ui/useDebug.ts`): localStorage value `'1'` when on,
key removed when off; `[enabled, toggle]` return shape. The key is registered in
`LS_KEYS` (`src/storageKeys.ts`) alongside `debug`. `Terminal` owns the hook next
to `useDebug` and passes `llmEnabled` down to the consumers below.

This is the only state added. Everything else **derives** from it.

## Behavior when off (default): every LLM trace hidden

- **Download modal** (`ModelDownloadModal`) never opens — neither the
  auto-on-pick offer nor the on-demand path.
- **`✦ improve` / "try the model anyway" button** is not rendered
  (`NlLanguagePicker`).
- **`installed / not installed` chip** is not rendered (it reports model state —
  a trace).
- **`basic` tier markers** are gone: the status-bar `basic` chip
  (`NlLanguagePicker`) and the tier token in `nlModeSummary` (the bottom bar then
  shows only the localized input indicator, with no `basic`/`full` word).
- **Landing caveat** shows a short form with no mention of a model or tier — e.g.
  English **"Commands work in all four languages."** — replacing the current
  "Basic commands work now in all four languages. To understand more of what you
  type, you can add an optional, experimental model …" text.
- **Functionally**, input stays grammar-only and output stays corpus-only **even
  if a model is already cached on disk** — the model is never loaded or used.

## Behavior when on

Exactly today's behavior returns: the download modal, the improve button, the
installed/basic chips, the full caveat, the LLM input fallback (pipeline LLM
stage) and the LLM output-translation fallback.

## Live application

Per the chosen decision, flipping the toggle takes effect **mid-session**, like
`debug`, via React reactivity rather than a reload:

- **Turn off** while a `full` session is active: reuse the existing
  `demoteToGrammar()` callback (`src/llm/useModelDownload.ts`) to drop the
  effective model to `grammar`; affordances disappear on the next render; output
  `lexLang` becomes `null`. The cached engine is left in place, just unused.
- **Turn on**: the affordances reappear. No surprise auto-modal — the re-entry is
  the `✦ improve` button (the same on-demand path used today).

## Approach (recommended) and rejected alternatives

**Recommended:** derive each gate's value from `llmEnabled` *at the consumption
point* — effective model = `grammar` when off; output `lexLang` = `null` when off;
all affordances gated in render. This yields the "live" behavior almost for free
and introduces no new state machine.

**Rejected:**

- A build-time constant in `src/llm/config.ts` (e.g. `ENABLE_LLM_FALLBACK`) —
  the requirement is a runtime toggle in the preferences panel, not a deploy-time
  flag.
- A pick-time-only gate (set `grammar` and suppress the offer only inside
  `setLanguage`) — would not be live; an already-`full` session wouldn't demote
  when the toggle is flipped off.

## Multilingual and Georgian (ka)

The caveat reword, the basic-marker hiding, and the affordance gating apply
uniformly across **en/fr/de/es** (CLAUDE.md multilingual rule — a fix in one is a
fix in all).

**Georgian (`ka`)** has no input or output LLM in either toggle state, so it is
**functionally unaffected**. Its landing caveat concerns Georgian-translation
maturity (the `(alpha)` marker), not the LLM, and is therefore left unchanged.
There is no language for which this feature should behave differently.

## Player-experience note (eyes-open, explicitly requested)

Defaulting off means fr/de/es players lose the LLM's richer understanding: more
input abstains, and more English leaks on uncovered output lines (the documented
"basic mode" English-fallback exception becomes the default experience). This is
an explicit, temporary hide of an experimental feature and is fully reversible
via the toggle, so it is the owner's deliberate call; recorded here so the cost
is not silent (CLAUDE.md "player experience overrides product decisions" rule).

## Preferences toggle UI (accessibility is mandatory)

A checkbox row directly **below the debug row** in `PreferencesModal`, using the
same markup pattern as debug (a `<label>` wrapping `<input type="checkbox">` plus
an `aria-describedby` help paragraph): keyboard-operable, correct accessible name
and role, visible focus, localized label + help.

Proposed copy (final wording tweakable in the plan):

- **label** (en): "Natural-language model (experimental)"
- **help** (en): "Adds an optional on-device model that understands more of what
  you type. Hidden by default."
- **fr / de / es**: localized equivalents.
- **ka**: native-review draft (the toggle exists for ka too as a global pref, but
  changes nothing functional for ka).

## Gate points (for the plan)

- `src/storageKeys.ts` — add `llm: 'loquor.llm'` to `LS_KEYS`.
- `src/ui/useDebug.ts` — pattern to mirror for the new `useLlmFeature()` hook.
- `src/ui/Terminal.tsx` — own `useLlmFeature()`; thread `llmEnabled` to the
  consumers below; on turn-off, invoke `demoteToGrammar()`.
- `src/ui/PreferencesModal.tsx` — new toggle row below the debug row (~debug row
  at lines 93–104), with localized copy in the existing per-language copy block.
- `src/ui/NlLanguagePicker.tsx` — gate the `✦ improve` button (lines 67–97), the
  `basic` chip (line 73), and the `installed / not installed` chip (lines 58–66)
  on `llmEnabled`.
- `src/ui/nlModeSummary.ts` — omit the tier token (line ~55) when off, leaving
  the localized input indicator only.
- `src/translate/useOutputTranslation.ts` — `lexLang` becomes `null` when
  `!llmEnabled` (line ~140), forcing corpus-only output.
- `src/llm/useModelDownload.ts` — in `setLanguage`, treat `!llmEnabled` like
  `OUTPUT_ONLY_LANGS` for the offer/`full` decisions (lines ~330, ~342): never go
  `full`, never auto-open the modal. `demoteToGrammar()` (line ~356) is reused for
  live turn-off.
- `src/ui/Landing.tsx` + `src/ui/landingStrings.ts` — caveat short-vs-full per
  flag for en/fr/de/es (`caveat` at en lines ~43–47 and the fr/de/es siblings);
  `ka` caveat and `KA_INPUT_COPY` unchanged.

## Testing (TDD)

- `useLlmFeature`: default off, toggle flips, persistence (mirror any
  `useDebug` test).
- `PreferencesModal`: the new toggle has the correct accessible name/role
  (`getByRole('checkbox', { name: … })`), sits below the debug row, and renders
  localized copy.
- `NlLanguagePicker`: with `llmEnabled` off, no improve button, no `basic` chip,
  no installed chip; with it on, all three appear (regression of current
  behavior).
- `nlModeSummary`: omits the tier token when off; includes it when on.
- `Landing`: short caveat when off, full caveat when on, across en/fr/de/es.
- Behavior: with the flag off, output is corpus-only (`lexLang === null`) and
  input is grammar-only **even when a model is cached/loaded**.
- Multilingual: caveat-reword and basic-marker omission asserted for en/fr/de/es.

## Out of scope

- Removing or unloading cached model weights when the toggle is off (they stay
  cached, just unused).
- Any change to the game picker, the language picker, or Georgian input/output
  behavior.
- A general "experimental features" framework — this is one named toggle (YAGNI).
