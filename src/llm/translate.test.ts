import { describe, it, expect } from 'vitest'
import { parseCompletion } from './translate'

describe('parseCompletion', () => {
  it('maps __UNKNOWN__ to abstain', () => {
    expect(parseCompletion('__UNKNOWN__')).toEqual({ kind: 'abstain' })
    expect(parseCompletion('  __UNKNOWN__\n')).toEqual({ kind: 'abstain' })
  })

  it('maps any other output to a trimmed command', () => {
    expect(parseCompletion('take lantern')).toEqual({
      kind: 'command',
      text: 'take lantern',
    })
    expect(parseCompletion('  north \n')).toEqual({
      kind: 'command',
      text: 'north',
    })
  })

  it('an empty completion abstains rather than sending a blank command', () => {
    expect(parseCompletion('   ')).toEqual({ kind: 'abstain' })
  })
})
