import { describe, it, expect } from 'vitest'
import { buildGrammar } from './buildGrammar'
import type { Vocab } from './types'
import type { Scene } from '../scene/types'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT } from './patterns'

const vocab: Vocab = {
  verbsOnly: ['look', 'inventory'],
  movement: ['north', 'up'],
  verbs1: ['take', 'open'],
  verbs2: ['unlock', 'put'],
  preps: ['with', 'in'],
  nouns: [{ canonical: 'mailbox' }, { canonical: 'leaflet' }],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
}

const scene = (inScope: string[]): Scene => ({
  inScope: inScope.map(c => ({ canonical: c })),
  antecedent: null,
})

describe('buildGrammar', () => {
  it('emits in-scope nouns as JSON-string terminals', () => {
    const g = buildGrammar(vocab, scene(['mailbox', 'leaflet']))
    expect(g).toContain('"\\"mailbox\\""')
    expect(g).toContain('"\\"leaflet\\""')
  })

  it('always includes the JSON abstain production', () => {
    const g = buildGrammar(vocab, scene(['mailbox']))
    expect(g).toContain('"{\\"verb\\":\\"__UNKNOWN__\\"}"')
  })

  it('never emits a pronoun terminal (pronouns are the model\'s job)', () => {
    const g = buildGrammar(vocab, scene(['mailbox', 'leaflet']))
    for (const p of ['"\\"it\\""', '"\\"them\\""', '"\\"le\\""', '"\\"la\\""'])
      expect(g).not.toContain(p)
  })

  it('empty scope → no noun alternatives and no object-bearing command', () => {
    const g = buildGrammar(vocab, scene([]))
    expect(g).not.toMatch(/^noun ::=/m)
    expect(g).not.toContain('verb1cmd')
    expect(g).not.toContain('verb2cmd')
    // verb-only + movement + abstain are still producible
    expect(g).toContain('"\\"look\\""')
    expect(g).toContain('"{\\"verb\\":\\"__UNKNOWN__\\"}"')
  })

  it('includes the two-object production when verbs2 + nouns exist', () => {
    const g = buildGrammar(vocab, scene(['mailbox']))
    expect(g).toContain('verb2cmd')
    expect(g).toContain('"\\"with\\""')
  })
})
