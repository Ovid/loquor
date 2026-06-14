# Architecture Report — Loquor

**Date:** 2026-06-14
**Commit:** 6f35c7cb76ce05344b03fa2d0a106135a8ba8d09
**Languages:** TypeScript, React 19, Vite, Vitest
**Key directories:** `src/ui/`, `src/zmachine/`, `src/glkote-react/`, `src/storage/`, `src/llm/`, `src/translate/`, `src/games/`
**Scope:** Full repository (`src/`) — ~81 source files, 60 test files

## Repo Overview

Loquor is a **fully client-side** browser app that plays Zork I/II/III on top of the
`ifvms.js` Z-machine VM, with a custom React UI. Two headline subsystems sit on top
of the playable engine: a **WebLLM natural-language input layer** (English/French/
German/Spanish → canonical game command, deterministic-first with an on-device LLM
fallback) and an **output-translation layer** (game output → French, corpus-first with
an LLM fallback). The VM never touches the DOM; data flows VM → vendored Glk
(`glkapi.js`) → a custom GlkOte bridge → a pure React reducer, with native ZVM autosave
persisted to IndexedDB. It is a **single-process browser application** — there are no
networked services, so distributed-system concerns are largely not applicable. The one
documented network egress is the opt-in, one-time WebLLM model/WASM download.

The codebase is **well-factored**: clean dependency direction, a single composition
root, two real swappable interfaces (`LlmEngine`, `GlkOteDisplay`), pure reducers for
both VM-output reduction and scene tracking, and a defense-in-depth contract around the
untrusted LLM output. The principal debt is concentrated in **two oversized React
hooks** and a cluster of **cross-cutting hygiene gaps** (scattered config/constants, ad
hoc logging, a single shared IndexedDB store). One genuine **supply-chain trust-boundary
hole** exists (unpinned remote WASM), but it is documented and gated behind explicit opt-in.

## Strengths

### [S-A] Single, well-isolated integration seams

- **Category:** S1 — Clear modular boundaries
- **Impact:** High
- **Explanation:** Each external dependency is wrapped by exactly one module — `engine.webllm.ts` is the only file importing `@mlc-ai/web-llm` (via dynamic imports), and `ZMachine` is a clean façade over the VM + Glk + bridge.
- **Evidence:** `src/llm/engine.webllm.ts:1,40,116` (sole web-llm importer); `src/zmachine/engine.ts:46` (`class ZMachine`)
- **Found by:** Structure & Boundaries

### [S-E] All concrete instantiation confined to the composition root

- **Category:** S4 — Dependency direction is stable
- **Impact:** High
- **Explanation:** `new WebLlmEngine`, `new EngineGate`, `new ZMachine`, and `new IdbDialog` appear only in `src/ui/`; every core module depends on abstractions passed in, which is what makes the whole app testable with `engine.fake.ts`.
- **Evidence:** `src/ui/Terminal.tsx:51,54,73,74`, `src/ui/App.tsx:39`
- **Found by:** Coupling & Dependencies

### [S-F] Two swappable interfaces with real second implementations

- **Category:** S3 — Loose coupling
- **Impact:** High
- **Explanation:** `LlmEngine` (6-method interface) has a real impl (`engine.webllm.ts`) and a test impl (`engine.fake.ts`) consumed by both feature layers; `GlkOteBridge implements GlkOteDisplay` is the documented VM↔React seam injected via `vm_options.GlkOte`.
- **Evidence:** `src/llm/types.ts:35-56`, `src/llm/engine.fake.ts:16`, `src/glkote-react/bridge.ts:28`, `src/zmachine/engine.ts:129`
- **Found by:** Coupling & Dependencies

### [S-I] LLM output contract defended in depth

- **Category:** S6 — Consistent API contracts
- **Impact:** High
- **Explanation:** The least-trustworthy integration point (a quantized small model) is the most rigorously contracted: a GBNF grammar built from the exact game vocab constrains generation, and `parseCommand` then _independently_ re-validates the output against the same vocab, with a single shared `ABSTAIN` sentinel.
- **Evidence:** `src/llm/grammar/buildGrammar.ts:33-58`, `src/llm/translate.ts:291-321` (`parseCommand`), shared `ABSTAIN` at `src/llm/translate.ts:15`
- **Found by:** Integration & Data

### [S-J] Pervasive, well-reasoned resilience across every seam

- **Category:** S12 — Resilience patterns
- **Impact:** High
- **Explanation:** Watchdog + bounded orphan-settle so a wedged worker can't hold the shared engine forever; a priority mutex with a documented handoff invariant; an LLM fallback cache that degrades a read failure to a MISS; a `loadEpoch` guard against load races; serialized autosave writes; and fail-loud story loading.
- **Evidence:** `src/llm/guardedGenerate.ts:65-123`, `src/llm/engineGate.ts:16-30`, `src/translate/fallbackCache.ts:18-27`, `src/llm/engine.webllm.ts:39,62-66`, `src/storage/dialog.ts:73-97`, `src/ui/App.tsx:14-20`
- **Found by:** Integration & Data, Error Handling & Observability

### [S-N] No XSS surface; security defaults built in

- **Category:** S10 — Security built-in
- **Impact:** High
- **Explanation:** A grep for `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` across `src/` returns zero matches; both game output and untrusted LLM output reach the DOM as React text children (auto-escaped). Fonts are self-hosted (no CDN), and the model allowlist blocks `?model=` tampering.
- **Evidence:** `src/ui/Scrollback.tsx:39-63`, `src/ui/fonts.css`, `src/llm/models.ts:20-35`
- **Found by:** Security & Code Quality

### [S-K] One-shot retry budget with a clear error taxonomy

- **Category:** S7 — Robust error handling
- **Impact:** High
- **Explanation:** `failEnglish` implements a per-line retry budget (first failure → warn + re-attempt when idle; second → permanently English), and a custom `ExpectedXlateStop` sentinel separates superseded/abandoned stops (silent) from genuine faults (surfaced).
- **Evidence:** `src/translate/useOutputTranslation.ts:197-218`, sentinel at `:61`
- **Found by:** Error Handling & Observability

### [S-O] High, well-targeted test coverage with data-gating tests

- **Category:** S11 — Testability & coverage
- **Impact:** High
- **Explanation:** 60 test files for ~81 source files; every critical/concurrency-sensitive seam is tested, and gating tests pin the translation/vocab corpora so any drift breaks the build.
- **Evidence:** `src/translate/corpus/coverage.test.ts`, `inventory.test.ts`, `roundtrip.test.ts`; `src/llm/grammar/vocab-invariants.test.ts`; `src/llm/guardedGenerate.test.ts`, `engineGate.test.ts`
- **Found by:** Security & Code Quality

### [S-C] Pure pipeline stages and a pure scene reducer

- **Category:** S2 / S13 — High cohesion / Domain modeling strength
- **Impact:** High
- **Explanation:** The NL pipeline's deterministic stages are pure, total, well-named functions, and the scene domain is modeled as a pure reducer (`reduceScene`) with a thin stateful wrapper — domain rules live in the domain layer, not smeared into the hooks.
- **Evidence:** `src/llm/translate.ts` (`splitClauses`, `parseCommand`), `src/llm/scene/tracker.ts:135` (`reduceScene`), `:202-223` (`TextSceneTracker`)
- **Found by:** Structure & Boundaries

### [S-G] Strictly one-directional dependency between feature layers (no cycle)

- **Category:** S5 — Dependency management hygiene
- **Impact:** Medium
- **Explanation:** `src/translate/` imports from `src/llm/` but never the reverse; the `../translate` imports inside `src/llm/` resolve to the _sibling file_ `src/llm/translate.ts`, not the output-translation directory — so there is no circular dependency (the naming hazard is captured separately in F-7).
- **Evidence:** `src/translate/useOutputTranslation.ts:12-13` (imports up into `llm/`); `src/llm/scene/tracker.ts:11`, `src/llm/grammar/buildGrammar.ts:3` (`../translate` = sibling file)
- **Found by:** Coupling & Dependencies

### [S-H] Pure VM-output reducer; observer-only turn seam

- **Category:** S3 — Loose coupling
- **Impact:** Medium
- **Explanation:** `reduce()` is a pure `(ViewState, update) → ViewState`; the `onTurn` hook is explicitly observer-only and does not perform the autosave (avoiding a double-save against native ZVM autosave).
- **Evidence:** `src/glkote-react/reduce.ts:160`, `src/glkote-react/bridge.ts:58-72`
- **Found by:** Coupling & Dependencies

### [S-B] `EngineGate` — a tiny, focused priority mutex

- **Category:** S14 — Simple, pragmatic abstractions
- **Impact:** Medium
- **Explanation:** Single-engine arbitration between input and output translation is solved by a ~20-line priority mutex with an explicit, documented handoff invariant — no over-engineering.
- **Evidence:** `src/llm/engineGate.ts:12-31`
- **Found by:** Structure & Boundaries

### [S-L] Structured corpus-gap logging and labeled autosave trace

- **Category:** S8 — Observability present
- **Impact:** Medium
- **Explanation:** `missLog` is a capped (200) localStorage ring buffer of structured `MissEntry` records with a `window.loquorMisses()` dev dump (a real corpus-improvement feedback loop), and the autosave path emits a labeled trace with an `uncloneablePath()` diagnostic pinpointing offending fields.
- **Evidence:** `src/translate/missLog.ts:6,69,77-81`, `src/storage/dialog.ts:14-35`
- **Found by:** Error Handling & Observability

### [S-M] Model IDs centralized behind an allowlist

- **Category:** S9 — Configuration discipline
- **Impact:** Medium
- **Explanation:** Model IDs live in one module behind a `KNOWN_MODELS` allowlist, and `resolveModelId` enforces it with a documented precedence (URL → env → default), so a stray `?model=` can never redirect the weight download to an arbitrary URL.
- **Evidence:** `src/llm/models.ts:20-35`, `src/llm/modelSelection.ts:24-31`
- **Found by:** Error Handling & Observability

### [S-D] Clean signature-keyed registries

- **Category:** S2 — High cohesion
- **Impact:** Medium
- **Explanation:** Per-game vocab and per-(language, game) lexicons are exposed through small registry modules keyed by story signature, with the signatures defined once and reused rather than re-declared.
- **Evidence:** `src/llm/grammar/index.ts:16-30`, `src/llm/lexicon/index.ts:16,24-27`
- **Found by:** Structure & Boundaries

## Flaws/Risks

### [F-20] Unpinned remote WASM + model weights execute in page origin (no SRI)

- **Category:** 30 — Security as an afterthought (trust boundary / supply chain)
- **Impact:** Medium
- **Explanation:** Enabling the NL layer calls `CreateMLCEngine(modelId)` with no `appConfig`, so WebLLM's built-in `prebuiltAppConfig` fetches model weights from `huggingface.co` and the model-lib **WASM** from `raw.githubusercontent.com`; the WASM executes in the page origin with no Subresource Integrity, so a compromised/MITM'd host could run arbitrary code in-origin.
- **Evidence:** `src/llm/engine.webllm.ts:40-46` (no `appConfig`; in-code comment at `:41-45` documents the gap)
- **Found by:** Security & Code Quality (corroborated by CLAUDE.md "Known network egress")
- **Status:** Won't fix
- **Status reason:** Accepted, documented residual risk for this deployment. The textbook remediation — self-host the model weights + model-lib WASM under `public/` with integrity pinning — is **infeasible on the project's hosting (GitHub Pages):** the weights are hundreds of MB–GB, exceeding Pages' 100 MB/file and ~1 GB/repo limits, and Pages won't serve Git LFS, so they cannot be vendored. The residual risk is also disproportionate to the deployment: this is a static, no-backend, no-auth, **no-secrets** site, so in-origin code execution has a tiny blast radius — only the user's own browser storage for the origin (game saves / theme / NL opt-in), with nothing to exfiltrate. The trust roots (`huggingface.co`, `raw.githubusercontent.com`) are the same class GitHub Pages itself relies on. The meaningful mitigations are already in place: the fetch is HTTPS, gated behind **explicit opt-in** (the download modal), one-time then cached/offline, and **disclosed** in CLAUDE.md and an in-code comment (`engine.webllm.ts:44-48`). The remaining gap (SRI on a WebLLM `prebuiltAppConfig` fetch) is accepted as a documented trade-off for running a client-side LLM on static hosting. (A pragmatic `appConfig` pin to immutable refs was considered and declined for this session — modest gain, no SRI, not worth the maintenance of tracking upstream SHAs.)
- **Status date:** 2026-06-14 08:29 UTC
- **Status commit:** (decision only — no code change)

### [F-1] `useNaturalLanguage` is a god-object hook

- **Category:** 2 — God object
- **Impact:** High
- **Explanation:** A single 1042-line hook owns the entire NL pipeline — its `translate` callback alone is ~540 lines with four nested closures, plus the queue, scene tracker, watchdogs, and an unrelated model-download lifecycle (308-395).
- **Evidence:** `src/llm/useNaturalLanguage.ts:163-1042`; `translate` callback `468-1006`; download lifecycle `308-395`
- **Found by:** Structure & Boundaries (already tracked in MEMORY.md as a deferred "hook pipeline extraction"; 49 commits of intentional work)
- **Status:** Fixed
- **Status reason:** Completed the hook decomposition begun by F-2/F-18/F-3. Extracted the entire input-translation engine into a new pure-logic `src/llm/translatePipeline.ts`: `createGenerateRaw` (the lazy-load + watchdog generate wrapper), the now-pure `runClause` (deterministic-first stages 3–7 for one clause), and `createTranslate` (the per-line stages 1–8 + the F-A drain), plus the moved `WatchdogTimeout`/`Stage`/`Lex`/`LiveState`/`QueuedLine` types and the `MAX_CLAUSES`/`QUEUE_CAP`/`LOAD_WATCHDOG_MS` constants. The factories close over the SAME refs/setters the hook holds (the `createFallbackResolver` idiom from F-3), so the hook now reads as an orchestrator — React state/refs, the scene-tracker lifecycle, the state/lex/grammar/liveRef memos, and the public `observe`/`isSequencing` seams — and dropped from **920 → 322 lines** (the `translate` god-callback is gone). Behavior-preserving: the full suite is green (753 tests, up from 746) including a new `translatePipeline.test.ts` that unit-tests the extracted pure `runClause` per stage. Dependency graph stays acyclic (translatePipeline imports only the `Internal` _type_ from useModelDownload).
- **Status date:** 2026-06-14 08:19 UTC
- **Status commit:** (this commit)

### [F-3] `useOutputTranslation` bundles too many concerns

- **Category:** 2 — God object (secondary)
- **Impact:** High
- **Explanation:** A 372-line hook owns corpus compilation, the sync match path, a 238-line async fallback effect with nested closures, a per-line retry budget, backlog snapshotting, and epoch/teardown — cohesive around the feature but heavy as one unit.
- **Evidence:** `src/translate/useOutputTranslation.ts:63-435` (fallback effect `167-404`)
- **Found by:** Structure & Boundaries
- **Status:** Fixed
- **Status reason:** Extracted the dense async-resolution pipeline (`put`/`settle`/`failEnglish`/`resolve` + `ExpectedXlateStop` and the `Resolution`/`OverlayEntry`/`OverlayState` types) into a new pure-logic `src/translate/fallbackResolve.ts` (`createFallbackResolver` factory closing over the hook's refs). The hook now reads as an orchestrator — React state/refs, the effect-order invariant, the miss scan, and the output memos — and dropped from 435 to 269 lines. Behavior-preserving: all 28 tests in `useOutputTranslation.test.tsx` (incl. the new F-18 safety net) pass unchanged.
- **Status date:** 2026-06-14 07:25 UTC
- **Status commit:** f8f20f6

### [F-4] `Dialog` interface under-specifies the contract the engine requires

- **Category:** 6 — Leaky abstraction
- **Impact:** Medium
- **Explanation:** The declared `Dialog` interface lists only `streaming`/`autosave_read`/`autosave_write`, but `boot()`/`flushAutosave()`/`dispose()` rely on `preload`/`hasSave`/`dispose` reached through an `any`-typed local — so a conforming Dialog could type-check yet silently skip preload (→ "autosave never resumes").
- **Evidence:** `src/zmachine/engine.ts:18-25` (interface), `:98,154,173` (`const dialog: any` access)
- **Found by:** Coupling & Dependencies
- **Status:** Fixed
- **Status reason:** Declared the engine's real contract on the `Dialog` interface — added `preload?`, `hasSave?`, and `dispose?` (each documented) — and removed all three `const dialog: any` casts in `boot()`/`flushAutosave()`/`dispose()`, which now narrow on the typed optional methods (`if (dialog.preload) …`) instead of reaching through `any`. The methods are **optional** by necessity: `engine.test.ts:104,111` legitimately passes minimal sync/stub Dialogs that omit them (graceful degradation), and a required method would have made those — and any non-IndexedDB Dialog — non-conforming. The win is the contract is now visible at the type boundary rather than silently `any`-accessed, so a maintainer sees exactly which methods the engine may call. Pure type-safety tightening, no behavior change: `tsc -b` green (proves `IdbDialog` + the stubs all remain assignable) and all 20 zmachine tests pass.
- **Status date:** 2026-06-14 08:40 UTC
- **Status commit:** (this commit)

### [F-8] Single flat `kv` store shared by three subsystems with no ownership

- **Category:** 17 — No clear ownership of data
- **Impact:** Medium
- **Explanation:** Autosave snapshots, explicit SAVE/RESTORE file slots, and LLM-fallback translations all live in one IndexedDB object store keyed only by string-prefix convention; no code owns the namespace, so one subsystem's data can't be cleared cleanly and prefix typos silently create orphans.
- **Evidence:** `src/storage/idb.ts:2` (`STORE='kv'`); key builders `src/storage/dialog.ts:3,45`, `src/translate/fallbackCache.ts:3-7`
- **Found by:** Integration & Data
- **Status:** Fixed
- **Status reason:** Gave the shared `kv` namespace a single owner: a central registry `src/storage/idbKeys.ts` (`IDB_KEYS = { autosave, file, xlate }`, sibling to the F-15 localStorage registry `storageKeys.ts`) now declares every key the three subsystems write, each builder documenting its owning module. `dialog.ts` (autosave + explicit save-slot keys) and `fallbackCache.ts` (translation cache key) point at it instead of each carrying a private prefix builder, so a prefix typo can no longer silently orphan data and a future "clear saves / clear cache" UI has one place to learn which prefix belongs to which subsystem. The key string **formats are preserved exactly** (mixed `autosave:`/`file:`/`xlate:` prefixes) — changing one would orphan an existing user's saved games or cached translations, a data-migration cost rather than a cleanup — frozen by `idbKeys.test.ts` (builder-level pins) plus the F-8 safety-net tests added to `dialog.test.ts`/`fallbackCache.test.ts` that read the **literal on-disk key** from the raw store (a round-trip test alone would miss a changed string, since read+write share the builder). **Deliberately not done (ponytail):** splitting the flat store into per-type object stores — that forces a DB version bump for what is still cleanly separable by a now-owned prefix, and the comment in `fallbackCache.ts` already documents that trade-off; the ownership gap (F-8's actual complaint) is closed without it. Pure indirection, behavior-preserving: typecheck green, storage + translate suites green (27).
- **Status date:** 2026-06-14 08:29 UTC
- **Status commit:** (this commit)

### [F-9] Explicit file-write path swallows persist errors (asymmetric with autosave)

- **Category:** 19 — Lack of idempotency / silent loss
- **Impact:** Medium
- **Explanation:** `file_write`/`file_remove_ref` use bare `void this.enqueue(...)` with no `.catch`, unlike the hardened `autosave_write` which attaches a `.catch` + error log — so a failed explicit SAVE persists to the sync `fileCache` but silently never reaches IndexedDB, and a later RESTORE finds nothing.
- **Evidence:** `src/storage/dialog.ts:202,216` (no catch) vs `:136-147` (autosave catch)
- **Found by:** Integration & Data
- **Status:** Fixed
- **Status reason:** Made the explicit SAVE/RESTORE file path symmetric with the hardened `autosave_write`: `file_write` and `file_remove_ref` now attach a `.catch` to the enqueued IndexedDB op and `console.error` a `[savefile] WRITE/REMOVE FAILED` line (name + message) instead of the bare `void this.enqueue(...)` that silently swallowed a failed put/delete. Behavior on the happy path is unchanged (sync `fileCache` still updates first); only the previously-invisible failure path now surfaces. Red/green: new `dialog.filewrite-error.test.ts` mocks `./idb` to reject and asserts both failures are logged; all 16 storage tests + typecheck green.
- **Status date:** 2026-06-14 08:37 UTC
- **Status commit:** (this commit)

### [F-10] GlkOte "update" protocol consumed by unversioned shape-sniffing

- **Category:** 24 — Inconsistent API contracts
- **Impact:** Medium
- **Explanation:** The VM↔React contract is parsed entirely by structural duck-typing (`Array.isArray(entry.lines)` ⇒ grid window, `entry.text` ⇒ buffer window) with `as any` field reads and no version field or schema; resilience depends on the SHA-pinned vendored `glkapi.js` and documentation, so an upstream shape change degrades silently.
- **Evidence:** `src/glkote-react/reduce.ts:175,179`, `src/glkote-react/bridge.ts:97-106`
- **Found by:** Integration & Data

### [F-13] Watchdog/timeout/cap constants scattered with no central config

- **Category:** 22 — Configuration sprawl (with 28 — magic numbers)
- **Impact:** Medium
- **Explanation:** Tunables live wherever they're used and there is no central config module; the worst offender is the primary generate watchdog defined in the UI layer rather than the LLM layer. (Constants are well-named/documented, which softens it from raw magic numbers to sprawl.)
- **Evidence:** `src/ui/Terminal.tsx:27` (`WATCHDOG_MS=8000`), `src/llm/useNaturalLanguage.ts:109,113,120`, `src/translate/useOutputTranslation.ts:40`, `src/llm/guardedGenerate.ts:69`, `src/llm/prompt.ts:11`, `src/translate/missLog.ts:6`
- **Status:** Fixed
- **Status reason:** Added a central `src/llm/config.ts` for the natural-language pipeline's timing/cap tunables and relocated the scattered constants into it: `GENERATE_WATCHDOG_MS` (the named "worst offender" — was `WATCHDOG_MS` in the **UI layer** `Terminal.tsx`, now lifted into the LLM layer), `LOAD_WATCHDOG_MS`/`MAX_CLAUSES`/`QUEUE_CAP` (were module-local in `translatePipeline.ts`), and `PROMPT_CONTEXT_CAP` (was `CONTEXT_CAP` in `prompt.ts`). Values are unchanged, so it is behavior-preserving — pinned by a new `config.test.ts` plus the existing behavior tests (`MAX_CLAUSES=8` at useNaturalLanguage.test :848/897, `QUEUE_CAP=4` at :1377, `CONTEXT_CAP=1500` at prompt.test :53). **Deliberately left in place** as cohesive single-consumer constants, not cross-cutting sprawl: the capability-detection buffer thresholds (`SMALL/FULL_MIN_BUFFER` in `capability.ts`) and the output-translation miss-log cap (`MISS_CAP` in `missLog.ts`). Full suite green (759), typecheck green.
- **Status date:** 2026-06-14 08:48 UTC
- **Status commit:** (this commit)
- **Found by:** Error Handling & Observability

### [F-14] Inconsistent logging conventions; no logger abstraction

- **Category:** 34 — Inconsistent error/logging conventions
- **Impact:** Medium
- **Explanation:** Some logs are prefixed and structured (`[autosave]`, `[glk]`, `[nl]`, `[xlate]`) while others are bare strings or function-name style, and channel choice (info/warn/error) is uneven — every site calls `console.*` directly, so consistent tag-filtering is impossible for UI-layer messages.
- **Evidence:** `src/ui/App.tsx:72`, `src/ui/Terminal.tsx:86,198`, `src/llm/nlpref.ts:35`, `src/llm/capability.ts:74`
- **Found by:** Error Handling & Observability
- **Status:** Fixed
- **Status reason:** Added a thin tag-scoped logger (`src/logger.ts`: `createLogger(tag)` → `{debug,info,warn,error}`) and adopted it at **every** first-party logging site, so the codebase now has one logging mechanism with a consistent `[tag]` prefix and explicit channel. Converted: `ui` (App/Terminal — the previously-bare `story load failed`/`boot failed`/`submit ignored`), `nl` (translatePipeline, plus nlpref/capability/engine.webllm — dropping the `readNlPref:`/`detectCapability:`/`isCached:` function-name style), `xlate` (fallbackResolve), `glk` (bridge), and `autosave`/`savefile` (dialog). The logger folds the tag into the first string arg, so existing `[nl] …`/`[xlate] …` assertions stayed green; only the bare-site assertions (App/Terminal → `[ui]`) and the one two-arg `[glk]` test needed updating. A grep confirms zero `console.*` calls remain in first-party code outside `logger.ts`. New `logger.test.ts` pins the convention; full suite green (763), typecheck green.
- **Status date:** 2026-06-14 08:58 UTC
- **Status commit:** (this commit)

### [F-17] Game-loop coordination logic embedded in `Terminal.tsx`

- **Category:** 25 — Business logic in the UI
- **Impact:** Medium
- **Explanation:** `Terminal.tsx` is more than a view: it constructs the engine + gate, owns the watchdog config, runs the boot/dispose + capability lifecycle, and implements the subtle scene-observation timing gate (`nl.observe(view)` deferring to `nl.isSequencing()`) — core game-loop logic inside a component effect.
- **Evidence:** `src/ui/Terminal.tsx:27,51-54,71-104,134-140`
- **Found by:** Error Handling & Observability

### [F-18] Hidden side effects behind a display-overlay signature

- **Category:** 12 — Hidden side effects
- **Impact:** Medium
- **Explanation:** `useOutputTranslation` returns `{lines, status}` but its effect writes the IndexedDB fallback cache, deletes cache keys, appends to the localStorage miss-log, installs a global `window.loquorMisses`, and runs GPU generations — none of which is evident from the signature. (`useNaturalLanguage` is similar.)
- **Evidence:** `src/translate/useOutputTranslation.ts:131,163,243,335,360,401`
- **Found by:** Error Handling & Observability
- **Status:** Fixed
- **Status reason:** Two-part fix. (1) Structural: F-3 already relocated the heaviest hidden effects — IndexedDB cache reads/writes and gate-held GPU generations — into the documented `createFallbackResolver` (`fallbackResolve.ts`) with an explicit interface. (2) Disclosure: the residual hook-level effects are inherent to this overlay feature (scattering them would be worse), so they are now enumerated in an explicit "SIDE EFFECTS (F-18)" inventory in the hook header (the `window.loquorMisses` install, the activation-time `'>'` cache purge, the backlog/status miss-log appends, the unmount abort) and the `OutputTranslation` return type carries a note that producing it is effectful. The mount-time global install is pinned by a new safety-net test. The companion NL-hook disclosure (the report's "useNaturalLanguage is similar") rides with the F-2 commit.
- **Status date:** 2026-06-14 07:27 UTC
- **Status commit:** 079f65f

### [F-19] Uneven swallowed-error policy (`isCached` masks faults)

- **Category:** 20 — Weak error handling strategy
- **Impact:** Medium
- **Explanation:** Many `.catch(() => {})` swallows are defensible "never break play" decisions, but the policy is uneven: `engine.webllm.ts` `isCached()` silently returns `false` on any fault — indistinguishable from "not cached", with no diagnostic — whereas `capability.ts` deliberately logs the same class of probe failure.
- **Evidence:** `src/llm/engine.webllm.ts:114-121` vs `src/llm/capability.ts:71-74`; other swallows at `src/translate/useOutputTranslation.ts:163,335,372,376`, `src/translate/fallbackCache.ts:19`
- **Found by:** Error Handling & Observability
- **Status:** Fixed
- **Status reason:** Aligned `isCached()`'s swallow with the deliberate policy already used by `capability.ts` for the same probe class: the catch now `console.warn('isCached: model-cache probe failed', err)` before returning `false`, so a genuine probe fault (e.g. IDB blocked) is no longer indistinguishable from a real cache miss. The degrade-to-false contract is preserved — a probe fault still never blocks play. (The other listed swallows in `useOutputTranslation`/`fallbackCache` were assessed as defensible "never break play" decisions and left as-is; F-19's specific complaint was the _inconsistency_ at this site.) Red/green: new test in `engine.webllm.test.ts` rejects the probe and asserts the warn fires + `false` is returned; preceded by the Safety Net characterization pinning the happy path.
- **Status date:** 2026-06-14 08:38 UTC
- **Status commit:** (this commit)

### [F-16] Observability is two good islands surrounded by ad hoc logging

- **Category:** 21 — No observability plan
- **Impact:** Medium
- **Explanation:** Beyond `missLog` and the autosave trace, diagnostics are dev-only `console.log` (some self-described as `TEMP ... Remove`), and the rich runtime error classifications (watchdog vs engine-fault, `ExpectedXlateStop` reasons) hit only the console and are lost at session end — there is no plan tying these into durable signal.
- **Evidence:** `src/llm/useNaturalLanguage.ts:154-161` (`nlDebug` "TEMP"), `src/storage/dialog.ts:5-12`
- **Found by:** Error Handling & Observability
- **Status:** Fixed
- **Status reason:** Completed the durable sink left open by the F-14 groundwork. The F-14 work had already (a) collapsed the ad hoc logging around the two good islands (`missLog`, the autosave trace) into one mechanism and (b) routed the `nlDebug` "TEMP" firehose through the logger's central dev-only `debug` gate — leaving `src/logger.ts` as the single chokepoint. This fix implements the missing piece at that chokepoint: `warn`/`error` now **tee into a capped (200) in-memory ring buffer** (`recentLogs()`), dumpable via `window.loquorLogs()` — mirroring `missLog`'s `window.loquorMisses()` idiom — so the rich runtime classifications (watchdog-vs-engine-fault, `ExpectedXlateStop` reasons, boot failures) are queryable for the life of the session instead of being lost to console scrollback. `info`/`debug` are intentionally not captured (routine/firehose). Red/green: 5 new `logger.test.ts` cases pin capture, level/format, the info/debug exclusion, the 200-cap eviction, and the `window` dump; full suite green (774). **Residual follow-ups (not part of F-16's "no durable sink" complaint, tracked separately in MEMORY.md):** cross-session persistence/telemetry export is a deliberate non-goal for now (warn/error volume + quota make in-memory the right default — the single chokepoint means an export can be added here later without touching call sites), and the `nlDebug` "TEMP" diagnostics are still slated for removal once translation quality is tuned.
- **Status date:** 2026-06-14 08:29 UTC
- **Status commit:** (this commit)

### [F-2] Download/model-lifecycle coupled into the translation hook

- **Category:** 11 — Low cohesion
- **Impact:** Medium
- **Explanation:** Model-download orchestration (progress sampling, ETA, abort/stale guards, preference persistence, modal state) lives in the same hook as the per-clause translation pipeline despite sharing almost no state; a sub-cluster of F-1.
- **Evidence:** `src/llm/useNaturalLanguage.ts:308-395`
- **Found by:** Structure & Boundaries
- **Status:** Fixed
- **Status reason:** Extracted the entire model download / install / phase lifecycle into a new `src/llm/useModelDownload.ts` hook (the `Internal` phase machine, the installed/modal flags, the download refs, the on-disk `isCached` probe effect, and the four player actions `requestDownload`/`cancelDownload`/`declineDownload`/`setLanguage`). Confirmed the only state shared with the translation pipeline is the `notice` UI channel, which stays parent-owned and is passed in. `useNaturalLanguage` dropped from 1042 to 920 lines and now composes the lifecycle hook. Behavior-preserving: full suite (715 tests) green, incl. the new F-2 progress/ETA safety net. (Also added the companion F-18 side-effect disclosure to the NL-hook header.)
- **Status date:** 2026-06-14 07:34 UTC
- **Status commit:** (this commit)

### [F-12] Writes are per-key transactions on fresh connections — ordering, not atomicity

- **Category:** 26 — Poor transactional boundaries
- **Impact:** Low-Medium
- **Explanation:** Each `idbSet`/`idbDel` is its own single-key transaction on a freshly-opened connection; `writeChain` gives commit _ordering_ but not atomicity, and in-memory caches are updated before the async persist confirms — so a crash between cache-update and commit leaves cache and DB divergent for the session.
- **Evidence:** `src/storage/idb.ts:16-37`, `src/storage/dialog.ts:73-97,126,215`
- **Found by:** Integration & Data
- **Status:** Won't fix
- **Status reason:** Accepted for a single-process browser app (developer decision, 2026-06-14). Each `idbSet`/`idbDel` is its own single-key transaction on a fresh connection — commit _ordering_ (via the `writeChain`) but not multi-key atomicity, and caches update before the async persist confirms. The proportionate payoff is thin: there is exactly **one writer process** (no concurrent-process races — type 18 "shared database" is Not applicable here), the `writeChain` already prevents the real-world failure mode (stale-snapshot reordering / "resume a turn behind"), and the only remaining divergence window is a crash _between_ an in-memory cache update and the IndexedDB commit — which affects only single-user local game state and self-heals on the next successful turn-boundary autosave. Making writes atomic would mean batching multi-key transactions on a shared long-lived connection: real added complexity for a divergence with no data-loss consequence and no second observer. Deliberately accepted rather than built; revisit only if a future feature introduces a genuine multi-key all-or-nothing invariant.
- **Status date:** 2026-06-14 08:29 UTC
- **Status commit:** (decision only — no code change)

### [F-6] Shared engine infra misfiled under the NL feature directory

- **Category:** 3 — Tight coupling (foldering)
- **Impact:** Low-Medium
- **Explanation:** `EngineGate` and `runGenerationGuarded` are game/NL-agnostic infrastructure but sit under `src/llm/`, so the output-translation layer must import "up" into the input-feature folder, making two peer features look entangled even though the import graph is acyclic.
- **Evidence:** `src/translate/useOutputTranslation.ts:12-13` importing `src/llm/engineGate.ts`, `src/llm/guardedGenerate.ts`
- **Found by:** Coupling & Dependencies
- **Status:** Fixed
- **Status reason:** Moved the two game/NL-agnostic infra modules (`engineGate.ts` = the single-engine priority mutex, `guardedGenerate.ts` = the watchdog generate wrapper) and their tests out of the input-feature folder `src/llm/` into a neutral peer folder `src/shared/` (sibling to `logger.ts`-style cross-cutting infra), via `git mv` to preserve history. The output-translation layer now imports from `../shared/` (a peer infra folder) instead of "up" into `../llm/` (a peer _feature_ folder), so the two features no longer look entangled. Updated all 8 importers. **Residual (deliberately out of scope):** `shared/guardedGenerate` keeps a _type-only_ import of the `LlmEngine`/`ChatMessages` interfaces from `../llm/types` — a dependency on the engine _contract_, not the input feature; it's erased at runtime and `types.ts` imports neither moved file, so there is no cycle. Fully neutralizing it would mean relocating the `LlmEngine` abstraction too (the broader "`src/llm/` is both engine + feature" overload), which is beyond F-6's scope. Pure relocation, behavior-preserving: typecheck green, full suite green (765).
- **Status date:** 2026-06-14 07:48 UTC
- **Status commit:** (this commit)

### [F-5] Mandatory call ordering inside `boot()` (preload → prepare → init)

- **Category:** 27 — Temporal coupling
- **Impact:** Low-Medium _(verifier adjusted down from Medium — well-documented and intrinsic to the ifvms contract)_
- **Explanation:** ZVM reads the autosave synchronously in `start()`, so `dialog.preload(signature)` must run first to warm the sync cache; the required ordering is enforced only by the imperative sequence and comments, not the type system.
- **Evidence:** `src/zmachine/engine.ts:96-101,138-141`
- **Found by:** Coupling & Dependencies
- **Status:** Fixed
- **Status reason:** The intra-`boot()` `preload → prepare → init` ordering can't be expressed in the type system (it's a single private method's statement order), so rather than over-engineer a phantom-typed/sequenced builder for one method, the ordering is now _enforced at runtime at the Dialog boundary_ — the same guard that fixes F-11. If a refactor ever moves `Glk.init()` (which synchronously triggers `autosave_read`) ahead of `await dialog.preload(...)`, `IdbDialog.autosave_read` finds no cache entry and warns loudly instead of silently failing to resume. Added a back-reference comment at the `preload` call site so the coupling and its enforcement are discoverable from the engine. Behavior-preserving on the happy path (real boots always preload first); typecheck + the engine resume tests green.
- **Status date:** 2026-06-14 07:44 UTC
- **Status commit:** (this commit)

### [F-11] Sync/async impedance at the ZVM↔IndexedDB seam

- **Category:** 16 — Synchronous-only integration
- **Impact:** Low
- **Explanation:** ifvms calls `autosave_read` synchronously during `start()` but IndexedDB is async, so the engine must preload into a sync `Map` cache before boot; correctly mitigated today, but a latent footgun if a future caller forgets to preload.
- **Evidence:** `src/storage/dialog.ts:104-148` (`preload` warms cache; `autosave_read` reads only cache)
- **Found by:** Integration & Data
- **Status:** Fixed
- **Status reason:** Fixed jointly with F-5 (same seam). The latent footgun — "a future caller forgets to preload, so the sync `autosave_read` silently returns null and the game starts over" — is now loud: `autosave_read` distinguishes a _never-preloaded_ signature (`!cache.has(sig)`) from a _preloaded-but-empty_ one (`cache.has(sig)`, value `null`) — since `preload` always does `cache.set(sig, v ?? null)` — and `console.warn`s `[autosave] … before preload — autosave will not resume (boot ordering bug)` in the skip case while still degrading to null. The genuine "fresh start" path (preloaded, no save) stays silent. The sync/async impedance itself is intrinsic to the ifvms contract and correctly mitigated by the preload cache; this fix removes its only remaining sharp edge (silent misuse). Red/green: new `dialog.test` cases pin (a) warn-on-skip, (b) no-warn-on-preloaded-empty; the existing pre-preload characterization test now owns the warning via a spy. 16→18 storage tests green, typecheck green.
- **Status date:** 2026-06-14 07:44 UTC
- **Status commit:** (this commit)

### [F-7] Two "translate" namespaces create a reader hazard

- **Category:** 6 — Leaky abstraction (naming ambiguity)
- **Impact:** Low
- **Explanation:** `src/llm/translate.ts` (NL input translator) and `src/translate/` (output-translation package) collide in name; `../translate` inside `src/llm/` resolves to the sibling file, which a maintainer can easily mis-read as a cross-layer input→output import (the cost side of S-G).
- **Evidence:** `src/llm/scene/tracker.ts:11`, `src/llm/grammar/buildGrammar.ts:3` (`../translate` = `src/llm/translate.ts`)
- **Found by:** Coupling & Dependencies
- **Status:** Fixed
- **Status reason:** Renamed `src/llm/translate.ts` → `src/llm/inputTranslate.ts` (it is the NL **input** translator) and its test, via `git mv`. The collision is gone at the source: the misleading `../translate` imports inside `src/llm/` subdirs (`scene/tracker.ts`, `grammar/buildGrammar.ts`) are now `../inputTranslate`, which cannot be misread as the `src/translate/` output package, and same-dir `./translate` imports are now `./inputTranslate`. Updated all 9 importers (8 inside `src/llm/` + `src/zmachine/engine.test.ts`). This also removes the documented cost side of S-G (the naming hazard). Pure rename, behavior-preserving: typecheck green, full suite green (765).
- **Status date:** 2026-06-14 07:50 UTC
- **Status commit:** (this commit)

### [F-15] Inconsistent localStorage key naming; no key registry

- **Category:** 22 — Configuration sprawl
- **Impact:** Low
- **Explanation:** Persisted keys mix schemes — `loquor-theme` (hyphen) vs `loquor.nl` and `loquor.xlate.misses` (dot) — each a private const in its own module, so collision-avoidance and migration rely on per-author discipline.
- **Evidence:** `src/ui/useTheme.ts:4`, `src/llm/nlpref.ts:5`, `src/translate/missLog.ts:7`
- **Found by:** Error Handling & Observability
- **Status:** Fixed
- **Status reason:** Added a central key registry `src/storageKeys.ts` (`LS_KEYS = { theme, nlPref, miss }`, sibling to `logger.ts`) and pointed all three modules at it (`useTheme`/`nlpref`/`missLog` now read `LS_KEYS.*` instead of a private `const KEY`), so every persisted key is declared and visible in one place — collision-avoidance and future migration no longer rely on per-author discipline. The string **values are deliberately preserved exactly** (mixed `loquor-theme` hyphen / `loquor.nl` / `loquor.xlate.misses` dot): changing one would orphan an existing user's saved theme choice, NL opt-in, or miss log — a data-migration cost, not a cosmetic cleanup — so the registry freezes and documents the drift rather than "fixing" the delimiters. Kept it a flat frozen object, not a key-builder (three static keys don't warrant one). Safety net: the existing `useTheme.test`/`nlpref.test`/`missLog.test` already pin the three literal strings, so any accidental value change in the registry breaks them; all 20 pass unchanged, full suite green (765), typecheck green.
- **Status date:** 2026-06-14 07:53 UTC
- **Status commit:** (this commit)

## Coverage Checklist

### Flaw/Risk Types 1–34

| #   | Type                                   | Status         | Finding                                           |
| --- | -------------------------------------- | -------------- | ------------------------------------------------- |
| 1   | Global mutable state                   | Not observed   | —                                                 |
| 2   | God object                             | Observed       | F-1, F-3                                          |
| 3   | Tight coupling                         | Observed       | F-6                                               |
| 4   | High/unstable dependencies             | Not observed   | —                                                 |
| 5   | Circular dependencies                  | Not observed   | — (explicitly checked; see S-G)                   |
| 6   | Leaky abstractions                     | Observed       | F-4, F-7                                          |
| 7   | Over-abstraction                       | Not observed   | —                                                 |
| 8   | Premature optimization                 | Not observed   | — (`directions.ts` fast-path is evidence-backed)  |
| 9   | Shotgun surgery                        | Not observed   | —                                                 |
| 10  | Feature envy / anemic domain           | Not observed   | — (domain logic lives with the domain)            |
| 11  | Low cohesion                           | Observed       | F-2                                               |
| 12  | Hidden side effects                    | Observed       | F-18                                              |
| 13  | Inconsistent boundaries                | Not observed   | — (only a Low borderline on `viewToContext`)      |
| 14  | Distributed monolith                   | Not applicable | single-process browser app                        |
| 15  | Chatty service calls                   | Not applicable | no network round-trips (one bulk download)        |
| 16  | Synchronous-only integration           | Observed       | F-11                                              |
| 17  | No clear ownership of data             | Observed       | F-8                                               |
| 18  | Shared database across services        | Not applicable | no other process touches the IndexedDB            |
| 19  | Lack of idempotency                    | Observed       | F-9                                               |
| 20  | Weak error handling strategy           | Observed       | F-19                                              |
| 21  | No observability plan                  | Observed       | F-16                                              |
| 22  | Configuration sprawl                   | Observed       | F-13, F-15                                        |
| 23  | Dependency injection misuse            | Not observed   | — (shallow constructor DI, one root)              |
| 24  | Inconsistent API contracts             | Observed       | F-10                                              |
| 25  | Business logic in the UI               | Observed       | F-17                                              |
| 26  | Poor transactional boundaries          | Observed       | F-12                                              |
| 27  | Temporal coupling                      | Observed       | F-5                                               |
| 28  | Magic numbers/strings everywhere       | Observed       | F-13 (folded in)                                  |
| 29  | "Utility" dumping ground               | Not observed   | —                                                 |
| 30  | Security as an afterthought            | Observed       | F-20                                              |
| 31  | Dead code / unused dependencies        | Not observed   | — (all deps imported; data tables gated by tests) |
| 32  | Missing/inadequate test coverage       | Not observed   | — (critical paths covered; see S-O)               |
| 33  | Hard-coded credentials/secrets         | Not applicable | no backend/auth/secrets                           |
| 34  | Inconsistent error/logging conventions | Observed       | F-14                                              |

### Strength Categories S1–S14

| #   | Category                       | Status   | Finding  |
| --- | ------------------------------ | -------- | -------- |
| S1  | Clear modular boundaries       | Observed | S-A      |
| S2  | High cohesion                  | Observed | S-C, S-D |
| S3  | Loose coupling                 | Observed | S-F, S-H |
| S4  | Dependency direction is stable | Observed | S-E      |
| S5  | Dependency management hygiene  | Observed | S-G      |
| S6  | Consistent API contracts       | Observed | S-I      |
| S7  | Robust error handling          | Observed | S-K      |
| S8  | Observability present          | Observed | S-L      |
| S9  | Configuration discipline       | Observed | S-M      |
| S10 | Security built-in              | Observed | S-N      |
| S11 | Testability & coverage         | Observed | S-O      |
| S12 | Resilience patterns            | Observed | S-J      |
| S13 | Domain modeling strength       | Observed | S-C      |
| S14 | Simple, pragmatic abstractions | Observed | S-B      |

## Hotspots

1. **`src/llm/useNaturalLanguage.ts`** (1042 lines) — the single largest concentration of
   logic and the highest-impact structural debt (F-1, F-2). It mixes the translation
   pipeline, queue, scene tracking, watchdogs, and an unrelated model-download lifecycle.
   Already flagged in MEMORY.md as a deferred extraction.
2. **`src/storage/dialog.ts` + `src/storage/idb.ts`** — the data-persistence core and the
   densest cluster of risk findings (F-8 shared store, F-9 silent file-write loss, F-11
   sync/async, F-12 transactional boundaries). Also a _strength_ hotspot (serialized
   autosave, uncloneable-path diagnostics) — worth protecting while addressing the gaps.
3. **`src/llm/engine.webllm.ts`** — the sole external-code trust boundary (F-20 unpinned
   WASM) and also a strong isolation seam (S-A, the `loadEpoch` guard in S-J). The one
   place where security follow-up and resilience design intersect.

## Next Questions

1. What is the intended decomposition boundary for `useNaturalLanguage` — split the
   download lifecycle out first (F-2), or extract the pipeline stages (F-1)?
2. Is the silent file-write failure path (F-9) a real risk for explicit SAVE/RESTORE in
   production, or is the explicit-save feature not yet user-reachable?
3. What is the timeline/owner for the documented WebLLM self-hosting/integrity follow-up
   (F-20), and is an explicit `appConfig` with pinned URLs under `public/` planned?
4. Should the shared `kv` store (F-8) gain per-type object stores or a key registry
   before any "reset saves / clear cache" UI is built?
5. Is there appetite for a thin logger abstraction + central constants module (F-13/F-14/
   F-15), or is the current per-module convention an accepted trade-off for a solo app?

## Analysis Metadata

- **Agents dispatched:** 5 specialists (Structure & Boundaries; Coupling & Dependencies; Integration & Data; Error Handling & Observability; Security & Code Quality) + 1 Verifier
- **Scope:** `src/` — ~81 source files, 60 test files
- **Raw findings:** 35 (15 strengths, 20 flaws)
- **Verified findings:** 35 (all confirmed; F-4 wording clarified, F-5 impact lowered to Low-Medium)
- **Filtered out:** 0 (specialists self-filtered below-threshold candidates, e.g. global mutable state, dead code, `viewToContext` placement)
- **By impact:** Strengths — 7 High, 6 Medium. Flaws — 2 High, 11 Medium, 4 Low-Medium/Low (F-5/F-12 Low-Med; F-6 Low-Med; F-7/F-11/F-15 Low).
- **Steering files consulted:** `CLAUDE.md` (verified accurate against code — no drift; the "Known network egress" section is confirmed by F-20), `MEMORY.md` (corroborates F-1 as a known deferred follow-up)
