/**
 * Central tunables for the natural-language input pipeline (F-13).
 *
 * These watchdogs and safety caps were previously scattered across three layers
 * — the generate watchdog in the UI (`src/ui/Terminal.tsx`), the load watchdog /
 * clause / queue caps in `translatePipeline.ts`, and the prompt context cap in
 * `prompt.ts`. Collecting them here gives one place to tune the pipeline's
 * timing and bounds, and in particular lifts the generate watchdog out of the
 * UI layer where it did not belong.
 *
 * Out of scope by design (cohesive with a single consumer, not cross-cutting
 * sprawl): the capability-detection buffer thresholds stay in `capability.ts`,
 * and the output-translation miss-log ring-buffer cap stays in `missLog.ts`.
 */

/**
 * Watchdog for a single constrained generation (one line/clause). Starting
 * value; tune at the gate. Lived in `src/ui/Terminal.tsx` before F-13.
 */
export const GENERATE_WATCHDOG_MS = 8000

/**
 * Watchdog for the LAZY model load inside `generateRaw` ([M]) — far more
 * generous than the generate watchdog (multi-GB weights off disk on slow
 * devices), but bounded: an unbounded load held `translatingRef` forever when
 * it stalled (WebGPU init, cache eviction → network), wedging all input for the
 * session.
 */
export const LOAD_WATCHDOG_MS = 60_000

/**
 * NO-PROGRESS watchdog for the MODAL download path (F6). Unlike LOAD_WATCHDOG_MS
 * (a fixed total bound on a cached on-disk load), the modal fetches multi-GB
 * weights, so a fixed total timeout would kill a legitimately slow download.
 * This timer is RESET on every progress tick and fires only on genuine
 * silence — a stalled fetch that otherwise sits in `phase:'downloading'`
 * forever with manual cancel as the player's only recourse.
 */
export const DOWNLOAD_STALL_MS = 60_000

/**
 * F-8: backoff before the ONE automatic retry of a failed model download. A
 * transient network blip on the multi-GB fetch otherwise costs the player the
 * upgrade and forces a manual "✦ improve"; a single delayed retry rides out the
 * blip before degrading to grammar-only. Only a genuine rejection of the load
 * promise is retried — an abort (cancel/supersede) and a no-progress stall are
 * NOT (the player or watchdog deliberately ended it).
 */
export const DOWNLOAD_RETRY_MS = 2000

/** Safety cap: at most this many clauses run per compound input (locked decision 6). */
export const MAX_CLAUSES = 8

/**
 * F-A input queue (NL v2 §11): at most this many lines wait behind an in-flight
 * translation. Overflow drops the NEWEST line with a notice.
 */
export const QUEUE_CAP = 4

/** Cap the recent-output context fed to the LLM prompt to this many tail chars. */
export const PROMPT_CONTEXT_CAP = 1500

/**
 * Visible status marker appended to Georgian (`ka`) UI labels and copy. Georgian
 * support still has bugs, so it is flagged to players. This is cross-cutting (the
 * picker label, the two landing caveats, and the in-game activation tip all show
 * it) — exactly the "one place to tune" case this file exists for — so it lives
 * here instead of being duplicated across four display sites where it could
 * drift. Written in Georgian (`ალფა`) so the `ka` surface stays all-Georgian;
 * voiced as part of the accessible name, where the surrounding `lang="ka"` lets a
 * screen reader read it natively instead of as a Latin word with Georgian phonemes.
 */
export const GEORGIAN_STATUS_MARKER = '(ალფა)'
