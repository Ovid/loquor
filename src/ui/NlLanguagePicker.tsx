import { useEffect, useRef, useState } from 'react'
import type { NlState, NlLanguage } from '../llm/types'
import { pct as toPct } from '../llm/progress'

// `lang` marks each label's natural language (3.1.2) so a screen reader voices
// "Français"/"Deutsch"/"Español" with the right pronunciation inside the en doc.
const OPTIONS: { value: NlLanguage; label: string; lang: string }[] = [
  { value: 'off', label: 'Off', lang: 'en' },
  { value: 'en', label: 'English', lang: 'en' },
  { value: 'fr', label: 'Français', lang: 'fr' },
  { value: 'de', label: 'Deutsch', lang: 'de' },
  { value: 'es', label: 'Español', lang: 'es' },
]

/**
 * Status-bar language picker for the NL layer (replaces the old on/off toggle).
 * Picking a language with no cached model defers to the download modal: the
 * hook keeps phase 'off' and opens the modal; accepting activates THAT language.
 *
 * A CUSTOM select-only combobox (button trigger + styled listbox), not a
 * native <select>: the native popup cannot be themed and broke the folio
 * styling. Keyboard follows the WAI-ARIA select-only combobox pattern with
 * aria-activedescendant — focus stays on the button throughout.
 */
export function NlLanguagePicker({
  state,
  onSelect,
  onUpgrade,
}: {
  state: NlState
  onSelect: (lang: NlLanguage) => void
  /** Called when the player requests a model upgrade (grammar → full). */
  onUpgrade: () => void
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

  // No vocab for this game → silently render nothing (no picker).
  if (state.phase === 'disabled') return null
  if (state.phase === 'downloading') {
    const pct = toPct(state.loaded, state.total)
    return <span className="nl-toggle">downloading… {pct}%</span>
  }
  const value: NlLanguage = state.phase === 'on' ? state.language : 'off'
  const current = OPTIONS.find(o => o.value === value) ?? OPTIONS[0]
  const offChip =
    state.phase === 'off'
      ? state.installed
        ? ' · installed'
        : ' · not installed'
      : ''

  const openMenu = () => {
    // Highlight starts on the SELECTED option, like a native select.
    setActive(
      Math.max(
        0,
        OPTIONS.findIndex(o => o.value === value),
      ),
    )
    setOpen(true)
  }
  const choose = (lang: NlLanguage) => {
    setOpen(false)
    onSelect(lang)
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
      setActive(i => Math.min(i + 1, OPTIONS.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(OPTIONS.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(OPTIONS[active].value)
    } else if (e.key === 'Tab') {
      setOpen(false) // let focus move on; never trap it
    }
  }

  return (
    <span className="nl-toggle" ref={rootRef}>
      Language:{' '}
      <span className="nl-select">
        <button
          type="button"
          className="sw nl-select-btn"
          role="combobox"
          aria-label="Language"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="nl-lang-listbox"
          aria-activedescendant={
            open ? `nl-lang-opt-${OPTIONS[active].value}` : undefined
          }
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
            id="nl-lang-listbox"
            aria-label="Language"
          >
            {OPTIONS.map((o, i) => (
              <li
                key={o.value}
                id={`nl-lang-opt-${o.value}`}
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
      {offChip}
      {state.phase === 'on' && state.model === 'grammar' && (
        <>
          <span className="nl-basic"> · basic</span>{' '}
          <button className="sw" type="button" onClick={onUpgrade}>
            {state.canUpgrade ? (
              <>
                <span aria-hidden="true">✦</span> improve
              </>
            ) : (
              'try the model anyway'
            )}
          </button>
        </>
      )}
    </span>
  )
}
