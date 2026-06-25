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
import { ES_ZORK1 } from './lexicon/es.zork1'
import type { Vocab } from './grammar/types'
import type { NounLexicon } from './lexicon/types'
import { ZORK1_VOCAB } from './grammar/zork1.vocab'
import { ZORK2_VOCAB } from './grammar/zork2.vocab'
import { ZORK3_VOCAB } from './grammar/zork3.vocab'
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

  it('accepts an emitted scenery object so it is not dropped to "look" (BUG G)', () => {
    // Room PSEUDO scenery the grammar can now emit must validate here too, or the
    // model's "examine chain" gets rejected → abstain → the player's command is
    // silently lost (this is the mechanism behind the look-mangle).
    const sc: Vocab = { ...vocab, scenery: ['chain'] }
    expect(parseCommand('{"verb":"open","object":"chain"}', sc)).toEqual({
      kind: 'command',
      text: 'open chain',
    })
    // Without scenery the unknown noun is rejected — the pre-fix behavior.
    expect(parseCommand('{"verb":"open","object":"chain"}', vocab)).toEqual({
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

  it('extracts the JSON from fenced / preamble-wrapped output (review S10)', () => {
    expect(
      parseCommand('```json\n{"verb":"take","object":"leaflet"}\n```', vocab),
    ).toEqual({ kind: 'command', text: 'take leaflet' })
    expect(
      parseCommand('Sure! {"verb":"look"} is the command.', vocab),
    ).toEqual({ kind: 'command', text: 'look' })
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

  // ENGLISH-ONLY by design: recentOutput is the English source, never the
  // localized display (proof: useOutputTranslation.test.tsx). A localized prompt
  // must NOT match — guards against re-adding dead per-language clauses.
  it('does NOT match LOCALIZED display prompts (detection runs on English source)', () => {
    for (const p of [
      'Möchtest du neu beginnen? (J bedeutet ja):',
      'Voulez-vous recommencer ? (O pour oui) :',
      '¿Quieres reiniciar? (S para sí):',
    ])
      expect(isConfirmationPrompt(p)).toBe(false)
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

  it('accepts common colloquial affirmatives/negatives (review S9)', () => {
    expect(confirmationReply('jawohl', 'de')).toBe('y')
    expect(confirmationReply('ouais', 'fr')).toBe('y')
    expect(confirmationReply('claro', 'es')).toBe('y')
    expect(confirmationReply('vale', 'es')).toBe('y')
    expect(confirmationReply('nee', 'de')).toBe('n')
    expect(confirmationReply('nan', 'fr')).toBe('n')
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

  it('does NOT fire on prose that merely contains "which", nor on LOCALIZED display', () => {
    for (const p of [
      'The leaflet, which you can read, welcomes you to Zork.',
      'You are standing in an open field west of a white house.',
      // ENGLISH-ONLY: localized disambiguation renderings never reach the detector.
      'Welches Buch meinst du, das schwarze Buch oder das blaue Buch?',
      'De quel livre parlez-vous, le livre noir ou le guide touristique ?',
      '¿A qué libro te refieres, el libro negro o la guía turística?',
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

  it('does NOT fire on ordinary output, nor on LOCALIZED display', () => {
    for (const p of [
      'You put the coffin in the trophy case.',
      'It is pitch black. You are likely to be eaten by a grue.',
      // ENGLISH-ONLY: localized orphan renderings never reach the detector.
      'Was willst du mit dem Schädel tun?',
      '¿Qué quieres poner la cera?',
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

  it('splits on Georgian "და" (Phase-2 ka compounds)', () => {
    // `აიღე ფარანი და წადი ჩრდილოეთით` = "take the lamp and go north".
    expect(splitClauses('აიღე ფარანი და წადი ჩრდილოეთით')).toEqual([
      'აიღე ფარანი',
      'წადი ჩრდილოეთით',
    ])
    // `და` is whitespace-wrapped: an object name with no standalone `და` token
    // (e.g. the genitive `მონეტების ...`) is never split.
    expect(splitClauses('აიღე მონეტების ტყავის ტომარა')).toEqual([
      'აიღე მონეტების ტყავის ტომარა',
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
    ).toEqual(['nimm das schwert', 'nimm den schlussel aus der vitrine'])
  })

  it('does NOT append a destination to a clause that already has a container pronoun — review S1', () => {
    // "lege es hinein und lege das blatt in die vitrine" — the first clause's
    // "hinein" already supplies its destination; it must stay intact.
    expect(run('lege es hinein und lege das blatt in die vitrine')).toEqual([
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
    // S8: trailing sentence punctuation after the close quote (autocorrect).
    ['"open mailbox".', 'open mailbox'],
    ['« ouvre la boîte » !', 'ouvre la boîte'],
    // S8: a mixed straight/curly pair (autocorrect swapped one quote).
    ['"open mailbox”', 'open mailbox'],
    ['“open mailbox"', 'open mailbox'],
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
  it('passes a line whose noun is a room PSEUDO scenery word (BUG G)', () => {
    const sc: Vocab = { ...pvVocab, scenery: ['chain'] }
    expect(isVocabPassthrough('open the chain', sc, null)).toBe(true)
    // Without scenery the unknown noun routes to the LLM (the pre-fix leak).
    expect(isVocabPassthrough('open the chain', pvVocab, null)).toBe(false)
  })
  // The v3 Z-parser truncates BOTH dictionary words and player input to 6 chars
  // before matching, so a vocab stored in its truncated form must still accept the
  // full word a player types. Mirrors parse.ts hasVerbForm / roundtrip.ts. Without
  // this, a source-truncated ZIL verb head (the original BUG C: gsyntax 'INFLAT' vs
  // typed 'inflate') silently leaks past stage-4 passthrough into the LLM.
  it('truncation-aware: a >6-char token matches a 6-char-truncated vocab entry', () => {
    // truncVocab holds only the truncated 'inflat' (no full 'inflate').
    const truncVocab: Vocab = {
      ...pvVocab,
      verbs2: [...pvVocab.verbs2, 'inflat'],
    }
    expect(
      isVocabPassthrough('inflate the small mailbox', truncVocab, null),
    ).toBe(true)
  })
  it('truncation widening does not over-match an unknown long word', () => {
    // 'zeppelinesque'[:6] = 'zeppel' is in no vocab field → still rejected.
    expect(
      isVocabPassthrough('zeppelinesque the small mailbox', pvVocab, null),
    ).toBe(false)
  })
})

// Task 8b: pin es conjoined+trailing-prep distribution (spec N3 coverage).
// "mete la antorcha y el destornillador en la cesta" must distribute
// "en la cesta" across both put-conjuncts, driving the full
// splitClauses → fillElidedVerbs → distributePrepTail pipeline.
describe('es conjoined+trailing-prep distribution (spec N3)', () => {
  it('es conjoined+prep: distributes the destination across conjuncts', () => {
    const line = 'mete la antorcha y el destornillador en la cesta'
    const dist = distributePrepTail(
      fillElidedVerbs(splitClauses(line), ES_CORE, ZORK1_VOCAB, ES_ZORK1),
      ES_CORE,
      ZORK1_VOCAB,
    )
    expect(dist).toEqual([
      'mete la antorcha en la cesta',
      'mete el destornillador en la cesta',
    ])
  })
})

// Task 8: pin that every escape command the P3 signpost advertises clears the
// quoted-English passthrough gate against the real Zork I vocab. These are the
// commands shown to the player as "quote it verbatim" escapes, so each must
// survive unquote → isVocabPassthrough. Regression net for the n.emit omission
// in vocabWordSet ('thief' is the thief noun's emit, not a synonym).
// Root-cause net: a noun's CANONICAL (the DESC word the game prints for the
// object — "reveals a leaflet") is a word the parser knows and the player will
// naturally type, but the generator filters it out of `synonyms` and the emit
// may be a different synonym ('advertisement'), so the canonical landed in NO
// vocab field. vocabWordSet must include single-token canonicals or "take the
// leaflet" misses every deterministic stage and the LLM mangles it ("leaves").
describe('canonical (DESC) words pass the vocab gate (Zork I)', () => {
  it('passes a command using a noun’s displayed canonical word ("leaflet")', () => {
    // Guard the real-data shape: emit is 'advertisement', synonyms exclude
    // 'leaflet', so only adding the canonical to the word set makes this pass.
    expect(isVocabPassthrough('take the leaflet', ZORK1_VOCAB, null)).toBe(true)
  })
})

// BUG C (UAT 2026-06-22): the two-object verb 'inflate' appears in zork1/gsyntax.zil
// as the v3 dictionary-truncated SYNTAX atom (<SYNTAX INFLAT OBJECT WITH OBJECT …>) —
// the LONE truncated verb head (DEFLATE/EXTINGUISH/LAUNCH are full). The extractor
// copied it verbatim, so verbs2 held 'inflat', and the English passthrough gate
// exact-matches the typed 'inflate' against 'inflat', misses, and routes every inflate
// command to the warm LLM, which mangles it ('inflate plastic with pump' → 'turn on
// pump') and BREAKS the magic-boat puzzle (in grammar-only mode it would raw-send and
// work — the warm-LLM trap). The 'inflat' ADJECTIVE on the boat object is a real
// truncated dictionary word and is unaffected. Fix: the extractor de-truncates the
// verb head to the in-game spelling 'inflate' the Z-parser accepts.
describe('inflate verb passes the vocab gate (Zork I) — BUG C', () => {
  it.each(['inflate plastic with pump', 'inflate the boat with the pump'])(
    '%s clears the vocab gate (raw-sends, not the LLM)',
    cmd => {
      expect(isVocabPassthrough(cmd, ZORK1_VOCAB, null)).toBe(true)
    },
  )
})

// PREPOSITION SYNONYMS (UAT 2026-06-22, same class as BUG C): gsyntax.zil declares
// each canonical prep WITH its synonyms — <SYNONYM IN INSIDE INTO>, <SYNONYM ON ONTO>,
// <SYNONYM UNDER UNDERNEATH BENEATH BELOW>, <SYNONYM WITH USING THROUGH THRU>. The
// extractor kept only the canonical HEAD (in/on/under/with) and dropped the members,
// so the English vocab-passthrough gate missed the literal word a player types and
// routed e.g. 'put painting into case' to the warm LLM, which mangled it ('take
// painting'; 'look underneath rug' → 'look'). The Z-parser accepts the synonyms
// natively, so raw-sending them is correct. Identical gap in Zork I/II/III (shared
// generic SYNTAX file). Fix: zil.mjs retains the prep-block synonym members in `preps`.
describe('preposition synonyms pass the vocab gate (Zork I)', () => {
  it.each([
    'put painting into case', // IN → into (was LLM-mangled to "take painting")
    'put painting inside case', // IN → inside
    'put coal onto machine', // ON → onto
    'look underneath rug', // UNDER → underneath (was LLM-mangled to "look")
    'look beneath rug', // UNDER → beneath
    'look below rug', // UNDER → below
    'attack troll using sword', // WITH → using
    'look through window', // WITH → through
    'look thru window', // WITH → thru
  ])('%s clears the vocab gate (raw-sends, not the LLM)', cmd => {
    expect(isVocabPassthrough(cmd, ZORK1_VOCAB, null)).toBe(true)
  })
})

describe('preposition synonyms are present in every game vocab (parity)', () => {
  const PREP_SYNONYMS = [
    'inside',
    'into',
    'onto',
    'underneath',
    'beneath',
    'below',
    'using',
    'through',
    'thru',
  ]
  it.each([
    ['Zork I', ZORK1_VOCAB],
    ['Zork II', ZORK2_VOCAB],
    ['Zork III', ZORK3_VOCAB],
  ] as const)('%s preps include every synonym', (_label, vocab) => {
    for (const syn of PREP_SYNONYMS) expect(vocab.preps).toContain(syn)
  })
})

// BUG E (UAT 2026-06-22, same class as BUG C/D): the Z-parser's BUZZ noise words
// (zork1/gsyntax.zil:11 — <BUZZ A AN THE IS AND OF THEN ALL ONE BUT EXCEPT \. \,
// \" YES NO Y HERE>, identical in Zork I/II/III) are *ignored* during parsing, so
// the game's own multi-word object NAMES embed them: "a pot of gold", "a clove of
// garlic", "a small pile of coal", "a pair of candles", "a trunk of jewels", "a
// leather bag of coins", "a large coil of rope". A player reading those very
// descriptions and typing them verbatim is the most natural phrasing there is — but
// vocabWordSet only seeded the/a/an, so the noise word "of" missed the gate and
// routed every "X of Y" command to the warm LLM (browser-confirmed stage:"llm":
// "take the pot of gold" → "take pot" this run, but LLM-nondeterministic — the same
// lottery as BUG A/C/D). In grammar-only mode they raw-send and work; it is the warm
// LLM that breaks them. Fix: seed vocabWordSet with the BUZZ noise words the parser
// ignores. Conjunctions (and/then) are consumed upstream by splitClauses, the
// quantifier "all" by the quantifier path, and yes/no/y by the confirmation path —
// those are excluded so their dedicated paths stay authoritative; the remainder
// (of/is/one/but/except/here) are pure noise words it is always safe to raw-send.
describe('BUZZ noise words pass the vocab gate — "X of Y" object names (Zork I)', () => {
  it.each([
    'take the pot of gold',
    'take the clove of garlic',
    'take the small pile of coal',
    'take the pair of candles',
    'take the trunk of jewels',
    'take the leather bag of coins',
    'take the large coil of rope',
  ])('%s clears the vocab gate (raw-sends, not the LLM)', cmd => {
    expect(isVocabPassthrough(cmd, ZORK1_VOCAB, null)).toBe(true)
  })

  it('still rejects a command with a genuinely unknown word (no over-match)', () => {
    // The noise word is permissive ONLY in combination with real game words;
    // an unknown noun still fails the gate and falls through to the LLM.
    expect(
      isVocabPassthrough('take the pot of zeppelin', ZORK1_VOCAB, null),
    ).toBe(false)
  })
})

// BUG G (UAT 2026-06-23, same class as BUG C/D/E): room-level (PSEUDO "WORD" FUNC)
// scenery (chain/dome/chasm/stream/gas/lake/nail(s)/odor/paint) names words the
// Z-parser recognizes but that have NO <OBJECT>. extractNouns reads only <OBJECT>
// forms, so these missed both the gate AND the grammar — and the warm LLM, unable
// to emit a noun absent from its constrained grammar, DROPPED the object and
// mangled "examine the iron chain" → "look" (browser-confirmed twice, stage:"llm",
// {"verb":"look"} — a clean room redraw masking the lost command, the BUG C trap).
// Fix: extractScenery feeds these words to vocabWordSet + buildGrammar + parseCommand.
describe('room PSEUDO scenery passes the vocab gate (Zork I) — BUG G', () => {
  it.each([
    'examine the chain',
    'examine the dome',
    'examine the stream',
    'examine the chasm',
  ])('%s clears the vocab gate (raw-sends, not the LLM)', cmd => {
    expect(isVocabPassthrough(cmd, ZORK1_VOCAB, null)).toBe(true)
  })

  it('an emitted scenery object validates (not dropped to abstain → "look")', () => {
    expect(
      parseCommand('{"verb":"examine","object":"chain"}', ZORK1_VOCAB),
    ).toEqual({ kind: 'command', text: 'examine chain' })
  })
})

describe('P3 signpost escape commands pass the vocab gate (Zork I)', () => {
  it.each([
    '"wind up canary"',
    '"enter boat"',
    '"launch"',
    '"echo"',
    '"kill thief with knife"',
  ])('%s clears unquote → isVocabPassthrough', quoted => {
    const inner = unquote(quoted)
    expect(inner).not.toBeNull()
    expect(isVocabPassthrough(inner!, ZORK1_VOCAB, null)).toBe(true)
  })
})
