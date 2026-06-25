// Lexicon round-trip gate (spec §7.5): the player types what they read, so
// every display form in a language's objects table must resolve through that
// language's input lexicon to the same canonical — display and input
// vocabularies must not drift. List-driven so each language enrolls identically
// (fr and es now; de later is one row).
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
import { DE_ZORK1 } from '../../llm/lexicon/de.zork1'
import { DE_CORE } from '../../llm/lexicon/de.core'
import { ZORK1_DE_OBJECTS, ZORK1_DE_CANONICAL } from './zork1.de.objects'
import { KA_ZORK1 } from '../../llm/lexicon/ka.zork1'
import { KA_CORE } from '../../llm/lexicon/ka.core'
import { expandGeorgian } from '../../llm/lexicon/expandGeorgian'
import { ZORK1_KA_OBJECTS, ZORK1_KA_CANONICAL } from './zork1.ka.objects'

interface Row {
  code: string
  nouns: NounLexicon
  core: CoreLexicon
  objects: ObjectsTable
  canonical: Readonly<Record<string, string>>
  /** Extra phrase-head tokens stripped before the lexicon-membership check,
   * beyond core.articles. FR: partitive de/d'. ES: a/del/al/de/d — the bare
   * prepositions plus their el-contractions, so derived alDef/delDef forms
   * ("al trol", "a la cesta", "del saco", "de la botella") fold to the same
   * canonical noun as def (Task 6). */
  headExtra: readonly string[]
  /** Optional per-language reduction applied to the folded display form before
   * the membership check — mirrors the language's input pre-stage. ka applies the
   * NOMINATIVE -ი STRIP ONLY (not the postposition split) so display nominatives
   * reconcile with stored bare stems (finding-9). The split is deliberately
   * OMITTED here (review M2): some object NAMES carry genuine instrumental
   * morphology — e.g. `ტყავის ტომარა მონეტებით` ("leather bag of coins") ends in
   * -ით — and splitting that would mangle the display name, not a player's
   * postpositional input. expandGeorgian(tokens, {}) runs only the -ი strip
   * (no suffix matches the empty map). */
  reduce?: (folded: string) => string
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
    headExtra: ['a', 'del', 'al', 'de', 'd'],
  },
  {
    code: 'de',
    nouns: DE_ZORK1,
    core: DE_CORE,
    objects: ZORK1_DE_OBJECTS,
    canonical: ZORK1_DE_CANONICAL,
    // Fused preposition+article contractions baked into per-object keys
    // (imDat: 'im Briefkasten'); headExtra strips the leading fused token so the
    // baked form folds to the bare noun before the lexicon-membership check.
    // Case articles der/die/das/den/dem/des already strip via core.articles.
    headExtra: ['zum', 'zur', 'im', 'am', 'ins', 'vom', 'beim', 'ans', 'aufs'],
  },
  {
    code: 'ka',
    nouns: KA_ZORK1,
    core: KA_CORE,
    objects: ZORK1_KA_OBJECTS,
    canonical: ZORK1_KA_CANONICAL,
    headExtra: [], // Georgian has no articles
    // Nominative -ი strip only (empty postpositions → no split, M2):
    reduce: f => expandGeorgian(f.split(' '), {}).join(' '),
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

    const reduce = row.reduce ?? ((s: string) => s)

    it('every form of every object resolves to its canonical', () => {
      const failures: string[] = []
      for (const [en, forms] of Object.entries(row.objects)) {
        const canonical = row.canonical[en] ?? en
        const lex = row.nouns[canonical]
        if (!lex) {
          failures.push(
            `"${en}": no ${row.code} entry for canonical "${canonical}"`,
          )
          continue
        }
        for (const [key, form] of Object.entries(forms)) {
          const phrase = reduce(stripHead(fold(form)))
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
