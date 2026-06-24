// src/llm/directions.ts
// Deterministic, multilingual direction fast-path. Movement is a tiny CLOSED set,
// it is the highest-frequency command in play, and it was broken in BOTH languages
// on the small model (UAT F8: French "sud-est" -> south; the English nonsense
// "southeast" -> "move random object" is separately killed by the R1 phantom fix).
// Resolving directions in code makes them correct in every listed language AND
// skips the 8-11s model round-trip. Unlike open-ended verb/noun translation (the
// model's job), the closed direction set is worth maintaining by hand.

// Strip diacritics + lowercase + trailing punctuation so "Süd-Ost!" == "sud-ost".
// Apostrophes (ASCII or typographic) become spaces so the French elided article
// splits off: "l'est" → "l est" → LEAD strips "l" → "est" (review C2).
function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, ' ')
    .toLowerCase()
    .replace(/[!.?]+$/, '')
    .trim()
}

// Surface word (diacritic-stripped, hyphen-free) -> canonical English direction.
// Covers en/fr/de/es/ka; extend DIRECTION_WORDS/LEAD for more languages.
const DIRECTION_WORDS: Readonly<Record<string, string>> = {
  // north
  north: 'north',
  n: 'north',
  nord: 'north',
  norden: 'north',
  norte: 'north',
  'ჩრდილოეთი': 'north',   // ka nominative
  'ჩრდილოეთით': 'north',  // ka adverbial -ით form
  // south
  south: 'south',
  s: 'south',
  sud: 'south',
  suden: 'south',
  sur: 'south',
  'სამხრეთი': 'south',    // ka nominative
  'სამხრეთით': 'south',   // ka adverbial -ით form
  // east  (note: French "est" also means "is" — a bare command "est" -> east is fine)
  east: 'east',
  e: 'east',
  est: 'east',
  osten: 'east',
  este: 'east',
  'აღმოსავლეთი': 'east',  // ka nominative
  'აღმოსავლეთით': 'east', // ka adverbial -ით form
  // west
  west: 'west',
  w: 'west',
  ouest: 'west',
  westen: 'west',
  oeste: 'west',
  'დასავლეთი': 'west',    // ka nominative
  'დასავლეთით': 'west',   // ka adverbial -ით form
  // up
  up: 'up',
  u: 'up',
  upstairs: 'up',
  haut: 'up',
  enhaut: 'up',
  monte: 'up',
  oben: 'up',
  hoch: 'up',
  arriba: 'up',
  sube: 'up',
  'ზემოთ': 'up',          // ka (also serves as adverbial form)
  'მაღლა': 'up',          // ka alternative
  // down
  down: 'down',
  d: 'down',
  downstairs: 'down',
  bas: 'down',
  enbas: 'down',
  descends: 'down',
  descend: 'down',
  unten: 'down',
  runter: 'down',
  abajo: 'down',
  baja: 'down',
  'ქვემოთ': 'down',       // ka (also serves as adverbial form)
  'დაბლა': 'down',        // ka alternative
  // in / out
  in: 'in',
  dedans: 'in',
  rein: 'in',
  dentro: 'in',
  'შიგნით': 'in',         // ka adverbial-ით form (primary)
  out: 'out',
  dehors: 'out',
  raus: 'out',
  fuera: 'out',
  'გარეთ': 'out',         // ka
  // diagonals
  northeast: 'northeast',
  ne: 'northeast',
  nordest: 'northeast',
  nordosten: 'northeast',
  noreste: 'northeast',
  nordeste: 'northeast',
  'ჩრდილოაღმოსავლეთი': 'northeast',  // ka
  'ჩრდილოაღმოსავლეთით': 'northeast', // ka adverbial -ით form
  northwest: 'northwest',
  nw: 'northwest',
  nordouest: 'northwest',
  nordwesten: 'northwest',
  noroeste: 'northwest',
  'ჩრდილოდასავლეთი': 'northwest',    // ka
  'ჩრდილოდასავლეთით': 'northwest',   // ka adverbial -ით form
  southeast: 'southeast',
  se: 'southeast',
  sudest: 'southeast',
  sudosten: 'southeast',
  sureste: 'southeast',
  sudeste: 'southeast',
  'სამხრეთაღმოსავლეთი': 'southeast', // ka
  'სამხრეთაღმოსავლეთით': 'southeast', // ka adverbial -ით form
  southwest: 'southwest',
  sw: 'southwest',
  sudouest: 'southwest',
  sudwesten: 'southwest',
  suroeste: 'southwest',
  sudoeste: 'southwest',
  'სამხრეთდასავლეთი': 'southwest',   // ka
  'სამხრეთდასავლეთით': 'southwest',  // ka adverbial -ით form
}

// Leading movement verbs + connectors stripped before the direction word. Safe to
// strip aggressively because the remainder must still resolve to a known direction
// (so "move rug" -> "rug" -> no match -> null, never a spurious direction).
const LEAD = new Set([
  // English
  'go',
  'walk',
  'head',
  'move',
  'run',
  'travel',
  'proceed',
  'to',
  'the',
  // French
  'va',
  'vas',
  'vais',
  'allez',
  'aller',
  'marche',
  'vers',
  'au',
  'aux',
  'a',
  'la',
  'le',
  'les',
  'l',
  'du',
  'de',
  // German
  'geh',
  'gehe',
  'laufe',
  'nach',
  'zum',
  'zur',
  'im',
  // Spanish
  've',
  'vete',
  'anda',
  'andar',
  'ir',
  'camina',
  'caminar',
  'hacia',
  'al',
  'el',
])

/**
 * Resolve a whole input to a canonical English movement verb, or null if it is
 * not a pure direction command. Gated on `movement` so we never emit a direction
 * this game doesn't support. Covers en/fr/de/es/ka; extend DIRECTION_WORDS/LEAD
 * for more languages.
 */
export function parseDirection(
  input: string,
  movement: readonly string[],
): string | null {
  const tokens = normalize(input).split(/\s+/).filter(Boolean)
  let i = 0
  while (i < tokens.length && LEAD.has(tokens[i])) i++
  const rest = tokens.slice(i)
  if (rest.length === 0) return null
  const compact = rest.join('').replace(/-/g, '')
  const canon = DIRECTION_WORDS[compact]
  if (!canon) return null
  return movement.includes(canon) ? canon : null
}
