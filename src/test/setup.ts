import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi, type MockInstance } from 'vitest'

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
