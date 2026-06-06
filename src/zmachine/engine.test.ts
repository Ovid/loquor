import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ZMachine } from './engine'
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
