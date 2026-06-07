import { describe, it, expect } from 'vitest'
import { ZMachine } from './engine'

describe('ZMachine.echoLocal', () => {
  it('appends an nl-source line via the bridge without booting', () => {
    const states: any[] = []
    const zm = new ZMachine({
      dialog: { streaming: false, autosave_read: () => null, autosave_write: () => {} },
      onState: v => states.push(v),
    })
    zm.echoLocal('grab the lantern')
    const last = states[states.length - 1]
    expect(last.lines.some((l: any) => l.kind === 'nl-source')).toBe(true)
  })
})
