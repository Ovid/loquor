import { useEffect, useRef, useState } from 'react'
import type { NlLanguage } from '../llm/types'
import type { LanguageOption } from './languageOptions'

/**
 * Shared select-only combobox for choosing the play language (button trigger +
 * themed listbox popup). Used by BOTH the in-game status-bar picker
 * (NlLanguagePicker) and the title-screen picker (Landing) so the two can't
 * drift. A CUSTOM combobox, not a native <select>: the native popup can't be
 * themed and broke the folio styling. Keyboard follows the WAI-ARIA select-only
 * combobox pattern with aria-activedescendant — focus stays on the button
 * throughout. The caller owns the option list (e.g. the landing passes the list
 * without "Off") and the value/onChange.
 */
export function LanguageCombobox({
  options,
  value,
  onChange,
  idBase,
  label,
  describedById,
}: {
  options: LanguageOption[]
  value: NlLanguage
  onChange: (lang: NlLanguage) => void
  /** Unique id stem for the listbox + option ids — two instances must not clash. */
  idBase: string
  /** Accessible name for the combobox button and the listbox. */
  label: string
  /** Optional aria-describedby on the button (e.g. the in-game "basic mode" state). */
  describedById?: string
}) {
  const [open, setOpen] = useState(false)
  // Index of the keyboard/hover highlight while the listbox is open.
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLSpanElement>(null)

  // Close on any press outside the control (mousedown, not click, so a drag
  // that starts outside also dismisses — the native popup's behavior).
  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  const current = options.find(o => o.value === value) ?? options[0]
  const listboxId = `${idBase}-listbox`

  const openMenu = () => {
    // Highlight starts on the SELECTED option, like a native select.
    setActive(
      Math.max(
        0,
        options.findIndex(o => o.value === value),
      ),
    )
    setOpen(true)
  }
  const choose = (lang: NlLanguage) => {
    setOpen(false)
    onChange(lang)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        // preventDefault also suppresses the button's synthesized click, so
        // Enter/Space can't immediately re-toggle the menu shut.
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(options.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(options[active].value)
    } else if (e.key === 'Tab') {
      setOpen(false) // let focus move on; never trap it
    }
  }

  return (
    <span className="nl-select" ref={rootRef}>
      <button
        type="button"
        className="sw nl-select-btn"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open ? `${idBase}-opt-${options[active].value}` : undefined
        }
        aria-describedby={describedById}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span lang={current.lang}>{current.label}</span>
        <span className="nl-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul
          className="nl-menu"
          role="listbox"
          id={listboxId}
          aria-label={label}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${idBase}-opt-${o.value}`}
              role="option"
              lang={o.lang}
              aria-selected={o.value === value}
              className={i === active ? 'active' : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
