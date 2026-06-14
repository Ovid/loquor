import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from '../match'
import { ZORK1_ES } from './zork1.es'

// Regression pins for Spanish output-translation findings from UAT play
// (the window.loquorMisses() loop, spec §4 "Spanish UAT loop").
//
// The Living Room description is composed at RUNTIME from fragments that depend
// on game state (rug moved? trap door open? cyclops gone?). Those variant lines
// are not single static strings in the .z3, so neither the walkthrough-coverage
// gate nor the string-inventory gate sees them — they only surface in play and
// must be pinned as full-line entries here. Without them the line leaks English.
describe('Zork I × Spanish — runtime-composed Living Room variants (UAT)', () => {
  const c = compileCorpus(ZORK1_ES)

  // Rug moved, trap door open, BEFORE the cyclops is defeated.
  const preCyclops =
    'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a rug lying beside an open trap door.'

  // Rug moved, trap door open, AFTER the cyclops smashes the west door.
  const postCyclops =
    'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a rug lying beside an open trap door.'

  it('translates the pre-cyclops moved-rug / open-trap-door variant', () => {
    const out = matchLine(c, preCyclops)
    expect(out).not.toBeNull()
    expect(out).not.toBe(preCyclops)
    expect(out).toContain('salón')
    expect(out).toContain('trampilla abierta')
  })

  it('translates the post-cyclops moved-rug / open-trap-door variant', () => {
    const out = matchLine(c, postCyclops)
    expect(out).not.toBeNull()
    expect(out).not.toBe(postCyclops)
    expect(out).toContain('salón')
    expect(out).toContain('cíclope')
    expect(out).toContain('trampilla abierta')
  })
})
