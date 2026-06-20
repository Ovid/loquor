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

  // D: `take all` lists each object's outcome; the per-object FAILURE reasons
  // (carpet/trophy case) had no "{obj}: <reason>" template, so the whole line
  // missed and leaked English — in every language. Pin both observed reasons.
  it('D: "<obj>: The rug is extremely heavy and cannot be carried." translates', () => {
    translated('carpet: The rug is extremely heavy and cannot be carried.')
  })
  it('D: "<obj>: The trophy case is securely fastened to the wall." translates', () => {
    translated('trophy case: The trophy case is securely fastened to the wall.')
  })

  // E: incomplete `put X` (no destination) → the parser asks "What do you want
  // to put the {obj} in?" (gparser.zil). Off-walkthrough, runtime-composed, so
  // both gates miss it; it leaked RAW English in every language (UAT 2026-06-20
  // — es/fr confirmed live, ka has no LLM fallback at all). The object slot is
  // the player's ECHOED noun, which can be a lexicon-emit synonym that is NOT an
  // object-table key ("advertisement" for the leaflet) — so the template must
  // bind {raw} (any token), not {obj} (table-only), or that synonym still leaks.
  it('E: "What do you want to put the {obj} in?" translates (advertisement synonym)', () => {
    translated('What do you want to put the advertisement in?')
  })
  it('E: "What do you want to put the {obj} in?" translates (known object)', () => {
    translated('What do you want to put the leaflet in?')
  })
})
