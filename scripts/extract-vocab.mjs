// scripts/extract-vocab.mjs
// Regenerate src/llm/grammar/zork{1,2,3}.vocab.ts from the read-only vendored ZIL.
// Standalone Node ESM dev tool (run: `node scripts/extract-vocab.mjs` or
// `make extract-vocab`). The vendored zorkN/ dirs are ONLY read, never modified.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  readForms,
  extractVerbsAndPreps,
  extractNouns,
  extractDirections,
  buildVocabModule,
} from './lib/zil.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Read the shared meta-command list from src/llm/meta.ts (single source of truth
// for both the runtime and this generator) and lowercase it into a Set.
function readMetaSet() {
  const text = readFileSync(join(ROOT, 'src/llm/meta.ts'), 'utf8')
  // Anchor on the assignment `= [` (not just the first `[` after the identifier):
  // the declaration `META_COMMANDS: readonly string[] = [` contains the `[` of
  // `string[]` first, so a `[^[]*\[` anchor would lock onto the empty `string[]`
  // brackets and parse zero commands, silently disabling the meta-exclusion guard.
  const block = text.match(/META_COMMANDS[^=]*=\s*\[([\s\S]*?)\]/)
  const set = new Set()
  if (block) for (const m of block[1].matchAll(/['"]([^'"]+)['"]/g)) set.add(m[1].toLowerCase())
  if (set.size === 0) {
    throw new Error('readMetaSet: parsed 0 commands from src/llm/meta.ts — META_COMMANDS regex did not match; aborting to avoid silently leaking meta verbs into verbsOnly')
  }
  return set
}

// Parse the verbsOnly array from the EXISTING committed vocab file (read before it
// is overwritten) so the run can surface any verb the regeneration would silently
// DROP — the reconciliation guard the spec mandates (Architecture §4). Returns []
// when the file does not yet exist.
function readCommittedVerbsOnly(outPath) {
  let text
  try {
    text = readFileSync(outPath, 'utf8')
  } catch {
    return []
  }
  const block = text.match(/verbsOnly:\s*\[([\s\S]*?)\]/)
  const out = []
  if (block) for (const m of block[1].matchAll(/['"]([^'"]+)['"]/g)) out.push(m[1].toLowerCase())
  return out
}

function main() {
  const meta = readMetaSet()
  const outFiles = []

  for (const N of [1, 2, 3]) {
    const gsyntax = readFileSync(join(ROOT, `zork${N}/gsyntax.zil`), 'utf8')
    // Pinned filename — never a glob: zork3/ also ships a stale dungeon.zil.
    const dungeon = readFileSync(join(ROOT, `zork${N}/${N}dungeon.zil`), 'utf8')
    const globals = readFileSync(join(ROOT, `zork${N}/gglobals.zil`), 'utf8')

    const vp = extractVerbsAndPreps(readForms(gsyntax), N, meta)
    const nouns = extractNouns(dungeon, globals)
    const movement = extractDirections(dungeon)
    const vocab = { ...vp, movement, nouns }

    const outPath = join(ROOT, `src/llm/grammar/zork${N}.vocab.ts`)
    // Capture the committed verbsOnly BEFORE overwriting, for the drop diff below.
    const priorVerbsOnly = readCommittedVerbsOnly(outPath)
    writeFileSync(outPath, buildVocabModule(N, vocab))
    outFiles.push(outPath)

    // Reconciliation log (review before committing — Issue 1 of the spec review).
    console.log(
      `zork${N}: verbsOnly=${vp.verbsOnly.length} verbs1=${vp.verbs1.length} ` +
        `verbs2=${vp.verbs2.length} preps=${vp.preps.length} nouns=${nouns.length}`,
    )
    console.log(`  meta-excluded verb-only canonicals: ${vp.excludedMeta.join(', ') || '(none)'}`)
    // Spec-mandated reconciliation DIFF: verbs in the committed verbsOnly now absent
    // from the regenerated output AND not routed via META — the silent-drop class
    // this generator exists to make visible. (META_COMMANDS verbs like 'again'/'quit'
    // are excluded: they are intentionally relocated, not dropped.)
    const dropped = priorVerbsOnly.filter(v => !vp.verbsOnly.includes(v) && !meta.has(v))
    if (dropped.length) {
      console.warn(
        `  RECONCILE: committed verbsOnly verbs now absent (review before commit!): ${dropped.join(', ')}`,
      )
    } else {
      console.log('  reconcile: no committed verbsOnly verbs dropped')
    }
    if (!vp.verbsOnly.includes('inventory')) {
      console.warn(`  WARNING: 'inventory' missing from zork${N} verbsOnly — it must stay emittable`)
    }
  }

  // Make the committed artifacts formatter-canonical so a fresh run is a no-op diff.
  execFileSync('npx', ['prettier', '--write', ...outFiles], { stdio: 'inherit', cwd: ROOT })
  console.log('Done. Review the diff + reconciliation log above, then commit.')
}

main()
