// Localized player-facing NL notices (F1). The EN/FR/DE/ES mandate (CLAUDE.md)
// covers the NL layer's UI: a non-English player who hits a queue drop, a
// non-EN abstain, or a truncated compound must see the notice in THEIR
// language, not English.
//
// SCOPE — only notices a non-English player can actually see live here:
//   • "sent as typed" notices are intentionally absent: they fire only in
//     English mode (the raw line goes to the Z-parser), so a non-EN player
//     never sees them — translating them would be dead text.
//   • "Queue cleared — natural language is off." likewise stays inline English
//     at its call site: it fires only when the player turned NL OFF, which in
//     this app means English play.
// The embedded example command (`open mailbox`) stays English in every
// language: the quote-escape passes it verbatim to the Z-parser, which only
// understands English.
import type { ActiveLanguage } from './types'

type ByLang = Record<ActiveLanguage, string>
const byLang = (m: ByLang, lang: ActiveLanguage): string => m[lang]

/** The newest typed line was dropped because the input queue is full. */
export function queueFullDropped(lang: ActiveLanguage, line: string): string {
  return byLang(
    {
      en: `Queue full — dropped: "${line}"`,
      fr: `File d’attente pleine — ignoré : « ${line} »`,
      de: `Warteschlange voll — verworfen: „${line}“`,
      es: `Cola llena — descartado: «${line}»`,
    },
    lang,
  )
}

/** A non-EN line whose translation timed out / failed: nothing was sent. */
export function nothingSent(lang: ActiveLanguage, timedOut: boolean): string {
  return byLang(
    timedOut
      ? {
          en: 'Translation timed out — nothing sent.',
          fr: 'Délai de traduction dépassé — rien envoyé.',
          de: 'Zeitüberschreitung bei der Übersetzung — nichts gesendet.',
          es: 'Se agotó el tiempo de traducción — no se envió nada.',
        }
      : {
          en: 'Translation failed — nothing sent.',
          fr: 'Échec de la traduction — rien envoyé.',
          de: 'Übersetzung fehlgeschlagen — nichts gesendet.',
          es: 'Error de traducción — no se envió nada.',
        },
    lang,
  )
}

/** A non-EN line that missed every stage and the model abstained. */
export function couldntTranslate(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'Couldn’t translate — try simpler wording, or quote a command: "open mailbox"',
      fr: 'Traduction impossible — essayez une formulation plus simple, ou citez une commande : « open mailbox »',
      de: 'Übersetzung nicht möglich — versuchen Sie eine einfachere Formulierung oder setzen Sie einen Befehl in Anführungszeichen: „open mailbox“',
      es: 'No se pudo traducir — pruebe con palabras más simples, o entrecomille un comando: «open mailbox»',
    },
    lang,
  )
}

/** A compound that ran only `done` of its `total` clauses. `kind` labels why
 * it stopped: a clean partial run, a timeout, or a translator failure. */
export function ranOfActions(
  lang: ActiveLanguage,
  done: number,
  total: number,
  kind: 'ok' | 'timeout' | 'failed',
): string {
  const body: ByLang = {
    en: `ran ${done} of ${total} actions.`,
    fr: `${done} sur ${total} actions effectuées.`,
    de: `${done} von ${total} Aktionen ausgeführt.`,
    es: `${done} de ${total} acciones ejecutadas.`,
  }
  if (kind === 'ok')
    return byLang(
      {
        // Standalone: capitalized, no error prefix.
        en: `Ran ${done} of ${total} actions.`,
        fr: body.fr,
        de: body.de,
        es: body.es,
      },
      lang,
    )
  const prefix: ByLang =
    kind === 'timeout'
      ? {
          en: 'Translation timed out',
          fr: 'Délai de traduction dépassé',
          de: 'Zeitüberschreitung bei der Übersetzung',
          es: 'Se agotó el tiempo de traducción',
        }
      : {
          en: 'Translation failed',
          fr: 'Échec de la traduction',
          de: 'Übersetzung fehlgeschlagen',
          es: 'Error de traducción',
        }
  return `${prefix[lang]} — ${body[lang]}`
}

/** The model download failed (genuine, non-abort) — the layer falls back to
 * the deterministic grammar-only pipeline. Shown in the language the player
 * picked when they triggered the download. */
export function modelDownloadFailed(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'Model download failed — staying grammar-only.',
      fr: 'Échec du téléchargement du modèle — mode grammaire uniquement.',
      de: 'Modell-Download fehlgeschlagen — nur Grammatikmodus.',
      es: 'Error al descargar el modelo — solo modo gramática.',
    },
    lang,
  )
}

/** The model download stalled (no progress) and was aborted by the watchdog —
 * same grammar-only fallback as a failure. */
export function modelDownloadStalled(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'Model download stalled — staying grammar-only.',
      fr: 'Téléchargement du modèle bloqué — mode grammaire uniquement.',
      de: 'Modell-Download hängt — nur Grammatikmodus.',
      es: 'Descarga del modelo estancada — solo modo gramática.',
    },
    lang,
  )
}

/** A queued line was discarded because the game raised an interactive prompt. */
export function queueClearedNeedsAnswer(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'Queue cleared — the game needs an answer first.',
      fr: 'File d’attente vidée — le jeu attend d’abord une réponse.',
      de: 'Warteschlange geleert — das Spiel braucht zuerst eine Antwort.',
      es: 'Cola vaciada — el juego necesita una respuesta primero.',
    },
    lang,
  )
}
