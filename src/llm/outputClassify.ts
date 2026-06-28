// src/llm/outputClassify.ts
//
// Shared classification of GAME OUTPUT — "did the thing the player acted on
// fail/refuse?" — independent of both the input parser and the scene tracker.
//
// `refusalApplies` is the predicate both layers agree on for "this clause
// failed": the input pipeline uses it (via `clauseFailed`) to stop a compound
// sequence after a no-op, and the scene tracker uses it as its antecedent gate
// (a refused turn must not promote its object to "it"). It used to live in
// `inputTranslate.ts`, which made `scene/tracker` import UP into the parsing
// module — a feature-envy back-edge (F-e). Its real home is here, a low-level
// module both layers depend DOWN onto, so neither domain owns the other's logic.
import type { Vocab } from './grammar/types'

/** Lowercased surface words (canonical tokens + synonyms) of every vocab noun the
 * command references — used to decide whether an absence phrase is ABOUT the thing
 * the clause acted on. */
export function commandObjectWords(command: string, vocab: Vocab): Set<string> {
  const tokens = new Set(command.toLowerCase().split(/\s+/).filter(Boolean))
  const out = new Set<string>(tokens)
  for (const n of vocab.nouns) {
    const words = [
      ...n.canonical.toLowerCase().split(/\s+/),
      ...(n.synonyms?.map(s => s.toLowerCase()) ?? []),
    ]
    if (words.some(w => tokens.has(w))) for (const w of words) out.add(w)
  }
  return out
}

/** Lowercased surface words of every vocab noun (canonical tokens + synonyms). */
function nounSurfaceWords(vocab: Vocab): Set<string> {
  const out = new Set<string>()
  for (const n of vocab.nouns) {
    for (const w of n.canonical.toLowerCase().split(/\s+/)) out.add(w)
    for (const s of n.synonyms ?? [])
      for (const w of s.toLowerCase().split(/\s+/)) out.add(w)
  }
  return out
}

/**
 * True when the output contains an in-game refusal (`failurePat`) ABOUT the
 * acted object. Without a command the check is blanket. With one, a refusal
 * counts only when its SENTENCE either names the acted object or names no vocab
 * noun at all — a pronoun refusal ("It is already open.") attributes to the
 * acted object, but a refusal about an unrelated object must not register
 * against a clause whose own action succeeded (review C8; the same asymmetry
 * the F2/R3 absence scoping fixed). Shared with the scene tracker's antecedent
 * gate so both sites agree on what "this clause failed" means.
 */
export function refusalApplies(
  recentOutput: string,
  vocab: Vocab,
  command?: string,
): boolean {
  const pat = vocab.failurePat
  if (!pat) return false
  if (!command) return pat.test(recentOutput)
  const relevant = commandObjectWords(command, vocab)
  const nouns = nounSurfaceWords(vocab)
  for (const sentence of recentOutput.split(/[.!?\n]+/)) {
    if (!pat.test(sentence)) continue
    const words = sentence
      .toLowerCase()
      .split(/[^a-z']+/)
      .filter(Boolean)
    const named = words.filter(w => nouns.has(w))
    if (named.length === 0) return true // pronoun refusal → about the acted object
    if (named.some(w => relevant.has(w))) return true
  }
  return false
}
