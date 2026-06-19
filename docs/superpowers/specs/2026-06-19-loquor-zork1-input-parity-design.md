# Loquor — Zork I input parity for fr/de/es (design)

**Date:** 2026-06-19
**Branch:** `ovid/zork1-input-parity`
**Status:** design, pending implementation plan

## Goal

Make **Zork I genuinely completable in French, German, and Spanish without ever
secretly switching to English** — by fixing the input-NL bugs that mis-map
puzzle-critical commands, repairing the two garbled disambiguation prompts, and
making the quoted-English escape hatch discoverable. Georgian (`ka`) rides along
for the **output-side** pieces only (display text); its *input* layer is Phase 2
and out of scope.

This implements the `notes/next.md` recommended slice (P1.1 + P2.2 + P3).

## Scope

In scope:

- **P1.1** — input puzzle-verb bugs (`src/llm/lexicon/`), **blocking + friction**
  tiers, for **fr/de/es**.
- **P2.2** — the two garbled disambiguation templates (`src/translate/corpus/`),
  for **fr/de/es + ka**.
- **P3** — passive escape-hatch signposting (localized `help` command, one-time
  activation notice, input placeholder hint), for **fr/de/es + ka (output text
  only)**.

Explicit non-goals (deferred, with reasons):

- **P1.1 cosmetic tier** — `libro`→page, `oro`→pot, `subir` flakiness. They
  mis-map but the Z-parser resolves them correctly anyway, so no player ever
  fails a command. Logged as a follow-up.
- **Georgian input (P1.2)** — `ka` is OUTPUT-ONLY Phase 1 (no input lexicon, no
  input LLM, raw-sends English). Per CLAUDE.md, input-side changes "must not be
  wired into `ka` until Phase 2." Georgian native input is its own large branch
  with its own spec/plan.
- **Driven fr/de browser UAT catalogues** — fr/de are handled by *analytical
  cognate reasoning + unit pins*, not full browser playthroughs. Building
  complete driven fr/de catalogues (like the es one) is a separate effort that
  would uncover language-specific bugs this branch cannot predict.
- **P2.1 composed-line gate, P2.3 anaphora** — separate backlog items.

## Background: the cross-language asymmetry

The same player intent fails differently per language, so "fix it in all three"
(CLAUDE.md) means *three different mechanisms*, not one shared patch. The
songbird "wind up the canary" puzzle is the canonical example:

| Lang | Surface | Mechanism |
| ---- | ------- | --------- |
| fr   | `remonte le canari` | single verb `remonte` → `wind up` — **already works**; this branch only pins it |
| es   | `dar cuerda al canario` | **periphrastic idiom** `dar cuerda a` → `wind up` (literal = "give rope to") |
| de   | `zieh den kanarienvogel auf` | **separable particle verb** `zieh … auf` → `wind up` |

So a fix authored against es alone would silently leave de broken (and vice
versa). Every P1.1 fix below is reasoned per language.

## P1.1 — Input puzzle-verb fixes (fr/de/es)

The work-list is the **Spanish INPUT-NL bug catalogue** in `notes/uat.md`
(UAT-es-3/UAT-es-4). For each es bug, apply the fix and reason about the fr/de
cognate.

> **Ground truth (characterized 2026-06-19 against the shipping lexicons).** The
> 2026-06-15 catalogue is stale: several items are **already fixed**, and the
> remaining bugs are almost all **es-only** (fr/de already pass). Specifically:
> - **Already fixed:** the conjoined+trailing-prep case (`splitClauses` handles
>   Spanish `y`; `distributePrepTail` distributes the destination), `apaga`→
>   `extinguish`, and the `bote`→bottle false friend (`bote` maps to boat, not
>   bottle). These need **regression pins only**, not fixes.
> - **The single genuine code change is no longer the conjoined case** — it is
>   **Spanish personal-`a` stripping** in `parse.ts` (the combat slot).
> - fr/de already pass songbird, `echo`, boat-exit, and quantifier-all, so their
>   tasks are **verification pins**, not fixes.

The fix surface is **mostly data** (lexicon/idioms) with **one genuine parser
change** (personal-`a`).

### Blocking bugs (puzzle unsolvable without quoted-English)

| Bug | es fix | fr | de | Location |
| --- | ------ | -- | -- | -------- |
| **Songbird** `da cuerda al canario` → "give rope to canary" | idioms `da/dale cuerda a` exist but `al` (a+el) defeats them — add `al`/`a la` idiom variants | already `remonte`✓ (pin only) | already `zieh…auf`✓ (pin only) | `es.core.ts` verbIdioms |
| **Boat false-friend** | **already fixed** — `bote`→`magic boat`/`punctured boat` (not bottle). Pin only | verify `bateau` | verify `boot` | — |
| **Boat exit** `sal del bote` → `miss` | `sal`→exit already works; treat `del` as a strippable **article** (mirrors fr `du`) | already `sors du bateau`✓ (pin) | already `steig aus dem boot`✓ (pin) | `es.core.ts` articles |
| **Loud Room** `eco` → `miss` | verb `eco` → `echo` | already `echo`✓ (pin) | already `echo`✓ (pin) | `es.core.ts` verbs |
| **Combat weapon slot** `mata al ladron con el cuchillo` → `miss` | **the one code change**: strip the leading personal-`a`/`al` in the prep-split object span (extend the existing `parse.ts:270-283` block); `cuchillo` then resolves via scene scope to `rusty knives` | cognate (verify) | cognate (verify) | `parse.ts` |
| **Conjoined + trailing prep** `mete X y Y en Z` | **already fixed** — pin only on the `inputTranslate.ts` surface (spec N3) | verify | verify | `inputTranslate.ts` (pin) |

### Friction bugs (a natural command fails; in-language workaround exists)

The complete, closed list (no "etc." — `notes/uat.md`'s trailing items resolved
into this set; each carries a ×3 per-language cognate check):

1. `apaga` — **already fixed** (`apaga: 'extinguish'` ships); regression-pin only.
2. `deja todo` → `miss` — ES_CORE has no `quantifiersAll` (fr/de do); add it.
3. `abre/cierra la tapa` → `miss` — `tapa` (the diamond-machine lid) absent. **`lid`
   is NOT a canonical** — it is a synonym of canonical `machine`, so `tapa` maps
   to `machine` and emits `open/close machine`.
4. `coge el jade` → `miss` — `jade` surface absent; maps to `jade figurine` (emit
   `figurine`).
5. `coge la calavera de cristal` → `miss` — only `craneo de cristal` is mapped; add
   `calavera de cristal` to `crystal skull` (emit `skull`).
6. **`sube la cesta` → `climb cage` — DEFERRED out of this branch (Ovid sign-off,
   2026-06-19).** `sube` bare = go up/climb, so a context-free `sube`→raise would
   break navigation; an arity-conditional sense is fragile. `levanta la cesta`→
   `raise cage` works as the in-language path. Logged as a follow-up in
   `notes/next.md`.

Items 2–5 are one-line lexicon additions; each still gets the fr/de cognate
check. CLAUDE.md treats a failing *natural* command as player harm, so these are
in scope.

### Known implementation wrinkle: fused prepositions (resolved)

Spanish `al`/`del` are fused `a+el`/`de+el` single tokens, and both songbird and
boat-exit hinge on them:

- **Songbird:** the idioms `da cuerda a` / `dale cuerda a` already ship, but the
  player types `da cuerda **al** canario`, and `al` is one token the literal `a`
  never matches (`da cuerda a la canario` → `wind up canary` ✓ proves the
  mechanism). **Resolution: add `al`/`a la` idiom variants** (`da cuerda al`,
  `dale cuerda al`, …).
- **Boat-exit:** `sal`→exit ships, but `del` was deliberately unhandled (the
  `es.core.ts` comment warned of a personal-`a` collision). **Resolution: treat
  `del` as a strippable article**, mirroring fr's `du` (`fr.core.ts` lists `du`
  in *articles*, not preps, so `sors du bateau`→`exit raft`). This sidesteps the
  prep-split/personal-`a` hazard. Known ceiling: stripping `del` also drops the
  "from the" genitive (`coge la llave del cajon`); fr accepts the identical
  ceiling for `du`, and the boat-exit win outweighs the rare genitive in Zork.

fr/de already pass both (verified) — fr `remonte`/`sors du bateau`, de
`zieh…auf`/`steig aus dem boot` — so this is es-only.

### Combat weapon-slot: the one genuine parser change (diagnosed)

`coge el cuchillo`→"take nasty knives" is already correct (object slot), and
`ataca al troll`→`attack troll` **already works** (the existing personal-`a`/
leading-`to` block at `parse.ts:270-283` fires when the whole post-`a` remainder
resolves as one noun). The combat slot misses *only* because an instrument
follows: `mata al ladron con el cuchillo` can't use that whole-remainder block,
so it falls to the **prep-split branch** (`parse.ts:287`), which resolves the
object span `[al, ladron]` and fails — `al` isn't stripped there.

**Fix: strip a leading personal-`a`/`al` from the prep-split object span**,
reusing the existing block's concept (not a duplicate top-level strip). `cuchillo`
then resolves via scene scope to `rusty knives` (its emit is plural). Guarded to
`a`/`al`; fr `au`/`aux` and German are untouched.

### Conjoined + trailing prep: already works — pin only

`mete la antorcha y el destornillador en la cesta` → `put torch in cage` +
`put screwdriver in cage` ✓ (characterized through the real pipeline).
`splitClauses` handles Spanish `y`; `fillElidedVerbs` distributes the verb;
`distributePrepTail` (written for the German F16 `lege A und B in die Vitrine`)
distributes the destination. **No fix needed.** But the spec's N3/DoD requires a
regression pin, and there is currently none anywhere in `src/` — so add a pin on
the `inputTranslate.ts` surface (it must drive `splitClauses`→`fillElidedVerbs`→
`distributePrepTail`; a `parse.*-uat` pin can't reach the clause-split path). If
that pin unexpectedly fails, the "already fixed" claim is wrong and the debug
task is live.

### Regression pins (the forcing function)

- Single-clause bugs (songbird, boat false-friend, `eco`, combat slot, the
  friction set) → new `src/llm/lexicon/parse.es-uat.test.ts` and
  `parse.fr-uat.test.ts` (+ append to `parse.de-uat.test.ts`), mirroring the
  existing de pin-file. Pure `parse()` assertions, no browser.
- The **conjoined + trailing prep** bug exercises the multi-clause pipeline, so
  its pin goes to the `inputTranslate.ts` test surface
  (`src/llm/inputTranslate.test.ts` or a new `inputTranslate.es-uat.test.ts`) —
  a `parse.*-uat` pin would not exercise the clause-split path at all.

Each blocking/friction bug → one pinned assertion (foreign input → expected
canonical). A regression that re-breaks any of these fails `make test`.

### Escape-hatch passthrough pins (ties P1.1 to P3)

The P3 signpost is only honest if the quoted-English workaround it advertises
actually works for the exact commands that need it. Pin the passthrough of each
blocking bug's documented workaround → correct canonical: `"wind up canary"`,
`"enter boat"` / `"launch"` / `"get out of boat"`, `"echo"`, `"kill thief with
knife"`. These guarantee the signposted hatch lets the player finish even if a
native fix regresses.

## P2.2 — Disambiguation templates (fr/de/es + ka)

**Correction from the v1 draft:** these two templates are NOT garbled existing
templates — they are **absent from all four corpora** (only `Which book do you
mean, the {obj} or the {obj2}?` exists). So at runtime they fall back to the LLM
(fr/de/es) or leak **raw English** (`ka`, which is corpus-only with no LLM). The
es artifacts in `notes/uat.md` — the structurally-wrong `¿Qué quieres poner la
cera?` and the `tesones` plural — are **LLM-fallback output of an absent
template**, not defects in an existing string (the note itself records that the
line "ALSO logs a miss because the raw EN disambig line isn't a corpus string").
The leak therefore affects *every* language; `ka` is merely worst (no fallback).

The two lines to **author** as new templates:

1. `What do you want to put the {obj} in?` (the incomplete-`put` object prompt).
2. `Which of the {obj}s do you mean?` (the multi-candidate prompt; the es LLM
   fallback mis-pluralized it as `tesones`).

Add both to `zork1.{es,fr,de,ka}.templates.ts` with correct `{obj}`-slot and
plural handling per language. Pin in `zork1.{es,fr,ka}.uat.test.ts`; de has no
`.uat.test.ts` (see Testing/DoD N4) so its assertion goes to the corpus
completeness suite.

### Georgian caveat (native-review track) — verifiable, not smuggled

Georgian noun **case forms inside templates** are a known hard problem — it is
*why* `ka` has so few templates, and last branch's `ka` additions had to
drop/rephrase object names to dodge it (the §4 case issue). The branch's whole
forcing function is "every change pinned, a regression fails `make test`," and an
unverifiable hand-authored Georgian string would break that contract. So:

- This branch ships the `ka` **plumbing** with confidence: the template *keys*
  present (no raw-English leak), the `help` intercept wired for the English
  `help` trigger, the "type in English" notice/placeholder routing.
- Any `ka` template/help **text** whose correctness can't be verified here is a
  **native-review draft**, and is enforced — not merely "marked in-file." Each
  such line carries a `// NATIVE-REVIEW-DRAFT (ka §4 case forms)` marker, and a
  test asserts the marker is present on every provisional `ka` line so a draft
  cannot silently be treated as finalized. Removing the marker (after native
  review) is the explicit hand-off.
- The text correctness itself is tracked in
  `notes/georgian-native-review-followup.md` (native review BLOCKS the `(beta)`
  marker); it does not block this branch, because what this branch *asserts* is
  presence + the draft marker, not Georgian correctness.

## P3 — Passive escape-hatch signposting

The escape hatch (wrap an un-translated command in quotes: `"wind up canary"`)
is undiscoverable today. Make it **passively discoverable** — no per-turn
failure detection. (Failure detection was rejected: the worst bugs translate to
a *valid command the game accepts but that does the wrong thing*, so there is no
error line to catch, and detection would require fragile per-language matching of
game error output.)

The passive signposts front-load disclosure to *before* the player hits a wall
(the one-time notice can scroll away; the placeholder gets tuned out). That's
accepted: the on-demand `help` command is the durable recovery, and the
escape-hatch passthrough pins above guarantee the advertised commands actually
work — so a player who reaches `help` can always finish. **P3.1 (the `help`
intercept) is the heaviest single item in this branch** — routing + content
authored in 4 languages + the native-help audit (S3) + a11y — not a one-liner
like the lexicon edits; size the plan accordingly.

Three pieces:

1. **Localized `help` command.** A new Loquor-level intercept (sibling to meta
   routing in `src/llm/inputTranslate.ts`) triggered by the localized aliases
   `ayuda` / `aide` / `hilfe`. It renders a localized transcript block listing the
   meta-commands with their per-language equivalents **plus** the quoted-English
   escape-hatch explanation (naming the *specific* high-value escape commands —
   `"wind up canary"`, `"enter boat"`, `"echo"`, `"kill thief with knife"` — not
   just the generic "wrap in quotes" rule, per S5). Announced via the existing
   aria-live notice region.
   - **Audit native help first (player-experience gate).** `help` is NOT in
     `META_COMMANDS` today, so it currently reaches Zork and prints Zork's own
     `HELP`/`INFO` output. Before overriding it, the plan MUST read what Zork I's
     native help actually contains and either fold the useful parts into the
     localized block or document precisely what is dropped and confirm it's not
     player-valuable. Per CLAUDE.md this override is a "talk to me first"
     player-experience decision, not self-approved.
   - **English-mode stays native.** When the picker is English (or off), `help`
     passes through to Zork unchanged — an English player gets no localization
     benefit from shadowing native help. Only the localized aliases (and, for
     `ka`, the English word `help`) intercept.
   - For `ka`: the trigger is the English word `help` (no input alias — `ka` has
     no lexicon); the block is **Georgian text** whose content is "type commands
     in English," **not** the quoted-English fallback message (a `ka` player
     already types English).
2. **One-time activation notice.** When a language is picked, reuse the existing
   one-time-notice mechanism (`src/llm/notices.ts`) to surface the escape-hatch
   hint once. (For `ka`: the "type in English" message.)
3. **Input placeholder hint.** A localized hint on the command field that quoted
   English works as a fallback. (For `ka`: "type in English".)

### Task 10 — native-help audit (zork1 ground truth)

**Headline finding: Zork I has NO `help`, `info`, or `commands` verb. There is
no native help content to drop.** The spec premise above (lines ~261–263: "`help`
… currently reaches Zork and prints Zork's own `HELP`/`INFO` output") is
**incorrect** and should be read with this correction. Overriding `help` for
fr/de/es/ka removes *nothing player-valuable* — it replaces an error message.

What actually happens today, verified against the vendored read-only source
`/workspace/zork1/*.zil`:

- **`help` / `info` / `commands` are not in the vocabulary.** No `<SYNTAX HELP …>`,
  `<SYNTAX INFO …>`, no `V-HELP`/`V-INFO`/`V-COMMANDS` routine, and they are not
  buzzwords (`gsyntax.zil:9,11`). Typing `help` falls through the parser to the
  unknown-word path and prints:

  > `I don't know the word "help".`

  (`gparser.zil:670-673`.) Same for `info`. So the localized override *improves*
  on the status quo for fr/de/es/ka — and the English-stays-native rule (line 268)
  means English players keep that same `I don't know the word "help"` behavior,
  which is the current behavior, no regression.

- **`commands` is a near-miss, not help.** There IS a `COMMAND` verb
  (`gsyntax.zil:142` → `V-COMMAND`, `gverbs.zil:359`), but it is the *in-world*
  "order a creature to do something" verb (e.g. `thief, give me the egg`), not a
  meta listing of commands. The bare word `commands` (plural) is not that verb and
  prints the unknown-word error. Nothing to fold.

What Zork I DOES provide, behind *other* verbs the localized block should name so
players can reach it (none of this is lost — these verbs keep working; the audit
only confirms the block lists them):

- **`version`** (`<SYNTAX VERSION = V-VERSION>` `gsyntax.zil:67`, routine
  `gverbs.zil:98-121`) — prints the title/credits/release banner:

  > `ZORK I: The Great Underground Empire`
  > `Infocom interactive fiction - a fantasy story`
  > `Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.`
  > `ZORK is a registered trademark of Infocom, Inc.`
  > `Release <N> / Serial number <NNNNNN>`

- **`$verify`** (`<SYNTAX $VERIFY = V-VERIFY>` `gsyntax.zil:69`, routine
  `gverbs.zil:123-128`) — disk-integrity check, prints `Verifying disk...` then
  `The disk is correct.` / `** Disk Failure **`.

- **`score`** (`gsyntax.zil:61` → `V-SCORE` `1actions.zil:4026-4044`) — e.g.
  `Your score is 25 (total of 350 points), in 42 moves. This gives you the rank of
  Amateur Adventurer.`

- **`diagnose`** (`gsyntax.zil:47` → `V-DIAGNOSE` `1actions.zil:3993`) — health.

- **`save` / `restore` / `restart` / `quit`** (`gsyntax.zil:52-59`) — the standard
  meta verbs.

#### Dropped-items list + per-item recommendation

Because there is no native help text, nothing is dropped by the override itself.
The audit question becomes: which of the verbs above should the localized help
block *name* so a fr/de/es/ka player can reach them. Per item:

| Item | Native? | Recommendation |
|------|---------|----------------|
| Zork native `help`/`info`/`commands` text | **none exists** (unknown-word error) | **Acceptable drop** — there is nothing to drop. Override is strictly an improvement. |
| `score` / `diagnose` (scoring + in-world health) | yes, via own verbs | **Fold reference into block** — list these meta-commands (already planned: "meta-commands with their per-language equivalents"). Not lost, but the block is where a non-English player learns they exist. |
| `save` / `restore` / `restart` / `quit` | yes, via own verbs | **Fold reference into block** — these are the durable-progress commands; a non-English player must be told the localized words for them. Most player-valuable item to include. |
| `version` (title/credits/release) | yes | **Acceptable to omit from block, but cheap to list** — recommend a one-line mention; low value mid-play but it is the only way to read release/serial. |
| `$verify` (disk integrity) | yes | **Acceptable drop from block** — a 1980s floppy-integrity check, meaningless for a browser story file loaded from `public/games/`. Not player-valuable here; omit. |
| In-world `command` verb (`thief, give me…`) | yes (different verb) | **Not help** — leave alone; it is real gameplay, unaffected by the `help` intercept. |

**NEEDS OVID DECISION:** none. Nothing player-valuable is silently lost — the
override replaces an `I don't know the word "help"` error, and the genuinely
useful meta-verbs (`save`/`restore`/`restart`/`quit`/`score`/`diagnose`) survive
and are *recommended for inclusion* in the localized block (they were already in
scope as "meta-commands with per-language equivalents"). The decision is therefore
self-approvable under the "clear, low-risk, unambiguously pro-player" clause.

**For the next task (P3.1 implementer):** fold into the localized help block, with
per-language equivalents, at minimum: `save`, `restore`, `restart`, `quit`,
`score`, `diagnose` (and ideally `look`/`inventory`/`verbose`/`brief`). One-line
mention of `version` is nice-to-have. Skip `$verify`. Keep the quoted-English
escape-hatch examples as already specified. For `ka`, the block stays "type
commands in English" with the same meta-command list (English words, since `ka`
raw-sends English).

### Accessibility

Per CLAUDE.md (a11y is a hard requirement): any new control gets an accessible
name/role test (`getByRole(... { name })`), the help block and notices reach
assistive tech via the existing `aria-live` region, and nothing relies on colour
alone. No new fixed-position overlays.

## Testing / definition of done

- `make all` green (lint + format + typecheck + test).
- Single-clause P1.1 bugs pinned in `parse.{es,fr,de}-uat.test.ts`; the
  conjoined+prep bug pinned on the `inputTranslate.ts` test surface (N3 — a
  `parse.*-uat` pin would never reach the multi-clause path).
- Escape-hatch passthrough of each blocking bug's quoted-English workaround
  pinned (the P1.1 "passthrough pins" set).
- P2.2 templates pinned in `zork1.{es,fr,ka}.uat.test.ts`. **de has no
  `.uat.test.ts` by design** (its UAT is analytical-cognate, per non-goals), so
  its de assertion goes to the corpus completeness suite — a deliberate
  asymmetry, not an omission.
- `ka` provisional template/help lines carry the `NATIVE-REVIEW-DRAFT` marker,
  and a test asserts the marker's presence (S4).
- P3: help-block content, activation notice, placeholder, and a11y name/role
  tests, for fr/de/es + ka.
- Manual responsive checklist **not** required: P3 reuses existing components
  (notice region, command input) and is not expected to touch
  `src/ui/landing.css` or `src/ui/components.css`. If the placeholder/notice work
  ends up touching either file, run the spec's manual checklist (320/375/520px +
  short landscape, both themes).

## Out-of-scope follow-ups to log

- P1.1 cosmetic tier (`libro`→page, `oro`→pot, `subir` flakiness).
- Driven fr/de browser UAT catalogues.
- Georgian native review of the new `ka` draft template/help lines.
- Georgian input (Phase 2, P1.2).

## Cross-references

- `notes/next.md` — the slice this implements (P1.1 + P2.2 + P3).
- `notes/uat.md` — the Spanish INPUT-NL bug catalogue (the P1.1 work-list) +
  testing technique.
- `src/llm/lexicon/parse.de-uat.test.ts` — the pin-file pattern to mirror.
- `src/translate/corpus/zork1.{es,fr,de,ka}.templates.ts` — P2.2 surface.
- `src/llm/inputTranslate.ts`, `src/llm/notices.ts` — P3 surface.
- `notes/georgian-native-review-followup.md` — the `ka` native-review gate.
- CLAUDE.md — the multilingual "fix in one = fix in all" rule and the
  input-excludes-`ka` / output-includes-`ka` split.
