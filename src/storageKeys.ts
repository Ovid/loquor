/**
 * Central registry of every localStorage key Loquor persists (F-15).
 *
 * Before this, each key was a private `const KEY` in its own module and the
 * naming drifted (`loquor-theme` hyphen vs `loquor.nl` / `loquor.xlate.misses`
 * dot), so collision-avoidance and migration relied on per-author discipline.
 *
 * The string VALUES are deliberately preserved as-is, mixed delimiters and all:
 * changing one would orphan an existing user's saved data (theme choice, NL
 * opt-in/decline, corpus miss-log). The registry documents and freezes the keys
 * rather than re-styling them; new keys are added here, never inline.
 *
 * ponytail: a flat frozen object, not a key-builder abstraction — three static
 * keys don't need one. Add a builder only if a key ever becomes parameterized.
 */
export const LS_KEYS = {
  /** Theme choice ('dark' | 'light'). Owner: src/ui/useTheme.ts */
  theme: 'loquor-theme',
  /** NL-layer preference (enabled / declined / language). Owner: src/llm/nlpref.ts */
  nlPref: 'loquor.nl',
  /** Output-translation corpus-miss ring buffer. Owner: src/translate/missLog.ts */
  miss: 'loquor.xlate.misses',
  /** Debug-view preference ('1' = on). Owner: src/ui/useDebug.ts */
  debug: 'loquor.debug',
  /** LLM-fallback preference ('1' = on; absent = off/hidden). Owner: src/ui/useLlmFeature.ts */
  llm: 'loquor.llm',
  /** Write-once marker: the one-time "LLM now hidden" migration notice was shown
   * to a returning opted-in user. Owner: src/ui/Terminal.tsx (M2). */
  llmHiddenNoticeSeen: 'loquor.llm.hiddenNoticeSeen',
} as const
