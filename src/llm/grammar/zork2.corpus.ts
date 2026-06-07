// src/llm/grammar/zork2.corpus.ts
import type { CorpusEntry } from './index'

export const ZORK2_CORPUS: CorpusEntry[] = [
  { english: 'pick up the wand', expect: 'take wand' },
  { english: 'wave goodbye', expect: '__UNKNOWN__' },
  { english: 'press the button', expect: 'push button' },
  { english: 'open the door', expect: 'open door' },
  { english: 'go down', expect: 'down' },
  { english: 'look', expect: 'look' },
  { english: 'read the book', expect: 'read book' },
  { english: 'attack the dragon', expect: 'kill dragon' },
  { english: 'what is happening?', expect: '__UNKNOWN__' },
  { english: 'feed the parrot', expect: '__UNKNOWN__' },
]
