import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLlmFeature } from './useLlmFeature'
import { LS_KEYS } from '../storageKeys'

afterEach(() => localStorage.clear())

describe('useLlmFeature', () => {
  it('defaults to false (LLM hidden)', () => {
    const { result } = renderHook(() => useLlmFeature())
    expect(result.current[0]).toBe(false)
  })

  it('toggles on and persists the sentinel', () => {
    const { result } = renderHook(() => useLlmFeature())
    act(() => result.current[1]())
    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem(LS_KEYS.llm)).toBe('1')
  })

  it('toggles back off and removes the key', () => {
    localStorage.setItem(LS_KEYS.llm, '1')
    const { result } = renderHook(() => useLlmFeature())
    expect(result.current[0]).toBe(true)
    act(() => result.current[1]())
    expect(result.current[0]).toBe(false)
    expect(localStorage.getItem(LS_KEYS.llm)).toBeNull()
  })

  it('treats any non-sentinel value as false', () => {
    localStorage.setItem(LS_KEYS.llm, 'true')
    const { result } = renderHook(() => useLlmFeature())
    expect(result.current[0]).toBe(false)
  })

  it('survives a throwing localStorage (defaults false, no crash)', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked')
      })
    try {
      const { result } = renderHook(() => useLlmFeature())
      expect(result.current[0]).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})
