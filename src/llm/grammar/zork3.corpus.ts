// src/llm/grammar/zork3.corpus.ts
import type { CorpusEntry } from './index'

export const ZORK3_CORPUS: CorpusEntry[] = [
  { english: 'take the staff', expect: 'take staff' },
  { english: 'wear nothing, examine the amulet', expect: 'examine amulet' },
  { english: 'go down', expect: 'down' },
  { english: 'kill the man', expect: 'kill man' },
  // two-object
  { english: 'unlock the chest with the key', expect: 'unlock chest with key' },
  { english: 'give the ring to the man', expect: 'give ring to man' },
  // should-abstain
  { english: 'what is the meaning of this', expect: '__UNKNOWN__' },
  { english: 'dance around', expect: '__UNKNOWN__' },
]
