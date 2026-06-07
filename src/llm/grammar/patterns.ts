// src/llm/grammar/patterns.ts
// Shared English acknowledgement / absence phrasing. Zork I–III all print
// "Taken." / "Dropped." and the same negation forms; per-game vocab references
// these (and may override). ABSENCE_PAT's first defined capture group is the
// absent noun word.
export const TAKE_ACK = /\btaken\b/i
export const DROP_ACK = /\bdropped\b/i
// A command that executed but had NO effect on its object (a no-op / refusal),
// e.g. "It is already open.", "It is already closed.", "The door cannot be
// opened." Such a turn must NOT promote its acted object to the antecedent —
// otherwise a mistranslated "close it" → "close door" → "already closed" keeps
// re-electing `door` as "it", a self-reinforcing loop (systematic-debugging).
export const FAILURE_PAT = /\bis already\b|\bcan(?:'t|not)\s+be\b/i
export const ABSENCE_PAT =
  /\bno\s+([a-z]+)\b|\b([a-z]+)\s+is\s+empty\b|can(?:'t|not)\s+see\s+(?:any\s+|a\s+)?([a-z]+)\b/gi
