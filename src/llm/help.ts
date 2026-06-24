// src/llm/help.ts
// Localized `help` command. Zork I has NO native help/info/commands verb — typing
// `help` just earns `I don't know the word "help."` (Task 10 audit). So this
// intercept is strictly an improvement: it catches the localized help word and
// renders a localized cheat-sheet of the real Z-machine meta-verbs a non-English
// player needs (save/restore/restart/quit/score/diagnose, look/inventory,
// verbose/brief, a one-line version mention), plus the quoted-English escape
// hatch. It does NOT send anything to the game.
//
// EN IS INTERCEPTED TOO: Zork I has NO native help (Task 10), so English `help`
// was NOT a useful passthrough — it either earned "I don't know the word help" or,
// with a model on, got mistranslated by the LLM (observed: help → look, silently
// re-displaying the room). So English `help` now gets the English cheat-sheet like
// every other language. On Zork I, ka now takes Georgian input (routed through the
// translate pipeline), so its block reads like fr/de/es: it tells the player to
// type Georgian and includes the quoted-English escape hatch.
import type { ActiveLanguage, NlLanguage } from './types'
import { fold } from './lexicon/fold'

/** The localized word that triggers help, per language. fr/de/es also accept the
 * English `help` (a player's reflex); en triggers on `help`; ka's trigger word
 * stays English `help` even under Georgian input (like the meta-verb names).
 * Only `off` (NL disabled) has no entry. */
const HELP_ALIASES: Partial<Record<NlLanguage, ReadonlySet<string>>> = {
  en: new Set(['help']),
  fr: new Set(['aide', 'help']),
  de: new Set(['hilfe', 'help']),
  es: new Set(['ayuda', 'help']),
  ka: new Set(['help']),
}

/** True when the typed line is a bare localized help word for the active language.
 * Bare-word match only (diacritic-folded), so a real intent containing the word
 * ("help me open the door") still reaches the normal pipeline. False only for off. */
export function isHelpTrigger(line: string, lang: NlLanguage): boolean {
  const aliases = HELP_ALIASES[lang]
  if (!aliases) return false
  const norm = fold(line)
  if (norm.includes(' ')) return false
  return aliases.has(norm)
}

// The escape-hatch examples stay ENGLISH (quoting bypasses translation and sends
// the unquoted text verbatim to the Z-parser, so the examples must be the literal
// English the game accepts) — shared across fr/de/es so they can't drift.
// ESCAPE_EXAMPLE is the canonical single example, reused by notices.ts's one-line
// activation nudge so the two can't drift apart (S2).
export const ESCAPE_EXAMPLE = '"wind up canary"'
const ESCAPE_EXAMPLES = `${ESCAPE_EXAMPLE}, "enter boat", "echo", "kill thief with knife"`

/** The localized help block, surfaced via the existing aria-live notice seam. */
export function helpResponse(lang: ActiveLanguage): string {
  switch (lang) {
    case 'fr':
      return [
        'Aide — écrivez en français naturel ; je traduis pour le jeu.',
        'Commandes spéciales (tapez le mot anglais) : save (sauvegarder), restore (restaurer), restart (recommencer), quit (quitter), score (score), diagnose (diagnostic), look (regarder), inventory (inventaire), verbose / brief (descriptions longues / courtes). « version » affiche la version du jeu.',
        `Pour envoyer une commande exacte sans traduction, mettez-la entre guillemets, p. ex. ${ESCAPE_EXAMPLES}.`,
        'Tapez « aide » pour revoir ce message.',
      ].join('\n')
    case 'de':
      return [
        'Hilfe — schreiben Sie auf natürlichem Deutsch; ich übersetze für das Spiel.',
        'Sonderbefehle (englisches Wort eingeben): save (speichern), restore (laden), restart (neu starten), quit (beenden), score (Punktestand), diagnose (Zustand), look (umsehen), inventory (Inventar), verbose / brief (lange / kurze Beschreibungen). „version“ zeigt die Spielversion.',
        `Um einen genauen Befehl ohne Übersetzung zu senden, setzen Sie ihn in Anführungszeichen, z. B. ${ESCAPE_EXAMPLES}.`,
        'Geben Sie „hilfe“ ein, um diese Nachricht erneut zu sehen.',
      ].join('\n')
    case 'es':
      return [
        'Ayuda — escribe en español natural; yo lo traduzco para el juego.',
        'Comandos especiales (escribe la palabra en inglés): save (guardar), restore (restaurar), restart (reiniciar), quit (salir), score (puntuación), diagnose (diagnóstico), look (mirar), inventory (inventario), verbose / brief (descripciones largas / breves). «version» muestra la versión del juego.',
        `Para enviar un comando exacto sin traducción, ponlo entre comillas, p. ej. ${ESCAPE_EXAMPLES}.`,
        'Escribe «ayuda» para volver a ver este mensaje.',
      ].join('\n')
    case 'ka':
      // NATIVE-REVIEW-DRAFT (ka §7): Georgian input (Zork I, beta).
      return [
        'დახმარება — ბრძანებები აკრიფეთ ქართულად; მე გადავთარგმნი თამაშისთვის.',
        'სპეციალური ბრძანებები (აკრიფეთ ინგლისურად): save (შენახვა), restore (აღდგენა), restart (თავიდან დაწყება), quit (გასვლა), score (ქულა), diagnose (მდგომარეობა), look (ყურება), inventory (ინვენტარი), verbose / brief (გრძელი / მოკლე აღწერები). version აჩვენებს თამაშის ვერსიას.',
        `ზუსტი ბრძანების თარგმანის გარეშე გასაგზავნად ჩასვით ბრჭყალებში, მაგ. ${ESCAPE_EXAMPLES}.`,
        'ამ შეტყობინების ხელახლა სანახავად აკრიფეთ help.',
      ].join('\n')
    case 'en':
    default:
      return [
        'Help — type commands in plain English; I translate anything the parser does not accept directly.',
        'Special commands: save, restore, restart, quit, score, diagnose, look, inventory, verbose / brief. "version" shows the game version.',
        `To send a command exactly as typed (bypassing translation), wrap it in quotes, e.g. ${ESCAPE_EXAMPLES}.`,
        'Type help to see this message again.',
      ].join('\n')
  }
}
