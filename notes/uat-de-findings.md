# UAT — Zork I full German playthrough (2026-06-16)

Driven in **real German + compound sentences**. NOTE: `loquor.nl` shows `declined:true`,
but the **LLM fallback IS running** (model cached from a prior session) — `…thinking`
appears and resolves. So uncovered phrases fall back to the LLM and usually still play
through. A `…thinking` therefore flags a **deterministic-lexicon gap** (worth noting) even
when the LLM rescues it. Fresh game (autosave cleared). **No fixes this run.**

Legend: [INPUT] = NL input mis-mapping · [OUTPUT] = output-corpus/translation gap ·
[META] = meta-command/prompt · sev: blocker / major / minor / cosmetic

---

## Findings

### F1 [META] minor — restart re-prompt reverts to English
- First restart prompt is German: "Möchtest du neu beginnen? (Y bedeutet ja):"
- After a rejected answer, the **re-prompt is English**: "Do you wish to restart? (Y is affirmative):"
- The "Y" token stays English in both (probably intentional — parser key).

### F2 [META/INPUT] major — yes/no confirmation prompts can't be answered by typing
- At the restart Y/N prompt: bare `y` → NL layer translated it to `look` (game advanced a
  turn, restart abandoned). Quoted `"y"` → sent the literal `"y"` (with quotes), game re-asked.
- Net: restart/quit confirmation is effectively unusable through the German NL layer. Had to
  clear IndexedDB autosave + reload to get a fresh game.
- Suggest: at a yes/no/char-input request, pass single letters (y/n/j/q) straight through.

### F3 [INPUT] minor — "Zettel" mis-maps to "manual"
- `lies den Zettel` → `read manual` → "Du siehst hier kein „manual"!" (no manual here).
- The leaflet's working German noun is **"Prospekt"** → `read advertisement` ✓ (reads fine).
- So use "Prospekt" for the leaflet; "Zettel" should probably also map to advertisement.

### F4 [INPUT] minor — "dann <dir>" forces LLM fallback
- `geh nach Norden und dann nach Osten`: first clause `north` deterministic, but the
  second `dann nach Osten` went to `…thinking` (LLM) → resolved to `east` correctly.
- The "dann" (then) prefix on a conjunct isn't in the deterministic split. LLM-rescued.
- Plain `und nach <dir>` chains ARE deterministic (`geh nach Osten und nach Norden` ✓).

### F5 [INPUT] minor — "klettere hinunter" mis-maps to "move tree"
- Up a Tree: `klettere hinunter` (climb down) → `move tree` → "Du kannst den Baum nicht
  bewegen." (stuck in tree). Should be `climb down` / `down`.
- (Climbing UP worked: `klettere auf den Baum` → `climb tree` ✓.)

---

## Output-corpus (loquorMisses) checkpoints
- After leaflet ("WILLKOMMEN BEI ZORK!" full text): `loquorMisses()` = [] ✓ clean.

## Output-corpus (loquorMisses) checkpoints (cont.)
- After egg description (Up a Tree): [] ✓ clean.
- After troll fight (knockout + death + black-fog flavor): [] ✓ clean.

## Confirmed-GOOD (German working correctly)
- Intro/title block, West of House room desc, mailbox open line — all clean German.
- Compound `öffne den Briefkasten und lies den Zettel` → split + verb distribution ✓
  (`open mailbox` / `read manual`); compound handling itself works.
- Leaflet full multi-line text renders in correct German, in corpus (no miss).
- Nouns OK: Briefkasten→mailbox, Prospekt→advertisement, Sack→sack, Knoblauch→garlic,
  Lampe→light, Schwert→sword, Teppich→rug, Falltür→trapdoor, Ei→egg, Baum→tree.
- Verbs OK: öffne→open, lies→read, nimm→take, schiebe…beiseite→move, klettere auf→climb,
  schalte … an/aus→turn on/off, geh nach <dir>→<dir>, geh nach unten→down.
- Conjoined-object verb distribution: `nimm die Lampe und das Schwert` → take light/take sword ✓.
- Multi-clause "und" chains (movement + actions) split correctly and run sequentially ✓.
- COMBAT instrument slot WORKS in German (contrast Spanish bug): `töte den Troll mit dem
  Schwert` → `attack troll with sword` ✓; troll knockout→death flavor all clean German.
- Room descs all clean German: Küche, Wohnzimmer, Waldpfad, Auf einem Baum, Keller, Trollraum.
- More nouns OK: Gemälde→painting, Vitrine→case, Seil→rope, Messer→knife.
- Conjoined DROP with separable verb: `lass den Knoblauch, das Schwert und das Ei fallen`
  → drop garlic/sword/egg ✓ ("lass…fallen" → drop, distributed to 3 objects).
- 3-object conjoined TAKE: `nimm das Ei, das Schwert und den Knoblauch` → take egg/sword/garlic ✓.
- Mixed compound (conjoined-take + clause): `nimm das Seil und das Messer und geh nach unten`
  → take rope/take knife/down ✓ (correctly splits the trailing movement clause).
- `Inventar` → inventory ✓ ("Du trägst:" list clean German, "Eine Messinglaterne (leuchtet)").
- `lege X in die Vitrine` → put X in case ✓ ("Erledigt."); casing the painting scored +6.
- `öffne die Vitrine` → open case ✓; chimney/attic juggling all worked.
- Trophy-case status line on room entry: "Deine Schatzsammlung besteht aus:" ✓ clean German.

### F6 [INPUT] minor — "Buch" mis-maps to "page"
- `nimm das Buch` → `take page` (the black book). Cosmetic: parser resolves "page" to the
  black book, so the Hades ritual should still work. Matches the Spanish `libro`→page note.

### F7 [INPUT] **MAJOR / death-trap risk** — "lösche … aus" (extinguish) → "burn … with torch"
- `lösche die Kerzen aus` (= extinguish the candles) → `burn candles with torch` — the
  OPPOSITE action. Game caught it this time ("…die Kerzen bereits angezündet sind"), but
  intending to EXTINGUISH and getting BURN/LIGHT is exactly the coal-mine death trap
  (you must extinguish open flames before the Gas Room). HIGH priority — verify a working
  German extinguish verb exists and that "lösche aus" never maps to a lighting verb.
  (Spanish analogue: imperative `apaga` was UNKNOWN; here German maps to the wrong verb.)
  - `lösche die Kerzen aus` → `burn candles with torch` ✗ (opposite!)
  - `puste die Kerzen aus` → `burn candles with torch` ✗ (opposite!)
  - `mach die Kerzen aus` → `turn off candles` ✓ "Die Flamme ist erloschen." (WORKS)
  - So a workaround exists ("mach … aus"), but "lösche/puste … aus" → a LIGHTING verb is
    the bug. Anyone reaching for the natural extinguish verb near an open flame is at risk.

### F8 [OUTPUT] minor — "Hier ist Kerzen." plural number-agreement
- On the floor, plural candles render as "**Hier ist Kerzen.**" — singular verb "ist" with a
  plural noun, and no article. Should be "Hier sind Kerzen." (or "…ein Paar Kerzen").
- The "Hier ist <X>" floor-listing template doesn't agree in number for plural items.
  (Singular items fine: "Hier ist ein schwarzes Buch.", "Hier ist eine Messingglocke.")

### F9 [INPUT] good — `Echo` works as the Loud Room solution
- `Echo` → `Echo` passthrough ✓ → "Die Akustik des Raumes verändert sich auf subtile Weise."
  (Spanish `eco` mis-mapped to look; German `Echo` works — platinum bar then takeable.)

### F11 [OUTPUT] **corpus gap** — drained/quiet Loud Room description missing
- After draining the reservoir, the Loud Room loses its roar and uses its QUIET description:
  EN "This is a large room with a ceiling which cannot be detected from the ground. There is
  a narrow passage from east to west and a stone stairway leading upward. **The room is eerie
  in its quietness.**" This English line is NOT in the German corpus → it LLM-fell-back,
  rendering the awkward "Das Zimmer wirkt **still und still** in seiner Stille."
- Confirmed via `loquorMisses()` (one entry, kind:"line", ctx "Loud Room — Score 79 Turns 130").
- Classic off-golden-path gap (only appears post-drain) — exactly the gate blind-spot the
  uat.md notes warn about. Likely shared with the French corpus. Add the quiet-Loud-Room desc.
- (Good news: the black-book prayer "Gebot Nr. 12592" incl. the "…sollst du wandern, **und**"
  line is FULLY in the corpus — the flagged verse-split blind-spot did NOT leak in German.)

## Progress log
- Turn 101, Score 79. Cased: painting(50). Have: lamp(off), torch(lit), knife, egg, garlic,
  Platinbarren(+10). Staged in Loud Room: bell, book(page), candles (for Hades later).
- Rope tied at Dome Room. Sword dropped at Altar (don't need it). Deferred: coffin+sceptre
  (Egyptian Room, get on a later Dome-rope run, pray out). Hades ritual pending (need matches).
- Heading NE from North-South Passage → Deep Canyon → Dam (matches + drain reservoir → trunk).
- CARRYING CAPACITY is tight ("Deine Last ist zu schwer") — having to stage items.

### F10 [INFO] two distinct capacity messages, both clean German
- Weight limit: "Deine Last ist zu schwer." (load too heavy).
- Count limit: "Du hältst bereits zu viele Dinge in der Hand!" (holding too many things).

## Confirmed-GOOD (cont.) — Dam / mid-dungeon
- Echo puzzle, platinum bar (Platinbarren→bar), engravings, Dome/rope (binde…an→tie…to),
  torch (Fackel, +14), bell (Glocke), book(Buch→page), candles (Kerzen).
- Dam complex all clean German: Staudamm, Damm-Foyer, Wartungsraum; Bedienpult/Metallbolzen/
  grüne Plastikkuppel; Streichholzheftchen→match, Reiseführer→guide, Schraubenschlüssel→wrench,
  Schraubenzieher→screwdriver. `drücke den gelben Knopf`→push yellow button ✓ "Klick.".
  `drehe den Bolzen mit dem Schraubenschlüssel`→turn bolt with wrench ✓ (reservoir drains:
  "Die Schleusentore öffnen sich, und Wasser strömt durch den Damm.").
- Guidebook full text (Lord Dimwit Flathead, partridge-in-a-pear-tree joke) clean German,
  in corpus (loquorMisses empty). Engravings + guidebook both [] on misses.
- `mach die Kerzen aus`→turn off candles ✓ (working extinguish; see F7 for the broken ones).
- Turn 116, Score 79. Reservoir draining. Have: lamp,torch,knife,egg,garlic,Platinbarren,
  match,wrench,screwdriver. Next: Dam Base (boat/pump), then Hades ritual (have matches).
- Turn 125, Score 79. Reservoir drained ("warte"→wait ✓; Reservoir Süd/Reservoir clean
  German; "Truhe"→trunk ✓ but capacity-blocked). Trunk + Platinbarren left staged in the
  Reservoir. Dam Base (Dammfuß) clean German (boat = "Haufen Plastik … Ventil").
- Heading to Loud Room → Entrance to Hades for the exorcism (black-book prayer = flagged
  corpus blind-spot per notes/uat.md). Carrying-capacity is the main non-bug time sink.
- **Turn 159, Score 89. HADES EXORCISM DONE, deathless.** Full ritual clean German:
  `läute die Glocke`→ring bell, `zünde ein Streichholz an`→light match, `zünde die Kerzen an`
  →light candles (mit dem Streichholz), `lies das Buch`→read page (prayer "Hinweg, ihr
  Unholde!"), Reich der Toten (Land of the Dead), `nimm den Kristallschädel`→take skull ✓ (+10).
  Black-book prayer "Gebot Nr. 12592" (incl. "…sollst du wandern, **und**") fully in corpus.
  `loquorMisses()` still exactly 1 entry (F11) after ALL Hades text. Compound noun
  "Kristallschädel"→skull works (vs Spanish "calavera de cristal"→"crack").
- **Session paused here for handoff.** Full continuation brief written to `prompt.md` at repo
  root (resume state, route plan, death traps, all findings). Game auto-resumes from autosave.

---

## CONTINUATION SESSION 2 (2026-06-16, resumed at Score 89 / Turn 159)

Resumed from autosave at Reich der Toten (skull just taken). Drove out of Hades, through the
Maze to the Cyclops Room, opened the cyclops shortcut, and began staging the thief fight.
Deathless throughout (one near-miss: thief stole the torch → darkness → re-lit lamp in time).

### F12 [INPUT] minor — "Lederbeutel" mis-maps to "lettering"
- `nimm den Lederbeutel und den Schlüssel` → first clause `take lettering` →
  "Du siehst hier kein „lettering"!" (fail). "Lederbeutel" (the bag-of-coins noun the game
  itself prints: "Ein alter Lederbeutel, prall gefüllt mit Münzen, liegt hier.") maps to the
  WRONG canonical "lettering" (the engravings object).
- **Working noun: "Münzen"** → `take coins` ✓ "Genommen." (+10). So drive the bag of coins as
  "Münzen", never "Lederbeutel"/"Beutel". `Schlüssel`→`take key` ✓ also confirmed.

### F13 [INPUT] minor — compound aborts after a failed first clause
- In the F12 command, after `take lettering` failed (unknown word), the game printed
  **"Ran 1 of 2 actions."** — i.e. the 2nd clause (`den Schlüssel`→take key) was **dropped**,
  not attempted. A failed/unknown first clause stops the rest of an `und`-compound.
- Could be intentional stop-on-error, but it silently loses a valid later clause. Flag to
  decide: should a bad clause skip-and-continue rather than abort the remainder?

### F14 [OUTPUT] GOOD (not a bug) — thief "left you in the dark" is literally correct
- When the thief robbed me in the maze he took the **lit torch** (my light source). The line
  "Der Dieb scheint dich im Dunkeln zurückgelassen zu haben." is therefore **literal and
  correct** — he left me in actual darkness (had to `schalte die Lampe an` to avoid a grue).
  Initially looked like an awkward idiom; it is not. Good contextual translation.

### Confirmed-GOOD (Session 2)
- **German `Ulysses` passthrough works** (cyclops magic word): typed plain (no quotes) →
  `> Ulysses` untranslated → "Der Zyklop … flieht aus dem Raum, indem er die Wand im Osten …
  einreißt." Cyclops shortcut opens (matches Spanish: English Ulysses works in any mode).
- **Compound movement chains, all deterministic** (no `…thinking`): `geh nach Norden und nach
  oben` (named dir + oben), 3× `und nach Norden`, 3× `und nach Westen`, diagonals
  `… Südwesten und nach Osten`, `… Süden und nach Südosten`, 2× `und nach Osten`.
- `schalte die Lampe an` → `turn on light` ✓ ("Du schaltest die Messinglaterne ein.").
- `mach die Kerzen aus` → `turn off candles` ✓ (F7 working extinguish re-confirmed).
- 3-object conjoined separable-verb drop re-confirmed: `lass das Buch, die Streichhölzer und
  die Kerzen fallen` → drop page / drop match / drop candles, each "Fallen gelassen."
- `Schlüssel`→key, `Münzen`→coins, `lege die Münzen in die Vitrine`→put coins in case ✓ (+5).
- Clean German rooms/text (all in corpus, `loquorMisses()` held at 1 the whole session):
  Eingang zum Hades, Höhle, Spiegelraum, Schmaler Gang, Runder Raum, Lärmender Raum,
  Ost-West-Gang, Der Trollraum, **Labyrinth** ("…gewundener kleiner Gänge, alle gleich."),
  skeleton room ("Ein Skelett … liegt hier", "Ein alter Lederbeutel, prall gefüllt mit
  Münzen…"), **Zyklopenraum** (cyclops desc), **Seltsamer Gang** ("…etwa zyklopengroß"),
  Wohnzimmer. Maze route to Cyclops: Troll Room → W,S,E,U (skeleton) → SW,E,S,SE.

### Progress log (Session 2)
- **Turn 191, Score 104, deathless.** Cased: Gemälde(painting) + Münzen(coins). Carrying:
  garlic, nasty knife, lamp(ON), skeleton key. Cyclops shortcut OPEN (Living Room ⇄ Strange
  Passage ⇄ Cyclops Room). **Thief holds my torch + crystal skull + platinum bar + jeweled egg**
  (all recoverable from his Treasure-Room hoard when he dies). Next: up to the Treasure Room to
  fight the thief (the death-risk step) — then case his hoard via the shortcut.

### F15 [INPUT] minor — "nimm alles" (take all) mis-maps to "take large bag"
- `nimm alles` → `take large bag` → "Du siehst den großen Sack hier nirgends!" The "all/everything"
  quantifier **"alles" maps to "large bag"** (the thief's Sack), so *take all* is broken in German.
  Matches the Spanish "todo" mis-map. Must enumerate objects (a 5-object `nimm A, B, C, D und E`
  conjoined take distributed the verb fine).

### F16 [INPUT] MAJOR — conjoined PUT + trailing prep phrase fails (matches Spanish)
- `lege den Kristallschädel und den Kelch in die Vitrine` → `put skull` with **the destination
  "in die Vitrine" DROPPED** → game asks "Was willst du mit dem Schädel tun?" (incomplete), then
  **"Ran 1 of 2 actions."** (the 2nd object Kelch also dropped). Identical to the Spanish bug
  (`mete X y Y en la cesta` → only `put X`).
- **Chained failure (F2-family):** the resulting disambiguation sub-prompt put input into RAW
  passthrough — the next German command `lege … in die Vitrine` was sent **untranslated** →
  "Ich kenne das Wort „lege" nicht." (only cleared the sub-prompt on the 3rd try). So a yes/no or
  "what do you want to do with X" sub-prompt breaks NL translation entirely.
- **Workaround:** case ONE object at a time — `lege X in die Vitrine` (single object + prep) is
  100% reliable (cased coins, skull, chalice, egg, bar this way).

### F17 [OUTPUT] cosmetic — missing genitive -s: "deines Messer"
- Thief KO line: "Der Knauf deines Messer schlägt den Dieb bewusstlos." — "deines Messer" should
  be genitive **"deines Messers"** (das Messer → des Messers). No miss logged (authored string).

### F18 [OUTPUT] cosmetic — bag-of-coins has 3 different display names
- Same object renders as **"Lederbeutel"** (on the floor: "Ein alter Lederbeutel…"),
  **"Münzen"** (the working take noun / "prall gefüllt mit Münzen"), and **"Münzbeutel"** (once
  cased: "Ein Münzbeutel"). All plausible German, but inconsistent. (Note: "Lederbeutel" is also
  the F12 input mis-map → "lettering".)

### Confirmed-GOOD (Session 2, thief fight + casing)
- **German thief combat works** (no Spanish `cuchillo`→estilete bug): `töte den Dieb mit dem
  Messer` → `attack thief with knife` (echo varies to "attack thief with nasty knives") ✓.
  Full deathless kill: "orientierungslos und kann sich nicht wehren" → KO ("Der Knauf … schlägt
  den Dieb bewusstlos") → "Der bewusstlose Dieb kann sich nicht verteidigen: Er stirbt." → black-
  mist death + hoard reappearance ("…schwindet die Kraft seiner Magie, und seine Schätze
  erscheinen wieder") — all clean corpus German, `loquorMisses()` stayed at 1 throughout.
- **5-object conjoined TAKE distributes the verb:** `nimm die Fackel, den Kristallschädel, das Ei,
  den Kelch und den Platinbarren` → take torch/skull/jeweled egg/chalice/bar (bar weight-blocked,
  rest taken). `Kelch`→chalice, `Fackel`→torch, `Platinbarren`→bar, `Truhe`→trunk all ✓.
- `nimm den Kanarienvogel aus dem Ei` → `take canary from egg` ✓ — single obj + "aus dem" prep OK
  (contrast F16's conjoined+prep failure). Nested display: "Das Ei enthält: Ein goldener
  Kanarienvogel".
- `Diagnose` → diagnose ✓ clean German ("Du hast eine leichte Wunde, die nach 6 Zügen verheilt
  sein wird. Du kannst eine schwere Wunde überleben.").
- `mach die Lampe aus` → `turn off light` ✓ correctly targets the lantern, leaves the torch lit.
- `lege X in die Vitrine` (single obj + prep) cased coins/skull/chalice/egg/bar reliably (+5/+10 ea).
- Weight-limit wound variant: "Deine Last ist zu schwer, besonders angesichts deines Zustands."
- Lamp described "Eine Messinglaterne (batteriebetrieben)" when dropped; torch "(leuchtet)".

### Progress log (Session 2, cont.)
- **Turn 226, Score 170, deathless.** Thief KILLED (deathless). Cased 6/19: egg, chalice, skull,
  coins(Münzbeutel), painting, platinum bar. Carrying: torch(lit), nasty knife, garlic, canary.
  Staged in Living Room (hub): lamp(off), skeleton key. **Trunk of jewels (Truhe)** still in the
  Treasure Room (weight-blocked by the healing wound — heals in ~6 turns; thief had stolen it from
  the Reservoir, so no Reservoir trip needed). Remaining treasures: trunk, canary→case, bauble
  (wind canary in forest), torch(case last), trident (Atlantis), jade (Bat Room), sapphire (Gas
  Room), diamond (coal machine), coffin+sceptre (Egyptian Room→pray), pot of gold (rainbow),
  emerald (river buoy), scarab (Sandy Cave). Cyclops shortcut + Living Room hub make casing fast.

---

## ⭐ CROSS-LANGUAGE finding — the songbird/canary-wind puzzle (Ovid flagged: must work in EVERY language)

The **canary-winding verb is a mandatory PUZZLE SOLUTION** (winding the clockwork canary in the
forest is the only way to summon the songbird that drops the brass **bauble**, treasure #3). If the
"wind up X" verb breaks in a language, that language **cannot reach 350 without quoted passthrough**
— a soft-blocker for 100% completion. Status across languages:

- **German: WORKS.** `ziehe den Kanarienvogel auf` → `wind up canary` ✓ → songbird appears, drops
  the bauble ("eine schöne Messingkugel"), full text clean German, no corpus miss.
- **Spanish: BROKEN.** `dar cuerda al canario` → `give rope to canary` (the idiom *dar cuerda a X*
  = "wind up X" is taken literally; `cuerda` = "rope"). The songbird puzzle is **unsolvable in es**
  without the `"wind up canary"` quoted passthrough. (Documented in `notes/uat.md` lines ~158, ~296
  — confirmed still present in UAT-es-4.)
- **French: UNVERIFIED — must be checked.** The natural FR is `remonter le canari` (wind up) — but
  any literal handling of a "wind/turn the key" idiom risks the same trap. **Action: verify the FR
  canary-wind solution end-to-end before claiming fr is winnable.**

**Recommendation:** the per-language input lexicon needs an explicit "wind up / wind"→`wind` mapping
for the canary that does NOT route through a literal idiom translation (es proves the LLM/idiom path
mis-renders it). Treat "every puzzle-critical verb resolves in every supported language" as a
release gate, since one broken solution verb makes a language uncompletable.

### F20 [INPUT] minor — the bauble noun has NO working German map (both candidates mis-map)
- After winding the canary, the bauble (game prints it as "eine schöne **Messingkugel**"):
  - `nimm die Messingkugel` → `take machine` → "Du siehst die Maschine hier nirgends!" ✗
  - `nimm die Kugel` → `take kitchen table` → "Du siehst den Küchentisch hier nirgends!" ✗
  - **Workaround:** `"take bauble"` quoted passthrough → `take bauble` "Genommen." ✓
- So the bauble is **un-takeable in real German** — needs a `Messingkugel`/`Kugel`→`bauble` lexicon
  entry. (Related cross-language note: the bauble is the songbird puzzle's payoff, so es/fr should be
  checked for a takeable bauble noun too.)

### F21 [INPUT] GOOD / confirmed — Temple/coffin run drove cleanly in German
- `nimm den Sarg`→take coffin, `öffne den Sarg`→open coffin ("Du öffnest den Goldsarg. Ein Zepter …
  liegt in dem Sarg…"), `nimm das Zepter`→take sceptre, `bete`→pray (Altar→Forest teleport with the
  heavy coffin) — all ✓ clean. `Diagnose`→diagnose, `ziehe…auf`→wind up all GOOD.

### Progress log (Session 2, cont. 2)
- **Turn 258, Score 205, deathless.** Cased 7/19 (added trunk). Carrying: torch(lit), canary,
  coffin, sceptre, bauble. Above ground in the Forest (prayed out of the Temple). Next: haul to the
  Living Room (case coffin/canary/bauble), then rainbow with the sceptre for the pot of gold, then
  the dangerous coal-mine / Atlantis / river runs. NL miss count = 2 (F11 quiet Loud Room + F19
  put-disambiguation template).

### F19 [OUTPUT] corpus gap — dynamic "What do you want to put the X in?" disambiguation template
- `loquorMisses()` entry #2: EN "What do you want to put the skull in?" (kind:"line") — the dynamic
  **put-disambiguation template is NOT in the German corpus** → LLM fallback rendered it
  "Was willst du mit dem Schädel tun?" (grammatical but loses the "put…in" sense, and it's a
  fallback not corpus). Triggered off-golden-path by the F16 conjoined-put (incomplete "put skull").
- **Same blind spot as Spanish/French** (uat.md: es "What do you want to put the torch in?" →
  garbled "¿Qué quieres poner la cera?"). German's LLM fallback is *less* garbled but it's still a
  corpus hole. **Add the put-disambiguation template to the de (and fr) corpus.**

### F22 [INPUT] minor — casing the POT: "Vitrine" mis-maps to "valve" (deterministic, only for Topf)
- `lege den Topf in die Vitrine` → `put pot in **valve**` → "Du siehst hier kein „valve"!" ✗ —
  **retry-stable** (failed twice identically), even though `lege das Zepter in die Vitrine` →
  `put sceptre in case` ✓ worked on the line immediately above. So with object "Topf", the
  destination "Vitrine" deterministically resolves to "valve" (the boat valve) instead of "case".
- **Workaround:** `"put pot in case"` quoted passthrough → "Erledigt." ✓ (+10).

### ⭐ Pot of gold IS takeable at the rainbow in German (disproves the Spanish "un-takeable" claim)
- The Spanish notes (uat.md) claimed the pot is un-takeable at End of Rainbow and must be looted from
  the dead thief. **In German the standard route works:** `schwenke das Zepter` → `wave sceptre`
  (rainbow solidifies, "Ein schimmernder Topf voll Gold erscheint…") → `nimm den Topf` → `take pot`
  "Genommen." (+10). This matters because **my thief was already dead** (dead-thief fallback
  unavailable), yet the pot was still obtainable — so the es claim was an es-input issue, not a game
  scope quirk. Good German verbs: `schwenke … das Zepter`→wave sceptre, `nimm den Topf`→take pot.

### F23 [OUTPUT] cosmetic — bauble cased displays as "Schmuckstück" (4th name for one object)
- The bauble: floor "Messingkugel", input mis-maps (F20: Messingkugel→machine, Kugel→kitchen table),
  passthrough noun "bauble", and **cased display "Ein Schmuckstück"**. The cased name "Schmuckstück"
  is likely the *intended* German noun — worth testing `nimm das Schmuckstück` as the F20 fix.

### Progress log (Session 2, cont. 3)
- **Turn 296, Score 251, deathless. Cased 12/19** (added coffin, canary, bauble, sceptre, pot).
  Rainbow + Temple/coffin/canary all done above ground, clean. NL miss count steady at 2 (F11 + F19).
  Remaining 7: torch (case LAST — triggers endgame), trident (Atlantis), jade (Bat Room), sapphire
  (Gas Room), diamond (coal machine — needs the screwdriver, which is currently UNACCOUNTED FOR: it
  was staged in the Loud Room but the room was empty and it was NOT in the thief's hoard), emerald
  (river buoy), scarab (Sandy Cave). These are all in the death-trap areas (coal-mine gas, river
  drift, sandy-cave collapse). Carrying torch(lit); staged in Living Room: lamp(off), garlic, knife,
  key. Plan: lamp + garlic for the coal mine; extinguish/stow the torch before the Gas Room.

---

## ⭐ CONTINUATION SESSION 3 (2026-06-16, resumed at Score 251 / Turn 307) — FINISHED THE GAME

**Drove the resumed save to a deathless 350/350 WIN (turn 486), rank "Meisterabenteurer".**
Collected the final 7 treasures (trident, jade, sapphire, diamond, emerald, scarab + torch) through
the coal-mine and Frigid-River death-trap areas and saw the full endgame. The screwdriver flagged
"UNACCOUNTED FOR" above was found/taken at the Deep Canyon at the start of this session (resolved).
**No fixes — only play + observe.** Final `loquorMisses()` = **4** (F11 + F19 + the F19 template
re-logged in the coal mine + ONE new entry: the boat label, F29). The entire coal mine (~20 scenes),
the whole river, and the **endgame are output-corpus-clean** in German.

### F24 [INPUT] minor — "Kristalldreizack" mis-maps to "crack"; bare "Dreizack" works
- `nimm den Kristalldreizack` → `take crack` → "Du siehst den Riss hier nirgends!" ✗ (the
  compound "Kristall-" prefix → "crack"/Riss). **`nimm den Dreizack` → `take trident` ✓** "Genommen."
- Inconsistent with `Kristallschädel`→`take skull` (which WORKS, F-notes). So compound-noun handling
  is object-specific. Mirrors the Spanish `calavera de cristal`→"take crack". Drive the trident as
  bare **"Dreizack"**.

### F25 [INPUT] **major / puzzle-critical** — no working German LAUNCH verb (boat)
- `starte das Boot` → `enter raft` ✗ ("Du bist bereits an Bord!"); `leg ab` → `burn coal with torch`
  ✗ (wild mis-map). No German launch verb resolves. **Workaround: type `launch`** — the boat label
  itself says: sage „Launch" (the keyword is intentionally kept English, like the canary/Ulysses).
- Like the canary-wind and the bauble, the river is **un-launchable in real German** without the
  English keyword → cross-language gate item (every language should map a launch verb, e.g.
  ablegen/lossfahren → `launch`).

### F26 [INPUT] minor — exit-boat verb mis-maps (matches Spanish `sal del bote`)
- `steig aus dem Boot` → `exit boarded window` → "Du siehst das vernagelte Fenster hier nirgends!" ✗
  (maps to the HOUSE's boarded window). **Workaround: `"get out of boat"` passthrough** → "Du stehst
  wieder auf eigenen Beinen." ✓. Direct analogue of the es `sal del bote`→"move raft" bug.

### F27 [INPUT] minor — RAISE verb mis-maps (`hebe`→move); LOWER (`senke`) works
- `hebe den Korb` → `move bottle` → "Du siehst hier kein „bottle"!" ✗ (double mis-map: heben→move,
  Korb→bottle). **Workaround: `"raise basket"` passthrough** → "Der Korb wird … hinaufgezogen." ✓
- **Contrast:** `senke den Korb` → `lower cage` ✓ "Der Korb wird … hinabgelassen." (lower WORKS).
  So the basket puzzle's LOWER verb is fine but RAISE has no German map. (Also good: `lege X in den
  Korb`→put X in cage ✓ — "Korb"→cage works for most objects, see F28 for the exception.)

### F28 [INPUT] minor — F22-family: object-specific destination mis-maps (the DIAMOND)
- `lege den Diamanten in den Korb` → `put diamond in **trunk**` ✗ ("kein „trunk"!").
- `lege den Diamanten in die Vitrine` → `put diamond in **valve**` ✗ ("kein „valve"!").
- So "Korb"/"Vitrine" both mis-resolve **only with object "Diamant"** (cf. F22: "Topf"+"Vitrine"
  →valve). The boat's synonym set includes **VALVE** ("Ventil"), which is why certain objects pull
  the destination to "valve"/"trunk". **Workaround: `"put diamond in cage"` / `"put diamond in case"`
  passthrough** ✓. (Trident/jade/bracelet/emerald/scarab all cased fine with `… in die Vitrine`.)

### F29 [OUTPUT] **corpus gap (NEW)** — the Frobozz Magic Boat Company label
- `loquorMisses()` entry #4: EN "!!!!FROBOZZ MAGIC BOAT COMPANY!!!!" (kind:"line", Dam Base). The
  **entire boat label is NOT in the German corpus** → LLM fallback, which **mistranslated "BOAT" →
  "Bahn"** (railway/track): "!!!!FROBOZZ-MAGIC-**BAHN**-GESellschaft!!!!" (should be "BOOT"), plus odd
  mid-word casing **"GESellschaft"**. Classic off-golden-path multi-line block (uat.md blind spot).
  **Likely shared with French.** Add the boat label to the de (+fr) corpus; should read "…BOOT…".

### F30 [INPUT/OUTPUT] — F16 reproduced in the coal mine + "Torso" garbling
- `lege die Fackel, den Schraubenzieher und den Diamanten in den Korb` → only `put torch`, with the
  destination AND the other 2 objects dropped → **"Ran 1 of 3 actions"** + a disambiguation sub-prompt.
  Identical to F16. **The disambiguation rendered "torch" as "Torso": "Was willst du mit dem Torso
  tun?"** (and it re-logged the F19 put-template miss in the Drafty Room). Cleared the sub-prompt by
  answering the English container word `cage`. Workaround confirmed: **case/put ONE object at a time**.

### F31 [OUTPUT] cosmetic — a dropped-but-LIT lamp shows "(batteriebetrieben)"
- After dropping the lit lantern in the Timber Room (to crawl), the floor listing read "Eine
  Messinglaterne (batteriebetrieben)" even though it was ON and lighting the room (`schalte die Lampe
  an` → "Es ist bereits an."). The "(leuchtet)" vs "(batteriebetrieben)" descriptor doesn't reflect
  the lit state in the floor listing — mildly misleading. (Torch always shows "(leuchtet)".)

### [META/INFO] Frigid River drift is DETERMINISTIC, not probabilistic (corrects prior notes)
- From the z3 source (`1dungeon.zil`/`1actions.zil`): `I-RIVER` is a fixed per-segment timer —
  RIVER-1:4, -2:4, -3:3, **-4:2**, -5:1 turns, then drifting from RIVER-5 = death over the falls.
  `warte`/wait advances several turns but **breaks at the first drift** (≈1 segment per `warte`);
  `schau`/look = exactly 1 turn (clean single-step). So the river is fully controllable & deathless:
  approach RIVER-4 one step at a time, then at RIVER-4 (the buoy) `nimm die Boje` + `geh nach Osten`
  (2-turn window) → Sandy Beach, **never touching RIVER-5**. (Prior es/de notes called the drift
  "probabilistic" — it is a deterministic timer.) Manual "down" is blocked on the river (boat only
  obeys east/west/land); the auto-drift is the only way downstream.

### [META] endgame restart prompt (matches the Spanish es-4 note)
- The final line "(Tippe RESTART, RESTORE oder QUIT):" keeps the command tokens **English** while the
  question above it is German ("Möchtest du das Spiel von vorne beginnen…?"). No miss logged → it's in
  the corpus as authored (intentional, parser keywords). Flag only if a fully-localized restart prompt
  is desired. Identical to the es endgame finding.

### Confirmed-GOOD (Session 3) — German driving correctly through the hardest areas
- **Coal mine = ~20 NEW scenes, ALL output-corpus-clean** (zero new room misses): Höhle/Spiegelraum/
  Kalter Gang/Rutschenraum/Mineneingang/Quietschraum/Fledermausraum/Schachtraum/Stinkraum/Gasraum/
  Kohlenmine×4/Oberes+Unteres Leiterende/Sackgasse/Balkenraum/Zugiger Raum/Maschinenraum, plus
  Reservoir Süd/Reservoir/Reservoir Nord/Atlantis-Raum. All `geh nach <dir>` compounds (incl. all
  diagonals + oben/unten) deterministic.
- **Coal-mine puzzle verbs all clean:** `lege X in den Korb`→put in cage, `senke den Korb`→lower cage,
  `öffne/schließe die Maschine`→open/close machine, **`drehe den Schalter mit dem Schraubenzieher`→
  turn switch with screwdriver**, full coal→diamond machine sequence. The LIGHT-SHAFT score bonus
  (+13 for bringing light into the Drafty Room) fired correctly.
- **River/cave verbs clean:** `blase das Plastik mit der Pumpe auf`→inflate valve with pump (boat
  inflates), `nimm die Boje`→take buoy, `öffne die Boje`→open buoy (emerald appears), `grabe den Sand
  mit der Schaufel`→dig sand with shovel (4 digs, scarab on #4), `warte`→wait. The Bat Room garlic
  protection worked ("Vampirfledermaus … sich die Nase zuhält").
- **Nouns OK:** Dreizack→trident, Jadefigur→figurine, Armband→bracelet, Kohle→coal, Diamant→diamond,
  Smaragd→emerald, Skarabäus→scarab, Boje→buoy, Schaufel→shovel, Luftpumpe→pump, Maschine→machine,
  Schalter→switch, Korb→cage, Karte→parchment/map.
- **Conjoined takes/drops scale:** 3-object takes, a 4-object drop (`lass die Boje, die Schaufel, den
  Knoblauch und die Lampe fallen`), 5-object takes — all distribute the verb reliably.
- **⭐ ENDGAME VERIFIED CLEAN in German (the least-tested scene, now confirmed like es-4):** the
  whisper ("Eine fast unhörbare Stimme flüstert dir ins Ohr: „Sieh dir deine Schätze an, um das letzte
  Geheimnis zu finden""), the **map** in the case (`untersuche die Vitrine` → "ein uraltes Pergament…
  eine Karte"), the **map text** ("…ein Pfad, der nach Südwesten führt, ist mit „Zum Steinhügelgrab"
  gekennzeichnet"), **West of House** secret path ("Ein geheimer Pfad führt südwestlich in den Wald"),
  **Steinhügelgrab** ("mächtiges Hügelgrab aus Stein… riesige steinerne Tür"), and the **full victory
  text** inside (door closing, cave+bridge, the floating sign's complete congratulation "…habt den
  ersten Teil der ZORK-Trilogie gemeistert…", sequel plug "ZORK II: Der Zauberer von Frobozz" / "ZORK
  III: Der Kerkermeister", score "Dein Punktestand ist 350 (von insgesamt 350 Punkten), in 486 Zügen",
  rank "den Rang eines Meisterabenteurers"). **Zero new misses across the entire endgame.**

---

## DEBUG SESSION (2026-06-16) — fixes applied

Systematic-debugging pass over the findings above. Each fix is root-caused and
pinned by a regression test (`src/llm/lexicon/parse.de-uat.test.ts` for input,
`src/llm/inputTranslate.test.ts` for split/prompt detection). Full suite green
(894 tests), typecheck + lint clean.

### FIXED
- **F12, F20, F22, F24, F28** — missing noun surface forms in `de.zork1.ts`.
  The words the game itself prints (`lederbeutel`, `messingkugel`/`kugel`,
  `kristalldreizack`, bare `topf`, accusative `diamanten`) had no deterministic
  map, so they fell to the LLM and mis-resolved (incl. the "destination → valve"
  oddity in F22/F28, which was just the *object* missing → whole-clause LLM).
- **F7 (death-trap), F5, F25** — verbs in `de.core.ts`. `lösche/puste/blase …
  aus` now → `extinguish` (was a trailing-`aus` parse break → LLM → `burn`, the
  opposite). `klettere/steige hinunter` → `down` (the bare directional; `climb
  down` is verbs1 and would miss the arity gate). `starte`/`fahr(e) los` →
  `launch` (the river was otherwise un-launchable without the English keyword).
- **F15, F4** — `quantifiersAll: ['alles','alle']` (was absent → `nimm alles`
  fell to the LLM → "large bag"); doubled connector `und dann` now absorbed as
  one clause separator (also fixes `and then` / `et puis`).
- **F2 (+ partial F1)** — at the restart/quit prompt `y` → `look`: the prompt
  was not detected, so the reply was translated. Added detection to
  isConfirmationPrompt / isDisambiguationPrompt / isOrphanPrompt so the player's
  answer passes raw. (F1's English re-prompt is cosmetic, untouched.)
  - **CORRECTION (2026-06-16):** this entry originally claimed "the detectors run
    on the LOCALIZED display text … added German patterns." That diagnosis was
    WRONG. The detectors read `recentOutput`, which is the **English** VM source
    (the output-translation overlay is display-only and never writes back into the
    ViewState the input layer reads — proof:
    `useOutputTranslation.test.tsx`). So F2 was actually fixed by the **English**
    `(Y is affirmative)` clause; the German/FR/ES detection patterns were dead
    code and have been removed. The yes/no key IS localized for DISPLAY (J/O/S) and
    the player's typed `j`/`ja` is mapped to `y` by `confirmationReply` — that part
    operates on input, not on `recentOutput`, and is correct.

### FIXED — round 2 (player-experience pushback)
Ovid pushed back: "product decision" is not a reason to leave a behavior that
hurts the player. Four parked items were player-facing failures on natural
commands and are now fixed (this rule is now in CLAUDE.md):
- **F16 / F30 [MAJOR]** — conjoined PUT + shared container (`lege A und B in die
  Vitrine`) dropped the destination on the first conjunct → orphan → "Ran 1 of
  N", and the orphan broke the next command. New `distributePrepTail` (after
  `fillElidedVerbs`) appends the last clause's trailing `<prep> <indirect>` to the
  run of preceding same-verb conjuncts; same-verb guard keeps real two-command
  lines intact. Fixes fr/es too (the old F-S test pinned the bug; updated).
- **F3** — `lies den Zettel` (the FIRST natural action at the mailbox) failed;
  `zettel` moved from the (absent) owner's manual to the leaflet.
- **F26** — `steig aus dem Boot` now → `exit` (verb-only AND verbs1; was
  `disembark`, verbs1-only) via the particle + a `steig aus` idiom.
- **F27** — bare `hebe den Korb` → `raise` (symmetric with `senke`→lower).

### RESOLVED — F13 is WORKING AS INTENDED (Ovid's final call)
- **F13** — a compound STOPS after a clause fails ("Ran N of M actions"). This is
  correct and intentional. Ovid's reasoning: if an earlier clause fails, running
  the rest acts in a context the player never intended ("I didn't go north, and
  now I'm moving in a direction I didn't mean to") — worse than losing the tail.
  So a HARD in-game failure (unknown noun, absence, refusal) stops the sequence;
  the truncation is transparent and recoverable (retype the rest). SOFT no-ops
  ("It is already open.") do NOT stop (the intent is already satisfied — F-G).
  Interactive PROMPTS also stop. (A brief skip-and-continue experiment was tried
  and reverted per this call.)

### STILL OPEN — flagged, NOT silently deferred
- **F8, F11, F19, F29 [output corpus, low player-harm]** — F8 wrong number
  agreement ("Hier ist Kerzen" → "sind"; the `{obj.indef}` floor template carries
  no number). F11 quiet Loud Room desc, F19 put-orphan template, F29 Frobozz boat
  label ("BOOT" mis-rendered "Bahn") = missing German corpus entries → LLM
  fallbacks. Player impact: off-golden-path flavor text only — visibly imperfect
  German, never blocking. Real quality dings worth a content pass; gated by the
  walkthrough-coverage test. (F19 also unblocks fully-reliable German orphan
  detection.) Flagging, not hiding: these are low-harm but not zero.
- **Cosmetic (negligible player-harm)** — F6 (Buch→page, harmless), F17 (genitive
  "deines Messers"), F18/F23 (treasures with multiple display names), F31
  (lit-lamp descriptor), F1 (English restart re-prompt). F10/F14/F21/F9 =
  confirmed-GOOD, no action.

### Progress log (Session 3, FINAL)
- **Turn 486, Score 350/350, deathless. Rank: Meisterabenteurer (Master Adventurer). GAME WON.**
  Cased all 19. `loquorMisses()` = 4 (F11 quiet Loud Room + F19 put-template ×2 + F29 boat label).
  Net new this session: ONE output gap (F29 boat label) + several INPUT mis-maps (F24-F28, F30) in the
  coal-mine/river verbs, all with passthrough workarounds. German is **completable end-to-end** with
  the documented workarounds; the only true blockers-without-passthrough are the puzzle-critical verbs
  (F25 launch, plus the older bauble/canary cross-language items).
