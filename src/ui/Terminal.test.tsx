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
import { helpResponse } from '../llm/help'
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

  it('announces the localized help block in the role=status region (Task 11 a11y)', async () => {
    // The help intercept surfaces helpResponse(lang) through the same `notice`
    // channel as the abstain notices, so it lands in the role=status aria-live
    // region — a screen-reader user hears the cheat-sheet, per the a11y mandate.
    nlOverride = {
      state: {
        phase: 'on',
        language: 'es',
        model: 'grammar',
        canUpgrade: true,
      },
      notice: helpResponse('es'),
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
      const status = await screen.findByRole('status', {}, { timeout: 8000 })
      expect(within(status).getByText(/Ayuda —/)).toBeInTheDocument()
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

  // Georgian (ka), spec §5 + §5.6: output-translated DISPLAY on every game, and
  // since Task 17 INPUT-active on a game that has a ka lexicon (Zork I → routes
  // through nl.translate) while still raw-sending English on Zork II/III. Offers
  // no model download/upgrade on any game (no LLM).
  describe('Georgian (ka) — output-only on Zork II/III, input-active on Zork I (Option A + §5.6)', () => {
    // Task 17 (§5.6): ka graduates to INPUT on a game that HAS a ka lexicon —
    // Zork I today. On Zork I a typed line (Georgian OR plain-ASCII English)
    // routes through nl.translate; the engine still sees a missed English line,
    // but via the pipeline's §5.5 abstain raw-send (asserted in the lexicon
    // suite), NOT a boundary raw-send here — so this asserts translate, not
    // sendLine.
    it('ka on Zork I: a typed command routes through nl.translate (headline)', async () => {
      const sendLine = vi.spyOn(ZMachine.prototype, 'sendLine')
      const translate = vi.fn(async () => null)
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
        translate,
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
        // The placeholder is now signature-DEPENDENT for ka (Task 20): kaInputActive
        // keys on the RESOLVED Zork I signature, so the field shows the Phase-2
        // Georgian-input copy. Sync on the Georgian beta notice (gated on
        // corpusFor(signature,'ka'), true only once the Zork I signature resolves)
        // before submitting, else kaInputActive('ka','') is false at submit time.
        await screen.findByText(
          /ქართული თარგმანი ჯერ სატესტოა/,
          {},
          { timeout: 8000 },
        )
        // Phase-2 ka placeholder mentions Georgian (ქართულ); the type-English copy
        // does NOT — so this discriminates the Zork I (Georgian-input) split.
        const input = screen.getByPlaceholderText(/ქართულ/)
        // a11y (WCAG 3.1.2): the field VALUE is Georgian on Zork I, so the input
        // is tagged lang="ka" — a screen reader voices it with Georgian phonemes
        // (the Zork II test below pins the opposite: English value, no lang="ka").
        expect(input).toHaveAttribute('lang', 'ka')
        // A Georgian command…
        fireEvent.change(input, { target: { value: 'გახსენი ყუთი' } })
        fireEvent.submit(input)
        expect(translate).toHaveBeenCalledWith('გახსენი ყუთი')
        // …and a plain-ASCII English command both go through the pipeline (§5.5
        // handles the ASCII raw-send inside translate); neither boundary-raw-sends.
        fireEvent.change(input, { target: { value: 'open mailbox' } })
        fireEvent.submit(input)
        expect(translate).toHaveBeenCalledWith('open mailbox')
        // Terminal must NOT duplicate the §5.5 abstain raw-send at the boundary.
        expect(sendLine).not.toHaveBeenCalled()
      } finally {
        sendLine.mockRestore()
        nlOverride = null
      }
    })

    it('ka on Zork II: a typed command still raw-sends English, never nl.translate (§5.6)', async () => {
      // Zork II has NO ka lexicon → kaInputActive is false → ka stays Phase-1
      // output-only: the field raw-sends English while the display is (un)translated.
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      const sendLine = vi.spyOn(ZMachine.prototype, 'sendLine')
      const translate = vi.fn(async () => null)
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
        translate,
      }
      try {
        render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        const input = await screen.findByPlaceholderText(
          /ინგლისურ/,
          {},
          { timeout: 8000 },
        )
        // Zork II ka raw-sends English → the field shows the Phase-1 type-English
        // placeholder (commandPlaceholderTypeEnglish), which has NO ქართულ — so
        // this pins the signature split (the Phase-2 Zork I copy would contain it).
        expect(input.getAttribute('placeholder')).not.toMatch(/ქართულ/)
        fireEvent.change(input, { target: { value: 'open mailbox' } })
        fireEvent.submit(input)
        expect(sendLine).toHaveBeenCalledWith('open mailbox')
        expect(translate).not.toHaveBeenCalled()
      } finally {
        sendLine.mockRestore()
        nlOverride = null
      }
    })

    it('ka on Zork II: the help word is intercepted to the Georgian help block, not raw-sent (P3.1)', async () => {
      // On a no-lexicon game (Zork II) ka raw-sends English for play, but the
      // activation notice instructs the player to type `help`. The localized help
      // intercept lives inside nl.translate, which ka-on-Zork-II never calls — so
      // `help` must be intercepted at the Loquor (Terminal) boundary BEFORE the
      // raw-send, or it reaches the parser and earns "I don't know the word help".
      // (On Zork I ka, help goes through nl.translate's in-pipeline intercept —
      // asserted in the next test.) Every OTHER ka command still raw-sends.
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      const sendLine = vi.spyOn(ZMachine.prototype, 'sendLine')
      const translate = vi.fn(async () => null)
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
        translate,
      }
      try {
        render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        const input = await screen.findByPlaceholderText(
          /ინგლისურ/,
          {},
          { timeout: 8000 },
        )
        fireEvent.change(input, { target: { value: 'help' } })
        fireEvent.submit(input)
        // Not sent to the game (no turn burned) and never routed through the NL
        // input pipeline (ka has none on Zork II).
        expect(sendLine).not.toHaveBeenCalledWith('help')
        expect(translate).not.toHaveBeenCalled()
        // The localized Georgian help block surfaces via the role=status notice.
        // showHelp sets the notice AFTER this async submit, and the role=status
        // live-region is always mounted (even empty) — so await the help TEXT
        // appearing, not the region element (which resolves immediately and would
        // race the state update).
        const status = await screen.findByRole('status', {}, { timeout: 8000 })
        expect(
          await within(status).findByText(/დახმარება/, {}, { timeout: 8000 }),
        ).toBeInTheDocument()
      } finally {
        sendLine.mockRestore()
        nlOverride = null
      }
    })

    it('ka on Zork I: the help word goes through nl.translate (in-pipeline intercept), not the boundary', async () => {
      // On Zork I ka is INPUT-active, so `help` is NOT intercepted at the
      // Terminal boundary — it routes through nl.translate, whose in-pipeline help
      // intercept handles it. So the boundary showHelp must NOT fire.
      const sendLine = vi.spyOn(ZMachine.prototype, 'sendLine')
      const translate = vi.fn(async () => null)
      const showHelp = vi.fn()
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
        translate,
        showHelp,
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
        // Sync on the resolved Zork I signature (see headline test) so
        // kaInputActive is true before we submit.
        await screen.findByText(
          /ქართული თარგმანი ჯერ სატესტოა/,
          {},
          { timeout: 8000 },
        )
        const input = screen.getByPlaceholderText(/ინგლისურ/)
        fireEvent.change(input, { target: { value: 'help' } })
        fireEvent.submit(input)
        expect(translate).toHaveBeenCalledWith('help')
        // The boundary intercept must NOT fire on Zork I ka.
        expect(showHelp).not.toHaveBeenCalled()
        expect(sendLine).not.toHaveBeenCalled()
      } finally {
        sendLine.mockRestore()
        nlOverride = null
      }
    })

    it('ka on Zork II: the command field exposes a localized "type in English" name (P3, a11y)', async () => {
      // Pinned on Zork II, where ka is still output-only (no lexicon) and the
      // field raw-sends English: the value is English, so `lang` must NOT be 'ka'
      // (tagging an English value Georgian voices it with Georgian phonemes —
      // a11y regression I3). The localized "type in English" name is driven
      // separately by activeLang and stays correct. (On Zork I ka now types
      // Georgian, so its field correctly carries lang="ka" — Task 17.)
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
      }
      try {
        render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        // The sole input must have a correct, localized accessible name for a
        // Georgian screen-reader user: it raw-sends English, said in Georgian.
        const input = await screen.findByRole(
          'textbox',
          { name: /ინგლისურ/ },
          { timeout: 8000 },
        )
        // The Phase-1 type-English LABEL (commandLabelTypeEnglish) has NO ქართულ;
        // the bilingual commandLabel('ka') (Zork I) DOES — so this proves the
        // signature gating fired (Task 20), not just that the field has SOME name.
        // CommandInput renders the accessible name via aria-label.
        expect(input.getAttribute('aria-label')).not.toMatch(/ქართულ/)
        // ...but the input VALUE is English (ka raw-sends on Zork II), so the
        // field's `lang` must NOT be 'ka'.
        expect(input).not.toHaveAttribute('lang', 'ka')
      } finally {
        nlOverride = null
      }
    })

    it('ka: selecting it does not auto-open the model-download modal', async () => {
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
        modalOpen: true,
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
        // Wait for boot to line-input (input field present). NB: the room name
        // renders in GEORGIAN here (ka output is translated by the now-authored
        // corpus), so don't wait on the English 'West of House' — wait on the
        // language-agnostic input affordance instead.
        await screen.findByPlaceholderText(/ინგლისურ/, {}, { timeout: 8000 })
        expect(screen.queryByRole('dialog')).toBeNull()
      } finally {
        nlOverride = null
      }
    })

    it('fr (regression): a typed command still routes through nl.translate', async () => {
      const sendLine = vi.spyOn(ZMachine.prototype, 'sendLine')
      const translate = vi.fn(async () => null)
      nlOverride = {
        state: { phase: 'on', language: 'fr', model: 'full', canUpgrade: true },
        translate,
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
        // fr engages NL input → the field carries the plain-language placeholder.
        const input = await screen.findByPlaceholderText(
          /écrivez en français/i,
          {},
          { timeout: 8000 },
        )
        fireEvent.change(input, { target: { value: 'ouvre la boîte' } })
        fireEvent.submit(input)
        expect(translate).toHaveBeenCalledWith('ouvre la boîte')
        expect(sendLine).not.toHaveBeenCalled()
      } finally {
        sendLine.mockRestore()
        nlOverride = null
      }
    })
  })

  describe('Georgian beta notice (spec §5)', () => {
    it('shows a Georgian-only beta notice + the tip in the bottom bar (no English half)', async () => {
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
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
        // The footer surfaces once the signature resolves and the corpus is
        // consulted at boot — wait for the Georgian beta text.
        const ka = await screen.findByText(
          /ქართული თარგმანი ჯერ სატესტოა/,
          {},
          { timeout: 8000 },
        )
        expect(ka).toHaveAttribute('lang', 'ka')
        const bar = screen.getByRole('contentinfo', {
          name: /Status information/i,
        })
        expect(bar).toContainElement(ka)
        // Decision 1: the English half is GONE from the beta notice.
        expect(bar).not.toHaveTextContent(/Georgian is a beta translation/)
        // The relocated tip is permanent visible content in the bar. On Zork I
        // (ka input-active) it is the Phase-2 Georgian-INPUT tip ("type in
        // Georgian (beta)"); Task 20 gates Zork II/III back to the type-English
        // tip by signature.
        expect(bar).toHaveTextContent(/რჩევა: ბრძანებები აკრიფეთ ქართულად/)
      } finally {
        nlOverride = null
      }
    })

    it('always shows the bottom bar with the NL-mode readout for French', async () => {
      // The bug this fixes: the bottom bar used to appear ONLY in Georgian. It is
      // now always present, in every language, carrying the diagnostic readout.
      nlOverride = {
        state: { phase: 'on', language: 'fr', model: 'full', canUpgrade: true },
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
        const bar = await screen.findByRole(
          'contentinfo',
          { name: /Status information/i },
          { timeout: 8000 },
        )
        expect(bar).toHaveTextContent('complet · saisie')
        expect(bar).toHaveTextContent('Zork I')
      } finally {
        nlOverride = null
      }
    })

    it('suppresses the beta notice when the game has no Georgian corpus (review S5)', async () => {
      // Zork II has no ka corpus → display stays English, so the "beta
      // translation" claim must NOT appear (it would be misleading). This
      // suppression is load-bearing; guard it against a refactor regression.
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
      }
      try {
        render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        // Wait for boot to emit transcript output — the signature has resolved
        // and the corpus has been consulted by then.
        await waitFor(
          () => expect(screen.getByRole('log')).toHaveTextContent(/\S/),
          { timeout: 8000 },
        )
        expect(screen.queryByText(/ქართული თარგმანი ჯერ სატესტოა/)).toBeNull()
      } finally {
        nlOverride = null
      }
    })

    it('shows the bilingual no-corpus cue in the bottom bar, with no tip ([I4])', async () => {
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
      }
      try {
        render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        const ka = await screen.findByText(
          /ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის/,
          {},
          { timeout: 8000 },
        )
        expect(ka).toHaveAttribute('lang', 'ka')
        const bar = screen.getByRole('contentinfo', {
          name: /Status information/i,
        })
        expect(bar).toContainElement(ka)
        // Stays bilingual (Decision 1).
        const en = within(bar).getByText(
          /Georgian isn’t available for this story/,
        )
        expect(en).toHaveAttribute('lang', 'en')
        // No type-English tip — the display IS English here.
        expect(bar).not.toHaveTextContent(/რჩევა: ბრძანებები აკრიფეთ/)
        // Not the beta notice — mutually exclusive.
        expect(bar).not.toHaveTextContent(/ქართული თარგმანი ჯერ სატესტოა/)
      } finally {
        nlOverride = null
      }
    })
  })

  describe('Georgian bottom status bar (spec 2026-06-21)', () => {
    const ka = {
      phase: 'on' as const,
      language: 'ka' as const,
      model: 'grammar' as const,
      canUpgrade: true,
    }

    it('fires the one-shot tip in a dedicated live region, not role=status (item 4)', async () => {
      nlOverride = {
        state: ka,
        announce: 'რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს.',
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
        // The bar is always present now, so it can't be the sync point — wait on
        // the dedicated announce region directly (it populates once the signature
        // resolves and showBetaNotice turns true).
        const tip = await screen.findByText(
          'რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს.',
          { selector: '[aria-live]' },
          { timeout: 8000 },
        )
        const bar = screen.getByRole('contentinfo', {
          name: /Status information/i,
        })
        // Dedicated polite live region, Georgian-voiced.
        expect(tip).toHaveAttribute('aria-live', 'polite')
        expect(tip).toHaveAttribute('lang', 'ka')
        // NOT inside the inline role=status region (that carries help/abstain).
        const status = screen.getByRole('status')
        expect(status).not.toContainElement(tip)
        // The static footer is NOT a live region (finding [7]).
        expect(bar).not.toHaveAttribute('aria-live')
      } finally {
        nlOverride = null
      }
    })

    it('keeps transient NL notices inline, not in the bar (item 5)', async () => {
      nlOverride = {
        state: ka,
        notice: 'დახმარება — ბრძანებები აკრიფეთ ინგლისურად.',
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
        const notice = await screen.findByText(
          /დახმარება — ბრძანებები აკრიფეთ/,
          {},
          { timeout: 8000 },
        )
        // The help reply lives in the inline role=status region…
        const status = screen.getByRole('status')
        expect(status).toContainElement(notice)
        // …and the activation tip never leaks INTO that inline region (finding
        // [6], both sides): it rides the dedicated announce region, so a help
        // reply and the tip can never co-occupy / clobber each other.
        expect(status).not.toHaveTextContent(/^რჩევა/)
        // …not in the bottom bar. Wait for the bar (signature must resolve first).
        const bar = await screen.findByRole(
          'contentinfo',
          { name: /Status information/i },
          { timeout: 8000 },
        )
        expect(bar).not.toContainElement(notice)
      } finally {
        nlOverride = null
      }
    })

    it('suppresses the one-shot tip announcement on a no-corpus ka game (finding [6])', async () => {
      // Zork II has no ka corpus → the display is English. Announcing "type in
      // English; text appears in Georgian" would be locally wrong, so the
      // announce region's content is corpus-gated even though the latch fired
      // nl.announce on ka entry. The bilingual no-corpus footer still shows.
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      nlOverride = {
        state: ka,
        announce: 'რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს.',
      }
      try {
        render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        // Wait for the no-corpus footer to confirm boot + corpus resolution.
        await screen.findByText(
          /ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის/,
          {},
          { timeout: 8000 },
        )
        // The tip is announced NOWHERE — neither the dedicated region nor the bar.
        expect(screen.queryByText(/^რჩევა: ბრძანებები აკრიფეთ/)).toBeNull()
      } finally {
        nlOverride = null
      }
    })

    it('mounts the announce live region empty (gated on ka, not on content) so it can fire later (S2)', async () => {
      // Pins the MOUNT-vs-CONTENT split at Terminal.tsx:368-371: the sr-only
      // region must be REGISTERED while still empty (mount gated on outLang ===
      // 'ka' only) so a screen reader observes the empty→filled transition. A
      // no-corpus ka game has showBetaNotice === false, so the region mounts but
      // its content is null. If a refactor folded the mount gate into the content
      // gate, the region would never pre-mount and the announcement would die
      // silently — this asserts the empty region exists.
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      nlOverride = {
        state: ka,
        announce: 'რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს.',
      }
      try {
        const { container } = render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        // Wait for corpus resolution (no-corpus footer) so we're past boot.
        await screen.findByText(
          /ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის/,
          {},
          { timeout: 8000 },
        )
        const region = container.querySelector(
          '[aria-live="polite"][lang="ka"]',
        )
        expect(region).not.toBeNull()
        expect(region).toBeEmptyDOMElement()
      } finally {
        nlOverride = null
      }
    })

    it('drops the Georgian notice (but keeps the bar) when switching ka → en (item 6)', async () => {
      nlOverride = { state: ka }
      try {
        const { rerender } = render(
          <Terminal
            storyBytes={bytes}
            storyTitle="Zork I"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        // The Georgian beta notice is present under ka.
        await screen.findByText(
          /ქართული თარგმანი ჯერ სატესტოა/,
          {},
          { timeout: 8000 },
        )
        // Switch to English: the ka player notice must vanish, but the bar stays
        // (it is always present now) carrying the English readout.
        nlOverride = {
          state: {
            phase: 'on',
            language: 'en',
            model: 'full',
            canUpgrade: true,
          },
        }
        rerender(
          <Terminal
            storyBytes={bytes}
            storyTitle="Zork I"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        await waitFor(() =>
          expect(
            screen.queryByText(/ქართული თარგმანი ჯერ სატესტოა/),
          ).toBeNull(),
        )
        const bar = screen.getByRole('contentinfo', {
          name: /Status information/i,
        })
        expect(bar).toHaveTextContent('full · input')
      } finally {
        nlOverride = null
      }
    })
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
