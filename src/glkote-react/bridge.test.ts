import { describe, it, expect, vi } from 'vitest'
import { GlkOteBridge } from './bridge'

describe('GlkOteBridge', () => {
  it('notifies the sink with reduced state on update, and sends line events', () => {
    const onState = vi.fn()
    const accept = vi.fn()
    const bridge = new GlkOteBridge(onState)

    bridge.init({ accept })
    // bridge should fire the startup 'init' event so the VM begins.
    expect(accept).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'init', gen: 0 }),
    )

    bridge.update({
      type: 'update',
      gen: 1,
      windows: [{ id: 7, type: 'buffer' }],
      content: [{ id: 7, text: [{ content: ['normal', 'West of House'] }] }],
      input: [{ type: 'line', id: 7, gen: 1 }],
    } as any)
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ inputRequest: 'line' }),
    )

    bridge.sendLine('open mailbox')
    expect(accept).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'line', value: 'open mailbox', gen: 1 }),
    )
  })

  it('fires onEnd exactly once even though `ended` latches across later updates', () => {
    const onEnd = vi.fn()
    const bridge = new GlkOteBridge(vi.fn())
    bridge.onEnd = onEnd
    bridge.init({ accept: vi.fn() })

    bridge.update({ type: 'update', gen: 1, exit: true } as any)
    // A spurious trailing update must not re-fire onEnd (ended stays true).
    bridge.update({ type: 'update', gen: 2 } as any)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('dispose() stops emitting state (a StrictMode throwaway goes quiet)', () => {
    const onState = vi.fn()
    const bridge = new GlkOteBridge(onState)
    bridge.init({ accept: vi.fn() })
    onState.mockClear()
    bridge.dispose()
    bridge.update({
      type: 'update',
      gen: 1,
      windows: [{ id: 7, type: 'buffer' }],
      content: [{ id: 7, text: [{ content: ['normal', 'noise'] }] }],
      input: [{ type: 'line', id: 7, gen: 1 }],
    } as any)
    expect(onState).not.toHaveBeenCalled()
  })

  it('auto-acks a MORE prompt but routes a genuine key prompt to sendChar', () => {
    const bridge = new GlkOteBridge(vi.fn())
    const accept = vi.fn()
    bridge.init({ accept })

    // A synthetic [MORE]/paging char request — ackMore() answers it with a space.
    bridge.update({
      type: 'update',
      gen: 2,
      windows: [{ id: 7, type: 'buffer' }],
      input: [{ type: 'char', id: 7, gen: 2 }],
      more: true,
    } as any)
    bridge.ackMore()
    expect(accept).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'char', value: ' ', gen: 2 }),
    )

    // A genuine single-key prompt — ackMore() must NOT answer it; a keystroke does.
    bridge.update({
      type: 'update',
      gen: 3,
      windows: [{ id: 7, type: 'buffer' }],
      input: [{ type: 'char', id: 7, gen: 3 }],
    } as any)
    accept.mockClear()
    bridge.ackMore()
    expect(accept).not.toHaveBeenCalled() // not MORE → left pending
    expect(bridge.awaitingKey()).toBe(true)
    bridge.sendChar('y')
    expect(accept).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'char', value: 'y', gen: 3 }),
    )
  })
})
