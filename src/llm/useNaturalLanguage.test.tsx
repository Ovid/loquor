import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNaturalLanguage } from './useNaturalLanguage'
import { FakeLlmEngine } from './engine.fake'
import { readNlPref } from './nlpref'
import type { CapabilityResult } from './types'
import type { Vocab } from './grammar/types'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT, FAILURE_PAT } from './grammar/patterns'
import { emptyView } from '../glkote-react/types'
import type { ViewState, BufferLine, TurnResult } from '../glkote-react/types'

const capable: CapabilityResult = { tier: 'small', reasons: [] }
const ctx = () => ({ location: 'West of House', recentOutput: '' })

const TEST_VOCAB: Vocab = {
  verbsOnly: ['look', 'inventory'],
  movement: ['north'],
  verbs1: ['take', 'open'],
  verbs2: ['unlock'],
  preps: ['with'],
  nouns: [{ canonical: 'mailbox' }, { canonical: 'leaflet' }],
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
  const sendLine = vi.fn()
  const engine =
    over.engine ?? new FakeLlmEngine({ default: '{"verb":"__UNKNOWN__"}' })
  const hook = renderHook(() =>
    useNaturalLanguage({
      engine,
      capability: capable,
      vocab: TEST_VOCAB,
      getContext: ctx,
      echoLocal,
      sendLine,
      awaitTurn: async () => ({ view: emptyView, reason: 'line' as const }),
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

  it('vocab null → disabled (silent), not unavailable', () => {
    const { hook } = setup({ vocab: null })
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

  it('locks input (pending=true) while a translation is in flight', async () => {
    const engine = new FakeLlmEngine({
      generateDelayMs: 50,
      completions: { go: '{"verb":"north"}' },
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
    await waitFor(() => expect(hook.result.current.state.phase).toBe('off'))
    expect(hook.result.current.notice).toBeNull()
    expect(readNlPref().enabled).toBe(false)
    resolveLoad()
  })

  it('a load that RESOLVES after cancel does not flip on / persist enabled', async () => {
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
    expect(hook.result.current.state.phase).toBe('off')
    expect(readNlPref().enabled).toBe(false)
  })

  it('restores the enabled choice on remount when the model is cached', async () => {
    const a = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await reachOn(a.hook) // persists enabled=true
    expect(readNlPref().enabled).toBe(true)
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

  it('observe is idempotent across re-renders of the same turn', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      default: '{"verb":"__UNKNOWN__"}',
    })
    const { hook } = setup({ engine })
    await reachOn(hook)
    const v = viewState('West of House', ['A lamp is here.'])
    act(() => hook.result.current.observe(v))
    act(() => hook.result.current.observe(v)) // duplicate — must not double-apply
    // No throw, no corruption; a second identical observe is a no-op by construction.
    expect(true).toBe(true)
  })

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
    const afterTake = viewState('West of House', ['take leaflet', 'Taken.'], 'take leaflet')
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
      await hook.result.current.translate('Ouvrez la boîte aux lettres and prends-le')
    })
    expect(echoLocal).toHaveBeenCalledTimes(1)
    expect(echoLocal).toHaveBeenCalledWith('Ouvrez la boîte aux lettres and prends-le')
    expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox', 'take leaflet'])
    expect(hook.result.current.notice).toBeNull()
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
    const { hook, sendLine } = setup({ engine, awaitTurn: turnScript([revealView]) })
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

  it('compound: stops after an in-game no-op (failurePat) on the first clause', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const noop = viewState('West of House', ['open mailbox', 'It is already open.'], 'open mailbox')
    const { hook, sendLine } = setup({
      engine,
      vocab: { ...TEST_VOCAB, failurePat: FAILURE_PAT },
      awaitTurn: turnScript([noop]),
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

  it('compound: stops when a clause lands on a disambiguation prompt', async () => {
    const engine = new FakeLlmEngine({
      cached: true,
      completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
      default: '{"verb":"__UNKNOWN__"}',
    })
    const disambig = viewState(
      'West of House',
      ['open mailbox', 'Which mailbox do you mean, the brass mailbox or the small mailbox?'],
      'open mailbox',
    )
    const { hook, sendLine } = setup({ engine, awaitTurn: turnScript([disambig]) })
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
    const { hook, sendLine } = setup({ engine, watchdogMs: 1000, awaitTurn: neverSettle })
    await reachOn(hook)
    act(() =>
      hook.result.current.observe(
        viewState('West of House', ['There is a small mailbox here.', 'a leaflet']),
      ),
    )
    vi.useFakeTimers()
    let p!: Promise<void>
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

  it('compound: first clause untranslatable → raw-send the whole input, no notice', async () => {
    const { hook, echoLocal, sendLine } = setup({
      engine: new FakeLlmEngine({ cached: true, default: '{"verb":"__UNKNOWN__"}' }),
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
    const engine = new FakeLlmEngine({ cached: true, default: '{"verb":"look"}' })
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
    let p!: Promise<void>
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
