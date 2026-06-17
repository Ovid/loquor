import { describe, it, expect } from 'vitest'
import { corpusFor } from './index'
import { ZORK1_SIG, ZORK2_SIG } from '../../llm/grammar/index'
import { ZORK1_KA_STRINGS } from './zork1.ka.strings'

describe('corpusFor (spec §3 passthrough contract)', () => {
  it('returns the Zork I French corpus', () => {
    const c = corpusFor(ZORK1_SIG, 'fr')
    expect(c).not.toBeNull()
    expect(c!.strings).toBeDefined()
    expect(c!.objects).toBeDefined()
    expect(c!.templates).toBeDefined()
  })
  it('returns the Zork I Spanish corpus', () => {
    expect(corpusFor(ZORK1_SIG, 'es')).not.toBeNull()
  })
  it('returns the Zork I German corpus', () => {
    expect(corpusFor(ZORK1_SIG, 'de')).not.toBeNull()
  })
  it('returns the Zork I Georgian corpus', () => {
    expect(corpusFor(ZORK1_SIG, 'ka')).not.toBeNull()
  })
  it('returns null for en / off (hook is a no-op passthrough)', () => {
    expect(corpusFor(ZORK1_SIG, 'en')).toBeNull()
    expect(corpusFor(ZORK1_SIG, 'off')).toBeNull()
  })
  it('returns null for a game or language without a corpus', () => {
    expect(corpusFor(ZORK2_SIG, 'fr')).toBeNull()
    expect(corpusFor('unknown-sig', 'fr')).toBeNull()
  })
})

describe('Georgian corpus correctness (the one machine-detectable gap)', () => {
  // The coverage/inventory/completeness gates prove a Georgian value EXISTS and
  // MATCHES — they do not prove it is correct Georgian (that is the §8 native-
  // review loop's job). The single correctness failure a test CAN catch is a
  // value accidentally left byte-identical to its English key, which matchLine
  // would happily return — reading as "covered" while showing English.
  it('ka: no string value is left byte-identical to its English key (English passthrough)', () => {
    const leaked = Object.entries(ZORK1_KA_STRINGS).filter(
      ([en, ka]) => en === ka,
    )
    expect(leaked.map(([en]) => en)).toEqual([])
  })
})
