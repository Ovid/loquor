import { describe, it, expect } from 'vitest'
import {
  parseCommand,
  isMetaCommand,
  metaAlias,
  isConfirmationPrompt,
  isDisambiguationPrompt,
  splitClauses,
  clauseFailed,
} from './translate'
import { META_COMMANDS } from './meta'
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
  // 'open' is deliberately in BOTH verbs1 and verbs2: 25 real Zork I verbs
  // overlap the two lists (open, take, drop, read…), and a disjoint fixture hid
  // the first-list-wins misclassification (review C1).
  verbs2: ['unlock', 'put', 'open'],
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

  it('classifies an overlapping verbs1/verbs2 verb by the emitted shape (C1)', () => {
    // "open" is in both lists. The two-object emission must take the verbs2
    // branch ("open the door with the key"), not abstain via the verbs1 check…
    expect(
      parseCommand(
        '{"verb":"open","object":"grating","prep":"with","indirect":"key"}',
        scene,
        vocab,
      ),
    ).toEqual({ kind: 'command', text: 'open grating with key' })
    // …and the one-object emission still takes the verbs1 branch.
    expect(parseCommand('{"verb":"open","object":"grating"}', scene, vocab)).toEqual(
      { kind: 'command', text: 'open grating' },
    )
  })

  it('overlapping verb with a half-formed two-object shape → abstain', () => {
    // prep present but no indirect: neither a valid verbs1 nor verbs2 shape.
    expect(
      parseCommand(
        '{"verb":"open","object":"grating","prep":"with"}',
        scene,
        vocab,
      ),
    ).toEqual({ kind: 'abstain' })
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

  it('routes $-/#-prefixed debug commands as meta (UAT F6)', () => {
    // The vocab generator drops $/# debug verbs from the grammar (zil.mjs), so
    // they have no emittable translation; they must bypass the model and be sent
    // raw to the interpreter (UAT F6: `$verify` leaked into the LLM -> `look`).
    for (const m of ['$verify', '$VERIFY', '#command', '$ve']) {
      expect(isMetaCommand(m)).toBe(true)
    }
  })
})

describe('metaAlias', () => {
  it('maps a localized command word to its English canonical (UAT F5)', () => {
    expect(metaAlias('inventaire')).toBe('inventory') // fr
    expect(metaAlias('Inventar')).toBe('inventory') // de
    expect(metaAlias('inventario')).toBe('inventory') // es / it
    expect(metaAlias('inventaire.')).toBe('inventory') // trailing punctuation
  })

  it('returns null for English input and genuine game actions', () => {
    for (const g of ['inventory', 'i', 'open mailbox', 'va au sud'])
      expect(metaAlias(g)).toBeNull()
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

  it('splits on German "und" and Spanish "y" (review C3)', () => {
    // directions.ts and meta.ts cover de/es; the compound path must too.
    expect(splitClauses('geh nach norden und nimm die lampe')).toEqual([
      'geh nach norden',
      'nimm die lampe',
    ])
    expect(splitClauses('ve al norte y toma la lámpara')).toEqual([
      've al norte',
      'toma la lámpara',
    ])
  })

  it('does not false-split words containing "und"/"y"', () => {
    expect(splitClauses('look under the rug')).toEqual(['look under the rug'])
    expect(splitClauses('say xyzzy')).toEqual(['say xyzzy'])
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

  // F2/R3: tie the absence match to the object the clause acted on, so narrative
  // "No X" text (e.g. the leaflet body) can't masquerade as an in-game failure
  // and truncate a compound sequence.
  it('ignores narrative "No X" unrelated to the acted object (F2/R3)', () => {
    const leaflet =
      'WELCOME TO ZORK! ZORK is a game of adventure. No computer should be without one!'
    // 2-arg (no command) keeps the old blanket behavior…
    expect(clauseFailed(leaflet, v)).toBe(true)
    // …but knowing the clause was `read leaflet`, "no computer" is not a failure.
    expect(clauseFailed(leaflet, v, 'read leaflet')).toBe(false)
  })

  it('flags an adjective-prefixed absence of the acted object (review C6)', () => {
    // Old capture grabbed only "small", which names no vocab noun → the failed
    // clause was treated as a success and the sequence over-ran.
    expect(
      clauseFailed("You can't see any small mailbox here.", v, 'open mailbox'),
    ).toBe(true)
  })

  it('still flags an absence that names the acted object', () => {
    expect(
      clauseFailed("You can't see any leaflet here!", v, 'read leaflet'),
    ).toBe(true)
    expect(clauseFailed('There is no leaflet here.', v, 'drop leaflet')).toBe(
      true,
    )
  })

  it('flags a pronoun refusal ("It is already…") for the acted object', () => {
    // The refusal sentence names no vocab noun → it is about the acted object.
    expect(clauseFailed('It is already open.', v, 'open grating')).toBe(true)
  })

  it('flags a refusal whose sentence names the acted object (review C8)', () => {
    expect(clauseFailed('The grating cannot be moved.', v, 'open grating')).toBe(
      true,
    )
  })

  it('ignores a refusal about an UNRELATED object (review C8)', () => {
    // A turn whose output refuses something else ("The grating cannot be
    // moved.") must not truncate a sequence whose own action succeeded —
    // the same asymmetry the F2/R3 absence scoping fixed.
    expect(
      clauseFailed('You pick up the leaflet.\nThe grating cannot be moved.', v, 'take leaflet'),
    ).toBe(false)
  })

  it('keeps the blanket refusal behavior when no command is given', () => {
    expect(clauseFailed('The grating cannot be moved.', v)).toBe(true)
  })
})

describe('meta-command source', () => {
  it('routes parser buzzwords again/g raw', () => {
    expect(isMetaCommand('again')).toBe(true)
    expect(isMetaCommand('g')).toBe(true)
  })
  it('keeps inventory as an in-world (non-meta) verb', () => {
    expect(isMetaCommand('inventory')).toBe(false)
  })
  it('still bypasses the classic session verbs', () => {
    expect(isMetaCommand('save')).toBe(true)
    expect(isMetaCommand('SCORE.')).toBe(true)
  })
  it('exposes a deduped, lowercase list', () => {
    expect(META_COMMANDS).toContain('restart')
    expect(new Set(META_COMMANDS).size).toBe(META_COMMANDS.length)
  })
})
