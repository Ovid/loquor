# Pushback Review: 2026-06-24-loquor-georgian-input.md (Phase 2 Georgian Input — implementation plan)

**Date:** 2026-06-24
**Spec/Plan:** `/workspace/docs/superpowers/plans/2026-06-24-loquor-georgian-input.md`
**Commit (HEAD):** `aa9e148` (`docs(georgian): Phase 2 input implementation plan (TDD, 22 tasks)`)
**Reviewer mandate:** find what's wrong before an engineer codes from it. Findings ranked critical → minor.

## Source Control Reality Check

No conflicting code churn: the plan was committed on top of a clean branch (`ovid/georgian-input`), and the files it targets (`parse.ts`, `useModelDownload.ts`, `useNaturalLanguage.ts`, `translatePipeline.ts`, `Terminal.tsx`, `types.ts`, `notices.ts`, `help.ts`, the lexicon + corpus dirs) all exist at the cited shapes. The problems below are internal to the plan, not the result of drift. All line numbers and types in this report were verified against the working tree at `aa9e148`.

---

## CRITICAL

### [C1] `expandGeorgian`'s nominative `-ი` strip mangles ~30% of the verbs before they're ever looked up — the core mechanism is broken for required winning commands

- **Category:** feasibility / contradiction
- **Severity:** critical
- **Problem:** `expandGeorgian` (Task 2) strips a trailing `ი` from **every** token, and Task 3 wires it to run on the **whole token list** _before_ verb resolution: `parseLexicon` does `let tokens = core.postpositions ? expandGeorgian(tokenize(clause), core.postpositions) : tokenize(clause)` and only _then_ looks up `core.verbs[tokens[0]]` (parse.ts:342, 366). But **14 of the 49 proposed `KA_CORE` verb keys end in Georgian `ი`** — `გახსენი`(open), `მოკალი`(kill), `მიეცი`(give), `დადგი`(put), `შედი`(enter), `გადი`(exit), `ჩაჯექი`(board), `აძვერი`/`ჩაძვერი`(climb), `მიაბი`(tie), `ჩაუშვი`(lower), `მოისვი`(rub), `დაესხი`(attack), `გაუშვი`(launch). `expandGeorgian` rewrites `მიეცი` → `მიეც`, and `core.verbs['მიეც']` is `undefined`, so the verb never resolves and the clause MISSES. With no LLM net for `ka`, that is a hard dead-end.
- **Why it's load-bearing:** the plan's own gate fixtures depend on these verbs. Task 11's walkthrough fixture includes `მიეცი კვერცხი ქურდს` (give) and `მოკალი ტროლი მახვილით` (kill); Task 9's G1 test uses `მიეცი`; Task 12's UAT pins use `მიაბი` (tie). Every one of those "Step 4: run to verify it passes" checkpoints is **unreachable** as written — the tests would stay red.
- **Why Task 2's unit tests don't catch it:** the only verb exercised in the `expandGeorgian` unit tests is `აიღე` (take), which ends in `ე`, not `ი`. The case labelled "passes a verb token through untouched" is vacuous for the failure mode. Task 3's wiring test also uses `აიღე`. So all the green checkmarks in Milestone A pass while the mechanism is silently broken for a third of the verb set.
- **Recommended fix:** redesign the precedence so the verb is resolved against its **unreduced** form. Options: (a) run verb resolution first on `tokenize(clause)`, then `expandGeorgian` only the _remainder_ (the object/indirect span); (b) have `expandGeorgian` skip token 0 (positional carve-out) — fragile, breaks idioms/particles; (c) make the `-ი` strip _lexicon-aware_ (only strip when the bare stem is a known noun, never when the full token is a known verb). Whichever is chosen, add a unit test whose verb is `ი`-final (e.g. `მიეცი`) so the regression is pinned. This reorders Tasks 2/3 substantially and must be settled before any data authoring.

### [C2] Task 16 empties `OUTPUT_ONLY_LANGS` but the plan only patches 2 of its 6 consumers — three of the unpatched ones are behavior/contract regressions, and one is a guaranteed-red existing test

- **Category:** omission / contradiction
- **Severity:** critical
- **Problem:** `OUTPUT_ONLY_LANGS` has **six** consumers in the tree; Task 16 only touches two (`translatePipeline.ts:972` queue bail, and the definition in `types.ts:19`). The four it ignores:
  1. **`src/llm/useModelDownload.ts:324`** — `if (!readNlPref().declined && !OUTPUT_ONLY_LANGS.has(lang)) setModalOpen(true)`. This is the **sole guard that keeps the WebLLM download modal from opening for `ka`** (the code comment at 318–321 explicitly warns "The model-download egress must stay unreachable for ka"). Empty the set and picking `ka` now pops the download/upgrade modal — re-introducing exactly the focus-trapping unsolicited-download bug the comment documents, and contradicting Task 14's own premise that "the modal/download is never offered for `ka`". **This is a player-facing regression and an egress/offline-promise regression.**
  2. **`src/llm/useNaturalLanguage.ts:233`** — `if (OUTPUT_ONLY_LANGS.has(active)) setAnnounce(msg) else setNotice(msg)`. Emptying the set routes the `ka` activation tip to the inline `notice` instead of the dedicated one-shot `announce` live region. The Terminal's `ka` announce region (Terminal.tsx:375–378) renders `nl.announce`, so the activation tip **goes silent / moves channels** — an a11y regression for the exact screen-reader path the region was built for.
  3. **`src/ui/nlModeSummary.ts:53`** — `if (OUTPUT_ONLY_LANGS.has(state.language)) return ''`. Empties → the NL-mode summary string changes for `ka`. Unreviewed.
  4. **`src/llm/types.test.ts`** (existing, lines 7 and 17–20) — hard-asserts `OUTPUT_ONLY_LANGS.has('ka') === true` **and** that `OUTPUT_ONLY_LANGS ⊇ CORPUS_ONLY_LANGS`. Task 16 makes both assertions fail. **The plan never lists `types.test.ts` as a modified file** (it appears in neither the File Structure nor Task 16), so `make all` (Task 22) goes red with no instruction to fix it.
- **Deeper design problem (not just a stale test):** `types.test.ts:13–16` documents the invariant _why_ — a language whose **output** is corpus-only (no LLM that can produce it) must stay in `OUTPUT_ONLY_LANGS`. `ka` output **remains** corpus-only after Phase 2 (`CORPUS_ONLY_LANGS` still = `{'ka'}`, verified). So removing `ka` from `OUTPUT_ONLY_LANGS` while leaving it in `CORPUS_ONLY_LANGS` **violates the stated invariant**. The plan has conflated "the set that gated input raw-send" with "the set that marks no-output-LLM"; they are the same membership today but different jobs (the `types.ts:18` comment says exactly this).
- **Recommended fix:** Do **not** repurpose `OUTPUT_ONLY_LANGS` as the input gate. Introduce a separate predicate for the input decision (the plan already has `kaInputActive` — use it at every site) and leave `OUTPUT_ONLY_LANGS` meaning "no output LLM" intact (so `ka` stays in it, the modal stays suppressed, the announce stays routed, and `types.test.ts` stays green). Then Task 16 becomes "the queue bail keys on `kaInputActive`/grammar-only, not on a now-stale membership," and Tasks 14/17/20 don't have to fight the side effects of an emptied set. If the owner truly wants the set emptied, the plan must enumerate and re-home **all six** consumers and update `types.test.ts` — and resolve the `CORPUS_ONLY_LANGS` superset invariant explicitly.

---

## SERIOUS

### [S1] Task 18 rewrites the shared `GEORGIAN_ACTIVATION_TIP` const, which destroys the Phase-1 copy Task 20 then requires for Zork II/III

- **Category:** contradiction
- **Severity:** serious
- **Problem:** `GEORGIAN_ACTIVATION_TIP` is a single exported const (`notices.ts:248`) consumed by both the bottom-bar visible copy and the `useNaturalLanguage` announce latch (via `notice('ka')` → `escapeHatchOnActivation` → returns the const). Task 18 **rewrites it in place** to the Georgian-_input_ semantics. But Task 20 demands that on Zork II/III `ka` (no input lexicon) the player still sees the **Phase-1 type-English** activation tip — and that string no longer exists after Task 18. The plan supplies a `commandPlaceholderTypeEnglish('ka')` helper for the _placeholder_ split but provides **no equivalent preserved-old-string for the activation tip**. Task 20's "else the Phase-1 tip" has no source.
- **Recommended fix:** Make the activation tip a function of game support, not a single const: keep the old type-English tip under a renamed export (e.g. `GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH`) and add the new input tip as a second const, then have Terminal/`escapeHatchOnActivation` choose based on `kaInputActive`. Because the latch lives in `useNaturalLanguage` (which has `signature` in scope) and the announce text is computed there, the gating likely belongs in the hook, not only in Terminal — the plan currently only mentions Terminal-side gating.

### [S2] `kaInputActive` cannot be evaluated where the plan needs it — the activation/announce gate lives in `useNaturalLanguage`, which the plan never wires for the `ka` input/Phase-1 split

- **Category:** omission / feasibility
- **Severity:** serious
- **Problem:** Task 20 says "gate `nl.announce`/the activation tip ... only when `kaActive`, else the Phase-1 tip," and implies the gating is in `Terminal.tsx`. But `nl.announce` is **set inside `useNaturalLanguage`** (the latch at useNaturalLanguage.ts:227–235), which is where the string is chosen. Terminal can suppress _rendering_ `nl.announce` but cannot change _which_ string the hook latched. The plan does not modify `useNaturalLanguage`'s activation latch for the Zork I vs II/III `ka` distinction, so the hook will latch whatever Task 18 left in the shared const regardless of game.
- **Recommended fix:** Pass the game/`kaInputActive` signal into the hook's activation-notice selection, or compute the announce string from `kaInputActive(language, signature)` inside the hook (signature is already in scope there). Add this as an explicit step; it is currently missing from Tasks 18–20.

### [S3] Task 1's stated type-safety guarantee is false for several of the maps it names — the comment the engineer is told to write is misleading

- **Category:** ambiguity / contradiction
- **Severity:** serious
- **Problem:** Task 1 instructs the engineer to document that `InputLexLang` keeps the LLM machinery `Record<LexLang,…>` "so a `ka` LLM entry is a type error by construction (FEWSHOTS, xlPrompt TARGET/SHIMMER, notices ByLang, fallbackResolve)." Verified against the tree, this is wrong on multiple counts:
  - `prompt.ts:85` — `FEWSHOTS: Record<LexLang | 'en', ChatMessages> & Partial<Record<'ka', ChatMessages>>`. `ka` is **already an allowed optional key**; no type error.
  - `notices.ts:26` — `ByLang = Record<LexLang | 'en', string> & Partial<Record<'ka', string>>`. `ka` allowed (the plan even relies on this in Task 18).
  - `inputTranslate.ts:458/464` — `CONFIRM_AFFIRMATIVE`/`CONFIRM_NEGATIVE` are `Partial<Record<ActiveLanguage, …>>`, and `ActiveLanguage` **includes** `ka`. No barrier.
  - `xlPrompt TARGET/SHIMMER` — **no such symbols exist** in `prompt.ts` (only `viewToContext`, `buildPrompt`, `FEWSHOTS`). The name is invented.
- **Why it matters:** the whole §5.1 "ka can never key the LLM by construction" claim is the plan's stated safety argument for skipping defensive checks. It does not hold; a `ka` FEWSHOTS/ByLang entry compiles fine. An engineer copying this comment ships a false invariant into the code.
- **Recommended fix:** Either (a) actually tighten the maps to bar `ka` (drop the `Partial<Record<'ka'>>` from `FEWSHOTS`/`ByLang`, narrow `CONFIRM_*` to `LexLang`-keyed) and _then_ the comment is true — but note `ByLang`'s `ka` key is needed for output notices, so this is not free; or (b) correct the comment to claim only what's enforced (the input-lexicon maps in `lexicon/index.ts` are `InputLexLang`-keyed; the LLM maps are _not_ statically barred from `ka`, so the gate is the `kaInputActive` runtime predicate). Remove the `xlPrompt TARGET/SHIMMER` reference.

### [S4] Task 14 guards two model-set sites but the **modal-open** site (the one that actually triggers the egress) is left to the now-broken `OUTPUT_ONLY_LANGS` guard

- **Category:** omission
- **Severity:** serious (compounds C2)
- **Problem:** Task 14 forces `model:'grammar'` at the cache-probe and cached-pick sites, and explicitly _dismisses_ the modal-open path: "The post-download success path (line ~229) is unreachable for `ka` (the modal/download is never offered for `ka`)." That unreachability **depends entirely on `useModelDownload.ts:324`'s `!OUTPUT_ONLY_LANGS.has(lang)` guard**, which Task 16 nullifies (see C2.1). After both tasks land, `ka` can open the modal, accept a download, and hit the success path that sets `model:'full'` — the precise state Task 14 set out to prevent. Task 14 and Task 16 are individually plausible and jointly wrong.
- **Recommended fix:** Replace the `OUTPUT_ONLY_LANGS.has(lang)` modal-suppression at useModelDownload.ts:324 with an explicit `lang !== 'ka'` (or a "no input LLM for this language" predicate), so suppression survives whatever happens to `OUTPUT_ONLY_LANGS`. Add it as a Task 14 step, with a test that picking `ka` (cached or not) never sets `modalOpen`.

---

## MODERATE

### [M1] Task 17 / Task 20 ignore three other `ka`-derived Terminal values; one (`upgradeModalOpen`) silently changes meaning

- **Category:** omission
- **Severity:** moderate
- **Problem:** Terminal.tsx derives five `ka`/`outputOnly`-dependent values: `outputOnly` (149), `nlInputOn` (150), `showBetaNotice` (181), `showNoCorpusNotice` (191), `upgradeModalOpen = nl.modalOpen && !outputOnly` (210). Tasks 17/20 only address `outputOnly`/`nlInputOn` and the placeholder/help branches. Once `outputOnly` is removed/forced false, `upgradeModalOpen` collapses to `nl.modalOpen` — and per C2.1/S4 `nl.modalOpen` can now be true for `ka`. `showBetaNotice`/`showNoCorpusNotice` happen to remain correct (output translation is still beta/corpus-gated), but the plan never reasons about them, so an implementer pattern-matching "replace `outputOnly`" may break or drop them.
- **Recommended fix:** Enumerate all five in Task 17, state the intended value of each post-change (beta/no-corpus notices unchanged; `upgradeModalOpen` must stay suppressed for `ka`), and add assertions.

### [M2] Corpus round-trip `reduce` (Task 10) mis-splits genuinely-instrumental display forms — "mechanically derived" has hand-judgment exceptions

- **Category:** feasibility / ambiguity
- **Severity:** moderate
- **Problem:** Task 10's `reduce` applies `expandGeorgian` to every display form, which postposition-splits **any** token ending in `ში/ზე/ით/დან/თან`. At least one shipped corpus form already trips this: `ZORK1_KA_OBJECTS` contains `ტყავის ტომარა მონეტებით` (leather bag _of coins_, rendered with instrumental `-ით`), whose last token `მონეტებით` ends in `ით`. `reduce` turns it into a 3-token `... ით მონეტებ`, which will not be a `KA_ZORK1` member, so the round-trip fails and the "bulk noun-completion is mechanically derived from the corpus" promise (Task 10 Step 3) needs human intervention there. The same hazard applies to any noun stem ending in a postposition look-alike. This is gate-surfaced (not silent), but it means the round-trip is not the turn-the-crank task the plan implies, and the `reduce` design (apply the _input_ pre-stage to _display_ genitive/instrumental phrases) is questionable — display forms are not imperative-clause objects.
- **Recommended fix:** Acknowledge the exception class in Task 10, decide a rule (e.g. only strip the _final-token_ nominative `-ი`; do not postposition-split inside multi-word display phrases), and budget hand-tuning for the colliding forms. Consider whether the corpus round-trip should reduce at all, vs. just adding the bare-stem forms to `KA_ZORK1` directly.

### [M3] Task 9's `KA_DATIVE_RECIPIENTS` helper is named in the File Structure but never defined or used — dangling artifact

- **Category:** ambiguity / contradiction
- **Severity:** moderate
- **Problem:** The File Structure (line 26) and Task 9's file list (line 937) promise a `KA_DATIVE_RECIPIENTS` helper exported from `expandGeorgian.ts`. The actual Task 9 implementation (the parse-branch at the proposed line ~521) never defines or references it — it inlines `tokens[1].endsWith('ს')` and relies on dative forms being listed in `KA_ZORK1`. An implementer will waste time hunting for / building a helper the design abandoned.
- **Recommended fix:** Delete the `KA_DATIVE_RECIPIENTS` references, or commit to it (a closed Set of dative recipient surfaces) and use it in the guard instead of the broad `endsWith('ს')` (which will also fire on any nominative noun that happens to end in `ს`, e.g. a future stem — currently safe only by luck of the Zork I noun set).

### [M4] Task 8 validate block and Task 9 lexicon-roundtrip both iterate `ka` over the **core-targets** loop too; only the noun loop is addressed

- **Category:** omission
- **Severity:** moderate
- **Problem:** `src/llm/lexicon/roundtrip.test.ts` has **two** `for (const lang of LANGS)` loops: the core-targets/preps loop (line ~55) and the noun round-trip loop (line ~75). Task 9 only describes the noun loop (the null-skip + removing the `!`). After widening `LANGS` to include `ka`, the **core-targets loop also runs for `ka`** and will validate `KA_CORE.verbs`/`preps` against the union vocab — redundant with Task 8 but, more importantly, unmentioned, so an implementer may be surprised by failures originating there (e.g. the `_`-suffixed placeholder verb keys from Task 4, or `თან:'at'`). The plan should say the core loop now covers `ka` and what it asserts.
- **Recommended fix:** Note both loops explicitly in Task 9; confirm the core-targets loop's expectations hold for `ka` (it should, given all targets verified as real vocab verbs/preps).

### [M5] `expandGeorgian` postposition split is single-pass but the spec contract says "to a fixpoint" — the plan waives it on an unproven assumption

- **Category:** feasibility
- **Severity:** moderate
- **Problem:** Task 2's note says the single-pass `[suffix, stem]` is fine because "the closed Zork I noun set does not exhibit a stem that itself ends in another postposition — the round-trip gate proves it." That is an assumption stated as fact before the gate exists. It is plausible but unverified, and the `-ი` strip interaction makes it subtler: after a postposition split, the stem is **not** re-checked for a nominative `-ი` either (the `continue` skips it). E.g. a hypothetical `Xიში` would split to `[ში, Xი]` and leave `Xი` un-stripped. Whether that matters depends on the noun set; the plan should not assert it's proven before Task 10 runs.
- **Recommended fix:** Soften the claim to "believed safe, enforced by the Task 10 round-trip; wrap in a `while` if the gate names a counterexample," and ensure the round-trip actually exercises the post-split stem (it currently joins and membership-checks, which would catch it).

---

## MINOR

### [m1] Task 3 regression test has an unused `kaNouns` binding — trips strict ESLint / `make all`

- **Category:** ambiguity
- **Severity:** minor
- **Problem:** Task 3's test declares `const kaNouns = { mailbox: ['ფოსტა'] }` but the `ka` case uses a local `nouns` instead; `kaNouns` is never read. Under the project's strict lint (and `make all` in Task 22, which must be clean), `no-unused-vars` fails.
- **Fix:** Remove `kaNouns` or use it.

### [m2] Task 3 note tells the engineer to read `byCanonical(...).emit`, but `byCanonical` is not exported

- **Category:** ambiguity
- **Severity:** minor
- **Problem:** The note "adjust to the actual `byCanonical(ZORK1_VOCAB,'mailbox').emit`" — `byCanonical` is a **module-local** function in parse.ts:115, not exported. The engineer can't call it from the test. (They can read the literal from `zork1.vocab.ts` instead, which the note also says.) Just imprecise guidance.
- **Fix:** Point at the vocab source file or `ZORK1_VOCAB.nouns.find(...)`.

### [m3] Redundant `wind up` mapping: KA_CORE lists `დააქოქე` both as a verb and as a verbIdiom

- **Category:** ambiguity
- **Severity:** minor
- **Problem:** Task 4 has `verbs: { …, დააქოქე: 'wind up' }` **and** `verbIdioms: [ …, { phrase: 'დააქოქე', to: 'wind up' } ]`. Idioms run first (parse.ts:355–365), so the verb entry is dead. Harmless but confusing, and the single-token "idiom" is pointless.
- **Fix:** Keep one (the plain verb entry suffices for a single token).

### [m4] Existing `directions.test.ts` uses a local `MOVE` array, not `ZORK1_VOCAB.movement`; Task 7's added block imports the vocab — inconsistent but functional

- **Category:** ambiguity
- **Severity:** minor
- **Problem:** Task 7's new describe imports `ZORK1_VOCAB` and uses `ZORK1_VOCAB.movement`, while the file's existing cases use a hand-rolled `MOVE`. Both contain `in`/`out`, so the Georgian `შიგნით:'in'`/`გარეთ:'out'` cases resolve. Just stylistic drift; verify the import path (`./grammar/zork1.vocab` from `src/llm/directions.test.ts`) is correct (it is).
- **Fix:** Optional — reuse `MOVE` for consistency, or leave as-is.

### [m5] Task 19 test imports `ESCAPE_EXAMPLE` and asserts `helpResponse('ka')` contains it; the `ka` arm uses `ESCAPE_EXAMPLES` (plural)

- **Category:** ambiguity
- **Severity:** minor (works, by luck)
- **Problem:** `ESCAPE_EXAMPLE = '"wind up canary"'` is a substring of `ESCAPE_EXAMPLES`, so `toContain(ESCAPE_EXAMPLE)` passes. But the intent (escape example present) is asserted only incidentally. Fine, just note the singular/plural distinction so the engineer doesn't "fix" the help arm to use the singular and weaken the message.

### [m6] Plan-wide: "35 distinct walkthrough verbs" / completeness counts are asserted, not derived

- **Category:** ambiguity
- **Severity:** minor
- **Problem:** Tasks 4/5/11 cite "the 35 distinct Zork I walkthrough verbs" and a headline-noun list as if fixed, but the real count is whatever `zork1Commands()` yields at runtime. The gate is correctly gate-driven; just don't let the prose count mislead (the `←review` placeholders and `_`-suffixed keys in Task 4 already flag churn).

---

## Cross-cutting note for the owner (G1 + the `ka` raw-echo follow-up)

The Open Decision G1 (dative recipient) is reasonably bounded and, **once C1 is fixed**, the parse branch is correctly placed (it sits after the whole-remainder and prep-split paths, which don't fire on the 2-noun dative shape). No objection to G1 as scoped. Separately, CLAUDE.md flags that **Phase-2 Georgian input must revisit every `ka` `{raw}`-echo** (disambiguation prompts currently echo the player's English noun, acceptable only while `ka` input is English). The plan does **not** address the disambiguation `{raw}`-echo at all — once a `ka` player types Georgian, an echoed English vocab word becomes forced English, violating the output-translation north star. This is in-scope for "Georgian input" per the project rules and is a notable omission worth a conversation before sign-off.

---

## Summary

- **Issues found:** 17 (2 critical, 4 serious, 5 moderate, 6 minor) + 1 cross-cutting scope omission.
- **Blocking before implementation:** C1 (broken core `-ი`-strip-vs-verb ordering) and C2 (`OUTPUT_ONLY_LANGS` repurposing breaks the modal-egress guard, the announce a11y routing, the nl-mode summary, and an existing test / a stated `CORPUS_ONLY_LANGS` invariant). S1/S2/S4 cascade from C2 and the shared-const activation tip.
- **Spec status:** **needs rework** before an engineer starts. The data-authoring tasks (4, 5) and the gates (8–12) are well-structured and gate-driven, but they sit on top of a parse mechanism (C1) that fails for ~30% of the verb set and a runtime-graduation sequence (14–17, 20) whose central assumption about `OUTPUT_ONLY_LANGS` is internally contradictory. Fix C1's ordering, replace the `OUTPUT_ONLY_LANGS`-emptying approach with a dedicated `kaInputActive` input gate (keeping `ka ∈ OUTPUT_ONLY_LANGS` for its real "no output LLM" meaning), then re-derive Tasks 14–21.
