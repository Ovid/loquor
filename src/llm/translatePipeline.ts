// The natural-language INPUT translation engine, extracted from
// useNaturalLanguage (F-1): the hook owns React state/refs, the scene tracker
// lifecycle, the derived memos (state/lex/grammar/liveRef) and the public
// `observe`/`isSequencing` seams; this module owns the dense translation
// machinery — the lazy-load + watchdog generate wrapper (createGenerateRaw),
// the per-clause deterministic-first pipeline (runClause, spec §4 stages 3–7),
// and the per-line + F-A drain orchestration (createTranslate). Pure logic — no
// hooks — so runClause is unit-testable in isolation and the hook reads as an
// orchestrator. Mirrors the createFallbackResolver idiom (F-3): the factories
// close over the SAME ref objects the hook holds, so they mutate live state.
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  ActiveLanguage,
  ChatMessages,
  LlmEngine,
  PromptContext,
  TranslateResult,
  ViewContext,
} from './types'
import { OUTPUT_ONLY_LANGS } from './types'
import { EngineGate } from '../shared/engineGate'
import type { TurnResult } from '../glkote-react/types'
import type { Vocab } from './grammar/types'
import type { Scene } from './scene/types'
import { TextSceneTracker } from './scene/tracker'
import { runGenerationGuarded } from '../shared/guardedGenerate'
import { buildPrompt, viewToContext } from './prompt'
import {
  parseCommand,
  isMetaCommand,
  metaAlias,
  isConfirmationPrompt,
  confirmationReply,
  isDisambiguationPrompt,
  isOrphanPrompt,
  splitClauses,
  fillElidedVerbs,
  distributePrepTail,
  clauseFailed,
  unquote,
  isVocabPassthrough,
} from './inputTranslate'
import { isHelpTrigger, helpResponse } from './help'
import {
  parseLexicon,
  resolveEnglishPronoun,
  isEnglishPronounClause,
  resolveEnglishQuantifier,
  resolveEnglishQuantifierPhrase,
  resolveNounReply,
} from './lexicon/parse'
import type { CoreLexicon, NounLexicon } from './lexicon/types'
import { parseDirection } from './directions'
import { MAX_CLAUSES, QUEUE_CAP, LOAD_WATCHDOG_MS } from './config'
import {
  queueFullDropped,
  nothingSent,
  couldntTranslate,
  ranOfActions,
  queueClearedNeedsAnswer,
  modelDownloadFailed,
  grammarOnlyFirstMiss,
  promptAnswerHint,
} from './notices'
import { createLogger } from '../logger'
import type { Internal } from './useModelDownload'

const log = createLogger('nl')

// §5.5: a line with NO Georgian codepoint is treated as English and raw-sends on
// a ka miss; only a line containing Georgian abstains (Georgian and English ASCII
// cannot collide). Range U+10A0–10FF covers Asomtavruli + Mkhedruli (the two
// mainstream blocks players actually type), matching the /[Ⴀ-ჿ]/ test used in the
// ka corpus tests (zork1.ka.uat.test.ts, ka-native-review-draft.test.ts). Georgian
// Extended (Mtavruli, U+1C90–1CBF) and Supplement (U+2D00–2D2F) are intentionally
// NOT covered — typing them raw-sends instead of abstaining (safe degradation),
// and the shared range stays consistent across the ka layers.
// Test the raw string AND its lowercased form (S1). Asomtavruli + Mkhedruli sit
// in U+10A0–10FF directly, but Mtavruli (U+1C90–1CBF, the all-caps styling form)
// does NOT — it lowercases INTO Mkhedruli, so the `.toLowerCase()` arm catches an
// all-Mtavruli line that would otherwise raw-send Georgian bytes to the Z-parser
// on a miss (English error + burned turn) instead of abstaining. Lowercasing
// ALONE is wrong: Asomtavruli lowercases to Nuskhuri (U+2D00, OUTSIDE the range),
// so the raw arm must stay to keep detecting it. exported for the unit test.
const GEORGIAN_RE = /[Ⴀ-ჿ]/
export const containsGeorgian = (s: string) =>
  GEORGIAN_RE.test(s) || GEORGIAN_RE.test(s.toLowerCase())

/** A line that goes VERBATIM to the Z-parser because the parser reads English:
 *  an EN player always, and a `ka` player's plain-ASCII line that missed the
 *  Georgian lexicon (§5.5 — degrade, never block). Centralizes the en/ka-ASCII
 *  raw-send decision the pipeline made inline at three sites (F-c). A `ka` line
 *  CONTAINING Georgian is NOT raw-sent (it would only earn a useless English
 *  error and burn the turn) — that case abstains with a localized hint instead. */
const rawSendsToParser = (lang: ActiveLanguage, line: string) =>
  lang === 'en' || (lang === 'ka' && !containsGeorgian(line))

/** EN-only "translator broke, so the raw line went to the Z-parser" notice.
 * Intentionally NOT in notices.ts (which is multilingual): it fires only in
 * English mode — a non-EN player abstains instead (`nothingSent`) — so there is
 * nothing to localize. Kept here so the two raw-send sites can't drift (S2). */
function sentAsTyped(timedOut: boolean): string {
  return timedOut
    ? 'Translation timed out — sent as typed.'
    : 'Translation failed — sent as typed.'
}

/** A line waiting in the F-A queue. `id` is monotonic and never reused — the
 * Terminal keys queued rows on it, and the queue drains from the FRONT
 * (shift), so an index key would re-point a DOM node at a different line. */
export interface QueuedLine {
  id: number
  text: string
}

/**
 * Watchdog-timeout sentinel — distinguishes a translation timeout from a genuine
 * generate error without sniffing `err.message` (review S5). Both still fall back
 * to raw pass-through; only the player-facing notice text differs.
 */
export class WatchdogTimeout extends Error {
  constructor() {
    super('watchdog')
    this.name = 'WatchdogTimeout'
  }
}

/**
 * Clause-time model **load** failure (lazy load into VRAM threw or its watchdog
 * fired) — distinct from a generate-time WatchdogTimeout. Only this demotes a
 * `full` language to grammar-only: a load failure means the model can't run at
 * all, whereas a generate stall is per-clause and keeps `full`. Carries the
 * underlying cause for the diagnostic log.
 */
export class ModelLoadError extends Error {
  // Plain field assignment (not a parameter property): `tsconfig`'s
  // `erasableSyntaxOnly` forbids constructor parameter-property shorthand.
  readonly reason?: unknown
  constructor(reason?: unknown) {
    super('model-load')
    this.name = 'ModelLoadError'
    this.reason = reason
  }
}

// MAX_CLAUSES / QUEUE_CAP / LOAD_WATCHDOG_MS now live in ./config (F-13).

/** Which pipeline stage produced a clause's command (spec §4 stages 3–7). */
export type Stage = 'meta' | 'alias' | 'vocab' | 'direction' | 'lexicon' | 'llm'

/** Stages whose echoed command may DIFFER from the player's typed words: these
 * echo the original input once as a UI-only nl-source line. 'direction',
 * 'lexicon' and 'llm' translate. 'alias' is the localized meta-command map
 * (es "inventario" → canonical "inventory"); it only ever fires in a non-English
 * picker (metaAlias returns null without a core lexicon), where the typed word
 * differs from the canonical the engine '>'-echoes, so its source must echo too
 * (UAT: meta commands were silently skipping the "you …" line). The remaining
 * passthrough stages ('meta', 'vocab') send the player's OWN words verbatim — the
 * typed token IS the canonical — so they need no echo. */
const TRANSLATED_STAGES: ReadonlySet<Stage> = new Set([
  'alias',
  'direction',
  'lexicon',
  'llm',
])

/** The per-(language, story) deterministic lexicons for the active non-English
 * language: `null` for en/off (stage 6 skipped, stage 4 needs no collision
 * guard). `nouns` may be null for an unknown signature. */
export interface Lex {
  core: CoreLexicon
  nouns: NounLexicon | null
  words: Set<string>
}

/** The freshest phase/language/lexicons the drain re-reads at every line
 * boundary ([N]) — a picker change mid-drain applies to lines after it. */
export interface LiveState {
  internal: Internal
  lex: Lex | null
  /** LLM-feature preference (carried from useNaturalLanguage's liveRef). When
   * false, stage 8 omits the upgrade-pitch first-miss notice — hiding the model
   * means hiding its sales pitch (the deterministic floor is the same). */
  llmEnabled: boolean
}

/** The bounded lazy-load + watchdog generation wrapper. NL always passes a real
 * grammar (the GBNF is the full vocab); `string | null` mirrors LlmEngine.generate. */
export type GenerateRaw = (
  messages: ChatMessages,
  grammar: string | null,
) => Promise<string>

/** In ENGLISH mode, a "translated" stage that hands back the player's OWN words
 * did not actually translate — the engine's own '>' echo already shows the
 * line, so the nl-source "(you) …" echo would just duplicate it (Zork III
 * review #1: the model "thinks" and produces the exact command typed). Compare
 * case-/whitespace-/trailing-punctuation-insensitively. A compound line never
 * equals a single clause's command, so its original line still echoes once.
 * Restricted to English: in a foreign-language picker the echo documents the
 * canonical English command the game received — useful even on a coincidental
 * match — so that contract (and its collision-guard test) is left untouched. */
function isIdentityEcho(line: string, command: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[!.?,;:]+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
  return norm(line) === norm(command)
}

/** TEMP [nl debug] diagnostics, dev browser only — release builds must not spam
 * the console or leak player input (review), and test runs stay quiet so real
 * problems stand out. Remove with the call sites once translation quality is
 * tuned. */
function nlDebug(...debugArgs: unknown[]): void {
  log.debug(...debugArgs) // dev-only gate now lives in the logger (F-14/F-16)
}

/** Everything createGenerateRaw needs: the engine, the per-generate watchdog,
 * and the shared input/output gate it runs under at 'input' priority. */
export interface GenerateRawDeps {
  engine: LlmEngine
  watchdogMs: number
  engineGate: EngineGate
}

/**
 * One bounded inference: load the model if it isn't resident yet, then race
 * generate() against a watchdog. Throws WatchdogTimeout on timeout (aborting the
 * orphaned generate) or the underlying error on failure. Shared by the single-
 * command path and the per-clause compound loop.
 */
export function createGenerateRaw(deps: GenerateRawDeps): GenerateRaw {
  const { engine, watchdogMs, engineGate } = deps
  // grammar is `string | null` for symmetry with LlmEngine.generate's widened
  // contract (review S8); generateRaw forwards it untouched. NL always passes
  // a real grammar (the GBNF is the full vocab) — null would mean grammar-free
  // generation, which the input pipeline never wants.
  return (messages: ChatMessages, grammar: string | null): Promise<string> =>
    // The watchdogs start INSIDE the gate: time spent queued behind an
    // output-translation generation must not burn the input watchdog.
    engineGate.run('input', async () => {
      // The lazy-load watchdog is NL-specific (the output hook pre-checks
      // isLoaded and degrades to English instead), so it stays here — outside
      // the shared generate core (review I2).
      if (!engine.isLoaded()) {
        // [M] Bound the lazy load (reload session, model cached on disk but
        // not in memory) with its own generous watchdog — see
        // LOAD_WATCHDOG_MS. Same reject-then-abort ordering as the generate
        // watchdog. Its own AbortController: the load's abort must not touch
        // the generate controller that runGenerationGuarded creates below.
        const loadAc = new AbortController()
        let loadId: ReturnType<typeof setTimeout>
        const loadWatchdog = new Promise<never>((_, rej) => {
          loadId = setTimeout(() => {
            rej(new WatchdogTimeout())
            loadAc.abort()
          }, LOAD_WATCHDOG_MS)
        })
        try {
          await Promise.race([
            engine.load(() => {}, loadAc.signal),
            loadWatchdog,
          ])
        } catch (err) {
          // A load failure (watchdog or engine.load reject) demotes full →
          // grammar (see createTranslate). Wrap so the caller can tell it apart
          // from a generate-time WatchdogTimeout, which does NOT demote.
          throw new ModelLoadError(err)
        } finally {
          clearTimeout(loadId!)
          // DELIBERATELY NOT awaiting the orphaned load (review I3): when the
          // LOAD watchdog fires the gate is released while engine.load() may
          // still be running. By design — the load can stall indefinitely
          // (WebGPU init, cache eviction → network), and holding the gate
          // until it settled would re-wedge ALL engine work (input AND output)
          // for the session, the exact unbounded wedge LOAD_WATCHDOG_MS exists
          // to break (anti-wedge invariant, the STALLED-load test). A waiter
          // that calls generate() against a still-loading engine hits
          // WebLlmEngine's `!this.engine` guard (engine is assigned only on
          // load()'s final line) and throws 'engine not loaded' cleanly — no
          // half-built engine is ever observed, so the release is safe.
        }
      }
      // Shared generate-under-watchdog core (review I2): holds the gate until
      // an aborted generation settles so the next waiter can't overlap two
      // generations on the non-reentrant engine. NL keeps its WatchdogTimeout
      // sentinel (the translate() catch classifies the timeout off it) and
      // surfaces a genuine post-timeout engine fault distinctly.
      return runGenerationGuarded({
        engine,
        messages,
        grammar,
        watchdogMs,
        timeoutError: () => new WatchdogTimeout(),
        onOrphanError: err =>
          log.error(
            'generation failed after the watchdog (engine fault, not a timeout):',
            err,
          ),
      })
    })
}

/** What runClause reads beyond its per-clause args: the game vocab + GBNF
 * grammar (both non-null — translate early-returns when vocab is null and the
 * grammar memo is built from that same vocab), the generate wrapper, and the
 * turn-context getter for the LLM prompt. */
export interface ClauseDeps {
  vocab: Vocab
  grammar: string
  generateRaw: GenerateRaw
  getContext: () => ViewContext
}

/**
 * Run ONE clause through the deterministic-first stages 3–7 (spec §4) against
 * the given live scene. `raw` is synthetic for the deterministic stages — only
 * the [nl debug] log consumes it. activeLang/lex come from the CALLER's per-line
 * read of liveRef ([N]), never from a render snapshot. Pure (its only effect is
 * the gated generate it delegates to), so it is unit-testable in isolation.
 */
export async function runClause(
  clause: string,
  scene: Scene,
  activeLang: ActiveLanguage,
  lex: Lex | null,
  grammarOnly: boolean,
  deps: ClauseDeps,
): Promise<{ result: TranslateResult; raw: string; stage: Stage }> {
  const { vocab, grammar, generateRaw, getContext } = deps
  // Stages 3–4 GATE on a trailing-punctuation-stripped form, so they
  // must SEND that same form ([C]): Zork's dictionary separators are
  // exactly `. , "`, so a surviving `!?:;` glues onto the last word —
  // "take lamp!" passed the all-parser-words gate verbatim and earned
  // "I don't know the word lamp!" from the very stage built to prevent
  // that. splitClauses already consumed `.`/`;`; this catches the rest.
  const stripped = clause.replace(/[!.?,;:]+$/, '').trim()
  // 3. Z-machine meta-verbs (restart, save, quit…) are not in-world
  // actions and have no canonical translation — route them raw so the
  // model can't invent a wrong command for them. A localized command
  // word (fr "inventaire") maps to its English canonical via the ACTIVE
  // core lexicon (UAT F5), again bypassing the model.
  if (isMetaCommand(stripped))
    return {
      result: { kind: 'command', text: stripped },
      raw: '(meta)',
      stage: 'meta',
    }
  const alias = metaAlias(stripped, lex?.core ?? null)
  if (alias)
    return {
      result: { kind: 'command', text: alias },
      raw: '(alias)',
      stage: 'alias',
    }
  // 4. Every token is already a word the game's parser knows → send the
  // clause verbatim, no inference (the F-H killer). COLLISION GUARD: a
  // token that is also an active-lexicon word disqualifies passthrough —
  // the clause must go through the lexicon parse instead (spec §4).
  if (isVocabPassthrough(stripped, vocab, lex?.words ?? null))
    return {
      result: { kind: 'command', text: stripped },
      raw: '(vocab)',
      stage: 'vocab',
    }
  // 5. Direction fast-path: movement is a closed, multilingual set
  // resolved deterministically in code — correct in every supported
  // language and with no model round-trip (UAT F8).
  const dir = parseDirection(clause, vocab.movement)
  if (dir)
    return {
      result: { kind: 'command', text: dir },
      raw: `{"verb":"${dir}"}`,
      stage: 'direction',
    }
  // 6. Deterministic lexicon parse (spec §6) — strict, never guesses; a
  // miss falls through to the model. Only runs when this game has a
  // noun lexicon for the active language.
  if (lex?.nouns) {
    const r = parseLexicon(clause, lex.core, lex.nouns, vocab, scene)
    if (r.kind === 'command')
      return { result: r, raw: '(lexicon)', stage: 'lexicon' }
  } else if (activeLang === 'en') {
    // Gated on the LANGUAGE, not "no noun lexicon" (I2): `lex` can be non-null
    // with `lex.nouns === null` (an unregistered signature for a non-English
    // picker), and the English resolvers below must never run on fr/de/es input
    // — those clauses fall through to the LLM. The matchers are English-only
    // (it/them/all/everything), so a misfire was unlikely even before, but the
    // contract now matches the gate instead of relying on the tokens.
    // English has no input lexicon, but a bare pronoun ("open it") is resolvable
    // from the tracked antecedent — the same deterministic substitution fr/de/es
    // get above. Without it the clause reaches the LLM and a static few-shot
    // anchors the pronoun to a constant noun ("open advertisement").
    const r = resolveEnglishPronoun(clause, vocab, scene)
    if (r.kind === 'command')
      return { result: r, raw: '(pronoun)', stage: 'lexicon' }
    // "take all"/"take everything": English has no lexicon, so the bare
    // quantifier reaches the LLM, which binds it to the antecedent or
    // hallucinates ("take all" → "take large bag"). Map it deterministically
    // to the Z-parser's ALL object — the fr/de/es quantifiersAll equivalent.
    const q = resolveEnglishQuantifier(clause, vocab)
    if (q.kind === 'command')
      return { result: q, raw: '(quantifier)', stage: 'lexicon' }
    // Modified quantifier ("put all in case", "drop all but the lamp", "take
    // everything except the lamp"): the bare path above only catches "<verb> all".
    // The Z-parser handles ALL with preps/EXCEPT natively, so raw-send the player's
    // words (everything→all normalized) instead of letting the LLM mangle it to the
    // same "take large bag" hallucination bare "take all" produced pre-BUG-A (BUG F).
    const qp = resolveEnglishQuantifierPhrase(clause, vocab)
    if (qp.kind === 'command')
      return { result: qp, raw: '(quantifier-raw)', stage: 'vocab' }
    // A well-formed "<verb> it/them" we couldn't pin to a specific object (no
    // antecedent, or one not in vocab): raw-send the player's words to Zork,
    // whose parser tracks "it" natively — far safer than the LLM, which
    // hallucinates ("open it" → "open chests"). Verbatim, like passthrough.
    if (isEnglishPronounClause(stripped, vocab))
      return {
        result: { kind: 'command', text: stripped },
        raw: '(pronoun-raw)',
        stage: 'vocab',
      }
  }
  // 7. LLM fallback — skipped in grammar-only: abstain so stage 8 applies the
  //    existing policy (EN raw-send / non-EN notice). The engine is never touched.
  if (grammarOnly)
    return { result: { kind: 'abstain' }, raw: '(grammar-only)', stage: 'llm' }
  // NL v2 §7: the grammar is the FULL vocab — scope
  // feeds the prompt hint below, never the grammar or the validator.
  const base = getContext()
  const ctx: PromptContext = {
    ...base,
    inScope: scene.inScope.map(o => o.canonical),
    antecedent: scene.antecedent,
  }
  const raw = await generateRaw(
    buildPrompt(clause, ctx, vocab, activeLang),
    grammar,
  )
  return { result: parseCommand(raw, vocab), raw, stage: 'llm' }
}

/** The co-owned live pipeline state: the SAME refs the hook allocates, mutated
 * IN PLACE by the clause loop / F-A drain so a translate call sees (and advances)
 * live state across its await points. Grouped (F-3) so TranslateDeps carries one
 * clearly-owned bag of mutable state instead of nine loose refs — the hook is the
 * allocating owner, createTranslate the in-place mutator. */
export interface PipelineRefs {
  trackerRef: MutableRefObject<TextSceneTracker | null>
  translatingRef: MutableRefObject<boolean>
  queueRef: MutableRefObject<QueuedLine[]>
  queueIdRef: MutableRefObject<number>
  lastCommandRef: MutableRefObject<string | null>
  inSequenceRef: MutableRefObject<boolean>
  epochRef: MutableRefObject<number>
  liveRef: MutableRefObject<LiveState>
  /** First-abstain education latch (once per grammar-only stint). */
  educatedRef: MutableRefObject<boolean>
}

/** Everything the per-line + drain orchestration reads for one translate call:
 * the per-run values (off-check phase, vocab/grammar, the generate wrapper, the
 * watchdog), the injected game callbacks, the co-owned live `refs` the hook holds
 * (so the drain mutates live state), and the React state setters. */
export interface TranslateDeps {
  internal: Internal
  vocab: Vocab | null
  grammar: string | null
  generateRaw: GenerateRaw
  watchdogMs: number
  getContext: () => ViewContext
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
  /** Like sendLine, but marks the send NL-canonical (its echo renders as
   * nl-canonical, hidden in debug-off). Used for every translated-clause send. */
  sendCanonical: (text: string) => void
  /** Record a (canonical command sent → player's own source words) pair so the
   * output overlay can re-voice the Loud Room input-echo in the player's language
   * (loudEcho / UAT F6). Optional — omitted by tests/contexts with no overlay. */
  recordEcho?: (canonical: string, source: string) => void
  awaitTurn: () => Promise<TurnResult>
  /** The co-owned live pipeline state (grouped, F-3): the hook allocates these
   * refs and createTranslate mutates them in place across its await points. */
  refs: PipelineRefs
  /** Flip the active language full → grammar after a clause-time load failure. */
  demote: () => void
  setPending: Dispatch<SetStateAction<boolean>>
  setNotice: Dispatch<SetStateAction<string | null>>
  syncQueue: () => void
}

/**
 * Build the `translate(english)` entry point. The returned function drives the
 * whole NL input pipeline: stage-1/2 escapes, the unified clause loop (a single
 * command is the degenerate total===1 compound), and the F-A drain of lines
 * typed while a translation was in flight.
 */
export function createTranslate(
  deps: TranslateDeps,
): (english: string) => Promise<string | null> {
  const {
    internal,
    vocab,
    grammar,
    generateRaw,
    watchdogMs,
    getContext,
    echoLocal,
    sendLine,
    sendCanonical,
    recordEcho,
    awaitTurn,
    demote,
    setPending,
    setNotice,
    syncQueue,
  } = deps
  // The co-owned live refs (F-3) — destructured to the same local names the
  // clause loop / drain already use, so grouping them changed only the seam.
  const {
    trackerRef,
    translatingRef,
    queueRef,
    queueIdRef,
    lastCommandRef,
    inSequenceRef,
    epochRef,
    liveRef,
    educatedRef,
  } = deps.refs

  return async (english: string) => {
    const tracker = trackerRef.current
    // Set to the typed line when it sends nothing and should be restored to the
    // field (M8) — a non-English abstain/timeout/failure. Stays null when the
    // line is consumed (sent, queued, raw, or English raw-send).
    let retainTyped: string | null = null
    // The live picker language for notices set OUTSIDE runLine (queue guard /
    // drain), where runLine's per-line `activeLang` isn't in scope (F1). Falls
    // back to 'en' when the layer isn't 'on' — defensive; the call sites below
    // only fire while it is.
    const liveLang = (): ActiveLanguage =>
      liveRef.current.internal.phase === 'on'
        ? liveRef.current.internal.language
        : 'en'
    // NL off / disabled / unavailable → behave exactly like the first pass.
    // Checked BEFORE the queue guard ([M]): 'off' must restore raw play
    // instantly even while a previous drain is still in flight — queueing
    // here would translate the line under a layer the player just turned
    // off (or wedge it behind a stalled one).
    if (internal.phase !== 'on' || vocab === null || tracker === null) {
      lastCommandRef.current = null
      sendLine(english)
      return null
    }
    // A translation is already in flight — QUEUE this line instead of dropping
    // it (F-A, NL v2 §11): the input stays enabled while NL is on, so typing
    // ahead is normal play, not an anomaly. FIFO, cap 4; overflow drops the
    // NEWEST line with a visible notice so input is never silently lost.
    // Above every translation stage so a mid-flight submit can't slip
    // through them either (review S4).
    if (translatingRef.current) {
      if (queueRef.current.length >= QUEUE_CAP) {
        setNotice(queueFullDropped(liveLang(), english))
        return null
      }
      queueRef.current.push({ id: queueIdRef.current++, text: english })
      syncQueue()
      return null
    }
    // [O] Snapshot the story epoch: the drain abandons everything (in-flight
    // results included) once the game underneath it changes.
    const epoch = epochRef.current
    // Non-null beyond the off-check above: vocab/grammar are the same game's,
    // and the grammar memo is built from this vocab.
    const clauseDeps: ClauseDeps = {
      vocab,
      grammar: grammar!,
      generateRaw,
      getContext,
    }

    // Bounded wait for the clause's turn boundary: race awaitTurn() against a
    // timer so a clause can never wedge the sequence (locked decision 8). Turns
    // run synchronously in the VM, so the timer is a defensive backstop; reusing
    // watchdogMs keeps a single tunable knob.
    const raceTurn = async (): Promise<TurnResult | 'timeout'> => {
      let timer: ReturnType<typeof setTimeout>
      const timeout = new Promise<'timeout'>(res => {
        timer = setTimeout(() => res('timeout'), watchdogMs)
      })
      try {
        return await Promise.race([awaitTurn(), timeout])
      } finally {
        clearTimeout(timer!)
      }
    }

    // Every VM send goes through here: register the turn listener IMMEDIATELY
    // BEFORE sendLine (the VM runs the turn SYNCHRONOUSLY inside it — accept →
    // VM → bridge.update → resolveTurn — so a listener registered after would
    // fire into an empty resolver list and time out). `pending` is the
    // boundary of the most recent send; the compound loop awaits it per clause,
    // and the queue drain awaits it between lines so a queued line's stage-1
    // check and the scene tracker see the SETTLED output, not the stale view
    // ref (which only updates after a React re-render). An unawaited boundary
    // settles harmlessly: the bridge resolves every registered listener at
    // the turn and raceTurn clears its own timer on settle. (Boxed rather
    // than a bare `let` to make the shared mutable turn-boundary state —
    // written by `sendTracked`, awaited by the loops below — explicit.)
    const turnBox: { pending: Promise<TurnResult | 'timeout'> | null } = {
      pending: null,
    }
    // `source` is the player's OWN words behind `text` (the canonical command):
    // a translated clause passes its target-language clause; a verbatim send
    // (raw/quoted/prompt reply) lets it default to `text`. Recorded BEFORE
    // sendLine so the canonical→player echo map is current when the VM's
    // synchronous turn produces the Loud Room echo line (loudEcho / F6).
    const sendTracked = (
      text: string,
      source: string = text,
      canonical = false,
    ) => {
      recordEcho?.(text, source)
      turnBox.pending = raceTurn()
      ;(canonical ? sendCanonical : sendLine)(text)
    }

    // Shared abstain-on-error action (review S6): a translator failure (timeout
    // or engine fault) on a line. EN raw-sends the typed line (the Z-parser's
    // own error is useful) with a "sent as typed" notice; a non-EN line sends
    // NOTHING — raw FR/DE/ES earns only a useless "I don't know the word…" and
    // burns a game turn — and shows a notice instead. Used by both the in-runLine
    // stage-8 path and the drain's per-line catch.
    const abstainOnError = (
      lang: ActiveLanguage,
      line: string,
      timedOut: boolean,
    ) => {
      if (lang === 'en') {
        sendTracked(line)
        setNotice(sentAsTyped(timedOut))
      } else {
        setNotice(nothingSent(lang, timedOut))
      }
    }

    // Run ONE LINE through the full pipeline (stages 1–8). Returns 'flush'
    // when the game raised an interactive prompt: queued lines were typed
    // BEFORE the player saw that question, so the drain must discard them
    // rather than feed them to it (F-A). Returns 'stale' when the story
    // epoch changed while a clause was translating ([O]) — the caller
    // abandons the drain without sending. Errors propagate to the per-line
    // catch in the drain below. `settled` is the previous drained line's
    // turn-boundary view context (non-null only when the drain awaited that
    // boundary): it is FRESHER than getContext(), whose backing view ref
    // only updates after a React re-render the synchronous drain never
    // yields for.
    const runLine = async (
      line: string,
      fromQueue: boolean,
      settled: ViewContext | null,
    ): Promise<'ok' | 'flush' | 'stale'> => {
      // [N] Resolve the ACTIVE language and lexicons per LINE, not per
      // drain: a picker change mid-drain applies to every line that runs
      // after it. The drain's phase gate guarantees 'on' here; the 'en'
      // arm only keeps the narrowing total for TS.
      const live = liveRef.current
      const activeLang: ActiveLanguage =
        live.internal.phase === 'on' ? live.internal.language : 'en'
      const lex = live.lex
      // Grammar-only: the model isn't loaded for this stint, so stage 7 abstains
      // (runClause skips the engine) and stage 8 educates / EN raw-sends.
      const grammarOnly =
        live.internal.phase === 'on' && live.internal.model === 'grammar'
      // STAGE 1 (spec §4): the game is asking. The interpreter's yes/no
      // confirmations (restart/quit/restore), the parser's disambiguation
      // questions ("Which door…?"), and the parser's orphan prompts ("What do
      // you want to put the coffin in?") are read as ordinary LINE input, so the
      // player's reply answers the INTERPRETER/PARSER and must not be translated —
      // else "Y" → "look" (restart never confirms) or "wooden door" gets
      // mangled. Checked before the clause split so a reply containing "and"
      // is never split either. A QUEUED line cannot be such a reply — the
      // player hadn't seen the question when they typed it — so it signals a
      // flush instead of answering.
      const recentOutput = (settled ?? getContext()).recentOutput
      if (
        isConfirmationPrompt(recentOutput) ||
        isDisambiguationPrompt(recentOutput) ||
        isOrphanPrompt(recentOutput) // parser orphan ("What do you want to …?") — the reply answers the parser (review I1)
      ) {
        lastCommandRef.current = null
        if (fromQueue) return 'flush'
        // On a yes/no confirmation, map the player's localized reflex reply
        // ("j"/"ja"/"oui"/"sí") to the interpreter's literal "y"/"n" key — the
        // localized prompt invited it but the interpreter only accepts Y (review I3).
        if (isConfirmationPrompt(recentOutput)) {
          sendTracked(confirmationReply(line, activeLang))
          return 'ok'
        }
        // Disambiguation / orphan: the reply answers the PARSER with a NOUN
        // ("yellow button" → "Which button?"). The output corpus renders the
        // prompt in the player's language, so a non-English player answers in
        // their language — which the English Z-parser can't read (I3). Resolve the
        // reply through the noun lexicon (verbless path) and send the English noun.
        // A QUOTED reply is the literal escape and skips resolution (decision 8);
        // it raw-sends below (the decision-8 contract keeps the quotes).
        const resolved =
          !unquote(line) && lex?.nouns
            ? resolveNounReply(
                line,
                lex.core,
                lex.nouns,
                vocab,
                tracker.scene(),
              )
            : null
        if (resolved) {
          echoLocal(line) // a translated reply — echo the player's own words once
          sendTracked(resolved, line, true)
          return 'ok'
        }
        // Unresolved → mirror the stage-8 abstain policy: en (and ka's
        // English-ASCII reply, §5.5) raw-send (Zork's parser reads English); a
        // non-English reply with no resolution would only earn a useless English
        // error and burn the turn, so abstain (leave the prompt open) and show a
        // localized hint to answer with the full noun (I3, the "resolve + hint" call).
        if (rawSendsToParser(activeLang, line)) {
          sendTracked(line)
          return 'ok'
        }
        setNotice(promptAnswerHint(activeLang))
        retainTyped = line
        return 'ok'
      }
      // STAGE 2 (locked decision 8): a fully-quoted line ("…", «…», „…“, “…”)
      // is the escape hatch — send the unquoted text verbatim, bypassing every
      // translation stage. No echo, no latch: the player typed the command.
      const quoted = unquote(line)
      if (quoted) {
        lastCommandRef.current = null
        sendTracked(quoted)
        return 'ok'
      }

      // LOCALIZED HELP (Task 11): Zork I has no native help verb, so a bare help
      // word ("ayuda"/"aide"/"hilfe"/"help", incl. English) is intercepted and
      // answered with a localized cheat-sheet via the SAME aria-live notice seam
      // the other NL notices use — it reaches the game NOT at all (no sendTracked,
      // no turn burned). English "help" is intercepted too: there is no native help
      // to fall through to, and with a model on the LLM would otherwise mistranslate
      // it (observed: help → look). Placed beside the quoted-escape (both are
      // pre-clause line escapes that bypass translation) so it sits with the
      // existing meta-routing.
      if (isHelpTrigger(line, activeLang)) {
        lastCommandRef.current = null
        setNotice(helpResponse(activeLang))
        return 'ok'
      }

      // UNIFIED CLAUSE LOOP: a single command is the degenerate total===1
      // case of the compound machinery (locked decisions 1–9). Only when
      // total>1 does the hook own the turn boundary (awaitTurn + observe);
      // a single command leaves the turn to Terminal's observe effect.
      // fillElidedVerbs lets a verbless conjunct inherit the previous clause's
      // verb ("prends le couteau et la corde" → "…et prends la corde") so it
      // resolves deterministically instead of an LLM-invented verb; length is
      // preserved, so the single-command degenerate case is untouched.
      const clauses = distributePrepTail(
        fillElidedVerbs(
          splitClauses(line),
          lex?.core ?? null,
          vocab,
          lex?.nouns ?? null,
        ),
        lex?.core ?? null,
        vocab,
      )
      const total = clauses.length
      if (total > 1) inSequenceRef.current = true
      const limit = Math.min(total, MAX_CLAUSES)
      let done = 0
      // Echo the player's input ONCE, before the first clause an actual
      // TRANSLATION produced (decision 5). Passthrough stages keep today's
      // no-echo contract — the transcript already shows the typed words.
      let echoed = false
      // Track the room across clauses: a turn that CHANGES ROOMS is a successful
      // move, not a no-op, so the absence/failure detector must be suppressed for
      // it. Otherwise ordinary room flavor text ("There is no door here.") trips
      // ABSENCE_PAT (\bno\s+\w+\b) and truncates the sequence right after a move
      // succeeds (systematic-debugging; exposed once movement started working).
      let prevLocation = (settled ?? getContext()).location
      // TEMP compound diagnostics — why a sequence stopped (set at each break,
      // logged once below). Remove together with the per-clause [nl debug]
      // once translation quality is tuned.
      let stopReason: string | null = null
      // The engine error (or watchdog timeout) that stopped a compound mid-
      // flight, kept as the ERROR OBJECT so stage 8 can label the notice
      // without sniffing message strings (review S5 / Task 21 review).
      let stopError: unknown = null
      for (let i = 0; i < limit; i++) {
        const clause = clauses[i]
        const scene = tracker.scene()
        let result: TranslateResult
        let raw: string
        let stage: Stage
        try {
          ;({ result, raw, stage } = await runClause(
            clause,
            scene,
            activeLang,
            lex,
            grammarOnly,
            clauseDeps,
          ))
        } catch (err) {
          // A clause-time model LOAD failure demotes full → grammar for the rest
          // of the session and stops; stage 8 surfaces the shared basic-mode
          // notice (EN raw-send / non-EN nothing-sent). Handled FIRST so it can't
          // be mistaken for a generate-time error or rethrown as a bare timeout.
          if (err instanceof ModelLoadError) {
            demote()
            stopReason = 'load-failed'
            stopError = err
            break
          }
          // Single command: surface through the outer catch (timeout/failure
          // notice + raw send — unchanged contract). Mid-compound: stop the
          // sequence (locked decision 4).
          if (total === 1) throw err
          stopReason = `generate-error: ${String(err)}`
          stopError = err
          break
        }
        // [O] An await elapsed: if the story changed underneath this drain,
        // the translated result belongs to the OLD game — drop it unsent
        // and abandon everything ('stale' bypasses stage 8 entirely).
        if (epochRef.current !== epoch) return 'stale'
        // TEMP per-clause diagnostics — what the live scene fed the stage vs.
        // what it emitted, and WHICH stage produced it. Remove once quality
        // is tuned.
        nlDebug(
          'clause',
          JSON.stringify({
            i,
            clause,
            stage,
            antecedent: scene.antecedent,
            inScope: scene.inScope.map(o => o.canonical),
            raw,
            result,
          }),
        )
        if (result.kind !== 'command') {
          stopReason = 'abstain'
          break // abstain → stop; stage 8 below decides what the player sees
        }

        // Per-clause: did THIS clause translate (canonical differs from the
        // player's typed words)? Drives both the once-per-turn nl-source echo
        // and the per-clause `canonical` send-flag. A passthrough clause
        // (vocab/meta) after a translated one must NOT inherit the turn-level
        // `echoed` latch as its canonical flag, or its own verbatim words get
        // hidden in debug-off (review I1).
        const translated =
          TRANSLATED_STAGES.has(stage) &&
          !(activeLang === 'en' && isIdentityEcho(line, result.text))
        if (!echoed && translated) {
          echoLocal(line)
          echoed = true
        }
        // Meta/alias clauses don't latch: a meta command has no in-world
        // acted object to attribute take/drop/antecedent to.
        const isMeta = stage === 'meta' || stage === 'alias'
        lastCommandRef.current = isMeta ? null : result.text

        if (total === 1) {
          sendTracked(result.text, clause, translated)
          done++
          break // single command: Terminal's observe handles the turn
        }

        // sendTracked registers the turn listener BEFORE sendLine (see its
        // comment above), so the synchronous VM turn cannot be missed; the
        // clause then awaits that same boundary.
        sendTracked(result.text, clause, translated)
        done++

        const turn = await turnBox.pending!
        if (turn === 'timeout' || turn.reason !== 'line') {
          stopReason =
            turn === 'timeout' ? 'turn-timeout' : `turn:${turn.reason}`
          break // decision 8
        }

        const vc = viewToContext(turn.view)
        // A non-empty location that differs from the prior clause's = a successful
        // move; its new room description is success output, not a failure to scan.
        const roomChanged = vc.location !== '' && vc.location !== prevLocation
        prevLocation = vc.location
        // The hook owns observe during a sequence (decision 9).
        tracker.observe({
          location: vc.location,
          outputText: vc.recentOutput,
          lastCommand: lastCommandRef.current,
        })
        if (
          !roomChanged &&
          !isMeta && // meta output (score report, "Ok.") is not in-world failure text
          clauseFailed(
            vc.recentOutput,
            vocab,
            lastCommandRef.current ?? undefined,
          )
        ) {
          stopReason = 'in-game-failure'
          break // no-op / absence (scoped to the acted object — F2/R3)
        }
        if (
          isConfirmationPrompt(vc.recentOutput) ||
          isDisambiguationPrompt(vc.recentOutput) ||
          isOrphanPrompt(vc.recentOutput)
        ) {
          stopReason = 'interactive-prompt'
          break // mid-sequence interactive/orphan prompt (decision 3)
        }
      }
      if (stopReason)
        nlDebug('sequence stop', JSON.stringify({ stopReason, done, total }))

      // A genuine engine error mid-compound never propagates to the drain's
      // catch (total>1 swallows it above), so it is logged HERE, before any
      // branching, to keep the "generate failures stay diagnosable"
      // contract on every path ([B]). A ModelLoadError is NOT a generate fault
      // — it is a known degradation handled by demoting to grammar-only — so it
      // is excluded (it would otherwise log on every clause-time load failure).
      if (
        stopError !== null &&
        !(stopError instanceof WatchdogTimeout) &&
        !(stopError instanceof ModelLoadError)
      )
        log.error('translation failed:', stopError)

      if (done === 0) {
        // STAGE 8 — abstain policy (spec §4, UAT F-R). English: the raw line
        // goes to the Z-parser, whose own error message is genuinely useful.
        // Non-English: raw French/German/Spanish would only earn a useless
        // "I don't know the word …" AND burn a game turn — send NOTHING and
        // show a styled notice instead. Engine errors are checked FIRST
        // ([B]): EN still raw-sends, but a translator failure must not
        // masquerade as a deliberate abstain — it gets the failure notice.
        lastCommandRef.current = null
        if (stopError !== null) {
          if (stopError instanceof ModelLoadError) {
            // Clause-time load failure (demote already fired): the shared
            // basic-mode notice; EN still raw-sends the typed line.
            setNotice(modelDownloadFailed(activeLang))
            if (activeLang === 'en') sendTracked(line)
          } else {
            // The translator broke (timeout/engine error) — don't blame the
            // player's wording (Task 21 review).
            abstainOnError(
              activeLang,
              line,
              stopError instanceof WatchdogTimeout,
            )
          }
        } else if (rawSendsToParser(activeLang, line)) {
          // en, and (§5.5) a ka player's English (ASCII) line that missed the
          // Georgian lexicon: raw-send to the Z-parser — degrade, never block. A
          // ka line CONTAINING Georgian is excluded by rawSendsToParser and falls
          // through to the abstain notice below.
          sendTracked(line)
        } else if (
          grammarOnly &&
          !educatedRef.current &&
          (live.llmEnabled || activeLang === 'ka')
        ) {
          // First grammar-only abstain this stint: connect the miss to the
          // declined/absent upgrade at the moment of confusion (once per stint).
          // Suppressed when the LLM feature is HIDDEN (no upgrade to pitch) —
          // except ka, whose first-miss notice carries no pitch anyway and stays
          // the no-LLM language's chosen Georgian wording (CLAUDE.md ka rule).
          educatedRef.current = true
          setNotice(grammarOnlyFirstMiss(activeLang))
        } else {
          setNotice(couldntTranslate(activeLang))
        }
        // Only the NOTICE branches retain the typed line; the raw-send arms (en,
        // and ka-ASCII via §5.5) consumed it — don't re-populate the input field.
        const rawSent = rawSendsToParser(activeLang, line)
        if (!fromQueue && !rawSent) retainTyped = line
      } else if (done < total) {
        // Truncated sequence → make it visible (decision 7); an engine
        // error labels the notice so it can't pass for a quiet stop ([B]).
        setNotice(
          ranOfActions(
            activeLang,
            done,
            total,
            stopError === null
              ? 'ok'
              : stopError instanceof WatchdogTimeout
                ? 'timeout'
                : 'failed',
          ),
        )
      }
      // A mid-sequence interactive prompt must flush the queue too (F-A):
      // whatever the player typed ahead, the game is now asking a question.
      return stopReason === 'interactive-prompt' ? 'flush' : 'ok'
    }

    translatingRef.current = true
    setPending(true)
    setNotice(null)
    try {
      // DRAIN (F-A): run the typed line, then any lines queued meanwhile,
      // one at a time through the FULL pipeline. Notice policy: cleared once
      // here at drain start — a notice set by an earlier line (abstain,
      // truncation) deliberately survives later lines unless they set their
      // own.
      let line: string | undefined = english
      let fromQueue = false
      // The previous drained line's settled turn view (see runLine's param
      // doc) — null for the first line and after a boundary timeout.
      let settled: ViewContext | null = null
      while (line !== undefined) {
        // [O] Story swapped between lines: everything left here was typed
        // at the OLD game. Quiet clear — the swap made the lines
        // irrelevant, and a notice would land in the new game's transcript.
        if (epochRef.current !== epoch) {
          queueRef.current = []
          syncQueue()
          break
        }
        // [N] 'Off is instant' for the queue too: the phase left 'on'
        // mid-drain, so the line in hand and everything queued behind it
        // is abandoned with a notice instead of being translated by a
        // layer the player just turned off. Unreachable for the first
        // (typed) line — translate gated on phase with no await since.
        // Also bail when a NO-LLM (output-only) language has no input lexicon
        // for this game ([I3], review-fix C2): ka-on-Zork-I has a real lex and
        // its queue MUST drain; ka-on-Zork-II/III has lex===null with no LLM
        // fallback, so there is nothing to drain it with — bail. The bare
        // `!lex` predicate the plan first sketched is WRONG: en (and the
        // fr/de/es test harnesses) run phase==='on' with lex===null but must
        // NOT bail — en raw-sends, fr/de/es fall back to the LLM. The property
        // that actually warrants a bail is "no-LLM language AND no lexicon",
        // which is exactly OUTPUT_ONLY_LANGS.has(language) && lex===null — the
        // coupling is the meaning here, not a leftover (the Task 17 INPUT
        // ROUTING decision is what C2 keeps off OUTPUT_ONLY_LANGS).
        const live = liveRef.current
        if (
          live.internal.phase !== 'on' ||
          (OUTPUT_ONLY_LANGS.has(live.internal.language) && live.lex === null)
        ) {
          lastCommandRef.current = null
          queueRef.current = []
          syncQueue()
          setNotice('Queue cleared — natural language is off.')
          break
        }
        let outcome: 'ok' | 'flush' | 'stale' = 'ok'
        try {
          outcome = await runLine(line, fromQueue, settled)
        } catch (err) {
          // PER-LINE error handling — the pre-queue single-line contract,
          // kept per line so an engine error on one line cannot silently
          // abandon the rest of the queue. A genuine generate failure (vs. a
          // benign watchdog timeout) is logged so the root cause stays
          // diagnosable, and the drain continues.
          lastCommandRef.current = null
          // Backstop: a clause-time load failure that reaches the drain catch
          // (e.g. a future rethrow path) must still demote + show the shared
          // basic-mode notice, then advance the drain like a normal stop. The
          // in-runLine stage-8 path handles the total===1 case directly today,
          // but mirroring it here keeps the contract on every path.
          if (err instanceof ModelLoadError) {
            demote()
            const lang = liveLang()
            setNotice(modelDownloadFailed(lang))
            if (lang === 'en') sendTracked(line)
            else if (!fromQueue) retainTyped = line // non-EN nothing-sent (M8)
            inSequenceRef.current = false
            line = queueRef.current.shift()?.text
            fromQueue = true
            syncQueue()
            settled = null
            continue
          }
          if (!(err instanceof WatchdogTimeout))
            log.error('translation failed:', err)
          // F2/F-R: honor stage-8's abstain policy here too (this outer catch
          // catches the total===1 rethrow that bypassed the in-runLine path).
          abstainOnError(liveLang(), line, err instanceof WatchdogTimeout)
          // Non-EN abstainOnError sends nothing → restore the typed line (M8).
          if (!fromQueue && liveLang() !== 'en') retainTyped = line
        }
        // A compound that stopped mid-sequence leaves this set; reset it per
        // line so Terminal's observe effect resumes for later queued lines.
        inSequenceRef.current = false
        // 'stale' ([O]): the story changed while a clause translated — the
        // result was dropped unsent; abandon the rest of the drain too.
        if (outcome === 'stale') {
          queueRef.current = []
          syncQueue()
          break
        }
        // 'flush': the game raised an interactive prompt. A FROM-QUEUE line
        // that flushes was itself dropped input, so the notice ALWAYS shows
        // — even when nothing else was queued behind it (a lone queued line
        // must not vanish silently). A flush from the TYPED line (mid-
        // compound prompt) only notices when it actually discards something.
        if (outcome === 'flush' && (fromQueue || queueRef.current.length > 0)) {
          queueRef.current = []
          syncQueue()
          setNotice(queueClearedNeedsAnswer(liveLang()))
          break
        }
        line = queueRef.current.shift()?.text
        fromQueue = true
        syncQueue()
        // TURN-BOUNDARY AWAIT between drained lines (§11): before running a
        // queued line, wait for the boundary of whatever the previous line
        // sent so its stage-1 interactive-prompt check and the scene tracker
        // see the SETTLED output — the view ref getContext() reads only
        // updates after a React re-render the drain never yields for. The
        // drain owns this boundary exactly like a compound owns its clause
        // boundaries (decision 9): inSequenceRef defers Terminal's observe
        // effect, and the observe below preserves the lastCommand latch
        // semantics (latched command attributed, latch left for the
        // idempotent trailing Terminal observe). On timeout — or a turn that
        // settled some other way — proceed with the live (possibly stale)
        // view rather than dropping the player's queued input: raceTurn's
        // watchdog already bounds the wait (decision 8).
        settled = null
        if (line !== undefined && turnBox.pending !== null) {
          inSequenceRef.current = true
          const turn = await turnBox.pending
          turnBox.pending = null
          // An empty turn view (degenerate fixture / no output) carries no
          // information — keep the getContext() fallback instead.
          if (turn !== 'timeout' && turn.reason === 'line') {
            const vc = viewToContext(turn.view)
            if (vc.recentOutput !== '') {
              settled = vc
              tracker.observe({
                location: vc.location,
                outputText: vc.recentOutput,
                lastCommand: lastCommandRef.current,
              })
            }
          }
        }
      }
    } finally {
      translatingRef.current = false
      setPending(false)
      inSequenceRef.current = false
    }
    return retainTyped
  }
}

// The scene-tracker `observe` and `isSequencing` seams stay in the hook: they
// are tiny, read the same refs, and form the hook's public turn-boundary
// contract with Terminal. Keeping them there avoids re-exporting refs just to
// move two one-liners.
