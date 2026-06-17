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
    expect(spy).toHaveBeenCalledWith('[glk] boom')
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

  it('awaitTurn resolves reason:"line" with the settled view on a line update', async () => {
    const bridge = new GlkOteBridge(vi.fn())
    bridge.init({ accept: vi.fn() })
    const p = bridge.awaitTurn()
    bridge.update({
      type: 'update',
      gen: 1,
      windows: [{ id: 7, type: 'buffer' }],
      content: [{ id: 7, text: [{ content: ['normal', 'West of House'] }] }],
      input: [{ type: 'line', id: 7, gen: 1 }],
    } as any)
    const r = await p
    expect(r.reason).toBe('line')
    expect(r.view.inputRequest).toBe('line')
  })

  it('awaitTurn pages through a MORE prompt then resolves on the next line', async () => {
    const bridge = new GlkOteBridge(vi.fn())
    const accept = vi.fn()
    bridge.init({ accept })
    const p = bridge.awaitTurn()
    // A MORE char prompt: with an awaiter pending, the bridge auto-acks with space…
    bridge.update({
      type: 'update',
      gen: 2,
      windows: [{ id: 7, type: 'buffer' }],
      input: [{ type: 'char', id: 7, gen: 2 }],
      more: true,
    } as any)
    expect(accept).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'char', value: ' ' }),
    )
    // …and only resolves once the real line boundary arrives.
    bridge.update({
      type: 'update',
      gen: 3,
      windows: [{ id: 7, type: 'buffer' }],
      input: [{ type: 'line', id: 7, gen: 3 }],
    } as any)
    await expect(p).resolves.toMatchObject({ reason: 'line' })
  })

  it('awaitTurn resolves reason:"key" on a genuine single-key prompt', async () => {
    const bridge = new GlkOteBridge(vi.fn())
    bridge.init({ accept: vi.fn() })
    const p = bridge.awaitTurn()
    bridge.update({
      type: 'update',
      gen: 2,
      windows: [{ id: 7, type: 'buffer' }],
      input: [{ type: 'char', id: 7, gen: 2 }],
    } as any)
    await expect(p).resolves.toMatchObject({ reason: 'key' })
  })

  it('awaitTurn resolves reason:"end" when the game ends', async () => {
    const bridge = new GlkOteBridge(vi.fn())
    bridge.init({ accept: vi.fn() })
    const p = bridge.awaitTurn()
    bridge.update({ type: 'update', gen: 1, exit: true } as any)
    await expect(p).resolves.toMatchObject({ reason: 'end' })
  })

  it('multiple concurrent awaiters all resolve on the same line boundary', async () => {
    const bridge = new GlkOteBridge(vi.fn())
    bridge.init({ accept: vi.fn() })
    const a = bridge.awaitTurn()
    const b = bridge.awaitTurn()
    bridge.update({
      type: 'update',
      gen: 1,
      windows: [{ id: 7, type: 'buffer' }],
      input: [{ type: 'line', id: 7, gen: 1 }],
    } as any)
    const both = await Promise.all([a, b])
    expect(both.map(r => r.reason)).toEqual(['line', 'line'])
  })
})

describe('canonical send flagging', () => {
  // Input-echo update shape (matches reduce's buffer-paragraph contract).
  const echoUpdate = (cmd: string) => ({
    type: 'update' as const,
    content: [{ text: [{ append: true, content: ['input', cmd] }] }],
    input: [{ type: 'line', id: 1, gen: 0 }],
  })

  it('sendLineCanonical makes the next echo render nl-canonical', () => {
    let view: any
    const bridge = new GlkOteBridge(v => (view = v))
    bridge.init({ accept: vi.fn() })
    bridge.echoLocal('arriba') // the player's Spanish, UI-only
    bridge.sendLineCanonical('up') // canonical send → arms the flag
    bridge.update(echoUpdate('up') as any)
    expect(view.lines.at(-1)).toMatchObject({
      kind: 'nl-canonical',
      text: 'up',
    })
  })

  it('plain sendLine leaves the next echo as input', () => {
    let view: any
    const bridge = new GlkOteBridge(v => (view = v))
    bridge.init({ accept: vi.fn() })
    bridge.sendLine('up')
    bridge.update(echoUpdate('up') as any)
    expect(view.lines.at(-1)).toMatchObject({ kind: 'input', text: 'up' })
  })
})

describe('autosave round-trips NL line kinds (resume leak fix)', () => {
  // The canonical-echo property lives only at the send seam (canonicalEcho) and
  // the nl-source line is UI-only — neither is in the VM's Glk buffer. So on a
  // page reload + autorestore, the VM replays the echo as a plain input-styled
  // paragraph and the reducer reclassifies it `input`, leaking the English `> up`
  // in debug-off (the default). The fix carries the rendered ViewState lines
  // through save_allstate()'s autosave round-trip (glkapi embeds it as
  // snapshot.glk.glkote and hands it back on arg.autorestore — glkapi.js:778,988).
  it('keeps a translated echo nl-canonical (and restores the nl-source line) after restore', () => {
    // --- First session: a translated turn ("arriba" → canonical "up"). ---
    let view: any
    const bridge = new GlkOteBridge(v => (view = v))
    bridge.init({ accept: vi.fn() })
    bridge.echoLocal('arriba') // player's Spanish, UI-only nl-source line
    bridge.sendLineCanonical('up') // canonical send arms the flag
    bridge.update({
      type: 'update',
      gen: 1,
      content: [
        {
          text: [
            { append: true, content: ['input', 'up'] },
            { content: ['normal', "You can't go that way."] },
          ],
        },
      ],
      input: [{ type: 'line', id: 7, gen: 1 }],
    } as any)
    // Sanity: live, the translated echo is nl-canonical (debug-off hides it).
    expect(
      view.lines.some((l: any) => l.kind === 'nl-canonical' && l.text === 'up'),
    ).toBe(true)

    // The native autosave captures our display state at this turn boundary.
    const saved = bridge.save_allstate()

    // --- Second session: a fresh bridge boots and glkapi autorestores. It
    // replays the VM buffer (echo is plain input-styled) AND hands our saved
    // glkote state back on arg.autorestore. ---
    let view2: any
    const bridge2 = new GlkOteBridge(v => (view2 = v))
    bridge2.init({ accept: vi.fn() })
    bridge2.update({
      type: 'update',
      gen: 1,
      content: [
        {
          text: [
            { content: ['input', 'up'] },
            { content: ['normal', "You can't go that way."] },
          ],
        },
      ],
      input: [{ type: 'line', id: 7, gen: 1 }],
      autorestore: saved,
    } as any)

    // The translated echo must stay hidden-able (nl-canonical), the nl-source
    // line must come back, and the bare English `> up` input must NOT leak.
    expect(
      view2.lines.some(
        (l: any) => l.kind === 'nl-canonical' && l.text === 'up',
      ),
    ).toBe(true)
    expect(
      view2.lines.some(
        (l: any) => l.kind === 'nl-source' && l.text === 'arriba',
      ),
    ).toBe(true)
    expect(
      view2.lines.some((l: any) => l.kind === 'input' && l.text === 'up'),
    ).toBe(false)
  })
})
