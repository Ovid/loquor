import { describe, it, expect } from 'vitest'
import { GAMES, gameBySlug } from './catalog'

describe('catalog', () => {
  it('lists three games with files under /games', () => {
    expect(GAMES.map(g => g.slug)).toEqual(['zork1', 'zork2', 'zork3'])
    for (const g of GAMES) expect(g.file).toMatch(/^\/games\/zork[123]\.z3$/)
  })
  it('looks up by slug', () => {
    expect(gameBySlug('zork2')?.title).toContain('Zork')
  })
  it('returns undefined for an unknown slug', () => {
    expect(gameBySlug('nope')).toBeUndefined()
  })
})
