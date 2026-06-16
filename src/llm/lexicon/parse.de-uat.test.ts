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
const inScope = (...canonicals: string[]): Scene => ({
  inScope: canonicals.map(c => ({ canonical: c })),
  antecedent: null,
})
const de = (clause: string, scene: Scene = empty) =>
  parseLexicon(clause, DE_CORE, DE_ZORK1, ZORK1_VOCAB, scene)

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

describe('German UAT — verbs (notes/uat-de-findings.md)', () => {
  it('F7 (DEATH-TRAP): "lösche/puste/blase … aus" → extinguish, never a lighting verb', () => {
    for (const c of [
      'lösche die kerzen aus',
      'puste die kerzen aus',
      'blase die kerzen aus',
    ])
      expect(de(c)).toEqual({ kind: 'command', text: 'extinguish candles' })
  })

  it('F5: bare "klettere/steige hinunter" → down (climb down is verbs1, would miss)', () => {
    for (const c of [
      'klettere hinunter',
      'klettere hinab',
      'klettere runter',
      'steige hinunter',
      'steig runter',
    ])
      expect(de(c)).toEqual({ kind: 'command', text: 'down' })
  })

  it('F5: "klettere hinauf/hoch" → up', () => {
    expect(de('klettere hinauf')).toEqual({ kind: 'command', text: 'up' })
    expect(de('steig hoch')).toEqual({ kind: 'command', text: 'up' })
  })

  it('F25 (puzzle-critical): a German launch verb exists for the boat', () => {
    // 'launch' is FIND-default, so the bare verb finds the vehicle.
    // ('boot' is ambiguous magic/punctured boat; the live scene disambiguates.)
    expect(de('starte das boot', inScope('magic boat'))).toEqual({
      kind: 'command',
      text: 'launch raft',
    })
    expect(de('fahr los')).toEqual({ kind: 'command', text: 'launch' })
  })

  it('F15: bare "alles"/"alle" quantifier → take/drop all', () => {
    expect(de('nimm alles')).toEqual({ kind: 'command', text: 'take all' })
    expect(de('nimm alle')).toEqual({ kind: 'command', text: 'take all' })
    // 'lass alles fallen' — the drop particle wraps the quantifier remainder.
    expect(de('lass alles fallen')).toEqual({
      kind: 'command',
      text: 'drop all',
    })
  })
})
