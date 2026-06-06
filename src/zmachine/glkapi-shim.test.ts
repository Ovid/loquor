import { describe, it, expect, vi } from 'vitest'

describe('glkapi-shim', () => {
  it('defines a global window when one is absent (Node/SSR safety)', async () => {
    const orig = globalThis.window
    // Force the SSR/Node branch: glkapi.js touches `window` at load time, so the
    // shim backfills it from globalThis when running outside a browser/jsdom.
    delete (globalThis as { window?: unknown }).window
    vi.resetModules()
    await import('./glkapi-shim')
    expect(globalThis.window).toBeDefined()
    globalThis.window = orig
  })
})
