// src/llm/lexicon/parse.ts
// The deterministic translation stage (spec §6). Pure. STRICT: every content
// token must be consumed by some mapping, or the clause MISSES and falls to
// the LLM — this layer never guesses.
import type { CoreLexicon, NounLexicon } from './types'
import type { Vocab, NounEntry } from '../grammar/types'
import type { Scene } from '../scene/types'
import { fold, tokenize } from './fold'
import { vocabWordSet } from '../inputTranslate'

export type LexResult = { kind: 'command'; text: string } | { kind: 'miss' }
const MISS: LexResult = { kind: 'miss' }

// Verbs whose Zork syntax supplies the object via (FIND …), so the Z-parser
// accepts the BARE form: in the boat, ">launch" finds the vehicle. Arity
// extraction lists 'launch' as verbs1 (LAUNCH OBJECT (FIND VEHBIT)), so a
// whole-phrase launch idiom ('lance le bateau' → 'launch', empty remainder)
// would otherwise miss the verb-only arity gate. (UAT S3, Frigid River.)
const FIND_DEFAULT_VERBS = new Set(['launch'])

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
        // The fabricated canonical here is a dictionary WORD. Mostly that is
        // not a vocab canonical, so the F-E guard (which compares scene
        // antecedents — vocab canonicals) can't trip on it; when the word IS
        // also a canonical (zork1 'door'), the guard CAN fire and the clause
        // misses — a safe fall-through to the LLM, never a wrong emit ([Z]).
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

/** The parser-acceptable object word for a tracker antecedent, or null.
 * A canonical resolves to its emit form. An AMBIGUOUS synonym (one shared by 2+
 * objects, which the scene tracker stores as ITSELF — "window", owned by both
 * boarded- and kitchen-window — so it is NOT a vocab canonical) is already a
 * Z-parser dictionary word: emit it verbatim and let the parser disambiguate by
 * room (the tracker's documented contract). Without this an ambiguous-synonym
 * antecedent missed to the LLM, which hallucinated ("open it" → "open chests"). */
function antecedentObject(vocab: Vocab, antecedent: string): string | null {
  const e = byCanonical(vocab, antecedent)
  if (e) return e.emit
  const a = antecedent.toLowerCase()
  return vocab.nouns.some(n =>
    (n.synonyms ?? []).some(s => s.toLowerCase() === a),
  )
    ? antecedent
    : null
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

// English direct-object pronouns. English has NO input lexicon, so a bare
// pronoun reaches the LLM — where a static few-shot can only ever anchor it to a
// constant noun (the "open it" → "open advertisement" bug). fr/de/es resolve the
// same case deterministically in parseLexicon's pronounsDirect branch; this is
// the English-mode equivalent, substituting the already-tracked scene.antecedent
// with no model round-trip.
const EN_PRONOUNS = ['it', 'them']

// English bare quantifiers → the Z-parser's ALL object. English has NO input
// lexicon, so "take all"/"take everything" reaches the LLM, which binds the
// quantifier to the tracked antecedent or hallucinates (UAT Bug A: "take all" →
// "take large bag"). fr/de/es resolve this in parseLexicon's quantifiersAll
// branch; this is the English-mode equivalent. Note the irony: in grammar-only
// mode English raw-sends and "take all" reaches Zork verbatim and WORKS — it is
// the warm LLM that breaks it, exactly the gap a deterministic path closes.
const EN_QUANTIFIERS = ['all', 'everything']

/** If `clause` is a well-formed two-token "<verb> <tail>" English command whose
 * last token is in `tail`, return its verb (a known, arity-1-or-2 vocab verb);
 * else null. The verb tokens before the final word must be EXACTLY one known
 * verb phrase (longest first so a multiword verb wins; verbSynonyms included so
 * "get it" matches). ponytail: only the two-token form (the reported cases and
 * the overwhelming majority); particle/compound forms ("pick it up") fall
 * through. Shared by the pronoun and quantifier English paths. */
function englishVerbBeforeTail(
  clause: string,
  vocab: Vocab,
  tail: readonly string[],
): string | null {
  const tokens = tokenize(clause)
  if (tokens.length < 2) return null
  if (!tail.includes(tokens[tokens.length - 1])) return null
  const verbTokens = tokens.slice(0, -1)
  const verb = [
    ...vocab.verbs2,
    ...vocab.verbs1,
    ...vocab.verbsOnly,
    ...vocab.verbSynonyms,
  ]
    .sort((a, b) => b.length - a.length)
    .find(v => {
      const parts = v.split(' ')
      return (
        parts.length === verbTokens.length &&
        parts.every((p, i) => verbTokens[i] === p)
      )
    })
  return verb && verbArity1or2(verb, vocab) ? verb : null
}

function englishPronounVerb(clause: string, vocab: Vocab): string | null {
  return englishVerbBeforeTail(clause, vocab, EN_PRONOUNS)
}

/** Resolve a pronoun-only English command ("open it" → "open mailbox") from the
 * scene antecedent. English has NO input lexicon, so a bare pronoun would
 * otherwise reach the LLM — where a static few-shot anchors it to a constant
 * noun (the "open it" → "open advertisement" bug). A miss leaves the clause for
 * the caller (which raw-sends a real pronoun command, else the LLM). */
export function resolveEnglishPronoun(
  clause: string,
  vocab: Vocab,
  scene: Scene,
): LexResult {
  const verb = englishPronounVerb(clause, vocab)
  if (!verb || !scene.antecedent) return MISS
  const obj = antecedentObject(vocab, scene.antecedent)
  return obj ? { kind: 'command', text: `${verb} ${obj}` } : MISS
}

/** Resolve a bare-quantifier English command ("take all"/"take everything" →
 * "take all") to the Z-parser's ALL object. No scene needed — "all" names every
 * eligible object, not an antecedent. A miss leaves the clause for the LLM. The
 * fr/de/es equivalent is parseLexicon's quantifiersAll branch. */
export function resolveEnglishQuantifier(
  clause: string,
  vocab: Vocab,
): LexResult {
  const verb = englishVerbBeforeTail(clause, vocab, EN_QUANTIFIERS)
  return verb ? { kind: 'command', text: `${verb} all` } : MISS
}

/** Resolve a MODIFIED English quantifier command the bare path above doesn't catch:
 * "put all in case" (the natural endgame treasure-casing shortcut), "drop all but
 * the lamp", "take everything except the lamp". English has NO input lexicon, so
 * these reach the warm LLM, which mangles them exactly like bare "take all" did
 * pre-BUG-A ("put all in case" → "take large bag": verb flipped + object
 * hallucinated). The Z-parser handles its ALL object together with prepositions and
 * the BUT/EXCEPT exclusion natively, so the fix RAW-SENDS the player's words —
 * normalizing "everything" → "all" (the parser's quantifier is ALL/ONE/BOTH;
 * "everything" is not a Zork dictionary word). It fires ONLY when: the clause leads
 * with exactly one arity-1/2 vocab verb, the quantifier (all/everything) sits
 * immediately after it, there IS a remainder (the bare form is
 * resolveEnglishQuantifier's job), and every remainder token is a word the parser
 * knows (vocabWordSet, 6-char-truncation-aware) — so a fuzzy phrase still falls to
 * the LLM rather than raw-sending garbage. A miss leaves the clause for the caller. */
export function resolveEnglishQuantifierPhrase(
  clause: string,
  vocab: Vocab,
): LexResult {
  const tokens = tokenize(clause)
  if (tokens.length < 3) return MISS // need verb + quantifier + ≥1 remainder token
  const qIdx = tokens.findIndex(t => EN_QUANTIFIERS.includes(t))
  if (qIdx < 1 || qIdx === tokens.length - 1) return MISS
  const verbTokens = tokens.slice(0, qIdx)
  const verb = [
    ...vocab.verbs2,
    ...vocab.verbs1,
    ...vocab.verbsOnly,
    ...vocab.verbSynonyms,
  ]
    .sort((a, b) => b.length - a.length)
    .find(v => {
      const parts = v.split(' ')
      return (
        parts.length === verbTokens.length &&
        parts.every((p, i) => verbTokens[i] === p)
      )
    })
  if (!verb || !verbArity1or2(verb, vocab)) return MISS
  const words = vocabWordSet(vocab)
  const knows = (t: string) => words.has(t) || words.has(t.slice(0, 6))
  const rest = tokens.slice(qIdx + 1)
  if (!rest.every(knows)) return MISS
  return { kind: 'command', text: [verb, 'all', ...rest].join(' ') }
}

/** Is `clause` a well-formed "<verb> <pronoun>" command? When resolveEnglishPronoun
 * misses (no antecedent, or one not mappable to a vocab object), such a clause is
 * raw-sent to Zork — whose parser tracks "it" natively — instead of the LLM,
 * which hallucinates a noun ("open it" → "open chests"). */
export function isEnglishPronounClause(clause: string, vocab: Vocab): boolean {
  return englishPronounVerb(clause, vocab) !== null
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
    return verbArityOk(verb, vocab, 0) || FIND_DEFAULT_VERBS.has(verb)
      ? { kind: 'command', text: verb }
      : MISS

  // --- "All" quantifier: a bare-quantifier remainder (tout/tous/… or 'all')
  // maps to the Z-parser's ALL object — 'prends tout' → 'take all', 'pose
  // tout' → 'drop all'. Arity allows verbs1 OR verbs2 (the Z-parser
  // orphan-prompts for a missing instrument), matching the whole-remainder
  // path; a verb-only verb ('attends tout') misses rather than emit nonsense. ---
  if (tokens.length === 1 && (core.quantifiersAll ?? []).includes(tokens[0]))
    return verbArity1or2(verb, vocab)
      ? { kind: 'command', text: `${verb} all` }
      : MISS

  // --- Pronoun-only remainder (clitics already split by fold: 'prends le').
  // Standalone le/la/les (no following noun) is a PRONOUN; in leading position
  // before a noun it is an article, stripped by resolveNoun (Task 12 note). ---
  if (tokens.length === 1 && core.pronounsDirect.includes(tokens[0])) {
    if (!scene.antecedent || !verbArity1or2(verb, vocab)) return MISS
    const obj = antecedentObject(vocab, scene.antecedent)
    return obj ? { kind: 'command', text: `${verb} ${obj}` } : MISS
  }
  if (tokens.length === 1 && core.pronounsSelf.includes(tokens[0]))
    return verbArityOk(verb, vocab, 1)
      ? { kind: 'command', text: `${verb} me` }
      : MISS

  // --- Container anaphora: '<verb> <obj…> <containerPronoun>' (F-E guard).
  // The pronoun's own preposition is emitted ([E]): 'dessus'/'darauf' mean ON,
  // and a surface refuses `put … in`. ---
  const last = tokens[tokens.length - 1]
  const containerPronoun = core.pronounsContainer.find(p => p.word === last)
  if (containerPronoun) {
    const obj = resolveNoun(tokens.slice(0, -1), core, nouns, vocab, scene)
    if (!obj || !scene.antecedent) return MISS
    if (scene.antecedent === obj.canonical) return MISS // F-E: in itself
    const container = byCanonical(vocab, scene.antecedent)
    if (!container || !verbArityOk(verb, vocab, 2)) return MISS
    return {
      kind: 'command',
      text: `${verb} ${obj.emit} ${containerPronoun.prep} ${container.emit}`,
    }
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
    // Spanish personal-`a`: a leading `a`/`al` on the object span marks an
    // animate DIRECT object ('mata AL ladron con el cuchillo'), not a prep —
    // strip it so the object resolves. Same concept as the leading-to block
    // above, which only covers the no-instrument case (whole remainder as one
    // noun); here an instrument follows, so that block can't fire. Guarded to
    // `a`/`al` and to ≥1 token after stripping; FR `au`/`aux` and German never
    // lead the object span with `a`/`al`, so they're untouched.
    const objSpan = tokens.slice(0, i)
    const objTokens =
      objSpan.length > 1 && (objSpan[0] === 'a' || objSpan[0] === 'al')
        ? objSpan.slice(1)
        : objSpan
    const obj = resolveNoun(objTokens, core, nouns, vocab, scene)
    const ind = resolveNoun(tokens.slice(i + 1), core, nouns, vocab, scene)
    if (obj && ind && verbArityOk(verb, vocab, 2))
      return {
        kind: 'command',
        text: `${verb} ${obj.emit} ${prep} ${ind.emit}`,
      }
  }

  return MISS // strictness: something didn't consume
}
