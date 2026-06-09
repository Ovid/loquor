import { describe, it, expect } from 'vitest'
import { pct, estimateRemainingSeconds, formatEta } from './progress'

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

describe('estimateRemainingSeconds', () => {
  it('returns null until there are at least two samples', () => {
    expect(estimateRemainingSeconds([])).toBeNull()
    expect(estimateRemainingSeconds([{ pct: 10, t: 0 }])).toBeNull()
  })

  it('extrapolates a linear rate to the remaining percent', () => {
    // 0% → 50% over 10s = 5%/s; 50% left → 10s.
    expect(
      estimateRemainingSeconds([
        { pct: 0, t: 0 },
        { pct: 50, t: 10_000 },
      ]),
    ).toBe(10)
  })

  it('uses only a recent window so a changing rate adapts', () => {
    // A slow start then a faster recent segment: the estimate follows the recent
    // 10%-in-10s rate (70% left → 70s), not the slow opening.
    expect(
      estimateRemainingSeconds(
        [
          { pct: 0, t: 0 },
          { pct: 20, t: 20_000 },
          { pct: 30, t: 30_000 },
        ],
        15_000,
      ),
    ).toBe(70)
  })

  it('returns null instead of NaN when a sample pct is non-finite (S7)', () => {
    // WebLLM can report non-numeric progress; NaN must not leak into state.
    expect(
      estimateRemainingSeconds([
        { pct: 10, t: 0 },
        { pct: NaN, t: 5_000 },
      ]),
    ).toBeNull()
    expect(
      estimateRemainingSeconds([
        { pct: NaN, t: 0 },
        { pct: 50, t: 5_000 },
      ]),
    ).toBeNull()
  })

  it('returns null when stalled (no forward progress) or already done', () => {
    expect(
      estimateRemainingSeconds([
        { pct: 60, t: 0 },
        { pct: 60, t: 8_000 },
      ]),
    ).toBeNull()
    expect(
      estimateRemainingSeconds([
        { pct: 0, t: 0 },
        { pct: 100, t: 5_000 },
      ]),
    ).toBeNull()
  })
})

describe('formatEta', () => {
  it('returns null for no/zero/negative estimate', () => {
    expect(formatEta(null)).toBeNull()
    expect(formatEta(0)).toBeNull()
    expect(formatEta(-5)).toBeNull()
  })

  it('formats seconds, minutes, and hours', () => {
    expect(formatEta(45)).toBe('~45s remaining')
    expect(formatEta(90)).toBe('~2 min remaining')
    expect(formatEta(3700)).toBe('~1h 2m remaining')
  })

  it('carries a rounded-up 60m into the hour (never "~1h 60m")', () => {
    // 7170s = 1h 59.5m: minutes round to 60 and must carry.
    expect(formatEta(7170)).toBe('~2h 0m remaining')
  })
})
