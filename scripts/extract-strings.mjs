// Decode the committed Zork I story file's string inventory (output-translation
// spec §4). Output is DERIVED data → scripts/out/ is gitignored. The corpus
// data files in src/translate/corpus/ are the reviewed, committed artifacts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { extractStrings, displayLines } from './lib/zstrings.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const buf = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)
const strings = extractStrings(buf)
const lines = displayLines(strings)
mkdirSync(resolve(repoRoot, 'scripts/out'), { recursive: true })
writeFileSync(
  resolve(repoRoot, 'scripts/out/zork1.strings.json'),
  JSON.stringify({ strings, lines }, null, 2),
)
console.log(`zork1: ${strings.length} strings → ${lines.length} display lines`)
