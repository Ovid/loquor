# Agentic Code Review: ovid/architecture

**Date:** 2026-06-14 08:50:30 UTC
**Branch:** ovid/architecture -> main
**Commit:** 2ffba49feff60ca394ddc597090e9ce48947df0c
**Files changed:** 14 | **Lines changed:** +416 / -79
**Diff size category:** Medium

## Executive Summary

This branch is a behavior-preserving architecture remediation (F-8 IndexedDB key
registry, F-10 GlkOte drift warning, F-16 durable log ring, F-17 game-loop hook
extraction), each landed with red/green safety-net tests. The review found **no
Critical and no Important issues** — every confirmed finding is a Suggestion, and
the highest-value one is a one-liner (`recentLogs() => ring.slice()`, corroborated
by three specialists). The extraction was verified line-for-line against `main`
and preserves StrictMode/lifecycle/dependency behavior exactly.

## Critical Issues

None found.

## Important Issues

None found.

## Suggestions

- **[S1] F-16 `recentLogs()` returns the live mutable `ring`** — `src/logger.ts:60`. The dump (`window.loquorLogs()`) hands callers a `readonly`-typed reference to the actual singleton; a consumer can mutate it (`.push`/`.length=0`) or watch it shift under them as eviction runs. Fix: `export const recentLogs = (): readonly LogRecord[] => ring.slice()`. Note: this breaks the reference-equality assertion at `logger.test.ts:115`, so update that test to `toEqual` in the same change. _(Found by Error Handling, Concurrency, Contract — 3 specialists.)_
- **[S2] F-16 ring stores logged args by reference** — `src/logger.ts:55-57`. Same root cause as S1. Logged `Error`s are pinned for the session (bounded to ≤200 records) and a later mutation of a logged object would show stale state in the dump. Auditing real call sites, the second arg is almost always a caught `Error` or a fresh `Object.keys()` array, so the staleness harm is theoretical; only the bounded `Error` retention is concrete. A complete fix snapshots non-primitive args at `record()` time; marginal payoff. _(Found by Error Handling.)_
- **[S3] F-10 warn doesn't whitelist the known graphics shape** — `src/glkote-react/reduce.ts:188-199`. The drift `else` branch fires on any entry that is neither `lines[]` nor `text[]`. `vendor/glkote/glkapi.js:652-656` emits `{id, draw:[…]}` for graphics windows, which would hit this branch on every redraw and flood the F-16 ring. **Does not fire for shipped games** — Zork I/II/III are Z-machine v3, text-only, no graphics window — so this is future-proofing, not a live bug: a known GlkOte shape would be mislabeled as "drift." Optional one-line guard: `else if (Array.isArray(entry.draw)) { /* graphics: UI has no graphics window, ignore */ }` before the warn. _(Found by Error Handling; counterpoint from Logic.)_
- **[S4] `logger.test.ts` ring suite is order-dependent on shared module state** — `src/logger.test.ts:7-57` vs `:64-65`. The first `describe('createLogger')` block logs warn/error into the shared module-global `ring` and never clears it; the F-16 ring suite stays green only because its `beforeEach(clearLogs())` runs after it in file order. Brittle to reordering. Fix: hoist `beforeEach(() => clearLogs())` to the file top level. _(Found by Concurrency.)_
- **[S5] F-16 `window.loquorLogs` is an unconditional module-load global side effect** — `src/logger.ts:65-67`. Guarded by `typeof window !== 'undefined'` so it never crashes (SSR/node-test safe); an intentional dev affordance on a no-secrets static site. Lowest priority — keep as a note or attach lazily behind `import.meta.env.DEV`. _(Found by Error Handling.)_

## Plan Alignment

The branch implements the remediation status changes recorded in
`paad/architecture-reviews/2026-06-14-loquor-architecture-report.md`:

- **Implemented:** F-8 (Fixed — central `idbKeys.ts` registry, formats preserved exactly, pinned by `idbKeys.test.ts` + literal-key safety nets), F-10 (Fixed — explicit drift warn, output unchanged), F-16 (Fixed — durable warn/error ring; closes the F-14 follow-up), F-17 (Fixed — three hooks extracted to `useGameEngine.ts`, Terminal 224→176 lines). Won't-fix decisions (F-19 unpinned WASM, F-7 multi-key atomicity, F-20/F-12) recorded with rationale.
- **Not yet implemented:** Cross-session log persistence / telemetry export (deliberate non-goal at the F-16 chokepoint); removal of the `nlDebug` "TEMP" diagnostics once translation quality is tuned (tracked separately).
- **Deviations:** None. The report's claim that lifecycle/hooks live in `Terminal.tsx` is now stale (F-17 moved them) — a documentation lag in CLAUDE.md's Architecture section, not a code defect.

## Review Metadata

- **Agents dispatched:** Logic & Correctness, Error Handling & Edge Cases, Contract & Integration, Concurrency & State, Security — plus a Verifier pass.
- **Scope:** Changed files + adjacent (`src/storage/idbKeys.ts`, `dialog.ts`, `translate/fallbackCache.ts`, `glkote-react/reduce.ts`, `logger.ts`, `ui/useGameEngine.ts`, `ui/Terminal.tsx`), the `main` baselines of each, `vendor/glkote/glkapi.js` content path, `src/storageKeys.ts`, and the corresponding test files.
- **Raw findings:** 6 (A–F)
- **Verified findings:** 5 (all Suggestions)
- **Filtered out:** 1 — [E] `:`-delimiter key collision: rejected. Trailing field absorbs the remainder and leading fields (usage/gameid/game/language) are constrained tokens without `:`; formats are also preserved verbatim from `main`. No collision possible.
- **Steering files consulted:** `/workspace/CLAUDE.md` (noted the F-17 lifecycle-location lag as stale documentation, not a bug).
- **Plan/design docs consulted:** `paad/architecture-reviews/2026-06-14-loquor-architecture-report.md` (the architecture remediation report this branch executes).
