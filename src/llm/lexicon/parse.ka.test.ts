// src/llm/lexicon/parse.ka.test.ts
// Georgian-specific parse cases (spec §3.2 postposition+case, G1 dative path).
// ka is OUTPUT-ONLY today; these exercise the Phase-2 INPUT pipeline directly
// against KA_CORE / KA_ZORK1, the same parse.ts the fr/de/es cases use.
import { describe, it, expect } from 'vitest'
import { parseLexicon, resolveNounReply } from './parse'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const ka = (c: string) => parseLexicon(c, KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty)
const kaReply = (r: string) =>
  resolveNounReply(r, KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty)

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
  it('inessive into the dual-listed trophy case (I2 distribution payoff)', () => {
    // After distributePrepTail shares the fused ვიტრინაში across the casing
    // conjuncts, each one must parse end-to-end against the REAL lexicon. The
    // destination resolves via the bare head ვიტრინა (the trophy case is
    // dual-listed ჯილდოების ვიტრინა / ვიტრინა — the genitive modifier isn't
    // needed in the case role, so the deferred genitive-compound problem doesn't
    // block it).
    expect(ka('ჩადე კუბო ვიტრინაში')).toEqual({
      kind: 'command',
      text: 'put coffin in case',
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
  it('G1 dative recipient: tie rope to railing', () => {
    // მიაბი თოკი მოაჯირს → tie rope to railing (the other closed-set recipient).
    expect(ka('მიაბი თოკი მოაჯირს')).toEqual({
      kind: 'command',
      text: 'tie rope to railing',
    })
  })
  it('G1 does NOT fire for a non-recipient noun whose stem ends in ს (C1)', () => {
    // მიეცი თასი სკარაბეუსი: chalice (თას) + scarab (სკარაბეუს). The scarab stem
    // natively ends in ს — it is NOT a dative recipient. The OLD bare-.endsWith('ს')
    // guard mistranslated this to `give chalice to scarab`; the closed recipient
    // set rejects it, so the two-noun remainder falls through to MISS.
    expect(ka('მიეცი თასი სკარაბეუსი')).toEqual({ kind: 'miss' })
    // ბურთულა + screwdriver (სახრახნის, stem ends in ს): not `give bauble to screwdriver`.
    expect(ka('მიეცი ბურთულა სახრახნისი')).toEqual({ kind: 'miss' })
  })
})

describe('Georgian parse — "all"/"everything" quantifier (I1)', () => {
  it('ყველაფერი (everything) → take/drop all after the -ი strip', () => {
    // expandGeorgian strips the nominative -ი from EVERY object token, so
    // ყველაფერი → ყველაფერ; the quantifier set must hold that bare stem or the
    // most natural "take everything" silently misses (no LLM net for ka).
    expect(ka('აიღე ყველაფერი')).toEqual({ kind: 'command', text: 'take all' })
    expect(ka('დადე ყველაფერი')).toEqual({ kind: 'command', text: 'drop all' })
  })
  it('ყველა (all, vowel-final, strip is a no-op) → take all', () => {
    expect(ka('აიღე ყველა')).toEqual({ kind: 'command', text: 'take all' })
  })
})

describe('resolveNounReply — verbless disambiguation/orphan reply (I3)', () => {
  it('resolves a full Georgian noun phrase to the English noun', () => {
    // "Which button?" answered with the full Georgian noun phrase → the specific
    // English button (the bare ღილაკ is ambiguous, so the adjective is needed).
    expect(kaReply('ყვითელი ღილაკი')).toBe('yellow button')
    expect(kaReply('წითელი ღილაკი')).toBe('red button')
  })
  it('resolves a single-word recipient/orphan answer', () => {
    expect(kaReply('ქურდი')).toBe('thief') // "give egg to whom?" → thief
    expect(kaReply('ვიტრინა')).toBe('case') // "put coffin in what?" → trophy case
  })
  it('misses a bare adjective (no standalone entry) → caller hints', () => {
    // "ყვითელი" (yellow) alone has no noun, so it can't resolve — the player gets
    // the "answer with the full item name" hint instead.
    expect(kaReply('ყვითელი')).toBeNull()
  })
  it('misses an empty reply', () => {
    expect(kaReply('')).toBeNull()
  })
})
