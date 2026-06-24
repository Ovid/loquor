import { describe, it, expect } from 'vitest'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import { ZORK2_VOCAB } from '../grammar/zork2.vocab'
import { ZORK3_VOCAB } from '../grammar/zork3.vocab'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../grammar/index'
import {
  coreLexicon,
  nounLexicon,
  lexiconWordSet,
  KNOWN_COLLISIONS,
} from './index'
import { vocabWordSet } from '../inputTranslate'
import { fold } from './fold'
import type { LexLang } from './types'
import type { Vocab } from '../grammar/types'

const GAMES: [string, string, Vocab][] = [
  ['zork1', ZORK1_SIG, ZORK1_VOCAB],
  ['zork2', ZORK2_SIG, ZORK2_VOCAB],
  ['zork3', ZORK3_SIG, ZORK3_VOCAB],
]
const LANGS: LexLang[] = ['fr', 'de', 'es']

describe('lexicon build-time validation (spec §5.2)', () => {
  it('coreLexicon returns the core for every language', () => {
    for (const lang of LANGS) expect(coreLexicon(lang)).toBeTruthy()
  })
  it('every noun-lexicon key is a vocab canonical (unknown key = build error)', () => {
    for (const lang of LANGS)
      for (const [name, sig, vocab] of GAMES) {
        const lex = nounLexicon(lang, sig)
        expect(lex).not.toBeNull()
        const canonicals = new Set(vocab.nouns.map(n => n.canonical))
        const unknown = Object.keys(lex!).filter(k => !canonicals.has(k))
        expect(unknown, `${lang}/${name} unknown keys`).toEqual([])
      }
  })
  // VALUES only: keys are English vocab canonicals and legitimately contain
  // hyphens ('jewel-encrusted egg'), so a fold-idempotence gate on keys would
  // false-positive.
  it('every noun-lexicon VALUE is fold-idempotent (stored pre-folded)', () => {
    for (const lang of LANGS)
      for (const [name, sig] of GAMES) {
        const lex = nounLexicon(lang, sig)
        expect(lex).not.toBeNull()
        for (const [canonical, words] of Object.entries(lex!))
          for (const w of words)
            expect(fold(w), `${lang}/${name} '${canonical}' → '${w}'`).toBe(w)
      }
  })
  // DEVIATION from the plan's per-language list: noun lexicons are per-game,
  // so KNOWN_COLLISIONS is keyed (language, signature) — see lexicon/index.ts.
  it('collisions between lexicon words and game vocab match KNOWN_COLLISIONS exactly', () => {
    for (const lang of LANGS)
      for (const [name, sig, vocab] of GAMES) {
        const overlap = [...lexiconWordSet(lang, sig)]
          .filter(w => vocabWordSet(vocab).has(w))
          .sort()
        expect(overlap, `${lang}/${name}`).toEqual(
          [...(KNOWN_COLLISIONS[lang][sig] ?? [])].sort(),
        )
      }
  })
  it('lookup returns null for an unknown signature', () => {
    expect(nounLexicon('fr', 'no-such-sig')).toBeNull()
  })
})

// Language/game pairs whose noun lexicon is FULLY authored. Task 12 appends
// the es rows. Shared by the coverage gate and the canonical-order gate.
const COVERED = [
  { lang: 'fr', sig: ZORK1_SIG, vocab: ZORK1_VOCAB, name: 'zork1' },
  { lang: 'fr', sig: ZORK2_SIG, vocab: ZORK2_VOCAB, name: 'zork2' },
  { lang: 'fr', sig: ZORK3_SIG, vocab: ZORK3_VOCAB, name: 'zork3' },
  { lang: 'de', sig: ZORK1_SIG, vocab: ZORK1_VOCAB, name: 'zork1' },
  { lang: 'de', sig: ZORK2_SIG, vocab: ZORK2_VOCAB, name: 'zork2' },
  { lang: 'de', sig: ZORK3_SIG, vocab: ZORK3_VOCAB, name: 'zork3' },
  { lang: 'es', sig: ZORK1_SIG, vocab: ZORK1_VOCAB, name: 'zork1' },
  { lang: 'es', sig: ZORK2_SIG, vocab: ZORK2_VOCAB, name: 'zork2' },
  { lang: 'es', sig: ZORK3_SIG, vocab: ZORK3_VOCAB, name: 'zork3' },
] as const

describe('coverage (spec §5.2 — every vocab noun has an entry per language)', () => {
  it.each(COVERED)('$lang covers $name', ({ lang, sig, vocab }) => {
    const lex = nounLexicon(lang, sig)
    expect(lex).not.toBeNull()
    const missing = vocab.nouns.map(n => n.canonical).filter(c => !(c in lex!))
    expect(missing).toEqual([])
  })
  // The lexicon headers promise vocab-canonical entry order; enforce it so the
  // files stay navigable side-by-side with the vocab and with each other.
  it.each(COVERED)(
    '$lang/$name keys follow the vocab canonical order',
    ({ lang, sig, vocab }) => {
      const lex = nounLexicon(lang, sig)
      expect(lex).not.toBeNull()
      expect(Object.keys(lex!)).toEqual(
        vocab.nouns.map(n => n.canonical).filter(c => c in lex!),
      )
    },
  )
})

// Georgian (ka) is INPUT-side Zork I only (spec §6 / §1): it has no Zork II/III
// noun lexicon, so it CANNOT join the GAMES×LANGS loops above (they assert a
// non-null lexicon for all three games). This dedicated block is ka's
// structural-correctness gate: verb targets resolve to real vocab, prep targets
// are real preps, noun keys are real canonicals, every stored form is
// pre-folded, and no accidental English collision exists. The completeness bars
// (corpus round-trip + walkthrough parse) live in their own gates, NOT here, so
// ka is deliberately ABSENT from the full-vocab COVERED block.
describe('ka lexicon validation (Zork I only — spec §6)', () => {
  const core = coreLexicon('ka')
  const lex = nounLexicon('ka', ZORK1_SIG)!
  const allVerbs = new Set([
    ...ZORK1_VOCAB.verbsOnly,
    ...ZORK1_VOCAB.verbs1,
    ...ZORK1_VOCAB.verbs2,
    ...ZORK1_VOCAB.movement,
    ...ZORK1_VOCAB.verbSynonyms,
  ])
  // The Z-machine truncates dictionary words to 6 chars; the vocab stores the
  // truncated form (e.g. 'inflat'), so a target matches exactly OR by 6-prefix.
  const inV = (t: string, s: ReadonlySet<string>) =>
    s.has(t) || s.has(t.slice(0, 6))

  it('every mapped verb target exists in Zork I vocab', () => {
    const targets = [
      ...Object.values(core.verbs),
      ...core.verbIdioms.map(v => v.to),
    ]
    expect(targets.filter(t => !inV(t, allVerbs))).toEqual([])
  })
  // The verb KEYS are the Georgian imperatives a player types: each must be a
  // real fold-stable form. A '_'-placeholder key (Task 4 deferred two here) is
  // not a typeable Georgian word — lexiconWordSet would index it as one bogus
  // token — so this assertion is the forcing function that surfaces them.
  it('every verb/idiom KEY is fold-idempotent and placeholder-free', () => {
    const keys = [...Object.keys(core.verbs), ...core.verbIdioms.map(v => v.phrase)]
    expect(keys.filter(k => k.includes('_'))).toEqual([])
    for (const k of keys) expect(fold(k), `key ${k}`).toBe(k)
  })
  it('every prep/postposition target is a Zork I vocab prep', () => {
    const preps = new Set(ZORK1_VOCAB.preps)
    expect(Object.values(core.preps).filter(p => !preps.has(p))).toEqual([])
  })
  it('every noun-lexicon key is a Zork I vocab canonical', () => {
    const canon = new Set(ZORK1_VOCAB.nouns.map(n => n.canonical))
    expect(Object.keys(lex).filter(k => !canon.has(k))).toEqual([])
  })
  it('every noun-lexicon VALUE is fold-idempotent (stored pre-folded)', () => {
    for (const [c, words] of Object.entries(lex))
      for (const w of words) expect(fold(w), `${c} → ${w}`).toBe(w)
  })
  it('collisions with English vocab match KNOWN_COLLISIONS.ka (expected [])', () => {
    const overlap = [...lexiconWordSet('ka', ZORK1_SIG)]
      .filter(w => vocabWordSet(ZORK1_VOCAB).has(w))
      .sort()
    expect(overlap).toEqual([...(KNOWN_COLLISIONS.ka[ZORK1_SIG] ?? [])].sort())
  })
})
