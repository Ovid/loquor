// src/llm/grammar/buildGrammar.ts
import type { Vocab } from './types'
import type { Scene } from '../scene/types'
import { ABSTAIN } from '../translate'

// GBNF terminal for the JSON string "s" — e.g. q('take') === `"\"take\""`.
const q = (s: string): string => `"\\"${s}\\""`
const alt = (xs: string[]): string => xs.map(q).join(' | ')

// Literal GBNF terminals for the JSON scaffolding.
const OPEN = '"{\\"verb\\":"'
const OBJ = '",\\"object\\":"'
const PREP = '",\\"prep\\":"'
const IND = '",\\"indirect\\":"'
const CLOSE = '"}"'
const ABSTAIN_TERM = `"{\\"verb\\":\\"${ABSTAIN}\\"}"`

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
  if (hasV2) lines.push(`verb2cmd ::= ${OPEN} v2 ${OBJ} noun ${PREP} prep ${IND} noun ${CLOSE}`)
  lines.push(`vonly ::= ${alt([...vocab.verbsOnly, ...vocab.movement])}`)
  if (hasNouns) lines.push(`v1 ::= ${alt(vocab.verbs1)}`)
  if (hasV2) lines.push(`v2 ::= ${alt(vocab.verbs2)}`)
  if (hasNouns) lines.push(`prep ::= ${alt(vocab.preps)}`)
  if (hasNouns) lines.push(`noun ::= ${alt(nouns)}`)
  return lines.join('\n')
}
