// src/llm/lexicon/types.ts

/** Languages with an INPUT lexicon (spec locked decision 1). Deliberately an
 * explicit union, NOT Exclude<NlLanguage, 'off'|'en'> — a picker language can
 * have a display corpus without an input lexicon (Phase 1 Georgian: 'ka' is in
 * NL_LANGUAGES but has no lexicon, so it must NOT be a LexLang). Phase 2 adds
 * 'ka' here when the Georgian input lexicon exists. */
export type LexLang = 'fr' | 'de' | 'es'

/** Languages with an INPUT lexicon. `ka` has one (Phase 2) but must NEVER key the
 *  LLM machinery. The LLM-keyed maps that are STRICT Record<LexLang,…> (so a `ka`
 *  entry is a type error) are `fallbackResolve` and the prompt's per-language
 *  tables; note that `FEWSHOTS` and notices' `ByLang` already widen to optional
 *  `ka` (review S3 — the guarantee is "ka is not REQUIRED in the LLM path", not
 *  "ka is structurally impossible everywhere"). Keep new LLM maps `Record<LexLang>`. */
export type InputLexLang = LexLang | 'ka'

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
  /** "All" quantifier words (folded): a bare-quantifier remainder maps to the
   * Z-parser's ALL object — 'prends tout' → 'take all', 'pose tout' → 'drop
   * all'. Optional: a language without it just falls these to the LLM. */
  quantifiersAll?: readonly string[]
  /** Exclusion words (folded) for the MODIFIED quantifier — 'pose tout SAUF la
   * lampe' → 'drop all except light'. The Z-parser's BUT/EXCEPT; emitted as the
   * canonical 'except'. Optional: a language without it falls the except form to
   * the LLM (the prep form still resolves via `preps`). */
  quantifiersExcept?: readonly string[]
  /** Localized meta words → raw English command (migrates META_ALIASES). */
  metaAliases: Readonly<Record<string, string>>
  /** Georgian postposition suffix (folded, hyphen-free) → canonical English prep.
   *  The English value MUST be in vocab.preps. Present only for languages whose
   *  adpositions are noun-suffixes (Georgian); absent for fr/de/es, so every
   *  expandGeorgian code path is unreachable for them (spec §3.1). */
  postpositions?: Readonly<Record<string, string>>
  /** The CLOSED set of dative-recipient surface forms (folded, the -ს dative form)
   *  the G1 give/tie path may emit a `to <recipient>` for. Georgian dative is -ს,
   *  but several non-recipient noun STEMS natively end in ს (chalice თას, scarab
   *  სკარაბეუს); a bare `.endsWith('ს')` test mistranslated those (C1, plan M3),
   *  so the path gates on membership here instead. Present only for ka (which has
   *  postpositions); absent elsewhere, so the G1 path never fires for fr/de/es. */
  dativeRecipients?: ReadonlySet<string>
}

/** Per-game noun lexicon: vocab CANONICAL → foreign surface words/phrases
 * (folded). A word may appear under several canonicals (ambiguity, spec §5.2).
 * Value order within an entry is NOT load-bearing — matching is
 * set-membership; ordering is a style preference only. */
export type NounLexicon = Readonly<Record<string, readonly string[]>>
