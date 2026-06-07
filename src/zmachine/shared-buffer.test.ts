import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { ZMachine } from './engine'
import { IdbDialog } from '../storage/dialog'
import { signature } from './signature'
import { emptyView, type ViewState } from '../glkote-react/types'

const story = (g: string) =>
  new Uint8Array(readFileSync(`public/games/${g}.z3`))
const resetDb = () =>
  new Promise<void>(r => {
    const req = indexedDB.deleteDatabase('naitfol')
    req.onsuccess = req.onerror = () => r()
  })
beforeEach(resetDb)

describe('shared story buffer (the real browser/StrictMode condition)', () => {
  it('GUARD: booting does NOT mutate the caller buffer (signature stays stable)', async () => {
    // ifvms writes interpreter bits into the header (Flags 1 @ 0x01, inside the
    // signature range). boot() must work on a private copy so the caller's buffer
    // — shared across StrictMode boots — is never dirtied, keeping the per-game
    // autosave signature stable across sessions.
    const buf = story('zork1')
    const sigBefore = signature(buf)

    const e = new ZMachine({
      dialog: new IdbDialog() as any,
      onState: () => {},
    })
    await e.boot(buf)

    expect(signature(buf)).toBe(sigBefore)
  })

  it('REPRO: StrictMode double-boot on ONE buffer breaks next-session resume', async () => {
    // Browser: App fetches once → ONE Uint8Array → StrictMode boots TWO engines.
    const shared = story('zork1')
    let vB: ViewState = emptyView
    const eA = new ZMachine({
      dialog: new IdbDialog() as any,
      onState: () => {},
    })
    const eB = new ZMachine({
      dialog: new IdbDialog() as any,
      onState: v => (vB = v),
    })
    await Promise.all([eA.boot(shared), eB.boot(shared)])

    // Play in the live engine and let the autosave settle.
    eB.sendLine('north')
    await eB.flushAutosave()
    expect(vB.status?.location).toMatch(/North of House/i)

    // Next session: fresh fetch (clean buffer) + fresh dialog → should resume.
    let vResume: ViewState = emptyView
    const eResume = new ZMachine({
      dialog: new IdbDialog() as any,
      onState: v => (vResume = v),
    })
    await eResume.boot(story('zork1'))
    expect(vResume.status?.location).toMatch(/North of House/i)
  })
})
