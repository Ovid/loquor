import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { cacheGet, cacheSet } from './fallbackCache'

describe('fallback cache (spec §6: each miss costs once per device, ever)', () => {
  it('round-trips a translation keyed by (game, language, en)', async () => {
    await cacheSet('sig1', 'fr', 'A weird line.', 'Une ligne bizarre.')
    expect(await cacheGet('sig1', 'fr', 'A weird line.')).toBe(
      'Une ligne bizarre.',
    )
  })
  it('misses across game / language / text boundaries', async () => {
    await cacheSet('sig1', 'fr', 'Hello.', 'Bonjour.')
    expect(await cacheGet('sig2', 'fr', 'Hello.')).toBeUndefined()
    expect(await cacheGet('sig1', 'de', 'Hello.')).toBeUndefined()
    expect(await cacheGet('sig1', 'fr', 'Hello!')).toBeUndefined()
  })
})
