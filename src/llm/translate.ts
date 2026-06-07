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

/**
 * Split a compound English/French instruction into ordered clauses. Separators are
 * the sequential words `and`/`then`/`et`/`puis`/`ensuite` (each surrounded by
 * whitespace so substrings like "sand"/"strengthen" never trip it) and the
 * sentence punctuation `.`/`;`. Commas are NOT separators (locked decision 1). A
 * single clause (no separator) returns a length-1 array — the caller treats that
 * as "not compound" and uses the existing single-command path. Pure, total,
 * vocab-free.
 */
export function splitClauses(english: string): string[] {
  return english
    .split(/\s+(?:and|then|et|puis|ensuite)\s+|\s*[.;]\s*/i)
    .map(clause => clause.trim())
    .filter(clause => clause.length > 0)
}

// Z-machine meta-verbs that are not in-world actions: they have no canonical
// game-command translation and must bypass the model entirely (sent raw to the
// interpreter). Without this, the 1.5B model — reluctant to abstain — translates
// "restart" into a plausible-but-wrong action like "open door" (systematic-
// debugging). Match only the BARE verb so a real intent like "save the egg"
// still reaches the translator.
const META_COMMANDS = new Set([
  'restart',
  'save',
  'restore',
  'quit',
  'version',
  'script',
  'unscript',
  'verbose',
  'brief',
  'superbrief',
  'diagnose',
  'score',
])

/** True when the raw English is a bare Z-machine meta-command (restart, save…). */
export function isMetaCommand(english: string): boolean {
  const norm = english
    .trim()
    .toLowerCase()
    .replace(/[!.?]+$/, '')
  return META_COMMANDS.has(norm)
}

// The interpreter's yes/no confirmation prompts (restart, quit, restore-overwrite)
// are read as ordinary LINE input — there is no engine-level flag distinguishing
// them from the main command prompt. When the recent output is such a prompt, the
// player's reply ("Y") is an answer to the game, NOT English to translate: the
// model would turn "Y" into a bogus command (observed: "Y" → "look"), so the
// restart could never confirm. Detect the prompt from its text and pass raw.
const CONFIRM_PROMPT =
  /\(Y is affirmative\)|\bare you sure\b|\bdo you (?:really )?wish to\b/i

/** True when the recent game output is an interpreter yes/no confirmation prompt. */
export function isConfirmationPrompt(recentOutput: string): boolean {
  return CONFIRM_PROMPT.test(recentOutput)
}

// The parser's disambiguation question ("Which door do you mean, the wooden door
// or the trap door?") is also a LINE read: the player's reply ("wooden door") is
// a noun-phrase the game pairs with the pending verb, NOT a fresh command. Sent
// through the model it would be mistranslated; pass it raw so Zork resolves it.
// Requires both "which" and "do you mean" so ordinary prose ("…which you read…")
// can't trip it.
const DISAMBIGUATION_PROMPT = /\bwhich\b[\s\S]*\bdo you mean\b/i

/** True when the recent game output is a parser disambiguation question. */
export function isDisambiguationPrompt(recentOutput: string): boolean {
  return DISAMBIGUATION_PROMPT.test(recentOutput)
}

/**
 * True when a clause's turn output signals an in-game no-op/refusal (`failurePat`,
 * e.g. "It is already open.") or an absence (`absencePat`, e.g. "You can't see any
 * grue here."). Used to STOP a compound sequence after a clause that didn't take
 * effect (locked decision 3). `absencePat` is a global regex, so a fresh instance
 * is built per call — `.test()` on the shared one is stateful (mirrors
 * tracker.ts's suppressed()).
 */
export function clauseFailed(recentOutput: string, vocab: Vocab): boolean {
  if (vocab.failurePat?.test(recentOutput)) return true
  const absence = new RegExp(vocab.absencePat.source, vocab.absencePat.flags)
  return absence.test(recentOutput)
}

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
export function parseCommand(
  rawJson: string,
  scene: Scene,
  vocab: Vocab,
): TranslateResult {
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
    if (object !== undefined || prep !== undefined || indirect !== undefined)
      return { kind: 'abstain' }
    return { kind: 'command', text: verb }
  }
  if (is1) {
    if (object === undefined || prep !== undefined || indirect !== undefined)
      return { kind: 'abstain' }
    if (!inScope.has(object)) return { kind: 'abstain' }
    return { kind: 'command', text: `${verb} ${object}` }
  }
  // is2
  if (object === undefined || prep === undefined || indirect === undefined)
    return { kind: 'abstain' }
  if (!inScope.has(object) || !inScope.has(indirect)) return { kind: 'abstain' }
  if (!vocab.preps.includes(prep)) return { kind: 'abstain' }
  return { kind: 'command', text: `${verb} ${object} ${prep} ${indirect}` }
}
