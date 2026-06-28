# UAT — Zork I deathless completion in Georgian (ka)

**Date:** 2026-06-27
**Branch:** ovid/georgian-fixes
**Tester goal (Ovid):** Drive Zork I to a **deathless 350/350 win in Georgian**,
determining whether a native Georgian speaker could reasonably complete the game.
Special deliverable: first-ever _live_ confirmation of the `ka` OUTPUT corpus for
the late-game success scenes — **Hades exorcism**, **Machine/diamond**,
**Songbird/bauble** — and the **Stone Barrow victory text**, none of which a
Georgian run has reached in-game before.

**Method (black-box, do NOT read code):**

- Drive in **real Georgian input** wherever the `ka` Zork I lexicon supports it
  (tests the Phase-2 input layer); fall back to English raw-send (ka raw-sends
  plain ASCII) only to make progress, logging the input gap.
- `ka` has **NO LLM net** on input or output → the deterministic corpus is the
  only safety. `window.loquorMisses()` is the authoritative output-leak signal.
- Read `loquorMisses()` after every scene; **fight the troll/thief several rounds**
  (probabilistic combat is the known `ka` corpus-leak magnet).
- Deathless: a 3rd death is permanent game-over and the perfect 350 needs 0 deaths.

---

## Legend

- ✅ Georgian input parsed + Georgian output, no leak
- 🅸 input gap (Georgian command failed/mis-mapped) — note workaround
- 🅾 output leak (raw English in `loquorMisses()` / on screen)
- ⭐ primary deliverable scene

---

## Findings log

### Setup

- Landing page renders **fully in Georgian** (teaser invitation, language picker
  `ენა: ქართული (აიფა) ▾`, game labels, start button `აანთეთ ლამპა →`). ✅
- Autosave resumed a **polluted mid-game save** (174/350, move 225, stale Spanish
  input lines in transcript). Restarted via `restart` → Georgian confirmation
  (`გსურს თავიდან დაწყება? (Y ნიშნავს კი):`) → `y` → clean West of House, 0/0. ✅
  The restart score/rank line + confirmation prompt are clean Georgian.
- `window.loquorMisses()` cleared to 0 at game start.

### Input vocab confirmed working (drove in real Georgian)

| Georgian                                             | Canonical             | Result                               |
| ---------------------------------------------------- | --------------------- | ------------------------------------ |
| `გახსენი ყუთი`                                       | open mailbox          | ✅ reveal-on-open translated         |
| `წაიკითხე ფურცელი`                                   | read advertisement    | ✅ `(აღებულია)` + full WELCOME block |
| `სამხრეთით / აღმოსავლეთით / დასავლეთით / ჩრდილოეთით` | S/E/W/N               | ✅                                   |
| `ქვემოთ`                                             | down                  | ✅                                   |
| `გახსენი ფანჯარა`                                    | open window           | ✅                                   |
| `შედი სახლში`                                        | enter house           | ✅                                   |
| `აიღე ფარანი`                                        | take light            | ✅ `აღებულია.`                       |
| `აიღე მახვილი`                                       | take sword            | ✅                                   |
| `გადასწიე ხალიჩა`                                    | move rug              | ✅ reveal-on-move translated         |
| `გახსენი ხაფანგ-კარი`                                | open trapdoor         | ✅                                   |
| `აანთე ფარანი`                                       | light light (lamp ON) | ✅                                   |
| `მოკალი ტროლი მახვილით`                              | kill troll with sword | ✅                                   |

### 🅸 Input gaps

- `გახსენი ლუქი` (open trap door using `ლუქი`=hatch) → **abstained** ("ვერ გავიგე…").
  Correct noun is `ხაფანგ-კარი` (the word used in the room description, so a native
  speaker is _taught_ it by the prose). Graceful Georgian abstain with a helpful
  example — not a hard block. **Minor** (self-correcting via the room text).
- A malformed Georgian token (my typo) → graceful Georgian abstain
  `ვერ გავიგე. მარტივი ბრძანებები, მაგ. „აიღე ფარანი", მუშაობს.` Good fail-soft UX.
  NOTE: after an abstain the input box is **not cleared** (text kept for editing) —
  reasonable, but worth knowing.

### 🅾 Output leaks

- **NONE through turn 15.** Confirmed clean (loquorMisses=0): West/South/Behind
  House, mailbox reveal-on-open, multi-line WELCOME block, Kitchen, Living Room,
  `Taken.`, move-rug reveal, trap-door open, lamp-on, Cellar (sword-glow), Troll
  Room, **troll 1-hit kill + black-fog death** (the _kill_ combat variants).
- ⚠️ The troll died in ONE hit (lucky roll) so the multi-round parry/miss/stagger
  combat variants were NOT exercised here — the **thief fight** later must cover
  them (known ka combat-corpus leak magnet, notes 2026-06-24).

### Dam / Reservoir-drain / Loud Room (turns 69–99, score → 129)

More Georgian input confirmed working:
| Georgian | Canonical | Notes |
|---|---|---|
| `აიღე ასანთი` | take match(book) | ✅ |
| `აიღე ქანჩის გასაღები` | take wrench | ✅ genitive compound |
| `აიღე სახრახნისი` | take screwdriver | ✅ |
| `დააჭირე ყვითელ ღილაკს` | **push yellow button** | ✅ `წკაპ.` (adj+noun dative, right colour) |
| `დაატრიალე ხრახნი ქანჩის გასაღებით` | **turn bolt with wrench** | ✅ instrumental |
| `აიღე ჩირაღდანი` | take torch | ✅ |
| `აიღე ზარი` / `აიღე სანთლები` | take bell / candles | ✅ |

- **Loud Room platinum bar (`echo` trick):** the room's per-turn eject is
  **probabilistic** (~50%) — got ejected 3× before an entry that stayed; then
  `echo` (raw-sent English magic word) → `ოთახის აკუსტიკა ნაბად იცვდება.` →
  `აიღე ზოდი` → Taken. bar = `ზოდი`. ✅

### ⭐ HADES EXORCISM — VERIFIED CLEAN IN GEORGIAN (turns 110–115) — primary deliverable

First-ever live `ka` confirmation. Every step rendered in clean Georgian, **0 new
misses**:

- Entrance scene + inscription `კოვეიგვარ იმედს გამოეთხოვეთ...` ("Abandon every hope…")
- `დარეკე ზარი` (ring bell) → bell red-hot, wraiths turn, candles drop & go out
- `აანთე ასანთი` (light match) → "one match burns"
- `აანთე სანთლები ასანთით` (light candles with match) → flames dance, spirits cower
- `წაიკითხე წიგნი` (read book) → `"გაეთრიეთ, ეშმაკებო!"` ("Begone, fiends!") spirits flee
- Land of the Dead + crystal skull, `აიღე ქალა` → Taken (score → 139)

### 🅾 Output leak #1 (minor, off-path)

- **`echo echo ...`** leaks **raw English** in `ka`. Trigger: typing `echo` in a
  room with echo-flavor (the **Deep Canyon**, not the Loud Room). `loquorMisses()`
  logged exactly one entry: `{en:"echo echo ...", ctx:"Deep Canyon", language:"ka"}`.
  Off the golden path (only if a player experiments with `echo` in the wrong room),
  but it IS a real raw-English leak — a Georgian player sees untranslated English.
  **Fix:** add a `ka` corpus entry for the Deep-Canyon `echo echo ...` response.

### 🅸 Input gaps (minor, this stretch)

- skull: bare `ქალა` works; the descriptive compound `თავის ქალა` (the form a
  player might copy from the room text `ბროლის თავის ქალა`) **abstains**. Minor.
- book → canonical "page" (`წიგნი`→take page); harmless (parser resolves page→book),
  mirrors the Spanish `libro`→page quirk.

### ⚠️ ROUTE SNAG — garlic / coal-mine bat (turn 129)

I skipped the **garlic** (Kitchen sack) early. The vampire bat grabs you on entering
the **Bat Room** without garlic and flies you to a random coal-mine room (verified
live, non-lethal). The **jade** (Bat Room) is unreachable without garlic, and the
full 350 + endgame require the jade. Getting garlic needs a surface trip (trap door
is barred from below; only the chimney or the cyclops/maze route reach the surface).
This is a _game-route_ snag, not a Loquor bug. Run is **deathless at 139/350**.

### Underground loop 1 + rainbow excursion (turns 16–69, score → 105)

More input verbs confirmed working in Georgian:
| Georgian | Canonical | Notes |
|---|---|---|
| `დააგდე <obj>` | drop | ✅ `დაგდებუღია.` |
| `გადასწიე ხალიჩა` | move rug | ✅ |
| `მიაბი თოკი მოაჯირს` | **tie rope to railing** | ✅ multi-arg puzzle verb |
| `ჩააქრე ფარანი` | extinguish light | ✅ (the critical candles verb) |
| `ილოცე` | **pray** | ✅ teleports Altar→Forest |
| `დაიქნიე სკიპტრა` | **wave sceptre** | ✅ solidifies rainbow + pot of gold |
| `გახსენი/აიღე კუბო` | open/take coffin | ✅ |
| `ჩადე <obj> ვიტრინაში` | put <obj> in case | ✅ `შესრუღდა.` |
| compound dirs `სამხრეთ-აღმოსავლეთით`, `ჩრდილო-დასავლეთით` | SE / NW | ✅ |
| `ზემოთ` | up (incl. chimney) | ✅ |

Object-noun mapping quirk (harmless, mirrors Spanish `oro`→pot):

- `აიღე ოქრო` ("take gold") → canonical **`take pot`** → still grabs the pot of
  gold ✅. Cosmetic only.

Chimney constraint surfaced naturally: with the auto-taken leaflet still carried
(lamp + painting + leaflet = 3), the Studio chimney refused in **clean Georgian**
(`იქ ვერ ახვაი იმით, რაც გიჭირავს.`); dropping the leaflet fixed it. Good message.

### 🅾 Output leaks — STILL NONE through turn 69 (score 105, 4 treasures cased)

Confirmed clean (loquorMisses=0) across: Gallery, Studio (+ the wall paper),
Attic, trophy-case open + 4 deposits (painting/coffin/pot/sceptre, the
"collection of treasures consists of…" list), Round Room, Engravings Cave, Dome
Room + **rope-tie**, Torch Room, Temple, Egyptian Room, Altar (candles + black
book on p.569), **`pray`→Forest teleport**, Forest/Clearing/Canyon View/Rocky
Ledge/Canyon Bottom, **End of Rainbow + coffin-open + wave-sceptre + pot-of-gold
appearance**.

---

## Session 2 (resume at 139/350, Coal Mine) — 2026-06-28

### Resume verified

- Autosave resumed clean: status `ქცევა: 139 სვლა: 129`, room `ნახშირის მაღარო`
  (Coal Mine maze). Transcript shows last actions: `west`→ჭრიალა ოთახი (Squeaky),
  `north`→ღამურის ოთახი (Bat Room) → bat grab (`ფვიპ! ფვიპ! ფვიპ!`) → Coal Mine.
- `loquorMisses()` baseline still 1 (the echo/Deep-Canyon entry). ✅

### Inventory command — INPUT FINDING

- `ინვენტარი` → canonical `inventory` → **WORKS**, clean Georgian list:
  `შენთან არის:` then `ბროლის თავის ქალა` (skull), `ჩირაღდანი (ანთებს)` (torch, lit),
  `სახრახნისი` (screwdriver), `საბრძარი დანა` (nasty knife), `სპილენძის ფარანი` (lamp).
  Output rendered clean — no leak.
- `ნივთები` ("things") → **abstains** (`ვერ გავიგე…`). Minor input gap: the natural
  loanword `ინვენტარი` is the one that maps; `ნივთები` does not. Worth a lexicon alias.

### ⚠️ TORCH-TRAP analysis (game-route consequence, not a Loquor bug — flagged to Ovid)

- The bat threw the player into the maze **holding the lit torch**, before reaching
  the Shaft Room. Path maze→Shaft Room crosses the Gas Room; Gas Room + lit torch =
  death; torch cannot be extinguished. Torch also cannot enter the basket (only
  loadable at Shaft Room top or Drafty Room bottom; can't reach either). So the
  ivory torch (19th treasure) is likely trapped → 350/Stone-Barrow at risk.
- Ovid's call: **"Test, then proceed"** — run the safe squeeze test (carry only the
  lit lamp to Timber Room, try the Drafty squeeze; refusal is non-lethal) to confirm,
  then continue toward 350 if recoverable, else verify all reachable ka scenes.

### Squeeze test RESULT — torch trap CONFIRMED, and diamond also blocked

- Navigated (drove in Georgian): Torch Room `სამხრეთ-დასავლეთით`(SW)→ Coal Mine →
  `ქვემოთ`(down)→ `კიბის თავი` (Ladder Top) → `ქვემოთ`→ `კიბის ძირი` (Ladder Bottom)
  → `დასავლეთით`(west)→ `ძელების ოთახი` (Timber Room). All room titles/descriptions
  clean Georgian. ✅
- At Timber Room dropped skull/screwdriver/knife, kept ONLY the lit lamp, tried
  `დასავლეთით` (west, the Drafty squeeze): **`ამ ტვირთით ამ გასასვლეთში ვერ ეტევი.`**
  ("You cannot fit through this passage with that load.") Clean Georgian, no leak. ✅
- **Verdict:** the squeeze refuses even a single lit lamp → strictly empty-handed.
  Therefore: (1) the torch can never enter the Drafty-Room basket (squeeze blocks it)
  and can never reach the Shaft-Room basket (Gas Room kills with torch) → **torch
  (19th treasure) is permanently trapped on the maze side → deathless 350 / Stone
  Barrow impossible from this save.** (2) WORSE: the Drafty/Machine Room can only be
  lit by the torch-in-basket; with the torch trapped and the lamp unable to pass the
  squeeze, there is only ONE mobile light → entering the Drafty Room means a dark
  room = grue death → **the diamond-machine deliverable is ALSO unreachable from
  this save without dying.**
- So of the 3 PRIMARY ka deliverables: Machine/diamond = BLOCKED, Stone-Barrow =
  BLOCKED; only **Songbird/bauble** (above-ground) + secondary scenes (thief combat
  corpus, reservoir, Frigid River) remain reachable. Re-consulting Ovid.
- Items retrieved (`take skull/screwdriver/knife` → `აღებულია.`); inventory
  consolidated. Torch still on the Torch-Room floor (maze side). loquorMisses still 1.

### Ovid decision: VERIFY SCENES, ACCEPT NO 350

- 350 / diamond / Stone-Barrow treated as **blocked** from this save (torch trapped;
  diamond needs torch-in-basket light; lamp-battery risk for the rest). Not chasing
  the torch. Torch left on the Torch-Room floor (maze side).
- Remaining verification targets (drive in Georgian, read loquorMisses after each):
  **thief combat corpus** (probabilistic — known ka leak magnet), **Songbird/bauble**
  (egg→thief→canary→wind-up-canary; verify the wind-up verb), **reservoir**, **Frigid
  River**. Plus opportunistic treasure pickups (e.g. Gas-Room sapphire bracelet) for
  Georgian render checks.

### Escape + central-dungeon progress (turns 166–180)

- Bat flew me OUT to `მაღაროს შესასვლელი` (Mine Entrance, exit side) → `ჩასაცურავის
ოთახი` (Slide Room) → `ქვემოთ` (slide) → `სარდაფი` (Cellar). Escaped the coal mine;
  torch left trapped (accepted). All room titles clean Georgian. ✅
- **`ინვენტარი`=inventory works; `ნივთები` abstains** (logged earlier). Inventory list
  clean Georgian, no leak.
- Gas Room sapphire bracelet: `აიღე სამაჯური` → +5 (139→144), clean. ✅
- Skeleton room (regular maze): `აიღე მონეტები` (coins, leather bag) → +10 (144→154),
  clean. `აიღე გასაღები` (skeleton key) ✅. The **THIEF wandered through and stole some
  valuables from me** (`ჩუმად მოგტაცა ცოტა ძვირფასეულობა…`) — clean Georgian; recoverable
  when I kill him at the Treasure Room.
- Maze→Cyclops route (drove in Georgian, walkthrough dirs): Cellar N, then W,S,E,U
  (skeleton room), SW,E,S,SE → `ციკლოპის ოთახი` (Cyclops Room). Sword-glow lines clean
  Georgian (`შენი მახვილი ბუჟტავს…`, `კაშკაშად ანათება დაიწყო`).

### 🅸 Cyclops magic word — `ულისე` FAILS, `ოდისევსი` WORKS

- `ულისე` (Ulysses, Latin) → **abstains** (`ვერ გავიგე. სცადეთ უფრო მარტივი
ფორმულირება…`). Mirrors the Spanish `Ulises` breakage.
- `ოდისევსი` (Odysseus, Greek) → canonical `odysseus` → **WORKS**: cyclops flees,
  east wall falls (`ციკლოპი… ოთახიდან გარბის… აღმოსავლეთ კედლის ჩამოქცევით.`), sword
  stops glowing — all clean Georgian. So a Georgian-only player CAN beat the cyclops
  using the Greek name. Minor gap: the Latin variant `ულისე` should also alias.

### ⭐ THIEF COMBAT CORPUS — EXHAUSTIVELY VERIFIED CLEAN (turns ~222–240)

Drove the whole fight in Georgian (`მოკალი ქურდი მახვილით` / `მოკალი ქურდი დანით` =
kill thief with sword/knife). ~18 rounds, every combat message clean Georgian, **0
leaks** in loquorMisses. Variants captured & clean:

- "still recovering from the last blow, attack ineffective"
- "his stiletto hilt hits your head, you stagger back"; "draws blood across your arm";
  "stiletto faster than the eye, blood from your leg"; "strikes your stomach, knocks
  the breath out of you"
- "good swing, but the thief dodges entirely"; "Clang! Crash! the thief parries"
- "the thief tries to get past your defense, but you dodge"
- "the thief is disarmed by a subtle feint" + "surprised, quickly picks up his stiletto"
- "the thief knocks your weapon from your hand… Fortunately you still have the nasty knife"
- "the thief is confused and cannot return the blow"; "slowly gets to his feet"
- "your blow knocks him senseless"; "scratches his wrist, nothing serious"
- ⭐ **KILL**: "…the thief no longer defends himself: he dies. …an evil black fog cloud
  envelops him… the carcass has disappeared. As the thief dies his magic weakens and
  his treasures reappear:" — all clean Georgian, matches walkthrough.
  Probabilistic combat (the known ka leak magnet) is **CLEAN**. Required `მიეცი X Y-ს`
  (give egg to thief, `მიეცი კვერცხი ქურდს`) and `მოიცადე` (wait) — both work.

### 🎉 TORCH RECOVERED BY THE THIEF — torch-trap RESOLVED (reverses no-350 premise)

The thief had wandered the coal mine and **stolen the trapped torch**; killing him in
the Treasure Room dropped it here (normal side of the Gas Room). Thief loot included:
stiletto, my sword, leather coin-bag, sapphire bracelet, crystal skull, **`ჩირაღდანი`
(the ivory torch)**, and **`კვერცხი` the jewel-encrusted egg WITH the golden clockwork
canary** (so the Songbird is reachable), plus the silver chalice now safe to take.
**Implication: the torch is no longer trapped → 350 / diamond / Stone-Barrow are back
on the table.** This reverses the basis of Ovid's "verify scenes, accept no 350" call —
re-consulting.

### 🅾 OUTPUT LEAK #2 — "load too heavy" renders RAW ENGLISH in ka

`take all` while overloaded (and wounded — "in light of your condition"): items taken
show Georgian (`აღებულია.`), but the refusal leaks English:
`"<item>: Your load is too heavy, especially in light of your condition."` — logged 5×
in loquorMisses (sword/bracelet/torch/egg/chalice, Treasure Room, turn 241). Needs a
`ka` corpus entry for the carry-capacity / wounded-capacity refusal message.

---

## Session 3 (resume at 184/350, Treasure Room) — 2026-06-28

### Resume verified

- Autosave resumed clean: status `ქცევა: 184 სვლა: 241/242`, room `საგანძურის ოთახი`
  (Treasure Room). Deathless. `loquorMisses()` baseline = **6** (1 echo/Deep-Canyon +
  5 "load too heavy", from Session 2). ✅

### 🅸 INPUT BREAKAGE — stiletto: DISPLAY noun ≠ INPUT noun (display/lexicon mismatch)

- The inventory **displays** the thief's stiletto as **`სტიდეტი`** (with **დ**).
- Typing the word the player is shown — `დააგდე სტიდეტი` (drop stiletto) → **ABSTAINS**
  (`ვერ გავიგე…`). Verified twice.
- The input lexicon only accepts **`სტილეტი`** (with **ლ** — the correct transliteration
  of "stiletto"): `დააგდე სტილეტი` → `> drop stiletto` → `დაგდებულია.` ✅
- **Real player-facing gap:** a Georgian player reads `სტიდეტი` in their own inventory
  and types it back verbatim → abstain, with no hint that the spelling differs. The
  display corpus (`სტიდეტი`) and the input lexicon (`სტილეტი`) disagree on the same
  object. Fix: align them — either correct the display string to `სტილეტი`, or add
  `სტიდეტი` as an input alias (preferably both point to the same canonical spelling).
  Mirrors the general "display teaches a word the parser then rejects" trap (cf. skull
  `თავის ქალა`, trap-door `ლუქი`).

### Treasure-Room → Living Room (turns 246–262, score 184 → 195)

- Wound from the thief fight badly reduced carry capacity ("…in light of your
  condition"). Dropped junk (stiletto/knife) + heavy treasures (skull/coins) to take
  the **torch** (`აიღე ჩირაღდანი` → `აღებულია.`, my permanent light), `ჩააქრე ფარანი`
  (lamp OFF → `სპილენძის ფარანი ახლა გამორთულია.` clean). Took the **egg** but capacity
  blocked the chalice — left remaining treasures safe in Treasure Room (thief dead), to
  collect on a healed return trip (it's adjacent to the Living Room). All single-item
  "load too heavy" refusals rendered **clean Georgian** (the leak is ONLY the `take all`
  multi-item path — refines Output Leak #2).
- Route Treasure Room `ქვემოთ` → Cyclops Room `აღმოსავლეთით` → Strange Passage
  `აღმოსავლეთით` → Living Room. All clean Georgian. ✅

### 🅸 INPUT GAP — canary noun is `კანარა`, NOT `კანარი` (+ examine verb works)

- `აიღე კანარი` (the spelling the resume prompt suggested) → **ABSTAINS**.
  `აიღე კანარი კვერცხიდან` (ablative "from egg") also abstains.
- **`დაათვალიერე X`** (examine) WORKS (`> examine egg`) and revealed the game's own word:
  the egg contains `ოქროს მექანიკური კანარა` (golden clockwork canary) — i.e. **`კანარა`**.
- `აიღე კანარა` → `> take canary` → `აღებულია.` ✅ (score +6). The correct canary noun is
  **`კანარა`**. A player who only knows the bird as "კანარი" would be stuck; recommend
  `კანარი` as an input alias. (Examine is the recovery: the contents listing teaches the
  right word — good fail-soft, but only if the player thinks to examine.)
- Egg cased separately: `ჩადე კვერცხი ვიტრინაში` → `> put jeweled egg in case` →
  `შესრულდა.` ✅ (score → 195). egg + canary = two distinct treasures, both handled.
- **wind-up-canary verb still UNVERIFIED** (next, at the Songbird tree — HIGH RISK).

### ⭐ SONGBIRD / BAUBLE — VERIFIED CLEAN IN GEORGIAN (turns 263–270, score 195 → 196) — primary deliverable

First-ever live `ka` confirmation; the wind-up verb that broke in Spanish **works**.

- Kitchen garlic: `გახსენი ტომარა` (open brown sack) → reveals `ნიორის კბილი` (garlic) +
  `სადილი` (lunch); `აიღე ნიორი` → `> take garlic` → `აღებულია.` ✅ (garlic noun = `ნიორი`).
- Route to tree: Living Room `აღმოსავლეთით`→Kitchen `აღმოსავლეთით`→Behind House
  `ჩრდილოეთით`→North of House `ჩრდილოეთით`→**Forest Path** (`ტყის ბილიკი`). The room
  announces the bird: `შორიდან მგალობელი ფრინველის ჯიკჯიკს გაიგონებ`. ✅
- ⭐ **`დააქოქე კანარა`** → `> wind up canary` → **WORKS**, full scene in clean Georgian:
  the canary chirps a forgotten-opera aria, the songbird flies down, perches, and a
  **brass bauble drops from its beak** — `კანარა, ოდნავ აცდენილი, დავიწყებული ოპერის
არიას ჯიკჯიკებს… სპილენძის ბურთულა ნისკარტიდან გადმოვარდება…`. No leak.
- `აიღე ბურთულა` → `> take bauble` → `აღებულია.` ✅ (bauble = `ბურთულა`; score → 196).
- **`loquorMisses()` still 6 (baseline) — ZERO new leaks across the whole deliverable.**
- The wind-up verb **`დააქოქე`** + canary noun **`კანარა`** are the working forms. (The
  resume prompt's guesses `დააქოქე/მოქოქე/ამოქოქე კანარი` would all fail on the `კანარი`
  noun; `დააქოქე კანარა` is correct.)

### Casing + Treasure-Room treasures + Altar platinum (turns 270–308, score 196 → 236)

- Cased canary + bauble (`ჩადე კანარა/ბურთულა ვიტრინაში`); ferried skull/coins/bracelet/
  chalice from the Treasure Room in two healed trips and cased all. All `> put X in case`
  → `შესრულდა.` clean. Score → 236, 11 treasures cased.
- Route down: Living Room `ქვემოთ`→Cellar `ჩრდილოეთით`→Troll Room `აღმოსავლეთით`→
  East-West Passage `აღმოსავლეთით`→Round Room `სამხრეთ-აღმოსავლეთით`→Engravings Cave
  `აღმოსავლეთით`→Dome Room `ქვემოთ`(rope still tied)→Torch Room `სამხრეთით`→Temple
  `სამხრეთით`→Altar. `აიღე ზოდი` → `> take bar` → platinum recovered. All clean Georgian.

### ⭐ MACHINE / DIAMOND (coal mine) — VERIFIED CLEAN IN GEORGIAN (turns 308–389, score 241 → 264) — primary deliverable

First-ever live `ka` confirmation of the full coal-mine + machine sequence. **0 leaks.**

- Mirror-teleport: `მოისვი სარკე` → `> rub reflection` → room rumbles/shakes ✅ (essential
  to reach the coal-mine side; Cave→Mirror Room→rub→N Cold Passage→W Slide Room).
- Garlic protects in the Bat Room (`ღამურა ცხვირზე ხელს იჭერს`); jade figurine taken with
  **`აიღე ფიგურა`** → `> take figurine` (jade noun = `ფიგურა`, NOT the prompt's `ჟადე`).
- Gas Room traversed safely with torch in basket + lamp; full maze (E/NE/SE/SW/down…) all
  clean. Basket: `ჩადე X კალათაში` (put in basket), `ჩაუშვი კალათა` (lower), `ასწიე
კალათა` (raise) — all work.
- Timber→Drafty empty-handed squeeze: `დააგდე ყველაფერი` (drop all, lamp left ON to light
  the Timber Room), then `დასავლეთით`. Drafty/Machine lit by the basket torch. ✅
- Machine run: open `გახსენი მანქანა` → coal in `ჩადე ნახშირი მანქანაში` → close `დახურე
მანქანა` → **`დაატრიალე ჩამრთველი სახრახნისით`** (turn switch with screwdriver,
  instrumental) → machine "comes to life… dazzling colored lights…". `გახსენი მანქანა`
  reveals the diamond; `აიღე ბრილიანტი` (diamond = `ბრილიანტი`). Score → 264.
- **🅸 INPUT BREAKAGE — machine lid: `სახურავი` (the word the room text DISPLAYS) is NOT a
  parser noun.** `გააღე სახურავი`, `გახსენი სახურავი`, `დახურე სახურავი` all **ABSTAIN**.
  The working form is to address the **machine**: `გახსენი მანქანა` / `დახურე მანქანა`
  (the game then narrates `სახურავი იღება/იხურება`). **This is critical & `ka`-fatal-shaped:**
  the diamond (a 350-required treasure) is gated on the machine lid; a Georgian player who
  types the lid word taught by the room prose gets a dead-end abstain with no LLM net.
  Recommend adding `სახურავი` as an input alias on the machine's open/close. (Same
  display-teaches-a-rejected-word trap as stiletto `სტიდეტი` and canary `კანარი`.)
- **`loquorMisses()` still 6 (baseline) — ZERO new output leaks across the entire
  coal-mine/Mirror/machine sequence.**

### Casing diamond/platinum/jade (score 264 → 284) — 14 treasures cased

- `ჩადე ბრილიანტი/ზოდი/ფიგურა ვიტრინაში` → all `შესრულდა.` clean.

### ⭐ RESERVOIR + FRIGID RIVER + SANDY CAVE — VERIFIED CLEAN (turns 398–453, score 284 → 313)

First-ever live `ka` confirmation. **0 new leaks** (`loquorMisses()` held at 6 throughout).

- Route Living Room→Cellar→Troll Room `აღმოსავლეთით`→East-West Passage `ჩრდილოეთით`→
  Chasm (`უფსკრული`) `ჩრდილო-აღმოსავლეთით`→Reservoir South. Reservoir is DRAINED (the
  session-1 dam puzzle held): `წყლის დონის დაწევის შემდეგ…` — crossed north safely.
- **Reservoir treasures:** trunk `ზანდუკი` (`აიღე ზანდუკი`), pump `ტუმბო`, trident
  `სამკაპა` (Atlantis Room). All clean Georgian.
- **Dam Base / boat:** `გაბერე პლასტმასი ტუმბოთი` → `> inflate valve with pump` →
  "boat inflates, seaworthy" ✅ (note it maps `პლასტმასი`→"valve" but works). `შედი
ნავში` enter, **`გაცურე`** = launch ✅.
- **Frigid River drift:** `მოიცადე` drifts ~0–1 segment/turn (probabilistic — observed
  one no-drift turn). Segments: dam→corner→gorge(faint roar)→**buoy room** (raging
  water, sandy beach EAST, red buoy `ბაკანი`). Drove it one-wait-at-a-time, screenshotting
  each, NEVER overshooting toward the falls. ✅ DEATHLESS.
- **🅸 BUOY weight gotcha (not a leak, but a trap):** at the buoy room, `აიღე ბაკანი`
  while overloaded (torch+lamp+trunk+trident) FAILED with **clean Georgian** "load too
  heavy" (`შენი ტვირთი ძალიან მძიმეა.`), so the buoy was left on the river. Recovered by:
  land east at Sandy Beach, leave boat, **drop trunk/trident/lamp on the BEACH** (not in
  the boat), re-`შედი ნავში`+`გაცურე` → relands at the buoy room → `აიღე ბაკანი` (now
  light) succeeds → current drifts you one room but **`აღმოსავლეთით` lands you at the
  Shore (`ნაპირი`)** safely, buoy in hand. So launching from the Sandy Beach re-enters
  the river at the buoy segment — recoverable, but lighten BEFORE taking the buoy.
- **Buoy/emerald:** `გახსენი ბაკანი` → "reveals a large emerald" → `აიღე ზურმუხტი`
  (emerald = `ზურმუხტი`). Dropped the empty buoy.
- **Sandy Cave scarab:** `აიღე ნიჩაბი` (shovel), NE to cave, **`თხარე ქვიშა`** = dig sand
  (auto "(ნიჩაბით)" with the shovel). Dig responses clean: #1 "digging a hole" → #2
  "hole gets deeper" → #3 "surrounded by a wall of sand" → #4 **`სკარაბეუსს ხედავ`**
  (scarab!). `აიღე სკარაბეუსი` (scarab = `სკარაბეუსი`). **Dug exactly 4× — did NOT dig a
  5th time (=death).** ✅ DEATHLESS.
- **Verb finds this run:** `დაათვალიერე X` = examine (use it to learn an object's real
  parser noun — this is how `კანარა` was found); `გამოდი ნავიდან` = exit boat.

### State at Session-3 hand-off (turn ~453, score 313/350, deathless)

- At Sandy Beach, carrying torch `ჩირაღდანი`(lit)+emerald `ზურმუხტი`+scarab
  `სკარაბეუსი`; trunk `ზანდუკი`+trident `სამკაპა`+lamp(junk) on the beach floor.
- **14/19 treasures cased.** Remaining to case: trunk, trident, emerald, scarab, torch.
- **Endgame remaining (UNVERIFIED in `ka` — test & log):** `cross rainbow`
  (`ცისარტყელა`) at Aragain Falls → End of Rainbow → back to Living Room → case last 5 →
  ⭐ **Stone Barrow / 350 victory** (map `რუკა`, secret path from West of House, enter
  barrow). None of these endgame verbs/nouns are confirmed in Georgian yet.

### Treasure-noun reference (Georgian, confirmed)

torch `ჩირაღდანი` · egg `კვერცხი` · canary `კანარა` · bauble `ბურთულა` · skull `ქალა` ·
coins `მონეტები` · bracelet `სამაჯური` · chalice `თასი` · diamond `ბრილიანტი` · platinum
`ზოდი` · jade `ფიგურა` · trunk `ზანდუკი` · trident `სამკაპა` · emerald `ზურმუხტი` ·
scarab `სკარაბეუსი` · painting `ნახატი` · coffin `კუბო` · pot `ოქროს ქოთანი` · sceptre
`სკიპტრა`.

---

## 🏆 Session 4 (resume at 313/350, Sandy Beach) — 2026-06-28 — ⭐ DEATHLESS 350/350 WIN

**THE MISSION IS DONE.** Drove the resumed 313-pt save to a **deathless 350/350
Stone Barrow victory** entirely in Georgian (move 479) — the **first-ever `ka` run
to reach 350 and the endgame victory**. `loquorMisses()` held at the **baseline 6**
across the ENTIRE endgame — **zero new output leaks**. Every headline endgame scene
(whisper, treasure map, secret path, Stone Barrow, full victory banner) rendered in
clean Georgian.

### Resume verified

- Fresh tab → landing (Georgian, Zork I selected) → `აანთეთ ლამპა →` (clicked twice;
  window relays out on first activation). Status `ქცევა: 313 სვლა: 453`, room
  `ქვიშიანი სანაპირო` (Sandy Beach). Deathless. `loquorMisses()` baseline = **6**. ✅

### Sandy Beach pickups + inventory (turns 453–456)

- `აიღე ზანდუკი` → `take trunk` → `აღებულია.`; `აიღე სამკაპა` → `take trident` →
  `აღებულია.` (no "load too heavy" — all 5 treasures fit). Left the junk lamp on floor.
- `ინვენტარი` confirmed carrying: trident `ბროლის სამკაპა`, trunk
  `ძვირფასეულობის ზანდუკი`, scarab `სკარაბეუსი`, emerald `დიდი ზურმუხტი`, **torch
  `ჩირაღდანი (ანთებს)`** (lit — permanent light). All clean Georgian.

### ⭐🅸 CROSS RAINBOW — VERIFIED (the headline HIGH-RISK verb) (turns 457–459)

Sandy Beach `სამხრეთით`→ Shore `ნაპირი` → `სამხრეთით`→ Aragain Falls
`არაგენის ჩანჩქერი` (room confirms solid rainbow: `მყარი ცისარტყელა ჩანჩქერს
გადაჰკვევს`). On foot (no boat) so no drift risk. Then:

- 🅸 **`გადააბიჯე ცისარტყელა` → ABSTAINS** (`ვერ გავიგე…`, no turn consumed). First
  candidate FAILS.
- ✅ **`გადაკვეთე ცისარტყელა` → `> cross rainbow` → WORKS** → End of Rainbow
  (`ცისარტყელის ბოლო`). **The working "cross" verb is `გადაკვეთე`.** This was the
  single biggest endgame risk (if no Georgian verb worked, the endgame would be
  unreachable in `ka`) — it is REACHABLE. Recommend adding `გადააბიჯე` (and maybe
  `გადი …-ზე`) as input aliases for "cross" so the prose-following player isn't
  stranded above the falls.

### End of Rainbow → Living Room (turns 459–466, all clean Georgian)

End of Rainbow `სამხრეთ-დასავლეთით`→ Canyon Bottom `კანიონის ფსკერი` → `ზემოთ`→ Rocky
Ledge `კლდოვანი შვერილი` → `ზემოთ`→ Canyon View `კანიონის ხედი` →
`ჩრდილო-დასავლეთით`→ Clearing `მინდორი` → `დასავლეთით`→ Behind House `სახლის უკან` →
`შედი სახლში`→ Kitchen `სამზარეულო` → `დასავლეთით`→ Living Room `მისაღები ოთახი`.
Above-ground daylit; torch kept (it's the 19th treasure). All room titles clean.

### ⭐ CASING THE LAST 5 → 350 (turns 467–471) — first-ever `ka` 350

- `ჩადე ზანდუკი ვიტრინაში` → `put trunk in case` → `შესრულდა.` (313→318)
- `ჩადე სამკაპა ვიტრინაში` → `put trident in case` → `შესრულდა.` (318→329)
- `ჩადე ზურმუხტი ვიტრინაში` → `put emerald in case` → `შესრულდა.` (329→339)
- `ჩადე სკარაბეუსი ვიტრინაში` → `put scarab in case` → `შესრულდა.` (339→344)
- **`ჩადე ჩირაღდანი ვიტრინაში`** → `put torch in case` → `შესრულდა.` (344→**350**).
  Living Room daylit, so casing the light source was safe. Immediately the **endgame
  whisper** fired in clean Georgian: **„თითქმის გაუგონარი ხმა ყურში გჩურჩულებს: 'ბოლო
  საიდუმლო შენს განძებში მოძებნე.'"** (the "seek the final secret among your
  treasures" voice). 0 leaks.

### ⭐ TREASURE MAP — VERIFIED CLEAN (turns 472–474)

- `დაათვალიერე ვიტრინა` → `examine case` → **map revealed** in clean Georgian:
  **„ჯილდოების ვიტრინაში უძველესი ეტრატია, რომელიც რუკას ჰგავს."** (an ancient
  parchment which appears to be a map).
- `აიღე რუკა` → `> take parchment` → `აღებულია.` ✅ (**`რუკა` works as the input noun
  for the map/"parchment" object**).
- `წაიკითხე რუკა` → `> read parchment` → full map text clean Georgian: three
  clearings, the largest with a house, and the **southwest** path marked **„ქვის
  ყორღანისკენ"** ("To the Stone Barrow"). **Stone Barrow = `ქვის ყორღანი`.** 0 leaks.

### ⭐ WEST OF HOUSE secret path (turns 475–478)

Living Room `აღმოსავლეთით`→ Kitchen → `აღმოსავლეთით`→ Behind House → `ჩრდილოეთით`→
North of House → `დასავლეთით`→ **West of House `სახლის დასავლეთით`**. The room now
shows the **secret path**: **„საიდუმლო ბილიკი სამხრეთ-დასავლეთით, ტყისკენ მიდის."**
(a secret path leads southwest into the forest) — the map clue activated it. Clean.

### ⭐⭐ STONE BARROW VICTORY — VERIFIED CLEAN IN GEORGIAN (turn 479) — THE DELIVERABLE

- `სამხრეთ-დასავლეთით` → `> southwest` → **`ქვის ყორღანი` (Stone Barrow).**
- **`შედი ყორღანში` → `> enter barrow` → WORKS** → `ყორღანის შიგნით` (Inside the
  Barrow) → the **FULL VICTORY TEXT in clean Georgian**: door closes behind you, the
  brightly-lit cavern + wide stream + wooden footbridge, the floating sign's complete
  congratulation („…ZORK-ის ტრიოგიის პირველი ნაწილი დაეუფლეთ…"), the **sequel plug**
  („ZORK II: ფროზბის ჯადოქარი" / „ZORK III: დიდგების მბრძანებელი"), the **score line**
  **„შენი ქცევა 350 (სულ 350 ქულიდან), 479 სვლაში."**, and the **rank** **„ეს განიჭებს
  ოსტატ თავგადასავლების მაძიების წოდებას."** (Master Adventurer). Closing prompt:
  „გსურთ თამაშის თავიდან დაწყება… (აკრიფეთ RESTART, RESTORE, ან QUIT):" — note the
  meta-command tokens stay English (same intentional choice the es endgame showed).
- **`loquorMisses()` = 6 (baseline). ZERO new leaks across the whole endgame.** ⭐

### 🅸/⚠️ NEW Georgian findings this session (log; FIX AFTER UAT)

1. **`cross rainbow` verb gap (HIGH-RISK, now mitigated):** the prose-natural
   `გადააბიჯე ცისარტყელა` ABSTAINS; only `გადაკვეთე ცისარტყელა` works. Add `გადააბიჯე`
   (step across) as an input alias for "cross" — without it, a player who reaches
   Aragain Falls and types the intuitive verb is stranded above the falls with no LLM
   net (the endgame becomes unreachable). Same display/intuition-vs-parser trap class
   as stiletto/canary/lid.
2. **⚠️ Stone-Barrow door DIRECTION mismatch (translation):** the `ka` Stone-Barrow
   room text places the open stone door on the **EAST** side
   („აღმოსავლეთ მხარეს უზარმაზარი ქვის კარია, რომელიც ღიაა"), but in canonical Zork I
   the door is in the **WEST** face and the room's only entry exit is **west**. The
   direction-agnostic `შედი ყორღანში` (enter barrow) sidesteps it and WON the game,
   but a Georgian player who follows the prose and types `აღმოსავლეთით` (east) would
   hit a non-exit and could believe the victory is unreachable. Recommend auditing the
   `ka` Stone-Barrow corpus description vs the English "west face" source (and confirm
   `დასავლეთით`/`აღმოსავლეთით` both resolve to barrow entry, or fix the description to
   say `დასავლეთ`). NOTE: stated with appropriate uncertainty — confirmed the `ka`
   text says east and that `შედი ყორღანში` works; the "canonical = west" claim is from
   the standard Infocom text, not re-verified against this build's English corpus.

### Endgame input vocab confirmed working (Georgian) — reuse

- `გადაკვეთე ცისარტყელა` = cross rainbow · `დაათვალიერე ვიტრინა` = examine case ·
  `აიღე რუკა` = take map/parchment · `წაიკითხე რუკა` = read map · `შედი ყორღანში` =
  enter barrow. Stone Barrow = `ქვის ყორღანი`; map = `რუკა`.
