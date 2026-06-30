import { useEffect, useRef, useState } from 'react'
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
  /** "Delete cached model" trigger; shown only when a model is on disk. */
  deleteLabel: string
  /** Inline confirm prompt (states the consequence: a re-download is needed). */
  deletePrompt: string
  /** Confirm / cancel buttons for the two-step delete. */
  deleteConfirm: string
  deleteCancel: string
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
    debugHelp:
      'Show translated commands (e.g. “> up”) in the transcript, and write diagnostic logs to the browser console.',
    llmLabel: 'Natural-language model (experimental)',
    llmHelp:
      'Adds an optional on-device model that understands more of what you type. Hidden by default.',
    close: 'Done',
    openLabel: 'Preferences',
    deleteLabel: 'Delete cached model',
    deletePrompt:
      'Delete the downloaded model? You’ll re-download it to use it again.',
    deleteConfirm: 'Delete model',
    deleteCancel: 'Cancel',
  },
  fr: {
    heading: 'Préférences',
    debugLabel: 'Mode débogage',
    debugHelp:
      'Afficher les commandes traduites (par ex. « > up ») dans la transcription et écrire des journaux de diagnostic dans la console du navigateur.',
    llmLabel: 'Modèle de langage naturel (expérimental)',
    llmHelp:
      'Ajoute un modèle optionnel, exécuté sur l’appareil, qui comprend mieux ce que vous tapez. Masqué par défaut.',
    close: 'Terminé',
    openLabel: 'Préférences',
    deleteLabel: 'Supprimer le modèle téléchargé',
    deletePrompt:
      'Supprimer le modèle téléchargé ? Vous devrez le retélécharger pour l’utiliser à nouveau.',
    deleteConfirm: 'Supprimer le modèle',
    deleteCancel: 'Annuler',
  },
  de: {
    heading: 'Einstellungen',
    debugLabel: 'Debug-Modus',
    debugHelp:
      'Übersetzte Befehle (z. B. „> up“) im Protokoll anzeigen und Diagnoseprotokolle in die Browser-Konsole schreiben.',
    llmLabel: 'Sprachmodell für natürliche Sprache (experimentell)',
    llmHelp:
      'Fügt ein optionales, auf dem Gerät laufendes Modell hinzu, das mehr von dem versteht, was Sie eingeben. Standardmäßig ausgeblendet.',
    close: 'Fertig',
    openLabel: 'Einstellungen',
    deleteLabel: 'Heruntergeladenes Modell löschen',
    deletePrompt:
      'Das heruntergeladene Modell löschen? Sie müssen es erneut herunterladen, um es wieder zu verwenden.',
    deleteConfirm: 'Modell löschen',
    deleteCancel: 'Abbrechen',
  },
  es: {
    heading: 'Preferencias',
    debugLabel: 'Modo de depuración',
    debugHelp:
      'Mostrar los comandos traducidos (p. ej. «> up») en la transcripción y escribir registros de diagnóstico en la consola del navegador.',
    llmLabel: 'Modelo de lenguaje natural (experimental)',
    llmHelp:
      'Añade un modelo opcional, ejecutado en el dispositivo, que entiende mejor lo que escribes. Oculto por defecto.',
    close: 'Hecho',
    openLabel: 'Preferencias',
    deleteLabel: 'Eliminar el modelo descargado',
    deletePrompt:
      '¿Eliminar el modelo descargado? Tendrás que volver a descargarlo para usarlo de nuevo.',
    deleteConfirm: 'Eliminar modelo',
    deleteCancel: 'Cancelar',
  },
  // Georgian (ka) — player-visible: the status-bar ⚙ aria-label and the prefs
  // panel render in Georgian when Georgian is the active language. Draft pending
  // native review (spec §8). Mkhedruli is unicameral — no capitalization (§4).
  ka: {
    heading: 'პარამეტრები',
    debugLabel: 'გამართვის რეჟიმი',
    // NATIVE-REVIEW-DRAFT (§8): the console-diagnostics clause mirrors en/fr/de/es.
    debugHelp:
      'ჩანაწერში თარგმნილი ბრძანებების ჩვენება (მაგ. „> up“) და დიაგნოსტიკური ჟურნალების ბრაუზერის კონსოლში ჩაწერა.',
    // NATIVE-REVIEW-DRAFT (§8): ka has no input/output LLM in either state, so
    // this toggle is functionally inert for ka — but the panel still renders in
    // Georgian when ka is active, so the copy must exist. Mkhedruli is unicameral.
    llmLabel: 'ბუნებრივი ენის მოდელი (ექსპერიმენტული)',
    llmHelp:
      'ამატებს არასავალდებულო მოდელს, რომელიც მოწყობილობაზევე მუშაობს და უკეთ იგებს თქვენს აკრეფილ ტექსტს. ნაგულისხმევად დამალულია.',
    close: 'მზადაა',
    openLabel: 'პარამეტრები',
    // NATIVE-REVIEW-DRAFT (§8): ka is never offered the model (the download modal
    // is suppressed), so `modelInstalled` is always false for ka and this delete
    // row never renders — authored only because PrefsCopy requires it. Mkhedruli
    // is unicameral.
    deleteLabel: 'ჩამოტვირთული მოდელის წაშლა',
    deletePrompt:
      'წავშალო ჩამოტვირთული მოდელი? ხელახლა გამოსაყენებლად საჭირო იქნება მისი თავიდან ჩამოტვირთვა.',
    deleteConfirm: 'მოდელის წაშლა',
    deleteCancel: 'გაუქმება',
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
  modelInstalled = false,
  onToggleDebug,
  onToggleLlm = () => {},
  onDeleteModel = () => {},
  onClose,
}: {
  open: boolean
  debug: boolean
  /** LLM-feature preference; controls whether the model + its affordances are exposed. */
  llmEnabled?: boolean
  /** Active NL language — renders the panel chrome in this language. */
  lang?: ActiveLanguage
  /** A model is present in the on-disk cache — gates the "Delete cached model" row. */
  modelInstalled?: boolean
  onToggleDebug: () => void
  onToggleLlm?: () => void
  /** Delete the on-disk model cache (frees disk; forces a fresh re-download). */
  onDeleteModel?: () => void
  onClose: () => void
}) {
  // The shared <Modal> owns the dialog a11y contract + focus trap (WCAG 2.4.3 /
  // 2.1.2): trap Tab, move focus in on open, restore to the ⚙ opener on close,
  // Escape closes.
  const copy = PREFS_COPY[lang]

  // Two-step confirm for the destructive (but recoverable) delete.
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  // When the confirm appears, move focus onto it so a keyboard/SR user lands on
  // the destructive action (its aria-describedby voices the consequence) rather
  // than losing focus to <body> when the trigger unmounts.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])
  // Closing the panel (Done / Escape) abandons an in-progress confirm, so a
  // reopen always starts at step 1. (The delete row itself is gated on
  // modelInstalled, so a stale confirm can't render after the model is gone.)
  const handleClose = () => {
    setConfirming(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      titleId="prefs-modal-title"
      title={copy.heading}
      onEscape={handleClose}
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
      {modelInstalled &&
        (confirming ? (
          <div className="prefs-row prefs-delete-confirm">
            <p id="prefs-delete-prompt" className="prefs-help">
              {copy.deletePrompt}
            </p>
            <div className="modal-actions">
              <button
                ref={confirmRef}
                className="sw"
                type="button"
                aria-describedby="prefs-delete-prompt"
                onClick={() => {
                  onDeleteModel()
                  setConfirming(false)
                }}
              >
                {copy.deleteConfirm}
              </button>
              <button
                className="sw"
                type="button"
                onClick={() => setConfirming(false)}
              >
                {copy.deleteCancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="sw prefs-delete"
            type="button"
            onClick={() => setConfirming(true)}
          >
            {copy.deleteLabel}
          </button>
        ))}
      <div className="modal-actions">
        <button className="sw" type="button" onClick={handleClose}>
          {copy.close}
        </button>
      </div>
    </Modal>
  )
}
