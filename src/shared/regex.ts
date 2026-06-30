// src/shared/regex.ts
/**
 * Escape regex metacharacters so a runtime string can be embedded literally in a
 * `RegExp`. Shared by the input-side scene tracker (word-boundary noun matching,
 * tracker.ts) and the output-side corpus matcher (object-name alternation,
 * match.ts) — peers across the input/output boundary that would otherwise drift
 * if one copy were hardened alone (duplicate-code hunt I1).
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
