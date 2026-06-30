import { describe, it, expect } from 'vitest'
import { pct, estimateRemainingSeconds, formatEta } from './progress'
import type { ProgressSample } from './progress'
import type { ActiveLanguage } from './types'

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

  it('clamps a bad sample to 0..100 and rejects non-finite (S4)', () => {
    expect(pct(150, 100)).toBe(100) // loaded > total → never past the end
    expect(pct(-5, 100)).toBe(0) // negative → floor at 0
    expect(pct(NaN, 100)).toBe(0) // non-finite loaded → 0, not NaN
    expect(pct(50, Infinity)).toBe(0) // non-finite total → 0
  })
})

describe('estimateRemainingSeconds', () => {
  const s = (pct: number, t: number): ProgressSample => ({ pct, t })

  it('returns null when the latest sample adds no signal (anchor == latest)', () => {
    // The first sample of a phase IS the anchor: no elapsed time, no estimate.
    expect(estimateRemainingSeconds(s(10, 1000), s(10, 1000))).toBeNull()
  })

  it('extrapolates the cumulative rate to the remaining percent', () => {
    // 0% → 50% over 10s = 5%/s; 50% left → 10s.
    expect(estimateRemainingSeconds(s(0, 0), s(50, 10_000))).toBe(10)
    // Anchored partway: 10% → 50% over 1s = 40%/s; 50% left → 1.25s.
    expect(estimateRemainingSeconds(s(10, 1000), s(50, 2000))).toBeCloseTo(1.25)
  })

  it('returns null instead of NaN when a sample pct is non-finite (S7)', () => {
    // WebLLM can report non-numeric progress; NaN must not leak into state.
    expect(estimateRemainingSeconds(s(10, 0), s(NaN, 5_000))).toBeNull()
    expect(estimateRemainingSeconds(s(NaN, 0), s(50, 5_000))).toBeNull()
  })

  it('returns null when stalled (no forward progress) or already done', () => {
    expect(estimateRemainingSeconds(s(60, 0), s(60, 8_000))).toBeNull()
    expect(estimateRemainingSeconds(s(0, 0), s(100, 5_000))).toBeNull()
    // A backward sample (phase reset reaching the estimator un-anchored) → null,
    // never a negative or absurd estimate.
    expect(estimateRemainingSeconds(s(100, 0), s(13, 600))).toBeNull()
  })

  it('a fixed anchor + per-phase reset avoids the boundary spike', () => {
    // WHY the caller re-anchors on a progress DROP: WebLLM's `timeElapsed` is
    // cumulative across phases but `progress` resets fetch→cache-load. Dividing
    // ~296s of fetch-elapsed by the load phase's fresh 13% yields a ~30-min
    // spike — the bug. Re-anchored to the load phase's own start, it's sane.
    const spike = estimateRemainingSeconds(s(0, 0), s(13, 296_000)) as number
    expect(spike).toBeGreaterThan(30 * 60) // the bug, if we DON'T re-anchor
    expect(estimateRemainingSeconds(s(13, 296_000), s(13, 296_000))).toBeNull()
  })

  // Regression: replay the FETCH phase of a real ~5-min Safari download trace
  // (params_shard 1..30, [roundedPct, wallClockMs]). The old per-segment EMA
  // bounced 1min↔2min on adjacent readings; the cumulative average must trend
  // down — and be strictly monotonic once past the volatile early shards.
  const FETCH_TRACE: Array<[number, number]> = [
    [0, 339715],
    [3, 368600],
    [6, 375692],
    [9, 376043],
    [12, 404585],
    [15, 414115],
    [18, 414275],
    [21, 442632],
    [24, 454384],
    [27, 455159],
    [30, 481138],
    [33, 492077],
    [47, 493047],
    [50, 493066],
    [53, 511836],
    [55, 525603],
    [58, 528104],
    [61, 529396],
    [65, 545958],
    [68, 560364],
    [71, 562534],
    [74, 563542],
    [77, 577979],
    [80, 595461],
    [83, 597549],
    [86, 597921],
    [89, 606170],
    [92, 612351],
    [94, 616725],
    [97, 625331],
    [100, 634951],
  ]

  it('trends down across a real download trace (no bounce)', () => {
    const anchor = s(...FETCH_TRACE[0])
    const etas = FETCH_TRACE.map(([p, t]) =>
      estimateRemainingSeconds(anchor, s(p, t)),
    )
    // Every mid-download reading is a finite, positive estimate (first sample is
    // the anchor → null; 100% → null).
    for (const eta of etas.slice(1, -1)) {
      expect(eta).not.toBeNull()
      expect(eta as number).toBeGreaterThan(0)
    }
    // Overall downward: the last computable ETA is a tiny fraction of the first.
    const computable = etas.filter((e): e is number => e !== null)
    expect(computable[computable.length - 1]).toBeLessThan(computable[0] / 10)
  })

  it('is strictly monotonic once past the volatile early shards (pct ≥ 50)', () => {
    const anchor = s(...FETCH_TRACE[0])
    const backHalf = FETCH_TRACE.filter(([p]) => p >= 50 && p < 100).map(
      ([p, t]) => estimateRemainingSeconds(anchor, s(p, t)) as number,
    )
    for (let i = 1; i < backHalf.length; i++)
      expect(backHalf[i]).toBeLessThan(backHalf[i - 1])
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

  it('localizes EVERY band for EVERY language (review I4 — no English leaks; ka has no LLM net, so this pure fn is its only ETA check)', () => {
    // [s-band 45s, min-band 90s→2min, hm-band 3700s→1h2m] per language.
    const expected: Record<ActiveLanguage, [string, string, string]> = {
      en: ['~45s remaining', '~2 min remaining', '~1h 2m remaining'],
      fr: ['~45 s restantes', '~2 min restantes', '~1 h 2 min restantes'],
      de: ['noch ~45 s', 'noch ~2 Min.', 'noch ~1 Std. 2 Min.'],
      es: ['~45 s restantes', '~2 min restantes', '~1 h 2 min restantes'],
      ka: ['~45 წმ-ღა დარჩა', '~2 წთ-ღა დარჩა', '~1 სთ 2 წთ-ღა დარჩა'],
    }
    for (const lang of Object.keys(expected) as ActiveLanguage[]) {
      const [s, min, hm] = expected[lang]
      expect(formatEta(45, lang)).toBe(s)
      expect(formatEta(90, lang)).toBe(min)
      expect(formatEta(3700, lang)).toBe(hm)
    }
    // The English time-word never leaks into a non-English ETA (the point of I4).
    for (const lang of ['fr', 'de', 'es', 'ka'] as const)
      for (const secs of [45, 90, 3700])
        expect(formatEta(secs, lang)).not.toMatch(/remaining/)
  })
})
