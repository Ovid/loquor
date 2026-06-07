// src/llm/grammar/zork1.corpus.ts
import type { CorpusEntry } from './index'

export const ZORK1_CORPUS: CorpusEntry[] = [
  { english: 'grab the brass lantern', expect: 'take lantern' },
  { english: 'pick up the sword', expect: 'take sword' },
  { english: 'open the mailbox', expect: 'open mailbox' },
  { english: 'read the leaflet', expect: 'read leaflet' },
  { english: 'go north', expect: 'north' },
  { english: 'head up', expect: 'up' },
  { english: 'look around', expect: 'look' },
  { english: 'what am I carrying?', expect: 'inventory' },
  { english: 'examine the egg', expect: 'examine egg' },
  { english: 'switch on the lamp', expect: 'turn on lantern' },
  { english: 'drop the knife', expect: 'drop knife' },
  { english: 'attack the troll', expect: 'kill troll' },
  // should-abstain — not a game action
  { english: 'what should I do?', expect: '__UNKNOWN__' },
  { english: 'this game is hard', expect: '__UNKNOWN__' },
  { english: 'hello there', expect: '__UNKNOWN__' },
  // near-miss — noun not in grammar; must abstain, not mis-map
  { english: 'pet the cat', expect: '__UNKNOWN__' },
]
