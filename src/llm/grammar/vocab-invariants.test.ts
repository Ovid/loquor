import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import prettier from 'prettier'
import { ZORK1_VOCAB } from './zork1.vocab'
import { ZORK2_VOCAB } from './zork2.vocab'
import { ZORK3_VOCAB } from './zork3.vocab'
import { META_COMMANDS } from '../meta'
import type { Vocab } from './types'

const games: Array<[string, Vocab]> = [
  ['zork1', ZORK1_VOCAB],
  ['zork2', ZORK2_VOCAB],
  ['zork3', ZORK3_VOCAB],
]
const meta = new Set(META_COMMANDS)

describe('vocab invariants (regeneration regression gate)', () => {
  it.each(games)('%s: no meta verb leaks into verbsOnly', (_name, v) => {
    expect(v.verbsOnly.filter(x => meta.has(x))).toEqual([])
    // Explicit pin for the head/synonym divergence the membership filter alone
    // missed: ZIL is <SYNTAX SUPER = V-SUPER-BRIEF> + <SYNONYM SUPER SUPERBRIEF>,
    // so the canonical verb head is 'super' (not the 'superbrief' synonym). 'super'
    // must be in META_COMMANDS so it is subtracted here, not silently emittable.
    expect(v.verbsOnly).not.toContain('super')
  })

  it.each(games)(
    '%s: inventory stays emittable; lists are non-empty',
    (_name, v) => {
      expect(v.verbsOnly).toContain('inventory')
      expect(v.verbs1.length).toBeGreaterThan(0)
      expect(v.nouns.length).toBeGreaterThan(0)
    },
  )

  it.each(games)('%s: movement has the compass + up/down', (_name, v) => {
    for (const d of [
      'north',
      'south',
      'east',
      'west',
      'northeast',
      'northwest',
      'southeast',
      'southwest',
      'up',
      'down',
    ]) {
      expect(v.movement).toContain(d)
    }
  })

  it.each(games)(
    '%s: preps include the <SYNONYM> prep-block canonicals',
    (_name, v) => {
      // Declared in gsyntax.zil:20-23 — `under` is the regression canary: it is only
      // ever a one-object particle ("look under"), so it survives ONLY because the
      // generator reads the prep SYNONYM blocks, not just inter-object preps.
      for (const p of ['with', 'in', 'on', 'under']) {
        expect(v.preps).toContain(p)
      }
    },
  )

  it.each(games)(
    '%s: committed vocab is Prettier-clean (no-op regenerate guard)',
    async name => {
      // The generator runs Prettier as its last step (Task 8), so a fresh regenerate
      // must be a no-op diff. Asserting the committed file equals its own formatted
      // form catches formatter drift that would silently break re-runnability
      // (spec Risks §). `name` ('zork1'…) matches the source filename.
      const path = join(process.cwd(), `src/llm/grammar/${name}.vocab.ts`)
      const src = readFileSync(path, 'utf8')
      const config = await prettier.resolveConfig(path)
      const formatted = await prettier.format(src, {
        ...config,
        filepath: path,
      })
      expect(formatted).toBe(src)
    },
  )

  it('zork1: the climb-tree fix is expressible', () => {
    expect(ZORK1_VOCAB.verbs1).toContain('climb')
    const tree = ZORK1_VOCAB.nouns.find(n => n.canonical === 'tree')
    expect(tree?.synonyms).toContain('branch')
    expect(tree?.adjectives).toEqual(expect.arrayContaining(['large', 'storm']))
    // ZIL has no single WINDOW object: 1dungeon.zil defines KITCHEN-WINDOW
    // (:93) and BOARDED-WINDOW (:411) as distinct objects, so the generator
    // emits canonicals 'kitchen window' / 'boarded window' with 'window' as a
    // shared synonym. The window referent must stay reachable (as a synonym),
    // but there is no canonical === 'window' to assert (corrected from the
    // task's original assumption; see DONE_WITH_CONCERNS note).
    expect(ZORK1_VOCAB.nouns.some(n => n.synonyms?.includes('window'))).toBe(
      true,
    )
  })

  it('zork3 is sourced from 3dungeon.zil (water present, not the stale dungeon.zil)', () => {
    expect(ZORK3_VOCAB.nouns.some(n => n.canonical === 'water')).toBe(true)
  })

  it.each(games)(
    '%s: no parser pseudo-objects leak into nouns (R1 phantom-scope fix)',
    (_name, v) => {
      // UAT R1: ZIL parser sentinels that carry a DESC (IT->"random object",
      // ADVENTURER->"cretin", INTNUM->"number", PSEUDO-OBJECT->"pseudo",
      // NOT-HERE-OBJECT->"such thing", LOCAL-GLOBALS->"zzmgck") were leaking into
      // every in-scope noun set, so the model snapped unmapped words onto them
      // (e.g. southeast -> "move random object"). None may be an emittable noun.
      const canon = new Set(v.nouns.map(n => n.canonical))
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
        expect(canon.has(ghost)).toBe(false)
    },
  )

  it('per-game isolation: one-object KILL is Zork II only (gsyntax COND gate)', () => {
    expect(ZORK2_VOCAB.verbs1).toContain('kill')
    expect(ZORK1_VOCAB.verbs1).not.toContain('kill')
    expect(ZORK3_VOCAB.verbs1).not.toContain('kill')
  })
})

describe('emit forms (NL v2 §9, F-Z)', () => {
  const games = [ZORK1_VOCAB, ZORK2_VOCAB, ZORK3_VOCAB]
  it('every noun has a non-empty emit built from its own dictionary words', () => {
    for (const g of games)
      for (const n of g.nouns) {
        expect(n.emit.length).toBeGreaterThan(0)
        // `synonyms` excludes a synonym equal to the canonical (existing
        // generator behavior), but the emit may legitimately BE that word
        // (e.g. zork1 'water', zork3 'lamp' via EMIT_OVERRIDES) — so the
        // canonical itself also counts as an "own" dictionary word here.
        const own = new Set([
          n.canonical,
          ...(n.synonyms ?? []),
          ...(n.adjectives ?? []),
        ])
        // An object whose only SYNONYM equals its canonical drops the
        // synonyms array but can still emit an adjective pair (zork1
        // FRONT-DOOR: DESC "door", SYNONYM DOOR, ADJ FRONT -> 'front door'),
        // so adjectives also select the membership branch.
        if (n.synonyms?.length || n.adjectives?.length)
          for (const w of n.emit.split(' ')) expect(own.has(w)).toBe(true)
        else expect(n.emit).toBe(n.canonical) // DESC-only sentinel fallback
      }
  })
  it('emit forms are unique within a game', () => {
    for (const g of games) {
      const emits = g.nouns.map(n => n.emit)
      expect(new Set(emits).size).toBe(emits.length)
    }
  })
  it('zork1: the pump emits its unique bare synonym, not the DESC (F-Z)', () => {
    const pump = ZORK1_VOCAB.nouns.find(
      n => n.canonical === 'hand-held air pump',
    )
    expect(pump?.emit).toBe('pump') // SYNONYM PUMP AIR-PUMP TOOL TOOLS — 'pump' is unique
  })
  it('zork1: trap door avoids the shared "door" synonym', () => {
    const trap = ZORK1_VOCAB.nouns.find(n => n.canonical === 'trap door')
    // SYNONYM DOOR TRAPDOOR TRAP-DOOR COVER: 'door' is shared, 'trapdoor' is unique
    expect(trap?.emit).toBe('trapdoor')
  })
})

describe('verbSynonyms (NL v2 §9)', () => {
  it('zork1 retains verb synonyms from gsyntax SYNONYM blocks', () => {
    // <SYNONYM ODYSSEUS ULYSSES> — magic word must pass stage 4 in both spellings
    expect(ZORK1_VOCAB.verbSynonyms).toContain('ulysses')
    // <SYNONYM ATTACK FIGHT HURT INJURE HIT>
    expect(ZORK1_VOCAB.verbSynonyms).toContain('fight')
    // <SYNONYM INVENTORY I> / <SYNONYM QUIT Q> — bare abbreviations pass raw
    expect(ZORK1_VOCAB.verbSynonyms).toContain('i')
    expect(ZORK1_VOCAB.verbSynonyms).toContain('q')
  })
  it('verbSynonyms excludes prep-block members and is lowercase-sorted-unique', () => {
    for (const g of [ZORK1_VOCAB, ZORK2_VOCAB, ZORK3_VOCAB]) {
      // 'using'/'thru' belong to the WITH prep block, not verb synonyms
      expect(g.verbSynonyms).not.toContain('using')
      expect(g.verbSynonyms).toEqual(
        [...new Set(g.verbSynonyms.map(s => s.toLowerCase()))].sort(),
      )
    }
  })
})
