import { describe, it, expect, vi } from 'vitest'
import { readNlPref, writeNlPref } from './nlpref'

function fakeStore(initial: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(initial))
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: k => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size
    },
  } as Storage
}

describe('nlpref', () => {
  it('defaults to disabled/undeclined when nothing stored', () => {
    expect(readNlPref(fakeStore())).toEqual({ enabled: false, declined: false })
  })

  it('round-trips a partial patch, merging with existing', () => {
    const store = fakeStore()
    writeNlPref({ enabled: true }, store)
    writeNlPref({ declined: true }, store)
    expect(readNlPref(store)).toEqual({ enabled: true, declined: true })
  })

  it('ignores malformed / wrong-typed stored values (validates like useTheme)', () => {
    expect(readNlPref(fakeStore({ 'loquor.nl': 'not json' }))).toEqual({
      enabled: false,
      declined: false,
    })
    expect(readNlPref(fakeStore({ 'loquor.nl': '{"enabled":"yes"}' }))).toEqual(
      { enabled: false, declined: false },
    )
  })

  it('warns (does not silently fall back) when stored JSON is unreadable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    readNlPref(fakeStore({ 'loquor.nl': 'not json' }))
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
