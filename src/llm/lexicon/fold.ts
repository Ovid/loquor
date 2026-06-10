// src/llm/lexicon/fold.ts
// Shared normalization for ALL lexicon matching (spec §6 step 1): lowercase,
// NFD diacritic-fold, ß → ss, œ/æ → oe/ae, ALL apostrophes and hyphens become
// spaces,
// terminal punctuation stripped. Lexicon DATA is stored already-folded; input
// is folded before lookup, so 'décends', 'decends' and 'descends' all match.
// NOTE: because every hyphen becomes a space, hyphenated English vocab words
// ('trap-door') fold to two tokens — English dictionary words must also be
// fold()-matched at parse time so both sides normalize identically.
// ß is replaced AFTER toLowerCase so ẞ (U+1E9E, which lowercases to ß) is
// covered too; NFD does not decompose ß, so this must be explicit. Same shape
// for the œ/æ ligatures (Œ/Æ are covered via lowercasing).
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’-]/g, ' ')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[¡¿]/g, '')
    .replace(/[!.?,;:]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(s: string): string[] {
  const f = fold(s)
  return f.length === 0 ? [] : f.split(' ')
}
