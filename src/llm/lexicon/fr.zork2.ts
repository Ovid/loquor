// src/llm/lexicon/fr.zork2.ts
// French → Zork II noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork2.vocab.ts); VALUES are folded French words/phrases.
// Validated by lexicon/validate.test.ts; coverage gated by Task 10.
// SEED: the most common nouns. Full coverage is Task 10.
import type { NounLexicon } from './types'

export const FR_ZORK2: NounLexicon = {
  lamp: ['lampe', 'lanterne'],
  'elvish sword': ['epee', 'epee elfique'],
  // 'cle' is deliberately ambiguous (the FR cle-class trap): both keys.
  'delicate gold key': ['cle', 'cle en or', 'cle doree'],
  'rusty iron key': ['cle', 'cle rouillee', 'cle en fer'],
  'wizard of frobozz': ['magicien', 'sorcier'],
  'huge red dragon': ['dragon', 'dragon rouge'],
  'beautiful princess': ['princesse'],
  unicorn: ['licorne'],
  'china teapot': ['theiere'],
  'wooden bucket': ['seau'],
  'wooden club': ['massue', 'gourdin'],
  ruby: ['rubis'],
  'pearl necklace': ['collier', 'collier de perles'],
  'gaudy crown': ['couronne'],
  newspaper: ['journal'],
  matchbook: ['allumettes', 'pochette d allumettes'],
  demon: ['demon'],
  glacier: ['glacier'],
}
