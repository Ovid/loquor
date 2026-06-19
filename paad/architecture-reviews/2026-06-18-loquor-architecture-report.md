# Architecture Report — loquor

**Date:** 2026-06-18
**Commit:** 859c1cf2921790ff35869f72b652618e9be72d9b
**Languages:** TypeScript, React, Vite (fully client-side SPA)
**Key directories:** `src/ui/`, `src/llm/` (+ `grammar/`, `lexicon/`, `scene/`), `src/translate/` (+ `corpus/`), `src/glkote-react/`, `src/zmachine/`, `src/storage/`, `src/shared/`
**Scope:** full repo (`src/`, 197 source files — Medium)

## Repo Overview

Loquor is a fully client-side browser app for playing Zork I/II/III on top of the
`ifvms.js` Z-machine, with a custom React UI. Three layers:

1. **Engine + bridge** — `ifvms` ZVM driven through a vendored Glk, surfaced to React
   by a pure GlkOte→ViewState reducer (`glkote-react/`); IndexedDB autosave keyed by
   per-game story signature (`zmachine/`, `storage/`).
2. **NL input layer** (`llm/`) — a deterministic-first multilingual pipeline
   (EN/FR/DE/ES): per-language lexicons + grammar, with an optional WebLLM fallback.
3. **Output translation** (`translate/`) — a display-layer overlay backed by
   pre-translated corpora (fr/de/es + Georgian `ka`), gated by coverage/inventory tests.

The codebase is **mature and unusually self-documenting**. Most large files trace to
documented, intentional refactors (the `F-1`…`F-19` provenance tags in comments and
commit history) that _improved_ boundaries. This is not a typical "find the rot"
review — the structural fundamentals are strong, and most findings are minor or are
documented, conscious tradeoffs.

## Strengths

### [S-1] Clean `llm/` ↔ `translate/` layer separation

- **Category:** S1 (clear modular boundaries)
- **Impact:** High
- **Explanation:** The input (`llm/`) and output (`translate/`) layers share no runtime code — `translate/` imports only shared _types_ from `llm/`, and `llm/` never imports `translate/`. Genuinely shared engine infra was lifted into `src/shared/`.
- **Evidence:** verified zero cross-feature runtime imports; `src/shared/engineGate.ts`, `src/shared/guardedGenerate.ts`; commit `0d40774` ("F-6 move shared engine infra out of the NL feature folder").
- **Found by:** Structure & Boundaries, Coupling & Dependencies

### [S-2] Resilience engineering well beyond a typical client SPA

- **Category:** S12 (resilience patterns)
- **Impact:** High
- **Explanation:** Pervasive, correct handling of the hard async/concurrency cases — IndexedDB commit ordering, aborted/stalled model downloads, and a wedged WebGPU worker.
- **Evidence:** `src/storage/idb.ts:11-35` (`onblocked`/`onabort` reject, `finally` close); `src/storage/dialog.ts:82` serial `writeChain`; `src/llm/useModelDownload.ts` (`AbortController` + `DOWNLOAD_STALL_MS` watchdog + `loadEpoch` stale-load guards); `src/shared/guardedGenerate.ts:69` bounded `orphanSettleMs`; `src/translate/fallbackResolve.ts` one-shot retry budget.
- **Found by:** Integration & Data, Error Handling & Observability

### [S-3] The two designed seams are genuinely clean

- **Category:** S3 (loose coupling)
- **Impact:** High
- **Explanation:** The GlkOte display contract and the `LlmEngine` interface are both narrow, swappable abstractions with real alternate implementations the test suite holds to identical behavior.
- **Evidence:** `src/zmachine/engine.ts:146` (`vm_options.GlkOte = this.bridge`), `GlkOteBridge implements GlkOteDisplay`; `src/llm/types.ts:43-64` (`LlmEngine`) with `WebLlmEngine` + `FakeLlmEngine`.
- **Found by:** Coupling & Dependencies

### [S-4] One mutex governs the single non-reentrant engine

- **Category:** S5 (dependency-management hygiene) / S6 (consistent contracts)
- **Impact:** High
- **Explanation:** All access to the single shared WebLLM engine funnels through one priority mutex (input preempts output) with a documented handoff invariant; the generate-under-watchdog body is a single shared source of truth, not copy-pasted.
- **Evidence:** `src/shared/engineGate.ts:12` (`class EngineGate`); `src/shared/guardedGenerate.ts:1-10`; `src/ui/Terminal.tsx:63-66` threads one engine + one gate into both hooks.
- **Found by:** Coupling & Dependencies, Integration & Data

### [S-5] Centralized, tagged logging with a durable ring buffer

- **Category:** S8 (observability present)
- **Impact:** High
- **Explanation:** Every subsystem logs through `createLogger('<tag>')`; **zero** direct `console.*` in production code; `warn`/`error` tee into a capped ring exposed as `window.loquorLogs()`. Translation gaps get their own `window.loquorMisses()` ring.
- **Evidence:** `src/logger.ts:71-91`; `src/translate/missLog.ts` (capped localStorage ring, deduped, self-healing).
- **Found by:** Error Handling & Observability

### [S-6] Configuration discipline with a security-relevant allowlist

- **Category:** S9 (configuration discipline)
- **Impact:** High
- **Explanation:** NL tunables centralized in `config.ts`; localStorage and IndexedDB key formats each have a single registry with named owners and pinned-format tests; model ids are an **allowlist**, so a stray `?model=`/env value can never repoint the weight download at an arbitrary URL.
- **Evidence:** `src/llm/config.ts`; `src/storageKeys.ts`; `src/storage/idbKeys.ts`; `src/llm/models.ts:18-35` (`KNOWN_MODELS`).
- **Found by:** Error Handling & Observability, Security & Code Quality

### [S-7] Errors surfaced with cause distinction, not swallowed

- **Category:** S7 (robust error handling)
- **Impact:** High
- **Explanation:** Diagnostic paths log before degrading and distinguish fault classes (timeout vs engine fault; unreachable vs 404 vs 5xx vs bad-file; abort vs real download failure). Persistence failures that were previously `void`-discarded now surface via `onPersistFail` (a swallowed reject would have made a SAVE "succeed" without persisting).
- **Evidence:** `src/storage/dialog.ts:162-174` (`onPersistFail`, `uncloneablePath`); `src/ui/loadError.ts` (`describeLoadError`); `src/shared/guardedGenerate.ts:111-122` (`onOrphanError`); `src/llm/engine.webllm.ts:117-129`.
- **Found by:** Error Handling & Observability

### [S-8] Keyless, offline-first, no-injection-surface design

- **Category:** S10 (security built-in)
- **Impact:** High
- **Explanation:** No secrets in source (keyless client app). No `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`document.write` anywhere in `src/` — untrusted Z-machine and translated text reach the DOM only as React text nodes, so it cannot XSS. Fonts are self-hosted (no CDN), preserving the offline/privacy promise.
- **Evidence:** grep-clean across `src/`; `src/ui/fonts.css:2` documents self-hosting.
- **Found by:** Security & Code Quality

### [S-9] `NlState` discriminated-union state machine

- **Category:** S13 (domain modeling strength)
- **Impact:** Medium
- **Explanation:** `NlState` is a proper discriminated union (`disabled | off | downloading | on`) carrying only the fields valid in each phase, with a precise language type hierarchy derived via `Exclude`. (Correction from raw findings: the language types are union/derived, **not** nominally "branded.")
- **Evidence:** `src/llm/types.ts:84-103`.
- **Found by:** Structure & Boundaries

### [S-10] Comprehensive, deterministic colocated tests of critical paths

- **Category:** S11 (testability & coverage)
- **Impact:** Medium
- **Explanation:** Every runtime module has colocated tests; notably the hard concurrency cases (engine load races / abort-after-resolve), storage error paths, the pure reducer, and walkthrough-coverage/inventory **gating** tests that fail the suite on corpus regressions.
- **Evidence:** `src/llm/engine.webllm.test.ts` (9 tests), `src/glkote-react/reduce.test.ts` (27 tests), `src/storage/dialog.filewrite-error.test.ts`, `src/llm/lexicon/walkthrough-coverage.test.ts`.
- **Found by:** Security & Code Quality

### [S-11] Registry pattern makes "add a language" a typed one-liner

- **Category:** S14 (simple, pragmatic abstractions)
- **Impact:** Medium
- **Explanation:** Language data is exposed through `Record<LexLang, …>` registries and a single `corporaFor()` source of truth, so coverage/inventory test-gates iterate one place and TypeScript exhaustiveness catches a missing language.
- **Evidence:** `src/llm/lexicon/index.ts:18-28`; `src/translate/corpus/index.ts:31-41`.
- **Found by:** Structure & Boundaries

## Flaws/Risks

### [F-1] Non-integrity-pinned remote model + WASM executes in page origin

- **Category:** 30 (security as an afterthought)
- **Impact:** Medium
- **Explanation:** Enabling the NL layer fetches model weights from `huggingface.co` and the model-lib **WASM from `raw.githubusercontent.com`** with no SRI/integrity pin (no `appConfig` passed → WebLLM's `prebuiltAppConfig`); the WASM then executes in the page origin. A MITM/compromise of a mutable, branch-tracking host could ship code into the origin. Mitigated (not eliminated) by explicit opt-in, HTTPS, and one-time-then-cached behavior; accurately disclosed in code and CLAUDE.md.
- **Evidence:** `src/llm/engine.webllm.ts:43-60`, excerpt: "the model-lib WASM from raw.githubusercontent.com on first use (no SRI). Follow-up: pin self-hosted/integrity-checked URLs under public/."
- **Found by:** Security & Code Quality

### [F-2] Engine boundary couples to the dense parser for one sentinel

- **Category:** 3 (tight coupling)
- **Impact:** Medium
- **Explanation:** Both `LlmEngine` implementations — the swappable boundary that should be a thin contract — statically `import { ABSTAIN }` from the 633-line `inputTranslate.ts` parser (which transitively pulls in `meta`, `lexicon/fold`, `directions`, `grammar/patterns`) just to read one string literal. `ABSTAIN` belongs in `types.ts` (already the shared contract both engines import).
- **Evidence:** `src/llm/engine.webllm.ts:4` & `:95`, `src/llm/engine.fake.ts:2`, `src/llm/grammar/buildGrammar.ts:3` — `import { ABSTAIN } from './inputTranslate'`.
- **Found by:** Coupling & Dependencies

### [F-3] `createTranslate` takes a ~25-field bag of live mutable refs

- **Category:** 23 (dependency injection misuse)
- **Impact:** Medium
- **Explanation:** The factory receives ~14 `MutableRefObject`s plus setters/callbacks and mutates them as live shared state — DI used as a vehicle for co-owned mutable state rather than inverted control. The pipeline is not independently reasonable; control flow (who mutates `queueRef`/`epochRef`/`lastCommandRef`, and when) is spread across both `translatePipeline.ts` and `useNaturalLanguage.ts`. The F-1 extraction did improve unit-testability of `runClause`.
- **Evidence:** `src/llm/translatePipeline.ts:368-400` (`TranslateDeps`); call site `src/llm/useNaturalLanguage.ts:251-294`.
- **Found by:** Coupling & Dependencies

### [F-4] `ZMachine.boot()` has an unenforceable preload→prepare→init order

- **Category:** 27 (temporal coupling)
- **Impact:** Medium
- **Explanation:** `await dialog.preload(sig)` must precede `vm.prepare(...)` must precede `Glk.init(...)`, or autosave silently never resumes. The hazard is documented and guarded by a runtime assertion in `IdbDialog`, but the type system can't express it. Well-contained in one method.
- **Evidence:** `src/zmachine/engine.ts:109-158` (preload `:116-117`, prepare `:155`, init `:158`); F-5 comment at `:109-114`.
- **Found by:** Coupling & Dependencies

### [F-5] `useOutputTranslation` declares a comment-only effect-ordering invariant

- **Category:** 27 (temporal coupling)
- **Impact:** Medium
- **Explanation:** Correctness depends on the source-line order of three `useEffect`s (React runs effects in declaration order) plus a documented write-before-read dance on `epochRef`/`backlogRef`. A benign-looking reorder breaks the backlog snapshot; the invariant lives only in a comment.
- **Evidence:** `src/translate/useOutputTranslation.ts:180-188`, excerpt: "EFFECT ORDER INVARIANT — do not reorder the three effects below."
- **Found by:** Coupling & Dependencies

### [F-6] Hooks leak documented-but-hidden side effects past their return types

- **Category:** 6 (leaky abstraction) / 12 (hidden side effects)
- **Impact:** Low-Medium
- **Explanation:** Both big hooks enumerate effects (IndexedDB/localStorage writes, installing a `window.loquorMisses` global, driving the game via `sendLine`, mutating the scene tracker) that their return types don't reveal, so callers can't reason about them from the signature. Documenting rather than fixing is the pragmatic React choice, but it remains a genuine leak.
- **Evidence:** `src/translate/useOutputTranslation.ts:9-18`; `src/llm/useNaturalLanguage.ts:84-88`.
- **Found by:** Coupling & Dependencies, Error Handling & Observability

### [F-7] Single flat IndexedDB store shared by three subsystems via string prefixes

- **Category:** 17 (no clear ownership of data)
- **Impact:** Low
- **Explanation:** One `kv` object store in the `loquor` DB holds autosave snapshots, explicit SAVE/RESTORE slots, and the LLM-translation cache, separated only by key-prefix convention (`autosave:`/`file:`/`xlate:`). Ownership is documented and there is one writer per prefix, but a future "clear saves" vs "clear cache" must prefix-scan rather than drop a store. A documented tradeoff (avoids a DB version bump).
- **Evidence:** `src/storage/idbKeys.ts:22-31`; `src/storage/idb.ts`.
- **Found by:** Integration & Data

### [F-8] Model download has no retry/backoff on transient failure

- **Category:** 19 (lack of idempotency / recovery)
- **Impact:** Low
- **Explanation:** A genuine (non-abort) failure on the multi-GB fetch goes straight to grammar-only mode with a notice; there is no automatic retry/backoff for a transient network blip — the player must manually re-trigger via "✦ improve." Deliberate product choice, but a transient blip costs the upgrade.
- **Evidence:** `src/llm/useModelDownload.ts:224-241`.
- **Found by:** Integration & Data

### [F-9] `Dialog` interface mixes optional load-bearing methods and a sync/async split

- **Category:** 24 (inconsistent API contracts)
- **Impact:** Low
- **Explanation:** `preload?`, `hasSave?`, `dispose?` are optional yet load-bearing for the IndexedDB implementation; the API also splits sync (`autosave_read`, fire-and-forget `autosave_write`) from async (`*_async`, `preload`, `hasSave`). Documented and intentional (sync for ifvms), but a caller could use the fire-and-forget sync write expecting durability.
- **Evidence:** `Dialog` interface in `src/zmachine/engine.ts:28-32`; `src/storage/dialog.ts`.
- **Found by:** Integration & Data

### [F-10] `inputTranslate.ts` groups several sub-domains; stale header comment

- **Category:** 11 (low cohesion)
- **Impact:** Low
- **Explanation:** The 633-line module bundles clause splitting, verb-gapping, prep-tail distribution, meta detection, vocab passthrough, three prompt detectors + localized yes/no reply tables, in-game failure detection, and GBNF-JSON command validation. Cohesion is moderate (loosely unified as "pure deterministic input helpers") — the prompt-detection and failure-detection clusters could be their own modules. Line 1 still reads `// src/llm/translate.ts` after the file rename.
- **Evidence:** `src/llm/inputTranslate.ts:1` (stale header), multiple sub-domain functions throughout.
- **Found by:** Structure & Boundaries

### [F-11] One watchdog constant lives outside the central config

- **Category:** 22 (configuration sprawl)
- **Impact:** Low
- **Explanation:** `XLATE_WATCHDOG_MS = 15_000` is defined inline in the translate hook while its siblings (`GENERATE_WATCHDOG_MS`, `LOAD_WATCHDOG_MS`, `DOWNLOAD_STALL_MS`) live in `llm/config.ts`; `orphanSettleMs` default `30_000` is likewise inline. `config.ts` scopes itself to the NL _input_ pipeline, so it's arguably intentional — but a tuner won't find the output-translation timeout beside the others.
- **Evidence:** `src/translate/useOutputTranslation.ts:63`; `src/shared/guardedGenerate.ts:69` (path corrected from raw finding).
- **Found by:** Error Handling & Observability

### [F-12] Some language-routing policy computed inline in `Terminal.tsx`

- **Category:** 25 (business logic in the UI)
- **Impact:** Low
- **Explanation:** `outLang`/`outputOnly`/`nlInputOn` derivation and the `showBetaNotice` gate (`outLang === 'ka' && corpusFor(...) !== null`) are policy decisions computed inline in the component rather than in a tested module beside `OUTPUT_ONLY_LANGS`/`CORPUS_ONLY_LANGS`. Small and readable; the heavy lifting is correctly already in hooks. Residue, not a fat component.
- **Evidence:** `src/ui/Terminal.tsx:145-147`, `:175`.
- **Found by:** Error Handling & Observability

### [F-13] Two single-member `Set(['ka'])` constants encode the same fact in two layers

- **Category:** 9 (shotgun surgery, mild) / 4 (duplication)
- **Impact:** Low
- **Explanation:** `OUTPUT_ONLY_LANGS` and `CORPUS_ONLY_LANGS` have identical `{'ka'}` membership in different layers, with cross-referencing comments ("same membership today, different jobs") but no test linking them. A future output-only-and-corpus-only language must be added to both, and membership could silently drift. A conscious, documented decoupling.
- **Evidence:** `src/llm/types.ts:19`; `src/translate/corpus/index.ts:15`.
- **Found by:** Structure & Boundaries, Coupling & Dependencies

### [F-14] Dead scaffold assets

- **Category:** 31 (dead code / unused dependencies)
- **Impact:** Low
- **Explanation:** `src/assets/hero.png`, `react.svg`, `vite.svg` are unreferenced anywhere in `src/`, `index.html`, or CSS (the favicon is served from `public/`). The SVGs are leftover Vite-scaffold logos. Safe to delete.
- **Evidence:** `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`; grep-clean for `import`/`url(`/`src=`/`href=`.
- **Found by:** Security & Code Quality

## Coverage Checklist

### Flaw/Risk Types 1–34

| #   | Type                                   | Status                                | Finding   |
| --- | -------------------------------------- | ------------------------------------- | --------- |
| 1   | Global mutable state                   | Not observed                          | —         |
| 2   | God object                             | Not observed                          | —         |
| 3   | Tight coupling                         | Observed                              | F-2       |
| 4   | High/unstable dependencies             | Observed                              | F-13      |
| 5   | Circular dependencies                  | Not observed                          | —         |
| 6   | Leaky abstractions                     | Observed                              | F-6       |
| 7   | Over-abstraction                       | Not observed                          | —         |
| 8   | Premature optimization                 | Not observed                          | —         |
| 9   | Shotgun surgery                        | Observed                              | F-13      |
| 10  | Feature envy / anemic domain           | Not observed                          | —         |
| 11  | Low cohesion                           | Observed                              | F-10      |
| 12  | Hidden side effects                    | Observed                              | F-6       |
| 13  | Inconsistent boundaries                | Not observed                          | —         |
| 14  | Distributed monolith                   | Not applicable                        | —         |
| 15  | Chatty service calls                   | Not applicable                        | —         |
| 16  | Synchronous-only integration           | Observed (mitigated)                  | S-2 / F-4 |
| 17  | No clear ownership of data             | Observed                              | F-7       |
| 18  | Shared database across services        | Not applicable                        | —         |
| 19  | Lack of idempotency                    | Observed                              | F-8       |
| 20  | Weak error handling strategy           | Not observed                          | —         |
| 21  | No observability plan                  | Not observed                          | —         |
| 22  | Configuration sprawl                   | Observed                              | F-11      |
| 23  | Dependency injection misuse            | Observed                              | F-3       |
| 24  | Inconsistent API contracts             | Observed                              | F-9       |
| 25  | Business logic in the UI               | Observed                              | F-12      |
| 26  | Poor transactional boundaries          | Not observed (assessed, well-handled) | —         |
| 27  | Temporal coupling                      | Observed                              | F-4, F-5  |
| 28  | Magic numbers/strings everywhere       | Not observed                          | —         |
| 29  | "Utility" dumping ground               | Not observed                          | —         |
| 30  | Security as an afterthought            | Observed                              | F-1       |
| 31  | Dead code / unused dependencies        | Observed                              | F-14      |
| 32  | Missing test coverage (critical paths) | Not observed                          | —         |
| 33  | Hard-coded credentials/secrets         | Not observed                          | —         |
| 34  | Inconsistent error/logging conventions | Not observed                          | —         |

### Strength Categories S1–S14

| #   | Category                       | Status   | Finding |
| --- | ------------------------------ | -------- | ------- |
| S1  | Clear modular boundaries       | Observed | S-1     |
| S2  | High cohesion                  | Observed | S-11    |
| S3  | Loose coupling                 | Observed | S-3     |
| S4  | Dependency direction stable    | Observed | S-1     |
| S5  | Dependency management hygiene  | Observed | S-4     |
| S6  | Consistent API contracts       | Observed | S-4     |
| S7  | Robust error handling          | Observed | S-7     |
| S8  | Observability present          | Observed | S-5     |
| S9  | Configuration discipline       | Observed | S-6     |
| S10 | Security built-in              | Observed | S-8     |
| S11 | Testability & coverage         | Observed | S-10    |
| S12 | Resilience patterns            | Observed | S-2     |
| S13 | Domain modeling strength       | Observed | S-9     |
| S14 | Simple, pragmatic abstractions | Observed | S-11    |

## Hotspots

Top files/directories to review:

1. `src/llm/translatePipeline.ts` + `src/llm/useNaturalLanguage.ts` — the hook↔`createTranslate` ~25-field mutable-ref bag (F-3) is the codebase's main coupling debt; also where the strong hook-orchestrator / pure-factory idiom is most stressed.
2. `src/llm/engine.webllm.ts` — the one external network/supply-chain surface (F-1) and the `ABSTAIN`→parser coupling edge (F-2); the cheapest high-value fixes both live here / next door.
3. `src/zmachine/engine.ts` + `src/translate/useOutputTranslation.ts` — the two comment-only temporal-ordering invariants (F-4, F-5); also strong-core hotspots (the boot/autosave seam and the resilient translation pipeline).

## Next Questions

1. Is the WebLLM weight/WASM download (F-1) on the roadmap to self-host or integrity-pin under `public/`, or is the documented one-time HTTPS opt-in the accepted long-term posture?
2. Would the engine boundary be cleaner if `ABSTAIN` moved into `types.ts` (severing F-2's engine→parser edge), and is anything else reaching into `inputTranslate.ts` for shared constants?
3. The two comment-only ordering invariants (F-4, F-5) are real hazards — is there appetite for a test that fails on reordering, or a structural change that makes the order impossible to get wrong?
4. When Phase-2 adds input languages, will the `OUTPUT_ONLY_LANGS`/`CORPUS_ONLY_LANGS` split (F-13) and the inline `Terminal.tsx` language routing (F-12) need to converge into one tested policy module?
5. Should a transient network failure during the model download (F-8) get one automatic retry before degrading to grammar-only, given the multi-GB cost of re-triggering manually?

## Analysis Metadata

- **Agents dispatched:** Structure & Boundaries; Coupling & Dependencies; Integration & Data; Error Handling & Observability; Security & Code Quality; plus one Verifier.
- **Scope:** `src/` — 197 TypeScript/TSX source files (Medium). Corpus `.ts` files treated as data, not logic.
- **Raw findings:** 14 flaws + 11 strengths candidate set (after specialist self-filtering at conf ≥ 60).
- **Verified findings:** 14 flaws + 11 strengths (14/14 flaws confirmed; all strengths confirmed; 2 minor corrections: F-11 path, "branded" struck from S-9).
- **Filtered out:** 0 at verification (specialists already cleared flaws 1, 2, 10, 29 explicitly during analysis).
- **By impact:** Flaws — 0 High, 5 Medium (F-1…F-5), 9 Low. Strengths — 8 High, 3 Medium.
- **Steering files consulted:** `/workspace/CLAUDE.md` (found accurate — no contradictions with code on any reviewed item).
