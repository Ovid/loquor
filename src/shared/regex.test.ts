import { describe, it, expect } from 'vitest'
import { escapeRegExp } from './regex'

describe('escapeRegExp', () => {
  it('escapes metacharacters so the raw string matches itself literally', () => {
    const raw = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o'
    expect(new RegExp(escapeRegExp(raw)).test(raw)).toBe(true)
    expect(escapeRegExp('a.b')).toBe('a\\.b')
    expect(escapeRegExp('[x]')).toBe('\\[x\\]')
  })
  it('leaves ordinary characters (incl. non-ASCII) untouched', () => {
    expect(escapeRegExp('plain text')).toBe('plain text')
    expect(escapeRegExp('საფოსტო ყუთი')).toBe('საფოსტო ყუთი')
  })
})
