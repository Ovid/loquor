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
// Recovery notices suggest a simple phrase to TYPE (in the player's own
// language — the NL layer translates it), so those examples are localized;
// they are not quote-escapes, which would need to stay English (m4).
import type { ActiveLanguage } from './types'

// Partial because not every ActiveLanguage has input-NL notices. Georgian (ka)
// is read-Georgian / type-English in Phase 1: its input path is dead (it raw-sends
// English), so these input-side notices never fire for ka. byLang falls back to
// the en string for any language without its own entry — so the ~14 inline
// {en,fr,de,es} objects below need no ka key, and Phase 2 can add ka entries
// without touching the call sites. en/fr/de/es behaviour is identical.
type ByLang = { en: string } & Partial<Record<ActiveLanguage, string>>
const byLang = (m: ByLang, lang: ActiveLanguage): string => m[lang] ?? m.en

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
      en: 'I didn’t understand that. Try simpler wording, like “take the lamp” or “open the door”.',
      fr: 'Je n’ai pas compris. Essayez une formulation plus simple, comme « prends la lampe » ou « ouvre la porte ».',
      de: 'Das habe ich nicht verstanden. Versuchen Sie eine einfachere Formulierung, etwa „nimm die Lampe“ oder „öffne die Tür“.',
      es: 'No lo entendí. Prueba con palabras más simples, como «toma la lámpara» o «abre la puerta».',
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

/** The model download failed (genuine, non-abort) — the NL layer stays in
 * basic mode. The notice tells the player they can keep using common commands
 * and offers the recovery path (re-pick the upgrade to retry). */
export function modelDownloadFailed(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'AI model download failed — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
      fr: 'Échec du téléchargement du modèle d’IA — passage en mode simplifié. Les commandes courantes fonctionnent toujours ; resélectionnez la mise à niveau pour réessayer.',
      de: 'KI-Modell-Download fehlgeschlagen — Wechsel in den einfachen Modus. Gängige Befehle funktionieren weiterhin; wählen Sie die Aufwertung erneut, um es noch einmal zu versuchen.',
      es: 'Error al descargar el modelo de IA — se mantiene el modo básico. Los comandos comunes siguen funcionando; vuelva a elegir la mejora para reintentar.',
    },
    lang,
  )
}

/** The model download stalled (no progress) and was aborted by the watchdog —
 * the NL layer stays in basic mode. Same recovery path as a failure. */
export function modelDownloadStalled(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'AI model download stalled — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
      fr: 'Téléchargement du modèle d’IA bloqué — passage en mode simplifié. Les commandes courantes fonctionnent toujours ; resélectionnez la mise à niveau pour réessayer.',
      de: 'KI-Modell-Download hängt fest — Wechsel in den einfachen Modus. Gängige Befehle funktionieren weiterhin; wählen Sie die Aufwertung erneut, um es noch einmal zu versuchen.',
      es: 'Descarga del modelo de IA estancada — se mantiene el modo básico. Los comandos comunes siguen funcionando; vuelva a elegir la mejora para reintentar.',
    },
    lang,
  )
}

/** First abstain in grammar-only this stint — connects the miss to the declined
 * upgrade at the moment of confusion. Fires once per grammar-only stint, then the
 * plain couldntTranslate notice takes over. (EN grammar-only raw-sends, so in
 * practice this serves non-English players.) */
export function grammarOnlyFirstMiss(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'I didn’t catch that. Simple commands like “take the lamp” work now — add the optional upgrade for full sentences.',
      fr: 'Je n’ai pas compris. Les commandes simples comme « prends la lampe » fonctionnent déjà — ajoutez la mise à niveau facultative pour les phrases complètes.',
      de: 'Das habe ich nicht verstanden. Einfache Befehle wie „nimm die Lampe“ funktionieren bereits — fügen Sie die optionale Aufwertung für vollständige Sätze hinzu.',
      es: 'No lo entendí. Los comandos simples como «toma la lámpara» ya funcionan — añade la mejora opcional para frases completas.',
    },
    lang,
  )
}

/** Transient "thinking" indicator shown while a translation is in flight.
 * Localized so a FR/DE/ES player doesn't see English mid-translation (I5). */
export function thinking(lang: ActiveLanguage): string {
  return byLang(
    {
      en: '…thinking',
      fr: '…réflexion',
      de: '…denke nach',
      es: '…pensando',
    },
    lang,
  )
}

/** Status-bar/transcript chip words shown while an NL language is active, so a
 * FR/DE/ES player doesn't see English chrome mid-flow (M7). These appear only
 * under an active language (downloading/on phases); the off-phase "installed"
 * chips stay English because off means English play. */
export function downloadingChip(lang: ActiveLanguage): string {
  return byLang(
    { en: 'downloading', fr: 'téléchargement', de: 'lädt', es: 'descargando' },
    lang,
  )
}

/** Marker for grammar-only "basic mode" — matches the modal's "simplified mode" copy. */
export function basicChip(lang: ActiveLanguage): string {
  return byLang(
    { en: 'basic', fr: 'simplifié', de: 'einfach', es: 'básico' },
    lang,
  )
}

/** Chip on a typed-ahead line waiting for the translator. */
export function queuedChip(lang: ActiveLanguage): string {
  return byLang(
    { en: 'queued', fr: 'en attente', de: 'wartet', es: 'en cola' },
    lang,
  )
}

/** Command-field placeholder when an NL language is active — signals that plain
 * language is accepted (S3), the headline feature the classic "type a command"
 * copy hid. The example stays a simple command so it's honest in basic mode too. */
export function commandPlaceholder(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'type plain English — e.g. open the mailbox',
      fr: 'écrivez en français — ex. : ouvrez la boîte aux lettres',
      de: 'schreiben Sie auf Deutsch — z. B. öffnen Sie den Briefkasten',
      es: 'escribe en español — p. ej.: abre el buzón',
    },
    lang,
  )
}

/** Accessible name for the command field when an NL language is active (S3). */
export function commandLabel(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'Game command — plain English accepted',
      fr: 'Commande de jeu — français naturel accepté',
      de: 'Spielbefehl — natürliches Deutsch akzeptiert',
      es: 'Comando del juego — español natural aceptado',
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
