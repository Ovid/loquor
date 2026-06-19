// src/llm/lexicon/walkthrough-coverage.test.ts
//
// Walkthrough-reachability gate. Premise: a verb/object a player MUST type to
// COMPLETE a game has to be reachable in every input language; anything off the
// winning path needs no coverage argument. This is the player-meaningful
// "every word allowed" test — scoped to what actually matters (finishing the
// game) instead of the full 684-word dictionary.
//
// Sources: Zork I parsed live from its clean ">command" walkthrough; Zork II/III
// from the hand-curated lists in walkthrough-commands.ts. Verb equivalence comes
// from the ZIL <SYNONYM> declarations (authoritative), so a verb reached under a
// synonym (attack≡fight) is not falsely flagged.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { coreLexicon, nounLexicon } from './index'
import { parseLexicon } from './parse'
import type { Scene } from '../scene/types'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import { ZORK2_VOCAB } from '../grammar/zork2.vocab'
import { ZORK3_VOCAB } from '../grammar/zork3.vocab'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../grammar/index'
import { ZORK2_COMMANDS, ZORK3_COMMANDS } from './walkthrough-commands'
import type { Vocab } from '../grammar/types'
import type { LexLang } from './types'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const LANGS: LexLang[] = ['fr', 'de', 'es']
const tr = (s: string) => s.slice(0, 6) // v3 dictionary truncation
const head = (s: string) => s.split(' ')[0]

/** Zork I winning commands, parsed from the clean ">..." walkthrough. */
function zork1Commands(): string[] {
  const txt = readFileSync(
    resolve(repoRoot, 'docs/walkthrough-zork-i.txt'),
    'utf8',
  )
  return txt
    .split('\n')
    .filter(l => l.startsWith('>'))
    .map(l => l.slice(1).trim().toLowerCase())
    .filter(Boolean)
}

/** ZIL <SYNONYM A B C> groups → verb-equivalence closure (lowercased). */
function synonymClosure(): Map<string, Set<string>> {
  const groups: string[][] = []
  for (const n of [1, 2, 3]) {
    const zil = readFileSync(resolve(repoRoot, `zork${n}/gsyntax.zil`), 'utf8')
    for (const m of zil.matchAll(/^<SYNONYM\s+([^>]+)>/gim))
      groups.push(
        m[1]
          .trim()
          .split(/\s+/)
          .map(w => w.toLowerCase()),
      )
  }
  const map = new Map<string, Set<string>>()
  for (const g of groups)
    for (const w of g) {
      const s = map.get(w) ?? new Set<string>()
      g.forEach(x => s.add(x))
      map.set(w, s)
    }
  return map
}
const CLOSURE = synonymClosure()
// Same-routine cross-group equivalences the ZIL keeps as separate <SYNONYM>
// lines but routes to one V-routine, so either verb wins the game action.
const ACTION_EQUIV: Record<string, string[]> = {
  attack: ['kill'],
  kill: ['attack'],
  get: ['take'],
  take: ['get'],
  grab: ['take', 'get'],
  // V-LEAVE and V-EXIT both disembark a vehicle (gsyntax.zil keeps them as
  // separate syntax lines but they're the same action) — so a language that
  // maps 'exit' reaches 'leave boat' too.
  leave: ['exit'],
  exit: ['leave'],
}

/** Verbs the player never needs to translate because directions.ts owns the
 * direction word they actually type — "go south" is reached as bare "sud". */
const MOVEMENT_VERBS = new Set(['go', 'walk', 'run'])

/**
 * Required verbs with NO collision-safe deterministic mapping yet — pinned so
 * the suite is green while the player-harm stays VISIBLE (set-equality forces
 * shrinking as each is fixed). Each is a real grammar-only completion blocker:
 *
 *  - 'tell'  (Zork II, "tell robot go east"): a NESTED NPC command, not a
 *    single verb→verb map — the deterministic lexicon can't compose
 *    "tell <actor> <command>", so the robot puzzle is grammar-only-blocked in
 *    every non-English language. Needs a design decision (see notes).
 */
const KNOWN_GAPS: Record<LexLang, Record<string, string[]>> = {
  fr: { zork2: ['tell'] },
  de: { zork2: ['tell'] },
  es: { zork2: ['tell'] },
}
function equivalents(verb: string): Set<string> {
  const out = new Set<string>(CLOSURE.get(verb) ?? [verb])
  out.add(verb)
  for (const e of ACTION_EQUIV[verb] ?? []) {
    out.add(e)
    for (const x of CLOSURE.get(e) ?? []) out.add(x)
  }
  return out
}

/** Magic words / proper-noun puzzles: the solution IS a specific English word
 * or name (Loud Room "echo", Cyclops "Ulysses"). Language-independent by
 * design — a player types them verbatim in any language. */
const WORDPLAY = new Set([
  'echo',
  'ulysses',
  'odysseus',
  'xyzzy',
  'plugh',
  'frobozz',
  'zork',
])

const GAMES: {
  name: string
  sig: string
  vocab: Vocab
  commands: () => string[]
}[] = [
  {
    name: 'zork1',
    sig: ZORK1_SIG,
    vocab: ZORK1_VOCAB,
    commands: zork1Commands,
  },
  {
    name: 'zork2',
    sig: ZORK2_SIG,
    vocab: ZORK2_VOCAB,
    commands: () => [...ZORK2_COMMANDS],
  },
  {
    name: 'zork3',
    sig: ZORK3_SIG,
    vocab: ZORK3_VOCAB,
    commands: () => [...ZORK3_COMMANDS],
  },
]

/** Verbs that ARE real vocab verbs in a game (so a reachability gap is real,
 * not a typo/flavor word the parser never knew). */
function vocabVerbHeads(v: Vocab): Set<string> {
  return new Set(
    [...v.verbsOnly, ...v.verbs1, ...v.verbs2, ...v.verbSynonyms].map(x =>
      tr(head(x)),
    ),
  )
}

/** Lexicon verb targets a language can emit (truncated heads). */
function targetHeads(lang: LexLang): Set<string> {
  const core = coreLexicon(lang)
  return new Set(
    [
      ...Object.values(core.verbs),
      ...core.verbIdioms.map(i => i.to),
      ...core.particleVerbs.map(p => p.to),
      ...Object.values(core.metaAliases),
    ].map(t => tr(head(t))),
  )
}

describe('walkthrough-reachability gate', () => {
  describe.each(GAMES)('$name verbs', ({ name, vocab, commands }) => {
    const cmds = commands()
    const requiredVerbs = [...new Set(cmds.map(c => head(c)))]
    const realVerbs = vocabVerbHeads(vocab)

    it.each(LANGS)(`%s can reach every winning verb`, lang => {
      const reach = targetHeads(lang)
      const blockers = requiredVerbs.filter(v => {
        if (WORDPLAY.has(v) || MOVEMENT_VERBS.has(v)) return false
        if (!realVerbs.has(tr(v))) return false // not a parser verb → flavor/typo
        return ![...equivalents(v)].some(e => reach.has(tr(e)))
      })
      const pinned = KNOWN_GAPS[lang][name] ?? []
      expect(
        blockers.sort(),
        `${name}/${lang} unreachable winning verbs`,
      ).toEqual([...pinned].sort())
    })
  })

  // The knock fix is a verb+prep idiom (collision-safe with "hit"): pin that it
  // emits a real "knock on <door>" command, not just that the head is reachable.
  describe('knock idioms emit a valid knock command (Zork III door)', () => {
    const scene: Scene = {
      inScope: [{ canonical: 'bronze door' }],
      antecedent: null,
    }
    it.each([
      ['fr', 'frappe a la porte'],
      ['de', 'klopfe an die tur'],
      ['es', 'llama a la puerta'],
    ] as [LexLang, string][])('%s: "%s" → knock on door', (lang, input) => {
      const r = parseLexicon(
        input,
        coreLexicon(lang),
        nounLexicon(lang, ZORK3_SIG)!,
        ZORK3_VOCAB,
        scene,
      )
      expect(r.kind).toBe('command')
      expect(r.kind === 'command' && r.text).toMatch(/^knock on .*door$/)
    })
  })
})
