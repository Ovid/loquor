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

// a+el→al / de+el→del contraction (spec §2.5/§3.3, the un-done "Task 6").
// Templates that put a masculine {obj.def} directly after `a` or `de` used to
// leak the ungrammatical "a el …" / "de el …" instead of "al …" / "del …".
// Found in UAT play: container header "Dentro de el huevo/saco hay:" and the
// combat death "alcanza a el trol". Feminine ("de la botella") was always fine.
describe('Zork I × Spanish — a+el→al / de+el→del contraction (UAT)', () => {
  const c = compileCorpus(ZORK1_ES)

  it('contracts "de el" → "del" in the container header (masculine)', () => {
    expect(matchLine(c, 'The brown sack contains:')).toBe(
      'Dentro del saco hay:',
    )
    expect(matchLine(c, 'The jewel-encrusted egg contains:')).toBe(
      'Dentro del huevo hay:',
    )
  })

  it('leaves feminine container headers uncontracted ("de la")', () => {
    expect(matchLine(c, 'The basket contains:')).toBe('Dentro de la cesta hay:')
  })

  it('contracts "a el" → "al" in the fatal-blow line (masculine creature)', () => {
    expect(
      matchLine(
        c,
        'The fatal blow strikes the troll square in the heart: He dies.',
      ),
    ).toBe('El golpe fatal alcanza al trol de lleno en el corazón: muere.')
  })

  it('never emits the ungrammatical "de el" / "a el" sequence', () => {
    for (const en of [
      'The brown sack contains:',
      'The magic boat contains:',
      'The fatal blow strikes the troll square in the heart: He dies.',
      'Attacking the troll is pointless.',
    ]) {
      const out = matchLine(c, en)
      expect(out).not.toBeNull()
      expect(out).not.toMatch(/\b(de|a) el\b/)
    }
  })
})

// A cap:true template whose output starts with inverted punctuation (¡/¿) must
// capitalize the first LETTER, not the '¡'. Found in UAT: the knockout line
// rendered "¡el ladrón queda fuera de combate!" (lowercase el).
describe('Zork I × Spanish — capitalize the first letter after ¡ (UAT)', () => {
  const c = compileCorpus(ZORK1_ES)

  it('capitalizes the noun after a leading ¡ in the knockout line', () => {
    expect(matchLine(c, 'The thief is knocked out!')).toBe(
      '¡El ladrón queda fuera de combate!',
    )
  })
})
