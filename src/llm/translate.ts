// src/llm/translate.ts
import type { TranslateResult } from './types'
import type { Scene } from './scene/types'
import type { Vocab } from './grammar/types'
import { META_COMMANDS } from './meta'
import type { CoreLexicon } from './lexicon/types'
import { fold } from './lexicon/fold'

/**
 * The abstain sentinel: the model emits `{"verb":"__UNKNOWN__"}` (and the grammar
 * allows it) when no canonical command expresses the player's English, or when a
 * pronoun's antecedent is ambiguous. Single source of truth shared by the engines,
 * buildGrammar, and parseCommand.
 */
export const ABSTAIN = '__UNKNOWN__'

/**
 * Split a compound instruction into ordered clauses. Separators are the
 * sequential words `and`/`then` (en), `et`/`puis`/`ensuite` (fr), `und` (de),
 * `y` (es) — each surrounded by whitespace so substrings like "sand"/"under"/
 * "xyzzy" never trip it — and the sentence punctuation `.`/`;`. The de/es words
 * match the languages directions.ts/meta.ts cover (review C3). Commas are NOT
 * separators (locked decision 1). A single clause (no separator) returns a
 * length-1 array — the caller treats that as "not compound" and uses the
 * existing single-command path. Pure, total, vocab-free.
 */
export function splitClauses(english: string): string[] {
  return english
    .split(/\s+(?:and|then|et|puis|ensuite|und|y)\s+|\s*[.;]\s*/i)
    .map(clause => clause.trim())
    .filter(clause => clause.length > 0)
}

// Z-machine meta-verbs that are not in-world actions: they have no canonical
// game-command translation and must bypass the model entirely (sent raw to the
// interpreter). The list is the shared source in ./meta so the vocab generator
// subtracts exactly this set from verbsOnly. Match only the BARE verb so a real
// intent like "save the egg" still reaches the translator.
const META = new Set(META_COMMANDS)

/** Shared bare-command normalization: trim + lowercase + strip trailing `!.?`
 * so "SAVE." matches "save" (review S2 — was duplicated per matcher). */
function normalizeBareCommand(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[!.?]+$/, '')
}

/** True when the raw English is a bare Z-machine meta-command (restart, save…)
 * or a $-/#-prefixed debug command ($verify, #command). The latter are dropped
 * from the grammar by the vocab generator, so they have no emittable translation
 * and must be sent raw to the interpreter (UAT F6). */
export function isMetaCommand(english: string): boolean {
  const norm = normalizeBareCommand(english)
  if (/^[$#]/.test(norm)) return true
  return META.has(norm)
}

/**
 * Map a localized command word (e.g. French "inventaire") to the English the
 * interpreter understands, via the ACTIVE language's core lexicon (spec §5.1 —
 * supersedes the META_ALIASES seed, whose entries now live in each core's
 * metaAliases). Bare-word match only, diacritic-folded, so a real intent
 * ("inventaire de la maison") still reaches the translator. No core (language
 * en/off) → null.
 */
export function metaAlias(
  english: string,
  core: CoreLexicon | null,
): string | null {
  if (!core) return null
  const norm = fold(normalizeBareCommand(english))
  if (norm.includes(' ')) return null
  return core.metaAliases[norm] ?? null
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

/** Lowercased surface words (canonical tokens + synonyms) of every vocab noun the
 * command references — used to decide whether an absence phrase is ABOUT the thing
 * the clause acted on. */
function commandObjectWords(command: string, vocab: Vocab): Set<string> {
  const tokens = new Set(command.toLowerCase().split(/\s+/).filter(Boolean))
  const out = new Set<string>(tokens)
  for (const n of vocab.nouns) {
    const words = [
      ...n.canonical.toLowerCase().split(/\s+/),
      ...(n.synonyms?.map(s => s.toLowerCase()) ?? []),
    ]
    if (words.some(w => tokens.has(w))) for (const w of words) out.add(w)
  }
  return out
}

/** Lowercased surface words of every vocab noun (canonical tokens + synonyms). */
function nounSurfaceWords(vocab: Vocab): Set<string> {
  const out = new Set<string>()
  for (const n of vocab.nouns) {
    for (const w of n.canonical.toLowerCase().split(/\s+/)) out.add(w)
    for (const s of n.synonyms ?? [])
      for (const w of s.toLowerCase().split(/\s+/)) out.add(w)
  }
  return out
}

/**
 * True when the output contains an in-game refusal (`failurePat`) ABOUT the
 * acted object. Without a command the check is blanket. With one, a refusal
 * counts only when its SENTENCE either names the acted object or names no vocab
 * noun at all — a pronoun refusal ("It is already open.") attributes to the
 * acted object, but a refusal about an unrelated object must not register
 * against a clause whose own action succeeded (review C8; the same asymmetry
 * the F2/R3 absence scoping fixed). Shared with the scene tracker's antecedent
 * gate so both sites agree on what "this clause failed" means.
 */
export function refusalApplies(
  recentOutput: string,
  vocab: Vocab,
  command?: string,
): boolean {
  const pat = vocab.failurePat
  if (!pat) return false
  if (!command) return pat.test(recentOutput)
  const relevant = commandObjectWords(command, vocab)
  const nouns = nounSurfaceWords(vocab)
  for (const sentence of recentOutput.split(/[.!?\n]+/)) {
    if (!pat.test(sentence)) continue
    const words = sentence
      .toLowerCase()
      .split(/[^a-z']+/)
      .filter(Boolean)
    const named = words.filter(w => nouns.has(w))
    if (named.length === 0) return true // pronoun refusal → about the acted object
    if (named.some(w => relevant.has(w))) return true
  }
  return false
}

/**
 * True when a clause's turn output signals an in-game no-op/refusal (`failurePat`,
 * e.g. "It is already open.") or an absence (`absencePat`, e.g. "You can't see any
 * grue here."). Used to STOP a compound sequence after a clause that didn't take
 * effect (locked decision 3). `absencePat` is a global regex, so a fresh instance
 * is built per call — `.test()` on the shared one is stateful (mirrors
 * tracker.ts's suppressed()).
 *
 * When `command` is given, an absence/refusal only counts if it is ABOUT the
 * object the clause acted on — otherwise narrative "No X" text (e.g. the leaflet
 * body's "No computer should be without one!") or a refusal aimed at another
 * object falsely truncates the sequence (UAT F2/R3; review C8).
 */
export function clauseFailed(
  recentOutput: string,
  vocab: Vocab,
  command?: string,
): boolean {
  if (refusalApplies(recentOutput, vocab, command)) return true
  const absence = new RegExp(vocab.absencePat.source, vocab.absencePat.flags)
  if (!command) return absence.test(recentOutput)
  const relevant = commandObjectWords(command, vocab)
  let m: RegExpExecArray | null
  while ((m = absence.exec(recentOutput)) !== null) {
    // The capture is a short phrase ("small mailbox here") so an adjective-
    // prefixed absence still reaches its noun (C6): the absence is about the
    // acted object iff ANY captured word names it.
    const phrase = (m.slice(1).find(g => g !== undefined) ?? '').toLowerCase()
    if (phrase.split(/\s+/).some(w => relevant.has(w))) return true
    if (m.index === absence.lastIndex) absence.lastIndex++ // zero-width guard
  }
  return false
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

  // Classify by the SHAPE the model emitted, gated by list membership — NOT
  // first-list-wins. 25 real Zork I verbs (open, take, drop, read…) are in BOTH
  // verbs1 and verbs2; branching on membership order silently rejected every
  // valid two-object command for them ("open door with key") (review C1).
  if (prep !== undefined || indirect !== undefined) {
    if (!is2) return { kind: 'abstain' }
    if (object === undefined || prep === undefined || indirect === undefined)
      return { kind: 'abstain' }
    if (!inScope.has(object) || !inScope.has(indirect))
      return { kind: 'abstain' }
    if (!vocab.preps.includes(prep)) return { kind: 'abstain' }
    return { kind: 'command', text: `${verb} ${object} ${prep} ${indirect}` }
  }
  if (object !== undefined) {
    if (!is1) return { kind: 'abstain' }
    if (!inScope.has(object)) return { kind: 'abstain' }
    return { kind: 'command', text: `${verb} ${object}` }
  }
  if (!isOnly) return { kind: 'abstain' }
  return { kind: 'command', text: verb }
}
