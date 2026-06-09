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
import { vocabWordSet } from '../translate'
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

describe('coverage (spec §5.2 — every vocab noun has an entry per language)', () => {
  // Tasks 11/12 append the de/es rows to this table.
  it.each([
    ['fr', ZORK1_SIG, ZORK1_VOCAB, 'zork1'],
    ['fr', ZORK2_SIG, ZORK2_VOCAB, 'zork2'],
    ['fr', ZORK3_SIG, ZORK3_VOCAB, 'zork3'],
  ] as const)('%s covers %s (#%#)', (lang, sig, vocab, _name) => {
    const lex = nounLexicon(lang as LexLang, sig)!
    const missing = vocab.nouns.map(n => n.canonical).filter(c => !(c in lex))
    expect(missing).toEqual([])
  })
})
