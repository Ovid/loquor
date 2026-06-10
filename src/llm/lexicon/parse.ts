// src/llm/lexicon/parse.ts
// The deterministic translation stage (spec §6). Pure. STRICT: every content
// token must be consumed by some mapping, or the clause MISSES and falls to
// the LLM — this layer never guesses.
import type { CoreLexicon, NounLexicon } from './types'
import type { Vocab, NounEntry } from '../grammar/types'
import type { Scene } from '../scene/types'
import { fold, tokenize } from './fold'

export type LexResult = { kind: 'command'; text: string } | { kind: 'miss' }
const MISS: LexResult = { kind: 'miss' }

interface NounHit {
  emit: string
  canonical: string
}

/** Resolve a token span to exactly one noun (whole-span match or miss). */
function resolveNoun(
  span: string[],
  core: CoreLexicon,
  nouns: NounLexicon,
  vocab: Vocab,
  scene: Scene,
): NounHit | null {
  const tryResolve = (s: string[]): NounHit | null => {
    if (s.length === 0) return null
    const phrase = s.join(' ')
    // 1. Foreign noun lexicon (ambiguity is first-class — spec §5.2 order).
    const candidates = Object.entries(nouns)
      .filter(([, words]) => words.includes(phrase))
      .map(([canonical]) => canonical)
    if (candidates.length === 1) {
      const e = byCanonical(vocab, candidates[0])
      return e ? { emit: e.emit, canonical: e.canonical } : null
    }
    if (candidates.length > 1) {
      // (1) scope preference: room + inventory (scene tracker, spec §8)
      const inScope = new Set(scene.inScope.map(o => o.canonical))
      const scoped = candidates.filter(c => inScope.has(c))
      if (scoped.length === 1) {
        const e = byCanonical(vocab, scoped[0])
        return e ? { emit: e.emit, canonical: e.canonical } : null
      }
      // (2) shared dictionary word across ALL candidates → Z-parser
      // disambiguates. Each entry's dictionary-word set is its synonyms PLUS
      // its folded canonical/emit when those are single tokens: extraction
      // omits the synonyms array entirely when the canonical IS the
      // dictionary word (zork1 'door' → {canonical:'door', emit:'front
      // door'}), so synonyms alone would leave this step dead for exactly
      // the entries it exists for. Determinism: synonyms keep their
      // extraction-sorted order and canonical/emit are appended after, so
      // the first word of entries[0] shared by ALL candidates always wins.
      const dictWords = (e: NounEntry): string[] => {
        const words = (e.synonyms ?? []).map(fold)
        for (const w of [fold(e.canonical), fold(e.emit)])
          if (tokenize(w).length === 1 && !words.includes(w)) words.push(w)
        return words
      }
      const entries = candidates
        .map(c => byCanonical(vocab, c))
        .filter((e): e is NounEntry => e !== undefined)
      if (entries.length > 0) {
        const rest = entries.slice(1).map(e => new Set(dictWords(e)))
        const shared = dictWords(entries[0]).filter(w =>
          rest.every(set => set.has(w)),
        )
        // The fabricated canonical here is a dictionary WORD, not a vocab
        // canonical — the F-E guard compares against vocab canonicals
        // (scene antecedents), so it can never trip on this value.
        if (shared.length > 0) return { emit: shared[0], canonical: shared[0] }
      }
      // (3) never guess → miss (pushback issue 1)
      return null
    }
    // 2. English vocab surface forms (synonym, adjective+synonym, canonical).
    // fold() both sides (not just lowercase): hyphenated dictionary words
    // ('trap-door') tokenize to two words, so the vocab side must normalize
    // identically (see the NOTE in fold.ts).
    for (const n of vocab.nouns) {
      const surfaces = new Set<string>([
        fold(n.canonical),
        fold(n.emit),
        ...(n.synonyms ?? []).map(fold),
      ])
      for (const adj of n.adjectives ?? [])
        for (const syn of n.synonyms ?? []) surfaces.add(fold(`${adj} ${syn}`))
      if (surfaces.has(phrase)) return { emit: n.emit, canonical: n.canonical }
    }
    return null
  }
  // Drop leading articles (le/la/der/el …) — but only at the edge, so phrases
  // with INTERNAL articles ('boite aux lettres') match first as a whole.
  const direct = tryResolve(span)
  if (direct) return direct
  let s = [...span]
  while (s.length > 1 && core.articles.includes(s[0])) {
    s = s.slice(1)
    const hit = tryResolve(s)
    if (hit) return hit
  }
  return null
}

function byCanonical(vocab: Vocab, canonical: string): NounEntry | undefined {
  return vocab.nouns.find(n => n.canonical === canonical)
}

/** Truncation-aware verb membership: v3 dictionary words store at most 6
 * characters ('inflate' → 'inflat'), while the lexicons map to the full
 * in-game spelling the Z-parser accepts (NOTE in fr/de/es.core.ts). The
 * roundtrip gate already widened for this; arity validation must match, or
 * every such verb silently misses to the LLM (UAT-3 N-3). Single words only:
 * multiword targets are phrasal, never dictionary entries. */
function hasVerbForm(list: readonly string[], verb: string): boolean {
  if (list.includes(verb)) return true
  return (
    !verb.includes(' ') && verb.length > 6 && list.includes(verb.slice(0, 6))
  )
}

function verbArityOk(verb: string, vocab: Vocab, objects: 0 | 1 | 2): boolean {
  // verbSynonyms members (gsyntax <SYNONYM …>: break, touch, taste, hide …)
  // are real parser verbs that extraction files OUTSIDE the arity lists; they
  // inherit their head verb's arity in ZIL, which extraction can't see, so
  // they validate at every arity ([D] — the roundtrip gate already counts
  // them; the runtime must agree or their lexicon entries are dead). A
  // wrong-arity emit earns the Z-parser's orphan prompt, never a guess.
  if (hasVerbForm(vocab.verbSynonyms, verb)) return true
  if (objects === 0)
    return (
      hasVerbForm(vocab.verbsOnly, verb) || hasVerbForm(vocab.movement, verb)
    )
  if (objects === 1) return hasVerbForm(vocab.verbs1, verb)
  return hasVerbForm(vocab.verbs2, verb)
}

/** One-object arity allowance shared by the pronoun, whole-remainder, and
 * personal-a paths ([H]): attack/kill/give/throw/tie … are verbs2-only (their
 * canonical syntax carries an instrument), but the Z-parser accepts the bare
 * one-object form by orphan-prompting for the missing object — still
 * deterministic, never a guess. */
function verbArity1or2(verb: string, vocab: Vocab): boolean {
  return verbArityOk(verb, vocab, 1) || verbArityOk(verb, vocab, 2)
}

export function parseLexicon(
  clause: string,
  core: CoreLexicon,
  nouns: NounLexicon,
  vocab: Vocab,
  scene: Scene,
): LexResult {
  let tokens = tokenize(clause)
  if (tokens.length === 0) return MISS

  // --- Verb (spec §6 step 3): particle pattern → idiom (longest first) → single
  // word → English vocab verb (longest first). ---
  let verb: string | null = null
  const particle = core.particleVerbs.find(
    p => tokens[0] === p.verb && tokens[tokens.length - 1] === p.particle,
  )
  if (particle && tokens.length >= 2) {
    verb = particle.to
    tokens = tokens.slice(1, -1)
  } else {
    const idioms = [...core.verbIdioms].sort(
      (a, b) => b.phrase.length - a.phrase.length,
    )
    for (const idiom of idioms) {
      const parts = idiom.phrase.split(' ')
      if (parts.every((p, i) => tokens[i] === p)) {
        verb = idiom.to
        tokens = tokens.slice(parts.length)
        break
      }
    }
    if (!verb && core.verbs[tokens[0]]) {
      verb = core.verbs[tokens[0]]
      tokens = tokens.slice(1)
    }
    if (!verb) {
      const english = [
        ...vocab.verbs2,
        ...vocab.verbs1,
        ...vocab.verbsOnly,
      ].sort((a, b) => b.length - a.length)
      for (const v of english) {
        const parts = v.split(' ')
        if (parts.every((p, i) => tokens[i] === p)) {
          verb = v
          tokens = tokens.slice(parts.length)
          break
        }
      }
    }
  }
  if (!verb) return MISS

  // --- No remainder: verb-only. ---
  if (tokens.length === 0)
    return verbArityOk(verb, vocab, 0) ? { kind: 'command', text: verb } : MISS

  // --- Pronoun-only remainder (clitics already split by fold: 'prends le').
  // Standalone le/la/les (no following noun) is a PRONOUN; in leading position
  // before a noun it is an article, stripped by resolveNoun (Task 12 note). ---
  if (tokens.length === 1 && core.pronounsDirect.includes(tokens[0])) {
    if (!scene.antecedent) return MISS
    const e = byCanonical(vocab, scene.antecedent)
    if (!e || !verbArity1or2(verb, vocab)) return MISS
    return { kind: 'command', text: `${verb} ${e.emit}` }
  }
  if (tokens.length === 1 && core.pronounsSelf.includes(tokens[0]))
    return verbArityOk(verb, vocab, 1)
      ? { kind: 'command', text: `${verb} me` }
      : MISS

  // --- Container anaphora: '<verb> <obj…> <containerPronoun>' (F-E guard). ---
  const last = tokens[tokens.length - 1]
  if (core.pronounsContainer.includes(last)) {
    const obj = resolveNoun(tokens.slice(0, -1), core, nouns, vocab, scene)
    if (!obj || !scene.antecedent) return MISS
    if (scene.antecedent === obj.canonical) return MISS // F-E: in itself
    const container = byCanonical(vocab, scene.antecedent)
    if (!container || !verbArityOk(verb, vocab, 2)) return MISS
    return { kind: 'command', text: `${verb} ${obj.emit} in ${container.emit}` }
  }

  // --- Whole remainder as ONE object (wins over prep-splitting so internal
  // prep-lookalikes — 'boite AUX lettres' — don't shear the phrase). ---
  const whole = resolveNoun(tokens, core, nouns, vocab, scene)
  if (whole) {
    return verbArity1or2(verb, vocab)
      ? { kind: 'command', text: `${verb} ${whole.emit}` }
      : MISS
  }

  // --- Personal-a / leading to-prep (the NOTE in es.core.ts preps):
  // `<verb> a/al <noun>` with NOTHING before the prep marks an animate
  // DIRECT object, not an indirect one — emit `<verb> <noun>`, never
  // `<verb> to <noun>`. Although motivated by Spanish, this fires on ANY
  // language's to-prep: FR `donne au troll` → `give troll`, where the
  // Z-parser orphan-prompts for the missing object ("What do you want to
  // give the troll?") — included behavior, not an accident. Fires only when
  // the leading remainder token maps to English 'to' and the rest resolves
  // as ONE noun; with ≥1 object token before the prep, the split loop below
  // handles the genuine indirect object instead. Arity allows
  // verbs1 OR verbs2: animate-object verbs (attack, give …) are often
  // verbs2-only because their canonical syntax carries an instrument
  // ('attack troll with sword'), and the Z-parser accepts the bare form by
  // asking for the missing object — still deterministic, never a guess. ---
  if (tokens.length > 1 && core.preps[tokens[0]] === 'to') {
    const obj = resolveNoun(tokens.slice(1), core, nouns, vocab, scene)
    if (obj && verbArity1or2(verb, vocab))
      return { kind: 'command', text: `${verb} ${obj.emit}` }
  }

  // --- Prep split: first token (after ≥1 object token) that maps to an
  // English prep. ---
  for (let i = 1; i < tokens.length - 1; i++) {
    const prep =
      core.preps[tokens[i]] ??
      (vocab.preps.includes(tokens[i]) ? tokens[i] : undefined)
    if (!prep || !vocab.preps.includes(prep)) continue
    const obj = resolveNoun(tokens.slice(0, i), core, nouns, vocab, scene)
    const ind = resolveNoun(tokens.slice(i + 1), core, nouns, vocab, scene)
    if (obj && ind && verbArityOk(verb, vocab, 2))
      return {
        kind: 'command',
        text: `${verb} ${obj.emit} ${prep} ${ind.emit}`,
      }
  }

  return MISS // strictness: something didn't consume
}
