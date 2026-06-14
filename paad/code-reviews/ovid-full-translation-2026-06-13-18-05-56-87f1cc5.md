# Agentic Code Review: ovid/full-translation

**Date:** 2026-06-13 18:05:56
**Branch:** ovid/full-translation -> main
**Commit:** 87f1cc54f29cc9191f469e0cf0bb472ce7dc2b7e
**Files changed:** 61 | **Lines changed:** +11133 / -104
**Diff size category:** Large

## Executive Summary

This branch lands output-translation v1 (Zork I × French): a display-layer overlay
with a pre-translated corpus plus an LLM fallback behind the shared engine gate,
together with the supporting z-string extraction tooling and strict coverage gates.
The work is **unusually careful** — the async fallback/retry/epoch machinery is
well-guarded, the gate's mutual-exclusion invariant holds under scrutiny, and the
tests genuinely pin behavior (error paths spy-and-assert; coverage/inventory/
roundtrip gates are live and green). **No Critical issues were confirmed.** The
review surfaced one genuine user-facing correctness gap (the model's _output_ is
not run through the `untranslatable()` guard, so a hallucinated `>`/chrome
completion can render as phantom game text and poison the cache) and three
contract/duplication issues worth fixing before this pattern is copied to more
languages. Eight specialists ran; 23 raw findings reduced to **15 verified** (1
Important-cluster confirmed by two specialists each), with 2 findings rejected
after reading the actual code.

## Critical Issues

None found.

## Important Issues

### [I1] LLM translation output is never run through `untranslatable()` — phantom output + cache poison

- **File:** `src/translate/useOutputTranslation.ts:287-290` (the resolve path: `const out = normalize(text); if (out === '') throw …; settle(id, en, out)`)
- **Bug:** The only guard on the model's completion is the empty-string check. A completion that normalizes to bare `>` (or other prompt chrome) is non-empty, so it `settle()`s, renders as translated game output, **and** is cached under the real `en` key. The activation-time `cacheDelete(signature, lang, '>')` keys on `'>'`, not on the real key, so it cannot evict this poisoned entry.
- **Impact:** Re-introduces exactly the phantom-output class the rest of the code works hard to prevent (the input side already guards with `untranslatable(en)`; the activation purge exists specifically for this). One hallucinated chrome completion shows fake game text and persists it in IndexedDB.
- **Suggested fix:** After `const out = normalize(text)`, treat `untranslatable(out)` (and arguably `out === en`) the same as empty → throw the expected-stop, and guard `cacheSet` with the same check. Add a regression test where the engine returns `">"` for a non-`>` input (see [S11a]).
- **Confidence:** Medium-High
- **Found by:** Error Handling & Edge Cases (translate)

### [I2] Duplicated gate/watchdog "await gen.catch() before release" logic across the two hooks; the swallow also masks a genuine engine fault

- **File:** `src/llm/useNaturalLanguage.ts:421-442` (generateRaw `finally`) and `src/translate/useOutputTranslation.ts:275-285` (gate body `finally`)
- **Bug:** ~20 lines of subtle abort/watchdog/`await gen?.catch(()=>{})` logic — the invariant that the shared non-reentrant engine's gate must not be released until an aborted generation settles — are copy-pasted between the two hooks (the comments even cross-reference each other: _"Mirrors useOutputTranslation's gate body (review I2)"_). They already differ subtly (the NL copy also wraps `engine.load()` and deliberately does **not** await the orphaned load). A future fix applied to one copy and not the other reintroduces the overlapping-generation race both comments describe. Secondarily, when the watchdog wins the race, `await gen.catch(()=>{})` swallows a _genuine_ `gen` rejection (engine crash / WebGPU device lost) so a hard-dead engine is misclassified as a transient watchdog timeout and earns the one-shot retry instead of surfacing as `console.error`.
- **Impact:** High-divergence-risk duplication on the single most concurrency-sensitive seam in the app; plus a dead engine is logged as a transient timeout.
- **Suggested fix:** Extract a shared `runGenerationGuarded(engine, gate, priority, messages, grammar, watchdogMs, acsSet)` helper in `src/llm/`; keep the NL-specific load-watchdog wrapper outside it. When the watchdog wins, inspect the eventual `gen` rejection and propagate/log a non-abort error distinctly.
- **Confidence:** Medium-High
- **Found by:** Contract & Integration **and** Error Handling & Edge Cases (two specialists)

### [I3] `inventory.test.ts` room-title predicate no longer mirrors the changed `classify()`

- **File:** `src/translate/corpus/inventory.test.ts:23` (`roomTitle = /^[A-Z][^.!?]{2,40}$/`), and the duplicate at `scripts/lib/zstrings.test.mjs:46`; against `src/glkote-react/reduce.ts:130-136`
- **Bug:** `classify()` gained two exclusions in this same diff — leading-whitespace → `output` and trailing-`:` → `output` — but the test's `roomTitle` predicate (whose comment claims it _"mirrors the reducer's classify()"_) was not updated. The documented mirror invariant drifted within the same commit: the gate now treats some indented/colon-terminated capitalized lines as room titles that the reducer classifies as `output`, so the coverage gate can require corpus coverage for lines the reducer never emits as rooms (or skip ones it does).
- **Impact:** Weakens the coverage gate's fidelity to runtime behavior — the gate no longer reflects what the reducer actually emits.
- **Suggested fix:** Factor the classify shape into a shared predicate, or update both test predicates to mirror the new exclusions; at minimum add a test pinning `classify()` against these predicates.
- **Confidence:** Medium-High
- **Found by:** Contract & Integration (related to [S2])

### [I4] LLM-fallback path translates the glued `' >'` input-prompt residue; matcher strips it

- **File:** `src/translate/useOutputTranslation.ts:272` (`xlPrompt(en, lang)` with full `en`) vs `src/translate/match.ts:90-93` (strips/re-appends trailing `' >'`)
- **Bug:** `matchLine` treats a trailing `' >'` as chrome (strips before lookup, re-appends after), but when it still misses, the fallback sends the **whole** `en` — residue included — to the LLM. The model translates the `>` marker as prose, and the result is cached under a residue-bearing key that will never match the same line if it later arrives clean.
- **Impact:** Inconsistent with the deliberate residue policy; produces a slightly-wrong cached translation. Narrow — only the CR-less Y/N-style prompts hit this — so borderline Important/Suggestion.
- **Suggested fix:** In the resolve path, split the residue the same way `match.ts` does (translate `en.slice(0,-2)` when `en.endsWith(' >')`, cache under the clean key, re-append `' >'`). Share a helper so the two paths can't drift.
- **Confidence:** Medium
- **Found by:** Error Handling & Edge Cases (translate); corroborated by Plan Alignment

## Suggestions

- **[S1]** `reduce.ts:131-133` — `classify()`'s indent check runs on raw `text` while the colon check runs on trimmed `t`; behavior is defined but the two-string split is fragile, and the change was validated against a single walkthrough fixture/seed. Broaden classifier test coverage. _(Error Handling B)_
- **[S2]** `src/translate/useOutputTranslation.ts:341-347` / `statusTranslate.ts:43-48` — status miss-dedup collapses location-miss and right-miss into one `lastStatusMissRef`; interleaving rooms can re-log or permanently shadow a right-side miss. Track two refs. Affects miss-log completeness for corpus authoring only. _(Logic A)_
- **[S3]** `src/llm/engineGate.ts:16-30` — `run()` takes no AbortSignal, so an abandoned queued task still acquires-then-bails serially (added latency under rapid language toggling; not a deadlock). Thread an optional signal and splice the waiter out on abort. _(Concurrency)_
- **[S4]** `src/translate/useOutputTranslation.ts` (`failEnglish` + scan re-entry guard) — after a transient failure `failEnglish` deletes the basis; two renders flushing in the same microtask before the first `resolve`'s `await cacheGet` settles could both re-fire `resolve()` for one line (double generate / miscounted retry budget). Narrow window; gate the retry re-fire on a per-id in-flight flag. _(Concurrency)_
- **[S5]** `src/translate/statusTranslate.ts:22-25` — `signedScore` does `Number(raw)` with no `Number.isFinite` guard. The `RIGHT` regex constrains the capture to `-?\d+` so it can't `NaN`, and Zork's score is bounded, so this is latent-only hardening. _(Error Handling A; Logic A judged safe — resolved as latent)_
- **[S6]** `src/translate/fallbackCache.ts` (`cacheGet`) — two call sites use two idioms for "read failure = miss" (live: try/catch→undefined; backlog: `.then(...).catch(()=>{})`). Fold the miss-on-read-error into `cacheGet` itself so a future caller can't let an IDB rejection reach the outer catch (which trips the pristine-output guard and skips fallback). _(Contract)_
- **[S7]** `scripts/lib/zstrings.mjs:209` (`displayLines`) reimplements `src/translate/normalize.ts:6`'s identity-defining whitespace-collapse+trim across the `.mjs`/`.ts` boundary; byte-identical today, but the inventory gate's fidelity depends on them staying equal. Document the shared regex as "must equal normalize()" or add an equivalence test. _(Contract)_
- **[S8]** `src/llm/useNaturalLanguage.ts:382` — `generateRaw` types `grammar: string` while the shared `LlmEngine.generate` contract widened to `string | null`. No live bug (NL always passes a real grammar); widen for symmetry or document the narrowing. _(Contract)_
- **[S9]** `src/translate/match.ts` / corpus compile — a template repeating a slot (two `{obj}`, two `{raw}`) compiles duplicate named groups → `new RegExp` throws an opaque _"Duplicate capture group name"_ at corpus-load. The "at most once" rule is documented (`types.ts`) but unenforced. Detect a repeated slot in `compile` and throw a named contract error. _(Logic A)_
- **[S10]** `src/translate/missLog.ts:31-55` — `logMiss` does a non-atomic read-modify-write of `localStorage`; all current callers log synchronously within a scan so no live loss, but it will drop entries the moment any caller goes async. Latent. _(Concurrency)_
- **[S11]** `src/translate/missLog.ts:58-62` + `useOutputTranslation.ts:124-126` — `installMissDump` reassigns `window.loquorMisses` on every mount with no unmount cleanup (dangling closure). Trivial dev affordance. _(Error Handling A)_
- **[S12]** `src/llm/engine.fake.ts:64-68` — the `generateDelayMs` branch's abort listener is never removed in a `finally`, unlike the real engine's cleanup it claims to mirror. Test-only blast radius. _(Error Handling B)_
- **[S13]** `scripts/lib/zstrings.test.mjs:40-43` — test named _"returns null on garbage"_ asserts `.not.toBeNull()` (garbage with the end-bit set is _accepted_). The assertion is intentional (inline comment explains), but the name is misleading. Rename/split. _(Error Handling B)_
- **[S14]** `scripts/capture-walkthrough.mjs:218-224` — win assertion is `JSON.stringify(updates).includes('Inside the Barrow')`, a substring over style-run-split JSON that could `exit(1)` on a real win or pass on a stray occurrence. Assert on decoded display text instead. Fixture-generation script only. _(Error Handling B)_
- **[S15]** `scripts/extract-strings.mjs` / `capture-walkthrough.mjs` — file IO (`readFileSync`/`mkdirSync`/`writeFileSync`) is unguarded; a missing `public/games/zork1.z3` (realistic first-run) throws a raw ENOENT instead of an actionable message. Dev scripts. _(Error Handling B)_
- **[S16] Test gaps:** (a) no test where the engine _returns_ chrome/`>` for a non-`>` input — the live path behind **[I1]**; (b) no real-engine test of the abort→`interruptGenerate` contract; (c) the retry-concurrency tests serialize what production races (**[S4]**). Write (a) alongside the [I1] fix. _(Error Handling A/B, Concurrency)_

## Rejected Findings (verified against code, not real)

- **Abort-before-`generate()`-listener orphans the WebGPU run** — REJECTED. In both hooks the `AbortController` is created locally and `engine.generate()` is called with no intervening `await`; `generate`'s `addEventListener('abort', …)` runs synchronously before its first await, and the only aborters (unmount teardown, watchdog) fire _after_ generate is invoked. No reachable already-aborted window. _(raised by Error Handling B, conf 80; refuted by the Verifier on code ordering)_
- **`engine.interruptGenerate()` should use `?.`** — REJECTED. `interruptGenerate` is a _required_ member of `MLCEngineInterface` (`@mlc-ai/web-llm` `types.d.ts`), not an optional method; the abort handler cannot throw "undefined is not a function". _(raised by Error Handling B, conf 62)_

## Plan Alignment

Governing docs: `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md` and
`docs/superpowers/plans/2026-06-10-loquor-output-translation.md`.

- **Implemented:** Every task in the plan (Tasks 1–17) is reflected in the diff —
  grammar-free engine path, `EngineGate` priority mutex, `normalize`/`splitIndent`,
  corpus types + registry + all five populated data files, the exact→template→
  builtin-listing matcher, `statusTranslate`, capped `missLog` with `window.loquorMisses()`,
  prefixed `fallbackCache`, literal-translation `xlPrompt`, the `useOutputTranslation`
  overlay with backlog rule and epoch-based queue abandonment, UI wiring + shimmer CSS,
  the v3 z-string decoder + anchored extraction tooling, the seeded walkthrough capture +
  committed fixture, the authored corpora, and the three strict gates (coverage/inventory/
  roundtrip), all green.
- **Not yet implemented (neutral, expected):** Task 18 step 2 (manual browser smoke) is
  consciously deferred to UAT per the spec's own note (no-browser environment). DE/ES
  corpora and Zork II/III remain out of scope (spec §8) — correctly absent.
- **Deviations (documented UAT-driven refinements, not contradictions of locked decisions):**
  (1) the transient-failure **retry budget** (`failEnglish`/`retryRef`) is a behavioral
  superset of the spec's literal "English on failure" one-way fall; (2) the matcher's
  **`' >'` residue strip** (`match.ts`) is matcher behavior beyond §5; (3) the
  **`untranslatable()` `'>'` guard + cache purge** is not in the design; (4) the
  **`reduce.ts classify()` change** edits the reducer, which spec §3 stated was "untouched."
  Each is well-tested and documented in-code; (4) is the only one that contradicts a literal
  spec claim, and it underlies **[I3]/[S1]**.

## Review Metadata

- **Agents dispatched:** Logic & Correctness ×2 (translate / llm+ui+scripts), Error Handling & Edge Cases ×2 (translate / llm+ui+scripts), Contract & Integration, Concurrency & State, Security, Plan Alignment, plus a single Verifier.
- **Scope:** Reviewable logic + tests (~5,900 lines): `src/translate/*.ts` (excl. corpus data), `src/llm/*`, `src/glkote-react/reduce.ts`, `src/ui/Terminal.tsx`/`Scrollback.tsx`, `scripts/lib/zstrings.mjs`, `scripts/*.mjs`, `src/test/setup.ts` — changed code plus callers/callees one level deep. The ~4,000 lines of translation corpus data (`zork1.fr.strings/templates/objects.ts`, `extraction-ignore.ts`) were excluded from logic review as data validated by the coverage/inventory/roundtrip gates.
- **Raw findings:** 23 (before verification)
- **Verified findings:** 15 (4 Important, 11 Suggestions; [I2]/[I3] each confirmed by two specialists)
- **Filtered out:** 8 (2 explicitly rejected on code reading; 6 low-confidence/duplicate notes folded or dropped)
- **Security:** No genuine, exploitable findings at confidence ≥ 60. Single-user client-side app: no `dangerouslySetInnerHTML`/`innerHTML` sinks (all output renders through React text nodes); WebLLM no-SRI third-party fetch is the pre-existing documented gap, unchanged by this branch; prompt-injection from game text into `xlPrompt` has no escalation path; the matcher's only player-influenced regex (`(?<raw>.+?)`) is linear (no ReDoS).
- **Steering files consulted:** `CLAUDE.md` (no stale contradictions found beyond the documented spec deviations above)
- **Plan/design docs consulted:** `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md`, `docs/superpowers/plans/2026-06-10-loquor-output-translation.md`
