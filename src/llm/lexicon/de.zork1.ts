// src/llm/lexicon/de.zork1.ts
// German → Zork I noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork1.vocab.ts); VALUES are folded German words/phrases
// (Schlüssel → schlussel, Falltür → falltur).
// Validated by lexicon/validate.test.ts; coverage gated by Task 11.
// SEED: UAT traps + the most common nouns. Full coverage is Task 11.
import type { NounLexicon } from './types'

export const DE_ZORK1: NounLexicon = {
  'brass lantern': ['lampe', 'laterne'],
  'trap door': ['falltur', 'klappe'],
  'small mailbox': ['briefkasten'],
  // 'schlussel' is deliberately ambiguous (the DE cle-class trap): both keys.
  wrench: ['schlussel', 'schraubenschlussel'],
  'skeleton key': ['schlussel', 'dietrich'],
  leaflet: ['prospekt', 'flugblatt'],
  sword: ['schwert'],
  carpet: ['teppich'],
  'kitchen window': ['fenster', 'kuchenfenster'],
  'brown sack': ['sack', 'beutel'],
  'glass bottle': ['flasche'],
  'jewel-encrusted egg': ['ei'],
  rope: ['seil'],
  'nasty knife': ['messer'],
  torch: ['fackel'],
  'gold coffin': ['sarg'],
  sceptre: ['zepter'],
  'pot of gold': ['goldtopf', 'topf voll gold', 'gold'],
  'trophy case': ['truhe', 'vitrine', 'trophaenvitrine'],
  troll: ['troll'],
  thief: ['dieb', 'rauber'],
  cyclops: ['zyklop'],
  'pile of leaves': ['blatter', 'laub', 'laubhaufen'],
  'hand-held air pump': ['pumpe', 'luftpumpe'],
  'brass bell': ['glocke'],
}
