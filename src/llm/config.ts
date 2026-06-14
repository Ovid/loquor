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

/** Safety cap: at most this many clauses run per compound input (locked decision 6). */
export const MAX_CLAUSES = 8

/**
 * F-A input queue (NL v2 §11): at most this many lines wait behind an in-flight
 * translation. Overflow drops the NEWEST line with a notice.
 */
export const QUEUE_CAP = 4

/** Cap the recent-output context fed to the LLM prompt to this many tail chars. */
export const PROMPT_CONTEXT_CAP = 1500
