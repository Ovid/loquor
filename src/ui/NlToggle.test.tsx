import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NlToggle } from './NlToggle'

describe('NlToggle', () => {
  it('unavailable shows a why + an override action', () => {
    const onOverride = vi.fn()
    render(
      <NlToggle
        state={{ phase: 'unavailable', reasons: ['no-webgpu'] }}
        onToggle={vi.fn()}
        onOverride={onOverride}
      />,
    )
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument()
    screen.getByRole('button', { name: /force|override/i }).click()
    expect(onOverride).toHaveBeenCalled()
  })

  it('off · not installed', () => {
    render(
      <NlToggle
        state={{ phase: 'off', installed: false }}
        onToggle={vi.fn()}
        onOverride={vi.fn()}
      />,
    )
    expect(screen.getByText(/not installed/i)).toBeInTheDocument()
  })

  it('off · installed', () => {
    render(
      <NlToggle
        state={{ phase: 'off', installed: true }}
        onToggle={vi.fn()}
        onOverride={vi.fn()}
      />,
    )
    expect(screen.getByText(/installed/i)).toBeInTheDocument()
  })

  it('on toggles', () => {
    const onToggle = vi.fn()
    render(
      <NlToggle
        state={{ phase: 'on' }}
        onToggle={onToggle}
        onOverride={vi.fn()}
      />,
    )
    screen.getByRole('button', { name: /english/i }).click()
    expect(onToggle).toHaveBeenCalled()
  })

  it('downloading shows a percentage', () => {
    render(
      <NlToggle
        state={{ phase: 'downloading', loaded: 1, total: 4, etaSeconds: null }}
        onToggle={vi.fn()}
        onOverride={vi.fn()}
      />,
    )
    expect(screen.getByText(/25%/)).toBeInTheDocument()
  })

  it('disabled (no grammar for this game) renders nothing — silently', () => {
    const { container } = render(
      <NlToggle
        state={{ phase: 'disabled' }}
        onToggle={vi.fn()}
        onOverride={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
