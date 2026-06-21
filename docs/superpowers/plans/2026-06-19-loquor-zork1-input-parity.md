# Zork I Input Parity (fr/de/es) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Zork I completable in French, German, and Spanish without secretly switching to English — by fixing the input-NL bugs that mis-map puzzle-critical Spanish commands, authoring the two missing disambiguation templates (fr/de/es + ka), and making the quoted-English escape hatch discoverable.

**Architecture:** Almost all fixes are **data** edits to the Spanish lexicons (`src/llm/lexicon/es.core.ts`, `es.zork1.ts`), with exactly **one parser change** (personal-`a` stripping in `parse.ts`). fr/de were characterized and already handle the shared puzzle verbs, so cross-language work is mostly *verification pins*. P3 adds a localized `help` intercept and passive signposting in `src/llm/`.

**Tech Stack:** TypeScript, Vitest, React. Tests run via `npx vitest run <file>`. Lexicon tests assert `parseLexicon(clause, CORE, NOUNS, vocab, scene)` output. Full suite/quality gate: `make all`.

---

## ⚠️ Ground truth (characterized 2026-06-19) — supersedes the stale catalogue

The `notes/uat.md` Spanish catalogue is from **2026-06-15** and predates the German F16 / `distributePrepTail` work and several lexicon updates. Every bug below was re-characterized against the **shipping** lexicons before this plan was written. Findings that change scope:

**Already fixed — no FIX needed, but a regression PIN is still required (spec's forcing-function contract):**
- `apaga las velas` → `extinguish candles` ✓ (`apaga: 'extinguish'` already in `es.core.ts:142`). Pin it (Task 2) so a regression fails `make test` — don't silently drop a spec friction item.
- **Conjoined + trailing prep** `mete la antorcha y el destornillador en la cesta` → `put torch in cage` + `put screwdriver in cage` ✓ (characterized through the real pipeline). `splitClauses`/`fillElidedVerbs`/`distributePrepTail` already cover Spanish `y`, so no FIX is needed — **but the spec's N3/DoD mandates a pin on the `inputTranslate.ts` surface, and there is currently NO pin for it anywhere in `src/`.** Task 8b adds it (RED that may pass immediately = the regression guard the spec required; if it fails, the "already fixed" claim is wrong and the debug task is live).
- `bote`→bottle **false friend is already fixed**: `bote` maps to `magic boat`/`punctured boat` (`es.zork1.ts:80,97`), not `botella` (bottle). So the spec's "boat false-friend" blocking row is satisfied; the only residual boat-*enter* issue (`entra en el bote`→miss) is an arity/prep matter handled in the Task 9 decision, not a false-friend.
- `infla el plastico con la bomba` → `inflate valve with pump` ✓.

**Confirmed broken (es) — the real work:**

| # | Input (es) | Current | Root cause | Fix surface |
|---|-----------|---------|-----------|-------------|
| Loud Room | `eco` | `miss` | `eco` not a verb | `es.core.ts` data |
| deja todo | `deja todo` | `miss` | ES_CORE has no `quantifiersAll` | `es.core.ts` data |
| Songbird | `da cuerda al canario` | `give rope to canary` | idioms `da cuerda a`/`dale cuerda a` exist but `al` (a+el) token defeats the match | `es.core.ts` data |
| Boat exit | `sal del bote` | `miss` | `sal`→exit works but `del` (de+el) is unhandled | `es.core.ts` data |
| Nouns | `abre la tapa`, `coge el jade`, `coge la calavera de cristal` | `miss` | `tapa`/`jade`/`calavera de cristal` surface forms absent | `es.zork1.ts` data |
| Combat slot | `mata al ladron con el cuchillo` | `miss` | the *prep-split* branch (`parse.ts:287`) resolves the object span `[al, ladron]` and fails because `al` isn't stripped there. NOTE: the simple `ataca al troll` case **already works** via the existing personal-`a`/leading-`to` block (`parse.ts:270-283`) — the bug is only when a `con`-instrument follows | **`parse.ts` (extend the existing block — the one code change)** |

**Cross-language: fr/de already pass** songbird (`remonte`✓, `zieh…auf`✓), `echo`✓, boat-exit (`sors du bateau`✓, `steig aus dem boot`✓), quantifier-all (`prends tout`✓, `nimm alles`✓). So fr/de tasks below are **verification pins**, not fixes — unless a pin reveals a regression.

**Needs a decision with Ovid (do NOT force a fragile fix):**
- `sube la cesta` → `climb cage`. Spanish `sube` + direct object idiomatically = "raise", but bare `sube` = "go up/climb"; the lexicon maps verbs context-free. `levanta la cesta` → `raise cage` already works. An arity-conditional verb map is fragile. **Task 9 surfaces this to Ovid rather than fixing it blindly** (player-experience "talk to me first" rule).
- `entra en el bote` → `miss` (boat *enter*). `aborda`/`embarca` → board work. Lower value than exit; Task 9 includes it in the decision.

---

## File Structure

**Modify (data):**
- `src/llm/lexicon/es.core.ts` — add `eco` verb, `quantifiersAll`, songbird `al` idiom variants, `del` article.
- `src/llm/lexicon/es.zork1.ts` — add `tapa`, `jade`, `calavera de cristal` noun surfaces.

**Modify (code — one change):**
- `src/llm/lexicon/parse.ts` — strip a leading personal-`a`/`al` before noun resolution.

**Create (input regression pins):**
- `src/llm/lexicon/parse.es-uat.test.ts` — es bug pins (mirrors `parse.de-uat.test.ts`).
- `src/llm/lexicon/parse.fr-uat.test.ts` — fr cross-language verification pins.
- Append es-cognate verification cases to `src/llm/lexicon/parse.de-uat.test.ts`.

**Modify (P2.2 output templates + pins):**
- `src/translate/corpus/zork1.{es,fr,de,ka}.templates.ts` — author the two missing disambiguation templates.
- `src/translate/corpus/zork1.{es,fr,ka}.uat.test.ts` + the de corpus completeness suite — pin them.

**Modify (P3 signposting):**
- `src/llm/inputTranslate.ts` (+ a focused `help.ts` if it keeps `inputTranslate.ts` from growing) — localized `help` intercept.
- `src/llm/notices.ts` — one-time activation notice text.
- The command-input component + its test — localized placeholder hint + a11y assertions.

---

## Task 1: Loud Room `eco` → `echo` (+ es-UAT pin-file scaffold)

This is the simplest fix and establishes the `parse.es-uat.test.ts` pattern all later es tasks reuse.

**Files:**
- Create: `src/llm/lexicon/parse.es-uat.test.ts`
- Modify: `src/llm/lexicon/es.core.ts` (verbs block)

- [ ] **Step 1: Write the failing test** — create `src/llm/lexicon/parse.es-uat.test.ts`:

```ts
// src/llm/lexicon/parse.es-uat.test.ts
// Spanish UAT regression suite — pins each input mis-map confirmed by
// characterization (2026-06-19) against the SHIPPING ES_CORE + ES_ZORK1
// lexicons and the real ZORK1_VOCAB, so a regression in either surfaces here.
// Mirrors parse.de-uat.test.ts.
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { ES_CORE } from './es.core'
import { ES_ZORK1 } from './es.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const inScope = (...canonicals: string[]): Scene => ({
  inScope: canonicals.map(c => ({ canonical: c })),
  antecedent: null,
})
const es = (clause: string, scene: Scene = empty) =>
  parseLexicon(clause, ES_CORE, ES_ZORK1, ZORK1_VOCAB, scene)

describe('Spanish UAT — verbs', () => {
  it('Loud Room: "eco" → echo (the puzzle solution)', () => {
    expect(es('eco')).toEqual({ kind: 'command', text: 'echo' })
  })
})
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "eco"`
Expected: FAIL — received `{ kind: 'miss' }`.

- [ ] **Step 3: Add the verb** — in `src/llm/lexicon/es.core.ts`, in the `verbs:` block (near the other senses verbs, after `esconder: 'hide',`):

```ts
    eco: 'echo', // Loud Room puzzle solution; 'echo' is a game verb (fr/de pass the English word through)
```

- [ ] **Step 4: Run it; verify it passes**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "eco"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/parse.es-uat.test.ts src/llm/lexicon/es.core.ts
git commit -m "fix(nl-es): map 'eco' to the echo verb (Loud Room) + es-UAT pin-file

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `deja todo` → drop all (add Spanish `quantifiersAll`)

**Files:**
- Modify: `src/llm/lexicon/es.core.ts`
- Test: `src/llm/lexicon/parse.es-uat.test.ts`

- [ ] **Step 1: Write the failing test** — append to the `'Spanish UAT — verbs'` describe block:

```ts
  it('"deja todo" / "coge todo" → drop/take all', () => {
    expect(es('deja todo')).toEqual({ kind: 'command', text: 'drop all' })
    expect(es('coge todo')).toEqual({ kind: 'command', text: 'take all' })
  })
  it('regression guard: "apaga las velas" → extinguish candles (already fixed)', () => {
    expect(es('apaga las velas', inScope('pair of candles'))).toEqual({
      kind: 'command',
      text: 'extinguish candles',
    })
  })
```

(The `apaga` case already passes — this pin guards it, since the spec's contract is "a regression re-breaking any friction item fails `make test`." Confirm the candles emit/canonical in Step 2.)

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "todo"`
Expected: FAIL — received `{ kind: 'miss' }`.

- [ ] **Step 3: Add the quantifier list** — in `src/llm/lexicon/es.core.ts`, immediately after the `particleVerbs: [],` line (before the personal-`a` NOTE comment):

```ts
  // "all" quantifier — Spanish 'todo' family. fr ('tout'…) and de ('alles'…)
  // already have this; ES_CORE lacked it, so 'deja todo' missed (UAT-es-3).
  quantifiersAll: ['todo', 'todos', 'toda', 'todas', 'all'],
```

- [ ] **Step 4: Run it; verify it passes**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "todo"`
Expected: PASS (`drop all` / `take all`).

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/es.core.ts src/llm/lexicon/parse.es-uat.test.ts
git commit -m "fix(nl-es): add 'todo' quantifiersAll so 'deja/coge todo' → drop/take all

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Songbird — `al` defeats the wind-up idiom

The idioms `da cuerda a` / `dale cuerda a` already exist (`es.core.ts:326-327`) but the player types `da cuerda **al** canario`, and `al` (a+el) is a single token that the idiom's literal `a` never matches. Add `al`/`a la` variants. (`da cuerda a la canario` already → `wind up canary`, proving the idiom mechanism is sound.)

**Files:**
- Modify: `src/llm/lexicon/es.core.ts` (verbIdioms)
- Test: `src/llm/lexicon/parse.es-uat.test.ts`

- [ ] **Step 1: Write the failing test** — add a new describe block to the es-UAT file:

```ts
describe('Spanish UAT — idioms', () => {
  it('Songbird: "da/dale cuerda al canario" → wind up canary', () => {
    expect(es('da cuerda al canario')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
    expect(es('dale cuerda al canario')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
})
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "Songbird"`
Expected: FAIL — received `{ kind: 'command', text: 'give rope to canary' }`.

- [ ] **Step 3: Add the fused-prep idiom variants** — in `src/llm/lexicon/es.core.ts`, in `verbIdioms`, replace the two existing `cuerda` lines:

```ts
    { phrase: 'dale cuerda a', to: 'wind up' }, // F-CC parity (fr remonte)
    { phrase: 'da cuerda a', to: 'wind up' },
```

with the `al`/`a la` variants added. (The parser sorts idioms by **string char-length** descending, `parse.ts:176-178` — `da cuerda al` (12 chars) sorts before bare `da cuerda a` (11), so the fused form is tried first for `al` input. List the fused forms explicitly so each exists; the test is the real guard.)

```ts
    { phrase: 'dale cuerda al', to: 'wind up' }, // fused a+el; players type 'al canario'
    { phrase: 'da cuerda al', to: 'wind up' },
    { phrase: 'dale cuerda a la', to: 'wind up' },
    { phrase: 'da cuerda a la', to: 'wind up' },
    { phrase: 'dale cuerda a', to: 'wind up' }, // F-CC parity (fr remonte)
    { phrase: 'da cuerda a', to: 'wind up' },
```

- [ ] **Step 4: Run it; verify it passes (and the bare `a` form still works)**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "Songbird"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/es.core.ts src/llm/lexicon/parse.es-uat.test.ts
git commit -m "fix(nl-es): wind-up idiom variants for fused 'al'/'a la' (songbird)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Boat exit — handle `del` (mirror fr's `du`-as-article)

fr treats `du` (de+le) as a strippable **article** (`fr.core.ts` articles list), so `sors du bateau` → strip `du` → `exit raft`. Mirror that for es `del`. This sidesteps the personal-`a`/`from` hazard the `es.core.ts:354` comment warns about, because an article is stripped at noun-phrase edges, not split as a prep.

**ponytail:** `del`-as-article also strips it in `coge la llave del cajon` → `take key cajon` (loses "from"). fr accepts the identical ceiling for `du`; the boat-exit win outweighs the rare "from the" genitive in Zork. Upgrade path: a real `del`→from prep with personal-`a` disambiguation, only if a "from the" command is found to matter.

**Files:**
- Modify: `src/llm/lexicon/es.core.ts` (articles)
- Test: `src/llm/lexicon/parse.es-uat.test.ts`

- [ ] **Step 1: Write the failing test** — add to the `'Spanish UAT — verbs'` block:

```ts
  it('Boat exit: "sal del bote" → exit (the boat resolves via scene)', () => {
    expect(es('sal del bote', inScope('magic boat'))).toEqual({
      kind: 'command',
      text: 'exit raft',
    })
    expect(es('sal del bote')).toEqual({ kind: 'command', text: 'exit raft' })
  })
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "Boat exit"`
Expected: FAIL — received `{ kind: 'miss' }`.

- [ ] **Step 3: Add `del` as an article** — in `src/llm/lexicon/es.core.ts`, in the `articles` array, add `'del'` (and remove the now-inaccurate "deliberately ABSENT" half of the `del` comment in `preps`, leaving the personal-`a` note):

```ts
    'del', // fused de+el; stripped as an article (mirrors fr 'du'), so 'sal del bote' → exit boat
```

Then update the `preps` comment block to drop the "del is absent / falls to LLM" sentence (it's now an article), keeping the personal-`a` interaction note.

- [ ] **Step 4: Run it; verify it passes**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "Boat exit"`
Expected: PASS (`exit raft`).

- [ ] **Step 5: Run the full lexicon suite to catch `del`-strip regressions**

Run: `npx vitest run src/llm/lexicon/`
Expected: PASS (no existing test relied on `del` missing).

- [ ] **Step 6: Commit**

```bash
git add src/llm/lexicon/es.core.ts src/llm/lexicon/parse.es-uat.test.ts
git commit -m "fix(nl-es): treat 'del' as a strippable article (boat exit), mirroring fr 'du'

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Noun surfaces — `tapa`, `jade`, `calavera de cristal`

**Files:**
- Modify: `src/llm/lexicon/es.zork1.ts`
- Test: `src/llm/lexicon/parse.es-uat.test.ts`

**CRITICAL — `lid` is NOT a canonical.** `zork1.vocab.ts:708-710` shows `lid` is a *synonym* of canonical `machine` (emit `machine`); `es.zork1.ts:79` already has `machine: ['maquina']`. A `lid:` key would fail `validate.test.ts` (every key must be a vocab canonical). So `tapa` **appends to `machine`**, and the assertion is `open machine` / `close machine`. (`notes/uat.md:247` confirms the workaround is `abre/cierra la máquina`→`open/close machine`.)

- [ ] **Step 1: Write the failing test** — add a describe block to the es-UAT file:

```ts
describe('Spanish UAT — noun surfaces', () => {
  it('"calavera de cristal" → crystal skull (the modifier must not break it)', () => {
    expect(es('coge la calavera de cristal', inScope('crystal skull'))).toEqual({
      kind: 'command',
      text: 'take skull',
    })
  })
  it('"tapa" → the diamond-machine lid (canonical is "machine")', () => {
    expect(es('abre la tapa', inScope('machine'))).toEqual({
      kind: 'command',
      text: 'open machine',
    })
    expect(es('cierra la tapa', inScope('machine'))).toEqual({
      kind: 'command',
      text: 'close machine',
    })
  })
  it('"jade" → the jade figurine', () => {
    expect(es('coge el jade', inScope('jade figurine'))).toEqual({
      kind: 'command',
      text: 'take figurine',
    })
  })
})
```

- [ ] **Step 2: Run it; verify it fails AND confirm the exact emits**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "noun surfaces"`
Expected: FAIL — all `miss`. Confirm the emits before Step 3: `grep -n "crystal skull\|'machine'\|jade figurine" src/llm/grammar/zork1.vocab.ts` — `crystal skull`→`skull`, `machine`→`machine`, `jade figurine`→`figurine` (all verified). The note `es.zork1.ts:64` warns the `jade` token equals the English `jade` adjective — Step 4 checks the collision gate.

- [ ] **Step 3: Add the noun surfaces** — in `src/llm/lexicon/es.zork1.ts`:

```ts
  // crystal skull: 'calavera de cristal' mirrors the existing 'craneo de cristal'
  'crystal skull': ['craneo', 'calavera', 'craneo de cristal', 'calavera de cristal'],
```

Append `tapa` to the EXISTING `machine` entry (`lid` is `machine`'s synonym — do NOT create a `lid` key):

```ts
  machine: ['maquina', 'tapa'], // 'tapa' = the diamond-machine lid (UAT: 'abre/cierra la tapa')
```

Append `jade` to the figurine entry:

```ts
  'jade figurine': ['figurilla', 'estatuilla', 'figurilla de jade', 'jade'],
```

- [ ] **Step 4: Run the test AND the validate/collision gate**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "noun surfaces"`
Run: `npx vitest run src/llm/lexicon/validate.test.ts`
Expected: both PASS. If `validate.test.ts` flags a NEW `jade` collision, this is the COLLISION GATE (not the parse test) — resolve by adding the precise `KNOWN_COLLISIONS` row the gate's `toEqual` expects (scene-scoping in the parse test does NOT satisfy the validate gate). Show that diff in the commit if needed.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/es.zork1.ts src/llm/lexicon/parse.es-uat.test.ts
git commit -m "fix(nl-es): add 'tapa', 'jade', 'calavera de cristal' noun surfaces

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Combat slot — extend the existing personal-`a` handling (the one parser change)

**Diagnose first (spec-mandated; do NOT pre-commit a mechanism).** `parse.ts:270-283` ALREADY has a personal-`a`/leading-`to` block: `<verb> a/al <noun>` with the *whole* remainder resolving as one noun emits `<verb> <noun>` (so `ataca al troll` → `attack troll` **already works**). The combat case misses only because an instrument follows (`con el cuchillo`): the whole-remainder block can't fire, so the clause falls to the **prep-split loop** (`parse.ts:287`), which tries `resolveNoun(['al', 'ladron'])` for the object span and fails — `al` is a prep, not stripped there. So the fix is to strip a leading personal-`a`/`al` from the **object span inside the prep-split branch**, reusing the existing concept — NOT a new top-level `tokens.slice(1)` that would shadow the 270-283 block.

**Files:**
- Modify: `src/llm/lexicon/parse.ts` (the prep-split object-span resolution)
- Test: `src/llm/lexicon/parse.es-uat.test.ts`

- [ ] **Step 1: Write the characterization + failing test** — add to the es-UAT file:

```ts
describe('Spanish UAT — personal-a', () => {
  it('already-works: "ataca al troll" → attack troll (existing block)', () => {
    expect(es('ataca al troll', inScope('troll'))).toEqual({
      kind: 'command',
      text: 'attack troll',
    })
  })
  it('"mata al ladron con el cuchillo" → attack thief with rusty knives', () => {
    expect(
      es('mata al ladron con el cuchillo', inScope('thief', 'rusty knife')),
    ).toEqual({ kind: 'command', text: 'attack thief with rusty knives' })
  })
})
```

- [ ] **Step 2: Run it; verify the split (the diagnosis)**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "personal-a"`
Expected: the `ataca al troll` case **PASSES already** (proves the 270-283 block handles the no-instrument case); the `mata … con el cuchillo` case **FAILS with `miss`** (proves the bug is the prep-split object span). Confirm the emit string: `grep -n "rusty knife\|nasty knife" src/llm/grammar/zork1.vocab.ts` shows `cuchillo`→`rusty knife` emits **`rusty knives`** (plural) and also `nasty knife`→`nasty knives`; the scene `inScope('thief','rusty knife')` scopes the ambiguous `cuchillo` to `rusty knives`. (If you scope `nasty knife` instead, expect `nasty knives`.)

- [ ] **Step 3: Strip the leading personal-`a` in the prep-split object span** — in the prep-split loop (`parse.ts:287`), when resolving the object span before the prep, strip a leading folded `a`/`al`:

```ts
  for (let i = 1; i < tokens.length - 1; i++) {
    const prep =
      core.preps[tokens[i]] ??
      (vocab.preps.includes(tokens[i]) ? tokens[i] : undefined)
    if (!prep || !vocab.preps.includes(prep)) continue
    // Spanish personal-`a`: a leading a/al on the object span marks an animate
    // DIRECT object ('mata AL ladron con …'), not a prep — strip it so the
    // object resolves. Same concept as the leading-to block at L270-283, which
    // only covers the no-instrument case (whole remainder as one noun).
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
  }
```

(Guarded to `a`/`al` only and to a span with ≥1 token after stripping; French `au`/`aux` and German are untouched — they don't lead the object span with `a`/`al`.)

- [ ] **Step 4: Run the es-UAT test AND the full lexicon suite (parse.ts is shared)**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "personal-a"`
Run: `npx vitest run src/llm/lexicon/`
Expected: both PASS. Confirm fr `donne au troll`→`give troll` (the 270-283 block) and a genuine indirect `da la espada al troll` still emit correctly — neither leads the object span with bare `a`/`al`, so the new strip leaves them alone.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/parse.ts src/llm/lexicon/parse.es-uat.test.ts
git commit -m "fix(nl): strip leading personal-'a'/'al' in the prep-split object span

Combat instrument slot (mata al ladron con el cuchillo → attack thief with
rusty knives) missed because the whole-remainder personal-a block (L270-283)
can't fire when an instrument follows. Extend the same concept to the prep
-split object span. fr/de leading-object spans are untouched.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: fr/de cross-language verification pins

The shared puzzle verbs already pass in fr/de (characterized). Pin them so a future es-driven change can't silently regress fr/de.

**Files:**
- Create: `src/llm/lexicon/parse.fr-uat.test.ts`
- Modify: `src/llm/lexicon/parse.de-uat.test.ts`

- [ ] **Step 1: Write the fr verification pins** — create `src/llm/lexicon/parse.fr-uat.test.ts`:

```ts
// src/llm/lexicon/parse.fr-uat.test.ts
// French cross-language verification — the shared puzzle verbs (songbird,
// echo, boat-exit, quantifier-all) already pass; pin them so an es-driven
// change can't regress fr. (Characterized 2026-06-19.)
import { describe, it, expect } from 'vitest'
import { parseLexicon } from './parse'
import { FR_CORE } from './fr.core'
import { FR_ZORK1 } from './fr.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const empty: Scene = { inScope: [], antecedent: null }
const inScope = (...c: string[]): Scene => ({
  inScope: c.map(x => ({ canonical: x })),
  antecedent: null,
})
const fr = (clause: string, scene: Scene = empty) =>
  parseLexicon(clause, FR_CORE, FR_ZORK1, ZORK1_VOCAB, scene)

describe('French cross-language pins (parity with es fixes)', () => {
  it('songbird: "remonte le canari" → wind up canary', () => {
    expect(fr('remonte le canari')).toEqual({
      kind: 'command',
      text: 'wind up canary',
    })
  })
  it('Loud Room: "echo" → echo', () => {
    expect(fr('echo')).toEqual({ kind: 'command', text: 'echo' })
  })
  it('boat exit: "sors du bateau" → exit raft', () => {
    expect(fr('sors du bateau', inScope('magic boat'))).toEqual({
      kind: 'command',
      text: 'exit raft',
    })
  })
  it('quantifier: "prends tout" → take all', () => {
    expect(fr('prends tout')).toEqual({ kind: 'command', text: 'take all' })
  })
})
```

- [ ] **Step 2: Run it; verify it PASSES immediately (these already work)**

Run: `npx vitest run src/llm/lexicon/parse.fr-uat.test.ts`
Expected: PASS (verification, not red→green). If any FAILS, that's a real fr gap — fix it in the fr lexicon mirroring the es task, then re-run.

- [ ] **Step 3: Append de verification pins** — in `src/llm/lexicon/parse.de-uat.test.ts`, add to the verbs describe block:

```ts
  it('parity: "echo" → echo (Loud Room), "nimm alles" → take all', () => {
    expect(de('echo')).toEqual({ kind: 'command', text: 'echo' })
    expect(de('nimm alles')).toEqual({ kind: 'command', text: 'take all' })
  })
```

(Songbird `zieh…auf` and boat-exit `steig aus dem boot` are already pinned as F25/F26 in that file.)

- [ ] **Step 3b: Friction-tier cognate check (spec's ×3 requirement)** — the friction nouns/verbs (`tapa`, `jade`, `calavera de cristal`, the `del`/`todo` handling) are es-surface forms; the spec requires reasoning about the fr/de cognate for each. For each, either (a) characterize the fr/de equivalent (e.g. `couvercle`/`Deckel` for lid, `crâne de cristal`/`Kristallschädel`, `tout`/`alles` quantifier — already pinned) and add a pin if broken, or (b) record in the test file a one-line comment that it's an es-only surface gap with no fr/de cognate issue. Do NOT leave the friction tier's cross-language check unaddressed.

- [ ] **Step 4: Run the de suite; verify PASS**

Run: `npx vitest run src/llm/lexicon/parse.de-uat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/parse.fr-uat.test.ts src/llm/lexicon/parse.de-uat.test.ts
git commit -m "test(nl): fr/de cross-language verification pins for the es parity fixes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Escape-hatch passthrough pins (ties P1.1 ↔ P3)

The P3 signpost advertises quoted-English commands; guarantee they reach the correct canonical. These exercise the quoted-passthrough path (`unquote` / `isVocabPassthrough` in `inputTranslate.ts`), not the lexicon.

**Files:**
- Test: `src/llm/inputTranslate.test.ts` (append; this is where multi-clause/passthrough behavior is tested)

- [ ] **Step 1: Read the existing passthrough tests to match the harness**

Run: `grep -n "unquote\|isVocabPassthrough\|passthrough" src/llm/inputTranslate.test.ts | head`
Use the existing test's setup (vocab word-set construction) verbatim for the new cases.

- [ ] **Step 2: Write the passthrough pins** — append a describe block asserting each advertised escape command unquotes to its English canonical. Use the same `unquote()` + `isVocabPassthrough()` assertions the existing passthrough tests use, for: `"wind up canary"`, `"enter boat"`, `"launch"`, `"echo"`, `"kill thief with knife"`. (Match the exact assertion shape already in the file — do not invent a new harness.)

- [ ] **Step 3: Run; verify PASS**

Run: `npx vitest run src/llm/inputTranslate.test.ts -t "passthrough"`
Expected: PASS (these already work; the pin guarantees the signpost stays honest).

- [ ] **Step 4: Commit**

```bash
git add src/llm/inputTranslate.test.ts
git commit -m "test(nl): pin quoted-English passthrough for the advertised escape commands

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8b: Conjoined + trailing prep — regression pin on the `inputTranslate.ts` surface (spec N3)

Characterization shows this already works, but the spec's N3/DoD requires a pin, and there is currently **none anywhere in `src/`**. A `parse.*-uat` pin can't reach this — it must drive `splitClauses`→`fillElidedVerbs`→`distributePrepTail`.

**Files:**
- Test: `src/llm/inputTranslate.test.ts` (append; this is where the German `distributePrepTail` cases live).

- [ ] **Step 1: Read the existing `distributePrepTail` test** to match the harness (it's German-only today).

Run: `grep -n "distributePrepTail\|fillElidedVerbs\|splitClauses" src/llm/inputTranslate.test.ts | head`

- [ ] **Step 2: Write the es pin** — drive the composition with ES_CORE + ES_ZORK1 + ZORK1_VOCAB and assert both conjuncts inherit the destination:

```ts
import { ES_CORE } from './lexicon/es.core'
import { ES_ZORK1 } from './lexicon/es.zork1'
// ...
it('es conjoined+prep: distributes the destination across conjuncts', () => {
  const line = 'mete la antorcha y el destornillador en la cesta'
  const dist = distributePrepTail(
    fillElidedVerbs(splitClauses(line), ES_CORE, ZORK1_VOCAB, ES_ZORK1),
    ES_CORE,
    ZORK1_VOCAB,
  )
  expect(dist).toEqual([
    'mete la antorcha en la cesta',
    'mete el destornillador en la cesta',
  ])
})
```

(This is the exact composition characterized 2026-06-19; the emit-level result is `put torch in cage` + `put screwdriver in cage` after `parseLexicon`.)

- [ ] **Step 3: Run; verify PASS (regression guard) — or, if it FAILS, the "already fixed" claim is wrong**

Run: `npx vitest run src/llm/inputTranslate.test.ts -t "conjoined"`
Expected: PASS. If it fails, STOP — the spec's debug-first task is live: diagnose which function drops the 2nd object/destination (likely `prepTail` not recognizing es `en`, or the bare 2nd conjunct's `isForeignNoun` gap) and fix before pinning.

- [ ] **Step 4: Commit**

```bash
git add src/llm/inputTranslate.test.ts
git commit -m "test(nl): pin es conjoined+trailing-prep distribution (spec N3 coverage)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Record the deferred `sube la cesta` / `entra en el bote` decision (DECIDED — deferred)

**Decision (Ovid, 2026-06-19): both DEFERRED out of this branch.** `sube la cesta`
(→`climb cage`) is not fixed because `sube` bare = go up/climb, so a context-free
`sube`→raise would break navigation and an arity-conditional sense is fragile;
in-language path is `levanta la cesta`→`raise cage`. `entra en el bote` (`miss`)
is deferred too — `aborda`/`embarca`→board work. Already recorded in
`notes/next.md` (deferred-work block).

- [ ] **Step 1: Confirm the deferrals are logged.** Verify `notes/next.md`'s
  deferred block lists `sube la cesta` and `entra en el bote`; add a matching
  one-line note to `notes/uat.md`'s Spanish catalogue marking both as
  deferred-with-workaround (so a future UAT session doesn't re-file them as new).

- [ ] **Step 2: Commit (docs only — NO code/lexicon change for these two)**

```bash
git add notes/uat.md
git commit -m "docs(notes): mark sube la cesta / entra en el bote as deferred (Ovid 2026-06-19)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Audit Zork I's native `help` before overriding it

Per the spec's player-experience gate (S3): confirm what we're replacing before we replace it.

- [ ] **Step 1: Capture Zork's native help.** Preferred (agent-executable, no browser — the stack has no Playwright per CLAUDE.md): read the `HELP`/`INFO`/`COMMANDS` routine text from the **read-only vendored** `zork1/` `.zil` source (read only — never modify). Fallback if that's unclear: ask Ovid to run `! ` the dev app and paste the `help`/`info`/`commands` output. Record the exact text either way.

- [ ] **Step 2: Compare to the planned localized block** (meta-commands list + escape hatch). List anything Zork's native help provides that the localized block would drop (scoring info, in-world hints, `$verify`).

- [ ] **Step 3: Decide and record** — either fold the useful native content into the localized block, or document precisely what is dropped and confirm it's not player-valuable. Write the decision into the spec's P3 section. **If anything player-valuable would be lost, surface it to Ovid before proceeding** (do not self-approve). No code in this task.

---

## Task 11: Localized `help` intercept

**Files:**
- Create: `src/llm/help.ts` (keeps `inputTranslate.ts` from growing — the help block content + the intercept predicate)
- Modify: `src/llm/inputTranslate.ts` (wire the intercept into the routing) — OR place the predicate in `help.ts` and call it from wherever meta routing lives; follow the existing meta-routing pattern.
- Test: `src/llm/help.test.ts`

- [ ] **Step 1: Read how meta routing is wired** so the help intercept sits in the same place.

Run: `grep -n "metaAlias\|isMetaCommand\|META_COMMANDS" src/llm/translatePipeline.ts src/llm/inputTranslate.ts | head`
Determine where a localized word is currently caught and routed; the help intercept goes alongside it but returns a *display block* instead of a raw command.

- [ ] **Step 2: Write the failing test** — `src/llm/help.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { helpResponse, isHelpTrigger } from './help'

describe('localized help', () => {
  it('triggers on the localized aliases per language', () => {
    expect(isHelpTrigger('ayuda', 'es')).toBe(true)
    expect(isHelpTrigger('aide', 'fr')).toBe(true)
    expect(isHelpTrigger('hilfe', 'de')).toBe(true)
    expect(isHelpTrigger('help', 'ka')).toBe(true) // ka: English word only
  })
  it('English mode does NOT intercept (native help passes through)', () => {
    expect(isHelpTrigger('help', 'en')).toBe(false)
  })
  it('es help names the quoted-English escape hatch + a specific example', () => {
    const block = helpResponse('es')
    expect(block).toMatch(/"wind up canary"/)
    expect(block.toLowerCase()).toContain('ayuda') // self-reference / meta list
  })
  it('ka help says type in English, NOT the quoted-fallback message', () => {
    const block = helpResponse('ka')
    expect(block).not.toMatch(/".*"/) // no quoted-fallback instruction
  })
})
```

- [ ] **Step 3: Run; verify it fails**

Run: `npx vitest run src/llm/help.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/llm/help.ts`** — `isHelpTrigger(word, lang)` (localized aliases per lang; English word `help` only for `ka`; `false` for `en`/`off`) and `helpResponse(lang)` returning the localized block: the meta-commands with per-language equivalents, plus the escape-hatch explanation naming `"wind up canary"`, `"enter boat"`, `"echo"`, `"kill thief with knife"` (fr/de/es); for `ka`, the "type commands in English" block with NO quoted-fallback instruction. Wire `isHelpTrigger` into the routing found in Step 1 so a hit renders `helpResponse(lang)` as a transcript block (via the existing aria-live notice/echo seam) and **does not** reach the game.

- [ ] **Step 4b: Integration test — intercept ordering + a11y live-region (the spec's heaviest item)** — unit tests on `help.ts` alone don't prove the intercept actually prevents the game from seeing `help` or that the block is announced. Add an integration test on the routing surface found in Step 1 (`translatePipeline.ts`):

```ts
// es-mode 'ayuda' yields the help block and produces NO game command:
//   assert the pipeline result is the help block (not a translate/raw-send)
// en-mode 'help' passes through to the game (raw-send / native help):
//   assert it is NOT intercepted
// a11y: the help block is announced via the aria-live region — assert it
//   lands in the same live region the one-time notices use (reuse the
//   notices.test.ts live-region assertion: getByRole('status'|'log') or the
//   region's test id), per CLAUDE.md (dynamic content must reach assistive tech).
```

Write these RED first (they fail until Step 4's wiring exists), then GREEN.

- [ ] **Step 5: Run; verify PASS, then full suite**

Run: `npx vitest run src/llm/help.test.ts && npx vitest run src/llm/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/llm/help.ts src/llm/help.test.ts src/llm/inputTranslate.ts
git commit -m "feat(nl): localized help command (fr/de/es/ka), overriding native help

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: One-time activation notice + input placeholder

**Files:**
- Modify: `src/llm/notices.ts` (+ its test) — the escape-hatch activation notice text per language.
- Modify: the command-input component + its test — localized placeholder + a11y name/role assertion.

- [ ] **Step 1: Read the existing one-time-notice pattern** (the "basic mode"/first-abstain notice) in `src/llm/notices.ts` and `notices.test.ts` to reuse the once-per-activation mechanism verbatim.

- [ ] **Step 2: Write the failing notice test** — assert that picking a language yields a one-time escape-hatch notice in that language (fr/de/es: "wrap English in quotes"; ka: "type in English"), and that it fires only once (mirror the existing once-guard test).

- [ ] **Step 3: Implement the notice** in `notices.ts` following the existing once-guarded pattern. Run the notice test → PASS.

- [ ] **Step 4: Write the failing placeholder + a11y test** for the command input — `getByRole(... { name })` asserting the localized placeholder/accessible name mentions the fallback (fr/de/es) or "type in English" (ka), per CLAUDE.md's a11y name/role requirement.

- [ ] **Step 5: Implement the localized placeholder** on the command input. Run its test → PASS.

- [ ] **Step 6: Check whether either edit touched `src/ui/landing.css` or `components.css`.** If yes, run the spec's manual responsive checklist (320/375/520px + short landscape, both themes); if no (expected — text only), note "no CSS touched" in the commit.

- [ ] **Step 7: Commit**

```bash
git add src/llm/notices.ts src/llm/notices.test.ts src/ui/
git commit -m "feat(nl): one-time escape-hatch activation notice + localized input placeholder

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: P2.2 — author the two missing disambiguation templates (fr/de/es/ka)

Confirmed: only `Which book do you mean, the {obj} or the {obj2}?` exists; the `put {obj} in?` and `Which of the {obj}s` lines are absent in all four corpora.

**Files:**
- Modify: `src/translate/corpus/zork1.{es,fr,de,ka}.templates.ts`
- Test: `src/translate/corpus/zork1.{es,fr,ka}.uat.test.ts` + the de corpus completeness suite.

- [ ] **Step 1: Read the existing template shape** in `zork1.es.templates.ts` (the `Which book…` entry) to match the `{obj}`/`en`/translation field structure exactly.

- [ ] **Step 2: Write the failing es pin** — in `zork1.es.uat.test.ts`, assert the two templates render correctly (no leaked English, correct `{obj}` slot, correct plural — `tesoros` not `tesones`). Use the existing `matchLine`/template-render helper in that file.

- [ ] **Step 3: Run; verify it fails**

Run: `npx vitest run src/translate/corpus/zork1.es.uat.test.ts -t "disambig"`
Expected: FAIL.

- [ ] **Step 4: Author the templates** in `zork1.es.templates.ts` (correct structure + plural), then mirror into `fr` and `de` (with their grammar). For `ka`, add the keys with provisional text carrying the draft marker (Task 14 enforces the marker), so `ka` no longer leaks raw English.

- [ ] **Step 5: Run the es/fr/ka uat suites + the de completeness suite**

Run: `npx vitest run src/translate/corpus/`
Expected: PASS (es/fr/ka pins green; de assertion in the completeness suite green).

- [ ] **Step 6: Commit**

```bash
git add src/translate/corpus/
git commit -m "feat(xlate): author put/which-of disambiguation templates (es/fr/de/ka)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Enforce the `ka` NATIVE-REVIEW-DRAFT marker

Make the provisional Georgian lines verifiable-as-draft so they can't silently be treated as final.

**Files:**
- Modify: the `ka` corpus files holding the new draft lines (templates + help block).
- Test: `src/translate/corpus/zork1.ka.uat.test.ts` (or a focused new test).

- [ ] **Step 1: Write the failing test** — assert every provisional `ka` line added this branch carries a `// NATIVE-REVIEW-DRAFT (ka §4 case forms)` marker comment (scan the `ka` template/help source for the marker on the new keys).

- [ ] **Step 2: Run; verify it fails** (markers not yet present).

- [ ] **Step 3: Add the `// NATIVE-REVIEW-DRAFT (ka §4 case forms)` markers** on every provisional `ka` line from Tasks 11 and 13.

- [ ] **Step 4: Run; verify PASS.** Add the same draft lines to `notes/georgian-native-review-followup.md` as native-review items.

- [ ] **Step 5: Commit**

```bash
git add src/translate/corpus/ notes/georgian-native-review-followup.md
git commit -m "test(xlate-ka): enforce NATIVE-REVIEW-DRAFT marker on provisional Georgian lines

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Full gate + notes update

- [ ] **Step 1: Run the full quality gate**

Run: `make all`
Expected: lint + format + typecheck + test all PASS.

- [ ] **Step 2: Update `notes/uat.md`** — mark the fixed es bugs (eco, deja todo, songbird `al`, boat-exit `del`, tapa/jade/calavera, combat personal-`a`) as RESOLVED with their pin locations; record the Task 9 decision; note that the conjoined+prep and `apaga` items were already fixed (catalogue was stale).

- [ ] **Step 3: Update `notes/next.md`** — move the P1.1/P2.2/P3 items from "in progress" to done for fr/de/es (+ ka output); leave the deferred follow-ups (cosmetic tier, driven fr/de catalogues, ka native review, ka Phase-2 input).

- [ ] **Step 4: Commit**

```bash
git add notes/uat.md notes/next.md
git commit -m "docs(notes): record input-parity fixes; mark stale catalogue items resolved

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Finish the branch** — use `superpowers:finishing-a-development-branch` to decide merge/PR.

---

## Self-review notes (post-pushback + alignment review, 2026-06-19)

- **Spec coverage:** P1.1 (Tasks 1–9), conjoined+prep pin (Task 8b, spec N3), P2.2 (Task 13), P3 (Tasks 10–12, 14). Escape-hatch passthrough pins (Task 8), cross-language verification incl. friction tier (Task 7), and the help a11y live-region test (Task 11 Step 4b) cover the spec's S5/cognate/a11y requirements.
- **Corrected factual errors found by review (verified against code):**
  - Task 5: `lid` is NOT a canonical — it's a synonym of `machine`; `tapa` appends to `machine`, assertion is `open/close machine`.
  - Task 6: the simple `ataca al troll` case already works (existing `parse.ts:270-283` block); the fix extends the prep-split object span, not a duplicate strip; the weapon emit is `rusty knives` (plural), not `knife`.
  - Conjoined+prep was pinned nowhere — Task 8b adds the `inputTranslate.ts`-surface pin the spec's N3 mandates.
- **Divergence from spec (ground truth), to reconcile with Ovid:** the spec's "conjoined+prep = one genuine code change" is obsolete (already works; now just pinned in 8b); the real one code change is the personal-`a` prep-split fix (Task 6). `apaga` and `bote`→bottle were already fixed (apaga now regression-pinned in Task 2; bote→boat confirmed). `sube la cesta` and `entra en el bote` are **DEFERRED (Ovid sign-off 2026-06-19)** — Task 9 is now docs-only; the deferrals are logged in `notes/next.md`.
- **Diagnose-first tasks** (5, 6, 8b, 13) confirm the exact vocab `emit`/canonical before asserting.
- **Decision-gated task** (10) writes no code until the native-help audit is reviewed; it has an agent-executable `.zil`-read fallback (no browser). Task 9 is decided (deferred).
