# Georgian (`ka`) combat-message coverage — scope worklist (UAT-6 follow-up, 2026-06-24)

**Why this exists.** UAT-6 (`notes/uat-6.md`) surfaced raw-English leaks in `ka`
during the live troll fight. Ovid asked to **scope the full combat family first**
(read-only) before deciding on a fix. This is that scope — every Zork I combat-message
variant, mapped against the current `ka` corpus.

**Source of truth:** `zork1/1actions.zil` "SUBTITLE MELEE" (read-only). Combat messages
live in four `<GLOBAL …-MELEE>` tables indexed by blow-result (MISSED / UNCONSCIOUS /
KILLED / LIGHT-WOUND / SERIOUS-WOUND / STAGGER / LOSE-WEAPON / HESITATE / SITTING-DUCK),
each result holding several `RANDOM-ELEMENT` variants, plus a handful of "frame" lines
printed by `VILLAIN-BLOW`/`HERO-BLOW`. `F-DEF` = defender name (troll/thief/Cyclops),
`F-WEP` = the player's current weapon.

## ⭐ Answer to "do we have the same issue with the thief combat?" — YES.

The dominant gap is **shared between the troll and thief fights**, because the
**`HERO-MELEE` table (the _player's_ own attacks) is villain-agnostic** — the same
templates render for whichever villain you hit, with only the name substituted. So the
44 missing player-attack lines leak **identically** whether you attack the troll OR the
thief: e.g. `A good slash, but it misses the thief by a mile.`, `It's curtains for the
thief as your sword removes his head.`, `The thief is battered into unconsciousness.`
The thief fight is **golden-path late game** (you must kill the thief to recover the
stolen treasures and reopen the trap door), so this is not an edge case.

The thief's **own** attacks (`THIEF-MELEE`) are _mostly_ covered (25 / 28) — only the
**3 weapon-bearing (`F-WEP`) variants leak**. Same shape as the troll's own attacks
(`TROLL-MELEE` 21 / 25 covered; the 4 misses are all `F-WEP`).

## Coverage summary

| Table                                        | Who speaks          | Runtime strings | Covered | **Missing** |
| -------------------------------------------- | ------------------- | --------------- | ------- | ----------- |
| `HERO-MELEE` (× troll, thief)                | **player attacks**  | 55              | 11      | **44**      |
| FRAME (recovery/defenseless, × troll, thief) | engine              | 10              | 4       | **6**       |
| `TROLL-MELEE`                                | troll attacks you   | 25              | 21      | **4**       |
| `THIEF-MELEE`                                | thief attacks you   | 28              | 25      | **3**       |
| `CYCLOPS-MELEE`                              | cyclops attacks you | 14              | 12      | **2**       |
| **TOTAL**                                    |                     | **132**         | **73**  | **59**      |

(Excludes `HERO-MELEE` × Cyclops — you scare the cyclops with "Ulysses"/"Odysseus"
rather than fight him to death, so the player-attacks-cyclops forms aren't normally
reachable. If wanted, add ~24 more.)

## Why coverage is patchy (root cause)

Two independent causes, both invisible to the green test suite:

1. **Probabilistic rolls → walkthrough-coverage gate blind spot.** The coverage gate
   only sees the specific `(villain, result-variant)` combinations its one recorded
   walkthrough run happened to roll. Every un-rolled variant has no `ka` string. This is
   why the corpus has `The thief slowly regains his feet.` but **not** the troll one,
   and `The thief is staggered, and drops to his knees.` but **not** the troll one.
2. **`F-WEP` lines have NO coverage mechanism at all** — not a full string, not a
   template. Every combat line that embeds the player's weapon leaks for **every**
   weapon. There are **~20 distinct `F-WEP` templates** (10 HERO, 4 troll, 3 thief, 2
   cyclops, 1 frame). These can't be fixed with per-villain full strings — they need a
   **template with a weapon-name slot in the right §4 case**, which ties directly into
   the `(with the …)` instrumental work just shipped (the weapon §4 forms already exist
   as the Group H pins).

## Two fix shapes (for whoever does the fill — native review required)

- **(A) `F-DEF`-only full strings (~39 missing):** add per-villain entries exactly like
  the existing covered ones (`zork1.ka.strings.ts`). Straightforward — the leaked troll
  lines mirror the already-translated thief lines (and vice-versa); a native reviewer
  can largely mirror the existing renderings with the other villain's name + §4 case.
- **(B) `F-WEP` templates (~20 missing):** a new combat-template family with a weapon
  slot. Reuses the Group H weapon §4 instrumental forms. More design (case agreement),
  so it's the heavier half. Until built, these leak for all weapons.

All new lines must be `NATIVE-REVIEW-DRAFT` and gated + regression-pinned, consistent
with the rest of the `ka` corpus; the `(beta)` marker stays. **Not done in this
session** (read-only scope only, per Ovid).

---

## Full missing inventory

### HERO-MELEE — player attacks (troll & thief share this table) — 44 missing of 55

`{WEP}` = player weapon (needs a template; fix-shape **B**). Plain lines are fix-shape **A**.

- `Your {WEP} misses the troll by an inch.` · `… the thief by an inch.`
- `A good slash, but it misses the troll by a mile.` · `… the thief by a mile.`
- `You charge, but the thief jumps nimbly aside.` _(troll form already covered)_
- `Clang! Crash! The thief parries.` _(troll form already covered)_
- `A quick stroke, but the troll is on guard.`
- `A good stroke, but it's too slow; the troll dodges.` · `… the thief dodges.`
- `Your {WEP} crashes down, knocking the troll into dreamland.` · `… the thief …`
- `The troll is battered into unconsciousness.` · `The thief is battered …`
- `A furious exchange, and the troll is knocked out!` _(thief form already covered)_
- `The haft of your {WEP} knocks out the troll.` · `… the thief.`
- `The troll is knocked out!` · `The thief is knocked out!`
- `It's curtains for the troll as your {WEP} removes his head.` · `… the thief …`
- `The fatal blow strikes the troll square in the heart: He dies.` · `… the thief …`
- `The troll takes a fatal blow and slumps to the floor dead.` · `… The thief …`
- `The troll is struck on the arm; blood begins to trickle down.` · `… The thief …`
- `Your {WEP} pinks the troll on the wrist, but it's not serious.` · `… the thief …`
- `The blow lands, making a shallow gash in the troll's arm!` · `… the thief's arm!`
- `The troll receives a deep gash in his side.` · `The thief receives …`
- `A savage blow on the thigh! The troll is stunned but can still fight!` · `… The thief …`
- `The troll is staggered, and drops to his knees.` _(thief form already covered)_
- `The troll is momentarily disoriented and can't fight back.` · `The thief …`
- `The force of your blow knocks the troll back, stunned.` · `… the thief …`
- `The troll is confused and can't fight back.` · `The thief …`
- `The quickness of your thrust knocks the troll back, stunned.` _(thief form covered)_
- `The thief's weapon is knocked to the floor, leaving him unarmed.` _(troll form covered)_
- `The troll is disarmed by a subtle feint past his guard.` _(thief form covered)_

### FRAME (engine recovery/defenseless lines) — 6 missing of 10

- `The troll slowly regains his feet.` _(thief form already covered)_
- `Attacking the troll is pointless.` · `Attacking the thief is pointless.`
- `The unconscious troll cannot defend himself: He dies.`
- `The unarmed thief cannot defend himself: He dies.`
- `Fortunately, you still have a {WEP}.` _(fix-shape B)_

### TROLL-MELEE — troll attacks you — 4 missing of 25 (all `F-WEP`, fix-shape B)

- `The troll charges, and his axe slashes you on your {WEP} arm.`
- `The axe hits your {WEP} and knocks it spinning.`
- `The troll swings, you parry, but the force of his blow knocks your {WEP} away.`
- `The axe knocks your {WEP} out of your hand. It falls to the floor.`

### THIEF-MELEE — thief attacks you — 3 missing of 28 (all `F-WEP`, fix-shape B)

- `A long, theatrical slash. You catch it on your {WEP}, but the thief twists his knife, and the {WEP} goes flying.`
- `The thief neatly flips your {WEP} out of your hands, and it drops to the floor.`
- `You parry a low thrust, and your {WEP} slips out of your hand.`

### CYCLOPS-MELEE — cyclops attacks you — 2 missing of 14 (all `F-WEP`, fix-shape B)

- `The Cyclops grabs your {WEP}, tastes it, and throws it to the ground in disgust.`
- `The monster grabs you on the wrist, squeezes, and you drop your {WEP} in pain.`

---

> **Scope note:** this maps `ka` only. fr/de/es have an LLM fallback, so these gaps are
> invisible there (the LLM papers over them) — but the SAME lines should be audited for
> fr/de/es corpus completeness if we want offline ("basic mode") parity, since basic
> mode has no LLM for them either. The walkthrough-coverage gate misses all of these for
> the same probabilistic reason in every language.
