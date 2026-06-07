import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNaturalLanguage } from './useNaturalLanguage'
import { FakeLlmEngine } from './engine.fake'
import { readNlPref } from './nlpref'
import type { CapabilityResult } from './types'

const capable: CapabilityResult = { tier: 'small', reasons: [] }
const ctx = () => ({ location: 'West of House', recentOutput: '' })

function setup(over: Partial<Parameters<typeof useNaturalLanguage>[0]> = {}) {
  const echoLocal = vi.fn()
  const sendLine = vi.fn()
  const engine = over.engine ?? new FakeLlmEngine({ default: '__UNKNOWN__' })
  const hook = renderHook(() =>
    useNaturalLanguage({
      engine,
      capability: capable,
      grammar: 'GRAMMAR',
      getContext: ctx,
      echoLocal,
      sendLine,
      watchdogMs: 5000,
      ...over,
    }),
  )
  return { hook, echoLocal, sendLine, engine }
}

// Reach the 'on' state through the REAL download path (no test-only back door).
async function reachOn(hook: ReturnType<typeof setup>['hook']) {
  act(() => hook.result.current.requestDownload())
  await waitFor(() => expect(hook.result.current.state.phase).toBe('on'))
}

describe('useNaturalLanguage', () => {
  beforeEach(() => localStorage.clear())

  it('tier none → unavailable (offers override)', () => {
    const { hook } = setup({
      capability: { tier: 'none', reasons: ['no-webgpu'] },
    })
    expect(hook.result.current.state.phase).toBe('unavailable')
  })

  it('grammar null → disabled (silent), not unavailable', () => {
    const { hook } = setup({ grammar: null })
    expect(hook.result.current.state.phase).toBe('disabled')
  })

  it('capable + not cached → off (installed:false)', async () => {
    const { hook } = setup()
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({
        phase: 'off',
        installed: false,
      }),
    )
  })

  it('capable + cached → off (installed:true), no re-download needed', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({
        phase: 'off',
        installed: true,
      }),
    )
  })

  it('download success transitions off → on', async () => {
    const engine = new FakeLlmEngine({
      progress: [
        { loaded: 1, total: 2, text: 'a' },
        { loaded: 2, total: 2, text: 'b' },
      ],
    })
    const { hook } = setup({ engine })
    await reachOn(hook)
  })

  it('load failure reverts to off and sets a notice', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ failLoad: true }) })
    act(() => hook.result.current.requestDownload())
    await waitFor(() => expect(hook.result.current.state.phase).toBe('off'))
    expect(hook.result.current.notice).toBeTruthy()
  })

  it('command translation echoes English then sends the canonical command', async () => {
    const engine = new FakeLlmEngine({
      completions: { 'grab the lantern': 'take lantern' },
    })
    const { hook, echoLocal, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('grab the lantern')
    })
    expect(echoLocal).toHaveBeenCalledWith('grab the lantern')
    expect(sendLine).toHaveBeenCalledWith('take lantern')
  })

  it('abstain sends the raw English (no echoLocal)', async () => {
    const { hook, echoLocal, sendLine } = setup({
      engine: new FakeLlmEngine({ default: '__UNKNOWN__' }),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('what should I do?')
    })
    expect(echoLocal).not.toHaveBeenCalled()
    expect(sendLine).toHaveBeenCalledWith('what should I do?')
  })

  it('locks input (pending=true) while a translation is in flight', async () => {
    const engine = new FakeLlmEngine({
      generateDelayMs: 50,
      completions: { go: 'north' },
    })
    const { hook } = setup({ engine })
    await reachOn(hook)
    let p!: Promise<void>
    act(() => {
      p = hook.result.current.translate('go')
    })
    expect(hook.result.current.pending).toBe(true)
    await act(async () => {
      await p
    })
    expect(hook.result.current.pending).toBe(false)
  })

  it('generate failure falls back to raw pass-through with a notice', async () => {
    const { hook, sendLine } = setup({
      engine: new FakeLlmEngine({ failGenerate: true }),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('take lantern')
    })
    expect(sendLine).toHaveBeenCalledWith('take lantern')
    expect(hook.result.current.notice).toBeTruthy()
  })

  it('a watchdog timeout falls back to raw pass-through with a notice', async () => {
    const engine = new FakeLlmEngine({ generateDelayMs: 10000 })
    const { hook, sendLine } = setup({ engine, watchdogMs: 1000 })
    await reachOn(hook) // real timers: load resolves immediately
    vi.useFakeTimers()
    let p!: Promise<void>
    act(() => {
      p = hook.result.current.translate('take lantern')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
      await p
    })
    expect(sendLine).toHaveBeenCalledWith('take lantern')
    expect(hook.result.current.notice).toMatch(/timed out/i)
    vi.useRealTimers()
  })

  it('decline persists (declined=true) and closes the modal', async () => {
    const { hook } = setup()
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({ phase: 'off' }),
    )
    act(() => hook.result.current.toggle()) // not installed → opens modal
    expect(hook.result.current.modalOpen).toBe(true)
    act(() => hook.result.current.declineDownload())
    expect(hook.result.current.modalOpen).toBe(false)
    expect(readNlPref().declined).toBe(true)
  })

  it('decline clears a stale enabled:true so it cannot auto-restore to on', async () => {
    // A prior session persisted enabled:true, but the model is NOT cached now, so
    // the hook stays off and offers the modal. Declining must wipe enabled — else
    // the isCached effect re-enables NL the moment the model becomes cached.
    localStorage.setItem('loquor.nl', JSON.stringify({ enabled: true }))
    const { hook } = setup() // not cached → stays off
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({ phase: 'off' }),
    )
    act(() => hook.result.current.toggle()) // not installed → opens modal
    act(() => hook.result.current.declineDownload())
    expect(readNlPref().enabled).toBe(false)
    expect(readNlPref().declined).toBe(true)
  })

  it('cancelDownload aborts an in-flight load, reverts to off, persists nothing', async () => {
    // Use an engine whose load never resolves until the abort signal fires.
    // This guarantees the cancel path is exercised (AbortError caught, enabled
    // NOT written) rather than a race where the load finishes first.
    let resolveLoad!: () => void
    const blockingEngine: import('./types').LlmEngine = {
      isCached: async () => false,
      isLoaded: () => false,
      unload: async () => {},
      generate: async () => '__UNKNOWN__',
      load: (_onProgress, signal) =>
        new Promise<void>((resolve, reject) => {
          resolveLoad = resolve
          signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    }
    const { hook } = setup({ engine: blockingEngine })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({ phase: 'off' }),
    )
    act(() => hook.result.current.requestDownload())
    // Confirm we are now in the downloading state (load is in-flight).
    expect(hook.result.current.state.phase).toBe('downloading')
    act(() => hook.result.current.cancelDownload())
    await waitFor(() => expect(hook.result.current.state.phase).toBe('off'))
    expect(hook.result.current.notice).toBeNull()
    expect(readNlPref().enabled).toBe(false)
    // Resolve the internal promise to avoid unhandled-rejection noise.
    resolveLoad()
  })

  it('a load that RESOLVES after cancel does not flip on / persist enabled', async () => {
    // The dangerous race (review I2): cancel aborts + sets off, then the
    // underlying load resolves anyway (it ignored the signal). Without a stale
    // guard the .then would clobber off→on and persist enabled against the cancel.
    let resolveLoad!: () => void
    const racingEngine: import('./types').LlmEngine = {
      isCached: async () => false,
      isLoaded: () => false,
      unload: async () => {},
      generate: async () => '__UNKNOWN__',
      load: () => new Promise<void>(resolve => (resolveLoad = resolve)),
    }
    const { hook } = setup({ engine: racingEngine })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({ phase: 'off' }),
    )
    act(() => hook.result.current.requestDownload())
    expect(hook.result.current.state.phase).toBe('downloading')
    act(() => hook.result.current.cancelDownload())
    await act(async () => {
      resolveLoad() // load resolves AFTER the cancel
    })
    expect(hook.result.current.state.phase).toBe('off')
    expect(readNlPref().enabled).toBe(false)
  })

  it('restores the enabled choice on remount when the model is cached', async () => {
    const a = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await reachOn(a.hook) // persists enabled=true
    expect(readNlPref().enabled).toBe(true)
    a.hook.unmount()
    // Fresh mount, cached engine → should auto-restore 'on'.
    const b = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(b.hook.result.current.state.phase).toBe('on'))
  })
})
