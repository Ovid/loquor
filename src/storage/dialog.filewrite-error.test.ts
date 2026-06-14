import { describe, it, expect, vi } from 'vitest'

// F-9: the explicit SAVE/RESTORE file path used bare `void this.enqueue(...)`,
// so a failed IndexedDB put/delete was swallowed silently — asymmetric with the
// hardened autosave_write. Mock the idb layer to reject so we can assert the
// failure now reaches the console instead of vanishing.
vi.mock('./idb', () => ({
  idbGet: vi.fn(async () => null),
  idbSet: vi.fn(async () => {
    throw new Error('quota exceeded')
  }),
  idbDel: vi.fn(async () => {
    throw new Error('delete failed')
  }),
}))

import { IdbDialog } from './dialog'

const captureErrors = () => {
  const errors: string[] = []
  const spy = vi
    .spyOn(console, 'error')
    .mockImplementation((...a: unknown[]) => {
      errors.push(a.map(String).join(' '))
    })
  return { errors, spy }
}

describe('IdbDialog explicit file persistence surfaces failures (F-9)', () => {
  it('logs when file_write fails to reach IndexedDB', async () => {
    const d = new IdbDialog()
    const { errors, spy } = captureErrors()

    const ref = d.file_construct_ref('slot1', 'save', 'GID')
    d.file_write(ref, [1, 2, 3])
    await d.flushWrites()
    await new Promise(r => setTimeout(r)) // let the .catch microtask run

    spy.mockRestore()
    // The sync fileCache still has it (play never breaks), but the failure to
    // persist must be visible rather than swallowed.
    expect(d.file_read(ref)).toEqual([1, 2, 3])
    expect(errors.some(e => /WRITE FAILED/.test(e))).toBe(true)
    expect(errors.some(e => /quota exceeded/.test(e))).toBe(true)
  })

  it('logs when file_remove_ref fails to reach IndexedDB', async () => {
    const d = new IdbDialog()
    const { errors, spy } = captureErrors()

    const ref = d.file_construct_ref('slot1', 'save', 'GID')
    d.file_remove_ref(ref)
    await d.flushWrites()
    await new Promise(r => setTimeout(r))

    spy.mockRestore()
    expect(errors.some(e => /REMOVE FAILED/.test(e))).toBe(true)
    expect(errors.some(e => /delete failed/.test(e))).toBe(true)
  })
})
