import { describe, it, expect } from 'vitest'
import { ZMachine } from './engine'

describe('ZMachine.echoLocal', () => {
  it('appends an nl-source line via the bridge without booting', () => {
    const states: any[] = []
    const zm = new ZMachine({
      dialog: {
        streaming: false,
        autosave_read: () => null,
        autosave_write: () => {},
      },
      onState: v => states.push(v),
    })
    zm.echoLocal('grab the lantern')
    const last = states[states.length - 1]
    expect(last.lines.some((l: any) => l.kind === 'nl-source')).toBe(true)
  })
})

describe('ZMachine.currentView', () => {
  it('returns the bridge view synchronously — the getContext source, no React lag', () => {
    // getContext (Terminal) reads currentView instead of an effect-lagged React
    // ref, so a command issued before React flushes the prior echo still sees the
    // settled view (review S1). currentView delegates straight to the bridge, so
    // the mutation is visible the instant echoLocal/sendLine returns.
    const zm = new ZMachine({
      dialog: {
        streaming: false,
        autosave_read: () => null,
        autosave_write: () => {},
      },
      onState: () => {},
    })
    zm.echoLocal('grab the lantern')
    expect(zm.currentView.lines.some(l => l.kind === 'nl-source')).toBe(true)
  })
})
