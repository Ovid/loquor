// src/llm/lexicon/fr.zork1.ts
// French → Zork I noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork1.vocab.ts); VALUES are folded French words/phrases.
// Validated by lexicon/validate.test.ts (key validity, fold idempotence,
// collision gate, FULL coverage). Entries follow the vocab's canonical order.
// Where French genuinely merges objects (cle, couteau, bouton, porte…)
// the same word appears under several canonicals — ambiguity is first-class.
import type { NounLexicon } from './types'

export const FR_ZORK1: NounLexicon = {
  altar: ['autel'],
  'ancient map': ['carte', 'parchemin', 'carte ancienne'],
  basket: ['panier', 'monte charge'],
  bat: ['chauve souris'],
  'beautiful brass bauble': ['babiole', 'bibelot'],
  'beautiful jeweled scarab': ['scarabee'],
  "bird's nest": ['nid', 'nid d oiseau'],
  'black book': ['livre', 'livre noir'],
  'blast of air': ['air', 'souffle', 'poumons'],
  blessings: ['benedictions'],
  'bloody axe': ['hache', 'hache ensanglantee'],
  'blue button': ['bouton bleu', 'bouton'],
  board: ['planche', 'planches'],
  'boarded window': ['fenetre condamnee', 'fenetre barricadee', 'fenetre'],
  bolt: ['boulon', 'ecrou'],
  'brass bell': ['cloche'], // F-DD (écho/bell context); canonical is 'brass bell'
  'brass lantern': ['lampe', 'lanterne', 'lampe de poche'], // UAT trap (uat-1/uat-2)
  'broken clockwork canary': ['canari casse', 'canari'],
  'broken jewel-encrusted egg': ['oeuf casse', 'oeuf'],
  'broken lantern': ['lampe cassee', 'lanterne cassee'],
  'broken timber': ['poutre', 'poutres', 'madrier'],
  'brown button': ['bouton marron', 'bouton brun', 'bouton'],
  'brown sack': ['sac'], // canonical is 'brown sack', not 'sack'
  'burned-out lantern': ['lampe morte', 'lampe grillee', 'vieille lampe'],
  carpet: ['tapis'], // vocab canonical is 'carpet' (synonym rug), not 'rug'
  chalice: ['calice', 'coupe'],
  chimney: ['cheminee'],
  chute: ['glissiere', 'toboggan'],
  cliff: ['falaise', 'corniche', 'rebord'],
  'clove of garlic': ['ail', 'gousse d ail'],
  'control panel': ['panneau de controle', 'panneau'],
  crack: ['fissure', 'fente'],
  'crystal skull': ['crane', 'crane de cristal'],
  'crystal trident': ['trident'], // FR trident = EN trident (reviewed collision)
  cyclops: ['cyclope'],
  dam: ['barrage'],
  door: ['porte', 'porte d entree'], // the boarded front door
  forest: ['foret', 'bois'],
  'glass bottle': ['bouteille'],
  'gold coffin': ['cercueil'], // F-Q; canonical is 'gold coffin'
  'golden clockwork canary': ['canari', 'canari dore', 'canari mecanique'],
  'granite wall': ['mur de granit', 'mur'],
  grating: ['grille'],
  'green bubble': ['bulle', 'bulle verte'],
  ground: ['sol', 'terre'],
  'group of tool chests': ['caisses a outils', 'coffres a outils', 'caisses'],
  'hand-held air pump': ['pompe', 'pompe a air'],
  'huge diamond': ['diamant'],
  'jade figurine': ['figurine', 'statuette', 'figurine de jade'],
  'jewel-encrusted egg': ['oeuf'],
  'kitchen table': ['table', 'table de cuisine'],
  'kitchen window': ['fenetre', 'fenetre de la cuisine'],
  'large bag': ['grand sac', 'sac'], // the thief's bag
  'large emerald': ['emeraude'],
  leaflet: ['depliant', 'brochure', 'prospectus'],
  leak: ['fuite', 'tuyau'],
  'leather bag of coins': ['pieces', 'sac de pieces', 'bourse'],
  lunch: ['dejeuner', 'nourriture', 'sandwich', 'repas'],
  'lurking grue': ['grue'], // untranslatable proper noun — kept as-is by policy
  machine: ['machine'],
  'magic boat': ['bateau', 'radeau', 'canot'],
  matchbook: ['allumettes', 'pochette d allumettes'],
  mirror: ['miroir', 'reflet'],
  'mountain range': ['montagnes', 'montagne'],
  'nasty knife': ['couteau'], // canonical is 'nasty knife', not 'knife'
  'number of ghosts': ['fantomes', 'esprits', 'spectres'],
  painting: ['tableau', 'peinture', 'toile'],
  'pair of candles': ['bougies', 'chandelles', 'bougie'],
  'pair of hands': ['mains', 'main'],
  passage: ['sentier', 'chemin', 'passage'], // the forest trail
  pedestal: ['piedestal', 'socle'],
  'pile of bodies': ['cadavres', 'corps'],
  'pile of leaves': ['feuilles', 'tas de feuilles'],
  'pile of plastic': ['plastique', 'tas de plastique'],
  'platinum bar': ['barre de platine', 'lingot', 'barre'],
  'pot of gold': ['pot d or', 'or'], // F: intra-compound 'or' binding
  prayer: ['priere', 'inscription'], // the altar inscription
  'punctured boat': ['bateau creve', 'bateau perce', 'bateau'],
  'quantity of water': ['eau'],
  rainbow: ['arc en ciel'],
  'red buoy': ['bouee', 'bouee rouge'],
  'red button': ['bouton rouge', 'bouton'],
  'red hot brass bell': ['cloche brulante', 'cloche chauffee', 'cloche'],
  river: ['riviere', 'fleuve'],
  rope: ['corde'],
  'rusty knife': ['couteau rouille', 'couteau'],
  sailor: ['marin', 'matelot'],
  sand: ['sable'],
  'sapphire-encrusted bracelet': ['bracelet'], // FR bracelet = EN bracelet
  sceptre: ['sceptre'],
  screwdriver: ['tournevis'],
  'set of teeth': ['dents'],
  shovel: ['pelle'],
  skeleton: ['squelette', 'ossements', 'os'],
  'skeleton key': ['cle', 'cle squelette', 'passe partout'],
  'small mailbox': ['boite aux lettres', 'boite'],
  'small piece of vitreous slag': ['scorie', 'scories', 'machefer'],
  'small pile of coal': ['charbon', 'tas de charbon'],
  songbird: ['oiseau', 'oiseau chanteur'],
  stairs: ['escalier', 'escaliers', 'marches'],
  stiletto: ['stylet'],
  'stone barrow': ['tumulus', 'tombeau'],
  'stone door': ['porte de pierre', 'porte en pierre', 'porte'],
  'surrounding wall': ['mur', 'murs', 'enceinte'],
  switch: ['interrupteur', 'commutateur'],
  sword: ['epee'],
  table: ['table'], // the attic table; FR table = EN table
  'tan label': ['etiquette'],
  thief: ['voleur'],
  torch: ['torche'],
  'tour guidebook': ['guide', 'guide touristique', 'livret'],
  'trap door': ['trappe', 'porte de cave'],
  tree: ['arbre', 'branche'],
  troll: ['troll'],
  'trophy case': ['vitrine', 'vitrine a trophees'], // F-F trap
  'trunk of jewels': ['malle', 'coffre', 'bijoux'],
  tube: ['tube', 'dentifrice'], // the toothpaste-style tube of gunk
  'viscous material': ['glu', 'pate', 'matiere visqueuse'],
  'wall with engravings': ['gravures', 'inscription', 'mur grave'],
  water: ['eau'],
  'white cliffs': ['falaises', 'falaises blanches'],
  'white house': ['maison', 'maison blanche'],
  'wooden door': ['porte en bois', 'porte'],
  'wooden ladder': ['echelle'],
  'wooden railing': ['rambarde', 'balustrade'],
  wrench: ['cle', 'cle a molette', 'cle anglaise'],
  'yellow button': ['bouton jaune', 'bouton'],
  "zork owner's manual": ['manuel', 'mode d emploi'],
  zorkmid: ['zorkmid'], // untranslatable currency proper noun
}
