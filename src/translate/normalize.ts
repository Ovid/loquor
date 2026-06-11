// Shared normalization for table generation AND runtime lookup (spec §4):
// collapse whitespace runs, trim. Case and punctuation are preserved — they
// are part of string identity. Leading indent is structure (nested listings),
// not identity: split it off before lookup, re-apply it to the translation.
export function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function splitIndent(s: string): { indent: string; body: string } {
  const m = /^(\s*)([\s\S]*)$/.exec(s)!
  return { indent: m[1], body: m[2] }
}

/** Lines that must never reach the matcher, the fallback, or the coverage
 * gate: blank lines and the bare '>' the game prints as its line-input
 * prompt — chrome, not prose. Single source of truth so the runtime and the
 * test gates cannot drift (a drift here is exactly how a hallucinated
 * "translation" of '>' once rendered as phantom game output). Takes a
 * NORMALIZED line. */
export function untranslatable(en: string): boolean {
  return en === '' || en === '>'
}
