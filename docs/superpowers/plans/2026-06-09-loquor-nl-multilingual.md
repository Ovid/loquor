# Loquor NL Layer v2 — Deterministic-First Multilingual Translation: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invert the NL layer so deterministic code translates the common case (per-language lexicons, vocab passthrough, quoted escapes) and the LLM is a full-vocab-grammar fallback for the long tail — in English, French, German, and Spanish — plus an input queue, a language picker, and readable transcript prefixes.

**Architecture:** A per-clause translation pipeline replaces the current meta→direction→LLM flow: interactive-prompt passthrough → quoted-string escape → meta/aliases → all-words-in-vocab passthrough → direction fast-path → deterministic lexicon parse → LLM fallback. New committed data lives in `src/llm/lexicon/` (3 core lexicons + 9 per-game noun lexicons), validated by tests against the extracted vocab. The grammar's noun terminals switch from `scene.inScope` to the full vocab's new per-noun `emit` forms; scope is demoted to a prompt hint and ambiguity preference. The scene tracker, GlkOte bridge, and engine are unchanged in shape.

**Tech Stack:** TypeScript, React 19, Vite, Vitest + React Testing Library, `@mlc-ai/web-llm` (XGrammar GBNF), Node ESM extraction script over vendored ZIL.

**Source of truth:** `docs/superpowers/specs/2026-06-09-loquor-nl-multilingual-design.md` (revised after pushback review — read it first). UAT evidence: `notes/uat-1.md`, `notes/uat-2.md`.

**Hard rules:**

- NEVER modify the gitignored vendored dirs (`ifvms.js/`, `web-llm/`, `zork1/`, `zork2/`, `zork3/`, `scratch/`, `vendor/glkote/`). Read-only.
- TDD red→green per task; one commit per task (project convention).
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Run a single test file with `npx vitest run <path>`; full suite `make test`; full gate `make all`.

---

## File Structure

**New files:**

| File | Responsibility |
| --- | --- |
| `src/llm/lexicon/types.ts` | `LexLang`, `CoreLexicon`, `NounLexicon`, `ParticleVerb` |
| `src/llm/lexicon/fold.ts` | `fold()` (lowercase + NFD diacritic-fold + apostrophe/hyphen→space), `tokenize()` |
| `src/llm/lexicon/fr.core.ts`, `de.core.ts`, `es.core.ts` | Per-language game-independent lexicons (verbs, idioms, DE particle verbs, preps, articles, pronouns, meta aliases) |
| `src/llm/lexicon/fr.zork1.ts` … `es.zork3.ts` (9 files) | Per-game noun lexicons: vocab canonical → foreign words |
| `src/llm/lexicon/index.ts` | `coreLexicon(lang)`, `nounLexicon(lang, sig)`, `lexiconWordSet(lang, sig)`, `KNOWN_COLLISIONS` |
| `src/llm/lexicon/parse.ts` | The deterministic parser: `parseLexicon(clause, core, nouns, vocab, scene)` |
| `src/llm/lexicon/validate.test.ts` | Build-time gates: keys ∈ vocab canonicals; collision sets match `KNOWN_COLLISIONS`; coverage (every vocab noun has an entry per language) |
| `src/llm/lexicon/roundtrip.test.ts` | Generated round-trip tests: every lexicon entry parses to a vocab-valid command |
| `src/llm/pipeline.uat.test.tsx` | UAT regression suite (every UAT-1/UAT-2 finding, pipeline-level, fake engine) + stage-order tests |
| `src/ui/NlLanguagePicker.tsx` | Language picker (replaces `NlToggle.tsx`) |

**Modified files:**

| File | Change |
| --- | --- |
| `src/llm/grammar/types.ts` | `NounEntry.emit` (required), `Vocab.verbSynonyms` |
| `scripts/lib/zil.mjs` | Extract verb synonyms; compute `emit` per noun (deterministic search + build error); render both into the module |
| `scripts/extract-vocab.mjs` | (regeneration driver — no logic change beyond what zil.mjs exports) |
| `src/llm/grammar/zork{1,2,3}.vocab.ts` | Regenerated (emit + verbSynonyms) |
| `src/llm/grammar/index.ts` | Export `ZORK1_SIG`/`ZORK2_SIG`/`ZORK3_SIG` |
| `src/llm/grammar/buildGrammar.ts` | `buildGrammar(vocab)` — noun terminals = all emit forms; scene param removed |
| `src/llm/grammar/patterns.ts` | `SOFT_NOOP_PAT` |
| `src/llm/types.ts` | `NlLanguage`, `ActiveLanguage`; `NlState` 'on' carries `language` |
| `src/llm/nlpref.ts` | `{ language, declined }` + legacy migration |
| `src/llm/meta.ts` | `META_ALIASES` deleted (migrated into core lexicons); `META_COMMANDS` stays |
| `src/llm/translate.ts` | `parseCommand(raw, vocab)` (scene dropped); `metaAlias(english, core)`; new `unquote`, `vocabWordSet`, `isVocabPassthrough`; `clauseFailed` ignores soft no-ops |
| `src/llm/prompt.ts` | Rewritten instructions (translate-literally), scope as hint, per-language few-shots; `buildPrompt(english, ctx, vocab, language)` |
| `src/llm/useNaturalLanguage.ts` | New pipeline stage order; language state + `setLanguage`; abstain notice (non-EN); input queue; `signature` arg |
| `src/ui/Terminal.tsx` | Picker wiring, `signature` to hook, queued-line rendering, input stays enabled while NL-on pending |
| `src/ui/CommandInput.tsx` | (no signature change — Terminal stops passing `disabled` while queueing) |
| `src/ui/Scrollback.tsx` | `you` label for nl-source; `>` for real commands; `›` removed |
| `src/ui/components.css` | `.you`, `.chip` styles |
| Existing test suites | Updated to the new contracts (each task lists which) |

**Task order & dependencies:** Tasks 1–2 (vocab) unblock everything. 3 (pref) and 4–12 (lexicon data) are independent of 15–19. 13–14 need 4–12. 20–23 need 3, 15–19. 24 needs everything.

---

### Task 1: Vocab extraction — retain verb synonyms (`Vocab.verbSynonyms`)

Stage-4 passthrough must recognize `ulysses` (synonym) as well as `odysseus` (SYNTAX head). Verb/direction synonyms live in top-level `<SYNONYM …>` forms in `gsyntax.zil`; the extractor currently keeps only prep-block heads.

**Files:**
- Modify: `src/llm/grammar/types.ts`
- Modify: `scripts/lib/zil.mjs` (`extractVerbsAndPreps`, `buildVocabModule`)
- Regenerate: `src/llm/grammar/zork{1,2,3}.vocab.ts` (`make extract-vocab`)
- Test: `src/llm/grammar/vocab-invariants.test.ts` (extend the existing suite)

- [ ] **Step 1: Write the failing test**

Append to `src/llm/grammar/vocab-invariants.test.ts`:

```ts
describe('verbSynonyms (NL v2 §9)', () => {
  it('zork1 retains verb synonyms from gsyntax SYNONYM blocks', () => {
    // <SYNONYM ODYSSEUS ULYSSES> — magic word must pass stage 4 in both spellings
    expect(ZORK1_VOCAB.verbSynonyms).toContain('ulysses')
    // <SYNONYM ATTACK FIGHT HURT INJURE HIT>
    expect(ZORK1_VOCAB.verbSynonyms).toContain('fight')
    // <SYNONYM INVENTORY I> / <SYNONYM QUIT Q> — bare abbreviations pass raw
    expect(ZORK1_VOCAB.verbSynonyms).toContain('i')
    expect(ZORK1_VOCAB.verbSynonyms).toContain('q')
  })
  it('verbSynonyms excludes prep-block members and is lowercase-sorted-unique', () => {
    for (const g of [ZORK1_VOCAB, ZORK2_VOCAB, ZORK3_VOCAB]) {
      // 'using'/'thru' belong to the WITH prep block, not verb synonyms
      expect(g.verbSynonyms).not.toContain('using')
      expect(g.verbSynonyms).toEqual(
        [...new Set(g.verbSynonyms.map(s => s.toLowerCase()))].sort(),
      )
    }
  })
})
```

(Use the suite's existing imports of `ZORK1_VOCAB`/`ZORK2_VOCAB`/`ZORK3_VOCAB`; add any that are missing.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/llm/grammar/vocab-invariants.test.ts`
Expected: FAIL — `verbSynonyms` does not exist (TS error / undefined).

- [ ] **Step 3: Implement**

`src/llm/grammar/types.ts` — add to `Vocab`:

```ts
  verbSynonyms: string[] // gsyntax <SYNONYM VERB …> members (ulysses, fight, i, q …)
```

`scripts/lib/zil.mjs` — in `extractVerbsAndPreps`, collect non-prep SYNONYM members. Replace the existing SYNONYM loop with:

```js
  const verbSynonyms = new Set()
  for (const f of active) {
    if (headAtom(f) !== 'SYNONYM') continue
    const head = atomAt(f, 1).toLowerCase()
    if (PREP_HEADS.has(head)) {
      preps.add(head)
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
```

and add `verbSynonyms: sortUniq(verbSynonyms),` to the function's return object.

In `buildVocabModule`, add after the `preps` line:

```js
  verbSynonyms: ${arr(vocab.verbSynonyms)},
```

(`vocab` already spreads `extractVerbsAndPreps`'s result in `extract-vocab.mjs`, so no driver change.)

- [ ] **Step 4: Regenerate + run tests**

Run: `make extract-vocab && npx vitest run src/llm/grammar/vocab-invariants.test.ts`
Expected: regeneration prints per-game counts; test PASSES. Review the vocab diff (verbSynonyms arrays appear; nothing else changes). Then `make test` — any test that builds a literal `Vocab` fixture now fails typecheck; add `verbSynonyms: []` to those fixtures (search: `rg -l 'verbsOnly:' src | grep test`).

- [ ] **Step 5: Commit**

```bash
git add src/llm/grammar scripts/lib/zil.mjs src
git commit -m "feat(vocab): retain gsyntax verb synonyms as Vocab.verbSynonyms"
```

---

### Task 2: Vocab extraction — per-noun `emit` form (deterministic search + build error)

Fixes F-Z (`take hand-held air pump` rejected by the Z-parser). Every noun gains the shortest parser-accepted name, computed deterministically: each dictionary synonym bare (declaration order), then synonym × adjective pairs (declaration order); first game-unique combination wins; none → extraction fails with a report naming the colliding objects (resolved by a manual override table).

**Files:**
- Modify: `src/llm/grammar/types.ts` (`NounEntry.emit`)
- Modify: `scripts/lib/zil.mjs` (`extractNouns`, new `computeEmit`, `EMIT_OVERRIDES`, `buildVocabModule`)
- Regenerate: `src/llm/grammar/zork{1,2,3}.vocab.ts`
- Test: `src/llm/grammar/vocab-invariants.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/llm/grammar/vocab-invariants.test.ts`:

```ts
describe('emit forms (NL v2 §9, F-Z)', () => {
  const games = [ZORK1_VOCAB, ZORK2_VOCAB, ZORK3_VOCAB]
  it('every noun has a non-empty emit built from its own dictionary words', () => {
    for (const g of games)
      for (const n of g.nouns) {
        expect(n.emit.length).toBeGreaterThan(0)
        const own = new Set([...(n.synonyms ?? []), ...(n.adjectives ?? [])])
        if (n.synonyms?.length)
          for (const w of n.emit.split(' ')) expect(own.has(w)).toBe(true)
        else expect(n.emit).toBe(n.canonical) // DESC-only sentinel fallback
      }
  })
  it('emit forms are unique within a game', () => {
    for (const g of games) {
      const emits = g.nouns.map(n => n.emit)
      expect(new Set(emits).size).toBe(emits.length)
    }
  })
  it('zork1: the pump emits its unique bare synonym, not the DESC (F-Z)', () => {
    const pump = ZORK1_VOCAB.nouns.find(
      n => n.canonical === 'hand-held air pump',
    )
    expect(pump?.emit).toBe('pump') // SYNONYM PUMP AIR-PUMP TOOL TOOLS — 'pump' is unique
  })
  it('zork1: trap door avoids the shared "door" synonym', () => {
    const trap = ZORK1_VOCAB.nouns.find(n => n.canonical === 'trap door')
    // SYNONYM DOOR TRAPDOOR TRAP-DOOR COVER: 'door' is shared, 'trapdoor' is unique
    expect(trap?.emit).toBe('trapdoor')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/llm/grammar/vocab-invariants.test.ts`
Expected: FAIL — `emit` missing.

- [ ] **Step 3: Implement**

`src/llm/grammar/types.ts`:

```ts
export interface NounEntry {
  canonical: string // stable lexicon key, e.g. "hand-held air pump" (ZIL DESC)
  emit: string // shortest parser-accepted name, e.g. "pump" — what we SEND
  synonyms?: string[]
  adjectives?: string[]
}
```

`scripts/lib/zil.mjs` — above `extractNouns`, add:

```js
// Manual emit overrides for objects with no unique synonym/adjective combo.
// Keyed by game number then canonical. Adding an entry is the documented
// resolution when computeEmit throws (NL v2 spec §9).
const EMIT_OVERRIDES = {
  1: {},
  2: {},
  3: {},
}

// Deterministic emit search (spec §9): each synonym bare in DECLARATION order
// (head first), then synonym × adjective pairs in declaration order; first
// game-unique combination wins. No unique form → build error naming the
// colliders. DESC-only sentinels (no synonyms) fall back to the canonical.
export function computeEmit(entry, all, override) {
  if (override) return override
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
```

In `extractNouns(dungeonSrc, globalsSrc)`: change the signature to `extractNouns(dungeonSrc, globalsSrc, N)`, keep declaration-order arrays alongside the entry, then compute emits in a second pass:

```js
    // (inside the per-object loop, replacing the entry-construction tail)
    const canonical = desc ? desc.toLowerCase() : syn[0] || null
    if (!canonical || seen.has(canonical)) continue
    seen.add(canonical)
    out.push({ canonical, synDecl: syn, adjDecl: adj })
  }

  for (const e of out)
    e.emit = computeEmit(e, out, (EMIT_OVERRIDES[N] ?? {})[e.canonical])

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
```

In `buildVocabModule`'s `noun` renderer, add emit after canonical:

```js
    const parts = [
      `"canonical":${JSON.stringify(e.canonical)}`,
      `"emit":${JSON.stringify(e.emit)}`,
    ]
```

In `scripts/extract-vocab.mjs`, pass the game number: `const nouns = extractNouns(dungeon, globals, N)`.

- [ ] **Step 4: Regenerate + fix fixtures + run**

Run: `make extract-vocab`
Expected: succeeds for all three games (if `computeEmit` throws, add the named `EMIT_OVERRIDES` entry — pick the shortest Z-dictionary-valid phrase — and re-run; record any override in the commit message). Then `npx vitest run src/llm/grammar/vocab-invariants.test.ts` → PASS. Then `make typecheck` — every literal `NounEntry` fixture in tests now needs `emit`; fix them (`emit` = the canonical for simple fixtures, e.g. `{ canonical: 'mailbox', emit: 'mailbox', … }`). `make test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src scripts
git commit -m "feat(vocab): deterministic per-noun emit forms with override table (F-Z)"
```

---

### Task 3: `nlpref` — language field + legacy migration

Locked decision 3: `{ language: 'off'|'en'|'fr'|'de'|'es', declined }` replaces `{ enabled, declined }`. Migration: `enabled:true → 'en'`, `enabled:false → 'off'`, `declined` preserved, corrupt → defaults.

**Files:**
- Modify: `src/llm/types.ts` (add `NlLanguage`, `ActiveLanguage`)
- Modify: `src/llm/nlpref.ts`
- Test: `src/llm/nlpref.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace/extend `src/llm/nlpref.test.ts` cases (keep the existing storage-error cases, they still apply):

```ts
import { readNlPref, writeNlPref } from './nlpref'

function fakeStore(initial: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size
    },
  } as Storage
}

describe('NlPref v2 (language picker)', () => {
  it('defaults to off/not-declined', () => {
    expect(readNlPref(fakeStore())).toEqual({
      language: 'off',
      declined: false,
    })
  })
  it('round-trips a language', () => {
    const s = fakeStore()
    writeNlPref({ language: 'fr' }, s)
    expect(readNlPref(s).language).toBe('fr')
  })
  it('migrates legacy enabled:true → en, preserving declined', () => {
    const s = fakeStore({
      'loquor.nl': JSON.stringify({ enabled: true, declined: false }),
    })
    expect(readNlPref(s)).toEqual({ language: 'en', declined: false })
  })
  it('migrates legacy enabled:false → off, preserving declined:true', () => {
    const s = fakeStore({
      'loquor.nl': JSON.stringify({ enabled: false, declined: true }),
    })
    expect(readNlPref(s)).toEqual({ language: 'off', declined: true })
  })
  it('unknown language value falls back to off', () => {
    const s = fakeStore({
      'loquor.nl': JSON.stringify({ language: 'tlh', declined: false }),
    })
    expect(readNlPref(s).language).toBe('off')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/nlpref.test.ts`
Expected: FAIL (`language` not in `NlPref`).

- [ ] **Step 3: Implement**

`src/llm/types.ts` — add near the top:

```ts
/** Picker languages. 'off' disables the NL layer (locked decision 3). */
export type NlLanguage = 'off' | 'en' | 'fr' | 'de' | 'es'
export type ActiveLanguage = Exclude<NlLanguage, 'off'>
```

`src/llm/nlpref.ts` — full new body:

```ts
// Validated localStorage persistence for the NL language picker + "declined".
// Mirrors src/ui/useTheme.ts (read-validate-fallback, swallow write errors).
import type { NlLanguage } from './types'

const KEY = 'loquor.nl'
const LANGUAGES: readonly NlLanguage[] = ['off', 'en', 'fr', 'de', 'es']

export interface NlPref {
  language: NlLanguage
  declined: boolean
}
const DEFAULT: NlPref = { language: 'off', declined: false }

export function readNlPref(store: Storage = localStorage): NlPref {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const declined = typeof parsed.declined === 'boolean' ? parsed.declined : false
    if (LANGUAGES.includes(parsed.language as NlLanguage))
      return { language: parsed.language as NlLanguage, declined }
    // Legacy v1 shape { enabled, declined }: enabled:true means the player was
    // typing SOMETHING the model translated — English is the only safe mapping.
    if (typeof parsed.enabled === 'boolean')
      return { language: parsed.enabled ? 'en' : 'off', declined }
    return { ...DEFAULT, declined }
  } catch (err) {
    console.warn('readNlPref: ignoring unreadable stored prefs', err)
    return DEFAULT
  }
}

export function writeNlPref(
  patch: Partial<NlPref>,
  store: Storage = localStorage,
): void {
  try {
    store.setItem(KEY, JSON.stringify({ ...readNlPref(store), ...patch }))
  } catch {
    // Private mode / quota — persistence is best-effort, never fatal.
  }
}
```

`useNaturalLanguage.ts` still references `readNlPref().enabled` / `writeNlPref({ enabled: … })` — to keep this task compilable without doing Task 20's work, make the three call sites language-based now: `readNlPref().enabled` → `readNlPref().language !== 'off'`; `writeNlPref({ enabled: true })` → `writeNlPref({ language: 'en' })`; `writeNlPref({ enabled: false })` / `writeNlPref({ declined: true, enabled: false })` → `writeNlPref({ language: 'off' })` / `writeNlPref({ declined: true, language: 'off' })`. (Task 20 replaces these with the real picker plumbing.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/llm/nlpref.test.ts src/llm/useNaturalLanguage.test.tsx`
Expected: PASS (fix any hook test that stubs the old pref shape).

- [ ] **Step 5: Commit**

```bash
git add src/llm
git commit -m "feat(nl): language-keyed NlPref with legacy enabled-flag migration"
```

---

### Task 4: Lexicon scaffolding — types + normalization (`fold`, `tokenize`)

**Files:**
- Create: `src/llm/lexicon/types.ts`
- Create: `src/llm/lexicon/fold.ts`
- Test: `src/llm/lexicon/fold.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/llm/lexicon/fold.test.ts`:

```ts
import { fold, tokenize } from './fold'

describe('fold', () => {
  it('lowercases and strips diacritics (UAT: decends/descends both match)', () => {
    expect(fold('Épée')).toBe('epee')
    expect(fold('öffne')).toBe('offne')
    expect(fold('niño')).toBe('nino')
  })
  it('splits elisions and clitic hyphens into spaces', () => {
    expect(fold("l'épée")).toBe('l epee')
    expect(fold('prends-le')).toBe('prends le')
    expect(fold('examine-moi')).toBe('examine moi')
  })
  it('strips terminal punctuation only', () => {
    expect(fold('ouvre la trappe!')).toBe('ouvre la trappe')
  })
})

describe('tokenize', () => {
  it('folds then splits on whitespace', () => {
    expect(tokenize("Ouvre  la boîte aux lettres.")).toEqual([
      'ouvre',
      'la',
      'boite',
      'aux',
      'lettres',
    ])
  })
  it('returns [] for blank input', () => {
    expect(tokenize('   ')).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/lexicon/fold.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/llm/lexicon/types.ts`:

```ts
// src/llm/lexicon/types.ts
import type { NlLanguage } from '../types'

/** Languages with lexicons (spec locked decision 1). */
export type LexLang = Exclude<NlLanguage, 'off' | 'en'>

/** German separable verb: leading verb + clause-final particle (spec §5.1). */
export interface ParticleVerb {
  verb: string // e.g. 'schalte'
  particle: string // e.g. 'ein' — closed set: ein/aus/an/auf/zu/ab/um/hoch/runter
  to: string // canonical English verb: 'turn on'
}

/** Game-independent core lexicon. ALL entries are stored diacritic-folded
 * (fold()-normalized); matching is fold-then-compare (spec §5.1/§6). */
export interface CoreLexicon {
  /** Single-word imperative forms players actually type → canonical verb. */
  verbs: Readonly<Record<string, string>>
  /** Contiguous multiword idioms, matched longest-first: 'laisse tomber' → drop. */
  verbIdioms: readonly { phrase: string; to: string }[]
  /** Discontiguous verb+particle patterns (DE; empty for fr/es). */
  particleVerbs: readonly ParticleVerb[]
  /** Foreign preposition → canonical English prep (must be in vocab.preps). */
  preps: Readonly<Record<string, string>>
  /** Determiners stripped at noun-phrase edges. */
  articles: readonly string[]
  /** Direct-object pronouns resolved to the scene antecedent (le/la/ihn/lo…). */
  pronounsDirect: readonly string[]
  /** Container anaphora ('dedans' → in <antecedent>) — F-E guard applies. */
  pronounsContainer: readonly string[]
  /** Self-reference ('moi'/'mich'/'me') → the Z-parser's 'me'. */
  pronounsSelf: readonly string[]
  /** Localized meta words → raw English command (migrates META_ALIASES). */
  metaAliases: Readonly<Record<string, string>>
}

/** Per-game noun lexicon: vocab CANONICAL → foreign surface words/phrases
 * (folded). A word may appear under several canonicals (ambiguity, spec §5.2). */
export type NounLexicon = Readonly<Record<string, readonly string[]>>
```

`src/llm/lexicon/fold.ts`:

```ts
// src/llm/lexicon/fold.ts
// Shared normalization for ALL lexicon matching (spec §6 step 1): lowercase,
// NFD diacritic-fold, elision apostrophes and clitic hyphens become spaces,
// terminal punctuation stripped. Lexicon DATA is stored already-folded; input
// is folded before lookup, so 'décends', 'decends' and 'descends' all match.
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/llm/lexicon/fold.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon
git commit -m "feat(lexicon): types + diacritic-folding normalization"
```

---

### Task 5: French core lexicon

**Files:**
- Create: `src/llm/lexicon/fr.core.ts`
- Test: `src/llm/lexicon/core.test.ts` (shared by tasks 5–7; create now)

- [ ] **Step 1: Write the failing tests**

`src/llm/lexicon/core.test.ts`:

```ts
import { FR_CORE } from './fr.core'

describe('fr core lexicon', () => {
  it('covers every UAT-discovered verb trap', () => {
    // F-M pose→take inverse; F-N agite/secoue; F-X sonne; F-CC remonte; F-Q lâche
    expect(FR_CORE.verbs['pose']).toBe('drop')
    expect(FR_CORE.verbs['poser']).toBe('drop')
    expect(FR_CORE.verbs['lache']).toBe('drop') // stored folded (lâche)
    expect(FR_CORE.verbs['agite']).toBe('wave')
    expect(FR_CORE.verbs['secoue']).toBe('wave')
    expect(FR_CORE.verbs['sonne']).toBe('ring')
    expect(FR_CORE.verbs['remonte']).toBe('wind up')
    expect(FR_CORE.verbs['gonfle']).toBe('inflate') // F-R
    expect(FR_CORE.verbIdioms).toContainEqual({
      phrase: 'laisse tomber',
      to: 'drop',
    })
  })
  it('meta aliases include the localized meta gaps (F5, F-U)', () => {
    expect(FR_CORE.metaAliases['inventaire']).toBe('inventory')
    expect(FR_CORE.metaAliases['diagnostic']).toBe('diagnose')
    expect(FR_CORE.metaAliases['sauvegarde']).toBe('save')
    expect(FR_CORE.metaAliases['recommence']).toBe('restart')
  })
  it('all keys/phrases are stored folded (no diacritics, lowercase)', () => {
    const all = [
      ...Object.keys(FR_CORE.verbs),
      ...FR_CORE.verbIdioms.map(v => v.phrase),
      ...Object.keys(FR_CORE.preps),
      ...FR_CORE.articles,
      ...Object.keys(FR_CORE.metaAliases),
    ]
    for (const k of all) expect(k).toBe(k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())
  })
  it('has no particle verbs (French idioms are contiguous)', () => {
    expect(FR_CORE.particleVerbs).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/lexicon/core.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `fr.core.ts`**

The file below is the **reviewed seed** — it must ship at least these entries. Extend it during this task by sweeping the canonical verb lists in `src/llm/grammar/zork1.vocab.ts` (`verbsOnly`, `verbs1`, `verbs2`) and adding the common French imperative (tu + vous forms) for every verb a player would plausibly use (target: every verb in the PROMPT_VERB_CORE list of `src/llm/prompt.ts` has at least one French mapping). All keys folded (no accents — `cle` not `clé`).

```ts
// src/llm/lexicon/fr.core.ts
// French core lexicon (game-independent). DATA IS STORED FOLDED: lowercase,
// no diacritics ('epee', 'lache'); fold() normalizes input to match.
// Conjugation is data, not stemming: list the imperative/2nd-person forms
// players actually type (tu + vous). Canonical targets must be extracted-vocab
// verbs — the round-trip suite (Task 14) gates this.
import type { CoreLexicon } from './types'

export const FR_CORE: CoreLexicon = {
  verbs: {
    // take
    prends: 'take', prenez: 'take', prend: 'take', ramasse: 'take',
    ramassez: 'take', attrape: 'take', saisis: 'take',
    // drop (UAT F-M/F-Q traps: pose/lache)
    pose: 'drop', poser: 'drop', posez: 'drop', lache: 'drop', lachez: 'drop',
    jette: 'throw', jetez: 'throw',
    // open/close
    ouvre: 'open', ouvrez: 'open', ferme: 'close', fermez: 'close',
    // examine/read/look
    examine: 'examine', examinez: 'examine', regarde: 'look', regardez: 'look',
    lis: 'read', lisez: 'read',
    // movement-adjacent in-world verbs
    monte: 'climb', montez: 'climb', grimpe: 'climb', traverse: 'cross',
    entre: 'enter', entrez: 'enter', sors: 'exit', sortez: 'exit',
    // light/extinguish
    allume: 'light', allumez: 'light', eteins: 'extinguish',
    eteignez: 'extinguish',
    // UAT verb traps
    agite: 'wave', agitez: 'wave', secoue: 'wave', secouez: 'wave', // F-N
    sonne: 'ring', sonnez: 'ring', // F-X
    remonte: 'wind up', remontez: 'wind up', // F-CC
    gonfle: 'inflate', gonflez: 'inflate', // F-R
    creuse: 'dig', creusez: 'dig',
    attache: 'tie', attachez: 'tie', noue: 'tie',
    // combat & misc
    tue: 'attack', tuez: 'attack', attaque: 'attack', attaquez: 'attack',
    frappe: 'attack', mange: 'eat', mangez: 'eat', bois: 'drink',
    buvez: 'drink', pousse: 'push', poussez: 'push', tire: 'pull',
    tirez: 'pull', deplace: 'move', deplacez: 'move', bouge: 'move',
    donne: 'give', donnez: 'give', mets: 'put', mettez: 'put',
    attends: 'wait', attendez: 'wait', prie: 'pray', priez: 'pray',
    deverrouille: 'unlock', verrouille: 'lock', brule: 'burn', brulez: 'burn',
  },
  verbIdioms: [
    { phrase: 'laisse tomber', to: 'drop' },
    { phrase: 'laissez tomber', to: 'drop' },
    { phrase: 'appuie sur', to: 'push' },
    { phrase: 'appuyez sur', to: 'push' },
    { phrase: 'mets en marche', to: 'turn on' },
    { phrase: 'mettez en marche', to: 'turn on' },
    { phrase: 'jette un oeil a', to: 'examine' },
  ],
  particleVerbs: [],
  preps: {
    avec: 'with', dans: 'in', a: 'to', au: 'to', aux: 'to', sur: 'on',
    sous: 'under', vers: 'to', de: 'from',
  },
  articles: ['le', 'la', 'les', 'l', 'un', 'une', 'du', 'des', 'mon', 'ma', 'mes', 'ce', 'cette', 'ces'],
  pronounsDirect: ['le', 'la', 'les'],
  pronounsContainer: ['dedans', 'dessus'],
  pronounsSelf: ['moi', 'me'],
  metaAliases: {
    inventaire: 'inventory', // fr (migrated from META_ALIASES)
    diagnostic: 'diagnose', // F5
    recommence: 'restart',
    sauvegarde: 'save',
    restaure: 'restore',
    quitte: 'quit',
    points: 'score',
  },
}
```

NOTE the deliberate collision: `le`/`la`/`les` are both articles and direct-object pronouns. The parser (Task 13) treats a *leading-position* `le/la/les` before a noun as an article and a *standalone* one (no following noun tokens) as a pronoun — encode exactly that in Task 13's tests, not here.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/llm/lexicon/core.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon
git commit -m "feat(lexicon): French core lexicon (verbs, idioms, preps, meta aliases)"
```

---

### Task 6: German core lexicon (with separable-prefix particle verbs)

**Files:**
- Create: `src/llm/lexicon/de.core.ts`
- Test: extend `src/llm/lexicon/core.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/llm/lexicon/core.test.ts`:

```ts
import { DE_CORE } from './de.core'

describe('de core lexicon', () => {
  it('separable verbs are particle patterns, never bare-stem verb entries', () => {
    expect(DE_CORE.particleVerbs).toContainEqual({
      verb: 'schalte',
      particle: 'ein',
      to: 'turn on',
    })
    expect(DE_CORE.particleVerbs).toContainEqual({
      verb: 'schalte',
      particle: 'aus',
      to: 'turn off',
    })
    expect(DE_CORE.particleVerbs).toContainEqual({
      verb: 'mach',
      particle: 'auf',
      to: 'open',
    })
    expect(DE_CORE.particleVerbs).toContainEqual({
      verb: 'hebe',
      particle: 'auf',
      to: 'take',
    })
    // The bare stem must NOT be a verb entry — 'mach' alone ≈ make (spec §5.1)
    expect(DE_CORE.verbs['mach']).toBeUndefined()
    expect(DE_CORE.verbs['schalte']).toBeUndefined()
  })
  it('particles come from the closed set', () => {
    const allowed = new Set(['ein', 'aus', 'an', 'auf', 'zu', 'ab', 'um', 'hoch', 'runter'])
    for (const p of DE_CORE.particleVerbs) expect(allowed.has(p.particle)).toBe(true)
  })
  it('covers core verbs + meta aliases', () => {
    expect(DE_CORE.verbs['nimm']).toBe('take')
    expect(DE_CORE.verbs['offne']).toBe('open') // folded öffne
    expect(DE_CORE.metaAliases['inventar']).toBe('inventory')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/lexicon/core.test.ts`
Expected: FAIL — `de.core` not found.

- [ ] **Step 3: Implement `de.core.ts`**

Seed (extend like Task 5 — every PROMPT_VERB_CORE verb gets a German mapping; all folded — `offne` not `öffne`, `tur` not `tür`):

```ts
// src/llm/lexicon/de.core.ts
// German core lexicon. STORED FOLDED (umlauts stripped: 'offne', 'schiess').
// German imperatives split separable prefixes to the clause end
// ('schalte die Laterne EIN') — those are particleVerbs, matched as leading
// verb + clause-final particle (spec §5.1); the bare stem is NOT listed in
// `verbs` so it can never match without its particle.
import type { CoreLexicon } from './types'

export const DE_CORE: CoreLexicon = {
  verbs: {
    nimm: 'take', nehmen: 'take', nehmt: 'take', greif: 'take',
    lass: 'drop', wirf: 'throw', werft: 'throw',
    offne: 'open', offnet: 'open', schliesse: 'close', schliesst: 'close',
    untersuche: 'examine', betrachte: 'examine', lies: 'read', lest: 'read',
    schau: 'look', schaut: 'look', sieh: 'look',
    klettere: 'climb', steige: 'climb', uberquere: 'cross',
    betrete: 'enter', verlasse: 'exit',
    zunde: 'light', losche: 'extinguish',
    schwenke: 'wave', schuttle: 'wave', winke: 'wave',
    lauste: 'listen', lausche: 'listen',
    klingle: 'ring', laute: 'ring',
    grabe: 'dig', grab: 'dig',
    binde: 'tie', knote: 'tie',
    tote: 'attack', greife: 'attack', kampfe: 'attack', schlage: 'attack',
    iss: 'eat', esst: 'eat', trink: 'drink', trinkt: 'drink',
    druecke: 'push', drucke: 'push', schiebe: 'push', zieh: 'pull',
    ziehe: 'pull', bewege: 'move', gib: 'give', gebt: 'give',
    lege: 'put', leg: 'put', stelle: 'put', warte: 'wait', bete: 'pray',
    entriegle: 'unlock', verbrenne: 'burn', pumpe: 'inflate',
  },
  verbIdioms: [
    { phrase: 'lass fallen', to: 'drop' }, // contiguous variant
    { phrase: 'leg ab', to: 'drop' },
  ],
  particleVerbs: [
    { verb: 'schalte', particle: 'ein', to: 'turn on' },
    { verb: 'schalte', particle: 'an', to: 'turn on' },
    { verb: 'schalte', particle: 'aus', to: 'turn off' },
    { verb: 'mach', particle: 'an', to: 'turn on' },
    { verb: 'mach', particle: 'aus', to: 'turn off' },
    { verb: 'mach', particle: 'auf', to: 'open' },
    { verb: 'mach', particle: 'zu', to: 'close' },
    { verb: 'hebe', particle: 'auf', to: 'take' },
    { verb: 'heb', particle: 'auf', to: 'take' },
    { verb: 'lege', particle: 'ab', to: 'drop' },
    { verb: 'leg', particle: 'ab', to: 'drop' },
    { verb: 'zieh', particle: 'hoch', to: 'pull' },
    { verb: 'binde', particle: 'an', to: 'tie' },
  ],
  preps: {
    mit: 'with', in: 'in', an: 'on', auf: 'on', unter: 'under', zu: 'to',
    nach: 'to', aus: 'from', von: 'from',
  },
  articles: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'mein', 'meine', 'meinen'],
  pronounsDirect: ['ihn', 'sie', 'es'],
  pronounsContainer: ['hinein', 'darauf', 'darin', 'rein'],
  pronounsSelf: ['mich', 'mir'],
  metaAliases: {
    inventar: 'inventory', // migrated from META_ALIASES
    diagnose: 'diagnose',
    neustart: 'restart',
    speichern: 'save',
    speichere: 'save',
    laden: 'restore',
    beenden: 'quit',
    punkte: 'score',
  },
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/llm/lexicon/core.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon
git commit -m "feat(lexicon): German core lexicon with separable verb+particle patterns"
```

---

### Task 7: Spanish core lexicon

**Files:**
- Create: `src/llm/lexicon/es.core.ts`
- Test: extend `src/llm/lexicon/core.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/llm/lexicon/core.test.ts`:

```ts
import { ES_CORE } from './es.core'

describe('es core lexicon', () => {
  it('covers core verbs incl. attached-clitic imperatives as idiom data', () => {
    expect(ES_CORE.verbs['toma']).toBe('take')
    expect(ES_CORE.verbs['coge']).toBe('take')
    expect(ES_CORE.verbs['abre']).toBe('open')
    expect(ES_CORE.verbs['suelta']).toBe('drop')
    expect(ES_CORE.verbs['deja']).toBe('drop')
  })
  it('meta aliases include inventario (F5)', () => {
    expect(ES_CORE.metaAliases['inventario']).toBe('inventory')
  })
  it('no particle verbs', () => {
    expect(ES_CORE.particleVerbs).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/lexicon/core.test.ts` — FAIL (`es.core` missing).

- [ ] **Step 3: Implement `es.core.ts`**

Seed (extend like Task 5; folded — `examina` etc. Note: Spanish attached clitics like `tómalo` fold to `tomalo`, which is NOT splittable by fold(). These deliberately fall through to the LLM — the spec (§5.1) promises clitic handling only for French's hyphen-split forms, and Task 16's ES few-shots include `tómalo` so the fallback handles them well. Do NOT add attached-clitic entries to `verbs`):

```ts
// src/llm/lexicon/es.core.ts
// Spanish core lexicon. STORED FOLDED ('examina', no accents).
// Attached clitic imperatives (tómalo/ábrela) fold to single unsplittable
// tokens ('tomalo'), so they intentionally MISS here and fall to the LLM,
// whose ES few-shots cover them (spec §5.1 promises clitic handling only for
// French's hyphen-split forms). Detached pronouns ('toma lo'? nonstandard)
// are not listed either — keep this map to plain imperative forms.
import type { CoreLexicon } from './types'

export const ES_CORE: CoreLexicon = {
  verbs: {
    toma: 'take', tomad: 'take', coge: 'take', coged: 'take', agarra: 'take',
    recoge: 'take',
    suelta: 'drop', deja: 'drop', dejad: 'drop', tira: 'throw', lanza: 'throw',
    abre: 'open', abrid: 'open', cierra: 'close', cerrad: 'close',
    examina: 'examine', mira: 'look', mirad: 'look', lee: 'read', leed: 'read',
    sube: 'climb', trepa: 'climb', cruza: 'cross', entra: 'enter', sal: 'exit',
    enciende: 'light', apaga: 'extinguish',
    agita: 'wave', sacude: 'wave',
    toca: 'ring', suena: 'ring',
    cava: 'dig', excava: 'dig',
    ata: 'tie', amarra: 'tie',
    mata: 'attack', ataca: 'attack', golpea: 'attack', pelea: 'attack',
    come: 'eat', comed: 'eat', bebe: 'drink', bebed: 'drink',
    empuja: 'push', presiona: 'push', jala: 'pull', mueve: 'move',
    da: 'give', dale: 'give', pon: 'put', poned: 'put', mete: 'put',
    espera: 'wait', reza: 'pray', desbloquea: 'unlock', quema: 'burn',
    infla: 'inflate',
  },
  verbIdioms: [
    { phrase: 'echa un vistazo a', to: 'examine' },
    { phrase: 'pon en marcha', to: 'turn on' },
    { phrase: 'date la vuelta', to: 'turn' },
  ],
  particleVerbs: [],
  preps: {
    con: 'with', en: 'in', a: 'to', al: 'to', sobre: 'on', bajo: 'under',
    hacia: 'to', de: 'from', dentro: 'in',
  },
  articles: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'mi', 'mis', 'este', 'esta', 'esa', 'ese'],
  pronounsDirect: ['lo', 'la', 'los', 'las'],
  pronounsContainer: ['dentro', 'encima', 'adentro'],
  pronounsSelf: ['me'],
  metaAliases: {
    inventario: 'inventory', // migrated from META_ALIASES
    diagnostico: 'diagnose',
    reinicia: 'restart',
    guarda: 'save',
    guardar: 'save',
    restaura: 'restore',
    salir: 'quit',
    puntos: 'score',
    puntuacion: 'score',
  },
}
```

- [ ] **Step 4: Run tests** — `npx vitest run src/llm/lexicon/core.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon
git commit -m "feat(lexicon): Spanish core lexicon"
```

---

### Task 8: Migrate `META_ALIASES` into the core lexicons

`metaAlias` becomes core-lexicon-driven; the 3-entry seed table in `meta.ts` is deleted (its entries already live in the Task 5–7 cores).

**Files:**
- Modify: `src/llm/meta.ts` (delete `META_ALIASES`)
- Modify: `src/llm/translate.ts` (`metaAlias(english, core)`)
- Modify: `src/llm/useNaturalLanguage.ts` (call sites pass `null` for now; Task 21 passes the active core)
- Test: `src/llm/translate.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/llm/translate.test.ts`, replace the existing `metaAlias` cases with:

```ts
import { FR_CORE } from './lexicon/fr.core'

describe('metaAlias (core-lexicon-driven)', () => {
  it('maps a localized bare command via the active core lexicon', () => {
    expect(metaAlias('inventaire', FR_CORE)).toBe('inventory')
    expect(metaAlias('Diagnostic!', FR_CORE)).toBe('diagnose')
  })
  it('folds diacritics before lookup', () => {
    expect(metaAlias('Inventâire', FR_CORE)).toBe('inventory')
  })
  it('returns null with no core (English session) or for non-meta input', () => {
    expect(metaAlias('inventaire', null)).toBeNull()
    expect(metaAlias('inventaire de la maison', FR_CORE)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/translate.test.ts` — FAIL (signature mismatch).

- [ ] **Step 3: Implement**

`src/llm/meta.ts`: delete the `META_ALIASES` export and its comment block (keep `META_COMMANDS` untouched).

`src/llm/translate.ts`:

```ts
import type { CoreLexicon } from './lexicon/types'
import { fold } from './lexicon/fold'
// (remove META_ALIASES from the ./meta import)

/**
 * Map a localized command word (e.g. French "inventaire") to the English the
 * interpreter understands, via the ACTIVE language's core lexicon (spec §5.1 —
 * supersedes the META_ALIASES seed). Bare-word match only, diacritic-folded.
 * No core (language en/off) → null.
 */
export function metaAlias(
  english: string,
  core: CoreLexicon | null,
): string | null {
  if (!core) return null
  const norm = fold(normalizeBareCommand(english))
  if (norm.includes(' ')) return null
  return core.metaAliases[norm] ?? null
}
```

`src/llm/useNaturalLanguage.ts`: both `metaAlias(english)` / `metaAlias(clause)` call sites become `metaAlias(english, null)` / `metaAlias(clause, null)` with a `// TODO(Task 21): pass the active core lexicon` comment.

`scripts/extract-vocab.mjs`'s `readMetaSet` reads `META_COMMANDS` only — unaffected.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/llm/translate.test.ts src/llm/useNaturalLanguage.test.tsx`
Expected: PASS (update any hook test that asserted the old alias behavior — the alias path is dormant until Task 21).

- [ ] **Step 5: Commit**

```bash
git add src/llm scripts
git commit -m "refactor(nl): migrate META_ALIASES into per-language core lexicons"
```

---

### Task 9: Lexicon index — lookup, word set, collision gate, key validation

**Files:**
- Modify: `src/llm/grammar/index.ts` (export the signatures)
- Create: `src/llm/lexicon/index.ts`
- Create: `src/llm/lexicon/fr.zork1.ts`, `fr.zork2.ts`, `fr.zork3.ts`, `de.zork1.ts`, `de.zork2.ts`, `de.zork3.ts`, `es.zork1.ts`, `es.zork2.ts`, `es.zork3.ts` — **as seeds** (UAT traps; full coverage is Tasks 10–12)
- Create: `src/llm/lexicon/validate.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/llm/lexicon/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import { ZORK2_VOCAB } from '../grammar/zork2.vocab'
import { ZORK3_VOCAB } from '../grammar/zork3.vocab'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../grammar/index'
import {
  coreLexicon,
  nounLexicon,
  lexiconWordSet,
  KNOWN_COLLISIONS,
} from './index'
import { vocabWordSet } from '../translate' // Task 19 — see note below
import type { LexLang } from './types'
import type { Vocab } from '../grammar/types'

const GAMES: [string, Vocab][] = [
  [ZORK1_SIG, ZORK1_VOCAB],
  [ZORK2_SIG, ZORK2_VOCAB],
  [ZORK3_SIG, ZORK3_VOCAB],
]
const LANGS: LexLang[] = ['fr', 'de', 'es']

describe('lexicon build-time validation (spec §5.2)', () => {
  it('every noun-lexicon key is a vocab canonical (unknown key = build error)', () => {
    for (const lang of LANGS)
      for (const [sig, vocab] of GAMES) {
        const lex = nounLexicon(lang, sig)
        expect(lex).not.toBeNull()
        const canonicals = new Set(vocab.nouns.map(n => n.canonical))
        const unknown = Object.keys(lex!).filter(k => !canonicals.has(k))
        expect(unknown, `${lang}/${sig.slice(0, 8)} unknown keys`).toEqual([])
      }
  })
  it('collisions between lexicon words and game vocab match KNOWN_COLLISIONS exactly', () => {
    for (const lang of LANGS)
      for (const [sig, vocab] of GAMES) {
        const overlap = [...lexiconWordSet(lang, sig)]
          .filter(w => vocabWordSet(vocab).has(w))
          .sort()
        expect(overlap, `${lang}/${sig.slice(0, 8)}`).toEqual(
          [...(KNOWN_COLLISIONS[lang] ?? [])].sort(),
        )
      }
  })
  it('lookup returns null for an unknown signature', () => {
    expect(nounLexicon('fr', 'no-such-sig')).toBeNull()
  })
})
```

NOTE: `vocabWordSet` is built in Task 19. To keep THIS task self-contained, implement `vocabWordSet` now in `src/llm/translate.ts` (it is pure; Task 19 then only adds `unquote`/`isVocabPassthrough`):

```ts
/** Every word the game's parser knows (stage-4 passthrough set, spec §4):
 * verb words (incl. multiword parts), verb synonyms, preps, movement, noun
 * dictionary synonyms + adjectives, meta commands, and the English articles
 * the Z-parser accepts. Canonical DESC tokens are NOT included — they are not
 * parser dictionary words (F-Z). */
export function vocabWordSet(vocab: Vocab): Set<string> {
  const out = new Set<string>(['the', 'a', 'an'])
  const addWords = (s: string) => {
    for (const w of s.toLowerCase().split(/\s+/)) if (w) out.add(w)
  }
  for (const v of [...vocab.verbsOnly, ...vocab.verbs1, ...vocab.verbs2])
    addWords(v)
  for (const w of [...vocab.movement, ...vocab.preps, ...vocab.verbSynonyms])
    addWords(w)
  for (const n of vocab.nouns) {
    for (const s of n.synonyms ?? []) addWords(s)
    for (const adj of n.adjectives ?? []) addWords(adj)
  }
  for (const m of META_COMMANDS) addWords(m)
  return out
}
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/lexicon/validate.test.ts` — FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/llm/grammar/index.ts` — change the three `const` declarations to `export const` (`ZORK1_SIG`, `ZORK2_SIG`, `ZORK3_SIG`). Nothing else changes.

Seed noun lexicons — `src/llm/lexicon/fr.zork1.ts` (the UAT-trap seed; Task 10 completes it):

```ts
// src/llm/lexicon/fr.zork1.ts
// French → Zork I noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork1.vocab.ts); VALUES are folded French words/phrases.
// Validated by lexicon/validate.test.ts; coverage gated by Task 10.
import type { NounLexicon } from './types'

export const FR_ZORK1: NounLexicon = {
  // UAT-discovered traps first (uat-1/uat-2): cle, lampe, pose-target, trappe…
  'brass lantern': ['lampe', 'lanterne', 'lampe de poche'],
  'trap door': ['trappe', 'porte de cave'],
  'small mailbox': ['boite aux lettres', 'boite'],
  wrench: ['cle', 'cle a molette', 'cle anglaise'],
  'skeleton key': ['cle', 'cle squelette', 'passe partout'],
  leaflet: ['depliant', 'brochure', 'prospectus'],
  sword: ['epee'],
  rug: ['tapis'],
  'kitchen window': ['fenetre', 'fenetre de la cuisine'],
  sack: ['sac'],
  'glass bottle': ['bouteille'],
  'jewel-encrusted egg': ['oeuf'],
  rope: ['corde'],
  knife: ['couteau'],
  torch: ['torche'],
  coffin: ['cercueil'], // F-Q
  sceptre: ['sceptre'],
  'pot of gold': ['pot d or', 'or'], // F: intra-compound 'or' binding
  'trophy case': ['vitrine', 'vitrine a trophees'], // F-F trap
  troll: ['troll'],
  thief: ['voleur'],
  cyclops: ['cyclope'],
  'pile of leaves': ['feuilles', 'tas de feuilles'],
  'hand-held air pump': ['pompe', 'pompe a air'],
  bell: ['cloche'], // F-DD (écho/bell context)
}
```

Create the other 8 files in the same shape: `de.zork1.ts` (seed: `lampe/laterne`, `falltur` → 'trap door', `briefkasten` → 'small mailbox', `schwert` → sword, `teppich` → rug, `seil` → rope, `schlussel` → wrench+skeleton key (the DE `cle`-class ambiguity), `sack`, `troll`, `dieb` → thief, `truhe/vitrine` → 'trophy case', `pumpe` → 'hand-held air pump', `glocke` → bell), `es.zork1.ts` (seed: `lampara/linterna`, `trampilla` → 'trap door', `buzon` → 'small mailbox', `espada` → sword, `alfombra` → rug, `cuerda` → rope, `llave` → wrench+skeleton key, `saco/bolsa` → sack, `trol` → troll, `ladron` → thief, `vitrina` → 'trophy case', `bomba/inflador` → 'hand-held air pump', `campana` → bell), and `{fr,de,es}.zork{2,3}.ts` seeded with each game's most common nouns (sword/lamp/key equivalents — read the canonicals out of `zork2.vocab.ts`/`zork3.vocab.ts` and pick the obvious 10–15; full coverage comes in Tasks 10–12). **Check every key against the actual `canonical` strings in the generated vocab files — do not guess: `grep "canonical" src/llm/grammar/zork1.vocab.ts | less`.**

`src/llm/lexicon/index.ts`:

```ts
// src/llm/lexicon/index.ts
// Lookup by (language, story signature) + the stage-4 collision guard's word set.
import type { CoreLexicon, NounLexicon, LexLang } from './types'
import { FR_CORE } from './fr.core'
import { DE_CORE } from './de.core'
import { ES_CORE } from './es.core'
import { FR_ZORK1 } from './fr.zork1'
import { FR_ZORK2 } from './fr.zork2'
import { FR_ZORK3 } from './fr.zork3'
import { DE_ZORK1 } from './de.zork1'
import { DE_ZORK2 } from './de.zork2'
import { DE_ZORK3 } from './de.zork3'
import { ES_ZORK1 } from './es.zork1'
import { ES_ZORK2 } from './es.zork2'
import { ES_ZORK3 } from './es.zork3'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../grammar/index'

const CORES: Record<LexLang, CoreLexicon> = {
  fr: FR_CORE,
  de: DE_CORE,
  es: ES_CORE,
}

const NOUNS: Record<LexLang, Record<string, NounLexicon>> = {
  fr: { [ZORK1_SIG]: FR_ZORK1, [ZORK2_SIG]: FR_ZORK2, [ZORK3_SIG]: FR_ZORK3 },
  de: { [ZORK1_SIG]: DE_ZORK1, [ZORK2_SIG]: DE_ZORK2, [ZORK3_SIG]: DE_ZORK3 },
  es: { [ZORK1_SIG]: ES_ZORK1, [ZORK2_SIG]: ES_ZORK2, [ZORK3_SIG]: ES_ZORK3 },
}

export function coreLexicon(lang: LexLang): CoreLexicon {
  return CORES[lang]
}

export function nounLexicon(lang: LexLang, sig: string): NounLexicon | null {
  return NOUNS[lang][sig] ?? null
}

/**
 * Every SOURCE word of the active language's lexicon (folded, split to single
 * tokens). The stage-4 vocab-passthrough guard: a token in this set does NOT
 * count as "already game vocab" when the picker ≠ English (spec §4 collision
 * guard) — it must go through the lexicon parse instead.
 */
export function lexiconWordSet(lang: LexLang, sig: string): Set<string> {
  const out = new Set<string>()
  const add = (phrase: string) => {
    for (const w of phrase.split(' ')) if (w) out.add(w)
  }
  const core = CORES[lang]
  for (const k of Object.keys(core.verbs)) add(k)
  for (const v of core.verbIdioms) add(v.phrase)
  for (const p of core.particleVerbs) {
    add(p.verb)
    add(p.particle)
  }
  for (const k of Object.keys(core.preps)) add(k)
  for (const a of core.articles) add(a)
  for (const k of Object.keys(core.metaAliases)) add(k)
  const nouns = NOUNS[lang][sig]
  if (nouns) for (const words of Object.values(nouns)) for (const w of words) add(w)
  return out
}

/**
 * Reviewed lexicon↔vocab collisions per language (spec §5.2 collision report,
 * pushback issue 2). The validation test asserts SET EQUALITY, so any new
 * overlap is a visible authoring decision in this diff, never a silent
 * passthrough hijack. These words route through the lexicon when the picker
 * is that language (stage-4 guard) — verify each entry is what you want.
 */
export const KNOWN_COLLISIONS: Record<LexLang, readonly string[]> = {
  // e.g. fr 'a' (prep à, folded) vs English article 'a'; 'sonne' if a vocab
  // word, etc. POPULATE FROM THE FIRST VALIDATION RUN — start empty, then
  // review every word the test reports and either rename the lexicon entry or
  // accept it here with a comment.
  fr: [],
  de: [],
  es: [],
}
```

- [ ] **Step 4: Run, review collisions, accept**

Run: `npx vitest run src/llm/lexicon/validate.test.ts`
Expected: key-validation passes (fix any guessed key against the real canonicals); the collision test FAILS, printing the actual overlap (at minimum `fr: ['a']` — French prep `a` vs the English article). Review each reported word: it is correct for it to be in the lexicon (the guard routes it to the lexicon parse); move the sorted list into `KNOWN_COLLISIONS` with a one-line comment per word. Re-run → PASS. Then `make test`.

- [ ] **Step 5: Commit**

```bash
git add src/llm
git commit -m "feat(lexicon): (language, signature) lookup, collision gate, seed noun lexicons"
```

---

### Task 10: French noun lexicons — full coverage (Zork I, II, III)

Ovid's decision (pushback review): all 9 noun files ship in v2, full coverage, gated by test. This task is **data authoring driven by a red test**: the coverage gate lists every uncovered canonical; author entries until the list is empty.

**Files:**
- Modify: `src/llm/lexicon/fr.zork1.ts`, `fr.zork2.ts`, `fr.zork3.ts`
- Test: extend `src/llm/lexicon/validate.test.ts`

- [ ] **Step 1: Write the failing coverage gate**

Append to `src/llm/lexicon/validate.test.ts`:

```ts
describe('coverage (spec §5.2 — every vocab noun has an entry per language)', () => {
  it.each([
    ['fr', ZORK1_SIG, ZORK1_VOCAB, 'zork1'],
    ['fr', ZORK2_SIG, ZORK2_VOCAB, 'zork2'],
    ['fr', ZORK3_SIG, ZORK3_VOCAB, 'zork3'],
  ] as const)('%s covers %s (#%#)', (lang, sig, vocab, _name) => {
    const lex = nounLexicon(lang as LexLang, sig)!
    const missing = vocab.nouns
      .map(n => n.canonical)
      .filter(c => !(c in lex))
    expect(missing).toEqual([])
  })
})
```

(Tasks 11/12 append the `de`/`es` rows to the same `it.each` table.)

- [ ] **Step 2: Run to verify failure — and capture the work list**

Run: `npx vitest run src/llm/lexicon/validate.test.ts`
Expected: FAIL, printing the full `missing` arrays — that output IS the authoring checklist (~128 zork1 / ~141 zork2 / ~57 zork3 canonicals).

- [ ] **Step 3: Author the entries**

For each missing canonical, add a `FR_ZORK?` entry with 1–4 folded French words a player would type for that object. Method, per noun:
1. The canonical is the ZIL DESC — translate it directly (`'pair of candles'` → `['bougies', 'chandelles']`).
2. Check the entry's `synonyms` in the vocab file for what the object IS (disambiguates vague DESCs).
3. Reuse the same French word under multiple canonicals when French genuinely merges them (`cle`) — ambiguity is first-class (spec §5.2).
4. Keep phrases short; include the bare head noun players will actually type, not just the full phrase.
5. Diacritic-fold everything (`epee`, `tresor`, `boite`).

Re-run the test after each file; iterate until green. If a canonical is untranslatable in isolation (proper nouns like `grue`), map it to itself Frenchified or to the English word (`['grue']`) — an entry must exist so the gap is a decision, not an oversight.

- [ ] **Step 4: Run the full validation suite**

Run: `npx vitest run src/llm/lexicon/validate.test.ts`
Expected: PASS — including the collision gate; new collisions surfaced by the added words must be reviewed into `KNOWN_COLLISIONS` (each with a comment), not ignored.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon
git commit -m "feat(lexicon): full French noun coverage for Zork I-III"
```

---

### Task 11: German noun lexicons — full coverage

Same procedure as Task 10 for `de.zork{1,2,3}.ts`.

- [ ] **Step 1:** Append the three `de` rows to the coverage `it.each` table in `validate.test.ts`.
- [ ] **Step 2:** Run `npx vitest run src/llm/lexicon/validate.test.ts` — FAIL with the German work list.
- [ ] **Step 3:** Author all entries (folded: umlauts stripped — `tur`, `schlussel`; compounds welcome: `messinglaterne`). German players also type bare compounds — include both `laterne` and `lampe` where natural.
- [ ] **Step 4:** Re-run validation incl. collision review (`in`/`an`/`auf` likely collide with English vocab words — review into `KNOWN_COLLISIONS.de` with comments).
- [ ] **Step 5:** Commit:

```bash
git add src/llm/lexicon
git commit -m "feat(lexicon): full German noun coverage for Zork I-III"
```

---

### Task 12: Spanish noun lexicons — full coverage

Same procedure for `es.zork{1,2,3}.ts`.

- [ ] **Step 1:** Append the three `es` rows to the coverage table.
- [ ] **Step 2:** Run — FAIL with the Spanish work list.
- [ ] **Step 3:** Author all entries (folded: `lampara`, `espada`, `bano`).
- [ ] **Step 4:** Re-run validation + collision review.
- [ ] **Step 5:** Commit:

```bash
git add src/llm/lexicon
git commit -m "feat(lexicon): full Spanish noun coverage for Zork I-III"
```

---

### Task 13: The deterministic parser (`src/llm/lexicon/parse.ts`)

The centerpiece (spec §6). Pure function; never guesses — any unconsumed content token → `{ kind: 'miss' }` and the clause falls to the LLM.

**Files:**
- Create: `src/llm/lexicon/parse.ts`
- Test: `src/llm/lexicon/parse.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/llm/lexicon/parse.test.ts`:

```ts
import { parseLexicon } from './parse'
import { FR_CORE } from './fr.core'
import { DE_CORE } from './de.core'
import { ES_CORE } from './es.core'
import type { NounLexicon } from './types'
import type { Vocab } from '../grammar/types'
import type { Scene } from '../scene/types'

// Minimal but realistic fixture vocab (emit ≠ canonical for the trap door,
// mirroring the generated data).
const vocab: Vocab = {
  verbsOnly: ['look', 'wait', 'pray'],
  movement: ['north', 'south', 'down'],
  verbs1: ['take', 'drop', 'open', 'close', 'read', 'examine', 'ring', 'wave', 'turn on', 'turn off', 'wind up', 'inflate'],
  verbs2: ['attack', 'put', 'tie', 'unlock', 'give', 'turn on', 'take', 'drop', 'open', 'read'],
  preps: ['with', 'in', 'to', 'on', 'under', 'from'],
  verbSynonyms: [],
  nouns: [
    { canonical: 'brass lantern', emit: 'light', synonyms: ['lamp', 'lantern', 'light'], adjectives: ['brass'] },
    { canonical: 'trap door', emit: 'trapdoor', synonyms: ['door', 'trapdoor', 'cover'], adjectives: ['trap', 'dusty'] },
    { canonical: 'small mailbox', emit: 'mailbox', synonyms: ['mailbox', 'box'], adjectives: ['small'] },
    { canonical: 'sword', emit: 'sword', synonyms: ['sword', 'blade'] },
    { canonical: 'troll', emit: 'troll', synonyms: ['troll'] },
    { canonical: 'wrench', emit: 'wrench', synonyms: ['wrench'] },
    { canonical: 'skeleton key', emit: 'key', synonyms: ['key'], adjectives: ['skeleton'] },
    { canonical: 'painting', emit: 'painting', synonyms: ['painting'] },
    { canonical: 'trophy case', emit: 'case', synonyms: ['case'], adjectives: ['trophy'] },
  ],
  takeAck: /taken/i,
  dropAck: /dropped/i,
  absencePat: /\bno\s+(\w+)\b/gi,
}

const FR_NOUNS: NounLexicon = {
  'brass lantern': ['lampe', 'lanterne'],
  'trap door': ['trappe'],
  'small mailbox': ['boite aux lettres', 'boite'],
  sword: ['epee'],
  troll: ['troll'],
  wrench: ['cle', 'cle a molette'],
  'skeleton key': ['cle'],
  painting: ['tableau'],
  'trophy case': ['vitrine'],
}
const DE_NOUNS: NounLexicon = {
  'brass lantern': ['lampe', 'laterne'],
  'trap door': ['falltur'],
  sword: ['schwert'],
}
const ES_NOUNS: NounLexicon = {
  'brass lantern': ['lampara', 'linterna'],
  sword: ['espada'],
}

const empty: Scene = { inScope: [], antecedent: null }
const scene = (canonicals: string[], antecedent: string | null = null): Scene => ({
  inScope: canonicals.map(c => ({ canonical: c })),
  antecedent,
})

describe('parseLexicon — French', () => {
  it('verb + article + noun, emitting the EMIT form (F-F/F-Z class)', () => {
    expect(parseLexicon('ouvre la trappe', FR_CORE, FR_NOUNS, vocab, empty)).toEqual(
      { kind: 'command', text: 'open trapdoor' },
    )
    expect(parseLexicon("prends la lampe", FR_CORE, FR_NOUNS, vocab, empty)).toEqual(
      { kind: 'command', text: 'take light' },
    )
  })
  it('diacritics and typos-by-accent fold away', () => {
    expect(parseLexicon('ouvre la trappe!', FR_CORE, FR_NOUNS, vocab, empty)).toEqual(
      { kind: 'command', text: 'open trapdoor' },
    )
    expect(parseLexicon("prends l'épée", FR_CORE, FR_NOUNS, vocab, empty)).toEqual(
      { kind: 'command', text: 'take sword' },
    )
  })
  it('multiword noun beats its embedded prep-lookalike (boite AUX lettres)', () => {
    expect(
      parseLexicon('ouvre la boite aux lettres', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'open mailbox' })
  })
  it('two-object command with prep (UAT #30)', () => {
    expect(
      parseLexicon("tue le troll avec l'epee", FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'attack troll with sword' })
  })
  it('multiword verb idiom, longest-first', () => {
    expect(
      parseLexicon('laisse tomber la lampe', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'drop light' })
  })
  it('ambiguous noun: scope preference wins (cle → wrench in scope)', () => {
    expect(
      parseLexicon('prends la cle', FR_CORE, FR_NOUNS, vocab, scene(['wrench'])),
    ).toEqual({ kind: 'command', text: 'take wrench' })
  })
  it('ambiguous noun, no scope, no shared synonym → miss (pushback issue 1)', () => {
    // wrench{wrench} and skeleton key{key} share no dictionary word
    expect(parseLexicon('prends la cle', FR_CORE, FR_NOUNS, vocab, empty)).toEqual(
      { kind: 'miss' },
    )
  })
  it('clitic pronoun resolves via antecedent (prends-le)', () => {
    expect(
      parseLexicon('prends-le', FR_CORE, FR_NOUNS, vocab, scene([], 'sword')),
    ).toEqual({ kind: 'command', text: 'take sword' })
  })
  it('pronoun with no antecedent → miss, never a guess', () => {
    expect(parseLexicon('prends-le', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'miss',
    })
  })
  it('container anaphora with F-E guard (antecedent ≠ object required)', () => {
    expect(
      parseLexicon(
        'mets le tableau dedans',
        FR_CORE,
        FR_NOUNS,
        vocab,
        scene(['painting', 'trophy case'], 'trophy case'),
      ),
    ).toEqual({ kind: 'command', text: 'put painting in case' })
    // antecedent IS the object → miss (F-E: "put painting in painting")
    expect(
      parseLexicon(
        'mets le tableau dedans',
        FR_CORE,
        FR_NOUNS,
        vocab,
        scene(['painting'], 'painting'),
      ),
    ).toEqual({ kind: 'miss' })
  })
  it('strictness: one unrecognized content token → miss', () => {
    expect(
      parseLexicon('ouvre prudemment la trappe', FR_CORE, FR_NOUNS, vocab, empty),
    ).toEqual({ kind: 'miss' })
  })
  it('verb-only commands', () => {
    expect(parseLexicon('attends', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'command',
      text: 'wait',
    })
  })
  it('verb arity respected: transitive verb without an object → miss', () => {
    // 'ring' is verbs1-only in the fixture; bare 'sonne' has no object
    expect(parseLexicon('sonne', FR_CORE, FR_NOUNS, vocab, empty)).toEqual({
      kind: 'miss',
    })
  })
})

describe('parseLexicon — German separable verbs (pushback issue 3)', () => {
  it('schalte … ein → turn on, noun between verb and particle', () => {
    expect(
      parseLexicon('schalte die laterne ein', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'turn on light' })
  })
  it('mach … auf → open', () => {
    expect(
      parseLexicon('mach die falltur auf', DE_CORE, DE_NOUNS, vocab, empty),
    ).toEqual({ kind: 'command', text: 'open trapdoor' })
  })
  it('bare stem without its particle never matches', () => {
    expect(parseLexicon('mach die falltur', DE_CORE, DE_NOUNS, vocab, empty)).toEqual(
      { kind: 'miss' },
    )
  })
})

describe('parseLexicon — Spanish', () => {
  it('verb + noun', () => {
    expect(parseLexicon('toma la espada', ES_CORE, ES_NOUNS, vocab, empty)).toEqual(
      { kind: 'command', text: 'take sword' },
    )
  })
})

describe('parseLexicon — English via vocab surface forms (spec §6.3)', () => {
  it('maps an English synonym phrase to the emit form', () => {
    expect(parseLexicon('open trap door', FR_CORE, FR_NOUNS, vocab, empty)).toEqual(
      { kind: 'command', text: 'open trapdoor' },
    )
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/lexicon/parse.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement `parse.ts`**

```ts
// src/llm/lexicon/parse.ts
// The deterministic translation stage (spec §6). Pure. STRICT: every content
// token must be consumed by some mapping, or the clause MISSES and falls to
// the LLM — this layer never guesses.
import type { CoreLexicon, NounLexicon } from './types'
import type { Vocab, NounEntry } from '../grammar/types'
import type { Scene } from '../scene/types'
import { tokenize } from './fold'

export type LexResult = { kind: 'command'; text: string } | { kind: 'miss' }
const MISS: LexResult = { kind: 'miss' }

interface NounHit {
  emit: string
  canonical: string
}

/** Resolve a token span to exactly one noun (whole-span match or miss). */
function resolveNoun(
  span: string[],
  core: CoreLexicon,
  nouns: NounLexicon,
  vocab: Vocab,
  scene: Scene,
): NounHit | null {
  // Drop leading articles (le/la/der/el …) — but only at the edge, so phrases
  // with INTERNAL articles ('boite aux lettres') match first as a whole.
  const tryResolve = (s: string[]): NounHit | null => {
    if (s.length === 0) return null
    const phrase = s.join(' ')
    // 1. Foreign noun lexicon (ambiguity is first-class — spec §5.2 order).
    const candidates = Object.entries(nouns)
      .filter(([, words]) => words.includes(phrase))
      .map(([canonical]) => canonical)
    if (candidates.length === 1) {
      const e = byCanonical(vocab, candidates[0])
      return e ? { emit: e.emit, canonical: e.canonical } : null
    }
    if (candidates.length > 1) {
      // (1) scope preference: room + inventory (scene tracker, spec §8)
      const inScope = new Set(scene.inScope.map(o => o.canonical))
      const scoped = candidates.filter(c => inScope.has(c))
      if (scoped.length === 1) {
        const e = byCanonical(vocab, scoped[0])
        return e ? { emit: e.emit, canonical: e.canonical } : null
      }
      // (2) shared dictionary word across ALL candidates → Z-parser disambiguates
      const entries = candidates
        .map(c => byCanonical(vocab, c))
        .filter((e): e is NounEntry => e !== undefined)
      const shared = (entries[0]?.synonyms ?? []).filter(w =>
        entries.every(e => (e.synonyms ?? []).includes(w)),
      )
      if (shared.length > 0)
        return { emit: shared[0], canonical: shared[0] }
      // (3) never guess → miss (pushback issue 1)
      return null
    }
    // 2. English vocab surface forms (synonym, adjective+synonym, canonical).
    for (const n of vocab.nouns) {
      const surfaces = new Set<string>([
        n.canonical.toLowerCase(),
        n.emit.toLowerCase(),
        ...(n.synonyms ?? []).map(x => x.toLowerCase()),
      ])
      for (const adj of n.adjectives ?? [])
        for (const syn of n.synonyms ?? [])
          surfaces.add(`${adj} ${syn}`.toLowerCase())
      if (surfaces.has(phrase)) return { emit: n.emit, canonical: n.canonical }
    }
    return null
  }
  const direct = tryResolve(span)
  if (direct) return direct
  let s = [...span]
  while (s.length > 1 && core.articles.includes(s[0])) {
    s = s.slice(1)
    const hit = tryResolve(s)
    if (hit) return hit
  }
  return null
}

function byCanonical(vocab: Vocab, canonical: string): NounEntry | undefined {
  return vocab.nouns.find(n => n.canonical === canonical)
}

function verbArityOk(verb: string, vocab: Vocab, objects: 0 | 1 | 2): boolean {
  if (objects === 0)
    return vocab.verbsOnly.includes(verb) || vocab.movement.includes(verb)
  if (objects === 1) return vocab.verbs1.includes(verb)
  return vocab.verbs2.includes(verb)
}

export function parseLexicon(
  clause: string,
  core: CoreLexicon,
  nouns: NounLexicon,
  vocab: Vocab,
  scene: Scene,
): LexResult {
  let tokens = tokenize(clause)
  if (tokens.length === 0) return MISS

  // --- Verb (spec §6.3): particle pattern → idiom (longest first) → single
  // word → English vocab verb (longest first). ---
  let verb: string | null = null
  const particle = core.particleVerbs.find(
    p => tokens[0] === p.verb && tokens[tokens.length - 1] === p.particle,
  )
  if (particle && tokens.length >= 2) {
    verb = particle.to
    tokens = tokens.slice(1, -1)
  } else {
    const idioms = [...core.verbIdioms].sort(
      (a, b) => b.phrase.length - a.phrase.length,
    )
    for (const idiom of idioms) {
      const parts = idiom.phrase.split(' ')
      if (parts.every((p, i) => tokens[i] === p)) {
        verb = idiom.to
        tokens = tokens.slice(parts.length)
        break
      }
    }
    if (!verb && core.verbs[tokens[0]]) {
      verb = core.verbs[tokens[0]]
      tokens = tokens.slice(1)
    }
    if (!verb) {
      const english = [...vocab.verbs2, ...vocab.verbs1, ...vocab.verbsOnly]
        .sort((a, b) => b.length - a.length)
      for (const v of english) {
        const parts = v.split(' ')
        if (parts.every((p, i) => tokens[i] === p)) {
          verb = v
          tokens = tokens.slice(parts.length)
          break
        }
      }
    }
  }
  if (!verb) return MISS

  // --- No remainder: verb-only. ---
  if (tokens.length === 0)
    return verbArityOk(verb, vocab, 0) ? { kind: 'command', text: verb } : MISS

  // --- Pronoun-only remainder (clitics already split by fold: 'prends le'). ---
  const stripLeadingArticlesForPronoun = tokens.length === 1
  if (stripLeadingArticlesForPronoun && core.pronounsDirect.includes(tokens[0])) {
    if (!scene.antecedent) return MISS
    const e = byCanonical(vocab, scene.antecedent)
    if (!e || !verbArityOk(verb, vocab, 1)) return MISS
    return { kind: 'command', text: `${verb} ${e.emit}` }
  }
  if (tokens.length === 1 && core.pronounsSelf.includes(tokens[0]))
    return verbArityOk(verb, vocab, 1)
      ? { kind: 'command', text: `${verb} me` }
      : MISS

  // --- Container anaphora: '<verb> <obj…> <containerPronoun>' (F-E guard). ---
  const last = tokens[tokens.length - 1]
  if (core.pronounsContainer.includes(last)) {
    const obj = resolveNoun(tokens.slice(0, -1), core, nouns, vocab, scene)
    if (!obj || !scene.antecedent) return MISS
    if (scene.antecedent === obj.canonical) return MISS // F-E: in itself
    const container = byCanonical(vocab, scene.antecedent)
    if (!container || !verbArityOk(verb, vocab, 2)) return MISS
    return { kind: 'command', text: `${verb} ${obj.emit} in ${container.emit}` }
  }

  // --- Whole remainder as ONE object (wins over prep-splitting so internal
  // prep-lookalikes — 'boite AUX lettres' — don't shear the phrase). ---
  const whole = resolveNoun(tokens, core, nouns, vocab, scene)
  if (whole) {
    return verbArityOk(verb, vocab, 1)
      ? { kind: 'command', text: `${verb} ${whole.emit}` }
      : MISS
  }

  // --- Prep split: first token (after ≥1 object token) that maps to an
  // English prep. ---
  for (let i = 1; i < tokens.length - 1; i++) {
    const prep = core.preps[tokens[i]] ??
      (vocab.preps.includes(tokens[i]) ? tokens[i] : undefined)
    if (!prep || !vocab.preps.includes(prep)) continue
    const obj = resolveNoun(tokens.slice(0, i), core, nouns, vocab, scene)
    const ind = resolveNoun(tokens.slice(i + 1), core, nouns, vocab, scene)
    if (obj && ind && verbArityOk(verb, vocab, 2))
      return {
        kind: 'command',
        text: `${verb} ${obj.emit} ${prep} ${ind.emit}`,
      }
  }

  return MISS // strictness: something didn't consume
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/llm/lexicon/parse.test.ts`
Expected: PASS. Then `make test` (nothing else consumes parse.ts yet).

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon
git commit -m "feat(lexicon): deterministic parser — verbs, particles, nouns, pronouns, strict miss"
```

---

### Task 14: Generated round-trip tests (every lexicon entry must parse)

Table-driven gate (spec §14): for each language × game, every core verb (with a covered noun) and every noun entry parses through `parseLexicon` to a vocab-valid canonical command. Catches a lexicon `to:` target that isn't a real vocab verb, a noun word that can't round-trip, idiom/particle breakage.

**Files:**
- Create: `src/llm/lexicon/roundtrip.test.ts`

- [ ] **Step 1: Write the (initially failing) generated suite**

```ts
// src/llm/lexicon/roundtrip.test.ts
// Generated gates (spec §14): the lexicon DATA must be self-consistent with
// the extracted vocab. Hundreds of cases, all deterministic, no LLM.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { coreLexicon, nounLexicon } from './index'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../grammar/index'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import { ZORK2_VOCAB } from '../grammar/zork2.vocab'
import { ZORK3_VOCAB } from '../grammar/zork3.vocab'
import type { LexLang } from './types'
import type { Vocab } from '../grammar/types'
import type { Scene } from '../scene/types'

const GAMES: [string, string, Vocab][] = [
  ['zork1', ZORK1_SIG, ZORK1_VOCAB],
  ['zork2', ZORK2_SIG, ZORK2_VOCAB],
  ['zork3', ZORK3_SIG, ZORK3_VOCAB],
]
const LANGS: LexLang[] = ['fr', 'de', 'es']
const empty: Scene = { inScope: [], antecedent: null }

describe('core lexicon targets are vocab verbs', () => {
  for (const lang of LANGS) {
    const core = coreLexicon(lang)
    const targets = [
      ...Object.values(core.verbs),
      ...core.verbIdioms.map(v => v.to),
      ...core.particleVerbs.map(p => p.to),
    ]
    it(`${lang}: every mapped verb exists in at least one game's vocab`, () => {
      const allVerbs = new Set(
        GAMES.flatMap(([, , v]) => [...v.verbsOnly, ...v.verbs1, ...v.verbs2, ...v.movement]),
      )
      const bad = targets.filter(t => !allVerbs.has(t))
      expect(bad).toEqual([])
    })
    it(`${lang}: every prep target is a vocab prep`, () => {
      const allPreps = new Set(GAMES.flatMap(([, , v]) => v.preps))
      const bad = Object.values(core.preps).filter(p => !allPreps.has(p))
      expect(bad).toEqual([])
    })
  }
})

describe('noun entries round-trip through the parser', () => {
  for (const lang of LANGS)
    for (const [name, sig, vocab] of GAMES) {
      const core = coreLexicon(lang)
      const nouns = nounLexicon(lang, sig)!
      // A 'take'-class verb every language has — resolved from the core data
      // itself so the test doesn't hardcode a word per language.
      const takeWord = Object.entries(core.verbs).find(([, to]) => to === 'take')![0]
      it(`${lang}/${name}: every noun word parses to a command naming its emit`, () => {
        const failures: string[] = []
        for (const [canonical, words] of Object.entries(nouns)) {
          const entry = vocab.nouns.find(n => n.canonical === canonical)!
          for (const w of words) {
            // Scope the noun's canonical so AMBIGUOUS words resolve to it —
            // ambiguity itself is tested in parse.test.ts.
            const scoped: Scene = {
              inScope: [{ canonical }],
              antecedent: null,
            }
            const r = parseLexicon(`${takeWord} ${w}`, core, nouns, vocab, scoped)
            if (vocab.verbs1.includes('take')) {
              if (r.kind !== 'command') {
                failures.push(`${w} → miss`)
              } else if (
                r.text !== `take ${entry.emit}` &&
                !r.text.startsWith('take ') // shared-synonym fallback is also valid
              ) {
                failures.push(`${w} → ${r.text}`)
              }
            }
          }
        }
        expect(failures).toEqual([])
      })
    }
})
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/llm/lexicon/roundtrip.test.ts`
Expected: likely FAIL with a concrete list — every failure is a data bug (a `to:` verb not in any vocab, a noun word that collides into ambiguity without scope, a phrase the tokenizer can't consume). Fix the DATA (or, for a genuine parser bug, fix parse.ts with a reduced case added to `parse.test.ts` first).

- [ ] **Step 3: Iterate until green**, then run the whole lexicon area: `npx vitest run src/llm/lexicon` → PASS.

- [ ] **Step 4: Full suite** — `make test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon
git commit -m "test(lexicon): generated round-trip gates for all languages and games"
```

---

### Task 15: Grammar + validator go vocab-driven (`buildGrammar(vocab)`, `parseCommand(raw, vocab)`)

Kills the wrong-object-snap class at its root (spec §7, locked decision 6): noun terminals = the full vocab's emit forms; scope no longer constrains. `parseCommand` validates against the vocab, not the scene.

**Files:**
- Modify: `src/llm/grammar/buildGrammar.ts`
- Modify: `src/llm/translate.ts` (`parseCommand`)
- Modify: `src/llm/useNaturalLanguage.ts` (call sites)
- Test: `src/llm/grammar/buildGrammar.test.ts`, `src/llm/translate.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/llm/grammar/buildGrammar.test.ts`, replace the scene-driven cases with (reuse the file's existing fixture vocab, adding `emit` per Task 2):

```ts
describe('buildGrammar (vocab-driven, NL v2 §7)', () => {
  it('noun terminals are ALL vocab emit forms, independent of any scene', () => {
    const g = buildGrammar(vocab)
    for (const n of vocab.nouns) expect(g).toContain(n.emit)
  })
  it('uses emit forms, not canonicals, when they differ', () => {
    // fixture: { canonical: 'hand-held air pump', emit: 'pump', … }
    const g = buildGrammar(vocab)
    expect(g).toContain('pump')
    expect(g).not.toContain('hand-held air pump')
  })
  it('always offers verb1/verb2 productions (vocab nouns are never empty)', () => {
    const g = buildGrammar(vocab)
    expect(g).toContain('verb1cmd')
    expect(g).toContain('verb2cmd')
  })
  it('still offers the abstain production', () => {
    expect(buildGrammar(vocab)).toContain('__UNKNOWN__')
  })
})
```

In `src/llm/translate.test.ts`, update the `parseCommand` block: every call drops the `scene` argument; add:

```ts
describe('parseCommand (vocab-gated, scope-free)', () => {
  it('accepts an object that is in vocab but NOT in scope (honest Z-machine failure downstream)', () => {
    const r = parseCommand('{"verb":"open","object":"trapdoor"}', vocab)
    expect(r).toEqual({ kind: 'command', text: 'open trapdoor' })
  })
  it('rejects an object not in the vocab emit set', () => {
    expect(parseCommand('{"verb":"open","object":"zeppelin"}', vocab)).toEqual({
      kind: 'abstain',
    })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/grammar/buildGrammar.test.ts src/llm/translate.test.ts` — FAIL.

- [ ] **Step 3: Implement**

`buildGrammar.ts` — new signature and noun source (JSDoc updated to match):

```ts
/**
 * Build a JSON-shaped GBNF for this turn. The `noun` production is the FULL
 * game vocab's emit forms (NL v2 §7): the model can always name any real
 * object; a wrong-room object gets the Z-machine's own honest "You can't see
 * any X here!". Scope is a prompt HINT only — never a constraint (the v1
 * scene-driven grammar was the root cause of the wrong-object-snap class).
 */
export function buildGrammar(vocab: Vocab): string {
  const nouns = vocab.nouns.map(n => n.emit)
  …
}
```

(The body keeps its `hasNouns`/`hasV2` structure — `nouns` is simply the full list now; `scene` import is removed.)

`translate.ts` — `parseCommand(rawJson: string, vocab: Vocab)`: delete the `scene` parameter and the `inScope` Set; validate `object`/`indirect` against:

```ts
  const emits = new Set(vocab.nouns.map(n => n.emit))
```

(`!emits.has(object)` → abstain, same for `indirect`; everything else unchanged. Update the JSDoc: "Validate the GBNF-guaranteed JSON command against the VOCAB and serialize…".)

`useNaturalLanguage.ts` — `generateClause`: `buildGrammar(vocab)` and `parseCommand(raw, vocab)` (the `scene` stays for the prompt hint and the lexicon stage; only these two calls change).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/llm/grammar/buildGrammar.test.ts src/llm/translate.test.ts src/llm/useNaturalLanguage.test.tsx`
Expected: PASS — fix any hook test that asserted scope-constrained grammar/validation (those assertions now move to "prompt contains the hint" in Task 16). `make test`.

- [ ] **Step 5: Commit**

```bash
git add src/llm
git commit -m "feat(nl): full-vocab grammar + vocab-gated validation — scope no longer constrains (F-F/F-Q/F-H root cause)"
```

---

### Task 16: Prompt rewrite — translate-literally + scope-as-hint + per-language few-shots

Spec §7: new instruction set; scope hint never a constraint; 3 few-shot pairs per language (drop-verb, two-object `X avec Y` ordering — UAT F7 — and a pronoun, in every language including English). Raw game output stays excluded (it already is — `b14fea1`; `viewToContext` is untouched).

**Files:**
- Modify: `src/llm/prompt.ts`
- Modify: `src/llm/useNaturalLanguage.ts` (pass language)
- Test: `src/llm/prompt.test.ts`

- [ ] **Step 1: Write the failing tests**

Update `src/llm/prompt.test.ts` (keep `viewToContext` cases untouched). New/changed `buildPrompt` cases:

```ts
describe('buildPrompt (NL v2 §7)', () => {
  const ctx = {
    location: 'West of House',
    recentOutput: '',
    inScope: ['small mailbox'],
    antecedent: 'leaflet',
  }
  it('scope is a hint, never a constraint', () => {
    const sys = buildPrompt('x', ctx, vocab, 'en')[0].content
    expect(sys).toContain('Objects present or carried')
    expect(sys).not.toMatch(/only name these|only these objects/i)
  })
  it('instructs literal translation, no re-planning', () => {
    const sys = buildPrompt('x', ctx, vocab, 'en')[0].content
    expect(sys).toMatch(/Never substitute a different action/i)
    expect(sys).toMatch(/Never infer what the player/i)
  })
  it('includes few-shots in the selected language as chat pairs', () => {
    const msgs = buildPrompt('pose la lampe', ctx, vocab, 'fr')
    const users = msgs.filter(m => m.role === 'user')
    const assistants = msgs.filter(m => m.role === 'assistant')
    expect(assistants.length).toBeGreaterThanOrEqual(2)
    expect(users[users.length - 1].content).toBe('pose la lampe') // player input LAST
    // two-object ordering example present (UAT F7)
    expect(assistants.some(m => m.content.includes('"prep"'))).toBe(true)
  })
  it('few-shot assistant turns are valid single-line JSON commands', () => {
    for (const lang of ['en', 'fr', 'de', 'es'] as const)
      for (const m of buildPrompt('x', ctx, vocab, lang))
        if (m.role === 'assistant') {
          const o = JSON.parse(m.content)
          expect(typeof o.verb).toBe('string')
        }
  })
  it('never includes raw recent game output (b14fea1 stays true)', () => {
    const poisoned = { ...ctx, recentOutput: 'UNIQUE-SENTINEL-XYZ' }
    for (const m of buildPrompt('x', poisoned, vocab, 'en'))
      expect(m.content).not.toContain('UNIQUE-SENTINEL-XYZ')
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/llm/prompt.test.ts` → FAIL.

- [ ] **Step 3: Implement**

In `src/llm/prompt.ts` (keep `viewToContext` and `PROMPT_VERB_CORE` as-is):

```ts
import type { ActiveLanguage } from './types'

// Few-shots per language (spec §7): a drop-verb (the F-M/F-Q inverse-verb
// trap), a two-object "X avec Y" ordering (UAT F7), and a pronoun. Assistant
// turns are EXACTLY the JSON the grammar produces. Nouns use Zork I emit
// forms — for other games they are guidance only; the grammar gates validity.
const FEWSHOTS: Record<ActiveLanguage, ChatMessages> = {
  en: [
    { role: 'user', content: 'put the sword down' },
    { role: 'assistant', content: '{"verb":"drop","object":"sword"}' },
    { role: 'user', content: 'kill the troll with my sword' },
    { role: 'assistant', content: '{"verb":"attack","object":"troll","prep":"with","indirect":"sword"}' },
    // EN pronouns ALWAYS reach the LLM (stage 4 rejects 'it'), so the pronoun
    // few-shot matters most here (spec §7: drop-verb, two-object, pronoun).
    { role: 'user', content: 'take it' },
    { role: 'assistant', content: '{"verb":"take","object":"leaflet"}' },
  ],
  fr: [
    { role: 'user', content: 'pose l’épée' },
    { role: 'assistant', content: '{"verb":"drop","object":"sword"}' },
    { role: 'user', content: 'tue le troll avec l’épée' },
    { role: 'assistant', content: '{"verb":"attack","object":"troll","prep":"with","indirect":"sword"}' },
    { role: 'user', content: 'prends-le' },
    { role: 'assistant', content: '{"verb":"take","object":"leaflet"}' },
  ],
  de: [
    { role: 'user', content: 'lass das Schwert fallen' },
    { role: 'assistant', content: '{"verb":"drop","object":"sword"}' },
    { role: 'user', content: 'töte den Troll mit dem Schwert' },
    { role: 'assistant', content: '{"verb":"attack","object":"troll","prep":"with","indirect":"sword"}' },
    { role: 'user', content: 'nimm ihn' },
    { role: 'assistant', content: '{"verb":"take","object":"leaflet"}' },
  ],
  es: [
    { role: 'user', content: 'suelta la espada' },
    { role: 'assistant', content: '{"verb":"drop","object":"sword"}' },
    { role: 'user', content: 'mata al trol con la espada' },
    { role: 'assistant', content: '{"verb":"attack","object":"troll","prep":"with","indirect":"sword"}' },
    { role: 'user', content: 'tómalo' },
    { role: 'assistant', content: '{"verb":"take","object":"leaflet"}' },
  ],
}
```

`buildPrompt(english, ctx, vocab, language: ActiveLanguage)` — system lines become:

```ts
  const lines = [
    "You translate the player's input into ONE canonical Zork command, as JSON.",
    'Output exactly one single-line JSON object: {"verb":...} with optional "object", "prep", "indirect" — nothing else.',
    "Translate the player's LITERAL imperative. Never substitute a different action. Never infer what the player 'should' do next.",
    'Keep the player’s OWN verb — never swap it for a different action. Only resolve a pronoun ("it"/"them"/"le"/"la"/"ihn"/"lo") to the canonical name of the most-recently-mentioned object, and put that NAME in the object slot (never a literal pronoun).',
    'If you cannot tell which object a pronoun means, if the verb you need is not in the allowed list, or the input is not a game action you can express, output {"verb":"__UNKNOWN__"}.',
  ]
  if (ctx.location) lines.push(`Current location: ${ctx.location}`)
  if (ctx.inScope.length)
    lines.push(`Objects present or carried (a hint — other objects exist too): ${ctx.inScope.join(', ')}`)
  if (ctx.antecedent)
    lines.push(`Most recently mentioned (resolve pronouns to this): ${ctx.antecedent}`)
  // …keep the existing MOVEMENT + allowed-verbs guidance block verbatim…
```

Return value:

```ts
  return [
    { role: 'system', content: lines.join('\n') },
    ...FEWSHOTS[language],
    { role: 'user', content: english },
  ]
```

Keep the `// Raw recent OUTPUT text is deliberately NOT included…` comment (update the review refs to add "NL v2 §7").

`useNaturalLanguage.ts` `generateClause`: `buildPrompt(clause, ctx, vocab, 'en')` for now, with `// TODO(Task 21): active language` (Task 21 threads the picker through).

**FakeLlmEngine note:** `engine.fake.ts` keys completions on the LAST user message — few-shot user turns precede it, so existing hook tests keep working unchanged.

- [ ] **Step 4: Run** — `npx vitest run src/llm/prompt.test.ts src/llm/useNaturalLanguage.test.tsx` → PASS; `make test`.

- [ ] **Step 5: Commit**

```bash
git add src/llm
git commit -m "feat(nl): literal-translation prompt, scope as hint, per-language few-shots"
```

---

### Task 17: Soft no-ops no longer abort compound sequences (F-G)

Spec §10: "It is already open." / "You already have that!" must not stop the run; absence, refusal, abstain, timeout, and interactive prompts still do. The tracker's antecedent gate (`refusalApplies` without the flag) is deliberately unchanged.

**Files:**
- Modify: `src/llm/grammar/patterns.ts` (`SOFT_NOOP_PAT`)
- Modify: `src/llm/translate.ts` (`clauseFailed` skips soft-no-op sentences)
- Test: `src/llm/translate.test.ts`, `src/llm/grammar/patterns.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/llm/grammar/patterns.test.ts`:

```ts
describe('SOFT_NOOP_PAT (NL v2 §10, F-G)', () => {
  it('matches already-state no-ops', () => {
    expect(SOFT_NOOP_PAT.test('It is already open.')).toBe(true)
    expect(SOFT_NOOP_PAT.test('You already have that!')).toBe(true)
  })
  it('does not match hard refusals or absence', () => {
    expect(SOFT_NOOP_PAT.test('The door cannot be opened.')).toBe(false)
    expect(SOFT_NOOP_PAT.test("You can't see any mailbox here!")).toBe(false)
  })
})
```

`src/llm/translate.test.ts` (the suite's existing fixture vocab):

```ts
describe('clauseFailed — soft no-ops (F-G)', () => {
  it('a soft no-op about the acted object does NOT fail the clause', () => {
    expect(clauseFailed('It is already open.', vocab, 'open mailbox')).toBe(false)
  })
  it('a hard refusal still fails the clause', () => {
    expect(clauseFailed('The mailbox cannot be opened.', vocab, 'open mailbox')).toBe(true)
  })
  it('absence still fails the clause', () => {
    expect(clauseFailed('There is no mailbox here.', vocab, 'open mailbox')).toBe(true)
  })
  it("the tracker's antecedent gate is unaffected (refusalApplies still true)", () => {
    expect(refusalApplies('It is already open.', vocab, 'open mailbox')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/llm/translate.test.ts src/llm/grammar/patterns.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`patterns.ts`:

```ts
// A SOFT no-op: the action was already satisfied ("It is already open.",
// "You already have that!"). Distinct from FAILURE_PAT's hard refusals: a
// soft no-op must NOT abort a compound sequence (NL v2 §10, UAT F-G) — the
// player's plan is still on track — but it still gates the antecedent
// (tracker uses FAILURE_PAT unfiltered).
export const SOFT_NOOP_PAT = /\bis already\b|\byou already have\b/i
```

`translate.ts` — in `clauseFailed`, replace the `refusalApplies(…)` call with a sentence-level scan that skips soft no-ops:

```ts
import { SOFT_NOOP_PAT } from './grammar/patterns'

export function clauseFailed(
  recentOutput: string,
  vocab: Vocab,
  command?: string,
): boolean {
  // Hard refusals only: a sentence matching SOFT_NOOP_PAT is "already done",
  // which must not stop a compound run (§10/F-G). Filter per SENTENCE so a
  // real refusal elsewhere in the same output still registers.
  const hardOnly = recentOutput
    .split(/[.!?\n]+/)
    .filter(s => !SOFT_NOOP_PAT.test(s))
    .join('. ')
  if (refusalApplies(hardOnly, vocab, command)) return true
  // …existing absence scan, unchanged, still over the FULL recentOutput…
}
```

- [ ] **Step 4: Run** — both files PASS; `make test` (one existing compound test asserts the old stop-on-no-op behavior — invert it and cite F-G).

- [ ] **Step 5: Commit**

```bash
git add src/llm
git commit -m "fix(nl): soft no-ops no longer abort compound sequences (F-G)"
```

---

### Task 18: Scene tracker — pin the §8 contract (inventory in scope, eviction)

No behavior change expected — the tracker already keeps carried items across rooms and evicts non-carried on room change. This task PINS that against F-AA/F-T with regression tests; if a test fails, that's a real bug to fix in `reduceScene` (use `superpowers:systematic-debugging`).

**Files:**
- Test: `src/llm/scene/tracker.test.ts`

- [ ] **Step 1: Write the tests** (reuse the suite's fixture vocab; add `emit` fields if Task 2's sweep missed it):

```ts
describe('NL v2 §8 — scope demoted, tracker contract pinned (F-AA/F-T)', () => {
  it('carried items survive a room change (inventory is in scope)', () => {
    const t = new TextSceneTracker(vocab)
    t.observe({ location: 'Kitchen', outputText: 'There is a sack here.', lastCommand: null })
    t.observe({ location: 'Kitchen', outputText: 'Taken.', lastCommand: 'take sack' })
    t.observe({ location: 'Attic', outputText: 'You are in the attic.', lastCommand: 'up' })
    expect(t.scene().inScope.map(o => o.canonical)).toContain('sack')
  })
  it('non-carried items are evicted on room change (F-AA stale window)', () => {
    const t = new TextSceneTracker(vocab)
    t.observe({ location: 'Kitchen', outputText: 'There is a sack here.', lastCommand: null })
    t.observe({ location: 'Attic', outputText: 'You are in the attic.', lastCommand: 'up' })
    expect(t.scene().inScope.map(o => o.canonical)).not.toContain('sack')
  })
  it('a dropped item is evicted at the NEXT room change, not carried along', () => {
    const t = new TextSceneTracker(vocab)
    t.observe({ location: 'Kitchen', outputText: 'Taken.', lastCommand: 'take sack' })
    t.observe({ location: 'Kitchen', outputText: 'Dropped.', lastCommand: 'drop sack' })
    t.observe({ location: 'Attic', outputText: 'You are in the attic.', lastCommand: 'up' })
    expect(t.scene().inScope.map(o => o.canonical)).not.toContain('sack')
  })
  it('reducer stays idempotent on duplicate observes (v1 invariant)', () => {
    const t = new TextSceneTracker(vocab)
    const e = { location: 'Kitchen', outputText: 'There is a sack here.', lastCommand: null }
    t.observe(e)
    const once = t.scene()
    t.observe(e)
    expect(t.scene()).toEqual(once)
  })
})
```

- [ ] **Step 2: Run** — `npx vitest run src/llm/scene/tracker.test.ts`. Expected: PASS (pin) or a genuine red (fix in `reduceScene`, smallest change that greens it).

- [ ] **Step 3: Commit**

```bash
git add src/llm/scene
git commit -m "test(scene): pin v2 contract — inventory persists, room change evicts (F-AA)"
```

---

### Task 19: Deterministic stage helpers — `unquote`, `isVocabPassthrough`

(`vocabWordSet` landed in Task 9.) The quoted-string escape (locked decision 8) and the stage-4 all-words-in-vocab passthrough with the collision guard.

**Files:**
- Modify: `src/llm/translate.ts`
- Test: `src/llm/translate.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
describe('unquote (stage 2 — quoted escape hatch)', () => {
  it.each([
    ['"open mailbox"', 'open mailbox'],
    ['« ouvre la boîte »', 'ouvre la boîte'],
    ['„öffne die Tür“', 'öffne die Tür'],
    ['“open mailbox”', 'open mailbox'],
  ])('%s → %s', (line, want) => {
    expect(unquote(line)).toBe(want)
  })
  it('returns null unless the ENTIRE line is one quoted string', () => {
    expect(unquote('say "hello"')).toBeNull()
    expect(unquote('open mailbox')).toBeNull()
    expect(unquote('""')).toBeNull()
  })
})

describe('isVocabPassthrough (stage 4 + collision guard)', () => {
  // suite fixture vocab; verbSynonyms: ['ulysses'] added for this block
  it('passes a line whose every word the parser knows (magic words, literal English)', () => {
    expect(isVocabPassthrough('open the small mailbox', vocab, null)).toBe(true)
    expect(isVocabPassthrough('ulysses', vocab, null)).toBe(true)
  })
  it('rejects a line with any unknown word', () => {
    expect(isVocabPassthrough('open the zeppelin', vocab, null)).toBe(false)
    expect(isVocabPassthrough('take it', vocab, null)).toBe(false) // pronouns go to the LLM
  })
  it('collision guard: an active-language lexicon word never passes through', () => {
    const lexWords = new Set(['sale']) // imagine fr word colliding with a vocab word
    expect(isVocabPassthrough('sale', { ...vocab, verbsOnly: [...vocab.verbsOnly, 'sale'] }, lexWords)).toBe(false)
    expect(isVocabPassthrough('sale', { ...vocab, verbsOnly: [...vocab.verbsOnly, 'sale'] }, null)).toBe(true)
  })
  it('tolerates terminal punctuation and case', () => {
    expect(isVocabPassthrough('Open the small mailbox!', vocab, null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/llm/translate.test.ts` → FAIL.

- [ ] **Step 3: Implement** (in `translate.ts`):

```ts
/**
 * Stage 2 (locked decision 8): if the ENTIRE line is one quoted string —
 * "…", «…», „…“, or “…” — return the unquoted text to send verbatim. Quote
 * style varies by keyboard/autocorrect across FR/DE/ES (pushback minor note).
 */
export function unquote(line: string): string | null {
  const m = line
    .trim()
    .match(/^(?:"([^"]+)"|«([^»]+)»|„([^“”]+)[“”]|“([^”]+)”)$/)
  if (!m) return null
  const inner = (m[1] ?? m[2] ?? m[3] ?? m[4]).trim()
  return inner.length > 0 ? inner : null
}

/**
 * Stage 4 (spec §4): every token is a word the game's parser already knows
 * (vocabWordSet: verbs, synonyms, noun dictionary words, preps, movement,
 * meta, the/a/an) → send verbatim. COLLISION GUARD: when the picker is not
 * English, a token in the active language's lexicon does NOT count — the
 * line falls through to the lexicon parse instead (pushback issue 2).
 */
export function isVocabPassthrough(
  line: string,
  vocab: Vocab,
  activeLexiconWords: Set<string> | null,
): boolean {
  const words = vocabWordSet(vocab)
  const tokens = line
    .toLowerCase()
    .replace(/[!.?,;:]+$/, '')
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return false
  return tokens.every(
    t => words.has(t) && !(activeLexiconWords?.has(t) ?? false),
  )
}
```

- [ ] **Step 4: Run** — `npx vitest run src/llm/translate.test.ts` → PASS; `make test`.

- [ ] **Step 5: Commit**

```bash
git add src/llm
git commit -m "feat(nl): quoted-string escape + vocab passthrough with lexicon collision guard"
```

---

### Task 20: Language state in the hook + the language picker UI

`toggle()` → `setLanguage(lang)`; `NlState` 'on' carries the language; `NlToggle` becomes `NlLanguagePicker`. Download flow: picking a language with no cached model opens the modal; accepting downloads then activates THAT language.

**Files:**
- Modify: `src/llm/types.ts` (`NlState`)
- Modify: `src/llm/useNaturalLanguage.ts`
- Modify: `src/ui/Terminal.tsx`
- Create: `src/ui/NlLanguagePicker.tsx` (delete `src/ui/NlToggle.tsx`)
- Test: `src/ui/NlLanguagePicker.test.tsx` (replaces `NlToggle.test.tsx`), `src/llm/useNaturalLanguage.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/ui/NlLanguagePicker.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { NlLanguagePicker } from './NlLanguagePicker'

describe('NlLanguagePicker', () => {
  it('renders Off · English · Français · Deutsch · Español', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: true }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    const select = screen.getByRole('combobox')
    const labels = [...select.querySelectorAll('option')].map(o => o.textContent)
    expect(labels).toEqual(['Off', 'English', 'Français', 'Deutsch', 'Español'])
  })
  it('reflects the active language and emits a change', () => {
    const onSelect = vi.fn()
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr' }}
        onSelect={onSelect}
        onOverride={() => {}}
      />,
    )
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('fr')
    fireEvent.change(select, { target: { value: 'de' } })
    expect(onSelect).toHaveBeenCalledWith('de')
  })
  it('keeps the unavailable + downloading branches', () => {
    const { rerender } = render(
      <NlLanguagePicker
        state={{ phase: 'unavailable', reasons: ['no webgpu'] }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    expect(screen.getByText(/force-enable/)).toBeInTheDocument()
    rerender(
      <NlLanguagePicker
        state={{ phase: 'downloading', loaded: 1, total: 2, etaSeconds: null }}
        onSelect={() => {}}
        onOverride={() => {}}
      />,
    )
    expect(screen.getByText(/downloading/)).toBeInTheDocument()
  })
  it('renders nothing when disabled (no vocab)', () => {
    const { container } = render(
      <NlLanguagePicker state={{ phase: 'disabled' }} onSelect={() => {}} onOverride={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

Hook tests (`useNaturalLanguage.test.tsx`) — add to the existing harness:

```tsx
it('setLanguage on an installed model activates that language and persists it', async () => {
  // engine with cached:true; render hook; act(() => result.current.setLanguage('fr'))
  // expect state {phase:'on', language:'fr'}; expect readNlPref().language === 'fr'
})
it('setLanguage with no cached model opens the modal; accepting downloads THEN activates the picked language', async () => {
  // setLanguage('de') → modalOpen true, phase still off
  // act(requestDownload) → after load resolves: {phase:'on', language:'de'}, pref 'de'
})
it('restores the persisted language on boot when the model is cached', async () => {
  // seed localStorage loquor.nl = {language:'es', declined:false}; cached engine
  // → state becomes {phase:'on', language:'es'}
})
it("setLanguage('off') turns the layer off and persists 'off'", async () => {})
```

(Write them concretely against the file's existing render/act helpers — copy the style of the current toggle tests they replace.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/ui/NlLanguagePicker.test.tsx src/llm/useNaturalLanguage.test.tsx` → FAIL.

- [ ] **Step 3: Implement**

`src/llm/types.ts` — `NlState`'s on-phase becomes:

```ts
  | { phase: 'on'; language: ActiveLanguage }
```

`src/llm/useNaturalLanguage.ts`:

- `Internal` on-phase: `{ phase: 'on'; language: ActiveLanguage }`.
- Hook return type: replace `toggle: () => void` with `setLanguage: (lang: NlLanguage) => void`.
- Pending pick for the download flow: `const pendingLangRef = useRef<ActiveLanguage>('en')`.
- `setLanguage`:

```ts
  const setLanguage = useCallback(
    (lang: NlLanguage) => {
      if (!available || !hasVocab) return
      if (lang === 'off') {
        setInternal({ phase: 'off' })
        writeNlPref({ language: 'off' })
        return
      }
      if (installed || engine.isLoaded()) {
        setInternal({ phase: 'on', language: lang })
        writeNlPref({ language: lang })
      } else {
        pendingLangRef.current = lang
        setModalOpen(true)
      }
    },
    [available, hasVocab, installed, engine],
  )
```

- `requestDownload`'s `.then`: `setInternal({ phase: 'on', language: pendingLangRef.current }); writeNlPref({ language: pendingLangRef.current })`.
- The `isCached` effect: `const pref = readNlPref(); if (cached && pref.language !== 'off') setInternal(prev => prev.phase === 'off' ? { phase: 'on', language: pref.language as ActiveLanguage } : prev)`.
- `state` memo: `if (internal.phase === 'on') return { phase: 'on', language: internal.language }`.
- `declineDownload`: `writeNlPref({ declined: true, language: 'off' })`.

`src/ui/NlLanguagePicker.tsx`:

```tsx
import type { NlState, NlLanguage } from '../llm/types'
import { pct as toPct } from '../llm/progress'

const OPTIONS: { value: NlLanguage; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
]

export function NlLanguagePicker({
  state,
  onSelect,
  onOverride,
}: {
  state: NlState
  onSelect: (lang: NlLanguage) => void
  onOverride: () => void
}) {
  if (state.phase === 'disabled') return null
  if (state.phase === 'unavailable') {
    return (
      <span className="nl-toggle" title={`unavailable: ${state.reasons.join(', ')}`}>
        Language: unavailable{' '}
        <button className="sw" type="button" onClick={onOverride}>
          force-enable
        </button>
      </span>
    )
  }
  if (state.phase === 'downloading') {
    const pct = toPct(state.loaded, state.total)
    return <span className="nl-toggle">downloading… {pct}%</span>
  }
  const value: NlLanguage = state.phase === 'on' ? state.language : 'off'
  const chip =
    state.phase === 'off'
      ? state.installed
        ? ' · installed'
        : ' · not installed'
      : ''
  return (
    <label className="nl-toggle">
      Language:{' '}
      <select
        className="sw"
        value={value}
        onChange={e => onSelect(e.target.value as NlLanguage)}
      >
        {OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {chip}
    </label>
  )
}
```

Delete `src/ui/NlToggle.tsx` and `src/ui/NlToggle.test.tsx`. `src/ui/Terminal.tsx`: import + render `NlLanguagePicker` with `onSelect={nl.setLanguage}` (the `nlToggle` StatusBar slot keeps its name — purely internal). Also pass `signature` into the hook now (`signature,` in the `useNaturalLanguage({ … })` args; add `signature: string` to `UseNaturalLanguageArgs` — used by Task 21).

- [ ] **Step 4: Run** — picker + hook + `src/ui/Terminal.test.tsx` (update its toggle queries) → PASS; `make test`.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(nl): sticky language picker replaces the on/off toggle"
```

---

### Task 21: Pipeline rework — stage order, lexicon stage, abstain policy

The heart of §4. Per LINE: (1) interactive-prompt passthrough, (2) quoted escape. Then `splitClauses`; per CLAUSE: (3) meta/alias, (4) vocab passthrough w/ guard, (5) direction, (6) lexicon parse, (7) LLM, (8) abstain policy (EN raw / non-EN styled notice, no turn).

**Files:**
- Modify: `src/llm/useNaturalLanguage.ts`
- Test: `src/llm/useNaturalLanguage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to the hook suite (using its existing fake-engine harness; `vocab` fixture needs the Task 13-style nouns with emits and `verbSynonyms`):

```tsx
describe('NL v2 pipeline stages', () => {
  it('stage 2: a fully-quoted line is unquoted and sent verbatim — no LLM call', async () => {
    // translate('"frotz the gnusto"') → sendLine('frotz the gnusto'); engine.generate never called
  })
  it('stage 4: literal English that is all vocab words passes through untouched (F-H killer)', async () => {
    // translate('open trap door') with language 'en' → sendLine('open trap door'); no LLM
  })
  it('stage 4 collision guard: a lexicon word does not pass through in fr', async () => {
    // language 'fr': a token in lexiconWordSet(fr, sig) that is also vocab → goes to lexicon stage
  })
  it('stage 6: a French clause resolves deterministically — no LLM call', async () => {
    // language 'fr', translate('ouvre la trappe') → echoLocal('ouvre la trappe'), sendLine('open trapdoor'); no generate
  })
  it('stage 7: an unresolvable clause falls through to the LLM', async () => {
    // completions: {'frobnicate la trappe': '{"verb":"open","object":"trapdoor"}'}
  })
  it('stage 8: non-English abstain shows the notice and sends NOTHING (F-R)', async () => {
    // language 'fr', default abstain → sendLine NOT called, notice matches /couldn.t translate/i
  })
  it('stage 8: English abstain keeps raw passthrough', async () => {
    // language 'en', abstain → sendLine(original)
  })
  it('per-clause independence: compound French runs each clause through the pipeline', async () => {
    // 'prends la lampe et ouvre la trappe' → sendLine('take light'), then sendLine('open trapdoor'); zero LLM calls
  })
})
```

(Write each concretely with the suite's `renderNl`/`act` helpers — these are descriptions of the assertions, the harness calls are boilerplate already present in the file.)

- [ ] **Step 2: Run to verify failure** — FAIL.

- [ ] **Step 3: Implement**

In `useNaturalLanguage.ts`:

a. New imports: `unquote`, `isVocabPassthrough`, `vocabWordSet` from `./translate`; `coreLexicon`, `nounLexicon`, `lexiconWordSet` from `./lexicon/index`; `parseLexicon` from `./lexicon/parse`; types `LexLang`, `ActiveLanguage`.

b. Active-lexicon memo (after the `state` memo):

```ts
  const language: NlLanguage =
    internal.phase === 'on' ? internal.language : 'off'
  const lex = useMemo(() => {
    if (language !== 'fr' && language !== 'de' && language !== 'es') return null
    const lang = language as LexLang
    return {
      core: coreLexicon(lang),
      nouns: nounLexicon(lang, signature),
      words: lexiconWordSet(lang, signature),
    }
  }, [language, signature])
```

c. `generateClause` becomes `runClause` — the per-clause pipeline (stages 3–7). It returns `{ result, raw, stage }` where `stage` is `'meta' | 'alias' | 'vocab' | 'direction' | 'lexicon' | 'llm'`:

```ts
      const runClause = async (
        clause: string,
        scene: Scene,
      ): Promise<{ result: TranslateResult; raw: string; stage: string }> => {
        // 3. meta / localized alias → raw (existing contract, per clause)
        if (isMetaCommand(clause))
          return { result: { kind: 'command', text: clause }, raw: '(meta)', stage: 'meta' }
        const alias = metaAlias(clause, lex?.core ?? null)
        if (alias)
          return { result: { kind: 'command', text: alias }, raw: '(alias)', stage: 'alias' }
        // 4. all words already game vocab → verbatim (magic words, literal EN;
        //    collision guard keeps active-lexicon words out — spec §4)
        if (isVocabPassthrough(clause, vocab, lex?.words ?? null))
          return { result: { kind: 'command', text: clause.trim() }, raw: '(vocab)', stage: 'vocab' }
        // 5. direction fast-path (existing)
        const dir = parseDirection(clause, vocab.movement)
        if (dir)
          return { result: { kind: 'command', text: dir }, raw: `{"verb":"${dir}"}`, stage: 'direction' }
        // 6. deterministic lexicon parse — never guesses; miss falls through
        if (lex?.nouns) {
          const r = parseLexicon(clause, lex.core, lex.nouns, vocab, scene)
          if (r.kind === 'command')
            return { result: r, raw: '(lexicon)', stage: 'lexicon' }
        }
        // 7. LLM fallback: full-vocab grammar, literal-translation prompt
        const base = getContext()
        const ctx: PromptContext = {
          ...base,
          inScope: scene.inScope.map(o => o.canonical),
          antecedent: scene.antecedent,
        }
        const activeLang = (language === 'off' ? 'en' : language) as ActiveLanguage
        const raw = await generateRaw(
          buildPrompt(clause, ctx, vocab, activeLang),
          buildGrammar(vocab),
        )
        return { result: parseCommand(raw, vocab), raw, stage: 'llm' }
      }
```

d. Line-level stages, replacing today's pre-`translatingRef` checks — order changes to spec §4 (prompt-active FIRST, then quoted, then the rest is per-clause):

```ts
      // 1. The game is asking (confirmation/disambiguation): the reply answers
      //    the interpreter, never the translator.
      const recentOutput = getContext().recentOutput
      if (isConfirmationPrompt(recentOutput) || isDisambiguationPrompt(recentOutput)) {
        lastCommandRef.current = null
        sendLine(english)
        return
      }
      // 2. Quoted escape hatch: »send exactly this« (locked decision 8).
      const quoted = unquote(english)
      if (quoted) {
        lastCommandRef.current = null
        sendLine(quoted)
        return
      }
```

(The old top-level `isMetaCommand`/`metaAlias` early-returns are DELETED — meta now routes per clause inside `runClause`, which the compound path already did.)

e. Unified clause loop: the single-command path and compound path merge — `clauses.length === 1` is just `total === 1`. Differences preserved: no `Ran N of M` notice for a single clause; `echoLocal(english)` fires once before the FIRST clause that came from a *translated* stage (`direction`/`lexicon`/`llm`) — passthrough stages (`meta`/`alias`/`vocab`) keep today's no-echo behavior; `awaitTurn` runs between clauses only when `total > 1` (existing `raceTurn` machinery unchanged).

f. Stage 8 — abstain policy (replaces both abstain branches):

```ts
        if (done === 0) {
          lastCommandRef.current = null
          if (language === 'en') {
            sendLine(english) // EN abstain: the Z-parser's own error is useful
          } else {
            // Non-EN abstain: raw French/German/Spanish reaching the Z-parser
            // is gibberish (F-R) — styled notice, no VM send, no turn burned.
            setNotice(
              'Couldn’t translate — try simpler wording, or quote a command: "open mailbox"',
            )
          }
        } else if (done < total) {
          setNotice(`Ran ${done} of ${total} actions.`)
        }
```

g. Keep: `nlDebug` logging (add `stage` to the logged object), `MAX_CLAUSES`, watchdog/`raceTurn`, `clauseFailed` stop, observe-during-sequence, the error catch (timeout/failure notices + raw send).

h. **Dependency arrays:** `translate`'s `useCallback` deps gain `language` and `lex` (and `lex` itself is a `useMemo` on `[language, signature]`). Missing these is the classic stale-closure bug here — the pipeline silently keeps translating in the previous language.

- [ ] **Step 4: Run** — `npx vitest run src/llm/useNaturalLanguage.test.tsx` → PASS. Several existing tests change meaning (top-level meta echo, abstain raw-send for 'fr'): update them to the new contract, citing the spec section in a comment. `make test`.

- [ ] **Step 5: Commit**

```bash
git add src/llm
git commit -m "feat(nl): deterministic-first per-clause pipeline with EN/non-EN abstain policy"
```

---

### Task 22: Input queue (F-A)

Lines typed mid-translation queue (FIFO, cap 4, overflow drops the NEWEST with a notice), render dimmed with a `queued` chip, drain one at a time through the full pipeline, and flush (with a notice) when the game raises an interactive prompt. An abstain notice does NOT flush. The input field stays enabled while NL is on.

**Files:**
- Modify: `src/llm/useNaturalLanguage.ts`
- Modify: `src/ui/Terminal.tsx`
- Modify: `src/ui/components.css`
- Test: `src/llm/useNaturalLanguage.test.tsx`, `src/ui/Terminal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Hook suite:

```tsx
describe('input queue (NL v2 §11, F-A)', () => {
  it('a line typed mid-translation queues and runs after, in FIFO order', async () => {
    // slow generate (generateDelayMs); translate('ouvre la trappe') then translate('descends') immediately
    // → both sendLine calls happen, in order; queued reflected in result.current.queued meanwhile
  })
  it('cap 4: the 5th queued line is dropped with a visible notice', async () => {
    // 1 in flight + queue 4 more + 1 overflow → notice /queue full/i, queued.length === 4
  })
  it('flushes the queue with a notice when the game raises a confirmation prompt', async () => {
    // first line's turn output contains '(Y is affirmative)' via the view fixture
    // → remaining queued lines cleared, notice /queue cleared/i, none sent
  })
  it('an abstain notice does not flush the queue (pushback minor note)', async () => {
    // line1 abstains (fr → notice), line2 queued → line2 still runs
  })
})
```

`src/ui/Terminal.test.tsx`: a render-level test that queued lines appear with the `queued` chip (`getByText('queued')`) while pending.

- [ ] **Step 2: Run to verify failure** — FAIL (`queued` not exposed).

- [ ] **Step 3: Implement**

Hook:

```ts
  const QUEUE_CAP = 4
  const queueRef = useRef<string[]>([])
  const [queued, setQueued] = useState<string[]>([])
  const syncQueue = () => setQueued([...queueRef.current])
```

`translate` re-entry branch (replaces the silent drop):

```ts
      if (translatingRef.current) {
        // F-A: queue instead of dropping. Cap 4; overflow drops the NEWEST
        // with a visible notice (spec §11).
        if (queueRef.current.length >= QUEUE_CAP) {
          setNotice(`Queue full — dropped: "${english}"`)
          return
        }
        queueRef.current.push(english)
        syncQueue()
        return
      }
```

Extract the line-level pipeline (Task 21's stages 1–8 body) into `runLine(line: string, fromQueue: boolean): Promise<'ok' | 'flush'>` inside the callback. Two `fromQueue` differences: (a) stage 1 — a queued line must NOT be treated as the answer to a prompt the player hadn't seen when they typed it: `if (interactive prompt) return fromQueue ? 'flush' : (sendLine raw, 'ok')`; (b) the compound loop's `interactive-prompt` stop reason returns `'flush'` too. Drive the drain in `translate`:

```ts
      translatingRef.current = true
      setPending(true)
      setNotice(null)
      try {
        let line: string | undefined = english
        let fromQueue = false
        while (line !== undefined) {
          const outcome = await runLine(line, fromQueue)
          if (outcome === 'flush' && queueRef.current.length > 0) {
            queueRef.current = []
            syncQueue()
            setNotice('Queue cleared — the game needs an answer first.')
            break
          }
          line = queueRef.current.shift()
          fromQueue = true
          syncQueue()
        }
      } finally {
        translatingRef.current = false
        setPending(false)
        inSequenceRef.current = false
      }
```

Expose `queued` in the hook's return (add `queued: string[]` to the `UseNaturalLanguage` interface).

`Terminal.tsx` — render queued lines and stop disabling the input while NL is on:

```tsx
        {nl.queued.map((q, i) => (
          <p key={`q-${i}`} className="nl-source">
            <span className="you">you</span> {q}
            <span className="chip">queued</span>
          </p>
        ))}
        {nl.pending && <p className="nl-thinking">…thinking</p>}
        …
        <CommandInput
          …
          disabled={nl.pending && nl.state.phase !== 'on'}
          …
        />
```

`components.css` (after `.nl-source`):

```css
/* Worded 'you' label for the player's pre-translation line (NL v2 §12). */
.you {
  display: inline-block;
  min-width: 2.4em;
  margin-right: 6px;
  font-size: 0.78em;
  letter-spacing: 0.08em;
  font-style: normal;
  color: var(--text-dim);
}
/* 'queued' chip on lines waiting for the translator (NL v2 §11). */
.chip {
  margin-left: 8px;
  padding: 1px 6px;
  border: 1px solid var(--text-dim);
  border-radius: 8px;
  font-size: 0.72em;
  color: var(--text-dim);
}
```

- [ ] **Step 4: Run** — hook + Terminal suites PASS; `make test`.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(nl): FIFO input queue with cap, prompt flush, and queued chips (F-A)"
```

---

### Task 23: Transcript prefixes — `you` label, `>` for real commands, `›` removed

Spec §12 approved mock:

```
you   ouvre la boîte aux lettres
> open small mailbox
```

**Files:**
- Modify: `src/ui/Scrollback.tsx`
- Test: `src/ui/Scrollback.test.tsx`

- [ ] **Step 1: Write the failing tests**

Update `src/ui/Scrollback.test.tsx`:

```tsx
it('nl-source lines carry a worded you label, no > and no ›', () => {
  render(
    <Scrollback
      lines={[{ id: 1, kind: 'nl-source', text: 'ouvre la boîte' }]}
    />,
  )
  expect(screen.getByText('you')).toBeInTheDocument()
  const p = screen.getByText('ouvre la boîte', { exact: false }).closest('p')!
  expect(p.textContent).not.toContain('>')
  expect(p.textContent).not.toContain('›')
})
it('input (real command) lines keep the > prefix; › is gone everywhere', () => {
  render(
    <Scrollback lines={[{ id: 1, kind: 'input', text: 'open mailbox' }]} />,
  )
  const p = screen.getByText('open mailbox', { exact: false }).closest('p')!
  expect(p.textContent).toContain('>')
  expect(p.textContent).not.toContain('›')
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/ui/Scrollback.test.tsx` → FAIL (prefixes currently reversed: `›` on input, `>` on nl-source).

- [ ] **Step 3: Implement** — in `Scrollback.tsx`, swap the two branches' prefixes:

```tsx
          {l.kind === 'input' ? (
            <>
              <span className="car">&gt;</span> {l.text}
            </>
          ) : l.kind === 'nl-source' ? (
            <>
              <span className="you">you</span> {l.text}
            </>
          ) : (
            l.text
          )}
```

(The `›` U+203A glyph now appears nowhere; `.you` CSS landed in Task 22. CommandInput already uses `>`.)

- [ ] **Step 4: Run** — `npx vitest run src/ui/Scrollback.test.tsx src/ui/Terminal.test.tsx` → PASS; `make test`.

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat(ui): worded you label for NL source lines; > reserved for real commands"
```

---

### Task 24: UAT regression suite + stage-order tests

Every UAT-1/UAT-2 failure encoded as a pipeline-level test asserting **the stage that now handles it** (spec §14) — most must never reach the LLM — plus explicit stage-precedence tests.

**Files:**
- Create: `src/llm/pipeline.uat.test.tsx`

- [ ] **Step 1: Build the harness + encode the findings**

**Before writing any `expectSent` value that contains a noun: read the regenerated vocab's `emit` fields** (`grep -A1 'brass lantern' src/llm/grammar/zork1.vocab.ts`) — emit forms are computed data (`light` vs `brass lamp` depends on real ZIL synonym sharing); guessing them makes the suite assert fiction.

Harness (reuse the hook test file's fake-engine + renderHook scaffolding — extract shared helpers into `src/llm/testHarness.tsx` if the hook suite agrees to import from it; otherwise duplicate):

```tsx
const LAMP_SEED = {
  location: 'Living Room',
  outputText: 'There is a brass lantern here.',
  lastCommand: null,
}

async function renderPipeline(c: UatCase) {
  const engine = new FakeLlmEngine({ completions: c.completions, cached: true })
  const sent: string[] = []
  const view = { current: emptyView }
  const { result } = renderHook(() =>
    useNaturalLanguage({
      engine,
      capability: { tier: 'full', reasons: [] },
      vocab: ZORK1_VOCAB,
      signature: ZORK1_SIG,
      getContext: () => viewToContext(view.current),
      echoLocal: () => {},
      sendLine: t => sent.push(t),
      awaitTurn: () => Promise.resolve({ view: view.current, reason: 'line' as const }),
      watchdogMs: 1000,
    }),
  )
  await act(async () => result.current.setLanguage(c.language))
  return { nl: result.current, engine, sent, view }
}

/** Synthetic turn-boundary ViewState so seeds flow through the real observe(). */
function viewFor(s: { location: string; outputText: string }): ViewState {
  return {
    status: { location: s.location, right: '' },
    lines: [
      { id: 1, kind: 'input', text: '>look' },
      { id: 2, kind: 'output', text: s.outputText },
    ],
    inputRequest: 'line',
    ended: false,
    nextId: 3,
  }
}
```

(Seed rows can only inject *mentions* — `observe` derives `lastCommand` from the hook's internal latch, so carried-state seeding goes through a real `translate` of a take command instead.)

Structure:

```tsx
// src/llm/pipeline.uat.test.tsx
// Every UAT-1/UAT-2 finding, pinned to the v2 pipeline stage that fixes it.
// Read notes/uat-1.md and notes/uat-2.md for each finding's original transcript.
interface UatCase {
  finding: string // 'F-Q', 'F5', …
  language: NlLanguage
  input: string
  /** Scene seeding (observe calls) before the input, when the finding needs it. */
  seed?: { location: string; outputText: string; lastCommand: string | null }[]
  /** What must reach the VM (sendLine arg), or null for notice-only. */
  expectSent: string | null
  /** May the LLM be consulted? false = deterministic stages must catch it. */
  llmAllowed: boolean
  /** Scripted completion when llmAllowed (keyed by the clause text). */
  completions?: Record<string, string>
}

const CASES: UatCase[] = [
  // — wrong-object snap class: now full-vocab grammar OR lexicon —
  { finding: 'F-F', language: 'fr', input: 'ouvre la trappe', expectSent: 'open trapdoor', llmAllowed: false },
  { finding: 'F-Q', language: 'fr', input: 'lache le cercueil', expectSent: 'drop coffin', llmAllowed: false },
  // — re-planning over literal intent: stage-4 passthrough kills it —
  { finding: 'F-H', language: 'en', input: 'open trap door', expectSent: 'open trap door', llmAllowed: false },
  // — foreign-leak on abstain → notice, nothing sent —
  { finding: 'F-R', language: 'fr', input: 'gonfle le radeau magique en plastique', expectSent: null, llmAllowed: true },
  // — magic words: stage-4 bare-vocab passthrough —
  { finding: 'F-BB', language: 'fr', input: 'ulysses', expectSent: 'ulysses', llmAllowed: false },
  { finding: 'F-DD', language: 'fr', input: 'echo', expectSent: 'echo', llmAllowed: false },
  // — localized meta —
  { finding: 'F5', language: 'fr', input: 'inventaire', expectSent: 'inventory', llmAllowed: false },
  { finding: 'F-U', language: 'fr', input: 'diagnostic', expectSent: 'diagnose', llmAllowed: false },
  // — verb mis-maps: now lexicon data —
  { finding: 'F-M', language: 'fr', input: 'pose la lampe', expectSent: 'drop light', llmAllowed: false, seed: [LAMP_SEED] },
  { finding: 'F-N', language: 'fr', input: 'agite la lampe', expectSent: 'wave light', llmAllowed: false, seed: [LAMP_SEED] },
  { finding: 'F-X', language: 'fr', input: 'sonne la cloche', expectSent: 'ring bell', llmAllowed: false },
  // …continue: EVERY remaining finding F1–F10, R1–R4, F-A–F-DD gets a row or a
  // dedicated test (queue F-A, compound F-G/F-D, prefixes are UI suites — for
  // those, add a row whose comment names the suite that covers it instead).
]
```

Work through `notes/uat-1.md` and `notes/uat-2.md` top to bottom; every finding ID must appear in this file — as a `CASES` row, a dedicated `it()`, or a `// covered-by:` comment pointing at the suite that owns it (F-A → queue tests, F-G → Task 17, prefix report → Scrollback tests, R1–R4 → vocab-invariants). The runner:

```tsx
describe.each(CASES)('UAT $finding', c => {
  it(`${c.input} → ${c.expectSent ?? '(notice, nothing sent)'}`, async () => {
    const { nl, engine, sent } = await renderPipeline(c)
    for (const s of c.seed ?? []) act(() => nl.observe(viewFor(s)))
    await act(() => nl.translate(c.input))
    if (c.expectSent === null) expect(sent).toEqual([])
    else expect(sent.at(-1)).toBe(c.expectSent)
    if (!c.llmAllowed) expect(engine.generateCalls).toBe(0)
  })
})
```

(`generateCalls`: add a public counter to `FakeLlmEngine.generate` — one line.)

Stage-order tests in the same file (spec §14):

```tsx
describe('stage precedence', () => {
  it('quoted beats meta: "save" in quotes is sent as the word save, via unquote', …)
  it('meta beats vocab passthrough: bare "save" routes raw as meta', …)
  it('vocab passthrough beats direction: "north" is also fine either way — assert "go north" picks direction over LLM', …)
  it('lexicon beats LLM: a parseable French clause never calls generate', …)
  it('interactive prompt beats everything: mid-prompt input goes raw even if quoted', …)
})
```

- [ ] **Step 2: Run** — `npx vitest run src/llm/pipeline.uat.test.tsx`. Every red row is either a data gap (fix the lexicon entry), a pipeline bug (fix with a unit test first), or a wrong expectation (re-read the UAT note). Iterate to green.

- [ ] **Step 3: Full gate** — `make all` (lint + format + typecheck + test) → clean.

- [ ] **Step 4: Commit**

```bash
git add src/llm
git commit -m "test(nl): UAT regression suite — every finding pinned to its v2 stage"
```

---

### Task 25: Wrap-up — docs, regenerate check, finish

- [ ] **Step 1:** Re-run `make extract-vocab` and confirm a no-op diff (`git diff --stat` clean) — proves the committed artifacts are generator-canonical.
- [ ] **Step 2:** Update `CLAUDE.md`'s "Repository state" paragraph: the NL layer's v2 (deterministic-first multilingual pipeline) is implemented; name this plan as executed. One short paragraph, no restructure.
- [ ] **Step 3:** `make all` → clean. Manual smoke (optional but recommended): `make dev`, Zork I, picker → Français, type `ouvre la boîte aux lettres` — expect instant `you`-labelled echo + `> open mailbox` with no `…thinking`.
- [ ] **Step 4:** Commit docs, then use `superpowers:finishing-a-development-branch` to decide merge/PR.

```bash
git add CLAUDE.md
git commit -m "docs: record NL v2 multilingual pipeline as implemented"
```

---

## Self-review checklist (for the plan executor at the end)

- Spec §4 stage order matches `runLine`/`runClause` exactly (1 prompt → 2 quoted → split → 3 meta/alias → 4 vocab+guard → 5 direction → 6 lexicon → 7 LLM → 8 abstain).
- Spec §13 error table: every row has a test (deterministic-miss→LLM: Task 13; non-EN abstain notice: Task 21; EN abstain raw: Task 21; ambiguous noun: Task 13; pronoun-no-antecedent: Task 13; queue overflow/flush: Task 22; lexicon key validation: Task 9).
- No `›` glyph remains: `rg '8250|›' src` → only historical comments, no render paths.
- `viewToContext`/`recentOutput` untouched (pushback conflict resolution): it feeds prompt-detection and clauseFailed only.
- All 9 noun lexicons ship with full coverage (Ovid's decision) and every `KNOWN_COLLISIONS` entry has a review comment.




