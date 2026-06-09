// src/llm/prompt.ts
import type {
  ChatMessages,
  PromptContext,
  ViewContext,
  ViewState,
} from './types'
import type { Vocab } from './grammar/types'

const CONTEXT_CAP = 1500

/** Derive the pure view context from the live ViewState (location + recent output). */
export function viewToContext(view: ViewState): ViewContext {
  const location = view.status?.location ?? ''

  let start = 0
  for (let i = view.lines.length - 1; i >= 0; i--) {
    if (view.lines[i].kind === 'input') {
      start = i + 1
      break
    }
  }
  const block = view.lines
    .slice(start)
    .filter(l => l.kind !== 'nl-source')
    .map(l => l.text)
    .join('\n')
  const recentOutput =
    block.length > CONTEXT_CAP ? block.slice(-CONTEXT_CAP) : block

  return { location, recentOutput }
}

// Common-verb core for PROMPT GUIDANCE only. buildGrammar still enforces the FULL
// extracted verb set (validity) — this list just steers the 1.5B model without
// dumping ~130 verbs into every prompt. Any grammar-valid verb is still emittable;
// the prompt is guidance, the grammar is the gate. Filtered against the game's
// vocab so we never advertise a verb the grammar can't produce.
const PROMPT_VERB_CORE = [
  'look',
  'examine',
  'read',
  'take',
  'drop',
  'open',
  'close',
  'move',
  'push',
  'pull',
  'turn on',
  'turn off',
  'put',
  'give',
  'unlock',
  'lock',
  'attack',
  'kill',
  'throw',
  'eat',
  'drink',
  'enter',
  'exit',
  'wait',
  'inventory',
  'light',
  'burn',
  'tie',
  'climb',
]

/** Assemble chat messages. Pure; the model is grammar-constrained downstream. */
export function buildPrompt(
  english: string,
  ctx: PromptContext,
  vocab: Vocab,
): ChatMessages {
  const lines = [
    "You translate a player's English into ONE canonical Zork command, as JSON.",
    'Output exactly one single-line JSON object: {"verb":...} with optional "object", "prep", "indirect" — nothing else.',
    'Use only the verbs, prepositions, and in-scope objects you are given.',
    // Targets the observed failure mode: the model was replacing the player's verb
    // (e.g. "take it" → "open mailbox"). Keep the verb; only the pronoun moves.
    'Keep the player’s OWN verb — never swap it for a different action. Only resolve a pronoun ("it"/"them"/"le"/"la") to the canonical name of the most-recently-mentioned object, and put that NAME in the object slot (never a literal pronoun).',
    'Example: most recently mentioned = leaflet, player says "take it" → {"verb":"take","object":"leaflet"} (NOT "open leaflet").',
    'If you cannot tell which object a pronoun means, if the verb you need is not in the allowed list, or the input is not a game action you can express, output {"verb":"__UNKNOWN__"}.',
  ]
  if (ctx.location) lines.push(`Current location: ${ctx.location}`)
  if (ctx.inScope.length)
    lines.push(
      `In scope (you may only name these objects): ${ctx.inScope.join(', ')}`,
    )
  else
    lines.push(
      'No objects are in scope; only movement or verb-only commands are possible.',
    )
  if (ctx.antecedent)
    lines.push(
      `Most recently mentioned (resolve "it"/"them" to this): ${ctx.antecedent}`,
    )
  // Movement & verb guidance (H1 fix). The prompt above lists in-scope OBJECTS but,
  // without this, never the verbs or the directions — so the model mapped "go"/"allez"
  // onto the transitive verb "move", and the grammar then forced an in-scope object
  // ("go south" → "move door"). Naming the directions as verb-only commands, listing
  // the verbs, and stating that "move" is not travel fixed every movement case on the
  // quantized 1.5B model in the H1/H2 experiment. Built from vocab so Zork II/III
  // inherit the same guidance.
  const allVerbs = new Set([
    ...vocab.verbsOnly,
    ...vocab.verbs1,
    ...vocab.verbs2,
  ])
  const promptVerbs = PROMPT_VERB_CORE.filter(v => allVerbs.has(v))
  lines.push(
    'MOVEMENT: a direction IS the verb, with NO object. "go south" / "allez au sud" / "head east" / "vers l’est" → {"verb":"south"} or {"verb":"east"}.',
    `Available directions: ${vocab.movement.join(', ')}.`,
    `Allowed action verbs (use ONLY these for actions): ${promptVerbs.join(', ')}.`,
    'Never use "move" to change rooms — "move" only means physically shoving an in-scope object (e.g. "move rug"). To travel, emit the direction itself as the verb.',
  )
  // Raw recent OUTPUT text is deliberately NOT included: it biased the verb (the
  // model echoed "open" from "Opening the mailbox…") and was a prompt-injection
  // surface (review S12). The scene tracker's in-scope list + antecedent above
  // supply the grounding the model actually needs. Note: the status-line
  // `location` above IS game-derived text (short, but raw), so the injection
  // mitigation is partial — acceptable because story files are trusted/vendored
  // (review S8); drop `location` too if untrusted stories are ever loaded.

  return [
    { role: 'system', content: lines.join('\n') },
    { role: 'user', content: english },
  ]
}
