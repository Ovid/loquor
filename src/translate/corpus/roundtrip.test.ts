// Lexicon round-trip gate (spec §7.5): the player types what they read, so
// every display form in a language's objects table must resolve through that
// language's input lexicon to the same canonical — display and input
// vocabularies must not drift. List-driven so each language enrolls identically
// (fr now; es in Task 5; de later is one row).
import { describe, it, expect } from 'vitest'
import { fold } from '../../llm/lexicon/fold'
import type { CoreLexicon, NounLexicon } from '../../llm/lexicon/types'
import type { ObjectsTable } from '../types'
import { FR_ZORK1 } from '../../llm/lexicon/fr.zork1'
import { FR_CORE } from '../../llm/lexicon/fr.core'
import { ZORK1_FR_OBJECTS, ZORK1_FR_CANONICAL } from './zork1.fr.objects'
import { ES_ZORK1 } from '../../llm/lexicon/es.zork1'
import { ES_CORE } from '../../llm/lexicon/es.core'
import { ZORK1_ES_OBJECTS, ZORK1_ES_CANONICAL } from './zork1.es.objects'

interface Row {
  code: string
  nouns: NounLexicon
  core: CoreLexicon
  objects: ObjectsTable
  canonical: Readonly<Record<string, string>>
  /** Extra phrase-head tokens stripped before the lexicon-membership check,
   * beyond core.articles. FR: partitive de/d'. ES (Task 5): del/al/de/d. */
  headExtra: readonly string[]
}

const LANGS: Row[] = [
  {
    code: 'fr',
    nouns: FR_ZORK1,
    core: FR_CORE,
    objects: ZORK1_FR_OBJECTS,
    canonical: ZORK1_FR_CANONICAL,
    headExtra: ['de', 'd'],
  },
  {
    code: 'es',
    nouns: ES_ZORK1,
    core: ES_CORE,
    objects: ZORK1_ES_OBJECTS,
    canonical: ZORK1_ES_CANONICAL,
    headExtra: ['del', 'al', 'de', 'd'],
  },
]

describe.each(LANGS)(
  'objects table ↔ $code input lexicon round-trip (spec §7.5)',
  row => {
    const HEAD = new Set<string>([...row.core.articles, ...row.headExtra])
    const stripHead = (folded: string): string => {
      const toks = folded.split(' ')
      while (toks.length > 1 && HEAD.has(toks[0])) toks.shift()
      return toks.join(' ')
    }

    it('every form of every object resolves to its canonical', () => {
      const failures: string[] = []
      for (const [en, forms] of Object.entries(row.objects)) {
        const canonical = row.canonical[en] ?? en
        const lex = row.nouns[canonical]
        if (!lex) {
          failures.push(`"${en}": no ${row.code} entry for canonical "${canonical}"`)
          continue
        }
        for (const [key, form] of Object.entries(forms)) {
          const phrase = stripHead(fold(form))
          if (!lex.includes(phrase))
            failures.push(
              `"${en}".${key} = "${form}" → "${phrase}" missing from ${row.code}["${canonical}"]`,
            )
        }
      }
      expect(failures).toEqual([])
    })

    it('a populated table (guards against the gate passing vacuously)', () => {
      expect(Object.keys(row.objects).length).toBeGreaterThan(100)
    })
  },
)
