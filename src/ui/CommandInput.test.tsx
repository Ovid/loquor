import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandInput } from './CommandInput'

const field = () =>
  screen.getByPlaceholderText('type a command…') as HTMLInputElement

describe('CommandInput', () => {
  it('exposes an accessible name (placeholder is not a label)', () => {
    render(<CommandInput onSubmit={() => {}} />)
    // The sole input of the game must be named for screen readers; the
    // placeholder disappears on input and is not a reliable accessible name.
    expect(
      screen.getByRole('textbox', { name: 'Game command' }),
    ).toBeInTheDocument()
  })

  it('reflects an NL-active label/placeholder when given (S3)', () => {
    render(
      <CommandInput
        onSubmit={() => {}}
        label="Commande de jeu — français naturel accepté"
        placeholder="écrivez en français — ex. : ouvrez la boîte aux lettres"
        lang="fr"
      />,
    )
    const input = screen.getByRole('textbox', {
      name: 'Commande de jeu — français naturel accepté',
    })
    expect(input).toHaveAttribute('lang', 'fr')
    expect(input).toHaveAttribute('placeholder', expect.stringMatching(/français/))
  })

  it('submits a non-empty command and clears the field', () => {
    const onSubmit = vi.fn()
    render(<CommandInput onSubmit={onSubmit} />)
    const input = field()
    fireEvent.change(input, { target: { value: 'look' } })
    fireEvent.submit(input)
    expect(onSubmit).toHaveBeenCalledWith('look')
    expect(input.value).toBe('')
  })

  it('trims surrounding whitespace before submitting', () => {
    // The empty-guard validates value.trim(); the value sent must match what was
    // validated, not the raw padded string.
    const onSubmit = vi.fn()
    render(<CommandInput onSubmit={onSubmit} />)
    fireEvent.change(field(), { target: { value: '  open mailbox  ' } })
    fireEvent.submit(field())
    expect(onSubmit).toHaveBeenCalledWith('open mailbox')
  })

  it('ignores a whitespace-only submit', () => {
    const onSubmit = vi.fn()
    render(<CommandInput onSubmit={onSubmit} />)
    fireEvent.change(field(), { target: { value: '   ' } })
    fireEvent.submit(field())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('restores a discarded line on request, but not over new typing (M8)', () => {
    const { rerender } = render(<CommandInput onSubmit={() => {}} />)
    const input = field()
    // A failed translation asks to restore the cleared line.
    rerender(
      <CommandInput
        onSubmit={() => {}}
        restore={{ text: 'ouvre la boîte', key: 1 }}
      />,
    )
    expect(input.value).toBe('ouvre la boîte')

    // If the player has already started the next command, a later restore must
    // not clobber it.
    fireEvent.change(input, { target: { value: 'regarde' } })
    rerender(
      <CommandInput
        onSubmit={() => {}}
        restore={{ text: 'prends la lampe', key: 2 }}
      />,
    )
    expect(input.value).toBe('regarde')
  })

  it('routes a single keystroke to onKey while awaiting a char prompt', () => {
    const onKey = vi.fn()
    render(<CommandInput onSubmit={() => {}} awaitingKey onKey={onKey} />)
    fireEvent.keyDown(field(), { key: 'y' })
    expect(onKey).toHaveBeenCalledWith('y')
  })

  it('does not hijack multi-char keys (e.g. Enter) for char input', () => {
    const onKey = vi.fn()
    render(<CommandInput onSubmit={() => {}} awaitingKey onKey={onKey} />)
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onKey).not.toHaveBeenCalled()
  })

  it('refocuses the input when it re-enables after a pending turn', () => {
    // Real-app bug: while the NL layer translates, the input is disabled
    // (pending) and cannot hold focus. When translation finishes the input
    // re-enables but awaitingLine never transitioned, so an effect keyed only on
    // awaitingLine never refocuses — forcing the player to click back in to type.
    const { rerender } = render(
      <CommandInput onSubmit={() => {}} awaitingLine disabled={true} />,
    )
    const input = field()
    expect(document.activeElement).not.toBe(input) // disabled → unfocusable

    // Translation finishes: input re-enabled, VM still awaiting the same line.
    rerender(<CommandInput onSubmit={() => {}} awaitingLine disabled={false} />)
    expect(document.activeElement).toBe(input) // must refocus automatically
  })
})
