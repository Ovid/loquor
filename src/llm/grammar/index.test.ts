// src/llm/grammar/index.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { vocabForSignature } from './index'
import type { Vocab } from './types'
import { signature } from '../../zmachine/signature'
import { ZORK1_VOCAB } from './zork1.vocab'
import { ZORK2_VOCAB } from './zork2.vocab'
import { ZORK3_VOCAB } from './zork3.vocab'
import { ZORK1_CORPUS } from './zork1.corpus'
import { ZORK2_CORPUS } from './zork2.corpus'
import { ZORK3_CORPUS } from './zork3.corpus'

describe('vocabForSignature', () => {
  it('returns null for an unknown signature', () => {
    expect(vocabForSignature('deadbeef')).toBeNull()
  })

  it.each([
    ['zork1', ZORK1_VOCAB],
    ['zork2', ZORK2_VOCAB],
    ['zork3', ZORK3_VOCAB],
  ])('maps the real %s signature to its vocab', (name, vocab) => {
    const bytes = new Uint8Array(readFileSync(`public/games/${name}.z3`))
    expect(vocabForSignature(signature(bytes))).toBe(vocab)
  })
})

// Structural coverage: every non-abstain corpus command must be expressible from
// the vocab — its verb is a known verb and each named noun is a known canonical.
// (parseCommand + buildGrammar only admit verbs/nouns the vocab declares, so a
// corpus command outside the vocab could never be produced.)
function commandFitsVocab(cmd: string, v: Vocab): boolean {
  const nounSet = new Set(v.nouns.map(n => n.canonical))
  const verbs = [...v.verbsOnly, ...v.movement, ...v.verbs1, ...v.verbs2].sort(
    (a, b) => b.length - a.length,
  )
  let rest = cmd.trim()
  const verb = verbs.find(x => rest === x || rest.startsWith(x + ' '))
  if (!verb) return false
  rest = rest.slice(verb.length).replace(/^ /, '')
  if (rest === '') return v.verbsOnly.includes(verb) || v.movement.includes(verb)
  // Remaining tokens are: noun [prep noun]. Longest-noun-match greedily.
  const eat = (): boolean => {
    const n = [...nounSet].sort((a, b) => b.length - a.length).find(x => rest === x || rest.startsWith(x + ' '))
    if (!n) return false
    rest = rest.slice(n.length).replace(/^ /, '')
    return true
  }
  if (!eat()) return false
  if (rest === '') return v.verbs1.includes(verb)
  const prep = v.preps.find(p => rest.startsWith(p + ' '))
  if (!prep) return false
  rest = rest.slice(prep.length).replace(/^ /, '')
  return eat() && rest === '' && v.verbs2.includes(verb)
}

describe.each([
  ['zork1', ZORK1_CORPUS, ZORK1_VOCAB],
  ['zork2', ZORK2_CORPUS, ZORK2_VOCAB],
  ['zork3', ZORK3_CORPUS, ZORK3_VOCAB],
])('%s corpus fits its vocab', (_name, corpus, vocab) => {
  it('every expected command is vocab-expressible or __UNKNOWN__', () => {
    for (const { english, expect: exp } of corpus) {
      if (exp === '__UNKNOWN__') continue
      expect(commandFitsVocab(exp, vocab), `"${english}" → "${exp}"`).toBe(true)
    }
  })

  it('has at least one __UNKNOWN__ entry', () => {
    expect(corpus.some(e => e.expect === '__UNKNOWN__')).toBe(true)
  })
})
