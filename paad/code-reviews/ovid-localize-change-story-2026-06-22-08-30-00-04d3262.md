# Agentic Code Review: ovid/localize-change-story

**Date:** 2026-06-22 08:30:00
**Branch:** ovid/localize-change-story -> main
**Commit:** 04d3262
**Files changed:** 19 | **Lines changed:** +1797 / -77 (src: ~1011 diff lines; rest is docs + tests)
**Diff size category:** Large

## Executive Summary

The Georgian (`ka`) output-only bottom-status-bar feature, the new dedicated
`announce` live-region for the must-read "type in English" tip, and the
input-side vocab-gate fix (single-token canonicals) are a faithful, well-tested
realization of the spec. Six specialists plus a verifier found **no Critical or
Important issues** — every spec Decision (1/3/4/5/6) and finding ([5]/[6]/[7]) is
correctly implemented, the `ka` OUTPUT-ONLY rule is respected, the "fix in one
language is a fix in all" collision gate is provably consistent, and a11y is
strong. Three Suggestion-level notes only.

## Critical Issues

None found.

## Important Issues

None found.

## Suggestions

- **[S1] Stale sibling-copy comment.** `src/ui/landingStrings.ts:179-181` — the
  `ka.caveat` comment still says "SIBLING COPY: **Terminal.tsx** renders the
  in-game variant of this same beta note... apply any wording fix to BOTH." This
  diff moved that beta string out of `Terminal.tsx` into
  `GeorgianStatusBar.tsx:36`; the pointer now names a file that no longer holds
  the string, defeating the only guard against the two hand-maintained beta
  strings drifting. Fix: change "Terminal.tsx" → "GeorgianStatusBar.tsx". (The
  reverse pointer in `GeorgianStatusBar.tsx:31` is already correct.) Confidence 90.
- **[S2] No test pins the empty-mount of the announce region.** `src/ui/Terminal.tsx:368-371`
  mounts the `sr-only` live region on `outLang === 'ka'` with content gated
  separately on `showBetaNotice`, so it mounts empty then fills — required for the
  screen-reader announcement to fire. Not a current bug (no failure is
  constructible), but a future refactor making `announce` render-derived would
  silently kill the announcement with every test green. Consider a regression test
  asserting the region mounts empty, or `key={announce}` to force remount-on-change.
  Confidence 65.
- **[S3] Scope note (not a defect).** Two changes ride along that are adjacent to
  the bottom-bar spec: the `StatusBar` "Change story" localization + `▾` chevron
  removal (`StatusBar.tsx`, the branch's namesake purpose) and the input-side
  vocab-gate / `KNOWN_COLLISIONS` additions (`inputTranslate.ts`,
  `lexicon/index.ts`). Both are correct, tested (32/32 green incl. WCAG-3.1.2 lang
  tagging and the set-equality collision gate), and correctly exclude `ka`. Just
  confirming the scope boundary is intentional. Confidence 95.

## Plan Alignment

Spec: `docs/superpowers/specs/2026-06-21-loquor-georgian-mode-bottom-bar-design.md`
Plan: `docs/superpowers/plans/2026-06-21-loquor-georgian-mode-bottom-bar.md`

- **Implemented:** Decision 1 (beta Georgian-only; no-corpus stays bilingual),
  Decision 3 (tip relocated to permanent visible bar content), Decision 4
  (transients stay inline in `role=status`), Decision 5 (`ka`-only chrome; absent
  for en/fr/de/es), Decision 6 (shared `GEORGIAN_ACTIVATION_TIP`; tip on dedicated
  `announce` channel), findings [5] (no boot-flash empty bar — `signature !== ''`
  gate), [6] (tip can't clobber help; corpus-gated so no-corpus ka doesn't
  announce), [7] (bar is not a live region). Each behavior has a corresponding test.
- **Not yet implemented (neutral, expected):** the manual responsive/a11y
  checklist (320/375/520px + short landscape, both themes, screen reader) — a human
  gate jsdom can't satisfy; it remains the pre-merge gate.
- **Deviations:** None contradicting the spec. Thin coverage spot: no dedicated
  test for a mid-session *story* switch flipping bar content corpus→no-corpus (the
  plan argues the existing `corpusFor`/`signature` path + Zork II suppression tests
  cover the same branch).

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases;
  Contract & Integration; Concurrency & State; Security & A11y; Plan Alignment;
  Verifier.
- **Scope:** `src/**` diff (Terminal, StatusBar, GeorgianStatusBar, notices,
  useNaturalLanguage, useModelDownload, inputTranslate, lexicon, components.css) +
  adjacent callers/types (types.ts, landingStrings.ts, corpus/index.ts,
  validate.test.ts) one level deep.
- **Raw findings:** 3 (after each specialist self-filtered to >= 60)
- **Verified findings:** 3 (all Suggestion-level)
- **Filtered out:** numerous sub-threshold non-issues (n.canonical undefined,
  es missing collisions, boot flash, both-flags-true, double-announcement,
  contrast) — each checked and disproven against the code.
- **Steering files consulted:** /workspace/CLAUDE.md (ka OUTPUT-ONLY rule,
  "fix in one language" rule, a11y + responsive requirements — no contradictions)
- **Plan/design docs consulted:** the 2026-06-21 georgian-mode bottom-bar design
  + plan.
