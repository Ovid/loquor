// src/llm/lexicon/fold.ts
// Shared normalization for ALL lexicon matching (spec §6 step 1): lowercase,
// NFD diacritic-fold, elision apostrophes and clitic hyphens become spaces,
// terminal punctuation stripped. Lexicon DATA is stored already-folded; input
// is folded before lookup, so 'décends', 'decends' and 'descends' all match.
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’-]/g, ' ')
    .toLowerCase()
    .replace(/[!.?,;:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(s: string): string[] {
  const f = fold(s)
  return f.length === 0 ? [] : f.split(' ')
}
