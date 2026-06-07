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

  it('renders an nl-source line with a > marker and the .nl-source class', () => {
    render(
      <Scrollback
        lines={[{ id: 1, kind: 'nl-source', text: 'grab the brass lantern' }]}
      />,
    )
    const p = screen.getByText('grab the brass lantern').closest('p')!
    expect(p).toHaveClass('nl-source')
    expect(p.textContent).toContain('>')
  })

  it('renders a VM input echo with the › marker (not >)', () => {
    render(
      <Scrollback lines={[{ id: 2, kind: 'input', text: 'take lantern' }]} />,
    )
    const p = screen.getByText('take lantern').closest('p')!
    expect(p.textContent).toContain('›') // ›
    expect(p).toHaveClass('echo')
  })
})
