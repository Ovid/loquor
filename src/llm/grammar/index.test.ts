// src/llm/grammar/index.test.ts
import { describe, it, expect } from 'vitest'
import { grammarForSignature } from './index'
import { ZORK1_GBNF } from './zork1.gbnf'
import { ZORK2_GBNF } from './zork2.gbnf'
import { ZORK3_GBNF } from './zork3.gbnf'
import { ZORK1_CORPUS } from './zork1.corpus'
import { ZORK2_CORPUS } from './zork2.corpus'
import { ZORK3_CORPUS } from './zork3.corpus'

describe('grammarForSignature', () => {
  it('returns null for an unknown signature', () => {
    expect(grammarForSignature('deadbeef')).toBeNull()
  })

  it('all three games map to a grammar containing the abstain production', () => {
    for (const g of [ZORK1_GBNF, ZORK2_GBNF, ZORK3_GBNF]) {
      expect(g).toContain('"__UNKNOWN__"')
    }
  })
})

// Structural coverage check: every non-abstain corpus command must be spellable
// from the grammar — i.e. the command can be segmented entirely into quoted
// literals present in the GBNF. Uses a greedy longest-literal match so multi-word
// verbs ("turn on") and nouns ("trap door") are handled correctly. (Constrained
// decoding can only emit what the grammar admits, so a corpus command that can't
// be segmented from the grammar's literals could never be produced.)
function wordsInGrammar(cmd: string, gbnf: string): boolean {
  const literals = [...gbnf.matchAll(/"([^"]+)"/g)].map(m => m[1])
  let rest = cmd.trim()
  while (rest.length > 0) {
    const lit = literals
      .filter(l => rest === l || rest.startsWith(l + ' '))
      .sort((a, b) => b.length - a.length)[0]
    if (!lit) return false
    rest = rest.slice(lit.length).replace(/^ /, '')
  }
  return true
}

describe.each([
  ['zork1', ZORK1_CORPUS, ZORK1_GBNF],
  ['zork2', ZORK2_CORPUS, ZORK2_GBNF],
  ['zork3', ZORK3_CORPUS, ZORK3_GBNF],
])('%s corpus is grammar-consistent', (_name, corpus, gbnf) => {
  it('every expected command is grammar-valid or __UNKNOWN__', () => {
    for (const { english, expect: exp } of corpus) {
      if (exp === '__UNKNOWN__') continue
      expect(wordsInGrammar(exp, gbnf), `"${english}" → "${exp}"`).toBe(true)
    }
  })
})

describe('corpora include should-abstain and near-miss cases', () => {
  it('each corpus has at least one __UNKNOWN__ entry', () => {
    for (const c of [ZORK1_CORPUS, ZORK2_CORPUS, ZORK3_CORPUS]) {
      expect(c.some(e => e.expect === '__UNKNOWN__')).toBe(true)
    }
  })
})
