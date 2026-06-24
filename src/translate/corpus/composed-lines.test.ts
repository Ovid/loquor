// src/translate/corpus/composed-lines.test.ts
//
// Systematic gate for runtime-COMPOSED display lines (spec
// 2026-06-23-loquor-composed-line-gate-design). Absorbs + replaces
// composed-lines.uat.test.ts. Pure: committed corpus data + match.ts + the
// committed story file's decoded strings (skeleton fidelity, like
// inventory.test.ts) — no ZIL, no VM, no network.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { extractStrings, displayLines } from '../../../scripts/lib/zstrings.mjs'
import { compileCorpus, matchLine } from '../match'
import type { CompiledCorpus } from '../match'
import { corporaFor, CORPUS_ONLY_LANGS } from './index'
import { ZORK1_SIG } from '../../llm/grammar/index'
import type { NlLanguage } from '../../llm/types'
import {
  COMPOSED_FAMILIES,
  EXEMPTIONS,
  EXPECTED_DEFERRED,
  FIDELITY_ALLOW,
  REACHABLE_FLOOR,
  type Family,
} from './composed-families'

const LANGS = corporaFor(ZORK1_SIG) // [{ code, corpus }] for fr/es/de/ka
const COMPILED = new Map<string, CompiledCorpus>(
  LANGS.map(l => [l.code, compileCorpus(l.corpus)]),
)
// Language-INDEPENDENT object set: the union of every corpus's keys, NOT ka's
// own table — so an object missing from ka surfaces as a MISS (decision 2).
const UNION_OBJECTS = [
  ...new Set(LANGS.flatMap(l => Object.keys(l.corpus.objects))),
]

const isReachable = (f: Family) => f.reach === 'reachable'
const REACHABLE = COMPOSED_FAMILIES.filter(isReachable)

const GEORGIAN = /\p{Script=Georgian}/u
const GLUE_FLOOR = 4 // skip trivial spans (" the ", "?", ": ") — they match anything

// Skeleton-fidelity haystack (spec Finding 1): the decoded story strings as
// display lines (normalized exactly like the runtime, via displayLines — the
// same pair inventory.test.ts uses), joined. A composed line is glued from
// sub-fragments, so we check each DISTINCTIVE literal span is a substring of real
// game text. displayLines collapses intra-fragment whitespace to match a
// normalized span, and keeps fragment boundaries so a single-line span can't
// false-match across two fragments.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const buf = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)
const HAYSTACK = displayLines(extractStrings(buf)).join('\n')

/** A skeleton's distinctive literal spans, longer than the trivial-glue floor.
 *  Two normalizations keep the substring check honest without false-failing:
 *   - split on slots AND the runtime listing joins (`,` / ` or ` / ` and `) so a
 *     span never straddles a join the game inserts at runtime — otherwise a
 *     disambiguation span like "do you mean, the" (decoded fragment is just "do
 *     you mean") would false-fail. Splitting a contiguous sentence on " and " is
 *     harmless: both halves stay substrings of that same decoded line.
 *   - strip edge punctuation, because terminal glue is composed too: "with?" =
 *     prep "with" + "?" is not one decoded fragment, and ": The rug…" carries a
 *     leading join. Stripping → "with" / "The rug…", which ARE real game text.
 *  Short prep-glue ("with") then passes trivially (it's glue, low-risk); the
 *  leak risk lives in the longer distinctive response text these pieces capture. */
function literalSpans(en: string): string[] {
  return (
    en
      .split(/\{\w+\}|,| or | and /g)
      // Collapse internal whitespace exactly as displayLines does when building
      // the HAYSTACK (review S6) — else a family `en` with an internal double
      // space would false-FAIL the substring check against normalized game text.
      .map(s =>
        s
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''),
      )
      .filter(s => s.length >= GLUE_FLOOR)
  )
}

/** English tokens a corpus-only language legitimately PASSES THROUGH verbatim
 *  ({raw}/{verb} echoes of the player's own typed word — e.g. the disambiguation
 *  noun). These are the only Latin the no-LLM-language `out` may carry; every
 *  other Latin run is an untranslated leak (review S4). Object names are NOT
 *  echoed (ka renders them as Georgian forms or drops them). */
function echoTokens(fam: Family): string[] {
  const toks: string[] = []
  for (const bind of Object.values(fam.bindings ?? {}))
    if (typeof bind === 'object' && 'sample' in bind) toks.push(bind.sample)
  for (const inst of fam.instances ?? [])
    for (const k of ['raw', 'verb']) if (inst[k]) toks.push(inst[k])
  return toks
}

/** Expand a family into concrete English fill lines for one language. */
function fillsFor(fam: Family, lang: string): string[] {
  const sub = (a: Record<string, string>) =>
    fam.en.replace(/\{(\w+)\}/g, (_m, t: string) => a[t] ?? `{${t}}`)
  if (fam.instances) return fam.instances.map(sub)
  const base: Record<string, string> = {}
  let objSlot: string | null = null
  let objects: readonly string[] = []
  for (const [slot, bind] of Object.entries(fam.bindings ?? {})) {
    if (
      bind === 'all-objects' ||
      (typeof bind === 'object' && 'objects' in bind)
    ) {
      // The loop fills ONE object axis; a second object-bound slot would be
      // silently dropped (only the last survived). Multi-object families must
      // use `instances` — reject the misuse with a clear error (review S5).
      if (objSlot)
        throw new Error(
          `Family "${fam.en}" has >1 object-bound binding ({${objSlot}} and ` +
            `{${slot}}); use \`instances\` for multi-object families.`,
        )
      objSlot = slot
      // ka drives the WHOLE union (faithfulness); fr/de/es one representative.
      objects =
        bind === 'all-objects'
          ? CORPUS_ONLY_LANGS.has(lang as NlLanguage)
            ? UNION_OBJECTS
            : UNION_OBJECTS.slice(0, 1)
          : bind.objects
    } else {
      base[slot] = bind.sample
    }
  }
  if (!objSlot) return [sub(base)] // pure {raw}/{verb} family (e.g. orphan no-noun)
  return objects.map(o => sub({ ...base, [objSlot!]: o }))
}

describe('composed-line gate (spec P2.1)', () => {
  // (1) Fidelity: every skeleton is real game text (runs first, per family).
  describe.each(REACHABLE.map(f => [f.en, f] as const))(
    'fidelity: %s',
    (_en, fam) => {
      it('distinctive literal spans appear in the decoded story file', () => {
        // FIDELITY_ALLOW covers verified extraction-anchoring misses only.
        const missing = literalSpans(fam.en).filter(
          s => !HAYSTACK.includes(s) && !FIDELITY_ALLOW.includes(s),
        )
        expect(missing).toEqual([])
      })
    },
  )

  // (2) Translation drive. corpus-only langs (no LLM net): non-null, !== en,
  //     has target-script char, AND no untranslated English run. fr/de/es: 2
  //     checks (non-null, !== en), skipped iff exempt. Drives off
  //     CORPUS_ONLY_LANGS, not a hardcoded 'ka' (review I3) — a future no-LLM
  //     language gets the union drive and the no-English check automatically.
  const asserted = new Set<string>()
  describe.each(REACHABLE.map(f => [f.en, f] as const))(
    'translate: %s',
    (_en, fam) => {
      it('every eligible (object × language) translates', () => {
        asserted.add(fam.en)
        const echoes = echoTokens(fam)
        const fails: string[] = []
        for (const { code } of LANGS) {
          if (
            EXEMPTIONS[code as 'fr' | 'de' | 'es']?.some(e => e.en === fam.en)
          )
            continue
          const c = COMPILED.get(code)!
          for (const en of fillsFor(fam, code)) {
            const out = matchLine(c, en)
            if (out === null) fails.push(`${code}: MISS "${en}"`)
            else if (out === en)
              fails.push(`${code}: ECHO (untranslated) "${en}"`)
            else if (CORPUS_ONLY_LANGS.has(code)) {
              if (!GEORGIAN.test(out))
                fails.push(
                  `${code}: no target-script char in "${out}" (for "${en}")`,
                )
              // A no-LLM language has no fallback, so one target-script char is
              // too weak a net (review S4): strip the {raw}/{verb} echoes it may
              // legitimately pass through, then ANY remaining Latin run is an
              // untranslated-English leak — the precise failure this branch closes.
              let bare = out
              for (const t of echoes) bare = bare.split(t).join('')
              const leak = bare.match(/[A-Za-z]{2,}/)
              if (leak)
                fails.push(
                  `${code}: untranslated English "${leak[0]}" in "${out}" (for "${en}")`,
                )
            }
          }
        }
        expect(fails).toEqual([])
      })
    },
  )

  // (3) Honesty: deferred families match the committed list (count + names
  //     visible). Asserted, not console.log'd — tests stay pristine (CLAUDE.md).
  it('deferred families match the committed list', () => {
    const deferred = COMPOSED_FAMILIES.filter(f => !isReachable(f))
      .map(f => f.en)
      .sort()
    expect(deferred).toEqual([...EXPECTED_DEFERRED].sort())
  })

  // (4) Every exemption carries a why (the escape hatch can't be used silently).
  it('every exemption has a non-empty why', () => {
    const bad: string[] = []
    for (const [lang, list] of Object.entries(EXEMPTIONS))
      for (const e of list) if (!e.why?.trim()) bad.push(`${lang}: ${e.en}`)
    expect(bad).toEqual([])
  })

  // (5) Meta: floor — a refactor can't silently empty the data file.
  it(`reachable inventory ≥ floor (${REACHABLE_FLOOR})`, () => {
    expect(REACHABLE.length).toBeGreaterThanOrEqual(REACHABLE_FLOOR)
  })

  // (6) Meta: completeness — every reachable family was actually asserted, so a
  //     refactor can't drop entries from the loop while the inventory stays
  //     full. Registered LAST and reads the `asserted` Set populated by the
  //     translate `it` bodies above, so it relies on Vitest's in-file SEQUENTIAL
  //     default — do NOT add `.concurrent` or `sequence.shuffle` to this file or
  //     this check reads a half-filled Set (review S3).
  it('every reachable family was asserted (no silent skip)', () => {
    // Compare Set↔Set, not Set↔Array (review S2): `asserted` is keyed by `en`,
    // so a duplicate `en` (two ZIL sites composing the same surface line) would
    // make a Set↔Array compare fail for a misleading reason — or mask a real
    // drop. Assert `en`-uniqueness explicitly so a dup fails with its own clear
    // message, then compare the de-duped sizes.
    const reachableEns = REACHABLE.map(f => f.en)
    const uniqueEns = new Set(reachableEns)
    expect(reachableEns.length).toBe(uniqueEns.size) // no duplicate `en`
    expect(asserted.size).toBe(uniqueEns.size)
  })
})
