import type { ChatMessages, PromptContext, ViewState } from './types'

const CONTEXT_CAP = 1500

/** Derive the pure prompt context from the live ViewState (spec §3 contract). */
export function viewToContext(view: ViewState): PromptContext {
  const location = view.status?.location ?? ''

  // The current room/response block = everything after the last `input` line.
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
    'You translate a player\'s English into ONE canonical Zork command.',
    'Output exactly one command from the allowed grammar, lowercase, no quotes.',
    'If the input is not a game action you can express, output __UNKNOWN__.',
  ]
  if (ctx.location) lines.push(`Current location: ${ctx.location}`)
  if (ctx.recentOutput) lines.push(`Recent game text:\n${ctx.recentOutput}`)

  return [
    { role: 'system', content: lines.join('\n') },
    { role: 'user', content: english },
  ]
}
