import { describe, it, expect } from 'vitest'
import { parseCommand } from './translate'
import type { Scene } from './scene/types'
import type { Vocab } from './grammar/types'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT } from './grammar/patterns'

const vocab: Vocab = {
  verbsOnly: ['look', 'inventory'],
  movement: ['north'],
  verbs1: ['take', 'open'],
  verbs2: ['unlock', 'put'],
  preps: ['with', 'in'],
  nouns: [
    { canonical: 'grating' },
    { canonical: 'key' },
    { canonical: 'leaflet' },
  ],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
}
const scene: Scene = {
  inScope: [
    { canonical: 'grating' },
    { canonical: 'key' },
    { canonical: 'leaflet' },
  ],
  antecedent: 'leaflet',
}

describe('parseCommand', () => {
  it('serializes a single-object command', () => {
    expect(
      parseCommand('{"verb":"take","object":"leaflet"}', scene, vocab),
    ).toEqual({
      kind: 'command',
      text: 'take leaflet',
    })
  })

  it('serializes a two-object command', () => {
    expect(
      parseCommand(
        '{"verb":"unlock","object":"grating","prep":"with","indirect":"key"}',
        scene,
        vocab,
      ),
    ).toEqual({ kind: 'command', text: 'unlock grating with key' })
  })

  it('serializes a verb-only command', () => {
    expect(parseCommand('{"verb":"look"}', scene, vocab)).toEqual({
      kind: 'command',
      text: 'look',
    })
  })

  it('__UNKNOWN__ verb → abstain', () => {
    expect(parseCommand('{"verb":"__UNKNOWN__"}', scene, vocab)).toEqual({
      kind: 'abstain',
    })
  })

  it('out-of-scope object → abstain', () => {
    const s: Scene = { inScope: [{ canonical: 'key' }], antecedent: null }
    expect(
      parseCommand('{"verb":"take","object":"grating"}', s, vocab),
    ).toEqual({ kind: 'abstain' })
  })

  it('verbs2 missing prep/indirect → abstain', () => {
    expect(
      parseCommand('{"verb":"unlock","object":"grating"}', scene, vocab),
    ).toEqual({ kind: 'abstain' })
  })

  it('verbs1 carrying prep/indirect → abstain', () => {
    expect(
      parseCommand(
        '{"verb":"take","object":"key","prep":"with","indirect":"grating"}',
        scene,
        vocab,
      ),
    ).toEqual({ kind: 'abstain' })
  })

  it('unknown verb → abstain', () => {
    expect(
      parseCommand('{"verb":"frobnicate","object":"key"}', scene, vocab),
    ).toEqual({ kind: 'abstain' })
  })

  it('malformed JSON → abstain', () => {
    expect(parseCommand('not json', scene, vocab)).toEqual({ kind: 'abstain' })
    expect(parseCommand('', scene, vocab)).toEqual({ kind: 'abstain' })
  })
})
