// Zork I × French object forms (spec §4.2). Keys are EN printed names as they
// appear in output (the ZIL DESC strings — see `make extract-strings`).
// French form keys: indef ("une bouteille en verre"), def ("la bouteille en
// verre"), bare ("bouteille en verre"). Gender and elision live entirely in
// the pre-composed strings — there is no grammar code: vowel-initial nouns
// pre-compose the elision ("l'œuf"), mass nouns use the partitive ("de
// l'eau", "du sable"), inherently plural objects use "des"/"les".
//
// Authoring rules (round-trip gate, roundtrip.test.ts, spec §7.5):
// - The HEAD NOUN of every form is the FR input lexicon's primary surface
//   form (first entry of FR_ZORK1[canonical]); modifiers mirror the EN
//   printed name.
// - Every full noun phrase here (articles stripped, fold()ed) MUST be an
//   entry of FR_ZORK1[canonical] — the player types back exactly what they
//   read, so display vocab and input vocab may never drift. If a natural
//   display phrase is missing from the lexicon, ADD it there (keeping the
//   lexicon validation suite green) — never bend the French to fit.
// - Entries follow FR_ZORK1's (vocab-canonical) order for side-by-side
//   navigation.
import type { ObjectsTable } from '../types'

export const ZORK1_FR_OBJECTS: ObjectsTable = {
  altar: { indef: 'un autel', def: "l'autel", bare: 'autel' },
  'ancient map': {
    indef: 'une carte ancienne',
    def: 'la carte ancienne',
    bare: 'carte ancienne',
  },
  basket: { indef: 'un panier', def: 'le panier', bare: 'panier' },
  bat: {
    indef: 'une chauve-souris',
    def: 'la chauve-souris',
    bare: 'chauve-souris',
  },
  'beautiful brass bauble': {
    indef: 'une belle babiole en laiton',
    def: 'la belle babiole en laiton',
    bare: 'belle babiole en laiton',
  },
  'beautiful jeweled scarab': {
    indef: 'un beau scarabée serti de joyaux',
    def: 'le beau scarabée serti de joyaux',
    bare: 'beau scarabée serti de joyaux',
  },
  "bird's nest": {
    indef: "un nid d'oiseau",
    def: "le nid d'oiseau",
    bare: "nid d'oiseau",
  },
  'black book': {
    indef: 'un livre noir',
    def: 'le livre noir',
    bare: 'livre noir',
  },
  'blast of air': {
    indef: "un souffle d'air",
    def: "le souffle d'air",
    bare: "souffle d'air",
  },
  blessings: {
    indef: 'des bénédictions',
    def: 'les bénédictions',
    bare: 'bénédictions',
  },
  'bloody axe': {
    indef: 'une hache ensanglantée',
    def: 'la hache ensanglantée',
    bare: 'hache ensanglantée',
  },
  'blue button': {
    indef: 'un bouton bleu',
    def: 'le bouton bleu',
    bare: 'bouton bleu',
  },
  board: { indef: 'une planche', def: 'la planche', bare: 'planche' },
  'boarded window': {
    indef: 'une fenêtre condamnée',
    def: 'la fenêtre condamnée',
    bare: 'fenêtre condamnée',
  },
  bolt: { indef: 'un boulon', def: 'le boulon', bare: 'boulon' },
  'brass bell': {
    indef: 'une cloche en laiton',
    def: 'la cloche en laiton',
    bare: 'cloche en laiton',
  },
  'brass lantern': {
    indef: 'une lampe en laiton',
    def: 'la lampe en laiton',
    bare: 'lampe en laiton',
  },
  'broken clockwork canary': {
    indef: 'un canari mécanique cassé',
    def: 'le canari mécanique cassé',
    bare: 'canari mécanique cassé',
  },
  // Adjective order: «cassé» binds to the head noun, so it precedes the
  // participial phrase — "un œuf cassé incrusté de joyaux" reads naturally.
  'broken jewel-encrusted egg': {
    indef: 'un œuf cassé incrusté de joyaux',
    def: "l'œuf cassé incrusté de joyaux",
    bare: 'œuf cassé incrusté de joyaux',
  },
  'broken lantern': {
    indef: 'une lampe cassée',
    def: 'la lampe cassée',
    bare: 'lampe cassée',
  },
  'broken timber': {
    indef: 'une poutre brisée',
    def: 'la poutre brisée',
    bare: 'poutre brisée',
  },
  'brown button': {
    indef: 'un bouton marron',
    def: 'le bouton marron',
    bare: 'bouton marron',
  },
  'brown sack': {
    indef: 'un sac marron',
    def: 'le sac marron',
    bare: 'sac marron',
  },
  'burned-out lantern': {
    indef: 'une lampe morte',
    def: 'la lampe morte',
    bare: 'lampe morte',
  },
  carpet: { indef: 'un tapis', def: 'le tapis', bare: 'tapis' },
  chalice: { indef: 'un calice', def: 'le calice', bare: 'calice' },
  chimney: { indef: 'une cheminée', def: 'la cheminée', bare: 'cheminée' },
  chute: { indef: 'une glissière', def: 'la glissière', bare: 'glissière' },
  cliff: { indef: 'une falaise', def: 'la falaise', bare: 'falaise' },
  'clove of garlic': {
    indef: "une gousse d'ail",
    def: "la gousse d'ail",
    bare: "gousse d'ail",
  },
  'control panel': {
    indef: 'un panneau de contrôle',
    def: 'le panneau de contrôle',
    bare: 'panneau de contrôle',
  },
  crack: { indef: 'une fissure', def: 'la fissure', bare: 'fissure' },
  'crystal skull': {
    indef: 'un crâne de cristal',
    def: 'le crâne de cristal',
    bare: 'crâne de cristal',
  },
  'crystal trident': {
    indef: 'un trident de cristal',
    def: 'le trident de cristal',
    bare: 'trident de cristal',
  },
  cyclops: { indef: 'un cyclope', def: 'le cyclope', bare: 'cyclope' },
  dam: { indef: 'un barrage', def: 'le barrage', bare: 'barrage' },
  door: { indef: 'une porte', def: 'la porte', bare: 'porte' },
  forest: { indef: 'une forêt', def: 'la forêt', bare: 'forêt' },
  'glass bottle': {
    indef: 'une bouteille en verre',
    def: 'la bouteille en verre',
    bare: 'bouteille en verre',
  },
  'gold coffin': {
    indef: 'un cercueil en or',
    def: 'le cercueil en or',
    bare: 'cercueil en or',
  },
  'golden clockwork canary': {
    indef: 'un canari mécanique doré',
    def: 'le canari mécanique doré',
    bare: 'canari mécanique doré',
  },
  'granite wall': {
    indef: 'un mur de granit',
    def: 'le mur de granit',
    bare: 'mur de granit',
  },
  grating: { indef: 'une grille', def: 'la grille', bare: 'grille' },
  'green bubble': {
    indef: 'une bulle verte',
    def: 'la bulle verte',
    bare: 'bulle verte',
  },
  ground: { indef: 'un sol', def: 'le sol', bare: 'sol' },
  'group of tool chests': {
    indef: 'des caisses à outils',
    def: 'les caisses à outils',
    bare: 'caisses à outils',
  },
  'hand-held air pump': {
    indef: 'une pompe à air',
    def: 'la pompe à air',
    bare: 'pompe à air',
  },
  'huge diamond': {
    indef: 'un énorme diamant',
    def: "l'énorme diamant",
    bare: 'énorme diamant',
  },
  'jade figurine': {
    indef: 'une figurine de jade',
    def: 'la figurine de jade',
    bare: 'figurine de jade',
  },
  'jewel-encrusted egg': {
    indef: 'un œuf incrusté de joyaux',
    def: "l'œuf incrusté de joyaux",
    bare: 'œuf incrusté de joyaux',
  },
  'kitchen table': {
    indef: 'une table de cuisine',
    def: 'la table de cuisine',
    bare: 'table de cuisine',
  },
  'kitchen window': {
    indef: 'une fenêtre de cuisine',
    def: 'la fenêtre de cuisine',
    bare: 'fenêtre de cuisine',
  },
  'large bag': {
    indef: 'un grand sac',
    def: 'le grand sac',
    bare: 'grand sac',
  },
  'large emerald': {
    indef: 'une grosse émeraude',
    def: 'la grosse émeraude',
    bare: 'grosse émeraude',
  },
  leaflet: { indef: 'un dépliant', def: 'le dépliant', bare: 'dépliant' },
  leak: { indef: 'une fuite', def: 'la fuite', bare: 'fuite' },
  'leather bag of coins': {
    indef: 'un sac en cuir plein de pièces',
    def: 'le sac en cuir plein de pièces',
    bare: 'sac en cuir plein de pièces',
  },
  lunch: { indef: 'un déjeuner', def: 'le déjeuner', bare: 'déjeuner' },
  // 'grue' is kept as the untranslatable Zork monster (lexicon policy); the
  // masculine article marks it as the creature, not «la grue» (the bird).
  'lurking grue': { indef: 'un grue', def: 'le grue', bare: 'grue' },
  machine: { indef: 'une machine', def: 'la machine', bare: 'machine' },
  'magic boat': {
    indef: 'un bateau magique',
    def: 'le bateau magique',
    bare: 'bateau magique',
  },
  matchbook: {
    indef: 'des allumettes',
    def: 'les allumettes',
    bare: 'allumettes',
  },
  mirror: { indef: 'un miroir', def: 'le miroir', bare: 'miroir' },
  'mountain range': {
    indef: 'des montagnes',
    def: 'les montagnes',
    bare: 'montagnes',
  },
  'nasty knife': {
    indef: 'un vilain couteau',
    def: 'le vilain couteau',
    bare: 'vilain couteau',
  },
  'number of ghosts': {
    indef: 'des fantômes',
    def: 'les fantômes',
    bare: 'fantômes',
  },
  painting: { indef: 'un tableau', def: 'le tableau', bare: 'tableau' },
  'pair of candles': {
    indef: 'des bougies',
    def: 'les bougies',
    bare: 'bougies',
  },
  'pair of hands': { indef: 'des mains', def: 'les mains', bare: 'mains' },
  passage: { indef: 'un passage', def: 'le passage', bare: 'passage' },
  pedestal: { indef: 'un piédestal', def: 'le piédestal', bare: 'piédestal' },
  'pile of bodies': {
    indef: 'un tas de cadavres',
    def: 'le tas de cadavres',
    bare: 'tas de cadavres',
  },
  'pile of leaves': {
    indef: 'un tas de feuilles',
    def: 'le tas de feuilles',
    bare: 'tas de feuilles',
  },
  'pile of plastic': {
    indef: 'un tas de plastique',
    def: 'le tas de plastique',
    bare: 'tas de plastique',
  },
  'platinum bar': {
    indef: 'une barre de platine',
    def: 'la barre de platine',
    bare: 'barre de platine',
  },
  'pot of gold': {
    indef: "un pot d'or",
    def: "le pot d'or",
    bare: "pot d'or",
  },
  prayer: { indef: 'une prière', def: 'la prière', bare: 'prière' },
  'punctured boat': {
    indef: 'un bateau crevé',
    def: 'le bateau crevé',
    bare: 'bateau crevé',
  },
  'quantity of water': { indef: "de l'eau", def: "l'eau", bare: 'eau' },
  rainbow: {
    indef: 'un arc-en-ciel',
    def: "l'arc-en-ciel",
    bare: 'arc-en-ciel',
  },
  'red buoy': {
    indef: 'une bouée rouge',
    def: 'la bouée rouge',
    bare: 'bouée rouge',
  },
  'red button': {
    indef: 'un bouton rouge',
    def: 'le bouton rouge',
    bare: 'bouton rouge',
  },
  'red hot brass bell': {
    indef: 'une cloche brûlante',
    def: 'la cloche brûlante',
    bare: 'cloche brûlante',
  },
  river: { indef: 'une rivière', def: 'la rivière', bare: 'rivière' },
  rope: { indef: 'une corde', def: 'la corde', bare: 'corde' },
  'rusty knife': {
    indef: 'un couteau rouillé',
    def: 'le couteau rouillé',
    bare: 'couteau rouillé',
  },
  sailor: { indef: 'un marin', def: 'le marin', bare: 'marin' },
  sand: { indef: 'du sable', def: 'le sable', bare: 'sable' },
  'sapphire-encrusted bracelet': {
    indef: 'un bracelet incrusté de saphirs',
    def: 'le bracelet incrusté de saphirs',
    bare: 'bracelet incrusté de saphirs',
  },
  sceptre: { indef: 'un sceptre', def: 'le sceptre', bare: 'sceptre' },
  screwdriver: {
    indef: 'un tournevis',
    def: 'le tournevis',
    bare: 'tournevis',
  },
  'set of teeth': { indef: 'des dents', def: 'les dents', bare: 'dents' },
  shovel: { indef: 'une pelle', def: 'la pelle', bare: 'pelle' },
  skeleton: { indef: 'un squelette', def: 'le squelette', bare: 'squelette' },
  // «passe-partout» is the idiomatic French for a skeleton key — the literal
  // calque «clé squelette» stays an input synonym only.
  'skeleton key': {
    indef: 'un passe-partout',
    def: 'le passe-partout',
    bare: 'passe-partout',
  },
  'small mailbox': {
    indef: 'une petite boîte aux lettres',
    def: 'la petite boîte aux lettres',
    bare: 'petite boîte aux lettres',
  },
  'small piece of vitreous slag': {
    indef: 'un petit morceau de scorie vitreuse',
    def: 'le petit morceau de scorie vitreuse',
    bare: 'petit morceau de scorie vitreuse',
  },
  'small pile of coal': {
    indef: 'un petit tas de charbon',
    def: 'le petit tas de charbon',
    bare: 'petit tas de charbon',
  },
  songbird: {
    indef: 'un oiseau chanteur',
    def: "l'oiseau chanteur",
    bare: 'oiseau chanteur',
  },
  stairs: { indef: 'un escalier', def: "l'escalier", bare: 'escalier' },
  stiletto: { indef: 'un stylet', def: 'le stylet', bare: 'stylet' },
  'stone barrow': { indef: 'un tumulus', def: 'le tumulus', bare: 'tumulus' },
  'stone door': {
    indef: 'une porte de pierre',
    def: 'la porte de pierre',
    bare: 'porte de pierre',
  },
  'surrounding wall': {
    indef: "un mur d'enceinte",
    def: "le mur d'enceinte",
    bare: "mur d'enceinte",
  },
  switch: {
    indef: 'un interrupteur',
    def: "l'interrupteur",
    bare: 'interrupteur',
  },
  sword: { indef: 'une épée', def: "l'épée", bare: 'épée' },
  table: { indef: 'une table', def: 'la table', bare: 'table' },
  'tan label': {
    indef: 'une étiquette beige',
    def: "l'étiquette beige",
    bare: 'étiquette beige',
  },
  thief: { indef: 'un voleur', def: 'le voleur', bare: 'voleur' },
  torch: { indef: 'une torche', def: 'la torche', bare: 'torche' },
  'tour guidebook': {
    indef: 'un guide touristique',
    def: 'le guide touristique',
    bare: 'guide touristique',
  },
  'trap door': { indef: 'une trappe', def: 'la trappe', bare: 'trappe' },
  tree: { indef: 'un arbre', def: "l'arbre", bare: 'arbre' },
  troll: { indef: 'un troll', def: 'le troll', bare: 'troll' },
  'trophy case': {
    indef: 'une vitrine à trophées',
    def: 'la vitrine à trophées',
    bare: 'vitrine à trophées',
  },
  'trunk of jewels': {
    indef: 'une malle de bijoux',
    def: 'la malle de bijoux',
    bare: 'malle de bijoux',
  },
  tube: { indef: 'un tube', def: 'le tube', bare: 'tube' },
  'viscous material': {
    indef: 'une matière visqueuse',
    def: 'la matière visqueuse',
    bare: 'matière visqueuse',
  },
  'wall with engravings': {
    indef: 'un mur gravé',
    def: 'le mur gravé',
    bare: 'mur gravé',
  },
  water: { indef: "de l'eau", def: "l'eau", bare: 'eau' },
  'white cliffs': {
    indef: 'des falaises blanches',
    def: 'les falaises blanches',
    bare: 'falaises blanches',
  },
  'white house': {
    indef: 'une maison blanche',
    def: 'la maison blanche',
    bare: 'maison blanche',
  },
  'wooden door': {
    indef: 'une porte en bois',
    def: 'la porte en bois',
    bare: 'porte en bois',
  },
  'wooden ladder': {
    indef: 'une échelle en bois',
    def: "l'échelle en bois",
    bare: 'échelle en bois',
  },
  'wooden railing': {
    indef: 'une rambarde en bois',
    def: 'la rambarde en bois',
    bare: 'rambarde en bois',
  },
  wrench: {
    indef: 'une clé à molette',
    def: 'la clé à molette',
    bare: 'clé à molette',
  },
  'yellow button': {
    indef: 'un bouton jaune',
    def: 'le bouton jaune',
    bare: 'bouton jaune',
  },
  // Printed name keeps the game's "ZORK" capitalization; ZORK1_FR_CANONICAL
  // maps it onto the lowercase vocab canonical. The display drops the brand
  // («manuel du propriétaire») so the lexicon never needs 'zork' as a French
  // surface word (it would collide with the EN vocab word 'zork').
  "ZORK owner's manual": {
    indef: 'un manuel du propriétaire',
    def: 'le manuel du propriétaire',
    bare: 'manuel du propriétaire',
  },
  zorkmid: { indef: 'un zorkmid', def: 'le zorkmid', bare: 'zorkmid' },
}

/** Printed name → vocab canonical, for entries whose printed name differs
 * from the extracted-vocab canonical key in FR_ZORK1. Identity when absent. */
export const ZORK1_FR_CANONICAL: Readonly<Record<string, string>> = {
  "ZORK owner's manual": "zork owner's manual",
}
