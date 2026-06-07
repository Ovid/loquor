import { describe, it, expect } from 'vitest'
import { pct } from './progress'

describe('pct', () => {
  it('rounds the fraction to an integer percent', () => {
    expect(pct(1, 2)).toBe(50)
    expect(pct(1, 3)).toBe(33)
    expect(pct(2, 2)).toBe(100)
  })

  it('returns 0 for a zero or unknown total (no divide-by-zero)', () => {
    expect(pct(0, 0)).toBe(0)
    expect(pct(5, 0)).toBe(0)
  })
})
