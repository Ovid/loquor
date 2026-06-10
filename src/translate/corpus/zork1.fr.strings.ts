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
  'ZORK I: The Great Underground Empire':
    'ZORK I : Le Grand Empire Souterrain',
  'Infocom interactive fiction - a fantasy story':
    'Fiction interactive Infocom - une histoire fantastique',
  'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.':
    'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. Tous droits réservés.',
  'ZORK is a registered trademark of Infocom, Inc.':
    "ZORK est une marque déposée d'Infocom, Inc.",
  'Release 119 / Serial number 880429':
    'Version 119 / Numéro de série 880429',

  // ── Common one-word/stock responses ────────────────────────────────────
  // «Pris.»/«Posé.» read as the curt parser acknowledgements they are; the
  // participle never agrees with anything (it abbreviates «c'est fait»).
  'Taken.': 'Pris.',
  'Dropped.': 'Posé.',
  'Opened.': 'Fait.',
  'Done.': 'Fait.',
  'Click.': 'Clic.',
  'You are on your own feet again.': 'Vous voilà de nouveau sur vos pieds.',
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
    'Le troll abat sa hache, mais elle vous manque.',
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
  'You hear a scream of anguish as you violate the robber\'s hideaway. Using passages unknown to you, he rushes to its defense.':
    "Vous entendez un cri d'angoisse au moment où vous violez le repaire du voleur. Par des passages qui vous sont inconnus, il se précipite pour le défendre.",
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
    "Un cyclope, qui semble prêt à dévorer des chevaux (alors de simples aventuriers…), bloque l'escalier. À en juger par son état de santé et les taches de sang sur les murs, vous devinez qu'il n'est pas très amical, bien qu'il aime beaucoup les gens.",
  "The cyclops, hearing the name of his father's deadly nemesis, flees the room by knocking down the wall on the east of the room.":
    "Le cyclope, entendant le nom du mortel ennemi de son père, s'enfuit de la salle en défonçant le mur est.",

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
    "Vous êtes sur le bord sud d'un canyon profond. Des passages partent vers l'est, le nord-ouest et le sud-ouest. Un escalier descend. Vous entendez un bruit d'eau courante venant d'en bas.",
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
    "C'est une toute petite salle. Dans le coin, une échelle en bois branlante descend. Il devrait être possible de descendre sans danger. Il y a aussi un escalier qui monte.",
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
    "Vous êtes sur une corniche, à peu près à mi-hauteur de la paroi du canyon. Vous voyez d'ici que le flot principal des chutes Aragain serpente le long d'un passage où il vous est impossible d'entrer. Sous vous s'étend le fond du canyon. Au-dessus de vous, la falaise continue et semble escaladable.",
  'You are at the top of the Great Canyon on its west wall. From here there is a marvelous view of the canyon and parts of the Frigid River upstream. Across the canyon, the walls of the White Cliffs join the mighty ramparts of the Flathead Mountains to the east. Following the Canyon upstream to the north, Aragain Falls may be seen, complete with rainbow. The mighty Frigid River flows out from a great dark cavern. To the west and south can be seen an immense forest, stretching for miles around. A path leads northwest. It is possible to climb down into the canyon from here.':
    "Vous êtes au sommet du Grand Canyon, sur sa paroi ouest. D'ici, la vue sur le canyon et sur une partie de la rivière Frigid en amont est merveilleuse. De l'autre côté du canyon, les parois des Falaises blanches rejoignent à l'est les puissants remparts des monts Flathead. En remontant le canyon vers le nord, on aperçoit les chutes Aragain, arc-en-ciel compris. La puissante rivière Frigid jaillit d'une grande caverne sombre. À l'ouest et au sud s'étend une immense forêt, à des lieues à la ronde. Un chemin part au nord-ouest. Il est possible de descendre dans le canyon d'ici.",
  'You are standing in front of a massive barrow of stone. In the east face is a huge stone door which is open. You cannot see into the dark of the tomb.':
    "Vous vous tenez devant un imposant tumulus de pierre. Sur la face est se trouve une immense porte de pierre, qui est ouverte. Vous ne distinguez rien dans l'obscurité du tombeau.",
  'As you enter the barrow, the door closes inexorably behind you. Around you it is dark, but ahead is an enormous cavern, brightly lit. Through its center runs a wide stream. Spanning the stream is a small wooden footbridge, and beyond a path leads into a dark tunnel. Above the bridge, floating in the air, is a large sign. It reads: All ye who stand before this bridge have completed a great and perilous adventure which has tested your wit and courage. You have mastered the first part of the ZORK trilogy. Those who pass over this bridge must be prepared to undertake an even greater adventure that will severely test your skill and bravery!':
    "Au moment où vous entrez dans le tumulus, la porte se referme inexorablement derrière vous. Autour de vous règne l'obscurité, mais devant s'ouvre une énorme caverne, brillamment éclairée. En son centre coule un large ruisseau. Une petite passerelle en bois l'enjambe, et au-delà un chemin mène à un tunnel sombre. Au-dessus de la passerelle, flottant dans les airs, se trouve un grand écriteau. On y lit : Vous tous qui vous tenez devant ce pont, vous avez accompli une grande et périlleuse aventure qui a mis à l'épreuve votre esprit et votre courage. Vous avez triomphé de la première partie de la trilogie ZORK. Que ceux qui franchiront ce pont se préparent à une aventure plus grande encore, qui éprouvera durement leur adresse et leur bravoure !",
}
