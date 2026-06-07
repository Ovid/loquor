// src/llm/models.test.ts
import { describe, it, expect } from 'vitest'
import { SMALL_MODEL, FULL_MODEL, DEFAULT_MODEL } from './models'

describe('models', () => {
  it('exposes distinct small/full ids and defaults to small', () => {
    expect(SMALL_MODEL).not.toBe(FULL_MODEL)
    expect(DEFAULT_MODEL).toBe(SMALL_MODEL)
  })
})
