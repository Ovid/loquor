// src/llm/grammar/zork2.corpus.ts
import type { CorpusEntry } from './index'

// Expected commands use the ZIL-derived canonical noun names (the longest
// OBJECT desc from the .zil): e.g. "wand" → "wizard's magic wand", and the
// generic "book"/"button"/"dragon"/"cake" resolve to a concrete instance.
export const ZORK2_CORPUS: CorpusEntry[] = [
  { english: 'take the wand', expect: "take wizard's magic wand" },
  { english: 'read the book', expect: 'read blue book' },
  // ZIL: Zork II has no PRESS verb; the canonical action is PUSH.
  { english: 'push the button', expect: 'push round button' },
  { english: 'go south', expect: 'south' },
  { english: 'examine the dragon', expect: 'examine huge red dragon' },
  // two-object
  {
    english: 'unlock the door with the key',
    expect: 'unlock stone door with rusty iron key',
  },
  {
    english: 'give the cake to the robot',
    expect: 'give cake frosted with red letters to robot',
  },
  // should-abstain
  { english: 'I wonder what happens next', expect: '__UNKNOWN__' },
  { english: 'sing a song', expect: '__UNKNOWN__' },
]
