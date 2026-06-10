# Loquor Output Translation Implementation Plan (Zork I × French)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display all Zork I game output in French, instantly via pre-translated
tables, with the on-device LLM as a rare, cached fallback — per
`docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md` (read it
before starting; §ref markers below point into it).

**Architecture:** English stays the single source of truth everywhere internally.
A new display-layer module `src/translate/` sits between `ViewState` and the React
components: exact string table → template matcher → LLM fallback (shimmer +
IndexedDB cache + miss log). The status bar translates at display time. A shared
priority gate arbitrates the one WebLLM engine between the existing input layer
(preempts) and the new output fallback.

**Tech Stack:** TypeScript + React + Vitest (jsdom, fake-indexeddb), the existing
`LlmEngine` seam (`src/llm/types.ts`), Node `.mjs` build scripts (vitest also runs
`scripts/**/*.test.mjs`).

**Conventions for every task:** TDD red→green→refactor. One commit per task
(or per step where marked). End every commit message with:
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
NEVER modify the gitignored vendored dirs (`ifvms.js/`, `zork1/`, `vendor/glkote/`,
…) — read/copy only. Run `npx vitest run <file>` for the task's file, and
`make test` before each commit.

---

## File structure (locked by this plan)

```
src/llm/engineGate.ts                 priority mutex over the shared engine (input > output)
src/llm/types.ts                      LlmEngine.generate grammar becomes string | null
src/llm/engine.webllm.ts              omit response_format when grammar is null
src/llm/engine.fake.ts                signature change only
src/llm/useNaturalLanguage.ts         generateRaw runs inside gate.run('input', …)

src/translate/normalize.ts            normalize() + splitIndent()
src/translate/types.ts                ObjectForms / ObjectsTable / Template / TranslationCorpus
src/translate/match.ts                compileCorpus() + matchLine() (exact → templates → builtin listing)
src/translate/statusTranslate.ts      status-line translation (room lookup + signed score parse)
src/translate/missLog.ts              localStorage ring buffer + window.loquorMisses()
src/translate/fallbackCache.ts        IndexedDB cache (prefixed keys in the existing 'kv' store)
src/translate/xlPrompt.ts             literal-translation prompt + per-language shimmer label
src/translate/useOutputTranslation.ts the hook (overlay, backlog rule, fallback queue)
src/translate/corpus/index.ts         corpusFor(signature, language)
src/translate/corpus/zork1.fr.strings.ts    full-line table (authored data)
src/translate/corpus/zork1.fr.objects.ts    object forms + canonical overrides (authored data)
src/translate/corpus/zork1.fr.templates.ts  composing patterns (authored data)
src/translate/corpus/zork1.fr.ts            aggregator → TranslationCorpus
src/translate/corpus/zork1.extraction-ignore.ts  reviewed non-line extraction entries
src/translate/corpus/roundtrip.test.ts      lexicon round-trip gate (spec §7.5)
src/translate/corpus/inventory.test.ts      inventory gate (spec §7.4)
src/translate/corpus/coverage.test.ts       walkthrough coverage gate (spec §7.3)

src/ui/Terminal.tsx                   wire the hook; pass gate; xl.lines/xl.status
src/ui/Scrollback.tsx                 DisplayLine + shimmer class
src/ui/components.css                 .xl-pending shimmer style

scripts/lib/zstrings.mjs              Z-machine v3 string decoder (pure; vitest-importable)
scripts/lib/zstrings.test.mjs         decoder tests against public/games/zork1.z3
scripts/extract-strings.mjs           CLI → scripts/out/zork1.strings.json (gitignored)
scripts/capture-walkthrough.mjs       seeded-RNG walkthrough capture → committed fixture
scripts/walkthrough/zork1.txt         walkthrough command script (committed)
src/test/zork1.walkthrough.en.json    captured GlkOte updates fixture (committed)

Makefile                              + extract-strings, capture-walkthrough targets
```

---

### Task 1: Grammar-free engine path (`grammar: string | null`)

The output fallback needs plain-text generation (spec §6 "Engine API change");
`LlmEngine.generate` currently requires a grammar.

**Files:**
- Modify: `src/llm/types.ts` (the `LlmEngine` interface, ~line 40)
- Modify: `src/llm/engine.webllm.ts` (`generate`, ~line 69)
- Modify: `src/llm/engine.fake.ts` (`generate`, ~line 46)
- Test: `src/llm/engine.webllm.test.ts`

- [ ] **Step 1: Write the failing test** — in `engine.webllm.test.ts`, the existing
  mock exposes created engines; extend the `FakeMlcEngine` interface used by the
  mock with a chat stub so `generate` is testable, then add:

```ts
// Extend the mock's engine factory (where FakeMlcEngine objects are built) with:
//   chat: { completions: { create: vi.fn(async (req: unknown) => ({
//     choices: [{ message: { content: 'ok' } }],
//   })) } },
//   interruptGenerate: vi.fn(),
// and widen FakeMlcEngine accordingly. Then:

describe('WebLlmEngine.generate grammar plumbing', () => {
  it('omits response_format entirely when grammar is null (output-translation fallback)', async () => {
    const e = new WebLlmEngine('m')
    const p = e.load(() => {}, new AbortController().signal)
    await tick()
    resolveCreate[0]()
    await p
    await e.generate([{ role: 'user', content: 'hi' }], null)
    const req = engines[0].chat.completions.create.mock.calls[0][0] as Record<
      string,
      unknown
    >
    expect('response_format' in req).toBe(false)
  })

  it('still sends the grammar response_format when given a grammar', async () => {
    const e = new WebLlmEngine('m')
    const p = e.load(() => {}, new AbortController().signal)
    await tick()
    resolveCreate[0]()
    await p
    await e.generate([{ role: 'user', content: 'hi' }], 'root ::= "x"')
    const req = engines[0].chat.completions.create.mock.calls[0][0] as Record<
      string,
      unknown
    >
    expect(req.response_format).toEqual({
      type: 'grammar',
      grammar: 'root ::= "x"',
    })
  })

  it('grammar-free path surfaces nullish content as "" — never the ABSTAIN sentinel', async () => {
    const e = new WebLlmEngine('m')
    const p = e.load(() => {}, new AbortController().signal)
    await tick()
    resolveCreate[0]()
    await p
    engines[0].chat.completions.create.mockResolvedValueOnce({ choices: [] })
    expect(await e.generate([{ role: 'user', content: 'hi' }], null)).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/engine.webllm.test.ts`
Expected: FAIL (type error / `response_format` present, chat stub missing).

- [ ] **Step 3: Implement** — in `src/llm/types.ts` change the interface:

```ts
  generate(
    prompt: ChatMessages,
    /** GBNF grammar for constrained decoding, or null for plain text
     * (output-translation fallback, spec §6). */
    grammar: string | null,
    signal?: AbortSignal,
  ): Promise<string>
```

In `src/llm/engine.webllm.ts` change the signature to `grammar: string | null`
and the create call to:

```ts
      const res = await engine.chat.completions.create({
        messages: prompt,
        temperature: 0,
        // ResponseFormat in 0.2.84 supports { type: 'grammar', grammar } natively;
        // omit it entirely for the plain-text output-translation fallback.
        ...(grammar === null ? {} : { response_format: { type: 'grammar', grammar } }),
      })
```

and the return line: `ABSTAIN` (`'__UNKNOWN__'`) is the INPUT layer's sentinel —
on the grammar-free path nullish content must surface as `''` so the output
hook's empty-translation guard falls back to English instead of displaying
(and permanently caching) the sentinel:

```ts
      return res.choices[0]?.message?.content ?? (grammar === null ? '' : ABSTAIN)
```

In `src/llm/engine.fake.ts` change `_grammar: string` to `_grammar: string | null`
(no behavior change).

- [ ] **Step 4: Run tests** — `npx vitest run src/llm` then `make typecheck`. Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit` —
  `feat(llm): grammar-free generate path for the output-translation fallback`

---

### Task 2: EngineGate — input preempts output

Spec §6 "Shared-engine arbitration". One generation at a time across BOTH
consumers; queued input always starts before queued output; in-flight work is
never aborted by the gate.

**Files:**
- Create: `src/llm/engineGate.ts`
- Test: `src/llm/engineGate.test.ts`
- Modify: `src/llm/useNaturalLanguage.ts` (args + `generateRaw`)
- Modify: `src/ui/Terminal.tsx` (create the shared gate)

- [ ] **Step 1: Write the failing tests**

```ts
// src/llm/engineGate.test.ts
import { describe, it, expect } from 'vitest'
import { EngineGate } from './engineGate'

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(r => (resolve = r))
  return { promise, resolve }
}

describe('EngineGate (output-translation spec §6 arbitration)', () => {
  it('runs immediately when free', async () => {
    const g = new EngineGate()
    expect(await g.run('output', async () => 42)).toBe(42)
  })

  it('serializes: a second task waits for the first', async () => {
    const g = new EngineGate()
    const d = deferred<void>()
    const order: string[] = []
    const p1 = g.run('input', async () => {
      await d.promise
      order.push('a')
    })
    const p2 = g.run('input', async () => {
      order.push('b')
    })
    d.resolve()
    await Promise.all([p1, p2])
    expect(order).toEqual(['a', 'b'])
  })

  it('queued INPUT starts before earlier-queued OUTPUT (preemption)', async () => {
    const g = new EngineGate()
    const d = deferred<void>()
    const order: string[] = []
    const p0 = g.run('output', async () => {
      await d.promise // holds the gate
    })
    const pOut = g.run('output', async () => {
      order.push('output')
    })
    const pIn = g.run('input', async () => {
      order.push('input')
    })
    d.resolve()
    await Promise.all([p0, pOut, pIn])
    expect(order).toEqual(['input', 'output'])
  })

  it('a rejecting task releases the gate and propagates its error', async () => {
    const g = new EngineGate()
    await expect(
      g.run('output', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await g.run('input', async () => 'next')).toBe('next')
  })

  it('FIFO within a priority class', async () => {
    const g = new EngineGate()
    const d = deferred<void>()
    const order: number[] = []
    const p0 = g.run('output', async () => {
      await d.promise
    })
    const ps = [1, 2, 3].map(n =>
      g.run('output', async () => {
        order.push(n)
      }),
    )
    d.resolve()
    await Promise.all([p0, ...ps])
    expect(order).toEqual([1, 2, 3])
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/llm/engineGate.test.ts`
  Expected: FAIL ("Cannot find module './engineGate'").

- [ ] **Step 3: Implement**

```ts
// src/llm/engineGate.ts
// Priority mutex over the single shared WebLLM engine (output-translation
// spec §6): one generation at a time; queued INPUT work always starts before
// queued OUTPUT work — input latency is felt at the prompt, while a shimmering
// transcript line is designed to be visibly pending. The gate never aborts an
// in-flight task; preemption is strictly about who starts NEXT.
export type GatePriority = 'input' | 'output'

export class EngineGate {
  private busy = false
  private waiters: Array<{ p: GatePriority; start: () => void }> = []

  async run<T>(p: GatePriority, fn: () => Promise<T>): Promise<T> {
    if (this.busy) {
      await new Promise<void>(res => this.waiters.push({ p, start: res }))
    }
    this.busy = true
    try {
      return await fn()
    } finally {
      this.busy = false
      const i = this.waiters.findIndex(w => w.p === 'input')
      const next = i >= 0 ? this.waiters.splice(i, 1)[0] : this.waiters.shift()
      next?.start()
    }
  }
}
```

- [ ] **Step 4: Run tests** — expected PASS.

- [ ] **Step 5: Wire into the input layer.** In `src/llm/useNaturalLanguage.ts`:
  add to `UseNaturalLanguageArgs`:

```ts
  /** Shared engine gate (output-translation spec §6). Optional so existing
   * tests need no change; Terminal passes ONE instance shared with the
   * output-translation hook. Input work runs at 'input' priority. */
  gate?: EngineGate
```

  (import `{ EngineGate }` from `./engineGate`). Inside the hook, before
  `generateRaw`:

```ts
  // One stable fallback gate when the caller doesn't supply a shared one.
  const [fallbackGate] = useState(() => new EngineGate())
  const engineGate = args.gate ?? fallbackGate
```

  Then wrap the ENTIRE body of `generateRaw` (the lazy load + watchdog + generate)
  in the gate, so waiting for the gate never counts against the watchdog:

```ts
  const generateRaw = useCallback(
    (messages: ChatMessages, grammar: string): Promise<string> =>
      // The watchdogs start INSIDE the gate: time spent queued behind an
      // output-translation generation must not burn the input watchdog.
      engineGate.run('input', async () => {
        /* …existing body unchanged… */
      }),
    [engine, watchdogMs, engineGate],
  )
```

  In `src/ui/Terminal.tsx` create the shared instance next to the engine and pass
  it (the output hook reuses it in Task 11):

```ts
  // One gate arbitrating the single engine between the NL input layer and the
  // output-translation fallback (input preempts; output-translation spec §6).
  const [gate] = useState(() => new EngineGate())
```

  and add `gate,` to the `useNaturalLanguage({ … })` args.

- [ ] **Step 6: Add a regression test** in `src/llm/useNaturalLanguage.test.tsx`
  (follow that file's existing render/harness pattern for hook setup): pass a
  shared `EngineGate`, hold it with a deferred `gate.run('output', …)`, submit an
  LLM-stage line, then release the output task and assert the translation still
  completes (the input waiter ran after release, before any queued output).

- [ ] **Step 7: Run the full suite** — `make test && make typecheck`. Expected: PASS
  (existing NL tests unaffected: gate defaults to a private instance).

- [ ] **Step 8: Commit** — `feat(llm): EngineGate — input-priority mutex over the shared engine`

---

### Task 3: `src/translate/normalize.ts`

Spec §4 Normalization: collapse whitespace runs, trim; case/punctuation
preserved; leading indent split off and re-applied (nested listings).

**Files:**
- Create: `src/translate/normalize.ts`
- Test: `src/translate/normalize.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/translate/normalize.test.ts
import { describe, it, expect } from 'vitest'
import { normalize, splitIndent } from './normalize'

describe('normalize (spec §4)', () => {
  it('collapses whitespace runs and trims', () => {
    expect(normalize('  Score:   0   Moves: 1 ')).toBe('Score: 0 Moves: 1')
  })
  it('preserves case and punctuation', () => {
    expect(normalize('Taken.')).toBe('Taken.')
    expect(normalize('You can\'t go that way.')).toBe("You can't go that way.")
  })
  it('empty / whitespace-only → empty string', () => {
    expect(normalize('   ')).toBe('')
  })
})

describe('splitIndent (spec §4 listing indentation)', () => {
  it('splits leading whitespace from the body', () => {
    expect(splitIndent('  A quantity of water')).toEqual({
      indent: '  ',
      body: 'A quantity of water',
    })
  })
  it('no indent → empty prefix', () => {
    expect(splitIndent('Taken.')).toEqual({ indent: '', body: 'Taken.' })
  })
})
```

- [ ] **Step 2: Run / verify FAIL.** `npx vitest run src/translate/normalize.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/translate/normalize.ts
// Shared normalization for table generation AND runtime lookup (spec §4):
// collapse whitespace runs, trim. Case and punctuation are preserved — they
// are part of string identity. Leading indent is structure (nested listings),
// not identity: split it off before lookup, re-apply it to the translation.
export function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function splitIndent(s: string): { indent: string; body: string } {
  const m = /^(\s*)([\s\S]*)$/.exec(s)!
  return { indent: m[1], body: m[2] }
}
```

- [ ] **Step 4: Run / verify PASS.**
- [ ] **Step 5: Commit** — `feat(translate): normalization + indent split`

---

### Task 4: Corpus types + empty Zork I French corpus + `corpusFor`

**Files:**
- Create: `src/translate/types.ts`
- Create: `src/translate/corpus/zork1.fr.strings.ts`, `zork1.fr.objects.ts`,
  `zork1.fr.templates.ts`, `zork1.fr.ts`, `index.ts`
- Test: `src/translate/corpus/index.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/translate/corpus/index.test.ts
import { describe, it, expect } from 'vitest'
import { corpusFor } from './index'
import { ZORK1_SIG, ZORK2_SIG } from '../../llm/grammar/index'

describe('corpusFor (spec §3 passthrough contract)', () => {
  it('returns the Zork I French corpus', () => {
    const c = corpusFor(ZORK1_SIG, 'fr')
    expect(c).not.toBeNull()
    expect(c!.strings).toBeDefined()
    expect(c!.objects).toBeDefined()
    expect(c!.templates).toBeDefined()
  })
  it('returns null for en / off (hook is a no-op passthrough)', () => {
    expect(corpusFor(ZORK1_SIG, 'en')).toBeNull()
    expect(corpusFor(ZORK1_SIG, 'off')).toBeNull()
  })
  it('returns null for a game or language without a corpus', () => {
    expect(corpusFor(ZORK2_SIG, 'fr')).toBeNull()
    expect(corpusFor(ZORK1_SIG, 'de')).toBeNull()
    expect(corpusFor('unknown-sig', 'fr')).toBeNull()
  })
})
```

- [ ] **Step 2: Run / verify FAIL.**

- [ ] **Step 3: Implement.** Types first:

```ts
// src/translate/types.ts
/** Pre-composed display forms for one object/room name. The KEY SET IS OPEN
 * and per-language (spec §4 "Open form keys"): French ships {indef, def,
 * bare}; German will ship case forms (nomIndef, akkIndef, …). The matcher
 * never interprets key names — a template references {obj.<key>} and the
 * data supplies it. A missing key on a matched object is a MISS, not a crash. */
export type ObjectForms = Readonly<Record<string, string>>

/** EN printed name (exactly as it appears in game output) → forms. */
export type ObjectsTable = Readonly<Record<string, ObjectForms>>

/** A composing pattern. EN slots: {obj} {obj2} {num} {num2} {raw}. The out
 * side references {obj.<key>} / {obj2.<key>} / {num} / {num2} / {raw}.
 * cap: capitalize the first character of the composed result (used by the
 * built-in listing template "A {obj}" → "{obj.indef}"). */
export interface Template {
  readonly en: string
  readonly out: string
  readonly cap?: boolean
}

export interface TranslationCorpus {
  /** normalized English full line → translation (checked FIRST, spec §5). */
  readonly strings: Readonly<Record<string, string>>
  readonly objects: ObjectsTable
  readonly templates: readonly Template[]
}
```

Empty data files (authored in Tasks 14–17):

```ts
// src/translate/corpus/zork1.fr.strings.ts
// Zork I × French full-line table (output-translation spec §4.1). KEYS are
// normalized English lines EXACTLY as the bridge delivers them (normalize():
// collapsed whitespace, trimmed; case/punctuation preserved). Authored data —
// UAT hand-fixes edit entries here; the coverage/inventory gates police it.
export const ZORK1_FR_STRINGS: Readonly<Record<string, string>> = {}
```

```ts
// src/translate/corpus/zork1.fr.objects.ts
// Zork I × French object forms (spec §4.2). Keys are EN printed names as they
// appear in output. French form keys: indef ("une bouteille en verre"),
// def ("la bouteille en verre"), bare ("bouteille en verre"). Gender and
// elision live entirely in the pre-composed strings — there is no grammar
// code. Base noun phrases are SOURCED FROM the FR input lexicon
// (src/llm/lexicon/fr.zork1.ts); the round-trip gate (roundtrip.test.ts)
// enforces alignment.
import type { ObjectsTable } from '../types'

export const ZORK1_FR_OBJECTS: ObjectsTable = {}

/** Printed name → vocab canonical, for entries whose printed name differs
 * from the extracted-vocab canonical key in FR_ZORK1. Identity when absent. */
export const ZORK1_FR_CANONICAL: Readonly<Record<string, string>> = {}
```

```ts
// src/translate/corpus/zork1.fr.templates.ts
// Zork I × French composing patterns (spec §4.3). Tried in specificity order;
// {obj}-resolving templates beat {raw} ones of the same shape (match.ts owns
// the ordering — author in any order).
import type { Template } from '../types'

export const ZORK1_FR_TEMPLATES: readonly Template[] = []
```

```ts
// src/translate/corpus/zork1.fr.ts
import type { TranslationCorpus } from '../types'
import { ZORK1_FR_STRINGS } from './zork1.fr.strings'
import { ZORK1_FR_OBJECTS } from './zork1.fr.objects'
import { ZORK1_FR_TEMPLATES } from './zork1.fr.templates'

export const ZORK1_FR: TranslationCorpus = {
  strings: ZORK1_FR_STRINGS,
  objects: ZORK1_FR_OBJECTS,
  templates: ZORK1_FR_TEMPLATES,
}
```

```ts
// src/translate/corpus/index.ts
// (signature, language) → corpus, mirroring the lexicon registry
// (src/llm/lexicon/index.ts). null means the output-translation hook is a
// pure passthrough (spec §3) — en/off always, and any uncovered game/language.
import type { NlLanguage } from '../../llm/types'
import type { TranslationCorpus } from '../types'
import { ZORK1_SIG } from '../../llm/grammar/index'
import { ZORK1_FR } from './zork1.fr'

const CORPORA: Readonly<
  Record<string, Partial<Record<string, TranslationCorpus>>>
> = {
  [ZORK1_SIG]: { fr: ZORK1_FR },
}

export function corpusFor(
  signature: string,
  language: NlLanguage,
): TranslationCorpus | null {
  if (language === 'en' || language === 'off') return null
  return CORPORA[signature]?.[language] ?? null
}
```

- [ ] **Step 4: Run / verify PASS** (`npx vitest run src/translate/corpus/index.test.ts`,
  `make typecheck`).
- [ ] **Step 5: Commit** — `feat(translate): corpus types + (signature, language) registry`

---

### Task 5: The matcher — exact table, templates, `{raw}`, builtin listing

Spec §5. This is the core pure module.

**Files:**
- Create: `src/translate/match.ts`
- Test: `src/translate/match.test.ts`

- [ ] **Step 1: Failing tests** (write ALL of these; they pin the spec):

```ts
// src/translate/match.test.ts
import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from './match'
import type { TranslationCorpus } from './types'

const corpus: TranslationCorpus = {
  strings: {
    'Taken.': 'Pris.',
    'A quantity of water': "De l'eau",
    'West of House': "À l'ouest de la maison",
  },
  objects: {
    'glass bottle': {
      indef: 'une bouteille en verre',
      def: 'la bouteille en verre',
      bare: 'bouteille en verre',
    },
    'brass lantern': {
      indef: 'une lampe en laiton',
      def: 'la lampe en laiton',
      bare: 'lampe en laiton',
    },
    // Deliberately MISSING 'def' to pin missing-form-key-is-a-miss:
    lunch: { indef: 'un casse-croûte' },
  },
  templates: [
    { en: 'There is a {obj} here.', out: 'Il y a {obj.indef} ici.' },
    { en: 'The {obj} is now open.', out: '{obj.def} est maintenant {obj.bare}…' },
    { en: "You can't see any {obj} here!", out: 'Vous ne voyez pas de {obj.bare} ici !' },
    { en: "You can't see any {raw} here!", out: 'Vous ne voyez pas de {raw} ici !' },
    { en: 'I don\'t know the word "{raw}".', out: 'Je ne connais pas le mot "{raw}".' },
    { en: 'Your score is {num} (total of 350 points), in {num2} moves.',
      out: 'Votre score est de {num} (sur un total de 350 points), en {num2} déplacements.' },
    { en: 'The {obj} contains:', out: '{obj.def} contient :' },
  ],
}
const c = compileCorpus(corpus)

describe('matchLine: exact table (spec §5.1)', () => {
  it('hits a full-line entry', () => {
    expect(matchLine(c, 'Taken.')).toBe('Pris.')
  })
  it('exact runs FIRST: an irregular composition pinned as a full line never reaches templates', () => {
    expect(matchLine(c, 'A quantity of water')).toBe("De l'eau")
  })
  it('misses an unknown line', () => {
    expect(matchLine(c, 'Some line nobody wrote.')).toBeNull()
  })
})

describe('matchLine: templates (spec §5.2)', () => {
  it('resolves an {obj} slot through the objects table', () => {
    expect(matchLine(c, 'There is a glass bottle here.')).toBe(
      'Il y a une bouteille en verre ici.',
    )
  })
  it('an unknown object inside a known {obj} pattern is a MISS (every slot must resolve)', () => {
    expect(matchLine(c, 'There is a chartreuse zeppelin here.')).toBeNull()
  })
  it('a matched object MISSING the referenced form key is a miss, not a crash (open form keys)', () => {
    expect(matchLine(c, 'The lunch is now open.')).toBeNull()
  })
  it('{num} slots match SIGNED integers (scores go negative — spec §4.3)', () => {
    expect(
      matchLine(c, 'Your score is -10 (total of 350 points), in 3 moves.'),
    ).toBe(
      'Votre score est de -10 (sur un total de 350 points), en 3 déplacements.',
    )
  })
  it('{obj} templates beat {raw} templates of the same shape (known object → proper French)', () => {
    expect(matchLine(c, "You can't see any brass lantern here!")).toBe(
      'Vous ne voyez pas de lampe en laiton ici !',
    )
  })
  it('{raw} captures verbatim when no object resolves — quoted-unknown-word lines are HITS', () => {
    expect(matchLine(c, "You can't see any frobnitz here!")).toBe(
      'Vous ne voyez pas de frobnitz ici !',
    )
    expect(matchLine(c, 'I don\'t know the word "xyzzy".')).toBe(
      'Je ne connais pas le mot "xyzzy".',
    )
  })
  it('specificity: more literal characters win over looser patterns', () => {
    // "The {obj} contains:" must not be shadowed by anything looser; and a
    // longer-literal template wins regardless of authoring order.
    expect(matchLine(c, 'The glass bottle contains:')).toBe(
      'La bouteille en verre contient :',
    )
  })
})

describe('matchLine: builtin listing template (spec §5)', () => {
  it('"A {obj}" → capitalized indef (inventory/contents listings)', () => {
    expect(matchLine(c, 'A glass bottle')).toBe('Une bouteille en verre')
  })
  it('listing miss for an unknown object', () => {
    expect(matchLine(c, 'A chartreuse zeppelin')).toBeNull()
  })
})

describe('open form keys contract (spec §4, §7.1 — fake declined language)', () => {
  it('templates resolve arbitrary form-key names; nothing hard-codes French', () => {
    const fake: TranslationCorpus = {
      strings: {},
      objects: { sword: { nomIndef: 'ein Schwert', datDef: 'dem Schwert' } },
      templates: [
        { en: 'There is a {obj} here.', out: 'Hier ist {obj.nomIndef}.' },
        { en: 'You swing at the {obj}.', out: 'Du schlägst nach {obj.datDef}.' },
      ],
    }
    const fc = compileCorpus(fake)
    expect(matchLine(fc, 'There is a sword here.')).toBe('Hier ist ein Schwert.')
    expect(matchLine(fc, 'You swing at the sword.')).toBe(
      'Du schlägst nach dem Schwert.',
    )
  })
})
```

Note the second template's `out` uses `{obj.bare}…` only to exercise key
resolution — the assertion that matters there is the `lunch` miss.

- [ ] **Step 2: Run / verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/translate/match.ts
// Pure runtime matcher (spec §5): 1. exact string table → 2. templates in
// specificity order ({obj} before {raw} for equal literals; every slot must
// resolve) → 3. null (miss; the LLM fallback catches it). The built-in
// listing templates "A {obj}" / "An {obj}" → capitalized {obj.indef} are
// appended at compile time so each inventory/contents BufferLine composes.
import type { ObjectForms, Template, TranslationCorpus } from './types'

interface CompiledTemplate {
  re: RegExp
  out: string
  cap: boolean
  /** Count of {raw} slots — tie-breaker: obj-resolving beats raw (spec §5). */
  rawCount: number
  /** Literal (non-slot) character count — primary specificity. */
  literal: number
}

export interface CompiledCorpus {
  strings: Readonly<Record<string, string>>
  objects: Readonly<Record<string, ObjectForms>>
  templates: CompiledTemplate[]
}

const SLOT = /\{(obj2?|num2?|raw)\}/g

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Built-in listing templates (spec §5): every inventory/contents entry is
 * its own BufferLine shaped "A <name>" / "An <name>". */
const BUILTIN: Template[] = [
  { en: 'A {obj}', out: '{obj.indef}', cap: true },
  { en: 'An {obj}', out: '{obj.indef}', cap: true },
]

export function compileCorpus(corpus: TranslationCorpus): CompiledCorpus {
  // Longest-first alternation so 'glass bottle' wins over a hypothetical 'glass'.
  const names = Object.keys(corpus.objects).sort((a, b) => b.length - a.length)
  const objAlt = names.length > 0 ? names.map(escapeRe).join('|') : '(?!)' // never-match when empty

  const compile = (t: Template): CompiledTemplate => {
    let literal = 0
    let rawCount = 0
    let src = '^'
    let last = 0
    for (const m of t.en.matchAll(SLOT)) {
      const lit = t.en.slice(last, m.index)
      literal += lit.length
      src += escapeRe(lit)
      const slot = m[1]
      if (slot === 'obj' || slot === 'obj2') src += `(?<${slot}>${objAlt})`
      else if (slot === 'num' || slot === 'num2') src += `(?<${slot}>-?\\d+)`
      else {
        rawCount++
        src += '(?<raw>.+?)'
      }
      last = m.index! + m[0].length
    }
    const tail = t.en.slice(last)
    literal += tail.length
    src += escapeRe(tail) + '$'
    return {
      re: new RegExp(src),
      out: t.out,
      cap: t.cap === true,
      rawCount,
      literal,
    }
  }

  const templates = [...corpus.templates, ...BUILTIN].map(compile)
  // Specificity: most literal characters first; ties → {obj}-resolving before
  // {raw} (spec §5), so a known object gets its proper French form.
  templates.sort((a, b) => b.literal - a.literal || a.rawCount - b.rawCount)
  return { strings: corpus.strings, objects: corpus.objects, templates }
}

const OUT_REF = /\{(obj2?)\.([A-Za-z]+)\}|\{(num2?)\}|\{(raw)\}/g

/** Given a NORMALIZED English line, return its translation or null (miss). */
export function matchLine(c: CompiledCorpus, line: string): string | null {
  const exact = c.strings[line]
  if (exact !== undefined) return exact

  for (const t of c.templates) {
    const m = t.re.exec(line)
    if (!m) continue
    const g = m.groups ?? {}
    let ok = true
    const out = t.out.replace(
      OUT_REF,
      (_all, objSlot?: string, formKey?: string, numSlot?: string, raw?: string) => {
        if (objSlot) {
          const name = g[objSlot]
          const form = name !== undefined ? c.objects[name]?.[formKey!] : undefined
          if (form === undefined) {
            ok = false // unresolved slot/form key → this template MISSES (spec §4/§5)
            return ''
          }
          return form
        }
        if (numSlot) {
          const v = g[numSlot]
          if (v === undefined) {
            ok = false
            return ''
          }
          return v
        }
        const r = g[raw!]
        if (r === undefined) {
          ok = false
          return ''
        }
        return r
      },
    )
    if (!ok) continue
    return t.cap ? out.charAt(0).toUpperCase() + out.slice(1) : out
  }
  return null
}
```

- [ ] **Step 4: Run / verify PASS** (`npx vitest run src/translate/match.test.ts`).
  If the "contains:" specificity test fails on a tie, the literal-count ordering
  is wrong — fix the sort, don't loosen the test.
- [ ] **Step 5: Commit** — `feat(translate): exact + template matcher with {raw} and open form keys`

---

### Task 6: Status-line translation

Spec §5 "Status bar": `parseStatus` is untouched and `right` is a RAW string —
this module parses it itself (signed score). Room name via the strings table
(room titles are full-line entries). Any miss → English for that part.

**Files:**
- Create: `src/translate/statusTranslate.ts`
- Test: `src/translate/statusTranslate.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/translate/statusTranslate.test.ts
import { describe, it, expect } from 'vitest'
import { translateStatus } from './statusTranslate'
import { compileCorpus } from './match'

const c = compileCorpus({
  strings: { 'West of House': "À l'ouest de la maison" },
  objects: {},
  templates: [],
})

describe('translateStatus (spec §5 status bar)', () => {
  it('translates room name and renders the FR score format', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Score: 340   Moves: 470' },
      c,
      'fr',
    )
    expect(r.status).toEqual({
      location: "À l'ouest de la maison",
      right: 'Score : 340  Coups : 470',
    })
    expect(r.miss).toBeNull()
  })
  it('handles negative scores (death is -10, unclamped — spec §4.3)', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Score: -10   Moves: 3' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Score : -10  Coups : 3')
  })
  it('room-name miss → English location, miss reported (no shimmer in a one-line bar)', () => {
    const r = translateStatus(
      { location: 'Frobozz Room', right: 'Score: 0   Moves: 1' },
      c,
      'fr',
    )
    expect(r.status.location).toBe('Frobozz Room')
    expect(r.miss).toBe('Frobozz Room')
  })
  it('unparseable right side → English right, miss reported', () => {
    const r = translateStatus(
      { location: 'West of House', right: 'Time: 9:00am' },
      c,
      'fr',
    )
    expect(r.status.right).toBe('Time: 9:00am')
    expect(r.miss).toBe('Time: 9:00am')
  })
})
```

- [ ] **Step 2: Run / verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/translate/statusTranslate.ts
// Display-time status translation (spec §5). parseStatus() upstream is
// UNTOUCHED — its `right` is a raw string ("Score: 0   Moves: 1"), so the
// numbers are parsed HERE (signed: scores go negative). Misses fall back to
// English for that part and are reported to the caller for the miss log.
import type { StatusLine } from '../glkote-react/types'
import type { CompiledCorpus } from './match'
import { normalize } from './normalize'

const RIGHT = /^Score:\s*(-?\d+)\s+Moves:\s*(\d+)$/

const RIGHT_FORMAT: Readonly<Record<string, (score: string, moves: string) => string>> = {
  fr: (score, moves) => `Score : ${score}  Coups : ${moves}`,
  de: (score, moves) => `Punkte: ${score}  Züge: ${moves}`,
  es: (score, moves) => `Puntos: ${score}  Turnos: ${moves}`,
}

export function translateStatus(
  status: StatusLine,
  c: CompiledCorpus,
  language: string,
): { status: StatusLine; miss: string | null } {
  let miss: string | null = null

  const loc = c.strings[normalize(status.location)]
  if (loc === undefined && status.location !== '') miss = status.location

  const m = RIGHT.exec(normalize(status.right))
  const fmt = RIGHT_FORMAT[language]
  const right = m && fmt ? fmt(m[1], m[2]) : status.right
  if ((!m || !fmt) && status.right !== '') miss = miss ?? status.right

  return {
    status: { location: loc ?? status.location, right },
    miss,
  }
}
```

- [ ] **Step 4: Run / verify PASS.**
- [ ] **Step 5: Commit** — `feat(translate): status-line translation with signed score parse`

---

### Task 7: Miss log (ring buffer + dev affordance)

Spec §6 "Miss log": capped localStorage ring buffer; `window.loquorMisses()`
returns a copy-pastable list for UAT dumps.

**Files:**
- Create: `src/translate/missLog.ts`
- Test: `src/translate/missLog.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/translate/missLog.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { logMiss, readMisses, installMissDump, MISS_CAP } from './missLog'

beforeEach(() => localStorage.clear())

describe('miss log (spec §6)', () => {
  it('appends entries with turn context (spec §6)', () => {
    logMiss({
      en: 'A weird line.',
      game: 'sig1',
      language: 'fr',
      kind: 'line',
      ctx: 'West of House — Score: 0 Moves: 1',
    })
    expect(readMisses()).toEqual([
      expect.objectContaining({
        en: 'A weird line.',
        kind: 'line',
        ctx: 'West of House — Score: 0 Moves: 1',
      }),
    ])
  })
  it('caps as a ring buffer (oldest dropped)', () => {
    for (let i = 0; i < MISS_CAP + 5; i++)
      logMiss({ en: `line ${i}`, game: 's', language: 'fr', kind: 'line' })
    const all = readMisses()
    expect(all).toHaveLength(MISS_CAP)
    expect(all[0].en).toBe('line 5')
  })
  it('survives corrupt storage (falls back to empty)', () => {
    localStorage.setItem('loquor.xlate.misses', '{nope')
    expect(readMisses()).toEqual([])
    logMiss({ en: 'x', game: 's', language: 'fr', kind: 'status' })
    expect(readMisses()).toHaveLength(1)
  })
  it('installMissDump exposes window.loquorMisses()', () => {
    installMissDump()
    logMiss({ en: 'x', game: 's', language: 'fr', kind: 'line' })
    const fn = (window as unknown as { loquorMisses: () => unknown[] }).loquorMisses
    expect(fn()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run / verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/translate/missLog.ts
// Corpus-improvement loop (spec §6): every table miss — line, unresolved
// template slot, status room name — lands here with context. Capped ring
// buffer in localStorage; window.loquorMisses() lets a UAT session dump it
// straight into the notes. Storage errors are swallowed (same policy as
// nlpref.ts): logging must never break play.
export const MISS_CAP = 200
const KEY = 'loquor.xlate.misses'

export interface MissEntry {
  en: string
  game: string
  language: string
  kind: 'line' | 'status' | 'backlog'
  /** Turn context at miss time — the status line (room — score/moves), so a
   * UAT dump says WHERE each gap was hit (spec §6 "turn context"). */
  ctx?: string
  t?: number
}

export function readMisses(store?: Storage): MissEntry[] {
  try {
    const raw = (store ?? localStorage).getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MissEntry[]) : []
  } catch {
    return []
  }
}

export function logMiss(entry: MissEntry, store?: Storage): void {
  try {
    const s = store ?? localStorage
    const all = [...readMisses(s), { ...entry, t: Date.now() }].slice(-MISS_CAP)
    s.setItem(KEY, JSON.stringify(all))
  } catch {
    // Private mode / quota — best-effort, never fatal.
  }
}

/** Dev affordance: window.loquorMisses() → copy-pastable array. */
export function installMissDump(): void {
  if (typeof window === 'undefined') return
  ;(window as unknown as Record<string, unknown>).loquorMisses = () =>
    readMisses()
}
```

- [ ] **Step 4: Run / verify PASS.**
- [ ] **Step 5: Commit** — `feat(translate): capped miss log + window.loquorMisses()`

---

### Task 8: Fallback cache (IndexedDB)

Spec §6 "Cache first". Reuse the existing `kv` store with prefixed keys —
`src/storage/idb.ts` is a flat kv API and a separate object store would force a
DB version bump for no benefit. Key: `(game signature, language, normalized EN)`.

**Files:**
- Create: `src/translate/fallbackCache.ts`
- Test: `src/translate/fallbackCache.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/translate/fallbackCache.test.ts
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { cacheGet, cacheSet } from './fallbackCache'

describe('fallback cache (spec §6: each miss costs once per device, ever)', () => {
  it('round-trips a translation keyed by (game, language, en)', async () => {
    await cacheSet('sig1', 'fr', 'A weird line.', 'Une ligne bizarre.')
    expect(await cacheGet('sig1', 'fr', 'A weird line.')).toBe(
      'Une ligne bizarre.',
    )
  })
  it('misses across game / language / text boundaries', async () => {
    await cacheSet('sig1', 'fr', 'Hello.', 'Bonjour.')
    expect(await cacheGet('sig2', 'fr', 'Hello.')).toBeUndefined()
    expect(await cacheGet('sig1', 'de', 'Hello.')).toBeUndefined()
    expect(await cacheGet('sig1', 'fr', 'Hello!')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run / verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/translate/fallbackCache.ts
// IndexedDB cache for LLM-fallback translations (spec §6): a miss costs one
// generation per device, ever. Lives in the existing 'kv' store under a key
// prefix — a dedicated object store would force a DB version bump for a flat
// string→string map the kv API already models.
import { idbGet, idbSet } from '../storage/idb'

const key = (game: string, language: string, en: string) =>
  `xlate:${game}:${language}:${en}`

export const cacheGet = (game: string, language: string, en: string) =>
  idbGet<string>(key(game, language, en))

export const cacheSet = (
  game: string,
  language: string,
  en: string,
  translation: string,
) => idbSet(key(game, language, en), translation)
```

- [ ] **Step 4: Run / verify PASS.**
- [ ] **Step 5: Commit** — `feat(translate): IndexedDB fallback cache (prefixed kv keys)`

---

### Task 9: Fallback prompt + shimmer labels

Spec §6: literal-translation instruction, plain text, no grammar; §6 shimmer
renders a per-language label. Also documents the accepted injection surface:
game lines can quote player tokens; the literal prompt invites no action and
output renders as a plain text node.

**Files:**
- Create: `src/translate/xlPrompt.ts`
- Test: `src/translate/xlPrompt.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/translate/xlPrompt.test.ts
import { describe, it, expect } from 'vitest'
import { xlPrompt, shimmerLabel } from './xlPrompt'

describe('xlPrompt (spec §6 literal translation)', () => {
  it('builds a system+user pair naming the target language', () => {
    const m = xlPrompt('You are in a maze of twisty little passages.', 'fr')
    expect(m).toHaveLength(2)
    expect(m[0].role).toBe('system')
    expect(m[0].content).toContain('French')
    expect(m[0].content).toMatch(/only the translation/i)
    expect(m[1]).toEqual({
      role: 'user',
      content: 'You are in a maze of twisty little passages.',
    })
  })
  it('per-language shimmer labels', () => {
    expect(shimmerLabel('fr')).toBe('…traduction')
    expect(shimmerLabel('de')).toBe('…Übersetzung')
    expect(shimmerLabel('es')).toBe('…traducción')
  })
})
```

- [ ] **Step 2: Run / verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/translate/xlPrompt.ts
// Literal-translation prompt for the rare output fallback (spec §6) — same
// philosophy as the input layer's literal prompt: translate exactly, no
// commentary, no invented state. Plain-text generation (grammar: null).
// Accepted injection surface (spec §6): game lines can quote player-typed
// tokens; the prompt invites no action and the result renders as a plain
// React text node, so the worst case is a weird cached translation.
import type { ChatMessages } from '../llm/types'
import type { LexLang } from '../llm/lexicon/types'

const TARGET: Readonly<Record<LexLang, string>> = {
  fr: 'French',
  de: 'German',
  es: 'Spanish',
}

const SHIMMER: Readonly<Record<LexLang, string>> = {
  fr: '…traduction',
  de: '…Übersetzung',
  es: '…traducción',
}

export function shimmerLabel(lang: LexLang): string {
  return SHIMMER[lang]
}

export function xlPrompt(line: string, lang: LexLang): ChatMessages {
  return [
    {
      role: 'system',
      content:
        `You translate output text from the classic text adventure game Zork ` +
        `into ${TARGET[lang]}. Translate the line exactly and literally. Keep ` +
        `the punctuation and capitalization style. Use the formal second person. ` +
        `Do not add commentary, do not answer questions, do not invent game ` +
        `state. Output only the translation.`,
    },
    { role: 'user', content: line },
  ]
}
```

- [ ] **Step 4: Run / verify PASS.**
- [ ] **Step 5: Commit** — `feat(translate): literal fallback prompt + shimmer labels`

---

### Task 10: `useOutputTranslation` — the overlay hook

Spec §3 (overlay, memoized on line text, backlog rule, en/off passthrough) and
§6 (cache → gate-queued generation → English on failure; misses logged).

**Files:**
- Create: `src/translate/useOutputTranslation.ts`
- Test: `src/translate/useOutputTranslation.test.tsx`

- [ ] **Step 1: Failing tests.** Use `renderHook` from `@testing-library/react`
  (already a dev dep; follow `useNaturalLanguage.test.tsx` for act/waitFor
  idioms). The corpus comes from `corpusFor`, which is data-keyed — so register
  a test corpus by building ViewStates against `ZORK1_SIG` and TEMPORARILY
  authoring one real entry? **No** — keep the hook testable by injecting:
  give the hook an optional `corpusOverride` arg used only by tests.

```tsx
// src/translate/useOutputTranslation.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useOutputTranslation } from './useOutputTranslation'
import { EngineGate } from '../llm/engineGate'
import { FakeLlmEngine } from '../llm/engine.fake'
import { cacheGet, cacheSet } from './fallbackCache'
import { readMisses } from './missLog'
import type { ViewState, BufferLine } from '../glkote-react/types'
import type { TranslationCorpus } from './types'
import type { NlLanguage } from '../llm/types'

const corpus: TranslationCorpus = {
  strings: { 'Taken.': 'Pris.', 'West of House': "À l'ouest de la maison" },
  objects: {},
  templates: [],
}

let nextId = 1
function line(kind: BufferLine['kind'], text: string): BufferLine {
  return { id: nextId++, kind, text }
}
function view(lines: BufferLine[], status = { location: 'West of House', right: 'Score: 0   Moves: 1' }): ViewState {
  return { status, lines, inputRequest: 'line', ended: false, nextId }
}

function setup(opts: {
  language?: NlLanguage
  engine?: FakeLlmEngine
  initial: ViewState
}) {
  const engine = opts.engine ?? new FakeLlmEngine({ default: 'fallback-fr' })
  const gate = new EngineGate()
  const r = renderHook(
    ({ v, lang }: { v: ViewState; lang: NlLanguage }) =>
      useOutputTranslation({
        view: v,
        language: lang,
        signature: 'test-sig',
        engine,
        gate,
        corpusOverride: corpus,
      }),
    { initialProps: { v: opts.initial, lang: opts.language ?? 'fr' } },
  )
  return { ...r, engine, gate }
}

beforeEach(() => {
  nextId = 1
  localStorage.clear()
})

describe('passthrough (spec §3)', () => {
  it('en/off return the ViewState untouched', () => {
    const v = view([line('output', 'Taken.')])
    const { result } = setup({ language: 'off', initial: v })
    expect(result.current.lines).toBe(v.lines)
    expect(result.current.status).toBe(v.status)
  })
})

describe('sync table hits (spec §3/§5)', () => {
  it('translates output and room lines; input/nl-source never reach the matcher', () => {
    const v = view([
      line('room', 'West of House'),
      line('output', 'Taken.'),
      line('input', 'Taken.'), // same text, but an echoed command — untouched
      line('nl-source', 'Taken.'),
    ])
    const { result } = setup({ initial: v })
    expect(result.current.lines.map(l => l.text)).toEqual([
      "À l'ouest de la maison",
      'Pris.',
      'Taken.',
      'Taken.',
    ])
  })
  it('re-applies leading indent (spec §4)', () => {
    const v = view([line('output', '  Taken.')])
    const { result } = setup({ initial: v })
    expect(result.current.lines[0].text).toBe('  Pris.')
  })
  it('translates the status line', () => {
    const { result } = setup({ initial: view([]) })
    expect(result.current.status).toEqual({
      location: "À l'ouest de la maison",
      right: 'Score : 0  Coups : 0', // NOTE: moves is 1 in the fixture — assert the real value:
    })
  })
})

describe('LLM fallback on live misses (spec §6)', () => {
  it('shimmer → resolved → cached', async () => {
    const engine = new FakeLlmEngine({ default: 'Une ligne inconnue.' })
    await engine.load(() => {}, new AbortController().signal)
    const v0 = view([]) // activation with empty transcript: nothing is backlog
    const { result, rerender } = setup({ engine, initial: v0 })
    const v1 = view([line('output', 'An unknown line.')])
    rerender({ v: v1, lang: 'fr' })
    expect(result.current.lines[0].pending).toBe(true)
    expect(result.current.lines[0].text).toBe('…traduction')
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Une ligne inconnue.'),
    )
    expect(result.current.lines[0].pending).toBeUndefined()
    expect(await cacheGet('test-sig', 'fr', 'An unknown line.')).toBe(
      'Une ligne inconnue.',
    )
    // still a corpus gap → logged
    expect(readMisses().some(m => m.en === 'An unknown line.')).toBe(true)
  })

  it('cache hit resolves without generating', async () => {
    await cacheSet('test-sig', 'fr', 'An unknown line.', 'Depuis le cache.')
    const engine = new FakeLlmEngine({})
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({ engine, initial: view([]) })
    rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Depuis le cache.'),
    )
    expect(engine.generateCalls).toBe(0)
  })

  it('engine not loaded → English shown, miss logged, nothing generated (spec §6 failure)', async () => {
    const engine = new FakeLlmEngine({}) // never loaded
    const { result, rerender } = setup({ engine, initial: view([]) })
    rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
    await waitFor(() =>
      expect(readMisses().some(m => m.en === 'An unknown line.')).toBe(true),
    )
    expect(result.current.lines[0].text).toBe('An unknown line.')
    expect(result.current.lines[0].pending).toBeUndefined()
    expect(engine.generateCalls).toBe(0)
  })

  it('generation failure → English, logged', async () => {
    const engine = new FakeLlmEngine({ failGenerate: true })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({ engine, initial: view([]) })
    rerender({ v: view([line('output', 'An unknown line.')]), lang: 'fr' })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('An unknown line.'),
    )
    expect(readMisses().length).toBeGreaterThan(0)
  })
})

describe('backlog rule (spec §3: matcher + CACHE hits only)', () => {
  it('backlog lines: table and cache hits apply; uncached misses stay English; nothing generates', async () => {
    const engine = new FakeLlmEngine({ default: 'should-not-appear' })
    await engine.load(() => {}, new AbortController().signal)
    // A fallback translation cached in a PREVIOUS session must survive a
    // restore rebuild (spec §6: each miss costs once per device, ever).
    await cacheSet('test-sig', 'fr', 'Cached old line.', 'Vieille ligne en cache.')
    const v = view([
      line('output', 'Old unknown line.'),
      line('output', 'Cached old line.'),
      line('output', 'Taken.'),
    ])
    const { result, rerender } = setup({ engine, initial: v })
    // table hit still applies to backlog; misses render English immediately
    expect(result.current.lines.map(l => l.text)).toEqual([
      'Old unknown line.',
      'Cached old line.',
      'Pris.',
    ])
    // the cached backlog miss resolves async — no shimmer, no generation
    await waitFor(() =>
      expect(result.current.lines[1].text).toBe('Vieille ligne en cache.'),
    )
    expect(result.current.lines[0].text).toBe('Old unknown line.')
    expect(engine.generateCalls).toBe(0)
    // and a LIVE line appended later still falls back
    rerender({
      v: view([...v.lines, line('output', 'New unknown line.')]),
      lang: 'fr',
    })
    await waitFor(() =>
      expect(
        result.current.lines.find(l => l.text === 'should-not-appear'),
      ).toBeTruthy(),
    )
    expect(engine.generateCalls).toBe(1) // only the live line generated
    expect(readMisses().some(m => m.kind === 'backlog')).toBe(true)
  })
})

describe('queue abandonment (spec §3/§6)', () => {
  it('a switch to off abandons QUEUED generations — they never run, not just never render', async () => {
    const engine = new FakeLlmEngine({ default: 'jamais rendu' })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender, gate } = setup({ engine, initial: view([]) })
    // Hold the gate so the live miss's generation QUEUES behind it.
    let release!: () => void
    const held = gate.run('output', () => new Promise<void>(r => (release = r)))
    const l = line('output', 'An unknown line.')
    rerender({ v: view([l]), lang: 'fr' })
    await waitFor(() => expect(result.current.lines[0].pending).toBe(true))
    rerender({ v: view([l]), lang: 'off' }) // epoch bumps; queued task must bail
    await act(async () => {
      release()
      await held
    })
    expect(engine.generateCalls).toBe(0) // the queued generation never started
    expect(result.current.lines[0].text).toBe('An unknown line.') // passthrough
  })
})

describe('append-merge memoization (spec §3)', () => {
  it('a line whose text changes re-translates (memo keyed on text, not id)', async () => {
    const engine = new FakeLlmEngine({
      completions: {
        'Partial line': 'Ligne partielle',
        'Partial line, now complete.': 'Ligne complète.',
      },
    })
    await engine.load(() => {}, new AbortController().signal)
    const { result, rerender } = setup({ engine, initial: view([]) })
    const l = line('output', 'Partial line')
    rerender({ v: view([l]), lang: 'fr' })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Ligne partielle'),
    )
    rerender({
      v: view([{ ...l, text: 'Partial line, now complete.' }]),
      lang: 'fr',
    })
    await waitFor(() =>
      expect(result.current.lines[0].text).toBe('Ligne complète.'),
    )
  })
})
```

Fix the status assertion to the fixture's real moves value (`Score : 0  Coups : 1`)
when writing the file — the note above is deliberate so you check it.

The fake engine's `generate` ignores the prompt-shape difference; `completions`
are keyed on the last user message, which for the fallback is the raw English
line — that is why the completions map above keys on plain lines.

- [ ] **Step 2: Run / verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/translate/useOutputTranslation.ts
// Output translation as a display overlay (spec §3). English ViewState in;
// DisplayLines + translated status out. Sync path: exact/template matcher.
// Async path (live misses only): IndexedDB cache → gate-queued LLM fallback
// (output priority — input preempts, spec §6) → English on failure. Lines
// present at corpus activation (language switch / restore rebuild) are
// BACKLOG: matcher + CACHE hits only (spec §3) — no shimmer, no generation;
// an uncached backlog miss stays English and is logged (kind 'backlog').
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BufferLine, StatusLine, ViewState } from '../glkote-react/types'
import type { LlmEngine, NlLanguage } from '../llm/types'
import type { LexLang } from '../llm/lexicon/types'
import { EngineGate } from '../llm/engineGate'
import type { TranslationCorpus } from './types'
import { corpusFor } from './corpus/index'
import { compileCorpus, matchLine, type CompiledCorpus } from './match'
import { normalize, splitIndent } from './normalize'
import { translateStatus } from './statusTranslate'
import { cacheGet, cacheSet } from './fallbackCache'
import { installMissDump, logMiss } from './missLog'
import { shimmerLabel, xlPrompt } from './xlPrompt'

export interface DisplayLine extends BufferLine {
  /** True while the LLM fallback is in flight (renders the shimmer). */
  pending?: boolean
}

export interface OutputTranslation {
  lines: DisplayLine[]
  status: StatusLine | null
}

/** Output generations run longer than command translations; bounded so a
 * wedged engine degrades to English instead of shimmering forever (spec §6). */
const XLATE_WATCHDOG_MS = 15_000

type Resolution = string | 'pending' | 'english'

export function useOutputTranslation(args: {
  view: ViewState
  language: NlLanguage
  signature: string
  engine: LlmEngine
  gate: EngineGate
  /** Tests inject a corpus directly; production resolves via corpusFor. */
  corpusOverride?: TranslationCorpus
}): OutputTranslation {
  const { view, language, signature, engine, gate, corpusOverride } = args

  const lang: LexLang | null =
    language === 'fr' || language === 'de' || language === 'es' ? language : null
  const corpus: CompiledCorpus | null = useMemo(() => {
    if (lang === null) return null
    const c = corpusOverride ?? corpusFor(signature, lang)
    return c ? compileCorpus(c) : null
  }, [lang, signature, corpusOverride])

  // Fallback resolutions for LIVE misses, keyed by line id.
  const [overlay, setOverlay] = useState<ReadonlyMap<number, Resolution>>(
    () => new Map(),
  )
  // The EN text each overlay/in-flight entry was computed from — an append
  // merge changes the text and must invalidate the entry (spec §3).
  const basisRef = useRef<Map<number, string>>(new Map())
  // Ids on screen when the corpus ACTIVATED (language picked / restore
  // rebuild): the backlog (spec §3). Misses there stay English.
  const backlogRef = useRef<Set<number>>(new Set())
  const loggedBacklogRef = useRef<Set<number>>(new Set())
  const lastStatusMissRef = useRef<string | null>(null)
  // Stale-async guard: bumped on corpus identity change.
  const epochRef = useRef(0)

  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    installMissDump()
  }, [])

  // Corpus (re)activation: snapshot the backlog, reset all per-corpus state.
  useEffect(() => {
    epochRef.current++
    backlogRef.current = new Set(viewRef.current.lines.map(l => l.id))
    loggedBacklogRef.current = new Set()
    basisRef.current = new Map()
    lastStatusMissRef.current = null
    setOverlay(new Map())
  }, [corpus])

  // Async fallback for live misses (and miss logging for backlog/status).
  useEffect(() => {
    if (!corpus || lang === null) return
    const epoch = epochRef.current
    // Turn context for the miss log (spec §6): the status line at miss time.
    const ctx = view.status
      ? normalize(`${view.status.location} — ${view.status.right}`)
      : undefined

    const settle = (id: number, en: string, value: Resolution) => {
      if (epochRef.current !== epoch) return // language/story switched mid-flight
      if (basisRef.current.get(id) !== en) return // append merge superseded us
      setOverlay(prev => new Map(prev).set(id, value))
    }

    const resolve = async (id: number, en: string) => {
      try {
        const cached = await cacheGet(signature, lang, en)
        if (cached !== undefined) {
          settle(id, en, cached)
          return
        }
        logMiss({ en, game: signature, language: lang, kind: 'line', ctx })
        if (!engine.isLoaded()) {
          // Spec §6 failure path: model absent/still loading → English now.
          settle(id, en, 'english')
          return
        }
        const text = await gate.run('output', async () => {
          // Queued generations ABANDON on a language/story switch (spec §3/§6):
          // the epoch moved on while we waited for the gate — don't burn GPU
          // on a result nobody will render. (The throw lands in the outer
          // catch; settle() there is an epoch-guarded no-op.)
          if (epochRef.current !== epoch) throw new Error('xlate abandoned')
          const ac = new AbortController()
          let watchdogId: ReturnType<typeof setTimeout>
          const watchdog = new Promise<never>((_, rej) => {
            watchdogId = setTimeout(() => {
              rej(new Error('xlate watchdog'))
              ac.abort()
            }, XLATE_WATCHDOG_MS)
          })
          try {
            return await Promise.race([
              engine.generate(xlPrompt(en, lang), null, ac.signal),
              watchdog,
            ])
          } finally {
            clearTimeout(watchdogId!)
          }
        })
        const out = normalize(text)
        if (out === '') throw new Error('empty translation')
        settle(id, en, out)
        await cacheSet(signature, lang, en, out)
      } catch {
        settle(id, en, 'english')
      }
    }

    for (const l of view.lines) {
      if (l.kind !== 'output' && l.kind !== 'room') continue
      const en = normalize(splitIndent(l.text).body)
      if (en === '') continue
      if (matchLine(corpus, en) !== null) continue
      if (backlogRef.current.has(l.id)) {
        if (!loggedBacklogRef.current.has(l.id)) {
          loggedBacklogRef.current.add(l.id)
          logMiss({ en, game: signature, language: lang, kind: 'backlog', ctx })
          // Backlog rule (spec §3): matcher + CACHE hits only. A fallback
          // translation cached in an earlier session still applies after a
          // restore rebuild — no shimmer, no generation either way.
          basisRef.current.set(l.id, en)
          void cacheGet(signature, lang, en).then(cached => {
            if (cached !== undefined) settle(l.id, en, cached)
          })
        }
        continue
      }
      if (basisRef.current.get(l.id) === en) continue // already handled this text
      basisRef.current.set(l.id, en)
      setOverlay(prev => new Map(prev).set(l.id, 'pending'))
      void resolve(l.id, en)
    }

    // Status-bar room/right misses: English fallback, logged once per value.
    if (view.status) {
      const { miss } = translateStatus(view.status, corpus, lang)
      if (miss !== null && miss !== lastStatusMissRef.current) {
        lastStatusMissRef.current = miss
        logMiss({ en: miss, game: signature, language: lang, kind: 'status' })
      }
    }
  }, [view, corpus, lang, signature, engine, gate])

  const lines: DisplayLine[] = useMemo(() => {
    if (!corpus || lang === null) return view.lines
    return view.lines.map(l => {
      if (l.kind !== 'output' && l.kind !== 'room') return l
      const { indent, body } = splitIndent(l.text)
      const en = normalize(body)
      if (en === '') return l
      const hit = matchLine(corpus, en)
      if (hit !== null) return { ...l, text: indent + hit }
      const o = overlay.get(l.id)
      if (o === 'pending')
        return { ...l, text: indent + shimmerLabel(lang), pending: true }
      if (o !== undefined && o !== 'english') return { ...l, text: indent + o }
      return l // backlog miss or failure → English
    })
  }, [view.lines, corpus, overlay, lang])

  const status: StatusLine | null = useMemo(() => {
    if (!corpus || lang === null || view.status === null) return view.status
    return translateStatus(view.status, corpus, lang).status
  }, [view.status, corpus, lang])

  return { lines, status }
}
```

- [ ] **Step 4: Run / verify PASS** (`npx vitest run src/translate/useOutputTranslation.test.tsx`).
  Common failures: the effect-ordering of the backlog snapshot (the view-sync
  effect MUST be declared before the corpus-activation effect, as above);
  `waitFor` needing `act` — follow the existing NL test idioms.
- [ ] **Step 5: Run the full suite + typecheck.** `make test && make typecheck`
- [ ] **Step 6: Commit** — `feat(translate): useOutputTranslation overlay hook (backlog rule, gated fallback)`

---

### Task 11: UI integration — Terminal, Scrollback, status bar, shimmer CSS

**Files:**
- Modify: `src/ui/Terminal.tsx`
- Modify: `src/ui/Scrollback.tsx`
- Modify: `src/ui/components.css`
- Test: `src/ui/Terminal.test.tsx` (extend), `src/ui/Scrollback.test.tsx` (extend)

- [ ] **Step 1: Failing test** — extend `Scrollback.test.tsx`:

```tsx
it('renders the shimmer style on pending lines (output-translation spec §6)', () => {
  render(
    <Scrollback
      lines={[{ id: 1, kind: 'output', text: '…traduction', pending: true }]}
    />,
  )
  const p = screen.getByText('…traduction')
  expect(p.closest('p')!.className).toContain('xl-pending')
})
```

- [ ] **Step 2: Run / verify FAIL** (prop type rejects `pending`).

- [ ] **Step 3: Implement.** `Scrollback.tsx`: change the prop type to
  `lines: DisplayLine[]` (import `type { DisplayLine } from '../translate/useOutputTranslation'`;
  `DisplayLine` extends `BufferLine`, so all existing callers/tests stay valid)
  and append the class:

```tsx
          className={
            (l.kind === 'room'
              ? 'room'
              : l.kind === 'input'
                ? 'echo'
                : l.kind === 'nl-source'
                  ? 'nl-source'
                  : '') + (l.pending ? ' xl-pending' : '')
          }
```

  `components.css` (next to the existing `.nl-*` styles):

```css
/* Output-translation shimmer: a missed line pending its LLM fallback. */
.xl-pending {
  font-style: italic;
  animation: xl-shimmer 1.1s ease-in-out infinite alternate;
}
@keyframes xl-shimmer {
  from { opacity: 0.35; }
  to { opacity: 0.8; }
}
```

  `Terminal.tsx`: derive the language and wire the hook (after the `nl` hook):

```tsx
  // Output translation (display overlay — spec §3): same language the input
  // layer is set to; passthrough for en/off.
  const xl = useOutputTranslation({
    view,
    language: nl.state.phase === 'on' ? nl.state.language : 'off',
    signature,
    engine: llmEngine,
    gate,
  })
```

  (import `useOutputTranslation` from `../translate/useOutputTranslation`)
  and swap the render seams: `<StatusBar status={xl.status} …>` and
  `<Scrollback lines={xl.lines} …>`.

- [ ] **Step 4: Extend `Terminal.test.tsx`** with one integration assertion
  following that file's existing boot/fixture pattern: with NL off (default),
  the transcript renders the English fixture text unchanged (passthrough is the
  default path — this pins that wiring the hook breaks nothing).

- [ ] **Step 5: Full suite + typecheck + lint.** `make all`
- [ ] **Step 6: Commit** — `feat(ui): wire output translation through Terminal/Scrollback/StatusBar`

---

### Task 12: Z-string decoder + extraction CLI

Spec §4 "Extraction". Pure decoder in `scripts/lib/` (vitest runs
`scripts/**/*.test.mjs`); CLI writes the gitignored inventory. The decoder
reads `public/games/zork1.z3` (committed copy) — NEVER write to `zork1/`.

**Files:**
- Create: `scripts/lib/zstrings.mjs`
- Create: `scripts/lib/zstrings.test.mjs`
- Create: `scripts/extract-strings.mjs`
- Modify: `Makefile` (add `extract-strings` target + `.PHONY`)
- Modify: `.gitignore` (add `scripts/out/`)

- [ ] **Step 1: Failing tests**

```js
// scripts/lib/zstrings.test.mjs
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { decodeZString, extractStrings, displayLines } from './zstrings.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const buf = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)
// Extraction over the whole file is a few seconds; do it once.
const lines = displayLines(extractStrings(buf))

describe('z-machine v3 string extraction (spec §4)', () => {
  it('finds well-known full lines', () => {
    expect(lines).toContain('West of House')
    expect(
      lines.some(l => l.includes('You are likely to be eaten by a grue')),
    ).toBe(true)
    expect(lines.some(l => l.includes('ZORK I: The Great Underground Empire'))).toBe(
      true,
    )
  })
  it('every emitted entry is a single normalized display line (no embedded newlines)', () => {
    for (const l of lines) {
      expect(l).not.toContain('\n')
      expect(l).toBe(l.replace(/\s+/g, ' ').trim())
    }
  })
  it('decodeZString returns null on garbage (brute-scan filter contract)', () => {
    expect(decodeZString(new Uint8Array(4).fill(0xff), 0)).not.toBeNull() // end-bit set is *structurally* valid…
    expect(decodeZString(new Uint8Array([0x00, 0x00]), 0)).toBeNull() // …but a never-terminating string is not
  })
})
```

- [ ] **Step 2: Run / verify FAIL.** `npx vitest run scripts/lib/zstrings.test.mjs`

- [ ] **Step 3: Implement the decoder**

```js
// scripts/lib/zstrings.mjs
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
 * Brute-force scan: try a decode at every even offset; keep clean printable
 * text. Z-words are 2-byte aligned, so a start INSIDE a real string decodes
 * its tail — suppress entries that are a suffix of the surrounding span.
 * Residual junk is reviewed into the committed extraction-ignore list (the
 * inventory gate's contract).
 */
export function extractStrings(buf) {
  const kept = []
  let lastSpan = null
  for (let addr = 0x40; addr < buf.length - 1; addr += 2) {
    const r = decodeZString(buf, addr)
    if (r === null) continue
    if (!looksLikeText(r.text)) continue
    if (lastSpan && addr < lastSpan.end && lastSpan.text.endsWith(r.text))
      continue // tail of the string we already kept
    kept.push(r.text)
    if (!lastSpan || r.end > lastSpan.end || addr >= lastSpan.end)
      lastSpan = { end: r.end, text: r.text }
  }
  return [...new Set(kept)]
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
```

- [ ] **Step 4: Run / verify PASS.** If the known-line assertions fail, debug the
  decoder against the spec (shift handling and the abbreviation word-address ×2
  are the usual culprits) — do NOT weaken the assertions.

- [ ] **Step 5: CLI + Makefile + .gitignore**

```js
// scripts/extract-strings.mjs
// Decode the committed Zork I story file's string inventory (output-translation
// spec §4). Output is DERIVED data → scripts/out/ is gitignored. The corpus
// data files in src/translate/corpus/ are the reviewed, committed artifacts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { extractStrings, displayLines } from './lib/zstrings.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const buf = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)
const strings = extractStrings(buf)
const lines = displayLines(strings)
mkdirSync(resolve(repoRoot, 'scripts/out'), { recursive: true })
writeFileSync(
  resolve(repoRoot, 'scripts/out/zork1.strings.json'),
  JSON.stringify({ strings, lines }, null, 2),
)
console.log(`zork1: ${strings.length} strings → ${lines.length} display lines`)
```

  Makefile (add to `.PHONY` and below `extract-vocab`):

```make
extract-strings: ## Decode the Zork I string inventory → scripts/out/zork1.strings.json (derived)
	node scripts/extract-strings.mjs
```

  `.gitignore`: add a `scripts/out/` line.

- [ ] **Step 6: Run it** — `make extract-strings`. Expected: a count on the order
  of several hundred strings / 1000+ display lines. Spot-check the JSON for
  room descriptions and parser responses.
- [ ] **Step 7: Commit** — `feat(scripts): z-machine v3 string extraction (decoder lib + CLI)`

---### Task 13: Seeded walkthrough capture + committed fixture

Spec §7.3 capture workstream. ifvms rolls all randomness through `Math.random`
(`ifvms.js/src/zvm/runtime.js`) — patch it in the Node harness (NEVER edit the
vendored dir). The fixture (raw GlkOte updates) is committed; CI never replays.

**Files:**
- Create: `scripts/capture-walkthrough.mjs`
- Create: `scripts/walkthrough/zork1.txt`
- Create: `src/test/zork1.walkthrough.en.json` (generated by the script)
- Modify: `Makefile`

- [ ] **Step 1: Write the capture script.** Reuse the wiring of
  `scripts/capture-protocol.mjs` verbatim for: `requireAsCjs`, the DOM stubs,
  the `GiDispa.init` shim, boot, and the `send`/`pending`/`lastUpdate` driver
  helpers. New parts:

```js
// scripts/capture-walkthrough.mjs
// Seeded full-game walkthrough capture (output-translation spec §7.3).
// Deterministic: Math.random is replaced with mulberry32(seed) BEFORE boot, so
// troll/thief combat replays identically for a given seed. Iterate
// --seed/script until the win assertion passes, then commit the fixture; the
// coverage gate (CI) runs the matcher over the FIXTURE — no replay, no RNG.
//
// Usage: node scripts/capture-walkthrough.mjs [--seed N] [--verbose]

// …(harness wiring copied from capture-protocol.mjs: requireAsCjs, DOM stubs,
//   ifvms + glkapi requires, LoggingGlkOte, GiDispa shim, boot)…

const seedArg = process.argv.indexOf('--seed')
const seed = seedArg >= 0 ? Number(process.argv[seedArg + 1]) : 1
const verbose = process.argv.includes('--verbose')

function mulberry32(s) {
  return function () {
    let t = (s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
Math.random = mulberry32(seed) // BEFORE Glk.init/vm.prepare

// …boot exactly as capture-protocol.mjs…

const script = readFileSync(
  resolve(repoRoot, 'scripts/walkthrough/zork1.txt'),
  'utf8',
)
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))

for (const cmd of script) {
  if (!send(cmd)) {
    console.error(`no pending input request before: "${cmd}"`)
    process.exit(1)
  }
  if (verbose) {
    // print the text content of the last update for script debugging
    const u = lastUpdate()
    for (const c of u.content ?? [])
      for (const p of c.text ?? [])
        if (p.content) console.log(p.content.filter((_, i) => i % 2 === 1).join(''))
  }
}

const transcript = JSON.stringify(captured.updates)
if (!transcript.includes('Inside the Barrow')) {
  console.error(
    `walkthrough did NOT reach the win (seed ${seed}). ` +
      `Re-run with --verbose, fix the script or try another seed.`,
  )
  process.exit(1)
}
writeFileSync(
  resolve(repoRoot, 'src/test/zork1.walkthrough.en.json'),
  JSON.stringify(captured.updates),
)
console.log(
  `OK seed=${seed}: ${script.length} commands, ${captured.updates.length} updates → src/test/zork1.walkthrough.en.json`,
)
```

- [ ] **Step 2: Author `scripts/walkthrough/zork1.txt`.** Start from this
  complete classic route (sections commented). **This file is a starting
  point — the deterministic run WILL need iteration** (combat length, thief
  movements): run with `--verbose`, read where it derails, insert repeated
  attack commands / `wait` / `again` lines or try another `--seed`. The win
  assertion is the test; the task is done when it passes. The route must
  collect all 19 treasures (350 points) and enter the barrow:

```
# --- Above ground: egg, house, lamp ---
north
north
climb tree
take egg
climb down
south
east
open window
enter window
west
take lamp
move rug
open trap door
turn on lamp
open trophy case
down
# --- Cellar, troll (combat: may need more/fewer swings per seed) ---
north
kill troll with sword
kill troll with sword
kill troll with sword
# --- Maze: coins, key; give the thief nothing yet ---
west
west
west
up
take coins
take key
southwest
east
south
southeast
# --- Cyclops & thief: deposit egg with the thief (he opens it) ---
odysseus
# (cyclops flees through the wall; the living room is now east)
up
give egg to thief
kill thief with knife
kill thief with knife
kill thief with knife
take egg
take canary
take chalice
down
east
east
# --- Back in living room: deposit round 1 ---
put egg in case
put canary in case
put chalice in case
put coins in case
# --- Gallery & studio: painting up the chimney ---
open trap door
down
north
east
take painting
north
up
up
put painting in case
# (chimney exits to the kitchen; key/lamp management per run)
...
# --- Continue: dam/reservoir (trunk, trident), Hades (skull),
#     Loud Room echo (bar), coal mine via bat/basket (diamond, torch, jade,
#     bracelet, coal → machine → diamond), Atlantis, temple (coffin, sceptre),
#     rainbow (pot of gold), boat trip (buoy → emerald, scarab, shovel/sand →
#     statue? no — beach: scarab), thief already dead, deposit everything,
#     take map from case area, west of house, sw to stone barrow, enter barrow
...
west
west
sw
enter barrow
```

  The `...` sections above are deliberately summarized HERE because the full
  ~200-command mid-game route must be debugged live against the seeded VM —
  authoring it blind in this plan would be false precision. Expand them
  command-by-command during execution using any canonical Zork I walkthrough
  as reference, verifying section by section with `--verbose`. **The
  completion criterion is executable:** the script exits 0 only on
  "Inside the Barrow".

- [ ] **Step 3: Makefile target**

```make
capture-walkthrough: ## Re-capture the seeded Zork I walkthrough fixture (committed)
	node scripts/capture-walkthrough.mjs --seed 1
```

  (add to `.PHONY`; if a different seed wins, bake it into the target).

- [ ] **Step 4: Run until green** — `make capture-walkthrough` exits 0 and writes
  the fixture. Sanity-check fixture size (hundreds of KB) and that
  `git status` shows only intended files.

- [ ] **Step 5: Fixture smoke test** — add to a new `src/translate/corpus/coverage.test.ts`
  ONLY the loading smoke (the zero-miss assertion lands in Task 17 once the
  corpus exists; a permanently-red gate mid-branch would block per-task commits):

```ts
// src/translate/corpus/coverage.test.ts
import { describe, it, expect } from 'vitest'
import updates from '../../test/zork1.walkthrough.en.json'
import { reduce } from '../../glkote-react/reduce'
import { emptyView } from '../../glkote-react/types'
import type { GlkOteUpdate, ViewState } from '../../glkote-react/types'

export function walkthroughLines(): ViewState['lines'] {
  let v = emptyView
  for (const u of updates as unknown as GlkOteUpdate[]) v = reduce(v, u)
  return v.lines
}

describe('walkthrough fixture (spec §7.3)', () => {
  it('replays through the reducer to a full winning transcript', () => {
    const lines = walkthroughLines()
    expect(lines.length).toBeGreaterThan(500)
    expect(lines.some(l => l.text.includes('Inside the Barrow'))).toBe(true)
    expect(lines.some(l => l.text.includes('West of House'))).toBe(true)
  })
})
```

  (`resolveJsonModule` is on in typical Vite tsconfigs — if the JSON import
  trips typecheck, read it with `readFileSync` + `JSON.parse` instead.)

- [ ] **Step 6: Full suite, commit** — `feat(test): seeded Zork I walkthrough capture + committed fixture`

---

### Task 14: Author `zork1.fr.objects.ts` + the lexicon round-trip gate

Spec §4.2 + §7.5. The gate goes in FIRST (red), then the data makes it green.

**Files:**
- Create: `src/translate/corpus/roundtrip.test.ts`
- Modify: `src/translate/corpus/zork1.fr.objects.ts`
- Possibly modify: `src/llm/lexicon/fr.zork1.ts` (ADDING surface phrases the
  display vocabulary introduces — additions must keep that file's own
  validation suite green)

- [ ] **Step 1: Write the gate**

```ts
// src/translate/corpus/roundtrip.test.ts
// Lexicon round-trip gate (spec §7.5): the player types what they read, so
// every French form in the objects table must resolve through the FR input
// lexicon to the same canonical — display and input vocabularies must not
// drift, at authoring time or during UAT hand-fixes.
import { describe, it, expect } from 'vitest'
import { FR_ZORK1 } from '../../llm/lexicon/fr.zork1'
import { FR_CORE } from '../../llm/lexicon/fr.core'
import { fold } from '../../llm/lexicon/fold'
import { ZORK1_FR_OBJECTS, ZORK1_FR_CANONICAL } from './zork1.fr.objects'

// Articles/partitives to strip at the phrase head (fold() already split
// elisions: "l'œuf" → "l oeuf").
const HEAD = new Set([...FR_CORE.articles, 'de', 'd'])

function stripHead(folded: string): string {
  const toks = folded.split(' ')
  while (toks.length > 1 && HEAD.has(toks[0])) toks.shift()
  return toks.join(' ')
}

describe('objects table ↔ FR input lexicon round-trip (spec §7.5)', () => {
  it('every form of every object resolves to its canonical', () => {
    const failures: string[] = []
    for (const [en, forms] of Object.entries(ZORK1_FR_OBJECTS)) {
      const canonical = ZORK1_FR_CANONICAL[en] ?? en
      const lex = FR_ZORK1[canonical]
      if (!lex) {
        failures.push(`"${en}": no FR_ZORK1 entry for canonical "${canonical}"`)
        continue
      }
      for (const [key, form] of Object.entries(forms)) {
        const phrase = stripHead(fold(form))
        if (!lex.includes(phrase))
          failures.push(
            `"${en}".${key} = "${form}" → "${phrase}" missing from FR_ZORK1["${canonical}"]`,
          )
      }
    }
    expect(failures).toEqual([])
  })
  it('a populated table (guards against the gate passing vacuously)', () => {
    expect(Object.keys(ZORK1_FR_OBJECTS).length).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 2: Run / verify FAIL** (vacuous-population assertion is red).

- [ ] **Step 3: Author the data.** Source of names: every canonical in
  `FR_ZORK1` (src/llm/lexicon/fr.zork1.ts — ~150 entries) — plus printed-name
  variants found in `scripts/out/zork1.strings.json` (run `make extract-strings`).
  Authoring rules (also add as a header comment in the data file):
  - **Base noun phrase = the lexicon's primary surface form** (first entry of
    `FR_ZORK1[canonical]`), articles composed on top. If the natural displayed
    phrase isn't in the lexicon yet, ADD it to `FR_ZORK1` (keeping that file's
    own validation tests green) — that is the alignment working as intended.
  - French form keys: `indef` («une bouteille en verre»), `def` («la bouteille
    en verre» — pre-compose elision: «l'œuf»), `bare` («bouteille en verre»).
    Gender lives in the data; never write grammar code.
  - Vowel-initial words: `indef: "un œuf"`, `def: "l'œuf"` — the pre-composed
    string IS the elision mechanism.
  - Where printed name ≠ canonical (check against the extraction inventory),
    add a `ZORK1_FR_CANONICAL` mapping.
  Sample entries to anchor style:

```ts
export const ZORK1_FR_OBJECTS: ObjectsTable = {
  'glass bottle': {
    indef: 'une bouteille en verre',
    def: 'la bouteille en verre',
    bare: 'bouteille en verre',
  },
  'brass lantern': {
    indef: 'une lampe en laiton',
    def: 'la lampe en laiton',
    bare: 'lampe en laiton',
  },
  'jewel-encrusted egg': {
    indef: 'un œuf incrusté de joyaux',
    def: "l'œuf incrusté de joyaux",
    bare: 'œuf incrusté de joyaux',
  },
  // …every FR_ZORK1 canonical…
}
```

- [ ] **Step 4: Iterate until the gate is green.** Read each failure: either fix
  the form, or add the surface phrase to `FR_ZORK1` (then re-run the lexicon
  suite too: `npx vitest run src/llm/lexicon`).
- [ ] **Step 5: Full suite, commit** — `feat(corpus): Zork I French object forms + lexicon round-trip gate`

---

### Task 15: Author `zork1.fr.templates.ts`

Spec §4.3. Driven by the parser-response strings in the extraction inventory
and `zork1/gverbs.zil` (READ-ONLY reference for which lines compose object
names at runtime).

**Files:**
- Modify: `src/translate/corpus/zork1.fr.templates.ts`
- Test: extend `src/translate/match.test.ts` with a handful of REAL-corpus
  smoke assertions (import `ZORK1_FR` + `compileCorpus`, assert e.g.
  `matchLine(real, 'I don\'t know the word "xyzzy".')` is non-null).

- [ ] **Step 1: Write the smoke test (red).**
- [ ] **Step 2: Author the templates.** Starter set (verify each EN side
  byte-for-byte against the extraction inventory / gverbs.zil before
  committing; fix wording where the game differs):

```ts
export const ZORK1_FR_TEMPLATES: readonly Template[] = [
  // Parser feedback quoting the player's own token ({raw} — spec §4.3):
  { en: 'I don\'t know the word "{raw}".', out: 'Je ne connais pas le mot "{raw}".' },
  { en: 'You used the word "{raw}" in a way that I don\'t understand.',
    out: 'Vous utilisez le mot "{raw}" d\'une manière que je ne comprends pas.' },
  // Object presence/absence (gender-neutral phrasings preferred — a gendered
  // predicate adjective can't compose; pin those as full lines instead):
  { en: "You can't see any {obj} here!", out: 'Vous ne voyez pas de {obj.bare} ici !' },
  { en: 'There is a {obj} here.', out: 'Il y a {obj.indef} ici.' },
  { en: 'The {obj} contains:', out: '{obj.def} contient :' },
  { en: 'Taken.', out: 'Pris.' }, // full lines belong in strings — this is ILLUSTRATIVE of what NOT to put here; delete
  // take/drop/put family:
  { en: 'You already have the {obj}.', out: 'Vous avez déjà {obj.def}.' },
  { en: "You're not carrying the {obj}.", out: 'Vous ne portez pas {obj.def}.' },
  // score line (signed {num} — spec §4.3):
  { en: 'Your score is {num} (total of 350 points), in {num2} moves.',
    out: 'Votre score est de {num} (sur un total de 350 points), en {num2} déplacements.' },
  // listing suffixes:
  { en: 'A {obj} (providing light)', out: '{obj.indef} (allumée)', cap: true },
  // …grow from the coverage/inventory gates' misses…
]
```

  Authoring rules (header comment in the file): every EN side must be the
  EXACT normalized game line shape; prefer gender-neutral French ("pas de
  {obj.bare}") over gendered predicates; if a pattern needs gender agreement
  outside the noun phrase, pin the affected lines per-object in the strings
  table instead (spec §5 escape hatch). Expected eventual size ~50–150.

- [ ] **Step 3: Green, full suite, commit** — `feat(corpus): Zork I French composing templates`

---

### Task 16: Author `zork1.fr.strings.ts` — walkthrough-driven

The big data task. The coverage gate's zero-miss assertion (Task 17) is the
finish line; author in review-sized slices, committing per slice.

**Files:**
- Modify: `src/translate/corpus/zork1.fr.strings.ts` (several commits)
- Tooling: a temporary miss report — add to `coverage.test.ts`:

```ts
it('reports walkthrough misses (authoring aid — replaced by the strict gate)', () => {
  const c = compileCorpus(ZORK1_FR)
  const misses = new Set<string>()
  for (const l of walkthroughLines()) {
    if (l.kind !== 'output' && l.kind !== 'room') continue
    const en = normalize(splitIndent(l.text).body)
    if (en && en !== '>' && matchLine(c, en) === null) misses.add(en)
  }
  console.log(`[corpus] walkthrough misses: ${misses.size}`)
  for (const m of [...misses].slice(0, 40)) console.log('  MISS:', m)
  expect(misses.size).toBeGreaterThanOrEqual(0) // report-only while authoring
})
```

- [ ] **Step 1: Run the report**, slice the misses, and author in this order
  (one commit each):
  1. **Room titles + descriptions** (~110 rooms; titles are also the status-bar
     lookup, spec §5): `'West of House': "À l'ouest de la maison"`, plus each
     room's long description line(s).
  2. **The banner block** (per-line entries: the ZORK I title line, copyright,
     serial — translate the title line as « ZORK I : Le Grand Empire
     Souterrain », keep serial/version lines verbatim if untranslatable).
  3. **Common responses**: Taken. → Pris. / Dropped. → Posé. / Opened. /
     Closed. / Done. → Fait. / "It is pitch black. You are likely to be eaten
     by a grue." etc.
  4. **Death/diagnose/combat lines** the walkthrough hits (combat lines vary
     by seed — cover what the fixture contains; the rest is Task 17's
     inventory slice).
  5. **Irregular compositions pinned as full lines** (spec §5 escape hatch):
     « De l'eau » for "A quantity of water", gendered predicates per object, …
  Translation quality rules (header comment): formal **vous** throughout;
  preserve trailing punctuation and sentence count; French double-punctuation
  spacing (« ici ! ») is the corpus style; proper nouns (Zork, Frobozz, grue →
  « grue ») stay; keys must be byte-exact normalized EN (copy them from the
  miss report, never retype).
- [ ] **Step 2: Iterate until the report prints `walkthrough misses: 0`.**
- [ ] **Step 3: Full suite green; final slice commit** —
  `feat(corpus): Zork I French strings — walkthrough corpus complete`

---

### Task 17: Flip the strict gates — coverage (zero misses) + inventory

**Files:**
- Modify: `src/translate/corpus/coverage.test.ts` (report → strict assert)
- Create: `src/translate/corpus/zork1.extraction-ignore.ts`
- Create: `src/translate/corpus/inventory.test.ts`

- [ ] **Step 1: Strict coverage gate** — replace the report test:

```ts
it('ZERO misses on the golden path — "instant is required" as a test (spec §7.3)', () => {
  const c = compileCorpus(ZORK1_FR)
  const misses = new Set<string>()
  for (const l of walkthroughLines()) {
    if (l.kind !== 'output' && l.kind !== 'room') continue
    const en = normalize(splitIndent(l.text).body)
    if (en && en !== '>' && matchLine(c, en) === null) misses.add(en)
  }
  expect([...misses]).toEqual([])
})
```

- [ ] **Step 2: Inventory gate** (spec §7.4 — the cheap second net):

```ts
// src/translate/corpus/inventory.test.ts
// Inventory gate (spec §7.4): every line-shaped entry in the decoded string
// inventory must match the corpus. Catches drift on lines the golden path
// never visits (death messages, off-path responses). Composition fragments
// (mid-sentence TELL pieces) are not full lines — they're excluded by shape,
// and reviewed stragglers live in the committed ignore list.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
// eslint-disable-next-line — untyped .mjs shared lib (decoder)
import { extractStrings, displayLines } from '../../../scripts/lib/zstrings.mjs'
import { compileCorpus, matchLine } from '../match'
import { ZORK1_FR } from './zork1.fr'
import { ZORK1_EXTRACTION_IGNORE } from './zork1.extraction-ignore'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const buf = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)

/** Full-line shape: starts like a sentence/title, ends terminated. */
const fullLine = (s: string) => /^[A-Z"'(]/.test(s) && /[.!?:")]$/.test(s)
/** Room-title shape (mirrors the reducer's classify()). */
const roomTitle = (s: string) => /^[A-Z][^.!?]{2,40}$/.test(s)

describe('string-inventory gate (spec §7.4)', () => {
  it('every full-line inventory entry matches the corpus', () => {
    const c = compileCorpus(ZORK1_FR)
    const ignore = new Set<string>(ZORK1_EXTRACTION_IGNORE)
    const misses: string[] = []
    for (const line of displayLines(extractStrings(buf))) {
      if (!fullLine(line) && !roomTitle(line)) continue
      if (ignore.has(line)) continue
      if (matchLine(c, line) === null) misses.push(line)
    }
    expect(misses).toEqual([])
  })
})
```

```ts
// src/translate/corpus/zork1.extraction-ignore.ts
// Reviewed extraction entries that are NOT translatable display lines (brute-
// scan artifacts, composition fragments that pass the shape filter, vocabulary
// words). EVERY entry needs a reviewer's reason — this list is the inventory
// gate's escape hatch, and an unreviewed addition is a silent coverage hole.
export const ZORK1_EXTRACTION_IGNORE: readonly string[] = [
  // e.g. 'Frotz.' — brute-scan suffix artifact at 0x….  (REVIEW EACH)
]
```

- [ ] **Step 3: Iterate to green.** Each inventory miss is either (a) a real
  corpus gap → add a string/template entry, or (b) a fragment/artifact → add to
  the ignore list WITH a reason comment. Expect this loop to add the off-path
  death messages and rarer responses the walkthrough never hit.
- [ ] **Step 4: Full suite + `make cover`** (coverage thresholds must hold; the
  corpus data files are plain data and shouldn't drag branches down — if
  thresholds trip on `src/translate/`, add the missing unit tests, don't lower
  thresholds).
- [ ] **Step 5: Commit** — `test(corpus): strict walkthrough + inventory gates green`

---

### Task 18: Final verification + docs

- [ ] **Step 1:** `make all` (lint + format + typecheck + test) — all green.
- [ ] **Step 2:** Manual smoke via `make dev`: pick Français, play a few turns —
  transcript French and instant on the golden path; type a nonsense noun and
  confirm the quoted-unknown-word reply renders in French; check
  `window.loquorMisses()` exists in the console.
- [ ] **Step 3:** Update `CLAUDE.md`'s "Repository state" paragraph: add one
  sentence that output translation (Zork I × French) is implemented per the
  2026-06-10 spec, with its corpus gates. Update the spec's §8 follow-ups if
  anything was consciously deferred during execution.
- [ ] **Step 4:** Commit — `docs: record output-translation v1 (Zork I × French) as implemented`

---

## Self-review (performed while writing)

- **Spec coverage:** §2.1/§5 matcher+exact (T5); §2.2 corpus authoring (T14–16);
  §2.4/§6 shimmer/cache/queue/failure (T8–T10); §2.5 status/echo (T6, T11 — the
  echoed-command-in-English needs NO work: `input` lines never reach the
  matcher); §3 overlay/backlog/passthrough (T10); §4 extraction/normalization/
  open-form-keys (T12, T3, T5); §4.3 {raw}/signed {num} (T5); §6 arbitration +
  engine API (T1–T2); §6 miss log (T7); §7.1–7.6 gates (T5, T10, T13, T14, T17,
  T6+T7). Injection-surface note: documented in xlPrompt.ts (T9).
- **Known deliberate gaps:** the mid-walkthrough command sections in T13 are
  summarized, not enumerated — authoring them blind would be false precision;
  the executable win assertion defines done. The corpus data tasks (T14–16)
  specify procedure + gates rather than full data, by the same logic (locked
  decision 2: Claude authors the corpus during implementation).
- **Type consistency check:** `DisplayLine` defined once (T10), consumed by
  Scrollback (T11). `Template.out` (not `.fr`) everywhere. `EngineGate.run`
  priorities `'input' | 'output'` in T2 and T10. `corpusOverride` exists in the
  hook args (T10) and is used by its tests only.

## Alignment review (2026-06-10, `/paad:alignment` vs the spec)

Four findings, all resolved as plan-side fixes (the spec is unchanged; edits
are folded into the tasks above):

1. **Backlog cache (spec §3):** the hook was matcher-only for backlog lines;
   Task 10 now consults the IndexedDB fallback cache for backlog misses (no
   shimmer, no generation), so cached translations survive a restore rebuild
   (§6 "each miss costs once per device, ever").
2. **`ABSTAIN` leak:** `WebLlmEngine.generate` returns `'__UNKNOWN__'` on
   nullish content; on the grammar-free path that would have been displayed
   and permanently cached as a "translation". Task 1 returns `''` instead,
   routing it to the hook's empty-translation → English-fallback guard.
3. **Queue abandonment (spec §3/§6):** epoch-guarding only the *results* left
   queued generations running on the GPU after a switch to `en`/`off`. Task
   10's gate task now re-checks the epoch after acquiring the gate and bails.
4. **Miss-log turn context (spec §6):** `MissEntry` gains `ctx` (the status
   line at miss time), populated for line/backlog misses (Tasks 7, 10).

Verified non-issue: the spec's "echoed canonical command … de-emphasized"
(§2.5) needs no task — `.scroll .echo` already renders in `--brass-soft`
(`src/ui/components.css`), and further restyling is the §8 follow-up toggle.
