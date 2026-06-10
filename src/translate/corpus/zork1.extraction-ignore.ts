// Reviewed extraction entries that are NOT translatable display lines (brute-
// scan artifacts, composition fragments that pass the shape filter, vocabulary
// words). EVERY entry needs a reviewer's reason — this list is the inventory
// gate's escape hatch, and an unreviewed addition is a silent coverage hole.
//
// Review method (Task 17, re-audited in the review fix): every entry was
// classified against the vendored ZIL source (READ-ONLY zork1/*.zil). A
// fragment's reason names the template/pin that covers its composed line;
// where the composition is genuinely uncoverable (unbounded echo, glued
// TELLs) the reason says "composition uncovered → LLM fallback" with the
// reachable trigger. Decode garbage is ignorable only when it has no ZIL
// counterpart. The gates can't see composed lines, so these reasons are the
// audit record — keep them true.
export const ZORK1_EXTRACTION_IGNORE: readonly string[] = [
  // ── Mid-TELL pieces with terminators (each composed line is covered) ──
  // mid-TELL prefix of the UNKNOWN-WORD line (gparser.zil) — the composed line is the {raw} template 'I don\'t know the word "{raw}".'
  'I don\'t know the word "',
  // melee composition suffix — covered by the template "The {obj}'s weapon is knocked to the floor, leaving him unarmed." (the troll full line is also pinned)
  "'s weapon is knocked to the floor, leaving him unarmed.",
  // mid-TELL prefix of the CANT-USE line (gparser.zil) — the composed line is the {raw} template 'You used the word "{raw}" in a way that I don\'t understand.'
  'You used the word "',
  // mid-TELL suffix of the CANT-USE line (gparser.zil) — same composed {raw} template as the prefix above
  '" in a way that I don\'t understand.',
  // mid-TELL fragment of the banner copyright line (gmain) — the full composed line is pinned in the corpus
  'Infocom, Inc. All rights reserved.',
  // listing suffix fragment (gverbs DESCRIBE-OBJECT) — the composed "(providing light)" listing lines are templates/pins in the corpus
  '(providing light)',
  // listing suffix fragment (gverbs DESCRIBE-OBJECT) — the composed "(being worn)" listing line is a template in the corpus
  '(being worn)',

  // ── Melee/death composition fragments (1actions.zil combat LTABLEs,
  //    gverbs.zil JIGS-UP/V-ATTACK, 1actions.zil V-DIAGNOSE). Each entry
  //    names the template/pin that covers its composed line; the hero-melee
  //    F-DEF slot only ever holds the troll or the thief (CYCLOPS-FCN
  //    intercepts ATTACK), the villain F-WEP slot holds the player's
  //    weapon. ─────────────────────────────────────────────────────────────
  // template 'A good slash, but it misses the {obj} by a mile.'
  'A good slash, but it misses the',
  // template 'You charge, but the {obj} jumps nimbly aside.'
  'You charge, but the',
  // template 'A quick stroke, but the {obj} is on guard.'
  'A quick stroke, but the',
  // template "A good stroke, but it's too slow; the {obj} dodges."
  "A good stroke, but it's too slow; the",
  // template 'A furious exchange, and the {obj} is knocked out!'
  'A furious exchange, and the',
  // template 'The haft of your {obj} knocks out the {obj2}.'
  'The haft of your',
  // template "It's curtains for the {obj} as your {obj2} removes his head."
  "It's curtains for the",
  // template 'The fatal blow strikes the {obj} square in the heart: He dies.'
  'The fatal blow strikes the',
  // template 'The force of your blow knocks the {obj} back, stunned.'
  'The force of your blow knocks the',
  // template 'The quickness of your thrust knocks the {obj} back, stunned.'
  'The quickness of your thrust knocks the',
  // template 'The Cyclops grabs your {obj}, tastes it, and throws it to the ground in disgust.'
  'The Cyclops grabs your',
  // template 'The axe hits your {obj} and knocks it spinning.'
  'The axe hits your',
  // template 'The axe knocks your {obj} out of your hand. It falls to the floor.'
  'The axe knocks your',
  // template 'The thief neatly flips your {obj} out of your hands, and it drops to the floor.'
  'The thief neatly flips your',
  // template 'You parry a low thrust, and your {obj} slips out of your hand.'
  'You parry a low thrust, and your',
  // template 'Almost as soon as the {obj} breathes his last breath, …'
  'Almost as soon as the',
  // template "I've known strange people, but fighting a {obj}?"
  "I've known strange people, but fighting a",
  // template 'Trying to attack a {obj} with your bare hands is suicidal.'
  'Trying to attack a',
  // template 'Trying to attack the {obj} with a {obj2} is suicidal.'
  'Trying to attack the',
  // template 'Your skillful {obj}smanship slices the {obj2} into innumerable slivers which blow away.'
  'Your skillful',
  // templates 'The thief places the {obj} in his bag and thanks you politely.' / 'The thief is taken aback … accepts the {obj} …'
  'The thief places the',
  // template 'Fortunately, you still have a {obj}.'
  'Fortunately, you still have a',
  // template 'Attacking the {obj} is pointless.'
  'Attacking the',
  // pins 'You have been killed once.' / 'You have been killed twice.' (V-DIAGNOSE prints only those two)
  'You have been killed',

  // ── Verb-default TELL prefixes (gverbs.zil/1actions.zil). Each is the
  //    leading piece of a one-object composed line. Most composed lines are
  //    covered by {obj}/{raw} templates or finite pins (named per entry);
  //    the few left to the LLM fallback say so explicitly. ─────────────────
  // template 'Why would you send for the {obj}?'
  'Why would you send for the',
  // template 'Look on a {obj}???'
  'Look on a',
  // templates 'Kicking the {obj} …' × the three HO-HUM suffixes
  'Kicking the',
  // template "It's in the {obj}."
  "It's in the",
  // templates 'Playing in this way with the {obj} …' × HO-HUM
  'Playing in this way with the',
  // templates 'Pushing the {obj} …' × HO-HUM
  'Pushing the',
  // templates 'Fiddling with the {obj} …' × HO-HUM
  'Fiddling with the',
  // templates 'Waving the {obj} …' × HO-HUM
  'Waving the',
  // template 'How does one read a {obj}?'
  'How does one read a',
  // template "There's no good surface on the {obj}."
  "There's no good surface on the",
  // template "You can't climb onto the {obj}."
  "You can't climb onto the",
  // template 'The water leaks out of the {obj} and evaporates immediately.'
  'The water leaks out of the',
  // template 'With a {obj}??!?'
  'With a',
  // templates "You can't see any {obj} here!" / "You can't see any {raw} here!"
  "You can't see any",
  // template "You aren't even holding the {obj}."
  "You aren't even holding the",
  // template 'You are already in the {obj}!'
  'You are already in the',
  // template 'You have a theory on how to board a {obj}, perhaps?'
  'You have a theory on how to board a',
  // template 'You are now in the {obj}.'
  'You are now in the',
  // template "You can't burn a {obj}."
  "You can't burn a",
  // template 'You must tell me how to do that to a {obj}.'
  'You must tell me how to do that to a',
  // template 'The "cutting edge" of a {obj} is hardly adequate.'
  'The "cutting edge" of a',
  // template 'Strange concept, cutting the {obj}....'
  'Strange concept, cutting the',
  // template 'Digging with the {obj} is slow and tedious.'
  'Digging with the',
  // template 'Digging with a {obj} is silly.'
  'Digging with a',
  // template 'You have to be holding the {obj} first.'
  'You have to be holding the',
  // template "You'll have to open the {obj} first."
  "You'll have to open the",
  // template "I don't think that the {obj} would agree with you."
  "I don't think that the",
  // template "There's nothing special about the {obj}."
  "There's nothing special about the",
  // template "It's on the {obj}."
  "It's on the",
  // template "You can't give a {obj} to a {obj2}!"
  "You can't give a",
  // template 'Why knock on a {obj}?'
  'Why knock on a',
  // template 'If you wish to burn the {obj}, you should say so.'
  'If you wish to burn the',
  // template 'There is nothing behind the {obj}.'
  'There is nothing behind the',
  // template "You can't look inside a {obj}."
  "You can't look inside a",
  // template "It's not clear that a {obj} can be melted."
  "It's not clear that a",
  // template 'Moving the {obj} reveals nothing.'
  'Moving the',
  // template "You can't move the {obj}."
  "You can't move the",
  // templates 'Trying to destroy the {obj} with your bare hands/a {obj2} is futile.'
  'Trying to destroy the',
  // template 'Opening the {obj} reveals a {obj2}.' + the two-item sack pin;
  // longer PRINT-CONTENTS lists ("a X, a Y, and a Z") → LLM fallback
  // (reachable by stuffing 3+ items into any container and opening it)
  'Opening the',
  // template 'Ahoy -- {obj} overboard!'
  'Ahoy --',
  // template 'The water spills over the {obj}, to the floor, and evaporates.'
  'The water spills over the',
  // template 'Pump it up with a {obj}?'
  'Pump it up with a',
  // template 'How does one look through a {obj}?'
  'How does one look through a',
  // template 'It is hardly likely that the {obj} is interested.'
  'It is hardly likely that the',
  // template 'You must address the {obj} directly.'
  'You must address the',
  // templates 'The contents of the {obj} spill to the ground./spill out and disappears.'
  'The contents of the',
  // template 'It smells like a {obj}.'
  'It smells like a',
  // template 'No doubt you propose to stab the {obj} with your pinky?'
  'No doubt you propose to stab the',
  // template "Swimming isn't usually allowed in the {obj}." + the 'in the dungeon.' pin
  "Swimming isn't usually allowed in the",
  // template 'You are now wearing the {obj}.'
  'You are now wearing the',
  // template "You can't talk to the {obj}!"
  "You can't talk to the",
  // template 'You hit your head against the {obj} as you attempt this feat.'
  'You hit your head against the',
  // template "You can't tie the {obj} to that."
  "You can't tie the",
  // template "You can't wear the {obj}."
  "You can't wear the",
  // template 'You cannot wind up a {obj}.'
  'You cannot wind up a',
  // presence templates 'There is a {obj} here.' (+ light/vehicle variants)
  'There is a',
  // template 'Sitting on the {obj} is:'
  'Sitting on the',
  // template "You're not carrying the {obj}."
  "You're not carrying the",
  // template "You can't go there in a {obj}."
  "You can't go there in a",
  // template 'A nice idea, but with a {obj}?'
  'A nice idea, but with a',
  // template 'You would have to get the {obj} first, and that seems unlikely.'
  'You would have to get the',
  // template 'Can you unlock a grating with a {obj}?'
  'Can you unlock a grating with a',
  // template "The bolt won't turn using the {obj}."
  "The bolt won't turn using the",
  // template 'The lid opens, revealing a {obj}.' + the huge-diamond pin;
  // multi-item machine contents → LLM fallback (reachable by putting 2+
  // things in the machine)
  'The lid opens, revealing',
  // template "It seems that a {obj} won't do."
  'It seems that a',
  // pins 'You are on the river/reservoir/stream, or have you forgotten?'
  'You are on the',
  // template "It seems that the {obj} didn't agree with the boat, …"
  'It seems that the',
  // template "Not to say that using the {obj} isn't original too..."
  'Not to say that using the',
  // template 'The concept of using a {obj} is certainly original.'
  'The concept of using a',
  // composition uncovered → LLM fallback (reachable by tying up an
  // unconscious villain with the rope; the ZIL TELL has no CR, so the line
  // arrives GLUED to the villain's wake-up sentence — not template-able)
  'Your attempt to tie up the',
  // template 'Why would you tie up a {obj}?'
  'Why would you tie up a',
  // template 'You suddenly notice that the {obj} vanished.'
  'You suddenly notice that the',
  // V-DIAGNOSE prognosis prefix — pins 'You can expect death soon.' /
  // 'You can be killed by …' / 'You can survive …' (all five tails)
  'You can',
  // pins 'There are lots of coins/jewels in there.' (the only two callers)
  'There are lots of',
  // template 'It looks pretty much like a {obj}.'
  'It looks pretty much like a',

  // ── Parser/banner/status composition pieces (gparser.zil, gmain.zil,
  //    1actions.zil V-SCORE/V-VERSION). Coverage is named per entry; the
  //    two unbounded parser questions are honestly left to the fallback. ───
  // bare TELL prefix shared by dozens of compositions ("The " D X …); each
  // composed family is handled at its own entry/template — this one-word
  // piece is never a display line by itself
  'The',
  // bare TELL prefix ("Your " F-WEP …) — same as 'The' above
  'Your',
  // score templates 'Your score is {num} …, in {num2} moves./move.'
  'Your score is',
  // pins 'The lights within the room shut off./come on.'
  'The lights within the room',
  // composition uncovered → LLM fallback (the parser's orphan question
  // "What do you want to <verb> …?" echoes the typed verb AND a printed
  // noun phrase — unbounded)
  'What do you want to',
  // composition uncovered → LLM fallback (the disambiguation question
  // "Which <noun> do you mean, the X or the Y?" lists candidate objects —
  // unbounded)
  'Which',
  // template "You don't have the {obj}."
  "You don't have the",
  // {raw} templates 'You can\'t use multiple direct/indirect objects with "{raw}".'
  "You can't use multiple",
  // banner piece — the full 'Release 119 / Serial number 880429' line is pinned
  'Release',
  // pins 'Your load is too heavy.' / '…, especially in light of your condition.'
  'Your load is too heavy',
  // pins 'You can see a clear area leading towards a forest.' / '…what appears to be a kitchen.' (kitchen-window look-through)
  'You can see',
  // pins 'The chimney leads upward/downward, and looks climbable.'
  'The chimney leads',
  // pins 'The rug is too heavy to lift.' / '…, but in trying to take it …'
  'The rug is too heavy to lift',
  // pins 'The water level here is now …' × the nine DROWNINGS rungs
  'The water level here is now',
  // pins 'The lamp is on./is turned off./has burned out.' (examine states)
  'The lamp',
  // V-DIAGNOSE prefix — the four wound carriers are {num} templates
  // ('You have a light wound, which will be cured after {num} moves.' …)
  'You have',
  // pins 'The candles are lit./already lit./burning./out.'
  'The candles are',
  // pins '…strange and unearthly.' / '…and objects appear indistinct.'
  'The room looks strange and unearthly',

  // ── Rank names (V-SCORE): composed as "This gives you the rank of " +
  //    rank + "." — all eight composed lines are pinned as full strings. ───
  'This gives you the rank of',
  'Master Adventurer',
  'Wizard',
  'Master',
  'Adventurer',
  'Junior Adventurer',
  'Novice Adventurer',
  'Amateur Adventurer',
  'Beginner',

  // ── Mid-string anchor decodes: packed-address anchors landing INSIDE a
  //    longer z-string decode its tail (often sentence-aligned, so they read
  //    clean). Each entry below was matched to its containing ZIL string and
  //    the FULL line is translated in the corpus; the tail alone is never a
  //    display line. ───────────────────────────────────────────────────────
  "It's",
  'There',
  'The earth beneath your feet trembles, and your legs nearly buckle beneath you. The spirits cower at your unearthly power.',
  'RT, RESTORE, or QUIT):',
  'You',
  'This',
  'Cyclops',
  'Frigid',
  'Room',
  'Fortunately',
  'Unfortunately',
  "You're",
  'Cliffs Beach',
  'Barrow',
  'II: The Wizard of Frobozz" and is completed in "ZORK III: The Dungeon Master."',
  'Is suicide painless?',
  'Hello" to a',
  'ING!',
  'You manage to hold your own for a bit, but then you are carried over a waterfall and into some nasty rocks. Ouch!',
  'White Cliffs loom on the east bank and large rocks prevent landing on the west.',
  'A path travels from north to south here, the south end quickly turning around a sharp corner.',
  "'s studio. The walls and floors are splattered with paints of 69 different colors. Strangely enough, nothing of value is hanging here. At the south end of the room is an open door (also covered with paint). A dark and narrow chimney leads up from a fireplace; although you might be able to get up it, it seems unlikely you could get back down.",
  "Well, you probably deserve another chance. I can't quite fix you up completely, but you can't have everything.",
  'I: The Great Underground Empire',
  'It might be safe to descend. There is also a staircase leading upward.',
  'I: The Wizard of Frobozz" and is completed in "ZORK III: The Dungeon Master."',
  'There is a narrow beach on the west shore below the cliffs. In the distance a faint rumbling can be heard.',
  'Underground Empire.',
  'Zorkmids."',
  '"Wrong, cretin!" and you notice that you have turned into a pile of dust. How, I can\'t imagine.',
  "'ll let you past.",
  'ORK!',
  'LCOME TO ZORK!',
  'White Cliffs join the mighty ramparts of the Flathead Mountains to the east. Following the Canyon upstream to the north, Aragain Falls may be seen, complete with rainbow. The mighty Frigid River flows out from a great dark cavern. To the west and south can be seen an immense forest, stretching for miles around. A path leads northwest. It is possible to climb down into the canyon from here.',
  'White Cliffs. There is a narrow path heading south along the Cliffs and a tight passage leading west into the cliffs themselves.',
  'A lurking grue slithered into the',
  '"Granite Wall".',
  'Aragain Falls, an enormous waterfall with a drop of about 450 feet. The only path here is on the north end.',
  "' supply of good luck handy.",
  '"Look to your treasures for the final secret."',
  "Tech can't promise these fantastic results to everyone. But when you earn your degree from GUE Tech, your future will be brighter.",
  "K owner's manual",
  "There is a pounding in your head which won't stop. With a tremendous effort, you scramble out of the room.",
  'River flows out from a great dark cavern. To the west and south can be seen an immense forest, stretching for miles around. A path leads northwest. It is possible to climb down into the canyon from here.',
  'ZZ Corporation created, owns, and operates this dungeon.',
  'You have mastered',
  'The p',
  'Passage',
  'Empire.',
  'Aragain Falls flows by below. To the north is a narrow path.',
  'To the south is a passageway and to the east a very narrow passage. In the shaft can be seen a heavy iron chain.',
  'AYS "Granite Wall".',
  'Mine',
  'RESTORE, or QUIT):',
  'Some moron punctured it.',
  'You u',
  'What are you referring to?"',
  'The water level in the reservoir is quite low, but the level is rising quickly.',
  "Normally, this wouldn't do much damage, but by incredible mischance, you fall over backwards trying to duck, and break your neck, justice being swift and merciful in the Great Underground Empire.",
  "It's f",
  'Granite Wall".',
  'START, RESTORE, or QUIT):',
  'The sluice gates have been opened. Water rushes through the dam and downstream.',
  'Ledge',
  'Great Underground Empire.',
  'Hades',
  "'t be smart.",
  'APER SHUFFLING!',
  'The boat is repaired.',
  'This a',
  'A number of discarded bags, which crumble at your touch, are scattered about on the floor. There is an exit down a staircase.',
  'Dam. The White Cliffs loom on the east bank and large rocks prevent landing on the west.',
  '(20 feet up) is a wooden railing. In the center of the room sits a white marble pedestal.',
  'In the corner are stacked the remains of dozens of previous adventurers less fortunate than yourself. A passage exits to the north.',
  'Dam. The river flows quietly here. There is a landing on the west shore.',
  'RK I: The Great Underground Empire, a self-contained and self-maintaining universe. If used and maintained in accordance with normal operating practices for small universes, ZORK will provide many months of trouble-free operation.',
  '"Before I took this course I was a lowly bit twiddler. Now with what I learned at GUE Tech I feel really important and can obfuscate and confuse with the best."',
  'II: The Dungeon Master."',
  'Up around the edge of the dome (20 feet up) is a wooden railing. In the center of the room sits a white marble pedestal.',
  'Unfortunately, you were',

  // ── Anchored decode garbage: z-string decodes of non-string bytes (no
  //    counterpart anywhere in the ZIL source; gibberish or mangled). ──────
  'G ffcalready p',
  'M h',
  'Cyclops aeva',
  'Roomoyou out.',
  "It's into cKhabout kb",
  'I, sl',
  'K pvbefore tcblarge qc',
  'G ekcthief',
  'Binto nothing hief',
  'There ff',
  "You oqwon't",
  'Unfortunately 4',
  'Lsrs',
  "Jwon't leading k",
  'Nvmnvqnvunvy you us',
  'A kthe lc ldtvlt',
  'There ew',
  'Npfor panpenpi thatmv',
  'Nngnnknnonns is i',
  'The fit k',
  'Cyclops wz',
  'A ksmall',
  'Room impossible e k dwbe i',
  'The xs',
  'This dqdhw c glass',
  'Your dgo',
  'Roomdm',
  'M cinto by wgbso the c z bk m kcandles ry',
  'Jg into c gK mthe into cW Kmwxw',
  'Unfortunatelywhto think q',
  'K dcesc',
  'Sv can )',
  'Kvk d',
  'You ur',
  'V s',
  'This es v',
  'I k have I k w',
  'The dqj',
  // shift-artifact decode; the real DESC is lowercase "blue button" (objects table)
  'Blue button',
  'Qlh putgk',
  'It y',
  'There hees v',
  'You Za',
  "It's ground dfkdon't",
  'Cttroll lZ water ezfn',
  'This yzlu',
  'Eoy',
  'S yk',
  "This c as It's w",
  "Vjexcan't in into aEntrance to Hades",
  "Ss into jco nfsIt's k you zc U m dxvssn",
  'Cyclops i swould cprobably Gzzj',
  'Your syou',
  'Thrust knocks the',
  "It's won't s k wnk",
  'G bssmall',
  'Kqwco',
  'Uogk',
  'It gzqp',
  'You fphy c climb',
  'N cthe pkthe c y you csmall s',
  "You tkIt's k you rc",
  'G lo into kknocks into s sto',
  'You tl',
  'Kmwxw',
  'You i)',
  "This hThere won't",
  'This x',
  'You axe',
  'There the leading o sto',
  'Frigid z',
  'Roomadeep to cross. You notice, however, that the water level appears to be dropping at a rapid rate. Before long, it might be possible to cross to the other side from here.',
  "It's cto bThere It's thief sKed",
  'There has P',
  'Unfortunatelyc',
  'Fortunatelyestore a saved game position, or end this session of the game?',
  'Agsto',
  'G qo d kfo d s sto',
  'C s)',
  'Your round',
  'There qb',
  'Fzhis dxq lKa',
  'Unare c',
  'There You mq cinto knocks p bof vx',
  'It k',
  'There cyclops tlikb bugsfr 9 Yt',
  "Roomthe qxmYou're holding too many things already!",
  'Roome',
  'C sZ',
  'X kycsthat',
  'Cyclops ethrough os ekBthrough qdc',
  'Cyclops cS',
  'JRoom have cthe exgsd',
  'Dui',
  'K Yk',
  // shift-artifact mid-decode; "…feet." only occurs mid-sentence in ZIL (lowercase)
  'Feet.',
  'Uin kXnshut off.',
  'You\'re dw"Md',
  'The sKpassages',
  'This jkhere',
  "It's Frigid z",
  'Roomm',
  // shift-artifact decode; the real DESC is lowercase "platinum bar" (objects table)
  'Platinum bar',
  'PnThe rope drops gently to the floor below.',
  "You're c y",
  'This xlk, a',
  'Unfortunatelygv',
  'Ic ms a yks',
  "There won't mbgsq",
  'Ogk',
  "You're p This c c",
  'Gzzm',
  "' k 9 cyclops tl8,You should say whether you want to go up or down.",
  'This c c',
  'HmZORK I: The Great Underground Empire',
  'There mdl2mwthe yaja',
  "It's z",
  "There lot dc't",
  "Qwon't k dshp ms",
  "S It's kgThere s it d m dw ecj",
  'The pkis mr',
  'Nc pmoThere You mq cinto knocks p bof vx',
  'S Hb a my lhk',
  'Aksto',
  'I pkck bh',
  "It's s b etsgrating",
  "Xc This c K won't njs",
  'Mc y',
  'Hb a my lhk',
  'Rp his',
  // shift-artifact mid-decode; "…throat." only occurs mid-sentence in ZIL (lowercase)
  'Throat.',
  'Ib into troll lqc',
  'The ic',
  'This cfc og crooma chThere fcinto x lznp',
  'G bhereis',
  'It oz',
  "It's km",
  'You aighave dtm tvk',
  'The into yegcjinto c gto The xs',
  'You qac',
  'C g.',
  'J 7ade figurine',
  'Asqcyclops bn',
  'There with There Your kn',
  "' cyclops tliqhnThe book is already open to page 569.",
  'There into chave cyclops snorth mm',
  'It ov',
  'Fortunatelyh',
  'There ow',
  "It's icisesesdesugduv nothing mp",
  'The the for impossible',
  "It's zvky",
  'It qdu',
  'Bpek gk kmlrxlcxgswbkt',
  'U s j',
  'You The room mthhave room G wkwj',
  'You aleading z',
  'Cyclops xazlh',
  'There here iivvx s shf',
  'Cyclops m dyl opsc you ks m dup obk',
  'Unfortunatelyvclf',
  'Cyclops n8 sgr',
  'Roomfq_g c stone',
  'Frigid thief north 5b',
  'This vlmjfnbk',
  'Aoelb mjooxptmkah roomyclops',
  'There pc',
  'Necneknewnf Roome',
  "It's the ldmcYou aleading z",
  'Cyclops s cthere door cthrough qprobably',
  "It's Scpqgq",
  'U m dxvssn',
  'Roomiphtecannot k',
  'Your nqb',
  'F which fcthe',
  'Dcpxu',
  'This tr',
  'There x 0love of garlic',
  "' cyclops tn kcyclops qa8,The trophy case is securely fastened to the wall.",
  'You _tu',
  'T c',
  'There ni',
  'There to aamw',
  'On k dxz me',
  'Unfortunatelydgo',
  "It's kej wall q k dtawon't h",
  'Roomhayldcandles',
  'Iforit e o aviscous material',
  'Unfortunatelyongbird',
  'It maze',
  'Th skfck h qgmkyour ucroom gg cannot shb',
  'Dcqtf',
  'You xmc ynb',
  'Frigid k xmThe trap door crashes shut, and you hear someone barring it.',
  'Cdh',
  'CnohnThe match is burning.',
  'Ndroom ekshis mytey v',
  // shift-artifact decode; the real DESC is lowercase "glass bottle" (objects table)
  'Glass bottle',
  'You othe ayour gzyr',
  'Roomhxcoo',
  'Unfortunatelyz',
  'The is the for impossible',
  'Cyclops nhere sgr',
  'Aq West of House',
  'The k into you ybgcek into sao',
  'Fortunatelyqd f',
  'There mxFrigid fc eklhbf',
  'XmThe',
  'G ao a k sthat',
  'Ofs have There mxFrigid fc eklhbf',
  "You're r",
  "It's the lektc loxDcz",
  'Unfortunatelye',
  'Frigid ) Frigid thief north 5b',
  'Mp into ghere mzsk k narrow lk',
  'Unfortunatelytunned.',
  'E c y have E kcannot',
  'You passage j',
  'You oqho',
  'Cyclops o k impossible vs bbut we',
  'There V',
  "This wxthat ok'gv",
  "This c K won't njs",
  "It's b nothing ezfs",
  "It's lkwon't bseems vt",
  'There md',
  'G fgo',
  'A nj',
  'Awould s it itroll h',
  "Fortunatelypk k p c vswon't suv",
  "The 'tanding in the corner, eyeing you closely. I don't think he likes you very much. He looks extremely hungry, even for a cyclops.",
  'There anne',
  'Hhere hc suv',
  'There gYour this njf g bof vx',
  // shift-artifact decode; the real DESC is lowercase "trophy case" (objects table)
  'Trophy case',
  'FortunatelyGpm',
  // shift-artifact decode; the real DESC is lowercase "brown sack" (objects table)
  'Brown sack',
  'This hjk water c',
  'The g f Ancient map',
  'There mnmhk lovatqh',
  "It's w",
  // shift-artifact tail of the melee "…your hands, and it drops to the floor." line
  'Hands, and it drops to the floor.',
  'Unfortunatelyl',
  'A r jw1k g',
  "It's water mxgrating",
  'Cyclops nes sgr',
  'It shore',
  'The .oving about the room, looking for something.',
  'A mr1g',
  'Gzzp',
  'There mo',
  'You asomewhat agitated.',
  'This j chis a, sb',
  'Fortunatelyevealing the dusty cover of a closed trap door.',
  'A fpd',
  'Sracan mzkroom',
  'Yykhis su uj k j nothing ezfn',
  'Legs nearly buckle beneath you. The spirits cower at your unearthly power.',
  'You eeue',
  'The cthe as n the A kthe lc ldtvlt',
  'There the passages C',
  'There ei',
  'Dvtua',
  'Sa you have',
  'Fortunatelyevealing',
  'There li',
  'Unfortunately into m c sev',
]
