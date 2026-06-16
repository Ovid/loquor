// Form-key completeness gate (spec §4, §2.1; pushback Issue 2). A language
// supplies case keys piecemeal (e.g. German) or drops a withContractions()
// guarantee, so a template referencing {obj.<key>} against an object lacking
// <key> would MISS at runtime — and the coverage gate, replaying one
// walkthrough, only checks the object×template bindings that transcript
// exercises. This is the static net: every key any template references must
// exist on EVERY object. F8: registry-driven over EVERY covered language (like
// the coverage gate), so a key gap in FR/ES is caught too, not German only.
//
// SOUNDNESS CEILING: the matcher's {obj} regex can bind any object name, so we
// enforce UNIFORM completeness (required-key union present on all objects).
// Discipline keeps the union small: niche dative/genitive/contraction lines are
// pinned as full strings (zork1.de.strings.ts), never shared templates, so their
// per-object keys stay out of the union.
import { describe, it, expect } from 'vitest'
import { corporaFor } from './index'
import { ZORK1_SIG } from '../../llm/grammar/index'
import type { TranslationCorpus } from '../types'

const LANGS = corporaFor(ZORK1_SIG)

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

describe.each(LANGS)('$code form-key completeness (spec §4, §2.1)', ({ corpus }) => {
  it('every object supplies every template-referenced form key', () => {
    const required = referencedFormKeys(corpus)
    const failures: string[] = []
    for (const [name, forms] of Object.entries(corpus.objects))
      for (const key of required)
        if (!(key in forms)) failures.push(`"${name}" missing .${key}`)
    expect(failures).toEqual([])
  })

  it('the required-key set is non-empty (guards a vacuous pass)', () => {
    expect(referencedFormKeys(corpus).size).toBeGreaterThan(0)
  })

  it('includes `indef` from the match.ts BUILTIN listings (coupling pin)', () => {
    // If match.ts's BUILTIN ever references a key beyond `indef`, BUILTIN_OUTS
    // must be updated to match — this pins that `indef` requirement is carried.
    expect(referencedFormKeys(corpus).has('indef')).toBe(true)
  })
})
