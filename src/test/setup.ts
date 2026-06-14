import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi, type MockInstance } from 'vitest'

// --- Minimal CacheStorage stub (jsdom lacks `caches`) ----------------------
// WebLlmEngine.isCached() → web-llm hasModelInCache → tvmjs reads the
// CacheStorage API (`caches.open(scope).keys()`). jsdom has no `caches`, so the
// real probe throws ReferenceError. Before F-19 that was swallowed silently;
// F-19 now (correctly) warns on a probe fault, which the pristine-output guard
// below would flag in every UI test that mounts Terminal with the real engine.
// Provide an EMPTY CacheStorage so the probe resolves to "not cached" (false) —
// faithful to a real browser where the model has not been downloaded, which is
// exactly the state these tests assume. Only defined when genuinely absent.
if (typeof (globalThis as { caches?: unknown }).caches === 'undefined') {
  const emptyCache = {
    keys: async () => [],
    match: async () => undefined,
    add: async () => {},
    addAll: async () => {},
    put: async () => {},
    delete: async () => false,
  }
  ;(globalThis as { caches?: unknown }).caches = {
    open: async () => emptyCache,
    has: async () => false,
    delete: async () => false,
    keys: async () => [],
    match: async () => undefined,
  }
}

// --- Pristine-output guard (CLAUDE.md Conventions) -------------------------
// A passing test must emit no stray console.error / console.warn. This also
// traps React's `act(...)` warnings, which React routes through console.error,
// so un-wrapped state updates fail loudly instead of scrolling past.
//
// Opt-out: a test that deliberately exercises an error/log path spies on the
// console itself (`vi.spyOn(console, 'error').mockImplementation(() => {})`)
// and asserts on it. That spy sits on top of this one and absorbs the calls,
// so the guard records nothing for it — the test OWNS its log.
//
// Why record-and-assert in afterEach (not throw inside console.*): production
// code logs from catch blocks, so throwing from console.error would corrupt the
// control flow under test — and could be swallowed by the very catch we're in.
let errorSpy: MockInstance
let warnSpy: MockInstance

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  const leaked = [
    ...errorSpy.mock.calls.map(
      a => `  console.error: ${a.map(String).join(' ')}`,
    ),
    ...warnSpy.mock.calls.map(
      a => `  console.warn: ${a.map(String).join(' ')}`,
    ),
  ]
  errorSpy.mockRestore()
  warnSpy.mockRestore()
  if (leaked.length > 0) {
    throw new Error(
      'Test leaked console output — spy on and assert it if intended ' +
        `(CLAUDE.md Conventions):\n${leaked.join('\n')}`,
    )
  }
})
