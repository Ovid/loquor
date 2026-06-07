// Validated localStorage persistence for the NL on/off + "declined" choice.
// Mirrors src/ui/useTheme.ts (read-validate-fallback, swallow write errors).
const KEY = 'loquor.nl'

export interface NlPref {
  enabled: boolean
  declined: boolean
}
const DEFAULT: NlPref = { enabled: false, declined: false }

export function readNlPref(store: Storage = localStorage): NlPref {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
      declined: typeof parsed.declined === 'boolean' ? parsed.declined : false,
    }
  } catch {
    return DEFAULT
  }
}

export function writeNlPref(patch: Partial<NlPref>, store: Storage = localStorage): void {
  try {
    store.setItem(KEY, JSON.stringify({ ...readNlPref(store), ...patch }))
  } catch {
    // Private mode / quota — persistence is best-effort, never fatal.
  }
}
