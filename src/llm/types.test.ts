import { describe, it, expect } from 'vitest'
import { OUTPUT_ONLY_LANGS } from './types'

describe('OUTPUT_ONLY_LANGS (Phase 1: output corpus, no input support yet)', () => {
  it('contains ka and not the fully-supported input languages', () => {
    expect(OUTPUT_ONLY_LANGS.has('ka')).toBe(true)
    expect(OUTPUT_ONLY_LANGS.has('fr')).toBe(false)
    expect(OUTPUT_ONLY_LANGS.has('de')).toBe(false)
    expect(OUTPUT_ONLY_LANGS.has('es')).toBe(false)
  })
})
