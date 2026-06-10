import { describe, it, expect, beforeEach } from 'vitest'
import { logMiss, readMisses, installMissDump, MISS_CAP } from './missLog'

beforeEach(() => localStorage.clear())

describe('miss log (spec §6)', () => {
  it('appends entries with turn context (spec §6)', () => {
    logMiss({
      en: 'A weird line.',
      game: 'sig1',
      language: 'fr',
      kind: 'line',
      ctx: 'West of House — Score: 0 Moves: 1',
    })
    expect(readMisses()).toEqual([
      expect.objectContaining({
        en: 'A weird line.',
        kind: 'line',
        ctx: 'West of House — Score: 0 Moves: 1',
      }),
    ])
  })
  it('caps as a ring buffer (oldest dropped)', () => {
    for (let i = 0; i < MISS_CAP + 5; i++)
      logMiss({ en: `line ${i}`, game: 's', language: 'fr', kind: 'line' })
    const all = readMisses()
    expect(all).toHaveLength(MISS_CAP)
    expect(all[0].en).toBe('line 5')
  })
  it('survives corrupt storage (falls back to empty)', () => {
    localStorage.setItem('loquor.xlate.misses', '{nope')
    expect(readMisses()).toEqual([])
    logMiss({ en: 'x', game: 's', language: 'fr', kind: 'status' })
    expect(readMisses()).toHaveLength(1)
  })
  it('installMissDump exposes window.loquorMisses()', () => {
    installMissDump()
    logMiss({ en: 'x', game: 's', language: 'fr', kind: 'line' })
    const fn = (window as unknown as { loquorMisses: () => unknown[] })
      .loquorMisses
    expect(fn()).toHaveLength(1)
  })
})
