import { describe, it, expect } from 'vitest'
import { IDB_KEYS } from './idbKeys'

// F-8: pin each builder's exact output at the source. The end-to-end literal
// pins (dialog/fallbackCache tests) catch a drift through the public API; this
// fixes the format right where it's declared so the shared 'kv' namespace stays
// visible and unchanged. Changing any of these orphans existing user data.
describe('IDB_KEYS registry (F-8)', () => {
  it('builds the autosave key', () => {
    expect(IDB_KEYS.autosave('SIG')).toBe('autosave:SIG')
  })
  it('builds the explicit save-slot key', () => {
    expect(IDB_KEYS.file('save', 'GID', 'slot1')).toBe('file:save:GID:slot1')
  })
  it('builds the fallback-translation key', () => {
    expect(IDB_KEYS.xlate('sig1', 'fr', 'Hello.')).toBe('xlate:sig1:fr:Hello.')
  })
})
