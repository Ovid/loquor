# Agentic Code Review: ovid/more-parser-work

**Date:** 2026-06-09 17:18:56
**Branch:** ovid/more-parser-work -> main
**Commit:** 43cda7938829a62dd7b18c727eddd52325673434
**Files changed:** 48 | **Lines changed:** +10835 / -405
**Diff size category:** Large (but the real bug surface is ~1,236 lines across 16 production files; the rest is docs and generated vocab data)

## Executive Summary

This branch lands the natural-language-layer parser work: a ZIL→vocab extraction toolchain, a multilingual direction fast-path, compound-command ("take lamp and go north") sequential translation, scene tracking, and meta-command routing. The architecture is sound, well-documented, and well-tested (full suite green). No crashes, security holes, or data-loss bugs were found.

The most consequential finding is **C1 (parseCommand verb classification)**: 25 verbs in the real Zork I vocab live in _both_ `verbs1` and `verbs2`, and the classifier's branch order silently rejects every valid two-object command for those verbs ("open door with key", "rub lamp with cloth"). The test fixtures keep the two verb lists artificially disjoint, so the suite never exercises it. A cluster of other confirmed issues sit at the LLM/game-output parsing boundary (adjective-prefixed absence detection, narrative "taken"/"dropped" false-positives) and at the compound-command contract (German/Spanish never split; meta verbs not routed raw per-clause). Every finding below was verified against the actual code; none were rejected.

## Critical Issues

None found.

## Important Issues

### [C1] `parseCommand` silently abstains on valid two-object commands for verbs that are in both `verbs1` and `verbs2`

- **File:** `src/llm/translate.ts:173-194`
- **Bug:** The classifier sets `is1 = vocab.verbs1.includes(verb)` then `is2 = vocab.verbs2.includes(verb)` and branches `isOnly → is1 → is2`. In the real generated `zork1.vocab.ts`, **25 verbs are in BOTH lists**: `blow up, brush, dig in, drop, fill, light, look at, move, open, pick, pour, pump up, push, read, ring, rub, squeeze, stab, strike, swing, take, tell, turn on, untie, wave`. For any of these, a two-object emission `{"verb":"open","object":X,"prep":"with","indirect":Y}` enters the `is1` branch (line 183), which requires `prep === undefined`, and returns `{kind:'abstain'}`. `buildGrammar` _does_ emit a `verb2cmd` production for these verbs, so the model is free to produce exactly the shape that gets rejected.
- **Impact:** Common two-object commands ("open the door with the key", "rub the lamp with the cloth", "drop coin in slot") silently abstain. In the single-command path this fails safe (raw-send to Zork's parser). In the **compound path** it is worse: an abstain hard-stops the sequence (see [C5]). The test suite hides this because the fixture (`translate.test.ts:24-25`) keeps `verbs1`/`verbs2` disjoint.
- **Suggested fix:** Classify by the shape the model actually emitted, not first-list-wins. If `prep`/`indirect` are present and the verb is in `verbs2`, take the verbs2 branch even when it is also in `verbs1` (and symmetrically for the 1-object shape). Add a fixture verb that is in both lists to pin it.
- **Confidence:** High
- **Found by:** Logic & Correctness (verified)

### [C2] French elided article (`l'est`, `l'ouest`) bypasses the direction fast-path it claims to handle

- **File:** `src/llm/directions.ts:11-18` (`normalize`) and `:162-175` (`parseDirection`)
- **Bug:** `normalize` strips diacritics + trailing `!.?` but **not apostrophes** (neither `'` U+0027 nor `'` U+2019); `parseDirection` tokenizes on `\s+` only. So `"vers l'est"` → tokens `["vers","l'est"]`; `vers` is consumed by `LEAD`, but `"l'est"` is not in `LEAD` (only bare `l` is) and not in `DIRECTION_WORDS` → returns `null`, falling through to the unreliable 1.5B model.
- **Impact:** `prompt.ts:114` and the `directions.ts` header both explicitly advertise `"vers l'est" → east` as deterministically handled. It is not, for the very common French elided-article construction. UAT F8 documented directions as unreliable on the small model — the exact case this fast-path exists to fix.
- **Suggested fix:** In `normalize`, replace apostrophes with a space before splitting: `.replace(/['’]/g, ' ')`, so `l'est` → `l est` → LEAD strips `l` → `est` → east.
- **Confidence:** High
- **Found by:** Logic & Correctness (verified empirically)

### [C3] `splitClauses` misses German (`und`) and Spanish (`y`) — compound path never engages for 2 of the 4 advertised languages

- **File:** `src/llm/translate.ts:24-29`
- **Bug:** `splitClauses` splits only on `and|then|et|puis|ensuite` (+ `.`/`;`). But `directions.ts` (LEAD/DIRECTION_WORDS) and `meta.ts` (`META_ALIASES`) deliberately cover German and Spanish, and the directions header says "Covers en/fr/de/es." A German `"geh nach norden und nimm die lampe"` or Spanish `"... y ..."` compound never splits, so the entire string is sent to the model as one clause and the compound feature silently does nothing for those players.
- **Impact:** Inconsistent, partial language coverage across the three new fast-paths; the compound feature is unavailable for half the advertised languages.
- **Suggested fix:** Add whitespace-bounded `und`/`y` to the separator alternation, matching the languages directions.ts/meta.ts cover. (Guard `y` as a standalone separator surrounded by whitespace — it's a frequent Spanish word — mirroring the existing `\s+…\s+` pattern.)
- **Confidence:** High
- **Found by:** Contract & Integration (verified)

### [C4] Meta verbs inside a compound clause bypass the "always routed raw" contract

- **File:** `src/llm/useNaturalLanguage.ts:284-311` (meta/alias checks) vs. the per-clause loop at `:407-435`
- **Bug:** `isMetaCommand`/`metaAlias`/confirmation checks run **once on the whole input** before `splitClauses`. The compound loop calls `generateClause` per clause, which only does the direction fast-path + model — no per-clause meta/alias check. So `"go north and save"` splits to `["go north","save"]`; the `save` clause reaches the model, which can't emit `save` (it's subtracted from the grammar) → abstains → sequence stops as "Ran 1 of 2 actions."
- **Impact:** The documented contract that meta verbs are always routed raw to the interpreter silently does not hold once a meta verb appears as a compound clause.
- **Suggested fix:** In the compound loop, before `generateClause`, apply the same `isMetaCommand`/`metaAlias` short-circuit per clause (emit the raw/aliased command, count it done, continue).
- **Confidence:** High
- **Found by:** Contract & Integration (verified)

### [C5] Compound abstain hard-stops the sequence and raw-sends the entire multi-clause string

- **File:** `src/llm/useNaturalLanguage.ts:432-435` and `:492-496`
- **Bug:** In the compound loop, any non-command result `break`s with `stopReason='abstain'`. If `done === 0` (the first clause was untranslatable), the **entire original `english`** — still containing `and`/`then`/`.` separators Zork's parser can't split — is raw-sent. This is the blast radius of [C1]: one mis-classified/abstaining clause poisons the whole plan and hands Zork an unparseable line.
- **Impact:** A 3-action plan whose first clause is an overlapping-verb 2-object command (per [C1]) runs zero clauses and dumps a separator-laden string to the parser.
- **Suggested fix:** Fixing [C1] removes the most common trigger. Independently, consider whether a mid-sequence abstain should raw-send _that clause only_ (matching the single-path fallback philosophy) rather than aborting and raw-sending the whole input.
- **Confidence:** High
- **Found by:** Logic & Correctness (verified)

### [C6] `ABSENCE_PAT` captures the adjective, not the noun, for adjective-prefixed objects — absent objects leak back into scope

- **File:** `src/llm/grammar/patterns.ts:14-15`; consumed by `src/llm/scene/tracker.ts:76-88` (`suppressed`)
- **Bug:** `\bno\s+([a-z]+)\b` and `can(?:'t|not)\s+see\s+(?:any\s+|a\s+)?([a-z]+)` capture the _first_ word after "no"/"any". For adjective-prefixed objects this is the adjective: `"There is no small mailbox here."` → captures `"small"`; `"You can't see any brass lantern here."` → captures `"brass"`. `suppressed()` maps the captured word via `surfaceToCanonical`, which has **no adjective entries**, so it returns `undefined` → the object is **not** suppressed → `mentions()` still matches the full "small mailbox"/"brass lantern" surface form and re-adds the explicitly-absent object to the in-scope set.
- **Impact:** An object the game just said is absent is fed to the grammar/prompt as in-scope — the exact "model told a missing object is present" misclassification the scene tracker exists to prevent.
- **Suggested fix:** Resolve the absent noun by scanning the matched span against multi-word `surfaceForms` (reuse `mentions`/`surfaceForms` over the suppressed region) instead of mapping a single captured word; or capture a noun phrase.
- **Confidence:** High
- **Found by:** Error Handling & Edge Cases (verified empirically)

### [C7] `TAKE_ACK`/`DROP_ACK` match narrative "taken"/"dropped" anywhere → false inventory tracking

- **File:** `src/llm/grammar/patterns.ts:6-7`; consumed by `src/llm/scene/tracker.ts:164-182`
- **Bug:** `TAKE_ACK = /\btaken\b/i` and `DROP_ACK = /\bdropped\b/i` match any occurrence, not just the Zork ack lines "Taken." / "Dropped." Verified: `"The thief has taken the egg from you."` and `"You have already taken everything."` both match. After a `take X` command whose output contains a narrative "taken" (but did not actually take — thief intercept, "already taken"), `reduceScene` marks X `carried: true`, and carried objects survive room changes (`tracker.ts:153`), lingering in scope forever.
- **Impact:** Mis-tracked inventory: an object the player doesn't hold is treated as carried across rooms, corrupting the in-scope set fed to the model. Narrow trigger (needs the verb + narrative-word coincidence).
- **Suggested fix:** Anchor the ack to a standalone line, e.g. `/(^|\n)\s*taken\.?\s*$/im` (and the multi-item `"item: Taken."` shape), rather than a bare word-boundary match.
- **Confidence:** High
- **Found by:** Error Handling & Edge Cases (verified empirically)

### [C8] `clauseFailed` / `reduceScene` apply `failurePat` without object scoping (asymmetric with the absence check)

- **File:** `src/llm/translate.ts:127` (and mirrored at `src/llm/scene/tracker.ts:195`)
- **Bug:** `clauseFailed` short-circuits `if (vocab.failurePat?.test(recentOutput)) return true` with **no object scoping**, while the absence check immediately below _is_ scoped to the acted object (the deliberate F2/R3 fix). `FAILURE_PAT = /\bis already\b|\bcan(?:'t|not)\s+be\b/i`. So a turn whose output contains "is already…" / "cannot be…" about an _unrelated_ object truncates the compound sequence after the current clause's stationary action actually succeeded. The `roomChanged` guard only covers moves.
- **Impact:** A refusal about object B can stop a sequence after a successful action on object A — an asymmetry the absence-scoping work was specifically introduced to avoid.
- **Suggested fix:** Scope `failurePat` to `commandObjectWords` the same way absence is, or only honor it when the refusal text also names the acted object. If "any refusal stops the sequence" is intentional, document why.
- **Confidence:** Medium
- **Found by:** Logic & Correctness, Error Handling (related) (verified)

## Suggestions

- **[S1] `predTrue` assumes the COND numeric literal is the last atom** (`scripts/lib/zil.mjs:151`). Correct for all current ZIL (`<==? ,ZORK-NUMBER N>`), but a differently-shaped predicate yields `NaN` → silently drops/adds a whole SYNTAX branch, and the reconciliation guard only diffs _dropped_ `verbsOnly`. Parse the predicate explicitly and bail loudly on an unrecognized shape. (Conf 80)
- **[S2] Triplicated trailing-punctuation normalization** at `translate.ts:46`, `translate.ts:62`, `directions.ts:16` (`.trim().toLowerCase().replace(/[!.?]+$/,'')`). Consistent today; none strip `;`/`,` (which `splitClauses` treats as separators). Extract one `normalizeBareCommand()` helper. (Conf 80)
- **[S3] `commandObjectWords` pulls every word of both owners of an ambiguous synonym** (`translate.ts:96-107`) — e.g. `open window` → `{open, window, boarded, kitchen}` — diverging from the tracker's synonym-aware `surfaceToCanonical`. Combined with [C6], `clauseFailed` can falsely truncate on unrelated "no kitchen…" text. Factor a shared `absentNounsNaming(command, vocab)`. (Conf 78)
- **[S4] Re-entrancy guard sits below the early-return `sendLine` paths** (`useNaturalLanguage.ts:314` vs `284-311`). Closed in practice by `disabled={nl.pending}` on the input, so it's a defense-in-depth gap, not a live bug. Move `if (translatingRef.current) return` to the top of `translate`. (Conf 75)
- **[S5] `raceTurn()` timeout leaks its resolver into `bridge.turnResolvers`** (`useNaturalLanguage.ts:350-360` + `bridge.ts:222-235`); drained inertly at the next boundary (no awaiter), so benign today, but it breaks the "resolvers correspond to live awaiters" invariant. Give `awaitTurn()` a cancel/AbortSignal path. (Conf 78)
- **[S6] Post-sequence double-observe is correct only by `keyOf` idempotency** (`Terminal.tsx:127-133` + `useNaturalLanguage.ts:520`): `inSequenceRef` flips false before the final view's observe effect runs, so Terminal re-observes the final view. Safe because the loop doesn't clear `lastCommandRef` and the keys match — fragile and unpinned by any test. Record the in-loop `lastKey` (or keep `inSequenceRef` true until after the final effect) and add a regression test. (Conf 70)
- **[S7] `estimateRemainingSeconds` returns `NaN` for a `NaN` pct sample** (`progress.ts:22-36`). Reachable if WebLLM reports a non-numeric progress; `formatEta`'s `Number.isFinite` guard hides it at the UI but `NaN` enters state. Add `if (!Number.isFinite(latest.pct)) return null` and guard `pct()` inputs. (Conf 72)
- **[S8] Raw status-line `location` is concatenated into the LLM system prompt** (`prompt.ts:87`), while the comment at `:119-122` claims raw game text is excluded as an injection mitigation. Non-exploitable (story files are trusted/vendored), but the comment overstates the mitigation. Either drop `location` from the prompt or tighten the comment. (Conf 85)
- **[S9] Download modal discloses only "Hugging Face"** (`ModelDownloadModal.tsx:34-39`) but the model-lib WASM is also fetched from `raw.githubusercontent.com` (per `engine.webllm.ts`). CLAUDE.md mandates "keep the modal disclosure accurate." Pre-existing (only the ETA changed this branch). Name both hosts. (Conf 85)
- **[S10] Broaden compound failure detection** — `FAILURE_PAT` misses common refusals: "You can't go that way.", "You can't reach that.", "The door is locked." A failed _move_ also has no room change, so the sequence over-runs subsequent clauses in the wrong room. Acknowledged in the design's "open questions / future," so disclosed scope rather than a hidden defect. (Conf 60)

## Plan Alignment

Design/plan docs consulted: the compound-commands, scene-resolution, and vocab-extraction spec+plan pairs, the overarching NL-layer design, and `notes/uat-1.md` / `notes/uat-2.md`.

- **Implemented:** All 9 locked decisions of the compound-commands design are present and faithful (deterministic split, one-clause-per-turn, stop conditions, raw-send-on-first-untranslatable, echo-once, `MAX_CLAUSES=8`, "Ran N of M" notice, self-bounding `awaitTurn`/`raceTurn`, `inSequenceRef` observe ownership). Scene resolution implements the three-tier antecedent precedence, ambiguous-synonym (F3 "window") fix, carried-object scope, and the no-pronoun `parseCommand` validator. Vocab extraction implements SYNTAX→verbs/preps, OBJECT→nouns, DIRECTIONS, `ZORK-NUMBER` COND gating, meta subtraction from a single shared source, and the two mandated guards (fail-loud on empty META parse; reconciliation diff). UAT fixes F2/R3, F3, F5, F6, F8, R1 are all implemented where the commit messages claim.
- **Not yet implemented / deferred (neutral — partial is expected):** authoritative Z-object-table `SceneProvider` (text tracker only, by design); confidence/logprob-gated abstain; plurality & same-noun adjective disambiguation; richer in-game failure detection ([S10]); the `[nl debug]` TEMP console logs remain (design says remove "once translation quality is tuned").
- **Deviations:**
  - **[S11]** The vocab-extraction design's Non-goals state "`zork*.corpus.ts` are out of scope," yet all three corpus files were modified this branch (commit `e8a7f69`). The commit is honest — regenerated canonical noun renames forced fixture updates to keep the validator green — a justified, minor scope deviation. (Conf 88)
  - **[S12]** Steering-doc staleness (flagged independently by **all six** specialists): `CLAUDE.md` (lines 11, 32) says the NL layer is "current work on the `ovid/web-llm` branch," but this work is on `ovid/more-parser-work` (the design docs themselves name `more-parser-work`), and the NL layer is substantially built and tested here, not merely scaffolded. Refresh the "Repository state" section. (Conf 95)
  - **Not a deviation (worth surfacing as a design/UX tension):** UAT-2 flagged a 4-clause comma-separated French compound dropping middle clauses as HIGH severity, but the implementation matches the design exactly — commas are explicitly _not_ clause separators (LD1 + Non-goals). The behavior is as written; the design choice may warrant revisiting.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration; Concurrency & State; Security; Plan Alignment (6 specialists) → 1 Verifier
- **Scope:** 16 production files (NL hook, translate, directions, meta, scene tracker, prompt, progress, models/modelSelection, bridge, engine, Terminal, ModelDownloadModal, the ZIL reader + vocab generator) plus their tests and pre-existing dependencies (`patterns.ts`, `scene/types.ts`, `buildGrammar.ts`). Generated vocab/corpus data reviewed via the generator logic.
- **Raw findings:** 19 (across all specialists, after intra-specialist dedup)
- **Verified findings:** 19 confirmed, 0 rejected (8 Important, 11 Suggestion; A1 downgraded from implied Critical to Important — failure mode is abstain→raw-send, not crash/data-loss)
- **Filtered out:** 0 rejected; several lower-signal observations were never scored as findings by the specialists (noted inline in their reports)
- **Steering files consulted:** `CLAUDE.md` (found stale re: branch/repo-state — see [S12])
- **Plan/design docs consulted:** `docs/superpowers/specs/2026-06-07-loquor-nl-compound-commands-design.md`, `…-scene-resolution-design.md`, `docs/superpowers/specs/2026-06-08-loquor-nl-vocab-extraction-design.md` (+ companion plans), `docs/superpowers/specs/2026-06-07-loquor-nl-layer-design.md`, `notes/uat-1.md`, `notes/uat-2.md`
