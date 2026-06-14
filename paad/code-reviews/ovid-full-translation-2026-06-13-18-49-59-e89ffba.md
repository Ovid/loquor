# Agentic Code Review: ovid/full-translation

**Date:** 2026-06-13 18:49:59
**Branch:** ovid/full-translation -> main
**Commit:** e89ffba6ee73c6682b7c3f717855d386120377f8
**Files changed:** 66 | **Lines changed:** +11802 / -95
**Diff size category:** Large

## Executive Summary

This branch lands output-translation v1 (Zork I × French): a display-layer overlay
(`src/translate/`) with a pre-translated corpus plus an on-device LLM fallback behind
a shared engine gate, the z-string extraction tooling, and strict coverage/inventory/
roundtrip gates. **This is the fourth review of this branch**, and the author has, in
the five most-recent commits, addressed every Important finding (I1–I4) and the key
Suggestions (S6–S9, S13) from the prior pass. Six specialists re-reviewed the _current_
committed state and **independently re-verified that each of those fixes is genuinely
in place** — not just claimed. **No Critical and no Important issues were found.** The
only verified finding is a low-severity documentation-consistency gap: the `reduce.ts`
`classify()` edit contradicts the spec's literal "reducer untouched" statement and is
not acknowledged in the spec's execution notes. Raw findings: 1 (after each specialist
filtered already-fixed/accepted-latent items); verified: 1 Suggestion.

## Critical Issues

None found.

## Important Issues

None found.

The four Important findings from the prior review (commit `87f1cc5`) were re-checked
against the current code and confirmed **fixed**:

- **[I1]** Model output now runs through `untranslatable()` before settle/cache
  (`useOutputTranslation.ts:301`); a hallucinated `>`/chrome completion degrades to
  English and never poisons the cache. Pinned by a regression test.
- **[I2]** The gate/watchdog "await the orphaned generation before releasing the gate"
  logic is extracted to a single `runGenerationGuarded` (`src/llm/guardedGenerate.ts`),
  called by both hooks; a genuine post-watchdog engine fault is now surfaced via
  `onOrphanError` instead of being swallowed as a transient timeout.
- **[I3]** The coverage/inventory gate now calls `classify()` directly
  (`inventory.test.ts:28`) rather than a drifting copy of its regex.
- **[I4]** `splitPromptResidue` is shared between `matchLine` and the fallback
  resolve/backlog paths (`match.ts:117`), so cache keys are residue-free on both paths.

## Suggestions

- **[S-doc] Spec §3 "reducer untouched" contradicts the `classify()` edit.**
  `src/glkote-react/reduce.ts:130` — `classify()` gained two exclusions in this branch
  (leading-whitespace → `output`, trailing-`:` → `output`) and was exported, but the
  design doc still states at §3 (line 50) that the reducer is **untouched**, and the
  2026-06-11 execution-notes addendum (which records the other conscious refinements)
  does not mention it. The change itself is sound and well-tested (it keeps
  container/inventory listings out of `room` classification, which the matcher needs)
  — this is purely a doc/code consistency gap. Fix: add one line to the spec's
  execution notes acknowledging the `classify()` edit so the "untouched" claim and the
  code stop disagreeing. _(Plan Alignment; verified against the spec, confidence 70,
  near-zero behavioral risk.)_

## Plan Alignment

Governing docs: `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md`
and `docs/superpowers/plans/2026-06-10-loquor-output-translation.md`.

- **Implemented:** All plan tasks (1–18) are reflected in the diff — the grammar-free
  engine path (`generate(grammar: string | null)`), the `EngineGate` priority mutex
  (now shared by the input NL hook and the output hook via one `Terminal`-owned
  instance), `normalize`/`splitIndent`, corpus types + registry + the five populated
  data files, the exact→template→builtin-listing matcher, `statusTranslate` (signed
  score), the capped `missLog` with `window.loquorMisses()`, the prefixed
  `fallbackCache`, the literal `xlPrompt`, the `useOutputTranslation` overlay (backlog
  rule, epoch-guarded queue abandonment, transient-failure retry budget), UI wiring +
  shimmer CSS, the z-string decoder + anchored extraction tooling, the seeded
  walkthrough capture + committed fixture, and the three strict gates — all green.
- **Not yet implemented (neutral, expected):** Task 18 step 2 (manual browser smoke) is
  consciously deferred to UAT (no-browser environment), recorded in the spec's
  execution notes. DE/ES corpora, Zork II/III, app-chrome i18n, and self-hosting the
  model weights remain out of scope per §8 — correctly absent.
- **Deviations:** The four UAT-driven refinements beyond the literal spec — (a) the
  transient-failure retry budget, (b) the `' >'` residue strip, (c) the
  `untranslatable()` `'>'` guard + cache purge, (d) the `classify()` edit — all still
  hold and are now documented in-code and covered by tests. Only (d) contradicts a
  written spec statement ("reducer untouched"); it is the [S-doc] Suggestion above.

## Review Metadata

- **Agents dispatched:** Logic & Correctness, Error Handling & Edge Cases, Contract &
  Integration, Concurrency & State, Security, Plan Alignment (6 specialists in
  parallel), plus orchestrator verification of the single surviving finding against the
  spec.
- **Scope:** Reviewable logic + tests (~7,400 lines of diff): `src/translate/*.ts`
  (excluding the ~4,000 lines of corpus DATA in `zork1.fr.strings/templates/objects.ts`
  and `extraction-ignore.ts`, which are validated by the coverage/inventory/roundtrip
  gates), `src/llm/{engineGate,guardedGenerate,useNaturalLanguage,engine.webllm,
engine.fake,types}.ts`, `src/glkote-react/reduce.ts`, `src/ui/{Terminal,Scrollback}.tsx`
  - `components.css`, `scripts/lib/zstrings.mjs`, `scripts/*.mjs`, `src/test/setup.ts`,
    and the corresponding test files — changed code plus callers/callees one level deep.
- **Raw findings:** 1 (each specialist independently filtered already-fixed I1–I4 /
  S6–S9 and the prior review's accepted-latent items S2–S5, S10–S15, requiring a fresh
  concrete reproduction before re-raising; none surfaced).
- **Verified findings:** 1 (1 Suggestion — documentation consistency).
- **Filtered out:** Each specialist confirmed the seven prior fixes (I1–I4, S6–S9) are
  genuinely present in the committed code and found no regression introduced by the
  refactor. The carried-over latent items (S2 status-miss dedup, S3 gate AbortSignal
  latency, S4 retry double-fire, S5 `signedScore` finiteness, S10 `logMiss` atomicity,
  S11/S12 dev/test cleanup, S14/S15 dev-script IO) were each re-examined; none could be
  turned into a concrete user-visible failure in the current code — S4 in particular is
  closed by the synchronous `basisRef.set` guard that serializes per-id `resolve()`
  starts.
- **Security:** No findings at confidence ≥ 60. Single-user client-side app; all output
  renders through React text nodes (no `dangerouslySetInnerHTML`/`innerHTML`/`eval`);
  the player-influenced template slot `(?<raw>.+?)` and the status/`classify`/`SLOT`
  regexes are all linear (no ReDoS); prompt injection from game text into `xlPrompt`
  has no escalation path (output is escaped and re-guarded by `untranslatable()` before
  caching); `missLog`/`fallbackCache` store only game text under collision-safe keys.
  The WebLLM no-SRI third-party fetch is the pre-existing documented egress gap,
  unchanged by this branch.
- **Steering files consulted:** `CLAUDE.md` (no stale contradictions in the reviewed
  code; its stated repo state already matches this branch).
- **Plan/design docs consulted:**
  `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md`,
  `docs/superpowers/plans/2026-06-10-loquor-output-translation.md`.
