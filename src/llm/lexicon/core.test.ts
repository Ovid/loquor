// src/llm/lexicon/core.test.ts — shared core-lexicon tests (tasks 5–7).
import { describe, it, expect } from 'vitest'
import { fold } from './fold'
import { FR_CORE } from './fr.core'

describe('fr core lexicon', () => {
  it('covers every UAT-discovered verb trap', () => {
    // F-M pose→take inverse; F-N agite/secoue; F-X sonne; F-CC remonte; F-Q lâche
    expect(FR_CORE.verbs['pose']).toBe('drop')
    expect(FR_CORE.verbs['poser']).toBe('drop')
    expect(FR_CORE.verbs['lache']).toBe('drop') // stored folded (lâche)
    expect(FR_CORE.verbs['agite']).toBe('wave')
    expect(FR_CORE.verbs['secoue']).toBe('wave')
    expect(FR_CORE.verbs['sonne']).toBe('ring')
    expect(FR_CORE.verbs['remonte']).toBe('wind up')
    expect(FR_CORE.verbs['gonfle']).toBe('inflate') // F-R
    expect(FR_CORE.verbIdioms).toContainEqual({
      phrase: 'laisse tomber',
      to: 'drop',
    })
  })

  it('meta aliases include the localized meta gaps (F5, F-U)', () => {
    expect(FR_CORE.metaAliases['inventaire']).toBe('inventory')
    expect(FR_CORE.metaAliases['diagnostic']).toBe('diagnose')
    expect(FR_CORE.metaAliases['sauvegarde']).toBe('save')
    expect(FR_CORE.metaAliases['recommence']).toBe('restart')
  })

  it('all keys/phrases are stored folded (no diacritics, lowercase)', () => {
    const all = [
      ...Object.keys(FR_CORE.verbs),
      ...FR_CORE.verbIdioms.map(v => v.phrase),
      ...Object.keys(FR_CORE.preps),
      ...FR_CORE.articles,
      ...Object.keys(FR_CORE.metaAliases),
    ]
    for (const k of all) {
      expect(k).toBe(k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())
      // And the real fold() must be a no-op on stored data (idempotent store).
      expect(fold(k)).toBe(k)
    }
  })

  it('has no particle verbs (French idioms are contiguous)', () => {
    expect(FR_CORE.particleVerbs).toEqual([])
  })
})
