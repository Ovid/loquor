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
    expect(r.miss).toBeNull()
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
    expect(r.miss).toBe('Frobozz Room')
  })
  it('unparseable right side → English right, miss reported', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Time: 9:00am' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Time: 9:00am')
    expect(r.miss).toBe('Time: 9:00am')
  })
  it('matches the real ifvms z3 right side ("Turns:", the shape the bridge actually emits)', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Score: 0  Turns: 0' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Score : 0  Coups : 0')
    expect(r.miss).toBeNull()
  })
})
