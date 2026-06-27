# Georgian dative `-ს` & fused instrumental `-თი` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make two natural Georgian commands consume a turn — `გაბერე პლასტმასი ტუმბოთი` ("inflate the plastic with the pump") and `დააჭირე ყვითელ ღილაკს` ("push the yellow button") — without regressing any other `ka` command.

**Architecture:** Two narrow, deterministic `ka`-only pre-stage rules plus a resolve-gated noun fallback. **F1** adds a closed exact-token "fused instrumental" map in `expandGeorgian` (`ტუმბოთი → [ით, ტუმბო]`) so the existing `-ით` prep-split emits `with pump`; it requires dropping the now-redundant `ტუმბოთ` synonym (round-trip gate) and a leading-prep drop in the reply path (to preserve the natural „რით?" answer). **F2** adds a resolve-gated trailing-`-ს` strip in `resolveNoun`: try the noun as-is, and only on a miss retry with one trailing Georgian `ს` dropped — recipients and native-`ს` stems resolve as-is and are never touched.

**Tech Stack:** TypeScript, Vitest. Source of truth: `docs/superpowers/specs/2026-06-27-loquor-georgian-dative-instrumental-design.md`.

**Conventions (from CLAUDE.md):** TDD red→green→refactor; one commit per task; tests must emit no stray console output; commit messages end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. All changes are `ka`-only and deterministic — no LLM machinery is touched. Run a single test file with `npx vitest run <path>`; by name with `npx vitest run <path> -t "<substring>"`.

**Working tree note:** The `ovid/georgian-fixes` branch already exists with the spec commits. Work on that branch.

---

### Task 1: F1 plumbing — `fusedInstrumentals` field, `expandGeorgian` param, call sites

**Files:**
- Modify: `src/llm/lexicon/types.ts` (add field to `CoreLexicon`, after `dativeRecipients`)
- Modify: `src/llm/lexicon/expandGeorgian.ts` (new third param + exact-token check first)
- Modify: `src/llm/lexicon/parse.ts:405` and `src/llm/lexicon/parse.ts:649` (pass the map)
- Test: `src/llm/lexicon/expandGeorgian.test.ts`

This task is behavior-neutral on the shipping lexicon (no `KA_CORE` map yet → param defaults to `{}`), so the full suite stays green. It is proven by direct unit tests on `expandGeorgian`.

- [ ] **Step 1: Write the failing tests**

Append to `src/llm/lexicon/expandGeorgian.test.ts`, inside the existing `describe('expandGeorgian', …)` block (before its closing `})`):

```ts
  it('routes a fused instrumental to [ით, stem] (ტუმბოთი → with pump)', () => {
    // Vowel stem ტუმბო (pump): instrumental -ით fuses to -თი. Exact-token map
    // emits [ით, stem] so the existing -ით prep-split can fire.
    expect(expandGeorgian(['ტუმბოთი'], POST, { ტუმბოთი: 'ტუმბო' })).toEqual([
      'ით',
      'ტუმბო',
    ])
  })
  it('exact-token fused map never touches a თ-stem nominative', () => {
    // ასანთი (matchbook) / ყუთი (box) are NOT keys → plain -ი strip, unchanged.
    const fused = { ტუმბოთი: 'ტუმბო' }
    expect(expandGeorgian(['ასანთი'], POST, fused)).toEqual(['ასანთ'])
    expect(expandGeorgian(['ყუთი'], POST, fused)).toEqual(['ყუთ'])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/llm/lexicon/expandGeorgian.test.ts -t "fused"`
Expected: FAIL — `ტუმბოთი` currently strips to `['ტუმბოთ']` (the third arg is ignored / not a parameter yet), not `['ით', 'ტუმბო']`. (Vitest uses esbuild, so the extra 3rd arg runs fine here; do **not** run `make typecheck` between this step and Step 3 — the not-yet-added param is a `tsc` error until Step 4.)

- [ ] **Step 3: Add the `fusedInstrumentals` field to `CoreLexicon`**

In `src/llm/lexicon/types.ts`, immediately after the `dativeRecipients?: ReadonlySet<string>` field (and before the closing `}` of `CoreLexicon`), add:

```ts
  /** ka only. Closed map of fused-instrumental SURFACE forms → bare stem, for
   *  vowel stems where the instrumental -ით fuses to -თი (ტუმბოთი "with the
   *  pump"), so the generic -ით split can't fire. expandGeorgian emits [ით, stem]
   *  on an exact-token hit; the value MUST resolve as a noun and 'ით' MUST be a
   *  key in postpositions. Present only for ka. */
  fusedInstrumentals?: Readonly<Record<string, string>>
```

- [ ] **Step 4: Add the param + exact-token check to `expandGeorgian`**

In `src/llm/lexicon/expandGeorgian.ts`, change the signature and add the check as the first action in the loop:

```ts
export function expandGeorgian(
  tokens: readonly string[],
  postpositions: Readonly<Record<string, string>>,
  fusedInstrumentals: Readonly<Record<string, string>> = {},
): string[] {
  // Longest-first so -ით wins over a -ი strip and over shorter suffixes.
  const suffixes = Object.keys(postpositions).sort(
    (a, b) => b.length - a.length,
  )
  const out: string[] = []
  for (const token of tokens) {
    // Closed fused-instrumental map (ka): vowel stems where the instrumental -ით
    // fuses to -თი (ტუმბოთი "with the pump"). Exact-token, checked FIRST so the
    // token is never -ი-stripped to a bare object; emit [ით, stem] so the
    // existing -ით prep-split fires. Exact match ⇒ no collision with თ-stem
    // nominatives (ასანთი/ყუთი are not keys).
    const fused = fusedInstrumentals[token]
    if (fused) {
      out.push('ით', fused)
      continue
    }
    const post = suffixes.find(
      s => token.length > s.length && token.endsWith(s),
    )
    // … rest of the loop body is UNCHANGED …
```

Leave the remainder of the function (the `if (post) { … }` block and the `-ი` strip) exactly as-is.

- [ ] **Step 5: Pass the map at both `expandGeorgian` call sites in `parse.ts`**

`src/llm/lexicon/parse.ts:405` — change:

```ts
  if (core.postpositions) tokens = expandGeorgian(tokens, core.postpositions)
```

to:

```ts
  if (core.postpositions)
    tokens = expandGeorgian(tokens, core.postpositions, core.fusedInstrumentals)
```

`src/llm/lexicon/parse.ts:649` (inside `resolveNounReply`) — make the identical change.

- [ ] **Step 6: Run the new tests + the existing expandGeorgian suite to verify green**

Run: `npx vitest run src/llm/lexicon/expandGeorgian.test.ts`
Expected: PASS (all, including the pre-existing tests — the new param defaults to `{}` so they are unaffected).

- [ ] **Step 7: Typecheck**

Run: `make typecheck`
Expected: no errors (the new optional field and default param are backward-compatible).

- [ ] **Step 8: Commit**

```bash
git add src/llm/lexicon/types.ts src/llm/lexicon/expandGeorgian.ts src/llm/lexicon/expandGeorgian.test.ts src/llm/lexicon/parse.ts
git commit -m "feat(ka): expandGeorgian fused-instrumental map plumbing (F1, no-op)

Adds CoreLexicon.fusedInstrumentals + an exact-token check in expandGeorgian
(emits [ით, stem]) and threads it through both parse.ts call sites. Behaviour-
neutral until KA_CORE supplies a map (Task 3); proven by direct unit tests.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Reply path — drop a leading prep so the case-marked instrumental answer resolves

**Files:**
- Modify: `src/llm/lexicon/parse.ts` (`resolveNounReply`, ~lines 646-652)
- Test: `src/llm/lexicon/parse.ka-uat.test.ts`

The orphan prompt is „რით?" ("with what?", instrumental), so the natural answer is the instrumental form. Today `resolveNounReply('ტუმბოით')` misses (a leading split prep `[ით, ტუმბო]` strands the noun). This fixes that and makes the path robust before Task 3 removes the `ტუმბოთ` crutch.

- [ ] **Step 1: Write the failing test**

In `src/llm/lexicon/parse.ka-uat.test.ts`, add `resolveNounReply` to the existing import from `./parse` (it currently imports `parseLexicon`):

```ts
import { parseLexicon, resolveNounReply } from './parse'
```

Then add a new `describe` block (after the existing ones):

```ts
describe('Georgian reply path — instrumental orphan answer ("რით?")', () => {
  const reply = (s: string) =>
    resolveNounReply(s, KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty)
  it('colloquial instrumental ტუმბოით resolves to the pump', () => {
    // Answer to the inflate orphan prompt; -ით splits to [ით, ტუმბო], the
    // leading prep is dropped, ტუმბო resolves.
    expect(reply('ტუმბოით')).toBe('pump')
  })
  it('formal instrumental ტუმბოთი resolves to the pump', () => {
    expect(reply('ტუმბოთი')).toBe('pump')
  })
  it('bare ტუმბო resolves to the pump', () => {
    expect(reply('ტუმბო')).toBe('pump')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts -t "instrumental orphan"`
Expected: FAIL on the `ტუმბოით` case (`expected null to be 'pump'`). The `ტუმბოთი` and `ტუმბო` cases already pass today (via the `ტუმბოთ` synonym / vowel-final form).

- [ ] **Step 3: Add the leading-prep drop to `resolveNounReply`**

In `src/llm/lexicon/parse.ts`, replace the body after the `expandGeorgian` line:

```ts
  let tokens = tokenize(reply)
  if (tokens.length === 0) return null
  if (core.postpositions)
    tokens = expandGeorgian(tokens, core.postpositions, core.fusedInstrumentals)
  const hit = resolveNoun(tokens, core, nouns, vocab, scene)
  return hit ? hit.emit : null
```

with:

```ts
  let tokens = tokenize(reply)
  if (tokens.length === 0) return null
  if (core.postpositions)
    tokens = expandGeorgian(tokens, core.postpositions, core.fusedInstrumentals)
  let hit = resolveNoun(tokens, core, nouns, vocab, scene)
  // ka: a reply to an instrumental prompt ("რით?"/"with what?") arrives
  // case-marked (ტუმბოთი/ტუმბოით → [ით, ტუმბო]); drop a leading prep so the bare
  // instrument resolves. Gated on core.postpositions (ka only — only
  // expandGeorgian can synthesize a leading prep token); fr/de/es never reach it.
  if (!hit && core.postpositions && tokens.length > 1 && core.preps[tokens[0]])
    hit = resolveNoun(tokens.slice(1), core, nouns, vocab, scene)
  return hit ? hit.emit : null
```

(Only two substantive changes: `const hit` → `let hit`, and the new `if (!hit …)` block.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts -t "instrumental orphan"`
Expected: PASS (all three).

- [ ] **Step 5: Run the whole ka-uat file to confirm no regression**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/llm/lexicon/parse.ts src/llm/lexicon/parse.ka-uat.test.ts
git commit -m "fix(ka): reply path drops a leading prep so the instrumental answer resolves

The inflate orphan prompt is „რით?\" (instrumental), so the natural answer is
ტუმბოით/ტუმბოთი → [ით, ტუმბო]; resolveNounReply now drops a leading prep on a
miss. Fixes the previously-missing ტუმბოით reply and makes the path robust
before the ტუმბოთ synonym is removed (Task 3). ka-gated.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: F1 activate — `KA_FUSED_INSTRUMENTALS` + drop the redundant `ტუმბოთ` synonym

**Files:**
- Modify: `src/llm/lexicon/ka.core.ts` (add map + wire into `KA_CORE`)
- Modify: `src/llm/lexicon/ka.zork1.ts:103-110` (drop `ტუმბოთ`, refresh the comment)
- Test: `src/llm/lexicon/parse.ka-uat.test.ts`

The map and the `ტუმბოთ` removal MUST land together: with the map, the round-trip gate's reconstruction of `ტუმბოთ` (→ `ტუმბოთი`) would reroute to "with pump" and go red, so the synonym must go in the same change.

- [ ] **Step 1: Write the failing test**

In `src/llm/lexicon/parse.ka-uat.test.ts`, add a `describe` block (the `ka` helper that calls `parseLexicon` already exists at the top of the file):

```ts
describe('Georgian F1 — fused instrumental (pump)', () => {
  it('fused ტუმბოთი: inflate plastic with pump', () => {
    expect(ka('გაბერე პლასტმასი ტუმბოთი')).toEqual({
      kind: 'command',
      text: 'inflate valve with pump',
    })
  })
  it('colloquial ტუმბოით still works', () => {
    expect(ka('გაბერე პლასტმასი ტუმბოით')).toEqual({
      kind: 'command',
      text: 'inflate valve with pump',
    })
  })
  it('the -თი collision nouns are untouched', () => {
    // ასანთი (matchbook) and ყუთი (box) are NOT fused-map keys.
    expect(ka('აიღე ასანთი')).toEqual({ kind: 'command', text: 'take match' })
    expect(ka('გააღე ყუთი')).toEqual({ kind: 'command', text: 'open mailbox' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts -t "fused instrumental"`
Expected: FAIL on `გაბერე პლასტმასი ტუმბოთი` (currently `{ kind: 'miss' }`). The colloquial and collision-noun cases already pass.

- [ ] **Step 3: Add `KA_FUSED_INSTRUMENTALS` and wire it into `KA_CORE`**

In `src/llm/lexicon/ka.core.ts`, after the `KA_DATIVE_RECIPIENTS` definition (just before `export const KA_CORE`), add:

```ts
// Fused-instrumental surface forms (spec §2). Vowel stems where the instrumental
// -ით fuses to -თი, so expandGeorgian's generic -ით split can't fire. Exact-token
// → emit [ით, stem]. ტუმბო (pump) is the ONLY vowel-stem instrument in Zork I.
// NATIVE-REVIEW-DRAFT. Zork-I-only, like the rest of ka.
const KA_FUSED_INSTRUMENTALS: Readonly<Record<string, string>> = {
  ტუმბოთი: 'ტუმბო', // pump: instrumental -ით fuses to -თი on the vowel stem
}
```

Then, in the `KA_CORE` object literal, add the field next to `postpositions` / `dativeRecipients`:

```ts
  postpositions: KA_POSTPOSITIONS,
  dativeRecipients: KA_DATIVE_RECIPIENTS,
  fusedInstrumentals: KA_FUSED_INSTRUMENTALS,
```

- [ ] **Step 4: Drop the `ტუმბოთ` synonym and refresh the comment in `ka.zork1.ts`**

In `src/llm/lexicon/ka.zork1.ts`, replace lines 103-110 (the pump comment block + entry):

```ts
  // ტუმბო is vowel-final. Its FORMAL instrumental 'ტუმბოთი' fuses -ით → -თი,
  // which expandGeorgian's -ი strip leaves as 'ტუმბოთ' (the -ით postposition never
  // matches -თი) — i.e. no 'with' prep token is emitted and the prep-split can't
  // fire. The walkthrough fixture therefore uses the SPLIT-SAFE instrumental
  // 'ტუმბოით' → [ით, ტუმბო] (← review: confirm this colloquial -ით form vs formal
  // -თი). 'ტუმბოთ' is listed too so the formal form still resolves as the bare
  // object if a player types it.
  'hand-held air pump': ['ხელის ჰაერის ტუმბო', 'ტუმბო', 'ტუმბოთ'], // ტუმბო vowel-final (pump)
```

with:

```ts
  // ტუმბო is vowel-final. Its FORMAL instrumental 'ტუმბოთი' fuses -ით → -თი; the
  // KA_FUSED_INSTRUMENTALS map (ka.core.ts) routes 'ტუმბოთი' → [ით, ტუმბო] so the
  // -ით prep-split emits 'with pump' (spec §2). The colloquial 'ტუმბოით' splits
  // the same way. The old 'ტუმბოთ' bare synonym is REMOVED: with the fused map it
  // is redundant for commands, and as a round-trip image it reroutes to "with
  // pump" and reddens the gate (spec §2.2). The instrumental orphan reply
  // ('ტუმბოთი'/'ტუმბოით', answering „რით?") resolves via the reply-path leading-
  // prep drop (spec §2.3).
  'hand-held air pump': ['ხელის ჰაერის ტუმბო', 'ტუმბო'], // ტუმბო vowel-final (pump)
```

- [ ] **Step 5: Run the F1 tests to verify green**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts -t "fused instrumental"`
Expected: PASS (all three).

- [ ] **Step 6: Run the round-trip + reply gates to verify the blocker is resolved**

Run: `npx vitest run src/llm/lexicon/roundtrip.test.ts src/llm/lexicon/parse.ka-uat.test.ts`
Expected: PASS. Specifically the round-trip case `ka/zork1: every noun word parses to 'take <emit>'` is green (no `ტუმბოთ` → `ტუმბოთი` image now), and the reply pins from Task 2 (`ტუმბოთი`/`ტუმბოით`/`ტუმბო` → `pump`) are still green (the formal `ტუმბოთი` reply now routes through the fused map + the prep drop).

- [ ] **Step 7: Commit**

```bash
git add src/llm/lexicon/ka.core.ts src/llm/lexicon/ka.zork1.ts src/llm/lexicon/parse.ka-uat.test.ts
git commit -m "feat(ka): fused instrumental ტუმბოთი → inflate ... with pump (F1)

Adds KA_FUSED_INSTRUMENTALS { ტუმბოთი: ტუმბო } and drops the now-redundant
ტუმბოთ synonym (its round-trip image collided with the new map and reddened the
gate). The instrumental orphan reply is preserved by the Task-2 prep drop.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: F2 — resolve-gated trailing `-ს` strip in `resolveNoun`

**Files:**
- Modify: `src/llm/lexicon/parse.ts` (`resolveNoun`, the tail at ~lines 113-124)
- Test: `src/llm/lexicon/parse.ka-uat.test.ts`

Try the noun as-is (the existing direct + article-strip lookups); only on a miss, retry with one trailing Georgian `ს` dropped from the last token. Resolve-first ⇒ recipients (`ქურდს`/`მოაჯირს`, dual-listed) and native-`ს` stems (`თას`/`სკარაბეუს`/`სახრახნის`) resolve before the strip and are never touched.

- [ ] **Step 1: Write the failing tests**

In `src/llm/lexicon/parse.ka-uat.test.ts`, add:

```ts
describe('Georgian F2 — dative -ს direct object', () => {
  it('push <color> button (dative head ღილაკს) — all four colours', () => {
    expect(ka('დააჭირე ლურჯ ღილაკს')).toEqual({ kind: 'command', text: 'push blue button' })
    expect(ka('დააჭირე წითელ ღილაკს')).toEqual({ kind: 'command', text: 'push red button' })
    expect(ka('დააჭირე ყავისფერ ღილაკს')).toEqual({ kind: 'command', text: 'push brown button' })
    expect(ka('დააჭირე ყვითელ ღილაკს')).toEqual({ kind: 'command', text: 'push yellow button' })
  })
  it('bare dative ღილაკს → push button (Z-parser disambiguates)', () => {
    expect(ka('დააჭირე ღილაკს')).toEqual({ kind: 'command', text: 'push button' })
  })
  it('disambiguation reply ყვითელ ღილაკს resolves to the button', () => {
    expect(
      resolveNounReply('ყვითელ ღილაკს', KA_CORE, KA_ZORK1, ZORK1_VOCAB, empty),
    ).toBe('yellow button')
  })
  it('REGRESSION: dative recipients still route through G1', () => {
    expect(ka('მიეცი კვერცხი ქურდს')).toEqual({ kind: 'command', text: 'give egg to thief' })
    expect(ka('მიაბი თოკი მოაჯირს')).toEqual({ kind: 'command', text: 'tie rope to railing' })
  })
  it('REGRESSION: native -ს stems resolve in nominative AND dative', () => {
    // screwdriver სახრახნის: nominative სახრახნისი, dative სახრახნისს.
    expect(ka('აიღე სახრახნისი')).toEqual({ kind: 'command', text: 'take screwdriver' })
    expect(ka('აიღე სახრახნისს')).toEqual({ kind: 'command', text: 'take screwdriver' })
    // chalice თას (nominative თასი); scarab სკარაბეუს (nominative სკარაბეუსი).
    expect(ka('აიღე თასი')).toEqual({ kind: 'command', text: 'take chalice' })
    expect(ka('აიღე სკარაბეუსი')).toEqual({ kind: 'command', text: 'take scarab' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts -t "dative -ს direct object"`
Expected: FAIL on **five** assertions — the four button cases (`{ kind: 'miss' }`), the reply case (`expected null to be 'yellow button'`), **and `აიღე სახრახნისს`** (the screwdriver *dative* `სახრახნისს` → currently `{ kind: 'miss' }`; the strip newly enables it by reducing the double-`ს` dative to the stored stem `სახრახნის`). Note: the second REGRESSION block is mislabelled — it pins both *unchanged* behaviour (the recipient-G1 block; the nominatives `სახრახნისი`/`თასი`/`სკარაბეუსი`, which already pass) **and** one *fix-enabled* case (the screwdriver dative). The recipient-G1 block passes today; do not expect it to fail.

- [ ] **Step 3: Add the resolve-gated `-ს` strip to `resolveNoun`**

In `src/llm/lexicon/parse.ts`, replace the tail of `resolveNoun` (the article-strip loop + final `return null`):

```ts
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
```

with:

```ts
  const direct = tryResolve(span)
  if (direct) return direct
  let s = [...span]
  while (s.length > 1 && core.articles.includes(s[0])) {
    s = s.slice(1)
    const hit = tryResolve(s)
    if (hit) return hit
  }
  // Georgian dative direct object (ka only — gated on core.postpositions). A
  // dative -ს on the HEAD noun (ღილაკს "button", ყვითელ ღილაკს "yellow button")
  // is not a splittable postposition (it collides with genitive -ის) and not the
  // nominative -ი strip, so it arrives attached and misses. Resolve-GATED: ONLY
  // after the as-is lookups miss, retry with a single trailing -ს dropped from
  // the LAST token; commit only a hit. Safe by construction — recipients
  // (ქურდს/მოაჯირს, dual-listed) and native -ს stems (თას/სკარაბეუს/სახრახნის)
  // resolve as-is and never reach here, so the G1 path and the round-trip gate
  // are untouched (spec §3; defuses the ka-dative-direct-object-deferred risk).
  if (core.postpositions && span.length > 0) {
    const last = span[span.length - 1]
    if (last.length > 1 && last.endsWith('ს')) {
      const hit = tryResolve([...span.slice(0, -1), last.slice(0, -1)])
      if (hit) return hit
    }
  }
  return null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/llm/lexicon/parse.ka-uat.test.ts -t "dative -ს direct object"`
Expected: PASS (all — buttons, bare, reply, and both REGRESSION blocks).

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/parse.ts src/llm/lexicon/parse.ka-uat.test.ts
git commit -m "feat(ka): resolve-gated dative -ს strip fixes 'push <color> button' (F2)

resolveNoun retries with one trailing Georgian ს dropped only after the as-is
lookups miss. Recipients (ქურდს/მოაჯირს) and native -ს stems (თას/სკარაბეუს/
სახრახნის) resolve as-is and are never touched, so G1 and the round-trip gate
are safe by construction. Fixes all four buttons in the dative + the
disambiguation reply.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Full-suite gate + bookkeeping (`pending.md`, memory)

**Files:**
- Run: the full test suite + lint/typecheck
- Modify: `/workspace/pending.md` (flip both decisions)
- Modify: `/home/vscode/.claude/projects/-workspace/memory/ka-dative-direct-object-deferred.md` (mark resolved) and its `MEMORY.md` pointer line

- [ ] **Step 1: Run the full suite**

Run: `make test`
Expected: PASS — no failures, and **no stray `console.error`/`console.warn`** or React `act(...)` warnings on stderr (the new tests emit only assertions).

- [ ] **Step 2: Lint, format, typecheck**

Run: `make lint && make format && make typecheck`
Expected: clean (no errors; any auto-fixes are formatting-only). **Caveat:** `notes/uat-georgian-run3.md` is already prettier-dirty at HEAD (pre-existing, not ours), so `make format` will reformat it as a side effect. Revert that unrelated churn before committing: `git checkout -- notes/uat-georgian-run3.md` (the Step 5 commit stages only `pending.md`). Do **not** run `make all` here — its `format-check` fails on those pre-existing files.

- [ ] **Step 3: Flip the `pending.md` decisions**

In `/workspace/pending.md`, update the top `DECISION` block and the two per-finding `DECISION` lines to record that both were FIXED on 2026-06-27 (this plan): finding 1 via the `KA_FUSED_INSTRUMENTALS` map (+ `ტუმბოთ` removal + reply prep-drop), finding 2 via the resolve-gated `-ს` strip. Keep the root-cause notes for the record; change only the decision lines. Example for the top block:

```markdown
**DECISION (2026-06-27, Ovid): FIX BOTH** (reverses the earlier "leave as-is").
Both shipped via `docs/superpowers/plans/2026-06-27-loquor-georgian-dative-instrumental.md`:
finding 1 — `KA_FUSED_INSTRUMENTALS` map (`ტუმბოთი → with pump`); finding 2 —
resolve-gated trailing `-ს` strip in `resolveNoun`. Root-cause notes kept below.
```

- [ ] **Step 4: Update the deferred memory**

Overwrite `/home/vscode/.claude/projects/-workspace/memory/ka-dative-direct-object-deferred.md` body to record the resolution (keep the same `name:`; update `description:` and body):

```markdown
---
name: ka-dative-direct-object-deferred
description: RESOLVED 2026-06-27 — Georgian dative -ს direct object now fixed via a resolve-gated strip
metadata:
  type: project
---

Georgian `-ს` on a direct object (`ღილაკს`) used to abstain. **Resolved
2026-06-27** (`docs/superpowers/specs/2026-06-27-loquor-georgian-dative-instrumental-design.md`):
`resolveNoun` retries with one trailing `-ს` dropped **only after the as-is
lookups miss**. The parked collision with the G1 recipient `-ს` is sidestepped by
construction — recipients (`ქურდს`/`მოაჯირს`, dual-listed) and native-`ს` stems
(`თას`/`სკარაბეუს`/`სახრახნის`) resolve as-is and never reach the strip. Fixed
alongside the fused instrumental `-თი` ([[deterministic-no-english-goal]]).
```

Then update the matching pointer line in `/home/vscode/.claude/projects/-workspace/memory/MEMORY.md` to read e.g. `— RESOLVED 2026-06-27: dative -ს fixed via resolve-gated strip`.

- [ ] **Step 5: Commit the repo bookkeeping**

```bash
git add pending.md
git commit -m "docs(ka): record dative + fused-instrumental fixes in pending.md

Flips both 2026-06-27 'leave as-is' decisions to FIXED (this plan). Root-cause
notes retained for the record.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

(The memory files live outside the repo and are not part of this commit.)

- [ ] **Step 6: Hand back for review**

Report: all tasks complete, full suite green, both `pending.md` frictions fixed. Note the still-pending merge-time chore — add this spec under the Georgian authorities in `CLAUDE.md`'s source-of-truth list (deferred to the merge per the spec §6, not done here).

---

## Notes for the implementer

- **Emit values are exact.** `inflate valve with pump` (the pile of plastic's auto-target emit is `valve` — this is correct Zork, matching the already-working colloquial path), `push {blue,red,brown,yellow} button`, `take screwdriver/chalice/scarab`, `give egg to thief`, `tie rope to railing`. If a pin disagrees, re-probe before "fixing" the test — the emit comes from `ZORK1_VOCAB`.
- **Georgian `ს` is U+10E1**, not ASCII `s`. The `endsWith('ს')` literal in Task 4 must be the Georgian character. The `core.postpositions` gate keeps every `ka`-only path unreachable for fr/de/es regardless.
- **Order matters for green commits.** Task 2 (reply prep-drop) precedes Task 3 (drop `ტუმბოთ`) so the formal `ტუმბოთი` orphan reply never regresses. Don't reorder.
- **No LLM machinery is touched** in any task (no `LexLang` maps, few-shots, prompt tables, or `fallbackResolve`) — these are deterministic `ka` input changes, which is exactly the kind CLAUDE.md says applies to `ka`.
```
