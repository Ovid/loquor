# ZIL-Derived Per-Game Vocabulary Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Regenerate `src/llm/grammar/zork{1,2,3}.vocab.ts` from each game's original Infocom ZIL via a committed, re-runnable generator, fixing the sparse-vocab mistranslations (e.g. `climb tree` → `close leaflet`) while strictly isolating per-game nouns and gated verbs.

**Architecture:** A standalone Node ESM generator (`scripts/extract-vocab.mjs`) reads each game's read-only ZIL (`zorkN/gsyntax.zil`, `zorkN/<N>dungeon.zil`, `zorkN/gglobals.zil`), parses it with a small bracket-aware reader in `scripts/lib/zil.mjs`, evaluates `ZORK-NUMBER` conditionals so game-specific verbs land only in the right game, and emits typed `Vocab` literals. The meta-command list becomes a single shared source (`src/llm/meta.ts`) consumed by both the runtime (`translate.ts`) and the generator, closing the "verb excluded from grammar but not bypassed" crack. The prompt's verb-guidance list is decoupled from the full grammar verb set so a ~130-verb dump can't degrade the 1.5B model. Generated files are the committed artifacts; the app never needs the ZIL.

**Tech Stack:** TypeScript + Vite + Vitest; plain ESM (`.mjs`) dev script run via `node` (matches `scripts/capture-protocol.mjs`); Prettier for canonical output.

**Source-of-truth facts verified against the ZIL (do not re-derive):**
- `zork3/` ships BOTH `3dungeon.zil` (the real one, `<INSERT-FILE "3DUNGEON">` in `zork3.zil:27`) and a stale `dungeon.zil` — read `<N>dungeon.zil` by exact name, never a glob.
- ZIL `;` comments out the **single following datum** (e.g. `(ADJECTIVE LARGE STORM ;"-TOSSED")` → adjectives `large`, `storm` only). The reader must drop commented datums.
- One-object `<SYNTAX KILL OBJECT … = V-ATTACK>` and `<SYNTAX ATTACK OBJECT … = V-ATTACK>` are gated `<COND (<==? ,ZORK-NUMBER 2> …)>` (`gsyntax.zil:92`, `:260`) → present in Zork II's `verbs1` only. The two-object `kill … with …` / `attack … with …` are ungated → shared `verbs2`. This is the cross-game isolation assertion.
- `again`/`g` are `<BUZZ AGAIN G OOPS>` parser buzzwords (no `<SYNTAX>` rule) → route them raw via `META_COMMANDS`.
- `inventory` is `<SYNTAX INVENTORY = V-INVENTORY>` and is NOT a meta command today → it must stay emittable in `verbsOnly`.

---

## File Structure

- Create `src/llm/meta.ts` — single source of truth for meta-commands (runtime + generator).
- Modify `src/llm/translate.ts` — consume `META_COMMANDS` from `./meta` instead of an inline set.
- Create `scripts/lib/zil.mjs` — pure ZIL reader + extractors + serializer (no I/O).
- Create `scripts/lib/zil.test.mjs` — Vitest unit tests for the pure functions.
- Modify `vitest.config.ts` — discover `scripts/**/*.test.mjs`.
- Create `scripts/extract-vocab.mjs` — I/O shell: read ZIL, call the lib, write + Prettier-format the 3 vocab files, print a reconciliation log.
- Modify `Makefile` — add an `extract-vocab` target.
- Regenerate `src/llm/grammar/zork{1,2,3}.vocab.ts` — committed artifacts (overwritten by the generator).
- Create `src/llm/grammar/vocab-invariants.test.ts` — durable cross-cutting regression gate.
- Modify `src/llm/prompt.ts` + `src/llm/prompt.test.ts` — decouple prompt verbs from grammar verbs.
- Delete `src/llm/experiment.ts` — retire the TEMP diagnostic after live verification.

---

## Task 1: Shared meta-command source + runtime refactor

**Files:**
- Create: `src/llm/meta.ts`
- Modify: `src/llm/translate.ts:30-49`
- Test: `src/llm/translate.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/llm/translate.test.ts` (inside the existing `describe` for `isMetaCommand`, or a new one):

```ts
import { isMetaCommand } from './translate'
import { META_COMMANDS } from './meta'

describe('meta-command source', () => {
  it('routes parser buzzwords again/g raw', () => {
    expect(isMetaCommand('again')).toBe(true)
    expect(isMetaCommand('g')).toBe(true)
  })
  it('keeps inventory as an in-world (non-meta) verb', () => {
    expect(isMetaCommand('inventory')).toBe(false)
  })
  it('still bypasses the classic session verbs', () => {
    expect(isMetaCommand('save')).toBe(true)
    expect(isMetaCommand('SCORE.')).toBe(true)
  })
  it('exposes a deduped, lowercase list', () => {
    expect(META_COMMANDS).toContain('restart')
    expect(new Set(META_COMMANDS).size).toBe(META_COMMANDS.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/llm/translate.test.ts -t "meta-command source"`
Expected: FAIL — cannot resolve `./meta` (module does not exist).

- [ ] **Step 3: Create the shared source**

Create `src/llm/meta.ts`:

```ts
// src/llm/meta.ts
// Single source of truth for Z-machine meta-commands: bare verbs that are NOT
// in-world actions and must bypass the NL model (sent raw to the interpreter).
// BOTH translate.ts (runtime, via isMetaCommand) and scripts/extract-vocab.mjs
// (the vocab generator, which subtracts these from verbsOnly) consume this list,
// so the grammar can never offer a meta verb as an emittable action AND a typed
// meta command is still routed raw — no verb falls through the gap between the
// two paths.
//
// 'again'/'g' are parser BUZZ words (<BUZZ AGAIN G OOPS> in gsyntax.zil; no
// <SYNTAX> rule), routed raw so "again"/"g" repeat the previous turn.
// 'inventory' is deliberately NOT here: it is a real in-world verb-only action
// (<SYNTAX INVENTORY = V-INVENTORY>) and stays emittable in verbsOnly.
export const META_COMMANDS: readonly string[] = [
  'restart',
  'save',
  'restore',
  'quit',
  'version',
  'script',
  'unscript',
  'verbose',
  'brief',
  'superbrief',
  'diagnose',
  'score',
  'again',
  'g',
]
```

- [ ] **Step 4: Refactor `translate.ts` to consume it**

In `src/llm/translate.ts`, replace the inline set (lines 30-49) with an import-backed set. Add near the top imports:

```ts
import { META_COMMANDS } from './meta'
```

Replace the `const META_COMMANDS = new Set([... ])` block with:

```ts
// Z-machine meta-verbs that are not in-world actions: they have no canonical
// game-command translation and must bypass the model entirely (sent raw to the
// interpreter). The list is the shared source in ./meta so the vocab generator
// subtracts exactly this set from verbsOnly. Match only the BARE verb so a real
// intent like "save the egg" still reaches the translator.
const META = new Set(META_COMMANDS)
```

Update `isMetaCommand` to use `META`:

```ts
/** True when the raw English is a bare Z-machine meta-command (restart, save…). */
export function isMetaCommand(english: string): boolean {
  const norm = english
    .trim()
    .toLowerCase()
    .replace(/[!.?]+$/, '')
  return META.has(norm)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/llm/translate.test.ts`
Expected: PASS (all existing translate tests + the new ones).

- [ ] **Step 6: Commit**

```bash
git add src/llm/meta.ts src/llm/translate.ts src/llm/translate.test.ts
git commit -m "feat(nl): shared META_COMMANDS source; route again/g raw, keep inventory emittable

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: ZIL reader (tokenizer + form parser) with comment handling

**Files:**
- Create: `scripts/lib/zil.mjs`
- Create: `scripts/lib/zil.test.mjs`
- Modify: `vitest.config.ts:9` (test `include`)

- [ ] **Step 1: Let Vitest discover `.mjs` tests under `scripts/`**

In `vitest.config.ts`, change the `include` line:

```ts
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.mjs'],
```

(Coverage `include` stays `src/**/*.{ts,tsx}`, so the `.mjs` lib is run-but-not-coverage-gated.)

- [ ] **Step 2: Write the failing test**

Create `scripts/lib/zil.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { readForms, headAtom } from './zil.mjs'

describe('readForms', () => {
  it('parses nested angle/paren forms and string literals', () => {
    const [obj] = readForms('<OBJECT TREE (DESC "tree") (FLAGS NDESCBIT)>')
    expect(obj.t).toBe('list')
    expect(headAtom(obj)).toBe('OBJECT')
    const desc = obj.items.find(i => i.t === 'list' && headAtom(i) === 'DESC')
    expect(desc.items[1]).toEqual({ t: 'str', v: 'tree' })
  })

  it('drops the single datum after a ";" comment', () => {
    const [adj] = readForms('(ADJECTIVE LARGE STORM ;"-TOSSED")')
    const atoms = adj.items.filter(i => i.t === 'atom').map(i => i.v)
    expect(atoms).toEqual(['ADJECTIVE', 'LARGE', 'STORM'])
  })

  it('drops a commented-out bracketed form without breaking nesting', () => {
    const forms = readForms('<A> ;<DEAD <CODE>> <B>')
    expect(forms.map(headAtom)).toEqual(['A', 'B'])
  })

  it('treats ,ZORK-NUMBER and form-feeds as ordinary atoms/whitespace', () => {
    const [cond] = readForms('\f<COND (<==? ,ZORK-NUMBER 2> <X>)>')
    expect(headAtom(cond)).toBe('COND')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/lib/zil.test.mjs`
Expected: FAIL — cannot resolve `./zil.mjs`.

- [ ] **Step 4: Implement the reader**

Create `scripts/lib/zil.mjs`:

```js
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run scripts/lib/zil.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/zil.mjs scripts/lib/zil.test.mjs vitest.config.ts
git commit -m "feat(vocab): bracket-aware ZIL reader with comment handling

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: ZORK-NUMBER conditional resolution

**Files:**
- Modify: `scripts/lib/zil.mjs` (add `activeForms`, `predTrue`)
- Test: `scripts/lib/zil.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/lib/zil.test.mjs`:

```js
import { activeForms } from './zil.mjs'

describe('activeForms (ZORK-NUMBER gating)', () => {
  const src = `
    <SYNTAX BACK = V-BACK>
    <COND (<==? ,ZORK-NUMBER 2> <SYNTAX KILL OBJECT = V-ATTACK>)>
    <COND (<N==? ,ZORK-NUMBER 3> <SYNTAX GIVE OBJECT TO OBJECT = V-GIVE>)>
  `
  const heads = (n) => activeForms(readForms(src), n).map(headAtom)

  it('always includes ungated forms', () => {
    expect(heads(1)).toContain('SYNTAX') // BACK
  })
  it('includes ==?-gated forms only for the matching game', () => {
    const kill1 = activeForms(readForms(src), 1).filter(
      f => f.items.some(i => i.t === 'atom' && i.v === 'KILL'),
    )
    const kill2 = activeForms(readForms(src), 2).filter(
      f => f.items.some(i => i.t === 'atom' && i.v === 'KILL'),
    )
    expect(kill1).toHaveLength(0)
    expect(kill2).toHaveLength(1)
  })
  it('includes N==?-gated forms for every game except the excluded one', () => {
    const has = (n) =>
      activeForms(readForms(src), n).some(f =>
        f.items.some(i => i.t === 'atom' && i.v === 'GIVE'),
      )
    expect(has(1)).toBe(true)
    expect(has(2)).toBe(true)
    expect(has(3)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "ZORK-NUMBER gating"`
Expected: FAIL — `activeForms` is not exported.

- [ ] **Step 3: Implement gating**

Add to `scripts/lib/zil.mjs`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "ZORK-NUMBER gating"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/zil.mjs scripts/lib/zil.test.mjs
git commit -m "feat(vocab): resolve ZORK-NUMBER <COND> gating to active forms

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: SYNTAX extraction (verbsOnly / verbs1 / verbs2 / preps)

**Files:**
- Modify: `scripts/lib/zil.mjs` (add `extractVerbsAndPreps`, `sortUniq`)
- Test: `scripts/lib/zil.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/lib/zil.test.mjs`:

```js
import { extractVerbsAndPreps } from './zil.mjs'

describe('extractVerbsAndPreps', () => {
  const meta = new Set(['save', 'quit'])
  const run = (src, n = 1) => extractVerbsAndPreps(readForms(src), n, meta)

  it('classifies a verb-only rule and drops meta verbs', () => {
    const v = run('<SYNTAX WAIT = V-WAIT> <SYNTAX SAVE = V-SAVE>')
    expect(v.verbsOnly).toContain('wait')
    expect(v.verbsOnly).not.toContain('save')
  })

  it('classifies a one-object rule, skipping (flag) groups', () => {
    const v = run('<SYNTAX TAKE OBJECT (HELD CARRIED) = V-TAKE>')
    expect(v.verbs1).toContain('take')
  })

  it('keeps a particle between verb and OBJECT as a multiword verb', () => {
    const v = run('<SYNTAX CLIMB UP OBJECT (FIND CLIMBBIT) = V-CLIMB-UP>')
    expect(v.verbs1).toContain('climb up')
  })

  it('classifies a two-object rule and records the inter-object preposition', () => {
    const v = run('<SYNTAX CUT OBJECT (HELD) WITH OBJECT (HELD) = V-CUT>')
    expect(v.verbs2).toContain('cut')
    expect(v.preps).toContain('with')
  })

  it('reads prepositions from <SYNONYM> declaration blocks, not just inter-object usage', () => {
    // gsyntax.zil:20-23 declares the prep class with <SYNONYM WITH …> blocks.
    // `under` is declared but only ever used as a one-object particle ("look
    // under"), so inter-object scanning alone would drop it — the SYNONYM block
    // must be read so it survives (spec Architecture §4 preps bullet).
    const v = run(
      '<SYNONYM UNDER UNDERNEATH BENEATH BELOW> <SYNTAX LOOK UNDER OBJECT = V-LOOK-UNDER>',
    )
    expect(v.preps).toContain('under')
    expect(v.verbs1).toContain('look under') // still a particle verb, not a prep
  })

  it('only treats known-preposition SYNONYM heads as preps (not verb synonyms)', () => {
    const v = run('<SYNONYM ATTACK FIGHT HURT INJURE HIT> <SYNONYM ON ONTO>')
    expect(v.preps).toContain('on')
    expect(v.preps).not.toContain('attack')
  })

  it('honors the KILL anti-infection gate (verbs1 only for Zork II)', () => {
    const src = '<COND (<==? ,ZORK-NUMBER 2> <SYNTAX KILL OBJECT (FIND ACTORBIT) = V-ATTACK>)>'
    expect(run(src, 1).verbs1).not.toContain('kill')
    expect(run(src, 2).verbs1).toContain('kill')
  })

  it('drops $/# debug verbs', () => {
    const v = run('<SYNTAX $VERIFY = V-VERIFY> <SYNTAX #COMMAND OBJECT = V-DEBUG>')
    expect(v.verbsOnly.join()).not.toMatch(/[#$]/)
    expect(v.verbs1.join()).not.toMatch(/[#$]/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "extractVerbsAndPreps"`
Expected: FAIL — `extractVerbsAndPreps` is not exported.

- [ ] **Step 3: Implement extraction**

Add to `scripts/lib/zil.mjs`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "extractVerbsAndPreps"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/zil.mjs scripts/lib/zil.test.mjs
git commit -m "feat(vocab): extract verbsOnly/verbs1/verbs2/preps from SYNTAX rules

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: OBJECT (noun) extraction

**Files:**
- Modify: `scripts/lib/zil.mjs` (add `extractNouns`)
- Test: `scripts/lib/zil.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/lib/zil.test.mjs`:

```js
import { extractNouns } from './zil.mjs'

describe('extractNouns', () => {
  const dungeon = `
    <ROOM FOREST-PATH (DESC "Forest Path") (NORTH TO CLEARING)>
    <OBJECT TREE
      (IN LOCAL-GLOBALS)
      (SYNONYM TREE BRANCH)
      (ADJECTIVE LARGE STORM ;"-TOSSED")
      (DESC "tree")
      (FLAGS NDESCBIT CLIMBBIT)>`
  const globals = `
    <OBJECT GLOBAL-OBJECTS (FLAGS NDESCBIT)>
    <OBJECT WINDOW (SYNONYM WINDOW) (DESC "window") (FLAGS DOORBIT)>`

  it('maps DESC->canonical, SYNONYM->synonyms (minus canonical), ADJECTIVE->adjectives', () => {
    const nouns = extractNouns(dungeon, globals)
    const tree = nouns.find(n => n.canonical === 'tree')
    expect(tree).toEqual({
      canonical: 'tree',
      synonyms: ['branch'],
      adjectives: ['large', 'storm'],
    })
  })

  it('excludes <ROOM> blocks', () => {
    expect(extractNouns(dungeon, globals).some(n => n.canonical === 'forest path')).toBe(false)
  })

  it('skips parser sentinels with no DESC and no SYNONYM', () => {
    expect(extractNouns(dungeon, globals).some(n => n.canonical === 'global-objects')).toBe(false)
  })

  it('reads globals (window) alongside dungeon objects', () => {
    expect(extractNouns(dungeon, globals).some(n => n.canonical === 'window')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "extractNouns"`
Expected: FAIL — `extractNouns` is not exported.

- [ ] **Step 3: Implement extraction**

Add to `scripts/lib/zil.mjs`:

```js
// Every <OBJECT …> in the dungeon + globals sources, mapped to a NounEntry.
// <ROOM …> blocks are excluded (different head). Canonical = DESC text (or first
// SYNONYM if no DESC); sentinels with neither are skipped.
export function extractNouns(dungeonSrc, globalsSrc) {
  const forms = [...readForms(dungeonSrc), ...readForms(globalsSrc)]
  const out = []
  const seen = new Set()

  for (const f of forms) {
    if (f.t !== 'list' || f.k !== '<' || headAtom(f) !== 'OBJECT') continue
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
        syn = it.items.slice(1).filter(x => x.t === 'atom').map(x => x.v.toLowerCase())
      } else if (tag === 'ADJECTIVE') {
        adj = it.items.slice(1).filter(x => x.t === 'atom').map(x => x.v.toLowerCase())
      }
    }
    const canonical = desc ? desc.toLowerCase() : syn[0] || null
    if (!canonical || seen.has(canonical)) continue
    seen.add(canonical)
    const synonyms = sortUniq(syn.filter(s => s !== canonical))
    const adjectives = sortUniq(adj)
    const entry = { canonical }
    if (synonyms.length) entry.synonyms = synonyms
    if (adjectives.length) entry.adjectives = adjectives
    out.push(entry)
  }

  out.sort((a, b) => (a.canonical < b.canonical ? -1 : a.canonical > b.canonical ? 1 : 0))
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "extractNouns"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/zil.mjs scripts/lib/zil.test.mjs
git commit -m "feat(vocab): extract per-game nouns from OBJECT blocks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: DIRECTIONS extraction + abbreviation normalization

**Files:**
- Modify: `scripts/lib/zil.mjs` (add `extractDirections`)
- Test: `scripts/lib/zil.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/lib/zil.test.mjs`:

```js
import { extractDirections } from './zil.mjs'

describe('extractDirections', () => {
  it('reads the games own DIRECTIONS and normalizes compass abbreviations', () => {
    const dirs = extractDirections(
      '<DIRECTIONS NORTH EAST WEST SOUTH NE NW SE SW UP DOWN IN OUT LAND>',
    )
    expect(dirs).toContain('northeast')
    expect(dirs).toContain('northwest')
    expect(dirs).toContain('southeast')
    expect(dirs).toContain('southwest')
    expect(dirs).toContain('north')
    expect(dirs).toContain('up')
    expect(dirs).toContain('land')
    expect(dirs).not.toContain('ne')
  })
  it('returns [] when no DIRECTIONS form is present', () => {
    expect(extractDirections('<OBJECT FOO>')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "extractDirections"`
Expected: FAIL — `extractDirections` is not exported.

- [ ] **Step 3: Implement extraction**

Add to `scripts/lib/zil.mjs`:

```js
const DIR_MAP = { NE: 'northeast', NW: 'northwest', SE: 'southeast', SW: 'southwest' }

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "extractDirections"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/zil.mjs scripts/lib/zil.test.mjs
git commit -m "feat(vocab): extract + normalize per-game movement directions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Vocab module serializer

**Files:**
- Modify: `scripts/lib/zil.mjs` (add `buildVocabModule`)
- Test: `scripts/lib/zil.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/lib/zil.test.mjs`:

```js
import { buildVocabModule } from './zil.mjs'

describe('buildVocabModule', () => {
  const vocab = {
    verbsOnly: ['look'],
    movement: ['north'],
    verbs1: ['take'],
    verbs2: ['put'],
    preps: ['in'],
    nouns: [{ canonical: 'tree', synonyms: ['branch'], adjectives: ['large'] }],
  }

  it('emits a typed Vocab literal that re-imports the shared patterns', () => {
    const src = buildVocabModule(1, vocab)
    expect(src).toContain("import type { Vocab } from './types'")
    expect(src).toContain(
      "import { TAKE_ACK, DROP_ACK, ABSENCE_PAT, FAILURE_PAT } from './patterns'",
    )
    expect(src).toContain('export const ZORK1_VOCAB: Vocab = {')
    expect(src).toContain('takeAck: TAKE_ACK')
    expect(src).toContain('GENERATED by scripts/extract-vocab.mjs')
  })

  it('serializes nouns with optional synonyms/adjectives', () => {
    const src = buildVocabModule(2, vocab)
    expect(src).toContain('"canonical":"tree"')
    expect(src).toContain('"synonyms":["branch"]')
    expect(src).toContain('export const ZORK2_VOCAB: Vocab = {')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "buildVocabModule"`
Expected: FAIL — `buildVocabModule` is not exported.

- [ ] **Step 3: Implement the serializer**

Add to `scripts/lib/zil.mjs`:

```js
// Render a Vocab literal as TypeScript source. Output is intentionally close to
// the final shape; the generator runs Prettier over it so the committed file is
// formatter-canonical (a fresh regenerate is a no-op diff).
export function buildVocabModule(N, vocab) {
  const arr = xs => JSON.stringify(xs)
  const noun = e => {
    const parts = [`"canonical":${JSON.stringify(e.canonical)}`]
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/zil.test.mjs -t "buildVocabModule"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/zil.mjs scripts/lib/zil.test.mjs
git commit -m "feat(vocab): serialize extracted data to a typed Vocab module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Generator CLI + Makefile target

**Files:**
- Create: `scripts/extract-vocab.mjs`
- Modify: `Makefile` (add `extract-vocab` target)

- [ ] **Step 1: Write the CLI**

Create `scripts/extract-vocab.mjs`:

```js
// scripts/extract-vocab.mjs
// Regenerate src/llm/grammar/zork{1,2,3}.vocab.ts from the read-only vendored ZIL.
// Standalone Node ESM dev tool (run: `node scripts/extract-vocab.mjs` or
// `make extract-vocab`). The vendored zorkN/ dirs are ONLY read, never modified.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  readForms,
  extractVerbsAndPreps,
  extractNouns,
  extractDirections,
  buildVocabModule,
} from './lib/zil.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Read the shared meta-command list from src/llm/meta.ts (single source of truth
// for both the runtime and this generator) and lowercase it into a Set.
function readMetaSet() {
  const text = readFileSync(join(ROOT, 'src/llm/meta.ts'), 'utf8')
  const block = text.match(/META_COMMANDS[^[]*\[([\s\S]*?)\]/)
  const set = new Set()
  if (block) for (const m of block[1].matchAll(/['"]([^'"]+)['"]/g)) set.add(m[1].toLowerCase())
  return set
}

// Parse the verbsOnly array from the EXISTING committed vocab file (read before it
// is overwritten) so the run can surface any verb the regeneration would silently
// DROP — the reconciliation guard the spec mandates (Architecture §4). Returns []
// when the file does not yet exist.
function readCommittedVerbsOnly(outPath) {
  let text
  try {
    text = readFileSync(outPath, 'utf8')
  } catch {
    return []
  }
  const block = text.match(/verbsOnly:\s*\[([\s\S]*?)\]/)
  const out = []
  if (block) for (const m of block[1].matchAll(/['"]([^'"]+)['"]/g)) out.push(m[1].toLowerCase())
  return out
}

function main() {
  const meta = readMetaSet()
  const outFiles = []

  for (const N of [1, 2, 3]) {
    const gsyntax = readFileSync(join(ROOT, `zork${N}/gsyntax.zil`), 'utf8')
    // Pinned filename — never a glob: zork3/ also ships a stale dungeon.zil.
    const dungeon = readFileSync(join(ROOT, `zork${N}/${N}dungeon.zil`), 'utf8')
    const globals = readFileSync(join(ROOT, `zork${N}/gglobals.zil`), 'utf8')

    const vp = extractVerbsAndPreps(readForms(gsyntax), N, meta)
    const nouns = extractNouns(dungeon, globals)
    const movement = extractDirections(dungeon)
    const vocab = { ...vp, movement, nouns }

    const outPath = join(ROOT, `src/llm/grammar/zork${N}.vocab.ts`)
    // Capture the committed verbsOnly BEFORE overwriting, for the drop diff below.
    const priorVerbsOnly = readCommittedVerbsOnly(outPath)
    writeFileSync(outPath, buildVocabModule(N, vocab))
    outFiles.push(outPath)

    // Reconciliation log (review before committing — Issue 1 of the spec review).
    console.log(
      `zork${N}: verbsOnly=${vp.verbsOnly.length} verbs1=${vp.verbs1.length} ` +
        `verbs2=${vp.verbs2.length} preps=${vp.preps.length} nouns=${nouns.length}`,
    )
    console.log(`  meta-excluded verb-only canonicals: ${vp.excludedMeta.join(', ') || '(none)'}`)
    // Spec-mandated reconciliation DIFF: verbs in the committed verbsOnly now absent
    // from the regenerated output AND not routed via META — the silent-drop class
    // this generator exists to make visible. (META_COMMANDS verbs like 'again'/'quit'
    // are excluded: they are intentionally relocated, not dropped.)
    const dropped = priorVerbsOnly.filter(v => !vp.verbsOnly.includes(v) && !meta.has(v))
    if (dropped.length) {
      console.warn(
        `  RECONCILE: committed verbsOnly verbs now absent (review before commit!): ${dropped.join(', ')}`,
      )
    } else {
      console.log('  reconcile: no committed verbsOnly verbs dropped')
    }
    if (!vp.verbsOnly.includes('inventory')) {
      console.warn(`  WARNING: 'inventory' missing from zork${N} verbsOnly — it must stay emittable`)
    }
  }

  // Make the committed artifacts formatter-canonical so a fresh run is a no-op diff.
  execFileSync('npx', ['prettier', '--write', ...outFiles], { stdio: 'inherit', cwd: ROOT })
  console.log('Done. Review the diff + reconciliation log above, then commit.')
}

main()
```

- [ ] **Step 2: Add the Makefile target**

In `Makefile`, add (next to other dev targets, e.g. after `loc`):

```makefile
extract-vocab: ## Regenerate src/llm/grammar/zork{1,2,3}.vocab.ts from the vendored ZIL
	node scripts/extract-vocab.mjs
```

- [ ] **Step 3: Run the generator (dry confirm it executes)**

Run: `node scripts/extract-vocab.mjs`
Expected: Prints three `zorkN: …` summary lines, each followed by `meta-excluded verb-only canonicals: …` and a `reconcile: no committed verbsOnly verbs dropped` line, no `WARNING`/`RECONCILE`, then Prettier output and `Done.`. (The current committed verbsOnly is `look, inventory, wait, again, quit`; `again`/`quit` are now routed via META, the rest regenerate, so the drop diff is empty.) The three `src/llm/grammar/zork{1,2,3}.vocab.ts` files are rewritten.

- [ ] **Step 4: Confirm re-running is deterministic (no-op diff)**

Run: `node scripts/extract-vocab.mjs && git diff --stat src/llm/grammar/*.vocab.ts`
Expected: After the first run is committed (Task 9), a second run produces NO further diff. For now, just confirm two consecutive runs produce identical files:

Run: `node scripts/extract-vocab.mjs && cp src/llm/grammar/zork1.vocab.ts /tmp/a && node scripts/extract-vocab.mjs && diff src/llm/grammar/zork1.vocab.ts /tmp/a`
Expected: no diff output.

- [ ] **Step 5: Commit the generator (not yet the outputs)**

```bash
git add scripts/extract-vocab.mjs Makefile
git commit -m "feat(vocab): generator CLI + make extract-vocab target

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Regenerate and commit the vocab artifacts

**Files:**
- Modify (regenerate): `src/llm/grammar/zork1.vocab.ts`, `zork2.vocab.ts`, `zork3.vocab.ts`

- [ ] **Step 1: Regenerate**

Run: `make extract-vocab`
Expected: clean run, no `WARNING`.

- [ ] **Step 2: Sanity-check the outputs by eye**

Run: `npx vitest run` is premature; instead inspect headline facts:

Run: `grep -c "canonical" src/llm/grammar/zork1.vocab.ts`
Expected: a count far larger than the old ~22 (full noun set).

Confirm the climb fix is now expressible:

Run: `grep -E "\"tree\"|\"climb\"|\"window\"" src/llm/grammar/zork1.vocab.ts`
Expected: `tree`, `climb` (in `verbs1`), and `window` all appear.

- [ ] **Step 3: Commit the regenerated artifacts**

```bash
git add src/llm/grammar/zork1.vocab.ts src/llm/grammar/zork2.vocab.ts src/llm/grammar/zork3.vocab.ts
git commit -m "feat(vocab): regenerate zork{1,2,3} vocab from ZIL (full coverage)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Cross-cutting regression-gate test

**Files:**
- Create: `src/llm/grammar/vocab-invariants.test.ts`

This is the durable guard the spec review asked for (Issue 1): it fails loudly if a future regeneration drops a needed verb, leaks a meta verb into the grammar, reads the wrong Zork III dungeon, breaks per-game isolation, loses a declared preposition, or lets the committed files drift from Prettier-canonical (the re-runnability guarantee).

- [ ] **Step 1: Write the test (expected to PASS against Task 9's output)**

Create `src/llm/grammar/vocab-invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import prettier from 'prettier'
import { ZORK1_VOCAB } from './zork1.vocab'
import { ZORK2_VOCAB } from './zork2.vocab'
import { ZORK3_VOCAB } from './zork3.vocab'
import { META_COMMANDS } from '../meta'
import type { Vocab } from './types'

const games: Array<[string, Vocab]> = [
  ['zork1', ZORK1_VOCAB],
  ['zork2', ZORK2_VOCAB],
  ['zork3', ZORK3_VOCAB],
]
const meta = new Set(META_COMMANDS)

describe('vocab invariants (regeneration regression gate)', () => {
  it.each(games)('%s: no meta verb leaks into verbsOnly', (_name, v) => {
    expect(v.verbsOnly.filter(x => meta.has(x))).toEqual([])
  })

  it.each(games)('%s: inventory stays emittable; lists are non-empty', (_name, v) => {
    expect(v.verbsOnly).toContain('inventory')
    expect(v.verbs1.length).toBeGreaterThan(0)
    expect(v.nouns.length).toBeGreaterThan(0)
  })

  it.each(games)('%s: movement has the compass + up/down', (_name, v) => {
    for (const d of ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down']) {
      expect(v.movement).toContain(d)
    }
  })

  it.each(games)('%s: preps include the <SYNONYM> prep-block canonicals', (_name, v) => {
    // Declared in gsyntax.zil:20-23 — `under` is the regression canary: it is only
    // ever a one-object particle ("look under"), so it survives ONLY because the
    // generator reads the prep SYNONYM blocks, not just inter-object preps.
    for (const p of ['with', 'in', 'on', 'under']) {
      expect(v.preps).toContain(p)
    }
  })

  it.each(games)('%s: committed vocab is Prettier-clean (no-op regenerate guard)', async (name) => {
    // The generator runs Prettier as its last step (Task 8), so a fresh regenerate
    // must be a no-op diff. Asserting the committed file equals its own formatted
    // form catches formatter drift that would silently break re-runnability
    // (spec Risks §). `name` ('zork1'…) matches the source filename.
    const path = join(process.cwd(), `src/llm/grammar/${name}.vocab.ts`)
    const src = readFileSync(path, 'utf8')
    const config = await prettier.resolveConfig(path)
    const formatted = await prettier.format(src, { ...config, filepath: path })
    expect(formatted).toBe(src)
  })

  it('zork1: the climb-tree fix is expressible', () => {
    expect(ZORK1_VOCAB.verbs1).toContain('climb')
    const tree = ZORK1_VOCAB.nouns.find(n => n.canonical === 'tree')
    expect(tree?.synonyms).toContain('branch')
    expect(tree?.adjectives).toEqual(expect.arrayContaining(['large', 'storm']))
    expect(ZORK1_VOCAB.nouns.some(n => n.canonical === 'window')).toBe(true)
  })

  it('zork3 is sourced from 3dungeon.zil (water present, not the stale dungeon.zil)', () => {
    expect(ZORK3_VOCAB.nouns.some(n => n.canonical === 'water')).toBe(true)
  })

  it('per-game isolation: one-object KILL is Zork II only (gsyntax COND gate)', () => {
    expect(ZORK2_VOCAB.verbs1).toContain('kill')
    expect(ZORK1_VOCAB.verbs1).not.toContain('kill')
    expect(ZORK3_VOCAB.verbs1).not.toContain('kill')
  })
})
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/llm/grammar/vocab-invariants.test.ts`
Expected: PASS. If any assertion fails, the generator (Tasks 4-7) is wrong for that fact — fix the generator and re-run `make extract-vocab`, do NOT weaken the assertion. (The one legitimate exception: if a verified ZIL fact differs from an assumption here, update the assertion with a comment citing the ZIL line.)

- [ ] **Step 3: Commit**

```bash
git add src/llm/grammar/vocab-invariants.test.ts
git commit -m "test(vocab): regression gate for meta-leak, isolation, climb-tree, zork3 source

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Decouple prompt verbs from grammar verbs

**Files:**
- Modify: `src/llm/prompt.ts:70-79`
- Test: `src/llm/prompt.test.ts:114-136`

The grammar keeps the full extracted verb set (validity); the prompt lists only a common core so a ~130-verb dump doesn't degrade the 1.5B model (spec review Issue 2).

- [ ] **Step 1: Write the failing test**

In `src/llm/prompt.test.ts`, update the movement/verb-guidance block. Replace the existing `it('lists … push …')`-style assertion (around line 135) and add a cap assertion:

```ts
  it('lists a bounded common-verb core, not the full extracted verb set', () => {
    const msgs = buildPrompt('open it', ctx(), ZORK1_VOCAB)
    const sys = msgs[0].content
    expect(sys).toContain('take') // a core verb
    expect(sys).toContain('examine') // a core verb
    // 'incant' is in ZORK1_VOCAB.verbsOnly (ungated <SYNTAX INCANT>) but is NOT
    // in the prompt core — proves the prompt list is decoupled from the grammar.
    expect(ZORK1_VOCAB.verbsOnly).toContain('incant')
    expect(sys).not.toContain('incant')
  })
```

Keep the existing `toContain('northeast')` direction assertion as-is (movement is still listed in full).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/llm/prompt.test.ts -t "bounded common-verb core"`
Expected: FAIL — the prompt currently inlines the full verb set, so `incant` IS present.

- [ ] **Step 3: Implement the decoupling**

In `src/llm/prompt.ts`, add the core constant above `buildPrompt`:

```ts
// Common-verb core for PROMPT GUIDANCE only. buildGrammar still enforces the FULL
// extracted verb set (validity) — this list just steers the 1.5B model without
// dumping ~130 verbs into every prompt. Any grammar-valid verb is still emittable;
// the prompt is guidance, the grammar is the gate. Filtered against the game's
// vocab so we never advertise a verb the grammar can't produce.
const PROMPT_VERB_CORE = [
  'look', 'examine', 'read', 'take', 'drop', 'open', 'close', 'move', 'push',
  'pull', 'turn on', 'turn off', 'put', 'give', 'unlock', 'lock', 'attack',
  'kill', 'throw', 'eat', 'drink', 'enter', 'exit', 'wait', 'inventory',
  'light', 'burn', 'tie', 'climb',
]
```

Then in `buildPrompt`, replace the `Allowed action verbs` push (lines 73-77) so it uses the filtered core:

```ts
  const allVerbs = new Set([
    ...vocab.verbsOnly,
    ...vocab.verbs1,
    ...vocab.verbs2,
  ])
  const promptVerbs = PROMPT_VERB_CORE.filter(v => allVerbs.has(v))
  lines.push(
    'MOVEMENT: a direction IS the verb, with NO object. "go south" / "allez au sud" / "head east" / "vers l’est" → {"verb":"south"} or {"verb":"east"}.',
    `Available directions: ${vocab.movement.join(', ')}.`,
    `Allowed action verbs (use ONLY these for actions): ${promptVerbs.join(', ')}.`,
    'Never use "move" to change rooms — "move" only means physically shoving an in-scope object (e.g. "move rug"). To travel, emit the direction itself as the verb.',
  )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/llm/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/prompt.ts src/llm/prompt.test.ts
git commit -m "feat(nl): decouple prompt verb-guidance core from full grammar verb set

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Full suite green + reconcile any pinned tests

**Files:**
- Delete: `src/llm/experiment.ts`
- Modify (only if a test legitimately pinned a now-changed generated value): the failing test file(s).

- [ ] **Step 1: Retire the TEMP diagnostic so it can't break typecheck**

`src/llm/experiment.ts` is a TEMP H1/H2 diagnostic (untracked). It references vocab values that have changed; delete it now (the live `climb tree` check in Task 13 uses the real app, not this harness):

```bash
git rm --cached src/llm/experiment.ts 2>/dev/null; rm -f src/llm/experiment.ts
```

- [ ] **Step 2: Run the full CI pass**

Run: `make all`
Expected: lint + format + typecheck + test all green.

- [ ] **Step 3: Reconcile any failures**

If a test fails because it pinned a hand-curated value that the regeneration legitimately changed (e.g. an assertion that Zork I `verbs1` contains `kill` — it now lives in `verbs2`; or `movement` contains `enter` — now a verb-only verb), update the test to the new generated value WITH a one-line comment explaining the ZIL-derived change. Never edit the generated vocab by hand to satisfy a stale test.

Likely-affected files to check first (inline-fixture tests are NOT affected; only those importing the real `ZORK*_VOCAB`):
- `src/llm/prompt.test.ts` — already updated in Task 11.
- `src/llm/grammar/index.test.ts` — structural validator; should stay green (iterates over whatever the vocab contains).

Example reconciliation edit (illustrative shape, only if such an assertion exists):

```ts
// Was: expect(ZORK1_VOCAB.verbs1).toContain('kill')
// ZIL: one-object KILL is gated to Zork II (gsyntax.zil:260); in Zork I "kill"
// is two-object only (kill … with …), so it now lives in verbs2.
expect(ZORK1_VOCAB.verbs2).toContain('kill')
```

Re-run `make all` until green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(nl): retire experiment.ts; reconcile tests with regenerated vocab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Live verification of the headline fix

**Files:** none (manual verification).

- [ ] **Step 1: Build/run the app and start Zork I**

Run: `make dev` (or use the `run` skill / project launch flow). Enable the natural-language layer, load Zork I, and walk to *Forest Path* (the location where the `tree` is in scope).

- [ ] **Step 2: Confirm the fix**

Type `climb the tree`.
Expected: translates to `climb tree` (grammar-expressible now that `climb` ∈ `verbs1` and `tree` ∈ scope), NOT the old `close leaflet`. Also spot-check `take inventory` / `inventory` still works (routed/emittable), and `again` repeats the last turn (routed raw).

- [ ] **Step 3: Record the result**

If the fix is confirmed, the work is complete. If `climb tree` still fails, debug with `superpowers:systematic-debugging` — check whether `tree` is surfaced by the scene tracker at Forest Path (in-scope gating is upstream of vocab and out of scope for this plan; note it as a deferred follow-up if so).

---

## Self-Review

**1. Spec coverage:**
- Full verb extraction (grammar) + core prompt list → Tasks 4, 11. ✓
- All three games → Task 9 loop. ✓
- Per-game verb gating (`ZORK-NUMBER`) → Task 3 + isolation assertion Task 10. ✓
- Committed re-runnable generator → Tasks 8, 9; determinism/no-op-diff → Task 8 Step 4. ✓
- Strict noun isolation → Task 5 (per-game dungeon + globals only). ✓
- Meta single-source + reconciliation (review Issue 1) → Tasks 1, 8, 10. ✓
- Preps = SYNONYM-block canonicals ∪ inter-object preps (alignment Issue 1) → Task 4 (`PREP_HEADS` + SYNONYM scan) + invariant Task 10. ✓
- Reconciliation DIFF vs. committed verbsOnly, not just a count (alignment Issue 2) → Task 8 (`readCommittedVerbsOnly` + drop diff). ✓
- Prettier-clean committed-file test (alignment Issue 3 / spec Risks §) → Task 10 (no-op-regenerate test). ✓
- Grammar/prompt decoupling (review Issue 2) → Task 11. ✓
- Pinned `3dungeon.zil`, not the stale file (review Issue 3) → Task 8 + assertion Task 10. ✓
- `gverbs.zil` not read (review Issue 4) → generator reads only gsyntax/dungeon/globals (Task 8). ✓
- Prettier-canonical artifact (review Issue 5) → Task 8 (Prettier step) + `make all` format gate. ✓
- Testing: parser units (Tasks 2-7), generated-output assertions (Task 10), regression `make all` (Task 12). ✓
- Verification: live `climb tree`, delete `experiment.ts` (Tasks 12-13). ✓

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; the only discovery-based step (Task 12 Step 3) gives a concrete reconciliation procedure + example because the exact pinned-test failures are only knowable after the generator runs.

**3. Type/name consistency:** `readForms`, `headAtom`, `atomAt`, `activeForms`, `extractVerbsAndPreps` (returns `{verbsOnly, verbs1, verbs2, preps, excludedMeta}`), `extractNouns`, `extractDirections`, `sortUniq`, `buildVocabModule(N, vocab)` are defined in Tasks 2-7 and consumed identically in Task 8. `META_COMMANDS` (Task 1) is consumed by `translate.ts`, the generator (`readMetaSet`), and the invariants test. `PROMPT_VERB_CORE` (Task 11) is used only in `buildPrompt`. Vocab field names match `src/llm/grammar/types.ts`.
