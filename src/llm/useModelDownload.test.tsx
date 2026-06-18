import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useModelDownload, type ModelDownloadParams } from './useModelDownload'
import { FakeLlmEngine } from './engine.fake'
import { readNlPref, writeNlPref } from './nlpref'
import { DOWNLOAD_STALL_MS, DOWNLOAD_RETRY_MS } from './config'
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
        model: 'full',
      }),
    )
    expect(hook.result.current.installed).toBe(true)
  })

  it('cached but the stored pref is off → installed:true, stays off (no auto-enable)', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
  })

  it('a pick during the async probe upgrades to full and dismisses the spurious modal when the model is cached ([I1])', async () => {
    let resolveCached!: (v: boolean) => void
    const engine: LlmEngine = {
      load: async () => {},
      unload: async () => {},
      isLoaded: () => false,
      isCached: () =>
        new Promise<boolean>(r => {
          resolveCached = r
        }),
      generate: async () => '',
    }
    const { hook } = setup({ engine })
    // Player picks before isCached resolves → installed still false → on/grammar
    // with the upgrade modal (the regression: a cached player stuck in basic).
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
    })
    expect(hook.result.current.modalOpen).toBe(true)
    // Probe resolves: the model IS cached → promote the pick to full and dismiss
    // the spurious download offer.
    await act(async () => {
      resolveCached(true)
      await Promise.resolve()
    })
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'full',
    })
    expect(hook.result.current.modalOpen).toBe(false)
    expect(hook.result.current.installed).toBe(true)
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
  it('success: downloading → on/full (the pending language), installed:true, persisted', async () => {
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
        model: 'full',
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

  it('a persistent failure degrades to grammar-only after the one retry, reports it via the notice channel, and logs the cause (F7/F-8)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      const { hook, setNotice } = setup({
        engine: new FakeLlmEngine({ failLoad: true }),
      })
      act(() => hook.result.current.requestDownload())
      // First attempt fails → one backoff retry (F-8) → still fails → degrade.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DOWNLOAD_RETRY_MS + 100)
      })
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'en',
        model: 'grammar',
      })
      expect(setNotice).toHaveBeenCalledWith(
        'AI model download failed — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
      )
      // F7: the final (post-retry) error must reach the logger, not be discarded.
      expect(errSpy).toHaveBeenCalledWith(
        '[nl] model download failed:',
        expect.objectContaining({ message: 'fake load failure' }),
      )
      // F-8: the transient retry attempt is logged as a warn, exactly once.
      expect(warnSpy).toHaveBeenCalledWith(
        '[nl] model download failed — retrying once after backoff:',
        expect.objectContaining({ message: 'fake load failure' }),
      )
      expect(warnSpy).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
      warnSpy.mockRestore()
      errSpy.mockRestore()
    }
  })

  it('a transient failure recovers on the one automatic retry → on/full, no failure notice (F-8)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      let calls = 0
      const engine: LlmEngine = {
        unload: async () => {},
        isLoaded: () => false,
        isCached: async () => false,
        generate: async () => '',
        // First load rejects (a transient blip); the retry succeeds.
        load: async onProgress => {
          calls++
          if (calls === 1) throw new Error('transient blip')
          onProgress({ loaded: 1, total: 1, text: 'done' })
        },
      }
      const { hook, setNotice } = setup({ engine })
      act(() => hook.result.current.requestDownload())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DOWNLOAD_RETRY_MS + 100)
      })
      expect(calls).toBe(2) // failed once, retried once
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'en',
        model: 'full',
      })
      expect(hook.result.current.installed).toBe(true)
      // The transient failure is a warn; the player never sees a basic-mode notice.
      expect(warnSpy).toHaveBeenCalledWith(
        '[nl] model download failed — retrying once after backoff:',
        expect.objectContaining({ message: 'transient blip' }),
      )
      expect(setNotice).not.toHaveBeenCalledWith(
        expect.stringContaining('basic mode'),
      )
    } finally {
      vi.useRealTimers()
      warnSpy.mockRestore()
    }
  })

  it('the failure notice is localized to the picked language (F1)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      // Uncached engine → setLanguage('fr') sets on/grammar and records 'fr' as
      // the pending language; requestDownload then fails (after one retry),
      // staying grammar-only.
      const { hook, setNotice } = setup({
        engine: new FakeLlmEngine({ failLoad: true }),
      })
      act(() => hook.result.current.setLanguage('fr'))
      act(() => hook.result.current.requestDownload())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DOWNLOAD_RETRY_MS + 100)
      })
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'fr',
        model: 'grammar',
      })
      expect(setNotice).toHaveBeenCalledWith(
        'Échec du téléchargement du modèle d’IA — passage en mode simplifié. Les commandes courantes fonctionnent toujours ; resélectionnez la mise à niveau pour réessayer.',
      )
    } finally {
      vi.useRealTimers()
      warnSpy.mockRestore()
      errSpy.mockRestore()
    }
  })

  it('a stalled download (no further progress) trips the no-progress watchdog → grammar-only + notice + abort (F6)', async () => {
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
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'en',
        model: 'grammar',
      })
      expect(setNotice).toHaveBeenCalledWith(
        'AI model download stalled — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
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
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'en',
        model: 'grammar',
      })
      expect(setNotice).toHaveBeenCalledWith(
        'AI model download stalled — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
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
  it('a cached model activates the chosen language immediately as full and persists it', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    act(() => hook.result.current.setLanguage('de'))
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'de',
      model: 'full',
    })
    expect(readNlPref().language).toBe('de')
  })

  it('no cached model opens the modal and sets grammar-only; the subsequent download upgrades to full', async () => {
    const { hook } = setup() // not cached, not loaded
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    act(() => hook.result.current.setLanguage('es'))
    expect(hook.result.current.modalOpen).toBe(true)
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'es',
      model: 'grammar',
    })
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'es', // the language picked when the modal opened
        model: 'full',
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
      model: 'full',
    })
    act(() => hook.result.current.setLanguage('off'))
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(readNlPref().language).toBe('off')
  })

  it("'off' mid-download aborts the load and stays off — a late resolve can't re-enable NL ([C1])", async () => {
    let resolveLoad!: () => void
    let sig!: AbortSignal
    const engine: LlmEngine = {
      unload: async () => {},
      isLoaded: () => false,
      isCached: async () => false,
      generate: async () => '',
      load: (_p, signal) =>
        new Promise<void>(resolve => {
          sig = signal
          resolveLoad = resolve
        }),
    }
    const { hook } = setup({ engine })
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    act(() => hook.result.current.setLanguage('fr')) // on/grammar + pending fr
    act(() => hook.result.current.requestDownload()) // downloading
    await waitFor(() =>
      expect(hook.result.current.internal.phase).toBe('downloading'),
    )
    act(() => hook.result.current.setLanguage('off'))
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(sig.aborted).toBe(true) // the in-flight load was actually aborted
    // The superseded load resolving afterwards must NOT flip back to on/full or
    // re-persist a language the player turned off (the stale() guard holds).
    await act(async () => {
      resolveLoad()
      await Promise.resolve()
    })
    expect(hook.result.current.internal).toEqual({ phase: 'off' })
    expect(readNlPref().language).toBe('off')
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
  it('closes the modal, keeps grammar-only active, and persists declined (language stays)', async () => {
    const { hook } = setup()
    await waitFor(() => expect(hook.result.current.installed).toBe(false))
    act(() => hook.result.current.setLanguage('fr')) // sets on/grammar + opens modal
    expect(hook.result.current.modalOpen).toBe(true)
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
    })
    act(() => hook.result.current.declineDownload())
    expect(hook.result.current.modalOpen).toBe(false)
    // grammar-only stays active — declined only suppresses the auto-modal
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
    })
    expect(readNlPref().declined).toBe(true)
    expect(readNlPref().language).toBe('fr') // language stays persisted
  })
})

describe('cancelDownload', () => {
  it('aborts an in-flight load, returns to grammar-only, and persists the pending language', async () => {
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
    // pendingLangRef defaults to 'en'; grammar-only is active while downloading
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal.phase).toBe('downloading'),
    )
    await act(async () => {
      hook.result.current.cancelDownload()
    })
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'en',
      model: 'grammar',
    })
    expect(readNlPref().language).toBe('en')
    expect(rejectLoad).toBeDefined() // (load was wired to the abort signal)
  })

  it('a load that RESOLVES after cancel stays grammar-only (stale guard) ([P])', async () => {
    // This load ignores the abort signal and resolves anyway — the stale()
    // guard must not flip the state to on/full after cancel.
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
    // cancel already wrote on/grammar; the stale .then must not override it
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'en',
      model: 'grammar',
    })
    expect(readNlPref().language).toBe('en')
  })
})

describe('grammar-only fallback', () => {
  it('pick a language with no model → on/grammar immediately, no download', async () => {
    const { hook, engine } = setup()
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'off' }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
    })
    expect((engine as FakeLlmEngine).generateCalls).toBe(0)
    expect(readNlPref().language).toBe('fr')
  })

  it('pick with model cached → on/full, no eager load', async () => {
    const { hook, engine } = setup({
      engine: new FakeLlmEngine({ cached: true }),
    })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'full',
    })
    expect((engine as FakeLlmEngine).isLoaded()).toBe(false) // load is lazy — only on the first stage-7 miss
  })

  it('first pick opens the upgrade modal once; "Not now" keeps grammar-only', async () => {
    const { hook } = setup()
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'off' }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.modalOpen).toBe(true)
    act(() => hook.result.current.declineDownload())
    expect(hook.result.current.modalOpen).toBe(false)
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
    })
    expect(readNlPref().declined).toBe(true)
  })

  it('after declining once, a later pick does NOT reopen the modal', async () => {
    writeNlPref({ declined: true })
    const { hook } = setup()
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'off' }),
    )
    act(() => hook.result.current.setLanguage('de'))
    expect(hook.result.current.modalOpen).toBe(false)
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'de',
      model: 'grammar',
    })
  })

  it('requestUpgrade reopens the modal on demand', async () => {
    writeNlPref({ declined: true })
    const { hook } = setup()
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'off' }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.modalOpen).toBe(false)
    act(() => hook.result.current.requestUpgrade())
    expect(hook.result.current.modalOpen).toBe(true)
  })

  it('download failure stays in grammar-only (not off) with a notice, after the retry', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      const { hook, setNotice } = setup({
        engine: new FakeLlmEngine({ failLoad: true }),
      })
      act(() => hook.result.current.setLanguage('fr')) // on/grammar + pendingLang fr, modal open
      act(() => hook.result.current.requestDownload())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DOWNLOAD_RETRY_MS + 100)
      })
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'fr',
        model: 'grammar',
      })
      expect(setNotice).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
      warnSpy.mockRestore()
      errSpy.mockRestore()
    }
  })

  it('successful download upgrades to on/full', async () => {
    const { hook } = setup({
      engine: new FakeLlmEngine({
        progress: [{ loaded: 1, total: 1, text: 'done' }],
      }),
    })
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'off' }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'fr',
        model: 'full',
      }),
    )
  })

  it('demoteToGrammar flips on/full → on/grammar (idempotent on grammar)', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    act(() => hook.result.current.setLanguage('fr')) // on/full
    act(() => hook.result.current.demoteToGrammar())
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
    })
    act(() => hook.result.current.demoteToGrammar()) // no-op when already grammar
    expect(hook.result.current.internal).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
    })
  })

  it('reload with a persisted language restores grammar-only when uncached', async () => {
    writeNlPref({ language: 'es' })
    const { hook } = setup() // not cached
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'es',
        model: 'grammar',
      }),
    )
  })

  it('reload with a persisted language restores full when cached', async () => {
    writeNlPref({ language: 'es' })
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({
        phase: 'on',
        language: 'es',
        model: 'full',
      }),
    )
  })
})
