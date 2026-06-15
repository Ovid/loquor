// The Loud Room (Zork I) echoes the LAST word of the player's command twice,
// followed by " ..." (gverbs.zil V-ECHO, driven by 1actions.zil LOUD-ROOM-FCN's
// own READ loop). In Loquor the VM receives the English CANONICAL command, so it
// echoes an English word ("look look ...") even when the player typed the target
// language. The word is dynamic and the matcher allows {raw} at most once, so it
// cannot be a corpus pin; instead we substitute the player's OWN last typed word
// so a Spanish player who typed "mira" sees "mira mira ...". UAT finding F6.
//
// Heuristic limit (accepted, since F6's only deterministic options all trade
// off): the substituted token is the last word of the player's RAW input, which
// aligns with the echoed English-last-word concept for the commands one actually
// types in the Loud Room — bare verbs ("mira"), directions, and take/give/put
// forms that end on the object in BOTH languages (notably "coge la barra" for
// the platinum bar that lives here → "barra barra ..."). A command whose
// target-language last word were a trailing adjective/instrument would mis-echo,
// but no such command applies to anything in the Loud Room.

/** The doubled-word echo shape: a word, a space, the SAME word (backreference),
 * then " ...". Distinctive enough that no other Zork I line collides with it. */
const ECHO = /^(\S+) \1 \.\.\.$/

/** If `line` is the Loud Room echo AND the player's last word is known, return
 * the faithful same-language echo ("mira mira ..."); otherwise null (the caller
 * falls through to the corpus / LLM / English path). `input` is the player's raw
 * typed command (target language), or null when none is recorded (backlog). */
export function loudEcho(
  line: string,
  input: string | null | undefined,
): string | null {
  if (!ECHO.test(line)) return null
  if (!input) return null
  const tokens = input.trim().split(/\s+/)
  const last = tokens[tokens.length - 1] ?? ''
  const word = last
    .replace(/^["'«»]+/, '')
    .replace(/["'«».,!?;:]+$/, '')
    .toLowerCase()
  if (word === '') return null
  return `${word} ${word} ...`
}
