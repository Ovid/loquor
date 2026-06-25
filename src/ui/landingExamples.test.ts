// src/ui/landingExamples.test.ts
// Player-first gate: every landing example must parse to a COMMAND (not a miss)
// in BASIC mode for all three games. EN clauses are raw-sent, so the faithful
// check runs the REAL raw-send predicate (isVocabPassthrough — the exact gate
// the English basic-mode path uses); FR/DE/ES run the real deterministic path.
import { describe, it, expect } from 'vitest'
import { LANDING_EXAMPLES, LANDING_EXAMPLES_KA_INPUT } from './landingExamples'
import { splitClauses, isVocabPassthrough } from '../llm/inputTranslate'
import { parseDirection } from '../llm/directions'
import { parseLexicon } from '../llm/lexicon/parse'
import { coreLexicon, nounLexicon } from '../llm/lexicon/index'
import { KA_CORE } from '../llm/lexicon/ka.core'
import { KA_ZORK1 } from '../llm/lexicon/ka.zork1'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../llm/grammar/index'
import { ZORK1_VOCAB } from '../llm/grammar/zork1.vocab'
import { ZORK2_VOCAB } from '../llm/grammar/zork2.vocab'
import { ZORK3_VOCAB } from '../llm/grammar/zork3.vocab'
import { NL_LANGUAGES } from '../llm/types'
import type { Vocab } from '../llm/grammar/types'
import type { LexLang } from '../llm/lexicon/types'
import type { Scene } from '../llm/scene/types'

// Foreign INPUT play languages, derived from the source of truth (not a
// hardcoded list) so a new play language is forced through this gate too —
// mirroring the LANDING_EXAMPLES key type (review I1). Georgian (ka) is excluded
// here on purpose: Phase 1 Georgian is read-Georgian / type-ENGLISH (spec §3a),
// so its examples ARE the English ones (raw-sent), with no input lexicon. They
// are gated through the English raw-send predicate below, like en.
const FOREIGN = NL_LANGUAGES.filter(
  l => l !== 'off' && l !== 'en' && l !== 'ka',
) as LexLang[]

const GAMES: [string, Vocab][] = [
  [ZORK1_SIG, ZORK1_VOCAB],
  [ZORK2_SIG, ZORK2_VOCAB],
  [ZORK3_SIG, ZORK3_VOCAB],
]
const EMPTY_SCENE: Scene = { inScope: [], antecedent: null }

function clauseParsesEn(clause: string, vocab: Vocab): boolean {
  if (parseDirection(clause, vocab.movement)) return true
  // The real English basic-mode gate: no active foreign lexicon, so null.
  return isVocabPassthrough(clause, vocab, null)
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
    // Georgian (ka) raw-sends English (read-Georgian / type-English, §3a), so
    // its examples must pass the same English raw-send gate as `en`.
    it(`ka examples are real game commands — English raw-send (${sig.slice(0, 6)})`, () => {
      for (const example of LANDING_EXAMPLES.ka) {
        for (const clause of splitClauses(example)) {
          expect(
            clauseParsesEn(clause, vocab),
            `"${clause}" in "${example}"`,
          ).toBe(true)
        }
      }
    })
    for (const lang of FOREIGN) {
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

// Phase-2 Georgian-INPUT examples (spec §5.6) are Zork-I-ONLY (the one game with
// a ka input lexicon), unlike the game-independent sets above. They must parse
// via the ka DETERMINISTIC path — the exact chain the in-game ka picker uses on
// Zork I (no LLM): a bare direction (directions.ts) or a ka lexicon command.
// This is what makes the compound lead example `აიღე ფარანი და წადი ჩრდილოეთით`
// honest — if the `და` split or `წადი` go-verb regressed, this fails.
describe('Phase-2 ka-input landing examples parse on Zork I', () => {
  it('every clause is a direction or a ka lexicon command', () => {
    for (const example of LANDING_EXAMPLES_KA_INPUT) {
      for (const clause of splitClauses(example)) {
        const ok =
          parseDirection(clause, ZORK1_VOCAB.movement) !== null ||
          parseLexicon(clause, KA_CORE, KA_ZORK1, ZORK1_VOCAB, EMPTY_SCENE)
            .kind === 'command'
        expect(ok, `"${clause}" in "${example}"`).toBe(true)
      }
    }
  })
})
