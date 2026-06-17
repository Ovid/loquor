// Validated localStorage persistence for the NL language picker + "declined".
// Mirrors src/ui/useTheme.ts (read-validate-fallback, swallow write errors).
import { isNlLanguage, type NlLanguage } from './types'
import { createLogger } from '../logger'
import { LS_KEYS } from '../storageKeys'

const log = createLogger('nl')

const KEY = LS_KEYS.nlPref

export interface NlPref {
  language: NlLanguage
  declined: boolean
}
const DEFAULT: NlPref = { language: 'off', declined: false }

export function readNlPref(store?: Storage): NlPref {
  try {
    // [K] Resolve the store INSIDE the try: with "block all cookies" Chrome's
    // window.localStorage getter itself throws SecurityError, and a default
    // parameter evaluates before the body's try is entered — the throw
    // escaped to callers (misreporting a successful download as a failure).
    const raw = (store ?? localStorage).getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const declined =
      typeof parsed.declined === 'boolean' ? parsed.declined : false
    if (isNlLanguage(parsed.language))
      return { language: parsed.language, declined }
    // Legacy v1 shape { enabled, declined }: enabled:true means the player was
    // typing SOMETHING the model translated — English is the only safe mapping.
    if (typeof parsed.enabled === 'boolean')
      return { language: parsed.enabled ? 'en' : 'off', declined }
    return { ...DEFAULT, declined }
  } catch (err) {
    // Corrupt JSON falls back to DEFAULT — but say so, because a silent fallback
    // means a subsequent partial writeNlPref() resets the other field with no
    // signal (review I5). A diagnostic makes that data reset debuggable.
    log.warn('ignoring unreadable stored prefs', err)
    return DEFAULT
  }
}

/** True only when an Off (NL-disabled) choice was actually *stored* — distinct
 * from a brand-new player, whose absent pref also reads back as DEFAULT 'off'.
 * The landing uses this to preserve an explicit Off across enter (don't re-write
 * it) while still onboarding new players into the shown language. */
export function nlDisabledByChoice(store?: Storage): boolean {
  try {
    const s = store ?? localStorage
    return s.getItem(KEY) !== null && readNlPref(s).language === 'off'
  } catch {
    return false
  }
}

export function writeNlPref(patch: Partial<NlPref>, store?: Storage): void {
  try {
    // Same [K] note as readNlPref: localStorage resolves inside the try.
    const s = store ?? localStorage
    s.setItem(KEY, JSON.stringify({ ...readNlPref(s), ...patch }))
  } catch {
    // Private mode / quota / blocked storage — best-effort, never fatal.
  }
}
