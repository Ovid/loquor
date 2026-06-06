import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandInput } from './CommandInput'

const field = () =>
  screen.getByPlaceholderText('type a command…') as HTMLInputElement

describe('CommandInput', () => {
  it('submits a non-empty command and clears the field', () => {
    const onSubmit = vi.fn()
    render(<CommandInput onSubmit={onSubmit} />)
    const input = field()
    fireEvent.change(input, { target: { value: 'look' } })
    fireEvent.submit(input)
    expect(onSubmit).toHaveBeenCalledWith('look')
    expect(input.value).toBe('')
  })

  it('ignores a whitespace-only submit', () => {
    const onSubmit = vi.fn()
    render(<CommandInput onSubmit={onSubmit} />)
    fireEvent.change(field(), { target: { value: '   ' } })
    fireEvent.submit(field())
    expect(onSubmit).not.toHaveBeenCalled()
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
})
