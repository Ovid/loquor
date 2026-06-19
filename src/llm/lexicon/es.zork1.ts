// src/llm/lexicon/es.zork1.ts
// Spanish → Zork I noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork1.vocab.ts); VALUES are folded Spanish words/phrases
// (lámpara → lampara, buzón → buzon, montaña → montana).
// Validated by lexicon/validate.test.ts (key validity, fold idempotence,
// collision gate, FULL coverage). Entries follow the vocab's canonical order.
// Where Spanish genuinely merges objects (llave, cuchillo, boton, puerta,
// escalera…) the same word appears under several canonicals — ambiguity is
// first-class. Regional pairs appear where both are common
// (cerillas/fosforos, destornillador/desarmador).
import type { NounLexicon } from './types'

export const ES_ZORK1: NounLexicon = {
  altar: ['altar'], // ES altar = EN altar; same word (not in the EN word set — canonicals aren't)
  'ancient map': ['mapa', 'mapa antiguo'],
  basket: ['cesta', 'canasta', 'montacargas'], // the shaft dumbwaiter basket
  bat: ['murcielago'],
  'beautiful brass bauble': ['chucheria', 'baratija'],
  'beautiful jeweled scarab': ['escarabajo'],
  "bird's nest": ['nido', 'nido de pajaro'],
  'black book': ['libro', 'libro negro'],
  'blast of air': ['aire', 'soplo', 'pulmones', 'soplo de aire'],
  blessings: ['bendiciones'],
  'bloody axe': ['hacha', 'hacha ensangrentada'],
  'blue button': ['boton azul', 'boton'],
  board: ['tabla', 'tablas'],
  'boarded window': ['ventana tapiada', 'ventana clavada', 'ventana'],
  bolt: ['perno', 'tuerca'], // the dam's metal bolt (synonym 'nut')
  'brass bell': ['campana'],
  'brass lantern': ['lampara', 'linterna', 'farol', 'lampara de laton'], // UAT trap (uat-1/uat-2)
  'broken clockwork canary': ['canario roto', 'canario'],
  'broken jewel-encrusted egg': ['huevo roto', 'huevo'],
  'broken lantern': ['lampara rota', 'linterna rota'],
  'broken timber': ['viga', 'madero'],
  'brown button': ['boton marron', 'boton cafe', 'boton'],
  'brown sack': ['saco', 'bolsa'],
  'burned-out lantern': ['lampara quemada', 'lampara vieja'],
  carpet: ['alfombra'],
  chalice: ['caliz', 'copa'],
  chimney: ['chimenea'],
  chute: ['tobogan', 'rampa', 'conducto'],
  cliff: ['acantilado', 'risco', 'cornisa'],
  'clove of garlic': ['ajo', 'diente de ajo'],
  // ES panel = EN panel (the control panel's own synonym) — same object,
  // reviewed collision. 'tablero' as the alternative.
  'control panel': ['panel de control', 'tablero', 'panel'],
  crack: ['grieta', 'rendija'],
  // crystal skull: 'calavera de cristal' mirrors the existing 'craneo de cristal'
  'crystal skull': ['craneo', 'calavera', 'craneo de cristal', 'calavera de cristal'],
  'crystal trident': ['tridente'],
  cyclops: ['ciclope'],
  dam: ['presa', 'represa', 'dique'],
  door: ['puerta', 'puerta principal', 'puerta de entrada'], // the boarded front door
  forest: ['bosque'],
  'glass bottle': ['botella'],
  'gold coffin': ['ataud', 'ataud de oro'],
  'golden clockwork canary': ['canario', 'canario dorado'],
  'granite wall': ['muro de granito', 'pared de granito', 'muro', 'pared'],
  grating: ['reja', 'rejilla'],
  'green bubble': ['burbuja', 'burbuja verde'],
  ground: ['suelo', 'tierra'],
  'group of tool chests': ['cajas de herramientas', 'herramientas', 'cajas'],
  'hand-held air pump': ['bomba', 'inflador', 'bomba de aire'],
  'huge diamond': ['diamante'],
  // 'figurilla de jade': the 'jade' token = the EN 'jade' adjective — same
  // object, reviewed collision (fr precedent).
  'jade figurine': ['figurilla', 'estatuilla', 'figurilla de jade', 'jade'],
  'jewel-encrusted egg': ['huevo'],
  'kitchen table': ['mesa', 'mesa de la cocina'],
  'kitchen window': ['ventana', 'ventana de la cocina'],
  'large bag': ['bolsa grande', 'bolsa'], // the thief's bag
  'large emerald': ['esmeralda'],
  leaflet: ['folleto', 'panfleto'],
  leak: ['fuga', 'gotera', 'tuberia'], // synonym 'pipe'
  'leather bag of coins': ['monedas', 'bolsa de monedas', 'monedero'],
  // NOT 'sandwich': ES sándwich folds to the EN 'lunch' synonym 'sandwich' —
  // avoidable collision (de precedent), so the plain Spanish words instead.
  lunch: ['almuerzo', 'comida', 'bocadillo'],
  'lurking grue': ['grue'], // untranslatable proper noun — kept as-is by policy
  machine: ['maquina', 'tapa'], // 'tapa' = the diamond-machine lid (UAT: 'abre/cierra la tapa')
  'magic boat': ['bote', 'barca', 'balsa'], // the inflatable plastic boat
  matchbook: ['cerillas', 'fosforos', 'caja de cerillas'],
  mirror: ['espejo', 'reflejo'],
  'mountain range': ['montanas', 'cordillera', 'montana'],
  'nasty knife': ['cuchillo'],
  'number of ghosts': ['fantasmas', 'espiritus', 'espectros'],
  painting: ['cuadro', 'pintura', 'lienzo'],
  'pair of candles': ['velas', 'vela'],
  'pair of hands': ['manos', 'mano'],
  passage: ['sendero', 'camino', 'senda'], // the forest trail
  pedestal: ['pedestal', 'base'],
  'pile of bodies': ['cadaveres', 'cuerpos'],
  'pile of leaves': ['hojas', 'monton de hojas'],
  'pile of plastic': ['plastico', 'monton de plastico'],
  'platinum bar': ['barra de platino', 'lingote', 'barra'],
  'pot of gold': ['olla de oro', 'oro'],
  prayer: ['oracion', 'plegaria', 'inscripcion'], // the altar inscription
  'punctured boat': ['bote pinchado', 'bote roto', 'bote'],
  'quantity of water': ['agua', 'poco de agua'],
  rainbow: ['arcoiris', 'arco iris'],
  'red buoy': ['boya', 'boya roja'],
  'red button': ['boton rojo', 'boton'],
  'red hot brass bell': ['campana ardiente', 'campana caliente', 'campana'],
  river: ['rio'],
  rope: ['cuerda', 'soga'],
  'rusty knife': ['cuchillo oxidado', 'cuchillo'],
  sailor: ['marinero', 'marino'],
  sand: ['arena'],
  'sapphire-encrusted bracelet': ['pulsera', 'brazalete'],
  sceptre: ['cetro'],
  screwdriver: ['destornillador', 'desarmador'],
  'set of teeth': ['dientes'],
  shovel: ['pala'],
  skeleton: ['esqueleto', 'huesos'],
  // 'llave' is deliberately ambiguous (the ES cle-class trap): shared with
  // 'wrench' (llave inglesa) — Zork I's only other llave.
  'skeleton key': ['llave', 'llave maestra', 'ganzua'],
  'small mailbox': ['buzon'],
  'small piece of vitreous slag': ['escoria'],
  'small pile of coal': ['carbon', 'monton de carbon'],
  songbird: ['pajaro', 'ave', 'pajaro cantor'],
  // 'escalera' is deliberately shared with 'wooden ladder' — Spanish uses
  // the same word for stairs and ladders; ambiguity is first-class.
  stairs: ['escaleras', 'escalera', 'peldanos'],
  stiletto: ['estilete'],
  'stone barrow': ['tumulo', 'tumba'],
  'stone door': ['puerta de piedra', 'puerta'],
  'surrounding wall': ['muro', 'muralla', 'pared'],
  switch: ['interruptor'],
  sword: ['espada'],
  table: ['mesa'], // the attic table
  'tan label': ['etiqueta'],
  thief: ['ladron'],
  torch: ['antorcha'],
  'tour guidebook': ['guia', 'guia turistica'],
  'trap door': ['trampilla', 'escotilla'],
  tree: ['arbol', 'rama'],
  troll: ['trol'], // RAE spelling; a typed 'troll' passes through as EN vocab anyway
  'trophy case': ['vitrina', 'vitrina de trofeos'],
  'trunk of jewels': ['baul', 'cofre', 'joyas'],
  tube: ['tubo', 'pasta de dientes', 'dentifrico'], // the toothpaste-style tube of gunk
  'viscous material': ['masilla', 'pegote', 'sustancia viscosa'],
  'wall with engravings': ['grabados', 'inscripcion', 'pared con grabados'],
  water: ['agua', 'poco de agua'],
  'white cliffs': ['acantilados', 'acantilados blancos'],
  'white house': ['casa', 'casa blanca'],
  'wooden door': ['puerta de madera', 'puerta'],
  'wooden ladder': ['escalera de mano', 'escalera'],
  'wooden railing': ['barandilla', 'baranda'],
  wrench: ['llave', 'llave inglesa'],
  'yellow button': ['boton amarillo', 'boton'],
  // ES manual = EN manual (the guidebook's own synonym) — same object,
  // reviewed collision.
  "zork owner's manual": ['manual', 'manual del propietario'],
  zorkmid: ['zorkmid'], // untranslatable currency proper noun
}
