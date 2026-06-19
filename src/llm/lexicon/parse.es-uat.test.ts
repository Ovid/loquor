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

describe('Spanish UAT — verbs', () => {
  it('Loud Room: "eco" → echo (the puzzle solution)', () => {
    expect(es('eco')).toEqual({ kind: 'command', text: 'echo' })
  })
})
