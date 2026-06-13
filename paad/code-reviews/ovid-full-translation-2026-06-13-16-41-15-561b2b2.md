# Agentic Code Review: ovid/full-translation

**Date:** 2026-06-13 16:41:15
**Branch:** ovid/full-translation -> main
**Commit:** 561b2b2c75deb0feba66adb54881ffe6f213438e
**Files changed:** 59 | **Lines changed:** +10953 / -103
**Diff size category:** Large

## Executive Summary

The output-translation v1 feature (Zork I × French) is a well-engineered, heavily
tested layer. The bulk of the diff (~4.4k lines) is translation-data corpus; the
logic surface (`src/translate/`, `src/llm/`, the reducer/UI touchpoints) is
disciplined, and the previously-fixed engine-gate/unmount/retry bugs are closed and
covered by tests. **No Critical issues were found, and the Security review came back
fully clean** (no XSS, no ReDoS, no prompt-injection-to-DOM, no new network egress).
The highest-value findings are **F6** (a fake-vs-real engine contract gap on the new
grammar-free path that could let a test mask a real empty-output bug) and **F1** (a
miss that occurs while the model is loaded-on-disk-but-not-in-memory is pinned to
English permanently, unlike its self-healing sibling path). Two raw findings were
dropped on verification: in-flight-generation-not-aborted-on-switch matches the
spec's definition of "abandon," and the signed-score heuristic is unreachable for any
actual or planned game.

## Critical Issues

None found.

## Important Issues

### [I1] Live miss while model is loaded-on-disk-but-not-in-memory is pinned to English permanently

- **File:** `src/translate/useOutputTranslation.ts:238-242` (the `resolve()` `!engine.isLoaded()` early return)
- **Bug:** The not-loaded path calls `settle(id, en, 'english')` directly and **does not free `basisRef`**. Because `basisRef` was set to `en` before `resolve` ran, the next render's scan guard (`if (basisRef.current.get(l.id) === en) continue`, ~line 323) skips the line forever. Loading the model into memory (the input hook's lazy load) does not bump the epoch or clear the basis, so nothing re-drives the line.
- **Impact:** On a fresh page load where the model is cached on disk but not yet in memory (French auto-restored to `on`, but `engine.isLoaded()` is false until the player's first command lazy-loads it), every live miss in that window settles to English and **stays English permanently**, even after the engine becomes available. The sibling queued-while-unloaded path routes through `failEnglish → retry` and self-heals; this path does not. Narrow trigger, but a real "stuck in the wrong language" degradation.
- **Suggested fix:** Route the not-loaded case through `failEnglish(id, en, new ExpectedXlateStop('engine not loaded'))` instead of `settle(..., 'english')`, so it records a retry and frees the basis. The existing `retryRef` gate (`engine.isLoaded()` check before re-attempt) already defers the retry until the engine reports loaded again.
- **Confidence:** Medium (75)
- **Found by:** Logic & Correctness (verified line-by-line)

### [I2] FakeLlmEngine returns `ABSTAIN` where the real engine returns `''` on the grammar-free output path

- **File:** `src/llm/engine.fake.ts:72` (vs `src/llm/engine.webllm.ts:~92` and consumer `src/translate/useOutputTranslation.ts:~282`)
- **Bug:** `FakeLlmEngine.generate` ignores `grammar` and returns `opts.completions?.[key] ?? opts.default ?? ABSTAIN`. The real `WebLlmEngine` returns `''` on the `grammar === null` (output-translation) path when content is missing. `useOutputTranslation` treats `out === ''` as the empty-translation signal (`throw new ExpectedXlateStop('empty translation')`). So a fake with no scripted completion yields `ABSTAIN` (a non-empty sentinel) where production yields `''` → the fake would render/cache `ABSTAIN` as a real translation instead of falling back to English.
- **Impact:** Test-fidelity gap on the _exact new path this feature adds_. A test exercising the output fallback through the fake gets different empty-handling than production, which could mask a real empty-output bug or hide the English fallback.
- **Suggested fix:** Have `FakeLlmEngine.generate` mirror the contract — return `''` when `grammar === null` and no completion matched — and document the "grammar === null ⇒ returns '' on empty" contract in `src/llm/types.ts`.
- **Confidence:** Medium (75)
- **Found by:** Contract & Integration (verified against both engine impls + consumer)

### [I3] Input lazy-load releases the engine gate before the un-abortable `engine.load()` settles

- **File:** `src/llm/useNaturalLanguage.ts:421-430` (`generateRaw` finally), interacting with the load watchdog at ~389-410
- **Bug:** The gate body holds the gate until the orphaned _generate_ settles via `await gen?.catch(() => {})`. But when the **load** watchdog (`LOAD_WATCHDOG_MS`) fires, `generate` was never called, so `gen` is `undefined` and the `await` is a no-op — the gate releases immediately while `engine.load()` (`CreateMLCEngine`, **not abortable mid-flight**, see `engine.webllm.ts`) is still running and mutating `this.engine`. The next gate waiter can then call `engine.generate()` against a half-initialized engine — the exact overlap the gate exists to prevent. The output path avoids this by never lazy-loading inside its gate (it degrades to English when `!isLoaded()`); the input path lacks the symmetric protection.
- **Impact:** Real concurrency hazard on the shared non-reentrant engine, but narrow — only when the 60s load watchdog fires (a degenerate slow-device/stalled-download case).
- **Suggested fix:** Track the load promise and await its settlement in the `finally` too, e.g. `finally { await loadP?.catch(() => {}); await gen?.catch(() => {}) }`.
- **Confidence:** Medium (72)
- **Found by:** Concurrency & State (verified against both gate bodies)

## Suggestions

- **[S1] Right-side status miss silently dropped when the room name also misses.** `src/translate/statusTranslate.ts:43-48` — `miss = miss ?? status.right` keeps the location miss, so an unparseable score/turns line co-occurring with an unknown room is never logged; `missLog` dedupes by `en`, so the gap can go unrecorded all session. Both sides still fall back to English on screen (no gameplay impact) — purely a corpus-improvement-loop gap. Return/log both misses. _(Confirmed by Logic + Error-Handling; confidence 78.)_
- **[S2] Reducer modified despite design's "reducer untouched" invariant.** `src/glkote-react/reduce.ts:~130-135` — `classify()` now excludes indented and colon-terminated lines from `'room'` classification (a justified, tested UAT-4 fix), but design §3 states the reducer/`ViewState` are "untouched" and the overlay "sits strictly between ViewState and components." Code is sound; the **design doc and `CLAUDE.md` text are now stale** and should record the change. _(Confidence 88 — strongest-confidence finding, but doc drift, not a defect.)_
- **[S3] Duplicated watchdog/abort/"hold-gate-until-aborted-gen-settles" protocol.** `src/llm/useNaturalLanguage.ts:~385-431` and `src/translate/useOutputTranslation.ts:~243-280` independently implement the same safety-critical mutual-exclusion invariant (incl. the load-bearing reject-watchdog-then-abort ordering), with comments cross-referencing each other. Presently consistent, but divergence risk on future edits. Consider extracting a shared `runGuardedGeneration(...)` helper in `src/llm/`. _(Confidence 70.)_
- **[S4] `window.loquorMisses` dev global never removed on unmount.** `src/translate/useOutputTranslation.ts:124-126` + `src/translate/missLog.ts:58-62` — `installMissDump` assigns the global with no teardown cleanup. Idempotent and dev-only; harmless but inconsistent with the otherwise-meticulous teardown. _(Confidence 70.)_
- **[S5] `basisRef`/`retryRef` grow unbounded across a long single-language session.** `src/translate/useOutputTranslation.ts:~95,106,329` — keyed by line id, cleared only on corpus re-activation; ids that scroll out of `view.lines` without resolving (esp. terminal second-failure lines whose basis is deliberately kept) are never pruned. Slow, transcript-bounded growth; practical impact tiny (one short string + small object per _miss_ line). Prune entries for ids no longer in `view.lines`, or cap the maps. _(Confidence 65.)_

## Plan Alignment

Plan/design docs consulted: `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md` and `docs/superpowers/plans/2026-06-10-loquor-output-translation.md`.

- **Implemented:** Grammar-free engine path (`generate(prompt, grammar: string|null, …)`), `EngineGate` with input-preempts-output, normalization + indent split, corpus types + `(signature, language)` registry, the matcher (exact → specificity-ordered templates, `{obj}` before `{raw}`, every-slot-must-resolve, signed `{num}`, built-in listing), status translation, miss log, fallback cache, fallback prompt, the `useOutputTranslation` hook (backlog rule, en/off passthrough, gated fallback, abandon/teardown), UI wiring + shimmer, extraction tooling (`zstrings.mjs`, `extract-strings.mjs`, seeded-RNG `capture-walkthrough.mjs`), committed walkthrough script + fixture, and the corpus data files. **All four named test gates from design §7 are real and substantive** — coverage (full walkthrough, zero golden-path misses), inventory, lexicon round-trip, and the open-form-keys contract (a fake German-cased language so French can't hard-code `{indef,def}`).
- **Not yet implemented (expected / out of scope per §8):** DE/ES corpora, Zork II/III corpora, app-chrome i18n, echo-hiding toggle, model self-hosting. Nothing from the v1 scope appears absent.
- **Deviations:** **[S2]** the reducer was modified despite design §3's "untouched" claim (justified UAT fix; design/CLAUDE.md text not updated). Additive-only (not contradictions): the coverage gate's `untranslatable()` pre-filter (excludes only `''` and the bare `>` prompt; same single-source filter as runtime, so no gate weakening) and the retry-once-on-transient-failure hardening (English remains the terminal state, consistent with §6).

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration; Concurrency & State; Security; Plan Alignment; plus a verification pass.
- **Scope:** Changed logic in `src/translate/`, `src/llm/`, `src/glkote-react/reduce.ts`, `src/ui/` (Terminal/Scrollback/components.css), and `scripts/`; adjacent callers/tests read one level deep. The ~4.4k lines of translation-data corpus (`zork1.fr.{strings,templates,objects}.ts`, `extraction-ignore.ts`, walkthrough fixture) were spot-checked for slot/key alignment, not line-reviewed.
- **Raw findings:** 10 (after specialist dedup; Security reported none)
- **Verified findings:** 8 (3 Important, 5 Suggestion)
- **Filtered out:** 2 — F3 (in-flight generation not aborted on switch/swap: matches spec §6, which defines "abandon" as discard-result and states in-flight generations are _never aborted_) and F9 (signed-score `>= 0x8000` heuristic: real but unreachable — Zork I caps 350, II caps 400, III caps 7).
- **Steering files consulted:** `CLAUDE.md` (flagged stale re: the reducer change — see S2).
- **Plan/design docs consulted:** `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md`, `docs/superpowers/plans/2026-06-10-loquor-output-translation.md`.
