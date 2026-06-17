import { useRef } from 'react'
import type { ActiveLanguage } from '../llm/types'
import { useFocusTrap } from './useFocusTrap'

interface PrefsCopy {
  heading: string
  debugLabel: string
  debugHelp: string
  close: string
  /** aria-label for the status-bar ⚙ opener (Terminal reads this). */
  openLabel: string
}

// PREFS_COPY and prefsOpenLabel are exported alongside the component so the
// status-bar opener and tests can read the same localized strings (single
// source of truth); the react-refresh HMR rule (components-only exports) is a
// dev-server concern, not a correctness one.
// eslint-disable-next-line react-refresh/only-export-components
export const PREFS_COPY: Record<ActiveLanguage, PrefsCopy> = {
  en: {
    heading: 'Preferences',
    debugLabel: 'Debug mode',
    debugHelp: 'Show translated commands (e.g. “> up”) in the transcript.',
    close: 'Done',
    openLabel: 'Preferences',
  },
  fr: {
    heading: 'Préférences',
    debugLabel: 'Mode débogage',
    debugHelp:
      'Afficher les commandes traduites (par ex. « > up ») dans la transcription.',
    close: 'Terminé',
    openLabel: 'Préférences',
  },
  de: {
    heading: 'Einstellungen',
    debugLabel: 'Debug-Modus',
    debugHelp: 'Übersetzte Befehle (z. B. „> up“) im Protokoll anzeigen.',
    close: 'Fertig',
    openLabel: 'Einstellungen',
  },
  es: {
    heading: 'Preferencias',
    debugLabel: 'Modo de depuración',
    debugHelp:
      'Mostrar los comandos traducidos (p. ej. «> up») en la transcripción.',
    close: 'Hecho',
    openLabel: 'Preferencias',
  },
}

/** Localized aria-label for the status-bar ⚙ button. */
// eslint-disable-next-line react-refresh/only-export-components
export function prefsOpenLabel(lang: ActiveLanguage): string {
  return PREFS_COPY[lang].openLabel
}

export function PreferencesModal({
  open,
  debug,
  lang = 'en',
  onToggleDebug,
  onClose,
}: {
  open: boolean
  debug: boolean
  /** Active NL language — renders the panel chrome in this language. */
  lang?: ActiveLanguage
  onToggleDebug: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Same focus contract as the download modal (WCAG 2.4.3 / 2.1.2): trap Tab,
  // move focus in on open, restore to the ⚙ opener on close, Escape closes.
  // Shared with the download modal via useFocusTrap so the two can't drift.
  useFocusTrap(dialogRef, { active: open, onEscape: onClose })

  if (!open) return null
  const copy = PREFS_COPY[lang]

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prefs-modal-title"
      ref={dialogRef}
    >
      <div className="modal">
        <h2 id="prefs-modal-title">{copy.heading}</h2>
        <label className="prefs-row">
          <input
            type="checkbox"
            checked={debug}
            aria-describedby="prefs-debug-help"
            onChange={onToggleDebug}
          />{' '}
          {copy.debugLabel}
        </label>
        <p id="prefs-debug-help" className="prefs-help">
          {copy.debugHelp}
        </p>
        <div className="modal-actions">
          <button className="sw" type="button" onClick={onClose}>
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  )
}
