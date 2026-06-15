// The Loud Room (Zork I) echoes the LAST word of the player's command twice,
// followed by " ..." (gverbs.zil V-ECHO, driven by 1actions.zil LOUD-ROOM-FCN's
// own READ loop). In Loquor the VM receives the English CANONICAL command, so it
// echoes an English word ("look look ...") even when the player typed the target
// language. The word is dynamic and the matcher allows {raw} at most once, so it
// cannot be a corpus pin; instead we substitute the player's OWN last typed word
// so a Spanish player who typed "mira" sees "mira mira ...". UAT finding F6.
//
// The shape predicate is paired with a LOCATION gate at the call site (the
// player must actually be in the Loud Room) so the regex can't hijack a
// coincidental doubled-word line elsewhere, and the decision is frozen per line
// id at emit time so historical scrollback echoes never restamp.
import { splitClauses } from '../llm/inputTranslate'

/** The English status location of the Loud Room (view.status.location is the raw
 * English ViewState value — see corpus 'Loud Room' pins). The caller gates the
 * echo substitution on this so only Loud Room turns are re-voiced. */
export const LOUD_ROOM = 'Loud Room'

/** The doubled-word echo shape: a word, a space, the SAME word (backreference),
 * then " ...". Distinctive, but NOT unique (any doubled word collides), so the
 * caller also gates on LOUD_ROOM before substituting. */
const ECHO = /^(\S+) \1 \.\.\.$/

/** True when `line` has the Loud Room's doubled-word echo shape. The caller pairs
 * this with the LOUD_ROOM location check. */
export function isLoudEchoShape(line: string): boolean {
  return ECHO.test(line)
}

/** The player's own last word, lower-cased and stripped of quotes / inverted and
 * trailing punctuation, to re-voice the echo ("mira" → "mira mira ..."). Returns
 * null — leave the English echo — when:
 *   • no input is recorded (backlog / fresh load), or
 *   • the input is a COMPOUND command: the VM echoes a single clause, not the
 *     whole line, so the raw line's last word is the wrong token (e.g.
 *     "coge la barra y mira" would mis-echo "mira"); English is the honest
 *     fallback there.
 * `input` is the player's raw typed command (target language). */
export function loudEchoWord(input: string | null | undefined): string | null {
  if (!input) return null
  if (splitClauses(input).length > 1) return null
  const tokens = input.trim().split(/\s+/)
  const word = (tokens[tokens.length - 1] ?? '')
    .replace(/^[¡¿"'«»]+/, '')
    .replace(/["'«».,!?;:]+$/, '')
    .toLowerCase()
  return word === '' ? null : word
}
