# UAT-6 — Georgian `(with the …)` named instrumental (browser, 2026-06-24)

**Branch:** `ovid/composed-line-gate` (descends from `2eadc55` + `dd93b09`).
**Method:** black-box browser play (Claude-in-Chrome) against the running dev app
(`http://localhost:5173/`), **Georgian basic mode** (`ქართული (beta)`, no model —
`ka` is corpus-only with no LLM anyway). Authoritative reads via the transcript DOM
(`div[role="log"]` `<p>` elements) and `window.loquorMisses()`; screenshots saved for
the headline lines.

**Mission (recap):** confirm in _real play_ that the parser's auto-supplied
implicit-instrument parenthetical `(with the <obj>)` renders its **named** Georgian
instrumental (e.g. `attack troll` → `(მახვილით)`), never the caseless drop-noun
`(ამით)` and never raw English. Validates the **mechanism**, not Georgian naturalness
(§4 case correctness stays with the native review).

---

## Result: ✅ PASS — mechanism confirmed in real play

The deterministic unit suite (`zork1.ka.uat.test.ts`) was green at the start (29/29).
The browser added the real-play proof the unit tests can't give:

### Instruments confirmed in real play (3 of 15) — all WEAPON class

| Instrument      | Trigger (live)                               | Observed parenthetical              | Expected (§1 table) | Verdict |
| --------------- | -------------------------------------------- | ----------------------------------- | ------------------- | ------- |
| **sword**       | `attack trophy case` (held, sole weapon)     | `(მახვილით)`                        | `(მახვილით)`        | ✅      |
| **sword**       | `attack troll` — **live combat, ×6 rounds**  | `(მახვილით)` (own line every round) | `(მახვილით)`        | ✅      |
| **nasty knife** | `cut rope` (Attic; sword dropped first)      | `(საზიზღარი დანით)`                 | `(საზიზღარი დანით)` | ✅      |
| **bloody axe**  | `attack troll` (post-kill, GWIM auto-supply) | `(სისხლიანი ცულით)`                 | `(სისხლიანი ცულით)` | ✅      |

Each parenthetical:

- showed the **named** Georgian instrumental — **never `(ამით)`**, **no Latin
  letters**, matching the §1 table exactly;
- rendered as **its own display line** (`<p lang="ka">`), distinct from the verb's
  result line (see §6 below);
- logged **zero** `loquorMisses()` entries for the parenthetical itself.

Route notes: Living Room (resumed autosave) → `take sword` → `attack trophy case`
(static sword test). → `turn on lantern`, `east` (Kitchen), `up` (Attic) → `take knife`,
`drop sword`, `cut rope` (nasty-knife test). → back down, `open trap door`, `down`
(Cellar), `north` (Troll Room) → 6× `attack troll` to kill the troll (sword as sole
weapon; live-combat sword test) → `take axe`, `drop sword`, `attack troll` (bloody-axe
test: GWIM auto-supplies the lone weapon before the verb finds no troll).

### ✅ §6 glued-line concern — RESOLVED (does not occur)

The hand-off flagged the risk that in **live combat** the `(with the sword)` line could
get _glued_ to the combat result on one display line and so miss the string pin. **It
does not.** Across all 6 live `attack troll` rounds the DOM showed `(მახვილით)` as its
**own** `<p lang="ka">`, always separate from the (English or Georgian) combat-result
`<p>` that followed. GlkOte emits the parenthetical newline-terminated regardless of
verb, so the same own-line behavior held for `attack trophy case`, `cut rope`, and the
post-kill `attack troll` too. No normalization/gluing observed.

### ✅ Accessibility (sword line)

DOM inspection of the `(მახვილით)` line:

- it is a `<p lang="ka">` — Georgian content, **not** an English container;
- its ancestor is `<div role="log" aria-live="polite" aria-label="Game transcript">`,
  so a screen reader **announces** the translated parenthetical via a polite live
  region (no silent DOM mutation);
- the line is pure Georgian (no embedded English to voice-switch for).
- The theme toggle exposes a correct accessible name (`"Switch to dark theme"` /
  `"Switch to light theme"`).

### ✅ Responsive / contrast (sword + axe lines)

- Measured: the parenthetical line does **not** overflow its container
  (`overflowsContainer: false`), and the transcript scroll container has **no**
  horizontal overflow (`scrollWidth == clientWidth`). The widest pinned form
  `(ხელის ჰაერის ტუმბოთი)` is still a short phrase that wraps like any transcript text —
  **no feature-specific overflow surface.**
- Renders legibly with good contrast in **both** light and dark themes (verified by
  theme toggle + screenshot).
- _Caveat:_ a true 320px viewport needs a human-dragged narrow window (`resize_window`
  is a no-op on this macOS Chrome, per `notes/uat.md`). Given the single-short-word
  nature of the line, the residual risk is negligible; flagged here for completeness.

### Instruments NOT reached this session (12 of 15) — covered by unit-test pins

Honest coverage statement: the following were **not reached in real play** this session
(deep-dungeon Tier-2/Tier-3) and are **covered by the deterministic unit-test pins**
(`zork1.ka.uat.test.ts`, all green): `match` (FLAME), `stiletto`, `sceptre`, `rusty
knife`, `torch`, `pair of candles`, `shovel`, `screwdriver`, `wrench`, `skeleton key`,
`viscous material`, `hand-held air pump`. Note: **all three reached instruments are
WEAPON class.** FLAME and TOOL class GWIM verbs were not exercised live — but Loquor's
rendering path (string-pin beats `(ამით)` template in `match.ts`) is **bit-class
independent**; the bit class only governs _which Zork verb_ fires GWIM, not how the
parenthetical is rendered. The 15 strings are all unit-pinned. (A future deep-dungeon
pass could confirm FLAME via the matchbook in the Dam Lobby and TOOL via the
screwdriver/wrench/putty in the Maintenance Room — both on the documented dam route.)

---

## Incidental finding (OUT OF SCOPE, pre-existing) — ⚠ raw-English combat-line leaks in `ka`

While driving the live troll fight (the headline combat use), **6 player-attack combat
result lines leaked raw English** in `ka` (logged in `loquorMisses()`):

| English line (leaked, `kind:"line"`, `language:"ka"`)         | When           |
| ------------------------------------------------------------- | -------------- |
| `The troll is staggered, and drops to his knees.`             | troll hit      |
| `The troll slowly regains his feet.`                          | troll recovers |
| `A good slash, but it misses the troll by a mile.`            | player miss    |
| `A good stroke, but it's too slow; the troll dodges.`         | player miss    |
| `The force of your blow knocks the troll back, stunned.`      | troll stunned  |
| `It's curtains for the troll as your sword removes his head.` | killing blow   |

By contrast, the **troll's-own-attack** variants and the death-fog line **were**
translated (e.g. `ტროლი თავის ცულს ააქნევს, მაგრამ ააცდენს.` = "the troll swings his axe
but misses"; the black-fog corpse-vanish line; "your sword is no longer glowing"). So
it is specifically the **player-attack-result randomization variants** that the `ka`
corpus is missing.

**Why this matters (north star):** troll combat is on the **golden path** — every
player fights the troll. Combat messages are **probabilistic**, so the
walkthrough-coverage gate only captured the specific variants that appeared in its
recorded run; the others leak. Because `ka` has **no LLM net**, a Georgian player who
fights the troll **is forced to read English** — exactly the north-star violation
CLAUDE.md warns about.

**Scope / classification:** this is **NOT** the `(with the …)` feature (that parenthetical
passed cleanly), **NOT** a regression from this branch (the branch only added the 15
instrumental string pins; it never touched combat lines), and **NOT** a naturalness
doubt. It is a **pre-existing, separate output-corpus gap**. Fixing it well requires
authoring native Georgian combat strings (native-review territory — not machine
translation, and not this branch's scope). **Raised with Ovid for a decision** rather
than silently passed (per CLAUDE.md "Player experience overrides product decisions —
talk to me first") or hacked in with unreviewed Georgian. Likely a broader pass: combat
variants across troll **and** thief/cyclops, and other enemies.

### Minor (off-path) leak — also pre-existing

`attack trophy case` (an absurd action used only as the §2 "handy object" trigger) →
`I've known strange people, but fighting a trophy case?` leaks raw English in `ka`
(`loquorMisses()` entry). Off the golden path; same class as the combat leak (no `ka`
LLM net). Noted for completeness; lower priority.

---

## Verdict

**The feature under test — the Georgian `(with the …)` named instrumental — PASSES in
real play.** Three instruments confirmed (sword in static + 6× live combat, nasty knife,
bloody axe), the §6 glued-line concern is resolved, a11y and responsive/contrast hold,
and the parenthetical never leaked English and never fell back to `(ამით)`. The `(beta)`
/ `NATIVE-REVIEW-DRAFT` markers stay (naturalness/§4 case remain with the native review).
The remaining 12 forms are covered by the deterministic unit-test pins.

One **out-of-scope, pre-existing** golden-path leak was surfaced (raw-English
player-attack combat lines in `ka`) and is flagged for Ovid + the native-review track —
no code changed for it this session.
