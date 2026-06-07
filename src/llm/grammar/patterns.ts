// src/llm/grammar/patterns.ts
// Shared English acknowledgement / absence phrasing. Zork I–III all print
// "Taken." / "Dropped." and the same negation forms; per-game vocab references
// these (and may override). ABSENCE_PAT's first defined capture group is the
// absent noun word.
export const TAKE_ACK = /\btaken\b/i
export const DROP_ACK = /\bdropped\b/i
export const ABSENCE_PAT =
  /\bno\s+([a-z]+)\b|\b([a-z]+)\s+is\s+empty\b|can(?:'t|not)\s+see\s+(?:any\s+|a\s+)?([a-z]+)\b/gi
