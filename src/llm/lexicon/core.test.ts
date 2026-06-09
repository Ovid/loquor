// src/llm/lexicon/core.test.ts — shared core-lexicon tests (tasks 5–7).
import { describe, it, expect } from 'vitest'
import { fold } from './fold'
import { FR_CORE } from './fr.core'
import { DE_CORE } from './de.core'
import { ES_CORE } from './es.core'
import type { CoreLexicon } from './types'

/** Every stored string field of a core lexicon — keys AND values. Canonical
 * English targets ('wind up', 'turn off') must also be fold-idempotent
 * (lowercase ASCII), so they are included. */
function storedStrings(core: CoreLexicon): string[] {
  return [
    ...Object.keys(core.verbs),
    ...Object.values(core.verbs),
    ...core.verbIdioms.flatMap(v => [v.phrase, v.to]),
    ...core.particleVerbs.flatMap(p => [p.verb, p.particle, p.to]),
    ...Object.keys(core.preps),
    ...Object.values(core.preps),
    ...core.articles,
    ...core.pronounsDirect,
    ...core.pronounsContainer,
    ...core.pronounsSelf,
    ...Object.keys(core.metaAliases),
    ...Object.values(core.metaAliases),
  ]
}

describe.each<[string, CoreLexicon]>([
  ['fr', FR_CORE],
  ['de', DE_CORE],
  ['es', ES_CORE],
])('%s core lexicon folded-storage invariant', (_lang, core) => {
  it('fold() is a no-op on every stored string (idempotent store)', () => {
    for (const k of storedStrings(core)) {
      expect(fold(k)).toBe(k)
    }
  })
})

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

  it('has no particle verbs (French idioms are contiguous)', () => {
    expect(FR_CORE.particleVerbs).toEqual([])
  })
})

describe('de core lexicon', () => {
  it('separable verbs are particle patterns, never bare-stem verb entries', () => {
    expect(DE_CORE.particleVerbs).toContainEqual({
      verb: 'schalte',
      particle: 'ein',
      to: 'turn on',
    })
    expect(DE_CORE.particleVerbs).toContainEqual({
      verb: 'schalte',
      particle: 'aus',
      to: 'turn off',
    })
    expect(DE_CORE.particleVerbs).toContainEqual({
      verb: 'mach',
      particle: 'auf',
      to: 'open',
    })
    expect(DE_CORE.particleVerbs).toContainEqual({
      verb: 'hebe',
      particle: 'auf',
      to: 'take',
    })
    // The bare stem must NOT be a verb entry — 'mach' alone ≈ make (spec §5.1)
    expect(DE_CORE.verbs['mach']).toBeUndefined()
    expect(DE_CORE.verbs['schalte']).toBeUndefined()
  })
  it('particles come from the closed set', () => {
    const allowed = new Set([
      'ein',
      'aus',
      'an',
      'auf',
      'zu',
      'ab',
      'um',
      'hoch',
      'runter',
    ])
    for (const p of DE_CORE.particleVerbs)
      expect(allowed.has(p.particle)).toBe(true)
  })
  it('covers core verbs + meta aliases', () => {
    expect(DE_CORE.verbs['nimm']).toBe('take')
    expect(DE_CORE.verbs['offne']).toBe('open') // folded öffne
    expect(DE_CORE.verbs['greife']).toBe('take') // greifen = grasp/seize; attack only via 'greife … an'
    expect(DE_CORE.verbs['lausche']).toBe('listen to') // bare 'listen' is not in extracted vocab
    expect(DE_CORE.metaAliases['inventar']).toBe('inventory')
  })
})

describe('es core lexicon', () => {
  it('covers core verbs incl. attached-clitic imperatives as idiom data', () => {
    expect(ES_CORE.verbs['toma']).toBe('take')
    expect(ES_CORE.verbs['coge']).toBe('take')
    expect(ES_CORE.verbs['abre']).toBe('open')
    expect(ES_CORE.verbs['suelta']).toBe('drop')
    expect(ES_CORE.verbs['deja']).toBe('drop')
  })
  it('meta aliases include inventario (F5)', () => {
    expect(ES_CORE.metaAliases['inventario']).toBe('inventory')
  })
  it('no particle verbs', () => {
    expect(ES_CORE.particleVerbs).toEqual([])
  })
})
