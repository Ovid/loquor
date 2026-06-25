// src/llm/lexicon/parse.ka-uat.test.ts
// Georgian UAT regression suite — pins puzzle-critical commands + confirmed
// findings against the SHIPPING KA_CORE + KA_ZORK1 and the real ZORK1_VOCAB.
// Mirrors parse.es-uat.test.ts. NATIVE-REVIEW-DRAFT fixtures.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import { isMetaCommand } from '../inputTranslate'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const inScope = (...canonicals: string[]): Scene => ({
  inScope: canonicals.map(canonical => ({ canonical })),
  antecedent: null,
})
const ka = (clause: string, scene: Scene = empty) =>
  parseLexicon(clause, KA_CORE, KA_ZORK1, ZORK1_VOCAB, scene)

describe('Georgian UAT — instrumental & dative', () => {
  it('-ით instrumental: turn bolt with wrench', () => {
    // walkthrough fixture: 'მოატრიალე ხრახნი სასხლეტით' → 'turn bolt with wrench'
    // სასხლეტი is the lexicon word for wrench (not მოქლონი).
    // expandGeorgian splits სასხლეტით → [ით, სასხლეტ].
    expect(ka('მოატრიალე ხრახნი სასხლეტით')).toEqual({
      kind: 'command',
      text: 'turn bolt with wrench',
    })
  })
  it('G1 dative: tie rope to railing', () => {
    // walkthrough fixture: 'მიაბი თოკი მოაჯირს' → 'tie rope to railing'
    // -ს (dative) is NOT split by expandGeorgian; the G1 dative path emits
    // '<verb> <obj> to <recipient>'.
    expect(ka('მიაბი თოკი მოაჯირს')).toEqual({
      kind: 'command',
      text: 'tie rope to railing',
    })
  })
})

describe('Georgian UAT — idioms & nominative', () => {
  it('wind up canary', () => {
    // walkthrough fixture: 'დააქოქე კანარა' → 'wind up canary'
    expect(ka('დააქოქე კანარა')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
  it('nominative -ი strip resolves the lamp', () => {
    // walkthrough fixture: 'აიღე ფარანი' → 'take lamp'
    // ფარანი strips to ფარან (shared synonym across brass/broken/burned-out lanterns);
    // the shared dictionary word is 'lamp', NOT 'brass lantern'.
    expect(ka('აიღე ფარანი')).toEqual({
      kind: 'command',
      text: 'take lamp',
    })
  })
})

describe('Georgian UAT — scope disambiguation', () => {
  it('კანარა without scope: shared "canary" (ambiguous canaries)', () => {
    // Both golden and broken clockwork canary share the synonym 'კანარა'.
    // Without scope, resolveNoun emits the shared dictionary word.
    expect(ka('აიღე კანარა')).toEqual({ kind: 'command', text: 'take canary' })
  })
  it('კანარა in scope of golden canary: resolves to that candidate', () => {
    // With only the golden canary in scope, the resolver prefers the scoped
    // object — whose emit is still 'canary', so the surface matches the
    // shared-word path above (this guards against a regression to null/miss).
    expect(ka('აიღე კანარა', inScope('golden clockwork canary'))).toEqual({
      kind: 'command',
      text: 'take canary',
    })
  })
})

// M-C — finding-8: meta verbs stay reachable for ka. Meta is resolved UPSTREAM of
// parseLexicon (isMetaCommand runs at the pipeline's meta stage; Georgian meta
// words via core.metaAliases at the alias stage), so pin it at that layer, NOT by
// calling parseLexicon('save'). (isMetaCommand imported at top.)
describe('Georgian UAT — meta verbs (finding-8)', () => {
  it('English meta verbs are recognized for any language (save/quit/score/restart)', () => {
    // 'i' and 'l' are in-world game shortcuts (inventory/look), NOT meta —
    // they route through the lexicon/verb path, not isMetaCommand.
    for (const m of ['save', 'quit', 'score', 'restart', 'again'])
      expect(isMetaCommand(m)).toBe(true)
  })
  it('Georgian meta aliases map to raw English meta', () => {
    expect(KA_CORE.metaAliases['ინვენტარი']).toBe('inventory')
    expect(KA_CORE.metaAliases['გასვლა']).toBe('quit')
  })
})
