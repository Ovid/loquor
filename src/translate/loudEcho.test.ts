import { describe, it, expect } from 'vitest'
import { isLoudEchoShape, loudEchoWord, LOUD_ROOM } from './loudEcho'

// The Loud Room (Zork I) echoes the LAST word of the player's command twice +
// " ..." (gverbs.zil V-ECHO). In Loquor the VM gets the English canonical
// command, so it echoes an English word ("look look ...") even when the player
// typed the target language. The word is dynamic, so it can't be corpus-pinned;
// the overlay substitutes the player's OWN last typed word (gated on the Loud
// Room location, frozen per line) so the echo reads in their language. UAT F6.
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

  describe('loudEchoWord', () => {
    it("returns the player's last word for a single-word command", () => {
      expect(loudEchoWord('mira')).toBe('mira')
    })

    it('returns the LAST word of a single-clause command (the platinum bar)', () => {
      // "coge la barra" → canonical "take bar" → the VM echoes "bar bar ...";
      // both languages end on the object, so the player's last word aligns.
      expect(loudEchoWord('coge la barra')).toBe('barra')
    })

    it('lowercases to match the VM echo casing', () => {
      expect(loudEchoWord('MIRA')).toBe('mira')
    })

    it('strips the quoted-English escape and trailing punctuation', () => {
      expect(loudEchoWord('"take bar"')).toBe('bar')
      expect(loudEchoWord('mira.')).toBe('mira')
    })

    it('strips leading inverted punctuation (¡/¿) — the target language (S1)', () => {
      expect(loudEchoWord('¡mira!')).toBe('mira')
      expect(loudEchoWord('¿mira?')).toBe('mira')
    })

    it('returns null for a COMPOUND command — the VM echoes one clause (I1)', () => {
      // The whole-line last word ("mira") is not what the VM echoes for the
      // first clause, so fall through to the English echo instead of mis-voicing.
      expect(loudEchoWord('coge la barra y mira')).toBeNull()
      expect(loudEchoWord('mira. coge la barra')).toBeNull()
      expect(loudEchoWord('take bar and look')).toBeNull()
    })

    it('returns null with no recorded input (backlog / fresh load)', () => {
      expect(loudEchoWord(null)).toBeNull()
      expect(loudEchoWord(undefined)).toBeNull()
      expect(loudEchoWord('')).toBeNull()
      expect(loudEchoWord('   ')).toBeNull()
    })
  })

  it('exports the Loud Room location string the caller gates on (I3)', () => {
    expect(LOUD_ROOM).toBe('Loud Room')
  })
})
