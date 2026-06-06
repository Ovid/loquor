import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { ZMachine } from './engine'
import { IdbDialog } from '../storage/dialog'
import { emptyView } from '../glkote-react/types'

const story = () => new Uint8Array(readFileSync('public/games/zork1.z3'))

// fake-indexeddb is one shared DB across the file; wipe between tests so the
// negative control can't see the previous test's autosave.
const resetDb = () =>
  new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase('naitfol')
    req.onsuccess = req.onerror = () => r()
  })
beforeEach(resetDb)

describe('autosave/resume', () => {
  it('resumes to the exact saved room on a fresh engine', async () => {
    const dialog = new IdbDialog()
    let view = emptyView
    const e1 = new ZMachine({ dialog: dialog as any, onState: (v) => (view = v) })
    await e1.boot(story())
    e1.sendLine('north') // move to a DISTINCT room
    await e1.flushAutosave() // ensure the IDB write settled
    const saved = view.status?.location
    expect(saved).toMatch(/North of House/i)
    expect(saved).not.toMatch(/West of House/i)

    const dialog2 = new IdbDialog()
    let view2 = emptyView
    const e2 = new ZMachine({ dialog: dialog2 as any, onState: (v) => (view2 = v) })
    await e2.boot(story())
    expect(view2.status?.location).toBe(saved) // fresh boot would read "West of House"
    expect(view2.inputRequest).toBe('line')
  })

  it('boots fresh (no resume) when the autosave slot is empty', async () => {
    const dialog = new IdbDialog()
    let view = emptyView
    const e = new ZMachine({ dialog: dialog as any, onState: (v) => (view = v) })
    await e.boot(story())
    expect(view.status?.location).toMatch(/West of House/i)
  })
})
