// Walkthrough-fixture smoke test (output-translation spec §7.3). The fixture is
// a full seeded Zork I win captured as GlkOte updates; CI folds them through
// the reducer (no VM replay). The zero-miss assertion runs per language (fr
// now; es in Task 6).
import { describe, it, expect } from 'vitest'
import updates from '../../test/zork1.walkthrough.en.json'
import { reduce } from '../../glkote-react/reduce'
import { emptyView } from '../../glkote-react/types'
import type { GlkOteUpdate, ViewState } from '../../glkote-react/types'
import type { TranslationCorpus } from '../types'
import { compileCorpus, matchLine } from '../match'
import { normalize, splitIndent, untranslatable } from '../normalize'
import { ZORK1_FR } from './zork1.fr'

const LANGS: { code: string; corpus: TranslationCorpus }[] = [
  { code: 'fr', corpus: ZORK1_FR },
]

/** Reduce the committed walkthrough fixture to the lines a player would see. */
export function walkthroughLines(): ViewState['lines'] {
  let v = emptyView
  for (const u of updates as unknown as GlkOteUpdate[]) v = reduce(v, u)
  return v.lines
}

describe('walkthrough fixture (spec §7.3)', () => {
  it('replays through the reducer to a full winning transcript', () => {
    const lines = walkthroughLines()
    expect(lines.length).toBeGreaterThan(500)
    expect(lines.some(l => l.text.includes('West of House'))).toBe(true)
    expect(lines.some(l => l.text.includes('Inside the Barrow'))).toBe(true)
  })

  describe.each(LANGS)('$code golden path', ({ corpus }) => {
    it('ZERO misses on the golden path — "instant is required" (spec §7.3)', () => {
      const c = compileCorpus(corpus)
      const misses = new Set<string>()
      for (const l of walkthroughLines()) {
        if (l.kind !== 'output' && l.kind !== 'room') continue
        const en = normalize(splitIndent(l.text).body)
        if (!untranslatable(en) && matchLine(c, en) === null) misses.add(en)
      }
      expect([...misses]).toEqual([])
    })
  })
})
