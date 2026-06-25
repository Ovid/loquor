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
  it('G1 dative recipient: multi-word (adjective) object → give diamond to thief', () => {
    // "მიეცი უზარმაზარი ბრილიანტი ქურდს" (give the huge diamond to the thief).
    // The object is adjective+noun, so after the dative -ს stays on ქურდს the
    // remainder is THREE tokens. The recipient is the LAST token; the object span
    // is everything before it. The old `tokens.length === 2` guard rejected the
    // qualified object and missed with no LLM net.
    expect(ka('მიეცი უზარმაზარი ბრილიანტი ქურდს')).toEqual({
      kind: 'command',
      text: 'give diamond to thief',
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

describe('Georgian parse — multi-word objects in case roles (split-point rejoin)', () => {
  it('k=1: put painting in the full-form trophy case (1 genitive modifier)', () => {
    // ჯილდოების ვიტრინაში → [ში, ვიტრინა]; the genitive ჯილდოების is stranded
    // before the prep. The rejoin shifts it across: object = painting,
    // instrument = 'ჯილდოების ვიტრინა' (a stored synonym) → trophy case ('case').
    expect(ka('ჩადე ნახატი ჯილდოების ვიტრინაში')).toEqual({
      kind: 'command',
      text: 'put painting in case',
    })
  })
  it('2 stranded instrument modifiers, single-token object (loop commits at k=1)', () => {
    // ხელის ჰაერის ტუმბოით → [ხელის, ჰაერის, ით, ტუმბო]; TWO modifiers stranded.
    // The OBJECT is single-token (პლასტმას → valve), so the very first split (loop
    // k=1) already resolves both halves: object = [პლასტმას], instrument = the whole
    // modifier run + head 'ხელის ჰაერის ტუმბო' (stored) → pump. "2 modifiers" ≠ "loop
    // k=2"; the next test is the one that actually advances the loop past k=1.
    expect(ka('გაბერე პლასტმასი ხელის ჰაერის ტუმბოით')).toEqual({
      kind: 'command',
      text: 'inflate valve with pump',
    })
  })
  it('loop advances past k=1: multi-word object whose first token is not a noun', () => {
    // ჩადე უზარმაზარი ბრილიანტი ჯილდოების ვიტრინაში → put huge diamond in trophy case.
    // expandGeorgian → [უზარმაზარ, ბრილიანტ, ჯილდოების, ში, ვიტრინა]; prep ში splits off
    // objSpan = [უზარმაზარ, ბრილიანტ, ჯილდოების]. The object is adjective+noun AND the
    // genitive ჯილდოების is a stranded instrument modifier, so the whole span fails.
    // k=1 fails — უზარმაზარ ('huge') alone is NOT a noun synonym (only 'უზარმაზარ
    // ბრილიანტ'/'ბრილიანტ' are) — so the loop MUST advance to k=2, where object =
    // 'უზარმაზარ ბრილიანტ' (diamond) and instrument = 'ჯილდოების ვიტრინა' (case) both
    // resolve. This is the only fixture that exercises the k≥2 branch of the loop.
    expect(ka('ჩადე უზარმაზარი ბრილიანტი ჯილდოების ვიტრინაში')).toEqual({
      kind: 'command',
      text: 'put diamond in case',
    })
  })
  it('mis-bind guard: a multi-word object that resolves whole is never split', () => {
    // 'დიდ ზურმუხტ' (large emerald, adjective + noun) resolves as ONE noun before
    // the prep, so obj is non-null and the rejoin search never runs — the command
    // parses normally to 'put emerald in case'.
    expect(ka('ჩადე დიდ ზურმუხტი ვიტრინაში')).toEqual({
      kind: 'command',
      text: 'put emerald in case',
    })
  })
  it('egg full ablative (broken): take canary from the full-form broken egg', () => {
    // -დან leaves the stem -ი ('კვერცხი'); the rejoin re-joins the two adjective
    // modifiers across the prep: object=canary, instrument='გატეხილ თვლებიან კვერცხი'
    // → broken egg ('broken egg'). Needs the residue synonym on the lexicon entry.
    expect(ka('აიღე კანარა გატეხილ თვლებიან კვერცხიდან')).toEqual({
      kind: 'command',
      text: 'take canary from broken egg',
    })
  })
  it('egg full ablative (intact): take canary from the full-form jeweled egg', () => {
    // Same residue, the intact egg entry: instrument='თვლებიან კვერცხი' → jeweled egg.
    expect(ka('აიღე კანარა თვლებიან კვერცხიდან')).toEqual({
      kind: 'command',
      text: 'take canary from jeweled egg',
    })
  })
})
