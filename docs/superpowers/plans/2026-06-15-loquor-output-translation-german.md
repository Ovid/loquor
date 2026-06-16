# Loquor Output Translation — German (Zork I × Deutsch) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a German display-layer corpus for Zork I so selecting **German** translates all output instantly, mirroring the French/Spanish slices, plus the two gates the pushback added (mandatory `indef`, a static form-key completeness check).

**Architecture:** Pure data authoring against the existing, language-agnostic overlay. Four new data files (`zork1.de.{strings,objects,templates}.ts` + the `zork1.de.ts` aggregator) keyed identically to the French corpus, one registry line, one round-trip row, and one new completeness test. German case forms (`bare`/`nomDef`/`nomIndef`/`akkDef`/`akkIndef`/`datDef`/`datIndef`/contractions, plus mandatory `indef = nomIndef`) live entirely in the data; the matcher, gates, lexicon, and UI are untouched except for the one round-trip row and the registry line.

**Tech Stack:** TypeScript, Vitest, the existing `src/translate/` overlay (`match.ts`, `corpus/`), the `src/llm/lexicon/` input lexicon (`de.core.ts`, `de.zork1.ts`, `index.ts`).

**Source-of-truth spec:** `docs/superpowers/specs/2026-06-15-loquor-output-translation-german-design.md`.

**Authoring contract (read before any task):**
- **Keys are byte-identical to the French corpus.** `zork1.de.strings.ts` keys = `zork1.fr.strings.ts` keys; `zork1.de.objects.ts` keys = `zork1.fr.objects.ts` keys (EN printed names); `zork1.de.templates.ts` `en` sides = `zork1.fr.templates.ts` `en` sides, byte-exact. Only the values/`out` sides differ. This is what makes coverage + inventory pass "by construction".
- **Translate from the English source line** (spec §2.2). The fr/es values are same-meaning references, not the source of truth.
- **German capitalizes all nouns**, mid-sentence included (`'Du öffnest den blauen Knopf.'`).
- **No grammar code, no derivation helper** (spec §2.4). All case selection lives in template `out` sides and per-object form keys.
- **The gates are the executable acceptance test** for each authoring task (spec §5). Gates-green is this plan's finish line; the German UAT loop + `zork1.de.uat.test.ts` is a deferred follow-up (spec §7).

---

## File Structure

**New files (`src/translate/corpus/`):**
- `zork1.de.objects.ts` — `ZORK1_DE_OBJECTS: ObjectsTable` + `ZORK1_DE_CANONICAL` (EN printed name → input-lexicon canonical, only where they differ). German case forms per spec §2.3, **`indef` mandatory on every object** (= the nominative-indefinite citation form).
- `zork1.de.strings.ts` — `ZORK1_DE_STRINGS: Record<string,string>`, normalized EN line → German. Same keys as `zork1.fr.strings.ts`.
- `zork1.de.templates.ts` — `ZORK1_DE_TEMPLATES: readonly Template[]`, EN sides byte-exact to `zork1.fr.templates.ts`, German `out` sides selecting the right case key per slot.
- `zork1.de.ts` — aggregator `export const ZORK1_DE: TranslationCorpus = { strings, objects, templates }`.
- `completeness.test.ts` — new gate (uniform form-key completeness, German-first).

**Modified files:**
- `src/translate/corpus/index.ts` — one registry line enrolls German into coverage + inventory.
- `src/translate/corpus/roundtrip.test.ts` — one `LANGS` row (the round-trip gate carries its own literal list, not the registry).
- `src/llm/lexicon/de.zork1.ts` — append folded declined adjective phrases where the round-trip gate requires (spec §4 declension audit). **Read/append only — never restructure.**
- `src/llm/lexicon/index.ts` — extend `KNOWN_COLLISIONS.de[ZORK1_SIG]` for any new lexicon↔vocab overlap created by the appends, with a justifying comment per entry.

---

## Task 1: German object forms + round-trip enrollment

Build the objects table and make the round-trip gate (display forms ↔ input lexicon) green. This is the dominant authoring cost (the declension audit, spec §4).

**Files:**
- Create: `src/translate/corpus/zork1.de.objects.ts`
- Modify: `src/translate/corpus/roundtrip.test.ts:31-48` (add the `de` row + imports)
- Modify (append-only): `src/llm/lexicon/de.zork1.ts`
- Modify: `src/llm/lexicon/index.ts:152-164` (`KNOWN_COLLISIONS.de[ZORK1_SIG]`)
- Reference: `src/translate/corpus/zork1.fr.objects.ts` (key list + order), `src/translate/corpus/zork1.es.objects.ts` (medial-modifier handling), `src/llm/lexicon/de.zork1.ts` (the folded German vocab the forms must resolve to)

- [ ] **Step 1: Add the German row to the round-trip gate (the failing test)**

Edit `roundtrip.test.ts`. Add imports beside the existing es imports (after line 15):

```ts
import { DE_ZORK1 } from '../../llm/lexicon/de.zork1'
import { DE_CORE } from '../../llm/lexicon/de.core'
import { ZORK1_DE_OBJECTS, ZORK1_DE_CANONICAL } from './zork1.de.objects'
```

Append this row to the `LANGS` array (after the `es` row, before the closing `]` at line 48):

```ts
  {
    code: 'de',
    nouns: DE_ZORK1,
    core: DE_CORE,
    objects: ZORK1_DE_OBJECTS,
    canonical: ZORK1_DE_CANONICAL,
    // Fused preposition+article contractions baked into per-object keys
    // (imDat: 'im Briefkasten'); headExtra strips the leading fused token so the
    // baked form folds to the bare noun before the lexicon-membership check.
    // Case articles der/die/das/den/dem/des already strip via core.articles.
    headExtra: ['zum', 'zur', 'im', 'am', 'ins', 'vom', 'beim', 'ans', 'aufs'],
  },
```

- [ ] **Step 2: Run the round-trip gate to verify it fails**

Run: `npx vitest run src/translate/corpus/roundtrip.test.ts`
Expected: FAIL — cannot resolve `./zork1.de.objects` (module not found).

- [ ] **Step 3: Author the German objects table**

Create `src/translate/corpus/zork1.de.objects.ts`. Mirror `zork1.fr.objects.ts` **key-for-key and in the same order**. For every object, supply at minimum `indef`, `def` (→ `nomDef`/`akkDef` as the templates require), and `bare`. Per spec §2.3:

- `bare` — head noun alone, **must be a single lexicon-listed token** wherever possible (`bare: 'knopf'`), so it round-trips without needing a lexicon append.
- `indef` — **mandatory on every object**, the nominative-indefinite citation form the matcher's built-in `'A {obj}'`/`'An {obj}'` listing uses (`match.ts` `BUILTIN`). Set it equal to `nomIndef` where you also author `nomIndef`.
- Case keys (`nomDef`/`nomIndef`/`akkDef`/`akkIndef`/`datDef`/`datIndef`, contractions like `imDat`) — supplied **only where a template references them** (Task 3). Niche dative/genitive/contraction lines are pinned per-object as full strings in Task 2, not driven by shared templates, so most objects carry only `indef`/`def`/`bare` + `akkDef`.

Header + representative entries (German nouns capitalized; compounds are invariant, only adjectives decline):

```ts
// Zork I × German object forms (spec §2.3, §4). Keys are EN printed names —
// byte-identical to zork1.fr.objects.ts. German case forms: every object ships
// `indef` (= nominative-indefinite citation form, REQUIRED by the matcher's
// built-in "A {obj}" listing), plus the case keys its templates reference.
//
// Round-trip rule (roundtrip.test.ts, spec §4): every form here, fold()ed with
// LEADING articles + fused contraction tokens stripped, MUST be an element of
// DE_ZORK1[canonical] (canonical = ZORK1_DE_CANONICAL[en] ?? en). stripHead only
// strips LEADING tokens, so a MEDIAL declined adjective survives:
// 'der blaue Knopf' → 'blaue knopf'. For every adjective-bearing object either
// make `bare` a lexicon token AND/OR append the folded declined phrase(s) to
// DE_ZORK1[canonical] (Task 1 Step 5). Compound nouns (the majority) are exempt —
// only the leading article strips.
import type { ObjectsTable } from '../types'

export const ZORK1_DE_OBJECTS: ObjectsTable = {
  altar: { indef: 'ein Altar', def: 'der Altar', akkDef: 'den Altar', bare: 'altar' },
  // Compound noun — invariant; only the article changes. No declension audit.
  'brass lantern': {
    indef: 'eine Messinglaterne',
    def: 'die Messinglaterne',
    akkDef: 'die Messinglaterne',
    bare: 'laterne',
  },
  // Adjective-bearing — declines per case. `bare` is a lexicon token ('knopf');
  // the medial declined forms are appended to DE_ZORK1['blue button'] in Step 5.
  'blue button': {
    indef: 'ein blauer Knopf', // nomIndef; the listing/citation form
    nomDef: 'der blaue Knopf',
    akkDef: 'den blauen Knopf',
    bare: 'knopf',
  },
  // Mailbox — needs a baked dative contraction for a bounded template set.
  mailbox: {
    indef: 'ein Briefkasten',
    def: 'der Briefkasten',
    akkDef: 'den Briefkasten',
    imDat: 'im Briefkasten',
    bare: 'briefkasten',
  },
  // …every remaining object from zork1.fr.objects.ts, same key + order…
}

// EN printed name → input-lexicon canonical, ONLY where they differ (mirror
// ZORK1_FR_CANONICAL / ZORK1_ES_CANONICAL). The round-trip gate uses
// canonical = ZORK1_DE_CANONICAL[en] ?? en, so most entries are unneeded.
export const ZORK1_DE_CANONICAL: Readonly<Record<string, string>> = {
  // e.g. 'quantity of water': 'water',  — copy the set the fr/es maps use
}
```

- [ ] **Step 4: Run the round-trip gate (expect declension failures)**

Run: `npx vitest run src/translate/corpus/roundtrip.test.ts`
Expected: FAIL — adjective-bearing objects report e.g. `"blue button".nomDef = "der blaue Knopf" → "blaue knopf" missing from de["blue button"]`. Compound/single-noun objects pass. This is the declension audit (spec §4); fix in Step 5. (If the populated-table guard `> 100` fails, the table is incomplete — finish Step 3 first.)

- [ ] **Step 5: Reconcile the lexicon — append folded declined phrases**

For each failing medial-adjective phrase, append its folded form to the matching `DE_ZORK1` value array in `src/llm/lexicon/de.zork1.ts` (append-only — never reorder keys; the canonical-order gate in `validate.test.ts` enforces order). Example:

```ts
  // before:
  'blue button': ['blauer knopf', 'knopf'],
  // after — add the case-declined heads the display forms fold to:
  'blue button': ['blauer knopf', 'blaue knopf', 'blauen knopf', 'knopf'],
```

- [ ] **Step 6: Run the lexicon validation gate (collision set-equality)**

Run: `npx vitest run src/llm/lexicon/validate.test.ts`
Expected: PASS, unless an appended phrase's folded head collides with an English game-vocab word — then the `KNOWN_COLLISIONS` set-equality test FAILS, listing the new overlap.

- [ ] **Step 7: Record any new collision as a reviewed decision**

For each new overlap reported, add the word (alphabetically) to `KNOWN_COLLISIONS.de[ZORK1_SIG]` in `src/llm/lexicon/index.ts` with a justifying comment, mirroring the existing entries:

```ts
  de: {
    [ZORK1_SIG]: [
      'an',
      // …existing entries…
      'blaue', // appended declined head of 'blauer knopf' vs <vocab word>; reviewed
    ],
```

Never bend the German to dodge the gate (spec §4). Re-run `validate.test.ts` → PASS.

- [ ] **Step 8: Run the round-trip gate to verify it passes**

Run: `npx vitest run src/translate/corpus/roundtrip.test.ts`
Expected: PASS — all three languages (fr, es, de) green, populated-table guard satisfied.

- [ ] **Step 9: Commit**

```bash
git add src/translate/corpus/zork1.de.objects.ts src/translate/corpus/roundtrip.test.ts src/llm/lexicon/de.zork1.ts src/llm/lexicon/index.ts
git commit -m "feat(translate): German Zork I object forms; round-trip gate green

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: German strings + templates + registry — coverage & inventory gates green

Author the string table and templates, wire the aggregator and the one registry line. Registering German enrolls it into the coverage + inventory gates (they iterate `corporaFor(ZORK1_SIG)`), which become the executable acceptance test for this content.

**Files:**
- Create: `src/translate/corpus/zork1.de.strings.ts`, `src/translate/corpus/zork1.de.templates.ts`, `src/translate/corpus/zork1.de.ts`
- Modify: `src/translate/corpus/index.ts:7-14` (import + registry line)
- Reference: `zork1.fr.strings.ts`, `zork1.fr.templates.ts`, `zork1.es.templates.ts` (composition discipline), `zork1.extraction-ignore.ts` (lines German must NOT template/pin), `zork1.fr.ts` (aggregator shape)

- [ ] **Step 1: Add the registry line (the failing test driver)**

Edit `src/translate/corpus/index.ts`. Add the import beside the es import (line 8):

```ts
import { ZORK1_DE } from './zork1.de'
```

Change the `CORPORA` entry (line 13) to:

```ts
  [ZORK1_SIG]: { fr: ZORK1_FR, es: ZORK1_ES, de: ZORK1_DE },
```

- [ ] **Step 2: Run coverage + inventory to verify they fail**

Run: `npx vitest run src/translate/corpus/coverage.test.ts src/translate/corpus/inventory.test.ts`
Expected: FAIL — cannot resolve `./zork1.de` (aggregator + strings + templates not yet created).

- [ ] **Step 3: Author the German string table**

Create `src/translate/corpus/zork1.de.strings.ts`. Mirror `zork1.fr.strings.ts` key-for-key (normalized EN line → German). Pin here: room descriptions, static responses, death/end banners, the game banner, and **per-object niche-case lines** (dative/genitive/contraction sentences) that would otherwise force a shared template to reference a niche key (keeping the completeness gate's required-key union small — Task 3).

```ts
// Zork I × German full-line strings (spec §3). Keys are normalize()d English
// lines — byte-identical to zork1.fr.strings.ts. German nouns capitalized.
// Niche-case sentences (dative/genitive/contraction) are pinned here per spec
// §2.4 rather than driven by shared templates, so no shared template references
// a niche form key (keeps completeness.test.ts's required-key union minimal).
export const ZORK1_DE_STRINGS: Record<string, string> = {
  'West of House': 'Westlich des Hauses',
  'You are standing in an open field west of a white house, with a boarded front door.':
    'Du stehst auf einem offenen Feld westlich eines weißen Hauses mit einer vernagelten Haustür.',
  // …every key from zork1.fr.strings.ts…
}
```

Do **not** add any key listed in `zork1.extraction-ignore.ts` (the inventory "ignore list stays honest" test fails if the corpus can translate an ignored line).

- [ ] **Step 4: Author the German templates**

Create `src/translate/corpus/zork1.de.templates.ts`. EN sides **byte-exact** to `zork1.fr.templates.ts`; German `out` sides select the case key per slot. Discipline: keep `{obj}` in **nominative or accusative** (`{obj.akkDef}` for direct objects); push dative/contraction/genitive lines to the strings table (Step 3) so shared templates reference only the universal keys (`indef`, `def`/`nomDef`/`akkDef`, `bare`).

```ts
// Zork I × German composing patterns (spec §2.3, §4). EN sides match
// zork1.fr.templates.ts BYTE-EXACT (normalize()d). German out sides select the
// case key per slot; nouns capitalized. Discipline: {obj} stays nominative/
// accusative — niche-case lines are pinned as full strings (zork1.de.strings.ts),
// NOT here, so completeness.test.ts's required-key union stays small.
import type { Template } from '../types'

export const ZORK1_DE_TEMPLATES: readonly Template[] = [
  { en: 'I don\'t know the word "{raw}".', out: 'Ich kenne das Wort „{raw}“ nicht.' },
  { en: 'There is a {obj} here.', out: 'Hier ist {obj.indef}.' },
  { en: 'You open the {obj}.', out: 'Du öffnest {obj.akkDef}.' },
  { en: 'Taken.', out: 'Genommen.' }, // (most "Taken."-class lines are strings, not templates)
  // …every EN side from zork1.fr.templates.ts, German out…
]
```

- [ ] **Step 5: Create the aggregator**

Create `src/translate/corpus/zork1.de.ts`:

```ts
import type { TranslationCorpus } from '../types'
import { ZORK1_DE_STRINGS } from './zork1.de.strings'
import { ZORK1_DE_OBJECTS } from './zork1.de.objects'
import { ZORK1_DE_TEMPLATES } from './zork1.de.templates'

export const ZORK1_DE: TranslationCorpus = {
  strings: ZORK1_DE_STRINGS,
  objects: ZORK1_DE_OBJECTS,
  templates: ZORK1_DE_TEMPLATES,
}
```

- [ ] **Step 6: Run coverage + inventory, iterate on misses**

Run: `npx vitest run src/translate/corpus/coverage.test.ts src/translate/corpus/inventory.test.ts`
Expected initially: FAIL — each gate lists the exact English lines that miss (`expect([...misses]).toEqual([])`). For every reported miss, add the missing string key or template `out` (or, if it's a structural class, confirm it belongs in `zork1.extraction-ignore.ts` — but do not edit that shared file; a genuinely new structural class is out of this plan's scope). Repeat until both gates report `[]`.

- [ ] **Step 7: Run coverage + inventory to verify they pass**

Run: `npx vitest run src/translate/corpus/coverage.test.ts src/translate/corpus/inventory.test.ts`
Expected: PASS — fr, es, de all report zero misses on the walkthrough and the string inventory.

- [ ] **Step 8: Commit**

```bash
git add src/translate/corpus/zork1.de.strings.ts src/translate/corpus/zork1.de.templates.ts src/translate/corpus/zork1.de.ts src/translate/corpus/index.ts
git commit -m "feat(translate): German Zork I strings+templates; coverage+inventory gates green

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Form-key completeness gate (pushback Issue 2)

Add the static gate that replaces the `withContractions` guarantee German drops: prove every form key any template references exists on every object, so no `{obj.<key>}` can silently miss at runtime on an object the coverage fixture never exercised.

**Files:**
- Create: `src/translate/corpus/completeness.test.ts`
- Reference: `src/translate/match.ts:44-47` (the `BUILTIN` listing templates that hardcode `{obj.indef}`), `src/translate/types.ts` (`TranslationCorpus`)

- [ ] **Step 1: Write the completeness gate (failing first)**

Create `src/translate/corpus/completeness.test.ts`:

```ts
// Form-key completeness gate (spec §4, §2.1; pushback Issue 2). German supplies
// case keys piecemeal and drops Spanish's withContractions() guarantee, so a
// template referencing {obj.<key>} against an object lacking <key> would MISS at
// runtime — and the coverage gate, replaying one walkthrough, only checks the
// object×template bindings that transcript exercises. This is the static net:
// every key any template references must exist on EVERY object.
//
// SOUNDNESS CEILING: the matcher's {obj} regex can bind any object name, so we
// enforce UNIFORM completeness (required-key union present on all objects).
// Discipline keeps the union small: niche dative/genitive/contraction lines are
// pinned as full strings (zork1.de.strings.ts), never shared templates, so their
// per-object keys stay out of the union.
import { describe, it, expect } from 'vitest'
import { ZORK1_DE } from './zork1.de'
import type { TranslationCorpus } from '../types'

// match.ts BUILTIN listing templates ('A {obj}'/'An {obj}' → '{obj.indef}')
// reference `indef` for every listed object, so `indef` is always required even
// though no authored template names it. We mirror that out-form here as a
// constant rather than importing BUILTIN, because spec §6 forbids touching
// match.ts (BUILTIN is a private const; exporting it would also fail Task 4
// Step 3's empty-seam-diff guard). The guard test below pins the coupling so a
// future BUILTIN that referenced another key surfaces as a deliberate update
// here, not a silent gap.
const BUILTIN_OUTS = ['{obj.indef}']

function referencedFormKeys(corpus: TranslationCorpus): Set<string> {
  const keys = new Set<string>()
  const re = /\{obj2?\.([A-Za-z]+)\}/g
  for (const out of [...corpus.templates.map(t => t.out), ...BUILTIN_OUTS])
    for (const m of out.matchAll(re)) keys.add(m[1])
  return keys
}

describe('German form-key completeness (spec §4, §2.1)', () => {
  it('every object supplies every template-referenced form key', () => {
    const required = referencedFormKeys(ZORK1_DE)
    const failures: string[] = []
    for (const [name, forms] of Object.entries(ZORK1_DE.objects))
      for (const key of required)
        if (!(key in forms)) failures.push(`"${name}" missing .${key}`)
    expect(failures).toEqual([])
  })

  it('the required-key set is non-empty (guards a vacuous pass)', () => {
    expect(referencedFormKeys(ZORK1_DE).size).toBeGreaterThan(0)
  })

  it('includes `indef` from the match.ts BUILTIN listings (coupling pin)', () => {
    // If match.ts's BUILTIN ever references a key beyond `indef`, BUILTIN_OUTS
    // must be updated to match — this pins that `indef` requirement is carried.
    expect(referencedFormKeys(ZORK1_DE).has('indef')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the gate**

Run: `npx vitest run src/translate/corpus/completeness.test.ts`
Expected: Likely FAIL on first run — lists objects missing a key some template references (e.g. an object with no `akkDef` that a `{obj.akkDef}` template can bind), or missing the mandatory `indef`.

- [ ] **Step 3: Fix the data, not the gate**

For each reported miss, either add the key to that object in `zork1.de.objects.ts` (if it's a universal case the template legitimately needs), or move the offending line from a shared template to a per-object pin in `zork1.de.strings.ts` (if the key is niche — keeps the union small). Re-run after each batch.

- [ ] **Step 4: Run the gate to verify it passes**

Run: `npx vitest run src/translate/corpus/completeness.test.ts`
Expected: PASS.

- [ ] **Step 5: Re-run coverage + inventory (guard against regressions from Step 3 moves)**

Run: `npx vitest run src/translate/corpus/coverage.test.ts src/translate/corpus/inventory.test.ts`
Expected: PASS — moving a line to a string pin must not reintroduce a miss.

- [ ] **Step 6: Commit**

```bash
git add src/translate/corpus/completeness.test.ts src/translate/corpus/zork1.de.objects.ts src/translate/corpus/zork1.de.strings.ts src/translate/corpus/zork1.de.templates.ts
git commit -m "test(translate): German form-key completeness gate (pushback Issue 2)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Full-suite verification

Confirm nothing else regressed and the whole German slice is green end to end.

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `make test`
Expected: PASS — all suites, including the four German gates (round-trip, coverage, inventory, completeness) and the unchanged matcher/lexicon tests.

- [ ] **Step 2: Lint, format, typecheck**

Run: `make lint && make format && make typecheck`
Expected: clean (autofix may restage; re-run `make test` if anything changed).

- [ ] **Step 3: Verify the engine seam is untouched**

Run: `git diff --name-only main -- src/translate/match.ts src/translate/useOutputTranslation.ts src/translate/normalize.ts src/translate/statusTranslate.ts src/translate/fallbackCache.ts src/translate/missLog.ts src/translate/xlPrompt.ts`
Expected: **empty** — spec §6 forbids changes to these. If any appear, revert them.

Then catch any *other* stray edit (a UI component, the language picker — spec §6
also pins "every UI component" and the picker). List every changed file under
`src/` and subtract the nine this plan legitimately touches:

```bash
git diff --name-only main -- src/ | grep -vE \
  'src/translate/corpus/(zork1\.de\.(objects|strings|templates)|zork1\.de|completeness\.test|index|roundtrip\.test)\.ts|src/llm/lexicon/(de\.zork1|index)\.ts'
```

Expected: **empty** — anything printed is an out-of-scope edit (spec §6); review and revert it.

- [ ] **Step 4: Final commit (only if Steps 2 restaged anything)**

```bash
git add -A
git commit -m "chore(translate): make all green for German Zork I output translation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (spec coverage)

- **§2.1 by-construction / completeness** → Task 3 (completeness gate). ✓
- **§2.2 translate from English** → authoring contract + Task 1/2 steps. ✓
- **§2.3 case-form scheme + mandatory `indef`** → Task 1 Step 3. ✓
- **§2.4 minimize cases, pin niche as strings, no declension code** → Task 2 Steps 3-4 discipline + Task 3 union-minimizing. ✓
- **§2.5 grammar in data / capitalize nouns** → authoring contract + headers. ✓
- **§2.6 shared extraction-ignore untouched** → Task 2 Step 3/6 notes; Task 4 Step 3. ✓
- **§3 four data files + registry line** → Tasks 1-2. ✓
- **§4 list-driven gates + round-trip row + declension audit + new completeness gate** → Tasks 1 & 3. ✓
- **§5 gates-green is the finish line; UAT deferred** → Task 4; UAT explicitly out of scope. ✓
- **§6 what does not change** → Task 4 Step 3 asserts the engine seam diff is empty. ✓
- **§7 follow-ups (UAT, Zork II/III, chrome i18n)** → out of scope, not planned. ✓

**Deviation flagged:** the completeness gate enforces *uniform* completeness (sound but slightly broader than "objects the template can bind") because per-template object-set metadata doesn't exist; the union is kept small by pinning niche-case lines as strings. Named in `completeness.test.ts`'s header.
