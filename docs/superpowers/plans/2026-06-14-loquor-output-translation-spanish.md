# Spanish Output Translation (Zork I × Español) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display all Zork I output in Spanish, instantly, by adding a Spanish corpus to the existing language-agnostic output-translation overlay — no matcher/engine changes.

**Architecture:** The French slice (`src/translate/`) already provides the matcher, overlay hook, LLM fallback, cache, miss log, status translator, and Spanish shimmer string. Spanish is **data**: three corpus files (`strings`/`objects`/`templates`) + an aggregator + one registry line, structurally mirroring the French corpus. The three corpus gates (round-trip, coverage, inventory) are refactored from FR-hardcoded to **language-list-driven** so Spanish enrolls in the same tests (and German later is one list entry).

**Tech Stack:** TypeScript, Vitest, the in-repo Z-machine string extractor (`scripts/lib/zstrings.mjs`), the NL input lexicons (`src/llm/lexicon/`).

**Spec:** `docs/superpowers/specs/2026-06-14-loquor-output-translation-spanish-design.md`

---

## File Structure

**New files (`src/translate/corpus/`):**
- `zork1.es.strings.ts` — `Record<string,string>`: normalized English line → Spanish. Same keys as `zork1.fr.strings.ts`.
- `zork1.es.objects.ts` — `ObjectsTable` keyed by the same English printed names as `zork1.fr.objects.ts`; exports `ZORK1_ES_OBJECTS` and `ZORK1_ES_CANONICAL`.
- `zork1.es.templates.ts` — `Template[]` with the same EN sides as `zork1.fr.templates.ts`, Spanish `out` sides.
- `zork1.es.ts` — aggregator exporting `ZORK1_ES: TranslationCorpus`.

**Modified files:**
- `src/translate/corpus/index.ts` — add `es: ZORK1_ES` to the Zork I registry entry.
- `src/translate/corpus/roundtrip.test.ts` — parameterize over a language list.
- `src/translate/corpus/coverage.test.ts` — parameterize over a language list.
- `src/translate/corpus/inventory.test.ts` — parameterize over a language list.
- `src/llm/lexicon/es.zork1.ts` and `src/llm/lexicon/index.ts` (`KNOWN_COLLISIONS.es`) — **only if** a Spanish display phrase needs a new surface form during round-trip authoring (Task 5).

**Unchanged (verified):** `match.ts`, `useOutputTranslation.ts`, `normalize.ts`, `statusTranslate.ts`, `fallbackCache.ts`, `missLog.ts`, `xlPrompt.ts` (Spanish shimmer `'…traducción'` already present), the language picker (`Español` already listed), and `zork1.extraction-ignore.ts` (the ignore list is English, language-independent — reused as-is).

---

## Phase A — Parameterize the gates over a language list (pure refactors; French stays green)

These three tasks change no behavior for French; they establish the seam Spanish (and later German) plug into. The language list contains **only French** until Phase C enrolls Spanish, so the suite stays green throughout Phase A.

### Task 1: Parameterize the round-trip gate

**Files:**
- Modify: `src/translate/corpus/roundtrip.test.ts`

- [ ] **Step 1: Replace the file with a list-driven version (French-only list)**

```ts
// Lexicon round-trip gate (spec §7.5): the player types what they read, so
// every display form in a language's objects table must resolve through that
// language's input lexicon to the same canonical — display and input
// vocabularies must not drift. List-driven so each language enrolls identically
// (fr now; es in Task 5; de later is one row).
import { describe, it, expect } from 'vitest'
import { fold } from '../../llm/lexicon/fold'
import type { CoreLexicon, NounLexicon } from '../../llm/lexicon/types'
import type { ObjectsTable } from '../types'
import { FR_ZORK1 } from '../../llm/lexicon/fr.zork1'
import { FR_CORE } from '../../llm/lexicon/fr.core'
import { ZORK1_FR_OBJECTS, ZORK1_FR_CANONICAL } from './zork1.fr.objects'

interface Row {
  code: string
  nouns: NounLexicon
  core: CoreLexicon
  objects: ObjectsTable
  canonical: Readonly<Record<string, string>>
  /** Extra phrase-head tokens stripped before the lexicon-membership check,
   * beyond core.articles. FR: partitive de/d'. ES (Task 5): del/al/de/d. */
  headExtra: readonly string[]
}

const LANGS: Row[] = [
  {
    code: 'fr',
    nouns: FR_ZORK1,
    core: FR_CORE,
    objects: ZORK1_FR_OBJECTS,
    canonical: ZORK1_FR_CANONICAL,
    headExtra: ['de', 'd'],
  },
]

describe.each(LANGS)(
  'objects table ↔ $code input lexicon round-trip (spec §7.5)',
  row => {
    const HEAD = new Set<string>([...row.core.articles, ...row.headExtra])
    const stripHead = (folded: string): string => {
      const toks = folded.split(' ')
      while (toks.length > 1 && HEAD.has(toks[0])) toks.shift()
      return toks.join(' ')
    }

    it('every form of every object resolves to its canonical', () => {
      const failures: string[] = []
      for (const [en, forms] of Object.entries(row.objects)) {
        const canonical = row.canonical[en] ?? en
        const lex = row.nouns[canonical]
        if (!lex) {
          failures.push(`"${en}": no ${row.code} entry for canonical "${canonical}"`)
          continue
        }
        for (const [key, form] of Object.entries(forms)) {
          const phrase = stripHead(fold(form))
          if (!lex.includes(phrase))
            failures.push(
              `"${en}".${key} = "${form}" → "${phrase}" missing from ${row.code}["${canonical}"]`,
            )
        }
      }
      expect(failures).toEqual([])
    })

    it('a populated table (guards against the gate passing vacuously)', () => {
      expect(Object.keys(row.objects).length).toBeGreaterThan(100)
    })
  },
)
```

- [ ] **Step 2: Run the gate, expect PASS (French unchanged)**

Run: `npx vitest run src/translate/corpus/roundtrip.test.ts`
Expected: PASS — 2 tests under the `fr` row.

- [ ] **Step 3: Commit**

```bash
git add src/translate/corpus/roundtrip.test.ts
git commit -m "refactor(translate): parameterize round-trip gate over a language list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Parameterize the coverage gate

**Files:**
- Modify: `src/translate/corpus/coverage.test.ts`

- [ ] **Step 1: Replace the corpus-dependent test with a list-driven version**

Keep the language-independent replay test as-is; wrap the zero-miss assertion in `describe.each`. Full file:

```ts
// Walkthrough-fixture smoke test (output-translation spec §7.3). The fixture is
// a full seeded Zork I win captured as GlkOte updates; CI folds them through
// the reducer (no VM replay). The zero-miss assertion runs per language (fr
// now; es in Task 6).
import { describe, it, expect } from 'vitest'
import updates from '../../test/zork1.walkthrough.en.json'
import { reduce } from '../../glkote-react/reduce'
import { emptyView } from '../../glkote-react/types'
import type { GlkOteUpdate, ViewState } from '../../glkote-react/types'
import type { TranslationCorpus } from '../types'
import { compileCorpus, matchLine } from '../match'
import { normalize, splitIndent, untranslatable } from '../normalize'
import { ZORK1_FR } from './zork1.fr'

const LANGS: { code: string; corpus: TranslationCorpus }[] = [
  { code: 'fr', corpus: ZORK1_FR },
]

/** Reduce the committed walkthrough fixture to the lines a player would see. */
export function walkthroughLines(): ViewState['lines'] {
  let v = emptyView
  for (const u of updates as unknown as GlkOteUpdate[]) v = reduce(v, u)
  return v.lines
}

describe('walkthrough fixture (spec §7.3)', () => {
  it('replays through the reducer to a full winning transcript', () => {
    const lines = walkthroughLines()
    expect(lines.length).toBeGreaterThan(500)
    expect(lines.some(l => l.text.includes('West of House'))).toBe(true)
    expect(lines.some(l => l.text.includes('Inside the Barrow'))).toBe(true)
  })

  describe.each(LANGS)('$code golden path', ({ corpus }) => {
    it('ZERO misses on the golden path — "instant is required" (spec §7.3)', () => {
      const c = compileCorpus(corpus)
      const misses = new Set<string>()
      for (const l of walkthroughLines()) {
        if (l.kind !== 'output' && l.kind !== 'room') continue
        const en = normalize(splitIndent(l.text).body)
        if (!untranslatable(en) && matchLine(c, en) === null) misses.add(en)
      }
      expect([...misses]).toEqual([])
    })
  })
})
```

- [ ] **Step 2: Run the gate, expect PASS (French unchanged)**

Run: `npx vitest run src/translate/corpus/coverage.test.ts`
Expected: PASS — replay test + the `fr` golden-path test.

- [ ] **Step 3: Commit**

```bash
git add src/translate/corpus/coverage.test.ts
git commit -m "refactor(translate): parameterize coverage gate over a language list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Parameterize the inventory gate

**Files:**
- Modify: `src/translate/corpus/inventory.test.ts`

- [ ] **Step 1: Wrap the two corpus-dependent tests in `describe.each`; keep the normalize-equivalence test single**

**Keep the entire module preamble unchanged** — the `readFileSync`/`fileURLToPath`/`dirname`/`resolve` imports, the `repoRoot`/`buf` buffer load, the `classify` import, and the `fullLine`/`roomTitle`/`banner` shape helpers all stay exactly as they are; the `describe.each` body below references them. **Only** restructure the `describe('string-inventory gate …')` block. The shape helpers, the buffer load, and the `displayLines ≡ normalize` test are language-independent — only the two tests that call `compileCorpus(...)` move under the per-language loop. Add the list and adjust the corpus imports:

```ts
import { ZORK1_FR } from './zork1.fr'
import { ZORK1_EXTRACTION_IGNORE } from './zork1.extraction-ignore'
import type { TranslationCorpus } from '../types'

const LANGS: { code: string; corpus: TranslationCorpus }[] = [
  { code: 'fr', corpus: ZORK1_FR },
]
```

Then restructure the `describe` body so the two corpus tests are per-language and the normalize-equivalence test stays once:

```ts
describe('string-inventory gate (spec §7.4)', () => {
  describe.each(LANGS)('$code corpus', ({ corpus }) => {
    it('every full-line inventory entry matches the corpus', () => {
      const c = compileCorpus(corpus)
      const ignore = new Set<string>(ZORK1_EXTRACTION_IGNORE)
      const misses: string[] = []
      for (const line of displayLines(extractStrings(buf))) {
        if (!fullLine(line) && !roomTitle(line) && !banner(line)) continue
        if (ignore.has(line)) continue
        if (matchLine(c, line) === null) misses.push(line)
      }
      expect(misses).toEqual([])
    })

    it('the ignore list stays honest: no entry shadows a corpus match', () => {
      const c = compileCorpus(corpus)
      const translatable = ZORK1_EXTRACTION_IGNORE.filter(
        s => matchLine(c, s) !== null,
      )
      expect(translatable).toEqual([])
    })
  })

  it("displayLines' per-line collapse equals normalize() (review S7)", () => {
    for (const line of displayLines(extractStrings(buf)))
      expect(normalize(line)).toBe(line)
    const raw = ['  A\tquantity   of water \n The   bottle:  ', 'Plain.']
    const viaDisplay = displayLines(raw)
    const viaNormalize = [
      ...new Set(
        raw.flatMap(s => s.split('\n').map(normalize).filter(Boolean)),
      ),
    ]
    expect(viaDisplay).toEqual(viaNormalize)
  })
})
```

> Note: the `ignore list stays honest` test is language-aware only in that an ignore entry must not be matched by *that language's* corpus. French already passes; Spanish must not template/pin any ignore-list line (Task 6 must respect the shared ignore list).

- [ ] **Step 2: Run the gate, expect PASS (French unchanged)**

Run: `npx vitest run src/translate/corpus/inventory.test.ts`
Expected: PASS — `fr` inventory + ignore-honesty + the single normalize-equivalence test.

- [ ] **Step 3: Commit**

```bash
git add src/translate/corpus/inventory.test.ts
git commit -m "refactor(translate): parameterize inventory gate over a language list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase B — Scaffold the Spanish corpus (suite stays green: no gate references `es` yet)

### Task 4: Create empty Spanish corpus files, the aggregator, and the registry line

**Files:**
- Create: `src/translate/corpus/zork1.es.strings.ts`
- Create: `src/translate/corpus/zork1.es.objects.ts`
- Create: `src/translate/corpus/zork1.es.templates.ts`
- Create: `src/translate/corpus/zork1.es.ts`
- Modify: `src/translate/corpus/index.ts`

- [ ] **Step 1: Create the three empty data files**

`src/translate/corpus/zork1.es.strings.ts`:

```ts
// Zork I × Spanish full-line table (spec §4.1). KEYS are normalized English
// lines EXACTLY as the bridge delivers them (same keys as zork1.fr.strings.ts).
// Authored in Task 6; UAT hand-fixes edit entries here.
export const ZORK1_ES_STRINGS: Readonly<Record<string, string>> = {}
```

`src/translate/corpus/zork1.es.objects.ts`:

```ts
// Zork I × Spanish object forms (spec §4.2). Keys are EN printed names (same
// keys as zork1.fr.objects.ts). Spanish form keys: indef ("una botella"),
// def ("la botella"), bare ("botella"); add alDef/delDef ONLY where a template
// needs the a+el→al / de+el→del contraction (Task 6). Authored in Task 5.
import type { ObjectsTable } from '../types'

export const ZORK1_ES_OBJECTS: ObjectsTable = {}

/** Printed name → vocab canonical, for entries whose printed name differs from
 * the extracted-vocab canonical key in ES_ZORK1. Identity when absent. */
export const ZORK1_ES_CANONICAL: Readonly<Record<string, string>> = {}
```

`src/translate/corpus/zork1.es.templates.ts`:

```ts
// Zork I × Spanish composing patterns (spec §4.3). EN sides match
// zork1.fr.templates.ts; Spanish out sides authored in Task 6.
import type { Template } from '../types'

export const ZORK1_ES_TEMPLATES: readonly Template[] = []
```

- [ ] **Step 2: Create the aggregator** `src/translate/corpus/zork1.es.ts`

```ts
import type { TranslationCorpus } from '../types'
import { ZORK1_ES_STRINGS } from './zork1.es.strings'
import { ZORK1_ES_OBJECTS } from './zork1.es.objects'
import { ZORK1_ES_TEMPLATES } from './zork1.es.templates'

export const ZORK1_ES: TranslationCorpus = {
  strings: ZORK1_ES_STRINGS,
  objects: ZORK1_ES_OBJECTS,
  templates: ZORK1_ES_TEMPLATES,
}
```

- [ ] **Step 3: Wire the registry** — edit `src/translate/corpus/index.ts`

Add the import after the French one:

```ts
import { ZORK1_ES } from './zork1.es'
```

Change the registry entry from:

```ts
  [ZORK1_SIG]: { fr: ZORK1_FR },
```

to:

```ts
  [ZORK1_SIG]: { fr: ZORK1_FR, es: ZORK1_ES },
```

- [ ] **Step 4: Typecheck and run the full translate suite — expect PASS**

Run: `make typecheck && npx vitest run src/translate`
Expected: PASS — no gate references `es` yet; the empty corpus compiles (`compileCorpus` uses a never-match alternation when objects are empty). `corpusFor(ZORK1_SIG, 'es')` now returns a (currently empty) corpus. Note: Spanish is now *selectable in the app but data-empty* — every line falls to the LLM fallback until Tasks 5–6 fill the corpus. That's acceptable and mirrors the fallback contract; the gates don't enroll `es` until Tasks 5–6, so the suite stays green meanwhile.

- [ ] **Step 5: Commit**

```bash
git add src/translate/corpus/zork1.es.strings.ts src/translate/corpus/zork1.es.objects.ts src/translate/corpus/zork1.es.templates.ts src/translate/corpus/zork1.es.ts src/translate/corpus/index.ts
git commit -m "feat(translate): scaffold empty Spanish Zork I corpus + registry

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase C — Author the Spanish corpus (data-heavy; batched per spec §2.3)

> **These are large authoring tasks, not 2–5-minute steps.** Per the design (generate-then-UAT-fix, batched subagent translation), author each file in batches using the French twin as the structural blueprint and the English source as the translation source-of-truth. The **gate is the acceptance test** for each task.

### Task 5: Author `zork1.es.objects.ts` and pass the round-trip gate

**Files:**
- Modify: `src/translate/corpus/zork1.es.objects.ts`
- Modify: `src/translate/corpus/roundtrip.test.ts` (add the `es` row)
- Modify (only if needed): `src/llm/lexicon/es.zork1.ts`, `src/llm/lexicon/index.ts`

- [ ] **Step 1: Add the failing `es` row to the round-trip gate**

In `roundtrip.test.ts`, add the imports and the `es` row to `LANGS`:

```ts
import { ES_ZORK1 } from '../../llm/lexicon/es.zork1'
import { ES_CORE } from '../../llm/lexicon/es.core'
import { ZORK1_ES_OBJECTS, ZORK1_ES_CANONICAL } from './zork1.es.objects'
```

```ts
  {
    code: 'es',
    nouns: ES_ZORK1,
    core: ES_CORE,
    objects: ZORK1_ES_OBJECTS,
    canonical: ZORK1_ES_CANONICAL,
    headExtra: ['del', 'al', 'de', 'd'],
  },
```

- [ ] **Step 2: Run the gate, expect FAIL**

Run: `npx vitest run src/translate/corpus/roundtrip.test.ts`
Expected: FAIL — the `es` "populated table" test fails (`0` entries ≤ 100) and/or the resolve test on an empty table.

- [ ] **Step 3: Author `ZORK1_ES_OBJECTS` (batched, ~129 entries)**

For **every** key in `zork1.fr.objects.ts`, emit the same English key with Spanish forms.

> **Dominant authoring cost — medial `de` does not strip.** `headExtra` strips only **leading** article/partitive tokens (`stripHead` halts at the first non-head token). A **medial** `de` survives: `'la lámpara de latón'` folds/strips to `'lampara de laton'`, and `'un poco de agua'` to `'poco de agua'` — neither is a member of `ES_ZORK1` as-is, so the round-trip gate FAILS. Spanish `X de Y` compounds (`figurilla de jade`, `bolsa de monedas`, `caja de cerillas`, `barra de platino`, …) are pervasive where French used a single trailing-modifier head. For **every** such object you must either (a) make the `bare` form a single lexicon-listed token (e.g. `bare: 'lámpara'`), or (b) append the full folded phrase (e.g. `'lampara de laton'`) to `ES_ZORK1[canonical]` in Step 4. Budget this per-object audit as the bulk of the work — it is the "real authoring audit" spec §2.5 warns about, not a value-swap.

Rules:

- Forms `{ indef, def, bare }` for every object: `bottle → { indef: 'una botella', def: 'la botella', bare: 'botella' }`; masculine `book → { indef: 'un libro', def: 'el libro', bare: 'libro' }`.
- **Head-noun sourcing (round-trip rule):** the bare head noun of each form, after `fold()` + head-strip, MUST be a member of `ES_ZORK1[canonical]`. Use the FR entry's structure as a guide and the Spanish input lexicon as the vocabulary source. Example — `ES_ZORK1['brass lantern'] = ['lampara', 'linterna', 'farol']`, so `'brass lantern': { indef: 'una lámpara de latón', def: 'la lámpara de latón', bare: 'lámpara de latón' }` folds/strips to `lampara de laton` — **add `'lampara de laton'` to `ES_ZORK1['brass lantern']`** (Step 4) if the full phrase isn't already listed, OR use the bare lexicon form `'lámpara'` for the `bare` key. Follow the French precedent: the modifier mirrors the EN printed name, the head noun is a lexicon surface form.
- **Mass/irregular nouns** (water, sand, etc.): mirror French's per-object choice. French used the partitive (`de l'eau`); Spanish uses `'un poco de agua'` / `'el agua'` / `'agua'`. Whatever forms you pick, each must head-strip to a listed `ES_ZORK1` surface form (add the phrase to the lexicon if a natural display form is missing — Step 4).
- **Plural objects** (the nine French flagged — `blessings`, `pair of candles`, `set of teeth`, etc.): Spanish forms use plural articles (`las bendiciones` / `unas bendiciones` / `bendiciones`). These never agree at runtime because Task 6 keeps them in complement position (mirroring French's gender/number-neutrality rule).
- **`ZORK1_ES_CANONICAL`:** mirror the French canonical map for any printed name whose lexicon canonical differs. The **objects-table key** is the capitalized printed name `"ZORK owner's manual"` (matching `zork1.fr.objects.ts`, so it matches the actual printed line); `ZORK1_ES_CANONICAL` maps that key to the lowercase vocab canonical `"zork owner's manual"` (as in `es.zork1.ts`). The Spanish display drops the brand (`'manual del propietario'`). Do **not** key the objects table lowercase — it would never match the printed line.
- Do **not** add `alDef`/`delDef` here yet — those are added in Task 6 only for the specific objects a contraction template references.

- [ ] **Step 4: Reconcile the input lexicon and collision gate (only where Step 3 required new surface forms)**

Because of the medial-`de` audit above, expect this to recur — appending `X de Y` phrases to `ES_ZORK1` is the common case, not a rare one. When Step 3 needs a Spanish display phrase that isn't yet a member of `ES_ZORK1[canonical]`, add it there (append to the array; keep the vocab-canonical order). `validate.test.ts` asserts **set equality** between the es-lexicon∩vocab overlap and `KNOWN_COLLISIONS.es[ZORK1_SIG]`, so if the new phrase's **folded head token** coincides with an English game-vocab word, that gate fails — add a reviewed entry to `KNOWN_COLLISIONS.es[ZORK1_SIG]` in `src/llm/lexicon/index.ts` with a one-line justifying comment (same pattern French used; see the existing `fr`/`es` entries like `jade`, `manual`, `panel`, `control`). Never bend the Spanish to dodge the gate.

Run after lexicon edits: `npx vitest run src/llm/lexicon/validate.test.ts`
Expected: PASS (coverage, fold idempotence, and collision gate all green for `es`).

- [ ] **Step 5: Run the round-trip gate AND the collision gate, expect PASS**

Run: `npx vitest run src/translate/corpus/roundtrip.test.ts src/llm/lexicon/validate.test.ts`
Expected: PASS — both `fr` and `es` round-trip rows green (`es` table > 100 entries; every form resolves), AND the lexicon collision/coverage gate green (so a Step-4 `ES_ZORK1`/`KNOWN_COLLISIONS.es` edit can't slip a regression past before commit).

- [ ] **Step 6: Commit**

```bash
git add src/translate/corpus/zork1.es.objects.ts src/translate/corpus/roundtrip.test.ts src/llm/lexicon/es.zork1.ts src/llm/lexicon/index.ts
git commit -m "feat(translate): Spanish Zork I object forms; round-trip gate green

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Author `zork1.es.templates.ts` + `zork1.es.strings.ts` and pass the coverage + inventory gates

**Files:**
- Modify: `src/translate/corpus/zork1.es.templates.ts`
- Modify: `src/translate/corpus/zork1.es.strings.ts`
- Modify: `src/translate/corpus/zork1.es.objects.ts` (add `alDef`/`delDef` to specific objects only if a template needs them)
- Modify: `src/translate/corpus/coverage.test.ts` and `src/translate/corpus/inventory.test.ts` (add the `es` row)

- [ ] **Step 1: Add the failing `es` row to the coverage and inventory gates**

In **both** `coverage.test.ts` and `inventory.test.ts`, add the import and the row to their `LANGS`:

```ts
import { ZORK1_ES } from './zork1.es'
```

```ts
  { code: 'es', corpus: ZORK1_ES },
```

- [ ] **Step 2: Run both gates, expect FAIL**

Run: `npx vitest run src/translate/corpus/coverage.test.ts src/translate/corpus/inventory.test.ts`
Expected: FAIL — the `es` golden-path and inventory tests report many misses (templates/strings still empty).

- [ ] **Step 3: Author `ZORK1_ES_TEMPLATES` (batched, ~50–150 patterns)**

For every entry in `zork1.fr.templates.ts`, emit the **same EN side** with a Spanish `out` side. Rules:

- `{ en: 'There is a {obj} here.', out: 'Hay {obj.indef} aquí.', cap: true }` when the out side starts with a lowercase pre-composed form.
- **Avoid `de`/`a` immediately before a slot** (the same discipline French uses): prefer Spanish phrasings that keep `{obj}` in complement/object position so nothing must contract. A `{obj}`-alternation template that references `{obj.delDef}` would force **every** object to carry a `delDef` form or miss — so only introduce `alDef`/`delDef` when the template's object set is bounded; otherwise rephrase or pin the line as a full string (Step 4).
- **`{raw}` vs `{obj}`:** keep them exactly where French has them (parser echoes of the player's typed token use `{raw}`; printed object names use `{obj}`). `match.ts` owns specificity ordering — author in any order.
- **Inverted punctuation** belongs in the `out` value (`¿…?`, `¡…!`).
- Respect the shared **ignore list** (`zork1.extraction-ignore.ts`): do not template or pin any line it contains, or the inventory "ignore list stays honest" test fails.

- [ ] **Step 4: Author `ZORK1_ES_STRINGS` (batched) and any contraction forms**

For every key in `zork1.fr.strings.ts`, emit the same English key with a Spanish value (room descriptions, static responses — `'Done.' → 'Hecho.'` style — death/end banners, the game banner, and any line the §2.5 "no prep-before-slot" rule pushed out of a template). Where a template you wrote in Step 3 genuinely needs a contraction and the object set is bounded, add `alDef`/`delDef` to **each** of those specific objects in `zork1.es.objects.ts` (e.g. `altar: { …, alDef: 'al altar', delDef: 'del altar' }`); re-run the round-trip gate (Task 5 Step 5) to confirm the new forms still resolve.

- [ ] **Step 5: Run the coverage and inventory gates, expect PASS**

Run: `npx vitest run src/translate/corpus/coverage.test.ts src/translate/corpus/inventory.test.ts`
Expected: PASS — `es` golden path has zero misses; every `es` full-line inventory entry matches; ignore list stays honest. Iterate Steps 3–4 against the reported miss lists until green.

- [ ] **Step 6: Commit**

```bash
git add src/translate/corpus/zork1.es.templates.ts src/translate/corpus/zork1.es.strings.ts src/translate/corpus/zork1.es.objects.ts src/translate/corpus/coverage.test.ts src/translate/corpus/inventory.test.ts
git commit -m "feat(translate): Spanish Zork I strings+templates; coverage+inventory gates green

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase D — Verify the whole branch

### Task 7: Full suite, typecheck, lint; record the UAT follow-up

**Files:** none (verification only)

- [ ] **Step 1: Run the full project gate**

Run: `make all`
Expected: lint + format + typecheck + the full Vitest suite all PASS, with no stray `console` output or `act(...)` warnings (per CLAUDE.md conventions).

- [ ] **Step 2: Confirm Spanish is live end-to-end at the registry seam**

Run: `npx vitest run src/translate`
Expected: PASS — `corpusFor(ZORK1_SIG, 'es')` returns the populated `ZORK1_ES`; all three gates green for both `fr` and `es`.

- [ ] **Step 3: Commit any formatting fixups and note the UAT follow-up**

```bash
git add -A
git commit -m "chore(translate): make all green for Spanish Zork I output translation

Manual browser smoke (shimmer, status bar, language-switch mid-game) and the
play-in-Spanish UAT loop (dump window.loquorMisses(), feed the corpus) are
deferred to the next UAT session, mirroring the French v1 lifecycle.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> **UAT follow-up (out of plan scope):** play Zork I in Spanish, dump `window.loquorMisses()`, hand-fix corpus gaps and any contraction errors (the round-trip gate proves the noun resolves, not that `del`/`al` composed correctly — UAT is the only net for that), to the same bar French reached (deathless golden-path run, zero transcript leaks).

---

## Self-Review

- **Spec §1 goal (instant Spanish output):** Tasks 5–6 author the corpus; Task 7 verifies. ✓
- **Spec §2.1 blueprint/value-swap + §2.5 al/del via form keys:** Tasks 5–6, with the matcher-driven discipline (no prep-before-slot; bounded object sets for contraction forms; else full-string pin). ✓
- **Spec §3 files (4 new + registry):** Task 4. ✓
- **Spec §4 gates parameterized over a language list:** Tasks 1–3 (refactor, fr green), enrolled in Tasks 5–6. ✓
- **Spec §2.6 shared ignore list:** respected in Task 6 Step 3; policed by the inventory ignore-honesty test. ✓
- **Spec §1 KNOWN_COLLISIONS as the one input-layer edit:** Task 5 Step 4. ✓
- **Spec §6 German readiness:** the `headExtra`-as-token-set per-row config (Task 1) is the de-ready seam; no German work in this plan. ✓
- **Type consistency:** `ZORK1_ES`/`ZORK1_ES_STRINGS`/`ZORK1_ES_OBJECTS`/`ZORK1_ES_TEMPLATES`/`ZORK1_ES_CANONICAL` used consistently across Tasks 4–7; `Row`/`headExtra` consistent in the round-trip gate; `LANGS` shape consistent per gate. ✓
- **Placeholder scan:** no TBD/TODO; authoring tasks give rules + representative code and use the gate as the executable acceptance (the only honest form for data-corpus work). ✓
