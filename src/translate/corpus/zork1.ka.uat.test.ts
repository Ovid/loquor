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

  // B: `examine <ordinary object>` → "There's nothing special about the X."
  // leaked English. fr/de/es template it with the object inside; Georgian
  // can't (the object would need a case suffix, §4), so the out drops the
  // object and renders a caseless, object-agnostic sentence.
  it('B: examine "nothing special about the {obj}" composes caselessly', () => {
    const out = matchLine(c, "There's nothing special about the sword.")
    expect(out).not.toBeNull()
    expect(out).not.toBe("There's nothing special about the sword.")
    // object-agnostic: a different (known) object yields the same Georgian
    expect(matchLine(c, "There's nothing special about the brass lantern.")).toBe(
      out,
    )
  })

  // C: "open mailbox" — the FIRST command most players type — printed its
  // reveal-on-open in English. The line is runtime-composed (off the
  // walkthrough, not a full-line z-string), so both gates miss it. Shared with
  // fr/de/es. Pinned here mirroring the buoy/sack reveal lines.
  it('C: "Opening the small mailbox reveals a leaflet." composes', () => {
    expect(matchLine(c, 'Opening the small mailbox reveals a leaflet.')).toBe(
      'პატარა საფოსტო ყუთის გახსნა ფურცელს ავლენს.',
    )
  })

  // D: `take all` per-object failure reasons leaked English (the "<obj>:" label
  // is the caseless nominative, the reason is reused from its standalone pin).
  it('D: "<obj>: <take-all failure reason>" composes', () => {
    expect(
      matchLine(c, 'carpet: The rug is extremely heavy and cannot be carried.'),
    ).toBe('ხალიჩა: ხალიჩა უაღრესად მძიმეა და მისი ზიდვა შეუძლებელია.')
    expect(
      matchLine(
        c,
        'trophy case: The trophy case is securely fastened to the wall.',
      ),
    ).toBe('ჯილდოების ვიტრინა: ჯილდოების ვიტრინა მყარადაა კედელზე დამაგრებული.')
  })
})
