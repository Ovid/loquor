import { describe, it, expect } from 'vitest'
import { loudEcho } from './loudEcho'

// The Loud Room (Zork I) echoes the LAST word of the player's command twice +
// " ..." (gverbs.zil V-ECHO). In Loquor the VM gets the English canonical
// command, so it echoes an English word ("look look ...") even when the player
// typed the target language. The word is dynamic, so it can't be corpus-pinned;
// loudEcho substitutes the player's OWN last typed word so the echo reads in
// their language. UAT finding F6.
describe('loudEcho — Loud Room input echo (UAT F6)', () => {
  it("substitutes the player's last word for a single-word command", () => {
    expect(loudEcho('look look ...', 'mira')).toBe('mira mira ...')
  })

  it('uses the LAST word of a multi-word command (the platinum-bar echo)', () => {
    // "coge la barra" → canonical "take bar" → the VM echoes "bar bar ...";
    // both languages end on the object, so the player's last word aligns.
    expect(loudEcho('bar bar ...', 'coge la barra')).toBe('barra barra ...')
  })

  it('lowercases to match the VM echo casing', () => {
    expect(loudEcho('look look ...', 'MIRA')).toBe('mira mira ...')
  })

  it('strips the quoted-English escape and trailing punctuation', () => {
    expect(loudEcho('bar bar ...', '"take bar"')).toBe('bar bar ...')
    expect(loudEcho('look look ...', 'mira.')).toBe('mira mira ...')
  })

  it('returns null when the line is not the doubled-word echo shape', () => {
    expect(loudEcho('You open the door.', 'mira')).toBeNull()
    expect(loudEcho('look look', 'mira')).toBeNull() // no " ..."
    expect(loudEcho('one two ...', 'mira')).toBeNull() // not a doubled word
  })

  it('returns null when there is no recorded input (backlog / fresh load)', () => {
    expect(loudEcho('look look ...', null)).toBeNull()
    expect(loudEcho('look look ...', undefined)).toBeNull()
    expect(loudEcho('look look ...', '')).toBeNull()
    expect(loudEcho('look look ...', '   ')).toBeNull()
  })
})
