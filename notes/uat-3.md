# UAT-3: Zork I to (near-)completion in FR/DE/ES via the NL v2 pipeline

**Date:** 2026-06-10
**Tester:** Claude (ovid-uat)
**Branch:** ovid/fable
**Build under test:** NL layer **v2** (deterministic-first multilingual pipeline,
per `docs/superpowers/specs/2026-06-09-loquor-nl-multilingual-design.md`)
**Mode:** `?model=full`, fresh `restart`, languages rotated via the picker
(Français / Deutsch / Español; English only through the designed escape hatches).

**Result: game effectively COMPLETED through the NL layer.**
**Score 340/350 (rank Wizard), 470 moves, all 19 treasures in the trophy case.**
The final 10 points (whisper → ancient map → stone barrow) are unreachable this
run because I died twice (−10 each: one combat-RNG death, one tester error —
walked into a dark cellar with the lamp off, the exact UAT-2 death #2). Both
deaths are gameplay, not NL bugs; both recoveries (ghost-walk to the Altar,
`prie` → resurrection, item recovery) were performed **through the NL layer in
French**.

Contrast with UAT-2: that run stopped at 272/350 with ~20+ forced English-off
toggles and called the layer "unreliable for unaided play". This run needed
**zero NL-off toggles** — the picker stayed on a non-English language for the
whole game. English text was used only via the two designed escape hatches
(bare-vocab passthrough and quoted commands), each use itself a test.

---

## Verdict up front

The v2 deterministic-first pipeline is a step-change. **Every HIGH-severity
UAT-2 finding is fixed** (verified by replaying the original failing inputs at
the original game locations). The remaining issues are: one design-vs-implementation
gap (comma-separated clauses still not split — F-D's exact input still drops
its middle clauses), a handful of FR lexicon data gaps that dump common verbs
to the LLM fallback (where the old wrong-object behaviour can resurface), the
unsolved elided-verb clause in compounds, and a few odd-but-working emit forms.

---

## UAT-2 regression matrix (replayed at the original sites)

| UAT-2 finding                                  | Probe replayed                                                                     | v2 result                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| F-A silent type-ahead drop                     | typed `nimm das Ei` during `…thinking`                                             | ✅ FIXED — queued (dimmed line), ran after                                                   |
| F-D 4-clause compound drops middles            | `ouvre la vitrine, mets le tableau dedans, lâche le couteau et prends l'épée`      | ❌ **STILL FAILS** — see N-1                                                                 |
| F-E `dedans` anaphora                          | `mets le tableau dedans`                                                           | ❌ still wrong — see N-2                                                                     |
| F-F `trappe`→trophy case                       | `ouvre la trappe` (case salient, repeatedly)                                       | ✅ FIXED — `open trapdoor` every time, deterministic                                         |
| F-H poisoned context rewrites English          | `"open trap door"` quoted + bare vocab lines                                       | ✅ FIXED — verbatim passthrough, no re-planning                                              |
| F-L `lampe`→torch                              | `éteins la lampe` / `prends la torche et éteins la lampe` with BOTH lights present | ✅ FIXED — lampe→lantern, torche→torch                                                       |
| F-M `pose`→take (inverse)                      | `pose le dépliant`, `pose le cercueil`, `pose la pompe`…                           | ✅ FIXED — always `drop`                                                                     |
| F-N `agite/secoue`→take (blocks wave puzzle)   | `agite le sceptre` at End of Rainbow                                               | ✅ FIXED — `wave sceptre`, rainbow solid                                                     |
| F-P intra-compound object bleed                | `lâche l'épée et prends le cercueil`                                               | ✅ FIXED — clause 2 bound correctly                                                          |
| F-Q drop→`down` at End of Rainbow              | `pose le cercueil et ouvre le cercueil` there                                      | ✅ FIXED — `drop coffin` + `open coffin`                                                     |
| F-R abstain leaks raw French                   | `Ulysse`, `gonfle le plastique…`                                                   | ✅ FIXED — graceful notice, no leak, no turn (but see N-3)                                   |
| F-R `sors du bateau`                           | `sors du bateau`                                                                   | ✅ FIXED — `exit raft`                                                                       |
| F-S/F-T banking broken both languages          | `mets le X dans la vitrine` ×12 with "collection of treasures" shown               | ✅ FIXED — 12+ treasures banked in French                                                    |
| F-U localized meta                             | `inventaire`, `diagnostic`                                                         | ✅ FIXED — `inventory`, `diagnose`                                                           |
| F-V `clé` ambiguity                            | `prends la clé` (wrench in room) & `lâche la clé` (key carried)                    | ✅ FIXED — scope-preferred candidate both times                                              |
| F-W buttons not in scope                       | `appuie sur le bouton jaune`                                                       | ✅ FIXED — `push yellow button` → Click                                                      |
| F-X `sonne la cloche`→turn on                  | at Entrance to Hades                                                               | ✅ FIXED — `ring bell`; **entire timed exorcism done in French**                             |
| F-Z over-specified emit (`hand-held air pump`) | `coge la bomba`                                                                    | ✅ FIXED — `take pump`                                                                       |
| F-AA stale scope / inventory hole              | `creuse le sable avec la pelle`, `ouvre la bouée` (carried)                        | ✅ FIXED — `dig sand with shovel`, `open buoy`                                               |
| F-BB `Ulysse`→look                             | `Ulysse` at Cyclops Room                                                           | ◐ IMPROVED — graceful abstain (no wrong action, no turn); `ulysses` passes through and works |
| F-CC `remonte le canari`→climb                 | at Forest Path                                                                     | ✅ FIXED — `wind up canary`, bauble drops                                                    |
| F-DD `écho`→examine bell                       | at Loud Room                                                                       | ✅ FIXED — diacritic-folded to vocab `echo`, puzzle solved                                   |
| UAT-1 F-8 diagonals                            | `va au sud-est` etc., ~12 uses                                                     | ✅ all correct, incl. DE `Südosten`/ES `noreste`                                             |

Other v2 features verified: language picker (Off/English/Français/Deutsch/Español,
sticky, mid-game switching clean), `you` label vs `>` prefixes, `$VERIFY`
deterministic, `restart` + Y/N confirmation passthrough, quoted-string escape
(`"open mailbox"` style — used ~8 times, always verbatim), DE separable verbs
(`schalte die Laterne ein/aus` → turn on/off, `lass die Kerzen fallen` → drop),
soft no-ops not aborting compounds, real failures aborting with "Ran N of M
actions.", 2-object instruments (`tourne le boulon avec la clé`,
`tourne l'interrupteur avec le tournevis`, `creuse le sable avec la pelle`,
`attache la corde à la rampe`), 3-slot give (`donne l'œuf au voleur`), full
combat (troll & thief killed with FR commands), `take canary from egg`
(`prends le canari de l'œuf`), misspelling `decends`→down via LLM.

---

## New findings (N-#), by severity

### N-1 (HIGH, design-vs-impl gap) — comma-separated clauses are not split; F-D's exact input still silently drops middle clauses

`ouvre la vitrine, mets le tableau dedans, lâche le couteau et prends l'épée`
ran only `open case` + `take sword`. Console shows why: the splitter only split
on `et`, sending the whole comma-glob
`"ouvre la vitrine, mets le tableau dedans, lâche le couteau"` to the LLM as
ONE clause, which collapsed it to `open case`. The design (§4) says split on
`and/then/et/puis/ensuite/y/und` + `.;` — **comma missing** — yet §10 claims
"UAT-2 F-D's silent middle-clause drop is structurally gone". It isn't, for
comma-joined clauses.

**NOT vibed, deliberately:** `splitClauses` documents "Commas are NOT
separators (**locked decision 1**)" from the compound-commands design — and
for good reason: splitting on commas would shatter noun lists
(`prends la corde, le couteau et la lampe`) into verbless fragments that abort
the sequence. The v2 claim and locked decision 1 are in direct conflict;
resolving it (comma-split + deterministic verb distribution into verbless
clauses — which would also fix N-4 — vs. teaching the LLM prompt to emit
multiple commands) is a design call for Ovid, not a vibe.

### N-2 (MEDIUM) — `dedans` container anaphora binds to the wrong antecedent

`mets le tableau dedans` (right after `open case` + `take sword`) →
`put painting in sword` ("You can't do that."). Stage = lexicon,
antecedent = `sword` (most recent noun). The design's F-E guard (antecedent ≠
direct object) passes because sword ≠ painting, but the antecedent should be
the salient _container_ (trophy case), not the last-mentioned noun. Failure is
visible/harmless, explicit nouns work fine. Suggested fix: for container
anaphora, prefer the most recent _container-like_ antecedent or fall through
to the LLM. Not vibed (semantics change in tracker/parser).

### N-3 (MEDIUM) — FR core-lexicon gaps dump common verbs to the LLM, where wrong-object binding can resurface

Confirmed gaps this run (console `stage:"llm"` for all):

- `gonfle le plastique avec la pompe` → LLM garbage (`"inflamp up"`) → abstain
  notice. **Root cause was NOT missing data**: `gonfle → inflate` and all the
  nouns were present. The extracted vocab stores the v3-truncated dictionary
  form `inflat`, the roundtrip GATE was made truncation-aware, but the runtime
  `verbArityOk` in `parse.ts` was not — so `inflate` never validated and every
  inflate clause silently missed to the LLM. → FIXED (vibed: truncation-aware
  verb membership in parse.ts + regression test).
- `entrer/monter dans le bateau` → LLM → **`enter river`** both phrasings (boat
  WAS in scope; salience bias picked the river — nearly fatal swim, game
  declined it). This is the one place the old F-F/F-Q wrong-object class
  resurfaced, and only because the deterministic layer missed: a LEADING
  preposition is only parsed for 'to', so `entre dans X` could never match.
  → FIXED for `entre/entrez/rentre/rentrez dans X` (vibed: verb idioms +
  test); `monte dans X` still falls through (monter = climb is correct
  elsewhere).
- `lancer` → `throw raft in river` (literal throw; harmless no-op). Not vibed
  (launch vs throw nuance needs care).
- `fais descendre le panier` (causative) → `drop coal` (wrong). `"lower basket"`
  quoted works. Not vibed.
- `pose tout` → `drop trail` ("tout" quantifier unmapped). `"drop all"` works.
  Not vibed — "all" is not a vocab noun, so this needs a parser feature
  (quantifier passthrough), not a data row.
- `prends le jade` → abstain ('jade' is the same word in French but was missing
  from the FR noun words; `figurine` worked). → FIXED (vibed: data row).
- `ouvre le couvercle` (machine lid) → LLM → `open trunk`. `couvercle` was
  absent from the FR nouns. → FIXED (vibed: `couvercle` → machine, whose vocab
  synonyms include `lid`).

### N-4 (MEDIUM) — elided-verb clause in compounds falls to the LLM and binds poorly when the object isn't in room scope

`nimm das Seil und das Messer` → `take rope` + **`take kitchen table`** (clause 2
`das Messer` has no verb → LLM → invented object; knife was in scope but the
model picked the table). Same shape: `prends les bougies et le livre` →
`take candles` + `take page` (lucked into the book); `prends la lanterne et
l'ail et le bracelet` (3 clauses) worked when all objects were in room scope.
Suggested fix: when a clause has no verb and the previous clause's verb is
known, distribute the verb deterministically (`das Messer` → `nimm das Messer`)
and re-run the lexicon parse. Not vibed (parser change; needs design eyes).

### N-5 (LOW) — odd emit forms that the Z-parser happens to accept (or not)

- brass lantern emits as `light` → `take light`, `light light`, `extinguish light`
  (all accepted, but `light light` is jarring; in the Timber Room, `take light`
  failed with "You can't see any light here!" while the lantern _was_ there —
  the parser resolved "light" to ambient light first, costing a compound clause).
- mirror → `rub reflection`, black book → `read page`/`drop page`,
  knife → `take nasty knives` (plural), basket → `cage`, map → `parchment`,
  machine lid (`couvercle`) → **`trunk`** (collides with the trunk-of-jewels
  concept; worked only because the room was dark/empty).
  Suggested: prefer the object's head dictionary synonym over rarer synonyms
  when both are unique (`lantern`, `mirror`, `book`, `knife`, `basket`, `lid`,
  `map`). Not vibed (extractor heuristic change, build-time).

### N-6 (LOW, UX) — abstain notice could name the language escape hatches better

The notice ("Couldn't translate — try simpler wording, or quote a command:
\"open mailbox\"") is a big improvement over UAT-2's silent wrong actions. Two
polish ideas: include one example in the active language, and mention that
plain English words the game knows pass through unchanged.

### N-7 (INFO) — phantom scope nouns mostly gone, rare stragglers

`inScope` arrays were clean all run (inventory included, eviction working) with
one oddity: `crystal skull` and `blade` appeared in scope during the troll fight
(turn ~40) long before the skull exists. One-off; nothing bound to it. Worth a
glance at the extractor's handling of combat flavour text.

### N-8 (INFO, not NL) — browser-automation note

Two batches of keystrokes were lost because the transcript input lost focus
after a picker change / permission interruption; one re-click fixed it. If a
future UAT session sees typed commands not echoing, click the input line first
(noted in notes/uat.md).

---

## Session statistics

- ~200 NL inputs across FR (majority), DE, ES; ~10 quoted-English escapes; 2
  bare-vocab passthroughs (`ulysses`, `écho`→echo).
- LLM fallback engaged ~15 times; everything else resolved deterministically
  (instant). Deterministic coverage in practice ≈ 90%+ of inputs.
- 0 NL-off toggles (UAT-2 needed ~20+). The picker never left FR/DE/ES except
  for the picker-switch tests themselves.
- 2 deaths (combat RNG; lamp-off-in-dark tester error), both fully recovered
  via French commands. Final: **340/350, Wizard, 470 moves, 19/19 treasures
  cased.** Perfect-ending map unreachable post-death by game design.

## Fixes applied this session (vibed, TDD — RED test first, `make all` green)

1. **Truncation-aware verb validation in `parse.ts` (N-3 root cause)** —
   `verbArityOk` now accepts a single-word verb whose 6-char truncation is the
   stored dictionary form, matching the roundtrip gate's existing widening.
   Unblocks `gonfle/aufblasen/infla → inflate` deterministically. Regression
   test: `gonfle le plastique avec la pompe → inflate valve with pump`.
2. **FR `entre dans` verb idioms (N-3)** — `entre/entrez/rentre/rentrez dans →
enter`, killing the `enter river` mis-bind. Test: `entre dans le bateau →
enter raft`.
3. **FR noun data rows (N-3/N-5)** — `jade` → jade figurine; `couvercle` →
   machine (lid).

NOT fixed, needs design decisions: N-1 comma splitting (conflicts with locked
decision 1 — see above), N-2 `dedans` antecedent, N-4 elided-verb clauses,
`lancer`→launch, `tout`→all, causatives, N-5 emit-form preferences.
