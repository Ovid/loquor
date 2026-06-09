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
  it('strips terminal punctuation only', () => {
    expect(fold('ouvre la trappe!')).toBe('ouvre la trappe')
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
