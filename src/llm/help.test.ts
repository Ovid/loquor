import { describe, it, expect } from 'vitest'
import { helpResponse, isHelpTrigger, ESCAPE_EXAMPLE } from './help'

describe('localized help', () => {
  it('triggers on the localized aliases per language', () => {
    expect(isHelpTrigger('ayuda', 'es')).toBe(true)
    expect(isHelpTrigger('aide', 'fr')).toBe(true)
    expect(isHelpTrigger('hilfe', 'de')).toBe(true)
    expect(isHelpTrigger('help', 'ka')).toBe(true) // ka: English word only
  })
  it('English mode DOES intercept too — Zork has no native help to fall through to', () => {
    expect(isHelpTrigger('help', 'en')).toBe(true)
  })
  it('accepts the English "help" word in fr/de/es too (player reflex)', () => {
    expect(isHelpTrigger('help', 'fr')).toBe(true)
    expect(isHelpTrigger('help', 'de')).toBe(true)
    expect(isHelpTrigger('help', 'es')).toBe(true)
  })
  it('normalizes case/whitespace/diacritics', () => {
    expect(isHelpTrigger('  AYUDA  ', 'es')).toBe(true)
    expect(isHelpTrigger('Aide', 'fr')).toBe(true)
    expect(isHelpTrigger('HILFE', 'de')).toBe(true)
  })
  it('does not trigger on a real intent containing the help word', () => {
    expect(isHelpTrigger('help me open the door', 'es')).toBe(false)
    expect(isHelpTrigger('hilfe dem zwerg', 'de')).toBe(false)
  })
  it('returns false for off/disabled state', () => {
    expect(isHelpTrigger('help', 'off')).toBe(false)
  })
  it('es help names the quoted-English escape hatch + a specific example', () => {
    const block = helpResponse('es')
    expect(block).toMatch(/"wind up canary"/)
    expect(block.toLowerCase()).toContain('ayuda') // self-reference / meta list
  })
  it('fr/de help self-reference their own help word and the escape hatch', () => {
    expect(helpResponse('fr').toLowerCase()).toContain('aide')
    expect(helpResponse('fr')).toMatch(/"wind up canary"/)
    expect(helpResponse('de').toLowerCase()).toContain('hilfe')
    expect(helpResponse('de')).toMatch(/"wind up canary"/)
  })
  it('fr/de/es name the real meta verbs a non-English player needs', () => {
    for (const lang of ['fr', 'de', 'es'] as const) {
      const block = helpResponse(lang)
      for (const verb of [
        'save',
        'restore',
        'restart',
        'quit',
        'score',
        'diagnose',
        'version',
      ]) {
        expect(block).toContain(verb)
      }
    }
  })
  it('en help names the meta verbs + the quoted-escape (bypasses LLM mistranslation)', () => {
    const block = helpResponse('en')
    for (const verb of [
      'save',
      'restore',
      'restart',
      'quit',
      'score',
      'diagnose',
      'version',
    ]) {
      expect(block).toContain(verb)
    }
    expect(block).toMatch(/"wind up canary"/) // the quoted-escape example
    expect(block.toLowerCase()).toContain('help') // self-reference
  })
  it('ka help block describes Georgian input + the quoted escape', () => {
    const h = helpResponse('ka')
    expect(h).toMatch(/ქართულ/) // tells the player to type in Georgian
    expect(h).toContain(ESCAPE_EXAMPLE) // the quoted-English escape is now relevant
  })
})
