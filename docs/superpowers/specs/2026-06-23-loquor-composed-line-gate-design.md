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
| **Parser prompts** — `WHICH-PRINT`, the orphan prompt | `gparser.zil:760, 1146` | **2** | `"Which {raw} do you mean, the {obj}, … or the {obj}?"` (built by looping candidates with `", "` / `" or "`) and the orphan prompt `"What do you want to {verb} the {raw} {prep}?"` (+ its no-noun-phrase variant). **Both are `reachable` and asserted** — the orphan prompt fires on standard-set verbs (`put`/`attack`/`drop`/`move`), so it is solved deterministically (decision 7), not deferred. |

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
   Zork I objects (object-agnostic families — the **union** object set across all
   corpora, not `ka`'s own keys, so a `ka`-missing object is a MISS, not a silent
   skip) or the specific object(s) through the real `matchLine`, and assert a
   translation. No false-pass; strategy-agnostic
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
7. **Orphan parser prompt = in scope, solved deterministically** (not deferred).
   The orphan prompt (`gparser.zil:760–774`) — `What do you want to {verb} the
   {raw} {prep}?` and its no-noun-phrase variant — fires on **standard-set**
   verbs (`put`; `attack` → "…attack the troll with?"; `drop`; `move`), so it is
   `reachable` and a `ka` raw-English leak today. (The §Family-classification
   rule already tags both parser prompts `reachable`; this decision is what makes
   that tag *satisfiable* — without it the gate would have a red cell it could
   only silence with an exemption.) Its only genuinely-variable span is the
   player's typed noun phrase, which `{raw}` already captures (proven by the
   shipped `What do you want to put the {raw} in?` template). The verb and
   preposition are a **bounded** grammar enumerable from `gsyntax.zil`, *not*
   unbounded — the "not cleanly templatable" note
   (`georgian-native-review-followup.md`) was over-pessimistic and conflated this
   with the genuinely-hard **answer**-routing problem (`next.md` P2.2), which
   stays out (Non-goals). **Verdict (recon 2026-06-23, `gsyntax.zil`):** `gsyntax`
   has two-object prep syntaxes for *many* standard-set verbs (`PUT…IN/ON/UNDER/
   BEHIND`, `DROP…IN/ON`, `MOVE…WITH/TO`, `STRIKE…WITH` = attack, `CUT…WITH`,
   `TURN…TO`, `TIE…TO`, …) — **well over three** reachable verb×prep pairs. Per the
   "≤3 → no code change; more → add the slot" rule, this means **add the `{verb}`
   passthrough** — and it is the **leak-safe** choice: one template *per
   preposition* with `{verb}` as a passthrough covers **every verb that orphans on
   that prep**, so an unforeseen verb cannot leak (decisive for `ka`, which has no
   LLM net). Implementation — a small `match.ts` extension adding **one new slot,
   `{verb}`**, a *second match-only passthrough* (distinct group name so the
   one-`{raw}`-per-template rule still holds). Its sole purpose is to give a
   with-prep template a **second open wildcard** alongside `{raw}` — exactly as
   `{obj2}` exists so a template can hold a second object slot. It is **matched but
   not rendered**: no language echoes it, so the change touches only `SLOT` and the
   `compile` passthrough branch — **`OUT_REF` is unchanged** (nothing references
   `{verb}` on the `out` side). Two shapes:
   - **With-prep** `What do you want to {verb} the {raw} {prep}?` — **prep stays a
     literal**, one template per prep (NOT a third open passthrough: a second `.+?`
     on the tail would fight `{raw}` over an internal space —
     `…attack the brass lantern with?` → `raw="brass"`, `prep="lantern with"` —
     so the literal prep is what keeps a multi-word `{raw}` anchored by the
     trailing `" <prep>?"`). The `out` is **verb-neutral generic** ("with what do
     you want to do it?") — `{verb}`/`{raw}` are dropped from the output, like the
     shipped put-in line. A verb-neutral phrasing bakes *no* verb's meaning, so one
     per-prep template serves every orphaning verb (and no English verb is mixed
     into Georgian/French/etc. output).
   - **No-noun-phrase** `What do you want to {verb}?` — `{verb}` is matched (so the
     line resolves for any verb) and the `out` renders a **generic, verb-less**
     question (the player's verb is on-screen already).
   **Which preps actually orphan must be confirmed EMPIRICALLY** (the plan plays
   the candidates): static syntax overstates — committed UAT 2026-06-20 records
   `put…on` resolving to WEAR (`You can't wear the {obj}.`, already templated) and
   `put…under/behind` printing "That sentence isn't one I recognize," i.e. **not**
   orphaning despite the `gsyntax` lines. The gate's red output is the backstop for
   any prep that turns out reachable. The verb-neutral generic `out` also
   **sidesteps the `ka` case problem** the `georgian-native-review-followup`
   caution flagged: by dropping the noun *and* verb (a caseless per-prep reframe,
   like the shipped put-in line) `ka` never has to decline an echoed English token.
   Still safe-but-stiff and all `NATIVE-REVIEW-DRAFT`, on the worklist.
   Exotic-verb orphans (`give…to`, `dig…with`, …) stay `deferred`. The gate itself
   stays committed-data + `match.ts`.

## Components & data flow

```
zork1/*.zil ──(recon, one-time, dev-only)──► composed-families.ts   (committed data)
                                                    │
   ┌─────────────────────────────────────────────────┘
   │  Family = { en skeleton, slots[] (binding per slot), reach, arity, note }
   ▼
composed-lines.test.ts  (the gate — committed data + match.ts + the committed
                          story file's decoded strings; no ZIL/VM/network)
   fidelity: every skeleton's literal spans ∈ extractStrings(zork1.z3)  ← input IS real game text
   for each family where reach === 'reachable':
     ka      ─► for every eligible object (UNION object set, not ka's keys):
                  matchLine(compile(ZORK1_KA), fill) ≠ null ∧ ≠ en ∧ has-Georgian-char
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
    the **language-independent** object set — the union of every corpus's keys
    for the signature (`corporaFor(ZORK1_SIG).flatMap(c =>
    Object.keys(c.corpus.objects))`), **not** `ka`'s own table — so an object
    missing from `ka` surfaces as a MISS (red), not a silent skip (decision 2).
    This is a deliberate **safe over-approximation**:
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

- **Skeleton fidelity (every family, runs first).** Before any translation check,
  assert each family's `en` skeleton is **real game text**. A composed line is
  glued from sub-fragments (`"What do you want to"` + verb + `"the"` + noun + prep
  + `"?"`), so the test joins the decoded **display lines**
  (`displayLines(extractStrings(public/games/zork1.z3))` — the same decoder +
  normalization `inventory.test.ts` uses, in CI, no VM) into one **haystack** and
  asserts each of the skeleton's
  literal spans — split on slots **and the runtime listing joins** (`,` / ` or ` /
  ` and `, so a span never straddles a join the game inserts at runtime),
  **edge-punctuation-stripped** (so `"with?"` = prep + `?` becomes the real word
  `"with"`, and a leading `": "` join is dropped), then kept only if **longer than
  a trivial-glue floor** (≥4 chars) — is a **substring** of that haystack. The
  value is concentrated in the
  *distinctive* response fragments (`"You can't wear the"`, `"is extremely heavy
  and cannot be carried"`, `"What do you want to"`) — each is itself a decoded
  fragment, so a skeleton mis-transcribed from the (CI-absent) ZIL by a wrong
  article, word, or punctuation in the response text fails here instead of passing
  green while the real composed line leaks (worst for `ka`). `ponytail:` the floor
  lets trivial glue through unchecked — acceptable, the leak risk lives in the
  distinctive spans; tighten only if a glue-level transcription bug is ever found.
  Net effect: the gate is as ground-truthed as the inventory gate on the part that
  matters.
- `ka`: faithful per-object drive (decision 2). **Three** checks — `matchLine`
  non-null, `≠ en` (an echo is a leak, not a translation), **and the output
  contains ≥1 Georgian (Mkhedruli, `\p{Script=Georgian}`) character** so a pure-
  or *mostly*-English render can't slip past `≠ en` (e.g. an object whose `indef`
  was accidentally left English, or a frame with an English tail). Safe from
  false-fail: every `ka` composed line carries Georgian framing, even the
  `{raw}`-echo prompts (`რომელ leaflet-ს…`).
- fr/de/es: one generic-slot fill, same two checks, skipped iff the family is in
  `exemptions[lang]`. ("Generic-slot fill" is unambiguous for an `all-objects`
  family; for a `string[]` (specific-object) or `raw` family there is no generic
  slot — drive the named object(s) / the representative `raw` token once, the
  same value `ka` drives, just not the full object set.)
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
- `reachable` = produced on a 350/350 walkthrough, **or** a standard-set verb
  (`take/drop/open/close/examine/read/wear/turn on/turn off/put/attack/move/enter`)
  can emit the frame, **or** structural (every listing-engine family + both parser
  prompts — they fire constantly; the orphan prompt is made assertable by decision
  7). Object scope does **not** filter here — the union drive (decision 2) covers
  the object axis — so reachability is purely "can a standard-set verb produce
  this line?" Concrete, not a vibe.
- `deferred` = needs an exotic verb a winning/exploring player will not type.
  **Each `deferred` entry must name its gating exotic verb as a string** (`deferred:
  "send for"`, `"mung"`, `` "`" ``-prefixed, `"pray"`, …) so a reviewer audits the
  deferral from the one data file — a checkable claim, not a vibe. **When
  reachability is uncertain, tag `reachable`, not `deferred`.** Driving a
  rarely-reached family is harmless (the same "safe over-approximation" rationale
  as the object axis: covering a line players seldom see costs one authored `ka`
  line; *missing* a reachable one is the leak). Listed; the gate logs them by name.
  This closes the third vacuous-pass path the meta-tests can't: a *reachable*
  family hand-tagged `deferred` drops silently out of the asserted set, and CI
  can't catch it because the `reach` tag isn't machine-verifiable (ZIL is absent).

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
- A **meta-test** guards against a vacuous pass two ways: (1) inventory size ≥ a
  **named floor constant** set to the `reachable`-family count at authoring time
  — *raise* it when you add families, **never lower** — so a refactor can't
  silently empty the data file; and (2) a **completeness assertion** — the number
  of families the gate actually iterated and asserted equals the number tagged
  `reachable` in `composed-families.ts`, so a refactor can't drop entries from the
  loop while leaving the inventory full. The floor catches "data emptied"; the
  completeness check catches "loop skips entries" (the same class of risk the
  responsive-layout section of CLAUDE.md flags for CSS). The **third** vacuous-pass
  path — a *reachable* family hand-tagged `deferred` — is not machine-checkable
  (the `reach` tag can't be verified against the CI-absent ZIL), so it is closed
  by **data discipline**: every `deferred` entry names its gating verb and the tag
  biases to `reachable` when unsure (§Family classification).
- The **skeleton-fidelity** assertion (see the gate section) is itself an honesty
  mechanism: it guarantees a green cell is about a line the game actually emits,
  not a mis-transcribed skeleton — so green can't overstate by testing fiction.
- **Green proves coverage, not correctness.** A green gate means *no English
  leak* — it does **not** certify Georgian case-correctness or naturalness; only
  the native review (`georgian-native-review-followup.md`) does. The `(beta)`
  marker and the `NATIVE-REVIEW-DRAFT` worklist remain the sole gate for *correct*
  Georgian and **must not be dropped on a green run**: "P2.1 done" is not
  "Georgian is done".

**Error handling / edge cases:**
- A skeleton referencing an object absent from a language's table is a **MISS**
  (red), per the `types.ts` contract ("a missing key on a matched object is a
  MISS, not a crash") — a real gap surfacing.
- `{raw}` slots are filled with a representative token **including a known
  lexicon-emit synonym** (`advertisement`).
- The gate imports committed corpus data + `match.ts` + the committed story
  file's decoded strings (`extractStrings(public/games/zork1.z3)`, exactly as
  `inventory.test.ts` does, for the skeleton-fidelity check) — **no ZIL, no VM, no
  network** — so it runs in CI exactly like the existing gates.

## Deliverables

- `src/translate/corpus/composed-families.ts` — annotated family inventory.
- `src/translate/corpus/composed-lines.test.ts` — the systematic gate (absorbs +
  retires `composed-lines.uat.test.ts`); includes the skeleton-fidelity assertion
  (every skeleton's literal spans ∈ `extractStrings(zork1.z3)`).
- `exemptions` map (fr/de/es), each entry with a `why`.
- Georgian fills (rung 1→3, all `NATIVE-REVIEW-DRAFT`) for every `reachable`
  family, + matching fr/de/es coverage where regressed.
- `notes/georgian-composed-line-review.md` — native-review worklist.
- `src/translate/match.ts` — one new `{verb}` passthrough slot (decision 7; the
  spec's only runtime-code change). The preposition is **enumerated as a literal**
  (one template per prep), not a passthrough — so a multi-word `{raw}` stays
  anchored.
- Orphan-prompt templates, all four languages (`ka` `NATIVE-REVIEW-DRAFT`): one
  **with-prep template per empirically-confirmed prep** (`…{verb} the {raw} in?`
  extends the shipped put-in; `…{verb} the {raw} with?` is new) using the new
  `{verb}` passthrough, **plus** the no-noun `What do you want to {verb}?` (generic
  verb-less `out`). Driven by representative `{verb}`/`{raw}` instances (incl. an
  emit synonym). Preps `gsyntax` lists but UAT shows don't orphan (`on`→WEAR,
  `under`/`behind`→unparsed) are **not** authored.
- `notes/georgian-native-review-followup.md` — the "Known ka raw-English leaks
  (deferred)" orphan-prompt entry repointed: no longer a deferred leak.
- `notes/next.md` updated: P2.1 marked done, pointer to the new gate; old
  `.uat.test.ts` references repointed.

## Non-goals

- **Zork II / III** — Zork I only (II/III stay English by design).
- **The `deferred` joke-insult tail** — listed + logged, not filled. Documented
  follow-up.
- **Georgian input (Phase 2)** — output-only; no `ka` lexicon work.
- **Disambiguation/orphan *answer* routing (P2.2 remainder)** — the
  genuinely-hard cousin: a player's reply *to* a prompt raw-sends past
  `nl.translate` (a turn-boundary/queue fix). The orphan **prompt** itself is now
  in scope (decision 7); only the **answer** routing stays a separate branch.
- **VM-replay / Playwright harness** — out; `matchLine` on committed data.
- **Native-review sign-off itself** — the worklist is the deliverable; the human
  review is the colleagues' follow-up that drops the `(beta)` marker.

## Success criterion

A Georgian player driving Zork I from West of House to a 350/350 win, using any
verb in the standard set on any in-scope object, **never sees a raw-English
composed line** (including the orphan parser prompt — decision 7) — and the gate
fails in CI the moment that stops being true.

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
