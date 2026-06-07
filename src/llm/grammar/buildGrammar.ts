// src/llm/grammar/buildGrammar.ts
import type { Vocab } from './types'
import type { Scene } from '../scene/types'
import { ABSTAIN } from '../translate'

// XGrammar's EBNF parser (W3C XML notation; see web-llm's Grammar.fromEBNF doc)
// only accepts C-style unicode escapes (\uXXXX) inside a "..." string literal —
// a literal " or a \" escape is rejected and makes fromEBNF throw, which the hook
// surfaces to the player as "Translation failed — sent as typed." So every JSON
// double-quote the model must emit is written as the " unicode escape.
const DQ = '\\u0022' // the JSON " character, encoded for an XGrammar EBNF literal

// EBNF terminal matching the JSON string "s" — e.g. q('take') matches `"take"`.
const q = (s: string): string => `"${DQ}${s}${DQ}"`
const alt = (xs: string[]): string => xs.map(q).join(' | ')

// Literal EBNF terminals for the JSON scaffolding (matches `{"verb":`, etc.).
const OPEN = `"{${DQ}verb${DQ}:"`
const OBJ = `",${DQ}object${DQ}:"`
const PREP = `",${DQ}prep${DQ}:"`
const IND = `",${DQ}indirect${DQ}:"`
const CLOSE = '"}"'
const ABSTAIN_TERM = `"{${DQ}verb${DQ}:${DQ}${ABSTAIN}${DQ}}"`

/**
 * Build a JSON-shaped GBNF for this turn. The `noun` production is filled from
 * `scene.inScope` (canonicals only — no pronoun terminal; the model resolves
 * pronouns itself per locked decision 6). When scope is empty, only verb-only /
 * movement / abstain are producible, so the model cannot invent an object.
 */
export function buildGrammar(vocab: Vocab, scene: Scene): string {
  const nouns = scene.inScope.map(o => o.canonical)
  const hasNouns = nouns.length > 0
  const hasV2 = hasNouns && vocab.verbs2.length > 0

  const commandAlts = ['verbonly']
  if (hasNouns) commandAlts.push('verb1cmd')
  if (hasV2) commandAlts.push('verb2cmd')

  const lines: string[] = []
  lines.push('root ::= command | abstain')
  lines.push(`command ::= ${commandAlts.join(' | ')}`)
  lines.push(`abstain ::= ${ABSTAIN_TERM}`)
  lines.push(`verbonly ::= ${OPEN} vonly ${CLOSE}`)
  if (hasNouns) lines.push(`verb1cmd ::= ${OPEN} v1 ${OBJ} noun ${CLOSE}`)
  if (hasV2)
    lines.push(
      `verb2cmd ::= ${OPEN} v2 ${OBJ} noun ${PREP} prep ${IND} noun ${CLOSE}`,
    )
  lines.push(`vonly ::= ${alt([...vocab.verbsOnly, ...vocab.movement])}`)
  if (hasNouns) lines.push(`v1 ::= ${alt(vocab.verbs1)}`)
  if (hasV2) lines.push(`v2 ::= ${alt(vocab.verbs2)}`)
  if (hasNouns) lines.push(`prep ::= ${alt(vocab.preps)}`)
  if (hasNouns) lines.push(`noun ::= ${alt(nouns)}`)
  return lines.join('\n')
}
