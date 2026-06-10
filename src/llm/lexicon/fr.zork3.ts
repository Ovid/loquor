// src/llm/lexicon/fr.zork3.ts
// French → Zork III noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork3.vocab.ts); VALUES are folded French words/phrases.
// Validated by lexicon/validate.test.ts (key validity, fold idempotence,
// collision gate, FULL coverage). Entries follow the vocab's canonical order.
// Where French genuinely merges objects (porte, panneau, mur, barre…)
// the same word appears under several canonicals — ambiguity is first-class.
import type { NounLexicon } from './types'

export const FR_ZORK3: NounLexicon = {
  'black panel': ['panneau noir', 'panneau'],
  'blast of air': ['air', 'souffle', 'poumons'],
  blessings: ['benedictions'],
  'broken lantern': ['lampe cassee', 'lanterne cassee'],
  'bronze door': ['porte de bronze'],
  'cell door': ['porte de la cellule', 'porte'],
  chasm: ['gouffre', 'abime'],
  'compass arrow': ['aiguille', 'fleche', 'aiguille de la boussole'],
  'compass rose': ['rose des vents'],
  'dungeon master': ['maitre du donjon'],
  'dust and debris': ['poussiere', 'debris', 'gravats'],
  'eastern wall': ['mur est', 'mur'],
  'flaming pit': ['fosse enflammee', 'brasier', 'fosse'],
  ground: ['sol', 'terre'],
  'guardians of zork': ['gardiens', 'statues', 'statue'],
  hole: ['trou'],
  ladder: ['echelle'],
  lamp: ['lampe', 'lanterne'],
  'large button': ['gros bouton', 'grand bouton', 'bouton'],
  'long pole': ['perche', 'longue perche'],
  'lurking grue': ['grue'], // untranslatable proper noun — kept as-is by policy
  'mahogany panel': ['panneau en acajou', 'panneau acajou', 'panneau'],
  mirror: ['miroir'],
  'northern wall': ['mur nord', 'mur'],
  'old man': ['vieil homme', 'vieillard'],
  'pair of hands': ['mains', 'main'],
  panel: ['panneau'],
  parapet: ['parapet'],
  passage: ['sentier', 'chemin'], // the forest trail (cf. 'tunnel')
  'pine panel': ['panneau de pin', 'panneau en pin', 'panneau'],
  'quantity of water': ['eau'],
  'red beam of light': ['rayon', 'faisceau', 'rayon rouge'],
  'red button': ['bouton rouge', 'bouton'],
  'red panel': ['panneau rouge', 'panneau'],
  rubble: ['rocher', 'gravats', 'eboulis', 'pierre'],
  runes: ['runes'],
  sailor: ['marin', 'matelot'],
  'secret door': ['porte secrete', 'porte'],
  'short pole': ['perche courte'],
  'small slot': ['fente', 'petite fente'],
  'southern wall': ['mur sud', 'mur'],
  stairs: ['escalier', 'escaliers', 'marches'],
  'steel door': ['porte en acier', 'porte'],
  'stone channel': ['rigole', 'canal', 'rigole de pierre'],
  sundial: ['cadran solaire', 'cadran'],
  sword: ['epee'],
  't-bar': ['barre en t', 'barre'],
  tunnel: ['tunnel', 'passage', 'galerie'], // the dark smoky passage
  'very ancient book': ['livre', 'livre ancien'],
  'warning note': ['avertissement', 'mot', 'message'],
  water: ['eau'],
  'western wall': ['mur ouest', 'mur'],
  'white panel': ['panneau blanc', 'panneau'],
  'wooden bar': ['barre en bois', 'barre de bois', 'barre'],
  'wooden door': ['porte', 'porte en bois'],
  'wooden wall': ['mur en bois', 'mur de bois', 'mur'],
  'yellow panel': ['panneau jaune', 'panneau'],
  zorkmid: ['zorkmid'], // untranslatable currency proper noun
}
