// Lexicon round-trip gate (spec §7.5): the player types what they read, so
// every French form in the objects table must resolve through the FR input
// lexicon to the same canonical — display and input vocabularies must not
// drift, at authoring time or during UAT hand-fixes.
import { describe, it, expect } from 'vitest'
import { FR_ZORK1 } from '../../llm/lexicon/fr.zork1'
import { FR_CORE } from '../../llm/lexicon/fr.core'
import { fold } from '../../llm/lexicon/fold'
import { ZORK1_FR_OBJECTS, ZORK1_FR_CANONICAL } from './zork1.fr.objects'

// Articles/partitives to strip at the phrase head (fold() already split
// elisions: "l'œuf" → "l oeuf").
const HEAD = new Set([...FR_CORE.articles, 'de', 'd'])

function stripHead(folded: string): string {
  const toks = folded.split(' ')
  while (toks.length > 1 && HEAD.has(toks[0])) toks.shift()
  return toks.join(' ')
}

describe('objects table ↔ FR input lexicon round-trip (spec §7.5)', () => {
  it('every form of every object resolves to its canonical', () => {
    const failures: string[] = []
    for (const [en, forms] of Object.entries(ZORK1_FR_OBJECTS)) {
      const canonical = ZORK1_FR_CANONICAL[en] ?? en
      const lex = FR_ZORK1[canonical]
      if (!lex) {
        failures.push(`"${en}": no FR_ZORK1 entry for canonical "${canonical}"`)
        continue
      }
      for (const [key, form] of Object.entries(forms)) {
        const phrase = stripHead(fold(form))
        if (!lex.includes(phrase))
          failures.push(
            `"${en}".${key} = "${form}" → "${phrase}" missing from FR_ZORK1["${canonical}"]`,
          )
      }
    }
    expect(failures).toEqual([])
  })
  it('a populated table (guards against the gate passing vacuously)', () => {
    expect(Object.keys(ZORK1_FR_OBJECTS).length).toBeGreaterThan(100)
  })
})
