import { describe, it, expect, vi } from 'vitest'
import { FakeLlmEngine } from './engine.fake'

describe('FakeLlmEngine', () => {
  it('reports progress then becomes loaded', async () => {
    const eng = new FakeLlmEngine({
      progress: [
        { loaded: 0, total: 2, text: 'start' },
        { loaded: 2, total: 2, text: 'done' },
      ],
    })
    const onProgress = vi.fn()
    expect(eng.isLoaded()).toBe(false)
    await eng.load(onProgress, new AbortController().signal)
    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(eng.isLoaded()).toBe(true)
  })

  it('rejects when failLoad is set', async () => {
    const eng = new FakeLlmEngine({ failLoad: true })
    await expect(
      eng.load(vi.fn(), new AbortController().signal),
    ).rejects.toThrow()
    expect(eng.isLoaded()).toBe(false)
  })

  it('returns the canned completion for the last user message', async () => {
    const eng = new FakeLlmEngine({
      completions: { 'grab the lantern': 'take lantern' },
      default: '__UNKNOWN__',
    })
    await eng.load(vi.fn(), new AbortController().signal)
    const out = await eng.generate(
      [{ role: 'user', content: 'grab the lantern' }],
      'GRAMMAR',
    )
    expect(out).toBe('take lantern')
    const miss = await eng.generate([{ role: 'user', content: 'xyz' }], 'G')
    expect(miss).toBe('__UNKNOWN__')
  })

  it('mirrors WebLlmEngine on an empty result: "" for the grammar-free path, ABSTAIN otherwise (review I2)', async () => {
    // No scripted completion and no default: the real WebLlmEngine returns ''
    // when grammar === null (output-translation fallback) and the ABSTAIN
    // sentinel when a grammar is set (constrained input decoding). The fake
    // must match, or output tests get a non-empty '__UNKNOWN__' where
    // useOutputTranslation expects '' to mean "empty translation → English".
    const eng = new FakeLlmEngine({})
    await eng.load(vi.fn(), new AbortController().signal)
    const msg = [{ role: 'user' as const, content: 'an unknown line' }]
    expect(await eng.generate(msg, null)).toBe('')
    expect(await eng.generate(msg, 'GRAMMAR')).toBe('__UNKNOWN__')
  })

  it('generate rejects when its abort signal fires (orphan cancellation)', async () => {
    vi.useFakeTimers()
    const eng = new FakeLlmEngine({ generateDelayMs: 10000, default: 'north' })
    await eng.load(vi.fn(), new AbortController().signal)
    const ac = new AbortController()
    const p = eng.generate([{ role: 'user', content: 'go' }], 'G', ac.signal)
    const assertion = expect(p).rejects.toThrow(/abort/i)
    ac.abort()
    await assertion
    vi.useRealTimers()
  })

  it('isCached reflects the cached option (independent of isLoaded)', async () => {
    const eng = new FakeLlmEngine({ cached: true })
    expect(eng.isLoaded()).toBe(false)
    expect(await eng.isCached()).toBe(true)
  })
})
