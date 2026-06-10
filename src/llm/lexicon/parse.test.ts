// src/llm/lexicon/parse.test.ts
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { FR_CORE } from './fr.core'
import { DE_CORE } from './de.core'
import { ES_CORE } from './es.core'
import type { NounLexicon } from './types'
import type { Vocab } from '../grammar/types'
import type { Scene } from '../scene/types'

// Minimal but realistic fixture vocab (emit ≠ canonical for the trap door,
// mirroring the generated data).
const vocab: Vocab = {
  verbsOnly: ['look', 'wait', 'pray'],
  movement: ['north', 'south', 'down'],
  verbs1: [
    'take',
    'drop',
    'open',
    'close',
    'read',
    'examine',
    'ring',
    'wave',
    'turn on',
    'turn off',
    'wind up',
    'inflate',
  ],
  verbs2: [
    'attack',
    'put',
    'tie',
    'unlock',
    'give',
    'turn on',
    'take',
    'drop',
    'open',
    'read',
  ],
  preps: ['with', 'in', 'to', 'on', 'under', 'from'],
  verbSynonyms: [],
  nouns: [
    {
      canonical: 'brass lantern',
      emit: 'light',
      synonyms: ['lamp', 'lantern', 'light'],
      adjectives: ['brass'],
    },
    {
      canonical: 'trap door',
      emit: 'trapdoor',
      synonyms: ['door', 'trapdoor', 'cover'],
      adjectives: ['trap', 'dusty'],
    },
    {
      canonical: 'small mailbox',
      emit: 'mailbox',
      synonyms: ['mailbox', 'box'],
      adjectives: ['small'],
    },
    { canonical: 'sword', emit: 'sword', synonyms: ['sword', 'blade'] },
    { canonical: 'troll', emit: 'troll', synonyms: ['troll'] },
    { canonical: 'wrench', emit: 'wrench', synonyms: ['wrench'] },
    {
      canonical: 'skeleton key',
      emit: 'key',
      synonyms: ['key'],
      adjectives: ['skeleton'],
    },
    { canonical: 'painting', emit: 'painting', synonyms: ['painting'] },
    {
      canonical: 'trophy case',
      emit: 'case',
      synonyms: ['case'],
      adjectives: ['trophy'],
    },
  ],
  takeAck: /taken/i,
  dropAck: /dropped/i,
  absencePat: /\bno\s+(\w+)\b/gi,
}

const FR_NOUNS: NounLexicon = {
  'brass lantern': ['lampe', 'lanterne'],
  'trap door': ['trappe'],
  'small mailbox': ['boite aux lettres', 'boite'],
  sword: ['epee'],
  troll: ['troll'],
  wrench: ['cle', 'cle a molette'],
  'skeleton key': ['cle'],
  painting: ['tableau'],
  'trophy case': ['vitrine'],
}
const DE_NOUNS: NounLexicon = {
  'brass lantern': ['lampe', 'laterne'],
  'trap door': ['falltur'],
  sword: ['schwert'],
}
const ES_NOUNS: NounLexicon = {
  'brass lantern': ['lampara', 'linterna'],
  sword: ['espada'],
  troll: ['troll'],
}

const empty: Scene = { inScope: [], antecedent: null }
const scene = (
  canonicals: string[],
  antecedent: string | null = null,
): Scene => ({
  inScope: canonicals.map(c => ({ canonical: c })),
  antecedent,
})

describe('parseLexicon — French', () => {
  it('verb + article + noun, emitting the EMIT form (F-F/F-Z class)', () => {
    expect(
      parseLexicon('ouvre la trappe', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'open trapdoor' })
    expect(
      parseLexicon('prends la lampe', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'take light' })
  })
  it('diacritics and typos-by-accent fold away', () => {
    expect(
      parseLexicon('ouvre la trappe!', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'open trapdoor' })
    expect(
      parseLexicon("prends l'épée", FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'take sword' })
  })
  it('multiword noun beats its embedded prep-lookalike (boite AUX lettres)', () => {
    expect(
      parseLexicon(
        'ouvre la boite aux lettres',
        FR_CORE,
        FR_NOUNS,
        vocab,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'open mailbox' })
  })
  it('two-object command with prep (UAT #30)', () => {
    expect(
      parseLexicon("tue le troll avec l'epee", FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'attack troll with sword' })
  })
  it('two-object command via à-contraction prep (au) still splits', () => {
    // ≥1 object token BEFORE the prep → indirect object, NOT personal-a.
    expect(
      parseLexicon('donne la lampe au troll', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'give light to troll' })
  })
  it('multiword verb idiom, longest-first', () => {
    expect(
      parseLexicon('laisse tomber la lampe', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'drop light' })
  })
  it('ambiguous noun: scope preference wins (cle → wrench in scope)', () => {
    expect(
      parseLexicon(
        'prends la cle',
        FR_CORE,
        FR_NOUNS,
        vocab,
        scene(['wrench']),
      ),
    ).toEqual({ kind: 'command', text: 'take wrench' })
  })
  it('ambiguous noun, no scope, no shared synonym → miss (pushback issue 1)', () => {
    // wrench{wrench} and skeleton key{key} share no dictionary word
    expect(
      parseLexicon('prends la cle', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'miss' })
  })
  it('clitic pronoun resolves via antecedent (prends-le)', () => {
    expect(
      parseLexicon('prends-le', FR_CORE, FR_NOUNS, vocab, scene([], 'sword')),
    ).toEqual({ kind: 'command', text: 'take sword' })
  })
  it('standalone la (no following noun) is a pronoun, not an article', () => {
    expect(
      parseLexicon(
        'examine-la',
        FR_CORE,
        FR_NOUNS,
        vocab,
        scene([], 'brass lantern'),
      ),
    ).toEqual({ kind: 'command', text: 'examine light' })
  })
  it('pronoun with no antecedent → miss, never a guess', () => {
    expect(parseLexicon('prends-le', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'miss',
    })
  })
  it('container anaphora with F-E guard (antecedent ≠ object required)', () => {
    expect(
      parseLexicon(
        'mets le tableau dedans',
        FR_CORE,
        FR_NOUNS,
        vocab,
        scene(['painting', 'trophy case'], 'trophy case'),
      ),
    ).toEqual({ kind: 'command', text: 'put painting in case' })
    // antecedent IS the object → miss (F-E: "put painting in painting")
    expect(
      parseLexicon(
        'mets le tableau dedans',
        FR_CORE,
        FR_NOUNS,
        vocab,
        scene(['painting'], 'painting'),
      ),
    ).toEqual({ kind: 'miss' })
  })
  it('strictness: one unrecognized content token → miss', () => {
    expect(
      parseLexicon(
        'ouvre prudemment la trappe',
        FR_CORE,
        FR_NOUNS,
        vocab,
        empty,
      ),
    ).toEqual({ kind: 'miss' })
  })
  it('verb-only commands', () => {
    expect(parseLexicon('attends', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'command',
      text: 'wait',
    })
  })
  it('verb arity respected: transitive verb without an object → miss', () => {
    // 'ring' is verbs1-only in the fixture; bare 'sonne' has no object
    expect(parseLexicon('sonne', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'miss',
    })
  })
})

describe('parseLexicon — German separable verbs (pushback issue 3)', () => {
  it('schalte … ein → turn on, noun between verb and particle', () => {
    expect(
      parseLexicon('schalte die laterne ein', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'turn on light' })
  })
  it('mach … auf → open', () => {
    expect(
      parseLexicon('mach die falltur auf', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'open trapdoor' })
  })
  it('bare stem without its particle never matches', () => {
    expect(
      parseLexicon('mach die falltur', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'miss' })
  })
  it('self pronoun → me (untersuche mich)', () => {
    expect(
      parseLexicon('untersuche mich', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'examine me' })
  })
})

describe('parseLexicon — Spanish', () => {
  it('verb + noun', () => {
    expect(
      parseLexicon('toma la espada', ES_CORE, ES_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'take sword' })
  })
  it('personal-a direct object: mata AL troll → attack troll, never "attack to troll"', () => {
    // es.core.ts preps NOTE: `<verb> a/al <noun>` with nothing before the
    // prep marks an animate DIRECT object — emit `<verb> <noun>`.
    expect(
      parseLexicon('mata al troll', ES_CORE, ES_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'attack troll' })
  })
  it('personal-a with an unknown noun stays strict → miss', () => {
    expect(
      parseLexicon('mata al ogro', ES_CORE, ES_NOUNS, vocab, empty),
    ).toEqual({
      kind: 'miss',
    })
  })
  it('two-object command with prep (pon … en …)', () => {
    expect(
      parseLexicon(
        'pon la espada en la lampara',
        ES_CORE,
        ES_NOUNS,
        vocab,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'put sword in light' })
  })
})

describe('parseLexicon — English via vocab surface forms (spec §6.3)', () => {
  it('maps an English synonym phrase to the emit form', () => {
    expect(
      parseLexicon('open trap door', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'open trapdoor' })
  })
})
