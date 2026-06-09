# Loquor NL — ZIL-derived per-game vocabulary extraction

- **Date:** 2026-06-08
- **Status:** Design (approved in brainstorming; pending spec review)
- **Branch:** `ovid/more-parser-work`
- **Companion plan:** `docs/superpowers/plans/2026-06-08-loquor-nl-vocab-extraction.md` (written; alignment-checked 2026-06-08)

## Context

The NL layer constrains the model with a per-game `Vocab` (`src/llm/grammar/types.ts`)
that feeds both the GBNF grammar (`buildGrammar`) and — since the movement fix — the
prompt's "allowed action verbs" / "available directions" lines (`buildPrompt`). Today the
three `zork{1,2,3}.vocab.ts` files are **hand-curated and sparse**. That sparseness causes
real failures: e.g. `climb the tree` mistranslates to `close leaflet` because `climb` and
`tree` are simply absent from the Zork I vocab, so the grammar cannot express the command
and the reluctant-to-abstain 1.5B model forces a wrong in-scope action.

The canonical source of truth for each game's words is the original Infocom ZIL, present
locally in the **read-only, gitignored** `zork1/`, `zork2/`, `zork3/` directories. This
spec defines a reproducible extraction that regenerates the three vocab files from that ZIL.

## Goals

- Regenerate `src/llm/grammar/zork{1,2,3}.vocab.ts` from each game's ZIL: the **full**
  parser verb set, all prepositions/directions, and every in-game object (noun) with its
  synonyms and adjectives.
- **Strict per-game isolation:** a noun or gated verb from one game must never appear in
  another game's vocab.
- Reproducible and re-runnable via a committed generator script; the vendored ZIL dirs are
  only ever **read**, never modified.
- Fix the immediate `climb tree`-class failures as a consequence of fuller coverage.

## Non-goals

- No change to the `Vocab` type, `buildGrammar`, the scene tracker, or the compound loop. This
  is primarily a **data** change behind the existing interfaces. **One deliberate exception:**
  `buildPrompt` is amended to decouple the prompt's guidance verb list from the full grammar verb
  set (see "Grammar verbs vs. prompt verbs" below) — without it, full extraction risks regressing
  the very translation quality this spec targets.
- No change to the hand-authored runtime regex patterns (`takeAck`, `dropAck`, `absencePat`,
  `failurePat`) in `patterns.ts` — they are tuned for game *output* parsing, not vocabulary,
  and are preserved verbatim.
- No semantic pruning of verbs to "useful in this game" (explicitly rejected: we take the
  full shared parser set, gated by `ZORK-NUMBER`).
- No few-shot/corpus changes (`zork*.corpus.ts` are out of scope).

## Locked decisions (from brainstorming)

1. **Full verb extraction** — the complete parser verb set per game (not a curated subset)
   feeds the **grammar** (full validity). The **prompt** surfaces a smaller common-verb core as
   guidance (revised during spec review — see "Grammar verbs vs. prompt verbs"); the grammar, not
   the prompt, is the hard gate.
2. **All three games** in this pass.
3. **Per-game verb gating** — honor `<COND (<==? ,ZORK-NUMBER N> …)>` so game-specific
   verbs land only in the right game.
4. **Generator script** (committed, re-runnable) produces committed `vocab.ts` files.

## Source-of-truth findings (verified against the ZIL)

- `gsyntax.zil` is a **shared trilogy file** (zork2's and zork3's are byte-identical; zork1's
  differs slightly). It defines verbs/preps/directions for all three games, separating
  game-specific rules with `<COND (<==? ,ZORK-NUMBER 2> …) (<==? ,ZORK-NUMBER 3> …)>` and
  `<COND (<N==? ,ZORK-NUMBER 3> …)>` blocks. Each game sets its number (`zork1.zil:
  <SETG ZORK-NUMBER 1>`).
- `gverbs.zil` is **also shared**: every `V-ACTION` routine (even `V-INFLATE`, `V-INCANT`)
  exists in all three games, so "is the routine defined" is *not* a usable per-game filter.
  Per-game verb differences come **only** from the `ZORK-NUMBER` gates in `gsyntax.zil`.
- **Nouns are genuinely per-game**: objects live in each game's own `Ndungeon.zil` (Zork I:
  110 `<ROOM …>`, 120 `<OBJECT …>`) plus ~18 shared globals in `gglobals.zil`. This is the
  primary infection vector, and it is isolated by construction.
- **SYNTAX shapes** (`gsyntax.zil`):
  - `<SYNTAX VERB = V-…>` → verb-only.
  - `<SYNTAX VERB [particle] OBJECT (flags) = V-…>` → one-object verb (`verbs1`); a word
    between the verb and `OBJECT` is a **particle** → multiword verb (`climb up`, `blow out`,
    `look under`).
  - `<SYNTAX VERB [particle] OBJECT prep OBJECT (flags) = V-…>` → two-object verb (`verbs2`);
    the word between the two `OBJECT`s is the preposition (`cut OBJECT with OBJECT`).
  - `(…)` groups after objects are parser flags — skipped. Tokens after `=` are action
    routines — ignored for vocabulary.
  - `<SYNONYM ATTACK FIGHT HURT INJURE HIT>` → verb synonyms; collapse to the canonical
    (first token).
- **OBJECT shape** (`Ndungeon.zil`, `gglobals.zil`):
  `<OBJECT TREE (SYNONYM TREE BRANCH) (ADJECTIVE LARGE STORM) (DESC "tree") (FLAGS …)>` →
  canonical = `DESC` text; synonyms = `SYNONYM` tokens (lowercased) minus the canonical;
  adjectives = `ADJECTIVE` tokens (lowercased). `<ROOM …>` blocks are **excluded**.

## Architecture

### Generator script — `scripts/extract-vocab.mjs`

A standalone Node ESM dev tool (run via `node` / a `make` target; not part of the app build).
For each game `N ∈ {1,2,3}`:

1. **Read** that game's ZIL from `zorkN/` (read-only) by **exact filename, never a glob**:
   `gsyntax.zil`, `<N>dungeon.zil` (`1dungeon.zil` / `2dungeon.zil` / `3dungeon.zil`), and
   `gglobals.zil`. **Note:** `zork3/` also ships a stale `dungeon.zil` (950 lines, missing the
   `WATER` object and others) alongside the canonical `3dungeon.zil` (960 lines, the one
   `zork3.zil` actually `<INSERT-FILE "3DUNGEON">`s) — a `*dungeon.zil` glob would read both and
   corrupt the Zork III nouns, so the source filename is pinned per game.
   `gverbs.zil` is **intentionally not read**: gating is purely `gsyntax.zil`'s `ZORK-NUMBER`
   conditionals, and "is the routine defined" is not a usable per-game filter (see findings), so
   `gverbs.zil` contributes nothing to extraction.
2. **Tokenize ZIL forms** with a small bracket-aware scanner (it does not need a full ZIL
   interpreter — only to walk `<…>` forms, `(…)` groups, and `"…"` strings).
3. **Resolve `ZORK-NUMBER` conditionals**: when entering a `<COND …>`, include only the
   branch whose predicate (`<==? ,ZORK-NUMBER k>` / `<N==? ,ZORK-NUMBER k>`) is true for `N`.
4. **Collect**:
   - `movement` — from that game's **own** `<DIRECTIONS …>` declaration in `Ndungeon.zil`
     (per-game: Zork I = `NORTH EAST WEST SOUTH NE NW SE SW UP DOWN IN OUT LAND`; II/III add
     `CROSS`), normalized to full names via a fixed abbreviation map (`ne`→`northeast`,
     `nw`→`northwest`, `se`→`southeast`, `sw`→`southwest`). (`enter`/`exit` remain verb-only
     verbs, matching their `V-ENTER`/`V-EXIT` syntax.)
   - `verbsOnly` — `<SYNTAX VERB = V-…>` canonicals, **minus the meta set** (display/session
     verbs that bypass the model). **The meta set MUST be a single shared source of truth** —
     export the `META_COMMANDS` set from `translate.ts` (or a small shared module) and have the
     generator import the *same* set it subtracts. Otherwise any verb in
     `(excluded-from-verbsOnly ∖ META_COMMANDS)` falls through a crack: it is unexpressible by
     the grammar **and** not bypassed by `isMetaCommand`, forcing the reluctant-to-abstain 1.5B
     into a wrong in-scope action — the exact failure class this spec exists to kill.

     Two casualties exist today and MUST be handled explicitly, not silently dropped:
     - `inventory` is a legitimate player-typed command (`<SYNTAX INVENTORY = V-INVENTORY>`,
       `<SYNONYM INVENTORY I>`) and is **not** in the current `META_COMMANDS`. It must stay in
       `verbsOnly` (do **not** add it to the excluded set), or be added to `META_COMMANDS` — but
       not removed from both. Keep it emittable.
     - `again` (`g`/"repeat") is in today's hand-curated `verbsOnly` but has **no** `<SYNTAX
       AGAIN …>` rule (it is parser-internal), so the generator will not produce it, and it is
       not in `META_COMMANDS`. Add it back to `verbsOnly` manually (a documented post-extraction
       supplement) or to `META_COMMANDS`.

     The generator MUST emit a **reconciliation diff** at the end of each run:
     verbs present in the current committed `verbsOnly` but absent from the generated output, and
     any verb in `(excluded ∖ META_COMMANDS)`. The diff is reviewed before committing so a
     regression of this class is visible, never silent. The `$verify` / `#…` / `$…` debug verbs
     are excluded from the grammar (desired) and are never player-typed, so their absence from
     `META_COMMANDS` is harmless.
   - `verbs1` / `verbs2` — per the SYNTAX shapes above, with multiword particles preserved.
   - `preps` — the prep `<SYNONYM WITH …>` block **canonicals** (the first token of each prep
     SYNONYM block: `with`, `in`, `on`, `under` in `gsyntax.zil:20-23`) **plus** any preposition
     observed between two `OBJECT`s (adds `to` from rules like `APPLY OBJECT TO OBJECT`). Reading
     the SYNONYM blocks (not only inter-object usage) is what keeps a declared-but-particle-only
     prep like `under` ("look under") from being dropped. Note `through`/`thru` are synonyms *of*
     `with` inside `<SYNONYM WITH USING THROUGH THRU>`, so they collapse to `with`, not separate
     preps — matching the current committed `['with','in','on','to','under']`.
   - `nouns` — every `<OBJECT …>` in `Ndungeon.zil` + `gglobals.zil`, mapped to
     `{ canonical, synonyms?, adjectives? }`. Skip pseudo-globals with no usable surface form
     (no `DESC` and no `SYNONYM`, e.g. parser sentinels like `NOT-HERE-OBJECT`).
5. **Dedupe & sort** each list deterministically (so re-runs produce stable diffs).
6. **Emit** `src/llm/grammar/zorkN.vocab.ts`: a typed `Vocab` literal that re-imports the
   unchanged `TAKE_ACK`/`DROP_ACK`/`ABSENCE_PAT`/`FAILURE_PAT` from `./patterns`, with a
   header comment marking the file generated and naming the script + source.

The script is invoked manually (or via a `make extract-vocab` target) to regenerate; the
**committed artifacts** are the three `vocab.ts` files. Downstream developers and the app
never need the ZIL.

### Per-game isolation (the guarantee)

- Nouns are read only from `zorkN/`'s own dungeon/globals → no cross-game nouns.
- Verbs/preps/directions come from the shared `gsyntax.zil` evaluated **with `ZORK-NUMBER = N`**
  → gated verbs are correctly partitioned; the shared (ungated) verbs are faithfully shared,
  as in the original parser.
- Three independent output files → three independent grammars/prompts; no shared mutable data.

### Grammar verbs vs. prompt verbs (decoupled)

`Vocab` feeds two distinct consumers with different needs:

- **`buildGrammar`** *constrains* output — it gets the **full** extracted verb set, so any valid
  command (e.g. `climb tree`) is expressible. This is the headline fix.
- **`buildPrompt`** *guides* the model — today it inlines `verbsOnly + verbs1 + verbs2` as the
  "Allowed action verbs (use ONLY these…)" line on **every** inference. After full extraction
  that list grows to ~130 entries (including oddities like `climb with`, `look behind`). For a
  quantized 1.5B model, a 130-item "choose only from these" list is a known way to *degrade*
  selection accuracy.

Therefore the two are decoupled: the grammar enforces the full set (validity), while the prompt
lists a **smaller common-verb core** as guidance. The model may still emit any grammar-valid
verb — the prompt is guidance, not a hard gate; the grammar is the gate. Implementation: a
bounded prompt-verb list (e.g. the curated common core, or a capped slice) consumed by
`buildPrompt`, leaving the grammar to read the full lists. This pulls the previously
out-of-scope "trim the prompt verb list" follow-up into scope, because it is the same risk that
threatens this PR's own success metric.

## Testing

TDD throughout. The generator's parsing helpers are pure (string → data) and unit-tested
in isolation; the generated output is asserted against known facts.

**Parser unit tests** (representative ZIL snippets as string inputs):
- a verb-only rule → `verbsOnly`; a meta rule (`SAVE`) → excluded.
- a one-object rule → `verbs1`; a particle rule (`CLIMB UP OBJECT`) → `verbs1` `"climb up"`.
- a two-object rule (`CUT OBJECT WITH OBJECT`) → `verbs2` `"cut"` + prep `with`.
- a `<COND (<==? ,ZORK-NUMBER 2> <SYNTAX KILL OBJECT …>)>` → `kill` present for N=2,
  **absent** for N=1 (the anti-infection assertion).
- an `<OBJECT>` with `SYNONYM`+`ADJECTIVE`+`DESC` → correct `{canonical, synonyms, adjectives}`;
  a `<ROOM>` block → ignored.
- direction-synonym normalization (`nw`→`northwest`).

**Generated-output assertions** (against the committed files):
- Zork I `nouns` includes `tree` (synonym `branch`, adjectives `large`/`storm`) and `window`;
  `verbs1` includes `climb`.
- A Zork II-only gated verb is **absent** from Zork I's vocab (cross-game isolation).
- Each game's `movement` contains the eight compass directions + `up`/`down`.
- **`inventory` is still emittable** (present in `verbsOnly` or in the shared `META_COMMANDS`,
  never in the gap between them) — the anti-fall-through assertion for Issue 1.
- **Zork III sourced from `3dungeon.zil`, not the stale `dungeon.zil`:** Zork III `nouns`
  includes `water` (present only in `3dungeon.zil`) — fails loudly if the wrong file is read.
- **Reconciliation diff is empty/reviewed:** no verb in the current committed `verbsOnly` is
  silently absent from the regenerated output without an explicit decision.
- **Prompt-verb core stays bounded:** `buildPrompt`'s "allowed verbs" line uses the small core,
  not the full ~130-verb set (Issue 2).

**Regression:** the existing `buildGrammar`, `prompt`, scene-tracker, and hook test suites
must stay green against the regenerated vocab (run `make all`). Where an existing test pinned
a hand-curated value that legitimately changed, update the test to the new generated value
(documenting why), never the reverse.

## Verification (live)

After regeneration, re-run the console experiment harness (`src/llm/experiment.ts`) and a live
session: `climb the tree` at *Forest Path* should now translate to `climb tree` (expressible
via the grammar) instead of forcing `close leaflet`. The temporary `experiment.ts` can then be
deleted along with the other TEMP NL diagnostics.

## Risks & mitigations

- **Prompt/grammar bloat from ~130 verbs** (Ovid accepted full extraction). Risk: the 1.5B
  picks wrong verbs more often. Mitigation: measurable via the experiment harness; if quality
  regresses we revisit the "trim prompt only" option as a follow-up (out of scope here).
- **ZIL parsing edge cases** (nested `<COND>`, macros, `%<COND …>` read-time conditionals,
  multi-line forms). Mitigation: the scanner is bracket-aware and tested on real snippets;
  any form it cannot classify is logged and skipped (never silently miscategorized), and the
  log is reviewed before committing the generated files.
- **Non-determinism** producing noisy diffs. Mitigation: sort + dedupe all output lists.
  Deterministic *ordering* is not enough — the committed artifacts are `.ts` files and the repo
  gates on `make all` (which runs **format**). The generated source MUST be **Prettier-canonical**
  so a fresh regenerate is a no-op diff: either the generator runs its emitted output through the
  project's Prettier config as its final step, or `make extract-vocab` chains into `make format`
  and the committed file is the post-format output. A test asserts the committed files are
  Prettier-clean (regenerate + format yields no diff), so formatter drift can't silently break the
  re-runnability guarantee.

## Out of scope / follow-ups

- ~~Trimming the prompt's verb list to a digestible core (deferred per decision 1).~~ **Pulled
  into scope** — see "Grammar verbs vs. prompt verbs (decoupled)"; the grammar takes the full set
  but the prompt's guidance list stays a small core.
- Scene-tracker rehydrate-on-reload and the pronoun-antecedent wobble (tracked separately in
  the NL deferred-followups notes).
