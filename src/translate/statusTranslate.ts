// Display-time status translation (spec §5). parseStatus() upstream is
// UNTOUCHED — its `right` is a raw string. The live ifvms z3 interpreter emits
// "Score: 0  Turns: 0" (score read as unsigned 16-bit, so a negative game
// score such as death −10 arrives as e.g. 65526); the `Moves:` shape is kept
// for tolerance with the older spec/fixtures, and `-?` is kept for robustness.
// Misses fall back to English for that part and are reported to the caller for
// the miss log.
import type { StatusLine } from '../glkote-react/types'
import type { CompiledCorpus } from './match'
import { normalize } from './normalize'

const RIGHT = /^Score:\s*(-?\d+)\s+(?:Moves|Turns):\s*(\d+)$/

const RIGHT_FORMAT: Readonly<
  Record<string, (score: string, moves: string) => string>
> = {
  fr: (score, moves) => `Score : ${score}  Coups : ${moves}`,
  de: (score, moves) => `Punkte: ${score}  Züge: ${moves}`,
  es: (score, moves) => `Puntos: ${score}  Turnos: ${moves}`,
}

export function translateStatus(
  status: StatusLine,
  c: CompiledCorpus,
  language: string,
): { status: StatusLine; miss: string | null } {
  let miss: string | null = null

  const loc = c.strings[normalize(status.location)]
  if (loc === undefined && status.location !== '') miss = status.location

  const m = RIGHT.exec(normalize(status.right))
  const fmt = RIGHT_FORMAT[language]
  const right = m && fmt ? fmt(m[1], m[2]) : status.right
  if ((!m || !fmt) && status.right !== '') miss = miss ?? status.right

  return {
    status: { location: loc ?? status.location, right },
    miss,
  }
}
