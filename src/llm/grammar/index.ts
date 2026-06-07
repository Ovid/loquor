// src/llm/grammar/index.ts
import { ZORK1_GBNF } from './zork1.gbnf'
import { ZORK2_GBNF } from './zork2.gbnf'
import { ZORK3_GBNF } from './zork3.gbnf'

export interface CorpusEntry {
  english: string
  /** canonical command, or '__UNKNOWN__' for should-abstain */
  expect: string
}

// Per-game story signatures (first 0x1E bytes, hex) from Step 5.
const ZORK1_SIG = '030000774b5450d5389903e602b02c12004038383034323901f0a99bbf44'
const ZORK2_SIG = '0300003f4d6c4de53a8e02a823132df7000038363038313101e8b4b64492'
const ZORK3_SIG = '030000194dfa6cf73d8b02ae1fd23104000038363038313101eeabd8f645'

const BY_SIGNATURE: Record<string, string> = {
  [ZORK1_SIG]: ZORK1_GBNF,
  [ZORK2_SIG]: ZORK2_GBNF,
  [ZORK3_SIG]: ZORK3_GBNF,
}

/** Map a per-game story signature to its GBNF, or null if unknown. */
export function grammarForSignature(sig: string): string | null {
  return BY_SIGNATURE[sig] ?? null
}
