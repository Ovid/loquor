// Zork I × Georgian full-line table (spec §2, §4). KEYS are normalized English
// lines BYTE-IDENTICAL to zork1.fr.strings.ts; only the VALUES are Georgian
// (Mkhedruli). NO capitalization (unicameral script). Authored from the English
// source line. Per spec §4 this table is intentionally LARGE: case-needing lines
// are pinned here as full strings instead of templated, to keep object case
// forms minimal.
export const ZORK1_KA_STRINGS: Record<string, string> = {
  // ── Banner block (printed at boot). Legal/serial lines stay near-verbatim. ──
  'ZORK I: The Great Underground Empire': 'ZORK I: დიდი მიწისქვეშა იმპერია',
  'Infocom interactive fiction - a fantasy story':
    'infocom-ის ინტერაქტიული მხატვრული ნაწარმოები - ფანტასტიკური ამბავი',
  'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.':
    'საავტორო უფლება (c) 1981, 1982, 1983, 1984, 1985, 1986 infocom, inc. ყველა უფლება დაცულია.',
  'ZORK is a registered trademark of Infocom, Inc.':
    'ZORK არის infocom, inc.-ის რეგისტრირებული სავაჭრო ნიშანი.',
  'Release 119 / Serial number 880429': 'გამოშვება 119 / სერიული ნომერი 880429',

  // ── Common one-word/stock responses ────────────────────────────────────
  'Taken.': 'აღებულია.',
  '(Taken)': '(აღებულია)',
  'Dropped.': 'დაგდებულია.',
  'Opened.': 'გაღებულია.',
  'Closed.': 'დახურულია.',
  'Done.': 'შესრულდა.',
  'Click.': 'წკაპ.',
  'You are on your own feet again.': 'ისევ ფეხზე დგახარ.',
  '(magic boat)': '(ჯადოსნური ნავი)',
  'Your collection of treasures consists of:':
    'შენი განძების კოლექცია შედგება შემდეგისგან:',

  // ── Combat — sword glow, troll fight ───────────────────────────────────
  'Your sword is glowing with a faint blue glow.':
    'შენი მახვილი ბჟუტავს სუსტი ლურჯი შუქით.',
  'Your sword has begun to glow very brightly.':
    'შენმა მახვილმა ძალიან კაშკაშად ანათება დაიწყო.',
  'Your sword is no longer glowing.': 'შენი მახვილი აღარ ანათებს.',
  'A nasty-looking troll, brandishing a bloody axe, blocks all passages out of the room.':
    'საზიზღარი იერსახის ტროლი, სისხლიანი ცულის ქნევით, ოთახიდან ყველა გასასვლელს უღობავს.',
  'Clang! Crash! The troll parries.': 'წკრიალ! ჩახ! ტროლი დარტყმას იგერიებს.',
  "The troll's mighty blow drops you to your knees.":
    'ტროლის ძლიერი დარტყმა მუხლებზე დაგჩოქებს.',
  'You are still recovering from that last blow, so your attack is ineffective.':
    'ჯერ კიდევ ბოლო დარტყმისგან ხარ გამოუმჯობარებელი, ამიტომ შენი შეტევა უშედეგოა.',
  "The troll's axe barely misses your ear.":
    'ტროლის ცული ლამის შენს ყურს გადააცდა.',
  'You charge, but the troll jumps nimbly aside.':
    'შენ მიიწევ, მაგრამ ტროლი მარდად გადახტება გვერდზე.',
  'The troll swings his axe, but it misses.':
    'ტროლი თავის ცულს ააქნევს, მაგრამ ააცდენს.',
  "The troll's weapon is knocked to the floor, leaving him unarmed.":
    'ტროლის იარაღი იატაკზე ვარდება და ის უიარაღოდ რჩება.',
  'The troll, disarmed, cowers in terror, pleading for his life in the guttural tongue of the trolls.':
    'უიარაღო ტროლი ძრწოლისგან იკუნტება და სიცოცხლეს ევედრება ტროლების ხორხისმიერ ენაზე.',
  'The unarmed troll cannot defend himself: He dies.':
    'უიარაღო ტროლი თავს ვერ იცავს: ის კვდება.',
  'Almost as soon as the troll breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.':
    'როგორც კი ტროლი ბოლო სუნთქვას ამოუშვებს, ბოროტი შავი ნისლის ღრუბელი მას ეფარება და როცა ნისლი იშლება, გვამი გამქრალია.',

  // ── The thief ──────────────────────────────────────────────────────────
  'Someone carrying a large bag is casually leaning against one of the walls here. He does not speak, but it is clear from his aspect that the bag will be taken only over his dead body.':
    'ვიღაც, დიდი ტომრის მტარებელი, უდარდელად არის ერთ-ერთ კედელზე მიყრდნობილი. ის არ ლაპარაკობს, მაგრამ მისი იერიდან ცხადია, რომ ეს ტომარა მხოლოდ მისი გვამის გადალახვით თუ წაერთმევა.',
  'There is a suspicious-looking individual, holding a large bag, leaning against one wall. He is armed with a deadly stiletto.':
    'საეჭვო იერსახის ვინმე, დიდი ტომრის ხელში მჭერი, ერთ კედელზეა მიყრდნობილი. ის მომაკვდინებელი სტილეტითაა შეიარაღებული.',
  "You hear a scream of anguish as you violate the robber's hideaway. Using passages unknown to you, he rushes to its defense.":
    'ტანჯვის კივილს გაიგონებ, როცა ყაჩაღის ბუნაგს შელახავ. შენთვის უცნობი გასასვლელებით ის მის დასაცავად მოიჭრება.',
  'The thief gestures mysteriously, and the treasures in the room suddenly vanish.':
    'ქურდი იდუმალ ჟესტს გააკეთებს და ოთახში არსებული განძები უეცრად ქრება.',
  'The thief is taken aback by your unexpected generosity, but accepts the jewel-encrusted egg and stops to admire its beauty.':
    'ქურდი დაიბნევა შენი მოულოდნელი გულუხვობით, მაგრამ თვლებით მოოჭვილ კვერცხს იღებს და მის სილამაზეს მოსაჯადოებლად შეჩერდება.',
  'The stiletto flashes faster than you can follow, and blood wells from your leg.':
    'სტილეტი იმაზე სწრაფად ელვარებს, ვიდრე თვალით მიჰყვები, და სისხლი გადმოგდის ფეხიდან.',
  'The thief is disarmed by a subtle feint past his guard.':
    'ქურდი უიარაღოა მისი თავდაცვის ნატიფი მოტყუებით.',
  'The robber, somewhat surprised at this turn of events, nimbly retrieves his stiletto.':
    'ყაჩაღი, მოვლენების ამ შემობრუნებით გაკვირვებული, მარდად აიღებს თავის სტილეტს.',
  'The quickness of your thrust knocks the thief back, stunned.':
    'შენი დარტყმის სისწრაფე ქურდს უკან, გონდაკარგულს ისვრის.',
  'The thief slowly regains his feet.': 'ქურდი ნელ-ნელა ფეხზე დგება.',
  'A quick stroke, but the thief is on guard.':
    'სწრაფი დარტყმა, მაგრამ ქურდი ფხიზლადაა.',
  'You dodge as the thief comes in low.':
    'შენ თავს არიდებ, როცა ქურდი დაბლიდან გესხმის თავს.',
  'The thief is staggered, and drops to his knees.':
    'ქურდი ბარბაცებს და მუხლებზე ეცემა.',
  'A furious exchange, and the thief is knocked out!':
    'მძვინვარე გაცვლა-გამოცვლა, და ქურდი გონებას კარგავს!',
  'The unconscious thief cannot defend himself: He dies.':
    'უგონო ქურდი თავს ვერ იცავს: ის კვდება.',
  'Almost as soon as the thief breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.':
    'როგორც კი ქურდი ბოლო სუნთქვას ამოუშვებს, ბოროტი შავი ნისლის ღრუბელი მას ეფარება და როცა ნისლი იშლება, გვამი გამქრალია.',
  'As the thief dies, the power of his magic decreases, and his treasures reappear:':
    'როცა ქურდი კვდება, მისი ჯადოს ძალა სუსტდება და მისი განძები ხელახლა ჩნდება:',
  'The chalice is now safe to take.': 'თასის აღება ახლა უსაფრთხოა.',

  // ── The cyclops ────────────────────────────────────────────────────────
  'A cyclops, who looks prepared to eat horses (much less mere adventurers), blocks the staircase. From his state of health, and the bloodstains on the walls, you gather that he is not very friendly, though he likes people.':
    'ციკლოპი, რომელიც ცხენების შესაჭმელადაც მზადყოფნით გამოიყურება (ჩვეულებრივ თავგადასავლების მაძიებლებზე ხომ ლაპარაკიც ზედმეტია), კიბეს უღობავს. მისი ჯანმრთელობის მდგომარეობიდან და კედლებზე სისხლის ლაქებიდან ხვდები, რომ ის დიდად მეგობრული არ არის, თუმცა ხალხი ძალიან უყვარს.',
  "The cyclops, hearing the name of his father's deadly nemesis, flees the room by knocking down the wall on the east of the room.":
    'ციკლოპი, რომელიც თავისი მამის მომაკვდინებელი მტრის სახელს გაიგონებს, ოთახიდან გარბის ოთახის აღმოსავლეთ კედლის ჩამოქცევით.',

  // === COMBAT-DRAFTS (UAT-2026-06-24) BEGIN — NATIVE-REVIEW-DRAFT (ka §4 case
  //     forms; inventory in notes/georgian-combat-coverage-worklist.md). The
  //     HERO-MELEE table (the PLAYER's attacks) is villain-agnostic, so every
  //     variant renders for whichever villain you hit; combat rolls are
  //     probabilistic, so the walkthrough-coverage gate only ever captured the
  //     few variants its one recorded run rolled — the rest leaked raw English
  //     for a Georgian player (NO LLM net), confirmed in UAT-6 live troll play.
  //     These are per-villain FULL-LINE pins (ka carries one nominative citation
  //     form, so a villain in object/oblique case can't ride a {obj.indef}
  //     template — the file-header §4 rule), each mirroring its already-covered
  //     sibling with the other villain's name in the case the sentence needs.
  //     Provisional machine quality; the (alpha) marker stays. ─────────────────
  // MISSED (1actions.zil:3614-:3619)
  'A good slash, but it misses the troll by a mile.':
    'კარგი მოქნევა, მაგრამ ტროლს მთელი მილით ააცდენს.',
  'A good slash, but it misses the thief by a mile.':
    'კარგი მოქნევა, მაგრამ ქურდს მთელი მილით ააცდენს.',
  'You charge, but the thief jumps nimbly aside.':
    'შენ მიიწევ, მაგრამ ქურდი მარდად გადახტება გვერდზე.',
  'Clang! Crash! The thief parries.': 'წკრიალ! ჩახ! ქურდი დარტყმას იგერიებს.',
  'A quick stroke, but the troll is on guard.':
    'სწრაფი დარტყმა, მაგრამ ტროლი ფხიზლადაა.',
  "A good stroke, but it's too slow; the troll dodges.":
    'კარგი დარტყმა, მაგრამ მეტისმეტად ნელია; ტროლი თავს არიდებს.',
  "A good stroke, but it's too slow; the thief dodges.":
    'კარგი დარტყმა, მაგრამ მეტისმეტად ნელია; ქურდი თავს არიდებს.',
  // UNCONSCIOUS (:3622-:3625)
  'The troll is battered into unconsciousness.':
    'ტროლი სასტიკი ცემით უგონოდ ვარდება.',
  'The thief is battered into unconsciousness.':
    'ქურდი სასტიკი ცემით უგონოდ ვარდება.',
  'A furious exchange, and the troll is knocked out!':
    'მძვინვარე გაცვლა-გამოცვლა, და ტროლი გონებას კარგავს!',
  'The troll is knocked out!': 'ტროლი გონებას კარგავს!',
  'The thief is knocked out!': 'ქურდი გონებას კარგავს!',
  // KILLED (:3628-:3629)
  'The fatal blow strikes the troll square in the heart: He dies.':
    'საბედისწერო დარტყმა ტროლს პირდაპირ გულში მოხვდება: ის კვდება.',
  'The fatal blow strikes the thief square in the heart: He dies.':
    'საბედისწერო დარტყმა ქურდს პირდაპირ გულში მოხვდება: ის კვდება.',
  'The troll takes a fatal blow and slumps to the floor dead.':
    'ტროლი საბედისწერო დარტყმას იღებს და მკვდარი იატაკზე ეცემა.',
  'The thief takes a fatal blow and slumps to the floor dead.':
    'ქურდი საბედისწერო დარტყმას იღებს და მკვდარი იატაკზე ეცემა.',
  // LIGHT-WOUND (:3631-:3634)
  'The troll is struck on the arm; blood begins to trickle down.':
    'ტროლი მკლავში დაიჭრება; სისხლი ნელა ჩამოედინება.',
  'The thief is struck on the arm; blood begins to trickle down.':
    'ქურდი მკლავში დაიჭრება; სისხლი ნელა ჩამოედინება.',
  "The blow lands, making a shallow gash in the troll's arm!":
    'დარტყმა ხვდება და ტროლის მკლავზე ზედაპირულ ჭრილობას ტოვებს!',
  "The blow lands, making a shallow gash in the thief's arm!":
    'დარტყმა ხვდება და ქურდის მკლავზე ზედაპირულ ჭრილობას ტოვებს!',
  // SERIOUS-WOUND (:3636-:3637)
  'The troll receives a deep gash in his side.':
    'ტროლი გვერდში ღრმა ჭრილობას იღებს.',
  'The thief receives a deep gash in his side.':
    'ქურდი გვერდში ღრმა ჭრილობას იღებს.',
  'A savage blow on the thigh! The troll is stunned but can still fight!':
    'სასტიკი დარტყმა ბარძაყზე! ტროლი გაოგნებულია, მაგრამ ჯერ კიდევ შეუძლია ბრძოლა!',
  'A savage blow on the thigh! The thief is stunned but can still fight!':
    'სასტიკი დარტყმა ბარძაყზე! ქურდი გაოგნებულია, მაგრამ ჯერ კიდევ შეუძლია ბრძოლა!',
  // STAGGER (:3641-:3645)
  'The troll is staggered, and drops to his knees.':
    'ტროლი ბარბაცებს და მუხლებზე ეცემა.',
  "The troll is momentarily disoriented and can't fight back.":
    'ტროლი წამით იბნევა და პასუხის დაბრუნება არ შეუძლია.',
  "The thief is momentarily disoriented and can't fight back.":
    'ქურდი წამით იბნევა და პასუხის დაბრუნება არ შეუძლია.',
  'The force of your blow knocks the troll back, stunned.':
    'შენი დარტყმის ძალა ტროლს უკან, გონდაკარგულს ისვრის.',
  'The force of your blow knocks the thief back, stunned.':
    'შენი დარტყმის ძალა ქურდს უკან, გონდაკარგულს ისვრის.',
  "The troll is confused and can't fight back.":
    'ტროლი დაბნეულია და პასუხის დაბრუნება არ შეუძლია.',
  "The thief is confused and can't fight back.":
    'ქურდი დაბნეულია და პასუხის დაბრუნება არ შეუძლია.',
  'The quickness of your thrust knocks the troll back, stunned.':
    'შენი დარტყმის სისწრაფე ტროლს უკან, გონდაკარგულს ისვრის.',
  // LOSE-WEAPON (:3647-:3648)
  "The thief's weapon is knocked to the floor, leaving him unarmed.":
    'ქურდის იარაღი იატაკზე ვარდება და ის უიარაღოდ რჩება.',
  'The troll is disarmed by a subtle feint past his guard.':
    'ტროლი უიარაღოა მისი თავდაცვის ნატიფი მოტყუებით.',
  // FRAME — engine recovery / finishing blows (VILLAIN-BLOW :3419, HERO-BLOW
  // :3499-:3507). Each mirrors the already-covered other-villain sibling.
  'The troll slowly regains his feet.': 'ტროლი ნელ-ნელა ფეხზე დგება.',
  'Attacking the troll is pointless.': 'ტროლზე თავდასხმას აზრი არ აქვს.',
  'Attacking the thief is pointless.': 'ქურდზე თავდასხმას აზრი არ აქვს.',
  'The unconscious troll cannot defend himself: He dies.':
    'უგონო ტროლი თავს ვერ იცავს: ის კვდება.',
  'The unarmed thief cannot defend himself: He dies.':
    'უიარაღო ქურდი თავს ვერ იცავს: ის კვდება.',
  // === COMBAT-DRAFTS (UAT-2026-06-24) END ===

  // ── PIN LIST (full-line pins that beat agreement-blind templates) ───────
  'There is a pair of candles here (providing light).':
    'აქ ორი სანთელია (ანათებს).',
  'A pair of candles (providing light)': 'ორი სანთელი (ანათებს)',
  'There is a matchbook here (providing light).':
    'აქ ასანთის კოლოფია (ანათებს).',
  'A matchbook (providing light)': 'ასანთის კოლოფი (ანათებს)',
  'The number of ghosts has it.': 'ის მოჩვენებებს უჭირავთ.',
  "You can't see any songbird here.":
    'აქ ვერანაირ მგალობელ ფრინველს ვერ ხედავ.',
  'A quantity of water': 'გარკვეული რაოდენობის წყალი',
  // Listing entry — the canary is in the INSTRUMENTAL ("with a canary",
  // -თი), which we cannot compose onto a citation form, so this composed
  // one-content listing is pinned (the FR "A {obj}, with a {obj2}" template
  // has no Georgian analog: {obj2} would need the instrumental case).
  'A jewel-encrusted egg, with a golden clockwork canary':
    'თვლებით მოოჭვილი კვერცხი, ოქროს მექანიკური კანარათი',
  // Light-source listing tail (mirrors the candles/matchbook pins above).
  'A torch (providing light)': 'ჩირაღდანი (ანათებს)',
  // Vehicle tail — "outside the magic boat" needs the boat in the GENITIVE
  // (ნავის გარეთ), not composable onto a citation form, so it is pinned.
  'There is a shovel here. (outside the magic boat)':
    'აქ ნიჩაბია. (ჯადოსნური ნავის გარეთ)',
  // Boarding — "in the magic boat" is the LOCATIVE/postpositional ნავში
  // ("ჯადოსნურ ნავში", glossary), a suffix we cannot compose; pinned.
  'You are now in the magic boat.': 'ახლა ჯადოსნურ ნავში ხარ.',
  // Reveal-on-open — the emerald is the DATIVE object of ავლენს ("reveals",
  // ზურმუხტს), and the buoy is in the GENITIVE (ბაკანის გახსნა, "the opening
  // of the buoy"); neither case is composable, so this is pinned (mirrors the
  // "Opening the brown sack reveals…" full-line pin above).
  'Opening the red buoy reveals a large emerald.':
    'წითელი ბაკანის გახსნა დიდ ზურმუხტს ავლენს.',
  // Tie refusal — the rope is the DATIVE object of მიაბამ ("you can't tie",
  // თოკს), not composable onto a citation form; pinned. Informal register.
  "You can't tie the rope to that.": 'თოკს ამას ვერ მიაბამ.',

  // ── Darkness messages ───────────────────────────────────────────────────
  'It is pitch black.': 'უკუნ ბნელია.',
  'It is pitch black. You are likely to be eaten by a grue.':
    'უკუნ ბნელია. დიდი ალბათობით გრუ შეგჭამს.',
  'It is now pitch black.': 'ახლა უკუნ ბნელია.',
  "It's pitch black in here!": 'აქ უკუნ ბნელია!',

  // ── House & forest props/events ────────────────────────────────────────
  "Beside you on the branch is a small bird's nest.":
    'შენს გვერდით, ტოტზე, პატარა ფრინველის ბუდეა.',
  "In the bird's nest is a large egg encrusted with precious jewels, apparently scavenged by a childless songbird. The egg is covered with fine gold inlay, and ornamented in lapis lazuli and mother-of-pearl. Unlike most eggs, this one is hinged and closed with a delicate looking clasp. The egg appears extremely fragile.":
    'ფრინველის ბუდეში დიდი კვერცხია, ძვირფასი თვლებით მოოჭვილი, რომელიც, როგორც ჩანს, უშვილო მგალობელ ფრინველს მოუპარავს. კვერცხი დახვეწილი ოქროს ინკრუსტაციითაა დაფარული და ლაჟვარდითა და სადაფით მორთული. სხვა კვერცხებისგან განსხვავებით, ეს სახსარზეა და ნაზი იერსახის ბალთით იხურება. კვერცხი უაღრესად მყიფე ჩანს.',
  'You hear in the distance the chirping of a song bird.':
    'შორიდან მგალობელი ფრინველის ჭიკჭიკს გაიგონებ.',
  'With great effort, you open the window far enough to allow entry.':
    'დიდი ძალისხმევით ფანჯარას იმდენად აღებ, რომ შესვლა შესაძლებელი გახდეს.',
  'A bottle is sitting on the table.': 'მაგიდაზე ბოთლი დგას.',
  'On the table is an elongated brown sack, smelling of hot peppers.':
    'მაგიდაზე წაგრძელებული ყავისფერი ტომარაა, მწარე წიწაკის სუნით.',
  'Opening the brown sack reveals a clove of garlic, and a lunch.':
    'ყავისფერი ტომრის გახსნა ავლენს ნივრის კბილსა და სადილს.',
  // The leaflet (ფურცელი) is the DATIVE object of ავლენს ("reveals"), the
  // mailbox in the GENITIVE (ყუთის გახსნა, "the opening of the mailbox") — both
  // cases, so pinned (mirrors the buoy/sack reveals). UAT 2026-06-19: this — the
  // first command most players type — leaked English (shared with fr/de/es).
  'Opening the small mailbox reveals a leaflet.':
    'პატარა საფოსტო ყუთის გახსნა ფურცელს ავლენს.',
  'Above the trophy case hangs an elvish sword of great antiquity.':
    'ჯილდოების ვიტრინის ზემოთ ჩამოკიდებულია უძველესი ელფური მახვილი.',
  'A battery-powered brass lantern is on the trophy case.':
    'ჯილდოების ვიტრინაზე ელემენტებზე მომუშავე სპილენძის ფარანია.',
  'With a great effort, the rug is moved to one side of the room, revealing the dusty cover of a closed trap door.':
    'დიდი ძალისხმევით ხალიჩა ოთახის ერთ მხარეს იწევა და მტვრიან, დახურულ საიდუმლო ხაფანგ-კარის სახურავს ავლენს.',
  'The door reluctantly opens to reveal a rickety staircase descending into darkness.':
    'კარი უხალისოდ იღება და ბნელში ჩამავალ რყევად კიბეს ავლენს.',
  'A large coil of rope is lying in the corner.':
    'კუთხეში თოკის დიდი გორგალი დევს.',
  'On a table is a nasty-looking knife.': 'მაგიდაზე საზიზღარი იერსახის დანაა.',
  'The trap door crashes shut, and you hear someone barring it.':
    'საიდუმლო ხაფანგ-კარი ხმაურით იხურება და გაიგონებ, როგორ ურდულავს ვიღაც.',

  // ── Maze & Hades ───────────────────────────────────────────────────────
  'Beside the skeleton is a rusty knife.': 'ჩონჩხის გვერდით დაჟანგული დანაა.',
  "The deceased adventurer's useless lantern is here.":
    'გარდაცვლილი თავგადასავლების მაძიებლის უსარგებლო ფარანი აქ არის.',
  'An old leather bag, bulging with coins, is here.':
    'ძველი ტყავის ტომარა, მონეტებით სავსე, აქ არის.',
  'There is a silver chalice, intricately engraved, here.':
    'აქ ვერცხლის თასია, დახვეწილად მოჩუქურთმებული.',
  'The way through the gate is barred by evil spirits, who jeer at your attempts to pass.':
    'ჭიშკარში გასასვლელს ბოროტი სულები უღობავენ, რომლებიც შენს გავლის მცდელობებს დასცინიან.',
  'The bell suddenly becomes red hot and falls to the ground. The wraiths, as if paralyzed, stop their jeering and slowly turn to face you. On their ashen faces, the expression of a long-forgotten terror takes shape.':
    'ზარი უეცრად ცეცხლისფრად ვარვარდება და მიწაზე ვარდება. აჩრდილები, თითქოს დამბლადაცემულები, შეწყვეტენ დაცინვას და ნელ-ნელა შენკენ შემობრუნდებიან. მათ ფერმკრთალ სახეებზე დიდი ხნის დავიწყებული შიშის გამომეტყველება იკვეთება.',
  'In your confusion, the candles drop to the ground (and they are out).':
    'დაბნეულობაში სანთლები მიწაზე გივარდება (და ისინი ქრება).',
  'One of the matches starts to burn.': 'ერთ-ერთი ასანთი იწვის.',
  'The candles are lit.': 'სანთლები აანთებულია.',
  'The flames flicker wildly and appear to dance. The earth beneath your feet trembles, and your legs nearly buckle beneath you. The spirits cower at your unearthly power.':
    'ალი გააფთრებით ფართხალებს და თითქოს ცეკვავს. შენს ფეხქვეშ მიწა იძვრის და ფეხები ლამის გეკეცება. სულები შენი არამიწიერი ძალის წინაშე იკუნტებიან.',
  'The match has gone out.': 'ასანთი ჩაქრა.',
  'Each word of the prayer reverberates through the hall in a deafening confusion. As the last word fades, a voice, loud and commanding, speaks: "Begone, fiends!" A heart-stopping scream fills the cavern, and the spirits, sensing a greater power, flee through the walls.':
    'ლოცვის ყოველი სიტყვა დარბაზში ყრუ აღრევით ისმის. როცა ბოლო სიტყვა ქრება, ხმა, ხმამაღალი და მბრძანებლური, ამბობს: "გაეთრიეთ, ეშმაკებო!" გულის გამყინავი კივილი ავსებს გამოქვაბულს და სულები, უფრო დიდი ძალის შემგრძნებნი, კედლებში გარბიან.',
  'Lying in one corner of the room is a beautifully carved crystal skull. It appears to be grinning at you rather nastily.':
    'ოთახის ერთ კუთხეში ლამაზად ნაკვეთი ბროლის თავის ქალა დევს. ის თითქოს საკმაოდ ბოროტად გიღიმის.',
  'On the ground is a red hot bell.': 'მიწაზე ცეცხლისფრად გავარვარებული ზარია.',

  // ── Gallery, dam & reservoir ───────────────────────────────────────────
  'Fortunately, there is still one chance for you to be a vandal, for on the far wall is a painting of unparalleled beauty.':
    'საბედნიეროდ, კიდევ გაქვს ერთი შანსი, ვანდალი იყო, რადგან შორეულ კედელზე შეუდარებელი სილამაზის ნახატია.',
  'The sluice gates on the dam are closed. Behind the dam, there can be seen a wide reservoir. Water is pouring over the top of the now abandoned dam.':
    'კაშხალზე საფურვებლები დახურულია. კაშხლის უკან ფართო წყალსაცავი ჩანს. წყალი ახლა მიტოვებული კაშხლის თავზე გადმოედინება.',
  'There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble.':
    'აქ სამართავი დაფაა, რომელზეც დიდი ლითონის ხრახნია დამაგრებული. ხრახნის უშუალოდ ზემოთ პატარა მწვანე პლასტმასის ბუშტია.',
  'There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble which is glowing serenely.':
    'აქ სამართავი დაფაა, რომელზეც დიდი ლითონის ხრახნია დამაგრებული. ხრახნის უშუალოდ ზემოთ პატარა მწვანე პლასტმასის ბუშტია, რომელიც მშვიდად ანათებს.',
  'Some guidebooks entitled "Flood Control Dam #3" are on the reception desk.':
    'მისაღების მაგიდაზე რამდენიმე ტურისტული გზამკვლევია სათაურით "წყალდიდობის მაკონტროლებელი კაშხალი #3".',
  'There is a matchbook whose cover says "Visit Beautiful FCD#3" here.':
    'აქ ასანთის კოლოფია, რომლის ყდაზე წერია "მოინახულეთ მშვენიერი FCD#3".',
  'There is an object which looks like a tube of toothpaste here.':
    'აქ საგანია, რომელიც კბილის პასტის ტუბს ჰგავს.',
  'The sluice gates open and water pours through the dam.':
    'საფურვებლები იღება და წყალი კაშხალში გადმოედინება.',
  'There is a rumble from deep within the earth and the room shakes.':
    'მიწის სიღრმიდან გრუხუნი ისმის და ოთახი იძვრის.',
  'On the ground is a large platinum bar.': 'მიწაზე დიდი პლატინის ზოდია.',
  'The acoustics of the room change subtly.': 'ოთახის აკუსტიკა ნაზად იცვლება.',
  'Lying half buried in the mud is an old trunk, bulging with jewels.':
    'ტალახში ნახევრად ჩაფლული ძველი ზანდუკი დევს, ძვირფასეულობით სავსე.',
  'There is a slimy stairway leaving the room to the north.':
    'ოთახიდან ჩრდილოეთით ლორწოვანი კიბე გადის.',
  "On the shore lies Poseidon's own crystal trident.":
    'ნაპირზე თავად პოსეიდონის ბროლის სამკაპა დევს.',

  // ── Temple, dome & torch ───────────────────────────────────────────────
  'There are old engravings on the walls here.':
    'აქ კედლებზე ძველი მოჩუქურთმებებია.',
  'The rope drops over the side and comes within ten feet of the floor.':
    'თოკი კიდეზე ჩამოეშვება და იატაკიდან ათ ფუტამდე უახლოვდება.',
  'A piece of rope descends from the railing above, ending some five feet above your head.':
    'ზემოთ მოაჯირიდან თოკის ნაჭერი ეშვება, რომელიც შენი თავის ზემოთ დაახლოებით ხუთ ფუტში მთავრდება.',
  'Sitting on the pedestal is a flaming torch, made of ivory.':
    'კვარცხლბეკზე ანთებული ჩირაღდანი დევს, სპილოს ძვლისგან გაკეთებული.',
  'On the two ends of the altar are burning candles.':
    'სამსხვერპლოს ორ ბოლოზე ანთებული სანთლებია.',
  'On the altar is a large black book, open to page 569.':
    'სამსხვერპლოზე დიდი შავი წიგნია, 569-ე გვერდზე გადაშლილი.',
  'A gust of wind blows out your candles!':
    'ქარის დაბერვა შენს სანთლებს აქრობს!',

  // ── Coal mine, bat & machine ───────────────────────────────────────────
  'There is an exquisite jade figurine here.': 'აქ ნეფრიტის დახვეწილი ფიგურაა.',
  'In the corner of the room on the ceiling is a large vampire bat who is obviously deranged and holding his nose.':
    'ოთახის კუთხეში, ჭერზე, დიდი ვამპირი ღამურაა, რომელიც აშკარად შეშლილია და ცხვირზე ხელი უჭირავს.',
  'At the end of the chain is a basket.': 'ჯაჭვის ბოლოში კალათაა.',
  'From the chain is suspended a basket.': 'ჯაჭვზე კალათაა ჩამოკიდებული.',
  'The basket is lowered to the bottom of the shaft.':
    'კალათა ჭაბურღილის ფსკერამდე ჩაეშვა.',
  'The basket is raised to the top of the shaft.':
    'კალათა ჭაბურღილის თავამდე ავიდა.',
  'The lid opens.': 'სახურავი იღება.',
  'The lid closes.': 'სახურავი იხურება.',
  'The machine comes to life (figuratively) with a dazzling display of colored lights and bizarre noises. After a few moments, the excitement abates.':
    'მანქანა ცოცხლდება (ხატოვნად რომ ვთქვათ) ფერადი შუქებისა და უცნაური ხმების თვალისმომჭრელი ჩვენებით. რამდენიმე წამში მღელვარება ცხრება.',
  'The lid opens, revealing a huge diamond.':
    'სახურავი იღება და უზარმაზარ ბრილიანტს ავლენს.',
  'There is a brass lantern (battery-powered) here.':
    'აქ სპილენძის ფარანია (ელემენტებზე მომუშავე).',

  // ── Egypt ──────────────────────────────────────────────────────────────
  'The solid-gold coffin used for the burial of Ramses II is here.':
    'წმინდა ოქროს კუბო, რამზეს II-ის დასაკრძალად გამოყენებული, აქ არის.',
  'A sceptre, possibly that of ancient Egypt itself, is in the coffin. The sceptre is ornamented with colored enamel, and tapers to a sharp point.':
    'სკიპტრა, შესაძლოა თავად ძველი ეგვიპტისა, კუბოშია. სკიპტრა ფერადი მინანქრით არის მორთული და ბასრ წვერად ვიწროვდება.',

  // ── River, boat & beach ────────────────────────────────────────────────
  'There is a folded pile of plastic here which has a small valve attached.':
    'აქ დაკეცილი პლასტმასის გროვაა, რომელსაც პატარა სარქველი აქვს მიმაგრებული.',
  'The boat inflates and appears seaworthy.':
    'ნავი ბერდება და საზღვაოდ ვარგისი ჩანს.',
  'A tan label is lying inside the boat.':
    'ნავის შიგნით მოყვითალო ეტიკეტი დევს.',
  'The flow of the river carries you downstream.':
    'მდინარის დინება დინების ქვევით მიგაქვს.',
  'There is a red buoy here (probably a warning).':
    'აქ წითელი ბაკანია (ალბათ გაფრთხილება).',
  'The magic boat comes to a rest on the shore.':
    'ჯადოსნური ნავი ნაპირზე ჩერდება.',
  "The magic boat doesn't lead upward.": 'ჯადოსნური ნავი ზევით არ მიდის.',
  'You seem to be digging a hole here.': 'როგორც ჩანს, აქ ორმოს თხრი.',
  "The hole is getting deeper, but that's about it.":
    'ორმო უფრო ღრმავდება, მაგრამ მეტი არაფერი.',
  'You are surrounded by a wall of sand on all sides.':
    'ყველა მხრიდან ქვიშის კედელი გარშემორტყმული გაქვს.',
  'You can see a scarab here in the sand.': 'აქ, ქვიშაში, სკარაბეუსს ხედავ.',

  // ── Rainbow & endgame ──────────────────────────────────────────────────
  'A beautiful rainbow can be seen over the falls and to the west.':
    'ჩანჩქერის ზემოთ და დასავლეთით მშვენიერი ცისარტყელა ჩანს.',
  'Suddenly, the rainbow appears to become solid and, I venture, walkable (I think the giveaway was the stairs and bannister).':
    'უეცრად ცისარტყელა თითქოს მყარდება და, ვბედავ ვთქვა, გასავლელი ხდება (ვფიქრობ, ამის ნიშანი კიბე და მოაჯირი იყო).',
  'At the end of the rainbow is a pot of gold.':
    'ცისარტყელის ბოლოში ოქროს ქოთანია.',
  'The lamp appears a bit dimmer.': 'ფარანი ცოტა უფრო ბუნდოვნად ანათებს.',
  'The canary chirps, slightly off-key, an aria from a forgotten opera. From out of the greenery flies a lovely songbird. It perches on a limb just over your head and opens its beak to sing. As it does so a beautiful brass bauble drops from its mouth, bounces off the top of your head, and lands glimmering in the grass. As the canary winds down, the songbird flies away.':
    'კანარა, ოდნავ აცდენილი, დავიწყებული ოპერის არიას ჭიკჭიკებს. მწვანეულიდან მშვენიერი მგალობელი ფრინველი მოფრინდება. ის შენი თავის ზემოთ ტოტზე დაჯდება და სამღერად ნისკარტს გააღებს. ამ დროს ლამაზი სპილენძის ბურთულა ნისკარტიდან გადმოვარდება, შენს თავზე ახტება და ბალახში მოელვარე ეცემა. როცა კანარა ცხრება, მგალობელი ფრინველი მიფრინავს.',
  'An almost inaudible voice whispers in your ear, "Look to your treasures for the final secret."':
    'თითქმის გაუგონარი ხმა ყურში გჩურჩულებს: "ბოლო საიდუმლო შენს განძებში მოძებნე."',
  'The ZORK trilogy continues with "ZORK II: The Wizard of Frobozz" and is completed in "ZORK III: The Dungeon Master."':
    'ZORK-ის ტრილოგია გრძელდება ნაწარმოებით "ZORK II: ფრობოზის ჯადოქარი" და სრულდება ნაწარმოებში "ZORK III: დილეგის მბრძანებელი."',
  'This gives you the rank of Master Adventurer.':
    'ეს განიჭებს ოსტატი თავგადასავლების მაძიებლის წოდებას.',
  'Would you like to restart the game from the beginning, restore a saved game position, or end this session of the game?':
    'გსურთ თამაშის თავიდან დაწყება, შენახული თამაშის პოზიციის აღდგენა, თუ ამ თამაშის სესიის დასრულება?',
  '(Type RESTART, RESTORE, or QUIT):': '(აკრიფეთ RESTART, RESTORE, ან QUIT):',

  // ── Room TITLES (status line / look). Keep each rendering identical to its
  //    in-prose reference; recorded in the glossary. ──────────────────────────
  'West of House': 'სახლის დასავლეთით',
  'North of House': 'სახლის ჩრდილოეთით',
  'South of House': 'სახლის სამხრეთით',
  'Behind House': 'სახლის უკან',
  'Forest Path': 'ტყის ბილიკი',
  'Up a Tree': 'ხეზე ასული',
  Forest: 'ტყე',
  Clearing: 'მინდორი',
  Kitchen: 'სამზარეულო',
  'Living Room': 'მისაღები ოთახი',
  Attic: 'სხვენი',
  Cellar: 'სარდაფი',
  'The Troll Room': 'ტროლის ოთახი',
  Maze: 'ლაბირინთი',
  'Cyclops Room': 'ციკლოპის ოთახი',
  'Treasure Room': 'საგანძურის ოთახი',
  'Strange Passage': 'უცნაური დერეფანი',
  'East of Chasm': 'უფსკრულის აღმოსავლეთით',
  Gallery: 'გალერეა',
  'East-West Passage': 'აღმოსავლეთ-დასავლეთის დერეფანი',
  'Round Room': 'მრგვალი ოთახი',
  'North-South Passage': 'ჩრდილოეთ-სამხრეთის დერეფანი',
  'Deep Canyon': 'ღრმა კანიონი',
  'Reservoir South': 'წყალსაცავის სამხრეთი',
  Reservoir: 'წყალსაცავი',
  'Reservoir North': 'წყალსაცავის ჩრდილოეთი',
  Dam: 'კაშხალი',
  'Dam Lobby': 'კაშხლის ფოიე',
  'Maintenance Room': 'სარემონტო ოთახი',
  'Dam Base': 'კაშხლის ძირი',
  'Engravings Cave': 'მოჩუქურთმებათა გამოქვაბული',
  'Dome Room': 'გუმბათის ოთახი',
  'Torch Room': 'ჩირაღდნის ოთახი',
  Temple: 'ტაძარი',
  Altar: 'სამსხვერპლო',
  Cave: 'გამოქვაბული',
  'Entrance to Hades': 'ჯოჯოხეთის შესასვლელი',
  'Land of the Dead': 'მკვდრების სამყარო',
  'Mirror Room': 'სარკის ოთახი',
  'Cold Passage': 'ცივი დერეფანი',
  'Slide Room': 'ჩასაცურავის ოთახი',
  'Loud Room': 'ხმაურიანი ოთახი',
  'Atlantis Room': 'ატლანტიდის ოთახი',
  'Narrow Passage': 'ვიწრო დერეფანი',
  'Mine Entrance': 'მაღაროს შესასვლელი',
  'Squeaky Room': 'ჭრიალა ოთახი',
  'Bat Room': 'ღამურის ოთახი',
  'Shaft Room': 'ჭაბურღილის ოთახი',
  'Smelly Room': 'სუნიანი ოთახი',
  'Gas Room': 'გაზის ოთახი',
  'Coal Mine': 'ნახშირის მაღარო',
  'Ladder Top': 'კიბის თავი',
  'Ladder Bottom': 'კიბის ძირი',
  'Dead End': 'ჩიხი',
  'Timber Room': 'ძელების ოთახი',
  'Drafty Room': 'ნიავიანი ოთახი',
  'Machine Room': 'მანქანის ოთახი',
  'Egyptian Room': 'ეგვიპტური ოთახი',
  'Frigid River, in the magic boat': 'მდინარე ფრიჯიდი, ჯადოსნურ ნავში',
  'Sandy Beach, in the magic boat': 'ქვიშიანი სანაპირო, ჯადოსნურ ნავში',
  // Other rooms reachable WHILE in the boat (board point + the landing beaches),
  // composed by DESCRIBE-ROOM as "<room>, in the magic boat" (gverbs.zil:1662).
  // UAT-georgian-completion Finding 2: "Shore, in the magic boat" leaked raw
  // English off the golden path. All langs had the same gap — pinned in all four.
  'Dam Base, in the magic boat': 'კაშხლის ძირი, ჯადოსნურ ნავში',
  'White Cliffs Beach, in the magic boat': 'თეთრი კლდეების სანაპირო, ჯადოსნურ ნავში',
  'Shore, in the magic boat': 'ნაპირი, ჯადოსნურ ნავში',
  'Aragain Falls, in the magic boat': 'არაგეინის ჩანჩქერი, ჯადოსნურ ნავში',
  'Sandy Beach': 'ქვიშიანი სანაპირო',
  'Sandy Cave': 'ქვიშიანი გამოქვაბული',
  Shore: 'ნაპირი',
  'Aragain Falls': 'არაგეინის ჩანჩქერი',
  'On the Rainbow': 'ცისარტყელაზე',
  'End of Rainbow': 'ცისარტყელის ბოლო',
  'Canyon Bottom': 'კანიონის ფსკერი',
  'Rocky Ledge': 'კლდოვანი შვერილი',
  'Canyon View': 'კანიონის ხედი',
  'Stone Barrow': 'ქვის ყორღანი',
  'Inside the Barrow': 'ყორღანის შიგნით',

  // ── Room DESCRIPTIONS (look / first entry) ──────────────────────────────
  'You are standing in an open field west of a white house, with a boarded front door.':
    'ღია მინდორზე დგახარ, თეთრი სახლის დასავლეთით, რომლის შესასვლელი კარი ფიცრებითაა ამოჭედილი.',
  'You are standing in an open field west of a white house, with a boarded front door. A secret path leads southwest into the forest.':
    'ღია მინდორზე დგახარ, თეთრი სახლის დასავლეთით, რომლის შესასვლელი კარი ფიცრებითაა ამოჭედილი. საიდუმლო ბილიკი სამხრეთ-დასავლეთით, ტყისკენ მიდის.',
  'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.':
    'თეთრი სახლის ჩრდილოეთ მხარის წინ დგახარ. აქ კარი არ არის და ყველა ფანჯარა ფიცრებითაა ამოჭედილი. ჩრდილოეთით ვიწრო ბილიკი ხეებს შორის გრეხილად მიიკლაკნება.',
  'You are facing the south side of a white house. There is no door here, and all the windows are boarded.':
    'თეთრი სახლის სამხრეთ მხარის წინ დგახარ. აქ კარი არ არის და ყველა ფანჯარა ფიცრებითაა ამოჭედილი.',
  'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.':
    'თეთრი სახლის უკან ხარ. ბილიკი აღმოსავლეთით, ტყისკენ მიდის. სახლის ერთ კუთხეში პატარა ფანჯარაა, ოდნავ მოღებული.',
  'This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the edge of the path.':
    'ეს ბილიკი ბუნდოვნად განათებულ ტყეში მიიკლაკნება. ბილიკი აქ ჩრდილოეთ-სამხრეთის მიმართულებით მიდის. ბილიკის კიდეზე განსაკუთრებით დიდი ხე დგას, რამდენიმე დაბალი ტოტით.',
  'You are about 10 feet above the ground nestled among some large branches. The nearest branch above you is above your reach.':
    'მიწიდან დაახლოებით 10 ფუტის სიმაღლეზე ხარ, დიდ ტოტებს შორის გამოკიდებული. შენ ზემოთ უახლოესი ტოტი ხელმისაწვდომობის მიღმაა.',
  'This is a forest, with trees in all directions. To the east, there appears to be sunlight.':
    'ეს ტყეა, ყველა მიმართულებით ხეებით. აღმოსავლეთით, როგორც ჩანს, მზის შუქია.',
  'This is a dimly lit forest, with large trees all around.':
    'ეს ბუნდოვნად განათებული ტყეა, ირგვლივ დიდი ხეებით.',
  'You are in a small clearing in a well marked forest path that extends to the east and west.':
    'პატარა მინდორზე ხარ, კარგად მონიშნულ ტყის ბილიკზე, რომელიც აღმოსავლეთითა და დასავლეთით გადაჭიმულა.',
  'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. A dark chimney leads down and to the east is a small window which is open.':
    'თეთრი სახლის სამზარეულოში ხარ. ერთი მაგიდა, როგორც ჩანს, ცოტა ხნის წინ საჭმლის მოსამზადებლად გამოიყენებოდა. გასასვლელი დასავლეთით მიდის და ბნელი კიბე ჩანს, რომელიც ზემოთ მიდის. ბნელი საკვამური ქვემოთ მიდის, აღმოსავლეთით კი პატარა ფანჯარაა, ღია.',
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room.':
    'მისაღებ ოთახში ხარ. აღმოსავლეთით კარია, დასავლეთით უცნაური გოთური წარწერებიანი ხის კარი, რომელიც, როგორც ჩანს, ლურსმნებითაა ჩაჭედილი, ჯილდოების ვიტრინა და ოთახის შუაში დიდი აღმოსავლური ხალიჩა.',
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a rug lying beside an open trap door.':
    'მისაღებ ოთახში ხარ. აღმოსავლეთით კარია, დასავლეთით უცნაური გოთური წარწერებიანი ხის კარი, რომელიც, როგორც ჩანს, ლურსმნებითაა ჩაჭედილი, ჯილდოების ვიტრინა და ხალიჩა, ღია საიდუმლო ხაფანგ-კარის გვერდით გაშლილი.',
  // NATIVE-REVIEW-DRAFT — rug moved, trap door CLOSED, pre-cyclops (west door
  // still nailed shut). Golden-path state between `move rug` and `open trap
  // door` (UAT 2026-06-23). Composed from the two authored variants: the
  // nailed-shut prefix (oriental-rug variant) + the closed-trap-door suffix
  // (post-cyclops closed-trap variant).
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a closed trap door at your feet.':
    'მისაღებ ოთახში ხარ. აღმოსავლეთით კარია, დასავლეთით უცნაური გოთური წარწერებიანი ხის კარი, რომელიც, როგორც ჩანს, ლურსმნებითაა ჩაჭედილი, ჯილდოების ვიტრინა და ფეხებთან დახურული საიდუმლო ხაფანგ-კარი.',
  'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a rug lying beside an open trap door.':
    'მისაღებ ოთახში ხარ. აღმოსავლეთით კარია. დასავლეთით ძველ ხის კარში ციკლოპის ფორმის ხვრელია, რომლის ზემოთაც უცნაური გოთური წარწერებია, ჯილდოების ვიტრინა და ხალიჩა, ღია საიდუმლო ხაფანგ-კარის გვერდით გაშლილი.',
  'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a closed trap door at your feet.':
    'მისაღებ ოთახში ხარ. აღმოსავლეთით კარია. დასავლეთით ძველ ხის კარში ციკლოპის ფორმის ხვრელია, რომლის ზემოთაც უცნაური გოთური წარწერებია, ჯილდოების ვიტრინა და ფეხებთან დახურული საიდუმლო ხაფანგ-კარი.',
  'This is the attic. The only exit is a stairway leading down.':
    'ეს სხვენია. ერთადერთი გასასვლელი ქვემოთ მიმავალი კიბეა.',
  // crawlway: was the off-reading „სავლები"; render with the ცოცვა ("crawl")
  // root as „ცოცვით გასავლელი" (a passage you get through by crawling), and make
  // it a nominative clause so it reads distinctly from the „ვიწრო გასასვლელი"
  // (narrow passage) to the north. NATIVE-REVIEW-DRAFT.
  'You are in a dark and damp cellar with a narrow passageway leading north, and a crawlway to the south. On the west is the bottom of a steep metal ramp which is unclimbable.':
    'ბნელ და ნესტიან სარდაფში ხარ; ვიწრო გასასვლელი ჩრდილოეთით მიდის, ცოცვით გასავლელი კი — სამხრეთით. დასავლეთით ციცაბო ლითონის ფერდობის ძირია, რომელზე ასვლა შეუძლებელია.',
  'This is a small room with passages to the east and south and a forbidding hole leading west. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.':
    'ეს პატარა ოთახია, გასასვლელებით აღმოსავლეთითა და სამხრეთით და დასავლეთით მიმავალი მუქარისმომგვრელი ხვრელით. სისხლის ლაქები და ღრმა ნაკაწრები (შესაძლოა ცულით გაკეთებული) კედლებს ამახინჯებს.',
  'This is part of a maze of twisty little passages, all alike.':
    'ეს გრეხილი პატარა გასასვლელების ლაბირინთის ნაწილია, ყველა ერთნაირი.',
  'This is part of a maze of twisty little passages, all alike. A skeleton, probably the remains of a luckless adventurer, lies here.':
    'ეს გრეხილი პატარა გასასვლელების ლაბირინთის ნაწილია, ყველა ერთნაირი. აქ ჩონჩხი დევს, ალბათ უიღბლო თავგადასავლების მაძიებლის ნეშტი.',
  'This room has an exit on the northwest, and a staircase leading up.':
    'ამ ოთახს გასასვლელი ჩრდილო-დასავლეთით აქვს და ზემოთ მიმავალი კიბე.',
  'This is a large room, whose east wall is solid granite. A number of discarded bags, which crumble at your touch, are scattered about on the floor. There is an exit down a staircase.':
    'ეს დიდი ოთახია, რომლის აღმოსავლეთის კედელი მთლიანი გრანიტია. იატაკზე მიმოფანტულია რამდენიმე გადაგდებული ტომარა, რომლებიც შენი შეხებისთანავე იშლება. გასასვლელი ქვემოთ, კიბით არის.',
  'This is a long passage. To the west is one entrance. On the east there is an old wooden door, with a large opening in it (about cyclops sized).':
    'ეს გრძელი დერეფანია. დასავლეთით ერთი შესასვლელია. აღმოსავლეთით ძველი ხის კარია, დიდი ხვრელით (დაახლოებით ციკლოპის ზომის).',
  'You are on the east edge of a chasm, the bottom of which cannot be seen. A narrow passage goes north, and the path you are on continues to the east.':
    'უფსკრულის აღმოსავლეთ კიდეზე ხარ, რომლის ფსკერიც არ ჩანს. ვიწრო გასასვლელი ჩრდილოეთით მიდის და ბილიკი, რომელზეც ხარ, აღმოსავლეთით გრძელდება.',
  'This is an art gallery. Most of the paintings have been stolen by vandals with exceptional taste. The vandals left through either the north or west exits.':
    'ეს სამხატვრო გალერეაა. ნახატების უმეტესობა გამორჩეული გემოვნების მქონე ვანდალებს მოუპარავთ. ვანდალები ან ჩრდილოეთის, ან დასავლეთის გასასვლელით წავიდნენ.',
  'This is a narrow east-west passageway. There is a narrow stairway leading down at the north end of the room.':
    'ეს ვიწრო აღმოსავლეთ-დასავლეთის გასასვლელია. ოთახის ჩრდილოეთ ბოლოში ვიწრო კიბეა, რომელიც ქვემოთ მიდის.',
  'This is a circular stone room with passages in all directions. Several of them have unfortunately been blocked by cave-ins.':
    'ეს მრგვალი ქვის ოთახია, გასასვლელებით ყველა მიმართულებით. რამდენიმე მათგანი, სამწუხაროდ, ჩამოქცევებითაა ჩახერგილი.',
  'This is a high north-south passage, which forks to the northeast.':
    'ეს მაღალი ჩრდილოეთ-სამხრეთის დერეფანია, რომელიც ჩრდილო-აღმოსავლეთით იტოტება.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear the sound of flowing water from below.':
    'ღრმა კანიონის სამხრეთ კიდეზე ხარ. გასასვლელები აღმოსავლეთით, ჩრდილო-დასავლეთითა და სამხრეთ-დასავლეთით მიდის. კიბე ქვემოთ მიდის. ქვემოდან მოედინებული წყლის ხმა ისმის.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear a loud roaring sound, like that of rushing water, from below.':
    'ღრმა კანიონის სამხრეთ კიდეზე ხარ. გასასვლელები აღმოსავლეთით, ჩრდილო-დასავლეთითა და სამხრეთ-დასავლეთით მიდის. კიბე ქვემოთ მიდის. ქვემოდან ხმამაღალი გრუხუნი ისმის, მძვინვარე წყლის მსგავსი.',
  'You are in a long room on the south shore of a large lake, far too deep and wide for crossing.':
    'გრძელ ოთახში ხარ, დიდი ტბის სამხრეთ ნაპირზე, რომელიც გადასაკვეთად მეტისმეტად ღრმა და ფართოა.',
  'There is a path along the stream to the east or west, a steep pathway climbing southwest along the edge of a chasm, and a path leading into a canyon to the southeast.':
    'ნაკადის გასწვრივ ბილიკია აღმოსავლეთით ან დასავლეთით, ციცაბო ბილიკი სამხრეთ-დასავლეთით უფსკრულის კიდის გასწვრივ ადის, ბილიკი კი სამხრეთ-აღმოსავლეთით კანიონისკენ მიდის.',
  'You are in a long room, to the north of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through the center of the room.':
    'გრძელ ოთახში ხარ, რომლის ჩრდილოეთით ადრე ტბა იყო. თუმცა, წყლის დონის დაწევის შემდეგ, ოთახის შუაში მხოლოდ ფართო ნაკადი მიედინება.',
  'You are on what used to be a large lake, but which is now a large mud pile. There are "shores" to the north and south.':
    'იქ ხარ, სადაც ადრე დიდი ტბა იყო, ახლა კი დიდი ტალახის გროვაა. ჩრდილოეთითა და სამხრეთით „ნაპირებია“.',
  'You are in a large cavernous room, the south of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through there.':
    'დიდ გამოქვაბულისებრ ოთახში ხარ, რომლის სამხრეთით ადრე ტბა იყო. თუმცა, წყლის დონის დაწევის შემდეგ, იქ მხოლოდ ფართო ნაკადი მიედინება.',
  'You are standing on the top of the Flood Control Dam #3, which was quite a tourist attraction in times far distant. There are paths to the north, south, and west, and a scramble down.':
    'წყალდიდობის მაკონტროლებელი კაშხალი #3-ის თავზე დგახარ, რომელიც შორეულ წარსულში საკმაოდ ცნობილი ტურისტული ღირსშესანიშნაობა იყო. ბილიკები ჩრდილოეთით, სამხრეთითა და დასავლეთით მიდის, ქვემოთ კი ძლივს ჩასასვლელია.',
  'This room appears to have been the waiting room for groups touring the dam. There are open doorways here to the north and east marked "Private", and there is a path leading south over the top of the dam.':
    'ეს ოთახი, როგორც ჩანს, კაშხლის დამთვალიერებელ ჯგუფთა მოსაცდელი ოთახი იყო. აქ ჩრდილოეთითა და აღმოსავლეთით ღია კარებია, წარწერით „კერძო“, სამხრეთით კი ბილიკი მიდის კაშხლის თავზე გადასვლით.',
  'This is what appears to have been the maintenance room for Flood Control Dam #3. Apparently, this room has been ransacked recently, for most of the valuable equipment is gone. On the wall in front of you is a group of buttons colored blue, yellow, brown, and red. There are doorways to the west and south.':
    'ეს, როგორც ჩანს, წყალდიდობის მაკონტროლებელი კაშხალი #3-ის სარემონტო ოთახი იყო. ცხადია, ეს ოთახი ცოტა ხნის წინ გაუძარცვავთ, რადგან ძვირფასი აღჭურვილობის უმეტესობა გამქრალია. შენ წინ კედელზე ღილაკების ჯგუფია — ლურჯი, ყვითელი, ყავისფერი და წითელი. კარები დასავლეთითა და სამხრეთით არის.',
  'You are at the base of Flood Control Dam #3, which looms above you and to the north. The river Frigid is flowing by here. Along the river are the White Cliffs which seem to form giant walls stretching from north to south along the shores of the river as it winds its way downstream.':
    'წყალდიდობის მაკონტროლებელი კაშხალი #3-ის ძირში ხარ, რომელიც შენ ზემოთ და ჩრდილოეთით აღიმართება. მდინარე ფრიჯიდი აქ მიედინება. მდინარის გასწვრივ თეთრი კლდეებია, რომლებიც, როგორც ჩანს, გოლიათურ კედლებს ქმნის და ჩრდილოეთიდან სამხრეთისკენ მდინარის ნაპირების გასწვრივ გადაჭიმულა, ვიდრე ის ქვევით მიიკლაკნება.',
  'You have entered a low cave with passages leading northwest and east.':
    'დაბალ გამოქვაბულში შეხვედი, გასასვლელებით ჩრდილო-დასავლეთითა და აღმოსავლეთით.',
  'You are at the periphery of a large dome, which forms the ceiling of another room below. Protecting you from a precipitous drop is a wooden railing which circles the dome.':
    'დიდი გუმბათის პერიფერიაზე ხარ, რომელიც ქვემოთ მეორე ოთახის ჭერს ქმნის. ციცაბო ვარდნისგან ხის მოაჯირი გიცავს, რომელიც გუმბათს გარს ერტყმის.',
  'This is a large room with a prominent doorway leading to a down staircase. Above you is a large dome. Up around the edge of the dome (20 feet up) is a wooden railing. In the center of the room sits a white marble pedestal.':
    'ეს დიდი ოთახია, თვალში საცემი კარით, რომელიც ქვემოთ მიმავალ კიბესთან მიდის. შენ ზემოთ დიდი გუმბათია. გუმბათის კიდის გასწვრივ ზევით (20 ფუტის სიმაღლეზე) ხის მოაჯირია. ოთახის შუაში თეთრი მარმარილოს კვარცხლბეკი დგას.',
  'This is the north end of a large temple. On the east wall is an ancient inscription, probably a prayer in a long-forgotten language. Below the prayer is a staircase leading down. The west wall is solid granite. The exit to the north end of the room is through huge marble pillars.':
    'ეს დიდი ტაძრის ჩრდილოეთ ბოლოა. აღმოსავლეთ კედელზე უძველესი წარწერაა, ალბათ ლოცვა დიდი ხნის დავიწყებულ ენაზე. ლოცვის ქვემოთ ქვემოთ მიმავალი კიბეა. დასავლეთ კედელი მთლიანი გრანიტია. ოთახის ჩრდილოეთ ბოლოს გასასვლელი უზარმაზარ მარმარილოს სვეტებშია.',
  'This is the south end of a large temple. In front of you is what appears to be an altar. In one corner is a small hole in the floor which leads into darkness. You probably could not get back up it.':
    'ეს დიდი ტაძრის სამხრეთ ბოლოა. შენ წინ რაღაც დგას, რაც სამსხვერპლოს ჰგავს. ერთ კუთხეში იატაკში პატარა ხვრელია, რომელიც სიბნელეში მიდის. ალბათ ვერ შეძლებდი მისით უკან ამოსვლას.',
  'This is a tiny cave with entrances west and north, and a dark, forbidding staircase leading down.':
    'ეს პაწაწინა გამოქვაბულია, შესასვლელებით დასავლეთითა და ჩრდილოეთით და ბნელი, მუქარისმომგვრელი კიბით, რომელიც ქვემოთ მიდის.',
  'This is a tiny cave with entrances west and north, and a staircase leading down.':
    'ეს პაწაწინა გამოქვაბულია, შესასვლელებით დასავლეთითა და ჩრდილოეთით და ქვემოთ მიმავალი კიბით.',
  'You are outside a large gateway, on which is inscribed':
    'დიდი ჭიშკრის წინ ხარ, რომელზეც წერია',
  'Abandon every hope all ye who enter here!':
    'ყოველგვარ იმედს გამოეთხოვეთ, თქვენ, ვინც აქ შემოდიხართ!',
  'The gate is open; through it you can see a desolation, with a pile of mangled bodies in one corner. Thousands of voices, lamenting some hideous fate, can be heard.':
    'ჭიშკარი ღიაა; მის მიღმა გაპარტახებას ხედავ, ერთ კუთხეში დაგლეჯილი გვამების გროვით. ათასობით ხმა ისმის, რომლებიც რაღაც საზარელ ხვედრს დასტირიან.',

  // ── More room descriptions (off-path / late-game) ───────────────────────
  'You have entered the Land of the Living Dead. Thousands of lost souls can be heard weeping and moaning. In the corner are stacked the remains of dozens of previous adventurers less fortunate than yourself. A passage exits to the north.':
    'ცოცხალ-მკვდრების სამყაროში შეხვედი. ათასობით დაკარგული სული ისმის, მტირალი და მოგუგუნე. კუთხეში დაწყობილია შენზე ნაკლებად იღბლიანი ათეულობით წინა თავგადასავლების მაძიებლის ნეშტი. გასასვლელი ჩრდილოეთით გადის.',
  'You are in a large square room with tall ceilings. On the south wall is an enormous mirror which fills the entire wall. There are exits on the other three sides of the room.':
    'დიდ კვადრატულ ოთახში ხარ, მაღალი ჭერით. სამხრეთ კედელზე უზარმაზარი სარკეა, რომელიც მთელ კედელს ფარავს. გასასვლელები ოთახის დანარჩენ სამ მხარესაა.',
  'This is a cold and damp corridor where a long east-west passageway turns into a southward path.':
    'ეს ცივი და ნესტიანი დერეფანია, სადაც გრძელი აღმოსავლეთ-დასავლეთის გასასვლელი სამხრეთისკენ მიმავალ ბილიკში გადადის.',
  'This is a small chamber, which appears to have been part of a coal mine. On the south wall of the chamber the letters "Granite Wall" are etched in the rock. To the east is a long passage, and there is a steep metal slide twisting downward. To the north is a small opening.':
    'ეს პატარა ოთახია, რომელიც, როგორც ჩანს, ნახშირის მაღაროს ნაწილი იყო. ოთახის სამხრეთ კედელზე კლდეშია ამოკვეთილი სიტყვები "გრანიტის კედელი". აღმოსავლეთით გრძელი გასასვლელია, ციცაბო ლითონის ჩასაცურავი კი გრეხილად ქვემოთ მიდის. ჩრდილოეთით პატარა ხვრელია.',
  'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward. The room is deafeningly loud with an undetermined rushing sound. The sound seems to reverberate from all of the walls, making it difficult even to think.':
    'ეს დიდი ოთახია, რომლის ჭერიც მიწიდან ვერ ჩანს. ვიწრო გასასვლელი აღმოსავლეთიდან დასავლეთისკენ მიდის და ქვის კიბე ზემოთ. ოთახი ყურისწამღები ხმაურითაა სავსე, რაღაც გაურკვეველი გრიალით. ხმა, როგორც ჩანს, ყველა კედლიდან ირეკლება, ისე, რომ ფიქრიც კი ჭირს.',
  'This is an ancient room, long under water. There is an exit to the south and a staircase leading up.':
    'ეს უძველესი ოთახია, დიდხანს წყლის ქვეშ ნამყოფი. გასასვლელი სამხრეთითაა და ზემოთ მიმავალი კიბე.',
  'This is a long and narrow corridor where a long north-south passageway briefly narrows even further.':
    'ეს გრძელი და ვიწრო დერეფანია, სადაც გრძელი ჩრდილოეთ-სამხრეთის გასასვლელი ცოტა ხნით კიდევ უფრო ვიწროვდება.',
  'You are standing at the entrance of what might have been a coal mine. The shaft enters the west wall, and there is another exit on the south end of the room.':
    'იმის შესასვლელთან დგახარ, რაც შესაძლოა ნახშირის მაღარო იყო. ჭაბურღილი დასავლეთ კედელში შედის, ოთახის სამხრეთ ბოლოში კი კიდევ ერთი გასასვლელია.',
  'You are in a small room. Strange squeaky sounds may be heard coming from the passage at the north end. You may also escape to the east.':
    'პატარა ოთახში ხარ. ჩრდილოეთ ბოლოს გასასვლელიდან უცნაური ჭრიალა ხმები ისმის. შეგიძლია აღმოსავლეთითაც გაიქცე.',
  'You are in a small room which has doors only to the east and south.':
    'პატარა ოთახში ხარ, რომელსაც კარები მხოლოდ აღმოსავლეთითა და სამხრეთით აქვს.',
  'This is a large room, in the middle of which is a small shaft descending through the floor into darkness below. To the west and the north are exits from this room. Constructed over the top of the shaft is a metal framework to which a heavy iron chain is attached.':
    'ეს დიდი ოთახია, რომლის შუაში პატარა ჭაბურღილი იატაკში, ქვემოთ სიბნელეში ჩადის. დასავლეთითა და ჩრდილოეთით ამ ოთახიდან გასასვლელებია. ჭაბურღილის თავზე ლითონის კონსტრუქციაა აშენებული, რომელზეც მძიმე რკინის ჯაჭვია მიმაგრებული.',
  'This is a small nondescript room. However, from the direction of a small descending staircase a foul odor can be detected. To the south is a narrow tunnel.':
    'ეს პატარა უსახო ოთახია. თუმცა ქვემოთ მიმავალი პატარა კიბის მხრიდან მყრალი სუნი იგრძნობა. სამხრეთით ვიწრო გვირაბია.',
  'This is a small room which smells strongly of coal gas. There is a short climb up some stairs and a narrow tunnel leading east.':
    'ეს პატარა ოთახია, რომელსაც ნახშირის გაზის ძლიერი სუნი უდის. რამდენიმე საფეხურით მოკლე ასასვლელია და აღმოსავლეთით მიმავალი ვიწრო გვირაბი.',
  'This is a nondescript part of a coal mine.':
    'ეს ნახშირის მაღაროს უსახო ნაწილია.',
  'This is a very small room. In the corner is a rickety wooden ladder, leading downward. It might be safe to descend. There is also a staircase leading upward.':
    'ეს ძალიან პატარა ოთახია. კუთხეში რყევადი ხის კიბეა, ქვემოთ მიმავალი. ალბათ უსაფრთხოა ჩასვლა. ასევეა ზემოთ მიმავალი კიბე.',
  'This is a rather wide room. On one side is the bottom of a narrow wooden ladder. To the west and the south are passages leaving the room.':
    'ეს საკმაოდ ფართო ოთახია. ერთ მხარეს ვიწრო ხის კიბის ძირია. დასავლეთითა და სამხრეთით ოთახიდან გასასვლელები მიდის.',
  'You have come to a dead end in the mine.': 'მაღაროში ჩიხამდე მიხვედი.',
  'This is a long and narrow passage, which is cluttered with broken timbers. A wide passage comes from the east and turns at the west end of the room into a very narrow passageway. From the west comes a strong draft.':
    'ეს გრძელი და ვიწრო გასასვლელია, გადატეხილი ძელებითაა გადახერგილი. ფართო გასასვლელი აღმოსავლეთიდან მოდის და ოთახის დასავლეთ ბოლოში ძალიან ვიწრო დერეფნად იქცევა. დასავლეთიდან ძლიერი ნიავი მოდის.',
  'This is a small drafty room in which is the bottom of a long shaft. To the south is a passageway and to the east a very narrow passage. In the shaft can be seen a heavy iron chain.':
    'ეს პატარა ნიავიანი ოთახია, რომელშიც გრძელი ჭაბურღილის ძირია. სამხრეთით დერეფანია, აღმოსავლეთით კი ძალიან ვიწრო გასასვლელი. ჭაბურღილში მძიმე რკინის ჯაჭვი ჩანს.',
  'This is a large, cold room whose sole exit is to the north. In one corner there is a machine which is reminiscent of a clothes dryer. On its face is a switch which is labelled "START". The switch does not appear to be manipulable by any human hand (unless the fingers are about 1/16 by 1/4 inch). On the front of the machine is a large lid, which is closed.':
    'ეს დიდი, ცივი ოთახია, რომლის ერთადერთი გასასვლელი ჩრდილოეთითაა. ერთ კუთხეში მანქანაა, რომელიც სარეცხის საშრობს მოგაგონებს. მის წინა მხარეს ჩამრთველია წარწერით "START". ჩამრთველი, როგორც ჩანს, ვერც ერთი ადამიანის ხელით ვერ მოიხელთება (თუ თითები დაახლოებით 1/16-ზე 1/4 დიუმი არ არის). მანქანის წინა მხარეს დიდი სახურავია, რომელიც დახურულია.',
  'This is a room which looks like an Egyptian tomb. There is an ascending staircase to the west.':
    'ეს ოთახი ეგვიპტურ აკლდამას ჰგავს. დასავლეთით ზემოთ მიმავალი კიბეა.',
  'You are on the Frigid River in the vicinity of the Dam. The river flows quietly here. There is a landing on the west shore.':
    'მდინარე ფრიჯიდზე ხარ, კაშხლის ახლოს. მდინარე აქ წყნარად მიედინება. დასავლეთ ნაპირზე სადგომია.',
  'The river turns a corner here making it impossible to see the Dam. The White Cliffs loom on the east bank and large rocks prevent landing on the west.':
    'მდინარე აქ უხვევს და კაშხლის დანახვას შეუძლებელს ხდის. თეთრი კლდეები აღმოსავლეთ ნაპირზე აღიმართება, დიდი კლდეები კი დასავლეთით მიდგომას აფერხებს.',
  'The river descends here into a valley. There is a narrow beach on the west shore below the cliffs. In the distance a faint rumbling can be heard.':
    'მდინარე აქ ხეობაში ჩადის. დასავლეთ ნაპირზე, კლდეების ქვემოთ, ვიწრო სანაპიროა. შორიდან სუსტი გრუხუნი ისმის.',
  'The river is running faster here and the sound ahead appears to be that of rushing water. On the east shore is a sandy beach. A small area of beach can also be seen below the cliffs on the west shore.':
    'მდინარე აქ უფრო სწრაფად მიედინება და წინ ხმა, როგორც ჩანს, მძვინვარე წყლისაა. აღმოსავლეთ ნაპირზე ქვიშიანი სანაპიროა. დასავლეთ ნაპირზე, კლდეების ქვემოთ, სანაპიროს პატარა მონაკვეთიც ჩანს.',
  'You are on a large sandy beach on the east shore of the river, which is flowing quickly by. A path runs beside the river to the south here, and a passage is partially buried in sand to the northeast.':
    'მდინარის აღმოსავლეთ ნაპირზე, დიდ ქვიშიან სანაპიროზე ხარ, რომელიც სწრაფად მიედინება. ბილიკი მდინარის გვერდით სამხრეთით მიდის, გასასვლელი კი ჩრდილო-აღმოსავლეთით ნაწილობრივ ქვიშაშია ჩაფლული.',
  'This is a sand-filled cave whose exit is to the southwest.':
    'ეს ქვიშით სავსე გამოქვაბულია, რომლის გასასვლელი სამხრეთ-დასავლეთითაა.',
  'You are on the east shore of the river. The water here seems somewhat treacherous. A path travels from north to south here, the south end quickly turning around a sharp corner.':
    'მდინარის აღმოსავლეთ ნაპირზე ხარ. წყალი აქ ცოტა ღალატიანი ჩანს. ბილიკი ჩრდილოეთიდან სამხრეთისკენ მიდის, რომლის სამხრეთი ბოლო სწრაფად ბასრ კუთხეს უხვევს.',
  'You are at the top of Aragain Falls, an enormous waterfall with a drop of about 450 feet. The only path here is on the north end.':
    'არაგეინის ჩანჩქერის თავზე ხარ, უზარმაზარი ჩანჩქერი დაახლოებით 450 ფუტი ვარდნით. ერთადერთი ბილიკი აქ ჩრდილოეთ ბოლოშია.',
  'You are on top of a rainbow (I bet you never thought you would walk on a rainbow), with a magnificent view of the Falls. The rainbow travels east-west here.':
    'ცისარტყელის თავზე ხარ (დადებს ვალს, არასდროს გეგონა, რომ ცისარტყელაზე ივლიდი), ჩანჩქერის მშვენიერი ხედით. ცისარტყელა აქ აღმოსავლეთ-დასავლეთით გადაჭიმულა.',
  'You are on a small, rocky beach on the continuation of the Frigid River past the Falls. The beach is narrow due to the presence of the White Cliffs. The river canyon opens here and sunlight shines in from above. A rainbow crosses over the falls to the east and a narrow path continues to the southwest.':
    'პატარა, კლდოვან სანაპიროზე ხარ, მდინარე ფრიჯიდის გაგრძელებაზე, ჩანჩქერის შემდეგ. სანაპირო ვიწროა თეთრი კლდეების გამო. მდინარის კანიონი აქ იხსნება და ზემოდან მზის შუქი ანათებს. ცისარტყელა აღმოსავლეთით ჩანჩქერს გადაჰკვეთს და ვიწრო ბილიკი სამხრეთ-დასავლეთით გრძელდება.',
  'You are beneath the walls of the river canyon which may be climbable here. The lesser part of the runoff of Aragain Falls flows by below. To the north is a narrow path.':
    'მდინარის კანიონის კედლების ქვემოთ ხარ, რომლებზე ასვლა აქ შესაძლებელია. არაგეინის ჩანჩქერის ჩამონადენის უმცირესი ნაწილი ქვემოთ მიედინება. ჩრდილოეთით ვიწრო ბილიკია.',
  'You are on a ledge about halfway up the wall of the river canyon. You can see from here that the main flow from Aragain Falls twists along a passage which it is impossible for you to enter. Below you is the canyon bottom. Above you is more cliff, which appears climbable.':
    'შვერილზე ხარ, დაახლოებით მდინარის კანიონის კედლის ნახევარ სიმაღლეზე. აქედან ხედავ, რომ არაგეინის ჩანჩქერის მთავარი ნაკადი გასასვლელის გასწვრივ გრეხილად მიიკლაკნება, რომელშიც შესვლა შეუძლებელია. შენ ქვემოთ კანიონის ფსკერია. შენ ზემოთ კი კიდევ კლდეა, რომელზე ასვლა შესაძლებელი ჩანს.',
  'You are at the top of the Great Canyon on its west wall. From here there is a marvelous view of the canyon and parts of the Frigid River upstream. Across the canyon, the walls of the White Cliffs join the mighty ramparts of the Flathead Mountains to the east. Following the Canyon upstream to the north, Aragain Falls may be seen, complete with rainbow. The mighty Frigid River flows out from a great dark cavern. To the west and south can be seen an immense forest, stretching for miles around. A path leads northwest. It is possible to climb down into the canyon from here.':
    'დიდი კანიონის თავზე ხარ, მის დასავლეთ კედელზე. აქედან კანიონისა და მდინარე ფრიჯიდის ზევითა ნაწილების მშვენიერი ხედია. კანიონის გადაღმა თეთრი კლდეების კედლები აღმოსავლეთით ფლეტჰედის მთების ძლიერ ზღუდეებს უერთდება. კანიონს ზევით ჩრდილოეთისკენ თუ გაჰყვები, არაგეინის ჩანჩქერი ჩანს, ცისარტყელითურთ. ძლიერი მდინარე ფრიჯიდი დიდი ბნელი გამოქვაბულიდან გადმოედინება. დასავლეთითა და სამხრეთით უზარმაზარი ტყე ჩანს, მილების მანძილზე გადაჭიმული. ბილიკი ჩრდილო-დასავლეთით მიდის. აქედან კანიონში ჩასვლა შესაძლებელია.',
  'You are standing in front of a massive barrow of stone. In the east face is a huge stone door which is open. You cannot see into the dark of the tomb.':
    'უზარმაზარი ქვის ყორღანის წინ დგახარ. აღმოსავლეთ მხარეს უზარმაზარი ქვის კარია, რომელიც ღიაა. აკლდამის სიბნელეში ვერ ხედავ.',
  'As you enter the barrow, the door closes inexorably behind you. Around you it is dark, but ahead is an enormous cavern, brightly lit. Through its center runs a wide stream. Spanning the stream is a small wooden footbridge, and beyond a path leads into a dark tunnel. Above the bridge, floating in the air, is a large sign. It reads: All ye who stand before this bridge have completed a great and perilous adventure which has tested your wit and courage. You have mastered the first part of the ZORK trilogy. Those who pass over this bridge must be prepared to undertake an even greater adventure that will severely test your skill and bravery!':
    'როცა ყორღანში შეხვალ, კარი დაუნდობლად იხურება შენ უკან. შენს გარშემო ბნელია, წინ კი უზარმაზარი, კაშკაშად განათებული გამოქვაბულია. მის შუაში ფართო ნაკადი მიედინება. ნაკადს პატარა ხის საფეხმავლო ხიდი გადაჰკვეთს, მის იქით კი ბილიკი ბნელ გვირაბში მიდის. ხიდის ზემოთ, ჰაერში მცურავი, დიდი ნიშანია. მასზე წერია: თქვენ ყველანი, ვინც ამ ხიდის წინ დგახართ, დიდი და სახიფათო თავგადასავალი დაასრულეთ, რომელმაც თქვენი გონება და სიმამაცე გამოცადა. ZORK-ის ტრილოგიის პირველი ნაწილი დაეუფლეთ. ვინც ამ ხიდს გადააბიჯებს, მზად უნდა იყოს, კიდევ უფრო დიდი თავგადასავალი წამოიწყოს, რომელიც თქვენს ოსტატობასა და სიმამაცეს მკაცრად გამოცდის!',

  // ── Off-path room & object titles ───────────────────────────────────────
  'Damp Cave': 'ნესტიანი გამოქვაბული',
  'Frigid River': 'მდინარე ფრიჯიდი',
  "ZORK owner's manual": 'მფლობელის სახელმძღვანელო',
  'Stream View': 'ნაკადის ხედი',
  Stream: 'ნაკადი',
  'Twisting Passage': 'კლაკნილი გასასვლელი',
  Chasm: 'უფსკრული',
  'Winding Passage': 'გრეხილი გასასვლელი',
  'White Cliffs Beach': 'თეთრი კლდეების სანაპირო',
  'Grating Room': 'ცხაურის ოთახი',
  Studio: 'სახელოსნო',
  'Commandment #12592': 'მცნება #12592',

  // ── Death / grue ─────────────────────────────────────────────────────────
  'Oh, no! A lurking grue slithered into the room and devoured you!':
    'ვაი! ჩასაფრებული გრუ ოთახში შეცოცდა და შეგჭამა!',
  'Your load is too heavy.': 'შენი ტვირთი ძალიან მძიმეა.',
  'Your load is too heavy, especially in light of your condition.':
    'შენი ტვირთი ძალიან მძიმეა, განსაკუთრებით შენი მდგომარეობის გათვალისწინებით.',
  'The room looks strange and unearthly.':
    'ოთახი უცნაურად და არამიწიერად გამოიყურება.',
  'The room looks strange and unearthly and objects appear indistinct.':
    'ოთახი უცნაურად და არამიწიერად გამოიყურება და საგნები ბუნდოვნად ჩანს.',

  // ── Rank messages ────────────────────────────────────────────────────────
  'This gives you the rank of Wizard.': 'ეს განიჭებს ჯადოქრის წოდებას.',
  'This gives you the rank of Master.': 'ეს განიჭებს ოსტატის წოდებას.',
  'This gives you the rank of Adventurer.':
    'ეს განიჭებს თავგადასავლების მაძიებლის წოდებას.',
  'This gives you the rank of Junior Adventurer.':
    'ეს განიჭებს უმცროსი თავგადასავლების მაძიებლის წოდებას.',
  'This gives you the rank of Novice Adventurer.':
    'ეს განიჭებს დამწყები თავგადასავლების მაძიებლის წოდებას.',
  'This gives you the rank of Amateur Adventurer.':
    'ეს განიჭებს მოყვარული თავგადასავლების მაძიებლის წოდებას.',
  'This gives you the rank of Beginner.': 'ეს განიჭებს ახალბედის წოდებას.',

  // ── Health / wounds status ───────────────────────────────────────────────
  'You can expect death soon.': 'მალე სიკვდილი გელის.',
  'You can be killed by one more light wound.':
    'კიდევ ერთი მსუბუქი ჭრილობა შეგიწირავს.',
  'You can be killed by a serious wound.': 'სერიოზული ჭრილობა შეგიწირავს.',
  'You can survive one serious wound.': 'ერთ სერიოზულ ჭრილობას გადაიტან.',
  'You can survive several wounds.': 'რამდენიმე ჭრილობას გადაიტან.',
  'You have been killed once.': 'ერთხელ უკვე მოგკლეს.',
  'You have been killed twice.': 'ორჯერ უკვე მოგკლეს.',

  // ── Thief / stiletto edge cases ──────────────────────────────────────────
  'The thief swings it out of your reach.':
    'ქურდი მას ხელმისაწვდომობის მიღმა გადააქნევს.',
  "The stiletto seems white-hot. You can't hold on to it.":
    'სტილეტი თეთრად გავარვარებული ჩანს. ვერ აიტან მის ხელში ჭერას.',

  // ── Lamp / candles / lights ──────────────────────────────────────────────
  'The lamp is on.': 'ფარანი ანთია.',
  'The lamp is turned off.': 'ფარანი გამორთულია.',
  'The lamp has burned out.': 'ფარანი დაიწვა.',
  'The candles are already lit.': 'სანთლები უკვე ანთია.',
  'The candles are burning.': 'სანთლები იწვის.',
  'The candles are out.': 'სანთლები ჩამქრალია.',

  // ── Chimney / lights / rug ───────────────────────────────────────────────
  'The chimney leads upward, and looks climbable.':
    'საკვამური ზემოთ მიდის და ასასვლელად ვარგისი ჩანს.',
  'The chimney leads downward, and looks climbable.':
    'საკვამური ქვემოთ მიდის და ჩასასვლელად ვარგისი ჩანს.',
  'The lights within the room shut off.': 'ოთახში შუქი ქრება.',
  'The lights within the room come on.': 'ოთახში შუქი ინთება.',
  'The rug is too heavy to lift.': 'ხალიჩა ასაწევად ძალიან მძიმეა.',
  'The rug is too heavy to lift, but in trying to take it you have noticed an irregularity beneath it.':
    'ხალიჩა ასაწევად ძალიან მძიმეა, მაგრამ მისი აღების მცდელობისას მის ქვეშ უსწორმასწორობას შეამჩნევ.',

  // ── Reservoir / water level ──────────────────────────────────────────────
  'The water level here is now up to your ankles.':
    'წყლის დონე აქ ახლა ტერფებამდე გაქვს.',
  'The water level here is now up to your shin.':
    'წყლის დონე აქ ახლა წვივებამდე გაქვს.',
  'The water level here is now up to your knees.':
    'წყლის დონე აქ ახლა მუხლებამდე გაქვს.',
  'The water level here is now up to your hips.':
    'წყლის დონე აქ ახლა თეძოებამდე გაქვს.',
  'The water level here is now up to your waist.':
    'წყლის დონე აქ ახლა წელამდე გაქვს.',
  'The water level here is now up to your chest.':
    'წყლის დონე აქ ახლა მკერდამდე გაქვს.',
  'The water level here is now up to your neck.':
    'წყლის დონე აქ ახლა ყელამდე გაქვს.',
  'The water level here is now over your head.':
    'წყლის დონე აქ ახლა თავზე მაღლა გაქვს.',
  'The water level here is now high in your lungs.':
    'წყლის დონე აქ ახლა ფილტვებში მაღლა გიდგას.',

  // ── On the water / swimming ──────────────────────────────────────────────
  "Swimming isn't usually allowed in the dungeon.":
    'დილეგში ცურვა ჩვეულებრივ ნებადართული არ არის.',
  'You are on the river, or have you forgotten?':
    'მდინარეზე ხარ, თუ დაგავიწყდა?',
  'You are on the reservoir, or have you forgotten?':
    'წყალსაცავზე ხარ, თუ დაგავიწყდა?',
  'You are on the stream, or have you forgotten?':
    'ნაკადზე ხარ, თუ დაგავიწყდა?',

  // ── Coins / jewels in container ──────────────────────────────────────────
  'There are lots of coins in there.': 'იქ ბევრი მონეტაა.',
  'There are lots of jewels in there.': 'იქ ბევრი ძვირფასი ქვაა.',
  "The coins are safely inside; there's no need to do that.":
    'მონეტები უსაფრთხოდ შიგნითაა; ამის გაკეთება საჭირო არ არის.',
  "The jewels are safely inside; there's no need to do that.":
    'ძვირფასი ქვები უსაფრთხოდ შიგნითაა; ამის გაკეთება საჭირო არ არის.',

  // ── Views / boat warranty / misc flavor ──────────────────────────────────
  'You can see a clear area leading towards a forest.':
    'ტყისკენ მიმავალ ღია მონაკვეთს ხედავ.',
  'You can see what appears to be a kitchen.':
    'იმას ხედავ, რაც სამზარეულოს ჰგავს.',
  'Nice view, lousy place to jump.':
    'კარგი ხედია, ხტომისთვის კი უვარგისი ადგილი.',
  'This boat is guaranteed against all defects for a period of 76 milliseconds from date of purchase or until first used, whichever comes first.':
    'ამ ნავს ყველა დეფექტზე გარანტია აქვს ყიდვის თარიღიდან 76 მილიწამის ან პირველ გამოყენებამდე, რომელიც უფრო ადრე დადგება.',
  'Warning:': 'გაფრთხილება:',
  'This boat is made of thin plastic.': 'ეს ნავი თხელი პლასტმასისგანაა.',
  'Good Luck!': 'წარმატებები!',
  'The cyclops prefers eating to making conversation.':
    'ციკლოპს ჭამა საუბარს ერჩივნება.',

  // ── FCD#3 guidebook tour text ────────────────────────────────────────────
  'The construction of FCD#3 took 112 days from ground breaking to the dedication. It required a work force of 384 slaves, 34 slave drivers, 12 engineers, 2 turtle doves, and a partridge in a pear tree. The work was managed by a command team composed of 2345 bureaucrats, 2347 secretaries (at least two of whom could type), 12,256 paper shufflers, 52,469 rubber stampers, 245,193 red tape processors, and nearly one million dead trees.':
    'FCD#3-ის მშენებლობას 112 დღე დასჭირდა მიწის ამოღებიდან გახსნამდე. მას დასჭირდა 384 მონის, 34 მონის გამრეკავის, 12 ინჟინრის, 2 გვრიტისა და მსხლის ხეზე ერთი კაკაბის სამუშაო ძალა. სამუშაოს ხელმძღვანელობდა მმართველი გუნდი, რომელიც შედგებოდა 2345 ბიუროკრატის, 2347 მდივნის (რომელთაგან სულ მცირე ორს ბეჭდვა შეეძლო), 12,256 ქაღალდის ამრევის, 52,469 ბეჭდის დამსმელის, 245,193 ბიუროკრატიული ფორმალობების დამმუშავებლისა და თითქმის ერთი მილიონი მკვდარი ხისგან.',
  'We will now point out some of the more interesting features of FCD#3 as we conduct you on a guided tour of the facilities:':
    'ახლა მიგითითებთ FCD#3-ის ზოგიერთ უფრო საინტერესო თავისებურებაზე, ვიდრე ნაგებობებში ექსკურსიას გაგატარებთ:',
  '"Flood Control Dam #3': '"წყალდიდობის მაკონტროლებელი კაშხალი #3',
  '1) You start your tour here in the Dam Lobby. You will notice on your right that....':
    '1) ექსკურსიას აქ, კაშხლის ფოიეში იწყებ. მარჯვნივ შეამჩნევ, რომ....',
  'Hello, Sailor!': 'გამარჯობა, მეზღვაურო!',
  'Instructions for use:': 'გამოყენების ინსტრუქცია:',
  'To get into a body of water, say "Launch".':
    'წყალში მოსახვედრად თქვი "Launch".',
  'To get to shore, say "Land" or the direction in which you want to maneuver the boat.':
    'ნაპირზე მოსახვედრად თქვი "Land" ან მიმართულება, რომლისკენაც ნავის მართვა გინდა.',
  'Warranty:': 'გარანტია:',

  // ── Black book / curses ──────────────────────────────────────────────────
  'Surely, thy eye shall be put out with a sharp stick!':
    'უეჭველად, შენი თვალი ბასრი ჯოხით გამოგითხრება!',
  'Even unto the ends of the earth shalt thou wander and':
    'ქვეყნის კიდით კიდემდეც კი იხეტიალებ და',
  'Unto the land of the dead shalt thou be sent at last.':
    'ბოლოს მკვდრების სამყაროში გაიგზავნები.',
  'Surely thou shalt repent of thy cunning.':
    'უეჭველად, შენს ცბიერებაში მოინანიებ.',

  // ── Parser feedback / misc ───────────────────────────────────────────────
  'The ground is too hard for digging here.':
    'მიწა აქ თხრისთვის ძალიან მაგარია.',
  'There is a suspicious-looking individual, holding a bag, leaning against one wall. He is armed with a vicious-looking stiletto.':
    'საეჭვო იერსახის ვინმე, ტომრის ხელში მჭერი, ერთ კედელზეა მიყრდნობილი. ის ბოროტი იერსახის სტილეტითაა შეიარაღებული.',
  'You should say whether you want to go up or down.':
    'უნდა თქვა, ზემოთ გინდა თუ ქვემოთ.',
  'There is a suspicious-looking individual lying unconscious on the ground.':
    'მიწაზე საეჭვო იერსახის ვინმე უგონოდ წევს.',
  "The door won't budge.": 'კარი არ იძვრის.',
  'The candles are becoming quite short.': 'სანთლები საკმაოდ მოკლდება.',
  'You must perform the ceremony.': 'რიტუალი უნდა შეასრულო.',
  'You are on a narrow strip of beach which runs along the base of the White Cliffs. There is a narrow path heading south along the Cliffs and a tight passage leading west into the cliffs themselves.':
    'სანაპიროს ვიწრო ზოლზე ხარ, რომელიც თეთრი კლდეების ძირის გასწვრივ მიდის. კლდეების გასწვრივ სამხრეთით ვიწრო ბილიკია და ვიწრო გასასვლელი დასავლეთით, თავად კლდეებში მიდის.',
  'You tumble down the slide....': 'ჩასაცურავზე გადმოგორდები....',
  'This has no effect.': 'ამას ეფექტი არ აქვს.',
  "It's really not clear how.": 'ნამდვილად გაუგებარია, როგორ.',
  'You cannot climb any higher.': 'უფრო მაღლა ვერ ახვალ.',
  "You can't tie anything to yourself.": 'საკუთარ თავზე ვერაფერს მიაბამ.',
  'You cannot fit through this passage with that load.':
    'ამ ტვირთით ამ გასასვლელში ვერ ეტევი.',
  'What a loony!': 'რა გადარეული ხარ!',
  'This cannot be tied, so it cannot be untied!':
    'ეს ვერ მიება, ამიტომ ვერც ახსნი!',

  // ── Strings batch (Task 7) — refusals, flavor, descriptions ──────────────
  'You cannot go down without fracturing many bones.':
    'ბევრი ძვლის გადატეხის გარეშე ქვემოთ ვერ ჩახვალ.',
  'A hot pepper sandwich is here.': 'აქ მწარე წიწაკის სენდვიჩია.',
  '(Close cover before striking)': '(მოკიდებამდე ყდა დახურე)',
  'YOU too can make BIG MONEY in the exciting field of PAPER SHUFFLING!':
    'შენც შეგიძლია დიდი ფული გამოიმუშავო ქაღალდების გადახარისხების ამაღელვებელ სფეროში!',
  'Mr. Anderson of Muddle, Mass. says: "Before I took this course I was a lowly bit twiddler. Now with what I learned at GUE Tech I feel really important and can obfuscate and confuse with the best."':
    'ბატონი ანდერსონი მადლიდან, მასაჩუსეტსი, ამბობს: "სანამ ამ კურსს გავივლიდი, მდაბალი ბიტების მტრიალებელი ვიყავი. ახლა, GUE Tech-ში ნასწავლით, ნამდვილად მნიშვნელოვნად ვგრძნობ თავს და საუკეთესოებზე უკეთ ვახერხებ დაბნევასა და აზრის აღრევას."',
  'Dr. Blank had this to say: "Ten short days ago all I could look forward to was a dead-end job as a doctor. Now I have a promising future and make really big Zorkmids."':
    'დოქტორმა ბლანკმა ეს თქვა: "ათიოდე დღის წინ ჩემს მომავალში მხოლოდ უპერსპექტივო სამუშაო მელოდა ექიმად. ახლა იმედისმომცემი მომავალი მაქვს და ნამდვილად დიდ ზორკმიდებს ვშოულობ."',
  "GUE Tech can't promise these fantastic results to everyone. But when you earn your degree from GUE Tech, your future will be brighter.":
    'GUE Tech ამ ფანტასტიკურ შედეგებს ყველას ვერ დაჰპირდება. მაგრამ როცა GUE Tech-ში დიპლომს მოიპოვებ, შენი მომავალი უფრო ნათელი იქნება.',
  'You cannot reach the rope.': 'თოკს ვერ წვდები.',
  'Storm-tossed trees block your way.':
    'ქარიშხლისგან წაქცეული ხეები გზას გიღობავს.',
  'In the trophy case is an ancient parchment which appears to be a map.':
    'ჯილდოების ვიტრინაში უძველესი ეტრატია, რომელიც რუკას ჰგავს.',
  'The map shows a forest with three clearings. The largest clearing contains a house. Three paths leave the large clearing. One of these paths, leading southwest, is marked "To Stone Barrow".':
    'რუკა გვიჩვენებს ტყეს სამი მინდვრით. ყველაზე დიდ მინდორზე სახლია. დიდ მინდორს სამი ბილიკი ტოვებს. ერთ-ერთი მათგანი, რომელიც სამხრეთ-დასავლეთით მიდის, აღნიშნულია წარწერით "ქვის ყორღანისკენ".',
  'It is too narrow for most insects.':
    'ის მეტისმეტად ვიწროა მწერების უმეტესობისთვის.',
  'This cave has exits to the west and east, and narrows to a crack toward the south. The earth is particularly damp here.':
    'ამ გამოქვაბულს გასასვლელები აქვს დასავლეთითა და აღმოსავლეთით და სამხრეთისკენ ნაპრალამდე ვიწროვდება. მიწა აქ განსაკუთრებით ნესტიანია.',
  'Only Santa Claus climbs down chimneys.':
    'საკვამურებიდან მხოლოდ თოვლის ბაბუა ჩამოდის.',
  'The forest becomes impenetrable to the north.':
    'ჩრდილოეთისკენ ტყე გაუვალი ხდება.',
  'There is no tree here suitable for climbing.':
    'აქ ასასვლელად ვარგისი ხე არ არის.',
  'You try to ascend the ramp, but it is impossible, and you slide back down.':
    'ცდილობ ფერდობზე ასვლას, მაგრამ ეს შეუძლებელია და უკან ჩამოსრიალდები.',
  'The White Cliffs prevent your landing here.':
    'თეთრი კლდეები აქ ნაპირზე გადმოსვლაში გიშლის ხელს.',
  'You cannot go upstream due to strong currents.':
    'ძლიერი დინების გამო დინების საწინააღმდეგოდ ვერ წახვალ.',
  'Some invisible force prevents you from passing through the gate.':
    'რაღაც უხილავი ძალა ჭიშკარში გავლაში გიშლის ხელს.',
  'Loosely attached to a wall is a small piece of paper.':
    'კედელზე ფხვიერად მიმაგრებული პატარა ქაღალდის ნაჭერია.',
  'Congratulations!': 'გილოცავ!',
  'You are the privileged owner of ZORK I: The Great Underground Empire, a self-contained and self-maintaining universe. If used and maintained in accordance with normal operating practices for small universes, ZORK will provide many months of trouble-free operation.':
    'შენ ხარ პრივილეგირებული მფლობელი ნაწარმოებისა ZORK I: დიდი მიწისქვეშა იმპერია — ერთგვაროვანი და თვითმომვლელი სამყაროსი. თუ მცირე სამყაროების ჩვეულებრივი ექსპლუატაციის წესების შესაბამისად გამოიყენებ და მოუვლი, ZORK მრავალი თვის უპრობლემო მუშაობას გაგიწევს.',
  "It's a long way...": 'შორი გზაა...',
  'The troll neatly removes your head.': 'ტროლი მოხდენილად მოგაცილებს თავს.',
  'Fweep!': 'ფვიპ!',
  'The sound of rushing water is nearly unbearable here. On the east shore is a large landing area.':
    'მძვინვარე წყლის ხმა აქ თითქმის აუტანელია. აღმოსავლეთ ნაპირზე დიდი სადგომი მოედანია.',
  "The door is boarded and you can't remove the boards.":
    'კარი ფიცრებითაა ამოჭედილი და ფიცრებს ვერ მოაცილებ.',
  'The stream emerges from a spot too small for you to enter.':
    'ნაკადი იმდენად პატარა ადგილიდან გამოედინება, რომ ვერ შეხვალ.',
  'You are standing on a path beside a gently flowing stream. The path follows the stream, which flows from west to east.':
    'ბილიკზე დგახარ, მშვიდად მომდინარე ნაკადის გვერდით. ბილიკი ნაკადს მიჰყვება, რომელიც დასავლეთიდან აღმოსავლეთისკენ მიედინება.',
  'The prayer is inscribed in an ancient script, rarely used today. It seems to be a philippic against small insects, absent-mindedness, and the picking up and dropping of small objects. The final verse consigns trespassers to the land of the dead. All evidence indicates that the beliefs of the ancient Zorkers were obscure.':
    'ლოცვა უძველესი დამწერლობითაა ამოკვეთილი, რომელსაც დღეს იშვიათად იყენებენ. ის, როგორც ჩანს, მძაფრი ბრალდებაა პატარა მწერების, გაფანტულობისა და პატარა საგნების აღება-დაგდების წინააღმდეგ. ბოლო სტრიქონი დამრღვევებს მკვდრების სამყაროს ანდობს. ყველაფერი მიუთითებს, რომ ძველი ზორკელების რწმენა ბუნდოვანი იყო.',
  'The door is nailed shut.': 'კარი ლურსმნებითაა ჩაჭედილი.',
  'Getting tired?': 'იღლები?',
  'A small leaflet is on the ground.': 'მიწაზე პატარა ფურცელია.',
  '"WELCOME TO ZORK!': '"მოგესალმები ZORK-ში!',
  'ZORK is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals. No computer should be without one!"':
    'ZORK არის თამაში თავგადასავლების, საფრთხისა და მდაბალი ვერაგობისა. მასში ისეთ საოცარ მხარეებს გამოიკვლევ, მოკვდავთ რომ ოდესმე უხილავთ. არცერთი კომპიუტერი არ უნდა იყოს მის გარეშე!"',
  'The east wall is solid rock.': 'აღმოსავლეთის კედელი მთლიანი კლდეა.',
  "The cyclops doesn't look like he'll let you past.":
    'ციკლოპი ისე არ გამოიყურება, თითქოს გაგატარებდეს.',
  'There is a golden clockwork canary nestled in the egg. It has ruby eyes and a silver beak. Through a crystal window below its left wing you can see intricate machinery inside. It appears to have wound down.':
    'კვერცხში ოქროს მექანიკური კანარაა ჩაბუდებული. მას ლალისფერი თვალები და ვერცხლის ნისკარტი აქვს. მისი მარცხენა ფრთის ქვემოთ ბროლის სარკმელში შიგნით რთულ მექანიზმს ხედავ. ის, როგორც ჩანს, გაშლილია.',
  'The engravings were incised in the living rock of the cave wall by an unknown hand. They depict, in symbolic form, the beliefs of the ancient Zorkers. Skillfully interwoven with the bas reliefs are excerpts illustrating the major religious tenets of that time. Unfortunately, a later age seems to have considered them blasphemous and just as skillfully excised them.':
    'მოჩუქურთმებები გამოქვაბულის კედლის ცოცხალ კლდეში უცნობმა ხელმა ამოკვეთა. ისინი სიმბოლური ფორმით ასახავს ძველი ზორკელების რწმენას. ბარელიეფებში ოსტატურადაა ჩაქსოვილი ნაწყვეტები, რომლებიც იმ დროის მთავარ რელიგიურ დებულებებს ასახავს. სამწუხაროდ, მოგვიანებითმა ეპოქამ ისინი, როგორც ჩანს, მკრეხელურად ჩათვალა და ისევე ოსტატურად ამოკვეთა.',
  'The channel is too narrow.': 'კალაპოტი მეტისმეტად ვიწროა.',
  'You are on the gently flowing stream. The upstream route is too narrow to navigate, and the downstream route is invisible due to twisting walls. There is a narrow beach to land on.':
    'მშვიდად მომდინარე ნაკადზე ხარ. დინების საწინააღმდეგო გზა ნაოსნობისთვის მეტისმეტად ვიწროა, დინების ქვევითი გზა კი მოკაკული კედლების გამო არ ჩანს. ნაპირზე გადმოსასვლელად ვიწრო სანაპიროა.',
  'Climbing the walls is to no avail.': 'კედლებზე ცოცვა ფუჭია.',
  'You would need a machete to go further west.':
    'უფრო დასავლეთით წასასვლელად მაჩეტე დაგჭირდებოდა.',
  'A painting by a neglected genius is here.':
    'აქ უგულებელყოფილი გენიოსის ნახატია.',
  'The dam blocks your way.': 'კაშხალი გზას გიღობავს.',
  'Nobody seems to be awaiting your answer.':
    'როგორც ჩანს, შენს პასუხს არავინ ელოდება.',
  "You're nuts!": 'გადარეული ხარ!',
  'As the knife approaches its victim, your mind is submerged by an overmastering will. Slowly, your hand turns, until the rusty blade is an inch from your neck. The knife seems to sing as it savagely slits your throat.':
    'როცა დანა მსხვერპლს უახლოვდება, შენს გონებას უძლეველი ნება ფარავს. ნელა შემოგიბრუნდება ხელი, ვიდრე დაჟანგული პირი შენი კისრიდან ერთ დუიმში არ აღმოჩნდება. დანა თითქოს მღერის, როცა მძვინვარედ ყელს გამოგჭრის.',
  'The engravings translate to "This space intentionally left blank."':
    'მოჩუქურთმებები ითარგმნება როგორც "ეს ადგილი განზრახ დატოვებულია ცარიელი."',
  'This is a winding passage. It seems that there are only exits on the east and north.':
    'ეს მოკაკული გასასვლელია. როგორც ჩანს, გასასვლელები მხოლოდ აღმოსავლეთითა და ჩრდილოეთით არის.',
  'A look before leaping reveals that the river is wide and dangerous, with swift currents and large, half-hidden rocks. You decide to forgo your swim.':
    'ხტომამდე ერთი გადახედვა გიჩვენებს, რომ მდინარე ფართო და საშიშია, სწრაფი დინებითა და დიდი, ნახევრად დაფარული კლდეებით. გადაწყვეტ, ცურვაზე უარი თქვა.',
  'Are you out of your mind?': 'გონს ხომ არ შეიშალე?',
  'A chasm runs southwest to northeast and the path follows it. You are on the south side of the chasm, where a crack opens into a passage.':
    'უფსკრული სამხრეთ-დასავლეთიდან ჩრდილო-აღმოსავლეთისკენ გადის და ბილიკი მას მიჰყვება. უფსკრულის სამხრეთ მხარეს ხარ, სადაც ნაპრალი გასასვლელად იღება.',
  "Sounds reasonable, but this isn't how.":
    'გონივრულად ჟღერს, მაგრამ ასე არ ხდება.',
  'There is a somewhat ruined egg here.': 'აქ საკმაოდ დაზიანებული კვერცხია.',
  'The rank undergrowth prevents eastward movement.':
    'ხშირი ბუჩქნარი აღმოსავლეთით სვლას უშლის ხელს.',
  'You would drown.': 'დაიხრჩობოდი.',
  'The troll fends you off with a menacing gesture.':
    'ტროლი მუქარისმომგვრელი ჟესტით გიგერიებს.',
  "You haven't a prayer of getting the coffin down there.":
    'იქ კუბოს ჩატანის ოდნავი იმედიც კი არ გაქვს.',
  'The windows are all boarded.': 'ფანჯრები ყველა ფიცრებითაა ამოჭედილი.',
  'You probably put spinach in your gas tank, too.':
    'ალბათ ბენზინის ავზშიც ისპანახს ასხამ.',
  'There is nothing but dust there.': 'იქ მტვრის გარდა არაფერია.',
  'You have come to a dead end in the maze.': 'ლაბირინთში ჩიხში მოხვდი.',
  'There is a golden clockwork canary nestled in the egg. It seems to have recently had a bad experience. The mountings for its jewel-like eyes are empty, and its silver beak is crumpled. Through a cracked crystal window below its left wing you can see the remains of intricate machinery. It is not clear what result winding it would have, as the mainspring seems sprung.':
    'კვერცხში ოქროს მექანიკური კანარაა ჩაბუდებული. ის, როგორც ჩანს, ცოტა ხნის წინ ცუდი ამბავი გადახდა. მისი თვლისებრი თვალების ბუდეები ცარიელია და ვერცხლის ნისკარტი ჩაჭყლეტილი. მისი მარცხენა ფრთის ქვემოთ დაბზარულ ბროლის სარკმელში რთული მექანიზმის ნარჩენებს ხედავ. გაუგებარია, მისი დაჭიმვა რას მოიტანდა, რადგან მთავარი ზამბარა, როგორც ჩანს, დაზიანებულია.',
  'On the ground is a pile of leaves.': 'მიწაზე ფოთლების გროვაა.',
  "You can't even do that.": 'ამასაც კი ვერ აკეთებ.',
  'The path is too narrow.': 'ბილიკი მეტისმეტად ვიწროა.',
  'You are on a rocky, narrow strip of beach beside the Cliffs. A narrow path leads north along the shore.':
    'სანაპიროს კლდოვან, ვიწრო ზოლზე ხარ, კლდეების გვერდით. ვიწრო ბილიკი ნაპირის გასწვრივ ჩრდილოეთით მიდის.',
  'The mountains are impassable.': 'მთები გაუვალია.',
  'The forest thins out, revealing impassable mountains.':
    'ტყე თხელდება და გაუვალ მთებს ავლენს.',
  'How, exactly, can you ring that?': 'ზუსტად როგორ უნდა დარეკო ეგ?',
  'Just in time you steer away from the rocks.':
    'სწორედ დროზე უხვევ კლდეებს გვერდით.',
  'There is no safe landing spot here.':
    'აქ ნაპირზე უსაფრთხო გადმოსასვლელი ადგილი არ არის.',
  'Nothing happens.': 'არაფერი ხდება.',
  'You can land either to the east or the west.':
    'ნაპირზე ან აღმოსავლეთით, ან დასავლეთით შეგიძლია გადახვიდე.',
  'There is an enormous diamond (perfectly cut) here.':
    'აქ უზარმაზარი ბრილიანტია (იდეალურად გათლილი).',
  'A hungry cyclops is standing at the foot of the stairs.':
    'მშიერი ციკლოპი კიბის ძირში დგას.',
  'Oh ye who go about saying unto each: "Hello sailor":':
    'ჰოი, შენ, რომელიც დადიხარ და ყველას ეუბნები: "გამარჯობა, მეზღვაურო":',
  'Dost thou know the magnitude of thy sin before the gods?':
    'უწყი შენი ცოდვის სიდიადე ღმერთთა წინაშე?',
  'Yea, verily, thou shalt be ground between two stones.':
    'ჰო, ჭეშმარიტად, ორ ქვას შორის დაიფქვები.',
  'Shall the angry gods cast thy body into the whirlpool?':
    'განრისხებული ღმერთები შენს სხეულს მორევში ჩააგდებენ?',
  'An ornamented sceptre, tapering to a sharp point, is here.':
    'აქ მორთული სკიპტრაა, ბასრ წვერად ვიწროვებული.',
  "This appears to have been an artist's studio. The walls and floors are splattered with paints of 69 different colors. Strangely enough, nothing of value is hanging here. At the south end of the room is an open door (also covered with paint). A dark and narrow chimney leads up from a fireplace; although you might be able to get up it, it seems unlikely you could get back down.":
    'ეს, როგორც ჩანს, მხატვრის სახელოსნო იყო. კედლები და იატაკი 69 სხვადასხვა ფერის საღებავითაა მოთხვრილი. უცნაურია, მაგრამ აქ არაფერი ფასეული კიდია. ოთახის სამხრეთ ბოლოში ღია კარია (ისიც საღებავითაა დაფარული). ბუხრიდან ბნელი და ვიწრო საკვამური მიდის ზემოთ; თუმცა ალბათ აიხვიდოდი, ნაკლებად სავარაუდოა, რომ უკან ჩამოსვლა შეგეძლოს.',
  'There is an old trunk here, bulging with assorted jewels.':
    'აქ ძველი ზანდუკია, გვარიანი ძვირფასეულობით სავსე.',
  'The chests are all empty.': 'ყუთები ყველა ცარიელია.',
  "You wouldn't fit and would die if you could.":
    'ვერ დაეტეოდი, და თუ დაეტეოდი, მოკვდებოდი.',
  'The chasm probably leads straight to the infernal regions.':
    'უფსკრული ალბათ პირდაპირ ჯოჯოხეთურ მხარეებში მიდის.',
  'You should have looked before you leaped.': 'ხტომამდე უნდა გაგეხედა.',
  'In the movies, your life would be passing before your eyes.':
    'ფილმებში ახლა მთელი შენი ცხოვრება თვალწინ ჩაგივლიდა.',
  'Geronimo...': 'ჯერონიმო...',
  'Very good. Now you can go to the second grade.':
    'ძალიან კარგი. ახლა მეორე კლასში შეგიძლია გადახვიდე.',
  'Are you enjoying yourself?': 'გართობ?',
  'Do you expect me to applaud?': 'გელოდები, რომ ტაში დაგიკრა?',
  "You can't swim in the dungeon.": 'დილეგში ცურვა არ შეიძლება.',
  'Hello.': 'გამარჯობა.',
  'Good day.': 'დღე მშვიდობისა.',
  "Nice weather we've been having lately.": 'ბოლო ხანს კარგი ამინდი დგას.',
  'Goodbye.': 'ნახვამდის.',
  'A valiant attempt.': 'ვაჟკაცური მცდელობა.',
  "You can't be serious.": 'ხუმრობ ალბათ.',
  'An interesting idea...': 'საინტერესო იდეაა...',
  'What a concept!': 'რა ჩანაფიქრია!',
  'Look around.': 'მიმოიხედე.',
  'Too late for that.': 'ამისთვის უკვე გვიანაა.',
  'Have your eyes checked.': 'თვალები შეიმოწმე.',
  'With the leaves moved, a grating is revealed.':
    'ფოთლების გაწევის შემდეგ ცხაური ჩანს.',
  'A shimmering pot of gold appears at the end of the rainbow.':
    'ცისარტყელის ბოლოში ოქროს მოელვარე ქოთანი ჩნდება.',
  'The lamp has smashed into the floor, and the light has gone out.':
    'ფარანი იატაკზე დაიმსხვრა და შუქი ჩაქრა.',
  'You look before leaping, and realize that you would never survive.':
    'ხტომამდე გახედავ და მიხვდები, რომ ვერასდროს გადარჩებოდი.',
  'A sound, like that of flowing water, starts to come from below.':
    'ქვემოდან ხმა ისმის, მომდინარე წყლის მსგავსი.',
  'You can\'t launch that by saying "launch"!':
    '"launch"-ის თქმით ეგ წყალში ვერ ჩაუშვებ!',
  'Sorry, my memory is poor. Please give a direction.':
    'ბოდიში, მახსოვრობა მქონია ცუდი. გთხოვ, მიმართულება მითხარი.',
  "The candles won't last long now.": 'სანთლები ახლა დიდხანს ვერ გაძლებს.',
  "Your bare hands don't appear to be enough.":
    'შენი შიშველი ხელები საკმარისი არ ჩანს.',
  "I'd sooner kiss a pig.": 'ღორს უფრო ვაკოცებდი.',
  'How can you inflate that?': 'როგორ გინდა ეგ გაბერო?',
  "Why don't you just walk like normal people?":
    'რატომ უბრალოდ არ დადიხარ ნორმალური ხალხივით?',
  'The incantation echoes back faintly, but nothing else happens.':
    'შელოცვა სუსტ ექოს გამოსცემს, მაგრამ მეტი არაფერი ხდება.',
  'You will be lost without me!': 'ჩემ გარეშე დაიკარგები!',
  'Bizarre!': 'უცნაურია!',
  "You can't fit through the crack.": 'ნაპრალში ვერ ეტევი.',
  'There is no granite wall here.': 'აქ გრანიტის კედელი არ არის.',
  'The bat grabs you by the scruff of your neck and lifts you away....':
    'ღამურა კისრის ფხაში გტაცებს და მიგაქანებს....',
  'The trophy case is securely fastened to the wall.':
    'ჯილდოების ვიტრინა მყარადაა კედელზე დამაგრებული.',
  "Nobody's home.": 'სახლში არავინაა.',
  'The mirror is broken into many pieces.': 'სარკე მრავალ ნამსხვრევად გატყდა.',
  "I suppose you think it's a magic carpet?":
    'ალბათ გგონია, რომ ჯადოსნური ხალიჩაა?',
  'You are on the lake. Beaches can be seen north and south. Upstream a small stream enters the lake through a narrow cleft in the rocks. The dam can be seen downstream.':
    'ტბაზე ხარ. ჩრდილოეთითა და სამხრეთით სანაპიროები ჩანს. დინების ზევით პატარა ნაკადი ტბაში კლდეების ვიწრო ნაპრალით ჩაედინება. დინების ქვევით კაშხალი ჩანს.',
  'The cyclops seems somewhat agitated.': 'ციკლოპი ცოტათი აღელვებული ჩანს.',
  'The cyclops appears to be getting more agitated.':
    'ციკლოპი თანდათან უფრო აღელვებული ჩანს.',
  'The cyclops is moving about the room, looking for something.':
    'ციკლოპი ოთახში მოძრაობს და რაღაცას ეძებს.',
  'The cyclops was looking for salt and pepper. No doubt they are condiments for his upcoming snack.':
    'ციკლოპი მარილსა და პილპილს ეძებდა. უეჭველად ისინი მისი მომავალი საუზმის სანელებლებია.',
  'The cyclops is moving toward you in an unfriendly manner.':
    'ციკლოპი არამეგობრულად შენკენ მოდის.',
  'You have two choices: 1. Leave 2. Become dinner.':
    'ორი არჩევანი გაქვს: 1. წახვიდე 2. ვახშამი გახდე.',
  // ── Batch (Task 7, strings): lamp/candle decay, combat (cyclops/troll/
  //    thief), deaths, dam/river flavor, misc parser responses ─────────────
  'The lamp is definitely dimmer now.':
    'ფარანი ახლა ნამდვილად უფრო ბუნდოვნად ანათებს.',
  'The lamp is nearly out.': 'ფარანი ლამის ჩაქრა.',
  'The candles grow shorter.': 'სანთლები მოკლდება.',
  'Your stroke lands, but it was only the flat of the blade.':
    'შენი დარტყმა ხვდება, მაგრამ ეს მხოლოდ პირის ბრტყელი მხარე იყო.',
  'You must be joking.': 'ალბათ ხუმრობ.',
  'Slash! Your blow lands! That one hit an artery, it could be serious!':
    'ჩახ! შენი დარტყმა ხვდება! ამან არტერიას მოახვედრა, შესაძლოა სერიოზული იყოს!',
  'Slash! Your stroke connects! This could be serious!':
    'ჩახ! შენი დარტყმა ხვდება! ეს შესაძლოა სერიოზული იყოს!',
  'The Cyclops misses, but the backwash almost knocks you over.':
    'ციკლოპი ააცდენს, მაგრამ ნაქროლი ლამის წაგაქცევს.',
  'The Cyclops rushes you, but runs into the wall.':
    'ციკლოპი შენკენ მოიჭრება, მაგრამ კედელს ეჯახება.',
  'The Cyclops sends you crashing to the floor, unconscious.':
    'ციკლოპი იატაკზე გაგტყორცნის, უგონოს.',
  'The Cyclops breaks your neck with a massive smash.':
    'ციკლოპი ძლიერი დარტყმით კისერს გტეხს.',
  'A quick punch, but it was only a glancing blow.':
    'სწრაფი მუშტი, მაგრამ ეს მხოლოდ მსუბუქი დარტყმა იყო.',
  "A glancing blow from the Cyclops' fist.":
    'მსუბუქი დარტყმა ციკლოპის მუშტიდან.',
  'The monster smashes his huge fist into your chest, breaking several ribs.':
    'ურჩხული უზარმაზარ მუშტს გულმკერდში გარტყამს და რამდენიმე ნეკნს გტეხს.',
  'The Cyclops almost knocks the wind out of you with a quick punch.':
    'ციკლოპი სწრაფი მუშტით ლამის სუნთქვას შეგიკრავს.',
  'The Cyclops lands a punch that knocks the wind out of you.':
    'ციკლოპი ისეთ მუშტს გარტყამს, რომ სუნთქვას შეგიკრავს.',
  'Heedless of your weapons, the Cyclops tosses you against the rock wall of the room.':
    'შენი იარაღის უგულებელყოფით, ციკლოპი ოთახის კლდოვან კედელზე გისვრის.',
  'The Cyclops seems unable to decide whether to broil or stew his dinner.':
    'ციკლოპი, როგორც ჩანს, ვერ წყვეტს, შეწვას თუ ჩაშუშოს თავისი სადილი.',
  'The Cyclops, no sportsman, dispatches his unconscious victim.':
    'ციკლოპი, რომელიც სპორტსმენი არ არის, თავის უგონო მსხვერპლს კლავს.',
  'The axe sweeps past as you jump aside.':
    'ცული გვერდით ჩაიქროლებს, როცა გვერდზე გადახტები.',
  'The axe crashes against the rock, throwing sparks!':
    'ცული კლდეს ეჯახება და ნაპერწკლებს აყრის!',
  "The flat of the troll's axe hits you delicately on the head, knocking you out.":
    'ტროლის ცულის ბრტყელი მხარე ნაზად თავში გარტყამს და გონებას გაკარგვინებს.',
  "The troll's axe stroke cleaves you from the nave to the chops.":
    'ტროლის ცულის დარტყმა შენ თავიდან ბოლომდე გაპობს.',
  "The troll's axe removes your head.": 'ტროლის ცული თავს მოგჭრის.',
  'The axe gets you right in the side. Ouch!':
    'ცული პირდაპირ გვერდში მოგხვდება. ვაი!',
  "The flat of the troll's axe skins across your forearm.":
    'ტროლის ცულის ბრტყელი მხარე წინამხარს გაგიკაწრავს.',
  "The troll's swing almost knocks you over as you barely parry in time.":
    'ტროლის ქნევა ლამის წაგაქცევს, ძლივს ასწრებ მის აგერებას.',
  'The troll swings his axe, and it nicks your arm as you dodge.':
    'ტროლი თავის ცულს ააქნევს და ის ხელს გიკაწრავს, როცა თავს არიდებ.',
  'An axe stroke makes a deep wound in your leg.':
    'ცულის დარტყმა ფეხზე ღრმა ჭრილობას გიჩენს.',
  "The troll's axe swings down, gashing your shoulder.":
    'ტროლის ცული ქვემოთ მოიქნევა და მხარს გაგიხეთქავს.',
  'The troll hits you with a glancing blow, and you are momentarily stunned.':
    'ტროლი მსუბუქ დარტყმას გარტყამს და წამით თავბრუ გეხვევა.',
  'The troll swings; the blade turns on your armor but crashes broadside into your head.':
    'ტროლი ცულს ააქნევს; პირი შენ ჯავშანზე ისრიალებს, მაგრამ ბრტყელი მხრით თავში მოგხვდება.',
  'You stagger back under a hail of axe strokes.':
    'ცულის დარტყმათა სეტყვის ქვეშ უკან ბარბაცებ.',
  'The troll hesitates, fingering his axe.':
    'ტროლი ყოყმანობს და ცულს ისინჯავს.',
  'The troll scratches his head ruminatively: Might you be magically protected, he wonders?':
    'ტროლი ფიქრიანად თავს იქავს: ნეტა ხომ არ ხარ ჯადოთი დაცული, ფიქრობს ის?',
  'Conquering his fears, the troll puts you to death.':
    'შიშის დაძლევით, ტროლი სიკვდილით გსჯის.',
  'The thief stabs nonchalantly with his stiletto and misses.':
    'ქურდი უდარდელად დაგარტყამს თავის სტილეტს და ააცდენს.',
  'You parry a lightning thrust, and the thief salutes you with a grim nod.':
    'ელვისებურ დარტყმას იგერიებ და ქურდი პირქუში თავის დაკვრით მოგესალმება.',
  'The thief tries to sneak past your guard, but you twist away.':
    'ქურდი ცდილობს შენი თავდაცვის გვერდის ავლას, მაგრამ გვერდზე იხრი.',
  'Shifting in the midst of a thrust, the thief knocks you unconscious with the haft of his stiletto.':
    'დარტყმის შუაში მოძრაობით, ქურდი თავისი სტილეტის ტარით გონებას გაკარგვინებს.',
  'The thief knocks you out.': 'ქურდი გონებას გაკარგვინებს.',
  'Finishing you off, the thief inserts his blade into your heart.':
    'შენი მოსაკლავად, ქურდი თავის პირს გულში გიყრის.',
  'The thief comes in from the side, feints, and inserts the blade into your ribs.':
    'ქურდი გვერდიდან მოდის, მოგატყუებს და პირს ნეკნებში გიყრის.',
  'The thief bows formally, raises his stiletto, and with a wry grin, ends the battle and your life.':
    'ქურდი ოფიციალურად თავს დაგიკრავს, სტილეტს ასწევს და მრუდე ღიმილით ბრძოლასაც და შენს სიცოცხლესაც ბოლოს უღებს.',
  'A quick thrust pinks your left arm, and blood starts to trickle down.':
    'სწრაფი დარტყმა მარცხენა ხელს გიკაწრავს და სისხლი ჩამოდენას იწყებს.',
  'The thief draws blood, raking his stiletto across your arm.':
    'ქურდი სისხლს გადენის და სტილეტს ხელზე გადაგისვამს.',
  'The thief slowly approaches, strikes like a snake, and leaves you wounded.':
    'ქურდი ნელ-ნელა მოგიახლოვდება, გველივით დაგარტყამს და დაჭრილს დაგტოვებს.',
  'The thief strikes like a snake! The resulting wound is serious.':
    'ქურდი გველივით დაგარტყამს! მიყენებული ჭრილობა სერიოზულია.',
  'The thief stabs a deep cut in your upper arm.':
    'ქურდი მხარზე ღრმა ნაჭრილობას გიჩენს.',
  'The stiletto touches your forehead, and the blood obscures your vision.':
    'სტილეტი შუბლს შეგეხება და სისხლი მხედველობას გიბნელებს.',
  'The thief strikes at your wrist, and suddenly your grip is slippery with blood.':
    'ქურდი მაჯაზე დაგარტყამს და უცებ შენი ხელი სისხლისგან მოლიპულია.',
  'The songbird is not here but is probably nearby.':
    'მგალობელი ფრინველი აქ არ არის, მაგრამ ალბათ ახლომახლოა.',
  'The butt of his stiletto cracks you on the skull, and you stagger back.':
    'მისი სტილეტის ტარი თავის ქალაზე მოგხვდება და უკან ბარბაცებ.',
  'The thief rams the haft of his blade into your stomach, leaving you out of breath.':
    'ქურდი თავისი პირის ტარს მუცელში გარტყამს და სუნთქვას შეგიკრავს.',
  'The thief attacks, and you fall back desperately.':
    'ქურდი თავს დაგესხმება და სასოწარკვეთით უკან იხევ.',
  'The thief, a man of superior breeding, pauses for a moment to consider the propriety of finishing you off.':
    'ქურდი, აღზრდილი კაცი, წამით ჩერდება, რათა აწონ-დაწონოს, რამდენად მართებულია შენი მოკვლა.',
  'The thief amuses himself by searching your pockets.':
    'ქურდი შენი ჯიბეების ჩხრეკით ერთობა.',
  'The thief entertains himself by rifling your pack.':
    'ქურდი შენი ბარგის ფათურით ერთობა.',
  'The thief, forgetting his essentially genteel upbringing, cuts your throat.':
    'ქურდი, რომელსაც თავისი არსებითად კეთილშობილური აღზრდა ავიწყდება, ყელს გამოგჭრის.',
  'The thief, a pragmatist, dispatches you as a threat to his livelihood.':
    'ქურდი, პრაგმატიკოსი, გკლავს, როგორც საფრთხეს თავისი ლუკმაპურისთვის.',
  "You're not at the house.": 'სახლთან არ ხარ.',
  'That hiding place is too obvious.': 'ის სამალავი მეტისმეტად აშკარაა.',
  "You didn't say with what!": 'არ თქვი, რითი!',
  'Your image in the mirror looks tired.':
    'შენი ანარეკლი სარკეში დაღლილი ჩანს.',
  "If you insist.... Poof, you're dead!": 'თუ დაიჟინებ.... ფუჰ, მკვდარი ხარ!',
  'The water cools the bell and is evaporated.':
    'წყალი ზარს აგრილებს და ორთქლდება.',
  'It is an integral part of the control panel.':
    'ეს სამართავი დაფის განუყოფელი ნაწილია.',
  'You nearly burn your hand trying to extinguish the flame.':
    'ლამის ხელი დაიწვი, როცა ალის ჩაქრობას ცდილობ.',
  'You have it.': 'ის შენ გაქვს.',
  'The sluice gates are closed. The water level in the reservoir is quite low, but the level is rising quickly.':
    'საფურვებლები დახურულია. წყლის დონე წყალსაცავში საკმაოდ დაბალია, მაგრამ დონე სწრაფად იწევს.',
  'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been extremely wealthy.':
    'ეს მშვენიერი კოლონიური სტილის სახლია, თეთრად შეღებილი. ცხადია, რომ მისი მფლობელები უაღრესად მდიდრები უნდა ყოფილიყვნენ.',
  'Failed.': 'ვერ მოხერხდა.',
  'You cannot talk to that!': 'მას ვერ ელაპარაკები!',
  'Some paint chips away, revealing more paint.':
    'საღებავის ნაწილი ჩამოცვივა და მის ქვეშ კიდევ საღებავი ჩანს.',
  "You can't do that.": 'ამას ვერ აკეთებ.',
  'No chance. Some moron punctured it.':
    'არავითარ შემთხვევაში. ვიღაც ბრიყვმა გაუხვრიტა.',
  'A force keeps you from taking the bodies.':
    'რაღაც ძალა გამშლის გვამების აღებაში.',
  'The water level has dropped to the point at which the boat can no longer stay afloat. It sinks into the mud.':
    'წყლის დონე იმდენად დაიწია, რომ ნავი ვეღარ ტივტივებს. ის ტალახში იძირება.',
  "The windows are boarded and can't be opened.":
    'ფანჯრები ფიცრებითაა ამოჭედილი და ვერ იღება.',
  "You can't pick that.": 'მას ვერ აჭრი.',
  'The viscous material oozes into your hand.': 'ბლანტი მასალა ხელში ჩაგდის.',
  'There is nothing to fill it with.': 'მის გასავსები არაფერია.',
  'Oh, no! You have walked into the slavering fangs of a lurking grue!':
    'ვაი! ჩასაფრებული გრუს ნერწყვიან ეშვებში შეუხვედი!',
  "You'll have to do that on your own.": 'ეს თავად უნდა გააკეთო.',
  'The voice of the guardian of the dungeon booms out from the darkness, "Your disrespect costs you your life!" and places your head on a sharp pole.':
    'დილეგის მცველის ხმა სიბნელიდან გრიალებს: "შენი უპატივცემულობა სიცოცხლეს დაგიჯდება!" და შენ თავს ბასრ პალოზე ამოაგებს.',
  "You have broken the mirror. I hope you have a seven years' supply of good luck handy.":
    'სარკე გატეხე. იმედია, შვიდი წლის მარაგი იღბლისა ხელთ გაქვს.',
  'Well, you seem to have been brushing your teeth with some sort of glue. As a result, your mouth gets glued together (with your nose) and you die of respiratory failure.':
    'აბა, როგორც ჩანს, კბილებს რაღაც წებოთი იხეხავდი. შედეგად პირი (ცხვირთან ერთად) გეწებება და სუნთქვის უკმარისობით კვდები.',
  "Those things aren't here!": 'ის ნივთები აქ არ არის!',
  "You can't spin that!": 'მას ვერ ატრიალებ!',
  'FCD#3 was constructed in year 783 of the Great Underground Empire to harness the mighty Frigid River. This work was supported by a grant of 37 million zorkmids from your omnipotent local tyrant Lord Dimwit Flathead the Excessive. This impressive structure is composed of 370,000 cubic feet of concrete, is 256 feet tall at the center, and 193 feet wide at the top. The lake created behind the dam has a volume of 1.7 billion cubic feet, an area of 12 million square feet, and a shore line of 36 thousand feet.':
    'FCD#3 აშენდა დიდი მიწისქვეშა იმპერიის 783 წელს ძლევამოსილი მდინარე ფრიჯიდის დასამორჩილებლად. ეს სამუშაო 37 მილიონი ზორკმიდის გრანტით დააფინანსა შენმა ყოვლისშემძლე ადგილობრივმა ტირანმა, ლორდმა დიმვიტ ფლეტჰედ ზედმეტმა. ეს შთამბეჭდავი ნაგებობა 370,000 კუბური ფუტი ბეტონისგან შედგება, ცენტრში 256 ფუტის სიმაღლისაა და თავზე 193 ფუტის სიგანის. კაშხლის უკან შექმნილ ტბას აქვს 1.7 მილიარდი კუბური ფუტის მოცულობა, 12 მილიონი კვადრატული ფუტის ფართობი და 36 ათასი ფუტის სანაპირო ხაზი.',
  'The water level behind the dam is low: The sluice gates have been opened. Water rushes through the dam and downstream.':
    'წყლის დონე კაშხლის უკან დაბალია: საფურვებლები გაიღო. წყალი კაშხალში და დინების ქვევით მოედინება.',
  "You can't push things to that.": 'მისკენ ნივთებს ვერ აწვები.',
  'The window closes (more easily than it opened).':
    'ფანჯარა იხურება (უფრო ადვილად, ვიდრე გაიღო).',
  'The bell is very hot and cannot be taken.':
    'ზარი ძალიან ცხელია და ვერ აიღება.',
  'The door swings shut and closes.': 'კარი მოიქნევა და იხურება.',
  "It's too dark to see!": 'მეტისმეტად ბნელია, რომ რამე დაინახო!',
  'A troll is here.': 'აქ ტროლია.',
  'The book is already open to page 569.':
    'წიგნი უკვე 569-ე გვერდზეა გადაშლილი.',
  'A pathetically babbling troll is here.': 'აქ საცოდავად ბურტყუნა ტროლია.',
  'An unconscious troll is sprawled on the floor. All passages out of the room are open.':
    'უგონო ტროლი იატაკზე გართხმულა. ოთახიდან ყველა გასასვლელი ღიაა.',
  'You cannot close that.': 'მას ვერ ხურავ.',
  'The leaves burn, and so do you.': 'ფოთლები იწვის და შენც.',
  'The west wall is solid granite here.':
    'დასავლეთის კედელი აქ მთლიანი გრანიტია.',
  'The grating opens to reveal trees above you.':
    'ცხაური იღება და შენ ზემოთ ხეებს ავლენს.',
  "It's in the bottle. Perhaps you should take that instead.":
    'ის ბოთლშია. ალბათ ჯობს, ბოთლი აიღო.',
  "I'm afraid that the leap you attempted has done you in.":
    'ვშიშობ, რომ ნახტომმა, რომელიც სცადე, ბოლო მოგიღო.',
  'Hanging down from the railing is a rope which ends about ten feet from the floor below.':
    'მოაჯირიდან თოკი ჩამოკიდია, რომელიც ქვემოთ იატაკიდან დაახლოებით ათ ფუტში მთავრდება.',
  "It's really dark in here....": 'აქ ნამდვილად ბნელა....',
  'How can you drink that?': 'მას როგორ უნდა დალიო?',
  'You are lifted up by the rising river! You try to swim, but the currents are too strong. You come closer, closer to the awesome structure of Flood Control Dam #3. The dam beckons to you. The roar of the water nearly deafens you, but you remain conscious as you tumble over the dam toward your certain doom among the rocks at its base.':
    'მოზღვავებული მდინარე ზევით აგწევს! ცურვას ცდილობ, მაგრამ დინება მეტისმეტად ძლიერია. უფრო და უფრო უახლოვდები წყალდიდობის მაკონტროლებელი კაშხალი #3-ის შემზარავ ნაგებობას. კაშხალი გიხმობს. წყლის გრუხუნი ლამის ყურს გიყრუებს, მაგრამ გონს არ კარგავ, როცა კაშხალს გადააგორდები მისი ძირის კლდეებში შენი გარდუვალი აღსასრულისკენ.',
  'The room is full of water and cannot be entered.':
    'ოთახი წყლითაა სავსე და ვერ შეხვალ.',
  "I'm afraid you have done drowned yourself.": 'ვშიშობ, რომ თავი დაიხრჩვე.',
  'The rising water carries the boat over the dam, down the river, and over the falls. Tsk, tsk.':
    'მოზღვავებული წყალი ნავს კაშხალს გადააგორებს, მდინარეზე ჩაიტანს და ჩანჩქერზე გადააქანებს. ეჰ, ეჰ.',
  'In other words, fighting the fierce currents of the Frigid River. You manage to hold your own for a bit, but then you are carried over a waterfall and into some nasty rocks. Ouch!':
    'სხვა სიტყვებით, მდინარე ფრიჯიდის სასტიკ დინებას ებრძვი. ცოტა ხანს ახერხებ წინააღმდეგობას, მაგრამ მერე ჩანჩქერზე გადაგაქანებენ და საზიზღარ კლდეებში მოგახვედრებენ. ვაი!',
  'The bell is too hot to touch.': 'ზარი მეტისმეტად ცხელია, რომ ხელი ახლო.',
  'You could certainly never tie it with that!':
    'მას ნამდვილად ვერასოდეს მიაბამ!',
  'Above you is a grating.': 'შენ ზემოთ ცხაურია.',
  'The cyclops, tired of all of your games and trickery, grabs you firmly. As he licks his chops, he says "Mmm. Just like Mom used to make \'em." It\'s nice to be appreciated.':
    'ციკლოპი, შენი თამაშებითა და ეშმაკობით დაღლილი, მაგრად გტაცებს. ტუჩებს ილოკავს და ამბობს: "მმმ. ზუსტად ისე, როგორც დედა ამზადებდა." სასიამოვნოა, როცა გაფასებენ.',
  'It could very well be too late!': 'შესაძლოა, უკვე გვიანიც კი იყოს!',
  'Talking to yourself is said to be a sign of impending mental collapse.':
    'ამბობენ, რომ საკუთარ თავთან ლაპარაკი მოახლოებული ფსიქიკური ჩამოშლის ნიშანია.',
  'The spirits jeer loudly and ignore you.':
    'სულები ხმამაღლა დასცინიან და უგულებელგყოფენ.',
  'The bell is too hot to reach.': 'ზარი მეტისმეტად ცხელია, რომ ხელი მისწვდე.',
  'A booming voice says "Wrong, cretin!" and you notice that you have turned into a pile of dust. How, I can\'t imagine.':
    'გრიალა ხმა ამბობს: "შეცდი, კრეტინო!" და შენიშნავ, რომ მტვრის გროვად იქეცი. როგორ, წარმოდგენა არ მაქვს.',
  'There is a worthless piece of canvas here.': 'აქ უსარგებლო ტილოს ნაჭერია.',
  'Aaaarrrrgggghhhh!': 'აააარრრრღღღღჰჰჰ!',
  "That's silly!": 'ეს სისულელეა!',
  'The structural integrity of the rainbow is severely compromised, leaving you hanging in midair, supported only by water vapor. Bye.':
    'ცისარტყელის სტრუქტურული მთლიანობა მძიმედ დაირღვა და ჰაერში გამოგკიდა, მხოლოდ წყლის ორთქლის ამარა. ნახვამდის.',
  'Shaken.': 'შენჯღრეულია.',
  'You splash around for a while, fighting the current, then you drown.':
    'ცოტა ხანს იფართხალებ, დინებას ებრძვი, მერე კი იხრჩობი.',
  'The tube refuses to accept anything.': 'ტუბი არაფრის მიღებას ამბობს უარს.',
  "Unfortunately, the magic boat doesn't provide protection from the rocks and boulders one meets at the bottom of waterfalls. Including this one.":
    'სამწუხაროდ, ჯადოსნური ნავი არ იცავს იმ კლდეებისა და ლოდებისგან, რომლებსაც ჩანჩქერების ძირში ხვდები. ამ ჩანჩქერის ჩათვლით.',
  'Another pathetic sputter, this time from you, heralds your drowning.':
    'კიდევ ერთი საცოდავი ბუყბუყი, ამჯერად შენგან, შენს დახრჩობას ამცნობს.',
  "It's solid granite.": 'ეს მთლიანი გრანიტია.',
  'The hole collapses, smothering you.': 'ორმო ჩამოიქცევა და გახშობს.',
  'That was just a bit too far down.': 'ეს უბრალოდ ცოტა მეტისმეტად ქვემოთ იყო.',

  // ── Batch (Task 7, strings): off-path responses, parser errors, deaths ──
  'I beg your pardon?': 'უკაცრავად?',
  'Do you wish to restart? (Y is affirmative):':
    'გსურს თავიდან დაწყება? (Y ნიშნავს კი):',
  'Well, you really did it that time. Is suicide painless?':
    'ჰო, ამჯერად ნამდვილად მოახერხე. ნეტავ თვითმკვლელობა უმტკივნეულოა?',
  "It appears that that last blow was too much for you. I'm afraid you are dead.":
    'როგორც ჩანს, ის უკანასკნელი დარტყმა შენთვის მეტისმეტი იყო. ვშიშობ, რომ მკვდარი ხარ.',
  "You can't talk to the sailor that way.": 'მეზღვაურს ასე ვერ ელაპარაკები.',
  'The water slips through your fingers.': 'წყალი თითებიდან გისხლტება.',
  'The FROBOZZ Corporation created, owns, and operates this dungeon.':
    'ეს დილეგი FROBOZZ-ის კორპორაციამ შექმნა, მას ეკუთვნის და ის განაგებს.',
  'Naturally!': 'რა თქმა უნდა!',
  'The pines and the hemlocks seem to be murmuring.':
    'ფიჭვები და სოჭები თითქოს ჩურჩულებენ.',
  'You can hear the sound of flowing water from below.':
    'ქვემოდან მოედინე წყლის ხმა გესმის.',
  'All of a sudden, an alarmingly loud roaring sound fills the room. Filled with fear, you scramble away.':
    'უცებ ოთახს შემზარავად ხმამაღალი გრუხუნი ავსებს. შიშით შეპყრობილი, ჩქარა გარბიხარ.',
  'It makes no sound but is always lurking in the darkness nearby.':
    'ის ხმას არ გამოსცემს, მაგრამ ყოველთვის ახლომახლო სიბნელეში ჩასაფრებულა.',
  'The disk is correct.': 'დისკი სწორია.',
  '** Disk Failure **': '** დისკის ავარია **',
  'Beats me.': 'წარმოდგენა არ მაქვს.',
  'How peculiar!': 'რა უცნაურია!',
  "You're inside of it!": 'შენ მის შიგნით ხარ!',
  'The door cannot be opened.': 'კარის გაღება შეუძლებელია.',
  'It is far too large to carry.': 'ის მეტისმეტად დიდია, რომ ატარო.',
  'The grating is closed!': 'ცხაური დახურულია!',
  "You can't go that way.": 'იქით ვერ წახვალ.',
  'There is no sailor to be seen.': 'არავითარი მეზღვაური არ ჩანს.',
  'You seem to be repeating yourself.': 'როგორც ჩანს, თავს იმეორებ.',
  'I think that phrase is getting a bit worn out.':
    'მგონი, ეს ფრაზა უკვე ცოტა გაცვდა.',
  'Nothing happens here.': 'აქ არაფერი ხდება.',
  'The grue is a sinister, lurking presence in the dark places of the earth. Its favorite diet is adventurers, but its insatiable appetite is tempered by its fear of light. No grue has ever been seen by the light of day, and few have survived its fearsome jaws to tell the tale.':
    'გრუ ბოროტი, ჩასაფრებული არსებაა დედამიწის ბნელ კუთხეებში. მისი საყვარელი საკვები თავგადასავლების მაძიებლები არიან, მაგრამ მის გაუმაძღარ მადას სინათლის შიში აკავებს. დღის სინათლეზე არც ერთი გრუ არავის უნახავს და მცირედს თუ გადაურჩა მისი საშინელი ყბები, რომ ამბავი ეამბნა.',
  "There is no grue here, but I'm sure there is at least one lurking in the darkness nearby. I wouldn't let my light go out if I were you!":
    'აქ გრუ არ არის, მაგრამ დარწმუნებული ვარ, ახლომახლო სიბნელეში სულ მცირე ერთი მაინც ჩასაფრებულა. შენ რომ ვიყო, ჩემს სინათლეს ჩაქრობას არ დავანებებდი!',
  'Only you can do that.': 'ამის გაკეთება მხოლოდ შენ შეგიძლია.',
  'Auto-cannibalism is not the answer.': 'თვითკანიბალიზმი არ არის გამოსავალი.',
  'Suicide is not the answer.': 'თვითმკვლელობა არ არის გამოსავალი.',
  'How romantic!': 'რა რომანტიკულია!',
  "That's difficult unless your eyes are prehensile.":
    'ეს ძნელია, თუ შენი თვალები საჭიდი არ არის.',
  'You must specify a direction to go.':
    'უნდა მიუთითო, რომელი მიმართულებით წახვიდე.',
  "I can't help you there....": 'აქ ვერ დაგეხმარები....',
  'Not a chance.': 'არავითარ შემთხვევაში.',
  'The zorkmid is the unit of currency of the Great Underground Empire.':
    'ზორკმიდი დიდი მიწისქვეშა იმპერიის ფულის ერთეულია.',
  'The best way to find zorkmids is to go out and look for them.':
    'ზორკმიდების პოვნის საუკეთესო გზა ისაა, რომ გახვიდე და მოძებნო.',
  "It's too dark to see.": 'მეტისმეტად ბნელა, რომ რამე დაინახო.',
  "It's not clear what you're referring to.": 'გაუგებარია, რას გულისხმობ.',
  "There's nothing here you can take.": 'აქ არაფერია, რის აღებაც შეგეძლება.',
  "I don't see what you are referring to.": 'ვერ ვხედავ, რას გულისხმობ.',
  "I can't help your clumsiness.": 'შენს მოუქნელობას ვერ ვუშველი.',
  "Sorry, you can't correct mistakes in quoted text.":
    'უკაცრავად, ციტირებულ ტექსტში შეცდომებს ვერ ასწორებ.',
  'Warning: only the first word after OOPS is used.':
    'გაფრთხილება: OOPS-ის შემდეგ მხოლოდ პირველი სიტყვა გამოიყენება.',
  'There was no word to replace!': 'შესაცვლელი სიტყვა არ ყოფილა!',
  'Beg pardon?': 'უკაცრავად?',
  "It's difficult to repeat fragments.": 'ფრაგმენტების გამეორება ძნელია.',
  'That would just repeat a mistake.': 'ეს მხოლოდ შეცდომას გაიმეორებდა.',
  "I couldn't understand that sentence.": 'ის წინადადება ვერ გავიგე.',
  'There were too many nouns in that sentence.':
    'იმ წინადადებაში მეტისმეტად ბევრი არსებითი სახელი იყო.',
  'Please consult your manual for the correct way to talk to other people or creatures.':
    'გთხოვ, შენს სახელმძღვანელოს გადახედო, რომ გაიგო, როგორ ელაპარაკები სხვა ხალხს ან არსებებს.',
  'There was no verb in that sentence!': 'იმ წინადადებაში ზმნა არ ყოფილა!',
  "That sentence isn't one I recognize.": 'იმ წინადადებას ვერ ვცნობ.',
  "That question can't be answered.": 'იმ კითხვაზე პასუხის გაცემა შეუძლებელია.',
  '"I don\'t understand! What are you referring to?"':
    '„ვერ გავიგე! რას გულისხმობ?“',
  'There seems to be a noun missing in that sentence!':
    'როგორც ჩანს, იმ წინადადებაში არსებითი სახელი აკლია!',
  "I don't see what you're referring to.": 'ვერ ვხედავ, რას გულისხმობ.',
  "You don't have that!": 'ეს არ გაქვს!',
  'Maximum verbosity.': 'მაქსიმალური სიტყვაუხვობა.',
  'Brief descriptions.': 'მოკლე აღწერები.',
  'Superbrief descriptions.': 'უმოკლესი აღწერები.',
  'You are empty-handed.': 'ხელცარიელი ხარ.',
  'Do you wish to leave the game? (Y is affirmative):':
    'გსურს თამაშის დატოვება? (Y ნიშნავს კი):',
  'Restarting.': 'ხელახლა ვიწყებ.',
  'Verifying disk...': 'დისკს ვამოწმებ...',
  'Illegal call to #RND.': '#RND-ის დაუშვებელი გამოძახება.',
  'A hollow voice says "Fool."': 'ღრუ ხმა ამბობს: „სულელო.“',
  "He's wide awake, or haven't you noticed...":
    'ის სრულიად ფხიზელია, ან ვერ შენიშნე...',
  "You can't blast anything by using words.": 'სიტყვებით ვერაფერს ააფეთქებ.',
  'If you wish, but heaven only knows why.':
    'თუ გსურს, მაგრამ ღმერთმა იცის, რატომ.',
  'Bug? Not in a flawless program like this! (Cough, cough).':
    'ხარვეზი? ასეთ უნაკლო პროგრამაში არა! (ხველა, ხველა).',
  'Preposterous!': 'სისულელეა!',
  'There are no climbable trees here.': 'აქ ასასვლელი ხეები არ არის.',
  "You can't do that!": 'ამას ვერ გააკეთებ!',
  'It is already closed.': 'ის უკვე დახურულია.',
  'Well, for one, you are playing Zork...':
    'მაგალითად, თუნდაც ის, რომ ZORK-ს თამაშობ...',
  'You have lost your mind.': 'ჭკუა დაკარგე.',
  "You can't cross that!": 'მას ვერ გადაკვეთ!',
  "Insults of this nature won't help you.": 'ამგვარი შეურაცხყოფა არ გიშველის.',
  'Such language in a high-class establishment like this!':
    'ასეთი ენა ამ მაღალი დონის დაწესებულებაში!',
  "Not a bright idea, especially since you're in it.":
    'არცთუ ჭკვიანური აზრია, მითუმეტეს, რომ შენ მის შიგნით ხარ.',
  'Come on, now!': 'მოდი ერთი!',
  "There's no reason to be digging here.": 'აქ თხრის არც ერთი მიზეზი არ არის.',
  "You're not in that!": 'შენ მის შიგნით არ ხარ!',
  'You realize that getting out here would be fatal.':
    'ხვდები, რომ აქ გადმოსვლა საბედისწერო იქნებოდა.',
  "You're not holding that.": 'ამას ხელში არ გიჭირავს.',
  'Thank you very much. It really hit the spot.':
    'დიდი მადლობა. ნამდვილად კარგად მომივიდა.',
  "There isn't any water here.": 'აქ წყალი არ არის.',
  'Thank you very much. I was rather thirsty (from all this talking, probably).':
    'დიდი მადლობა. საკმაოდ მწყუროდა (ალბათ ამდენი ლაპარაკისგან).',
  'You are left in the dark...': 'სიბნელეში დარჩი...',
  'What a bizarre concept!': 'რა უცნაური აზრია!',
  "There's nothing to fill it with.": 'არაფერია, რითაც შეავსებ.',
  "You may know how to do that, but I don't.":
    'შენ შეიძლება იცი, როგორ გააკეთო ეს, მაგრამ მე არ ვიცი.',
  "Within six feet of your head, assuming you haven't left that somewhere.":
    'შენი თავიდან ექვს ფუტში, თუ ის სადმე არ დაგიტოვებია.',
  "You're around here somewhere...": 'სადღაც აქვე ხარ...',
  'You find it.': 'მას პოულობ.',
  "It's right here.": 'ის ზუსტად აქ არის.',
  'It is already off.': 'ის უკვე გამორთულია.',
  "You can't turn that off.": 'მას ვერ გამორთავ.',
  'It is already on.': 'ის უკვე ჩართულია.',
  "You can't turn that on.": 'მას ვერ ჩართავ.',
  "That's pretty weird.": 'ეს საკმაოდ უცნაურია.',
  'That would be a good trick.': 'ეს კარგი ხრიკი იქნებოდა.',
  'This was not a very safe place to try jumping.':
    'ეს ხტომის საცდელად არცთუ უსაფრთხო ადგილი იყო.',
  'In a feat of unaccustomed daring, you manage to land on your feet without killing yourself.':
    'უჩვეულო გამბედაობის წყალობით ფეხებზე დაშვებას ახერხებ ისე, რომ თავს არ იკლავ.',
  "It doesn't seem to work.": 'როგორც ჩანს, არ მუშაობს.',
  'There is nothing special to be seen.': 'განსაკუთრებული არაფერი ჩანს.',
  "You aren't an accomplished enough juggler.":
    'საკმარისად გაწაფული ჟონგლიორი არ ხარ.',
  "You'll have to speak up if you expect me to hear you!":
    'უფრო ხმამაღლა უნდა ილაპარაკო, თუ გინდა, რომ მოგისმინო!',
  'Nice try.': 'კარგი მცდელობაა.',
  "Wasn't he a sailor?": 'ის მეზღვაური ხომ არ იყო?',
  'It is already open.': 'ის უკვე ღიაა.',
  "You're not in anything!": 'შენ არაფრის შიგნით არ ხარ!',
  'Huh?': 'ჰა?',
  "You can't pour that.": 'მას ვერ დაღვრი.',
  'If you pray enough, your prayers may be answered.':
    'თუ საკმარისად ილოცებ, შენს ლოცვებს შესაძლოა გიპასუხონ.',
  'How can you do that?': 'როგორ უნდა გააკეთო ეს?',
  "There's no room.": 'ადგილი არ არის.',
  'What a (ahem!) strange idea.': 'რა (ჰმ!) უცნაური აზრია.',
  'It is impossible to read in the dark.': 'სიბნელეში კითხვა შეუძლებელია.',
  'Say what?': 'რა ბრძანე?',
  'Talking to yourself is a sign of impending mental collapse.':
    'საკუთარ თავთან ლაპარაკი მოახლოებული ფსიქიკური ჩამოშლის ნიშანია.',
  'You find nothing unusual.': 'არაფერ უჩვეულოს პოულობ.',
  "That doesn't make sends.": 'ამას ასრი არა აქვს.',
  'Foo!': 'ფუჰ!',
  'This seems to have no effect.':
    'როგორც ჩანს, ამას არანაირი ეფექტი არა აქვს.',
  "You can't take it; thus, you can't shake it!":
    'მას ვერ აიღებ; მაშასადამე, ვერც შეანჯღრევ!',
  'How singularly useless.': 'რა უაღრესად უსარგებლოა.',
  'You are already standing, I think.': 'მგონი, უკვე ფეხზე დგახარ.',
  'Go jump in a lake!': 'წადი და ტბაში გადახტი!',
  'Whoosh!': 'შრიალ!',
  'You are already wearing it.': 'ის უკვე გაცვია.',
  'You already have that!': 'ეს უკვე გაქვს!',
  "You can't reach something that's inside a closed container.":
    'ვერ მისწვდები იმას, რაც დახურული ჭურჭლის შიგნითაა.',
  'That would involve quite a contortion!': 'ეს საკმაო გრეხას მოითხოვდა!',

  // ── Batch 7-strings delta (parser/movement/forest/combat/dam/cyclops) ────
  'Thrown.': 'ნასროლია.',
  "You can't throw anything off of that!": 'იქიდან ვერაფერს გადააგდებ!',
  "You can't turn that!": 'მას ვერ დაატრიალებ!',
  'Time passes...': 'დრო გადის...',
  'There are odd noises in the darkness, and there is no exit in that direction.':
    'სიბნელეში უცნაური ხმებია და იმ მიმართულებით გასასვლელი არ არის.',
  'Use compass directions for movement.':
    'გადასაადგილებლად კომპასის მიმართულებები გამოიყენე.',
  "It's here!": 'აქ არის!',
  'You should supply a direction!': 'მიმართულება უნდა მიუთითო!',
  'With luck, your wish will come true.':
    'იღბალი თუ გექნება, შენი სურვილი ახდება.',
  'At your service!': 'სამსახურში ვარ!',
  'You are likely to be eaten by a grue.': 'დიდი ალბათობით გრუ შეგჭამს.',
  "Only bats can see in the dark. And you're not one.":
    'სიბნელეში მხოლოდ ღამურები ხედავენ. შენ კი ღამურა არ ხარ.',
  'You are carrying:': 'შენთან არის:',
  'Your hand passes through its object.': 'შენი ხელი მის სამიზნეს გაივლის.',
  "You're holding too many things already!": 'უკვე ისედაც ბევრი რამ გიჭირავს!',
  "You can't go there without a vehicle.":
    'იქ სატრანსპორტო საშუალების გარეშე ვერ წახვალ.',
  'There are sinister gurgling noises in the darkness all around you!':
    'შენ ირგვლივ სიბნელეში ბოროტი ხორხოცის ხმებია!',
  'You have moved into a dark place.': 'ბნელ ადგილას გადახვედი.',
  'A secret path leads southwest into the forest.':
    'საიდუმლო ბილიკი სამხრეთ-დასავლეთით, ტყისკენ მიდის.',
  'The boards are securely fastened.': 'ფიცრები მყარადაა მიმაგრებული.',
  "Dental hygiene is highly recommended, but I'm not sure what you want to brush them with.":
    'კბილების ჰიგიენა მეტად სასურველია, მაგრამ არ მესმის, რითი გინდა მათი გახეხვა.',
  'The east wall is solid granite here.':
    'აქ აღმოსავლეთის კედელი მთლიანი გრანიტია.',
  'It only SAYS "Granite Wall".': 'მასზე უბრალოდ წერია „გრანიტის კედელი“.',
  "The wall isn't granite.": 'კედელი გრანიტისა არ არის.',
  "You can't hear the songbird now.": 'ახლა მგალობელ ფრინველს ვერ გაიგონებ.',
  "It can't be followed.": 'მას ვერ გაჰყვები.',
  'Why not find your brains?': 'რატომ არ მოძებნი ჯერ შენს ჭკუას?',
  'It seems to be to the west.': 'როგორც ჩანს, დასავლეთითაა.',
  'It was here just a minute ago....': 'წუთის წინ აქ იყო....',
  "It's right here! Are you blind or something?":
    'სწორედ აქ არის! ბრმა ხარ თუ რა?',
  'The window is closed.': 'ფანჯარა დახურულია.',
  "I can't see how to get in from here.": 'ვერ ვხედავ, აქედან როგორ შევიდე.',
  "You aren't even in the forest.": 'ტყეში ხომ არც კი ხარ.',
  'You will have to specify a direction.': 'მიმართულება უნდა მიუთითო.',
  'You cannot see the forest for the trees.': 'ხეებს ტყე ვერ დაგინახვებია.',
  "Don't you believe me? The mountains are impassable!":
    'არ მჯერი? მთები გადაულახავია!',
  'The bottle is closed.': 'ბოთლი დახურულია.',
  'The bottle is now full of water.': 'ბოთლი ახლა წყლითაა სავსე.',
  'The water spills to the floor and evaporates immediately.':
    'წყალი იატაკზე იღვრება და მყისვე ორთქლდება.',
  'The water splashes on the walls and evaporates immediately.':
    'წყალი კედლებზე იშხეფება და მყისვე ორთქლდება.',
  'The window is slightly ajar, but not enough to allow entry.':
    'ფანჯარა ოდნავ მოღებულია, მაგრამ არა იმდენად, რომ შესვლა შესაძლებელი იყოს.',
  'Only the ceremony itself has any effect.':
    'მხოლოდ თავად ცერემონიას აქვს რაიმე ეფექტი.',
  'How can you attack a spirit with material objects?':
    'როგორ უნდა შეუტიო სულს მატერიალური საგნებით?',
  'You seem unable to interact with these spirits.':
    'როგორც ჩანს, ამ სულებთან ურთიერთობას ვერ ახერხებ.',
  'The basket is at the other end of the chain.':
    'კალათა ჯაჭვის მეორე ბოლოშია.',
  'The cage is securely fastened to the iron chain.':
    'გალია მყარადაა მიმაგრებული რკინის ჯაჭვზე.',
  "You can't reach him; he's on the ceiling.": 'მას ვერ მისწვდები; ის ჭერზეა.',
  'Ding, dong.': 'დინ-დონ.',
  'The heat from the bell is too intense.': 'ზარის სითბო მეტისმეტად ძლიერია.',
  "You can't break the windows open.": 'ფანჯრებს გატეხვით ვერ გააღებ.',
  'The nails, deeply imbedded in the door, cannot be removed.':
    'ლურსმნები, კარში ღრმად ჩასობილი, ვერ გამოიძრობა.',
  'There are no stairs leading down.': 'ქვემოთ მიმავალი კიბე არ არის.',
  'ZORK: The Great Underground Empire.': 'ZORK: დიდი მიწისქვეშა იმპერია.',
  'The door is too heavy.': 'კარი მეტისმეტად მძიმეა.',
  'You see a rickety staircase descending into darkness.':
    'ბნელში ჩამავალ რყევად კიბეს ხედავ.',
  "It's closed.": 'დახურულია.',
  'The door is locked from above.': 'კარი ზემოდანაა ჩაკეტილი.',
  'The door closes and locks.': 'კარი იხურება და იკეტება.',
  'Going up empty-handed is a bad idea.': 'ხელცარიელი ასვლა ცუდი აზრია.',
  "You can't get up there with what you're carrying.":
    'იქ ვერ ახვალ იმით, რაც გიჭირავს.',
  'Having moved the carpet previously, you find it impossible to move it again.':
    'ხალიჩა უკვე გადაწიე, ამიტომ მის ხელახლა გადაწევას ვერ ახერხებ.',
  'The rug is extremely heavy and cannot be carried.':
    'ხალიჩა უაღრესად მძიმეა და მისი ზიდვა შეუძლებელია.',
  'Underneath the rug is a closed trap door. As you drop the corner of the rug, the trap door is once again concealed from view.':
    'ხალიჩის ქვეშ დახურული საიდუმლო ხაფანგ-კარია. როცა ხალიჩის კუთხეს უშვებ, საიდუმლო ხაფანგ-კარი ისევ თვალს ეფარება.',
  'As you sit, you notice an irregularity underneath it. Rather than be uncomfortable, you stand up again.':
    'როცა ჯდები, ქვეშ რაღაც უსწორმასწორობას ამჩნევ. იმის ნაცვლად, რომ მოუხერხებლად იჯდე, ისევ დგები.',
  "The troll isn't much of a conversationalist.":
    'ტროლი დიდი მოსაუბრე არ არის.',
  'The troll, angered and humiliated, recovers his weapon. He appears to have an axe to grind with you.':
    'ტროლი, განრისხებული და დამცირებული, თავის იარაღს იბრუნებს. როგორც ჩანს, შენთან ცული აქვს გასასწორებელი.',
  'The troll stirs, quickly resuming a fighting stance.':
    'ტროლი იძვრის და სწრაფად ისევ საბრძოლო პოზას იღებს.',
  'The troll scratches his head in confusion, then takes the axe.':
    'ტროლი თავს იფხანს დაბნეული, შემდეგ კი ცულს იღებს.',
  'The troll spits in your face, grunting "Better luck next time" in a rather barbarous accent.':
    'ტროლი სახეში გაფურთხებს და ღრუტუნით ამბობს „მეტი იღბალი შემდეგ ჯერზე“ საკმაოდ ბარბაროსული აქცენტით.',
  'The troll laughs at your puny gesture.':
    'ტროლი შენს მიზერულ ჟესტს დასცინის.',
  'Every so often the troll says something, probably uncomplimentary, in his guttural tongue.':
    'დროდადრო ტროლი რაღაცას ამბობს, ალბათ არცთუ მაამებელს, თავის ხორხისმიერ ენაზე.',
  "Unfortunately, the troll can't hear you.":
    'სამწუხაროდ, ტროლი შენ ვერ გისმენს.',
  'In disturbing the pile of leaves, a grating is revealed.':
    'ფოთლების გროვის აშლისას ცხაური ჩნდება.',
  'There are 69,105 leaves here.': 'აქ 69,105 ფოთელია.',
  'The leaves burn.': 'ფოთლები იწვის.',
  'You rustle the leaves around, making quite a mess.':
    'ფოთლებს აქეთ-იქით ფშვნი და საკმაო არეულობას ქმნი.',
  'Underneath the pile of leaves is a grating. As you release the leaves, the grating is once again concealed from view.':
    'ფოთლების გროვის ქვეშ ცხაურია. როცა ფოთლებს უშვებ, ცხაური ისევ თვალს ეფარება.',
  'You are in a clearing, with a forest surrounding you on all sides. A path leads south.':
    'მინდორზე ხარ, ყველა მხრიდან ტყით გარშემორტყმული. ბილიკი სამხრეთით მიდის.',
  'There is an open grating, descending into darkness.':
    'აქ ღია ცხაურია, რომელიც ბნელში ჩადის.',
  'There is a grating securely fastened into the ground.':
    'აქ ცხაურია, მიწაში მყარად ჩამაგრებული.',
  'You are in a small room near the maze. There are twisty passages in the immediate vicinity.':
    'ლაბირინთთან ახლოს, პატარა ოთახში ხარ. ახლომახლო გრეხილი გასასვლელებია.',
  'Above you is an open grating with sunlight pouring in.':
    'შენ ზემოთ ღია ცხაურია, საიდანაც მზის შუქი იღვრება.',
  'Above you is a grating locked with a skull-and-crossbones lock.':
    'შენ ზემოთ ცხაურია, თავის ქალისა და ჯვარედინი ძვლების საკეტით ჩაკეტილი.',
  'The grate is locked.': 'ცხაური ჩაკეტილია.',
  "You can't lock it from this side.": 'ამ მხრიდან მას ვერ ჩაკეტავ.',
  'The grate is unlocked.': 'ცხაური გაღებულია.',
  "You can't reach the lock from here.": 'აქედან საკეტს ვერ მისწვდები.',
  "You can't pick the lock.": 'საკეტს ვერ ამტვრევ.',
  'A pile of leaves falls onto your head and to the ground.':
    'ფოთლების გროვა თავზე გცვივა და მიწაზე ეცემა.',
  'The grating is locked.': 'ცხაური ჩაკეტილია.',
  "It won't fit through the grating.": 'ცხაურში არ გაეტევა.',
  "You won't be able to get back up to the tunnel you are going through when it gets to the next room.":
    'იმ გვირაბში ვეღარ ახვალ, რომელშიც გადიხარ, როცა ის შემდეგ ოთახამდე მიაღწევს.',
  'As you touch the rusty knife, your sword gives a single pulse of blinding blue light.':
    'როცა დაჟანგულ დანას ეხები, შენი მახვილი ერთ აფეთქებას იძლევა თვალისმომჭრელი ლურჯი შუქისას.',
  'A ghost appears in the room and is appalled at your desecration of the remains of a fellow adventurer. He casts a curse on your valuables and banishes them to the Land of the Living Dead. The ghost leaves, muttering obscenities.':
    'ოთახში მოჩვენება ჩნდება, რომელსაც აზარებს ის, რომ თანამოძმე თავგადასავლების მაძიებლის ნეშტს ბილწავ. ის შენს ძვირფასეულობას წყევლას ადებს და ცოცხალ-მკვდრების სამყაროში აძევებს. მოჩვენება მიდის, უხამსობებს ბურტყუნებს.',
  'The torch is burning.': 'ჩირაღდანი იწვის.',
  'The water evaporates before it gets close.': 'წყალი მიახლოებამდე ორთქლდება.',
  'Unfortunately, the mirror has been destroyed by your recklessness.':
    'სამწუხაროდ, სარკე შენმა გაუფრთხილებლობამ გაანადგურა.',
  'There is an ugly person staring back at you.':
    'იქიდან საზიზღარი ადამიანი გიყურებს მიშტერებული.',
  'The mirror is many times your size. Give up.':
    'სარკე შენზე ბევრად დიდია. ხელი აიღე.',
  "Haven't you done enough damage already?":
    'ჯერ კიდევ არ მოგიყენებია საკმარისი ზიანი?',
  'As you enter the dome you feel a strong pull as if from a wind drawing you over the railing and down.':
    'როცა გუმბათში შედიხარ, ძლიერ მიზიდვას გრძნობ, თითქოს ქარი მოაჯირის გადაღმა, ქვემოთ გითრევდეს.',
  "You aren't equipped for an exorcism.": 'ეგზორციზმისთვის მზად არ ხარ.',
  'The tension of this ceremony is broken, and the wraiths, amused but shaken at your clumsy attempt, resume their hideous jeering.':
    'ამ ცერემონიის დაძაბულობა ირღვევა და აჩრდილები, შენი მოუხერხებელი მცდელობით გართულ-შეშფოთებულნი, ისევ აგრძელებენ თავიანთ საზარელ დაცინვას.',
  'The bell appears to have cooled down.': 'როგორც ჩანს, ზარი გაცივდა.',
  'The sluice gates are open, and water rushes through the dam. The water level behind the dam is still high.':
    'საფურვებლები ღიაა და წყალი კაშხალში მოედინება. კაშხლის უკან წყლის დონე ჯერ კიდევ მაღალია.',
  'The sluice gates close and water starts to collect behind the dam.':
    'საფურვებლები იხურება და წყალი კაშხლის უკან გროვდება.',
  "The bolt won't turn with your best effort.":
    'ხრახნი მთელი ძალისხმევის მიუხედავად არ ბრუნდება.',
  "Hmm. It appears the tube contained glue, not oil. Turning the bolt won't get any easier....":
    'ჰმ. როგორც ჩანს, ტუბში წებო იყო და არა ზეთი. ხრახნის ბრუნვა უფრო ადვილი ვერ გახდება....',
  'The boat lifts gently out of the mud and is now floating on the reservoir.':
    'ნავი ტალახიდან ნაზად ამოდის და ახლა წყალსაცავზე ცურავს.',
  'You notice that the water level has risen to the point that it is impossible to cross.':
    'ამჩნევ, რომ წყლის დონე იმდენად აიწია, რომ გადაკვეთა შეუძლებელია.',
  'The roar of rushing water is quieter now.':
    'მძვინვარე წყლის ღრიალი ახლა უფრო ჩუმია.',
  'The water level is now quite low here and you could easily cross over to the other side.':
    'წყლის დონე აქ ახლა საკმაოდ დაბალია და ადვილად შეგიძლია მეორე მხარეს გადახვიდე.',
  "They're greek to you.": 'შენთვის ეს ჩინური ენაა.',
  'There is a rumbling sound and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe).':
    'გრუხუნი ისმის და ოთახის აღმოსავლეთ კედლიდან თითქოს წყლის ნაკადი ამოხეთქავს (როგორც ჩანს, მილში ჟონვა გაჩნდა).',
  'The blue button appears to be jammed.':
    'ლურჯი ღილაკი, როგორც ჩანს, ჩასობილია.',
  'The chests are so rusty and corroded that they crumble when you touch them.':
    'ყუთები იმდენად დაჟანგული და გახრწნილია, რომ შეხებისთანავე იშლება.',
  'The chests are already open.': 'ყუთები უკვე ღიაა.',
  'By some miracle of Zorkian technology, you have managed to stop the leak in the dam.':
    'ზორკული ტექნოლოგიის რაღაც სასწაულით კაშხალში ჟონვის შეჩერება მოახერხე.',
  "The all-purpose gunk isn't a lubricant.":
    'უნივერსალური წებო საპოხი მასალა არ არის.',
  'The tube is apparently empty.': 'ტუბი, როგორც ჩანს, ცარიელია.',
  '---> Frobozz Magic Gunk Company <---':
    '---> FROBOZZ-ის ჯადოსნური წებოს კომპანია <---',
  'All-Purpose Gunk': 'უნივერსალური წებო',
  'Are you the little Dutch boy, then? Sorry, this is a big dam.':
    'ის პატარა ჰოლანდიელი ბიჭი ხომ არ ხარ? ვწუხვარ, ეს დიდი კაშხალია.',
  'You are in a long room. To the north is a large lake, too deep to cross. You notice, however, that the water level appears to be dropping at a rapid rate. Before long, it might be possible to cross to the other side from here.':
    'გრძელ ოთახში ხარ. ჩრდილოეთით დიდი ტბაა, გადასაკვეთად მეტისმეტად ღრმა. თუმცა ამჩნევ, რომ წყლის დონე, როგორც ჩანს, სწრაფად ეცემა. მალე იქნებ შესაძლებელი გახდეს აქედან მეორე მხარეს გადასვლა.',
  'You are in a long room, to the north of which is a wide area which was formerly a reservoir, but now is merely a stream. You notice, however, that the level of the stream is rising quickly and that before long it will be impossible to cross here.':
    'გრძელ ოთახში ხარ, რომლის ჩრდილოეთით ფართო არეა, ადრე რომ წყალსაცავი იყო, ახლა კი მხოლოდ ნაკადია. თუმცა ამჩნევ, რომ ნაკადის დონე სწრაფად იწევს და მალე აქ გადაკვეთა შეუძლებელი იქნება.',
  'You notice that the water level here is rising rapidly. The currents are also becoming stronger. Staying here seems quite perilous!':
    'ამჩნევ, რომ წყლის დონე აქ სწრაფად იწევს. დინებებიც ძლიერდება. აქ დარჩენა საკმაოდ სახიფათოდ ჩანს!',
  'You are in a large cavernous area. To the south is a wide lake, whose water level appears to be falling rapidly.':
    'დიდ გამოქვაბულისებრ არეში ხარ. სამხრეთით ფართო ტბაა, რომლის წყლის დონე, როგორც ჩანს, სწრაფად ეცემა.',
  'You are in a cavernous area, to the south of which is a very wide stream. The level of the stream is rising rapidly, and it appears that before long it will be impossible to cross to the other side.':
    'გამოქვაბულისებრ არეში ხარ, რომლის სამხრეთით ძალიან ფართო ნაკადია. ნაკადის დონე სწრაფად იწევს და, როგორც ჩანს, მალე მეორე მხარეს გადასვლა შეუძლებელი იქნება.',
  'You are in a large cavernous room, north of a large lake.':
    'დიდ გამოქვაბულისებრ ოთახში ხარ, დიდი ტბის ჩრდილოეთით.',
  'The bottle hits the far wall and shatters.':
    'ბოთლი შორეულ კედელს ეჯახება და იმსხვრევა.',
  'A brilliant maneuver destroys the bottle.':
    'ბრწყინვალე მანევრი ბოთლს ანადგურებს.',
  'The water spills to the floor and evaporates.':
    'წყალი იატაკზე იღვრება და ორთქლდება.',
  "No use talking to him. He's fast asleep.":
    'მასთან ლაპარაკს აზრი არა აქვს. ის ღრმად სძინავს.',
  'The cyclops is sleeping like a baby, albeit a very ugly one.':
    'ციკლოპს ჩვილივით სძინავს, თუმცა ძალიან საზიზღარი ჩვილივით.',
  'The cyclops yawns and stares at the thing that woke him up.':
    'ციკლოპი ამთქნარებს და იმ ნივთს მიშტერებია, რომელმაც გააღვიძა.',
  'The cyclops says "Mmm Mmm. I love hot peppers! But oh, could I use a drink. Perhaps I could drink the blood of that thing." From the gleam in his eye, it could be surmised that you are "that thing".':
    'ციკლოპი ამბობს: „მმმ მმმ. მწარე წიწაკა მიყვარს! მაგრამ, ეჰ, რა კარგი იქნებოდა, რომ რამე დამელია. იქნებ იმ ნივთის სისხლი დავლიო.“ მისი თვალის ბრჭყვიალიდან ხვდები, რომ „ის ნივთი“ შენ ხარ.',
  "The cyclops takes the bottle, checks that it's open, and drinks the water. A moment later, he lets out a yawn that nearly blows you over, and then falls fast asleep (what did you put in that drink, anyway?).":
    'ციკლოპი ბოთლს იღებს, რწმუნდება, რომ ღიაა, და წყალს სვამს. წამის შემდეგ ისეთ მთქნარებას იწყებს, რომ ლამის გადაგაბრუნებს, შემდეგ კი ღრმად იძინებს (საინტერესოა, რა ჩაასხი იმ სასმელში?).',
  'The cyclops apparently is not thirsty and refuses your generous offer.':
    'ციკლოპს, როგორც ჩანს, წყალი არ სწყურია და შენს გულუხვ შეთავაზებაზე უარს ამბობს.',
  'The cyclops may be hungry, but there is a limit.':
    'ციკლოპი იქნებ მშიერია, მაგრამ ყველაფერს აქვს ზღვარი.',
  'The cyclops is not so stupid as to eat THAT!':
    'ციკლოპი ისეთი სულელი არ არის, რომ ის შეჭამოს!',

  // ── Batch (Task 7, strings — FINAL FR-key delta): cyclops/thief/troll
  //    combat & flavor, boat/egg/rope, candles/matches, deaths, parser ─────
  '"Do you think I\'m as stupid as my father was?", he says, dodging.':
    '„გგონია, ისეთი სულელი ვარ, როგორიც მამაჩემი იყო?“ — ამბობს ის და თავს არიდებს.',
  'The cyclops shrugs but otherwise ignores your pitiful attempt.':
    'ციკლოპი მხრებს იჩეჩავს, თორემ შენს საცოდავ მცდელობას უგულებელყოფს.',
  "The cyclops doesn't take kindly to being grabbed.":
    'ციკლოპს არ ეხალისება, რომ ხელს ავლებ.',
  'You cannot tie the cyclops, though he is fit to be tied.':
    'ციკლოპს ვერ შეკრავ, თუმცა შესაკრავად სავსებით ვარგა.',
  'You can hear his stomach rumbling.': 'გესმის, როგორ უყრუტუნებს კუჭი.',
  'The cyclops is sleeping blissfully at the foot of the stairs.':
    'ციკლოპს ნეტარად სძინავს კიბის ძირში.',
  'The east wall, previously solid, now has a cyclops-sized opening in it.':
    'აღმოსავლეთ კედელს, ადრე მთლიანს, ახლა ციკლოპის ზომის ხვრელი აქვს.',
  "The cyclops is standing in the corner, eyeing you closely. I don't think he likes you very much. He looks extremely hungry, even for a cyclops.":
    'ციკლოპი კუთხეში დგას და ყურადღებით გათვალიერებს. მგონი, დიდად არ მოსწონხარ. ის უაღრესად მშიერი ჩანს, ციკლოპისთვისაც კი.',
  'The cyclops, having eaten the hot peppers, appears to be gasping. His enflamed tongue protrudes from his man-sized mouth.':
    'ციკლოპი, რომელმაც მწარე წიწაკა შეჭამა, როგორც ჩანს, ქშინავს. მისი აალებული ენა ადამიანის ზომის პირიდან გამოშვერილა.',
  'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward.':
    'ეს დიდი ოთახია, რომლის ჭერიც მიწიდან ვერ ჩანს. ვიწრო გასასვლელი აღმოსავლეთიდან დასავლეთისკენ მიდის და ქვის კიბე ზემოთ.',
  'The room is eerie in its quietness.': 'ოთახი თავისი სიჩუმით შემზარავია.',
  'The room is deafeningly loud with an undetermined rushing sound. The sound seems to reverberate from all of the walls, making it difficult even to think.':
    'ოთახი ყურისწამღები ხმაურითაა სავსე, რაღაც გაურკვეველი გრიალით. ხმა, როგორც ჩანს, ყველა კედლიდან ირეკლება, ისე, რომ ფიქრიც კი ჭირს.',
  "It is unbearably loud here, with an ear-splitting roar seeming to come from all around you. There is a pounding in your head which won't stop. With a tremendous effort, you scramble out of the room.":
    'აქ აუტანლად ხმაურია, ყურის გამხეთქავი ღრიალი თითქოს შენ ირგვლივ ყველგნიდან მოდის. თავში ბაგუნი გაქვს, რომელიც არ ჩერდება. უზარმაზარი ძალისხმევით ოთახიდან ჩქარა გაძვრები.',
  'The rest of your commands have been lost in the noise.':
    'შენი დანარჩენი ბრძანებები ხმაურში დაიკარგა.',
  "That's only your opinion.": 'ეს მხოლოდ შენი აზრია.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down.':
    'ღრმა კანიონის სამხრეთ კიდეზე ხარ. გასასვლელები აღმოსავლეთით, ჩრდილო-დასავლეთითა და სამხრეთ-დასავლეთით მიდის. კიბე ქვემოთ მიდის.',
  'You can hear a loud roaring sound, like that of rushing water, from below.':
    'ქვემოდან ხმამაღალი გრუხუნი ისმის, მძვინვარე წყლის მსგავსი.',
  'Your opponent, determining discretion to be the better part of valor, decides to terminate this little contretemps. With a rueful nod of his head, he steps backward into the gloom and disappears.':
    'შენი მოწინააღმდეგე, რომელმაც გადაწყვიტა, რომ სიფრთხილე გმირობაზე უკეთესია, ამ პატარა შეხლა-შემოხლის შეწყვეტას ირჩევს. ნანვით თავს დაიქნევს, უკან, ბნელში გადადგამს ფეხს და ქრება.',
  'The holder of the large bag just left, looking disgusted. Fortunately, he took nothing.':
    'დიდი ტომრის პატრონი ახლახან წავიდა, გაბრაზებული იერით. საბედნიეროდ, არაფერი წაიღო.',
  'The thief, finding nothing of value, left disgusted.':
    'ქურდმა, რომელმაც ფასეული ვერაფერი იპოვა, გაბრაზებული წავიდა.',
  'A "lean and hungry" gentleman just wandered through, carrying a large bag. Finding nothing of value, he left disgruntled.':
    '„გამხდარი და მშიერი“ ჯენტლმენი ახლახან გაიარა, დიდი ტომრის მტარებელი. ფასეული ვერაფერი იპოვა და უკმაყოფილო წავიდა.',
  'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from your possession, mumbling something about "Doing unto others before..."':
    'უმსგავსო იერსახის ვინმე დიდი ტომრით ახლახან ოთახში გაიარა. გავლისას ჩუმად მოგტაცა ცოტა ძვირფასეულობა და რაღაცას ბურტყუნებდა: „სხვებს დააწიე, სანამ ისინი...“',
  'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from the room, mumbling something about "Doing unto others before..."':
    'უმსგავსო იერსახის ვინმე დიდი ტომრით ახლახან ოთახში გაიარა. გავლისას ჩუმად მოიპარა ცოტა ძვირფასეულობა ოთახიდან და რაღაცას ბურტყუნებდა: „სხვებს დააწიე, სანამ ისინი...“',
  'The thief seems to have left you in the dark.':
    'ქურდმა, როგორც ჩანს, სიბნელეში მიგატოვა.',
  'The thief is a strong, silent type.': 'ქურდი ძლიერი, ჩუმი ტიპია.',
  'The thief, being temporarily incapacitated, is unable to acknowledge your greeting with his usual graciousness.':
    'ქურდი, დროებით უძლური, შენს მისალმებას თავისი ჩვეული თავაზიანობით ვერ უპასუხებს.',
  'You missed. The thief makes no attempt to take the knife, though it would be a fine addition to the collection in his bag. He does seem angered by your attempt.':
    'ააცდინე. ქურდი არ ცდილობს, დანა აიღოს, თუმცა ის მის ტომარაში არსებულ კოლექციას კარგად შეემატებოდა. ის, როგორც ჩანს, შენი მცდელობით გაბრაზდა.',
  'Your proposed victim suddenly recovers consciousness.':
    'შენი სავარაუდო მსხვერპლი უეცრად გონს მოდის.',
  'Once you got him, what would you do with him?': 'მას რომ დაიჭერ, რას უზამ?',
  "The thief is a slippery character with beady eyes that flit back and forth. He carries, along with an unmistakable arrogance, a large bag over his shoulder and a vicious stiletto, whose blade is aimed menacingly in your direction. I'd watch out if I were you.":
    'ქურდი მოლიპული ტიპია, წვრილი თვალებით, რომლებიც აქეთ-იქით აცეცებენ. ის, თავის უცილობელ ქედმაღლობასთან ერთად, მხარზე დიდ ტომარასა და ბოროტ სტილეტს ატარებს, რომლის პირიც მუქარით შენკენაა მიმართული. შენ რომ ვიყო, ფრთხილად ვიქნებოდი.',
  'The thief says nothing, as you have not been formally introduced.':
    'ქურდი არაფერს ამბობს, რადგან ოფიციალურად არ წარგიდგენიათ ერთმანეთი.',
  'His booty remains.': 'მისი ნადავლი რჩება.',
  'The robber revives, briefly feigning continued unconsciousness, and, when he sees his moment, scrambles away from you.':
    'ყაჩაღი გონს მოდის, ცოტა ხანს უგონობას მოაჩვენებს თავს, და როცა მომენტს იხელთებს, შენგან ჩქარა გარბის.',
  'Sadly for you, the robber collapsed on top of the bag. Trying to take it would wake him.':
    'შენდა სამწუხაროდ, ყაჩაღი ტომარაზე დაემხო. მისი აღების მცდელობა მას გააღვიძებდა.',
  'The bag will be taken over his dead body.':
    'ტომარა მხოლოდ მისი გვამის გადალახვით თუ წაერთმევა.',
  'It would be a good trick.': 'ეს კარგი ხრიკი იქნებოდა.',
  'Getting close enough would be a good trick.':
    'საკმარისად ახლოს მისვლა კარგი ხრიკი იქნებოდა.',
  "The bag is underneath the thief, so one can't say what, if anything, is inside.":
    'ტომარა ქურდის ქვეშაა, ამიტომ ვერ იტყვი, შიგნით თუ რამეა და რა.',
  "You'd be stabbed in the back first.": 'ჯერ ზურგში დაგარტყამდნენ.',
  "You can't. It's not a very good chalice, is it?":
    'ვერ შეძლებ. არცთუ კარგი თასია, არა?',
  'You cannot burn this door.': 'ამ კარს ვერ დაწვავ.',
  "You can't seem to damage the door.":
    'კარის დაზიანებას, როგორც ჩანს, ვერ ახერხებ.',
  "It won't open.": 'არ იღება.',
  'As hard as you try, the book cannot be closed.':
    'რაც არ უნდა ეცადო, წიგნი ვერ დაიხურება.',
  'Beside page 569, there is only one other page with any legible printing on it. Most of it is unreadable, but the subject seems to be the banishment of evil. Apparently, certain noises, lights, and prayers are efficacious in this regard.':
    '569-ე გვერდის გარდა, მხოლოდ კიდევ ერთ გვერდზეა რამე გასარჩევი ნაბეჭდი. მისი უმეტესი ნაწილი წაუკითხავია, მაგრამ თემა, როგორც ჩანს, ბოროტების განდევნაა. ცხადია, ამ მხრივ გარკვეული ხმები, შუქები და ლოცვები ძალისმიერია.',
  "Congratulations! Unlike the other vandals, who merely stole the artist's masterpieces, you have destroyed one.":
    'გილოცავ! სხვა ვანდალებისგან განსხვავებით, რომლებიც უბრალოდ იპარავდნენ მხატვრის შედევრებს, შენ ერთი გაანადგურე.',
  "A burned-out lamp won't light.": 'დამწვარი ფარანი არ აინთება.',
  'The lamp has already burned out.': 'ფარანი უკვე დაიწვა.',
  'It is securely anchored.': 'ის მყარადაა დამაგრებული.',
  "I'm afraid that you have run out of matches.":
    'ვშიშობ, რომ ასანთი გამოგელია.',
  'This room is drafty, and the match goes out instantly.':
    'ეს ოთახი ნიავიანია და ასანთი მყისვე ქრება.',
  'The match is out.': 'ასანთი ჩამქრალია.',
  'The match is burning.': 'ასანთი იწვის.',
  "The matchbook isn't very interesting, except for what's written on it.":
    'ასანთის კოლოფი დიდად საინტერესო არ არის, იმის გარდა, რაც მასზე წერია.',
  "Alas, there's not much left of the candles. Certainly not enough to burn.":
    'ვაჰ, სანთლები ბევრი აღარ დარჩა. ნამდვილად არა იმდენი, რომ ენთოს.',
  '(with the match)': '(ასანთით)',
  // NATIVE-REVIEW-DRAFT — parser implicit-instrument parenthetical (gparser.zil
  // GWIM; the auto-suppliable WEAPON/TOOL/FLAMEBIT set from zork1/gsyntax.zil +
  // 1dungeon.zil). Per-object INSTRUMENTAL ("(X-ით)") NAMING the weapon/tool —
  // Ovid's naturalness call, upgrading the caseless drop-noun "(ამით)" which STAYS
  // as the leak-proof fallback template in zork1.ka.templates.ts for any object
  // not pinned here. String pins beat the {obj} template by specificity (match.ts),
  // so each listed instrument gets its named form and everything else drops to
  // "(ამით)". §4 case: a nominative in -ი drops it + adds -ით (მახვილი→მახვილით);
  // -ა truncates + -ით (დანა→დანით, მასალა→მასალით, სკიპტრა→სკიპტრით); -ო is stable
  // + -თი (ტუმბო→ტუმბოთი). torch/candles use the syncopated oblique stem the
  // corpus already attests (ჩირაღდნ-, სანთლ-). ⚠ = multi-word adj+noun / numeral /
  // genitive-chain: the head noun is declined, the attributive adjective keeps its
  // -ი citation form (which IS the instrumental attributive agreement) — flagged
  // for native review of the agreement. See notes/georgian-composed-line-review.md.
  '(with the sword)': '(მახვილით)',
  '(with the stiletto)': '(სტილეტით)',
  '(with the sceptre)': '(სკიპტრით)',
  '(with the torch)': '(ჩირაღდნით)', // syncope ჩირაღდანი→ჩირაღდნ- (corpus-attested)
  '(with the shovel)': '(ნიჩაბით)',
  '(with the screwdriver)': '(სახრახნისით)',
  '(with the nasty knife)': '(საზიზღარი დანით)', // ⚠ adj+noun
  '(with the rusty knife)': '(დაჟანგული დანით)', // ⚠ adj+noun
  '(with the bloody axe)': '(სისხლიანი ცულით)', // ⚠ adj+noun
  '(with the skeleton key)': '(ღია გასაღებით)', // ⚠ adj+noun
  '(with the viscous material)': '(ბლანტი მასალით)', // ⚠ adj+noun
  '(with the wrench)': '(ქანჩის გასაღებით)', // genitive compound 'nut-key'
  '(with the pair of candles)': '(ორი სანთლით)', // ⚠ numeral + syncope (სანთლ-)
  '(with the hand-held air pump)': '(ხელის ჰაერის ტუმბოთი)', // ⚠ genitive chain
  'You should say what to light them with.': 'უნდა თქვა, რითი აანთო ისინი.',
  'You realize, just in time, that the candles are already lighted.':
    'სწორედ დროზე მიხვდები, რომ სანთლები უკვე ანთია.',
  'The heat from the torch is so intense that the candles are vaporized.':
    'ჩირაღდნის სითბო იმდენად ძლიერია, რომ სანთლები ორთქლდება.',
  "You have to light them with something that's burning, you know.":
    'ისინი რაღაც მოგიზგიზე საგნით უნდა აანთო, ხომ იცი.',
  "Let's see, how many objects in a pair? Don't tell me, I'll get it.":
    'აბა ვნახოთ, რამდენი საგანია წყვილში? ნუ მეუბნები, მე თვითონ მივხვდები.',
  'The flame is extinguished.': 'ალი ჩაქრა.',
  'The candles are not lighted.': 'სანთლები ანთებული არ არის.',
  "That wouldn't be smart.": 'ეს ჭკვიანური არ იქნებოდა.',
  'It is now completely dark.': 'ახლა სრულიად ბნელია.',
  'Your sword is glowing very brightly.':
    'შენი მახვილი ძალიან კაშკაშად ანათებს.',
  'Oh dear. It appears that the smell coming from this room was coal gas. I would have thought twice about carrying flaming objects in here.':
    'ვაი, ვაი. როგორც ჩანს, ამ ოთახიდან მომავალი სუნი ნახშირის გაზი იყო. ორჯერ დავფიქრდებოდი, აქ მოგიზგიზე საგნების შემოტანის წინ.',
  'A large vampire bat, hanging from the ceiling, swoops down at you!':
    'დიდი ვამპირი ღამურა, ჭერიდან ჩამოკიდებული, შენკენ ეშვება!',
  "It's not clear how to turn it on with your bare hands.":
    'გაუგებარია, შიშველი ხელებით როგორ ჩართო.',
  "The machine doesn't seem to want to do anything.":
    'მანქანას, როგორც ჩანს, არაფრის გაკეთება არ უნდა.',
  'The slag was rather insubstantial, and crumbles into dust at your touch.':
    'წიდა საკმაოდ მყიფე იყო და შეხებისთანავე მტვრად იშლება.',
  'The rainbow seems to have become somewhat run-of-the-mill.':
    'ცისარტყელა, როგორც ჩანს, ცოტათი ჩვეულებრივი გახდა.',
  'A dazzling display of color briefly emanates from the sceptre.':
    'სკიპტრიდან ფერთა თვალისმომჭრელი ჩვენება იღვრება ცოტა ხნით.',
  'A solid rainbow spans the falls.': 'მყარი ცისარტყელა ჩანჩქერს გადაჰკვეთს.',
  'From here?!?': 'აქედან?!?',
  "You'll have to say which way...": 'უნდა თქვა, რომელი მხარეს...',
  'Can you walk on water vapor?': 'წყლის ორთქლზე სიარული შეგიძლია?',
  'The Frigid River flows under the rainbow.':
    'მდინარე ფრიჯიდი ცისარტყელის ქვეშ მიედინება.',
  'Well done. The boat is repaired.': 'ყოჩაღ. ნავი შეკეთებულია.',
  'You should get in the boat then launch it.':
    'ჯერ ნავში უნდა ჩაჯდე, მერე წყალში ჩაუშვა.',
  "Read the label for the boat's instructions.":
    'ნავის ინსტრუქციისთვის ეტიკეტი წაიკითხე.',
  "You can't launch it here.": 'მას აქ წყალში ვერ ჩაუშვებ.',
  "You're not in the boat!": 'ნავში არ ხარ!',
  'Oops! Something sharp seems to have slipped and punctured the boat. The boat deflates to the sounds of hissing, sputtering, and cursing.':
    'უი! რაღაც ბასრი, როგორც ჩანს, გასხლტა და ნავი გაუხვრიტა. ნავი იშვება ჩხრიალის, ფშვინვისა და გინების ხმებზე.',
  'Inflating it further would probably burst it.':
    'მისი მეტად გაბერვა ალბათ გასკდენდა.',
  "You can't deflate the boat while you're in it.":
    'ნავიდან ჰაერს ვერ გაუშვებ, სანამ მის შიგნით ხარ.',
  'The boat must be on the ground to be deflated.':
    'ნავი მიწაზე უნდა იყოს, რომ ჰაერი გაუშვა.',
  'The boat deflates.': 'ნავი იშვება.',
  'The boat must be on the ground to be inflated.':
    'ნავი მიწაზე უნდა იყოს, რომ გაიბეროს.',
  "You don't have enough lung power to inflate it.":
    'მის გასაბერად საკმარისი ფილტვების ძალა არ გაქვს.',
  'You notice something funny about the feel of the buoy.':
    'ამჩნევ, რომ ბაკანი შეხებისას რაღაცნაირად უცნაურია.',
  'On the ground below you can see:': 'ქვემოთ, მიწაზე, ხედავ:',
  'The nest falls to the ground, and the egg spills out of it, seriously damaged.':
    'ბუდე მიწაზე ვარდება და კვერცხი მისგან გადმოვარდება, სერიოზულად დაზიანებული.',
  'The egg falls to the ground and springs open, seriously damaged.':
    'კვერცხი მიწაზე ვარდება და იღება, სერიოზულად დაზიანებული.',
  'The egg is already open.': 'კვერცხი უკვე ღიაა.',
  'You have neither the tools nor the expertise.':
    'არც ხელსაწყოები გაქვს, არც გამოცდილება.',
  'I doubt you could do that without damaging it.':
    'ეჭვი მაქვს, რომ ამას მის დაუზიანებლად შეძლებდე.',
  'The egg is now open, but the clumsiness of your attempt has seriously compromised its esthetic appeal.':
    'კვერცხი ახლა ღიაა, მაგრამ შენი მცდელობის მოუქნელობამ მისი ესთეტიკური მიმზიდველობა სერიოზულად შეარყია.',
  'There is a noticeable crunch from beneath you, and inspection reveals that the egg is lying open, badly damaged.':
    'შენ ქვეშ შესამჩნევი ხრაშუნი ისმის და დათვალიერება ცხადყოფს, რომ კვერცხი ღია დევს, მძიმედ დაზიანებული.',
  'Your rather indelicate handling of the egg has caused it some damage, although you have succeeded in opening it.':
    'კვერცხთან შენმა საკმაოდ უხეშმა მოპყრობამ მას ცოტა ზიანი მიაყენა, თუმცა მისი გახსნა მაინც მოახერხე.',
  'The canary chirps blithely, if somewhat tinnily, for a short time.':
    'კანარა მხიარულად, თუმცა ცოტა ლითონისებრად, ცოტა ხანს ჭიკჭიკებს.',
  'There is an unpleasant grinding noise from inside the canary.':
    'კანარას შიგნიდან უსიამოვნო ღრჭიალი ისმის.',
  'The cliff is too steep for climbing.': 'კლდე ასასვლელად მეტისმეტად ციცაბოა.',
  'That would be very unwise. Perhaps even fatal.':
    'ეს ძალიან უგუნური იქნებოდა. შესაძლოა საბედისწეროც კი.',
  'The rope is already tied to it.': 'თოკი უკვე მასზეა მიბმული.',
  'The rope is now untied.': 'თოკი ახლა ახსნილია.',
  'It is not tied to anything.': 'ის არაფერზეა მიბმული.',
  'The rope drops gently to the floor below.':
    'თოკი ნაზად ვარდება ქვემოთ, იატაკზე.',
  'The rope is tied to the railing.': 'თოკი მოაჯირზეა მიბმული.',
  "It's not attached to that!": 'ის იმაზე არ არის მიმაგრებული!',
  'It smells of hot peppers.': 'მწარე წიწაკის სუნი უდის.',
  'You cannot enter in your condition.': 'შენს მდგომარეობაში ვერ შეხვალ.',
  'All such attacks are vain in your condition.':
    'ყველა ასეთი შეტევა შენს მდგომარეობაში ფუჭია.',
  'Even such an action is beyond your capabilities.':
    'ასეთი მოქმედებაც კი შენი შესაძლებლობების მიღმაა.',
  "Might as well. You've got an eternity.": 'მაინც სჯობს. მარადისობა გაქვს.',
  'You need no light to guide you.': 'გზის გასაკვალავად სინათლე არ გჭირდება.',
  "You're dead! How can you think of your score?":
    'მკვდარი ხარ! ანგარიშზე როგორღა ფიქრობ?',
  'You have no possessions.': 'შენ არაფერი გაგაჩნია.',
  'You are dead.': 'მკვდარი ხარ.',
  '**** You have died ****': '**** დაიღუპე ****',
  '** BOOOOOOOOOOOM **': '** ბუუუუუუუუუუმ **',
  'Although there is no light, the room seems dimly illuminated.':
    'თუმცა სინათლე არ არის, ოთახი ბუნდოვნად განათებული ჩანს.',
  'From the distance the sound of a lone trumpet is heard. The room becomes very bright and you feel disembodied. In a moment, the brightness fades and you find yourself rising as if from a long sleep, deep in the woods. In the distance you can faintly hear a songbird and the sounds of the forest.':
    'შორიდან მარტოხელა საყვირის ხმა ისმის. ოთახი ძალიან ნათელი ხდება და თავს უსხეულოდ გრძნობ. წამის შემდეგ სიკაშკაშე ქრება და აღმოაჩენ, რომ ისე იღვიძებ, თითქოს ხანგრძლივი ძილის შემდეგ, ტყის სიღრმეში. შორიდან სუსტად გესმის მგალობელი ფრინველი და ტყის ხმები.',
  'Your prayers are not heard.': 'შენს ლოცვებს არ ისმენენ.',
  "There's not much lake left....": 'ტბა ბევრი აღარ დარჩა....',
  "It's too wide to cross.": 'გადასაკვეთად მეტისმეტად ფართოა.',
  "You can't swim in this lake.": 'ამ ტბაში ცურვა არ შეიძლება.',
  "You can't swim in the stream.": 'ნაკადში ცურვა არ შეიძლება.',
  'The other side is a sheer rock cliff.': 'მეორე მხარეს მთლიანი კლდეა.',
  "It's too far to jump, and there's no bridge.":
    'გადასახტომად მეტისმეტად შორია და ხიდიც არ არის.',
  'The gate is protected by an invisible force. It makes your teeth ache to touch it.':
    'ჭიშკარს უხილავი ძალა იცავს. მისი შეხებისგან კბილები გტკივა.',
  'There is too much gas to blow away.':
    'გაზი მეტისმეტად ბევრია, რომ გაიფანტოს.',
  'It smells like coal gas in here.': 'აქ ნახშირის გაზის სუნი უდის.',
  'The robber, rummaging through his bag, dropped a few items he found valueless.':
    'ყაჩაღმა, ტომარაში ფათურისას, რამდენიმე ნივთი ჩამოაგდო, რომელიც უღირსად ჩათვალა.',
  'You are in perfect health.': 'სრულიად ჯანმრთელი ხარ.',
  'It takes a talented person to be killed while already dead. YOU are such a talent. Unfortunately, it takes a talented person to deal with it. I am not such a talent. Sorry.':
    'ნიჭიერი ადამიანი უნდა იყო, რომ უკვე მკვდარი მოგკლან. შენ სწორედ ასეთი ნიჭიერი ხარ. სამწუხაროდ, ამის მოსაგვარებლადაც ნიჭიერი ადამიანია საჭირო. მე ასეთი ნიჭიერი არ ვარ. ბოდიში.',
  'Bad luck, huh?': 'ცუდი იღბალია, არა?',
  "You clearly are a suicidal maniac. We don't allow psychotics in the cave, since they may harm other adventurers. Your remains will be installed in the Land of the Living Dead, where your fellow adventurers may gloat over them.":
    'შენ აშკარად თვითმკვლელი მანიაკი ხარ. ფსიქოპატებს გამოქვაბულში არ ვუშვებთ, რადგან ისინი შესაძლოა სხვა თავგადასავლების მაძიებლებს ავნონ. შენი ნეშტი ცოცხალ-მკვდრების სამყაროში დაიდგმება, სადაც შენი თანამოძმე თავგადასავლების მაძიებლები მას შეიძლება დასცინოდნენ.',
  'As you take your last breath, you feel relieved of your burdens. The feeling passes as you find yourself before the gates of Hell, where the spirits jeer at you and deny you entry. Your senses are disturbed. The objects in the dungeon appear indistinct, bleached of color, even unreal.':
    'როცა ბოლო სუნთქვას ამოუშვებ, ტვირთისგან თავდახსნილად იგრძნობ თავს. ეს გრძნობა გადის, როცა ჯოჯოხეთის ჭიშკრის წინ აღმოჩნდები, სადაც სულები დაგცინიან და შესვლის უფლებას არ გაძლევენ. შენი გრძნობები აშლილია. დილეგში საგნები ბუნდოვნად ჩანს, ფერმკრთალი, არარეალურიც კი.',
  "Now, let's take a look here... Well, you probably deserve another chance. I can't quite fix you up completely, but you can't have everything.":
    'აბა, ერთი ვნახოთ... ჰო, ალბათ კიდევ ერთი შანსი გეკუთვნის. სრულად ვერ მოგიყვან წესრიგში, მაგრამ ყველაფერს ხომ ვერ მიიღებ.',
  "What the heck! You won't make friends this way, but nobody around here is too friendly anyhow. Gulp!":
    'ეჰ, რა იქნება! ასე მეგობრებს ვერ შეიძენ, მაგრამ აქ მაინც არავინაა დიდად მეგობრული. გულქ!',
  'The chain is secure.': 'ჯაჭვი მყარადაა.',
  'Perhaps you should do that to the basket.': 'ალბათ ეს კალათას უნდა უზამო.',
  'The chain secures a basket within the shaft.':
    'ჯაჭვი კალათას ჭაბურღილში აკავებს.',
}
