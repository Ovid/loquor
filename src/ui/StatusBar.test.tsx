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

  it('hides the · separator from assistive tech', () => {
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
  })

  it('localizes the Change story label', () => {
    render(
      <StatusBar
        status={null}
        onChangeStory={() => {}}
        themeToggle={null}
        changeStoryLabel="Changer d’histoire"
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Changer d’histoire' }),
    ).toBeInTheDocument()
  })

  it('tags a non-English Change story label with its lang (WCAG 3.1.2)', () => {
    // Without lang, a screen reader voices the localized label with English
    // phonemes. The button text is in the UI language, so it must carry it.
    render(
      <StatusBar
        status={null}
        onChangeStory={() => {}}
        themeToggle={null}
        changeStoryLabel="ისტორიის შეცვლა"
        labelLang="ka"
      />,
    )
    expect(
      screen.getByRole('button', { name: 'ისტორიის შეცვლა' }),
    ).toHaveAttribute('lang', 'ka')
  })

  it('leaves the English Change story label untagged (no lang)', () => {
    // English matches the document lang, so tagging it is noise.
    render(
      <StatusBar status={null} onChangeStory={() => {}} themeToggle={null} />,
    )
    expect(
      screen.getByRole('button', { name: 'Change story' }),
    ).not.toHaveAttribute('lang')
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

  it('Change story carries no caret glyph — it opens an overlay, not a dropdown', () => {
    render(
      <StatusBar
        status={null}
        onChangeStory={() => {}}
        themeToggle={<button>theme</button>}
      />,
    )
    const btn = screen.getByRole('button', { name: 'Change story' })
    expect(btn.textContent).not.toContain('▾')
    expect(btn.textContent).not.toContain('⌄')
  })
})
