# Agentic Code Review: ovid/architecture

**Date:** 2026-06-14 10:10:11
**Branch:** ovid/architecture -> main
**Commit:** f0c76a10fb2deca05b9812a321dc78fa8374706a
**Files changed:** 45 | **Lines changed:** +630 / -100
**Diff size category:** Large (mostly renames/moves + mechanical adoption)

## Executive Summary

This branch applies ten architecture-report fixes (F-4, F-5, F-6, F-7, F-9, F-11,
F-13, F-14, F-15, F-19) as a behavior-preserving refactor: a tag-scoped logger, a
central `localStorage` key registry, a centralized NL-config module, file
renames/moves (`llm/translate.ts`→`inputTranslate.ts`; `engineGate`/`guardedGenerate`→`shared/`),
a documented Dialog contract, and surfacing of two previously-swallowed error paths.
Six specialists (logic, error-handling, contract/integration, concurrency, security,
plan-alignment) reviewed the diff and the current code, each independently running the
test suite and `tsc -b`. **No bugs were found at or above the 60% confidence bar.** The
branch is clean and ready to merge; the only open items are architecture flaws this
branch deliberately did not scope (F-8, F-10, F-12, F-17, F-20).

## Critical Issues

None found.

## Important Issues

None found.

## Suggestions

- `src/test/setup.ts` — the unconditional global `caches` stub (added for F-19's new warn) is faithful today (empty cache → "not cached"), but a future _partial_ `caches` implementation could slip through it. Low-priority latent coupling, already self-flagged in the in-diff code-review notes.
- `src/zmachine/engine.ts:22-32` (F-4) — the Dialog contract declares `preload?`/`hasSave?`/`dispose?` as **optional** so minimal test stubs stay assignable. This makes the contract visible-but-not-type-enforced; the original "silently skip preload" risk is instead caught at runtime by the F-5/F-11 guard. Deliberate and documented — noted only so the trade-off is on record.

## Plan Alignment

Report reviewed: `paad/architecture-reviews/2026-06-14-loquor-architecture-report.md` (20 flaws, 15 strengths).

- **Implemented (verified in this diff):**
  - **F-4** — `Dialog` interface gains documented optional `preload?`/`hasSave?`/`dispose?`; all three `dialog: any` casts removed (`engine.ts`).
  - **F-5 / F-11** — `autosave_read` distinguishes never-preloaded (loud warn) from preloaded-empty (silent), backed by the `cache.has` invariant; new/updated `dialog.test.ts` cases pin both.
  - **F-6** — `engineGate.ts`/`guardedGenerate.ts` (+tests) moved `llm/`→`shared/`; all 8 importers updated.
  - **F-7** — `llm/translate.ts`→`inputTranslate.ts`; all 9 importers updated.
  - **F-9** — `file_write`/`file_remove_ref` now `.catch(onPersistFail(...))` instead of `void enqueue`; shared `onPersistFail` helper; new `dialog.filewrite-error.test.ts`.
  - **F-13** — new `llm/config.ts` centralizes the five tunables (values unchanged, pinned by `config.test.ts`).
  - **F-14** — new `logger.ts`; adopted everywhere; zero `console.*` remain in first-party non-test code.
  - **F-15** — new `storageKeys.ts` registry; key strings preserved exactly (no orphaned user data).
  - **F-19** — `engine.webllm.ts` `isCached` warns then degrades to `false`; new test asserts both.
  - **F-16** — honestly downgraded to _Partially fixed_ (logger consolidates; durable sink deferred).
- **Not yet implemented (out of scope — neutral, partial is expected):** F-8 (flat `kv` store ownership), F-10 (GlkOte schema/versioning), F-12 (per-key transaction atomicity), F-17 (game-loop logic in `Terminal.tsx`), F-20 (unpinned remote WASM / no SRI — the headline security item, still documented + opt-in-gated). F-1/F-2/F-3/F-18 are marked Fixed in the report but landed on prior branches (already on `main`); not part of this diff.
- **Deviations:** None substantive. All ten claimed-fixed findings do what the finding asked.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration; Concurrency & State; Security; Plan Alignment.
- **Scope:** changed files + adjacent (callers/callees one level deep, all renamed-import sites, all `localStorage` keys, the Dialog contract vs `IdbDialog`).
- **Raw findings:** 0
- **Verified findings:** 0
- **Filtered out:** 0 (Phase-3 verifier not dispatched — no raw findings to confirm/dedupe; each specialist self-verified against current code + green test suite + `tsc -b`).
- **Steering files consulted:** `CLAUDE.md` (no contradictions; the "Known network egress" section remains accurate, and the pristine-output convention is upheld — every new log path has a spying/asserting test).
- **Plan/design docs consulted:** `paad/architecture-reviews/2026-06-14-loquor-architecture-report.md`; `docs/superpowers/plans/` and `docs/superpowers/specs/` (NL + output-translation designs).
