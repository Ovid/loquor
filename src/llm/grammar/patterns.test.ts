import { describe, it, expect } from 'vitest'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT, SOFT_NOOP_PAT } from './patterns'

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
    expect(DROP_ACK.test('The thief dropped a jewel-encrusted egg.')).toBe(
      false,
    )
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
    expect(grab('There is no lamp here.')[0]).toMatch(/^lamp\b/)
    expect(grab("You can't see any troll here.")[0]).toMatch(/^troll\b/)
    // "X is empty" is NOT an absence of X (BUG I): X (a container) is present,
    // only its unnamed contents are absent — so it must capture nothing.
    expect(grab('The trophy case is empty.')).toEqual([])
  })

  describe('SOFT_NOOP_PAT (NL v2 §10, F-G)', () => {
    it('matches already-state no-ops', () => {
      expect(SOFT_NOOP_PAT.test('It is already open.')).toBe(true)
      expect(SOFT_NOOP_PAT.test('You already have that!')).toBe(true)
    })

    it('does not match hard refusals or absence', () => {
      expect(SOFT_NOOP_PAT.test('The door cannot be opened.')).toBe(false)
      expect(SOFT_NOOP_PAT.test("You can't see any mailbox here!")).toBe(false)
    })
  })

  it('ABSENCE_PAT captures span adjective-prefixed objects (review C6)', () => {
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
    // The capture must reach past the adjective to the noun, so consumers can
    // resolve "small mailbox" / "brass lantern" instead of the bare adjective.
    expect(grab('There is no small mailbox here.')[0]).toContain('mailbox')
    expect(grab("You can't see any brass lantern here.")[0]).toContain(
      'lantern',
    )
    // …but must not run across a line break into unrelated prose.
    expect(grab('There is no lamp\nThe troll snarls.')[0]).not.toContain(
      'troll',
    )
  })
})
