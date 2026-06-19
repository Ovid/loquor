// src/llm/lexicon/parse.fr-uat.test.ts
// French cross-language verification — the shared puzzle verbs (songbird,
// echo, boat-exit, quantifier-all) already pass; pin them so an es-driven
// change can't regress fr. (Characterized 2026-06-19.)
//
// Friction-tier cognate notes (es task: tapa/jade/calavera de cristal/del/todo):
//   - 'tapa' (lid/machine): French uses 'couvercle' → already mapped to 'machine'
//     in fr.zork1.ts ("couvercle = the machine's lid"). No surface gap.
//   - 'jade' (jade figurine): French 'jade' is the same word in FR, already in
//     fr.zork1.ts entry for 'jade figurine': ['figurine', 'statuette',
//     'figurine de jade', 'jade']. No surface gap.
//   - 'calavera de cristal' (crystal skull): French 'crâne de cristal' → 'crane
//     de cristal' (folded). fr.zork1.ts has 'crystal skull': ['crane', 'crane de
//     cristal']. No surface gap.
//   - 'del' (contraction: de + el in ES): FR equivalent is 'du' (de + le),
//     already in fr.core.ts articles list. No surface gap.
//   - 'todo' quantifier → 'all': FR uses 'tout/tous/toute/toutes', already in
//     fr.core.ts quantifiersAll. Pinned below as the "prends tout" test.
//
// All friction-tier cognates already resolve in French — no additional pins needed.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { FR_CORE } from './fr.core'
import { FR_ZORK1 } from './fr.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const inScope = (...c: string[]): Scene => ({
  inScope: c.map(x => ({ canonical: x })),
  antecedent: null,
})
const fr = (clause: string, scene: Scene = empty) =>
  parseLexicon(clause, FR_CORE, FR_ZORK1, ZORK1_VOCAB, scene)

describe('French cross-language pins (parity with es fixes)', () => {
  it('songbird: "remonte le canari" → wind up canary', () => {
    expect(fr('remonte le canari')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
  it('Loud Room: "echo" → echo', () => {
    expect(fr('echo')).toEqual({ kind: 'command', text: 'echo' })
  })
  it('boat exit: "sors du bateau" → exit raft', () => {
    expect(fr('sors du bateau', inScope('magic boat'))).toEqual({
      kind: 'command',
      text: 'exit raft',
    })
  })
  it('quantifier: "prends tout" → take all', () => {
    expect(fr('prends tout')).toEqual({ kind: 'command', text: 'take all' })
  })
})
