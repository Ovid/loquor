# Agentic Code Review: ovid/georgian-fixes

**Date:** 2026-06-27 10:36:42
**Branch:** ovid/georgian-fixes -> main
**Commit:** f6b1c1b79907b381f3426ec2485decdbd770864a
**Files changed:** 10 | **Lines changed:** +1130 / -39
**Diff size category:** Medium (code changes concentrated in 4 source files; ~900 of the lines are design/plan docs)

## Executive Summary

The branch ships two Georgian (`ka`) deterministic-parser fixes — **F1** a fused-instrumental exact-token map (`ტუმბოთი` → `with pump`) and **F2** a resolve-gated dative `-ს` strip (`ღილაკს` → `button`) — plus a reply-path leading-prep drop. Six specialists plus a verifier found **no Critical or live-correctness bugs**: both fixes are pure, `ka`-only gated, and fail safe (resolve correctly or abstain — never silently emit a wrong command). The whole lexicon suite is green (286 tests). The verified findings are all **hardening / robustness** items, the two highest-value being that `ka` has **no LLM safety net**, so the new closed-map invariants (F-GATE) and the dative strip's collision-safety (F-SCOPE) rest on documentation and a one-time manual brute-force rather than an automated gate that would catch the *next* lexicon entry.

## Critical Issues

None found.

## Important Issues

### [I1] `fusedInstrumentals` invariant is documented but not gate-enforced
- **File:** `src/llm/lexicon/types.ts:74-79` (invariant); gates at `src/llm/lexicon/validate.test.ts`, `src/llm/lexicon/roundtrip.test.ts`
- **Bug:** The field's doc-comment states the value MUST resolve as a noun and `ით` MUST be a key in `postpositions`, but no validate/round-trip test enforces either half. `grep` finds zero `.test.ts` references to `fusedInstrumentals`. Because `ტუმბოთი` is deliberately *not* a stored noun value (the `ტუმბოთ` synonym was removed at `ka.zork1.ts:111`), the round-trip gate never exercises the map's stem `ტუმბო` through the map. The one shipped entry is correct and behaviorally tested (`parse.ka-uat.test.ts:279-297`, `expandGeorgian.test.ts:45-58`), but a malformed *future* entry would ship silently.
- **Impact:** `ka` has no LLM fallback. A future `fusedInstrumentals` entry whose stem isn't a real noun, or a refactor that drops `ით` from `KA_POSTPOSITIONS`, makes `expandGeorgian` emit `[ით, <stem>]` that silently misses — a guaranteed abstain/raw-English leak for exactly the player class CLAUDE.md flags as most needing deterministic coverage.
- **Suggested fix:** In the `ka` block of `validate.test.ts`, assert `'ით' in KA_CORE.postpositions` and that every `Object.values(KA_CORE.fusedInstrumentals ?? {})` resolves to a real canonical (mirror the existing prep-target and noun-key gates).
- **Confidence:** High (78)
- **Found by:** Contract & Integration (72), Logic & Correctness, Error Handling — confirmed by Verifier

### [I2] F2 dative `-ს` strip is a documented superset of the spec's dative-only scope, with no collision gate
- **File:** `src/llm/lexicon/parse.ts:136-142`
- **Bug:** The strip drops a trailing `-ს` from *any* missed last token, so beyond the dative direct object it also recovers a **genitive modifier** (`ოქროს` → `ოქრო` → `pot of gold`) — a surface the design's §3 safety analysis (written only about the dative case) never analyzed. The code comment asserts "no wrong-noun collision exists in the lexicon (verified exhaustively)."
- **Impact:** **Safe for the current lexicon** — independently brute-force-verified twice (the Logic specialist and the Verifier each appended `-ს` to every stored noun head/surface and ran them through the parser: zero mis-resolutions, zero stem collisions; the only deltas, `ჩირაღდან`/`ქოთან`/`ოქროს ქოთან`, go from MISS to the *correct* emit). The residual risk is solely that a future `ka.zork1` addition could silently introduce a `strip(surface+'ს')` collision, since the "verified exhaustively" guarantee lives in a comment, not a test.
- **Suggested fix:** Add a round-trip-style test that brute-forces `strip(surface + 'ს')` collisions across all canonicals (locks the invariant against future edits), and broaden the spec §3 wording + the code comment from "dative" to "trailing-`-ს` recovery (dative + genitive)."
- **Confidence:** Medium-High (66)
- **Found by:** Plan Alignment (deviation), Logic & Correctness (independent brute-force) — confirmed by Verifier

## Suggestions

- **[S1] Prototype/object-injection on plain-object lexicon lookups** — `src/llm/lexicon/expandGeorgian.ts:31` (`fusedInstrumentals[token]`), also `parse.ts:677`/`:554`/`:523`. A player token of `constructor`/`toString`/`valueOf` returns a truthy inherited member, pushing a **non-string** token. Verified **benign end-to-end** today (downstream `s.join(' ')` stringifies and misses → `{kind:'miss'}` / `null`; no crash, no wrong command), but latent/fragile. Fix once: guard player-token indexing into plain-object lexicons with `Object.hasOwn(...)` (and `typeof === 'string'`). Found by: Security (70), Logic (sub-threshold).
- **[S2] Reply-path prep-drop gate is truthiness-only and broader than its comment** — `src/llm/lexicon/parse.ts:677` checks `core.preps[tokens[0]]` for truthiness only (unlike the prep-split loop at `:556`, which also gates `vocab.preps.includes(prep)`), so it drops *any* leading postposition (ში/ზე/დან/თან), not just the instrumental `ით` the comment describes. Failure mode verified always safe (resolves a real noun or returns `null` → abstain; never raw-sends Georgian). Fix: correct the comment to "any leading postposition," and/or mirror the `:556` membership gate (folds into the S1 `Object.hasOwn` fix). Found by: Error Handling (65), Security (60).
- **[S3] (Dropped on verification)** Three near-identical "absorb a leading prep token" sites (`parse.ts:519-528` motion-verb, `:544-548` leading-`to`, `:677-678` reply prep-drop). The shape repeats but the guards diverge intentionally (`KA_MOTION_VERBS` membership vs `=== 'to'` vs truthiness), across two functions with different emit shapes. Verifier judged this intentional divergence below the action bar; listed for awareness only.

## Plan Alignment

Design: `docs/superpowers/specs/2026-06-27-loquor-georgian-dative-instrumental-design.md` · Plan: `docs/superpowers/plans/2026-06-27-loquor-georgian-dative-instrumental.md` · Status log: `pending.md`.

- **Implemented:** F1 fused-instrumental (§2) — `types.ts:74-79`, `expandGeorgian.ts:18,31-35`, `ka.core.ts:49-51,183`, both call sites `parse.ts:426`/`:671`, pins `parse.ka-uat.test.ts:279-297` + `expandGeorgian.test.ts:45-58`. F1 §2.2 redundant `ტუმბოთ` removal — `ka.zork1.ts:111` (grep confirms no standalone `ტუმბოთ` survives). F1 §2.3 reply prep-drop — `parse.ts:672-679`, pins `parse.ka-uat.test.ts:261-277`. F2 dative `-ს` strip (§3) — `parse.ts:136-142`, pins `parse.ka-uat.test.ts:299-355`. Bookkeeping (§6) — `pending.md` flipped to "FIX BOTH". The 5 implementation commits map 1:1 to the 5 plan tasks.
- **Not yet implemented (neutral — explicitly deferred):** the CLAUDE.md source-of-truth entry for this spec (§6 / Task 5 Step 6 defer to merge time); memory-file updates (out of repo scope — the in-context auto-memory already reads "RESOLVED 2026-06-27", so done out-of-band).
- **Deviations:** the F2 strip's genitive-modifier superset behavior (see **[I2]**) is broader than the spec's dative-only framing — deliberate and documented in-code, but the spec's §3 safety argument did not cover the genitive surface.
- **Spec self-consistency:** both load-bearing factual claims check out — "the pump is the only vowel-stem instrument in Zork I" (only the `-ო` stem `ტუმბო` fuses `-ით`→`-თი`; `-ა` stems like `დანა`→`დანით` and consonant stems append cleanly, already handled by the generic split) and "`ტუმბოთ` appears nowhere else in `src`" (grep-confirmed). No false claims found.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration; Concurrency & State; Security; Plan Alignment; plus a Verifier.
- **Scope:** changed source — `src/llm/lexicon/{parse,expandGeorgian,ka.core,ka.zork1,types}.ts` + tests; adjacent — `src/llm/translatePipeline.ts` (reply path ~680-731), `src/llm/scene/tracker.ts`, `src/llm/inputTranslate.ts`, the fr/de/es cores (parity), and the `validate.test.ts`/`roundtrip.test.ts` gates.
- **Raw findings:** 6 above-threshold (plus several no-defect confirmations)
- **Verified findings:** 4 kept (2 Important, 2 Suggestion) + 1 dropped (F-DUP)
- **Filtered out:** Concurrency (none — confirmed pure, no shared-state writes); Security command-injection / ReDoS / network-egress (cleared); multiple no-defect Contract/Integration confirmations.
- **Steering files consulted:** `CLAUDE.md` (no contradictions found; the change adheres to the `ka`-special carve-out — deterministic input change applies to `ka`-on-Zork-I, the new maps stay optional/`ka`-only and never key the LLM `Record<LexLang>` machinery).
- **Plan/design docs consulted:** the dative-instrumental design + plan (2026-06-27), `pending.md`.
