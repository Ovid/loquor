import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import App from './App'
import { describeLoadError } from './loadError'

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
    expect(screen.getByText('Loquor')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Light the lamp/))
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 10000 },
    )
  })

  it('opens the story picker and dismisses back to the live game', async () => {
    render(<App />)
    fireEvent.click(screen.getByText(/Light the lamp/))
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 10000 },
    )
    // "Change story" overlays the picker on top of the running game.
    fireEvent.click(screen.getByText(/change story/i))
    await waitFor(() => expect(screen.getByText('Loquor')).toBeInTheDocument())
    // Dismissing returns to exactly where we were — the game is still mounted,
    // not rebooted, so its status line never disappeared.
    fireEvent.click(screen.getByRole('button', { name: /return to game/i }))
    await waitFor(() =>
      expect(screen.queryByText('Loquor')).not.toBeInTheDocument(),
    )
    expect(screen.getAllByText('West of House')[0]).toBeInTheDocument()
  })

  describe('describeLoadError', () => {
    // The generic "could not be loaded. Please try again." hid the real cause:
    // a dead server reads identically to a missing file (review #2). Each case
    // must explain WHY, while still containing "could not be loaded" so the UI
    // copy stays recognizable.
    it('names an unreachable server (fetch rejects with a TypeError)', () => {
      const msg = describeLoadError('Zork I', new TypeError('Failed to fetch'))
      expect(msg).toMatch(/could not be loaded/i)
      expect(msg).toMatch(/server|reach/i)
      expect(msg).not.toMatch(/try again/i)
    })

    it('names a missing file on HTTP 404', () => {
      const msg = describeLoadError(
        'Zork I',
        new Error('HTTP 404 for /games/zork1.z3'),
      )
      expect(msg).toMatch(/could not be loaded/i)
      expect(msg).toMatch(/404|missing/i)
    })

    it('reports the status on other HTTP errors', () => {
      const msg = describeLoadError(
        'Zork II',
        new Error('HTTP 500 for /games/zork2.z3'),
      )
      expect(msg).toMatch(/500/)
    })

    it('flags a body that is not a valid game file', () => {
      const msg = describeLoadError(
        'Zork III',
        new Error('/games/zork3.z3 is too short to be a game'),
      )
      expect(msg).toMatch(/could not be loaded/i)
      expect(msg).toMatch(/valid game/i)
    })

    it('falls back to a generic message for an unrecognized error', () => {
      const msg = describeLoadError('Zork I', new Error('something weird'))
      expect(msg).toMatch(/could not be loaded/i)
    })
  })

  it('surfaces a load error (instead of crashing) when the story file 404s', async () => {
    // fetch resolves with ok:false on a 404 — it does NOT reject. Without a
    // guard this fed an HTML error body into the VM; now it must surface.
    // The load failure is logged deliberately; mock it so EXPECTED errors
    // don't pollute test output (an unexpected one elsewhere still prints).
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      expect(screen.getByText(/404|missing/i)).toBeInTheDocument(),
    )
    // Still on the landing screen, not crashed into a blank/garbage VM.
    expect(screen.getByText('Loquor')).toBeInTheDocument()
    expect(errSpy).toHaveBeenCalledWith(
      '[ui] story load failed',
      expect.anything(),
    )
    errSpy.mockRestore()
  })

  it('surfaces a load error (instead of a dead terminal) when the story boots but fails (F-l)', async () => {
    // A body long enough to pass the length guard but not a valid story: fetch
    // succeeds, so loadStory accepts it, but the VM fails to boot. Before F-l
    // the player was left on a blank, frozen terminal with the error only in
    // the console; now the boot failure rides the same loadError surface a
    // fetch failure uses, and we return to the landing.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(64),
      })),
    )
    render(<App />)
    fireEvent.click(screen.getByText(/Light the lamp/))
    await waitFor(() =>
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument(),
    )
    // Back on the landing, not stuck on a blank terminal.
    expect(screen.getByText('Loquor')).toBeInTheDocument()
    expect(errSpy).toHaveBeenCalledWith('[ui] boot failed', expect.anything())
    errSpy.mockRestore()
  })

  it('rejects a body too short to be a story file', async () => {
    // fetch can succeed (ok:true) yet return a truncated/garbage body; the
    // length guard must catch it before it reaches the VM.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      expect(screen.getByText(/valid game/i)).toBeInTheDocument(),
    )
    expect(errSpy).toHaveBeenCalledWith(
      '[ui] story load failed',
      expect.anything(),
    )
    errSpy.mockRestore()
  })
})
