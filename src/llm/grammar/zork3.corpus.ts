// src/llm/grammar/zork3.corpus.ts
import type { CorpusEntry } from './index'

export const ZORK3_CORPUS: CorpusEntry[] = [
  { english: 'take the staff', expect: 'take staff' },
  { english: 'wear the hood', expect: '__UNKNOWN__' },
  { english: 'give the amulet', expect: 'give amulet' },
  { english: 'open the chest', expect: 'open chest' },
  { english: 'go south', expect: 'south' },
  { english: 'inventory', expect: 'inventory' },
  { english: 'examine the ring', expect: 'examine ring' },
  { english: 'sing a song', expect: '__UNKNOWN__' },
  { english: 'talk to the man', expect: '__UNKNOWN__' },
]
