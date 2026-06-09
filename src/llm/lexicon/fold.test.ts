// src/llm/lexicon/fold.test.ts
import { describe, it, expect } from 'vitest'
import { fold, tokenize } from './fold'

describe('fold', () => {
  it('lowercases and strips diacritics (UAT: decends/descends both match)', () => {
    expect(fold('Épée')).toBe('epee')
    expect(fold('öffne')).toBe('offne')
    expect(fold('niño')).toBe('nino')
  })
  it('splits elisions and clitic hyphens into spaces', () => {
    expect(fold("l'épée")).toBe('l epee')
    expect(fold('prends-le')).toBe('prends le')
    expect(fold('examine-moi')).toBe('examine moi')
  })
  it('splits curly-apostrophe elisions (U+2019)', () => {
    expect(fold('l’épée')).toBe('l epee')
  })
  it('folds ß to ss so schließe/schliesse match', () => {
    expect(fold('schließe')).toBe('schliesse')
    expect(fold('SCHLIESSE')).toBe(fold('schließe'))
    expect(fold('ẞ')).toBe('ss')
  })
  it('strips terminal punctuation only', () => {
    expect(fold('ouvre la trappe!')).toBe('ouvre la trappe')
  })
  it('strips terminal punctuation even with trailing whitespace', () => {
    expect(fold('ouvre la trappe! ')).toBe('ouvre la trappe')
  })
  it('strips Spanish inverted punctuation', () => {
    expect(fold('¡enciende la lampara!')).toBe('enciende la lampara')
    expect(fold('¿que hay aqui?')).toBe('que hay aqui')
  })
})

describe('tokenize', () => {
  it('folds then splits on whitespace', () => {
    expect(tokenize('Ouvre  la boîte aux lettres.')).toEqual([
      'ouvre',
      'la',
      'boite',
      'aux',
      'lettres',
    ])
  })
  it('returns [] for blank input', () => {
    expect(tokenize('   ')).toEqual([])
  })
})
