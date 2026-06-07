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
    expect(g).toContain('"\\u0022mailbox\\u0022"')
    expect(g).toContain('"\\u0022leaflet\\u0022"')
  })

  it('always includes the JSON abstain production', () => {
    const g = buildGrammar(vocab, scene(['mailbox']))
    expect(g).toContain('"{\\u0022verb\\u0022:\\u0022__UNKNOWN__\\u0022}"')
  })

  it("never emits a pronoun terminal (pronouns are the model's job)", () => {
    const g = buildGrammar(vocab, scene(['mailbox', 'leaflet']))
    for (const p of [
      '"\\u0022it\\u0022"',
      '"\\u0022them\\u0022"',
      '"\\u0022le\\u0022"',
      '"\\u0022la\\u0022"',
    ])
      expect(g).not.toContain(p)
  })

  it('empty scope → no noun alternatives and no object-bearing command', () => {
    const g = buildGrammar(vocab, scene([]))
    expect(g).not.toMatch(/^noun ::=/m)
    expect(g).not.toContain('verb1cmd')
    expect(g).not.toContain('verb2cmd')
    // verb-only + movement + abstain are still producible
    expect(g).toContain('"\\u0022look\\u0022"')
    expect(g).toContain('"{\\u0022verb\\u0022:\\u0022__UNKNOWN__\\u0022}"')
  })

  it('includes the two-object production when verbs2 + nouns exist', () => {
    const g = buildGrammar(vocab, scene(['mailbox']))
    expect(g).toContain('verb2cmd')
    expect(g).toContain('"\\u0022with\\u0022"')
  })

  it('encodes JSON quotes as XGrammar \\u0022 escapes, never \\" (Grammar.fromEBNF rejects \\")', () => {
    // XGrammar's EBNF parser follows W3C XML notation: a "..." string literal
    // cannot contain a literal " and the ONLY escapes it accepts are C-style
    // unicode (\uXXXX / \xXX). Emitting \" (as the first JSON-intermediate pass
    // did) makes Grammar.fromEBNF throw, which the hook surfaces to the player as
    // "Translation failed — sent as typed." So every JSON double-quote the model
    // must output is emitted here as the " escape inside a "..." literal.
    const g = buildGrammar(vocab, scene(['mailbox']))
    expect(g).not.toContain('\\"') // the invalid escape must never appear
    expect(g).toContain('\\u0022') // quotes are emitted as the unicode escape
  })
})
