// Corpus-improvement loop (spec §6): every table miss — line, unresolved
// template slot, status room name — lands here with context. Capped ring
// buffer in localStorage; window.loquorMisses() lets a UAT session dump it
// straight into the notes. Storage errors are swallowed (same policy as
// nlpref.ts): logging must never break play.
export const MISS_CAP = 200
const KEY = 'loquor.xlate.misses'

export interface MissEntry {
  en: string
  game: string
  language: string
  kind: 'line' | 'status' | 'backlog'
  /** Turn context at miss time — the status line (room — score/moves), so a
   * UAT dump says WHERE each gap was hit (spec §6 "turn context"). */
  ctx?: string
  t?: number
}

export function readMisses(store?: Storage): MissEntry[] {
  try {
    const raw = (store ?? localStorage).getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MissEntry[]) : []
  } catch {
    return []
  }
}

export function logMiss(entry: MissEntry, store?: Storage): void {
  try {
    const s = store ?? localStorage
    const existing = readMisses(s)
    // The log is a SET of distinct corpus gaps (UAT-4): corpus re-activation
    // (language re-switch, HMR, session restore) re-scans the transcript and
    // would otherwise re-log every still-on-screen miss. Same (game,
    // language, en) → already recorded; the original entry (first ctx) wins.
    // `kind` is not identity — a 'backlog' re-log of a known 'line' gap is
    // exactly the noise this skips.
    if (
      existing.some(
        e =>
          e.en === entry.en &&
          e.game === entry.game &&
          e.language === entry.language,
      )
    )
      return
    const all = [...existing, { ...entry, t: Date.now() }].slice(-MISS_CAP)
    s.setItem(KEY, JSON.stringify(all))
  } catch {
    // Private mode / quota — best-effort, never fatal.
  }
}

/** Dev affordance: window.loquorMisses() → copy-pastable array. */
export function installMissDump(): void {
  if (typeof window === 'undefined') return
  ;(window as unknown as Record<string, unknown>).loquorMisses = () =>
    readMisses()
}
