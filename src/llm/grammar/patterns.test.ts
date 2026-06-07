import { describe, it, expect } from 'vitest'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT } from './patterns'

describe('shared output patterns', () => {
  it('TAKE_ACK matches "Taken." but not arbitrary prose', () => {
    expect(TAKE_ACK.test('Taken.')).toBe(true)
    expect(TAKE_ACK.test('You see a lantern here.')).toBe(false)
  })

  it('DROP_ACK matches "Dropped."', () => {
    expect(DROP_ACK.test('Dropped.')).toBe(true)
    expect(DROP_ACK.test('Taken.')).toBe(false)
  })

  it('ABSENCE_PAT captures the absent noun across phrasings', () => {
    const grab = (s: string): string[] => {
      const re = new RegExp(ABSENCE_PAT.source, ABSENCE_PAT.flags)
      const out: string[] = []
      let m: RegExpExecArray | null
      while ((m = re.exec(s)) !== null) {
        out.push(m.slice(1).find(g => g !== undefined) ?? '')
        if (m.index === re.lastIndex) re.lastIndex++
      }
      return out
    }
    expect(grab('There is no lamp here.')).toContain('lamp')
    expect(grab('The trophy case is empty.')).toContain('case')
    expect(grab("You can't see any troll here.")).toContain('troll')
  })
})
