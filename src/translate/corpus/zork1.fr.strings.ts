// Zork I × French full-line table (output-translation spec §4.1). KEYS are
// normalized English lines EXACTLY as the bridge delivers them (normalize():
// collapsed whitespace, trimmed; case/punctuation preserved). Authored data —
// UAT hand-fixes edit entries here; the coverage/inventory gates police it.
//
// TRANSLATION STYLE (Task 16 — walkthrough corpus):
// - Formal «vous» throughout, matching the input-layer prompt style and the
//   object vocabulary in zork1.fr.objects.ts (la lampe en laiton, l'œuf
//   incrusté de joyaux, la vitrine à trophées, le tumulus…).
// - One line per key: sentence count and trailing punctuation are preserved
//   (the line is the matching unit — never merge or split lines).
// - French double punctuation gets a leading space (« ici ! », « quoi ? »,
//   « : ») and quotations use « guillemets » — regular spaces, consistent
//   with zork1.fr.templates.ts.
// - Proper nouns stay (Zork, Frobozz, Aragain, Frigid, Ramsès II);
//   Flood Control Dam #3 → « Barrage de régulation des crues nº 3 »
//   (abbreviated FCD#3 → « BRC nº 3 »); the grue stays «un grue»
//   (masculine — the monster, not «la grue» the bird).
// - Imperial units are kept («pieds», «pouces») for the 1980s flavor.
// - Player-agreeing past participles are dodged where possible («Vous
//   voici dans…» for "You have entered…") so no gender is forced on the
//   player; where unavoidable the 1980s masculine default is used.
// - Keep Infocom's wit (the cyclops «aime beaucoup les gens», the narrator's
//   asides about walking on rainbows) — never flatten a joke.
export const ZORK1_FR_STRINGS: Readonly<Record<string, string>> = {
  // ── Banner block (printed at boot). Legal/serial lines stay near-verbatim:
  //    the copyright notice and trademark are legal text; release/serial
  //    numbers identify the story file. ────────────────────────────────────
  'ZORK I: The Great Underground Empire': 'ZORK I : Le Grand Empire Souterrain',
  'Infocom interactive fiction - a fantasy story':
    'Fiction interactive Infocom - une histoire fantastique',
  'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.':
    'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. Tous droits réservés.',
  'ZORK is a registered trademark of Infocom, Inc.':
    "ZORK est une marque déposée d'Infocom, Inc.",
  'Release 119 / Serial number 880429': 'Version 119 / Numéro de série 880429',

  // ── Common one-word/stock responses ────────────────────────────────────
  // «Pris.»/«Posé.» read as the curt parser acknowledgements they are; the
  // participle never agrees with anything (it abbreviates «c'est fait»).
  'Taken.': 'Pris.',
  // Implicit-take parenthetical (PRE-TAKE in gverbs.zil — e.g. «read leaflet»
  // while not holding it). UAT-4 miss; off the golden path, so the coverage
  // gate cannot pin it.
  '(Taken)': '(Pris)',
  'Dropped.': 'Posé.',
  'Opened.': "C'est ouvert.",
  'Closed.': "C'est fermé.",
  'Done.': 'Fait.',
  'Click.': 'Clic.',
  'You are on your own feet again.': 'Vous voilà de nouveau debout.',
  '(magic boat)': '(bateau magique)',
  'Your collection of treasures consists of:':
    'Votre collection de trésors comprend :',

  // ── Combat — sword glow, troll fight ───────────────────────────────────
  'Your sword is glowing with a faint blue glow.':
    "Votre épée luit d'une faible lueur bleue.",
  'Your sword has begun to glow very brightly.':
    "Votre épée s'est mise à luire très vivement.",
  'Your sword is no longer glowing.': 'Votre épée ne luit plus.',
  'A nasty-looking troll, brandishing a bloody axe, blocks all passages out of the room.':
    "Un troll à l'air mauvais, brandissant une hache ensanglantée, bloque toutes les issues de la salle.",
  'Clang! Crash! The troll parries.': 'Cling ! Clang ! Le troll pare le coup.',
  "The troll's mighty blow drops you to your knees.":
    'Le coup formidable du troll vous jette à genoux.',
  'You are still recovering from that last blow, so your attack is ineffective.':
    'Vous vous remettez encore du dernier coup, et votre attaque est inefficace.',
  "The troll's axe barely misses your ear.":
    'La hache du troll manque votre oreille de peu.',
  'You charge, but the troll jumps nimbly aside.':
    "Vous chargez, mais le troll s'écarte d'un bond agile.",
  'The troll swings his axe, but it misses.':
    'Le troll abat sa hache, mais elle vous rate.',
  "The troll's weapon is knocked to the floor, leaving him unarmed.":
    "L'arme du troll est projetée au sol, le laissant désarmé.",
  'The troll, disarmed, cowers in terror, pleading for his life in the guttural tongue of the trolls.':
    'Le troll, désarmé, se recroqueville de terreur, implorant pour sa vie dans la langue gutturale des trolls.',
  'The unarmed troll cannot defend himself: He dies.':
    'Le troll désarmé ne peut pas se défendre : il meurt.',
  'Almost as soon as the troll breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.':
    "À peine le troll a-t-il rendu son dernier souffle qu'un nuage de brume noire et sinistre l'enveloppe, et quand la brume se dissipe, la carcasse a disparu.",

  // ── The thief ──────────────────────────────────────────────────────────
  'Someone carrying a large bag is casually leaning against one of the walls here. He does not speak, but it is clear from his aspect that the bag will be taken only over his dead body.':
    "Quelqu'un portant un grand sac est nonchalamment adossé à l'un des murs. Il ne dit rien, mais il est clair, à son allure, qu'on ne lui prendra ce sac que sur son cadavre.",
  'There is a suspicious-looking individual, holding a large bag, leaning against one wall. He is armed with a deadly stiletto.':
    "Un individu à l'air louche, tenant un grand sac, est adossé à un mur. Il est armé d'un stylet mortel.",
  "You hear a scream of anguish as you violate the robber's hideaway. Using passages unknown to you, he rushes to its defense.":
    "Vous entendez un cri d'angoisse au moment où vous profanez le repaire du voleur. Par des passages qui vous sont inconnus, il se précipite pour le défendre.",
  'The thief gestures mysteriously, and the treasures in the room suddenly vanish.':
    "Le voleur fait un geste mystérieux, et les trésors de la salle s'évanouissent soudain.",
  'The thief is taken aback by your unexpected generosity, but accepts the jewel-encrusted egg and stops to admire its beauty.':
    "Le voleur est décontenancé par votre générosité inattendue, mais il accepte l'œuf incrusté de joyaux et s'arrête pour en admirer la beauté.",
  'The stiletto flashes faster than you can follow, and blood wells from your leg.':
    'Le stylet jaillit plus vite que votre regard ne peut le suivre, et le sang perle de votre jambe.',
  'The thief is disarmed by a subtle feint past his guard.':
    'Le voleur est désarmé par une feinte subtile qui déjoue sa garde.',
  'The robber, somewhat surprised at this turn of events, nimbly retrieves his stiletto.':
    'Le brigand, quelque peu surpris par la tournure des événements, ramasse prestement son stylet.',
  'The quickness of your thrust knocks the thief back, stunned.':
    'La vivacité de votre botte projette le voleur en arrière, étourdi.',
  'The thief slowly regains his feet.': 'Le voleur se relève lentement.',
  'A quick stroke, but the thief is on guard.':
    'Un coup rapide, mais le voleur est sur ses gardes.',
  'You dodge as the thief comes in low.':
    "Vous esquivez l'attaque basse du voleur.",
  'The thief is staggered, and drops to his knees.':
    'Le voleur chancelle et tombe à genoux.',
  'A furious exchange, and the thief is knocked out!':
    'Un échange furieux, et le voleur est assommé !',
  'The unconscious thief cannot defend himself: He dies.':
    'Le voleur inconscient ne peut pas se défendre : il meurt.',
  'Almost as soon as the thief breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.':
    "À peine le voleur a-t-il rendu son dernier souffle qu'un nuage de brume noire et sinistre l'enveloppe, et quand la brume se dissipe, la carcasse a disparu.",
  'As the thief dies, the power of his magic decreases, and his treasures reappear:':
    'Tandis que le voleur meurt, le pouvoir de sa magie décline, et ses trésors réapparaissent :',
  'The chalice is now safe to take.':
    'Le calice peut maintenant être pris sans danger.',

  // ── The cyclops ────────────────────────────────────────────────────────
  // «il aime beaucoup les gens» — the joke (he likes them for dinner) must
  // survive translation.
  'A cyclops, who looks prepared to eat horses (much less mere adventurers), blocks the staircase. From his state of health, and the bloodstains on the walls, you gather that he is not very friendly, though he likes people.':
    "Un cyclope, qui semble prêt à dévorer des chevaux (alors, de simples aventuriers…), bloque l'escalier. À en juger par son état de santé et les taches de sang sur les murs, vous devinez qu'il n'est pas très amical, bien qu'il aime beaucoup les gens.",
  "The cyclops, hearing the name of his father's deadly nemesis, flees the room by knocking down the wall on the east of the room.":
    "Le cyclope, entendant le nom de l'ennemi mortel de son père, s'enfuit de la salle en défonçant le mur est.",

  // ── PIN LIST (templates-file header, spec §5 escape hatch): full-line
  //    pins that beat the agreement-blind templates for plural objects. ────
  'There is a pair of candles here (providing light).':
    'Il y a des bougies ici (allumées).',
  'A pair of candles (providing light)': 'Des bougies (allumées)',
  'There is a matchbook here (providing light).':
    'Il y a des allumettes ici (allumées).',
  'A matchbook (providing light)': 'Des allumettes (allumées)',
  // Plural holder for V-FIND («C'est X qui l'a» must become «Ce sont…»).
  'The number of ghosts has it.': "Ce sont les fantômes qui l'ont.",
  // 1actions.zil:90 — period, not bang (the bang shape is a template).
  "You can't see any songbird here.":
    "Vous ne voyez l'oiseau chanteur nulle part.",
  // Irregular listing composition (partitive, no «Un/Une»); the builtin
  // 'A {obj}' template would also compose this, pinned for safety.
  'A quantity of water': "De l'eau",

  // ── OFF-PATH PINS (plan slice 3 — famous lines not hit by the lamp-lit
  //    walkthrough; added here so the translator is never surprised by them
  //    in the wild). ────────────────────────────────────────────────────────
  //
  // Darkness messages: the Z-machine stores "It is pitch black." and
  // " You are likely to be eaten by a grue." as TWO separate z-strings.
  // At runtime the bridge normalises and delivers EITHER the bare darkness
  // line (e.g. after spray) OR the combined line when the grue sentence is
  // appended.  Both keys are pinned so the matcher hits on whichever arrives.
  // The grue stays masculine «un grue» per the objects table (the monster,
  // not «la grue» the bird).
  'It is pitch black.': 'Il fait nuit noire.',
  'It is pitch black. You are likely to be eaten by a grue.':
    'Il fait nuit noire. Vous risquez fort de vous faire dévorer par un grue.',
  'It is now pitch black.': 'Il fait maintenant nuit noire.',
  // Extraction inventory confirms: "It's pitch black in here!" is a
  // distinct z-string (cave/small-room variant).
  "It's pitch black in here!": 'Il fait nuit noire ici !',

  // ── House & forest props/events ────────────────────────────────────────
  "Beside you on the branch is a small bird's nest.":
    "À côté de vous, sur la branche, se trouve un petit nid d'oiseau.",
  "In the bird's nest is a large egg encrusted with precious jewels, apparently scavenged by a childless songbird. The egg is covered with fine gold inlay, and ornamented in lapis lazuli and mother-of-pearl. Unlike most eggs, this one is hinged and closed with a delicate looking clasp. The egg appears extremely fragile.":
    "Dans le nid d'oiseau se trouve un gros œuf incrusté de joyaux précieux, apparemment chapardé par un oiseau chanteur sans progéniture. L'œuf est couvert de fines incrustations d'or et orné de lapis-lazuli et de nacre. Contrairement à la plupart des œufs, celui-ci est monté sur charnière et fermé par un fermoir d'apparence délicate. L'œuf semble extrêmement fragile.",
  'You hear in the distance the chirping of a song bird.':
    "Vous entendez au loin le gazouillis d'un oiseau chanteur.",
  'With great effort, you open the window far enough to allow entry.':
    "Au prix d'un grand effort, vous ouvrez la fenêtre juste assez pour pouvoir entrer.",
  'A bottle is sitting on the table.': 'Une bouteille est posée sur la table.',
  'On the table is an elongated brown sack, smelling of hot peppers.':
    'Sur la table se trouve un sac marron tout en longueur, qui sent le piment.',
  // Two-item reveal (pin list: only {obj}/{obj2} exist; the one-item shape
  // is templated).
  'Opening the brown sack reveals a clove of garlic, and a lunch.':
    "En ouvrant le sac marron, vous découvrez une gousse d'ail et un déjeuner.",
  'Above the trophy case hangs an elvish sword of great antiquity.':
    'Au-dessus de la vitrine à trophées est accrochée une épée elfique de la plus haute antiquité.',
  'A battery-powered brass lantern is on the trophy case.':
    'Une lampe en laiton à piles est posée sur la vitrine à trophées.',
  'With a great effort, the rug is moved to one side of the room, revealing the dusty cover of a closed trap door.':
    "Au prix d'un grand effort, le tapis est poussé sur un côté de la pièce, révélant le panneau poussiéreux d'une trappe fermée.",
  'The door reluctantly opens to reveal a rickety staircase descending into darkness.':
    "La porte s'ouvre à contrecœur, révélant un escalier branlant qui s'enfonce dans l'obscurité.",
  'A large coil of rope is lying in the corner.':
    'Un grand rouleau de corde traîne dans un coin.',
  'On a table is a nasty-looking knife.':
    'Sur une table se trouve un vilain couteau.',
  'The trap door crashes shut, and you hear someone barring it.':
    "La trappe se referme avec fracas, et vous entendez quelqu'un la barricader.",

  // ── Maze & Hades ───────────────────────────────────────────────────────
  'Beside the skeleton is a rusty knife.':
    'À côté du squelette se trouve un couteau rouillé.',
  "The deceased adventurer's useless lantern is here.":
    "La lampe inutile de l'aventurier défunt est ici.",
  'An old leather bag, bulging with coins, is here.':
    'Un vieux sac en cuir, gonflé de pièces, est ici.',
  'There is a silver chalice, intricately engraved, here.':
    'Il y a ici un calice en argent, finement gravé.',
  'The way through the gate is barred by evil spirits, who jeer at your attempts to pass.':
    'Le passage du portail est barré par des esprits malins, qui raillent vos tentatives.',
  'The bell suddenly becomes red hot and falls to the ground. The wraiths, as if paralyzed, stop their jeering and slowly turn to face you. On their ashen faces, the expression of a long-forgotten terror takes shape.':
    "La cloche, soudain chauffée au rouge, tombe au sol. Les spectres, comme paralysés, cessent leurs railleries et se tournent lentement vers vous. Sur leurs visages cendreux se dessine l'expression d'une terreur oubliée depuis longtemps.",
  'In your confusion, the candles drop to the ground (and they are out).':
    "Dans la confusion, vous laissez tomber les bougies (et elles s'éteignent).",
  'One of the matches starts to burn.': "Une des allumettes s'enflamme.",
  'The candles are lit.': 'Les bougies sont allumées.',
  'The flames flicker wildly and appear to dance. The earth beneath your feet trembles, and your legs nearly buckle beneath you. The spirits cower at your unearthly power.':
    'Les flammes vacillent follement et semblent danser. La terre tremble sous vos pieds, et vos jambes manquent de se dérober. Les esprits se recroquevillent devant votre puissance surnaturelle.',
  'The match has gone out.': "L'allumette s'est éteinte.",
  'Each word of the prayer reverberates through the hall in a deafening confusion. As the last word fades, a voice, loud and commanding, speaks: "Begone, fiends!" A heart-stopping scream fills the cavern, and the spirits, sensing a greater power, flee through the walls.':
    "Chaque mot de la prière se répercute dans la salle en une confusion assourdissante. Tandis que le dernier mot s'éteint, une voix forte et impérieuse déclare : « Arrière, démons ! » Un cri à glacer le sang emplit la caverne, et les esprits, sentant une puissance supérieure, s'enfuient à travers les murs.",
  'Lying in one corner of the room is a beautifully carved crystal skull. It appears to be grinning at you rather nastily.':
    'Dans un coin de la salle gît un crâne de cristal magnifiquement sculpté. Il semble vous adresser un rictus plutôt mauvais.',
  'On the ground is a red hot bell.':
    'Sur le sol se trouve une cloche chauffée au rouge.',

  // ── Gallery, dam & reservoir ───────────────────────────────────────────
  'Fortunately, there is still one chance for you to be a vandal, for on the far wall is a painting of unparalleled beauty.':
    "Heureusement, il vous reste une chance de jouer les vandales, car sur le mur du fond se trouve un tableau d'une beauté sans égale.",
  'The sluice gates on the dam are closed. Behind the dam, there can be seen a wide reservoir. Water is pouring over the top of the now abandoned dam.':
    "Les vannes du barrage sont fermées. Derrière le barrage, on aperçoit un vaste réservoir. L'eau se déverse par-dessus le barrage, aujourd'hui abandonné.",
  'There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble.':
    'Il y a ici un panneau de commande, sur lequel est monté un gros boulon métallique. Juste au-dessus du boulon se trouve une petite bulle de plastique verte.',
  'There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble which is glowing serenely.':
    'Il y a ici un panneau de commande, sur lequel est monté un gros boulon métallique. Juste au-dessus du boulon se trouve une petite bulle de plastique verte qui luit sereinement.',
  'Some guidebooks entitled "Flood Control Dam #3" are on the reception desk.':
    "Des guides touristiques intitulés « Barrage de régulation des crues nº 3 » sont posés sur le comptoir d'accueil.",
  'There is a matchbook whose cover says "Visit Beautiful FCD#3" here.':
    'Il y a ici des allumettes dont la pochette proclame « Visitez le magnifique BRC nº 3 ».',
  'There is an object which looks like a tube of toothpaste here.':
    'Il y a ici un objet qui ressemble à un tube de dentifrice.',
  'The sluice gates open and water pours through the dam.':
    "Les vannes s'ouvrent et l'eau s'engouffre à travers le barrage.",
  'There is a rumble from deep within the earth and the room shakes.':
    'Un grondement monte des profondeurs de la terre et la salle tremble.',
  'On the ground is a large platinum bar.':
    'Sur le sol se trouve une grosse barre de platine.',
  'The acoustics of the room change subtly.':
    "L'acoustique de la salle change subtilement.",
  'Lying half buried in the mud is an old trunk, bulging with jewels.':
    'À demi enfouie dans la boue gît une vieille malle, débordant de bijoux.',
  'There is a slimy stairway leaving the room to the north.':
    'Un escalier visqueux quitte la salle vers le nord.',
  "On the shore lies Poseidon's own crystal trident.":
    'Sur la rive gît le trident de cristal de Poséidon lui-même.',

  // ── Temple, dome & torch ───────────────────────────────────────────────
  'There are old engravings on the walls here.':
    'Il y a ici de vieilles gravures sur les murs.',
  'The rope drops over the side and comes within ten feet of the floor.':
    "La corde tombe par-dessus bord et s'arrête à moins de dix pieds du sol.",
  'A piece of rope descends from the railing above, ending some five feet above your head.':
    "Un bout de corde descend de la rambarde là-haut et s'arrête à environ cinq pieds au-dessus de votre tête.",
  'Sitting on the pedestal is a flaming torch, made of ivory.':
    "Sur le piédestal repose une torche enflammée, taillée dans l'ivoire.",
  'On the two ends of the altar are burning candles.':
    "Aux deux extrémités de l'autel brûlent des bougies.",
  'On the altar is a large black book, open to page 569.':
    "Sur l'autel se trouve un grand livre noir, ouvert à la page 569.",
  'A gust of wind blows out your candles!':
    'Un coup de vent éteint vos bougies !',

  // ── Coal mine, bat & machine ───────────────────────────────────────────
  'There is an exquisite jade figurine here.':
    'Il y a ici une exquise figurine de jade.',
  'In the corner of the room on the ceiling is a large vampire bat who is obviously deranged and holding his nose.':
    'Au coin du plafond se tient une grande chauve-souris vampire, manifestement dérangée, qui se bouche le nez.',
  'At the end of the chain is a basket.':
    'Au bout de la chaîne se trouve un panier.',
  'From the chain is suspended a basket.':
    'À la chaîne est suspendu un panier.',
  'The basket is lowered to the bottom of the shaft.':
    "Le panier est descendu jusqu'au fond du puits.",
  'The basket is raised to the top of the shaft.':
    "Le panier est remonté jusqu'en haut du puits.",
  'The lid opens.': "Le couvercle s'ouvre.",
  'The lid closes.': 'Le couvercle se ferme.',
  'The machine comes to life (figuratively) with a dazzling display of colored lights and bizarre noises. After a few moments, the excitement abates.':
    "La machine s'anime (au sens figuré) dans un éblouissement de lumières colorées et de bruits bizarres. Au bout de quelques instants, l'agitation retombe.",
  'The lid opens, revealing a huge diamond.':
    "Le couvercle s'ouvre, révélant un énorme diamant.",
  'There is a brass lantern (battery-powered) here.':
    'Il y a ici une lampe en laiton (à piles).',

  // ── Egypt ──────────────────────────────────────────────────────────────
  'The solid-gold coffin used for the burial of Ramses II is here.':
    "Le cercueil en or massif qui servit à l'inhumation de Ramsès II est ici.",
  'A sceptre, possibly that of ancient Egypt itself, is in the coffin. The sceptre is ornamented with colored enamel, and tapers to a sharp point.':
    "Un sceptre, peut-être celui de l'Égypte ancienne elle-même, se trouve dans le cercueil. Le sceptre est orné d'émaux colorés et s'effile en une pointe acérée.",

  // ── River, boat & beach ────────────────────────────────────────────────
  'There is a folded pile of plastic here which has a small valve attached.':
    "Il y a ici un tas de plastique plié muni d'une petite valve.",
  'The boat inflates and appears seaworthy.':
    'Le bateau se gonfle et semble en état de naviguer.',
  'A tan label is lying inside the boat.':
    "Une étiquette beige se trouve à l'intérieur du bateau.",
  'The flow of the river carries you downstream.':
    "Le courant de la rivière vous emporte vers l'aval.",
  'There is a red buoy here (probably a warning).':
    'Il y a ici une bouée rouge (probablement un avertissement).',
  'The magic boat comes to a rest on the shore.':
    "Le bateau magique vient s'immobiliser sur le rivage.",
  'You seem to be digging a hole here.': 'Vous semblez creuser un trou ici.',
  "The hole is getting deeper, but that's about it.":
    "Le trou devient plus profond, mais c'est à peu près tout.",
  'You are surrounded by a wall of sand on all sides.':
    'Un mur de sable vous entoure de tous côtés.',
  'You can see a scarab here in the sand.':
    'Vous apercevez un scarabée ici, dans le sable.',

  // ── Rainbow & endgame ──────────────────────────────────────────────────
  'A beautiful rainbow can be seen over the falls and to the west.':
    "Un magnifique arc-en-ciel se déploie au-dessus des chutes, vers l'ouest.",
  'Suddenly, the rainbow appears to become solid and, I venture, walkable (I think the giveaway was the stairs and bannister).':
    "Soudain, l'arc-en-ciel semble devenir solide et, j'ose le dire, praticable à pied (je crois que ce sont les marches et la rampe qui l'ont trahi).",
  'At the end of the rainbow is a pot of gold.':
    "Au bout de l'arc-en-ciel se trouve un pot d'or.",
  'The lamp appears a bit dimmer.':
    'La lampe semble luire un peu plus faiblement.',
  'The canary chirps, slightly off-key, an aria from a forgotten opera. From out of the greenery flies a lovely songbird. It perches on a limb just over your head and opens its beak to sing. As it does so a beautiful brass bauble drops from its mouth, bounces off the top of your head, and lands glimmering in the grass. As the canary winds down, the songbird flies away.':
    "Le canari gazouille, un peu faux, un air d'un opéra oublié. De la verdure surgit un ravissant oiseau chanteur. Il se perche sur une branche juste au-dessus de votre tête et ouvre le bec pour chanter. Ce faisant, une belle babiole en laiton tombe de son bec, rebondit sur le sommet de votre crâne et atterrit en scintillant dans l'herbe. Tandis que le mécanisme du canari s'arrête, l'oiseau chanteur s'envole.",
  'An almost inaudible voice whispers in your ear, "Look to your treasures for the final secret."':
    "Une voix presque inaudible vous murmure à l'oreille : « Cherchez le dernier secret du côté de vos trésors. »",
  'The ZORK trilogy continues with "ZORK II: The Wizard of Frobozz" and is completed in "ZORK III: The Dungeon Master."':
    "La trilogie ZORK se poursuit avec « ZORK II : Le Sorcier de Frobozz » et s'achève avec « ZORK III : Le Maître du Donjon ».",
  'This gives you the rank of Master Adventurer.':
    'Cela vous confère le rang de Maître Aventurier.',
  'Would you like to restart the game from the beginning, restore a saved game position, or end this session of the game?':
    'Voulez-vous recommencer la partie depuis le début, restaurer une partie sauvegardée, ou mettre fin à cette session de jeu ?',
  // The command words are read verbatim by the Z-machine — never localized.
  '(Type RESTART, RESTORE, or QUIT):': '(Tapez RESTART, RESTORE ou QUIT) :',

  // ── Rooms — titles (these are also the status-bar lookups) ─────────────
  'West of House': "À l'ouest de la maison",
  'North of House': 'Au nord de la maison',
  'South of House': 'Au sud de la maison',
  'Behind House': 'Derrière la maison',
  'Forest Path': 'Sentier forestier',
  'Up a Tree': "En haut d'un arbre",
  Forest: 'Forêt',
  Clearing: 'Clairière',
  Kitchen: 'Cuisine',
  'Living Room': 'Salon',
  Attic: 'Grenier',
  Cellar: 'Cave',
  'The Troll Room': 'La salle du troll',
  Maze: 'Labyrinthe',
  'Cyclops Room': 'Salle du cyclope',
  'Treasure Room': 'Salle du trésor',
  'Strange Passage': 'Passage étrange',
  'East of Chasm': "À l'est du gouffre",
  Gallery: 'Galerie',
  'East-West Passage': 'Passage est-ouest',
  'Round Room': 'Salle ronde',
  'North-South Passage': 'Passage nord-sud',
  'Deep Canyon': 'Canyon profond',
  'Reservoir South': 'Sud du réservoir',
  Reservoir: 'Réservoir',
  'Reservoir North': 'Nord du réservoir',
  Dam: 'Barrage',
  'Dam Lobby': 'Hall du barrage',
  'Maintenance Room': 'Salle de maintenance',
  'Dam Base': 'Pied du barrage',
  'Engravings Cave': 'Grotte aux gravures',
  'Dome Room': 'Salle du dôme',
  'Torch Room': 'Salle de la torche',
  Temple: 'Temple',
  Altar: 'Autel',
  Cave: 'Grotte',
  'Entrance to Hades': 'Entrée des Enfers',
  'Land of the Dead': 'Royaume des morts',
  'Mirror Room': 'Salle du miroir',
  'Cold Passage': 'Passage froid',
  'Slide Room': 'Salle du toboggan',
  'Loud Room': 'Salle bruyante',
  'Atlantis Room': "Salle de l'Atlantide",
  'Narrow Passage': 'Passage étroit',
  'Mine Entrance': 'Entrée de la mine',
  'Squeaky Room': 'Salle aux couinements',
  'Bat Room': 'Salle de la chauve-souris',
  'Shaft Room': 'Salle du puits',
  'Smelly Room': 'Salle nauséabonde',
  'Gas Room': 'Salle du gaz',
  'Coal Mine': 'Mine de charbon',
  'Ladder Top': "Haut de l'échelle",
  'Ladder Bottom': "Bas de l'échelle",
  'Dead End': 'Cul-de-sac',
  'Timber Room': 'Salle des poutres',
  'Drafty Room': "Salle des courants d'air",
  'Machine Room': 'Salle de la machine',
  'Egyptian Room': 'Salle égyptienne',
  'Frigid River, in the magic boat': 'Rivière Frigid, dans le bateau magique',
  'Sandy Beach, in the magic boat': 'Plage de sable, dans le bateau magique',
  'Sandy Beach': 'Plage de sable',
  'Sandy Cave': 'Grotte de sable',
  Shore: 'Rivage',
  'Aragain Falls': 'Chutes Aragain',
  'On the Rainbow': "Sur l'arc-en-ciel",
  'End of Rainbow': "Au bout de l'arc-en-ciel",
  'Canyon Bottom': 'Fond du canyon',
  'Rocky Ledge': 'Corniche rocheuse',
  'Canyon View': 'Vue sur le canyon',
  'Stone Barrow': 'Tumulus de pierre',
  'Inside the Barrow': "À l'intérieur du tumulus",

  // ── Rooms — long descriptions ──────────────────────────────────────────
  'You are standing in an open field west of a white house, with a boarded front door.':
    "Vous vous trouvez en plein champ, à l'ouest d'une maison blanche dont la porte d'entrée est condamnée.",
  'You are standing in an open field west of a white house, with a boarded front door. A secret path leads southwest into the forest.':
    "Vous vous trouvez en plein champ, à l'ouest d'une maison blanche dont la porte d'entrée est condamnée. Un sentier secret s'enfonce au sud-ouest dans la forêt.",
  'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.':
    "Vous faites face au côté nord d'une maison blanche. Il n'y a pas de porte ici, et toutes les fenêtres sont condamnées. Au nord, un étroit sentier serpente entre les arbres.",
  'You are facing the south side of a white house. There is no door here, and all the windows are boarded.':
    "Vous faites face au côté sud d'une maison blanche. Il n'y a pas de porte ici, et toutes les fenêtres sont condamnées.",
  'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.':
    "Vous êtes derrière la maison blanche. Un sentier s'enfonce dans la forêt vers l'est. À un angle de la maison se trouve une petite fenêtre entrouverte.",
  'This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the edge of the path.':
    "C'est un sentier qui serpente à travers une forêt sombre. Le sentier suit ici un axe nord-sud. Un arbre particulièrement grand, aux branches basses, se dresse au bord du sentier.",
  'You are about 10 feet above the ground nestled among some large branches. The nearest branch above you is above your reach.':
    'Vous êtes à environ 10 pieds au-dessus du sol, au creux de grosses branches. La branche la plus proche au-dessus de vous est hors de portée.',
  'This is a forest, with trees in all directions. To the east, there appears to be sunlight.':
    "C'est une forêt, avec des arbres dans toutes les directions. À l'est, on dirait qu'il y a de la lumière du jour.",
  'This is a dimly lit forest, with large trees all around.':
    "C'est une forêt sombre, avec de grands arbres tout autour.",
  'You are in a small clearing in a well marked forest path that extends to the east and west.':
    "Vous êtes dans une petite clairière, sur un sentier forestier bien tracé qui s'étend d'est en ouest.",
  'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. A dark chimney leads down and to the east is a small window which is open.':
    "Vous êtes dans la cuisine de la maison blanche. Une table semble avoir servi récemment à la préparation d'un repas. Un passage mène à l'ouest et un escalier sombre monte vers l'étage. Une cheminée obscure descend, et à l'est se trouve une petite fenêtre, ouverte.",
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room.':
    "Vous êtes dans le salon. Il y a une porte à l'est, une porte en bois à l'ouest couverte d'étranges caractères gothiques, qui semble clouée, une vitrine à trophées, et un grand tapis oriental au centre de la pièce.",
  'This is the attic. The only exit is a stairway leading down.':
    "C'est le grenier. La seule issue est un escalier qui descend.",
  'You are in a dark and damp cellar with a narrow passageway leading north, and a crawlway to the south. On the west is the bottom of a steep metal ramp which is unclimbable.':
    "Vous êtes dans une cave sombre et humide, avec un passage étroit vers le nord et un boyau vers le sud. À l'ouest se trouve le bas d'une rampe métallique abrupte, impossible à escalader.",
  'This is a small room with passages to the east and south and a forbidding hole leading west. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.':
    "C'est une petite salle avec des passages à l'est et au sud, et un trou menaçant vers l'ouest. Des taches de sang et de profondes entailles (peut-être faites à la hache) balafrent les murs.",
  'This is part of a maze of twisty little passages, all alike.':
    "Vous êtes dans une partie d'un labyrinthe de petits passages tortueux, tous semblables.",
  'This is part of a maze of twisty little passages, all alike. A skeleton, probably the remains of a luckless adventurer, lies here.':
    "Vous êtes dans une partie d'un labyrinthe de petits passages tortueux, tous semblables. Un squelette, probablement les restes d'un aventurier malchanceux, gît ici.",
  'This room has an exit on the northwest, and a staircase leading up.':
    'Cette salle a une issue au nord-ouest et un escalier qui monte.',
  'This is a large room, whose east wall is solid granite. A number of discarded bags, which crumble at your touch, are scattered about on the floor. There is an exit down a staircase.':
    "C'est une grande salle, dont le mur oriental est en granit massif. Plusieurs sacs abandonnés, qui s'effritent à votre contact, jonchent le sol. On peut sortir en descendant un escalier.",
  'This is a long passage. To the west is one entrance. On the east there is an old wooden door, with a large opening in it (about cyclops sized).':
    "C'est un long passage. À l'ouest se trouve une entrée. À l'est, il y a une vieille porte en bois, percée d'une grande ouverture (environ à la taille d'un cyclope).",
  'You are on the east edge of a chasm, the bottom of which cannot be seen. A narrow passage goes north, and the path you are on continues to the east.':
    "Vous êtes sur le bord est d'un gouffre dont on ne voit pas le fond. Un passage étroit part vers le nord, et le chemin que vous suivez continue vers l'est.",
  'This is an art gallery. Most of the paintings have been stolen by vandals with exceptional taste. The vandals left through either the north or west exits.':
    "C'est une galerie d'art. La plupart des tableaux ont été volés par des vandales au goût exceptionnel. Les vandales sont partis par la sortie nord ou par la sortie ouest.",
  'This is a narrow east-west passageway. There is a narrow stairway leading down at the north end of the room.':
    "C'est un étroit passage est-ouest. Un escalier étroit descend à l'extrémité nord de la salle.",
  'This is a circular stone room with passages in all directions. Several of them have unfortunately been blocked by cave-ins.':
    "C'est une salle de pierre circulaire avec des passages dans toutes les directions. Plusieurs d'entre eux ont malheureusement été obstrués par des éboulements.",
  'This is a high north-south passage, which forks to the northeast.':
    "C'est un haut passage nord-sud, qui bifurque vers le nord-est.",
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear the sound of flowing water from below.':
    "Vous êtes sur le bord sud d'un canyon profond. Des passages partent vers l'est, le nord-ouest et le sud-ouest. Un escalier descend. Vous entendez le bruit de l'eau qui coule venant d'en bas.",
  'You are in a long room on the south shore of a large lake, far too deep and wide for crossing.':
    "Vous êtes dans une longue salle sur la rive sud d'un grand lac, bien trop profond et trop large pour être traversé.",
  'There is a path along the stream to the east or west, a steep pathway climbing southwest along the edge of a chasm, and a path leading into a canyon to the southeast.':
    "Un chemin longe le cours d'eau vers l'est ou l'ouest, un sentier escarpé grimpe au sud-ouest le long d'un gouffre, et un chemin s'enfonce dans un canyon au sud-est.",
  'You are in a long room, to the north of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through the center of the room.':
    "Vous êtes dans une longue salle, au nord de laquelle s'étendait autrefois un lac. Mais, le niveau de l'eau ayant baissé, il n'y a plus qu'un large cours d'eau qui traverse le centre de la salle.",
  'You are on what used to be a large lake, but which is now a large mud pile. There are "shores" to the north and south.':
    "Vous êtes sur ce qui était autrefois un grand lac, mais qui n'est plus qu'un grand tas de boue. Il y a des « rives » au nord et au sud.",
  'You are in a large cavernous room, the south of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through there.':
    "Vous êtes dans une grande salle caverneuse, au sud de laquelle s'étendait autrefois un lac. Mais, le niveau de l'eau ayant baissé, il n'y a plus qu'un large cours d'eau qui passe par là.",
  'You are standing on the top of the Flood Control Dam #3, which was quite a tourist attraction in times far distant. There are paths to the north, south, and west, and a scramble down.':
    "Vous vous tenez au sommet du Barrage de régulation des crues nº 3, qui fut une attraction touristique très courue en des temps fort lointains. Des chemins partent vers le nord, le sud et l'ouest, et l'on peut descendre tant bien que mal.",
  'This room appears to have been the waiting room for groups touring the dam. There are open doorways here to the north and east marked "Private", and there is a path leading south over the top of the dam.':
    "Cette salle semble avoir été la salle d'attente des groupes en visite au barrage. Des portes ouvertes, marquées « Privé », donnent au nord et à l'est, et un chemin part au sud par le sommet du barrage.",
  'This is what appears to have been the maintenance room for Flood Control Dam #3. Apparently, this room has been ransacked recently, for most of the valuable equipment is gone. On the wall in front of you is a group of buttons colored blue, yellow, brown, and red. There are doorways to the west and south.':
    "C'est ce qui semble avoir été la salle de maintenance du Barrage de régulation des crues nº 3. Apparemment, la pièce a été pillée récemment, car la plus grande partie du matériel de valeur a disparu. Sur le mur en face de vous se trouve un groupe de boutons bleu, jaune, marron et rouge. Des portes donnent à l'ouest et au sud.",
  'You are at the base of Flood Control Dam #3, which looms above you and to the north. The river Frigid is flowing by here. Along the river are the White Cliffs which seem to form giant walls stretching from north to south along the shores of the river as it winds its way downstream.':
    "Vous êtes au pied du Barrage de régulation des crues nº 3, qui vous domine au nord. La rivière Frigid coule par ici. Le long de la rivière se dressent les Falaises blanches, qui semblent former des murailles géantes s'étirant du nord au sud le long des rives de la rivière qui serpente vers l'aval.",
  'You have entered a low cave with passages leading northwest and east.':
    "Vous voici dans une grotte basse avec des passages vers le nord-ouest et l'est.",
  'You are at the periphery of a large dome, which forms the ceiling of another room below. Protecting you from a precipitous drop is a wooden railing which circles the dome.':
    "Vous êtes à la périphérie d'un grand dôme, qui forme le plafond d'une autre salle en contrebas. Une rambarde en bois qui fait le tour du dôme vous protège d'une chute vertigineuse.",
  'This is a large room with a prominent doorway leading to a down staircase. Above you is a large dome. Up around the edge of the dome (20 feet up) is a wooden railing. In the center of the room sits a white marble pedestal.':
    "C'est une grande salle avec une porte imposante menant à un escalier qui descend. Au-dessus de vous s'élève un grand dôme. Tout en haut, au bord du dôme (à 20 pieds), court une rambarde en bois. Au centre de la salle trône un piédestal de marbre blanc.",
  'This is the north end of a large temple. On the east wall is an ancient inscription, probably a prayer in a long-forgotten language. Below the prayer is a staircase leading down. The west wall is solid granite. The exit to the north end of the room is through huge marble pillars.':
    "C'est l'extrémité nord d'un grand temple. Sur le mur est se trouve une inscription ancienne, probablement une prière dans une langue oubliée depuis longtemps. Sous la prière, un escalier descend. Le mur ouest est en granit massif. La sortie, à l'extrémité nord de la salle, passe entre d'immenses piliers de marbre.",
  'This is the south end of a large temple. In front of you is what appears to be an altar. In one corner is a small hole in the floor which leads into darkness. You probably could not get back up it.':
    "C'est l'extrémité sud d'un grand temple. Devant vous se trouve ce qui semble être un autel. Dans un coin, un petit trou dans le sol s'enfonce dans l'obscurité. Vous ne pourriez probablement pas le remonter.",
  'This is a tiny cave with entrances west and north, and a dark, forbidding staircase leading down.':
    "C'est une grotte minuscule avec des entrées à l'ouest et au nord, et un escalier sombre et menaçant qui descend.",
  'This is a tiny cave with entrances west and north, and a staircase leading down.':
    "C'est une grotte minuscule avec des entrées à l'ouest et au nord, et un escalier qui descend.",
  'You are outside a large gateway, on which is inscribed':
    'Vous êtes devant un grand portail, sur lequel on peut lire',
  'Abandon every hope all ye who enter here!':
    'Vous tous qui entrez ici, abandonnez toute espérance !',
  'The gate is open; through it you can see a desolation, with a pile of mangled bodies in one corner. Thousands of voices, lamenting some hideous fate, can be heard.':
    'Le portail est ouvert ; au travers, vous découvrez une désolation, avec un tas de corps mutilés dans un coin. Des milliers de voix, déplorant quelque destin hideux, se font entendre.',
  'You have entered the Land of the Living Dead. Thousands of lost souls can be heard weeping and moaning. In the corner are stacked the remains of dozens of previous adventurers less fortunate than yourself. A passage exits to the north.':
    "Vous voici au Royaume des morts-vivants. On entend pleurer et gémir des milliers d'âmes perdues. Dans le coin sont empilés les restes de dizaines d'aventuriers moins chanceux que vous. Un passage sort au nord.",
  'You are in a large square room with tall ceilings. On the south wall is an enormous mirror which fills the entire wall. There are exits on the other three sides of the room.':
    'Vous êtes dans une grande salle carrée au plafond haut. Sur le mur sud, un énorme miroir occupe toute la paroi. Il y a des sorties sur les trois autres côtés de la salle.',
  'This is a cold and damp corridor where a long east-west passageway turns into a southward path.':
    "C'est un corridor froid et humide où un long passage est-ouest devient un chemin vers le sud.",
  'This is a small chamber, which appears to have been part of a coal mine. On the south wall of the chamber the letters "Granite Wall" are etched in the rock. To the east is a long passage, and there is a steep metal slide twisting downward. To the north is a small opening.':
    "C'est une petite salle qui semble avoir fait partie d'une mine de charbon. Sur le mur sud, les mots « Mur de granit » sont gravés dans la roche. À l'est s'étend un long passage, et un toboggan métallique abrupt descend en spirale. Au nord se trouve une petite ouverture.",
  'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward. The room is deafeningly loud with an undetermined rushing sound. The sound seems to reverberate from all of the walls, making it difficult even to think.':
    "C'est une grande salle dont le plafond ne peut être distingué depuis le sol. Un passage étroit va d'est en ouest et un escalier de pierre monte. La salle est assourdissante, emplie d'un grondement d'origine indéterminée. Le son semble se répercuter sur tous les murs, au point qu'il est même difficile de penser.",
  'This is an ancient room, long under water. There is an exit to the south and a staircase leading up.':
    "C'est une salle antique, longtemps restée sous les eaux. Il y a une sortie au sud et un escalier qui monte.",
  'This is a long and narrow corridor where a long north-south passageway briefly narrows even further.':
    "C'est un corridor long et étroit où un long passage nord-sud se resserre encore brièvement.",
  'You are standing at the entrance of what might have been a coal mine. The shaft enters the west wall, and there is another exit on the south end of the room.':
    "Vous vous tenez à l'entrée de ce qui a pu être une mine de charbon. La galerie s'enfonce dans le mur ouest, et il y a une autre sortie à l'extrémité sud de la salle.",
  'You are in a small room. Strange squeaky sounds may be heard coming from the passage at the north end. You may also escape to the east.':
    "Vous êtes dans une petite salle. D'étranges couinements proviennent du passage à l'extrémité nord. Vous pouvez aussi vous échapper vers l'est.",
  'You are in a small room which has doors only to the east and south.':
    "Vous êtes dans une petite salle qui n'a de portes qu'à l'est et au sud.",
  'This is a large room, in the middle of which is a small shaft descending through the floor into darkness below. To the west and the north are exits from this room. Constructed over the top of the shaft is a metal framework to which a heavy iron chain is attached.':
    "C'est une grande salle, au milieu de laquelle un petit puits s'enfonce dans le sol vers les ténèbres. À l'ouest et au nord se trouvent les sorties de cette salle. Au-dessus du puits est construite une armature métallique à laquelle est fixée une lourde chaîne de fer.",
  'This is a small nondescript room. However, from the direction of a small descending staircase a foul odor can be detected. To the south is a narrow tunnel.':
    "C'est une petite salle quelconque. Toutefois, une odeur fétide se dégage du côté d'un petit escalier qui descend. Au sud se trouve un tunnel étroit.",
  'This is a small room which smells strongly of coal gas. There is a short climb up some stairs and a narrow tunnel leading east.':
    "C'est une petite salle qui sent fortement le gaz de houille. Quelques marches montent et un tunnel étroit part vers l'est.",
  'This is a nondescript part of a coal mine.':
    "C'est une partie quelconque d'une mine de charbon.",
  'This is a very small room. In the corner is a rickety wooden ladder, leading downward. It might be safe to descend. There is also a staircase leading upward.':
    "C'est une toute petite salle. Dans le coin, une échelle en bois branlante descend. Il n'est sans doute pas trop risqué d'y descendre. Il y a aussi un escalier qui monte.",
  'This is a rather wide room. On one side is the bottom of a narrow wooden ladder. To the west and the south are passages leaving the room.':
    "C'est une salle plutôt large. D'un côté se trouve le bas d'une étroite échelle en bois. À l'ouest et au sud, des passages quittent la salle.",
  'You have come to a dead end in the mine.':
    'Vous voici dans un cul-de-sac de la mine.',
  'This is a long and narrow passage, which is cluttered with broken timbers. A wide passage comes from the east and turns at the west end of the room into a very narrow passageway. From the west comes a strong draft.':
    "C'est un passage long et étroit, encombré de poutres brisées. Un large passage arrive de l'est et se change, à l'extrémité ouest de la salle, en un couloir très étroit. De l'ouest souffle un fort courant d'air.",
  'This is a small drafty room in which is the bottom of a long shaft. To the south is a passageway and to the east a very narrow passage. In the shaft can be seen a heavy iron chain.':
    "C'est une petite salle pleine de courants d'air où aboutit un long puits. Au sud se trouve un couloir et à l'est un passage très étroit. Dans le puits, on aperçoit une lourde chaîne de fer.",
  'This is a large, cold room whose sole exit is to the north. In one corner there is a machine which is reminiscent of a clothes dryer. On its face is a switch which is labelled "START". The switch does not appear to be manipulable by any human hand (unless the fingers are about 1/16 by 1/4 inch). On the front of the machine is a large lid, which is closed.':
    "C'est une grande salle froide dont la seule sortie est au nord. Dans un coin se trouve une machine qui rappelle un sèche-linge. Sur sa façade se trouve un interrupteur marqué « MARCHE ». L'interrupteur ne semble pas pouvoir être manœuvré par une main humaine (à moins que les doigts ne mesurent environ 1/16 sur 1/4 de pouce). Sur le devant de la machine se trouve un grand couvercle, qui est fermé.",
  'This is a room which looks like an Egyptian tomb. There is an ascending staircase to the west.':
    "C'est une salle qui ressemble à un tombeau égyptien. Un escalier monte à l'ouest.",
  'You are on the Frigid River in the vicinity of the Dam. The river flows quietly here. There is a landing on the west shore.':
    'Vous êtes sur la rivière Frigid, à proximité du barrage. La rivière coule paisiblement ici. Il y a un débarcadère sur la rive ouest.',
  'The river turns a corner here making it impossible to see the Dam. The White Cliffs loom on the east bank and large rocks prevent landing on the west.':
    "La rivière fait un coude ici, rendant le barrage invisible. Les Falaises blanches se dressent sur la rive est et de gros rochers empêchent d'accoster à l'ouest.",
  'The river descends here into a valley. There is a narrow beach on the west shore below the cliffs. In the distance a faint rumbling can be heard.':
    'La rivière descend ici dans une vallée. Il y a une plage étroite sur la rive ouest, au pied des falaises. Au loin, on entend un faible grondement.',
  'The river is running faster here and the sound ahead appears to be that of rushing water. On the east shore is a sandy beach. A small area of beach can also be seen below the cliffs on the west shore.':
    "La rivière coule plus vite ici et le bruit devant vous semble être celui d'eaux tumultueuses. Sur la rive est s'étend une plage de sable. On aperçoit aussi un petit bout de plage au pied des falaises, sur la rive ouest.",
  'You are on a large sandy beach on the east shore of the river, which is flowing quickly by. A path runs beside the river to the south here, and a passage is partially buried in sand to the northeast.':
    "Vous êtes sur une grande plage de sable sur la rive est de la rivière, qui coule rapidement. Un chemin longe la rivière vers le sud, et un passage à moitié enseveli sous le sable s'ouvre au nord-est.",
  'This is a sand-filled cave whose exit is to the southwest.':
    "C'est une grotte remplie de sable dont la sortie est au sud-ouest.",
  'You are on the east shore of the river. The water here seems somewhat treacherous. A path travels from north to south here, the south end quickly turning around a sharp corner.':
    "Vous êtes sur la rive est de la rivière. L'eau semble ici assez traîtresse. Un chemin va du nord au sud, son extrémité sud disparaissant vite derrière un virage serré.",
  'You are at the top of Aragain Falls, an enormous waterfall with a drop of about 450 feet. The only path here is on the north end.':
    "Vous êtes au sommet des chutes Aragain, une énorme cascade d'une hauteur d'environ 450 pieds. Le seul chemin se trouve à l'extrémité nord.",
  'You are on top of a rainbow (I bet you never thought you would walk on a rainbow), with a magnificent view of the Falls. The rainbow travels east-west here.':
    "Vous êtes au sommet d'un arc-en-ciel (je parie que vous n'auriez jamais cru marcher un jour sur un arc-en-ciel), avec une vue magnifique sur les chutes. L'arc-en-ciel s'étend ici d'est en ouest.",
  'You are on a small, rocky beach on the continuation of the Frigid River past the Falls. The beach is narrow due to the presence of the White Cliffs. The river canyon opens here and sunlight shines in from above. A rainbow crosses over the falls to the east and a narrow path continues to the southwest.':
    "Vous êtes sur une petite plage rocheuse, dans le prolongement de la rivière Frigid après les chutes. La plage est étroite en raison de la présence des Falaises blanches. Le canyon de la rivière s'ouvre ici et la lumière du jour tombe d'en haut. Un arc-en-ciel enjambe les chutes à l'est et un chemin étroit continue vers le sud-ouest.",
  'You are beneath the walls of the river canyon which may be climbable here. The lesser part of the runoff of Aragain Falls flows by below. To the north is a narrow path.':
    "Vous êtes au pied des parois du canyon de la rivière, qui semblent escaladables ici. Une moindre partie des eaux des chutes Aragain s'écoule en contrebas. Au nord se trouve un chemin étroit.",
  'You are on a ledge about halfway up the wall of the river canyon. You can see from here that the main flow from Aragain Falls twists along a passage which it is impossible for you to enter. Below you is the canyon bottom. Above you is more cliff, which appears climbable.':
    "Vous êtes sur une corniche, à peu près à mi-hauteur de la paroi du canyon. Vous voyez d'ici que le flot principal des chutes Aragain serpente le long d'un passage où il vous est impossible d'entrer. En contrebas s'étend le fond du canyon. Au-dessus de vous, la falaise continue et semble escaladable.",
  'You are at the top of the Great Canyon on its west wall. From here there is a marvelous view of the canyon and parts of the Frigid River upstream. Across the canyon, the walls of the White Cliffs join the mighty ramparts of the Flathead Mountains to the east. Following the Canyon upstream to the north, Aragain Falls may be seen, complete with rainbow. The mighty Frigid River flows out from a great dark cavern. To the west and south can be seen an immense forest, stretching for miles around. A path leads northwest. It is possible to climb down into the canyon from here.':
    "Vous êtes au sommet du Grand Canyon, sur sa paroi ouest. D'ici, la vue sur le canyon et sur une partie de la rivière Frigid en amont est merveilleuse. De l'autre côté du canyon, les parois des Falaises blanches rejoignent à l'est les puissants remparts des monts Flathead. En remontant le canyon vers le nord, on aperçoit les chutes Aragain, arc-en-ciel compris. La puissante rivière Frigid jaillit d'une grande caverne sombre. À l'ouest et au sud s'étend une immense forêt, à des lieues à la ronde. Un chemin part au nord-ouest. Il est possible de descendre dans le canyon d'ici.",
  'You are standing in front of a massive barrow of stone. In the east face is a huge stone door which is open. You cannot see into the dark of the tomb.':
    "Vous vous tenez devant un imposant tumulus de pierre. Sur la face est se trouve une immense porte de pierre, qui est ouverte. Vous ne distinguez rien dans l'obscurité du tombeau.",
  'As you enter the barrow, the door closes inexorably behind you. Around you it is dark, but ahead is an enormous cavern, brightly lit. Through its center runs a wide stream. Spanning the stream is a small wooden footbridge, and beyond a path leads into a dark tunnel. Above the bridge, floating in the air, is a large sign. It reads: All ye who stand before this bridge have completed a great and perilous adventure which has tested your wit and courage. You have mastered the first part of the ZORK trilogy. Those who pass over this bridge must be prepared to undertake an even greater adventure that will severely test your skill and bravery!':
    "Au moment où vous entrez dans le tumulus, la porte se referme inexorablement derrière vous. Autour de vous règne l'obscurité, mais devant s'ouvre une énorme caverne, brillamment éclairée. En son centre coule un large ruisseau. Une petite passerelle en bois l'enjambe, et au-delà un chemin mène à un tunnel sombre. Au-dessus de la passerelle, flottant dans les airs, se trouve un grand écriteau. On y lit : Vous tous qui vous tenez devant ce pont, vous avez accompli une grande et périlleuse aventure qui a mis à l'épreuve votre esprit et votre courage. Vous avez triomphé de la première partie de la trilogie ZORK. Que ceux qui franchiront ce pont se préparent à une aventure plus grande encore, qui éprouvera durement leur adresse et leur bravoure !",

  // ════════════════════════════════════════════════════════════════════════
  // OFF-PATH INVENTORY (Task 17 — string-inventory gate, spec §7.4).
  // Every line below is a decoded z-string the walkthrough never hit: death
  // messages, verb defaults, parser feedback, unvisited rooms, object texts.
  // Keys are the EXACT extracted display lines (already normalize()d).
  // ════════════════════════════════════════════════════════════════════════

  // ── Off-path room & object titles (status-bar lookups included) ─────────
  'Damp Cave': 'Grotte humide',
  'Frigid River': 'Rivière Frigid',
  "ZORK owner's manual": 'manuel du propriétaire',
  'Stream View': "Vue sur le cours d'eau",
  Stream: "Cours d'eau",
  'Twisting Passage': 'Passage sinueux',
  Chasm: 'Gouffre',
  'Winding Passage': 'Passage tortueux',
  'White Cliffs Beach': 'Plage des Falaises blanches',
  'Grating Room': 'Salle de la grille',
  Studio: 'Atelier',
  'Commandment #12592': 'Commandement nº 12592',

  // ── Composed full-line pins whose TELL pieces are extraction fragments
  //    (see zork1.extraction-ignore.ts for the pieces) ─────────────────────
  'Oh, no! A lurking grue slithered into the room and devoured you!':
    "Oh non ! Un grue à l'affût s'est glissé dans la salle et vous a dévoré !",
  'Your load is too heavy.': 'Votre chargement est trop lourd.',
  'Your load is too heavy, especially in light of your condition.':
    'Votre chargement est trop lourd, surtout vu votre état.',
  'The room looks strange and unearthly.':
    'La salle a un aspect étrange et surnaturel.',
  'The room looks strange and unearthly and objects appear indistinct.':
    'La salle a un aspect étrange et surnaturel et les objets paraissent indistincts.',
  'This gives you the rank of Wizard.': 'Cela vous confère le rang de Sorcier.',
  'This gives you the rank of Master.': 'Cela vous confère le rang de Maître.',
  'This gives you the rank of Adventurer.':
    "Cela vous confère le rang d'Aventurier.",
  'This gives you the rank of Junior Adventurer.':
    "Cela vous confère le rang d'Aventurier junior.",
  'This gives you the rank of Novice Adventurer.':
    "Cela vous confère le rang d'Aventurier novice.",
  'This gives you the rank of Amateur Adventurer.':
    "Cela vous confère le rang d'Aventurier amateur.",
  'This gives you the rank of Beginner.':
    'Cela vous confère le rang de Débutant.',

  // ── Composed full-line pins (review fix) — finite compositions whose TELL
  //    pieces are extraction fragments; every EN side verified against the
  //    composing ZIL (citations per group). ────────────────────────────────
  // V-DIAGNOSE prognosis & death-count lines (1actions.zil:4012-:4024).
  'You can expect death soon.': 'Vous pouvez vous attendre à mourir bientôt.',
  'You can be killed by one more light wound.':
    'Une blessure légère de plus peut vous tuer.',
  'You can be killed by a serious wound.':
    'Une blessure sérieuse peut vous tuer.',
  'You can survive one serious wound.':
    'Vous pouvez survivre à une blessure sérieuse.',
  'You can survive several wounds.':
    'Vous pouvez survivre à plusieurs blessures.',
  'You have been killed once.': 'Vous avez été tué une fois.',
  'You have been killed twice.': 'Vous avez été tué deux fois.',
  // WEAPON-FUNCTION via STILETTO-FUNCTION (1actions.zil:626-:638): the thief/
  // stiletto compositions need masculine agreement («le stylet»), so they are
  // pinned exact-first; the templates' feminine forms stay exact for the axe.
  'The thief swings it out of your reach.':
    'Le voleur le balance hors de votre portée.',
  "The stiletto seems white-hot. You can't hold on to it.":
    'Le stylet semble chauffé à blanc. Impossible de le garder en main.',
  // Lamp examine states (1actions.zil:2250-:2256); «morte» matches the
  // existing «La lampe est presque morte» / «Une lampe morte» family.
  'The lamp is on.': 'La lampe est allumée.',
  'The lamp is turned off.': 'La lampe est éteinte.',
  'The lamp has burned out.': 'La lampe est morte.',
  // Candle states (1actions.zil:2364-:2403).
  'The candles are already lit.': 'Les bougies sont déjà allumées.',
  'The candles are burning.': 'Les bougies brûlent.',
  'The candles are out.': 'Les bougies sont éteintes.',
  // Chimney examine (1actions.zil:547-:552) and the maintenance-room red
  // button (1actions.zil:1316-:1323).
  'The chimney leads upward, and looks climbable.':
    'La cheminée monte, et semble escaladable.',
  'The chimney leads downward, and looks climbable.':
    'La cheminée descend, et semble escaladable.',
  'The lights within the room shut off.':
    "Les lumières de la salle s'éteignent.",
  'The lights within the room come on.': "Les lumières de la salle s'allument.",
  // Rug raise (1actions.zil:581-:587).
  'The rug is too heavy to lift.': 'Le tapis est trop lourd pour être soulevé.',
  'The rug is too heavy to lift, but in trying to take it you have noticed an irregularity beneath it.':
    'Le tapis est trop lourd pour être soulevé, mais en essayant de le prendre, vous avez remarqué une irrégularité dessous.',
  // Maintenance-room flood ticker (1actions.zil:1345 × the DROWNINGS table
  // :1284-:1293 — all nine rungs).
  'The water level here is now up to your ankles.':
    "L'eau vous arrive maintenant aux chevilles.",
  'The water level here is now up to your shin.':
    "L'eau vous arrive maintenant au tibia.",
  'The water level here is now up to your knees.':
    "L'eau vous arrive maintenant aux genoux.",
  'The water level here is now up to your hips.':
    "L'eau vous arrive maintenant aux hanches.",
  'The water level here is now up to your waist.':
    "L'eau vous arrive maintenant à la taille.",
  'The water level here is now up to your chest.':
    "L'eau vous arrive maintenant à la poitrine.",
  'The water level here is now up to your neck.':
    "L'eau vous arrive maintenant au cou.",
  'The water level here is now over your head.':
    "L'eau vous passe maintenant par-dessus la tête.",
  'The water level here is now high in your lungs.':
    "L'eau emplit maintenant vos poumons.",
  // V-SWIM fixed tail (gverbs.zil:1332 — the {obj} variant is a template).
  "Swimming isn't usually allowed in the dungeon.":
    "La baignade n'est généralement pas autorisée dans le donjon.",
  // Boat re-launch quips (1actions.zil:2742-:2750 — three fixed nouns).
  'You are on the river, or have you forgotten?':
    "Vous êtes sur la rivière, l'auriez-vous oublié ?",
  'You are on the reservoir, or have you forgotten?':
    "Vous êtes sur le réservoir, l'auriez-vous oublié ?",
  'You are on the stream, or have you forgotten?':
    "Vous êtes sur le cours d'eau, l'auriez-vous oublié ?",
  // STUPID-CONTAINER (1actions.zil:4138-:4150 — coins and jewels only).
  'There are lots of coins in there.':
    'Il y a là-dedans des pièces en pagaille.',
  'There are lots of jewels in there.':
    'Il y a là-dedans des bijoux en pagaille.',
  "The coins are safely inside; there's no need to do that.":
    "Les pièces sont bien à l'abri à l'intérieur ; inutile de faire ça.",
  "The jewels are safely inside; there's no need to do that.":
    "Les bijoux sont bien à l'abri à l'intérieur ; inutile de faire ça.",
  // Kitchen-window look-through (1actions.zil:258-:262 — two fixed views).
  'You can see a clear area leading towards a forest.':
    'Vous apercevez une zone dégagée qui mène vers une forêt.',
  'You can see what appears to be a kitchen.':
    'Vous apercevez ce qui semble être une cuisine.',

  // ── Off-path lines, in story-file extraction order ──────────────────────
  'Nice view, lousy place to jump.':
    'Belle vue, mais piètre endroit pour sauter.',
  'This boat is guaranteed against all defects for a period of 76 milliseconds from date of purchase or until first used, whichever comes first.':
    "Ce bateau est garanti contre tout défaut pendant une période de 76 millisecondes à compter de la date d'achat ou jusqu'à la première utilisation, selon la première éventualité.",
  'Warning:': 'Avertissement :',
  'This boat is made of thin plastic.': 'Ce bateau est en plastique fin.',
  'Good Luck!': 'Bonne chance !',
  'The cyclops prefers eating to making conversation.':
    'Le cyclope préfère manger plutôt que faire la conversation.',
  'The construction of FCD#3 took 112 days from ground breaking to the dedication. It required a work force of 384 slaves, 34 slave drivers, 12 engineers, 2 turtle doves, and a partridge in a pear tree. The work was managed by a command team composed of 2345 bureaucrats, 2347 secretaries (at least two of whom could type), 12,256 paper shufflers, 52,469 rubber stampers, 245,193 red tape processors, and nearly one million dead trees.':
    "La construction du BRC nº 3 a demandé 112 jours, du premier coup de pioche à l'inauguration. Elle a nécessité une main-d'œuvre de 384 esclaves, 34 gardes-chiourme, 12 ingénieurs, 2 tourterelles et une perdrix dans un poirier. Les travaux ont été dirigés par une équipe de commandement composée de 2345 bureaucrates, 2347 secrétaires (dont au moins deux savaient taper à la machine), 12 256 brasseurs de papier, 52 469 manieurs de tampons, 245 193 processeurs de paperasse et près d'un million d'arbres morts.",
  'We will now point out some of the more interesting features of FCD#3 as we conduct you on a guided tour of the facilities:':
    'Nous allons maintenant vous présenter quelques-uns des aspects les plus intéressants du BRC nº 3 au fil de la visite guidée des installations :',
  'Hello, Sailor!': 'Salut, marin !',
  'Instructions for use:': "Mode d'emploi :",
  'To get into a body of water, say "Launch".':
    "Pour mettre à l'eau, dites « Launch ».",
  'To get to shore, say "Land" or the direction in which you want to maneuver the boat.':
    'Pour regagner la rive, dites « Land » ou la direction dans laquelle vous voulez manœuvrer le bateau.',
  'Warranty:': 'Garantie :',
  'Surely, thy eye shall be put out with a sharp stick!':
    "En vérité, ton œil sera crevé d'un bâton pointu !",
  'Unto the land of the dead shalt thou be sent at last.':
    'Au royaume des morts tu seras envoyé pour finir.',
  'Surely thou shalt repent of thy cunning.':
    'En vérité, tu te repentiras de ta ruse.',
  'The ground is too hard for digging here.':
    'Le sol est trop dur pour creuser ici.',
  'There is a suspicious-looking individual, holding a bag, leaning against one wall. He is armed with a vicious-looking stiletto.':
    "Un individu à l'air louche, tenant un sac, est adossé à un mur. Il est armé d'un stylet à l'air redoutable.",
  'You should say whether you want to go up or down.':
    'Vous devriez préciser si vous voulez monter ou descendre.',
  'There is a suspicious-looking individual lying unconscious on the ground.':
    "Un individu à l'air louche gît inconscient sur le sol.",
  "The door won't budge.": 'La porte refuse de bouger.',
  'The candles are becoming quite short.':
    'Les bougies commencent à être bien courtes.',
  'You must perform the ceremony.': 'Vous devez accomplir la cérémonie.',
  'You are on a narrow strip of beach which runs along the base of the White Cliffs. There is a narrow path heading south along the Cliffs and a tight passage leading west into the cliffs themselves.':
    "Vous êtes sur une étroite bande de plage qui court au pied des Falaises blanches. Un chemin étroit part au sud le long des Falaises et un passage resserré s'enfonce à l'ouest dans les falaises elles-mêmes.",
  'You tumble down the slide....': 'Vous dégringolez le toboggan...',
  'This has no effect.': "Cela n'a aucun effet.",
  "It's really not clear how.": 'Difficile de voir comment.',
  'You cannot climb any higher.': 'Vous ne pouvez pas grimper plus haut.',
  "You can't tie anything to yourself.":
    'Vous ne pouvez rien attacher à vous-même.',
  'You cannot fit through this passage with that load.':
    'Vous ne pouvez pas vous glisser dans ce passage avec un tel chargement.',
  'What a loony!': 'Quel cinglé !',
  'This cannot be tied, so it cannot be untied!':
    'Cela ne peut pas être attaché, donc cela ne peut pas être détaché !',
  'You cannot go down without fracturing many bones.':
    "Vous ne pourriez pas descendre sans vous fracturer bon nombre d'os.",
  'A hot pepper sandwich is here.': 'Il y a ici un sandwich au piment.',
  '(Close cover before striking)': '(Fermer la pochette avant de frotter)',
  'YOU too can make BIG MONEY in the exciting field of PAPER SHUFFLING!':
    'VOUS aussi pouvez GAGNER GROS dans le secteur passionnant du BRASSAGE DE PAPIER !',
  'Mr. Anderson of Muddle, Mass. says: "Before I took this course I was a lowly bit twiddler. Now with what I learned at GUE Tech I feel really important and can obfuscate and confuse with the best."':
    "M. Anderson, de Muddle, Mass., témoigne : « Avant de suivre ce cours, je n'étais qu'un humble tripoteur de bits. Maintenant, grâce à ce que j'ai appris à GUE Tech, je me sens vraiment important et je sais embrouiller et obscurcir avec les meilleurs. »",
  'Dr. Blank had this to say: "Ten short days ago all I could look forward to was a dead-end job as a doctor. Now I have a promising future and make really big Zorkmids."':
    "Le Dr Blank a déclaré : « Il y a dix petits jours, je n'avais d'autre avenir qu'un emploi sans perspectives de médecin. Aujourd'hui, j'ai un avenir prometteur et je gagne de très gros zorkmids. »",
  "GUE Tech can't promise these fantastic results to everyone. But when you earn your degree from GUE Tech, your future will be brighter.":
    'GUE Tech ne peut pas promettre ces résultats fantastiques à tout le monde. Mais avec un diplôme de GUE Tech, votre avenir sera plus radieux.',
  'You cannot reach the rope.': 'Vous ne pouvez pas atteindre la corde.',
  'Storm-tossed trees block your way.':
    'Des arbres abattus par la tempête vous barrent la route.',
  'In the trophy case is an ancient parchment which appears to be a map.':
    'Dans la vitrine à trophées se trouve un parchemin ancien qui semble être une carte.',
  'The map shows a forest with three clearings. The largest clearing contains a house. Three paths leave the large clearing. One of these paths, leading southwest, is marked "To Stone Barrow".':
    "La carte montre une forêt et trois clairières. La plus grande clairière contient une maison. Trois chemins quittent la grande clairière. L'un d'eux, vers le sud-ouest, porte l'inscription « Vers le Tumulus de pierre ».",
  'It is too narrow for most insects.':
    "C'est trop étroit pour la plupart des insectes.",
  'This cave has exits to the west and east, and narrows to a crack toward the south. The earth is particularly damp here.':
    "Cette grotte a des sorties à l'ouest et à l'est, et se resserre en une fissure vers le sud. La terre est particulièrement humide ici.",
  'Only Santa Claus climbs down chimneys.':
    "Il n'y a que le père Noël pour descendre par les cheminées.",
  'The forest becomes impenetrable to the north.':
    'La forêt devient impénétrable au nord.',
  'There is no tree here suitable for climbing.':
    "Il n'y a pas ici d'arbre qui se prête à l'escalade.",
  'You try to ascend the ramp, but it is impossible, and you slide back down.':
    "Vous essayez de gravir la rampe, mais c'est impossible, et vous glissez jusqu'en bas.",
  'The White Cliffs prevent your landing here.':
    "Les Falaises blanches vous empêchent d'accoster ici.",
  'You cannot go upstream due to strong currents.':
    'Vous ne pouvez pas remonter le courant, il est trop fort.',
  'Some invisible force prevents you from passing through the gate.':
    'Une force invisible vous empêche de franchir le portail.',
  'Loosely attached to a wall is a small piece of paper.':
    'Un petit bout de papier est fixé, sans grande conviction, à un mur.',
  'Congratulations!': 'Félicitations !',
  'You are the privileged owner of ZORK I: The Great Underground Empire, a self-contained and self-maintaining universe. If used and maintained in accordance with normal operating practices for small universes, ZORK will provide many months of trouble-free operation.':
    "Vous êtes l'heureux propriétaire de ZORK I : Le Grand Empire Souterrain, un univers autonome qui s'entretient tout seul. Utilisé et entretenu conformément aux pratiques d'exploitation normales des petits univers, ZORK vous offrira de nombreux mois de fonctionnement sans panne.",
  "It's a long way...": "C'est une longue chute...",
  'The troll neatly removes your head.': 'Le troll vous décapite proprement.',
  'Fweep!': 'Fuiiit !',
  'The sound of rushing water is nearly unbearable here. On the east shore is a large landing area.':
    "Le bruit des eaux tumultueuses est presque insupportable ici. Sur la rive est se trouve une grande aire d'accostage.",
  "The door is boarded and you can't remove the boards.":
    'La porte est condamnée et vous ne pouvez pas retirer les planches.',
  'The stream emerges from a spot too small for you to enter.':
    "Le cours d'eau jaillit d'un orifice trop petit pour que vous puissiez y entrer.",
  'You are standing on a path beside a gently flowing stream. The path follows the stream, which flows from west to east.':
    "Vous vous tenez sur un chemin au bord d'un cours d'eau paisible. Le chemin suit le cours d'eau, qui coule d'ouest en est.",
  'The prayer is inscribed in an ancient script, rarely used today. It seems to be a philippic against small insects, absent-mindedness, and the picking up and dropping of small objects. The final verse consigns trespassers to the land of the dead. All evidence indicates that the beliefs of the ancient Zorkers were obscure.':
    'La prière est rédigée dans une écriture ancienne, rarement employée de nos jours. Elle semble être une philippique contre les petits insectes, les étourderies, et la manie de ramasser et de poser de petits objets. La dernière strophe voue les intrus au royaume des morts. Tout indique que les croyances des anciens Zorkiens étaient obscures.',
  'The door is nailed shut.': 'La porte est clouée.',
  'Getting tired?': 'Vous vous fatiguez ?',
  'A small leaflet is on the ground.': 'Un petit dépliant est posé sur le sol.',
  '"WELCOME TO ZORK!': '« BIENVENUE DANS ZORK !',
  'ZORK is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals. No computer should be without one!"':
    "ZORK est un jeu d'aventure, de danger et de basse ruse. Vous y explorerez certains des territoires les plus stupéfiants jamais contemplés par des mortels. Aucun ordinateur ne devrait s'en passer ! »",
  'The east wall is solid rock.': 'Le mur oriental est en roche massive.',
  "The cyclops doesn't look like he'll let you past.":
    "Le cyclope n'a pas l'air disposé à vous laisser passer.",
  'There is a golden clockwork canary nestled in the egg. It has ruby eyes and a silver beak. Through a crystal window below its left wing you can see intricate machinery inside. It appears to have wound down.':
    "Un canari mécanique doré est niché dans l'œuf. Il a des yeux de rubis et un bec d'argent. À travers une fenêtre de cristal sous son aile gauche, on aperçoit une machinerie complexe. Son mécanisme semble arrivé en bout de course.",
  'The engravings were incised in the living rock of the cave wall by an unknown hand. They depict, in symbolic form, the beliefs of the ancient Zorkers. Skillfully interwoven with the bas reliefs are excerpts illustrating the major religious tenets of that time. Unfortunately, a later age seems to have considered them blasphemous and just as skillfully excised them.':
    "Les gravures ont été incisées dans la roche vive de la paroi par une main inconnue. Elles dépeignent, sous forme symbolique, les croyances des anciens Zorkiens. Habilement entrelacés aux bas-reliefs figurent des extraits illustrant les grands préceptes religieux de l'époque. Malheureusement, une époque plus tardive semble les avoir jugés blasphématoires et les a excisés avec la même habileté.",
  'The channel is too narrow.': 'Le chenal est trop étroit.',
  'You are on the gently flowing stream. The upstream route is too narrow to navigate, and the downstream route is invisible due to twisting walls. There is a narrow beach to land on.':
    "Vous êtes sur le cours d'eau paisible. La voie amont est trop étroite pour naviguer, et la voie aval est invisible derrière les méandres des parois. Il y a une plage étroite où accoster.",
  'Climbing the walls is to no avail.': 'Escalader les parois ne mène à rien.',
  'You would need a machete to go further west.':
    "Il vous faudrait une machette pour aller plus à l'ouest.",
  'A painting by a neglected genius is here.':
    "Il y a ici un tableau d'un génie méconnu.",
  'The dam blocks your way.': 'Le barrage vous barre la route.',
  'Nobody seems to be awaiting your answer.':
    'Personne ne semble attendre votre réponse.',
  "You're nuts!": 'Vous êtes fou !',
  'As the knife approaches its victim, your mind is submerged by an overmastering will. Slowly, your hand turns, until the rusty blade is an inch from your neck. The knife seems to sing as it savagely slits your throat.':
    "Tandis que le couteau approche de sa victime, votre esprit est submergé par une volonté irrésistible. Lentement, votre main tourne, jusqu'à ce que la lame rouillée soit à un pouce de votre cou. Le couteau semble chanter tandis qu'il vous tranche sauvagement la gorge.",
  'The engravings translate to "This space intentionally left blank."':
    'Les gravures signifient « Cet espace est volontairement laissé vide. »',
  'This is a winding passage. It seems that there are only exits on the east and north.':
    "C'est un passage tortueux. Il semble n'y avoir de sorties qu'à l'est et au nord.",
  'A look before leaping reveals that the river is wide and dangerous, with swift currents and large, half-hidden rocks. You decide to forgo your swim.':
    "Un coup d'œil avant de plonger vous révèle que la rivière est large et dangereuse, avec des courants rapides et de gros rochers à demi cachés. Vous décidez de renoncer à votre baignade.",
  'Are you out of your mind?': 'Avez-vous perdu la tête ?',
  'A chasm runs southwest to northeast and the path follows it. You are on the south side of the chasm, where a crack opens into a passage.':
    "Un gouffre court du sud-ouest au nord-est et le chemin le longe. Vous êtes du côté sud du gouffre, où une fissure s'ouvre sur un passage.",
  "Sounds reasonable, but this isn't how.":
    "Cela paraît raisonnable, mais ce n'est pas comme ça.",
  'There is a somewhat ruined egg here.':
    'Il y a ici un œuf plutôt mal en point.',
  'The rank undergrowth prevents eastward movement.':
    "Les broussailles denses empêchent d'aller vers l'est.",
  'You would drown.': 'Vous vous noieriez.',
  'The troll fends you off with a menacing gesture.':
    "Le troll vous repousse d'un geste menaçant.",
  "You haven't a prayer of getting the coffin down there.":
    "Vous n'avez pas l'ombre d'une chance de descendre le cercueil par là.",
  'The windows are all boarded.': 'Les fenêtres sont toutes condamnées.',
  'You probably put spinach in your gas tank, too.':
    "Vous mettez probablement des épinards dans votre réservoir d'essence, aussi.",
  'There is nothing but dust there.': "Il n'y a là que de la poussière.",
  'You have come to a dead end in the maze.':
    'Vous voici dans un cul-de-sac du labyrinthe.',
  'There is a golden clockwork canary nestled in the egg. It seems to have recently had a bad experience. The mountings for its jewel-like eyes are empty, and its silver beak is crumpled. Through a cracked crystal window below its left wing you can see the remains of intricate machinery. It is not clear what result winding it would have, as the mainspring seems sprung.':
    "Un canari mécanique doré est niché dans l'œuf. Il semble avoir récemment subi une mauvaise expérience. Les montures de ses yeux de joyaux sont vides, et son bec d'argent est tout cabossé. À travers une fenêtre de cristal fissurée sous son aile gauche, on aperçoit les restes d'une machinerie complexe. Difficile de dire ce que donnerait un remontage : le ressort principal semble faussé.",
  'On the ground is a pile of leaves.':
    'Sur le sol se trouve un tas de feuilles.',
  "You can't even do that.": 'Vous ne pouvez même pas faire ça.',
  'The path is too narrow.': 'Le chemin est trop étroit.',
  'You are on a rocky, narrow strip of beach beside the Cliffs. A narrow path leads north along the shore.':
    'Vous êtes sur une bande de plage rocheuse et étroite au pied des Falaises. Un chemin étroit part au nord le long du rivage.',
  'The mountains are impassable.': 'Les montagnes sont infranchissables.',
  'The forest thins out, revealing impassable mountains.':
    "La forêt s'éclaircit, révélant des montagnes infranchissables.",
  'How, exactly, can you ring that?':
    'Et comment, au juste, comptez-vous faire sonner ça ?',
  'Just in time you steer away from the rocks.':
    'Juste à temps, vous évitez les rochers.',
  'There is no safe landing spot here.':
    "Il n'y a pas d'endroit sûr pour accoster ici.",
  'Nothing happens.': 'Il ne se passe rien.',
  'You can land either to the east or the west.':
    "Vous pouvez accoster à l'est ou à l'ouest.",
  'There is an enormous diamond (perfectly cut) here.':
    'Il y a ici un énorme diamant (parfaitement taillé).',
  'A hungry cyclops is standing at the foot of the stairs.':
    "Un cyclope affamé se tient au pied de l'escalier.",
  'Oh ye who go about saying unto each: "Hello sailor":':
    'Ô vous qui allez disant à chacun : « Salut marin » :',
  'Dost thou know the magnitude of thy sin before the gods?':
    'Connais-tu la magnitude de ton péché devant les dieux ?',
  'Yea, verily, thou shalt be ground between two stones.':
    'Oui, en vérité, tu seras broyé entre deux meules.',
  'Shall the angry gods cast thy body into the whirlpool?':
    'Les dieux courroucés jetteront-ils ton corps dans le maelström ?',
  'An ornamented sceptre, tapering to a sharp point, is here.':
    'Il y a ici un sceptre ouvragé, effilé en une pointe acérée.',
  "This appears to have been an artist's studio. The walls and floors are splattered with paints of 69 different colors. Strangely enough, nothing of value is hanging here. At the south end of the room is an open door (also covered with paint). A dark and narrow chimney leads up from a fireplace; although you might be able to get up it, it seems unlikely you could get back down.":
    "Cela semble avoir été l'atelier d'un artiste. Les murs et le sol sont éclaboussés de peintures de 69 couleurs différentes. Curieusement, rien de valeur n'est accroché ici. À l'extrémité sud de la pièce se trouve une porte ouverte (couverte de peinture, elle aussi). Une cheminée sombre et étroite monte depuis un âtre ; vous pourriez sans doute y grimper, mais il semble peu probable que vous puissiez en redescendre.",
  'There is an old trunk here, bulging with assorted jewels.':
    'Il y a ici une vieille malle, débordant de bijoux en tout genre.',
  'The chests are all empty.': 'Les caisses sont toutes vides.',
  "You wouldn't fit and would die if you could.":
    'Vous ne passeriez pas, et vous mourriez si vous passiez.',
  'The chasm probably leads straight to the infernal regions.':
    'Le gouffre mène probablement tout droit aux régions infernales.',
  'You should have looked before you leaped.':
    'Vous auriez dû regarder avant de sauter.',
  'In the movies, your life would be passing before your eyes.':
    'Au cinéma, votre vie défilerait devant vos yeux.',
  'Geronimo...': 'Geronimo...',
  'Very good. Now you can go to the second grade.':
    'Très bien. Vous pouvez maintenant passer au cours élémentaire.',
  'Are you enjoying yourself?': 'Vous vous amusez bien ?',
  'Do you expect me to applaud?': 'Vous attendez des applaudissements ?',
  "You can't swim in the dungeon.": 'On ne nage pas dans le donjon.',
  'Hello.': 'Bonjour.',
  'Good day.': 'Bien le bonjour.',
  "Nice weather we've been having lately.":
    "Beau temps, ces derniers jours, n'est-ce pas ?",
  'Goodbye.': 'Au revoir.',
  'A valiant attempt.': 'Une vaillante tentative.',
  "You can't be serious.": 'Vous ne parlez pas sérieusement.',
  'An interesting idea...': 'Une idée intéressante...',
  'What a concept!': 'Quel concept !',
  'Look around.': 'Regardez autour de vous.',
  'Too late for that.': 'Trop tard pour ça.',
  'Have your eyes checked.': 'Faites contrôler votre vue.',
  'With the leaves moved, a grating is revealed.':
    'Les feuilles déplacées révèlent une grille.',
  'A shimmering pot of gold appears at the end of the rainbow.':
    "Un pot d'or scintillant apparaît au bout de l'arc-en-ciel.",
  'The lamp has smashed into the floor, and the light has gone out.':
    "La lampe s'est fracassée sur le sol, et la lumière s'est éteinte.",
  'You look before leaping, and realize that you would never survive.':
    "Vous regardez avant de sauter, et comprenez que vous n'y survivriez pas.",
  'A sound, like that of flowing water, starts to come from below.':
    "Un bruit, comme celui d'une eau qui coule, commence à monter d'en bas.",
  'You can\'t launch that by saying "launch"!':
    "Vous ne pouvez pas mettre ça à l'eau en disant « launch » !",
  'Sorry, my memory is poor. Please give a direction.':
    'Désolé, ma mémoire est mauvaise. Veuillez donner une direction.',
  "The candles won't last long now.":
    "Les bougies n'en ont plus pour longtemps.",
  "Your bare hands don't appear to be enough.":
    'Vos mains nues ne semblent pas suffire.',
  "I'd sooner kiss a pig.": 'Plutôt embrasser un cochon.',
  'How can you inflate that?': 'Comment voulez-vous gonfler ça ?',
  "Why don't you just walk like normal people?":
    'Pourquoi ne pas simplement marcher comme les gens normaux ?',
  'The incantation echoes back faintly, but nothing else happens.':
    "L'incantation renvoie un faible écho, mais rien d'autre ne se produit.",
  'You will be lost without me!': 'Vous serez perdu sans moi !',
  'Bizarre!': 'Bizarre !',
  "You can't fit through the crack.": 'Vous ne passez pas par la fissure.',
  'There is no granite wall here.': "Il n'y a pas de mur de granit ici.",
  'The bat grabs you by the scruff of your neck and lifts you away....':
    'La chauve-souris vous attrape par la peau du cou et vous emporte...',
  'The trophy case is securely fastened to the wall.':
    'La vitrine à trophées est solidement fixée au mur.',
  "Nobody's home.": "Il n'y a personne.",
  'The mirror is broken into many pieces.':
    'Le miroir est brisé en mille morceaux.',
  "I suppose you think it's a magic carpet?":
    'Vous le prenez pour un tapis volant, je suppose ?',
  'You are on the lake. Beaches can be seen north and south. Upstream a small stream enters the lake through a narrow cleft in the rocks. The dam can be seen downstream.':
    "Vous êtes sur le lac. On aperçoit des plages au nord et au sud. En amont, un petit cours d'eau entre dans le lac par une étroite brèche dans les rochers. On aperçoit le barrage en aval.",
  'The cyclops seems somewhat agitated.':
    'Le cyclope semble quelque peu agité.',
  'The cyclops appears to be getting more agitated.':
    'Le cyclope semble de plus en plus agité.',
  'The cyclops is moving about the room, looking for something.':
    'Le cyclope arpente la salle, à la recherche de quelque chose.',
  'The cyclops was looking for salt and pepper. No doubt they are condiments for his upcoming snack.':
    'Le cyclope cherchait du sel et du poivre. Sans doute des condiments pour son prochain en-cas.',
  'The cyclops is moving toward you in an unfriendly manner.':
    "Le cyclope s'avance vers vous d'une manière peu amicale.",
  'You have two choices: 1. Leave 2. Become dinner.':
    'Vous avez deux options : 1. Partir 2. Devenir le dîner.',
  'The lamp is definitely dimmer now.':
    'La lampe est nettement plus faible maintenant.',
  'The lamp is nearly out.': 'La lampe est presque morte.',
  'The candles grow shorter.': 'Les bougies raccourcissent.',
  'Your stroke lands, but it was only the flat of the blade.':
    "Votre coup porte, mais ce n'était que le plat de la lame.",
  'You must be joking.': 'Vous plaisantez, je suppose.',
  'Slash! Your blow lands! That one hit an artery, it could be serious!':
    'Vlan ! Votre coup porte ! Une artère est touchée, cela pourrait être grave !',
  'Slash! Your stroke connects! This could be serious!':
    'Vlan ! Votre coup porte ! Cela pourrait être grave !',
  'The Cyclops misses, but the backwash almost knocks you over.':
    "Le Cyclope vous rate, mais le déplacement d'air manque de vous renverser.",
  'The Cyclops rushes you, but runs into the wall.':
    "Le Cyclope se rue sur vous, mais s'écrase contre le mur.",
  'The Cyclops sends you crashing to the floor, unconscious.':
    'Le Cyclope vous envoie au sol, inconscient.',
  'The Cyclops breaks your neck with a massive smash.':
    "Le Cyclope vous brise la nuque d'un coup formidable.",
  'A quick punch, but it was only a glancing blow.':
    "Un coup de poing rapide, mais il n'a fait que vous effleurer.",
  "A glancing blow from the Cyclops' fist.":
    'Un coup oblique du poing du Cyclope.',
  'The monster smashes his huge fist into your chest, breaking several ribs.':
    'Le monstre abat son poing énorme sur votre poitrine, brisant plusieurs côtes.',
  'The Cyclops almost knocks the wind out of you with a quick punch.':
    "Le Cyclope manque de vous couper le souffle d'un coup de poing rapide.",
  'The Cyclops lands a punch that knocks the wind out of you.':
    'Le Cyclope place un coup de poing qui vous coupe le souffle.',
  'Heedless of your weapons, the Cyclops tosses you against the rock wall of the room.':
    'Sans se soucier de vos armes, le Cyclope vous projette contre la paroi rocheuse de la salle.',
  'The Cyclops seems unable to decide whether to broil or stew his dinner.':
    "Le Cyclope semble incapable de décider s'il fera griller ou mijoter son dîner.",
  'The Cyclops, no sportsman, dispatches his unconscious victim.':
    "Le Cyclope, beau joueur s'abstenir, achève sa victime inconsciente.",
  'The axe sweeps past as you jump aside.':
    'La hache passe en sifflant tandis que vous bondissez de côté.',
  'The axe crashes against the rock, throwing sparks!':
    "La hache s'écrase contre la roche dans une gerbe d'étincelles !",
  "The flat of the troll's axe hits you delicately on the head, knocking you out.":
    'Le plat de la hache du troll vous frappe délicatement la tête, vous assommant.',
  "The troll's axe stroke cleaves you from the nave to the chops.":
    'Le coup de hache du troll vous fend du nombril au menton.',
  "The troll's axe removes your head.": 'La hache du troll vous décapite.',
  'The axe gets you right in the side. Ouch!':
    'La hache vous atteint en plein flanc. Aïe !',
  "The flat of the troll's axe skins across your forearm.":
    "Le plat de la hache du troll vous écorche l'avant-bras.",
  "The troll's swing almost knocks you over as you barely parry in time.":
    'Le moulinet du troll manque de vous renverser tandis que vous parez de justesse.',
  'The troll swings his axe, and it nicks your arm as you dodge.':
    'Le troll abat sa hache, qui vous entaille le bras tandis que vous esquivez.',
  'An axe stroke makes a deep wound in your leg.':
    'Un coup de hache vous fait une profonde blessure à la jambe.',
  "The troll's axe swings down, gashing your shoulder.":
    "La hache du troll s'abat, vous tailladant l'épaule.",
  'The troll hits you with a glancing blow, and you are momentarily stunned.':
    "Le troll vous frappe d'un coup oblique, et vous restez un instant étourdi.",
  'The troll swings; the blade turns on your armor but crashes broadside into your head.':
    "Le troll frappe ; la lame ripe sur votre armure mais s'écrase de plein fouet contre votre tête.",
  'You stagger back under a hail of axe strokes.':
    'Vous reculez en chancelant sous une grêle de coups de hache.',
  'The troll hesitates, fingering his axe.':
    'Le troll hésite, tâtant sa hache.',
  'The troll scratches his head ruminatively: Might you be magically protected, he wonders?':
    "Le troll se gratte la tête d'un air songeur : seriez-vous protégé par magie, se demande-t-il ?",
  'Conquering his fears, the troll puts you to death.':
    'Surmontant ses craintes, le troll vous met à mort.',
  'The thief stabs nonchalantly with his stiletto and misses.':
    'Le voleur frappe nonchalamment de son stylet et vous rate.',
  'You parry a lightning thrust, and the thief salutes you with a grim nod.':
    "Vous parez une botte fulgurante, et le voleur vous salue d'un hochement de tête sinistre.",
  'The thief tries to sneak past your guard, but you twist away.':
    "Le voleur tente de se faufiler dans votre garde, mais vous vous dérobez d'une torsion.",
  'Shifting in the midst of a thrust, the thief knocks you unconscious with the haft of his stiletto.':
    "Changeant de cible au beau milieu d'une botte, le voleur vous assomme du pommeau de son stylet.",
  'The thief knocks you out.': 'Le voleur vous assomme.',
  'Finishing you off, the thief inserts his blade into your heart.':
    'Pour vous achever, le voleur vous plonge sa lame dans le cœur.',
  'The thief comes in from the side, feints, and inserts the blade into your ribs.':
    'Le voleur arrive de côté, feinte, et vous glisse sa lame entre les côtes.',
  'The thief bows formally, raises his stiletto, and with a wry grin, ends the battle and your life.':
    "Le voleur s'incline cérémonieusement, lève son stylet et, avec un sourire narquois, met fin au combat et à votre vie.",
  'A quick thrust pinks your left arm, and blood starts to trickle down.':
    'Une botte rapide vous pique le bras gauche, et le sang commence à couler.',
  'The thief draws blood, raking his stiletto across your arm.':
    'Le voleur fait couler le sang, raclant son stylet le long de votre bras.',
  'The thief slowly approaches, strikes like a snake, and leaves you wounded.':
    "Le voleur s'approche lentement, frappe comme un serpent, et vous laisse blessé.",
  'The thief strikes like a snake! The resulting wound is serious.':
    'Le voleur frappe comme un serpent ! La blessure est sérieuse.',
  'The thief stabs a deep cut in your upper arm.':
    'Le voleur vous taillade profondément le haut du bras.',
  'The stiletto touches your forehead, and the blood obscures your vision.':
    'Le stylet vous touche au front, et le sang vous brouille la vue.',
  'The thief strikes at your wrist, and suddenly your grip is slippery with blood.':
    'Le voleur frappe à votre poignet, et soudain votre prise glisse, pleine de sang.',
  'The songbird is not here but is probably nearby.':
    "L'oiseau chanteur n'est pas ici, mais il est probablement tout près.",
  'The butt of his stiletto cracks you on the skull, and you stagger back.':
    'Le pommeau de son stylet vous craque le crâne, et vous reculez en chancelant.',
  'The thief rams the haft of his blade into your stomach, leaving you out of breath.':
    "Le voleur vous enfonce le manche de sa lame dans l'estomac, vous coupant le souffle.",
  'The thief attacks, and you fall back desperately.':
    'Le voleur attaque, et vous reculez désespérément.',
  'The thief, a man of superior breeding, pauses for a moment to consider the propriety of finishing you off.':
    "Le voleur, homme d'excellente éducation, marque une pause pour considérer s'il est convenable de vous achever.",
  'The thief amuses himself by searching your pockets.':
    "Le voleur s'amuse à fouiller vos poches.",
  'The thief entertains himself by rifling your pack.':
    'Le voleur se distrait en faisant les poches de votre sac.',
  'The thief, forgetting his essentially genteel upbringing, cuts your throat.':
    'Le voleur, oubliant son éducation foncièrement distinguée, vous tranche la gorge.',
  'The thief, a pragmatist, dispatches you as a threat to his livelihood.':
    'Le voleur, en pragmatique, vous élimine comme une menace pour son gagne-pain.',
  "You're not at the house.": "Vous n'êtes pas à la maison.",
  'That hiding place is too obvious.': 'Cette cachette est trop évidente.',
  "You didn't say with what!": "Vous n'avez pas dit avec quoi !",
  'Your image in the mirror looks tired.':
    "Votre reflet dans le miroir a l'air fatigué.",
  "If you insist.... Poof, you're dead!":
    'Si vous insistez... Pouf, vous êtes mort !',
  'The water cools the bell and is evaporated.':
    "L'eau refroidit la cloche et s'évapore.",
  'It is an integral part of the control panel.':
    'Cela fait partie intégrante du panneau de commande.',
  'You nearly burn your hand trying to extinguish the flame.':
    "Vous manquez de vous brûler la main en essayant d'éteindre la flamme.",
  'You have it.': "Vous l'avez.",
  'The sluice gates are closed. The water level in the reservoir is quite low, but the level is rising quickly.':
    "Les vannes sont fermées. Le niveau de l'eau dans le réservoir est très bas, mais il monte rapidement.",
  'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been extremely wealthy.':
    'La maison est une belle demeure coloniale peinte en blanc. De toute évidence, ses propriétaires devaient être extrêmement riches.',
  'Failed.': 'Échec.',
  'You cannot talk to that!': 'Vous ne pouvez pas parler à ça !',
  'Some paint chips away, revealing more paint.':
    'Quelques éclats de peinture se détachent, révélant davantage de peinture.',
  "You can't do that.": 'Vous ne pouvez pas faire ça.',
  'No chance. Some moron punctured it.': "Aucune chance. Un abruti l'a crevé.",
  'A force keeps you from taking the bodies.':
    'Une force vous empêche de prendre les corps.',
  'The water level has dropped to the point at which the boat can no longer stay afloat. It sinks into the mud.':
    "Le niveau de l'eau a tellement baissé que le bateau ne peut plus flotter. Il s'enfonce dans la boue.",
  "The windows are boarded and can't be opened.":
    'Les fenêtres sont condamnées et ne peuvent pas être ouvertes.',
  "You can't pick that.": 'Vous ne pouvez pas crocheter ça.',
  'The viscous material oozes into your hand.':
    'La matière visqueuse vous suinte dans la main.',
  'There is nothing to fill it with.': "Il n'y a rien ici pour la remplir.",
  'Oh, no! You have walked into the slavering fangs of a lurking grue!':
    "Oh non ! Vous venez de marcher droit dans les crocs baveux d'un grue à l'affût !",
  "You'll have to do that on your own.": 'Il faudra faire ça par vous-même.',
  'The voice of the guardian of the dungeon booms out from the darkness, "Your disrespect costs you your life!" and places your head on a sharp pole.':
    'La voix du gardien du donjon tonne depuis les ténèbres : « Votre irrévérence vous coûte la vie ! » et plante votre tête sur une pique acérée.',
  "You have broken the mirror. I hope you have a seven years' supply of good luck handy.":
    "Vous avez brisé le miroir. J'espère que vous avez sept ans de bonne chance en réserve.",
  'Well, you seem to have been brushing your teeth with some sort of glue. As a result, your mouth gets glued together (with your nose) and you die of respiratory failure.':
    "Eh bien, il semble que vous vous soyez brossé les dents avec une sorte de colle. Résultat, votre bouche se retrouve collée (avec votre nez) et vous mourez d'insuffisance respiratoire.",
  "Those things aren't here!": 'Ces choses ne sont pas ici !',
  "You can't spin that!": 'Vous ne pouvez pas faire tourner ça !',
  'FCD#3 was constructed in year 783 of the Great Underground Empire to harness the mighty Frigid River. This work was supported by a grant of 37 million zorkmids from your omnipotent local tyrant Lord Dimwit Flathead the Excessive. This impressive structure is composed of 370,000 cubic feet of concrete, is 256 feet tall at the center, and 193 feet wide at the top. The lake created behind the dam has a volume of 1.7 billion cubic feet, an area of 12 million square feet, and a shore line of 36 thousand feet.':
    "Le BRC nº 3 fut construit en l'an 783 du Grand Empire Souterrain pour dompter la puissante rivière Frigid. Ces travaux furent financés par une subvention de 37 millions de zorkmids accordée par votre tyran local omnipotent, Lord Dimwit Flathead l'Excessif. Cette structure impressionnante se compose de 370 000 pieds cubes de béton, mesure 256 pieds de haut en son centre et 193 pieds de large au sommet. Le lac créé derrière le barrage a un volume de 1,7 milliard de pieds cubes, une superficie de 12 millions de pieds carrés et un rivage de 36 mille pieds.",
  'The water level behind the dam is low: The sluice gates have been opened. Water rushes through the dam and downstream.':
    "Le niveau de l'eau derrière le barrage est bas : les vannes ont été ouvertes. L'eau s'engouffre à travers le barrage et file vers l'aval.",
  "You can't push things to that.":
    'Vous ne pouvez pas pousser des choses vers ça.',
  'The window closes (more easily than it opened).':
    "La fenêtre se referme (plus facilement qu'elle ne s'était ouverte).",
  'The bell is very hot and cannot be taken.':
    'La cloche est très chaude et ne peut pas être prise.',
  'The door swings shut and closes.': 'La porte pivote et se referme.',
  "It's too dark to see!": 'Il fait trop noir pour y voir !',
  'A troll is here.': 'Il y a un troll ici.',
  'The book is already open to page 569.':
    'Le livre est déjà ouvert à la page 569.',
  'A pathetically babbling troll is here.':
    'Un troll babillant pathétiquement est ici.',
  'An unconscious troll is sprawled on the floor. All passages out of the room are open.':
    'Un troll inconscient est affalé sur le sol. Toutes les issues de la salle sont ouvertes.',
  'You cannot close that.': 'Vous ne pouvez pas fermer ça.',
  'The leaves burn, and so do you.': 'Les feuilles brûlent, et vous aussi.',
  'The west wall is solid granite here.':
    'Le mur ouest est ici en granit massif.',
  'The grating opens to reveal trees above you.':
    "La grille s'ouvre, révélant des arbres au-dessus de vous.",
  "It's in the bottle. Perhaps you should take that instead.":
    "C'est dans la bouteille. Vous devriez peut-être prendre celle-ci, plutôt.",
  "I'm afraid that the leap you attempted has done you in.":
    "Je crains que le saut que vous avez tenté n'ait eu raison de vous.",
  'Hanging down from the railing is a rope which ends about ten feet from the floor below.':
    "De la rambarde pend une corde qui s'arrête à une dizaine de pieds du sol en contrebas.",
  "It's really dark in here....": 'Il fait vraiment noir ici...',
  'How can you drink that?': 'Comment voulez-vous boire ça ?',
  'You are lifted up by the rising river! You try to swim, but the currents are too strong. You come closer, closer to the awesome structure of Flood Control Dam #3. The dam beckons to you. The roar of the water nearly deafens you, but you remain conscious as you tumble over the dam toward your certain doom among the rocks at its base.':
    "Vous êtes soulevé par la crue de la rivière ! Vous essayez de nager, mais les courants sont trop forts. Vous approchez, toujours plus près, de l'imposante structure du Barrage de régulation des crues nº 3. Le barrage vous fait signe. Le rugissement de l'eau vous assourdit presque, mais vous restez conscient tandis que vous basculez par-dessus le barrage, vers votre perte certaine parmi les rochers à son pied.",
  'The room is full of water and cannot be entered.':
    "La salle est pleine d'eau et on ne peut pas y entrer.",
  "I'm afraid you have done drowned yourself.":
    'Je crains que vous ne vous soyez bel et bien noyé.',
  'The rising water carries the boat over the dam, down the river, and over the falls. Tsk, tsk.':
    'La montée des eaux emporte le bateau par-dessus le barrage, le long de la rivière, puis par-dessus les chutes. Tss, tss.',
  'In other words, fighting the fierce currents of the Frigid River. You manage to hold your own for a bit, but then you are carried over a waterfall and into some nasty rocks. Ouch!':
    'Autrement dit, lutter contre les courants féroces de la rivière Frigid. Vous tenez bon un moment, mais vous êtes ensuite emporté par-dessus une cascade et précipité sur de très désagréables rochers. Aïe !',
  'The bell is too hot to touch.':
    "La cloche est trop chaude pour qu'on la touche.",
  'You could certainly never tie it with that!':
    "Vous ne pourriez certainement jamais l'attacher avec ça !",
  'Above you is a grating.': 'Au-dessus de vous se trouve une grille.',
  'The cyclops, tired of all of your games and trickery, grabs you firmly. As he licks his chops, he says "Mmm. Just like Mom used to make \'em." It\'s nice to be appreciated.':
    "Le cyclope, lassé de tous vos jeux et de vos ruses, vous empoigne fermement. En se léchant les babines, il déclare : « Mmm. Tout comme ceux de maman. » C'est agréable d'être apprécié.",
  'It could very well be too late!':
    "Il se pourrait bien qu'il soit trop tard !",
  'Talking to yourself is said to be a sign of impending mental collapse.':
    "Parler tout seul est, dit-on, un signe d'effondrement mental imminent.",
  'The spirits jeer loudly and ignore you.':
    'Les esprits raillent bruyamment et vous ignorent.',
  'The bell is too hot to reach.':
    'La cloche est trop chaude pour être atteinte.',
  'A booming voice says "Wrong, cretin!" and you notice that you have turned into a pile of dust. How, I can\'t imagine.':
    "Une voix tonitruante dit « Faux, crétin ! » et vous constatez que vous êtes changé en tas de poussière. Comment, je n'arrive pas à l'imaginer.",
  'There is a worthless piece of canvas here.':
    'Il y a ici un bout de toile sans valeur.',
  'Aaaarrrrgggghhhh!': 'Aaaarrrrgggghhhh !',
  "That's silly!": "C'est ridicule !",
  'The structural integrity of the rainbow is severely compromised, leaving you hanging in midair, supported only by water vapor. Bye.':
    "L'intégrité structurelle de l'arc-en-ciel est gravement compromise, et vous voilà suspendu dans le vide, soutenu par de la seule vapeur d'eau. Adieu.",
  'Shaken.': 'Secoué.',
  'You splash around for a while, fighting the current, then you drown.':
    'Vous barbotez un moment, luttant contre le courant, puis vous vous noyez.',
  'The tube refuses to accept anything.':
    "Le tube refuse d'accepter quoi que ce soit.",
  "Unfortunately, the magic boat doesn't provide protection from the rocks and boulders one meets at the bottom of waterfalls. Including this one.":
    "Malheureusement, le bateau magique ne protège pas des rochers et des blocs de pierre qu'on rencontre au pied des cascades. Y compris celle-ci.",
  'Another pathetic sputter, this time from you, heralds your drowning.':
    'Un nouveau gargouillis pathétique, le vôtre cette fois, annonce votre noyade.',
  "It's solid granite.": "C'est du granit massif.",
  'The hole collapses, smothering you.': "Le trou s'effondre, vous étouffant.",
  'That was just a bit too far down.': "C'était juste un peu trop bas.",
  'I beg your pardon?': 'Je vous demande pardon ?',
  'Do you wish to restart? (Y is affirmative):':
    'Voulez-vous recommencer ? (Y pour oui) :',
  'Well, you really did it that time. Is suicide painless?':
    'Eh bien, cette fois vous avez réussi votre coup. Le suicide est-il indolore ?',
  "It appears that that last blow was too much for you. I'm afraid you are dead.":
    'Il semble que ce dernier coup ait été de trop pour vous. Je crains que vous ne soyez mort.',
  "You can't talk to the sailor that way.":
    'On ne parle pas au marin sur ce ton.',
  'The water slips through your fingers.':
    "L'eau vous glisse entre les doigts.",
  'The FROBOZZ Corporation created, owns, and operates this dungeon.':
    'La société FROBOZZ a créé ce donjon ; elle en est propriétaire et exploitante.',
  'Naturally!': 'Naturellement !',
  'The pines and the hemlocks seem to be murmuring.':
    'Les pins et les pruches semblent murmurer.',
  'You can hear the sound of flowing water from below.':
    "Vous entendez le bruit d'une eau qui coule venant d'en bas.",
  'All of a sudden, an alarmingly loud roaring sound fills the room. Filled with fear, you scramble away.':
    "Tout à coup, un rugissement d'une puissance alarmante emplit la salle. Saisi de peur, vous détalez.",
  'It makes no sound but is always lurking in the darkness nearby.':
    'Il ne fait aucun bruit mais rôde toujours dans les ténèbres, tout près.',
  'The disk is correct.': 'Le disque est correct.',
  'Beats me.': 'Aucune idée.',
  'How peculiar!': 'Curieux !',
  "You're inside of it!": "Vous êtes à l'intérieur !",
  'The door cannot be opened.': 'La porte ne peut pas être ouverte.',
  'It is far too large to carry.': "C'est bien trop gros pour être porté.",
  'The grating is closed!': 'La grille est fermée !',
  "You can't go that way.": 'Vous ne pouvez pas aller par là.',
  'There is no sailor to be seen.': 'On ne voit aucun marin.',
  'You seem to be repeating yourself.': 'Vous semblez vous répéter.',
  'I think that phrase is getting a bit worn out.':
    'Je crois que cette phrase commence à être usée.',
  'Nothing happens here.': 'Il ne se passe rien ici.',
  'The grue is a sinister, lurking presence in the dark places of the earth. Its favorite diet is adventurers, but its insatiable appetite is tempered by its fear of light. No grue has ever been seen by the light of day, and few have survived its fearsome jaws to tell the tale.':
    "Le grue est une présence sinistre qui rôde dans les recoins sombres de la terre. Son régime favori est l'aventurier, mais son appétit insatiable est tempéré par sa peur de la lumière. Aucun grue n'a jamais été vu à la lumière du jour, et rares sont ceux qui ont survécu à ses mâchoires redoutables pour le raconter.",
  "There is no grue here, but I'm sure there is at least one lurking in the darkness nearby. I wouldn't let my light go out if I were you!":
    "Il n'y a pas de grue ici, mais je suis sûr qu'il y en a au moins un qui rôde dans les ténèbres, tout près. À votre place, je ne laisserais pas ma lumière s'éteindre !",
  'Only you can do that.': "Il n'y a que vous pour faire ça.",
  'Auto-cannibalism is not the answer.':
    "L'autocannibalisme n'est pas la solution.",
  'Suicide is not the answer.': "Le suicide n'est pas la solution.",
  'How romantic!': "Comme c'est romantique !",
  "That's difficult unless your eyes are prehensile.":
    "C'est difficile, à moins d'avoir les yeux préhensiles.",
  'You must specify a direction to go.': 'Vous devez préciser une direction.',
  "I can't help you there....": 'Là, je ne peux rien pour vous...',
  'Not a chance.': 'Aucune chance.',
  'The zorkmid is the unit of currency of the Great Underground Empire.':
    "Le zorkmid est l'unité monétaire du Grand Empire Souterrain.",
  'The best way to find zorkmids is to go out and look for them.':
    "Le meilleur moyen de trouver des zorkmids, c'est d'aller en chercher.",
  "It's too dark to see.": 'Il fait trop noir pour y voir.',
  "It's not clear what you're referring to.":
    'Difficile de savoir de quoi vous parlez.',
  "There's nothing here you can take.": "Il n'y a rien à prendre ici.",
  "I don't see what you are referring to.":
    'Je ne vois pas de quoi vous parlez.',
  "I can't help your clumsiness.": 'Je ne peux rien pour votre maladresse.',
  "Sorry, you can't correct mistakes in quoted text.":
    'Désolé, on ne peut pas corriger les erreurs dans un texte cité.',
  'Warning: only the first word after OOPS is used.':
    'Attention : seul le premier mot après OOPS est pris en compte.',
  'There was no word to replace!': "Il n'y avait aucun mot à remplacer !",
  'Beg pardon?': 'Plaît-il ?',
  "It's difficult to repeat fragments.": 'Difficile de répéter des fragments.',
  'That would just repeat a mistake.': 'Cela ne ferait que répéter une erreur.',
  "I couldn't understand that sentence.": "Je n'ai pas compris cette phrase.",
  'There were too many nouns in that sentence.':
    'Il y avait trop de noms dans cette phrase.',
  'Please consult your manual for the correct way to talk to other people or creatures.':
    "Veuillez consulter votre manuel pour savoir comment s'adresser correctement aux autres personnes ou créatures.",
  'There was no verb in that sentence!':
    "Il n'y avait pas de verbe dans cette phrase !",
  "That sentence isn't one I recognize.":
    'Cette phrase ne fait pas partie de celles que je reconnais.',
  "That question can't be answered.":
    'Impossible de répondre à cette question.',
  '"I don\'t understand! What are you referring to?"':
    '« Je ne comprends pas ! De quoi parlez-vous ? »',
  'There seems to be a noun missing in that sentence!':
    'Il semble manquer un nom dans cette phrase !',
  "I don't see what you're referring to.":
    'Je ne vois pas de quoi vous parlez.',
  "You don't have that!": "Vous n'avez pas ça !",
  'Maximum verbosity.': 'Verbosité maximale.',
  'Brief descriptions.': 'Descriptions brèves.',
  'Superbrief descriptions.': 'Descriptions ultra-brèves.',
  'You are empty-handed.': 'Vous avez les mains vides.',
  'Do you wish to leave the game? (Y is affirmative):':
    'Voulez-vous quitter la partie ? (Y pour oui) :',
  'Restarting.': 'Nouvelle partie.',
  'Verifying disk...': 'Vérification du disque...',
  'Illegal call to #RND.': 'Appel illégal à #RND.',
  'A hollow voice says "Fool."': 'Une voix caverneuse dit « Imbécile. »',
  "He's wide awake, or haven't you noticed...":
    "Il est parfaitement réveillé, vous n'aviez pas remarqué ?...",
  "You can't blast anything by using words.":
    'Vous ne ferez rien exploser à coups de mots.',
  'If you wish, but heaven only knows why.':
    'Si vous voulez, mais Dieu seul sait pourquoi.',
  'Bug? Not in a flawless program like this! (Cough, cough).':
    'Un bug ? Pas dans un programme aussi irréprochable que celui-ci ! (Hum, hum).',
  'Preposterous!': 'Grotesque !',
  'There are no climbable trees here.': "Il n'y a pas d'arbre escaladable ici.",
  "You can't do that!": 'Vous ne pouvez pas faire ça !',
  'It is already closed.': "C'est déjà fermé.",
  'Well, for one, you are playing Zork...':
    'Eh bien, pour commencer, vous jouez à Zork...',
  'You have lost your mind.': 'Vous avez perdu la tête.',
  "You can't cross that!": 'Vous ne pouvez pas traverser ça !',
  "Insults of this nature won't help you.":
    'Les insultes de ce genre ne vous aideront pas.',
  'Such language in a high-class establishment like this!':
    'Un tel langage dans un établissement aussi distingué !',
  "Not a bright idea, especially since you're in it.":
    'Pas une idée lumineuse, surtout que vous êtes dedans.',
  'Come on, now!': 'Allons, voyons !',
  "There's no reason to be digging here.":
    "Il n'y a aucune raison de creuser ici.",
  "You're not in that!": "Vous n'êtes pas dedans !",
  'You realize that getting out here would be fatal.':
    'Vous comprenez que sortir ici vous serait fatal.',
  "You're not holding that.": 'Vous ne tenez pas ça.',
  'Thank you very much. It really hit the spot.':
    'Merci beaucoup. Ça a fait le plus grand bien.',
  "There isn't any water here.": "Il n'y a pas d'eau ici.",
  'Thank you very much. I was rather thirsty (from all this talking, probably).':
    "Merci beaucoup. J'avais plutôt soif (à force de parler, sans doute).",
  'You are left in the dark...': 'Vous voilà dans le noir...',
  'What a bizarre concept!': 'Quel concept bizarre !',
  "There's nothing to fill it with.": "Il n'y a rien ici pour le remplir.",
  "You may know how to do that, but I don't.":
    'Vous savez peut-être comment faire ça, mais pas moi.',
  "Within six feet of your head, assuming you haven't left that somewhere.":
    "À moins de six pieds de votre tête, à supposer que vous ne l'ayez pas laissée quelque part.",
  "You're around here somewhere...": 'Vous êtes quelque part par ici...',
  'You find it.': 'Vous le trouvez.',
  "It's right here.": "C'est juste ici.",
  'It is already off.': "C'est déjà éteint.",
  "You can't turn that off.": 'Vous ne pouvez pas éteindre ça.',
  'It is already on.': "C'est déjà allumé.",
  "You can't turn that on.": 'Vous ne pouvez pas allumer ça.',
  "That's pretty weird.": 'Voilà qui est plutôt étrange.',
  'That would be a good trick.': 'Ce serait un joli tour.',
  'This was not a very safe place to try jumping.':
    "Ce n'était pas un endroit très sûr pour tenter un saut.",
  'In a feat of unaccustomed daring, you manage to land on your feet without killing yourself.':
    "Dans un élan d'audace inhabituel, vous parvenez à retomber sur vos pieds sans vous tuer.",
  "It doesn't seem to work.": "Ça n'a pas l'air de fonctionner.",
  'There is nothing special to be seen.':
    "Il n'y a rien de particulier à voir.",
  "You aren't an accomplished enough juggler.":
    "Vous n'êtes pas un jongleur assez accompli.",
  "You'll have to speak up if you expect me to hear you!":
    'Il va falloir parler plus fort si vous voulez que je vous entende !',
  'Nice try.': 'Bien essayé.',
  "Wasn't he a sailor?": "Ce n'était pas un marin ?",
  'It is already open.': "C'est déjà ouvert.",
  "You're not in anything!": "Vous n'êtes dans rien du tout !",
  'Huh?': 'Hein ?',
  "You can't pour that.": 'Vous ne pouvez pas verser ça.',
  'If you pray enough, your prayers may be answered.':
    'À force de prier, vos prières seront peut-être exaucées.',
  'How can you do that?': 'Comment voulez-vous faire ça ?',
  "There's no room.": "Il n'y a pas de place.",
  'What a (ahem!) strange idea.': 'Quelle (hum !) étrange idée.',
  'It is impossible to read in the dark.': 'Impossible de lire dans le noir.',
  'Say what?': 'Comment ça ?',
  'Talking to yourself is a sign of impending mental collapse.':
    "Parler tout seul est un signe d'effondrement mental imminent.",
  'You find nothing unusual.': "Vous ne trouvez rien d'inhabituel.",
  "That doesn't make sends.": "Ça n'a pas le sens de l'envoi.",
  'Foo!': 'Zut !',
  'This seems to have no effect.': 'Cela ne semble avoir aucun effet.',
  "You can't take it; thus, you can't shake it!":
    'Vous ne pouvez pas le prendre ; donc, vous ne pouvez pas le secouer !',
  'How singularly useless.': 'Singulièrement inutile.',
  'You are already standing, I think.': 'Vous êtes déjà debout, il me semble.',
  'Go jump in a lake!': 'Allez donc vous jeter dans un lac !',
  'Whoosh!': 'Wouch !',
  'You are already wearing it.': 'Vous le portez déjà.',
  'You already have that!': "Vous l'avez déjà !",
  "You can't reach something that's inside a closed container.":
    'Vous ne pouvez pas atteindre quelque chose qui se trouve dans un contenant fermé.',
  'That would involve quite a contortion!':
    'Cela demanderait une sacrée contorsion !',
  'Thrown.': 'Lancé.',
  "You can't throw anything off of that!":
    'Vous ne pouvez rien lancer du haut de ça !',
  "You can't turn that!": 'Vous ne pouvez pas tourner ça !',
  'Time passes...': 'Le temps passe...',
  'There are odd noises in the darkness, and there is no exit in that direction.':
    "Il y a des bruits étranges dans l'obscurité, et il n'y a pas de sortie dans cette direction.",
  'Use compass directions for movement.':
    'Utilisez les points cardinaux pour vous déplacer.',
  "It's here!": "C'est ici !",
  'You should supply a direction!': 'Vous devriez indiquer une direction !',
  'With luck, your wish will come true.':
    'Avec de la chance, votre vœu se réalisera.',
  'At your service!': 'À votre service !',
  'You are likely to be eaten by a grue.':
    'Vous risquez fort de vous faire dévorer par un grue.',
  "Only bats can see in the dark. And you're not one.":
    "Seules les chauves-souris voient dans le noir. Et vous n'en êtes pas une.",
  'You are carrying:': 'Vous portez :',
  'Your hand passes through its object.':
    'Votre main passe au travers de sa cible.',
  "You're holding too many things already!":
    'Vous portez déjà trop de choses !',
  "You can't go there without a vehicle.":
    'Vous ne pouvez pas y aller sans véhicule.',
  'There are sinister gurgling noises in the darkness all around you!':
    'Il y a des gargouillis sinistres dans les ténèbres tout autour de vous !',
  'You have moved into a dark place.': 'Vous voici dans un endroit sombre.',
  'A secret path leads southwest into the forest.':
    "Un sentier secret s'enfonce au sud-ouest dans la forêt.",
  'The boards are securely fastened.': 'Les planches sont solidement fixées.',
  "Dental hygiene is highly recommended, but I'm not sure what you want to brush them with.":
    "L'hygiène dentaire est hautement recommandée, mais je ne vois pas bien avec quoi vous comptez les brosser.",
  // «oriental» dodges the «est est» stutter, matching the granite-wall
  // room description above.
  'The east wall is solid granite here.':
    'Le mur oriental est ici en granit massif.',
  'It only SAYS "Granite Wall".': "C'est seulement ÉCRIT « Mur de granit ».",
  "The wall isn't granite.": "Le mur n'est pas en granit.",
  "You can't hear the songbird now.":
    "Vous n'entendez pas l'oiseau chanteur en ce moment.",
  "It can't be followed.": 'Impossible de le suivre.',
  'Why not find your brains?': 'Et si vous trouviez votre cervelle, plutôt ?',
  'It seems to be to the west.': "Cela semble être vers l'ouest.",
  'It was here just a minute ago....':
    "C'était ici il y a une minute à peine...",
  "It's right here! Are you blind or something?":
    "C'est juste ici ! Vous êtes aveugle ou quoi ?",
  'The window is closed.': 'La fenêtre est fermée.',
  "I can't see how to get in from here.":
    "Je ne vois pas comment entrer d'ici.",
  "You aren't even in the forest.": "Vous n'êtes même pas dans la forêt.",
  'You will have to specify a direction.':
    'Il va falloir préciser une direction.',
  'You cannot see the forest for the trees.':
    'Les arbres vous cachent la forêt.',
  "Don't you believe me? The mountains are impassable!":
    'Vous ne me croyez pas ? Les montagnes sont infranchissables !',
  'The bottle is closed.': 'La bouteille est fermée.',
  'The bottle is now full of water.':
    "La bouteille est maintenant pleine d'eau.",
  'The water spills to the floor and evaporates immediately.':
    "L'eau se répand sur le sol et s'évapore aussitôt.",
  'The water splashes on the walls and evaporates immediately.':
    "L'eau éclabousse les murs et s'évapore aussitôt.",
  'The window is slightly ajar, but not enough to allow entry.':
    'La fenêtre est entrouverte, mais pas assez pour pouvoir entrer.',
  'Only the ceremony itself has any effect.':
    'Seule la cérémonie elle-même a un effet quelconque.',
  'How can you attack a spirit with material objects?':
    'Comment attaquer un esprit avec des objets matériels ?',
  'You seem unable to interact with these spirits.':
    "Vous semblez incapable d'interagir avec ces esprits.",
  'The basket is at the other end of the chain.':
    "Le panier est à l'autre bout de la chaîne.",
  'The cage is securely fastened to the iron chain.':
    'La cage est solidement fixée à la chaîne de fer.',
  "You can't reach him; he's on the ceiling.":
    "Vous ne pouvez pas l'atteindre ; il est au plafond.",
  'Ding, dong.': 'Ding, dong.',
  'The heat from the bell is too intense.':
    'La chaleur de la cloche est trop intense.',
  "You can't break the windows open.":
    'Vous ne pouvez pas ouvrir les fenêtres en les brisant.',
  'The nails, deeply imbedded in the door, cannot be removed.':
    'Les clous, profondément enfoncés dans la porte, ne peuvent pas être retirés.',
  'There are no stairs leading down.': "Il n'y a pas d'escalier qui descende.",
  'ZORK: The Great Underground Empire.': 'ZORK : Le Grand Empire Souterrain.',
  'The door is too heavy.': 'La porte est trop lourde.',
  'You see a rickety staircase descending into darkness.':
    "Vous voyez un escalier branlant qui s'enfonce dans l'obscurité.",
  "It's closed.": "C'est fermé.",
  'The door is locked from above.':
    'La porte est verrouillée depuis le dessus.',
  'The door closes and locks.': 'La porte se referme et se verrouille.',
  'Going up empty-handed is a bad idea.':
    'Monter les mains vides est une mauvaise idée.',
  "You can't get up there with what you're carrying.":
    'Vous ne pouvez pas monter là-haut avec ce que vous portez.',
  'Having moved the carpet previously, you find it impossible to move it again.':
    'Ayant déjà déplacé le tapis, vous ne parvenez pas à le déplacer de nouveau.',
  'The rug is extremely heavy and cannot be carried.':
    'Le tapis est extrêmement lourd et ne peut pas être porté.',
  'Underneath the rug is a closed trap door. As you drop the corner of the rug, the trap door is once again concealed from view.':
    'Sous le tapis se trouve une trappe fermée. Quand vous lâchez le coin du tapis, la trappe disparaît de nouveau à la vue.',
  'As you sit, you notice an irregularity underneath it. Rather than be uncomfortable, you stand up again.':
    'En vous asseyant, vous remarquez une irrégularité dessous. Plutôt que de rester mal assis, vous vous relevez.',
  "The troll isn't much of a conversationalist.":
    "Le troll n'est pas un grand causeur.",
  'The troll, angered and humiliated, recovers his weapon. He appears to have an axe to grind with you.':
    'Le troll, furieux et humilié, récupère son arme. Il semble avoir une dent — ou plutôt une hache — contre vous.',
  'The troll stirs, quickly resuming a fighting stance.':
    'Le troll remue, reprenant vivement une posture de combat.',
  'The troll scratches his head in confusion, then takes the axe.':
    'Le troll se gratte la tête, perplexe, puis ramasse la hache.',
  'The troll spits in your face, grunting "Better luck next time" in a rather barbarous accent.':
    'Le troll vous crache au visage en grognant « Plus de chance la prochaine fois » avec un accent plutôt barbare.',
  'The troll laughs at your puny gesture.':
    'Le troll rit de votre geste dérisoire.',
  'Every so often the troll says something, probably uncomplimentary, in his guttural tongue.':
    'De temps à autre, le troll dit quelque chose, probablement peu flatteur, dans sa langue gutturale.',
  "Unfortunately, the troll can't hear you.":
    'Malheureusement, le troll ne peut pas vous entendre.',
  'In disturbing the pile of leaves, a grating is revealed.':
    'En remuant le tas de feuilles, vous mettez au jour une grille.',
  'There are 69,105 leaves here.': 'Il y a 69 105 feuilles ici.',
  'The leaves burn.': 'Les feuilles brûlent.',
  'You rustle the leaves around, making quite a mess.':
    'Vous remuez les feuilles dans tous les sens, mettant une belle pagaille.',
  'Underneath the pile of leaves is a grating. As you release the leaves, the grating is once again concealed from view.':
    'Sous le tas de feuilles se trouve une grille. Quand vous relâchez les feuilles, la grille disparaît de nouveau à la vue.',
  'You are in a clearing, with a forest surrounding you on all sides. A path leads south.':
    'Vous êtes dans une clairière, entouré de forêt de tous côtés. Un chemin part au sud.',
  'There is an open grating, descending into darkness.':
    "Il y a une grille ouverte, qui descend dans l'obscurité.",
  'There is a grating securely fastened into the ground.':
    'Il y a une grille solidement scellée dans le sol.',
  'You are in a small room near the maze. There are twisty passages in the immediate vicinity.':
    'Vous êtes dans une petite salle près du labyrinthe. Il y a des passages tortueux dans les environs immédiats.',
  'Above you is an open grating with sunlight pouring in.':
    'Au-dessus de vous, une grille ouverte laisse entrer des flots de lumière du jour.',
  'Above you is a grating locked with a skull-and-crossbones lock.':
    'Au-dessus de vous se trouve une grille fermée par un cadenas à tête de mort.',
  'The grate is locked.': 'La grille est verrouillée.',
  "You can't lock it from this side.":
    'Vous ne pouvez pas la verrouiller de ce côté-ci.',
  'The grate is unlocked.': 'La grille est déverrouillée.',
  "You can't reach the lock from here.":
    "Vous ne pouvez pas atteindre le cadenas d'ici.",
  "You can't pick the lock.": 'Vous ne pouvez pas crocheter le cadenas.',
  'A pile of leaves falls onto your head and to the ground.':
    'Un tas de feuilles vous tombe sur la tête, puis au sol.',
  'The grating is locked.': 'La grille est verrouillée.',
  "It won't fit through the grating.": 'Ça ne passera pas par la grille.',
  "You won't be able to get back up to the tunnel you are going through when it gets to the next room.":
    'Vous ne pourrez pas remonter dans le tunnel que vous empruntez une fois arrivé à la salle suivante.',
  'As you touch the rusty knife, your sword gives a single pulse of blinding blue light.':
    'Au moment où vous touchez le couteau rouillé, votre épée émet une unique pulsation de lumière bleue aveuglante.',
  'A ghost appears in the room and is appalled at your desecration of the remains of a fellow adventurer. He casts a curse on your valuables and banishes them to the Land of the Living Dead. The ghost leaves, muttering obscenities.':
    "Un fantôme apparaît dans la salle, scandalisé de vous voir profaner les restes d'un confrère aventurier. Il jette une malédiction sur vos objets de valeur et les bannit au Royaume des morts-vivants. Le fantôme s'en va en marmonnant des obscénités.",
  'The torch is burning.': 'La torche brûle.',
  'The water evaporates before it gets close.':
    "L'eau s'évapore avant même d'approcher.",
  'Unfortunately, the mirror has been destroyed by your recklessness.':
    'Malheureusement, le miroir a été détruit par votre imprudence.',
  'There is an ugly person staring back at you.':
    'Une personne fort laide vous y regarde fixement.',
  'The mirror is many times your size. Give up.':
    'Le miroir fait plusieurs fois votre taille. Laissez tomber.',
  "Haven't you done enough damage already?":
    "Vous n'avez pas fait assez de dégâts comme ça ?",
  'As you enter the dome you feel a strong pull as if from a wind drawing you over the railing and down.':
    'En entrant dans le dôme, vous sentez une forte traction, comme un vent qui vous aspirerait par-dessus la rambarde, vers le bas.',
  "You aren't equipped for an exorcism.":
    "Vous n'êtes pas équipé pour un exorcisme.",
  'The tension of this ceremony is broken, and the wraiths, amused but shaken at your clumsy attempt, resume their hideous jeering.':
    'La tension de la cérémonie est rompue, et les spectres, amusés mais ébranlés par votre tentative maladroite, reprennent leurs hideuses railleries.',
  'The bell appears to have cooled down.': 'La cloche semble avoir refroidi.',
  'The sluice gates are open, and water rushes through the dam. The water level behind the dam is still high.':
    "Les vannes sont ouvertes, et l'eau s'engouffre à travers le barrage. Le niveau de l'eau derrière le barrage est encore haut.",
  'The sluice gates close and water starts to collect behind the dam.':
    "Les vannes se ferment et l'eau commence à s'accumuler derrière le barrage.",
  "The bolt won't turn with your best effort.":
    'Le boulon refuse de tourner malgré tous vos efforts.',
  "Hmm. It appears the tube contained glue, not oil. Turning the bolt won't get any easier....":
    "Hmm. Il semble que le tube contenait de la colle, pas de l'huile. Tourner le boulon ne va pas devenir plus facile...",
  'The boat lifts gently out of the mud and is now floating on the reservoir.':
    'Le bateau se soulève doucement de la boue et flotte maintenant sur le réservoir.',
  'You notice that the water level has risen to the point that it is impossible to cross.':
    "Vous remarquez que le niveau de l'eau a monté au point qu'il est impossible de traverser.",
  'The roar of rushing water is quieter now.':
    'Le rugissement des eaux tumultueuses est plus discret maintenant.',
  'The water level is now quite low here and you could easily cross over to the other side.':
    "Le niveau de l'eau est maintenant très bas ici et vous pourriez facilement passer sur l'autre rive.",
  "They're greek to you.": "Pour vous, c'est du chinois.",
  'There is a rumbling sound and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe).':
    "Il y a un grondement et un jet d'eau semble jaillir du mur est de la salle (apparemment, une fuite s'est déclarée dans une canalisation).",
  'The blue button appears to be jammed.': 'Le bouton bleu semble coincé.',
  'The chests are so rusty and corroded that they crumble when you touch them.':
    "Les caisses sont si rouillées et corrodées qu'elles s'effritent à votre contact.",
  'The chests are already open.': 'Les caisses sont déjà ouvertes.',
  'By some miracle of Zorkian technology, you have managed to stop the leak in the dam.':
    'Par quelque miracle de la technologie zorkienne, vous avez réussi à colmater la fuite du barrage.',
  "The all-purpose gunk isn't a lubricant.":
    "La pâte à tout faire n'est pas un lubrifiant.",
  'The tube is apparently empty.': 'Le tube est apparemment vide.',
  'Are you the little Dutch boy, then? Sorry, this is a big dam.':
    "Vous vous prenez pour le petit Hollandais ? Désolé, c'est un grand barrage.",
  'You are in a long room. To the north is a large lake, too deep to cross. You notice, however, that the water level appears to be dropping at a rapid rate. Before long, it might be possible to cross to the other side from here.':
    "Vous êtes dans une longue salle. Au nord s'étend un grand lac, trop profond pour être traversé. Vous remarquez toutefois que le niveau de l'eau semble baisser à vue d'œil. Avant longtemps, il sera peut-être possible de passer sur l'autre rive d'ici.",
  'You are in a long room, to the north of which is a wide area which was formerly a reservoir, but now is merely a stream. You notice, however, that the level of the stream is rising quickly and that before long it will be impossible to cross here.':
    "Vous êtes dans une longue salle, au nord de laquelle s'étend une vaste zone qui fut un réservoir, mais n'est plus qu'un cours d'eau. Vous remarquez toutefois que le niveau du cours d'eau monte rapidement et qu'avant longtemps il sera impossible de traverser ici.",
  'You notice that the water level here is rising rapidly. The currents are also becoming stronger. Staying here seems quite perilous!':
    "Vous remarquez que le niveau de l'eau monte ici rapidement. Les courants se renforcent aussi. Rester ici semble fort périlleux !",
  'You are in a large cavernous area. To the south is a wide lake, whose water level appears to be falling rapidly.':
    "Vous êtes dans une grande zone caverneuse. Au sud s'étend un large lac, dont le niveau semble baisser rapidement.",
  'You are in a cavernous area, to the south of which is a very wide stream. The level of the stream is rising rapidly, and it appears that before long it will be impossible to cross to the other side.':
    "Vous êtes dans une zone caverneuse, au sud de laquelle coule un très large cours d'eau. Le niveau du cours d'eau monte rapidement, et il semble qu'avant longtemps il sera impossible de passer sur l'autre rive.",
  'You are in a large cavernous room, north of a large lake.':
    "Vous êtes dans une grande salle caverneuse, au nord d'un grand lac.",
  'The bottle hits the far wall and shatters.':
    'La bouteille heurte le mur du fond et vole en éclats.',
  'A brilliant maneuver destroys the bottle.':
    'Une manœuvre brillante détruit la bouteille.',
  'The water spills to the floor and evaporates.':
    "L'eau se répand sur le sol et s'évapore.",
  "No use talking to him. He's fast asleep.":
    'Inutile de lui parler. Il dort à poings fermés.',
  'The cyclops is sleeping like a baby, albeit a very ugly one.':
    'Le cyclope dort comme un bébé, quoique fort laid.',
  'The cyclops yawns and stares at the thing that woke him up.':
    "Le cyclope bâille et fixe la chose qui l'a réveillé.",
  'The cyclops says "Mmm Mmm. I love hot peppers! But oh, could I use a drink. Perhaps I could drink the blood of that thing." From the gleam in his eye, it could be surmised that you are "that thing".':
    "Le cyclope dit : « Mmm Mmm. J'adore les piments ! Mais ce que je boirais bien quelque chose. Je pourrais peut-être boire le sang de cette chose. » À la lueur dans son œil, on devine que « cette chose », c'est vous.",
  "The cyclops takes the bottle, checks that it's open, and drinks the water. A moment later, he lets out a yawn that nearly blows you over, and then falls fast asleep (what did you put in that drink, anyway?).":
    "Le cyclope prend la bouteille, vérifie qu'elle est ouverte et boit l'eau. Un instant plus tard, il pousse un bâillement qui manque de vous renverser, puis tombe dans un profond sommeil (qu'avez-vous donc mis dans cette boisson ?).",
  'The cyclops apparently is not thirsty and refuses your generous offer.':
    "Le cyclope n'a apparemment pas soif et décline votre offre généreuse.",
  'The cyclops may be hungry, but there is a limit.':
    'Le cyclope a beau être affamé, il y a des limites.',
  'The cyclops is not so stupid as to eat THAT!':
    "Le cyclope n'est pas bête au point de manger ÇA !",
  '"Do you think I\'m as stupid as my father was?", he says, dodging.':
    '« Vous me croyez aussi bête que feu mon père ? », dit-il en esquivant.',
  'The cyclops shrugs but otherwise ignores your pitiful attempt.':
    'Le cyclope hausse les épaules et ignore par ailleurs votre tentative pitoyable.',
  "The cyclops doesn't take kindly to being grabbed.":
    "Le cyclope n'apprécie guère qu'on l'empoigne.",
  'You cannot tie the cyclops, though he is fit to be tied.':
    "Vous ne pouvez pas lier le cyclope, même s'il est fou à lier.",
  'You can hear his stomach rumbling.':
    'Vous entendez son estomac gargouiller.',
  'The cyclops is sleeping blissfully at the foot of the stairs.':
    "Le cyclope dort béatement au pied de l'escalier.",
  'The east wall, previously solid, now has a cyclops-sized opening in it.':
    "Le mur est, autrefois plein, présente maintenant une ouverture à la taille d'un cyclope.",
  "The cyclops is standing in the corner, eyeing you closely. I don't think he likes you very much. He looks extremely hungry, even for a cyclops.":
    "Le cyclope se tient dans le coin et vous observe attentivement. Je ne crois pas qu'il vous aime beaucoup. Il a l'air extrêmement affamé, même pour un cyclope.",
  'The cyclops, having eaten the hot peppers, appears to be gasping. His enflamed tongue protrudes from his man-sized mouth.':
    "Le cyclope, après avoir mangé les piments, semble suffoquer. Sa langue enflammée pend de sa bouche à taille d'homme.",
  'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward.':
    "C'est une grande salle dont le plafond ne peut être distingué depuis le sol. Un passage étroit va d'est en ouest et un escalier de pierre monte.",
  'The room is eerie in its quietness.': "La salle est d'un calme inquiétant.",
  'The room is deafeningly loud with an undetermined rushing sound. The sound seems to reverberate from all of the walls, making it difficult even to think.':
    "La salle est assourdissante, emplie d'un grondement d'origine indéterminée. Le son semble se répercuter sur tous les murs, au point qu'il est même difficile de penser.",
  "It is unbearably loud here, with an ear-splitting roar seeming to come from all around you. There is a pounding in your head which won't stop. With a tremendous effort, you scramble out of the room.":
    "Le bruit est insupportable ici : un rugissement à crever les tympans semble venir de partout à la fois. Un martèlement emplit votre tête sans vouloir s'arrêter. Au prix d'un effort formidable, vous vous extirpez de la salle.",
  'The rest of your commands have been lost in the noise.':
    "Le reste de vos ordres s'est perdu dans le vacarme.",
  "That's only your opinion.": "Ce n'est que votre avis.",
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down.':
    "Vous êtes sur le bord sud d'un canyon profond. Des passages partent vers l'est, le nord-ouest et le sud-ouest. Un escalier descend.",
  'You can hear a loud roaring sound, like that of rushing water, from below.':
    "Vous entendez un fort rugissement, comme celui d'eaux tumultueuses, venant d'en bas.",
  'Your opponent, determining discretion to be the better part of valor, decides to terminate this little contretemps. With a rueful nod of his head, he steps backward into the gloom and disappears.':
    'Votre adversaire, jugeant que prudence est mère de sûreté, décide de mettre un terme à ce petit contretemps. Avec un hochement de tête contrit, il recule dans la pénombre et disparaît.',
  'The holder of the large bag just left, looking disgusted. Fortunately, he took nothing.':
    "Le porteur du grand sac vient de partir, l'air dégoûté. Heureusement, il n'a rien emporté.",
  'The thief, finding nothing of value, left disgusted.':
    'Le voleur, ne trouvant rien de valeur, est parti dégoûté.',
  'A "lean and hungry" gentleman just wandered through, carrying a large bag. Finding nothing of value, he left disgruntled.':
    "Un gentilhomme « maigre et affamé » vient de passer par ici, un grand sac à l'épaule. Ne trouvant rien de valeur, il est reparti contrarié.",
  'The thief seems to have left you in the dark.':
    'Le voleur semble vous avoir laissé dans le noir.',
  'The thief is a strong, silent type.':
    'Le voleur est du genre fort et silencieux.',
  'The thief, being temporarily incapacitated, is unable to acknowledge your greeting with his usual graciousness.':
    "Le voleur, temporairement hors d'état, ne peut pas répondre à votre salut avec sa grâce habituelle.",
  'You missed. The thief makes no attempt to take the knife, though it would be a fine addition to the collection in his bag. He does seem angered by your attempt.':
    "Raté. Le voleur ne fait pas mine de prendre le couteau, qui ferait pourtant une belle pièce dans la collection de son sac. Votre tentative semble toutefois l'avoir irrité.",
  'Your proposed victim suddenly recovers consciousness.':
    'La victime que vous vous proposiez reprend soudain conscience.',
  'Once you got him, what would you do with him?':
    "Une fois que vous le tiendriez, qu'en feriez-vous ?",
  "The thief is a slippery character with beady eyes that flit back and forth. He carries, along with an unmistakable arrogance, a large bag over his shoulder and a vicious stiletto, whose blade is aimed menacingly in your direction. I'd watch out if I were you.":
    "Le voleur est un personnage fuyant, aux petits yeux perçants qui ne cessent d'aller et venir. Il porte, avec une arrogance qui ne trompe pas, un grand sac sur l'épaule et un stylet redoutable, dont la lame est pointée vers vous d'un air menaçant. À votre place, je me méfierais.",
  'The thief says nothing, as you have not been formally introduced.':
    "Le voleur ne dit rien, vu qu'on ne vous a pas présentés.",
  'His booty remains.': 'Son butin reste là.',
  'The robber revives, briefly feigning continued unconsciousness, and, when he sees his moment, scrambles away from you.':
    "Le brigand revient à lui, feint un instant d'être toujours inconscient et, quand il voit son moment venu, détale loin de vous.",
  'Sadly for you, the robber collapsed on top of the bag. Trying to take it would wake him.':
    "Manque de chance pour vous, le brigand s'est effondré sur le sac. Essayer de le prendre le réveillerait.",
  'The bag will be taken over his dead body.':
    'On ne prendra ce sac que sur son cadavre.',
  'It would be a good trick.': 'Ce serait un joli tour.',
  'Getting close enough would be a good trick.':
    'Arriver assez près serait déjà un joli tour.',
  "The bag is underneath the thief, so one can't say what, if anything, is inside.":
    "Le sac est sous le voleur, impossible donc de dire ce qu'il contient, à supposer qu'il contienne quelque chose.",
  "You'd be stabbed in the back first.":
    'Vous seriez poignardé dans le dos avant.',
  "You can't. It's not a very good chalice, is it?":
    "Impossible. Ce n'est pas un très bon calice, n'est-ce pas ?",
  'You cannot burn this door.': 'Vous ne pouvez pas brûler cette porte.',
  "You can't seem to damage the door.":
    'Vous ne semblez pas pouvoir endommager la porte.',
  "It won't open.": "Ça ne s'ouvre pas.",
  'As hard as you try, the book cannot be closed.':
    'Vous avez beau essayer, le livre ne peut pas être fermé.',
  'Beside page 569, there is only one other page with any legible printing on it. Most of it is unreadable, but the subject seems to be the banishment of evil. Apparently, certain noises, lights, and prayers are efficacious in this regard.':
    "Hormis la page 569, une seule autre page porte une inscription lisible. L'essentiel en est indéchiffrable, mais le sujet semble être le bannissement du mal. Apparemment, certains bruits, lumières et prières sont efficaces en la matière.",
  "Congratulations! Unlike the other vandals, who merely stole the artist's masterpieces, you have destroyed one.":
    "Félicitations ! Contrairement aux autres vandales, qui se sont contentés de voler les chefs-d'œuvre de l'artiste, vous en avez détruit un.",
  "A burned-out lamp won't light.": "Une lampe morte ne s'allume pas.",
  'The lamp has already burned out.': 'La lampe est déjà morte.',
  'It is securely anchored.': "C'est solidement arrimé.",
  "I'm afraid that you have run out of matches.":
    "Je crains que vous n'ayez plus d'allumettes.",
  'This room is drafty, and the match goes out instantly.':
    "La pièce est pleine de courants d'air, et l'allumette s'éteint aussitôt.",
  'The match is out.': "L'allumette est éteinte.",
  'The match is burning.': "L'allumette brûle.",
  "The matchbook isn't very interesting, except for what's written on it.":
    "Les allumettes n'ont pas grand intérêt, à part ce qui est écrit sur la pochette.",
  "Alas, there's not much left of the candles. Certainly not enough to burn.":
    'Hélas, il ne reste pas grand-chose des bougies. Certainement pas de quoi brûler.',
  '(with the match)': "(avec l'allumette)",
  'You should say what to light them with.':
    'Vous devriez dire avec quoi les allumer.',
  'You realize, just in time, that the candles are already lighted.':
    'Vous vous rendez compte, juste à temps, que les bougies sont déjà allumées.',
  'The heat from the torch is so intense that the candles are vaporized.':
    'La chaleur de la torche est si intense que les bougies se vaporisent.',
  "You have to light them with something that's burning, you know.":
    'Il faut les allumer avec quelque chose qui brûle, voyons.',
  "Let's see, how many objects in a pair? Don't tell me, I'll get it.":
    "Voyons, combien d'objets dans une paire ? Ne me dites rien, je vais trouver.",
  'The flame is extinguished.': 'La flamme est éteinte.',
  'The candles are not lighted.': 'Les bougies ne sont pas allumées.',
  "That wouldn't be smart.": 'Ce ne serait pas malin.',
  'It is now completely dark.': "L'obscurité est maintenant totale.",
  'Your sword is glowing very brightly.': 'Votre épée luit très vivement.',
  'Oh dear. It appears that the smell coming from this room was coal gas. I would have thought twice about carrying flaming objects in here.':
    "Aïe. Il semble que l'odeur qui régnait dans cette salle était du gaz de houille. À votre place, j'aurais réfléchi à deux fois avant d'y apporter des objets enflammés.",
  'A large vampire bat, hanging from the ceiling, swoops down at you!':
    'Une grande chauve-souris vampire, suspendue au plafond, fond sur vous !',
  "It's not clear how to turn it on with your bare hands.":
    'On ne voit pas bien comment la mettre en marche à mains nues.',
  "The machine doesn't seem to want to do anything.":
    'La machine ne semble rien vouloir faire.',
  'The slag was rather insubstantial, and crumbles into dust at your touch.':
    "La scorie était plutôt fragile : elle s'effrite en poussière à votre contact.",
  'The rainbow seems to have become somewhat run-of-the-mill.':
    "L'arc-en-ciel semble être redevenu des plus ordinaires.",
  'A dazzling display of color briefly emanates from the sceptre.':
    'Un éblouissant déploiement de couleurs émane brièvement du sceptre.',
  'A solid rainbow spans the falls.':
    'Un arc-en-ciel solide enjambe les chutes.',
  'From here?!?': "D'ici ?!?",
  "You'll have to say which way...": 'Il va falloir dire par où...',
  'Can you walk on water vapor?': "Savez-vous marcher sur de la vapeur d'eau ?",
  'The Frigid River flows under the rainbow.':
    "La rivière Frigid coule sous l'arc-en-ciel.",
  'Well done. The boat is repaired.': 'Bien joué. Le bateau est réparé.',
  'You should get in the boat then launch it.':
    "Vous devriez monter dans le bateau, puis le mettre à l'eau.",
  "Read the label for the boat's instructions.":
    "Lisez l'étiquette pour le mode d'emploi du bateau.",
  "You can't launch it here.": "Vous ne pouvez pas le mettre à l'eau ici.",
  "You're not in the boat!": "Vous n'êtes pas dans le bateau !",
  'Oops! Something sharp seems to have slipped and punctured the boat. The boat deflates to the sounds of hissing, sputtering, and cursing.':
    'Oups ! Quelque chose de pointu semble avoir glissé et crevé le bateau. Le bateau se dégonfle dans un concert de sifflements, de crachotements et de jurons.',
  'Inflating it further would probably burst it.':
    'Le gonfler davantage le ferait probablement éclater.',
  "You can't deflate the boat while you're in it.":
    'Vous ne pouvez pas dégonfler le bateau tant que vous êtes dedans.',
  'The boat must be on the ground to be deflated.':
    'Le bateau doit être posé au sol pour être dégonflé.',
  'The boat deflates.': 'Le bateau se dégonfle.',
  'The boat must be on the ground to be inflated.':
    'Le bateau doit être posé au sol pour être gonflé.',
  "You don't have enough lung power to inflate it.":
    "Vous n'avez pas assez de souffle pour le gonfler.",
  'You notice something funny about the feel of the buoy.':
    'Vous remarquez quelque chose de curieux au toucher de la bouée.',
  'On the ground below you can see:':
    'Sur le sol en contrebas, vous pouvez voir :',
  'The nest falls to the ground, and the egg spills out of it, seriously damaged.':
    "Le nid tombe au sol, et l'œuf en est éjecté, sérieusement endommagé.",
  'The egg falls to the ground and springs open, seriously damaged.':
    "L'œuf tombe au sol et s'ouvre d'un coup, sérieusement endommagé.",
  'The egg is already open.': "L'œuf est déjà ouvert.",
  'You have neither the tools nor the expertise.':
    "Vous n'avez ni les outils ni le savoir-faire.",
  'I doubt you could do that without damaging it.':
    "Je doute que vous puissiez faire ça sans l'endommager.",
  'The egg is now open, but the clumsiness of your attempt has seriously compromised its esthetic appeal.':
    "L'œuf est maintenant ouvert, mais la maladresse de votre tentative a sérieusement compromis son attrait esthétique.",
  'There is a noticeable crunch from beneath you, and inspection reveals that the egg is lying open, badly damaged.':
    "Un craquement très net se fait entendre sous vos pieds, et l'inspection révèle que l'œuf gît ouvert, gravement endommagé.",
  'Your rather indelicate handling of the egg has caused it some damage, although you have succeeded in opening it.':
    "Votre manipulation plutôt indélicate de l'œuf l'a quelque peu endommagé, même si vous avez réussi à l'ouvrir.",
  'The canary chirps blithely, if somewhat tinnily, for a short time.':
    "Le canari gazouille gaiement, quoique d'une voix un peu métallique, pendant un court instant.",
  'There is an unpleasant grinding noise from inside the canary.':
    "Un grincement déplaisant se fait entendre à l'intérieur du canari.",
  'The cliff is too steep for climbing.':
    "La falaise est trop abrupte pour l'escalade.",
  'That would be very unwise. Perhaps even fatal.':
    'Ce serait très imprudent. Peut-être même fatal.',
  'The rope is already tied to it.': 'La corde y est déjà attachée.',
  'The rope is now untied.': 'La corde est maintenant détachée.',
  'It is not tied to anything.': "Elle n'est attachée à rien.",
  'The rope drops gently to the floor below.':
    'La corde tombe doucement sur le sol en contrebas.',
  'The rope is tied to the railing.': 'La corde est attachée à la rambarde.',
  "It's not attached to that!": "Ce n'est pas attaché à ça !",
  'It smells of hot peppers.': 'Ça sent le piment.',
  'You cannot enter in your condition.':
    'Vous ne pouvez pas entrer dans votre état.',
  'All such attacks are vain in your condition.':
    'Toute attaque de ce genre est vaine dans votre état.',
  'Even such an action is beyond your capabilities.':
    'Même une telle action dépasse vos capacités.',
  "Might as well. You've got an eternity.":
    "Pourquoi pas. Vous avez l'éternité devant vous.",
  'You need no light to guide you.':
    "Vous n'avez besoin d'aucune lumière pour vous guider.",
  "You're dead! How can you think of your score?":
    'Vous êtes mort ! Comment pouvez-vous penser à votre score ?',
  'You have no possessions.': 'Vous ne possédez rien.',
  'You are dead.': 'Vous êtes mort.',
  'Although there is no light, the room seems dimly illuminated.':
    "Bien qu'il n'y ait aucune lumière, la salle semble faiblement éclairée.",
  'From the distance the sound of a lone trumpet is heard. The room becomes very bright and you feel disembodied. In a moment, the brightness fades and you find yourself rising as if from a long sleep, deep in the woods. In the distance you can faintly hear a songbird and the sounds of the forest.':
    "Au loin retentit le son d'une trompette solitaire. La salle devient très lumineuse et vous vous sentez désincarné. L'instant d'après, la clarté se dissipe et vous vous retrouvez à émerger comme d'un long sommeil, au plus profond des bois. Au loin, vous entendez faiblement un oiseau chanteur et les bruits de la forêt.",
  'Your prayers are not heard.': 'Vos prières ne sont pas entendues.',
  "There's not much lake left....": 'Il ne reste plus grand-chose du lac...',
  "It's too wide to cross.": "C'est trop large pour traverser.",
  "You can't swim in this lake.": 'Vous ne pouvez pas nager dans ce lac.',
  "You can't swim in the stream.":
    "Vous ne pouvez pas nager dans le cours d'eau.",
  'The other side is a sheer rock cliff.':
    "L'autre rive est une falaise rocheuse à pic.",
  "It's too far to jump, and there's no bridge.":
    "C'est trop loin pour sauter, et il n'y a pas de pont.",
  'The gate is protected by an invisible force. It makes your teeth ache to touch it.':
    'Le portail est protégé par une force invisible. Le toucher vous fait mal aux dents.',
  'There is too much gas to blow away.':
    "Il y a trop de gaz pour qu'on puisse le souffler.",
  'It smells like coal gas in here.': 'Ça sent le gaz de houille ici.',
  'The robber, rummaging through his bag, dropped a few items he found valueless.':
    "Le brigand, en fouillant dans son sac, a laissé tomber quelques objets qu'il jugeait sans valeur.",
  'You are in perfect health.': 'Vous êtes en parfaite santé.',
  'It takes a talented person to be killed while already dead. YOU are such a talent. Unfortunately, it takes a talented person to deal with it. I am not such a talent. Sorry.':
    "Il faut du talent pour se faire tuer quand on est déjà mort. VOUS avez ce talent. Malheureusement, il faut du talent pour gérer la situation. Je n'ai pas ce talent. Désolé.",
  'Bad luck, huh?': 'Pas de chance, hein ?',
  "You clearly are a suicidal maniac. We don't allow psychotics in the cave, since they may harm other adventurers. Your remains will be installed in the Land of the Living Dead, where your fellow adventurers may gloat over them.":
    "Vous êtes de toute évidence un maniaque suicidaire. Nous n'admettons pas les psychotiques dans la caverne : ils pourraient nuire aux autres aventuriers. Vos restes seront installés au Royaume des morts-vivants, où vos confrères aventuriers pourront s'en gausser.",
  'As you take your last breath, you feel relieved of your burdens. The feeling passes as you find yourself before the gates of Hell, where the spirits jeer at you and deny you entry. Your senses are disturbed. The objects in the dungeon appear indistinct, bleached of color, even unreal.':
    "En rendant votre dernier souffle, vous vous sentez soulagé de vos fardeaux. La sensation passe quand vous vous retrouvez devant les portes de l'Enfer, où les esprits vous raillent et vous refusent l'entrée. Vos sens sont troublés. Les objets du donjon paraissent indistincts, délavés, presque irréels.",
  "Now, let's take a look here... Well, you probably deserve another chance. I can't quite fix you up completely, but you can't have everything.":
    'Voyons, regardons ça... Bon, vous méritez sans doute une seconde chance. Je ne peux pas tout à fait vous remettre à neuf, mais on ne peut pas tout avoir.',
  "What the heck! You won't make friends this way, but nobody around here is too friendly anyhow. Gulp!":
    "Et puis zut ! Ce n'est pas comme ça que vous vous ferez des amis, mais personne ici n'est bien amical de toute façon. Gloups !",
  'The chain is secure.': 'La chaîne est bien fixée.',
  'Perhaps you should do that to the basket.':
    'Vous devriez peut-être faire ça au panier.',
  'The chain secures a basket within the shaft.':
    'La chaîne retient un panier dans le puits.',
}
