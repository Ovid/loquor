import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IdbDialog } from './dialog'

describe('IdbDialog autosave', () => {
  it('round-trips a snapshot by signature and clears on null', async () => {
    const d = new IdbDialog()
    const snap = { ram: [1, 2, 3], xorshift_seed: 42 }
    await d.autosave_write_async('SIG1', snap)
    expect(await d.autosave_read_async('SIG1')).toEqual(snap)

    await d.autosave_write_async('SIG1', null)
    expect(await d.autosave_read_async('SIG1')).toBeNull()
  })

  it('keeps signatures independent', async () => {
    const d = new IdbDialog()
    await d.autosave_write_async('A', { v: 1 })
    await d.autosave_write_async('B', { v: 2 })
    expect(await d.autosave_read_async('A')).toEqual({ v: 1 })
  })

  it('serves the sync autosave_read from the preloaded cache', async () => {
    const d = new IdbDialog()
    await d.autosave_write_async('SIG2', { v: 7 })
    // A fresh Dialog must preload before the sync read ifvms performs at start().
    const fresh = new IdbDialog()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(fresh.autosave_read('SIG2')).toBeNull() // not preloaded yet
    } finally {
      warn.mockRestore()
    }
    await fresh.preload('SIG2')
    expect(fresh.autosave_read('SIG2')).toEqual({ v: 7 })
  })

  it('warns loudly when autosave_read runs before preload (F-5/F-11 ordering guard)', () => {
    // A never-preloaded signature has no cache entry — distinct from a preloaded
    // empty slot (cache.has === true, value null). Without the guard this looks
    // identical to "no save → fresh start" and the boot-ordering bug is silent.
    const fresh = new IdbDialog()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(fresh.autosave_read('NEVER')).toBeNull()
      expect(warn).toHaveBeenCalledOnce()
      expect(warn.mock.calls[0].join(' ')).toMatch(/before preload/)
    } finally {
      warn.mockRestore()
    }
  })

  it('does NOT warn for a preloaded-but-empty signature (genuine fresh start)', async () => {
    const fresh = new IdbDialog()
    await fresh.preload('EMPTY') // no save exists → cache.set('EMPTY', null)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(fresh.autosave_read('EMPTY')).toBeNull()
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('hasSave reflects presence', async () => {
    const d = new IdbDialog()
    expect(await d.hasSave('SIG3')).toBe(false)
    await d.autosave_write_async('SIG3', { v: 1 })
    expect(await d.hasSave('SIG3')).toBe(true)
  })

  it('dispose() stops further autosave writes (StrictMode throwaway engine)', async () => {
    const d = new IdbDialog()
    d.dispose()
    d.autosave_write('GONE', { v: 1 })
    await d.flushWrites()
    expect(await d.autosave_read_async('GONE')).toBeNull()
  })

  it('surfaces a persist failure and names the non-cloneable field', async () => {
    // A function can't be structured-cloned, so the IndexedDB put rejects with
    // DataCloneError. autosave_write used to swallow that silently (looked like
    // "starts over on return"); it must now log the failure and point at the
    // offending field (via uncloneablePath).
    const d = new IdbDialog()
    const errors: string[] = []
    const spy = vi
      .spyOn(console, 'error')
      .mockImplementation((...a: unknown[]) => {
        errors.push(a.map(String).join(' '))
      })

    d.autosave_write('BAD', { ram: [1, 2, 3], onTick: () => {} })
    await d.flushWrites()
    await new Promise(r => setTimeout(r)) // let the op.catch microtask run

    spy.mockRestore()
    expect(errors.some(e => e.includes('PERSIST FAILED'))).toBe(true)
    expect(errors.some(e => e.includes('onTick'))).toBe(true)
  })

  it('serializes rapid fire-and-forget writes so the last turn wins', async () => {
    // Each idb write opens its own connection; without a serial chain two
    // same-key writes from consecutive turns have no ordering guarantee and a
    // stale snapshot can overtake a newer one ("resume a turn behind").
    const d = new IdbDialog()
    for (let i = 1; i <= 25; i++) d.autosave_write('RACE', { turn: i })
    await d.flushWrites()
    expect(await d.autosave_read_async('RACE')).toEqual({ turn: 25 })
  })
})
