// The Loud Room (Zork I) echoes the LAST word of the line it READ, twice, then
// " ..." (gverbs.zil V-ECHO prints that word's bytes straight from P-INBUF; the
// room's own READ loop in 1actions.zil LOUD-ROOM-FCN drives it). In Loquor the
// VM receives the English CANONICAL command, so it echoes an English word
// ("look look ...") even when the player typed the target language. The word is
// dynamic and the matcher allows {raw} at most once, so it cannot be a corpus
// pin; instead we substitute the player's OWN word so a Spanish player who typed
// "mira" sees "mira mira ...". UAT finding F6.
//
// Because a COMPOUND is sent to the VM one canonical clause at a time, each clause
// gets its own echo line. We re-voice each one PRECISELY by mapping the canonical
// last word the VM echoes back to the player's own last word for the clause that
// produced it (the `revoice` map, built as each clause is sent). So
// "coge la barra y mira" → "bar bar ..."→"barra barra ..." AND
// "look look ..."→"mira mira ...". The shape predicate is paired with a LOCATION
// gate at the call site (the player must be in the Loud Room) and the decision is
// frozen per line at emit time so historical scrollback echoes never restamp.

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

/** Normalize a command's LAST word for echo matching: lower-cased and stripped of
 * quotes / inverted (¡¿) and trailing punctuation. Also strips a leading French
 * elision (l'/d') that fuses the article/preposition onto the noun with no space,
 * so the last token "l'or"/"d'or" re-voices as the noun "or" (not "l'or l'or ...")
 * — I1. Used BOTH to key the canonical→player re-voice map (from the canonical the
 * VM echoes and the player clause that produced it) and to read the doubled token
 * off an echo line. */
export function loudEchoToken(s: string): string {
  const tokens = s.trim().split(/\s+/)
  return (tokens[tokens.length - 1] ?? '')
    .replace(/^[¡¿"'«»]+/, '')
    .replace(/^[ld]'/i, '') // French elision: l'or → or, d'or → or
    .replace(/["'«».,!?;:]+$/, '')
    .toLowerCase()
}

/** The player's own word to re-voice an echo `line` ("look look ..." → "mira"),
 * or null to leave the English echo. `revoice` maps a canonical last word (what
 * the VM echoes) to the player's last word for the clause that produced it. A
 * miss — the player escaped to English, or no command produced this word — falls
 * through to null. */
export function loudEchoWord(
  line: string,
  revoice: ReadonlyMap<string, string> | null | undefined,
): string | null {
  if (!revoice) return null
  const m = ECHO.exec(line)
  if (!m) return null
  return revoice.get(loudEchoToken(m[1])) ?? null
}
