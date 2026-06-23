# next.md — toward a fully-playable Zork I across all languages

Working backlog for the **next branch(es)**. Scope: **Zork I**, languages
**fr / de / es / ka**. Zork II/III items live in `notes/TODO.md` and are out of
scope here (II/III stay English by design — signalled by the landing
`ინგლისურად`-style badge).

This is a hub, not a duplicate: the per-language bug catalogues and techniques
live in `notes/uat.md` and `notes/uat-*.md`; the Georgian naturalness review
lives in `notes/georgian-native-review-followup.md` + the glossary. Cross-refs at
the bottom.

---

## The bar — what "fully playable" means

A player who picks fr / de / es / ka can drive Zork I from `West of House` to a
**350/350 win**, with:

1. **(read)** every on-screen line rendered in their language, and
2. **(type)** every command they need understood — **natively** where the
   language has input support, or via a **clearly-signposted escape hatch**
   (quoted-English) where it does not.

Today no language fully clears both bars. The gaps below are what's between us
and that.

---

## Current state (2026-06-23, post `ovid/fix-the-it-bug`)

> Since the 2026-06-20 `ovid/zork1-input-parity` table below, three branches
> landed: an English NL UAT sweep (BUG A–G — vocab-gate hardening, modified
> quantifiers, scenery extraction that helps all LLM input languages),
> `ovid/status-bar` + `ovid/localize-change-story` (UI/a11y), and
> `ovid/fix-the-it-bug` (**P2.3 anaphora "it" — now RESOLVED**, see below).

| Lang   | Read (output corpus)                                                                           | Type (input)                                                                              |
| ------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **fr** | ~complete — deathless run ≈1 baseline miss                                                     | NL (LLM + grammar-only); puzzle verbs regression-pinned; driven UAT catalogue pending     |
| **de** | ~complete                                                                                      | NL; puzzle verbs regression-pinned; open items (`notes/uat-de-findings.md`)               |
| **es** | complete — endgame verified clean (UAT-es-4)                                                   | NL; **blocking+friction bugs FIXED** this branch; deferred: `sube la cesta`, `entra bote` |
| **ka** | gates green; **composed-line class now gate-enforced (P2.1)** — native-review worklist pending | **type-English only** (Phase 1). Phase 2 = Georgian grammar-only input (own spec)         |

The headline asymmetry: **output is nearly there for fr/de/es and structurally
sound for ka; INPUT is where playability actually breaks** — es puzzle-verb
blockers are now fixed; fr/de regression-pinned but lack driven UAT passes;
Georgian has no native input at all yet.

---

## P1 — completion blockers (player can't finish, or must secretly switch to English)

### P1.1 — Input-NL puzzle-verb bugs (fr/de/es) that gate Zork I solutions

**STATUS: RESOLVED for es blocking+friction tier (branch `ovid/zork1-input-parity`);
fr/de regression-pinned (already passing). See DONE block below for full
accounting. Remaining open: deferred items and driven fr/de UAT catalogues.**

The corpus-miss equivalent for INPUT: a foreign command mis-maps to the wrong
canonical, so the puzzle can't be solved without the `"english"` quoted
fallback. Catalogue in `notes/uat.md` ("Spanish INPUT-NL bug catalogue" + UAT-es-4).

Fixed on `ovid/zork1-input-parity` (all pinned in `src/llm/lexicon/parse.es-uat.test.ts`):

- **Songbird.** `dar cuerda al canario` → "wind up canary" — fused `al`/`a la`
  wind-up idiom (commit a993524).
- **Boat exit.** `sal del bote` → "exit boat" — `del`-as-article (commit 27442e6).
- **Loud Room.** `eco` → "echo" (commit 878a40c).
- **Combat instrument slot.** personal-`a` stripping in prep-split span;
  `mata al ladron con el cuchillo` → "attack thief with rusty knives"
  (commit 8b65679 — shared `parse.ts` change).
- **Quantifier all.** `deja/coge todo` via es `quantifiersAll` (commit 51cdc47).
- **Noun surfaces.** `tapa`→machine, `jade`→jade figurine, `calavera de cristal`
  (multi-word) (commit 422a0ee).
- **Conjoined+trailing-prep** (`mete X y Y en Z`): was STALE — already worked via
  `distributePrepTail`; regression-pinned (commit fd3559c).
- **`apaga` imperative**: was STALE — already worked; regression-pinned (commit
  51cdc47).

Still open / deferred:

- `sube la cesta`→climb cage, `entra en el bote` (see DEFERRED block below).
- Cosmetic tier (`libro`→page, `oro`→pot, `subir` flakiness).
- fr/de driven-in-language UAT catalogues (browser UAT passes not yet done).

### P1.2 — Georgian has no native input (Phase 2)

ka is read-Georgian/**type-English** today. "Fully playable in Georgian" requires
**Phase 2: Georgian grammar-only input** — its own spec + plan (deferred in the
design, spec §1). Two structural prerequisites already mapped:

- `LexLang` is pinned to `'fr' | 'de' | 'es'` (spec §2/§9) — Phase 2 adds `ka`
  and authors a Georgian input lexicon (`src/llm/lexicon/**`).
- The **round-trip gate** enrolls fr/es/de only (`roundtrip.test.ts:34`); ka
  joins once its input lexicon + case forms exist (spec §6 deferred it
  deliberately so Phase 1 didn't need exhaustive case tables).

This is a large branch on its own — keep it separate from the fr/de/es input work.

---

## P2 — coverage completeness (anti-regression nets)

### P2.1 — Composed-line inventory gate (all langs) ⭐ DONE (branch `ovid/composed-line-gate`)

**STATUS: DONE.** The runtime-composed-line blind spot is now **gate-enforced across
all four languages**. The two older gates had a structural gap: coverage was
walkthrough-only; inventory only vetted full-line z-strings — so **runtime-spliced
line families slipped both** and leaked raw English (ka found 4 by hand; fr/de/es leaked
some too). Built:

- **`src/translate/corpus/composed-families.ts`** — the committed family inventory
  (82 reachable families: orphan + disambiguation prompts, listing engine, state,
  container/placement, standard- and exotic-verb refusals, multi-slot splices).
- **`src/translate/corpus/composed-lines.test.ts`** — the gate. Per reachable family it
  (a) checks the EN skeleton is real game text (fidelity vs. the decoded story file),
  then (b) drives object/raw/verb fills through `matchLine` per language and asserts a
  non-English, Georgian-bearing translation for `ka`. `REACHABLE_FLOOR = 82` +
  completeness meta-tests guard against a refactor silently emptying the data.
  `EXEMPTIONS` / `EXPECTED_DEFERRED` are **empty** (Ovid's author-all call — close the
  leak, don't list it); `FIDELITY_ALLOW` holds 3 verified two-TELL spans.

Ovid's governing decision: **a switched-language player must never read English, even
in basic mode** — so the exotic-verb tail (burn/dig/cut/tie/wind/…) was **authored, not
deferred**. The 60 authored `ka` composed lines are machine-drafted and
linguistically unverified; the per-line native-review worklist is
**`notes/georgian-composed-line-review.md`** (the `(beta)` marker stays until a native
speaker signs off). `composed-lines.uat.test.ts` was retired — its 7 UAT pins are now
seed families asserted by the gate.

**UAT 2026-06-23 follow-ups** (black-box play in the browser, all four langs):
- ✅ **FIXED** — a Living Room state variant (west door *nailed shut* + *closed trap door at
  your feet*: rug moved, trap closed, cyclops not yet defeated) was unpinned in **every**
  corpus and leaked raw English right after `move rug`. Pinned in all four + regression tests
  (added a German uat suite; de had none). Commit `fix(translate): pin pre-cyclops closed-trap
  Living Room variant`.
- ⏳ **OPEN — parser implicit-object parenthetical `(with the <obj>)` / `(<obj>)`** is a
  **recon gap**: it is not in `composed-families.ts`. fr/de/es generalize it with a template;
  **`ka` has only the `(with the match)` pin**, so `attack troll` → raw `(with the sword)`
  leaks for Georgian on the golden path. Fix = add the family + author the `ka` instrumental
  form with native review (the §4 case problem — instrumental is deliberately un-templated).
  Full diagnosis + recommended fix: `notes/georgian-native-review-followup.md`.

### P2.2 — Dynamic disambiguation prompts (all langs)

**STATUS: PARTIALLY DONE — ka-only (branch `ovid/zork1-input-parity`). fr/de/es
DIVERGED: no template changes made (LLM fallback routes them; no raw-English leak).
See DONE block for accounting.**

`What do you want to put the {obj} in?` / `Which {obj} do you mean?` — on
investigation, fr/de/es disambiguation prompts are deliberately LLM-fallback-routed
and do not leak raw English. Only **ka (corpus-only)** leaked. `Which of the {obj}s`
doesn't exist in Zork I; the real prompt is `Which {raw} do you mean, the {obj} or
the {obj2}?`. Fixed for ka with a generalized template (commit 89b1d3f).

Still open:

- **Orphan `What do you want to …?`** — **RESOLVED 2026-06-20 (UAT + /paad:vibe).**
  The "no raw-English leak for fr/de/es" claim above was WRONG for this prompt: UAT
  found it leaks RAW English in es/fr/ka (not garbled-LLM — `engine not loaded`, so
  no LLM ran; a missing corpus entry, not "LLM territory"). Fixed with a
  deterministic template `What do you want to put the {raw} in?` in all four
  corpora (`{raw}`-bound, object dropped — the echoed noun can be a lexicon-emit
  synonym like `advertisement` that an `{obj}` slot would miss). ka is a
  NATIVE-REVIEW-DRAFT. Pinned (composed-lines + per-lang + marker); `make all`
  green; live-verified es/fr/de/ka. See `notes/uat.md` CORRECTION/RESOLVED block.
- fr/de/es: no action needed for `Which … do you mean?`; the garbled `¿Qué quieres
poner la cera?` (es) was confirmed LLM-fallback territory — a bad LLM response,
  not a missing corpus entry. (NB: the `What do you want to put X in?` prompt was
  the OPPOSITE — a genuine missing corpus entry, now fixed above.)
- **Disambiguation ANSWERS aren't translated** (separate; **diagnosed
  2026-06-20, NOT a lexicon fix — needs a routing/turn-boundary fix**). When the
  game is mid-orphan-prompt ("What do you want to put the X in?"), the player's
  next line is **raw-sent, bypassing `nl.translate` entirely** — proven in the
  browser: typing `mira` (a known verb → `look`) mid-prompt printed
  `No conozco la palabra «mira»` and produced **no `[nl] clause` log**, while the
  same `mira` at a normal prompt translates fine. So the answer never reaches the
  parser. A parse-level "bare noun → canonical" fix WAS prototyped (resolve a
  verbless span via `resolveNoun` at `parse.ts`'s `if (!verb)` — `buzon`→`mailbox`,
  unit-confirmed) but it is **necessary-not-sufficient**: at a normal prompt it only
  turns `buzon` from `No conozco «buzon»` into `mailbox` → `¡No había ningún verbo
en esa frase!` (Zork's bare-noun reply), and it can't help mid-prompt because the
  input is bypassed before parsing. Reverted (negligible standalone value). The
  real fix is in the input QUEUE / turn-boundary handling (`translatePipeline.ts` /
  the Terminal queue): route the mid-orphan-prompt continuation through
  `nl.translate` instead of raw-sending. Own follow-up — it is genuinely
  complicated (Ovid's "do it if not complicated" guard → deferred).

### P2.3 — Anaphora "it"

**STATUS: RESOLVED 2026-06-23 (branch `ovid/fix-the-it-bug`, merged).** Two bugs
found+fixed TDD, live-confirmed; sweep recorded in `notes/uat.md` ("Pronoun /
'it'-resolution sweep").

- **BUG H** (commit ae43cc9) — richer English pronoun forms (`turn it on`, `put
painting in it`, `give it to thief`) leaked to the warm LLM and got mangled.
  Fix: `isEnglishPronounClause` now raw-sends any clause that leads with a known
  vocab verb + holds exactly one `it`/`them` + every other token is a Z-parser
  word — Zork's native "it" tracker is authoritative (it even beat our own
  scene-tracker's stale antecedent). English-specific; fr/de/es already resolve
  container/direct pronouns in `parseLexicon` (`pronounsContainer`/`pronounsDirect`)
  — the English particle-in-the-middle construction has no fr/de/es analog.
- **BUG I** (commit fdffbe4) — `examine bottle` then `open it` opened the _wrong_
  object: `ABSENCE_PAT`'s "X is empty" clause wrongly scrubbed the container from
  scope. Fix: dropped that alternative (examining an empty container is a success,
  not an absence). Shared EN/FR/DE/ES.
- Plus I1/I2/I3 follow-ups (commits 5f8fb73, c4c55af, 09f19dc): ambiguous-synonym
  container antecedents (`put X in it`), single-letter meta-verb guard, internal-
  whitespace collapse in `directObject`.

`notes/TODO.md` line ("'it' doesn't always resolve") is now satisfied for Zork I.

---

## P3 — UX / signposting (make the escape hatch discoverable)

**STATUS: P3.1 DONE (branch `ovid/zork1-input-parity`). P3.2 not implemented
(out of scope this branch — passive-only signposting was the plan).**

Without these, a player whose command fails has no idea the quoted-English
fallback exists — and a ka player is _always_ typing English.

- **P3.1 — In-game `help` command:** DONE for **all** languages incl. **en**.
  Localized `help` override for en/fr/de/es/ka; one-time escape-hatch activation
  notice; localized input placeholder (a11y). Zork I has no native help (prints
  "I don't know the word"), so the override is strictly an improvement (audited in
  spec). Commits e7b4f03, 662015e, 41dc1ab. **Follow-up fix:** English `help` was
  initially excluded on the false premise that it "passes through to native help"
  — but there is none, and with a model on the LLM mistranslated `help`→`look`
  (silent room re-display) or abstained → "I don't know the word help". So English
  `help` now intercepts too, showing `helpResponse('en')` (which gained the
  quoted-escape line). Found via UAT (Ovid). Commit <this>.
  **Follow-up fix 2 (UAT 2026-06-20):** the ka `help` block was DEAD — `help.ts`
  had the `ka` alias + `helpResponse('ka')`, but ka is OUTPUT-ONLY and raw-sends,
  so `Terminal` never called `nl.translate` (where the intercept lives) and `help`
  reached the parser → "I don't know the word help" — while the ka activation
  notice tells the player to type `help`. Fixed with a Loquor-level intercept at
  the `Terminal` boundary for the output-only case (`outputOnly &&
isHelpTrigger` → new `nl.showHelp` seam); other ka commands still raw-send.
  Pinned in `Terminal.test.tsx`. So P3.1 is only NOW actually done for ka.
- **P3.2 — On-failure in-language hint:** NOT done. When a command fails
  in-language, surface in-language help pointing to the `"english"` escape hatch.
  Deferred — on-failure detection was out of scope for the passive-signposting
  pass. Own branch when wanted.

---

## Georgian quality track (parallel, ongoing)

- **Native review is BLOCKING** before the `(beta)` marker drops or ka is called
  "supported" — `notes/georgian-native-review-followup.md` + glossary open
  questions. The **4 draft lines added this branch** (A `…: Taken.`, B caseless
  "nothing special", C mailbox reveal, D rug/case failure prefixes) are
  native-review items; finding B in particular _drops the object name_ (`ამაში…`)
  to dodge the §4 case problem — a reviewer may prefer per-object pins.
- Feed `window.loquorMisses()` from real Georgian playthroughs into
  `zork1.ka.uat.test.ts` as confirmed pins.

---

## Recommended next branch (pick ONE coherent slice)

> **DONE (branch `ovid/zork1-input-parity`, merged 2026-06-20):** P1.1 blocking
>
> - friction tiers for es (and fr/de regression pins); P2.2 ka-only
>   disambiguation template; P3 passive signposting. 1199 tests green.
>   Design: `docs/superpowers/specs/2026-06-19-loquor-zork1-input-parity-design.md`;
>   plan: `docs/superpowers/plans/2026-06-19-loquor-zork1-input-parity.md`.
>
> **What was actually done (vs. plan):**
>
> - **P1.1 (es input fixes):** `eco`→echo (Loud Room), `deja/coge todo`
>   (quantifiersAll), `dar cuerda al canario`→wind-up idiom (songbird), `sal del
bote` via `del`-as-article (boat exit), noun surfaces `tapa`/`jade`/`calavera
de cristal`, personal-`a` stripping in prep-split object span (`mata al ladron
con el cuchillo`). The personal-`a` fix is the **one shared `parse.ts` change**.
>   All pinned in `src/llm/lexicon/parse.es-uat.test.ts`.
> - **P1.1 (fr/de):** verified by analytical cognate — fr/de already pass all
>   shared puzzle verbs. Regression pins added in `parse.fr-uat.test.ts` and
>   `parse.de-uat.test.ts` (commit 76dce58). No new lexicon changes needed.
> - **P2.2 (DIVERGED — ka-only, not fr/de/es):** investigation found fr/de/es
>   disambiguation prompts are deliberately LLM-fallback-routed (no raw-English
>   leak). Only ka (corpus-only) leaked raw English. `Which of the {obj}s` does not
>   exist in Zork I; real wording is `Which {raw} do you mean, the {obj} or the
{obj2}?`. Fix: ka-only generalized template (commit 89b1d3f). New test enforces
>   `NATIVE-REVIEW-DRAFT` marker on ka lines (commit ef12bce). **fr/de/es got no
>   disambiguation template changes.**
> - **P3 (signposting):** localized `help` override (fr/de/es/ka), one-time
>   escape-hatch activation notice, localized input placeholder (a11y). Zork I has
>   no native help — override is strictly an improvement. (Commits e7b4f03,
>   662015e, 41dc1ab.)
> - **Escape-hatch passthrough bug (Task 8):** pinning `"kill thief with knife"`
>   surfaced a real bug — `vocabWordSet` omitted `emit` nouns; fixed with
>   `addWords(n.emit)`. Side-effects: emit/match collisions added to
>   `KNOWN_COLLISIONS`; open-mailbox test fixture corrected; `isIdentityEcho`
>   guard in `translatePipeline.ts` is now permanently unreachable dead code
>   (harmless; flagged, left in place — see follow-ups below).
> - **Stale catalogue items confirmed already-working:** conjoined+trailing-prep
>   (`distributePrepTail` already handled it) and `apaga` imperative — both
>   regression-pinned, no code fix needed.
>
> **DEFERRED out of this branch (Ovid sign-off, 2026-06-19):**
>
> - **`sube la cesta` → `climb cage`** (P1.1 friction). `sube` bare = go up/climb,
>   so a context-free `sube`→raise breaks navigation; arity-conditional sense is
>   fragile. Workaround: `levanta la cesta`→`raise cage`. Revisit with a safe
>   arity-aware design.
> - **`entra en el bote`** (boat _enter_, `miss`). Workaround: `aborda`/`embarca`→
>   board. Enter-arity is a separate, lower-value fix.
> - **Cosmetic tier** (`libro`→page, `oro`→pot, `subir` flakiness).
> - **Driven fr/de UAT catalogues** (browser-in-language runs).
> - **ka native review** of the new draft template/help lines.
> - **ka Phase-2 input** (Georgian grammar-only input — own spec/plan).
>
> **Follow-ups the owner may want to act on:**
>
> - **Dead `isIdentityEcho` guard** in `translatePipeline.ts` — now unreachable
>   after the `addWords(n.emit)` fix. Optional cleanup: delete the guard and its
>   unit test assertion, or leave as harmless defensive code. Low priority.
> - **Orphan `What do you want to …?` prompt leaks English in ka.** The unbounded
>   object slot in Zork I's "What do you want to put X in?" prompt can't be
>   templated without enumerating every object; no fix this branch.
> - **ka `NATIVE-REVIEW-DRAFT` lines** (disambiguation template + help text +
>   composed-line fixes from this and prior branches) need a Georgian native
>   reviewer pass before the `(beta)` marker can drop.

**Recommendation: "Zork I input parity for fr/de/es"** — P1.1 (puzzle-verb
blockers) + P2.2 (disambiguation) + P3 (help / quoted-fallback signposting),
each pinned in the per-language UAT suites. This is the slice that makes Zork I
genuinely _completable_ in fr/de/es without secret English, and it's bounded
data/parser work with clear forcing-function tests.
**STATUS: DONE — see above.**

The safety net is now in place: **P2.1 composed-line inventory gate is DONE**
(`ovid/composed-line-gate`) — the "leaks English on an off-path composed line" class is
gate-enforced across all four languages. Remaining big slices:

- **Georgian native review** of the 60 composed-line drafts
  (`notes/georgian-composed-line-review.md`) — wording pass before `(beta)` drops.
- **Georgian Phase 2 input (P1.2)** — the biggest single piece; own spec/plan.
- Driven fr/de UAT catalogues; deferred es items (`sube la cesta`, `entra bote`).

---

## Cross-references

- `notes/TODO.md` — broader backlog (incl. Zork II `tell robot`, Zork III vocab,
  sound, map, responsive).
- `notes/uat.md` — testing techniques + the Spanish INPUT-NL bug catalogue + the
  composed-line / French-switch notes.
- `notes/uat-1..5.md`, `notes/uat-de-findings.md`,
  `notes/uat-french-playthrough-findings.md` — per-session findings.
- `notes/georgian-native-review-followup.md`, `notes/georgian-translation-glossary.md`.
- Spec §1 (Phase 2 scope), §6 (round-trip deferral), §8 (native loop):
  `docs/superpowers/specs/2026-06-17-loquor-output-translation-georgian-design.md`.
- `src/translate/corpus/roundtrip.test.ts:34` (lang enrolment),
  `src/translate/corpus/composed-lines.test.ts` + `composed-families.ts` (the P2.1
  composed-line gate + inventory; the old `composed-lines.uat.test.ts` was absorbed into it).
