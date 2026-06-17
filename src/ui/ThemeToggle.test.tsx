import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('names the action by its target theme so current state is conveyed', () => {
    const onToggle = vi.fn()
    const { rerender } = render(
      <ThemeToggle theme="dark" onToggle={onToggle} />,
    )
    const btn = screen.getByRole('button', { name: 'Switch to light theme' })
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalled()
    rerender(<ThemeToggle theme="light" onToggle={onToggle} />)
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeInTheDocument()
  })
})
