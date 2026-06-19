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
cognate. The fix surface is **mostly data** (lexicon/idioms) with **one genuine
parser change**.

### Blocking bugs (puzzle unsolvable without quoted-English)

| Bug | es fix | fr | de | Location |
| --- | ------ | -- | -- | -------- |
| **Songbird** `dar cuerda al canario` → "give rope to canary" | idiom `dar cuerda a` → `wind up` | already `remonte`✓ (pin only) | particle verb `zieh…auf` → `wind up` | `es.core.ts` verbIdioms / `de.core.ts` particleVerbs |
| **Boat false-friend** `bote`→bottle | add `bote`→boat canonical; scene-scope disambiguates vs bottle | verify `bateau` | verify `boot` | `*.zork1.ts` |
| **Boat exit** `sal del bote` → "move raft" | verb `sal`/`salir` → `exit` (+ verify enter/launch) | cognate | cognate | `*.core.ts` |
| **Loud Room** `eco` → "look" | verb `eco` → `echo` | `écho` | `echo` | `*.core.ts` verbs |
| **Combat weapon slot** `mata … con el cuchillo` → wrong weapon (stiletto) | **diagnose first** (see below), likely noun-lexicon: ensure `cuchillo` maps to the `knife`/`knives` canonical so the `con`-slot never resolves to the thief's `estilete` | cognate | cognate | `*.zork1.ts` (root cause TBD) |
| **Conjoined + trailing prep** `mete X y Y en Z` → drops Y AND Z | **debug existing pipeline** (see below) — NOT a new feature | verify only | verify only | `inputTranslate.ts` |

### Friction bugs (a natural command fails; in-language workaround exists)

The complete, closed list (no "etc." — `notes/uat.md`'s trailing items resolved
into this set; each carries a ×3 per-language cognate check):

1. `apaga` (imperative) unknown — the infinitive `apagar` works; add the
   imperative form → `extinguish`.
2. `deja todo` → "drop advertisement" — the `todo` quantifier mis-maps; fix the
   "all" quantifier path.
3. `abre la tapa` → "open cage" / `cierra la tapa` → "turn off candles" — `tapa`
   (lid) mis-maps; fix the noun.
4. `coge el jade` → "take jeweled egg" — `jade` mis-maps; fix the noun.
5. `coge la calavera de cristal` → "take crack" — the `de cristal` modifier
   breaks resolution; bare `calavera`→skull works, so the modified phrase must
   resolve to the same canonical.
6. `sube la cesta` → "climb cage" (should raise) — `sube`/`subir` overloads
   "climb" vs "raise"; `levanta`→raise works.

Most are one-line verb/noun lexicon additions, but **each requires the fr/de
cognate check**, so the real cost is ≈3× the bullet count. CLAUDE.md treats a
failing *natural* command as player harm, so these are in scope.

### Known implementation wrinkle: fused prepositions

Spanish `al` and `del` are fused `a+el` / `de+el` single tokens. Both the
songbird idiom (`dar cuerda al`) and the boat-exit (`sal del bote`) depend on
matching through the fused preposition. **`es.core.ts` deliberately omits `del`
today** (it maps `al`→`to` but leaves `del` to the LLM, with a comment warning
that any `del` addition must consider the personal-`a` collision — e.g. `huye
del troll`). So the boat-exit fix *forces* that flagged decision. The plan MUST
choose one approach explicitly and justify the `del`/personal-`a` interaction:
either idiom/phrase variants (`dar cuerda al`, `sal del`) or a fold-time split of
`al`/`del`.

French has the analogous fusion `du` (`de+le`) / `au` (`à+le`). `fr.core.ts`
has no general `du`/`au` prep entry (only the `à l'eau` boat idiom as a folded
full phrase). The plan MUST either resolve `du`/`au` for the specific fr cognate
commands in scope (boat, songbird) **or** state concretely why those commands
don't traverse a fused prep. "Should be checked" is not an acceptable
resolution. German does not fuse.

### Combat weapon-slot: diagnose before fixing

`coge el cuchillo`→"take nasty knives" is already CORRECT (object slot); the bug
is *only* the `con <arma>` instrument slot (`parse.ts:285–299` splits
`<verb> <obj> con <ind>`), which resolves `cuchillo` to the thief's `estilete`.
The plan MUST first capture the `nl debug` `{stage, result}` for `mata al ladrón
con el cuchillo` to find *why* the instrument slot resolves differently from the
object slot, then state the concrete rule (most likely: a noun-lexicon entry so
`cuchillo` lands on the `knife`/`knives` canonical and never reaches the stiletto
disambiguation). Do not pre-commit to a mechanism before the root cause is known.

### Conjoined + trailing prep: a debug, not a build

`mete la antorcha y el destornillador en la cesta` → only "put torch" (drops the
2nd object AND the `en la cesta` destination). **The mechanism the spec earlier
implied building already exists and ships:** clause splitting, verb-gapping, and
trailing-prep distribution all live in `src/llm/inputTranslate.ts`
(`splitClauses`, `fillElidedVerbs`, `prepTail`, `distributePrepTail`) — and
`distributePrepTail` was written *for the German* `lege A und B in die Vitrine`
(UAT F16). So:

- The fix is **debugging why the es case drops the object/destination**, not
  writing a new distribution feature. Likely root cause inside `inputTranslate.ts`:
  the second bare object `el destornillador` failing to gap (article/`isForeignNoun`
  path), or `prepTail` not recognizing Spanish `en`, or a fold/casing interaction.
- The plan MUST first reproduce the es failure as a failing test against
  `inputTranslate.ts`, diagnose which function drops it, *then* propose a change.
- German is **verify-only** (the F16 fix should already cover it — listing it as
  "needs the same fix" would double-count); French likewise verify.

This is the single genuine code change in P1.1. It is a pipeline debug of
existing multi-clause code, not a one-line data edit — the "mostly data" framing
applies to everything *except* this.

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
