import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from '../match'
import { ZORK1_KA } from './zork1.ka'

// Georgian output-translation regression pins (spec §8 native-review loop).
// Runtime-composed Living Room variants are not static .z3 strings, so the
// coverage/inventory gates can't see them — pin them here or they leak English.
describe('Zork I × Georgian — runtime-composed Living Room variants (UAT)', () => {
  const c = compileCorpus(ZORK1_KA)
  const preCyclops =
    'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a rug lying beside an open trap door.'
  const postCyclops =
    'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a rug lying beside an open trap door.'
  const postCyclopsClosedTrap =
    'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a closed trap door at your feet.'

  for (const [name, en] of Object.entries({
    preCyclops,
    postCyclops,
    postCyclopsClosedTrap,
  })) {
    it(`translates the ${name} variant to Georgian`, () => {
      const out = matchLine(c, en)
      expect(out).not.toBeNull()
      expect(out).not.toBe(en) // actually translated, not echoed English
    })
  }
})

// Runtime-composed coverage gaps found in UAT (2026-06-19). Each is an
// off-walkthrough, runtime-composed line the coverage/inventory gates can't
// see; pin every fix so it can't silently regress (spec §8).
describe('Zork I × Georgian — UAT-2026-06-19 composed-line fixes', () => {
  const c = compileCorpus(ZORK1_KA)

  // A: `take all` listed each object's outcome as "<obj>: Taken." — the
  // multi-DROP analog "<obj>: Dropped." was templated but multi-TAKE was not,
  // so Georgian leaked English on one of the most common commands.
  it('A: multi-object "<obj>: Taken." composes (take all)', () => {
    expect(matchLine(c, 'sword: Taken.')).toBe('მახვილი: აღებულია.')
    expect(matchLine(c, 'brass lantern: Taken.')).toBe(
      'სპილენძის ფარანი: აღებულია.',
    )
  })
})
