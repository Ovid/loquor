// src/llm/grammar/types.ts
export interface NounEntry {
  canonical: string // stable lexicon key, e.g. "hand-held air pump" (ZIL DESC)
  emit: string // shortest parser-accepted name, e.g. "pump" — what we SEND
  synonyms?: string[] // game-dictionary surface forms that map to canonical
  adjectives?: string[] // optional, for future disambiguation + phrase mentions
}

export interface Vocab {
  verbsOnly: string[] // look, inventory, wait …
  movement: string[] // north, up, enter …
  verbs1: string[] // single-object transitives: take, open, read …
  verbs2: string[] // two-object verbs: unlock, put, give …
  preps: string[] // with, in, to, on …
  verbSynonyms: string[] // gsyntax <SYNONYM VERB …> members (ulysses, fight, i, q …)
  nouns: NounEntry[]
  // Room-level (PSEUDO "WORD" FUNC) scenery: words the Z-parser recognizes
  // (examine chain/dome/stream) with no backing <OBJECT>. They feed the grammar
  // + passthrough gate (so the model can name them and English raw-sends them)
  // but NOT the scene tracker — stateless room flavor, never an "it" antecedent
  // (BUG G). Optional: a vocab without scenery behaves exactly as before.
  scenery?: string[]
  takeAck: RegExp // recognises a successful take in output text
  dropAck: RegExp // recognises a successful drop
  absencePat: RegExp // captures a negated/absent noun so it never enters scope
  failurePat?: RegExp // matches a no-op/refusal so a failed action can't set "it"
}
