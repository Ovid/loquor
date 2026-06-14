import { describe, it, expect } from 'vitest'
import { reduce, classify } from './reduce'
import { emptyView } from './types'
import fixture from '../../tests/fixtures/glkote-zork1-boot.json'
import endFixture from '../../tests/fixtures/glkote-zork1-end.json'

describe('reduce', () => {
  it('produces a status line and buffer text from the boot updates', () => {
    // Process all non-exit updates (boot fixture includes the exit as last
    // entry; we stop before it to assert the mid-session "awaiting input" state)
    const updates = (fixture as any).updates as any[]
    const nonExit = updates.filter((u: any) => !u.exit)
    let view = emptyView
    for (const update of nonExit) view = reduce(view, update as any)
    expect(view.lines.map(l => l.text).join('\n')).toContain('West of House')
    expect(view.status?.location).toContain('West of House')
    expect(view.inputRequest).toBe('line')
    expect(view.ended).toBe(false)
  })

  it('flags game end from the quit fixture so clear-on-quit can fire', () => {
    let view = emptyView
    for (const update of [
      ...(fixture as any).updates,
      ...(endFixture as any).quit,
    ])
      view = reduce(view, update as any)
    expect(view.ended).toBe(true)
    expect(view.inputRequest).toBeNull()
  })

  it('is pure — does not mutate the previous state', () => {
    const before = emptyView
    reduce(before, (fixture as any).updates[0] as any)
    expect(before).toEqual(emptyView)
  })

  // F-10 safety net: an `update` content entry matching NEITHER known shape
  // (no `lines[]`, no `text[]`) is currently dropped silently. The F-10 fix adds
  // a drift warning for that case; this pins that the reduction OUTPUT is
  // unchanged either way — a drifted/unknown window must never corrupt or wipe
  // the existing transcript, only (after the fix) get logged.
  it('ignores an unrecognized content entry without altering output', () => {
    const seeded = reduce(emptyView, {
      type: 'update',
      gen: 1,
      content: [{ id: 1, text: [{ content: ['normal', 'Kept line'] }] }],
    } as any)
    const after = reduce(seeded, {
      type: 'update',
      gen: 2,
      content: [{ id: 2, mystery: 'a future window shape' }],
    } as any)
    expect(after.lines.map(l => l.text)).toEqual(['Kept line'])
    expect(after.status).toEqual(seeded.status)
  })

  it('extracts flat alternating run arrays correctly from a synthetic buffer update', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [{ content: ['normal', 'Hello ', 'emphasized', 'World'] }],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    // Both text segments should be joined into one line
    expect(view.lines[0].text).toBe('Hello World')
  })

  it('emits a blank line for an empty paragraph {}', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [
            { content: ['normal', 'First'] },
            {}, // blank line
            { content: ['normal', 'Second'] },
          ],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    const texts = view.lines.map(l => l.text)
    expect(texts).toContain('First')
    expect(texts).toContain('')
    expect(texts).toContain('Second')
  })

  it('handles append:true by appending text to the previous emitted line', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [
            { content: ['normal', 'Hello '] },
            { content: ['normal', 'World'], append: true },
          ],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    // The two paragraphs should be merged into one line "Hello World"
    expect(view.lines).toHaveLength(1)
    expect(view.lines[0].text).toBe('Hello World')
  })

  it('renders an echoed player command (style "input") as an input line without the prompt char', () => {
    // Real shape (PROTOCOL-NOTES / fixture): the command echoes as an
    // input-styled run appended onto the bare ">" prompt line. It must become a
    // single kind:'input' line carrying only the command — the caret supplies
    // the ">", so keeping it here would render "> >look".
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [
            { content: ['normal', '>'] },
            { content: ['input', 'look'], append: true },
          ],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    expect(view.lines).toHaveLength(1)
    expect(view.lines[0].kind).toBe('input')
    expect(view.lines[0].text).toBe('look')
  })

  it('resets the transcript when a buffer entry has clear:true (RESTART / screen clear)', () => {
    // glk_window_clear sets obj.clear=true (glkapi.js:600-608). The prior
    // transcript must be dropped, not merged onto.
    let view = reduce(emptyView, {
      type: 'update',
      gen: 1,
      content: [{ id: 102, text: [{ content: ['normal', 'Old line'] }] }],
      input: [],
    } as any)
    expect(view.lines.map(l => l.text)).toContain('Old line')

    view = reduce(view, {
      type: 'update',
      gen: 2,
      content: [
        {
          id: 102,
          clear: true,
          // Realistic shape: the post-clear first paragraph arrives append:true
          // (it must NOT merge onto a now-stale trailing line).
          text: [{ content: ['normal', 'Fresh start'], append: true }],
        },
      ],
      input: [],
    } as any)
    expect(view.lines.map(l => l.text)).not.toContain('Old line')
    expect(view.lines.map(l => l.text)).toContain('Fresh start')
  })

  it('parses status line into location and right parts', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 104,
          lines: [
            {
              line: 0,
              content: [
                'normal',
                ' West of House                       Score: 0  Turns: 0 ',
              ],
            },
          ],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    expect(view.status?.location).toContain('West of House')
    expect(view.status?.right).toContain('Score')
  })

  it('treats a status line with no right-hand column as location-only', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        { id: 104, lines: [{ line: 0, content: ['normal', 'Cellar'] }] },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    expect(view.status?.location).toContain('Cellar')
    expect(view.status?.right).toBe('')
  })

  it('sets ended=true and clears inputRequest on exit:true update', () => {
    const exitUpdate = {
      type: 'update',
      gen: 9,
      windows: null,
      content: [],
      input: [],
      disable: true,
      exit: true,
    }
    const view = reduce(emptyView, exitUpdate as any)
    expect(view.ended).toBe(true)
    expect(view.inputRequest).toBeNull()
  })

  it('assigns ids per stream, not from a shared global', () => {
    // Two independent reducer streams (StrictMode / two engines) must each
    // start their ids at 1 rather than sharing a module-global counter.
    const mk = (t: string) =>
      ({
        type: 'update',
        gen: 1,
        content: [{ id: 102, text: [{ content: ['normal', t] }] }],
        input: [],
      }) as any
    const a = reduce(emptyView, mk('alpha'))
    const b = reduce(emptyView, mk('beta'))
    expect(a.lines[0].id).toBe(b.lines[0].id) // both start at 1, independent
  })

  it('resets ended on an in-place RESTART (clear + fresh line-input request)', () => {
    // Reach the dead state, then simulate an in-place RESTART: the screen wipes
    // (clear:true) and the VM asks for a command again. `ended` must not stay
    // latched, or any future UI gating on it would treat the restarted game as
    // over.
    let view = emptyView
    for (const update of [
      ...(fixture as any).updates,
      ...(endFixture as any).quit,
    ])
      view = reduce(view, update as any)
    expect(view.ended).toBe(true)

    view = reduce(view, {
      type: 'update',
      gen: 99,
      content: [
        {
          id: 7,
          clear: true,
          text: [{ content: ['normal', 'West of House'] }],
        },
      ],
      input: [{ type: 'line', id: 7, gen: 99 }],
    } as any)
    expect(view.ended).toBe(false)
    expect(view.inputRequest).toBe('line')
  })

  it('leaves the input request unchanged on a non-empty input with no line/char request', () => {
    // A GlkOte update may carry a non-empty `input` array that holds only a
    // hyperlink/mouse request (valid shapes) and no line/char. That must NOT
    // clear a still-pending line request — the VM is genuinely still waiting.
    let view = reduce(emptyView, {
      type: 'update',
      gen: 1,
      content: [{ id: 7, text: [{ content: ['normal', 'West of House'] }] }],
      input: [{ type: 'line', id: 7, gen: 1 }],
    } as any)
    expect(view.inputRequest).toBe('line')

    view = reduce(view, {
      type: 'update',
      gen: 2,
      input: [{ type: 'hyperlink', id: 7, gen: 2 }],
    } as any)
    expect(view.inputRequest).toBe('line')
  })

  it('classifies short title-case room headings as "room" kind', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [{ content: ['normal', 'West of House'] }],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    expect(view.lines[0].kind).toBe('room')
  })

  // UAT-4: container/inventory listings were styled as room headings. A room
  // title is never indented and never ends with ':' — listing entries arrive
  // with their nesting indent, listing headers with a trailing colon.
  it('classifies a listing header (trailing colon) as output, not room (UAT-4)', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [{ content: ['normal', 'The glass bottle contains:'] }],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    expect(view.lines[0].kind).toBe('output')
  })

  it('classifies an indented listing entry as output, not room (UAT-4)', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [{ content: ['normal', '  A quantity of water'] }],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    expect(view.lines[0].kind).toBe('output')
  })

  it('keeps the banner title (mid-line colon) as a room heading', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [
            { content: ['normal', 'ZORK I: The Great Underground Empire'] },
          ],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    expect(view.lines[0].kind).toBe('room')
  })
})

// The string-inventory coverage gate (inventory.test.ts) calls classify()
// directly as its room-title predicate (review I3). These pin the exact shape —
// especially the two UAT-4 exclusions — so a change here can't silently drift
// the gate from runtime behavior.
describe('classify (room-title shape — mirrored by the coverage gate)', () => {
  it('treats a short capitalized line with no terminal punctuation as a room', () => {
    expect(classify('West of House')).toBe('room')
    expect(classify('Forest')).toBe('room')
  })
  it('excludes an INDENTED line (listing entry carries its nesting indent)', () => {
    expect(classify('  A quantity of water')).toBe('output')
  })
  it('excludes a trailing-colon line (listing header)', () => {
    expect(classify('The glass bottle contains:')).toBe('output')
  })
  it('keeps the mid-line-colon banner as a heading', () => {
    expect(classify('ZORK I: The Great Underground Empire')).toBe('room')
  })
  it('treats sentence/terminated text as output', () => {
    expect(classify('You are likely to be eaten by a grue.')).toBe('output')
  })
})
