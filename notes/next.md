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

## Current state (2026-06-19)

| Lang   | Read (output corpus)                                                                 | Type (input)                                                                      |
| ------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **fr** | ~complete — deathless run ≈1 baseline miss                                           | NL (LLM + grammar-only); open input-NL bugs                                       |
| **de** | ~complete                                                                            | NL; open items (`notes/uat-de-findings.md`)                                       |
| **es** | complete — endgame verified clean (UAT-es-4)                                         | NL; **documented bug catalogue** (`notes/uat.md`)                                 |
| **ka** | gates green, but **composed-line blind spot** (4 fixed this branch; class is bigger) | **type-English only** (Phase 1). Phase 2 = Georgian grammar-only input (own spec) |

The headline asymmetry: **output is nearly there for fr/de/es and structurally
sound for ka; INPUT is where playability actually breaks** — puzzle-solving verbs
mis-map, and Georgian has no native input at all yet.

---

## P1 — completion blockers (player can't finish, or must secretly switch to English)

### P1.1 — Input-NL puzzle-verb bugs (fr/de/es) that gate Zork I solutions

The corpus-miss equivalent for INPUT: a foreign command mis-maps to the wrong
canonical, so the puzzle can't be solved without the `"english"` quoted
fallback. Confirmed, still open (catalogue in `notes/uat.md`, "Spanish INPUT-NL
bug catalogue" + UAT-es-4):

- **Songbird (highest value).** `dar cuerda al canario` → `give rope to canary`
  (idiom `dar cuerda a` = "wind up", taken literally). The brass **bauble**
  treasure is unreachable without `"wind up canary"`. Likely the same shape in
  fr/de.
- **Boat false-friend.** `bote` → `bottle`; `sal del bote` → "move raft";
  inflate works (`infla el plástico`) but enter/launch need `"enter boat"` /
  `"launch"`.
- **Loud Room.** `eco` → `look` (should be the game's `echo`, the solution).
- **Combat instrument slot.** `mata … con el cuchillo` → "attack … with
  stiletto" (wrong weapon).
- **Conjoined objects + trailing prep phrase** drops the 2nd object AND the
  destination (`mete la antorcha y el destornillador en la cesta` → only "put
  torch").
- Cyclops magic word, `subir` flakiness, lid/`todo`/`apaga` imperative gaps, etc.

**Do:** treat `notes/uat.md` as the work-list; fix in the lexicon/idioms/parser;
pin each as a regression in the per-language `zork1.<lang>.uat.test.ts`. **A fix
in one language is usually a fix in all** (CLAUDE.md) — check the cognate in the
other two. fr/de need their own driven-in-language UAT passes to build the
equivalent catalogues (the es one is the most complete today).

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

### P2.1 — Composed-line inventory gate (all langs) ⭐ recommended infra

Directly answers `notes/TODO.md` line 1 ("a test that validates all text is
translated…"). The two existing gates have a **structural** blind spot: coverage
is walkthrough-only; inventory only vets full-line z-strings. **Runtime-composed
line families slip both** and leak English (this branch found 4 by hand in ka;
fr/de/es leak some too — e.g. the take-all failure prefixes). Families to
enumerate from the ZIL composition sites + the corpus templates and assert every
language renders:

- reveal-on-open — `Opening the {container} reveals {contents}.`
- multi-object `{obj}: {result}` — success (`Taken.`/`Dropped.`) **and every
  failure reason** (too-heavy, rug-too-heavy, securely-fastened, …)
- examine default — `There's nothing special about the {obj}.`
- darkness / "too dark to see", and the dynamic disambiguation prompts (P2.2)

Build it once and the whole class stops being UAT-discovered. (Technique +
French-switch classifier now recorded in `notes/uat.md`.)

### P2.2 — Dynamic disambiguation prompts (all langs)

`What do you want to put the {obj} in?` / `Which {obj} do you mean?` render
garbled — es: «¿Qué quieres poner la cera?», and the `tesones` pluralization bug.
Off-golden-path, so the gates miss it; **likely shared fr/de/ka**. Fix the
disambiguation templates per language and pin them.

### P2.3 — Anaphora "it"

`notes/TODO.md`: "it" doesn't always resolve (`open it` after a sentence). Cross
-language scene/antecedent handling in the NL layer.

---

## P3 — UX / signposting (make the escape hatch discoverable)

Without these, a player whose command fails has no idea the quoted-English
fallback exists — and a ka player is _always_ typing English. Both are in
`notes/TODO.md`:

- **P3.1 — In-game `help` command:** list the special/meta commands **with their
  per-language equivalents**, and explain the quoted-English fallback. Highest
  value for ka (type-English) and any failed command.
- **P3.2 — On-failure in-language hint:** when a command fails in-language,
  surface in-language help pointing to the `"english"` escape hatch.

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

**Recommendation: "Zork I input parity for fr/de/es"** — P1.1 (puzzle-verb
blockers) + P2.2 (disambiguation) + P3 (help / quoted-fallback signposting),
each pinned in the per-language UAT suites. This is the slice that makes Zork I
genuinely _completable_ in fr/de/es without secret English, and it's bounded
data/parser work with clear forcing-function tests.

Strong alternative if you want the safety net first: **P2.1 composed-line
inventory gate** — turns the whole "leaks English on an off-path composed line"
class from UAT-discovered into gate-enforced, across all four languages at once.

Keep **Georgian Phase 2 input (P1.2)** as its own later branch — it's the biggest
single piece and needs its own spec/plan.

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
  `src/translate/corpus/composed-lines.uat.test.ts` (this branch's cross-lang pins).
