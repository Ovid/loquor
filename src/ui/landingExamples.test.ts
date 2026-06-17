// src/ui/landingExamples.test.ts
// Player-first gate: every landing example must parse to a COMMAND (not a miss)
// in BASIC mode for all three games. EN clauses are raw-sent, so the faithful
// check is "made of real game words"; FR/DE/ES run the real deterministic path.
import { describe, it, expect } from 'vitest'
import { LANDING_EXAMPLES } from './landingExamples'
import { splitClauses } from '../llm/inputTranslate'
import { parseDirection } from '../llm/directions'
import { parseLexicon } from '../llm/lexicon/parse'
import { coreLexicon, nounLexicon } from '../llm/lexicon/index'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../llm/grammar/index'
import { ZORK1_VOCAB } from '../llm/grammar/zork1.vocab'
import { ZORK2_VOCAB } from '../llm/grammar/zork2.vocab'
import { ZORK3_VOCAB } from '../llm/grammar/zork3.vocab'
import type { Vocab } from '../llm/grammar/types'
import type { LexLang } from '../llm/lexicon/types'
import type { Scene } from '../llm/scene/types'

const GAMES: [string, Vocab][] = [
  [ZORK1_SIG, ZORK1_VOCAB],
  [ZORK2_SIG, ZORK2_VOCAB],
  [ZORK3_SIG, ZORK3_VOCAB],
]
const EMPTY_SCENE: Scene = { inScope: [], antecedent: null }

// Every word an English basic-mode clause may legitimately be made of: verbs,
// directions, prepositions, noun surface forms, plus articles/conjunctions.
function englishWords(vocab: Vocab): Set<string> {
  const out = new Set<string>()
  const add = (s: string) => s.split(/\s+/).forEach(w => w && out.add(w))
  for (const v of [
    ...vocab.verbsOnly,
    ...vocab.verbs1,
    ...vocab.verbs2,
    ...vocab.verbSynonyms,
    ...vocab.movement,
    ...vocab.preps,
  ])
    add(v)
  for (const n of vocab.nouns) {
    add(n.emit)
    add(n.canonical)
    n.synonyms?.forEach(add)
    n.adjectives?.forEach(add)
  }
  for (const w of ['the', 'a', 'an', 'and', 'then']) out.add(w)
  return out
}

function clauseParsesEn(clause: string, vocab: Vocab): boolean {
  if (parseDirection(clause, vocab.movement)) return true
  const words = englishWords(vocab)
  const tokens = clause
    .toLowerCase()
    .replace(/[.,;!?]/g, '')
    .split(/\s+/)
  return tokens.every(t => t === '' || words.has(t))
}

function clauseParsesForeign(
  clause: string,
  lang: LexLang,
  sig: string,
  vocab: Vocab,
): boolean {
  if (parseDirection(clause, vocab.movement)) return true
  const nouns = nounLexicon(lang, sig)
  if (!nouns) return false
  return (
    parseLexicon(clause, coreLexicon(lang), nouns, vocab, EMPTY_SCENE).kind ===
    'command'
  )
}

describe('landing examples parse in basic mode for every game', () => {
  for (const [sig, vocab] of GAMES) {
    it(`English examples are real game commands (${sig.slice(0, 6)})`, () => {
      for (const example of LANDING_EXAMPLES.en) {
        for (const clause of splitClauses(example)) {
          expect(
            clauseParsesEn(clause, vocab),
            `"${clause}" in "${example}"`,
          ).toBe(true)
        }
      }
    })
    for (const lang of ['fr', 'de', 'es'] as LexLang[]) {
      it(`${lang} examples parse deterministically (${sig.slice(0, 6)})`, () => {
        for (const example of LANDING_EXAMPLES[lang]) {
          for (const clause of splitClauses(example)) {
            expect(
              clauseParsesForeign(clause, lang, sig, vocab),
              `"${clause}" in "${example}"`,
            ).toBe(true)
          }
        }
      })
    }
  }
})
