// src/llm/lexicon/roundtrip.test.ts
// Generated gates (spec §14): the lexicon DATA must be self-consistent with
// the extracted vocab. ~2000 cases, all deterministic, no LLM. Every failure
// here is a DATA bug (fix the lexicon/vocab data) or a parser bug (fix
// parse.ts with a reduced case in parse.test.ts FIRST).
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { coreLexicon, nounLexicon } from './index'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../grammar/index'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import { ZORK2_VOCAB } from '../grammar/zork2.vocab'
import { ZORK3_VOCAB } from '../grammar/zork3.vocab'
import type { LexLang } from './types'
import type { Vocab } from '../grammar/types'
import type { Scene } from '../scene/types'

const GAMES: [string, string, Vocab][] = [
  ['zork1', ZORK1_SIG, ZORK1_VOCAB],
  ['zork2', ZORK2_SIG, ZORK2_VOCAB],
  ['zork3', ZORK3_SIG, ZORK3_VOCAB],
]
const LANGS: LexLang[] = ['fr', 'de', 'es']

/**
 * Truncation-aware membership: the v3 Z-machine dictionary stores words
 * truncated to 6 characters, so extraction yields 'inflat' — but the
 * Z-parser ACCEPTS the full word 'inflate' typed by a player (input is
 * truncated identically before lookup). Emitting the full spelling is
 * therefore correct (see the NOTE in fr/de/es.core.ts), and the gate must
 * not flag it: a target counts as present if the vocab contains it exactly
 * OR contains its 6-char truncation. For targets ≤6 chars (and multiword
 * targets, whose slice is never a dictionary word) the second check is
 * inert or a no-hit, so this only widens the gate for the truncated case.
 */
function inVocab(target: string, words: ReadonlySet<string>): boolean {
  return words.has(target) || words.has(target.slice(0, 6))
}

describe('core lexicon targets are vocab verbs (round-trip gate, Task 14)', () => {
  // verbSynonyms is a legitimate verb-target home: gsyntax <SYNONYM …>
  // members (break, touch, taste, hide, shout, sit, remove …) are real
  // parser verbs that extraction files under verbSynonyms rather than the
  // arity lists, and the fr/de/es cores map onto several of them.
  const allVerbs = new Set(
    GAMES.flatMap(([, , v]) => [
      ...v.verbsOnly,
      ...v.verbs1,
      ...v.verbs2,
      ...v.movement,
      ...v.verbSynonyms,
    ]),
  )
  const allPreps = new Set(GAMES.flatMap(([, , v]) => v.preps))

  for (const lang of LANGS) {
    const core = coreLexicon(lang)
    const targets = [
      ...Object.values(core.verbs),
      ...core.verbIdioms.map(v => v.to),
      ...core.particleVerbs.map(p => p.to),
    ]
    it(`${lang}: every mapped verb exists in at least one game's vocab`, () => {
      const bad = targets.filter(t => !inVocab(t, allVerbs))
      expect(bad).toEqual([])
    })
    it(`${lang}: every prep target is a vocab prep`, () => {
      const bad = Object.values(core.preps).filter(p => !allPreps.has(p))
      expect(bad).toEqual([])
    })
  }
})

describe('noun entries round-trip through the parser (every word, every game)', () => {
  for (const lang of LANGS)
    for (const [name, sig, vocab] of GAMES) {
      const core = coreLexicon(lang)
      const nouns = nounLexicon(lang, sig)!
      // A 'take'-class verb every language has — resolved from the core data
      // itself so the test doesn't hardcode a word per language.
      const takeWord = Object.entries(core.verbs).find(
        ([, to]) => to === 'take',
      )![0]
      it(`${lang}/${name}: every noun word parses to 'take <emit>'`, () => {
        // Guard against a vacuous pass: coverage is enforced in
        // validate.test.ts, but this suite must never silently iterate zero
        // cases, and the verb leg must be a real single-object verb.
        expect(Object.keys(nouns).length).toBeGreaterThan(0)
        expect(vocab.verbs1).toContain('take')

        const failures: string[] = []
        for (const [canonical, words] of Object.entries(nouns)) {
          const entry = vocab.nouns.find(n => n.canonical === canonical)
          if (!entry) {
            failures.push(`${canonical} → no vocab entry`)
            continue
          }
          for (const w of words) {
            // Scope the noun's canonical so AMBIGUOUS words resolve to it —
            // ambiguity policy itself is covered in parse.test.ts. With the
            // canonical in scope every word must resolve to its OWN entry's
            // emit, strictly (no shared-synonym fallback): the prototype run
            // showed all ~2000 entries meet this, so hold the line.
            const scoped: Scene = {
              inScope: [{ canonical }],
              antecedent: null,
            }
            const r = parseLexicon(
              `${takeWord} ${w}`,
              core,
              nouns,
              vocab,
              scoped,
            )
            if (r.kind !== 'command') failures.push(`${w} → miss`)
            else if (r.text !== `take ${entry.emit}`)
              failures.push(`${w} → '${r.text}' (want 'take ${entry.emit}')`)
          }
        }
        expect(failures).toEqual([])
      })
    }
})
