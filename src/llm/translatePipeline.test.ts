import { describe, it, expect, vi } from 'vitest'
import {
  runClause,
  createGenerateRaw,
  createTranslate,
  ModelLoadError,
} from './translatePipeline'
import type {
  ClauseDeps,
  GenerateRaw,
  Lex,
  TranslateDeps,
} from './translatePipeline'
import type { Vocab } from './grammar/types'
import type { Scene } from './scene/types'
import { buildGrammar } from './grammar/buildGrammar'
import { coreLexicon, nounLexicon, lexiconWordSet } from './lexicon/index'
import { ZORK1_SIG } from './grammar/index'
import { ZORK1_VOCAB } from './grammar/zork1.vocab'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT } from './grammar/patterns'
import { FakeLlmEngine } from './engine.fake'
import { EngineGate } from '../shared/engineGate'
import { TextSceneTracker } from './scene/tracker'
import { emptyView } from '../glkote-react/types'
import type { Internal } from './useModelDownload'
import type { ActiveLanguage } from './types'
import {
  grammarOnlyFirstMiss,
  couldntTranslate,
  modelDownloadFailed,
  nothingSent,
} from './notices'

// Direct unit tests for the now-pure clause pipeline (F-1). The hook-level
// suite (useNaturalLanguage.test.tsx) already exercises every stage through the
// drain; these pin runClause in isolation — proving it routes stages 3–7
// deterministically and only consults the model on the final fallthrough.

const TEST_VOCAB: Vocab = {
  verbsOnly: ['look', 'inventory'],
  movement: ['north'],
  verbs1: ['take', 'open'],
  verbs2: ['unlock'],
  preps: ['with'],
  verbSynonyms: [],
  nouns: [
    // canonical/emit are NOT parser dictionary words (F-Z), so 'open mailbox'
    // is NOT all-vocab — it falls through to the LLM.
    { canonical: 'mailbox', emit: 'mailbox' },
    // synonyms ARE dictionary words → 'open trapdoor' is stage-4 passthrough.
    {
      canonical: 'trap door',
      emit: 'trapdoor',
      synonyms: ['door', 'trapdoor', 'trap-door'],
      adjectives: ['trap'],
    },
  ],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
}

const emptyScene: Scene = { inScope: [], antecedent: null }
const ctx = () => ({ location: 'West of House', recentOutput: '' })

/** Deterministic-stage deps: a generateRaw that MUST NOT be called, plus the
 * en-mode (null) lexicon. */
function detDeps(): {
  deps: ClauseDeps
  generateRaw: ReturnType<typeof vi.fn>
} {
  const generateRaw = vi.fn<GenerateRaw>(async () => {
    throw new Error('generateRaw must not be called for a deterministic stage')
  })
  return {
    generateRaw,
    deps: {
      vocab: TEST_VOCAB,
      grammar: buildGrammar(TEST_VOCAB),
      generateRaw,
      getContext: ctx,
    },
  }
}

describe('runClause (NL v2 pipeline stages 3–7)', () => {
  it('stage 3 (meta): a Z-machine meta-verb routes raw, no model', async () => {
    const { deps, generateRaw } = detDeps()
    const r = await runClause('restart', emptyScene, 'en', null, false, deps)
    expect(r.stage).toBe('meta')
    expect(r.result).toEqual({ kind: 'command', text: 'restart' })
    expect(generateRaw).not.toHaveBeenCalled()
  })

  it('stage 4 (vocab passthrough): an all-vocab clause is sent verbatim, no model', async () => {
    const { deps, generateRaw } = detDeps()
    const r = await runClause(
      'open trapdoor',
      emptyScene,
      'en',
      null,
      false,
      deps,
    )
    expect(r.stage).toBe('vocab')
    expect(r.result).toEqual({ kind: 'command', text: 'open trapdoor' })
    expect(generateRaw).not.toHaveBeenCalled()
  })

  it('stage 4 sends the trailing-punctuation-stripped form it gated on ([C])', async () => {
    const { deps, generateRaw } = detDeps()
    const r = await runClause(
      'open trapdoor!',
      emptyScene,
      'en',
      null,
      false,
      deps,
    )
    expect(r.stage).toBe('vocab')
    expect(r.result).toEqual({ kind: 'command', text: 'open trapdoor' })
    expect(generateRaw).not.toHaveBeenCalled()
  })

  it('stage 5 (direction): a non-vocab movement phrase resolves in code, no model', async () => {
    // A bare 'north' is all-vocab (stage 4); 'go north' is NOT (the lead verb
    // 'go' isn't a parser word), so it falls through to the direction fast-path,
    // which strips the lead and resolves the closed multilingual set.
    const { deps, generateRaw } = detDeps()
    const r = await runClause('go north', emptyScene, 'en', null, false, deps)
    expect(r.stage).toBe('direction')
    expect(r.result).toEqual({ kind: 'command', text: 'north' })
    expect(generateRaw).not.toHaveBeenCalled()
  })

  it('stage 6 (lexicon): a fr clause resolves deterministically against the per-game lexicon, no model', async () => {
    const generateRaw = vi.fn<GenerateRaw>(async () => {
      throw new Error('lexicon hit must not call the model')
    })
    const lex: Lex = {
      core: coreLexicon('fr'),
      nouns: nounLexicon('fr', ZORK1_SIG),
      words: lexiconWordSet('fr', ZORK1_SIG),
    }
    const deps: ClauseDeps = {
      vocab: ZORK1_VOCAB,
      grammar: buildGrammar(ZORK1_VOCAB),
      generateRaw,
      getContext: ctx,
    }
    const r = await runClause(
      'ouvre la trappe',
      emptyScene,
      'fr',
      lex,
      false,
      deps,
    )
    expect(r.stage).toBe('lexicon')
    expect(r.result).toEqual({ kind: 'command', text: 'open trapdoor' })
    expect(generateRaw).not.toHaveBeenCalled()
  })

  it('stage 6 (EN pronoun): "open it" resolves to the antecedent, no model', async () => {
    // The "open advertisement" bug: English has no input lexicon, so a bare
    // pronoun reached the LLM and hit a poisoned few-shot. English now gets the
    // same deterministic pronoun substitution fr/de/es get in parseLexicon.
    const { deps, generateRaw } = detDeps()
    const scene: Scene = { inScope: [], antecedent: 'mailbox' }
    const r = await runClause('open it', scene, 'en', null, false, deps)
    expect(r.stage).toBe('lexicon')
    expect(r.result).toEqual({ kind: 'command', text: 'open mailbox' })
    expect(generateRaw).not.toHaveBeenCalled()
  })

  it('stage 6 (EN pronoun): no antecedent raw-sends "open it" to Zork, not the LLM', async () => {
    // Nothing to resolve "it" to → raw-send the player's words verbatim. Zork's
    // parser tracks "it" natively, which is far safer than the LLM (it
    // hallucinated "open chests"). Sent as a passthrough (stage 'vocab').
    const { deps, generateRaw } = detDeps()
    const r = await runClause('open it', emptyScene, 'en', null, false, deps)
    expect(r.stage).toBe('vocab')
    expect(r.result).toEqual({ kind: 'command', text: 'open it' })
    expect(generateRaw).not.toHaveBeenCalled()
  })

  it('stage 6 (EN pronoun): a non-verb pronoun clause still reaches the LLM', async () => {
    // "frobnicate" is no verb, so this is not a well-formed pronoun command — the
    // raw-send fallback must NOT fire; genuine unknown input goes to the model.
    const grammar = buildGrammar(TEST_VOCAB)
    const generateRaw = vi.fn<GenerateRaw>(async () => '{"verb":"__UNKNOWN__"}')
    const deps: ClauseDeps = {
      vocab: TEST_VOCAB,
      grammar,
      generateRaw,
      getContext: ctx,
    }
    const r = await runClause(
      'frobnicate it',
      emptyScene,
      'en',
      null,
      false,
      deps,
    )
    expect(r.stage).toBe('llm')
    expect(generateRaw).toHaveBeenCalledTimes(1)
  })

  it('non-English with a null-noun lexicon falls through to the LLM, not the English resolvers (I2)', async () => {
    // The English resolver block is gated on the active LANGUAGE, not merely
    // "this game has no noun lexicon": an es/fr/de picker on a game whose noun
    // lexicon is unregistered (lex non-null, lex.nouns null) must NOT run the
    // English pronoun/quantifier resolvers — its input belongs to the LLM.
    // Latent today (all Zork sigs are registered), but the contract must match
    // the gate. With the old `else` on `lex?.nouns`, "open it" here resolved to
    // the antecedent deterministically; the language gate sends it to the model.
    const grammar = buildGrammar(TEST_VOCAB)
    const generateRaw = vi.fn<GenerateRaw>(
      async () => '{"verb":"open","object":"mailbox"}',
    )
    const deps: ClauseDeps = {
      vocab: TEST_VOCAB,
      grammar,
      generateRaw,
      getContext: ctx,
    }
    const lex: Lex = { core: coreLexicon('es'), nouns: null, words: new Set() }
    const scene: Scene = { inScope: [], antecedent: 'mailbox' }
    const r = await runClause('open it', scene, 'es', lex, false, deps)
    expect(r.stage).toBe('llm')
    expect(generateRaw).toHaveBeenCalledTimes(1)
  })

  it('stage 7 (LLM): an unresolved clause consults the model with the full-vocab grammar', async () => {
    const grammar = buildGrammar(TEST_VOCAB)
    const generateRaw = vi.fn<GenerateRaw>(
      async () => '{"verb":"open","object":"mailbox"}',
    )
    const deps: ClauseDeps = {
      vocab: TEST_VOCAB,
      grammar,
      generateRaw,
      getContext: ctx,
    }
    const r = await runClause(
      'pop the mailbox',
      emptyScene,
      'en',
      null,
      false,
      deps,
    )
    expect(r.stage).toBe('llm')
    expect(r.result).toEqual({ kind: 'command', text: 'open mailbox' })
    // The validator's grammar is the FULL vocab (NL v2 §7), forwarded untouched.
    expect(generateRaw).toHaveBeenCalledTimes(1)
    expect(generateRaw.mock.calls[0][1]).toBe(grammar)
  })

  it('stage 7: the prompt carries the live scene (inScope + antecedent)', async () => {
    const grammar = buildGrammar(TEST_VOCAB)
    const generateRaw = vi.fn<GenerateRaw>(
      async () => '{"verb":"take","object":"leaflet"}',
    )
    const deps: ClauseDeps = {
      vocab: TEST_VOCAB,
      grammar,
      generateRaw,
      getContext: ctx,
    }
    const scene: Scene = {
      inScope: [{ canonical: 'leaflet' }, { canonical: 'mailbox' }],
      antecedent: 'leaflet',
    }
    await runClause('grab it', scene, 'en', null, false, deps)
    // buildPrompt folds the scene into the messages; assert the in-scope
    // canonicals and antecedent reached the model.
    const messages = generateRaw.mock.calls[0][0]
    const serialized = JSON.stringify(messages)
    expect(serialized).toContain('leaflet')
    expect(serialized).toContain('mailbox')
  })
})

describe('runClause grammar-only', () => {
  it('skips stage 7 and abstains — engine.generate is never called', async () => {
    const engine = new FakeLlmEngine({
      default: '{"verb":"take","noun":"lamp"}',
    })
    const generateRaw = createGenerateRaw({
      engine,
      watchdogMs: 1000,
      engineGate: new EngineGate(),
    })
    const deps = {
      vocab: TEST_VOCAB,
      grammar: 'root ::= "x"',
      generateRaw,
      getContext: () => ({ location: '', recentOutput: '' }),
    }
    // A clause that reaches stage 7 (not a meta/vocab/direction/lexicon hit):
    const { result, stage } = await runClause(
      'frobnicate the gadget',
      emptyScene,
      'fr',
      null,
      true,
      deps,
    )
    expect(result).toEqual({ kind: 'abstain' })
    expect(stage).toBe('llm')
    expect(engine.generateCalls).toBe(0)
  })

  it('grammarOnly:false still calls the model at stage 7', async () => {
    const engine = new FakeLlmEngine({ default: 'I_DONT_KNOW' })
    const generateRaw = createGenerateRaw({
      engine,
      watchdogMs: 1000,
      engineGate: new EngineGate(),
    })
    const deps = {
      vocab: TEST_VOCAB,
      grammar: 'root ::= "x"',
      generateRaw,
      getContext: () => ({ location: '', recentOutput: '' }),
    }
    await runClause(
      'frobnicate the gadget',
      emptyScene,
      'fr',
      null,
      false,
      deps,
    )
    expect(engine.generateCalls).toBe(1)
  })
})

describe('createGenerateRaw load vs generate failures', () => {
  it('a lazy-load failure throws ModelLoadError', async () => {
    const engine = new FakeLlmEngine({ failLoad: true }) // not loaded → load() runs and throws
    const g = createGenerateRaw({
      engine,
      watchdogMs: 1000,
      engineGate: new EngineGate(),
    })
    await expect(
      g([{ role: 'user', content: 'x' }], 'root ::= "x"'),
    ).rejects.toBeInstanceOf(ModelLoadError)
  })

  it('a generate failure (model loaded) is NOT a ModelLoadError', async () => {
    const engine = new FakeLlmEngine({ failGenerate: true })
    await engine.load(() => {}, new AbortController().signal) // model resident → skip the load path
    const g = createGenerateRaw({
      engine,
      watchdogMs: 1000,
      engineGate: new EngineGate(),
    })
    await expect(
      g([{ role: 'user', content: 'x' }], 'root ::= "x"'),
    ).rejects.not.toBeInstanceOf(ModelLoadError)
  })
})

/** Minimal createTranslate harness (no hook): builds the SAME refs/deps the hook
 * holds (translatePipeline's TranslateDeps), so a single translate() call drives
 * the real stages 1–8 + the degenerate total===1 drain. Mirrors the production
 * createTranslate({...}) call site in useNaturalLanguage; only test scaffolding,
 * no new production seam. `sendLine` is the raw send seam stage 8 uses for the
 * EN raw-send path. */
function makeTranslate(opts: {
  engine: FakeLlmEngine
  internalOn: Internal & { phase: 'on' }
  setNotice: TranslateDeps['setNotice']
  demote: () => void
  educatedRef: { current: boolean }
  sendLine?: (text: string) => void
  sendCanonical?: (text: string) => void
  echoLocal?: (text: string) => void
  watchdogMs?: number
  lex?: Lex
}): (english: string) => Promise<string | null> {
  const watchdogMs = opts.watchdogMs ?? 1000
  const generateRaw = createGenerateRaw({
    engine: opts.engine,
    watchdogMs,
    engineGate: new EngineGate(),
  })
  // lex defaults to null (the grammar-only / load-failure cases route a
  // stage-7-bound clause with no lexicon resolution); pass one to exercise the
  // deterministic alias/lexicon stages.
  const liveRef = {
    current: { internal: opts.internalOn, lex: opts.lex ?? null },
  }
  const deps: TranslateDeps = {
    internal: opts.internalOn,
    vocab: TEST_VOCAB,
    grammar: buildGrammar(TEST_VOCAB),
    generateRaw,
    watchdogMs,
    getContext: () => ({ location: '', recentOutput: '' }),
    echoLocal: opts.echoLocal ?? (() => {}),
    sendLine: opts.sendLine ?? (() => {}),
    sendCanonical: opts.sendCanonical ?? (() => {}),
    awaitTurn: async () => ({ view: emptyView, reason: 'line' as const }),
    refs: {
      trackerRef: { current: new TextSceneTracker(TEST_VOCAB) },
      translatingRef: { current: false },
      queueRef: { current: [] },
      queueIdRef: { current: 0 },
      lastCommandRef: { current: null },
      inSequenceRef: { current: false },
      epochRef: { current: 0 },
      liveRef,
      educatedRef: opts.educatedRef,
    },
    demote: opts.demote,
    setPending: () => {},
    setNotice: opts.setNotice,
    syncQueue: () => {},
  }
  return createTranslate(deps)
}

describe('createTranslate grammar-only + demotion', () => {
  const on = (
    language: ActiveLanguage,
    model: 'full' | 'grammar',
  ): Internal & { phase: 'on' } => ({ phase: 'on', language, model })

  it('compound: every translated clause is sent canonical, with ONE nl-source echo', async () => {
    // Both clauses are non-vocab/non-direction → stage 7 (llm). The fake returns
    // a valid full-vocab command for each, so each clause translates and sends.
    const engine = new FakeLlmEngine({
      default: '{"verb":"open","object":"mailbox"}',
    })
    const sendCanonical = vi.fn()
    const sendLine = vi.fn()
    let echoCount = 0
    const t = makeTranslate({
      engine,
      internalOn: on('fr', 'full'),
      setNotice: vi.fn(),
      demote: vi.fn(),
      educatedRef: { current: false },
      sendLine,
      sendCanonical,
      echoLocal: () => {
        echoCount++
      },
    })
    await t('frobnique le gadget et frobnique encore')
    expect(echoCount).toBe(1) // one UI-only nl-source line for the whole compound
    expect(sendCanonical).toHaveBeenCalledTimes(2) // BOTH echoes tagged canonical
    expect(sendLine).not.toHaveBeenCalled() // translated sends never go raw
  })

  it('alias clause is sent canonical (hidden in debug-off) with an nl-source echo — I2', async () => {
    // ES "inventario" → canonical "inventory" via the core lexicon's metaAliases
    // (stage 3, before the model). The player's word differs from the engine's
    // '>'-echo, so its source echoes once (nl-source) and the canonical
    // "inventory" goes via sendCanonical → nl-canonical → hidden in debug-off.
    // alias ∈ TRANSLATED_STAGES; this pins the visibility the spec controls.
    const engine = new FakeLlmEngine({ default: 'X' }) // never reached
    const sendCanonical = vi.fn()
    const sendLine = vi.fn()
    let echoCount = 0
    const t = makeTranslate({
      engine,
      internalOn: on('es', 'full'),
      setNotice: vi.fn(),
      demote: vi.fn(),
      educatedRef: { current: false },
      sendLine,
      sendCanonical,
      lex: { core: coreLexicon('es'), nouns: null, words: new Set() },
      echoLocal: () => {
        echoCount++
      },
    })
    await t('inventario')
    expect(echoCount).toBe(1) // the player's Spanish word echoes once
    expect(sendCanonical).toHaveBeenCalledTimes(1)
    expect(sendCanonical).toHaveBeenCalledWith('inventory')
    expect(sendLine).not.toHaveBeenCalled() // not a visible raw send
  })

  it('compound: a vocab passthrough AFTER a translated clause stays visible (not canonical) — I1', async () => {
    // `va au nord` → direction stage (translated → canonical/hidden in debug-off).
    // `open trapdoor` → vocab passthrough: the player's OWN words, so it must go
    // via sendLine (visible), NOT inherit the turn-level `echoed` latch as its
    // canonical flag. Regression for the order-dependent leak (review I1).
    const engine = new FakeLlmEngine({ default: 'X' }) // never reached
    const sendCanonical = vi.fn()
    const sendLine = vi.fn()
    let echoCount = 0
    const t = makeTranslate({
      engine,
      internalOn: on('fr', 'full'),
      setNotice: vi.fn(),
      demote: vi.fn(),
      educatedRef: { current: false },
      sendLine,
      sendCanonical,
      echoLocal: () => {
        echoCount++
      },
    })
    await t('va au nord et open trapdoor')
    expect(echoCount).toBe(1) // one nl-source line for the translated clause
    expect(sendCanonical).toHaveBeenCalledTimes(1) // only the direction clause
    expect(sendCanonical).toHaveBeenCalledWith('north')
    expect(sendLine).toHaveBeenCalledTimes(1) // passthrough stays visible
    expect(sendLine).toHaveBeenCalledWith('open trapdoor')
  })

  it('EN: a real LLM translation (result differs from the typed line) echoes once — the identity guard does NOT over-suppress (Zork III review #1)', async () => {
    // The verbatim-echo suppression (translatePipeline.ts: `translated =
    // TRANSLATED_STAGES.has(stage) && !(activeLang === 'en' &&
    // isIdentityEcho(line, result.text))`) must fire ONLY when the model hands
    // back the player's OWN words. Here 'pop the mailbox' is non-vocab ('pop'
    // is not a parser word), so it reaches stage 7; the fake returns the
    // canonical 'open mailbox', which DIFFERS from the typed line. So the clause
    // genuinely translated → the nl-source line MUST echo exactly once and the
    // send is tagged canonical. This pins the reachable half of the guard: an
    // inverted condition (suppressing a real translation) fails here.
    const engine = new FakeLlmEngine({
      default: '{"verb":"open","object":"mailbox"}',
    })
    const sendCanonical = vi.fn()
    const sendLine = vi.fn()
    let echoCount = 0
    let echoedWith: string | null = null
    const t = makeTranslate({
      engine,
      internalOn: on('en', 'full'),
      setNotice: vi.fn(),
      demote: vi.fn(),
      educatedRef: { current: false },
      sendLine,
      sendCanonical,
      echoLocal: (text: string) => {
        echoCount++
        echoedWith = text
      },
    })
    await t('pop the mailbox')
    expect(engine.generateCalls).toBe(1) // genuinely reached the model (stage 7)
    expect(echoCount).toBe(1) // a REAL translation → echo the source once
    expect(echoedWith).toBe('pop the mailbox')
    expect(sendCanonical).toHaveBeenCalledWith('open mailbox')
    expect(sendLine).not.toHaveBeenCalled() // a translated send never goes raw
  })

  // UNREACHABLE-GUARD NOTE (Zork III review #1, verbatim-echo suppression):
  // the `&& !(activeLang === 'en' && isIdentityEcho(line, result.text))` half of
  // the `translated` flag cannot be exercised by any black-box test through this
  // pipeline. For the English identity branch to fire, an LLM/translated stage
  // must return `result.text` equal (normalized) to the typed `line`. But
  // `parseCommand` builds `result.text` only from VOCAB tokens (verb canonical +
  // noun emit words), and since the emit-words fix every emit/canonical token is
  // in `vocabWordSet` — so any line whose words equal `result.text` is ALL-VOCAB
  // and short-circuits at stage 4 (vocab passthrough) before ever reaching the
  // model. Empirically confirmed: deleting the `isIdentityEcho` half of the guard
  // fails ZERO tests across the whole src/llm suite. The guard is therefore a
  // defensive no-op against a model returning the player's exact words — kept
  // because it is cheap and correct, but it has no live coverage and (per the
  // "no production change" constraint) cannot be unit-tested without exporting
  // `isIdentityEcho`. Documented here so a future reader does not "restore"
  // coverage that the pipeline ordering makes impossible.

  it('an output-only active language (ka) never invokes the input LLM — the drain bails ([I3])', async () => {
    // ka has no input lexicon and raw-sends English. If the player switches to ka
    // mid-drain, the queue must be abandoned (like 'off'), NOT fall through to
    // stage 7 under activeLang='ka'. The drain guard reads liveRef each iteration,
    // so an active ka language bails before runLine reaches generate.
    const engine = new FakeLlmEngine({ default: '{"verb":"look"}' })
    const setNotice = vi.fn()
    const sendCanonical = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: on('ka', 'grammar'),
      setNotice,
      demote: vi.fn(),
      educatedRef: { current: false },
      sendCanonical,
    })
    await t('open the mailbox')
    expect(engine.generateCalls).toBe(0) // input LLM never reached
    expect(sendCanonical).not.toHaveBeenCalled()
    expect(setNotice).toHaveBeenLastCalledWith(
      'Queue cleared — natural language is off.',
    )
  })

  // Task 16 (C2): queue bail narrowed from `OUTPUT_ONLY_LANGS.has(lang)` alone
  // to `OUTPUT_ONLY_LANGS.has(lang) && lex === null`. ka-on-Zork-I has a real
  // input lexicon → queue MUST NOT be abandoned. ka-on-Zork-II/III has no ka
  // noun lexicon → bail still fires (lex === null).
  it('ka Zork I (lex present): queue drains — NOT abandoned ([C2] review-fix)', async () => {
    // Two Georgian commands from parse.ka-walkthrough.test.ts verified against ZORK1_VOCAB:
    //   'გააღე ყუთი' → 'open mailbox' (ZORK1_VOCAB canonical: 'small mailbox' → emit: 'mailbox')
    //   'აიღე ყუთი' → 'take mailbox' (ZORK1_VOCAB canonical: 'small mailbox' → emit: 'mailbox')
    // Uses ZORK1_VOCAB + the real ka lexicon so parseLexicon resolves the Georgian nouns.
    // makeTranslate always uses TEST_VOCAB, so this test calls createTranslate directly.
    // With a real lex the bail predicate (OUTPUT_ONLY_LANGS.has(lang) &&
    // lex === null) is false → the queue drains (review-fix C2).
    const engine = new FakeLlmEngine({ default: '{"verb":"look"}' })
    const setNotice = vi.fn()
    const sendCanonical = vi.fn()
    const kaLex: Lex = {
      core: coreLexicon('ka'),
      nouns: nounLexicon('ka', ZORK1_SIG),
      words: lexiconWordSet('ka', ZORK1_SIG),
    }
    const internalOn: Internal & { phase: 'on' } = {
      phase: 'on',
      language: 'ka',
      model: 'grammar',
    }
    const liveRef = { current: { internal: internalOn, lex: kaLex } }
    const watchdogMs = 1000
    const generateRaw = createGenerateRaw({
      engine,
      watchdogMs,
      engineGate: new EngineGate(),
    })
    const deps: TranslateDeps = {
      internal: internalOn,
      vocab: ZORK1_VOCAB,
      grammar: buildGrammar(ZORK1_VOCAB),
      generateRaw,
      watchdogMs,
      getContext: () => ({ location: '', recentOutput: '' }),
      echoLocal: () => {},
      sendLine: () => {},
      sendCanonical,
      awaitTurn: async () => ({ view: emptyView, reason: 'line' as const }),
      refs: {
        trackerRef: { current: new TextSceneTracker(ZORK1_VOCAB) },
        translatingRef: { current: false },
        queueRef: { current: [] },
        queueIdRef: { current: 0 },
        lastCommandRef: { current: null },
        inSequenceRef: { current: false },
        epochRef: { current: 0 },
        liveRef,
        educatedRef: { current: false },
      },
      demote: vi.fn(),
      setPending: () => {},
      setNotice,
      syncQueue: () => {},
    }
    const t = createTranslate(deps)
    // First call acquires translatingRef=true synchronously; second finds it set
    // and queues. Drain processes both lines before p1 resolves.
    const p1 = t('გააღე ყუთი') // open mailbox — verified Georgian form
    const p2 = t('აიღე ყუთი') // take mailbox — queued, drained after p1
    await Promise.all([p1, p2])
    // The bail must NOT have fired: "Queue cleared" notice absent.
    const notices = setNotice.mock.calls.map(c => c[0] as string | null)
    expect(notices).not.toContain('Queue cleared — natural language is off.')
    // Grammar-only: LLM never invoked. Lexicon stage → sendCanonical called.
    expect(engine.generateCalls).toBe(0)
    expect(sendCanonical).toHaveBeenCalled()
  })

  it('ka Zork II (lex null): queue bail still fires — no ka noun lexicon ([C2])', async () => {
    // ka on Zork II: no ka noun lexicon → lex=null, and ka ∈ OUTPUT_ONLY_LANGS,
    // so the bail predicate is true → fires exactly as the pre-fix path did.
    const engine = new FakeLlmEngine({ default: '{"verb":"look"}' })
    const setNotice = vi.fn()
    const sendCanonical = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: on('ka', 'grammar'),
      setNotice,
      demote: vi.fn(),
      educatedRef: { current: false },
      sendCanonical,
      // lex omitted → null (Task 15 guard: kaInputActive is false for Zork II)
    })
    await t('გააღე ყუთი') // Georgian input, but lex is null → bail
    expect(engine.generateCalls).toBe(0)
    expect(sendCanonical).not.toHaveBeenCalled()
    expect(setNotice).toHaveBeenLastCalledWith(
      'Queue cleared — natural language is off.',
    )
  })
  it('grammar-only: a stage-7-bound non-EN line abstains with the educational notice (once)', async () => {
    const engine = new FakeLlmEngine({ default: 'X' })
    const setNotice = vi.fn()
    const educatedRef = { current: false }
    const demote = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: on('fr', 'grammar'),
      setNotice,
      demote,
      educatedRef,
    })
    await t('frobnique le gadget')
    expect(engine.generateCalls).toBe(0)
    expect(setNotice).toHaveBeenLastCalledWith(grammarOnlyFirstMiss('fr'))
    setNotice.mockClear()
    await t('frobnique encore')
    expect(setNotice).toHaveBeenLastCalledWith(couldntTranslate('fr'))
  })

  it('full: a clause-time ModelLoadError demotes and shows the basic-mode notice', async () => {
    const engine = new FakeLlmEngine({ failLoad: true }) // not loaded → load() throws
    const setNotice = vi.fn()
    const demote = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: on('fr', 'full'),
      setNotice,
      demote,
      educatedRef: { current: false },
    })
    await t('frobnique le gadget')
    expect(demote).toHaveBeenCalledTimes(1)
    expect(setNotice).toHaveBeenLastCalledWith(modelDownloadFailed('fr'))
  })

  it('full: a GENERATE-time watchdog does NOT demote (model loaded, inference stalls)', async () => {
    // Model resident, generate stalls past the watchdog → a generate-time
    // WatchdogTimeout (timedOut=true), distinct from a load failure: no demote.
    const engine = new FakeLlmEngine({ generateDelayMs: 10000 })
    await engine.load(() => {}, new AbortController().signal) // resident
    const setNotice = vi.fn()
    const demote = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: on('fr', 'full'),
      setNotice,
      demote,
      educatedRef: { current: false },
      watchdogMs: 5, // fire fast (real timers; the stall is 10s)
    })
    await t('frobnique le gadget')
    expect(demote).not.toHaveBeenCalled()
    expect(setNotice).toHaveBeenLastCalledWith(nothingSent('fr', true)) // non-EN timeout notice
  })

  it('grammar-only EN: a stage-7-bound miss raw-sends, NO educational notice', async () => {
    const engine = new FakeLlmEngine({ default: 'X' })
    const setNotice = vi.fn()
    const sendLine = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: on('en', 'grammar'),
      setNotice,
      sendLine,
      demote: vi.fn(),
      educatedRef: { current: false },
    })
    await t('frobnicate the gadget')
    expect(engine.generateCalls).toBe(0)
    expect(sendLine).toHaveBeenCalledWith('frobnicate the gadget')
    expect(setNotice).not.toHaveBeenCalledWith(grammarOnlyFirstMiss('en'))
  })

  it('returns the typed line to restore on a non-EN nothing-sent abstain (M8)', async () => {
    const engine = new FakeLlmEngine({ default: 'X' })
    const t = makeTranslate({
      engine,
      internalOn: on('fr', 'grammar'),
      setNotice: vi.fn(),
      demote: vi.fn(),
      educatedRef: { current: false },
    })
    // Non-EN abstain sends nothing → hand the line back for restore.
    expect(await t('frobnique le gadget')).toBe('frobnique le gadget')
  })

  it('returns null when EN raw-sends the line (nothing to restore) (M8)', async () => {
    const engine = new FakeLlmEngine({ default: 'X' })
    const t = makeTranslate({
      engine,
      internalOn: on('en', 'grammar'),
      setNotice: vi.fn(),
      sendLine: vi.fn(),
      demote: vi.fn(),
      educatedRef: { current: false },
    })
    // EN abstain raw-sends to the Z-parser → the field should clear, not restore.
    expect(await t('frobnicate the gadget')).toBeNull()
  })

  // Task 11: localized help is a line-level escape that answers via the notice
  // seam (the role=status aria-live region in Terminal) and reaches the game NOT
  // at all. English help is intercepted too — Zork has no native help to fall
  // through to (and a model would otherwise mistranslate it, e.g. help → look).
  it('es "ayuda" yields the help block via setNotice and sends NO game command', async () => {
    const engine = new FakeLlmEngine({ default: 'X' }) // never reached
    const setNotice = vi.fn()
    const sendLine = vi.fn()
    const sendCanonical = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: on('es', 'full'),
      setNotice,
      sendLine,
      sendCanonical,
      demote: vi.fn(),
      educatedRef: { current: false },
      lex: { core: coreLexicon('es'), nouns: null, words: new Set() },
    })
    expect(await t('ayuda')).toBeNull()
    // The drain clears the notice (setNotice(null)) before running the line, so
    // the help block is the LAST setNotice call — assert on that, not the count.
    const block = setNotice.mock.calls.at(-1)?.[0] as string
    expect(block).toMatch(/"wind up canary"/)
    expect(block.toLowerCase()).toContain('ayuda')
    expect(sendLine).not.toHaveBeenCalled() // no game command
    expect(sendCanonical).not.toHaveBeenCalled()
  })

  it('en "help" IS intercepted too — Zork has no native help; shows the English block, no game command', async () => {
    const engine = new FakeLlmEngine({ default: 'X' }) // never reached
    const setNotice = vi.fn()
    const sendLine = vi.fn()
    const sendCanonical = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: on('en', 'grammar'),
      setNotice,
      sendLine,
      sendCanonical,
      demote: vi.fn(),
      educatedRef: { current: false },
    })
    expect(await t('help')).toBeNull()
    const block = setNotice.mock.calls.at(-1)?.[0] as string
    expect(block.toLowerCase()).toContain('help')
    expect(sendLine).not.toHaveBeenCalled() // does NOT reach the Z-parser
    expect(sendCanonical).not.toHaveBeenCalled()
  })

  describe('§5.5 ka English-ASCII raw-send on miss', () => {
    // Both tests use createTranslate directly (not makeTranslate) with the real
    // ka lexicon + ZORK1_VOCAB, same pattern as the C2 queue-drain test above.
    // makeTranslate uses TEST_VOCAB, which lacks the ka noun resolvers that
    // guarantee the test input actually reaches Stage 8 as a genuine miss.

    function makeKaZork1Translate(opts: {
      setNotice: TranslateDeps['setNotice']
      sendLine: (text: string) => void
    }): (line: string) => Promise<string | null> {
      const engine = new FakeLlmEngine({ default: 'X' }) // never reached
      const internalOn: Internal & { phase: 'on' } = {
        phase: 'on',
        language: 'ka',
        model: 'grammar',
      }
      const kaLex: Lex = {
        core: coreLexicon('ka'),
        nouns: nounLexicon('ka', ZORK1_SIG),
        words: lexiconWordSet('ka', ZORK1_SIG),
      }
      const liveRef = { current: { internal: internalOn, lex: kaLex } }
      const generateRaw = createGenerateRaw({
        engine,
        watchdogMs: 1000,
        engineGate: new EngineGate(),
      })
      const deps: TranslateDeps = {
        internal: internalOn,
        vocab: ZORK1_VOCAB,
        grammar: buildGrammar(ZORK1_VOCAB),
        generateRaw,
        watchdogMs: 1000,
        getContext: () => ({ location: '', recentOutput: '' }),
        echoLocal: () => {},
        sendLine: opts.sendLine,
        sendCanonical: () => {},
        awaitTurn: async () => ({ view: emptyView, reason: 'line' as const }),
        refs: {
          trackerRef: { current: new TextSceneTracker(ZORK1_VOCAB) },
          translatingRef: { current: false },
          queueRef: { current: [] },
          queueIdRef: { current: 0 },
          lastCommandRef: { current: null },
          inSequenceRef: { current: false },
          epochRef: { current: 0 },
          liveRef,
          educatedRef: { current: false },
        },
        demote: vi.fn(),
        setPending: () => {},
        setNotice: opts.setNotice,
        syncQueue: () => {},
      }
      return createTranslate(deps)
    }

    it('a missed ASCII (English) line raw-sends to the engine, like en', async () => {
      // ka, Zork I, grammar-only. 'frobnate' is NOT in ZORK1_VOCAB (not a vocab
      // passthrough), not a meta command, not a direction, not in the ka core/noun
      // lexicon — so it flows through stages 3–6 as a miss, hits stage 7 which
      // abstains (grammar-only), and reaches Stage 8 with done===0. Before §5.5
      // this ka non-English-arm abstained; after §5.5 it raw-sends like 'en'.
      const setNotice = vi.fn()
      const sendLine = vi.fn()
      const t = makeKaZork1Translate({ setNotice, sendLine })
      await t('frobnate')
      // The ASCII miss must raw-send the line to the engine.
      expect(sendLine).toHaveBeenCalledWith('frobnate')
      // No couldntTranslate / grammarOnlyFirstMiss notice must be shown.
      expect(setNotice).not.toHaveBeenCalledWith(grammarOnlyFirstMiss('ka'))
      expect(setNotice).not.toHaveBeenCalledWith(couldntTranslate('ka'))
    })

    it('a missed line containing Georgian abstains (notice, nothing sent)', async () => {
      // 'ბედნიერი' (happy) contains Georgian codepoints and is NOT in the ka
      // verbs or ZORK1_VOCAB noun lexicon — it falls through stages 3–6 as a
      // miss, hits stage 7 (grammar-only → abstain), and reaches Stage 8.
      // Because it contains Georgian it must NOT raw-send; it must show a notice.
      const setNotice = vi.fn()
      const sendLine = vi.fn()
      const t = makeKaZork1Translate({ setNotice, sendLine })
      await t('ბედნიერი')
      // Nothing must have been sent to the engine.
      expect(sendLine).not.toHaveBeenCalled()
      // A grammar-only or couldntTranslate notice must appear.
      const noticeArgs = setNotice.mock.calls.map(c => c[0] as string | null)
      const hasNotice = noticeArgs.some(
        n => n === grammarOnlyFirstMiss('ka') || n === couldntTranslate('ka'),
      )
      expect(hasNotice).toBe(true)
    })
  })
})
