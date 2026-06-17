# Agentic Code Review: ovid/landing-page-i18n

**Date:** 2026-06-17 15:21:07
**Branch:** ovid/landing-page-i18n -> main
**Commit:** cdf08d9834f2571106c2e29fe831dc2a9fd0a732
**Files changed:** 5 | **Lines changed:** +358 / -42
**Diff size category:** Medium

## Executive Summary

This branch localizes the landing-page chrome (EN/FR/DE/ES) by introducing a
`LANDING_STRINGS` table consumed by `Landing.tsx`, and drops the orphaned
`Game.subtitle` field from the catalog. The change is clean and well-tested — no
correctness, security, or concurrency bugs. One **Important** finding is a latent
render-crash that surfaces only when a 5th play language is added (the
`LANDING_EXAMPLES` table isn't anchored to the language source of truth, unlike
`LANDING_STRINGS`). The rest are low-severity polish/test-hardening suggestions.

## Critical Issues

None found.

## Important Issues

### [I1] `LANDING_EXAMPLES` not anchored to the language source of truth — latent render crash

- **File:** `src/ui/landingExamples.ts:10` (vs `src/ui/landingStrings.ts:34`)
- **Bug:** `LANDING_EXAMPLES` is typed `Record<'en' | 'fr' | 'de' | 'es', string[]>`
  (a hardcoded literal union), while `LANDING_STRINGS` is
  `Record<ActiveLanguage, LandingCopy>` — `ActiveLanguage` derives from
  `NL_LANGUAGES` (the single source of truth). Both are indexed by the same
  `exampleLang` on adjacent lines (`Landing.tsx:75-76`). `landingExamples.test.ts`
  iterates a hardcoded `['fr','de','es']` list, so it provides no guard either.
- **Impact:** Add a 5th play language to `NL_LANGUAGES` and `LANDING_STRINGS` +
  its test force the new entry (compile error / failing test until added), but
  `LANDING_EXAMPLES` silently does not. `LANDING_EXAMPLES[exampleLang]` would be
  `undefined`, and `examples.join(' · ')` (`Landing.tsx:143`) throws at render —
  the landing page crashes for the new language. The two parallel tables can
  drift precisely because only one is gated.
- **Suggested fix:** Retype `landingExamples.ts:10` to
  `Record<ActiveLanguage, string[]>` (import the type), and have
  `landingExamples.test.ts` iterate the active-language set instead of a
  hardcoded list — mirroring the `landingStrings` gate.
- **Confidence:** High (80)
- **Found by:** Contract & Integration (verified)

## Suggestions

- **[S1] `<h1>Loquor</h1>` missing `lang="en"`** (`Landing.tsx:130`, conf 78) — the
  plate sets `lang={exampleLang}` (fr/de/es); the adjacent tagline got `lang="en"`
  but the wordmark `<h1>` did not, so a non-English screen reader mispronounces the
  brand. This branch newly introduced the inconsistency. Fix:
  `<h1 className="title" lang="en">Loquor</h1>`. (a11y; matches the tagline treatment.)
- **[S2] Dead `'off'` branch in `exampleLang` guard** (`Landing.tsx:74`, conf 75) —
  `language === 'off'` is unreachable (init maps off→en at line 64; the combobox
  never emits off). The inline comment acknowledges it as deliberate type-narrowing,
  so this is a maintainability note, not a runtime bug.
- **[S3] Radio accessible name never asserted by role+name** (`Landing.test.tsx`,
  conf 70) — radios are tested for role/checked/tabindex but their localized
  accessible name (numeral + subtitle) is only checked via `getByText`. Add a
  `getByRole('radio', { name: ... })` assertion per the CLAUDE.md a11y test bar.
- **[S4] Completeness gate accepts whitespace-only strings**
  (`landingStrings.test.ts:55,61,67`, conf 68) — `toBeTruthy()` passes for `' '`,
  weakening the "never ship half-English" guarantee. Use
  `expect(copy[key].trim()).toBeTruthy()`.
- **[S5] Decorative leading glyphs announced by screen readers** (`landingStrings.ts`,
  conf 60, **pre-existing**) — `resume` leads with `↩` and `descent` (the
  radiogroup accessible name) is bracketed by em dashes. Verified verbatim on
  `main`; this branch only relocated/translated them. Optional: wrap the glyph in
  `aria-hidden` or move to CSS `::before`.

## Plan Alignment

No plan/design doc specific to landing-page i18n was found. The change is
consistent with CLAUDE.md's multilingual rule ("a fix in one language is a fix in
all four" — all four languages carry full `LandingCopy` entries) and the
offline/deterministic-render requirement (static hand-authored table, no engine
or model dependency). No contradictions with steering files introduced.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Contract & Integration; Error
  Handling & Edge Cases; Accessibility & i18n Correctness (Concurrency and
  Security assessed as N/A — no new shared mutable state, no input/injection
  surface; static strings rendered as text).
- **Scope:** changed files + adjacent — `Landing.tsx`, `landingStrings.ts`,
  `landingStrings.test.ts`, `Landing.test.tsx`, `landingExamples.ts`,
  `catalog.ts`, `types.ts`, `nlpref.ts`, `LanguageCombobox.tsx`.
- **Raw findings:** 8 (before verification)
- **Verified findings:** 6 (1 Important, 5 Suggestions)
- **Filtered out:** 2 (region+aria-live coexistence — intentional/tested;
  `hadStoredOff` mount-time snapshot — contrived multi-tab race, negligible harm)
- **Steering files consulted:** CLAUDE.md (a11y mandate + multilingual rule)
- **Plan/design docs consulted:** none specific to this branch
