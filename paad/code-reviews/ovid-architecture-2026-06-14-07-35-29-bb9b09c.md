# Agentic Code Review: ovid/architecture

**Date:** 2026-06-14 07:35:29
**Branch:** ovid/architecture -> main
**Commit:** bb9b09c8b1565d36fa3f69d6e7098b50d2a91e86
**Files changed:** 6 src files (2 new, 2 modified, 2 test) | **Lines changed:** +601 / -340
**Diff size category:** Medium-Large (mostly code movement)

## Executive Summary

This branch is a three-commit, behavior-preserving refactor implementing findings
F-2, F-3, and F-18 from the architecture report: it extracts the model-download/
phase lifecycle out of `useNaturalLanguage` into a new `useModelDownload` hook
(F-2), decomposes `useOutputTranslation` by moving its async LLM-fallback
resolution pipeline into a new `createFallbackResolver` factory (F-3), and
documents the hooks' hidden side effects (F-18). Five specialist agents
(logic, error-handling, contract/integration, concurrency/state, security) each
compared the extracted modules line-by-line against the deleted inline code and
found **no verified bugs** — the extractions are faithful, the shared refs are
passed by reference, the stale-async/epoch/abort guards are preserved, and the
public contracts are unchanged. **No Critical or Important issues.** The only
finding is a minor documentation inaccuracy in the report itself (a line-count
claim), plus two non-blocking suggestions.

## Critical Issues

None found.

## Important Issues

None found.

## Suggestions

- **Report line-count claim is stale (doc-only).** `paad/architecture-reviews/2026-06-14-loquor-architecture-report.md:178` states F-3 dropped `useOutputTranslation` to **269 lines**; actual `wc -l` is **283**. Direction/magnitude of the claim are correct; the residual figure is off by 14. (Found by: Plan Alignment.)
- **New extracted modules have no dedicated unit tests.** `src/translate/fallbackResolve.ts:1` advertises itself as "Pure logic — no hooks — so it is unit-testable in isolation," but both it and `src/llm/useModelDownload.ts` are currently exercised only transitively through their parent-hook test suites. The stated unit-testability benefit of F-3 is not yet realized. Not a bug; behavior is still covered. (Found by: Error Handling.)
- **`window.loquorMisses` ships to prod despite "dev affordance" framing.** `src/translate/missLog.ts:77` installs the global unconditionally (not dev-gated). It exposes only the miss-log (English game prose + game signature + language + turn context — no secrets/PII/saves), so it is not a security issue for this client-only single-user app, but the comment calling it a dev affordance does not match the always-on reality. **Pre-existing — not introduced by this diff.** (Found by: Security.)

## Plan Alignment

Plan/design source: the architecture report's F-2/F-3/F-18 "Status reason" entries.

- **Implemented:**
  - **F-2** — `src/llm/useModelDownload.ts` (new, 193 lines) owns the `Internal` phase machine, `installed`/`modalOpen` flags, download refs (`abortRef`/`dlSamplesRef`/`pendingLangRef`), the `isCached` probe effect, and the four actions (`requestDownload`/`cancelDownload`/`declineDownload`/`setLanguage`); `useNaturalLanguage` composes it and dropped to 920 lines (claim accurate). "Only shared state is the `notice` channel" verified true. New progress/ETA safety-net test present.
  - **F-3** — `src/translate/fallbackResolve.ts` (new, 263 lines) holds `createFallbackResolver` with `put`/`settle`/`failEnglish`/`resolve`, the `ExpectedXlateStop` class, and the `Resolution`/`OverlayEntry`/`OverlayState` types, all moved verbatim out of the hook; the hook now orchestrates.
  - **F-18** — explicit "SIDE EFFECTS" inventory in the `useOutputTranslation` header, an effectfulness note on the `OutputTranslation` return type, a companion `NOTE (F-18)` block in the `useNaturalLanguage` header, and a `window.loquorMisses` safety-net test.
- **Deviations:** Only the doc line-count inaccuracy noted under Suggestions. The resolver interface adds a `markPending` method not named in the report's extraction list, but it is just the former inline `put(id, en, 'pending')` call exposed on the interface — behavior-preserving, not a logic change.
- **Not yet implemented:** Nothing material; every component the report describes for F-2/F-3/F-18 is present in the diff.

## Review Metadata

- **Agents dispatched:** Logic & Correctness, Error Handling & Edge Cases, Contract & Integration, Concurrency & State, Security, Plan Alignment (6 total, parallel).
- **Scope:** Changed files (`useModelDownload.ts`, `useNaturalLanguage.ts`, `fallbackResolve.ts`, `useOutputTranslation.ts` + their test files) plus adjacent callees (`progress.ts`, `nlpref.ts`, `engineGate.ts`, `guardedGenerate.ts`, `fallbackCache.ts`, `missLog.ts`, `match.ts`, `normalize.ts`) and callers (`Terminal.tsx`, `Scrollback.tsx`).
- **Raw findings:** 0 bug findings ≥60 confidence (1 doc deviation + 2 suggestions).
- **Verified findings:** 0 bugs. (No bug candidates surfaced; specialists verified faithfulness against live code inline, so a separate verifier pass had nothing to confirm/refute.)
- **Filtered out:** 0.
- **Steering files consulted:** `CLAUDE.md` (verified accurate against the changed code — no drift; the "Known network egress" section is unaffected by this refactor), `MEMORY.md` (corroborates F-2/F-3 as known deferred follow-ups).
- **Plan/design docs consulted:** `paad/architecture-reviews/2026-06-14-loquor-architecture-report.md` (F-2/F-3/F-18).

### Verification highlights (why "behavior-preserving" holds)

- **Closure capture (F-3):** `createFallbackResolver` is created once per fallback-effect run, capturing `epoch` by value exactly as the old inline `const epoch = epochRef.current` did; `epochRef`/`basisRef`/`retryRef`/`acsRef` are passed as the same `MutableRefObject`s (never copied), so `settle`/`failEnglish` mutate live state and the activation effect's `new Map()` resets stay visible.
- **Abort/stale guards (F-2):** `requestDownload`'s `stale = () => ac.signal.aborted || abortRef.current !== ac`, the abort-previous-first ordering, and `cancelDownload` persisting `'off'` (cancel-vs-completion race) are byte-identical to the deleted code. The `requestDownload` dep array correctly gained `setNotice` (a stable `useState` setter) — more correct, no identity change.
- **Unmount teardown:** `acsRef.current` is read-only across the module boundary; `runGenerationGuarded` add/deletes controllers on the same Set the unmount effect iterates, so in-flight generations still abort on unmount/HMR.
- **Contracts:** all 13 `FallbackResolverDeps` fields are passed with matching types; the `Internal` type is defined once (exported from `useModelDownload`, re-imported); `useNaturalLanguage`'s public return is unchanged for all `Terminal.tsx` consumers. `tsc -b` clean; the two affected test suites (99 tests) pass.
- **Security:** model output renders as a React text node in `Scrollback.tsx:62` (no `dangerouslySetInnerHTML` anywhere in `src/`); the `untranslatable(out)` and `out === normalize(core)` guards survived and still precede `settle()`/`cacheSet()`, preventing hallucinated chrome/refusals from rendering or poisoning the cache.
