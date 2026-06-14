import { describe, it, expect } from 'vitest'
import { translateStatus } from './statusTranslate'
import { compileCorpus } from './match'

const c = compileCorpus({
  strings: { 'West of House': "À l'ouest de la maison" },
  objects: {},
  templates: [],
})

describe('translateStatus (spec §5 status bar)', () => {
  it('translates room name and renders the FR score format', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Score: 340   Moves: 470' },
      c,
      'fr',
    )
    expect(r.status).toEqual({
      location: "À l'ouest de la maison",
      right: 'Score : 340  Coups : 470',
    })
    expect(r.misses).toEqual([])
  })
  it('handles negative scores (death is -10, unclamped — spec §4.3)', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Score: -10   Moves: 3' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Score : -10  Coups : 3')
  })
  it('reinterprets the unsigned-16-bit image the live interpreter emits for a negative score (death −10 arrives as 65526)', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Score: 65526  Turns: 3' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Score : -10  Coups : 3')
  })
  it('room-name miss → English location, miss reported (no shimmer in a one-line bar)', () => {
    const r = translateStatus(
      { location: 'Frobozz Room', right: 'Score: 0   Moves: 1' },
      c,
      'fr',
    )
    expect(r.status.location).toBe('Frobozz Room')
    expect(r.misses).toEqual(['Frobozz Room'])
  })
  it('unparseable right side → English right, miss reported', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Time: 9:00am' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Time: 9:00am')
    expect(r.misses).toEqual(['Time: 9:00am'])
  })
  it('a room-name miss and a right-side miss on the same turn are BOTH reported (review S4)', () => {
    // miss = miss ?? status.right let a room-name miss suppress an unparseable
    // right-side miss on the same turn — combined with the per-turn dedup the
    // right-side corpus gap was never logged. Report both independently.
    const r = translateStatus(
      { location: 'Frobozz Room', right: 'Time: 9:00am' },
      c,
      'fr',
    )
    expect(r.status).toEqual({ location: 'Frobozz Room', right: 'Time: 9:00am' })
    expect(r.misses).toEqual(['Frobozz Room', 'Time: 9:00am'])
  })
  it('an out-of-16-bit-range score is treated as a miss, not a fabricated number (review S3)', () => {
    // The VM reads the score with getUint16 (0..0xFFFF), but the (-?\d+) regex
    // is arbitrary-width: a ≥6-digit value would otherwise be folded by
    // signedScore into a fabricated number. Anything outside the 16-bit window
    // isn't a score the VM could emit → English right, miss reported.
    const r = translateStatus(
      { location: 'West of House', right: 'Score: 1000000  Turns: 3' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Score: 1000000  Turns: 3')
    expect(r.misses).toEqual(['Score: 1000000  Turns: 3'])
  })
  it('matches the real ifvms z3 right side ("Turns:", the shape the bridge actually emits)', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Score: 0  Turns: 0' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Score : 0  Coups : 0')
    expect(r.misses).toEqual([])
  })
})
