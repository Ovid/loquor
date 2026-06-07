import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('useTheme', () => {
  it('defaults to dark and toggles to light, persisting the choice', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem('naitfol-theme')).toBe('light')
    expect(document.body.dataset.theme).toBe('light')
  })

  it('reads the persisted theme on init', () => {
    localStorage.setItem('naitfol-theme', 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('falls back to dark when the persisted value is not a valid theme', () => {
    // A corrupt/legacy value (e.g. casing drift) must not be trusted verbatim,
    // or the first toggle misbehaves. Anything that is not 'light' reads dark.
    localStorage.setItem('naitfol-theme', 'Light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('toggles back from light to dark, clearing the body theme', () => {
    localStorage.setItem('naitfol-theme', 'light')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(document.body.dataset.theme).toBeUndefined()
  })
})
