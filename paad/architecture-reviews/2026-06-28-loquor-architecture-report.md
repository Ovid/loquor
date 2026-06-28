# Architecture Report — Loquor

**Date:** 2026-06-28
**Commit:** b3e3385503ac5f49b9688d7b48f1ce4374f2ac49
**Languages:** TypeScript, React 19, Vite 8, Vitest (fully client-side SPA — no backend)
**Key directories:** `src/zmachine/`, `src/glkote-react/`, `src/storage/`, `src/llm/` (+ `lexicon/`, `grammar/`, `scene/`), `src/translate/` (+ `corpus/`), `src/ui/`, `src/shared/`
**Scope:** Full repository (`src/` only; vendored read-only dirs `ifvms.js/`, `web-llm/`, `zork1-3/`, `vendor/glkote/` excluded as external deps)

## Repo Overview

Loquor is a fully client-side web app for playing Zork I/II/III in the browser on top of the `ifvms.js` Z-machine, with a custom React UI. Two headline systems sit on the playable engine: a **natural-language INPUT layer** (English/French/German/Spanish + Georgian → canonical Zork command, deterministic-first with an optional WebLLM fallback) under `src/llm/`, and an **output-translation overlay** (translates game output to FR/ES/DE/Georgian via a pre-translated corpus + LLM fallback) under `src/translate/`. There is no server: the VM, fonts, and story files are self-hosted; the one documented network egress is a one-time, opt-in WebLLM model download.

Size: **121 non-test source files** (223 with tests; 101 test files). Medium scope. The git history shows a deliberate, recent architecture-hardening campaign (`fix(architecture): [F-3/F-5/F-6/F-13/F-14/F-17]` commits) that extracted shared infrastructure and decomposed several god-hooks — much of the strength below is the visible result of that work.

The architecture is genuinely well-layered. **madge reports zero circular dependencies across all 233 files**, the VM core never reaches up into UI/feature layers, and the dominant pattern is pure reducers + injectable seams. The structural debt that remains is concentrated in two places: the **NL translate pipeline** (a god-function) and the **multilingual language model** (scattered language facts with no central descriptor), plus one concrete player-facing gap (boot failure isn't surfaced).

## Strengths

### [S-a] Registry pattern for multilingual data
- **Category:** S1 — Clear modular boundaries
- **Impact:** High
- **Explanation:** The three data-bearing subsystems (vocab, input lexicon, output corpus) each expose exactly one registry object and one or two pure accessors, so consumers never reach into the data files directly — the spine that keeps the multilingual scattering manageable.
- **Evidence:** `src/translate/corpus/index.ts:17-29` (`CORPORA`/`corpusFor`/`corporaFor`), `src/llm/grammar/index.ts:23-32` (`BY_SIGNATURE`/`vocabForSignature`), `src/llm/lexicon/index.ts:21-44` (`CORES`+`NOUNS`/`coreLexicon`+`nounLexicon`). The corpus header comment states the parallel to the lexicon registry is deliberate.
- **Found by:** Structure & Boundaries

### [S-b] `LlmEngine` injection seam (one interface, two faithful impls)
- **Category:** S3 — Loose coupling / S6 — Consistent API contracts
- **Impact:** High
- **Explanation:** A single `LlmEngine` interface with two implementations; `FakeLlmEngine` faithfully mirrors `WebLlmEngine`'s contract (throws "engine not loaded" before load, returns `''` on grammar-free vs `ABSTAIN` on constrained, honors `AbortSignal`, mirrors the post-load abort recheck). Textbook clean test seam.
- **Evidence:** `src/llm/types.ts:55-76` (`LlmEngine`); `src/llm/engine.fake.ts:56,64-67,78` vs `src/llm/engine.webllm.ts:77,82-83,95`; sole production instantiation at `src/ui/Terminal.tsx:85`.
- **Found by:** Coupling & Dependencies + Integration & Data (cross-specialist agreement)

### [S-c] Stable dependency direction (core never depends on leaves)
- **Category:** S4 — Dependency direction is stable
- **Impact:** High
- **Explanation:** `zmachine`/`storage`/`glkote-react` import nothing from `ui`/`llm`/`translate` in production; the few cross-layer references are all `import type` (erased at runtime). `grammar/index` is a low-level constant module both `lexicon/index` and `corpus/index` depend *down* onto — no inverted dependency. madge: zero circular deps across 233 files.
- **Evidence:** grep of `src/zmachine/`, `src/storage/dialog.ts`, `src/glkote-react/`; `src/llm/grammar/index.ts` imports only its own vocab data + types.
- **Found by:** Coupling & Dependencies

### [S-d] Pure reducers hold the VM/UI boundary
- **Category:** S13 — Domain modeling strength / S3 — Loose coupling
- **Impact:** Medium
- **Explanation:** The CLAUDE.md claim "the VM never touches the DOM" is backed by code: the GlkOte bridge reduces update JSON to `ViewState` purely (`reduce.ts` never imports `bridge.ts`), and the scene model is a real `(prev,event)→next` reducer with an idempotent duplicate-turn guard.
- **Evidence:** `src/glkote-react/reduce.ts:1-40`; `src/llm/scene/tracker.ts:146-211` (`reduceScene`, `keyOf`/`lastKey`).
- **Found by:** Structure & Boundaries + Coupling & Dependencies (cross-specialist agreement)

### [S-e] `runGenerationGuarded` deduplicates the concurrency-critical core
- **Category:** S3 — Loose coupling
- **Impact:** High
- **Explanation:** The watchdog/abort/orphan-settle logic both NL hooks need was extracted into one documented function at the right granularity — shared parts centralized, hook-specific parts (sentinel error types, lazy-load watchdog) deliberately left behind. The temporal precondition ("MUST be called inside `EngineGate.run`") is documented with its rationale.
- **Evidence:** `src/shared/guardedGenerate.ts:65-124`.
- **Found by:** Coupling & Dependencies

### [S-f] `EngineGate` — a tiny pragmatic priority mutex
- **Category:** S14 — Simple, pragmatic abstractions
- **Impact:** Medium
- **Explanation:** The entire input-preempts-output arbitration over the one WebLLM engine is a ~20-line class with a `busy` flag and a waiter list; input waiters jump the FIFO queue. The one subtle invariant (gate stays busy across handoff so no `run()` in the microtask window sees a free gate) is documented inline.
- **Evidence:** `src/shared/engineGate.ts:12-31`.
- **Found by:** Structure & Boundaries

### [S-g] Configuration discipline (`config.ts` central + safe defaults)
- **Category:** S9 — Configuration discipline / S5 — Dependency hygiene
- **Impact:** Medium
- **Explanation:** A zero-import leaf of pure constants holds the pipeline tunables with a per-constant rationale; the F-13 refactor lifted `GENERATE_WATCHDOG_MS` out of `Terminal.tsx`, and the file even documents its own out-of-scope boundary. (Partial: two tunables escaped — see F-m/F-n.)
- **Evidence:** `src/llm/config.ts`; git commit `ac7c8b9`.
- **Found by:** Error Handling & Observability + Coupling & Dependencies (cross-specialist agreement)

### [S-h] Resilience / graceful degradation around the one egress
- **Category:** S12 — Resilience patterns
- **Impact:** High
- **Explanation:** The WebLLM download has a genuine multi-layer resilience stack: per-download `AbortController`, a no-progress stall watchdog, one automatic retry with backoff, a monotonic load-epoch guard (a superseded load can't clobber the winner or leak VRAM), and on terminal failure it degrades to grammar-only rather than breaking. IndexedDB matches it (read faults fold to a cache MISS).
- **Evidence:** `src/llm/useModelDownload.ts:194-286`; `src/llm/engine.webllm.ts:29-69`; `src/translate/fallbackCache.ts:12-29`.
- **Found by:** Integration & Data

### [S-i] Persistence idempotency + transactional discipline
- **Category:** S12 — Resilience / S6 — Consistent contracts
- **Impact:** High
- **Explanation:** Save/load is idempotent by construction (keyed `put`/`delete`, overwrite-safe); a serial `writeChain` forces ordering because IndexedDB only guarantees commit order within one connection and each op opens its own — without it, two same-key turn writes could persist "a turn behind." Clear-on-quit uses the same keyed-delete path so a finished game can't auto-resume.
- **Evidence:** `src/storage/dialog.ts:80-114,162-163`; `src/zmachine/engine.ts:170-177` (`flushAutosave`).
- **Found by:** Integration & Data

### [S-j] Typed error taxonomy drives degradation (no message-sniffing)
- **Category:** S7 — Robust error handling
- **Impact:** High
- **Explanation:** Distinct typed sentinels (`WatchdogTimeout`, `ModelLoadError`, `ExpectedXlateStop`, `ABSTAIN`) drive distinct degradation paths via `instanceof`, not `err.message` matching — e.g. only `ModelLoadError` demotes a `full` language to grammar-only while a generate stall stays `full`.
- **Evidence:** `src/llm/translatePipeline.ts:112-135,817,935-936`; `src/translate/fallbackResolve.ts:48,127`; `src/llm/types.ts:52`.
- **Found by:** Error Handling & Observability

### [S-k] Logger ring buffer + live window dumps (observability)
- **Category:** S8 — Observability present
- **Impact:** High
- **Explanation:** A single chokepoint tees every `warn`/`error` into a capped (200-entry) in-memory ring, dumpable live via `window.loquorLogs()`; a parallel `window.loquorMisses()` dumps corpus gaps. A coherent, proportionate observability story for a backend-less app.
- **Evidence:** `src/logger.ts:59-92`; `src/translate/missLog.ts:78-83`.
- **Found by:** Error Handling & Observability

### [S-l] "Loud guard" pattern + persist-failure observability
- **Category:** S7 — Robust error handling / S8 — Observability
- **Impact:** High
- **Explanation:** Silent-failure boundaries are made loud: `autosave_read` distinguishes "preload skipped" (a boot-ordering bug) from "no save → fresh start" via `cache.has(sig)` and warns; the glkapi reducer warns on protocol drift ("the one place a drift is observable"); `idb` rejects on `onblocked`/`onabort` so a quota/version-change can't hang forever; the shared `onPersistFail` replaced fire-and-forget `void idbSet(...)` writes that made "save never persisted" look like success.
- **Evidence:** `src/storage/dialog.ts:15-20,141-146`; `src/glkote-react/reduce.ts:213-217`; `src/storage/idb.ts:12,29`.
- **Found by:** Error Handling & Observability

### [S-m] Safe rendering — no HTML-injection surface
- **Category:** S10 — Security built-in
- **Impact:** High
- **Explanation:** Zero `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function`/`document.write` anywhere in `src/`. All game output, LLM output, and status text reach the DOM as auto-escaped React JSX text children; the reducer only ever builds plain strings.
- **Evidence:** grep over `src/` (zero hits); `src/ui/Scrollback.tsx:127-160`; `src/ui/StatusBar.tsx:35-38`; `src/glkote-react/reduce.ts`.
- **Found by:** Security & Code Quality

### [S-n] LLM-output trust boundary (`parseCommand`)
- **Category:** S10 — Security built-in
- **Impact:** High
- **Explanation:** The single point where untrusted LLM output becomes a game action whitelist-validates every field against the game's own vocab (`emits`/verb-lists/`preps`) and abstains on any mismatch — the model cannot inject an arbitrary command string. Robust against fenced/preambled JSON (extract-and-retry).
- **Evidence:** `src/llm/inputTranslate.ts:681-735`.
- **Found by:** Security & Code Quality

### [S-o] Layered opt-in gating + model allowlist
- **Category:** S10 — Security built-in
- **Impact:** High
- **Explanation:** The one egress is gated three ways: a default-off `loquor.llm` preference (fresh install never reaches egress), a download modal that discloses the third-party fetch by name, and a `KNOWN_MODELS` allowlist so a stray `?model=`/env value can never aim the download at an arbitrary URL.
- **Evidence:** `src/ui/useLlmFeature.ts:16-22`; `src/llm/models.ts:18-34`; `src/ui/ModelDownloadModal.tsx:18`.
- **Found by:** Security & Code Quality

### [S-p] Testability & coverage of critical paths
- **Category:** S11 — Testability & coverage
- **Impact:** High
- **Explanation:** Every critical path is genuinely tested — save/load round-trip + signature isolation + persist-failure, the protocol reducer, the engine gate (incl. preemption/wake-race), the model-download abort/late-land path, and the abstain/routing policy. `engine.fake` and the `?model=` override are clean seams; the UAT suite asserts `generateCalls === 0` on deterministic paths.
- **Evidence:** `src/storage/dialog.test.ts`, `src/glkote-react/reduce.test.ts`, `src/shared/engineGate.test.ts`, `src/llm/engine.webllm.test.ts`, `src/llm/pipeline.uat.test.tsx`.
- **Found by:** Security & Code Quality

## Flaws/Risks

### [F-a] Shotgun surgery — adding/maintaining a language touches ~30+ files with no central descriptor
- **Category:** Flaw 9 — Shotgun surgery
- **Impact:** High
- **Explanation:** Language identity is re-declared across five disjoint unions/sets, a flat per-direction map, and ~20 multilingual notice functions; there is no single "language descriptor" capturing "has input lexicon? has corpus? has LLM? affirmatives? articles?". This is the project's central, explicitly-stated design constraint ("a fix in one language is usually a fix in all"), and the mechanism amplifies the cost of every such fix.
- **Evidence:** `src/llm/types.ts:5,22` (`NL_LANGUAGES`/`OUTPUT_ONLY_LANGS`), `src/llm/lexicon/types.ts:8,16` (`LexLang`/`InputLexLang`), `src/translate/corpus/index.ts:15` (`CORPUS_ONLY_LANGS`), `src/llm/directions.ts:25-186` (interleaved per-direction map), `src/llm/notices.ts` (20 export fns); plus 18 lexicon + 18 corpus per-language data files.
- **Found by:** Structure & Boundaries
- **Status:** Fixed
- **Status reason:** Collapsed the language-MEMBERSHIP drift (the High-impact core) into one source of truth: `LEX_LANGS`/`INPUT_LEX_LANGS` are now `as const` arrays in `lexicon/types.ts` from which the `LexLang`/`InputLexLang` TYPES derive (preserving the `ka`-is-a-compile-error-in-LLM-maps guarantee) AND the runtime Sets `OUTPUT_ONLY_LANGS` (`llm/types.ts`) + `CORPUS_ONLY_LANGS` (`corpus/index.ts`) derive — so "which languages have an input lexicon / lack an LLM" is declared once, not in 4 hand-maintained places. Added an executable coherence anchor (`types.test.ts` "language membership coherence (F-a anchor)") that fails if a new `NL_LANGUAGES` member is left unclassified — the "a fix in one language is a fix in all" mandate made enforceable. Folded the two stray parallel unions the report's evidence missed (`nlModeSummary.ts` `'en'|'fr'|'de'|'es'` → `'en'|LexLang`; `composed-families.ts` `EXEMPTIONS` → `Record<LexLang>`). **Deliberately NOT done** (adversarial-review decision, ratified with Ovid): a single mega-`LanguageProfile` folding directions/notices/affirmatives — that would INVERT strength S-a (cohesive per-subsystem registries) and weaken the type guarantee; those stay as per-facet modules. madge still reports 0 cycles (`lexicon/types` stays an import-free leaf).
- **Status date:** 2026-06-28 09:58 UTC
- **Status commit:** (backfilled below)

### [F-b] God function — `createTranslate`/`runLine`
- **Category:** Flaw 2 — God object (function)
- **Impact:** High
- **Explanation:** One ~670-line closure owns stages 1-8, the compound loop, the F-A queue drain, epoch/stale handling, demotion, and all abstain/notice policy; it mutates a 9-field ref bag, depends on 17-18 injected things, and encodes the same EN-raw / ka-ASCII-raw / non-EN-notice decision in multiple in-file locations (a localized shotgun surgery). The densest, highest-risk file in the app; its own header is an apology for the size.
- **Evidence:** `src/llm/translatePipeline.ts:458-483` (`TranslateDeps`), `:491-1163` (`createTranslate`), `:652+` (`runLine`), `:940-1007` + `:1064-1098` (duplicated abstain decision).
- **Found by:** Structure & Boundaries

### [F-c] `ka`-routing logic re-derived across 4 layers
- **Category:** Flaw 13 — Inconsistent boundaries
- **Impact:** Medium-High
- **Explanation:** `kaInputActive` is the stated single source of truth, yet its consequences are recomputed ad hoc in the Terminal, the NL hook, and the pipeline drain, and the `containsGeorgian` raw-send branch appears at three sites. The boundary between "the hook decides routing" and "the pipeline decides routing" has drifted — both do. CLAUDE.md's lengthy `ka` rules are prose standing in for this missing centralization.
- **Evidence:** `src/llm/lexicon/index.ts:270-272` (`kaInputActive`); recomputed at `src/ui/Terminal.tsx:197-209`, `src/llm/useNaturalLanguage.ts:298-314`, `src/llm/translatePipeline.ts:966-991,1048-1062`; `containsGeorgian` branch at `translatePipeline.ts:723,966,990`.
- **Found by:** Structure & Boundaries
- **Status:** Partially fixed
- **Status reason:** The genuine DUPLICATION the flaw names — the `containsGeorgian` en/ka-ASCII raw-send predicate inlined at three sites in `translatePipeline.ts` (723, 966, 990) — is centralized into one `rawSendsToParser(lang, line)` helper next to `containsGeorgian`; the two `sendTracked` branches (en, ka-ASCII) merged into one. Behavior-preserving (pinned by `translatePipeline.test.ts:964/981/1015`). The OTHER sites the report lists are NOT duplication and were deliberately left: (1) the `OUTPUT_ONLY_LANGS.has(language) && lex===null` bail at `translatePipeline.ts:~1055` is a documented DISTINCT predicate ("no-LLM language AND no lexicon", comment at 1044-1051: "the coupling is the meaning here, not a leftover"), not a copy of the raw-send decision; (2) `Terminal.tsx:197-209` and `useNaturalLanguage.ts` consume the already-centralized `kaInputActive` + `OUTPUT_ONLY_LANGS` SSOTs to compute per-render view flags — correct reuse of a single source, and collapsing those into one threaded value is the `Terminal` god-component decomposition (F-d), not this flaw. Adversarial review confirmed this addresses the duplication half of F-c; the remainder is intentional.
- **Status date:** 2026-06-28 09:58 UTC
- **Status commit:** (backfilled below)

### [F-d] `Terminal.tsx` — god component / concrete-wiring hub
- **Category:** Flaw 2 — God object / Flaw 3 — Tight coupling
- **Impact:** Medium
- **Explanation:** 598 lines, 32 imports, 12 `useState`/`useRef`, 8 `useEffect` (including a 45-line M2 migration that does localStorage + async cache-probe + live-intent re-check), ~13 derived view flags, and 4-way `onSubmit` routing; it also directly `new`s `WebLlmEngine` and `EngineGate`. Largely appropriate as the composition root (and `useGameEngine`/`useLlmFeature` were already extracted), but it is the highest-coupling, highest-churn module — change here is frequent and risky.
- **Evidence:** `src/ui/Terminal.tsx:55-598`, `:85,88` (instantiation), `:197-209` (flags), `:284-329` (M2 migration), `:472-502` (onSubmit).
- **Found by:** Structure & Boundaries + Coupling & Dependencies (cross-specialist; the higher Medium impact is the reconciled verdict)

### [F-e] Feature envy — `scene/tracker` imports `refusalApplies` from `inputTranslate`
- **Category:** Flaw 10 — Feature envy / misplaced logic
- **Impact:** Low-Medium
- **Explanation:** The scene reducer depends on a "what counts as a failed command" predicate housed in the input-parse module, creating a back-edge from the scene domain into the parsing module. The shared predicate is intentional, but its home belongs in a shared output-classification module both layers import.
- **Evidence:** `src/llm/scene/tracker.ts:11,199` imports/uses `refusalApplies` defined at `src/llm/inputTranslate.ts:596`.
- **Found by:** Structure & Boundaries

### [F-f] Global mutable state — logger ring + `window.*` globals
- **Category:** Flaw 1 — Global mutable state
- **Impact:** Low
- **Explanation:** A module-level mutable `ring` array (reset by `clearLogs`) and `window.loquorLogs`/`loquorMisses` assigned at import time are the one true (non-`WeakMap`) mutable singleton. Bounded (cap 200) and copy-on-read, so the blast radius is small, but tests must remember to clear it and the `window` assignment runs at module load. (Same code is the S-k observability strength — both are true; it's a deliberate trade.)
- **Evidence:** `src/logger.ts:77,88,90-92`; `src/translate/missLog.ts:80-83`.
- **Found by:** Structure & Boundaries

### [F-g] Three overlapping language sub-types (`LexLang`/`InputLexLang`/`OutLang`)
- **Category:** Flaw 11 — Low cohesion
- **Impact:** Low-Medium
- **Explanation:** `OutLang` is structurally identical to `InputLexLang` but declared in a different module; the output hook then re-derives `lexLang` at runtime via `CORPUS_ONLY_LANGS.has(...)`, encoding the same "`ka` has no LLM" fact in a type union *and* a runtime Set *and* per-call guards. Correct but low-cohesion belt-and-suspenders — a symptom of the missing language descriptor (F-a).
- **Evidence:** `src/translate/useOutputTranslation.ts:42,135-148` (`OutLang`); `src/llm/lexicon/types.ts:8-16` (`LexLang`/`InputLexLang`).
- **Found by:** Structure & Boundaries
- **Status:** Fixed
- **Status reason:** `OutLang` was `LexLang | 'ka'` — structurally identical to `InputLexLang` declared in another module, so the dup could drift. Replaced with `export type OutLang = InputLexLang` (pure-type alias, zero behavior change, typecheck-pinned). Combined with the F-a change (the runtime `ka`-membership fact now derives from the same `INPUT_LEX_LANGS` array), the "ka has no LLM" fact is no longer belt-and-suspendered across a type union AND a runtime Set AND a separate `OutLang` union. NB: the report's "runtime re-derivation of `lexLang` via `CORPUS_ONLY_LANGS.has(...)`" at `useOutputTranslation.ts:135-148` is intentionally KEPT — it narrows `OutLang→LexLang` for the LLM-fallback machinery (the place the `ka`-is-a-compile-error guarantee is enforced), so it's a deliberate type narrowing, not drift.
- **Status date:** 2026-06-28 09:58 UTC
- **Status commit:** (backfilled below)

### [F-h] Temporal coupling — boot `preload → prepare → init` ordering
- **Category:** Flaw 27 — Temporal coupling (= Flaw 16 sync integration, deduped)
- **Impact:** Low
- **Explanation:** `boot()` requires `dialog.preload(signature)` to complete before `vm.prepare()`/`Glk.init()`, because `ZVM.start()` reads autosave synchronously. Real, type-unexpressible temporal coupling — but confined to one method, documented, and defended by a loud runtime guard (`autosave_read` warns if the cache wasn't warmed). A refactor that reorders `Glk.init()` ahead of `preload()` would break it.
- **Evidence:** `src/zmachine/engine.ts:109-158`; `src/storage/dialog.ts:121-154` (sync cache + guard).
- **Found by:** Coupling & Dependencies + Integration & Data (cross-specialist; same sync-preload coupling)

### [F-i] Leaky abstraction — `createFallbackResolver` shares the hook's mutable refs
- **Category:** Flaw 6 — Leaky abstraction
- **Impact:** Medium
- **Explanation:** `FallbackResolverDeps` requires the caller to hand over five of `useOutputTranslation`'s internal mutable refs (`epochRef`, `basisRef`, `retryRef`, `acsRef`, `setOverlay`); `settle()`/`failEnglish()` mutate the hook's live state through them. A deliberate, documented F-3 decomposition that makes the dense logic testable — but the "extraction" shares mutable state rather than a clean interface, so the two must keep their epoch/basis invariants in sync across the boundary.
- **Evidence:** `src/translate/fallbackResolve.ts:54-70`.
- **Found by:** Coupling & Dependencies

### [F-j] GlkOte protocol + autosave snapshot are unversioned, shape-sniffed
- **Category:** Flaw 24 — Inconsistent API contracts
- **Impact:** Medium
- **Explanation:** The VM↔React "update" contract has no version field; the reducer discriminates windows by structural shape (`lines[]` ⇒ grid, `text[]` ⇒ buffer) and parses flat alternating `[style,text,...]` runs by index parity, and the autosave snapshot is an unversioned IndexedDB blob. Brittle to an upstream bump of the SHA-pinned `glkapi.js` or external `ifvms`; defended by a loud drift warn + restore-path validation, but there is no version handshake for snapshot-schema migration.
- **Evidence:** `src/glkote-react/reduce.ts:196-200,13-20,213-217`; `src/glkote-react/types.ts:91`; `src/glkote-react/bridge.ts:158,170-191`.
- **Found by:** Integration & Data

### [F-k] Unconditional full-tail autosave write every turn (no equality dedup)
- **Category:** Flaw 26 — Poor transactional boundaries / Flaw 17 — data co-ownership cost
- **Impact:** Low
- **Explanation:** On every turn boundary, `save_allstate` rebuilds `view.lines.slice(-500)` and `autosave_write` `put`s the whole (VM snapshot + transcript tail) blob with no unchanged-check. Capped (`SNAPSHOT_MAX_LINES`, so no longer O(transcript)) but still ~O(500) per turn with no idempotent short-circuit. The transcript tail must ride along because the bridge co-owns UI-only `nl-source`/`nl-canonical` lines the VM's replay can't reproduce — intentional, but it's why the full tail is re-persisted.
- **Evidence:** `src/glkote-react/bridge.ts:229-239`; `src/storage/dialog.ts:155-174`.
- **Found by:** Integration & Data

### [F-l] Boot failure is logged but never surfaced to the player
- **Category:** Flaw 20 — Weak error handling / Flaw 21 — observability gap
- **Impact:** Medium
- **Explanation:** `engine.boot(...).catch(err => log.error('boot failed', err))` sends the error only to the console/ring. The `loadError` user-facing surface is wired solely to `App.tsx`'s story-*fetch* path, not to `boot()`. So a story that fetches OK but fails to boot (corrupt/unsupported story, glk init throw) yields a blank/frozen terminal with no message — a dead-end for the player. **This is the one finding naming a concrete unhandled player-facing failure** (see Next Questions / the CLAUDE.md "player experience first" rule).
- **Evidence:** `src/ui/useGameEngine.ts:54-56`; `src/ui/App.tsx:74-76`; `src/ui/Landing.tsx:251`.
- **Found by:** Error Handling & Observability

### [F-m] `orphanSettleMs` 30_000 inline magic, outside `config.ts`
- **Category:** Flaw 22 — Configuration sprawl
- **Impact:** Low
- **Explanation:** The orphan-settle bound `args.orphanSettleMs ?? 30_000` is an inline default in the exact helper `config.ts` was created to centralize, and both call sites rely on the fallback rather than passing it — the one watchdog tunable that escaped the F-13 sweep.
- **Evidence:** `src/shared/guardedGenerate.ts:69`.
- **Found by:** Error Handling & Observability

### [F-n] `LLM_ANNOUNCE_CLEAR_MS = 7000` UI tunable outside `config.ts`
- **Category:** Flaw 22 — Configuration sprawl / Flaw 28 — magic numbers
- **Impact:** Low
- **Explanation:** A named a11y announce-clear timeout lives inline in the component — the same *class* of timing tunable F-13 explicitly pulled out, with no stated UI-vs-pipeline boundary to say whether it's intentional or a straggler.
- **Evidence:** `src/ui/Terminal.tsx:53`.
- **Found by:** Error Handling & Observability

### [F-o] Two bare `.catch(() => {})` on diagnostic async paths
- **Category:** Flaw 21 — observability gap
- **Impact:** Low
- **Explanation:** The `isCached()` probes in the cached-activation effect and the M2 migration both end in an empty catch that drops a post-probe rejection with no log — inconsistent with the "surface, don't swallow" convention applied everywhere else. Low blast radius (worst case: a one-time notice doesn't show).
- **Evidence:** `src/llm/useModelDownload.ts:144`; `src/ui/Terminal.tsx:323`.
- **Found by:** Error Handling & Observability

### [F-p] WebLLM third-party code execution without integrity verification
- **Category:** Flaw 30 — Security as an afterthought
- **Impact:** Medium
- **Explanation:** `load()` calls `CreateMLCEngine(modelId, {...})` with no `appConfig`, so WebLLM uses its built-in `prebuiltAppConfig` to fetch model weights from `huggingface.co` and the model-lib **WASM from `raw.githubusercontent.com`**, executed in the page origin with no SRI/SHA pin and not self-hosted; there is also no CSP in `index.html` as a compensating control. A compromise of either host (or a tampered cache) would run attacker-controlled WASM in-origin. Honestly disclosed (opt-in + default-off, documented known limitation) but unmitigated in code.
- **Evidence:** `src/llm/engine.webllm.ts:43-49`; `public/` holds only `.z3` story files (no pinned weights); `index.html` (no CSP).
- **Found by:** Security & Code Quality

### [F-q] DI defaulting — `useNaturalLanguage` self-provisions a private gate
- **Category:** Flaw 23 — Dependency injection misuse
- **Impact:** Low
- **Explanation:** `const engineGate = gateArg ?? fallbackGate`, where `fallbackGate` is a hook-local `new EngineGate()`. A future caller that forgets to pass the *shared* gate silently gets a private one and loses input/output arbitration with `useOutputTranslation`, with no type error. Low today — the one production caller wires it correctly.
- **Evidence:** `src/llm/useNaturalLanguage.ts:140-142`.
- **Found by:** Coupling & Dependencies

## Coverage Checklist

### Flaw/Risk Types 1–34
| # | Type | Status | Finding |
|---|------|--------|---------|
| 1 | Global mutable state | Observed | F-f |
| 2 | God object | Observed | F-b, F-d |
| 3 | Tight coupling | Observed | F-d |
| 4 | High/unstable dependencies | Not observed | — |
| 5 | Circular dependencies | Not observed | — (madge: 0) |
| 6 | Leaky abstractions | Observed | F-i |
| 7 | Over-abstraction | Not observed | — |
| 8 | Premature optimization | Not observed | — |
| 9 | Shotgun surgery | Observed | F-a |
| 10 | Feature envy / anemic domain | Observed | F-e |
| 11 | Low cohesion | Observed | F-g |
| 12 | Hidden side effects | Not observed | — |
| 13 | Inconsistent boundaries | Observed | F-c |
| 14 | Distributed monolith | Not applicable | single client bundle |
| 15 | Chatty service calls | Not applicable | no network service calls per turn (local analogue: F-k) |
| 16 | Synchronous-only integration | Observed | F-h |
| 17 | No clear ownership of data | Not observed | ownership clean; co-ownership cost noted in F-k |
| 18 | Shared database across services | Not applicable | one client, one IndexedDB |
| 19 | Lack of idempotency | Not observed | — (save + cache idempotent) |
| 20 | Weak error handling | Observed | F-l |
| 21 | No observability plan | Observed | F-l, F-o (gaps in an otherwise strong story) |
| 22 | Configuration sprawl | Observed | F-m, F-n |
| 23 | Dependency injection misuse | Observed | F-q |
| 24 | Inconsistent API contracts | Observed | F-j |
| 25 | Business logic in the UI | Not observed | policy lives in modules, not Terminal |
| 26 | Poor transactional boundaries | Observed | F-k |
| 27 | Temporal coupling | Observed | F-h |
| 28 | Magic numbers/strings | Observed | F-n |
| 29 | "Utility" dumping ground | Not observed | — |
| 30 | Security as an afterthought | Observed | F-p |
| 31 | Dead code / unused dependencies | Not observed | — (all deps imported) |
| 32 | Missing test coverage (critical paths) | Not observed | — (strong; see S-p) |
| 33 | Hard-coded credentials/secrets | Not observed | — |
| 34 | Inconsistent error/logging conventions | Not observed | — (console discipline holds; one logger) |

### Strength Categories S1–S14
| # | Category | Status | Finding |
|---|----------|--------|---------|
| S1 | Clear modular boundaries | Observed | S-a |
| S2 | High cohesion | Observed | inputTranslate.ts / pure-function libs (folded into S-a) |
| S3 | Loose coupling | Observed | S-b, S-e |
| S4 | Dependency direction stable | Observed | S-c |
| S5 | Dependency management hygiene | Observed | S-g (+ relative-import / `import type` discipline) |
| S6 | Consistent API contracts | Observed | S-b, S-i |
| S7 | Robust error handling | Observed | S-j, S-l |
| S8 | Observability present | Observed | S-k, S-l |
| S9 | Configuration discipline | Observed | S-g |
| S10 | Security built-in | Observed | S-m, S-n, S-o |
| S11 | Testability & coverage | Observed | S-p |
| S12 | Resilience patterns | Observed | S-h, S-i |
| S13 | Domain modeling strength | Observed | S-d |
| S14 | Simple, pragmatic abstractions | Observed | S-f |

## Hotspots

Top 3 files/directories to review:
1. **`src/llm/translatePipeline.ts`** — the densest, highest-risk file: a ~670-line god-function (F-b) with abstain/routing policy duplicated in-file, and a hub of the `ka`-routing leak (F-c). Strong typed-error core (S-j), but the prime decomposition target.
2. **The multilingual language model** (`src/llm/types.ts`, `lexicon/types.ts`, `directions.ts`, `notices.ts`, `translate/corpus/index.ts`) — shotgun surgery (F-a), overlapping type unions (F-g), and `ka`-routing re-derivation (F-c) all trace to a *missing `LanguageProfile`/registry abstraction*. Highest-leverage refactor, and it directly serves the CLAUDE.md "a fix in one language is a fix in all" mandate.
3. **`src/ui/Terminal.tsx`** — god component / wiring hub (F-d), the unsurfaced boot failure (F-l), an inline tunable (F-n), and an empty diagnostic catch (F-o). Highest churn + highest fan-in.

Strong-core hotspots worth protecting as exemplars: **`src/shared/`** (`engineGate.ts` S-f, `guardedGenerate.ts` S-e) and **`src/storage/dialog.ts`** (S-i, S-l) — small, documented, test-covered, and the right granularity.

## Next Questions

1. Is there appetite for a single `LanguageProfile` descriptor (or registry) collapsing the scattered language facts — tier unions, directions, notices, affirmatives, `ka`-routing — into one source, given the "a fix in one language is a fix in all" mandate? (Addresses F-a, F-c, F-g together.)
2. Should `createTranslate`/`runLine` be decomposed into explicit per-stage functions plus a single shared abstain-policy function, to remove the duplicated EN-raw / ka-ASCII / non-EN decision? (F-b)
3. Should `engine.boot()` failures surface to the player via the existing `loadError` path rather than only the console — given the CLAUDE.md "player experience overrides product decisions" rule? (F-l)
4. Is the WebLLM SRI / self-hosting follow-up scheduled, and would adding a CSP to `index.html` be an acceptable interim compensating control for the in-origin WASM? (F-p)
5. Should the autosave snapshot blob and the GlkOte update contract carry a schema/protocol version, to guard restore against an `ifvms`/`glkapi.js` upgrade silently breaking it? (F-j)

## Analysis Metadata

- **Agents dispatched:**
  - Structure & Boundaries (flaw types 1,2,9,10,11,13,29; strengths S1,S2,S13,S14)
  - Coupling & Dependencies (3,4,5,6,7,8,23,27; S3,S4,S5)
  - Integration & Data (14-19,24,26; S6,S12)
  - Error Handling & Observability (12,20,21,22,25,28,34; S7,S8,S9)
  - Security & Code Quality (30,31,32,33; S10,S11)
  - Verifier (re-read every referenced file:line; dedup; impact/category validation)
- **Scope:** 121 non-test source files across `src/` (223 with tests); vendored dirs excluded.
- **Raw findings:** ~45 candidate findings across the 5 specialists (incl. several "assessed-clean" non-findings)
- **Verified findings:** 33 (16 strengths, 17 flaws)
- **Filtered out:** ~12 — 5 cross-specialist dedup merges (S-b, S-d, S-g, F-d, F-h) + ~7 "assessed-clean" results folded into the clean list; **0 rejected outright** (every surviving finding cleared 80+ confidence on re-read; only line-numbers/scope adjusted).
- **By impact:** Strengths — 12 High, 4 Medium. Flaws — 0 High… correction: 3 High (F-a, F-b, F-c), 5 Medium (F-d, F-i, F-j, F-l, F-p), 9 Low (F-e, F-f, F-g, F-h, F-k, F-m, F-n, F-o, F-q).
- **Clean results verified:** zero circular deps (madge, 233 files); no hard-coded secrets; no unused npm deps; no orphan source files; data-ownership clean; LLM-fallback cache idempotent; no per-turn chatty LLM (deterministic-first).
- **Steering files consulted:** `CLAUDE.md` (verified accurate against code — no stale-doc contradictions found; the SRI/self-hosting follow-up it flags is confirmed still outstanding), `README.md`, `docs/` specs/plans.
