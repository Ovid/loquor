// src/llm/lexicon/es.zork3.ts
// Spanish → Zork III noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork3.vocab.ts); VALUES are folded Spanish words/phrases.
// Validated by lexicon/validate.test.ts; coverage gated by Task 12.
// SEED: the most common nouns. Full coverage is Task 12.
import type { NounLexicon } from './types'

export const ES_ZORK3: NounLexicon = {
  lamp: ['lampara', 'linterna'],
  sword: ['espada'],
  ladder: ['escalera'],
  'old man': ['viejo', 'anciano'],
  'dungeon master': ['amo del calabozo', 'maestro del calabozo'],
  mirror: ['espejo'],
  'bronze door': ['puerta de bronce'],
  'wooden door': ['puerta', 'puerta de madera'],
  'long pole': ['pertiga', 'palo largo'],
  'short pole': ['pertiga corta', 'palo corto'],
  sundial: ['reloj de sol'],
  'very ancient book': ['libro', 'libro antiguo'],
  'warning note': ['nota', 'aviso'],
  chasm: ['abismo', 'sima'],
  runes: ['runas'],
  'compass rose': ['rosa de los vientos'],
}
