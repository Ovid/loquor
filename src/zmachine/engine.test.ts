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
