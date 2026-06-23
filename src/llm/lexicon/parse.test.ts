// src/llm/lexicon/parse.test.ts
import { describe, it, expect } from 'vitest'
import {
  parseLexicon,
  resolveEnglishPronoun,
  isEnglishPronounClause,
  resolveEnglishQuantifier,
  resolveEnglishQuantifierPhrase,
} from './parse'
import { FR_CORE } from './fr.core'
import { DE_CORE } from './de.core'
import { ES_CORE } from './es.core'
import { FR_ZORK1 } from './fr.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
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
  'trophy case': ['kiste', 'vitrine'],
  sword: ['schwert'],
  rope: ['seil'],
}
const ES_NOUNS: NounLexicon = {
  'brass lantern': ['lampara', 'linterna'],
  'trophy case': ['vitrina'],
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
  it('clitic pronoun with an ambiguous-synonym antecedent emits the parser word (window)', () => {
    // Same fix as resolveEnglishPronoun, shared via antecedentObject: an
    // ambiguous synonym ("window") is no vocab canonical but IS a parser word.
    expect(
      parseLexicon(
        'prends-le',
        FR_CORE,
        FR_NOUNS,
        ZORK1_VOCAB,
        scene([], 'window'),
      ),
    ).toEqual({ kind: 'command', text: 'take window' })
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
  it('French hero name "Ulysse" → cyclops magic word "ulysses" (UAT S4)', () => {
    // "Ulysse" is the French name for Ulysses/Odysseus; folds to "ulysse".
    // 'ulysses' is a verbSynonym in the REAL vocab (a verb-only magic word),
    // so the bare command clears the arity gate (verbArityOk passes
    // verbSynonyms at any arity). Uses ZORK1_VOCAB, not the fixture (whose
    // verbSynonyms is empty), since the behavior depends on the real data.
    expect(
      parseLexicon('Ulysse', FR_CORE, FR_ZORK1, ZORK1_VOCAB, empty),
    ).toEqual({ kind: 'command', text: 'ulysses' })
  })
  it('verb arity respected: transitive verb without an object → miss', () => {
    // 'ring' is verbs1-only in the fixture; bare 'sonne' has no object
    expect(parseLexicon('sonne', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'miss',
    })
  })
  it('"all" quantifier: tout/tous/toute/toutes → ALL (UAT: pose tout / prends tout)', () => {
    // The bare "all" quantifier was unhandled → fell to the LLM, which
    // hallucinated a stale noun ("drop advertisement"). Map it to the
    // Z-parser's ALL object deterministically.
    expect(parseLexicon('pose tout', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'command',
      text: 'drop all',
    })
    expect(
      parseLexicon('prends tout', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'take all' })
    // gender/number variants all fold to the same ALL quantifier
    for (const q of ['tous', 'toute', 'toutes']) {
      expect(
        parseLexicon(`prends ${q}`, FR_CORE, FR_NOUNS, vocab, empty),
      ).toEqual({ kind: 'command', text: 'take all' })
    }
  })
  it('"all" quantifier respects verb arity: a verb-only verb + tout → miss', () => {
    // 'attends'/wait takes no object; "wait all" is nonsense → fall through.
    expect(
      parseLexicon('attends tout', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'miss' })
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
  it('lass … fallen → drop, noun between verb and clause-final fallen (I3/I4/I5)', () => {
    // The "fallen lassen" cluster is mechanically a clause-final particle.
    // UAT: "lass X fallen" had fallen to the LLM (bare 'lass' + unresolved
    // 'X fallen'), which mis-guessed the noun (drop bottle / drop painting).
    expect(
      parseLexicon('lass das schwert fallen', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'drop sword' })
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

describe('resolveEnglishPronoun (the "open advertisement" fix)', () => {
  it('substitutes the antecedent emit form for "it"', () => {
    expect(
      resolveEnglishPronoun('open it', vocab, scene([], 'small mailbox')),
    ).toEqual({ kind: 'command', text: 'open mailbox' })
  })

  it('handles trailing punctuation and "them"', () => {
    expect(
      resolveEnglishPronoun('take them.', vocab, scene([], 'brass lantern')),
    ).toEqual({ kind: 'command', text: 'take light' })
  })

  it('misses (→ LLM) when there is no antecedent', () => {
    expect(resolveEnglishPronoun('open it', vocab, empty)).toEqual({
      kind: 'miss',
    })
  })

  it('misses when the leading word is not a known verb', () => {
    // "frobnicate" is no verb → never a deterministic resolve.
    expect(
      resolveEnglishPronoun('frobnicate it', vocab, scene([], 'small mailbox')),
    ).toEqual({ kind: 'miss' })
  })

  it('misses on a non-pronoun final token (a real noun is the lexicon/LLM path)', () => {
    expect(
      resolveEnglishPronoun('open mailbox', vocab, scene([], 'small mailbox')),
    ).toEqual({ kind: 'miss' })
  })

  it('misses on compound/particle forms — they belong to the LLM', () => {
    // ponytail ceiling: only the two-token "<verb> <pronoun>" form resolves here.
    expect(
      resolveEnglishPronoun('pick it up', vocab, scene([], 'small mailbox')),
    ).toEqual({ kind: 'miss' })
  })

  it('isEnglishPronounClause: true for a well-formed "<verb> <pronoun>"', () => {
    // Drives the raw-send fallback: a real pronoun command we couldn't resolve
    // should raw-send to Zork, not the LLM.
    expect(isEnglishPronounClause('open it', vocab)).toBe(true)
    expect(isEnglishPronounClause('take them.', vocab)).toBe(true)
  })

  it('isEnglishPronounClause: false for a non-verb, a real noun, or a particle form', () => {
    expect(isEnglishPronounClause('frobnicate it', vocab)).toBe(false) // unknown verb
    expect(isEnglishPronounClause('open mailbox', vocab)).toBe(false) // real noun
    expect(isEnglishPronounClause('pick it up', vocab)).toBe(false) // particle form
  })

  it('emits an ambiguous-synonym antecedent verbatim (the "window" Behind-House bug)', () => {
    // "window" is owned by boarded + kitchen window, so the scene tracker stores
    // it as its OWN canonical — there is NO vocab canonical 'window'. It is still
    // a parser word, so it must emit directly ("open window") and let Zork
    // disambiguate by room, NOT miss to the LLM (which hallucinated "open chests").
    expect(
      resolveEnglishPronoun('open it', ZORK1_VOCAB, scene([], 'window')),
    ).toEqual({ kind: 'command', text: 'open window' })
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

  // Review [F]: DE `an` in `binde X an Y` means English TO — Zork's only
  // two-object tie syntax is TIE OBJECT TO OBJECT (gsyntax.zil:497), so
  // mapping an→on made the Dome Room rope puzzle deterministically fail in
  // German. The attach sense dominates two-object commands; `auf` covers ON.
  it("DE 'an' maps to 'to' ([F] — binde das seil an die falltür)", () => {
    expect(
      parseLexicon(
        'binde das seil an die falltur',
        DE_CORE,
        DE_NOUNS,
        vocab,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'tie rope to trapdoor' })
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

describe('parseLexicon — UAT French playthrough (real Zork I vocab + lexicon)', () => {
  // UAT (Hades bell-book-candle ritual): "allume les bougies avec l'allumette"
  // fell to the LLM (→ "light bottle", a failed exorcism) because the matchbook
  // lexicon listed only the PLURAL "allumettes"; the natural singular "une
  // allumette" ("a match") missed deterministic resolution. The 'pair of
  // candles' entry already carries both bougies/bougie — matchbook must too.
  it('singular "allumette" resolves to the matchbook (light match)', () => {
    expect(
      parseLexicon(
        'allume une allumette',
        FR_CORE,
        FR_ZORK1,
        ZORK1_VOCAB,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'light match' })
  })
  it('two-object "light candles with match" resolves deterministically via the singular allumette', () => {
    expect(
      parseLexicon(
        "allume les bougies avec l'allumette",
        FR_CORE,
        FR_ZORK1,
        ZORK1_VOCAB,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'light candles with match' })
  })

  // UAT S3 (Frigid River): "lance le bateau" is the natural, CORRECT French for
  // "launch the boat" (lancer un bateau = to launch one), but lance→throw
  // unconditionally emitted "throw raft" — the boat was un-launchable in French.
  // Zork's LAUNCH (FIND VEHBIT) accepts the bare form (the walkthrough types a
  // bare ">launch"). Full-phrase idioms keep the ambiguous "lance le couteau" =
  // throw. "mettre à l'eau" (the boat label's own phrasing) also launches.
  it('lance le bateau → launch (was: throw raft)', () => {
    expect(
      parseLexicon('lance le bateau', FR_CORE, FR_ZORK1, ZORK1_VOCAB, empty),
    ).toEqual({ kind: 'command', text: 'launch' })
  })
  it('lancez le radeau (vous + synonym) → launch', () => {
    expect(
      parseLexicon('lancez le radeau', FR_CORE, FR_ZORK1, ZORK1_VOCAB, empty),
    ).toEqual({ kind: 'command', text: 'launch' })
  })
  it("mets le bateau à l'eau → launch", () => {
    expect(
      parseLexicon(
        "mets le bateau à l'eau",
        FR_CORE,
        FR_ZORK1,
        ZORK1_VOCAB,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'launch' })
  })
  it("mets à l'eau (elliptical) → launch", () => {
    expect(
      parseLexicon("mets à l'eau", FR_CORE, FR_ZORK1, ZORK1_VOCAB, empty),
    ).toEqual({ kind: 'command', text: 'launch' })
  })
  it('regression: lance le couteau still → throw knife (not launch)', () => {
    expect(
      parseLexicon(
        'lance le couteau',
        FR_CORE,
        FR_ZORK1,
        ZORK1_VOCAB,
        scene(['nasty knife']),
      ),
    ).toEqual({ kind: 'command', text: 'throw nasty knives' })
  })
})

describe('resolveEnglishQuantifier (English "take all" deterministic path — Bug A)', () => {
  it('maps a bare "<verb> all" to the Z-parser ALL object', () => {
    expect(resolveEnglishQuantifier('take all', vocab)).toEqual({
      kind: 'command',
      text: 'take all',
    })
  })

  it('maps "everything" to the same ALL object, with trailing punctuation', () => {
    expect(resolveEnglishQuantifier('take everything', vocab)).toEqual({
      kind: 'command',
      text: 'take all',
    })
    expect(resolveEnglishQuantifier('drop everything.', vocab)).toEqual({
      kind: 'command',
      text: 'drop all',
    })
  })

  it('allows a verbs2 verb (put all) — the Z-parser orphan-prompts for the rest', () => {
    expect(resolveEnglishQuantifier('put all', vocab)).toEqual({
      kind: 'command',
      text: 'put all',
    })
  })

  it('misses on an unknown verb or a verb-only (arity-0) verb', () => {
    expect(resolveEnglishQuantifier('frobnicate all', vocab)).toEqual({
      kind: 'miss',
    })
    expect(resolveEnglishQuantifier('look all', vocab)).toEqual({
      kind: 'miss',
    })
  })

  it('misses when the quantifier is not the bare remainder', () => {
    // "take all keys" is a real object phrase, not the ALL quantifier.
    expect(resolveEnglishQuantifier('take all keys', vocab)).toEqual({
      kind: 'miss',
    })
    expect(resolveEnglishQuantifier('take', vocab)).toEqual({ kind: 'miss' })
  })
})

// BUG F (UAT 2026-06-22, same class as BUG A): the bare-quantifier path above only
// catches the two-token "<verb> all". The MODIFIED forms — "put all in case" (the
// natural endgame treasure-casing shortcut), "drop all but the lamp", "take
// everything except the lamp" — fall to the warm LLM, which mangles them exactly
// like bare "take all" did pre-BUG-A: browser-confirmed "put all in case" →
// {"verb":"take","object":"large bag"} ("take large bag" — verb FLIPPED + object
// hallucinated), "drop all but the lamp" → "drop large bag". The Z-parser handles
// its ALL object with prepositions and the BUT/EXCEPT exclusion natively, so the
// fix raw-sends the player's words — normalizing "everything" → "all" (the parser's
// quantifier is ALL/ONE/BOTH; "everything" is NOT a Zork dictionary word). Guard:
// only fires when the leading verb is one arity-1/2 vocab verb, the quantifier sits
// right after it, there IS a rest, and every rest token is a word the parser knows.
describe('resolveEnglishQuantifierPhrase (modified "<verb> all <rest>" — Bug F)', () => {
  it('raw-sends "put all in case" (the bare path drops the destination)', () => {
    expect(
      resolveEnglishQuantifierPhrase('put all in case', ZORK1_VOCAB),
    ).toEqual({ kind: 'command', text: 'put all in case' })
  })

  it('preserves a leading article + the destination ("put all in the case")', () => {
    expect(
      resolveEnglishQuantifierPhrase('put all in the case', ZORK1_VOCAB),
    ).toEqual({ kind: 'command', text: 'put all in the case' })
  })

  it('raw-sends the BUT/EXCEPT exclusion ("drop all but the lamp")', () => {
    expect(
      resolveEnglishQuantifierPhrase('drop all but the lamp', ZORK1_VOCAB),
    ).toEqual({ kind: 'command', text: 'drop all but the lamp' })
  })

  it('normalizes "everything" → "all" before raw-send (not a Zork word)', () => {
    expect(
      resolveEnglishQuantifierPhrase(
        'take everything except the lamp',
        ZORK1_VOCAB,
      ),
    ).toEqual({ kind: 'command', text: 'take all except the lamp' })
  })

  it('misses on the bare form (no rest) — that is the sibling path’s job', () => {
    expect(resolveEnglishQuantifierPhrase('take all', ZORK1_VOCAB)).toEqual({
      kind: 'miss',
    })
  })

  it('misses when a rest token is not a parser-known word (no over-match)', () => {
    expect(
      resolveEnglishQuantifierPhrase('put all in zeppelin', ZORK1_VOCAB),
    ).toEqual({ kind: 'miss' })
  })

  it('misses when there is no leading arity-1/2 verb', () => {
    expect(
      resolveEnglishQuantifierPhrase('look all around here', ZORK1_VOCAB),
    ).toEqual({ kind: 'miss' })
  })
})

describe('parseLexicon — bare English "all" maps in EVERY language (Bug A parity)', () => {
  // fr/es already list bare 'all' in quantifiersAll; de did not, so a
  // German-picker player typing English "take all" fell straight to the LLM
  // (which mis-mapped it to "large bag"). The deterministic path must exist in
  // every applicable language, not just the easy ones.
  it('German core: "take all"/"take everything" → "take all"', () => {
    expect(parseLexicon('take all', DE_CORE, DE_NOUNS, vocab, empty)).toEqual({
      kind: 'command',
      text: 'take all',
    })
    expect(
      parseLexicon('take everything', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'take all' })
  })
  it('French core: "take all"/"take everything" → "take all"', () => {
    expect(parseLexicon('take all', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'command',
      text: 'take all',
    })
    expect(
      parseLexicon('take everything', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'take all' })
  })
  it('Spanish core: "take all"/"take everything" → "take all"', () => {
    expect(parseLexicon('take all', ES_CORE, ES_NOUNS, vocab, empty)).toEqual({
      kind: 'command',
      text: 'take all',
    })
    expect(
      parseLexicon('take everything', ES_CORE, ES_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'take all' })
  })
})

// BUG F parity (I1): the English raw-send (resolveEnglishQuantifierPhrase)
// catches the MODIFIED quantifier ("put all in case", "drop all but the lamp")
// because the player's words are already English. fr/de/es got only the BARE
// single-token quantifier in parseLexicon, so the localized endgame
// treasure-casing shortcut ("mets tout dans la caisse") fell to the LLM — the
// exact "take large bag" mangle the English fix was added to prevent. The
// localized tail must be TRANSLATED (prep via core.preps / exclusion via
// core.quantifiersExcept / noun resolved), emitting the canonical
// "all <prep> <noun>" / "all except <noun>".
describe('parseLexicon — MODIFIED "all" quantifier in fr/de/es (Bug F parity, I1)', () => {
  it('French prep form: "mets tout dans la vitrine" → "put all in case"', () => {
    expect(
      parseLexicon(
        'mets tout dans la vitrine',
        FR_CORE,
        FR_NOUNS,
        vocab,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'put all in case' })
  })
  it('French except form: "pose tout sauf la lampe" → "drop all except light"', () => {
    expect(
      parseLexicon('pose tout sauf la lampe', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'drop all except light' })
  })
  it('German prep form: "leg alles in die kiste" → "put all in case"', () => {
    expect(
      parseLexicon('leg alles in die kiste', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'put all in case' })
  })
  it('German except form (außer folds to ausser): "lass alles außer die lampe" → "drop all except light"', () => {
    expect(
      parseLexicon(
        'lass alles außer die lampe',
        DE_CORE,
        DE_NOUNS,
        vocab,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'drop all except light' })
  })
  it('Spanish prep form: "pon todo en la vitrina" → "put all in case"', () => {
    expect(
      parseLexicon('pon todo en la vitrina', ES_CORE, ES_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'put all in case' })
  })
  it('Spanish except form: "deja todo excepto la lampara" → "drop all except light"', () => {
    expect(
      parseLexicon(
        'deja todo excepto la lampara',
        ES_CORE,
        ES_NOUNS,
        vocab,
        empty,
      ),
    ).toEqual({ kind: 'command', text: 'drop all except light' })
  })
  it('misses (falls to the LLM) when the tail noun is unknown — never raw-sends foreign words', () => {
    expect(
      parseLexicon('mets tout dans le zeppelin', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'miss' })
  })
  it('bare "<verb> tout" still resolves via the single-token path (unchanged)', () => {
    expect(parseLexicon('pose tout', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'command',
      text: 'drop all',
    })
  })
})
