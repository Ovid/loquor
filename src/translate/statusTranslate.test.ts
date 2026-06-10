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
})
