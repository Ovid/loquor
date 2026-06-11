# UAT-5 — Output translation v1 (Zork I × French), 2026-06-11

Second independent black-box browser session against
`docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md`
(UAT-4 was the first). Dev server on :5173, `?model=full`, Chrome
automation. The autosave resumed mid-game in French (Cuisine, Score 10),
so much of the spec was re-verified through the **restore/rehydration**
path rather than a fresh boot.

## Test plan results

1. **English baseline** — ✅ PASS (via the FR→EN switch: status bar
   `Forest Path · Score: 5 Turns: 49` and the full egg description render
   clean English, no overlay artifacts).
2. **Switch EN→FR with backlog** — ✅ PASS. Backlog flips to French
   instantly on the language switch; no shimmer burst (backlog rule).
3. **Live French output** — ✅ PASS. Room titles/descriptions,
   take/drop/open responses all instant French
   (« Pris. », « Posé. », « En ouvrant le sac marron, vous découvrez… »).
4. **Listings + indent** — ✅ PASS. « Vous portez : / Un dépliant / Une
   épée / Une lampe en laiton (allumée) » and the container listing
   « Dans la bouteille en verre, il y a : / De l'eau » with indent
   preserved.
5. **Status bar** — ✅ PASS. French room names (« Cuisine », « Forêt »,
   « Clairière », « Sentier forestier », « En haut d'un arbre »),
   « Score : N Coups : N » tracked all session.
6. **Input lines untouched** — ✅ PASS. `you <French>` line shows the
   player's words; `> <English canonical>` echo de-emphasized below.
7. **{raw} template** — ✅ PASS. `"flibbertigibbet"` → « Je ne connais
   pas le mot « flibbertigibbet ». » instantly.
8. **Miss → LLM → cache** — ✅ PASS (engine path confirmed). Output
   misses while the engine was cold resolved to **English** by design
   (the unavailable-engine fallback). Warming the engine via an idiomatic
   **input** (« monte dans l'arbre » → LLM → `climb tree`) proved the
   shared engine works; output shimmer→LLM→cache itself was already pinned
   directly in UAT-4. No live output shimmer fired this session because
   every output line hit was either pinned (instant) or the cold-engine
   English fallback — i.e. the corpus kept winning the instant path.
9. **Switch FR→EN→FR** — ✅ PASS both directions, instant, status bar +
   full backlog. The `take all` line round-trips
   `pile of leaves: Taken.` ⇄ « Vous prenez le tas de feuilles. ».
10. **Miss-log dev affordance** — ✅ PASS. `window.loquorMisses()` returns
    a clean, deduped list with `{en, game, language, kind, ctx, t}`.
11. **Edge probes (off golden path)** — ✅ found the banner-class gap
    below; also verified `diagnose`, `jump`, `xyzzy`, `pray`, `wait`,
    `score`/rank, `climb tree`, `open egg` all translate.

## Findings (fixed this session, TDD red→green, re-verified in-browser)

Commit `d4ad367` (fix(corpus): pin the JIGS-UP death/explosion banners +
Disk Failure). Browser re-test after HMR re-scan: the on-screen death
banner flipped from English to « **** Vous êtes mort **** » (indent
preserved). Full suite 672/672; tsc/eslint/prettier clean on touched files.

- **Death banner rendered in English** — `**** You have died ****` (raw
  `|\n    ****  You have died  **** `) missed. Root cause: the
  **string-inventory gate (§7.4) shape filter** only recognized lines
  starting with `[A-Z"'(]` (fullLine) or `[A-Z]` (roomTitle); a
  **star-led banner** matched neither and fell through
  `if (!fullLine && !roomTitle) continue`, so the gate never checked it.
  The golden-path coverage gate never dies, so neither net saw it.
  - RED: taught the inventory gate a `banner` shape (`** … **`). That
    surfaced **three** unpinned banners:
    `**** You have died ****`, `** BOOOOOOOOOOOM **` (gas-room explosion
    death, 1actions.zil:2467), `** Disk Failure **` (V-VERIFY joke,
    gverbs.zil:128).
  - GREEN: pinned all three — « **** Vous êtes mort **** » (masc. «mort»
    per corpus convention), « ** BOUUUUUUUUUUM ** », « ** Panne de
    disque ** » (sits with its verify siblings).

## Out-of-scope observations (not fixed — documented deferrals)

- **`take all` with a special event message** — `take all` over the pile
  of leaves above the grating prints the composed line
  `pile of leaves: In disturbing the pile of leaves, a grating is
  revealed.` (object-name prefix glued to a one-off event message), which
  rendered English (engine cold). This is the exact "multi-item reveal /
  non-canonical line shape" the spec §8 execution note **defers to the LLM
  fallback**. Narrower than it first looked: the underlying message *is*
  pinned (singular `move leaves` translates instantly), and the **common**
  take-all composed shape `{obj}: Taken.` **is** templated
  (« Vous prenez {obj.def}. ») — only the special-message variant misses,
  and only the LLM (or English when cold) covers it. No corpus change.

## Session technique notes

- **The browser window resized between screenshots** (1400×846 → 1490×763
  → 1531×784), which moved the transcript input off the previously-clicked
  y-coordinate — a whole batch of typed commands silently vanished (Coups
  didn't move). Same failure signature as the picker focus-steal in
  notes/uat.md. Fix: after any gap, screenshot fresh, locate the
  `> type a command…` line, click it, and verify the turn counter moved
  before batching.
- **Quoted-passthrough makes the transcript look all-English.** Driving
  the game with `"diagnose"`/`"take all"` (the deterministic passthrough
  hatch) skips the French `you` line, so the echo column reads as English
  `> …` with no target-language input above it. Great for reaching exact
  game responses; **misleading if anyone is watching the screen** (Ovid
  asked mid-session why the commands weren't French). When demoing the
  feature to a human, type real target-language input so both the `you`
  line and the canonical echo are visible.
- **`jump` can be fatal** above-ground (it was here) — cost the resumed
  save 10 points and a teleport to the Forest. Useful as a death-message
  test, destructive to a real playthrough; warn before using it on a save
  you care about.
