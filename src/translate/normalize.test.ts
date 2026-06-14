import { describe, it, expect } from 'vitest'
import { normalize, splitIndent, untranslatable } from './normalize'

describe('normalize (spec §4)', () => {
  it('collapses whitespace runs and trims', () => {
    expect(normalize('  Score:   0   Moves: 1 ')).toBe('Score: 0 Moves: 1')
  })
  it('preserves case and punctuation', () => {
    expect(normalize('Taken.')).toBe('Taken.')
    expect(normalize("You can't go that way.")).toBe("You can't go that way.")
  })
  it('empty / whitespace-only → empty string', () => {
    expect(normalize('   ')).toBe('')
  })
})

describe('untranslatable (prompt chrome / empty lines)', () => {
  it("empty and the bare '>' prompt are untranslatable", () => {
    expect(untranslatable('')).toBe(true)
    expect(untranslatable('>')).toBe(true)
  })
  it('prose is translatable', () => {
    expect(untranslatable('Taken.')).toBe(false)
    expect(untranslatable('> ahead')).toBe(false)
  })
})

describe('splitIndent (spec §4 listing indentation)', () => {
  it('splits leading whitespace from the body', () => {
    expect(splitIndent('  A quantity of water')).toEqual({
      indent: '  ',
      body: 'A quantity of water',
    })
  })
  it('no indent → empty prefix', () => {
    expect(splitIndent('Taken.')).toEqual({ indent: '', body: 'Taken.' })
  })
})
