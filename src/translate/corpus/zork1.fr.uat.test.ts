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

// French mirror of the es dam-guidebook / Deep Canyon / boat leaks (these
// runtime-composed lines are shared by both corpora — see the es.uat suite for
// the full why). The guidebook title arrives as the opening-quoted fragment
// `"Flood Control Dam #3`; the "1)" tour step as a `|`-joined line; the pre-dam
// Deep Canyon as a "roaring sound" combined line that only exists as separate
// fragments; the boat refusal "doesn't lead upward" had no entry.
describe('Zork I × French — dam guidebook, Deep Canyon & boat leaks (UAT)', () => {
  const c = compileCorpus(ZORK1_FR)

  it('translates the guidebook title line (was an LLM leak)', () => {
    const en = '"Flood Control Dam #3'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('"Barrage de régulation des crues nº 3')
  })

  it('translates the guidebook tour step; "Dam Lobby" is not left literal', () => {
    const en =
      '1) You start your tour here in the Dam Lobby. You will notice on your right that....'
    expect(matchLine(c, en)).toBe(
      '1) Vous commencez votre visite ici, dans le Hall du barrage. Vous remarquerez sur votre droite que....',
    )
  })

  it('translates the pre-dam (roaring water) Deep Canyon variant', () => {
    const en =
      'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear a loud roaring sound, like that of rushing water, from below.'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe(
      "Vous êtes sur le bord sud d'un canyon profond. Des passages partent vers l'est, le nord-ouest et le sud-ouest. Un escalier descend. Vous entendez un fort rugissement, comme celui d'eaux tumultueuses, venant d'en bas.",
    )
  })

  it('translates the magic boat "doesn\'t lead upward" refusal', () => {
    const en = "The magic boat doesn't lead upward."
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('Le bateau magique ne mène pas vers le haut.')
  })
})

// The gunk tube's printed label (READ/EXAMINE the tube near the dam) is one .z3
// TEXT split by a `|` into two display lines, both of which the string-inventory
// gate skips as composition fragments (one starts on '-', one ends on a word).
// Mirror of the Spanish F7 finding — shared corpus gap, here in French.
describe('Zork I × French — gunk tube label (UAT)', () => {
  const c = compileCorpus(ZORK1_FR)

  it('translates the "Frobozz Magic Gunk Company" label line', () => {
    const en = '---> Frobozz Magic Gunk Company <---'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('---> Compagnie Frobozz de Pâte Magique <---')
  })

  it('translates the "All-Purpose Gunk" label line', () => {
    const en = 'All-Purpose Gunk'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('Pâte à tout faire')
  })
})

// The Living Room description is composed at RUNTIME from state-dependent
// fragments (rug moved? trap door open? cyclops gone?), so it leaks English
// unless pinned as a full line. Surfaced on the Spanish UAT branch; es+fr share
// the gap (uat.md: "omissions are often shared with the French corpus").
describe('Zork I × French — post-cyclops closed-trap-door Living Room (UAT)', () => {
  const c = compileCorpus(ZORK1_FR)

  it('translates the post-cyclops closed-trap-door variant', () => {
    const en =
      'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a closed trap door at your feet.'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toContain('salon')
    expect(out).toContain('cyclope')
    expect(out).toContain('trappe fermée')
  })
})

// The French corpus had only the original Living Room line; the moved-rug /
// open-trap-door variants (the es counterparts already pinned in the Spanish
// corpus) were missing, so a French player would hit the English fallback after
// moving the rug. Pinned here to complete the Living Room variant family.
describe('Zork I × French — moved-rug / open-trap-door Living Room variants (UAT)', () => {
  const c = compileCorpus(ZORK1_FR)

  it('translates the pre-cyclops moved-rug / open-trap-door variant', () => {
    const en =
      'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a rug lying beside an open trap door.'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toContain('salon')
    expect(out).toContain('tapis')
    expect(out).toContain('trappe ouverte')
  })

  it('translates the post-cyclops moved-rug / open-trap-door variant', () => {
    const en =
      'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a rug lying beside an open trap door.'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toContain('salon')
    expect(out).toContain('cyclope')
    expect(out).toContain('trappe ouverte')
  })
})

// French mirror of the es book-disambiguation finding (F3). The parser's "Which
// book do you mean, the X or the Y?" prompt is runtime-composed from the
// ambiguous books the player holds, in a non-guaranteed order, so it needs a
// {obj}/{obj2} template (not a static pin) to render any pair, either way round.
// The es corpus surfaced it first; both corpora share the gap (uat.md: omissions
// are usually shared with French).
describe('Zork I × French — book-disambiguation prompt (UAT F3)', () => {
  const c = compileCorpus(ZORK1_FR)

  it('translates the black-book / guidebook prompt (the es UAT line)', () => {
    expect(
      matchLine(
        c,
        'Which book do you mean, the black book or the tour guidebook?',
      ),
    ).toBe('De quel livre parlez-vous, le livre noir ou le guide touristique ?')
  })

  it('renders the candidates in whichever order the parser lists them', () => {
    expect(
      matchLine(
        c,
        'Which book do you mean, the tour guidebook or the black book?',
      ),
    ).toBe('De quel livre parlez-vous, le guide touristique ou le livre noir ?')
  })

  it('generalizes to any pair of books (black book or matchbook)', () => {
    expect(
      matchLine(c, 'Which book do you mean, the black book or the matchbook?'),
    ).toBe('De quel livre parlez-vous, le livre noir ou les allumettes ?')
  })
})
