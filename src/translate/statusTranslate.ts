// Display-time status translation (spec §5). parseStatus() upstream is
// UNTOUCHED — its `right` is a raw string ("Score: 0   Moves: 1"), so the
// numbers are parsed HERE (signed: scores go negative). Misses fall back to
// English for that part and are reported to the caller for the miss log.
import type { StatusLine } from '../glkote-react/types'
import type { CompiledCorpus } from './match'
import { normalize } from './normalize'

const RIGHT = /^Score:\s*(-?\d+)\s+Moves:\s*(\d+)$/

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
