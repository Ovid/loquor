# Agentic Code Review: ovid/hide-llm-fallback

**Date:** 2026-06-25 22:32:10
**Branch:** `ovid/hide-llm-fallback` -> `main`
**Commit:** 395f60aaf3fcb8a3cb6a066bc85bc60476093b38
**Files changed:** 30 (≈12 source files; the rest are docs + tests) | **Lines changed:** +3423 / -37 (≈1100 of the additions are the plan/design docs)
**Diff size category:** Large

## Executive Summary

This branch hides the experimental WebLLM natural-language model behind one default-off preference (`loquor.llm`), forcing the deterministic grammar-only / corpus-only floor and removing every model-related affordance. The core `effectiveModel = llmEnabled ? internal.model : 'grammar'` discipline is implemented cleanly and consistently — security/privacy is *strengthened* (default-off genuinely closes the documented third-party egress), and plan alignment is complete (all 12 gate points + t1–t5/M2 tests present and asserting). The findings cluster in one place: the Terminal's single shared `llmMsg` notification slot and the `llmEnabled`-unaware download modal, which together produce two Important issues (a stacked dual-focus-trap modal, and an M2-notice race) and two Suggestions. No Critical issues; nothing blocks merge, but the two Important items are worth a fix pass since both touch the a11y contract the branch otherwise upholds.

## Critical Issues

None found.

## Important Issues

### [I1] Toggling the LLM on can stack the download modal on top of the open Preferences modal (two simultaneous focus traps)
- **File:** `src/ui/Terminal.tsx:326` (`upgradeModalOpen = nl.modalOpen && !outputOnly && llmEnabled`), `:334` (`modalOpen = modelModalOpen || prefsOpen`), `:565-573` (`onToggleLlm` — never closes Preferences); root cause in `src/llm/useModelDownload.ts:304-344` (`setLanguage` latches `setModalOpen(true)` with no `llmEnabled` awareness).
- **Bug:** `setLanguage` latches `modalOpen=true` whenever the player switches in-game to a non-cached, non-declined, non-ka language (`declined` defaults to `false`, `nlpref.ts:15`). The language combobox in `NlLanguagePicker.tsx:55-58` renders unconditionally (only the improve button / installed chip are `llmEnabled`-gated), so an in-game switch is reachable while the LLM is hidden — `modalOpen` is masked *only* at render by `&& llmEnabled`. The instant the user opens Preferences and flips the toggle on, `upgradeModalOpen` unmasks the same render while `prefsOpen` is still true (the toggle handler never calls `setPrefsOpen(false)`). `ModelDownloadModal` (`:540`) and `PreferencesModal` (`:559`) then render together, each wrapping the shared `<Modal>` with its own focus trap.
- **Impact:** Two simultaneous `role="dialog"` focus traps + an unsolicited download offer appearing the moment the checkbox is flipped — exactly the "unsolicited focus-trapping download modal" the codebase warns against elsewhere (`useModelDownload.ts:336-339`). a11y + player-experience regression. The `t5` rapid-toggle test does not catch it (it never does an intervening in-game `setLanguage`, so `modalOpen` is never latched).
- **Repro:** boot off → in-game picker switch to French (model not cached) → open Preferences → check the LLM box.
- **Suggested fix:** in `onToggleLlm`, close Preferences before the model modal can surface (`setPrefsOpen(false)`), and/or clear the latched `nl.modalOpen` on toggle, and/or gate `upgradeModalOpen` on `!prefsOpen`. The structural seam is that `useModelDownload` is entirely `llmEnabled`-unaware — the masking lives only in Terminal's render derivation, so a latched `modalOpen` survives to surface the moment the mask lifts.
- **Confidence:** Medium-High (verifier 85)
- **Found by:** Contract & Integration

### [I2] M2 migration-notice race overwrites a fresh "model enabled" announcement with a stale, persistent "model hidden" notice (and spends the one-time marker)
- **File:** `src/ui/Terminal.tsx:278-309` (M2 mount-only effect; `.then` callback at `:287-302` guards only `if (cancelled || !cached) return`), interacting with the toggle handler at `:565-573` and the shared `llmMsg` slot at `:110-116`.
- **Bug:** The M2 effect is mount-only (`[]` deps) and reads `llmEnabled` from the mount closure (false). Its async `llmEngine.isCached().then(...)` does **not** re-check the current `llmEnabled`. `isCached()` is genuinely async — a dynamic `import('@mlc-ai/web-llm')` then a cache probe (`engine.webllm.ts:117-120`). If a returning user with a cached model opens Preferences and toggles the model **on** before `isCached()` resolves, the late `.then` calls `setLlmMsg(llmHiddenMigrationNotice(...), transient:false)` — clobbering the just-shown "Natural-language model enabled." announcement with a persistent, now-false "the model is now hidden — re-enable it in Preferences" notice, and writing the one-time `llmHiddenNoticeSeen` marker at the wrong moment.
- **Impact:** A wrong, persistent (`transient:false`) live-region announcement that contradicts the action the user just took, shown to exactly the population M2 targets (returning cached-model users). a11y correctness — the announcement is the only signal a screen-reader user gets.
- **Suggested fix:** Re-check live intent at resolve time: read `llmEnabled` through a ref and bail in the `.then` if it's now true (`if (cancelled || !cached || llmEnabledRef.current) return`), skipping the marker write so M2 can still appear on a future genuinely-off boot. Shares a root cause with [S1].
- **Confidence:** Medium-High (verifier 72)
- **Found by:** Logic & Correctness **and** Concurrency & State (2 specialists agreed)

## Suggestions

- **[S1] Shared `llmMsg` slot lets a transient announcement auto-clear a persistent M2 notice** — `src/ui/Terminal.tsx:316-320` (`setLlmMsg(null)`) + `:110-116`. One slot carries both the persistent M2 notice and the transient mode-change message; the auto-clear effect nulls the *whole* slot. If M2 is showing and the user then toggles, the timer discards M2's actionable guidance early (M2 is mount-only, won't return). The "M2 does NOT auto-clear" test only covers the no-toggle case. Marginal harm (the common path is toggle-*on*, which makes M2 moot) — but it breaks the stated invariant. Same root cause as [I2]; fixing both with separate state slots (or the `.then` re-check) resolves it. *Found by Error-handling + Concurrency.*
- **[S2] Output-miss telemetry gap + now-false comment when the feature is off** — `src/translate/useOutputTranslation.ts:145-148` (forces `lexLang=null`) + `:316-320`. With the LLM off, fr/de/es output misses skip the resolver and hit `if (!resolver) continue`, so `logMiss`/basis tracking never runs for them, and the comment at `:316-319` ("the resolver … never fires at runtime") is now false (fr/de/es are also resolver-less when off). Display stays correctly English (no player bug) — only telemetry is lost and the comment is stale. Fix: route those misses through the corpus-only logging branch, or correct the comment. *Found by Contract & Integration.*

## Plan Alignment

Plan/design docs found: `docs/superpowers/specs/2026-06-25-loquor-hide-llm-fallback-design.md`, `docs/superpowers/plans/2026-06-25-loquor-hide-llm-fallback.md`, and the prior alignment review.

- **Implemented:** All 12 spec gate points are reflected and backed by passing, asserting tests — `storageKeys` (both keys), `useLlmFeature` (clone of `useDebug`), Terminal threading + abort effect + M2 mount check + modal gating + mode-change announce, `effectiveModel` into both `NlState` and `liveRef`, the stage-8 pitch suppression preserving `ka`, `lexLang=null` when off, the Preferences toggle row (below debug, localized incl. ka, correct a11y name/role), the picker affordance gating, `nlModeSummary` tier drop, the short/full landing caveat, and the M2 + mode-change notices. Named tests t1–t5, M2, and multilingual are all present and asserting (not merely behavioral).
- **Not yet implemented:** None.
- **Deviations:** (1) `src/llm/config.ts` changes `GEORGIAN_STATUS_MARKER` from `(alpha)` to `(ალფა)` (its own commit, the first on the branch) plus consequent `ka-input-copy.test.ts` / `landingStrings.ts` edits — out of the hide-LLM feature's scope, but it does **not** contradict the spec (the spec already references `(ალფა)` as the baseline) and touches display strings only, not the out-of-scope behaviors (game picker / language picker / Georgian input-output). (2) The M2 delivery channel (dedicated bare `aria-live` region, not `role="status"`) and the auto-clear `transient` enhancement both go slightly beyond the original plan but are pre-ratified in the amended spec / benign and self-tested.

## Review Metadata

- **Agents dispatched:** Logic & Correctness, Error Handling & Edge Cases, Contract & Integration, Concurrency & State, Security, Plan Alignment (design+plan docs found) — then a single Verifier.
- **Scope:** changed source (`src/ui/useLlmFeature.ts` [new], `Terminal.tsx`, `nlModeSummary.ts`, `NlLanguagePicker.tsx`, `PreferencesModal.tsx`, `BottomBar.tsx`, `Landing.tsx`, `landingStrings.ts`; `src/llm/useNaturalLanguage.ts`, `translatePipeline.ts`, `notices.ts`, `config.ts`; `src/translate/useOutputTranslation.ts`; `src/storageKeys.ts`) plus adjacent callees (`src/llm/useModelDownload.ts`, `src/llm/nlpref.ts`, `src/ui/useDebug.ts`, `src/llm/engine.webllm.ts`).
- **Raw findings:** 8 (across 6 specialists)
- **Verified findings:** 4 (2 Important, 2 Suggestion)
- **Filtered out:** 4 (2 deduplicated into [I2]/[S1]; 2 rejected — see below)
- **Rejected/downgraded:** *Toggle announcement direction desync* (`next = !llmEnabled` vs functional updater) — not reachable; separate clicks each commit, no synchronous double-activation path (verifier 35). *Raw `internal.model` read in the first-abstain latch* (`useNaturalLanguage.ts:215-223`) — benign by the reporter's own admission (stage-8 pitch is independently suppressed when off); code-hygiene note only, not a bug (verifier 50).
- **Security:** No defects found (verifier-level confidence 90). Default-off genuinely closes the documented third-party egress — verified that no path (input pipeline, output fallback, the mount `isCached()` probe) touches the network or loads model WASM while off; `isCached()` is a local CacheStorage/IndexedDB lookup. localStorage values are strictly validated (`=== '1'`, `isNlLanguage`); no `dangerouslySetInnerHTML`; `lang=` attribute is constrained to validated `ActiveLanguage` literals.
- **Steering files consulted:** `CLAUDE.md` (multilingual / `ka`-no-LLM rules, a11y mandate, no-forced-English north star, network-egress section). Note: the CLAUDE.md "Known network egress" section does not yet mention that this branch makes the LLM **off by default** — a stale-doc observation, not a code issue; worth a one-line update.
- **Plan/design docs consulted:** the spec, plan, and alignment review listed above.
