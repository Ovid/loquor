import { describe, it, expect, vi } from 'vitest'
import { runGenerationGuarded } from './guardedGenerate'
import type { ChatMessages, LlmEngine, LoadProgress } from './types'

const MSGS: ChatMessages = [{ role: 'user', content: 'hi' }]
const timeout = () => new Error('TIMEOUT')

function engineWith(generate: LlmEngine['generate']): LlmEngine {
  return {
    generate,
    async load(
      _p: (p: LoadProgress) => void,
      _s: AbortSignal,
    ): Promise<void> {},
    async unload(): Promise<void> {},
    isLoaded(): boolean {
      return true
    },
    async isCached(): Promise<boolean> {
      return true
    },
  }
}

/** Rejects (AbortError or a genuine fault) only after the watchdog aborts it. */
const hangThenReject =
  (err: Error): LlmEngine['generate'] =>
  (_p, _g, signal) =>
    new Promise<string>((_res, rej) => {
      signal?.addEventListener('abort', () => setTimeout(() => rej(err), 10))
    })

describe('runGenerationGuarded (review I2)', () => {
  it('returns the generation result when it beats the watchdog', async () => {
    const engine = engineWith(async () => 'done')
    await expect(
      runGenerationGuarded({
        engine,
        messages: MSGS,
        grammar: null,
        watchdogMs: 1000,
        timeoutError: timeout,
      }),
    ).resolves.toBe('done')
  })

  it('rejects with timeoutError on a wedge, only AFTER the aborted gen settles', async () => {
    let settled = false
    const engine = engineWith(
      (_p, _g, signal) =>
        new Promise<string>((_res, rej) => {
          signal?.addEventListener('abort', () =>
            setTimeout(() => {
              settled = true
              rej(new DOMException('aborted', 'AbortError'))
            }, 20),
          )
        }),
    )
    let thrown: unknown
    await runGenerationGuarded({
      engine,
      messages: MSGS,
      grammar: null,
      watchdogMs: 10,
      timeoutError: timeout,
    }).catch(e => {
      thrown = e
    })
    expect((thrown as Error).message).toBe('TIMEOUT')
    // the gate-holding invariant: the helper waited for the orphan to settle
    expect(settled).toBe(true)
  })

  it('surfaces a non-abort orphan rejection via onOrphanError (a dead engine)', async () => {
    const onOrphanError = vi.fn()
    const engine = engineWith(hangThenReject(new Error('device lost')))
    await runGenerationGuarded({
      engine,
      messages: MSGS,
      grammar: null,
      watchdogMs: 10,
      timeoutError: timeout,
      onOrphanError,
    }).catch(() => {})
    expect(onOrphanError).toHaveBeenCalledTimes(1)
    expect((onOrphanError.mock.calls[0][0] as Error).message).toBe(
      'device lost',
    )
  })

  it('bounds the orphan-settle wait so a never-settling generation cannot wedge the gate for the session (review S2)', async () => {
    const onOrphanError = vi.fn()
    // generate() never settles — not even after ac.abort() (a wedged worker /
    // lost device). An unbounded `await gen` in the finally would hold the
    // shared EngineGate forever, wedging both input and output.
    const engine = engineWith(() => new Promise<string>(() => {}))
    let thrown: unknown
    await runGenerationGuarded({
      engine,
      messages: MSGS,
      grammar: null,
      watchdogMs: 10,
      timeoutError: timeout,
      orphanSettleMs: 30,
      onOrphanError,
    }).catch(e => {
      thrown = e
    })
    // still rejects with the watchdog's timeout (control flow unchanged)…
    expect((thrown as Error).message).toBe('TIMEOUT')
    // …but the finally returned (gate released) and reported the dead engine
    expect(onOrphanError).toHaveBeenCalledTimes(1)
    expect(String((onOrphanError.mock.calls[0][0] as Error).message)).toContain(
      'did not settle',
    )
  })

  it('does NOT surface an expected AbortError orphan', async () => {
    const onOrphanError = vi.fn()
    const engine = engineWith(
      hangThenReject(new DOMException('aborted', 'AbortError')),
    )
    await runGenerationGuarded({
      engine,
      messages: MSGS,
      grammar: null,
      watchdogMs: 10,
      timeoutError: timeout,
      onOrphanError,
    }).catch(() => {})
    expect(onOrphanError).not.toHaveBeenCalled()
  })

  it('does NOT surface anything when the generation resolves normally', async () => {
    const onOrphanError = vi.fn()
    const engine = engineWith(async () => 'fine')
    await runGenerationGuarded({
      engine,
      messages: MSGS,
      grammar: null,
      watchdogMs: 1000,
      timeoutError: timeout,
      onOrphanError,
    })
    expect(onOrphanError).not.toHaveBeenCalled()
  })

  it('registers the AbortController in acs during flight and removes it after', async () => {
    const acs = new Set<AbortController>()
    let sizeDuring = -1
    const engine = engineWith(async () => {
      sizeDuring = acs.size
      return 'ok'
    })
    await runGenerationGuarded({
      engine,
      messages: MSGS,
      grammar: null,
      watchdogMs: 1000,
      timeoutError: timeout,
      acs,
    })
    expect(sizeDuring).toBe(1)
    expect(acs.size).toBe(0)
  })
})
