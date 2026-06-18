// src/llm/prompt.ts
import type {
  ActiveLanguage,
  ChatMessages,
  PromptContext,
  ViewContext,
  ViewState,
} from './types'
import type { Vocab } from './grammar/types'
import { PROMPT_CONTEXT_CAP as CONTEXT_CAP } from './config'

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

// Few-shots per language (spec §7): a drop-verb (the F-M/F-Q inverse-verb
// trap), a two-object "X avec Y" ordering (UAT F7), and a pronoun. Assistant
// turns are EXACTLY the JSON the grammar produces, validated against
// parseCommand(·, ZORK1_VOCAB) in prompt.test.ts — so nouns are Zork I EMIT
// forms (e.g. 'advertisement', not the canonical 'leaflet'). For other games
// they are guidance only; the grammar gates validity.
// Partial because not every ActiveLanguage has an input path. Georgian (ka) is
// read-Georgian / type-English in Phase 1: it raw-sends English and never reaches
// the input LLM, so authoring ka few-shots would be dead AND misleading. The call
// site falls back to the en few-shots for any language without its own entry.
const FEWSHOTS: { en: ChatMessages } & Partial<
  Record<ActiveLanguage, ChatMessages>
> = {
  en: [
    { role: 'user', content: 'put the sword down' },
    { role: 'assistant', content: '{"verb":"drop","object":"sword"}' },
    { role: 'user', content: 'kill the troll with my sword' },
    {
      role: 'assistant',
      content:
        '{"verb":"attack","object":"troll","prep":"with","indirect":"sword"}',
    },
    // EN pronouns ALWAYS reach the LLM (stage 4 rejects 'it'), so the pronoun
    // few-shot matters most here (spec §7: drop-verb, two-object, pronoun).
    { role: 'user', content: 'take it' },
    { role: 'assistant', content: '{"verb":"take","object":"advertisement"}' },
  ],
  fr: [
    { role: 'user', content: 'pose l’épée' },
    { role: 'assistant', content: '{"verb":"drop","object":"sword"}' },
    { role: 'user', content: 'tue le troll avec l’épée' },
    {
      role: 'assistant',
      content:
        '{"verb":"attack","object":"troll","prep":"with","indirect":"sword"}',
    },
    { role: 'user', content: 'prends-le' },
    { role: 'assistant', content: '{"verb":"take","object":"advertisement"}' },
  ],
  de: [
    { role: 'user', content: 'lass das Schwert fallen' },
    { role: 'assistant', content: '{"verb":"drop","object":"sword"}' },
    { role: 'user', content: 'töte den Troll mit dem Schwert' },
    {
      role: 'assistant',
      content:
        '{"verb":"attack","object":"troll","prep":"with","indirect":"sword"}',
    },
    { role: 'user', content: 'nimm ihn' },
    { role: 'assistant', content: '{"verb":"take","object":"advertisement"}' },
  ],
  es: [
    { role: 'user', content: 'suelta la espada' },
    { role: 'assistant', content: '{"verb":"drop","object":"sword"}' },
    { role: 'user', content: 'mata al trol con la espada' },
    {
      role: 'assistant',
      content:
        '{"verb":"attack","object":"troll","prep":"with","indirect":"sword"}',
    },
    { role: 'user', content: 'tómalo' },
    { role: 'assistant', content: '{"verb":"take","object":"advertisement"}' },
  ],
}

/** Assemble chat messages. Pure; the model is grammar-constrained downstream. */
export function buildPrompt(
  english: string,
  ctx: PromptContext,
  vocab: Vocab,
  language: ActiveLanguage,
): ChatMessages {
  const lines = [
    "You translate the player's input into ONE canonical Zork command, as JSON.",
    'Output exactly one single-line JSON object: {"verb":...} with optional "object", "prep", "indirect" — nothing else.',
    // NL v2 §7: translate LITERALLY — never re-plan. The model was substituting
    // "better" actions for the player's stated one.
    "Translate the player's LITERAL imperative. Never substitute a different action. Never infer what the player 'should' do next.",
    // Targets the observed failure mode: the model was replacing the player's verb
    // (e.g. "take it" → "open mailbox"). Keep the verb; only the pronoun moves.
    'Keep the player’s OWN verb — never swap it for a different action. Only resolve a pronoun ("it"/"them"/"le"/"la"/"ihn"/"lo") to the canonical name of the most-recently-mentioned object, and put that NAME in the object slot (never a literal pronoun).',
    'If you cannot tell which object a pronoun means, if the verb you need is not in the allowed list, or the input is not a game action you can express, output {"verb":"__UNKNOWN__"}.',
  ]
  if (ctx.location) lines.push(`Current location: ${ctx.location}`)
  // Hints arrive as CANONICAL names (scene tracker keys), but the grammar only
  // accepts EMIT forms — so hints must name objects the model can actually
  // output (the canonical 'leaflet' is unproducible; the hint must say
  // 'advertisement'). Fall back to the raw string when no noun matches.
  const toEmit = (name: string): string =>
    vocab.nouns.find(n => n.canonical === name)?.emit ?? name
  // NL v2 §7: scope is a HINT, never a constraint — the grammar is full-vocab
  // (Task 15), so the model may name any game object the player did.
  if (ctx.inScope.length)
    lines.push(
      `Objects present or carried (a hint — other objects exist too): ${ctx.inScope.map(toEmit).join(', ')}`,
    )
  if (ctx.antecedent)
    lines.push(
      `Most recently mentioned (resolve pronouns to this): ${toEmit(ctx.antecedent)}`,
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
  // surface (review S12, NL v2 §7). The scene tracker's in-scope list + antecedent above
  // supply the grounding the model actually needs. Note: the status-line
  // `location` above IS game-derived text (short, but raw), so the injection
  // mitigation is partial — acceptable because story files are trusted/vendored
  // (review S8); drop `location` too if untrusted stories are ever loaded.

  // Few-shot pairs in the player's language, then the live input LAST (§7).
  return [
    { role: 'system', content: lines.join('\n') },
    // ka has no input path in Phase 1, so it falls back to the en few-shots
    // (never actually invoked — ka raw-sends English upstream).
    ...(FEWSHOTS[language] ?? FEWSHOTS.en),
    { role: 'user', content: english },
  ]
}
