// src/llm/lexicon/types.ts
import type { NlLanguage } from '../types'

/** Languages with lexicons (spec locked decision 1). */
export type LexLang = Exclude<NlLanguage, 'off' | 'en'>

/** German separable verb: leading verb + clause-final particle (spec §5.1). */
export interface ParticleVerb {
  readonly verb: string // e.g. 'schalte'
  readonly particle: string // e.g. 'ein' — closed set: ein/aus/an/auf/zu/ab/um/hoch/runter
  readonly to: string // canonical English verb: 'turn on'
}

/** Game-independent core lexicon. ALL entries are stored diacritic-folded
 * (fold()-normalized); matching is fold-then-compare (spec §5.1/§6). */
export interface CoreLexicon {
  /** Single-word imperative forms players actually type → canonical verb. */
  verbs: Readonly<Record<string, string>>
  /** Contiguous multiword idioms, matched longest-first: 'laisse tomber' → drop. */
  verbIdioms: readonly { readonly phrase: string; readonly to: string }[]
  /** Discontiguous verb+particle patterns (DE; empty for fr/es). */
  particleVerbs: readonly ParticleVerb[]
  /** Foreign preposition → canonical English prep (must be in vocab.preps). */
  preps: Readonly<Record<string, string>>
  /** Determiners stripped at noun-phrase edges. */
  articles: readonly string[]
  /** Direct-object pronouns resolved to the scene antecedent (le/la/ihn/lo…). */
  pronounsDirect: readonly string[]
  /** Container anaphora ('dedans' → in <antecedent>, 'dessus' → on
   * <antecedent>) — F-E guard applies. Each pronoun carries the English
   * preposition it means ([E]): put-in vs put-on is gameplay-meaningful in
   * Zork (surfaces refuse `in`), so 'on top of it' words must never emit
   * `in`. */
  pronounsContainer: readonly {
    readonly word: string
    readonly prep: 'in' | 'on'
  }[]
  /** Self-reference ('moi'/'mich'/'me') → the Z-parser's 'me'. */
  pronounsSelf: readonly string[]
  /** Localized meta words → raw English command (migrates META_ALIASES). */
  metaAliases: Readonly<Record<string, string>>
}

/** Per-game noun lexicon: vocab CANONICAL → foreign surface words/phrases
 * (folded). A word may appear under several canonicals (ambiguity, spec §5.2).
 * Value order within an entry is NOT load-bearing — matching is
 * set-membership; ordering is a style preference only. */
export type NounLexicon = Readonly<Record<string, readonly string[]>>
