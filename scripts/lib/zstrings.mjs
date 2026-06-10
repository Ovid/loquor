// Z-machine v3 string decoding + brute-force extraction (output-translation
// spec §4). Pure (bytes in, strings out) so BOTH the extract-strings CLI and
// the corpus inventory gate (vitest) share it. v3 specifics: 3 z-chars per
// word, end on the high bit; chars 1-3 = abbreviations (table word-address at
// header 0x18; may not nest); 4/5 = one-char shifts to A1/A2; A2 char 6 = a
// 10-bit ZSCII literal, char 7 = newline.
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

/** Heuristic text filter for the brute scan: printable, mostly letters. */
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
 * Brute-force scan of the high-memory area (above the high-memory base pointer
 * stored at header 0x04): Z-strings stored as pure data start at proper 2-byte
 * boundaries here, so the garbled-prefix problem is vastly reduced. We still
 * suppress suffix duplicates (a start inside a running string decodes its tail).
 */
function extractHighMemStrings(buf) {
  // High-memory base from header byte 0x04
  const hmem = (buf[0x04] << 8) | buf[0x05]
  const kept = []
  let lastSpan = null
  for (let addr = hmem; addr < buf.length - 1; addr += 2) {
    const r = decodeZString(buf, addr)
    if (r === null) continue
    if (!looksLikeText(r.text)) continue
    if (lastSpan && addr < lastSpan.end && lastSpan.text.endsWith(r.text))
      continue // tail of the string we already kept
    kept.push(r.text)
    if (!lastSpan || r.end > lastSpan.end || addr >= lastSpan.end)
      lastSpan = { end: r.end, text: r.text }
  }
  return kept
}

/**
 * Full extraction: object short names (clean, pointer-driven) plus a brute scan
 * of the high-memory narrative strings.  Returns deduplicated raw z-strings
 * (may contain '\n'; use displayLines to split and normalize).
 */
export function extractStrings(buf) {
  const objNames = extractObjectNames(buf)
  const highMem = extractHighMemStrings(buf)
  return [...new Set([...objNames, ...highMem])]
}

/** Split multi-line z-strings into normalized display lines (spec §4): every
 * corpus key is a single line, the unit the matcher sees. */
export function displayLines(strings) {
  const out = new Set()
  for (const s of strings)
    for (const part of s.split('\n')) {
      const n = part.replace(/\s+/g, ' ').trim()
      if (n) out.add(n)
    }
  return [...out]
}
