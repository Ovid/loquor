// src/llm/lexicon/core.test.ts — shared core-lexicon tests (tasks 5–7).
import { describe, it, expect } from 'vitest'
import { fold } from './fold'
import { FR_CORE } from './fr.core'
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

// Tasks 6–7 (de, es) add their tuples here.
describe.each<[string, CoreLexicon]>([['fr', FR_CORE]])(
  '%s core lexicon folded-storage invariant',
  (_lang, core) => {
    it('fold() is a no-op on every stored string (idempotent store)', () => {
      for (const k of storedStrings(core)) {
        expect(fold(k)).toBe(k)
      }
    })
  },
)

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
