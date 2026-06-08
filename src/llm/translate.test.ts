import { describe, it, expect } from 'vitest'
import {
  parseCommand,
  isMetaCommand,
  isConfirmationPrompt,
  isDisambiguationPrompt,
  splitClauses,
  clauseFailed,
} from './translate'
import type { Scene } from './scene/types'
import type { Vocab } from './grammar/types'
import {
  TAKE_ACK,
  DROP_ACK,
  ABSENCE_PAT,
  FAILURE_PAT,
} from './grammar/patterns'

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

describe('isMetaCommand', () => {
  it('recognises bare meta verbs regardless of case / trailing punctuation', () => {
    for (const m of ['restart', 'SAVE', ' restore ', 'Quit!', 'version.'])
      expect(isMetaCommand(m)).toBe(true)
  })

  it('does NOT treat game actions or meta-prefixed phrases as meta', () => {
    // "restart" is meta; "open the mailbox" is a game action; "save the egg" is
    // a genuine in-game intent that must still reach the translator.
    for (const g of ['open the mailbox', 'take it', 'save the egg', 'north'])
      expect(isMetaCommand(g)).toBe(false)
  })
})

describe('isConfirmationPrompt', () => {
  it('detects the interpreter’s yes/no confirmation prompts', () => {
    for (const p of [
      'Do you wish to restart? (Y is affirmative): ',
      'Your score is 0 (total of 350 points), in 12 moves.\nDo you wish to leave the game? (Y is affirmative):',
      'Are you sure you want to quit?',
    ])
      expect(isConfirmationPrompt(p)).toBe(true)
  })

  it('does NOT fire on ordinary room / response text', () => {
    for (const p of [
      'You are standing in an open field west of a white house.',
      'Opening the small mailbox reveals a leaflet.',
      '',
    ])
      expect(isConfirmationPrompt(p)).toBe(false)
  })
})

describe('isDisambiguationPrompt', () => {
  it('detects the parser’s "Which … do you mean" disambiguation', () => {
    for (const p of [
      'Which door do you mean, the wooden door or the trap door?',
      'Which do you mean, the brass lantern or the lantern?',
    ])
      expect(isDisambiguationPrompt(p)).toBe(true)
  })

  it('does NOT fire on prose that merely contains "which"', () => {
    for (const p of [
      'The leaflet, which you can read, welcomes you to Zork.',
      'You are standing in an open field west of a white house.',
      '',
    ])
      expect(isDisambiguationPrompt(p)).toBe(false)
  })
})

describe('splitClauses', () => {
  it('returns a single-element array when there is no separator', () => {
    expect(splitClauses('open the mailbox')).toEqual(['open the mailbox'])
  })

  it('splits on the word separators (case-insensitive): and/then/et/puis/ensuite', () => {
    expect(splitClauses('open mailbox and take leaflet')).toEqual([
      'open mailbox',
      'take leaflet',
    ])
    expect(splitClauses('open mailbox THEN read it')).toEqual([
      'open mailbox',
      'read it',
    ])
    expect(splitClauses('ouvre la boîte et prends-le')).toEqual([
      'ouvre la boîte',
      'prends-le',
    ])
    expect(splitClauses('va au nord puis ouvre la porte')).toEqual([
      'va au nord',
      'ouvre la porte',
    ])
    expect(splitClauses('regarde ensuite prends la lampe')).toEqual([
      'regarde',
      'prends la lampe',
    ])
  })

  it('splits on "." and ";" punctuation', () => {
    expect(splitClauses('open mailbox. read leaflet')).toEqual([
      'open mailbox',
      'read leaflet',
    ])
    expect(splitClauses('open mailbox; read leaflet')).toEqual([
      'open mailbox',
      'read leaflet',
    ])
  })

  it('does NOT treat a comma as a separator', () => {
    expect(splitClauses('take the lamp, sword and key')).toEqual([
      'take the lamp, sword',
      'key',
    ])
  })

  it('does not false-split substrings like "sand" or "strengthen"', () => {
    expect(splitClauses('dig in the sand')).toEqual(['dig in the sand'])
    expect(splitClauses('strengthen the rope')).toEqual(['strengthen the rope'])
  })

  it('trims clauses and drops empties', () => {
    expect(splitClauses('  open mailbox  and  ')).toEqual(['open mailbox'])
    expect(splitClauses('open mailbox..')).toEqual(['open mailbox'])
  })
})

describe('clauseFailed', () => {
  const v: Vocab = { ...vocab, failurePat: FAILURE_PAT }

  it('is true on a no-op failure phrase (failurePat)', () => {
    expect(clauseFailed('It is already open.', v)).toBe(true)
  })

  it('is true on an absence phrase (absencePat)', () => {
    expect(clauseFailed("You can't see any grue here.", v)).toBe(true)
  })

  it('is false on ordinary success output', () => {
    expect(
      clauseFailed('Opening the small mailbox reveals a leaflet.', v),
    ).toBe(false)
  })

  it('is not stateful across calls (rebuilds the global absencePat each time)', () => {
    const out = "You can't see any grue here."
    expect(clauseFailed(out, v)).toBe(true)
    expect(clauseFailed(out, v)).toBe(true)
  })

  it('tolerates a vocab with no failurePat', () => {
    expect(clauseFailed('It is already open.', vocab)).toBe(false)
  })
})
