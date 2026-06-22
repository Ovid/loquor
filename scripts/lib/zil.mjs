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
// NOT in this set (e.g. <SYNONYM ATTACK …>) is a verb/direction synonym block
// whose members are retained as `verbSynonyms` (NL v2 §9);
// the canonical is the block head (first token), so `through`/`thru` stay
// synonyms of `with`, not separate preps (matches the committed vocab).
const PREP_HEADS = new Set([
  'with',
  'in',
  'on',
  'under',
  'to',
  'at',
  'over',
  'through',
  'from',
  'behind',
  'across',
  'around',
  'off',
])

// v3 dictionary words truncate to 6 characters, and a few gsyntax.zil SYNTAX verb
// HEADS were authored in that truncated form (the lone case across Zork I/II/III is
// INFLAT, from `<SYNTAX INFLAT OBJECT WITH OBJECT …>`). The extractor must emit the
// FULL in-game spelling the Z-parser actually accepts ('inflate'), or the English
// vocab-passthrough gate — which exact-matches tokens — misses the word a player
// types ('inflate'), routing every inflate command to the warm LLM, which mangles it
// (UAT BUG C: 'inflate plastic with pump' → 'turn on pump', breaking the magic-boat
// puzzle). Sibling verb heads (DEFLATE, EXTINGUISH, LAUNCH) are already full in the
// ZIL, so they need no entry. NOTE: this remaps only SYNTAX verb HEADS — the truncated
// 'inflat' ADJECTIVE on the boat object is a real dictionary word and is untouched.
const VERB_HEAD_DETRUNCATIONS = { inflat: 'inflate' }

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
    const rawVerb = seq[0].toLowerCase()
    if (/[#$]/.test(rawVerb)) continue // debug verbs ($verify, #command)
    const verb = VERB_HEAD_DETRUNCATIONS[rawVerb] ?? rawVerb

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
      for (const p of seq.slice(objIdx[0] + 1, objIdx[1]))
        preps.add(p.toLowerCase())
    }
  }

  // Prep-class declarations: <SYNONYM WITH …>/<SYNONYM IN …>/… The block head is
  // the canonical prep; union it into preps so declared-but-not-inter-object preps
  // (e.g. `under`) survive. The block MEMBERS (inside/into/onto/underneath/beneath/
  // below/using/through/thru) are real prep dictionary words the Z-parser accepts
  // wherever the head is accepted (<SYNONYM IN INSIDE INTO>), so they are retained
  // in `preps` too — otherwise the English vocab-passthrough gate (vocabWordSet)
  // misses the literal word a player types and routes the command to the warm LLM,
  // which mangles it (UAT: 'put painting into case' → 'take painting'; 'look
  // underneath rug' → 'look'). Same class as the BUG C verb-head gap above. The
  // fr/de/es lexicon is unaffected: it maps foreign preps to the CANONICAL head, so
  // it never emits a synonym. Non-prep SYNONYM heads are verb/direction synonym
  // blocks whose members we retain as verbSynonyms (NL v2 §9).
  const verbSynonyms = new Set()
  for (const f of active) {
    if (headAtom(f) !== 'SYNONYM') continue
    const head = atomAt(f, 1).toLowerCase()
    if (PREP_HEADS.has(head)) {
      preps.add(head)
      for (let i = 2; i < f.items.length; i++) {
        const it = f.items[i]
        if (it.t === 'atom') preps.add(it.v.toLowerCase())
      }
      continue
    }
    // Verb/direction synonym block: members are parser dictionary words the
    // Z-machine accepts wherever the head is accepted (ulysses, fight, i, q,
    // n/s/e/w …). Retained so stage-4 vocab passthrough recognizes them.
    for (let i = 2; i < f.items.length; i++) {
      const it = f.items[i]
      if (it.t === 'atom') verbSynonyms.add(it.v.toLowerCase())
    }
  }

  return {
    verbsOnly: sortUniq(verbsOnly),
    verbs1: sortUniq(verbs1),
    verbs2: sortUniq(verbs2),
    preps: sortUniq(preps),
    verbSynonyms: sortUniq(verbSynonyms),
    excludedMeta: sortUniq(excludedMeta),
  }
}

const DIR_MAP = {
  NE: 'northeast',
  NW: 'northwest',
  SE: 'southeast',
  SW: 'southwest',
}

// The game's own <DIRECTIONS …> declaration (in <N>dungeon.zil), normalized to
// full lowercase names. enter/exit are NOT directions here — they are verb-only
// verbs (V-ENTER/V-EXIT) extracted from SYNTAX.
export function extractDirections(dungeonSrc) {
  const forms = readForms(dungeonSrc)
  const d = forms.find(
    f => f.t === 'list' && f.k === '<' && headAtom(f) === 'DIRECTIONS',
  )
  if (!d) return []
  const dirs = d.items
    .slice(1)
    .filter(x => x.t === 'atom')
    .map(x => DIR_MAP[x.v] || x.v.toLowerCase())
  return sortUniq(dirs)
}

// ZIL parser pseudo-objects: standard Infocom sentinels in gglobals.zil (shared
// by Zork I/II/III) that exist for the parser's own use, never as player-
// targetable nouns. They each carry a DESC, so the "no DESC and no SYNONYM" skip
// does NOT catch them — they were leaking into every in-scope noun set and the
// model snapped unmapped words onto them (UAT R1: southeast -> "move random
// object"). Matched by stable ZIL object name — NOT by flags: TOOLBIT is a real
// game flag for usable tools (shovel/wrench/key/knife) so it cannot be filtered,
// and ACTORBIT (combat NPCs: troll/thief/cyclops) and INVISIBLE (objects that
// start hidden then become referenceable) likewise mark objects we must keep.
const PSEUDO_OBJECT_NAMES = new Set([
  'IT', // DESC "random object" — pronoun anaphora (it/them/her/him)
  'ADVENTURER', // DESC "cretin" — the player avatar
  'ME', // DESC "you" — the player self-reference (me/myself/self/cretin)
  'INTNUM', // DESC "number" — the parser's number interface (TOOLBIT)
  'INTDIR', // DESC "direction" — the parser's direction interface (TOOLBIT)
  'PSEUDO-OBJECT', // DESC "pseudo" — parser placeholder
  'NOT-HERE-OBJECT', // DESC "such thing" — parser "not here" sentinel
  'GLOBAL-OBJECTS', // global container (no DESC anyway, but pin it)
  'LOCAL-GLOBALS', // DESC-less local-globals container (SYNONYM ZZMGCK)
])

// Manual emit overrides for objects with no unique synonym/adjective combo.
// Keyed by game number then canonical. Adding an entry is the documented
// resolution when computeEmit throws (NL v2 spec §9).
const EMIT_OVERRIDES = {
  1: {
    // GLOBAL-WATER (SYNONYM WATER QUANTITY, no adjectives) shares every word
    // with WATER-in-bottle "quantity of water" (which self-resolves to its
    // unique LIQUID). 'water' is a real dictionary word of this object and the
    // natural phrase to send; the Z-parser scope-disambiguates the two.
    water: 'water',
    // BELL (SYNONYM BELL, ADJ SMALL BRASS) vs HOT-BELL (ADJ BRASS HOT RED
    // SMALL): the same physical bell before/after Hades heats it — every BELL
    // combo is shadowed, HOT-BELL self-resolves via 'hot bell'. The two never
    // coexist in scope, so the bare dictionary word is unambiguous in play.
    'brass bell': 'bell',
    // ATTIC-TABLE (SYNONYM TABLE, no adjectives) vs KITCHEN-TABLE (which
    // self-resolves via 'kitchen table'). Different rooms, never co-scoped.
    table: 'table',
    // SAND (SYNONYM SAND, no adjectives) is shadowed by the everywhere-global
    // GROUND (SYNONYM GROUND SAND DIRT FLOOR), which self-resolves as
    // 'ground'. 'sand' is the word the classic dig puzzle expects.
    sand: 'sand',
    // MACHINE-SWITCH (SYNONYM SWITCH, no adjectives) vs the maintenance-room
    // buttons that also answer to SWITCH but self-resolve via their color
    // adjectives. Machine room vs maintenance room — never co-scoped.
    switch: 'switch',
    // CANARY (ADJ CLOCKWORK GOLD GOLDEN) is fully shadowed by BROKEN-CANARY
    // (ADJ BROKEN CLOCKWORK GOLD GOLDEN — a strict superset), which
    // self-resolves via 'broken canary'. Intact/broken never coexist.
    'golden clockwork canary': 'canary',
  },
  2: {
    // Zork II has THREE water objects: GLOBAL-WATER "water" (SYNONYM WATER
    // QUANTITY), WATER "quantity of water" and SALTY-WATER "quantity of salty
    // water" (both SYNONYM WATER QUANTITY LIQUID H2O — identical dictionaries,
    // no adjectives; the ZIL has no SALTY word). No unique combos exist, so
    // the emits split the real dictionary words: rivers/lakes get the natural
    // 'water'; the two carryables take LIQUID/H2O and rely on Z-parser scope
    // disambiguation (they are never co-located in play).
    water: 'water',
    'quantity of water': 'liquid',
    'quantity of salty water': 'h2o',
    // DRAGON (ADJ RED HUGE) is fully shadowed by DEAD-DRAGON (ADJ RED HUGE
    // DEAD — strict superset), which self-resolves via 'dead dragon'.
    // Live/dead never coexist in scope.
    'huge red dragon': 'dragon',
    // WIZARD-CASE (SYNONYM CASE CABINET, ADJ TROPHY WIZARD) is fully shadowed
    // by BROKEN-CASE (ADJ BROKEN TROPHY WIZARD — strict superset), which
    // self-resolves via 'broken case'. Intact/smashed never coexist.
    "wizard's trophy cabinet": 'cabinet',
    // SERPENT (SYNONYM SERPENT SNAKE, ADJ BABY SEA) is fully shadowed by
    // DEAD-SERPENT (ADJ DEAD BABY SEA — strict superset), which self-resolves
    // via 'dead serpent'. Live/dead never coexist.
    'baby sea serpent': 'serpent',
    // LAMP (SYNONYM LAMP LANTERN LIGHT, ADJ BRASS) is fully shadowed by
    // BROKEN-LAMP (ADJ BROKEN BRASS — strict superset; self-resolves via
    // 'broken lamp') plus the curtain-of-light sharing LIGHT. Working/broken
    // lamps never coexist.
    lamp: 'lamp',
    // PDOOR (SYNONYM DOOR, ADJ WOODEN OAK) is fully shadowed by WIZ-DOOR
    // (ADJ COBWEBBED WOODEN OAK — strict superset), which self-resolves via
    // 'cobwebbed door'. Both are local-globals of disjoint rooms, so the real
    // adjective+synonym phrase 'oak door' is unambiguous in play.
    'door made of oak': 'oak door',
    // GLOBAL-PALANTIR (SYNONYM SPHERE, ADJ RED BLUE WHITE CRYSTAL) is the
    // local-global stand-in for whichever sphere a room mentions; every combo
    // is shared with a real colored sphere (each of which self-resolves via
    // its color). The bare word defers to Z-parser scope resolution.
    sphere: 'sphere',
    // FOOTPAD (SYNONYM FOOTPAD, easter egg "a footpad is a thief") shares its
    // only word with the global SAILOR sentinel (SYNONYM SAILOR FOOTPAD
    // AVIATOR), which self-resolves via 'sailor'.
    footpad: 'footpad',
    // ZORKMID (global currency easter egg, SYNONYM ZORKMID) shares its only
    // word with COIN "priceless zorkmid", which self-resolves via 'coin'.
    zorkmid: 'zorkmid',
  },
  3: {
    // Same shape as Zork I: GLOBAL-WATER "water" (SYNONYM WATER QUANTITY)
    // shares every word with WATER "quantity of water", which self-resolves
    // via its unique LIQUID. 'water' is the natural phrase; the Z-parser
    // scope-disambiguates.
    water: 'water',
    // LAMP (SYNONYM LAMP LANTERN, ADJ BRASS) is fully shadowed by BROKEN-LAMP
    // (ADJ BROKEN BRASS — strict superset), which self-resolves via
    // 'broken lamp'. Working/broken lamps never coexist.
    lamp: 'lamp',
    // PANEL / DUNGEON-PANEL (local-globals, SYNONYM PANEL only) collide with
    // the mirror-box colored panels, which all self-resolve via their color
    // adjectives. Bare word defers to Z-parser scope resolution.
    panel: 'panel',
    // DUNGEON-DOOR (SYNONYM DOOR, ADJ WOOD WOODEN) is fully shadowed by
    // CELL-DOOR (ADJ WOOD WOODEN CELL — strict superset), which self-resolves
    // via 'cell door'. Local-globals of disjoint endgame rooms, so the real
    // adjective+synonym phrase 'wooden door' is unambiguous in play.
    'wooden door': 'wooden door',
  },
}

// Deterministic emit search (spec §9): each synonym bare in DECLARATION order
// (head first), then synonym × adjective pairs in declaration order; first
// game-unique combination wins. No unique form → build error naming the
// colliders. DESC-only sentinels (no synonyms) fall back to the canonical.
export function computeEmit(entry, all, override) {
  if (override) {
    // An override must be spelled from the entry's own dictionary words —
    // anything else would emit a phrase the Z-parser can't bind to the object.
    const allowed = new Set([
      ...entry.synDecl,
      ...entry.adjDecl,
      entry.canonical,
    ])
    for (const w of override.split(/\s+/))
      if (!allowed.has(w))
        throw new Error(
          `computeEmit: override "${override}" for "${entry.canonical}" uses ` +
            `"${w}", which is not among its dictionary words ` +
            `(${[...allowed].join(', ')})`,
        )
    return override
  }
  if (entry.synDecl.length === 0) return entry.canonical
  const others = all.filter(e => e !== entry)
  for (const s of entry.synDecl)
    if (!others.some(o => o.synDecl.includes(s))) return s
  for (const s of entry.synDecl)
    for (const a of entry.adjDecl) {
      if (!others.some(o => o.synDecl.includes(s) && o.adjDecl.includes(a)))
        return `${a} ${s}`
    }
  const colliders = others
    .filter(o => o.synDecl.some(s => entry.synDecl.includes(s)))
    .map(o => o.canonical)
  throw new Error(
    `computeEmit: no unique form for "${entry.canonical}" ` +
      `(collides with: ${colliders.join(', ')}) — add an EMIT_OVERRIDES entry`,
  )
}

// Every <OBJECT …> in the dungeon + globals sources, mapped to a NounEntry.
// <ROOM …> blocks are excluded (different head). Canonical = DESC text (or first
// SYNONYM if no DESC); sentinels with neither are skipped, as are the parser
// pseudo-objects named in PSEUDO_OBJECT_NAMES above. Each noun also gets an
// `emit` — the shortest game-unique parser name (computeEmit, spec §9).
// N is the game number (1–3) selecting the EMIT_OVERRIDES table; omitted ⇒ no
// overrides (fixture mode, used by unit tests). Generation-time invariants are
// enforced here: every override key must match an extracted canonical, and the
// final emits must be unique within the game.
export function extractNouns(dungeonSrc, globalsSrc, N, mergeLog = []) {
  const forms = [...readForms(dungeonSrc), ...readForms(globalsSrc)]
  const out = []
  const byCanonical = new Map()

  for (const f of forms) {
    if (f.t !== 'list' || f.k !== '<' || headAtom(f) !== 'OBJECT') continue
    if (PSEUDO_OBJECT_NAMES.has(atomAt(f, 1))) continue
    let desc = null
    let syn = []
    let adj = []
    for (const it of f.items) {
      if (it.t !== 'list' || it.k !== '(') continue
      const tag = headAtom(it)
      if (tag === 'DESC') {
        const s = it.items.find(x => x.t === 'str')
        if (s) desc = s.v
      } else if (tag === 'SYNONYM') {
        syn = it.items
          .slice(1)
          .filter(x => x.t === 'atom')
          .map(x => x.v.toLowerCase())
      } else if (tag === 'ADJECTIVE') {
        adj = it.items
          .slice(1)
          .filter(x => x.t === 'atom')
          .map(x => x.v.toLowerCase())
      }
    }
    const canonical = desc ? desc.toLowerCase() : syn[0] || null
    if (!canonical) continue
    const existing = byCanonical.get(canonical)
    if (existing) {
      // [G] Two <OBJECT>s legitimately share a canonical DESC (zork2's
      // PTABLE/GAZEBO-TABLE, zork3's cell doors…). First-wins dedupe dropped
      // the later object WHOLESALE — its dictionary words vanished from
      // vocabWordSet (stage-4 passthrough), noun surface matching, and the
      // emit-uniqueness computation, with no warning. Merge instead,
      // appending unseen words so the first declaration's order is kept
      // (computeEmit walks synDecl/adjDecl in order), and report the merge
      // for the generator's reconciliation log.
      const mergedSynonyms = syn.filter(s => !existing.synDecl.includes(s))
      const mergedAdjectives = adj.filter(a => !existing.adjDecl.includes(a))
      existing.synDecl.push(...mergedSynonyms)
      existing.adjDecl.push(...mergedAdjectives)
      mergeLog.push({ canonical, mergedSynonyms, mergedAdjectives })
      continue
    }
    const entry = { canonical, synDecl: syn, adjDecl: adj }
    byCanonical.set(canonical, entry)
    out.push(entry)
  }

  const overrides = EMIT_OVERRIDES[N] ?? {}
  const consumed = new Set()
  for (const e of out) {
    const override = overrides[e.canonical]
    if (override !== undefined) consumed.add(e.canonical)
    e.emit = computeEmit(e, out, override)
  }

  // Stale/typo'd override keys would otherwise rot silently as the ZIL data
  // (or canonical derivation) changes — fail generation, naming them.
  const unconsumed = Object.keys(overrides).filter(k => !consumed.has(k))
  if (unconsumed.length > 0)
    throw new Error(
      `extractNouns: EMIT_OVERRIDES[${N}] keys matched no object: ` +
        unconsumed.join(', '),
    )

  // Final emits must be game-unique strings; a duplicate means two nouns would
  // send the identical parser phrase (overrides can bypass computeEmit's own
  // uniqueness search, so check the end result regardless of source).
  const byEmit = new Map()
  for (const e of out) {
    const prev = byEmit.get(e.emit)
    if (prev !== undefined)
      throw new Error(
        `extractNouns: duplicate emit "${e.emit}" for ` +
          `"${prev}" and "${e.canonical}"`,
      )
    byEmit.set(e.emit, e.canonical)
  }

  const entries = out.map(e => {
    const synonyms = sortUniq(e.synDecl.filter(s => s !== e.canonical))
    const adjectives = sortUniq(e.adjDecl)
    const entry = { canonical: e.canonical, emit: e.emit }
    if (synonyms.length) entry.synonyms = synonyms
    if (adjectives.length) entry.adjectives = adjectives
    return entry
  })
  entries.sort((a, b) =>
    a.canonical < b.canonical ? -1 : a.canonical > b.canonical ? 1 : 0,
  )
  return entries
}

// Render a Vocab literal as TypeScript source. Output is intentionally close to
// the final shape; the generator runs Prettier over it so the committed file is
// formatter-canonical (a fresh regenerate is a no-op diff).
export function buildVocabModule(N, vocab) {
  const arr = xs => JSON.stringify(xs)
  const noun = e => {
    const parts = [
      `"canonical":${JSON.stringify(e.canonical)}`,
      `"emit":${JSON.stringify(e.emit)}`,
    ]
    if (e.synonyms) parts.push(`"synonyms":${JSON.stringify(e.synonyms)}`)
    if (e.adjectives) parts.push(`"adjectives":${JSON.stringify(e.adjectives)}`)
    return `    { ${parts.join(', ')} },`
  }
  return `// src/llm/grammar/zork${N}.vocab.ts
// GENERATED by scripts/extract-vocab.mjs from zork${N}/ ZIL — DO NOT EDIT BY HAND.
// Regenerate with: make extract-vocab
import type { Vocab } from './types'
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT, FAILURE_PAT } from './patterns'

export const ZORK${N}_VOCAB: Vocab = {
  verbsOnly: ${arr(vocab.verbsOnly)},
  movement: ${arr(vocab.movement)},
  verbs1: ${arr(vocab.verbs1)},
  verbs2: ${arr(vocab.verbs2)},
  preps: ${arr(vocab.preps)},
  verbSynonyms: ${arr(vocab.verbSynonyms)},
  nouns: [
${vocab.nouns.map(noun).join('\n')}
  ],
  takeAck: TAKE_ACK,
  dropAck: DROP_ACK,
  absencePat: ABSENCE_PAT,
  failurePat: FAILURE_PAT,
}
`
}

// Flatten top-level forms for game N, descending into <COND> and taking the
// first true branch's body. Non-COND forms pass through unchanged.
export function activeForms(forms, N) {
  const out = []
  const visit = node => {
    if (!node || node.t !== 'list' || node.k !== '<') return
    if (headAtom(node) === 'COND') {
      for (let i = 1; i < node.items.length; i++) {
        const branch = node.items[i]
        if (
          branch.t === 'list' &&
          branch.k === '(' &&
          predTrue(branch.items[0], N)
        ) {
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
