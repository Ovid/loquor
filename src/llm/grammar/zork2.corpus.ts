// src/llm/grammar/zork2.corpus.ts
import type { CorpusEntry } from './index'

export const ZORK2_CORPUS: CorpusEntry[] = [
  { english: 'take the wand', expect: 'take wand' },
  { english: 'read the book', expect: 'read book' },
  { english: 'press the button', expect: 'press button' },
  { english: 'go south', expect: 'south' },
  { english: 'examine the dragon', expect: 'examine dragon' },
  // two-object
  { english: 'unlock the door with the key', expect: 'unlock door with key' },
  { english: 'give the cake to the robot', expect: 'give cake to robot' },
  // should-abstain
  { english: 'I wonder what happens next', expect: '__UNKNOWN__' },
  { english: 'sing a song', expect: '__UNKNOWN__' },
]
