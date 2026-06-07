// src/llm/translate.ts
import type { TranslateResult } from './types'
import type { Scene } from './scene/types'
import type { Vocab } from './grammar/types'

/**
 * The abstain sentinel: the model emits `{"verb":"__UNKNOWN__"}` (and the grammar
 * allows it) when no canonical command expresses the player's English, or when a
 * pronoun's antecedent is ambiguous. Single source of truth shared by the engines,
 * buildGrammar, and parseCommand.
 */
export const ABSTAIN = '__UNKNOWN__'

interface RawCmd {
  verb?: unknown
  object?: unknown
  prep?: unknown
  indirect?: unknown
}

/**
 * Validate the GBNF-guaranteed JSON command against the scene and serialize the
 * canonical command string. Pure + total. No pronoun resolution: under locked
 * decision 6 the model has already mapped pronouns to in-scope canonicals, so a
 * pronoun can never appear here.
 */
export function parseCommand(rawJson: string, scene: Scene, vocab: Vocab): TranslateResult {
  let cmd: RawCmd
  try {
    cmd = JSON.parse(rawJson.trim()) as RawCmd
  } catch {
    return { kind: 'abstain' }
  }
  if (!cmd || typeof cmd.verb !== 'string') return { kind: 'abstain' }
  const verb = cmd.verb
  if (verb === ABSTAIN) return { kind: 'abstain' }

  const object = typeof cmd.object === 'string' ? cmd.object : undefined
  const prep = typeof cmd.prep === 'string' ? cmd.prep : undefined
  const indirect = typeof cmd.indirect === 'string' ? cmd.indirect : undefined
  const inScope = new Set(scene.inScope.map(o => o.canonical))

  const isOnly = vocab.verbsOnly.includes(verb) || vocab.movement.includes(verb)
  const is1 = vocab.verbs1.includes(verb)
  const is2 = vocab.verbs2.includes(verb)
  if (!isOnly && !is1 && !is2) return { kind: 'abstain' }

  if (isOnly) {
    if (object !== undefined || prep !== undefined || indirect !== undefined) return { kind: 'abstain' }
    return { kind: 'command', text: verb }
  }
  if (is1) {
    if (object === undefined || prep !== undefined || indirect !== undefined) return { kind: 'abstain' }
    if (!inScope.has(object)) return { kind: 'abstain' }
    return { kind: 'command', text: `${verb} ${object}` }
  }
  // is2
  if (object === undefined || prep === undefined || indirect === undefined) return { kind: 'abstain' }
  if (!inScope.has(object) || !inScope.has(indirect)) return { kind: 'abstain' }
  if (!vocab.preps.includes(prep)) return { kind: 'abstain' }
  return { kind: 'command', text: `${verb} ${object} ${prep} ${indirect}` }
}
