import { describe, it, expect } from 'vitest'
import { readForms, headAtom } from './zil.mjs'
import { activeForms } from './zil.mjs'
import { extractVerbsAndPreps } from './zil.mjs'
import { extractNouns } from './zil.mjs'
import { extractDirections } from './zil.mjs'
import { buildVocabModule } from './zil.mjs'

describe('readForms', () => {
  it('parses nested angle/paren forms and string literals', () => {
    const [obj] = readForms('<OBJECT TREE (DESC "tree") (FLAGS NDESCBIT)>')
    expect(obj.t).toBe('list')
    expect(headAtom(obj)).toBe('OBJECT')
    const desc = obj.items.find(i => i.t === 'list' && headAtom(i) === 'DESC')
    expect(desc.items[1]).toEqual({ t: 'str', v: 'tree' })
  })

  it('drops the single datum after a ";" comment', () => {
    const [adj] = readForms('(ADJECTIVE LARGE STORM ;"-TOSSED")')
    const atoms = adj.items.filter(i => i.t === 'atom').map(i => i.v)
    expect(atoms).toEqual(['ADJECTIVE', 'LARGE', 'STORM'])
  })

  it('drops a commented-out bracketed form without breaking nesting', () => {
    const forms = readForms('<A> ;<DEAD <CODE>> <B>')
    expect(forms.map(headAtom)).toEqual(['A', 'B'])
  })

  it('treats ,ZORK-NUMBER and form-feeds as ordinary atoms/whitespace', () => {
    const [cond] = readForms('\f<COND (<==? ,ZORK-NUMBER 2> <X>)>')
    expect(headAtom(cond)).toBe('COND')
  })
})

describe('extractVerbsAndPreps', () => {
  const meta = new Set(['save', 'quit'])
  const run = (src, n = 1) => extractVerbsAndPreps(readForms(src), n, meta)

  it('classifies a verb-only rule and drops meta verbs', () => {
    const v = run('<SYNTAX WAIT = V-WAIT> <SYNTAX SAVE = V-SAVE>')
    expect(v.verbsOnly).toContain('wait')
    expect(v.verbsOnly).not.toContain('save')
  })

  it('classifies a one-object rule, skipping (flag) groups', () => {
    const v = run('<SYNTAX TAKE OBJECT (HELD CARRIED) = V-TAKE>')
    expect(v.verbs1).toContain('take')
  })

  it('keeps a particle between verb and OBJECT as a multiword verb', () => {
    const v = run('<SYNTAX CLIMB UP OBJECT (FIND CLIMBBIT) = V-CLIMB-UP>')
    expect(v.verbs1).toContain('climb up')
  })

  it('classifies a two-object rule and records the inter-object preposition', () => {
    const v = run('<SYNTAX CUT OBJECT (HELD) WITH OBJECT (HELD) = V-CUT>')
    expect(v.verbs2).toContain('cut')
    expect(v.preps).toContain('with')
  })

  it('reads prepositions from <SYNONYM> declaration blocks, not just inter-object usage', () => {
    const v = run(
      '<SYNONYM UNDER UNDERNEATH BENEATH BELOW> <SYNTAX LOOK UNDER OBJECT = V-LOOK-UNDER>',
    )
    expect(v.preps).toContain('under')
    expect(v.verbs1).toContain('look under') // still a particle verb, not a prep
  })

  it('only treats known-preposition SYNONYM heads as preps (not verb synonyms)', () => {
    const v = run('<SYNONYM ATTACK FIGHT HURT INJURE HIT> <SYNONYM ON ONTO>')
    expect(v.preps).toContain('on')
    expect(v.preps).not.toContain('attack')
  })

  it('honors the KILL anti-infection gate (verbs1 only for Zork II)', () => {
    const src =
      '<COND (<==? ,ZORK-NUMBER 2> <SYNTAX KILL OBJECT (FIND ACTORBIT) = V-ATTACK>)>'
    expect(run(src, 1).verbs1).not.toContain('kill')
    expect(run(src, 2).verbs1).toContain('kill')
  })

  it('drops $/# debug verbs', () => {
    const v = run(
      '<SYNTAX $VERIFY = V-VERIFY> <SYNTAX #COMMAND OBJECT = V-DEBUG>',
    )
    expect(v.verbsOnly.join()).not.toMatch(/[#$]/)
    expect(v.verbs1.join()).not.toMatch(/[#$]/)
  })
})

describe('extractNouns', () => {
  const dungeon = `
    <ROOM FOREST-PATH (DESC "Forest Path") (NORTH TO CLEARING)>
    <OBJECT TREE
      (IN LOCAL-GLOBALS)
      (SYNONYM TREE BRANCH)
      (ADJECTIVE LARGE STORM ;"-TOSSED")
      (DESC "tree")
      (FLAGS NDESCBIT CLIMBBIT)>`
  const globals = `
    <OBJECT GLOBAL-OBJECTS (FLAGS NDESCBIT)>
    <OBJECT WINDOW (SYNONYM WINDOW) (DESC "window") (FLAGS DOORBIT)>`

  it('maps DESC->canonical, SYNONYM->synonyms (minus canonical), ADJECTIVE->adjectives', () => {
    const nouns = extractNouns(dungeon, globals)
    const tree = nouns.find(n => n.canonical === 'tree')
    expect(tree).toEqual({
      canonical: 'tree',
      synonyms: ['branch'],
      adjectives: ['large', 'storm'],
    })
  })

  it('excludes <ROOM> blocks', () => {
    expect(
      extractNouns(dungeon, globals).some(n => n.canonical === 'forest path'),
    ).toBe(false)
  })

  it('skips parser sentinels with no DESC and no SYNONYM', () => {
    expect(
      extractNouns(dungeon, globals).some(
        n => n.canonical === 'global-objects',
      ),
    ).toBe(false)
  })

  it('reads globals (window) alongside dungeon objects', () => {
    expect(
      extractNouns(dungeon, globals).some(n => n.canonical === 'window'),
    ).toBe(true)
  })

  it('excludes parser pseudo-objects that DO have a DESC (R1 phantom-scope fix)', () => {
    // These are the standard Infocom parser sentinels in gglobals.zil, shared by
    // Zork I/II/III: the pronoun anaphora object (IT), the player avatar
    // (ADVENTURER), the number parser (INTNUM), and the "pseudo"/"not here"/
    // local-globals placeholders. They each carry a DESC so they slip past the
    // "no DESC and no SYNONYM" sentinel skip, then pollute every in-scope noun set
    // — the model snaps unmapped words onto them (UAT R1: southeast -> "move
    // random object"). They must NOT be emitted as player-targetable nouns.
    const g = `
      <OBJECT INTNUM (IN GLOBAL-OBJECTS) (SYNONYM INTNUM) (FLAGS TOOLBIT) (DESC "number")>
      <OBJECT INTDIR (IN GLOBAL-OBJECTS) (SYNONYM INTDIR) (FLAGS TOOLBIT) (DESC "direction")>
      <OBJECT IT (IN GLOBAL-OBJECTS) (SYNONYM IT THEM HER HIM) (DESC "random object") (FLAGS NDESCBIT TOUCHBIT)>
      <OBJECT ADVENTURER (SYNONYM ADVENTURER) (DESC "cretin") (FLAGS NDESCBIT INVISIBLE SACREDBIT ACTORBIT)>
      <OBJECT ME (IN GLOBAL-OBJECTS) (SYNONYM ME MYSELF SELF CRETIN) (DESC "you") (FLAGS ACTORBIT)>
      <OBJECT PSEUDO-OBJECT (IN LOCAL-GLOBALS) (DESC "pseudo") (ACTION CRETIN-FCN)>
      <OBJECT NOT-HERE-OBJECT (DESC "such thing") (ACTION NOT-HERE-OBJECT-F)>
      <OBJECT LOCAL-GLOBALS (IN GLOBAL-OBJECTS) (SYNONYM ZZMGCK) (DESCFCN PATH-OBJECT)>`
    // Two classes that MUST survive: a real combat NPC (ACTORBIT actor — the
    // filter must not blanket-exclude actors) and a real usable tool (TOOLBIT is
    // a game flag for shovels/keys/knives, NOT a parser-toolkit marker; an early
    // flag-based filter wrongly dropped these — regression guard).
    const d = `
      <OBJECT TROLL (IN TROLL-ROOM) (SYNONYM TROLL) (ADJECTIVE NASTY) (DESC "troll") (FLAGS OVISON ACTORBIT FIGHTBIT)>
      <OBJECT SHOVEL (SYNONYM SHOVEL) (DESC "shovel") (FLAGS TAKEBIT TOOLBIT)>`
    const canon = extractNouns(d, g).map(n => n.canonical)
    for (const ghost of [
      'number',
      'direction',
      'random object',
      'cretin',
      'you',
      'pseudo',
      'such thing',
      'zzmgck',
    ])
      expect(canon).not.toContain(ghost)
    expect(canon).toContain('troll')
    expect(canon).toContain('shovel')
  })
})

describe('extractDirections', () => {
  it('reads the games own DIRECTIONS and normalizes compass abbreviations', () => {
    const dirs = extractDirections(
      '<DIRECTIONS NORTH EAST WEST SOUTH NE NW SE SW UP DOWN IN OUT LAND>',
    )
    expect(dirs).toContain('northeast')
    expect(dirs).toContain('northwest')
    expect(dirs).toContain('southeast')
    expect(dirs).toContain('southwest')
    expect(dirs).toContain('north')
    expect(dirs).toContain('up')
    expect(dirs).toContain('land')
    expect(dirs).not.toContain('ne')
  })
  it('returns [] when no DIRECTIONS form is present', () => {
    expect(extractDirections('<OBJECT FOO>')).toEqual([])
  })
})

describe('activeForms (ZORK-NUMBER gating)', () => {
  const src = `
    <SYNTAX BACK = V-BACK>
    <COND (<==? ,ZORK-NUMBER 2> <SYNTAX KILL OBJECT = V-ATTACK>)>
    <COND (<N==? ,ZORK-NUMBER 3> <SYNTAX GIVE OBJECT TO OBJECT = V-GIVE>)>
  `
  const heads = n => activeForms(readForms(src), n).map(headAtom)

  it('always includes ungated forms', () => {
    expect(heads(1)).toContain('SYNTAX') // BACK
  })
  it('includes ==?-gated forms only for the matching game', () => {
    const kill1 = activeForms(readForms(src), 1).filter(f =>
      f.items.some(i => i.t === 'atom' && i.v === 'KILL'),
    )
    const kill2 = activeForms(readForms(src), 2).filter(f =>
      f.items.some(i => i.t === 'atom' && i.v === 'KILL'),
    )
    expect(kill1).toHaveLength(0)
    expect(kill2).toHaveLength(1)
  })
  it('includes N==?-gated forms for every game except the excluded one', () => {
    const has = n =>
      activeForms(readForms(src), n).some(f =>
        f.items.some(i => i.t === 'atom' && i.v === 'GIVE'),
      )
    expect(has(1)).toBe(true)
    expect(has(2)).toBe(true)
    expect(has(3)).toBe(false)
  })
})

describe('buildVocabModule', () => {
  const vocab = {
    verbsOnly: ['look'],
    movement: ['north'],
    verbs1: ['take'],
    verbs2: ['put'],
    preps: ['in'],
    nouns: [{ canonical: 'tree', synonyms: ['branch'], adjectives: ['large'] }],
  }

  it('emits a typed Vocab literal that re-imports the shared patterns', () => {
    const src = buildVocabModule(1, vocab)
    expect(src).toContain("import type { Vocab } from './types'")
    expect(src).toContain(
      "import { TAKE_ACK, DROP_ACK, ABSENCE_PAT, FAILURE_PAT } from './patterns'",
    )
    expect(src).toContain('export const ZORK1_VOCAB: Vocab = {')
    expect(src).toContain('takeAck: TAKE_ACK')
    expect(src).toContain('GENERATED by scripts/extract-vocab.mjs')
  })

  it('serializes nouns with optional synonyms/adjectives', () => {
    const src = buildVocabModule(2, vocab)
    expect(src).toContain('"canonical":"tree"')
    expect(src).toContain('"synonyms":["branch"]')
    expect(src).toContain('export const ZORK2_VOCAB: Vocab = {')
  })
})
