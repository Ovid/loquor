// The shared generate-under-watchdog body for the single, non-reentrant WebLLM
// engine (review I2). Both the input (useNaturalLanguage) and output
// (useOutputTranslation) hooks raced engine.generate() against a watchdog and
// then held the gate until the orphaned generation settled — ~20 lines of
// subtle abort/handoff logic copy-pasted across the two most
// concurrency-sensitive seams in the app. A fix applied to one copy and not the
// other would reintroduce the overlapping-generation race. This is the single
// source of truth for that core; the parts the two hooks DON'T share (NL's
// lazy-load watchdog, the per-hook pre-checks and sentinel error types) stay in
// the hooks.
import type { ChatMessages, LlmEngine } from '../llm/types'

/** True for a cancellation (DOMException or any Error named 'AbortError') —
 * matches useNaturalLanguage's `err.name === 'AbortError'` check (review S5).
 * DOMException is not reliably `instanceof Error`, so test the name shape. */
function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'AbortError'
  )
}

export interface GuardedGenerateArgs {
  engine: LlmEngine
  messages: ChatMessages
  grammar: string | null
  watchdogMs: number
  /** Builds the rejection thrown when the watchdog fires. Each caller keeps its
   * own sentinel (WatchdogTimeout / ExpectedXlateStop) so its outer catch
   * classifies the timeout exactly as before — the helper never imposes one. */
  timeoutError: () => Error
  /** Register/unregister the AbortController so an unmount/teardown can cancel
   * an in-flight generation (the output hook's acsRef). Omitted by callers that
   * don't track in-flight controllers. */
  acs?: Set<AbortController>
  /** Upper bound (ms) on how long the finally waits for an orphaned generation
   * to settle after ac.abort() before treating the engine as DEAD and releasing
   * the gate (review S2). A wedged worker / lost device can leave generate()
   * pending forever; an unbounded await would hold the shared gate for the
   * whole session. Generous by default so only a truly wedged engine trips it
   * (a healthy engine honours the abort in well under a second). */
  orphanSettleMs?: number
  /** Invoked when the WATCHDOG won the race AND the orphaned generation then
   * settled with a GENUINE (non-abort) rejection — a hard-dead engine (crash /
   * WebGPU device lost) that the bare `await gen.catch(() => {})` used to
   * swallow, misclassifying it as a transient timeout (review I2). Control flow
   * is unchanged (the timeout is still what the race threw, so the one-shot
   * retry still applies); this only makes the masked fault diagnosable. The
   * caller logs it with its own prefix. */
  onOrphanError?: (err: unknown) => void
}

/**
 * Race engine.generate() against a watchdog, holding the gate until the
 * (possibly aborted) generation settles.
 *
 * MUST be called INSIDE EngineGate.run: when the watchdog wins, ac.abort() only
 * REQUESTS the worker to stop — gen is still settling its interrupt on the one
 * shared engine. EngineGate hands the gate off in its finally, so returning
 * before gen settles would let the next waiter call generate() and overlap two
 * generations on a non-reentrant engine. Awaiting gen's settlement here keeps
 * the mutual-exclusion invariant.
 */
export async function runGenerationGuarded(
  args: GuardedGenerateArgs,
): Promise<string> {
  const { engine, messages, grammar, watchdogMs, timeoutError, acs } = args
  const orphanSettleMs = args.orphanSettleMs ?? 30_000
  const ac = new AbortController()
  acs?.add(ac)
  let watchdogId: ReturnType<typeof setTimeout>
  let timedOut = false
  const watchdog = new Promise<never>((_, rej) => {
    watchdogId = setTimeout(() => {
      // Reject FIRST so the watchdog wins the race (keeping the "timed out"
      // classification accurate), THEN abort the now-orphaned generate.
      timedOut = true
      rej(timeoutError())
      ac.abort()
    }, watchdogMs)
  })
  const gen = engine.generate(messages, grammar, ac.signal)
  try {
    return await Promise.race([gen, watchdog])
  } finally {
    clearTimeout(watchdogId!)
    acs?.delete(ac)
    // A normal rejection was already delivered to the caller via the race, so
    // swallow the duplicate here. But if the WATCHDOG won and the orphan then
    // rejected with a genuine non-abort error, surface it distinctly so a dead
    // engine isn't hidden behind the transient timeout (review I2).
    //
    // Normally gen has already settled (the race returned because gen won) or
    // settles promptly after ac.abort(). But a wedged worker / lost device can
    // leave gen pending forever; an unbounded await here would hold the shared
    // EngineGate for the whole session, wedging BOTH input and output (review
    // S2). Bound the wait: if the orphan doesn't settle within orphanSettleMs,
    // treat the engine as dead, surface it, and release the gate. (Accepts a
    // small overlap risk against a merely-very-slow engine in exchange for not
    // deadlocking the session; the bound is generous so only a truly wedged
    // engine trips it.) gen keeps its rejection handler attached either way, so
    // a late settlement never becomes an unhandled rejection.
    let settleTimer: ReturnType<typeof setTimeout>
    const settleGuard = new Promise<'orphaned'>(res => {
      settleTimer = setTimeout(() => res('orphaned'), orphanSettleMs)
    })
    const settled = gen.then(
      () => 'settled' as const,
      err => {
        if (timedOut && !isAbortError(err)) args.onOrphanError?.(err)
        return 'settled' as const
      },
    )
    const outcome = await Promise.race([settled, settleGuard])
    clearTimeout(settleTimer!)
    if (outcome === 'orphaned')
      args.onOrphanError?.(
        new Error(
          `orphaned generation did not settle within ${orphanSettleMs}ms after abort — treating the engine as dead`,
        ),
      )
  }
}
