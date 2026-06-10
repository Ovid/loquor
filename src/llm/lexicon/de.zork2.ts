// src/llm/lexicon/de.zork2.ts
// German → Zork II noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork2.vocab.ts); VALUES are folded German words/phrases
// (Schlüssel → schlussel, Käfig → kafig, süß → suss).
// Validated by lexicon/validate.test.ts (key validity, fold idempotence,
// collision gate, FULL coverage). Entries follow the vocab's canonical order.
// Where German genuinely merges objects (schlussel, kugel, knopf, tur,
// truhe…) the same word appears under several canonicals — ambiguity is
// first-class. Compounds AND their bare heads both appear where players type
// either (goldschlussel/schlussel, perlenkette/kette).
// NOTE on walls: bare 'wand' is BANNED in this game — EN vocab has 'wand'
// (the wizard's magic wand), a different object (cross-canonical hijack,
// fr's 'grave' precedent). Wall entries use 'mauer' + '…wand' compounds.
import type { NounLexicon } from './types'

export const DE_ZORK2: NounLexicon = {
  aquarium: ['aquarium'], // DE Aquarium = EN aquarium (same word, same object)
  'arcane item': ['destillierkolben', 'pergament'], // workbench clutter (alembic/vellum)
  'baby sea serpent': ['seeschlange', 'baby seeschlange'],
  'bank brochure': ['broschure', 'prospekt'],
  'barred window': ['vergittertes fenster', 'fenster'],
  basket: ['korb', 'gondel', 'ballon', 'heissluftballon'], // the wicker balloon
  'beautiful princess': ['prinzessin'],
  'black crystal sphere': ['schwarze kugel', 'kugel'],
  'black obsidian stand': ['obsidiansockel', 'schwarzer sockel', 'sockel'],
  'black string': ['schnur', 'zundschnur', 'lunte'], // the brick's fuse
  'blast of air': ['luft', 'luftstoss', 'atem'],
  blessings: ['segen', 'segnungen'],
  'blue book': ['blaues buch', 'buch'],
  'blue crystal sphere': ['blaue kugel', 'kugel'],
  'blue label': ['blaues etikett', 'etikett'],
  box: ['tresor', 'safe', 'geldschrank'], // the Bank of Zork safe (emit 'safe')
  'braided wire': ['seil', 'kabel', 'draht'],
  brick: ['ziegel', 'ziegelstein', 'backstein'],
  bridge: ['brucke'],
  'broken balloon': ['kaputter ballon', 'ballon'],
  'broken brass lantern': ['kaputte lampe', 'kaputte laterne'],
  'cake frosted with blue letters': ['blauer kuchen', 'kuchen'],
  'cake frosted with green letters': ['gruner kuchen', 'kuchen'],
  'cake frosted with orange letters': ['oranger kuchen', 'kuchen'],
  'cake frosted with red letters': ['roter kuchen', 'kuchen'],
  card: ['karte', 'kartchen'],
  chasm: ['abgrund', 'kluft', 'schlucht'],
  'china teapot': ['teekanne'],
  'clear crystal sphere': ['klare kugel', 'kristallkugel', 'kugel'],
  'cloth bag': ['stoffbeutel', 'beutel', 'sack'],
  compass: ['kompass'],
  'crypt door': ['grufttur', 'tur'],
  'dead sea serpent': ['tote seeschlange', 'seeschlange'],
  'debris from an explosion': ['trummer', 'schutt'],
  degree: ['diplom', 'urkunde'],
  // 'schlussel' is deliberately ambiguous (the DE cle-class trap): both keys.
  'delicate gold key': ['schlussel', 'goldschlussel', 'goldener schlussel'],
  demon: ['damon'],
  'diamond shaped window': ['rautenfenster', 'fenster'],
  'diamond stand': ['diamantsockel', 'sockel'],
  'door made of oak': ['eichentur', 'tur'],
  'door partly covered in cobwebs': ['tur mit spinnweben', 'tur'],
  'east wall': ['ostwand', 'ostmauer', 'mauer'],
  'elvish sword': ['schwert', 'elfenschwert'],
  'enormous menhir': ['menhir', 'hinkelstein'],
  'fancy violin': ['geige', 'violine'],
  'flathead stamp': ['briefmarke'],
  footpad: ['rauber', 'strassenrauber', 'bandit'],
  'frobozz magic grue repellent': ['abwehrmittel', 'abwehrspray'],
  'gaudy crown': ['krone'],
  gazebo: ['pavillon', 'gartenlaube', 'laube'],
  // 'halsband' instead of the loanword — dodges fr/es's 'collar' collision.
  'gigantic dog collar': ['halsband', 'hundehalsband'],
  glacier: ['gletscher'],
  'gnome of zurich': ['gnom', 'gnom von zurich'],
  'golden dragon statuette': [
    'statuette',
    'drachenstatuette',
    'goldener drache',
  ],
  'green book': ['grunes buch', 'buch'],
  'green piece of paper': ['grunes papier', 'papier', 'anweisungen'],
  ground: ['boden', 'erde'],
  'group of wooden posts': ['pfosten', 'pfahle'],
  hedge: ['hecke', 'hecken'],
  hole: ['schlitz', 'loch'], // vocab emit is 'slot' (the bank machine slot)
  hook: ['haken'],
  'huge dead dragon': ['toter drache', 'drache'],
  'huge red dragon': ['drache', 'roter drache'],
  keyhole: ['schlusselloch'],
  lamp: ['lampe', 'laterne'],
  'large oblong table': ['grosser tisch', 'tisch'],
  'large stone cube': ['wurfel', 'steinwurfel', 'tresorraum'], // the vault
  leak: ['leck'],
  'letter opener': ['briefoffner'],
  lizard: ['echse', 'eidechse', 'turwachter'], // the nasty door keeper
  'lurking grue': ['grue'], // untranslatable proper noun — kept as-is by policy
  'mangled cage': ['verbogener kafig', 'kafig'],
  // NOT bare 'grab' (das Grab): the graben-imperative collision in the core.
  'marble crypt': ['gruft', 'krypta', 'grabmal'],
  matchbook: ['streichholzer', 'streichholzheftchen'],
  'metal lid': ['deckel'],
  mosses: ['moos', 'moose'],
  'narrow crack': ['riss', 'spalt'],
  newspaper: ['zeitung'],
  'nicked swords': ['schwerter', 'schartige schwerter'],
  'north wall': ['nordwand', 'nordmauer', 'mauer'],
  'package of candy': ['bonbons', 'sussigkeiten'],
  'pair of hands': ['hande', 'hand'],
  passage: ['pfad', 'weg'], // the forest trail (cf. 'tunnel')
  'pearl necklace': ['halskette', 'perlenkette', 'kette'],
  pentagram: ['pentagramm'],
  'perfect rose': ['rose', 'perfekte rose'], // DE Rose = EN rose (same object)
  'place mat': ['tischset', 'deckchen'],
  'pool of tears': ['tranen', 'tranenlache', 'pfutze'],
  'portrait of j. pierpont flathead': ['portrat', 'gemalde', 'bild'],
  'priceless zorkmid': ['goldmunze', 'munze', 'zorkmid'], // the gold coin
  'purple book': ['violettes buch', 'lila buch', 'buch'],
  'quantity of salty water': ['salzwasser', 'wasser'],
  'quantity of water': ['wasser'],
  receptacle: ['behalter', 'feuerkorb'], // the balloon's fire box
  'red crystal sphere': ['rote kugel', 'kugel'],
  ribbon: ['band', 'schleife'], // das Band ('band' is not an EN vocab word here)
  robot: ['roboter'],
  roses: ['rosen', 'rosenstrauch'],
  'rotten wooden chest': ['morsche truhe', 'truhe', 'kiste'],
  'round button': ['runder knopf', 'knopf'],
  ruby: ['rubin'],
  'ruby stand': ['rubinsockel', 'sockel'],
  'rusty iron key': ['schlussel', 'rostiger schlussel', 'eisenschlussel'],
  'safety deposit box': ['schliessfach', 'bankfach'],
  sailor: ['seemann', 'matrose'],
  'sapphire stand': ['saphirsockel', 'sockel'],
  'secret door': ['geheimtur', 'tur'],
  'set of poled heads': ['kopfe', 'aufgespiesste kopfe'],
  'set of used wands': ['zauberstabe', 'stabe'],
  'shimmering curtain of light': ['vorhang', 'lichtvorhang'],
  'small bottles': ['flaschchen', 'kleine flaschen', 'flaschen'],
  'smashed trophy cabinet': ['kaputte vitrine', 'vitrine'],
  'solid steel cage': ['kafig', 'stahlkafig'],
  'south wall': ['sudwand', 'sudmauer', 'mauer'],
  sphere: ['kugel', 'sphare'],
  'square button': ['eckiger knopf', 'viereckiger knopf', 'knopf'],
  'stack of zorkmid bills': ['geldscheine', 'scheine', 'geld'],
  stairs: ['treppe', 'stufen'],
  'steel box': ['stahlkiste', 'kiste'], // the dented steel box treasure
  'stone door': ['steintur', 'tur'],
  'stoppered glass flask filled with liquid': [
    'flakon',
    'phiole',
    'glasflasche',
  ],
  stream: ['bach'],
  table: ['tisch'], // the dusty wooden table
  'three-headed dog': ['hund', 'zerberus', 'dreikopfiger hund'],
  'triangular button': ['dreieckiger knopf', 'knopf'],
  tunnel: ['tunnel', 'gang', 'stollen'], // the dark smoky passage
  unicorn: ['einhorn'],
  'volcano gnome': ['vulkangnom', 'gnom'],
  // NOT 'wand mit gravuren': bare 'wand' is the EN wizard's wand (see header).
  'wall with etchings': ['gravuren', 'gravierte mauer'],
  'warning label': ['warnetikett', 'etikett', 'warnung'],
  water: ['wasser'],
  well: ['brunnen'],
  'west wall': ['westwand', 'westmauer', 'mauer'],
  'white book': ['weisses buch', 'buch'],
  wish: ['wunsch'],
  'wizard of frobozz': ['zauberer', 'magier'],
  // NOT bare 'stab' (der Stab): EN 'stab' is a combat VERB in this vocab —
  // different-meaning collision, so the compound only.
  "wizard's magic wand": ['zauberstab'],
  "wizard's trophy cabinet": ['vitrine', 'trophaenvitrine', 'schrank'],
  "wizard's workbench": ['werkbank'],
  'wooden bucket': ['eimer'],
  'wooden club': ['keule', 'knuppel'],
  zorkmid: ['zorkmid'], // untranslatable currency proper noun
}
