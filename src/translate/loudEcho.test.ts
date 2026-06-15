import { describe, it, expect } from 'vitest'
import {
  isLoudEchoShape,
  loudEchoToken,
  loudEchoWord,
  LOUD_ROOM,
} from './loudEcho'

// The Loud Room (Zork I) echoes the LAST word of the line it READ, twice + " ..."
// (gverbs.zil V-ECHO). In Loquor the VM gets the English canonical, so it echoes
// an English word ("look look ...") even in a target-language game. The word is
// dynamic (no corpus pin) — the overlay re-voices it by mapping the canonical
// word the VM echoes back to the player's own word for the clause that produced
// it (gated on the Loud Room location, frozen per line). UAT F6.
describe('loudEcho — Loud Room input echo (UAT F6)', () => {
  describe('isLoudEchoShape', () => {
    it('recognizes the doubled-word + ellipsis shape', () => {
      expect(isLoudEchoShape('look look ...')).toBe(true)
      expect(isLoudEchoShape('bar bar ...')).toBe(true)
    })

    it('rejects non-echo lines', () => {
      expect(isLoudEchoShape('You open the door.')).toBe(false)
      expect(isLoudEchoShape('look look')).toBe(false) // no " ..."
      expect(isLoudEchoShape('one two ...')).toBe(false) // not a doubled word
    })
  })

  describe('loudEchoToken', () => {
    it('returns the last word, lower-cased', () => {
      expect(loudEchoToken('take bar')).toBe('bar')
      expect(loudEchoToken('MIRA')).toBe('mira')
    })

    it('strips quotes, inverted (¡/¿) and trailing punctuation', () => {
      expect(loudEchoToken('"take bar"')).toBe('bar')
      expect(loudEchoToken('¡mira!')).toBe('mira')
      expect(loudEchoToken('¿mira?')).toBe('mira')
      expect(loudEchoToken('mira.')).toBe('mira')
    })

    it("strips a leading French elision (l'/d') from the last token (I1)", () => {
      // French elides the article/preposition onto the noun with no space, so the
      // last whitespace token is "l'or" / "d'or" — re-voice with the noun "or",
      // not "l'or l'or ...".
      expect(loudEchoToken("prends l'or")).toBe('or')
      expect(loudEchoToken("d'or")).toBe('or')
      expect(loudEchoToken("l'épée")).toBe('épée')
    })
  })

  describe('loudEchoWord', () => {
    const revoice = new Map([
      ['look', 'mira'], // canonical "look" ← player "mira"
      ['bar', 'barra'], // canonical "take bar" ← player "coge la barra"
    ])

    it('re-voices an echo line via the canonical→player map', () => {
      expect(loudEchoWord('look look ...', revoice)).toBe('mira')
      expect(loudEchoWord('bar bar ...', revoice)).toBe('barra')
    })

    it('re-voices EACH clause of a compound by its own word (I1)', () => {
      // The compound "coge la barra y mira" is sent as two canonical clauses;
      // each echo line maps to its own player word, not the whole-line last word.
      expect(loudEchoWord('bar bar ...', revoice)).toBe('barra')
      expect(loudEchoWord('look look ...', revoice)).toBe('mira')
    })

    it('falls through (null) when the echoed word is not in the map', () => {
      // e.g. the player escaped to English, or no command produced this word.
      expect(loudEchoWord('echo echo ...', revoice)).toBeNull()
    })

    it('falls through (null) for a non-echo line or an empty map', () => {
      expect(loudEchoWord('You open the door.', revoice)).toBeNull()
      expect(loudEchoWord('look look ...', new Map())).toBeNull()
      expect(loudEchoWord('look look ...', null)).toBeNull()
      expect(loudEchoWord('look look ...', undefined)).toBeNull()
    })
  })

  it('exports the Loud Room location string the caller gates on (I3)', () => {
    expect(LOUD_ROOM).toBe('Loud Room')
  })
})
