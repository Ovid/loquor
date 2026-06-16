// src/llm/lexicon/parse.de-uat.test.ts
// German UAT regression suite — pins each input mis-map found in the real
// Zork I German playthrough (notes/uat-de-findings.md). Unlike parse.test.ts's
// hand-built fixture, these run the SHIPPING DE_CORE + DE_ZORK1 lexicons
// against the real ZORK1_VOCAB, so a regression in either surfaces here.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { DE_CORE } from './de.core'
import { DE_ZORK1 } from './de.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const de = (clause: string) =>
  parseLexicon(clause, DE_CORE, DE_ZORK1, ZORK1_VOCAB, empty)

describe('German UAT — noun surface forms (notes/uat-de-findings.md)', () => {
  it('F12: "lederbeutel" (the game\'s floor noun) → take coins', () => {
    expect(de('nimm den lederbeutel')).toEqual({
      kind: 'command',
      text: 'take coins',
    })
  })

  it('F20: bauble floor noun "messingkugel"/"kugel" → take bauble', () => {
    expect(de('nimm die messingkugel')).toEqual({
      kind: 'command',
      text: 'take bauble',
    })
    expect(de('nimm die kugel')).toEqual({
      kind: 'command',
      text: 'take bauble',
    })
  })

  it('F24: compound "kristalldreizack" → take trident', () => {
    expect(de('nimm den kristalldreizack')).toEqual({
      kind: 'command',
      text: 'take trident',
    })
  })

  it('F22: bare "topf" + destination resolves deterministically → put pot in case', () => {
    expect(de('lege den topf in die vitrine')).toEqual({
      kind: 'command',
      text: 'put pot in case',
    })
  })

  it('F28: accusative "diamanten" + destination → put diamond in cage/case', () => {
    expect(de('lege den diamanten in den korb')).toEqual({
      kind: 'command',
      text: 'put diamond in cage',
    })
    expect(de('lege den diamanten in die vitrine')).toEqual({
      kind: 'command',
      text: 'put diamond in case',
    })
  })
})
