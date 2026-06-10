// src/llm/grammar/patterns.ts
// Shared English acknowledgement / absence phrasing. Zork I–III all print
// "Taken." / "Dropped." and the same negation forms; per-game vocab references
// these (and may override). ABSENCE_PAT's first defined capture group is the
// absent noun word.
// The ack is a standalone LINE — "Taken." / "Dropped." — or the multi-object
// form "item: Taken.". A bare word-boundary match also hit narrative prose
// ("The thief has taken the egg from you.", "You have already taken
// everything."), falsely marking objects carried (review C7). recentOutput is
// newline-joined (viewToContext), so line anchors are reliable.
export const TAKE_ACK = /^\s*(?:[^:\n]*:\s*)?taken\.?\s*$/im
export const DROP_ACK = /^\s*(?:[^:\n]*:\s*)?dropped\.?\s*$/im
// A command that executed but had NO effect on its object (a no-op / refusal),
// e.g. "It is already open.", "It is already closed.", "The door cannot be
// opened." Such a turn must NOT promote its acted object to the antecedent —
// otherwise a mistranslated "close it" → "close door" → "already closed" keeps
// re-electing `door` as "it", a self-reinforcing loop (systematic-debugging).
export const FAILURE_PAT = /\bis already\b|\bcan(?:'t|not)\s+be\b/i
// A SOFT no-op: the action was already satisfied ("It is already open.",
// "You already have that!"). Distinct from FAILURE_PAT's hard refusals: a
// soft no-op must NOT abort a compound sequence (NL v2 §10, UAT F-G) — the
// player's plan is still on track — but it still gates the antecedent
// (the scene tracker uses FAILURE_PAT unfiltered via refusalApplies).
// Invariant: every already-state branch of FAILURE_PAT must have a covering
// branch here, or it regresses F-G.
export const SOFT_NOOP_PAT = /\bis already\b|\byou already have\b/i
// The "no X" / "can't see X" captures span up to THREE words (same line only):
// a single-word capture grabbed the ADJECTIVE of "no small mailbox" / "any
// brass lantern", which resolves to no canonical, so the explicitly-absent
// object leaked back into scope (review C6). Consumers resolve the captured
// phrase against the vocab's surface forms / the acted object's words.
export const ABSENCE_PAT =
  /\bno\s+([a-z]+(?:[^\S\n]+[a-z]+){0,2})\b|\b([a-z]+)\s+is\s+empty\b|can(?:'t|not)\s+see\s+(?:any\s+|a\s+)?([a-z]+(?:[^\S\n]+[a-z]+){0,2})\b/gi
