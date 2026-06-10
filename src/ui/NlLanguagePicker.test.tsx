import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NlLanguagePicker } from './NlLanguagePicker'

describe('NlLanguagePicker', () => {
  it('renders Off · English · Français · Deutsch · Español', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: true }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    const select = screen.getByRole('combobox')
    const labels = [...select.querySelectorAll('option')].map(
      o => o.textContent,
    )
    expect(labels).toEqual(['Off', 'English', 'Français', 'Deutsch', 'Español'])
  })

  it('reflects the active language and emits a change', () => {
    const onSelect = vi.fn()
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr' }}
        onSelect={onSelect}
        onOverride={() => {}}
      />,
    )
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('fr')
    fireEvent.change(select, { target: { value: 'de' } })
    expect(onSelect).toHaveBeenCalledWith('de')
  })

  it('keeps the unavailable + downloading branches', () => {
    const onOverride = vi.fn()
    const { rerender } = render(
      <NlLanguagePicker
        state={{ phase: 'unavailable', reasons: ['no webgpu'] }}
        onSelect={() => {}}
        onOverride={onOverride}
      />,
    )
    expect(screen.getByText(/force-enable/)).toBeInTheDocument()
    screen.getByRole('button', { name: /force-enable/ }).click()
    expect(onOverride).toHaveBeenCalled()
    rerender(
      <NlLanguagePicker
        state={{ phase: 'downloading', loaded: 1, total: 2, etaSeconds: null }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    expect(screen.getByText(/downloading/)).toBeInTheDocument()
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('shows the installed chip when off · installed', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: true }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    // Anchored on the separator ([S]): a bare /installed/ also matches the
    // "· not installed" chip, so this passed for the wrong render too.
    expect(screen.getByText(/· installed/)).toBeInTheDocument()
    expect(screen.queryByText(/not installed/)).toBeNull()
  })

  it('shows the not-installed chip when off · not installed', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: false }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    expect(screen.getByText(/not installed/)).toBeInTheDocument()
  })

  it('renders nothing when disabled (no vocab)', () => {
    const { container } = render(
      <NlLanguagePicker
        state={{ phase: 'disabled' }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
