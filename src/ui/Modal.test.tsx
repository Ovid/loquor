import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

const noop = () => {}

describe('Modal', () => {
  it('renders a labelled modal dialog with its children when open', () => {
    render(
      <Modal open titleId="t" title="Settings" onEscape={noop}>
        <button type="button">Done</button>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Settings')
    // The title is a real heading, and children render inside the card.
    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} titleId="t" title="Settings" onEscape={noop}>
        <button type="button">Done</button>
      </Modal>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('routes Escape to onEscape', () => {
    const onEscape = vi.fn()
    render(
      <Modal open titleId="t" title="Settings" onEscape={onEscape}>
        <button type="button">Done</button>
      </Modal>,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('moves focus to the first focusable child on open', () => {
    render(
      <Modal open titleId="t" title="Settings" onEscape={noop}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>,
    )
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'First' }),
    )
  })
})
