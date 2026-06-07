import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { Terminal } from './Terminal'

const bytes = new Uint8Array(readFileSync('public/games/zork1.z3'))
describe('Terminal', () => {
  it('boots Zork I and echoes a typed command', async () => {
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
    const input = screen.getByPlaceholderText('type a command…')
    fireEvent.change(input, { target: { value: 'open mailbox' } })
    fireEvent.submit(input)
    await waitFor(
      () => expect(screen.getAllByText(/open mailbox/i)[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )

    // Clicking in the transcript (no active selection) refocuses the prompt.
    input.blur()
    fireEvent.mouseUp(document.querySelector('.scroll')!)
    expect(document.activeElement).toBe(input)
  })

  it('logs (and does not crash) when booting invalid story bytes', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Terminal
        storyBytes={new Uint8Array([1, 2, 3, 4])}
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('boot failed', expect.anything()),
    )
    spy.mockRestore()
  })
})
