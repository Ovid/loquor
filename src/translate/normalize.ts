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
