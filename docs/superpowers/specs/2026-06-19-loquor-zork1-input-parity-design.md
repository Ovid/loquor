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
| **Combat weapon slot** `mata … con el cuchillo` → wrong weapon (stiletto) | ambiguity fix so `cuchillo` in the `con`-instrument slot resolves to knife, not the thief's stiletto | cognate | cognate | `*.zork1.ts` + scope rule in `parse.ts` |
| **Conjoined + trailing prep** `mete X y Y en Z` → drops Y AND Z | **parser fix** in clause-split / elided-verb + trailing prep-phrase distribution | shared | shared | `parse.ts` |

### Friction bugs (a natural command fails; in-language workaround exists)

`apaga` imperative unknown (infinitive works); `deja todo` → drop advertisement;
`abre/cierra la tapa` (lid) mis-maps; `coge el jade` → egg; `coge la calavera de
cristal` → "take crack" (the `de cristal` modifier breaks it); `sube la cesta` →
"climb cage" (should raise). Most are one-line verb/noun lexicon additions.
CLAUDE.md treats a failing *natural* command as player harm, so these are in
scope. Each gets the same per-language cognate check.

### Known implementation wrinkle

Spanish `al` and `del` are fused `a+el` / `de+el` single tokens. Both the
songbird idiom (`dar cuerda al`) and the boat-exit (`sal del bote`) depend on
matching through the fused preposition. The plan must resolve this once — either
idiom phrase variants (`dar cuerda a` / `dar cuerda al` / `dar cuerda a la`) or a
fold-time split of `al`/`del` — and apply it consistently. (No fr/de analogue:
French elides to `du`/`au` similarly and should be checked; German does not.)

### Regression pins (the forcing function)

New files, mirroring the existing `src/llm/lexicon/parse.de-uat.test.ts`:

- `src/llm/lexicon/parse.es-uat.test.ts`
- `src/llm/lexicon/parse.fr-uat.test.ts`
- append cases to `parse.de-uat.test.ts`

Each blocking/friction bug → one pinned `parse()` assertion (foreign input →
expected canonical command). **Pure parse-level; no browser.** A regression that
re-breaks any of these fails `make test`.

## P2.2 — Disambiguation templates (fr/de/es + ka)

Two specific templates render garbled (es), and are **entirely absent in `ka`**
(`ka` has 23 templates vs ~188 for fr/de/es), so `ka` leaks **raw English**:

1. `What do you want to put the {obj} in?` — es renders the structurally-wrong
   `¿Qué quieres poner la cera?` (the `{obj}` slot is mangled).
2. `Which of the {obj}s do you mean?` — es renders the `tesones` pluralization
   bug (should be `tesoros`).

Fix/add both templates in `zork1.{es,fr,de,ka}.templates.ts`. (es was authored by
mirroring fr, so the same gap is likely shared — fix all.) Pin in
`zork1.{es,fr,ka}.uat.test.ts`; add the de assertion to its corpus suite.

### Georgian caveat (native-review track)

Georgian noun **case forms inside templates** are a known hard problem — it is
*why* `ka` has so few templates, and last branch's `ka` additions had to
drop/rephrase object names to dodge it (the §4 case issue). Any `ka`
disambiguation text added here is a **native-review draft line**, marked as such
in-file, **not** a finalized translation. This fits the existing
`notes/georgian-native-review-followup.md` gate (native review BLOCKS the
`(beta)` marker); it does not block this branch.

## P3 — Passive escape-hatch signposting

The escape hatch (wrap an un-translated command in quotes: `"wind up canary"`)
is undiscoverable today. Make it **passively discoverable** — no per-turn
failure detection. (Failure detection was rejected: the worst bugs translate to
a *valid command the game accepts but that does the wrong thing*, so there is no
error line to catch, and detection would require fragile per-language matching of
game error output.)

Three pieces:

1. **Localized `help` command.** A new Loquor-level intercept (sibling to meta
   routing in `src/llm/inputTranslate.ts`) triggered by the English word `help`
   and the localized aliases `ayuda` / `aide` / `hilfe`. It renders a localized
   transcript block listing the meta-commands with their per-language equivalents
   **plus** the quoted-English escape-hatch explanation, and **never reaches the
   game** (it overrides Zork's stock terse English help — a deliberate,
   pro-player override: ours is localized and more useful). Announced via the
   existing aria-live notice region.
   - For `ka`: the trigger is the English word `help` only (no input alias — `ka`
     has no lexicon); the block is **Georgian text** whose content is "type
     commands in English," **not** the quoted-English fallback message (a `ka`
     player already types English).
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
- Every blocking + friction P1.1 bug pinned in `parse.{es,fr,de}-uat.test.ts`.
- P2.2 templates pinned in `zork1.{es,fr,ka}.uat.test.ts` + de corpus suite.
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
