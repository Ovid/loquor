import { describe, it, expect } from 'vitest'
import { reduceScene, TextSceneTracker } from './tracker'
import { emptySceneState } from './types'
import type { SceneEvent } from './types'
import type { Vocab } from '../grammar/types'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT } from '../grammar/patterns'

const vocab: Vocab = {
  verbsOnly: ['look', 'inventory'],
  movement: ['north', 'south'],
  verbs1: ['take', 'drop', 'open', 'read', 'turn on'],
  verbs2: ['unlock', 'put'],
  preps: ['with', 'in'],
  nouns: [
    { canonical: 'mailbox', synonyms: ['box'], adjectives: ['small'] },
    { canonical: 'leaflet' },
    { canonical: 'lamp', synonyms: ['lantern'] },
    { canonical: 'trap door', synonyms: ['trapdoor'] },
    { canonical: 'door' },
    { canonical: 'egg' },
    { canonical: 'troll' },
    { canonical: 'case', synonyms: ['trophy case'] },
    { canonical: 'grating' },
    { canonical: 'key' },
    { canonical: 'rug' },
  ],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
}

const ev = (over: Partial<SceneEvent>): SceneEvent => ({
  location: 'West of House',
  outputText: '',
  lastCommand: null,
  ...over,
})

describe('reduceScene — mentions', () => {
  it('a word-boundary noun mention enters scope and sets antecedent', () => {
    const s = reduceScene(
      emptySceneState,
      ev({ outputText: 'Opening the small mailbox reveals a leaflet.' }),
      vocab,
    )
    expect(s.inScope.map(o => o.canonical)).toEqual(['mailbox', 'leaflet'])
    expect(s.antecedent).toBe('leaflet') // newest mention wins
  })

  it('does NOT match a noun embedded in a larger word', () => {
    const s = reduceScene(
      emptySceneState,
      ev({
        outputText: 'A trapdoor is here; the dog begged; you felt controlled.',
      }),
      vocab,
    )
    // "door" must not match "trapdoor"; "egg" not "begged"; "troll" not "controlled".
    // "trapdoor" IS a synonym of trap door, so trap door is legitimately in scope.
    expect(s.inScope.map(o => o.canonical)).toEqual(['trap door'])
  })

  it('absence/negation suppresses a mention', () => {
    const s = reduceScene(
      emptySceneState,
      ev({
        outputText:
          "There is no lamp here. The trophy case is empty. You can't see any troll.",
      }),
      vocab,
    )
    expect(s.inScope.map(o => o.canonical)).toEqual([])
    expect(s.antecedent).toBeNull()
  })
})

describe('reduceScene — antecedent precedence', () => {
  it('tier 1: revealed-in-output beats the acted object', () => {
    const s = reduceScene(
      emptySceneState,
      ev({
        lastCommand: 'open mailbox',
        outputText: 'Opening the mailbox reveals a leaflet.',
      }),
      vocab,
    )
    expect(s.antecedent).toBe('leaflet')
  })

  it('tier 2: acted object becomes antecedent when prose names nothing', () => {
    const prev = reduceScene(
      emptySceneState,
      ev({ outputText: 'A lamp and a rug are here.' }),
      vocab,
    )
    expect(prev.antecedent).toBe('rug')
    const s = reduceScene(
      prev,
      ev({ lastCommand: 'take lamp', outputText: 'Taken.' }),
      vocab,
    )
    expect(s.antecedent).toBe('lamp') // not the stale "rug"
  })

  it('tier 3: prior antecedent carries over when nothing new fires', () => {
    const prev = reduceScene(
      emptySceneState,
      ev({ outputText: 'A lamp is here.' }),
      vocab,
    )
    const s = reduceScene(
      prev,
      ev({ lastCommand: 'read leaflet', outputText: 'How pedestrian.' }),
      vocab,
    )
    // leaflet not in scope → not acted-object; lamp stays the antecedent.
    expect(s.antecedent).toBe('lamp')
  })

  it('a failed action (object suppressed) does NOT become the antecedent', () => {
    const prev = reduceScene(
      emptySceneState,
      ev({ outputText: 'A rug is here.' }),
      vocab,
    )
    const s = reduceScene(
      prev,
      ev({
        lastCommand: 'take lamp',
        outputText: "You can't see any lamp here.",
      }),
      vocab,
    )
    expect(s.antecedent).toBe('rug') // lamp was absent → tier 2 skipped
  })
})

describe('reduceScene — carried + room change', () => {
  it('take marks carried; carried object survives a room change, others drop', () => {
    let s = reduceScene(
      emptySceneState,
      ev({ outputText: 'A lamp and a rug are here.' }),
      vocab,
    )
    s = reduceScene(
      s,
      ev({ lastCommand: 'take lamp', outputText: 'Taken.' }),
      vocab,
    )
    expect(s.inScope.find(o => o.canonical === 'lamp')?.carried).toBe(true)
    s = reduceScene(
      s,
      ev({ location: 'Forest', outputText: 'This is a forest.' }),
      vocab,
    )
    const names = s.inScope.map(o => o.canonical)
    expect(names).toContain('lamp') // carried
    expect(names).not.toContain('rug') // dropped on room change
  })

  it('drop clears carried', () => {
    let s = reduceScene(
      emptySceneState,
      ev({ outputText: 'A lamp is here.' }),
      vocab,
    )
    s = reduceScene(
      s,
      ev({ lastCommand: 'take lamp', outputText: 'Taken.' }),
      vocab,
    )
    s = reduceScene(
      s,
      ev({ lastCommand: 'drop lamp', outputText: 'Dropped.' }),
      vocab,
    )
    expect(s.inScope.find(o => o.canonical === 'lamp')?.carried).toBe(false)
  })

  it('lastCommand null marks nothing carried, even when takeAck matches', () => {
    // This is the consequence of the hook nulling its latch after an abstain: an
    // observed "Taken." with no associated command must not mark anything carried.
    let s = reduceScene(
      emptySceneState,
      ev({ outputText: 'A lamp is here.' }),
      vocab,
    )
    s = reduceScene(s, ev({ lastCommand: null, outputText: 'Taken.' }), vocab)
    expect(s.inScope.find(o => o.canonical === 'lamp')?.carried).toBeUndefined()
  })

  it('room change clears the antecedent unless re-mentioned', () => {
    let s = reduceScene(
      emptySceneState,
      ev({ outputText: 'A lamp is here.' }),
      vocab,
    )
    s = reduceScene(
      s,
      ev({ location: 'Forest', outputText: 'Trees everywhere.' }),
      vocab,
    )
    expect(s.antecedent).toBeNull()
  })
})

describe('reduceScene — idempotency', () => {
  it('re-applying the same event triple is a no-op', () => {
    const e = ev({ lastCommand: 'take lamp', outputText: 'Taken. A lamp.' })
    const once = reduceScene(emptySceneState, e, vocab)
    const twice = reduceScene(once, e, vocab)
    expect(twice).toBe(once) // identical reference — short-circuited
  })
})

describe('TextSceneTracker', () => {
  it('observe/scene round-trips and reset clears', () => {
    const t = new TextSceneTracker(vocab)
    t.observe(ev({ outputText: 'A lamp is here.' }))
    expect(t.scene().antecedent).toBe('lamp')
    expect(t.scene().inScope.map(o => o.canonical)).toEqual(['lamp'])
    t.reset()
    expect(t.scene()).toEqual({ inScope: [], antecedent: null })
  })
})
