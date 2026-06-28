import type { ActiveLanguage } from './types'

/**
 * Clamp a load-progress fraction to an integer 0..100 percent. Single helper
 * shared by the download modal and the toggle so the rounding/guard logic isn't
 * triplicated (review S3).
 */
export function pct(loaded: number, total: number): number {
  if (!(total > 0) || !Number.isFinite(loaded)) return 0
  // Clamp to 0..100 (S4): the raw value feeds the progress bar, and a bad
  // sample (loaded > total, or negative) must not paint past the ends.
  return Math.min(100, Math.max(0, Math.round((loaded / total) * 100)))
}

/** One progress observation: integer percent at a wall-clock time (ms). */
export interface ProgressSample {
  pct: number
  t: number
}

/**
 * Keep only the progress samples worth estimating from: those within `horizonMs`
 * of the latest sample, then the most recent `cap` of those. Time-based, NOT a
 * bare count cap — a count cap (the old `.slice(-60)`) silently collapses the
 * estimator's smoothing window when WebLLM fires progress callbacks rapidly (60
 * samples can span a few seconds, not the intended horizon), which is what made
 * the ETA jump. The count `cap` is only a memory backstop for a pathological
 * callback rate, set well above the horizon's expected sample count.
 */
export function retainSamples(
  samples: ProgressSample[],
  horizonMs: number,
  cap: number,
): ProgressSample[] {
  if (samples.length === 0) return samples
  const latestT = samples[samples.length - 1].t
  return samples.filter(s => s.t >= latestT - horizonMs).slice(-cap)
}

/**
 * Estimate seconds remaining from progress samples, or null when there isn't
 * enough signal yet (fewer than two samples, no forward progress, or already
 * complete).
 *
 * The rate is a TIME-WEIGHTED exponential moving average of the inter-sample
 * rates across a recent window, not a single window slope. A multi-shard CDN
 * download is bursty (per-shard speed, CDN throttling, gaps), so a raw slope
 * faithfully reproduces that burstiness and the ETA bounces (28s → 2min → 12s).
 * The EMA damps a single fast/slow burst while a longer `tauMs` memory still lets
 * a sustained change through, and recent segments weigh more (so a genuine late
 * slowdown is reflected). `windowMs` bounds how far back to look; `tauMs` is the
 * smoothing time constant.
 */
export function estimateRemainingSeconds(
  samples: ProgressSample[],
  windowMs = 60_000,
  tauMs = 20_000,
): number | null {
  if (samples.length < 2) return null
  const latest = samples[samples.length - 1]
  // A non-finite sample (WebLLM reporting non-numeric progress) must yield null,
  // not propagate NaN into state (review S7).
  if (!Number.isFinite(latest.pct)) return null
  if (latest.pct <= 0 || latest.pct >= 100) return null
  const recent = samples.filter(s => s.t >= latest.t - windowMs)
  // Time-weighted EMA over consecutive segments (oldest → newest). A non-finite
  // or zero-/negative-time segment is skipped; a non-monotone blip clamps to 0
  // rather than going negative.
  let ema: number | null = null
  for (let i = 1; i < recent.length; i++) {
    const dT = recent[i].t - recent[i - 1].t
    const dPct = recent[i].pct - recent[i - 1].pct
    if (!(dT > 0) || !Number.isFinite(dPct)) continue
    const inst = Math.max(0, dPct) / dT // %/ms
    const alpha = 1 - Math.exp(-dT / tauMs)
    ema = ema === null ? inst : ema + alpha * (inst - ema)
  }
  // No usable segment, or stalled (rate ≈ 0) → no estimate rather than Infinity.
  if (ema === null || ema <= 0) return null
  const remainingPct = 100 - latest.pct
  return Math.round(remainingPct / ema) / 1000
}

// Localized ETA strings (review I4): the modal is localized EN/FR/DE/ES, so the
// "~X min remaining" line must not stay English for FR/DE/ES players. One entry
// per language, three time bands (seconds / minutes / hours+minutes).
const ETA: Record<
  ActiveLanguage,
  {
    s: (n: number) => string
    min: (n: number) => string
    hm: (h: number, m: number) => string
  }
> = {
  en: {
    s: n => `~${n}s remaining`,
    min: n => `~${n} min remaining`,
    hm: (h, m) => `~${h}h ${m}m remaining`,
  },
  fr: {
    s: n => `~${n} s restantes`,
    min: n => `~${n} min restantes`,
    hm: (h, m) => `~${h} h ${m} min restantes`,
  },
  de: {
    s: n => `noch ~${n} s`,
    min: n => `noch ~${n} Min.`,
    hm: (h, m) => `noch ~${h} Std. ${m} Min.`,
  },
  es: {
    s: n => `~${n} s restantes`,
    min: n => `~${n} min restantes`,
    hm: (h, m) => `~${h} h ${m} min restantes`,
  },
  // Georgian (ka): only reachable from the model-download modal, which is
  // SUPPRESSED for output-only Georgian (Phase 1 — spec §3a), so this is never
  // shown today. Authored anyway because formatEta indexes ETA[lang] directly;
  // forward-compatible with Phase 2. Draft pending native review (§8). Georgian
  // uses Arabic numerals; Mkhedruli is unicameral (§4).
  ka: {
    s: n => `~${n} წმ-ღა დარჩა`,
    min: n => `~${n} წთ-ღა დარჩა`,
    hm: (h, m) => `~${h} სთ ${m} წთ-ღა დარჩა`,
  },
}

/** Human-friendly "~Xs / ~X min / ~Hh Mm remaining" in the player's language, or
 * null when not estimable. */
export function formatEta(
  seconds: number | null,
  lang: ActiveLanguage = 'en',
): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null
  const t = ETA[lang]
  if (seconds < 60) return t.s(Math.round(seconds))
  if (seconds < 3600) return t.min(Math.round(seconds / 60))
  // Round to whole minutes FIRST, then split — rounding the remainder directly
  // can yield m === 60 ("~1h 60m") near an hour boundary (review).
  const totalMinutes = Math.round(seconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return t.hm(h, m)
}
