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
  // Rug moved, trap door CLOSED, BEFORE the cyclops is defeated (west door still
  // nailed shut). The golden-path state between `move rug` and `open trap door`:
  // a player who looks after moving the rug hits it. Surfaced in UAT 2026-06-23
  // — every corpus had the post-cyclops closed-trap variant but not this one.
  const preCyclopsClosedTrap =
    'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a closed trap door at your feet.'
  const postCyclops =
    'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a rug lying beside an open trap door.'
  const postCyclopsClosedTrap =
    'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a closed trap door at your feet.'

  for (const [name, en] of Object.entries({
    preCyclops,
    preCyclopsClosedTrap,
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
    expect(
      matchLine(c, "There's nothing special about the brass lantern."),
    ).toBe(out)
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

describe('Zork I × Georgian — object disambiguation (UAT-2026-06-20)', () => {
  const c = compileCorpus(ZORK1_KA)

  // The real parser string (gparser.zil WHICH-PRINT) is "Which <noun> do you
  // mean, the X or the Y?" where <noun> is the player's TYPED noun word (English
  // — ka players type English). fr/de/es route this to the LLM fallback (no raw
  // leak); ka has NO LLM fallback, so before this fix ANY disambiguation leaked
  // raw English. The <noun> is captured as {raw} (verbatim, NOT corpus-
  // translated); the candidate objects translate via the corpus; the frame is
  // Georgian.
  it('disambiguation: non-"book" "Which <noun> do you mean…" renders Georgian', () => {
    const out = matchLine(
      c,
      'Which lamp do you mean, the brass lantern or the broken lantern?',
    )
    expect(out).not.toBeNull()
    // no leaked English frame
    expect(out).not.toContain('Which')
    expect(out).not.toContain('do you mean')
    expect(out).not.toContain(' or the ')
    // candidate objects rendered via the corpus (Georgian)
    expect(out).toContain('სპილენძის ფარანი') // brass lantern
    expect(out).toContain('გატეხილი ფარანი') // broken lantern
    // typed noun word kept verbatim (English) — it's the player's own input
    expect(out).toContain('lamp')
  })

  it('disambiguation: a different typed noun + object pair also composes', () => {
    const out = matchLine(
      c,
      'Which knife do you mean, the nasty knife or the rusty knife?',
    )
    expect(out).not.toBeNull()
    expect(out).not.toContain('Which')
    expect(out).toContain('საზიზღარი დანა') // nasty knife
    expect(out).toContain('დაჟანგული დანა') // rusty knife
    expect(out).toContain('knife')
  })

  // The golden-path case (I2): the 4 dam-control buttons share SYNONYM BUTTON,
  // are permanently co-located in the Maintenance Room, and WHICH-PRINT lists
  // ALL FOUR — "the A, the B, the C, or the D?". The 2-candidate (" or ")
  // template can't match it, so `push button` on the dam puzzle leaked raw
  // English for ka (no LLM net) until the 4-candidate template + obj3/obj4 slots.
  it('disambiguation: the 4 dam buttons (4-candidate) render Georgian, no leak', () => {
    const out = matchLine(
      c,
      'Which button do you mean, the yellow button, the brown button, the red button, or the blue button?',
    )
    expect(out).not.toBeNull()
    expect(out).not.toContain('Which')
    expect(out).not.toContain('do you mean')
    expect(out).not.toContain(', or the ')
    expect(out).toContain('ყვითელი ღილაკი') // yellow button
    expect(out).toContain('ყავისფერი ღილაკი') // brown button
    expect(out).toContain('წითელი ღილაკი') // red button
    expect(out).toContain('ლურჯი ღილაკი') // blue button
    expect(out).toContain('button') // typed noun kept verbatim (English)
  })

  // The 3-candidate form ("the A, the B, or the C?") for completeness.
  it('disambiguation: a 3-candidate prompt renders Georgian, no leak', () => {
    const out = matchLine(
      c,
      'Which button do you mean, the yellow button, the brown button, or the red button?',
    )
    expect(out).not.toBeNull()
    expect(out).not.toContain('do you mean')
    expect(out).toContain('ყვითელი ღილაკი')
    expect(out).toContain('ყავისფერი ღილაკი')
    expect(out).toContain('წითელი ღილაკი')
  })
})

describe('Zork I × Georgian — incomplete-put prompt (UAT-2026-06-20)', () => {
  const c = compileCorpus(ZORK1_KA)

  // The parser's "What do you want to put the X in?" (incomplete put). fr/de/es
  // route this to the LLM fallback (when warm); ka has NO LLM, so before this
  // template ANY incomplete put leaked raw English. X is the player's echoed
  // (English) noun captured as {raw}; naming it would need a locative case (§4),
  // so the out DROPS the object and asks caselessly (NATIVE-REVIEW-DRAFT).
  it('renders Georgian (object dropped, no raw-English leak) for any noun', () => {
    const adv = matchLine(c, 'What do you want to put the advertisement in?')
    expect(adv).not.toBeNull()
    expect(adv).toBe('რაში გსურთ მისი ჩადება?')
    // the leaked-English frame is gone
    expect(adv).not.toContain('What do you want')
    expect(adv).not.toContain('advertisement')
    // object-agnostic: a different echoed noun yields the same Georgian
    expect(matchLine(c, 'What do you want to put the leaflet in?')).toBe(adv)
  })

  // NB: the on/under/behind put-prompt variants were removed (UAT 2026-06-20).
  // This Zork I never emits them — `put X on` resolves to the WEAR verb ("You
  // can't wear the {obj}.", pinned in composed-lines.uat.test.ts) and `put X
  // under` / `put X behind` are unparsed ("That sentence isn't one I
  // recognize."). Only the bare `put X` orphan (defaulting to "in", above) fires.
})

describe('Zork I × Georgian — parser implicit-instrument parenthetical (UAT-2026-06-24)', () => {
  const c = compileCorpus(ZORK1_KA)
  // The drop-noun fallback; a *named* instrumental pin must NOT equal this.
  const DROP_NOUN = '(ამით)'

  // Every auto-suppliable weapon/tool the parser can default into
  // "(with the X)" (gparser.zil GWIM; zork1/gsyntax.zil FIND WEAPON/TOOL/FLAMEBIT
  // + zork1/1dungeon.zil flags). `root` is a stem of the object's ka NOUN that
  // the named instrumental must contain — proving the form NAMES the weapon, not
  // just "with this". Forms are NATIVE-REVIEW-DRAFT (the (beta) marker stays), so
  // the test pins the NOUN ROOT, not the full case form: a native-review tweak to
  // the case ending must not fight this regression gate, but a regression back to
  // the caseless drop-noun (or to raw English) must fail it.
  const INSTRUMENTS: [desc: string, root: string][] = [
    ['sword', 'მახვილ'],
    ['nasty knife', 'დან'],
    ['rusty knife', 'დან'],
    ['bloody axe', 'ცულ'],
    ['stiletto', 'სტილეტ'],
    ['sceptre', 'სკიპტრ'],
    ['torch', 'ჩირაღდ'],
    ['pair of candles', 'სანთ'],
    ['hand-held air pump', 'ტუმბო'],
    ['shovel', 'ნიჩაბ'],
    ['screwdriver', 'სახრახნის'],
    ['wrench', 'გასაღებ'],
    ['skeleton key', 'გასაღებ'],
    ['viscous material', 'მასალ'],
  ]

  for (const [desc, root] of INSTRUMENTS) {
    it(`names "${desc}" in the instrumental, not the drop-noun`, () => {
      const out = matchLine(c, `(with the ${desc})`)
      expect(out).not.toBeNull()
      expect(out).not.toBe(DROP_NOUN) // the named form, not the caseless fallback
      expect(out).toMatch(/[Ⴀ-ჿ]/) // Georgian (Mkhedruli), no raw-English leak
      expect(out).toContain(root) // names the weapon/tool, not just "with this"
    })
  }

  // The match pin pre-dates this upgrade and already names the instrument.
  it('keeps the pre-existing "(with the match)" named pin', () => {
    expect(matchLine(c, '(with the match)')).toBe('(ასანთით)')
  })

  // Any object OUTSIDE the auto-suppliable set still hits the leak-proof drop-noun
  // template — so an instrument we failed to pin can never leak raw English.
  it('falls back to the drop-noun for an un-pinned object', () => {
    expect(matchLine(c, '(with the brass lantern)')).toBe(DROP_NOUN)
  })
})

describe('Zork I × Georgian — combat coverage (UAT-2026-06-24 follow-up)', () => {
  const c = compileCorpus(ZORK1_KA)
  // Mkhedruli (modern Georgian). The pins assert NOUN ROOTS, not full §4 case
  // forms, so a native case tweak can't fight the gate — but a regression to raw
  // English (or to a different language) fails. Combat is golden-path
  // (everyone fights the troll; killing the thief is required to win), runtime-
  // composed, and probabilistic — the walkthrough/inventory gates never see it,
  // so these pins (plus the composed-line gate families) are what keep ka from
  // leaking English mid-fight (notes/georgian-combat-coverage-worklist.md). ka
  // has NO LLM net, so a gap here is a guaranteed leak. See UAT-6 (notes/uat-6.md).
  const GEORGIAN = /[Ⴀ-ჿ]/
  // No raw-English word (a 4+ run of Latin letters) may survive in a ka line.
  const LATIN_WORD = /[A-Za-z]{4,}/

  // Shape A — HERO-MELEE (player attacks) + FRAME full-line pins. HERO-MELEE is
  // villain-agnostic, so each template renders for BOTH troll and thief; pin a
  // representative spread of result classes for each, asserting the villain noun
  // root survives (the line NAMES who you hit) with no English leak.
  const SHAPE_A: [en: string, villainRoot: string][] = [
    ['A good slash, but it misses the troll by a mile.', 'ტროლ'],
    ['A good slash, but it misses the thief by a mile.', 'ქურდ'],
    ['The troll is battered into unconsciousness.', 'ტროლ'],
    ['The thief is knocked out!', 'ქურდ'],
    ['The troll is staggered, and drops to his knees.', 'ტროლ'],
    ['The force of your blow knocks the thief back, stunned.', 'ქურდ'],
    ['The fatal blow strikes the troll square in the heart: He dies.', 'ტროლ'],
    ['The thief takes a fatal blow and slumps to the floor dead.', 'ქურდ'],
    ['Attacking the troll is pointless.', 'ტროლ'],
    ['The unconscious troll cannot defend himself: He dies.', 'ტროლ'],
    ['The unarmed thief cannot defend himself: He dies.', 'ქურდ'],
    ['The troll slowly regains his feet.', 'ტროლ'],
  ]
  for (const [en, root] of SHAPE_A) {
    it(`Shape A: "${en}" → Georgian, names the villain, no English`, () => {
      const out = matchLine(c, en)
      expect(out).not.toBeNull()
      expect(out).not.toBe(en)
      expect(out).toMatch(GEORGIAN)
      expect(out).toContain(root) // names troll/thief, not "(someone)"
      expect(out).not.toMatch(LATIN_WORD) // no raw-English leak
    })
  }

  // Shape B — F-WEP weapon-slot lines. ka drops the specific weapon → renders the
  // generic "იარაღი" (weapon), so the line is WEAPON-AGNOSTIC: every weapon
  // yields the same Georgian, and no English weapon name ever leaks.
  it('Shape B: the kill line drops the weapon, weapon/villain-agnostic, no English', () => {
    const out = matchLine(
      c,
      "It's curtains for the troll as your sword removes his head.",
    )
    expect(out).not.toBeNull()
    expect(out).toMatch(GEORGIAN)
    expect(out).not.toMatch(LATIN_WORD) // no "sword" / "curtains" / "troll"
    // weapon- AND villain-agnostic: a different weapon and villain yield the same
    expect(
      matchLine(
        c,
        "It's curtains for the thief as your bloody axe removes his head.",
      ),
    ).toBe(out)
  })

  it('Shape B: an enemy-disarm line names the generic weapon "იარაღი", not English', () => {
    const sword = matchLine(
      c,
      'The Cyclops grabs your sword, tastes it, and throws it to the ground in disgust.',
    )
    expect(sword).not.toBeNull()
    expect(sword).toContain('იარაღ') // generic "weapon"
    expect(sword).not.toMatch(LATIN_WORD) // no "sword" / "Cyclops"
    // weapon-agnostic: every weapon yields the same Georgian
    expect(
      matchLine(
        c,
        'The Cyclops grabs your stiletto, tastes it, and throws it to the ground in disgust.',
      ),
    ).toBe(sword)
  })

  it('Shape B: "Fortunately, you still have a {obj}" NAMES the weapon (Georgian "have" → nominative)', () => {
    // The one F-WEP line where the weapon is correctly NAMED: Georgian "have"
    // takes the nominative, so {obj.indef} composes (no drop needed).
    expect(matchLine(c, 'Fortunately, you still have a sword.')).toContain(
      'მახვილ',
    )
    expect(matchLine(c, 'Fortunately, you still have a stiletto.')).toContain(
      'სტილეტ',
    )
  })
})
