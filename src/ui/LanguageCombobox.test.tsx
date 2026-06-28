import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageCombobox } from './LanguageCombobox'
import { LANGUAGE_OPTIONS } from './languageOptions'

const OPTS = LANGUAGE_OPTIONS // includes Off

describe('LanguageCombobox', () => {
  it('renders the current value and opens a named listbox of the given options', () => {
    render(
      <LanguageCombobox
        options={OPTS}
        value="fr"
        onChange={() => {}}
        idBase="t"
        label="Language"
      />,
    )
    const btn = screen.getByRole('combobox', { name: 'Language' })
    expect(btn).toHaveTextContent('Français')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(screen.getByRole('listbox')).toHaveAccessibleName('Language')
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(
      OPTS.map(o => o.label),
    )
  })

  it('marks the picker translate="no" so Chrome cannot rewrite the foreign-language labels to English', () => {
    const { container } = render(
      <LanguageCombobox
        options={OPTS}
        value="fr"
        onChange={() => {}}
        idBase="t"
        label="Language"
      />,
    )
    expect(container.querySelector('.nl-select')).toHaveAttribute(
      'translate',
      'no',
    )
  })

  it('emits the chosen value and closes (mouse)', () => {
    const onChange = vi.fn()
    render(
      <LanguageCombobox
        options={OPTS}
        value="en"
        onChange={onChange}
        idBase="t"
        label="Language"
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'Deutsch' }))
    expect(onChange).toHaveBeenCalledWith('de')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('keyboard: opens on Enter highlighting the selected option, arrows + Enter select', () => {
    const onChange = vi.fn()
    render(
      <LanguageCombobox
        options={OPTS}
        value="fr"
        onChange={onChange}
        idBase="t"
        label="Language"
      />,
    )
    const btn = screen.getByRole('combobox')
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Highlight starts on the SELECTED option (fr), not the first.
    expect(btn.getAttribute('aria-activedescendant')).toMatch(/fr/)
    fireEvent.keyDown(btn, { key: 'ArrowDown' }) // fr → de
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('de')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('keyboard a11y: Home/End/ArrowUp move the highlight, hover sets it, Tab closes without trapping', () => {
    render(
      <LanguageCombobox
        options={OPTS}
        value="en"
        onChange={() => {}}
        idBase="t"
        label="Language"
      />,
    )
    const btn = screen.getByRole('combobox')
    const ad = () => btn.getAttribute('aria-activedescendant')
    const optId = (i: number) => `t-opt-${OPTS[i].value}`
    const last = OPTS.length - 1

    fireEvent.keyDown(btn, { key: 'ArrowDown' }) // closed → opens
    fireEvent.keyDown(btn, { key: 'End' })
    expect(ad()).toBe(optId(last))
    fireEvent.keyDown(btn, { key: 'Home' })
    expect(ad()).toBe(optId(0))
    fireEvent.keyDown(btn, { key: 'ArrowDown' }) // 0 → 1
    fireEvent.keyDown(btn, { key: 'ArrowUp' }) // 1 → 0
    expect(ad()).toBe(optId(0))
    // Hover moves the highlight (mouseEnter branch).
    fireEvent.mouseEnter(screen.getByRole('option', { name: OPTS[last].label }))
    expect(ad()).toBe(optId(last))
    // Tab lets focus move on — the menu closes, never traps it.
    fireEvent.keyDown(btn, { key: 'Tab' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('Escape and outside-click close without selecting', () => {
    const onChange = vi.fn()
    render(
      <LanguageCombobox
        options={OPTS}
        value="en"
        onChange={onChange}
        idBase="t"
        label="Language"
      />,
    )
    const btn = screen.getByRole('combobox')
    fireEvent.click(btn)
    fireEvent.keyDown(btn, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(btn)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('tags non-English options with their lang and marks the selected one', () => {
    render(
      <LanguageCombobox
        options={OPTS}
        value="es"
        onChange={() => {}}
        idBase="t"
        label="Language"
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('option', { name: 'Français' })).toHaveAttribute(
      'lang',
      'fr',
    )
    expect(screen.getByRole('option', { name: 'Español' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('honours a filtered options list — the landing variant has no Off', () => {
    const noOff = OPTS.filter(o => o.value !== 'off')
    render(
      <LanguageCombobox
        options={noOff}
        value="en"
        onChange={() => {}}
        idBase="t"
        label="Language"
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.queryByRole('option', { name: 'Off' })).toBeNull()
    // Derived from the real option list (minus Off) so it can't drift as play
    // languages are added.
    expect(screen.getAllByRole('option')).toHaveLength(noOff.length)
  })
})
