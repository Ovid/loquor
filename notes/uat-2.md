# UAT-2: Zork I in French via the Natural-Language Layer

**Date:** 2026-06-09
**Tester:** Claude (ovid-uat)
**Branch:** ovid/more-parser-work
**Intent:** Black-box test of the WebLLM natural-language translation layer by
playing Zork I to completion in **French**, using deliberate misspellings,
compound sentences, and meta commands (`$VERIFY`, `restart`, etc.) to find where
the NL routing/translation works and where it breaks.

**Rule for this session:** Document everything, **fix nothing** (per user
instruction, overriding the skill's normal ovid-vibe fix loop).

---

## Legend

- ✅ **WORKS** — French (or meta) input translated to the correct canonical command.
- ⚠️ **DEGRADED** — translated, but imperfectly (wrong object, partial, slow).
- ❌ **FAIL** — wrong translation, no translation, or crash.
- 🇬🇧 **EN-FALLBACK** — had to switch to English to clear the obstacle.

For each finding: the **exact input**, the **translated/canonical command** (if
shown), and the **observed game output**.

---

## Environment / boot

- Dev server already running on `localhost:5173`.
- **First boot at `/`** used the _small_ model (fast). User then directed me to
  `http://localhost:5173/?model=full` to exercise the **larger LLM** — the rest of
  this session runs under `?model=full`.
- Landing plate ("— choose your descent —") → selected **Zork I** → "Light the lamp".
- Game: **ZORK I, Release 119 / Serial 880429** (walkthrough is Release 88 — expect
  minor wording differences; not NL-layer bugs).
- Status bar shows a **"English: on"** toggle (the NL layer) + "Change story" + theme.

### UI mechanics of the NL layer (observed)

- `> <raw text>` in dim italic = the **nl-source echo** (what the player typed).
- `› <command>` = the **translated canonical command** sent to the parser.
- Then the normal game output follows.
- **`…thinking`** placeholder appears while the LLM translates (esp. first call on
  `model=full`, which took ~10s as the larger model warmed up; subsequent calls
  faster).

### Observation O1 — nl-source echo not persisted across resume

On reload + "Light the lamp" (resume saved game), the transcript kept the translated
`› open small mailbox` line and its output, but the **French nl-source echo line was
gone**. Expected: the `nl-source` line is UI-only/ephemeral, so this is likely _by
design_ (echo is a live affordance, not saved). Noting as behaviour, not a bug.

---

## Findings log

(chronological)

| #   | Lang | Input                                            | Translated →         | Result                           |
| --- | ---- | ------------------------------------------------ | -------------------- | -------------------------------- |
| 1   | FR   | `ouvre la boîte aux lettres`                     | `open small mailbox` | ✅ (small model)                 |
| 2   | FR   | `lis le dépliant`                                | `read leaflet`       | ✅ (full model; ~10s first call) |
| 3   | FR   | `laisse tomber le dépliant` (phrasal "let fall") | `drop leaflet`       | ✅                               |
| 4   | FR   | `va au sud`                                      | `south`              | ✅                               |
| 5   | DE   | `geh nach Osten`                                 | `east`               | ✅                               |

### ⚠️ Finding F-A — type-ahead during "…thinking" is silently dropped (no input queue)

Sent four commands in quick succession with ~5s between each (`va au sud`,
`geh nach Osten`, `abre la ventana`, `entra en la casa`). Only the **first two
registered** (Turns advanced 3→5). The two Spanish commands produced **no echo, no
translation, no turn — they vanished**. Because `model=full` translation can take

> 5s, the later keystrokes landed while the UI was still `…thinking` and were
> discarded with no feedback (input box ended empty, nothing queued).

**Why it matters:** real users type ahead, especially in a slow LLM-translation
loop. Dropping commands silently (no "please wait", no queue, no error) loses player
actions invisibly. Severity: medium UX. (Not a translation bug — a turn-pacing/input
bug.) Documented only — not fixing per instructions.
**Repro:** type a 2nd command within a few seconds of the first while `…thinking`
is shown.

| #   | Lang          | Input                                 | Translated →                             | Result                                |
| --- | ------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------- |
| 6   | ES            | `abre la ventana`                     | `open window`                            | ✅                                    |
| 7   | ES            | `entra en la casa`                    | `in`                                     | ✅ (entered Kitchen, +10 score)       |
| 8   | DE            | `geh nach Westen`                     | `west`                                   | ✅                                    |
| 9   | FR (compound) | `prends la lampe et déplace le tapis` | `take brass lantern` **+** `move carpet` | ✅✅ split into 2 turns, both correct |

### ✅ Finding F-B — compound sentences split correctly

`prends la lampe et déplace le tapis` produced **two** canonical commands
(`take brass lantern`, then `move carpet`), each executed as its own turn. The "et"
conjunction was understood and "tapis"→"carpet" (rug synonym) resolved. Excellent.

| #   | Lang                | Input                                | Translated →                                   | Result                            |
| --- | ------------------- | ------------------------------------ | ---------------------------------------------- | --------------------------------- |
| 10  | FR (compound)       | `ouvre la trappe et allume la lampe` | `open trap door` **+** `turn on brass lantern` | ✅✅                              |
| 11  | FR (**misspelled**) | `decends` (for "descends")           | `down`                                         | ✅ entered Cellar, +25 (Score 35) |

### ✅ Finding F-C — misspelled French tolerated

`decends` (transposition typo of "descends") still resolved to `down`. Good
robustness to native-speaker typos.

| #   | Lang          | Input                             | Translated →                 | Result                                 |
| --- | ------------- | --------------------------------- | ---------------------------- | -------------------------------------- |
| 12  | ES            | `ve al sur`                       | `south`                      | ✅                                     |
| 13  | FR (compound) | `va à l'est et prends le tableau` | `east` **+** `take painting` | ✅✅ "tableau"→painting, +4 (Score 39) |
| 14  | FR            | `va au nord`                      | `north`                      | ✅                                     |
| 15  | FR            | `monte par la cheminée`           | `climb chimney`              | ✅ (uncommon phrasing handled)         |
| 16  | FR (meta)     | `inventaire`                      | `inventory`                  | ✅ listed carried items                |

Note: `inventory` advanced the Turns counter (18→19). Consistent with Zork's move
counter; not an NL bug.

| #   | Lang                       | Input                           | Translated →                   | Result                              |
| --- | -------------------------- | ------------------------------- | ------------------------------ | ----------------------------------- |
| 17  | DE                         | `geh nach oben`                 | `up`                           | ✅                                  |
| 18  | FR (compound, elided verb) | `prends la corde et le couteau` | `take rope` **+** `take knife` | ✅✅ inferred elided "take"         |
| 19  | FR (compound, "puis")      | `descends puis va à l'ouest`    | `down` **+** `west`            | ✅✅ "puis"(then) conjunction works |

### ❌ Finding F-D — 4-clause compound silently DROPS middle clauses (kept 1st + last)

Input: `ouvre la vitrine, mets le tableau dedans, lâche le couteau et prends l'épée`
(4 actions: open case / put painting inside / drop knife / take sword).
Produced only **2** canonical commands:

- `open trophy case` ✅ ("vitrine"→trophy case is correct)
- `take sword` ✅
  The **two middle clauses were dropped entirely** — the painting was NOT put in the
  case and the knife was NOT dropped (Turns advanced only 24→26). The splitter appears
  to keep the FIRST and LAST clause and discard the interior ones.

**Severity:** HIGH — silent loss of player actions in a compound. A user issuing a
multi-step command would believe all steps ran. Need to characterize the exact
breakpoint (does it fail at 3 clauses? only 4+? is it the "dedans" anaphora?). See
isolation tests below.

### ❌ Finding F-E — container anaphora "dedans" (inside) mis-resolved

Isolation test of the dropped clause, run alone:

- `mets le tableau dedans` → `put painting in **painting**` → "You can't do that."
  The "dedans"/"inside" was resolved to the **direct object itself** instead of the
  just-opened trophy case. The model filled the container slot with "painting" again.
- Control: `mets le tableau dans la vitrine` (explicit noun) → `put painting in
trophy case` → "Done." ✅ (+6, Score 45). So "vitrine"→trophy case is fine; the
  failure is purely the unresolved **anaphora** when the container is implicit.
- Control: `lâche le couteau` (other dropped clause) → `drop knife` → "Dropped." ✅

**Takeaway:** implicit/pronominal references to a container ("dedans", "inside",
"there") don't bind to the salient object from prior context. Medium severity.

| #   | Lang          | Input                             | Translated →                  | Result           |
| --- | ------------- | --------------------------------- | ----------------------------- | ---------------- |
| 20  | FR (anaphora) | `mets le tableau dedans`          | `put painting in painting`    | ❌ nonsense      |
| 21  | FR            | `mets le tableau dans la vitrine` | `put painting in trophy case` | ✅ +6 (Score 45) |
| 22  | FR            | `lâche le couteau`                | `drop knife`                  | ✅               |

### ❌ Finding F-F — "trappe" (trap door) mistranslated to "trophy case" (context bleed)

`ouvre la trappe et descends` →

- `open trophy case` → "It is already open." ← **WRONG**: "trappe" = _trap door_.
- (second action skipped — see F-G)

"trappe" is unambiguously the trap door in French. Immediately after a run of
trophy-case interactions (open case / put painting in case), the model translated
"trappe" → "trophy case". Looks like **conversational-context contamination** (the
recently-salient object) compounded by trappe/trophy orthographic similarity.
**Severity:** HIGH for gameplay — sends a wrong object; here it also aborted the
compound. Re-test for reproducibility below.
**REPRODUCED:** `ouvre la trappe` issued alone (next turn) → `open trophy case` →
"It is already open." again. So this is a **consistent** mistranslation in this
context, not a fluke. → forced an English fallback (see F-H).

### ❌❌ Finding F-H — intent-inference cascade: even English `open trap door` → `down`

After the F-F mistranslations, I switched to **English** to recover. Typed the
literal canonical command `open trap door`. It was translated to **`down`** (!) →
"The trap door is closed."

This is the most serious finding so far. The model is **not translating literally —
it is inferring "what the player must want next" from conversational context**, and
that context is poisoned:

1. `ouvre la trappe` → "open trophy case" → "It is already open." (F-F)
2. Model now believes the _trap door_ is already open (it conflated trappe↔trophy).
3. So my literal `open trap door` is "helpfully" rewritten to `down` (skip the
   redundant open) → but the REAL trap door is closed, so it fails.

**Impact:** the NL layer overrides an explicit, correct, literal command and
substitutes a different action based on a wrong world-model. Even an English
fallback can't recover while the context is poisoned. **Severity: HIGH.** The layer
should pass through / faithfully translate an explicit imperative rather than
re-plan from a stale belief.
→ Forced me to disable the NL layer via the "English: on" toggle to proceed (F-I).

### ✅ Finding F-I — "English: on/off" toggle is a working passthrough escape hatch

Clicking the status-bar **"English: on"** → **"English: off · installed"** disables
LLM translation; typed text goes straight to the Z-machine parser. With it OFF, the
literal `open trap door` → "The door reluctantly opens..." ✅ (instant, no
`…thinking`). This is the recovery path out of the F-H cascade. Good that it exists;
notable that a user must _know_ to use it. (The `· installed` chip shows the model is
cached.)

| #   | Lang          | Input                         | Translated →                 | Result                                            |
| --- | ------------- | ----------------------------- | ---------------------------- | ------------------------------------------------- |
| 23  | FR (compound) | `ouvre la trappe et descends` | `open trophy case` (×1 of 2) | ❌ F-F + F-G                                      |
| 24  | FR            | `ouvre la trappe`             | `open trophy case`           | ❌ F-F reproduced                                 |
| 25  | EN            | `open trap door` (NL on)      | `down`                       | ❌ F-H cascade                                    |
| 26  | EN            | `open trap door` (**NL off**) | `open trap door`             | ✅ door opens (passthrough)                       |
| 27  | FR            | `descends` (NL back on)       | `down`                       | ✅ recovered; poisoning was trappe-specific       |
| 28  | FR            | `va au nord`                  | `north`                      | ✅ → Troll Room                                   |
| 29  | FR            | `ramasse l'épée`              | `take sword`                 | ✅ "ramasse"(pick up)→take                        |
| 30  | FR            | `tue le troll avec l'épée`    | `attack troll with sword`    | ✅ troll killed; "tue X avec Y" structure correct |

### ✅ Finding F-J — `$VERIFY` ($-debug) routed deterministically

`$VERIFY` → echoed verbatim `$VERIFY` → "Verifying disk... The disk is correct."
Fast, no `…thinking` — confirms the deterministic `$`-debug pre-LLM routing. ✅

### ✅ Finding F-K — `restart` + confirmation contract handled correctly

`restart` → score/rank summary → "Do you wish to restart? (Y is affirmative):".
Typed `no` → passed through **verbatim** to the Y/N prompt (NOT LLM-translated) →
game resumed unchanged (Score 45, Turns 38, progress preserved). The NL layer
correctly **yields to the engine's confirmation prompt**. ✅ (validates the recent
"pin restart confirmation contract" work).

| #   | Lang                  | Input                          | Translated →                 | Result                     |
| --- | --------------------- | ------------------------------ | ---------------------------- | -------------------------- |
| 31  | meta                  | `$VERIFY`                      | `$VERIFY` (verbatim)         | ✅ disk correct            |
| 32  | meta                  | `restart`                      | `restart`                    | ✅ shows confirm prompt    |
| 33  | confirm               | `no`                           | (passthrough to Y/N)         | ✅ declined, progress kept |
| 34  | DE (phrasal)          | `lass das Schwert fallen`      | `drop sword`                 | ✅                         |
| 35  | ES                    | `ve al este`                   | `east`                       | ✅                         |
| 36  | DE                    | `geh nach Osten`               | `east`                       | ✅                         |
| 37  | FR (hyphen dir)       | `va au sud-est`                | `southeast`                  | ✅                         |
| 38  | FR (2-object spatial) | `attache la corde à la rampe`  | `tie rope to wooden railing` | ✅ "rampe"→railing         |
| 39  | FR (compound)         | `descends et prends la torche` | `down` **+** `take torch`    | ✅✅ +14 (Score 64)        |

### ❌ Finding F-L — "lampe" (lantern) mistranslated to "torch" (wrong light source)

`éteins la lampe et va au sud` →

- `turn off **torch**` → "You nearly burn your hand trying to extinguish the flame."
  ← WRONG: "lampe" = the **brass lantern**, not the ivory **torch**.
- `south` ✅ (compound itself worked)

Same failure family as F-F: when two same-category objects are present (lantern +
torch, both light sources), the model binds to the **more salient/recent** one
(torch was just taken) rather than the literal word. The lantern stayed ON.
**Severity:** MEDIUM (wrong but visible — you'd notice the wrong device toggled).
Follow-up: does the more specific "lanterne" disambiguate? (see #40)

| #   | Lang                 | Input                                           | Translated →                    | Result                                          |
| --- | -------------------- | ----------------------------------------------- | ------------------------------- | ----------------------------------------------- |
| 40  | FR                   | `éteins la lanterne`                            | `turn off brass lantern`        | ✅ specific word disambiguates (vs #39 "lampe") |
| 41  | FR (compound)        | `va à l'est et prends le cercueil`              | `east` **+** `take gold coffin` | ✅✅ "cercueil"→coffin, +10 (Score 74)          |
| 42  | FR                   | `prie`                                          | `pray`                          | ✅ teleport to Forest                           |
| 43  | FR                   | `va au sud` / `va au nord`                      | `south` / `north`               | ✅✅ forest nav                                 |
| 44  | FR/ES (4-move batch) | `va à l'est`,`descends`,`descends`,`va au nord` | east, down, down, north         | ✅✅✅✅ reached End of Rainbow                 |

### ❌ Finding F-M — "pose" (put down / set down) mistranslated to its INVERSE "take"

`pose le cercueil et ouvre le cercueil` →

- `take gold coffin` → "You already have that!" ← WRONG: "pose" = _put down/drop_,
  not _take_. The model emitted the **opposite** action.
- `open gold coffin` → "The gold coffin opens." ✅
  French "poser qqch" = to set/put something down. Other drop-verbs worked earlier
  (`laisse tomber`→drop #3, `lâche`→drop #22, DE `lass…fallen`→drop #34), so this is
  specific to **"poser"**. **Severity:** MEDIUM-HIGH — emitting the inverse verb is
  worse than a no-op; in a different spot "take vs drop" could matter (load, theft).
  (Coffin stayed in inventory; harmless here since open works while carried.)

### ❌❌ Finding F-N — "wave/shake" verbs default to `take <object>` ("take"-fallback bias)

At End of Rainbow, the puzzle action is **wave sceptre**. In French:

- `agite le sceptre` (wave) → `take sceptre` → "You already have that!" ❌
- `secoue le sceptre` (shake) → `take sceptre` → "You already have that!" ❌
  Both wave-synonyms collapsed to **take**. Combined with F-M (`pose`→take), this shows
  a systematic **bias to emit `take <salient object>` when the verb isn't confidently
  mapped**. This BLOCKS a required puzzle (wave makes the rainbow solid → pot of gold).
  **Severity:** HIGH — an unmapped-but-common action verb silently becomes a different,
  plausible-looking action, derailing puzzles with no error. Required English fallback
  (F-O).
  | # | Lang | Input | Translated → | Result |
  |---|------|-------|--------------|--------|
  | 45 | FR | `prends le sceptre` | `take sceptre` | ✅ +4 (Score 78) |
  | 46 | FR | `agite le sceptre` (wave) | `take sceptre` | ❌ |
  | 47 | FR | `secoue le sceptre` (shake) | `take sceptre` | ❌ |
  | 48 | EN (fallback) | `wave sceptre` | `wave sceptre` | ✅ rainbow solid, pot of gold (F-O) |
  | 49 | FR | `prends l'or` (alone) | `take pot of gold` | ✅ "or"→pot of gold (correct!) but load too heavy |

### ✅ Finding F-O — English fallback recovers the wave puzzle

`wave sceptre` (English, NL on) → `wave sceptre` (identity) → puzzle solved. Confirms
the "take"-bias (F-N) is specific to **mapping non-English action verbs**, not English
imperatives. The English-fallback workflow works.

### ❌ Finding F-P — intra-compound salience: 2nd clause object bound to clause-1's object

`lâche le cercueil et prends l'or` →

- `drop gold coffin` ✅ ("lâche"→drop)
- `take gold coffin` ❌ — the 2nd clause `prends l'or` ("take the **gold**") resolved
  "or" to the **gold coffin just dropped in clause 1** instead of the **pot of gold**.
  Note: the SAME phrase `prends l'or` alone (#49) correctly gave "take pot of gold".
  So the compound made clause-1's object (gold coffin) salient and clause-2 bound to it.
  Same failure family as F-F/F-L (salience over literal meaning), now demonstrated
  **within a single compound**. **Severity:** MEDIUM-HIGH.

| #   | Lang          | Input                              | Translated →                                | Result                          |
| --- | ------------- | ---------------------------------- | ------------------------------------------- | ------------------------------- |
| 50  | FR (compound) | `lâche le cercueil et prends l'or` | `drop gold coffin` **+** `take gold coffin` | ◐ clause1 ✅ / clause2 ❌ (F-P) |

### ◐ Finding F-G — compound aborts after a no-op first action ("Ran N of M actions")

The compound printed **"Ran 1 of 2 actions."** and did NOT run `descends`, because the
(mis-translated) first action returned "It is already open" and the failure-detector
treated it as a failure. **Positive:** unlike F-D's silent drop, this is _explicit_
user feedback (good!). **Caveat:** "already open" is a soft no-op, not a true
failure; aborting the rest of the batch on it is debatable — and here the only reason
it triggered was the F-F mistranslation. (This is the `scope compound
failure-detection` logic from recent commits doing its job, just fed a bad command.)

---

## Summary

**Session 1 reached: End of Rainbow, Score 78/350, Turn 69** (`?model=full`, NL on).
50 NL inputs issued across FR/DE/ES + misspellings + compounds + meta + special
commands. Session paused to hand off to a fresh session for the grind to 350 (see
`prompt.md`).

### What WORKS (robust)

- **Directions** in FR/DE/ES incl. hyphenated (`sud-est`→southeast) and localized
  meta (`inventaire`→inventory). All reliable.
- **Verb+object** translation across languages: open/take/read/drop/attack/tie/turn
  off, etc. (`ouvre la boîte aux lettres`→open small mailbox, `tue le troll avec
l'épée`→attack troll with sword, `attache la corde à la rampe`→tie rope to wooden
  railing).
- **Synonyms/uncommon phrasings:** `monte par la cheminée`→climb chimney,
  `ramasse`→take, `laisse tomber`/`lâche`→drop, DE `lass…fallen`→drop.
- **Noun synonyms:** tableau→painting, cercueil→coffin, vitrine→trophy case,
  rampe→railing, or→pot of gold, lanterne→brass lantern.
- **Misspellings:** `decends`→down (native typo tolerated).
- **Compounds:** 2–3 clause `et`/`puis` splits work great, incl. elided verb
  (`prends la corde et le couteau`) and movement+action.
- **Special/meta commands:** `$VERIFY` (deterministic), `restart` + Y/N confirmation
  passthrough, **English: on/off toggle** (passthrough escape hatch). All correct.
- **English fallback** always works (identity translation).

### What FAILS (by severity)

- **HIGH — `take`-fallback verb bias (F-N):** unmapped action verbs (`agite`/`secoue`
  = wave/shake; also `pose`) silently become `take <object>`. Blocks puzzles
  (wave-sceptre). Plausible-but-wrong output, no error.
- **HIGH — context/salience wrong-object binding (F-F, F-H, F-L, F-P):** the model
  binds ambiguous nouns to the _recently-salient_ object, not the literal word:
  `trappe`→trophy case (after case interactions), `lampe`→torch (after taking torch),
  intra-compound `or`→gold coffin. Cascades: poisoned context made even English
  `open trap door`→`down` (F-H), requiring the NL toggle to recover.
- **HIGH — silent middle-clause drop in 4-clause compounds (F-D):** a 4-action
  compound kept only first+last clauses, dropping the middle two with no feedback.
  (Contrast F-G: when a compound action _errors_, you DO get "Ran N of M actions".)
- **MEDIUM — `pose`→take inverse verb (F-M):** "put down" became "take".
- **MEDIUM — container anaphora unresolved (F-E):** `mets le tableau dedans`→"put
  painting in painting"; implicit/pronominal container refs don't bind.
- **MEDIUM (UX) — no type-ahead queue (F-A):** typing during `…thinking` silently
  drops the input. Easy to lose commands in a slow LLM loop.

### Cross-cutting note

Most wrong-object/wrong-verb failures share one root: the LLM **re-plans from
conversational context / a world-model** instead of faithfully translating the
literal imperative. It works beautifully when context agrees with intent, and
derails (sometimes irrecoverably) when a recently-salient object/action competes.
A "translate literally, don't infer intent / don't re-plan" constraint — and/or a
type-ahead queue + a literal-passthrough on explicit canonical verbs — would address
the bulk of the HIGH findings.

### Practical workarounds (for the resuming session)

- Drop = use `lâche` / `laisse tomber` (NOT `pose`).
- The lantern = `lanterne` (NOT `lampe`).
- Wave/shake & other rare verbs = use **English** (`wave sceptre`).
- Disambiguate objects with explicit nouns; avoid pronouns (`dedans`, `-le`).
- If context is poisoned (wrong object stuck), toggle **English: off** and send the
  literal command, or rephrase.
- Send ONE command at a time; wait ~8–10s for `…thinking` to clear before the next.

---

# SESSION 3 — resume (End of Rainbow, Score 78) → grind to 350

**Date:** 2026-06-09 (continued). `?model=full`, NL on. Resumed cleanly: status read
**End of Rainbow · Score 78 · Turns 69** exactly as handed off. Resume verified ✅.

## New findings (Session 3)

### ❌❌ Finding F-Q — drop-verbs collapse to a movement (`down`) at End of Rainbow (scene re-plan; empty scope)

At End of Rainbow (rainbow just waved solid → "walkable… stairs and bannister"), every
attempt to drop the coffin became the movement `down`:

- `lâche le cercueil` → `down` → "You can't go that way." (×2, deterministic)
- `laisse tomber le cercueil` (different, previously-good drop-verb) → `down`
- **English** `drop coffin` (NL on) → `down` ← English re-planned too (F-H-class cascade)
  Console (`[nl debug]`): all four produced **raw `{"verb":"down"}`** with **`inScope:[]`**
  (EMPTY — the carried coffin/sceptre and the on-ground pot of gold were NOT extracted into
  scope at all). With nothing in scope and a salient "go down the rainbow" scene, the model
  discards the verb "drop" and emits the scene's obvious movement. Note `lâche`/`laisse
tomber` worked as _drop_ in Session 2 — so this is **scene/context dependent**, not a fixed
  verb-mapping. **Severity: HIGH** (silently wrong + wasted 4 turns; toggling English off was
  the only recovery). Same root family as F-H/F-F (re-plan from context over literal intent).

### ❌ Finding F-R — `abstain` path leaks raw foreign text to the parser

`entre dans la maison` (enter the house): console raw = **`{"verb":"enter","object":"white
house"}`** (a perfectly serviceable reading) but **`result: abstain`** → the layer then sent
the **raw French** to the Z-machine → "I don't know the word \"entre\"." So when the layer
abstains, it passes the _untranslated_ user text through; a foreign verb the model actually
understood still reaches the parser as gibberish. (Didn't block me: the next `va à
l'ouest`→west entered the Kitchen via the window.) **Severity: MEDIUM.**

### ❌❌ Finding F-S — 2-object compound into a container is totally mis-bound

`mets le cercueil et le sceptre dans la vitrine` ("put the coffin AND the sceptre in the
case") → **`take nasty knife`** + **`take painting`** (both "Your load is too heavy"). Three
failures stacked: verb `mets`(put)→**take** (take-bias, F-N/F-M family); objects
cercueil/sceptre → **nasty knife/painting** (snapped to room-salient objects); container
`dans la vitrine` **dropped**. Wasted 2 turns. **Severity: HIGH.**

### ❌❌ Finding F-T — trophy case + carried inventory missing from scope → banking broken in BOTH languages

Singular `mets le cercueil dans la vitrine` → **`put nasty knife in painting`** → "You don't
have the nasty knife." Console: **`inScope:["nasty knife","painting"]`** only — the **trophy
case itself and the player's carried items are absent from scope**. Likely mechanism: when
the case is open with contents the room renders "Your collection of treasures consists of:"
(no literal "trophy case" string), so the scope extractor never captures the case; inventory
isn't included either. So `vitrine`→painting, `cercueil`→knife.
**Escalation (English corrupted too):** `put coffin in case` (NL on) → **`put nasty knife in
nasty knife`** → fails. A valid English command rewritten to nonsense.
**Proof it's the layer:** with **English: off**, literal `put coffin in case` / `put sceptre
in case` → "Done." (+21, Score 99). **Severity: HIGH** — this blocks treasure-banking, a
repeated core endgame action, every time after the first treasure is cased. Standing
workaround for the rest of the run: **toggle English off to bank, back on to explore.**

## New positives confirmed (Session 3 — regressions FIXED vs Session 1)

- ✅ **Diagonals work now** (Session-1 F-8 was `sud-est`→south): `va au sud-ouest`→southwest,
  `va au nord-ouest`→northwest. Both routed correctly.
- ✅ **Phantom scope nouns gone** (Session-1 R1: "random object"/"number"/"cretin" no longer
  appear). `inScope` arrays are now clean (real objects, or empty).
- ✅ FR/DE/ES directions still solid: `monte`/`geh nach oben`→up, `ve al oeste`/`va à
l'ouest`/`geh nach Westen`→west.

| #   | Lang          | Input                                            | Translated →                         | Result                               |
| --- | ------------- | ------------------------------------------------ | ------------------------------------ | ------------------------------------ |
| 51  | FR            | `lâche le cercueil`                              | `down`                               | ❌ F-Q (raw {verb:down}, inScope:[]) |
| 52  | FR            | `lâche le cercueil` (retry)                      | `down`                               | ❌ F-Q deterministic                 |
| 53  | FR            | `laisse tomber le cercueil`                      | `down`                               | ❌ F-Q (other drop-verb, same)       |
| 54  | EN            | `drop coffin` (NL on)                            | `down`                               | ❌ F-Q English re-planned            |
| 55  | FR            | `va au sud-ouest`                                | `southwest`                          | ✅ diagonal FIXED                    |
| 56  | FR            | `monte`                                          | `up`                                 | ✅                                   |
| 57  | DE            | `geh nach oben`                                  | `up`                                 | ✅                                   |
| 58  | FR            | `va au nord-ouest`                               | `northwest`                          | ✅ diagonal                          |
| 59  | ES            | `ve al oeste`                                    | `west`                               | ✅                                   |
| 60  | FR            | `entre dans la maison`                           | abstain → raw passthrough            | ❌ F-R ("I don't know entre")        |
| 61  | FR            | `va à l'ouest`                                   | `west`                               | ✅ (entered Kitchen via window)      |
| 62  | DE            | `geh nach Westen`                                | `west`                               | ✅ → Living Room                     |
| 63  | FR (compound) | `mets le cercueil et le sceptre dans la vitrine` | `take nasty knife` + `take painting` | ❌❌ F-S                             |
| 64  | FR            | `mets le cercueil dans la vitrine`               | `put nasty knife in painting`        | ❌ F-T (case not in scope)           |
| 65  | EN            | `put coffin in case` (NL on)                     | `put nasty knife in nasty knife`     | ❌ F-T escalated                     |
| 66  | EN            | `put coffin in case` (**NL off**)                | (passthrough)                        | ✅ Done. banked                      |
| 67  | EN            | `put sceptre in case` (**NL off**)               | (passthrough)                        | ✅ Done. Score 99                    |

## Dam segment findings

### ❌ Finding F-F-variant — `ouvre la trappe` → `open nasty knife` (trap door not in scope; snaps to salient object)

Back at the Living Room (case shown as "your collection of treasures"), `ouvre la trappe`
→ **`open nasty knife`** → "You must tell me how to do that to a nasty knife." The trap door
(closed, not in the room text) isn't in scope, so "trappe" snaps to the salient `nasty knife`
on the floor. In Session 2 (F-F) the same word snapped to `trophy case`; the target just
depends on what's salient/in-scope. Opened it with English-off. **Severity: HIGH** (out-of-
scope objects can't be referenced in any language).

### ❌ Finding F-U — French health-meta not recognized (`diagnostic`/`examine-moi` → examine a salient object)

- `diagnostic` (FR "diagnose") → **`examine control panel`** → "nothing special."
- `examine-moi` (examine self) → **`examine green bubble`** → "nothing special."
  Neither routes as the `diagnose` health meta (English `diagnose` does — Session 1). The LLM
  drops the meta/reflexive sense and maps to "examine <whatever's salient>" — and picks a
  _different_ object each time (control panel, then green bubble). Each consumed a turn.
  Same family as Session-1 F5 (`inventaire`→look). **Severity: MEDIUM.**

### ❌ Finding F-V — bare French "clé" not mapped to "wrench" (defaults to matchbook even with wrench in scope)

`prends la clé` (take wrench) → **`take matchbook`** → "You already have that!" Console:
`inScope` _contains_ "wrench" yet raw = `{verb:"take",object:"matchbook"}`. Bare "clé"
(=key/wrench ambiguous; wrench is "clé à molette/anglaise") isn't connected to "wrench"; the
model defaults to the small carried matchbook. Contrast `prends le tournevis`→take screwdriver
✅ (clear cognate). Later `tourne le boulon avec la clé` mapped "clé"→**screwdriver** (the
only tool still in scope, since the wrench was now _carried_ — see ROOT CAUSE below).
**Severity: MEDIUM-HIGH** (blocks the 2-object dam command in French).

### ❌ Finding F-W — colored buttons not extracted into scope → `appuie sur le bouton jaune` → push matchbook

`appuie sur le bouton jaune` (push yellow button) → **`push matchbook`** → "no effect."
Console `inScope` has NO button entry (the wall is "a group of buttons colored blue, yellow,
brown, red" — individual buttons aren't extracted as objects), so "bouton jaune" has nothing
to bind to and snaps to the salient matchbook. **Severity: HIGH** (yellow button is required;
unreachable in any language via the layer — needed English-off). `push yellow button`
literally works fine with NL off.

### ⛔ ROOT CAUSE (cross-cutting, HIGH) — carried inventory is NEVER in `inScope`

Confirmed repeatedly: the player's **carried items are excluded from scope**. The coffin/
sceptre (F-T), and the **wrench** here (`tourne le boulon avec la clé`: inScope had bolt but
NOT the carried wrench → "clé"→screwdriver). Any command that references something you're
_holding_ can't bind to it and snaps to a room/scene object. This single gap drives a large
share of the wrong-object failures. (Scene/room objects ARE extracted; inventory is the hole.)

### F-R reconfirmed — `abstain` → raw passthrough leaks French

`tourne le boulon avec la clé`: model raw = `{verb:"turn on",object:"bolt",prep:"with",
indirect:"screwdriver"}` but **`result:abstain`** → raw French sent to parser → "I don't know
the word \"tourne\"." (Also "tourne"→"turn on" is the wrong nuance for turning a bolt.) The
abstain prevented a bad command but surfaced gibberish instead of a graceful message.

| #   | Lang | Input                                | Translated →                  | Result                                                        |
| --- | ---- | ------------------------------------ | ----------------------------- | ------------------------------------------------------------- |
| 68  | FR   | `ouvre la trappe` (case salient)     | `open nasty knife`            | ❌ F-F-variant                                                |
| 69  | EN   | `open trap door` (**NL off**)        | (passthrough)                 | ✅ opens                                                      |
| 70  | EN   | `down` (**NL off**)                  | → Cellar                      | ✅                                                            |
| 71  | FR   | `va au nord`                         | `north` → Troll Room          | ✅                                                            |
| 72  | DE   | `geh nach Osten`                     | `east`                        | ✅                                                            |
| 73  | ES   | `ve al norte`                        | `north` → Chasm               | ✅                                                            |
| 74  | FR   | `va au nord-est`                     | `northeast` → Reservoir South | ✅ diagonal                                                   |
| 75  | FR   | `va à l'est`                         | `east` → Dam                  | ✅                                                            |
| 76  | FR   | `diagnostic`                         | `examine control panel`       | ❌ F-U                                                        |
| 77  | FR   | `examine-moi`                        | `examine green bubble`        | ❌ F-U                                                        |
| 78  | FR   | `va au nord`                         | `north` → Dam Lobby           | ✅                                                            |
| 79  | FR   | `prends les allumettes`              | `take matchbook`              | ✅ allumettes→matchbook                                       |
| 80  | FR   | `va au nord`                         | `north` → Maintenance Room    | ✅                                                            |
| 81  | FR   | `prends la clé`                      | `take matchbook`              | ❌ F-V (wrench in scope, unmapped)                            |
| 82  | FR   | `prends le tournevis`                | `take screwdriver`            | ✅                                                            |
| 83  | FR   | `appuie sur le bouton jaune`         | `push matchbook`              | ❌ F-W (button not in scope)                                  |
| 84  | EN   | `take wrench` (**NL off**)           | (passthrough)                 | ✅ Taken                                                      |
| 85  | EN   | `push yellow button` (**NL off**)    | "Click."                      | ✅                                                            |
| 86  | EN   | `south`,`south` (**NL off**)         | → Dam                         | ✅✅                                                          |
| 87  | FR   | `tourne le boulon avec la clé`       | abstain → raw                 | ❌ F-R/F-V (turn on bolt w/ screwdriver; wrench out of scope) |
| 88  | EN   | `turn bolt with wrench` (**NL off**) | sluice gates open             | ✅                                                            |

## Hades + coal-mine-prep segment (Score 99 → 119)

### ❌ Finding F-X — `sonne la cloche` (ring the bell) → `turn on brass bell`

French "sonner" (to ring) mistranslated to **"turn on"** → "You can't turn that on." Should be
`ring bell`. The bell wasn't consumed (failed action), so I rang it safely with English-off.
Same verb-mismap family as F-M (`pose`→take) / F-N. **Severity: MEDIUM** (FR can't ring the
bell; needed English-off). NB: I ran the _entire timed one-shot Hades exorcism_ with NL off on
purpose — a fumbled French experiment there could soft-lock the bell. Documented, not a layer
pass/fail beyond F-X.

### ✅ Strong positive run (this segment): many FR verbs/nouns correct

A long stretch of French worked cleanly — the layer is genuinely good when the object is a
plain in-room noun and the verb is common/cognate:

- Nouns: `cloche`→brass bell, `bougies`→pair of candles, `livre`→black book, `crâne`→crystal
  skull, `sac`→brown sack, `ail`→clove of garlic, `allumettes`→matchbook, `tournevis`→screwdriver.
- Verbs: `frotte le miroir`→**rub mirror** (uncommon!), `lis le livre`→read book,
  `ouvre le sac`→open brown sack, `prends …`→take …, all directions incl. diagonals & the
  slide (`descends`→down).

| #       | Lang | Input                                                                                      | Translated →                                            | Result             |
| ------- | ---- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------ |
| 89-94   | FR   | `va au sud`/`descends`/`va au sud-est`/`va à l'est`/`descends`/`va au sud`                 | south/down(Loud-bounce→Round)/southeast/east/down/south | ✅ ×6 → Temple     |
| 95      | FR   | `prends la cloche`                                                                         | `take brass bell`                                       | ✅                 |
| 96      | FR   | `va au sud`                                                                                | `south` → Altar                                         | ✅                 |
| 97      | FR   | `prends les bougies`                                                                       | `take pair of candles`                                  | ✅                 |
| 98      | FR   | `prends le livre`                                                                          | `take black book`                                       | ✅                 |
| 99-100  | FR   | `descends`,`descends`                                                                      | down → Cave → Entrance to Hades                         | ✅✅               |
| 101     | FR   | `sonne la cloche`                                                                          | `turn on brass bell`                                    | ❌ F-X             |
| 102-106 | EN   | ring bell / take candles / light match / light candles with match / read book (**NL off**) | (passthrough)                                           | ✅ exorcism done   |
| 107     | FR   | `lis le livre`                                                                             | `read book`                                             | ✅ (prayer text)   |
| 108     | FR   | `va au sud`                                                                                | `south` → Land of the Dead                              | ✅                 |
| 109     | FR   | `prends le crâne`                                                                          | `take crystal skull`                                    | ✅ +10 (Score 109) |
| 110-112 | FR   | `va au nord`/`monte`/`va au nord`                                                          | north/up/north → Mirror Room                            | ✅✅✅             |
| 113     | FR   | `frotte le miroir`                                                                         | `rub mirror`                                            | ✅ uncommon verb   |
| 114-117 | FR   | `va au nord`/`va à l'ouest`/`descends`/`monte`                                             | Cold Passage/Slide Room/slide→Cellar/Living Room        | ✅✅✅✅           |
| 118     | EN   | `put skull in case` (**NL off**)                                                           | (passthrough)                                           | ✅ +10 (Score 119) |
| 119-120 | EN   | `drop book`,`drop candles` (**NL off**)                                                    | (passthrough)                                           | ✅✅               |
| 121     | FR   | `va à l'est`                                                                               | `east` → Kitchen                                        | ✅                 |
| 122     | FR   | `ouvre le sac`                                                                             | `open brown sack`                                       | ✅                 |
| 123     | FR   | `prends l'ail`                                                                             | `take clove of garlic`                                  | ✅                 |

## Reservoir / River segment (Score 119 → 133)

### ❌ Finding F-Z — layer emits the object's FULL descriptive name → Z-machine "That sentence isn't one I recognize"

`prends la pompe` → **`take hand-held air pump`** → "That sentence isn't one I recognize."
The translation is semantically right but the layer used the object's _full DESC_ ("hand-held
air pump"); the Z-parser only accepts "pump". A correct-looking command bounces off the
parser. (NL-off `take pump` worked.) **Severity: MEDIUM.**

### ⛔ Finding F-AA — `inScope` is a stale RECENCY WINDOW: accumulates dropped items, omits carried ones

The clearest scope evidence of the run. At the **Sandy Cave**, `creuse le sable avec la pelle`
→ console `inScope:["matchbook","screwdriver","brass bell","pair of candles","black book",
"crystal skull","clove of garlic","crystal trident","shovel","ground"]` → raw
`{verb:"dig",object:"shovel",prep:"with",indirect:"screwdriver"}` → `dig shovel with
screwdriver` → "You don't have that!" **SIX of those scope items are NOT present** (screwdriver/
candles/book/garlic were dropped at the Living Room turns ago, the bell is in Hades, the skull
is in the trophy case) and the actual target **"sand" is absent**. So `sable`(sand)→shovel,
`pelle`(shovel)→screwdriver. Same at the Dam Base (`gonfle…`: inScope had bell/candles/book/
skull/garlic but NOT the carried pump/lantern). **The scope is built from a recently-seen-noun
window that never evicts and never includes current inventory** — root cause of a large share
of wrong-object bindings. **Severity: HIGH.**

### ❌ Finding F-R (more instances) — 2-object instrument & phrasal verbs → abstain → raw French leaks

- `tourne le boulon avec la clé` → abstain → "I don't know tourne" (model: turn on bolt w/ screwdriver)
- `gonfle le plastique avec la pompe` → abstain → "I don't know gonfle" (model: push plastic w/ plastic; pump not in scope)
- `sors du bateau` (leave boat) → abstain → "I don't know sors"
  Pattern: when the model's structured output is judged invalid (often because the instrument/
  object resolved wrong via the scope gap), the layer **abstains and passes the raw French to the
  parser**, surfacing "I don't know <french verb>" instead of a graceful message.

### ❌ Other wrong-bindings this segment

- `traverse l'arc-en-ciel` (cross rainbow) → **`south`** → "You can't go that way." (cross-verb → wrong movement)
- `ouvre la bouée` (open buoy, carried) → **`open tan label`** (carried buoy not in scope → salient label)
- `prends l'émeraude` (take emerald) → **`take crystal skull`** (emerald not yet accessible; cased skull stale-in-scope)
- `allume la lanterne` (turn on lantern, carried) → **`light painting`** + auto-took painting OUT of case (F-Y, logged earlier)

### ✅ Positives this segment

`attends`→wait ✅, `prends la pelle`→take shovel ✅, `prends le scarabée`→take beautiful
jeweled scarab ✅ (+5), all FR/ES directions incl. diagonals ✅. NL-off river run survived the
falls (mechanics, not NL).

### ⚠ Gameplay note (NOT an NL bug) — thief stole the trunk + pot of gold

The trunk of jewels (revealed when the reservoir drained) and the pot of gold (left lying at
End of Rainbow — couldn't carry it on the F-Q episode) were both **taken by the wandering
thief** (END-OF-RAINBOW has no SACREDBIT; the I-THIEF daemon robs valuables from rooms it
passes). Both will reappear in the Treasure Room when the thief is killed. Confirmed via ZIL
(`1dungeon.zil` END-OF-RAINBOW flags; `1actions.zil` I-THIEF/ROB).

| #       | Lang | Input                               | Translated →                                        | Result                         |
| ------- | ---- | ----------------------------------- | --------------------------------------------------- | ------------------------------ |
| 124-128 | FR   | `va au nord`×? / `prends la pompe`  | nav to Reservoir cluster; `take hand-held air pump` | nav ✅; pump ❌ F-Z            |
| 129     | FR   | `prends le trident`                 | `take crystal trident`                              | ✅ +4 (Score 123)              |
| 130     | FR   | `tourne le boulon avec la clé`      | abstain→raw                                         | ❌ F-R (logged earlier as #87) |
| 131     | FR   | `gonfle le plastique avec la pompe` | abstain→raw "gonfle"                                | ❌ F-R/F-AA                    |
| 132     | FR   | `attends` ×N (river)                | `wait`                                              | ✅ drift                       |
| 133     | FR   | `sors du bateau`                    | abstain→raw "sors"                                  | ❌ F-R                         |
| 134     | FR   | `prends la pelle`                   | `take shovel`                                       | ✅                             |
| 135     | FR   | `creuse le sable avec la pelle`     | `dig shovel with screwdriver`                       | ❌ F-AA (stale scope)          |
| 136     | FR   | `prends le scarabée`                | `take beautiful jeweled scarab`                     | ✅ +5 (Score 128)              |
| 137     | FR   | `ouvre la bouée`                    | `open tan label`                                    | ❌ scope (carried buoy)        |
| 138     | FR   | `prends l'émeraude`                 | `take crystal skull`                                | ❌ stale scope                 |
| 139     | EN   | `open buoy`/`take emerald` (NL off) | (passthrough)                                       | ✅ +5 (Score 133)              |
| 140     | FR   | `traverse l'arc-en-ciel`            | `south`                                             | ❌ cross→wrong move            |

## Tree / Maze / Cyclops / Thief segment (Score 159 → 204)

### ✅ Positives — uncommon verbs + a 3-part command all correct

- `grimpe à l'arbre` (climb the tree) → **`climb tree`** ✅ (uncommon "grimper")
- `prends l'œuf` → **`take egg`** ✅ (+5)
- `donne l'œuf au voleur` → **`give egg to thief`** ✅✅ — a full 3-slot command (verb donner→give,
  DO œuf→egg, IO "au voleur"→to thief) routed perfectly. Best compound-structure result of the run.

### ❌ Finding F-BB — bare proper noun `Ulysse` (the cyclops magic word) → `look`

At the Cyclops Room the puzzle answer is the name "Ulysses/Odysseus". French `Ulysse` →
**`look`** (cyclops not dismissed). The LLM didn't recognize the bare proper noun as a magic
word / pass-through token and defaulted to `look`. English-off `ulysses` worked. **Severity:
MEDIUM** (a bare name/magic-word doesn't pass through; needs English-off). Compare the Loud
Room `écho` probe (pending) — same "bare magic word" question.

(Maze navigation, coins+key pickup, `ulysses`, and combat were run NL-off for reliability —
the maze is precise and the thief roams/robs there.)

| #       | Lang | Input                           | Translated →                        | Result                                     |
| ------- | ---- | ------------------------------- | ----------------------------------- | ------------------------------------------ |
| 141-144 | FR   | `va à l'est`×2 / `va au nord`×2 | east/east/north/north → Forest Path | ✅                                         |
| 145     | FR   | `grimpe à l'arbre`              | `climb tree`                        | ✅ → Up a Tree                             |
| 146     | FR   | `prends l'œuf`                  | `take egg`                          | ✅ +5 (Score 164)                          |
| 147     | FR   | `descends`                      | `down`                              | ✅ climb down                              |
| 148     | EN   | maze nav + coins/key (NL off)   | (passthrough)                       | ✅ coins +10, key taken                    |
| 149     | FR   | `Ulysse`                        | `look`                              | ❌ F-BB                                    |
| 150     | EN   | `ulysses` (NL off)              | (passthrough)                       | ✅ cyclops flees; up → Treasure Room (+25) |
| 151     | FR   | `donne l'œuf au voleur`         | `give egg to thief`                 | ✅✅ accepted                              |
| 152     | EN   | `put coins in case` (NL off)    | (passthrough)                       | ✅ +5 (Score 204)                          |

## Thief fight, DEATH & recovery, canary/bauble (Score 204 → 246)

### ⚠ Gameplay event (NOT an NL bug) — died fighting the thief, recovered

Fighting the thief with the knife (NL off), I **died** on a bad RNG exchange (Score 204→194,
−10). Zork resurrected me at the Entrance to Hades as a ghost (`ALWAYS-LIT` on; items scattered;
lamp→Living Room per ZIL `RANDOMIZE-OBJECTS`). Recovery required: navigate as a ghost (mirror
`rub` is blocked while dead — "beyond your capabilities"), reach the **Altar** and `pray` to
revive (→ Forest, alive), re-collect lamp + sword, and — because the thief had robbed my torch
and re-killed needs a weapon — re-fight. **2nd attempt: one sword strike killed him** and his
whole hoard reappeared (torch, egg+canary, pot of gold, trunk of jewels) + chalice freed.
Notes: post-resurrection carrying capacity is temporarily reduced ("…in light of your
condition"); a 3rd death would be permanent. This cost ~60 turns but recovered fully.

### ❌ Finding F-CC — `remonte le canari` (wind up the canary) → `climb tree`

French "remonter" (to wind up) → **"climb"** → "You cannot climb any higher." The wind-up
sense was lost (remonter also = climb/go back up, and the model took that). NL-off `wind up
canary` worked → bauble dropped. **Severity: MEDIUM.** Also `grimpe à l'arbre` mapped to
`climb forest` this time (vs `climb tree` at #145) — a harmless nondeterministic variant that
still reached the tree.

| #   | Lang | Input                                                   | Translated →   | Result                         |
| --- | ---- | ------------------------------------------------------- | -------------- | ------------------------------ |
| 153 | EN   | thief fight w/ knife (NL off)                           | (passthrough)  | ⚠ DIED (Score 194)             |
| 154 | EN   | ghost recovery: navigate / `pray` at Altar (NL off)     | (passthrough)  | ✅ revived at Forest           |
| 155 | EN   | re-collect lamp/sword, re-fight thief w/ sword (NL off) | (passthrough)  | ✅ thief dead, hoard recovered |
| 156 | EN   | take chalice/egg/pot of gold; bank (NL off)             | (passthrough)  | ✅ Score 229                   |
| 157 | EN   | take canary from egg; put egg in case (NL off)          | (passthrough)  | ✅ Score 240                   |
| 158 | FR   | `grimpe à l'arbre`                                      | `climb forest` | ✅ (variant; reached tree)     |
| 159 | FR   | `remonte le canari`                                     | `climb tree`   | ❌ F-CC                        |
| 160 | EN   | `wind up canary` (NL off)                               | (passthrough)  | ✅ bauble dropped              |
| 161 | EN   | bank canary + bauble (NL off)                           | (passthrough)  | ✅ Score 246 (13 cased)        |

## Final segment — trunk/torch recovery, 2nd death, Loud Room `écho` (Score 246 → 272)

### ⚠ 2nd death (my error, NOT an NL bug) — walked into darkness with the lamp off

While ferrying trunk/torch, I went west into the dark Strange Passage with the **lamp off**
(I'd turned it off above-ground earlier and forgot) → grue → **death #2** (Score 256→236).
Revived again via `pray` at the Altar. **Now on the last life (`DEATHS`=2; a 3rd death is
permanent).** Recovered lamp, banked trunk + torch (Score 262).

### ❌ Finding F-DD — bare magic word `écho` → `examine brass bell` (Loud Room)

At the Loud Room (platinum bar puzzle), the magic word is "echo". French `écho` →
**`examine brass bell`** → "bell bell …" (the layer snapped it to a salient/stale object,
"brass bell" — which isn't even here). Same class as F-BB (`Ulysse`→look): **bare magic
words don't pass through**; the layer forces them into a verb+object. NL-off `echo` →
"The acoustics of the room change subtly." → `take bar` → +10. **Severity: MEDIUM.**

| #   | Lang | Input                                           | Translated →         | Result                                     |
| --- | ---- | ----------------------------------------------- | -------------------- | ------------------------------------------ |
| 162 | EN   | (2nd death + revive + bank trunk/torch, NL off) | (passthrough)        | ⚠ died #2; recovered; Score 262 (15 cased) |
| 163 | FR   | `écho`                                          | `examine brass bell` | ❌ F-DD                                    |
| 164 | EN   | `echo` / `take bar` (NL off)                    | (passthrough)        | ✅ +10 platinum bar (Score 272)            |

---

# FINAL SUMMARY — Session 3 (resume → escalation stop)

**Stopped at: Score 272 / 350, Turn ~367.** Treasures: **16 of 19 collected** (15 cased +
platinum bar in hand). **Not completed** — the last 3 treasures (diamond, sapphire bracelet,
jade figurine) are in the **coal mine**, whose gas room is an instant-death trap for any open
flame; with **2 deaths already and a permanent 3rd-death risk on the last life**, finishing the
coal mine + 50-pt endgame was judged too risky to gamble the whole game state. Game state is
**resumable** from the autosave (alive, lamp on, 15 cased) for a future low-pressure attempt.

## What this session covered (the NL-layer UAT — the actual mission: COMPLETE)

Played ~English-off French throughout, toggling NL off only for banking, combat, timed/lethal
puzzles, and known-broken interactions. **All prompt-priority probes were exercised:** diagnose
(FR), Dam (push button / turn bolt with wrench), Loud Room `écho`, reservoir/river (inflate /
launch / wait / take buoy / dig), Cyclops `Ulysse`, thief (give egg / kill / wind canary),
Hades (ring bell / light candles / read book / pray), plus directions, compounds, meta, and
special commands.

## NL-layer verdict

**Excellent** on plain verb+noun and directions in FR/DE/ES (incl. diagonals, now fixed), noun
synonyms, common/uncommon verbs (`frotte le miroir`→rub mirror, `grimpe`→climb), and the best
result — a clean 3-slot command `donne l'œuf au voleur`→give egg to thief. **Two regressions
from Session 1 are FIXED:** diagonals (F-8) and phantom scope nouns (R1).

**But a cluster of HIGH-severity issues makes it unreliable for unaided play** (English-off was
required ~20+ times):

1. **Scope is a stale recency-window (F-AA, F-T, F-V, F-W, F-Y):** it accumulates
   previously-handled objects that are no longer present AND omits the player's current
   inventory; ambiguous/absent nouns then snap to a wrong (often stale) object. Drives the
   majority of wrong-object failures and **corrupts English input too** (e.g. `put coffin in
case`→`put nasty knife in nasty knife`). Highest-leverage fix.
2. **Re-plans from context over literal intent (F-Q, F-F):** drop-verbs at End of Rainbow →
   `down`; `trappe`→trophy case/nasty knife. Even literal English gets re-planned.
3. **`abstain` → raw passthrough (F-R):** 2-object instrument & some phrasal verbs (`tourne…
avec…`, `gonfle… avec…`, `sors du bateau`) abstain and leak the raw French to the parser
   ("I don't know <french>").
4. **Verb mis-maps:** `sonne`(ring)→turn on, `remonte`(wind)→climb, `traverse`(cross)→south,
   `allume la lanterne`→light painting (+ destructively un-cased a treasure).
5. **Bare magic words / proper nouns not passed through:** `Ulysse`→look (F-BB),
   `écho`→examine bell (F-DD).
6. **Localized meta not recognized:** `diagnostic`/`examine-moi`→examine salient object (F-U).
7. **Over-specified noun (F-Z):** `prends la pompe`→"take hand-held air pump" (parser rejects).
8. **No type-ahead queue (F-A, Session 1/2).**

**Banking treasures (a core repeated action) is broken in BOTH languages whenever the case
shows as "your collection of treasures"** — the standing workaround all session was: toggle
English off to bank, back on to explore.

## Cross-cutting root cause

Same as Sessions 1–2: the layer **re-plans from a polluted scope/world-model instead of
faithfully translating the literal imperative**, so it shines when context agrees with intent
and derails when a stale/salient object competes — corrupting English input too. A literal
"translate-don't-infer" mode, **fixing scope to = current room + current inventory (evict
stale)**, a graceful abstain (don't leak raw foreign text), and a few verb/magic-word/meta
vocab additions would resolve the bulk of the HIGH findings.

## Deaths (gameplay, not NL bugs)

Two deaths this session: (1) thief combat bad-RNG; (2) walking into darkness with the lamp off
(tester error). Both recovered via the Altar `pray` resurrection. ZIL cross-checked for the
trunk/pot-of-gold thief-theft, the reservoir low-tide reveal, the river drift speeds, and the
death/resurrection (`RANDOMIZE-OBJECTS`, `DEAD-FUNCTION`) to navigate recovery safely.
