// src/llm/lexicon/parse.ka-uat.test.ts
// Georgian UAT regression suite — pins puzzle-critical commands + confirmed
// findings against the SHIPPING KA_CORE + KA_ZORK1 and the real ZORK1_VOCAB.
// Mirrors parse.es-uat.test.ts. NATIVE-REVIEW-DRAFT fixtures.
import { describe, it, expect } from 'vitest'
import { parseLexicon, resolveNounReply } from './parse'
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

// Georgian COMPLETION run 3 (notes/uat-georgian-run3.md, 2026-06-27).
describe('Georgian run 3 — candles displayed plural', () => {
  // The Altar displays the candles as the Georgian PLURAL (სანთები / the
  // syncopated სანთლები) — the natural thing to type — but the lexicon carried
  // only the singular stem სანთელ, so the plural surfaces abstained (run 3). Same
  // family as the displayed-compound-name findings: a native speaker types what
  // is on screen. Add the plural stems as synonyms; the singular still works.
  it('take candles via the displayed plural (აიღე სანთები / სანთლები)', () => {
    expect(ka('აიღე სანთები')).toEqual({
      kind: 'command',
      text: 'take candles',
    })
    expect(ka('აიღე სანთლები')).toEqual({
      kind: 'command',
      text: 'take candles',
    })
  })
  it('light candles with match via the plural (აანთე სანთები ასანთით)', () => {
    expect(ka('აანთე სანთები ასანთით')).toEqual({
      kind: 'command',
      text: 'light candles with match',
    })
  })
  it('singular still resolves (regression)', () => {
    expect(ka('აიღე სანთელი')).toEqual({
      kind: 'command',
      text: 'take candles',
    })
  })
})

// Georgian COMPLETION playthrough (notes/uat-georgian-completion.md, run 2,
// 2026-06-26). Pins the run-2 findings that were clear deterministic gaps.
describe('Georgian completion — exit the boat (Finding 3)', () => {
  // Finding 3 (near-fatal): board/launch were fixed but NO Georgian exit form
  // worked, stranding a monolingual player in the boat above the falls. The
  // antonym of `შედი ნავში`. Two root causes fixed:
  //  (a) ablative `ნავიდან` (boat-from) carries the consonant-stem linking vowel
  //      `-იდან`; the bare `-დან` split left `ნავი` (≠ stored stem `ნავ`). The
  //      `იდან` postposition variant strips it so `ნავ` resolves.
  //  (b) only `გადი`→exit existed; the natural leave/get-out/get-down verbs did
  //      not. NB Zork `LEAVE OBJECT` = V-DROP (drops the boat!) — so these all
  //      emit `exit` (V-EXIT), never `leave`.
  it('exit boat — ablative გადი ნავიდან', () => {
    expect(ka('გადი ნავიდან')).toEqual({ kind: 'command', text: 'exit boat' })
  })
  it('exit boat — დატოვე ნავი (leave → exit, nominative)', () => {
    expect(ka('დატოვე ნავი')).toEqual({ kind: 'command', text: 'exit boat' })
  })
  it('exit boat — გამოდი ნავიდან (get out)', () => {
    expect(ka('გამოდი ნავიდან')).toEqual({ kind: 'command', text: 'exit boat' })
  })
  it('exit boat — ჩამოდი ნავიდან (get down)', () => {
    expect(ka('ჩამოდი ნავიდან')).toEqual({ kind: 'command', text: 'exit boat' })
  })
  // The same ablative fix lets `exit house` work (the spec's documented intent —
  // `exit სახლიდან "out of house"` — never actually resolved either: `სახლიდან`
  // → bare `დან` split → `სახლი` ≠ stored stem `სახლ`).
  it('exit house — ablative გადი სახლიდან', () => {
    expect(ka('გადი სახლიდან')).toEqual({ kind: 'command', text: 'exit house' })
  })
})

describe('Georgian completion — tie locative (Finding 1)', () => {
  // The dative `მიაბი თოკი მოაჯირს` → `tie rope to railing` already works (G1).
  // But the equally natural LOCATIVE `მოაჯირზე` ("onto the railing", -ზე) split
  // to the prep `on`, emitting `tie rope on railing` — which Zork REJECTS (its
  // only object syntax is TIE OBJECT TO OBJECT, gsyntax.zil:497). Coerce the
  // locative-derived `on` to `to` for `tie` so the natural form also resolves.
  it('tie rope to railing — locative მოაჯირზე (-ზე → to)', () => {
    expect(ka('მიაბი თოკი მოაჯირზე')).toEqual({
      kind: 'command',
      text: 'tie rope to railing',
    })
  })
})

describe('Georgian completion — climb synonym (Finding minor)', () => {
  // `აცოცდი ხეზე` abstained — only `აძვერი`/`ჩაძვერი` mapped. აცოცდი ("clamber
  // up") is the other natural Georgian climb imperative.
  it('climb tree — აცოცდი ხეზე', () => {
    expect(ka('აცოცდი ხეზე')).toEqual({ kind: 'command', text: 'climb tree' })
  })
})

describe('Georgian completion — Ulysses magic word (Finding)', () => {
  // The cyclops scare-word. ოდისევსი (Odysseus) abstained, forcing the player
  // to type the Latin `Ulysses`. Zork accepts ODYSSEUS too (gsyntax.zil:335
  // SYNONYM ODYSSEUS ULYSSES), so map the Georgian transliteration → odysseus as
  // a single-word meta alias (resolved upstream, like the other ka meta words).
  it('ოდისევსი maps to the odysseus scare-word', () => {
    expect(KA_CORE.metaAliases['ოდისევსი']).toBe('odysseus')
  })
})

// Georgian DEATHLESS-COMPLETION run (notes/uat-georgian-completion.md,
// 2026-06-28). The first `ka` run to reach a deathless 350/350. Each block pins a
// deterministic input gap found on the way — a word the DISPLAY teaches (or a
// natural synonym) that the parser then rejected. ka has NO input LLM, so each is
// a hard dead-end until aliased (same trap class as stiletto/canary/lid/mailbox).
describe('Georgian completion — display-taught / synonym input gaps', () => {
  // The egg's contents list the bird as the vowel-final კანარა, but a player who
  // knows it as კანარი (nominative -ი) abstained. Add the stripped stem კანარ to
  // both clockwork-canary entries (mirrors the shared კანარა → 'canary').
  it('take canary — nominative კანარი (→ კანარ)', () => {
    expect(ka('აიღე კანარი')).toEqual({ kind: 'command', text: 'take canary' })
  })

  // The diamond machine's lid: the room prose calls it სახურავი, but only the
  // machine itself (მანქანა) was a parser noun, so `გახსენი სახურავი` abstained —
  // and the diamond (a 350-required treasure) is gated on opening that lid. Alias
  // სახურავ onto the machine so the displayed word resolves (→ open/close machine).
  it('open machine via the displayed lid word (გახსენი სახურავი)', () => {
    expect(ka('გახსენი სახურავი')).toEqual({
      kind: 'command',
      text: 'open machine',
    })
  })
  it('close machine via the displayed lid word (დახურე სახურავი)', () => {
    expect(ka('დახურე სახურავი')).toEqual({
      kind: 'command',
      text: 'close machine',
    })
  })

  // The endgame headline verb: only გადაკვეთე mapped to `cross`; the equally
  // natural „step across" გადააბიჯე abstained, which would strand a prose-following
  // player above Aragain Falls (the endgame becomes unreachable in ka). NB გადი is
  // already `exit`, so it can't double as cross.
  it('cross rainbow — გადააბიჯე synonym', () => {
    expect(ka('გადააბიჯე ცისარტყელა')).toEqual({
      kind: 'command',
      text: 'cross rainbow',
    })
  })
  it('cross rainbow — shipping გადაკვეთე still works (regression)', () => {
    expect(ka('გადაკვეთე ცისარტყელა')).toEqual({
      kind: 'command',
      text: 'cross rainbow',
    })
  })

  // The skull's displayed name is ბროლის თავის ქალა; bare ქალა and the full form
  // resolve, but the middle form თავის ქალა (player drops just the ბროლის
  // "crystal" adjective) abstained. Same middle-form family as mailbox/trap-door.
  it('take skull via the middle form (აიღე თავის ქალა)', () => {
    expect(ka('აიღე თავის ქალა')).toEqual({
      kind: 'command',
      text: 'take skull',
    })
  })

  // The trap door's other natural name: ლუქი ("hatch"). The room prose teaches
  // ხაფანგ-კარი (which resolves), but a player who reaches for the synonym ლუქი
  // abstained. ლუქი → ლუქ (nominative -ი strip); aliased onto the trap door.
  it('open trap door via the synonym ლუქი (→ ლუქ)', () => {
    expect(ka('გააღე ლუქი')).toEqual({ kind: 'command', text: 'open trapdoor' })
  })

  // Meta words resolved upstream (KA_CORE.metaAliases), pinned at that layer:
  // ნივთები ("things") — the natural alternative to ინვენტარი; and ულისე
  // (Ulysses, Latin) — the cyclops scare-word's other accepted name (Zork accepts
  // both ULYSSES and ODYSSEUS, gsyntax.zil:335), alongside the existing ოდისევსი.
  it('ნივთები maps to inventory', () => {
    expect(KA_CORE.metaAliases['ნივთები']).toBe('inventory')
  })
  it('ულისე maps to the ulysses scare-word', () => {
    expect(KA_CORE.metaAliases['ულისე']).toBe('ulysses')
  })
})

// Georgian NATIVE-SPEAKER feasibility run (notes/uat-georgian-playthrough.md,
// 2026-06-29). A native speaker drove Zork I end-to-end typing only natural
// Georgian (no glossary). Three input-side gaps surfaced — each a natural word a
// real speaker reaches for that the lexicon didn't know. ka has NO input LLM, so
// each was a hard miss (G2 gated a 350-required treasure with NO on-screen hint).
describe('Georgian playthrough — natural-word input gaps (G1–G3)', () => {
  // G2 (highest priority — candidate hard blocker): only the bare imperative
  // თხარე mapped to `dig`. The natural perfective გათხარე ("dig it up") and
  // ამოთხარე ("dig out") abstained — with NO on-screen hint, unlike the sceptre.
  // The scarab (a 350-point-win treasure) is gated behind dig, so a speaker who
  // never guesses the bare თხარე form is stuck. Added as `dig` synonyms.
  it('dig sand — perfective გათხარე (with instrument)', () => {
    expect(ka('გათხარე ქვიშა ნიჩაბით')).toEqual({
      kind: 'command',
      text: 'dig sand with shovel',
    })
  })
  it('dig sand — ამოთხარე ("dig out") synonym', () => {
    expect(ka('ამოთხარე ქვიშა ნიჩაბით')).toEqual({
      kind: 'command',
      text: 'dig sand with shovel',
    })
  })
  it('dig sand — shipping თხარე still works (regression)', () => {
    expect(ka('თხარე ქვიშა ნიჩაბით')).toEqual({
      kind: 'command',
      text: 'dig sand with shovel',
    })
  })

  // G1 (friction, not a wall — the object's description shows სკიპტრა on screen):
  // კვერთხი is the ordinary, arguably primary, native word for a sceptre/royal
  // staff; the lexicon only knew the transliteration სკიპტრა. კვერთხი → კვერთხ
  // (nominative -ი strip), added as a sceptre synonym.
  it('take sceptre — natural კვერთხი (→ კვერთხ)', () => {
    expect(ka('აიღე კვერთხი')).toEqual({
      kind: 'command',
      text: 'take sceptre',
    })
  })
  it('wave sceptre — natural კვერთხი', () => {
    expect(ka('დაიქნიე კვერთხი')).toEqual({
      kind: 'command',
      text: 'wave sceptre',
    })
  })
  it('take sceptre — shipping სკიპტრა still works (regression)', () => {
    expect(ka('აიღე სკიპტრა')).toEqual({
      kind: 'command',
      text: 'take sceptre',
    })
  })

  // G3 (sign-posted — the footer/help hand the player the `"wind up canary"`
  // English escape): only დააქოქე mapped to `wind up`. The natural ამოქოქე /
  // მოქოქე abstained. Added so the songbird/bauble puzzle (a treasure) doesn't
  // force English on a Georgian-only player.
  it('wind up canary — ამოქოქე synonym', () => {
    expect(ka('ამოქოქე კანარა')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
  it('wind up canary — მოქოქე synonym', () => {
    expect(ka('მოქოქე კანარა')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
  it('wind up canary — shipping დააქოქე still works (regression)', () => {
    expect(ka('დააქოქე კანარა')).toEqual({
      kind: 'command',
      text: 'wind up canary',
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
  // G1 (duplicate-hunt coverage gap): fr/de/es each map a native word to the
  // `diagnose` meta verb; ka had none, so a Georgian player wanting the post-
  // combat health report was forced to type English `diagnose`. ka has no LLM
  // net, so the deterministic alias is its only non-English path. Parallel to
  // fr `diagnostic` / es `diagnostico` (the Latinate noun).
  it('G1: Georgian diagnose alias closes the fr/de/es parity gap', () => {
    expect(KA_CORE.metaAliases['დიაგნოზი']).toBe('diagnose')
  })
})

describe('Georgian reply path — instrumental orphan answer ("რით?")', () => {
  const reply = (s: string) =>
    resolveNounReply(s, KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty)
  it('colloquial instrumental ტუმბოით resolves to the pump', () => {
    // Answer to the inflate orphan prompt; -ით splits to [ით, ტუმბო], the
    // leading prep is dropped, ტუმბო resolves.
    expect(reply('ტუმბოით')).toBe('pump')
  })
  it('formal instrumental ტუმბოთი resolves to the pump', () => {
    // Routes through the fused map (ტუმბოთი → [ით, ტუმბო]) then the reply
    // prep-drop. (Pre-fused-map this resolved via the now-removed 'ტუმბოთ' synonym.)
    expect(reply('ტუმბოთი')).toBe('pump')
  })
  it('bare ტუმბო resolves to the pump', () => {
    expect(reply('ტუმბო')).toBe('pump')
  })
})

describe('Georgian F1 — fused instrumental (pump)', () => {
  it('fused ტუმბოთი: inflate plastic with pump', () => {
    expect(ka('გაბერე პლასტმასი ტუმბოთი')).toEqual({
      kind: 'command',
      text: 'inflate valve with pump',
    })
  })
  it('colloquial ტუმბოით still works', () => {
    expect(ka('გაბერე პლასტმასი ტუმბოით')).toEqual({
      kind: 'command',
      text: 'inflate valve with pump',
    })
  })
  it('the -თი collision nouns are untouched', () => {
    // ასანთი (matchbook) and ყუთი (box) are NOT fused-map keys.
    expect(ka('აიღე ასანთი')).toEqual({ kind: 'command', text: 'take match' })
    expect(ka('გააღე ყუთი')).toEqual({ kind: 'command', text: 'open mailbox' })
  })
})

describe('Georgian F2 — dative -ს direct object', () => {
  it('push <color> button (dative head ღილაკს) — all four colours', () => {
    expect(ka('დააჭირე ლურჯ ღილაკს')).toEqual({
      kind: 'command',
      text: 'push blue button',
    })
    expect(ka('დააჭირე წითელ ღილაკს')).toEqual({
      kind: 'command',
      text: 'push red button',
    })
    expect(ka('დააჭირე ყავისფერ ღილაკს')).toEqual({
      kind: 'command',
      text: 'push brown button',
    })
    expect(ka('დააჭირე ყვითელ ღილაკს')).toEqual({
      kind: 'command',
      text: 'push yellow button',
    })
  })
  it('bare dative ღილაკს → push button (Z-parser disambiguates)', () => {
    expect(ka('დააჭირე ღილაკს')).toEqual({
      kind: 'command',
      text: 'push button',
    })
  })
  it('disambiguation reply ყვითელ ღილაკს resolves to the button', () => {
    expect(
      resolveNounReply('ყვითელ ღილაკს', KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty),
    ).toBe('yellow button')
  })
  it('REGRESSION: dative recipients still route through G1', () => {
    expect(ka('მიეცი კვერცხი ქურდს')).toEqual({
      kind: 'command',
      text: 'give egg to thief',
    })
    expect(ka('მიაბი თოკი მოაჯირს')).toEqual({
      kind: 'command',
      text: 'tie rope to railing',
    })
  })
  it('REGRESSION: native -ს stems resolve in nominative AND dative', () => {
    // screwdriver სახრახნის: nominative სახრახნისი, dative სახრახნისს.
    expect(ka('აიღე სახრახნისი')).toEqual({
      kind: 'command',
      text: 'take screwdriver',
    })
    expect(ka('აიღე სახრახნისს')).toEqual({
      kind: 'command',
      text: 'take screwdriver',
    })
    // chalice თას (nominative თასი); scarab სკარაბეუს (nominative სკარაბეუსი).
    expect(ka('აიღე თასი')).toEqual({ kind: 'command', text: 'take chalice' })
    expect(ka('აიღე სკარაბეუსი')).toEqual({
      kind: 'command',
      text: 'take scarab',
    })
  })
  it('REGRESSION: genitive ოქროს still resolves to the pot of gold', () => {
    // The strip also lands a genitive modifier (ოქროს → ოქრო); bare ოქრო is
    // deliberately mapped to the pot of gold (correct Zork — no takeable "gold").
    // Pinned so a future lexicon change can't silently break this strip-into-genitive.
    expect(ka('აიღე ოქროს')).toEqual({ kind: 'command', text: 'take pot' })
  })
})

describe('Georgian UAT — raise basket synonym (G4)', () => {
  // Coal-mine shaft basket. ასწიე ("lift") shipped and works; the prose-natural
  // ამოწიე ("pull UP-and-out", the instinctive verb for hauling a basket up a
  // deep shaft) abstained, with ka having no input-LLM net. notes/uat-georgian-playthrough.md.
  // NB: the basket's vocab noun is "cage" in Zork I, so კალათა → cage; "raise cage"
  // is the working command that hauled the basket up live.
  it('raise basket — shipping ასწიე still works (regression)', () => {
    expect(ka('ასწიე კალათა')).toEqual({
      kind: 'command',
      text: 'raise cage',
    })
  })
  it('G4: raise basket — natural ამოწიე (pull up out of the shaft)', () => {
    expect(ka('ამოწიე კალათა')).toEqual({
      kind: 'command',
      text: 'raise cage',
    })
  })
})
