// src/llm/help.ts
// Localized `help` command. Zork I has NO native help/info/commands verb — typing
// `help` just earns `I don't know the word "help."` (Task 10 audit). So this
// intercept is strictly an improvement: it catches the localized help word and
// renders a localized cheat-sheet of the real Z-machine meta-verbs a non-English
// player needs (save/restore/restart/quit/score/diagnose, look/inventory,
// verbose/brief, a one-line version mention), plus the quoted-English escape
// hatch. It does NOT send anything to the game.
//
// EN-LANG IS PASSTHROUGH: English `help` is left to fall through to the Z-parser
// (its native "I don't know the word help" is the English baseline; we don't
// intercept it). ka is OUTPUT-ONLY (raw-sends English): it only ever sees the
// English word `help`, and its block has NO quoted-fallback instruction since
// quoting is meaningless when there is no input LLM.
import type { ActiveLanguage, NlLanguage } from './types'
import { fold } from './lexicon/fold'

/** The localized word that triggers help, per language. fr/de/es also accept the
 * English `help` (a player's reflex). en is intentionally absent — English help
 * passes through to the game. ka sees only `help` (it raw-sends English). */
const HELP_ALIASES: Partial<Record<NlLanguage, ReadonlySet<string>>> = {
  fr: new Set(['aide', 'help']),
  de: new Set(['hilfe', 'help']),
  es: new Set(['ayuda', 'help']),
  ka: new Set(['help']),
}

/** True when the typed line is a bare localized help word for the active language.
 * Bare-word match only (diacritic-folded), so a real intent containing the word
 * ("help me open the door") still reaches the normal pipeline. False for en/off. */
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
const ESCAPE_EXAMPLES = '"wind up canary", "enter boat", "echo", "kill thief with knife"'

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
      // NATIVE-REVIEW-DRAFT (ka §4 case forms)
      // ka is OUTPUT-ONLY: it raw-sends English, so commands are typed in English
      // and there is NO quoted-escape (quoting is meaningless without an input LLM).
      return [
        'დახმარება — ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს.',
        'სპეციალური ბრძანებები (აკრიფეთ ინგლისურად): save (შენახვა), restore (აღდგენა), restart (თავიდან დაწყება), quit (გასვლა), score (ქულა), diagnose (მდგომარეობა), look (ყურება), inventory (ინვენტარი), verbose / brief (გრძელი / მოკლე აღწერები). version აჩვენებს თამაშის ვერსიას.',
        'ამ შეტყობინების ხელახლა სანახავად აკრიფეთ help.',
      ].join('\n')
    case 'en':
    default:
      // English never reaches here (isHelpTrigger is false for en); kept for the
      // exhaustive ActiveLanguage type. Mirrors the meta list without a quoted
      // escape (English play sends verbatim anyway).
      return [
        'Help — type plain commands; the game understands them directly.',
        'Special commands: save, restore, restart, quit, score, diagnose, look, inventory, verbose / brief. "version" shows the game version.',
      ].join('\n')
  }
}
