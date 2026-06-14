# UAT continuation prompt — Zork I in French (Loquor)

Paste-to-resume brief for a fresh session. Read this, then continue the run.

First, read @CLAUDE.md.

## Mission (the `/ovid-uat` task)

Play **Zork I to completion in FRENCH** through the Loquor browser app, noting
bugs — **especially English text leaking into the French output** (the
output-translation v1 feature). **Vibe-fix bugs as you go** (Ovid's explicit
instruction: "vibe the fixes as you go so that they're easier to test"). Also
**deliberately probe MISSPELLINGS and COMPOUND SENTENCES** ("see where it
breaks") and fix what's worth fixing.

- Walkthrough to completion (349/350): `scratch/walkthrough.txt` (READ-ONLY
  vendored; it's for revision 88, but the running build is **Version 119 /
  série 880429**, so a few responses differ — the route still holds). Note: room
  names are FRENCH on screen, e.g. **"Cave" = the French for "Cellar"** (false
  friend — not the English word "cave"); "Salon" = Living Room.
- Running findings log: `notes/uat-french-playthrough-findings.md` (keep adding;
  it has a SESSION 2 SUMMARY + full RESUME STATE at the top).
- UAT working notes / browser-automation gotchas: `notes/uat.md`.
- The fix skill is **`paad:vibe`** (there is NO `ovid-vibe` installed; the
  `ovid-uat` skill text points at `/ovid-vibe` but the real one is `paad:vibe`).
  It enforces RED→GREEN→REFACTOR TDD. Tests must stay clean (no leaked console).

## Where the game is RIGHT NOW (resume here)

- **Autosave holds the game** (IndexedDB `loquor`, keyed by story signature,
  saved every turn). **DO NOT clear IndexedDB / localStorage** — that wipes the
  run. The language is already **Français** (persisted in `localStorage`
  `loquor.nl`). To resume: open a NEW Chrome tab → navigate `http://localhost:5173/`
  → the landing says "a saved descent awaits" → click **"Light the lamp"** →
  it resumes at the state below.
- **Location:** Salon (**Living Room**). **Score: 192/350. Coups (moves): ~215.**
- **Carrying:** brass lantern (**OFF**), clove of garlic, ivory torch (**LIT** —
  this is your current light source), nasty knife (for the thief).
- **Trophy case at home holds 8 treasures:** sceptre, pot d'or, cercueil en or,
  tableau, diamant, figurine de jade, bracelet incrusté de saphirs, crâne de
  cristal.
- **Coal Mine is fully done** (coal→diamond made, ferried out, deposited). The
  lamp is OFF to save battery; the torch is the light. **Turn the lamp back ON
  (`allume la lampe`) before you deposit the torch**, or you'll go dark.
- Dropped/left behind: candles + black book (Timber Room), sword + bloody axe
  (Troll/Slide area), wrench (Dam), rope (tied to Dome Room railing), matchbook
  (Dead End). **Platinum bar still in the Loud Room.**
- **Wound has HEALED** (full carrying capacity restored — verified: carried 7
  items at the Shaft Room with no "too heavy").

## IMMEDIATE next action

You're in the Living Room with the nasty knife. Head back underground for the
**Reservoir treasures**. Quick path: `descends` (down the trap door) → Cellar
(shown as "Cave") → `nord` Troll Room → `est` East-West Passage → `est` Chasm
→ `nord-est` Reservoir South → … (see route below). The dam is already drained.

Use the torch as light underground (no gas rooms remain on these routes). Probe
French naturally as you go (real French input shows BOTH the `you <French>` line
AND the `> <English canonical>` echo).

## Remaining game route (high level, after item deposit)

- **Reservoir treasures** (dam already drained): Cellar → Troll Room →
  East-West Passage → Chasm → `nord-est` Reservoir South → `nord` Reservoir
  (trunk of jewels) → `nord` Reservoir North (hand-held air pump) → `nord`
  Atlantis Room (crystal trident — drop something first if heavy). Carry
  trunk+pump+trident back, deposit (`mets X dans la vitrine`, one at a time —
  two-objects-into-one-container orphan-prompts by design).
- **Frigid River:** Reservoir South → `est` Dam → `est` Dam Base →
  `gonfle le plastique avec la pompe` (inflate boat) → board → launch → `attends`
  (wait) to drift; grab the red buoy (emerald inside); land east at Sandy Beach;
  take shovel; NE to Sandy Cave; `creuse dans le sable` (dig in sand) ×4 → scarab;
  back to beach; open buoy → emerald; `sud` Shore → `sud` Aragain Falls →
  cross rainbow → End of Rainbow → up the canyon → house → deposit emerald+scarab+
  trident+jewels.
- **Platinum bar:** Round Room → `est` Loud Room → `"echo"` (quoted) → take bar.
  (The Loud Room ejects you to a RANDOM adjacent room until you say echo.)
- **Egg (get it FIRST if not already done):** North of House → Forest Path →
  climb tree → take egg → climb down. (The wandering thief may have stolen it —
  if so, recover it from the Treasure Room below.)
- **Maze / Cyclops / Thief (do carefully — deaths cost 10 pts & block 350):**
  Troll Room → `ouest` into the maze → reach the Cyclops Room → say **`Ulysse`**
  (or `Odysseus`) → he flees, opening the wall to the Treasure Room. The THIEF is
  there: `donne l'oeuf au voleur` (give egg) early, then later kill him with the
  nasty knife (`tue le voleur avec le couteau`) to recover egg+canary+chalice+
  your stolen loot.
- **Egg/Canary/Bauble:** after recovering the egg, open it for the canary; in the
  tree `remonte le canari` (wind up canary) → songbird drops a brass bauble.
- **Finish:** deposit every treasure in the case; map/whisper appears; final
  score should approach **350**. Watch the score line + status bar render in French.

## Fixes ALREADY DONE (uncommitted on branch `ovid/uat`)

`make all` is green (**795 tests**). Full detail (root cause, files, live-verify)
is in the findings file. As of the latest commit some of these may be committed —
check `git log`/`git status`.

**Session 1 (earlier):**

1. **Compound verb-gapping** — article-led bare-object conjunct inherits the
   previous clause's verb (`fillElidedVerbs` in `src/llm/inputTranslate.ts`,
   wired into `translatePipeline.ts`). Plus `isOrphanPrompt` stops a compound on
   a parser orphan.
2. **Singular "allumette"** — added to the matchbook entry in
   `src/llm/lexicon/fr.zork1.ts`.

**Session 2 (this run):**

3. **`tout/tous` ALL quantifier** — optional `quantifiersAll` on `CoreLexicon`
   (`src/llm/lexicon/types.ts`), populated in `fr.core.ts`, bare-quantifier
   branch in `parseLexicon` → `${verb} all`. (de/es left as a follow-up.)
4. **Comma-separated object lists** — `splitClauses`
   (`src/llm/inputTranslate.ts`) now splits on `,` (+ absorbs an Oxford comma).
   **Ovid explicitly approved overriding locked decision 1** for this; EN side
   effect (comma-list = N turns instead of 1) is accepted.
5. **🟥 ENGLISH LEAK fixed** — the `take all` per-object too-heavy failure line
   (`broken timber: Your load is too heavy.`) leaked English. Added the two
   failure-reason templates in `src/translate/corpus/zork1.fr.templates.ts`
   (next to the existing `{obj}: Taken.`/`Dropped.`). Now renders
   `poutre brisée : Votre chargement est trop lourd.`

All 5 were re-verified LIVE in-browser.

## Open findings (see findings file for detail)

- 🟧 `prends le couteu` (misspelled _couteau_) → LLM picked a wrong object
  (`take candles`). Soft miss, same class as `tablo`→table. No fix yet.
- 🟧 MINOR LEAK (edge-triggered): `Vous ne voyez aucun « candles » ici !` — the
  English dictionary word leaks via the `{raw}` template when an object's
  dictionary word ≠ its DESC-name corpus key. Low severity; a holistic
  corpus-coverage follow-up, not a one-off patch. NOT fixed.
- 🟩 Output translation has been **flawless French** end-to-end so far (Coal
  Mine, machine, basket, room names, deposits, score line) — only the one
  take-all leak above, now fixed. Keep watching the river, maze, thief, endgame.

## Probe checklist still to exercise (Ovid asked for these)

- More **misspellings** (verb + noun typos): e.g. `prend la lanterne`,
  `ouvre la fentre`, `ataque le voleur`, accented/unaccented variants.
- More **compound sentences**: comma-lists now work (`A, B et C`); also test
  `et`/`puis`/`ensuite` chains, mixed verb+direction compounds, and the
  two-object `put X in C and Y` (orphan-prompts by design now).
- Confirm both the `you <French>` line AND the `> <English canonical>` echo show
  when you type real French (quoted passthrough hides the French `you` line —
  fine for output checks, misleading for a human watching).

## Browser-driving reminders (from notes/uat.md)

- Load tools in ONE ToolSearch: `select:mcp__claude-in-chrome__tabs_context_mcp,
  mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,
  mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__read_console_messages,
  mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_create_mcp`.
- **Create a NEW tab** for the session; do NOT reuse old tab IDs.
- **Click the input line before each batch** — the window RESIZES between
  screenshots (seen 1400→1478→1490→1531 wide), moving the input off the last y.
  After any gap: screenshot, find `> type a command…`, click it, then type.
  Verify the Coups counter moved (a vanished batch = frozen Coups, no `you`
  lines). When loading a NEW build (after a vibe-fix), **reload the page** to
  guarantee the new code is live, then "Light the lamp" to resume (autosave
  holds the game — reload does NOT clear it).
- Batch 4–6 commands with 1s waits; screenshot at the end. Wait 4–8s only when
  `…thinking` (LLM fallback) shows.
- **Quoted passthrough `"command"`** sends the exact English canonical, bypassing
  NL translation — the reliable escape hatch (output still renders French).
- Console debug: `read_console_messages` pattern `nl` shows per-clause
  `{stage, antecedent, inScope, raw, result}` (stage = lexicon/direction/llm).
  The console **DUPLICATES stale history** — trust only the LATEST timestamps and
  pass `clear:true` after big reads.

## Env

- Dev server: `npm run dev` (background) on **:5173**. Check `lsof -i :5173`; it
  was already running this session.
- Verify changes: `make all` (lint+format+typecheck+test), or
  `npx vitest run <file>` / `npx vitest run -t "<name>"`.
- End commit messages with the Co-Authored-By Claude line (only commit if asked).
- Gameplay traps: never go dark underground; torch must NEVER enter the Gas Room
  (you're past it now); carry garlic for the Bat Room; Timber↔Drafty crawl =
  empty hands; dying costs 10 pts and blocks the 350 ending.
