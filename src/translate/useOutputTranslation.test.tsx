import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useOutputTranslation } from './useOutputTranslation'
import { EngineGate } from '../llm/engineGate'
import { FakeLlmEngine } from '../llm/engine.fake'
import { cacheGet, cacheSet } from './fallbackCache'
import { readMisses } from './missLog'
import type { ViewState, BufferLine } from '../glkote-react/types'
import type { TranslationCorpus } from './types'
import type { NlLanguage } from '../llm/types'

const corpus: TranslationCorpus = {
  strings: { 'Taken.': 'Pris.', 'West of House': "À l'ouest de la maison" },
  objects: {},
  templates: [],
}

let nextId = 1
function line(kind: BufferLine['kind'], text: string): BufferLine {
  return { id: nextId++, kind, text }
}
function view(
  lines: BufferLine[],
  status = { location: 'West of House', right: 'Score: 0   Moves: 1' },
): ViewState {
  return { status, lines, inputRequest: 'line', ended: false, nextId }
}

function setup(opts: {
  language?: NlLanguage
  engine?: FakeLlmEngine
  initial: ViewState
  watchdogMs?: number
}) {
  const engine = opts.engine ?? new FakeLlmEngine({ default: 'fallback-fr' })
  const gate = new EngineGate()
  const r = renderHook(
    ({ v, lang }: { v: ViewState; lang: NlLanguage }) =>
      useOutputTranslation({
        view: v,
        language: lang,
        signature: 'test-sig',
        engine,
        gate,
        corpusOverride: corpus,
        watchdogMs: opts.watchdogMs,
      }),
    { initialProps: { v: opts.initial, lang: opts.language ?? 'fr' } },
  )
  return { ...r, engine, gate }
}

// fake-indexeddb is one shared DB across the file; wipe between tests so e.g.
// the cache-hit test's entry can't leak into the failure-path tests.
const resetDb = () =>
  new Promise<void>(r => {
    const req = indexedDB.deleteDatabase('loquor')
    req.onsuccess = req.onerror = () => r()
  })

beforeEach(async () => {
  nextId = 1
  localStorage.clear()
  await resetDb()
})

describe('passthrough (spec §3)', () => {
  it('en/off return the ViewState untouched', () => {
    const v = view([line('output', 'Taken.')])
    const { result } = setup({ language: 'off', initial: v })
    expect(result.current.lines).toBe(v.lines)
    expect(result.current.status).toBe(v.status)
  })
})

describe('sync table hits (spec §3/§5)', () => {
  it('translates output and room lines; input/nl-source never reach the matcher', () => {
    const v = view([
      line('room', 'West of House'),
      line('output', 'Taken.'),
      line('input', 'Taken.'), // same text, but an echoed command — untouched
      line('nl-source', 'Taken.'),
    ])
    const { result } = setup({ initial: v })
    expect(result.current.lines.map(l => l.text)).toEqual([
      "À l'ouest de la maison",
      'Pris.',
      'Taken.',
      'Taken.',
    ])
  })
  it('re-applies leading indent (spec §4)', () => {
    const v = view([line('output', '  Taken.')])
    const { result } = setup({ initial: v })
    expect(result.current.lines[0].text).toBe('  Pris.')
  })
  it('translates the status line', () => {
    const { result } = setup({ initial: view([]) })
    expect(result.current.status).toEqual({
      location: "À l'ouest de la maison",
      right: 'Score : 0  Coups : 1',
    })
  })
})

describe('LLM fallback on live misses (spec §6)', () => {
  it('shimmer → resolved → cached', async () => {
    const engine = new FakeLlmEngine({ default: 'Une ligne inconnue.' })
    await engine.load(() => {}, new AbortController().signal)
    const v0 = view([]) // activation with empty transcript: nothing is backlog
    const { result, rerender } = setup({ engine, initial: v0 })
    const v1 = view([line('output', 'An unknown line.')])
    rerender({ v: v1, lang: 'fr' })
    expect(result.current.lines[0].pending).toBe(true)
    expect(result.current.lines[0].text).toBe('…traduction')
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Une ligne inconnue.'),
    )
    expect(result.current.lines[0].pending).toBeUndefined()
    expect(await cacheGet('test-sig', 'fr', 'An unknown line.')).toBe(
      'Une ligne inconnue.',
    )
    // still a corpus gap → logged
    expect(readMisses().some(m => m.en === 'An unknown line.')).toBe(true)
  })

  it('cache hit resolves without generating', async () => {
    await cacheSet('test-sig', 'fr', 'An unknown line.', 'Depuis le cache.')
    const engine = new FakeLlmEngine({})
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({ engine, initial: view([]) })
    rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Depuis le cache.'),
    )
    expect(engine.generateCalls).toBe(0)
  })

  it('engine not loaded → English shown, miss logged, nothing generated (spec §6 failure)', async () => {
    const engine = new FakeLlmEngine({}) // never loaded
    const { result, rerender } = setup({ engine, initial: view([]) })
    rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
    await waitFor(() =>
      expect(readMisses().some(m => m.en === 'An unknown line.')).toBe(true),
    )
    expect(result.current.lines[0].text).toBe('An unknown line.')
    expect(result.current.lines[0].pending).toBeUndefined()
    expect(engine.generateCalls).toBe(0)
  })

  it('generation failure → English, logged', async () => {
    const engine = new FakeLlmEngine({ failGenerate: true })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({ engine, initial: view([]) })
    rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('An unknown line.'),
    )
    expect(readMisses().length).toBeGreaterThan(0)
  })
})

describe('bare prompt line (UAT: the phantom castle)', () => {
  it("a live '>' line never reaches the fallback — no generation, no cache, no log", async () => {
    const engine = new FakeLlmEngine({
      default: 'Vous êtes dans un petit château.',
    })
    await engine.load(() => {}, new AbortController().signal)
    // A hallucination poisoned the cache in an earlier session; it must be
    // dead — never consulted, never rendered.
    await cacheSet('test-sig', 'fr', '>', 'Vous êtes dans un petit château.')
    const { result, rerender } = setup({ engine, initial: view([]) })
    rerender({ v: view([line('output', '>')]), lang: 'fr' })
    // settle any wrongly-started async work before asserting
    await act(async () => {})
    expect(result.current.lines[0].text).toBe('>')
    expect(result.current.lines[0].pending).toBeUndefined()
    expect(engine.generateCalls).toBe(0)
    expect(readMisses()).toEqual([])
  })

  it("activation purges a poisoned '>' cache entry left by an earlier session", async () => {
    await cacheSet('test-sig', 'fr', '>', 'Vous êtes dans un petit château.')
    setup({ initial: view([]) })
    await waitFor(async () =>
      expect(await cacheGet('test-sig', 'fr', '>')).toBeUndefined(),
    )
  })
})

describe('backlog rule (spec §3: matcher + CACHE hits only)', () => {
  it('backlog lines: table and cache hits apply; uncached misses stay English; nothing generates', async () => {
    const engine = new FakeLlmEngine({ default: 'should-not-appear' })
    await engine.load(() => {}, new AbortController().signal)
    // A fallback translation cached in a PREVIOUS session must survive a
    // restore rebuild (spec §6: each miss costs once per device, ever).
    await cacheSet(
      'test-sig',
      'fr',
      'Cached old line.',
      'Vieille ligne en cache.',
    )
    const v = view([
      line('output', 'Old unknown line.'),
      line('output', 'Cached old line.'),
      line('output', 'Taken.'),
    ])
    const { result, rerender } = setup({ engine, initial: v })
    // table hit still applies to backlog; misses render English immediately
    expect(result.current.lines.map(l => l.text)).toEqual([
      'Old unknown line.',
      'Cached old line.',
      'Pris.',
    ])
    // the cached backlog miss resolves async — no shimmer, no generation
    await waitFor(() =>
      expect(result.current.lines[1].text).toBe('Vieille ligne en cache.'),
    )
    expect(result.current.lines[0].text).toBe('Old unknown line.')
    expect(engine.generateCalls).toBe(0)
    // and a LIVE line appended later still falls back
    rerender({
      v: view([...v.lines, line('output', 'New unknown line.')]),
      lang: 'fr',
    })
    await waitFor(() =>
      expect(
        result.current.lines.find(l => l.text === 'should-not-appear'),
      ).toBeTruthy(),
    )
    expect(engine.generateCalls).toBe(1) // only the live line generated
    expect(readMisses().some(m => m.kind === 'backlog')).toBe(true)
  })

  it('an append merge onto a backlog line invalidates the old translation and re-consults the cache', async () => {
    const engine = new FakeLlmEngine({ default: 'should-not-appear' })
    await engine.load(() => {}, new AbortController().signal)
    await cacheSet('test-sig', 'fr', 'Backlog tail.', 'Queue du backlog.')
    await cacheSet(
      'test-sig',
      'fr',
      'Backlog tail. And more.',
      'Queue fusionnée.',
    )
    const l = line('output', 'Backlog tail.')
    const { result, rerender } = setup({ engine, initial: view([l]) })
    // the cached backlog translation settles for the original text
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Queue du backlog.'),
    )
    // append merge: same id, NEW text — the old overlay entry must not render
    rerender({
      v: view([{ ...l, text: 'Backlog tail. And more.' }]),
      lang: 'fr',
    })
    expect(result.current.lines[0].text).toBe('Backlog tail. And more.')
    // the merged text is a different EN line: cache-consulted (and re-logged)
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Queue fusionnée.'),
    )
    expect(engine.generateCalls).toBe(0) // backlog never generates
    expect(
      readMisses()
        .filter(m => m.kind === 'backlog')
        .map(m => m.en),
    ).toEqual(['Backlog tail.', 'Backlog tail. And more.'])
  })
})

describe('watchdog (spec §6)', () => {
  it('a wedged generation degrades to English after the watchdog — silently (expected control flow)', async () => {
    const engine = new FakeLlmEngine({
      default: 'jamais rendu',
      generateDelayMs: 10_000, // far beyond the (shortened) watchdog
    })
    await engine.load(() => {}, new AbortController().signal)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { result, rerender } = setup({
        engine,
        initial: view([]),
        watchdogMs: 50,
      })
      rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
      expect(result.current.lines[0].pending).toBe(true)
      expect(result.current.lines[0].text).toBe('…traduction')
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('An unknown line.'),
      )
      expect(result.current.lines[0].pending).toBeUndefined()
      expect(readMisses().some(m => m.en === 'An unknown line.')).toBe(true)
      // a watchdog timeout is expected control flow, not an engine failure
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')),
      ).toEqual([])
    } finally {
      errorSpy.mockRestore()
    }
  })
})

describe('queue abandonment (spec §3/§6)', () => {
  it('a switch to off abandons QUEUED generations — they never run, not just never render', async () => {
    const engine = new FakeLlmEngine({ default: 'jamais rendu' })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender, gate } = setup({ engine, initial: view([]) })
    // Hold the gate so the live miss's generation QUEUES behind it.
    let release!: () => void
    const held = gate.run('output', () => new Promise<void>(r => (release = r)))
    const l = line('output', 'An unknown line.')
    rerender({ v: view([l]), lang: 'fr' })
    await waitFor(() => expect(result.current.lines[0].pending).toBe(true))
    rerender({ v: view([l]), lang: 'off' }) // epoch bumps; queued task must bail
    await act(async () => {
      release()
      await held
    })
    expect(engine.generateCalls).toBe(0) // the queued generation never started
    expect(result.current.lines[0].text).toBe('An unknown line.') // passthrough
  })
})

describe('append-merge memoization (spec §3)', () => {
  it('a line whose text changes re-translates (memo keyed on text, not id)', async () => {
    const engine = new FakeLlmEngine({
      completions: {
        'Partial line': 'Ligne partielle',
        'Partial line, now complete.': 'Ligne complète.',
      },
    })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({ engine, initial: view([]) })
    const l = line('output', 'Partial line')
    rerender({ v: view([l]), lang: 'fr' })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Ligne partielle'),
    )
    rerender({
      v: view([{ ...l, text: 'Partial line, now complete.' }]),
      lang: 'fr',
    })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Ligne complète.'),
    )
  })
})
