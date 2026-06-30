import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

beforeEach(() => {
  localStorage.clear()
  delete document.body.dataset.theme
})

describe('useTheme', () => {
  it('defaults to light and toggles to dark, persisting the choice', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem('loquor-theme')).toBe('dark')
    expect(document.body.dataset.theme).toBe('dark')
  })

  it('reads the persisted theme on init', () => {
    localStorage.setItem('loquor-theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('does not persist on mount — only an explicit toggle writes storage', () => {
    // Regression: the old effect wrote the theme on EVERY mount, freezing the
    // current default into storage on a visitor's first load. That made a later
    // change to the default (dark→light) unreachable for anyone who'd already
    // opened the app — they stayed stuck on the auto-persisted old default.
    renderHook(() => useTheme())
    expect(localStorage.getItem('loquor-theme')).toBeNull()
  })

  it('falls back to light when the persisted value is not a valid theme', () => {
    // A corrupt/legacy value (e.g. casing drift) must not be trusted verbatim,
    // or the first toggle misbehaves. Anything that is not 'dark' reads light.
    localStorage.setItem('loquor-theme', 'Dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('toggles back from dark to light, clearing the body theme', () => {
    localStorage.setItem('loquor-theme', 'dark')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(document.body.dataset.theme).toBeUndefined()
  })
})
