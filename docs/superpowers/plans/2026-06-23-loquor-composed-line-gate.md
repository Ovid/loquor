# Composed-Line Inventory Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the runtime-composed-line leak class with a systematic, all-languages gate so a Georgian player driving Zork I never sees a raw-English composed line — and CI fails the moment that stops being true.

**Architecture:** A committed, annotated family inventory (`composed-families.ts`) drives a new pure gate (`composed-lines.test.ts`) that, per reachable family, (a) verifies the EN skeleton is real game text against the decoded story file, then (b) drives every eligible object/raw/verb fill through `matchLine` per language (`ka` over the full union object set, `fr/de/es` over one representative unless exempt) and asserts a non-English, Georgian-bearing translation. One small runtime change adds a `{verb}` passthrough slot to `match.ts` so per-preposition orphan-prompt templates cover every orphaning verb without leaking. The gate uses only committed corpus data + `match.ts` + the committed story file's decoded strings — no ZIL, no VM, no network — exactly like the existing coverage/inventory gates.

**Tech Stack:** TypeScript, Vitest, the existing `src/translate/` matcher (`compileCorpus`/`matchLine`), `scripts/lib/zstrings.mjs` (z-string decoder, already used by `inventory.test.ts`).

**Spec:** `docs/superpowers/specs/2026-06-23-loquor-composed-line-gate-design.md` (read it first; this plan executes it).

**Branch:** Work on `ovid/composed-line-gate` (already checked out). No new worktree needed.

---

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `src/translate/corpus/composed-families.ts` | Committed family inventory + types + `EXEMPTIONS` + `EXPECTED_DEFERRED` + `REACHABLE_FLOOR`. The single reviewable source of truth a human audits by reading one file. | Create |
| `src/translate/corpus/composed-lines.test.ts` | The gate: skeleton-fidelity check, per-language translation drive, exemptions, deferred-list honesty, floor + completeness meta-tests. | Create |
| `src/translate/match.ts` | Add the `{verb}` match-only slot (SLOT regex + compile branch; `OUT_REF` untouched). The spec's one runtime-code change. | Modify |
| `src/translate/match.test.ts` (or existing matcher test) | Unit tests for the `{verb}` slot. | Modify/Create |
| `src/translate/corpus/zork1.{ka,fr,de,es}.templates.ts` | Orphan-prompt templates (with-prep per confirmed prep + no-noun) and any reachable-family gaps the red gate surfaces. | Modify |
| `src/translate/corpus/zork1.ka.strings.ts` | Per-object Georgian pins (rung 2) only where a case forces it. | Modify (as needed) |
| `src/translate/corpus/ka-native-review-draft.test.ts` | Extend so EVERY new `ka` composed-line draft is marker-gated (today it only checks two hardcoded entries). | Modify |
| `src/translate/corpus/composed-lines.uat.test.ts` | The 7 seed pins — absorbed into the inventory, then deleted. | Delete (Task 9) |
| `notes/georgian-composed-line-review.md` | Native-review worklist: every authored ka line, grouped by family, EN source + draft + rung + case note. | Create (Task 10) |
| `notes/georgian-native-review-followup.md` | Repoint the "Known ka raw-English leaks (orphan prompt)" entry: no longer a deferred leak. | Modify (Task 10) |
| `notes/next.md` | Mark P2.1 done; repoint old `.uat.test.ts` references. | Modify (Task 10) |

**Decision: `EXEMPTIONS`, `EXPECTED_DEFERRED`, `REACHABLE_FLOOR` live inside `composed-families.ts`** (fewest files; they are all "inventory metadata" a reviewer reads together). `ponytail:` one data file, not four.

---

## Task 1: Family inventory data model + the absorbed UAT pins (seed)

Build the typed inventory and seed it with the 6 families that cover the existing `composed-lines.uat.test.ts` (7 assertions; the two E-pins share one put-in family). These go GREEN immediately under the Task-2 gate (their templates already ship), which proves the data model and the gate end-to-end before any new content.

**Files:**
- Create: `src/translate/corpus/composed-families.ts`

- [ ] **Step 1: Write the inventory file with types + seed + metadata**

```typescript
// src/translate/corpus/composed-families.ts
//
// Committed inventory of Zork I runtime-COMPOSED display lines (spec
// 2026-06-23-loquor-composed-line-gate-design). Each line is glued at runtime
// from separate string fragments, so it is invisible to BOTH existing gates:
// the walkthrough gate (off the one captured path) and the inventory gate (no
// fragment is a full line). Extraction method: mechanical scan of the
// (gitignored, local-only) zork1/*.zil — <TELL "..." D ,PRSO "..."> single-line
// splices in gverbs.zil/1actions.zil, the DESCRIBE-OBJECT/PRINT-CONT listing
// engine, and the gparser.zil WHICH-PRINT + orphan prompts (recon 2026-06-23).
//
// A reviewer audits every tag by reading THIS file. The gate
// (composed-lines.test.ts) re-verifies each `en` against the committed story
// file in CI (skeleton fidelity), so a mis-transcribed skeleton fails the suite
// rather than green-lighting a leak.

/** How the gate generates fills for one slot. */
export type Binding =
  | 'all-objects' // generic response; drive the language-independent UNION object set
  | { readonly objects: readonly string[] } // line names fixed object(s); drive those
  | { readonly sample: string } // {raw}/{verb} passthrough: one representative token

export interface Family {
  /** Normalized EN skeleton, EXACTLY as the game renders it (slot tokens:
   *  {obj} {obj2} {obj3} {obj4} {num} {num2} {raw} {verb}). INVARIANT: never
   *  model a composed line as a fully-resolved literal — the runtime-spliced
   *  parts (object names, verbs, contents) are NOT contiguous in the decoded
   *  story file, so a literal `en` would false-FAIL skeleton fidelity. Model
   *  every spliced part as a slot; the gate substitutes a concrete fill before
   *  calling matchLine, while fidelity checks only the real literal fragments. */
  readonly en: string
  /** `'reachable'` = asserted by the gate. `{ deferred: '<gating verb>' }` =
   *  listed only; the string NAMES the exotic verb that gates it so the
   *  deferral is auditable, not a vibe (spec Finding 3). Bias to `'reachable'`
   *  when unsure — driving a rarely-reached family is harmless; missing a
   *  reachable one is the leak. */
  readonly reach: 'reachable' | { readonly deferred: string }
  /** Provenance: ZIL site, retired-UAT id, ka rung used, any case compromise. */
  readonly note: string
  /** ≤1 object slot (bound `all-objects` or `{objects}`) + fixed {raw}/{verb}
   *  `{sample}` slots. The gate drives the object axis: `ka` over the union set,
   *  `fr/de/es` over one representative (decision 2). Mutually exclusive with
   *  `instances`. */
  readonly bindings?: Readonly<Record<string, Binding>>
  /** Multi-slot families that aren't independent: explicit {token: fill} tuples
   *  (representative instances, not a cross-product — decision: arity). */
  readonly instances?: ReadonlyArray<Readonly<Record<string, string>>>
}

export const COMPOSED_FAMILIES: readonly Family[] = [
  // ── Seed: the 7 cross-language pins absorbed from composed-lines.uat.test.ts
  //    (UAT 2026-06-19/20). Their templates already ship, so they gate GREEN.

  // C: open-mailbox reveal — the first command most players type. Modeled with
  //    SLOTS (not a resolved literal — see the en INVARIANT): the game composes
  //    "Opening the "+obj+" reveals "+contents, so a literal `en` would
  //    false-FAIL fidelity. {raw} stands in for the composed contents pending the
  //    listing-engine group (Task 6).
  {
    en: 'Opening the {obj} reveals {raw}.',
    reach: 'reachable',
    note: 'UAT-C 2026-06-19. gverbs.zil V-OPEN reveal. obj=small mailbox, contents sample "a leaflet". Fill = the exact UAT line (matches today\'s corpus pin) while fidelity sees the real "Opening the"/"reveals" fragments.',
    bindings: { obj: { objects: ['small mailbox'] }, raw: { sample: 'a leaflet' } },
  },
  // D: per-object FAILURE reasons in `take all` (gverbs.zil ITAKE).
  {
    en: '{obj}: The rug is extremely heavy and cannot be carried.',
    reach: 'reachable',
    note: 'UAT-D 2026-06-19. Multi-take failure label; names the carpet only.',
    bindings: { obj: { objects: ['carpet'] } },
  },
  {
    en: '{obj}: The trophy case is securely fastened to the wall.',
    reach: 'reachable',
    note: 'UAT-D 2026-06-19. Multi-take failure label; names the trophy case only.',
    bindings: { obj: { objects: ['trophy case'] } },
  },
  // E: incomplete-`put` orphan prompt (gparser.zil). Modeled with the {verb}
  //    slot from the START (not the literal "put the", which would false-FAIL
  //    fidelity — "put" is runtime-spliced). The gate substitutes {verb}->put
  //    before matchLine, so this still hits the literal put-in template that
  //    ships TODAY (no {verb} slot needed yet); Task 4 generalizes that template.
  //    {raw} is the player's ECHOED noun — a lexicon-emit synonym, NOT an object
  //    key — to exercise the path that bit the E-pin.
  {
    en: 'What do you want to {verb} the {raw} in?',
    reach: 'reachable',
    note: 'UAT-E 2026-06-20. {verb} sample "put"; {raw} sample is the emit synonym "advertisement" (not an object key). This IS the with-prep in-family (Task 4 adds with + no-noun, not this one).',
    bindings: { verb: { sample: 'put' }, raw: { sample: 'advertisement' } },
  },
  // F: WEAR-verb failure (`put X on` resolves to wear).
  {
    en: "You can't wear the {obj}.",
    reach: 'reachable',
    note: 'UAT-F 2026-06-20. gverbs.zil V-WEAR. Object-agnostic; ka drops the noun (rung 3). Drives the union object set.',
    bindings: { obj: 'all-objects' },
  },
  // G: closed-container (`put X in <closed container>`).
  {
    en: "The {obj} isn't open.",
    reach: 'reachable',
    note: 'UAT-G 2026-06-20. gverbs.zil. ka reuses the reviewed "დახურულია" predicate. Drives the union object set.',
    bindings: { obj: 'all-objects' },
  },
]

/** fr/de/es families deliberately routed to the LLM instead of a shared
 *  template. EACH entry REQUIRES a non-empty `why` (the gate asserts it). `ka`
 *  is never exempt — it has no LLM net. Empty at seed. */
export const EXEMPTIONS: Readonly<
  Record<'fr' | 'de' | 'es', ReadonlyArray<{ en: string; why: string }>>
> = {
  fr: [],
  de: [],
  es: [],
}

/** Deferred families (exotic-verb tail), by `en`. The gate asserts the deferred
 *  set equals this list, so adding/removing a deferral updates a VISIBLE,
 *  reviewed list (honesty) without printing to stdout (CLAUDE.md: tests stay
 *  pristine). Empty at seed. */
export const EXPECTED_DEFERRED: readonly string[] = []

/** Floor on the reachable-family count. RAISE when you add families; NEVER
 *  lower. Guards against a refactor silently emptying the inventory (spec
 *  honesty). Seed = 6 families (the two E-pins are one put-in family). */
export const REACHABLE_FLOOR = 6

/** Skeleton-fidelity escape hatch for `extractStrings` ANCHORING MISSES only:
 *  a distinctive span that is verified-correct game text (read in the local ZIL /
 *  seen in play) but absent from the anchored decode. NOT for transcription bugs
 *  (re-model spliced parts as slots) — each entry needs an inline `// why:` ZIL
 *  citation. Empty by default; adding one is a deliberate, reviewed exception. */
export const FIDELITY_ALLOW: readonly string[] = []
```

- [ ] **Step 2: Typecheck the new file**

Run: `make typecheck`
Expected: PASS (no type errors; the file is data + types only).

- [ ] **Step 3: Commit**

```bash
git add src/translate/corpus/composed-families.ts
git commit -m "feat(translate): seed composed-line family inventory (7 absorbed UAT pins)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: The gate (`composed-lines.test.ts`)

Build the full gate against the 7-pin seed. It must go GREEN (the seed's templates already ship), proving fidelity + per-language drive + meta-tests end-to-end.

**Files:**
- Create: `src/translate/corpus/composed-lines.test.ts`

- [ ] **Step 1: Write the gate**

```typescript
// src/translate/corpus/composed-lines.test.ts
//
// Systematic gate for runtime-COMPOSED display lines (spec
// 2026-06-23-loquor-composed-line-gate-design). Absorbs + replaces
// composed-lines.uat.test.ts. Pure: committed corpus data + match.ts + the
// committed story file's decoded strings (skeleton fidelity, like
// inventory.test.ts) — no ZIL, no VM, no network.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { extractStrings, displayLines } from '../../../scripts/lib/zstrings.mjs'
import { compileCorpus, matchLine } from '../match'
import type { CompiledCorpus } from '../match'
import { corporaFor } from './index'
import { ZORK1_SIG } from '../../llm/grammar/index'
import {
  COMPOSED_FAMILIES,
  EXEMPTIONS,
  EXPECTED_DEFERRED,
  FIDELITY_ALLOW,
  REACHABLE_FLOOR,
  type Family,
} from './composed-families'

const LANGS = corporaFor(ZORK1_SIG) // [{ code, corpus }] for fr/es/de/ka
const COMPILED = new Map<string, CompiledCorpus>(
  LANGS.map(l => [l.code, compileCorpus(l.corpus)]),
)
// Language-INDEPENDENT object set: the union of every corpus's keys, NOT ka's
// own table — so an object missing from ka surfaces as a MISS (decision 2).
const UNION_OBJECTS = [
  ...new Set(LANGS.flatMap(l => Object.keys(l.corpus.objects))),
]

const isReachable = (f: Family) => f.reach === 'reachable'
const REACHABLE = COMPOSED_FAMILIES.filter(isReachable)

const GEORGIAN = /\p{Script=Georgian}/u
const GLUE_FLOOR = 4 // skip trivial spans (" the ", "?", ": ") — they match anything

// Skeleton-fidelity haystack (spec Finding 1): the decoded story strings as
// display lines (normalized exactly like the runtime, via displayLines — the
// same pair inventory.test.ts uses), joined. A composed line is glued from
// sub-fragments, so we check each DISTINCTIVE literal span is a substring of real
// game text. displayLines collapses intra-fragment whitespace to match a
// normalized span, and keeps fragment boundaries so a single-line span can't
// false-match across two fragments.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const buf = new Uint8Array(readFileSync(resolve(repoRoot, 'public/games/zork1.z3')))
const HAYSTACK = displayLines(extractStrings(buf)).join('\n')

/** A skeleton's distinctive literal spans, longer than the trivial-glue floor.
 *  Two normalizations keep the substring check honest without false-failing:
 *   - split on slots AND the runtime listing joins (`,` / ` or ` / ` and `) so a
 *     span never straddles a join the game inserts at runtime — otherwise a
 *     disambiguation span like "do you mean, the" (decoded fragment is just "do
 *     you mean") would false-fail. Splitting a contiguous sentence on " and " is
 *     harmless: both halves stay substrings of that same decoded line.
 *   - strip edge punctuation, because terminal glue is composed too: "with?" =
 *     prep "with" + "?" is not one decoded fragment, and ": The rug…" carries a
 *     leading join. Stripping → "with" / "The rug…", which ARE real game text.
 *  Short prep-glue ("with") then passes trivially (it's glue, low-risk); the
 *  leak risk lives in the longer distinctive response text these pieces capture. */
function literalSpans(en: string): string[] {
  return en
    .split(/\{\w+\}|,| or | and /g)
    .map(s => s.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
    .filter(s => s.length >= GLUE_FLOOR)
}

/** Expand a family into concrete English fill lines for one language. */
function fillsFor(fam: Family, lang: string): string[] {
  const sub = (a: Record<string, string>) =>
    fam.en.replace(/\{(\w+)\}/g, (_m, t: string) => a[t] ?? `{${t}}`)
  if (fam.instances) return fam.instances.map(sub)
  const base: Record<string, string> = {}
  let objSlot: string | null = null
  let objects: readonly string[] = []
  for (const [slot, bind] of Object.entries(fam.bindings ?? {})) {
    if (bind === 'all-objects') {
      objSlot = slot
      // ka drives the WHOLE union (faithfulness); fr/de/es one representative.
      objects = lang === 'ka' ? UNION_OBJECTS : UNION_OBJECTS.slice(0, 1)
    } else if (typeof bind === 'object' && 'objects' in bind) {
      objSlot = slot
      objects = bind.objects
    } else {
      base[slot] = bind.sample
    }
  }
  if (!objSlot) return [sub(base)] // pure {raw}/{verb} family (e.g. orphan no-noun)
  return objects.map(o => sub({ ...base, [objSlot!]: o }))
}

describe('composed-line gate (spec P2.1)', () => {
  // (1) Fidelity: every skeleton is real game text (runs first, per family).
  describe.each(REACHABLE.map(f => [f.en, f] as const))(
    'fidelity: %s',
    (_en, fam) => {
      it('distinctive literal spans appear in the decoded story file', () => {
        // FIDELITY_ALLOW covers verified extraction-anchoring misses only.
        const missing = literalSpans(fam.en).filter(
          s => !HAYSTACK.includes(s) && !FIDELITY_ALLOW.includes(s),
        )
        expect(missing).toEqual([])
      })
    },
  )

  // (2) Translation drive. ka: 3 checks (non-null, !== en, has Georgian char).
  //     fr/de/es: 2 checks (non-null, !== en), skipped iff exempt.
  const asserted = new Set<string>()
  describe.each(REACHABLE.map(f => [f.en, f] as const))(
    'translate: %s',
    (_en, fam) => {
      it('every eligible (object × language) translates', () => {
        asserted.add(fam.en)
        const fails: string[] = []
        for (const { code } of LANGS) {
          if (EXEMPTIONS[code as 'fr' | 'de' | 'es']?.some(e => e.en === fam.en))
            continue
          const c = COMPILED.get(code)!
          for (const en of fillsFor(fam, code)) {
            const out = matchLine(c, en)
            if (out === null) fails.push(`${code}: MISS "${en}"`)
            else if (out === en) fails.push(`${code}: ECHO (untranslated) "${en}"`)
            else if (code === 'ka' && !GEORGIAN.test(out))
              fails.push(`ka: no Georgian char in "${out}" (for "${en}")`)
          }
        }
        expect(fails).toEqual([])
      })
    },
  )

  // (3) Honesty: deferred families match the committed list (count + names
  //     visible). Asserted, not console.log'd — tests stay pristine (CLAUDE.md).
  it('deferred families match the committed list', () => {
    const deferred = COMPOSED_FAMILIES.filter(f => !isReachable(f))
      .map(f => f.en)
      .sort()
    expect(deferred).toEqual([...EXPECTED_DEFERRED].sort())
  })

  // (4) Every exemption carries a why (the escape hatch can't be used silently).
  it('every exemption has a non-empty why', () => {
    const bad: string[] = []
    for (const [lang, list] of Object.entries(EXEMPTIONS))
      for (const e of list) if (!e.why?.trim()) bad.push(`${lang}: ${e.en}`)
    expect(bad).toEqual([])
  })

  // (5) Meta: floor — a refactor can't silently empty the data file.
  it(`reachable inventory ≥ floor (${REACHABLE_FLOOR})`, () => {
    expect(REACHABLE.length).toBeGreaterThanOrEqual(REACHABLE_FLOOR)
  })

  // (6) Meta: completeness — every reachable family was actually asserted, so a
  //     refactor can't drop entries from the loop while the inventory stays
  //     full. Registered LAST; relies on Vitest's in-file sequential default.
  it('every reachable family was asserted (no silent skip)', () => {
    expect(asserted.size).toBe(REACHABLE.length)
  })
})
```

- [ ] **Step 2: Run the gate — expect GREEN on the seed**

Run: `npx vitest run src/translate/corpus/composed-lines.test.ts`
Expected: PASS. All 6 seed families translate in fr/de/es/ka; fidelity passes because C and E are modeled with **slots, not resolved literals**, so the checked spans are the real fragments — `"Opening the"`, `"reveals"`, `"The rug is extremely heavy and cannot be carried"`, `"You can't wear the"`, `"isn't open"`, `"What do you want to"` — every one verified present in the decode; floor (6) and completeness (6) pass.

If a fidelity span MISSES, first check whether the skeleton models a runtime-spliced part as a literal (the `en` INVARIANT) — re-model it as a slot. Only if the skeleton is already fully slotted is the literal text itself wrong: fix the `en` to the game's exact wording (re-decode with the Task-5 Step-1 snippet). Either way, do not loosen the check. (Rare exception — an extraction-anchoring miss, not a transcription bug — is covered in Task 5 Step 1.)

- [ ] **Step 3: Commit**

```bash
git add src/translate/corpus/composed-lines.test.ts
git commit -m "feat(translate): systematic composed-line gate (fidelity + per-lang drive + meta)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Add the `{verb}` match-only slot to `match.ts`

The with-prep orphan template needs a **second open wildcard** (the verb) alongside `{raw}` (the noun), exactly as `{obj2}` exists to hold a second object slot. `{verb}` is **matched but never rendered** — no language echoes it (output is verb-neutral generic), so this is the minimal change: SLOT regex + the compile passthrough branch. **`OUT_REF` is NOT touched.** TDD first.

**Files:**
- Modify: `src/translate/match.ts:28` (SLOT), `:94-97` (compile else branch)
- Test: `src/translate/match.test.ts` (create if absent)

- [ ] **Step 1: Write failing unit tests for the `{verb}` slot**

```typescript
// src/translate/match.test.ts  (append if the file exists)
import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from './match'
import type { TranslationCorpus } from './types'

const corpus = (templates: TranslationCorpus['templates']): TranslationCorpus => ({
  strings: {},
  objects: {},
  templates,
})

describe('{verb} match-only slot', () => {
  it('matches a verb wildcard and coexists with {raw}; {verb} is dropped from out', () => {
    const c = compileCorpus(
      corpus([
        { en: 'What do you want to {verb} the {raw} with?', out: 'N={raw}' },
      ]),
    )
    // {verb} is consumed by the regex (so the line resolves) but not rendered.
    expect(
      matchLine(c, 'What do you want to attack the troll with?'),
    ).toBe('N=troll')
  })

  it('keeps a MULTI-WORD {raw} anchored by the literal prep', () => {
    const c = compileCorpus(
      corpus([
        { en: 'What do you want to {verb} the {raw} with?', out: 'N={raw}' },
      ]),
    )
    // The hazard the literal prep prevents: raw must be "brass lantern", not "brass".
    expect(
      matchLine(c, 'What do you want to attack the brass lantern with?'),
    ).toBe('N=brass lantern')
  })

  it('renders a fixed, verb-less out for the no-noun orphan', () => {
    const c = compileCorpus(
      corpus([{ en: 'What do you want to {verb}?', out: 'FIXED' }]),
    )
    expect(matchLine(c, 'What do you want to take?')).toBe('FIXED')
  })

  it('still throws on a duplicated slot (rule preserved)', () => {
    expect(() =>
      compileCorpus(corpus([{ en: '{verb} and {verb}', out: 'x' }])),
    ).toThrow(/repeated slot/)
  })
})
```

- [ ] **Step 2: Run the tests — verify they FAIL**

Run: `npx vitest run src/translate/match.test.ts -t "verb"`
Expected: FAIL. `{verb}` is not in SLOT, so it's treated as a literal `"{verb}"` and the lines don't match (`matchLine` returns `null`).

- [ ] **Step 3: Add `verb` to the SLOT regex**

In `src/translate/match.ts`, change line 28:

```typescript
const SLOT = /\{(obj[234]?|num2?|raw|verb)\}/g
```

- [ ] **Step 4: Generalize the compile passthrough branch**

In `compile()`, replace the final `else` branch (currently hardcoding `(?<raw>.+?)`):

```typescript
      else {
        // {raw} and {verb}: open passthrough wildcards with distinct group names
        // (the at-most-once rule still holds; verb may co-occur with raw). {verb}
        // is match-only — no `out` references it (OUT_REF is unchanged). Both
        // count as "loose" for the specificity tie-break, so a resolved {obj}
        // still wins on equal literals.
        rawCount++
        src += `(?<${slot}>.+?)`
      }
```

`OUT_REF` stays exactly as-is — `{verb}` is never on an `out` side, so nothing to add. (If a future template *did* want to echo the verb, that's when you'd extend `OUT_REF`; YAGNI until then.)

- [ ] **Step 5: Run the `{verb}` tests — verify they PASS**

Run: `npx vitest run src/translate/match.test.ts -t "verb"`
Expected: PASS (all four).

- [ ] **Step 6: Run the full matcher + corpus suites — no regressions**

Run: `npx vitest run src/translate/`
Expected: PASS. The SLOT/compile change is additive; existing `{raw}`/`{obj}`/`{num}` behavior is unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/translate/match.ts src/translate/match.test.ts
git commit -m "feat(translate): add {verb} passthrough slot for orphan-prompt templates

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Orphan-prompt family — confirm reachable preps, then template

The novel runtime-dependent family. First confirm WHICH preps actually orphan (static `gsyntax` overstates — committed UAT shows `put…on`→WEAR and `put…under/behind`→unparsed). Then add per-prep `{verb}` templates + the no-noun template, all four languages, `ka` `NATIVE-REVIEW-DRAFT`.

**Files:**
- Modify: `src/translate/corpus/zork1.{ka,fr,de,es}.templates.ts`
- Modify: `src/translate/corpus/composed-families.ts`

- [ ] **Step 1: Confirm the reachable orphan preps (dev-only, local ZIL/play)**

Two-object prep syntaxes exist for many standard-set verbs (`PUT…IN/ON/UNDER/BEHIND`, `DROP…IN/ON`, `MOVE…WITH/TO`, `STRIKE…WITH` = attack, `CUT…WITH`, `TURN…TO`, `TIE…TO`). For each, decide whether the *first-object-only* input ORPHANS (asks "What do you want to … {prep}?") vs resolves to another verb vs errors. Confirm by reading the action routine, or by playing:

Run (manual, optional): `make dev`, then in the game try e.g. `put lamp` / `attack troll` / `cut rope` / `move rug with` and observe whether the "What do you want to …?" prompt appears.

Known from committed UAT 2026-06-20 (`zork1.ka.templates.ts:103`): **`in` orphans** (shipped), **`on`→WEAR** (not an orphan; already templated as "You can't wear the {obj}."), **`under`/`behind`→"That sentence isn't one I recognize."** (not an orphan — do NOT template). Confirm **`with`** orphans (attack/cut/strike) before authoring it. Record the confirmed prep set in a comment; author only confirmed preps. The gate's red output is the backstop if a later prep proves reachable.

- [ ] **Step 2: Add the new orphan families to `composed-families.ts` (un-filled → RED)**

The `{verb}…in?` family already exists (it's the seed E entry, re-modeled with the `{verb}` slot in Task 1). Do NOT re-add it. Append only the two NEW shapes — the `with` prep and the no-noun variant:

```typescript
  // ── Orphan parser prompt (gparser.zil:759-774, decision 7). The GAME builds it
  //    as "What do you want to " + verb + [" the " + typed-noun] + [" " + prep] +
  //    "?". {verb}/{raw} capture the player's echoed tokens for MATCHING; the
  //    translated `out` is verb-neutral generic (drops both). One template PER
  //    confirmed prep covers every orphaning verb (leak-safe for ka). The in-prep
  //    family is the seed E entry above.
  {
    en: 'What do you want to {verb} the {raw} with?',
    reach: 'reachable',
    note: 'Orphan, prep=with (attack/cut/strike). Confirmed reachable Task 4 Step 1. Verb-neutral out → no ka case problem (drops the noun), NATIVE-REVIEW-DRAFT.',
    bindings: { verb: { sample: 'attack' }, raw: { sample: 'troll' } },
  },
  {
    en: 'What do you want to {verb}?',
    reach: 'reachable',
    note: 'Orphan no-noun variant. Generic verb-less out in every language (player verb is on-screen). {verb} matched but not rendered.',
    bindings: { verb: { sample: 'take' } },
  },
```

No seed entry is deleted (E is already the `{verb}…in?` family). The seed's 6 reachable families plus these 2 new ones makes 8 — raise the hand-set `REACHABLE_FLOOR` from 6 to 8.

- [ ] **Step 3: Run the gate — expect RED, naming the leaking cells**

Run: `npx vitest run src/translate/corpus/composed-lines.test.ts`
Expected: FAIL — but only for the two NEW families. The `{verb}…in?` family stays GREEN (the gate substitutes `{verb}`→`put` before matchLine, so its fill `"…put the advertisement in?"` still matches the literal put-in template that ships today). The `{verb}…with?` and `{verb}?` fills (`"…attack the troll with?"`, `"…take?"`) have no template → MISS in every language. The failure messages ARE the worklist: `ka: MISS "What do you want to attack the troll with?"`, etc.

- [ ] **Step 4: Author the orphan templates — all four languages**

For each language's `zork1.<lang>.templates.ts`, replace the existing `What do you want to put the {raw} in?` template with the generalized `{verb}` versions. All drafts are **verb-neutral generic** (drop both the verb and the noun, like the shipped house style — `Où voulez-vous le mettre ?` etc.); `{verb}`/`{raw}` stay on the `en` side for matching only:

`zork1.fr.templates.ts`:
```typescript
  { en: 'What do you want to {verb} the {raw} in?', out: 'Où voulez-vous le mettre ?' },
  { en: 'What do you want to {verb} the {raw} with?', out: 'Avec quoi voulez-vous le faire ?' },
  { en: 'What do you want to {verb}?', out: 'Que voulez-vous faire ?' },
```

`zork1.de.templates.ts`:
```typescript
  { en: 'What do you want to {verb} the {raw} in?', out: 'Wohin möchtest du es legen?' },
  { en: 'What do you want to {verb} the {raw} with?', out: 'Womit möchtest du es tun?' },
  { en: 'What do you want to {verb}?', out: 'Was möchtest du tun?' },
```

`zork1.es.templates.ts`:
```typescript
  { en: 'What do you want to {verb} the {raw} in?', out: '¿Dónde quieres ponerlo?' },
  { en: 'What do you want to {verb} the {raw} with?', out: '¿Con qué quieres hacerlo?' },
  { en: 'What do you want to {verb}?', out: '¿Qué quieres hacer?' },
```

`zork1.ka.templates.ts` — put ALL new composed-line `ka` drafts (this orphan group and every group in Tasks 5–8) inside ONE sentinel-delimited section so the marker test (Step 5) can gate them as a block. The `…in?` line replaces the shipped literal put-in `out` (reuse its exact reviewed Georgian `რაში გსურთ მისი ჩადება?` so the existing marker-test assertion still finds it):
```typescript
  // === COMPOSED-GATE-DRAFTS (P2.1) BEGIN — NATIVE-REVIEW-DRAFT (all entries to
  //     END are machine-authored, provisional, pending native review:
  //     notes/georgian-composed-line-review.md). Verb-neutral caseless reframes:
  //     the `out` drops {verb}/{raw} (en-side for matching only), like the shipped
  //     put-in line — so ka never declines an echoed English token (§4 sidestep).
  { en: 'What do you want to {verb} the {raw} in?', out: 'რაში გსურთ მისი ჩადება?' },
  { en: 'What do you want to {verb} the {raw} with?', out: 'რით გსურთ მისი გაკეთება?' },
  { en: 'What do you want to {verb}?', out: 'რისი გაკეთება გსურს?' },
  // === COMPOSED-GATE-DRAFTS (P2.1) END ===
```
Later groups (Tasks 5–8) append their `ka` drafts INSIDE this section (before the END sentinel), so the whole block stays marker-gated.

`ponytail:` no language echoes the player's verb (it's on-screen already) — a verb-neutral question reads cleanly in all four and bakes no verb's meaning, so one per-prep template serves every orphaning verb. The native reviewer decides the final ka wording.

- [ ] **Step 5: Extend the marker gate to cover the new `ka` drafts**

`ka-native-review-draft.test.ts` today only checks two hardcoded entries, so it would NOT catch an unmarked new draft. Add a section-aware assertion (and a pinned outside-count so a draft can't leak past the section). Append to its `describe`:

```typescript
  // Composed-line gate drafts (P2.1) live in ONE sentinel-delimited section; the
  // whole block is NATIVE-REVIEW-DRAFT. Guard: the section exists and is marked,
  // AND no Georgian `out` leaks OUTSIDE it (outside-count is pinned to the total
  // present before this section — RAISE only when a line is genuinely reviewed).
  it('zork1.ka.templates.ts: composed-line drafts are sectioned and marker-gated', () => {
    const rel = './zork1.ka.templates.ts'
    const lines = read(rel)
    const begin = lines.findIndex(l => l.includes('COMPOSED-GATE-DRAFTS (P2.1) BEGIN'))
    const end = lines.findIndex(l => l.includes('COMPOSED-GATE-DRAFTS (P2.1) END'))
    expect(begin, 'expected the COMPOSED-GATE-DRAFTS BEGIN sentinel').toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(begin)
    expect(lines[begin]).toContain(MARKER) // the BEGIN sentinel carries the marker
    const inSection = lines.slice(begin, end + 1).filter(l => GEORGIAN.test(l)).length
    expect(inSection, 'the drafts section should hold Georgian out lines').toBeGreaterThan(0)
    const outside = lines.filter((l, i) => GEORGIAN.test(l) && (i < begin || i > end)).length
    // Set to the Georgian-out count present BEFORE this section (the pre-existing
    // reviewed corpus + the two earlier-this-branch drafts). Pin it, don't derive.
    expect(outside).toBe(PRE_SECTION_KA_GEORGIAN)
  })
```

Add `const PRE_SECTION_KA_GEORGIAN = <count>` near the top of the file — set it once to the actual Georgian-`out` line count outside the section (read it off the green run). The two pre-existing `it`s (disambiguation, incomplete-put) stay; the incomplete-put one still finds `რაში გსურთ მისი ჩადება` (now inside the section, still marker-governed via the BEGIN sentinel within the WINDOW, or move that assertion under this section check).

- [ ] **Step 6: Run the gate + marker test — expect GREEN**

Run: `npx vitest run src/translate/corpus/composed-lines.test.ts src/translate/corpus/ka-native-review-draft.test.ts`
Expected: PASS. Each orphan line translates (non-null, ≠ en, Georgian char present for ka); fidelity passes (`"What do you want to"` is a real decoded fragment); the new `ka` drafts are sectioned and marker-gated.

- [ ] **Step 7: Run the existing UAT + roundtrip suites — no regression**

Run: `npx vitest run src/translate/`
Expected: PASS. (The old `composed-lines.uat.test.ts` E-pin still asserts `What do you want to put the {raw} in?` translates — the generalized template still matches it.)

- [ ] **Step 8: Commit**

```bash
git add src/translate/corpus/composed-families.ts src/translate/corpus/zork1.*.templates.ts src/translate/corpus/ka-native-review-draft.test.ts
git commit -m "feat(translate): generalize orphan-prompt templates with {verb} passthrough (4 langs)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: The per-family-group authoring loop (recipe + worked example)

The remaining reachable families (the listing engine, the reachable single-line object-splice families, the WHICH-PRINT disambiguation) are added **one group per commit**, red→green, using the gate's red output as the worklist. This task defines the exact repeatable loop and works one group end-to-end. Repeat it for each group in Tasks 6–8.

> **Why a recipe, not 40 inlined translations:** the per-object/per-family Georgian is `NATIVE-REVIEW-DRAFT` data entry that must respect the language (this is a gift to Georgian colleagues, not a fabrication exercise). The gate *generates* the exact worklist of leaking cells; the executor fills each with the laziest correct rung (below) and flags it for review. The engineering — the gate that makes a leak impossible to miss — is what Tasks 1–4 nailed.

**The loop (per group):**

- [ ] **Step 1: Recon the group's exact skeletons from the committed story file (dev-only)**

Decode the real fragments so skeletons are byte-exact (fidelity depends on it):

```bash
node --input-type=module -e '
import { readFileSync } from "node:fs";
import { extractStrings, displayLines } from "./scripts/lib/zstrings.mjs";
const buf = new Uint8Array(readFileSync("public/games/zork1.z3"));
const RE = new RegExp(process.argv[1] ?? "", "i");   // pass the group pattern as an arg
for (const l of displayLines(extractStrings(buf)))
  if (RE.test(l)) console.log(JSON.stringify(l));
' "contains:|consists of|reveals"     # ← swap in this group'"'"'s distinctive words
```

Cross-check the routing (which verb prints which `<TELL>`) in the local `zork1/gverbs.zil` / `zork1/1actions.zil` to assign `reach`, `bindings`, and `note`.

**Extraction-anchoring caveat (review [5]):** `extractStrings` is *anchored*, not exhaustive (it scans packed-address + inline-print anchors, not every byte), so a rare CORRECT distinctive span can be absent from the decode — an anchoring miss, **not** a transcription bug. If a fidelity span fails but you've VERIFIED the wording is real game text (read it in the local ZIL or saw it in play), do **not** reword correct game text to satisfy the check: add that one fragment to a committed `FIDELITY_ALLOW: readonly string[]` in `composed-families.ts` (the gate skips allow-listed spans) with an inline `// why:` citing the ZIL site. Reach for this only after confirming it's an anchoring miss; the `en`-INVARIANT (model spliced parts as slots) resolves the common case.

- [ ] **Step 2: Add the group to `composed-families.ts`, tagged but un-filled**

Append the group's `Family` entries. Tag each `reach`: `'reachable'` if a standard-set verb (`take/drop/open/close/examine/read/wear/turn on/turn off/put/attack/move/enter`) can emit it OR it's structural (listing engine, parser prompts); else `{ deferred: '<gating exotic verb>' }`. **Bias to `reachable` when unsure.** Add every `deferred` family's `en` to `EXPECTED_DEFERRED`. Choose `bindings` (single object axis) or `instances` (multi-slot reps).

- [ ] **Step 3: Run the gate — RED. The failures are the worklist.**

Run: `npx vitest run src/translate/corpus/composed-lines.test.ts`
Expected: FAIL, listing each `(family × object × language)` cell that MISSES or ECHOES.

- [ ] **Step 4: Fill `ka` with the laziest correct rung (decision ladder)**

Per family, in `zork1.ka.templates.ts` (or `zork1.ka.strings.ts` for pins):
1. **One case-safe template** (preferred) — if the frame keeps the noun NOMINATIVE (subject of არის, bare listing entry, caseless label). Covers every object at once.
2. **Per-object string pins** (`zork1.ka.strings.ts`) — only for the objects whose case the citation form can't supply (plurals, case-shifters). The per-object drive reveals exactly which.
3. **Drop-the-noun reframe** — caseless object-agnostic sentence (the `ამაში…` / `მისი…` technique). Used sparingly.

Everything authored is `NATIVE-REVIEW-DRAFT`. Add every new `ka` template draft **inside the `COMPOSED-GATE-DRAFTS` section** (before the END sentinel, from Task 4) so the marker gate covers it with no test edit. Prefer rung-1 (sectioned templates). If a rung-2 string pin in `zork1.ka.strings.ts` is unavoidable, open a matching `COMPOSED-GATE-DRAFTS` sentinel section there too and add a parallel section-check to `ka-native-review-draft.test.ts` (same pattern as Task 4 Step 5) — so no draft, template or pin, is ever unmarked. Where rung-1 case-correctness is uncertain, choose safe-but-stiff over natural-but-wrong and flag it.

- [ ] **Step 5: Fill any RED `fr/de/es` cell**

Default: author the cheap generic template (deterministic beats the LLM — instant + offline; CLAUDE.md requires deterministic coverage for every applicable language). Only add an `EXEMPTIONS[lang]` entry (with a non-empty `why`) when the family is *genuinely* better served by the LLM (e.g. per-object agreement a shared template would get wrong). Most reachable families are already covered (fr 252 / de 312 / es 311 templates), so expect a handful of fills.

- [ ] **Step 6: Run the gate + marker test — GREEN. Raise `REACHABLE_FLOOR` by the group's reachable count.**

Run: `npx vitest run src/translate/corpus/composed-lines.test.ts src/translate/corpus/ka-native-review-draft.test.ts`
Expected: PASS (gate green; new `ka` drafts inside the marker section). Then bump the hand-set `REACHABLE_FLOOR` in `composed-families.ts` to the new reachable total (never lower).

- [ ] **Step 7: Commit the group**

```bash
git add src/translate/corpus/composed-families.ts src/translate/corpus/zork1.ka.* src/translate/corpus/zork1.*.templates.ts
git commit -m "feat(translate): gate <group name> composed-line family group (4 langs)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Worked example — the WHICH-PRINT disambiguation family

`gparser.zil` builds `Which {raw} do you mean, the {obj}, the {obj2}, …?` by looping 2–4 candidates. ka already templates the 4-candidate form (`zork1.ka.templates.ts:85`). Add the **2- and 3-candidate** arities as instance-driven families (they're separate composed lines):

- [ ] **Worked Step A: Recon** — confirm the exact 2/3-candidate strings:

```bash
node --input-type=module -e '
import { readFileSync } from "node:fs";
import { extractStrings, displayLines } from "./scripts/lib/zstrings.mjs";
const buf = new Uint8Array(readFileSync("public/games/zork1.z3"));
for (const l of displayLines(extractStrings(buf))) if (/do you mean/i.test(l)) console.log(JSON.stringify(l));
'
```

Note: the joiners (`", "` / `" or "`) are runtime glue, so the full 2/3-candidate lines won't appear as decoded fragments — only `"do you mean"` will. That distinctive span (≥4 chars) is what fidelity checks; the comma/or joins fall under the glue floor.

- [ ] **Worked Step B: Add the families** (instance-driven — a real same-noun set: the two white houses? use the canonical dam-buttons subset for 2/3):

```typescript
  {
    en: 'Which {raw} do you mean, the {obj} or the {obj2}?',
    reach: 'reachable',
    note: 'gparser.zil WHICH-PRINT, 2-candidate arity. Real same-noun pair: the trap door vs the front door is not same-noun; use the dam buttons subset.',
    instances: [{ raw: 'button', obj: 'blue button', obj2: 'red button' }],
  },
  {
    en: 'Which {raw} do you mean, the {obj}, the {obj2}, or the {obj3}?',
    reach: 'reachable',
    note: 'gparser.zil WHICH-PRINT, 3-candidate arity. Dam buttons.',
    instances: [
      { raw: 'button', obj: 'blue button', obj2: 'red button', obj3: 'yellow button' },
    ],
  },
```

**fr/de/es (definite, not conditional):** they currently ship only the 2-candidate "book" pin, so the buttons 2-candidate and the whole 3-candidate go RED for fr/de/es. **Author the generic 2- and 3-candidate templates** for all three (deterministic beats the LLM; the shipped 4-candidate template already proves the pattern). Add an `EXEMPTIONS[lang]` entry **only** if a specific language's natural disambiguation forces per-candidate agreement a shared template gets wrong — and then with the real `why` (e.g. `'disambiguation prompt — de adjective agreement per candidate, LLM-routed, recon 2026-06-19'`). `ka` needs the templates regardless (no LLM net), so it is never exempt.

- [ ] **Worked Step C–G:** run RED → fill ka 2/3-candidate templates in `zork1.ka.templates.ts` (mirror the 4-candidate `out: 'რომელ {raw}-ს გულისხმობ — {obj.indef} თუ {obj2.indef}?'`) + fr/de/es → run GREEN → raise floor → commit. (Follow Task 5 Steps 3–7.)

---

## Task 6: Listing-engine family group

Apply the Task-5 loop to the contents/inventory listing engine (`gverbs.zil:1681–1850`): `The {obj} contains:`, `Sitting on the {obj} is:`, `You are carrying:`, `Your collection of treasures consists of:`, `Opening the {obj} reveals {contents}`, plus the `" (providing light)"` / `" (being worn)"` tails and the `There is a {obj} here.` line. Most already ship in ka (`zork1.ka.templates.ts`), so this group mostly *registers + verifies* existing coverage and surfaces gaps. Multi-slot reveal/contents lines use `instances`. Follow Task 5 Steps 1–7; one commit.

---

## Task 7: Reachable single-line object-splice families

Apply the Task-5 loop to the `<TELL "…" D ,PRSO "…">` single-line families (`gverbs.zil`, `1actions.zil`). This is the largest area (the recon's 124 distinct splice families, **most of which are the deferred exotic-verb tail**). Do NOT do it as one paragraph — commit it as **four explicit sub-groups**, one commit each (Task-5 loop per sub-group). The reachable subset is expected to be ~20–30 families; the rest are deferred. Sub-grouping + rough counts (refine from the recon, log the actual split):

- [ ] **7a — State/idempotent lines (~8):** `The {obj} is already open.`, `…already closed.`, `…is now on.`/`…off.`, `The {obj} opens.`, `The {obj} is closed.`, `The {obj} is open.` Object-agnostic (`all-objects`).
- [ ] **7b — Container/placement failures (~6):** `The {obj} isn't open.` (seed G — already in), `The {obj} is already in the {obj2}.`, `You can't put the {obj} in the {obj2}.`, the closed/full-container refusals. Multi-object → `instances`.
- [ ] **7c — Multi-command labels (~6):** the `<obj>: <outcome>` lines from `take all`/`drop all` — `{obj}: Taken.`/`Dropped.` (shipped) plus the per-object FAILURE reasons (seed D's rug/trophy already in; add the rest the recon finds). `string[]`/`all-objects` per line.
- [ ] **7d — Deferred exotic-verb tail (LISTED, not filled):** the joke-insult and exotic-verb splices (`mung`, `` ` ``-prefixed, `pray`, `send for`, …). Tag each `{ deferred: '<gating verb>' }`, add its `en` to `EXPECTED_DEFERRED`. **`log` the count in the commit message** (e.g. "94 deferred families listed"). This sub-group authors NO translations — it only populates the inventory's deferred section so the honesty test (`deferred families match the committed list`) stays meaningful.

Bias `reach` to `reachable` when unsure (§Family classification). Follow Task 5 Steps 1–6 per sub-group; commit each (7a–7d) separately.

---

## Task 8: Sweep — close the loop against the walkthrough

Catch any reachable composed family the manual recon missed.

- [ ] **Step 1: Cross-check the walkthrough's composed lines are now gated**

The coverage gate already proves the 350/350 path translates. Confirm no *composed* line on that path is merely passing via a one-off string pin that the inventory misses for other objects: for each `output`/`room` line in `walkthroughLines()` that contains an object name, verify its family is in `COMPOSED_FAMILIES`. (Manual audit, or a temporary dev assertion — do not commit a VM-dependent test; the gate stays pure.)

- [ ] **Step 2: Add any missing reachable families** via the Task-5 loop. Commit.

- [ ] **Step 3: Final floor raise**

Set `REACHABLE_FLOOR` to the final reachable-family count. Run the gate; confirm `reachable inventory ≥ floor` and `every reachable family was asserted` both pass with the final count.

Run: `npx vitest run src/translate/corpus/composed-lines.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/translate/corpus/composed-families.ts
git commit -m "feat(translate): finalize composed-line inventory floor + walkthrough sweep

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Retire `composed-lines.uat.test.ts`

Its 7 pins now live in the inventory + gate.

- [ ] **Step 1: Confirm every UAT pin is covered by the inventory**

Verify each of the 7 lines asserted in `composed-lines.uat.test.ts` has a corresponding `Family` in `composed-families.ts` (C, D×2, E, F, G — E now via the generalized `{verb}…in?` family). The gate already asserts them.

- [ ] **Step 2: Delete the file and run the suite**

```bash
git rm src/translate/corpus/composed-lines.uat.test.ts
npx vitest run src/translate/
```
Expected: PASS. No coverage lost (the gate subsumes it).

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(translate): retire composed-lines.uat.test.ts (absorbed by the gate)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Worklist + notes

The dignified "would you help us get your language exactly right?" artifacts.

**Files:**
- Create: `notes/georgian-composed-line-review.md`
- Modify: `notes/georgian-native-review-followup.md`, `notes/next.md`

- [ ] **Step 1: Write the native-review worklist**

Create `notes/georgian-composed-line-review.md`: every authored `ka` composed line, grouped by family, each with EN source, draft Georgian, rung used (1/2/3), and any case/naturalness note. Generate the list from the families authored across Tasks 4–8. Lead with one short paragraph framing it as a request for native review (this is a gift to the Georgian colleagues; the `(beta)` marker stays until they sign off).

- [ ] **Step 2: Repoint the orphan-prompt entry in `georgian-native-review-followup.md`**

Change the "Known ka raw-English leaks (deferred) → orphan prompt" entry: it is **no longer a deferred leak** — the orphan prompt is now gated and templated (Task 4). Point to the new worklist for the `NATIVE-REVIEW-DRAFT` wording review.

- [ ] **Step 3: Update `notes/next.md`**

Mark P2.1 **done**; point to `composed-lines.test.ts` as the new gate; repoint any `composed-lines.uat.test.ts` references to the gate + `composed-families.ts`.

- [ ] **Step 4: Commit**

```bash
git add notes/georgian-composed-line-review.md notes/georgian-native-review-followup.md notes/next.md
git commit -m "docs(notes): Georgian composed-line review worklist; P2.1 done

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full suite + lint + types**

Run: `make all`
Expected: PASS (lint, format, typecheck, full vitest). No stray `console.*`/`act()` warnings on stderr (CLAUDE.md: tests stay pristine — the gate asserts the deferred list, it does not print it).

- [ ] **Step 2: Confirm the success criterion holds**

Re-read the spec's Success criterion. Confirm: every reachable composed family (listing engine + both parser prompts incl. orphan + reachable single-line splices) is asserted across fr/de/es/ka; `ka` is driven over the union object set; the deferred tail is listed in `EXPECTED_DEFERRED`; the floor + completeness meta-tests pass at the final count; **`ka-native-review-draft.test.ts` passes with every new `ka` draft inside the marker section** (no unmarked draft shipped). The `(beta)` marker and `NATIVE-REVIEW-DRAFT` worklist remain — "P2.1 done" is not "Georgian is done".

---

## Self-Review notes (carried from plan authoring)

- **Spec coverage:** Deliverables map — `composed-families.ts` (Task 1), gate + fidelity (Task 2), `{verb}` slot (Task 3), orphan templates (Task 4), exemptions + deferred honesty + meta-tests (Tasks 1–2, refined per group), Georgian fills (Tasks 4–8), worklist + notes (Task 10), retire UAT test (Task 9). Decisions 1–7 all land; Findings 1–3 implemented (fidelity in Task 2, `{verb}`/literal-prep in Tasks 3–4, deferred-verb-named + bias-to-reachable in the data model + Task 5 Step 2).
- **`ka` Georgian drafts in Tasks 4–8 are `NATIVE-REVIEW-DRAFT` data, deliberately not finalized here** — the gate generates the per-cell worklist and the native reviewer owns the wording. This is the one place the plan is a precise *recipe* rather than inlined final content, because fabricating authoritative Georgian for ~40 families would disrespect the gift.
- **Honesty deviation from spec's literal "log()":** the gate *asserts* the deferred list against `EXPECTED_DEFERRED` instead of `console.log`-ing it, to satisfy CLAUDE.md's pristine-output rule. This is strictly stronger (a changed deferral fails the suite) and keeps the count+names visible in the committed list.
- **Pushback fixes applied (subagent review, 2026-06-23, report in `paad/pushback-reviews/`):** [1 CRITICAL] C and E seed families are modeled with SLOTS, not resolved literals (verified: the literal forms false-fail fidelity — the spliced parts aren't contiguous in the decode); the `en`-INVARIANT now states this. [2 SERIOUS] new `ka` drafts are sentinel-sectioned and `ka-native-review-draft.test.ts` is extended to gate them (Task 4 Step 5; the file was previously unlisted). [3] fr/de/es disambiguation templates are authored by default (exemptions only with a real `why`). [5] `FIDELITY_ALLOW` escape hatch for verified extraction-anchoring misses. [6] Task 7 split into explicit sub-groups 7a–7d with counts. [4] REJECTED — `REACHABLE_FLOOR` stays HAND-SET (deriving it from the observed count would defeat the "refactor can't empty the data" guard); the arithmetic is verified (seed 6 → 8 after the orphan group).
