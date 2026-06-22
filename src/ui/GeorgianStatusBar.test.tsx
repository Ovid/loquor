import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { GeorgianStatusBar } from './GeorgianStatusBar'
import { GEORGIAN_ACTIVATION_TIP } from '../llm/notices'

describe('GeorgianStatusBar', () => {
  it('beta mode: Georgian-only beta notice + the persistent tip, no English half', () => {
    render(<GeorgianStatusBar showBeta={true} showNoCorpus={false} />)
    const bar = screen.getByRole('contentinfo', {
      name: /Georgian mode information/i,
    })
    // Beta notice, Georgian only (Decision 1) — the English half is GONE.
    const beta = within(bar).getByText(/ქართული თარგმანი ჯერ სატესტოა/)
    expect(beta).toHaveAttribute('lang', 'ka')
    expect(bar).not.toHaveTextContent(/Georgian is a beta translation/)
    // The relocated activation tip is permanent visible content here.
    expect(within(bar).getByText(GEORGIAN_ACTIVATION_TIP)).toHaveAttribute(
      'lang',
      'ka',
    )
    // It is NOT a live region (finding [7]) — persistent content must not chatter.
    expect(bar).not.toHaveAttribute('aria-live')
    // Decorative glyph is hidden from the a11y tree.
    expect(screen.getByText('ⓘ')).toHaveAttribute('aria-hidden', 'true')
  })

  it('no-corpus mode: bilingual notice (ka + en), NO tip', () => {
    render(<GeorgianStatusBar showBeta={false} showNoCorpus={true} />)
    const bar = screen.getByRole('contentinfo', {
      name: /Georgian mode information/i,
    })
    // Stays bilingual (Decision 1): both halves present, each with its own lang.
    expect(
      within(bar).getByText(/ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის/),
    ).toHaveAttribute('lang', 'ka')
    expect(
      within(bar).getByText(/Georgian isn’t available for this story/),
    ).toHaveAttribute('lang', 'en')
    // The display IS English here, so "type in English" is moot — tip omitted.
    expect(bar).not.toHaveTextContent(GEORGIAN_ACTIVATION_TIP)
    // Not the beta notice — the two are mutually exclusive.
    expect(bar).not.toHaveTextContent(/ქართული თარგმანი ჯერ სატესტოა/)
  })
})
