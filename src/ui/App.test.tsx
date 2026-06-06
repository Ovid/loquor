import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import App from './App'

beforeEach(() => {
  const bytes = readFileSync('public/games/zork1.z3')
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => bytes.buffer })))
})

describe('App', () => {
  it('routes from landing into the game', async () => {
    render(<App />)
    expect(screen.getByText('Naitfol')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Light the lamp/))
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 10000 },
    )
  })
})
