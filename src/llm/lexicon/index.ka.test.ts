// src/llm/lexicon/index.ka.test.ts
import { describe, it, expect } from 'vitest'
import { coreLexicon, nounLexicon, kaInputActive } from './index'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../grammar/index'

describe('ka lexicon lookup (Zork I only)', () => {
  it('coreLexicon("ka") returns KA_CORE', () => {
    expect(coreLexicon('ka').postpositions).toBeDefined()
  })
  it('nounLexicon("ka", ZORK1_SIG) is non-null; Zork II is null', () => {
    expect(nounLexicon('ka', ZORK1_SIG)).not.toBeNull()
    expect(nounLexicon('ka', ZORK2_SIG)).toBeNull()
  })
  it('kaInputActive is true only for ka on a game with a ka noun lexicon', () => {
    expect(kaInputActive('ka', ZORK1_SIG)).toBe(true)
    expect(kaInputActive('ka', ZORK2_SIG)).toBe(false)
    expect(kaInputActive('ka', ZORK3_SIG)).toBe(false) // auto-tracks NOUNS.ka
    expect(kaInputActive('fr', ZORK1_SIG)).toBe(false)
    expect(kaInputActive('off', ZORK1_SIG)).toBe(false)
  })
})
