# Agentic Code Review: ovid/georgian-genitive-case-objects

**Date:** 2026-06-25 16:27:56
**Branch:** ovid/georgian-genitive-case-objects -> main
**Commit:** d8379d7bceadb86809e2d8cd93ff70c04688ba3f
**Merge-base:** babd3264d7050c642bf35569c72cdc8d8e541571
**Files changed:** 20 (14 source/test, 6 notes/reports) | **Lines changed:** +383 / -22 (source/test: +229 / -17)
**Diff size category:** Medium

## Executive Summary

This branch adds deterministic Georgian (`ka`) handling for multi-word objects in
case roles (the "stranded-modifier rejoin" loop in `parse.ts`), swaps `wrench` to
the genitive compound `ქანჩის გასაღები` ('nut-key') across input lexicon + output
corpus + composed-instrument string, adds egg full-ablative residue synonyms, and
plumbs a synchronous `currentView` so `getContext` no longer reads an
effect-lagged React ref. **No Critical or Important issues survived verification.**
Notably, this branch already carries a committed prior agentic review and its
S1/S2/S3/S5 follow-up fixes; six specialists independently re-verified those fixes
(the S1 view-synchrony race, the `nl-canonical` window reset, the k≥2 test, the
all-Mtavruli `containsGeorgian` guard) and confirmed they genuinely hold. The two
remaining findings are both low-severity Suggestions: a stale comment list and a
weak test assertion — neither is a behavioral bug. Overall confidence: high.

## Critical Issues

None found.

## Important Issues

None found.

## Suggestions

### [S1] Rejoin safety-invariant comment omits the new `ქანჩის` modifier

- **File:** `src/llm/lexicon/parse.ts:533-535`
- **Bug:** The rejoin loop's smallest-object-first split relies on a documented
  load-bearing invariant: no stranded modifier token is also a standalone noun
  synonym (or the loop would mis-bind a leading modifier as the object). The
  comment enumerates that set — `(ხელის, ჰაერის, ჯილდოების, გატეხილ, თვლებიან)` —
  but this branch added a new genitive modifier `ქანჩის` via
  `wrench: ['ქანჩის გასაღებ']` (`ka.zork1.ts:208`) and did **not** add it to the
  list. Confirmed not a behavioral bug: `ქანჩის` appears only as the first token
  of the two-word form, never as its own synonym, so bare `ქანჩის` misses and the
  invariant still holds today — but the comment that protects the invariant is now
  incomplete, so a future maintainer auditing it gets a stale list.
- **Impact:** Maintainability/comment-accuracy only. No runtime or test impact.
- **Suggested fix:** Append `ქანჩის` to the parenthetical at `parse.ts:534`:
  `(ხელის, ჰაერის, ჯილდოების, გატეხილ, თვლებიან, ქანჩის)`, and consider noting the
  list must be kept in sync whenever a genitive-modifier synonym is added to
  `ka.zork1`.
- **Confidence:** High (90)
- **Found by:** Error Handling & Edge Cases (verified)

### [S2] Instrumental-output UAT pins a shared root for wrench AND skeleton key — wouldn't catch a wrench→skeleton-key output regression

- **File:** `src/translate/corpus/zork1.ka.uat.test.ts:249` (assertion at ~:260)
- **Bug:** The `INSTRUMENTS` table pins `root = 'გასაღებ'` for **both**
  `['wrench', 'გასაღებ']` and `['skeleton key', 'გასაღებ']`, and the loop asserts
  only `expect(out).toContain(root)`. The wrench corpus output is `(ქანჩის
გასაღებით)` and the skeleton-key output is `(ღია გასაღებით)`
  (`zork1.ka.strings.ts:1818,1820`) — both contain `გასაღებ`. So a regression that
  reverted the wrench to render like the skeleton key would still pass. The
  wrench's distinguishing token `ქანჩის` is never asserted. (Input-side coverage
  DOES distinguish them — `parse.ka-uat.test.ts` / `parse.ka-walkthrough.test.ts`
  — so this is a weak _output_-UAT assertion, not an uncovered behavior.)
- **Impact:** Test-quality only; the weak assertion is not wrong, just permissive.
- **Suggested fix:** Tighten the wrench row to assert its distinguishing token,
  e.g. `['wrench', 'ქანჩის']`, or add a second `toContain('ქანჩის')` check on the
  wrench case.
- **Confidence:** Medium/High (80)
- **Found by:** Contract & Integration (verified)

## Plan Alignment

Plan/notes docs consulted: `docs/superpowers/specs/2026-06-24-loquor-georgian-input-design.md`,
`docs/superpowers/plans/2026-06-24-loquor-georgian-input.md`,
`notes/georgian-genitive-case-morphology.md`, `notes/georgian-input-work-needed.md`,
`notes/georgian-composed-line-review.md`, `notes/uat.md`.

- **Implemented:** the stranded-modifier rejoin (the morphology note's "approach 1",
  generalized to a k=1…len-1 split loop, ka-gated on `core.postpositions`, fires
  only on `!obj`, commits only a fully-resolving reparse); the
  `სასხლეტი`→`ქანჩის გასაღები` reversal across input lexicon + output objects +
  composed-instrument string (full two-word form only, no bare `გასაღებ` synonym so
  the skeleton-key collision is avoided); egg full-ablative residue synonyms; the
  `viewToContext` `nl-canonical` window fix (pinned language-agnostically for
  fr/de/es too, honoring the "a fix in one language is a fix in all" rule); the
  `currentView` synchronous-view plumbing.
- **Not yet implemented (neutral — expected):** native (Tbilisi) review of the new
  `ka` forms (all remain `NATIVE-REVIEW-DRAFT`); the morphology note's optional
  approach-2 stored per-object case-form table (the branch chose the leaner general
  rejoin); off-winning-path multi-word case-role objects beyond
  wrench/trophy-case/air-pump/both-eggs.
- **Deviations:** none in code. The `სასხლეტი`→`ქანჩის გასაღები` reversal was a
  deliberate decision; all three notes that recorded the old "deferred / keep
  სასხლეტი" stance were updated with explicit `RESOLVED 2026-06-25` markers, and
  `git grep სასხლეტ` confirms the token is absent from `src/` and tests (notes
  history only). The standing CLAUDE.md source-of-truth-list / "raw-sends English"
  housekeeping is owed at Phase-2 _input_-line merge time per that design's §13 —
  not this genitive branch's responsibility.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases;
  Contract & Integration; Concurrency & State; Security; Plan Alignment — then a
  single Verifier.
- **Scope:** changed files + adjacent — `parse.ts` (rejoin loop, `resolveNoun`,
  prep-split, G1 dative), `prompt.ts` (`viewToContext`) and all callers
  (`Terminal.tsx`, `useNaturalLanguage.ts`, `translatePipeline.ts` single-command
  vs queue paths), `bridge.ts`/`engine.ts` (`currentView` getter chain),
  `reduce.ts`/`types.ts` (`nl-canonical` line-kind contract), `expandGeorgian.ts`,
  `ka.core.ts`, `ka.zork1.ts`, the two `zork1.ka.*` corpus files, and the affected
  test files.
- **Raw findings:** 2 distinct (after specialist-level dedup); Logic, Concurrency,
  Security, and Plan-Alignment specialists returned no findings ≥60.
- **Verified findings:** 2 kept (both Suggestions).
- **Filtered out:** 0 at the verifier stage. Below-bar items not carried forward:
  a ~25-confidence theoretical two-postposition mis-bind (no Zork I Georgian clause
  has two case-marked nouns — not reachable today); the prior review's S1/S2/S3/S5
  (already fixed on this branch and re-verified correct); the Security S12
  prompt-injection mitigation (confirmed intact — `recentOutput` is structurally
  available to `buildPrompt` but never read into the model prompt, and the window
  change only _narrows_ the window).
- **Steering files consulted:** `CLAUDE.md` — no contradiction with shipped code;
  the deterministic-`ka`-coverage rule, the keep-`ka`-out-of-LLM-input rule, and
  the "fix in one language is a fix in all" rule are all respected.
- **Plan/design docs consulted:** listed under Plan Alignment above.
