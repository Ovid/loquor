import { useRef } from 'react'
import type { ActiveLanguage, LoadProgress } from '../llm/types'
import { pct as toPct, formatEta } from '../llm/progress'
import { useFocusTrap } from './useFocusTrap'

interface ModalCopy {
  heading: string
  body: string
  warning: string
  progressLabel: string
  cancel: string
  accept: string
  decline: string
}

const COPY: Record<ActiveLanguage, ModalCopy> = {
  en: {
    heading: 'Improve natural-language input',
    body: 'Basic mode already understands common commands. This optional upgrade fetches a language model (a sizable, one-time download) from third-party hosts — the model weights from Hugging Face and a small support library from GitHub — so it can understand more complex sentences. After that it runs entirely on your device — offline and private — and is cached, so it is not downloaded again.',
    warning:
      'Your device may not support this model, and the download is large and may fail. If it does, you stay in basic mode — common commands still work.',
    progressLabel: 'Model download progress',
    cancel: 'Cancel',
    accept: 'Download & upgrade',
    decline: 'Not now',
  },
  fr: {
    heading: 'Améliorer la saisie en langage naturel',
    body: 'Le mode simplifié comprend déjà les commandes courantes. Cette amélioration facultative télécharge un modèle de langage (un téléchargement unique et volumineux) depuis des hôtes tiers — les poids du modèle depuis Hugging Face et une petite bibliothèque de support depuis GitHub — afin de comprendre des phrases plus complexes. Ensuite, il fonctionne entièrement sur votre appareil — hors ligne et privé — et il est mis en cache, donc il n’est pas téléchargé à nouveau.',
    warning:
      'Votre appareil ne prend peut-être pas en charge ce modèle, et le téléchargement est volumineux et peut échouer. Si c’est le cas, vous restez en mode simplifié — les commandes courantes fonctionnent toujours.',
    progressLabel: 'Progression du téléchargement du modèle',
    cancel: 'Annuler',
    accept: 'Télécharger et améliorer',
    decline: 'Pas maintenant',
  },
  de: {
    heading: 'Eingabe in natürlicher Sprache verbessern',
    body: 'Der einfache Modus versteht bereits gängige Befehle. Diese optionale Aufwertung lädt ein Sprachmodell herunter (ein umfangreicher, einmaliger Download) von Drittanbieter-Hosts — die Modellgewichte von Hugging Face und eine kleine Hilfsbibliothek von GitHub — damit es komplexere Sätze verstehen kann. Danach läuft es vollständig auf Ihrem Gerät — offline und privat — und wird zwischengespeichert, sodass es nicht erneut heruntergeladen wird.',
    warning:
      'Ihr Gerät unterstützt dieses Modell möglicherweise nicht, und der Download ist groß und kann fehlschlagen. Falls das passiert, bleiben Sie im einfachen Modus — gängige Befehle funktionieren weiterhin.',
    progressLabel: 'Fortschritt des Modell-Downloads',
    cancel: 'Abbrechen',
    accept: 'Herunterladen und aufwerten',
    decline: 'Nicht jetzt',
  },
  es: {
    heading: 'Mejorar la entrada en lenguaje natural',
    body: 'El modo básico ya entiende los comandos comunes. Esta mejora opcional descarga un modelo de lenguaje (una descarga única y de gran tamaño) desde servidores de terceros — los pesos del modelo desde Hugging Face y una pequeña biblioteca de soporte desde GitHub — para poder entender frases más complejas. Después se ejecuta por completo en tu dispositivo — sin conexión y de forma privada — y se guarda en caché, por lo que no se vuelve a descargar.',
    warning:
      'Es posible que tu dispositivo no sea compatible con este modelo, y la descarga es grande y puede fallar. Si ocurre, te quedas en el modo básico — los comandos comunes siguen funcionando.',
    progressLabel: 'Progreso de la descarga del modelo',
    cancel: 'Cancelar',
    accept: 'Descargar y mejorar',
    decline: 'Ahora no',
  },
  // Georgian (ka): this modal is currently SUPPRESSED for output-only Georgian
  // (Phase 1 raw-sends English — no input model is offered, spec §3a), so this
  // entry is never shown today. Authored anyway so COPY[lang] stays a valid
  // object and it is forward-compatible with Phase 2 (Georgian input). Draft
  // pending native review (§8). Mkhedruli is unicameral — no capitalization (§4).
  ka: {
    heading: 'ბუნებრივ ენაზე შეყვანის გაუმჯობესება',
    body: 'ძირითადი რეჟიმი უკვე იგებს გავრცელებულ ბრძანებებს. ეს არასავალდებულო გაუმჯობესება ჩამოტვირთავს ენობრივ მოდელს (დიდი, ერთჯერადი ჩამოტვირთვა) მესამე მხარის სერვერებიდან — მოდელის წონებს Hugging Face-დან და მცირე დამხმარე ბიბლიოთეკას GitHub-დან — რათა მან უფრო რთული წინადადებები გაიგოს. ამის შემდეგ ის მთლიანად თქვენს მოწყობილობაზე მუშაობს — ხაზგარეშე და კონფიდენციალურად — და ინახება ქეშში, ამიტომ ხელახლა აღარ ჩამოიტვირთება.',
    warning:
      'შესაძლოა თქვენი მოწყობილობა ამ მოდელს არ უჭერდეს მხარს და ჩამოტვირთვა დიდია და შეიძლება ჩაიშალოს. ასეთ შემთხვევაში თქვენ ძირითად რეჟიმში რჩებით — გავრცელებული ბრძანებები კვლავ მუშაობს.',
    progressLabel: 'მოდელის ჩამოტვირთვის მიმდინარეობა',
    cancel: 'გაუქმება',
    accept: 'ჩამოტვირთვა და გაუმჯობესება',
    decline: 'ახლა არა',
  },
}

export function ModelDownloadModal({
  open,
  progress,
  etaSeconds = null,
  warn = false,
  lang = 'en',
  onAccept,
  onDecline,
  onCancel,
}: {
  open: boolean
  progress: LoadProgress | null
  /** Estimated seconds remaining for the download (computed by the NL hook), or
   * null when not yet estimable. */
  etaSeconds?: number | null
  /** Honest warning for a none-capability device's "try the model anyway". */
  warn?: boolean
  /** Active NL language — the modal renders its chrome in this language. */
  lang?: ActiveLanguage
  onAccept: () => void
  onDecline: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Modal focus management (2.4.3 / 2.1.2): trap Tab within the dialog, restore
  // focus on close, and route Escape (Cancel while downloading, else Not now).
  // Shared with the landing overlay via useFocusTrap so the two can't drift (I2).
  const downloading = progress !== null
  useFocusTrap(dialogRef, {
    active: open,
    onEscape: () => (downloading ? onCancel : onDecline)(),
  })

  if (!open) return null
  const pct = progress ? toPct(progress.loaded, progress.total) : 0
  const eta = formatEta(etaSeconds, lang)

  const copy = COPY[lang]

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nl-modal-title"
      ref={dialogRef}
    >
      <div className="modal">
        <h2 id="nl-modal-title">{copy.heading}</h2>
        <p>{copy.body}</p>
        {warn && !downloading && (
          <p className="modal-warn" role="note">
            {copy.warning}
          </p>
        )}
        {downloading ? (
          <>
            <progress value={pct} max={100} aria-label={copy.progressLabel} />
            <p aria-live="polite">
              {/* Localized progressLabel + pct convey state; the engine's raw
                  progress.text is English ("downloading") and is intentionally
                  not rendered in this localized modal (review I3). */}
              {pct}%{eta ? ` · ${eta}` : ''}
            </p>
            <button className="sw" type="button" onClick={onCancel}>
              {copy.cancel}
            </button>
          </>
        ) : (
          <div className="modal-actions">
            <button className="sw" type="button" onClick={onAccept}>
              {copy.accept}
            </button>
            <button className="sw" type="button" onClick={onDecline}>
              {copy.decline}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
