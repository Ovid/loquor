import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebug } from './useDebug'
import { LS_KEYS } from '../storageKeys'

afterEach(() => localStorage.clear())

describe('useDebug', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useDebug())
    expect(result.current[0]).toBe(false)
  })

  it('toggles and persists', () => {
    const { result } = renderHook(() => useDebug())
    act(() => result.current[1]())
    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem(LS_KEYS.debug)).toBe('1')
  })

  it('reads a persisted true value on mount', () => {
    localStorage.setItem(LS_KEYS.debug, '1')
    const { result } = renderHook(() => useDebug())
    expect(result.current[0]).toBe(true)
  })

  it('treats any non-sentinel value as false', () => {
    localStorage.setItem(LS_KEYS.debug, 'true')
    const { result } = renderHook(() => useDebug())
    expect(result.current[0]).toBe(false)
  })

  it('survives a throwing localStorage (defaults false, no crash)', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked')
      })
    try {
      const { result } = renderHook(() => useDebug())
      expect(result.current[0]).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})
