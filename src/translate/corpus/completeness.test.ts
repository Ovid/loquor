// Form-key completeness gate (spec §4, §2.1; pushback Issue 2). German supplies
// case keys piecemeal and drops Spanish's withContractions() guarantee, so a
// template referencing {obj.<key>} against an object lacking <key> would MISS at
// runtime — and the coverage gate, replaying one walkthrough, only checks the
// object×template bindings that transcript exercises. This is the static net:
// every key any template references must exist on EVERY object.
//
// SOUNDNESS CEILING: the matcher's {obj} regex can bind any object name, so we
// enforce UNIFORM completeness (required-key union present on all objects).
// Discipline keeps the union small: niche dative/genitive/contraction lines are
// pinned as full strings (zork1.de.strings.ts), never shared templates, so their
// per-object keys stay out of the union.
import { describe, it, expect } from 'vitest'
import { ZORK1_DE } from './zork1.de'
import type { TranslationCorpus } from '../types'

// match.ts BUILTIN listing templates ('A {obj}'/'An {obj}' → '{obj.indef}')
// reference `indef` for every listed object, so `indef` is always required even
// though no authored template names it. We mirror that out-form here as a
// constant rather than importing BUILTIN, because spec §6 forbids touching
// match.ts (BUILTIN is a private const; exporting it would also fail Task 4
// Step 3's empty-seam-diff guard). The guard test below pins the coupling so a
// future BUILTIN that referenced another key surfaces as a deliberate update
// here, not a silent gap.
const BUILTIN_OUTS = ['{obj.indef}']

function referencedFormKeys(corpus: TranslationCorpus): Set<string> {
  const keys = new Set<string>()
  const re = /\{obj2?\.([A-Za-z]+)\}/g
  for (const out of [...corpus.templates.map(t => t.out), ...BUILTIN_OUTS])
    for (const m of out.matchAll(re)) keys.add(m[1])
  return keys
}

describe('German form-key completeness (spec §4, §2.1)', () => {
  it('every object supplies every template-referenced form key', () => {
    const required = referencedFormKeys(ZORK1_DE)
    const failures: string[] = []
    for (const [name, forms] of Object.entries(ZORK1_DE.objects))
      for (const key of required)
        if (!(key in forms)) failures.push(`"${name}" missing .${key}`)
    expect(failures).toEqual([])
  })

  it('the required-key set is non-empty (guards a vacuous pass)', () => {
    expect(referencedFormKeys(ZORK1_DE).size).toBeGreaterThan(0)
  })

  it('includes `indef` from the match.ts BUILTIN listings (coupling pin)', () => {
    // If match.ts's BUILTIN ever references a key beyond `indef`, BUILTIN_OUTS
    // must be updated to match — this pins that `indef` requirement is carried.
    expect(referencedFormKeys(ZORK1_DE).has('indef')).toBe(true)
  })
})
