import { describe, it, expect } from 'vitest'
import { buildGrammar } from './buildGrammar'
import type { Vocab } from './types'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT } from './patterns'

const vocab: Vocab = {
  verbsOnly: ['look', 'inventory'],
  movement: ['north', 'up'],
  verbs1: ['take', 'open'],
  verbs2: ['unlock', 'put'],
  preps: ['with', 'in'],
  verbSynonyms: [],
  nouns: [
    { canonical: 'mailbox', emit: 'mailbox' },
    { canonical: 'leaflet', emit: 'leaflet' },
    // canonical ≠ emit: the grammar must offer the SHORT parser-accepted form.
    { canonical: 'hand-held air pump', emit: 'pump' },
  ],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
}

describe('buildGrammar (vocab-driven, NL v2 §7)', () => {
  it('noun terminals are ALL vocab emit forms, independent of any scene', () => {
    const g = buildGrammar(vocab)
    for (const n of vocab.nouns)
      expect(g).toContain(`"\\u0022${n.emit}\\u0022"`)
  })

  it('uses emit forms, not canonicals, when they differ', () => {
    const g = buildGrammar(vocab)
    expect(g).toContain('pump')
    expect(g).not.toContain('hand-held air pump')
  })

  it('always offers verb1/verb2 productions (vocab nouns are never empty)', () => {
    const g = buildGrammar(vocab)
    expect(g).toContain('verb1cmd')
    expect(g).toContain('verb2cmd')
  })

  it('still offers the abstain production', () => {
    const g = buildGrammar(vocab)
    expect(g).toContain('__UNKNOWN__')
    expect(g).toContain('"{\\u0022verb\\u0022:\\u0022__UNKNOWN__\\u0022}"')
  })

  it("never emits a pronoun terminal (pronouns are the model's job)", () => {
    const g = buildGrammar(vocab)
    for (const p of [
      '"\\u0022it\\u0022"',
      '"\\u0022them\\u0022"',
      '"\\u0022le\\u0022"',
      '"\\u0022la\\u0022"',
    ])
      expect(g).not.toContain(p)
  })

  it('includes the two-object production when verbs2 exist', () => {
    const g = buildGrammar(vocab)
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
    const g = buildGrammar(vocab)
    expect(g).not.toContain('\\"') // the invalid escape must never appear
    expect(g).toContain('\\u0022') // quotes are emitted as the unicode escape
  })
})
