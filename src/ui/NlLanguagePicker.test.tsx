import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NlLanguagePicker } from './NlLanguagePicker'

describe('NlLanguagePicker', () => {
  // The picker is a CUSTOM select-only combobox (button trigger + styled
  // listbox popup), not a native <select>: the native popup can't be themed
  // and broke the folio styling (screenshot review). The button keeps
  // role="combobox" so the accessible contract matches the old control.
  it('opens a themed listbox with Off · English · Français · Deutsch · Español', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: true }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    const btn = screen.getByRole('combobox')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    const labels = screen.getAllByRole('option').map(o => o.textContent)
    expect(labels).toEqual(['Off', 'English', 'Français', 'Deutsch', 'Español'])
  })

  it('reflects the active language and emits a selection (mouse)', () => {
    const onSelect = vi.fn()
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr' }}
        onSelect={onSelect}
        onOverride={() => {}}
      />,
    )
    const btn = screen.getByRole('combobox')
    expect(btn).toHaveTextContent('Français')
    fireEvent.click(btn)
    expect(screen.getByRole('option', { name: 'Français' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    fireEvent.click(screen.getByRole('option', { name: 'Deutsch' }))
    expect(onSelect).toHaveBeenCalledWith('de')
    expect(screen.queryByRole('listbox')).toBeNull() // closes on selection
  })

  it('full keyboard path: open, arrow to an option, Enter selects', () => {
    const onSelect = vi.fn()
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr' }}
        onSelect={onSelect}
        onOverride={() => {}}
      />,
    )
    const btn = screen.getByRole('combobox')
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Highlight starts on the SELECTED option (fr), not the first.
    expect(btn.getAttribute('aria-activedescendant')).toMatch(/fr/)
    fireEvent.keyDown(btn, { key: 'ArrowDown' }) // fr → de
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('de')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('Escape closes without selecting; a click outside closes too', () => {
    const onSelect = vi.fn()
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr' }}
        onSelect={onSelect}
        onOverride={() => {}}
      />,
    )
    const btn = screen.getByRole('combobox')
    fireEvent.click(btn)
    fireEvent.keyDown(btn, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(btn)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onSelect).not.toHaveBeenCalled()
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
