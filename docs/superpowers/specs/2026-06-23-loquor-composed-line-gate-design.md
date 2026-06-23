# Loquor composed-line inventory gate — design (2026-06-23)

Status: **approved (design)**, plan pending. Scope: **Zork I**, output translation,
languages **fr / de / es / ka**. This is `notes/next.md` **P2.1**.

## Why this exists

Loquor's output translation has two coverage gates today:

1. **Walkthrough gate** (`coverage.test.ts`) — replays one captured 350/350
   playthrough and asserts every displayed line has a corpus match. Blind spot:
   only lines on **that one path**.
2. **String-inventory gate** (`inventory.test.ts`) — decodes every **full-line**
   z-string in the committed story file and asserts each matches the corpus.
   Blind spot: it explicitly excludes **composition fragments** — pieces that are
   not a whole line on their own.

Zork I builds many displayed lines **at runtime by gluing separate string
fragments together** (a template literal + an object name + join words). Those
composed lines fall through *both* gates: no fragment is a full line (inventory
misses them), and the walkthrough only triggers the specific instances its single
path happened to hit (coverage misses the rest). They have leaked raw English in
**every** language and been found one at a time in UAT (the 7 pins currently in
`composed-lines.uat.test.ts`).

This matters most for **Georgian (`ka`)**. fr/de/es have an LLM fallback that
silently papers over a missing deterministic line; **`ka` has no LLM net** — a
composed-line gap is a *guaranteed raw-English leak* to a Georgian player. This
work is, deliberately, a thank-you to the project's Georgian colleagues: the bar
is that a Georgian player never sees raw English on a composed line.

This spec turns that whole bug class from **UAT-discovered, four-at-a-time** into
**gate-enforced, all-languages-at-once**.

## The recon (composition sites in Zork I)

Mechanical extraction over the (gitignored, local-only) ZIL source found three
composition mechanisms, ~140 families total:

| Mechanism | Source | Families | Notes |
| --- | --- | --- | --- |
| **Single-line object splice** — `<TELL "…" D ,PRSO "…">` | `gverbs.zil`, `1actions.zil` | **124 distinct** | one fixed response with the object name spliced in (`The {obj} isn't open.`, `You can't wear the {obj}.`) + a long tail of exotic-verb joke-insults |
| **Contents-listing engine** — `DESCRIBE-OBJECT` / `PRINT-CONT` / `PRINT-CONTENTS` / `FIRSTER` | `gverbs.zil:1681–1850` | **~14** | glues a line from many literals: `"There is a "` + name + `" here"` + `" (providing light)"`; the `", "` / `"and "` / `"a "` inventory joins; `"The {obj} contains:"`, `"Sitting on the {obj} is:"`, `"You are carrying:"`, `"Your collection of treasures consists of:"`, `"Opening the {obj} reveals "` + contents |
| **Parser prompts** — `WHICH-PRINT`, the orphan prompt | `gparser.zil:760, 1146` | **2** | `"Which {raw} do you mean, the {obj}, … or the {obj}?"` (built by looping candidates with `", "` / `" or "`) and `"What do you want to {verb} the {raw}?"` |

Every one of these is invisible to the two existing gates.

### Coverage asymmetry (the trap)

Corpus entry counts per language reveal *how* `ka` covers composed lines, and why
a naive gate false-passes for it:

| | fr | de | es | **ka** |
| --- | --- | --- | --- | --- |
| slot templates | 252 | 312 | 311 | **46** |
| full-line string pins | 309 | 388 | 421 | **477** |

`ka` is **not under-covered — it covers differently.** Because of the Georgian
**case problem** (a generic `{obj}` template would bake the wrong grammatical case
onto the spliced object name), `ka` deliberately avoids slot templates and pins
lines **per-object as full strings** (477 — more than any other language).
Consequently, a gate that tests a family with a single placeholder noun hits the
one object `ka` happens to have pinned, reports **green**, and every other object
in that family still leaks. **The gate must drive real object names** to be
honest.

## Decisions (from brainstorming, 2026-06-23)

1. **Coverage scope = player-reachable subset.** Gate + fill the families a
   Georgian player actually meets: the whole listing engine + both parser prompts
   + the single-line families reachable on a 350/350 run and normal exploration.
   The exotic-verb joke-insult tail is **listed but deferred** (logged, not
   asserted). "Reachable" has a concrete definition (§ Family classification).
2. **`ka` faithfulness = drive every eligible object.** Per family, drive **all**
   Zork I objects (object-agnostic families) or the specific object(s) through the
   real `matchLine`, and assert a translation. No false-pass; strategy-agnostic
   (it checks rendered output, not whether `ka` used a template or a pin). Not a
   VM replay — `matchLine` on committed corpus data, exactly like the two existing
   gates.
3. **Languages = all four.** `ka` gets the faithful per-object drive; fr/de/es get
   a cheap generic-slot check that **locks in the deterministic coverage they
   already have** (a regression from corpus → LLM is a real downgrade — the
   deterministic path is instant + offline). A small documented **exemptions** map
   covers families fr/de/es *intentionally* route to the LLM (the disambiguation
   prompts).
4. **Family list = hand-curated committed data.** A live-ZIL-parsing gate is ruled
   out: `zork1/*.zil` is gitignored and absent in CI. The family inventory is a
   committed, annotated, reviewable data file, seeded by the mechanical extraction
   already run in recon, with the extraction method cited in a header comment.
5. **Georgian authoring = hybrid (minimal draft + worklist).** Author *minimal*
   draft Georgian (prefer one case-safe template per family) so the gate is green
   and the gift works now, **and** emit a short native-review worklist so the
   colleagues refine it. Everything authored is marked `NATIVE-REVIEW-DRAFT`.
6. **Gate structure = one systematic gate (Approach C).** Absorb the 7 existing
   UAT pins into the family inventory (carrying their provenance as annotations)
   and retire `composed-lines.uat.test.ts`.

## Components & data flow

```
zork1/*.zil ──(recon, one-time, dev-only)──► composed-families.ts   (committed data)
                                                    │
   ┌─────────────────────────────────────────────────┘
   │  Family = { en skeleton, slots[] (binding per slot), reach, arity, note }
   ▼
composed-lines.test.ts  (the gate — committed data + match.ts only; no ZIL/VM/network)
   for each family where reach === 'reachable':
     ka      ─► for every eligible object: matchLine(compile(ZORK1_KA), fill) ≠ null ∧ ≠ en
     fr/de/es ─► generic-slot fill: matchLine(...) ≠ null ∧ ≠ en,  unless family ∈ exemptions[lang]
   log() the deferred families (count + names)         ← honesty: green never overstates
   meta-test: inventory size ≥ floor                    ← a refactor can't empty the gate
```

### `composed-families.ts` (committed data)

One entry per family:

- **`en`** — the EN skeleton exactly as it appears in game output, normalized
  (`"You can't wear the {obj}."`). Slot tokens: `{obj} {obj2} {obj3} {obj4} {num}
  {num2} {raw}` (the set `match.ts` already understands).
- **`slots`** — per-slot **binding**:
  - `all-objects` (agnostic) — generic response, object merely spliced. Drives
    `Object.keys(corpus.objects)`. This is a deliberate **safe over-approximation**:
    some object × frame combinations a player can't actually reach get driven too
    (e.g. `wear` + a creature), which is harmless — covering a combination that
    never occurs costs nothing, while *missing* a reachable one is the leak we are
    closing.
  - `string[]` (specific) — the line names a fixed object (`The rug is extremely
    heavy and cannot be carried.` → carpet only). Drives just those.
  - `raw` — the slot is the player's **echoed token**, which can be a
    lexicon-emit synonym that is *not* an object-table key (`advertisement` for
    the leaflet). Binds `{raw}`, filled with a representative token **including a
    known emit synonym** to exercise the path that bit the E-pin.
- **`reach`** — `reachable` (asserted) | `deferred` (listed + logged, not
  asserted).
- **`arity`** — slot count. Multi-slot families carry **representative concrete
  instances** rather than a full object cross-product (combinatorial, near-zero
  added leak-coverage). `ponytail:` capped at curated instances; upgrade to fuller
  pairs only if a real leak is found.
- **`note`** — provenance/annotation (carries the retired UAT comments, the rung
  used for `ka`, any case compromise).

### `composed-lines.test.ts` (the gate)

- `ka`: faithful per-object drive (decision 2). The existing `translated()`
  helper's two checks — `matchLine` non-null **and** `≠ en` (an echo is a leak,
  not a translation).
- fr/de/es: one generic-slot fill, same two checks, skipped iff the family is in
  `exemptions[lang]`.
- **`exemptions`** — committed map `{ fr: [...], de: [...], es: [...] }`; **each
  entry requires an inline `why`** (e.g. "disambiguation prompt — deliberately
  LLM-routed, recon 2026-06-19"). The escape hatch can't be used silently.
- **Resolving a red fr/de/es family** (one that is reachable but currently
  un-translated and *not* yet exempt): the **default is to author the cheap
  generic template** — the deterministic path is better than the LLM (instant +
  offline), and CLAUDE.md requires deterministic coverage for every applicable
  language. Only add an `exemptions` entry (with `why`) when the family is
  *genuinely* better served by the LLM (e.g. a response whose natural fr/de/es
  forces per-object agreement a shared template would get wrong). The reachable
  set is mostly already covered (fr 252 / de 312 / es 311 templates), so this is
  expected to be a handful of fills, not a second corpus.

## Family classification rules

**`reach`:**
- `reachable` = produced on a 350/350 walkthrough, **or** by the standard verb set
  (`take/drop/open/close/examine/read/wear/turn on/turn off/put/attack/move/enter`)
  applied to in-scope objects, **or** structural (every listing-engine family +
  both parser prompts — they fire constantly). Concrete, not a vibe: if a
  standard-set verb can produce the line, it is reachable.
- `deferred` = needs an exotic verb a winning/exploring player will not type
  (`send for`, `mung`, `\`-prefixed, "pray", …). Listed; the gate logs them by
  name.

**`binding`:** `all-objects` | `string[]` | `raw`, as above.

**`arity`:** single-slot (most) vs multi-slot (`Opening the {obj} reveals
{contents}`, `Trying to attack the {obj} with a {obj2}…`, `The {obj} is already in
the {obj2}.`). Multi-slot → representative instances.

All tags are assigned once from the ZIL routing during the fill and committed as
data; a reviewer audits every tag by reading the one file.

## Georgian fill strategy

The faithful per-object drive does **not** dictate per-object Georgian. Georgian
case is fixed by *syntactic role within a sentence frame*, so one entry can
satisfy every object a family drives. Fill follows a **decision ladder — laziest
correct rung wins**, per family:

1. **One case-safe `ka` template** (default, preferred). If the frame's case
   matches the stored object form, a single template covers every object the gate
   drives. Proven path: `ka` already does this for `There is a {obj} here.`,
   `{obj}: Taken.`, contents.
2. **Per-object string pins** — only where the frame forces a case the citation
   form can't supply for *some* objects (plurals, known case-shifters). Pin just
   those; the template covers the rest. The per-object drive is exactly what
   reveals which objects fall through.
3. **Drop-the-noun reframe** — the established technique (the §4 finding-B
   `ამაში…` line); reframe so the object name isn't declined. Used sparingly; a
   deliberate naturalness/correctness trade the native reviewer may revisit.

**Everything authored is marked `NATIVE-REVIEW-DRAFT`.** The strategy minimizes
the surface of non-native Georgian that ships (prefer rung 1 → fewest authored
lines). **Where rung-1 case-correctness is uncertain, choose safe-but-stiff over
natural-but-wrong**, and flag it for the reviewer — a slightly stiff gift beats a
confidently wrong one.

**Worklist:** `notes/georgian-composed-line-review.md` lists every authored line,
grouped by family, each with EN source, draft Georgian, rung used, and any
case/naturalness note. This is the short, dignified "would you help us get your
language exactly right?" artifact.

## Testing & honesty

**TDD (red→green per family group):**
1. Add a family group to `composed-families.ts`, tagged but un-filled.
2. Run the gate → **red**, naming each leaking `(family × object × language)`
   cell. The red output *is* the worklist generator.
3. Fill `ka` (rung 1→3) + any fr/de/es regression → **green**.
4. Commit that group (one commit per group, reviewable diff). Repeat.

**Honesty mechanisms (green must never overstate — the recon's central warning):**
- The gate `log()`s the **count + names of `deferred` families** it did not
  assert. A green run prints "N reachable gated; M deferred (listed)".
- Every `exemptions[lang]` entry carries a `why` string.
- A **meta-test** asserts the inventory size ≥ a floor, so a refactor can't
  silently empty the gate into a vacuous pass (the same class of risk the
  responsive-layout section of CLAUDE.md flags for CSS).

**Error handling / edge cases:**
- A skeleton referencing an object absent from a language's table is a **MISS**
  (red), per the `types.ts` contract ("a missing key on a matched object is a
  MISS, not a crash") — a real gap surfacing.
- `{raw}` slots are filled with a representative token **including a known
  lexicon-emit synonym** (`advertisement`).
- The gate imports only committed corpus data + `match.ts` — **no ZIL, no VM, no
  network** — so it runs in CI exactly like the existing gates.

## Deliverables

- `src/translate/corpus/composed-families.ts` — annotated family inventory.
- `src/translate/corpus/composed-lines.test.ts` — the systematic gate (absorbs +
  retires `composed-lines.uat.test.ts`).
- `exemptions` map (fr/de/es), each entry with a `why`.
- Georgian fills (rung 1→3, all `NATIVE-REVIEW-DRAFT`) for every `reachable`
  family, + matching fr/de/es coverage where regressed.
- `notes/georgian-composed-line-review.md` — native-review worklist.
- `notes/next.md` updated: P2.1 marked done, pointer to the new gate; old
  `.uat.test.ts` references repointed.

## Non-goals

- **Zork II / III** — Zork I only (II/III stay English by design).
- **The `deferred` joke-insult tail** — listed + logged, not filled. Documented
  follow-up.
- **Georgian input (Phase 2)** — output-only; no `ka` lexicon work.
- **Disambiguation-answer routing (P2.2 remainder)** — separate turn-boundary
  branch.
- **VM-replay / Playwright harness** — out; `matchLine` on committed data.
- **Native-review sign-off itself** — the worklist is the deliverable; the human
  review is the colleagues' follow-up that drops the `(beta)` marker.

## Success criterion

A Georgian player driving Zork I from West of House to a 350/350 win, using any
verb in the standard set on any in-scope object, **never sees a raw-English
composed line** — and the gate fails in CI the moment that stops being true.

## References

- `notes/next.md` P2.1 (this work); `notes/uat.md` (composed-line technique +
  the French-switch classifier); `notes/TODO.md` line 1 ("a test that validates
  all text is translated").
- `notes/georgian-native-review-followup.md`, `notes/georgian-translation-glossary.md`.
- `docs/superpowers/specs/2026-06-17-loquor-output-translation-georgian-design.md`
  (Georgian Phase-1 output-only design; §4 case problem, §8 native loop).
- `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md`
  (output-translation v1; §7.3 coverage gate, §7.4 inventory gate).
- Code: `src/translate/match.ts` (`compileCorpus`, `matchLine`),
  `src/translate/corpus/composed-lines.uat.test.ts` (the seed, to be absorbed),
  `src/translate/corpus/index.ts` (`corporaFor`), `src/translate/types.ts`
  (`Template`, `ObjectsTable`).
