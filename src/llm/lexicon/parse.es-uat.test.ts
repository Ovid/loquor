// src/llm/lexicon/parse.es-uat.test.ts
// Spanish UAT regression suite — pins each input mis-map confirmed by
// characterization (2026-06-19) against the SHIPPING ES_CORE + ES_ZORK1
// lexicons and the real ZORK1_VOCAB, so a regression in either surfaces here.
// Mirrors parse.de-uat.test.ts.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { ES_CORE } from './es.core'
import { ES_ZORK1 } from './es.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const inScope = (...canonicals: string[]): Scene => ({
  inScope: canonicals.map(c => ({ canonical: c })),
  antecedent: null,
})
const es = (clause: string, scene: Scene = empty) =>
  parseLexicon(clause, ES_CORE, ES_ZORK1, ZORK1_VOCAB, scene)

describe('Spanish UAT — idioms', () => {
  it('Songbird: "da/dale cuerda al canario" → wind up canary', () => {
    expect(es('da cuerda al canario')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
    expect(es('dale cuerda al canario')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
})

describe('Spanish UAT — verbs', () => {
  it('Loud Room: "eco" → echo (the puzzle solution)', () => {
    expect(es('eco')).toEqual({ kind: 'command', text: 'echo' })
  })
  it('"deja todo" / "coge todo" → drop/take all', () => {
    expect(es('deja todo')).toEqual({ kind: 'command', text: 'drop all' })
    expect(es('coge todo')).toEqual({ kind: 'command', text: 'take all' })
  })
  it('regression guard: "apaga las velas" → extinguish candles (already fixed)', () => {
    expect(es('apaga las velas', inScope('pair of candles'))).toEqual({
      kind: 'command',
      text: 'extinguish candles',
    })
  })
  it('Boat exit: "sal del bote" → exit (the boat resolves via scene)', () => {
    expect(es('sal del bote', inScope('magic boat'))).toEqual({
      kind: 'command',
      text: 'exit raft',
    })
    // Without scene context 'bote' is ambiguous (magic boat + punctured boat);
    // the shared dict word 'boat' disambiguates → 'exit boat' (ground truth).
    expect(es('sal del bote')).toEqual({ kind: 'command', text: 'exit boat' })
  })
})
