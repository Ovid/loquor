import { describe, it, expect } from 'vitest'
import { viewToContext, buildPrompt } from './prompt'
import { emptyView } from '../glkote-react/types'
import type { ViewState } from '../glkote-react/types'

const view = (over: Partial<ViewState>): ViewState => ({
  ...emptyView,
  ...over,
})

describe('viewToContext', () => {
  it('reads location from status, empty when status is null', () => {
    expect(viewToContext(emptyView).location).toBe('')
    expect(
      viewToContext(view({ status: { location: 'West of House', right: '' } }))
        .location,
    ).toBe('West of House')
  })

  it('recentOutput is the block since the last input line, excluding nl-source', () => {
    const v = view({
      lines: [
        { id: 1, kind: 'output', text: 'old stuff' },
        { id: 2, kind: 'input', text: 'open mailbox' },
        { id: 3, kind: 'nl-source', text: 'grab lantern' },
        {
          id: 4,
          kind: 'output',
          text: 'Opening the mailbox reveals a leaflet.',
        },
      ],
    })
    expect(viewToContext(v).recentOutput).toBe(
      'Opening the mailbox reveals a leaflet.',
    )
  })

  it('caps recentOutput to the tail at 1500 chars', () => {
    const big = 'x'.repeat(2000)
    const v = view({ lines: [{ id: 1, kind: 'output', text: big }] })
    const out = viewToContext(v).recentOutput
    expect(out.length).toBe(1500)
    expect(out.endsWith('x')).toBe(true)
  })
})

describe('buildPrompt', () => {
  it('emits a system + user message and includes the English', () => {
    const msgs = buildPrompt('grab the lantern', {
      location: 'West of House',
      recentOutput: 'You are standing in an open field.',
    })
    expect(msgs[0].role).toBe('system')
    expect(msgs[msgs.length - 1]).toEqual({
      role: 'user',
      content: 'grab the lantern',
    })
    expect(msgs[0].content).toContain('__UNKNOWN__')
  })

  it('omits the location line entirely when location is empty', () => {
    const msgs = buildPrompt('xyzzy', { location: '', recentOutput: '' })
    expect(
      msgs.some(m => /location/i.test(m.content) && /^.*: *$/m.test(m.content)),
    ).toBe(false)
    expect(JSON.stringify(msgs)).not.toContain('Location:')
  })
})
