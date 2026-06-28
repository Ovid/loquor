import { describe, it, expect } from 'vitest'
import { NL_LANGUAGES, OUTPUT_ONLY_LANGS } from './types'
import { LEX_LANGS, INPUT_LEX_LANGS } from './lexicon/types'
import { CORPUS_ONLY_LANGS } from '../translate/corpus/index'

describe('OUTPUT_ONLY_LANGS (Phase 1: output corpus, no input support yet)', () => {
  it('contains ka and not the fully-supported input languages', () => {
    expect(OUTPUT_ONLY_LANGS.has('ka')).toBe(true)
    expect(OUTPUT_ONLY_LANGS.has('fr')).toBe(false)
    expect(OUTPUT_ONLY_LANGS.has('de')).toBe(false)
    expect(OUTPUT_ONLY_LANGS.has('es')).toBe(false)
  })

  // The two sets are independent (input layer vs output layer) but a
  // corpus-only output language MUST also be input-output-only — otherwise its
  // input path would reach an LLM that can't produce the language (review S3).
  // Subset, not equality: Phase 2 could add an input-only language to neither.
  it('is a superset of CORPUS_ONLY_LANGS', () => {
    for (const l of CORPUS_ONLY_LANGS)
      expect(OUTPUT_ONLY_LANGS.has(l), l).toBe(true)
  })
})

// Pin CORPUS_ONLY_LANGS membership DIRECTLY, not only via the superset loop
// above (which passes vacuously if the set were ever empty). Guards the F-a
// refactor that makes these sets derive from the lexicon membership arrays.
describe('CORPUS_ONLY_LANGS (output: no LLM fallback)', () => {
  it('contains ka and not the fully-supported input languages', () => {
    expect(CORPUS_ONLY_LANGS.has('ka')).toBe(true)
    expect(CORPUS_ONLY_LANGS.has('fr')).toBe(false)
    expect(CORPUS_ONLY_LANGS.has('de')).toBe(false)
    expect(CORPUS_ONLY_LANGS.has('es')).toBe(false)
  })
})

// F-a anchor: language identity is declared ONCE (the LEX_LANGS / INPUT_LEX_LANGS
// membership arrays) and every other structure derives from or is checked against
// it. These assertions make "a fix in one language is a fix in all" executable:
// adding a member to NL_LANGUAGES without classifying it everywhere fails here.
describe('language membership coherence (F-a anchor)', () => {
  const inLex = (l: string) => (LEX_LANGS as readonly string[]).includes(l)

  it('every active non-English language is exactly one of full-LLM (LexLang) or no-LLM (OUTPUT_ONLY)', () => {
    for (const l of NL_LANGUAGES) {
      if (l === 'off' || l === 'en') continue
      // XOR — classified exactly once. A new NL language that is neither a
      // LexLang nor OUTPUT_ONLY (forgot to classify) fails; one that is both
      // (contradiction) fails too.
      expect(
        inLex(l) !== OUTPUT_ONLY_LANGS.has(l),
        `${l} must be exactly one of LexLang / OUTPUT_ONLY_LANGS`,
      ).toBe(true)
    }
  })

  it('INPUT_LEX_LANGS = LEX_LANGS ∪ OUTPUT_ONLY_LANGS', () => {
    expect([...INPUT_LEX_LANGS].sort()).toEqual(
      [...LEX_LANGS, ...OUTPUT_ONLY_LANGS].sort(),
    )
  })

  it('a corpus-only output language is never a full-LLM (LexLang) language', () => {
    for (const l of CORPUS_ONLY_LANGS) expect(inLex(l), l).toBe(false)
  })

  it("pins today's membership: ka is the sole no-LLM / corpus-only language", () => {
    expect([...LEX_LANGS]).toEqual(['fr', 'de', 'es'])
    expect([...OUTPUT_ONLY_LANGS]).toEqual(['ka'])
    expect([...CORPUS_ONLY_LANGS]).toEqual(['ka'])
  })
})
