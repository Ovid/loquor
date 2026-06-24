// src/llm/lexicon/ka.core.test.ts
import { describe, it, expect } from 'vitest'
import { KA_CORE } from './ka.core'

describe('KA_CORE', () => {
  it('maps core walkthrough imperatives to canonical verbs', () => {
    expect(KA_CORE.verbs['აიღე']).toBe('take') // take/get
    expect(KA_CORE.verbs['გააღე']).toBe('open')
  })
  it('postpositions are merged into preps (the §3.1 merge)', () => {
    for (const [suf, prep] of Object.entries(KA_CORE.postpositions ?? {}))
      expect(KA_CORE.preps[suf]).toBe(prep)
  })
  it('has no articles and empty pronoun arrays', () => {
    expect(KA_CORE.articles).toEqual([])
    expect(KA_CORE.pronounsDirect).toEqual([])
  })
})
