// scripts/lib/zil.mjs
// A small bracket-aware reader for Infocom ZIL source. It does NOT interpret ZIL
// — it only walks <…> forms, (…) groups, "…" strings, and atoms so the vocab
// generator can extract SYNTAX/OBJECT/DIRECTIONS data. Pure: text in, data out.
//
// Node shapes:
//   { t: 'list', k: '<' | '(', items: Node[] }
//   { t: 'str', v: string }
//   { t: 'atom', v: string }

const WS = new Set([' ', '\t', '\n', '\r', '\f'])
const STRUCT = new Set(['<', '>', '(', ')'])

export function tokenize(src) {
  const toks = []
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (WS.has(c)) {
      i++
      continue
    }
    if (STRUCT.has(c)) {
      toks.push({ type: c })
      i++
      continue
    }
    if (c === ';') {
      toks.push({ type: ';' })
      i++
      continue
    }
    if (c === '"') {
      let j = i + 1
      let s = ''
      while (j < n && src[j] !== '"') {
        if (src[j] === '\\' && j + 1 < n) {
          s += src[j + 1]
          j += 2
        } else {
          s += src[j]
          j++
        }
      }
      if (j >= n) throw new Error('zil tokenize: unterminated string literal')
      toks.push({ type: 'str', v: s })
      i = j + 1
      continue
    }
    // atom: until whitespace/structural/quote/comment; backslash escapes one char
    let j = i
    let a = ''
    while (j < n) {
      const d = src[j]
      if (d === '\\' && j + 1 < n) {
        a += src[j + 1]
        j += 2
        continue
      }
      if (WS.has(d) || STRUCT.has(d) || d === '"' || d === ';') break
      a += d
      j++
    }
    toks.push({ type: 'atom', v: a })
    i = j
  }
  return toks
}

const SKIP = Symbol('skip')

export function readForms(src) {
  const toks = tokenize(src)
  let pos = 0

  function skipDatum() {
    const t = toks[pos]
    if (!t) return
    if (t.type === ';') {
      pos++
      skipDatum()
      return
    }
    if (t.type === '<' || t.type === '(') {
      const close = t.type === '<' ? '>' : ')'
      pos++
      while (toks[pos] && toks[pos].type !== close) skipDatum()
      if (toks[pos]) pos++
      return
    }
    pos++ // atom, str, or stray close
  }

  function readDatum() {
    const t = toks[pos]
    if (!t) return null
    if (t.type === ';') {
      pos++
      skipDatum()
      return SKIP
    }
    if (t.type === '<' || t.type === '(') {
      const k = t.type
      const close = k === '<' ? '>' : ')'
      pos++
      const items = []
      while (toks[pos] && toks[pos].type !== close) {
        const d = readDatum()
        if (d && d !== SKIP) items.push(d)
      }
      if (toks[pos]) pos++ // consume close
      return { t: 'list', k, items }
    }
    if (t.type === '>' || t.type === ')') {
      pos++ // stray close
      return null
    }
    if (t.type === 'str') {
      pos++
      return { t: 'str', v: t.v }
    }
    pos++
    return { t: 'atom', v: t.v }
  }

  const forms = []
  while (pos < toks.length) {
    const d = readDatum()
    if (d && d !== SKIP) forms.push(d)
  }
  return forms
}

export function headAtom(node) {
  if (!node || node.t !== 'list') return ''
  const first = node.items[0]
  return first && first.t === 'atom' ? first.v : ''
}

export function atomAt(node, i) {
  const it = node && node.t === 'list' ? node.items[i] : null
  return it && it.t === 'atom' ? it.v : ''
}

function predTrue(pred, N) {
  if (!pred) return false
  if (pred.t === 'atom') return pred.v === 'T' || pred.v === 'ELSE'
  if (pred.t === 'list' && pred.k === '<') {
    const op = atomAt(pred, 0)
    const k = parseInt(atomAt(pred, pred.items.length - 1), 10)
    if (op === '==?') return N === k
    if (op === 'N==?') return N !== k
  }
  return false
}

export function sortUniq(iterable) {
  return [...new Set(iterable)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

// Canonical prepositions recognized as <SYNONYM …> declaration heads in
// gsyntax.zil (e.g. <SYNONYM WITH USING THROUGH THRU>). The spec defines `preps`
// as these block canonicals PLUS any preposition observed between two OBJECTs, so
// a declared prep like `under` — used only as a one-object particle ("look
// under"), never inter-object — is not silently dropped. A SYNONYM whose head is
// NOT in this set (e.g. <SYNONYM ATTACK …>) is a verb/noun synonym and ignored;
// the canonical is the block head (first token), so `through`/`thru` stay
// synonyms of `with`, not separate preps (matches the committed vocab).
const PREP_HEADS = new Set([
  'with', 'in', 'on', 'under', 'to', 'at', 'over', 'through', 'from',
  'behind', 'across', 'around', 'off',
])

// From the active SYNTAX rules for game N: verb-only canonicals (minus meta),
// one-object verbs (verbs1, multiword particles preserved), two-object verbs
// (verbs2), and the prepositions — the <SYNONYM …> prep-block heads UNION any
// preposition that sits between two OBJECTs.
export function extractVerbsAndPreps(forms, N, metaSet) {
  const active = activeForms(forms, N)
  const verbsOnly = new Set()
  const verbs1 = new Set()
  const verbs2 = new Set()
  const preps = new Set()
  const excludedMeta = new Set()

  for (const f of active) {
    if (headAtom(f) !== 'SYNTAX') continue
    // Pre-"=" atom sequence; (flag) paren groups are skipped.
    const seq = []
    for (let i = 1; i < f.items.length; i++) {
      const it = f.items[i]
      if (it.t === 'atom' && it.v === '=') break
      if (it.t === 'atom') seq.push(it.v)
    }
    if (seq.length === 0) continue
    const verb = seq[0].toLowerCase()
    if (/[#$]/.test(verb)) continue // debug verbs ($verify, #command)

    const objIdx = []
    for (let i = 1; i < seq.length; i++) if (seq[i] === 'OBJECT') objIdx.push(i)

    if (objIdx.length === 0) {
      if (metaSet.has(verb)) excludedMeta.add(verb)
      else verbsOnly.add(verb)
    } else if (objIdx.length === 1) {
      const particles = seq.slice(1, objIdx[0]).map(s => s.toLowerCase())
      verbs1.add([verb, ...particles].join(' '))
    } else {
      const particles = seq.slice(1, objIdx[0]).map(s => s.toLowerCase())
      verbs2.add([verb, ...particles].join(' '))
      for (const p of seq.slice(objIdx[0] + 1, objIdx[1])) preps.add(p.toLowerCase())
    }
  }

  // Prep-class declarations: <SYNONYM WITH …>/<SYNONYM IN …>/… The block head is
  // the canonical prep; union it into preps so declared-but-not-inter-object preps
  // (e.g. `under`) survive. Non-prep SYNONYM heads (verb/noun synonyms) are skipped.
  for (const f of active) {
    if (headAtom(f) !== 'SYNONYM') continue
    const head = atomAt(f, 1).toLowerCase()
    if (PREP_HEADS.has(head)) preps.add(head)
  }

  return {
    verbsOnly: sortUniq(verbsOnly),
    verbs1: sortUniq(verbs1),
    verbs2: sortUniq(verbs2),
    preps: sortUniq(preps),
    excludedMeta: sortUniq(excludedMeta),
  }
}

// Flatten top-level forms for game N, descending into <COND> and taking the
// first true branch's body. Non-COND forms pass through unchanged.
export function activeForms(forms, N) {
  const out = []
  const visit = (node) => {
    if (!node || node.t !== 'list' || node.k !== '<') return
    if (headAtom(node) === 'COND') {
      for (let i = 1; i < node.items.length; i++) {
        const branch = node.items[i]
        if (branch.t === 'list' && branch.k === '(' && predTrue(branch.items[0], N)) {
          for (let j = 1; j < branch.items.length; j++) visit(branch.items[j])
          break // first true branch wins
        }
      }
      return
    }
    out.push(node)
  }
  for (const f of forms) visit(f)
  return out
}
