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

describe('NlPref v2 (language picker)', () => {
  it('defaults to off/not-declined', () => {
    expect(readNlPref(fakeStore())).toEqual({
      language: 'off',
      declined: false,
    })
  })

  it('round-trips a language', () => {
    const s = fakeStore()
    writeNlPref({ language: 'fr' }, s)
    expect(readNlPref(s).language).toBe('fr')
  })

  it('round-trips a partial patch, merging with existing', () => {
    const s = fakeStore()
    writeNlPref({ language: 'de' }, s)
    writeNlPref({ declined: true }, s)
    expect(readNlPref(s)).toEqual({ language: 'de', declined: true })
  })

  it('migrates legacy enabled:true → en, preserving declined', () => {
    const s = fakeStore({
      'loquor.nl': JSON.stringify({ enabled: true, declined: false }),
    })
    expect(readNlPref(s)).toEqual({ language: 'en', declined: false })
  })

  it('migrates legacy enabled:false → off, preserving declined:true', () => {
    const s = fakeStore({
      'loquor.nl': JSON.stringify({ enabled: false, declined: true }),
    })
    expect(readNlPref(s)).toEqual({ language: 'off', declined: true })
  })

  it('unknown language value falls back to off', () => {
    const s = fakeStore({
      'loquor.nl': JSON.stringify({ language: 'tlh', declined: false }),
    })
    expect(readNlPref(s).language).toBe('off')
  })

  it('ignores malformed / wrong-typed stored values (validates like useTheme)', () => {
    // The unreadable-JSON warn is the NEXT test's contract; silence it here so
    // expected warns don't pollute test output.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(readNlPref(fakeStore({ 'loquor.nl': 'not json' }))).toEqual({
      language: 'off',
      declined: false,
    })
    expect(readNlPref(fakeStore({ 'loquor.nl': '{"enabled":"yes"}' }))).toEqual(
      { language: 'off', declined: false },
    )
    warn.mockRestore()
  })

  it('warns (does not silently fall back) when stored JSON is unreadable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    readNlPref(fakeStore({ 'loquor.nl': 'not json' }))
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
