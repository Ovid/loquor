import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useModelDownload, type ModelDownloadParams } from './useModelDownload'
import { FakeLlmEngine } from './engine.fake'
import { readNlPref, writeNlPref } from './nlpref'
import { DOWNLOAD_STALL_MS } from './config'
import type { LlmEngine } from './types'

// useModelDownload owns the model download / install / phase lifecycle that F-2
// extracted out of useNaturalLanguage. The NL hook's suite covers the same flow
// through its public `state`; here we drive the lifecycle hook DIRECTLY so its
// own contract — the `internal` phase machine, `installed`/`modalOpen`, the
// four player actions, and the nlpref persistence — is pinned at the unit
// boundary the NL hook composes.

function setup(
  opts: { engine?: LlmEngine } & Partial<ModelDownloadParams> = {},
) {
  const setNotice = vi.fn()
  const engine = opts.engine ?? new FakeLlmEngine()
  const hook = renderHook(() =>
    useModelDownload({
      engine,
      available: opts.available ?? true,
      hasVocab: opts.hasVocab ?? true,
      setNotice,
    }),
  )
  return { hook, setNotice, engine }
}

beforeEach(() => localStorage.clear())

describe('boot probe (isCached)', () => {
  it('not cached → off, installed:false, modal closed', async () => {
    const { hook } = setup()
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(hook.result.current.modalOpen).toBe(false)
  })

  it('cached + a stored language auto-restores to on (no re-prompt)', async () => {
    writeNlPref({ language: 'fr' })
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'fr',
      }),
    )
    expect(hook.result.current.installed).toBe(true)
  })

  it('cached but the stored pref is off → installed:true, stays off (no auto-enable)', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
  })

  it('an isCached rejection is swallowed — installed:false, no throw', async () => {
    const engine: LlmEngine = {
      load: async () => {},
      unload: async () => {},
      isLoaded: () => false,
      isCached: async () => {
        throw new Error('probe blew up')
      },
      generate: async () => '',
    }
    const { hook } = setup({ engine })
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'off' }),
    )
    expect(hook.result.current.installed).toBe(false)
  })
})

describe('requestDownload', () => {
  it('success: downloading → on (the pending language), installed:true, persisted', async () => {
    const engine = new FakeLlmEngine({
      progress: [
        { loaded: 1, total: 2, text: 'a' },
        { loaded: 2, total: 2, text: 'b' },
      ],
    })
    const { hook } = setup({ engine })
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'en', // pendingLangRef default when no setLanguage preceded it
      }),
    )
    expect(hook.result.current.installed).toBe(true)
    expect(readNlPref().language).toBe('en')
  })

  it('surfaces download progress as the downloading phase', async () => {
    // A load that emits one progress sample then blocks, so we can observe the
    // downloading phase before it resolves.
    let resolveLoad!: () => void
    const engine: LlmEngine = {
      unload: async () => {},
      isLoaded: () => false,
      isCached: async () => false,
      generate: async () => '',
      load: (onProgress, _signal) =>
        new Promise<void>(resolve => {
          onProgress({ loaded: 30, total: 100, text: '' })
          resolveLoad = resolve
        }),
    }
    const { hook } = setup({ engine })
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal).toMatchObject({
        phase: 'downloading',
        loaded: 30,
        total: 100,
      }),
    )
    // settle the blocked load so it doesn't update state after the test ends
    await act(async () => {
      resolveLoad()
    })
  })

  it('failure reverts to off, reports it through the notice channel, and logs the cause (F7)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { hook, setNotice } = setup({
        engine: new FakeLlmEngine({ failLoad: true }),
      })
      act(() => hook.result.current.requestDownload())
      await waitFor(() =>
        expect(hook.result.current.internal).toEqual({ phase: 'off' }),
      )
      expect(setNotice).toHaveBeenCalledWith(
        'Model download failed — staying grammar-only.',
      )
      // F7: the underlying error must reach the logger (ring buffer + console),
      // not be discarded.
      expect(errSpy).toHaveBeenCalledWith(
        '[nl] model download failed:',
        expect.objectContaining({ message: 'fake load failure' }),
      )
    } finally {
      errSpy.mockRestore()
    }
  })

  it('the failure notice is localized to the picked language (F1)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // Uncached engine → setLanguage('fr') opens the modal and records 'fr' as
      // the pending language; requestDownload then fails against it.
      const { hook, setNotice } = setup({
        engine: new FakeLlmEngine({ failLoad: true }),
      })
      await waitFor(() => expect(hook.result.current.installed).toBe(false))
      act(() => hook.result.current.setLanguage('fr'))
      act(() => hook.result.current.requestDownload())
      await waitFor(() =>
        expect(hook.result.current.internal).toEqual({ phase: 'off' }),
      )
      expect(setNotice).toHaveBeenCalledWith(
        'Échec du téléchargement du modèle — mode grammaire uniquement.',
      )
    } finally {
      errSpy.mockRestore()
    }
  })

  it('a stalled download (no further progress) trips the no-progress watchdog → off + notice + abort (F6)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      let sig!: AbortSignal
      const engine: LlmEngine = {
        unload: async () => {},
        isLoaded: () => false,
        isCached: async () => false,
        generate: async () => '',
        // One progress sample, then silence forever — a stalled fetch.
        load: (onProgress, signal) =>
          new Promise<void>(() => {
            sig = signal
            onProgress({ loaded: 10, total: 100, text: '' })
          }),
      }
      const { hook, setNotice } = setup({ engine })
      act(() => hook.result.current.requestDownload())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DOWNLOAD_STALL_MS + 100)
      })
      expect(hook.result.current.internal).toEqual({ phase: 'off' })
      expect(setNotice).toHaveBeenCalledWith(
        'Model download stalled — staying grammar-only.',
      )
      expect(sig.aborted).toBe(true) // the orphaned load was actually aborted
      expect(errSpy).toHaveBeenCalledWith(
        '[nl] model download stalled — no progress, aborting',
      )
    } finally {
      vi.useRealTimers()
      errSpy.mockRestore()
    }
  })

  it('a re-picked download keeps its OWN stall watchdog when the superseded load rejects ([I1])', async () => {
    // Re-pick race: download #1 arms the (shared) stall timer; the player
    // re-picks → download #2 supersedes it and re-arms the timer for ITSELF.
    // Aborting #1 makes its load reject AbortError a microtask later — that
    // .catch must NOT clear #2's live watchdog (the bug F6 would silently lose).
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      const signals: AbortSignal[] = []
      let calls = 0
      const engine: LlmEngine = {
        unload: async () => {},
        isLoaded: () => false,
        isCached: async () => false,
        generate: async () => '',
        // Each load emits one progress sample then waits; it rejects only when
        // its own signal aborts (supersede for #1, watchdog for #2).
        load: (onProgress, signal) =>
          new Promise<void>((_resolve, reject) => {
            signals[calls++] = signal
            onProgress({ loaded: 10, total: 100, text: '' })
            signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          }),
      }
      const { hook, setNotice } = setup({ engine })
      act(() => hook.result.current.requestDownload()) // download #1
      act(() => hook.result.current.requestDownload()) // re-pick → #2 supersedes
      // Flush #1's AbortError .catch (the microtask that, pre-fix, cleared #2's timer).
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(signals[0].aborted).toBe(true) // #1 superseded
      expect(signals[1].aborted).toBe(false) // #2 still live...
      // ...and its watchdog must still be armed: genuine silence trips it.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DOWNLOAD_STALL_MS + 100)
      })
      expect(hook.result.current.internal).toEqual({ phase: 'off' })
      expect(setNotice).toHaveBeenCalledWith(
        'Model download stalled — staying grammar-only.',
      )
      expect(signals[1].aborted).toBe(true) // #2's watchdog aborted it
    } finally {
      vi.useRealTimers()
      errSpy.mockRestore()
    }
  })

  it('unmount aborts the in-flight load and clears the stall timer — no post-unmount state ([I2])', async () => {
    vi.useFakeTimers()
    try {
      let sig!: AbortSignal
      const engine: LlmEngine = {
        unload: async () => {},
        isLoaded: () => false,
        isCached: async () => false,
        generate: async () => '',
        // Ignores its signal and never settles — only the unmount cleanup can
        // stop the timer and abort the fetch.
        load: (onProgress, signal) =>
          new Promise<void>(() => {
            sig = signal
            onProgress({ loaded: 10, total: 100, text: '' })
          }),
      }
      const { hook, setNotice } = setup({ engine })
      act(() => hook.result.current.requestDownload())
      expect(sig.aborted).toBe(false)
      act(() => hook.unmount())
      expect(sig.aborted).toBe(true) // in-flight load aborted on unmount
      // The stall timer must NOT fire after unmount (no setState on a dead tree).
      setNotice.mockClear()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DOWNLOAD_STALL_MS + 100)
      })
      expect(setNotice).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('setLanguage', () => {
  it('a cached model activates the chosen language immediately and persists it', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    act(() => hook.result.current.setLanguage('de'))
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'de',
    })
    expect(readNlPref().language).toBe('de')
  })

  it('no cached model opens the modal; the subsequent download activates THAT language', async () => {
    const { hook } = setup() // not cached, not loaded
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    act(() => hook.result.current.setLanguage('es'))
    expect(hook.result.current.modalOpen).toBe(true)
    expect(hook.result.current.internal).toEqual({ phase: 'off' }) // not yet on
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'es', // the language picked when the modal opened
      }),
    )
    expect(hook.result.current.modalOpen).toBe(false)
    expect(readNlPref().language).toBe('es')
  })

  it("'off' turns the layer off instantly and persists 'off' (model stays cached)", async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
    })
    act(() => hook.result.current.setLanguage('off'))
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(readNlPref().language).toBe('off')
  })

  it('is a no-op when the layer is unavailable (tier none)', async () => {
    const { hook } = setup({ available: false })
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(hook.result.current.modalOpen).toBe(false)
  })

  it('is a no-op when the game has no vocab', async () => {
    const { hook } = setup({ hasVocab: false })
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(hook.result.current.modalOpen).toBe(false)
  })
})

describe('declineDownload', () => {
  it('closes the modal, stays off, and persists declined + off', async () => {
    const { hook } = setup()
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    act(() => hook.result.current.setLanguage('fr')) // opens the modal
    expect(hook.result.current.modalOpen).toBe(true)
    act(() => hook.result.current.declineDownload())
    expect(hook.result.current.modalOpen).toBe(false)
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(readNlPref()).toEqual({ language: 'off', declined: true })
  })
})

describe('cancelDownload', () => {
  it('aborts an in-flight load, reverts to off, and persists off', async () => {
    let rejectLoad!: (e: unknown) => void
    const engine: LlmEngine = {
      unload: async () => {},
      isLoaded: () => false,
      isCached: async () => false,
      generate: async () => '',
      load: (_p, signal) =>
        new Promise<void>((_resolve, reject) => {
          rejectLoad = reject
          signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    }
    const { hook } = setup({ engine })
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal.phase).toBe('downloading'),
    )
    await act(async () => {
      hook.result.current.cancelDownload()
    })
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(readNlPref().language).toBe('off')
    expect(rejectLoad).toBeDefined() // (load was wired to the abort signal)
  })

  it('a load that RESOLVES after cancel does not flip on or persist a language ([P])', async () => {
    // This load ignores the abort signal and resolves anyway — the stale()
    // guard, not the rejection, must keep a cancelled download off.
    let resolveLoad!: () => void
    const engine: LlmEngine = {
      unload: async () => {},
      isLoaded: () => false,
      isCached: async () => false,
      generate: async () => '',
      load: () =>
        new Promise<void>(resolve => {
          resolveLoad = resolve
        }),
    }
    const { hook } = setup({ engine })
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal.phase).toBe('downloading'),
    )
    act(() => hook.result.current.cancelDownload())
    await act(async () => {
      resolveLoad() // the superseded load settles after the cancel
      await Promise.resolve()
    })
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(readNlPref().language).toBe('off') // never flipped to a language
  })
})
