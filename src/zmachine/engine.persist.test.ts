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
  new Promise<void>(r => {
    const req = indexedDB.deleteDatabase('loquor')
    req.onsuccess = req.onerror = () => r()
  })
beforeEach(resetDb)

describe('autosave/resume', () => {
  it('resumes to the exact saved room on a fresh engine', async () => {
    const dialog = new IdbDialog()
    let view = emptyView
    const e1 = new ZMachine({
      dialog: dialog as any,
      onState: v => (view = v),
    })
    await e1.boot(story())
    e1.sendLine('north') // move to a DISTINCT room
    await e1.flushAutosave() // ensure the IDB write settled
    const saved = view.status?.location
    expect(saved).toMatch(/North of House/i)
    expect(saved).not.toMatch(/West of House/i)

    const dialog2 = new IdbDialog()
    let view2 = emptyView
    const e2 = new ZMachine({
      dialog: dialog2 as any,
      onState: v => (view2 = v),
    })
    await e2.boot(story())
    expect(view2.status?.location).toBe(saved) // fresh boot would read "West of House"
    expect(view2.inputRequest).toBe('line')
  })

  it('boots fresh (no resume) when the autosave slot is empty', async () => {
    const dialog = new IdbDialog()
    let view = emptyView
    const e = new ZMachine({
      dialog: dialog as any,
      onState: v => (view = v),
    })
    await e.boot(story())
    expect(view.status?.location).toMatch(/West of House/i)
  })

  it('boot() warms the autosave cache (preload) before ifvms reads it synchronously [F-4 ordering]', async () => {
    // F-4 temporal coupling, made legible: boot() must `await dialog.preload(sig)`
    // BEFORE Glk.init() runs the VM, because ifvms calls autosave_read SYNCHRONOUSLY
    // during start(). A refactor that moved Glk.init ahead of the preload await
    // would otherwise only manifest as the resume test above breaking "for no
    // reason"; this records the call order so a reorder fails pointing AT the
    // ordering invariant, not a downstream symptom.
    const base = new IdbDialog()
    const calls: string[] = []
    const dialog = {
      streaming: base.streaming,
      preload: (sig: string) => {
        calls.push('preload')
        return base.preload(sig)
      },
      autosave_read: (sig: string) => {
        calls.push('autosave_read')
        return base.autosave_read(sig)
      },
      autosave_write: (sig: string, snapshot: unknown) =>
        base.autosave_write(sig, snapshot),
      hasSave: (sig: string) => base.hasSave(sig),
      dispose: () => base.dispose(),
    }
    const e = new ZMachine({ dialog: dialog as any, onState: () => {} })
    await e.boot(story())
    // Both fired during boot, and preload strictly preceded the sync read.
    expect(calls).toContain('preload')
    expect(calls).toContain('autosave_read')
    expect(calls.indexOf('preload')).toBeLessThan(
      calls.indexOf('autosave_read'),
    )
  })
})
