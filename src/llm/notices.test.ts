import { describe, it, expect } from 'vitest'
import {
  modelDownloadFailed,
  modelDownloadStalled,
  grammarOnlyFirstMiss,
  thinking,
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

describe('thinking indicator (review I5)', () => {
  it('is localized per language — no English for FR/DE/ES players', () => {
    expect(thinking('en')).toBe('…thinking')
    expect(thinking('fr')).toBe('…réflexion')
    expect(thinking('de')).toBe('…denke nach')
    expect(thinking('es')).toBe('…pensando')
  })
})
