// src/llm/lexicon/de.zork3.ts
// German → Zork III noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork3.vocab.ts); VALUES are folded German words/phrases.
// Validated by lexicon/validate.test.ts; coverage gated by Task 11.
// SEED: the most common nouns. Full coverage is Task 11.
import type { NounLexicon } from './types'

export const DE_ZORK3: NounLexicon = {
  lamp: ['lampe', 'laterne'],
  sword: ['schwert'],
  ladder: ['leiter'],
  'old man': ['alter mann', 'greis'],
  'dungeon master': ['kerkermeister'],
  mirror: ['spiegel'],
  'bronze door': ['bronzetur'],
  'wooden door': ['tur', 'holztur'],
  'long pole': ['stange', 'lange stange'],
  'short pole': ['kurze stange'],
  sundial: ['sonnenuhr'],
  'very ancient book': ['buch', 'altes buch'],
  'warning note': ['warnung', 'notiz'],
  chasm: ['abgrund', 'kluft'],
  runes: ['runen'],
  'compass rose': ['kompassrose', 'windrose'],
}
