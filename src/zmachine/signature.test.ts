import { describe, it, expect } from 'vitest'
import { signature } from './signature'

describe('signature', () => {
  it('hex-encodes the first 0x1E bytes', () => {
    const bytes = new Uint8Array(0x1e).map((_, i) => i)
    const sig = signature(bytes)
    expect(sig).toHaveLength(0x1e * 2)
    expect(sig.startsWith('000102')).toBe(true)
  })

  it('throws on a buffer shorter than 0x1E bytes (truncated download / error page)', () => {
    // Without a length guard, bytes[i] is undefined and .toString() throws an
    // opaque TypeError deep in the boot path. Fail loud and early instead.
    expect(() => signature(new Uint8Array(10))).toThrow(/too short/i)
  })
})
