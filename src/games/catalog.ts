export interface Game {
  slug: 'zork1' | 'zork2' | 'zork3'
  numeral: string
  title: string
  subtitle: string
  file: string
}

export const GAMES: Game[] = [
  {
    slug: 'zork1',
    numeral: 'I',
    title: 'Zork I',
    subtitle: 'The Great Underground Empire',
    file: '/games/zork1.z3',
  },
  {
    slug: 'zork2',
    numeral: 'II',
    title: 'Zork II',
    subtitle: 'The Wizard of Frobozz',
    file: '/games/zork2.z3',
  },
  {
    slug: 'zork3',
    numeral: 'III',
    title: 'Zork III',
    subtitle: 'The Dungeon Master',
    file: '/games/zork3.z3',
  },
]

export const gameBySlug = (slug: string): Game | undefined =>
  GAMES.find(g => g.slug === slug)
