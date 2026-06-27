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
import type { InputLexLang } from './types'
import type { Vocab } from '../grammar/types'
import type { Scene } from '../scene/types'

const GAMES: [string, string, Vocab][] = [
  ['zork1', ZORK1_SIG, ZORK1_VOCAB],
  ['zork2', ZORK2_SIG, ZORK2_VOCAB],
  ['zork3', ZORK3_SIG, ZORK3_VOCAB],
]
const LANGS: InputLexLang[] = ['fr', 'de', 'es', 'ka']

// The form to FEED the parser for a stored lexicon value `w`, per language.
//
// fr/de/es store the literal surface a player types, so the input IS the stored
// value (identity). ka is different: its stored values are the BARE-STEM form
// `expandGeorgian` PRODUCES (nominative -ი dropped, postpositions split off),
// NOT the form a player types. A Georgian player types the nominative citation
// form (`ჩირაღდანი` torch, `ქოთანი` pot), which `parseLexicon`'s ka pre-stage
// reduces back to the stored stem (`ჩირაღდან`, `ქოთან`) before resolving —
// verified: `აიღე ჩირაღდანი` → `take torch`.
//
// So feeding the stored STEM straight in would double-apply `expandGeorgian`:
// `ჩირაღდან`/`ქოთან` end in postposition-lookalikes (-დან ablative, -თან
// adessive), so the second pass SPLITS them (`[დან, ჩირაღ]`) and the noun
// misses. This is the SAME hazard the corpus round-trip already documents (the
// M2 finding, Task 10): never re-apply the postposition split to an already-
// reduced stem. There the display form is REDUCED to the stem; here the stem is
// lifted back to the player's NOMINATIVE input by re-attaching -ი to a
// consonant-final last token (the inverse of expandGeorgian's -ი strip;
// vowel-final stems are citation forms already and keep their shape). The
// parser's own ka pre-stage then reduces it back to the stored stem, so this
// gate verifies the realistic round-trip: player nominative → stored stem → emit.
const GEORGIAN_VOWELS = new Set(['ა', 'ე', 'ი', 'ო', 'უ'])
function toInputForm(lang: InputLexLang, w: string): string {
  if (lang !== 'ka') return w
  const toks = w.split(' ')
  const last = toks[toks.length - 1]
  if (last && !GEORGIAN_VOWELS.has(last[last.length - 1]))
    toks[toks.length - 1] = last + 'ი'
  return toks.join(' ')
}

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
      const nouns = nounLexicon(lang, sig)
      // ka has a noun lexicon only for Zork I (NOUNS.ka = { [ZORK1_SIG]: … }),
      // so skip ka × {zork2,zork3} (null lexicon) — issue-1.
      if (!nouns) {
        it(`${lang}/${name}: no lexicon (skipped)`, () =>
          expect(true).toBe(true))
        continue
      }
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
            // Feed the player-input form (identity for fr/de/es; nominative
            // citation form for ka — see toInputForm). `parseLexicon`'s ka
            // pre-stage reduces it back to the stored stem before resolving.
            const input = toInputForm(lang, w)
            const r = parseLexicon(
              `${takeWord} ${input}`,
              core,
              nouns,
              vocab,
              scoped,
            )
            const as = input === w ? '' : ` (as ${input})`
            if (r.kind !== 'command') failures.push(`${w}${as} → miss`)
            else if (r.text !== `take ${entry.emit}`)
              failures.push(
                `${w}${as} → '${r.text}' (want 'take ${entry.emit}')`,
              )
          }
        }
        expect(failures).toEqual([])
      })
    }
})

// F2 collision lock (review I2). The dative `-ს` strip (parse.ts) fires only when
// the as-is lookup misses, then drops one trailing `-ს` and retries. It is
// trailing-`-ს` recovery (dative + genitive), and the design's safety rests on
// "no stored surface + `-ს` resolves to a DIFFERENT noun." ka has no LLM net, so
// that invariant must be a gate, not a comment: brute-force `surface + 'ს'` across
// every stored noun and assert it recovers the SAME noun or misses — never a wrong
// one. A future ka.zork1 entry whose `surface + 'ს'` collided would redden here.
describe('ka dative `-ს` strip never resolves to a wrong noun (F2 collision lock, I2)', () => {
  it('the dative `-ს` form of any stored ka/zork1 noun resolves like its nominative (or misses)', () => {
    const core = coreLexicon('ka')
    const nouns = nounLexicon('ka', ZORK1_SIG)!
    const takeWord = Object.entries(core.verbs).find(
      ([, to]) => to === 'take',
    )![0]
    // Every noun in scope so a genuine cross-noun collision surfaces (scoping to
    // one canonical would mask it); an ambiguous span emits the shared Z-parser
    // dictionary word (ღილაკ → 'button') — the documented disambiguation path.
    const allInScope: Scene = {
      inScope: ZORK1_VOCAB.nouns.map(n => ({ canonical: n.canonical })),
      antecedent: null,
    }
    const parse = (s: string) =>
      parseLexicon(`${takeWord} ${s}`, core, nouns, ZORK1_VOCAB, allInScope)
    const failures: string[] = []
    for (const words of Object.values(nouns))
      for (const w of words) {
        // The dative (`w`+ს) and the player's nominative (toInputForm) are the SAME
        // noun. The roundtrip gate above proves the nominative resolves correctly;
        // the strip must recover that exact emit, or miss — never a different noun.
        const nom = parse(toInputForm('ka', w))
        const dat = parse(`${w}ს`)
        if (dat.kind !== 'command') continue // miss is fine (recovery is best-effort)
        const want = nom.kind === 'command' ? nom.text : '(nominative miss)'
        if (dat.text !== want)
          failures.push(`${w}ს → '${dat.text}' (nominative gives '${want}')`)
      }
    expect(failures).toEqual([])
  })
})
