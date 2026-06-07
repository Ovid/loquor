// src/llm/prompt.ts
import type {
  ChatMessages,
  PromptContext,
  ViewContext,
  ViewState,
} from './types'

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

/** Assemble chat messages. Pure; the model is grammar-constrained downstream. */
export function buildPrompt(english: string, ctx: PromptContext): ChatMessages {
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
  // Raw recent game text is deliberately NOT included: it biased the verb (the
  // model echoed "open" from "Opening the mailbox…") and was a prompt-injection
  // surface (review S12). The scene tracker's in-scope list + antecedent above
  // supply the grounding the model actually needs.

  return [
    { role: 'system', content: lines.join('\n') },
    { role: 'user', content: english },
  ]
}
