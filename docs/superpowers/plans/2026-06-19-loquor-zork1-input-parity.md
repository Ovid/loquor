# Zork I Input Parity (fr/de/es) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Zork I completable in French, German, and Spanish without secretly switching to English — by fixing the input-NL bugs that mis-map puzzle-critical Spanish commands, authoring the two missing disambiguation templates (fr/de/es + ka), and making the quoted-English escape hatch discoverable.

**Architecture:** Almost all fixes are **data** edits to the Spanish lexicons (`src/llm/lexicon/es.core.ts`, `es.zork1.ts`), with exactly **one parser change** (personal-`a` stripping in `parse.ts`). fr/de were characterized and already handle the shared puzzle verbs, so cross-language work is mostly *verification pins*. P3 adds a localized `help` intercept and passive signposting in `src/llm/`.

**Tech Stack:** TypeScript, Vitest, React. Tests run via `npx vitest run <file>`. Lexicon tests assert `parseLexicon(clause, CORE, NOUNS, vocab, scene)` output. Full suite/quality gate: `make all`.

---

## ⚠️ Ground truth (characterized 2026-06-19) — supersedes the stale catalogue

The `notes/uat.md` Spanish catalogue is from **2026-06-15** and predates the German F16 / `distributePrepTail` work and several lexicon updates. Every bug below was re-characterized against the **shipping** lexicons before this plan was written. Findings that change scope:

**Already fixed — DROPPED from scope (do NOT re-fix):**
- `apaga las velas` → `extinguish candles` ✓ (`apaga: 'extinguish'` already in `es.core.ts:142`).
- **Conjoined + trailing prep** `mete la antorcha y el destornillador en la cesta` → `put torch in cage` + `put screwdriver in cage` ✓. `splitClauses`/`fillElidedVerbs`/`distributePrepTail` already cover Spanish `y`. **The spec's "one genuine parser change" for this is obsolete.**
- `infla el plastico con la bomba` → `inflate valve with pump` ✓.

**Confirmed broken (es) — the real work:**

| # | Input (es) | Current | Root cause | Fix surface |
|---|-----------|---------|-----------|-------------|
| Loud Room | `eco` | `miss` | `eco` not a verb | `es.core.ts` data |
| deja todo | `deja todo` | `miss` | ES_CORE has no `quantifiersAll` | `es.core.ts` data |
| Songbird | `da cuerda al canario` | `give rope to canary` | idioms `da cuerda a`/`dale cuerda a` exist but `al` (a+el) token defeats the match | `es.core.ts` data |
| Boat exit | `sal del bote` | `miss` | `sal`→exit works but `del` (de+el) is unhandled | `es.core.ts` data |
| Nouns | `abre la tapa`, `coge el jade`, `coge la calavera de cristal` | `miss` | `tapa`/`jade`/`calavera de cristal` surface forms absent | `es.zork1.ts` data |
| Combat slot | `mata al ladron con el cuchillo` | `miss` | personal-`a` (`al ladron`) not stripped → noun resolution fails | **`parse.ts` (the one code change)** |

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
```

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

with the `al`/`a la` variants added (longest-first ordering is handled by the parser's sort, but list the fused forms so they exist):

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

- [ ] **Step 1: Write the failing test** — add a describe block to the es-UAT file:

```ts
describe('Spanish UAT — noun surfaces', () => {
  it('"calavera de cristal" → crystal skull (the modifier must not break it)', () => {
    expect(es('coge la calavera de cristal', inScope('crystal skull'))).toEqual({
      kind: 'command',
      text: 'take skull',
    })
  })
  it('"tapa" → the diamond-machine lid', () => {
    expect(es('abre la tapa', inScope('lid'))).toEqual({
      kind: 'command',
      text: 'open lid',
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

- [ ] **Step 2: Run it; verify it fails AND confirm the exact canonical/emit**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "noun surfaces"`
Expected: FAIL — all `miss`. **Before writing Step 3, confirm the real emit strings** by checking the vocab entry for each canonical (the test's expected `text` — `take skull`, `open lid`, `take figurine` — must match the vocab `emit`). Grep: `grep -n "crystal skull\|'lid'\|jade figurine" src/llm/grammar/zork1.vocab.ts` and adjust the expected `text` if the emit differs. The note `es.zork1.ts:64` warns the `jade` token equals the English `jade` adjective — verify adding it doesn't collide in `validate.test.ts` (Step 4).

- [ ] **Step 3: Add the noun surfaces** — in `src/llm/lexicon/es.zork1.ts`:

```ts
  // crystal skull: 'calavera de cristal' mirrors the existing 'craneo de cristal'
  'crystal skull': ['craneo', 'calavera', 'craneo de cristal', 'calavera de cristal'],
```

Add `tapa` under the diamond-machine lid canonical (confirm the canonical name from vocab — likely `lid`):

```ts
  lid: ['tapa'], // diamond-machine lid (UAT: 'abre/cierra la tapa')
```

Add `jade` under the figurine canonical (keep the existing entry, append `jade`):

```ts
  'jade figurine': ['figurilla', 'estatuilla', 'figurilla de jade', 'jade'],
```

- [ ] **Step 4: Run the test AND the validate/collision gate**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "noun surfaces"`
Run: `npx vitest run src/llm/lexicon/validate.test.ts`
Expected: both PASS. If `validate.test.ts` flags a `jade` collision (the adjective also belongs to another canonical), resolve by scene-scoping in the test (`inScope('jade figurine')`) — which the test already does — and confirm the collision gate accepts an ambiguous surface.

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/es.zork1.ts src/llm/lexicon/parse.es-uat.test.ts
git commit -m "fix(nl-es): add 'tapa', 'jade', 'calavera de cristal' noun surfaces

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Combat slot — strip the personal-`a` (the one parser change)

`mata al ladron con el cuchillo` misses because the prep-split loop hits `al`→`to` with no object before it, fails, then `con`→`with` tries to resolve `al ladron` as a noun and fails. Spanish marks animate direct objects with `a`/`al`. When `a`/`al` is the **first token after the verb** (nothing before it), it is a personal-`a` marker, not a preposition — strip it so the object resolves.

**Files:**
- Modify: `src/llm/lexicon/parse.ts`
- Test: `src/llm/lexicon/parse.es-uat.test.ts`

- [ ] **Step 1: Write the failing test** — add to the es-UAT file:

```ts
describe('Spanish UAT — personal-a', () => {
  const combatScene = inScope('thief', 'rusty knife')
  it('"mata al ladron con el cuchillo" → attack thief with knife', () => {
    expect(es('mata al ladron con el cuchillo', combatScene)).toEqual({
      kind: 'command',
      text: 'attack thief with knife',
    })
  })
  it('personal-a with no instrument: "ataca al troll" → attack troll', () => {
    expect(es('ataca al troll', inScope('troll'))).toEqual({
      kind: 'command',
      text: 'attack troll',
    })
  })
})
```

- [ ] **Step 2: Run it; verify it fails AND confirm the knife emit**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "personal-a"`
Expected: FAIL — `miss`. Confirm the expected `text` matches the vocab: `grep -n "rusty knife\|nasty knife\|'thief'\|'troll'" src/llm/grammar/zork1.vocab.ts` — the `cuchillo`→`rusty knife` emit may be `knife` or `rusty knife`; set the expected `text` accordingly. Use the scene to pick the in-scope knife (the combat scene lists `rusty knife`, not the thief's `stiletto`).

- [ ] **Step 3: Strip the leading personal-`a` in `parse.ts`** — after the verb is extracted and before the prep-split loop (just before the `// --- Prep split` comment near line 285), add:

```ts
  // Spanish personal-`a`: an animate DIRECT object is marked with a/al
  // ('ataca al troll', 'mata al ladron'). When the verb is immediately
  // followed by a folded 'a'/'al' (no object token before it), that token is
  // the personal-`a` marker, NOT the indirect-object prep — strip it so the
  // object resolves. Guarded to a/al only; a real prep ('con','en') is left
  // for the prep-split below. (es.core.ts personal-`a` note.)
  if (tokens.length >= 2 && (tokens[0] === 'a' || tokens[0] === 'al'))
    tokens = tokens.slice(1)
```

Note: `tokens` are already folded by `tokenize`; `al` survives as one token. This runs after verb extraction, so `tokens[0]` is the first post-verb token.

- [ ] **Step 4: Run the es-UAT test AND the full lexicon suite (parse.ts is shared)**

Run: `npx vitest run src/llm/lexicon/parse.es-uat.test.ts -t "personal-a"`
Run: `npx vitest run src/llm/lexicon/`
Expected: both PASS. The fr/de suites must stay green — fr/de don't lead with `a`/`al` as a personal marker, but verify no fr/de clause starts `a`/`al` post-verb in a way this would wrongly strip (the de F-suite and fr roundtrip cover this).

- [ ] **Step 5: Commit**

```bash
git add src/llm/lexicon/parse.ts src/llm/lexicon/parse.es-uat.test.ts
git commit -m "fix(nl): strip leading Spanish personal-'a'/'al' before noun resolution

Fixes the combat instrument slot (mata al ladron con el cuchillo) and any
'<verb> al <animate>' command that previously missed.

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

## Task 9: Decide `sube la cesta` and `entra en el bote` with Ovid (NO blind fix)

Per CLAUDE.md's player-experience rule, these two are "talk to me first" — a natural command produces a wrong/missing result, but the fix is fragile (arity-conditional verb sense) and a workaround exists.

- [ ] **Step 1: Write up the two cases for Ovid** — for each: the player input, what happens now (`sube la cesta`→`climb cage`; `entra en el bote`→`miss`), the working workaround (`levanta la cesta`→`raise cage`; `aborda`/`embarca`→board), why a blind fix is risky (`sube` bare = go up/climb, so a context-free `sube`→raise breaks navigation; boat-`enter` arity), and the options: (a) leave + document the workaround, (b) arity-conditional sense, (c) add `sube`→raise only when an object follows.

- [ ] **Step 2: Present to Ovid and wait for the call.** Do not implement until he chooses. Record the decision in `notes/uat.md` (Spanish catalogue) regardless of outcome.

- [ ] **Step 3 (conditional): implement the chosen option** if Ovid picks a fix, with its own red→green test in `parse.es-uat.test.ts` and commit. If "leave + document," just commit the `notes/uat.md` update.

---

## Task 10: Audit Zork I's native `help` before overriding it

Per the spec's player-experience gate (S3): confirm what we're replacing before we replace it.

- [ ] **Step 1: Run the app and capture Zork's native help.** `make dev`, start Zork I in English, type `help`, `info`, and `commands`; record the exact output.

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

## Self-review notes

- **Spec coverage:** P1.1 (Tasks 1–9), P2.2 (Task 13), P3 (Tasks 10–12, 14). Escape-hatch passthrough pins (Task 8) and the cross-language verification (Task 7) cover the spec's S5/cognate requirements.
- **Divergence from spec (ground truth):** the spec's "conjoined+prep = one genuine code change" is obsolete (already fixed); the real one code change is the personal-`a` strip (Task 6). `apaga` dropped (already fixed). Most "shared" bugs are es-only (fr/de pass). **This should be reconciled with the spec — flagged to Ovid.**
- **Diagnose-first tasks** (5, 6, 13) include a Step that confirms the exact vocab `emit`/canonical before asserting, because the test's expected `text` must match the real vocab strings.
- **Decision-gated tasks** (9, 10) do not write code until Ovid weighs in, per the player-experience rule.
