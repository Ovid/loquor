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
    expect(v.verbsOnly.filter((x) => meta.has(x))).toEqual([])
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
    async (name) => {
      // The generator runs Prettier as its last step (Task 8), so a fresh regenerate
      // must be a no-op diff. Asserting the committed file equals its own formatted
      // form catches formatter drift that would silently break re-runnability
      // (spec Risks §). `name` ('zork1'…) matches the source filename.
      const path = join(process.cwd(), `src/llm/grammar/${name}.vocab.ts`)
      const src = readFileSync(path, 'utf8')
      const config = await prettier.resolveConfig(path)
      const formatted = await prettier.format(src, { ...config, filepath: path })
      expect(formatted).toBe(src)
    },
  )

  it('zork1: the climb-tree fix is expressible', () => {
    expect(ZORK1_VOCAB.verbs1).toContain('climb')
    const tree = ZORK1_VOCAB.nouns.find((n) => n.canonical === 'tree')
    expect(tree?.synonyms).toContain('branch')
    expect(tree?.adjectives).toEqual(expect.arrayContaining(['large', 'storm']))
    // ZIL has no single WINDOW object: 1dungeon.zil defines KITCHEN-WINDOW
    // (:93) and BOARDED-WINDOW (:411) as distinct objects, so the generator
    // emits canonicals 'kitchen window' / 'boarded window' with 'window' as a
    // shared synonym. The window referent must stay reachable (as a synonym),
    // but there is no canonical === 'window' to assert (corrected from the
    // task's original assumption; see DONE_WITH_CONCERNS note).
    expect(ZORK1_VOCAB.nouns.some((n) => n.synonyms?.includes('window'))).toBe(
      true,
    )
  })

  it('zork3 is sourced from 3dungeon.zil (water present, not the stale dungeon.zil)', () => {
    expect(ZORK3_VOCAB.nouns.some((n) => n.canonical === 'water')).toBe(true)
  })

  it('per-game isolation: one-object KILL is Zork II only (gsyntax COND gate)', () => {
    expect(ZORK2_VOCAB.verbs1).toContain('kill')
    expect(ZORK1_VOCAB.verbs1).not.toContain('kill')
    expect(ZORK3_VOCAB.verbs1).not.toContain('kill')
  })
})
