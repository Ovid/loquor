// Zork I × Spanish object forms (spec §4.2). Keys are EN printed names (same
// keys as zork1.fr.objects.ts). Spanish form keys: indef ("una botella"),
// def ("la botella"), bare ("botella"); add alDef/delDef ONLY where a template
// needs the a+el→al / de+el→del contraction (Task 6). Authored in Task 5.
//
// Authoring rules (round-trip gate, roundtrip.test.ts, spec §7.5):
// - Gender/number live entirely in the pre-composed strings (no grammar code):
//   masculine un/el, feminine una/la, plural unos/unas/los/las.
// - Every full noun phrase here, fold()ed with LEADING articles +
//   del/al/de/d stripped, MUST be an element of ES_ZORK1[canonical] (where
//   canonical = ZORK1_ES_CANONICAL[en] ?? en). The gate's stripHead only
//   strips LEADING head tokens, so a MEDIAL `de` survives: 'la lámpara de
//   latón' → 'lampara de laton'. For every "X de Y" compound the bare form is
//   either a single lexicon token (e.g. 'lámpara') or the full folded phrase
//   has been appended to ES_ZORK1[canonical].
// - Entries follow ZORK1_FR_OBJECTS' (vocab-canonical) order for side-by-side
//   navigation.
import type { ObjectsTable } from '../types'

export const ZORK1_ES_OBJECTS: ObjectsTable = {
  altar: { indef: 'un altar', def: 'el altar', bare: 'altar' },
  'ancient map': {
    indef: 'un mapa antiguo',
    def: 'el mapa antiguo',
    bare: 'mapa antiguo',
  },
  basket: { indef: 'una cesta', def: 'la cesta', bare: 'cesta' },
  bat: { indef: 'un murciélago', def: 'el murciélago', bare: 'murciélago' },
  'beautiful brass bauble': {
    indef: 'una chuchería',
    def: 'la chuchería',
    bare: 'chuchería',
  },
  'beautiful jeweled scarab': {
    indef: 'un escarabajo',
    def: 'el escarabajo',
    bare: 'escarabajo',
  },
  "bird's nest": {
    indef: 'un nido de pájaro',
    def: 'el nido de pájaro',
    bare: 'nido de pájaro',
  },
  'black book': {
    indef: 'un libro negro',
    def: 'el libro negro',
    bare: 'libro negro',
  },
  'blast of air': {
    indef: 'un soplo de aire',
    def: 'el soplo de aire',
    bare: 'soplo de aire',
  },
  blessings: {
    indef: 'unas bendiciones',
    def: 'las bendiciones',
    bare: 'bendiciones',
  },
  'bloody axe': {
    indef: 'un hacha ensangrentada',
    def: 'el hacha ensangrentada',
    bare: 'hacha ensangrentada',
  },
  'blue button': {
    indef: 'un botón azul',
    def: 'el botón azul',
    bare: 'botón azul',
  },
  board: { indef: 'una tabla', def: 'la tabla', bare: 'tabla' },
  'boarded window': {
    indef: 'una ventana tapiada',
    def: 'la ventana tapiada',
    bare: 'ventana tapiada',
  },
  bolt: { indef: 'un perno', def: 'el perno', bare: 'perno' },
  'brass bell': { indef: 'una campana', def: 'la campana', bare: 'campana' },
  'brass lantern': {
    indef: 'una lámpara de latón',
    def: 'la lámpara de latón',
    bare: 'lámpara de latón',
  },
  'broken clockwork canary': {
    indef: 'un canario roto',
    def: 'el canario roto',
    bare: 'canario roto',
  },
  'broken jewel-encrusted egg': {
    indef: 'un huevo roto',
    def: 'el huevo roto',
    bare: 'huevo roto',
  },
  'broken lantern': {
    indef: 'una lámpara rota',
    def: 'la lámpara rota',
    bare: 'lámpara rota',
  },
  'broken timber': { indef: 'una viga', def: 'la viga', bare: 'viga' },
  'brown button': {
    indef: 'un botón marrón',
    def: 'el botón marrón',
    bare: 'botón marrón',
  },
  'brown sack': { indef: 'un saco', def: 'el saco', bare: 'saco' },
  'burned-out lantern': {
    indef: 'una lámpara quemada',
    def: 'la lámpara quemada',
    bare: 'lámpara quemada',
  },
  carpet: { indef: 'una alfombra', def: 'la alfombra', bare: 'alfombra' },
  chalice: { indef: 'un cáliz', def: 'el cáliz', bare: 'cáliz' },
  chimney: { indef: 'una chimenea', def: 'la chimenea', bare: 'chimenea' },
  chute: { indef: 'un tobogán', def: 'el tobogán', bare: 'tobogán' },
  cliff: { indef: 'un acantilado', def: 'el acantilado', bare: 'acantilado' },
  'clove of garlic': {
    indef: 'un diente de ajo',
    def: 'el diente de ajo',
    bare: 'diente de ajo',
  },
  // 'control'/'panel' tokens = the EN synonyms — reviewed collisions (es).
  'control panel': {
    indef: 'un panel de control',
    def: 'el panel de control',
    bare: 'panel de control',
  },
  crack: { indef: 'una grieta', def: 'la grieta', bare: 'grieta' },
  'crystal skull': {
    indef: 'un cráneo de cristal',
    def: 'el cráneo de cristal',
    bare: 'cráneo de cristal',
  },
  'crystal trident': {
    indef: 'un tridente',
    def: 'el tridente',
    bare: 'tridente',
  },
  cyclops: { indef: 'un cíclope', def: 'el cíclope', bare: 'cíclope' },
  dam: { indef: 'una presa', def: 'la presa', bare: 'presa' },
  door: { indef: 'una puerta', def: 'la puerta', bare: 'puerta' },
  forest: { indef: 'un bosque', def: 'el bosque', bare: 'bosque' },
  'glass bottle': {
    indef: 'una botella',
    def: 'la botella',
    bare: 'botella',
  },
  'gold coffin': {
    indef: 'un ataúd de oro',
    def: 'el ataúd de oro',
    bare: 'ataúd de oro',
  },
  'golden clockwork canary': {
    indef: 'un canario dorado',
    def: 'el canario dorado',
    bare: 'canario dorado',
  },
  'granite wall': {
    indef: 'un muro de granito',
    def: 'el muro de granito',
    bare: 'muro de granito',
  },
  grating: { indef: 'una reja', def: 'la reja', bare: 'reja' },
  'green bubble': {
    indef: 'una burbuja verde',
    def: 'la burbuja verde',
    bare: 'burbuja verde',
  },
  ground: { indef: 'un suelo', def: 'el suelo', bare: 'suelo' },
  'group of tool chests': {
    indef: 'unas cajas de herramientas',
    def: 'las cajas de herramientas',
    bare: 'cajas de herramientas',
  },
  'hand-held air pump': {
    indef: 'una bomba de aire',
    def: 'la bomba de aire',
    bare: 'bomba de aire',
  },
  'huge diamond': {
    indef: 'un diamante',
    def: 'el diamante',
    bare: 'diamante',
  },
  // 'jade' token = the EN 'jade' adjective — reviewed collision (es).
  'jade figurine': {
    indef: 'una figurilla de jade',
    def: 'la figurilla de jade',
    bare: 'figurilla de jade',
  },
  'jewel-encrusted egg': {
    indef: 'un huevo',
    def: 'el huevo',
    bare: 'huevo',
  },
  'kitchen table': {
    indef: 'una mesa de la cocina',
    def: 'la mesa de la cocina',
    bare: 'mesa de la cocina',
  },
  'kitchen window': {
    indef: 'una ventana de la cocina',
    def: 'la ventana de la cocina',
    bare: 'ventana de la cocina',
  },
  'large bag': {
    indef: 'una bolsa grande',
    def: 'la bolsa grande',
    bare: 'bolsa grande',
  },
  'large emerald': {
    indef: 'una esmeralda',
    def: 'la esmeralda',
    bare: 'esmeralda',
  },
  leaflet: { indef: 'un folleto', def: 'el folleto', bare: 'folleto' },
  leak: { indef: 'una fuga', def: 'la fuga', bare: 'fuga' },
  'leather bag of coins': {
    indef: 'una bolsa de monedas',
    def: 'la bolsa de monedas',
    bare: 'bolsa de monedas',
  },
  lunch: { indef: 'un almuerzo', def: 'el almuerzo', bare: 'almuerzo' },
  // 'grue' is the untranslatable Zork monster (lexicon policy).
  'lurking grue': { indef: 'un grue', def: 'el grue', bare: 'grue' },
  machine: { indef: 'una máquina', def: 'la máquina', bare: 'máquina' },
  'magic boat': { indef: 'un bote', def: 'el bote', bare: 'bote' },
  matchbook: {
    indef: 'una caja de cerillas',
    def: 'la caja de cerillas',
    bare: 'caja de cerillas',
  },
  mirror: { indef: 'un espejo', def: 'el espejo', bare: 'espejo' },
  'mountain range': {
    indef: 'unas montañas',
    def: 'las montañas',
    bare: 'montañas',
  },
  'nasty knife': { indef: 'un cuchillo', def: 'el cuchillo', bare: 'cuchillo' },
  'number of ghosts': {
    indef: 'unos fantasmas',
    def: 'los fantasmas',
    bare: 'fantasmas',
  },
  painting: { indef: 'un cuadro', def: 'el cuadro', bare: 'cuadro' },
  'pair of candles': { indef: 'unas velas', def: 'las velas', bare: 'velas' },
  'pair of hands': { indef: 'unas manos', def: 'las manos', bare: 'manos' },
  passage: { indef: 'un sendero', def: 'el sendero', bare: 'sendero' },
  pedestal: { indef: 'un pedestal', def: 'el pedestal', bare: 'pedestal' },
  'pile of bodies': {
    indef: 'unos cadáveres',
    def: 'los cadáveres',
    bare: 'cadáveres',
  },
  'pile of leaves': {
    indef: 'un montón de hojas',
    def: 'el montón de hojas',
    bare: 'montón de hojas',
  },
  'pile of plastic': {
    indef: 'un montón de plástico',
    def: 'el montón de plástico',
    bare: 'montón de plástico',
  },
  'platinum bar': {
    indef: 'una barra de platino',
    def: 'la barra de platino',
    bare: 'barra de platino',
  },
  'pot of gold': {
    indef: 'una olla de oro',
    def: 'la olla de oro',
    bare: 'olla de oro',
  },
  prayer: { indef: 'una oración', def: 'la oración', bare: 'oración' },
  'punctured boat': {
    indef: 'un bote pinchado',
    def: 'el bote pinchado',
    bare: 'bote pinchado',
  },
  'quantity of water': {
    indef: 'un poco de agua',
    def: 'el agua',
    bare: 'agua',
  },
  rainbow: { indef: 'un arcoíris', def: 'el arcoíris', bare: 'arcoíris' },
  'red buoy': {
    indef: 'una boya roja',
    def: 'la boya roja',
    bare: 'boya roja',
  },
  'red button': {
    indef: 'un botón rojo',
    def: 'el botón rojo',
    bare: 'botón rojo',
  },
  'red hot brass bell': {
    indef: 'una campana ardiente',
    def: 'la campana ardiente',
    bare: 'campana ardiente',
  },
  river: { indef: 'un río', def: 'el río', bare: 'río' },
  rope: { indef: 'una cuerda', def: 'la cuerda', bare: 'cuerda' },
  'rusty knife': {
    indef: 'un cuchillo oxidado',
    def: 'el cuchillo oxidado',
    bare: 'cuchillo oxidado',
  },
  sailor: { indef: 'un marinero', def: 'el marinero', bare: 'marinero' },
  // mass noun: indef carries no article (cf. water's partitive 'un poco de agua')
  sand: { indef: 'arena', def: 'la arena', bare: 'arena' },
  'sapphire-encrusted bracelet': {
    indef: 'una pulsera',
    def: 'la pulsera',
    bare: 'pulsera',
  },
  sceptre: { indef: 'un cetro', def: 'el cetro', bare: 'cetro' },
  screwdriver: {
    indef: 'un destornillador',
    def: 'el destornillador',
    bare: 'destornillador',
  },
  'set of teeth': {
    indef: 'unos dientes',
    def: 'los dientes',
    bare: 'dientes',
  },
  shovel: { indef: 'una pala', def: 'la pala', bare: 'pala' },
  skeleton: { indef: 'un esqueleto', def: 'el esqueleto', bare: 'esqueleto' },
  'skeleton key': {
    indef: 'una llave maestra',
    def: 'la llave maestra',
    bare: 'llave maestra',
  },
  'small mailbox': { indef: 'un buzón', def: 'el buzón', bare: 'buzón' },
  'small piece of vitreous slag': {
    indef: 'una escoria',
    def: 'la escoria',
    bare: 'escoria',
  },
  'small pile of coal': {
    indef: 'un montón de carbón',
    def: 'el montón de carbón',
    bare: 'montón de carbón',
  },
  songbird: {
    indef: 'un pájaro cantor',
    def: 'el pájaro cantor',
    bare: 'pájaro cantor',
  },
  // 'escalera' is shared with 'wooden ladder' — Spanish merges stairs/ladder.
  stairs: { indef: 'unas escaleras', def: 'las escaleras', bare: 'escaleras' },
  stiletto: { indef: 'un estilete', def: 'el estilete', bare: 'estilete' },
  'stone barrow': { indef: 'un túmulo', def: 'el túmulo', bare: 'túmulo' },
  'stone door': {
    indef: 'una puerta de piedra',
    def: 'la puerta de piedra',
    bare: 'puerta de piedra',
  },
  'surrounding wall': { indef: 'un muro', def: 'el muro', bare: 'muro' },
  switch: {
    indef: 'un interruptor',
    def: 'el interruptor',
    bare: 'interruptor',
  },
  sword: { indef: 'una espada', def: 'la espada', bare: 'espada' },
  table: { indef: 'una mesa', def: 'la mesa', bare: 'mesa' },
  'tan label': { indef: 'una etiqueta', def: 'la etiqueta', bare: 'etiqueta' },
  thief: { indef: 'un ladrón', def: 'el ladrón', bare: 'ladrón' },
  torch: { indef: 'una antorcha', def: 'la antorcha', bare: 'antorcha' },
  'tour guidebook': {
    indef: 'una guía turística',
    def: 'la guía turística',
    bare: 'guía turística',
  },
  'trap door': {
    indef: 'una trampilla',
    def: 'la trampilla',
    bare: 'trampilla',
  },
  tree: { indef: 'un árbol', def: 'el árbol', bare: 'árbol' },
  troll: { indef: 'un trol', def: 'el trol', bare: 'trol' },
  'trophy case': { indef: 'una vitrina', def: 'la vitrina', bare: 'vitrina' },
  'trunk of jewels': { indef: 'un baúl', def: 'el baúl', bare: 'baúl' },
  tube: { indef: 'un tubo', def: 'el tubo', bare: 'tubo' },
  'viscous material': {
    indef: 'una masilla',
    def: 'la masilla',
    bare: 'masilla',
  },
  'wall with engravings': {
    indef: 'una pared con grabados',
    def: 'la pared con grabados',
    bare: 'pared con grabados',
  },
  water: { indef: 'un poco de agua', def: 'el agua', bare: 'agua' },
  'white cliffs': {
    indef: 'unos acantilados blancos',
    def: 'los acantilados blancos',
    bare: 'acantilados blancos',
  },
  'white house': {
    indef: 'una casa blanca',
    def: 'la casa blanca',
    bare: 'casa blanca',
  },
  'wooden door': {
    indef: 'una puerta de madera',
    def: 'la puerta de madera',
    bare: 'puerta de madera',
  },
  'wooden ladder': {
    indef: 'una escalera de mano',
    def: 'la escalera de mano',
    bare: 'escalera de mano',
  },
  'wooden railing': {
    indef: 'una barandilla',
    def: 'la barandilla',
    bare: 'barandilla',
  },
  wrench: {
    indef: 'una llave inglesa',
    def: 'la llave inglesa',
    bare: 'llave inglesa',
  },
  'yellow button': {
    indef: 'un botón amarillo',
    def: 'el botón amarillo',
    bare: 'botón amarillo',
  },
  // Printed name keeps the game's "ZORK" capitalization; ZORK1_ES_CANONICAL
  // maps it onto the lowercase vocab canonical. The display drops the brand
  // («manual del propietario») so the lexicon never needs 'zork' as a Spanish
  // surface word (it would collide with the EN vocab word 'zork').
  "ZORK owner's manual": {
    indef: 'un manual del propietario',
    def: 'el manual del propietario',
    bare: 'manual del propietario',
  },
  zorkmid: { indef: 'un zorkmid', def: 'el zorkmid', bare: 'zorkmid' },
}

/** Printed name → vocab canonical, for entries whose printed name differs from
 * the extracted-vocab canonical key in ES_ZORK1. Identity when absent. */
export const ZORK1_ES_CANONICAL: Readonly<Record<string, string>> = {
  "ZORK owner's manual": "zork owner's manual",
}
