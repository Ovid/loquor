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
    trackerRef: { current: new TextSceneTracker(TEST_VOCAB) },
    translatingRef: { current: false },
    queueRef: { current: [] },
    queueIdRef: { current: 0 },
    lastCommandRef: { current: null },
    inSequenceRef: { current: false },
    epochRef: { current: 0 },
    liveRef,
    demote: opts.demote,
    educatedRef: opts.educatedRef,
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
})
