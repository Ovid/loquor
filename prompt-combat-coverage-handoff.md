# Hand-off: fill the Georgian (`ka`) combat-message coverage gap

**Mission (one sentence):** Zork I's randomized combat messages leak **raw English** for
a Georgian player on the **golden path** (the troll fight, and identically the thief
fight) — author the missing `ka` renderings (TDD, gated, regression-pinned,
`NATIVE-REVIEW-DRAFT`) so a player who picked `ქართული (beta)` never reads English mid-combat.

> **ASSUMPTION TO CONFIRM (Ovid set this, but flag if you disagree):** the mission is to
> **author the provisional `ka` drafts now** — consistent with Ovid's standing _author-all_
> call on the composed-line gate (combat lines are the same runtime-spliced shape). The
> Georgian will be machine-quality `NATIVE-REVIEW-DRAFT` like the rest of the corpus; a
> native reviewer validates §4 case/naturalness later, and the **`(beta)` marker stays**.
> A raw-English leak is strictly worse for the player than a draft-Georgian line, so
> drafting now is pro-player. If Ovid would rather **stop at the scoped worklist and wait
> for a native pass**, the worklist below is already the deliverable — confirm before
> writing code.

**What this descends from.** Browser UAT-6 (2026-06-24, branch `ovid/composed-line-gate`)
confirmed the `(with the …)` instrumental parenthetical PASSES, and **incidentally
surfaced** this separate, pre-existing combat leak. The leak was then **scoped read-only**
(Ovid's call). This hand-off executes the fix.

---

## 0. Orient first (before writing code)

- Read **`CLAUDE.md`** (project root). Announce **"CLAUDE.md read"** and address the user
  as **Ovid**. **NEVER modify** the gitignored vendored dirs (`zork1/`, `ifvms.js/`,
  `vendor/glkote/`, …) — read only.
- **This is corpus-translation work → `ka` OUTPUT-ONLY.** Per CLAUDE.md: an output-side
  corpus change includes `ka`; do **not** wire `ka` into any input path. fr/de/es have an
  **LLM fallback** so these lines don't leak there in full mode — see §4 for the parity
  decision.
- **Read the scope worklist FIRST — it is the authoritative inventory:**
  **`notes/georgian-combat-coverage-worklist.md`** (132 runtime combat strings, **59 leak
  in `ka`**, the troll==thief explanation, root causes, the two fix shapes, and the full
  categorized missing list). Then `notes/uat-6.md` (how it was found) and
  `notes/georgian-native-review-followup.md` (the blocking native-review tracker — this
  work feeds it).
- **North star:** a player who switched languages must **never** read English. `ka` has
  **no LLM net**, so a deterministic corpus gap is a _guaranteed_ leak. Combat is on the
  golden path (everyone fights the troll; killing the thief is required to win).

---

## 1. The gap (background — verify against the worklist, don't re-derive from scratch)

Combat messages live in `zork1/1actions.zil` "SUBTITLE MELEE": four `<GLOBAL …-MELEE>`
tables (`HERO-MELEE` = the player's attacks; `TROLL-MELEE`/`THIEF-MELEE`/`CYCLOPS-MELEE` =
each enemy's attacks), indexed by blow-result, each result holding several `RANDOM-ELEMENT`
variants, plus engine "frame" lines (`VILLAIN-BLOW`/`HERO-BLOW`: "slowly regains his feet",
"cannot defend himself: He dies", …). `F-DEF` = defender name, `F-WEP` = player's weapon.

Two independent causes, both invisible to the green suite:

1. **Probabilistic rolls → walkthrough-coverage gate blind spot.** The gate only saw the
   `(villain, variant)` combos its one recorded run rolled. So the corpus has e.g.
   `The thief slowly regains his feet.` but **not** the troll one. **Same gap for troll
   AND thief** — `HERO-MELEE` (your attacks) is villain-agnostic, so its 44 missing lines
   leak identically whichever villain you hit.
2. **`F-WEP` lines have NO coverage mechanism at all** — not a string, not a template.
   ~20 distinct weapon-bearing templates leak for _every_ weapon.

Coverage today (from the worklist): HERO-MELEE 11/55, FRAME 4/10, TROLL-MELEE 21/25,
THIEF-MELEE 25/28, CYCLOPS-MELEE 12/14. **Combat is NOT modeled as a gate family today** —
the covered strings are incidental loose entries in `zork1.ka.strings.ts`.

---

## 2. Two fix shapes

### Shape A — `F-DEF`-only full strings (~39 missing; the tractable bulk)

These name only the villain (no weapon): `The {obj} is staggered, and drops to his knees.`,
`A good slash, but it misses the {obj} by a mile.`, etc. The villains are **object keys**
(`troll → ტროლი`, `thief → ქურდი`, `cyclops → ციკლოპი` in `zork1.ka.objects.ts`), so model
each as a **composed family** with the villain as an `{obj}` slot, and author the `ka`
strings. The leaked troll lines **mirror the already-covered thief lines** (and vice-versa),
so a draft can largely copy the sibling form with the other name + §4 case — low risk.

### Shape B — `F-WEP` weapon-slot templates (~20 missing; the heavy half)

`It's curtains for the {obj} as your {wep} removes his head.`, `The axe knocks your {wep}
out of your hand.`, etc. **The weapon appears in MULTIPLE §4 cases**, not just one:

- **instrumental** ("…your sword removes his head") → this is exactly the **Group H
  instrumental pins** you can reuse (`(with the sword)` → `(მახვილით)`; see
  `notes/georgian-composed-line-review.md` rows 63–76);
- **possessive/genitive** ("your sword"), **nominative** ("the sword goes flying"),
  **attributive** ("your sword arm").

So Shape B needs a **case-aware weapon slot** — heavier design, and genuinely
native-review-dependent for the non-instrumental cases. `composed-families.ts:245` already
notes this ("the general form needs the INSTRUMENTAL case (§4); fr/de/es generalize").
**Recommendation:** land Shape A first (stops most of the leak, low risk), then Shape B as
a second commit; consider a native check on the B case-forms before pinning them hard.

---

## 3. Where the code goes (seams — all under `src/translate/corpus/`)

- **`composed-families.ts`** — add the combat families (the `COMPOSED_FAMILIES` array).
  Follow the existing `{obj}`-bound pattern, e.g.:
  ```ts
  { en: 'The {obj} is staggered, and drops to his knees.', reach: 'reachable',
    note: 'HERO-MELEE STAGGER #1 (1actions.zil). Player-attack; villain-agnostic.',
    bindings: { obj: { objects: ['troll', 'thief'] } } },
  ```
  Model spliced parts as **slots**, never as a resolved literal (the `en` INVARIANT in the
  file header — a literal would false-FAIL skeleton fidelity). **RAISE the family-count
  floor** when you add families (the `MIN_FAMILY_COUNT`-style floor near the end of the
  file — read its comment; it must equal the new count or the gate fails).
- **`zork1.ka.strings.ts`** — the per-villain full `ka` strings (Shape A). Each carries a
  `// NATIVE-REVIEW-DRAFT (ka §4 case forms)` marker (see `ka-native-review-draft.test.ts`,
  which pins the markers so one can't be silently dropped).
- **`zork1.ka.templates.ts`** — the `F-WEP` case-aware templates (Shape B), in/near the
  `COMPOSED-GATE-DRAFTS` block, also `NATIVE-REVIEW-DRAFT`.
- **`match.ts`** — how a template's slot matches a runtime line; read it before designing
  the Shape-B weapon slot (string pins beat templates by specificity — the mechanism the
  Group H pins already use).

---

## 4. Multilingual scope (read CLAUDE.md's "fix in all languages" rule)

- **`ka` is the MANDATORY target** (no LLM net → the only safety is the corpus).
- **fr/de/es:** in **full mode** their LLM papers over these gaps, so they don't leak
  there today. BUT in **"basic mode"** (language picked, model not downloaded) fr/de/es
  have no LLM either, so the same combat lines leak raw English. Per the north star, the
  **deterministic path should cover them too.** Decision for Ovid if you want to bound
  scope: do `ka` (mandatory) this pass and **log fr/de/es basic-mode combat coverage as a
  parity follow-up**, OR author all four now. The composed-line gate drives `ka` over the
  union object set and fr/de/es over one representative — keep that convention.

---

## 5. Discipline

- **TDD throughout** (red→green→refactor), **small commits** (one per coherent batch —
  e.g. "Shape A HERO-MELEE", "Shape A FRAME+enemy F-WEP", "Shape B templates"). The gate
  (`composed-lines.test.ts`) IS your red test: add the family → it fails (English `ka`) →
  author the string/template → green.
- **Pin the exact runtime lines** in `zork1.ka.uat.test.ts` (a new "combat coverage
  (UAT-2026-06-24 follow-up)" block) so a regression to raw English fails the suite —
  mirror the implicit-instrument block already there. Pin the **noun/structure**, not the
  full §4 case form, so a native case tweak doesn't fight the gate (the pattern that block
  already uses).
- **Tests stay pristine** — no stray `console.*` / `act()` warnings; spy+assert any log
  path (CLAUDE.md convention).
- **Do NOT touch the Group H parenthetical pins** (they passed UAT-6) except to _reuse_
  the instrumental forms. **Keep the `(ამით)` fallback** and all existing markers.
- Verify with **`make all`** (full gate; was 1513 green at hand-off) before claiming done.

---

## 6. Verify in a real browser (the proof the unit tests can't give)

Per `notes/uat.md` (the UAT working notes — read the "combat leak-magnet" entry):

1. Dev server usually on `http://localhost:5173/` (`lsof -ti :5173`; else `npm run dev`).
   Pick **`ქართული (beta)`**, basic mode (no model — `ka` has none anyway).
2. `localStorage.removeItem('loquor.xlate.misses')`, then **fight BOTH villains for several
   rounds each** (the troll early; the thief late — or use `attack <villain>` repeatedly to
   roll many result variants) and read `window.loquorMisses()` after each round. **Combat is
   probabilistic, so fight long enough to roll many variants** — that's exactly where the
   gate is blind. Target: `loquorMisses()` stays empty for combat lines.
3. Read the transcript `<p>` elements (`div[role="log"]`) — confirm each combat line is
   Georgian (`lang="ka"`), inside the `aria-live="polite"` log (a11y), no Latin.
4. **Troll route** (~17 turns, one fight): Living Room → `take sword` + `turn on lantern`
   (grue safety) → `open trap door` → `down` (Cellar) → `north` (Troll Room) → `attack
troll` × several. Thief is deeper (the maze/Treasure Room) — `attack <gone-villain>`
   with one weapon also rolls HERO-MELEE lines cheaply (GWIM fires before scope check), but
   to roll the _enemy_ tables you need the live villain.

---

## 7. Guardrails

- **`ka` NATIVE-REVIEW-DRAFT, `(beta)` stays.** "Done" = "no raw-English combat leak in
  real play, gated + pinned, `make all` green" — **NOT** "the Georgian is verified".
  Naturalness/§4 correctness is **out of scope** → it stays with the native review
  (`notes/georgian-native-review-followup.md`). Don't "fix" a Georgian form because it
  looks off to you; log the doubt.
- **Don't break the parenthetical (Group H) work or any existing pin.**
- Small commits; end messages with
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## 8. Files & commands (quick reference)

- **Worklist (authoritative inventory):** `notes/georgian-combat-coverage-worklist.md`.
- **Implementation:** `src/translate/corpus/composed-families.ts` (add families + raise
  floor), `zork1.ka.strings.ts` (Shape A strings), `zork1.ka.templates.ts` (Shape B
  templates), `match.ts` (slot matching).
- **Gate/pins:** `src/translate/corpus/composed-lines.test.ts` (the family gate),
  `zork1.ka.uat.test.ts` (add a combat block), `ka-native-review-draft.test.ts` (marker
  pin). Reuse Group H instrumental forms from `notes/georgian-composed-line-review.md`
  (rows 63–76).
- **Source of truth for the game (read-only):** `zork1/1actions.zil` "SUBTITLE MELEE"
  (`HERO-MELEE` ~3611, `CYCLOPS-MELEE` ~3654, `TROLL-MELEE` ~3689, `THIEF-MELEE` ~3735;
  frame lines in `VILLAIN-BLOW`/`HERO-BLOW` ~3413–3530).
- **Commands:** `npx vitest run <file>` (single suite), `make all` (full gate),
  `make help`. App: `http://localhost:5173/`.

When done: report which villains/result-classes you covered, `loquorMisses()` proof from a
live troll AND thief fight, whether you did fr/de/es or logged them as a parity follow-up,
and confirm `make all` is green and the `(beta)`/`NATIVE-REVIEW-DRAFT` markers are intact.
