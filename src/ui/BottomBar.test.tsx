import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { BottomBar } from './BottomBar'
import { nlModeSummary } from './nlModeSummary'
import { GEORGIAN_ACTIVATION_TIP } from '../llm/notices'
import type { NlState } from '../llm/types'

describe('nlModeSummary', () => {
  it('reports the disabled / off / downloading phases', () => {
    expect(nlModeSummary({ phase: 'disabled' })).toBe('no NL')
    expect(
      nlModeSummary({ phase: 'off', installed: true, canUpgrade: true }),
    ).toBe('off')
    expect(
      nlModeSummary({
        phase: 'downloading',
        language: 'de',
        loaded: 1,
        total: 2,
        etaSeconds: null,
      }),
    ).toBe('downloading…')
  })

  it('reports an input language with its model tier', () => {
    expect(
      nlModeSummary({
        phase: 'on',
        language: 'de',
        model: 'full',
        canUpgrade: true,
      }),
    ).toBe('de · full · input')
    expect(
      nlModeSummary({
        phase: 'on',
        language: 'fr',
        model: 'grammar',
        canUpgrade: false,
      }),
    ).toBe('fr · grammar · input')
  })

  it('reports an output-only language (ka) as output-only, never input', () => {
    expect(
      nlModeSummary({
        phase: 'on',
        language: 'ka',
        model: 'grammar',
        canUpgrade: true,
      }),
    ).toBe('ka · output-only')
  })
})

const FR_ON: NlState = {
  phase: 'on',
  language: 'fr',
  model: 'full',
  canUpgrade: true,
}

describe('BottomBar', () => {
  it('always shows the NL-mode summary and story title, with no signature off-debug', () => {
    render(
      <BottomBar
        debug={false}
        nlState={FR_ON}
        storyTitle="Zork I"
        signature="03000077abcd"
        showBeta={false}
        showNoCorpus={false}
      />,
    )
    const bar = screen.getByRole('contentinfo', { name: /Status information/i })
    expect(bar).toHaveTextContent('fr · full · input — Zork I')
    // The signature is a debug-only detail — absent when debug is off.
    expect(bar).not.toHaveTextContent('03000077')
    // The readout is plain static text, not a live region.
    expect(bar).not.toHaveAttribute('aria-live')
    expect(screen.getByText('ⓘ')).toHaveAttribute('aria-hidden', 'true')
    // The readout is English text under a non-English UI — tag it lang="en"
    // so a screen reader doesn't voice it with the wrong phonemes (WCAG 3.1.2).
    expect(screen.getByText(/fr · full · input — Zork I/)).toHaveAttribute(
      'lang',
      'en',
    )
  })

  it('debug on: appends the story signature, truncated to 8 hex', () => {
    render(
      <BottomBar
        debug
        nlState={FR_ON}
        storyTitle="Zork I"
        signature="03000077abcd"
        showBeta={false}
        showNoCorpus={false}
      />,
    )
    const bar = screen.getByRole('contentinfo', { name: /Status information/i })
    expect(bar).toHaveTextContent('fr · full · input — Zork I · 03000077')
    expect(bar).not.toHaveTextContent('03000077abcd')
  })

  it('debug on, signature not yet resolved: no trailing separator', () => {
    render(
      <BottomBar
        debug
        nlState={FR_ON}
        storyTitle="Zork I"
        signature=""
        showBeta={false}
        showNoCorpus={false}
      />,
    )
    expect(
      screen.getByRole('contentinfo', { name: /Status information/i }),
    ).toHaveTextContent('fr · full · input — Zork I')
  })

  it('Georgian beta: the readout AND the Georgian-only beta notice + tip, no English half', () => {
    render(
      <BottomBar
        nlState={{
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        }}
        storyTitle="Zork I"
        debug={false}
        signature="03000077"
        showBeta={true}
        showNoCorpus={false}
      />,
    )
    const bar = screen.getByRole('contentinfo', { name: /Status information/i })
    // The always-on readout is present alongside the player notice.
    expect(bar).toHaveTextContent('ka · output-only')
    const beta = within(bar).getByText(/ქართული თარგმანი ჯერ სატესტოა/)
    expect(beta).toHaveAttribute('lang', 'ka')
    expect(bar).not.toHaveTextContent(/Georgian is a beta translation/)
    expect(within(bar).getByText(GEORGIAN_ACTIVATION_TIP)).toHaveAttribute(
      'lang',
      'ka',
    )
  })

  it('Georgian no-corpus: the readout AND the bilingual notice (ka + en), NO tip', () => {
    render(
      <BottomBar
        nlState={{
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        }}
        storyTitle="Zork II"
        debug={false}
        signature="03000077"
        showBeta={false}
        showNoCorpus={true}
      />,
    )
    const bar = screen.getByRole('contentinfo', { name: /Status information/i })
    expect(bar).toHaveTextContent('ka · output-only')
    expect(
      within(bar).getByText(/ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის/),
    ).toHaveAttribute('lang', 'ka')
    expect(
      within(bar).getByText(/Georgian isn’t available for this story/),
    ).toHaveAttribute('lang', 'en')
    expect(bar).not.toHaveTextContent(GEORGIAN_ACTIVATION_TIP)
    expect(bar).not.toHaveTextContent(/ქართული თარგმანი ჯერ სატესტოა/)
  })
})
