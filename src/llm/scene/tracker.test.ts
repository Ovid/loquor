import { describe, it, expect } from 'vitest'
import { reduceScene, TextSceneTracker } from './tracker'
import { emptySceneState } from './types'
import type { SceneEvent } from './types'
import type { Vocab } from '../grammar/types'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import {
  TAKE_ACK,
  DROP_ACK,
  ABSENCE_PAT,
  FAILURE_PAT,
} from '../grammar/patterns'

const vocab: Vocab = {
  verbsOnly: ['look', 'inventory'],
  movement: ['north', 'south'],
  verbs1: ['take', 'drop', 'open', 'read', 'turn on'],
  verbs2: ['unlock', 'put'],
  preps: ['with', 'in'],
  verbSynonyms: [],
  nouns: [
    {
      canonical: 'mailbox',
      emit: 'mailbox',
      synonyms: ['box'],
      adjectives: ['small'],
    },
    { canonical: 'leaflet', emit: 'leaflet' },
    { canonical: 'lamp', emit: 'lamp', synonyms: ['lantern'] },
    { canonical: 'trap door', emit: 'trapdoor', synonyms: ['trapdoor'] },
    { canonical: 'door', emit: 'door' },
    { canonical: 'egg', emit: 'egg' },
    { canonical: 'troll', emit: 'troll' },
    { canonical: 'case', emit: 'case', synonyms: ['trophy case'] },
    { canonical: 'grating', emit: 'grating' },
    { canonical: 'key', emit: 'key' },
    { canonical: 'rug', emit: 'rug' },
  ],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
  failurePat: FAILURE_PAT,
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
    // ("X is empty" is intentionally NOT an absence — see the BUG I test above.)
    const s = reduceScene(
      emptySceneState,
      ev({
        outputText: "There is no lamp here. You can't see any troll.",
      }),
      vocab,
    )
    expect(s.inScope.map(o => o.canonical)).toEqual([])
    expect(s.antecedent).toBeNull()
  })

  it('an empty-container line keeps the container as the antecedent (BUG I)', () => {
    // "The glass bottle is empty." NAMES the bottle, which is PRESENT — its absent
    // CONTENTS are unnamed. So a following "open it"/"put X in it" must resolve to
    // the bottle. Live UAT: "examine sword" then "examine bottle" then "open it"
    // wrongly produced "open sword" because ABSENCE_PAT's "X is empty" clause
    // suppressed the just-examined bottle.
    let s = reduceScene(
      emptySceneState,
      ev({
        location: 'East-West Passage',
        outputText: "There's nothing special about the sword.",
        lastCommand: 'examine sword',
      }),
      ZORK1_VOCAB,
    )
    expect(s.antecedent).toBe('sword')
    s = reduceScene(
      s,
      ev({
        location: 'East-West Passage',
        outputText: 'The glass bottle is empty.',
        lastCommand: 'examine bottle',
      }),
      ZORK1_VOCAB,
    )
    expect(s.antecedent).toBe('glass bottle')
    expect(s.inScope.map(o => o.canonical)).toContain('glass bottle')
  })

  it('suppresses an adjective-prefixed absent object (review C6)', () => {
    // The old single-word capture grabbed the ADJECTIVE ("small"/"brass"),
    // resolved nothing, and the full surface form re-entered scope via
    // mentions() — the exact misclassification the tracker exists to prevent.
    const s = reduceScene(
      emptySceneState,
      ev({ outputText: 'There is no small mailbox here.' }),
      vocab,
    )
    expect(s.inScope.map(o => o.canonical)).toEqual([])
    const z = reduceScene(
      emptySceneState,
      ev({ outputText: "You can't see any brass lantern here." }),
      ZORK1_VOCAB,
    )
    expect(z.inScope.map(o => o.canonical)).not.toContain('brass lantern')
  })
})

describe('reduceScene — shared synonym resolves generically (F3)', () => {
  // Zork I has KITCHEN-WINDOW and BOARDED-WINDOW, both SYNONYM WINDOW. At Behind
  // House the text says only "window" (the referent is the kitchen window). The
  // bare shared synonym must enter scope AS "window" — not be auto-pinned to an
  // arbitrary owner (alphabetically-first "boarded window"), which corrupted even
  // valid English `open window` -> `open boarded window` (UAT F3). The Z-machine
  // parser disambiguates "open window" by room; our job is not to over-specify.
  it('a synonym shared by 2+ objects enters scope as the bare generic noun', () => {
    const s = reduceScene(
      emptySceneState,
      ev({
        location: 'Behind House',
        outputText:
          'You are behind the white house. In one corner of the house there is a small window which is slightly ajar.',
      }),
      ZORK1_VOCAB,
    )
    const canon = s.inScope.map(o => o.canonical)
    expect(canon).toContain('window')
    expect(canon).not.toContain('boarded window')
    expect(canon).not.toContain('kitchen window')
  })

  it('an explicit adjective still resolves to the specific canonical', () => {
    const s = reduceScene(
      emptySceneState,
      ev({
        location: 'South of House',
        outputText: 'The boarded window is firmly nailed and cannot be opened.',
      }),
      ZORK1_VOCAB,
    )
    expect(s.inScope.map(o => o.canonical)).toContain('boarded window')
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

  it('tier 2: an ARTICLE-led take ("take the lamp") still updates the antecedent (Bug B)', () => {
    // English vocab-passthrough keeps the article ("take the lamp"), unlike the
    // article-free canonical fr/de/es feed here. directObject must strip the
    // leading article or the acted object is lost and "it" resolves stale.
    const prev = reduceScene(
      emptySceneState,
      ev({ outputText: 'A lamp and a rug are here.' }),
      vocab,
    )
    expect(prev.antecedent).toBe('rug')
    const s = reduceScene(
      prev,
      ev({ lastCommand: 'take the lamp', outputText: 'Taken.' }),
      vocab,
    )
    expect(s.antecedent).toBe('lamp') // not the stale "rug"
    expect(s.inScope.find(o => o.canonical === 'lamp')?.carried).toBe(true)
  })

  it('tier 2: a double-spaced article-led take ("take  the lamp") still updates the antecedent (I3)', () => {
    // command is only trimmed, not whitespace-collapsed, so a double space left
    // the article-strip head empty and the acted object was lost (stale "it").
    const prev = reduceScene(
      emptySceneState,
      ev({ outputText: 'A lamp and a rug are here.' }),
      vocab,
    )
    expect(prev.antecedent).toBe('rug')
    const s = reduceScene(
      prev,
      ev({ lastCommand: 'take  the lamp', outputText: 'Taken.' }),
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

  it('a no-op action (already open / cannot be) does NOT hijack the antecedent', () => {
    // open mailbox reveals leaflet → antecedent is leaflet.
    const prev = reduceScene(
      emptySceneState,
      ev({
        lastCommand: 'open mailbox',
        outputText: 'Opening the small mailbox reveals a leaflet.',
      }),
      vocab,
    )
    expect(prev.antecedent).toBe('leaflet')
    // Re-opening the already-open mailbox no-ops and names no noun. The acted
    // object (mailbox) must NOT become "it" — leaflet stays the antecedent.
    const s = reduceScene(
      prev,
      ev({ lastCommand: 'open mailbox', outputText: 'It is already open.' }),
      vocab,
    )
    expect(s.antecedent).toBe('leaflet')
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

describe('NL v2 §8 — scope demoted, tracker contract pinned (F-AA/F-T)', () => {
  it('carried items survive a room change (inventory is in scope)', () => {
    const t = new TextSceneTracker(vocab)
    t.observe(ev({ location: 'Kitchen', outputText: 'There is a lamp here.' }))
    t.observe(
      ev({
        location: 'Kitchen',
        outputText: 'Taken.',
        lastCommand: 'take lamp',
      }),
    )
    t.observe(
      ev({
        location: 'Attic',
        outputText: 'You are in the attic.',
        lastCommand: 'up',
      }),
    )
    expect(t.scene().inScope.map(o => o.canonical)).toContain('lamp')
  })

  it('non-carried items are evicted on room change (F-AA stale window)', () => {
    const t = new TextSceneTracker(vocab)
    t.observe(ev({ location: 'Kitchen', outputText: 'There is a lamp here.' }))
    t.observe(
      ev({
        location: 'Attic',
        outputText: 'You are in the attic.',
        lastCommand: 'up',
      }),
    )
    expect(t.scene().inScope.map(o => o.canonical)).not.toContain('lamp')
  })

  it('a dropped item is evicted at the NEXT room change, not carried along', () => {
    const t = new TextSceneTracker(vocab)
    t.observe(
      ev({
        location: 'Kitchen',
        outputText: 'Taken.',
        lastCommand: 'take lamp',
      }),
    )
    // pins the take-without-prior-mention push branch (reduceScene's inScope.push)
    expect(t.scene().inScope.find(o => o.canonical === 'lamp')?.carried).toBe(
      true,
    )
    t.observe(
      ev({
        location: 'Kitchen',
        outputText: 'Dropped.',
        lastCommand: 'drop lamp',
      }),
    )
    t.observe(
      ev({
        location: 'Attic',
        outputText: 'You are in the attic.',
        lastCommand: 'up',
      }),
    )
    expect(t.scene().inScope.map(o => o.canonical)).not.toContain('lamp')
  })

  it('reducer stays idempotent on duplicate observes (v1 invariant)', () => {
    const t = new TextSceneTracker(vocab)
    const e = ev({ location: 'Kitchen', outputText: 'There is a lamp here.' })
    t.observe(e)
    const once = t.scene()
    t.observe(e)
    expect(t.scene()).toEqual(once)
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
