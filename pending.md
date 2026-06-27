# Pending — two `ka` findings deliberately NOT fixed (UAT-completion run 2)

Branch `ovid/georgian-fixes`. Five findings from
`notes/uat-georgian-completion.md` were fixed (see git log). These two were left
**deliberately** — each has a working Georgian alternative, and the obvious fix
either regresses other commands or needs your call on a parked design question.

**DECISION (2026-06-27, Ovid): leave BOTH as-is.** Each has a working,
fully-Georgian path (orphan prompt / disambiguation reply), so no monolingual
player is blocked or forced to read English, and the obvious fixes carry a real
regression / parked-design risk. Re-open if a later run shows the friction
actually stops a player. Details + the options weighed are kept below for the
record.

---

## 1. `inflate <X> with pump` — instrumental `ტუმბოთი` abstains  🟧

### What the player sees
- `გაბერე პლასტმასი ტუმბოთი` ("inflate plastic with pump", one command) →
  **abstains** (no turn consumed).
- The puzzle is still solvable in Georgian via the orphan prompt:
  `გაბერე პლასტმასი` → game asks „რით…?" ("with what?") → answer `ტუმბო` →
  „ნავი ბერდება…" (the boat inflates). ✅
- UAT inconsistency note: the instrumental `-ით` **works** for kill/turn
  (`მოკალი ტროლი მახვილით`, `დაატრიალე ხრახნი … გასაღებით`) but **not** inflate.

### Why it happens (root cause)
The instrument is the **pump**, which is **vowel-final**: `ტუმბო`. Georgian's
instrumental case `-ით` **fuses** onto a vowel stem as `-თი`, so "with the pump"
is `ტუმბოთი`, not `*ტუმბოით`.

- For **consonant** stems the case stays separable: `მახვილ-ით` (sword),
  `გასაღებ-ით` (key). `expandGeorgian` splits `-ით` off → `[ით, მახვილ]`, and the
  prep-split emits `… with sword`. This is why kill/turn work.
- For the **vowel** stem `ტუმბო`, the surface is `ტუმბოთი`, which does **not**
  end in the postposition `-ით` (it ends in `-თი`). `expandGeorgian` falls
  through to the nominative `-ი` strip → `ტუმბოთ`. That bare token resolves to
  the pump (`ტუმბოთ` is dual-listed as a synonym), but **there is no `with`
  marker left** — so the parser sees two bare nouns `[plastic, pump]` with no
  connective and misses.

(Aside, not a bug: `pile of plastic`'s emit is `valve`, so the bare form sends
`inflate valve` — Zork's own auto-target for the deflated boat. That part is
fine.)

### Why I didn't "just add `-თი` as a postposition"
A `-თი → with` postposition is the obvious fix and it is **unsafe** — `-თι` is a
2-char suffix that collides with the **nominative** of real nouns whose stem ends
in `თ`:

- `ასანთი` (matchbook) → would split to `[თი, ასან]`; `ასან` ≠ stored stem
  `ასანთ` → **matchbook breaks**.
- `ყუთი` (box / mailbox) → would split to `[თი, ყუ]` → **box breaks**.

So the generic fix regresses two everyday nouns. The current design already
chose to dodge this (the `ტუმბოთ` synonym handles the bare/orphan case) — that
choice is correct.

### Options for you
1. **Leave as-is (my recommendation).** Working orphan-prompt alternative; the
   "specific reason" (vowel-stem fusion + 2-char-suffix collision) is real and
   stated. The pump is the **only** vowel-stem instrument that matters in Zork I.
2. **Narrow special-case** for the pump only: in the prep-split fallback, when a
   `verbs2` verb's object span is followed by a single bare token that is a known
   **instrument** synonym (TOOLBIT) with no prep, emit `<verb> <obj> with
   <instr>`. Solves inflate without the `-თი` collision, but it's bespoke and
   could mis-fire on other juxtapositions — needs care and its own tests.
3. **Add `ტუმბოთი` as a literal pre-mapped instrumental phrase** somewhere — feels
   like whack-a-mole; punts the general vowel-stem-instrumental problem.

**DECISION (2026-06-27, Ovid): #1 — leave as-is.** The vowel-stem `-თი` fusion +
2-char-suffix collision is a stated, specific reason; the pump is the only
vowel-stem instrument that matters in Zork I, and the orphan-prompt path solves
the puzzle in Georgian with no English.

---

## 2. `push <color> button` — adjective-modified, dative direct object  🟧

### What the player sees
- `დააჭირე ყვითელ ღილაკს` ("push yellow button") → **abstains**.
- Fully-Georgian workaround works end-to-end: bare `დააჭირე ღილაკი`
  (`push button`) → 4-candidate **Georgian** disambiguation („რომელი გულისხმობ —
  ლურჯი ღილაკი, წითელი ღილაკი, ყავისფერი ღილაკი თუ ყვითელი ღილაკი?") → reply
  `ყვითელი ღილაკი` → `> yellow button` → „წკაპ." ✅ No English at any step.

### Why it happens — TWO independent reasons
1. **Adjective-in-command.** The compound-name fix accepts noun *names*
   (`საფოსტო ყუთი`) but not an **adjective + noun** in a command
   (`ყვითელ ღილაკ…`). There is no per-object adjective-agreement machinery, and
   adjectives inflect/agree, so this is real infrastructure, not a one-liner.
2. **Dative `-ს` on a *direct* object.** `ღილაკს` is the dative form. This is the
   exact case parked in memory **`ka-dative-direct-object-deferred`**: a `-ს`
   direct object collides with the **G1 recipient `-ს`** path (give/tie
   `… ქურდს` / `… მოაჯირს`). Naively forgiving `-ს` on a direct object risks
   mis-reading non-recipient nouns as recipients — it was explicitly flagged as
   **needing your call** before anyone touches it.

### Why I didn't touch it
- It sits on the deferred `-ს` direct-object question that's yours to decide.
- Even setting `-ს` aside, the adjective-in-command half is non-trivial new
  parsing surface.
- There's a complete, **no-English** alternative already (bare verb +
  disambiguation reply), so the player is never blocked or forced into English.

### Options for you
1. **Leave as-is (my recommendation for now).** Working all-Georgian path; the
   `-ს` direct-object risk is documented and yours.
2. **Tackle the dative `-ს` direct object** as its own scoped piece (with the
   collision-safety design we'd need to agree on first) — this is the bigger
   lever and would unblock more than just buttons.
3. **Adjective-in-command** as a separate effort (per-object adjective matching).
   Larger; lower priority than #2.

**DECISION (2026-06-27, Ovid): #1 — leave as-is.** The bare-verb +
4-candidate-Georgian-disambiguation path works end-to-end with no English, and
the dative-`-ს` direct object stays parked (collision risk vs the G1 recipient
`-ს`). The memory `ka-dative-direct-object-deferred` remains the record of the
parked question; not greenlit this round.

---

### Common thread
Both are **frictions, not blockers** — each has a working, fully-Georgian path,
so no monolingual player is stuck or forced to read English. Neither was skipped
for convenience; each is held on a concrete reason (a regression risk / a parked
design decision that's yours).
