# UAT — Completing Zork I in Georgian (native-speaker feasibility)

**Date:** 2026-06-28
**Branch:** ovid/architecture
**Goal:** Determine whether a native Georgian (`ka`) speaker, typing only Georgian,
could reasonably complete Zork I. Play the fastest winning route (the walkthrough),
driving every command in Georgian. `ka` has **no input LLM** — every command must
resolve via the deterministic lexicon (`ka.core`/`ka.zork1`) + `expandGeorgian`
parser pre-stage, or it fails. There is no net.

**Method:** Black-box. Switch the picker to ქართული, type natural Georgian, read
the response + `window.loquorMisses()`. NOT reading implementation code, and NOT
consulting the repo's Georgian glossary (that would bias word choice toward the
known lexicon instead of simulating a real speaker). A fresh game was started from
West of House (old autosave cleared).

---

## Verdict so far

A native Georgian speaker CAN play fluently through the early game. Natural
imperatives and directions resolve deterministically and the output is clean,
fully-translated Georgian. Findings logged by region below.

---

## Findings log

### Region 1 — house exterior + interior → Cellar (turns 1–14): ✅ ALL CLEAN

Every command resolved deterministically (Georgian input → correct English
canonical → clean Georgian output). No English leaks, no abstains.

| Georgian typed | Canonical | Result |
|---|---|---|
| გააღე საფოსტო ყუთი | open mailbox | ✅ "...ფურცელს ავლენს." |
| წაიკითხე ფურცელი | read advertisement | ✅ (აღებულია) + full leaflet, multi-line text fully translated |
| დააგდე ფურცელი | drop advertisement | ✅ დაგდებულია. |
| სამხრეთით | south | ✅ → სახლის სამხრეთით |
| აღმოსავლეთით | east | ✅ → სახლის უკან |
| გააღე ფანჯარა | open window | ✅ opens for entry |
| შედი სახლში | enter house | ✅ → სამზარეულო (Kitchen), +score |
| დასავლეთით | west | ✅ → მისაღები ოთახი (Living Room) |
| აიღე ფარანი | take light | ✅ აღებულია. |
| აიღე მახვილი | take sword | ✅ აღებულია. |
| გადაწიე ხალიჩა | move rug | ✅ reveals ხაფანგ-კარი (trap door) |
| აანთე ფარანი | light light | ✅ lantern on (grue-safety) |
| გააღე ხაფანგ-კარი | open trapdoor | ✅ door opens, staircase |
| ქვემოთ | down | ✅ → სარდაფი (Cellar), trap bars shut |

Natural vocabulary that "just worked": imperatives აიღე (take), გააღე (open),
დააგდე (drop), გადაწიე (move), აანთე (light/turn-on), წაიკითხე (read), შედი
(enter); bare cardinal directions with the -ით instrumental suffix (სამხრეთით,
აღმოსავლეთით, დასავლეთით, ქვემოთ); compound noun ხაფანგ-კარი. Score 35 by Cellar.

### Region 2 — Troll fight + treasure route to the Altar (turns 15–53): ✅ ALL CLEAN

- **Troll combat (6 rounds): zero English leaks.** The notes flag ka combat as a
  probabilistic leak-magnet; this run rolled clean. `მოკალი ტროლი მახვილით` (kill
  troll with sword) resolved every round; all parry/dodge/knockout/death-fog/
  sword-stops-glowing messages rendered in clean Georgian. `loquorMisses()` = 0
  after the fight. (Probabilistic — a different RNG roll could still surface an
  uncovered variant, per the notes; but the player path here was leak-free.)
- **Chimney + Attic recovery loop worked** (I'd descended before fetching the
  rope — recoverable): up the Studio chimney with 2 items, Attic rope+knife.
- **Puzzle/utility verbs validated (all ✅, all deterministic):**

| Georgian typed | Canonical | Note |
|---|---|---|
| მოკალი ტროლი მახვილით | kill troll with sword | combat, clean |
| გააღე ვიტრინა | open case | trophy case = ვიტრინა |
| ჩადე ნახატი ვიტრინაში | put painting in case | "put X in Y" container |
| სამხრეთ-აღმოსავლეთით | southeast | compound diagonal direction |
| მიაბი თოკი მოაჯირს | tie rope to railing | "tie X to Y" — rope puzzle |
| აიღე ჩირაღდანი | take torch | torch = ჩირაღდანი |
| ჩააქრე ფარანი | extinguish light | turn-off verb (needed for candles later) |
| აიღე კუბო | take coffin | "load too heavy" handled correctly when overloaded |
| ილოცე | pray | Altar teleport to Forest — works |

Score 74, above ground with the coffin, by turn 53. No misses logged.

### Region 3 — Rainbow / sceptre / case the first treasures (turns 54–77)

Forest navigation from the pray-drop point followed the walkthrough cleanly
(south, north → Clearing; east → Canyon View; down/down → Canyon Bottom; north →
End of Rainbow). All **compound diagonal directions work**: სამხრეთ-აღმოსავლეთით
(SE), სამხრეთ-დასავლეთით (SW), ჩრდილო-დასავლეთით (NW).

Puzzle verbs validated: `დაიქნიე სკიპტრა` (wave sceptre) ✅, `ჩადე X ვიტრინაში`
(put X in case) ✅ for coffin/gold/sceptre. `აიღე ოქრო` (take gold) → "take pot" ✅
(ოქრო correctly resolves the pot of gold). Overweight handling correct
("შენი ტვირთი ძაიან მძიმეა" = your load is too heavy).

Score 119, 4 treasures cased, by turn 77. **`loquorMisses()` still 0** — output
corpus clean for everything seen.

#### ❌ FINDING G1 — "სცეპტრა only": the sceptre's natural word კვერთხი abstains

`აიღე კვერთხი` (take sceptre, using **კვერთხი**) was **not understood** — the
turn did not advance and the player got the generic abstain
"ვერ გავიგე. მართივი ბრძანებები, მაგ. „აიღე ფარანი", მუშაობს."
Console: `stage:"llm"`, `raw:"(grammar-only)"`, `result:abstain` — i.e. the verb
აიღე resolved but the noun კვერთხი is absent from the ka lexicon, and with no LLM
net the whole command dies.

- **Why it matters:** კვერთხი is the ordinary, arguably the *primary*, native
  Georgian word for a sceptre / royal staff. The lexicon only knows **სკიპტრა**, a
  transliteration of the English "sceptre" that the output corpus also uses. A
  native speaker's first instinct (კვერთხი) fails.
- **Severity:** Recoverable but rough. The object's on-screen description names it
  სკიპტრა, so an attentive player can copy that word (I did: `აიღე სკიპტრა` → ✅).
  But it's a real "natural command fails" moment, exactly the class CLAUDE.md flags
  for a player-experience conversation. Recommend adding კვერთხი as a ka synonym
  for the sceptre (sceptre object), input-side only — does not touch the LLM maps.

### Region 4 — Dam, Reservoir, Atlantis, the Frigid River (turns 100–176)

Big segment, mostly clean. Puzzle verbs validated (all ✅ deterministic):

| Georgian typed | Canonical | Note |
|---|---|---|
| დააჭირე ღილაკს | push button | → **4-candidate disambiguation** in clean Georgian ("რომელი გულისხმობ — ლურჯი ღილაკი, წითელი ღილაკი, ყავისფერი ღილაკი თუ ყვითელი ღილაკი?", joined by თუ, no English) |
| ყვითელი ღილაკი | yellow button | disambiguation **reply** resolves → "წკაპ." (Click) |
| მოატრიალე ხრახნი ქანჩის გასაღებით | turn bolt with wrench | drains reservoir; "turn X with Y" instrument |
| მოიცადე | wait | "დრო გადის..." — river drift + reservoir drain |
| გაბერე პლასტმასი ტუმბოთი | inflate valve with pump | boat inflates |
| ჩაჯექი ნავში | board boat | "now in the magic boat" |
| გაცურე | launch | onto the Frigid River |
| აიღე ბაკანი | take buoy | buoy = ბაკანი |
| გადი ნავიდან | exit raft | leave-boat works |
| გააღე ბაკანი | open buoy | reveals emerald (ზურმუხტი) |
| გადაკვეთე ცისარტყელა | cross rainbow | rainbow → End of Rainbow |

Frigid River navigated deathless (drift via `მოიცადე`, took the buoy + `აღმოსავლეთით`
at the buoy segment, beached safely). Wrench = ქანჩის გასაღები (genitive compound),
screwdriver = სახრახნისი, matches = ასანთი, trunk = ზანდუკი, pump = ტუმბო, trident =
სამკაპა, shovel = ნიჩაბი — all recognized. Score 164, 7 treasures cased by turn 176.

#### ❌ FINDING G2 — "dig" only as თხარე, not გათხარე (the more natural form)

`გათხარე ქვიშა ნიჩაბით` (dig the sand with the shovel) **abstains** —
"ვერ გავიგე..." (verb not recognized). The bare imperative `თხარე ქვიშა ნიჩაბით`
→ "dig sand with shovel" ✅ works.

- **Why it matters more than G1:** unlike the sceptre (whose correct word სკიპტრა is
  shown on screen), "dig" is an **action the player must produce from scratch** with
  NO on-screen hint. **გათხარე** is an extremely natural Georgian imperative for
  "dig (it) up". A native speaker who reaches for გათხარე and gets a bare
  "I didn't understand" has no breadcrumb toward თხარე — and the scarab treasure
  (needed for the 350-point win) is **unobtainable** without the dig verb. This is a
  candidate **hard blocker**, not just friction. Recommend adding გათხარე (and likely
  ამოთხარე) as ka synonyms of the dig verb.

#### ⚠️ Harness note (not a product bug) — input stuck after rapid abstains

When several Georgian commands abstained in quick succession (the failed `გათხარე`
digs), the transcript `<input>` stopped submitting on Enter (text accumulated /
concatenated). A page reload resumed the autosave cleanly (turn boundary saved) and
the input worked again. This is a browser-automation artifact of firing the next
`type` before the abstain cleared, **not** a Loquor bug; flagged so a future UAT
clears the field between abstaining commands. `loquorMisses()` was reset by the
reload (output-corpus leak tracking restarts).

### Region 5 — Egg/tree, maze, cyclops, thief, songbird (turns 181–242)

Puzzle verbs validated (all ✅ deterministic, clean Georgian output):

| Georgian typed | Canonical | Note |
|---|---|---|
| აძვერი ხეზე | climb tree | up the tree for the egg |
| აიღე კვერცხი | take (jeweled) egg | egg = კვერცხი |
| ექო | echo | Loud Room — acoustics change, bar takeable |
| ულისე | ulysses | cyclops magic word — he flees |
| მიეცი კვერცხი ქურდს | give egg to thief | "give X to Y(dative)" — thief admires it |
| მოკალი ქურდი ცულით | kill thief with axe | thief combat, ~8 rounds, clean Georgian throughout |

Maze navigated by the walkthrough path (W,S,E,U → skeleton room; SW,E,S,SE →
Cyclops Room) — all rooms titled ლაბირინთი, diagonal directions reliable. Coins =
მონეტები, skeleton key = გასაღები, bar = ზოდი, chalice = თასი, bauble = ბურთულა.
The thief had stolen the **sword** (gone from the Troll Room) and the **trident**
(recovered from his hoard when he died — saved an Atlantis trip). The egg came
back **opened with the canary** (give-then-kill timing worked). The cyclops→Living
Room shortcut (down, east, east) works. Score 235, **11 treasures collected/cased**
by turn 242.

#### ❌ FINDING G3 — "wind up canary" abstains (the songbird solution verb)

`ამოქოქე კანარა` (wind up the canary) **abstains** ("ვერ გავიგე..."). This is the
songbird puzzle's solution; the resulting **bauble** is a treasure needed for the
350-point win. **The app itself already knows this is a gap:** the persistent
footer literally instructs the player to use the English escape —
`…ბრჭყალებში, მაგ. "wind up canary"`. Typing the quoted English `"wind up canary"`
works (the songbird/bauble output renders in clean Georgian).

- **Severity / mitigation:** a natural Georgian command for a critical puzzle verb
  fails, BUT unlike dig (G2) this one is **explicitly sign-posted** — a player who
  reads the on-screen footer is told the exact escape to type. So it is recoverable
  *by design*, not a silent dead end. Still worth a deterministic ka entry
  (ამოქოქე/მოქოქე "wind up") so the headline puzzle doesn't force English on a
  Georgian-only player.

### Region 6 — Temple/Hades exorcism, skull, mirror (turns 250–277): ✅ ALL CLEAN

The iconic Hades ritual works **completely** in natural Georgian, no leaks:

| Georgian typed | Canonical | Result |
|---|---|---|
| აიღე ზარი | take bell | bell = ზარი |
| აიღე სანთლები | take candles | candles = სანთლები |
| აიღე წიგნი | take page | black book resolved |
| დარეკე ზარი | ring bell | bell red-hot, wraiths paralyzed |
| აანთე ასანთი | light match | a match burns |
| აანთე სანთლები ასანთით | light candles with match | candles lit, spirits cower ("light X with Y") |
| წაიკითხე წიგნი | read page | "Begone, fiends!" — spirits flee |
| აიღე თავის ქალა | take skull | crystal skull = ბროლის თავის ქალა |
| მოისვი სარკე | rub reflection | room shakes — mirror teleport works |

Score 261, skull in hand by turn 277.

---

## FINAL STATUS & VERDICT

**Reached:** score **261 / 350**, **13 of 19 treasures** collected (12 cased + the
skull in hand), turn ~277, **deathless**. Drove the ENTIRE run in natural Georgian
(no English except the one sign-posted `"wind up canary"` escape).

**Coverage:** Every **distinct command / puzzle verb in Zork I** was exercised in
Georgian — navigation (incl. all 4 diagonals + up/down/enter/exit), take/drop/
open/close/read/move, put-in-container, light/extinguish, wait, combat (troll +
thief, ~14 rounds total), and the puzzle verbs: tie-to, pray, wave, turn-with-
instrument (wrench), push + 4-way disambiguation + reply, inflate-with-pump,
board/launch/exit-boat, cross-rainbow, dig, climb, echo, Ulysses, give-to(dative),
kill-with, ring, light-match, light-with, read-book, rub-mirror. **Not individually
driven** (left undone): the coal-mine machine (turn-switch-with-screwdriver =
proven "X with Y" pattern; lower/raise-basket) and unlock-grate-with-key (proven
"X with Y") — i.e. only already-validated patterns remain untested, plus heavy
inventory logistics. The final coal-mine + endgame (map → Stone Barrow) was **not**
ground out.

**Output translation: flawless.** `loquorMisses()` was 0 at every check across the
whole run — every room, item, combat line, ritual, leaflet, and the multi-line
black-book prayer rendered in clean Georgian. (One mid-run reload reset the miss
counter; no leak was ever observed before or after.)

**Verdict — could a native Georgian speaker reasonably complete Zork I?**
**Yes, with three caveats** (all input-side; the output layer is a non-issue):

1. **G2 (dig) is the one genuine risk of a hard wall.** `გათხარე` (the natural
   perfective "dig") fails; only `თხარე` works, with **no on-screen hint**. The
   scarab (a 350-point-win treasure) is gated behind it. A speaker who never tries
   the bare `თხარე` form could be stuck. **Highest-priority fix.**
2. **G1 (sceptre):** `კვერთხი` (the ordinary word) fails; the game shows `სკიპტრა`
   on screen, so it's recoverable by reading the description. Friction, not a wall.
3. **G3 (wind up canary):** the natural Georgian abstains, but the app's footer +
   `help` explicitly hand the player the `"wind up canary"` English escape — a
   sign-posted, by-design fallback. Recoverable.

Everything else — the overwhelming majority of the game — is fluent, deterministic,
and clean. Recommend adding ka synonyms for **dig (გათხარე/ამოთხარე)**, **sceptre
(კვერთხი)**, and **wind-up (ამოქოქე/მოქოქე)**; these are input-lexicon-only and
don't touch the (nonexistent for ka) LLM maps. G2 in particular is a CLAUDE.md
"talk-to-me-first" player-experience item: a natural command failing with no
breadcrumb, gating a win-required treasure.

---

## Session (resume → DEATHLESS 350/350 WIN) — 2026-06-29

Resumed the autosave at the north Mirror Room (261/350, turn 277) and **drove
Zork I to a deathless 350/350 Stone Barrow victory entirely in Georgian** (final
move 468, rank **ოსტატი თავგადასავლების მაძიებელი** / Master Adventurer).
`loquorMisses()` (ka) = **0 at every check, including the entire endgame** — zero
output-translation leaks across the whole completion. (Note: G1/G2/G3 from the
prior verdict are now FIXED — commit `c398fe8`; verified by `parse.ka-uat.test.ts`
green, not re-tested live this run since the route used the already-working forms.)

**Route driven (all in Georgian, all clean):** case skull → fetch/case trident
(cyclops shortcut) → fetch/case platinum bar (regular maze: Troll W,S,E,U →
skeleton room; the **"Up" exit is what reaches the skeleton room** — easy to miss
since maze rooms give no exit text) → fetch torch (rainbow → Aragain Falls) →
full **coal mine + machine/diamond** run (torch-in-basket Gas-Room safety, jade in
Bat Room with garlic, sapphire in Gas Room, empty-handed Timber crawl, machine
coal→diamond) → case all 19 → endgame whisper → `დაათვალიერე ვიტრინა` (map) →
`აიღე რუკა` / `წაიკითხე რუკა` → West of House secret SW path → `შედი ყორღანში`
→ full victory banner. All rendered in clean Georgian; only the closing
`RESTART/RESTORE/QUIT` meta-tokens stay English (documented intentional choice).

### 🅸 NEW finding — G4: "raise basket" verb gap (input-lexicon, ka)
- **`ამოწიე კალათა` ("pull up the basket") ABSTAINS** (`ვერ გავიგე…`); only
  **`ასწიე კალათა` works** for "raise basket". The abstain notice itself was clean
  Georgian (no output leak).
- **Why it matters:** `ამო-` ("up and out") is arguably the *more* natural prefix
  for hauling a basket UP out of a deep shaft, so a native speaker's first instinct
  may well be `ამოწიე`. ka has no LLM net, so this is a hard miss. It is **not a
  hard wall** (the coal-mine diamond — a 350-required treasure — depends on raising
  the basket, but `ასწიე` works and `ჩაუშვი`/`ასწიე` are a natural lower/raise
  pair). Same display/intuition-vs-parser class as G1–G3 and the prior-session
  `გადააბიჯე`-vs-`გადაკვეთე` (cross rainbow) and `ამოწიე`-adjacent gaps.
- **Suggested fix (input-lexicon-only, stays out of LLM maps):** add `ამოწიე`
  (and consider `ამოქაჩე`/`აზიდე`) as a ka input alias for "raise". Pairs with the
  cross-rainbow `გადააბიჯე` alias already noted in `uat-georgian-completion.md`.

### Confirmed-working this run (notable verbs/nouns, all clean ka)
- Basket: `ჩადე X კალათაში` (put in), `ჩაუშვი კალათა` (lower), `ასწიე კალათა` (raise).
- Machine: `გახსენი/დახურე სახურავი` (open/close lid), `ჩადე ნახშირი მანქანაში`,
  `მოატრიალე ჩამრთველი სახრახნისით` (turn switch with screwdriver).
- `ინვენტარი` (inventory — loanword works; per prior notes `ნივთები` does not),
  `დააგდე ყველაფერი` / `აიღე ყველაფერი` (drop/take all), `დაათვალიერე ვიტრინა`
  (examine case), `მიმოიხედე` (look), `შედი ყორღანში` (enter barrow).

**Verdict reaffirmed:** a native Georgian speaker can complete Zork I end-to-end.
Output translation is a non-issue (0 leaks, full game incl. victory banner). The
only friction is the small set of input-lexicon synonym gaps (G1–G3 now fixed; G4
new, recoverable). Recommend adding the G4 `ამოწიე` raise alias.
