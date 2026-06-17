// src/ui/languageOptions.ts
// Single source of truth for the language picker options, shared by the
// in-game status-bar picker (NlLanguagePicker) and the title-screen picker
// (Landing). `lang` marks each label's natural language so a screen reader
// voices "Français"/"Deutsch"/"Español" with the right pronunciation.
import type { NlLanguage } from '../llm/types'

export interface LanguageOption {
  value: NlLanguage
  label: string
  lang: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'off', label: 'Off', lang: 'en' },
  { value: 'en', label: 'English', lang: 'en' },
  { value: 'fr', label: 'Français', lang: 'fr' },
  { value: 'de', label: 'Deutsch', lang: 'de' },
  { value: 'es', label: 'Español', lang: 'es' },
  // Georgian (Phase 1: read-Georgian / type-English). The "(beta)" marker is
  // part of the visible label AND the accessible name (non-colour state cue,
  // WCAG 2.2 — spec §5); `lang: 'ka'` voices it with Georgian pronunciation.
  { value: 'ka', label: 'ქართული (beta)', lang: 'ka' },
]
