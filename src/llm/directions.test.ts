// src/llm/directions.test.ts
import { describe, it, expect } from 'vitest'
import { parseDirection } from './directions'

// The standard Zork movement set (zork1/2/3 share this core).
const MOVE = [
  'down',
  'east',
  'in',
  'land',
  'north',
  'northeast',
  'northwest',
  'out',
  'south',
  'southeast',
  'southwest',
  'up',
  'west',
]

describe('parseDirection', () => {
  it('maps English bare and verb-prefixed directions', () => {
    expect(parseDirection('north', MOVE)).toBe('north')
    expect(parseDirection('go south', MOVE)).toBe('south')
    expect(parseDirection('head NE', MOVE)).toBe('northeast')
    expect(parseDirection('southeast', MOVE)).toBe('southeast')
    expect(parseDirection('u', MOVE)).toBe('up')
    expect(parseDirection('walk to the west.', MOVE)).toBe('west')
  })

  it('maps French directions including diagonals (UAT F8)', () => {
    expect(parseDirection('va au sud', MOVE)).toBe('south')
    expect(parseDirection('va vers le sud-est', MOVE)).toBe('southeast')
    expect(parseDirection('sud-est', MOVE)).toBe('southeast')
    expect(parseDirection('nord-ouest', MOVE)).toBe('northwest')
    expect(parseDirection('descends', MOVE)).toBe('down')
    expect(parseDirection('monte', MOVE)).toBe('up')
  })

  it('handles the French elided article l’est/l’ouest (review C2)', () => {
    // prompt.ts advertises "vers l'est" as deterministically handled; the
    // apostrophe (ASCII or typographic) must not glue the article to the noun.
    expect(parseDirection("vers l'est", MOVE)).toBe('east')
    expect(parseDirection('vers l’est', MOVE)).toBe('east')
    expect(parseDirection("va à l'ouest", MOVE)).toBe('west')
    expect(parseDirection("l'est", MOVE)).toBe('east')
  })

  it('maps German and Spanish directions', () => {
    expect(parseDirection('geh nach norden', MOVE)).toBe('north')
    expect(parseDirection('südosten', MOVE)).toBe('southeast')
    expect(parseDirection('ve al sur', MOVE)).toBe('south')
    expect(parseDirection('sureste', MOVE)).toBe('southeast')
  })

  it('returns null for object commands and non-directions', () => {
    for (const s of ['move rug', 'open the door', 'take lamp', 'go', ''])
      expect(parseDirection(s, MOVE)).toBeNull()
  })

  it('returns null for a direction not in this game’s movement set', () => {
    expect(parseDirection('southeast', ['north', 'south'])).toBeNull()
  })
})

describe('Georgian directions (spec §3.3)', () => {
  const cases: [string, string][] = [
    ['ჩრდილოეთი', 'north'],
    ['ჩრდილოეთით', 'north'], // adverbial -ით form
    ['სამხრეთი', 'south'],
    ['სამხრეთით', 'south'], // adverbial -ით form
    ['აღმოსავლეთი', 'east'],
    ['აღმოსავლეთით', 'east'], // adverbial -ით form
    ['დასავლეთი', 'west'],
    ['დასავლეთით', 'west'], // adverbial -ით form
    ['ზემოთ', 'up'],
    ['ქვემოთ', 'down'],
    ['შიგნით', 'in'],
    ['გარეთ', 'out'],
    ['ჩრდილოაღმოსავლეთი', 'northeast'],
    ['ჩრდილოაღმოსავლეთით', 'northeast'], // diagonal adverbial -ით form (spec §3.3)
    ['წადი ჩრდილოეთით', 'north'], // "go north" — წადი is a LEAD go-verb
    ['წადით სამხრეთით', 'south'], // polite/plural "go south"
  ]
  for (const [input, canon] of cases)
    it(`${input} → ${canon}`, () =>
      expect(parseDirection(input, MOVE)).toBe(canon))

  // `წადი <non-direction>` must NOT become a spurious direction (the LEAD strip
  // only resolves when the remainder is itself a known direction).
  it('წადი ფარანი → null (not a direction)', () =>
    expect(parseDirection('წადი ფარანი', MOVE)).toBe(null))
})
