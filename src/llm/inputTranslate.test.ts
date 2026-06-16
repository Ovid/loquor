import { describe, it, expect } from 'vitest'
import {
  parseCommand,
  isMetaCommand,
  metaAlias,
  isConfirmationPrompt,
  confirmationReply,
  isDisambiguationPrompt,
  isOrphanPrompt,
  splitClauses,
  fillElidedVerbs,
  distributePrepTail,
  clauseFailed,
  refusalApplies,
  unquote,
  isVocabPassthrough,
} from './inputTranslate'
import { META_COMMANDS } from './meta'
import { FR_CORE } from './lexicon/fr.core'
import { ES_CORE } from './lexicon/es.core'
import { DE_CORE } from './lexicon/de.core'
import type { Vocab } from './grammar/types'
import type { NounLexicon } from './lexicon/types'
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
  verbSynonyms: [],
  nouns: [
    { canonical: 'grating', emit: 'grating' },
    { canonical: 'key', emit: 'key' },
    { canonical: 'leaflet', emit: 'leaflet' },
    // In the vocab but never "in scope" anywhere in these tests: under NL v2 §7
    // parseCommand is vocab-gated, scope-free — naming it must still validate.
    { canonical: 'trap door', emit: 'trapdoor' },
  ],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
}

describe('parseCommand (vocab-gated, scope-free)', () => {
  it('serializes a single-object command', () => {
    expect(parseCommand('{"verb":"take","object":"leaflet"}', vocab)).toEqual({
      kind: 'command',
      text: 'take leaflet',
    })
  })

  it('serializes a two-object command', () => {
    expect(
      parseCommand(
        '{"verb":"unlock","object":"grating","prep":"with","indirect":"key"}',
        vocab,
      ),
    ).toEqual({ kind: 'command', text: 'unlock grating with key' })
  })

  it('serializes a verb-only command', () => {
    expect(parseCommand('{"verb":"look"}', vocab)).toEqual({
      kind: 'command',
      text: 'look',
    })
  })

  it('accepts an object that is in vocab but NOT in scope (honest Z-machine failure downstream)', () => {
    // NL v2 §7: scope is a prompt hint only. A wrong-room object passes through
    // and gets the Z-machine's own "You can't see any trapdoor here!".
    expect(parseCommand('{"verb":"open","object":"trapdoor"}', vocab)).toEqual({
      kind: 'command',
      text: 'open trapdoor',
    })
  })

  it('rejects an object not in the vocab emit set', () => {
    expect(parseCommand('{"verb":"open","object":"zeppelin"}', vocab)).toEqual({
      kind: 'abstain',
    })
  })

  it('rejects an indirect object not in the vocab emit set', () => {
    expect(
      parseCommand(
        '{"verb":"unlock","object":"grating","prep":"with","indirect":"zeppelin"}',
        vocab,
      ),
    ).toEqual({ kind: 'abstain' })
  })

  it('classifies an overlapping verbs1/verbs2 verb by the emitted shape (C1)', () => {
    // "open" is in both lists. The two-object emission must take the verbs2
    // branch ("open the door with the key"), not abstain via the verbs1 check…
    expect(
      parseCommand(
        '{"verb":"open","object":"grating","prep":"with","indirect":"key"}',
        vocab,
      ),
    ).toEqual({ kind: 'command', text: 'open grating with key' })
    // …and the one-object emission still takes the verbs1 branch.
    expect(parseCommand('{"verb":"open","object":"grating"}', vocab)).toEqual({
      kind: 'command',
      text: 'open grating',
    })
  })

  it('overlapping verb with a half-formed two-object shape → abstain', () => {
    // prep present but no indirect: neither a valid verbs1 nor verbs2 shape.
    expect(
      parseCommand('{"verb":"open","object":"grating","prep":"with"}', vocab),
    ).toEqual({ kind: 'abstain' })
  })

  it('__UNKNOWN__ verb → abstain', () => {
    expect(parseCommand('{"verb":"__UNKNOWN__"}', vocab)).toEqual({
      kind: 'abstain',
    })
  })

  it('verbs2 missing prep/indirect → abstain', () => {
    expect(parseCommand('{"verb":"unlock","object":"grating"}', vocab)).toEqual(
      { kind: 'abstain' },
    )
  })

  it('verbs1 carrying prep/indirect → abstain', () => {
    expect(
      parseCommand(
        '{"verb":"take","object":"key","prep":"with","indirect":"grating"}',
        vocab,
      ),
    ).toEqual({ kind: 'abstain' })
  })

  it('unknown verb → abstain', () => {
    expect(parseCommand('{"verb":"frobnicate","object":"key"}', vocab)).toEqual(
      { kind: 'abstain' },
    )
  })

  it('malformed JSON → abstain', () => {
    expect(parseCommand('not json', vocab)).toEqual({ kind: 'abstain' })
    expect(parseCommand('', vocab)).toEqual({ kind: 'abstain' })
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

describe('metaAlias (core-lexicon-driven)', () => {
  it('maps a localized bare command via the active core lexicon', () => {
    expect(metaAlias('inventaire', FR_CORE)).toBe('inventory')
    expect(metaAlias('Diagnostic!', FR_CORE)).toBe('diagnose')
  })
  it('folds diacritics before lookup', () => {
    expect(metaAlias('Inventâire', FR_CORE)).toBe('inventory')
  })
  it('returns null with no core (English session) or for non-meta input', () => {
    expect(metaAlias('inventaire', null)).toBeNull()
    expect(metaAlias('inventaire de la maison', FR_CORE)).toBeNull()
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

  it('detects the LOCALIZED German confirmation prompts (UAT F2)', () => {
    for (const p of [
      'Möchtest du neu beginnen? (Y bedeutet ja):',
      'Möchtest du das Spiel verlassen? (Y für ja):',
      'Möchtest du das Spiel von vorne beginnen…?\n(Tippe RESTART, RESTORE oder QUIT):',
    ])
      expect(isConfirmationPrompt(p)).toBe(true)
  })

  it('does NOT fire on ordinary room / response text', () => {
    for (const p of [
      'You are standing in an open field west of a white house.',
      'Opening the small mailbox reveals a leaflet.',
      'Du stehst auf einem offenen Feld westlich eines weißen Hauses.',
      '',
    ])
      expect(isConfirmationPrompt(p)).toBe(false)
  })
})

describe('confirmationReply (map localized yes/no to the interpreter key — review I3)', () => {
  it('maps each language’s reflex affirmative to "y"', () => {
    expect(confirmationReply('j', 'de')).toBe('y')
    expect(confirmationReply('ja', 'de')).toBe('y')
    expect(confirmationReply('oui', 'fr')).toBe('y')
    expect(confirmationReply('o', 'fr')).toBe('y')
    expect(confirmationReply('sí', 'es')).toBe('y')
    expect(confirmationReply('si', 'es')).toBe('y')
    expect(confirmationReply('s', 'es')).toBe('y')
  })

  it('maps each language’s reflex negative to "n"', () => {
    expect(confirmationReply('nein', 'de')).toBe('n')
    expect(confirmationReply('non', 'fr')).toBe('n')
    expect(confirmationReply('no', 'es')).toBe('n')
    expect(confirmationReply('n', 'de')).toBe('n')
  })

  it('is case/punctuation insensitive', () => {
    expect(confirmationReply('Ja!', 'de')).toBe('y')
    expect(confirmationReply(' OUI. ', 'fr')).toBe('y')
  })

  it('leaves the literal "y"/"n" and anything else untouched (no regression)', () => {
    expect(confirmationReply('y', 'de')).toBe('y')
    expect(confirmationReply('Y', 'de')).toBe('Y')
    expect(confirmationReply('restart', 'de')).toBe('restart')
    // English: "y"/"n" already work; don't remap an English word.
    expect(confirmationReply('no', 'en')).toBe('no')
    expect(confirmationReply('yes', 'en')).toBe('yes')
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

  it('detects the LOCALIZED German "Welche… meinst du" disambiguation (UAT F2)', () => {
    expect(
      isDisambiguationPrompt(
        'Welches Buch meinst du, das schwarze Buch oder das blaue Buch?',
      ),
    ).toBe(true)
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

describe('isOrphanPrompt', () => {
  it('detects the parser’s "What do you want to …" orphan prompt', () => {
    for (const p of [
      'What do you want to put the coffin in?',
      'What do you want to take?',
    ])
      expect(isOrphanPrompt(p)).toBe(true)
  })

  it('detects the LOCALIZED German "Was willst du …" orphan prompt (UAT F16)', () => {
    expect(isOrphanPrompt('Was willst du mit dem Schädel tun?')).toBe(true)
  })

  it('does NOT fire on ordinary output (incl. German "Wie willst du …")', () => {
    for (const p of [
      'You put the coffin in the trophy case.',
      'It is pitch black. You are likely to be eaten by a grue.',
      'Wie genau willst du das läuten?', // "Wie", not "Was" — a refusal, not an orphan
      '',
    ])
      expect(isOrphanPrompt(p)).toBe(false)
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

  it('absorbs a doubled connector "und dann" / "and then" (UAT F4)', () => {
    // A run of conjunctions is one separator, so no dangling "dann …" clause.
    expect(splitClauses('geh nach norden und dann nach osten')).toEqual([
      'geh nach norden',
      'nach osten',
    ])
    expect(splitClauses('open mailbox and then read it')).toEqual([
      'open mailbox',
      'read it',
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

  it('splits on commas (UAT: object lists like "A, B et C")', () => {
    // A comma-separated object list is the natural way to take/drop several
    // things; the foreign-language path can't leave it to the LLM (the
    // single-command grammar can't express a 3-object take), so the comma
    // must split into separate clauses (verb-gapping fills the bare objects).
    expect(splitClauses('take the lamp, sword and key')).toEqual([
      'take the lamp',
      'sword',
      'key',
    ])
    expect(
      splitClauses('prends le charbon, le tournevis et la torche'),
    ).toEqual(['prends le charbon', 'le tournevis', 'la torche'])
  })

  it('absorbs an Oxford comma before the final conjunction', () => {
    // 'A, B, et C' — the comma immediately before 'et'/'and' must not leave a
    // dangling 'et la torche' clause.
    expect(
      splitClauses('prends le charbon, le tournevis, et la torche'),
    ).toEqual(['prends le charbon', 'le tournevis', 'la torche'])
    expect(splitClauses('take the lamp, the sword, and the key')).toEqual([
      'take the lamp',
      'the sword',
      'the key',
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

describe('distributePrepTail (shared container across same-verb conjuncts, UAT F16)', () => {
  const run = (line: string) =>
    distributePrepTail(
      fillElidedVerbs(splitClauses(line), DE_CORE, vocab),
      DE_CORE,
      vocab,
    )

  it('appends the trailing "in die Vitrine" to the earlier put-conjunct', () => {
    // "lege den schlüssel und das blatt in die vitrine" (key + leaflet → case)
    expect(run('lege den schlussel und das blatt in die vitrine')).toEqual([
      'lege den schlussel in die vitrine',
      'lege das blatt in die vitrine',
    ])
  })

  it('distributes to ALL preceding same-verb conjuncts (3-object list)', () => {
    expect(
      run('lege den schlussel, das blatt und das gitter in die vitrine'),
    ).toEqual([
      'lege den schlussel in die vitrine',
      'lege das blatt in die vitrine',
      'lege das gitter in die vitrine',
    ])
  })

  it('does NOT contaminate a genuine two-command line (different verbs)', () => {
    // "nimm den schlüssel und lege das blatt in die vitrine" — take, then put.
    // The take clause must NOT inherit the container.
    expect(run('nimm den schlussel und lege das blatt in die vitrine')).toEqual(
      ['nimm den schlussel', 'lege das blatt in die vitrine'],
    )
  })

  it('is a no-op when the last clause has no prep tail', () => {
    expect(run('nimm den schlussel und das blatt')).toEqual([
      'nimm den schlussel',
      'nimm das blatt',
    ])
  })

  it('is a no-op when the last clause is verbless/a direction', () => {
    expect(run('lege das blatt in die vitrine und geh nach norden')).toEqual([
      'lege das blatt in die vitrine',
      'geh nach norden',
    ])
  })

  it('leaves a single command untouched (degenerate case)', () => {
    expect(run('lege das blatt in die vitrine')).toEqual([
      'lege das blatt in die vitrine',
    ])
  })

  it('does NOT distribute a SOURCE prep tail (aus/von → "from") — review I1', () => {
    // "nimm das schwert und nimm den schlüssel aus der vitrine" — the second
    // clause takes FROM the case; that source must NOT be appended to the first
    // (else "take sword" is silently emitted as "take sword from case").
    expect(
      run('nimm das schwert und nimm den schlussel aus der vitrine'),
    ).toEqual([
      'nimm das schwert',
      'nimm den schlussel aus der vitrine',
    ])
  })

  it('does NOT append a destination to a clause that already has a container pronoun — review S1', () => {
    // "lege es hinein und lege das blatt in die vitrine" — the first clause's
    // "hinein" already supplies its destination; it must stay intact.
    expect(
      run('lege es hinein und lege das blatt in die vitrine'),
    ).toEqual([
      'lege es hinein',
      'lege das blatt in die vitrine',
    ])
  })
})

describe('fillElidedVerbs (verb-gapping across compound conjuncts)', () => {
  // UAT (French playthrough): "prends le couteau et la corde" split to
  // ["prends le couteau", "la corde"]; the verbless 2nd conjunct fell to the
  // LLM, which invented a verb ("move rope") instead of inheriting "take".
  it('inherits the previous clause verb for a verbless object conjunct', () => {
    expect(
      fillElidedVerbs(
        splitClauses('prends le couteau et la corde'),
        FR_CORE,
        vocab,
      ),
    ).toEqual(['prends le couteau', 'prends la corde'])
  })

  it('chains the inherited verb across several bare-object conjuncts', () => {
    expect(
      fillElidedVerbs(
        splitClauses('prends le couteau et la corde puis la lampe'),
        FR_CORE,
        vocab,
      ),
    ).toEqual(['prends le couteau', 'prends la corde', 'prends la lampe'])
  })

  it('does NOT borrow a verb for a conjunct that already has one', () => {
    expect(
      fillElidedVerbs(
        splitClauses("pose le couteau et prends l'épée"),
        FR_CORE,
        vocab,
      ),
    ).toEqual(['pose le couteau', "prends l'épée"])
  })

  it('does NOT borrow a verb for a bare direction conjunct', () => {
    expect(
      fillElidedVerbs(
        splitClauses('prends la lampe puis au nord'),
        FR_CORE,
        vocab,
      ),
    ).toEqual(['prends la lampe', 'au nord'])
  })

  it('does NOT borrow a verb for a localized meta conjunct', () => {
    expect(
      fillElidedVerbs(
        splitClauses('prends la lampe et inventaire'),
        FR_CORE,
        vocab,
      ),
    ).toEqual(['prends la lampe', 'inventaire'])
  })

  it('leaves a lone clause and the first clause untouched', () => {
    expect(
      fillElidedVerbs(splitClauses('ouvre la porte'), FR_CORE, vocab),
    ).toEqual(['ouvre la porte'])
  })

  it('does not gap when the first clause has no verb to lend', () => {
    // "va au nord" is a direction (no transitive verb to inherit), so the bare
    // object stays verbless and falls to the LLM as before.
    expect(
      fillElidedVerbs(splitClauses('va au nord et la lampe'), FR_CORE, vocab),
    ).toEqual(['va au nord', 'la lampe'])
  })

  it('gaps an article-led object via English vocab verbs (en mode, core=null)', () => {
    expect(fillElidedVerbs(['take key', 'the leaflet'], null, vocab)).toEqual([
      'take key',
      'take the leaflet',
    ])
  })

  it('does NOT gap a conjunct that carries its own (LLM-only) verb', () => {
    // "check inventory" has a verb the deterministic sets don't know, but it is
    // NOT article-led, so it must reach the LLM intact — never "look check
    // inventory". (Regression: an over-eager gap broke the compound here.)
    expect(fillElidedVerbs(['look', 'check inventory'], null, vocab)).toEqual([
      'look',
      'check inventory',
    ])
  })

  it('inherits a verbSynonym leading verb (en mode) — review I2', () => {
    // A verbSynonym is a real verb to verbArityOk/parseLexicon (the FR
    // "ulysse → ulysses" fix relies on it), so the gap side must recognise it
    // too — else "break the window and the door" leaves "the door" verbless and
    // an LLM invents a wrong verb.
    const v: Vocab = { ...vocab, verbSynonyms: ['break'] }
    expect(fillElidedVerbs(['break the window', 'the door'], null, v)).toEqual([
      'break the window',
      'break the door',
    ])
  })

  it('gaps a no-article foreign noun conjunct via the per-game noun lexicon (es)', () => {
    // UAT (Spanish playthrough): "coger ajo y destornillador" splits to
    // ["coger ajo", "destornillador"]. The bare, article-less 2nd conjunct is a
    // known game object, so it must inherit "coger" instead of falling to the
    // LLM (which invented a garbage "open cage"). Spanish drops the article in
    // such lists, so the article signal alone misses it — the noun lexicon does.
    const nouns: NounLexicon = {
      screwdriver: ['destornillador'],
      'clove of garlic': ['ajo'],
    }
    expect(
      fillElidedVerbs(
        splitClauses('coger ajo y destornillador'),
        ES_CORE,
        vocab,
        nouns,
      ),
    ).toEqual(['coger ajo', 'coger destornillador'])
  })

  it('gaps a no-article MULTIWORD foreign noun conjunct', () => {
    const nouns: NounLexicon = {
      'brass lantern': ['lampara'],
      wrench: ['llave inglesa'],
    }
    expect(
      fillElidedVerbs(
        splitClauses('coger lampara y llave inglesa'),
        ES_CORE,
        vocab,
        nouns,
      ),
    ).toEqual(['coger lampara', 'coger llave inglesa'])
  })

  it('does NOT gap a no-article conjunct that is not a known noun', () => {
    // Precision: only KNOWN game objects gap without an article. An unknown
    // bare word stays verbless and reaches the LLM — never "coger xyzzy".
    const nouns: NounLexicon = { 'clove of garlic': ['ajo'] }
    expect(
      fillElidedVerbs(splitClauses('coger ajo y xyzzy'), ES_CORE, vocab, nouns),
    ).toEqual(['coger ajo', 'xyzzy'])
  })
})

describe('clauseFailed', () => {
  const v: Vocab = { ...vocab, failurePat: FAILURE_PAT }

  // INVERTED for UAT F-G (NL v2 §10): "It is already open." is a SOFT no-op —
  // the action was already satisfied, so the compound plan is still on track
  // and must not be aborted. (This previously asserted true.)
  it('is false on a soft already-done no-op (F-G)', () => {
    expect(clauseFailed('It is already open.', v)).toBe(false)
  })

  it('is true on a hard refusal phrase (failurePat)', () => {
    expect(clauseFailed('The grating cannot be opened.', v)).toBe(true)
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

  it('flags a HARD pronoun refusal ("It cannot be…") for the acted object', () => {
    // The refusal sentence names no vocab noun → it is about the acted object.
    // (Was "It is already open." pre-F-G; that phrase is now a soft no-op, so
    // the pronoun-attribution semantics are pinned with a hard refusal.)
    expect(clauseFailed('It cannot be opened.', v, 'open grating')).toBe(true)
  })

  it('flags a refusal whose sentence names the acted object (review C8)', () => {
    expect(
      clauseFailed('The grating cannot be moved.', v, 'open grating'),
    ).toBe(true)
  })

  it('ignores a refusal about an UNRELATED object (review C8)', () => {
    // A turn whose output refuses something else ("The grating cannot be
    // moved.") must not truncate a sequence whose own action succeeded —
    // the same asymmetry the F2/R3 absence scoping fixed.
    expect(
      clauseFailed(
        'You pick up the leaflet.\nThe grating cannot be moved.',
        v,
        'take leaflet',
      ),
    ).toBe(false)
  })

  it('keeps the blanket refusal behavior when no command is given', () => {
    expect(clauseFailed('The grating cannot be moved.', v)).toBe(true)
  })
})

describe('clauseFailed — soft no-ops (F-G)', () => {
  const v: Vocab = { ...vocab, failurePat: FAILURE_PAT }

  it('a soft no-op about the acted object does NOT fail the clause', () => {
    expect(clauseFailed('It is already open.', v, 'open mailbox')).toBe(false)
  })

  it('a hard refusal still fails the clause', () => {
    expect(
      clauseFailed('The mailbox cannot be opened.', v, 'open mailbox'),
    ).toBe(true)
  })

  it('absence still fails the clause', () => {
    expect(clauseFailed('There is no mailbox here.', v, 'open mailbox')).toBe(
      true,
    )
  })

  it('a hard refusal elsewhere in the SAME output still registers', () => {
    expect(
      clauseFailed(
        'It is already open. It cannot be opened.',
        v,
        'open mailbox',
      ),
    ).toBe(true)
  })

  it("the tracker's antecedent gate is unaffected (refusalApplies still true)", () => {
    // The scene tracker deliberately uses refusalApplies WITHOUT the soft-noop
    // filter: a no-op turn must still not promote its object to the antecedent.
    expect(refusalApplies('It is already open.', v, 'open mailbox')).toBe(true)
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

describe('unquote (stage 2 — quoted escape hatch)', () => {
  it.each([
    ['"open mailbox"', 'open mailbox'],
    ['« ouvre la boîte »', 'ouvre la boîte'],
    ['„öffne die Tür“', 'öffne die Tür'],
    ['“open mailbox”', 'open mailbox'],
  ])('%s → %s', (line, want) => {
    expect(unquote(line)).toBe(want)
  })
  it('returns null unless the ENTIRE line is one quoted string', () => {
    expect(unquote('say "hello"')).toBeNull()
    expect(unquote('open mailbox')).toBeNull()
    expect(unquote('""')).toBeNull()
  })
})

describe('isVocabPassthrough (stage 4 + collision guard)', () => {
  // The suite vocab, minimally extended for this block: a verb synonym
  // ("ulysses", a gsyntax SYNONYM member) and a noun whose dictionary words
  // include an adjective — the passthrough set draws on both.
  const pvVocab: Vocab = {
    ...vocab,
    verbSynonyms: ['ulysses'],
    nouns: [
      ...vocab.nouns,
      {
        canonical: 'small mailbox',
        emit: 'mailbox',
        synonyms: ['mailbox'],
        adjectives: ['small'],
      },
    ],
  }
  it('passes a line whose every word the parser knows (magic words, literal English)', () => {
    expect(isVocabPassthrough('open the small mailbox', pvVocab, null)).toBe(
      true,
    )
    expect(isVocabPassthrough('ulysses', pvVocab, null)).toBe(true)
  })
  it('rejects a line with any unknown word', () => {
    expect(isVocabPassthrough('open the zeppelin', pvVocab, null)).toBe(false)
    expect(isVocabPassthrough('take it', pvVocab, null)).toBe(false) // pronouns go to the LLM
  })
  it('collision guard: an active-language lexicon word never passes through', () => {
    const lexWords = new Set(['sale']) // imagine fr word colliding with a vocab word
    const collided: Vocab = {
      ...pvVocab,
      verbsOnly: [...pvVocab.verbsOnly, 'sale'],
    }
    expect(isVocabPassthrough('sale', collided, lexWords)).toBe(false)
    expect(isVocabPassthrough('sale', collided, null)).toBe(true)
  })
  it('tolerates terminal punctuation and case', () => {
    expect(isVocabPassthrough('Open the small mailbox!', pvVocab, null)).toBe(
      true,
    )
  })
})
