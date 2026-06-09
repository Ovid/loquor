// src/llm/lexicon/de.zork2.ts
// German → Zork II noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork2.vocab.ts); VALUES are folded German words/phrases.
// Validated by lexicon/validate.test.ts; coverage gated by Task 11.
// SEED: the most common nouns. Full coverage is Task 11.
import type { NounLexicon } from './types'

export const DE_ZORK2: NounLexicon = {
  lamp: ['lampe', 'laterne'],
  'elvish sword': ['schwert', 'elfenschwert'],
  // 'schlussel' is deliberately ambiguous (the DE cle-class trap): both keys.
  'delicate gold key': ['schlussel', 'goldschlussel', 'goldener schlussel'],
  'rusty iron key': ['schlussel', 'rostiger schlussel', 'eisenschlussel'],
  'wizard of frobozz': ['zauberer', 'magier'],
  'huge red dragon': ['drache', 'roter drache'],
  'beautiful princess': ['prinzessin'],
  unicorn: ['einhorn'],
  'china teapot': ['teekanne'],
  'wooden bucket': ['eimer'],
  'wooden club': ['keule', 'knuppel'],
  ruby: ['rubin'],
  'pearl necklace': ['halskette', 'perlenkette'],
  'gaudy crown': ['krone'],
  newspaper: ['zeitung'],
  matchbook: ['streichholzer', 'streichholzheftchen'],
  demon: ['damon'], // Dämon, folded
  glacier: ['gletscher'],
}
