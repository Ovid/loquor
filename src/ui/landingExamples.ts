// src/ui/landingExamples.ts
// Localized example commands for the title screen, one set per language.
// Game-INDEPENDENT: every example must parse in BASIC (grammar-only) mode for
// Zork I, II, AND III — enforced by landingExamples.test.ts so a shown example
// can never fail a player who types it. Each set leads with a NATURAL COMPOUND
// (object + movement) to dispel the impression that only two-word commands work.
// No multi-word noun phrase is used: under the game-independent constraint none
// resolves across all three games (see the design doc's "example richness"
// note). The remaining two examples are a simple direction and a single verb.
//
// Keyed by ActiveLanguage (the NL_LANGUAGES source of truth) so adding a play
// language is a compile error here until its examples exist — mirrors
// LANDING_STRINGS, so the two parallel tables can't drift (review I1).
import type { ActiveLanguage } from '../llm/types'

// English examples, named so Georgian (read-Georgian / type-English) can reuse
// them verbatim below without re-stating the strings.
const LANDING_EXAMPLES_EN = ['take the lamp and go north', 'go south', 'look']

export const LANDING_EXAMPLES: Record<ActiveLanguage, string[]> = {
  en: [...LANDING_EXAMPLES_EN],
  fr: ['prends la lampe et va au nord', 'va au sud', 'regarde'],
  de: ['nimm die lampe und geh nach norden', 'geh nach süden', 'schau'],
  es: ['coge la lámpara y ve al norte', 've al sur', 'mira'],
  // Georgian Phase 1 is read-Georgian / type-English: the player types commands
  // in English, so the ka examples ARE the English ones (verbatim). They must
  // never imply Georgian input. RETAINED for Zork II/III (which stay Phase 1);
  // Landing.tsx swaps in LANDING_EXAMPLES_KA_INPUT for Zork I (kaInputActive).
  ka: [...LANDING_EXAMPLES_EN],
}

// Phase-2 Georgian-INPUT examples (spec §5.6), shown by Landing.tsx ONLY when
// `kaInputActive` (Georgian selected AND Zork I — the one game with a ka input
// lexicon). Mirrors the other languages' set: a natural compound (object +
// movement), a bare direction, and a single verb — each parses DETERMINISTICALLY
// via the ka input path on Zork I (no LLM), enforced by landingExamples.test.ts.
// Requires the `და` clause-conjunction and `წადი` go-verb wiring. NATIVE-REVIEW-DRAFT.
export const LANDING_EXAMPLES_KA_INPUT = [
  'აიღე ფარანი და წადი ჩრდილოეთით', // take the lamp and go north
  'წადი სამხრეთით', // go south
  'მიმოიხედე', // look around
]
