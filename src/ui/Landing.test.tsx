import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Landing } from './Landing'

describe('Landing', () => {
  it('lets you pick a volume and enter', () => {
    const onEnter = vi.fn()
    render(<Landing onEnter={onEnter} savedSlugs={new Set()} themeToggle={null} />)
    fireEvent.click(screen.getByText('The Wizard of Frobozz'))
    fireEvent.click(screen.getByText(/Light the lamp/))
    expect(onEnter).toHaveBeenCalledWith('zork2')
  })
  it('shows a resume hint for saved games', () => {
    render(<Landing onEnter={() => {}} savedSlugs={new Set(['zork1'])} themeToggle={null} />)
    expect(screen.getByText(/resume/i)).toBeInTheDocument()
  })
})
