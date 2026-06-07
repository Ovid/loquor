import { describe, it, expect, vi, afterEach } from 'vitest'

// Force the rare bundler case the fallback chain in getGlk() exists for: the
// vendored glkapi.js fails to expose Glk/GlkClass as named imports. With the
// constructor import gone, getGlk() must walk its window fallbacks and finally
// throw — the branches the real-Glk tests (engine/Terminal) never reach.
vi.mock('../../vendor/glkote/glkapi.js', () => ({
  Glk: undefined,
  GlkClass: undefined,
}))

import { getGlk } from './glk'

afterEach(() => {
  delete (window as { GlkClass?: unknown }).GlkClass
  delete (window as { Glk?: unknown }).Glk
})

describe('getGlk fallback chain (constructor import unavailable)', () => {
  it('uses a window-attached GlkClass constructor when the import is missing', () => {
    class FakeGlk {}
    ;(window as { GlkClass?: unknown }).GlkClass = FakeGlk
    expect(getGlk()).toBeInstanceOf(FakeGlk)
  })

  it('falls back to a window-attached Glk singleton', () => {
    const singleton = { iAmGlk: true }
    ;(window as { Glk?: unknown }).Glk = singleton
    expect(getGlk()).toBe(singleton)
  })

  it('throws a helpful error when nothing exposes Glk', () => {
    expect(() => getGlk()).toThrow(/did not expose Glk\/GlkClass/)
  })
})
