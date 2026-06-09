import { describe, it, expect } from 'vitest'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT } from './patterns'

describe('shared output patterns', () => {
  it('TAKE_ACK matches "Taken." but not arbitrary prose', () => {
    expect(TAKE_ACK.test('Taken.')).toBe(true)
    expect(TAKE_ACK.test('You see a lantern here.')).toBe(false)
  })

  it('TAKE_ACK matches ack lines, not narrative "taken" (review C7)', () => {
    // The ack is a standalone line ("Taken.") or the multi-take "item: Taken."
    expect(TAKE_ACK.test('leaflet: Taken.')).toBe(true)
    expect(TAKE_ACK.test('A secret path opens.\nTaken.')).toBe(true)
    // Narrative occurrences of the word must NOT register a successful take.
    expect(TAKE_ACK.test('The thief has taken the egg from you.')).toBe(false)
    expect(TAKE_ACK.test('You have already taken everything.')).toBe(false)
  })

  it('DROP_ACK matches "Dropped."', () => {
    expect(DROP_ACK.test('Dropped.')).toBe(true)
    expect(DROP_ACK.test('Taken.')).toBe(false)
  })

  it('DROP_ACK does not match narrative "dropped" (review C7)', () => {
    expect(DROP_ACK.test('sword: Dropped.')).toBe(true)
    expect(DROP_ACK.test('The thief dropped a jewel-encrusted egg.')).toBe(false)
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
