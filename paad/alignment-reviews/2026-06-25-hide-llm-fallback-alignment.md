# Alignment Review: hide the LLM fallback behind one preference

**Date:** 2026-06-25
**Commit:** eb0ab31 (at review time; doc updates committed after)

## Documents Reviewed

- **Intent:** `docs/superpowers/specs/2026-06-25-loquor-hide-llm-fallback-design.md`
- **Action:** `docs/superpowers/plans/2026-06-25-loquor-hide-llm-fallback.md`
- **Design:** none separate (the spec is the design doc)

## Source Control Conflicts

None — no conflicts with recent changes. The branch's recent history is docs
only (this feature's spec/plan) on top of already-merged Georgian-input work; the
plan's line-number references were verified against current `HEAD`.

## Issues Reviewed

### [1] Task 8 (upgrade-pitch suppression) addressed an implied, unstated requirement

- **Category:** scope compliance (task → implied requirement)
- **Severity:** Important
- **Documents:** spec (north-star goal vs un-enumerated gate points/tests) ↔ plan Task 8
- **Issue:** The spec's goal is "every user-facing trace hidden," but the
  `grammarOnlyFirstMiss` notice ("…add the optional upgrade for full sentences")
  — a common-path trace for fr/de/es in basic mode — wasn't enumerated. Task 8
  suppresses it (ka byte-for-byte unchanged).
- **Resolution:** **Keep + add to spec.** Added an explicit _Behavior when off_
  bullet and a `translatePipeline.ts` gate point to the spec.

### [2] M2 migration-notice delivery channel deviated from the spec

- **Category:** design alignment (plan contradicts spec detail)
- **Severity:** Important
- **Documents:** spec §a11y(2) / §M2 _Delivery_ (`Terminal.tsx:~413`) ↔ plan Task 11
- **Issue:** The spec said deliver M2 via the "existing NL-notice channel
  (~413)," but ~413 is the **ka-only** announce region (gated on `outLang==='ka'`)
  and can't carry an en/fr/de/es notice. The plan used a dedicated Terminal-owned
  `aria-live` region (not `role="status"`, to avoid colliding with the single
  existing status region).
- **Resolution:** **Keep the region + fix the spec.** Rewrote the spec's a11y §2
  and M2 _Delivery_ to describe the dedicated region and explain the corrected
  reference.

### [3] t3 and t5 were named spec tests but only behaviorally covered

- **Category:** requirements coverage (named tests partially covered)
- **Severity:** Important (t5) / Minor (t3)
- **Documents:** spec §Testing (t3, t5) ↔ plan Tasks 7/11
- **Issue:** t3 (boot: stored fr + cached + flag off ⇒ fr/grammar, engine never
  loads) and t5 (rapid off→on→off ⇒ no stuck/auto modal) were only covered
  behaviorally, with no explicit assertions.
- **Resolution:** **Add both explicit tests.** Added a t3 hook test to Task 7
  (`model: 'grammar'` after cache-restore + `engine.load` never called via spy)
  and a t5 Terminal test to Task 11 (rapid toggle leaves only the Preferences
  dialog open). t5's deeper declined-flag interaction stays unit-covered by
  `useModelDownload`'s existing test (jsdom can't drive a real download).

## Unresolved Issues

None — all three reviewed issues resolved by document updates.

## Alignment Summary

- **Requirements:** all spec gate points + off/on behaviors have ≥1 task; the 2
  deviations and 2 partial-coverage gaps are now closed (spec amended / tests
  added).
- **Tasks:** 12 tasks; 11 trace directly to spec gate points, Task 8 now ratified
  into the spec (no orphans remain).
- **TDD rewrite:** skipped — plan tasks are already in red→green→commit form.
- **Status:** **aligned.**
