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

// The "catches fire … you were holding it" death binds {obj} to any BURNBIT
// object the player holds — in Zork I that set is mostly MASCULINE (el libro
// negro, el saco, el folleto, el cuadro, el nido, the three «montón» piles) plus
// two feminine (la etiqueta, la guía turística). The template used to hardcode
// the feminine clitic "la sostenías", mis-agreeing for every masculine binding.
// (No candle reaches here: candles are FLAMEBIT, not BURNBIT.) The fix makes the
// second clause's subject the object itself, so it agrees by gender automatically.
describe('Zork I × Spanish — "catches fire / holding it" gender agreement (UAT)', () => {
  const c = compileCorpus(ZORK1_ES)

  it('agrees for a masculine held burnable (black book)', () => {
    expect(
      matchLine(
        c,
        'The black book catches fire. Unfortunately, you were holding it at the time.',
      ),
    ).toBe(
      'El libro negro se prende fuego. Por desgracia, estaba en tus manos en ese momento.',
    )
  })

  it('never emits the feminine clitic "la sostenías" for masculine bindings', () => {
    for (const obj of ['black book', 'brown sack', 'leaflet', 'painting']) {
      const out = matchLine(
        c,
        `The ${obj} catches fire. Unfortunately, you were holding it at the time.`,
      )
      expect(out).not.toBeNull()
      expect(out).not.toMatch(/\bla sostenías\b/)
    }
  })
})

// The black-book prayer (read at the Altar) is pinned verse-by-verse, but one
// verse — "Even unto the ends of the earth shalt thou wander and" — ends on the
// word "and" (the sentence continues onto the next display line). The
// string-inventory gate's full-line shape filter requires terminal punctuation,
// so it skips this verse as a composition fragment; the walkthrough-coverage
// gate never reads the book. Found in UAT play: the verse fell through to the
// LLM, which mistranslated "wander" as "te atravesarás". Pin it as a full line.
describe('Zork I × Spanish — black-book prayer "ends of the earth" verse (UAT)', () => {
  const c = compileCorpus(ZORK1_ES)

  it('translates the verse that ends on "and" (was an LLM leak)', () => {
    const en = 'Even unto the ends of the earth shalt thou wander and'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('Hasta los confines de la tierra habrás de vagar, y')
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

// Three output-translation leaks surfaced by the Spanish UAT loop
// (window.loquorMisses()), all runtime-composed lines the corpus gates miss:
//
//  • The dam tour guidebook's TITLE and its "1)" tour step. The whole book is
//    one quoted .z3 string, so the title arrives as the opening-quoted fragment
//    `"Flood Control Dam #3` and the "1)" step as a `|`-joined line; neither is
//    a standalone .z3 string, so both fell to the LLM, which mis-rendered the
//    title and translated "Dam Lobby" as «Salón de las Tumbas» (Hall of Tombs).
//  • The DEEP CANYON has two runtime variants by dam state. The corpus pinned
//    the post-dam "flowing water" combined line but not the pre-dam "loud
//    roaring sound" combined line — it exists only as two separate fragments
//    (room desc + roaring sentence), which never compose at the gate.
//  • The magic boat's "doesn't lead upward" refusal (trying to climb up out of
//    the boat) had no entry; the LLM rendered it with «barco» not «bote».
describe('Zork I × Spanish — dam guidebook, Deep Canyon & boat leaks (UAT)', () => {
  const c = compileCorpus(ZORK1_ES)

  it('translates the guidebook title line (was an LLM leak)', () => {
    const en = '"Flood Control Dam #3'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('"Presa de Control de Crecidas n.º 3')
  })

  it('translates the guidebook tour step; "Dam Lobby" is not left literal', () => {
    const en =
      '1) You start your tour here in the Dam Lobby. You will notice on your right that....'
    expect(matchLine(c, en)).toBe(
      '1) Comienzas tu recorrido aquí, en el Vestíbulo de la presa. Notarás, a tu derecha, que....',
    )
  })

  it('translates the pre-dam (roaring water) Deep Canyon variant', () => {
    const en =
      'You are on the south edge of a deep canyon. Passages lead off to the east, northwest and southwest. A stairway leads down. You can hear a loud roaring sound, like that of rushing water, from below.'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe(
      'Estás en el borde sur de un cañón profundo. Hay pasadizos hacia el este, el noroeste y el suroeste. Una escalera baja. Oyes un fuerte rugido, como el de aguas turbulentas, que viene de abajo.',
    )
  })

  it('translates the magic boat "doesn\'t lead upward" refusal', () => {
    const en = "The magic boat doesn't lead upward."
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('El bote mágico no lleva hacia arriba.')
  })
})

// The tube of gunk's printed label (READ/EXAMINE the tube near the dam) is one
// .z3 TEXT split by a `|` into two display lines:
//   "---> Frobozz Magic Gunk Company <---"  (starts on '-', not /^[A-Z"'(]/)
//   "All-Purpose Gunk"                       (ends on a word, no terminal punct.)
// Both line shapes are skipped by the string-inventory gate as "composition
// fragments", and the maintenance/dam golden path never reads the tube — so the
// label leaked English in UAT play (window.loquorMisses() at the Dam Lobby).
// Proper noun «Frobozz» stays; "all-purpose gunk" is already «pasta multiusos»
// elsewhere in the corpus, so the brand reuses «pasta». Shared with French.
describe('Zork I × Spanish — gunk tube label (UAT)', () => {
  const c = compileCorpus(ZORK1_ES)

  it('translates the "Frobozz Magic Gunk Company" label line', () => {
    const en = '---> Frobozz Magic Gunk Company <---'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('---> Compañía Frobozz de Pasta Mágica <---')
  })

  it('translates the "All-Purpose Gunk" label line', () => {
    const en = 'All-Purpose Gunk'
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en)
    expect(out).toBe('Pasta multiusos')
  })
})
