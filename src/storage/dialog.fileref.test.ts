import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { IdbDialog } from './dialog'

/**
 * Minimal explicit SAVE/RESTORE round-trip. glkapi (streaming=false) drives the
 * whole-buffer file API: file_construct_ref → file_ref_exists → file_read/
 * file_write → file_remove_ref. Save buffers are plain Array<number> (bytes).
 * See tests/fixtures/PROTOCOL-NOTES.md "Dialog fileref contract".
 */
describe('IdbDialog fileref (explicit SAVE/RESTORE)', () => {
  it('round-trips a save buffer through file_read/file_write under file: keys', () => {
    const d = new IdbDialog()
    const ref = d.file_construct_ref('slot1', 'save', 'GAMEID')

    // Before any write: glkapi opens Read mode → must report "missing".
    expect(d.file_ref_exists(ref)).toBe(false)
    expect(d.file_read(ref)).toBeNull()

    // glk_stream_close writes str.buf, a plain array of byte values.
    const bytes = [0, 1, 2, 254, 255, 128]
    d.file_write(ref, bytes)

    expect(d.file_ref_exists(ref)).toBe(true)
    const back = d.file_read(ref)
    expect(Array.isArray(back)).toBe(true)
    expect(back).toEqual(bytes)
    // A second ref with the same coordinates sees the same data.
    const ref2 = d.file_construct_ref('slot1', 'save', 'GAMEID')
    expect(d.file_read(ref2)).toEqual(bytes)

    // RESTORE then SAVE again (truncate-on-open uses israw with '').
    d.file_write(ref, '', true)
    expect(d.file_read(ref)).toEqual([])

    d.file_remove_ref(ref)
    expect(d.file_ref_exists(ref)).toBe(false)
    expect(d.file_read(ref)).toBeNull()
  })

  it('keeps slots independent by filename and gameid', () => {
    const d = new IdbDialog()
    const a = d.file_construct_ref('alpha', 'save', 'G1')
    const b = d.file_construct_ref('beta', 'save', 'G1')
    const c = d.file_construct_ref('alpha', 'save', 'G2')
    d.file_write(a, [1])
    d.file_write(b, [2])
    d.file_write(c, [3])
    expect(d.file_read(a)).toEqual([1])
    expect(d.file_read(b)).toEqual([2])
    expect(d.file_read(c)).toEqual([3])
  })

  it('constructs a temp ref and a cleaned fixed name without throwing', () => {
    const d = new IdbDialog()
    const t = d.file_construct_temp_ref('save')
    expect(d.file_ref_exists(t)).toBe(false)
    d.file_write(t, [9])
    expect(d.file_read(t)).toEqual([9])

    expect(typeof d.file_clean_fixed_name('My Save!.sav', 1)).toBe('string')
  })

  it('mirrors writes to IndexedDB (survives a fresh Dialog after preload)', async () => {
    const d = new IdbDialog()
    const ref = d.file_construct_ref('persisted', 'save', 'GID')
    d.file_write(ref, [4, 5, 6])
    await d.flushWrites() // writes are serialized + async; wait for the put

    const fresh = new IdbDialog()
    const sameRef = fresh.file_construct_ref('persisted', 'save', 'GID')
    // Not in the fresh sync cache until preloaded.
    expect(fresh.file_ref_exists(sameRef)).toBe(false)
    await fresh.preloadFile(sameRef)
    expect(fresh.file_ref_exists(sameRef)).toBe(true)
    expect(fresh.file_read(sameRef)).toEqual([4, 5, 6])
  })
})
