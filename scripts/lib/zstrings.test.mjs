import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { decodeZString, extractStrings, displayLines } from './zstrings.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const buf = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)
// Extraction over the whole file takes a few hundred ms; do it once.
const lines = displayLines(extractStrings(buf))

describe('z-machine v3 string extraction (spec §4)', () => {
  it('finds well-known full lines', () => {
    expect(lines).toContain('West of House')
    expect(
      lines.some(l =>
        l.includes(
          'You have walked into the slavering fangs of a lurking grue!',
        ),
      ),
    ).toBe(true)
    expect(
      lines.some(l => l.includes('ZORK I: The Great Underground Empire')),
    ).toBe(true)
    // Inline TELL literals are at arbitrary byte offsets (not word-aligned);
    // verify both are extracted cleanly.
    expect(lines).toContain('It is pitch black.')
    expect(
      lines.some(l => l.includes('You are likely to be eaten by a grue')),
    ).toBe(true)
  })
  it('every emitted entry is a single normalized display line (no embedded newlines)', () => {
    for (const l of lines) {
      expect(l).not.toContain('\n')
      expect(l).toBe(l.replace(/\s+/g, ' ').trim())
    }
  })
  it('decodeZString accepts a structurally-terminated word (end-bit set)', () => {
    // The high bit of the second byte terminates a Z-string word — even all-0xff
    // is structurally valid and decodes to *something* (brute-scan filter contract).
    expect(decodeZString(new Uint8Array(4).fill(0xff), 0)).not.toBeNull()
  })
  it('decodeZString returns null on a never-terminating run (brute-scan filter contract)', () => {
    expect(decodeZString(new Uint8Array([0x00, 0x00]), 0)).toBeNull()
  })
  it('anchored extraction keeps the inventory-gate population manageable (no mid-instruction garbage flood)', () => {
    // A LOOSE population sanity bound, NOT the coverage gate's fidelity
    // predicate: the real gate (inventory.test.ts) calls the reducer's
    // classify() directly (review I3). This heuristic only needs to catch a
    // brute-scan garbage flood, so the exact room-title shape doesn't matter.
    const fullLine = s => /^[A-Z"'(]/.test(s) && /[.!?:")]$/.test(s)
    const roomTitle = s => /^[A-Z][^.!?]{2,40}$/.test(s)
    const shaped = lines.filter(l => fullLine(l) || roomTitle(l))
    expect(shaped.length).toBeGreaterThan(800) // the real corpus is in here
    expect(shaped.length).toBeLessThan(2000) // brute-scan garbage would blow past this
  })
})
