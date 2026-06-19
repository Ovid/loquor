import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNaturalLanguage } from './useNaturalLanguage'
import { FakeLlmEngine } from './engine.fake'
import { readNlPref, writeNlPref } from './nlpref'
import { EngineGate } from '../shared/engineGate'
import type { CapabilityResult } from './types'
import type { Vocab } from './grammar/types'
import {
  TAKE_ACK,
  DROP_ACK,
  ABSENCE_PAT,
  FAILURE_PAT,
} from './grammar/patterns'
import { DOWNLOAD_RETRY_MS } from './config'
import { emptyView } from '../glkote-react/types'
import type { ViewState, BufferLine, TurnResult } from '../glkote-react/types'
import { ZORK1_SIG } from './grammar/index'
import { ZORK1_VOCAB } from './grammar/zork1.vocab'

// A test that fails (or times out) between useFakeTimers/useRealTimers must
// not poison every later test in the file with fake timers.
afterEach(() => vi.useRealTimers())

const capable: CapabilityResult = { tier: 'small', reasons: [] }
const ctx = () => ({ location: 'West of House', recentOutput: '' })

const TEST_VOCAB: Vocab = {
  verbsOnly: ['look', 'inventory'],
  movement: ['north'],
  verbs1: ['take', 'open'],
  verbs2: ['unlock'],
  preps: ['with'],
  verbSynonyms: [],
  nouns: [
    { canonical: 'mailbox', emit: 'mailbox' },
    { canonical: 'leaflet', emit: 'leaflet' },
    // Task-13-style entry WITH dictionary synonyms/adjectives: these words feed
    // vocabWordSet, so 'open trap door' is all-vocab (stage-4 passthrough). The
    // mailbox/leaflet entries above have NO synonyms on purpose — canonical/emit
    // tokens are not parser dictionary words (F-Z), so 'open mailbox' still
    // exercises the LLM path in the older tests.
    {
      canonical: 'trap door',
      emit: 'trapdoor',
      synonyms: ['door', 'trapdoor', 'trap-door'],
      adjectives: ['trap'],
    },
  ],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
}

function viewState(
  location: string,
  outputs: string[],
  lastInput?: string,
): ViewState {
  const lines: BufferLine[] = []
  let id = 1
  if (lastInput) lines.push({ id: id++, kind: 'input', text: lastInput })
  for (const o of outputs) lines.push({ id: id++, kind: 'output', text: o })
  return { ...emptyView, status: { location, right: '' }, lines, nextId: id }
}

/** An awaitTurn that returns the given views in order (last one repeats). */
function turnScript(views: ViewState[]): () => Promise<TurnResult> {
  let i = 0
  return async () => ({
    view: views[Math.min(i++, views.length - 1)],
    reason: 'line' as const,
  })
}

function setup(over: Partial<Parameters<typeof useNaturalLanguage>[0]> = {}) {
  const echoLocal = vi.fn()
  // Translated-clause sends now route through the canonical seam (Task 4); raw
  // / passthrough / abstain sends still use sendLine. These suites assert the
  // *command that reached the VM* regardless of seam, so by default both point
  // at one spy and `sendLine` observes every send. A test that needs to tell the
  // two apart passes its own distinct `sendCanonical`.
  const sendLine = vi.fn()
  // The send seam the VM actually sees: a test override wins, else the default
  // spy. Both sendLine and sendCanonical resolve to it unless a test passes its
  // own sendCanonical — so the default `sendLine` spy observes every send (raw +
  // canonical), and the awaitTurn-before-send tests keep their custom
  // synchronous-turn spy on BOTH seams. (A custom `sendLine` in `over` is read by
  // those tests via their own local variable, not the returned one.)
  const wiredSendLine = over.sendLine ?? sendLine
  const sendCanonical = over.sendCanonical ?? wiredSendLine
  const engine =
    over.engine ?? new FakeLlmEngine({ default: '{"verb":"__UNKNOWN__"}' })
  const hook = renderHook(() =>
    useNaturalLanguage({
      engine,
      capability: capable,
      vocab: TEST_VOCAB,
      getContext: ctx,
      echoLocal,
      awaitTurn: async () => ({ view: emptyView, reason: 'line' as const }),
      watchdogMs: 5000,
      signature: 'test-signature', // consumed by Task 21 (per-game lexicons)
      ...over,
      sendLine: wiredSendLine,
      sendCanonical,
    }),
  )
  return { hook, echoLocal, sendLine, sendCanonical, engine }
}

// Reach the 'on' state through the REAL download path (no test-only back door).
async function reachOn(hook: ReturnType<typeof setup>['hook']) {
  act(() => hook.result.current.requestDownload())
  await waitFor(() => expect(hook.result.current.state.phase).toBe('on'))
}

// Thin wrapper over setup() that exposes the hook's `result` directly — the
// grammar-only NlState suite reads `result.current.state` after a synchronous
// pick (no download round-trip), mirroring the existing setup() call sites.
function renderNl(
  over: Partial<Parameters<typeof useNaturalLanguage>[0]> = {},
) {
  return setup(over).hook
}

describe('useNaturalLanguage', () => {
  beforeEach(() => localStorage.clear())

  it('tier none → no unavailable phase; off with canUpgrade false (vocab present)', async () => {
    const { hook } = setup({
      capability: { tier: 'none', reasons: ['no-webgpu'] },
    })
    // capability no longer disables NL — it only gates the model upgrade.
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({
        phase: 'off',
        installed: false,
        canUpgrade: false,
      }),
    )
  })

  it('vocab null → disabled (silent), regardless of capability', () => {
    const { hook } = setup({ vocab: null })
    expect(hook.result.current.state.phase).toBe('disabled')
  })

  it('capable + not cached → off (installed:false, canUpgrade:true)', async () => {
    const { hook } = setup()
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({
        phase: 'off',
        installed: false,
        canUpgrade: true,
      }),
    )
  })

  it('capable + cached → off (installed:true), no re-download needed', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({
        phase: 'off',
        installed: true,
        canUpgrade: true,
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

  it('load failure stays grammar-only and sets a notice (after one retry, F-8)', async () => {
    // The genuine (non-abort) load failure is now log.error'd by design (F7);
    // own the log so it doesn't leak to stderr. A transient failure is retried
    // once after a backoff (F-8) — logged as warn — before degrading; own that
    // too. Fake timers drive the backoff deterministically.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      const { hook } = setup({ engine: new FakeLlmEngine({ failLoad: true }) })
      act(() => hook.result.current.requestDownload())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DOWNLOAD_RETRY_MS + 100)
      })
      expect(hook.result.current.state.phase).toBe('on')
      expect(hook.result.current.notice).toBeTruthy()
      expect(errSpy).toHaveBeenCalledWith(
        '[nl] model download failed:',
        expect.anything(),
      )
    } finally {
      vi.useRealTimers()
      warnSpy.mockRestore()
      errSpy.mockRestore()
    }
  })

  it('progress callbacks surface as state.loaded/total/etaSeconds while downloading (F-2 safety net)', async () => {
    // Characterizes the download lifecycle's progress→state wiring through the
    // PUBLIC `state` contract — the modal's progress bar and ETA depend on it.
    // Extracting that lifecycle out of this hook (F-2) must not silently drop
    // the wiring. Date.now is controlled so estimateRemainingSeconds is
    // deterministic rather than wall-clock-flaky.
    let emit!: (p: import('./types').LoadProgress) => void
    let resolveLoad!: () => void
    const blockingEngine: import('./types').LlmEngine = {
      isCached: async () => false,
      isLoaded: () => false,
      unload: async () => {},
      generate: async () => '{"verb":"__UNKNOWN__"}',
      load: (onProgress, signal) =>
        new Promise<void>((resolve, reject) => {
          emit = onProgress
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

    const nowSpy = vi.spyOn(Date, 'now')
    try {
      act(() => hook.result.current.requestDownload())
      // First sample at t=1000ms: one point is not enough signal for an ETA.
      act(() => {
        nowSpy.mockReturnValue(1000)
        emit({ loaded: 10, total: 100, text: '' })
      })
      expect(hook.result.current.state).toMatchObject({
        phase: 'downloading',
        loaded: 10,
        total: 100,
        etaSeconds: null,
      })
      // Second sample 1s later at +40% ⇒ 50% remaining at 40%/s ≈ 1.25s.
      act(() => {
        nowSpy.mockReturnValue(2000)
        emit({ loaded: 50, total: 100, text: '' })
      })
      const s = hook.result.current.state
      expect(s).toMatchObject({ phase: 'downloading', loaded: 50, total: 100 })
      if (s.phase !== 'downloading') throw new Error('expected downloading')
      expect(s.etaSeconds).toBeCloseTo(1.25)
    } finally {
      nowSpy.mockRestore()
    }
    // Resolve the now-stale load so its settle doesn't update state after the
    // test returns (the post-resolve guard makes it a no-op).
    await act(async () => {
      resolveLoad()
    })
  })

  it('command translation echoes English then sends the canonical command', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
    })
    const { hook, echoLocal, sendLine } = setup({ engine })
    await reachOn(hook)
    // Seed the scene so "mailbox" is in scope this turn.
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate('open the mailbox')
    })
    expect(echoLocal).toHaveBeenCalledWith('open the mailbox')
    expect(sendLine).toHaveBeenCalledWith('open mailbox')
  })

  it('abstain sends the raw English (no echoLocal)', async () => {
    const { hook, echoLocal, sendLine } = setup({
      engine: new FakeLlmEngine({ default: '{"verb":"__UNKNOWN__"}' }),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('what should I do?')
    })
    expect(echoLocal).not.toHaveBeenCalled()
    expect(sendLine).toHaveBeenCalledWith('what should I do?')
  })

  it('a localized meta command (es "inventario") echoes the source line too', async () => {
    // The alias stage maps "inventario" → canonical "inventory". In a
    // non-English picker the typed word DIFFERS from the canonical the engine
    // echoes, so the nl-source "you …" line must still appear (UAT: it was
    // silently skipped because 'alias' was excluded from TRANSLATED_STAGES).
    const { hook, echoLocal, sendLine } = setup({
      engine: new FakeLlmEngine({ cached: true }),
    })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('es'))
    expect(hook.result.current.state).toEqual({
      phase: 'on',
      language: 'es',
      model: 'full',
      canUpgrade: true,
    })
    await act(async () => {
      await hook.result.current.translate('inventario')
    })
    expect(sendLine).toHaveBeenCalledWith('inventory')
    expect(echoLocal).toHaveBeenCalledWith('inventario')
  })

  it('locks input (pending=true) while a translation is in flight', async () => {
    const engine = new FakeLlmEngine({
      generateDelayMs: 50,
      completions: { go: '{"verb":"north"}' },
    })
    const { hook } = setup({ engine })
    await reachOn(hook)
    let p!: Promise<string | null>
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
    // The hook logs genuine generate failures deliberately ([nl] translation
    // failed); mock it so the expected error doesn't pollute test output.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { hook, sendLine } = setup({
      engine: new FakeLlmEngine({ failGenerate: true }),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('take lantern')
    })
    expect(sendLine).toHaveBeenCalledWith('take lantern')
    expect(hook.result.current.notice).toBeTruthy()
    expect(errSpy).toHaveBeenCalledWith(
      '[nl] translation failed:',
      expect.anything(),
    )
    errSpy.mockRestore()
  })

  it('a watchdog timeout falls back to raw pass-through with a notice', async () => {
    const engine = new FakeLlmEngine({ generateDelayMs: 10000 })
    const { hook, sendLine } = setup({ engine, watchdogMs: 1000 })
    await reachOn(hook) // real timers: load resolves immediately
    vi.useFakeTimers()
    let p!: Promise<string | null>
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
    act(() => hook.result.current.setLanguage('en')) // not installed → opens modal
    expect(hook.result.current.modalOpen).toBe(true)
    act(() => hook.result.current.declineDownload())
    expect(hook.result.current.modalOpen).toBe(false)
    expect(readNlPref().declined).toBe(true)
  })

  it('decline keeps grammar-only active and only sets declined:true', async () => {
    localStorage.setItem('loquor.nl', JSON.stringify({ enabled: true }))
    const { hook } = setup() // not cached → stays off
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({ phase: 'off' }),
    )
    act(() => hook.result.current.setLanguage('en')) // not installed → on/grammar + opens modal
    act(() => hook.result.current.declineDownload())
    // grammar-only stays active; declined only suppresses the auto-modal
    expect(hook.result.current.state.phase).toBe('on')
    expect(readNlPref().declined).toBe(true)
  })

  it('setLanguage on a cached model activates that language and persists it', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.state).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'full',
      canUpgrade: true,
    })
    expect(readNlPref().language).toBe('fr')
    expect(hook.result.current.modalOpen).toBe(false) // cached → no re-prompt
  })

  it('setLanguage with no cached model sets grammar-only + opens modal; accepting upgrades to full', async () => {
    const { hook } = setup() // not cached
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: false,
      }),
    )
    act(() => hook.result.current.setLanguage('de'))
    expect(hook.result.current.modalOpen).toBe(true)
    expect(hook.result.current.state.phase).toBe('on') // grammar-only active immediately
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({
        phase: 'on',
        language: 'de',
        model: 'full',
        canUpgrade: true,
      }),
    )
    expect(readNlPref().language).toBe('de')
  })

  it('boot restore: a stored language reactivates against a cached model', async () => {
    localStorage.setItem(
      'loquor.nl',
      JSON.stringify({ language: 'es', declined: false }),
    )
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({
        phase: 'on',
        language: 'es',
        model: 'full',
        canUpgrade: true,
      }),
    )
  })

  it("setLanguage('off') turns the layer off and persists 'off'", async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    // Wait for the async isCached() probe (installed: true), not just the
    // initial pre-probe 'off' state — otherwise setLanguage('fr') races the
    // probe and takes the download-modal branch instead of activating.
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.state).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'full',
      canUpgrade: true,
    })
    act(() => hook.result.current.setLanguage('off'))
    expect(hook.result.current.state).toEqual({
      phase: 'off',
      installed: true,
      canUpgrade: true,
    })
    expect(readNlPref().language).toBe('off')
  })

  it('cancelDownload aborts an in-flight load, returns to grammar-only, persists the picked language', async () => {
    let resolveLoad!: () => void
    const blockingEngine: import('./types').LlmEngine = {
      isCached: async () => false,
      isLoaded: () => false,
      unload: async () => {},
      generate: async () => '{"verb":"__UNKNOWN__"}',
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
    expect(hook.result.current.state.phase).toBe('downloading')
    act(() => hook.result.current.cancelDownload())
    await waitFor(() => expect(hook.result.current.state.phase).toBe('on'))
    expect(hook.result.current.notice).toBeNull()
    expect(readNlPref().language).toBe('en') // pendingLangRef default
    resolveLoad()
  })

  it('a load that RESOLVES after cancel stays grammar-only (stale guard)', async () => {
    let resolveLoad!: () => void
    const racingEngine: import('./types').LlmEngine = {
      isCached: async () => false,
      isLoaded: () => false,
      unload: async () => {},
      generate: async () => '{"verb":"__UNKNOWN__"}',
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
      resolveLoad()
    })
    // cancel set on/grammar; the stale .then must not flip to on/full
    expect(hook.result.current.state.phase).toBe('on')
    expect(readNlPref().language).toBe('en') // pendingLangRef default
  })

  it('cancel after a completed download returns to grammar-only and persists the language ([P])', async () => {
    // The sub-ms window: the load resolves (pref written, phase on/full) just as
    // the player clicks Cancel. Cancel must flip back to grammar-only and keep
    // the language (grammar-only is still usable; the player just doesn't want
    // the model active).
    const { hook } = setup()
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({ phase: 'off' }),
    )
    act(() => hook.result.current.setLanguage('fr')) // not installed → on/grammar + modal
    act(() => hook.result.current.requestDownload())
    await waitFor(() => expect(hook.result.current.state.phase).toBe('on'))
    expect(readNlPref().language).toBe('fr')
    act(() => hook.result.current.cancelDownload())
    expect(hook.result.current.state.phase).toBe('on') // grammar-only stays
    expect(readNlPref().language).toBe('fr') // language persisted
  })

  it('a second requestDownload aborts the previous in-flight load ([L2])', async () => {
    // Without the abort, re-picking a language starts a SECOND concurrent
    // engine.load while the first keeps downloading — double VRAM on exactly
    // the constrained devices the capability gate worries about.
    const signals: AbortSignal[] = []
    const blockingEngine: import('./types').LlmEngine = {
      isCached: async () => false,
      isLoaded: () => false,
      unload: async () => {},
      generate: async () => '{"verb":"__UNKNOWN__"}',
      load: (_onProgress, signal) =>
        new Promise<void>((_resolve, reject) => {
          signals.push(signal)
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
    act(() => hook.result.current.requestDownload())
    // Aborting the first load rejects its promise; flush that rejection's
    // state update inside act() so it doesn't warn after the test returns.
    await act(async () => {})
    expect(signals).toHaveLength(2)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })

  it('a STALLED lazy engine.load demotes to basic mode and cannot wedge input ([M])', async () => {
    // Reload session: model cached on disk, not in memory — the first command
    // triggers engine.load inside generateRaw. The generate watchdog never
    // covered the load, so a stalled load (WebGPU init, cache eviction →
    // network) held translatingRef forever: every later line queued to the
    // cap, then dropped. The load gets its own generous watchdog, and on its
    // timeout the lazy load throws ModelLoadError (reason=WatchdogTimeout) at
    // clause time. Task 5 FINALIZES this: that demotes full→grammar for the
    // session and shows the shared basic-mode notice; for an EN language the
    // typed line still raw-sends to the Z-parser. A demotion is a KNOWN
    // degradation, not a generate fault, so it is NOT log.error'd (the
    // ModelLoadError exclusion in stage 8) — the test owns no stray output.
    localStorage.setItem('loquor.nl', JSON.stringify({ language: 'en' }))
    const stalledEngine: import('./types').LlmEngine = {
      isCached: async () => true,
      isLoaded: () => false,
      unload: async () => {},
      generate: async () => '{"verb":"__UNKNOWN__"}',
      load: () => new Promise<void>(() => {}), // stalls forever
    }
    const { hook, sendLine } = setup({ engine: stalledEngine })
    await waitFor(() => expect(hook.result.current.state.phase).toBe('on'))
    vi.useFakeTimers()
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('sing a ditty')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000)
      await p
    })
    vi.useRealTimers()
    expect(sendLine).toHaveBeenCalledWith('sing a ditty') // EN raw fallback
    // The shared basic-mode notice (en: "… staying in basic mode …").
    expect(hook.result.current.notice).toMatch(/staying in basic mode/i)
    expect(hook.result.current.notice).toMatch(/download failed/i)
    expect(hook.result.current.pending).toBe(false) // input not wedged
    // EN was already grammar-only-equivalent (it raw-sends); the demotion path
    // ran but EN has no `full` to flip, so the public model stays grammar.
    const st = hook.result.current.state
    expect(st.phase).toBe('on')
    if (st.phase === 'on') expect(st.model).toBe('grammar')
  })

  it("phase 'off' beats the queue: a line typed mid-drain after switching off goes raw ([M])", async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook, sendLine } = setup({ engine })
    await reachOn(hook)
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open the mailbox') // drain in flight
    })
    act(() => hook.result.current.setLanguage('off')) // off is instant
    act(() => {
      void hook.result.current.translate('look') // must NOT queue behind the drain
    })
    expect(sendLine).toHaveBeenCalledWith('look')
    expect(hook.result.current.queued).toEqual([])
    await act(async () => {
      await p
    })
  })

  it('restores the chosen language on remount when the model is cached', async () => {
    const a = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await reachOn(a.hook) // persists language='en'
    expect(readNlPref().language).toBe('en')
    a.hook.unmount()
    const b = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(b.hook.result.current.state.phase).toBe('on'))
  })

  it('replays the French bug: open mailbox reveals leaflet, then prends-le → take leaflet', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: {
        'Ouvrez la boîte aux lettres': '{"verb":"open","object":"mailbox"}',
        'prends-le': '{"verb":"take","object":"leaflet"}',
      },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook, sendLine } = setup({ engine })
    await reachOn(hook)

    // Turn 0: opening room mentions the mailbox (scene seed).
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    // Turn 1: translate "open mailbox"; it is a command, so it is sent canonical.
    await act(async () => {
      await hook.result.current.translate('Ouvrez la boîte aux lettres')
    })
    expect(sendLine).toHaveBeenLastCalledWith('open mailbox')
    // The VM output reveals the leaflet; observe attributes it to lastCommand.
    act(() =>
      hook.result.current.observe(
        viewState(
          'West of House',
          ['open mailbox', 'Opening the small mailbox reveals a leaflet.'],
          'open mailbox',
        ),
      ),
    )
    // Turn 2: "prends-le" → the model resolves le→leaflet from the antecedent hint.
    await act(async () => {
      await hook.result.current.translate('prends-le')
    })
    expect(sendLine).toHaveBeenLastCalledWith('take leaflet')
  })

  it('a bare meta-command (restart) bypasses the model and is sent raw', async () => {
    // The model would translate anything into a command; prove "restart" never
    // reaches it (no generate, no canonical echo) and goes straight to Zork.
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"open","object":"mailbox"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const { hook, echoLocal, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('restart')
    })
    expect(sendLine).toHaveBeenCalledWith('restart') // raw passthrough
    expect(echoLocal).not.toHaveBeenCalled() // no canonical echo
    expect(generateSpy).not.toHaveBeenCalled() // model never consulted
  })

  it('stage-4 passthrough sends the normalized line the gate validated ([C] — take lamp!)', async () => {
    // isVocabPassthrough strips trailing [!.?,;:] before tokenizing; the send
    // must use that SAME form. Zork's dictionary separators are exactly
    // `. , "`, so a surviving '!' glues onto the last word and the stage
    // built to prevent parser errors produces one ("I don't know the word
    // door!").
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"look"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const { hook, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('open trap door!')
    })
    expect(sendLine).toHaveBeenCalledWith('open trap door')
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it('stage-3 meta sends the normalized form it matched ([C] — save!)', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"look"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const { hook, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('save!')
    })
    expect(sendLine).toHaveBeenCalledWith('save')
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it('a reply to a yes/no confirmation prompt bypasses the model (restart flow)', async () => {
    // After "restart", Zork asks "Do you wish to restart? (Y is affirmative):"
    // as a LINE read. The player's "Y" must answer the game, not be translated
    // (the model would turn it into "look" and the restart would never confirm).
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"look"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const getContext = () => ({
      location: '',
      recentOutput: 'Do you wish to restart? (Y is affirmative): ',
    })
    const { hook, echoLocal, sendLine } = setup({ engine, getContext })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('Y')
    })
    expect(sendLine).toHaveBeenCalledWith('Y') // raw passthrough answers the game
    expect(echoLocal).not.toHaveBeenCalled()
    expect(generateSpy).not.toHaveBeenCalled() // model never consulted
  })

  it('a reply to a disambiguation prompt bypasses the model (which door…)', async () => {
    // "open door" with two doors → "Which door do you mean, the wooden door or
    // the trap door?" (a LINE read). "wooden door" answers the parser and must
    // reach Zork raw, not be translated into some other command.
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"look"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const getContext = () => ({
      location: 'Cellar',
      recentOutput: 'Which door do you mean, the wooden door or the trap door?',
    })
    const { hook, echoLocal, sendLine } = setup({ engine, getContext })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('wooden door')
    })
    expect(sendLine).toHaveBeenCalledWith('wooden door') // raw answer to the parser
    expect(echoLocal).not.toHaveBeenCalled()
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it('a reply to a parser orphan prompt bypasses the model (review I1)', async () => {
    // "put coffin" with no container → "What do you want to put the coffin in?"
    // (a LINE read). The next line ("the trophy case") answers the parser and
    // must reach Zork raw, not be translated — the mid-sequence compound loop
    // already stops on this prompt; the single-command turn-entry guard must too.
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"look"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const getContext = () => ({
      location: 'Living Room',
      recentOutput: 'What do you want to put the coffin in?',
    })
    const { hook, echoLocal, sendLine } = setup({ engine, getContext })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('the trophy case')
    })
    expect(sendLine).toHaveBeenCalledWith('the trophy case') // raw answer
    expect(echoLocal).not.toHaveBeenCalled()
    expect(generateSpy).not.toHaveBeenCalled()
  })

  // (A hook-level "observe is idempotent" test used to live here asserting
  // only expect(true) — vacuous ([R]). The real invariant is pinned at the
  // reducer level: tracker.test.ts "reducer stays idempotent on duplicate
  // observes (v1 invariant)".)

  it('abstain passes raw English through and does NOT echo or latch a command', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook, echoLocal, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('sing a merry tune')
    })
    expect(sendLine).toHaveBeenLastCalledWith('sing a merry tune') // raw passthrough
    expect(echoLocal).not.toHaveBeenCalled() // no canonical echo → no latch set
  })

  it('lazily loads a cached model that auto-restored to on without a load()', async () => {
    // Cross-reload bug (engine not loaded): a cached model + a prior enabled
    // choice auto-restores phase 'on' WITHOUT bringing the weights into memory,
    // so the first generate() threw "engine not loaded" and the turn was lost.
    // translate must load the engine before generating.
    localStorage.setItem('loquor.nl', JSON.stringify({ enabled: true }))
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook, sendLine } = setup({ engine })
    // Auto-restores to 'on' from cache — but the model is NOT in memory yet.
    await waitFor(() => expect(hook.result.current.state.phase).toBe('on'))
    expect(engine.isLoaded()).toBe(false)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate('open the mailbox')
    })
    expect(engine.isLoaded()).toBe(true) // translate brought it into memory
    expect(sendLine).toHaveBeenCalledWith('open mailbox') // translated, not "failed"
  })

  it('compound: runs each clause against the live scene (open mailbox + prends-le)', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: {
        'Ouvrez la boîte aux lettres': '{"verb":"open","object":"mailbox"}',
        'prends-le': '{"verb":"take","object":"leaflet"}',
      },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const revealView = viewState(
      'West of House',
      ['open mailbox', 'Opening the small mailbox reveals a leaflet.'],
      'open mailbox',
    )
    const afterTake = viewState(
      'West of House',
      ['take leaflet', 'Taken.'],
      'take leaflet',
    )
    const { hook, echoLocal, sendLine } = setup({
      engine,
      awaitTurn: turnScript([revealView, afterTake]),
    })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate(
        'Ouvrez la boîte aux lettres and prends-le',
      )
    })
    expect(echoLocal).toHaveBeenCalledTimes(1)
    expect(echoLocal).toHaveBeenCalledWith(
      'Ouvrez la boîte aux lettres and prends-le',
    )
    expect(sendLine.mock.calls.map(c => c[0])).toEqual([
      'open mailbox',
      'take leaflet',
    ])
    expect(hook.result.current.notice).toBeNull()
  })

  it('compound: registers awaitTurn before sendLine so a synchronous VM turn is not missed', async () => {
    // The real bridge runs each turn SYNCHRONOUSLY inside sendLine(): accept() →
    // VM run → bridge.update() → resolveTurn() — all before sendLine returns. So
    // the turn boundary fires the instant sendLine is called, draining only the
    // awaitTurn resolvers registered BEFORE it. If the loop registers awaitTurn
    // AFTER sendLine, the boundary is missed and raceTurn times out, stopping the
    // sequence after one clause. This fake models that coupling; the prior tests'
    // decoupled turnScript/no-op sendLine cannot catch it. Two independent
    // verbsOnly clauses isolate the timing seam from scene/translation concerns.
    const engine = new FakeLlmEngine({
      cached: true,
      completions: {
        look: '{"verb":"look"}',
        'check inventory': '{"verb":"inventory"}',
      },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const views = [
      viewState('West of House', ['look', 'West of House'], 'look'),
      viewState(
        'West of House',
        ['inventory', 'You are empty-handed.'],
        'inventory',
      ),
    ]
    let i = 0
    const resolvers: Array<(r: TurnResult) => void> = []
    const sendLine = vi.fn((_text: string) => {
      const view = views[Math.min(i++, views.length - 1)]
      resolvers.splice(0).forEach(r => r({ view, reason: 'line' as const }))
    })
    const awaitTurn = () =>
      new Promise<TurnResult>(res => {
        resolvers.push(res)
      })
    const { hook } = setup({ engine, sendLine, awaitTurn, watchdogMs: 1000 })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['West of House']),
      ),
    )
    vi.useFakeTimers()
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('look and check inventory')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
      await p
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['look', 'inventory'])
    expect(hook.result.current.notice).toBeNull()
    vi.useRealTimers()
  })

  it('compound: caps at MAX_CLAUSES (8) and notices "Ran 8 of 9 actions."', async () => {
    // Nine individually-translatable clauses. The loop must stop after the cap
    // (MAX_CLAUSES = 8), not after a turn/no-op/prompt condition: every settled
    // view is plain success output ("Taken.") that matches no stop predicate.
    // Each clause maps to a no-object verbsOnly verb ('look' / 'inventory') so
    // it always parses to a command without needing an in-scope noun.
    const englishClauses = [
      'glance one',
      'glance two',
      'glance three',
      'glance four',
      'glance five',
      'glance six',
      'glance seven',
      'glance eight',
      'glance nine',
    ]
    // Alternate look/inventory so the issued commands are distinguishable in order.
    const verbs = englishClauses.map((_, i) =>
      i % 2 === 0 ? 'look' : 'inventory',
    )
    const completions: Record<string, string> = {}
    for (let i = 0; i < englishClauses.length; i++) {
      completions[englishClauses[i]] = JSON.stringify({ verb: verbs[i] })
    }
    const engine = new FakeLlmEngine({
      cached: true,
      completions,
      default: '{"verb":"__UNKNOWN__"}',
    })
    // Every clause settles on a plain "Taken." view — no failurePat (the default
    // test vocab has none anyway), no confirmation/disambiguation prompt.
    const okView = viewState('West of House', ['Taken.'], 'look')
    const { hook, echoLocal, sendLine } = setup({
      engine,
      awaitTurn: turnScript([okView]),
    })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate(englishClauses.join(' and '))
    })
    // Exactly 8 commands issued (the first 8, in order), then the cap halts it.
    expect(sendLine.mock.calls.map(c => c[0]).length).toBe(8)
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(verbs.slice(0, 8))
    expect(hook.result.current.notice).toBe('Ran 8 of 9 actions.')
    // The full English echoes exactly once (decision 5).
    expect(echoLocal).toHaveBeenCalledTimes(1)
  })

  it('compound: stops and notices when a later clause cannot be translated', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const revealView = viewState(
      'West of House',
      ['open mailbox', 'Opening the small mailbox reveals a leaflet.'],
      'open mailbox',
    )
    const { hook, sendLine } = setup({
      engine,
      awaitTurn: turnScript([revealView]),
    })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate('open mailbox and xyzzy the grue')
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
    expect(hook.result.current.notice).toBe('Ran 1 of 2 actions.')
  })

  it('compound: an engine error on the FIRST clause is noticed and logged even for English ([B])', async () => {
    // Stage 8 used to check activeLang==='en' before stopError: an EN
    // compound whose first clause hit a genuine engine error took the bare
    // raw-send branch — no notice, no console.error (mid-compound errors
    // never propagate to the drain's catch). The failure then looked exactly
    // like a deliberate abstain fallback.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const engine = new FakeLlmEngine({ cached: true, failGenerate: true })
    const { hook, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('sing a ditty and dance a jig')
    })
    // EN still raw-sends (Zork chains compounds natively) — but labeled:
    expect(sendLine).toHaveBeenCalledWith('sing a ditty and dance a jig')
    expect(hook.result.current.notice).toMatch(/translation failed/i)
    expect(errSpy).toHaveBeenCalledWith(
      '[nl] translation failed:',
      expect.anything(),
    )
    errSpy.mockRestore()
  })

  it('compound: a mid-sequence engine error labels the truncation notice ([B])', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const engine = new FakeLlmEngine({ cached: true, failGenerate: true })
    // Clause 1 never reaches the engine (stage-5 direction); clause 2 does.
    const movedView = viewState(
      'North of House',
      ['north', 'You are facing the north side of a white house.'],
      'north',
    )
    const { hook, sendLine } = setup({
      engine,
      awaitTurn: turnScript([movedView]),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('north and xyzzy the grue')
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['north'])
    expect(hook.result.current.notice).toMatch(/translation failed/i)
    expect(hook.result.current.notice).toMatch(/ran 1 of 2/i)
    expect(errSpy).toHaveBeenCalledWith(
      '[nl] translation failed:',
      expect.anything(),
    )
    errSpy.mockRestore()
  })

  // INVERTED for UAT F-G (NL v2 §10): "It is already open." is a SOFT no-op —
  // the player's plan is already satisfied, so the compound sequence must keep
  // going. (This test previously asserted the old stop-on-no-op behavior.)
  it('compound: a soft no-op ("It is already open.") does NOT stop the sequence (F-G)', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: {
        'open mailbox': '{"verb":"open","object":"mailbox"}',
        'take leaflet': '{"verb":"take","object":"leaflet"}',
      },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const noop = viewState(
      'West of House',
      ['open mailbox', 'It is already open.'],
      'open mailbox',
    )
    const taken = viewState(
      'West of House',
      ['take leaflet', 'Taken.'],
      'take leaflet',
    )
    const { hook, sendLine } = setup({
      engine,
      vocab: { ...TEST_VOCAB, failurePat: FAILURE_PAT },
      awaitTurn: turnScript([noop, taken]),
    })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate('open mailbox and take leaflet')
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual([
      'open mailbox',
      'take leaflet',
    ])
    expect(hook.result.current.notice).toBeNull()
  })

  it('compound: still stops after a HARD refusal (failurePat) on the first clause', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const refusal = viewState(
      'West of House',
      ['open mailbox', 'The mailbox cannot be opened.'],
      'open mailbox',
    )
    const { hook, sendLine } = setup({
      engine,
      vocab: { ...TEST_VOCAB, failurePat: FAILURE_PAT },
      awaitTurn: turnScript([refusal]),
    })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate('open mailbox and take leaflet')
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
    expect(hook.result.current.notice).toBe('Ran 1 of 2 actions.')
  })

  it('compound: a successful move into a room whose description contains absence phrasing ("no door") does NOT stop the sequence', async () => {
    // Regression: the absence pattern (\bno\s+\w+\b) matches ordinary room flavor
    // text like "There is no door here." So a movement clause that SUCCEEDS — and
    // therefore prints a new room description — was being misread as an in-game
    // failure and truncating the sequence. A turn that CHANGES ROOMS is a success,
    // not a no-op, regardless of negations in the new description.
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { north: '{"verb":"north"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const northOfHouse = viewState(
      'North of House',
      [
        'North of House',
        'There is no door here, and all the windows are boarded up.',
      ],
      'north',
    )
    const forestPath = viewState(
      'Forest Path',
      ['Forest Path', 'This is a path winding through a dimly lit forest.'],
      'north',
    )
    const { hook, sendLine } = setup({
      engine,
      awaitTurn: turnScript([northOfHouse, forestPath]),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('north and north')
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['north', 'north'])
    expect(hook.result.current.notice).toBeNull()
  })

  it('compound: stops when a clause lands on a disambiguation prompt', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const disambig = viewState(
      'West of House',
      [
        'open mailbox',
        'Which mailbox do you mean, the brass mailbox or the small mailbox?',
      ],
      'open mailbox',
    )
    const { hook, sendLine } = setup({
      engine,
      awaitTurn: turnScript([disambig]),
    })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate('open mailbox and take leaflet')
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
    expect(hook.result.current.notice).toBe('Ran 1 of 2 actions.')
  })

  it('compound: a never-settling turn times out, stops, and re-enables input', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: {
        'open mailbox': '{"verb":"open","object":"mailbox"}',
        'take leaflet': '{"verb":"take","object":"leaflet"}',
      },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const neverSettle = () => new Promise<TurnResult>(() => {})
    const { hook, sendLine } = setup({
      engine,
      watchdogMs: 1000,
      awaitTurn: neverSettle,
    })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', [
          'There is a small mailbox here.',
          'a leaflet',
        ]),
      ),
    )
    vi.useFakeTimers()
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open mailbox and take leaflet')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
      await p
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
    expect(hook.result.current.pending).toBe(false)
    expect(hook.result.current.notice).toBe('Ran 1 of 2 actions.')
    vi.useRealTimers()
  })

  it('compound: a meta clause is routed raw, not fed to the model (review C4)', async () => {
    // Meta verbs are subtracted from the grammar, so the model can only abstain
    // on "save" — the documented "always routed raw" contract must hold per
    // clause: "go north and save" runs both, never "Ran 1 of 2 actions."
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const northView = viewState(
      'North of House',
      ['north', 'North of House'],
      'north',
    )
    const savedView = viewState('North of House', ['save', 'Ok.'], 'save')
    const { hook, sendLine } = setup({
      engine,
      awaitTurn: turnScript([northView, savedView]),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('go north and save')
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['north', 'save'])
    expect(generateSpy).not.toHaveBeenCalled() // direction fast-path + meta raw
    expect(hook.result.current.notice).toBeNull()
  })

  it('compound: a localized alias clause routes raw via the ACTIVE core lexicon (review C4, spec §4 stage 3)', async () => {
    // Task 21 wires the active language's core lexicon into the per-clause
    // meta/alias stage: with the picker on 'fr', "inventaire" maps to
    // "inventory" deterministically — no model call, no truncated sequence.
    // (This test was dormant while the hook passed `null` for the core.)
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const northView = viewState(
      'North of House',
      ['north', 'North of House'],
      'north',
    )
    const invView = viewState(
      'North of House',
      ['inventory', 'You are empty-handed.'],
      'inventory',
    )
    const { hook, sendLine } = setup({
      engine,
      awaitTurn: turnScript([northView, invView]),
    })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    await act(async () => {
      await hook.result.current.translate('va au nord et inventaire')
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['north', 'inventory'])
    expect(generateSpy).not.toHaveBeenCalled() // direction fast-path + core alias
    expect(hook.result.current.notice).toBeNull()
  })

  it('compound: first clause untranslatable → raw-send the whole input, no notice', async () => {
    const { hook, echoLocal, sendLine } = setup({
      engine: new FakeLlmEngine({
        cached: true,
        default: '{"verb":"__UNKNOWN__"}',
      }),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('foo the bar and baz the qux')
    })
    expect(sendLine).toHaveBeenCalledWith('foo the bar and baz the qux')
    expect(echoLocal).not.toHaveBeenCalled()
    expect(hook.result.current.notice).toBeNull()
  })

  it('a prompt reply containing "and" is bypassed, not split or translated', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"look"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const getContext = () => ({
      location: '',
      recentOutput: 'Do you wish to restart? (Y is affirmative): ',
    })
    const { hook, sendLine } = setup({ engine, getContext })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('yes and restart')
    })
    expect(sendLine).toHaveBeenCalledWith('yes and restart')
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it('isSequencing() is true while a clause turn is pending, false at rest', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    let release!: (r: TurnResult) => void
    const gate = new Promise<TurnResult>(res => {
      release = res
    })
    const { hook } = setup({ engine, awaitTurn: () => gate })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    expect(hook.result.current.isSequencing()).toBe(false)
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open mailbox and take it')
    })
    // inSequenceRef is set synchronously on entering the sequence branch.
    expect(hook.result.current.isSequencing()).toBe(true)
    await act(async () => {
      release({
        view: viewState(
          'West of House',
          ['open mailbox', 'Opening the small mailbox reveals a leaflet.'],
          'open mailbox',
        ),
        reason: 'line',
      })
      await p
    })
    expect(hook.result.current.isSequencing()).toBe(false)
  })
})

describe('grammar-only NlState', () => {
  beforeEach(() => localStorage.clear())

  it('pick a language with no model → state on/grammar with canUpgrade', async () => {
    const result = renderNl({
      capability: { tier: 'full', reasons: [] },
    }).result
    act(() => result.current.setLanguage('fr'))
    expect(result.current.state).toMatchObject({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
      canUpgrade: true,
    })
    await act(async () => {}) // flush the async isCached() probe
  })

  it('capability none → no unavailable phase; pick still activates grammar-only, canUpgrade false', async () => {
    const result = renderNl({
      capability: { tier: 'none', reasons: ['no-webgpu'] },
    }).result
    act(() => result.current.setLanguage('de'))
    expect(result.current.state).toMatchObject({
      phase: 'on',
      language: 'de',
      model: 'grammar',
      canUpgrade: false,
    })
    // DECISION (spec ambiguity resolved): the once-ever auto-modal fires even on
    // a `none` device — the "model not loaded → modal appears once ever" row is
    // unconditional, and Terminal renders it with warn=true (canUpgrade false),
    // so the player gets honest discoverability and never lands worse.
    expect(result.current.modalOpen).toBe(true)
    await act(async () => {}) // flush the async isCached() probe
  })

  it('no vocab → disabled regardless of a persisted language', async () => {
    writeNlPref({ language: 'fr' })
    const result = renderNl({ vocab: null }).result
    expect(result.current.state).toEqual({ phase: 'disabled' })
    await act(async () => {}) // flush the async isCached() probe
  })
})

describe('input queue (NL v2 §11, F-A)', () => {
  beforeEach(() => localStorage.clear())

  it('a line typed mid-translation queues and runs after it, FIFO', async () => {
    // Line 1 takes the slow LLM path; 'north' arrives while it is in flight.
    // F-A: it must QUEUE (visible via result.current.queued), then drain
    // through the full pipeline once line 1 finishes — never be dropped.
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook, sendLine } = setup({ engine })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open the mailbox')
    })
    act(() => {
      void hook.result.current.translate('north')
    })
    expect(hook.result.current.queued.map(q => q.text)).toEqual(['north'])
    await act(async () => {
      await p
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual([
      'open mailbox',
      'north', // direction fast-path, run from the queue
    ])
    expect(hook.result.current.queued).toEqual([])
  })

  it('queued lines carry stable unique ids — never reused across drains (React keys)', async () => {
    // The Terminal keys queued rows by id. The queue drains FIFO via shift(),
    // so an index key would re-point the same DOM node at a DIFFERENT line as
    // the front is removed; ids must be unique and never recycled.
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook } = setup({ engine })
    await reachOn(hook)
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open the mailbox')
    })
    act(() => {
      void hook.result.current.translate('north')
      void hook.result.current.translate('look')
    })
    const firstIds = hook.result.current.queued.map(q => q.id)
    expect(new Set(firstIds).size).toBe(2)
    await act(async () => {
      await p
    })
    expect(hook.result.current.queued).toEqual([])
    act(() => {
      p = hook.result.current.translate('open the mailbox')
    })
    act(() => {
      void hook.result.current.translate('east')
    })
    // A fresh line never reuses an id an earlier queued line rendered under.
    for (const q of hook.result.current.queued)
      expect(firstIds).not.toContain(q.id)
    await act(async () => {
      await p
    })
  })

  it('caps the queue at 4 — overflow drops the NEWEST with a notice', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook } = setup({ engine })
    await reachOn(hook)
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open the mailbox') // in flight
    })
    act(() => {
      void hook.result.current.translate('one')
      void hook.result.current.translate('two')
      void hook.result.current.translate('three')
      void hook.result.current.translate('four')
      void hook.result.current.translate('five') // overflow → dropped
    })
    expect(hook.result.current.queued.map(q => q.text)).toEqual([
      'one',
      'two',
      'three',
      'four',
    ])
    expect(hook.result.current.notice).toMatch(/queue full/i)
    expect(hook.result.current.notice).toContain('five')
    await act(async () => {
      await p
    })
    expect(hook.result.current.queued).toEqual([])
  })

  it('flushes the queue (with a notice) when the game raises an interactive prompt', async () => {
    // Line 1's turn leaves a yes/no confirmation on screen. The queued lines
    // were typed BEFORE the player saw that question, so none of them may
    // become its answer: the whole queue is cleared with a notice.
    let output = ''
    const getContext = () => ({
      location: 'West of House',
      recentOutput: output,
    })
    const sendLine = vi.fn((_text: string) => {
      output = 'Do you wish to restart? (Y is affirmative): '
    })
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook } = setup({ engine, getContext, sendLine })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open the mailbox')
    })
    act(() => {
      void hook.result.current.translate('north')
      void hook.result.current.translate('look')
    })
    expect(hook.result.current.queued.map(q => q.text)).toEqual([
      'north',
      'look',
    ])
    await act(async () => {
      await p
    })
    // Only line 1's command was ever sent; the queued lines were flushed.
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
    expect(hook.result.current.queued).toEqual([])
    expect(hook.result.current.notice).toMatch(/queue cleared/i)
  })

  it('the drain awaits the turn boundary, so a queued line sees a prompt raised by the PREVIOUS line (stale-view flush)', async () => {
    // INTEGRATION TIMING (the §11 violation): getContext reads the Terminal's
    // viewRef, which only updates after a React re-render — NOT synchronously
    // inside sendLine. The settled turn output is only reachable through the
    // awaitTurn-provided view (modeled on the compound awaitTurn-before-
    // sendLine test: the turn fires synchronously inside sendLine, draining
    // only resolvers registered before it). 'quit' raw-sends and its turn
    // raises "(Y is affirmative)"; the queued 'north' must see THAT view at
    // stage 1 and flush — never get translated into the prompt's answer.
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const promptView = viewState(
      'West of House',
      ['Do you wish to leave the game? (Y is affirmative):'],
      'quit',
    )
    const resolvers: Array<(r: TurnResult) => void> = []
    const sendLine = vi.fn((_text: string) => {
      resolvers.splice(0).forEach(r => r({ view: promptView, reason: 'line' }))
    })
    const awaitTurn = () =>
      new Promise<TurnResult>(res => {
        resolvers.push(res)
      })
    // STALE on purpose: the live view ref never catches up mid-drain.
    const getContext = () => ({ location: 'West of House', recentOutput: '' })
    const { hook } = setup({ engine, sendLine, awaitTurn, getContext })
    await reachOn(hook)
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('quit')
      void hook.result.current.translate('north')
      void hook.result.current.translate('look')
    })
    expect(hook.result.current.queued.map(q => q.text)).toEqual([
      'north',
      'look',
    ])
    await act(async () => {
      await p
    })
    // Only 'quit' ever reached the VM; 'north' flushed instead of answering
    // the confirmation, and 'look' was cleared with it.
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['quit'])
    expect(hook.result.current.queued).toEqual([])
    expect(hook.result.current.notice).toMatch(/queue cleared/i)
  })

  it('a LONE queued line that flushes still shows the queue-cleared notice', async () => {
    // The flushed line itself was dropped input: even with nothing queued
    // BEHIND it, the player must be told why it vanished (it was shifted out
    // before the old `queue.length > 0` notice gate ran).
    let output = ''
    const getContext = () => ({
      location: 'West of House',
      recentOutput: output,
    })
    const sendLine = vi.fn((_text: string) => {
      output = 'Do you wish to restart? (Y is affirmative): '
    })
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook } = setup({ engine, getContext, sendLine })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open the mailbox')
    })
    act(() => {
      void hook.result.current.translate('north') // the lone queued line
    })
    expect(hook.result.current.queued.map(q => q.text)).toEqual(['north'])
    await act(async () => {
      await p
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
    expect(hook.result.current.queued).toEqual([])
    expect(hook.result.current.notice).toMatch(/queue cleared/i)
  })

  it('an abstain notice does NOT flush the queue — the next line still runs', async () => {
    // fr: line 1 abstains (styled notice, nothing sent — stage 8). That is NOT
    // an interactive prompt, so queued line 2 still drains and runs.
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook, sendLine } = setup({
      engine,
      vocab: ZORK1_VOCAB,
      signature: ZORK1_SIG,
    })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('blorple le ciel') // LLM → abstain
    })
    act(() => {
      void hook.result.current.translate('ouvre la trappe') // queues
    })
    expect(hook.result.current.queued.map(q => q.text)).toEqual([
      'ouvre la trappe',
    ])
    await act(async () => {
      await p
    })
    // Line 2 drained through the deterministic lexicon stage and ran.
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open trapdoor'])
    // Line 1's abstain notice survives (line 2 set none); no "queue cleared".
    // Localized (F1) — fr plain-language recovery (m4): "Je n’ai pas compris…".
    expect(hook.result.current.notice).toMatch(/je n’ai pas compris/i)
  })

  it('a mid-drain language switch applies to queued lines ([N])', async () => {
    // The drain loop lives inside ONE translate closure, which used to
    // capture lex/activeLang once: lines queued after a picker change drained
    // under the OLD language. Here line 1 (fr, slow LLM abstain) is in flight
    // when the player switches to Deutsch and the queued DE separable-verb
    // line must translate under DE — under fr it would miss to the LLM and
    // abstain.
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook, sendLine } = setup({
      engine,
      vocab: ZORK1_VOCAB,
      signature: ZORK1_SIG,
    })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('blorple le ciel') // fr, slow LLM
    })
    act(() => {
      void hook.result.current.translate('schalte die laterne ein') // queues
    })
    act(() => hook.result.current.setLanguage('de')) // picker changed mid-drain
    await act(async () => {
      await p
    })
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['turn on light'])
  })

  it("switching OFF mid-drain abandons the queue — 'off is instant' ([N])", async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook, sendLine } = setup({ engine })
    await reachOn(hook)
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open the mailbox')
    })
    act(() => {
      void hook.result.current.translate('north') // queues
    })
    act(() => hook.result.current.setLanguage('off'))
    await act(async () => {
      await p
    })
    // The in-flight line finishes (it began under 'on'); the queued line is
    // abandoned with a notice instead of being translated by a layer the
    // player turned off.
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
    expect(hook.result.current.queued).toEqual([])
    expect(hook.result.current.notice).toMatch(/queue cleared/i)
  })

  it('a story switch mid-drain abandons old-game queued lines ([O])', async () => {
    // "Change story" swaps storyBytes on the mounted Terminal: vocab/signature
    // change but the drain keeps running — old-game queued lines used to fire
    // turns into the freshly booted game (sendLine resolves to the NEW
    // engine at call time).
    const engine = new FakeLlmEngine({
      cached: true,
      generateDelayMs: 50,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const echoLocal = vi.fn()
    const sendLine = vi.fn()
    const props = (vocab: Vocab, signature: string) => ({
      engine,
      capability: capable,
      vocab,
      getContext: ctx,
      echoLocal,
      sendLine,
      sendCanonical: sendLine, // one spy observes both seams (asserts [] sent)
      awaitTurn: async () => ({ view: emptyView, reason: 'line' as const }),
      watchdogMs: 5000,
      signature,
    })
    const hook = renderHook(p => useNaturalLanguage(p), {
      initialProps: props(TEST_VOCAB, 'sig-A'),
    })
    act(() => hook.result.current.requestDownload())
    await waitFor(() => expect(hook.result.current.state.phase).toBe('on'))
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate('open the mailbox')
    })
    act(() => {
      void hook.result.current.translate('north') // queued at the OLD game
    })
    hook.rerender(props(ZORK1_VOCAB, ZORK1_SIG)) // story switched
    await act(async () => {
      await p
    })
    // Neither the in-flight result nor the queued line may reach the new
    // game: 'open mailbox' was translated against the old game's vocab.
    expect(sendLine.mock.calls.map(c => c[0])).toEqual([])
    expect(hook.result.current.queued).toEqual([])
  })
})

describe('NL v2 pipeline stages (spec §4)', () => {
  beforeEach(() => localStorage.clear())

  /**
   * Activate French against a cached model + REAL Zork I data. The fr noun
   * lexicon keys onto real zork1 canonicals, so the fr stages must run
   * end-to-end against ZORK1_VOCAB + ZORK1_SIG ('trappe' → 'trap door' →
   * emit 'trapdoor'; 'lampe' → 'brass lantern' → emit 'light') — TEST_VOCAB's
   * fixture nouns would never match the per-game lexicon.
   */
  async function setupFr(
    over: Partial<Parameters<typeof useNaturalLanguage>[0]> = {},
  ) {
    const s = setup({
      engine: new FakeLlmEngine({
        cached: true,
        default: '{"verb":"__UNKNOWN__"}',
      }),
      vocab: ZORK1_VOCAB,
      signature: ZORK1_SIG,
      ...over,
    })
    await waitFor(() =>
      expect(s.hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => s.hook.result.current.setLanguage('fr'))
    expect(s.hook.result.current.state).toEqual({
      phase: 'on',
      language: 'fr',
      model: 'full',
      canUpgrade: true,
    })
    return s
  }

  it('stage 2: a fully-quoted line is sent verbatim — the model is never consulted', async () => {
    // The default completion would happily "translate" anything; proving the
    // quote bypassed it requires the spy, not just the sendLine text.
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"look"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const { hook, echoLocal, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('"frotz the gnusto"')
    })
    expect(sendLine).toHaveBeenCalledWith('frotz the gnusto')
    expect(echoLocal).not.toHaveBeenCalled()
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it('stage 4: all-vocab English goes verbatim to the Z-parser — no LLM round-trip (F-H)', async () => {
    // 'open' (verbs1) + 'trap' (adjective) + 'door' (synonym) are all parser
    // dictionary words, so the line IS already a game command: send it as
    // typed, skip inference entirely, and do NOT echo (the transcript already
    // shows the player's own words).
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"look"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const { hook, echoLocal, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('open trap door')
    })
    expect(sendLine).toHaveBeenCalledWith('open trap door')
    expect(echoLocal).not.toHaveBeenCalled()
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it('does not echo when a translated stage returns the typed line verbatim (Zork III review #1)', async () => {
    // 'mailbox' is not a parser dictionary word (canonical/emit tokens never
    // are — F-Z), so 'open mailbox' misses stage-4 passthrough and reaches the
    // LLM. When the model hands back the player's OWN words, no translation
    // actually happened: the engine's '>' echo already shows the line, so the
    // nl-source "(you) …" line would be a pure duplicate. Suppress it.
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
    })
    const { hook, echoLocal, sendLine } = setup({ engine })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )
    await act(async () => {
      await hook.result.current.translate('open mailbox')
    })
    expect(sendLine).toHaveBeenCalledWith('open mailbox')
    expect(echoLocal).not.toHaveBeenCalled()
  })

  it("stage 4 collision guard: fr picker + a lexicon word ('examine') does NOT pass through — routes via the lexicon", async () => {
    // 'examine trapdoor' is all-vocab in English, but 'examine' is ALSO a
    // French core-lexicon verb (a reviewed collision). With the picker on fr
    // the token must NOT count as passthrough; the clause goes to stage 6,
    // which is a TRANSLATION — proven by the echo a passthrough never emits.
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const { hook, echoLocal, sendLine } = await setupFr({ engine })
    await act(async () => {
      await hook.result.current.translate('examine trapdoor')
    })
    expect(echoLocal).toHaveBeenCalledWith('examine trapdoor')
    expect(sendLine).toHaveBeenCalledWith('examine trapdoor')
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it("stage 6: deterministic lexicon parse — 'ouvre la trappe' → 'open trapdoor', no model call", async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const { hook, echoLocal, sendLine } = await setupFr({ engine })
    await act(async () => {
      await hook.result.current.translate('ouvre la trappe')
    })
    expect(echoLocal).toHaveBeenCalledWith('ouvre la trappe')
    expect(sendLine).toHaveBeenCalledWith('open trapdoor')
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it('stage 7: a clause the lexicon cannot resolve falls through to the LLM', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: {
        'frobnicate la trappe': '{"verb":"open","object":"trapdoor"}',
      },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const { hook, sendLine } = await setupFr({ engine })
    await act(async () => {
      await hook.result.current.translate('frobnicate la trappe')
    })
    expect(generateSpy).toHaveBeenCalledTimes(1)
    expect(sendLine).toHaveBeenCalledWith('open trapdoor')
  })

  it('stage 8 (F-R): non-EN abstain sends NOTHING to the game — styled notice, no turn burned', async () => {
    const { hook, echoLocal, sendLine } = await setupFr()
    await act(async () => {
      await hook.result.current.translate('blorple le ciel')
    })
    expect(sendLine).not.toHaveBeenCalled()
    expect(echoLocal).not.toHaveBeenCalled()
    // Localized (F1) — fr abstain, plain-language recovery (m4): "Je n’ai pas compris…".
    expect(hook.result.current.notice).toMatch(/je n’ai pas compris/i)
  })

  it('stage 8: EN abstain falls back to the raw line — the Z-parser explains the failure', async () => {
    const { hook, echoLocal, sendLine } = setup() // default engine abstains
    await reachOn(hook) // language 'en'
    await act(async () => {
      await hook.result.current.translate('frotz the gnusto')
    })
    expect(sendLine).toHaveBeenCalledWith('frotz the gnusto')
    expect(echoLocal).not.toHaveBeenCalled()
    expect(hook.result.current.notice).toBeNull()
  })

  it('stage 8: a compound whose FIRST clause hits an engine error is labeled a translator failure, not an abstain (Task 21 review)', async () => {
    // 'frobnicate la trappe' misses every deterministic stage and reaches the
    // LLM, which blows up. done === 0, but the player did nothing wrong — the
    // notice must say the translator failed, not "try simpler wording".
    const { hook, sendLine } = await setupFr({
      engine: new FakeLlmEngine({ cached: true, failGenerate: true }),
    })
    // The genuine engine error IS console.error'd by design — capture and
    // assert it so the test owns the log instead of leaking it to stderr.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await act(async () => {
        await hook.result.current.translate(
          'frobnicate la trappe et ouvre la trappe',
        )
      })
      expect(sendLine).not.toHaveBeenCalled() // non-EN abstain policy: nothing sent
      // Localized (F1) — fr translator FAILURE ("Échec de la traduction …"),
      // distinct from the abstain notice ("Traduction impossible …").
      expect(hook.result.current.notice).toMatch(/échec de la traduction/i)
      expect(hook.result.current.notice).not.toMatch(/traduction impossible/i)
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[nl]')),
      ).not.toEqual([])
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('stage 8: a SINGLE non-EN command that errors sends nothing — the drain catch honors the abstain policy (F2)', async () => {
    // total===1, so runClause's failure rethrows out of runLine into the outer
    // drain catch (NOT the in-runLine stage-8 path). That catch used to
    // raw-send the untranslated French to the Z-parser regardless of language;
    // it must instead obey the non-EN "nothing sent" policy.
    const { hook, sendLine } = await setupFr({
      engine: new FakeLlmEngine({ cached: true, failGenerate: true }),
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await act(async () => {
        await hook.result.current.translate('frobnicate la trappe')
      })
      expect(sendLine).not.toHaveBeenCalled() // non-EN: nothing sent
      // Localized (F1) — fr "… rien envoyé.".
      expect(hook.result.current.notice).toMatch(/rien envoyé/i)
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[nl]')),
      ).not.toEqual([])
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('stage 8: a compound whose FIRST clause times out is labeled a timeout (Task 21 review)', async () => {
    const engine = new FakeLlmEngine({ cached: true, generateDelayMs: 10000 })
    const { hook, sendLine } = await setupFr({ engine, watchdogMs: 1000 })
    vi.useFakeTimers()
    let p!: Promise<string | null>
    act(() => {
      p = hook.result.current.translate(
        'frobnicate la trappe et ouvre la trappe',
      )
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
      await p
    })
    expect(sendLine).not.toHaveBeenCalled()
    // Localized (F1) — fr timeout: "Délai de traduction dépassé …".
    expect(hook.result.current.notice).toMatch(/délai de traduction dépassé/i)
    vi.useRealTimers()
  })

  it("per-clause independence: 'prends la lampe et ouvre la trappe' runs both clauses deterministically — ZERO LLM calls", async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const generateSpy = vi.spyOn(engine, 'generate')
    const took = viewState('West of House', ['Taken.'], 'take light')
    const opened = viewState(
      'West of House',
      ['The door reluctantly opens.'],
      'open trapdoor',
    )
    const { hook, echoLocal, sendLine } = await setupFr({
      engine,
      awaitTurn: turnScript([took, opened]),
    })
    await act(async () => {
      await hook.result.current.translate('prends la lampe et ouvre la trappe')
    })
    // Real zork1 emits: 'brass lantern' → 'light', 'trap door' → 'trapdoor'.
    expect(sendLine.mock.calls.map(c => c[0])).toEqual([
      'take light',
      'open trapdoor',
    ])
    expect(generateSpy).not.toHaveBeenCalled()
    expect(echoLocal).toHaveBeenCalledTimes(1)
    expect(hook.result.current.notice).toBeNull()
  })
})

describe('EngineGate integration (output-translation spec §6)', () => {
  beforeEach(() => localStorage.clear())

  it('translation completes after a held output-priority gate task releases', async () => {
    // A shared EngineGate is held by a queued output-priority task. An LLM-
    // stage input line is submitted while the gate is held; after the output
    // task releases, the input waiter runs and the translation completes.
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open the mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const sharedGate = new EngineGate()
    const { hook, echoLocal, sendLine } = setup({ engine, gate: sharedGate })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.']),
      ),
    )

    // Hold the gate with an output-priority task (simulates the output-
    // translation hook occupying the engine).
    let releaseOutput!: () => void
    const outputDone = sharedGate.run('output', () => {
      return new Promise<void>(res => {
        releaseOutput = res
      })
    })

    // Submit a line that reaches the LLM stage — it must queue behind the
    // held output task and still complete once the output task releases.
    let translateDone!: Promise<string | null>
    act(() => {
      translateDone = hook.result.current.translate('open the mailbox')
    })

    // Flush microtasks while the gate is still held — the translation must
    // NOT have completed yet (bidirectional check: proves the gate is actually
    // gating, not just coincidentally passing afterwards).
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(sendLine).not.toHaveBeenCalled()

    // Release the output gate holder.
    act(() => releaseOutput())
    await act(async () => {
      await outputDone
      await translateDone
    })

    expect(echoLocal).toHaveBeenCalledWith('open the mailbox')
    expect(sendLine).toHaveBeenCalledWith('open mailbox')
  })
})
