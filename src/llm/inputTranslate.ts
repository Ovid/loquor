// src/llm/translate.ts
import type { TranslateResult } from './types'
import type { Vocab } from './grammar/types'
import { META_COMMANDS } from './meta'
import type { CoreLexicon, NounLexicon } from './lexicon/types'
import { fold } from './lexicon/fold'
import { parseDirection } from './directions'
import { SOFT_NOOP_PAT } from './grammar/patterns'

/**
 * The abstain sentinel: the model emits `{"verb":"__UNKNOWN__"}` (and the grammar
 * allows it) when no canonical command expresses the player's English, or when a
 * pronoun's antecedent is ambiguous. Single source of truth shared by the engines,
 * buildGrammar, and parseCommand.
 */
export const ABSTAIN = '__UNKNOWN__'

/** Sequential conjunctions, one per supported language: `and`/`then` (en),
 * `et`/`puis`/`ensuite` (fr), `und` (de), `y` (es). Matched whitespace-wrapped
 * so substrings like "sand"/"under"/"xyzzy"/"strengthen" never trip them; the
 * de/es words match what directions.ts/meta.ts cover (review C3). */
const CLAUSE_CONJ = 'and|then|et|puis|ensuite|und|dann|danach|y'

/** Clause separators: a whitespace-wrapped conjunction, OR sentence punctuation
 * `.`/`;`/`,`. A comma now separates too (UAT: an object list "A, B et C" is the
 * natural way to act on several things, and the foreign-language path can't
 * leave it to the LLM — the single-command grammar can't express a multi-object
 * take). After any punctuation an immediately-following conjunction is absorbed,
 * so an Oxford comma ("A, B, et C") leaves no dangling "et …" clause. No
 * capturing groups, so String.split never injects the separators. */
// A RUN of conjunctions counts as one separator, so a doubled connector like
// "und dann" / "and then" / "et puis" leaves no dangling "dann …" clause that
// would miss the deterministic parse (UAT F4).
const CLAUSE_SEP = new RegExp(
  `\\s+(?:(?:${CLAUSE_CONJ})\\s+)+|\\s*[.;,]\\s*(?:(?:${CLAUSE_CONJ})\\s+)*`,
  'i',
)

/**
 * Split a compound instruction into ordered clauses (see CLAUSE_SEP). A single
 * clause (no separator) returns a length-1 array — the caller treats that as
 * "not compound" and uses the existing single-command path. Pure, total,
 * vocab-free.
 */
export function splitClauses(english: string): string[] {
  return english
    .split(CLAUSE_SEP)
    .map(clause => clause.trim())
    .filter(clause => clause.length > 0)
}

/** First word of every game verb (incl. the leading word of a multiword verb
 * like "turn on"), cached per Vocab — the English half of leading-verb
 * detection, so en-mode compounds gap too. */
const VOCAB_VERB_HEADS = new WeakMap<Vocab, Set<string>>()
function vocabVerbHeads(vocab: Vocab): Set<string> {
  const cached = VOCAB_VERB_HEADS.get(vocab)
  if (cached) return cached
  const out = new Set<string>()
  for (const v of [
    ...vocab.verbsOnly,
    ...vocab.verbs1,
    ...vocab.verbs2,
    ...vocab.verbSynonyms, // verbArityOk treats these as verbs (e.g. 'ulysses'), so the gap side must too — review I2
  ]) {
    const head = v.toLowerCase().split(/\s+/)[0]
    if (head) out.add(head)
  }
  VOCAB_VERB_HEADS.set(vocab, out)
  return out
}

/**
 * The verb phrase a clause OPENS with, in the player's own words, or null when
 * the clause begins with no recognizable verb (a bare object, a direction, …).
 * Recognizes foreign single verbs + idioms (the active core lexicon) and game
 * verbs (the vocab), so it works in every language and in English mode
 * (core===null). Returns the ORIGINAL-cased tokens so the phrase can be
 * re-prepended verbatim. Pure.
 */
export function leadingVerbPhrase(
  clause: string,
  core: CoreLexicon | null,
  vocab: Vocab,
): string | null {
  const stripped = clause.replace(/[!.?,;:]+$/, '').trim()
  if (!stripped) return null
  const tokens = stripped.split(/\s+/)
  if (core) {
    // Idioms first, longest-first, so 'laisse tomber' beats the bare 'laisse'.
    const folded = fold(stripped)
    const idioms = [...core.verbIdioms].sort(
      (a, b) => b.phrase.split(' ').length - a.phrase.split(' ').length,
    )
    for (const { phrase } of idioms) {
      if (folded === phrase || folded.startsWith(phrase + ' '))
        return tokens.slice(0, phrase.split(' ').length).join(' ')
    }
    const head = fold(tokens[0])
    if (core.verbs[head] || core.particleVerbs.some(pv => pv.verb === head))
      return tokens[0]
  }
  if (vocabVerbHeads(vocab).has(tokens[0].toLowerCase())) return tokens[0]
  return null
}

/** English determiners + (when foreign) the active core's, all folded. */
const EN_ARTICLES: readonly string[] = ['the', 'a', 'an']
function startsWithArticle(clause: string, core: CoreLexicon | null): boolean {
  const first = fold(clause).split(' ')[0]
  if (!first) return false
  return (
    EN_ARTICLES.includes(first) ||
    (core ? core.articles.includes(first) : false)
  )
}

/** Flattened set of every noun surface form in a NounLexicon, cached per lexicon
 * object — mirrors VOCAB_VERB_HEADS so the set is built once, not per input line. */
const NOUN_WORD_SETS = new WeakMap<NounLexicon, Set<string>>()
function nounWordSet(nouns: NounLexicon): Set<string> {
  const cached = NOUN_WORD_SETS.get(nouns)
  if (cached) return cached
  const out = new Set(Object.values(nouns).flat())
  NOUN_WORD_SETS.set(nouns, out)
  return out
}

/** True when a verbless conjunct names a known game object in the player's
 * own language (the per-game noun lexicon), e.g. Spanish "destornillador" or
 * "llave inglesa". This lets a bare object inherit the previous clause's verb
 * even WITHOUT a leading article — Spanish/German routinely drop it in object
 * lists ("coge el ajo y destornillador"), so the article alone misses them.
 * A leading article is tolerated and stripped. Pure + total; `null` lexicon
 * (English mode) yields false, leaving today's article-only behavior. */
function isForeignNoun(
  clause: string,
  core: CoreLexicon | null,
  nounSet: ReadonlySet<string> | null,
): boolean {
  if (!nounSet) return false
  const tokens = fold(clause.replace(/[!.?,;:]+$/, '').trim()).split(/\s+/)
  const articles = core?.articles ?? []
  const phrase =
    tokens.length > 1 && articles.includes(tokens[0])
      ? tokens.slice(1).join(' ')
      : tokens.join(' ')
  return phrase.length > 0 && nounSet.has(phrase)
}

/**
 * Verb-gapping for compound commands: a conjunct that drops its verb ("prends
 * le couteau ET la corde") inherits the previous clause's verb so it resolves
 * deterministically ("prends la corde") instead of being handed verbless to the
 * LLM, which would invent a wrong verb. A bare object gaps when it is either
 * article-led ("la corde", "the rope") OR a known game object in the player's
 * language (the per-game noun lexicon: Spanish "destornillador", which drops
 * the article in lists) — both are reliable signals of a verbless object. A
 * conjunct that carries its OWN verb (recognized or not, e.g. "check
 * inventory"), a direction ("au nord"), a localized meta word ("inventaire"),
 * or anything with no preceding verb to lend is left untouched. Pure + total;
 * preserves length, so the compound loop's clause count (and the single-command
 * degenerate case) is unchanged. */
export function fillElidedVerbs(
  clauses: readonly string[],
  core: CoreLexicon | null,
  vocab: Vocab,
  nouns: NounLexicon | null = null,
): string[] {
  const nounSet = nouns ? nounWordSet(nouns) : null
  let lastVerb: string | null = null
  return clauses.map((clause, i) => {
    const verb = leadingVerbPhrase(clause, core, vocab)
    if (verb !== null) {
      lastVerb = verb
      return clause
    }
    if (i === 0 || lastVerb === null) return clause
    const stripped = clause.replace(/[!.?,;:]+$/, '').trim()
    if (
      (!startsWithArticle(clause, core) &&
        !isForeignNoun(clause, core, nounSet)) ||
      parseDirection(clause, vocab.movement) !== null ||
      isMetaCommand(stripped) ||
      metaAlias(stripped, core) !== null
    )
      return clause
    return `${lastVerb} ${clause}`
  })
}

/** The trailing "<prep> <indirect>" phrase of a clause in the player's own
 * words (original casing), or null. A prep is one the active core knows or a
 * game prep; it must sit AFTER the leading verb plus ≥1 object token and be
 * followed by ≥1 token, so "lege den Kelch in die Vitrine" yields "in die
 * Vitrine" while "lege den Kelch" (and a verbless "geh nach norden") yield
 * null. Pure + total. */
function prepTail(
  clause: string,
  core: CoreLexicon,
  vocab: Vocab,
): string | null {
  const verb = leadingVerbPhrase(clause, core, vocab)
  const tokens = clause
    .replace(/[!.?,;:]+$/, '')
    .trim()
    .split(/\s+/)
  const start = verb ? verb.split(/\s+/).length : 0
  for (let i = start + 1; i < tokens.length - 1; i++) {
    const f = fold(tokens[i])
    if (core.preps[f] !== undefined || vocab.preps.includes(f))
      return tokens.slice(i).join(' ')
  }
  return null
}

/**
 * Distribute a shared trailing prep-phrase across same-verb conjuncts (UAT F16):
 * "lege A und B in die Vitrine" splits into ["lege A", "lege B in die Vitrine"],
 * leaving the first conjunct destination-less ("put A" → the parser orphans
 * "What do you want to put A in?" → "Ran 1 of 2 actions", and casing treasures
 * — the endgame loop — breaks on the natural phrasing). When the LAST clause
 * ends in "<obj> <prep> <indirect>", append that tail to the run of immediately
 * preceding clauses that share its leading verb and carry no prep of their own.
 *
 * The same-verb guard is what keeps a genuine two-command line intact: in "nimm
 * A und lege B in die Vitrine" the boundary verb differs (nimm ≠ lege), so the
 * walk stops there and "nimm A" never inherits the container. Runs AFTER
 * fillElidedVerbs so every conjunct already carries its (possibly inherited)
 * verb. Pure + total; preserves length (English mode / no core → unchanged).
 */
export function distributePrepTail(
  clauses: readonly string[],
  core: CoreLexicon | null,
  vocab: Vocab,
): string[] {
  if (!core || clauses.length < 2) return [...clauses]
  const last = clauses[clauses.length - 1]
  const tail = prepTail(last, core, vocab)
  const lastVerb = leadingVerbPhrase(last, core, vocab)
  if (tail === null || lastVerb === null) return [...clauses]
  // Only a DESTINATION tail is shared across conjuncts. A source prep
  // (aus/von → "from") belongs to its own clause: "nimm A und nimm B aus der
  // Vitrine" must NOT rewrite "nimm A" into "take A from case" (review I1).
  if (core.preps[fold(tail.split(/\s+/)[0])] === 'from') return [...clauses]
  const containerPronouns = new Set(core.pronounsContainer.map(p => p.word))
  const lastVerbFolded = fold(lastVerb)
  const out = [...clauses]
  for (let i = clauses.length - 2; i >= 0; i--) {
    const verb = leadingVerbPhrase(out[i], core, vocab)
    if (verb === null || fold(verb) !== lastVerbFolded) break
    if (prepTail(out[i], core, vocab) !== null) break // already has its own tail
    // A clause ending in a container anaphor ("lege es hinein") already names
    // its destination — don't append a second one (review S1).
    const toks = out[i].split(/\s+/)
    if (containerPronouns.has(fold(toks[toks.length - 1]))) break
    out[i] = `${out[i]} ${tail}`
  }
  return out
}

// Z-machine meta-verbs that are not in-world actions: they have no canonical
// game-command translation and must bypass the model entirely (sent raw to the
// interpreter). The list is the shared source in ./meta so the vocab generator
// subtracts exactly this set from verbsOnly. Match only the BARE verb so a real
// intent like "save the egg" still reaches the translator.
const META = new Set(META_COMMANDS)

/** Shared bare-command normalization: trim + lowercase + strip trailing `!.?`
 * so "SAVE." matches "save" (review S2 — was duplicated per matcher). */
function normalizeBareCommand(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[!.?]+$/, '')
}

/** True when the raw English is a bare Z-machine meta-command (restart, save…)
 * or a $-/#-prefixed debug command ($verify, #command). The latter are dropped
 * from the grammar by the vocab generator, so they have no emittable translation
 * and must be sent raw to the interpreter (UAT F6). */
export function isMetaCommand(english: string): boolean {
  const norm = normalizeBareCommand(english)
  if (/^[$#]/.test(norm)) return true
  return META.has(norm)
}

/**
 * Map a localized command word (e.g. French "inventaire") to the English the
 * interpreter understands, via the ACTIVE language's core lexicon (spec §5.1 —
 * supersedes the META_ALIASES seed, whose entries now live in each core's
 * metaAliases). Bare-word match only, diacritic-folded, so a real intent
 * ("inventaire de la maison") still reaches the translator. No core (language
 * en/off) → null.
 */
export function metaAlias(
  english: string,
  core: CoreLexicon | null,
): string | null {
  if (!core) return null
  const norm = fold(normalizeBareCommand(english))
  if (norm.includes(' ')) return null
  return core.metaAliases[norm] ?? null
}

/** Every word the game's parser knows (stage-4 passthrough set, spec §4):
 * verb words (incl. multiword parts), verb synonyms, preps, movement, noun
 * dictionary synonyms + adjectives, meta commands, and the English articles
 * the Z-parser accepts. Canonical DESC tokens are NOT included — they are not
 * parser dictionary words (F-Z). */
const VOCAB_WORD_SETS = new WeakMap<Vocab, Set<string>>()
export function vocabWordSet(vocab: Vocab): Set<string> {
  const cached = VOCAB_WORD_SETS.get(vocab)
  if (cached) return cached
  const out = new Set<string>(['the', 'a', 'an'])
  const addWords = (s: string) => {
    for (const w of s.toLowerCase().split(/\s+/)) if (w) out.add(w)
  }
  for (const v of [...vocab.verbsOnly, ...vocab.verbs1, ...vocab.verbs2])
    addWords(v)
  for (const w of [...vocab.movement, ...vocab.preps, ...vocab.verbSynonyms])
    addWords(w)
  for (const n of vocab.nouns) {
    for (const s of n.synonyms ?? []) addWords(s)
    for (const adj of n.adjectives ?? []) addWords(adj)
  }
  for (const m of META_COMMANDS) addWords(m)
  VOCAB_WORD_SETS.set(vocab, out)
  return out
}

/**
 * Stage 2 (locked decision 8): if the ENTIRE line is one quoted string —
 * "…", «…», „…“, or “…” — return the unquoted text to send verbatim. Quote
 * style varies by keyboard/autocorrect across FR/DE/ES (pushback minor note).
 */
export function unquote(line: string): string | null {
  const m = line
    .trim()
    .match(/^(?:"([^"]+)"|«([^»]+)»|„([^“”]+)[“”]|“([^”]+)”)$/)
  if (!m) return null
  const inner = (m[1] ?? m[2] ?? m[3] ?? m[4]).trim()
  return inner.length > 0 ? inner : null
}

/**
 * Stage 4 (spec §4): every token is a word the game's parser already knows
 * (vocabWordSet: verbs, synonyms, noun dictionary words, preps, movement,
 * meta, the/a/an) → send verbatim. COLLISION GUARD: when the picker is not
 * English, a token in the active language's lexicon does NOT count — the
 * line falls through to the lexicon parse instead (pushback issue 2).
 */
export function isVocabPassthrough(
  line: string,
  vocab: Vocab,
  activeLexiconWords: Set<string> | null,
): boolean {
  const words = vocabWordSet(vocab)
  const tokens = line
    .toLowerCase()
    .replace(/[!.?,;:]+$/, '')
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return false
  return tokens.every(
    t => words.has(t) && !(activeLexiconWords?.has(t) ?? false),
  )
}

// The interpreter's yes/no confirmation prompts (restart, quit, restore-overwrite)
// are read as ordinary LINE input — there is no engine-level flag distinguishing
// them from the main command prompt. When the recent output is such a prompt, the
// player's reply ("Y") is an answer to the game, NOT English to translate: the
// model would turn "Y" into a bogus command (observed: "Y" → "look"), so the
// restart could never confirm. Detect the prompt from its text and pass raw.
// The recent output is the LOCALIZED display text (the output-translation
// overlay has already run), so the detectors must match the player's language,
// not just English — else a German "(Y bedeutet ja)" prompt is missed and "y"
// is translated to "look", so restart/quit can never confirm (UAT F2). German:
// "(Y bedeutet ja)"/"(Y für ja)" and the endgame "(Tippe RESTART …)".
const CONFIRM_PROMPT =
  /\(Y is affirmative\)|\bare you sure\b|\bdo you (?:really )?wish to\b|\(Y [^)]*\bja\b[^)]*\)|\bTippe RESTART\b/i

/** True when the recent game output is an interpreter yes/no confirmation prompt. */
export function isConfirmationPrompt(recentOutput: string): boolean {
  return CONFIRM_PROMPT.test(recentOutput)
}

// The parser's disambiguation question ("Which door do you mean, the wooden door
// or the trap door?") is also a LINE read: the player's reply ("wooden door") is
// a noun-phrase the game pairs with the pending verb, NOT a fresh command. Sent
// through the model it would be mistranslated; pass it raw so Zork resolves it.
// Requires both "which" and "do you mean" so ordinary prose ("…which you read…")
// can't trip it.
// German: "Welches Buch meinst du, … oder …?" (UAT F2 cascade).
const DISAMBIGUATION_PROMPT =
  /\bwhich\b[\s\S]*\bdo you mean\b|\bwelche[mnrs]?\b[\s\S]*\bmeinst du\b/i

/** True when the recent game output is a parser disambiguation question. */
export function isDisambiguationPrompt(recentOutput: string): boolean {
  return DISAMBIGUATION_PROMPT.test(recentOutput)
}

// The parser's ORPHAN prompt: a partial command missing a noun — "What do you
// want to put the coffin in?" (typed "put coffin" with no container). Like a
// disambiguation question, the NEXT line answers the parser, not a fresh
// command — so a compound must STOP here rather than auto-feed its following
// clause into the orphan (which the player never saw when they typed ahead).
// German: "Was willst du mit dem Schädel tun?" (UAT F16/F19 — currently an LLM
// fallback until the put-orphan template lands in the corpus, but the wording
// is stable enough to pass the player's answer raw rather than mistranslate it).
const ORPHAN_PROMPT = /\bwhat do you want to\b|\bwas (?:willst|möchtest) du\b/i

/** True when the recent game output is a parser orphan prompt (partial command
 * awaiting its missing noun). */
export function isOrphanPrompt(recentOutput: string): boolean {
  return ORPHAN_PROMPT.test(recentOutput)
}

/** Lowercased surface words (canonical tokens + synonyms) of every vocab noun the
 * command references — used to decide whether an absence phrase is ABOUT the thing
 * the clause acted on. */
function commandObjectWords(command: string, vocab: Vocab): Set<string> {
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

/**
 * True when a clause's turn output signals an in-game no-op/refusal (`failurePat`,
 * e.g. "It is already open.") or an absence (`absencePat`, e.g. "You can't see any
 * grue here."). Used to STOP a compound sequence after a clause that didn't take
 * effect (locked decision 3). `absencePat` is a global regex, so a fresh instance
 * is built per call — `.test()` on the shared one is stateful (mirrors
 * tracker.ts's suppressed()).
 *
 * When `command` is given, an absence/refusal only counts if it is ABOUT the
 * object the clause acted on — otherwise narrative "No X" text (e.g. the leaflet
 * body's "No computer should be without one!") or a refusal aimed at another
 * object falsely truncates the sequence (UAT F2/R3; review C8).
 *
 * Soft no-ops ("It is already open.", "You already have that!") do NOT fail the
 * clause (NL v2 §10, UAT F-G): the action was already satisfied, so the plan is
 * still on track. The scene tracker keeps calling refusalApplies directly —
 * WITHOUT this filter — so a no-op turn still can't promote its object to "it".
 */
export function clauseFailed(
  recentOutput: string,
  vocab: Vocab,
  command?: string,
): boolean {
  // Hard refusals only: a sentence matching SOFT_NOOP_PAT is "already done",
  // which must not stop a compound run (§10/F-G). Filter per SENTENCE so a
  // real refusal elsewhere in the same output still registers.
  const hardOnly = recentOutput
    .split(/[.!?\n]+/)
    .filter(s => !SOFT_NOOP_PAT.test(s))
    .join('. ')
  if (refusalApplies(hardOnly, vocab, command)) return true
  const absence = new RegExp(vocab.absencePat.source, vocab.absencePat.flags)
  if (!command) return absence.test(recentOutput)
  const relevant = commandObjectWords(command, vocab)
  let m: RegExpExecArray | null
  while ((m = absence.exec(recentOutput)) !== null) {
    // The capture is a short phrase ("small mailbox here") so an adjective-
    // prefixed absence still reaches its noun (C6): the absence is about the
    // acted object iff ANY captured word names it.
    const phrase = (m.slice(1).find(g => g !== undefined) ?? '').toLowerCase()
    if (phrase.split(/\s+/).some(w => relevant.has(w))) return true
    if (m.index === absence.lastIndex) absence.lastIndex++ // zero-width guard
  }
  return false
}

interface RawCmd {
  verb?: unknown
  object?: unknown
  prep?: unknown
  indirect?: unknown
}

/**
 * Validate the GBNF-guaranteed JSON command against the VOCAB and serialize the
 * canonical command string. Pure + total. Scope-free (NL v2 §7): objects are
 * gated on the vocab's emit set only, so an in-vocab-but-out-of-scope object
 * passes through and earns the Z-machine's own honest "You can't see any X
 * here!" — scope is a prompt hint, never a validation constraint. No pronoun
 * resolution: under locked decision 6 the model has already mapped pronouns to
 * canonicals, so a pronoun can never appear here.
 */
export function parseCommand(rawJson: string, vocab: Vocab): TranslateResult {
  let cmd: RawCmd
  try {
    cmd = JSON.parse(rawJson.trim()) as RawCmd
  } catch {
    return { kind: 'abstain' }
  }
  if (!cmd || typeof cmd.verb !== 'string') return { kind: 'abstain' }
  const verb = cmd.verb
  if (verb === ABSTAIN) return { kind: 'abstain' }

  const object = typeof cmd.object === 'string' ? cmd.object : undefined
  const prep = typeof cmd.prep === 'string' ? cmd.prep : undefined
  const indirect = typeof cmd.indirect === 'string' ? cmd.indirect : undefined
  const emits = new Set(vocab.nouns.map(n => n.emit))

  const isOnly = vocab.verbsOnly.includes(verb) || vocab.movement.includes(verb)
  const is1 = vocab.verbs1.includes(verb)
  const is2 = vocab.verbs2.includes(verb)
  if (!isOnly && !is1 && !is2) return { kind: 'abstain' }

  // Classify by the SHAPE the model emitted, gated by list membership — NOT
  // first-list-wins. 25 real Zork I verbs (open, take, drop, read…) are in BOTH
  // verbs1 and verbs2; branching on membership order silently rejected every
  // valid two-object command for them ("open door with key") (review C1).
  if (prep !== undefined || indirect !== undefined) {
    if (!is2) return { kind: 'abstain' }
    if (object === undefined || prep === undefined || indirect === undefined)
      return { kind: 'abstain' }
    if (!emits.has(object) || !emits.has(indirect)) return { kind: 'abstain' }
    if (!vocab.preps.includes(prep)) return { kind: 'abstain' }
    return { kind: 'command', text: `${verb} ${object} ${prep} ${indirect}` }
  }
  if (object !== undefined) {
    if (!is1) return { kind: 'abstain' }
    if (!emits.has(object)) return { kind: 'abstain' }
    return { kind: 'command', text: `${verb} ${object}` }
  }
  if (!isOnly) return { kind: 'abstain' }
  return { kind: 'command', text: verb }
}
