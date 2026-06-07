import { describe, it, expect } from 'vitest'
import { signature } from './signature'

describe('signature', () => {
  it('hex-encodes the first 0x1E bytes', () => {
    // byte 0 is the Z-machine version (3 for Zork I-III); the rest are filler.
    const bytes = new Uint8Array(0x1e).map((_, i) => (i === 0 ? 3 : i))
    const sig = signature(bytes)
    expect(sig).toHaveLength(0x1e * 2)
    expect(sig.startsWith('030102')).toBe(true)
  })

  it('throws when the story is not raw Z-code (e.g. a Blorb wrapper)', () => {
    // ifvms keys autosave from the extracted Z-code (origram), not the raw file.
    // For a wrapped .zblorb (starts with the IFF "FORM" tag) our raw-byte
    // signature would diverge and the save would silently never resume. Reject
    // it loudly: byte 0 must be a valid Z-machine version (1-8).
    const blorb = new Uint8Array(0x1e)
    blorb.set([0x46, 0x4f, 0x52, 0x4d], 0) // "FORM"
    expect(() => signature(blorb)).toThrow(/raw z-code|version/i)
  })

  it('throws on a buffer shorter than 0x1E bytes (truncated download / error page)', () => {
    // Without a length guard, bytes[i] is undefined and .toString() throws an
    // opaque TypeError deep in the boot path. Fail loud and early instead.
    expect(() => signature(new Uint8Array(10))).toThrow(/too short/i)
  })
})
