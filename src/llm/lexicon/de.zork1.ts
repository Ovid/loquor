// src/llm/lexicon/de.zork1.ts
// German → Zork I noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork1.vocab.ts); VALUES are folded German words/phrases
// (Schlüssel → schlussel, Falltür → falltur, weiß → weiss).
// Validated by lexicon/validate.test.ts (key validity, fold idempotence,
// collision gate, FULL coverage). Entries follow the vocab's canonical order.
// Where German genuinely merges objects (schlussel, messer, knopf, tur…)
// the same word appears under several canonicals — ambiguity is first-class.
// Compounds AND their bare heads both appear where players type either
// (messinglaterne/laterne, kuchenfenster/fenster).
import type { NounLexicon } from './types'

export const DE_ZORK1: NounLexicon = {
  altar: ['altar'], // DE Altar = EN altar; same word
  'ancient map': ['karte', 'landkarte', 'alte karte'],
  basket: ['korb', 'lastenkorb'], // the shaft dumbwaiter basket
  bat: ['fledermaus'],
  'beautiful brass bauble': ['schmuckstuck', 'kleinod'],
  'beautiful jeweled scarab': ['skarabaus', 'kafer'],
  "bird's nest": ['nest', 'vogelnest'], // DE Nest = EN nest (same object)
  'black book': ['buch', 'schwarzes buch'],
  'blast of air': ['luft', 'luftstoss', 'atem'],
  blessings: ['segen', 'segnungen'],
  'bloody axe': ['axt', 'beil', 'blutige axt'],
  'blue button': ['blauer knopf', 'knopf'],
  board: ['brett', 'bretter'],
  'boarded window': ['vernageltes fenster', 'verrammeltes fenster', 'fenster'],
  bolt: ['bolzen', 'riegel'], // the dam's metal bolt (synonym 'nut')
  'brass bell': ['glocke', 'messingglocke'],
  'brass lantern': ['lampe', 'laterne', 'messinglaterne'], // UAT trap (uat-1/uat-2)
  'broken clockwork canary': ['kaputter kanarienvogel', 'kanarienvogel'],
  'broken jewel-encrusted egg': ['kaputtes ei', 'ei'],
  'broken lantern': ['kaputte lampe', 'kaputte laterne'],
  'broken timber': ['balken', 'holzbalken'],
  'brown button': ['brauner knopf', 'knopf'],
  'brown sack': ['sack', 'beutel'],
  'burned-out lantern': ['ausgebrannte lampe', 'alte lampe'],
  carpet: ['teppich'],
  chalice: ['kelch', 'pokal'],
  chimney: ['kamin', 'schornstein'],
  chute: ['rutsche', 'schacht'],
  cliff: ['klippe', 'felsvorsprung'],
  'clove of garlic': ['knoblauch', 'knoblauchzehe'],
  'control panel': ['schalttafel', 'kontrollpult', 'pult'],
  crack: ['riss', 'spalt'],
  'crystal skull': ['schadel', 'kristallschadel'],
  'crystal trident': ['dreizack'],
  cyclops: ['zyklop'],
  dam: ['damm', 'staudamm'],
  door: ['tur', 'haustur', 'eingangstur'], // the boarded front door
  forest: ['wald'],
  'glass bottle': ['flasche'],
  'gold coffin': ['sarg', 'goldsarg'],
  'golden clockwork canary': ['kanarienvogel', 'goldener kanarienvogel'],
  'granite wall': ['granitwand', 'wand', 'mauer'],
  grating: ['gitter'],
  'green bubble': ['blase', 'grune blase'],
  ground: ['boden', 'erde'],
  'group of tool chests': ['werkzeugkisten', 'kisten'],
  'hand-held air pump': ['pumpe', 'luftpumpe'],
  'huge diamond': ['diamant'],
  'jade figurine': ['figur', 'jadefigur', 'statuette'],
  'jewel-encrusted egg': ['ei', 'juwelenei'],
  'kitchen table': ['tisch', 'kuchentisch'],
  'kitchen window': ['fenster', 'kuchenfenster'],
  'large bag': ['grosser sack', 'sack'], // the thief's bag
  'large emerald': ['smaragd'],
  leaflet: ['prospekt', 'flugblatt', 'broschure'],
  leak: ['leck', 'rohr'], // synonym 'pipe'
  'leather bag of coins': ['munzen', 'munzbeutel', 'geldbeutel'],
  // NOT 'sandwich': DE Sandwich = the EN 'lunch' synonym 'sandwich' —
  // avoidable collision, so the plain German words instead.
  lunch: ['essen', 'mittagessen', 'proviant'],
  'lurking grue': ['grue'], // untranslatable proper noun — kept as-is by policy
  machine: ['maschine'],
  'magic boat': ['boot', 'schlauchboot'], // the inflatable plastic boat
  matchbook: ['streichholzer', 'streichholzheftchen'],
  mirror: ['spiegel'],
  'mountain range': ['berge', 'gebirge'],
  'nasty knife': ['messer'],
  'number of ghosts': ['geister', 'gespenster'],
  painting: ['gemalde', 'bild'],
  'pair of candles': ['kerzen', 'kerze'],
  'pair of hands': ['hande', 'hand'],
  passage: ['pfad', 'weg'], // the forest trail
  pedestal: ['sockel', 'podest'],
  'pile of bodies': ['leichen', 'leichenhaufen'],
  'pile of leaves': ['blatter', 'laub', 'laubhaufen'],
  'pile of plastic': ['plastik', 'plastikhaufen'],
  'platinum bar': ['barren', 'platinbarren'],
  'pot of gold': ['goldtopf', 'topf voll gold', 'gold'],
  prayer: ['gebet', 'inschrift'], // the altar inscription
  'punctured boat': ['kaputtes boot', 'geplatztes boot', 'boot'],
  'quantity of water': ['wasser'],
  rainbow: ['regenbogen'],
  'red buoy': ['boje', 'rote boje'],
  'red button': ['roter knopf', 'knopf'],
  'red hot brass bell': ['gluhende glocke', 'heisse glocke', 'glocke'],
  river: ['fluss'],
  rope: ['seil'],
  'rusty knife': ['rostiges messer', 'messer'],
  sailor: ['seemann', 'matrose'],
  sand: ['sand'], // DE Sand = EN sand (same word, same object)
  // 'armband' instead of the loanword 'bracelet' — dodges fr's collision.
  'sapphire-encrusted bracelet': ['armband', 'armreif'],
  sceptre: ['zepter'],
  screwdriver: ['schraubenzieher', 'schraubendreher'],
  'set of teeth': ['zahne'],
  shovel: ['schaufel', 'spaten'],
  skeleton: ['skelett', 'knochen', 'gerippe'],
  // 'schlussel' is deliberately ambiguous (the DE cle-class trap): shared
  // with 'wrench' (Schraubenschlüssel) — Zork I's only other schlussel.
  'skeleton key': ['schlussel', 'dietrich'],
  'small mailbox': ['briefkasten'],
  'small piece of vitreous slag': ['schlacke', 'glasschlacke'],
  'small pile of coal': ['kohle', 'kohlehaufen'],
  songbird: ['vogel', 'singvogel'],
  stairs: ['treppe', 'stufen'],
  stiletto: ['stilett'],
  // NOT bare 'grab' (das Grab): already the graben-imperative collision in
  // the core — compounds only.
  'stone barrow': ['hugelgrab', 'grabhugel'],
  'stone door': ['steintur', 'tur'],
  'surrounding wall': ['mauer', 'mauern', 'wand'],
  switch: ['schalter'],
  sword: ['schwert'],
  table: ['tisch'], // the attic table
  'tan label': ['etikett'],
  thief: ['dieb', 'rauber'],
  torch: ['fackel'],
  'tour guidebook': ['reisefuhrer', 'fuhrer'],
  'trap door': ['falltur', 'klappe', 'luke'],
  tree: ['baum', 'ast'],
  troll: ['troll'],
  'trophy case': ['vitrine', 'trophaenvitrine', 'schaukasten', 'truhe'],
  // 'truhe' is deliberately ambiguous with 'trophy case' (the seed's UAT trap).
  'trunk of jewels': ['truhe', 'schatztruhe', 'juwelen'],
  tube: ['tube', 'zahnpasta'], // DE Tube = EN tube; same word, same object
  // NOT 'paste': EN 'paste' is a synonym of 'tube' (a DIFFERENT canonical) —
  // cross-canonical hijack risk, fr's 'grave' precedent.
  'viscous material': ['schmiere', 'glibber', 'kleister'],
  'wall with engravings': ['gravuren', 'inschrift', 'wand mit gravuren'],
  water: ['wasser'],
  'white cliffs': ['klippen', 'weisse klippen'],
  'white house': ['haus', 'weisses haus'],
  'wooden door': ['holztur', 'tur'],
  'wooden ladder': ['leiter', 'holzleiter'],
  'wooden railing': ['gelander', 'brustung'],
  wrench: ['schlussel', 'schraubenschlussel'],
  'yellow button': ['gelber knopf', 'knopf'],
  "zork owner's manual": ['handbuch', 'anleitung', 'bedienungsanleitung'],
  zorkmid: ['zorkmid'], // untranslatable currency proper noun
}
