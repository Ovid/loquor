# Agentic Code Review: ovid/localize-change-story

**Date:** 2026-06-21 13:59:28
**Branch:** ovid/localize-change-story -> main
**Commit:** afa718ef3105925e88a3076e1ae49ffcc23ce151
**Files changed:** 17 | **Lines changed:** +1640 / -76 (≈250 lines of real code; the rest is tests + design/plan docs)
**Diff size category:** Medium

## Executive Summary

The Georgian (`ka`) bottom-status-bar feature is a faithful, well-tested implementation of its
design spec — Decisions 1/3/6 and findings [5]/[6]/[7] are all correctly realized, the
multilingual `vocabWordSet` change is safe across EN/FR/DE/ES/`ka`, and the test suite is green.
**One real accessibility regression** was found and verified: the now-localized "Change story"
status-bar button carries no `lang` attribute, so a screen reader mispronounces it in every
non-English UI (fr/de/es/ka). Everything else is suggestion-level.

## Critical Issues

None found.

## Important Issues

### [I1] Localized "Change story" button has no `lang` attribute (WCAG 3.1.2 regression)

- **File:** `src/ui/StatusBar.tsx:38-40`
- **Bug:** The button now renders `{changeStoryLabel}`, fed `LANDING_STRINGS[activeLang].changeStory`
  (`Terminal.tsx:225`) — Georgian (`ისტორიის შეცვლა`), French, German, or Spanish text — but the
  `<button>` has no `lang`. The document lang is English, so assistive tech voices the localized
  label with English phonemes. Before this change the button was always the English string
  "Change story", so this diff _introduces_ the mispronunciation.
- **Impact:** A11y is a hard project requirement (CLAUDE.md). The bug hits all four non-English UIs,
  and "a fix in one language is a fix in all" applies. The sibling `NlLanguagePicker` already does
  the right thing — every localized span there is wrapped in `lang={state.language}`
  (`NlLanguagePicker.tsx:37,73`), as is the rest of `Terminal.tsx`'s `nlLang` machinery — so this
  control was added without the guard the codebase already established.
- **Suggested fix:** Add a `lang` (or `labelLang`) prop to `StatusBar` and apply it on the button:
  `<button lang={activeLang !== 'en' ? activeLang : undefined}>{changeStoryLabel}</button>`,
  passing `activeLang` from `Terminal.tsx`. Mirrors the picker. Add a test asserting the button's
  `lang` for a non-English label.
- **Confidence:** High
- **Found by:** Accessibility & Error-Handling specialist (verified against current code by lead)

## Suggestions

- **Missing test for spec testing-point 8** (`src/ui/Terminal.test.tsx`): no test covers a
  mid-session **story switch** (corpus game → no-corpus game) while `ka` stays active, asserting the
  bar flips beta+tip ↔ bilingual no-corpus with no stale content. Code behavior is correct
  (`showBetaNotice`/`showNoCorpusNotice` are recomputed each render from `corpusFor(signature,'ka')`
  and `GeorgianStatusBar` is a pure prop function), and the `ka→en` switch is tested — this is a
  coverage gap, not a defect. The harness (`rerender`) already supports it. _(Found by: Plan Alignment)_
- **Footer `aria-label="Georgian mode information"` is hardcoded English** (`GeorgianStatusBar.tsx:23`)
  while the rest of the chrome is localized. A landmark name in the page UI language is defensible
  (and `ka` has no native review), but worth a conscious call rather than an accident. _(Found by: A11y)_
- **Stale doc comment** (`src/ui/landingStrings.ts:24`): `changeStory` is documented as "overlay
  dialog aria-label" but is now also the status-bar opener's visible label. Consider
  "overlay dialog aria-label + status-bar opener label". Comment-only. _(Found by: Contract & Integration)_
- **Unmeasured contrast assertion** (`src/ui/components.css:937`): the comment claims `--text-dim`
  alone clears WCAG AA in both themes (same basis as `.nl-thinking`). Plausible and reasoned, but
  unverifiable in jsdom — worth a one-time manual contrast check in both themes. _(Found by: A11y)_
- **Manual responsive checklist still required**: `.bottombar` (flex-wrap + fluid Georgian text +
  its own `@media (max-width:520px)` rules, no `position:fixed`) shows no obvious 320px overflow,
  but the bar is _always present_ during `ka` play and there is no automated layout guard (jsdom).
  Run the spec's 320/375/520px + short-landscape check **under the `ka` case specifically**, both
  themes. _(Found by: Plan Alignment / Responsive)_
- **Bundled out-of-scope changes** (informational): the `vocabWordSet` single-token-canonical fix,
  the FR/DE `KNOWN_COLLISIONS` additions, and the `setLanguage` notice-clear are outside this spec's
  stated "display-layer only" scope. They are coherent and tested; noted only so the spec-focused
  reviewer knows they ride along. _(Found by: Plan Alignment)_

## Plan Alignment

Spec: `docs/superpowers/specs/2026-06-21-loquor-georgian-mode-bottom-bar-design.md`
Plan: `docs/superpowers/plans/2026-06-21-loquor-georgian-mode-bottom-bar.md`

- **Implemented:** Decision 1 (beta = Georgian-only, no-corpus = bilingual), Decision 3 (tip permanent
  in bar + one-shot announce via the **reused** `makeActivationNotice` latch — not a rebuilt
  fire-once; the 3ac3508 once-per-session contract is intact), Decision 6 (existing Georgian strings
  reused verbatim, `GEORGIAN_ACTIVATION_TIP` hoisted to a shared const), finding [5] boot-flash guard
  (`signature !== ''` preserved), finding [6] dedicated announce region separate from inline help,
  finding [7] footer is a static `<footer>` (not a live region). Testing points 1–6 each have a test.
- **Not yet implemented:** Testing point 8 (story-switch corpus↔no-corpus) has no test (see Suggestions).
  Testing point 7's boot-window assertion is preserved in code but not directly pinned by a test.
- **Deviations:** None substantive.

## Multilingual / contract notes (verified non-bugs)

- **`vocabWordSet` single-token canonical addition** (`inputTranslate.ts:331`) is safe for all
  languages: at runtime the stage-4 collision guard subtracts `lexiconWordSet(...)`
  (`translatePipeline.ts:323`), so a foreign word spelled like an English canonical still routes to
  the lexicon parse, not raw passthrough. For `ka` (no lexicon, no LLM) the broader set strictly
  improves deterministic English passthrough — exactly the coverage the no-LLM language needs.
- **ES has no new `KNOWN_COLLISIONS` entries, and that is correct** (not a German-first omission):
  ES localizes the colliding nouns to distinct Spanish words (`tunel`, `glaciar`, `demonio`, `runas`,
  `pasaje`), so there is no overlap to register. The `validate.test.ts` set-equality test (23/23 pass)
  would fail on any genuinely missing entry, so a silent multilingual gap here is impossible.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Contract & Integration + Multilingual Consistency;
  Accessibility + Error Handling / Edge Cases; Plan Alignment + Responsive.
- **Scope:** Changed files + adjacent — `Terminal.tsx`, `GeorgianStatusBar.tsx`, `StatusBar.tsx`,
  `useNaturalLanguage.ts`, `useModelDownload.ts`, `notices.ts`, `inputTranslate.ts`,
  `lexicon/index.ts` (+ es/fr/de lexicon data), `landingStrings.ts`, `NlLanguagePicker.tsx`,
  `components.css`; design + plan docs.
- **Raw findings:** 6 | **Verified findings:** 5 (1 Important + 4 Suggestions) | **Filtered out:** 1
  (a suspected ES collision gap, disproved by the lexicon data + set-equality test).
- **Steering files consulted:** CLAUDE.md (a11y, multilingual, responsive, OUTPUT-ONLY `ka` rules);
  auto-memory MEMORY.md. No contradictions found.
- **Plan/design docs consulted:** the 2026-06-21 Georgian-mode bottom-bar design + plan.
- **Suite status:** specialists ran the affected suites (StatusBar, GeorgianStatusBar, notices,
  useNaturalLanguage, inputTranslate, validate, Terminal) — all green; `tsc -b` exits 0.
