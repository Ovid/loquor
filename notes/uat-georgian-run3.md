# UAT — Completing Zork I in Georgian (ka), run 3 — branch `ovid/georgian-fixes`

**Date:** 2026-06-27
**Tester goal (Ovid's ask):** Try to **complete** Zork I in Georgian and judge
whether a native Georgian speaker could reasonably finish.

**Lineage:**

- Run 1 (`notes/uat-georgian-playthrough.md`): score 50/350 (~first third).
  Hard walls: 🟥 enter/board boat, 🟥 launch.
- Run 2 (`notes/uat-georgian-completion.md`): score 184/350, deathless, ~⅔ map.
  Boat blocker FIXED. Open findings: 🟧 tie rope `-ზე`, 🟧 exit boat, 🟧 Ulysses,
  🟨 "Shore, in the magic boat" leak.

**Why run 3:** since the run-2 write-up the branch added 5 commits that target
exactly those open findings:

- `3b8512e` displayed compound object names (verified run-2)
- `abb9f35` pin in-boat room titles (Shore/Aragain/Dam Base/White Cliffs) → run-2 Finding 2
- `9393922` exit-boat Georgian path + climb/Ulysses synonyms → run-2 Finding 3 + Ulysses
- `078f1a2` tie X onto Y (locative `-ზე`) → tie X to Y → run-2 Finding 1
- `ee4cc26` line-wrap on White Cliffs pin

So run 3 = **regression-verify those 5 fixes** + **push past 184** into the arcs no
Georgian run has reached (Hades ritual, machine/diamond, dig sand, songbird,
trident) and on to the **endgame/victory**.

**Setup:** language picker → ქართული (ალფა). Real Georgian input throughout except
documented escape-hatch probes. `ka` has **no input LLM and no output LLM**.

**Signals:**

- `ka` abstain: input keeps text, notice „ვერ გავიგე…", **no turn**;
  `__nlClauses` → `stage:"llm"`, `raw:"(grammar-only)"`, `result:{kind:"abstain"}`.
- `ka` hit: input clears; `stage:"lexicon"`/`"direction"`, `raw:"(lexicon)"`,
  `result.kind:"command"`, `result.text` = English canonical.
- Output leaks: `window.loquorMisses()` filtered `language==='ka'` must be 0.

## Severity legend

- 🟥 Blocker — can't pass without English. 🟧 Friction — natural Georgian fails, another works.
- 🟨 Output leak — translated text shows raw English. 🟦 Note/polish. ✅ Pass.

---

## SUMMARY / VERDICT (run 3, branch `ovid/georgian-fixes`)

**Coverage:** resumed run-2's autosave (Cyclops Room, 184/350, move 178), **died to
the thief on the first attack** (resumed at low HP → one-shot; 184→174), **revived via
the full ghost-walk + `pray` in Georgian**, recovered scattered items above-ground, then
verified the branch fixes + every previously-unreached puzzle verb. **In-game completion
was NOT reached** — the death scattered my only light source and the torch never turned
up in 7 rooms, so the underground arcs were unreachable. Final: 174/350, move 218, 1
death. (The light loss is a gameplay consequence of the RNG death, not a language gap.)

### Can a native Georgian speaker reasonably complete Zork I now? — **Yes on input; very nearly on output.**

**Input (verbs/nouns): effectively complete.** Combining run-2 (deathless ⅔, real
Georgian) with run-3, **every gating verb across the whole game now resolves
deterministically in Georgian** — including the four historically-missing ones this
branch fixed _and_ the puzzle verbs no Georgian run had ever tested:
`wind up canary`, `ring bell`, `read book`, `light candles with match`,
`turn switch with screwdriver`, `dig sand`, plus the meta-verbs `inventory`, `look`,
and the ghost-revival route + `pray`. The historic cross-language blocker
`wind up canary` works (`დააქოქე კანარა`). The remaining input frictions are minor and
all have a working Georgian alternative.

**Output: excellent, with ONE notable new leak.** Everything I actually saw this run
(death banner, ghost-revival narration, every room, inventory) rendered in Georgian.
But I found a **silent, broad English-echo leak**: the "You can't see any X here!"
not-found message echoes the **English** canonical noun (`lamp`, `bottle`, `boat`) —
and it is **not** caught by `loquorMisses()`. Since `აიღე ფარანი` ("take lamp") is
literally the input placeholder's example, a brand-new Georgian player can hit English
on turn one. This is the top output fix.

### The 5 branch fixes — regression status

- ✅ **078f1a2** `tie X -ზე Y` (locative) → `tie X to Y` — `მიაბი თოკი მოაჯირზე` →
  `> tie rope to railing` (run-2 Finding 1 fixed).
- ✅ **9393922** exit-boat — `გადი ნავიდან` → `> exit boat` (run-2 Finding 3 fixed).
- ✅ **9393922** Ulysses/Odysseus — `ოდისევსი` → `> odysseus` (run-2 friction fixed).
- ✅ **9393922** climb synonym — `აცოცდი ხეზე` → `> climb tree` (run-2 friction fixed).
- ⏳ **abb9f35** in-boat room-title leaks (Shore/Aragain/Dam Base/White Cliffs) — NOT
  re-verified in-game (river unreachable without light); covered by its commit pin.

### Open items (priority order)

1. ✅ **FIXED (commit 8a614fc)** — 🟨 "You can't see any {raw} here!" echoed the English
   noun (lamp/bottle/boat), unlogged by `loquorMisses`. Dropped the English token in the
   `{raw}` not-found fallback (drop-the-token reframe, like the disambiguation cases) for
   a generic in-language line. Cross-language: the template pre-empts the LLM, so it
   leaked in EVERY mode for fr/de/es too — fixed in all four. The `{obj}` variant still
   names known display-name objects in-language.
   - **✅ RE-VERIFIED in a fresh tab (2026-06-27, after fixes landed):** at Canyon View
     `აიღე ფარანი` / `აიღე ბოთლი` / `გადი ნავიდან` (input still parses → take lamp / take
     bottle / exit boat) now all print **„აქ ასეთი არაფერი არ ჩანს!"** ("there's nothing
     like that here") — fully Georgian, **zero English token**. Cross-language spot-check:
     switched picker to Español, `coge lámpara` / `coge botella` → **„No ves nada de eso
     por aquí."** (Spanish, no English). The "all langs" claim holds. The reframe is now
     generic (no longer names the object), matching the disambiguation drop-the-token
     approach.
2. ✅ **FIXED (commit 4ec2013)** — 🟧 displayed plural „სანთები"/„სანთლები" rejected; added
   the plural stems as ka synonyms (singular still works). fr/de/es already carried their
   plurals, so ka-only.
   - **✅ RE-VERIFIED in a fresh tab (2026-06-27):** `აიღე სანთები` → `take candles`,
     `აიღე სანთლები` → `take candles`, and the Hades ritual `აანთე სანთები ასანთით` →
     `light candles with match` — all `stage:"lexicon"` now (were abstains). The form
     matching what's on screen works.
3. 🟦 **Residual UNKNOWN — never verified by ANY run for ka:** the OUTPUT corpus of the
   late-game success scenes (Hades exorcism, machine/diamond, songbird bauble) and
   especially the **endgame / Stone Barrow victory text**. Input verbs all work, but no
   Georgian run has reached these in-game, so their translations are unconfirmed. A
   deathless completion pass (or a save closer to the end) is needed to close this.

---

## Findings (running log)

### ✅ Resume state + instrumentation

- Autosave resumed run-2 exactly: **Cyclops Room, Score 184, Move 178**, thief alive
  (retreated `down` in run-2). `loquorMisses('ka')` cleared (stale entries were the
  run-2 "Shore, in the magic boat" leak + a run-1 "bar bar ..." Frigid-River leak —
  both pre-fix; will re-verify boat titles if I revisit the river).

### ✅ NEW positive — Georgian `inventory` verb works

- `ინვენტარი` → `stage:"alias"` → `> inventory` ✅ (turn advanced). Inventory rendered
  fully Georgian: skeleton key, sword (`მახვილი`), hand-held air pump
  (`ხელის ჰაერის ტუმბო`), torch (`ჩირაღდანი (ანათებს)`). No leak.
  (Run-1/2 never recorded a Georgian inventory verb — this is a clean pass.)

### 🟦 DEATH (gameplay/RNG, not a language bug) — thief one-shot on resume

- Resumed mid-thief-fight at low HP (run-2 ended with me "staggered"). First
  `მოკალი ქურდი მახვილით` (`> kill thief with sword`, parsed fine) → the thief landed
  a fatal blow. **Score 184→174 (−10 death), 1 death.** Perfect 350 now unreachable,
  but completion (Stone Barrow victory) still is. Lesson for the assessment: Zork's
  combat RNG can kill regardless of language; nothing here is a ka issue.
- **✅ Output pass:** the full `**** დაიღუპე ****` death banner + the multi-line
  ghost-revival narration rendered entirely in Georgian — `loquorMisses('ka')` = 0.
- Now a ghost at Entrance to Hades (`ჯოჯოხეთის შესასვლელი`); reviving via Altar `pray`.

### ✅ Ghost-revival route fully works in Georgian (a real completion path)

- Drove the full tested ghost route in Georgian, every step a clean `stage:"direction"`
  hit: up→Cave (`გამოქვაბული`), N→Mirror Room (`სარკის ოთახი`), N→Narrow Passage
  (`ვიწრო დერეფანი`), N→Round Room (`მრგვალი ოთახი`), SE→Engravings Cave
  (`მოჩუქურთმებათა გამოქვაბული`), E→(dome wind pulls ghost down)→Torch Room
  (`ჩირაღდნის ოთახი`), S→Temple (`ტაძარი`), S→Altar (`სამსხვერპლო`).
- **`ილოცე` → `> pray` (`stage:"lexicon"`)** → revived, alive, in the Forest (`ტყე`).
  Full revival narration in Georgian. **`loquorMisses('ka')` = 0** for the entire
  death→ghost-walk→revival. A monolingual Georgian player can recover from death
  with no English. ✅

### ✅ More Georgian meta-verbs confirmed

- `მიმოიხედე` → `> look` ✅ (`stage` direction/lexicon). Run-1/2 never recorded a
  Georgian look verb either — clean pass.
- Post-revival `ინვენტარი` → „ხელცარიელი ხარ." (empty-handed): death scattered all
  4 carried items (sword, key, pump, torch) to above-ground rooms — must recover a
  light source + the torch (19th treasure) before re-descending. (Gameplay cost of
  the death, not a language issue.)

### 🟨 NEW LEAK — "you can't see any X here!" echoes the English canonical noun

- `აიღე ფარანι` (take lamp) when no lamp is in the room → input parses correctly
  (`stage:"lexicon"` → `take lamp`) but the output is
  **„აქ ვერანაირ „lamp"-ს ვერ ხვედავ!"** — the English word **"lamp"** inside the
  Georgian frame. Confirmed broad: `აიღე ბოთლი` (take bottle) → **„… „bottle"-ს …"**.
- **Not in `loquorMisses`** → it's a corpus template with `{raw}` = the English
  parser token (same `{raw}`-echo family CLAUDE.md flags). So it's a _silent_ leak the
  miss-log won't catch.
- **Asymmetry:** objects that resolve to a unique known object give the _Georgian_
  not-found („ჩირაღდანი აქ არ ჩანს!" torch, „ხე აქ არ ჩანს!" tree); objects that fall
  to Zork's GWIM "You can't see any X here!" path echo English (lamp, bottle).
- **Why it matters:** this is one of the most common error messages in play (reference
  anything not present), and **„აიღე ფარანი" is literally the input placeholder's
  example command** — a brand-new Georgian player who types it before grabbing the lamp
  sees English "lamp". 🟨 Recommend: route the "You can't see any {raw} here!" template
  to the Georgian object name (or drop/translate the token), as done for the
  disambiguation `{raw}` cases.

### ✅ REGRESSION (commit 9393922) — Ulysses & climb synonym now resolve in Georgian

- `ოდისევსი` (Odysseus) → `stage:"alias"` → `> odysseus` → „ის მეზღვაური ხომ არ იყო?"
  (Georgian flavor reply). **Run-2 had `ოდისევსი` abstaining (🟧).** ✅
- `აცოცდი ხეზე` (climb-synonym) → `stage:"lexicon"` → `> climb tree`. **Run-2 only
  `აძვერი` worked; `აცოცდი` abstained (🟧).** ✅ Both now covered.

### ✅ REGRESSION (commit 078f1a2) — `tie X -ზე Y` locative now maps to `tie X to Y`

- `მიაბი თოკი მოაჯირზე` (tie rope **onto** railing, locative `-ზე`) →
  `stage:"lexicon"` → `> tie rope to railing` ✅. **Run-2 Finding 1: the locative
  `-ზე` produced "tie rope ON railing", which Zork rejected; only the dative `-ს`
  worked.** Now the natural locative form resolves to Zork's only-supported `to`.
  (Verified at parse layer in the Living Room; no rope/railing present, so the game
  replies „ის ნივთები აქ არ არის!", but the canonical is correct.)

### ✅ REGRESSION (commit 9393922) — exit-boat now has a Georgian path

- `გადი ნავიდან` → `stage:"lexicon"` → `> exit boat` ✅. **Run-2 Finding 3: exit/leave
  boat had NO working Georgian form (4 tried), a half-finished boat fix.** Now covered.
  (Output here „…„boat"-ს ვერ ხვედავ!" is yet another instance of the English-echo
  not-found leak above — but the input mapping is correct.)
- ⏳ The 5th branch fix (commit abb9f35, in-boat room-title leaks Shore/Aragain/Dam
  Base/White Cliffs) needs the river to verify in-game; covered by its commit pin —
  will re-check if a light source lets me reach the river again.

### ✅ The never-before-reached puzzle verbs ALL resolve in Georgian (parse-verified)

Run-1/2 never tested these (Hades ritual, machine/diamond, songbird, dig). Verified
via `__nlClauses` (`stage:"lexicon"`, correct English canonical) from the Canyon View
— **input mapping only; the success-message OUTPUT corpus for these scenes is still
unverified for ka since no run has reached them in-game** (see residual unknowns):

- ✅ **`wind up canary`** (the historic blocker — unsolvable in Spanish without
  passthrough; run-2's one untested puzzle-critical verb) → „დააქოქე კანარა" → lexicon.
- ✅ **`ring bell`** → „დარეკე ზარი" → lexicon (Hades verb 1).
- ✅ **`read book`** → „წაიკითხე წიგნი" → `read page` (maps to "page" = the open black
  book — same harmless `libro`→page quirk as Spanish; the ritual still works).
- ✅ **`light match`** → „აანთე ასანთი" → `light match`.
- ✅ **`light candles with match`** → „აანთე სანთელი ასანთით" → lexicon (Hades verb 2).
- ✅ **`turn switch with screwdriver`** → „დაატრიალე ჩამრთველი სახრახნისით" → lexicon
  (machine/diamond). [Tester-error note: my first attempts abstained because I used
  „ხრახნისი" (=screw/bolt); the screwdriver is „სახრახნისი". With the right word it
  resolves cleanly — NOT a coverage gap.]
- ✅ **`dig sand`** → „თხარე ქვიშა" → lexicon (Sandy Cave scarab).

### 🟧 Finding (run-3) — candles: displayed PLURAL „სანთები" rejected; only singular „სანთელი" works

- The Altar displays the candles as the plural „სანთები" („ანთებული სანთებია"), but the
  ka lexicon only accepts the **singular** „სანთელი": `აიღე სანთელი` → `take candles` ✅,
  while `აიღე სანთები` / `აიღე სანთლები` (natural plurals) → **abstain**. So
  `light candles with match` needs „აანთე **სანთელი** ასანთით"; the form matching what's
  on screen abstains. Solvable, but the displayed plural is the natural thing to type.
  Same family as the run-1/2 "displayed compound names" friction. **Recommend: add the
  plural surfaces „სანთები"/„სანთლები" as candle synonyms.**

### 🟦 Completion blocked by the death's item-scatter, NOT by language

- The death scattered my torch + lamp; I recovered key (Forest Path), sword + pump
  (North of House), but the **torch never turned up** in 7 above-ground rooms checked
  (Forest Path, North/Behind/South-route, Kitchen, Living Room, Clearing, Canyon View),
  and the lamp is not in the Living Room (uat.md's "lamp→Living Room on revival" only
  applies if you were _carrying_ it at death — I was carrying the torch). With **no
  light source**, every underground arc (Hades, machine, trident, the thief shortcut)
  is unreachable, so I could not push to in-game completion this run. This is a
  gameplay consequence of the RNG death, not a Georgian-language gap.
