# Agentic Code Review: ovid/architecture

**Date:** 2026-06-14 09:22:55
**Branch:** ovid/architecture -> main
**Commit:** fc8927a5e776de3dcbe2157472732f51e17e8261
**Files changed:** 23 | **Lines changed:** +413 / -68
**Diff size category:** Medium

## Executive Summary

This branch is a behavior-preserving architecture-fix refactor addressing report
findings F-4 (declare the `Dialog` contract the engine relies on), F-9 (surface
explicit savefile write/remove failures), F-13 (centralize NL pipeline tunables
in `config.ts`), F-14/F-16 (tag-scoped logger), and F-19 (`isCached()` warns on a
probe fault instead of swallowing it). Five specialist reviewers — Logic,
Error Handling, Contract/Integration, Concurrency/State, Security — each read the
full diff plus the current source, and several independently ran `tsc -b` and the
affected test suites. **No findings at or above the 60% confidence bar were
produced.** The one genuine behavior change (the new `isCached` warn) is correctly
paired with a test-only `CacheStorage` stub so it does not trip the pristine-output
guard. Confidence in the branch is high.

## Critical Issues

None found.

## Important Issues

None found.

## Suggestions

- `src/storage/dialog.ts` — the failure-logging `.catch` block (`const e = err as { name?; message? }; log.error(\`… FAILED for ${k}: ${e?.name}: ${e?.message}\`)`) is now repeated three times (`autosave_write`, `file_write`, `file_remove_ref`). The copies are consistent today; a tiny shared `logPersistFailure(logger, verb, key)` helper would keep them from drifting. Marginal — not a defect.
- `src/test/setup.ts` — the `caches` stub guards on `typeof … === 'undefined'`. If a future test installs a _partial_ `caches` lacking `keys()`, the stub is skipped and the real WebLLM probe would throw → warn → trip the pristine-output guard. Latent coupling only; nothing in the tree triggers it now.
- `src/llm/engine.webllm.test.ts` — the test imports `hasModelInCache` statically while `isCached()` reaches it via `await import(...)`; they resolve to the same vitest-mocked instance, so it passes, but the indirection is non-obvious. A one-line comment would help the next reader.

## Plan Alignment

The only design/plan artifact in the diff is the architecture report's own status
updates (`paad/architecture-reviews/2026-06-14-loquor-architecture-report.md`).

- **Implemented:** F-4, F-9, F-13, F-19 are marked **Fixed** and F-16 **Partially
  fixed**, each matching the code. Verified: the three `const dialog: any` casts
  are gone and `engine.ts` narrows on the now-typed optional methods (`tsc -b`
  green proves `IdbDialog` and the minimal `engine.test.ts` stubs both still
  conform); the moved constants in `config.ts` hold their pre-branch values
  (8000 / 60_000 / 8 / 4 / 1500) and every old consumer imports them; zero
  first-party `console.*` calls remain outside `logger.ts`/`test/setup.ts`.
- **Not yet implemented:** F-16's durable warn/error sink (ring buffer / telemetry)
  is explicitly deferred — diagnostics still reach only the console — and the
  `nlDebug` "TEMP" calls remain pending removal once translation quality is tuned.
  Both are correctly recorded as follow-ups, not claimed done.
- **Deviations:** None substantive. The F-16 status is honestly downgraded to
  "Partially fixed" rather than overstated.

## Review Metadata

- **Agents dispatched:**
  - Logic & Correctness — withPrefix fold/prepend, optional-Dialog narrowing, isCached, debug-gate equivalence
  - Error Handling & Edge Cases — enqueue/.catch unhandled-rejection, pristine-output leak, new-test soundness
  - Contract & Integration — Dialog conformance, moved-constant values, dangling references, F-9 consistency
  - Concurrency & State — write-queue chaining under .catch, boot ordering, probe/load race
  - Security — log-content exposure, network egress, caches-stub leakage, prototype pollution
- **Scope:** changed files + one-level callers/callees — `logger.ts`, `llm/config.ts`,
  `storage/dialog.ts` (+ `idb.ts` enqueue), `zmachine/engine.ts` (+ `engine.test.ts`
  stubs, `bridge.ts`), `llm/engine.webllm.ts`, `llm/translatePipeline.ts`,
  `llm/{capability,nlpref,prompt}.ts`, `translate/fallbackResolve.ts`,
  `ui/{App,Terminal}.tsx`, `glkote-react/bridge.ts`, `test/setup.ts`, plus the new
  test files.
- **Raw findings:** 0 (before verification)
- **Verified findings:** 0 (after verification)
- **Filtered out:** 0 — no findings reached the 60% bar, so the dedicated
  verifier pass had nothing to confirm; the specialists self-verified by running
  `tsc -b` and the affected suites (all green).
- **Steering files consulted:** CLAUDE.md (no contradictions surfaced; the
  pristine-output convention is actively enforced by `test/setup.ts` and respected
  by the changes).
- **Plan/design docs consulted:** `paad/architecture-reviews/2026-06-14-loquor-architecture-report.md`
