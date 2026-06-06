import { describe, it, expect } from 'vitest'
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
    expect(fresh.autosave_read('SIG2')).toBeNull() // not preloaded yet
    await fresh.preload('SIG2')
    expect(fresh.autosave_read('SIG2')).toEqual({ v: 7 })
  })

  it('hasSave reflects presence', async () => {
    const d = new IdbDialog()
    expect(await d.hasSave('SIG3')).toBe(false)
    await d.autosave_write_async('SIG3', { v: 1 })
    expect(await d.hasSave('SIG3')).toBe(true)
  })
})
