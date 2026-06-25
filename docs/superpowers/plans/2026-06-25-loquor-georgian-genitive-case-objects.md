# Georgian multi-word objects in case roles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a multi-word Georgian object (`<modifier…> <head>`) resolve when its head takes a case suffix in a prepositional/instrumental slot, and swap the wrench from the wrong word `სასხლეტი` ("trigger") to the correct `ქანჩის გასაღები` ("nut-key").

**Architecture:** One new rule in the existing prep-split loop of `src/llm/lexicon/parse.ts` — a *stranded-modifier rejoin by split-point search*. When the object span before a preposition fails to resolve, scan split points and shift the stranded modifier(s) across the prep onto the instrument; commit only if both halves resolve. Gated to Georgian (`core.postpositions`), fires only on `!obj`, so it cannot regress any command that already parses. The wrench word swap is pure data (lexicon + display corpus + one output string) plus fixture updates.

**Tech Stack:** TypeScript, Vitest. No new dependencies. The pipeline is `parseLexicon` (`parse.ts`) over per-language lexicons (`ka.core.ts`, `ka.zork1.ts`); Georgian input runs through the `expandGeorgian` pre-stage. Display corpus lives in `src/translate/corpus/`.

**Source spec:** `docs/superpowers/specs/2026-06-25-loquor-georgian-genitive-case-objects-design.md`

---

### Task 1: The split-point rejoin mechanism

The whole feature. Driven by two cases that need **only the parser change** (their full-phrase forms are already stored synonyms), so they isolate the mechanism from any data edit.

**Files:**
- Modify: `src/llm/lexicon/parse.ts:516-528` (the prep-split loop body)
- Test: `src/llm/lexicon/parse.ka.test.ts` (append a new `describe`)

- [ ] **Step 1: Write the failing tests**

Append to `src/llm/lexicon/parse.ka.test.ts` (after the last `describe` block; it already defines `const ka = (c: string) => parseLexicon(c, KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty)`):

```ts
describe('Georgian parse — multi-word objects in case roles (split-point rejoin)', () => {
  it('k=1: put painting in the full-form trophy case (1 genitive modifier)', () => {
    // ჯილდოების ვიტრინაში → [ში, ვიტრინა]; the genitive ჯილდოების is stranded
    // before the prep. The rejoin shifts it across: object = painting,
    // instrument = 'ჯილდოების ვიტრინა' (a stored synonym) → trophy case ('case').
    expect(ka('ჩადე ნახატი ჯილდოების ვიტრინაში')).toEqual({
      kind: 'command',
      text: 'put painting in case',
    })
  })
  it('k=2: inflate plastic with the full-form air pump (2 genitive modifiers)', () => {
    // ხელის ჰაერის ტუმბოით → [ხელის, ჰაერის, ით, ტუმბო]; TWO modifiers stranded.
    // The search shifts both across: object = plastic (emit 'valve'),
    // instrument = 'ხელის ჰაერის ტუმბო' (stored) → pump. Proves the loop, not just k=1.
    expect(ka('გაბერე პლასტმასი ხელის ჰაერის ტუმბოით')).toEqual({
      kind: 'command',
      text: 'inflate valve with pump',
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/llm/lexicon/parse.ka.test.ts -t "split-point rejoin"`
Expected: FAIL — both assertions get `{ kind: 'miss' }` (the stranded modifier makes the object span unresolvable, and no rejoin exists yet).

- [ ] **Step 3: Implement the rejoin in the prep-split loop**

In `src/llm/lexicon/parse.ts`, replace the current loop body (lines 516–528):

```ts
    const objSpan = tokens.slice(0, i)
    const objTokens =
      objSpan.length > 1 && (objSpan[0] === 'a' || objSpan[0] === 'al')
        ? objSpan.slice(1)
        : objSpan
    const obj = resolveNoun(objTokens, core, nouns, vocab, scene)
    const ind = resolveNoun(tokens.slice(i + 1), core, nouns, vocab, scene)
    if (obj && ind && verbArityOk(verb, vocab, 2))
      return {
        kind: 'command',
        text: `${verb} ${obj.emit} ${prep} ${ind.emit}`,
      }
```

with:

```ts
    const objSpan = tokens.slice(0, i)
    const objTokens =
      objSpan.length > 1 && (objSpan[0] === 'a' || objSpan[0] === 'al')
        ? objSpan.slice(1)
        : objSpan
    let obj = resolveNoun(objTokens, core, nouns, vocab, scene)
    let ind = resolveNoun(tokens.slice(i + 1), core, nouns, vocab, scene)
    // Georgian stranded-modifier rejoin (ka only — gated on core.postpositions). A
    // Georgian modifier precedes its head; a case suffix splits off the HEAD only,
    // so a multi-word instrument arrives as [modifier…, PREP, head] — the prep is
    // wedged mid-phrase, stranding the modifier(s) at the end of the object span.
    // If the object span fails as-is, scan split points k = 1 … len-1 (smallest
    // object first — modifiers belong to the instrument) for the first k where the
    // trimmed object AND the modifier(s) + instrument BOTH resolve as nouns. Fires
    // only on !obj (never touches a command that already parses) and commits only a
    // fully-resolving reparse, so it can't mis-bind. Move-one is just k=1.
    if (core.postpositions && !obj && objTokens.length > 1) {
      for (let k = 1; k < objTokens.length; k++) {
        const o = resolveNoun(objTokens.slice(0, k), core, nouns, vocab, scene)
        const r = resolveNoun(
          [...objTokens.slice(k), ...tokens.slice(i + 1)],
          core,
          nouns,
          vocab,
          scene,
        )
        if (o && r) {
          obj = o
          ind = r
          break
        }
      }
    }
    if (obj && ind && verbArityOk(verb, vocab, 2))
      return {
        kind: 'command',
        text: `${verb} ${obj.emit} ${prep} ${ind.emit}`,
      }
```

(Only two real changes: `const obj/ind` → `let obj/ind`, and the inserted `if (core.postpositions …)` block.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/llm/lexicon/parse.ka.test.ts -t "split-point rejoin"`
Expected: PASS (both).

- [ ] **Step 5: Run the full lexicon suite to confirm no regression**

Run: `npx vitest run src/llm/lexicon/`
Expected: PASS — every existing case (incl. fr/de/es `parse.test.ts`, the other `parse.ka*` tests, and `roundtrip.test.ts`) stays green. fr/de/es cores have no `postpositions`, so the new block never executes for them.

- [ ] **Step 6: Commit**

```bash
git add src/llm/lexicon/parse.ts src/llm/lexicon/parse.ka.test.ts
git commit -m "feat(georgian): rejoin stranded modifiers across a case suffix

Split-point search in the prep-split loop: when a multi-word instrument's
case suffix wedges the prep mid-phrase, shift the stranded modifier(s) across
so the instrument resolves. ka-only (core.postpositions), fires only on !obj.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Safety pins — mis-bind guard + residual-ceiling clean-miss

These are guard tests: they assert behavior that must *stay* correct once the mechanism is in — the search must not mis-fire on an object that already resolves whole, and the egg full-ablative must cleanly miss rather than mis-resolve (the pushback's C1/C2). They pass with the Task-1 mechanism in place. No production code changes.

**Files:**
- Test: `src/llm/lexicon/parse.ka.test.ts` (extend the same `describe` from Task 1)

- [ ] **Step 1: Write the guard tests**

Add inside the `describe('Georgian parse — multi-word objects in case roles …')` block:

```ts
  it('mis-bind guard: a multi-word object that resolves whole is never split', () => {
    // 'დიდ ზურმუხტ' (large emerald, adjective + noun) resolves as ONE noun before
    // the prep, so obj is non-null and the rejoin search never runs — the command
    // parses normally to 'put emerald in case'.
    expect(ka('ჩადე დიდ ზურმუხტი ვიტრინაში')).toEqual({
      kind: 'command',
      text: 'put emerald in case',
    })
  })
  it('residual ceiling: the egg full ablative cleanly misses (bare form works)', () => {
    // -დან splits but leaves the stem's -ი ('კვერცხი'), so the rejoined instrument
    // 'გატეხილ თვლებიან კვერცხი' is NOT a stored form → no split resolves → clean
    // miss (abstain), never a mis-resolve. The bare 'აიღე კანარა კვერცხიდან'
    // ('take canary from egg') is the taught path, pinned in the walkthrough.
    expect(ka('აიღე კანარა გატეხილ თვლებიან კვერცხიდან')).toEqual({
      kind: 'miss',
    })
  })
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `npx vitest run src/llm/lexicon/parse.ka.test.ts -t "split-point rejoin"`
Expected: PASS (all four cases in the block).

- [ ] **Step 3: Commit**

```bash
git add src/llm/lexicon/parse.ka.test.ts
git commit -m "test(georgian): pin rejoin mis-bind guard + egg ablative clean-miss

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wrench word swap (`სასხლეტი` → `ქანჩის გასაღები`)

One atomic change: the input lexicon, the display corpus, the output string, and every fixture move together. They MUST be one commit — dropping the bare `სასხლეტ` lexicon form while the display corpus still says `სასხლეტი გასაღები` would break the corpus round-trip (its reduced form would no longer be a stored input form).

**Files:**
- Modify: `src/llm/lexicon/ka.zork1.ts:202` (wrench entry)
- Modify: `src/translate/corpus/zork1.ka.objects.ts:160` (wrench display)
- Modify: `src/translate/corpus/zork1.ka.strings.ts:1820` (`(with the wrench)`)
- Test: `src/llm/lexicon/parse.ka-uat.test.ts:22-30` (instrumental pin)
- Test: `src/llm/lexicon/parse.ka-walkthrough.test.ts:153,159-162,163` (three wrench commands)

- [ ] **Step 1: Update the parse fixtures to the new word (they go red)**

In `src/llm/lexicon/parse.ka-uat.test.ts`, replace the wrench instrumental test (lines 22–30):

```ts
  it('-ით instrumental: turn bolt with wrench (genitive-compound instrument)', () => {
    // walkthrough fixture: 'მოატრიალე ხრახნი ქანჩის გასაღებით' → 'turn bolt with wrench'.
    // wrench = ქანჩის გასაღები ('nut-key'), a genitive compound. -ით splits off the
    // head (გასაღებით → [ით, გასაღებ]); the stranded-modifier rejoin re-joins ქანჩის
    // across the prep so the instrument resolves as 'ქანჩის გასაღებ' → wrench.
    expect(ka('მოატრიალე ხრახნი ქანჩის გასაღებით')).toEqual({
      kind: 'command',
      text: 'turn bolt with wrench',
    })
  })
```

In `src/llm/lexicon/parse.ka-walkthrough.test.ts`, change the three wrench commands:

Line 153:
```ts
  'take wrench': { ka: 'აიღე ქანჩის გასაღები', expect: 'take wrench' },
```
Lines 159–162:
```ts
  'turn bolt with wrench': {
    ka: 'მოატრიალე ხრახნი ქანჩის გასაღებით',
    expect: 'turn bolt with wrench',
  },
```
Line 163:
```ts
  'drop wrench': { ka: 'დადე ქანჩის გასაღები', expect: 'drop wrench' },
```

- [ ] **Step 2: Run the parse fixtures to verify they fail**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts src/llm/lexicon/parse.ka-walkthrough.test.ts`
Expected: FAIL — the new `ქანჩის გასაღებ*` commands miss, because the lexicon still maps `სასხლეტ` and has no `ქანჩის გასაღებ`.

- [ ] **Step 3: Swap the input lexicon**

In `src/llm/lexicon/ka.zork1.ts` line 202, replace:

```ts
  wrench: ['სასხლეტ გასაღებ', 'სასხლეტ'], // head-noun სასხლეტი → სასხლეტ
```
with:
```ts
  // wrench = 'nut-key' (ქანჩის გასაღები), a genitive compound. ONLY the full
  // two-word form — bare გასაღებ is the skeleton key, so no bare synonym. The -ით
  // instrumental resolves via the stranded-modifier rejoin in parse.ts.
  wrench: ['ქანჩის გასაღებ'],
```

- [ ] **Step 4: Swap the display corpus + output string**

In `src/translate/corpus/zork1.ka.objects.ts` line 160:
```ts
  wrench: { indef: 'ქანჩის გასაღები' },
```

In `src/translate/corpus/zork1.ka.strings.ts` line 1820:
```ts
  '(with the wrench)': '(ქანჩის გასაღებით)', // genitive compound 'nut-key'
```

- [ ] **Step 5: Run the parse fixtures + both round-trips + the corpus UAT**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts src/llm/lexicon/parse.ka-walkthrough.test.ts src/llm/lexicon/roundtrip.test.ts src/translate/corpus/roundtrip.test.ts src/translate/corpus/zork1.ka.uat.test.ts`
Expected: PASS — the three wrench commands resolve (`take`/`drop` via the whole-phrase path, `turn … with` via the Task-1 rejoin); the lexicon round-trip lifts `ქანჩის გასაღებ` → `ქანჩის გასაღები` → wrench; the corpus round-trip reduces the display `ქანჩის გასაღები` → `ქანჩის გასაღებ` (a stored input form); the corpus UAT's `(with the wrench)` pin still matches Georgian containing `გასაღებ`.

- [ ] **Step 6: Commit**

```bash
git add src/llm/lexicon/ka.zork1.ts src/translate/corpus/zork1.ka.objects.ts src/translate/corpus/zork1.ka.strings.ts src/llm/lexicon/parse.ka-uat.test.ts src/llm/lexicon/parse.ka-walkthrough.test.ts
git commit -m "fix(georgian): wrench is ქანჩის გასაღები ('nut-key'), not სასხლეტი ('trigger')

Swap the wrong word everywhere a Georgian player meets it — input lexicon,
display corpus, the (with the wrench) parenthetical, and the three walkthrough
commands + the UAT instrumental pin. The full-compound instrumental parses via
the Task-1 rejoin; no bare form (bare გასაღებ is the skeleton key).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite**

Run: `make test`
Expected: PASS — entire Vitest suite green, no stray `console.*` / `act()` warnings on stderr.

- [ ] **Step 2: Typecheck**

Run: `make typecheck`
Expected: clean (no errors). The only signature change is `const` → `let` on two locals; no types move.

- [ ] **Step 3: If `make all` reports lint/format changes, apply and commit them**

Run: `make all`
If Prettier/ESLint rewrote anything:
```bash
git add -A
git commit -m "chore: lint/format after Georgian case-role rejoin

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
Expected: `make all` (lint + format + typecheck + test) exits clean.
