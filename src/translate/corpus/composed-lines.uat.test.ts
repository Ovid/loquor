import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from '../match'
import { ZORK1_FR } from './zork1.fr'
import { ZORK1_DE } from './zork1.de'
import { ZORK1_ES } from './zork1.es'
import { ZORK1_KA } from './zork1.ka'

// Cross-language pins for runtime-composed lines found in UAT (2026-06-19).
// These are off the walkthrough AND not full-line z-strings, so the coverage
// and inventory gates structurally cannot see them — they leaked English in
// EVERY language until pinned. "A fix in one language is a fix in all of them"
// (CLAUDE.md), so assert every output-translation corpus covers them.
const CORPORA = [
  ['fr', ZORK1_FR],
  ['de', ZORK1_DE],
  ['es', ZORK1_ES],
  ['ka', ZORK1_KA],
] as const

describe.each(CORPORA)('composed-line UAT fixes — %s', (_lang, corpus) => {
  const c = compileCorpus(corpus)
  const translated = (en: string) => {
    const out = matchLine(c, en)
    expect(out).not.toBeNull()
    expect(out).not.toBe(en) // translated, not echoed English
    return out
  }

  // C: "open mailbox" reveal — the first command most players type.
  it('C: "Opening the small mailbox reveals a leaflet." translates', () => {
    translated('Opening the small mailbox reveals a leaflet.')
  })
})
