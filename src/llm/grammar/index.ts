// src/llm/grammar/index.ts
import type { Vocab } from './types'
import { ZORK1_VOCAB } from './zork1.vocab'
import { ZORK2_VOCAB } from './zork2.vocab'
import { ZORK3_VOCAB } from './zork3.vocab'

export interface CorpusEntry {
  english: string
  /** canonical command, or '__UNKNOWN__' for should-abstain */
  expect: string
}

// Per-game story signatures (first 0x1E bytes, hex) from the first NL pass.
const ZORK1_SIG = '030000774b5450d5389903e602b02c12004038383034323901f0a99bbf44'
const ZORK2_SIG = '0300003f4d6c4de53a8e02a823132df7000038363038313101e8b4b64492'
const ZORK3_SIG = '030000194dfa6cf73d8b02ae1fd23104000038363038313101eeabd8f645'

const BY_SIGNATURE: Record<string, Vocab> = {
  [ZORK1_SIG]: ZORK1_VOCAB,
  [ZORK2_SIG]: ZORK2_VOCAB,
  [ZORK3_SIG]: ZORK3_VOCAB,
}

/** Map a per-game story signature to its vocab, or null if unknown. */
export function vocabForSignature(sig: string): Vocab | null {
  return BY_SIGNATURE[sig] ?? null
}
