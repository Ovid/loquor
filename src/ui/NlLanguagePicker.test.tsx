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
        state={{ phase: 'off', installed: true, canUpgrade: true }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    const btn = screen.getByRole('combobox')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    const labels = screen.getAllByRole('option').map(o => o.textContent)
    expect(labels).toEqual([
      'Off',
      'English',
      'Français',
      'Deutsch',
      'Español',
      'ქართული (beta)',
    ])
  })

  it('names the listbox and tags non-English options with their language', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: true, canUpgrade: true }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    // listbox has an accessible name (4.1.2)
    expect(screen.getByRole('listbox')).toHaveAccessibleName('Language')
    // localized labels carry lang so a screen reader pronounces them right (3.1.2)
    expect(screen.getByRole('option', { name: 'Français' })).toHaveAttribute(
      'lang',
      'fr',
    )
    expect(screen.getByRole('option', { name: 'Deutsch' })).toHaveAttribute(
      'lang',
      'de',
    )
    expect(screen.getByRole('option', { name: 'Español' })).toHaveAttribute(
      'lang',
      'es',
    )
  })

  it('reflects the active language and emits a selection (mouse)', () => {
    const onSelect = vi.fn()
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr', model: 'full', canUpgrade: true }}
        onSelect={onSelect}
        onUpgrade={() => {}}
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
        state={{ phase: 'on', language: 'fr', model: 'full', canUpgrade: true }}
        onSelect={onSelect}
        onUpgrade={() => {}}
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
        state={{ phase: 'on', language: 'fr', model: 'full', canUpgrade: true }}
        onSelect={onSelect}
        onUpgrade={() => {}}
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

  it('keeps the downloading branch', () => {
    // The `unavailable` phase was removed (capability no longer disables NL —
    // it only gates the model upgrade), so the old "force-enable" affordance is
    // gone; the downloading progress chip remains.
    render(
      <NlLanguagePicker
        state={{
          phase: 'downloading',
          language: 'fr',
          loaded: 1,
          total: 2,
          etaSeconds: null,
        }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    // The chip is localized to the language being downloaded (M7): fr → "téléchargement".
    expect(screen.getByText(/téléchargement/)).toBeInTheDocument()
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('shows the installed chip when off · installed', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: true, canUpgrade: true }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    // The middot is now a decorative aria-hidden span (m3), so the chip's own
    // text node is just the word; exact match keeps "installed" from also
    // matching the "not installed" render.
    expect(screen.getByText('installed')).toBeInTheDocument()
    expect(screen.queryByText('not installed')).toBeNull()
  })

  it('shows the not-installed chip when off · not installed', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: false, canUpgrade: true }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    expect(screen.getByText('not installed')).toBeInTheDocument()
  })

  it('renders nothing when disabled (no vocab)', () => {
    const { container } = render(
      <NlLanguagePicker
        state={{ phase: 'disabled' }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('grammar-only shows the basic marker and a ✦ improve affordance', () => {
    const onUpgrade = vi.fn()
    render(
      <NlLanguagePicker
        state={{
          phase: 'on',
          language: 'fr',
          model: 'grammar',
          canUpgrade: true,
        }}
        onSelect={() => {}}
        onUpgrade={onUpgrade}
      />,
    )
    // "basic" is localized (M7): fr → "simplifié".
    expect(screen.getByText('simplifié')).toBeInTheDocument()
    // The basic-mode state is tied to the combobox as its description (m3), so a
    // screen reader announces it with the control — verify the wiring survives
    // the LanguageCombobox extraction.
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-describedby',
      'nl-basic-state',
    )
    // The improve button names its action and cost, not a bare "improve" (M1).
    expect(
      screen.getByRole('button', {
        name: 'Improve natural-language input (download AI model)',
      }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /improve/i }))
    expect(onUpgrade).toHaveBeenCalled()
  })

  it('grammar-only on a none device shows "try the model anyway", not improve', () => {
    const onUpgrade = vi.fn()
    render(
      <NlLanguagePicker
        state={{
          phase: 'on',
          language: 'de',
          model: 'grammar',
          canUpgrade: false,
        }}
        onSelect={() => {}}
        onUpgrade={onUpgrade}
      />,
    )
    expect(screen.queryByRole('button', { name: /improve/i })).toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: /try the model anyway/i }),
    )
    expect(onUpgrade).toHaveBeenCalled()
  })

  it('full shows neither the basic marker nor an upgrade affordance', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr', model: 'full', canUpgrade: true }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    expect(screen.queryByText(/· basic/)).toBeNull()
    expect(
      screen.queryByRole('button', { name: /improve|try the model/i }),
    ).toBeNull()
  })

  it('drops the visible "Language:" text but keeps the combobox accessible name', () => {
    render(
      <NlLanguagePicker
        state={{
          phase: 'on',
          language: 'fr',
          model: 'grammar',
          canUpgrade: true,
        }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    // The accessible name comes from aria-label on the combobox, not visible text:
    expect(
      screen.getByRole('combobox', { name: 'Language' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Language:/)).not.toBeInTheDocument()
  })
})
