// Enforces that every PROVISIONAL Georgian (`ka`) string added on this branch
// carries a `NATIVE-REVIEW-DRAFT` marker comment, so a marker can't be silently
// dropped (which would let an unreviewed line be treated as final). ka is
// Phase-1 OUTPUT-ONLY and machine-authored; only a native review makes these
// lines final (see notes/georgian-native-review-followup.md).
//
// MECHANISM: these are SOURCE files; we read their text via fs.readFileSync and
// scan for Georgian-script characters (Mkhedruli U+10A0..U+10FF). For each
// provisional Georgian string this branch added, a `NATIVE-REVIEW-DRAFT` marker
// must appear within a small window of preceding lines (the markers live as
// `// NATIVE-REVIEW-DRAFT (...)` comments just above the string they govern).
//
// SCOPING (so the test is meaningful, not trivially-true or falsely-failing):
//   • help.ts / notices.ts had NO Georgian before this branch — their only
//     Georgian-bearing lines ARE this branch's ka drafts, so EVERY Georgian line
//     must be marked.
//   • zork1.ka.templates.ts is a PRE-EXISTING reviewed ka corpus (~34 Georgian
//     `out` lines that are NOT drafts). Only ONE entry was added/flagged this
//     branch: the generalized disambiguation template. So we scope the assertion
//     to that specific entry, NOT to every Georgian char in the file.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const MARKER = 'NATIVE-REVIEW-DRAFT'
// Mkhedruli (modern Georgian). Covers the full Georgian block U+10A0..U+10FF.
const GEORGIAN = /[Ⴀ-ჿ]/
// How many lines above a Georgian string we accept the marker comment to sit.
// The markers are placed in the comment block directly preceding each string;
// a small window keeps the rule non-brittle without going trivially-true.
const WINDOW = 8

const read = (rel: string): string[] =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').split('\n')

/** True if a NATIVE-REVIEW-DRAFT marker governs the Georgian string at `idx`:
 * on the line itself or within WINDOW preceding lines (the comment block). */
function markerGoverns(lines: string[], idx: number): boolean {
  const from = Math.max(0, idx - WINDOW)
  for (let i = idx; i >= from; i--) {
    if (lines[i].includes(MARKER)) return true
  }
  return false
}

describe('ka provisional Georgian strings carry a NATIVE-REVIEW-DRAFT marker', () => {
  // help.ts and notices.ts: their ONLY Georgian is this branch's ka drafts, so
  // EVERY Georgian-bearing line must be governed by a marker.
  for (const rel of ['../../llm/help.ts', '../../llm/notices.ts']) {
    it(`${rel}: every Georgian line is marked as a native-review draft`, () => {
      const lines = read(rel)
      const georgian = lines
        .map((line, idx) => ({ line, idx }))
        .filter(({ line }) => GEORGIAN.test(line))

      // Guard against the test going trivially-true if the ka strings ever move
      // or vanish: these files are expected to carry Georgian drafts.
      expect(
        georgian.length,
        `expected ${rel} to contain provisional Georgian (ka) strings`,
      ).toBeGreaterThan(0)

      const unmarked = georgian.filter(({ idx }) => !markerGoverns(lines, idx))
      expect(
        unmarked.map(({ line, idx }) => `${rel}:${idx + 1}  ${line.trim()}`),
        `${rel} has Georgian (ka) string(s) without a ${MARKER} marker`,
      ).toEqual([])
    })
  }

  // templates.ts: a pre-existing reviewed ka corpus with ONE draft entry added
  // this branch — the generalized disambiguation template. Scope the assertion
  // to THAT entry (matched by its English key) so the pre-existing reviewed
  // Georgian lines are not falsely required to carry a marker.
  it('zork1.ka.templates.ts: the disambiguation draft entry is marked', () => {
    const rel = './zork1.ka.templates.ts'
    const lines = read(rel)
    // The new entry's `out` is the only Georgian string of the generalized
    // disambiguation template. Locate it by its language-neutral {raw} echo.
    const idx = lines.findIndex(
      line =>
        GEORGIAN.test(line) &&
        line.includes('{raw}') &&
        line.includes('{obj.indef}'),
    )
    expect(
      idx,
      'expected the generalized disambiguation template Georgian `out` line in ' +
        rel,
    ).toBeGreaterThanOrEqual(0)
    expect(
      markerGoverns(lines, idx),
      `the disambiguation template Georgian line (${rel}:${idx + 1}) needs a ${MARKER} marker`,
    ).toBe(true)
  })
})
