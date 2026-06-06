import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { Terminal } from './Terminal'

const bytes = new Uint8Array(readFileSync('public/games/zork1.z3'))
describe('Terminal', () => {
  it('boots Zork I and echoes a typed command', async () => {
    render(<Terminal storyBytes={bytes} onChangeVolume={() => {}} themeToggle={null} />)
    await waitFor(() => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 })
    const input = screen.getByPlaceholderText('type a command…')
    fireEvent.change(input, { target: { value: 'open mailbox' } })
    fireEvent.submit(input)
    await waitFor(() => expect(screen.getAllByText(/open mailbox/i)[0]).toBeInTheDocument(),
      { timeout: 8000 })
  })
})
