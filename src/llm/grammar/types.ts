// src/llm/grammar/types.ts
export interface NounEntry {
  canonical: string // grammar-canonical noun, e.g. "mailbox"
  synonyms?: string[] // game-dictionary surface forms that map to canonical
  adjectives?: string[] // optional, for future disambiguation + phrase mentions
}

export interface Vocab {
  verbsOnly: string[] // look, inventory, wait …
  movement: string[] // north, up, enter …
  verbs1: string[] // single-object transitives: take, open, read …
  verbs2: string[] // two-object verbs: unlock, put, give …
  preps: string[] // with, in, to, on …
  nouns: NounEntry[]
  takeAck: RegExp // recognises a successful take in output text
  dropAck: RegExp // recognises a successful drop
  absencePat: RegExp // captures a negated/absent noun so it never enters scope
  failurePat?: RegExp // matches a no-op/refusal so a failed action can't set "it"
}
