// Walkthrough-fixture smoke test (output-translation spec §7.3).
//
// The fixture is a full seeded Zork I win (350/350, "Inside the Barrow")
// captured as raw GlkOte update objects by scripts/capture-walkthrough.mjs
// (`make capture-walkthrough`). CI never replays the VM — we only fold the
// committed updates through the reducer. The strict zero-miss coverage gate
// over these lines lands with the FR string corpus (Task 17).
import { describe, it, expect } from 'vitest'
import updates from '../../test/zork1.walkthrough.en.json'
import { reduce } from '../../glkote-react/reduce'
import { emptyView } from '../../glkote-react/types'
import type { GlkOteUpdate, ViewState } from '../../glkote-react/types'
import { compileCorpus, matchLine } from '../match'
import { normalize, splitIndent } from '../normalize'
import { ZORK1_FR } from './zork1.fr'

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

  it('reports walkthrough misses (authoring aid — replaced by the strict gate)', () => {
    const c = compileCorpus(ZORK1_FR)
    const misses = new Set<string>()
    for (const l of walkthroughLines()) {
      if (l.kind !== 'output' && l.kind !== 'room') continue
      const en = normalize(splitIndent(l.text).body)
      if (en && en !== '>' && matchLine(c, en) === null) misses.add(en)
    }
    console.log(`[corpus] walkthrough misses: ${misses.size}`)
    for (const m of [...misses].slice(0, 40)) console.log('  MISS:', m)
    expect(misses.size).toBeGreaterThanOrEqual(0) // report-only while authoring
  })
})
