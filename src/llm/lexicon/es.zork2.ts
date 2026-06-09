// src/llm/lexicon/es.zork2.ts
// Spanish → Zork II noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork2.vocab.ts); VALUES are folded Spanish words/phrases
// (brújula → brujula, jaula, túnel → tunel).
// Validated by lexicon/validate.test.ts (key validity, fold idempotence,
// collision gate, FULL coverage). Entries follow the vocab's canonical order.
// Where Spanish genuinely merges objects (llave, collar, cubo, caja, puerta,
// esfera…) the same word appears under several canonicals — ambiguity is
// first-class. Cakes carry the three regional words (pastel/torta/tarta) so
// any region's bare word works.
import type { NounLexicon } from './types'

export const ES_ZORK2: NounLexicon = {
  aquarium: ['acuario', 'pecera'],
  'arcane item': ['alambique', 'pergamino'], // the workbench clutter (alembic/vellum)
  'baby sea serpent': ['serpiente bebe', 'cria de serpiente', 'serpiente'],
  'bank brochure': ['folleto', 'folleto del banco'],
  'barred window': ['ventana con barrotes', 'ventana'],
  basket: ['cesta', 'barquilla', 'globo', 'canasta'], // the wicker balloon nacelle
  'beautiful princess': ['princesa'],
  'black crystal sphere': ['esfera negra', 'bola negra', 'esfera'],
  'black obsidian stand': ['soporte de obsidiana', 'soporte negro', 'soporte'],
  'black string': ['mecha', 'cordel'], // the brick's fuse
  'blast of air': ['aire', 'soplo', 'pulmones'],
  blessings: ['bendiciones'],
  'blue book': ['libro azul', 'libro'],
  'blue crystal sphere': ['esfera azul', 'bola azul', 'esfera'],
  'blue label': ['etiqueta azul', 'etiqueta'],
  box: ['caja fuerte', 'caja'], // the Bank of Zork safe (emit 'safe')
  'braided wire': ['cuerda', 'cable', 'alambre'],
  brick: ['ladrillo'],
  bridge: ['puente'],
  'broken balloon': ['globo roto', 'globo'],
  'broken brass lantern': ['lampara rota', 'linterna rota'],
  'cake frosted with blue letters': ['pastel azul', 'pastel', 'torta', 'tarta'],
  'cake frosted with green letters': [
    'pastel verde',
    'pastel',
    'torta',
    'tarta',
  ],
  'cake frosted with orange letters': [
    'pastel naranja',
    'pastel',
    'torta',
    'tarta',
  ],
  'cake frosted with red letters': ['pastel rojo', 'pastel', 'torta', 'tarta'],
  card: ['tarjeta', 'ficha'],
  chasm: ['abismo', 'sima', 'barranco'],
  'china teapot': ['tetera'],
  'clear crystal sphere': ['esfera transparente', 'bola de cristal', 'esfera'],
  'cloth bag': ['bolsa de tela', 'bolsa', 'saco'],
  compass: ['brujula'],
  'crypt door': ['puerta de la cripta', 'puerta'],
  'dead sea serpent': ['serpiente muerta', 'serpiente'],
  'debris from an explosion': ['escombros', 'restos'],
  degree: ['diploma', 'titulo'],
  // 'llave' is deliberately ambiguous (the ES cle-class trap): both keys.
  'delicate gold key': ['llave', 'llave de oro', 'llave dorada'],
  demon: ['demonio'],
  'diamond shaped window': ['ventana de rombo', 'ventana brillante', 'ventana'],
  'diamond stand': ['soporte de diamante', 'soporte'],
  'door made of oak': ['puerta de roble', 'puerta'],
  'door partly covered in cobwebs': ['puerta con telaranas', 'puerta'],
  'east wall': ['pared este', 'muro este', 'pared', 'muro'],
  'elvish sword': ['espada', 'espada elfica'],
  'enormous menhir': ['menhir', 'monolito'], // ES menhir = EN menhir; same word
  'fancy violin': ['violin'], // ES violín folds to EN 'violin'; same object
  'flathead stamp': ['sello', 'estampilla'],
  footpad: ['bandido', 'salteador', 'ladron'],
  'frobozz magic grue repellent': ['repelente', 'repelente de grue'],
  'gaudy crown': ['corona'],
  gazebo: ['glorieta', 'cenador', 'quiosco'],
  // 'collar' is deliberately shared with 'pearl necklace' — Spanish uses the
  // same word for necklaces and animal collars.
  'gigantic dog collar': ['collar', 'collar de perro'],
  glacier: ['glaciar'],
  'gnome of zurich': ['gnomo', 'gnomo de zurich'],
  'golden dragon statuette': [
    'estatuilla',
    'dragon dorado',
    'estatuilla de dragon',
  ],
  'green book': ['libro verde', 'libro'],
  'green piece of paper': ['papel verde', 'papel', 'instrucciones'],
  ground: ['suelo', 'tierra'],
  'group of wooden posts': ['postes', 'estacas'],
  hedge: ['seto', 'setos'],
  hole: ['ranura', 'agujero'], // vocab emit is 'slot' (the bank machine slot)
  hook: ['gancho'],
  'huge dead dragon': ['dragon muerto', 'dragon'],
  'huge red dragon': ['dragon', 'dragon rojo'], // dragón, folded
  keyhole: ['cerradura', 'ojo de la cerradura'],
  lamp: ['lampara', 'linterna'],
  'large oblong table': ['mesa grande', 'mesa alargada', 'mesa'],
  // 'cubo' is deliberately shared with 'wooden bucket' — Spanish cubo is
  // both cube and bucket; ambiguity is first-class.
  'large stone cube': ['cubo', 'cubo de piedra', 'camara acorazada'], // the vault
  leak: ['fuga'],
  'letter opener': ['abrecartas'],
  // NOT 'guardian' for the door keeper: EN vocab has 'guardian' (a different
  // word's family) — cross-canonical hijack risk, fr 'grave' precedent.
  lizard: ['lagarto', 'lagartija'], // the nasty door keeper
  'lurking grue': ['grue'], // untranslatable proper noun — kept as-is by policy
  'mangled cage': ['jaula aplastada', 'jaula retorcida', 'jaula'],
  'marble crypt': ['cripta', 'tumba', 'sepulcro'],
  matchbook: ['cerillas', 'fosforos', 'caja de cerillas'],
  // NOT 'tapa de metal': 'metal' is itself an EN vocab word — just 'tapa'.
  'metal lid': ['tapa'],
  mosses: ['musgo', 'musgos'],
  'narrow crack': ['grieta', 'rendija'],
  newspaper: ['periodico', 'diario'],
  'nicked swords': ['espadas', 'espadas melladas'],
  'north wall': ['pared norte', 'muro norte', 'pared', 'muro'],
  'package of candy': ['caramelos', 'dulces', 'golosinas'],
  'pair of hands': ['manos', 'mano'],
  passage: ['sendero', 'camino', 'senda'], // the forest trail (cf. 'tunnel')
  'pearl necklace': ['collar', 'collar de perlas'],
  pentagram: ['pentagrama', 'pentaculo'],
  'perfect rose': ['rosa', 'rosa perfecta'],
  'place mat': ['mantel individual', 'mantelito'],
  'pool of tears': ['charco', 'lagrimas', 'charco de lagrimas'],
  'portrait of j. pierpont flathead': ['retrato', 'cuadro'],
  'priceless zorkmid': ['moneda de oro', 'moneda', 'zorkmid'], // the gold coin
  'purple book': ['libro morado', 'libro violeta', 'libro'],
  'quantity of salty water': ['agua salada', 'agua'],
  'quantity of water': ['agua'],
  receptacle: ['receptaculo', 'recipiente', 'brasero'], // the balloon's fire box
  'red crystal sphere': ['esfera roja', 'bola roja', 'esfera'],
  ribbon: ['cinta', 'lazo'],
  robot: ['robot'], // ES robot = EN robot; same word, same object
  roses: ['rosas', 'rosal'],
  'rotten wooden chest': ['cofre podrido', 'baul', 'cofre'],
  'round button': ['boton redondo', 'boton'],
  ruby: ['rubi'],
  'ruby stand': ['soporte de rubi', 'soporte'],
  'rusty iron key': ['llave', 'llave oxidada', 'llave de hierro'],
  'safety deposit box': ['caja de seguridad', 'caja'],
  sailor: ['marinero', 'marino'],
  'sapphire stand': ['soporte de zafiro', 'soporte'],
  'secret door': ['puerta secreta', 'puerta'],
  'set of poled heads': ['cabezas', 'cabezas empaladas'],
  'set of used wands': ['varitas', 'varitas usadas'],
  'shimmering curtain of light': ['cortina', 'cortina de luz'],
  'small bottles': ['botellitas', 'frascos', 'botellas'],
  'smashed trophy cabinet': ['vitrina rota', 'vitrina'],
  'solid steel cage': ['jaula', 'jaula de acero'],
  'south wall': ['pared sur', 'muro sur', 'pared', 'muro'],
  sphere: ['esfera', 'bola'],
  'square button': ['boton cuadrado', 'boton'],
  'stack of zorkmid bills': ['billetes', 'fajo', 'dinero'],
  stairs: ['escaleras', 'escalera'],
  'steel box': ['caja de acero', 'caja abollada', 'caja'], // the dented steel box treasure
  'stone door': ['puerta de piedra', 'puerta'],
  'stoppered glass flask filled with liquid': ['frasco', 'matraz'],
  stream: ['arroyo', 'riachuelo'],
  table: ['mesa'], // the dusty wooden table
  'three-headed dog': ['perro', 'cerbero', 'perro de tres cabezas'],
  'triangular button': ['boton triangular', 'boton'],
  tunnel: ['tunel', 'pasadizo', 'galeria'], // the dark smoky passage
  unicorn: ['unicornio'],
  'volcano gnome': ['gnomo del volcan', 'gnomo'],
  'wall with etchings': ['grabados', 'pared con grabados'],
  'warning label': ['etiqueta', 'advertencia'],
  water: ['agua'],
  well: ['pozo'],
  'west wall': ['pared oeste', 'muro oeste', 'pared', 'muro'],
  'white book': ['libro blanco', 'libro'],
  wish: ['deseo'],
  'wizard of frobozz': ['mago', 'hechicero'],
  // 'varita' is deliberately shared with 'set of used wands'.
  "wizard's magic wand": ['varita', 'varita magica'],
  "wizard's trophy cabinet": ['vitrina', 'vitrina de trofeos', 'armario'],
  "wizard's workbench": ['banco de trabajo', 'mesa de trabajo'],
  'wooden bucket': ['cubo', 'balde'],
  'wooden club': ['garrote', 'porra'],
  zorkmid: ['zorkmid'], // untranslatable currency proper noun
}
