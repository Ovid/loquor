# Agentic Code Review: ovid/georgian-input

**Date:** 2026-06-25 10:57:40
**Branch:** ovid/georgian-input -> main
**Commit:** fb67e0251a5b40734adaa3d3399704c15e02989d
**Files changed:** 58 (49 code/config) | **Lines changed:** +6744 / -234 (code: +3060 / -218)
**Diff size category:** Large

## Executive Summary

This branch is a complete, faithful, and unusually well-tested execution of the
Georgian (`ka`) Phase-2 input plan — typecheck is clean and the relevant suites
(~580 tests) are green. The review found **one Critical player-facing dead-end**:
a Georgian player can never confirm restart/restore/quit, because the Y/N
confirmation maps were never given a `ka` entry (the I3 fix applied to fr/de/es
was left undone for the one language with no LLM net). Three further **Important**
findings share a single root cause — the Georgian deterministic _compound_ paths
(verb-gapping, shared-destination distribution, multi-word dative objects) match
nouns/preps **before** running `expandGeorgian`, so natural Georgian phrasings
silently miss with no LLM fallback. The remaining six findings are
maintainability/latent/benign suggestions. Confidence is high: every finding was
empirically traced through the real pipeline by the verifier.

## Critical Issues

### [C1] Georgian yes/no confirmation can never be confirmed — restart/restore/quit dead-end

- **File:** `src/llm/inputTranslate.ts:462-481` (maps) reached via `src/llm/translatePipeline.ts:686-689`
- **Bug:** `CONFIRM_AFFIRMATIVE` / `CONFIRM_NEGATIVE` have entries for `de`/`fr`/`es` but **no `ka`**. On Zork I, `ka` is input-active and routes through `nl.translate`; `isConfirmationPrompt` matches the _English_ VM source so it fires regardless of display language. `confirmationReply('კი','ka')` returns `'კი'` (not `'y'`), which the Z-machine reads as non-affirmative ("no"). The Georgian corpus prompt (`src/translate/corpus/zork1.ka.strings.ts:1294,1376`) literally renders `(Y ნიშნავს კი)` — it tells the player to type `კი`, which is then silently rejected.
- **Impact:** A Georgian-only player **cannot confirm restart, restore, or quit** — a golden-path dead-end with no workaround and no LLM net. This is exactly the I3-class fix that shipped for fr/de/es and was omitted for `ka`. Violates CLAUDE.md rule (a) (deterministic coverage must include the no-LLM language) and "a fix in one language is a fix in all."
- **Suggested fix:** Add a `ka` entry to both maps — e.g. affirmative `['კი','ki','დიახ','ხო']`, negative `['არა','ara','ვერა']` (matched folded as the others are; confirm exact forms with the native-review pass). `confirmationReply` keys on `ActiveLanguage`, not `LexLang`, so a `ka` entry is type-safe and does **not** touch any LLM-keyed map (CLAUDE.md rule (b) respected).
- **Confidence:** High
- **Found by:** Error Handling & Edge Cases (verified)

## Important Issues

### [I1] Georgian object-list compound drops the verb on the 2nd conjunct

- **File:** `src/llm/inputTranslate.ts:133-146` (`isForeignNoun`) feeding `fillElidedVerbs` (~161-187)
- **Bug:** `isForeignNoun` folds the conjunct and checks `nounWordSet(nouns)` but never runs `expandGeorgian`, while `ka.zork1.ts` stores **post-expandGeorgian bare stems** (`წიგნ`, not the typed nominative `წიგნი`). `ka` also has no articles, so `startsWithArticle` is always false → no gapping signal. Traced: `"აიღე ფარანი და წიგნი"` (take lamp and book) → `["აიღე ფარანი","წიგნი"]`; the verbless `წიგნი` then `parseLexicon` → **MISS**. The es analog (`coge el ajo y destornillador`) gaps correctly because es stores the literal surface form.
- **Impact:** A natural Georgian "<verb> A და B" compound executes only the first action; the rest is dropped with an abstain and no recovery. The `და`-conjunction wiring and a landing example were built specifically to support ka compounds, so this is a reachable feature gap. No ka compound-gapping test exists.
- **Suggested fix:** Normalize the conjunct with `expandGeorgian(tokens, core.postpositions)` (when `core.postpositions` is present) before the noun-set lookup in `isForeignNoun`, so `წიგნი` reduces to `წიგნ`. Add a ka gapping test mirroring the es case.
- **Confidence:** High
- **Found by:** Logic & Correctness (verified)

### [I2] Georgian "put A and B in case" loses the shared destination on the first conjunct

- **File:** `src/llm/inputTranslate.ts:195-212` (`prepTail`) / `distributePrepTail` (~229-257)
- **Bug:** `prepTail` looks for a separate prep **token**, but in Georgian the destination postposition is **fused** onto the noun (`ვიტრინაში` = "in the case"). It never runs `expandGeorgian`, so no prep token is ever found for ka → `distributePrepTail` is a no-op. Traced: `"ჩადე კუბო და ბრილიანტი ვიტრინაში"` → first conjunct `put coffin` (parser-orphaned, no destination), second conjunct MISS. Same root cause as [I1] (deterministic ka path skips `expandGeorgian` before prep matching), compounded here with verb-gapping.
- **Impact:** The natural endgame "put A and B in case" treasure-casing phrasing breaks for Georgian, with no LLM fallback. de/es work because the prep is a standalone token.
- **Suggested fix:** Teach `prepTail` to detect a fused trailing postposition for ka (apply `expandGeorgian` to the last clause's tokens so `ვიტრინაში` → `[ში, ვიტრინა]` is recognized as the shared destination). At minimum add a ka test so the gap is visible.
- **Confidence:** Medium-High
- **Found by:** Logic & Correctness (verified)

### [I3] G1 dative path rejects a multi-word object

- **File:** `src/llm/lexicon/parse.ts:547-556`
- **Bug:** The G1 dative-recipient path is gated on `tokens.length === 2` and resolves the object as `resolveNoun([tokens[0]], …)` — a single token. An adjective-qualified object misses: `"მიეცი დიდი ბრილიანტი ქურდს"` (give the big diamond to the thief) → `[დიდ, ბრილიანტ, ქურდს]` (length 3) fails the `=== 2` guard, the prep-split can't fire (no prep token between the nouns), and the clause falls to **MISS**.
- **Impact:** "Give a named/qualified treasure to the thief" is a real Zork I strategy and Georgian treasures naturally carry adjectives; the qualified form is a silent deterministic dead-end (no LLM net). Narrower than [C1]/[I1] because the bare head-noun form works as a workaround. Tests cover only single-token objects.
- **Suggested fix:** Generalize to recipient-as-last-token with `objSpan = tokens.slice(0, -1)`: `if (core.dativeRecipients?.has(tokens[tokens.length-1]) && tokens.length >= 2 && verbArityOk(verb, vocab, 2)) { const obj = resolveNoun(tokens.slice(0, -1), …); const rec = resolveNoun([tokens[tokens.length-1]], …); … }`. Re-run the walkthrough gate.
- **Confidence:** Medium-High
- **Found by:** Error Handling & Edge Cases (verified)

## Suggestions

- **[S1]** `src/llm/translatePipeline.ts:697-726` — the I3 disambiguation/orphan-reply fix also changed **fr/de/es** behavior: an unresolved reply now **abstains** (hint + retain) instead of raw-sending to the Z-parser as before (`git show b86f67f`). Intentional and policy-aligned, but **no test pins the old or new fr/de/es behavior**. Add a regression test pinning a fr/de/es localized reply → English noun, and confirm narrowing fr/de/es accepted replies is intended. _(Found by: Contract & Integration — verified.)_
- **[S2]** `src/ui/Landing.tsx:10` — importing `kaInputActive` from `llm/lexicon/index` drags the **entire input-lexicon dataset** (all core + per-game noun lexicons, statically imported at `lexicon/index.ts:5-18`) into the initial landing route's module graph, when the predicate only needs a signature membership check. Extract `kaInputActive` (and the `NOUNS`-presence lookup) into a data-light module. Bundle/first-paint concern, not correctness. _(Contract & Integration — verified.)_
- **[S3]** `src/ui/BottomBar.tsx:90-92` and `src/llm/notices.ts:331-333` both independently compute `kaInput ? GEORGIAN_ACTIVATION_TIP : GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH`. Strings are shared constants, but the _selection rule_ is duplicated; expose one `georgianActivationTip(kaInput)` selector so the visible copy and the announced copy can't diverge. _(Contract & Integration — verified.)_
- **[S4]** `src/llm/translatePipeline.ts:624-635` (`abstainOnError`) raw-sends only for `lang === 'en'`, missing the `|| (lang === 'ka' && !containsGeorgian(line))` §5.5 predicate used elsewhere. Currently **unreachable** for ka (ka is grammar-only and never invokes the engine, so no error reaches here), so latent only — mirror the predicate or add a comment that ka can't reach it. _(Logic & Correctness — verified latent.)_
- **[S5]** `src/llm/lexicon/expandGeorgian.ts:22-30` — the purely suffix-based postposition split would shear a future noun whose typed nominative ends in `-დან`/`-თან`. **Not live** for shipped Zork I data (round-trip + walkthrough gates pass), latent foot-gun for future lexicon additions. Consider a validate-gate assertion that no stored stem (re-attached to its nominative) collides with a postposition suffix. _(Error Handling — verified latent.)_
- **[S6]** `src/llm/useNaturalLanguage.ts:318-321` — `liveRef` is synced in a dependency-less post-commit effect, so a mid-drain re-read could be one render behind on language/lex. Correctness-preserving (epoch guards the game; `internal`/`lex` sync together), ordering-only, and the intended React pattern. Benign. _(Concurrency & State — verified benign.)_

## Plan Alignment

Design/plan docs consulted: `docs/superpowers/specs/2026-06-24-loquor-georgian-input-design.md`, `docs/superpowers/plans/2026-06-24-loquor-georgian-input.md`, plus `notes/georgian-input-work-needed.md` and the pushback notes.

- **Implemented:** All 22 plan tasks are reflected in the diff (InputLexLang + optional `postpositions`; `expandGeorgian` pre-stage gated after verb resolution; `KA_CORE`/`KA_ZORK1`; `kaInputActive` Zork-I gating; Georgian directions/conjunctions; G1 dative; validation/round-trip/walkthrough/UAT gates; `model:'grammar'` forcing; lex-memo + queue-bail repointing; §5.5 raw-send/abstain; revised notices/help/placeholder; drop-the-noun disambiguation reframe; copy gate). Several places harden **beyond** the plan and are documented in commits.
- **Not yet implemented (all explicitly deferred — neutral):** "it"-anaphora (walkthrough has zero pronoun steps); Zork II/III Georgian input (Phase-1 type-English by design); input LLM for ka (by design — ka absent from every LLM-keyed map, type-enforced); `wrench`/genitive-compound morphology (owner-deferred, spec-seed written); `(beta)` marker drop (pending native sign-off).
- **Deviations:** **None at or above threshold.** The two departures from the plan's literal text — G1 gating on a closed `dativeRecipients` set instead of a bare `-ს` suffix test, and the queue-bail predicate `OUTPUT_ONLY_LANGS.has(lang) && lex === null` instead of bare `!lex` — are both deliberate, documented **corrections** that better satisfy the spec's invariants (commits `2102a8a`, and the in-code rationale at `translatePipeline.ts:1042-1044`).

Note: the Critical and three Important findings are all instances of CLAUDE.md rule (a) — a deterministic input path covered for fr/de/es (or for the bare ka form) but not the natural ka form, where ka's absent LLM net turns the gap into a hard dead-end. None of the proposed fixes touch the LLM-keyed maps.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration; Concurrency & State; Security; Plan Alignment — then a single Verifier over all findings.
- **Scope:** the 49 changed code/config files (`src/**`, `vitest.config.ts`) + callers/callees one level deep; design/plan docs for Plan Alignment.
- **Raw findings:** 10 (before verification; Security and Plan-Alignment returned no defects).
- **Verified findings:** 10 (all confirmed by reading the code; none dropped below threshold), re-graded by severity: 1 Critical, 3 Important, 6 Suggestions.
- **Filtered out:** 0 findings dropped; multiple specialist "areas checked clean" non-findings were recorded by the agents and not promoted.
- **Steering files consulted:** `CLAUDE.md` (authoritative; no stale contradiction found — the Phase-2 sync commit `fb67e02` already reflects current reality).
- **Plan/design docs consulted:** the Georgian Phase-2 input design + plan, plus `notes/` work-status and pushback files.
