// src/ui/landingStrings.test.ts
// Player-first gate: a language can never ship half-English. Every ActiveLanguage
// must define every LandingCopy field (non-empty), and a subtitle for every game.
import { describe, it, expect } from 'vitest'
import { LANDING_STRINGS } from './landingStrings'
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
] as const

const FOOTER_KEYS = ['trademark', 'licenseLinkText', 'githubLinkText'] as const

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
