import { describe, it, expect } from 'vitest'
import { corpusFor } from './index'
import { ZORK1_SIG, ZORK2_SIG } from '../../llm/grammar/index'

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
  it('returns null for en / off (hook is a no-op passthrough)', () => {
    expect(corpusFor(ZORK1_SIG, 'en')).toBeNull()
    expect(corpusFor(ZORK1_SIG, 'off')).toBeNull()
  })
  it('returns null for a game or language without a corpus', () => {
    expect(corpusFor(ZORK2_SIG, 'fr')).toBeNull()
    expect(corpusFor('unknown-sig', 'fr')).toBeNull()
  })
})
