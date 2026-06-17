import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Landing } from './Landing'
import { LANDING_EXAMPLES } from './landingExamples'
import { LS_KEYS } from '../storageKeys'

describe('Landing', () => {
  afterEach(() => localStorage.clear())

  it('lets you pick a volume and enter', () => {
    const onEnter = vi.fn()
    render(
      <Landing onEnter={onEnter} savedSlugs={new Set()} themeToggle={null} />,
    )
    fireEvent.click(screen.getByText('The Wizard of Frobozz'))
    fireEvent.click(screen.getByText(/Light the lamp/))
    expect(onEnter).toHaveBeenCalledWith('zork2')
  })
  it('exposes the volumes as a named radiogroup with arrow-key selection (M2)', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    const group = screen.getByRole('radiogroup', {
      name: /choose your descent/i,
    })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(3)
    // Zork I is selected by default.
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('tabindex', '0')
    expect(radios[1]).toHaveAttribute('tabindex', '-1')
    // ArrowRight moves the checked state to the next volume.
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(within(group).getAllByRole('radio')[1]).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('renders the initial landing inside a main landmark (m1)', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('shows a resume hint for saved games', () => {
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set(['zork1'])}
        themeToggle={null}
      />,
    )
    expect(screen.getByText(/resume/i)).toBeInTheDocument()
  })

  // Overlay (story-picker) mode: when opened over a running game, the picker
  // must be dismissible so the player can return to where they were.
  it('renders no dismiss control on the initial landing (no onDismiss)', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(screen.queryByRole('button', { name: /return to game/i })).toBeNull()
  })
  it('calls onDismiss when the dismiss control is clicked (overlay mode)', () => {
    const onDismiss = vi.fn()
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set()}
        themeToggle={null}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /return to game/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
  it('dismisses on the Escape key (overlay mode)', () => {
    const onDismiss = vi.fn()
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set()}
        themeToggle={null}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
  it('exposes a language radiogroup defaulting to the saved pref', () => {
    localStorage.setItem(
      LS_KEYS.nlPref,
      JSON.stringify({ language: 'fr', declined: false }),
    )
    render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
    const group = screen.getByRole('radiogroup', { name: /language/i })
    expect(group).toBeInTheDocument()
    const fr = screen.getByRole('radio', { name: 'Français' })
    expect(fr).toHaveAttribute('aria-checked', 'true')
  })

  it('persists the chosen language when entering the game', () => {
    const onEnter = vi.fn()
    render(<Landing onEnter={onEnter} savedSlugs={new Set()} themeToggle={null} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Deutsch' }))
    fireEvent.click(screen.getByText(/Light the lamp/))
    expect(onEnter).toHaveBeenCalledWith('zork1')
    expect(JSON.parse(localStorage.getItem(LS_KEYS.nlPref)!).language).toBe('de')
  })

  it('moves language selection AND focus with arrow keys (roving radiogroup)', () => {
    // Default selection is Off (index 0). ArrowRight → English (index 1).
    render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
    const group = screen.getByRole('radiogroup', { name: /language/i })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    const english = screen.getByRole('radio', { name: 'English' })
    expect(english).toHaveAttribute('aria-checked', 'true')
    expect(english).toHaveAttribute('tabindex', '0')
    expect(english).toHaveFocus()
  })

  it('keeps the language picker operable in the Change story overlay variant', () => {
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set()}
        themeToggle={null}
        onDismiss={() => {}}
      />,
    )
    const es = screen.getByRole('radio', { name: 'Español' })
    fireEvent.click(es)
    expect(es).toHaveAttribute('aria-checked', 'true')
  })

  it('shows plain-language how-to copy, not the old canonical-command framing', () => {
    render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
    expect(
      screen.getByText(/Type what you want to do in plain language/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/the way the game expects it/i)).not.toBeInTheDocument()
  })

  it('shows English examples by default and localizes them on selection', () => {
    render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
    const region = screen.getByRole('region', { name: /examples/i })
    expect(region).toHaveTextContent(LANDING_EXAMPLES.en.join(' · '))
    fireEvent.click(screen.getByRole('radio', { name: 'Français' }))
    expect(region).toHaveTextContent(LANDING_EXAMPLES.fr.join(' · '))
  })

  it('announces example changes politely (aria-live)', () => {
    render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
    expect(screen.getByRole('region', { name: /examples/i })).toHaveAttribute(
      'aria-live',
      'polite',
    )
  })

  it('traps Tab within the plate so focus cannot reach the game behind it', () => {
    render(
      <Landing
        onEnter={() => {}}
        savedSlugs={new Set()}
        themeToggle={null}
        onDismiss={() => {}}
      />,
    )
    const focusables = screen.getAllByRole('button')
    const last = focusables[focusables.length - 1]
    last.focus()
    expect(document.activeElement).toBe(last)
    // Tab from the last control wraps back to the first (the dismiss button),
    // rather than escaping into the dimmed game.
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(focusables[0])
  })
})
