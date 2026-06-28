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
 * Seconds remaining as a CUMULATIVE-AVERAGE rate over the current phase: from
 * the phase's first sample `start` (the anchor) to the latest `cur`. Returns
 * null when there isn't enough signal — no elapsed time, no forward progress, a
 * non-finite sample, or already complete (review S7).
 *
 * Why cumulative-average and not a per-segment / EMA rate: a real WebLLM
 * download fires progress callbacks in BURSTS (adjacent samples seen 19ms–28s
 * apart on a captured 5-min trace) with BYTE-QUANTIZED percent, so a per-segment
 * rate is an artifact of WHEN a callback fired, not true speed — it swings
 * orders of magnitude between neighbours and the ETA bounces non-monotonically
 * (1min↔2min) while percent climbs steadily. Averaging over the whole phase from
 * a fixed anchor is inherently smooth and was monotonic across the back half of
 * the real trace. The estimator stays stateless; the caller (useModelDownload)
 * resets the anchor at each phase boundary — WebLLM restarts `progress` at 0 when
 * it moves fetch→cache-load→GPU — so one phase's elapsed time never divides the
 * next phase's progress (which would spike the ETA to ~30 min at the boundary).
 * A backward `cur` (a reset that reaches the estimator un-anchored) yields null,
 * never a negative estimate.
 */
export function estimateRemainingSeconds(
  start: ProgressSample,
  cur: ProgressSample,
): number | null {
  if (!Number.isFinite(start.pct) || !Number.isFinite(cur.pct)) return null
  if (cur.pct <= 0 || cur.pct >= 100) return null
  const dT = cur.t - start.t
  const dPct = cur.pct - start.pct
  if (!(dT > 0) || !(dPct > 0)) return null
  const ratePerMs = dPct / dT // %/ms averaged over the phase so far
  return Math.round((100 - cur.pct) / ratePerMs) / 1000
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
