// Hand-written declarations for the untyped .mjs decoder so the corpus
// inventory gate (src/translate/corpus/inventory.test.ts) can import it under
// `tsc --noEmit`. Keep in sync with zstrings.mjs (JSDoc'd there).
export function decodeZString(
  buf: Uint8Array,
  addr: number,
  opts?: { inAbbrev?: boolean },
): { text: string; end: number } | null

export function looksLikeText(s: string): boolean

export function extractStrings(buf: Uint8Array): string[]

export function displayLines(strings: readonly string[]): string[]
