// Zork I × Spanish full-line table (spec §4.1). KEYS are normalized English
// lines EXACTLY as the bridge delivers them (normalize(): collapsed whitespace,
// trimmed; case/punctuation preserved) — same keys as zork1.fr.strings.ts.
// Authored in Task 6; UAT hand-fixes edit entries here.
//
// TRANSLATION STYLE:
// - Informal «tú» throughout, matching the Spanish input-layer prompt and the
//   object vocabulary in zork1.es.objects.ts.
// - One line per key: sentence count and trailing punctuation preserved.
// - Inverted punctuation (¿…?, ¡…!) and «comillas» throughout.
// - Proper nouns stay (Zork, Frobozz, Aragain, Frigid, Ramsés II);
//   Flood Control Dam #3 → «Presa de Control de Crecidas n.º 3» (FCD#3 →
//   «PCC n.º 3»); the grue stays «un grue» (masculine — the monster).
// - Imperial units kept («pies», «pulgadas») for the 1980s flavor.
export const ZORK1_ES_STRINGS: Readonly<Record<string, string>> = {
  // ── Banner block ───────────────────────────────────────────────────────
  'ZORK I: The Great Underground Empire': 'ZORK I: El Gran Imperio Subterráneo',
  'Infocom interactive fiction - a fantasy story':
    'Ficción interactiva de Infocom - una historia de fantasía',
  'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.':
    'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. Todos los derechos reservados.',
  'ZORK is a registered trademark of Infocom, Inc.':
    'ZORK es una marca registrada de Infocom, Inc.',
  'Release 119 / Serial number 880429': 'Versión 119 / Número de serie 880429',

  // ── Common one-word/stock responses ────────────────────────────────────
  'Taken.': 'Cogido.',
  '(Taken)': '(Cogido)',
  'Dropped.': 'Soltado.',
  'Opened.': 'Abierto.',
  'Closed.': 'Cerrado.',
  'Done.': 'Hecho.',
  'Click.': 'Clic.',
  'You are on your own feet again.': 'Ya estás de nuevo en pie.',
  '(magic boat)': '(bote mágico)',
  'Your collection of treasures consists of:':
    'Tu colección de tesoros consiste en:',

  // ── Combat — sword glow, troll fight ───────────────────────────────────
  'Your sword is glowing with a faint blue glow.':
    'Tu espada brilla con un tenue resplandor azul.',
  'Your sword has begun to glow very brightly.':
    'Tu espada ha empezado a brillar con gran intensidad.',
  'Your sword is no longer glowing.': 'Tu espada ya no brilla.',
  'A nasty-looking troll, brandishing a bloody axe, blocks all passages out of the room.':
    'Un trol de aspecto repugnante, blandiendo un hacha ensangrentada, bloquea todas las salidas de la sala.',
  'Clang! Crash! The troll parries.': '¡Cling! ¡Clang! El trol para el golpe.',
  "The troll's mighty blow drops you to your knees.":
    'El formidable golpe del trol te hace caer de rodillas.',
  'You are still recovering from that last blow, so your attack is ineffective.':
    'Todavía te estás recuperando del último golpe, así que tu ataque resulta ineficaz.',
  "The troll's axe barely misses your ear.":
    'El hacha del trol falla tu oreja por muy poco.',
  'You charge, but the troll jumps nimbly aside.':
    'Cargas, pero el trol se aparta con un ágil salto.',
  'The troll swings his axe, but it misses.':
    'El trol descarga su hacha, pero falla.',
  "The troll's weapon is knocked to the floor, leaving him unarmed.":
    'El arma del trol cae al suelo, dejándolo desarmado.',
  'The troll, disarmed, cowers in terror, pleading for his life in the guttural tongue of the trolls.':
    'El trol, desarmado, se encoge de terror, suplicando por su vida en la gutural lengua de los troles.',
  'The unarmed troll cannot defend himself: He dies.':
    'El trol desarmado no puede defenderse: muere.',
  'Almost as soon as the troll breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.':
    'Apenas el trol exhala su último aliento, una nube de niebla negra y siniestra lo envuelve, y cuando la niebla se disipa, el cadáver ha desaparecido.',

  // ── The thief ──────────────────────────────────────────────────────────
  'Someone carrying a large bag is casually leaning against one of the walls here. He does not speak, but it is clear from his aspect that the bag will be taken only over his dead body.':
    'Alguien que carga una bolsa grande está apoyado con desenfado contra una de las paredes. No habla, pero está claro, por su aspecto, que solo le quitarán esa bolsa por encima de su cadáver.',
  'There is a suspicious-looking individual, holding a large bag, leaning against one wall. He is armed with a deadly stiletto.':
    'Un individuo de aspecto sospechoso, que sostiene una bolsa grande, está apoyado contra una pared. Va armado con un estilete mortífero.',
  "You hear a scream of anguish as you violate the robber's hideaway. Using passages unknown to you, he rushes to its defense.":
    'Oyes un grito de angustia en el momento en que profanas la guarida del ladrón. Por pasadizos que desconoces, él acude a toda prisa a defenderla.',
  'The thief gestures mysteriously, and the treasures in the room suddenly vanish.':
    'El ladrón hace un gesto misterioso, y los tesoros de la sala se desvanecen de repente.',
  'The thief is taken aback by your unexpected generosity, but accepts the jewel-encrusted egg and stops to admire its beauty.':
    'El ladrón se queda desconcertado ante tu inesperada generosidad, pero acepta el huevo incrustado de joyas y se detiene a admirar su belleza.',
  'The stiletto flashes faster than you can follow, and blood wells from your leg.':
    'El estilete relampaguea más rápido de lo que tu vista puede seguir, y la sangre brota de tu pierna.',
  'The thief is disarmed by a subtle feint past his guard.':
    'El ladrón es desarmado por una sutil finta que burla su guardia.',
  'The robber, somewhat surprised at this turn of events, nimbly retrieves his stiletto.':
    'El ladrón, algo sorprendido por este giro de los acontecimientos, recupera con agilidad su estilete.',
  'The quickness of your thrust knocks the thief back, stunned.':
    'La rapidez de tu estocada lanza al ladrón hacia atrás, aturdido.',
  'The thief slowly regains his feet.': 'El ladrón se incorpora lentamente.',
  'A quick stroke, but the thief is on guard.':
    'Un golpe rápido, pero el ladrón está en guardia.',
  'You dodge as the thief comes in low.': 'Esquivas el ataque bajo del ladrón.',
  'The thief is staggered, and drops to his knees.':
    'El ladrón se tambalea y cae de rodillas.',
  'A furious exchange, and the thief is knocked out!':
    '¡Un furioso intercambio, y el ladrón queda fuera de combate!',
  'The unconscious thief cannot defend himself: He dies.':
    'El ladrón inconsciente no puede defenderse: muere.',
  'Almost as soon as the thief breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.':
    'Apenas el ladrón exhala su último aliento, una nube de niebla negra y siniestra lo envuelve, y cuando la niebla se disipa, el cadáver ha desaparecido.',
  'As the thief dies, the power of his magic decreases, and his treasures reappear:':
    'Mientras el ladrón muere, el poder de su magia decae, y sus tesoros reaparecen:',
  'The chalice is now safe to take.':
    'Ahora se puede coger el cáliz sin peligro.',

  // ── The cyclops ────────────────────────────────────────────────────────
  'A cyclops, who looks prepared to eat horses (much less mere adventurers), blocks the staircase. From his state of health, and the bloodstains on the walls, you gather that he is not very friendly, though he likes people.':
    'Un cíclope, que parece dispuesto a comerse caballos (cuanto más simples aventureros), bloquea la escalera. Por su estado de salud y las manchas de sangre en las paredes, deduces que no es muy amistoso, aunque le gusta mucho la gente.',
  "The cyclops, hearing the name of his father's deadly nemesis, flees the room by knocking down the wall on the east of the room.":
    'El cíclope, al oír el nombre del enemigo mortal de su padre, huye de la sala derribando la pared del este.',

  // ── PIN LIST: full-line pins for plural objects ────────────────────────
  'There is a pair of candles here (providing light).':
    'Hay unas velas aquí (encendidas).',
  'A pair of candles (providing light)': 'Unas velas (encendidas)',
  'There is a matchbook here (providing light).':
    'Hay unas cerillas aquí (encendidas).',
  'A matchbook (providing light)': 'Unas cerillas (encendidas)',
  'The number of ghosts has it.': 'Lo tienen los fantasmas.',
  "You can't see any songbird here.":
    'No ves al pájaro cantor por ninguna parte.',
  'A quantity of water': 'Un poco de agua',

  // ── OFF-PATH PINS — darkness messages ──────────────────────────────────
  'It is pitch black.': 'Está completamente oscuro.',
  'It is pitch black. You are likely to be eaten by a grue.':
    'Está completamente oscuro. Es muy probable que te devore un grue.',
  'It is now pitch black.': 'Ahora está completamente oscuro.',
  "It's pitch black in here!": '¡Aquí dentro está completamente oscuro!',

  // ── House & forest props/events ────────────────────────────────────────
  "Beside you on the branch is a small bird's nest.":
    'Junto a ti, en la rama, hay un pequeño nido de pájaro.',
  "In the bird's nest is a large egg encrusted with precious jewels, apparently scavenged by a childless songbird. The egg is covered with fine gold inlay, and ornamented in lapis lazuli and mother-of-pearl. Unlike most eggs, this one is hinged and closed with a delicate looking clasp. The egg appears extremely fragile.":
    'En el nido de pájaro hay un gran huevo incrustado de joyas preciosas, al parecer recogido por un pájaro cantor sin crías. El huevo está cubierto de finas incrustaciones de oro y adornado con lapislázuli y nácar. A diferencia de la mayoría de los huevos, este tiene bisagra y se cierra con un broche de aspecto delicado. El huevo parece sumamente frágil.',
  'You hear in the distance the chirping of a song bird.':
    'Oyes a lo lejos el gorjeo de un pájaro cantor.',
  'With great effort, you open the window far enough to allow entry.':
    'Con gran esfuerzo, abres la ventana lo bastante para poder entrar.',
  'A bottle is sitting on the table.': 'Hay una botella sobre la mesa.',
  'On the table is an elongated brown sack, smelling of hot peppers.':
    'Sobre la mesa hay un saco marrón alargado que huele a guindillas.',
  'Opening the brown sack reveals a clove of garlic, and a lunch.':
    'Al abrir el saco marrón, descubres un diente de ajo y un almuerzo.',
  // UAT 2026-06-19: reveal-on-open of the mailbox (the first command players
  // type) is runtime-composed and off-walkthrough, so both gates missed it.
  'Opening the small mailbox reveals a leaflet.':
    'Al abrir el buzón, descubres un folleto.',
  'Above the trophy case hangs an elvish sword of great antiquity.':
    'Sobre la vitrina cuelga una espada élfica de gran antigüedad.',
  'A battery-powered brass lantern is on the trophy case.':
    'Hay una lámpara de latón a pilas sobre la vitrina.',
  'With a great effort, the rug is moved to one side of the room, revealing the dusty cover of a closed trap door.':
    'Con gran esfuerzo, la alfombra es desplazada a un lado de la sala, revelando la polvorienta tapa de una trampilla cerrada.',
  'The door reluctantly opens to reveal a rickety staircase descending into darkness.':
    'La puerta se abre a regañadientes y revela una escalera desvencijada que desciende hacia la oscuridad.',
  'A large coil of rope is lying in the corner.':
    'Hay un gran rollo de cuerda tirado en un rincón.',
  'On a table is a nasty-looking knife.':
    'Sobre una mesa hay un cuchillo de aspecto siniestro.',
  'The trap door crashes shut, and you hear someone barring it.':
    'La trampilla se cierra de golpe, y oyes a alguien atrancándola.',

  // ── Maze & Hades ───────────────────────────────────────────────────────
  'Beside the skeleton is a rusty knife.':
    'Junto al esqueleto hay un cuchillo oxidado.',
  "The deceased adventurer's useless lantern is here.":
    'La inútil lámpara del aventurero difunto está aquí.',
  'An old leather bag, bulging with coins, is here.':
    'Hay aquí una vieja bolsa de cuero, abultada de monedas.',
  'There is a silver chalice, intricately engraved, here.':
    'Hay aquí un cáliz de plata, intrincadamente grabado.',
  'The way through the gate is barred by evil spirits, who jeer at your attempts to pass.':
    'El paso por la verja está cerrado por espíritus malignos, que se burlan de tus intentos de pasar.',
  'The bell suddenly becomes red hot and falls to the ground. The wraiths, as if paralyzed, stop their jeering and slowly turn to face you. On their ashen faces, the expression of a long-forgotten terror takes shape.':
    'La campana se pone de pronto al rojo vivo y cae al suelo. Los espectros, como paralizados, cesan sus burlas y se vuelven lentamente hacia ti. En sus rostros cenicientos se dibuja la expresión de un terror olvidado hace mucho.',
  'In your confusion, the candles drop to the ground (and they are out).':
    'En tu confusión, dejas caer las velas al suelo (y se apagan).',
  'One of the matches starts to burn.': 'Una de las cerillas prende.',
  'The candles are lit.': 'Las velas están encendidas.',
  'The flames flicker wildly and appear to dance. The earth beneath your feet trembles, and your legs nearly buckle beneath you. The spirits cower at your unearthly power.':
    'Las llamas oscilan con violencia y parecen danzar. La tierra tiembla bajo tus pies, y tus piernas están a punto de flaquear. Los espíritus se encogen ante tu poder sobrenatural.',
  'The match has gone out.': 'La cerilla se ha apagado.',
  'Each word of the prayer reverberates through the hall in a deafening confusion. As the last word fades, a voice, loud and commanding, speaks: "Begone, fiends!" A heart-stopping scream fills the cavern, and the spirits, sensing a greater power, flee through the walls.':
    'Cada palabra de la oración reverbera por la sala en una confusión ensordecedora. Cuando la última palabra se extingue, una voz, potente e imperiosa, declara: «¡Fuera, demonios!». Un grito capaz de helar la sangre llena la caverna, y los espíritus, presintiendo un poder superior, huyen a través de las paredes.',
  'Lying in one corner of the room is a beautifully carved crystal skull. It appears to be grinning at you rather nastily.':
    'En un rincón de la sala yace un cráneo de cristal bellamente tallado. Parece dirigirte una mueca más bien maligna.',
  'On the ground is a red hot bell.':
    'En el suelo hay una campana al rojo vivo.',

  // ── Gallery, dam & reservoir ───────────────────────────────────────────
  'Fortunately, there is still one chance for you to be a vandal, for on the far wall is a painting of unparalleled beauty.':
    'Por suerte, aún te queda una oportunidad de hacer de vándalo, pues en la pared del fondo hay un cuadro de incomparable belleza.',
  'The sluice gates on the dam are closed. Behind the dam, there can be seen a wide reservoir. Water is pouring over the top of the now abandoned dam.':
    'Las compuertas de la presa están cerradas. Tras la presa se divisa un amplio embalse. El agua se derrama por encima de la presa, ahora abandonada.',
  'There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble.':
    'Hay aquí un panel de control, en el que va montado un gran perno metálico. Justo encima del perno hay una pequeña burbuja de plástico verde.',
  'There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble which is glowing serenely.':
    'Hay aquí un panel de control, en el que va montado un gran perno metálico. Justo encima del perno hay una pequeña burbuja de plástico verde que brilla serenamente.',
  'Some guidebooks entitled "Flood Control Dam #3" are on the reception desk.':
    'Sobre el mostrador de recepción hay unas guías turísticas tituladas «Presa de Control de Crecidas n.º 3».',
  'There is a matchbook whose cover says "Visit Beautiful FCD#3" here.':
    'Hay aquí unas cerillas cuya cubierta proclama «Visita la hermosa PCC n.º 3».',
  'There is an object which looks like a tube of toothpaste here.':
    'Hay aquí un objeto que parece un tubo de pasta de dientes.',
  'The sluice gates open and water pours through the dam.':
    'Las compuertas se abren y el agua se precipita a través de la presa.',
  'There is a rumble from deep within the earth and the room shakes.':
    'Un retumbar surge de las profundidades de la tierra y la sala se estremece.',
  'On the ground is a large platinum bar.':
    'En el suelo hay una gran barra de platino.',
  'The acoustics of the room change subtly.':
    'La acústica de la sala cambia sutilmente.',
  'Lying half buried in the mud is an old trunk, bulging with jewels.':
    'Medio enterrado en el barro yace un viejo baúl, rebosante de joyas.',
  'There is a slimy stairway leaving the room to the north.':
    'Una escalera viscosa sale de la sala hacia el norte.',
  "On the shore lies Poseidon's own crystal trident.":
    'En la orilla yace el propio tridente de cristal de Poseidón.',

  // ── Temple, dome & torch ───────────────────────────────────────────────
  'There are old engravings on the walls here.':
    'Hay aquí viejos grabados en las paredes.',
  'The rope drops over the side and comes within ten feet of the floor.':
    'La cuerda cae por el borde y se detiene a unos diez pies del suelo.',
  'A piece of rope descends from the railing above, ending some five feet above your head.':
    'Un trozo de cuerda desciende de la barandilla de arriba y termina a unos cinco pies por encima de tu cabeza.',
  'Sitting on the pedestal is a flaming torch, made of ivory.':
    'Sobre el pedestal reposa una antorcha llameante, tallada en marfil.',
  'On the two ends of the altar are burning candles.':
    'En los dos extremos del altar arden unas velas.',
  'On the altar is a large black book, open to page 569.':
    'Sobre el altar hay un gran libro negro, abierto por la página 569.',
  'A gust of wind blows out your candles!':
    '¡Una ráfaga de viento apaga tus velas!',

  // ── Coal mine, bat & machine ───────────────────────────────────────────
  'There is an exquisite jade figurine here.':
    'Hay aquí una exquisita figurilla de jade.',
  'In the corner of the room on the ceiling is a large vampire bat who is obviously deranged and holding his nose.':
    'En el rincón del techo de la sala hay un gran murciélago vampiro, evidentemente trastornado, que se tapa la nariz.',
  'At the end of the chain is a basket.':
    'Al final de la cadena hay una cesta.',
  'From the chain is suspended a basket.': 'De la cadena pende una cesta.',
  'The basket is lowered to the bottom of the shaft.':
    'La cesta es bajada hasta el fondo del pozo.',
  'The basket is raised to the top of the shaft.':
    'La cesta es subida hasta lo alto del pozo.',
  'The lid opens.': 'La tapa se abre.',
  'The lid closes.': 'La tapa se cierra.',
  'The machine comes to life (figuratively) with a dazzling display of colored lights and bizarre noises. After a few moments, the excitement abates.':
    'La máquina cobra vida (en sentido figurado) con un deslumbrante despliegue de luces de colores y ruidos extraños. Al cabo de unos instantes, la agitación remite.',
  'The lid opens, revealing a huge diamond.':
    'La tapa se abre, revelando un enorme diamante.',
  'There is a brass lantern (battery-powered) here.':
    'Hay aquí una lámpara de latón (a pilas).',

  // ── Egypt ──────────────────────────────────────────────────────────────
  'The solid-gold coffin used for the burial of Ramses II is here.':
    'Aquí está el ataúd de oro macizo que sirvió para el entierro de Ramsés II.',
  'A sceptre, possibly that of ancient Egypt itself, is in the coffin. The sceptre is ornamented with colored enamel, and tapers to a sharp point.':
    'En el ataúd hay un cetro, posiblemente el del propio antiguo Egipto. El cetro está adornado con esmalte de colores y se afila hasta una punta aguda.',

  // ── River, boat & beach ────────────────────────────────────────────────
  'There is a folded pile of plastic here which has a small valve attached.':
    'Hay aquí un montón de plástico plegado que lleva una pequeña válvula.',
  'The boat inflates and appears seaworthy.':
    'El bote se hincha y parece apto para navegar.',
  'A tan label is lying inside the boat.':
    'Hay una etiqueta beige dentro del bote.',
  'The flow of the river carries you downstream.':
    'La corriente del río te arrastra aguas abajo.',
  'There is a red buoy here (probably a warning).':
    'Hay aquí una boya roja (probablemente una advertencia).',
  'The magic boat comes to a rest on the shore.':
    'El bote mágico se detiene en la orilla.',
  "The magic boat doesn't lead upward.":
    'El bote mágico no lleva hacia arriba.',
  'You seem to be digging a hole here.':
    'Parece que estás cavando un hoyo aquí.',
  "The hole is getting deeper, but that's about it.":
    'El hoyo se hace más hondo, pero poco más.',
  'You are surrounded by a wall of sand on all sides.':
    'Estás rodeado por un muro de arena por todos lados.',
  'You can see a scarab here in the sand.':
    'Distingues un escarabajo aquí, en la arena.',

  // ── Rainbow & endgame ──────────────────────────────────────────────────
  'A beautiful rainbow can be seen over the falls and to the west.':
    'Se ve un hermoso arcoíris sobre las cataratas y hacia el oeste.',
  'Suddenly, the rainbow appears to become solid and, I venture, walkable (I think the giveaway was the stairs and bannister).':
    'De pronto, el arcoíris parece volverse sólido y, me atrevo a decir, transitable (creo que lo delataron las escaleras y el pasamanos).',
  'At the end of the rainbow is a pot of gold.':
    'Al final del arcoíris hay una olla de oro.',
  'The lamp appears a bit dimmer.':
    'La lámpara parece brillar algo más débilmente.',
  'The canary chirps, slightly off-key, an aria from a forgotten opera. From out of the greenery flies a lovely songbird. It perches on a limb just over your head and opens its beak to sing. As it does so a beautiful brass bauble drops from its mouth, bounces off the top of your head, and lands glimmering in the grass. As the canary winds down, the songbird flies away.':
    'El canario gorjea, algo desafinado, un aria de una ópera olvidada. De entre la vegetación sale volando un precioso pájaro cantor. Se posa en una rama justo encima de tu cabeza y abre el pico para cantar. Al hacerlo, una hermosa chuchería de latón cae de su boca, rebota en lo alto de tu cabeza y aterriza reluciente en la hierba. Cuando el canario se detiene, el pájaro cantor se aleja volando.',
  'An almost inaudible voice whispers in your ear, "Look to your treasures for the final secret."':
    'Una voz casi inaudible te susurra al oído: «Busca el secreto final entre tus tesoros».',
  'The ZORK trilogy continues with "ZORK II: The Wizard of Frobozz" and is completed in "ZORK III: The Dungeon Master."':
    'La trilogía ZORK continúa con «ZORK II: El Mago de Frobozz» y se completa con «ZORK III: El Maestro del Calabozo».',
  'This gives you the rank of Master Adventurer.':
    'Esto te otorga el rango de Maestro Aventurero.',
  'Would you like to restart the game from the beginning, restore a saved game position, or end this session of the game?':
    '¿Quieres reiniciar la partida desde el principio, restaurar una partida guardada o terminar esta sesión de juego?',
  '(Type RESTART, RESTORE, or QUIT):': '(Escribe RESTART, RESTORE o QUIT):',

  // ── Rooms — titles ─────────────────────────────────────────────────────
  'West of House': 'Al oeste de la casa',
  'North of House': 'Al norte de la casa',
  'South of House': 'Al sur de la casa',
  'Behind House': 'Detrás de la casa',
  'Forest Path': 'Sendero del bosque',
  'Up a Tree': 'En lo alto de un árbol',
  Forest: 'Bosque',
  Clearing: 'Claro',
  Kitchen: 'Cocina',
  'Living Room': 'Salón',
  Attic: 'Desván',
  Cellar: 'Sótano',
  'The Troll Room': 'La sala del trol',
  Maze: 'Laberinto',
  'Cyclops Room': 'Sala del cíclope',
  'Treasure Room': 'Sala del tesoro',
  'Strange Passage': 'Pasaje extraño',
  'East of Chasm': 'Al este del abismo',
  Gallery: 'Galería',
  'East-West Passage': 'Pasaje este-oeste',
  'Round Room': 'Sala redonda',
  'North-South Passage': 'Pasaje norte-sur',
  'Deep Canyon': 'Cañón profundo',
  'Reservoir South': 'Sur del embalse',
  Reservoir: 'Embalse',
  'Reservoir North': 'Norte del embalse',
  Dam: 'Presa',
  'Dam Lobby': 'Vestíbulo de la presa',
  'Maintenance Room': 'Sala de mantenimiento',
  'Dam Base': 'Pie de la presa',
  'Engravings Cave': 'Gruta de los grabados',
  'Dome Room': 'Sala de la cúpula',
  'Torch Room': 'Sala de la antorcha',
  Temple: 'Templo',
  Altar: 'Altar',
  Cave: 'Gruta',
  'Entrance to Hades': 'Entrada al Hades',
  'Land of the Dead': 'Reino de los muertos',
  'Mirror Room': 'Sala del espejo',
  'Cold Passage': 'Pasaje frío',
  'Slide Room': 'Sala del tobogán',
  'Loud Room': 'Sala ruidosa',
  'Atlantis Room': 'Sala de la Atlántida',
  'Narrow Passage': 'Pasaje estrecho',
  'Mine Entrance': 'Entrada de la mina',
  'Squeaky Room': 'Sala de los chirridos',
  'Bat Room': 'Sala del murciélago',
  'Shaft Room': 'Sala del pozo',
  'Smelly Room': 'Sala maloliente',
  'Gas Room': 'Sala del gas',
  'Coal Mine': 'Mina de carbón',
  'Ladder Top': 'Alto de la escalera',
  'Ladder Bottom': 'Pie de la escalera',
  'Dead End': 'Callejón sin salida',
  'Timber Room': 'Sala de las vigas',
  'Drafty Room': 'Sala de las corrientes',
  'Machine Room': 'Sala de la máquina',
  'Egyptian Room': 'Sala egipcia',
  'Frigid River, in the magic boat': 'Río Frigid, en el bote mágico',
  'Sandy Beach, in the magic boat': 'Playa de arena, en el bote mágico',
  'Sandy Beach': 'Playa de arena',
  'Sandy Cave': 'Gruta de arena',
  Shore: 'Orilla',
  'Aragain Falls': 'Cataratas Aragain',
  'On the Rainbow': 'Sobre el arcoíris',
  'End of Rainbow': 'Al final del arcoíris',
  'Canyon Bottom': 'Fondo del cañón',
  'Rocky Ledge': 'Repisa rocosa',
  'Canyon View': 'Vista del cañón',
  'Stone Barrow': 'Túmulo de piedra',
  'Inside the Barrow': 'Dentro del túmulo',

  // ── Rooms — long descriptions ──────────────────────────────────────────
  'You are standing in an open field west of a white house, with a boarded front door.':
    'Estás de pie en un campo abierto al oeste de una casa blanca, con la puerta principal tapiada.',
  'You are standing in an open field west of a white house, with a boarded front door. A secret path leads southwest into the forest.':
    'Estás de pie en un campo abierto al oeste de una casa blanca, con la puerta principal tapiada. Un sendero secreto se interna hacia el suroeste en el bosque.',
  'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.':
    'Estás frente al lado norte de una casa blanca. Aquí no hay puerta, y todas las ventanas están tapiadas. Al norte, un estrecho sendero serpentea entre los árboles.',
  'You are facing the south side of a white house. There is no door here, and all the windows are boarded.':
    'Estás frente al lado sur de una casa blanca. Aquí no hay puerta, y todas las ventanas están tapiadas.',
  'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.':
    'Estás detrás de la casa blanca. Un sendero se interna en el bosque hacia el este. En un rincón de la casa hay una pequeña ventana entreabierta.',
  'This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the edge of the path.':
    'Este es un sendero que serpentea por un bosque en penumbra. El sendero sigue aquí un eje norte-sur. Un árbol especialmente grande, de ramas bajas, se alza al borde del sendero.',
  'You are about 10 feet above the ground nestled among some large branches. The nearest branch above you is above your reach.':
    'Estás a unos 10 pies del suelo, acurrucado entre grandes ramas. La rama más cercana por encima de ti queda fuera de tu alcance.',
  'This is a forest, with trees in all directions. To the east, there appears to be sunlight.':
    'Esto es un bosque, con árboles en todas direcciones. Al este parece haber luz del sol.',
  'This is a dimly lit forest, with large trees all around.':
    'Esto es un bosque en penumbra, con grandes árboles por todas partes.',
  'You are in a small clearing in a well marked forest path that extends to the east and west.':
    'Estás en un pequeño claro, sobre un sendero del bosque bien marcado que se extiende de este a oeste.',
  'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. A dark chimney leads down and to the east is a small window which is open.':
    'Estás en la cocina de la casa blanca. Una mesa parece haber sido usada recientemente para preparar comida. Un pasadizo conduce al oeste y se ve una escalera oscura que sube. Una chimenea oscura baja, y al este hay una pequeña ventana abierta.',
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room.':
    'Estás en el salón. Hay una puerta al este, una puerta de madera con extraños caracteres góticos al oeste que parece clavada, una vitrina y una gran alfombra oriental en el centro de la sala.',
  // Living Room re-described after the rug is moved and the trap door opened —
  // composed at runtime, so missed by the coverage/inventory gates and pinned
  // here from the UAT miss log (spec §4 "Spanish UAT loop"). Pre-cyclops form:
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a rug lying beside an open trap door.':
    'Estás en el salón. Hay una puerta al este, una puerta de madera con extraños caracteres góticos al oeste que parece clavada, una vitrina y una alfombra tendida junto a una trampilla abierta.',
  // Rug moved, trap door CLOSED, pre-cyclops (west door still nailed shut). The
  // golden-path state between `move rug` and `open trap door` (UAT 2026-06-23),
  // missing from every corpus. Nailed-shut prefix + closed-trap-door suffix:
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a closed trap door at your feet.':
    'Estás en el salón. Hay una puerta al este, una puerta de madera con extraños caracteres góticos al oeste que parece clavada, una vitrina y una trampilla cerrada a tus pies.',
  // Same, AFTER the cyclops smashes the west door into a cyclops-shaped opening:
  'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a rug lying beside an open trap door.':
    'Estás en el salón. Hay una puerta al este. Al oeste hay una abertura con forma de cíclope en una vieja puerta de madera, sobre la que hay unos extraños caracteres góticos, una vitrina y una alfombra tendida junto a una trampilla abierta.',
  // Same cyclops opening, but the trap door is CLOSED (re-barred), so the rug
  // clause collapses to "a closed trap door at your feet":
  'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a closed trap door at your feet.':
    'Estás en el salón. Hay una puerta al este. Al oeste hay una abertura con forma de cíclope en una vieja puerta de madera, sobre la que hay unos extraños caracteres góticos, una vitrina y una trampilla cerrada a tus pies.',
  'This is the attic. The only exit is a stairway leading down.':
    'Este es el desván. La única salida es una escalera que baja.',
  'You are in a dark and damp cellar with a narrow passageway leading north, and a crawlway to the south. On the west is the bottom of a steep metal ramp which is unclimbable.':
    'Estás en un sótano oscuro y húmedo, con un pasadizo estrecho hacia el norte y un angosto túnel hacia el sur. Al oeste está la base de una empinada rampa metálica imposible de escalar.',
  'This is a small room with passages to the east and south and a forbidding hole leading west. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.':
    'Esta es una pequeña sala con pasadizos al este y al sur y un amenazador agujero hacia el oeste. Manchas de sangre y profundos arañazos (quizá hechos con un hacha) afean las paredes.',
  'This is part of a maze of twisty little passages, all alike.':
    'Esto es parte de un laberinto de pasadizos pequeños y enrevesados, todos iguales.',
  'This is part of a maze of twisty little passages, all alike. A skeleton, probably the remains of a luckless adventurer, lies here.':
    'Esto es parte de un laberinto de pasadizos pequeños y enrevesados, todos iguales. Un esqueleto, probablemente los restos de un aventurero sin suerte, yace aquí.',
  'This room has an exit on the northwest, and a staircase leading up.':
    'Esta sala tiene una salida al noroeste y una escalera que sube.',
  'This is a large room, whose east wall is solid granite. A number of discarded bags, which crumble at your touch, are scattered about on the floor. There is an exit down a staircase.':
    'Esta es una gran sala, cuya pared este es de granito macizo. Varias bolsas abandonadas, que se deshacen a tu contacto, están esparcidas por el suelo. Hay una salida bajando por una escalera.',
  'This is a long passage. To the west is one entrance. On the east there is an old wooden door, with a large opening in it (about cyclops sized).':
    'Este es un largo pasadizo. Al oeste hay una entrada. Al este hay una vieja puerta de madera, con una gran abertura (más o menos del tamaño de un cíclope).',
  'You are on the east edge of a chasm, the bottom of which cannot be seen. A narrow passage goes north, and the path you are on continues to the east.':
    'Estás en el borde este de un abismo cuyo fondo no se alcanza a ver. Un pasadizo estrecho va hacia el norte, y el sendero que sigues continúa hacia el este.',
  'This is an art gallery. Most of the paintings have been stolen by vandals with exceptional taste. The vandals left through either the north or west exits.':
    'Esto es una galería de arte. La mayoría de los cuadros han sido robados por vándalos de gusto excepcional. Los vándalos se marcharon por la salida norte o por la oeste.',
  'This is a narrow east-west passageway. There is a narrow stairway leading down at the north end of the room.':
    'Este es un estrecho pasadizo este-oeste. Hay una escalera estrecha que baja en el extremo norte de la sala.',
  'This is a circular stone room with passages in all directions. Several of them have unfortunately been blocked by cave-ins.':
    'Esta es una sala de piedra circular con pasadizos en todas direcciones. Varios de ellos, por desgracia, han quedado bloqueados por derrumbes.',
  'This is a high north-south passage, which forks to the northeast.':
    'Este es un alto pasadizo norte-sur, que se bifurca hacia el noreste.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear the sound of flowing water from below.':
    'Estás en el borde sur de un cañón profundo. Hay pasadizos hacia el este, el noroeste y el suroeste. Una escalera baja. Oyes el rumor de agua que fluye desde abajo.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear a loud roaring sound, like that of rushing water, from below.':
    'Estás en el borde sur de un cañón profundo. Hay pasadizos hacia el este, el noroeste y el suroeste. Una escalera baja. Oyes un fuerte rugido, como el de aguas turbulentas, que viene de abajo.',
  'You are in a long room on the south shore of a large lake, far too deep and wide for crossing.':
    'Estás en una sala alargada en la orilla sur de un gran lago, demasiado profundo y ancho para cruzarlo.',
  'There is a path along the stream to the east or west, a steep pathway climbing southwest along the edge of a chasm, and a path leading into a canyon to the southeast.':
    'Hay un sendero a lo largo del arroyo hacia el este o el oeste, un sendero empinado que sube hacia el suroeste por el borde de un abismo, y un sendero que se interna en un cañón hacia el sureste.',
  'You are in a long room, to the north of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through the center of the room.':
    'Estás en una sala alargada, al norte de la cual hubo antaño un lago. Sin embargo, al bajar el nivel del agua, no queda más que un ancho arroyo que recorre el centro de la sala.',
  'You are on what used to be a large lake, but which is now a large mud pile. There are "shores" to the north and south.':
    'Estás sobre lo que fue un gran lago, pero que ahora es un gran lodazal. Hay «orillas» al norte y al sur.',
  'You are in a large cavernous room, the south of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through there.':
    'Estás en una gran sala cavernosa, al sur de la cual hubo antaño un lago. Sin embargo, al bajar el nivel del agua, no queda más que un ancho arroyo que pasa por allí.',
  'You are standing on the top of the Flood Control Dam #3, which was quite a tourist attraction in times far distant. There are paths to the north, south, and west, and a scramble down.':
    'Estás de pie en lo alto de la Presa de Control de Crecidas n.º 3, que fue toda una atracción turística en tiempos muy remotos. Hay senderos al norte, al sur y al oeste, y se puede bajar trepando como se pueda.',
  'This room appears to have been the waiting room for groups touring the dam. There are open doorways here to the north and east marked "Private", and there is a path leading south over the top of the dam.':
    'Esta sala parece haber sido la sala de espera de los grupos que visitaban la presa. Hay puertas abiertas al norte y al este marcadas como «Privado», y un sendero que conduce al sur por lo alto de la presa.',
  'This is what appears to have been the maintenance room for Flood Control Dam #3. Apparently, this room has been ransacked recently, for most of the valuable equipment is gone. On the wall in front of you is a group of buttons colored blue, yellow, brown, and red. There are doorways to the west and south.':
    'Esto es lo que parece haber sido la sala de mantenimiento de la Presa de Control de Crecidas n.º 3. Al parecer, esta sala ha sido saqueada recientemente, pues falta la mayor parte del equipo valioso. En la pared frente a ti hay un grupo de botones de color azul, amarillo, marrón y rojo. Hay puertas al oeste y al sur.',
  'You are at the base of Flood Control Dam #3, which looms above you and to the north. The river Frigid is flowing by here. Along the river are the White Cliffs which seem to form giant walls stretching from north to south along the shores of the river as it winds its way downstream.':
    'Estás al pie de la Presa de Control de Crecidas n.º 3, que se alza sobre ti hacia el norte. El río Frigid corre por aquí. A lo largo del río se hallan los Acantilados Blancos, que parecen formar gigantescos muros que se extienden de norte a sur por las orillas del río mientras serpentea aguas abajo.',
  'You have entered a low cave with passages leading northwest and east.':
    'Has entrado en una gruta baja con pasadizos hacia el noroeste y el este.',
  'You are at the periphery of a large dome, which forms the ceiling of another room below. Protecting you from a precipitous drop is a wooden railing which circles the dome.':
    'Estás en la periferia de una gran cúpula, que forma el techo de otra sala situada más abajo. De una caída vertiginosa te protege una barandilla de madera que rodea la cúpula.',
  'This is a large room with a prominent doorway leading to a down staircase. Above you is a large dome. Up around the edge of the dome (20 feet up) is a wooden railing. In the center of the room sits a white marble pedestal.':
    'Esta es una gran sala con una puerta destacada que conduce a una escalera descendente. Sobre ti se alza una gran cúpula. En lo alto, en torno al borde de la cúpula (a 20 pies), corre una barandilla de madera. En el centro de la sala se asienta un pedestal de mármol blanco.',
  'This is the north end of a large temple. On the east wall is an ancient inscription, probably a prayer in a long-forgotten language. Below the prayer is a staircase leading down. The west wall is solid granite. The exit to the north end of the room is through huge marble pillars.':
    'Este es el extremo norte de un gran templo. En la pared este hay una inscripción antigua, probablemente una oración en una lengua olvidada hace mucho. Bajo la oración, una escalera baja. La pared oeste es de granito macizo. La salida, en el extremo norte de la sala, pasa entre enormes pilares de mármol.',
  'This is the south end of a large temple. In front of you is what appears to be an altar. In one corner is a small hole in the floor which leads into darkness. You probably could not get back up it.':
    'Este es el extremo sur de un gran templo. Ante ti hay lo que parece un altar. En un rincón, un pequeño agujero en el suelo se interna en la oscuridad. Probablemente no podrías volver a subir por él.',
  'This is a tiny cave with entrances west and north, and a dark, forbidding staircase leading down.':
    'Esta es una gruta diminuta con entradas al oeste y al norte, y una escalera oscura y amenazadora que baja.',
  'This is a tiny cave with entrances west and north, and a staircase leading down.':
    'Esta es una gruta diminuta con entradas al oeste y al norte, y una escalera que baja.',
  'You are outside a large gateway, on which is inscribed':
    'Estás ante una gran verja, en la que se lee',
  'Abandon every hope all ye who enter here!':
    '¡Abandonad toda esperanza los que aquí entráis!',
  'The gate is open; through it you can see a desolation, with a pile of mangled bodies in one corner. Thousands of voices, lamenting some hideous fate, can be heard.':
    'La verja está abierta; a través de ella ves una desolación, con un montón de cuerpos destrozados en un rincón. Se oyen miles de voces que lamentan algún destino atroz.',
  'You have entered the Land of the Living Dead. Thousands of lost souls can be heard weeping and moaning. In the corner are stacked the remains of dozens of previous adventurers less fortunate than yourself. A passage exits to the north.':
    'Has entrado en el Reino de los Muertos Vivientes. Se oyen miles de almas perdidas llorando y gimiendo. En el rincón se apilan los restos de docenas de aventureros anteriores menos afortunados que tú. Un pasadizo sale al norte.',
  'You are in a large square room with tall ceilings. On the south wall is an enormous mirror which fills the entire wall. There are exits on the other three sides of the room.':
    'Estás en una gran sala cuadrada de techos altos. En la pared sur hay un enorme espejo que ocupa toda la pared. Hay salidas en los otros tres lados de la sala.',
  'This is a cold and damp corridor where a long east-west passageway turns into a southward path.':
    'Este es un corredor frío y húmedo donde un largo pasadizo este-oeste se convierte en un sendero hacia el sur.',
  'This is a small chamber, which appears to have been part of a coal mine. On the south wall of the chamber the letters "Granite Wall" are etched in the rock. To the east is a long passage, and there is a steep metal slide twisting downward. To the north is a small opening.':
    'Esta es una pequeña cámara, que parece haber sido parte de una mina de carbón. En la pared sur de la cámara, las letras «Muro de Granito» están grabadas en la roca. Al este hay un largo pasadizo, y un empinado tobogán metálico desciende en espiral. Al norte hay una pequeña abertura.',
  'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward. The room is deafeningly loud with an undetermined rushing sound. The sound seems to reverberate from all of the walls, making it difficult even to think.':
    'Esta es una gran sala cuyo techo no se alcanza a distinguir desde el suelo. Hay un pasadizo estrecho de este a oeste y una escalera de piedra que sube. La sala es ensordecedora, llena de un rugido de origen indeterminado. El sonido parece reverberar en todas las paredes, hasta el punto de que cuesta incluso pensar.',
  'This is an ancient room, long under water. There is an exit to the south and a staircase leading up.':
    'Esta es una sala antigua, mucho tiempo bajo el agua. Hay una salida al sur y una escalera que sube.',
  'This is a long and narrow corridor where a long north-south passageway briefly narrows even further.':
    'Este es un corredor largo y estrecho donde un largo pasadizo norte-sur se estrecha aún más brevemente.',
  'You are standing at the entrance of what might have been a coal mine. The shaft enters the west wall, and there is another exit on the south end of the room.':
    'Estás de pie a la entrada de lo que pudo ser una mina de carbón. El pozo se interna en la pared oeste, y hay otra salida en el extremo sur de la sala.',
  'You are in a small room. Strange squeaky sounds may be heard coming from the passage at the north end. You may also escape to the east.':
    'Estás en una pequeña sala. Se oyen extraños chirridos que provienen del pasadizo del extremo norte. También puedes escapar hacia el este.',
  'You are in a small room which has doors only to the east and south.':
    'Estás en una pequeña sala que solo tiene puertas al este y al sur.',
  'This is a large room, in the middle of which is a small shaft descending through the floor into darkness below. To the west and the north are exits from this room. Constructed over the top of the shaft is a metal framework to which a heavy iron chain is attached.':
    'Esta es una gran sala, en cuyo centro un pequeño pozo desciende por el suelo hacia la oscuridad de abajo. Al oeste y al norte se hallan las salidas de esta sala. Sobre el pozo se ha construido una armazón metálica a la que va sujeta una pesada cadena de hierro.',
  'This is a small nondescript room. However, from the direction of a small descending staircase a foul odor can be detected. To the south is a narrow tunnel.':
    'Esta es una pequeña sala anodina. Sin embargo, desde la dirección de una pequeña escalera descendente se percibe un olor nauseabundo. Al sur hay un túnel estrecho.',
  'This is a small room which smells strongly of coal gas. There is a short climb up some stairs and a narrow tunnel leading east.':
    'Esta es una pequeña sala que huele fuertemente a gas de carbón. Hay un breve ascenso por unas escaleras y un túnel estrecho hacia el este.',
  'This is a nondescript part of a coal mine.':
    'Esta es una parte anodina de una mina de carbón.',
  'This is a very small room. In the corner is a rickety wooden ladder, leading downward. It might be safe to descend. There is also a staircase leading upward.':
    'Esta es una sala muy pequeña. En el rincón hay una escalera de mano desvencijada que baja. Quizá no sea peligroso descender. También hay una escalera que sube.',
  'This is a rather wide room. On one side is the bottom of a narrow wooden ladder. To the west and the south are passages leaving the room.':
    'Esta es una sala bastante ancha. A un lado está la base de una estrecha escalera de mano. Al oeste y al sur, unos pasadizos salen de la sala.',
  'You have come to a dead end in the mine.':
    'Has llegado a un callejón sin salida en la mina.',
  'This is a long and narrow passage, which is cluttered with broken timbers. A wide passage comes from the east and turns at the west end of the room into a very narrow passageway. From the west comes a strong draft.':
    'Este es un pasadizo largo y estrecho, atestado de vigas rotas. Un ancho pasadizo viene del este y, en el extremo oeste de la sala, se convierte en un corredor muy estrecho. Del oeste sopla una fuerte corriente de aire.',
  'This is a small drafty room in which is the bottom of a long shaft. To the south is a passageway and to the east a very narrow passage. In the shaft can be seen a heavy iron chain.':
    'Esta es una pequeña sala llena de corrientes de aire en la que está la base de un largo pozo. Al sur hay un corredor y al este un pasadizo muy estrecho. En el pozo se ve una pesada cadena de hierro.',
  'This is a large, cold room whose sole exit is to the north. In one corner there is a machine which is reminiscent of a clothes dryer. On its face is a switch which is labelled "START". The switch does not appear to be manipulable by any human hand (unless the fingers are about 1/16 by 1/4 inch). On the front of the machine is a large lid, which is closed.':
    'Esta es una gran sala fría cuya única salida está al norte. En un rincón hay una máquina que recuerda a una secadora de ropa. En su frente hay un interruptor con la etiqueta «START». El interruptor no parece poder accionarse con ninguna mano humana (a menos que los dedos midan más o menos 1/16 por 1/4 de pulgada). En la parte delantera de la máquina hay una gran tapa, que está cerrada.',
  'This is a room which looks like an Egyptian tomb. There is an ascending staircase to the west.':
    'Esta es una sala que parece una tumba egipcia. Hay una escalera ascendente al oeste.',
  'You are on the Frigid River in the vicinity of the Dam. The river flows quietly here. There is a landing on the west shore.':
    'Estás en el río Frigid, en las inmediaciones de la presa. El río fluye con calma aquí. Hay un embarcadero en la orilla oeste.',
  'The river turns a corner here making it impossible to see the Dam. The White Cliffs loom on the east bank and large rocks prevent landing on the west.':
    'El río hace aquí un recodo que impide ver la presa. Los Acantilados Blancos se alzan en la ribera este y grandes rocas impiden atracar en la oeste.',
  'The river descends here into a valley. There is a narrow beach on the west shore below the cliffs. In the distance a faint rumbling can be heard.':
    'El río desciende aquí a un valle. Hay una playa estrecha en la orilla oeste, al pie de los acantilados. A lo lejos se oye un débil retumbar.',
  'The river is running faster here and the sound ahead appears to be that of rushing water. On the east shore is a sandy beach. A small area of beach can also be seen below the cliffs on the west shore.':
    'El río corre más rápido aquí y el sonido de delante parece el de aguas turbulentas. En la orilla este hay una playa de arena. También se ve un pequeño trozo de playa al pie de los acantilados, en la orilla oeste.',
  'You are on a large sandy beach on the east shore of the river, which is flowing quickly by. A path runs beside the river to the south here, and a passage is partially buried in sand to the northeast.':
    'Estás en una gran playa de arena en la orilla este del río, que corre rápido junto a ti. Aquí un sendero bordea el río hacia el sur, y un pasadizo medio enterrado en la arena se abre hacia el noreste.',
  'This is a sand-filled cave whose exit is to the southwest.':
    'Esta es una gruta llena de arena cuya salida está al suroeste.',
  'You are on the east shore of the river. The water here seems somewhat treacherous. A path travels from north to south here, the south end quickly turning around a sharp corner.':
    'Estás en la orilla este del río. El agua aquí parece algo traicionera. Un sendero va de norte a sur, y su extremo sur desaparece pronto tras un recodo cerrado.',
  'You are at the top of Aragain Falls, an enormous waterfall with a drop of about 450 feet. The only path here is on the north end.':
    'Estás en lo alto de las cataratas Aragain, una enorme cascada con una caída de unos 450 pies. El único sendero está en el extremo norte.',
  'You are on top of a rainbow (I bet you never thought you would walk on a rainbow), with a magnificent view of the Falls. The rainbow travels east-west here.':
    'Estás en lo alto de un arcoíris (apuesto a que nunca pensaste que caminarías sobre un arcoíris), con una magnífica vista de las cataratas. El arcoíris se extiende aquí de este a oeste.',
  'You are on a small, rocky beach on the continuation of the Frigid River past the Falls. The beach is narrow due to the presence of the White Cliffs. The river canyon opens here and sunlight shines in from above. A rainbow crosses over the falls to the east and a narrow path continues to the southwest.':
    'Estás en una pequeña playa rocosa, en la prolongación del río Frigid pasadas las cataratas. La playa es estrecha debido a la presencia de los Acantilados Blancos. El cañón del río se abre aquí y la luz del sol entra desde arriba. Un arcoíris cruza por encima de las cataratas hacia el este y un sendero estrecho continúa hacia el suroeste.',
  'You are beneath the walls of the river canyon which may be climbable here. The lesser part of the runoff of Aragain Falls flows by below. To the north is a narrow path.':
    'Estás al pie de las paredes del cañón del río, que quizá sean escalables aquí. La menor parte del caudal de las cataratas Aragain fluye más abajo. Al norte hay un sendero estrecho.',
  'You are on a ledge about halfway up the wall of the river canyon. You can see from here that the main flow from Aragain Falls twists along a passage which it is impossible for you to enter. Below you is the canyon bottom. Above you is more cliff, which appears climbable.':
    'Estás en una repisa más o menos a media altura de la pared del cañón del río. Desde aquí ves que el caudal principal de las cataratas Aragain serpentea por un pasadizo en el que te es imposible entrar. Debajo de ti está el fondo del cañón. Por encima de ti continúa el acantilado, que parece escalable.',
  'You are at the top of the Great Canyon on its west wall. From here there is a marvelous view of the canyon and parts of the Frigid River upstream. Across the canyon, the walls of the White Cliffs join the mighty ramparts of the Flathead Mountains to the east. Following the Canyon upstream to the north, Aragain Falls may be seen, complete with rainbow. The mighty Frigid River flows out from a great dark cavern. To the west and south can be seen an immense forest, stretching for miles around. A path leads northwest. It is possible to climb down into the canyon from here.':
    'Estás en lo alto del Gran Cañón, en su pared oeste. Desde aquí, la vista del cañón y de parte del río Frigid aguas arriba es maravillosa. Al otro lado del cañón, las paredes de los Acantilados Blancos se unen al este con las poderosas murallas de las Montañas Flathead. Remontando el cañón hacia el norte, se divisan las cataratas Aragain, con su arcoíris incluido. El poderoso río Frigid brota de una gran caverna oscura. Al oeste y al sur se ve un bosque inmenso, que se extiende por millas a la redonda. Un sendero conduce al noroeste. Es posible bajar al cañón desde aquí.',
  'You are standing in front of a massive barrow of stone. In the east face is a huge stone door which is open. You cannot see into the dark of the tomb.':
    'Estás de pie ante un imponente túmulo de piedra. En la cara este hay una enorme puerta de piedra que está abierta. No alcanzas a ver nada en la oscuridad del sepulcro.',
  'As you enter the barrow, the door closes inexorably behind you. Around you it is dark, but ahead is an enormous cavern, brightly lit. Through its center runs a wide stream. Spanning the stream is a small wooden footbridge, and beyond a path leads into a dark tunnel. Above the bridge, floating in the air, is a large sign. It reads: All ye who stand before this bridge have completed a great and perilous adventure which has tested your wit and courage. You have mastered the first part of the ZORK trilogy. Those who pass over this bridge must be prepared to undertake an even greater adventure that will severely test your skill and bravery!':
    'Al entrar en el túmulo, la puerta se cierra inexorablemente tras de ti. A tu alrededor reina la oscuridad, pero delante se abre una enorme caverna, brillantemente iluminada. Por su centro corre un ancho arroyo. Lo cruza una pequeña pasarela de madera, y más allá un sendero conduce a un túnel oscuro. Sobre la pasarela, flotando en el aire, hay un gran letrero. Dice: Todos los que os halláis ante este puente habéis completado una grande y peligrosa aventura que ha puesto a prueba vuestro ingenio y vuestro valor. Habéis dominado la primera parte de la trilogía ZORK. ¡Quienes crucen este puente han de estar preparados para emprender una aventura aún mayor, que pondrá a dura prueba vuestra destreza y vuestra bravura!',

  // ════════════════════════════════════════════════════════════════════════
  // OFF-PATH INVENTORY (Task 17). Lines the walkthrough never hit.
  // ════════════════════════════════════════════════════════════════════════

  // ── Off-path room & object titles ──────────────────────────────────────
  'Damp Cave': 'Gruta húmeda',
  'Frigid River': 'Río Frigid',
  "ZORK owner's manual": 'manual del propietario',
  'Stream View': 'Vista del arroyo',
  Stream: 'Arroyo',
  'Twisting Passage': 'Pasaje serpenteante',
  Chasm: 'Abismo',
  'Winding Passage': 'Pasaje sinuoso',
  'White Cliffs Beach': 'Playa de los Acantilados Blancos',
  'Grating Room': 'Sala de la reja',
  Studio: 'Estudio',
  'Commandment #12592': 'Mandamiento n.º 12592',

  // ── Composed full-line pins ────────────────────────────────────────────
  'Oh, no! A lurking grue slithered into the room and devoured you!':
    '¡Oh, no! ¡Un grue al acecho se deslizó dentro de la sala y te devoró!',
  'Your load is too heavy.': 'Tu carga es demasiado pesada.',
  'Your load is too heavy, especially in light of your condition.':
    'Tu carga es demasiado pesada, sobre todo dado tu estado.',
  'The room looks strange and unearthly.':
    'La sala tiene un aspecto extraño y sobrenatural.',
  'The room looks strange and unearthly and objects appear indistinct.':
    'La sala tiene un aspecto extraño y sobrenatural y los objetos parecen difusos.',
  'This gives you the rank of Wizard.': 'Esto te otorga el rango de Hechicero.',
  'This gives you the rank of Master.': 'Esto te otorga el rango de Maestro.',
  'This gives you the rank of Adventurer.':
    'Esto te otorga el rango de Aventurero.',
  'This gives you the rank of Junior Adventurer.':
    'Esto te otorga el rango de Aventurero Júnior.',
  'This gives you the rank of Novice Adventurer.':
    'Esto te otorga el rango de Aventurero Novato.',
  'This gives you the rank of Amateur Adventurer.':
    'Esto te otorga el rango de Aventurero Aficionado.',
  'This gives you the rank of Beginner.':
    'Esto te otorga el rango de Principiante.',

  // ── Composed full-line pins (V-DIAGNOSE etc.) ──────────────────────────
  'You can expect death soon.': 'Puedes esperar la muerte pronto.',
  'You can be killed by one more light wound.':
    'Una herida leve más puede matarte.',
  'You can be killed by a serious wound.': 'Una herida grave puede matarte.',
  'You can survive one serious wound.': 'Puedes sobrevivir a una herida grave.',
  'You can survive several wounds.': 'Puedes sobrevivir a varias heridas.',
  'You have been killed once.': 'Has muerto una vez.',
  'You have been killed twice.': 'Has muerto dos veces.',
  'The thief swings it out of your reach.':
    'El ladrón lo lanza fuera de tu alcance.',
  "The stiletto seems white-hot. You can't hold on to it.":
    'El estilete parece al rojo vivo. No puedes sujetarlo.',
  'The lamp is on.': 'La lámpara está encendida.',
  'The lamp is turned off.': 'La lámpara está apagada.',
  'The lamp has burned out.': 'La lámpara se ha agotado.',
  'The candles are already lit.': 'Las velas ya están encendidas.',
  'The candles are burning.': 'Las velas arden.',
  'The candles are out.': 'Las velas están apagadas.',
  'The chimney leads upward, and looks climbable.':
    'La chimenea sube, y parece escalable.',
  'The chimney leads downward, and looks climbable.':
    'La chimenea baja, y parece escalable.',
  'The lights within the room shut off.': 'Las luces de la sala se apagan.',
  'The lights within the room come on.': 'Las luces de la sala se encienden.',
  'The rug is too heavy to lift.':
    'La alfombra es demasiado pesada para levantarla.',
  'The rug is too heavy to lift, but in trying to take it you have noticed an irregularity beneath it.':
    'La alfombra es demasiado pesada para levantarla, pero al intentar cogerla has notado una irregularidad debajo.',
  'The water level here is now up to your ankles.':
    'El agua te llega ahora a los tobillos.',
  'The water level here is now up to your shin.':
    'El agua te llega ahora a la espinilla.',
  'The water level here is now up to your knees.':
    'El agua te llega ahora a las rodillas.',
  'The water level here is now up to your hips.':
    'El agua te llega ahora a las caderas.',
  'The water level here is now up to your waist.':
    'El agua te llega ahora a la cintura.',
  'The water level here is now up to your chest.':
    'El agua te llega ahora al pecho.',
  'The water level here is now up to your neck.':
    'El agua te llega ahora al cuello.',
  'The water level here is now over your head.':
    'El agua te pasa ahora por encima de la cabeza.',
  'The water level here is now high in your lungs.':
    'El agua llena ahora tus pulmones.',
  "Swimming isn't usually allowed in the dungeon.":
    'Por lo general no se permite nadar en el calabozo.',
  'You are on the river, or have you forgotten?':
    '¿Estás en el río, o lo has olvidado?',
  'You are on the reservoir, or have you forgotten?':
    '¿Estás en el embalse, o lo has olvidado?',
  'You are on the stream, or have you forgotten?':
    '¿Estás en el arroyo, o lo has olvidado?',
  'There are lots of coins in there.': 'Ahí dentro hay un montón de monedas.',
  'There are lots of jewels in there.': 'Ahí dentro hay un montón de joyas.',
  "The coins are safely inside; there's no need to do that.":
    'Las monedas están a salvo dentro; no hace falta hacer eso.',
  "The jewels are safely inside; there's no need to do that.":
    'Las joyas están a salvo dentro; no hace falta hacer eso.',
  'You can see a clear area leading towards a forest.':
    'Distingues una zona despejada que conduce hacia un bosque.',
  'You can see what appears to be a kitchen.':
    'Distingues lo que parece ser una cocina.',

  // ── Off-path lines, in story-file extraction order ─────────────────────
  'Nice view, lousy place to jump.': 'Bonita vista, pésimo sitio para saltar.',
  'This boat is guaranteed against all defects for a period of 76 milliseconds from date of purchase or until first used, whichever comes first.':
    'Este bote está garantizado contra todo defecto por un período de 76 milisegundos a partir de la fecha de compra o hasta el primer uso, lo que ocurra primero.',
  'Warning:': 'Advertencia:',
  'This boat is made of thin plastic.':
    'Este bote está hecho de plástico fino.',
  'Good Luck!': '¡Buena suerte!',
  'The cyclops prefers eating to making conversation.':
    'El cíclope prefiere comer antes que dar conversación.',
  'The construction of FCD#3 took 112 days from ground breaking to the dedication. It required a work force of 384 slaves, 34 slave drivers, 12 engineers, 2 turtle doves, and a partridge in a pear tree. The work was managed by a command team composed of 2345 bureaucrats, 2347 secretaries (at least two of whom could type), 12,256 paper shufflers, 52,469 rubber stampers, 245,193 red tape processors, and nearly one million dead trees.':
    'La construcción de la PCC n.º 3 llevó 112 días, desde la primera palada hasta la inauguración. Requirió una mano de obra de 384 esclavos, 34 capataces de esclavos, 12 ingenieros, 2 tórtolas y una perdiz en un peral. Las obras fueron dirigidas por un equipo de mando compuesto por 2345 burócratas, 2347 secretarias (al menos dos de las cuales sabían mecanografiar), 12 256 barajadores de papeles, 52 469 estampadores de sellos, 245 193 procesadores de papeleo y casi un millón de árboles muertos.',
  'We will now point out some of the more interesting features of FCD#3 as we conduct you on a guided tour of the facilities:':
    'Ahora le señalaremos algunos de los aspectos más interesantes de la PCC n.º 3 mientras le guiamos en un recorrido por las instalaciones:',
  '"Flood Control Dam #3': '"Presa de Control de Crecidas n.º 3',
  '1) You start your tour here in the Dam Lobby. You will notice on your right that....':
    '1) Comienzas tu recorrido aquí, en el Vestíbulo de la presa. Notarás, a tu derecha, que....',
  'Hello, Sailor!': '¡Hola, marinero!',
  'Instructions for use:': 'Instrucciones de uso:',
  'To get into a body of water, say "Launch".':
    'Para entrar en una masa de agua, di «Launch».',
  'To get to shore, say "Land" or the direction in which you want to maneuver the boat.':
    'Para llegar a la orilla, di «Land» o la dirección en la que quieres maniobrar el bote.',
  'Warranty:': 'Garantía:',
  'Surely, thy eye shall be put out with a sharp stick!':
    '¡En verdad, tu ojo será reventado con un palo afilado!',
  // This verse ends on "and": the sentence runs onto the next display line
  // ("Unto the land of the dead…"). It must be pinned as its own line because
  // the runtime matcher sees each display line separately (UAT finding).
  'Even unto the ends of the earth shalt thou wander and':
    'Hasta los confines de la tierra habrás de vagar, y',
  'Unto the land of the dead shalt thou be sent at last.':
    'Al reino de los muertos serás enviado al fin.',
  'Surely thou shalt repent of thy cunning.':
    'En verdad te arrepentirás de tu astucia.',
  'The ground is too hard for digging here.':
    'El suelo es demasiado duro para cavar aquí.',
  'There is a suspicious-looking individual, holding a bag, leaning against one wall. He is armed with a vicious-looking stiletto.':
    'Un individuo de aspecto sospechoso, que sostiene una bolsa, está apoyado contra una pared. Va armado con un estilete de aspecto temible.',
  'You should say whether you want to go up or down.':
    'Deberías indicar si quieres subir o bajar.',
  'There is a suspicious-looking individual lying unconscious on the ground.':
    'Hay un individuo de aspecto sospechoso tendido inconsciente en el suelo.',
  "The door won't budge.": 'La puerta no se mueve.',
  'The candles are becoming quite short.':
    'Las velas se están quedando bastante cortas.',
  'You must perform the ceremony.': 'Debes celebrar la ceremonia.',
  'You are on a narrow strip of beach which runs along the base of the White Cliffs. There is a narrow path heading south along the Cliffs and a tight passage leading west into the cliffs themselves.':
    'Estás en una estrecha franja de playa que corre al pie de los Acantilados Blancos. Hay un sendero estrecho que va hacia el sur a lo largo de los Acantilados y un angosto pasadizo que se interna hacia el oeste en los propios acantilados.',
  'You tumble down the slide....': 'Ruedas tobogán abajo...',
  'This has no effect.': 'Esto no tiene ningún efecto.',
  "It's really not clear how.": 'No está nada claro cómo.',
  'You cannot climb any higher.': 'No puedes trepar más alto.',
  "You can't tie anything to yourself.": 'No puedes atarte nada a ti mismo.',
  'You cannot fit through this passage with that load.':
    'No cabes por este pasadizo con esa carga.',
  'What a loony!': '¡Qué chiflado!',
  'This cannot be tied, so it cannot be untied!':
    '¡Esto no puede atarse, así que no puede desatarse!',
  'You cannot go down without fracturing many bones.':
    'No podrías bajar sin fracturarte un buen número de huesos.',
  'A hot pepper sandwich is here.': 'Hay aquí un sándwich de guindilla.',
  '(Close cover before striking)': '(Cierra la cubierta antes de encender)',
  'YOU too can make BIG MONEY in the exciting field of PAPER SHUFFLING!':
    '¡TÚ también puedes GANAR MUCHO DINERO en el apasionante campo del BARAJADO DE PAPELES!',
  'Mr. Anderson of Muddle, Mass. says: "Before I took this course I was a lowly bit twiddler. Now with what I learned at GUE Tech I feel really important and can obfuscate and confuse with the best."':
    'El Sr. Anderson, de Muddle, Mass., dice: «Antes de hacer este curso no era más que un humilde manipulador de bits. Ahora, con lo que aprendí en GUE Tech, me siento muy importante y sé ofuscar y confundir con los mejores».',
  'Dr. Blank had this to say: "Ten short days ago all I could look forward to was a dead-end job as a doctor. Now I have a promising future and make really big Zorkmids."':
    'El Dr. Blank declaró: «Hace apenas diez días, lo único que me esperaba era un empleo sin salida como médico. Ahora tengo un futuro prometedor y gano muchísimos zorkmids».',
  "GUE Tech can't promise these fantastic results to everyone. But when you earn your degree from GUE Tech, your future will be brighter.":
    'GUE Tech no puede prometer estos fantásticos resultados a todo el mundo. Pero cuando consigas tu título de GUE Tech, tu futuro será más brillante.',
  'You cannot reach the rope.': 'No puedes alcanzar la cuerda.',
  'Storm-tossed trees block your way.':
    'Árboles derribados por la tormenta te cierran el paso.',
  'In the trophy case is an ancient parchment which appears to be a map.':
    'En la vitrina hay un pergamino antiguo que parece ser un mapa.',
  'The map shows a forest with three clearings. The largest clearing contains a house. Three paths leave the large clearing. One of these paths, leading southwest, is marked "To Stone Barrow".':
    'El mapa muestra un bosque con tres claros. El claro más grande contiene una casa. Tres senderos salen del gran claro. Uno de ellos, hacia el suroeste, lleva la inscripción «Hacia el Túmulo de Piedra».',
  'It is too narrow for most insects.':
    'Es demasiado estrecho para la mayoría de los insectos.',
  'This cave has exits to the west and east, and narrows to a crack toward the south. The earth is particularly damp here.':
    'Esta gruta tiene salidas al oeste y al este, y se estrecha hasta una grieta hacia el sur. La tierra está particularmente húmeda aquí.',
  'Only Santa Claus climbs down chimneys.':
    'Solo Papá Noel baja por las chimeneas.',
  'The forest becomes impenetrable to the north.':
    'El bosque se vuelve impenetrable hacia el norte.',
  'There is no tree here suitable for climbing.':
    'No hay aquí ningún árbol apto para trepar.',
  'You try to ascend the ramp, but it is impossible, and you slide back down.':
    'Intentas subir la rampa, pero es imposible, y resbalas de vuelta abajo.',
  'The White Cliffs prevent your landing here.':
    'Los Acantilados Blancos te impiden atracar aquí.',
  'You cannot go upstream due to strong currents.':
    'No puedes ir aguas arriba debido a las fuertes corrientes.',
  'Some invisible force prevents you from passing through the gate.':
    'Una fuerza invisible te impide cruzar la verja.',
  'Loosely attached to a wall is a small piece of paper.':
    'Sujeto sin mucho esmero a una pared hay un pequeño trozo de papel.',
  'Congratulations!': '¡Enhorabuena!',
  'You are the privileged owner of ZORK I: The Great Underground Empire, a self-contained and self-maintaining universe. If used and maintained in accordance with normal operating practices for small universes, ZORK will provide many months of trouble-free operation.':
    'Eres el afortunado propietario de ZORK I: El Gran Imperio Subterráneo, un universo autónomo que se mantiene a sí mismo. Usado y mantenido conforme a las prácticas normales de explotación de los universos pequeños, ZORK te ofrecerá muchos meses de funcionamiento sin problemas.',
  "It's a long way...": 'Hay un buen trecho hasta abajo...',
  'The troll neatly removes your head.':
    'El trol te quita la cabeza limpiamente.',
  'Fweep!': '¡Fuiii!',
  'The sound of rushing water is nearly unbearable here. On the east shore is a large landing area.':
    'El sonido de las aguas turbulentas es casi insoportable aquí. En la orilla este hay una gran zona de embarque.',
  "The door is boarded and you can't remove the boards.":
    'La puerta está tapiada y no puedes quitar las tablas.',
  'The stream emerges from a spot too small for you to enter.':
    'El arroyo brota de un orificio demasiado pequeño para que entres.',
  'You are standing on a path beside a gently flowing stream. The path follows the stream, which flows from west to east.':
    'Estás de pie en un sendero junto a un arroyo de corriente suave. El sendero sigue el arroyo, que fluye de oeste a este.',
  'The prayer is inscribed in an ancient script, rarely used today. It seems to be a philippic against small insects, absent-mindedness, and the picking up and dropping of small objects. The final verse consigns trespassers to the land of the dead. All evidence indicates that the beliefs of the ancient Zorkers were obscure.':
    'La oración está inscrita en una escritura antigua, hoy rara vez usada. Parece ser una filípica contra los insectos pequeños, los despistes y la manía de coger y soltar objetos pequeños. El último verso condena a los intrusos al reino de los muertos. Todo indica que las creencias de los antiguos zorkianos eran oscuras.',
  'The door is nailed shut.': 'La puerta está clavada.',
  'Getting tired?': '¿Te cansas?',
  'A small leaflet is on the ground.': 'Hay un pequeño folleto en el suelo.',
  '"WELCOME TO ZORK!': '«¡BIENVENIDO A ZORK!',
  'ZORK is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals. No computer should be without one!"':
    'ZORK es un juego de aventura, peligro y baja astucia. En él explorarás algunos de los territorios más asombrosos jamás contemplados por mortales. ¡Ningún ordenador debería carecer de uno!».',
  'The east wall is solid rock.': 'La pared este es de roca maciza.',
  "The cyclops doesn't look like he'll let you past.":
    'El cíclope no tiene pinta de que vaya a dejarte pasar.',
  'There is a golden clockwork canary nestled in the egg. It has ruby eyes and a silver beak. Through a crystal window below its left wing you can see intricate machinery inside. It appears to have wound down.':
    'En el huevo está anidado un canario mecánico dorado. Tiene ojos de rubí y pico de plata. A través de una ventanilla de cristal bajo su ala izquierda se ve una maquinaria intrincada en su interior. Parece habérsele acabado la cuerda.',
  'The engravings were incised in the living rock of the cave wall by an unknown hand. They depict, in symbolic form, the beliefs of the ancient Zorkers. Skillfully interwoven with the bas reliefs are excerpts illustrating the major religious tenets of that time. Unfortunately, a later age seems to have considered them blasphemous and just as skillfully excised them.':
    'Los grabados fueron tallados en la roca viva de la pared de la gruta por una mano desconocida. Representan, de forma simbólica, las creencias de los antiguos zorkianos. Hábilmente entrelazados con los bajorrelieves hay fragmentos que ilustran los principales preceptos religiosos de aquella época. Por desgracia, una época posterior parece haberlos considerado blasfemos y los excisó con la misma habilidad.',
  'The channel is too narrow.': 'El canal es demasiado estrecho.',
  'You are on the gently flowing stream. The upstream route is too narrow to navigate, and the downstream route is invisible due to twisting walls. There is a narrow beach to land on.':
    'Estás en el arroyo de corriente suave. La ruta aguas arriba es demasiado estrecha para navegar, y la ruta aguas abajo es invisible por las paredes serpenteantes. Hay una playa estrecha donde atracar.',
  'Climbing the walls is to no avail.': 'Escalar las paredes no sirve de nada.',
  'You would need a machete to go further west.':
    'Necesitarías un machete para seguir hacia el oeste.',
  'A painting by a neglected genius is here.':
    'Hay aquí un cuadro de un genio olvidado.',
  'The dam blocks your way.': 'La presa te cierra el paso.',
  'Nobody seems to be awaiting your answer.':
    'Nadie parece estar esperando tu respuesta.',
  "You're nuts!": '¡Estás chiflado!',
  'As the knife approaches its victim, your mind is submerged by an overmastering will. Slowly, your hand turns, until the rusty blade is an inch from your neck. The knife seems to sing as it savagely slits your throat.':
    'Cuando el cuchillo se acerca a su víctima, tu mente queda sumergida por una voluntad arrolladora. Lentamente, tu mano gira, hasta que la hoja oxidada queda a una pulgada de tu cuello. El cuchillo parece cantar mientras te degüella salvajemente.',
  'The engravings translate to "This space intentionally left blank."':
    'Los grabados significan «Este espacio se ha dejado en blanco a propósito».',
  'This is a winding passage. It seems that there are only exits on the east and north.':
    'Este es un pasaje sinuoso. Parece que solo hay salidas al este y al norte.',
  'A look before leaping reveals that the river is wide and dangerous, with swift currents and large, half-hidden rocks. You decide to forgo your swim.':
    'Una mirada antes de saltar te revela que el río es ancho y peligroso, con corrientes rápidas y grandes rocas medio ocultas. Decides renunciar a tu baño.',
  'Are you out of your mind?': '¿Has perdido la cabeza?',
  'A chasm runs southwest to northeast and the path follows it. You are on the south side of the chasm, where a crack opens into a passage.':
    'Un abismo corre del suroeste al noreste y el sendero lo bordea. Estás en el lado sur del abismo, donde una grieta se abre a un pasadizo.',
  "Sounds reasonable, but this isn't how.":
    'Suena razonable, pero no es así como se hace.',
  'There is a somewhat ruined egg here.': 'Hay aquí un huevo algo maltrecho.',
  'The rank undergrowth prevents eastward movement.':
    'La densa maleza impide avanzar hacia el este.',
  'You would drown.': 'Te ahogarías.',
  'The troll fends you off with a menacing gesture.':
    'El trol te repele con un gesto amenazador.',
  "You haven't a prayer of getting the coffin down there.":
    'No tienes la menor posibilidad de bajar el ataúd por ahí.',
  'The windows are all boarded.': 'Las ventanas están todas tapiadas.',
  'You probably put spinach in your gas tank, too.':
    'Probablemente también echas espinacas en el depósito de gasolina.',
  'There is nothing but dust there.': 'Ahí no hay más que polvo.',
  'You have come to a dead end in the maze.':
    'Has llegado a un callejón sin salida en el laberinto.',
  'There is a golden clockwork canary nestled in the egg. It seems to have recently had a bad experience. The mountings for its jewel-like eyes are empty, and its silver beak is crumpled. Through a cracked crystal window below its left wing you can see the remains of intricate machinery. It is not clear what result winding it would have, as the mainspring seems sprung.':
    'En el huevo está anidado un canario mecánico dorado. Parece haber sufrido hace poco una mala experiencia. Las monturas de sus ojos de joya están vacías, y su pico de plata está abollado. A través de una ventanilla de cristal agrietada bajo su ala izquierda se ven los restos de una maquinaria intrincada. No está claro qué resultaría de darle cuerda, pues el muelle principal parece reventado.',
  'On the ground is a pile of leaves.': 'En el suelo hay un montón de hojas.',
  "You can't even do that.": 'Ni siquiera puedes hacer eso.',
  'The path is too narrow.': 'El sendero es demasiado estrecho.',
  'You are on a rocky, narrow strip of beach beside the Cliffs. A narrow path leads north along the shore.':
    'Estás en una franja de playa rocosa y estrecha al pie de los Acantilados. Un sendero estrecho va hacia el norte a lo largo de la orilla.',
  'The mountains are impassable.': 'Las montañas son infranqueables.',
  'The forest thins out, revealing impassable mountains.':
    'El bosque se aclara, revelando montañas infranqueables.',
  'How, exactly, can you ring that?':
    '¿Cómo, exactamente, piensas hacer sonar eso?',
  'Just in time you steer away from the rocks.':
    'Justo a tiempo, esquivas las rocas.',
  'There is no safe landing spot here.':
    'No hay aquí ningún sitio seguro para atracar.',
  'Nothing happens.': 'No pasa nada.',
  'You can land either to the east or the west.':
    'Puedes atracar al este o al oeste.',
  'There is an enormous diamond (perfectly cut) here.':
    'Hay aquí un enorme diamante (perfectamente tallado).',
  'A hungry cyclops is standing at the foot of the stairs.':
    'Un cíclope hambriento está de pie al pie de la escalera.',
  'Oh ye who go about saying unto each: "Hello sailor":':
    'Oh, vosotros que vais diciendo a cada cual: «Hola, marinero»:',
  'Dost thou know the magnitude of thy sin before the gods?':
    '¿Conoces la magnitud de tu pecado ante los dioses?',
  'Yea, verily, thou shalt be ground between two stones.':
    'Sí, en verdad, serás molido entre dos piedras.',
  'Shall the angry gods cast thy body into the whirlpool?':
    '¿Arrojarán los dioses iracundos tu cuerpo al remolino?',
  'An ornamented sceptre, tapering to a sharp point, is here.':
    'Hay aquí un cetro ornamentado, que se afila hasta una punta aguda.',
  "This appears to have been an artist's studio. The walls and floors are splattered with paints of 69 different colors. Strangely enough, nothing of value is hanging here. At the south end of the room is an open door (also covered with paint). A dark and narrow chimney leads up from a fireplace; although you might be able to get up it, it seems unlikely you could get back down.":
    'Esto parece haber sido el estudio de un artista. Las paredes y los suelos están salpicados de pinturas de 69 colores diferentes. Curiosamente, no hay nada de valor colgado aquí. En el extremo sur de la sala hay una puerta abierta (también cubierta de pintura). Una chimenea oscura y estrecha sube desde un hogar; aunque quizá pudieras subir por ella, parece poco probable que pudieras volver a bajar.',
  'There is an old trunk here, bulging with assorted jewels.':
    'Hay aquí un viejo baúl, rebosante de joyas variadas.',
  'The chests are all empty.': 'Las cajas están todas vacías.',
  "You wouldn't fit and would die if you could.":
    'No cabrías, y morirías si cupieras.',
  'The chasm probably leads straight to the infernal regions.':
    'El abismo probablemente lleva derecho a las regiones infernales.',
  'You should have looked before you leaped.':
    'Deberías haber mirado antes de saltar.',
  'In the movies, your life would be passing before your eyes.':
    'En las películas, tu vida desfilaría ante tus ojos.',
  'Geronimo...': 'Gerónimo...',
  'Very good. Now you can go to the second grade.':
    'Muy bien. Ahora puedes pasar a segundo curso.',
  'Are you enjoying yourself?': '¿Te estás divirtiendo?',
  'Do you expect me to applaud?': '¿Esperas que aplauda?',
  "You can't swim in the dungeon.": 'No se puede nadar en el calabozo.',
  'Hello.': 'Hola.',
  'Good day.': 'Buenos días.',
  "Nice weather we've been having lately.":
    'Buen tiempo el que hemos tenido últimamente, ¿verdad?',
  'Goodbye.': 'Adiós.',
  'A valiant attempt.': 'Un valiente intento.',
  "You can't be serious.": 'No puedes hablar en serio.',
  'An interesting idea...': 'Una idea interesante...',
  'What a concept!': '¡Vaya concepto!',
  'Look around.': 'Mira a tu alrededor.',
  'Too late for that.': 'Demasiado tarde para eso.',
  'Have your eyes checked.': 'Hazte revisar la vista.',
  'With the leaves moved, a grating is revealed.':
    'Apartadas las hojas, queda al descubierto una reja.',
  'A shimmering pot of gold appears at the end of the rainbow.':
    'Una reluciente olla de oro aparece al final del arcoíris.',
  'The lamp has smashed into the floor, and the light has gone out.':
    'La lámpara se ha estrellado contra el suelo, y la luz se ha apagado.',
  'You look before leaping, and realize that you would never survive.':
    'Miras antes de saltar, y te das cuenta de que jamás sobrevivirías.',
  'A sound, like that of flowing water, starts to come from below.':
    'Un sonido, como el de agua que fluye, empieza a llegar desde abajo.',
  'You can\'t launch that by saying "launch"!':
    '¡No puedes botar eso diciendo «launch»!',
  'Sorry, my memory is poor. Please give a direction.':
    'Lo siento, mi memoria es mala. Por favor, indica una dirección.',
  "The candles won't last long now.": 'A las velas ya no les queda mucho.',
  "Your bare hands don't appear to be enough.":
    'Tus manos desnudas no parecen ser suficientes.',
  "I'd sooner kiss a pig.": 'Antes besaría a un cerdo.',
  'How can you inflate that?': '¿Cómo piensas inflar eso?',
  "Why don't you just walk like normal people?":
    '¿Por qué no caminas sin más, como la gente normal?',
  'The incantation echoes back faintly, but nothing else happens.':
    'El conjuro devuelve un débil eco, pero no ocurre nada más.',
  'You will be lost without me!': '¡Estarás perdido sin mí!',
  'Bizarre!': '¡Estrafalario!',
  "You can't fit through the crack.": 'No cabes por la grieta.',
  'There is no granite wall here.': 'Aquí no hay ningún muro de granito.',
  'The bat grabs you by the scruff of your neck and lifts you away....':
    'El murciélago te agarra por el pescuezo y te lleva por los aires...',
  'The trophy case is securely fastened to the wall.':
    'La vitrina está firmemente sujeta a la pared.',
  "Nobody's home.": 'No hay nadie en casa.',
  'The mirror is broken into many pieces.':
    'El espejo está roto en mil pedazos.',
  "I suppose you think it's a magic carpet?":
    'Supongo que lo tomas por una alfombra mágica, ¿no?',
  'You are on the lake. Beaches can be seen north and south. Upstream a small stream enters the lake through a narrow cleft in the rocks. The dam can be seen downstream.':
    'Estás en el lago. Se ven playas al norte y al sur. Aguas arriba, un pequeño arroyo entra en el lago por una estrecha hendidura en las rocas. Se ve la presa aguas abajo.',
  'The cyclops seems somewhat agitated.': 'El cíclope parece algo agitado.',
  'The cyclops appears to be getting more agitated.':
    'El cíclope parece estar cada vez más agitado.',
  'The cyclops is moving about the room, looking for something.':
    'El cíclope recorre la sala, buscando algo.',
  'The cyclops was looking for salt and pepper. No doubt they are condiments for his upcoming snack.':
    'El cíclope buscaba sal y pimienta. Sin duda son condimentos para su próximo refrigerio.',
  'The cyclops is moving toward you in an unfriendly manner.':
    'El cíclope avanza hacia ti de una manera poco amistosa.',
  'You have two choices: 1. Leave 2. Become dinner.':
    'Tienes dos opciones: 1. Marcharte 2. Convertirte en la cena.',
  'The lamp is definitely dimmer now.':
    'La lámpara es claramente más débil ahora.',
  'The lamp is nearly out.': 'La lámpara está casi agotada.',
  'The candles grow shorter.': 'Las velas se acortan.',
  'Your stroke lands, but it was only the flat of the blade.':
    'Tu golpe acierta, pero fue solo con el plano de la hoja.',
  'You must be joking.': 'Estarás de broma.',
  'Slash! Your blow lands! That one hit an artery, it could be serious!':
    '¡Zas! ¡Tu golpe acierta! ¡Ese ha dado en una arteria, podría ser grave!',
  'Slash! Your stroke connects! This could be serious!':
    '¡Zas! ¡Tu golpe acierta! ¡Esto podría ser grave!',
  'The Cyclops misses, but the backwash almost knocks you over.':
    'El Cíclope falla, pero el desplazamiento de aire casi te derriba.',
  'The Cyclops rushes you, but runs into the wall.':
    'El Cíclope se lanza sobre ti, pero se estrella contra la pared.',
  'The Cyclops sends you crashing to the floor, unconscious.':
    'El Cíclope te manda al suelo, inconsciente.',
  'The Cyclops breaks your neck with a massive smash.':
    'El Cíclope te rompe el cuello de un golpe descomunal.',
  'A quick punch, but it was only a glancing blow.':
    'Un puñetazo rápido, pero fue solo un golpe de refilón.',
  "A glancing blow from the Cyclops' fist.":
    'Un golpe de refilón del puño del Cíclope.',
  'The monster smashes his huge fist into your chest, breaking several ribs.':
    'El monstruo descarga su enorme puño sobre tu pecho, rompiéndote varias costillas.',
  'The Cyclops almost knocks the wind out of you with a quick punch.':
    'El Cíclope casi te deja sin aire de un puñetazo rápido.',
  'The Cyclops lands a punch that knocks the wind out of you.':
    'El Cíclope acierta un puñetazo que te deja sin aliento.',
  'Heedless of your weapons, the Cyclops tosses you against the rock wall of the room.':
    'Sin reparar en tus armas, el Cíclope te arroja contra la pared rocosa de la sala.',
  'The Cyclops seems unable to decide whether to broil or stew his dinner.':
    'El Cíclope parece incapaz de decidir si asar o guisar su cena.',
  'The Cyclops, no sportsman, dispatches his unconscious victim.':
    'El Cíclope, nada deportivo, remata a su víctima inconsciente.',
  'The axe sweeps past as you jump aside.':
    'El hacha pasa rozando mientras saltas a un lado.',
  'The axe crashes against the rock, throwing sparks!':
    '¡El hacha se estrella contra la roca, arrojando chispas!',
  "The flat of the troll's axe hits you delicately on the head, knocking you out.":
    'El plano del hacha del trol te golpea delicadamente en la cabeza, dejándote inconsciente.',
  "The troll's axe stroke cleaves you from the nave to the chops.":
    'El hachazo del trol te parte del ombligo a la barbilla.',
  "The troll's axe removes your head.": 'El hacha del trol te quita la cabeza.',
  'The axe gets you right in the side. Ouch!':
    'El hacha te alcanza de lleno en el costado. ¡Ay!',
  "The flat of the troll's axe skins across your forearm.":
    'El plano del hacha del trol te despelleja el antebrazo.',
  "The troll's swing almost knocks you over as you barely parry in time.":
    'El mandoble del trol casi te derriba mientras paras de milagro a tiempo.',
  'The troll swings his axe, and it nicks your arm as you dodge.':
    'El trol descarga su hacha, que te roza el brazo mientras esquivas.',
  'An axe stroke makes a deep wound in your leg.':
    'Un hachazo te hace una herida profunda en la pierna.',
  "The troll's axe swings down, gashing your shoulder.":
    'El hacha del trol se abate, abriéndote un tajo en el hombro.',
  'The troll hits you with a glancing blow, and you are momentarily stunned.':
    'El trol te golpea de refilón, y quedas momentáneamente aturdido.',
  'The troll swings; the blade turns on your armor but crashes broadside into your head.':
    'El trol golpea; la hoja resbala en tu armadura pero se estrella de lleno contra tu cabeza.',
  'You stagger back under a hail of axe strokes.':
    'Retrocedes tambaleándote bajo una lluvia de hachazos.',
  'The troll hesitates, fingering his axe.':
    'El trol vacila, palpando su hacha.',
  'The troll scratches his head ruminatively: Might you be magically protected, he wonders?':
    'El trol se rasca la cabeza pensativo: ¿estarás acaso protegido por magia?, se pregunta.',
  'Conquering his fears, the troll puts you to death.':
    'Venciendo sus miedos, el trol te da muerte.',
  'The thief stabs nonchalantly with his stiletto and misses.':
    'El ladrón apuñala con desgana con su estilete y falla.',
  'You parry a lightning thrust, and the thief salutes you with a grim nod.':
    'Paras una estocada fulminante, y el ladrón te saluda con un sombrío gesto de la cabeza.',
  'The thief tries to sneak past your guard, but you twist away.':
    'El ladrón intenta colarse por tu guardia, pero te escabulles con un quiebro.',
  'Shifting in the midst of a thrust, the thief knocks you unconscious with the haft of his stiletto.':
    'Cambiando de blanco en plena estocada, el ladrón te deja inconsciente con el mango de su estilete.',
  'The thief knocks you out.': 'El ladrón te deja sin sentido.',
  'Finishing you off, the thief inserts his blade into your heart.':
    'Para rematarte, el ladrón te hunde la hoja en el corazón.',
  'The thief comes in from the side, feints, and inserts the blade into your ribs.':
    'El ladrón llega por el costado, finta, y te hunde la hoja entre las costillas.',
  'The thief bows formally, raises his stiletto, and with a wry grin, ends the battle and your life.':
    'El ladrón hace una reverencia ceremoniosa, levanta su estilete y, con una sonrisa torcida, pone fin al combate y a tu vida.',
  'A quick thrust pinks your left arm, and blood starts to trickle down.':
    'Una estocada rápida te pincha el brazo izquierdo, y la sangre empieza a chorrear.',
  'The thief draws blood, raking his stiletto across your arm.':
    'El ladrón hace correr la sangre, raspándote el brazo con su estilete.',
  'The thief slowly approaches, strikes like a snake, and leaves you wounded.':
    'El ladrón se acerca lentamente, ataca como una serpiente, y te deja herido.',
  'The thief strikes like a snake! The resulting wound is serious.':
    '¡El ladrón ataca como una serpiente! La herida resultante es grave.',
  'The thief stabs a deep cut in your upper arm.':
    'El ladrón te abre un corte profundo en la parte alta del brazo.',
  'The stiletto touches your forehead, and the blood obscures your vision.':
    'El estilete te roza la frente, y la sangre te nubla la vista.',
  'The thief strikes at your wrist, and suddenly your grip is slippery with blood.':
    'El ladrón ataca tu muñeca, y de pronto tu agarre resbala, pegajoso de sangre.',
  'The songbird is not here but is probably nearby.':
    'El pájaro cantor no está aquí, pero probablemente anda cerca.',
  'The butt of his stiletto cracks you on the skull, and you stagger back.':
    'El pomo de su estilete te golpea el cráneo, y retrocedes tambaleándote.',
  'The thief rams the haft of his blade into your stomach, leaving you out of breath.':
    'El ladrón te clava el mango de su hoja en el estómago, dejándote sin aliento.',
  'The thief attacks, and you fall back desperately.':
    'El ladrón ataca, y retrocedes desesperadamente.',
  'The thief, a man of superior breeding, pauses for a moment to consider the propriety of finishing you off.':
    'El ladrón, hombre de crianza superior, hace una pausa para considerar la conveniencia de rematarte.',
  'The thief amuses himself by searching your pockets.':
    'El ladrón se divierte registrándote los bolsillos.',
  'The thief entertains himself by rifling your pack.':
    'El ladrón se entretiene hurgando en tu zurrón.',
  'The thief, forgetting his essentially genteel upbringing, cuts your throat.':
    'El ladrón, olvidando su crianza esencialmente distinguida, te degüella.',
  'The thief, a pragmatist, dispatches you as a threat to his livelihood.':
    'El ladrón, pragmático, te elimina como una amenaza para su sustento.',
  "You're not at the house.": 'No estás en la casa.',
  'That hiding place is too obvious.': 'Ese escondite es demasiado obvio.',
  "You didn't say with what!": '¡No has dicho con qué!',
  'Your image in the mirror looks tired.':
    'Tu imagen en el espejo parece cansada.',
  "If you insist.... Poof, you're dead!": 'Si insistes... ¡Puf, estás muerto!',
  'The water cools the bell and is evaporated.':
    'El agua enfría la campana y se evapora.',
  'It is an integral part of the control panel.':
    'Forma parte integral del panel de control.',
  'You nearly burn your hand trying to extinguish the flame.':
    'Casi te quemas la mano al intentar apagar la llama.',
  'You have it.': 'Lo tienes.',
  'The sluice gates are closed. The water level in the reservoir is quite low, but the level is rising quickly.':
    'Las compuertas están cerradas. El nivel del agua en el embalse es bastante bajo, pero sube rápidamente.',
  'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been extremely wealthy.':
    'La casa es una hermosa casa colonial pintada de blanco. Está claro que sus dueños debieron de ser sumamente ricos.',
  'Failed.': 'Fallido.',
  'You cannot talk to that!': '¡No puedes hablar con eso!',
  'Some paint chips away, revealing more paint.':
    'Se desprenden unas escamas de pintura, revelando más pintura.',
  "You can't do that.": 'No puedes hacer eso.',
  'No chance. Some moron punctured it.': 'Imposible. Algún imbécil lo pinchó.',
  'A force keeps you from taking the bodies.':
    'Una fuerza te impide coger los cuerpos.',
  'The water level has dropped to the point at which the boat can no longer stay afloat. It sinks into the mud.':
    'El nivel del agua ha bajado hasta el punto en que el bote ya no puede mantenerse a flote. Se hunde en el barro.',
  "The windows are boarded and can't be opened.":
    'Las ventanas están tapiadas y no pueden abrirse.',
  "You can't pick that.": 'No puedes forzar eso.',
  'The viscous material oozes into your hand.':
    'La materia viscosa rezuma en tu mano.',
  'There is nothing to fill it with.': 'No hay nada con que llenarla.',
  'Oh, no! You have walked into the slavering fangs of a lurking grue!':
    '¡Oh, no! ¡Has caminado directo hacia los babeantes colmillos de un grue al acecho!',
  "You'll have to do that on your own.":
    'Eso tendrás que hacerlo por tu cuenta.',
  'The voice of the guardian of the dungeon booms out from the darkness, "Your disrespect costs you your life!" and places your head on a sharp pole.':
    'La voz del guardián del calabozo retumba desde la oscuridad: «¡Tu falta de respeto te cuesta la vida!», y clava tu cabeza en una pica afilada.',
  "You have broken the mirror. I hope you have a seven years' supply of good luck handy.":
    'Has roto el espejo. Espero que tengas siete años de buena suerte a mano.',
  'Well, you seem to have been brushing your teeth with some sort of glue. As a result, your mouth gets glued together (with your nose) and you die of respiratory failure.':
    'Vaya, parece que te has estado cepillando los dientes con una especie de pegamento. Como resultado, se te pega la boca (junto con la nariz) y mueres de insuficiencia respiratoria.',
  "Those things aren't here!": '¡Esas cosas no están aquí!',
  "You can't spin that!": '¡No puedes hacer girar eso!',
  'FCD#3 was constructed in year 783 of the Great Underground Empire to harness the mighty Frigid River. This work was supported by a grant of 37 million zorkmids from your omnipotent local tyrant Lord Dimwit Flathead the Excessive. This impressive structure is composed of 370,000 cubic feet of concrete, is 256 feet tall at the center, and 193 feet wide at the top. The lake created behind the dam has a volume of 1.7 billion cubic feet, an area of 12 million square feet, and a shore line of 36 thousand feet.':
    'La PCC n.º 3 fue construida en el año 783 del Gran Imperio Subterráneo para domar el poderoso río Frigid. Esta obra fue financiada con una subvención de 37 millones de zorkmids de tu omnipotente tirano local, Lord Dimwit Flathead el Excesivo. Esta impresionante estructura se compone de 370 000 pies cúbicos de hormigón, mide 256 pies de alto en el centro y 193 pies de ancho en lo alto. El lago creado tras la presa tiene un volumen de 1700 millones de pies cúbicos, una superficie de 12 millones de pies cuadrados y una orilla de 36 mil pies.',
  'The water level behind the dam is low: The sluice gates have been opened. Water rushes through the dam and downstream.':
    'El nivel del agua tras la presa es bajo: las compuertas han sido abiertas. El agua se precipita a través de la presa y aguas abajo.',
  "You can't push things to that.": 'No puedes empujar cosas hacia eso.',
  'The window closes (more easily than it opened).':
    'La ventana se cierra (con más facilidad de la que se abrió).',
  'The bell is very hot and cannot be taken.':
    'La campana está muy caliente y no puede cogerse.',
  'The door swings shut and closes.': 'La puerta gira y se cierra.',
  "It's too dark to see!": '¡Está demasiado oscuro para ver!',
  'A troll is here.': 'Hay un trol aquí.',
  'The book is already open to page 569.':
    'El libro ya está abierto por la página 569.',
  'A pathetically babbling troll is here.':
    'Hay aquí un trol que balbucea patéticamente.',
  'An unconscious troll is sprawled on the floor. All passages out of the room are open.':
    'Un trol inconsciente está despatarrado en el suelo. Todas las salidas de la sala están abiertas.',
  'You cannot close that.': 'No puedes cerrar eso.',
  'The leaves burn, and so do you.': 'Las hojas arden, y tú también.',
  'The west wall is solid granite here.':
    'La pared oeste es aquí de granito macizo.',
  'The grating opens to reveal trees above you.':
    'La reja se abre y revela árboles por encima de ti.',
  "It's in the bottle. Perhaps you should take that instead.":
    'Está en la botella. Quizá deberías coger esta, mejor.',
  "I'm afraid that the leap you attempted has done you in.":
    'Me temo que el salto que intentaste ha acabado contigo.',
  'Hanging down from the railing is a rope which ends about ten feet from the floor below.':
    'De la barandilla cuelga una cuerda que termina a unos diez pies del suelo de abajo.',
  "It's really dark in here....": 'Está muy oscuro aquí dentro...',
  'How can you drink that?': '¿Cómo piensas beber eso?',
  'You are lifted up by the rising river! You try to swim, but the currents are too strong. You come closer, closer to the awesome structure of Flood Control Dam #3. The dam beckons to you. The roar of the water nearly deafens you, but you remain conscious as you tumble over the dam toward your certain doom among the rocks at its base.':
    '¡La crecida del río te alza! Intentas nadar, pero las corrientes son demasiado fuertes. Te acercas, cada vez más, a la imponente estructura de la Presa de Control de Crecidas n.º 3. La presa te llama. El rugido del agua casi te ensordece, pero permaneces consciente mientras caes por encima de la presa hacia tu perdición segura entre las rocas de su base.',
  'The room is full of water and cannot be entered.':
    'La sala está llena de agua y no se puede entrar.',
  "I'm afraid you have done drowned yourself.":
    'Me temo que has ido y te has ahogado.',
  'The rising water carries the boat over the dam, down the river, and over the falls. Tsk, tsk.':
    'La subida del agua arrastra el bote por encima de la presa, río abajo y por encima de las cataratas. Tsk, tsk.',
  'In other words, fighting the fierce currents of the Frigid River. You manage to hold your own for a bit, but then you are carried over a waterfall and into some nasty rocks. Ouch!':
    'Dicho de otro modo, luchando contra las feroces corrientes del río Frigid. Aguantas un rato, pero luego te arrastra por encima de una cascada y contra unas rocas muy desagradables. ¡Ay!',
  'The bell is too hot to touch.':
    'La campana está demasiado caliente para tocarla.',
  'You could certainly never tie it with that!':
    '¡Desde luego jamás podrías atarla con eso!',
  'Above you is a grating.': 'Por encima de ti hay una reja.',
  'The cyclops, tired of all of your games and trickery, grabs you firmly. As he licks his chops, he says "Mmm. Just like Mom used to make \'em." It\'s nice to be appreciated.':
    'El cíclope, harto de todos tus juegos y trucos, te agarra con firmeza. Mientras se relame, dice: «Mmm. Justo como los hacía mamá». Da gusto sentirse apreciado.',
  'It could very well be too late!': '¡Bien podría ser demasiado tarde!',
  'Talking to yourself is said to be a sign of impending mental collapse.':
    'Hablar solo es, según dicen, señal de un inminente colapso mental.',
  'The spirits jeer loudly and ignore you.':
    'Los espíritus se burlan a voces y te ignoran.',
  'The bell is too hot to reach.':
    'La campana está demasiado caliente para alcanzarla.',
  'A booming voice says "Wrong, cretin!" and you notice that you have turned into a pile of dust. How, I can\'t imagine.':
    'Una voz atronadora dice «¡Error, cretino!» y notas que te has convertido en un montón de polvo. Cómo, no me lo imagino.',
  'There is a worthless piece of canvas here.':
    'Hay aquí un trozo de lienzo sin valor.',
  'Aaaarrrrgggghhhh!': '¡Aaaarrrrgggghhhh!',
  "That's silly!": '¡Qué tontería!',
  'The structural integrity of the rainbow is severely compromised, leaving you hanging in midair, supported only by water vapor. Bye.':
    'La integridad estructural del arcoíris queda gravemente comprometida, dejándote suspendido en el aire, sostenido únicamente por vapor de agua. Adiós.',
  'Shaken.': 'Sacudido.',
  'You splash around for a while, fighting the current, then you drown.':
    'Chapoteas un rato, luchando contra la corriente, y luego te ahogas.',
  'The tube refuses to accept anything.': 'El tubo se niega a aceptar nada.',
  "Unfortunately, the magic boat doesn't provide protection from the rocks and boulders one meets at the bottom of waterfalls. Including this one.":
    'Por desgracia, el bote mágico no protege de las rocas y los peñascos que uno encuentra al pie de las cascadas. Incluida esta.',
  'Another pathetic sputter, this time from you, heralds your drowning.':
    'Otro patético resoplido, esta vez tuyo, anuncia que te ahogas.',
  "It's solid granite.": 'Es granito macizo.',
  'The hole collapses, smothering you.': 'El hoyo se derrumba, asfixiándote.',
  'That was just a bit too far down.': 'Eso estaba un poco demasiado abajo.',
  'I beg your pardon?': '¿Cómo dice?',
  'Do you wish to restart? (Y is affirmative):':
    '¿Quieres reiniciar? (S para sí):',
  'Well, you really did it that time. Is suicide painless?':
    'Bien, esta vez sí que la has hecho buena. ¿Es indoloro el suicidio?',
  "It appears that that last blow was too much for you. I'm afraid you are dead.":
    'Parece que ese último golpe fue demasiado para ti. Me temo que estás muerto.',
  "You can't talk to the sailor that way.": 'No se le habla así al marinero.',
  'The water slips through your fingers.':
    'El agua se te escurre entre los dedos.',
  'The FROBOZZ Corporation created, owns, and operates this dungeon.':
    'La Corporación FROBOZZ creó este calabozo; es su propietaria y lo explota.',
  'Naturally!': '¡Naturalmente!',
  'The pines and the hemlocks seem to be murmuring.':
    'Los pinos y los abetos parecen murmurar.',
  'You can hear the sound of flowing water from below.':
    'Oyes el rumor de agua que fluye desde abajo.',
  'All of a sudden, an alarmingly loud roaring sound fills the room. Filled with fear, you scramble away.':
    'De repente, un rugido de una intensidad alarmante llena la sala. Lleno de miedo, sales corriendo.',
  'It makes no sound but is always lurking in the darkness nearby.':
    'No hace ningún ruido pero siempre acecha en la oscuridad cercana.',
  'The disk is correct.': 'El disco es correcto.',
  '** Disk Failure **': '** Fallo de disco **',
  'Beats me.': 'Ni idea.',
  'How peculiar!': '¡Qué peculiar!',
  "You're inside of it!": '¡Estás dentro!',
  'The door cannot be opened.': 'La puerta no puede abrirse.',
  'It is far too large to carry.': 'Es demasiado grande para llevarlo.',
  'The grating is closed!': '¡La reja está cerrada!',
  "You can't go that way.": 'No puedes ir por ahí.',
  'There is no sailor to be seen.': 'No se ve a ningún marinero.',
  'You seem to be repeating yourself.': 'Parece que te repites.',
  'I think that phrase is getting a bit worn out.':
    'Creo que esa frase empieza a estar un poco gastada.',
  'Nothing happens here.': 'Aquí no pasa nada.',
  'The grue is a sinister, lurking presence in the dark places of the earth. Its favorite diet is adventurers, but its insatiable appetite is tempered by its fear of light. No grue has ever been seen by the light of day, and few have survived its fearsome jaws to tell the tale.':
    'El grue es una presencia siniestra que acecha en los lugares oscuros de la tierra. Su dieta favorita son los aventureros, pero su apetito insaciable se ve atemperado por su miedo a la luz. Ningún grue ha sido visto jamás a la luz del día, y pocos han sobrevivido a sus temibles fauces para contarlo.',
  "There is no grue here, but I'm sure there is at least one lurking in the darkness nearby. I wouldn't let my light go out if I were you!":
    'Aquí no hay ningún grue, pero estoy seguro de que hay al menos uno acechando en la oscuridad cercana. ¡Yo que tú no dejaría que se apagara mi luz!',
  'Only you can do that.': 'Solo tú puedes hacer eso.',
  'Auto-cannibalism is not the answer.':
    'El autocanibalismo no es la solución.',
  'Suicide is not the answer.': 'El suicidio no es la solución.',
  'How romantic!': '¡Qué romántico!',
  "That's difficult unless your eyes are prehensile.":
    'Eso es difícil, a menos que tengas los ojos prensiles.',
  'You must specify a direction to go.':
    'Debes indicar una dirección hacia la que ir.',
  "I can't help you there....": 'Ahí no puedo ayudarte...',
  'Not a chance.': 'Ni hablar.',
  'The zorkmid is the unit of currency of the Great Underground Empire.':
    'El zorkmid es la unidad monetaria del Gran Imperio Subterráneo.',
  'The best way to find zorkmids is to go out and look for them.':
    'La mejor manera de encontrar zorkmids es salir a buscarlos.',
  "It's too dark to see.": 'Está demasiado oscuro para ver.',
  "It's not clear what you're referring to.":
    'No está claro a qué te refieres.',
  "There's nothing here you can take.": 'Aquí no hay nada que puedas coger.',
  "I don't see what you are referring to.": 'No veo a qué te refieres.',
  "I can't help your clumsiness.": 'No puedo hacer nada por tu torpeza.',
  "Sorry, you can't correct mistakes in quoted text.":
    'Lo siento, no se pueden corregir errores en un texto entrecomillado.',
  'Warning: only the first word after OOPS is used.':
    'Aviso: solo se tiene en cuenta la primera palabra después de OOPS.',
  'There was no word to replace!': '¡No había ninguna palabra que reemplazar!',
  'Beg pardon?': '¿Cómo dice?',
  "It's difficult to repeat fragments.": 'Es difícil repetir fragmentos.',
  'That would just repeat a mistake.': 'Eso no haría más que repetir un error.',
  "I couldn't understand that sentence.": 'No he podido entender esa frase.',
  'There were too many nouns in that sentence.':
    'Había demasiados sustantivos en esa frase.',
  'Please consult your manual for the correct way to talk to other people or creatures.':
    'Por favor, consulta tu manual para saber cómo dirigirte correctamente a otras personas o criaturas.',
  'There was no verb in that sentence!': '¡No había ningún verbo en esa frase!',
  "That sentence isn't one I recognize.":
    'Esa frase no es de las que reconozco.',
  "That question can't be answered.": 'A esa pregunta no se puede responder.',
  '"I don\'t understand! What are you referring to?"':
    '«¡No lo entiendo! ¿A qué te refieres?»',
  'There seems to be a noun missing in that sentence!':
    '¡Parece faltar un sustantivo en esa frase!',
  "I don't see what you're referring to.": 'No veo a qué te refieres.',
  "You don't have that!": '¡No tienes eso!',
  'Maximum verbosity.': 'Verbosidad máxima.',
  'Brief descriptions.': 'Descripciones breves.',
  'Superbrief descriptions.': 'Descripciones ultrabreves.',
  'You are empty-handed.': 'Estás con las manos vacías.',
  'Do you wish to leave the game? (Y is affirmative):':
    '¿Quieres salir de la partida? (S para sí):',
  'Restarting.': 'Reiniciando.',
  'Verifying disk...': 'Verificando el disco...',
  'Illegal call to #RND.': 'Llamada ilegal a #RND.',
  'A hollow voice says "Fool."': 'Una voz cavernosa dice «Necio».',
  "He's wide awake, or haven't you noticed...":
    'Está bien despierto, ¿o no te has dado cuenta?...',
  "You can't blast anything by using words.":
    'No harás explotar nada a base de palabras.',
  'If you wish, but heaven only knows why.':
    'Si quieres, pero solo el cielo sabe por qué.',
  'Bug? Not in a flawless program like this! (Cough, cough).':
    '¿Un fallo? ¡No en un programa tan impecable como este! (Cof, cof).',
  'Preposterous!': '¡Absurdo!',
  'There are no climbable trees here.':
    'Aquí no hay árboles que puedan escalarse.',
  "You can't do that!": '¡No puedes hacer eso!',
  'It is already closed.': 'Ya está cerrado.',
  'Well, for one, you are playing Zork...':
    'Bueno, para empezar, estás jugando a Zork...',
  'You have lost your mind.': 'Has perdido la cabeza.',
  "You can't cross that!": '¡No puedes cruzar eso!',
  "Insults of this nature won't help you.":
    'Los insultos de esta clase no te van a ayudar.',
  'Such language in a high-class establishment like this!':
    '¡Semejante lenguaje en un establecimiento tan distinguido como este!',
  "Not a bright idea, especially since you're in it.":
    'No es una idea brillante, sobre todo porque estás dentro.',
  'Come on, now!': '¡Vamos, hombre!',
  "There's no reason to be digging here.":
    'No hay ninguna razón para cavar aquí.',
  "You're not in that!": '¡No estás dentro de eso!',
  'You realize that getting out here would be fatal.':
    'Te das cuenta de que salir aquí sería fatal.',
  "You're not holding that.": 'No estás sosteniendo eso.',
  'Thank you very much. It really hit the spot.':
    'Muchas gracias. Me ha sentado de maravilla.',
  "There isn't any water here.": 'Aquí no hay nada de agua.',
  'Thank you very much. I was rather thirsty (from all this talking, probably).':
    'Muchas gracias. Tenía bastante sed (de tanto hablar, probablemente).',
  'You are left in the dark...': 'Te quedas a oscuras...',
  'What a bizarre concept!': '¡Qué concepto tan estrafalario!',
  "There's nothing to fill it with.": 'No hay nada con que llenarlo.',
  "You may know how to do that, but I don't.":
    'Tú quizá sepas cómo hacer eso, pero yo no.',
  "Within six feet of your head, assuming you haven't left that somewhere.":
    'A menos de seis pies de tu cabeza, suponiendo que no la hayas dejado en alguna parte.',
  "You're around here somewhere...": 'Andas por aquí, en alguna parte...',
  'You find it.': 'Lo encuentras.',
  "It's right here.": 'Está justo aquí.',
  'It is already off.': 'Ya está apagado.',
  "You can't turn that off.": 'No puedes apagar eso.',
  'It is already on.': 'Ya está encendido.',
  "You can't turn that on.": 'No puedes encender eso.',
  "That's pretty weird.": 'Eso es bastante raro.',
  'That would be a good trick.': 'Eso sería un buen truco.',
  'This was not a very safe place to try jumping.':
    'Este no era un lugar muy seguro para intentar saltar.',
  'In a feat of unaccustomed daring, you manage to land on your feet without killing yourself.':
    'En una hazaña de inusitada audacia, logras caer de pie sin matarte.',
  "It doesn't seem to work.": 'No parece funcionar.',
  'There is nothing special to be seen.': 'No hay nada especial que ver.',
  "You aren't an accomplished enough juggler.":
    'No eres un malabarista lo bastante consumado.',
  "You'll have to speak up if you expect me to hear you!":
    '¡Tendrás que hablar más alto si quieres que te oiga!',
  'Nice try.': 'Buen intento.',
  "Wasn't he a sailor?": '¿No era marinero?',
  'It is already open.': 'Ya está abierto.',
  "You're not in anything!": '¡No estás dentro de nada!',
  'Huh?': '¿Eh?',
  "You can't pour that.": 'No puedes verter eso.',
  'If you pray enough, your prayers may be answered.':
    'Si rezas lo suficiente, tus oraciones quizá sean atendidas.',
  'How can you do that?': '¿Cómo piensas hacer eso?',
  "There's no room.": 'No hay sitio.',
  'What a (ahem!) strange idea.': 'Qué idea más (¡ejem!) extraña.',
  'It is impossible to read in the dark.': 'Es imposible leer a oscuras.',
  'Say what?': '¿Cómo dices?',
  'Talking to yourself is a sign of impending mental collapse.':
    'Hablar solo es señal de un inminente colapso mental.',
  'You find nothing unusual.': 'No encuentras nada fuera de lo común.',
  "That doesn't make sends.": 'Eso no tiene ningún envío.',
  'Foo!': '¡Bah!',
  'This seems to have no effect.': 'Esto no parece tener ningún efecto.',
  "You can't take it; thus, you can't shake it!":
    'No puedes cogerlo; por lo tanto, ¡no puedes sacudirlo!',
  'How singularly useless.': 'Qué singularmente inútil.',
  'You are already standing, I think.': 'Ya estás de pie, creo.',
  'Go jump in a lake!': '¡Vete a freír espárragos!',
  'Whoosh!': '¡Fiu!',
  'You are already wearing it.': 'Ya lo llevas puesto.',
  'You already have that!': '¡Ya tienes eso!',
  "You can't reach something that's inside a closed container.":
    'No puedes alcanzar algo que está dentro de un recipiente cerrado.',
  'That would involve quite a contortion!':
    '¡Eso requeriría toda una contorsión!',
  'Thrown.': 'Lanzado.',
  "You can't throw anything off of that!":
    '¡No puedes lanzar nada desde lo alto de eso!',
  "You can't turn that!": '¡No puedes girar eso!',
  'Time passes...': 'El tiempo pasa...',
  'There are odd noises in the darkness, and there is no exit in that direction.':
    'Hay ruidos extraños en la oscuridad, y no hay salida en esa dirección.',
  'Use compass directions for movement.':
    'Usa los puntos cardinales para desplazarte.',
  "It's here!": '¡Está aquí!',
  'You should supply a direction!': '¡Deberías indicar una dirección!',
  'With luck, your wish will come true.':
    'Con suerte, tu deseo se hará realidad.',
  'At your service!': '¡A tu servicio!',
  'You are likely to be eaten by a grue.':
    'Es muy probable que te devore un grue.',
  "Only bats can see in the dark. And you're not one.":
    'Solo los murciélagos ven en la oscuridad. Y tú no eres uno.',
  'You are carrying:': 'Llevas:',
  'Your hand passes through its object.': 'Tu mano atraviesa su objetivo.',
  "You're holding too many things already!": '¡Ya llevas demasiadas cosas!',
  "You can't go there without a vehicle.": 'No puedes ir allí sin un vehículo.',
  'There are sinister gurgling noises in the darkness all around you!':
    '¡Hay siniestros gorgoteos en la oscuridad por todas partes a tu alrededor!',
  'You have moved into a dark place.': 'Te has adentrado en un lugar oscuro.',
  'A secret path leads southwest into the forest.':
    'Un sendero secreto se interna hacia el suroeste en el bosque.',
  'The boards are securely fastened.': 'Las tablas están firmemente sujetas.',
  "Dental hygiene is highly recommended, but I'm not sure what you want to brush them with.":
    'La higiene dental es muy recomendable, pero no sé bien con qué quieres cepillártelos.',
  'The east wall is solid granite here.':
    'La pared este es aquí de granito macizo.',
  'It only SAYS "Granite Wall".': 'Solo PONE «Muro de Granito».',
  "The wall isn't granite.": 'La pared no es de granito.',
  "You can't hear the songbird now.":
    'No oyes al pájaro cantor en este momento.',
  "It can't be followed.": 'No se le puede seguir.',
  'Why not find your brains?': '¿Y si encontraras tu cerebro, mejor?',
  'It seems to be to the west.': 'Parece estar hacia el oeste.',
  'It was here just a minute ago....': 'Estaba aquí hace apenas un minuto...',
  "It's right here! Are you blind or something?":
    '¡Está justo aquí! ¿Estás ciego o qué?',
  'The window is closed.': 'La ventana está cerrada.',
  "I can't see how to get in from here.": 'No veo cómo entrar desde aquí.',
  "You aren't even in the forest.": 'Ni siquiera estás en el bosque.',
  'You will have to specify a direction.': 'Tendrás que indicar una dirección.',
  'You cannot see the forest for the trees.':
    'Los árboles no te dejan ver el bosque.',
  "Don't you believe me? The mountains are impassable!":
    '¿No me crees? ¡Las montañas son infranqueables!',
  'The bottle is closed.': 'La botella está cerrada.',
  'The bottle is now full of water.': 'La botella está ahora llena de agua.',
  'The water spills to the floor and evaporates immediately.':
    'El agua se derrama por el suelo y se evapora al instante.',
  'The water splashes on the walls and evaporates immediately.':
    'El agua salpica las paredes y se evapora al instante.',
  'The window is slightly ajar, but not enough to allow entry.':
    'La ventana está entreabierta, pero no lo bastante para poder entrar.',
  'Only the ceremony itself has any effect.':
    'Solo la ceremonia en sí tiene algún efecto.',
  'How can you attack a spirit with material objects?':
    '¿Cómo atacar a un espíritu con objetos materiales?',
  'You seem unable to interact with these spirits.':
    'Pareces incapaz de interactuar con estos espíritus.',
  'The basket is at the other end of the chain.':
    'La cesta está en el otro extremo de la cadena.',
  'The cage is securely fastened to the iron chain.':
    'La jaula está firmemente sujeta a la cadena de hierro.',
  "You can't reach him; he's on the ceiling.":
    'No puedes alcanzarlo; está en el techo.',
  'Ding, dong.': 'Din, don.',
  'The heat from the bell is too intense.':
    'El calor de la campana es demasiado intenso.',
  "You can't break the windows open.":
    'No puedes abrir las ventanas rompiéndolas.',
  'The nails, deeply imbedded in the door, cannot be removed.':
    'Los clavos, profundamente hundidos en la puerta, no pueden quitarse.',
  'There are no stairs leading down.': 'No hay ninguna escalera que baje.',
  'ZORK: The Great Underground Empire.': 'ZORK: El Gran Imperio Subterráneo.',
  'The door is too heavy.': 'La puerta es demasiado pesada.',
  'You see a rickety staircase descending into darkness.':
    'Ves una escalera desvencijada que desciende hacia la oscuridad.',
  "It's closed.": 'Está cerrado.',
  'The door is locked from above.':
    'La puerta está cerrada con llave desde arriba.',
  'The door closes and locks.': 'La puerta se cierra y se traba.',
  'Going up empty-handed is a bad idea.':
    'Subir con las manos vacías es una mala idea.',
  "You can't get up there with what you're carrying.":
    'No puedes subir ahí arriba con lo que llevas.',
  'Having moved the carpet previously, you find it impossible to move it again.':
    'Habiendo movido ya la alfombra antes, te resulta imposible moverla de nuevo.',
  'The rug is extremely heavy and cannot be carried.':
    'La alfombra es sumamente pesada y no puede transportarse.',
  'Underneath the rug is a closed trap door. As you drop the corner of the rug, the trap door is once again concealed from view.':
    'Bajo la alfombra hay una trampilla cerrada. Cuando sueltas la esquina de la alfombra, la trampilla vuelve a quedar oculta a la vista.',
  'As you sit, you notice an irregularity underneath it. Rather than be uncomfortable, you stand up again.':
    'Al sentarte, notas una irregularidad debajo. Antes que quedarte incómodo, te levantas de nuevo.',
  "The troll isn't much of a conversationalist.":
    'El trol no es muy conversador.',
  'The troll, angered and humiliated, recovers his weapon. He appears to have an axe to grind with you.':
    'El trol, furioso y humillado, recupera su arma. Parece tener cuentas pendientes contigo... a hachazos.',
  'The troll stirs, quickly resuming a fighting stance.':
    'El trol se remueve, recuperando rápidamente una postura de combate.',
  'The troll scratches his head in confusion, then takes the axe.':
    'El trol se rasca la cabeza, confundido, y luego coge el hacha.',
  'The troll spits in your face, grunting "Better luck next time" in a rather barbarous accent.':
    'El trol te escupe a la cara, gruñendo «Más suerte la próxima vez» con un acento más bien bárbaro.',
  'The troll laughs at your puny gesture.':
    'El trol se ríe de tu gesto insignificante.',
  'Every so often the troll says something, probably uncomplimentary, in his guttural tongue.':
    'De vez en cuando el trol dice algo, probablemente poco halagador, en su gutural lengua.',
  "Unfortunately, the troll can't hear you.":
    'Por desgracia, el trol no puede oírte.',
  'In disturbing the pile of leaves, a grating is revealed.':
    'Al remover el montón de hojas, queda al descubierto una reja.',
  'There are 69,105 leaves here.': 'Hay 69 105 hojas aquí.',
  'The leaves burn.': 'Las hojas arden.',
  'You rustle the leaves around, making quite a mess.':
    'Remueves las hojas de un lado a otro, armando un buen desbarajuste.',
  'Underneath the pile of leaves is a grating. As you release the leaves, the grating is once again concealed from view.':
    'Bajo el montón de hojas hay una reja. Cuando sueltas las hojas, la reja vuelve a quedar oculta a la vista.',
  'You are in a clearing, with a forest surrounding you on all sides. A path leads south.':
    'Estás en un claro, con un bosque que te rodea por todos lados. Un sendero conduce al sur.',
  'There is an open grating, descending into darkness.':
    'Hay una reja abierta, que desciende hacia la oscuridad.',
  'There is a grating securely fastened into the ground.':
    'Hay una reja firmemente sellada en el suelo.',
  'You are in a small room near the maze. There are twisty passages in the immediate vicinity.':
    'Estás en una pequeña sala cerca del laberinto. Hay pasadizos enrevesados en las inmediaciones.',
  'Above you is an open grating with sunlight pouring in.':
    'Por encima de ti hay una reja abierta por la que entra a raudales la luz del sol.',
  'Above you is a grating locked with a skull-and-crossbones lock.':
    'Por encima de ti hay una reja cerrada con un candado de calavera y tibias.',
  'The grate is locked.': 'La reja está cerrada con llave.',
  "You can't lock it from this side.":
    'No puedes cerrarla con llave desde este lado.',
  'The grate is unlocked.': 'La reja está abierta.',
  "You can't reach the lock from here.":
    'No puedes alcanzar el candado desde aquí.',
  "You can't pick the lock.": 'No puedes forzar el candado.',
  'A pile of leaves falls onto your head and to the ground.':
    'Un montón de hojas te cae sobre la cabeza y luego al suelo.',
  'The grating is locked.': 'La reja está cerrada con llave.',
  "It won't fit through the grating.": 'No pasará por la reja.',
  "You won't be able to get back up to the tunnel you are going through when it gets to the next room.":
    'No podrás volver a subir al túnel que recorres una vez que llegues a la sala siguiente.',
  'As you touch the rusty knife, your sword gives a single pulse of blinding blue light.':
    'En el momento en que tocas el cuchillo oxidado, tu espada emite un único destello de cegadora luz azul.',
  'A ghost appears in the room and is appalled at your desecration of the remains of a fellow adventurer. He casts a curse on your valuables and banishes them to the Land of the Living Dead. The ghost leaves, muttering obscenities.':
    'Un fantasma aparece en la sala y se horroriza al ver cómo profanas los restos de un compañero aventurero. Lanza una maldición sobre tus objetos de valor y los destierra al Reino de los Muertos Vivientes. El fantasma se marcha, mascullando obscenidades.',
  'The torch is burning.': 'La antorcha arde.',
  'The water evaporates before it gets close.':
    'El agua se evapora antes siquiera de acercarse.',
  'Unfortunately, the mirror has been destroyed by your recklessness.':
    'Por desgracia, el espejo ha sido destruido por tu imprudencia.',
  'There is an ugly person staring back at you.':
    'Hay una persona muy fea que te mira fijamente.',
  'The mirror is many times your size. Give up.':
    'El espejo es muchas veces tu tamaño. Ríndete.',
  "Haven't you done enough damage already?": '¿No has hecho ya bastante daño?',
  'As you enter the dome you feel a strong pull as if from a wind drawing you over the railing and down.':
    'Al entrar en la cúpula sientes un fuerte tirón, como de un viento que te arrastrara por encima de la barandilla, hacia abajo.',
  "You aren't equipped for an exorcism.":
    'No estás equipado para un exorcismo.',
  'The tension of this ceremony is broken, and the wraiths, amused but shaken at your clumsy attempt, resume their hideous jeering.':
    'La tensión de esta ceremonia se rompe, y los espectros, divertidos pero conmocionados por tu torpe intento, reanudan sus horrendas burlas.',
  'The bell appears to have cooled down.':
    'La campana parece haberse enfriado.',
  'The sluice gates are open, and water rushes through the dam. The water level behind the dam is still high.':
    'Las compuertas están abiertas, y el agua se precipita a través de la presa. El nivel del agua tras la presa sigue siendo alto.',
  'The sluice gates close and water starts to collect behind the dam.':
    'Las compuertas se cierran y el agua empieza a acumularse tras la presa.',
  "The bolt won't turn with your best effort.":
    'El perno no quiere girar por más que te esfuerces.',
  "Hmm. It appears the tube contained glue, not oil. Turning the bolt won't get any easier....":
    'Hmm. Parece que el tubo contenía pegamento, no aceite. Girar el perno no va a resultar más fácil...',
  'The boat lifts gently out of the mud and is now floating on the reservoir.':
    'El bote se eleva suavemente del barro y ahora flota en el embalse.',
  'You notice that the water level has risen to the point that it is impossible to cross.':
    'Notas que el nivel del agua ha subido hasta el punto de que es imposible cruzar.',
  'The roar of rushing water is quieter now.':
    'El rugido de las aguas turbulentas es más tenue ahora.',
  'The water level is now quite low here and you could easily cross over to the other side.':
    'El nivel del agua es ahora bastante bajo aquí y podrías cruzar fácilmente al otro lado.',
  "They're greek to you.": 'Para ti, eso es chino.',
  'There is a rumbling sound and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe).':
    'Se oye un retumbar y un chorro de agua parece reventar de la pared este de la sala (al parecer, se ha producido una fuga en una tubería).',
  'The blue button appears to be jammed.': 'El botón azul parece atascado.',
  'The chests are so rusty and corroded that they crumble when you touch them.':
    'Las cajas están tan oxidadas y corroídas que se deshacen cuando las tocas.',
  'The chests are already open.': 'Las cajas ya están abiertas.',
  'By some miracle of Zorkian technology, you have managed to stop the leak in the dam.':
    'Por algún milagro de la tecnología zorkiana, has logrado detener la fuga de la presa.',
  "The all-purpose gunk isn't a lubricant.":
    'La pasta multiusos no es un lubricante.',
  'The tube is apparently empty.': 'El tubo está aparentemente vacío.',
  // Tube label, printed across two display lines on READ/EXAMINE (UAT F7).
  '---> Frobozz Magic Gunk Company <---':
    '---> Compañía Frobozz de Pasta Mágica <---',
  'All-Purpose Gunk': 'Pasta multiusos',
  'Are you the little Dutch boy, then? Sorry, this is a big dam.':
    '¿Eres el niño holandés, entonces? Lo siento, esta es una gran presa.',
  'You are in a long room. To the north is a large lake, too deep to cross. You notice, however, that the water level appears to be dropping at a rapid rate. Before long, it might be possible to cross to the other side from here.':
    'Estás en una sala alargada. Al norte hay un gran lago, demasiado profundo para cruzarlo. Notas, sin embargo, que el nivel del agua parece bajar a buen ritmo. Dentro de poco, quizá sea posible cruzar al otro lado desde aquí.',
  'You are in a long room, to the north of which is a wide area which was formerly a reservoir, but now is merely a stream. You notice, however, that the level of the stream is rising quickly and that before long it will be impossible to cross here.':
    'Estás en una sala alargada, al norte de la cual hay una amplia zona que fue un embalse, pero ahora no es más que un arroyo. Notas, sin embargo, que el nivel del arroyo sube rápidamente y que dentro de poco será imposible cruzar aquí.',
  'You notice that the water level here is rising rapidly. The currents are also becoming stronger. Staying here seems quite perilous!':
    'Notas que el nivel del agua sube aquí rápidamente. Las corrientes también se vuelven más fuertes. ¡Quedarse aquí parece bastante peligroso!',
  'You are in a large cavernous area. To the south is a wide lake, whose water level appears to be falling rapidly.':
    'Estás en una gran zona cavernosa. Al sur hay un ancho lago, cuyo nivel de agua parece bajar rápidamente.',
  'You are in a cavernous area, to the south of which is a very wide stream. The level of the stream is rising rapidly, and it appears that before long it will be impossible to cross to the other side.':
    'Estás en una zona cavernosa, al sur de la cual corre un arroyo muy ancho. El nivel del arroyo sube rápidamente, y parece que dentro de poco será imposible cruzar al otro lado.',
  'You are in a large cavernous room, north of a large lake.':
    'Estás en una gran sala cavernosa, al norte de un gran lago.',
  'The bottle hits the far wall and shatters.':
    'La botella choca contra la pared del fondo y se hace añicos.',
  'A brilliant maneuver destroys the bottle.':
    'Una brillante maniobra destruye la botella.',
  'The water spills to the floor and evaporates.':
    'El agua se derrama por el suelo y se evapora.',
  "No use talking to him. He's fast asleep.":
    'Inútil hablarle. Está profundamente dormido.',
  'The cyclops is sleeping like a baby, albeit a very ugly one.':
    'El cíclope duerme como un bebé, aunque uno muy feo.',
  'The cyclops yawns and stares at the thing that woke him up.':
    'El cíclope bosteza y se queda mirando lo que lo despertó.',
  'The cyclops says "Mmm Mmm. I love hot peppers! But oh, could I use a drink. Perhaps I could drink the blood of that thing." From the gleam in his eye, it could be surmised that you are "that thing".':
    'El cíclope dice: «Mmm Mmm. ¡Me encantan las guindillas! Pero ay, qué bien me vendría algo de beber. Quizá podría beber la sangre de esa cosa». Por el brillo de su ojo, cabe suponer que «esa cosa» eres tú.',
  "The cyclops takes the bottle, checks that it's open, and drinks the water. A moment later, he lets out a yawn that nearly blows you over, and then falls fast asleep (what did you put in that drink, anyway?).":
    'El cíclope coge la botella, comprueba que está abierta y bebe el agua. Un momento después, suelta un bostezo que casi te derriba, y luego cae profundamente dormido (¿qué le habrás echado a esa bebida, en todo caso?).',
  'The cyclops apparently is not thirsty and refuses your generous offer.':
    'El cíclope al parecer no tiene sed y rechaza tu generoso ofrecimiento.',
  'The cyclops may be hungry, but there is a limit.':
    'El cíclope tendrá hambre, pero todo tiene un límite.',
  'The cyclops is not so stupid as to eat THAT!':
    '¡El cíclope no es tan estúpido como para comerse ESO!',
  '"Do you think I\'m as stupid as my father was?", he says, dodging.':
    '«¿Me crees tan estúpido como lo fue mi padre?», dice, esquivando.',
  'The cyclops shrugs but otherwise ignores your pitiful attempt.':
    'El cíclope se encoge de hombros pero por lo demás ignora tu lamentable intento.',
  "The cyclops doesn't take kindly to being grabbed.":
    'Al cíclope no le hace ninguna gracia que lo agarren.',
  'You cannot tie the cyclops, though he is fit to be tied.':
    'No puedes atar al cíclope, aunque está como para atarlo.',
  'You can hear his stomach rumbling.': 'Oyes su estómago rugiendo.',
  'The cyclops is sleeping blissfully at the foot of the stairs.':
    'El cíclope duerme plácidamente al pie de la escalera.',
  'The east wall, previously solid, now has a cyclops-sized opening in it.':
    'La pared este, antes maciza, presenta ahora una abertura del tamaño de un cíclope.',
  "The cyclops is standing in the corner, eyeing you closely. I don't think he likes you very much. He looks extremely hungry, even for a cyclops.":
    'El cíclope está de pie en el rincón, observándote de cerca. No creo que le caigas muy bien. Tiene un aspecto sumamente hambriento, incluso para un cíclope.',
  'The cyclops, having eaten the hot peppers, appears to be gasping. His enflamed tongue protrudes from his man-sized mouth.':
    'El cíclope, tras comerse las guindillas, parece estar jadeando. Su lengua inflamada le asoma por la boca del tamaño de un hombre.',
  'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward.':
    'Esta es una gran sala cuyo techo no se alcanza a distinguir desde el suelo. Hay un pasadizo estrecho de este a oeste y una escalera de piedra que sube.',
  'The room is eerie in its quietness.':
    'La sala resulta inquietante por su quietud.',
  'The room is deafeningly loud with an undetermined rushing sound. The sound seems to reverberate from all of the walls, making it difficult even to think.':
    'La sala es ensordecedora, llena de un rugido de origen indeterminado. El sonido parece reverberar en todas las paredes, hasta el punto de que cuesta incluso pensar.',
  "It is unbearably loud here, with an ear-splitting roar seeming to come from all around you. There is a pounding in your head which won't stop. With a tremendous effort, you scramble out of the room.":
    'El ruido es insoportable aquí: un rugido capaz de reventar los tímpanos parece venir de todas partes a la vez. Un martilleo te llena la cabeza sin querer parar. Con un esfuerzo tremendo, te escabulles de la sala.',
  'The rest of your commands have been lost in the noise.':
    'El resto de tus órdenes se ha perdido en el estruendo.',
  "That's only your opinion.": 'Eso es solo tu opinión.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down.':
    'Estás en el borde sur de un cañón profundo. Hay pasadizos hacia el este, el noroeste y el suroeste. Una escalera baja.',
  'You can hear a loud roaring sound, like that of rushing water, from below.':
    'Oyes un fuerte rugido, como el de aguas turbulentas, que viene de abajo.',
  'Your opponent, determining discretion to be the better part of valor, decides to terminate this little contretemps. With a rueful nod of his head, he steps backward into the gloom and disappears.':
    'Tu adversario, juzgando que la discreción es la mejor parte del valor, decide poner fin a este pequeño contratiempo. Con un cabeceo compungido, retrocede hacia la penumbra y desaparece.',
  'The holder of the large bag just left, looking disgusted. Fortunately, he took nothing.':
    'El portador de la bolsa grande acaba de marcharse, con cara de asco. Por suerte, no se llevó nada.',
  'The thief, finding nothing of value, left disgusted.':
    'El ladrón, al no encontrar nada de valor, se marchó asqueado.',
  'A "lean and hungry" gentleman just wandered through, carrying a large bag. Finding nothing of value, he left disgruntled.':
    'Un caballero «flaco y hambriento» acaba de pasar por aquí, cargando una bolsa grande. Al no encontrar nada de valor, se marchó disgustado.',
  'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from your possession, mumbling something about "Doing unto others before..."':
    'Un individuo de aspecto sospechoso con una bolsa grande acaba de cruzar la sala. De paso, te sustrajo discretamente algunos objetos de valor, farfullando algo sobre «hacer a los demás antes de...».',
  'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from the room, mumbling something about "Doing unto others before..."':
    'Un individuo de aspecto sospechoso con una bolsa grande acaba de cruzar la sala. De paso, sustrajo discretamente algunos objetos de valor que había en la sala, farfullando algo sobre «hacer a los demás antes de...».',
  'The thief seems to have left you in the dark.':
    'El ladrón parece haberte dejado a oscuras.',
  'The thief is a strong, silent type.':
    'El ladrón es del tipo fuerte y silencioso.',
  'The thief, being temporarily incapacitated, is unable to acknowledge your greeting with his usual graciousness.':
    'El ladrón, temporalmente incapacitado, no puede responder a tu saludo con su acostumbrada gentileza.',
  'You missed. The thief makes no attempt to take the knife, though it would be a fine addition to the collection in his bag. He does seem angered by your attempt.':
    'Fallaste. El ladrón no hace ademán de coger el cuchillo, aunque sería una buena pieza para la colección de su bolsa. Tu intento, eso sí, parece haberlo irritado.',
  'Your proposed victim suddenly recovers consciousness.':
    'La víctima que te proponías recobra de pronto el conocimiento.',
  'Once you got him, what would you do with him?':
    'Una vez que lo tuvieras, ¿qué harías con él?',
  "The thief is a slippery character with beady eyes that flit back and forth. He carries, along with an unmistakable arrogance, a large bag over his shoulder and a vicious stiletto, whose blade is aimed menacingly in your direction. I'd watch out if I were you.":
    'El ladrón es un personaje escurridizo, de ojillos vivaces que van de un lado a otro. Lleva, junto con una arrogancia inconfundible, una bolsa grande al hombro y un estilete temible, cuya hoja apunta amenazadoramente en tu dirección. Yo que tú andaría con ojo.',
  'The thief says nothing, as you have not been formally introduced.':
    'El ladrón no dice nada, pues no os han presentado formalmente.',
  'His booty remains.': 'Su botín se queda.',
  'The robber revives, briefly feigning continued unconsciousness, and, when he sees his moment, scrambles away from you.':
    'El ladrón vuelve en sí, finge un instante seguir inconsciente y, cuando ve su oportunidad, se escabulle lejos de ti.',
  'Sadly for you, the robber collapsed on top of the bag. Trying to take it would wake him.':
    'Por desgracia para ti, el ladrón se desplomó encima de la bolsa. Intentar cogerla lo despertaría.',
  'The bag will be taken over his dead body.':
    'Esa bolsa solo se la quitarán por encima de su cadáver.',
  'It would be a good trick.': 'Sería un buen truco.',
  'Getting close enough would be a good trick.':
    'Acercarse lo suficiente ya sería todo un truco.',
  "The bag is underneath the thief, so one can't say what, if anything, is inside.":
    'La bolsa está bajo el ladrón, así que no se puede decir qué hay dentro, si es que hay algo.',
  "You'd be stabbed in the back first.": 'Antes te apuñalarían por la espalda.',
  "You can't. It's not a very good chalice, is it?":
    'No puedes. No es un cáliz muy bueno, ¿verdad?',
  'You cannot burn this door.': 'No puedes quemar esta puerta.',
  "You can't seem to damage the door.": 'No pareces capaz de dañar la puerta.',
  "It won't open.": 'No se abre.',
  'As hard as you try, the book cannot be closed.':
    'Por más que lo intentes, el libro no puede cerrarse.',
  'Beside page 569, there is only one other page with any legible printing on it. Most of it is unreadable, but the subject seems to be the banishment of evil. Apparently, certain noises, lights, and prayers are efficacious in this regard.':
    'Aparte de la página 569, solo hay otra página con algo de impresión legible. La mayor parte es indescifrable, pero el tema parece ser el destierro del mal. Al parecer, ciertos ruidos, luces y oraciones son eficaces a este respecto.',
  "Congratulations! Unlike the other vandals, who merely stole the artist's masterpieces, you have destroyed one.":
    '¡Enhorabuena! A diferencia de los demás vándalos, que se limitaron a robar las obras maestras del artista, tú has destruido una.',
  "A burned-out lamp won't light.": 'Una lámpara agotada no se enciende.',
  'The lamp has already burned out.': 'La lámpara ya se ha agotado.',
  'It is securely anchored.': 'Está firmemente anclado.',
  "I'm afraid that you have run out of matches.":
    'Me temo que te has quedado sin cerillas.',
  'This room is drafty, and the match goes out instantly.':
    'Esta sala tiene corrientes de aire, y la cerilla se apaga al instante.',
  'The match is out.': 'La cerilla está apagada.',
  'The match is burning.': 'La cerilla arde.',
  "The matchbook isn't very interesting, except for what's written on it.":
    'Las cerillas no tienen mucho interés, salvo por lo que está escrito en ellas.',
  "Alas, there's not much left of the candles. Certainly not enough to burn.":
    'Ay, no queda gran cosa de las velas. Desde luego no lo bastante para arder.',
  '(with the match)': '(con la cerilla)',
  'You should say what to light them with.':
    'Deberías decir con qué encenderlas.',
  'You realize, just in time, that the candles are already lighted.':
    'Te das cuenta, justo a tiempo, de que las velas ya están encendidas.',
  'The heat from the torch is so intense that the candles are vaporized.':
    'El calor de la antorcha es tan intenso que las velas se vaporizan.',
  "You have to light them with something that's burning, you know.":
    'Tienes que encenderlas con algo que esté ardiendo, ¿sabes?',
  "Let's see, how many objects in a pair? Don't tell me, I'll get it.":
    'Veamos, ¿cuántos objetos hay en un par? No me lo digas, ya lo saco.',
  'The flame is extinguished.': 'La llama se extingue.',
  'The candles are not lighted.': 'Las velas no están encendidas.',
  "That wouldn't be smart.": 'Eso no sería inteligente.',
  'It is now completely dark.': 'Ahora está completamente oscuro.',
  'Your sword is glowing very brightly.':
    'Tu espada brilla con gran intensidad.',
  'Oh dear. It appears that the smell coming from this room was coal gas. I would have thought twice about carrying flaming objects in here.':
    'Vaya. Parece que el olor que venía de esta sala era gas de carbón. Yo me lo habría pensado dos veces antes de traer objetos en llamas aquí dentro.',
  'A large vampire bat, hanging from the ceiling, swoops down at you!':
    '¡Un gran murciélago vampiro, colgado del techo, se lanza en picado sobre ti!',
  "It's not clear how to turn it on with your bare hands.":
    'No está claro cómo encenderla con las manos desnudas.',
  "The machine doesn't seem to want to do anything.":
    'La máquina no parece querer hacer nada.',
  'The slag was rather insubstantial, and crumbles into dust at your touch.':
    'La escoria era más bien endeble, y se deshace en polvo a tu contacto.',
  'The rainbow seems to have become somewhat run-of-the-mill.':
    'El arcoíris parece haberse vuelto de lo más corriente.',
  'A dazzling display of color briefly emanates from the sceptre.':
    'Un deslumbrante despliegue de color emana brevemente del cetro.',
  'A solid rainbow spans the falls.': 'Un arcoíris sólido cruza las cataratas.',
  'From here?!?': '¿¿¿Desde aquí???',
  "You'll have to say which way...": 'Tendrás que decir por dónde...',
  'Can you walk on water vapor?': '¿Sabes caminar sobre vapor de agua?',
  'The Frigid River flows under the rainbow.':
    'El río Frigid corre bajo el arcoíris.',
  'Well done. The boat is repaired.': 'Bien hecho. El bote está reparado.',
  'You should get in the boat then launch it.':
    'Deberías subir al bote y luego botarlo.',
  "Read the label for the boat's instructions.":
    'Lee la etiqueta para las instrucciones del bote.',
  "You can't launch it here.": 'No puedes botarlo aquí.',
  "You're not in the boat!": '¡No estás en el bote!',
  'Oops! Something sharp seems to have slipped and punctured the boat. The boat deflates to the sounds of hissing, sputtering, and cursing.':
    '¡Uy! Algo afilado parece haber resbalado y pinchado el bote. El bote se deshincha entre silbidos, resoplidos y maldiciones.',
  'Inflating it further would probably burst it.':
    'Inflarlo más probablemente lo reventaría.',
  "You can't deflate the boat while you're in it.":
    'No puedes deshinchar el bote mientras estás dentro.',
  'The boat must be on the ground to be deflated.':
    'El bote debe estar en el suelo para deshincharlo.',
  'The boat deflates.': 'El bote se deshincha.',
  'The boat must be on the ground to be inflated.':
    'El bote debe estar en el suelo para inflarlo.',
  "You don't have enough lung power to inflate it.":
    'No tienes suficiente fuerza en los pulmones para inflarlo.',
  'You notice something funny about the feel of the buoy.':
    'Notas algo curioso al tacto de la boya.',
  'On the ground below you can see:': 'En el suelo de abajo puedes ver:',
  'The nest falls to the ground, and the egg spills out of it, seriously damaged.':
    'El nido cae al suelo, y el huevo se sale de él, seriamente dañado.',
  'The egg falls to the ground and springs open, seriously damaged.':
    'El huevo cae al suelo y se abre de golpe, seriamente dañado.',
  'The egg is already open.': 'El huevo ya está abierto.',
  'You have neither the tools nor the expertise.':
    'No tienes ni las herramientas ni la pericia.',
  'I doubt you could do that without damaging it.':
    'Dudo que pudieras hacer eso sin dañarlo.',
  'The egg is now open, but the clumsiness of your attempt has seriously compromised its esthetic appeal.':
    'El huevo está ahora abierto, pero la torpeza de tu intento ha comprometido seriamente su atractivo estético.',
  'There is a noticeable crunch from beneath you, and inspection reveals that the egg is lying open, badly damaged.':
    'Se oye un crujido muy claro bajo tus pies, y la inspección revela que el huevo yace abierto, gravemente dañado.',
  'Your rather indelicate handling of the egg has caused it some damage, although you have succeeded in opening it.':
    'Tu manejo más bien poco delicado del huevo le ha causado algún daño, aunque has logrado abrirlo.',
  'The canary chirps blithely, if somewhat tinnily, for a short time.':
    'El canario gorjea alegremente, aunque con voz algo metálica, durante un breve instante.',
  'There is an unpleasant grinding noise from inside the canary.':
    'Se oye un desagradable chirrido procedente del interior del canario.',
  'The cliff is too steep for climbing.':
    'El acantilado es demasiado escarpado para escalarlo.',
  'That would be very unwise. Perhaps even fatal.':
    'Eso sería muy imprudente. Quizá incluso fatal.',
  'The rope is already tied to it.': 'La cuerda ya está atada a ello.',
  'The rope is now untied.': 'La cuerda está ahora desatada.',
  'It is not tied to anything.': 'No está atada a nada.',
  'The rope drops gently to the floor below.':
    'La cuerda cae suavemente al suelo de abajo.',
  'The rope is tied to the railing.': 'La cuerda está atada a la barandilla.',
  "It's not attached to that!": '¡No está sujeto a eso!',
  'It smells of hot peppers.': 'Huele a guindillas.',
  'You cannot enter in your condition.': 'No puedes entrar en tu estado.',
  'All such attacks are vain in your condition.':
    'Todo ataque de esa clase es vano en tu estado.',
  'Even such an action is beyond your capabilities.':
    'Incluso una acción semejante excede tus capacidades.',
  "Might as well. You've got an eternity.":
    'Qué más da. Tienes la eternidad por delante.',
  'You need no light to guide you.': 'No necesitas ninguna luz que te guíe.',
  "You're dead! How can you think of your score?":
    '¡Estás muerto! ¿Cómo puedes pensar en tu puntuación?',
  'You have no possessions.': 'No posees nada.',
  'You are dead.': 'Estás muerto.',
  '**** You have died ****': '**** Has muerto ****',
  '** BOOOOOOOOOOOM **': '** BUUUUUUUUUUM **',
  'Although there is no light, the room seems dimly illuminated.':
    'Aunque no hay luz, la sala parece débilmente iluminada.',
  'From the distance the sound of a lone trumpet is heard. The room becomes very bright and you feel disembodied. In a moment, the brightness fades and you find yourself rising as if from a long sleep, deep in the woods. In the distance you can faintly hear a songbird and the sounds of the forest.':
    'A lo lejos se oye el son de una trompeta solitaria. La sala se vuelve muy luminosa y te sientes desencarnado. Al cabo de un instante, el brillo se desvanece y te encuentras incorporándote como de un largo sueño, en lo más profundo del bosque. A lo lejos oyes débilmente un pájaro cantor y los sonidos del bosque.',
  'Your prayers are not heard.': 'Tus oraciones no son escuchadas.',
  "There's not much lake left....": 'No queda mucho lago...',
  "It's too wide to cross.": 'Es demasiado ancho para cruzarlo.',
  "You can't swim in this lake.": 'No puedes nadar en este lago.',
  "You can't swim in the stream.": 'No puedes nadar en el arroyo.',
  'The other side is a sheer rock cliff.':
    'El otro lado es un acantilado de roca a pico.',
  "It's too far to jump, and there's no bridge.":
    'Está demasiado lejos para saltar, y no hay puente.',
  'The gate is protected by an invisible force. It makes your teeth ache to touch it.':
    'La verja está protegida por una fuerza invisible. Tocarla te hace doler los dientes.',
  'There is too much gas to blow away.':
    'Hay demasiado gas para poder soplarlo.',
  'It smells like coal gas in here.': 'Aquí dentro huele a gas de carbón.',
  'The robber, rummaging through his bag, dropped a few items he found valueless.':
    'El ladrón, hurgando en su bolsa, dejó caer unos cuantos objetos que consideró sin valor.',
  'You are in perfect health.': 'Estás en perfecto estado de salud.',
  'It takes a talented person to be killed while already dead. YOU are such a talent. Unfortunately, it takes a talented person to deal with it. I am not such a talent. Sorry.':
    'Hace falta tener talento para que te maten estando ya muerto. TÚ tienes ese talento. Por desgracia, hace falta talento para lidiar con ello. Yo no tengo ese talento. Lo siento.',
  'Bad luck, huh?': 'Mala suerte, ¿eh?',
  "You clearly are a suicidal maniac. We don't allow psychotics in the cave, since they may harm other adventurers. Your remains will be installed in the Land of the Living Dead, where your fellow adventurers may gloat over them.":
    'Está claro que eres un maníaco suicida. No admitimos psicóticos en la caverna, ya que podrían dañar a otros aventureros. Tus restos serán instalados en el Reino de los Muertos Vivientes, donde tus compañeros aventureros podrán regodearse en ellos.',
  'As you take your last breath, you feel relieved of your burdens. The feeling passes as you find yourself before the gates of Hell, where the spirits jeer at you and deny you entry. Your senses are disturbed. The objects in the dungeon appear indistinct, bleached of color, even unreal.':
    'Al exhalar tu último aliento, te sientes aliviado de tus cargas. La sensación pasa cuando te encuentras ante las puertas del Infierno, donde los espíritus se burlan de ti y te niegan la entrada. Tus sentidos están perturbados. Los objetos del calabozo parecen difusos, descoloridos, incluso irreales.',
  "Now, let's take a look here... Well, you probably deserve another chance. I can't quite fix you up completely, but you can't have everything.":
    'Veamos, echemos un vistazo... Bueno, probablemente mereces otra oportunidad. No puedo dejarte del todo como nuevo, pero no se puede tener todo.',
  "What the heck! You won't make friends this way, but nobody around here is too friendly anyhow. Gulp!":
    '¡Qué demonios! No harás amigos así, pero nadie por aquí es muy amistoso de todas formas. ¡Glup!',
  'The chain is secure.': 'La cadena está bien sujeta.',
  'Perhaps you should do that to the basket.':
    'Quizá deberías hacerle eso a la cesta.',
  'The chain secures a basket within the shaft.':
    'La cadena sujeta una cesta dentro del pozo.',
}
