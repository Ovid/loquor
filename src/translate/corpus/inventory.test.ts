// Inventory gate (spec §7.4): every line-shaped entry in the decoded string
// inventory must match the corpus. Catches drift on lines the golden path
// never visits (death messages, off-path responses). Composition fragments
// (mid-sentence TELL pieces) are not full lines — they're excluded by shape,
// and reviewed stragglers live in the committed ignore list.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { extractStrings, displayLines } from '../../../scripts/lib/zstrings.mjs'
import { compileCorpus, matchLine } from '../match'
import { ZORK1_FR } from './zork1.fr'
import { ZORK1_EXTRACTION_IGNORE } from './zork1.extraction-ignore'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const buf = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)

/** Full-line shape: starts like a sentence/title, ends terminated. */
const fullLine = (s: string) => /^[A-Z"'(]/.test(s) && /[.!?:")]$/.test(s)
/** Room-title shape (mirrors the reducer's classify()). */
const roomTitle = (s: string) => /^[A-Z][^.!?]{2,40}$/.test(s)

describe('string-inventory gate (spec §7.4)', () => {
  it('every full-line inventory entry matches the corpus', () => {
    const c = compileCorpus(ZORK1_FR)
    const ignore = new Set<string>(ZORK1_EXTRACTION_IGNORE)
    const misses: string[] = []
    for (const line of displayLines(extractStrings(buf))) {
      if (!fullLine(line) && !roomTitle(line)) continue
      if (ignore.has(line)) continue
      if (matchLine(c, line) === null) misses.push(line)
    }
    expect(misses).toEqual([])
  })

  it('the ignore list stays honest: no entry shadows a corpus match', () => {
    // An ignore entry that the corpus CAN translate is stale review data —
    // either the line became real (delete the ignore) or a key collides.
    const c = compileCorpus(ZORK1_FR)
    const translatable = ZORK1_EXTRACTION_IGNORE.filter(
      s => matchLine(c, s) !== null,
    )
    expect(translatable).toEqual([])
  })
})
