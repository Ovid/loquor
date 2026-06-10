import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { decodeZString, extractStrings, displayLines } from './zstrings.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const buf = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)
// Extraction over the whole file is a few seconds; do it once.
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
  it('decodeZString returns null on garbage (brute-scan filter contract)', () => {
    expect(decodeZString(new Uint8Array(4).fill(0xff), 0)).not.toBeNull() // end-bit set is *structurally* valid…
    expect(decodeZString(new Uint8Array([0x00, 0x00]), 0)).toBeNull() // …but a never-terminating string is not
  })
})
