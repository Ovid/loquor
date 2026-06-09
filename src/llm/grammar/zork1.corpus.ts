// src/llm/grammar/zork1.corpus.ts
import type { CorpusEntry } from './index'

// Expected commands use the ZIL-derived canonical noun names (the longest
// OBJECT desc from the .zil), not the short hand-curated synonyms — e.g. the
// lantern's canonical is "brass lantern" ("lantern" is only a synonym).
export const ZORK1_CORPUS: CorpusEntry[] = [
  { english: 'grab the brass lantern', expect: 'take brass lantern' },
  { english: 'pick up the sword', expect: 'take sword' },
  { english: 'open the mailbox', expect: 'open small mailbox' },
  { english: 'read the leaflet', expect: 'read leaflet' },
  { english: 'go north', expect: 'north' },
  { english: 'head up', expect: 'up' },
  { english: 'look around', expect: 'look' },
  { english: 'what am I carrying?', expect: 'inventory' },
  { english: 'examine the egg', expect: 'examine jewel-encrusted egg' },
  { english: 'switch on the lamp', expect: 'turn on brass lantern' },
  { english: 'drop the knife', expect: 'drop nasty knife' },
  // ZIL: one-object KILL is gated to Zork II; in Zork I "kill" is two-object
  // only (kill … with …), so attacking the troll must name a weapon.
  {
    english: 'attack the troll with the sword',
    expect: 'kill troll with sword',
  },
  // two-object — the commands that actually solve the game
  {
    english: 'unlock the grating with the key',
    expect: 'unlock grating with skeleton key',
  },
  {
    english: 'put the coffin in the case',
    expect: 'put gold coffin in trophy case',
  },
  {
    english: 'give the garlic to the troll',
    expect: 'give clove of garlic to troll',
  },
  // pronoun — antecedent = leaflet (revealed by "open mailbox"); model resolves it
  { english: 'take it', expect: 'take leaflet' },
  // should-abstain — not a game action
  { english: 'what should I do?', expect: '__UNKNOWN__' },
  { english: 'this game is hard', expect: '__UNKNOWN__' },
  { english: 'hello there', expect: '__UNKNOWN__' },
  // near-miss — noun not in grammar; must abstain, not mis-map
  { english: 'pet the cat', expect: '__UNKNOWN__' },
  // ambiguous pronoun with no clear antecedent → abstain (model emits __UNKNOWN__)
  { english: 'use it on the other one', expect: '__UNKNOWN__' },
]
