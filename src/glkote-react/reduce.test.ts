import { describe, it, expect } from 'vitest'
import { reduce } from './reduce'
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
    for (const update of [...(fixture as any).updates, ...(endFixture as any).quit])
      view = reduce(view, update as any)
    expect(view.ended).toBe(true)
    expect(view.inputRequest).toBeNull()
  })

  it('is pure — does not mutate the previous state', () => {
    const before = emptyView
    reduce(before, (fixture as any).updates[0] as any)
    expect(before).toEqual(emptyView)
  })

  it('extracts flat alternating run arrays correctly from a synthetic buffer update', () => {
    const update = {
      type: 'update',
      gen: 1,
      content: [
        {
          id: 102,
          text: [
            { content: ['normal', 'Hello ', 'emphasized', 'World'] },
          ],
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
            { content: ['normal', '>'] },
            { content: ['input', 'look'], append: true },
          ],
        },
      ],
      input: [],
    }
    const view = reduce(emptyView, update as any)
    // The two paragraphs should be merged into one line ">look"
    expect(view.lines).toHaveLength(1)
    expect(view.lines[0].text).toBe('>look')
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
})
