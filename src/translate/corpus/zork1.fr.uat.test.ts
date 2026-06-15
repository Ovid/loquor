import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from '../match'
import { ZORK1_FR } from './zork1.fr'

// Regression pins for French output-translation findings from UAT play
// (the window.loquorMisses() loop, mirroring the Spanish es.uat suite).
//
// The black-book prayer (read at the Altar) is pinned verse-by-verse, but one
// verse — "Even unto the ends of the earth shalt thou wander and" — ends on the
// word "and" (the sentence continues onto the next display line). The
// string-inventory gate's full-line shape filter requires terminal punctuation,
// so it skips this verse as a composition fragment; the walkthrough-coverage
// gate never reads the book. The same gap surfaced first in Spanish (the corpora
// share keys); French had the identical omission.
describe('Zork I × French — black-book prayer "ends of the earth" verse (UAT)', () => {
  const c = compileCorpus(ZORK1_FR)

  it('translates the verse that ends on "and" (was an LLM leak)', () => {
    const en = 'Even unto the ends of the earth shalt thou wander and'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe("Jusqu'aux confins de la terre tu erreras, et")
  })

  it('resolves every verse of the prayer with no English leak', () => {
    for (const en of [
      'Oh ye who go about saying unto each: "Hello sailor":',
      'Dost thou know the magnitude of thy sin before the gods?',
      'Yea, verily, thou shalt be ground between two stones.',
      'Shall the angry gods cast thy body into the whirlpool?',
      'Surely, thy eye shall be put out with a sharp stick!',
      'Even unto the ends of the earth shalt thou wander and',
      'Unto the land of the dead shalt thou be sent at last.',
      'Surely thou shalt repent of thy cunning.',
    ]) {
      const out = matchLine(c, en)
      expect(out).not.toBeNull()
      expect(out).not.toBe(en)
    }
  })
})
