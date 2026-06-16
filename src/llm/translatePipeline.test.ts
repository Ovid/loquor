import { describe, it, expect, vi } from 'vitest'
import { runClause, createGenerateRaw, ModelLoadError } from './translatePipeline'
import type { ClauseDeps, GenerateRaw, Lex } from './translatePipeline'
import type { Vocab } from './grammar/types'
import type { Scene } from './scene/types'
import { buildGrammar } from './grammar/buildGrammar'
import { coreLexicon, nounLexicon, lexiconWordSet } from './lexicon/index'
import { ZORK1_SIG } from './grammar/index'
import { ZORK1_VOCAB } from './grammar/zork1.vocab'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT } from './grammar/patterns'
import { FakeLlmEngine } from './engine.fake'
import { EngineGate } from '../shared/engineGate'

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
    const r = await runClause('open trapdoor', emptyScene, 'en', null, false, deps)
    expect(r.stage).toBe('vocab')
    expect(r.result).toEqual({ kind: 'command', text: 'open trapdoor' })
    expect(generateRaw).not.toHaveBeenCalled()
  })

  it('stage 4 sends the trailing-punctuation-stripped form it gated on ([C])', async () => {
    const { deps, generateRaw } = detDeps()
    const r = await runClause('open trapdoor!', emptyScene, 'en', null, false, deps)
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
    const r = await runClause('ouvre la trappe', emptyScene, 'fr', lex, false, deps)
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
    const r = await runClause('pop the mailbox', emptyScene, 'en', null, false, deps)
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
    const engine = new FakeLlmEngine({ default: '{"verb":"take","noun":"lamp"}' })
    const generateRaw = createGenerateRaw({
      engine,
      watchdogMs: 1000,
      engineGate: new EngineGate(),
    })
    const deps = { vocab: TEST_VOCAB, grammar: 'root ::= "x"', generateRaw, getContext: () => ({ location: '', recentOutput: '' }) }
    // A clause that reaches stage 7 (not a meta/vocab/direction/lexicon hit):
    const { result, stage } = await runClause('frobnicate the gadget', emptyScene, 'fr', null, true, deps)
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
    const deps = { vocab: TEST_VOCAB, grammar: 'root ::= "x"', generateRaw, getContext: () => ({ location: '', recentOutput: '' }) }
    await runClause('frobnicate the gadget', emptyScene, 'fr', null, false, deps)
    expect(engine.generateCalls).toBe(1)
  })
})

describe('createGenerateRaw load vs generate failures', () => {
  it('a lazy-load failure throws ModelLoadError', async () => {
    const engine = new FakeLlmEngine({ failLoad: true }) // not loaded → load() runs and throws
    const g = createGenerateRaw({ engine, watchdogMs: 1000, engineGate: new EngineGate() })
    await expect(g([{ role: 'user', content: 'x' }], 'root ::= "x"')).rejects.toBeInstanceOf(
      ModelLoadError,
    )
  })

  it('a generate failure (model loaded) is NOT a ModelLoadError', async () => {
    const engine = new FakeLlmEngine({ failGenerate: true })
    await engine.load(() => {}, new AbortController().signal) // model resident → skip the load path
    const g = createGenerateRaw({ engine, watchdogMs: 1000, engineGate: new EngineGate() })
    await expect(g([{ role: 'user', content: 'x' }], 'root ::= "x"')).rejects.not.toBeInstanceOf(
      ModelLoadError,
    )
  })
})
