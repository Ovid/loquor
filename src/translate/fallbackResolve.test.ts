import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import type { MutableRefObject, SetStateAction } from 'react'
import {
  createFallbackResolver,
  type OverlayState,
  type FallbackResolverDeps,
} from './fallbackResolve'
import { compileCorpus } from './match'
import { EngineGate } from '../llm/engineGate'
import { FakeLlmEngine } from '../llm/engine.fake'
import { cacheGet, cacheSet } from './fallbackCache'
import { readMisses } from './missLog'
import type { LlmEngine } from '../llm/types'

// These tests exercise createFallbackResolver in ISOLATION — the module's own
// header advertises "pure logic — no hooks — so it is unit-testable in
// isolation". The hook-level integration (the miss scan, the effect-order
// invariant, render) is covered by useOutputTranslation.test.tsx; here we drive
// resolve/settle/markPending directly against plain refs and a stub setOverlay,
// so the epoch/basis guards and the failure-budget transitions are pinned at
// the unit boundary the hook depends on.

const SIG = 'test-sig'
const LANG = 'fr' as const

// fake-indexeddb is one shared DB across the file; wipe between tests so a
// cache entry from one case can't leak into another's miss/generate path.
const resetDb = () =>
  new Promise<void>(r => {
    const req = indexedDB.deleteDatabase('loquor')
    req.onsuccess = req.onerror = () => r()
  })

beforeEach(async () => {
  localStorage.clear()
  await resetDb()
})

function ref<T>(value: T): MutableRefObject<T> {
  return { current: value }
}

const loaded = (e: LlmEngine) => e.load(() => {}, new AbortController().signal)

/** Build a resolver over plain refs + a stub setOverlay, capturing the live
 * overlay so tests can read what settle/put wrote. epoch defaults to 1 and
 * epochRef.current to 1 (guards pass); a test bumps epochRef.current to
 * simulate a language/story switch mid-flight. */
function harness(opts: { engine?: LlmEngine; ctx?: string } = {}) {
  let overlay: OverlayState = { for: null, map: new Map() }
  const setOverlay = (u: SetStateAction<OverlayState>) => {
    overlay = typeof u === 'function' ? u(overlay) : u
  }
  const corpus = compileCorpus({ strings: {}, objects: {}, templates: [] })
  const engine = opts.engine ?? new FakeLlmEngine({ default: 'Bonjour' })
  const epochRef = ref(1)
  const basisRef = ref(new Map<number, string>())
  const retryRef = ref(new Map<number, { en: string; tries: number }>())
  const acsRef = ref(new Set<AbortController>())
  const deps: FallbackResolverDeps = {
    corpus,
    lang: LANG,
    signature: SIG,
    engine,
    gate: new EngineGate(),
    watchdogMs: 5000,
    ctx: opts.ctx,
    epoch: 1,
    epochRef,
    basisRef,
    retryRef,
    acsRef,
    setOverlay,
  }
  const resolver = createFallbackResolver(deps)
  return {
    resolver,
    corpus,
    engine,
    epochRef,
    basisRef,
    retryRef,
    get overlay() {
      return overlay
    },
  }
}

describe('markPending', () => {
  it('writes a pending entry tagged with the current corpus, unconditionally', () => {
    const h = harness()
    h.resolver.markPending(1, 'Hello')
    expect(h.overlay.for).toBe(h.corpus)
    expect(h.overlay.map.get(1)).toEqual({ en: 'Hello', res: 'pending' })
  })

  it('is unconditional — it ignores the epoch/basis guards settle honors', () => {
    const h = harness()
    h.epochRef.current = 99 // a switch would make settle bail…
    h.resolver.markPending(2, 'Anything')
    expect(h.overlay.map.get(2)).toEqual({ en: 'Anything', res: 'pending' }) // …markPending still writes
  })
})

describe('settle (epoch + basis guards)', () => {
  it('writes the resolution when epoch matches and the basis is current', () => {
    const h = harness()
    h.basisRef.current.set(1, 'Hello')
    h.resolver.settle(1, 'Hello', 'Bonjour')
    expect(h.overlay.map.get(1)).toEqual({ en: 'Hello', res: 'Bonjour' })
  })

  it('is a no-op when the epoch moved on (language/story switched mid-flight)', () => {
    const h = harness()
    h.basisRef.current.set(1, 'Hello')
    h.epochRef.current = 2
    h.resolver.settle(1, 'Hello', 'Bonjour')
    expect(h.overlay.map.get(1)).toBeUndefined()
  })

  it('is a no-op when an append merge changed the basis text under the id', () => {
    const h = harness()
    h.basisRef.current.set(1, 'Hello, now longer.') // the live text moved on
    h.resolver.settle(1, 'Hello', 'Bonjour') // resolving the stale text
    expect(h.overlay.map.get(1)).toBeUndefined()
  })
})

describe('resolve — cache consult', () => {
  it('a cache hit settles the cached value and never generates or logs a miss', async () => {
    const h = harness()
    await loaded(h.engine)
    await cacheSet(SIG, LANG, 'Hello', 'Depuis le cache.')
    h.basisRef.current.set(1, 'Hello')
    await h.resolver.resolve(1, 'Hello')
    expect(h.overlay.map.get(1)).toEqual({
      en: 'Hello',
      res: 'Depuis le cache.',
    })
    expect((h.engine as FakeLlmEngine).generateCalls).toBe(0)
    expect(readMisses()).toEqual([])
  })

  it('splits a glued " >" residue: caches/translates the CLEAN core, re-appends the suffix', async () => {
    const engine = new FakeLlmEngine({
      completions: { 'Some question?': 'Question inconnue ?' },
    })
    const h = harness({ engine })
    await loaded(engine)
    h.basisRef.current.set(1, 'Some question? >')
    await h.resolver.resolve(1, 'Some question? >')
    // rendered: translation + the re-appended chrome
    expect(h.overlay.map.get(1)).toEqual({
      en: 'Some question? >',
      res: 'Question inconnue ? >',
    })
    // cached under the CLEAN key only
    expect(await cacheGet(SIG, LANG, 'Some question?')).toBe(
      'Question inconnue ?',
    )
    expect(await cacheGet(SIG, LANG, 'Some question? >')).toBeUndefined()
  })
})

describe('resolve — successful generation', () => {
  it('settles the translation, persists it to the cache, and logs the corpus gap once', async () => {
    const h = harness() // default 'Bonjour'
    await loaded(h.engine)
    h.basisRef.current.set(1, 'Hello')
    await h.resolver.resolve(1, 'Hello')
    expect(h.overlay.map.get(1)).toEqual({ en: 'Hello', res: 'Bonjour' })
    expect((h.engine as FakeLlmEngine).generateCalls).toBe(1)
    expect(await cacheGet(SIG, LANG, 'Hello')).toBe('Bonjour')
    const misses = readMisses().filter(m => m.en === 'Hello')
    expect(misses.map(m => m.kind)).toEqual(['line'])
  })

  it('carries the turn ctx into the logged miss (spec §6)', async () => {
    const h = harness({ ctx: 'West of House — Score: 0' })
    await loaded(h.engine)
    h.basisRef.current.set(1, 'Hello')
    await h.resolver.resolve(1, 'Hello')
    expect(readMisses().find(m => m.en === 'Hello')?.ctx).toBe(
      'West of House — Score: 0',
    )
  })
})

describe('resolve — transient failures (review S1)', () => {
  it('engine not loaded → English now, miss logged, basis freed + retry queued, warned not errored', async () => {
    const engine = new FakeLlmEngine({ default: 'jamais rendu' }) // never loaded
    const h = harness({ engine })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      h.basisRef.current.set(1, 'Hello')
      await h.resolver.resolve(1, 'Hello')
      expect(h.overlay.map.get(1)).toEqual({ en: 'Hello', res: 'english' })
      expect(engine.generateCalls).toBe(0)
      expect(readMisses().some(m => m.en === 'Hello')).toBe(true)
      // first failure frees the basis so the scan can re-attempt once loaded…
      expect(h.basisRef.current.get(1)).toBeUndefined()
      // …and records the one-shot retry budget against this text
      expect(h.retryRef.current.get(1)).toEqual({ en: 'Hello', tries: 1 })
      expect(
        warnSpy.mock.calls.filter(c =>
          String(c[0]).includes('engine not loaded'),
        ),
      ).not.toEqual([])
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('rejects a hallucinated bare ">" completion — no settle, no cache poison', async () => {
    const engine = new FakeLlmEngine({ default: '>' })
    const h = harness({ engine })
    await loaded(engine)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      h.basisRef.current.set(1, 'Hello')
      await h.resolver.resolve(1, 'Hello')
      expect(h.overlay.map.get(1)).toEqual({ en: 'Hello', res: 'english' })
      expect(await cacheGet(SIG, LANG, 'Hello')).toBeUndefined()
      expect(
        warnSpy.mock.calls.filter(c =>
          String(c[0]).includes('empty or chrome'),
        ),
      ).not.toEqual([])
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('rejects an English-unchanged "refusal" completion — never settled, never cached', async () => {
    const engine = new FakeLlmEngine({ default: 'Hello' })
    const h = harness({ engine })
    await loaded(engine)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      h.basisRef.current.set(1, 'Hello')
      await h.resolver.resolve(1, 'Hello')
      expect(h.overlay.map.get(1)).toEqual({ en: 'Hello', res: 'english' })
      expect(await cacheGet(SIG, LANG, 'Hello')).toBeUndefined()
      expect(
        warnSpy.mock.calls.filter(c =>
          String(c[0]).includes('English unchanged'),
        ),
      ).not.toEqual([])
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('surfaces a genuine engine error message in the retry warning (String(err))', async () => {
    const engine = new FakeLlmEngine({ failGenerate: true })
    const h = harness({ engine })
    await loaded(engine)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      h.basisRef.current.set(1, 'Hello')
      await h.resolver.resolve(1, 'Hello')
      expect(
        warnSpy.mock.calls.filter(c =>
          String(c[0]).includes('fake generate failure'),
        ),
      ).not.toEqual([])
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe('resolve — retry budget exhaustion (review S1)', () => {
  it('a second failure on the same text is terminal: errored, basis kept, miss not re-logged', async () => {
    const engine = new FakeLlmEngine({ failGenerate: true })
    const h = harness({ engine })
    await loaded(engine)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // First attempt: warned, basis freed, retry tries=1.
      h.basisRef.current.set(1, 'Hello')
      await h.resolver.resolve(1, 'Hello')
      expect(h.retryRef.current.get(1)).toEqual({ en: 'Hello', tries: 1 })
      expect(errorSpy).not.toHaveBeenCalled()

      // The hook's scan re-sets the basis before granting the one retry.
      h.basisRef.current.set(1, 'Hello')
      await h.resolver.resolve(1, 'Hello')
      expect(h.retryRef.current.get(1)).toEqual({ en: 'Hello', tries: 2 })
      // terminal: errored, and the basis is KEPT so the scan skips it forever
      expect(
        errorSpy.mock.calls.filter(c =>
          String(c[0]).includes('leaving this line in English'),
        ),
      ).not.toEqual([])
      expect(h.basisRef.current.get(1)).toBe('Hello')
      // the corpus gap is logged once across both attempts (isRetry skips it)
      expect(readMisses().filter(m => m.en === 'Hello').length).toBe(1)
      expect(engine.generateCalls).toBe(2)
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('a recovered retry clears the budget and settles the translation', async () => {
    let calls = 0
    const engine: LlmEngine = {
      load: async () => {},
      unload: async () => {},
      isLoaded: () => true,
      isCached: async () => true,
      generate: async () => {
        calls++
        if (calls === 1) throw new Error('transient hiccup')
        return 'Réussi.'
      },
    }
    const h = harness({ engine })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      h.basisRef.current.set(1, 'Hello')
      await h.resolver.resolve(1, 'Hello') // fails → English, retry queued
      expect(h.overlay.map.get(1)).toEqual({ en: 'Hello', res: 'english' })
      expect(h.retryRef.current.get(1)?.tries).toBe(1)

      h.basisRef.current.set(1, 'Hello')
      await h.resolver.resolve(1, 'Hello') // succeeds
      expect(h.overlay.map.get(1)).toEqual({ en: 'Hello', res: 'Réussi.' })
      expect(h.retryRef.current.get(1)).toBeUndefined() // budget reset
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe('resolve — superseded mid-flight (epoch moved)', () => {
  it('a switch while queued abandons silently: no settle, no warn/error, English kept', async () => {
    const h = harness() // default 'Bonjour', will not be reached
    await loaded(h.engine)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      h.basisRef.current.set(1, 'Hello')
      const p = h.resolver.resolve(1, 'Hello')
      // The effect's epoch moved on (language/story switch) while resolve was
      // awaiting the cache read — the gate body must abandon before generating.
      h.epochRef.current = 2
      await p
      expect(h.overlay.map.get(1)).toBeUndefined() // nothing rendered
      expect((h.engine as FakeLlmEngine).generateCalls).toBe(0) // GPU not burned
      // a superseded stop is not a failure to surface
      expect(warnSpy).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })
})
