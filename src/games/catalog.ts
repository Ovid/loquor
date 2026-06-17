import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../llm/grammar/index'

export interface Game {
  slug: 'zork1' | 'zork2' | 'zork3'
  numeral: string
  title: string
  file: string
  /** Story signature (first 0x1E bytes, hex) — the single key under which a
   *  game is looked up in the translation-corpus registry (corpusFor) and the
   *  per-game vocab/lexicon. Reused from the grammar layer so the literal lives
   *  in exactly one place. */
  sig: string
}

export const GAMES: Game[] = [
  {
    slug: 'zork1',
    numeral: 'I',
    title: 'Zork I',
    file: '/games/zork1.z3',
    sig: ZORK1_SIG,
  },
  {
    slug: 'zork2',
    numeral: 'II',
    title: 'Zork II',
    file: '/games/zork2.z3',
    sig: ZORK2_SIG,
  },
  {
    slug: 'zork3',
    numeral: 'III',
    title: 'Zork III',
    file: '/games/zork3.z3',
    sig: ZORK3_SIG,
  },
]

export const gameBySlug = (slug: string): Game | undefined =>
  GAMES.find(g => g.slug === slug)
