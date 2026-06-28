import { describe, it, expect } from 'vitest'
import { OUTPUT_ONLY_LANGS } from './types'
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
