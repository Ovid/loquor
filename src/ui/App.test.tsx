import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import App from './App'

beforeEach(() => {
  const bytes = readFileSync('public/games/zork1.z3')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => bytes.buffer })),
  )
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

  it('returns to the landing screen via "change volume"', async () => {
    render(<App />)
    fireEvent.click(screen.getByText(/Light the lamp/))
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 10000 },
    )
    fireEvent.click(screen.getByText(/change volume/))
    await waitFor(() => expect(screen.getByText('Naitfol')).toBeInTheDocument())
  })

  it('surfaces a load error (instead of crashing) when the story file 404s', async () => {
    // fetch resolves with ok:false on a 404 — it does NOT reject. Without a
    // guard this fed an HTML error body into the VM; now it must surface.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        arrayBuffer: async () => new ArrayBuffer(0),
      })),
    )
    render(<App />)
    fireEvent.click(screen.getByText(/Light the lamp/))
    await waitFor(() =>
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument(),
    )
    // Still on the landing screen, not crashed into a blank/garbage VM.
    expect(screen.getByText('Naitfol')).toBeInTheDocument()
  })

  it('rejects a body too short to be a story file', async () => {
    // fetch can succeed (ok:true) yet return a truncated/garbage body; the
    // length guard must catch it before it reaches the VM.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(4),
      })),
    )
    render(<App />)
    fireEvent.click(screen.getByText(/Light the lamp/))
    await waitFor(() =>
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument(),
    )
  })
})
