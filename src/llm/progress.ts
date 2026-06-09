/**
 * Clamp a load-progress fraction to an integer 0..100 percent. Single helper
 * shared by the download modal and the toggle so the rounding/guard logic isn't
 * triplicated (review S3).
 */
export function pct(loaded: number, total: number): number {
  return total > 0 ? Math.round((loaded / total) * 100) : 0
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

/** Human-friendly "~Xs / ~X min / ~Hh Mm remaining", or null when not estimable. */
export function formatEta(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null
  if (seconds < 60) return `~${Math.round(seconds)}s remaining`
  if (seconds < 3600) return `~${Math.round(seconds / 60)} min remaining`
  // Round to whole minutes FIRST, then split — rounding the remainder directly
  // can yield m === 60 ("~1h 60m") near an hour boundary (review).
  const totalMinutes = Math.round(seconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `~${h}h ${m}m remaining`
}
