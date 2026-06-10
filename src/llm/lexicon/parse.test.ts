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
    // Mirrors zork1's real front-door entry: the canonical IS the dictionary
    // word, so extraction emits NO synonyms array (regression: review fix 1).
    { canonical: 'door', emit: 'front door', adjectives: ['boarded', 'front'] },
    {
      canonical: 'stone door',
      emit: 'huge door',
      synonyms: ['door'],
      adjectives: ['huge', 'stone'],
    },
    {
      canonical: 'small mailbox',
      emit: 'mailbox',
      synonyms: ['mailbox', 'box'],
      adjectives: ['small'],
    },
    { canonical: 'sword', emit: 'sword', synonyms: ['sword', 'blade'] },
    { canonical: 'rope', emit: 'rope', synonyms: ['rope', 'hemp', 'coil'] },
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
  'trap door': ['trappe', 'porte'],
  door: ['porte'],
  'stone door': ['porte'],
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
  rope: ['seil'],
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
  it('two-object: prep-split loop continues past a failed split at an internal prep-lookalike', () => {
    // 'aux' (→ to) splits first but 'lettres…' resolves to nothing; the loop
    // must keep going to 'dans' (→ in) instead of bailing on the first prep.
    expect(
      parseLexicon(
        'mets la boite aux lettres dans la vitrine',
        FR_CORE,
        FR_NOUNS,
        vocab,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'put mailbox in case' })
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
  it('ambiguous noun: shared dictionary word incl. a synonyms-less candidate (spec §5.2 step 2)', () => {
    // porte → door | stone door | trap door. The plain 'door' entry has NO
    // synonyms array (its canonical IS the dictionary word, like zork1's
    // front door), yet all three share 'door' — emit it and let the
    // Z-parser ask "Which door do you mean?".
    expect(
      parseLexicon('ouvre la porte', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'open door' })
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
  it('particle fires on a verbs2-only verb with one object → orphan-prompt emit (binde … an)', () => {
    // 'binde … an' → tie; fixture 'tie' is verbs2-only. Under [H] the
    // one-object form still emits: the Z-parser orphan-prompts for the
    // missing object ("What do you want to tie the rope to?") — deterministic,
    // never a guess. (Previously pinned as a miss; superseded by [H].)
    expect(
      parseLexicon('binde das seil an', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'tie rope' })
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

describe('parseLexicon — English via vocab surface forms (spec §6 step 3)', () => {
  it('maps an English synonym phrase to the emit form', () => {
    expect(
      parseLexicon('open trap door', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'open trapdoor' })
  })
})

describe('parseLexicon — UAT-3 regressions', () => {
  // UAT-3 N-3: the extracted vocab stores the v3 dictionary form 'inflat'
  // (words truncate to 6 chars), but the lexicons map gonfle/aufblasen/infla
  // to the in-game spelling 'inflate' (see the NOTE in fr.core.ts). The
  // roundtrip GATE is truncation-aware; verb-arity validation at parse time
  // must be too, or every inflate clause silently falls to the LLM.
  it("validates the verb against the vocab's 6-char-truncated form (gonfle → inflate vs 'inflat')", () => {
    const truncVocab: Vocab = {
      ...vocab,
      verbs2: [...vocab.verbs2, 'inflat'],
      nouns: [
        ...vocab.nouns,
        {
          canonical: 'pile of plastic',
          emit: 'valve',
          synonyms: ['pile', 'plastic', 'valve'],
          adjectives: ['plastic'],
        },
        {
          canonical: 'hand-held air pump',
          emit: 'pump',
          synonyms: ['pump'],
          adjectives: ['air'],
        },
      ],
    }
    const nouns: NounLexicon = {
      ...FR_NOUNS,
      'pile of plastic': ['plastique'],
      'hand-held air pump': ['pompe'],
    }
    expect(
      parseLexicon(
        'gonfle le plastique avec la pompe',
        FR_CORE,
        nouns,
        truncVocab,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'inflate valve with pump' })
  })

  // Review [D]: break/touch/taste/hide… exist ONLY in verbSynonyms (gsyntax
  // <SYNONYM …> members are real parser verbs extraction files there, not in
  // the arity lists), so verbArityOk never validated them and every lexicon
  // entry targeting them was dead — while the roundtrip gate, which unions
  // verbSynonyms, certified the data green. Synonyms inherit their head
  // verb's arity in ZIL, so they validate at EVERY arity; a wrong-arity emit
  // just earns the Z-parser's orphan prompt — still deterministic.
  it('a verb living only in verbSynonyms validates ([D] — casse la lampe)', () => {
    const synVocab: Vocab = { ...vocab, verbSynonyms: ['break'] }
    expect(
      parseLexicon('casse la lampe', FR_CORE, FR_NOUNS, synVocab, empty),
    ).toEqual({ kind: 'command', text: 'break light' })
  })

  it('verbSynonyms membership is truncation-aware ([D] + N-3)', () => {
    const synVocab: Vocab = { ...vocab, verbSynonyms: ['inflat'] }
    const noInflate: Vocab = {
      ...synVocab,
      verbs1: synVocab.verbs1.filter(v => v !== 'inflate'),
    }
    expect(
      parseLexicon('gonfle la lampe', FR_CORE, FR_NOUNS, noInflate, empty),
    ).toEqual({ kind: 'command', text: 'inflate light' })
  })

  // Review [E]: pronounsContainer mixed "inside it" and "on top of it" words
  // while the parser hardcoded `in` — `pose le livre dessus` emitted
  // `drop … in table` although the player said ON (put-in vs put-on is
  // gameplay-meaningful: Zork surfaces refuse `in`). The pronoun now carries
  // its preposition in the data.
  it("ON container-anaphora emits 'on' ([E] — mets le tableau dessus)", () => {
    expect(
      parseLexicon(
        'mets le tableau dessus',
        FR_CORE,
        FR_NOUNS,
        vocab,
        scene(['painting', 'trophy case'], 'trophy case'),
      ),
    ).toEqual({ kind: 'command', text: 'put painting on case' })
  })

  it("DE darauf/drauf emit 'on' ([E])", () => {
    expect(
      parseLexicon(
        'lege das schwert darauf',
        DE_CORE,
        DE_NOUNS,
        vocab,
        scene(['sword', 'trap door'], 'trap door'),
      ),
    ).toEqual({ kind: 'command', text: 'put sword on trapdoor' })
  })

  // Review [H]: attack/kill/give/throw/tie… are verbs2-only (their canonical
  // syntax carries an instrument), but the whole-remainder and pronoun paths
  // gated on arity 1 only — so `attaque le troll` missed while the
  // structurally identical Spanish personal-a path was already widened to
  // 1 OR 2 for exactly this verb class. Same allowance everywhere.
  it('verbs2-only verb + single object parses ([H] — attaque le troll)', () => {
    expect(
      parseLexicon('attaque le troll', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'attack troll' })
  })

  it('verbs2-only verb + direct pronoun parses ([H])', () => {
    expect(
      parseLexicon('attaque le', FR_CORE, FR_NOUNS, vocab, scene([], 'troll')),
    ).toEqual({ kind: 'command', text: 'attack troll' })
  })

  // UAT-3 N-3: `entre dans le bateau` fell to the LLM (which emitted `enter
  // river` — the one wrong-object resurfacing of the run) because a LEADING
  // preposition is only handled for 'to'; `entre dans X` needs the idiom path.
  it("'entre dans <noun>' boards/enters deterministically", () => {
    const boatVocab: Vocab = {
      ...vocab,
      verbs1: [...vocab.verbs1, 'enter'],
      nouns: [
        ...vocab.nouns,
        {
          canonical: 'magic boat',
          emit: 'raft',
          synonyms: ['boat', 'raft'],
          adjectives: ['magic'],
        },
      ],
    }
    const nouns: NounLexicon = { ...FR_NOUNS, 'magic boat': ['bateau'] }
    expect(
      parseLexicon('entre dans le bateau', FR_CORE, nouns, boatVocab, empty),
    ).toEqual({ kind: 'command', text: 'enter raft' })
    expect(
      parseLexicon('entrez dans le bateau', FR_CORE, nouns, boatVocab, empty),
    ).toEqual({ kind: 'command', text: 'enter raft' })
  })
})
