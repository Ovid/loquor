# Georgian (ქართული) Zork I translation glossary — working notes

> Living reference for the Georgian output-translation corpus (`src/translate/corpus/zork1.ka.*`).
> **All choices are drafts pending native review (the Tbilisi loop, spec §8).** This file also
> serves the native reviewers: it makes terminology consistency auditable. Batch authors MUST read
> this before authoring and MUST extend it when they fix a recurring term or a new room name.

## Hard rules (consistency)

- **No capitalization, ever.** Mkhedruli is unicameral. All values lowercase.
- **In-game register = INFORMAL second person (შენ).** Zork addresses the player intimately
  ("you are in…", "you can't see…"). Use the informal `შენ` verb forms (ხედავ, გაქვს, ხარ, etc.)
  throughout **in-game text**. Do NOT use formal `თქვენ` forms (ხედავთ, გსურთ…) in game text — even
  system prompts like "(Type RESTART…)" are in-game and stay informal.
  - **Exception (already done, do not change):** the _landing/UI chrome_ (`src/ui/landingStrings.ts`,
    prefs/modal copy) uses FORMAL `თქვენ` — that is the app UI talking to the user, a deliberate
    register split from the in-game narrator. Only GAME TEXT (the corpus) is informal.
- **Numerals stay Arabic** (12, 7…). Georgian uses Arabic numerals.
- **Punctuation** mirrors the English line's final mark (. ! ? :). Use Latin punctuation.
- **Brand tokens stay Latin:** `ZORK`, `RESTART`, `RESTORE`, `QUIT`, `SAVE`, `FROBOZZ`/`GUE` in
  acronyms — keep recognizable. Translate descriptive titles around them.

## Object terminology

The object glossary is `src/translate/corpus/zork1.ka.objects.ts` (the `indef`/citation forms).
**Always reuse those exact words** for the same object in prose. Key ones:
sword → მახვილი · lamp/lantern → ფარანი · torch → ჩირაღდანი · troll → ტროლი · thief → ქურდი ·
cyclops → ციკლოპი · grue → გრუ · knife → დანა · axe → ცული · egg → კვერცხი · canary → კანარა ·
boat → ნავი · door → კარი · window → ფანჯარა · wall → კედელი · sack → ტომარა · button → ღილაკი.
(If a prose word for an object differs from the objects-table citation form, prefer the table form.)

## Proper nouns / titles (CANONICAL — use exactly these)

- ZORK → `ZORK` (Latin, brand)
- The Great Underground Empire → `დიდი მიწისქვეშა იმპერია`
- ZORK II: The Wizard of Frobozz → `ZORK II: ფრობოზის ჯადოქარი`
- ZORK III: The Dungeon Master → `ZORK III: დილეგის მბრძანებელი`
  - **"Dungeon Master" (the title/figure) = `დილეგის მბრძანებელი`** everywhere. (Earlier drafts wrongly
    used "ხავერდის"/velvet and "ციხესიმაგრის"/fortress — those are FIXED to `დილეგის მბრძანებელი`.)
- "Master Adventurer" (rank) → `ოსტატი თავგადასავლების მაძიებელი`

## Place / room names (extend as you author room titles — keep ONE rendering each)

Author room TITLES and the in-prose references to the same place identically. Seed entries:

- West of House → `სახლის დასავლეთით`
- North of House → `სახლის ჩრდილოეთით` · South of House → `სახლის სამხრეთით` · Behind House → `სახლის უკან`
- Forest Path → `ტყის ბილიკი` · Up a Tree → `ხეზე ასული` · Forest → `ტყე` · Clearing → `მინდორი`
- Kitchen → `სამზარეულო`
- Living Room → `მისაღები ოთახი`
- Attic → `სხვენი`
- Cellar → `სარდაფი`
- The Troll Room → `ტროლის ოთახი` · Maze → `ლაბირინთი` · Cyclops Room → `ციკლოპის ოთახი` · Treasure Room → `საგანძურის ოთახი`
- Strange Passage → `უცნაური დერეფანი`
- East of Chasm → `უფსკრულის აღმოსავლეთით` · Gallery → `გალერეა`
- East-West Passage → `აღმოსავლეთ-დასავლეთის დერეფანი`
- Round Room → `მრგვალი ოთახი`
- North-South Passage → `ჩრდილოეთ-სამხრეთის დერეფანი`
- Deep Canyon → `ღრმა კანიონი` (canyon = `კანიონი` everywhere; chasm = `უფსკრული`)
- Reservoir South → `წყალსაცავის სამხრეთი` · Reservoir → `წყალსაცავი` · Reservoir North → `წყალსაცავის ჩრდილოეთი`
- Dam → `კაშხალი` · Dam Lobby → `კაშხლის ფოიე` · Maintenance Room → `სარემონტო ოთახი` · Dam Base → `კაშხლის ძირი`
  - "Flood Control Dam #3" (full title in prose) → `წყალდიდობის მაკონტროლებელი კაშხალი #3`
- Engravings Cave → `მოჩუქურთმებათა გამოქვაბული` · Dome Room → `გუმბათის ოთახი` · Torch Room → `ჩირაღდნის ოთახი`
- Temple → `ტაძარი` · Altar → `სამსხვერპლო` · Cave → `გამოქვაბული`
- Entrance to Hades → `ჯოჯოხეთის შესასვლელი` · Land of the Dead → `მკვდრების სამყარო`
- Mirror Room → `სარკის ოთახი` · Cold Passage → `ცივი დერეფანი` · Slide Room → `ჩასაცურავის ოთახი`
- Loud Room → `ხმაურიანი ოთახი` · Atlantis Room → `ატლანტიდის ოთახი` · Narrow Passage → `ვიწრო დერეფანი`
- Mine Entrance → `მაღაროს შესასვლელი` · Squeaky Room → `ჭრიალა ოთახი` · Bat Room → `ღამურის ოთახი`
- Shaft Room → `ჭაბურღილის ოთახი` · Smelly Room → `სუნიანი ოთახი` · Gas Room → `გაზის ოთახი`
- Coal Mine → `ნახშირის მაღარო` · Ladder Top → `კიბის თავი` · Ladder Bottom → `კიბის ძირი` · Dead End → `ჩიხი`
- Timber Room → `ძელების ოთახი` · Drafty Room → `ნიავიანი ოთახი` · Machine Room → `მანქანის ოთახი`
- Egyptian Room → `ეგვიპტური ოთახი`
- Frigid River → `მდინარე ფრიჯიდი` (river = `მდინარე`); "in the magic boat" → `ჯადოსნურ ნავში`
- Sandy Beach → `ქვიშიანი სანაპირო` · Sandy Cave → `ქვიშიანი გამოქვაბული` · Shore → `ნაპირი`
- Aragain Falls → `არაგეინის ჩანჩქერი` · On the Rainbow → `ცისარტყელაზე` · End of Rainbow → `ცისარტყელის ბოლო`
- Canyon Bottom → `კანიონის ფსკერი` · Rocky Ledge → `კლდოვანი შვერილი` · Canyon View → `კანიონის ხედი`
- Stone Barrow → `ქვის ყორღანი` · Inside the Barrow → `ყორღანის შიგნით` (barrow = `ყორღანი`, matches objects table)
- Word picks settled this batch: White Cliffs → `თეთრი კლდეები` · railing → `მოაჯირი` · dome → `გუმბათი` ·
  pedestal → `კვარცხლბეკი` · gothic lettering → `გოთური წარწერები` · "boarded (up)" (windows/door) → `ფიცრებითაა ამოჭედილი`.
- Strings-batch (off-path) room names: Damp Cave → `ნესტიანი გამოქვაბული` · Stream View → `ნაკადის ხედი` ·
  Stream → `ნაკადი` (stream/brook = `ნაკადი`) · Twisting Passage → `კლაკნილი გასასვლელი` ·
  Winding Passage → `გრეხილი გასასვლელი` · White Cliffs Beach → `თეთრი კლდეების სანაპირო` ·
  Grating Room → `ცხაურის ოთახი` · Studio → `სახელოსნო` · Chasm → `უფსკრული` (matches glossary chasm pick).
- Strings-batch recurring picks: "Land of the Living Dead" → `ცოცხალ-მკვდრების სამყარო` (distinct from
  "Land of the Dead" = `მკვდრების სამყარო`) · rank → `წოდება` (Wizard `ჯადოქარი` · Master `ოსტატი` ·
  Adventurer `თავგადასავლების მაძიებელი` · Beginner `ახალბედა` · Novice `დამწყები` · Amateur `მოყვარული`) ·
  shaft (mine) → `ჭაბურღილი` · stiletto → `სტილეტი` (objects table) · "Dam" / "dungeon" in prose:
  dungeon → `დილეგი` (matches Dungeon Master `დილეგის მბრძანებელი`).
- Strings-batch (Task 7) recurring picks: "ancient Zorkers" (the people) → `ძველი ზორკელები`
  (singular `ზორკელი`; distinct from the brand ZORK and from `ზორკმიდი`/zorkmid) ·
  machete → `მაჩეტე` · "Santa Claus" → `თოვლის ბაბუა` · "Hello sailor" (the password phrase) →
  `გამარჯობა, მეზღვაურო` · "magic carpet" → `ჯადოსნური ხალიჩა` · cleft/crack → `ნაპრალი`
  (matches objects table crack) · channel (river) → `კალაპოტი` · landing area/spot (boat) →
  `სადგომი` / `გადმოსასვლელი ადგილი`.
- Strings-batch (Task 7, combat/death/dam) recurring picks: "Lord Dimwit Flathead the Excessive" →
  `ლორდი დიმვიტ ფლეტჰედ ზედმეტი` (proper name transliterated; epithet "the Excessive" → `ზედმეტი`) ·
  stiletto → `სტილეტი` (objects table) · "blade" (of an axe/stiletto) → `პირი` · "the flat of the
  blade/axe" → `პირის ბრტყელი მხარე` · "guardian of the dungeon" → `დილეგის მცველი` (dungeon =
  `დილეგი`, matches Dungeon Master) · "canvas" (worthless painting backing) → `ტილო` · "colonial
  house" → `კოლონიური სტილის სახლი` · "sluice gates" → `საფურვებლები` (matches earlier dam batch) ·
  "knocks the wind out of you" → `სუნთქვას შეგიკრავს` · "knocks you out / unconscious" →
  `გონებას გაკარგვინებს` / `უგონო`.
- Strings-batch (Task 7, off-path/parser/death batch) recurring picks: "grue" → `გრუ` (objects
  table) · "zorkmid" → `ზორკმიდი` (objects table) · "FROBOZZ Corporation" → `FROBOZZ-ის კორპორაცია`
  (brand FROBOZZ stays Latin) · "dungeon" (in prose) → `დილეგი` (matches Dungeon Master) ·
  "sailor" → `მეზღვაური` (objects table) · "grating" → `ცხაური` (objects table) ·
  "verbosity / brief / superbrief / verbose" (transcript modes) → `სიტყვაუხვობა` / `მოკლე` /
  `უმოკლესი` / `მაქსიმალური სიტყვაუხვობა` · "pines / hemlocks" → `ფიჭვები` / `სოჭები` ·
  "noun / verb" (parser-error terms) → `არსებითი სახელი` / `ზმნა` · "OOPS" (the command) stays
  Latin · the Y/J affirmative key → `Y` (we keep the game's literal `Y`, not a localized letter,
  since the engine reads the keypress) · register: "(Y is affirmative)" prompts kept INFORMAL
  (`გსურს…`). · DELIBERATE-TYPO LINE: the English "That doesn't make sends." is itself a typo for
  "sense" — rendered with a matching Georgian typo `ამას ასრი არა აქვს.` (`ასრი` for `აზრი`),
  mirroring DE's "Versinn"; FLAG FOR NATIVE REVIEW (confirm the typo reads as intended).
- Strings-batch (Task 7, parser/forest/dam/cyclops batch) recurring picks: "grue" → `გრუ`
  (objects table) · "grating" → `ცხაური` (objects table; the maze-floor grate) · "All-Purpose
  Gunk" → `უნივერსალური წებო` (the dam-leak glue; "gunk" elsewhere also `წებო`) · "Frobozz Magic
  Gunk Company" → `FROBOZZ-ის ჯადოსნური წებოს კომპანია` (brand FROBOZZ stays Latin) · "lubricant" →
  `საპოხი მასალა` · "sluice gates" → `საფურვებლები` (matches earlier dam batch) · "bolt" (control
  panel) → `ხრახნი` (objects table) · "Land of the Living Dead" → `ცოცხალ-მკვდრების სამყარო`
  (matches earlier strings batch) · "reservoir" → `წყალსაცავი` (room glossary) · "stream" → `ნაკადი`
  · "It's greek to you" idiom → `შენთვის ეს ჩინური ენაა` (Georgian idiom: unintelligible = Chinese,
  not Greek) — FLAG FOR NATIVE REVIEW · "skull-and-crossbones lock" → `თავის ქალისა და ჯვარედინი
ძვლების საკეტი` · "the little Dutch boy" (the dyke-finger allusion) → `პატარა ჰოლანდიელი ბიჭი`
  (kept literal) — FLAG FOR NATIVE REVIEW (cultural allusion may not land in Georgian) · "have an
  axe to grind" pun (troll keeps his axe) → rendered literally `შენთან ცული აქვს გასასწორებელი`,
  losing the EN idiom — FLAG FOR NATIVE REVIEW.
- Strings-batch (Task 7, FINAL FR-key delta — cyclops/thief/troll combat, boat/egg/rope, lights,
  deaths) recurring picks: "cyclops" → `ციკლოპი` · "thief"/"robber" → `ქურდი`/`ყაჩაღი` (objects
  table thief = `ქურდი`; "robber" rendered `ყაჩაღი` for variety, matches earlier thief batch) ·
  "stiletto" → `სტილეტი` (objects table) · "blade" → `პირი` · "haft/butt of stiletto" → `ტარი` ·
  "large bag" → `დიდი ტომარა` (objects table) · "booty/loot" → `ნადავლი` · "torch" → `ჩირაღდანი`
  (objects table) · "match(es)" → `ასანთი` · "candle(s)" → `სანთელი` · "matchbook" → `ასანთის
კოლოფი` (objects table) · "flame" → `ალი` · "lamp" → `ფარანი` (objects table) · "boat" → `ნავი`
  (objects table; "deflate" → `ჰაერის გაშვება`/`იშვება`, "inflate" → `გაბერვა`) · "buoy" → `ბაკანი`
  (objects table red buoy) · "egg" → `კვერცხი` (objects table) · "canary" → `კანარა` (objects
  table) · "nest" → `ბუდე` · "rope" → `თოკი` (objects table) · "railing" → `მოაჯირი` · "cliff" →
  `კლდე` (objects table) · "slag" → `წიდა` (matches objects-table vitreous slag) · "sceptre" →
  `სკიპტრა` (objects table) · "rainbow" → `ცისარტყელა` (objects table) · "chain" → `ჯაჭვი` ·
  "basket" → `კალათა` (objects table) · "shaft" (mine) → `ჭაბურღილი` (matches earlier batch) ·
  "Land of the Living Dead" → `ცოცხალ-მკვდრების სამყარო` (matches earlier batch) · "coal gas" →
  `ნახშირის გაზი` · "score" → `ანგარიში` · death banner "\***\* You have died \*\***" → `**** დაიღუპე
****` (asterisks/spacing mirrored) · "** BOOOOOOOOOOOM **" → `** ბუუუუუუუუუუმ **` (onomatopoeia
  transliterated, asterisks mirrored) · "Gulp!" (cannibalism death) → `გულქ!` — FLAG FOR NATIVE
  REVIEW (onomatopoeia) · "lean and hungry" (thief, Julius Caesar allusion) → `გამხდარი და მშიერი`
  (kept literal) — FLAG FOR NATIVE REVIEW (Shakespeare allusion may not land) · "Doing unto others
  before..." (golden-rule inversion) → `სხვებს დააწიე, სანამ ისინი...` — FLAG FOR NATIVE REVIEW.

## Recurring sentence frames (keep these stems consistent)

- "You are in X." → `X-ში ხარ.` / "You are in the X." → `X-ში ხარ.` (informal "ხარ" = you are)
- "There is a X here." → `აქ X არის.`
- "A passage leads to the <dir>." → `დერეფანი <dir>-ისკენ მიდის.`
- Cardinal directions: north → ჩრდილოეთი · south → სამხრეთი · east → აღმოსავლეთი · west → დასავლეთი ·
  up → ზემოთ · down → ქვემოთ · (and the diagonal combinations).

## Open questions for native review

- "grue" → `გრუ` (transliteration) — confirm.
- Register of system prompts (RESTART/RESTORE/QUIT line) — informal chosen; confirm acceptable.
- "Dungeon Master" rendering `დილეგის მბრძანებელი` — confirm idiom.
- Many room-name and flavor renderings — full naturalness pass needed.
