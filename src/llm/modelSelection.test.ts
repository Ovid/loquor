// src/llm/modelSelection.test.ts
import { describe, it, expect } from 'vitest'
import { parseModelParam } from './modelSelection'

describe('parseModelParam', () => {
  it('reads a model value from the query string', () => {
    expect(parseModelParam('?model=full')).toBe('full')
    expect(parseModelParam('?foo=1&model=small')).toBe('small')
    expect(parseModelParam('?model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k')).toBe(
      'Llama-3.1-8B-Instruct-q4f16_1-MLC-1k',
    )
  })

  it('url-decodes the value', () => {
    expect(parseModelParam('?model=a%20b')).toBe('a b')
  })

  it('returns null when absent', () => {
    expect(parseModelParam('')).toBe(null)
    expect(parseModelParam('?other=1')).toBe(null)
  })

  it('treats malformed percent-encoding as no override instead of throwing', () => {
    // decodeURIComponent throws URIError on these; a hand-typed bad query string
    // must not crash the Terminal render (review).
    expect(parseModelParam('?model=%')).toBe(null)
    expect(parseModelParam('?model=%E0%A4%A')).toBe(null)
  })
})
