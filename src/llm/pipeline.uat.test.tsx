// src/llm/pipeline.uat.test.tsx
// Task 24 (NL v2): UAT regression suite. Every UAT-1/UAT-2 finding
// (notes/uat-1.md, notes/uat-2.md) is pinned HERE — as a CASES row or a
// dedicated it() — or named in a `covered-by:` comment pointing at the suite
// that owns it. Rows run the FULL pipeline (useNaturalLanguage) against REAL
// Zork I data (ZORK1_VOCAB + ZORK1_SIG + the fr lexicons); every expectSent
// noun was verified against the regenerated vocab's emit fields, never guessed.
//
// ── FINDING-ID COVERAGE TABLE ────────────────────────────────────────────────
// UAT-1 (French black-box, 2026-06-08):
//   F1  → rows (pose le dépliant → drop advertisement; lexicon drop-verbs)
//   F2  → covered-by: useNaturalLanguage.test.tsx compound stop/continue tests
//         + translate.test.ts 'clauseFailed' (absence scoped to acted object)
//   F3  → rows F3 / F3-EN (shared 'window' dictionary word; stage-4 passthrough)
//   F4  → rows (prends/ramasse la lampe → take light; lexicon)
//   F5  → row (inventaire → inventory; core metaAliases)
//   F6  → row ($verify routed raw; $-prefix meta)
//   F7  → row (tue le troll avec l'épée → attack troll with sword; lexicon)
//   F8  → rows fr 'va au sud-est' (direction stage) + en 'southeast' (stage 4)
//   F9  → row (attache la corde à la rampe → tie rope to railing; lexicon —
//         data fix this task: 'rampe' added to fr.zork1 'wooden railing')
//   F10 → row (restart routed raw) + covered-by: useNaturalLanguage.test.tsx
//         'a bare meta-command (restart) bypasses the model'
//   R1  → covered-by: grammar/vocab-invariants.test.ts 'no parser
//         pseudo-objects leak into nouns (R1 phantom-scope fix)'
//   R2  → covered-by: prompt.test.ts (NL v2 §7 literal-translation instruction
//         + few-shots); the F7 row also kills the swap deterministically
//   R3  → covered-by: useNaturalLanguage.test.tsx hard-refusal /
//         room-change-absence compound tests + translate.test.ts 'clauseFailed'
//   R4  → raw-JSON confirmations of F1/F3/F4/F9 — pinned by those rows
//   OBS-save / OBS-autosave → storage behavior, outside the NL pipeline
// UAT-2 (FR/DE/ES to Score 272, 2026-06-09):
//   O1   → by design: nl-source echo is UI-only; covered-by: ui/Scrollback.test.tsx
//   F-A  → covered-by: useNaturalLanguage.test.tsx 'input queue (NL v2 §11, F-A)'
//   F-B  → covered-by: hook compound tests; F-D/F-P it()s re-pin on real data
//   F-C  → row (decends typo → LLM path → down; not a deterministic stage)
//   F-D  → dedicated it() (4-clause compound runs ALL clauses)
//   F-E  → row with antecedent seed (mets le tableau dedans → put painting in
//         case); guard also covered-by: lexicon/parse.test.ts F-E test
//   F-F  → row (ouvre la trappe → open trapdoor; also the F-F-variant)
//   F-G  → covered-by: useNaturalLanguage.test.tsx 'a soft no-op … does NOT
//         stop the sequence (F-G)'
//   F-H  → row + 'stage 4 beats the LLM' precedence test
//   F-I  → dedicated it() (language off → verbatim passthrough)
//   F-J  → row ($VERIFY verbatim)
//   F-K  → covered-by: useNaturalLanguage.test.tsx restart-meta + confirmation
//         and disambiguation prompt-bypass tests
//   F-L  → row (éteins la lampe → extinguish light, never the torch)
//   F-M  → row (pose la lampe → drop light, never take)
//   F-N  → rows (agite/secoue le sceptre → wave sceptre, never take)
//   F-O  → row (EN 'wave sceptre' — LLM identity path: 'sceptre' is an
//         emit/canonical word, not a stage-4 dictionary word)
//   F-P  → dedicated it() (intra-compound: l'or binds pot of gold, not coffin)
//   F-Q  → rows fr 'lâche le cercueil' + EN 'drop coffin' (stage 4)
//   F-R  → rows (non-EN abstain sends NOTHING + notice; 'sors du bateau' is
//         now deterministic 'exit boat')
//   F-S  → row (2-object-conjunction put: abstains visibly, nothing sent)
//   F-T  → rows fr 'mets le cercueil dans la vitrine' + EN 'put coffin in case'
//   F-U  → rows (diagnostic → diagnose; examine-moi → examine me)
//   F-V  → rows with wrench-in-scope seed (clé → wrench via scope preference)
//   F-W  → row (appuie sur le bouton jaune → push yellow button)
//   F-X  → row (sonne la cloche → ring bell; shared 'bell' dictionary word)
//   F-Y  → row (allume la lanterne → light light; lanterne = the lantern,
//         whose emit form is 'light' — never the painting)
//   F-Z  → row (prends la pompe → take pump, the emit form, never the DESC);
//         emit construction covered-by: vocab-invariants 'emit forms (F-Z)'
//   F-AA → row (creuse le sable avec la pelle → dig sand with shovel) +
//         covered-by: scene/tracker.test.ts 'NL v2 §8 — scope demoted (F-AA/F-T)'
//   F-BB → rows ('ulysses' stage-4 passthrough; French 'Ulysse' is NOT mapped —
//         abstains with a notice instead of UAT's bogus 'look')
//   F-CC → row (remonte le canari → wind up canary)
//   F-DD → rows ('écho' via the folding lexicon; 'echo' via stage 4)
// ─────────────────────────────────────────────────────────────────────────────
//
// HARNESS NOTE: scaffolding (viewState builder, turnScript, renderHook setup)
// is duplicated from useNaturalLanguage.test.tsx rather than extracted into a
// shared testHarness.tsx — the hook suite's setup() is interwoven with its own
// TEST_VOCAB/override patterns, so extraction would churn ~40 passing tests
// for two small helpers.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNaturalLanguage } from './useNaturalLanguage'
import { FakeLlmEngine } from './engine.fake'
import type { CapabilityResult, NlLanguage, ViewContext } from './types'
import { emptyView } from '../glkote-react/types'
import type { ViewState, BufferLine, TurnResult } from '../glkote-react/types'
import { ZORK1_SIG } from './grammar/index'
import { ZORK1_VOCAB } from './grammar/zork1.vocab'

const capable: CapabilityResult = { tier: 'small', reasons: [] }

interface Seed {
  location: string
  outputText: string
}

interface UatCase {
  finding: string
  language: Exclude<NlLanguage, 'off'>
  input: string
  /** Scene seeding (observe calls) before the input, when the finding needs it. */
  seed?: Seed[]
  /** What must reach the VM (sendLine arg), or null for notice-only. */
  expectSent: string | null
  /** May the LLM be consulted? false = deterministic stages must catch it. */
  llmAllowed: boolean
  /** Scripted completion when llmAllowed (keyed by the clause text). */
  completions?: Record<string, string>
}

/** Synthetic turn-boundary ViewState so seeds flow through the real observe(). */
function viewFor(s: Seed): ViewState {
  return {
    ...emptyView,
    status: { location: s.location, right: '' },
    lines: [{ id: 1, kind: 'output', text: s.outputText }],
    nextId: 2,
  }
}

function viewState(
  location: string,
  outputs: string[],
  lastInput?: string,
): ViewState {
  const lines: BufferLine[] = []
  let id = 1
  if (lastInput) lines.push({ id: id++, kind: 'input', text: lastInput })
  for (const o of outputs) lines.push({ id: id++, kind: 'output', text: o })
  return { ...emptyView, status: { location, right: '' }, lines, nextId: id }
}

/** An awaitTurn that returns the given views in order (last one repeats). */
function turnScript(views: ViewState[]): () => Promise<TurnResult> {
  let i = 0
  return async () => ({
    view: views[Math.min(i++, views.length - 1)],
    reason: 'line' as const,
  })
}

async function renderPipeline(opts: {
  language: NlLanguage
  completions?: Record<string, string>
  /** Engine default completion (unscripted clauses). Defaults to abstain. */
  defaultCompletion?: string
  awaitTurn?: () => Promise<TurnResult>
  getContext?: () => ViewContext
}) {
  const engine = new FakeLlmEngine({
    cached: true,
    completions: opts.completions,
    default: opts.defaultCompletion ?? '{"verb":"__UNKNOWN__"}',
  })
  const sent: string[] = []
  const echoLocal = vi.fn()
  const hook = renderHook(() =>
    useNaturalLanguage({
      engine,
      capability: capable,
      vocab: ZORK1_VOCAB,
      getContext:
        opts.getContext ??
        (() => ({ location: 'West of House', recentOutput: '' })),
      echoLocal,
      sendLine: (t: string) => {
        sent.push(t)
      },
      awaitTurn:
        opts.awaitTurn ??
        (async () => ({ view: emptyView, reason: 'line' as const })),
      watchdogMs: 5000,
      signature: ZORK1_SIG,
    }),
  )
  // Wait for the async isCached() probe before setLanguage, or the call races
  // it and takes the download-modal branch (see the hook suite's note).
  await waitFor(() =>
    expect(hook.result.current.state).toEqual({
      phase: 'off',
      installed: true,
    }),
  )
  if (opts.language !== 'off') {
    act(() => hook.result.current.setLanguage(opts.language))
    expect(hook.result.current.state).toEqual({
      phase: 'on',
      language: opts.language,
    })
  }
  return { hook, engine, sent, echoLocal }
}

// Scene seeds (observe() text → tracker scope/antecedent, spec §8).
const WRENCH_SEED: Seed = {
  location: 'Maintenance Room',
  outputText: 'There is a wrench here.',
}
const CASE_OPEN_SEED: Seed = {
  location: 'Living Room',
  outputText: 'The trophy case is now open.',
}

// expectSent values are REAL emit forms (zork1.vocab.ts, generated):
//   brass lantern → 'light' · trap door → 'trapdoor' · gold coffin → 'coffin'
//   trophy case → 'case' · leaflet → 'advertisement' · pot of gold → 'pot'
//   wooden railing → 'railing' · hand-held air pump → 'pump'
//   shared dictionary words (ambiguous fr nouns): cloche → 'bell',
//   canari → 'canary', fenêtre → 'window', couteau → 'knife', bateau → 'boat'.
const CASES: UatCase[] = [
  // ── wrong-verb / wrong-object snap class: now deterministic lexicon ──
  {
    finding: 'F1 (poser→read + noun snap)',
    language: 'fr',
    input: 'pose le dépliant',
    expectSent: 'drop advertisement', // leaflet's emit is 'advertisement', not 'leaflet'
    llmAllowed: false,
  },
  {
    finding: 'F3 (fenêtre → boarded window)',
    language: 'fr',
    input: 'ouvre la fenêtre',
    // 2 candidates (boarded/kitchen window) share dictionary word 'window':
    // emit the generic word and let the Z-parser disambiguate by room.
    expectSent: 'open window',
    llmAllowed: false,
  },
  {
    finding: 'F3-EN (valid English corrupted)',
    language: 'en',
    input: 'open window',
    expectSent: 'open window', // stage-4 passthrough: sent as typed
    llmAllowed: false,
  },
  {
    finding: 'F4 (prendre la lampe → turn on)',
    language: 'fr',
    input: 'prends la lampe',
    expectSent: 'take light', // brass lantern's emit is 'light'
    llmAllowed: false,
  },
  {
    finding: 'F4 (ramasser la lampe → open)',
    language: 'fr',
    input: 'ramasse la lampe',
    expectSent: 'take light',
    llmAllowed: false,
  },
  {
    finding: 'F7 (tue X avec Y role swap)',
    language: 'fr',
    input: "tue le troll avec l'épée",
    expectSent: 'attack troll with sword',
    llmAllowed: false,
  },
  {
    finding: 'F9 (tie → climb, rope dropped)',
    language: 'fr',
    input: 'attache la corde à la rampe',
    expectSent: 'tie rope to railing', // wooden railing's emit is 'railing'
    llmAllowed: false,
  },
  // ── localized meta (core metaAliases) ──
  {
    finding: 'F5 (inventaire → look)',
    language: 'fr',
    input: 'inventaire',
    expectSent: 'inventory',
    llmAllowed: false,
  },
  {
    finding: 'F-U (diagnostic → examine <salient>)',
    language: 'fr',
    input: 'diagnostic',
    expectSent: 'diagnose',
    llmAllowed: false,
  },
  {
    finding: 'F-U (examine-moi → examine <salient>)',
    language: 'fr',
    input: 'examine-moi',
    expectSent: 'examine me', // self pronoun, lexicon stage
    llmAllowed: false,
  },
  // ── meta / $-debug routed raw ──
  {
    finding: 'F6 ($verify leaked to the LLM)',
    language: 'en',
    input: '$verify',
    expectSent: '$verify',
    llmAllowed: false,
  },
  {
    finding: 'F-J ($VERIFY verbatim)',
    language: 'en',
    input: '$VERIFY',
    expectSent: '$VERIFY',
    llmAllowed: false,
  },
  {
    finding: 'F10 (restart swallowed)',
    language: 'en',
    input: 'restart',
    expectSent: 'restart',
    llmAllowed: false,
  },
  // ── diagonal directions (F8) — direction stage / stage-4 ──
  {
    finding: 'F8 (sud-est → south)',
    language: 'fr',
    input: 'va au sud-est',
    expectSent: 'southeast',
    llmAllowed: false,
  },
  {
    finding: 'F8-EN (southeast → move random object)',
    language: 'en',
    input: 'southeast',
    expectSent: 'southeast',
    llmAllowed: false,
  },
  // ── re-planning over literal intent: stage-4 passthrough kills it ──
  {
    finding: 'F-H (open trap door → down)',
    language: 'en',
    input: 'open trap door',
    expectSent: 'open trap door',
    llmAllowed: false,
  },
  {
    finding: 'F-F (trappe → trophy case / nasty knife)',
    language: 'fr',
    input: 'ouvre la trappe',
    expectSent: 'open trapdoor', // trap door's emit is 'trapdoor'
    llmAllowed: false,
  },
  {
    finding: 'F-Q (lâche le cercueil → down)',
    language: 'fr',
    input: 'lâche le cercueil',
    expectSent: 'drop coffin', // gold coffin's emit is 'coffin'
    llmAllowed: false,
  },
  {
    finding: 'F-Q-EN (drop coffin → down)',
    language: 'en',
    input: 'drop coffin',
    expectSent: 'drop coffin',
    llmAllowed: false,
  },
  // ── verb mis-maps: now core-lexicon data ──
  {
    finding: 'F-M (pose → take, the inverse)',
    language: 'fr',
    input: 'pose la lampe',
    expectSent: 'drop light',
    llmAllowed: false,
  },
  {
    finding: 'F-N (agite → take)',
    language: 'fr',
    input: 'agite le sceptre',
    expectSent: 'wave sceptre',
    llmAllowed: false,
  },
  {
    finding: 'F-N (secoue → take)',
    language: 'fr',
    input: 'secoue le sceptre',
    expectSent: 'wave sceptre',
    llmAllowed: false,
  },
  {
    finding: 'F-X (sonne → turn on)',
    language: 'fr',
    input: 'sonne la cloche',
    expectSent: 'ring bell', // brass bell / red hot brass bell share 'bell'
    llmAllowed: false,
  },
  {
    finding: 'F-CC (remonte → climb)',
    language: 'fr',
    input: 'remonte le canari',
    expectSent: 'wind up canary', // both canaries share dictionary word 'canary'
    llmAllowed: false,
  },
  {
    finding: 'F-L (lampe → torch)',
    language: 'fr',
    input: 'éteins la lampe',
    expectSent: 'extinguish light', // the lantern, never the torch
    llmAllowed: false,
  },
  {
    finding: 'F-Y (allume la lanterne → light painting)',
    language: 'fr',
    input: 'allume la lanterne',
    // verb 'light' + the lantern's emit form 'light' — odd-looking but both
    // are parser dictionary words; the point is it can never be the painting.
    expectSent: 'light light',
    llmAllowed: false,
  },
  // ── banking / container commands (scope gap class) ──
  {
    finding:
      'F-T (mets le cercueil dans la vitrine → put nasty knife in painting)',
    language: 'fr',
    input: 'mets le cercueil dans la vitrine',
    expectSent: 'put coffin in case', // trophy case's emit is 'case'
    llmAllowed: false,
  },
  {
    finding: 'F-T-EN (put coffin in case → put nasty knife in nasty knife)',
    language: 'en',
    input: 'put coffin in case',
    expectSent: 'put coffin in case',
    llmAllowed: false,
  },
  {
    finding: 'F-E (dedans → put painting in painting)',
    language: 'fr',
    input: 'mets le tableau dedans',
    seed: [CASE_OPEN_SEED], // antecedent: 'trophy case'
    expectSent: 'put painting in case',
    llmAllowed: false,
  },
  {
    finding: 'F-S (2-object conjunction put → take nasty knife ×2)',
    language: 'fr',
    input: 'mets le cercueil et le sceptre dans la vitrine',
    // 'et' splits the clauses mid-noun-phrase; neither half is deterministic
    // and the model abstains → nothing sent, visible notice. Pinned because
    // UAT saw TWO wrong takes silently burn turns.
    expectSent: null,
    llmAllowed: true,
  },
  // ── scope-dependent noun binding (seeded scenes) ──
  {
    finding: 'F-V (clé → matchbook, wrench in scope)',
    language: 'fr',
    input: 'prends la clé',
    seed: [WRENCH_SEED],
    expectSent: 'take wrench', // scope preference resolves clé (key/wrench)
    llmAllowed: false,
  },
  {
    finding: 'F-V (tourne le boulon avec la clé → abstain)',
    language: 'fr',
    input: 'tourne le boulon avec la clé',
    seed: [WRENCH_SEED],
    expectSent: 'turn bolt with wrench',
    llmAllowed: false,
  },
  {
    finding: 'F-W (bouton jaune → push matchbook)',
    language: 'fr',
    input: 'appuie sur le bouton jaune',
    expectSent: 'push yellow button',
    llmAllowed: false,
  },
  {
    finding: 'F-AA (creuse le sable → dig shovel with screwdriver)',
    language: 'fr',
    input: 'creuse le sable avec la pelle',
    expectSent: 'dig sand with shovel',
    llmAllowed: false,
  },
  {
    finding: 'F-Z (pompe → full DESC rejected by the parser)',
    language: 'fr',
    input: 'prends la pompe',
    expectSent: 'take pump', // emit form, never 'hand-held air pump'
    llmAllowed: false,
  },
  // ── abstain policy (F-R): non-EN abstain sends NOTHING ──
  {
    finding: 'F-R (abstain leaked raw French)',
    language: 'fr',
    input: 'gonfle le radeau magique en plastique',
    expectSent: null, // notice only — no "I don't know the word gonfle" turn
    llmAllowed: true,
  },
  {
    finding: 'F-R (sors du bateau → abstain leak)',
    language: 'fr',
    input: 'sors du bateau',
    expectSent: 'exit boat', // now deterministic: both boats share 'boat'
    llmAllowed: false,
  },
  // ── magic words: stage-4 bare-vocab passthrough ──
  {
    finding: 'F-BB (Ulysse → look)',
    language: 'fr',
    input: 'ulysses',
    expectSent: 'ulysses',
    llmAllowed: false,
  },
  {
    finding: 'F-BB (French spelling still unmapped)',
    language: 'fr',
    input: 'Ulysse',
    // Not vocab, not lexicon → the model abstains → notice, nothing sent.
    // Strictly better than UAT's bogus 'look'; mapping 'Ulysse' is future data.
    expectSent: null,
    llmAllowed: true,
  },
  {
    finding: 'F-DD (écho → examine brass bell)',
    language: 'fr',
    input: 'écho',
    expectSent: 'echo', // lexicon folds the accent; 'echo' is a vocab verb
    llmAllowed: false,
  },
  {
    finding: 'F-DD (bare echo passthrough)',
    language: 'fr',
    input: 'echo',
    expectSent: 'echo', // stage-4: already a parser word
    llmAllowed: false,
  },
  // ── typo robustness stays on the LLM path (F-C is a PASS to preserve) ──
  {
    finding: 'F-C (decends typo)',
    language: 'fr',
    input: 'decends',
    expectSent: 'down',
    llmAllowed: true, // not a deterministic stage — the model absorbs typos
    completions: { decends: '{"verb":"down"}' },
  },
  // ── F-O: EN identity translation for an emit-only word ──
  {
    finding: 'F-O (wave sceptre EN fallback)',
    language: 'en',
    input: 'wave sceptre',
    // 'sceptre' is the noun's canonical/emit, not a stage-4 dictionary word
    // (synonyms are 'scepter'/'treasure'), so this goes through the LLM —
    // pinned so the identity path keeps working for the wave puzzle.
    expectSent: 'wave sceptre',
    llmAllowed: true,
    completions: { 'wave sceptre': '{"verb":"wave","object":"sceptre"}' },
  },
]

describe('UAT regression rows (pipeline-level, real Zork I data)', () => {
  beforeEach(() => localStorage.clear())

  describe.each(CASES)('UAT $finding', c => {
    it(`${c.input} → ${c.expectSent ?? '(notice, nothing sent)'}`, async () => {
      const { hook, engine, sent } = await renderPipeline({
        language: c.language,
        completions: c.completions,
      })
      for (const s of c.seed ?? [])
        act(() => hook.result.current.observe(viewFor(s)))
      await act(async () => {
        await hook.result.current.translate(c.input)
      })
      if (c.expectSent === null) {
        expect(sent).toEqual([]) // F-R policy: no raw foreign leak, no turn burned
        expect(hook.result.current.notice).toMatch(/couldn.t translate/i)
      } else {
        expect(sent.at(-1)).toBe(c.expectSent)
      }
      if (!c.llmAllowed) expect(engine.generateCalls).toBe(0)
    })
  })
})

describe('UAT compound regressions (dedicated)', () => {
  beforeEach(() => localStorage.clear())

  it('F-D: a 4-clause compound runs ALL clauses — no silent middle-clause drop', async () => {
    const views = [
      viewState('Living Room', ['Opened.'], 'open case'),
      viewState('Living Room', ['Done.'], 'put painting in case'),
      viewState('Living Room', ['Dropped.'], 'drop knife'),
      viewState('Living Room', ['Taken.'], 'take sword'),
    ]
    const { hook, engine, sent } = await renderPipeline({
      language: 'fr',
      awaitTurn: turnScript(views),
    })
    await act(async () => {
      await hook.result.current.translate(
        'ouvre la vitrine puis mets le tableau dans la vitrine puis ' +
          "lâche le couteau puis prends l'épée",
      )
    })
    expect(sent).toEqual([
      'open case',
      'put painting in case',
      'drop knife', // both knives share dictionary word 'knife'
      'take sword',
    ])
    expect(engine.generateCalls).toBe(0)
    expect(hook.result.current.notice).toBeNull() // no "Ran N of M actions."
  })

  it("F-P: clause 2's l'or binds the pot of gold, not clause 1's coffin", async () => {
    const views = [
      viewState('End of Rainbow', ['Dropped.'], 'drop coffin'),
      viewState('End of Rainbow', ['Taken.'], 'take pot'),
    ]
    const { hook, engine, sent } = await renderPipeline({
      language: 'fr',
      awaitTurn: turnScript(views),
    })
    await act(async () => {
      await hook.result.current.translate("lâche le cercueil et prends l'or")
    })
    // pot of gold's emit is 'pot' — NOT 'gold coffin' (the UAT mis-binding).
    expect(sent).toEqual(['drop coffin', 'take pot'])
    expect(engine.generateCalls).toBe(0)
    expect(hook.result.current.notice).toBeNull()
  })

  it('F-I: language off → verbatim passthrough, the model never runs', async () => {
    const { hook, engine, sent } = await renderPipeline({ language: 'off' })
    await act(async () => {
      await hook.result.current.translate('ouvre la trappe')
    })
    expect(sent).toEqual(['ouvre la trappe'])
    expect(engine.generateCalls).toBe(0)
  })
})

// Each test picks inputs where the LOSING stage would produce a DIFFERENT
// send, so the precedence is observable — not just "same text, fewer calls".
describe('stage precedence (spec §14)', () => {
  beforeEach(() => localStorage.clear())

  it('stage 1 beats stage 2: a mid-prompt reply goes raw EVEN quoted (quotes kept)', async () => {
    const { hook, engine, sent } = await renderPipeline({
      language: 'fr',
      getContext: () => ({
        location: '',
        recentOutput: 'Do you wish to restart? (Y is affirmative): ',
      }),
    })
    await act(async () => {
      await hook.result.current.translate('"inventaire"')
    })
    // Unquote would send `inventaire`; the alias would send `inventory`.
    // The interactive prompt wins: the literal line, quotes and all.
    expect(sent).toEqual(['"inventaire"'])
    expect(engine.generateCalls).toBe(0)
  })

  it('stage 2 beats stage 3: quoted "inventaire" goes raw; unquoted it aliases', async () => {
    const { hook, engine, sent } = await renderPipeline({ language: 'fr' })
    await act(async () => {
      await hook.result.current.translate('"inventaire"')
    })
    expect(sent).toEqual(['inventaire']) // raw French — the Z-parser's problem
    await act(async () => {
      await hook.result.current.translate('inventaire')
    })
    expect(sent).toEqual(['inventaire', 'inventory']) // alias stage, no quotes
    expect(engine.generateCalls).toBe(0)
  })

  it('stage 3 meta beats the LLM: bare "save" is never translated', async () => {
    const { hook, engine, sent } = await renderPipeline({
      language: 'en',
      defaultCompletion: '{"verb":"look"}', // the LLM would send 'look'
    })
    await act(async () => {
      await hook.result.current.translate('save')
    })
    expect(sent).toEqual(['save'])
    expect(engine.generateCalls).toBe(0)
  })

  it('stage 4 beats the LLM: all-vocab English is sent as typed even when the model would re-plan it (F-H)', async () => {
    const { hook, engine, sent } = await renderPipeline({
      language: 'en',
      // Script the EXACT F-H corruption: the poisoned model "helpfully"
      // replaces the literal open with a move. It must never be consulted.
      completions: { 'open trap door': '{"verb":"down"}' },
    })
    await act(async () => {
      await hook.result.current.translate('open trap door')
    })
    expect(sent).toEqual(['open trap door'])
    expect(engine.generateCalls).toBe(0)
  })

  it('stage 5 direction beats the LLM: va au sud → south without generate', async () => {
    const { hook, engine, sent } = await renderPipeline({
      language: 'fr',
      completions: { 'va au sud': '{"verb":"look"}' }, // the LLM would say 'look'
    })
    await act(async () => {
      await hook.result.current.translate('va au sud')
    })
    expect(sent).toEqual(['south'])
    expect(engine.generateCalls).toBe(0)
  })

  it('stage 6 lexicon beats the LLM: parseable French never reaches generate', async () => {
    const { hook, engine, sent } = await renderPipeline({
      language: 'fr',
      completions: {
        'ouvre la trappe': '{"verb":"close","object":"trapdoor"}',
      },
    })
    await act(async () => {
      await hook.result.current.translate('ouvre la trappe')
    })
    expect(sent).toEqual(['open trapdoor']) // the lexicon's open, not the LLM's close
    expect(engine.generateCalls).toBe(0)
  })
})
