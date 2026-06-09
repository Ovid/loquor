// src/llm/lexicon/es.zork1.ts
// Spanish → Zork I noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork1.vocab.ts); VALUES are folded Spanish words/phrases
// (lámpara → lampara, buzón → buzon).
// Validated by lexicon/validate.test.ts; coverage gated by Task 12.
// SEED: UAT traps + the most common nouns. Full coverage is Task 12.
import type { NounLexicon } from './types'

export const ES_ZORK1: NounLexicon = {
  'brass lantern': ['lampara', 'linterna'],
  'trap door': ['trampilla'],
  'small mailbox': ['buzon'],
  // 'llave' is deliberately ambiguous (the ES cle-class trap): both keys.
  wrench: ['llave', 'llave inglesa'],
  'skeleton key': ['llave', 'llave maestra', 'ganzua'],
  leaflet: ['folleto'],
  sword: ['espada'],
  carpet: ['alfombra'],
  'kitchen window': ['ventana', 'ventana de la cocina'],
  'brown sack': ['saco', 'bolsa'],
  'glass bottle': ['botella'],
  'jewel-encrusted egg': ['huevo'],
  rope: ['cuerda'],
  'nasty knife': ['cuchillo'],
  torch: ['antorcha'],
  'gold coffin': ['ataud'],
  sceptre: ['cetro'],
  'pot of gold': ['olla de oro', 'oro'],
  'trophy case': ['vitrina'],
  troll: ['trol'],
  thief: ['ladron'],
  cyclops: ['ciclope'],
  'pile of leaves': ['hojas', 'monton de hojas'],
  'hand-held air pump': ['bomba', 'inflador', 'bomba de aire'],
  'brass bell': ['campana'],
}
