// Zork I × German full-line table (output-translation spec §2, §3). KEYS are
// normalized English lines BYTE-IDENTICAL to zork1.fr.strings.ts (the structural
// blueprint, spec §2.1); only the VALUES are German. Authored from the ENGLISH
// source line (spec §2.2), not from the French — the fr/es values are
// same-meaning references. German nouns are capitalized mid-sentence (spec §2.5).
//
// TRANSLATION STYLE:
// - Informal "du" throughout, matching the German input layer (de.core.ts).
// - One line per key: sentence count and trailing punctuation preserved (the
//   line is the matching unit — never merge or split lines).
// - German quotation marks „ … “ for quoted speech; parser command words
//   (RESTART, RESTORE, QUIT, OOPS, "Launch", "Land", Y) read verbatim by the
//   Z-machine and are NEVER localized.
// - Proper nouns stay (Zork, Frobozz, Aragain, Frigid, Ramses II); the grue
//   monster is "der Grue" (masculine). Imperial units kept (Fuß, Zoll) for
//   1980s flavor. Infocom's wit is preserved, never flattened.
export const ZORK1_DE_STRINGS: Readonly<Record<string, string>> = {
  'ZORK I: The Great Underground Empire':
    'ZORK I: Das Große Unterirdische Imperium',
  'Infocom interactive fiction - a fantasy story':
    'Interaktive Infocom-Fiktion - eine Fantasy-Geschichte',
  'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.':
    'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. Alle Rechte vorbehalten.',
  'ZORK is a registered trademark of Infocom, Inc.':
    'ZORK ist eine eingetragene Marke von Infocom, Inc.',
  'Release 119 / Serial number 880429': 'Release 119 / Seriennummer 880429',
  'Taken.': 'Genommen.',
  '(Taken)': '(Genommen)',
  'Dropped.': 'Fallen gelassen.',
  'Opened.': 'Geöffnet.',
  'Closed.': 'Geschlossen.',
  'Done.': 'Erledigt.',
  'Click.': 'Klick.',
  'You are on your own feet again.': 'Du stehst wieder auf eigenen Beinen.',
  '(magic boat)': '(magisches Boot)',
  'Your collection of treasures consists of:':
    'Deine Schatzsammlung besteht aus:',
  'Your sword is glowing with a faint blue glow.':
    'Dein Schwert glüht in einem schwachen blauen Schein.',
  'Your sword has begun to glow very brightly.':
    'Dein Schwert hat begonnen, sehr hell zu glühen.',
  'Your sword is no longer glowing.': 'Dein Schwert glüht nicht mehr.',
  'A nasty-looking troll, brandishing a bloody axe, blocks all passages out of the room.':
    'Ein übel aussehender Troll, der eine blutige Axt schwingt, versperrt alle Ausgänge aus dem Raum.',
  'Clang! Crash! The troll parries.': 'Kling! Krach! Der Troll pariert.',
  "The troll's mighty blow drops you to your knees.":
    'Der gewaltige Schlag des Trolls zwingt dich in die Knie.',
  'You are still recovering from that last blow, so your attack is ineffective.':
    'Du erholst dich noch von dem letzten Schlag, deshalb ist dein Angriff wirkungslos.',
  "The troll's axe barely misses your ear.":
    'Die Axt des Trolls verfehlt nur knapp dein Ohr.',
  'You charge, but the troll jumps nimbly aside.':
    'Du stürmst vor, doch der Troll springt flink zur Seite.',
  'The troll swings his axe, but it misses.':
    'Der Troll schwingt seine Axt, aber sie verfehlt dich.',
  "The troll's weapon is knocked to the floor, leaving him unarmed.":
    'Die Waffe des Trolls wird zu Boden geschlagen, sodass er unbewaffnet ist.',
  'The troll, disarmed, cowers in terror, pleading for his life in the guttural tongue of the trolls.':
    'Der Troll, entwaffnet, kauert vor Schrecken am Boden und fleht in der gutturalen Sprache der Trolle um sein Leben.',
  'The unarmed troll cannot defend himself: He dies.':
    'Der unbewaffnete Troll kann sich nicht verteidigen: Er stirbt.',
  'Almost as soon as the troll breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.':
    'Kaum hat der Troll seinen letzten Atemzug getan, hüllt ihn eine Wolke aus finsterem schwarzem Nebel ein, und als der Nebel sich lichtet, ist der Kadaver verschwunden.',
  'Someone carrying a large bag is casually leaning against one of the walls here. He does not speak, but it is clear from his aspect that the bag will be taken only over his dead body.':
    'Jemand mit einem großen Beutel lehnt hier lässig an einer der Wände. Er sagt nichts, doch sein Erscheinungsbild macht klar, dass man ihm den Beutel nur über seine Leiche abnehmen wird.',
  'There is a suspicious-looking individual, holding a large bag, leaning against one wall. He is armed with a deadly stiletto.':
    'Eine verdächtig aussehende Gestalt mit einem großen Beutel lehnt an einer Wand. Sie ist mit einem tödlichen Stilett bewaffnet.',
  "You hear a scream of anguish as you violate the robber's hideaway. Using passages unknown to you, he rushes to its defense.":
    'Du hörst einen Angstschrei, als du das Versteck des Räubers entweihst. Durch dir unbekannte Gänge eilt er herbei, um es zu verteidigen.',
  'The thief gestures mysteriously, and the treasures in the room suddenly vanish.':
    'Der Dieb macht eine geheimnisvolle Geste, und die Schätze im Raum verschwinden plötzlich.',
  'The thief is taken aback by your unexpected generosity, but accepts the jewel-encrusted egg and stops to admire its beauty.':
    'Der Dieb ist verblüfft von deiner unerwarteten Großzügigkeit, nimmt aber das juwelenbesetzte Ei an und hält inne, um dessen Schönheit zu bewundern.',
  'The stiletto flashes faster than you can follow, and blood wells from your leg.':
    'Das Stilett blitzt schneller, als du folgen kannst, und Blut quillt aus deinem Bein.',
  'The thief is disarmed by a subtle feint past his guard.':
    'Der Dieb wird durch eine geschickte Finte an seiner Deckung vorbei entwaffnet.',
  'The robber, somewhat surprised at this turn of events, nimbly retrieves his stiletto.':
    'Der Räuber, etwas überrascht von dieser Wendung, hebt flink sein Stilett wieder auf.',
  'The quickness of your thrust knocks the thief back, stunned.':
    'Die Schnelligkeit deines Stoßes wirft den Dieb betäubt zurück.',
  'The thief slowly regains his feet.':
    'Der Dieb kommt langsam wieder auf die Beine.',
  'A quick stroke, but the thief is on guard.':
    'Ein schneller Hieb, doch der Dieb ist auf der Hut.',
  'You dodge as the thief comes in low.':
    'Du weichst aus, als der Dieb tief angreift.',
  'The thief is staggered, and drops to his knees.':
    'Der Dieb taumelt und sinkt in die Knie.',
  'A furious exchange, and the thief is knocked out!':
    'Ein wütender Schlagabtausch, und der Dieb wird bewusstlos geschlagen!',
  'The unconscious thief cannot defend himself: He dies.':
    'Der bewusstlose Dieb kann sich nicht verteidigen: Er stirbt.',
  'Almost as soon as the thief breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.':
    'Kaum hat der Dieb seinen letzten Atemzug getan, hüllt ihn eine Wolke aus finsterem schwarzem Nebel ein, und als der Nebel sich lichtet, ist der Kadaver verschwunden.',
  'As the thief dies, the power of his magic decreases, and his treasures reappear:':
    'Während der Dieb stirbt, schwindet die Kraft seiner Magie, und seine Schätze erscheinen wieder:',
  'The chalice is now safe to take.':
    'Der Kelch kann nun gefahrlos genommen werden.',
  'A cyclops, who looks prepared to eat horses (much less mere adventurers), blocks the staircase. From his state of health, and the bloodstains on the walls, you gather that he is not very friendly, though he likes people.':
    'Ein Zyklop, der aussieht, als wäre er bereit, Pferde zu verschlingen (von bloßen Abenteurern ganz zu schweigen), versperrt die Treppe. An seinem Gesundheitszustand und den Blutflecken an den Wänden erkennst du, dass er nicht sehr freundlich ist, obwohl er Menschen mag.',
  "The cyclops, hearing the name of his father's deadly nemesis, flees the room by knocking down the wall on the east of the room.":
    'Der Zyklop, der den Namen des tödlichen Erzfeindes seines Vaters hört, flieht aus dem Raum, indem er die Wand im Osten des Raumes einreißt.',
  'There is a pair of candles here (providing light).':
    'Hier liegt ein Paar Kerzen (spenden Licht).',
  'A pair of candles (providing light)': 'Ein Paar Kerzen (spenden Licht)',
  'There is a matchbook here (providing light).':
    'Hier liegt ein Streichholzheftchen (spendet Licht).',
  'A matchbook (providing light)': 'Ein Streichholzheftchen (spendet Licht)',
  'The number of ghosts has it.': 'Die Geister haben es.',
  "You can't see any songbird here.": 'Du kannst hier keinen Singvogel sehen.',
  'A quantity of water': 'Eine Menge Wasser',
  'It is pitch black.': 'Es ist stockfinster.',
  'It is pitch black. You are likely to be eaten by a grue.':
    'Es ist stockfinster. Du wirst wahrscheinlich von einem Grue gefressen.',
  'It is now pitch black.': 'Es ist jetzt stockfinster.',
  "It's pitch black in here!": 'Hier drin ist es stockfinster!',
  "Beside you on the branch is a small bird's nest.":
    'Neben dir auf dem Ast befindet sich ein kleines Vogelnest.',
  "In the bird's nest is a large egg encrusted with precious jewels, apparently scavenged by a childless songbird. The egg is covered with fine gold inlay, and ornamented in lapis lazuli and mother-of-pearl. Unlike most eggs, this one is hinged and closed with a delicate looking clasp. The egg appears extremely fragile.":
    'In dem Vogelnest liegt ein großes, mit kostbaren Juwelen besetztes Ei, anscheinend von einem kinderlosen Singvogel zusammengetragen. Das Ei ist mit feinen Goldeinlagen überzogen und mit Lapislazuli und Perlmutt verziert. Anders als die meisten Eier ist dieses mit einem Scharnier versehen und durch einen zart wirkenden Verschluss geschlossen. Das Ei wirkt äußerst zerbrechlich.',
  'You hear in the distance the chirping of a song bird.':
    'Du hörst in der Ferne das Zwitschern eines Singvogels.',
  'With great effort, you open the window far enough to allow entry.':
    'Mit großer Mühe öffnest du das Fenster weit genug, um hindurchzukommen.',
  'A bottle is sitting on the table.': 'Auf dem Tisch steht eine Flasche.',
  'On the table is an elongated brown sack, smelling of hot peppers.':
    'Auf dem Tisch liegt ein länglicher brauner Sack, der nach scharfen Paprikaschoten riecht.',
  'Opening the brown sack reveals a clove of garlic, and a lunch.':
    'Beim Öffnen des braunen Sacks kommen eine Knoblauchzehe und ein Mittagessen zum Vorschein.',
  'Above the trophy case hangs an elvish sword of great antiquity.':
    'Über der Trophäenvitrine hängt ein elfisches Schwert von hohem Alter.',
  'A battery-powered brass lantern is on the trophy case.':
    'Auf der Trophäenvitrine steht eine batteriebetriebene Messinglaterne.',
  'With a great effort, the rug is moved to one side of the room, revealing the dusty cover of a closed trap door.':
    'Mit großer Mühe wird der Teppich an eine Seite des Raumes geschoben und gibt den staubigen Deckel einer geschlossenen Falltür frei.',
  'The door reluctantly opens to reveal a rickety staircase descending into darkness.':
    'Die Tür öffnet sich widerwillig und gibt eine wackelige Treppe frei, die in die Dunkelheit hinabführt.',
  'A large coil of rope is lying in the corner.':
    'In der Ecke liegt ein großer Strang Seil.',
  'On a table is a nasty-looking knife.':
    'Auf einem Tisch liegt ein übel aussehendes Messer.',
  'The trap door crashes shut, and you hear someone barring it.':
    'Die Falltür fällt krachend zu, und du hörst, wie jemand sie verriegelt.',
  'Beside the skeleton is a rusty knife.':
    'Neben dem Skelett liegt ein rostiges Messer.',
  "The deceased adventurer's useless lantern is here.":
    'Die nutzlose Laterne des verstorbenen Abenteurers liegt hier.',
  'An old leather bag, bulging with coins, is here.':
    'Ein alter Lederbeutel, prall gefüllt mit Münzen, liegt hier.',
  'There is a silver chalice, intricately engraved, here.':
    'Hier steht ein silberner Kelch, kunstvoll graviert.',
  'The way through the gate is barred by evil spirits, who jeer at your attempts to pass.':
    'Der Weg durch das Tor wird von bösen Geistern versperrt, die deine Versuche durchzukommen verhöhnen.',
  'The bell suddenly becomes red hot and falls to the ground. The wraiths, as if paralyzed, stop their jeering and slowly turn to face you. On their ashen faces, the expression of a long-forgotten terror takes shape.':
    'Die Glocke wird plötzlich rotglühend und fällt zu Boden. Die Gespenster halten, wie gelähmt, in ihrem Hohngelächter inne und wenden sich langsam dir zu. Auf ihren aschfahlen Gesichtern formt sich der Ausdruck eines längst vergessenen Schreckens.',
  'In your confusion, the candles drop to the ground (and they are out).':
    'In deiner Verwirrung fallen die Kerzen zu Boden (und sie sind aus).',
  'One of the matches starts to burn.':
    'Eines der Streichhölzer fängt an zu brennen.',
  'The candles are lit.': 'Die Kerzen sind angezündet.',
  'The flames flicker wildly and appear to dance. The earth beneath your feet trembles, and your legs nearly buckle beneath you. The spirits cower at your unearthly power.':
    'Die Flammen flackern wild und scheinen zu tanzen. Die Erde unter deinen Füßen bebt, und deine Beine geben beinahe unter dir nach. Die Geister kauern vor deiner überirdischen Macht.',
  'The match has gone out.': 'Das Streichholz ist erloschen.',
  'Each word of the prayer reverberates through the hall in a deafening confusion. As the last word fades, a voice, loud and commanding, speaks: "Begone, fiends!" A heart-stopping scream fills the cavern, and the spirits, sensing a greater power, flee through the walls.':
    'Jedes Wort des Gebets hallt in ohrenbetäubendem Durcheinander durch die Halle. Als das letzte Wort verklingt, spricht eine laute, gebieterische Stimme: „Hinweg, ihr Unholde!“ Ein herzzerreißender Schrei erfüllt die Höhle, und die Geister, die eine größere Macht spüren, fliehen durch die Wände.',
  'Lying in one corner of the room is a beautifully carved crystal skull. It appears to be grinning at you rather nastily.':
    'In einer Ecke des Raumes liegt ein wunderschön geschnitzter Kristallschädel. Er scheint dich recht boshaft anzugrinsen.',
  'On the ground is a red hot bell.':
    'Auf dem Boden liegt eine rotglühende Glocke.',
  'Fortunately, there is still one chance for you to be a vandal, for on the far wall is a painting of unparalleled beauty.':
    'Glücklicherweise hast du noch eine Gelegenheit, den Vandalen zu spielen, denn an der gegenüberliegenden Wand hängt ein Gemälde von unvergleichlicher Schönheit.',
  'The sluice gates on the dam are closed. Behind the dam, there can be seen a wide reservoir. Water is pouring over the top of the now abandoned dam.':
    'Die Schleusentore am Staudamm sind geschlossen. Hinter dem Damm ist ein weites Reservoir zu sehen. Wasser ergießt sich über die Krone des nun verlassenen Damms.',
  'There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble.':
    'Hier befindet sich ein Bedienpult, auf dem ein großer Metallbolzen angebracht ist. Direkt über dem Bolzen sitzt eine kleine grüne Plastikkuppel.',
  'There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble which is glowing serenely.':
    'Hier befindet sich ein Bedienpult, auf dem ein großer Metallbolzen angebracht ist. Direkt über dem Bolzen sitzt eine kleine grüne Plastikkuppel, die ruhig leuchtet.',
  'Some guidebooks entitled "Flood Control Dam #3" are on the reception desk.':
    'Einige Reiseführer mit dem Titel „Hochwasserschutzdamm Nr. 3“ liegen auf dem Empfangstresen.',
  'There is a matchbook whose cover says "Visit Beautiful FCD#3" here.':
    'Hier liegt ein Streichholzheftchen, dessen Umschlag sagt „Besuchen Sie den schönen FCD#3“.',
  'There is an object which looks like a tube of toothpaste here.':
    'Hier liegt ein Gegenstand, der wie eine Tube Zahnpasta aussieht.',
  'The sluice gates open and water pours through the dam.':
    'Die Schleusentore öffnen sich, und Wasser strömt durch den Damm.',
  'There is a rumble from deep within the earth and the room shakes.':
    'Aus den Tiefen der Erde dringt ein Grollen, und der Raum bebt.',
  'On the ground is a large platinum bar.':
    'Auf dem Boden liegt ein großer Platinbarren.',
  'The acoustics of the room change subtly.':
    'Die Akustik des Raumes verändert sich auf subtile Weise.',
  'Lying half buried in the mud is an old trunk, bulging with jewels.':
    'Halb im Schlamm vergraben liegt eine alte Truhe, prall gefüllt mit Juwelen.',
  'There is a slimy stairway leaving the room to the north.':
    'Eine schleimige Treppe führt aus dem Raum nach Norden.',
  "On the shore lies Poseidon's own crystal trident.":
    'Am Ufer liegt Poseidons eigener Kristalldreizack.',
  'There are old engravings on the walls here.':
    'Hier sind alte Gravuren an den Wänden.',
  'The rope drops over the side and comes within ten feet of the floor.':
    'Das Seil fällt über die Kante und reicht bis auf zehn Fuß an den Boden heran.',
  'A piece of rope descends from the railing above, ending some five feet above your head.':
    'Ein Stück Seil hängt vom Geländer darüber herab und endet etwa fünf Fuß über deinem Kopf.',
  'Sitting on the pedestal is a flaming torch, made of ivory.':
    'Auf dem Sockel ruht eine flammende Fackel aus Elfenbein.',
  'On the two ends of the altar are burning candles.':
    'An den beiden Enden des Altars brennen Kerzen.',
  'On the altar is a large black book, open to page 569.':
    'Auf dem Altar liegt ein großes schwarzes Buch, aufgeschlagen auf Seite 569.',
  'A gust of wind blows out your candles!':
    'Ein Windstoß bläst deine Kerzen aus!',
  'There is an exquisite jade figurine here.':
    'Hier steht eine erlesene Jadefigur.',
  'In the corner of the room on the ceiling is a large vampire bat who is obviously deranged and holding his nose.':
    'In der Ecke des Raumes an der Decke hängt eine große Vampirfledermaus, die offensichtlich verstört ist und sich die Nase zuhält.',
  'At the end of the chain is a basket.': 'Am Ende der Kette hängt ein Korb.',
  'From the chain is suspended a basket.': 'An der Kette hängt ein Korb.',
  'The basket is lowered to the bottom of the shaft.':
    'Der Korb wird bis zum Grund des Schachts hinabgelassen.',
  'The basket is raised to the top of the shaft.':
    'Der Korb wird bis zur Spitze des Schachts hinaufgezogen.',
  'The lid opens.': 'Der Deckel öffnet sich.',
  'The lid closes.': 'Der Deckel schließt sich.',
  'The machine comes to life (figuratively) with a dazzling display of colored lights and bizarre noises. After a few moments, the excitement abates.':
    'Die Maschine erwacht (im übertragenen Sinne) zum Leben mit einem blendenden Schauspiel farbiger Lichter und bizarrer Geräusche. Nach einigen Augenblicken legt sich die Aufregung.',
  'The lid opens, revealing a huge diamond.':
    'Der Deckel öffnet sich und gibt einen riesigen Diamanten frei.',
  'There is a brass lantern (battery-powered) here.':
    'Hier steht eine Messinglaterne (batteriebetrieben).',
  'The solid-gold coffin used for the burial of Ramses II is here.':
    'Hier steht der massivgoldene Sarg, der für die Bestattung von Ramses II verwendet wurde.',
  'A sceptre, possibly that of ancient Egypt itself, is in the coffin. The sceptre is ornamented with colored enamel, and tapers to a sharp point.':
    'Ein Zepter, möglicherweise das des alten Ägypten selbst, liegt in dem Sarg. Das Zepter ist mit farbiger Emaille verziert und läuft in eine scharfe Spitze aus.',
  'There is a folded pile of plastic here which has a small valve attached.':
    'Hier liegt ein zusammengefalteter Haufen Plastik mit einem kleinen daran befestigten Ventil.',
  'The boat inflates and appears seaworthy.':
    'Das Boot bläst sich auf und wirkt seetüchtig.',
  'A tan label is lying inside the boat.':
    'Ein beigefarbenes Etikett liegt im Inneren des Bootes.',
  'The flow of the river carries you downstream.':
    'Die Strömung des Flusses trägt dich flussabwärts.',
  'There is a red buoy here (probably a warning).':
    'Hier ist eine rote Boje (wahrscheinlich eine Warnung).',
  'The magic boat comes to a rest on the shore.':
    'Das magische Boot kommt am Ufer zur Ruhe.',
  "The magic boat doesn't lead upward.":
    'Das magische Boot führt nicht nach oben.',
  'You seem to be digging a hole here.': 'Du scheinst hier ein Loch zu graben.',
  "The hole is getting deeper, but that's about it.":
    "Das Loch wird tiefer, aber das war's auch schon.",
  'You are surrounded by a wall of sand on all sides.':
    'Du bist von allen Seiten von einer Wand aus Sand umgeben.',
  'You can see a scarab here in the sand.':
    'Du kannst hier im Sand einen Skarabäus sehen.',
  'A beautiful rainbow can be seen over the falls and to the west.':
    'Über den Fällen und im Westen ist ein wunderschöner Regenbogen zu sehen.',
  'Suddenly, the rainbow appears to become solid and, I venture, walkable (I think the giveaway was the stairs and bannister).':
    'Plötzlich scheint der Regenbogen fest zu werden und, wage ich zu behaupten, begehbar (ich glaube, das Verräterische waren die Stufen und das Geländer).',
  'At the end of the rainbow is a pot of gold.':
    'Am Ende des Regenbogens steht ein Topf voll Gold.',
  'The lamp appears a bit dimmer.':
    'Die Lampe scheint ein wenig schwächer zu leuchten.',
  'The canary chirps, slightly off-key, an aria from a forgotten opera. From out of the greenery flies a lovely songbird. It perches on a limb just over your head and opens its beak to sing. As it does so a beautiful brass bauble drops from its mouth, bounces off the top of your head, and lands glimmering in the grass. As the canary winds down, the songbird flies away.':
    'Der Kanarienvogel trällert, leicht schief, eine Arie aus einer vergessenen Oper. Aus dem Grün fliegt ein reizender Singvogel herbei. Er setzt sich auf einen Ast direkt über deinem Kopf und öffnet den Schnabel zum Singen. Dabei fällt ihm eine schöne Messingkugel aus dem Schnabel, prallt von deinem Scheitel ab und landet schimmernd im Gras. Während der Kanarienvogel auspendelt, fliegt der Singvogel davon.',
  'An almost inaudible voice whispers in your ear, "Look to your treasures for the final secret."':
    'Eine fast unhörbare Stimme flüstert dir ins Ohr: „Sieh dir deine Schätze an, um das letzte Geheimnis zu finden.“',
  'The ZORK trilogy continues with "ZORK II: The Wizard of Frobozz" and is completed in "ZORK III: The Dungeon Master."':
    'Die ZORK-Trilogie setzt sich fort mit „ZORK II: Der Zauberer von Frobozz“ und wird abgeschlossen in „ZORK III: Der Kerkermeister“.',
  'This gives you the rank of Master Adventurer.':
    'Dies verleiht dir den Rang eines Meisterabenteurers.',
  'Would you like to restart the game from the beginning, restore a saved game position, or end this session of the game?':
    'Möchtest du das Spiel von vorne beginnen, einen gespeicherten Spielstand wiederherstellen oder diese Spielsitzung beenden?',
  '(Type RESTART, RESTORE, or QUIT):': '(Tippe RESTART, RESTORE oder QUIT):',
  'West of House': 'Westlich des Hauses',
  'North of House': 'Nördlich des Hauses',
  'South of House': 'Südlich des Hauses',
  'Behind House': 'Hinter dem Haus',
  'Forest Path': 'Waldpfad',
  'Up a Tree': 'Auf einem Baum',
  Forest: 'Wald',
  Clearing: 'Lichtung',
  Kitchen: 'Küche',
  'Living Room': 'Wohnzimmer',
  Attic: 'Dachboden',
  Cellar: 'Keller',
  'The Troll Room': 'Der Trollraum',
  Maze: 'Labyrinth',
  'Cyclops Room': 'Zyklopenraum',
  'Treasure Room': 'Schatzkammer',
  'Strange Passage': 'Seltsamer Gang',
  'East of Chasm': 'Östlich der Schlucht',
  Gallery: 'Galerie',
  'East-West Passage': 'Ost-West-Gang',
  'Round Room': 'Runder Raum',
  'North-South Passage': 'Nord-Süd-Gang',
  'Deep Canyon': 'Tiefe Schlucht',
  'Reservoir South': 'Reservoir Süd',
  Reservoir: 'Reservoir',
  'Reservoir North': 'Reservoir Nord',
  Dam: 'Staudamm',
  'Dam Lobby': 'Damm-Foyer',
  'Maintenance Room': 'Wartungsraum',
  'Dam Base': 'Dammfuß',
  'Engravings Cave': 'Gravurenhöhle',
  'Dome Room': 'Kuppelraum',
  'Torch Room': 'Fackelraum',
  Temple: 'Tempel',
  Altar: 'Altar',
  Cave: 'Höhle',
  'Entrance to Hades': 'Eingang zum Hades',
  'Land of the Dead': 'Reich der Toten',
  'Mirror Room': 'Spiegelraum',
  'Cold Passage': 'Kalter Gang',
  'Slide Room': 'Rutschenraum',
  'Loud Room': 'Lärmender Raum',
  'Atlantis Room': 'Atlantis-Raum',
  'Narrow Passage': 'Schmaler Gang',
  'Mine Entrance': 'Mineneingang',
  'Squeaky Room': 'Quietschraum',
  'Bat Room': 'Fledermausraum',
  'Shaft Room': 'Schachtraum',
  'Smelly Room': 'Stinkraum',
  'Gas Room': 'Gasraum',
  'Coal Mine': 'Kohlenmine',
  'Ladder Top': 'Oberes Leiterende',
  'Ladder Bottom': 'Unteres Leiterende',
  'Dead End': 'Sackgasse',
  'Timber Room': 'Balkenraum',
  'Drafty Room': 'Zugiger Raum',
  'Machine Room': 'Maschinenraum',
  'Egyptian Room': 'Ägyptischer Raum',
  'Frigid River, in the magic boat': 'Frigid-Fluss, im magischen Boot',
  'Sandy Beach, in the magic boat': 'Sandstrand, im magischen Boot',
  'Sandy Beach': 'Sandstrand',
  'Sandy Cave': 'Sandhöhle',
  Shore: 'Ufer',
  'Aragain Falls': 'Aragain-Fälle',
  'On the Rainbow': 'Auf dem Regenbogen',
  'End of Rainbow': 'Ende des Regenbogens',
  'Canyon Bottom': 'Talgrund der Schlucht',
  'Rocky Ledge': 'Felsvorsprung',
  'Canyon View': 'Blick auf die Schlucht',
  'Stone Barrow': 'Steinhügelgrab',
  'Inside the Barrow': 'Im Hügelgrab',
  'You are standing in an open field west of a white house, with a boarded front door.':
    'Du stehst auf einem offenen Feld westlich eines weißen Hauses mit einer vernagelten Haustür.',
  'You are standing in an open field west of a white house, with a boarded front door. A secret path leads southwest into the forest.':
    'Du stehst auf einem offenen Feld westlich eines weißen Hauses mit einer vernagelten Haustür. Ein geheimer Pfad führt südwestlich in den Wald.',
  'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.':
    'Du stehst vor der Nordseite eines weißen Hauses. Hier gibt es keine Tür, und alle Fenster sind vernagelt. Nach Norden windet sich ein schmaler Pfad durch die Bäume.',
  'You are facing the south side of a white house. There is no door here, and all the windows are boarded.':
    'Du stehst vor der Südseite eines weißen Hauses. Hier gibt es keine Tür, und alle Fenster sind vernagelt.',
  'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.':
    'Du befindest dich hinter dem weißen Haus. Ein Pfad führt nach Osten in den Wald. In einer Ecke des Hauses ist ein kleines Fenster, das einen Spalt offen steht.',
  'This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the edge of the path.':
    'Dies ist ein Pfad, der sich durch einen schwach beleuchteten Wald windet. Der Pfad verläuft hier in Nord-Süd-Richtung. Ein besonders großer Baum mit einigen niedrigen Ästen steht am Rand des Pfades.',
  'You are about 10 feet above the ground nestled among some large branches. The nearest branch above you is above your reach.':
    'Du befindest dich etwa 10 Fuß über dem Boden, eingebettet zwischen einigen großen Ästen. Der nächste Ast über dir ist außer Reichweite.',
  'This is a forest, with trees in all directions. To the east, there appears to be sunlight.':
    'Dies ist ein Wald mit Bäumen in allen Richtungen. Im Osten scheint Sonnenlicht zu sein.',
  'This is a dimly lit forest, with large trees all around.':
    'Dies ist ein schwach beleuchteter Wald mit großen Bäumen ringsum.',
  'You are in a small clearing in a well marked forest path that extends to the east and west.':
    'Du befindest dich auf einer kleinen Lichtung an einem gut markierten Waldpfad, der sich nach Osten und Westen erstreckt.',
  'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. A dark chimney leads down and to the east is a small window which is open.':
    'Du befindest dich in der Küche des weißen Hauses. Ein Tisch scheint kürzlich zur Zubereitung von Speisen benutzt worden zu sein. Ein Durchgang führt nach Westen, und eine dunkle Treppe führt sichtbar nach oben. Ein dunkler Kamin führt nach unten, und im Osten ist ein kleines Fenster, das offen steht.',
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room.':
    'Du befindest dich im Wohnzimmer. Es gibt einen Türdurchgang nach Osten, eine hölzerne Tür mit seltsamer gotischer Schrift nach Westen, die zugenagelt zu sein scheint, eine Trophäenvitrine und einen großen orientalischen Teppich in der Mitte des Raumes.',
  'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a rug lying beside an open trap door.':
    'Du befindest dich im Wohnzimmer. Es gibt einen Türdurchgang nach Osten, eine hölzerne Tür mit seltsamer gotischer Schrift nach Westen, die zugenagelt zu sein scheint, eine Trophäenvitrine und einen Teppich, der neben einer offenen Falltür liegt.',
  'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a rug lying beside an open trap door.':
    'Du befindest dich im Wohnzimmer. Es gibt einen Türdurchgang nach Osten. Im Westen ist eine zyklopenförmige Öffnung in einer alten hölzernen Tür, über der sich seltsame gotische Schrift befindet, eine Trophäenvitrine und ein Teppich, der neben einer offenen Falltür liegt.',
  'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a closed trap door at your feet.':
    'Du befindest dich im Wohnzimmer. Es gibt einen Türdurchgang nach Osten. Im Westen ist eine zyklopenförmige Öffnung in einer alten hölzernen Tür, über der sich seltsame gotische Schrift befindet, eine Trophäenvitrine und eine geschlossene Falltür zu deinen Füßen.',
  'This is the attic. The only exit is a stairway leading down.':
    'Dies ist der Dachboden. Der einzige Ausgang ist eine Treppe, die nach unten führt.',
  'You are in a dark and damp cellar with a narrow passageway leading north, and a crawlway to the south. On the west is the bottom of a steep metal ramp which is unclimbable.':
    'Du befindest dich in einem dunklen und feuchten Keller mit einem schmalen Gang nach Norden und einem Kriechgang nach Süden. Im Westen ist das untere Ende einer steilen Metallrampe, die nicht erklommen werden kann.',
  'This is a small room with passages to the east and south and a forbidding hole leading west. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.':
    'Dies ist ein kleiner Raum mit Gängen nach Osten und Süden und einem abweisenden Loch nach Westen. Blutflecken und tiefe Kratzer (vielleicht von einer Axt) entstellen die Wände.',
  'This is part of a maze of twisty little passages, all alike.':
    'Dies ist ein Teil eines Labyrinths gewundener kleiner Gänge, alle gleich.',
  'This is part of a maze of twisty little passages, all alike. A skeleton, probably the remains of a luckless adventurer, lies here.':
    'Dies ist ein Teil eines Labyrinths gewundener kleiner Gänge, alle gleich. Ein Skelett, vermutlich die Überreste eines glücklosen Abenteurers, liegt hier.',
  'This room has an exit on the northwest, and a staircase leading up.':
    'Dieser Raum hat einen Ausgang nach Nordwesten und eine Treppe, die nach oben führt.',
  'This is a large room, whose east wall is solid granite. A number of discarded bags, which crumble at your touch, are scattered about on the floor. There is an exit down a staircase.':
    'Dies ist ein großer Raum, dessen Ostwand aus massivem Granit besteht. Eine Reihe weggeworfener Säcke, die bei deiner Berührung zerfallen, liegen über den Boden verstreut. Es gibt einen Ausgang über eine Treppe nach unten.',
  'This is a long passage. To the west is one entrance. On the east there is an old wooden door, with a large opening in it (about cyclops sized).':
    'Dies ist ein langer Gang. Im Westen ist ein Eingang. Im Osten ist eine alte hölzerne Tür mit einer großen Öffnung darin (etwa zyklopengroß).',
  'You are on the east edge of a chasm, the bottom of which cannot be seen. A narrow passage goes north, and the path you are on continues to the east.':
    'Du befindest dich am Ostrand eines Abgrunds, dessen Grund nicht zu sehen ist. Ein schmaler Gang führt nach Norden, und der Pfad, auf dem du dich befindest, setzt sich nach Osten fort.',
  'This is an art gallery. Most of the paintings have been stolen by vandals with exceptional taste. The vandals left through either the north or west exits.':
    'Dies ist eine Kunstgalerie. Die meisten Gemälde wurden von Vandalen mit außergewöhnlichem Geschmack gestohlen. Die Vandalen verschwanden entweder durch den nördlichen oder den westlichen Ausgang.',
  'This is a narrow east-west passageway. There is a narrow stairway leading down at the north end of the room.':
    'Dies ist ein schmaler Ost-West-Gang. Am Nordende des Raumes führt eine schmale Treppe nach unten.',
  'This is a circular stone room with passages in all directions. Several of them have unfortunately been blocked by cave-ins.':
    'Dies ist ein runder Steinraum mit Gängen in allen Richtungen. Mehrere von ihnen sind leider durch Einstürze blockiert worden.',
  'This is a high north-south passage, which forks to the northeast.':
    'Dies ist ein hoher Nord-Süd-Gang, der sich nach Nordosten gabelt.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear the sound of flowing water from below.':
    'Du befindest dich am Südrand einer tiefen Schlucht. Gänge führen nach Osten, Nordwesten und Südwesten. Eine Treppe führt nach unten. Du hörst von unten das Geräusch fließenden Wassers.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear a loud roaring sound, like that of rushing water, from below.':
    'Du befindest dich am Südrand einer tiefen Schlucht. Gänge führen nach Osten, Nordwesten und Südwesten. Eine Treppe führt nach unten. Du hörst von unten ein lautes Tosen, wie das reißenden Wassers.',
  'You are in a long room on the south shore of a large lake, far too deep and wide for crossing.':
    'Du befindest dich in einem langen Raum am Südufer eines großen Sees, viel zu tief und breit zum Überqueren.',
  'There is a path along the stream to the east or west, a steep pathway climbing southwest along the edge of a chasm, and a path leading into a canyon to the southeast.':
    'Ein Pfad verläuft entlang des Baches nach Osten oder Westen, ein steiler Pfad steigt nach Südwesten am Rand eines Abgrunds hinauf, und ein Pfad führt nach Südosten in eine Schlucht.',
  'You are in a long room, to the north of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through the center of the room.':
    'Du befindest dich in einem langen Raum, im Norden dessen sich früher ein See befand. Doch da der Wasserstand gesunken ist, fließt nur noch ein breiter Bach durch die Mitte des Raumes.',
  'You are on what used to be a large lake, but which is now a large mud pile. There are "shores" to the north and south.':
    'Du befindest dich auf dem, was einst ein großer See war, nun aber ein großer Schlammhaufen ist. Es gibt „Ufer“ im Norden und Süden.',
  'You are in a large cavernous room, the south of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through there.':
    'Du befindest dich in einem großen höhlenartigen Raum, im Süden dessen sich früher ein See befand. Doch da der Wasserstand gesunken ist, fließt dort nur noch ein breiter Bach hindurch.',
  'You are standing on the top of the Flood Control Dam #3, which was quite a tourist attraction in times far distant. There are paths to the north, south, and west, and a scramble down.':
    'Du stehst oben auf dem Hochwasserschutzdamm Nr. 3, der in längst vergangenen Zeiten eine beachtliche Touristenattraktion war. Es gibt Pfade nach Norden, Süden und Westen sowie einen mühsamen Abstieg.',
  'This room appears to have been the waiting room for groups touring the dam. There are open doorways here to the north and east marked "Private", and there is a path leading south over the top of the dam.':
    'Dieser Raum scheint der Warteraum für Gruppen gewesen zu sein, die den Damm besichtigten. Es gibt hier offene Türdurchgänge nach Norden und Osten mit der Aufschrift „Privat“, und ein Pfad führt nach Süden über die Dammkrone.',
  'This is what appears to have been the maintenance room for Flood Control Dam #3. Apparently, this room has been ransacked recently, for most of the valuable equipment is gone. On the wall in front of you is a group of buttons colored blue, yellow, brown, and red. There are doorways to the west and south.':
    'Dies ist offenbar der ehemalige Wartungsraum des Hochwasserschutzdamms Nr. 3. Anscheinend wurde dieser Raum kürzlich geplündert, denn der größte Teil der wertvollen Ausrüstung ist verschwunden. An der Wand vor dir befindet sich eine Gruppe von Knöpfen in Blau, Gelb, Braun und Rot. Es gibt Türdurchgänge nach Westen und Süden.',
  'You are at the base of Flood Control Dam #3, which looms above you and to the north. The river Frigid is flowing by here. Along the river are the White Cliffs which seem to form giant walls stretching from north to south along the shores of the river as it winds its way downstream.':
    'Du befindest dich am Fuß des Hochwasserschutzdamms Nr. 3, der sich über dir und im Norden auftürmt. Der Fluss Frigid fließt hier vorbei. Entlang des Flusses ragen die Weißen Klippen empor, die riesige Mauern zu bilden scheinen und sich von Norden nach Süden entlang der Ufer des Flusses erstrecken, während er sich flussabwärts windet.',
  'You have entered a low cave with passages leading northwest and east.':
    'Du hast eine niedrige Höhle mit Gängen nach Nordwesten und Osten betreten.',
  'You are at the periphery of a large dome, which forms the ceiling of another room below. Protecting you from a precipitous drop is a wooden railing which circles the dome.':
    'Du befindest dich am Rand einer großen Kuppel, die die Decke eines anderen Raumes darunter bildet. Ein hölzernes Geländer, das die Kuppel umrundet, schützt dich vor einem jähen Absturz.',
  'This is a large room with a prominent doorway leading to a down staircase. Above you is a large dome. Up around the edge of the dome (20 feet up) is a wooden railing. In the center of the room sits a white marble pedestal.':
    'Dies ist ein großer Raum mit einem markanten Türdurchgang, der zu einer abwärtsführenden Treppe leitet. Über dir ist eine große Kuppel. Oben am Rand der Kuppel (20 Fuß hoch) verläuft ein hölzernes Geländer. In der Mitte des Raumes steht ein Sockel aus weißem Marmor.',
  'This is the north end of a large temple. On the east wall is an ancient inscription, probably a prayer in a long-forgotten language. Below the prayer is a staircase leading down. The west wall is solid granite. The exit to the north end of the room is through huge marble pillars.':
    'Dies ist das Nordende eines großen Tempels. An der Ostwand befindet sich eine uralte Inschrift, vermutlich ein Gebet in einer längst vergessenen Sprache. Unter dem Gebet führt eine Treppe nach unten. Die Westwand besteht aus massivem Granit. Der Ausgang am Nordende des Raumes führt zwischen riesigen Marmorsäulen hindurch.',
  'This is the south end of a large temple. In front of you is what appears to be an altar. In one corner is a small hole in the floor which leads into darkness. You probably could not get back up it.':
    'Dies ist das Südende eines großen Tempels. Vor dir befindet sich etwas, das wie ein Altar aussieht. In einer Ecke ist ein kleines Loch im Boden, das in die Dunkelheit führt. Du könntest da wahrscheinlich nicht wieder heraufkommen.',
  'This is a tiny cave with entrances west and north, and a dark, forbidding staircase leading down.':
    'Dies ist eine winzige Höhle mit Eingängen nach Westen und Norden und einer dunklen, abweisenden Treppe, die nach unten führt.',
  'This is a tiny cave with entrances west and north, and a staircase leading down.':
    'Dies ist eine winzige Höhle mit Eingängen nach Westen und Norden und einer Treppe, die nach unten führt.',
  'You are outside a large gateway, on which is inscribed':
    'Du stehst vor einem großen Tor, auf dem geschrieben steht',
  'Abandon every hope all ye who enter here!':
    'Lasst, die ihr eingeht, alle Hoffnung fahren!',
  'The gate is open; through it you can see a desolation, with a pile of mangled bodies in one corner. Thousands of voices, lamenting some hideous fate, can be heard.':
    'Das Tor steht offen; hindurch erblickst du eine Einöde, mit einem Haufen verstümmelter Leiber in einer Ecke. Tausende Stimmen sind zu hören, die ein grässliches Schicksal beklagen.',
  'You have entered the Land of the Living Dead. Thousands of lost souls can be heard weeping and moaning. In the corner are stacked the remains of dozens of previous adventurers less fortunate than yourself. A passage exits to the north.':
    'Du hast das Land der lebenden Toten betreten. Tausende verlorene Seelen sind zu hören, weinend und stöhnend. In der Ecke stapeln sich die Überreste Dutzender früherer Abenteurer, die weniger Glück hatten als du. Ein Gang führt nach Norden hinaus.',
  'You are in a large square room with tall ceilings. On the south wall is an enormous mirror which fills the entire wall. There are exits on the other three sides of the room.':
    'Du befindest dich in einem großen quadratischen Raum mit hohen Decken. An der Südwand hängt ein riesiger Spiegel, der die gesamte Wand ausfüllt. Es gibt Ausgänge an den drei anderen Seiten des Raumes.',
  'This is a cold and damp corridor where a long east-west passageway turns into a southward path.':
    'Dies ist ein kalter und feuchter Korridor, wo ein langer Ost-West-Gang in einen südwärts führenden Pfad übergeht.',
  'This is a small chamber, which appears to have been part of a coal mine. On the south wall of the chamber the letters "Granite Wall" are etched in the rock. To the east is a long passage, and there is a steep metal slide twisting downward. To the north is a small opening.':
    'Dies ist eine kleine Kammer, die ein Teil einer Kohlenmine gewesen zu sein scheint. An der Südwand der Kammer sind die Worte „Granitwand“ in den Fels geätzt. Im Osten ist ein langer Gang, und eine steile Metallrutsche windet sich nach unten. Im Norden ist eine kleine Öffnung.',
  'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward. The room is deafeningly loud with an undetermined rushing sound. The sound seems to reverberate from all of the walls, making it difficult even to think.':
    'Dies ist ein großer Raum mit einer Decke, die vom Boden aus nicht zu erkennen ist. Es gibt einen schmalen Gang von Osten nach Westen und eine steinerne Treppe, die nach oben führt. Der Raum ist ohrenbetäubend laut von einem unbestimmten Rauschen erfüllt. Der Klang scheint von allen Wänden widerzuhallen, sodass es sogar schwerfällt zu denken.',
  'This is an ancient room, long under water. There is an exit to the south and a staircase leading up.':
    'Dies ist ein uralter Raum, lange unter Wasser. Es gibt einen Ausgang nach Süden und eine Treppe, die nach oben führt.',
  'This is a long and narrow corridor where a long north-south passageway briefly narrows even further.':
    'Dies ist ein langer und schmaler Korridor, wo sich ein langer Nord-Süd-Gang kurz noch weiter verengt.',
  'You are standing at the entrance of what might have been a coal mine. The shaft enters the west wall, and there is another exit on the south end of the room.':
    'Du stehst am Eingang dessen, was eine Kohlenmine gewesen sein könnte. Der Schacht tritt in die Westwand ein, und es gibt einen weiteren Ausgang am Südende des Raumes.',
  'You are in a small room. Strange squeaky sounds may be heard coming from the passage at the north end. You may also escape to the east.':
    'Du befindest dich in einem kleinen Raum. Seltsame quietschende Geräusche sind aus dem Gang am Nordende zu hören. Du kannst auch nach Osten entkommen.',
  'You are in a small room which has doors only to the east and south.':
    'Du befindest dich in einem kleinen Raum, der nur Türen nach Osten und Süden hat.',
  'This is a large room, in the middle of which is a small shaft descending through the floor into darkness below. To the west and the north are exits from this room. Constructed over the top of the shaft is a metal framework to which a heavy iron chain is attached.':
    'Dies ist ein großer Raum, in dessen Mitte ein kleiner Schacht durch den Boden hinab in die Dunkelheit darunter führt. Im Westen und Norden befinden sich Ausgänge aus diesem Raum. Über dem Schacht ist ein Metallgerüst errichtet, an dem eine schwere eiserne Kette befestigt ist.',
  'This is a small nondescript room. However, from the direction of a small descending staircase a foul odor can be detected. To the south is a narrow tunnel.':
    'Dies ist ein kleiner, nichtssagender Raum. Aus Richtung einer kleinen abwärtsführenden Treppe ist jedoch ein übler Geruch wahrzunehmen. Im Süden ist ein schmaler Tunnel.',
  'This is a small room which smells strongly of coal gas. There is a short climb up some stairs and a narrow tunnel leading east.':
    'Dies ist ein kleiner Raum, der stark nach Kohlengas riecht. Es gibt einen kurzen Aufstieg über einige Stufen und einen schmalen Tunnel, der nach Osten führt.',
  'This is a nondescript part of a coal mine.':
    'Dies ist ein nichtssagender Teil einer Kohlenmine.',
  'This is a very small room. In the corner is a rickety wooden ladder, leading downward. It might be safe to descend. There is also a staircase leading upward.':
    'Dies ist ein sehr kleiner Raum. In der Ecke ist eine wackelige Holzleiter, die nach unten führt. Es ist vielleicht ungefährlich, hinabzusteigen. Es gibt auch eine Treppe, die nach oben führt.',
  'This is a rather wide room. On one side is the bottom of a narrow wooden ladder. To the west and the south are passages leaving the room.':
    'Dies ist ein ziemlich breiter Raum. Auf einer Seite ist das untere Ende einer schmalen Holzleiter. Nach Westen und Süden führen Gänge aus dem Raum.',
  'You have come to a dead end in the mine.':
    'Du bist in der Mine in eine Sackgasse geraten.',
  'This is a long and narrow passage, which is cluttered with broken timbers. A wide passage comes from the east and turns at the west end of the room into a very narrow passageway. From the west comes a strong draft.':
    'Dies ist ein langer und schmaler Gang, der mit zerbrochenen Balken vollgestopft ist. Ein breiter Gang kommt aus dem Osten und wird am Westende des Raumes zu einem sehr schmalen Durchgang. Aus dem Westen kommt ein starker Luftzug.',
  'This is a small drafty room in which is the bottom of a long shaft. To the south is a passageway and to the east a very narrow passage. In the shaft can be seen a heavy iron chain.':
    'Dies ist ein kleiner zugiger Raum, in dem das untere Ende eines langen Schachts liegt. Im Süden ist ein Gang und im Osten ein sehr schmaler Durchgang. Im Schacht ist eine schwere eiserne Kette zu sehen.',
  'This is a large, cold room whose sole exit is to the north. In one corner there is a machine which is reminiscent of a clothes dryer. On its face is a switch which is labelled "START". The switch does not appear to be manipulable by any human hand (unless the fingers are about 1/16 by 1/4 inch). On the front of the machine is a large lid, which is closed.':
    'Dies ist ein großer, kalter Raum, dessen einziger Ausgang nach Norden führt. In einer Ecke steht eine Maschine, die an einen Wäschetrockner erinnert. An ihrer Vorderseite ist ein Schalter mit der Aufschrift „START“. Der Schalter scheint von keiner menschlichen Hand bedient werden zu können (es sei denn, die Finger messen etwa 1/16 mal 1/4 Zoll). An der Vorderseite der Maschine ist ein großer Deckel, der geschlossen ist.',
  'This is a room which looks like an Egyptian tomb. There is an ascending staircase to the west.':
    'Dies ist ein Raum, der wie ein ägyptisches Grab aussieht. Im Westen führt eine Treppe nach oben.',
  'You are on the Frigid River in the vicinity of the Dam. The river flows quietly here. There is a landing on the west shore.':
    'Du befindest dich auf dem Frigid-Fluss in der Nähe des Damms. Der Fluss fließt hier ruhig dahin. Am Westufer gibt es eine Anlegestelle.',
  'The river turns a corner here making it impossible to see the Dam. The White Cliffs loom on the east bank and large rocks prevent landing on the west.':
    'Der Fluss macht hier eine Biegung, sodass der Damm nicht mehr zu sehen ist. Die Weißen Klippen ragen am Ostufer empor, und große Felsen verhindern ein Anlegen im Westen.',
  'The river descends here into a valley. There is a narrow beach on the west shore below the cliffs. In the distance a faint rumbling can be heard.':
    'Der Fluss steigt hier in ein Tal hinab. Am Westufer unterhalb der Klippen gibt es einen schmalen Strand. In der Ferne ist ein leises Grollen zu hören.',
  'The river is running faster here and the sound ahead appears to be that of rushing water. On the east shore is a sandy beach. A small area of beach can also be seen below the cliffs on the west shore.':
    'Der Fluss fließt hier schneller, und das Geräusch vor dir scheint das reißenden Wassers zu sein. Am Ostufer ist ein Sandstrand. Auch unterhalb der Klippen am Westufer ist ein kleiner Strandabschnitt zu sehen.',
  'You are on a large sandy beach on the east shore of the river, which is flowing quickly by. A path runs beside the river to the south here, and a passage is partially buried in sand to the northeast.':
    'Du befindest dich auf einem großen Sandstrand am Ostufer des Flusses, der rasch vorbeifließt. Ein Pfad verläuft hier neben dem Fluss nach Süden, und im Nordosten ist ein Gang teilweise im Sand vergraben.',
  'This is a sand-filled cave whose exit is to the southwest.':
    'Dies ist eine mit Sand gefüllte Höhle, deren Ausgang nach Südwesten führt.',
  'You are on the east shore of the river. The water here seems somewhat treacherous. A path travels from north to south here, the south end quickly turning around a sharp corner.':
    'Du befindest dich am Ostufer des Flusses. Das Wasser scheint hier etwas tückisch zu sein. Ein Pfad verläuft hier von Norden nach Süden, dessen Südende schnell um eine scharfe Ecke biegt.',
  'You are at the top of Aragain Falls, an enormous waterfall with a drop of about 450 feet. The only path here is on the north end.':
    'Du befindest dich oben an den Aragain-Fällen, einem gewaltigen Wasserfall mit einer Fallhöhe von etwa 450 Fuß. Der einzige Pfad hier ist am Nordende.',
  'You are on top of a rainbow (I bet you never thought you would walk on a rainbow), with a magnificent view of the Falls. The rainbow travels east-west here.':
    'Du befindest dich oben auf einem Regenbogen (ich wette, du hättest nie gedacht, dass du einmal auf einem Regenbogen gehen würdest), mit einer prächtigen Aussicht auf die Fälle. Der Regenbogen verläuft hier in Ost-West-Richtung.',
  'You are on a small, rocky beach on the continuation of the Frigid River past the Falls. The beach is narrow due to the presence of the White Cliffs. The river canyon opens here and sunlight shines in from above. A rainbow crosses over the falls to the east and a narrow path continues to the southwest.':
    'Du befindest dich auf einem kleinen, felsigen Strand am weiteren Verlauf des Frigid-Flusses hinter den Fällen. Der Strand ist wegen der Weißen Klippen schmal. Die Flussschlucht öffnet sich hier, und von oben fällt Sonnenlicht herein. Ein Regenbogen spannt sich nach Osten über die Fälle, und ein schmaler Pfad setzt sich nach Südwesten fort.',
  'You are beneath the walls of the river canyon which may be climbable here. The lesser part of the runoff of Aragain Falls flows by below. To the north is a narrow path.':
    'Du befindest dich unterhalb der Wände der Flussschlucht, die hier erkletterbar sein könnten. Der kleinere Teil des Abflusses der Aragain-Fälle fließt unten vorbei. Im Norden ist ein schmaler Pfad.',
  'You are on a ledge about halfway up the wall of the river canyon. You can see from here that the main flow from Aragain Falls twists along a passage which it is impossible for you to enter. Below you is the canyon bottom. Above you is more cliff, which appears climbable.':
    'Du befindest dich auf einem Vorsprung etwa auf halber Höhe der Wand der Flussschlucht. Von hier aus siehst du, dass sich der Hauptstrom der Aragain-Fälle einen Gang entlangwindet, den du unmöglich betreten kannst. Unter dir liegt der Talgrund der Schlucht. Über dir ragt weitere Felswand auf, die erkletterbar zu sein scheint.',
  'You are at the top of the Great Canyon on its west wall. From here there is a marvelous view of the canyon and parts of the Frigid River upstream. Across the canyon, the walls of the White Cliffs join the mighty ramparts of the Flathead Mountains to the east. Following the Canyon upstream to the north, Aragain Falls may be seen, complete with rainbow. The mighty Frigid River flows out from a great dark cavern. To the west and south can be seen an immense forest, stretching for miles around. A path leads northwest. It is possible to climb down into the canyon from here.':
    'Du befindest dich oben am Großen Canyon, an seiner Westwand. Von hier bietet sich ein herrlicher Blick auf die Schlucht und Teile des Frigid-Flusses flussaufwärts. Auf der anderen Seite der Schlucht treffen die Wände der Weißen Klippen im Osten auf die gewaltigen Bollwerke der Flathead-Berge. Folgt man der Schlucht flussaufwärts nach Norden, so sind die Aragain-Fälle samt Regenbogen zu sehen. Der mächtige Frigid-Fluss strömt aus einer großen dunklen Höhle. Nach Westen und Süden erstreckt sich ein unermesslicher Wald, der sich meilenweit ringsum ausdehnt. Ein Pfad führt nach Nordwesten. Von hier aus ist es möglich, in die Schlucht hinabzuklettern.',
  'You are standing in front of a massive barrow of stone. In the east face is a huge stone door which is open. You cannot see into the dark of the tomb.':
    'Du stehst vor einem mächtigen Hügelgrab aus Stein. In der Ostseite ist eine riesige steinerne Tür, die offen steht. Du kannst nicht in die Dunkelheit des Grabes hineinsehen.',
  'As you enter the barrow, the door closes inexorably behind you. Around you it is dark, but ahead is an enormous cavern, brightly lit. Through its center runs a wide stream. Spanning the stream is a small wooden footbridge, and beyond a path leads into a dark tunnel. Above the bridge, floating in the air, is a large sign. It reads: All ye who stand before this bridge have completed a great and perilous adventure which has tested your wit and courage. You have mastered the first part of the ZORK trilogy. Those who pass over this bridge must be prepared to undertake an even greater adventure that will severely test your skill and bravery!':
    'Als du das Hügelgrab betrittst, schließt sich die Tür unerbittlich hinter dir. Um dich herum ist es dunkel, doch vor dir liegt eine gewaltige, hell erleuchtete Höhle. Durch ihre Mitte fließt ein breiter Bach. Über den Bach spannt sich eine kleine hölzerne Fußgängerbrücke, und dahinter führt ein Pfad in einen dunklen Tunnel. Über der Brücke, in der Luft schwebend, ist ein großes Schild. Darauf steht: Ihr alle, die ihr vor dieser Brücke steht, habt ein großes und gefährliches Abenteuer vollbracht, das euren Verstand und euren Mut auf die Probe gestellt hat. Ihr habt den ersten Teil der ZORK-Trilogie gemeistert. Wer über diese Brücke geht, muss bereit sein, ein noch größeres Abenteuer zu wagen, das euer Geschick und eure Tapferkeit auf eine harte Probe stellen wird!',
  'Damp Cave': 'Feuchte Höhle',
  'Frigid River': 'Frigid-Fluss',
  "ZORK owner's manual": 'ZORK-Benutzerhandbuch',
  'Stream View': 'Blick auf den Bach',
  Stream: 'Bach',
  'Twisting Passage': 'Gewundener Gang',
  Chasm: 'Abgrund',
  'Winding Passage': 'Verschlungener Gang',
  'White Cliffs Beach': 'Strand der Weißen Klippen',
  'Grating Room': 'Gitterraum',
  Studio: 'Atelier',
  'Commandment #12592': 'Gebot Nr. 12592',
  'Oh, no! A lurking grue slithered into the room and devoured you!':
    'Oh nein! Ein lauernder Grue glitt in den Raum und verschlang dich!',
  'Your load is too heavy.': 'Deine Last ist zu schwer.',
  'Your load is too heavy, especially in light of your condition.':
    'Deine Last ist zu schwer, besonders angesichts deines Zustands.',
  'The room looks strange and unearthly.':
    'Der Raum sieht seltsam und überirdisch aus.',
  'The room looks strange and unearthly and objects appear indistinct.':
    'Der Raum sieht seltsam und überirdisch aus, und die Gegenstände erscheinen verschwommen.',
  'This gives you the rank of Wizard.':
    'Das verleiht dir den Rang eines Zauberers.',
  'This gives you the rank of Master.':
    'Das verleiht dir den Rang eines Meisters.',
  'This gives you the rank of Adventurer.':
    'Das verleiht dir den Rang eines Abenteurers.',
  'This gives you the rank of Junior Adventurer.':
    'Das verleiht dir den Rang eines Junior-Abenteurers.',
  'This gives you the rank of Novice Adventurer.':
    'Das verleiht dir den Rang eines Anfänger-Abenteurers.',
  'This gives you the rank of Amateur Adventurer.':
    'Das verleiht dir den Rang eines Amateur-Abenteurers.',
  'This gives you the rank of Beginner.':
    'Das verleiht dir den Rang eines Anfängers.',
  'You can expect death soon.': 'Du kannst bald mit dem Tod rechnen.',
  'You can be killed by one more light wound.':
    'Eine weitere leichte Wunde kann dich töten.',
  'You can be killed by a serious wound.':
    'Eine schwere Wunde kann dich töten.',
  'You can survive one serious wound.':
    'Du kannst eine schwere Wunde überleben.',
  'You can survive several wounds.': 'Du kannst mehrere Wunden überleben.',
  'You have been killed once.': 'Du bist einmal getötet worden.',
  'You have been killed twice.': 'Du bist zweimal getötet worden.',
  'The thief swings it out of your reach.':
    'Der Dieb schwingt es außer deine Reichweite.',
  "The stiletto seems white-hot. You can't hold on to it.":
    'Das Stilett scheint weißglühend zu sein. Du kannst es nicht festhalten.',
  'The lamp is on.': 'Die Lampe ist an.',
  'The lamp is turned off.': 'Die Lampe ist ausgeschaltet.',
  'The lamp has burned out.': 'Die Lampe ist ausgebrannt.',
  'The candles are already lit.': 'Die Kerzen sind bereits angezündet.',
  'The candles are burning.': 'Die Kerzen brennen.',
  'The candles are out.': 'Die Kerzen sind erloschen.',
  'The chimney leads upward, and looks climbable.':
    'Der Kamin führt nach oben und sieht erkletterbar aus.',
  'The chimney leads downward, and looks climbable.':
    'Der Kamin führt nach unten und sieht erkletterbar aus.',
  'The lights within the room shut off.': 'Die Lichter im Raum gehen aus.',
  'The lights within the room come on.': 'Die Lichter im Raum gehen an.',
  'The rug is too heavy to lift.': 'Der Teppich ist zu schwer zum Anheben.',
  'The rug is too heavy to lift, but in trying to take it you have noticed an irregularity beneath it.':
    'Der Teppich ist zu schwer zum Anheben, doch beim Versuch, ihn zu nehmen, hast du eine Unregelmäßigkeit darunter bemerkt.',
  'The water level here is now up to your ankles.':
    'Der Wasserstand reicht dir hier nun bis zu den Knöcheln.',
  'The water level here is now up to your shin.':
    'Der Wasserstand reicht dir hier nun bis zum Schienbein.',
  'The water level here is now up to your knees.':
    'Der Wasserstand reicht dir hier nun bis zu den Knien.',
  'The water level here is now up to your hips.':
    'Der Wasserstand reicht dir hier nun bis zu den Hüften.',
  'The water level here is now up to your waist.':
    'Der Wasserstand reicht dir hier nun bis zur Taille.',
  'The water level here is now up to your chest.':
    'Der Wasserstand reicht dir hier nun bis zur Brust.',
  'The water level here is now up to your neck.':
    'Der Wasserstand reicht dir hier nun bis zum Hals.',
  'The water level here is now over your head.':
    'Der Wasserstand reicht dir hier nun über den Kopf.',
  'The water level here is now high in your lungs.':
    'Der Wasserstand steht dir hier nun hoch in den Lungen.',
  "Swimming isn't usually allowed in the dungeon.":
    'Schwimmen ist im Verlies normalerweise nicht gestattet.',
  'You are on the river, or have you forgotten?':
    'Du bist auf dem Fluss, oder hast du das vergessen?',
  'You are on the reservoir, or have you forgotten?':
    'Du bist auf dem Stausee, oder hast du das vergessen?',
  'You are on the stream, or have you forgotten?':
    'Du bist auf dem Bach, oder hast du das vergessen?',
  'There are lots of coins in there.': 'Da drin sind jede Menge Münzen.',
  'There are lots of jewels in there.': 'Da drin sind jede Menge Juwelen.',
  "The coins are safely inside; there's no need to do that.":
    'Die Münzen sind sicher drinnen; das ist nicht nötig.',
  "The jewels are safely inside; there's no need to do that.":
    'Die Juwelen sind sicher drinnen; das ist nicht nötig.',
  'You can see a clear area leading towards a forest.':
    'Du siehst eine freie Fläche, die zu einem Wald hinführt.',
  'You can see what appears to be a kitchen.':
    'Du siehst etwas, das wie eine Küche aussieht.',
  'Nice view, lousy place to jump.':
    'Schöne Aussicht, mieser Ort zum Springen.',
  'This boat is guaranteed against all defects for a period of 76 milliseconds from date of purchase or until first used, whichever comes first.':
    'Dieses Boot ist gegen alle Mängel für einen Zeitraum von 76 Millisekunden ab Kaufdatum oder bis zur ersten Benutzung garantiert, je nachdem, was zuerst eintritt.',
  'Warning:': 'Warnung:',
  'This boat is made of thin plastic.':
    'Dieses Boot besteht aus dünnem Plastik.',
  'Good Luck!': 'Viel Glück!',
  'The cyclops prefers eating to making conversation.':
    'Der Zyklop zieht es vor, zu essen, statt sich zu unterhalten.',
  'The construction of FCD#3 took 112 days from ground breaking to the dedication. It required a work force of 384 slaves, 34 slave drivers, 12 engineers, 2 turtle doves, and a partridge in a pear tree. The work was managed by a command team composed of 2345 bureaucrats, 2347 secretaries (at least two of whom could type), 12,256 paper shufflers, 52,469 rubber stampers, 245,193 red tape processors, and nearly one million dead trees.':
    'Der Bau von FCD#3 dauerte 112 Tage vom ersten Spatenstich bis zur Einweihung. Er erforderte eine Arbeitsmannschaft von 384 Sklaven, 34 Sklaventreibern, 12 Ingenieuren, 2 Turteltauben und einem Rebhuhn in einem Birnbaum. Die Arbeiten wurden von einem Leitungsteam aus 2345 Bürokraten, 2347 Sekretärinnen (von denen mindestens zwei tippen konnten), 12.256 Papierschiebern, 52.469 Stempeldrückern, 245.193 Bürokratie-Bearbeitern und beinahe einer Million toter Bäume verwaltet.',
  'We will now point out some of the more interesting features of FCD#3 as we conduct you on a guided tour of the facilities:':
    'Wir werden dich nun auf einige der interessanteren Merkmale von FCD#3 hinweisen, während wir dich auf einer Führung durch die Anlage geleiten:',
  '"Flood Control Dam #3': '„Hochwasserschutzdamm Nr. 3',
  '1) You start your tour here in the Dam Lobby. You will notice on your right that....':
    '1) Du beginnst deine Tour hier in der Dammhalle. Zu deiner Rechten wirst du bemerken, dass....',
  'Hello, Sailor!': 'Hallo, Seemann!',
  'Instructions for use:': 'Gebrauchsanweisung:',
  'To get into a body of water, say "Launch".':
    'Um in ein Gewässer zu gelangen, sage „Launch“.',
  'To get to shore, say "Land" or the direction in which you want to maneuver the boat.':
    'Um ans Ufer zu gelangen, sage „Land“ oder die Richtung, in die du das Boot manövrieren willst.',
  'Warranty:': 'Garantie:',
  'Surely, thy eye shall be put out with a sharp stick!':
    'Wahrlich, dein Auge soll mit einem spitzen Stock ausgestochen werden!',
  'Even unto the ends of the earth shalt thou wander and':
    'Bis an die Enden der Erde sollst du wandern, und',
  'Unto the land of the dead shalt thou be sent at last.':
    'In das Land der Toten sollst du am Ende gesandt werden.',
  'Surely thou shalt repent of thy cunning.':
    'Wahrlich, du wirst deine List bereuen.',
  'The ground is too hard for digging here.':
    'Der Boden ist hier zu hart zum Graben.',
  'There is a suspicious-looking individual, holding a bag, leaning against one wall. He is armed with a vicious-looking stiletto.':
    'Da lehnt eine verdächtig wirkende Gestalt mit einem Sack in der Hand an einer Wand. Sie ist mit einem bösartig aussehenden Stilett bewaffnet.',
  'You should say whether you want to go up or down.':
    'Du solltest sagen, ob du hinauf oder hinunter willst.',
  'There is a suspicious-looking individual lying unconscious on the ground.':
    'Eine verdächtig wirkende Gestalt liegt bewusstlos auf dem Boden.',
  "The door won't budge.": 'Die Tür rührt sich nicht.',
  'The candles are becoming quite short.': 'Die Kerzen werden ziemlich kurz.',
  'You must perform the ceremony.': 'Du musst die Zeremonie vollziehen.',
  'You are on a narrow strip of beach which runs along the base of the White Cliffs. There is a narrow path heading south along the Cliffs and a tight passage leading west into the cliffs themselves.':
    'Du befindest dich auf einem schmalen Strandstreifen, der am Fuß der Weißen Klippen entlangläuft. Ein schmaler Pfad führt nach Süden entlang der Klippen, und ein enger Durchgang führt nach Westen in die Klippen selbst hinein.',
  'You tumble down the slide....': 'Du purzelst die Rutsche hinunter....',
  'This has no effect.': 'Das hat keine Wirkung.',
  "It's really not clear how.": 'Es ist wirklich nicht klar, wie.',
  'You cannot climb any higher.': 'Du kannst nicht höher klettern.',
  "You can't tie anything to yourself.":
    'Du kannst nichts an dich selbst binden.',
  'You cannot fit through this passage with that load.':
    'Mit dieser Last passt du nicht durch diesen Durchgang.',
  'What a loony!': 'Was für ein Verrückter!',
  'This cannot be tied, so it cannot be untied!':
    'Das kann nicht gebunden werden, also kann es auch nicht gelöst werden!',
  'You cannot go down without fracturing many bones.':
    'Du kannst nicht hinunter, ohne dir viele Knochen zu brechen.',
  'A hot pepper sandwich is here.':
    'Hier liegt ein Sandwich mit scharfen Pfefferschoten.',
  '(Close cover before striking)': '(Deckel schließen, bevor du anreibst)',
  'YOU too can make BIG MONEY in the exciting field of PAPER SHUFFLING!':
    'AUCH DU kannst GROSSES GELD verdienen im aufregenden Bereich des PAPIERSCHIEBENS!',
  'Mr. Anderson of Muddle, Mass. says: "Before I took this course I was a lowly bit twiddler. Now with what I learned at GUE Tech I feel really important and can obfuscate and confuse with the best."':
    'Herr Anderson aus Muddle, Mass., sagt: „Bevor ich diesen Kurs belegte, war ich ein niederer Bit-Dreher. Jetzt, mit dem, was ich an der GUE Tech gelernt habe, fühle ich mich richtig wichtig und kann mit den Besten verschleiern und verwirren.“',
  'Dr. Blank had this to say: "Ten short days ago all I could look forward to was a dead-end job as a doctor. Now I have a promising future and make really big Zorkmids."':
    'Dr. Blank hatte dazu Folgendes zu sagen: „Vor zehn kurzen Tagen hatte ich nur einen Job ohne Zukunft als Arzt vor mir. Jetzt habe ich eine vielversprechende Zukunft und verdiene richtig dicke Zorkmids.“',
  "GUE Tech can't promise these fantastic results to everyone. But when you earn your degree from GUE Tech, your future will be brighter.":
    'GUE Tech kann diese fantastischen Ergebnisse nicht jedem versprechen. Aber wenn du deinen Abschluss an der GUE Tech machst, wird deine Zukunft heller sein.',
  'You cannot reach the rope.': 'Du kannst das Seil nicht erreichen.',
  'Storm-tossed trees block your way.':
    'Vom Sturm gefällte Bäume versperren dir den Weg.',
  'In the trophy case is an ancient parchment which appears to be a map.':
    'In der Trophäenvitrine liegt ein uraltes Pergament, das eine Karte zu sein scheint.',
  'The map shows a forest with three clearings. The largest clearing contains a house. Three paths leave the large clearing. One of these paths, leading southwest, is marked "To Stone Barrow".':
    'Die Karte zeigt einen Wald mit drei Lichtungen. Die größte Lichtung enthält ein Haus. Drei Pfade verlassen die große Lichtung. Einer dieser Pfade, der nach Südwesten führt, ist mit „Zum Steinhügelgrab“ gekennzeichnet.',
  'It is too narrow for most insects.':
    'Für die meisten Insekten ist es zu eng.',
  'This cave has exits to the west and east, and narrows to a crack toward the south. The earth is particularly damp here.':
    'Diese Höhle hat Ausgänge nach Westen und Osten und verengt sich nach Süden hin zu einem Spalt. Die Erde ist hier besonders feucht.',
  'Only Santa Claus climbs down chimneys.':
    'Nur der Weihnachtsmann klettert Schornsteine hinunter.',
  'The forest becomes impenetrable to the north.':
    'Nach Norden hin wird der Wald undurchdringlich.',
  'There is no tree here suitable for climbing.':
    'Hier gibt es keinen Baum, der sich zum Klettern eignet.',
  'You try to ascend the ramp, but it is impossible, and you slide back down.':
    'Du versuchst, die Rampe hinaufzusteigen, aber es ist unmöglich, und du rutschst wieder hinunter.',
  'The White Cliffs prevent your landing here.':
    'Die Weißen Klippen hindern dich daran, hier anzulegen.',
  'You cannot go upstream due to strong currents.':
    'Du kannst wegen der starken Strömung nicht flussaufwärts fahren.',
  'Some invisible force prevents you from passing through the gate.':
    'Eine unsichtbare Kraft hindert dich daran, durch das Tor zu treten.',
  'Loosely attached to a wall is a small piece of paper.':
    'Lose an einer Wand befestigt ist ein kleiner Zettel.',
  'Congratulations!': 'Glückwunsch!',
  'You are the privileged owner of ZORK I: The Great Underground Empire, a self-contained and self-maintaining universe. If used and maintained in accordance with normal operating practices for small universes, ZORK will provide many months of trouble-free operation.':
    'Du bist der privilegierte Besitzer von ZORK I: Das Große Unterirdische Reich, einem in sich geschlossenen und sich selbst wartenden Universum. Bei Benutzung und Wartung gemäß den üblichen Betriebsregeln für kleine Universen wird ZORK dir viele Monate störungsfreien Betrieb bieten.',
  "It's a long way...": 'Es ist ein weiter Weg...',
  'The troll neatly removes your head.':
    'Der Troll entfernt sauber deinen Kopf.',
  'Fweep!': 'Fweep!',
  'The sound of rushing water is nearly unbearable here. On the east shore is a large landing area.':
    'Das Rauschen des strömenden Wassers ist hier beinahe unerträglich. Am Ostufer befindet sich ein großer Anlegeplatz.',
  "The door is boarded and you can't remove the boards.":
    'Die Tür ist verbarrikadiert, und du kannst die Bretter nicht entfernen.',
  'The stream emerges from a spot too small for you to enter.':
    'Der Bach tritt aus einer Stelle hervor, die zu klein ist, als dass du hineinpasstest.',
  'You are standing on a path beside a gently flowing stream. The path follows the stream, which flows from west to east.':
    'Du stehst auf einem Pfad neben einem sanft dahinfließenden Bach. Der Pfad folgt dem Bach, der von Westen nach Osten fließt.',
  'The prayer is inscribed in an ancient script, rarely used today. It seems to be a philippic against small insects, absent-mindedness, and the picking up and dropping of small objects. The final verse consigns trespassers to the land of the dead. All evidence indicates that the beliefs of the ancient Zorkers were obscure.':
    'Das Gebet ist in einer uralten, heute selten gebrauchten Schrift verfasst. Es scheint eine Brandrede gegen kleine Insekten, Zerstreutheit und das Aufheben und Fallenlassen kleiner Gegenstände zu sein. Der letzte Vers verbannt Eindringlinge in das Land der Toten. Alles deutet darauf hin, dass die Überzeugungen der alten Zorker dunkel waren.',
  'The door is nailed shut.': 'Die Tür ist zugenagelt.',
  'Getting tired?': 'Wirst du müde?',
  'A small leaflet is on the ground.':
    'Ein kleines Faltblatt liegt auf dem Boden.',
  '"WELCOME TO ZORK!': '„WILLKOMMEN BEI ZORK!',
  'ZORK is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals. No computer should be without one!"':
    'ZORK ist ein Spiel voller Abenteuer, Gefahr und niederer List. Darin wirst du einige der erstaunlichsten Gebiete erkunden, die je von Sterblichen erblickt wurden. Kein Computer sollte ohne eines sein!“',
  'The east wall is solid rock.': 'Die Ostwand ist massiver Fels.',
  "The cyclops doesn't look like he'll let you past.":
    'Der Zyklop sieht nicht so aus, als würde er dich vorbeilassen.',
  'There is a golden clockwork canary nestled in the egg. It has ruby eyes and a silver beak. Through a crystal window below its left wing you can see intricate machinery inside. It appears to have wound down.':
    'Im Ei eingebettet liegt ein goldener Uhrwerkkanarienvogel. Er hat Rubinaugen und einen silbernen Schnabel. Durch ein Kristallfenster unter seinem linken Flügel kannst du im Inneren ein kunstvolles Räderwerk erkennen. Er scheint abgelaufen zu sein.',
  'The engravings were incised in the living rock of the cave wall by an unknown hand. They depict, in symbolic form, the beliefs of the ancient Zorkers. Skillfully interwoven with the bas reliefs are excerpts illustrating the major religious tenets of that time. Unfortunately, a later age seems to have considered them blasphemous and just as skillfully excised them.':
    'Die Gravuren wurden von unbekannter Hand in den gewachsenen Fels der Höhlenwand geritzt. Sie stellen in symbolischer Form die Überzeugungen der alten Zorker dar. Kunstvoll mit den Flachreliefs verflochten sind Auszüge, welche die wichtigsten Glaubenssätze jener Zeit veranschaulichen. Leider scheint eine spätere Epoche sie für gotteslästerlich gehalten und ebenso kunstvoll herausgemeißelt zu haben.',
  'The channel is too narrow.': 'Die Fahrrinne ist zu eng.',
  'You are on the gently flowing stream. The upstream route is too narrow to navigate, and the downstream route is invisible due to twisting walls. There is a narrow beach to land on.':
    'Du befindest dich auf dem sanft dahinfließenden Bach. Die Route flussaufwärts ist zu eng, um sie zu befahren, und die Route flussabwärts ist wegen der gewundenen Wände nicht zu sehen. Es gibt einen schmalen Strand zum Anlegen.',
  'Climbing the walls is to no avail.': 'Das Erklimmen der Wände nützt nichts.',
  'You would need a machete to go further west.':
    'Du bräuchtest eine Machete, um weiter nach Westen zu gelangen.',
  'A painting by a neglected genius is here.':
    'Hier hängt ein Gemälde eines verkannten Genies.',
  'The dam blocks your way.': 'Der Damm versperrt dir den Weg.',
  'Nobody seems to be awaiting your answer.':
    'Niemand scheint auf deine Antwort zu warten.',
  "You're nuts!": 'Du bist verrückt!',
  'As the knife approaches its victim, your mind is submerged by an overmastering will. Slowly, your hand turns, until the rusty blade is an inch from your neck. The knife seems to sing as it savagely slits your throat.':
    'Während sich das Messer seinem Opfer nähert, wird dein Geist von einem übermächtigen Willen überflutet. Langsam dreht sich deine Hand, bis die rostige Klinge einen Zoll von deinem Hals entfernt ist. Das Messer scheint zu singen, während es dir wild die Kehle aufschlitzt.',
  'The engravings translate to "This space intentionally left blank."':
    'Die Gravuren bedeuten übersetzt „Diese Fläche wurde absichtlich leer gelassen.“',
  'This is a winding passage. It seems that there are only exits on the east and north.':
    'Dies ist ein gewundener Gang. Es scheint, als gäbe es nur Ausgänge nach Osten und Norden.',
  'A look before leaping reveals that the river is wide and dangerous, with swift currents and large, half-hidden rocks. You decide to forgo your swim.':
    'Ein Blick vor dem Sprung zeigt, dass der Fluss breit und gefährlich ist, mit reißenden Strömungen und großen, halb verborgenen Felsen. Du beschließt, auf dein Bad zu verzichten.',
  'Are you out of your mind?': 'Hast du den Verstand verloren?',
  'A chasm runs southwest to northeast and the path follows it. You are on the south side of the chasm, where a crack opens into a passage.':
    'Eine Kluft verläuft von Südwesten nach Nordosten, und der Pfad folgt ihr. Du befindest dich auf der Südseite der Kluft, wo sich ein Spalt zu einem Gang öffnet.',
  "Sounds reasonable, but this isn't how.":
    'Klingt vernünftig, aber so geht es nicht.',
  'There is a somewhat ruined egg here.':
    'Hier liegt ein ziemlich ramponiertes Ei.',
  'The rank undergrowth prevents eastward movement.':
    'Das wuchernde Unterholz verhindert ein Vorankommen nach Osten.',
  'You would drown.': 'Du würdest ertrinken.',
  'The troll fends you off with a menacing gesture.':
    'Der Troll wehrt dich mit einer drohenden Geste ab.',
  "You haven't a prayer of getting the coffin down there.":
    'Du hast nicht die geringste Chance, den Sarg dort hinunterzubringen.',
  'The windows are all boarded.': 'Die Fenster sind alle verbarrikadiert.',
  'You probably put spinach in your gas tank, too.':
    'Du füllst wahrscheinlich auch Spinat in deinen Benzintank.',
  'There is nothing but dust there.': 'Dort ist nichts als Staub.',
  'You have come to a dead end in the maze.':
    'Du bist in eine Sackgasse des Labyrinths gelangt.',
  'There is a golden clockwork canary nestled in the egg. It seems to have recently had a bad experience. The mountings for its jewel-like eyes are empty, and its silver beak is crumpled. Through a cracked crystal window below its left wing you can see the remains of intricate machinery. It is not clear what result winding it would have, as the mainspring seems sprung.':
    'Im Ei eingebettet liegt ein goldener Uhrwerkkanarienvogel. Er scheint kürzlich eine schlimme Erfahrung gemacht zu haben. Die Fassungen für seine juwelengleichen Augen sind leer, und sein silberner Schnabel ist verbeult. Durch ein gesprungenes Kristallfenster unter seinem linken Flügel kannst du die Überreste eines kunstvollen Räderwerks erkennen. Es ist unklar, was ein Aufziehen bewirken würde, da die Hauptfeder gebrochen zu sein scheint.',
  'On the ground is a pile of leaves.': 'Auf dem Boden liegt ein Haufen Laub.',
  "You can't even do that.": 'Nicht einmal das kannst du tun.',
  'The path is too narrow.': 'Der Pfad ist zu schmal.',
  'You are on a rocky, narrow strip of beach beside the Cliffs. A narrow path leads north along the shore.':
    'Du befindest dich auf einem felsigen, schmalen Strandstreifen neben den Klippen. Ein schmaler Pfad führt am Ufer entlang nach Norden.',
  'The mountains are impassable.': 'Die Berge sind unpassierbar.',
  'The forest thins out, revealing impassable mountains.':
    'Der Wald lichtet sich und gibt den Blick auf unpassierbare Berge frei.',
  'How, exactly, can you ring that?': 'Wie genau willst du das läuten?',
  'Just in time you steer away from the rocks.':
    'Gerade noch rechtzeitig steuerst du an den Felsen vorbei.',
  'There is no safe landing spot here.':
    'Hier gibt es keine sichere Anlegestelle.',
  'Nothing happens.': 'Nichts geschieht.',
  'You can land either to the east or the west.':
    'Du kannst entweder im Osten oder im Westen anlegen.',
  'There is an enormous diamond (perfectly cut) here.':
    'Hier liegt ein riesiger Diamant (perfekt geschliffen).',
  'A hungry cyclops is standing at the foot of the stairs.':
    'Ein hungriger Zyklop steht am Fuß der Treppe.',
  'Oh ye who go about saying unto each: "Hello sailor":':
    'O ihr, die ihr umhergeht und zu einem jeden sprecht: „Hallo, Seemann“:',
  'Dost thou know the magnitude of thy sin before the gods?':
    'Kennst du das Ausmaß deiner Sünde vor den Göttern?',
  'Yea, verily, thou shalt be ground between two stones.':
    'Ja, wahrlich, du sollst zwischen zwei Steinen zermahlen werden.',
  'Shall the angry gods cast thy body into the whirlpool?':
    'Werden die zornigen Götter deinen Leib in den Strudel werfen?',
  'An ornamented sceptre, tapering to a sharp point, is here.':
    'Hier liegt ein verziertes Zepter, das zu einer scharfen Spitze zuläuft.',
  "This appears to have been an artist's studio. The walls and floors are splattered with paints of 69 different colors. Strangely enough, nothing of value is hanging here. At the south end of the room is an open door (also covered with paint). A dark and narrow chimney leads up from a fireplace; although you might be able to get up it, it seems unlikely you could get back down.":
    'Dies scheint einst das Atelier eines Künstlers gewesen zu sein. Die Wände und Böden sind mit Farben in 69 verschiedenen Farbtönen bespritzt. Seltsamerweise hängt hier nichts von Wert. Am Südende des Raumes befindet sich eine offene Tür (ebenfalls mit Farbe bedeckt). Ein dunkler und enger Schornstein führt von einer Feuerstelle nach oben; obwohl du vielleicht hinaufgelangen könntest, erscheint es unwahrscheinlich, dass du wieder herunterkämest.',
  'There is an old trunk here, bulging with assorted jewels.':
    'Hier steht eine alte Truhe, prall gefüllt mit allerlei Juwelen.',
  'The chests are all empty.': 'Die Kisten sind alle leer.',
  "You wouldn't fit and would die if you could.":
    'Du würdest nicht hineinpassen und würdest sterben, wenn du es könntest.',
  'The chasm probably leads straight to the infernal regions.':
    'Die Kluft führt wahrscheinlich geradewegs in die höllischen Gefilde.',
  'You should have looked before you leaped.':
    'Du hättest erst schauen sollen, bevor du sprangst.',
  'In the movies, your life would be passing before your eyes.':
    'Im Film würde dein Leben jetzt vor deinen Augen vorüberziehen.',
  'Geronimo...': 'Geronimo...',
  'Very good. Now you can go to the second grade.':
    'Sehr gut. Jetzt darfst du in die zweite Klasse.',
  'Are you enjoying yourself?': 'Amüsierst du dich gut?',
  'Do you expect me to applaud?': 'Erwartest du, dass ich applaudiere?',
  "You can't swim in the dungeon.": 'Im Verlies kann man nicht schwimmen.',
  'Hello.': 'Hallo.',
  'Good day.': 'Guten Tag.',
  "Nice weather we've been having lately.":
    'Schönes Wetter haben wir in letzter Zeit.',
  'Goodbye.': 'Auf Wiedersehen.',
  'A valiant attempt.': 'Ein tapferer Versuch.',
  "You can't be serious.": 'Das kann nicht dein Ernst sein.',
  'An interesting idea...': 'Eine interessante Idee...',
  'What a concept!': 'Was für ein Einfall!',
  'Look around.': 'Sieh dich um.',
  'Too late for that.': 'Dafür ist es zu spät.',
  'Have your eyes checked.': 'Lass deine Augen untersuchen.',
  'With the leaves moved, a grating is revealed.':
    'Nachdem das Laub beiseitegeräumt wurde, kommt ein Gitter zum Vorschein.',
  'A shimmering pot of gold appears at the end of the rainbow.':
    'Ein schimmernder Topf voll Gold erscheint am Ende des Regenbogens.',
  'The lamp has smashed into the floor, and the light has gone out.':
    'Die Lampe ist auf den Boden geknallt, und das Licht ist erloschen.',
  'You look before leaping, and realize that you would never survive.':
    'Du schaust, bevor du springst, und erkennst, dass du es niemals überleben würdest.',
  'A sound, like that of flowing water, starts to come from below.':
    'Ein Geräusch, wie das von fließendem Wasser, beginnt von unten heraufzudringen.',
  'You can\'t launch that by saying "launch"!':
    'Das kannst du nicht zu Wasser lassen, indem du „launch“ sagst!',
  'Sorry, my memory is poor. Please give a direction.':
    'Tut mir leid, mein Gedächtnis ist schlecht. Bitte gib eine Richtung an.',
  "The candles won't last long now.":
    'Die Kerzen halten jetzt nicht mehr lange.',
  "Your bare hands don't appear to be enough.":
    'Deine bloßen Hände scheinen nicht auszureichen.',
  "I'd sooner kiss a pig.": 'Da würde ich lieber ein Schwein küssen.',
  'How can you inflate that?': 'Wie willst du das aufblasen?',
  "Why don't you just walk like normal people?":
    'Warum gehst du nicht einfach wie normale Menschen?',
  'The incantation echoes back faintly, but nothing else happens.':
    'Die Beschwörung hallt schwach zurück, aber sonst geschieht nichts.',
  'You will be lost without me!': 'Ohne mich bist du verloren!',
  'Bizarre!': 'Bizarr!',
  "You can't fit through the crack.": 'Durch den Spalt passt du nicht.',
  'There is no granite wall here.': 'Hier gibt es keine Granitwand.',
  'The bat grabs you by the scruff of your neck and lifts you away....':
    'Die Fledermaus packt dich am Genick und trägt dich davon....',
  'The trophy case is securely fastened to the wall.':
    'Die Trophäenvitrine ist fest an der Wand verankert.',
  "Nobody's home.": 'Es ist niemand zu Hause.',
  'The mirror is broken into many pieces.':
    'Der Spiegel ist in viele Stücke zerbrochen.',
  "I suppose you think it's a magic carpet?":
    'Ich nehme an, du hältst ihn für einen fliegenden Teppich?',
  'You are on the lake. Beaches can be seen north and south. Upstream a small stream enters the lake through a narrow cleft in the rocks. The dam can be seen downstream.':
    'Du befindest dich auf dem See. Im Norden und Süden sind Strände zu sehen. Flussaufwärts mündet ein kleiner Bach durch eine schmale Felsspalte in den See. Flussabwärts ist der Damm zu sehen.',
  'The cyclops seems somewhat agitated.': 'Der Zyklop wirkt etwas aufgeregt.',
  'The cyclops appears to be getting more agitated.':
    'Der Zyklop scheint immer aufgeregter zu werden.',
  'The cyclops is moving about the room, looking for something.':
    'Der Zyklop bewegt sich durch den Raum und sucht nach etwas.',
  'The cyclops was looking for salt and pepper. No doubt they are condiments for his upcoming snack.':
    'Der Zyklop suchte nach Salz und Pfeffer. Zweifellos sind das Gewürze für seinen bevorstehenden Imbiss.',
  'The cyclops is moving toward you in an unfriendly manner.':
    'Der Zyklop bewegt sich auf eine unfreundliche Art auf dich zu.',
  'You have two choices: 1. Leave 2. Become dinner.':
    'Du hast zwei Möglichkeiten: 1. Gehen 2. Zum Abendessen werden.',
  'The lamp is definitely dimmer now.':
    'Die Lampe ist jetzt eindeutig schwächer.',
  'The lamp is nearly out.': 'Die Lampe ist fast erloschen.',
  'The candles grow shorter.': 'Die Kerzen werden kürzer.',
  'Your stroke lands, but it was only the flat of the blade.':
    'Dein Hieb trifft, aber es war nur die flache Seite der Klinge.',
  'You must be joking.': 'Das soll wohl ein Scherz sein.',
  'Slash! Your blow lands! That one hit an artery, it could be serious!':
    'Hieb! Dein Schlag sitzt! Der hat eine Arterie getroffen, das könnte ernst werden!',
  'Slash! Your stroke connects! This could be serious!':
    'Hieb! Dein Schlag sitzt! Das könnte ernst werden!',
  'The Cyclops misses, but the backwash almost knocks you over.':
    'Der Zyklop verfehlt dich, aber der Luftzug wirft dich beinahe um.',
  'The Cyclops rushes you, but runs into the wall.':
    'Der Zyklop stürmt auf dich los, rennt aber gegen die Wand.',
  'The Cyclops sends you crashing to the floor, unconscious.':
    'Der Zyklop schickt dich bewusstlos zu Boden krachen.',
  'The Cyclops breaks your neck with a massive smash.':
    'Der Zyklop bricht dir mit einem gewaltigen Schlag das Genick.',
  'A quick punch, but it was only a glancing blow.':
    'Ein schneller Schlag, aber er streifte dich nur.',
  "A glancing blow from the Cyclops' fist.":
    'Ein Streifschlag von der Faust des Zyklopen.',
  'The monster smashes his huge fist into your chest, breaking several ribs.':
    'Das Monster rammt dir seine riesige Faust in die Brust und bricht dir mehrere Rippen.',
  'The Cyclops almost knocks the wind out of you with a quick punch.':
    'Der Zyklop verschlägt dir mit einem schnellen Hieb beinahe den Atem.',
  'The Cyclops lands a punch that knocks the wind out of you.':
    'Der Zyklop landet einen Hieb, der dir den Atem verschlägt.',
  'Heedless of your weapons, the Cyclops tosses you against the rock wall of the room.':
    'Ungeachtet deiner Waffen schleudert der Zyklop dich gegen die Felswand des Raumes.',
  'The Cyclops seems unable to decide whether to broil or stew his dinner.':
    'Der Zyklop scheint sich nicht entscheiden zu können, ob er sein Abendessen grillen oder schmoren soll.',
  'The Cyclops, no sportsman, dispatches his unconscious victim.':
    'Der Zyklop, kein guter Verlierer, erledigt sein bewusstloses Opfer.',
  'The axe sweeps past as you jump aside.':
    'Die Axt zischt vorbei, während du zur Seite springst.',
  'The axe crashes against the rock, throwing sparks!':
    'Die Axt kracht gegen den Fels und schlägt Funken!',
  "The flat of the troll's axe hits you delicately on the head, knocking you out.":
    'Die flache Seite der Axt des Trolls trifft dich zartfühlend am Kopf und schlägt dich bewusstlos.',
  "The troll's axe stroke cleaves you from the nave to the chops.":
    'Der Axthieb des Trolls spaltet dich vom Nabel bis zum Kinn.',
  "The troll's axe removes your head.":
    'Die Axt des Trolls trennt dir den Kopf ab.',
  'The axe gets you right in the side. Ouch!':
    'Die Axt erwischt dich mitten in der Seite. Autsch!',
  "The flat of the troll's axe skins across your forearm.":
    'Die flache Seite der Axt des Trolls schürft über deinen Unterarm.',
  "The troll's swing almost knocks you over as you barely parry in time.":
    'Der Schwung des Trolls wirft dich beinahe um, während du gerade noch rechtzeitig parierst.',
  'The troll swings his axe, and it nicks your arm as you dodge.':
    'Der Troll schwingt seine Axt, und sie ritzt dir den Arm, während du ausweichst.',
  'An axe stroke makes a deep wound in your leg.':
    'Ein Axthieb reißt dir eine tiefe Wunde ins Bein.',
  "The troll's axe swings down, gashing your shoulder.":
    'Die Axt des Trolls saust herab und schlitzt dir die Schulter auf.',
  'The troll hits you with a glancing blow, and you are momentarily stunned.':
    'Der Troll trifft dich mit einem Streifschlag, und du bist einen Augenblick lang benommen.',
  'The troll swings; the blade turns on your armor but crashes broadside into your head.':
    'Der Troll holt aus; die Klinge gleitet an deiner Rüstung ab, kracht dir aber breitseits gegen den Kopf.',
  'You stagger back under a hail of axe strokes.':
    'Du taumelst unter einem Hagel von Axthieben zurück.',
  'The troll hesitates, fingering his axe.':
    'Der Troll zögert und befingert seine Axt.',
  'The troll scratches his head ruminatively: Might you be magically protected, he wonders?':
    'Der Troll kratzt sich grüblerisch am Kopf: Könntest du etwa magisch geschützt sein, fragt er sich?',
  'Conquering his fears, the troll puts you to death.':
    'Seine Ängste überwindend, bringt der Troll dich zu Tode.',
  'The thief stabs nonchalantly with his stiletto and misses.':
    'Der Dieb sticht lässig mit seinem Stilett zu und verfehlt dich.',
  'You parry a lightning thrust, and the thief salutes you with a grim nod.':
    'Du parierst einen blitzschnellen Stoß, und der Dieb grüßt dich mit einem grimmigen Nicken.',
  'The thief tries to sneak past your guard, but you twist away.':
    'Der Dieb versucht, deine Deckung zu umschleichen, doch du windest dich weg.',
  'Shifting in the midst of a thrust, the thief knocks you unconscious with the haft of his stiletto.':
    'Mitten in einem Stoß die Richtung wechselnd, schlägt der Dieb dich mit dem Griff seines Stiletts bewusstlos.',
  'The thief knocks you out.': 'Der Dieb schlägt dich bewusstlos.',
  'Finishing you off, the thief inserts his blade into your heart.':
    'Um dich zu erledigen, stößt der Dieb dir seine Klinge ins Herz.',
  'The thief comes in from the side, feints, and inserts the blade into your ribs.':
    'Der Dieb kommt von der Seite, täuscht an und stößt dir die Klinge zwischen die Rippen.',
  'The thief bows formally, raises his stiletto, and with a wry grin, ends the battle and your life.':
    'Der Dieb verbeugt sich förmlich, erhebt sein Stilett und beendet mit einem schiefen Grinsen den Kampf und dein Leben.',
  'A quick thrust pinks your left arm, and blood starts to trickle down.':
    'Ein schneller Stoß ritzt dir den linken Arm, und Blut beginnt herabzurinnen.',
  'The thief draws blood, raking his stiletto across your arm.':
    'Der Dieb zieht Blut, indem er sein Stilett über deinen Arm reißt.',
  'The thief slowly approaches, strikes like a snake, and leaves you wounded.':
    'Der Dieb nähert sich langsam, schlägt zu wie eine Schlange und lässt dich verwundet zurück.',
  'The thief strikes like a snake! The resulting wound is serious.':
    'Der Dieb schlägt zu wie eine Schlange! Die daraus entstehende Wunde ist ernst.',
  'The thief stabs a deep cut in your upper arm.':
    'Der Dieb sticht dir einen tiefen Schnitt in den Oberarm.',
  'The stiletto touches your forehead, and the blood obscures your vision.':
    'Das Stilett berührt deine Stirn, und das Blut trübt dir die Sicht.',
  'The thief strikes at your wrist, and suddenly your grip is slippery with blood.':
    'Der Dieb schlägt nach deinem Handgelenk, und plötzlich ist dein Griff schlüpfrig vom Blut.',
  'The songbird is not here but is probably nearby.':
    'Der Singvogel ist nicht hier, aber wahrscheinlich ganz in der Nähe.',
  'The butt of his stiletto cracks you on the skull, and you stagger back.':
    'Der Knauf seines Stiletts kracht dir auf den Schädel, und du taumelst zurück.',
  'The thief rams the haft of his blade into your stomach, leaving you out of breath.':
    'Der Dieb rammt dir den Griff seiner Klinge in den Magen und lässt dich außer Atem zurück.',
  'The thief attacks, and you fall back desperately.':
    'Der Dieb greift an, und du weichst verzweifelt zurück.',
  'The thief, a man of superior breeding, pauses for a moment to consider the propriety of finishing you off.':
    'Der Dieb, ein Mann von feinster Erziehung, hält einen Augenblick inne, um zu erwägen, ob es sich schickt, dich zu erledigen.',
  'The thief amuses himself by searching your pockets.':
    'Der Dieb vergnügt sich damit, deine Taschen zu durchsuchen.',
  'The thief entertains himself by rifling your pack.':
    'Der Dieb unterhält sich damit, deinen Rucksack zu durchwühlen.',
  'The thief, forgetting his essentially genteel upbringing, cuts your throat.':
    'Der Dieb, seine im Grunde vornehme Kinderstube vergessend, schneidet dir die Kehle durch.',
  'The thief, a pragmatist, dispatches you as a threat to his livelihood.':
    'Der Dieb, ein Pragmatiker, erledigt dich als Bedrohung für seinen Lebensunterhalt.',
  "You're not at the house.": 'Du bist nicht beim Haus.',
  'That hiding place is too obvious.': 'Dieses Versteck ist zu offensichtlich.',
  "You didn't say with what!": 'Du hast nicht gesagt, womit!',
  'Your image in the mirror looks tired.': 'Dein Spiegelbild sieht müde aus.',
  "If you insist.... Poof, you're dead!":
    'Wenn du darauf bestehst.... Puff, du bist tot!',
  'The water cools the bell and is evaporated.':
    'Das Wasser kühlt die Glocke und verdampft.',
  'It is an integral part of the control panel.':
    'Es ist ein fester Bestandteil des Bedienpults.',
  'You nearly burn your hand trying to extinguish the flame.':
    'Du verbrennst dir beinahe die Hand bei dem Versuch, die Flamme zu löschen.',
  'You have it.': 'Du hast es.',
  'The sluice gates are closed. The water level in the reservoir is quite low, but the level is rising quickly.':
    'Die Schleusentore sind geschlossen. Der Wasserstand im Becken ist recht niedrig, aber der Pegel steigt schnell.',
  'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been extremely wealthy.':
    'Das Haus ist ein schönes Kolonialhaus, das weiß gestrichen ist. Es ist offensichtlich, dass die Besitzer äußerst wohlhabend gewesen sein müssen.',
  'Failed.': 'Fehlgeschlagen.',
  'You cannot talk to that!': 'Du kannst nicht mit dem reden!',
  'Some paint chips away, revealing more paint.':
    'Ein wenig Farbe blättert ab und gibt weitere Farbe frei.',
  "You can't do that.": 'Das kannst du nicht tun.',
  'No chance. Some moron punctured it.':
    'Keine Chance. Irgendein Idiot hat es durchstochen.',
  'A force keeps you from taking the bodies.':
    'Eine Kraft hält dich davon ab, die Leichen zu nehmen.',
  'The water level has dropped to the point at which the boat can no longer stay afloat. It sinks into the mud.':
    'Der Wasserstand ist so weit gesunken, dass das Boot nicht mehr über Wasser bleiben kann. Es versinkt im Schlamm.',
  "The windows are boarded and can't be opened.":
    'Die Fenster sind vernagelt und können nicht geöffnet werden.',
  "You can't pick that.": 'Das kannst du nicht knacken.',
  'The viscous material oozes into your hand.':
    'Die zähflüssige Masse quillt dir in die Hand.',
  'There is nothing to fill it with.':
    'Es gibt nichts, womit du es füllen könntest.',
  'Oh, no! You have walked into the slavering fangs of a lurking grue!':
    'Oh nein! Du bist geradewegs in die geifernden Reißzähne eines lauernden Grue getreten!',
  "You'll have to do that on your own.": 'Das musst du selbst tun.',
  'The voice of the guardian of the dungeon booms out from the darkness, "Your disrespect costs you your life!" and places your head on a sharp pole.':
    'Die Stimme des Wächters des Verlieses dröhnt aus der Dunkelheit: „Deine Respektlosigkeit kostet dich dein Leben!“ und steckt deinen Kopf auf einen spitzen Pfahl.',
  "You have broken the mirror. I hope you have a seven years' supply of good luck handy.":
    'Du hast den Spiegel zerbrochen. Ich hoffe, du hast einen Vorrat an gutem Glück für sieben Jahre parat.',
  'Well, you seem to have been brushing your teeth with some sort of glue. As a result, your mouth gets glued together (with your nose) and you die of respiratory failure.':
    'Nun, du scheinst dir die Zähne mit einer Art Klebstoff geputzt zu haben. Infolgedessen wird dein Mund (mitsamt deiner Nase) zugeklebt, und du stirbst an Atemversagen.',
  "Those things aren't here!": 'Diese Dinge sind nicht hier!',
  "You can't spin that!": 'Das kannst du nicht drehen!',
  'FCD#3 was constructed in year 783 of the Great Underground Empire to harness the mighty Frigid River. This work was supported by a grant of 37 million zorkmids from your omnipotent local tyrant Lord Dimwit Flathead the Excessive. This impressive structure is composed of 370,000 cubic feet of concrete, is 256 feet tall at the center, and 193 feet wide at the top. The lake created behind the dam has a volume of 1.7 billion cubic feet, an area of 12 million square feet, and a shore line of 36 thousand feet.':
    'FCD#3 wurde im Jahr 783 des Großen Unterirdischen Reiches errichtet, um den mächtigen Frigid-Fluss zu bändigen. Dieses Werk wurde durch eine Zuwendung von 37 Millionen Zorkmids von deinem allmächtigen örtlichen Tyrannen Lord Dimwit Flathead dem Maßlosen unterstützt. Dieses beeindruckende Bauwerk besteht aus 370.000 Kubikfuß Beton, ist in der Mitte 256 Fuß hoch und an der Krone 193 Fuß breit. Der hinter dem Damm entstandene See hat ein Volumen von 1,7 Milliarden Kubikfuß, eine Fläche von 12 Millionen Quadratfuß und eine Uferlinie von 36 Tausend Fuß.',
  'The water level behind the dam is low: The sluice gates have been opened. Water rushes through the dam and downstream.':
    'Der Wasserstand hinter dem Damm ist niedrig: Die Schleusentore wurden geöffnet. Wasser strömt durch den Damm und flussabwärts.',
  "You can't push things to that.": 'Du kannst keine Dinge dorthin schieben.',
  'The window closes (more easily than it opened).':
    'Das Fenster schließt sich (leichter, als es sich geöffnet hat).',
  'The bell is very hot and cannot be taken.':
    'Die Glocke ist sehr heiß und kann nicht genommen werden.',
  'The door swings shut and closes.': 'Die Tür schwingt zu und schließt sich.',
  "It's too dark to see!": 'Es ist zu dunkel, um etwas zu sehen!',
  'A troll is here.': 'Ein Troll ist hier.',
  'The book is already open to page 569.':
    'Das Buch ist bereits auf Seite 569 aufgeschlagen.',
  'A pathetically babbling troll is here.':
    'Ein jämmerlich plappernder Troll ist hier.',
  'An unconscious troll is sprawled on the floor. All passages out of the room are open.':
    'Ein bewusstloser Troll liegt hingestreckt auf dem Boden. Alle Ausgänge aus dem Raum sind offen.',
  'You cannot close that.': 'Das kannst du nicht schließen.',
  'The leaves burn, and so do you.':
    'Die Blätter brennen, und du brennst auch.',
  'The west wall is solid granite here.':
    'Die Westwand besteht hier aus massivem Granit.',
  'The grating opens to reveal trees above you.':
    'Das Gitter öffnet sich und gibt den Blick auf Bäume über dir frei.',
  "It's in the bottle. Perhaps you should take that instead.":
    'Es ist in der Flasche. Vielleicht solltest du stattdessen diese nehmen.',
  "I'm afraid that the leap you attempted has done you in.":
    'Ich fürchte, der Sprung, den du gewagt hast, hat dich erledigt.',
  'Hanging down from the railing is a rope which ends about ten feet from the floor below.':
    'Vom Geländer hängt ein Seil herab, das etwa zehn Fuß über dem Boden darunter endet.',
  "It's really dark in here....": 'Hier drin ist es wirklich dunkel....',
  'How can you drink that?': 'Wie willst du das trinken?',
  'You are lifted up by the rising river! You try to swim, but the currents are too strong. You come closer, closer to the awesome structure of Flood Control Dam #3. The dam beckons to you. The roar of the water nearly deafens you, but you remain conscious as you tumble over the dam toward your certain doom among the rocks at its base.':
    'Du wirst vom steigenden Fluss emporgehoben! Du versuchst zu schwimmen, doch die Strömungen sind zu stark. Du kommst näher und näher an das gewaltige Bauwerk des Hochwasserschutzdamms Nr. 3. Der Damm winkt dir zu. Das Tosen des Wassers macht dich beinahe taub, doch du bleibst bei Bewusstsein, während du über den Damm stürzt, deinem sicheren Verderben unter den Felsen an seinem Fuß entgegen.',
  'The room is full of water and cannot be entered.':
    'Der Raum ist voller Wasser und kann nicht betreten werden.',
  "I'm afraid you have done drowned yourself.":
    'Ich fürchte, du hast dich tatsächlich ertränkt.',
  'The rising water carries the boat over the dam, down the river, and over the falls. Tsk, tsk.':
    'Das steigende Wasser trägt das Boot über den Damm, den Fluss hinab und über die Wasserfälle. Tss, tss.',
  'In other words, fighting the fierce currents of the Frigid River. You manage to hold your own for a bit, but then you are carried over a waterfall and into some nasty rocks. Ouch!':
    'Mit anderen Worten, gegen die heftigen Strömungen des Frigid-Flusses ankämpfen. Du schaffst es eine Weile, dich zu behaupten, doch dann wirst du über einen Wasserfall und auf einige fiese Felsen getragen. Autsch!',
  'The bell is too hot to touch.': 'Die Glocke ist zu heiß, um sie anzufassen.',
  'You could certainly never tie it with that!':
    'Damit könntest du es ganz sicher niemals festbinden!',
  'Above you is a grating.': 'Über dir befindet sich ein Gitter.',
  'The cyclops, tired of all of your games and trickery, grabs you firmly. As he licks his chops, he says "Mmm. Just like Mom used to make \'em." It\'s nice to be appreciated.':
    'Der Zyklop, müde all deiner Spielchen und Tricks, packt dich fest. Während er sich die Lippen leckt, sagt er: „Mmm. Genau wie Mama sie immer gemacht hat.“ Es ist schön, geschätzt zu werden.',
  'It could very well be too late!': 'Es könnte sehr wohl zu spät sein!',
  'Talking to yourself is said to be a sign of impending mental collapse.':
    'Man sagt, mit sich selbst zu reden sei ein Zeichen für einen bevorstehenden geistigen Zusammenbruch.',
  'The spirits jeer loudly and ignore you.':
    'Die Geister höhnen lautstark und ignorieren dich.',
  'The bell is too hot to reach.':
    'Die Glocke ist zu heiß, um sie zu erreichen.',
  'A booming voice says "Wrong, cretin!" and you notice that you have turned into a pile of dust. How, I can\'t imagine.':
    'Eine dröhnende Stimme sagt: „Falsch, Trottel!“, und du bemerkst, dass du dich in einen Haufen Staub verwandelt hast. Wie, kann ich mir nicht vorstellen.',
  'There is a worthless piece of canvas here.':
    'Hier liegt ein wertloses Stück Segeltuch.',
  'Aaaarrrrgggghhhh!': 'Aaaarrrrgggghhhh!',
  "That's silly!": 'Das ist albern!',
  'The structural integrity of the rainbow is severely compromised, leaving you hanging in midair, supported only by water vapor. Bye.':
    'Die strukturelle Integrität des Regenbogens ist schwer beeinträchtigt, sodass du mitten in der Luft hängst, getragen allein von Wasserdampf. Tschüss.',
  'Shaken.': 'Geschüttelt.',
  'You splash around for a while, fighting the current, then you drown.':
    'Du planschst eine Weile herum, kämpfst gegen die Strömung an und ertrinkst dann.',
  'The tube refuses to accept anything.':
    'Die Tube weigert sich, irgendetwas anzunehmen.',
  "Unfortunately, the magic boat doesn't provide protection from the rocks and boulders one meets at the bottom of waterfalls. Including this one.":
    'Leider bietet das Zauberboot keinen Schutz vor den Felsen und Findlingen, denen man am Fuß von Wasserfällen begegnet. Diesen hier eingeschlossen.',
  'Another pathetic sputter, this time from you, heralds your drowning.':
    'Ein weiteres jämmerliches Glucksen, diesmal von dir, kündigt dein Ertrinken an.',
  "It's solid granite.": 'Es ist massiver Granit.',
  'The hole collapses, smothering you.':
    'Das Loch stürzt ein und erstickt dich.',
  'That was just a bit too far down.':
    'Das war einfach ein bisschen zu weit unten.',
  'I beg your pardon?': 'Wie bitte?',
  'Do you wish to restart? (Y is affirmative):':
    'Möchtest du neu beginnen? (Y bedeutet ja):',
  'Well, you really did it that time. Is suicide painless?':
    'Nun, diesmal hast du es wirklich geschafft. Ist Selbstmord schmerzlos?',
  "It appears that that last blow was too much for you. I'm afraid you are dead.":
    'Es scheint, dass dieser letzte Schlag zu viel für dich war. Ich fürchte, du bist tot.',
  "You can't talk to the sailor that way.":
    'So kannst du nicht mit dem Matrosen reden.',
  'The water slips through your fingers.':
    'Das Wasser rinnt dir durch die Finger.',
  'The FROBOZZ Corporation created, owns, and operates this dungeon.':
    'Die FROBOZZ Corporation hat dieses Verlies erschaffen, besitzt und betreibt es.',
  'Naturally!': 'Natürlich!',
  'The pines and the hemlocks seem to be murmuring.':
    'Die Kiefern und die Hemlocktannen scheinen zu murmeln.',
  'You can hear the sound of flowing water from below.':
    'Von unten hörst du das Geräusch fließenden Wassers.',
  'All of a sudden, an alarmingly loud roaring sound fills the room. Filled with fear, you scramble away.':
    'Ganz plötzlich erfüllt ein erschreckend lautes Tosen den Raum. Von Furcht erfüllt, machst du dich eilig davon.',
  'It makes no sound but is always lurking in the darkness nearby.':
    'Es macht keinen Laut, lauert aber stets in der Dunkelheit ganz in der Nähe.',
  'The disk is correct.': 'Die Scheibe ist korrekt.',
  '** Disk Failure **': '** Festplattenfehler **',
  'Beats me.': 'Keine Ahnung.',
  'How peculiar!': 'Wie sonderbar!',
  "You're inside of it!": 'Du bist darin!',
  'The door cannot be opened.': 'Die Tür kann nicht geöffnet werden.',
  'It is far too large to carry.': 'Es ist viel zu groß, um es zu tragen.',
  'The grating is closed!': 'Das Gitter ist geschlossen!',
  "You can't go that way.": 'Da entlang kannst du nicht gehen.',
  'There is no sailor to be seen.': 'Es ist kein Matrose zu sehen.',
  'You seem to be repeating yourself.': 'Du scheinst dich zu wiederholen.',
  'I think that phrase is getting a bit worn out.':
    'Ich glaube, diese Redewendung wird allmählich ein wenig abgenutzt.',
  'Nothing happens here.': 'Hier geschieht nichts.',
  'The grue is a sinister, lurking presence in the dark places of the earth. Its favorite diet is adventurers, but its insatiable appetite is tempered by its fear of light. No grue has ever been seen by the light of day, and few have survived its fearsome jaws to tell the tale.':
    'Der Grue ist eine finstere, lauernde Präsenz an den dunklen Orten der Erde. Seine Lieblingsnahrung sind Abenteurer, doch sein unstillbarer Appetit wird durch seine Furcht vor dem Licht gezügelt. Noch nie wurde ein Grue im Tageslicht gesehen, und nur wenige haben seinen furchterregenden Kiefern entronnen, um davon zu berichten.',
  "There is no grue here, but I'm sure there is at least one lurking in the darkness nearby. I wouldn't let my light go out if I were you!":
    'Hier ist kein Grue, aber ich bin sicher, dass mindestens einer in der Dunkelheit ganz in der Nähe lauert. An deiner Stelle würde ich mein Licht nicht ausgehen lassen!',
  'Only you can do that.': 'Das kannst nur du tun.',
  'Auto-cannibalism is not the answer.':
    'Selbstkannibalismus ist nicht die Lösung.',
  'Suicide is not the answer.': 'Selbstmord ist nicht die Lösung.',
  'How romantic!': 'Wie romantisch!',
  "That's difficult unless your eyes are prehensile.":
    'Das ist schwierig, es sei denn, deine Augen können greifen.',
  'You must specify a direction to go.':
    'Du musst eine Richtung angeben, in die du gehen willst.',
  "I can't help you there....": 'Da kann ich dir nicht helfen....',
  'Not a chance.': 'Keine Chance.',
  'The zorkmid is the unit of currency of the Great Underground Empire.':
    'Der Zorkmid ist die Währungseinheit des Großen Unterirdischen Reiches.',
  'The best way to find zorkmids is to go out and look for them.':
    'Der beste Weg, Zorkmids zu finden, ist loszuziehen und nach ihnen zu suchen.',
  "It's too dark to see.": 'Es ist zu dunkel, um etwas zu sehen.',
  "It's not clear what you're referring to.":
    'Es ist nicht klar, worauf du dich beziehst.',
  "There's nothing here you can take.":
    'Hier gibt es nichts, was du nehmen kannst.',
  "I don't see what you are referring to.":
    'Ich sehe nicht, worauf du dich beziehst.',
  "I can't help your clumsiness.":
    'Ich kann deiner Ungeschicklichkeit nicht abhelfen.',
  "Sorry, you can't correct mistakes in quoted text.":
    'Tut mir leid, in zitiertem Text kannst du keine Fehler korrigieren.',
  'Warning: only the first word after OOPS is used.':
    'Achtung: Nur das erste Wort nach OOPS wird verwendet.',
  'There was no word to replace!': 'Es gab kein Wort zu ersetzen!',
  'Beg pardon?': 'Wie bitte?',
  "It's difficult to repeat fragments.":
    'Es ist schwierig, Fragmente zu wiederholen.',
  'That would just repeat a mistake.':
    'Das würde nur einen Fehler wiederholen.',
  "I couldn't understand that sentence.":
    'Diesen Satz konnte ich nicht verstehen.',
  'There were too many nouns in that sentence.':
    'In diesem Satz waren zu viele Substantive.',
  'Please consult your manual for the correct way to talk to other people or creatures.':
    'Bitte schlage in deinem Handbuch nach, wie man korrekt mit anderen Personen oder Kreaturen spricht.',
  'There was no verb in that sentence!': 'In diesem Satz war kein Verb!',
  "That sentence isn't one I recognize.": 'Diesen Satz erkenne ich nicht.',
  "That question can't be answered.":
    'Diese Frage kann nicht beantwortet werden.',
  '"I don\'t understand! What are you referring to?"':
    '„Ich verstehe nicht! Worauf beziehst du dich?“',
  'There seems to be a noun missing in that sentence!':
    'In diesem Satz scheint ein Substantiv zu fehlen!',
  "I don't see what you're referring to.":
    'Ich sehe nicht, worauf du dich beziehst.',
  "You don't have that!": 'Das hast du nicht!',
  'Maximum verbosity.': 'Maximale Ausführlichkeit.',
  'Brief descriptions.': 'Kurze Beschreibungen.',
  'Superbrief descriptions.': 'Superkurze Beschreibungen.',
  'You are empty-handed.': 'Du hast leere Hände.',
  'Do you wish to leave the game? (Y is affirmative):':
    'Möchtest du das Spiel verlassen? (Y für ja):',
  'Restarting.': 'Neustart.',
  'Verifying disk...': 'Überprüfe Diskette...',
  'Illegal call to #RND.': 'Unzulässiger Aufruf von #RND.',
  'A hollow voice says "Fool."': 'Eine hohle Stimme sagt „Narr.“',
  "He's wide awake, or haven't you noticed...":
    'Er ist hellwach, oder ist dir das nicht aufgefallen...',
  "You can't blast anything by using words.":
    'Mit Worten kannst du nichts in die Luft jagen.',
  'If you wish, but heaven only knows why.':
    'Wenn du willst, aber der Himmel allein weiß, warum.',
  'Bug? Not in a flawless program like this! (Cough, cough).':
    'Ein Fehler? Nicht in einem makellosen Programm wie diesem! (Hust, hust).',
  'Preposterous!': 'Absurd!',
  'There are no climbable trees here.':
    'Hier gibt es keine erkletterbaren Bäume.',
  "You can't do that!": 'Das kannst du nicht tun!',
  'It is already closed.': 'Es ist bereits geschlossen.',
  'Well, for one, you are playing Zork...': 'Nun, zum einen spielst du Zork...',
  'You have lost your mind.': 'Du hast den Verstand verloren.',
  "You can't cross that!": 'Das kannst du nicht überqueren!',
  "Insults of this nature won't help you.":
    'Beleidigungen dieser Art werden dir nicht helfen.',
  'Such language in a high-class establishment like this!':
    'Solch eine Sprache in einem so vornehmen Etablissement!',
  "Not a bright idea, especially since you're in it.":
    'Keine glänzende Idee, zumal du dich darin befindest.',
  'Come on, now!': 'Na komm schon!',
  "There's no reason to be digging here.":
    'Es gibt keinen Grund, hier zu graben.',
  "You're not in that!": 'Du bist nicht darin!',
  'You realize that getting out here would be fatal.':
    'Dir wird klar, dass es tödlich wäre, hier auszusteigen.',
  "You're not holding that.": 'Das hältst du nicht in der Hand.',
  'Thank you very much. It really hit the spot.':
    'Vielen Dank. Das hat wirklich gutgetan.',
  "There isn't any water here.": 'Hier gibt es kein Wasser.',
  'Thank you very much. I was rather thirsty (from all this talking, probably).':
    'Vielen Dank. Ich hatte ziemlichen Durst (vom vielen Reden, vermutlich).',
  'You are left in the dark...': 'Du bleibst im Dunkeln zurück...',
  'What a bizarre concept!': 'Was für ein bizarres Konzept!',
  "There's nothing to fill it with.":
    'Es gibt nichts, womit du es füllen könntest.',
  "You may know how to do that, but I don't.":
    'Du weißt vielleicht, wie man das macht, aber ich nicht.',
  "Within six feet of your head, assuming you haven't left that somewhere.":
    'Im Umkreis von sechs Fuß um deinen Kopf, vorausgesetzt, du hast den nicht irgendwo liegen lassen.',
  "You're around here somewhere...": 'Du bist hier irgendwo in der Nähe...',
  'You find it.': 'Du findest es.',
  "It's right here.": 'Es ist genau hier.',
  'It is already off.': 'Es ist bereits aus.',
  "You can't turn that off.": 'Das kannst du nicht ausschalten.',
  'It is already on.': 'Es ist bereits an.',
  "You can't turn that on.": 'Das kannst du nicht einschalten.',
  "That's pretty weird.": 'Das ist ziemlich merkwürdig.',
  'That would be a good trick.': 'Das wäre ein guter Trick.',
  'This was not a very safe place to try jumping.':
    'Dies war kein sehr sicherer Ort für einen Sprungversuch.',
  'In a feat of unaccustomed daring, you manage to land on your feet without killing yourself.':
    'In einem Anflug ungewohnter Kühnheit gelingt es dir, auf den Füßen zu landen, ohne dich umzubringen.',
  "It doesn't seem to work.": 'Es scheint nicht zu funktionieren.',
  'There is nothing special to be seen.': 'Es gibt nichts Besonderes zu sehen.',
  "You aren't an accomplished enough juggler.":
    'Du bist kein gewandter genug Jongleur.',
  "You'll have to speak up if you expect me to hear you!":
    'Du musst lauter sprechen, wenn du erwartest, dass ich dich höre!',
  'Nice try.': 'Netter Versuch.',
  "Wasn't he a sailor?": 'War er nicht ein Seemann?',
  'It is already open.': 'Es ist bereits offen.',
  "You're not in anything!": 'Du bist in gar nichts drin!',
  'Huh?': 'Häh?',
  "You can't pour that.": 'Das kannst du nicht ausgießen.',
  'If you pray enough, your prayers may be answered.':
    'Wenn du genug betest, werden deine Gebete vielleicht erhört.',
  'How can you do that?': 'Wie willst du das anstellen?',
  "There's no room.": 'Es ist kein Platz da.',
  'What a (ahem!) strange idea.': 'Was für eine (ähem!) seltsame Idee.',
  'It is impossible to read in the dark.': 'Im Dunkeln zu lesen ist unmöglich.',
  'Say what?': 'Wie bitte?',
  'Talking to yourself is a sign of impending mental collapse.':
    'Selbstgespräche sind ein Zeichen für einen bevorstehenden geistigen Zusammenbruch.',
  'You find nothing unusual.': 'Du findest nichts Ungewöhnliches.',
  "That doesn't make sends.": 'Das ergibt keinen Versinn.',
  'Foo!': 'Pfui!',
  'This seems to have no effect.': 'Dies scheint keine Wirkung zu haben.',
  "You can't take it; thus, you can't shake it!":
    'Du kannst es nicht nehmen; folglich kannst du es auch nicht schütteln!',
  'How singularly useless.': 'Wie ausgesprochen nutzlos.',
  'You are already standing, I think.': 'Du stehst bereits, glaube ich.',
  'Go jump in a lake!': 'Spring doch in einen See!',
  'Whoosh!': 'Wusch!',
  'You are already wearing it.': 'Du trägst es bereits.',
  'You already have that!': 'Das hast du schon!',
  "You can't reach something that's inside a closed container.":
    'Du kannst nichts erreichen, was sich in einem geschlossenen Behälter befindet.',
  'That would involve quite a contortion!':
    'Das würde eine ziemliche Verrenkung erfordern!',
  'Thrown.': 'Geworfen.',
  "You can't throw anything off of that!":
    'Von da oben kannst du nichts hinunterwerfen!',
  "You can't turn that!": 'Das kannst du nicht drehen!',
  'Time passes...': 'Die Zeit vergeht...',
  'There are odd noises in the darkness, and there is no exit in that direction.':
    'In der Dunkelheit gibt es seltsame Geräusche, und in dieser Richtung gibt es keinen Ausgang.',
  'Use compass directions for movement.':
    'Benutze Himmelsrichtungen zum Bewegen.',
  "It's here!": 'Es ist hier!',
  'You should supply a direction!': 'Du solltest eine Richtung angeben!',
  'With luck, your wish will come true.':
    'Mit etwas Glück wird dein Wunsch in Erfüllung gehen.',
  'At your service!': 'Zu deinen Diensten!',
  'You are likely to be eaten by a grue.':
    'Du wirst wahrscheinlich von einem Grue gefressen.',
  "Only bats can see in the dark. And you're not one.":
    'Nur Fledermäuse können im Dunkeln sehen. Und du bist keine.',
  'You are carrying:': 'Du trägst:',
  'Your hand passes through its object.':
    'Deine Hand geht durch ihr Ziel hindurch.',
  "You're holding too many things already!":
    'Du hältst bereits zu viele Dinge in der Hand!',
  "You can't go there without a vehicle.":
    'Dorthin kommst du nicht ohne ein Fahrzeug.',
  'There are sinister gurgling noises in the darkness all around you!':
    'Überall um dich herum gibt es in der Dunkelheit unheimliche gurgelnde Geräusche!',
  'You have moved into a dark place.':
    'Du hast dich an einen dunklen Ort begeben.',
  'A secret path leads southwest into the forest.':
    'Ein geheimer Pfad führt nach Südwesten in den Wald.',
  'The boards are securely fastened.': 'Die Bretter sind fest verankert.',
  "Dental hygiene is highly recommended, but I'm not sure what you want to brush them with.":
    'Zahnhygiene ist sehr zu empfehlen, aber ich bin mir nicht sicher, womit du sie putzen möchtest.',
  'The east wall is solid granite here.':
    'Die Ostwand besteht hier aus massivem Granit.',
  'It only SAYS "Granite Wall".': 'Da STEHT nur „Granitwand“.',
  "The wall isn't granite.": 'Die Wand ist nicht aus Granit.',
  "You can't hear the songbird now.":
    'Du kannst den Singvogel im Moment nicht hören.',
  "It can't be followed.": 'Ihm kann man nicht folgen.',
  'Why not find your brains?': 'Warum findest du nicht erst mal dein Gehirn?',
  'It seems to be to the west.': 'Es scheint im Westen zu liegen.',
  'It was here just a minute ago....': 'Vor einer Minute war es noch hier....',
  "It's right here! Are you blind or something?":
    'Es ist genau hier! Bist du blind oder was?',
  'The window is closed.': 'Das Fenster ist geschlossen.',
  "I can't see how to get in from here.":
    'Ich sehe nicht, wie man von hier aus hineinkommt.',
  "You aren't even in the forest.": 'Du bist nicht einmal im Wald.',
  'You will have to specify a direction.': 'Du musst eine Richtung angeben.',
  'You cannot see the forest for the trees.':
    'Du siehst den Wald vor lauter Bäumen nicht.',
  "Don't you believe me? The mountains are impassable!":
    'Glaubst du mir nicht? Die Berge sind unpassierbar!',
  'The bottle is closed.': 'Die Flasche ist verschlossen.',
  'The bottle is now full of water.': 'Die Flasche ist jetzt voll Wasser.',
  'The water spills to the floor and evaporates immediately.':
    'Das Wasser ergießt sich auf den Boden und verdunstet sofort.',
  'The water splashes on the walls and evaporates immediately.':
    'Das Wasser spritzt an die Wände und verdunstet sofort.',
  'The window is slightly ajar, but not enough to allow entry.':
    'Das Fenster ist einen Spalt geöffnet, aber nicht weit genug, um hineinzukommen.',
  'Only the ceremony itself has any effect.':
    'Nur die Zeremonie selbst hat irgendeine Wirkung.',
  'How can you attack a spirit with material objects?':
    'Wie willst du einen Geist mit materiellen Gegenständen angreifen?',
  'You seem unable to interact with these spirits.':
    'Du scheinst nicht in der Lage zu sein, mit diesen Geistern zu interagieren.',
  'The basket is at the other end of the chain.':
    'Der Korb befindet sich am anderen Ende der Kette.',
  'The cage is securely fastened to the iron chain.':
    'Der Käfig ist fest an der eisernen Kette befestigt.',
  "You can't reach him; he's on the ceiling.":
    'Du kannst ihn nicht erreichen; er ist an der Decke.',
  'Ding, dong.': 'Ding, dong.',
  'The heat from the bell is too intense.':
    'Die Hitze der Glocke ist zu stark.',
  "You can't break the windows open.":
    'Du kannst die Fenster nicht aufbrechen.',
  'The nails, deeply imbedded in the door, cannot be removed.':
    'Die Nägel, tief in die Tür eingelassen, lassen sich nicht entfernen.',
  'There are no stairs leading down.':
    'Es gibt keine Treppe, die nach unten führt.',
  'ZORK: The Great Underground Empire.': 'ZORK: Das Große Unterirdische Reich.',
  'The door is too heavy.': 'Die Tür ist zu schwer.',
  'You see a rickety staircase descending into darkness.':
    'Du siehst eine wackelige Treppe, die in die Dunkelheit hinabführt.',
  "It's closed.": 'Es ist geschlossen.',
  'The door is locked from above.': 'Die Tür ist von oben verriegelt.',
  'The door closes and locks.': 'Die Tür schließt sich und verriegelt.',
  'Going up empty-handed is a bad idea.':
    'Mit leeren Händen hinaufzugehen ist eine schlechte Idee.',
  "You can't get up there with what you're carrying.":
    'Mit dem, was du trägst, kommst du da nicht hinauf.',
  'Having moved the carpet previously, you find it impossible to move it again.':
    'Da du den Teppich bereits zuvor verschoben hast, gelingt es dir nicht, ihn erneut zu bewegen.',
  'The rug is extremely heavy and cannot be carried.':
    'Der Teppich ist äußerst schwer und kann nicht getragen werden.',
  'Underneath the rug is a closed trap door. As you drop the corner of the rug, the trap door is once again concealed from view.':
    'Unter dem Teppich befindet sich eine geschlossene Falltür. Als du die Ecke des Teppichs loslässt, ist die Falltür wieder den Blicken entzogen.',
  'As you sit, you notice an irregularity underneath it. Rather than be uncomfortable, you stand up again.':
    'Als du dich setzt, bemerkst du eine Unebenheit darunter. Statt unbequem zu sitzen, stehst du wieder auf.',
  "The troll isn't much of a conversationalist.":
    'Der Troll ist kein großer Gesprächspartner.',
  'The troll, angered and humiliated, recovers his weapon. He appears to have an axe to grind with you.':
    'Der Troll, erzürnt und gedemütigt, hebt seine Waffe wieder auf. Er scheint noch ein Hühnchen — beziehungsweise eine Axt — mit dir zu rupfen zu haben.',
  'The troll stirs, quickly resuming a fighting stance.':
    'Der Troll regt sich und nimmt rasch wieder eine Kampfstellung ein.',
  'The troll scratches his head in confusion, then takes the axe.':
    'Der Troll kratzt sich verwirrt am Kopf und nimmt dann die Axt.',
  'The troll spits in your face, grunting "Better luck next time" in a rather barbarous accent.':
    'Der Troll spuckt dir ins Gesicht und grunzt „Mehr Glück beim nächsten Mal“ mit einem recht barbarischen Akzent.',
  'The troll laughs at your puny gesture.':
    'Der Troll lacht über deine jämmerliche Geste.',
  'Every so often the troll says something, probably uncomplimentary, in his guttural tongue.':
    'Hin und wieder sagt der Troll etwas, vermutlich wenig Schmeichelhaftes, in seiner gutturalen Sprache.',
  "Unfortunately, the troll can't hear you.":
    'Leider kann der Troll dich nicht hören.',
  'In disturbing the pile of leaves, a grating is revealed.':
    'Beim Aufwühlen des Laubhaufens kommt ein Gitter zum Vorschein.',
  'There are 69,105 leaves here.': 'Hier liegen 69.105 Blätter.',
  'The leaves burn.': 'Die Blätter brennen.',
  'You rustle the leaves around, making quite a mess.':
    'Du wühlst im Laub herum und richtest eine ziemliche Unordnung an.',
  'Underneath the pile of leaves is a grating. As you release the leaves, the grating is once again concealed from view.':
    'Unter dem Laubhaufen befindet sich ein Gitter. Als du die Blätter loslässt, ist das Gitter wieder den Blicken entzogen.',
  'You are in a clearing, with a forest surrounding you on all sides. A path leads south.':
    'Du befindest dich auf einer Lichtung, von einem Wald auf allen Seiten umgeben. Ein Pfad führt nach Süden.',
  'There is an open grating, descending into darkness.':
    'Da ist ein offenes Gitter, das in die Dunkelheit hinabführt.',
  'There is a grating securely fastened into the ground.':
    'Da ist ein Gitter, fest im Boden verankert.',
  'You are in a small room near the maze. There are twisty passages in the immediate vicinity.':
    'Du befindest dich in einem kleinen Raum nahe dem Labyrinth. In unmittelbarer Nähe gibt es verwinkelte Gänge.',
  'Above you is an open grating with sunlight pouring in.':
    'Über dir ist ein offenes Gitter, durch das Sonnenlicht hereinströmt.',
  'Above you is a grating locked with a skull-and-crossbones lock.':
    'Über dir ist ein Gitter, das mit einem Totenkopfschloss verschlossen ist.',
  'The grate is locked.': 'Das Gitter ist verriegelt.',
  "You can't lock it from this side.":
    'Von dieser Seite kannst du es nicht verriegeln.',
  'The grate is unlocked.': 'Das Gitter ist entriegelt.',
  "You can't reach the lock from here.":
    'Von hier aus kannst du das Schloss nicht erreichen.',
  "You can't pick the lock.": 'Du kannst das Schloss nicht knacken.',
  'A pile of leaves falls onto your head and to the ground.':
    'Ein Laubhaufen fällt dir auf den Kopf und dann zu Boden.',
  'The grating is locked.': 'Das Gitter ist verriegelt.',
  "It won't fit through the grating.": 'Es passt nicht durch das Gitter.',
  "You won't be able to get back up to the tunnel you are going through when it gets to the next room.":
    'Du wirst nicht in den Tunnel zurückklettern können, durch den du gehst, sobald du den nächsten Raum erreichst.',
  'As you touch the rusty knife, your sword gives a single pulse of blinding blue light.':
    'Als du das rostige Messer berührst, gibt dein Schwert einen einzelnen Stoß blendend blauen Lichts von sich.',
  'A ghost appears in the room and is appalled at your desecration of the remains of a fellow adventurer. He casts a curse on your valuables and banishes them to the Land of the Living Dead. The ghost leaves, muttering obscenities.':
    'Ein Geist erscheint im Raum und ist entsetzt über deine Schändung der Überreste eines Mitabenteurers. Er belegt deine Wertsachen mit einem Fluch und verbannt sie ins Land der lebenden Toten. Der Geist verschwindet und murmelt dabei Obszönitäten.',
  'The torch is burning.': 'Die Fackel brennt.',
  'The water evaporates before it gets close.':
    'Das Wasser verdunstet, bevor es nahe kommt.',
  'Unfortunately, the mirror has been destroyed by your recklessness.':
    'Leider wurde der Spiegel durch deine Unbesonnenheit zerstört.',
  'There is an ugly person staring back at you.':
    'Eine hässliche Person starrt dich an.',
  'The mirror is many times your size. Give up.':
    'Der Spiegel ist um ein Vielfaches größer als du. Gib auf.',
  "Haven't you done enough damage already?":
    'Hast du nicht schon genug Schaden angerichtet?',
  'As you enter the dome you feel a strong pull as if from a wind drawing you over the railing and down.':
    'Als du die Kuppel betrittst, spürst du einen starken Sog, als zöge dich ein Wind über das Geländer und hinab.',
  "You aren't equipped for an exorcism.":
    'Du bist nicht für eine Teufelsaustreibung ausgerüstet.',
  'The tension of this ceremony is broken, and the wraiths, amused but shaken at your clumsy attempt, resume their hideous jeering.':
    'Die Spannung dieser Zeremonie ist gebrochen, und die Gespenster, belustigt, aber erschüttert von deinem ungeschickten Versuch, nehmen ihr abscheuliches Höhnen wieder auf.',
  'The bell appears to have cooled down.':
    'Die Glocke scheint sich abgekühlt zu haben.',
  'The sluice gates are open, and water rushes through the dam. The water level behind the dam is still high.':
    'Die Schleusentore sind offen, und das Wasser strömt durch den Damm. Der Wasserstand hinter dem Damm ist noch immer hoch.',
  'The sluice gates close and water starts to collect behind the dam.':
    'Die Schleusentore schließen sich, und das Wasser beginnt sich hinter dem Damm anzusammeln.',
  "The bolt won't turn with your best effort.":
    'Der Bolzen lässt sich trotz größter Anstrengung nicht drehen.',
  "Hmm. It appears the tube contained glue, not oil. Turning the bolt won't get any easier....":
    'Hmm. Anscheinend enthielt die Tube Klebstoff, nicht Öl. Das Drehen der Schraube wird dadurch nicht leichter....',
  'The boat lifts gently out of the mud and is now floating on the reservoir.':
    'Das Boot hebt sich sanft aus dem Schlamm und treibt nun auf dem Reservoir.',
  'You notice that the water level has risen to the point that it is impossible to cross.':
    'Du bemerkst, dass der Wasserstand so weit gestiegen ist, dass eine Überquerung unmöglich ist.',
  'The roar of rushing water is quieter now.':
    'Das Tosen des reißenden Wassers ist jetzt leiser.',
  'The water level is now quite low here and you could easily cross over to the other side.':
    'Der Wasserstand ist hier nun recht niedrig, und du könntest leicht zur anderen Seite hinüberwechseln.',
  "They're greek to you.": 'Das sind für dich böhmische Dörfer.',
  'There is a rumbling sound and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe).':
    'Es ertönt ein Grollen, und ein Wasserstrahl scheint aus der Ostwand des Raumes zu brechen (offenbar ist ein Leck in einer Leitung entstanden).',
  'The blue button appears to be jammed.':
    'Der blaue Knopf scheint zu klemmen.',
  'The chests are so rusty and corroded that they crumble when you touch them.':
    'Die Truhen sind so rostig und zerfressen, dass sie bei deiner Berührung zerfallen.',
  'The chests are already open.': 'Die Truhen sind bereits offen.',
  'By some miracle of Zorkian technology, you have managed to stop the leak in the dam.':
    'Durch ein Wunder der zorkischen Technik hast du es geschafft, das Leck im Damm zu stopfen.',
  "The all-purpose gunk isn't a lubricant.":
    'Die Allzweckpampe ist kein Schmiermittel.',
  'The tube is apparently empty.': 'Die Tube ist anscheinend leer.',
  '---> Frobozz Magic Gunk Company <---':
    '---> Frobozz Magic Gunk Company <---',
  'All-Purpose Gunk': 'Allzweckpampe',
  'Are you the little Dutch boy, then? Sorry, this is a big dam.':
    'Hältst du dich etwa für das kleine holländische Bübchen? Tut mir leid, das ist ein großer Damm.',
  'You are in a long room. To the north is a large lake, too deep to cross. You notice, however, that the water level appears to be dropping at a rapid rate. Before long, it might be possible to cross to the other side from here.':
    'Du befindest dich in einem langen Raum. Im Norden liegt ein großer See, zu tief zum Überqueren. Du bemerkst jedoch, dass der Wasserstand zusehends zu sinken scheint. Schon bald könnte es möglich sein, von hier aus zur anderen Seite hinüberzugelangen.',
  'You are in a long room, to the north of which is a wide area which was formerly a reservoir, but now is merely a stream. You notice, however, that the level of the stream is rising quickly and that before long it will be impossible to cross here.':
    'Du befindest dich in einem langen Raum, nördlich dessen sich eine weite Fläche erstreckt, die einst ein Reservoir war, nun aber nur noch ein Bach ist. Du bemerkst jedoch, dass der Pegel des Baches rasch steigt und dass es schon bald unmöglich sein wird, hier zu überqueren.',
  'You notice that the water level here is rising rapidly. The currents are also becoming stronger. Staying here seems quite perilous!':
    'Du bemerkst, dass der Wasserstand hier rasch steigt. Auch die Strömungen werden stärker. Hier zu bleiben erscheint recht gefährlich!',
  'You are in a large cavernous area. To the south is a wide lake, whose water level appears to be falling rapidly.':
    'Du befindest dich in einem großen, höhlenartigen Bereich. Im Süden liegt ein weiter See, dessen Wasserstand rasch zu fallen scheint.',
  'You are in a cavernous area, to the south of which is a very wide stream. The level of the stream is rising rapidly, and it appears that before long it will be impossible to cross to the other side.':
    'Du befindest dich in einem höhlenartigen Bereich, südlich dessen ein sehr breiter Bach fließt. Der Pegel des Baches steigt rasch, und es scheint, dass es schon bald unmöglich sein wird, zur anderen Seite hinüberzugelangen.',
  'You are in a large cavernous room, north of a large lake.':
    'Du befindest dich in einem großen, höhlenartigen Raum, nördlich eines großen Sees.',
  'The bottle hits the far wall and shatters.':
    'Die Flasche trifft die gegenüberliegende Wand und zerspringt.',
  'A brilliant maneuver destroys the bottle.':
    'Ein brillantes Manöver zerstört die Flasche.',
  'The water spills to the floor and evaporates.':
    'Das Wasser ergießt sich auf den Boden und verdunstet.',
  "No use talking to him. He's fast asleep.":
    'Es bringt nichts, mit ihm zu reden. Er schläft tief und fest.',
  'The cyclops is sleeping like a baby, albeit a very ugly one.':
    'Der Zyklop schläft wie ein Baby, wenn auch wie ein sehr hässliches.',
  'The cyclops yawns and stares at the thing that woke him up.':
    'Der Zyklop gähnt und starrt das Ding an, das ihn geweckt hat.',
  'The cyclops says "Mmm Mmm. I love hot peppers! But oh, could I use a drink. Perhaps I could drink the blood of that thing." From the gleam in his eye, it could be surmised that you are "that thing".':
    'Der Zyklop sagt: „Mmm Mmm. Ich liebe scharfe Paprika! Aber ach, könnte ich einen Schluck gebrauchen. Vielleicht könnte ich das Blut jenes Dings trinken.“ Dem Funkeln in seinem Auge nach zu urteilen lässt sich vermuten, dass du „jenes Ding“ bist.',
  "The cyclops takes the bottle, checks that it's open, and drinks the water. A moment later, he lets out a yawn that nearly blows you over, and then falls fast asleep (what did you put in that drink, anyway?).":
    'Der Zyklop nimmt die Flasche, prüft, ob sie offen ist, und trinkt das Wasser. Einen Augenblick später lässt er ein Gähnen los, das dich beinahe umwirft, und fällt dann in tiefen Schlaf (was hast du da eigentlich in das Getränk getan?).',
  'The cyclops apparently is not thirsty and refuses your generous offer.':
    'Der Zyklop hat anscheinend keinen Durst und lehnt dein großzügiges Angebot ab.',
  'The cyclops may be hungry, but there is a limit.':
    'Der Zyklop mag ja hungrig sein, aber alles hat seine Grenzen.',
  'The cyclops is not so stupid as to eat THAT!':
    'So dumm, DAS zu essen, ist der Zyklop nun auch wieder nicht!',
  '"Do you think I\'m as stupid as my father was?", he says, dodging.':
    '„Hältst du mich für so dumm, wie mein Vater es war?“, sagt er und weicht aus.',
  'The cyclops shrugs but otherwise ignores your pitiful attempt.':
    'Der Zyklop zuckt mit den Schultern, ignoriert deinen erbärmlichen Versuch aber ansonsten.',
  "The cyclops doesn't take kindly to being grabbed.":
    'Der Zyklop nimmt es gar nicht gut auf, gepackt zu werden.',
  'You cannot tie the cyclops, though he is fit to be tied.':
    'Du kannst den Zyklopen nicht fesseln, auch wenn er zum Zerreißen gespannt ist.',
  'You can hear his stomach rumbling.': 'Du kannst sein Magenknurren hören.',
  'The cyclops is sleeping blissfully at the foot of the stairs.':
    'Der Zyklop schläft selig am Fuß der Treppe.',
  'The east wall, previously solid, now has a cyclops-sized opening in it.':
    'Die Ostwand, zuvor massiv, weist nun eine zyklopengroße Öffnung auf.',
  "The cyclops is standing in the corner, eyeing you closely. I don't think he likes you very much. He looks extremely hungry, even for a cyclops.":
    'Der Zyklop steht in der Ecke und mustert dich genau. Ich glaube nicht, dass er dich besonders mag. Er sieht überaus hungrig aus, selbst für einen Zyklopen.',
  'The cyclops, having eaten the hot peppers, appears to be gasping. His enflamed tongue protrudes from his man-sized mouth.':
    'Der Zyklop, der die scharfen Paprika gegessen hat, scheint nach Luft zu schnappen. Seine entflammte Zunge hängt aus seinem mannsgroßen Maul.',
  'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward.':
    'Dies ist ein großer Raum mit einer Decke, die vom Boden aus nicht zu erkennen ist. Ein schmaler Gang führt von Osten nach Westen, und eine steinerne Treppe führt nach oben.',
  'The room is eerie in its quietness.':
    'Der Raum ist von unheimlicher Stille.',
  'The room is deafeningly loud with an undetermined rushing sound. The sound seems to reverberate from all of the walls, making it difficult even to think.':
    'Der Raum ist ohrenbetäubend laut von einem unbestimmten Rauschen erfüllt. Der Klang scheint von allen Wänden widerzuhallen, sodass es schwerfällt, auch nur zu denken.',
  "It is unbearably loud here, with an ear-splitting roar seeming to come from all around you. There is a pounding in your head which won't stop. With a tremendous effort, you scramble out of the room.":
    'Es ist hier unerträglich laut, ein ohrenzerreißendes Tosen scheint von überall her zu kommen. In deinem Kopf hämmert es, ohne aufzuhören. Mit gewaltiger Anstrengung kämpfst du dich aus dem Raum.',
  'The rest of your commands have been lost in the noise.':
    'Der Rest deiner Befehle ist im Lärm untergegangen.',
  "That's only your opinion.": 'Das ist bloß deine Meinung.',
  'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down.':
    'Du befindest dich am Südrand einer tiefen Schlucht. Gänge führen nach Osten, Nordwesten und Südwesten ab. Eine Treppe führt hinab.',
  'You can hear a loud roaring sound, like that of rushing water, from below.':
    'Du kannst von unten ein lautes Tosen hören, wie das von reißendem Wasser.',
  'Your opponent, determining discretion to be the better part of valor, decides to terminate this little contretemps. With a rueful nod of his head, he steps backward into the gloom and disappears.':
    'Dein Gegner, der zu dem Schluss kommt, dass Vorsicht die bessere Tugend ist, beschließt, diesen kleinen Zwischenfall zu beenden. Mit einem reuevollen Nicken tritt er rückwärts ins Dunkel und verschwindet.',
  'The holder of the large bag just left, looking disgusted. Fortunately, he took nothing.':
    'Der Träger des großen Sacks ist gerade angewidert davongegangen. Glücklicherweise hat er nichts mitgenommen.',
  'The thief, finding nothing of value, left disgusted.':
    'Der Dieb, der nichts von Wert fand, ging angewidert davon.',
  'A "lean and hungry" gentleman just wandered through, carrying a large bag. Finding nothing of value, he left disgruntled.':
    'Ein „hagerer und hungriger“ Herr ist gerade durchgekommen, einen großen Sack tragend. Da er nichts von Wert fand, ging er verärgert davon.',
  'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from your possession, mumbling something about "Doing unto others before..."':
    'Eine zwielichtig aussehende Gestalt mit einem großen Sack ist gerade durch den Raum gewandert. Im Vorbeigehen entwendete sie dir heimlich einige Wertsachen aus deinem Besitz und murmelte etwas von „Tue anderen, bevor ...“',
  'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from the room, mumbling something about "Doing unto others before..."':
    'Eine zwielichtig aussehende Gestalt mit einem großen Sack ist gerade durch den Raum gewandert. Im Vorbeigehen entwendete sie heimlich einige Wertsachen aus dem Raum und murmelte etwas von „Tue anderen, bevor ...“',
  'The thief seems to have left you in the dark.':
    'Der Dieb scheint dich im Dunkeln zurückgelassen zu haben.',
  'The thief is a strong, silent type.':
    'Der Dieb ist ein starker, schweigsamer Typ.',
  'The thief, being temporarily incapacitated, is unable to acknowledge your greeting with his usual graciousness.':
    'Der Dieb, vorübergehend außer Gefecht gesetzt, ist nicht imstande, deinen Gruß mit seiner gewohnten Liebenswürdigkeit zu erwidern.',
  'You missed. The thief makes no attempt to take the knife, though it would be a fine addition to the collection in his bag. He does seem angered by your attempt.':
    'Du hast verfehlt. Der Dieb macht keine Anstalten, das Messer an sich zu nehmen, obwohl es eine schöne Ergänzung der Sammlung in seinem Sack wäre. Dein Versuch scheint ihn jedoch erzürnt zu haben.',
  'Your proposed victim suddenly recovers consciousness.':
    'Dein auserkorenes Opfer erlangt plötzlich das Bewusstsein zurück.',
  'Once you got him, what would you do with him?':
    'Und wenn du ihn dann hättest, was würdest du mit ihm anfangen?',
  "The thief is a slippery character with beady eyes that flit back and forth. He carries, along with an unmistakable arrogance, a large bag over his shoulder and a vicious stiletto, whose blade is aimed menacingly in your direction. I'd watch out if I were you.":
    'Der Dieb ist eine glitschige Gestalt mit kleinen, stechenden Augen, die hin und her huschen. Er trägt, neben einer unverkennbaren Arroganz, einen großen Sack über der Schulter und ein gemeines Stilett, dessen Klinge drohend in deine Richtung weist. An deiner Stelle würde ich mich vorsehen.',
  'The thief says nothing, as you have not been formally introduced.':
    'Der Dieb sagt nichts, da man euch nicht förmlich einander vorgestellt hat.',
  'His booty remains.': 'Seine Beute bleibt zurück.',
  'The robber revives, briefly feigning continued unconsciousness, and, when he sees his moment, scrambles away from you.':
    'Der Räuber kommt wieder zu sich, täuscht kurz weitere Bewusstlosigkeit vor und macht sich, als er seine Gelegenheit erkennt, eilig von dir davon.',
  'Sadly for you, the robber collapsed on top of the bag. Trying to take it would wake him.':
    'Zu deinem Pech ist der Räuber auf den Sack gefallen. Der Versuch, ihn zu nehmen, würde ihn wecken.',
  'The bag will be taken over his dead body.':
    'Den Sack bekommst du nur über seine Leiche.',
  'It would be a good trick.': 'Das wäre ein hübsches Kunststück.',
  'Getting close enough would be a good trick.':
    'Schon nahe genug heranzukommen wäre ein hübsches Kunststück.',
  "The bag is underneath the thief, so one can't say what, if anything, is inside.":
    'Der Sack liegt unter dem Dieb, sodass man nicht sagen kann, was, wenn überhaupt, darin ist.',
  "You'd be stabbed in the back first.":
    'Vorher würdest du einen Dolch in den Rücken bekommen.',
  "You can't. It's not a very good chalice, is it?":
    'Das geht nicht. Es ist kein besonders guter Kelch, nicht wahr?',
  'You cannot burn this door.': 'Du kannst diese Tür nicht verbrennen.',
  "You can't seem to damage the door.":
    'Es will dir nicht gelingen, die Tür zu beschädigen.',
  "It won't open.": 'Es lässt sich nicht öffnen.',
  'As hard as you try, the book cannot be closed.':
    'So sehr du es auch versuchst, das Buch lässt sich nicht schließen.',
  'Beside page 569, there is only one other page with any legible printing on it. Most of it is unreadable, but the subject seems to be the banishment of evil. Apparently, certain noises, lights, and prayers are efficacious in this regard.':
    'Außer Seite 569 gibt es nur eine einzige weitere Seite mit lesbarer Schrift darauf. Das meiste davon ist unleserlich, doch das Thema scheint die Vertreibung des Bösen zu sein. Anscheinend sind dabei gewisse Geräusche, Lichter und Gebete von Wirkung.',
  "Congratulations! Unlike the other vandals, who merely stole the artist's masterpieces, you have destroyed one.":
    'Glückwunsch! Anders als die übrigen Vandalen, die bloß die Meisterwerke des Künstlers stahlen, hast du eines zerstört.',
  "A burned-out lamp won't light.": 'Eine ausgebrannte Lampe leuchtet nicht.',
  'The lamp has already burned out.': 'Die Lampe ist bereits ausgebrannt.',
  'It is securely anchored.': 'Es ist fest verankert.',
  "I'm afraid that you have run out of matches.":
    'Ich fürchte, dir sind die Streichhölzer ausgegangen.',
  'This room is drafty, and the match goes out instantly.':
    'In diesem Raum zieht es, und das Streichholz erlischt augenblicklich.',
  'The match is out.': 'Das Streichholz ist erloschen.',
  'The match is burning.': 'Das Streichholz brennt.',
  "The matchbook isn't very interesting, except for what's written on it.":
    'Das Streichholzheftchen ist nicht besonders interessant, abgesehen von dem, was darauf geschrieben steht.',
  "Alas, there's not much left of the candles. Certainly not enough to burn.":
    'Ach, von den Kerzen ist nicht mehr viel übrig. Gewiss nicht genug zum Brennen.',
  '(with the match)': '(mit dem Streichholz)',
  'You should say what to light them with.':
    'Du solltest sagen, womit du sie anzünden willst.',
  'You realize, just in time, that the candles are already lighted.':
    'Du erkennst gerade noch rechtzeitig, dass die Kerzen bereits angezündet sind.',
  'The heat from the torch is so intense that the candles are vaporized.':
    'Die Hitze der Fackel ist so stark, dass die Kerzen verdampfen.',
  "You have to light them with something that's burning, you know.":
    'Du musst sie schon mit etwas anzünden, das brennt, weißt du.',
  "Let's see, how many objects in a pair? Don't tell me, I'll get it.":
    "Mal sehen, wie viele Gegenstände sind in einem Paar? Sag's mir nicht, ich komme schon drauf.",
  'The flame is extinguished.': 'Die Flamme ist erloschen.',
  'The candles are not lighted.': 'Die Kerzen sind nicht angezündet.',
  "That wouldn't be smart.": 'Das wäre nicht klug.',
  'It is now completely dark.': 'Es ist jetzt vollkommen dunkel.',
  'Your sword is glowing very brightly.': 'Dein Schwert glüht sehr hell.',
  'Oh dear. It appears that the smell coming from this room was coal gas. I would have thought twice about carrying flaming objects in here.':
    'Du meine Güte. Anscheinend war der Geruch, der aus diesem Raum kam, Kohlengas. An deiner Stelle hätte ich es mir zweimal überlegt, brennende Gegenstände hier hereinzutragen.',
  'A large vampire bat, hanging from the ceiling, swoops down at you!':
    'Eine große Vampirfledermaus, die an der Decke hängt, stürzt auf dich herab!',
  "It's not clear how to turn it on with your bare hands.":
    'Es ist nicht ersichtlich, wie man es mit bloßen Händen anschalten soll.',
  "The machine doesn't seem to want to do anything.":
    'Die Maschine scheint nichts tun zu wollen.',
  'The slag was rather insubstantial, and crumbles into dust at your touch.':
    'Die Schlacke war ziemlich brüchig und zerfällt bei deiner Berührung zu Staub.',
  'The rainbow seems to have become somewhat run-of-the-mill.':
    'Der Regenbogen scheint wieder recht alltäglich geworden zu sein.',
  'A dazzling display of color briefly emanates from the sceptre.':
    'Ein blendendes Farbenspiel geht kurz vom Zepter aus.',
  'A solid rainbow spans the falls.':
    'Ein fester Regenbogen spannt sich über die Fälle.',
  'From here?!?': 'Von hier?!?',
  "You'll have to say which way...":
    'Du musst schon sagen, in welche Richtung ...',
  'Can you walk on water vapor?': 'Kannst du auf Wasserdampf gehen?',
  'The Frigid River flows under the rainbow.':
    'Der Frigid River fließt unter dem Regenbogen hindurch.',
  'Well done. The boat is repaired.': 'Gut gemacht. Das Boot ist repariert.',
  'You should get in the boat then launch it.':
    'Du solltest erst ins Boot steigen und es dann zu Wasser lassen.',
  "Read the label for the boat's instructions.":
    'Lies das Etikett für die Bedienungsanleitung des Bootes.',
  "You can't launch it here.": 'Hier kannst du es nicht zu Wasser lassen.',
  "You're not in the boat!": 'Du bist nicht im Boot!',
  'Oops! Something sharp seems to have slipped and punctured the boat. The boat deflates to the sounds of hissing, sputtering, and cursing.':
    'Hoppla! Etwas Scharfes scheint abgerutscht zu sein und hat das Boot durchstochen. Das Boot lässt unter Zischen, Prusten und Fluchen die Luft ab.',
  'Inflating it further would probably burst it.':
    'Es noch weiter aufzublasen würde es vermutlich zum Platzen bringen.',
  "You can't deflate the boat while you're in it.":
    'Du kannst die Luft nicht aus dem Boot lassen, solange du darin sitzt.',
  'The boat must be on the ground to be deflated.':
    'Das Boot muss auf dem Boden liegen, damit man die Luft ablassen kann.',
  'The boat deflates.': 'Das Boot lässt die Luft ab.',
  'The boat must be on the ground to be inflated.':
    'Das Boot muss auf dem Boden liegen, damit man es aufblasen kann.',
  "You don't have enough lung power to inflate it.":
    'Du hast nicht genug Puste, um es aufzublasen.',
  'You notice something funny about the feel of the buoy.':
    'Dir fällt etwas Merkwürdiges am Gefühl der Boje auf.',
  'On the ground below you can see:':
    'Auf dem Boden unter dir kannst du sehen:',
  'The nest falls to the ground, and the egg spills out of it, seriously damaged.':
    'Das Nest fällt zu Boden, und das Ei kullert heraus, schwer beschädigt.',
  'The egg falls to the ground and springs open, seriously damaged.':
    'Das Ei fällt zu Boden und springt auf, schwer beschädigt.',
  'The egg is already open.': 'Das Ei ist bereits offen.',
  'You have neither the tools nor the expertise.':
    'Dir fehlen sowohl die Werkzeuge als auch das Können.',
  'I doubt you could do that without damaging it.':
    'Ich bezweifle, dass du das tun könntest, ohne es zu beschädigen.',
  'The egg is now open, but the clumsiness of your attempt has seriously compromised its esthetic appeal.':
    'Das Ei ist nun offen, doch die Ungeschicklichkeit deines Versuchs hat seinen ästhetischen Reiz ernstlich beeinträchtigt.',
  'There is a noticeable crunch from beneath you, and inspection reveals that the egg is lying open, badly damaged.':
    'Es ertönt ein deutliches Knirschen unter dir, und bei näherer Betrachtung zeigt sich, dass das Ei offen daliegt, arg beschädigt.',
  'Your rather indelicate handling of the egg has caused it some damage, although you have succeeded in opening it.':
    'Dein recht unfeinfühliger Umgang mit dem Ei hat ihm einigen Schaden zugefügt, auch wenn es dir gelungen ist, es zu öffnen.',
  'The canary chirps blithely, if somewhat tinnily, for a short time.':
    'Der Kanarienvogel zwitschert eine kurze Weile fröhlich, wenn auch etwas blechern.',
  'There is an unpleasant grinding noise from inside the canary.':
    'Aus dem Inneren des Kanarienvogels ertönt ein unangenehmes Knirschen.',
  'The cliff is too steep for climbing.':
    'Die Klippe ist zu steil zum Klettern.',
  'That would be very unwise. Perhaps even fatal.':
    'Das wäre sehr unklug. Vielleicht sogar tödlich.',
  'The rope is already tied to it.': 'Das Seil ist bereits daran befestigt.',
  'The rope is now untied.': 'Das Seil ist jetzt losgebunden.',
  'It is not tied to anything.': 'Es ist an nichts befestigt.',
  'The rope drops gently to the floor below.':
    'Das Seil fällt sanft auf den Boden hinab.',
  'The rope is tied to the railing.': 'Das Seil ist am Geländer befestigt.',
  "It's not attached to that!": 'Es ist nicht daran befestigt!',
  'It smells of hot peppers.': 'Es riecht nach scharfen Paprika.',
  'You cannot enter in your condition.':
    'In deinem Zustand kannst du nicht eintreten.',
  'All such attacks are vain in your condition.':
    'In deinem Zustand sind alle solchen Angriffe vergeblich.',
  'Even such an action is beyond your capabilities.':
    'Selbst eine solche Handlung übersteigt deine Fähigkeiten.',
  "Might as well. You've got an eternity.":
    'Warum auch nicht. Du hast ja eine Ewigkeit vor dir.',
  'You need no light to guide you.':
    'Du brauchst kein Licht, das dir den Weg weist.',
  "You're dead! How can you think of your score?":
    'Du bist tot! Wie kannst du da an deinen Punktestand denken?',
  'You have no possessions.': 'Du besitzt nichts.',
  'You are dead.': 'Du bist tot.',
  '**** You have died ****': '**** Du bist gestorben ****',
  '** BOOOOOOOOOOOM **': '** BUUUUUUUUUUM **',
  'Although there is no light, the room seems dimly illuminated.':
    'Obwohl es kein Licht gibt, scheint der Raum schwach erleuchtet zu sein.',
  'From the distance the sound of a lone trumpet is heard. The room becomes very bright and you feel disembodied. In a moment, the brightness fades and you find yourself rising as if from a long sleep, deep in the woods. In the distance you can faintly hear a songbird and the sounds of the forest.':
    'Aus der Ferne ertönt der Klang einer einsamen Trompete. Der Raum wird sehr hell, und du fühlst dich körperlos. Im nächsten Augenblick verblasst die Helligkeit, und du findest dich auf, als erwachtest du aus einem langen Schlaf, tief im Wald. In der Ferne hörst du leise einen Singvogel und die Geräusche des Waldes.',
  'Your prayers are not heard.': 'Deine Gebete werden nicht erhört.',
  "There's not much lake left....": 'Vom See ist nicht mehr viel übrig....',
  "It's too wide to cross.": 'Es ist zu breit zum Überqueren.',
  "You can't swim in this lake.": 'In diesem See kannst du nicht schwimmen.',
  "You can't swim in the stream.": 'In dem Bach kannst du nicht schwimmen.',
  'The other side is a sheer rock cliff.':
    'Die andere Seite ist eine schroffe Felswand.',
  "It's too far to jump, and there's no bridge.":
    'Es ist zu weit zum Springen, und es gibt keine Brücke.',
  'The gate is protected by an invisible force. It makes your teeth ache to touch it.':
    'Das Tor ist von einer unsichtbaren Kraft geschützt. Es zu berühren tut deinen Zähnen weh.',
  'There is too much gas to blow away.':
    'Es ist zu viel Gas, um es wegzupusten.',
  'It smells like coal gas in here.': 'Es riecht hier nach Kohlengas.',
  'The robber, rummaging through his bag, dropped a few items he found valueless.':
    'Der Räuber, der seinen Sack durchwühlte, ließ ein paar Gegenstände fallen, die er für wertlos hielt.',
  'You are in perfect health.': 'Du bist bei bester Gesundheit.',
  'It takes a talented person to be killed while already dead. YOU are such a talent. Unfortunately, it takes a talented person to deal with it. I am not such a talent. Sorry.':
    'Es braucht ein Talent, um getötet zu werden, während man bereits tot ist. DU bist ein solches Talent. Leider braucht es ein Talent, um damit umzugehen. Ich bin kein solches Talent. Tut mir leid.',
  'Bad luck, huh?': 'Pech gehabt, was?',
  "You clearly are a suicidal maniac. We don't allow psychotics in the cave, since they may harm other adventurers. Your remains will be installed in the Land of the Living Dead, where your fellow adventurers may gloat over them.":
    'Du bist eindeutig ein selbstmörderischer Wahnsinniger. Wir lassen keine Psychotiker in die Höhle, da sie anderen Abenteurern schaden könnten. Deine Überreste werden im Land der lebenden Toten ausgestellt, wo deine Abenteurerkollegen sich an ihnen weiden mögen.',
  'As you take your last breath, you feel relieved of your burdens. The feeling passes as you find yourself before the gates of Hell, where the spirits jeer at you and deny you entry. Your senses are disturbed. The objects in the dungeon appear indistinct, bleached of color, even unreal.':
    'Während du deinen letzten Atemzug tust, fühlst du dich von deinen Lasten befreit. Das Gefühl vergeht, als du dich vor den Toren der Hölle wiederfindest, wo die Geister dich verhöhnen und dir den Eintritt verwehren. Deine Sinne sind gestört. Die Gegenstände im Verlies erscheinen verschwommen, farbentleert, ja geradezu unwirklich.',
  "Now, let's take a look here... Well, you probably deserve another chance. I can't quite fix you up completely, but you can't have everything.":
    'So, schauen wir mal her... Na ja, du verdienst wohl eine zweite Chance. Ganz wieder herrichten kann ich dich nicht, aber man kann eben nicht alles haben.',
  "What the heck! You won't make friends this way, but nobody around here is too friendly anyhow. Gulp!":
    "Was soll's! So machst du dir keine Freunde, aber hier in der Gegend ist sowieso niemand allzu freundlich. Schluck!",
  'The chain is secure.': 'Die Kette ist gut befestigt.',
  'Perhaps you should do that to the basket.':
    'Vielleicht solltest du das mit dem Korb tun.',
  'The chain secures a basket within the shaft.':
    'Die Kette hält einen Korb im Schacht.',
}
