import { describe, it, expect } from 'vitest'
import {
  modelDownloadFailed,
  modelDownloadStalled,
  grammarOnlyFirstMiss,
  thinking,
  makeActivationNotice,
  commandPlaceholder,
  commandPlaceholderTypeEnglish,
  commandLabel,
  couldntTranslate,
  nothingSent,
  GEORGIAN_ACTIVATION_TIP,
  GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH,
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

  it('ka with input INACTIVE (Zork II/III): Phase-1 type-English tip, no quotes', () => {
    // kaInput=false is the Phase-1 path (a no-input game): tell the player to
    // type in English, Georgian display text, NO quoted-escape instruction.
    const notice = makeActivationNotice(false)
    const ka = notice('ka')
    expect(ka).not.toBeNull()
    expect(ka).toMatch(/ინგლისურ/) // "English" stem in Georgian
    expect(ka).not.toContain('"') // no quote-escape example in Phase-1 tip
    expect(ka).toBe(GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH)
  })

  it('ka with input ACTIVE (Zork I, Phase 2): Georgian-input tip with quoted escape', () => {
    // kaInput=true is the Phase-2 path: invite Georgian + the now-meaningful
    // quoted-English escape hatch.
    const notice = makeActivationNotice(true)
    const ka = notice('ka')
    expect(ka).not.toBeNull()
    expect(ka).toMatch(/ქართულ/) // mentions Georgian
    expect(ka).toContain('"') // quoted-English escape is now meaningful
    expect(ka).toBe(GEORGIAN_ACTIVATION_TIP)
  })

  it('exposes the ka activation tips as shared consts so the bottom bar cannot drift', () => {
    // The bottom bar renders one of these strings visibly while the latch
    // announces it once — they must be the SAME string (spec Decision 6).
    expect(makeActivationNotice(true)('ka')).toBe(GEORGIAN_ACTIVATION_TIP)
    expect(makeActivationNotice(false)('ka')).toBe(
      GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH,
    )
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

  it('tells a ka player (Georgian input, Zork I) to type in Georgian, in Georgian', () => {
    // ka now accepts Georgian input (Zork I): the placeholder/name must invite
    // Georgian (and may mention English too), NOT fall back to the generic
    // English copy.
    expect(commandPlaceholder('ka')).toMatch(/ქართულ/)
    expect(commandPlaceholder('ka')).not.toBe(commandPlaceholder('en'))
    expect(commandLabel('ka')).toMatch(/ქართულ/)
    expect(commandLabel('ka')).not.toBe(commandLabel('en'))
  })

  it('retains the Phase-1 type-English placeholder for a no-input game (Zork II/III)', () => {
    // Task 20 uses this on a no-input game: it must still say "type in English"
    // in Georgian, with the literal English example.
    const p = commandPlaceholderTypeEnglish()
    expect(p).toMatch(/ინგლისურ/)
    expect(p).not.toBe(commandPlaceholder('en'))
  })
})

describe('ka Georgian-input copy (spec §7)', () => {
  it('placeholder invites Georgian, no longer the old type-English-only copy', () => {
    const p = commandPlaceholder('ka')
    expect(p).toMatch(/ქართულ/) // mentions Georgian
    expect(p).not.toContain('open the mailbox') // not the old English-example copy
  })
  it('couldntTranslate has a Georgian ka entry (abstain stays in-language)', () => {
    expect(couldntTranslate('ka')).toMatch(/[Ⴀ-ჿ]/)
  })
  it('grammarOnlyFirstMiss and nothingSent abstains stay Georgian for ka', () => {
    // No-LLM ka player can hit these input-side notices now — they must be
    // Georgian, never an English fallback.
    expect(grammarOnlyFirstMiss('ka')).toMatch(/[Ⴀ-ჿ]/)
    expect(nothingSent('ka', true)).toMatch(/[Ⴀ-ჿ]/)
    expect(nothingSent('ka', false)).toMatch(/[Ⴀ-ჿ]/)
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
