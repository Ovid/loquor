// Validated localStorage persistence for the NL language picker + "declined".
// Mirrors src/ui/useTheme.ts (read-validate-fallback, swallow write errors).
import type { NlLanguage } from './types'

const KEY = 'loquor.nl'
const LANGUAGES: readonly NlLanguage[] = ['off', 'en', 'fr', 'de', 'es']

export interface NlPref {
  language: NlLanguage
  declined: boolean
}
const DEFAULT: NlPref = { language: 'off', declined: false }

export function readNlPref(store: Storage = localStorage): NlPref {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const declined =
      typeof parsed.declined === 'boolean' ? parsed.declined : false
    if (LANGUAGES.includes(parsed.language as NlLanguage))
      return { language: parsed.language as NlLanguage, declined }
    // Legacy v1 shape { enabled, declined }: enabled:true means the player was
    // typing SOMETHING the model translated — English is the only safe mapping.
    if (typeof parsed.enabled === 'boolean')
      return { language: parsed.enabled ? 'en' : 'off', declined }
    return { ...DEFAULT, declined }
  } catch (err) {
    // Corrupt JSON falls back to DEFAULT — but say so, because a silent fallback
    // means a subsequent partial writeNlPref() resets the other field with no
    // signal (review I5). A diagnostic makes that data reset debuggable.
    console.warn('readNlPref: ignoring unreadable stored prefs', err)
    return DEFAULT
  }
}

export function writeNlPref(
  patch: Partial<NlPref>,
  store: Storage = localStorage,
): void {
  try {
    store.setItem(KEY, JSON.stringify({ ...readNlPref(store), ...patch }))
  } catch {
    // Private mode / quota — persistence is best-effort, never fatal.
  }
}
