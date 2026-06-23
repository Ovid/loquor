import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from '../match'
import { ZORK1_DE } from './zork1.de'

// Regression pins for German output-translation findings from UAT play.
//
// The Living Room description is composed at RUNTIME from fragments that depend
// on game state (rug moved? trap door open? cyclops gone?). Those variant lines
// are not single static strings in the .z3, so neither the walkthrough-coverage
// gate nor the string-inventory gate sees them — they only surface in play and
// must be pinned as full-line entries or the line leaks English. The other
// corpora (ka/fr/es) already had a uat suite for these; German had none, so its
// closed-trap variants were never regression-guarded (UAT 2026-06-23).
describe('Zork I × German — runtime-composed Living Room variants (UAT)', () => {
  const c = compileCorpus(ZORK1_DE)

  // Rug moved, trap door CLOSED, BEFORE the cyclops is defeated (west door still
  // nailed shut) — the golden-path state between `move rug` and `open trap door`.
  // Missing from every corpus until UAT 2026-06-23; leaked English after moving
  // the rug.
  const preCyclopsClosedTrap =
    'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a closed trap door at your feet.'

  // Post-cyclops, trap door CLOSED (the variant the other corpora already pinned).
  const postCyclopsClosedTrap =
    'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a closed trap door at your feet.'

  it('translates the pre-cyclops closed-trap-door variant', () => {
    const out = matchLine(c, preCyclopsClosedTrap)
    expect(out).not.toBeNull()
    expect(out).not.toBe(preCyclopsClosedTrap)
    expect(out).toContain('Wohnzimmer')
    expect(out).toContain('zugenagelt')
    expect(out).toContain('geschlossene Falltür')
  })

  it('translates the post-cyclops closed-trap-door variant', () => {
    const out = matchLine(c, postCyclopsClosedTrap)
    expect(out).not.toBeNull()
    expect(out).not.toBe(postCyclopsClosedTrap)
    expect(out).toContain('Wohnzimmer')
    expect(out).toContain('zyklopenförmige')
    expect(out).toContain('geschlossene Falltür')
  })
})
