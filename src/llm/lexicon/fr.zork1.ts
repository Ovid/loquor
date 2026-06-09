// src/llm/lexicon/fr.zork1.ts
// French → Zork I noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork1.vocab.ts); VALUES are folded French words/phrases.
// Validated by lexicon/validate.test.ts; coverage gated by Task 10.
// SEED: UAT traps + the most common nouns. Full coverage is Task 10.
import type { NounLexicon } from './types'

export const FR_ZORK1: NounLexicon = {
  // UAT-discovered traps first (uat-1/uat-2): cle, lampe, pose-target, trappe…
  'brass lantern': ['lampe', 'lanterne', 'lampe de poche'],
  'trap door': ['trappe', 'porte de cave'],
  'small mailbox': ['boite aux lettres', 'boite'],
  wrench: ['cle', 'cle a molette', 'cle anglaise'],
  'skeleton key': ['cle', 'cle squelette', 'passe partout'],
  leaflet: ['depliant', 'brochure', 'prospectus'],
  sword: ['epee'],
  carpet: ['tapis'], // vocab canonical is 'carpet' (synonym rug), not 'rug'
  'kitchen window': ['fenetre', 'fenetre de la cuisine'],
  'brown sack': ['sac'], // canonical is 'brown sack', not 'sack'
  'glass bottle': ['bouteille'],
  'jewel-encrusted egg': ['oeuf'],
  rope: ['corde'],
  'nasty knife': ['couteau'], // canonical is 'nasty knife', not 'knife'
  torch: ['torche'],
  'gold coffin': ['cercueil'], // F-Q; canonical is 'gold coffin'
  sceptre: ['sceptre'],
  'pot of gold': ['pot d or', 'or'], // F: intra-compound 'or' binding
  'trophy case': ['vitrine', 'vitrine a trophees'], // F-F trap
  troll: ['troll'],
  thief: ['voleur'],
  cyclops: ['cyclope'],
  'pile of leaves': ['feuilles', 'tas de feuilles'],
  'hand-held air pump': ['pompe', 'pompe a air'],
  'brass bell': ['cloche'], // F-DD (écho/bell context); canonical is 'brass bell'
}
