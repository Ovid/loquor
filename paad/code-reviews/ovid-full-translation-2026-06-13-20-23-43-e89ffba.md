# Agentic Code Review: ovid/full-translation

**Date:** 2026-06-13 20:23:43
**Branch:** ovid/full-translation -> main
**Commit:** e89ffba6ee73c6682b7c3f717855d386120377f8
**Files changed:** 66 | **Lines changed:** +11802 / -95
**Diff size category:** Large

## Executive Summary

This branch implements **output translation v1 (Zork I × French)** — a display-layer
overlay (`src/translate/`) that translates English game output to French via
pre-translated tables, with a watchdog-bounded, IndexedDB-cached WebLLM fallback for
misses, arbitrated against the existing NL input layer through a new shared-engine
priority gate. The implementation is unusually careful: the concurrency core
(`EngineGate` handoff, `runGenerationGuarded` abort-settle, epoch/basis/retry
invalidation in the overlay hook) survived hard adversarial scrutiny on five lenses,
and Plan Alignment found the spec implemented in full with every §7 test gate present
and green. Security found no actionable issues (translated text and `{raw}` captures
render as escaped React text nodes; regex components are escaped; cache poisoning is
bounded to the player's own device).

The highest-severity confirmed finding is **[I1] permanent caching of an
English-unchanged LLM completion** as if it were a real translation — a quality/cache
hole, not a crash. One debatable **Important** gap [I2] (the output fallback is dormant
for read-only players until an NL command loads the model) is arguably in-spec
degradation and is flagged for a product call rather than as a defect. The remaining
findings are low-impact Suggestions (diagnostics completeness, defensive bounds, a
latent non-determinism). Overall confidence in the branch is **high**.

## Critical Issues

None found.

## Important Issues

### [I1] English-unchanged LLM completion is settled and cached as a permanent non-translation

- **File:** `src/translate/useOutputTranslation.ts:301` (the `untranslatable(out)` guard) and `:309` (`cacheSet`)
- **Bug:** The post-generation guard is only `if (untranslatable(out))`, and `untranslatable()` (`src/translate/normalize.ts:20-22`) returns true _only_ for `''` and `'>'`. When the local model returns the **English line unchanged** (common for short lines, proper nouns, or a model that effectively "refuses" to translate) or echoes the prompt, `out` is non-empty and non-`'>'`, so it is `settle()`'d as a real translation **and** written to the IndexedDB fallback cache under the clean EN key.
- **Impact:** Per spec §6 a miss "costs one generation per device, ever," so an English-unchanged result becomes a **permanent** cached non-translation that the activation-time `'>'`-purge cannot evict. The line is silently stuck in English while being treated as successfully translated (the retry budget is cleared because caching is treated as success). The guard's own comment claims it stops a hallucination from "poison[ing] the cache under the real EN key" — but it only does so for the two chrome strings, leaving the much more likely English-echo case to poison silently. No test exercises an English-unchanged completion.
- **Suggested fix:** Treat `out === normalize(core)` as a transient miss alongside the chrome case — e.g. `if (untranslatable(out) || out === normalize(core)) throw new ExpectedXlateStop(...)`. At minimum, never `cacheSet` when `out` equals the normalized English input.
- **Confidence:** High
- **Found by:** Error Handling & Edge Cases (verified CONFIRMED)

### [I2] Output-translation LLM fallback is dormant for read-only players until an NL command loads the model

- **File:** `src/translate/useOutputTranslation.ts:250-259` (the `if (!engine.isLoaded()) throw new ExpectedXlateStop('engine not loaded')`), interacting with `src/llm/useNaturalLanguage.ts:218-238` (restore auto-enable) and the lazy-load that lives only in `generateRaw` (`useNaturalLanguage.ts:394-427`)
- **Bug:** The output hook never triggers a model load itself — on `!engine.isLoaded()` it degrades to English, and its one-shot retry is gated on `engine.isLoaded()` (scan at `~:358-359`), so the retry also never fires while the engine is absent. Only the **input** path lazy-loads the model. The auto-restore path sets the language to `on` from a _cached-on-disk_ model without loading it into memory. Net: a player who enables a non-English language purely to **read** the game (never typing an NL command) gets matcher + cache hits only, with the LLM fallback indefinitely dormant.
- **Impact:** Uncovered live lines stay English for read-only players, silently, with no visible reason. Two specialists reported this (Logic as "deferred retry stalls if no view change drives the re-scan"; Contract as "dormant fallback") — deduped into this one finding.
- **Suggested fix:** Decide whether read-only NL use is a supported flow. If yes, have the output hook initiate a load itself (at `output` gate priority), or have the NL hook kick a background load whenever `phase==='on' && !isLoaded()`. If no, document the degradation explicitly at the `engine.isLoaded()` check and confirm spec §6's degradation note is intended to cover it.
- **Confidence:** Medium (verified PARTIAL — real gap, but arguably in-spec degradation; treat as a product decision, not a correctness defect)
- **Found by:** Logic & Correctness + Contract & Integration (deduped)

## Suggestions

- **[S1]** `src/translate/useOutputTranslation.ts:~197-218` (`failEnglish`) — a first-occurrence genuine engine fault (e.g. WebGPU device-lost) that rejects _before_ the watchdog is logged as a transient `console.warn`, indistinguishable from a benign timeout; `onOrphanError`'s "surface a real fault distinctly" only covers the watchdog-won branch. Control flow is correct; only diagnosability is lost. (Error Handling — CONFIRMED, diagnostics-only.)
- **[S2]** `src/llm/guardedGenerate.ts:85-87` — the `finally { await gen.catch(...) }` runs inside `EngineGate.run`, so if a generation never settles after `ac.abort()` (worker wedge / device-lost) the shared gate is held for the session, wedging both input and output. The well-behaved abort case is correct and tested; consider bounding the orphan-settle await with a timer and treating a timeout as a dead engine. (Concurrency — CONFIRMED; requires a misbehaving engine.)
- **[S3]** `src/translate/statusTranslate.ts:14,22-25` — `signedScore` folds any `n >= 0x8000` with no upper bound and the `(-?\d+)` regex is arbitrary-width, so a ≥6-digit value would be reinterpreted into a fabricated number rather than treated as a miss. Unreachable today (the VM reads the score via `getUint16`, bounding it to 0–65535), so this is a cheap defensive bound only. (Error Handling — PARTIAL.)
- **[S4]** `src/translate/statusTranslate.ts:43,48` — `miss = miss ?? status.right` lets a room-name miss suppress reporting an unparseable right-side miss on the same turn; combined with `lastStatusMissRef` dedup the right-side corpus gap is never logged. Report both misses independently. Diagnostics-only. (Logic — CONFIRMED.)
- **[S5]** `src/translate/missLog.ts:20-29` — `readMisses` guards `Array.isArray` but casts `parsed as MissEntry[]` with no element validation; a well-formed-but-foreign array degrades type safety and can break the dedup `.some()` silently. Validate elements minimally so a corrupt blob degrades to `[]` and self-heals. Dev-only diagnostic buffer. (Error Handling — CONFIRMED.)
- **[S6]** `src/translate/match.ts:39` — `names.sort((a,b) => b.length - a.length)` leaves equal-length overlapping object names in insertion order, a latent non-determinism as corpora grow. Make the sort total: `|| a.localeCompare(b)`. No current collision. (Logic — CONFIRMED.)

## Plan Alignment

Design/plan docs consulted: `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md`,
`docs/superpowers/plans/2026-06-10-loquor-output-translation.md`.

- **Implemented:** Display-overlay architecture (§3); matcher with exact→template→null,
  specificity ordering, `{obj}`-before-`{raw}`, every-slot-must-resolve, built-in
  listing template, open-form-keys contract, signed `{num}` (§4/§5); corpus + extraction
  tooling (`scripts/lib/zstrings.mjs`, `extract-strings.mjs`, `capture-walkthrough.mjs`
  with seeded RNG); status-bar translation with signed-score reinterpretation (§5); LLM
  fallback + IndexedDB cache + miss log + `EngineGate` input-preempts-output + grammar-free
  `generate(…, null)` path (§6); all §7 test gates present and passing (coverage/golden-path,
  inventory, lexicon round-trip, open-form-keys, status + miss-log).
- **Not yet implemented (explicitly §8 out of scope — not gaps):** German & Spanish corpora,
  Zork II/III corpora, app-chrome i18n, echo-hiding polish toggle, self-hosting model weights,
  manual browser smoke (consciously deferred to UAT per the spec's Execution notes).
- **Deviations:** None that contradict the spec. The implementation diverges from the plan's
  literal code only by being _more_ robust (shared `runGenerationGuarded`, `splitPromptResidue`,
  the `untranslatable()` output guard, the one-shot retry budget, `cacheDelete` hygiene) — all
  documented as review-driven and consistent with spec intent. The backlog-line append-merge
  behaviour (cache-only, no generation) was challenged during review but is **intentional**:
  it matches spec §3's backlog rule and is pinned by a test
  (`src/translate/useOutputTranslation.test.tsx:560-592`).

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration; Concurrency & State; Security; Plan Alignment; plus a single skeptical Verifier.
- **Scope:** Changed production code (`src/translate/*`, `src/llm/{engineGate,guardedGenerate,engine.fake,engine.webllm,types,useNaturalLanguage}.ts`, `src/glkote-react/reduce.ts`, `src/ui/{Scrollback,Terminal}.tsx`) plus one-level-deep adjacents (`src/storage/idb.ts`, `src/llm/lexicon/index.ts`, `src/llm/grammar/index.ts`) and the corresponding test files and design spec.
- **Raw findings:** 9 distinct candidates (after merging duplicates across specialists)
- **Verified findings:** 8 (1 Important confirmed, 1 Important partial/debatable, 6 Suggestions)
- **Filtered out:** 1 (F2 backlog append-merge — rejected: contradicts spec §3 and a pinned test). Security produced 0 actionable findings; Plan Alignment 0 deviations.
- **Steering files consulted:** `CLAUDE.md` (no contradictions found; output translation is correctly described as built-and-under-refinement on feature branches)
- **Plan/design docs consulted:** output-translation design v1 + its implementation plan (both listed above)
