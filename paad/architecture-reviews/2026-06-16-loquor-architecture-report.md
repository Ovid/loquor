# Architecture Report — loquor

**Date:** 2026-06-16
**Commit:** cd06456b3709dfd6eaf534ac2d78167de71a27fa
**Languages:** TypeScript, React 19, Vite 8; Vitest. CommonJS `ifvms` Z-machine + vendored `glkapi.js`; WebLLM (`@mlc-ai/web-llm`) for on-device inference.
**Key directories:** `src/zmachine/`, `src/glkote-react/`, `src/storage/`, `src/llm/` (+ `grammar/`, `lexicon/`, `scene/`), `src/translate/` (+ `corpus/`), `src/shared/`, `src/ui/`, `src/games/`
**Scope:** Full repository (172 source files, ~73 test files). Read-only vendored dirs (`ifvms.js/`, `web-llm/`, `zork{1,2,3}/`, `vendor/glkote/`, `scratch/`) excluded.

## Repo Overview

Loquor is a fully client-side web app that plays Zork I/II/III in the browser on top of the `ifvms.js` Z-machine, with a custom React UI. There is no backend: engine, fonts, and story files are self-hosted; the only network egress is a one-time, opt-in WebLLM model download. Two feature layers sit on the base engine: a **natural-language input layer** (`src/llm/`) that translates typed English/French/German/Spanish into canonical game commands via a deterministic-first pipeline with an LLM fallback, and an **output-translation overlay** (`src/translate/`) that renders Zork I's English output in FR/DE/ES from a pre-translated corpus with an LLM fallback. Data flows VM → vendored Glk → a custom GlkOte bridge → a pure reducer → React `ViewState`, with IndexedDB-backed autosave keyed by story signature.

This is an unusually disciplined codebase. The git history shows deliberate, numbered architectural refactors (F-1, F-3, F-5/F-11, F-6, F-9, F-16, F-17, F-18) that extracted god-modules into orchestrator/machinery pairs, centralized shared infrastructure, and surfaced previously-swallowed failures. The verifier confirmed every candidate finding was real in code; the flaws that remain are mostly narrow, documented, or inherent — with a cluster of genuine **player-experience** gaps in the multilingual surface that warrant attention per the project's own player-first mandate.

## Strengths

### [S1] Orchestrator/machinery decomposition of the two largest hooks
- **Category:** S1 (Clear modular boundaries)
- **Impact:** High
- **Explanation:** `useNaturalLanguage` and `useOutputTranslation` are thin orchestrators owning React state/refs/effects, delegating dense pure logic to sibling factory modules (`translatePipeline.ts`, `fallbackResolve.ts`) that close over the same refs.
- **Evidence:** `src/llm/useNaturalLanguage.ts:69-83` (header documents the delegation contract); `src/translate/fallbackResolve.ts:1-6` (`createFallbackResolver`).
- **Found by:** Structure & Boundaries, Coupling & Dependencies

### [S2] Single source of truth for the concurrency-critical generate core
- **Category:** S2 (High cohesion) / S14 (Simple, pragmatic abstractions)
- **Impact:** High
- **Explanation:** The watchdog-race + gate-handoff + orphan-abort logic that was duplicated across the input and output seams is unified in `shared/`, with a documented mutual-exclusion invariant.
- **Evidence:** `src/shared/guardedGenerate.ts` (`runGenerationGuarded`), `src/shared/engineGate.ts` (`EngineGate`); extracted to neutral `shared/` in commit `0d40774` (F-6).
- **Found by:** Structure & Boundaries, Coupling & Dependencies, Error Handling & Observability

### [S3] Stable dependency direction — core never imports features
- **Category:** S4 (Dependency direction is stable)
- **Impact:** High
- **Explanation:** Core layers (`zmachine`, `glkote-react`, `storage`) never import the feature layers (`llm`, `translate`); the only such import is in a test file.
- **Evidence:** grep of `src/zmachine src/glkote-react src/storage` for `../llm`/`../translate` → one hit, `src/zmachine/engine.test.ts:4`. Flow is strictly `ui → {features} → core`.
- **Found by:** Coupling & Dependencies

### [S4] The "single integration seam" claim is accurate
- **Category:** S4 (Dependency direction is stable) / S1
- **Impact:** High
- **Explanation:** Only `src/zmachine/*` imports `ifvms`/vendored `glkapi.js`; no `window.Glk`/`GiDispa` reads exist outside `zmachine/`. The VM is reached exclusively through the injected `GlkOteBridge`, and the bridge/reducer contain zero DOM access — the VM genuinely never touches the DOM.
- **Evidence:** `src/zmachine/glk.ts:32`, `src/zmachine/engine.ts:138-153`; `src/glkote-react/reduce.ts` is a pure reducer; `src/glkote-react/bridge.ts:112` keeps `onTurn` observer-only.
- **Found by:** Coupling & Dependencies, Structure & Boundaries

### [S5] Centralized error taxonomy via sentinel classes
- **Category:** S7 (Robust error handling)
- **Impact:** High
- **Explanation:** Failures are classified by `instanceof` against typed sentinels rather than message-sniffing, consistently across both pipelines.
- **Evidence:** `WatchdogTimeout` (`src/llm/translatePipeline.ts:64`), `ExpectedXlateStop` (`src/translate/fallbackResolve.ts:48`, carries a reason string).
- **Found by:** Error Handling & Observability

### [S6] Centralized tag-scoped logger with a durable ring sink
- **Category:** S8 (Observability present)
- **Impact:** High
- **Explanation:** A single `createLogger(tag)` chokepoint gives consistent `[tag]` prefixes, dev-only `debug` gating, and tees `warn`/`error` into a capped in-memory ring exposed via `window.loquorLogs()` (F-16).
- **Evidence:** `src/logger.ts:71-91` (`RING_CAP = 200`, `DEV && MODE !== 'test'` gate).
- **Found by:** Error Handling & Observability

### [S7] Structured corpus-miss observability seam
- **Category:** S8 (Observability present)
- **Impact:** Medium
- **Explanation:** A purpose-built, capped localStorage ring of corpus misses with persistent dedup and element validation, feeding the documented corpus-improvement loop (spec §6).
- **Evidence:** `src/translate/missLog.ts` (`MISS_CAP = 200`, `isMissEntry`, `window.loquorMisses()`).
- **Found by:** Error Handling & Observability

### [S8] Layered resilience ladder in the output-translation pipeline
- **Category:** S12 (Resilience patterns)
- **Impact:** Medium
- **Explanation:** A genuine fallback ladder (matcher → cache → gated LLM generation → English) with a one-shot retry budget, epoch/basis supersession guards, a watchdog, and cache-poison avoidance.
- **Evidence:** `src/translate/fallbackResolve.ts:124-262`.
- **Found by:** Integration & Data, Error Handling & Observability

### [S9] Persistence failures surfaced, not swallowed
- **Category:** S7 (Robust error handling)
- **Impact:** Medium
- **Explanation:** The F-9 fix replaced fire-and-forget `void idbSet(...)` with `onPersistFail`-logged catches on every write site; `autosave_read` warns loudly on a preload-ordering bug; a `DataCloneError` field-locator names the offending field.
- **Evidence:** `src/storage/dialog.ts:141-146` (loud preload warn), persistence catch sites; `uncloneablePath`.
- **Found by:** Integration & Data, Error Handling & Observability

### [S10] No XSS vectors; output rendered as React text nodes
- **Category:** S10 (Security built-in)
- **Impact:** Medium
- **Explanation:** Zero `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` anywhere in `src`; all game and model output renders through React text nodes; user-supplied filenames are sanitized.
- **Evidence:** grep clean across `src`; `src/ui/Scrollback.tsx:39-64` (`{l.text}`); `src/storage/dialog.ts:218` (`[A-Za-z0-9_.-]` strip).
- **Found by:** Security & Code Quality

### [S11] Model-id allowlist guards the supply-chain selection
- **Category:** S10 (Security built-in)
- **Impact:** Medium
- **Explanation:** A `KNOWN_MODELS` allowlist + `resolveModelId` ensures a stray `?model=` query param or `VITE_LLM_MODEL` can never point the weight download at an arbitrary model/URL.
- **Evidence:** `src/llm/models.ts:18-35`; precedence (URL → env → default) documented in `src/llm/modelSelection.ts`.
- **Found by:** Security & Code Quality, Error Handling & Observability

### [S12] Central key registries prevent stringly-typed drift
- **Category:** S6 (Consistent API contracts) / S5 (Dependency management hygiene)
- **Impact:** Medium
- **Explanation:** Every IndexedDB key and localStorage key is declared once with named owners and pinned by tests, eliminating prefix-typo orphans.
- **Evidence:** `src/storage/idbKeys.ts:22-31` (`IDB_KEYS`), `src/llm/storageKeys.ts` (`LS_KEYS`).
- **Found by:** Coupling & Dependencies

### [S13] Strong domain modeling of the lexicon
- **Category:** S13 (Domain modeling strength)
- **Impact:** Medium
- **Explanation:** Morphology is modeled as typed data with gameplay-meaningful concepts (German separable `ParticleVerb`, `pronounsContainer` carrying its own in/on preposition because put-in vs put-on matters in Zork, longest-first `verbIdioms`).
- **Evidence:** `src/llm/lexicon/types.ts:8-46`.
- **Found by:** Structure & Boundaries

### [S14] Clean swappable LlmEngine seam with DI from one composition root
- **Category:** S3 (Loose coupling)
- **Impact:** Medium
- **Explanation:** A tight `LlmEngine` interface with `FakeLlmEngine`/`WebLlmEngine` implementations; the single engine and gate are constructed once in `Terminal` and injected into both consuming hooks.
- **Evidence:** `src/llm/types.ts:35-56`, `src/llm/engine.fake.ts`, `src/llm/engine.webllm.ts`, `src/ui/Terminal.tsx:47-50,97-126`.
- **Found by:** Coupling & Dependencies

### [S15] Strong error/edge-path test coverage
- **Category:** S11 (Testability & coverage)
- **Impact:** Medium
- **Explanation:** Rare for a client app: explicit tests for IndexedDB quota-exceeded and `DataCloneError`, the boot-ordering guard, write-serialization, the StrictMode dispose guard, and the full model-download lifecycle including failure/cancel/decline/late-resolve races.
- **Evidence:** `src/storage/dialog.filewrite-error.test.ts`, `src/storage/dialog.test.ts:81-99`, `src/llm/useModelDownload.test.tsx:128-245`.
- **Found by:** Security & Code Quality

## Flaws/Risks

### [F1] Player-facing notice strings are inlined and not localized
- **Category:** 28 (Magic numbers/strings) + player-experience
- **Impact:** Medium
- **Explanation:** ~8 user-visible English notice strings are hardcoded in pipeline logic; a non-English player who triggers a queue-drop, timeout, or partial-compound result sees English notices, contravening the EN/FR/DE/ES mandate in CLAUDE.md.
- **Evidence:** `src/llm/translatePipeline.ts:401,701-702,708-709,716,724-727,767,785-786,808` — e.g. `"Translation timed out — sent as typed."`, `"Ran ${done} of ${total} actions."`, `"Queue full — dropped: …"`.
- **Found by:** Error Handling & Observability

### [F2] Error-path raw-sends untranslated non-English to the VM
- **Category:** 20 (Weak error handling strategy)
- **Impact:** Medium
- **Explanation:** The per-line drain catch calls `sendTracked(line)` with the raw typed line regardless of language; a single non-EN command whose `runClause` throws rethrows into this catch, pushing untranslated French/German/Spanish to the Z-parser — contradicting the stage-8 non-EN "nothing sent" policy. This is the memory-documented "F-R error-path leak", now relocated to `translatePipeline.ts`.
- **Evidence:** `src/llm/translatePipeline.ts:773-789` (drain catch raw-send), `:581` (`total===1` rethrow), vs `:704-711` (stage-8 non-EN policy).
- **Found by:** Error Handling & Observability

### [F3] Output translation covers Zork I only; input covers all three games
- **Category:** 24 (Inconsistent API contracts) + player-experience
- **Impact:** Medium
- **Explanation:** The output corpus registry holds only Zork I, while the input lexicon registry holds Zork I/II/III, so a non-EN player of Zork II/III gets natural-language *input* in their language but English *output* — a felt asymmetry between the two halves of the multilingual feature.
- **Evidence:** `src/translate/corpus/index.ts:14` (`[ZORK1_SIG]` only) vs `src/llm/lexicon/index.ts:25-27` (all three).
- **Found by:** Integration & Data

### [F4] Shotgun surgery — per-language data dispersed across unlinked sites
- **Category:** 9 (Shotgun surgery)
- **Impact:** Medium
- **Explanation:** A language's vocabulary lives across structurally-unconnected sites (conjunctions, yes/no words, direction lead-words, core lexicon, per-game nouns); adding a language requires parallel edits to all of them. The git history (commits `b75bcc2`, `ca30d33`) and CLAUDE.md's own rule confirm this is felt pain. The bulk is well-isolated by lexicon types; the dispersion is in the small closed sets never folded into them.
- **Evidence:** `src/llm/inputTranslate.ts:22` (`CLAUSE_CONJ`), `:400-409` (`CONFIRM_*`), `src/llm/directions.ts:24-157` (`DIRECTION_WORDS`/`LEAD`), `src/llm/lexicon/index.ts:6-15`.
- **Found by:** Structure & Boundaries, Error Handling & Observability, Coupling & Dependencies

### [F5] WebLLM model + WASM fetch is not integrity-pinned (no SRI)
- **Category:** 30 (Security as an afterthought)
- **Impact:** Medium
- **Explanation:** No `appConfig` is passed, so WebLLM's built-in `prebuiltAppConfig` fetches multi-GB weights from `huggingface.co` and an executable model-lib WASM from `raw.githubusercontent.com` with no SRI; the WASM runs in the page origin (where IndexedDB save data also lives). Gated behind opt-in, HTTPS, one-time — and the documented follow-up is to self-host/integrity-check under `public/`. The download modal discloses the third-party + one-time fetch accurately but omits the no-integrity-pinning / executable-WASM caveat.
- **Evidence:** `src/llm/engine.webllm.ts:44-49`; disclosure at `src/ui/ModelDownloadModal.tsx:34-40`.
- **Found by:** Security & Code Quality

### [F6] WebLLM modal download has no timeout and no retry
- **Category:** 19 (Lack of idempotency) / 17 (resilience gap)
- **Impact:** Medium
- **Explanation:** The model-download path has abort/cancel but no timeout and no auto-retry; a stalled fetch (no progress) sits in `phase:'downloading'` indefinitely, leaving manual cancel as the player's only recourse. (The lazy in-`generateRaw` load path *does* use a watchdog; the modal path does not.)
- **Evidence:** `src/llm/engine.webllm.ts:37-70`, `src/llm/useModelDownload.ts:120-142` (no `timeout`/`retry`/`setTimeout`).
- **Found by:** Integration & Data

### [F7] Model-download failure is player-noticed but never logged
- **Category:** 21 (No observability plan)
- **Impact:** Medium
- **Explanation:** A genuine (non-abort) load failure sets a player notice and flips to `phase:'off'` but discards the underlying error — never `log.error`/`warn` — so the cause of the app's single network-egress risk never reaches the ring buffer or console. The one blind spot in an otherwise-excellent observability posture.
- **Evidence:** `src/llm/useModelDownload.ts:135-142` (`err` in scope, discarded).
- **Found by:** Error Handling & Observability

### [F8] Form-key completeness gate validates German only
- **Category:** 24 (Inconsistent API contracts)
- **Impact:** Medium
- **Explanation:** The static completeness net (every template-referenced `{obj.<key>}` exists on every object) runs against `ZORK1_DE` only, while the sibling coverage gate is registry-driven over all languages — so a template/object key gap in FR or ES could miss at runtime undetected by this net.
- **Evidence:** `src/translate/corpus/completeness.test.ts:14,37` vs `src/translate/corpus/coverage.test.ts:15` (`corporaFor(ZORK1_SIG)`).
- **Found by:** Integration & Data

### [F9] Temporal coupling in the boot/autosave ordering
- **Category:** 27 (Temporal coupling) / 16 (Synchronous-only integration)
- **Impact:** Medium
- **Explanation:** ZVM reads autosave synchronously during `start()`, so `boot()` requires a strict, type-unexpressible `preload → prepare → Glk.init` order, bridged by a sync cache warmed from async IndexedDB. Inherent to the `ifvms` sync-autosave contract, documented at length (F-5/F-11), and backed by a loud runtime guard — appropriately mitigated rather than hidden, but real. (The verifier merged the engine-layer and dialog-layer facets of this one invariant.)
- **Evidence:** `src/zmachine/engine.ts:104-153`; `src/storage/dialog.ts:122-146` (sync `autosave_read`, loud warn at 141-146).
- **Found by:** Coupling & Dependencies, Integration & Data

### [F10] engine.webllm boundary is only ever tested against a mock
- **Category:** 32 (Missing/inadequate test coverage for critical paths)
- **Impact:** Medium
- **Explanation:** All tests mock `@mlc-ai/web-llm`, so the real download, WebGPU init, and `response_format` acceptance by WebLLM 0.2.84 are untested — a version bump changing the grammar/`response_format` shape would pass the whole suite. Inherent (the real lib can't run in jsdom), but it leaves the single real network/WASM boundary without automated coverage.
- **Evidence:** `src/llm/engine.webllm.test.ts` (`vi.mock('@mlc-ai/web-llm', …)`); shape at `engine.webllm.ts:92` (`{type:'grammar',grammar}`).
- **Found by:** Security & Code Quality

### [F11] Inconsistent boundary — yes/no words live outside the core lexicon
- **Category:** 13 (Inconsistent boundaries)
- **Impact:** Low
- **Explanation:** `CONFIRM_AFFIRMATIVE`/`CONFIRM_NEGATIVE` hardcode de/fr/es yes/no words as module constants, while every other per-language word class lives in `CoreLexicon`. A sub-instance of F4's dispersion.
- **Evidence:** `src/llm/inputTranslate.ts:400-409` vs `src/llm/lexicon/types.ts:16-46`.
- **Found by:** Structure & Boundaries, Coupling & Dependencies

### [F12] Optional injected gate silently defaults to a private instance
- **Category:** 23 (Dependency injection misuse)
- **Impact:** Low
- **Explanation:** `gate?` falls back to a per-hook `new EngineGate()` so tests need no change; a caller that forgets to pass the shared gate gets a private one and silently loses input/output arbitration on the single non-reentrant engine (overlapping generations) rather than failing.
- **Evidence:** `src/llm/useNaturalLanguage.ts:46,100-102`; same optional-gate shape in `useOutputTranslation`.
- **Found by:** Coupling & Dependencies

### [F13] Leaky invariant — runGenerationGuarded must be called inside EngineGate.run
- **Category:** 6 (Leaky abstractions)
- **Impact:** Low
- **Explanation:** The helper's correctness depends on a caller invariant enforced only in a doc comment; a future caller that forgets it reintroduces the overlapping-generation race. Both current callers honor it.
- **Evidence:** `src/shared/guardedGenerate.ts:54-64` (header doc).
- **Found by:** Coupling & Dependencies

### [F14] Large, dense orchestration in createTranslate/runLine
- **Category:** 2 (God object) / 11 (Low cohesion)
- **Impact:** Low
- **Explanation:** `runLine` bundles prompt-escape, clause-splitting, per-clause dispatch, room-change/failure detection, and four notice-policy branches in one scope; the genuinely-pure `runClause` is already extracted and the split is documented, so this is the one place the otherwise-excellent decomposition stops short.
- **Evidence:** `src/llm/translatePipeline.ts:354-853` (`createTranslate`), `:473-733` (`runLine`).
- **Found by:** Structure & Boundaries

### [F15] No multi-key transactional atomicity in storage
- **Category:** 26 (Poor transactional boundaries)
- **Impact:** Low
- **Explanation:** Each `idbGet/Set/Del` opens its own connection + single-statement transaction; clearing an autosave slot and its related file slot are independent commits, so a crash between them can leave the kv store half-updated. `writeChain` serializes order but not atomicity. Low stakes for a single-player local game.
- **Evidence:** `src/storage/idb.ts:16-37`, `src/storage/dialog.ts:155-185`.
- **Found by:** Integration & Data

### [F16] preload can clobber a newer in-flight cache value
- **Category:** 19 (Lack of idempotency)
- **Impact:** Low
- **Explanation:** `preload` reads via `idbGet` (bypassing `writeChain`) and unconditionally overwrites the sync cache; a re-boot before an in-flight write settles could overwrite a newer cached snapshot with an older persisted value. Narrow — the StrictMode dispose path mitigates the common case.
- **Evidence:** `src/storage/dialog.ts:122-124`.
- **Found by:** Integration & Data

### [F17] dispose() blocks only future writes; in-flight writes still settle
- **Category:** 19 (Lack of idempotency)
- **Impact:** Low
- **Explanation:** The `disposed` gate is checked at enqueue, so an already-enqueued/in-flight write still commits. Documented as acceptable because the StrictMode throwaway is disposed before its first turn; the safety argument depends on that ordering holding.
- **Evidence:** `src/storage/dialog.ts:100-114`.
- **Found by:** Integration & Data

### [F18] Hidden side effects beyond the hook's return signature
- **Category:** 12 (Hidden side effects)
- **Impact:** Low
- **Explanation:** `useOutputTranslation`/`createFallbackResolver` persist to IndexedDB and localStorage, install a `window` global, mutate refs, and run GPU generations — none evident from the `{lines, status}` type. Materially mitigated: the effects are explicitly inventoried in the header (F-18), but the signature still under-promises.
- **Evidence:** `src/translate/useOutputTranslation.ts:9-18` (SIDE EFFECTS block), `:45-51`.
- **Found by:** Error Handling & Observability

### [F19] Protocol parsed by structural shape-sniffing with no version field
- **Category:** 24 (Inconsistent API contracts)
- **Impact:** Low
- **Explanation:** The VM↔React "update" object is parsed by sniffing (`lines[]` ⇒ grid, `text[]` ⇒ buffer) with no schema/version negotiation; unknown shapes are logged and dropped best-effort. A deliberate, robust tolerance choice (won't corrupt the transcript), but a glkapi upgrade could silently degrade rendering with only a console warning. Mitigated by the SHA-pinned dependency.
- **Evidence:** `src/glkote-react/reduce.ts:188-199`, `src/glkote-react/bridge.ts:97-109`.
- **Found by:** Integration & Data

### [F20] Duplicated log.error string with divergent guards
- **Category:** 34 (Inconsistent error/logging conventions)
- **Impact:** Low
- **Explanation:** `log.error('translation failed:', …)` appears at two sites behind parallel-but-separate `instanceof WatchdogTimeout` guards; a future change to one site's classification won't propagate. Both are presently correct.
- **Evidence:** `src/llm/translatePipeline.ts:682` and `:782`.
- **Found by:** Error Handling & Observability

### [F21] Timing tunables escape the central config module
- **Category:** 28 (Magic numbers/strings)
- **Impact:** Low
- **Explanation:** `config.ts` claims to be the central tunables home, yet the orphan-settle bound (`30_000`) and the output-translation watchdog (`15_000`, a sibling of the in-config watchdogs) live elsewhere; `RING_CAP`/`MISS_CAP` are independent `200` literals (the miss-cap is deliberately scoped out, so the watchdog values are the stronger instances).
- **Evidence:** `src/shared/guardedGenerate.ts:69` (`?? 30_000`), `src/translate/useOutputTranslation.ts:55` (`XLATE_WATCHDOG_MS = 15_000`).
- **Found by:** Error Handling & Observability

### [F22] Feature sentinel leaks into the generic engine layer
- **Category:** 6 (Leaky abstractions)
- **Impact:** Low
- **Explanation:** Both engine implementations import the input-pipeline's `ABSTAIN` sentinel; `inputTranslate` is itself a leaf so there's no cycle, but the swappable `LlmEngine` boundary knowing an input-feature constant is a small semantic leak. A neutral constants module would be cleaner.
- **Evidence:** `src/llm/engine.fake.ts:2`, `src/llm/engine.webllm.ts:4` (`import { ABSTAIN } from './inputTranslate'`).
- **Found by:** Coupling & Dependencies

### [F23] Translation concerns maintained in the Terminal component
- **Category:** 25 (Business logic in the UI)
- **Impact:** Low
- **Explanation:** Loud-room re-voicing state (`recordEcho`/`echoMap`) — a translation concern — is maintained in the view component, and `dlProgress` is derived inline. Modest: the heavy lifting is in `loudEcho.ts`/the hooks, and game-loop logic was already extracted to `useGameEngine`/`useSceneObservation` (F-17).
- **Evidence:** `src/ui/Terminal.tsx:64-71`, `:130-133`.
- **Found by:** Error Handling & Observability

### [F24] Intermittently flaky fake-timers watchdog test
- **Category:** 32 (Missing/inadequate test coverage for critical paths)
- **Impact:** Low
- **Explanation:** The output-translation fake-timers watchdog gate fails intermittently and is re-run rather than fixed (per the standing memory note); a flaky gate erodes trust — a real regression in that watchdog could be dismissed as "just the flake." Not independently reproduced in this review.
- **Evidence:** `src/translate/useOutputTranslation.test.tsx` (memory: "Flaky watchdog gate test").
- **Found by:** Security & Code Quality

## Coverage Checklist

### Flaw/Risk Types 1–34
| # | Type | Status | Finding |
|---|------|--------|---------|
| 1 | Global mutable state | Not observed | — (only GC-safe WeakMaps + capped ring; see S2) |
| 2 | God object | Observed | F14 |
| 3 | Tight coupling | Not observed | — (see S3/S4) |
| 4 | High/unstable dependencies | Not observed | — |
| 5 | Circular dependencies | Not observed | — (suspect edges are `import type` only) |
| 6 | Leaky abstractions | Observed | F13, F22 |
| 7 | Over-abstraction | Not observed | — |
| 8 | Premature optimization | Not observed | — (fallbackCache is spec-backed) |
| 9 | Shotgun surgery | Observed | F4 |
| 10 | Feature envy / anemic domain | Not observed | — (see S13) |
| 11 | Low cohesion | Observed | F14 |
| 12 | Hidden side effects | Observed | F18 |
| 13 | Inconsistent boundaries | Observed | F11 |
| 14 | Distributed monolith | Not applicable | Single client-side SPA, no services |
| 15 | Chatty service calls | Not applicable | No service-to-service traffic |
| 16 | Synchronous-only integration | Observed | F9 |
| 17 | No clear ownership of data | Not observed | — (central key registries, see S12) |
| 18 | Shared database across services | Not applicable | No backend DB; IDB is single local store |
| 19 | Lack of idempotency | Observed | F6, F16, F17 |
| 20 | Weak error handling strategy | Observed | F2 |
| 21 | No observability plan | Observed | F7 (one gap; overall strong, see S6/S7) |
| 22 | Configuration sprawl | Observed | F21 (minor residual) |
| 23 | Dependency injection misuse | Observed | F12 |
| 24 | Inconsistent API contracts | Observed | F3, F8, F19 |
| 25 | Business logic in the UI | Observed | F23 |
| 26 | Poor transactional boundaries | Observed | F15 |
| 27 | Temporal coupling | Observed | F9 |
| 28 | Magic numbers/strings | Observed | F1, F21 |
| 29 | "Utility" dumping ground | Not observed | — |
| 30 | Security as an afterthought | Observed | F5 |
| 31 | Dead code / unused dependencies | Not observed | — (no unused deps; dead per-language clauses already removed in `3720db7`) |
| 32 | Missing test coverage for critical paths | Observed | F10, F24 |
| 33 | Hard-coded credentials/secrets | Not observed | — (none; no `.env`, no secrets in `src`) |
| 34 | Inconsistent error/logging conventions | Observed | F20 |

### Strength Categories S1–S14
| # | Category | Status | Finding |
|---|----------|--------|---------|
| S1 | Clear modular boundaries | Observed | S1, S4 |
| S2 | High cohesion | Observed | S2 |
| S3 | Loose coupling | Observed | S14 |
| S4 | Dependency direction is stable | Observed | S3, S4 |
| S5 | Dependency management hygiene | Observed | S12 |
| S6 | Consistent API contracts | Observed | S12 |
| S7 | Robust error handling | Observed | S5, S9 |
| S8 | Observability present | Observed | S6, S7 |
| S9 | Configuration discipline | Observed | S11 |
| S10 | Security built-in | Observed | S10, S11 |
| S11 | Testability & coverage | Observed | S15 |
| S12 | Resilience patterns | Observed | S8 |
| S13 | Domain modeling strength | Observed | S13 |
| S14 | Simple, pragmatic abstractions | Observed | S2 |

## Hotspots

1. `src/llm/translatePipeline.ts` — the densest module and the source of three findings (F1 unlocalized notices, F2 non-EN raw-send leak, F14 large orchestration, F20 duplicated log). Also the strongest core (S1/S5). The highest-leverage file to review.
2. `src/llm/engine.webllm.ts` + `src/llm/useModelDownload.ts` — the single external/WASM boundary; concentrates the security and resilience risks (F5 no SRI, F6 no timeout/retry, F7 silent failure, F10 mock-only coverage).
3. `src/translate/corpus/` (registry + gates) — the multilingual contract surface where the player-experience asymmetries live (F3 Zork I only, F8 German-only completeness gate), alongside strong consistent-contract patterns (S12).

## Next Questions

1. Is the Zork I–only output translation (F3) an intentional v1 scope boundary, or should the corpus registry be extended (or the player told) so a non-EN Zork II/III player isn't surprised by English output?
2. On a translator failure for a single non-English command (F2), what *should* the player see — the untranslated line sent to the parser, a localized "couldn't translate" notice, or nothing sent? What does the spec intend?
3. Should the player-facing notice strings (F1) be localized now, given the EN/FR/DE/ES mandate, or is English-notice-on-error an accepted v1 limitation?
4. Is self-hosting / integrity-pinning the WebLLM weights + WASM (F5) on the roadmap, and what is the trigger to prioritize it over the current opt-in + disclosure mitigation?
5. Should the modal download path (F6) gain the same watchdog the lazy-load path already has, and should F7's discarded error be logged to the ring buffer?

## Analysis Metadata

- **Agents dispatched:** Structure & Boundaries; Coupling & Dependencies; Integration & Data; Error Handling & Observability; Security & Code Quality; plus one Verifier.
- **Scope:** 172 source files across `src/` (full repo); vendored read-only dirs excluded.
- **Raw findings:** 26 flaw candidates + 18 strength candidates = 44 before verification.
- **Verified findings:** 24 flaws (after dedup merges: F9 merged the engine/dialog temporal-coupling facets; F5 merged the SRI code-site + modal-disclosure facets; F11/F15 noted as sub-instances of F4) + 15 strengths = 39.
- **Filtered out:** 0 dropped; 5 dedup-merged/consolidated; several impact-adjusted (F16 Medium→Low, F10/F24 confidence trimmed).
- **By impact:** Flaws — 10 High/Medium-weighted (F1–F10 Medium), 14 Low (F11–F24). Strengths — 6 High, 9 Medium.
- **Steering files consulted:** `CLAUDE.md` (verified accurate against code — "single integration seam" and "VM never touches DOM" both hold; the "v1, Zork I × French" output-translation phrasing is **stale**, the corpus now ships FR/DE/ES); design specs under `docs/superpowers/`; auto-memory notes (F-R error-path leak confirmed and relocated; flaky watchdog test confirmed; "detection reads English source" confirmed).
