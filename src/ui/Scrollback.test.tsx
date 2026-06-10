import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Scrollback } from './Scrollback'
import type { BufferLine } from '../glkote-react/types'

const line = (over: Partial<BufferLine>): BufferLine =>
  ({ id: 1, text: '', kind: 'output', ...over }) as BufferLine

describe('Scrollback', () => {
  it('drops the bare ">" prompt line but keeps echoes and room lines', () => {
    const { container } = render(
      <Scrollback
        lines={[
          line({ id: 1, text: '>', kind: 'output' }),
          line({ id: 2, text: 'open mailbox', kind: 'input' }),
          line({ id: 3, text: 'West of House', kind: 'room' }),
        ]}
      />,
    )
    // The redundant bare-'>' paragraph is filtered; the other two survive.
    expect(container.querySelectorAll('p')).toHaveLength(2)
    expect(screen.getByText(/open mailbox/)).toBeInTheDocument()
    expect(screen.getByText(/West of House/)).toBeInTheDocument()
  })

  it('keeps an nl-source line even when its text is literally ">"', () => {
    render(
      <Scrollback
        lines={[
          line({ id: 1, text: '>', kind: 'output' }), // VM prompt — dropped
          { id: 2, kind: 'nl-source', text: '>' }, // player's English — kept
        ]}
      />,
    )
    // Only the nl-source '>' survives, rendered with its `you` label.
    expect(document.querySelectorAll('p.nl-source')).toHaveLength(1)
  })

  it('focuses the prompt on mouse-up when no text is selected', () => {
    const onActivate = vi.fn()
    const { container } = render(
      <Scrollback lines={[]} onActivate={onActivate} />,
    )
    fireEvent.mouseUp(container.querySelector('.scroll')!)
    expect(onActivate).toHaveBeenCalled()
  })

  it('does not steal focus while the player is selecting text', () => {
    const onActivate = vi.fn()
    const sel = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ toString: () => 'highlighted' } as Selection)
    const { container } = render(
      <Scrollback lines={[]} onActivate={onActivate} />,
    )
    fireEvent.mouseUp(container.querySelector('.scroll')!)
    expect(onActivate).not.toHaveBeenCalled()
    sel.mockRestore()
  })

  // Spec §12: NL source lines carry a worded `you` label; the `>` prefix is
  // reserved for real (canonical) commands; the `›` glyph is gone everywhere.
  it('nl-source lines carry a worded you label, no > and no ›', () => {
    render(
      <Scrollback
        lines={[{ id: 1, kind: 'nl-source', text: 'ouvre la boîte' }]}
      />,
    )
    expect(screen.getByText('you')).toBeInTheDocument()
    const p = screen.getByText('ouvre la boîte', { exact: false }).closest('p')!
    expect(p).toHaveClass('nl-source')
    expect(p.textContent).not.toContain('>')
    expect(p.textContent).not.toContain('›')
  })

  it('input (real command) lines keep the > prefix; › is gone everywhere', () => {
    render(
      <Scrollback lines={[{ id: 2, kind: 'input', text: 'open mailbox' }]} />,
    )
    const p = screen.getByText('open mailbox', { exact: false }).closest('p')!
    expect(p.textContent).toContain('>')
    expect(p.textContent).not.toContain('›')
    expect(p).toHaveClass('echo')
  })

  it('renders the shimmer style on pending lines (output-translation spec §6)', () => {
    render(
      <Scrollback
        lines={[{ id: 1, kind: 'output', text: '…traduction', pending: true }]}
      />,
    )
    const p = screen.getByText('…traduction').closest('p')!
    expect(p.className).toContain('xl-pending')
  })
})
