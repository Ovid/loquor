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
  // UAT-4: corpus re-activation (language re-switch, HMR, session restore)
  // re-scans the transcript and re-logged every on-screen miss — the same
  // gap piled up 7× for 2 occurrences. The log is a SET of distinct gaps:
  // one entry per (game, language, en), the original kept (first ctx wins).
  it('dedupes a re-logged gap: same (game, language, en) records once, first ctx kept', () => {
    logMiss({
      en: 'A weird line.',
      game: 's',
      language: 'fr',
      kind: 'line',
      ctx: 'first',
    })
    logMiss({
      en: 'A weird line.',
      game: 's',
      language: 'fr',
      kind: 'backlog',
      ctx: 'second',
    })
    const all = readMisses()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ kind: 'line', ctx: 'first' })
  })
  it('a different language, game, or line is NOT a duplicate', () => {
    logMiss({ en: 'A weird line.', game: 's', language: 'fr', kind: 'line' })
    logMiss({ en: 'A weird line.', game: 's', language: 'de', kind: 'line' })
    logMiss({ en: 'A weird line.', game: 's2', language: 'fr', kind: 'line' })
    logMiss({ en: 'Another line.', game: 's', language: 'fr', kind: 'line' })
    expect(readMisses()).toHaveLength(4)
  })
  it('survives corrupt storage (falls back to empty)', () => {
    localStorage.setItem('loquor.xlate.misses', '{nope')
    expect(readMisses()).toEqual([])
    logMiss({ en: 'x', game: 's', language: 'fr', kind: 'status' })
    expect(readMisses()).toHaveLength(1)
  })
  it('drops well-formed-but-foreign elements, keeping only valid entries (review S5)', () => {
    // A valid JSON array whose elements are not MissEntry-shaped (a foreign
    // blob under the same key, or a future/older schema) was cast through
    // unchecked — degrading type safety and able to break the dedup .some()
    // silently. Each element is validated minimally; invalid ones drop, so a
    // wholly-foreign blob self-heals to [].
    localStorage.setItem(
      'loquor.xlate.misses',
      JSON.stringify([
        'a bare string',
        { en: 'no game/language' },
        null,
        { en: 'ok', game: 's', language: 'fr', kind: 'line' },
      ]),
    )
    expect(readMisses()).toEqual([
      { en: 'ok', game: 's', language: 'fr', kind: 'line' },
    ])
    // and a logMiss after the corrupt read still dedups correctly
    logMiss({ en: 'ok', game: 's', language: 'fr', kind: 'backlog' })
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
