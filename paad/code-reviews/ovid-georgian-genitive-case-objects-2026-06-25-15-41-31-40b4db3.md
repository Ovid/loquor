# Agentic Code Review: ovid/georgian-genitive-case-objects

**Date:** 2026-06-25 15:41:31
**Branch:** ovid/georgian-genitive-case-objects -> main
**Commit:** 40b4db3c27919acd54d138be8d74318e551d29f0
**Scope:** committed branch diff **+ uncommitted working tree** (per reviewer's instruction), measured against merge-base `babd326`
**Files changed:** 10 | **Lines changed:** +163 / -15
**Diff size category:** Medium

## Executive Summary

This branch adds deterministic Georgian (`ka`) handling for multi-word objects in
case roles (the "stranded-modifier rejoin" in `parse.ts`), swaps `wrench` to the
genitive compound `ქანჩის გასაღები`, resolves the egg full-ablative forms, and
fixes a real cross-turn bug where the disambiguation/orphan-prompt detector stayed
"stuck on" because `viewToContext` only reset its output window on `input`-kind
echoes, never on the `nl-canonical` echoes that translated commands actually
produce. **No Critical or Important issues survived verification.** The three core
changes are correct, well-targeted, and the affected suites are green. Findings are
all Suggestions: one residual robustness gap on the single-command path of the same
window-fix, a mislabeled test that doesn't actually exercise the new loop's
multi-iteration branch, and doc/coverage hygiene. Overall confidence: high.

## Critical Issues

None found.

## Important Issues

None found.

## Suggestions

### [S1] viewToContext window-fix is unprotected on the single-command typed path

- **File:** `src/llm/translatePipeline.ts:869-872` (single-command `break`, no turn-boundary await) + `src/llm/prompt.ts:14-30` (the fix) + `src/ui/Terminal.tsx:100-102,120` (effect-lagged `viewRef`)
- **Bug:** The `nl-canonical` boundary reset relies on the prior turn's `nl-canonical` echo being present in the ViewState read at next-command time. On the `total === 1` path the drain sends then `break`s **without** awaiting the turn boundary or capturing `settled`, so the next `translate()` reads context via `getContext()` → `viewToContext(viewRef.current)`, and `viewRef.current` only updates inside a React effect that lags the bridge's synchronous `this.view`. If a second standalone command were processed before React flushed the prior echo, the boundary scan would miss it and a stale disambiguation prompt would linger — i.e. the exact bug this PR fixes could recur.
- **Impact:** Intermittent, hard-to-reproduce recurrence of "detector stuck across turns" for a fast second standalone command; worst-hit language is `ka` (no LLM net). The queue (type-ahead) path is already protected — it awaits the boundary and captures `settled` (`translatePipeline.ts:1126-1143`) — and a human typing two discrete commands gets a render/effect flush between them, so real-world frequency is low. Downgraded from Important to Suggestion on that basis.
- **Suggested fix:** Make the single-command path as robust as the queue path — either have the `total === 1` path `await` the turn boundary and capture `settled` before returning (mirroring lines 1126-1143), or expose the bridge's synchronous `this.view` (currently `private`, `bridge.ts:63`) and have `getContext` read it instead of the effect-lagged `viewRef`.
- **Confidence:** Medium (70) — mechanism confirmed real; reachability on the single path is the uncertain part.
- **Found by:** Concurrency & State

### [S2] Test labeled "k=2" actually commits at k=1 — the rejoin loop's k≥2 branch has zero coverage

- **File:** `src/llm/lexicon/parse.ka.test.ts:151-159` (the `'k=2: inflate plastic…'` test)
- **Bug:** `გაბერე პლასტმასი ხელის ჰაერის ტუმბოით` tokenizes (after verb + `expandGeorgian`) to `[პლასტმას, ხელის, ჰაერის, ით, ტუმბო]`. In the rejoin loop (`parse.ts:532-548`) k=1 already resolves both halves — object `[პლასტმას]` → emit `valve`, instrument `[ხელის, ჰაერის, ტუმბო]` → pump — so the loop `break`s at k=1. The other four new rejoin tests (painting, both eggs, mis-bind guard) also commit at k=1 or skip the loop. No new test drives k≥2, despite a test name and comment claiming to "prove the loop, not just k=1."
- **Impact:** Test-quality/labeling gap only — the k≥2 path is generic and was verified correct by hand, just unexercised. Given `ka` has no LLM net, deterministic coverage is the only safety, so the headline loop deserves a real multi-iteration pin.
- **Suggested fix:** Relabel the test to reflect that it commits at k=1, AND add a genuine k≥2 fixture — an adjective+noun object whose first token is not itself a standalone noun synonym (e.g. a genitive-compound object) paired with a postposition-split instrument, so the loop must advance past k=1.
- **Confidence:** High (92)
- **Found by:** Logic & Correctness (90), Error Handling & Edge Cases

### [S3] Stale `სასხლეტ` references in three notes/docs files

- **Files:** `notes/georgian-input-work-needed.md:40-70`, `notes/georgian-composed-line-review.md:199`, `notes/georgian-genitive-case-morphology.md:43-44`
- **Bug:** These notes still frame `სასხლეტი` ("trigger") as the kept/deferred wrench word; the branch reversed that decision to the genitive compound `ქანჩის გასაღები`. `src/`, tests, and corpus are completely clean of `სასხლეტ` (verified grep, exit 1) — only the notes are stale. The branch's own `notes/uat.md` documents the reversal.
- **Impact:** Doc hygiene; could mislead a future contributor reading the deferred-decision note as still-open. No runtime/test impact.
- **Suggested fix:** Update the three notes to `ქანჩის გასაღები`, or stamp the deferred-decision sections "RESOLVED 2026-06-25" (the convention already used in `notes/uat.md`).
- **Confidence:** High (90)
- **Found by:** Contract & Integration (85), Plan Alignment (90/75)

### [S4] viewToContext change affects fr/de/es but is pinned only for the ka case

- **File:** `src/llm/prompt.test.ts:48-67` (new test)
- **Bug:** `viewToContext` takes no language parameter — `nl-canonical` is the echo kind for all translated languages, so the boundary-reset change also alters `recentOutput` bounding for fr/de/es, yet the new test pins only the ka-flavored case. Affected suites are green, but a full `make test` was not run by the agents.
- **Impact:** Under-pinned coverage of a central, all-languages + LLM-prompt-context function. The change is correct and pro-fr/de/es; risk is low.
- **Suggested fix:** Add an fr/de/es variant of the `nl-canonical`-boundary test and run the full `make test` before merge.
- **Confidence:** High (80)
- **Found by:** Plan Alignment (62)

### [S5] Rejoin "smallest-object-first" is theoretically mis-bindable; in-code comment slightly overstates safety

- **File:** `src/llm/lexicon/parse.ts:532-548`
- **Bug:** The loop commits the first (smallest) k where both halves resolve. It could mis-bind only if the whole object span fails AND a leading modifier token is also a standalone noun synonym. The `!obj` guard means objects that resolve whole skip the loop (confirmed by the passing mis-bind-guard test), and no current ka.zork1 modifier (`ხელის`, `ჰაერის`, `ჯილდოების`, `გატეხილ`, `თვლებიან`) is a standalone noun — so it is latent, not reproducible today. The comment "it can't mis-bind" is mildly overstated.
- **Impact:** None with the current lexicon; a future lexicon addition could surface it.
- **Suggested fix:** Soften the comment to state the safety depends on no modifier being a standalone noun synonym, and/or add a regression test for a constructed colliding case.
- **Confidence:** Medium (62)
- **Found by:** Logic & Correctness (60), Error Handling & Edge Cases (60)

## Plan Alignment

Plan/decision docs consulted: `docs/superpowers/specs/2026-06-24-loquor-georgian-input-design.md`, `docs/superpowers/plans/2026-06-24-loquor-georgian-input.md`, `notes/georgian-genitive-case-morphology.md`, `notes/georgian-input-work-needed.md`, `notes/uat.md`.

- **Implemented:** genitive-compound `wrench` (`ქანჩის გასაღები`) across input lexicon + output objects + composed-instrument string; the stranded-modifier rejoin (the seed doc's "approach #1", generalized to a k=1…len-1 split loop covering `-ით`/`-ში`/`-დან`, ka-gated on `core.postpositions`); egg full-ablative residue synonyms; the disambiguation-window (`nl-canonical`) fix.
- **Not yet implemented (neutral — expected):** native (Tbilisi) loop revisit (all `ka` words remain `NATIVE-REVIEW-DRAFT`); off-winning-path multi-word case-role objects (the rejoin is general enough mechanically, but only wrench/trophy-case/air-pump/both-eggs have stored synonyms + tests); the seed doc's optional per-object case-form table (branch chose the leaner general-rejoin approach only).
- **Deviations:** the `სასხლეტი`→`ქანჩის გასაღები` reversal is deliberate and documented in `notes/uat.md`, but the three notes in [S3] still record the old "deferred" stance and now contradict shipped code.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration; Concurrency & State; Security; Plan Alignment — then a single Verifier.
- **Scope:** changed files + adjacent — `parse.ts` (rejoin loop, `resolveNoun`, prep-split, G1 dative), `prompt.ts` (`viewToContext`) and all its callers (`Terminal.tsx`, `useNaturalLanguage.ts`, `translatePipeline.ts`), `reduce.ts`/`types.ts`/`bridge.ts` (line-kind + nl-canonical contract), `ka.zork1.ts`, `ka.core.ts`, the two `zork1.ka.*` corpus files, and the four affected test files.
- **Raw findings:** 6 distinct (after specialist-level dedup) — A–F.
- **Verified findings:** 5 kept (all Suggestions).
- **Filtered out:** 1 — Finding D (wrench has no bare synonym vs fr/de/es) rejected as a **justified, in-code-documented decision**, not a defect: the bare `გასაღებ` is the skeleton key (`ka.zork1.ts:174`), so the genitive compound with no bare synonym is the correct Georgian morphology and avoids a real collision. Security specialist returned no findings (S12 prompt-injection mitigation verified intact — `recentOutput` is structurally available to `buildPrompt` but never read by it, and the change only narrows the window). Concurrency Findings 2 & 3 (in-turn truncation; autosave/resume) verified as explicit non-issues.
- **Steering files consulted:** `CLAUDE.md` (no contradictions with shipped code found; the deterministic-`ka`-coverage and keep-`ka`-out-of-LLM-input rules are respected).
- **Plan/design docs consulted:** listed under Plan Alignment above.
