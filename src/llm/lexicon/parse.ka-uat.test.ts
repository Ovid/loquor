// src/llm/lexicon/parse.ka-uat.test.ts
// Georgian UAT regression suite — pins puzzle-critical commands + confirmed
// findings against the SHIPPING KA_CORE + KA_ZORK1 and the real ZORK1_VOCAB.
// Mirrors parse.es-uat.test.ts. NATIVE-REVIEW-DRAFT fixtures.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import { isMetaCommand } from '../inputTranslate'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const inScope = (...canonicals: string[]): Scene => ({
  inScope: canonicals.map(canonical => ({ canonical })),
  antecedent: null,
})
const ka = (clause: string, scene: Scene = empty) =>
  parseLexicon(clause, KA_CORE, KA_ZORK1, ZORK1_VOCAB, scene)

describe('Georgian UAT — instrumental & dative', () => {
  it('-ით instrumental: turn bolt with wrench (genitive-compound instrument)', () => {
    // walkthrough fixture: 'მოატრიალე ხრახნი ქანჩის გასაღებით' → 'turn bolt with wrench'.
    // wrench = ქანჩის გასაღები ('nut-key'), a genitive compound. -ით splits off the
    // head (გასაღებით → [ით, გასაღებ]); the stranded-modifier rejoin re-joins ქანჩის
    // across the prep so the instrument resolves as 'ქანჩის გასაღებ' → wrench.
    expect(ka('მოატრიალე ხრახნი ქანჩის გასაღებით')).toEqual({
      kind: 'command',
      text: 'turn bolt with wrench',
    })
  })
  it('G1 dative: tie rope to railing', () => {
    // walkthrough fixture: 'მიაბი თოკი მოაჯირს' → 'tie rope to railing'
    // -ს (dative) is NOT split by expandGeorgian; the G1 dative path emits
    // '<verb> <obj> to <recipient>'.
    expect(ka('მიაბი თოკი მოაჯირს')).toEqual({
      kind: 'command',
      text: 'tie rope to railing',
    })
  })
})

describe('Georgian UAT — idioms & nominative', () => {
  it('wind up canary', () => {
    // walkthrough fixture: 'დააქოქე კანარა' → 'wind up canary'
    expect(ka('დააქოქე კანარა')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
  it('nominative -ი strip resolves the lamp', () => {
    // walkthrough fixture: 'აიღე ფარანი' → 'take lamp'
    // ფარანი strips to ფარან (shared synonym across brass/broken/burned-out lanterns);
    // the shared dictionary word is 'lamp', NOT 'brass lantern'.
    expect(ka('აიღე ფარანი')).toEqual({
      kind: 'command',
      text: 'take lamp',
    })
  })
})

describe('Georgian UAT — scope disambiguation', () => {
  it('კანარა without scope: shared "canary" (ambiguous canaries)', () => {
    // Both golden and broken clockwork canary share the synonym 'კანარა'.
    // Without scope, resolveNoun emits the shared dictionary word.
    expect(ka('აიღე კანარა')).toEqual({ kind: 'command', text: 'take canary' })
  })
  it('კანარა in scope of golden canary: resolves to that candidate', () => {
    // With only the golden canary in scope, the resolver prefers the scoped
    // object — whose emit is still 'canary', so the surface matches the
    // shared-word path above (this guards against a regression to null/miss).
    expect(ka('აიღე კანარა', inScope('golden clockwork canary'))).toEqual({
      kind: 'command',
      text: 'take canary',
    })
  })
})

// M-C — finding-8: meta verbs stay reachable for ka. Meta is resolved UPSTREAM of
// parseLexicon (isMetaCommand runs at the pipeline's meta stage; Georgian meta
// words via core.metaAliases at the alias stage), so pin it at that layer, NOT by
// calling parseLexicon('save'). (isMetaCommand imported at top.)
// Georgian completion playthrough (notes/uat-georgian-playthrough.md, 2026-06-26).
// Each block pins a finding from playing Zork I end-to-end in real Georgian.
describe('Georgian playthrough — motion verbs (enter/board)', () => {
  // Finding 7 (blocker) + Finding 2: enter/board a vehicle or the house uses the
  // inessive case (ნავში "into boat", სახლში "into house"). expandGeorgian splits
  // -ში to a LEADING prep token [ში, noun], which no path resolved (the prep-split
  // loop needs an object token BEFORE the prep). The motion-verb absorb drops the
  // leading locational postposition so these become the bare-object commands the
  // Z-parser accepts. ნავ is shared by magic/punctured boat → shared word 'boat'.
  it('enter boat (შედი ნავში → enter boat)', () => {
    expect(ka('შედი ნავში')).toEqual({ kind: 'command', text: 'enter boat' })
  })
  it('board boat (ჩაჯექი ნავში → board boat)', () => {
    expect(ka('ჩაჯექი ნავში')).toEqual({ kind: 'command', text: 'board boat' })
  })
  it('enter house (შედი სახლში → enter house)', () => {
    expect(ka('შედი სახლში')).toEqual({ kind: 'command', text: 'enter house' })
  })
})

describe('Georgian playthrough — launch/echo/move/wait synonyms', () => {
  // Finding 7: launch. The shipping verb გაუშვი already works (FIND_DEFAULT_VERBS);
  // pin it, and add the natural word a player reaches for at the river (გაცურე).
  it('launch — shipping გაუშვი still works', () => {
    expect(ka('გაუშვი')).toEqual({ kind: 'command', text: 'launch' })
  })
  it('launch — გაცურე synonym', () => {
    expect(ka('გაცურე')).toEqual({ kind: 'command', text: 'launch' })
  })
  // Finding 5: Loud Room echo. echo is an intransitive game verb, so ექო maps as a
  // core verb (NOT an English 'echo' idiom, which would inject the ASCII token
  // 'echo' into the ka word set — KNOWN_COLLISIONS.ka must stay []).
  it('echo (ექო → echo)', () => {
    expect(ka('ექო')).toEqual({ kind: 'command', text: 'echo' })
  })
  // Finding 3: move rug. Shipping verb is წაანაცვლე; the colloquial გადასწიე/გადაწიე
  // (what most speakers type first) are added as synonyms.
  it('move rug — colloquial გადასწიე', () => {
    expect(ka('გადასწიე ხალიჩა')).toEqual({ kind: 'command', text: 'move rug' })
  })
  it('move rug — colloquial გადაწიე', () => {
    expect(ka('გადაწიე ხალიჩა')).toEqual({ kind: 'command', text: 'move rug' })
  })
  // Finding 6: wait. Shipping verb is დაიცადე; მოიცადე is the other natural form.
  it('wait — მოიცადე synonym', () => {
    expect(ka('მოიცადე')).toEqual({ kind: 'command', text: 'wait' })
  })
})

describe('Georgian playthrough — displayed compound object names', () => {
  // Findings 1 & 4: a native speaker types the on-screen name. The display drops
  // the leading adjective (small/secret), so the player types the middle form
  // (საფოსტო ყუთი / ხაფანგ-კარი), which matched neither the full stored form nor
  // the bare head. Added as exact input synonyms — NOT via a generic
  // leading-modifier stripper, which would mis-resolve ხაფანგ-კარი → the ambiguous
  // door set (trap door's salient word is ხაფანგ "trap", not the head კარ "door").
  it('open mailbox via displayed name (გააღე საფოსტო ყუთი)', () => {
    expect(ka('გააღე საფოსტო ყუთი')).toEqual({
      kind: 'command',
      text: 'open mailbox',
    })
  })
  it('open trap door via displayed name (გააღე ხაფანგ-კარი)', () => {
    expect(ka('გააღე ხაფანგ-კარი')).toEqual({
      kind: 'command',
      text: 'open trapdoor',
    })
  })
})

describe('Georgian UAT — meta verbs (finding-8)', () => {
  it('English meta verbs are recognized for any language (save/quit/score/restart)', () => {
    // 'i' and 'l' are in-world game shortcuts (inventory/look), NOT meta —
    // they route through the lexicon/verb path, not isMetaCommand.
    for (const m of ['save', 'quit', 'score', 'restart', 'again'])
      expect(isMetaCommand(m)).toBe(true)
  })
  it('Georgian meta aliases map to raw English meta', () => {
    expect(KA_CORE.metaAliases['ინვენტარი']).toBe('inventory')
    expect(KA_CORE.metaAliases['გასვლა']).toBe('quit')
  })
})
