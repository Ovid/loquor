// (signature, language) → corpus, mirroring the lexicon registry
// (src/llm/lexicon/index.ts). null means the output-translation hook is a
// pure passthrough (spec §3) — en/off always, and any uncovered game/language.
import type { NlLanguage } from '../../llm/types'
import { INPUT_LEX_LANGS, LEX_LANGS } from '../../llm/lexicon/types'
import type { TranslationCorpus } from '../types'
import { ZORK1_SIG } from '../../llm/grammar/index'
import { ZORK1_FR } from './zork1.fr'
import { ZORK1_ES } from './zork1.es'
import { ZORK1_DE } from './zork1.de'
import { ZORK1_KA } from './zork1.ka'

/** Languages whose output is corpus-only: a miss degrades to English and is
 *  logged, never sent to the LLM fallback. Georgian — the small WebLLM models
 *  cannot produce correct Georgian, so a fallback would emit garbage (spec §3).
 *
 *  DERIVED (F-a) from the lexicon membership arrays, the SAME source as
 *  OUTPUT_ONLY_LANGS, because today "has no LLM" is a single property (a model
 *  that can't produce a language for OUTPUT also can't parse it for INPUT). Kept
 *  as a SEPARATE export — distinct output-layer job, distinct consumers — so if
 *  that coincidence ever breaks (an input-only or output-only-with-LLM language)
 *  this one line diverges without touching the input set. The coherence test in
 *  llm/types.test.ts pins the current equality and the ⊆ OUTPUT_ONLY invariant. */
export const CORPUS_ONLY_LANGS: ReadonlySet<NlLanguage> = new Set(
  INPUT_LEX_LANGS.filter(l => !(LEX_LANGS as readonly string[]).includes(l)),
)

const CORPORA: Readonly<
  Record<string, Partial<Record<string, TranslationCorpus>>>
> = {
  [ZORK1_SIG]: { fr: ZORK1_FR, es: ZORK1_ES, de: ZORK1_DE, ka: ZORK1_KA },
}

export function corpusFor(
  signature: string,
  language: NlLanguage,
): TranslationCorpus | null {
  if (language === 'en' || language === 'off') return null
  return CORPORA[signature]?.[language] ?? null
}

/** Every (code, corpus) covered for a signature — the single source of truth
 * the coverage + inventory gates iterate, so adding a language (spec §6) is
 * truly one CORPORA entry, not a duplicated list per gate (review S2). */
export function corporaFor(
  signature: string,
): { code: NlLanguage; corpus: TranslationCorpus }[] {
  return Object.entries(CORPORA[signature] ?? {}).map(([code, corpus]) => ({
    code: code as NlLanguage,
    corpus: corpus!,
  }))
}
