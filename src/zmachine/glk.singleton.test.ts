import { describe, it, expect, vi } from 'vitest'

// Last-resort branch of getGlk(): the constructor isn't exported but the
// pre-built `Glk` singleton is. (Separate file so this mock shape is isolated
// from glk.test.ts, which mocks both exports as undefined.)
vi.mock('../../vendor/glkote/glkapi.js', () => ({
  Glk: { iAmSingleton: true },
  GlkClass: undefined,
}))

import { getGlk } from './glk'

describe('getGlk singleton fallback', () => {
  it('returns the pre-constructed Glk singleton when no constructor is exposed', () => {
    expect(getGlk()).toEqual({ iAmSingleton: true })
  })
})
