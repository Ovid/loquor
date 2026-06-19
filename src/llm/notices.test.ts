import { describe, it, expect } from 'vitest'
import {
  modelDownloadFailed,
  modelDownloadStalled,
  grammarOnlyFirstMiss,
  thinking,
  makeActivationNotice,
  commandPlaceholder,
  commandLabel,
} from './notices'

describe('basic-mode download notices', () => {
  it('failure reframes to staying in basic mode, per language', () => {
    expect(modelDownloadFailed('en')).toBe(
      'AI model download failed — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
    )
    expect(modelDownloadFailed('fr')).toContain('mode simplifié')
    expect(modelDownloadFailed('de')).toContain('einfachen Modus')
    expect(modelDownloadFailed('es')).toContain('modo básico')
  })

  it('stall reframes to staying in basic mode, per language', () => {
    expect(modelDownloadStalled('en')).toBe(
      'AI model download stalled — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
    )
    expect(modelDownloadStalled('fr')).toContain('mode simplifié')
    expect(modelDownloadStalled('de')).toContain('einfachen Modus')
    expect(modelDownloadStalled('es')).toContain('modo básico')
  })
})

describe('grammar-only educational first-abstain notice', () => {
  it('explains basic mode + the upgrade, per language', () => {
    expect(grammarOnlyFirstMiss('en')).toBe(
      'I didn’t catch that. Simple commands like “take the lamp” work now — add the optional upgrade for full sentences.',
    )
    for (const l of ['fr', 'de', 'es'] as const) {
      // Plain-language recovery with a localized example (m4), no jargon.
      expect(grammarOnlyFirstMiss(l).length).toBeGreaterThan(0)
    }
  })
})

describe('escape-hatch activation notice (P3)', () => {
  it('nudges fr/de/es to the quoted-English escape hatch, once per language', () => {
    const notice = makeActivationNotice()
    // fr/de/es: the quoted-English fallback — mention quotes and English.
    const fr = notice('fr')
    expect(fr).not.toBeNull()
    expect(fr).toMatch(/guillemets/) // "quotes" in French
    expect(fr).toMatch(/anglais/) // "English"
    const de = notice('de')
    expect(de).toMatch(/Anführungszeichen/) // "quotes"
    expect(de).toMatch(/[Ee]nglisch/)
    const es = notice('es')
    expect(es).toMatch(/comillas/) // "quotes"
    expect(es).toMatch(/inglés/)
    // None of the escape-hatch languages may omit the quote glyph in the example.
    for (const s of [fr, de, es]) expect(s).toContain('"')
  })

  it('tells ka to type in English and does NOT mention wrapping in quotes', () => {
    const notice = makeActivationNotice()
    const ka = notice('ka')
    expect(ka).not.toBeNull()
    // ka is output-only: it raw-sends English, so the message is "type in
    // English" (Georgian display text) with NO quoted-escape instruction.
    expect(ka).toMatch(/ინგლისურ/) // "English" stem in Georgian
    expect(ka).not.toContain('"') // no quote-escape example for ka
  })

  it('fires only once per language — the second activation returns null', () => {
    const notice = makeActivationNotice()
    expect(notice('fr')).not.toBeNull()
    expect(notice('fr')).toBeNull() // second pick of the same language: silent
    // A different language still gets its own one-time notice.
    expect(notice('de')).not.toBeNull()
    expect(notice('de')).toBeNull()
  })

  it('is silent for English (raw-send, no escape hatch to advertise)', () => {
    const notice = makeActivationNotice()
    expect(notice('en')).toBeNull()
  })
})

describe('command-field placeholder / accessible name (S3 + P3)', () => {
  it('invites plain language in fr/de/es', () => {
    expect(commandPlaceholder('fr')).toMatch(/français/)
    expect(commandPlaceholder('de')).toMatch(/Deutsch/)
    expect(commandPlaceholder('es')).toMatch(/español/)
    expect(commandLabel('fr')).toMatch(/français/)
    expect(commandLabel('de')).toMatch(/Deutsch/)
    expect(commandLabel('es')).toMatch(/español/)
  })

  it('tells an output-only (ka) player to type in English, in Georgian', () => {
    // ka raw-sends English: the placeholder/name must say "type in English" in
    // Georgian, NOT fall back to the generic English copy.
    expect(commandPlaceholder('ka')).toMatch(/ინგლისურ/)
    expect(commandPlaceholder('ka')).not.toBe(commandPlaceholder('en'))
    expect(commandLabel('ka')).toMatch(/ინგლისურ/)
    expect(commandLabel('ka')).not.toBe(commandLabel('en'))
  })
})

describe('thinking indicator (review I5)', () => {
  it('is localized per language — no English for FR/DE/ES players', () => {
    expect(thinking('en')).toBe('…thinking')
    expect(thinking('fr')).toBe('…réflexion')
    expect(thinking('de')).toBe('…denke nach')
    expect(thinking('es')).toBe('…pensando')
  })
})
