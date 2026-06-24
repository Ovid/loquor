// src/llm/lexicon/parse.ka.test.ts
// Georgian-specific parse cases (spec §3.2 postposition+case, G1 dative path).
// ka is OUTPUT-ONLY today; these exercise the Phase-2 INPUT pipeline directly
// against KA_CORE / KA_ZORK1, the same parse.ts the fr/de/es cases use.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const ka = (c: string) => parseLexicon(c, KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty)

describe('Georgian parse — postposition + case (spec §3.2, G1)', () => {
  it('instrumental -ით: kill troll with sword', () => {
    // მოკალი ტროლი მახვილით → kill troll with sword. expandGeorgian splits
    // მახვილით → [ით, მახვილ]; the existing prep-split emits the instrument.
    expect(ka('მოკალი ტროლი მახვილით')).toEqual({
      kind: 'command',
      text: 'kill troll with sword',
    })
  })
  it('inessive -ში: put coal in machine', () => {
    // ჩადე ნახშირი მანქანაში → put coal in machine. მანქანაში → [ში, მანქანა].
    expect(ka('ჩადე ნახშირი მანქანაში')).toEqual({
      kind: 'command',
      text: 'put coal in machine',
    })
  })
  it('G1 dative recipient: give egg to thief', () => {
    // მიეცი კვერცხი ქურდს → give egg to thief. -ს (dative) is NOT split by
    // expandGeorgian (it collides with genitive -ის), so tokens = [კვერცხ,
    // ქურდს]; the G1 dative path emits `<verb> <obj> to <recipient>`. egg is an
    // ambiguous noun (broken/jeweled), so resolveNoun emits the shared 'egg'.
    expect(ka('მიეცი კვერცხი ქურდს')).toEqual({
      kind: 'command',
      text: 'give egg to thief',
    })
  })
})
