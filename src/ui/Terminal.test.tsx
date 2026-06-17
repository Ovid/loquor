import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { Terminal } from './Terminal'
import { WebLlmEngine } from '../llm/engine.webllm'
import { ZMachine } from '../zmachine/engine'
import type { UseNaturalLanguage } from '../llm/useNaturalLanguage'

// Passthrough mock: the real hook runs for every test, but a test can overlay
// specific fields (e.g. a non-empty queue) that are otherwise unreachable
// without a live LLM. Reset nlOverride to null after use.
let nlOverride: Partial<UseNaturalLanguage> | null = null
vi.mock('../llm/useNaturalLanguage', async importOriginal => {
  const mod = await importOriginal<typeof import('../llm/useNaturalLanguage')>()
  return {
    ...mod,
    useNaturalLanguage: (
      ...hookArgs: Parameters<typeof mod.useNaturalLanguage>
    ) => {
      const real = mod.useNaturalLanguage(...hookArgs)
      return nlOverride ? { ...real, ...nlOverride } : real
    },
  }
})

const bytes = new Uint8Array(readFileSync('public/games/zork1.z3'))
describe('Terminal', () => {
  it('boots Zork I and echoes a typed command', async () => {
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
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
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('[ui] boot failed', expect.anything()),
    )
    spy.mockRestore()
  })

  it('renders queued lines with a "queued" chip and keeps the input enabled (F-A)', async () => {
    nlOverride = {
      state: { phase: 'on', language: 'en', model: 'full', canUpgrade: true },
      pending: true,
      queued: [{ id: 0, text: 'take the lamp' }],
    }
    try {
      render(
        <Terminal
          storyBytes={bytes}
          storyTitle="Zork I"
          onChangeStory={() => {}}
          themeToggle={null}
        />,
      )
      await waitFor(
        () => expect(screen.getByText('queued')).toBeInTheDocument(),
        { timeout: 8000 },
      )
      expect(screen.getByText(/take the lamp/)).toBeInTheDocument()
      // S1: with debug off (the default) the queued marker is the '>' caret —
      // the SAME marker Scrollback commits to — not the bare 'you' label, so the
      // line doesn't relabel as it drains from queued → committed.
      expect(screen.queryByText('you')).not.toBeInTheDocument()
      // F-A: while NL is on, a mid-translation line queues — the input field
      // must stay ENABLED even though a translation is pending. With NL on the
      // placeholder signals plain-language input (S3), not the classic copy.
      const input = screen.getByPlaceholderText(/plain English/)
      expect(input).not.toBeDisabled()
    } finally {
      nlOverride = null
    }
  })

  it('surfaces an abstain notice in a role=status region, not the log (S1)', async () => {
    nlOverride = {
      state: { phase: 'on', language: 'fr', model: 'full', canUpgrade: true },
      notice: 'Je n’ai pas compris. Essayez une formulation plus simple.',
    }
    try {
      render(
        <Terminal
          storyBytes={bytes}
          storyTitle="Zork I"
          onChangeStory={() => {}}
          themeToggle={null}
        />,
      )
      // The notice must reach a screen reader as a status message, not buried
      // in the sequential transcript log.
      const status = await screen.findByRole('status', {}, { timeout: 8000 })
      expect(
        within(status).getByText(/Je n’ai pas compris/),
      ).toBeInTheDocument()
    } finally {
      nlOverride = null
    }
  })

  it('keeps the input enabled when NL is OFF while a stale translation is pending ([M])', async () => {
    // disabled={nl.pending && phase !== 'on'} locked the player out exactly
    // when a wedged/slow drain coincided with switching NL off — the one
    // moment raw play must be reachable. The input is never pending-disabled.
    nlOverride = {
      state: { phase: 'off', installed: true, canUpgrade: true },
      pending: true,
      queued: [],
    }
    try {
      render(
        <Terminal
          storyBytes={bytes}
          storyTitle="Zork I"
          onChangeStory={() => {}}
          themeToggle={null}
        />,
      )
      const input = await screen.findByPlaceholderText(
        'type a command…',
        {},
        { timeout: 8000 },
      )
      expect(input).not.toBeDisabled()
    } finally {
      nlOverride = null
    }
  })

  it('makes the game inert behind the download/upgrade modal (M9)', async () => {
    nlOverride = {
      state: { phase: 'off', installed: false, canUpgrade: true },
      modalOpen: true,
    }
    try {
      const { container } = render(
        <Terminal
          storyBytes={bytes}
          storyTitle="Zork I"
          onChangeStory={() => {}}
          themeToggle={null}
        />,
      )
      await waitFor(
        () => expect(screen.getByRole('dialog')).toBeInTheDocument(),
        { timeout: 8000 },
      )
      // The transcript and status bar are inert; the modal (a sibling) is not.
      expect(container.querySelector('main.term-main')).toHaveAttribute('inert')
      expect(container.querySelector('header.statusbar')).toHaveAttribute(
        'inert',
      )
      expect(screen.getByRole('dialog').closest('[inert]')).toBeNull()
    } finally {
      nlOverride = null
    }
  })

  it('renders English transcript unchanged when NL is off (output-translation passthrough)', async () => {
    // With NL off (default phase), useOutputTranslation is a passthrough — the
    // English ViewState lines must reach the DOM unmodified (spec §3).
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    // The opening room description is English and unchanged.
    expect(screen.getAllByText('West of House')[0]).toBeInTheDocument()
  })

  it('unloads the LLM engine when it unmounts (no resource leak)', async () => {
    const unload = vi
      .spyOn(WebLlmEngine.prototype, 'unload')
      .mockResolvedValue(undefined)
    const { unmount } = render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    unmount()
    expect(unload).toHaveBeenCalled()
    unload.mockRestore()
  })

  // F-17 safety net: the boot/dispose engine lifecycle currently lives in a
  // Terminal effect; F-17 extracts it into a hook. Pin that the ZMachine is
  // disposed on unmount (the StrictMode-safe teardown that stops a throwaway
  // engine persisting stale autosaves) so the extraction preserves it.
  it('disposes the ZMachine engine on unmount (F-17 lifecycle)', async () => {
    const dispose = vi.spyOn(ZMachine.prototype, 'dispose')
    try {
      const { unmount } = render(
        <Terminal
          storyBytes={bytes}
          storyTitle="Zork I"
          onChangeStory={() => {}}
          themeToggle={null}
        />,
      )
      await waitFor(
        () =>
          expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
        { timeout: 8000 },
      )
      unmount()
      expect(dispose).toHaveBeenCalled()
    } finally {
      dispose.mockRestore()
    }
  })

  describe('preferences', () => {
    it('opens the Preferences modal from the ⚙ button and toggles debug', async () => {
      render(
        <Terminal
          storyBytes={bytes}
          storyTitle="Zork I"
          onChangeStory={() => {}}
          themeToggle={null}
        />,
      )
      const open = await screen.findByRole(
        'button',
        { name: /preferences/i },
        { timeout: 8000 },
      )
      fireEvent.click(open)
      const dialog = screen.getByRole('dialog', { name: /preferences/i })
      expect(dialog).toBeInTheDocument()
      const box = screen.getByRole('checkbox', { name: /debug mode/i })
      expect(box).not.toBeChecked()
      fireEvent.click(box)
      expect(box).toBeChecked()
    })

    it('restores focus to the ⚙ opener when the modal closes (Escape)', async () => {
      render(
        <Terminal
          storyBytes={bytes}
          storyTitle="Zork I"
          onChangeStory={() => {}}
          themeToggle={null}
        />,
      )
      const open = await screen.findByRole(
        'button',
        { name: /preferences/i },
        { timeout: 8000 },
      )
      // Model the real focus state: a real pointer click focuses the button
      // before the trap captures it as the restore target.
      open.focus()
      fireEvent.click(open)
      fireEvent.keyDown(document.activeElement || document.body, {
        key: 'Escape',
      })
      await waitFor(() => expect(open).toHaveFocus())
    })
  })
})
