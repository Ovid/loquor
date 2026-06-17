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
    const { container } = render(
      <Scrollback
        lines={[
          line({ id: 1, text: '>', kind: 'output' }), // VM prompt — dropped
          { id: 2, kind: 'nl-source', text: '>' }, // player's English — kept
        ]}
      />,
    )
    // The VM's bare '>' is dropped; the nl-source '>' survives. In debug-OFF
    // (default) it renders as a plain command line (class 'echo'), not the pill.
    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(container.querySelectorAll('p.echo')).toHaveLength(1)
  })

  it('exposes the transcript as a polite live log so output is announced', () => {
    render(<Scrollback lines={[line({ id: 1, text: 'West of House' })]} />)
    // Screen readers must hear streamed game output; the always-mounted
    // container is a polite log that announces additions.
    const log = screen.getByRole('log', { name: 'Game transcript' })
    expect(log).toHaveAttribute('aria-live', 'polite')
    expect(log).toHaveAttribute('aria-relevant', 'additions')
  })

  it('renders the per-line lang so localized text is pronounced right (3.1.2)', () => {
    render(
      <Scrollback
        lines={[
          { id: 1, kind: 'room', text: "À l'ouest de la maison", lang: 'fr' },
        ]}
      />,
    )
    const p = screen.getByText(/ouest de la maison/).closest('p')!
    expect(p).toHaveAttribute('lang', 'fr')
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

  // Spec §12 + debug gating (Task 7): in debug-ON the player's pre-translation
  // text carries the worded `you` pill; the `›` glyph is gone everywhere.
  it('debug-ON nl-source lines carry a worded you pill, no ›', () => {
    render(
      <Scrollback
        debug
        lines={[{ id: 1, kind: 'nl-source', text: 'ouvre la boîte' }]}
      />,
    )
    expect(screen.getByText('you')).toBeInTheDocument()
    const p = screen.getByText('ouvre la boîte', { exact: false }).closest('p')!
    expect(p).toHaveClass('nl-source')
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

  describe('debug view', () => {
    const lines = [
      { id: 1, kind: 'nl-source' as const, text: 'arriba' },
      { id: 2, kind: 'nl-canonical' as const, text: 'up' },
      { id: 3, kind: 'output' as const, text: 'You climb up.' },
    ]

    it('debug OFF: hides the canonical echo and renders nl-source as a command', () => {
      render(<Scrollback lines={lines} debug={false} />)
      // nl-source shows as a typed command line, not the pill:
      expect(screen.getByText('arriba')).toBeInTheDocument()
      expect(screen.queryByText('you')).not.toBeInTheDocument()
      // canonical echo is gone entirely (not just hidden):
      expect(screen.queryByText('up')).not.toBeInTheDocument()
    })

    it('debug ON: shows the pill and the canonical echo', () => {
      render(<Scrollback lines={lines} debug={true} />)
      expect(screen.getByText('you')).toBeInTheDocument() // the pill label
      expect(screen.getByText('up')).toBeInTheDocument() // the canonical echo
    })

    it('suppresses the live region across a debug toggle', () => {
      const { rerender } = render(<Scrollback lines={lines} debug={false} />)
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
      rerender(<Scrollback lines={lines} debug={true} />)
      // The toggle commit must not announce the bulk re-render.
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'off')
    })

    it('still announces a new line that arrives in the same commit as a toggle (S3)', () => {
      const { rerender } = render(<Scrollback lines={lines} debug={false} />)
      // A debug toggle AND a genuine new output line land in one render: the new
      // line must not be muted just because debug flipped.
      const more = [
        ...lines,
        { id: 4, kind: 'output' as const, text: 'Taken.' },
      ]
      rerender(<Scrollback lines={more} debug={true} />)
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
    })

    it('resumes polite announcements on the next real-output render', () => {
      const { rerender } = render(<Scrollback lines={lines} debug={false} />)
      rerender(<Scrollback lines={lines} debug={true} />) // toggle → muted
      const more = [
        ...lines,
        { id: 4, kind: 'output' as const, text: 'Taken.' },
      ]
      rerender(<Scrollback lines={more} debug={true} />) // real output → live again
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
    })
  })
})
