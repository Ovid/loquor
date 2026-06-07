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

  it('keeps a pending MORE-prompt classification across a content-only update', () => {
    // A content-only update carries no `input` field, so the reducer leaves
    // inputRequest at 'char'. The bridge must likewise leave charIsMore intact,
    // or it desyncs (ackMore would no-op a still-pending MORE prompt).
    const bridge = new GlkOteBridge(vi.fn())
    const accept = vi.fn()
    bridge.init({ accept })

    bridge.update({
      type: 'update',
      gen: 2,
      windows: [{ id: 7, type: 'buffer' }],
      input: [{ type: 'char', id: 7, gen: 2 }],
      more: true,
    } as any)
    // A content-only update (no input field) must not reclassify the prompt.
    bridge.update({
      type: 'update',
      gen: 3,
      content: [{ id: 7, text: [{ content: ['normal', 'more text'] }] }],
    } as any)
    accept.mockClear()
    bridge.ackMore()
    expect(accept).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'char', value: ' ' }),
    )
  })

  it('ignores VM updates once disposed (StrictMode throwaway engine)', () => {
    const onState = vi.fn()
    const bridge = new GlkOteBridge(onState)
    bridge.init({ accept: vi.fn() })
    bridge.dispose()
    bridge.update({ type: 'update', gen: 1, content: [], input: [] } as any)
    expect(onState).not.toHaveBeenCalled()
  })

  it('getlibrary returns the injected Dialog and null for anything else', () => {
    const bridge = new GlkOteBridge(vi.fn())
    bridge.dialog = { marker: true }
    expect(bridge.getlibrary('Dialog')).toEqual({ marker: true })
    expect(bridge.getlibrary('Glk')).toBeNull()
  })

  it('forwards glk errors to the console (warnings/logs stay silent)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bridge = new GlkOteBridge(vi.fn())
    bridge.warning('ignored')
    bridge.log('ignored')
    bridge.error('boom')
    expect(spy).toHaveBeenCalledWith('[glk]', 'boom')
    spy.mockRestore()
  })

  it('echoLocal appends a UI-only nl-source line that survives later VM updates', () => {
    const states: any[] = []
    const bridge = new GlkOteBridge(v => states.push(v))
    bridge.init({ accept: vi.fn() })

    bridge.echoLocal('grab the brass lantern')
    const afterEcho = states[states.length - 1]
    const src = afterEcho.lines.find((l: any) => l.kind === 'nl-source')
    expect(src).toBeTruthy()
    expect(src.text).toBe('grab the brass lantern')

    // A subsequent VM update (the canonical echo + output) must not drop it.
    bridge.update({
      type: 'update',
      gen: 1,
      content: [{ id: 7, text: [{ content: ['input', 'take lantern'] }] }],
      input: [{ type: 'line', id: 7, gen: 1 }],
    } as any)
    const after = states[states.length - 1]
    expect(after.lines.some((l: any) => l.kind === 'nl-source')).toBe(true)
  })

  it('preserves the nl-source line when the VM echo arrives append:true', () => {
    // The realistic echo shape: the canonical command echoes append:true (it was
    // meant to merge onto the VM's bare ">" prompt). Our extra nl-source line is
    // now the buffer tail, so a naive merge would corrupt it (e.g. "go northnorth"
    // reclassified as input). It must stay intact and the echo become its own
    // line (review I3).
    const states: any[] = []
    const bridge = new GlkOteBridge(v => states.push(v))
    bridge.init({ accept: vi.fn() })

    bridge.echoLocal('go north')
    bridge.update({
      type: 'update',
      gen: 1,
      content: [
        { id: 7, text: [{ content: ['input', 'north'], append: true }] },
      ],
      input: [{ type: 'line', id: 7, gen: 1 }],
    } as any)

    const after = states[states.length - 1]
    const src = after.lines.find((l: any) => l.kind === 'nl-source')
    expect(src).toBeTruthy()
    expect(src.text).toBe('go north')
    expect(
      after.lines.some((l: any) => l.kind === 'input' && l.text === 'north'),
    ).toBe(true)
  })
})
