// src/llm/models.test.ts
import { describe, it, expect } from 'vitest'
import {
  SMALL_MODEL,
  FULL_MODEL,
  DEFAULT_MODEL,
  KNOWN_MODELS,
  resolveModelId,
} from './models'

describe('models', () => {
  it('exposes distinct small/full ids and defaults to small', () => {
    expect(SMALL_MODEL).not.toBe(FULL_MODEL)
    expect(DEFAULT_MODEL).toBe(SMALL_MODEL)
  })

  it('FULL is a multilingual Llama-3.1-8B id (escalation target for non-English)', () => {
    // 3.1 (not 3.0) is the one with official multilingual support — the reason to
    // escalate. The exact id must exist in WebLLM's prebuilt config (web-llm/).
    expect(FULL_MODEL).toMatch(/^Llama-3\.1-8B-Instruct-/)
  })

  it('KNOWN_MODELS is the load allowlist and holds both ids', () => {
    expect(KNOWN_MODELS).toContain(SMALL_MODEL)
    expect(KNOWN_MODELS).toContain(FULL_MODEL)
  })

  describe('resolveModelId', () => {
    it('falls back to default for empty, missing, or unknown ids', () => {
      expect(resolveModelId(null)).toBe(DEFAULT_MODEL)
      expect(resolveModelId(undefined)).toBe(DEFAULT_MODEL)
      expect(resolveModelId('')).toBe(DEFAULT_MODEL)
      expect(resolveModelId('  ')).toBe(DEFAULT_MODEL)
      // An unknown id is ignored, never fetched.
      expect(resolveModelId('Totally-Made-Up-9000-MLC')).toBe(DEFAULT_MODEL)
    })

    it('accepts the small/full aliases case-insensitively', () => {
      expect(resolveModelId('small')).toBe(SMALL_MODEL)
      expect(resolveModelId('full')).toBe(FULL_MODEL)
      expect(resolveModelId('FULL')).toBe(FULL_MODEL)
    })

    it('accepts an exact known model id', () => {
      expect(resolveModelId(SMALL_MODEL)).toBe(SMALL_MODEL)
      expect(resolveModelId(FULL_MODEL)).toBe(FULL_MODEL)
    })
  })
})
