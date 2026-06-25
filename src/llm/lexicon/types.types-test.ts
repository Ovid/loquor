// Compile-time shape guard for the Phase-2 type additions (spec §3.1, §5.1).
import { describe, it, expect } from 'vitest'
import type { CoreLexicon, InputLexLang, LexLang } from './types'

describe('Phase-2 lexicon types', () => {
  it('InputLexLang includes ka and is a superset of LexLang', () => {
    const fr: LexLang = 'fr'
    const ka: InputLexLang = 'ka'
    const widened: InputLexLang = fr // LexLang assignable to InputLexLang
    expect([ka, widened]).toEqual(['ka', 'fr'])
  })
  it('postpositions is an optional CoreLexicon field', () => {
    const withPost: Pick<CoreLexicon, 'postpositions'> = {
      postpositions: { ში: 'in' },
    }
    const without: Pick<CoreLexicon, 'postpositions'> = {}
    expect([withPost.postpositions?.ში, without.postpositions]).toEqual([
      'in',
      undefined,
    ])
  })
})
