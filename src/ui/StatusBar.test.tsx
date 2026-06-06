import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'

describe('StatusBar', () => {
  it('shows location and right-hand score/moves', () => {
    render(<StatusBar status={{ location: 'West of House', right: 'Score: 0   Moves: 1' }}
      onChangeVolume={() => {}} themeToggle={null} />)
    expect(screen.getByText('West of House')).toBeInTheDocument()
    expect(screen.getByText(/Score: 0/)).toBeInTheDocument()
  })
})
