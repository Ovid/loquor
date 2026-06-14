// Literal-translation prompt for the rare output fallback (spec §6) — same
// philosophy as the input layer's literal prompt: translate exactly, no
// commentary, no invented state. Plain-text generation (grammar: null).
// Accepted injection surface (spec §6): game lines can quote player-typed
// tokens; the prompt invites no action and the result renders as a plain
// React text node, so the worst case is a weird cached translation.
import type { ChatMessages } from '../llm/types'
import type { LexLang } from '../llm/lexicon/types'

const TARGET: Readonly<Record<LexLang, string>> = {
  fr: 'French',
  de: 'German',
  es: 'Spanish',
}

const SHIMMER: Readonly<Record<LexLang, string>> = {
  fr: '…traduction',
  de: '…Übersetzung',
  es: '…traducción',
}

export function shimmerLabel(lang: LexLang): string {
  return SHIMMER[lang]
}

export function xlPrompt(line: string, lang: LexLang): ChatMessages {
  return [
    {
      role: 'system',
      content:
        `You translate output text from the classic text adventure game Zork ` +
        `into ${TARGET[lang]}. Translate the line exactly and literally. Keep ` +
        `the punctuation and capitalization style. Use the formal second person. ` +
        `Do not add commentary, do not answer questions, do not invent game ` +
        `state. Output only the translation.`,
    },
    { role: 'user', content: line },
  ]
}
