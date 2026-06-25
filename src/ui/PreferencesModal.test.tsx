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

describe('PreferencesModal — LLM toggle', () => {
  it('exposes the LLM checkbox by accessible name/description and reflects state', () => {
    render(
      <PreferencesModal
        open
        debug={false}
        llmEnabled
        onToggleDebug={noop}
        onToggleLlm={noop}
        onClose={noop}
      />,
    )
    const box = screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel })
    expect(box).toBeChecked()
    expect(box).toHaveAccessibleDescription(PREFS_COPY.en.llmHelp)
  })

  it('sits BELOW the debug row (DOM order)', () => {
    render(
      <PreferencesModal
        open
        debug={false}
        llmEnabled={false}
        onToggleDebug={noop}
        onToggleLlm={noop}
        onClose={noop}
      />,
    )
    const debugBox = screen.getByRole('checkbox', {
      name: PREFS_COPY.en.debugLabel,
    })
    const llmBox = screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel })
    expect(
      debugBox.compareDocumentPosition(llmBox) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('calls onToggleLlm when clicked', () => {
    const onToggleLlm = vi.fn()
    render(
      <PreferencesModal
        open
        debug={false}
        llmEnabled={false}
        onToggleDebug={noop}
        onToggleLlm={onToggleLlm}
        onClose={noop}
      />,
    )
    fireEvent.click(
      screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel }),
    )
    expect(onToggleLlm).toHaveBeenCalledTimes(1)
  })

  it('has LLM copy for every NL language (incl. ka)', () => {
    for (const lang of ['en', 'fr', 'de', 'es', 'ka'] as const) {
      expect(PREFS_COPY[lang].llmLabel).toBeTruthy()
      expect(PREFS_COPY[lang].llmHelp).toBeTruthy()
    }
  })
})
