# Loquor Input Translation — Georgian dative `-ს` & fused instrumental `-თი`

**Status:** Approved design (brainstormed 2026-06-27; revised same day after an
adversarial `/pushback` review that implemented + ran the suite). Branch:
`ovid/georgian-fixes`. Closes the two `ka` frictions parked in `/workspace/pending.md`.

**Pushback outcome:** F2 (dative `-ს`) verified solid as written — collision
sweep, G1 trace, and full regression all green. F1 (fused instrumental) had a
**blocker the first draft missed**: the new map collides with the round-trip
gate's reconstruction of an already-stored synonym (`ტუმბოთ`). §2 below now
carries the fix (drop the redundant synonym) **and** a small reply-path
enhancement that turns the fix into a net win — see §2.3.

**Source-of-truth lineage:** Extends the Georgian Phase-2 input design
(`2026-06-24-loquor-georgian-input-design.md`, the top `ka` authority) with two
narrow morphology gaps it did not cover. No supersession — this is additive: two
new collision-safe pre-stage rules plus a resolve-gated noun fallback. `ka`
remains Zork-I-only, no input LLM, deterministic.

**Reverses two prior decisions** (both explicitly re-opened by Ovid 2026-06-27):

- `pending.md` §1 / §2 — "leave BOTH as-is" (2026-06-27). Re-opened: the
  imperative is that Georgian speakers can play in *their own language*, and a
  natural command silently missing is a real friction even with a working
  workaround.
- The `ka-dative-direct-object-deferred` memory — the dative `-ს` direct object
  was parked as "risky (collides with the G1 recipient `-ს`), needs Ovid's call."
  This design defuses that risk by construction (§3.2) and is greenlit.

---

## 0. Why this matters (read this first)

A monolingual Georgian player who types perfectly good Georgian and gets *no
turn* has been told, in effect, "your language doesn't count." Both commands
below are the natural, literary form a careful speaker reaches for:

- `გაბერე პლასტმასი ტუმბოთი` — "inflate the plastic with the pump."
- `დააჭირე ყვითელ ღილაკს` — "push the yellow button."

Today both **abstain**. Each has a working all-Georgian workaround (the orphan
prompt / the disambiguation reply), so no one is *blocked* — but the workaround
is a detour the player should never need. `ka` has **no LLM net**, so the
deterministic path is the only path: a gap here is a guaranteed dead command,
never silently rescued. Fixing it is the difference between "I can technically
finish" and "the game speaks my language."

The good news, confirmed against the **shipping** lexicon (`KA_CORE` +
`KA_ZORK1` + `ZORK1_VOCAB`), is that both gaps are far smaller than
`pending.md` feared:

| Command | Today |
|---|---|
| `დააჭირე ყვითელ ღილაკი` (push yellow button, **nominative**) | ✅ `push yellow button` |
| `დააჭირე ყვითელ ღილაკს` (push yellow button, **dative**) | ❌ miss |
| `გაბერე პლასტმასი ტუმბოით` (inflate … pump, **colloquial `-ით`**) | ✅ `inflate valve with pump` |
| `გაბერე პლასტმასი ტუმბოთი` (inflate … pump, **fused `-თი`**) | ❌ miss |

So:

- **Finding 2 is NOT "missing adjective-in-command machinery."** Adjective+noun
  already parses — `ყვითელ ღილაკ` is a stored synonym and works in the
  nominative. The *only* blocker is the dative `-ს` on `ღილაკს`. No new parsing
  surface is needed.
- **Finding 1 is NOT a "general vowel-stem-instrumental problem."** The
  colloquial `-ით` already works; only the one fused surface form `ტუმბოთი`
  fails, and the pump is the only vowel-stem instrument in Zork I — a single
  known token.

---

## 1. Goal & scope

**Goal.** Make the two natural Georgian commands above consume a turn, with the
correct canonical emit, without regressing any other `ka` command.

**In scope (Zork I, `ka` only, deterministic):**

1. **F1 — fused instrumental.** `ტუმბოთი` ("with the pump") → `inflate valve
   with pump`.
2. **F2 — dative `-ს` direct object.** A dative head noun (`ღილაკს`, and
   adjective-modified `ყვითელ ღილაკს`) resolves to its nominative stem. General:
   any datived direct object, not just buttons.

**Out of scope / non-goals:**

- Any LLM wiring for `ka` (the maps stay `ka`-presence-gated; no `LexLang` entry,
  no few-shots, no `fallbackResolve`).
- fr/de/es behavior (unchanged — see §5).
- New vowel-stem instruments beyond the pump, or new fused case forms. Add only
  if a future UAT surfaces one; F1's map is the closed, gate-tested seam for it.
- Zork II/III (`ka` has no lexicon there; stays Phase-1).

---

## 2. F1 — fused instrumental (`ტუმბოთი`)

### Root cause
The instrument is the **pump**, a vowel-final stem `ტუმბო`. Georgian's
instrumental `-ით` **fuses** onto a vowel stem as `-თი`, so the literary form is
`ტუმბოთი`, not `*ტუმბოით`. `expandGeorgian` has no `-თი` suffix (deliberately —
see below), so it falls through to the nominative `-ი` strip → `ტუმბოთ`. That
bare token *does* resolve (the pump is dual-listed as `ტუმბოთ`), but **no `with`
marker survives** — the parser sees `[plastic, pump]`, two bare nouns with no
connective, and misses.

`-თი` cannot be added as a generic postposition: it is a 2-char suffix that
collides with the **nominative** of stems ending in `თ` — `ასანთი` (matchbook) →
`[თი, ასან]` breaks the matchbook; `ყუთი` (box) → `[თი, ყუ]` breaks the box. No
surface-only rule can tell the fused instrumental of a vowel stem apart from a
`თ`-stem nominative; you must know the stem. That is why the closed-set lexicon
is the right tool.

### Fix — a closed "fused instrumental" map, exact-token
Add an optional field to `CoreLexicon`:

```ts
// types.ts
/** ka only. Closed map of fused-instrumental SURFACE forms → bare stem, for
 *  vowel stems where -ით fuses to -თი (so the generic -ით split can't fire).
 *  expandGeorgian emits [ით, stem] on an exact-token hit; the value MUST resolve
 *  as a noun and the emitted prep 'ით' MUST be a key in postpositions. */
fusedInstrumentals?: Readonly<Record<string, string>>
```

```ts
// ka.core.ts
const KA_FUSED_INSTRUMENTALS: Readonly<Record<string, string>> = {
  ტუმბოთი: 'ტუმბო', // pump (vowel stem): instrumental -ით fuses to -თი
}
// … KA_CORE: { …, fusedInstrumentals: KA_FUSED_INSTRUMENTALS }
```

`expandGeorgian` takes the map and checks it **first**, before the suffix loop,
so the token is never `-ი`-stripped to `ტუმბოთ`:

```ts
const fused = fusedInstrumentals[token]
if (fused) { out.push('ით', fused); continue } // 'ით' → prep-split reads preps['ით']='with'
```

After this, the object span `[პლასტმასი, ტუმბოთი]` → `[პლასტმას, ით, ტუმბო]`; the
existing `-ით` prep-split emits `inflate valve with pump` (`valve` is the pile of
plastic's auto-target emit — Zork's own inflate target — and is correct, matching
the colloquial `ტუმბოით` path that already works).

### Why it's safe
Exact-token match against a closed set. `ასანთი`/`ყუთი` are not keys, so they
keep their current (correct) handling. The map is gate-tested (§4); a future
entry must round-trip and UAT-pin like any lexicon data.

### 2.2 Round-trip blocker — drop the redundant `ტუმბოთ` synonym (REQUIRED)
`ka.zork1.ts:110` currently dual-lists the bare residue `ტუმბოთ` as a pump
synonym. The **round-trip gate** (`roundtrip.test.ts`'s `toInputForm`) reattaches
a nominative `-ი` to every consonant-final stored stem to simulate player input —
so it reconstructs `ტუმბოთ` → `ტუმბოთი` and asserts `take ტუმბოთი` → `take pump`.
Once F1 routes `ტუმბოთი` to the instrumental, that becomes `take with pump` →
miss, and **the gate goes red** (reproduced by the pushback review: 1 failure).
The pushback also confirmed there is no *other* `ს`/`თ`-residue collision — this
is the only one.

Fix: **remove `ტუმბოთ` from the synonym list** (leave `['ხელის ჰაერის ტუმბო',
'ტუმბო']`). With it gone, the gate reconstructs only the vowel-final citation form
`ტუმბო` (unchanged) and `ხელის ჰაერის ტუმბო`, both of which resolve. `ტუმბოთ`
appears nowhere else in `src` (grep-verified: only the line-110 value + two
comments).

### 2.3 Reply-path enhancement — accept the case-marked instrumental answer
Removing `ტუმბოთ` would *regress* one real path: the orphan prompt is **„რით?"**
("with what?", *instrumental*), so the grammatically natural answer is the
instrumental **`ტუმბოთი`**, not bare `ტუმბო`. Today `resolveNounReply('ტუმბოთი')`
→ `pump` (via the `ტუმბოთ` residue, probe-verified); dropping `ტუმბოთ` would make
it miss. Worse, the *colloquial* `ტუმბოით` reply **already** misses today
(probe-verified `null`) — `resolveNounReply` does a single `resolveNoun` over the
whole span, so a leading split prep (`[ით, ტუმბო]`) strands it.

Fix (a net improvement, not just a patch): in `resolveNounReply`, after the
Georgian pre-stage, if the result **leads with a prep token** drop it and retry:

```ts
if (core.postpositions)
  tokens = expandGeorgian(tokens, core.postpositions, core.fusedInstrumentals)
let hit = resolveNoun(tokens, core, nouns, vocab, scene)
// ka: a reply to an instrumental prompt ("რით?") arrives case-marked
// (ტუმბოთი/ტუმბოით → [ით, ტუმბო]); drop a leading prep so the bare instrument
// resolves. Gated on core.postpositions (ka only — only expandGeorgian can
// synthesize a leading prep token); fr/de/es never reach this.
if (!hit && core.postpositions && tokens.length > 1 && core.preps[tokens[0]])
  hit = resolveNoun(tokens.slice(1), core, nouns, vocab, scene)
return hit ? hit.emit : null
```

Net result: the natural instrumental orphan answer `ტუმბოთი` → `pump` is
**preserved**, and the previously-broken `ტუმბოით` reply now works too. Georgian
prep tokens (ში/ზე/ით/დან/თან) are never nouns, so the drop can't mis-resolve a
real answer.

---

## 3. F2 — dative `-ს` direct object (`ღილაკს`)

### Root cause
`დააჭირე ყვითელ ღილაკს` → object span `[ყვითელ, ღილაკს]`. `ღილაკს` ends in `ს`,
which is **not** a splittable postposition (it collides with the genitive `-ის`)
and is **not** the nominative `-ი`, so `expandGeorgian` leaves it attached. The
stored synonym is `ყვითელ ღილაკ` (nominative stem), so `ყვითელ ღილაკს` misses.
The nominative form `დააჭირე ყვითელ ღილაკი` already works — the *only* difference
is the trailing `-ს`.

### Fix — a resolve-gated trailing-`-ს` strip in `resolveNoun`
At the tail of `resolveNoun` (after the as-is lookup and the article-strip loop
both miss), gated on `core.postpositions` (`ka`-only):

```ts
// Georgian dative direct object (ka only). A dative -ს on the HEAD noun
// (ღილაკს "button", ყვითელ ღილაკს "yellow button") has no postposition split
// and isn't the -ი strip, so it arrives attached and misses. Resolve-GATED:
// ONLY after the as-is lookups miss, retry with a single trailing -ს dropped
// from the LAST token. Commit only a hit.
if (core.postpositions && span.length > 0) {
  const last = span[span.length - 1]
  if (last.length > 1 && last.endsWith('ს')) {
    const hit = tryResolve([...span.slice(0, -1), last.slice(0, -1)])
    if (hit) return hit
  }
}
```

`[ყვითელ, ღილაკს]` → strip → `[ყვითელ, ღილაკ]` → `ყვითელ ღილაკ` → `yellow button`.
Bare `[ღილაკს]` → `[ღილაკ]` → the shared-dictionary-word path emits `button` →
`push button` (the Z-parser disambiguates), exactly as the bare nominative
`ღილაკი` does today.

### Why it's safe — the resolve-first gate IS the collision defense
The parked risk (`ka-dative-direct-object-deferred`) was that forgiving `-ს`
mis-reads recipients or native-`ს` stems. The strip is a **fallback that fires
only when the as-is form already missed**, so every form that legitimately ends
in `ს` resolves *before* it and is never touched:

- **Dative recipients** `ქურდს` (thief), `მოაჯირს` (railing) — dual-listed in
  `KA_ZORK1`, so they resolve as-is. The G1 path keys on the raw token
  `tokens[len-1]` and is unaffected: `მიეცი კვერცხი ქურდს` still emits
  `give egg to thief`.
- **Native-`ს` stems** `თას` (chalice), `სკარაბეუს` (scarab), `სახრახნის`
  (screwdriver) — stored forms; resolve as-is, so the strip never reaches them.
  This also keeps the **round-trip gate** green (it feeds stored forms back; they
  all resolve before the fallback).

The only span that reaches the strip is one that misses as-is *and* becomes a
valid noun after dropping one `-ს` — i.e. a genuine dative direct object.
Dropping the dative marker is semantically the same noun, so the repair is always
correct, never a different object. A span that doesn't resolve after stripping
(e.g. the whole-remainder attempt `კვერცხ ქურდს` in a give-command) still misses
and falls through to G1 — no regression.

`resolveNoun` is shared by every object/instrument/recipient/reply path; because
the rule is resolve-gated it can only turn misses into hits, never change an
existing hit.

---

## 4. Testing — the gates are the safety net

`ka` has no LLM net and the `-ი`/`-ს` strips are "gate-enforced safe for the
closed Zork I noun set, not provably safe in general," so the gates are
load-bearing. Add to `parse.ka-uat.test.ts` (or the walkthrough suite):

**F1 pins (command path)**
- `გაბერე პლასტმასი ტუმბოთი` → `inflate valve with pump` (the fix).
- `გაბერე პლასტმასი ტუმბოით` → `inflate valve with pump` (colloquial still green).
- `გააღე ყუთი` → `open mailbox` and `აიღე ასანთი` → `take match` (the `-თი`
  collision nouns untouched).

**F1 pins (round-trip blocker + reply path — §2.2 / §2.3)**
- After dropping `ტუმბოთ`, the round-trip suite stays green (the regression the
  pushback reproduced is gone).
- `resolveNounReply('ტუმბოთი')` → `pump` (natural instrumental orphan answer,
  preserved) and `resolveNounReply('ტუმბოით')` → `pump` (previously missed —
  now fixed). `resolveNounReply('ტუმბო')` → `pump` (bare, unchanged).

**F2 pins (command path)**
- `დააჭირე ლურჯ/წითელ/ყავისფერ/ყვითელ ღილაკს` → `push blue/red/brown/yellow button`.
- `დააჭირე ღილაკს` → `push button`.
- Regression: `მიეცი კვერცხი ქურდს` → `give egg to thief`;
  `მიაბი თოკი მოაჯირს` → `tie rope to railing`.
- Regression: chalice/scarab/screwdriver in **both** nominative and dative still
  resolve (e.g. `აიღე სახრახნისი` and `აიღე სახრახნისს` → `take screwdriver`).

**F2 pin (reply path)**
- `resolveNounReply('ყვითელ ღილაკს')` → `yellow button` (the disambiguation
  reply — currently misses; the §3 strip in `resolveNoun` repairs it since
  `resolveNounReply` calls `resolveNoun`). This pins the all-Georgian
  disambiguation workaround against a future `resolveNounReply` refactor.

**Full suite.** Run the round-trip, walkthrough, and `ka`-uat suites; the
string-inventory/coverage gates for output are untouched. Green = the closed-set
safety holds.

**Correct, not a quirk (noted to pre-empt a false F2 flag):** `მიეცი ოქრო ქურდს`
→ `give pot to thief`. This is faithful to Zork — there is no separate "gold"
object; `gold` is one of the pot of gold's own dictionary words (vocab synonyms
`['gold', 'pot', 'treasure']`, emit `pot`), exactly as typing "gold" does in the
original English game. The internal `pot` emit is never shown to the player (they
typed Georgian, see Georgian output; canonical is hidden in debug-off). Unchanged
by this work — listed only so a reviewer doesn't attribute it to the F2 recipient
path.

---

## 5. Multilingual & `ka` scoping (CLAUDE.md compliance)

Both fixes are **deterministic `ka`-input** changes — the kind CLAUDE.md says
*does* apply to `ka` and that `ka` most needs:

- F1 is gated on `core.fusedInstrumentals` (present only for `ka`).
- F2 is gated on `core.postpositions` (present only for `ka`), and the `'ს'`
  literal is the Georgian character **U+10E1**, not ASCII `s` — so a French/
  Spanish plural ("les boutons", "los botones") is never stripped even if it
  reached this code (it can't: the gate is `ka`-only).
- No `LexLang`-keyed (LLM) machinery is touched: no few-shots, no prompt tables,
  no `fallbackResolve`. The new maps stay `ka`-presence-gated so an LLM-language
  entry is structurally absent.

fr/de/es: unchanged.

---

## 6. Bookkeeping (part of the work, not after)

- `pending.md`: flip §1 and §2 from "leave as-is" to "fixed 2026-06-27 (this
  spec)"; keep the root-cause notes for the record.
- Memory `ka-dative-direct-object-deferred`: update to "resolved via the
  resolve-gated `-ს` strip (recipients/native-`ს` stems resolve as-is, so the G1
  collision is sidestepped by construction)."
- On merge, add this spec under the Georgian authorities in CLAUDE.md's
  source-of-truth list (beneath `2026-06-24-loquor-georgian-input-design.md`).

---

## 7. Files touched

- `src/llm/lexicon/types.ts` — add optional `fusedInstrumentals` to `CoreLexicon`.
- `src/llm/lexicon/ka.core.ts` — `KA_FUSED_INSTRUMENTALS`; wire into `KA_CORE`.
- `src/llm/lexicon/expandGeorgian.ts` — new param (default `{}`); exact-token
  check first.
- `src/llm/lexicon/ka.zork1.ts` — **drop the `ტუმბოთ` synonym at line 110**
  (§2.2, the round-trip blocker fix).
- `src/llm/lexicon/parse.ts` — pass the map at both `expandGeorgian` call sites
  (`parseLexicon`, `resolveNounReply`); resolve-gated `-ს` strip in `resolveNoun`
  (§3); leading-prep drop in `resolveNounReply` (§2.3).
- `src/llm/lexicon/parse.ka-uat.test.ts` (and/or `parse.ka-walkthrough.test.ts`)
  — the command + reply pins in §4.
- `src/llm/lexicon/expandGeorgian.test.ts` — F1 unit pin + collision-noun pins.
- `pending.md`, the memory file (§6).
