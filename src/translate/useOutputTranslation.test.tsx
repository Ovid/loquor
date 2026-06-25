import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useOutputTranslation } from './useOutputTranslation'
import { EngineGate } from '../shared/engineGate'
import { FakeLlmEngine } from '../llm/engine.fake'
import { cacheGet, cacheSet } from './fallbackCache'
import * as idb from '../storage/idb'
import { readMisses } from './missLog'
import { CORPUS_ONLY_LANGS } from './corpus/index'
import type { ViewState, BufferLine } from '../glkote-react/types'
import { viewToContext } from '../llm/prompt'
import { isConfirmationPrompt } from '../llm/inputTranslate'
import type { TranslationCorpus } from './types'
import type {
  ChatMessages,
  LlmEngine,
  LoadProgress,
  NlLanguage,
} from '../llm/types'

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
  echoMap?: ReadonlyMap<string, string>
  llmEnabled?: boolean
}) {
  const engine = opts.engine ?? new FakeLlmEngine({ default: 'fallback-fr' })
  const gate = new EngineGate()
  const r = renderHook(
    ({
      v,
      lang,
      em,
    }: {
      v: ViewState
      lang: NlLanguage
      em?: ReadonlyMap<string, string>
    }) =>
      useOutputTranslation({
        view: v,
        language: lang,
        signature: 'test-sig',
        engine,
        gate,
        corpusOverride: corpus,
        watchdogMs: opts.watchdogMs,
        // Per-render override (em) so a test can advance the re-voice map;
        // defaults to the setup-time echoMap when a rerender omits it.
        echoMap: em === undefined ? opts.echoMap : em,
        llmEnabled: opts.llmEnabled ?? true,
      }),
    {
      initialProps: {
        v: opts.initial,
        lang: opts.language ?? 'fr',
        em: opts.echoMap,
      } as { v: ViewState; lang: NlLanguage; em?: ReadonlyMap<string, string> },
    },
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

describe('hidden side effects (F-18 safety net)', () => {
  // The hook's {lines, status} signature hides a mount-time global install
  // (window.loquorMisses, the dev miss-dump). This pins that effect so a
  // refactor making the side effects explicit (F-18) cannot drop it. Other
  // effects (cache write/delete, miss-log append, generation) are already
  // pinned by the fallback/backlog suites below.
  it('mounting installs the window.loquorMisses dev dump', () => {
    delete (window as unknown as { loquorMisses?: unknown }).loquorMisses
    expect(
      (window as unknown as { loquorMisses?: unknown }).loquorMisses,
    ).toBeUndefined()
    const { unmount } = setup({ initial: view([line('output', 'Taken.')]) })
    expect(
      typeof (window as unknown as { loquorMisses?: unknown }).loquorMisses,
    ).toBe('function')
    unmount()
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
  it('stamps lang on translated lines and on the player nl-source (3.1.2)', () => {
    const v = view([
      line('room', 'West of House'), // translated -> fr
      line('output', 'Taken.'), // translated -> fr
      line('output', 'Mailbox.'), // a miss -> stays English, no lang
      line('input', 'open mailbox'), // canonical echo -> English, no lang
      line('nl-source', 'ouvre la boîte'), // player's French input -> fr
    ])
    const { result } = setup({ initial: v })
    expect(result.current.lines.map(l => l.lang)).toEqual([
      'fr',
      'fr',
      undefined,
      undefined,
      'fr',
    ])
  })
  it('nl-source carries the active language, not a hardcoded fr (de)', () => {
    const v = view([line('nl-source', 'nimm die lampe')])
    const { result } = setup({ language: 'de', initial: v })
    expect(result.current.lines[0].lang).toBe('de')
    expect(result.current.lines[0].text).toBe('nimm die lampe') // untouched
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

// PROOF (brainstorming 2026-06-16): the input layer's prompt detectors read the
// ENGLISH source, never the localized display. The output overlay is a pure
// DISPLAY transform — it produces translated DisplayLines but does NOT mutate the
// ViewState that the NL input layer reads via viewToContext(viewRef.current).
// So a German player sees "(Y bedeutet ja)" while recentOutput stays the English
// "(Y is affirmative)". This is why the per-language detection clauses are dead
// code: detection always runs on English.
describe('PROOF: display is localized but the input-side ViewState stays English', () => {
  it('overlay localizes the confirmation line for DISPLAY while viewToContext sees English', () => {
    const deConfirm: TranslationCorpus = {
      strings: {
        'Do you wish to restart? (Y is affirmative):':
          'Möchtest du neu beginnen? (J bedeutet ja):',
      },
      objects: {},
      templates: [],
    }
    const english = 'Do you wish to restart? (Y is affirmative):'
    const v = view([line('output', english)])

    const gate = new EngineGate()
    const engine = new FakeLlmEngine({ default: 'fallback' })
    const { result } = renderHook(() =>
      useOutputTranslation({
        view: v,
        language: 'de',
        signature: 'test-sig',
        engine,
        gate,
        corpusOverride: deConfirm,
      }),
    )

    // DISPLAY: the player sees German.
    expect(result.current.lines[0].text).toBe(
      'Möchtest du neu beginnen? (J bedeutet ja):',
    )
    // INPUT PATH: the overlay did NOT mutate the source ViewState — viewToContext
    // (what getContext()/recentOutput reads) still yields the English prompt.
    const ctx = viewToContext(v)
    expect(ctx.recentOutput).toBe(english)
    expect(ctx.recentOutput).not.toContain('bedeutet ja')
    // And the ENGLISH clause alone fires the detector — no German clause needed.
    expect(isConfirmationPrompt(ctx.recentOutput)).toBe(true)
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

  it('a glued " >" input-prompt residue is split off before fallback: clean line translated, cached clean, residue re-appended (review I4)', async () => {
    // A CR-less Y/N prompt merges with the bare ">" line-input prompt into ONE
    // BufferLine. matchLine() strips the residue for corpus lookup; the fallback
    // must do the same — translate the clean core, cache under the clean key,
    // re-append the " >". The completion is keyed on the CLEAN core only, so a
    // residue-bearing prompt reaching the model would miss it.
    const engine = new FakeLlmEngine({
      completions: { 'Some unknown question?': 'Une question inconnue ?' },
    })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({ engine, initial: view([]) })
    rerender({
      v: view([line('output', 'Some unknown question? >')]),
      lang: 'fr',
    })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Une question inconnue ? >'),
    )
    // cached under the CLEAN key, not the residue-bearing one
    expect(await cacheGet('test-sig', 'fr', 'Some unknown question?')).toBe(
      'Une question inconnue ?',
    )
    expect(
      await cacheGet('test-sig', 'fr', 'Some unknown question? >'),
    ).toBeUndefined()
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

  it('a model completion that is bare chrome (">") is rejected — no phantom output, no cache poison (review I1/S16a)', async () => {
    // The model hallucinates the line-input prompt for a non-">" input. Its
    // output must be run through the SAME untranslatable() guard the input side
    // uses: render English (transient failure), never the ">", and never cache.
    const engine = new FakeLlmEngine({ default: '>' })
    await engine.load(() => {}, new AbortController().signal)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { result, rerender } = setup({ engine, initial: view([]) })
      rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('An unknown line.'),
      )
      expect(result.current.lines[0].text).not.toBe('>') // no phantom output
      expect(result.current.lines[0].pending).toBeUndefined()
      expect(engine.generateCalls).toBe(1)
      // the real EN key is never poisoned with the chrome completion
      expect(
        await cacheGet('test-sig', 'fr', 'An unknown line.'),
      ).toBeUndefined()
      // surfaced as a transient retry, not a silent settle
      expect(
        warnSpy.mock.calls.filter(c => String(c[0]).includes('will retry')),
      ).not.toEqual([])
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')),
      ).toEqual([])
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('a model completion that echoes the English line unchanged is rejected — not settled, never cached (review I1)', async () => {
    // A model that "refuses" (short lines, proper nouns) returns the EN line
    // verbatim. out is non-empty and non-">", so the untranslatable() guard
    // alone lets it settle as a real translation AND cache it permanently under
    // the clean EN key — a non-translation the activation-time ">" purge can
    // never evict (spec §6: a miss costs one generation per device, ever).
    // Treat an English-unchanged completion as a transient miss instead.
    const engine = new FakeLlmEngine({ default: 'An unknown line.' })
    await engine.load(() => {}, new AbortController().signal)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { result, rerender } = setup({ engine, initial: view([]) })
      rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('An unknown line.'),
      )
      expect(result.current.lines[0].pending).toBeUndefined()
      expect(engine.generateCalls).toBe(1)
      // the EN key is never poisoned with the unchanged-English completion
      expect(
        await cacheGet('test-sig', 'fr', 'An unknown line.'),
      ).toBeUndefined()
      // surfaced as a transient retry, not a silent settle
      expect(
        warnSpy.mock.calls.filter(c => String(c[0]).includes('will retry')),
      ).not.toEqual([])
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')),
      ).toEqual([])
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('engine not loaded → English shown, miss logged, nothing generated, queued for retry (spec §6 failure + review F1)', async () => {
    const engine = new FakeLlmEngine({}) // never loaded
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { result, rerender } = setup({ engine, initial: view([]) })
      rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
      await waitFor(() =>
        expect(readMisses().some(m => m.en === 'An unknown line.')).toBe(true),
      )
      expect(result.current.lines[0].text).toBe('An unknown line.')
      expect(result.current.lines[0].pending).toBeUndefined()
      expect(engine.generateCalls).toBe(0)
      // a still-loading model is a TRANSIENT failure, not a permanent English
      // pin (review F1): surfaced as a retry warning, not an engine error.
      expect(
        warnSpy.mock.calls.filter(c =>
          String(c[0]).includes('engine not loaded'),
        ),
      ).not.toEqual([])
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('a live miss while the model is not yet in memory recovers once it loads (review F1)', async () => {
    // Reload scenario: French auto-restored to 'on' (model cached on disk) but
    // not in memory this session, so engine.isLoaded() is false until the input
    // pipeline lazy-loads it on the first command. A LIVE miss in that window
    // must not be pinned to English forever — it should re-attempt once the
    // engine is loaded, exactly like the "engine unloaded while queued" path.
    const engine = new FakeLlmEngine({ default: 'Repli après chargement.' })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const l = line('output', 'An unknown line.')
      const { result, rerender } = setup({ engine, initial: view([]) })
      // Engine not loaded → English now (transient), nothing generated yet.
      rerender({ v: view([l]), lang: 'fr' })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('An unknown line.'),
      )
      expect(engine.generateCalls).toBe(0)
      // The model finishes loading; the next render re-attempts and resolves.
      await engine.load(() => {}, new AbortController().signal)
      rerender({ v: view([l]), lang: 'fr' })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('Repli après chargement.'),
      )
      expect(engine.generateCalls).toBe(1)
      // surfaced as a transient retry, not a permanent English pin
      expect(
        warnSpy.mock.calls.filter(c => String(c[0]).includes('will retry')),
      ).not.toEqual([])
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('a transient cache-READ failure is treated as a miss → falls through to the fallback, no console.error (review I1/S6)', async () => {
    const engine = new FakeLlmEngine({ default: 'Repli généré.' })
    await engine.load(() => {}, new AbortController().signal)
    // The live resolve path consults the cache exactly once before generating;
    // make the underlying IDB read reject (transient error) and prove the real
    // cacheGet folds it into a miss (review S6) — distinct from a clean miss.
    const getSpy = vi
      .spyOn(idb, 'idbGet')
      .mockRejectedValueOnce(new Error('idb read blew up'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { result, rerender } = setup({ engine, initial: view([]) })
      rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('Repli généré.'),
      )
      expect(engine.generateCalls).toBe(1) // read error → miss → generated
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')),
      ).toEqual([])
    } finally {
      errorSpy.mockRestore()
      getSpy.mockRestore()
    }
  })

  it('engine torn down while a translation is queued → English, surfaced as a retry warning not an engine error (review I1 + S1)', async () => {
    const engine = new FakeLlmEngine({ default: 'jamais rendu' })
    await engine.load(() => {}, new AbortController().signal)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { result, rerender, gate } = setup({ engine, initial: view([]) })
      // Hold the gate so the live miss's generation QUEUES behind it…
      let release!: () => void
      const held = gate.run(
        'output',
        () => new Promise<void>(r => (release = r)),
      )
      rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
      await waitFor(() => expect(result.current.lines[0].pending).toBe(true))
      // Ensure resolve() has cleared the pre-gate isLoaded() check (engine still
      // up) and is QUEUED at the held gate before we tear it down — otherwise
      // the cacheGet read races engine.unload() and resolve finds the engine
      // already gone at the PRE-gate check (the equivalent 'engine not loaded'
      // path). The miss is logged immediately before gate.run, so a logged miss
      // proves we've reached the queue while still loaded.
      await waitFor(() =>
        expect(readMisses().some(m => m.en === 'An unknown line.')).toBe(true),
      )
      // …then tear the engine down before the queued task acquires the gate.
      await engine.unload()
      await act(async () => {
        release()
        await held
      })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('An unknown line.'),
      )
      expect(result.current.lines[0].pending).toBeUndefined()
      expect(engine.generateCalls).toBe(0) // never generated on a dead engine
      // not misreported as a broken engine (no error); surfaced as a transient
      // retry instead (the retry waits for the engine to come back — S1)
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')),
      ).toEqual([])
      expect(
        warnSpy.mock.calls.filter(c =>
          String(c[0]).includes('engine unloaded'),
        ),
      ).not.toEqual([])
    } finally {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })

  it('a transient failure retries once, then gives up to English and surfaces it as an error (review S1)', async () => {
    const engine = new FakeLlmEngine({ failGenerate: true }) // every attempt fails
    await engine.load(() => {}, new AbortController().signal)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const l = line('output', 'An unknown line.')
      const { result, rerender } = setup({ engine, initial: view([]) })
      // First attempt fails → English now, but a retry is QUEUED: warned, not
      // errored, and not yet a permanent give-up.
      rerender({ v: view([l]), lang: 'fr' })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('An unknown line.'),
      )
      expect(engine.generateCalls).toBe(1)
      expect(
        warnSpy.mock.calls.filter(c => String(c[0]).includes('will retry')),
      ).not.toEqual([])
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')),
      ).toEqual([])
      // A later render re-attempts exactly once; the second failure is terminal
      // and surfaced as an error so a genuinely broken engine stays diagnosable.
      rerender({ v: view([l]), lang: 'fr' })
      await waitFor(() =>
        expect(
          errorSpy.mock.calls.filter(c =>
            String(c[0]).includes('leaving this line'),
          ),
        ).not.toEqual([]),
      )
      expect(engine.generateCalls).toBe(2) // one retry, no more
      // A third render must not attempt again — the budget is spent.
      rerender({ v: view([l]), lang: 'fr' })
      await act(async () => {})
      expect(engine.generateCalls).toBe(2)
      expect(result.current.lines[0].text).toBe('An unknown line.')
      // the corpus gap is logged once, not once per retry
      expect(readMisses().filter(m => m.en === 'An unknown line.').length).toBe(
        1,
      )
    } finally {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })

  it('a transient failure that recovers retranslates on the retry (review S1)', async () => {
    // Fails the first generation, succeeds the second.
    class FlakyOnceEngine implements LlmEngine {
      calls = 0
      async load(
        _p: (p: LoadProgress) => void,
        _s: AbortSignal,
      ): Promise<void> {}
      async unload(): Promise<void> {}
      isLoaded(): boolean {
        return true
      }
      async isCached(): Promise<boolean> {
        return true
      }
      async generate(): Promise<string> {
        this.calls++
        if (this.calls === 1) throw new Error('transient WebGPU hiccup')
        return 'Réussi au deuxième essai.'
      }
    }
    const engine = new FlakyOnceEngine()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const l = line('output', 'An unknown line.')
      const gate = new EngineGate()
      const { result, rerender } = renderHook(
        ({ v }: { v: ViewState }) =>
          useOutputTranslation({
            view: v,
            language: 'fr',
            signature: 'test-sig',
            engine,
            gate,
            corpusOverride: corpus,
          }),
        { initialProps: { v: view([]) } },
      )
      rerender({ v: view([l]) })
      // first attempt fails → English, retry queued
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('An unknown line.'),
      )
      expect(engine.calls).toBe(1)
      // a later render re-attempts and succeeds
      rerender({ v: view([l]) })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('Réussi au deuxième essai.'),
      )
      expect(engine.calls).toBe(2)
      expect(
        warnSpy.mock.calls.filter(c => String(c[0]).includes('will retry')),
      ).not.toEqual([])
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('defers the retry until the engine reports loaded again (review S1)', async () => {
    const engine = new FakeLlmEngine({ default: 'Repli après recharge.' })
    await engine.load(() => {}, new AbortController().signal)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const l = line('output', 'An unknown line.')
      const { result, rerender, gate } = setup({ engine, initial: view([]) })
      // Queue the generation behind a held gate, then unload → "engine unloaded
      // while queued" failure with a retry pending.
      let release!: () => void
      const held = gate.run(
        'output',
        () => new Promise<void>(r => (release = r)),
      )
      rerender({ v: view([l]), lang: 'fr' })
      await waitFor(() => expect(result.current.lines[0].pending).toBe(true))
      await engine.unload()
      await act(async () => {
        release()
        await held
      })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('An unknown line.'),
      )
      expect(engine.generateCalls).toBe(0) // never generated on the dead engine
      // Engine still down: a new render must NOT spend the retry.
      rerender({ v: view([l]), lang: 'fr' })
      await act(async () => {})
      expect(engine.generateCalls).toBe(0)
      // Engine back: the next render fires the retry and resolves.
      await engine.load(() => {}, new AbortController().signal)
      rerender({ v: view([l]), lang: 'fr' })
      await waitFor(() =>
        expect(result.current.lines[0].text).toBe('Repli après recharge.'),
      )
      expect(engine.generateCalls).toBe(1)
    } finally {
      warnSpy.mockRestore()
    }
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
  it('a wedged generation degrades to English after the watchdog and is queued for one retry (review S1)', async () => {
    const engine = new FakeLlmEngine({
      default: 'jamais rendu',
      generateDelayMs: 10_000, // far beyond the (shortened) watchdog
    })
    await engine.load(() => {}, new AbortController().signal)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
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
      // a watchdog timeout is a transient failure: surfaced as a retry warning,
      // NOT an error, and not a permanent give-up
      expect(
        warnSpy.mock.calls.filter(c => String(c[0]).includes('watchdog')),
      ).not.toEqual([])
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')),
      ).toEqual([])
    } finally {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })
})

describe('gate mutual exclusion on the watchdog path (review I2)', () => {
  // A generation that only ever settles via abort, and settles its interrupt
  // LATE (the worker takes a beat to stop). Tracks concurrent in-flight calls:
  // if the gate releases before the aborted call settles, the next waiter's
  // generate() overlaps it and maxInFlight climbs to 2.
  class OverlapEngine implements LlmEngine {
    inFlight = 0
    maxInFlight = 0
    async load(_p: (p: LoadProgress) => void, _s: AbortSignal): Promise<void> {}
    async unload(): Promise<void> {}
    isLoaded(): boolean {
      return true
    }
    async isCached(): Promise<boolean> {
      return true
    }
    generate(
      _prompt: ChatMessages,
      _grammar: string | null,
      signal?: AbortSignal,
    ): Promise<string> {
      this.inFlight++
      this.maxInFlight = Math.max(this.maxInFlight, this.inFlight)
      return new Promise<string>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          setTimeout(() => {
            this.inFlight--
            reject(new DOMException('aborted', 'AbortError'))
          }, 20)
        })
      })
    }
  }

  // An engine that hangs, then — once the watchdog aborts it — settles with a
  // GENUINE non-abort fault (a crashed engine / lost WebGPU device), not the
  // expected AbortError. The bare `await gen.catch(() => {})` used to swallow
  // this, masking a dead engine as a transient timeout (review I2).
  class DeadAfterAbortEngine implements LlmEngine {
    async load(_p: (p: LoadProgress) => void, _s: AbortSignal): Promise<void> {}
    async unload(): Promise<void> {}
    isLoaded(): boolean {
      return true
    }
    async isCached(): Promise<boolean> {
      return true
    }
    generate(
      _prompt: ChatMessages,
      _grammar: string | null,
      signal?: AbortSignal,
    ): Promise<string> {
      return new Promise<string>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          setTimeout(() => reject(new Error('WebGPU device lost')), 10)
        })
      })
    }
  }

  it('surfaces a genuine post-watchdog engine fault distinctly, not masked as a timeout (review I2)', async () => {
    const engine = new DeadAfterAbortEngine()
    const gate = new EngineGate()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { result, rerender } = renderHook(
        ({ v }: { v: ViewState }) =>
          useOutputTranslation({
            view: v,
            language: 'fr',
            signature: 'test-sig',
            engine,
            gate,
            corpusOverride: corpus,
            watchdogMs: 30,
          }),
        { initialProps: { v: view([]) } },
      )
      rerender({ v: view([line('output', 'An unknown line.')]) })
      // the watchdog fires (transient retry warning), then the orphan rejects
      // with the genuine fault — surfaced as a distinct console.error
      await waitFor(() =>
        expect(
          errorSpy.mock.calls.filter(c =>
            String(c[0]).includes('engine fault'),
          ),
        ).not.toEqual([]),
      )
      expect(result.current.lines[0].text).toBe('An unknown line.') // English
      // the watchdog itself is still classified transient (warned, retry queued)
      expect(
        warnSpy.mock.calls.filter(c => String(c[0]).includes('will retry')),
      ).not.toEqual([])
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('does not release the gate until an aborted generation has settled', async () => {
    const engine = new OverlapEngine()
    const gate = new EngineGate()
    // Both generations time out on the watchdog → each surfaces a retry warning
    // (review S1); absorb and assert them so the run stays pristine.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result, rerender } = renderHook(
      ({ v }: { v: ViewState }) =>
        useOutputTranslation({
          view: v,
          language: 'fr',
          signature: 'test-sig',
          engine,
          gate,
          corpusOverride: corpus,
          watchdogMs: 30,
        }),
      { initialProps: { v: view([]) } },
    )
    // Two live misses → two queued output generations on the one shared engine.
    rerender({
      v: view([
        line('output', 'First unknown.'),
        line('output', 'Second unknown.'),
      ]),
    })
    await waitFor(() => {
      expect(result.current.lines[0].pending).toBeUndefined()
      expect(result.current.lines[1].pending).toBeUndefined()
    })
    expect(engine.maxInFlight).toBe(1)
    expect(
      warnSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')).length,
    ).toBeGreaterThan(0)
    warnSpy.mockRestore()
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

describe('unmount teardown (review I3)', () => {
  it('a queued generation is abandoned on unmount — never runs, no post-unmount update', async () => {
    const engine = new FakeLlmEngine({ default: 'jamais rendu' })
    await engine.load(() => {}, new AbortController().signal)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { result, rerender, unmount, gate } = setup({
        engine,
        initial: view([]),
      })
      // Hold the gate so the live miss's generation QUEUES behind it.
      let release!: () => void
      const held = gate.run(
        'output',
        () => new Promise<void>(r => (release = r)),
      )
      rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
      // Let the resolve() chain reach the gate queue (cacheGet miss → gate.run)
      // so the gate body actually runs when the gate frees below.
      await waitFor(() => expect(result.current.lines[0].pending).toBe(true))
      await act(async () => {})
      unmount() // epoch bumps; the queued task must bail when the gate frees
      await act(async () => {
        release()
        await held
        // Flush the handoff hops so the queued task's gate body runs (and bails)
        // before we assert — otherwise generateCalls reads 0 by timing, not by
        // the abandonment we are pinning.
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(engine.generateCalls).toBe(0) // never started on the dead view
      expect(errorSpy).not.toHaveBeenCalled() // no act() warning, no leak
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('an in-flight generation is aborted on unmount — silently, no console output', async () => {
    const engine = new FakeLlmEngine({
      default: 'jamais rendu',
      generateDelayMs: 10_000, // still running when we unmount
    })
    await engine.load(() => {}, new AbortController().signal)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { rerender, unmount } = setup({ engine, initial: view([]) })
      rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
      // Wait until the generation is genuinely in flight (past the cacheGet
      // miss, inside the gate body) — not merely shimmering.
      await waitFor(() => expect(engine.generateCalls).toBe(1))
      await act(async () => {
        unmount() // aborts the controller; the AbortError must not surface
      })
      // the abort-driven rejection is expected control flow, not an engine fault
      expect(
        errorSpy.mock.calls.filter(c => String(c[0]).includes('[xlate]')),
      ).toEqual([])
    } finally {
      errorSpy.mockRestore()
    }
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

// The Loud Room echoes the last word of the line it READ ("look look ..."); the
// VM gets the English canonical, so the word is English even in a target-lang
// game. It's dynamic (no corpus pin) — the hook re-voices it by mapping the
// canonical word the VM echoes back to the player's own word for the clause that
// produced it (echoMap), and treats the line as DETERMINISTICALLY handled (no
// miss logged, no LLM). GATED on the Loud Room location (review I3) and FROZEN
// per line at emit time (review I2). UAT F6.
const LOUD = { location: 'Loud Room', right: 'Score: 0   Moves: 1' }
describe('Loud Room input echo (UAT F6)', () => {
  it('re-voices the echo via the map, logs no miss, runs no generation', async () => {
    const engine = new FakeLlmEngine({ default: 'fallback-fr' })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({
      engine,
      initial: view([]),
      echoMap: new Map([['look', 'regarde']]), // canonical "look" ← player "regarde"
    })
    const l = line('output', 'look look ...')
    rerender({ v: view([l], LOUD), lang: 'fr' })
    // Synchronous, deterministic substitution — not the LLM fallback.
    expect(result.current.lines[0].text).toBe('regarde regarde ...')
    // The echo is NOT a corpus gap and is never sent to the engine.
    expect(readMisses().some(m => m.en === 'look look ...')).toBe(false)
    expect(engine.generateCalls).toBe(0)
  })

  it('re-voices EACH clause of a compound by its own word (I1)', () => {
    // The compound is sent as two canonical clauses; each echo line maps to its
    // own player word — "take bar"→"barra barra ...", "look"→"mira mira ...".
    const { result, rerender } = setup({
      initial: view([]),
      echoMap: new Map([
        ['bar', 'barra'],
        ['look', 'mira'],
      ]),
    })
    rerender({
      v: view(
        [line('output', 'bar bar ...'), line('output', 'look look ...')],
        LOUD,
      ),
      lang: 'fr',
    })
    expect(result.current.lines[0].text).toBe('barra barra ...')
    expect(result.current.lines[1].text).toBe('mira mira ...')
  })

  it('only rewrites the echo shape — ordinary output is untouched', () => {
    const { result, rerender } = setup({
      initial: view([]),
      echoMap: new Map([['look', 'regarde']]),
    })
    rerender({ v: view([line('output', 'Taken.')], LOUD), lang: 'fr' })
    expect(result.current.lines[0].text).toBe('Pris.')
  })

  it('leaves the English echo when the word is not in the map', () => {
    // The player escaped to English (or no command produced this word): nothing
    // to re-voice, but it's still an in-room echo — not a corpus gap.
    const { result, rerender } = setup({
      initial: view([]),
      echoMap: new Map([['look', 'regarde']]),
    })
    rerender({ v: view([line('output', 'echo echo ...')], LOUD), lang: 'fr' })
    expect(result.current.lines[0].text).toBe('echo echo ...')
  })

  it('does NOT re-voice a doubled-word line outside the Loud Room (I3)', async () => {
    // A coincidental doubled-word line elsewhere must NOT be hijacked by the echo
    // regex: it falls through to the normal translation path (here, the fallback).
    const engine = new FakeLlmEngine({ default: 'echo-fr' })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({
      engine,
      initial: view([]),
      echoMap: new Map([['echo', 'eco']]),
    })
    // status defaults to West of House, not the Loud Room.
    rerender({ v: view([line('output', 'echo echo ...')]), lang: 'fr' })
    expect(result.current.lines[0].text).not.toBe('eco eco ...')
    // It's real output, so it IS routed to the engine (not suppressed as an echo).
    await waitFor(() => expect(engine.generateCalls).toBe(1))
  })

  it('freezes the echo word per line — later commands do not restamp it (I2)', () => {
    const l = line('output', 'look look ...')
    const { result, rerender } = setup({
      initial: view([]),
      echoMap: new Map([['look', 'regarde']]),
    })
    rerender({
      v: view([l], LOUD),
      lang: 'fr',
      em: new Map([['look', 'regarde']]),
    })
    expect(result.current.lines[0].text).toBe('regarde regarde ...')
    // A later turn remaps "look" to a different word; the historical echo line
    // keeps its own frozen word instead of restamping.
    rerender({
      v: view([l], LOUD),
      lang: 'fr',
      em: new Map([['look', 'prends']]),
    })
    expect(result.current.lines[0].text).toBe('regarde regarde ...')
  })
})

// Georgian (ka) is corpus-only (spec §3): a corpus miss degrades to English and
// is logged, but the WebLLM fallback is NEVER engaged — the small models cannot
// produce correct Georgian, so a fallback would emit garbage. This is gated to
// 'ka'; fr/de/es fallback behavior must stay byte-for-byte unchanged.
describe('corpus-only languages (Georgian, spec §3)', () => {
  it('ka: an uncovered line stays English and logs a miss, never the LLM', async () => {
    const engine = new FakeLlmEngine({ default: 'should-not-appear' })
    await engine.load(() => {}, new AbortController().signal)
    const gen = vi.spyOn(engine, 'generate')
    // Activation with an empty transcript so the line below is a LIVE miss, not
    // backlog (backlog never generates regardless — this proves the live path).
    const { result, rerender } = setup({
      engine,
      language: 'ka',
      initial: view([]),
    })
    rerender({ v: view([line('output', 'Snarf.')]), lang: 'ka' })
    // settle any (wrongly-) started async work before asserting.
    await act(async () => {})
    expect(result.current.lines.at(-1)!.text).toBe('Snarf.') // stays English
    expect(result.current.lines.at(-1)!.pending).toBeFalsy() // never goes pending
    expect(gen).not.toHaveBeenCalled() // LLM never engaged
    expect(
      readMisses().some(m => m.language === 'ka' && m.en === 'Snarf.'),
    ).toBe(true)
  })

  it('fr: an uncovered line still attempts the LLM fallback (regression guard)', async () => {
    const engine = new FakeLlmEngine({ default: 'Repli.' })
    await engine.load(() => {}, new AbortController().signal)
    const gen = vi.spyOn(engine, 'generate').mockResolvedValue('…')
    const { result, rerender } = setup({
      engine,
      language: 'fr',
      initial: view([]),
    })
    rerender({ v: view([line('output', 'Snarf.')]), lang: 'fr' })
    expect(result.current.lines.at(-1)!.pending).toBe(true) // shimmer / fallback runs
    await waitFor(() => expect(gen).toHaveBeenCalled())
  })

  it('ka is corpus-only; fr/de/es are not', () => {
    expect(CORPUS_ONLY_LANGS.has('ka')).toBe(true)
    expect(
      ['fr', 'de', 'es'].some(l => CORPUS_ONLY_LANGS.has(l as never)),
    ).toBe(false)
  })
})

describe('LLM feature off ⇒ corpus-only (t1)', () => {
  it('a live miss stays English with no shimmer when llmEnabled is false', async () => {
    const engine = new FakeLlmEngine({ cached: true, default: 'fallback-fr' })
    await engine.load(() => {}, new AbortController().signal) // engine.isLoaded() === true
    // Activate with empty transcript so the appended line is a LIVE miss
    // (not backlog), then rerender with the uncovered line.
    const { result, rerender } = setup({
      language: 'fr',
      engine,
      initial: view([]),
      llmEnabled: false,
    })
    rerender({
      v: view([line('output', 'A brand new uncovered sentence.')]),
      lang: 'fr',
    })
    // Allow any async work to settle
    await act(async () => {})
    expect(result.current.lines.some(l => l.pending)).toBe(false)
    expect(result.current.lines[0].text).toBe('A brand new uncovered sentence.')
    expect(engine.generateCalls).toBe(0) // LLM never engaged
  })
})
