import { describe, it, expect } from 'vitest'
import { viewToContext, buildPrompt } from './prompt'
import { parseCommand } from './inputTranslate'
import { emptyView } from '../glkote-react/types'
import type { ViewState } from '../glkote-react/types'
import type { PromptContext } from './types'
import { ZORK1_VOCAB } from './grammar/zork1.vocab'

const view = (over: Partial<ViewState>): ViewState => ({
  ...emptyView,
  ...over,
})
const ctx = (over: Partial<PromptContext> = {}): PromptContext => ({
  location: 'West of House',
  recentOutput: 'You are standing in an open field.',
  inScope: [],
  antecedent: null,
  ...over,
})

describe('viewToContext', () => {
  it('reads location from status, empty when status is null', () => {
    expect(viewToContext(emptyView).location).toBe('')
    expect(
      viewToContext(view({ status: { location: 'West of House', right: '' } }))
        .location,
    ).toBe('West of House')
  })

  it('recentOutput is the block since the last input line, excluding nl-source', () => {
    const v = view({
      lines: [
        { id: 1, kind: 'output', text: 'old stuff' },
        { id: 2, kind: 'input', text: 'open mailbox' },
        { id: 3, kind: 'nl-source', text: 'grab lantern' },
        {
          id: 4,
          kind: 'output',
          text: 'Opening the mailbox reveals a leaflet.',
        },
      ],
    })
    expect(viewToContext(v).recentOutput).toBe(
      'Opening the mailbox reveals a leaflet.',
    )
  })

  it('boundary resets on an nl-canonical command echo, not only input', () => {
    // Translated-language commands (ka/fr/de/es) are echoed as 'nl-canonical',
    // never 'input'. The recent-output window must reset after one just like it
    // resets after an 'input' line — otherwise a prior turn's disambiguation
    // question lingers in recentOutput and traps the player's next command.
    const v = view({
      lines: [
        {
          id: 1,
          kind: 'output',
          text: 'Which do you mean, the red button or the yellow button?',
        },
        { id: 2, kind: 'output', text: '>' },
        { id: 3, kind: 'nl-source', text: 'ყვითელი ღილაკი' },
        { id: 4, kind: 'nl-canonical', text: 'yellow button' },
        { id: 5, kind: 'output', text: 'Click.' },
      ],
    })
    expect(viewToContext(v).recentOutput).toBe('Click.')
  })

  it('the nl-canonical boundary reset is language-agnostic (fr/de/es, not just ka)', () => {
    // viewToContext takes no language: 'nl-canonical' is the echo kind for EVERY
    // translated language (fr/de/es as well as ka), so the same window reset must
    // fire on a Latin-script translated command. Pinned so a refactor can't quietly
    // narrow the fix to the Georgian test data above.
    const v = view({
      lines: [
        { id: 1, kind: 'output', text: 'Quel bouton, le rouge ou le jaune ?' },
        { id: 2, kind: 'output', text: '>' },
        { id: 3, kind: 'nl-source', text: 'appuie sur le bouton jaune' },
        { id: 4, kind: 'nl-canonical', text: 'press yellow button' },
        { id: 5, kind: 'output', text: 'Clic.' },
      ],
    })
    expect(viewToContext(v).recentOutput).toBe('Clic.')
  })

  it('caps recentOutput to the tail at 1500 chars', () => {
    const big = 'x'.repeat(2000)
    const out = viewToContext(
      view({ lines: [{ id: 1, kind: 'output', text: big }] }),
    ).recentOutput
    expect(out.length).toBe(1500)
    expect(out.endsWith('x')).toBe(true)
  })
})

describe('buildPrompt', () => {
  it('emits system first, player input LAST, and includes the abstain instruction', () => {
    const msgs = buildPrompt('grab the lantern', ctx(), ZORK1_VOCAB, 'en')
    expect(msgs[0].role).toBe('system')
    expect(msgs[msgs.length - 1]).toEqual({
      role: 'user',
      content: 'grab the lantern',
    })
    expect(msgs[0].content).toContain('__UNKNOWN__')
  })

  it('lists in-scope objects and the antecedent when present', () => {
    const msgs = buildPrompt(
      'take it',
      ctx({ inScope: ['mailbox', 'leaflet'], antecedent: 'leaflet' }),
      ZORK1_VOCAB,
      'en',
    )
    expect(msgs[0].content).toContain('mailbox')
    // The canonical 'leaflet' is rendered in its EMIT form (see the emit-form
    // hint test below) — but the hint lines themselves must be present.
    expect(msgs[0].content).toContain('advertisement')
    expect(msgs[0].content.toLowerCase()).toContain('most recently mentioned')
  })

  it('renders hint lines in emit forms — the only nouns the grammar can produce', () => {
    // The grammar only accepts emit forms (buildGrammar maps n.emit, parseCommand
    // rejects everything else), so a hint naming the canonical 'leaflet' or
    // 'hand-held air pump' would steer the model toward unproducible outputs.
    const msgs = buildPrompt(
      'take it',
      ctx({ inScope: ['hand-held air pump'], antecedent: 'leaflet' }),
      ZORK1_VOCAB,
      'en',
    )
    const sys = msgs[0].content
    expect(sys).toContain('advertisement')
    expect(sys).toContain('pump')
    expect(sys).not.toContain('leaflet')
    expect(sys).not.toContain('hand-held air pump')
  })

  it('instructs the model to keep the player’s verb and only map the pronoun', () => {
    // Directly targets the observed bug: "take it" was becoming "open mailbox".
    const msgs = buildPrompt(
      'take it',
      ctx({ inScope: ['mailbox', 'leaflet'], antecedent: 'leaflet' }),
      ZORK1_VOCAB,
      'en',
    )
    const sys = msgs[0].content
    expect(sys.toLowerCase()).toContain('verb')
    expect(sys).toMatch(/never swap it for a different action/i)
  })

  it('lists a bounded common-verb core, not the full extracted verb set', () => {
    const msgs = buildPrompt('open it', ctx(), ZORK1_VOCAB, 'en')
    const sys = msgs[0].content
    expect(sys).toContain('take') // a core verb
    expect(sys).toContain('examine') // a core verb
    // 'incant' is in ZORK1_VOCAB.verbsOnly (ungated <SYNTAX INCANT>) but is NOT
    // in the prompt core — proves the prompt list is decoupled from the grammar.
    expect(ZORK1_VOCAB.verbsOnly).toContain('incant')
    expect(sys).not.toContain('incant')
  })
})

describe('buildPrompt — movement & verb guidance (H1 movement-translation fix)', () => {
  // The prompt previously enumerated in-scope OBJECTS but never the verbs or the
  // movement directions, so the 1.5B model mapped "go"/"allez" onto the transitive
  // verb "move" and the grammar then forced an in-scope object ("move door"). The
  // experiment (experiment.ts) proved that telling the model directions are verbs,
  // listing the verbs, and stating move ≠ travel fixes every movement case on the
  // SAME model. These tests lock that guidance in. Built from vocab so II/III inherit.

  it('enumerates the movement directions and frames a direction as a verb', () => {
    const msgs = buildPrompt(
      'allez au sud',
      ctx({ inScope: [] }),
      ZORK1_VOCAB,
      'fr',
    )
    const sys = msgs[0].content.toLowerCase()
    expect(sys).toContain('northeast') // a distinctive direction from vocab.movement
    expect(sys).toContain('direction') // framed as "a direction IS the verb"
  })

  it('lists the allowed action verbs so the model knows what it may emit', () => {
    const msgs = buildPrompt(
      'go south',
      ctx({ inScope: ['mailbox'] }),
      ZORK1_VOCAB,
      'en',
    )
    expect(msgs[0].content).toContain('push') // a distinctive verb from vocab.verbs1
  })

  it('warns that "move" is shoving an object, not travelling (the move-door attractor)', () => {
    const msgs = buildPrompt(
      'allez au sud',
      ctx({ inScope: ['door'] }),
      ZORK1_VOCAB,
      'fr',
    )
    expect(msgs[0].content.toLowerCase()).toContain('change rooms')
  })
})

describe('buildPrompt (NL v2 §7)', () => {
  const c = ctx({
    recentOutput: '',
    inScope: ['small mailbox'],
    antecedent: 'leaflet',
  })

  it('scope is a hint, never a constraint', () => {
    const sys = buildPrompt('x', c, ZORK1_VOCAB, 'en')[0].content
    expect(sys).toContain('Objects present or carried')
    expect(sys).not.toMatch(/only name these|only these objects/i)
  })

  it('instructs literal translation, no re-planning', () => {
    const sys = buildPrompt('x', c, ZORK1_VOCAB, 'en')[0].content
    expect(sys).toMatch(/Never substitute a different action/i)
    expect(sys).toMatch(/Never infer what the player/i)
  })

  it('includes few-shots in the selected language as chat pairs', () => {
    const msgs = buildPrompt('pose la lampe', c, ZORK1_VOCAB, 'fr')
    const users = msgs.filter(m => m.role === 'user')
    const assistants = msgs.filter(m => m.role === 'assistant')
    expect(assistants.length).toBeGreaterThanOrEqual(2)
    expect(users[users.length - 1].content).toBe('pose la lampe') // player input LAST
    // two-object ordering example present (UAT F7)
    expect(assistants.some(m => m.content.includes('"prep"'))).toBe(true)
  })

  it('few-shot assistant turns are valid single-line JSON commands', () => {
    for (const lang of ['en', 'fr', 'de', 'es'] as const)
      for (const m of buildPrompt('x', c, ZORK1_VOCAB, lang))
        if (m.role === 'assistant') {
          expect(m.content).not.toContain('\n')
          const o = JSON.parse(m.content) as { verb?: unknown }
          expect(typeof o.verb).toBe('string')
          // Every few-shot must survive the REAL validator: the grammar only
          // produces emit forms, so a few-shot demonstrating a non-emit noun
          // (e.g. canonical 'leaflet' instead of emit 'advertisement') would be
          // teaching the model an output it can never actually produce.
          expect(parseCommand(m.content, ZORK1_VOCAB)).toMatchObject({
            kind: 'command',
          })
        }
  })

  it('never includes raw recent game output (b14fea1 stays true)', () => {
    const poisoned = ctx({
      inScope: ['small mailbox'],
      antecedent: 'leaflet',
      recentOutput: 'UNIQUE-SENTINEL-XYZ',
    })
    for (const m of buildPrompt('x', poisoned, ZORK1_VOCAB, 'en'))
      expect(m.content).not.toContain('UNIQUE-SENTINEL-XYZ')
  })
})
