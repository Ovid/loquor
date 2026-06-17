import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'

describe('StatusBar', () => {
  it('shows location and right-hand score/moves', () => {
    render(
      <StatusBar
        status={{ location: 'West of House', right: 'Score: 0   Moves: 1' }}
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    expect(screen.getByText('West of House')).toBeInTheDocument()
    expect(screen.getByText(/Score: 0/)).toBeInTheDocument()
  })

  it('announces score/moves and location changes via aria-live (S2)', () => {
    render(
      <StatusBar
        status={{ location: 'West of House', right: 'Score: 0   Moves: 1' }}
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    // The dynamic text sits in a polite live region so a turn's score/move
    // update reaches a screen reader; the buttons must stay outside it.
    expect(screen.getByText(/Score: 0/).closest('[aria-live]')).not.toBeNull()
    expect(
      screen.getByText('West of House').closest('[aria-live]'),
    ).not.toBeNull()
  })

  it('is a banner landmark', () => {
    render(
      <StatusBar status={null} onChangeStory={() => {}} themeToggle={null} />,
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('hides decorative glyphs (· separator and ▾ chevron) from assistive tech', () => {
    const { container } = render(
      <StatusBar
        status={{ location: 'West of House', right: 'Score: 0   Moves: 1' }}
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    // The middot is a purely visual divider; announcing it is noise.
    const sep = container.querySelector('.sep')
    expect(sep).toHaveAttribute('aria-hidden', 'true')

    // The trailing chevron decorates the button; the accessible name is the
    // word, with the glyph hidden so a screen reader doesn't read it.
    const button = screen.getByRole('button', { name: 'Change story' })
    const hiddenGlyph = button.querySelector('[aria-hidden="true"]')
    expect(hiddenGlyph?.textContent).toBe('▾')
  })

  it('renders the prefsToggle node between the picker and theme toggle', () => {
    render(
      <StatusBar
        status={null}
        onChangeStory={() => {}}
        themeToggle={<button>theme</button>}
        nlToggle={<span data-testid="nl">nl</span>}
        prefsToggle={<button>prefs</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'prefs' })).toBeInTheDocument()
  })

  it('Change story uses the trailing ▾ glyph (decorative, aria-hidden)', () => {
    render(
      <StatusBar
        status={null}
        onChangeStory={() => {}}
        themeToggle={<button>theme</button>}
      />,
    )
    const btn = screen.getByRole('button', { name: 'Change story' })
    expect(btn.textContent).toContain('▾')
    expect(btn.textContent).not.toContain('⌄')
  })
})
