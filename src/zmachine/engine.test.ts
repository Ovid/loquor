import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ZMachine } from './engine'
import { isConfirmationPrompt } from '../llm/translate'
import type { ViewState } from '../glkote-react/types'

describe('ZMachine', () => {
  it('boots Zork I to "West of House" and accepts a command', async () => {
    const states: ViewState[] = []
    const engine = new ZMachine({
      dialog: {
        streaming: false,
        autosave_read: () => null,
        autosave_write: () => {},
      } as any,
      onState: v => states.push(v),
      onEnd: vi.fn(),
    })
    const story = new Uint8Array(readFileSync('public/games/zork1.z3'))
    await engine.boot(story)

    const text = states
      .at(-1)!
      .lines.map(l => l.text)
      .join('\n')
    expect(text).toContain('West of House')
    expect(states.at(-1)!.inputRequest).toBe('line')

    engine.sendLine('open mailbox')
    const after = states
      .at(-1)!
      .lines.map(l => l.text)
      .join('\n')
    expect(after.toLowerCase()).toContain('mailbox')
  })

  // UAT F10 reported `restart` as a silent no-op. Real-VM probing proved that is
  // NOT an engine bug: restart prints a confirmation that is read as LINE input
  // (not a single-key char prompt), isConfirmationPrompt matches it (so the NL
  // layer passes the "Y" reply raw, not to the model), and "y" resets the game.
  // Autosave is NOT re-read on restart, so a persisting Dialog cannot mask the
  // reset. This pins the engine contract the NL restart path depends on.
  it('restart confirms via LINE input and resets to West of House on "y" (UAT F10)', async () => {
    const states: ViewState[] = []
    const store = new Map<string, unknown>()
    const engine = new ZMachine({
      dialog: {
        streaming: false,
        autosave_read: (s: string) => store.get(s) ?? null,
        autosave_write: (s: string, snap: unknown) =>
          snap == null ? store.delete(s) : store.set(s, snap),
        preload: async () => {},
        hasSave: async (s: string) => store.has(s),
      } as any,
      onState: v => states.push(v),
    })
    await engine.boot(new Uint8Array(readFileSync('public/games/zork1.z3')))

    engine.sendLine('north') // move to a distinct room
    engine.sendLine('restart')

    const prompt = states.at(-1)!
    const promptText = prompt.lines.map(l => l.text).join('\n')
    expect(prompt.inputRequest).toBe('line') // a line reply, NOT a char keypress
    expect(promptText).toMatch(/do you wish to restart/i)
    // The NL layer keys off this: it passes "Y" raw rather than translating it.
    expect(isConfirmationPrompt(promptText)).toBe(true)

    engine.sendLine('y')
    expect(states.at(-1)!.status?.location).toBe('West of House')
  })
})

const stubDialog = () =>
  ({
    streaming: false,
    autosave_read: () => null,
    autosave_write: () => {},
  }) as any

describe('ZMachine input delegation', () => {
  it('forwards input methods to the bridge without throwing before boot', () => {
    // accept is wired by Glk.init at boot, so pre-boot calls must be safe
    // no-ops (the bridge guards them with optional chaining).
    const engine = new ZMachine({ dialog: stubDialog(), onState: () => {} })
    expect(engine.awaitingKey()).toBe(false)
    expect(() => {
      engine.sendLine('look')
      engine.sendChar('y')
      engine.ackMore()
    }).not.toThrow()
  })

  it('dispose() tears down the bridge and a disposable dialog', () => {
    const dispose = vi.fn()
    const engine = new ZMachine({
      dialog: { ...stubDialog(), dispose },
      onState: () => {},
    })
    engine.dispose()
    expect(dispose).toHaveBeenCalled()
  })

  it('dispose() is a safe no-op when the dialog is not disposable', () => {
    const engine = new ZMachine({ dialog: stubDialog(), onState: () => {} })
    expect(() => engine.dispose()).not.toThrow()
  })
})

describe('ZMachine.flushAutosave', () => {
  it('returns immediately when the dialog cannot report saves', async () => {
    const engine = new ZMachine({ dialog: stubDialog(), onState: () => {} })
    ;(engine as any).signature = 'SIG'
    await expect(engine.flushAutosave()).resolves.toBeUndefined()
  })

  it('polls hasSave until the snapshot has settled', async () => {
    let calls = 0
    const dialog = {
      ...stubDialog(),
      hasSave: async () => {
        calls++
        return calls > 1 // miss once (exercises the poll/backoff), then hit
      },
    }
    const engine = new ZMachine({ dialog: dialog as any, onState: () => {} })
    ;(engine as any).signature = 'SIG'
    await engine.flushAutosave()
    expect(calls).toBe(2)
  })
})
