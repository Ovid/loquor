// src/llm/ka-input-copy.test.ts
// No-English-leak gate for ka INPUT-path copy (CLAUDE.md deterministic coverage):
// every notice a ka player on Zork I can reach must be Georgian, never the English
// byLang fallback (ka has NO LLM net). Plus a Phase-2-semantics gate so the stale
// type-English copy can't creep back.
import { describe, it, expect } from 'vitest'
import {
  commandPlaceholder,
  commandLabel,
  couldntTranslate,
  nothingSent,
  ranOfActions,
  grammarOnlyFirstMiss,
  thinking,
  queuedChip,
  queueFullDropped,
  queueClearedNeedsAnswer,
  GEORGIAN_ACTIVATION_TIP,
} from './notices'
import { helpResponse } from './help'
import { GEORGIAN_STATUS_MARKER } from './config'

const GEORGIAN = /[Ⴀ-ჿ]/
// English PROSE words that must never appear in ka copy. (The deliberate English
// tokens — the quoted escape example, meta-verb names save/restore/…, the status
// marker "alpha", "version", "help" — are allowed; this only catches English
// sentence prose.)
const STRAY_ENGLISH =
  /\b(type|please|command|sorry|understood|queue|dropped|thinking|queued|cleared|answer|actions|ran|translation|failed|timed)\b/i

describe('ka input copy — no English-script leak (gate a)', () => {
  // A Georgian sample line for the dropped-line echo (a ka player types Georgian).
  const kaLine = 'აიღე ფარანი'
  for (const [name, s] of [
    ['placeholder', commandPlaceholder('ka')],
    ['label', commandLabel('ka')],
    ['abstain', couldntTranslate('ka')],
    ['activation', GEORGIAN_ACTIVATION_TIP],
    ['help', helpResponse('ka')],
    ['thinking', thinking('ka')],
    ['queuedChip', queuedChip('ka')],
    ['queueFullDropped', queueFullDropped('ka', kaLine)],
    ['queueClearedNeedsAnswer', queueClearedNeedsAnswer('ka')],
    // The rest are abstain/compound/timeout notices. grammarOnlyFirstMiss +
    // abstain (couldntTranslate) fire for ka today; nothingSent/ranOfActions are
    // LLM-path notices a grammar-only ka player rarely hits — gated anyway as
    // defense-in-depth so a future pipeline change can't reintroduce the leak.
    ['nothingSent.timeout', nothingSent('ka', true)],
    ['nothingSent.failed', nothingSent('ka', false)],
    ['ranOfActions.ok', ranOfActions('ka', 1, 2, 'ok')],
    ['ranOfActions.timeout', ranOfActions('ka', 1, 2, 'timeout')],
    ['ranOfActions.failed', ranOfActions('ka', 1, 2, 'failed')],
    ['grammarOnlyFirstMiss', grammarOnlyFirstMiss('ka')],
  ] as const)
    it(`${name} is Georgian and leaks no stray English prose`, () => {
      expect(GEORGIAN.test(s), `${name} should contain Georgian script`).toBe(
        true,
      )
      expect(STRAY_ENGLISH.test(s), `${name} leaked English prose`).toBe(false)
    })
})

describe('ka input copy — new Phase-2 semantics (gate b)', () => {
  it('activation tip mentions Georgian input + the status marker + the quoted escape', () => {
    expect(GEORGIAN_ACTIVATION_TIP).toMatch(/ქართულ/)
    expect(GEORGIAN_ACTIVATION_TIP).toContain(GEORGIAN_STATUS_MARKER)
    expect(GEORGIAN_ACTIVATION_TIP).toContain('"wind up canary"')
  })
  it('placeholder invites Georgian, not the old type-English-only copy', () => {
    expect(commandPlaceholder('ka')).toMatch(/ქართულ/)
    expect(commandPlaceholder('ka')).not.toBe(
      'აკრიფეთ ინგლისურად — მაგ. open the mailbox',
    )
  })
})
