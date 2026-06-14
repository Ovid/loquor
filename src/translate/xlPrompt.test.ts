import { describe, it, expect } from 'vitest'
import { xlPrompt, shimmerLabel } from './xlPrompt'

describe('xlPrompt (spec §6 literal translation)', () => {
  it('builds a system+user pair naming the target language', () => {
    const m = xlPrompt('You are in a maze of twisty little passages.', 'fr')
    expect(m).toHaveLength(2)
    expect(m[0].role).toBe('system')
    expect(m[0].content).toContain('French')
    expect(m[0].content).toMatch(/only the translation/i)
    expect(m[1]).toEqual({
      role: 'user',
      content: 'You are in a maze of twisty little passages.',
    })
  })
  it('per-language shimmer labels', () => {
    expect(shimmerLabel('fr')).toBe('…traduction')
    expect(shimmerLabel('de')).toBe('…Übersetzung')
    expect(shimmerLabel('es')).toBe('…traducción')
  })
})
