// src/ui/landingExamples.ts
// Localized example commands for the title screen, one set per language.
// Game-INDEPENDENT: every example must parse in BASIC (grammar-only) mode for
// Zork I, II, AND III — enforced by landingExamples.test.ts so a shown example
// can never fail a player who types it. Each set leads with a NATURAL COMPOUND
// (object + movement) to dispel the impression that only two-word commands work.
// No multi-word noun phrase is used: under the game-independent constraint none
// resolves across all three games (see the design doc's "example richness"
// note). The remaining two examples are a simple direction and a single verb.
export const LANDING_EXAMPLES: Record<'en' | 'fr' | 'de' | 'es', string[]> = {
  en: ['take the lamp and go north', 'go south', 'look'],
  fr: ['prends la lampe et va au nord', 'va au sud', 'regarde'],
  de: ['nimm die lampe und geh nach norden', 'geh nach süden', 'schau'],
  es: ['coge la lámpara y ve al norte', 've al sur', 'mira'],
}
