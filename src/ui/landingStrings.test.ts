// src/ui/landingStrings.test.ts
// Player-first gate: a language can never ship half-English. Every ActiveLanguage
// must define every LandingCopy field (non-empty), and a subtitle for every game.
import { describe, it, expect } from 'vitest'
import { LANDING_STRINGS, type LandingCopy } from './landingStrings'
import { NL_LANGUAGES } from '../llm/types'
import { GAMES } from '../games/catalog'

const ACTIVE = NL_LANGUAGES.filter(l => l !== 'off') as Array<
  Exclude<(typeof NL_LANGUAGES)[number], 'off'>
>

const SCALAR_KEYS = [
  'howToTitle',
  'howToBody',
  'progressNote',
  'languageLabel',
  'caveat',
  'descent',
  'enter',
  'resume',
  'returnToGame',
  'changeStory',
  'commandExamples',
] as const

const FOOTER_KEYS = ['trademark', 'licenseLinkText', 'githubLinkText'] as const

// Compile-time guard: SCALAR_KEYS / FOOTER_KEYS must each name every field of the
// corresponding LandingCopy shape. Add a field to LandingCopy without listing it
// here and these assignments stop compiling (caught by `tsc -b`) — the runtime
// completeness checks above only cover the keys these arrays list.
type Exhaustive<Listed extends readonly string[], All extends string> =
  [Exclude<All, Listed[number]>] extends [never] ? true : Exclude<All, Listed[number]>
const _scalarsCovered: Exhaustive<
  typeof SCALAR_KEYS,
  keyof Omit<LandingCopy, 'footer' | 'subtitles'>
> = true
const _footerCovered: Exhaustive<
  typeof FOOTER_KEYS,
  keyof LandingCopy['footer']
> = true
// reference the guards so they aren't flagged as unused
void _scalarsCovered
void _footerCovered

describe('LANDING_STRINGS', () => {
  for (const lang of ACTIVE) {
    const copy = LANDING_STRINGS[lang]
    it(`${lang} defines every scalar field, non-empty`, () => {
      for (const key of SCALAR_KEYS) {
        expect(copy[key], `${lang}.${key}`).toBeTruthy()
        expect(typeof copy[key]).toBe('string')
      }
    })
    it(`${lang} defines every footer segment, non-empty`, () => {
      for (const key of FOOTER_KEYS) {
        expect(copy.footer[key], `${lang}.footer.${key}`).toBeTruthy()
      }
    })
    it(`${lang} defines a subtitle for every game`, () => {
      for (const g of GAMES) {
        expect(copy.subtitles[g.slug], `${lang}.subtitles.${g.slug}`).toBeTruthy()
      }
    })
  }
})
