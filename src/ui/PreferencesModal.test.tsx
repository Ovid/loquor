import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PreferencesModal, PREFS_COPY } from './PreferencesModal'

const noop = () => {}

describe('PreferencesModal', () => {
  it('is a labelled modal dialog when open', () => {
    render(
      <PreferencesModal
        open
        debug={false}
        onToggleDebug={noop}
        onClose={noop}
      />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName(PREFS_COPY.en.heading)
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <PreferencesModal
        open={false}
        debug={false}
        onToggleDebug={noop}
        onClose={noop}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes the debug checkbox by its accessible name and reflects state', () => {
    render(<PreferencesModal open debug onToggleDebug={noop} onClose={noop} />)
    const box = screen.getByRole('checkbox', { name: PREFS_COPY.en.debugLabel })
    expect(box).toBeChecked()
    expect(box).toHaveAccessibleDescription(PREFS_COPY.en.debugHelp)
  })

  it('calls onToggleDebug when the checkbox is clicked', () => {
    const onToggleDebug = vi.fn()
    render(
      <PreferencesModal
        open
        debug={false}
        onToggleDebug={onToggleDebug}
        onClose={noop}
      />,
    )
    fireEvent.click(
      screen.getByRole('checkbox', { name: PREFS_COPY.en.debugLabel }),
    )
    expect(onToggleDebug).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape (reuses useFocusTrap)', () => {
    const onClose = vi.fn()
    render(
      <PreferencesModal
        open
        debug={false}
        onToggleDebug={noop}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the heading and close in the active language', () => {
    render(
      <PreferencesModal
        open
        lang="fr"
        debug={false}
        onToggleDebug={noop}
        onClose={noop}
      />,
    )
    expect(
      screen.getByRole('dialog', { name: PREFS_COPY.fr.heading }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: PREFS_COPY.fr.close }),
    ).toBeInTheDocument()
  })

  it('has copy for every NL language', () => {
    for (const lang of ['en', 'fr', 'de', 'es'] as const) {
      const c = PREFS_COPY[lang]
      expect(c.heading).toBeTruthy()
      expect(c.debugLabel).toBeTruthy()
      expect(c.debugHelp).toBeTruthy()
      expect(c.close).toBeTruthy()
    }
  })
})
