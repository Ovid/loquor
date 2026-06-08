// src/llm/grammar/zork3.corpus.ts
import type { CorpusEntry } from './index'

// Expected commands use real ZIL-derived Zork III nouns. The previous fixtures
// named objects ("staff", "amulet", "chest", "key", "ring") that do not exist
// in Zork III's vocab; they are replaced with genuine canonicals (sword, very
// ancient book, old man, wooden door).
export const ZORK3_CORPUS: CorpusEntry[] = [
  { english: 'take the sword', expect: 'take sword' },
  { english: 'examine the ancient book', expect: 'examine very ancient book' },
  { english: 'go down', expect: 'down' },
  // ZIL: one-object KILL is gated to Zork II; in Zork III "kill" is two-object
  // only (kill … with …), so attacking the man must name a weapon.
  {
    english: 'kill the old man with the sword',
    expect: 'kill old man with sword',
  },
  // two-object
  {
    english: 'unlock the wooden door with the sword',
    expect: 'unlock wooden door with sword',
  },
  { english: 'give the sword to the man', expect: 'give sword to old man' },
  // should-abstain
  { english: 'what is the meaning of this', expect: '__UNKNOWN__' },
  { english: 'dance around', expect: '__UNKNOWN__' },
]
