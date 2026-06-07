import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { Terminal } from './Terminal'

const bytes = new Uint8Array(readFileSync('public/games/zork1.z3'))

describe('Terminal game end', () => {
  it('keeps the input live after quit so RESTART is typeable', async () => {
    render(
      <Terminal
        storyBytes={bytes}
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    const input = screen.getByPlaceholderText(
      'type a command…',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'quit' } })
    fireEvent.submit(input)
    // Zork asks to confirm; the input must remain enabled to answer / RESTART.
    await waitFor(() => expect(input).not.toBeDisabled(), { timeout: 8000 })
  })
})
