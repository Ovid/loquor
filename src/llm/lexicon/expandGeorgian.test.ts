// src/llm/lexicon/expandGeorgian.test.ts
import { describe, it, expect } from 'vitest'
import { expandGeorgian } from './expandGeorgian'

// The closed Zork I postposition set, mirrored from KA_CORE (Task 4). Inline
// here so the unit test does not depend on the lexicon data.
const POST = { ში: 'in', ზე: 'on', ით: 'with', დან: 'from' } as const

describe('expandGeorgian', () => {
  it('strips a nominative -ი to the bare stem', () => {
    // ფანარი (lamp, nominative) → ფანარ
    expect(expandGeorgian(['ფანარი'], POST)).toEqual(['ფანარ'])
  })
  it('does not strip a vowel-final nominative', () => {
    // კალათა (basket) ends in -ა, not -ი: unchanged
    expect(expandGeorgian(['კალათა'], POST)).toEqual(['კალათა'])
  })
  it('splits a postposition before its stem (prep token first)', () => {
    // ყუთში (box-in) → [ში, ყუთ]  (so prep precedes noun)
    expect(expandGeorgian(['ყუთში'], POST)).toEqual(['ში', 'ყუთ'])
  })
  it('prefers the longest postposition (-ით over a bare -ი strip)', () => {
    // ფანრით (instrumental) → [ით, ფანრ], NEVER a -ი strip of "ფანრი"
    expect(expandGeorgian(['ფანრით'], POST)).toEqual(['ით', 'ფანრ'])
  })
  it('passes a verb token through untouched', () => {
    // აიღე (take, imperative) has no postposition/-ი: unchanged
    expect(expandGeorgian(['აიღე', 'ფანარი'], POST)).toEqual(['აიღე', 'ფანარ'])
  })
  it('leaves a token that IS a bare postposition untouched (S2)', () => {
    // ში alone is too short to split (2 > 2 is false) — but it must NOT then
    // lose its -ი to the nominative strip (→ შ). A bare bound suffix is
    // unrealistic input; keep it whole so it can only ever miss, never mangle.
    expect(expandGeorgian(['ში'], POST)).toEqual(['ში'])
  })
  it('handles a whole put-in clause', () => {
    // ჩადე X ყუთში → [ჩადე, X, ში, ყუთ]
    expect(expandGeorgian(['ჩადე', 'X', 'ყუთში'], POST)).toEqual([
      'ჩადე',
      'X',
      'ში',
      'ყუთ',
    ])
  })
  it('routes a fused instrumental to [ით, stem] (ტუმბოთი → with pump)', () => {
    // Vowel stem ტუმბო (pump): instrumental -ით fuses to -თი. Exact-token map
    // emits [ით, stem] so the existing -ით prep-split can fire.
    expect(expandGeorgian(['ტუმბოთი'], POST, { ტუმბოთი: 'ტუმბო' })).toEqual([
      'ით',
      'ტუმბო',
    ])
  })
  it('exact-token fused map never touches a თ-stem nominative', () => {
    // ასანთი (matchbook) / ყუთი (box) are NOT keys → normal -ი strip, fused map skipped.
    const fused = { ტუმბოთი: 'ტუმბო' }
    expect(expandGeorgian(['ასანთი'], POST, fused)).toEqual(['ასანთ'])
    expect(expandGeorgian(['ყუთი'], POST, fused)).toEqual(['ყუთ'])
  })
})
