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
import type { LexLang } from './types'
import type { Vocab } from '../grammar/types'

const GAMES: [string, Vocab][] = [
  [ZORK1_SIG, ZORK1_VOCAB],
  [ZORK2_SIG, ZORK2_VOCAB],
  [ZORK3_SIG, ZORK3_VOCAB],
]
const LANGS: LexLang[] = ['fr', 'de', 'es']

describe('lexicon build-time validation (spec §5.2)', () => {
  it('coreLexicon returns the core for every language', () => {
    for (const lang of LANGS) expect(coreLexicon(lang)).toBeTruthy()
  })
  it('every noun-lexicon key is a vocab canonical (unknown key = build error)', () => {
    for (const lang of LANGS)
      for (const [sig, vocab] of GAMES) {
        const lex = nounLexicon(lang, sig)
        expect(lex).not.toBeNull()
        const canonicals = new Set(vocab.nouns.map(n => n.canonical))
        const unknown = Object.keys(lex!).filter(k => !canonicals.has(k))
        expect(unknown, `${lang}/${sig.slice(0, 8)} unknown keys`).toEqual([])
      }
  })
  // DEVIATION from the plan's per-language list: noun lexicons are per-game,
  // so KNOWN_COLLISIONS is keyed (language, signature) — see lexicon/index.ts.
  it('collisions between lexicon words and game vocab match KNOWN_COLLISIONS exactly', () => {
    for (const lang of LANGS)
      for (const [sig, vocab] of GAMES) {
        const overlap = [...lexiconWordSet(lang, sig)]
          .filter(w => vocabWordSet(vocab).has(w))
          .sort()
        expect(overlap, `${lang}/${sig.slice(0, 8)}`).toEqual(
          [...(KNOWN_COLLISIONS[lang]?.[sig] ?? [])].sort(),
        )
      }
  })
  it('lookup returns null for an unknown signature', () => {
    expect(nounLexicon('fr', 'no-such-sig')).toBeNull()
  })
})
