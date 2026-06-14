// (signature, language) → corpus, mirroring the lexicon registry
// (src/llm/lexicon/index.ts). null means the output-translation hook is a
// pure passthrough (spec §3) — en/off always, and any uncovered game/language.
import type { NlLanguage } from '../../llm/types'
import type { TranslationCorpus } from '../types'
import { ZORK1_SIG } from '../../llm/grammar/index'
import { ZORK1_FR } from './zork1.fr'

const CORPORA: Readonly<
  Record<string, Partial<Record<string, TranslationCorpus>>>
> = {
  [ZORK1_SIG]: { fr: ZORK1_FR },
}

export function corpusFor(
  signature: string,
  language: NlLanguage,
): TranslationCorpus | null {
  if (language === 'en' || language === 'off') return null
  return CORPORA[signature]?.[language] ?? null
}
