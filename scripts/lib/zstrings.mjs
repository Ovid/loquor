// Z-machine v3 string decoding + anchored extraction (output-translation
// spec §4). Pure (bytes in, strings out) so BOTH the extract-strings CLI and
// the corpus inventory gate (vitest) share it. v3 specifics: 3 z-chars per
// word, end on the high bit; chars 1-3 = abbreviations (table word-address at
// header 0x18; may not nest); 4/5 = one-char shifts to A1/A2; A2 char 6 = a
// 10-bit ZSCII literal, char 7 = newline.
//
// Extraction strategy: object-table names plus two anchored passes instead
// of a byte-granular brute scan. The brute scan found every true string but
// also decoded mid-instruction byte offsets into plausible garbage, flooding the
// shape-filtered inventory with ~2.6k entries (target: <2k policed by the
// ignore list). Anchored extraction trades theoretical completeness (computed
// string addresses — rare in Infocom v3 games) for a clean inventory:
//
//   1. Packed-address anchors: every 16-bit big-endian word in the file treated
//      as a v3 packed address (×2). If the target falls in [0x40, fileLen-1],
//      decode there. Catches print_paddr operands and table/property string refs
//      (Infocom's static string area).
//   2. Inline print-literal anchors: every byte equal to 0xB2 (print) or 0xB3
//      (print_ret) — short-form 0OP opcodes whose z-string follows immediately
//      at byte+1. Catches TELL literals at arbitrary byte alignment (e.g. the
//      grue string at odd offset 38107).
const A0 = 'abcdefghijklmnopqrstuvwxyz'
const A1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const A2T = '0123456789.,!?_#\'"/\\-:()' // chars 8..31

export function decodeZString(buf, addr, opts = {}) {
  // 1. Collect z-chars to the end bit.
  const zchars = []
  let i = addr
  for (;;) {
    if (i + 1 >= buf.length) return null
    const w = (buf[i] << 8) | buf[i + 1]
    i += 2
    zchars.push((w >> 10) & 31, (w >> 5) & 31, w & 31)
    if (w & 0x8000) break
    if (zchars.length > 3000) return null // runaway: not a real string
  }
  // 2. Decode.
  const abbrevTable = (buf[0x18] << 8) | buf[0x19]
  let out = ''
  let shift = 0 // 0 = A0, 1 = A1 (next char only), 2 = A2 (next char only)
  for (let k = 0; k < zchars.length; k++) {
    const c = zchars[k]
    const a = shift
    shift = 0
    if (c === 0) {
      out += ' '
      continue
    }
    if (c >= 1 && c <= 3) {
      if (opts.inAbbrev) return null // abbreviations cannot nest
      const n = zchars[++k]
      if (n === undefined) return null
      const entry = abbrevTable + 2 * (32 * (c - 1) + n)
      if (entry + 1 >= buf.length) return null
      const waddr = ((buf[entry] << 8) | buf[entry + 1]) * 2
      if (waddr === 0 || waddr >= buf.length) return null
      const ab = decodeZString(buf, waddr, { inAbbrev: true })
      if (ab === null) return null
      out += ab.text
      continue
    }
    if (c === 4) {
      shift = 1
      continue
    }
    if (c === 5) {
      shift = 2
      continue
    }
    if (a === 0) out += A0[c - 6]
    else if (a === 1) out += A1[c - 6]
    else if (c === 6) {
      const hi = zchars[++k]
      const lo = zchars[++k]
      if (hi === undefined || lo === undefined) return null
      const code = ((hi & 31) << 5) | (lo & 31)
      if (code === 13) out += '\n'
      else if (code >= 32 && code <= 126) out += String.fromCharCode(code)
      else return null
    } else if (c === 7) out += '\n'
    else out += A2T[c - 8]
  }
  return { text: out, end: i }
}

const PRINTABLE = /^[\x20-\x7e\n]*$/

/** Heuristic text filter for the anchored scans: printable, mostly letters. */
export function looksLikeText(s) {
  if (s.length < 4) return false
  if (!PRINTABLE.test(s)) return false
  const letters = (s.match(/[a-zA-Z \n]/g) ?? []).length
  return letters / s.length >= 0.72
}

/**
 * Walk the Z-machine v3 object table (header word at 0x0A) and collect every
 * object short name. Object property blocks start with a one-byte length (in
 * z-words) for the short name; we decode each one directly. This gives us
 * clean room names, item names, and character names without the garbled-prefix
 * artifacts of a naïve brute scan.
 */
function extractObjectNames(buf) {
  const objTable = (buf[0x0a] << 8) | buf[0x0b]
  // Property defaults: 31 words = 62 bytes in v3
  const firstObj = objTable + 62
  const names = []
  for (let i = 0; i < 255; i++) {
    const objAddr = firstObj + i * 9 // v3: 9 bytes per object
    if (objAddr + 9 > buf.length) break
    // Property pointer is bytes 7-8 of the 9-byte entry
    const propPtr = (buf[objAddr + 7] << 8) | buf[objAddr + 8]
    if (propPtr === 0 || propPtr + 1 >= buf.length) continue
    // First byte of property block: name length in z-words
    const nameLen = buf[propPtr]
    if (nameLen === 0) continue
    const nameAddr = propPtr + 1
    const r = decodeZString(buf, nameAddr)
    if (r && r.text.trim().length >= 1) names.push(r.text.trim())
  }
  return names
}

/**
 * Pass 1 — packed-address anchors: treat every 16-bit big-endian word in the
 * file as a v3 packed address (multiply by 2). If the resolved address is in
 * [0x40, fileLen-1] and decodes to a looksLikeText string, keep it. Deduped by
 * address via a Set before collecting. This catches print_paddr operands and
 * table/property-stored string references (Infocom's static string area).
 */
function extractPackedAddrStrings(buf) {
  const seen = new Set()
  const kept = []
  for (let i = 0; i + 1 < buf.length; i++) {
    const word = (buf[i] << 8) | buf[i + 1]
    const addr = word * 2
    if (addr < 0x40 || addr >= buf.length - 1) continue
    if (seen.has(addr)) continue
    seen.add(addr)
    const r = decodeZString(buf, addr)
    if (r === null) continue
    if (!looksLikeText(r.text)) continue
    kept.push(r.text)
  }
  return kept
}

/**
 * Pass 2 — inline print-literal anchors: scan for the short-form 0OP opcodes
 * 0xB2 (print) and 0xB3 (print_ret), whose z-string immediate follows at
 * byte+1. These TELL literals are embedded in z-code at arbitrary byte
 * alignment (not word-aligned) so packed-address scanning misses them (e.g.
 * the "likely to be eaten by a grue" string at odd offset 38107). Decoding at
 * every opcode byte is safe because the opcode is only one byte and the z-string
 * immediately follows.
 */
function extractInlinePrintStrings(buf) {
  const seen = new Set()
  const kept = []
  for (let i = 0; i + 1 < buf.length; i++) {
    const byte = buf[i]
    if (byte !== 0xb2 && byte !== 0xb3) continue
    const addr = i + 1
    if (seen.has(addr)) continue
    seen.add(addr)
    const r = decodeZString(buf, addr)
    if (r === null) continue
    if (!looksLikeText(r.text)) continue
    kept.push(r.text)
  }
  return kept
}

/**
 * Full extraction: object short names (clean, pointer-driven) + packed-address
 * anchors (static string area) + inline print-literal anchors (TELL literals at
 * arbitrary alignment). Returns deduplicated raw z-strings (may contain '\n';
 * use displayLines to split and normalize).
 *
 * Anchored extraction trades theoretical completeness (computed string
 * addresses — rare in Infocom v3 games — would be missed) for a clean
 * inventory. The walkthrough coverage gate catches gameplay lines
 * independently.
 */
export function extractStrings(buf) {
  const objNames = extractObjectNames(buf)
  const packedAddr = extractPackedAddrStrings(buf)
  const inlinePrint = extractInlinePrintStrings(buf)
  const all = [...objNames, ...packedAddr, ...inlinePrint]
  const textSeen = new Set()
  const deduped = []
  for (const s of all) {
    if (!textSeen.has(s)) {
      textSeen.add(s)
      deduped.push(s)
    }
  }
  return deduped
}

/** Split multi-line z-strings into normalized display lines (spec §4): every
 * corpus key is a single line, the unit the matcher sees.
 *
 * The per-line `replace(/\s+/g, ' ').trim()` MUST stay byte-identical to
 * src/translate/normalize.ts's normalize() — the inventory gate's fidelity
 * depends on the extractor and the runtime collapsing whitespace the same way
 * (review S7). An equivalence test (inventory.test.ts) pins this across the
 * .mjs/.ts boundary; do not change one without the other. */
export function displayLines(strings) {
  const out = new Set()
  for (const s of strings)
    for (const part of s.split('\n')) {
      const n = part.replace(/\s+/g, ' ').trim()
      if (n) out.add(n)
    }
  return [...out]
}
