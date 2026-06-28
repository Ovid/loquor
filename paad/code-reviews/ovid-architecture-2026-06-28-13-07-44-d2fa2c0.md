# Agentic Code Review: ovid/architecture

**Date:** 2026-06-28 13:07:44
**Branch:** ovid/architecture -> main
**Commit:** d2fa2c09f40e88c234592b4336b706de00ef24c6
**Files changed:** 28 | **Lines changed:** +775 / -134
**Diff size category:** Large (by raw lines; ~half are the architecture-report doc, so the reviewable *code* surface is Medium)

## Executive Summary

This branch implements fixes from a prior architecture review (findings F-a through F-q),
plus the report doc itself. The work is overwhelmingly **behavior-preserving refactors and
type-tightening**: a single source of truth for language membership (F-a/F-g), a centralized
raw-send predicate (F-c), a relocated output-classification module (F-e), now-required DI
args (F-m/F-q), un-swallowed diagnostic catches (F-o), and one genuinely new player-facing
behavior — surfacing boot failures (F-l).

Six specialists (Logic, Error Handling, Contract/Integration, Concurrency/State, Security,
Plan Alignment) reviewed the diff in parallel, each tracing callers/callees one level deep
and running typecheck + the affected suites. **All six returned clean — zero findings at
confidence ≥ 60.** Independent verification confirms `tsc -b` is clean and 447/447 tests pass
across the 10 affected suites. The "behavior-preserving" claim holds; the cross-cutting `ka`
(Georgian, no-LLM) invariant is preserved; the report's claimed statuses match the code.

## Critical Issues

None found.

## Important Issues

None found.

## Suggestions

- **Coverage note (not a defect):** `src/ui/nlModeSummary.ts` (its `FULL`/`INPUT` maps were
  re-typed to `Record<'en' | LexLang>`) has no dedicated unit test. The change is a
  behavior-preserving type-annotation swap and is typecheck-pinned + transitively covered, so
  this is informational only.

## Plan Alignment

Plan/design docs consulted: the in-diff report
`paad/architecture-reviews/2026-06-28-loquor-architecture-report.md` (findings F-a..F-q with
per-finding Status + Status commit SHAs), and `CLAUDE.md`.

- **Implemented / aligned:** Every finding marked **Fixed** / **Partially fixed** / **Won't
  fix** matches the diff and source, and all ten claimed Status commit SHAs exist and touch
  the files their reasons name:
  - **F-a (Fixed, 9a0679c)** — `LEX_LANGS`/`INPUT_LEX_LANGS` `as const` arrays are the single
    source; types and the runtime sets `OUTPUT_ONLY_LANGS`/`CORPUS_ONLY_LANGS` derive from
    them; the two stray unions (`nlModeSummary`, `composed-families` `EXEMPTIONS`) were folded;
    a coherence anchor test enforces it. The deliberately-deferred mega-`LanguageProfile` is
    correctly absent.
  - **F-c (Partially fixed, 1852efd)** — the en/ka-ASCII raw-send predicate centralized into
    `rawSendsToParser`, used at all three sites; the distinct `OUTPUT_ONLY_LANGS && lex===null`
    bail correctly left in place.
  - **F-e (Fixed, a90cc63)** — `refusalApplies`/`commandObjectWords`/`nounSurfaceWords` moved
    to new `src/llm/outputClassify.ts`; scene tracker's feature-envy back-edge removed.
  - **F-g (Fixed, 540ad88)** — `OutLang = InputLexLang` alias.
  - **F-l (Fixed, b30fc7d + 8044144)** — boot failure now rides the same `loadError` surface a
    fetch failure uses and drops back to the landing.
  - **F-m (Fixed, 496a445)** — `ORPHAN_SETTLE_MS` centralized in `config.ts`, now a required arg.
  - **F-o (Fixed, da211c6)** — both bare `.catch(() => {})` now `log.warn`.
  - **F-q (Fixed, d3f335b)** — shared `gate` now required; hook-local fallback gate deleted.
  - **F-k (Won't fix, eced9b0)** — docs-only; autosave write path untouched (decision ratified).
- **Not yet implemented (deferred — neutral, expected):** F-b (god function `createTranslate`),
  F-d (`Terminal.tsx` god component), F-f (logger globals), F-h (boot temporal coupling), F-i
  (`fallbackResolve` shared refs), F-j (unversioned protocol/snapshot), F-n
  (`LLM_ANNOUNCE_CLEAR_MS` still inline), F-p (WebLLM SRI/self-hosting / no CSP). All confirmed
  genuinely untouched — none silently partially-touched, none carry a status claim.
- **Deviations:** None. No overclaims, no mismatches, no wrong/missing SHAs.

### Cross-cutting `ka` invariant — confirmed safe

`ka` remains in both `OUTPUT_ONLY_LANGS` and `CORPUS_ONLY_LANGS` (now by the derivation
`INPUT_LEX_LANGS.filter(l => !LEX_LANGS.includes(l))`, which yields `{ka}`); the coherence test
pins this. No LLM-keyed map gained a `ka` key — `FEWSHOTS`, `xlPrompt` tables, `EXEMPTIONS`, and
`fallbackResolve` stay `Record<LexLang>`/`LexLang`-keyed, so a `ka` entry remains a compile
error, exactly as CLAUDE.md requires. (The two `Record<InputLexLang>` maps — `CORES`/`NOUNS` —
are the deterministic input-lexicon registries that legitimately include `ka`, not LLM machinery.)

## Verification of key refactor claims (independently confirmed)

- **F-c branch equivalence:** the two collapsed `else if` arms (`en`, `ka && !containsGeorgian`)
  had identical bodies (`sendTracked(line)`), so the OR-collapse cannot reorder which arm fires
  vs. the later `grammarOnly` arm. The `ModelLoadError` arm still raw-sends English-only and was
  correctly *not* folded into the helper.
- **F-l async/StrictMode safety:** the boot effect still keys only on `[storyBytes]`;
  `onBootError` is held in a ref written in an effect so an unstable callback identity can't
  re-trigger boot; the callback fires only inside the existing `if (!cancelled)` guard (each
  effect invocation has its own `cancelled` closure, so a StrictMode throwaway engine's
  rejection is suppressed). `describeLoadError` only *classifies* `err` via regex and never
  interpolates `err.message` into the DOM — no injection/leak.
- **F-q shared gate:** Terminal creates ONE `useState`-stable `EngineGate` and passes that same
  instance to both `useNaturalLanguage` and `useOutputTranslation`; input-preempts-output
  arbitration is preserved. `EngineGate` has no teardown, so removing the hook-local fallback
  lost no cleanup.
- **F-m/F-q no `undefined`-at-runtime:** all call sites (production + test) of
  `runGenerationGuarded` and `useNaturalLanguage` pass the now-required args; `tsc -b` clean.
- **F-a module-init order:** `src/llm/lexicon/types.ts` is a zero-import leaf, so the `as const`
  arrays are fully initialized before any consumer's top-level `.filter()` runs; madge reports 0
  cycles across 234 files.

## Review Metadata

- **Agents dispatched:**
  - Logic & Correctness (branch equivalence, derived sets, module move, boot path)
  - Error Handling & Edge Cases (F-o catches, F-l boot path, now-required args, external-output parsing)
  - Contract & Integration (signature changes, shared-gate wiring, module move, type exhaustiveness, duplication-removal)
  - Concurrency & State (F-l ref-in-effect/StrictMode, F-q shared gate, gate arbitration, F-a init order)
  - Security (boot-error surfacing, F-o logging, no new egress/eval, input trust boundary)
  - Plan Alignment (report Status vs. code, claimed SHAs, `ka` invariant, deferred findings)
  - Verifier phase: not required — zero findings to verify; replaced with an independent
    typecheck + affected-suite run by the orchestrator.
- **Scope:** 28 changed files (code + tests + the report doc) + callers/callees one level deep
  across `src/`; vendored read-only dirs excluded.
- **Raw findings:** 0 (every specialist returned clean at confidence ≥ 60)
- **Verified findings:** 0
- **Filtered out:** 0
- **Independent verification:** `make typecheck` (`tsc -b`) clean; `npx vitest run` over the 10
  affected suites — **447/447 tests pass**.
- **Steering files consulted:** `CLAUDE.md` (verified consistent with the code; no stale-doc
  contradiction found in the reviewed scope — the WebLLM SRI/self-hosting follow-up it flags
  remains correctly outstanding, F-p).
- **Plan/design docs consulted:** `paad/architecture-reviews/2026-06-28-loquor-architecture-report.md`.
