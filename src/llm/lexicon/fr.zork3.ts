// src/llm/lexicon/fr.zork3.ts
// French → Zork III noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork3.vocab.ts); VALUES are folded French words/phrases.
// Validated by lexicon/validate.test.ts; coverage gated by Task 10.
// SEED: the most common nouns. Full coverage is Task 10.
import type { NounLexicon } from './types'

export const FR_ZORK3: NounLexicon = {
  lamp: ['lampe', 'lanterne'],
  sword: ['epee'],
  ladder: ['echelle'],
  'old man': ['vieil homme', 'vieillard'],
  'dungeon master': ['maitre du donjon'],
  mirror: ['miroir'],
  'bronze door': ['porte de bronze'],
  'wooden door': ['porte', 'porte en bois'],
  'long pole': ['perche', 'longue perche'],
  'short pole': ['perche courte'],
  sundial: ['cadran solaire', 'cadran'],
  'very ancient book': ['livre', 'livre ancien'],
  'warning note': ['avertissement'],
  chasm: ['gouffre', 'abime'],
  runes: ['runes'],
  'compass rose': ['rose des vents'],
}
