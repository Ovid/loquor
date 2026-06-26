import { OUTPUT_ONLY_LANGS } from '../llm/types'
import type { ActiveLanguage, NlState } from '../llm/types'
import { basicChip } from '../llm/notices'

// Localized words for the readout's active-input chip. Only en/fr/de/es reach
// this (ka is output-only and never has an input path), so no ka entry — the
// lang index is exact and needs no fallback. Mirrors the notices.ts byLang
// pattern. `grammar` reuses basicChip so the readout and the status-bar chip
// can't drift on the word for "basic mode".
const FULL: Record<'en' | 'fr' | 'de' | 'es', string> = {
  en: 'full',
  fr: 'complet',
  de: 'voll',
  es: 'completo',
}
const INPUT: Record<'en' | 'fr' | 'de' | 'es', string> = {
  en: 'input',
  fr: 'saisie',
  de: 'Eingabe',
  es: 'entrada',
}

/**
 * The display language the readout renders under, matching Terminal's `outLang`
 * (the only phase with a non-English display is `on`; every other phase plays in
 * English). Drives the `lang` attribute on the chip span (WCAG 3.1.2).
 */
export function readoutLang(state: NlState): ActiveLanguage {
  return state.phase === 'on' ? state.language : 'en'
}

/**
 * One-line, PLAYER-FACING summary of what the NL layer is currently doing, shown
 * in the always-present BottomBar. Localized for the active language (the bar is
 * read by every player, not just English ones — CLAUDE.md multilingual rule).
 *
 * Only the `on` phase localizes: off/disabled/downloading display in English (the
 * game text is English in those phases too), so their terse tokens stay English
 * and ride the `lang="en"` of the readout. `ka` (output-only) returns '' — no
 * chip — because authoring new/compact Georgian wording is out of scope (spec
 * Decision 6/§8) and the bar's Georgian beta/activation notices already convey
 * the read-Georgian / type-English mode; the story title carries the rest.
 */
export function nlModeSummary(state: NlState, llmEnabled = true): string {
  switch (state.phase) {
    case 'disabled':
      return 'no NL' // this game has no vocab — the picker never appears
    case 'off':
      return 'off'
    case 'downloading':
      return 'downloading…'
    case 'on': {
      if (OUTPUT_ONLY_LANGS.has(state.language)) return '' // ka: title-only
      const lang = state.language as 'en' | 'fr' | 'de' | 'es'
      // Feature hidden: no tier token / separator — the model concept is gone,
      // so report only what stays true (the localized input indicator).
      if (!llmEnabled) return INPUT[lang]
      const tier = state.model === 'grammar' ? basicChip(lang) : FULL[lang]
      return `${tier} · ${INPUT[lang]}`
    }
  }
}
