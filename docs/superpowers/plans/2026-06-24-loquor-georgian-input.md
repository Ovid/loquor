# Georgian Input (Zork I × ქართული) — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Graduate Georgian (`ka`) from read-Georgian/type-English to read-Georgian/**type-Georgian** on **Zork I only** — typed Georgian imperatives parse deterministically (grammar-only, no LLM ever) to canonical English commands, with English-ASCII raw-send kept and an abstain + escape hatch for misses.

**Architecture:** Reuse the proven fr/de/es deterministic input pipeline (`src/llm/lexicon/parse.ts`, `translatePipeline.ts`) **unchanged in behavior**. Add Georgian as **data + one gated pre-stage** (`expandGeorgian`): a closed postposition-split + nominative-`-ი` strip that runs only when `core.postpositions` is present (i.e. only `ka`). All four runtime input sites (lex memo, Terminal route, placeholder, activation notice) gate on a single shared `kaInputActive(lang, sig)` predicate so Zork II/III `ka` stays Phase-1 type-English. Grammar-only is forced for `ka` at the state boundary (`model: 'grammar'`), so no new dispatch predicate is needed.

**Tech Stack:** TypeScript, Vitest, React. Georgian Mkhedruli (U+10D0–10FF, single-codepoint NFC===NFD, caseless) is pass-through-safe through the existing `fold()`/`tokenize()`. All `ka` lexicon/copy data ships `NATIVE-REVIEW-DRAFT` behind the existing `(beta)` marker; a Tbilisi native-review loop refines it post-ship.

**Source of truth:** `docs/superpowers/specs/2026-06-24-loquor-georgian-input-design.md` (Phase 2 authority). Read it before starting.

---

## Open Decisions (flagged — resolve with the owner if you disagree)

**G1 — Dative "give/tie … to …" recipient (spec gap).** The spec's §2 closed-postposition model does not cover the **dative indirect object** (`-ს`: `ქურდს` thief, `მოაჯირს` railing), which `-ს` cannot be split globally for (it collides with genitive `-ის`, e.g. `სპილენძის` "brass"). But `give egg to thief` and `tie rope to railing` are **required** Zork I winning commands. **This plan resolves G1 with a bounded "dative-recipient" path** (Task 9): the closed set of Zork I "to"-recipients is listed in `KA_ZORK1` in dative form, and a scoped `verb obj recipient → verb obj to recipient` rule fires only for give/tie-class verbs. If the owner prefers the quoted-English escape hatch for these two commands (option b) or a general case-analyzer (option c, the rejected segmenter), edit Task 9 only — the rest of the plan is unaffected.

---

## File Structure

**New files:**
- `src/llm/lexicon/ka.core.ts` — `KA_CORE: CoreLexicon` (verbs, postpositions, preps, metaAliases; pronoun arrays empty).
- `src/llm/lexicon/ka.zork1.ts` — `KA_ZORK1: NounLexicon` (Zork I nouns, bare-stem forms; dative recipients for G1).
- `src/llm/lexicon/expandGeorgian.ts` — the gated pre-stage (`expandGeorgian`).
- `src/llm/lexicon/expandGeorgian.test.ts` — unit tests for the pre-stage.
- `src/llm/lexicon/parse.ka-walkthrough.test.ts` — the Georgian walkthrough-parse gate (forcing function).
- `src/llm/lexicon/parse.ka-uat.test.ts` — Georgian input-UAT pins.

**Modified files:**
- `src/llm/lexicon/types.ts` — add `postpositions?` to `CoreLexicon`; add `InputLexLang`.
- `src/llm/lexicon/parse.ts` — call `expandGeorgian` after `tokenize` (gated on `core.postpositions`); the G1 dative path.
- `src/llm/lexicon/index.ts` — re-key maps to `InputLexLang`, add `ka` (Zork I only), add `kaInputActive`.
- `src/llm/directions.ts` — Georgian direction words.
- `src/llm/directions.test.ts` — Georgian directions case.
- `src/llm/lexicon/validate.test.ts` — `ka` (Zork I-only) validation block.
- `src/llm/lexicon/roundtrip.test.ts` — add `ka` to `LANGS` with null-skip.
- `src/translate/corpus/roundtrip.test.ts` — add `ka` `Row` with a nominative-strip reduce.
- `src/translate/corpus/ka-native-review-draft.test.ts` — extend marker coverage to the `ka` input files; fix the disambiguation locator (Task 22).
- `src/llm/useModelDownload.ts` — force `model: 'grammar'` for `ka` at every model-set site.
- `src/llm/useNaturalLanguage.ts` — lex memo admits `ka` only when `kaInputActive`; activation-tip split by signature (Task 20).
- `src/llm/translatePipeline.ts` — queue bail keys on `!liveRef.current.lex` (C2), drop the `OUTPUT_ONLY_LANGS` import.
- `src/ui/Terminal.tsx` — route `ka` input via `kaInputActive`; Zork-I-gated copy; drop the now-unused `outputOnly`/`OUTPUT_ONLY_LANGS` import.
- `src/ui/Terminal.test.tsx` — invert the four `ka` tests; add the Zork II raw-send pin.
- `src/llm/notices.ts` — revise `ka` placeholder/label/abstain/activation copy; retain Phase-1 strings under new names; `escapeHatchOnActivation` takes the input flag (S1/S2).
- `src/llm/help.ts` — revise the `ka` help arm to Georgian-input semantics.
- `src/translate/corpus/zork1.ka.templates.ts` — disambiguation drop-the-noun reframe (Task 22).
- `src/translate/corpus/zork1.ka.uat.test.ts` — invert the `{raw}`-echo disambiguation pins (Task 22).

> **NOT modified (review-fix C2):** `src/llm/types.ts` — `OUTPUT_ONLY_LANGS` keeps
> `ka` (output stays corpus-only). The input decision is `kaInputActive`, never
> `OUTPUT_ONLY_LANGS`.

---

## MILESTONE A — Machinery & data (no runtime behavior change for the live app)

### Task 1: `postpositions?` field + `InputLexLang` type

**Files:**
- Modify: `src/llm/lexicon/types.ts:8` and `:54`

- [ ] **Step 1: Write the failing test**

Create `src/llm/lexicon/types.types-test.ts`:

```ts
// Compile-time shape guard for the Phase-2 type additions (spec §3.1, §5.1).
import { describe, it, expect } from 'vitest'
import type { CoreLexicon, InputLexLang, LexLang } from './types'

describe('Phase-2 lexicon types', () => {
  it('InputLexLang includes ka and is a superset of LexLang', () => {
    const fr: LexLang = 'fr'
    const ka: InputLexLang = 'ka'
    const widened: InputLexLang = fr // LexLang assignable to InputLexLang
    expect([ka, widened]).toEqual(['ka', 'fr'])
  })
  it('postpositions is an optional CoreLexicon field', () => {
    const withPost: Pick<CoreLexicon, 'postpositions'> = {
      postpositions: { ში: 'in' },
    }
    const without: Pick<CoreLexicon, 'postpositions'> = {}
    expect([withPost.postpositions?.ში, without.postpositions]).toEqual([
      'in',
      undefined,
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/llm/lexicon/types.types-test.ts`
Expected: FAIL — `InputLexLang` not exported; `postpositions` not a property of `CoreLexicon`.

- [ ] **Step 3: Add the type + field**

In `src/llm/lexicon/types.ts`, after the `LexLang` declaration (line 8) add:

```ts
/** Languages with an INPUT lexicon. `ka` has one (Phase 2) but must NEVER key the
 *  LLM machinery. The LLM-keyed maps that are STRICT Record<LexLang,…> (so a `ka`
 *  entry is a type error) are `fallbackResolve` and the prompt's per-language
 *  tables; note that `FEWSHOTS` and notices' `ByLang` already widen to optional
 *  `ka` (review S3 — the guarantee is "ka is not REQUIRED in the LLM path", not
 *  "ka is structurally impossible everywhere"). Keep new LLM maps `Record<LexLang>`. */
export type InputLexLang = LexLang | 'ka'
```

In the `CoreLexicon` interface, after `metaAliases` (line 53) add:

```ts
  /** Georgian postposition suffix (folded, hyphen-free) → canonical English prep.
   *  The English value MUST be in vocab.preps. Present only for languages whose
   *  adpositions are noun-suffixes (Georgian); absent for fr/de/es, so every
   *  expandGeorgian code path is unreachable for them (spec §3.1). */
  postpositions?: Readonly<Record<string, string>>
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run src/llm/lexicon/types.types-test.ts && make typecheck`
Expected: PASS; typecheck clean (the field is optional, so fr/de/es cores still satisfy `CoreLexicon`).

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/types.ts src/llm/lexicon/types.types-test.ts
git commit -m "feat(georgian): add InputLexLang + optional CoreLexicon.postpositions"
```

---

### Task 2: `expandGeorgian` pre-stage (pure function)

**Files:**
- Create: `src/llm/lexicon/expandGeorgian.ts`
- Create: `src/llm/lexicon/expandGeorgian.test.ts`

The contract (spec §3.2), in fixed precedence per token:
1. **Postposition split** — first, to a fixpoint, **longest-first** over the closed suffix set. If a token ends in postposition `S`, replace it with `[S, stem]` (prep token first), so the existing prep-split (`verb obj PREP ind`) fires.
2. **Nominative `-ი` strip** — second, only on a token that matched NO postposition.

- [ ] **Step 1: Write the failing test**

```ts
// src/llm/lexicon/expandGeorgian.test.ts
import { describe, it, expect } from 'vitest'
import { expandGeorgian } from './expandGeorgian'

// The closed Zork I postposition set, mirrored from KA_CORE (Task 4). Inline
// here so the unit test does not depend on the lexicon data.
const POST = { ში: 'in', ზე: 'on', ით: 'with', დან: 'from' } as const

describe('expandGeorgian', () => {
  it('strips a nominative -ი to the bare stem', () => {
    // ფანარი (lamp, nominative) → ფანარ
    expect(expandGeorgian(['ფანარი'], POST)).toEqual(['ფანარ'])
  })
  it('does not strip a vowel-final nominative', () => {
    // კალათა (basket) ends in -ა, not -ი: unchanged
    expect(expandGeorgian(['კალათა'], POST)).toEqual(['კალათა'])
  })
  it('splits a postposition before its stem (prep token first)', () => {
    // ყუთში (box-in) → [ში, ყუთ]  (so prep precedes noun)
    expect(expandGeorgian(['ყუთში'], POST)).toEqual(['ში', 'ყუთ'])
  })
  it('prefers the longest postposition (-ით over a bare -ი strip)', () => {
    // ფანრით (instrumental) → [ით, ფანრ], NEVER a -ი strip of "ფანრი"
    expect(expandGeorgian(['ფანრით'], POST)).toEqual(['ით', 'ფანრ'])
  })
  it('passes a verb token through untouched', () => {
    // აიღე (take, imperative) has no postposition/-ი: unchanged
    expect(expandGeorgian(['აიღე', 'ფანარი'], POST)).toEqual([
      'აიღე',
      'ფანარ',
    ])
  })
  it('handles a whole put-in clause', () => {
    // ჩადე X ყუთში → [ჩადე, X, ში, ყუთ]
    expect(expandGeorgian(['ჩადე', 'X', 'ყუთში'], POST)).toEqual([
      'ჩადე',
      'X',
      'ში',
      'ყუთ',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/llm/lexicon/expandGeorgian.test.ts`
Expected: FAIL — `expandGeorgian` not defined.

- [ ] **Step 3: Implement**

```ts
// src/llm/lexicon/expandGeorgian.ts
// Georgian input pre-stage (spec §3.2). Runs after tokenize, before verb
// resolution, ONLY when core.postpositions is present (i.e. only ka). For each
// token, in FIXED precedence: (1) postposition split — longest-first over the
// closed suffix set, emitting [suffix, stem] so the existing prep-split fires;
// (2) nominative -ი strip — only if no postposition matched. No stemmer, no
// general analyzer: only this fixed, closed suffix list. The -ი strip is
// gate-enforced safe for the closed Zork I noun set (round-trip + UAT pins),
// NOT provably safe in general — genuine -ი-final stems are hand-tuned in the
// lexicon (listed in both forms).
export function expandGeorgian(
  tokens: readonly string[],
  postpositions: Readonly<Record<string, string>>,
): string[] {
  // Longest-first so -ით wins over a -ი strip and over shorter suffixes.
  const suffixes = Object.keys(postpositions).sort((a, b) => b.length - a.length)
  const out: string[] = []
  for (const token of tokens) {
    const post = suffixes.find(s => token.length > s.length && token.endsWith(s))
    if (post) {
      // Emit [suffix, stem]: prep token precedes the noun (spec §3.2).
      out.push(post, token.slice(0, token.length - post.length))
      continue
    }
    // Nominative -ი strip — only when no postposition matched.
    if (token.length > 1 && token.endsWith('ი'))
      out.push(token.slice(0, -1))
    else out.push(token)
  }
  return out
}
```

> Note: the postposition split is single-pass (`[suffix, stem]`); the spec's
> "to a fixpoint" matters only for a stem that itself ends in another
> postposition, which the closed Zork I noun set does not exhibit — the
> round-trip gate (Task 8/9) proves it. If a future noun needs it, wrap the loop
> body in a `while`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/llm/lexicon/expandGeorgian.test.ts`
Expected: PASS (all 6 cases).

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/expandGeorgian.ts src/llm/lexicon/expandGeorgian.test.ts
git commit -m "feat(georgian): expandGeorgian postposition-split + nominative strip"
```

---

### Task 3: Wire `expandGeorgian` into `parseLexicon` (gated) + fr/de/es regression

**Files:**
- Modify: `src/llm/lexicon/parse.ts:8` (import), `:342` (after tokenize)
- Test: `src/llm/lexicon/parse.test.ts` (add a regression block)

- [ ] **Step 1: Write the failing test**

Add to `src/llm/lexicon/parse.test.ts` (a new describe at the end):

```ts
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import { FR_CORE } from './fr.core'
import { FR_ZORK1 } from './fr.zork1'

describe('expandGeorgian wiring (spec §3) — gated on core.postpositions', () => {
  const empty = { inScope: [], antecedent: null }
  // A minimal Georgian-shaped core: postpositions present → expandGeorgian runs.
  // NOTE გახსენი ENDS IN -ი — it exercises the C1 verb-not-mangled regression.
  const kaCore = {
    verbs: { აიღე: 'take', გახსენი: 'open' },
    verbIdioms: [],
    particleVerbs: [],
    preps: { ში: 'in' },
    articles: [],
    pronounsDirect: [],
    pronounsContainer: [],
    pronounsSelf: [],
    metaAliases: {},
    postpositions: { ში: 'in' },
  }
  const nouns = { mailbox: ['ფოსტ'] } // bare stem

  it('ka: a nominative object resolves after the -ი strip', () => {
    // ფოსტი (nominative) → ფოსტ (bare stem)
    const r = parseLexicon('აიღე ფოსტი', kaCore, nouns, ZORK1_VOCAB, empty)
    expect(r).toEqual({ kind: 'command', text: 'take small mailbox' })
  })

  it('ka: a -ი-FINAL verb is NOT mangled by the strip (review-fix C1)', () => {
    // გახსენი (open) ends in -ი; the strip MUST run after verb resolution, else
    // გახსენი → გახსენ misses the verb lookup. Object ფოსტი → ფოსტ resolves.
    const r = parseLexicon('გახსენი ფოსტი', kaCore, nouns, ZORK1_VOCAB, empty)
    expect(r).toEqual({ kind: 'command', text: 'open small mailbox' })
  })

  it('fr/de/es are byte-identical before/after (no postpositions → no expand)', () => {
    // A representative fr clause must produce exactly the same result whether or
    // not the Georgian pre-stage exists — FR_CORE has no `postpositions`.
    const r = parseLexicon(
      'ouvre la boite aux lettres',
      FR_CORE,
      FR_ZORK1,
      ZORK1_VOCAB,
      empty,
    )
    expect(r).toEqual({ kind: 'command', text: 'open small mailbox' })
  })
})
```

> If `mailbox`'s emit is not `small mailbox`, adjust the expectations to the
> actual mailbox `emit` — look it up in `src/llm/grammar/zork1.vocab.ts`. The
> point is identity, not the literal.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/llm/lexicon/parse.test.ts -t "expandGeorgian wiring"`
Expected: FAIL on the `ka` case (no expand stage yet; `ფოსტი` never reduces to `ფოსტ`).

- [ ] **Step 3: Implement the wiring**

In `src/llm/lexicon/parse.ts`, add to the imports (line 8 area):

```ts
import { expandGeorgian } from './expandGeorgian'
```

**C1 — run the pre-stage AFTER the verb is resolved, on the remainder.** Leave
`let tokens = tokenize(clause)` (line 342) UNCHANGED. Insert the `expandGeorgian`
call **after the verb-resolution block** — immediately after `if (!verb) return
MISS` (line 386) and before the "No remainder" check (line 389):

```ts
  if (!verb) return MISS

  // Georgian pre-stage (spec §3.2, review-fix C1): postposition split +
  // nominative -ი strip on the OBJECT-SPAN remainder, AFTER the verb is
  // resolved. A Georgian imperative often ends in -ი (მიეცი/მოკალი/გახსენი), so
  // stripping the WHOLE clause before verb lookup would mangle the verb into a
  // non-key and MISS with no LLM net. Only when this core declares postpositions
  // (i.e. only ka); fr/de/es have none, so this is a no-op (byte-identical).
  if (core.postpositions) tokens = expandGeorgian(tokens, core.postpositions)
```

> Verb idioms / particle verbs (lines 348–385) and the single-word verb lookup
> (line 366) all run on the RAW tokens — `KA_CORE` stores imperatives in their
> full `-ი`-bearing form, so they match before any strip. The prep merge (spec
> §3.1) is satisfied by authoring `KA_CORE.preps` to CONTAIN the postposition
> suffixes (Task 4): after `ყუთში` → `[ში, ყუთ]`, the existing prep-split reads
> `core.preps['ში'] = 'in'`. No change to the prep-split loop is required.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/llm/lexicon/parse.test.ts -t "expandGeorgian wiring"`
Expected: PASS — both the `ka` strip case and the fr byte-identical case.

- [ ] **Step 5: Run the full parse + roundtrip suites (fr/de/es untouched)**

Run: `npx vitest run src/llm/lexicon/parse.test.ts src/llm/lexicon/roundtrip.test.ts`
Expected: PASS — no fr/de/es regression.

- [ ] **Step 6: Commit**

```bash
git add src/llm/lexicon/parse.ts src/llm/lexicon/parse.test.ts
git commit -m "feat(georgian): gate expandGeorgian into parseLexicon (fr/de/es untouched)"
```

---

### Task 4: `ka.core.ts` — Georgian core lexicon (NATIVE-REVIEW-DRAFT)

**Files:**
- Create: `src/llm/lexicon/ka.core.ts`

Mirror `es.core.ts`'s shape. Every Georgian datum is folded, hyphen-free, and
`NATIVE-REVIEW-DRAFT`. `preps` SPREADS `postpositions` (the §3.1 merge) plus any
standalone preps. `articles: []` (Georgian has no articles). Pronoun arrays
empty ("it"-anaphora deferred, §8). The verb seed below covers the **35 distinct
Zork I walkthrough verbs**; Task 11 (walkthrough gate) forces any gaps to green.

- [ ] **Step 1: Write the failing test** — covered by Task 11's gate; for a fast
local check, add a temporary smoke test:

```ts
// src/llm/lexicon/ka.core.test.ts
import { describe, it, expect } from 'vitest'
import { KA_CORE } from './ka.core'

describe('KA_CORE', () => {
  it('maps core walkthrough imperatives to canonical verbs', () => {
    expect(KA_CORE.verbs['აიღე']).toBe('take') // take/get
    expect(KA_CORE.verbs['გააღე']).toBe('open')
  })
  it('postpositions are merged into preps (the §3.1 merge)', () => {
    for (const [suf, prep] of Object.entries(KA_CORE.postpositions ?? {}))
      expect(KA_CORE.preps[suf]).toBe(prep)
  })
  it('has no articles and empty pronoun arrays', () => {
    expect(KA_CORE.articles).toEqual([])
    expect(KA_CORE.pronounsDirect).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/llm/lexicon/ka.core.test.ts`
Expected: FAIL — `ka.core` not found.

- [ ] **Step 3: Author `ka.core.ts`**

```ts
// src/llm/lexicon/ka.core.ts
// Georgian (ქართული) core lexicon — Zork I imperative sublanguage (spec §4.1).
// STORED FOLDED + HYPHEN-FREE. Imperatives are aorist-stem 2sg; the direct
// object is nominative = citation form (spec §2), so NO case tables for objects.
// Only indirect/prepositional slots carry the CLOSED postposition set.
// preps SPREADS postpositions (the §3.1 merge): after expandGeorgian splits
// `ყუთში` → [ში, ყუთ], the existing prep-split reads preps['ში'] = 'in'.
//
// EVERY entry below is NATIVE-REVIEW-DRAFT (beta): model-seeded forms pending
// the Tbilisi loop (spec §9). Pronoun arrays are empty — Georgian object
// pronouns are verb suffixes, not tokens ("it" deferred, spec §8).
import type { CoreLexicon } from './types'

// Closed postposition set (spec §2/§3.1). English values MUST be vocab.preps.
// `-კენ` (toward) is OMITTED — it is a movement marker owned by directions.ts,
// not an object preposition. `-თან` (at) is included only because vocab.preps
// has 'at' (throw … at); the validate gate (Task 8) enforces the membership.
const KA_POSTPOSITIONS: Readonly<Record<string, string>> = {
  ში: 'in', // inessive
  ზე: 'on', // superessive
  ით: 'with', // instrumental
  დან: 'from', // ablative
  თან: 'at', // adessive (only if 'at' ∈ vocab.preps — see validate gate)
}

export const KA_CORE: CoreLexicon = {
  verbs: {
    // take / get
    აიღე: 'take',
    აიღეთ: 'take',
    წაიღე: 'take',
    // drop / put down
    დადე: 'drop',
    დააგდე: 'drop',
    გადააგდე: 'drop',
    // open / close
    გააღე: 'open',
    გახსენი: 'open',
    დახურე: 'close',
    // read / examine / look
    წაიკითხე: 'read',
    დაათვალიერე: 'examine',
    შეხედე: 'examine',
    მიმოიხედე: 'look',
    // attack / kill
    დაესხი: 'attack',
    შეუტიე: 'attack',
    მოკალი: 'kill',
    // put (in/on)
    ჩადე: 'put',
    დადგი: 'put',
    // give
    მიეცი: 'give',
    // light / turn on/off
    აანთე: 'light',
    ჩართე: 'turn on',
    გამორთე: 'turn off',
    ჩააქრე: 'extinguish',
    // enter / board / leave
    შედი: 'enter',
    ჩაჯექი: 'board',
    გადი: 'exit',
    // move / push / pull / raise / lower
    გადააადგილე: 'move',
    წაანაცვლე: 'move',
    დააჭირე: 'push',
    წადე: 'push',
    გამოქაჩე: 'pull',
    მოქაჩე: 'pull',
    ასწიე: 'raise',
    ჩაუშვი: 'lower',
    // tie / inflate / wind / ring / wave / rub / dig / turn
    მიაბი: 'tie',
    გახსენი_თოკი: 'untie', // ← review: ensure not colliding with open; rename if so
    გაბერე: 'inflate',
    დააქოქე: 'wind up',
    დარეკე: 'ring',
    დაიქნიე: 'wave',
    მოისვი: 'rub',
    თხარე: 'dig',
    მოატრიალე: 'turn',
    დაატრიალე: 'turn',
    // climb / cross / launch / pray / wait / echo
    აძვერი: 'climb',
    ჩაძვერი: 'climb',
    გადაკვეთე: 'cross',
    გაუშვი: 'launch',
    ილოცე: 'pray',
    დაიცადე: 'wait',
    // unlock
    გააღე_გასაღებით: 'unlock', // ← review: prefer an idiom (see verbIdioms)
  },
  verbIdioms: [
    // unlock = open-with-key; the contiguous idiom consumes verb+instrument
    // marker so the door resolves as the object. Review for naturalness.
    { phrase: 'გასაღებით გააღე', to: 'unlock' },
    // wind up canary (Songbird): `დააქოქე` → 'wind up' is the single-word verb
    // (added under `verbs` below), NOT an idiom — a one-token idiom would just
    // shadow the verb entry (m3). Only add a MULTIWORD wind-up idiom here if the
    // reviewer needs one (e.g. 'მექანიზმი დააქოქე').
    // echo (Loud Room): the player types the English game verb verbatim.
    { phrase: 'echo', to: 'echo' },
  ],
  particleVerbs: [], // Georgian preverbs are fused, not separable (spec §4.1)
  // "all" quantifier — Georgian ყველა / ყველაფერი, plus bare English for mixers.
  quantifiersAll: ['ყველა', 'ყველაფერი', 'all', 'everything'],
  quantifiersExcept: ['გარდა', 'except'],
  preps: {
    ...KA_POSTPOSITIONS,
    // `ქვეშ` (under) as a standalone postposition is unused on the Zork I
    // winning path; add it here + to KA_POSTPOSITIONS only if a future command
    // needs it (the validate gate requires 'under' ∈ vocab.preps).
  },
  postpositions: KA_POSTPOSITIONS,
  articles: [],
  pronounsDirect: [],
  pronounsContainer: [],
  pronounsSelf: ['მე'],
  metaAliases: {
    // Georgian meta words → raw English command. English meta verbs (i, l,
    // save, quit) STILL work via isMetaCommand, which runs BEFORE the lexicon
    // (spec §4.1, finding-8) — these are the Georgian conveniences on top.
    ინვენტარი: 'inventory',
    შენახვა: 'save',
    აღდგენა: 'restore',
    გასვლა: 'quit',
    ქულა: 'score',
    ყურება: 'look',
  },
}
```

> **Reviewer flags in the code** (`← review:`) mark draft picks most likely to
> change in the Tbilisi loop — keep them as comments, don't silently resolve.
> The `_`-suffixed keys (`გახსენი_თოკი`, `გააღე_გასაღებით`) are PLACEHOLDERS that
> WILL break the validate gate's fold-idempotence (Task 8) — replace them with
> real distinct Georgian forms or move them to `verbIdioms` during Task 11.

- [ ] **Step 4: Run the smoke test**

Run: `npx vitest run src/llm/lexicon/ka.core.test.ts`
Expected: PASS (the three smoke assertions).

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/ka.core.ts src/llm/lexicon/ka.core.test.ts
git commit -m "feat(georgian): KA_CORE draft (walkthrough verbs + postpositions)"
```

---

### Task 5: `ka.zork1.ts` — Georgian Zork I noun lexicon (NATIVE-REVIEW-DRAFT)

**Files:**
- Create: `src/llm/lexicon/ka.zork1.ts`

**Derivation rule (the key to completeness):** the Phase-1 display corpus
`ZORK1_KA_OBJECTS` (`src/translate/corpus/zork1.ka.objects.ts`) already holds a
Georgian **nominative citation** form (`indef`) for **every** Zork I object,
keyed by EN printed name. For each object: `canonical = ZORK1_KA_CANONICAL[en] ??
en`; the lexicon word is the **`expandGeorgian`-reduced fold** of `indef` (so the
stored form is the bare stem the input pipeline produces). List that reduced
full form **plus** a bare head-noun synonym players actually type. The corpus
round-trip (Task 10) is the gate that proves every display form reduces into this
lexicon.

- [ ] **Step 1: Write the failing test** — covered by Tasks 8/10/11. For a fast
local seed check, add to `src/llm/lexicon/ka.core.test.ts`:

```ts
import { KA_ZORK1 } from './ka.zork1'
describe('KA_ZORK1 seed', () => {
  it('covers the headline walkthrough nouns', () => {
    expect(KA_ZORK1['brass lantern']).toContain('ფარან') // lamp/lantern
    expect(KA_ZORK1['mailbox']).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/llm/lexicon/ka.core.test.ts -t "KA_ZORK1 seed"`
Expected: FAIL — `ka.zork1` not found.

- [ ] **Step 3: Author `ka.zork1.ts`**

Mirror `es.zork1.ts`. KEYS are vocab canonicals **in vocab canonical order**
(`src/llm/grammar/zork1.vocab.ts`). VALUES are folded, hyphen-free, bare-stem
Georgian. Seed the **walkthrough nouns** first (below); Task 11 + Task 10 force
the rest. Derive each from `ZORK1_KA_OBJECTS` per the rule above.

```ts
// src/llm/lexicon/ka.zork1.ts
// Georgian → Zork I noun lexicon (spec §4.2). KEYS are extracted-vocab
// canonicals; VALUES are folded, hyphen-free, BARE-STEM Georgian (the form
// expandGeorgian produces). Derived from the Phase-1 display corpus
// (zork1.ka.objects.ts) reduced through expandGeorgian, plus bare head-noun
// synonyms players type. NATIVE-REVIEW-DRAFT (beta). Entries follow vocab order.
import type { NounLexicon } from './types'

export const KA_ZORK1: NounLexicon = {
  altar: ['სამსხვერპლო'], // vowel-final: no -ი strip
  basket: ['კალათა'],
  'beautiful brass bauble': ['ბურთულა', 'სპილენძის ბურთულა'],
  'black book': ['წიგნ', 'შავი წიგნ'], // წიგნი → წიგნ
  'blast of air': ['ჰაერ', 'ჰაერის ნაკად'],
  'bloody axe': ['ცულ', 'სისხლიანი ცულ'], // ცული → ცულ
  'brass bell': ['ზარ', 'სპილენძის ზარ'], // ზარი → ზარ
  'brass lantern': ['ფარან', 'სპილენძის ფარან'], // ფარანი → ფარან; UAT trap
  bolt: ['ხრახნ'], // ხრახნი → ხრახნ
  'broken clockwork canary': ['კანარა', 'გატეხილი კანარა'],
  'broken jewel-encrusted egg': ['კვერცხ', 'გატეხილი კვერცხ'], // კვერცხი → კვერცხ
  // … continue for every vocab canonical, in vocab order …
  // The walkthrough head nouns to guarantee (Task 11 gate): basket, bell, bolt,
  // book, bracelet, buoy, canary, candles, case, chalice, coal, coffin, coins,
  // diamond, egg, emerald, garlic, gold, grate, house, jade, jewels, key,
  // knife, lamp/lantern, leaflet, lid, mailbox, match(es), mirror, painting,
  // plastic, pump, rainbow, rope, rug, sand, scarab, sceptre, screwdriver,
  // shovel, skull, sword, thief, torch, trap door, tree, trident, troll, trunk,
  // window, wrench, yellow/red button, bag, switch, bell.
  mailbox: ['ფოსტა', 'პატარა ფოსტა'], // ← confirm canonical key vs 'small mailbox'

  // --- G1 dative recipients (Task 9): list the dative form so the dative path
  // resolves the recipient. ქურდი (thief) → dative ქურდს; nominative bare ქურდ.
  thief: ['ქურდ', 'ქურდს'],
  // railing (tie rope to railing): მოაჯირი → bare მოაჯირ, dative მოაჯირს.
  railing: ['მოაჯირ', 'მოაჯირს'], // ← confirm vocab canonical name for railing
}
```

> **Completeness is gate-driven, not hand-counted.** Run Task 8 (validate keys)
> and Task 10 (corpus round-trip) repeatedly; each names the exact missing
> canonical/form. Fill from `ZORK1_KA_OBJECTS` until green. Do NOT add `ka` to
> `validate.test.ts`'s full-vocab `COVERED` block — the corpus round-trip (every
> display object) + the walkthrough gate (every winning noun) are `ka`'s
> completeness bars (ponytail: don't author abstract non-display canonicals the
> player never names).

- [ ] **Step 4: Run the seed test**

Run: `npx vitest run src/llm/lexicon/ka.core.test.ts -t "KA_ZORK1 seed"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/ka.zork1.ts src/llm/lexicon/ka.core.test.ts
git commit -m "feat(georgian): KA_ZORK1 draft (walkthrough nouns, bare-stem)"
```

---

### Task 6: Wire `ka` into `index.ts` + `kaInputActive`

**Files:**
- Modify: `src/llm/lexicon/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/llm/lexicon/index.ka.test.ts
import { describe, it, expect } from 'vitest'
import { coreLexicon, nounLexicon, kaInputActive } from './index'
import { ZORK1_SIG, ZORK2_SIG } from '../grammar/index'

describe('ka lexicon lookup (Zork I only)', () => {
  it('coreLexicon("ka") returns KA_CORE', () => {
    expect(coreLexicon('ka').postpositions).toBeDefined()
  })
  it('nounLexicon("ka", ZORK1_SIG) is non-null; Zork II is null', () => {
    expect(nounLexicon('ka', ZORK1_SIG)).not.toBeNull()
    expect(nounLexicon('ka', ZORK2_SIG)).toBeNull()
  })
  it('kaInputActive is true only for ka on a game with a ka noun lexicon', () => {
    expect(kaInputActive('ka', ZORK1_SIG)).toBe(true)
    expect(kaInputActive('ka', ZORK2_SIG)).toBe(false)
    expect(kaInputActive('fr', ZORK1_SIG)).toBe(false)
    expect(kaInputActive('off', ZORK1_SIG)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/llm/lexicon/index.ka.test.ts`
Expected: FAIL — `kaInputActive` not exported; `coreLexicon('ka')` is a type error.

- [ ] **Step 3: Re-key the maps to `InputLexLang`, add `ka`, add `kaInputActive`**

In `src/llm/lexicon/index.ts`:

- Imports — add:

```ts
import type { CoreLexicon, NounLexicon, InputLexLang } from './types'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
```

(Replace the existing `import type { CoreLexicon, NounLexicon, LexLang } from './types'`. Also add a `NlLanguage` import for `kaInputActive`: `import type { NlLanguage } from '../types'`.)

- `CORES`, `NOUNS` re-keyed + `ka` added (Zork I only):

```ts
const CORES: Record<InputLexLang, CoreLexicon> = {
  fr: FR_CORE,
  de: DE_CORE,
  es: ES_CORE,
  ka: KA_CORE,
}

const NOUNS: Record<InputLexLang, Record<string, NounLexicon>> = {
  fr: { [ZORK1_SIG]: FR_ZORK1, [ZORK2_SIG]: FR_ZORK2, [ZORK3_SIG]: FR_ZORK3 },
  de: { [ZORK1_SIG]: DE_ZORK1, [ZORK2_SIG]: DE_ZORK2, [ZORK3_SIG]: DE_ZORK3 },
  es: { [ZORK1_SIG]: ES_ZORK1, [ZORK2_SIG]: ES_ZORK2, [ZORK3_SIG]: ES_ZORK3 },
  ka: { [ZORK1_SIG]: KA_ZORK1 }, // Zork I only — II/III stay English (spec §1)
}
```

- `coreLexicon`, `nounLexicon`, `lexiconWordSet` signatures change `LexLang` → `InputLexLang` (bodies unchanged).

- `KNOWN_COLLISIONS` re-keyed + `ka` added:

```ts
export const KNOWN_COLLISIONS: Record<
  InputLexLang,
  Readonly<Record<string, readonly string[]>>
> = {
  // … existing fr/de/es entries unchanged …
  ka: { [ZORK1_SIG]: [] }, // Mkhedruli is non-ASCII: no overlap with English vocab
}
```

- Add the shared gate at the end of the file:

```ts
/** Georgian input is active only on a game that HAS a ka noun lexicon — Zork I
 * today (spec §5.6, issue-1). Auto-tracks NOUNS.ka, so if ka ever gains a Zork
 * II/III lexicon this needs no edit. The single source of truth consulted by the
 * lex memo, the Terminal route, the placeholder, and the activation notice. */
export function kaInputActive(lang: NlLanguage, sig: string): boolean {
  return lang === 'ka' && nounLexicon('ka', sig) !== null
}
```

- [ ] **Step 4: Run the test + typecheck**

Run: `npx vitest run src/llm/lexicon/index.ka.test.ts && make typecheck`
Expected: PASS; typecheck clean. (The LLM modules still import `LexLang`, so a `ka` LLM-map entry remains a type error — the §5.1 guarantee.)

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/index.ts src/llm/lexicon/index.ka.test.ts
git commit -m "feat(georgian): wire ka into lexicon index (Zork I) + kaInputActive"
```

---

### Task 7: Georgian direction words

**Files:**
- Modify: `src/llm/directions.ts:24` (`DIRECTION_WORDS`), `:110` (`LEAD`)
- Modify: `src/llm/directions.test.ts`

> `parseDirection` runs in `translatePipeline.ts:338`, BEFORE `parseLexicon`
> (`:349`), on the raw clause — so Georgian directions (incl. the `-ით` adverbial
> forms) are caught here and never reach `expandGeorgian`. That ordering is why
> `-ით` direction words must live in `DIRECTION_WORDS`, not be left to the
> instrumental split.

- [ ] **Step 1: Write the failing test**

Add to `src/llm/directions.test.ts`:

```ts
import { ZORK1_VOCAB } from './grammar/zork1.vocab'
describe('Georgian directions (spec §3.3)', () => {
  const move = ZORK1_VOCAB.movement
  const cases: [string, string][] = [
    ['ჩრდილოეთი', 'north'],
    ['ჩრდილოეთით', 'north'], // adverbial -ით form
    ['სამხრეთი', 'south'],
    ['აღმოსავლეთი', 'east'],
    ['დასავლეთი', 'west'],
    ['ზემოთ', 'up'],
    ['ქვემოთ', 'down'],
    ['შიგნით', 'in'],
    ['გარეთ', 'out'],
  ]
  for (const [input, canon] of cases)
    it(`${input} → ${canon}`, () =>
      expect(parseDirection(input, move)).toBe(canon))
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/llm/directions.test.ts -t "Georgian directions"`
Expected: FAIL — Georgian words not in `DIRECTION_WORDS`.

- [ ] **Step 3: Add Georgian to `DIRECTION_WORDS` (and the header comment)**

In `src/llm/directions.ts`, extend `DIRECTION_WORDS` (under each cardinal,
add both the `-ი` and `-ით` forms; diagonals + up/down/in/out):

```ts
  // north
  ჩრდილოეთი: 'north',
  ჩრდილოეთით: 'north',
  // south
  სამხრეთი: 'south',
  სამხრეთით: 'south',
  // east
  აღმოსავლეთი: 'east',
  აღმოსავლეთით: 'east',
  // west
  დასავლეთი: 'west',
  დასავლეთით: 'west',
  // up / down
  ზემოთ: 'up',
  მაღლა: 'up',
  ქვემოთ: 'down',
  დაბლა: 'down',
  // in / out
  შიგნით: 'in',
  გარეთ: 'out',
  // diagonals
  ჩრდილოაღმოსავლეთი: 'northeast',
  ჩრდილოდასავლეთი: 'northwest',
  სამხრეთაღმოსავლეთი: 'southeast',
  სამხრეთდასავლეთი: 'southwest',
```

Update the header comment (line 162) `"Covers en/fr/de/es"` → `"Covers en/fr/de/es/ka"`.

> `normalize()` (directions.ts) strips combining diacritics and lowercases — both
> no-ops for Mkhedruli — so Georgian words pass through unchanged. No `LEAD`
> additions are needed for the gate (the bare direction words suffice); add
> Georgian movement leads (`წადი`, `გასწი`) only if a UAT finding shows a player
> typing "go <dir>" in Georgian.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/llm/directions.test.ts`
Expected: PASS — Georgian cases + no en/fr/de/es regression.

- [ ] **Step 5: Commit**

```bash
git add src/llm/directions.ts src/llm/directions.test.ts
git commit -m "feat(georgian): add Georgian direction words to directions.ts"
```

---

## MILESTONE B — Gates (forcing functions)

### Task 8: `ka` validation block (Zork I only)

**Files:**
- Modify: `src/llm/lexicon/validate.test.ts`

`ka` is Zork I only, so it CANNOT join the `GAMES × LANGS` loops (they assert
`nounLexicon` non-null for all three games). Add a dedicated `ka` block.

- [ ] **Step 1: Write the failing test** — append to `validate.test.ts`:

```ts
import { ZORK1_VOCAB as KA_VOCAB } from '../grammar/zork1.vocab'

describe('ka lexicon validation (Zork I only — spec §6)', () => {
  const core = coreLexicon('ka')
  const lex = nounLexicon('ka', ZORK1_SIG)!
  const allVerbs = new Set([
    ...KA_VOCAB.verbsOnly,
    ...KA_VOCAB.verbs1,
    ...KA_VOCAB.verbs2,
    ...KA_VOCAB.movement,
    ...KA_VOCAB.verbSynonyms,
  ])
  const inV = (t: string, s: ReadonlySet<string>) =>
    s.has(t) || s.has(t.slice(0, 6))

  it('every mapped verb target exists in Zork I vocab', () => {
    const targets = [
      ...Object.values(core.verbs),
      ...core.verbIdioms.map(v => v.to),
    ]
    expect(targets.filter(t => !inV(t, allVerbs))).toEqual([])
  })
  it('every prep/postposition target is a Zork I vocab prep', () => {
    const preps = new Set(KA_VOCAB.preps)
    expect(Object.values(core.preps).filter(p => !preps.has(p))).toEqual([])
  })
  it('every noun-lexicon key is a Zork I vocab canonical', () => {
    const canon = new Set(KA_VOCAB.nouns.map(n => n.canonical))
    expect(Object.keys(lex).filter(k => !canon.has(k))).toEqual([])
  })
  it('every noun-lexicon VALUE is fold-idempotent (stored pre-folded)', () => {
    for (const [c, words] of Object.entries(lex))
      for (const w of words) expect(fold(w), `${c} → ${w}`).toBe(w)
  })
  it('collisions with English vocab match KNOWN_COLLISIONS.ka (expected [])', () => {
    const overlap = [...lexiconWordSet('ka', ZORK1_SIG)]
      .filter(w => vocabWordSet(KA_VOCAB).has(w))
      .sort()
    expect(overlap).toEqual([...(KNOWN_COLLISIONS.ka[ZORK1_SIG] ?? [])].sort())
  })
})
```

- [ ] **Step 2: Run** — `npx vitest run src/llm/lexicon/validate.test.ts -t "ka lexicon validation"`
Expected: FAIL initially on fold-idempotence (the Task 4 `_`-placeholder keys) and/or a prep target ('at' if not a vocab prep).

- [ ] **Step 3: Fix the data to green** — In `ka.core.ts`: replace the `_`-suffixed
placeholder verb keys with real distinct Georgian forms or move them to
`verbIdioms`; drop `თან: 'at'` from `KA_POSTPOSITIONS`/`preps` if `'at'` is not in
`ZORK1_VOCAB.preps`. In `ka.zork1.ts`: fix any non-canonical key the test names.

- [ ] **Step 4: Run to verify it passes** — same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/validate.test.ts src/llm/lexicon/ka.core.ts src/llm/lexicon/ka.zork1.ts
git commit -m "test(georgian): ka lexicon validation gate (Zork I only)"
```

---

### Task 9: Input-lexicon round-trip + G1 dative-recipient path

**Files:**
- Modify: `src/llm/lexicon/roundtrip.test.ts:22` (LANGS) + the noun loop (null-skip)
- Modify: `src/llm/lexicon/parse.ts` (the G1 dative path)
- (No `expandGeorgian.ts` change — the G1 dative path lives in `parse.ts` and
  resolves recipients via the dative forms listed in `KA_ZORK1`, M3.)

**G1 design (resolving the Open Decision):** `give egg to thief` →
`მიეცი კვერცხი ქურდს`. `expandGeorgian` strips `-ი` from `კვერცხი` (→ `კვერცხ`) but
leaves the dative `ქურდს` (no postposition; `-ს` is NOT split — it collides with
genitive `-ის`). So after expand: `[მიეცი(give), კვერცხ, ქურდს]`. The new path:
when the verb is give/tie-class and the remainder is exactly `[obj, recipient]`
(two resolvable nouns, no prep between), and the recipient's surface is a known
**dative recipient**, emit `give obj to recipient`. The recipient dative forms are
listed in `KA_ZORK1` (Task 5), so `resolveNoun(['ქურდს'])` → `thief`.

- [ ] **Step 1: Write the failing tests**

Add to `roundtrip.test.ts` — change `const LANGS: LexLang[] = ['fr','de','es']` to:

```ts
import type { InputLexLang } from './types'
const LANGS: InputLexLang[] = ['fr', 'de', 'es', 'ka']
```

…and in the noun round-trip loop body, after `const nouns = nounLexicon(lang, sig)`:

```ts
      // ka has a noun lexicon only for Zork I (NOUNS.ka = { [ZORK1_SIG]: … }),
      // so skip ka × {zork2,zork3} (null lexicon) — issue-1.
      if (!nouns) {
        it(`${lang}/${name}: no lexicon (skipped)`, () => expect(true).toBe(true))
        continue
      }
```

(Remove the `!` non-null assertion on `nounLexicon(lang, sig)`; the guard above
narrows it.)

Add the G1 + instrumental pins as a new file `src/llm/lexicon/parse.ka.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const ka = (c: string) => parseLexicon(c, KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty)

describe('Georgian parse — postposition + case (spec §3.2, G1)', () => {
  it('instrumental -ით: kill troll with sword', () => {
    // მოკალი ტროლი მახვილით → kill troll with sword
    expect(ka('მოკალი ტროლი მახვილით')).toEqual({
      kind: 'command',
      text: 'kill troll with sword', // ← confirm emits (troll/sword) from vocab
    })
  })
  it('inessive -ში: put coal in machine', () => {
    expect(ka('ჩადე ნახშირი მანქანაში')).toEqual({
      kind: 'command',
      text: 'put coal in machine', // ← confirm emits
    })
  })
  it('G1 dative recipient: give egg to thief', () => {
    expect(ka('მიეცი კვერცხი ქურდს')).toEqual({
      kind: 'command',
      text: 'give egg to thief', // ← confirm emits
    })
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/llm/lexicon/roundtrip.test.ts src/llm/lexicon/parse.ka.test.ts`
Expected: round-trip iterates `ka` (zork1 passes; zork2/3 skipped); the G1 dative case FAILS (no dative path yet).

- [ ] **Step 3: Implement the G1 dative path in `parse.ts`**

Add a small helper + a parse branch. In `parse.ts`, before the final
`return MISS` (line 521), add:

```ts
  // --- G1 (Georgian dative recipient): `<give/tie-verb> <obj> <recipientDAT>`.
  // Georgian marks the recipient with the dative case (-ს), which is NOT a
  // splittable postposition (it collides with genitive -ის), so expandGeorgian
  // leaves it attached. When exactly two nouns remain, the verb takes a 'to'
  // indirect object (verbs2), and the SECOND noun is a known dative recipient
  // surface, emit `<verb> <obj> to <recipient>`. Bounded to the closed Zork I
  // recipient set (KA_ZORK1 dative entries) — never a general -ს analysis. ---
  if (core.postpositions && tokens.length === 2 && verbArityOk(verb, vocab, 2)) {
    const obj = resolveNoun([tokens[0]], core, nouns, vocab, scene)
    const rec = resolveNoun([tokens[1]], core, nouns, vocab, scene)
    if (obj && rec && tokens[1].endsWith('ს'))
      return { kind: 'command', text: `${verb} ${obj.emit} to ${rec.emit}` }
  }
```

> The `tokens[1].endsWith('ს')` guard keeps this to dative-marked recipients
> (`ქურდს`, `მოაჯირს`); a nominative second noun falls through to MISS. `obj` is
> the `-ი`-stripped direct object; `rec` resolves via the dative form listed in
> `KA_ZORK1`. Scoped to `core.postpositions` so fr/de/es never reach it.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/llm/lexicon/roundtrip.test.ts src/llm/lexicon/parse.ka.test.ts`
Expected: PASS. Fix any `← confirm emits` literals to the real vocab `emit`
forms the test reports.

- [ ] **Step 5: Run the full lexicon suite (no fr/de/es regression)**

Run: `npx vitest run src/llm/lexicon/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/llm/lexicon/roundtrip.test.ts src/llm/lexicon/parse.ts src/llm/lexicon/parse.ka.test.ts
git commit -m "feat(georgian): input round-trip ka enrol + G1 dative-recipient path"
```

---

### Task 10: Display↔input corpus round-trip (with `expandGeorgian` reduce)

**Files:**
- Modify: `src/translate/corpus/roundtrip.test.ts`

The corpus round-trip does a raw `lex.includes(stripHead(fold(form)))` membership
check — it does NOT run `expandGeorgian`. So the `ka` row needs a `reduce` step
that applies the same reduction the input pipeline does, so the display
nominative form (`სპილენძის ფარანი`) reconciles with the stored bare stem
(`სპილენძის ფარან`). This is the finding-9 audit, gate-enforced.

- [ ] **Step 1: Write the failing test**

In `roundtrip.test.ts`: add an optional `reduce` to `Row`, default identity, and
apply it. Add imports + the `ka` row:

```ts
import { KA_ZORK1 } from '../../llm/lexicon/ka.zork1'
import { KA_CORE } from '../../llm/lexicon/ka.core'
import { expandGeorgian } from '../../llm/lexicon/expandGeorgian'
import { ZORK1_KA_OBJECTS, ZORK1_KA_CANONICAL } from './zork1.ka.objects'
```

Extend `Row`:

```ts
  /** Optional per-language reduction applied to the folded display form before
   * the membership check — mirrors the language's input pre-stage. ka applies the
   * NOMINATIVE -ი STRIP ONLY (not the postposition split) so display nominatives
   * reconcile with stored bare stems (finding-9). The split is deliberately
   * OMITTED here (review M2): some object NAMES carry genuine instrumental
   * morphology — e.g. `ტყავის ტომარა მონეტებით` ("leather bag of coins") ends in
   * -ით — and splitting that would mangle the display name, not a player's
   * postpositional input. expandGeorgian(tokens, {}) runs only the -ი strip
   * (no suffix matches the empty map). */
  reduce?: (folded: string) => string
```

Add the `ka` row to `LANGS`:

```ts
  {
    code: 'ka',
    nouns: KA_ZORK1,
    core: KA_CORE,
    objects: ZORK1_KA_OBJECTS,
    canonical: ZORK1_KA_CANONICAL,
    headExtra: [], // Georgian has no articles
    // Nominative -ი strip only (empty postpositions → no split, M2):
    reduce: f => expandGeorgian(f.split(' '), {}).join(' '),
  },
```

In the membership check, apply `reduce` after `stripHead`:

```ts
    const reduce = row.reduce ?? ((s: string) => s)
    // …
        for (const [key, form] of Object.entries(forms)) {
          const phrase = reduce(stripHead(fold(form)))
          if (!lex.includes(phrase))
            failures.push(/* …unchanged… */)
        }
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/translate/corpus/roundtrip.test.ts`
Expected: FAIL — the `ka` row reports every display object whose reduced form is
missing from `KA_ZORK1` (the finding-9 work-list).

- [ ] **Step 3: Fill `KA_ZORK1` to green** — for each failure
`"<en>".indef = "<form>" → "<reduced>" missing from ka["<canonical>"]`, add
`<reduced>` to that canonical's list in `ka.zork1.ts` (in vocab canonical order).
This is the bulk noun-completion task, **mostly mechanical** (the reduced display
form drops straight in) — but **with hand-judgment exceptions** (review M2): a
display NAME that bakes in case morphology (instrumental `…მონეტებით`, genitive
chains) won't reduce to a clean head-noun stem, so either (a) list the reduced
display form verbatim AND add a bare head-noun synonym players actually type, or
(b) simplify the display corpus form — finding-9 explicitly anticipated possible
**display-corpus edits** here. The gate names each case; resolve it, don't
auto-apply.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/translate/corpus/roundtrip.test.ts`
Expected: PASS — `ka` row green; the `> 100` populated-table guard passes; fr/de/es untouched.

- [ ] **Step 5: Commit**

```bash
git add src/translate/corpus/roundtrip.test.ts src/llm/lexicon/ka.zork1.ts
git commit -m "test(georgian): corpus↔input round-trip ka (expandGeorgian reduce)"
```

---

### Task 11: Georgian walkthrough-parse gate (the forcing function)

**Files:**
- Create: `src/llm/lexicon/parse.ka-walkthrough.test.ts`

Reuse the Zork I command extraction the existing coverage gate uses
(`docs/walkthrough-zork-i.txt`, `>command` lines, movement elided). The gate:
every non-movement Zork I winning command has a Georgian fixture entry, and each
parses (grammar-only) to a canonical the Z-parser accepts.

- [ ] **Step 1: Write the gate**

```ts
// src/llm/lexicon/parse.ka-walkthrough.test.ts
// Georgian walkthrough-parse gate (spec §6): a Georgian fixture maps every
// non-movement Zork I winning command to its Georgian typed form; each must
// parse via the grammar-only path to a canonical the Z-parser accepts. ZERO
// misses. Pure movement is owned by directions.ts (gated in directions.test.ts).
// Fixture is NATIVE-REVIEW-DRAFT.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseLexicon } from './parse'
import { parseDirection } from '../directions'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const scene: Scene = { inScope: [], antecedent: null }

// English winning commands (movement elided — directions.ts owns it). Reuse the
// same extraction as walkthrough-coverage.test.ts.
function zork1Commands(): string[] {
  const txt = readFileSync(
    new URL('../../../docs/walkthrough-zork-i.txt', import.meta.url),
    'utf8',
  )
  const cmds = txt
    .split('\n')
    .filter(l => l.startsWith('>'))
    .map(l => l.slice(1).trim().toLowerCase())
    .filter(Boolean)
  // Drop pure movement (parseDirection resolves it; directions.test.ts gates it).
  return [...new Set(cmds)].filter(
    c => parseDirection(c, ZORK1_VOCAB.movement) === null,
  )
}

// FIXTURE (NATIVE-REVIEW-DRAFT): english winning command → { ka, expect }.
// `expect` is the canonical English the Georgian must produce (parser-accepted).
const FIXTURE: Record<string, { ka: string; expect: string }> = {
  'open mailbox': { ka: 'გააღე ფოსტა', expect: 'open small mailbox' },
  'take lamp': { ka: 'აიღე ფარანი', expect: 'take brass lantern' },
  'open trap door': { ka: 'გააღე ხაფანგი', expect: 'open trap door' },
  'turn on lamp': { ka: 'აანთე ფარანი', expect: 'turn on brass lantern' },
  'kill troll with sword': {
    ka: 'მოკალი ტროლი მახვილით',
    expect: 'kill troll with sword',
  },
  'give egg to thief': {
    ka: 'მიეცი კვერცხი ქურდს',
    expect: 'give egg to thief',
  },
  'put coal in machine': {
    ka: 'ჩადე ნახშირი მანქანაში',
    expect: 'put coal in machine',
  },
  'wind up canary': { ka: 'დააქოქე კანარა', expect: 'wind up canary' },
  // … one entry per command in zork1Commands(). The coverage test below names
  // every missing key; fill until ZERO gaps. All expect-strings must be
  // parser-accepted winning commands (cross-checked by the parse test below).
}

describe('Georgian walkthrough-parse gate (spec §6)', () => {
  const commands = zork1Commands()

  it('every winning command has a Georgian fixture entry (zero gaps)', () => {
    const missing = commands.filter(c => !(c in FIXTURE))
    expect(missing).toEqual([])
  })

  it('every Georgian fixture form parses to its expected canonical', () => {
    const failures: string[] = []
    for (const [en, { ka, expect: want }] of Object.entries(FIXTURE)) {
      const r = parseLexicon(ka, KA_CORE, KA_ZORK1, ZORK1_VOCAB, scene)
      if (r.kind !== 'command') failures.push(`${en}: "${ka}" → miss`)
      else if (r.text !== want)
        failures.push(`${en}: "${ka}" → "${r.text}" (want "${want}")`)
    }
    expect(failures).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/llm/lexicon/parse.ka-walkthrough.test.ts`
Expected: FAIL — the coverage test lists every winning command missing from
`FIXTURE`; the parse test lists any wrong/missing parse.

- [ ] **Step 3: Fill the fixture + the lexicon to green** — iterate: for each
missing command author `{ ka, expect }` (Georgian typed form + parser-accepted
canonical), adding any missing verbs to `ka.core.ts` and nouns to `ka.zork1.ts`.
Verify each `expect` string is a real winning command (it appears in
`zork1Commands()` modulo emit synonyms). This is where the lexicon's walkthrough
completeness is forced.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/llm/lexicon/parse.ka-walkthrough.test.ts`
Expected: PASS — zero gaps, zero parse misses.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/parse.ka-walkthrough.test.ts src/llm/lexicon/ka.core.ts src/llm/lexicon/ka.zork1.ts
git commit -m "test(georgian): walkthrough-parse gate — Zork I winnable in Georgian"
```

---

### Task 12: `ka` input-UAT pins

**Files:**
- Create: `src/llm/lexicon/parse.ka-uat.test.ts`

Mirror `parse.es-uat.test.ts`. Pin the puzzle-critical + every confirmed
characterization finding: the `-ით` instrumental, an `-ი`-final/hand-tuned stem,
a 2-/3-candidate disambiguation, the G1 dative, the `wind up canary` idiom.

- [ ] **Step 1: Write the pins**

```ts
// src/llm/lexicon/parse.ka-uat.test.ts
// Georgian UAT regression suite — pins puzzle-critical commands + confirmed
// findings against the SHIPPING KA_CORE + KA_ZORK1 and the real ZORK1_VOCAB.
// Mirrors parse.es-uat.test.ts. NATIVE-REVIEW-DRAFT fixtures.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const inScope = (...c: string[]): Scene => ({
  inScope: c.map(canonical => ({ canonical })),
  antecedent: null,
})
const ka = (clause: string, scene: Scene = empty) =>
  parseLexicon(clause, KA_CORE, KA_ZORK1, ZORK1_VOCAB, scene)

describe('Georgian UAT — instrumental & dative', () => {
  it('-ით instrumental: turn bolt with wrench', () => {
    expect(ka('მოატრიალე ხრახნი მოქლონით')).toEqual({
      kind: 'command',
      text: 'turn bolt with wrench', // ← confirm emits
    })
  })
  it('G1 dative: tie rope to railing', () => {
    expect(ka('მიაბი თოკი მოაჯირს')).toEqual({
      kind: 'command',
      text: 'tie rope to railing', // ← confirm emits
    })
  })
})

describe('Georgian UAT — idioms & nominative', () => {
  it('wind up canary', () => {
    expect(ka('დააქოქე კანარა')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
  it('nominative -ი strip resolves the lamp', () => {
    expect(ka('აიღე ფარანი')).toEqual({
      kind: 'command',
      text: 'take brass lantern', // ← confirm emit
    })
  })
})
```

- [ ] **Step 2: Run** — `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts`
Expected: FAIL on any `← confirm emits` literal that doesn't match the vocab; fix the literals to the reported `r.text`.

- [ ] **Step 3: Green** — adjust expectations to the real emits; add lexicon
entries if any genuinely miss.

- [ ] **Step 4: Run to verify it passes** — same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/parse.ka-uat.test.ts
git commit -m "test(georgian): ka input-UAT pins (instrumental, dative, idioms)"
```

---

### Task 13: NATIVE-REVIEW-DRAFT marker coverage for the `ka` input files

**Files:**
- Modify: `src/translate/corpus/ka-native-review-draft.test.ts`

The existing marker test (Phase 1) asserts every Georgian line in `help.ts`/
`notices.ts` is governed by a `NATIVE-REVIEW-DRAFT` marker comment. Extend it to
the new input data files so a draft can't silently promote to final.

- [ ] **Step 1: Write the failing test** — add a block that scans `ka.core.ts`
and `ka.zork1.ts`:

```ts
import { readFileSync } from 'node:fs'
const FILES = [
  '../../llm/lexicon/ka.core.ts',
  '../../llm/lexicon/ka.zork1.ts',
]
describe('ka INPUT lexicon is NATIVE-REVIEW-DRAFT-marked', () => {
  for (const rel of FILES)
    it(`${rel} carries the marker over its Georgian data`, () => {
      const src = readFileSync(new URL(rel, import.meta.url), 'utf8')
      const hasGeorgian = /[Ⴀ-ჿ]/.test(src)
      expect(hasGeorgian).toBe(true)
      expect(src.includes('NATIVE-REVIEW-DRAFT')).toBe(true)
    })
})
```

> Reuse the existing file's `MARKER`/`GEORGIAN` constants and `markerGoverns()`
> windowed check if you want per-line strictness; the file-level assertion above
> is the minimum that fails if the marker is dropped.

- [ ] **Step 2: Run** — `npx vitest run src/translate/corpus/ka-native-review-draft.test.ts`
Expected: PASS if Task 4/5 headers include the marker; FAIL otherwise → add
`// NATIVE-REVIEW-DRAFT (beta)` to the `ka.core.ts`/`ka.zork1.ts` headers.

- [ ] **Step 3: Commit**

```bash
git add src/translate/corpus/ka-native-review-draft.test.ts src/llm/lexicon/ka.core.ts src/llm/lexicon/ka.zork1.ts
git commit -m "test(georgian): require NATIVE-REVIEW-DRAFT marker on ka input data"
```

---

## MILESTONE C — Runtime graduation

### Task 14: Force `model: 'grammar'` for `ka` at the state boundary

**Files:**
- Modify: `src/llm/useModelDownload.ts` (every `model: 'full'` set site)

`grammarOnly` derives from `internal.model === 'grammar'`; `model` is
session-global. A player who downloaded the model for fr/de/es then switches to
`ka` would carry `'full'`. Guard every site that could set `ka` to `'full'`.

- [ ] **Step 1: Write the failing test** — add to the model-download test suite
(e.g. `src/llm/useModelDownload.test.ts` if present, else a focused new file):

```ts
// ka must never land in model:'full', even when a model is cached/installed.
it('picking ka with a cached model stays grammar-only', () => {
  // Arrange a cached/installed engine, then setLanguage('ka'); assert
  // internal.phase==='on' && internal.model==='grammar'.
  // (Use the hook's existing test harness/renderHook pattern.)
})
```

> If `useModelDownload` has no unit harness, assert this at the integration
> level via Terminal (Task 17's "no modal for ka" already implies grammar) and
> add a `useNaturalLanguage` selector test that `state.model === 'grammar'` for a
> cached `ka` pick.

- [ ] **Step 2: Run to verify it fails** (cached `ka` currently → `'full'` at the
line-312 branch).

- [ ] **Step 3: Guard the full-set sites** — In `src/llm/useModelDownload.ts`:

The cached-pick (line ~312):

```ts
      if ((installed || engine.isLoaded()) && lang !== 'ka') {
        setInternal({ phase: 'on', language: lang, model: 'full' }) // cached → lazy full
        return
      }
```

The initial cache-probe (lines ~109–124) — when setting from `off`, force `ka` to
grammar regardless of `cached`, and don't promote `ka`:

```ts
            return {
              phase: 'on',
              language: lang,
              model: cached && lang !== 'ka' ? 'full' : 'grammar',
            }
          // …race promote:
          if (cached && lang !== 'ka' && prev.phase === 'on' && prev.model === 'grammar')
            return { ...prev, model: 'full' }
```

> The post-download success path (line ~229) is unreachable for `ka` (the modal/
> download is never offered for `ka`), but if you want belt-and-braces, guard it
> too. Leave line ~322 (`model: 'grammar'`) as the `ka` landing spot.

- [ ] **Step 4: Run to verify it passes.** Expected: PASS; cached `ka` → grammar.

- [ ] **Step 5: Commit**

```bash
git add src/llm/useModelDownload.ts src/llm/useModelDownload.test.ts
git commit -m "fix(georgian): force model:grammar for ka at the state boundary"
```

---

### Task 15: Lex memo admits `ka` only when `kaInputActive`

**Files:**
- Modify: `src/llm/useNaturalLanguage.ts:266`

- [ ] **Step 1: Write the failing test** — add to the `useNaturalLanguage` test
suite (renderHook pattern already used there):

```ts
it('ka lex is present on Zork I, null on Zork II', () => {
  // With language 'ka' and signature ZORK1_SIG, the lex memo is non-null
  // (core+nouns); with ZORK2_SIG it is null (raw-send path).
})
```

- [ ] **Step 2: Run to verify it fails** (today the hardcoded `'fr'|'de'|'es'`
guard returns null for `ka`).

- [ ] **Step 3: Generalize the guard** — In `src/llm/useNaturalLanguage.ts`,
replace the lex memo guard (line 266):

```ts
    if (language !== 'fr' && language !== 'de' && language !== 'es') return null
    const lang: LexLang = language
```

with:

```ts
    // fr/de/es always have an input lexicon; ka only on a game that has one
    // (Zork I — kaInputActive, spec §5.6). en/off get no lexicon.
    if (!kaInputActive(language, signature) && language !== 'fr' &&
        language !== 'de' && language !== 'es')
      return null
    const lang: InputLexLang = language as InputLexLang
```

Add the import: `import { coreLexicon, nounLexicon, lexiconWordSet, kaInputActive } from './lexicon/index'` (extend the existing import) and switch the local `LexLang` type usage to `InputLexLang`.

- [ ] **Step 4: Run to verify it passes.** Expected: PASS — `ka`+Zork I lex
non-null; `ka`+Zork II null.

- [ ] **Step 5: Run the hook suite (no fr/de/es regression).**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/llm/useNaturalLanguage.ts
git commit -m "feat(georgian): lex memo admits ka only when kaInputActive (Zork I)"
```

---

### Task 16: Re-point the queue bail to the input-lexicon (NOT empty `OUTPUT_ONLY_LANGS`)

**Files:**
- Modify: `src/llm/translatePipeline.ts:~972`

**Review-fix C2 — `OUTPUT_ONLY_LANGS` is NOT emptied.** The first draft removed
`ka` from the set; that was wrong. The set has five other consumers that stay
correct for `ka` (the WebLLM-modal suppression `useModelDownload.ts:324`, the
screen-reader announce routing `useNaturalLanguage.ts:233`, the title-only display
`nlModeSummary.ts:53`, the picker copy, and the `types.test.ts` invariant
`OUTPUT_ONLY_LANGS ⊇ CORPUS_ONLY_LANGS`). `ka` output **stays** corpus-only, so it
must **stay** in `OUTPUT_ONLY_LANGS`. `types.ts` is **unchanged**, `types.test.ts`
stays green, and Task 17 does NOT use `OUTPUT_ONLY_LANGS` for the input decision.

The only fix here is the queue bail: today it bails for `ka` via
`OUTPUT_ONLY_LANGS.has(live.language)`, but `ka`-on-Zork-I now HAS an input queue
that must drain. Re-point the bail to **"no input lexicon present"** — which is
exactly what `liveRef.current.lex` already tracks (it's `null` for en/off and for
`ka`-on-non-Zork-I, non-null for `ka`-on-Zork-I and fr/de/es).

- [ ] **Step 1: Write the failing test** — add to the pipeline test suite a
ka-queue-drains assertion (mirror an existing fr queue-drain test): two queued
Georgian lines under `ka` (Zork I, grammar-only, `lex` present) both run, the
queue is not abandoned. Add a second: `ka`-on-Zork-II (`lex === null`) still bails
(raw-send path — no queue is built, but assert the bail predicate holds).

- [ ] **Step 2: Run to verify it fails** — today the bail fires for `ka` (still in
`OUTPUT_ONLY_LANGS`), so the Zork-I queue is wrongly abandoned.

- [ ] **Step 3: Re-point the bail** — In `src/llm/translatePipeline.ts`, the queue
bail (line ~972). `liveRef.current` carries both `internal` and `lex`, so read
`lex` alongside `internal`:

```ts
        const live = liveRef.current
        // Bail when NL is off OR this game has no INPUT lexicon (en/off, and
        // ka-on-non-Zork-I). ka-on-Zork-I has a `lex`, so its queue drains
        // normally (review-fix C2 — replaces the OUTPUT_ONLY_LANGS.has check,
        // which would wrongly abandon ka's Zork I input queue).
        if (live.internal.phase !== 'on' || !live.lex) {
          lastCommandRef.current = null
          queueRef.current = []
          syncQueue()
          setNotice('Queue cleared — natural language is off.')
          break
        }
```

Remove the now-unused `OUTPUT_ONLY_LANGS` import from `translatePipeline.ts` (it
is no longer referenced there). **Do NOT touch `src/llm/types.ts`.**

> Verify `LiveState` exposes `lex` at the bail site — `liveRef` is typed
> `useRef<LiveState>({ internal, lex })` in `useNaturalLanguage.ts`, so
> `liveRef.current.lex` is in scope. If the pipeline only destructured
> `.internal` before, widen the read.

- [ ] **Step 4: Run to verify it passes** + the pipeline suite + `types.test.ts`.

Run: `npx vitest run src/llm/translatePipeline.test.ts src/llm/types.test.ts`
Expected: PASS — ka Zork-I queue drains; `types.test.ts` invariant intact (ka
still in both sets); fr/de/es queue behavior unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/llm/translatePipeline.ts
git commit -m "fix(georgian): queue bail keys on input lexicon, not OUTPUT_ONLY_LANGS (C2)"
```

---

### Task 17: Terminal route via `kaInputActive` + test inversions

**Files:**
- Modify: `src/ui/Terminal.tsx`
- Modify: `src/ui/Terminal.test.tsx`

`OUTPUT_ONLY_LANGS` stays (review-fix C2), so Terminal's `outputOnly` is still a
valid value (true for `ka`) — but it must **no longer drive the INPUT decision**.
Replace the `outputOnly`-based input gating with `kaInputActive(outLang,
signature)`: route `ka` through `nl.translate` on Zork I; raw-send (+ boundary
help-intercept) on Zork II/III. After this change `outputOnly` is unused in
Terminal — delete the local `const outputOnly` (line ~149) and its `OUTPUT_ONLY_LANGS`
import (the SET stays defined in `types.ts` for its other five consumers; only
Terminal stops importing it).

- [ ] **Step 1: Invert the tests** — In `src/ui/Terminal.test.tsx`:

- The `:296` test "ka raw-sends English, never nl.translate" → split into two:
  - **Zork I ka routes through `nl.translate`** (the headline change): typed
    Georgian calls `translate`, NOT a raw `sendLine`; and plain-ASCII English
    still reaches the engine via the §5.5 fallback. Use the Zork I `bytes`.
  - **Zork II ka still raw-sends** (new pin, §5.6): with a Zork II story
    signature, a typed line raw-sends via `sendLine` and `translate` is NOT
    called; the placeholder stays the Phase-1 type-English copy.
- The `:388` placeholder test → assert the Zork I `ka` placeholder is the
  **"type in Georgian or English"** copy (Georgian text), not the type-English one.
- The `:335` help-intercept test → on Zork I `ka`, `help` is handled through the
  normal `nl` path (still lands on the Georgian help block). On Zork II `ka`,
  `help` is intercepted at the boundary (unchanged).
- The `:423` "no model-download modal for ka" test → **unchanged** (still no modal).

Write these expectations FIRST (red).

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/ui/Terminal.test.tsx`
Expected: FAIL — current Terminal raw-sends all `ka`.

- [ ] **Step 3: Implement the route change** — In `src/ui/Terminal.tsx`:

Replace the `outputOnly`/`nlInputOn` derivation (lines ~149–150) with a
`kaInputActive`-based gate:

```ts
import { kaInputActive } from '../llm/lexicon/index'
// …
  const outLang = nl.state.phase === 'on' ? nl.state.language : 'off'
  const nlOn = nl.state.phase === 'on'
  // ka graduates to INPUT only on a game with a ka lexicon (Zork I, spec §5.6);
  // on Zork II/III it raw-sends English (Phase-1). fr/de/es always route.
  const kaActive = kaInputActive(outLang, signature)
  const kaRawSend = outLang === 'ka' && !kaActive // ka on a no-lexicon game
  const nlInputOn = nlOn && (outLang !== 'ka' || kaActive)
```

In the `onSubmit` handler (lines ~318–346), the help-intercept-at-boundary branch
now keys on `kaRawSend` (only the raw-send ka path needs it; routed ka handles
help in-pipeline):

```ts
              if (nlInputOn)
                void nl.translate(text).then(retained => {
                  if (retained != null)
                    setRestore(r => ({ text: retained, key: (r?.key ?? 0) + 1 }))
                })
              else if (kaRawSend && isHelpTrigger(text, activeLang))
                nl.showHelp(activeLang)
              else if (engineRef.current) engineRef.current.sendLine(text)
              else log.warn('submit ignored: engine not ready')
```

The command-field `lang` attribute (line ~316) stays `nlInputOn ? nlLang :
undefined` — so Zork I `ka` now tags input `lang="ka"`? **No** — `ka` input is
Georgian on Zork I, so tagging `lang="ka"` is now CORRECT (the value is Georgian).
Keep `nlInputOn ? nlLang : undefined`; for Zork II `ka` (`nlInputOn` false) it
stays undefined (English value). Update the Task-9-era a11y test note accordingly.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/ui/Terminal.test.tsx`
Expected: PASS — Zork I `ka` routes + Georgian copy; Zork II `ka` raw-sends + type-English copy; no modal.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/Terminal.test.tsx
git commit -m "feat(georgian): route ka input via kaInputActive (Zork I); II/III raw-send"
```

---

### Task 18: Revise the `ka` notice copy to Georgian-input semantics

**Files:**
- Modify: `src/llm/notices.ts`

The `ka` arms already exist as Phase-1 *type-English* copy — this is a
**revision**, not authoring. The Georgian-input copy is shown only when
`kaInputActive` (the placeholder/label are passed the right `lang` by Terminal;
the activation tip is gated in Task 20).

- [ ] **Step 1: Write the failing test** — add to `src/llm/notices.test.ts`:

```ts
describe('ka Georgian-input copy (spec §7)', () => {
  it('placeholder invites Georgian, no longer "type in English"', () => {
    const p = commandPlaceholder('ka')
    expect(p).toMatch(/ქართულ/) // mentions Georgian
    expect(p).not.toMatch(/ინგლისურად — მაგ/) // not the old type-English copy
  })
  it('couldntTranslate has a Georgian ka entry (abstain stays in-language)', () => {
    expect(couldntTranslate('ka')).toMatch(/[Ⴀ-ჿ]/)
  })
})
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Revise the `ka` entries** — In `src/llm/notices.ts`:

**S1 — PRESERVE the Phase-1 type-English strings (Task 20 needs them for Zork
II/III).** Do not overwrite in place; rename the old strings and add the new ones
alongside.

`commandPlaceholder` `ka` (line ~215) — make the DEFAULT the Georgian-input copy,
and add a sibling `commandPlaceholderTypeEnglish` exporting the OLD string:

```ts
      // NATIVE-REVIEW-DRAFT (ka §7): Georgian input now works (Zork I, beta);
      // English also raw-sends.
      ka: 'აკრიფეთ ქართულად ან ინგლისურად — მაგ. აიღე ფარანი',
```

```ts
/** The Phase-1 type-English ka field copy, RETAINED for ka on a no-input game
 * (Zork II/III, spec §5.6). Terminal uses this when !kaInputActive. */
export function commandPlaceholderTypeEnglish(): string {
  return 'აკრიფეთ ინგლისურად — მაგ. open the mailbox'
}
```

`commandLabel` `ka` (line ~230):

```ts
      ka: 'თამაშის ბრძანება — ქართული ან ინგლისური',
```

`GEORGIAN_ACTIVATION_TIP` — add the Georgian-INPUT tip as the NEW name and KEEP
the Phase-1 tip under a retained name (the hook chooses between them per
`kaInputActive`, Task 20 / S2):

```ts
/** Phase-1 ka tip (type English; text shows in Georgian). RETAINED for ka on a
 * no-input game (Zork II/III). NATIVE-REVIEW-DRAFT. */
export const GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH =
  'რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს. დახმარებისთვის აკრიფეთ help.'

/** Phase-2 ka tip: Georgian input (Zork I, beta) + the quoted-English escape
 * (now meaningful, since ka has an input path). NATIVE-REVIEW-DRAFT. */
export const GEORGIAN_ACTIVATION_TIP =
  'რჩევა: ბრძანებები აკრიფეთ ქართულად (beta); ამოუცნობი ბრძანება გააგზავნეთ ზუსტად ინგლისურად ბრჭყალებში, მაგ. "wind up canary". დახმარებისთვის აკრიფეთ help.'
```

> The `escapeHatchOnActivation(lang)` switch (notices.ts) currently returns
> `GEORGIAN_ACTIVATION_TIP` for `ka`. Make it take the input-active flag —
> `escapeHatchOnActivation(lang, kaInput: boolean)` — and for `ka` return
> `kaInput ? GEORGIAN_ACTIVATION_TIP : GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH`.
> `makeActivationNotice()` threads the flag through (Task 20 passes it from the
> hook). The once-per-language latch is unchanged.

Add Georgian `ka` entries to `couldntTranslate`, `nothingSent`,
`grammarOnlyFirstMiss`, `ranOfActions` (the input-side abstain/partial notices a
`ka` player can now hit). Each `NATIVE-REVIEW-DRAFT`. (`ka` is `Partial<Record>`
in `ByLang`, so omission falls back to English — author them so it doesn't.)

- [ ] **Step 4: Run to verify it passes** + the existing notices suite.

Run: `npx vitest run src/llm/notices.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/notices.ts src/llm/notices.test.ts
git commit -m "feat(georgian): revise ka notices to Georgian-input semantics"
```

---

### Task 19: Revise the `ka` help arm

**Files:**
- Modify: `src/llm/help.ts:74`

- [ ] **Step 1: Write the failing test** — add to `src/llm/help.test.ts`:

```ts
it('ka help block describes Georgian input + the quoted escape', () => {
  const h = helpResponse('ka')
  expect(h).toMatch(/ქართულ/) // type in Georgian
  expect(h).toContain(ESCAPE_EXAMPLE) // the quoted-English escape is now relevant
})
```

- [ ] **Step 2: Run to verify it fails** (today the `ka` arm says type-English, no escape).

- [ ] **Step 3: Revise the `ka` arm** (line 74), mirroring fr/de/es (instruction
in Georgian; the escape EXAMPLE stays English by necessity):

```ts
    case 'ka':
      // NATIVE-REVIEW-DRAFT (ka §7): Georgian input (Zork I, beta).
      return [
        'დახმარება — ბრძანებები აკრიფეთ ქართულად; მე გადავთარგმნი თამაშისთვის.',
        'სპეციალური ბრძანებები (აკრიფეთ ინგლისურად): save (შენახვა), restore (აღდგენა), restart (თავიდან დაწყება), quit (გასვლა), score (ქულა), diagnose (მდგომარეობა), look (ყურება), inventory (ინვენტარი), verbose / brief (გრძელი / მოკლე აღწერები). version აჩვენებს თამაშის ვერსიას.',
        `ზუსტი ბრძანების თარგმანის გარეშე გასაგზავნად ჩასვით ბრჭყალებში, მაგ. ${ESCAPE_EXAMPLES}.`,
        'ამ შეტყობინების ხელახლა სანახავად აკრიფეთ help.',
      ].join('\n')
```

- [ ] **Step 4: Run to verify it passes.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/help.ts src/llm/help.test.ts
git commit -m "feat(georgian): revise ka help block to Georgian-input semantics"
```

---

### Task 20: Gate the Zork-I-vs-II/III `ka` copy split — announce in the HOOK, placeholder in Terminal

**Files:**
- Modify: `src/llm/useNaturalLanguage.ts` (the announce-tip selection — S2)
- Modify: `src/llm/notices.ts` (`escapeHatchOnActivation` takes the input flag — S2)
- Modify: `src/ui/Terminal.tsx` (the placeholder override — kaRawSend)

The Georgian-input tip/placeholder must show only on Zork I (`kaInputActive`); on
Zork II/III `ka`, retain the Phase-1 type-English copy so a player isn't told
Georgian input works where it doesn't.

**S2 — the announce tip is latched INSIDE the hook, not in Terminal.** The agent
review caught that `nl.announce` is set in `useNaturalLanguage.ts:233`
(`if (OUTPUT_ONLY_LANGS.has(active)) setAnnounce(msg)`), where `msg` comes from
the activation-notice latch. Terminal cannot retroactively change which string was
latched — so the Zork-I-vs-II/III split MUST happen in the hook, which already has
the `signature`. The placeholder (a pure prop) is gated in Terminal.

- [ ] **Step 1: Write the failing tests**
  - Hook test (renderHook): `ka` + `ZORK1_SIG` → `nl.announce` is the
    `GEORGIAN_ACTIVATION_TIP` (Georgian-input); `ka` + `ZORK2_SIG` → the
    `GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH`.
  - Terminal test (`Terminal.test.tsx`): Zork I `ka` placeholder is the
    Georgian-input copy; Zork II `ka` placeholder is the type-English copy.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3a: Split the announce in the hook** — In `src/llm/notices.ts`, make
the activation latch input-aware:

```ts
// escapeHatchOnActivation now takes whether ka INPUT is active (Zork I):
case 'ka':
  return kaInput ? GEORGIAN_ACTIVATION_TIP : GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH
```

(Thread a `kaInput: boolean` param through `escapeHatchOnActivation(lang, kaInput)`
and the `makeActivationNotice()` returned fn `(lang, kaInput) => …`.) In
`src/llm/useNaturalLanguage.ts` where the activation notice is computed (≈ line
233 region), pass `kaInputActive(active, signature)` as the flag:

```ts
      const msg = activationNotice(active, kaInputActive(active, signature))
      if (OUTPUT_ONLY_LANGS.has(active)) setAnnounce(msg)
```

(`OUTPUT_ONLY_LANGS.has(active)` STILL routes `ka`'s tip to the announce region —
C2 keeps `ka` in the set; only the tip CONTENT now splits by signature.)

- [ ] **Step 3b: Gate the placeholder in Terminal** — In `src/ui/Terminal.tsx`:

```ts
            placeholder={
              kaRawSend
                ? commandPlaceholderTypeEnglish() // Zork II/III ka: Phase-1 copy
                : nlOn
                  ? commandPlaceholder(activeLang) // Zork I ka: Georgian-input
                  : 'type a command…'
            }
```

(`commandPlaceholderTypeEnglish` is the retained Phase-1 helper added in Task 18.)

- [ ] **Step 4: Run to verify they pass.** Expected: PASS — announce + placeholder
match the game.

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx src/ui/Terminal.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/llm/useNaturalLanguage.ts src/llm/notices.ts src/ui/Terminal.tsx
git commit -m "feat(georgian): split ka activation tip by signature in the hook; placeholder in Terminal"
```

---

### Task 21: `ka`-notice copy gate (no-English-script + new-semantics)

**Files:**
- Create: `src/llm/ka-input-copy.test.ts`

Two complementary assertions (spec §6, issue-2): (a) no English-script leak in
the `ka` input-path notices; (b) the new Phase-2 semantics are present and the old
type-English-only strings are gone. (a) alone is green on the stale copy, so (b)
is what enforces the migration.

- [ ] **Step 1: Write the gate**

```ts
// src/llm/ka-input-copy.test.ts
import { describe, it, expect } from 'vitest'
import {
  commandPlaceholder,
  commandLabel,
  couldntTranslate,
  GEORGIAN_ACTIVATION_TIP,
} from './notices'
import { helpResponse } from './help'

const GEORGIAN = /[Ⴀ-ჿ]/
// English WORDS that must NOT appear in ka copy (allowing the deliberate English
// tokens: the quoted escape example, the meta-verb names save/restore/…, "beta",
// "version", "help").
const STRAY_ENGLISH = /\b(type|please|command|sorry|understood)\b/i

describe('ka input copy — no English-script leak (gate a)', () => {
  for (const [name, s] of [
    ['placeholder', commandPlaceholder('ka')],
    ['label', commandLabel('ka')],
    ['abstain', couldntTranslate('ka')],
    ['activation', GEORGIAN_ACTIVATION_TIP],
    ['help', helpResponse('ka')],
  ] as const)
    it(`${name} is Georgian and leaks no stray English prose`, () => {
      expect(GEORGIAN.test(s)).toBe(true)
      expect(STRAY_ENGLISH.test(s)).toBe(false)
    })
})

describe('ka input copy — new Phase-2 semantics (gate b)', () => {
  it('activation tip mentions Georgian input + beta + the quoted escape', () => {
    expect(GEORGIAN_ACTIVATION_TIP).toMatch(/ქართულ/)
    expect(GEORGIAN_ACTIVATION_TIP).toMatch(/beta/)
    expect(GEORGIAN_ACTIVATION_TIP).toContain('"wind up canary"')
  })
  it('placeholder invites Georgian, not the old type-English-only copy', () => {
    expect(commandPlaceholder('ka')).toMatch(/ქართულ/)
    // The exact stale Phase-1 string must be gone.
    expect(commandPlaceholder('ka')).not.toBe('აკრიფეთ ინგლისურად — მაგ. open the mailbox')
  })
})
```

- [ ] **Step 2: Run to verify it passes** (Tasks 18–20 made it green).

Run: `npx vitest run src/llm/ka-input-copy.test.ts`
Expected: PASS. If gate (b) fails, a revision was missed — fix the copy, not the test.

- [ ] **Step 3: Commit**

```bash
git add src/llm/ka-input-copy.test.ts
git commit -m "test(georgian): ka copy gate — no-English-leak + new-semantics"
```

---

### Task 22: `ka` disambiguation — drop-the-noun reframe (no forced English on Georgian input)

**Files:**
- Modify: `src/translate/corpus/zork1.ka.templates.ts:64–86` (the 3 which-print templates)
- Modify: `src/translate/corpus/zork1.ka.uat.test.ts` (invert the `{raw}`-echo pins)
- Modify: `src/translate/corpus/ka-native-review-draft.test.ts` (the locator)

**Why (CLAUDE.md cross-cut, caught by the review).** Today the `ka` which-print
prompt echoes the player's typed noun verbatim:
`out: 'რომელ {raw}-ს გულისხმობ — {obj.indef} თუ {obj2.indef}?'`. That was fine in
Phase 1 because `ka` input was **English** — the echoed `{raw}` was the player's
own English word. Once the player types **Georgian** (Phase 2, Zork I), an echoed
English vocab token (`lamp`, `button`) becomes **forced English** — a CLAUDE.md
"no forced English" violation, and `ka` has no LLM net. fr/de/es already use the
**drop-the-noun reframe** (`{raw}` matched but NOT echoed; translated candidates
disambiguate alone). Mirror it for `ka`.

- [ ] **Step 1: Invert the `ka` disambiguation UAT pins** — In
`src/translate/corpus/zork1.ka.uat.test.ts`, the existing tests assert the typed
English noun is KEPT (`expect(out).toContain('lamp')`, `…toContain('button')`).
Flip them to assert it's GONE, mirroring the fr/de/es "no leaked English frame"
shape:

```ts
    // drop-the-noun reframe (Phase 2): the queried English noun is NOT echoed.
    expect(out).not.toContain('lamp')
    expect(out).not.toContain('Which')
    expect(out).not.toContain('do you mean')
    // translated candidates still render (Georgian)
    expect(out).toContain('სპილენძის ფარანი')
    expect(out).toContain('გატეხილი ფარანი')
```

(Do the same for the 3-candidate knife test and the 4-candidate dam-button test —
remove every `toContain('button')`/`toContain('lamp')`/`toContain('knife')`.)

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/translate/corpus/zork1.ka.uat.test.ts`
Expected: FAIL — the templates still echo `{raw}`.

- [ ] **Step 3: Reframe the 3 templates** — In `src/translate/corpus/zork1.ka.templates.ts`
(lines 64–86), drop `{raw}` from each `out` and use a noun-free Georgian frame:

```ts
  // NATIVE-REVIEW-DRAFT (drop-the-noun reframe, Phase 2): no {raw} echo — the
  // translated candidates disambiguate (mirrors fr/de/es; deterministic-no-English).
  { en: 'Which {raw} do you mean, the {obj} or the {obj2}?',
    out: 'რომელი გულისხმობ — {obj.indef} თუ {obj2.indef}?' },
  { en: 'Which {raw} do you mean, the {obj}, the {obj2}, or the {obj3}?',
    out: 'რომელი გულისხმობ — {obj.indef}, {obj2.indef} თუ {obj3.indef}?' },
  { en: 'Which {raw} do you mean, the {obj}, the {obj2}, the {obj3}, or the {obj4}?',
    out: 'რომელი გულისხმობ — {obj.indef}, {obj2.indef}, {obj3.indef} თუ {obj4.indef}?' },
```

> The `en` side KEEPS `{raw}` (it must still MATCH the English prompt, where the
> noun varies); only the `out` side drops it. `რომელი გულისხმობ` ≈ "which do you
> mean" with no echoed noun. Native-review-draft wording.

- [ ] **Step 4: Fix the marker-test locator** — `ka-native-review-draft.test.ts`
finds the disambiguation entry by a line containing BOTH `{raw}` and
`{obj.indef}`. After the reframe the `out` line has `{obj.indef}` but no `{raw}`,
so the locator must change to match the new `out` (e.g. find the Georgian line
containing `{obj.indef}` and `{obj2.indef}`), then assert the marker governs it.

- [ ] **Step 5: Run to verify they pass** + the corpus suites (no fr/de/es change).

Run: `npx vitest run src/translate/corpus/`
Expected: PASS — `ka` disambiguation renders Georgian-only; marker test green;
the composed-line gate / walkthrough-coverage still green (the `en` side still
matches).

- [ ] **Step 6: Commit**

```bash
git add src/translate/corpus/zork1.ka.templates.ts src/translate/corpus/zork1.ka.uat.test.ts src/translate/corpus/ka-native-review-draft.test.ts
git commit -m "feat(georgian): drop-the-noun disambiguation reframe for ka (no forced English)"
```

---

### Task 23: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite + lint + types + format**

Run: `make all`
Expected: PASS — zero failures, no stray `console.error`/`console.warn`, no
React `act(...)` warnings.

- [ ] **Step 2: Manual a11y/responsive spot-check** (no automated gate exists per
CLAUDE.md): pick `ka` on Zork I, confirm the Georgian-input placeholder/label/
activation announce read correctly and are keyboard-reachable; pick `ka` on Zork
II, confirm the type-English copy + raw-send. Both themes, 320px width.

- [ ] **Step 3: Commit any format fixes**

```bash
git add -A
git commit -m "chore(georgian): make all green — Phase 2 input complete (beta)"
```

---

## Self-Review (coverage vs spec)

- **§1 grammar-only, no LLM for ka input** → Tasks 14 (force model:grammar), 16 (queue), 15 (lex gate). ✓
- **§2 imperative-nominative + closed postpositions** → Tasks 2, 4 (`KA_POSTPOSITIONS`, `-ი` strip). ✓
- **§3.1 optional `postpositions` field; §3.2 `expandGeorgian`; merge into preps** → Tasks 1, 2, 3, 4. ✓
- **§3.3 directions via directions.ts** → Task 7. ✓
- **§4 KA_CORE / KA_ZORK1 authored, NATIVE-REVIEW-DRAFT** → Tasks 4, 5, 13. ✓
- **§5.1 InputLexLang (ka out of LLM maps); §5.2 lex memo; §5.3 Terminal route; §5.4 model:grammar; §5.5 English raw-send; §5.6 kaInputActive** → Tasks 1, 6, 15, 17, 14, 17, 6/17. ✓
- **§6 gates: walkthrough-parse, both round-trips, validate, input-UAT, marker, no-English-leak** → Tasks 11, 9, 10, 8, 12, 13, 21. ✓
- **§7 Georgian copy revised + new-semantics gate** → Tasks 18, 19, 20, 21. ✓
- **§7 disambiguation drop-the-noun reframe (CLAUDE.md `{raw}`-echo cross-cut)** → Task 22. ✓
- **§8 deferrals (it-anaphora, II/III, general morphology)** → pronoun arrays empty (Task 4); ka Zork I only (Task 6); no segmenter. ✓
- **Issue-1 Zork-I gate** → `kaInputActive` (Tasks 6, 15, 17, 20) + round-trip null-skip (Task 9). ✓
- **Issue-2 two-part copy gate** → Task 21. ✓
- **Issue-3 model:grammar at state boundary** → Task 14. ✓
- **G1 dative recipient (spec gap, flagged)** → Task 9. ✓ *(owner may redirect.)*

**Plan-review fixes applied (agent pushback, `…-plan-pushback.md`):**
- **C1** — `expandGeorgian` runs AFTER verb resolution on the object-span
  remainder (Task 3), so `-ი`-final verbs aren't mangled; pinned by a dedicated
  test. ✓
- **C2** — `OUTPUT_ONLY_LANGS` is NOT emptied (`ka` stays, output still
  corpus-only); the input decision uses `kaInputActive` and the queue bail keys on
  `!liveRef.current.lex` (Tasks 16, 17). `types.ts`/`types.test.ts` untouched. ✓
- **S1/S2** — Phase-1 `ka` copy strings preserved under retained names; the
  activation-tip split happens in the hook (signature-aware), not Terminal
  (Tasks 18, 20). ✓
- **S3** — `InputLexLang` comment softened to the accurate guarantee (Task 1). ✓
- **M2** — corpus `reduce` is nominative-strip-only (no postposition split), with
  hand-judgment for case-bearing display names (Task 10). ✓
- **M3** — dangling `KA_DATIVE_RECIPIENTS` reference removed; G1 lives in
  `parse.ts` + `KA_ZORK1` dative entries (Task 9). ✓
- **m1–m6** — unused binding removed, `byCanonical` note reworded, redundant
  `wind up` idiom dropped (Tasks 3, 4). ✓

**Known follow-ups (native loop, spec §9):** all `ka` lexicon/copy is
`NATIVE-REVIEW-DRAFT` behind `(beta)`; the Tbilisi loop refines forms and, on
sign-off, `(beta)` drops via a one-line `languageOptions.ts` edit.
