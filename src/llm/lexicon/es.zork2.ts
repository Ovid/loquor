// src/llm/lexicon/es.zork2.ts
// Spanish → Zork II noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork2.vocab.ts); VALUES are folded Spanish words/phrases.
// Validated by lexicon/validate.test.ts; coverage gated by Task 12.
// SEED: the most common nouns. Full coverage is Task 12.
import type { NounLexicon } from './types'

export const ES_ZORK2: NounLexicon = {
  lamp: ['lampara', 'linterna'],
  'elvish sword': ['espada', 'espada elfica'],
  // 'llave' is deliberately ambiguous (the ES cle-class trap): both keys.
  'delicate gold key': ['llave', 'llave de oro', 'llave dorada'],
  'rusty iron key': ['llave', 'llave oxidada', 'llave de hierro'],
  'wizard of frobozz': ['mago', 'hechicero'],
  'huge red dragon': ['dragon', 'dragon rojo'], // dragón, folded
  'beautiful princess': ['princesa'],
  unicorn: ['unicornio'],
  'china teapot': ['tetera'],
  'wooden bucket': ['cubo', 'balde'],
  'wooden club': ['garrote', 'porra'],
  ruby: ['rubi'],
  'pearl necklace': ['collar', 'collar de perlas'],
  'gaudy crown': ['corona'],
  newspaper: ['periodico', 'diario'],
  matchbook: ['cerillas', 'fosforos'],
  demon: ['demonio'],
  glacier: ['glaciar'],
}
