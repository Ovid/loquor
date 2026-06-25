import type { ActiveLanguage } from '../llm/types'
import { Modal } from './Modal'

interface PrefsCopy {
  heading: string
  debugLabel: string
  debugHelp: string
  llmLabel: string
  llmHelp: string
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
    llmLabel: 'Natural-language model (experimental)',
    llmHelp:
      'Adds an optional on-device model that understands more of what you type. Hidden by default.',
    close: 'Done',
    openLabel: 'Preferences',
  },
  fr: {
    heading: 'Préférences',
    debugLabel: 'Mode débogage',
    debugHelp:
      'Afficher les commandes traduites (par ex. « > up ») dans la transcription.',
    llmLabel: 'Modèle de langage naturel (expérimental)',
    llmHelp:
      'Ajoute un modèle optionnel, exécuté sur l’appareil, qui comprend mieux ce que vous tapez. Masqué par défaut.',
    close: 'Terminé',
    openLabel: 'Préférences',
  },
  de: {
    heading: 'Einstellungen',
    debugLabel: 'Debug-Modus',
    debugHelp: 'Übersetzte Befehle (z. B. „> up”) im Protokoll anzeigen.',
    llmLabel: 'Sprachmodell für natürliche Sprache (experimentell)',
    llmHelp:
      'Fügt ein optionales, auf dem Gerät laufendes Modell hinzu, das mehr von dem versteht, was Sie eingeben. Standardmäßig ausgeblendet.',
    close: 'Fertig',
    openLabel: 'Einstellungen',
  },
  es: {
    heading: 'Preferencias',
    debugLabel: 'Modo de depuración',
    debugHelp:
      'Mostrar los comandos traducidos (p. ej. «> up») en la transcripción.',
    llmLabel: 'Modelo de lenguaje natural (experimental)',
    llmHelp:
      'Añade un modelo opcional, ejecutado en el dispositivo, que entiende mejor lo que escribes. Oculto por defecto.',
    close: 'Hecho',
    openLabel: 'Preferencias',
  },
  // Georgian (ka) — player-visible: the status-bar ⚙ aria-label and the prefs
  // panel render in Georgian when Georgian is the active language. Draft pending
  // native review (spec §8). Mkhedruli is unicameral — no capitalization (§4).
  ka: {
    heading: 'პარამეტრები',
    debugLabel: 'გამართვის რეჟიმი',
    debugHelp: 'ჩანაწერში თარგმნილი ბრძანებების ჩვენება (მაგ. „> up”).',
    // NATIVE-REVIEW-DRAFT (§8): ka has no input/output LLM in either state, so
    // this toggle is functionally inert for ka — but the panel still renders in
    // Georgian when ka is active, so the copy must exist. Mkhedruli is unicameral.
    llmLabel: 'ბუნებრივი ენის მოდელი (ექსპერიმენტული)',
    llmHelp:
      'ამატებს არასავალდებულო მოდელს, რომელიც მოწყობილობაზევე მუშაობს და უკეთ იგებს თქვენს აკრეფილ ტექსტს. ნაგულისხმევად დამალულია.',
    close: 'მზადაა',
    openLabel: 'პარამეტრები',
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
  llmEnabled = false,
  lang = 'en',
  onToggleDebug,
  onToggleLlm = () => {},
  onClose,
}: {
  open: boolean
  debug: boolean
  /** LLM-feature preference; controls whether the model + its affordances are exposed. */
  llmEnabled?: boolean
  /** Active NL language — renders the panel chrome in this language. */
  lang?: ActiveLanguage
  onToggleDebug: () => void
  onToggleLlm?: () => void
  onClose: () => void
}) {
  // The shared <Modal> owns the dialog a11y contract + focus trap (WCAG 2.4.3 /
  // 2.1.2): trap Tab, move focus in on open, restore to the ⚙ opener on close,
  // Escape closes.
  const copy = PREFS_COPY[lang]

  return (
    <Modal
      open={open}
      titleId="prefs-modal-title"
      title={copy.heading}
      onEscape={onClose}
    >
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
      <label className="prefs-row">
        <input
          type="checkbox"
          checked={llmEnabled}
          aria-describedby="prefs-llm-help"
          onChange={onToggleLlm}
        />{' '}
        {copy.llmLabel}
      </label>
      <p id="prefs-llm-help" className="prefs-help">
        {copy.llmHelp}
      </p>
      <div className="modal-actions">
        <button className="sw" type="button" onClick={onClose}>
          {copy.close}
        </button>
      </div>
    </Modal>
  )
}
