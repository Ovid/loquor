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
 * Estimate seconds remaining from progress samples, or null when there isn't
 * enough signal yet (fewer than two samples, no forward progress, or already
 * complete). Linear extrapolation over a RECENT window so a changing download
 * rate (slow ramp-up, then steady) adapts instead of being dragged by the start.
 */
export function estimateRemainingSeconds(
  samples: ProgressSample[],
  windowMs = 15_000,
): number | null {
  if (samples.length < 2) return null
  const latest = samples[samples.length - 1]
  // A non-finite sample (WebLLM reporting non-numeric progress) must yield null,
  // not propagate NaN into state (review S7).
  if (!Number.isFinite(latest.pct)) return null
  if (latest.pct <= 0 || latest.pct >= 100) return null
  const recent = samples.filter(s => s.t >= latest.t - windowMs)
  const first = recent.length >= 2 ? recent[0] : samples[0]
  const dPct = latest.pct - first.pct
  const dT = latest.t - first.t
  if (!Number.isFinite(dPct) || dPct <= 0 || dT <= 0) return null
  const remainingPct = 100 - latest.pct
  return Math.round((remainingPct / dPct) * dT) / 1000
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
