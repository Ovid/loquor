import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { cacheGet, cacheSet } from './fallbackCache'
import * as idb from '../storage/idb'

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

  it('a transient READ failure resolves to undefined, never rejects (review S6)', async () => {
    // The read contract is "value or undefined, never throws" so no caller can
    // let an IDB rejection reach a pristine-output guard or skip the fallback.
    const spy = vi
      .spyOn(idb, 'idbGet')
      .mockRejectedValueOnce(new Error('quota / private mode / tx abort'))
    try {
      await expect(
        cacheGet('sig1', 'fr', 'A line.'),
      ).resolves.toBeUndefined()
    } finally {
      spy.mockRestore()
    }
  })
})
