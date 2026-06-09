// src/llm/lexicon/index.ts
// Lookup by (language, story signature) + the stage-4 collision guard's word set.
import type { CoreLexicon, NounLexicon, LexLang } from './types'
import { FR_CORE } from './fr.core'
import { DE_CORE } from './de.core'
import { ES_CORE } from './es.core'
import { FR_ZORK1 } from './fr.zork1'
import { FR_ZORK2 } from './fr.zork2'
import { FR_ZORK3 } from './fr.zork3'
import { DE_ZORK1 } from './de.zork1'
import { DE_ZORK2 } from './de.zork2'
import { DE_ZORK3 } from './de.zork3'
import { ES_ZORK1 } from './es.zork1'
import { ES_ZORK2 } from './es.zork2'
import { ES_ZORK3 } from './es.zork3'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../grammar/index'

const CORES: Record<LexLang, CoreLexicon> = {
  fr: FR_CORE,
  de: DE_CORE,
  es: ES_CORE,
}

const NOUNS: Record<LexLang, Record<string, NounLexicon>> = {
  fr: { [ZORK1_SIG]: FR_ZORK1, [ZORK2_SIG]: FR_ZORK2, [ZORK3_SIG]: FR_ZORK3 },
  de: { [ZORK1_SIG]: DE_ZORK1, [ZORK2_SIG]: DE_ZORK2, [ZORK3_SIG]: DE_ZORK3 },
  es: { [ZORK1_SIG]: ES_ZORK1, [ZORK2_SIG]: ES_ZORK2, [ZORK3_SIG]: ES_ZORK3 },
}

export function coreLexicon(lang: LexLang): CoreLexicon {
  return CORES[lang]
}

export function nounLexicon(lang: LexLang, sig: string): NounLexicon | null {
  return NOUNS[lang][sig] ?? null
}

/**
 * Every SOURCE word of the active language's lexicon (folded, split to single
 * tokens). This is the set the stage-4 vocab-passthrough guard CONSUMES: a
 * token in this set does NOT count as "already game vocab" when the picker
 * ≠ English (spec §4 collision guard) — it must go through the lexicon parse
 * instead. The three pronoun arrays are deliberately excluded: pronouns
 * resolve against the scene, never passthrough-shaped.
 */
export function lexiconWordSet(lang: LexLang, sig: string): Set<string> {
  const out = new Set<string>()
  const add = (phrase: string) => {
    for (const w of phrase.split(' ')) if (w) out.add(w)
  }
  const core = CORES[lang]
  for (const k of Object.keys(core.verbs)) add(k)
  for (const v of core.verbIdioms) add(v.phrase)
  for (const p of core.particleVerbs) {
    add(p.verb)
    add(p.particle)
  }
  for (const k of Object.keys(core.preps)) add(k)
  for (const a of core.articles) add(a)
  for (const k of Object.keys(core.metaAliases)) add(k)
  const nouns = NOUNS[lang][sig]
  if (nouns)
    for (const words of Object.values(nouns)) for (const w of words) add(w)
  return out
}

/**
 * Reviewed lexicon↔vocab collisions per (language, signature) (spec §5.2
 * collision report, pushback issue 2). The validation test asserts SET
 * EQUALITY, so any new overlap is a visible authoring decision in this diff,
 * never a silent passthrough hijack. These words route through the lexicon
 * when the picker is that language (stage-4 guard) — verify each entry is
 * what you want.
 *
 * DEVIATION from the plan's `Record<LexLang, readonly string[]>`: noun
 * lexicons are per-game, so genuine collisions differ per game (fr 'troll'
 * exists only in Zork I's vocab, fr 'glacier' only in Zork II's…). Keying by
 * signature keeps the per-game assertion honest instead of unioning.
 */
export const KNOWN_COLLISIONS: Record<
  LexLang,
  Readonly<Record<string, readonly string[]>>
> = {
  // Populated from the first validation run; every word reviewed below.
  //
  // Recurring per language (core lexicon, so they collide in every game):
  //  fr 'a' (prep à vs the English article) · 'examine' (FR imperative spelled
  //    like the English verb) · 'l' (elided article l' vs the parser's
  //    look-abbreviation 'l')
  //  de 'an' (separable particle/prep vs the English article) · 'in' (DE prep
  //    spelled like the English prep) · 'diagnose' (DE metaAlias vs the meta
  //    command) · 'grab' (graben imperative vs the take-synonym 'grab')
  //  es 'a' (prep a) · 'come' (comer imperative vs the parser's 'come') ·
  //    'examine' (usted imperative of examinar)
  fr: {
    [ZORK1_SIG]: [
      'a',
      'air', // 'pompe a air' token vs 'blast of air' synonym 'air'
      'd', // elided d' ('pot d or') vs the movement abbreviation 'd' (down)
      'examine',
      'l',
      'pot', // FR pot (pot d or) vs 'pot of gold' synonym 'pot'
    ],
    [ZORK2_SIG]: [
      'a',
      'd', // elided d' ('pochette d allumettes')
      'dragon', // FR dragon vs 'huge red dragon' synonym 'dragon'
      'examine',
      'l',
    ],
    [ZORK3_SIG]: [
      'a',
      'bronze', // 'porte de bronze' token vs the 'bronze door' adjective
      'examine',
      'l',
      'rose', // 'rose des vents' token vs 'compass rose' synonym 'rose'
    ],
  },
  de: {
    [ZORK1_SIG]: [
      'an',
      'diagnose',
      'gold', // DE Gold ('topf voll gold') vs 'pot of gold' synonym 'gold'
      'grab',
      'in',
      'sack', // DE Sack vs 'brown sack' synonym 'sack'
    ],
    [ZORK2_SIG]: [
      'an',
      'diagnose',
      'grab',
      'hole', // holen imperative (→ take) vs 'keyhole'/'slot' synonym 'hole'
      'in',
    ],
    [ZORK3_SIG]: [
      'an',
      'diagnose',
      'grab',
      'hole', // holen imperative vs the 'hole' canonical's dictionary word
      'in',
    ],
  },
  es: {
    [ZORK1_SIG]: ['a', 'come', 'examine'],
    [ZORK2_SIG]: [
      'a',
      'collar', // ES collar (necklace) vs 'gigantic dog collar' word 'collar'
      'come',
      'dragon', // ES dragón (folded) vs 'huge red dragon' synonym 'dragon'
      'examine',
    ],
    [ZORK3_SIG]: ['a', 'come', 'examine'],
  },
}
