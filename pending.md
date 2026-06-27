# Resolved — two `ka` findings, both FIXED 2026-06-27 (were deferred at UAT-completion run 2)

Branch `ovid/georgian-fixes`. Five findings from
`notes/uat-georgian-completion.md` were fixed first (see git log). These two were
initially left **deliberately** — each had a working Georgian alternative, and the
obvious fix either regressed other commands or needed a call on a parked design
question. Both have since been FIXED (2026-06-27) — see the per-finding DECISION
blocks below; the root-cause analysis is retained for the record.

**DECISION (2026-06-27, Ovid): FIX BOTH** (reverses the earlier "leave as-is").
Both shipped via
`docs/superpowers/plans/2026-06-27-loquor-georgian-dative-instrumental.md`:
finding 1 — `KA_FUSED_INSTRUMENTALS` map (`ტუმბოთი → with pump`, plus the
`ტუმბოთ` synonym removal + reply prep-drop); finding 2 — resolve-gated trailing
`-ს` strip in `resolveNoun`. Root-cause notes are kept below for the record.

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

**DECISION (2026-06-27, Ovid): FIXED** (was #1 leave-as-is). Shipped via the
exact-token `KA_FUSED_INSTRUMENTALS` map (`ტუმბოთი → [ით, ტუმბო]`, so the `-ით`
prep-split emits `with pump`), with the now-redundant `ტუმბოთ` synonym removed and
a reply-path leading-prep drop for the „რით?" orphan answer. The `-თი` collision
is avoided by exact-token matching — i.e. option #3 done safely, not the unsafe
blanket `-თი` postposition. `გაბერე პლასტმასი ტუმბოთი` now consumes a turn.

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

**DECISION (2026-06-27, Ovid): FIXED** (was #1 leave-as-is). Shipped via a
resolve-gated trailing `-ს` strip in `resolveNoun` (option #2): the noun is tried
as-is first, and only on a miss is one trailing `-ს` dropped and retried. The G1
recipient collision is sidestepped by construction — recipients (`ქურდს` /
`მოაჯირს`, dual-listed) and native-`ს` stems (`თას` / `სკარაბეუს` / `სახრახნის`)
resolve as-is and never reach the strip, so the parked risk does not materialize.
All four `push <color> button` commands + the disambiguation reply now work; the
adjective-in-command half resolves too, since the buttons store the adjective+noun
synonym, so once `-ს` is stripped `ყვითელ ღილაკ` matches directly. The memory
`ka-dative-direct-object-deferred` is updated to RESOLVED.

---

### Common thread

Both were **frictions, not blockers** — each already had a working, fully-Georgian
path, so no monolingual player was ever stuck or forced to read English. Neither
was skipped for convenience; each was held on a concrete reason (a regression risk
/ a parked design decision). Both are now FIXED (2026-06-27) — see the DECISION
blocks above.
