# UAT working notes — things that slow sessions down (and what to do instead)

Living document referenced by the `ovid-uat` skill. Add to it whenever a
session loses time to something avoidable.

## Browser automation (Claude-in-Chrome)

- **Click the transcript input line before typing after ANY interruption** —
  language-picker changes (`form_input`), permission prompts, or a malformed
  tool-call retry all steal focus. Symptom: a whole batch of typed commands
  produces no `you` lines and the Turns counter doesn't move. One
  `left_click` on the `> type a command…` line fixes it. Verify the turn
  counter moved before assuming commands landed.
- **The browser window can resize between screenshots** (UAT-5 saw
  1400×846 → 1490×763 → 1531×784) — this MOVES the transcript input off
  the y-coordinate you last clicked, so a whole batch of typed commands
  silently vanishes (same signature as the focus-steal above: no `you`
  lines, Turns counter frozen). After any gap, screenshot fresh, find the
  `> type a command…` line at its CURRENT position, click it, and verify
  the turn counter moved before batching more.
- **Quoted-passthrough (`"take all"`) makes the transcript read
  all-English.** It's the reliable way to reach exact game responses, but
  it skips the target-language `you` line, leaving only the English `> …`
  canonical echo. Harmless for testing, but MISLEADING if a human is
  watching the screen (UAT-5: Ovid asked why the commands weren't French).
  When demoing the feature, type real target-language input so both the
  `you <French>` line and the `> <English canonical>` echo show. The
  English canonical echo is BY DESIGN (spec §2.5), not a bug.
- The language picker is a CUSTOM combobox (since 2026-06-10), not a native
  `<select>` — `form_input` no longer applies. Click the trigger (the
  `Language:` control), then click the option (`Français`, `Deutsch`,
  `Español`) in the themed popup; the popup DOES render in screenshots now.
  It also closes on any outside mousedown, so don't click elsewhere between
  the two clicks.
- Console debugging: `read_console_messages` with pattern `nl debug` shows
  per-clause `{stage, antecedent, inScope, raw, result}` — the fastest way to
  tell deterministic-lexicon hits from LLM fallbacks and to find root causes.
  `clear: true` after big reads keeps later reads small.
- **Console dumps DUPLICATE old messages** (UAT-4): the capture layer
  re-delivers the page's buffered console history when tool calls re-attach,
  stamping it with fresh timestamps — full waves of historical `nl debug`
  lines bunched at one second look like the app replaying each turn. It
  isn't. Before chasing "replayed logs", patch `console.log` in-page
  (`javascript_tool`) to count REAL calls; duplicates carrying stale scene
  data verbatim are the artifact. Tracking also resets on page reload —
  an empty read after a reload doesn't mean the app logged nothing.
- Batch moves 4–6 per `browser_batch` with 1s waits; screenshot only at the
  end. Deterministic translations are instant; only wait 4–8s when
  `…thinking` (LLM fallback) appears.
- **After editing app source mid-session, VERIFY IN A FRESH TAB — never trust
  the tab you've been hammering** (UAT-prefs-debug, 2026-06-17). Editing
  `src/**` while a tab is live triggers Vite **HMR**, which hot-swaps modules
  into a running tree; combined with StrictMode double-mount and many reloads,
  the tab accumulates divergent client state. Symptom seen: a resumed German
  game where the picker rendered "German"/English chrome ("Points/Moves", `> go
north`) while the NL input was still German — a self-contradictory state the
  code can't actually produce from one `nl.state`. It looked like a real
  "language reset on resume" bug; it was pure HMR/stale-tab corruption. A
  brand-new tab (`tabs_create_mcp` → navigate) resumed cleanly: "Deutsch ▾",
  "Punkte/Züge", German source lines, fix intact. Rule: once you've touched
  code, open a fresh tab before drawing any conclusion about runtime behavior.

## Zork I gameplay traps (cost real time in UAT-2/UAT-3)

- **Never go underground with the lantern off.** Both UAT sessions lost a
  death to this exact mistake while ferrying treasure. After `pray`-revival,
  the lamp is teleported to the Living Room; matches/screwdriver scatter to
  above-ground rooms (check the canyon-path Clearing and Canyon View).
- Dying costs 10 points each and makes the **perfect ending unreachable**
  (the whisper/map needs a deathless 340); plan combat (troll, thief) early
  and carefully. Give the thief the egg, then attack while he admires it.
- The trap door re-bars until the thief dies; the cyclops hole
  (Living Room ⇄ Strange Passage) is the post-cyclops shortcut.
- The Machine Room is DARK — take the torch out of the basket in the Drafty
  Room before going south, then put it back for the basket ferry.
- Carry the garlic for the Bat Room; carry nothing through the
  Timber→Drafty crawl.
- **Extinguish the candles before the Gas Room / coal mine — lit candles are
  an open flame, exactly like the torch.** UAT-Spanish DIED here («Vaya…
  objetos en llamas… ** BUUUM ** / Has muerto»). After the Hades exorcism the
  candles stay LIT, and the «a gust of wind blows out your candles» event in
  the Cave (going up toward the Mirror Room) is PROBABILISTIC — it did NOT
  fire this run, so the candles were still burning at the Gas Room. Stowing
  the torch in the basket is necessary but NOT sufficient: `apagar velas`
  (or drop them) before `bajar` into the Gas Room. Death scatters carried
  items (lamp → Living Room, rest above-ground) and forces a long ghost
  revival, so this one mistake costs ~30+ recovery turns.
- Wounds shrink carrying capacity ("especially in light of your condition");
  `diagnostic`/`diagnose` reports moves-to-heal. Plan heavy hauls (coffin,
  trunk) for when healed.
- Above-ground "Clearing" confusion: Behind House → east is the canyon-path
  Clearing; Canyon View is one MORE east. The grating Clearing is north of
  Forest Path.
- **The Frigid River drifts you downstream EVERY turn (probabilistically), not
  only on `wait` — this killed UAT-Spanish.** At the buoy segment you are
  overweight, so `take buoy` fails "load too heavy". DROP weight first, take the
  buoy, then go east — all in ≤2 turns; NEVER `wait` or fiddle there or you
  drift over Aragain Falls and die (the boat is destroyed and the buoy/emerald
  stranded). Open the buoy on the BEACH. If you beach without it, re-enter the
  boat + launch returns you to the buoy segment (the beach is its east shore).
- **Post-death recovery (this z3, no `undo` — "No conozco la palabra «undo»").**
  Death after visiting the South Temple resurrects you as a ghost at the
  Entrance to Hades. While DEAD: all rooms are lit (`ALWAYS-LIT`, no grue) but
  you cannot carry/use anything and the mirror is blocked ("excede tus
  capacidades"). To revive, reach the **Altar (South Temple)** and **`pray`** →
  Forest, alive; the lamp moves to the Living Room, other carried items scatter.
  Ghost route: Hades cave → up (Cave) → north (Mirror Room-2, lit) → north
  (Narrow Passage) → north (Round Room) → SE (Engravings Cave) → east (the dome
  wind pulls the ghost DOWN to the Torch Room) → south (Temple) → south (Altar)
  → pray. The Altar→cave hole is one-way down.
- **DEATHS budget is hard:** a 3rd death is a PERMANENT game-over ("suicidal
  maniac"). Once you have died, avoid risky combat (thief) entirely.

## NL-layer testing technique

- The fastest realism check is the UAT-2/UAT-3 probe list: replay each old
  finding's exact input at its original game location, then log new findings
  with the console `stage` evidence attached.
- When a deterministic-looking phrase unexpectedly hits the LLM
  (`stage:"llm"`), suspect (in order): a missing noun word, a leading
  preposition other than 'to', verb-arity validation (6-char truncated
  dictionary forms like `inflat`), or an idiom that needs to consume a
  particle/prep.
- Quoted commands (`"open mailbox"`) are the reliable escape hatch and each
  use doubles as a passthrough test; prefer them over toggling the picker to
  English so the session stays in-language end to end.

## Output-translation testing (corpus gates have a known blind spot)

- **`window.loquorMisses()` is the authoritative output-translation signal.**
  It persists across sessions/languages in `localStorage['loquor.xlate.misses']`
  — at the START of an output-translation UAT, `localStorage.removeItem(...)` it
  (or filter by `m.language === 'es'` and recent `m.t`) so old `fr` misses don't
  drown the new run. A successful LLM _fallback_ still leaves a `kind:"line"`
  miss entry, so the log is the gap list to feed the corpus — empty log = every
  line hit the deterministic corpus.
- **Hunt for the inventory gate's blind spot: mid-sentence line breaks.** The
  string-inventory gate only vets lines whose SHAPE is a full line
  (`/^[A-Z"'(]/ … /[.!?:")]$/`), a room title, or a `**** banner ****`. A verse
  or sentence split across two display lines where the FIRST line ends on a word
  (e.g. the black-book prayer `"… shalt thou wander and"`, ending in "and") is
  skipped as a "composition fragment" — but at runtime it IS its own display
  line and hits the matcher, so a missing corpus entry leaks/LLM-falls-back
  silently. The walkthrough-coverage gate misses it too (off the golden path).
  **So deliberately read every multi-line text block in play** (leaflet, black
  book/prayer, owner's manual, engravings, matchbook, guidebook, tour text) and
  check `loquorMisses()` after each — that is where un-gated corpus gaps hide.
- These omissions are often **shared with the French corpus** (Spanish was
  authored by mirroring French § keys), so a missing es line usually means the
  same fr line is missing too — note it as a French follow-up even on an es-only
  branch.
- **Runtime-COMPOSED lines are the other blind spot (UAT-ka, 2026-06-19).**
  Beyond mid-sentence breaks, whole classes of line are assembled at runtime
  from fragments and so are neither full-line z-strings (inventory gate) nor on
  the golden path (coverage gate): **reveal-on-open** (`Opening the X reveals
Y.`), the **multi-object `<obj>: <result>` prefix** from `take all`/`drop all`
  (both the success `Taken.`/`Dropped.` AND the per-object failure reasons:
  too-heavy, `The rug is extremely heavy…`, `…securely fastened…`), and the
  **examine default** `There's nothing special about the {obj}.`. Probe them
  directly on turn 1: `open mailbox`, `take all` (in a room with a takeable +
  an un-takeable object like the Living Room rug/case), `examine <ordinary
object>` — then read `loquorMisses()`. Georgian leaked on ALL of these while
  fr/de/es covered the success cases (they template `{obj}: Taken.`); ka had
  only `{obj}: Dropped.`. The failure-reason prefixes leaked in **every**
  language.
- **Fastest ka-specific-vs-universal classifier: switch the picker to French
  mid-session.** The output overlay re-translates the EXISTING transcript on a
  language switch, so the same English line either turns French (→ ka-only gap,
  fr has the template/string) or stays English (→ universal gap, all corpora
  miss it). No replaying turns needed.

## Output translation vs. INPUT (NL) translation — keep them separate (UAT-es-2)

The es OUTPUT corpus is effectively complete: a full deathless es run (≈200 turns,
every scene except the thief/Treasure Room) left `loquorMisses()` at exactly the
ONE off-path line you trigger yourself with `coger tesoro` ("¿Cuál de los **tesones**
…?" — note: "tesones" is a pluralization bug in the dynamic disambiguation template,
should be "tesoros"; it ALSO logs a miss because the raw EN disambig line isn't a
corpus string). Everything else is clean. **So most "it leaked / it failed" moments
this run were INPUT (NL `src/llm/`) noun-mapping gaps, NOT output-corpus holes.**
Distinguish them: an English word inside a Spanish sentence frame (`¡No ves ningún
«gold» aquí!`) is the GAME echoing an unrecognized canonical noun → the INPUT layer
emitted the wrong/again-English word. Confirmed es input-noun gaps (use the
quoted-passthrough escape hatch to progress, e.g. `"take gold"`):

- `oro` → canonical `take pot` (should be `gold`); harmless — "take pot" works for the pot
- `dar cuerda al canario` → `give rope to canary` (idiom `dar cuerda a X` = "wind up X"
  taken literally, `cuerda`="rope"). **The songbird puzzle's solution verb — unsolvable
  in es without `"wind up canary"` passthrough. Highest-value input-NL fix.** (es-3)
  **[RESOLVED 2026-06-20 — fused `al`/`a la` wind-up idiom added to es lexicon;
  `dar cuerda al canario` → "wind up canary" now resolves correctly. Pinned in
  `src/llm/lexicon/parse.es-uat.test.ts` (commit a993524)]**
- `subir` is non-deterministic (`stage:"llm"`): usually `up`, but once
  `{"verb":"move","object":"trail"}` → "move trail" at Forest Path. Not in the
  deterministic `direction` lexicon, so it rides the heuristic stage. (`bajar`→down OK.)
- `libro` → `page` (`coger/leer libro` → "take/read page"); cosmetic — parser resolves
  "page" to the black book, so the Hades ritual still works.
- `bote` → `bottle` (false friend; the boat. Output CALLS it "bote" but input maps
  it to bottle). Use `"enter boat"` / `"launch"` passthrough on the river.
- `eco` → `look` (should be the game's `echo`; this is the Loud Room solution!). Use
  `"echo"` passthrough, then `coger barra de platino`.
  **[RESOLVED 2026-06-20 — `eco`→echo mapping added to es lexicon; pinned in
  `src/llm/lexicon/parse.es-uat.test.ts` (commit 878a40c)]**
- `Ulises` → `look` (cyclops magic word); the ENGLISH `Ulysses` works (it's a
  game verbSynonym, recognized even in es mode). Type `Ulysses`.
- **CORRECTION (2026-06-15): the pot of gold IS gettable and the game CAN be won.**
  Earlier sessions wrongly concluded "350/the win is unreachable." It is reachable.
  The pot is only un-takeable _at End of Rainbow_ (`take gold`/`take pot`/`take
treasure` fail there, `look` doesn't list it) — a **player-scope quirk of that
  room**, NOT a failure to clear the object's INVISIBLE bit, and NOT a Loquor bug.
  The **thief steals the pot**; when he dies in the Treasure Room his hoard reappears
  as normal floor objects incl. "una olla de oro" → `coger olla de oro` "Cogido."
  (+10) → `poner olla de oro en vitrina` "Hecho." (+10). Verified empirically. Root
  cause (background-agent z3/ifvms analysis): `POT-OF-GOLD`=obj 154 `IN
END-OF-RAINBOW`(125), `INVISIBLE` cleared by `SCEPTRE-FUNCTION` (`1actions.zil:2597`);
  ifvms `clear_attr`/insert ruled out as correct. A runtime bit-read to pin the
  scope quirk is blocked (ZVM not on `window`); it's an escalation item, not a
  win-blocker. Don't burn turns taking the pot at the rainbow — get it from the
  dead thief.
- **Compound `VERB X y Y` (shared verb across conjoined objects) was FIXED this run**
  (`fillElidedVerbs` now gaps a verbless conjunct that matches a known foreign noun,
  not only article-led ones). `coger ajo y destornillador`, `dejar baúl, tridente y
boya`, `coger monedas y llave maestra` all now distribute the verb. Two FULL clauses
  (`dejar X y coger Y`), `.`-separated, and movement (`este y oeste`) already worked.
- **Frigid River, done deathless this run:** drift via `"wait"` ONE turn at a time,
  screenshot each (drift is probabilistic — a `wait` that prints no "La corriente…
  te arrastra" line did NOT move you; safe at segments 1-3). At the buoy segment do
  `coger boya` then `este` immediately (screenshots cost no game turns, so confirm the
  take landed + no drift BEFORE going east). Sandy Cave: dig EXACTLY 4× (`cavar arena`),
  scarab appears on #4, a 5th dig collapses the cave = death — stop the instant
  "Distingues un escarabajo" prints.

## Spanish INPUT-NL bug catalogue (UAT-es-3, 2026-06-15) — driving in es, not passthrough

Ovid asked the tester to drive in **real Spanish + compound sentences** (not
quoted-passthrough) to exercise the NL layer. Output stayed correctly Spanish
throughout; these are all **input** mis-mappings. New findings:

- **Conjoined objects + a trailing prep phrase FAILS:** `mete la antorcha y el
destornillador en la cesta` → only `put torch` (drops the 2nd object AND the
  `en la cesta` destination). Single object + prep is fine (`mete X en la cesta` →
  `put X in cage`). Conjoined **without** a prep phrase works great:
  `deja la calavera, las velas, las cerillas, el ajo y la lámpara` distributed
  `drop` to all 5; `coge el carbón, el destornillador y la antorcha` likewise.
  Movement chains (`norte, oeste, norte, oeste, norte y este`) also fine.
  **[STALE — catalogue entry was wrong; `distributePrepTail` already handled
  this case in the shipping lexicon. Regression-pinned in
  `src/llm/lexicon/parse.es-uat.test.ts` (commit fd3559c)]**
- **Imperative `apaga` is UNKNOWN** ("No conozco la palabra «apaga»"); the
  **infinitive** works: `apagar las velas`→`extinguish candles`, `apagar la
lámpara`→`extinguish light`. (Refines the older "apagar velas works" note —
  it's the infinitive that's needed; the imperative is missing.)
  **[STALE — `apaga` (imperative) was already working; catalogue was out of
  date. Regression-pinned alongside `apagar` in
  `src/llm/lexicon/parse.es-uat.test.ts` (commit 51cdc47)]**
- **`deja todo` / `coge todo` → wrong object** ("todo"/all mis-maps).
  **[RESOLVED 2026-06-20 — `es` `quantifiersAll` entries added; `deja todo`
  and `coge todo` now route to `drop all`/`take all`. Pinned in
  `src/llm/lexicon/parse.es-uat.test.ts` (commit 51cdc47)]**
- **`abre la tapa` → `open cage`; `cierra la tapa` → `turn off candles`** (lid
  mis-maps). Use `abre/cierra la máquina` → `open/close machine` for the diamond
  machine.
  **[RESOLVED 2026-06-20 — noun surface `tapa`→machine added to es lexicon.
  Pinned in `src/llm/lexicon/parse.es-uat.test.ts` (commit 422a0ee)]**
- **`coge el jade` → `take jeweled egg`** (fail); use `coge la figurilla` →
  `take figurine`.
  **[RESOLVED 2026-06-20 — noun surfaces `jade` and `calavera de cristal`
  (multi-word) added to es lexicon. `coge el jade`→take jade figurine,
  `coge la calavera de cristal`→take crystal skull now work. Pinned in
  `src/llm/lexicon/parse.es-uat.test.ts` (commit 422a0ee)]**
- **`sube la cesta` → `climb cage`** (does not raise); use `levanta la cesta` →
  `raise cage`. (`baja la cesta` → `lower cage` works.) **[DEFERRED Ovid
  2026-06-19 — `sube` bare = go up/climb, arity-conditional sense is fragile;
  workaround: `levanta la cesta`→`raise cage`]**
- **`coge la calavera de cristal` → `take crack`** (the `de cristal` modifier
  breaks it); bare `coge la calavera` → `take skull`.
  **[RESOLVED 2026-06-20 — see `jade`/`tapa` fix above (commit 422a0ee)]**
- `subir` (bare "up") stayed deterministic (`up`) this run but is still the flaky
  one — verify after each. `vitrina`→case, `pulsera`→bracelet, `figurilla`→jade,
  `baúl`→trunk, `bomba`→pump, `frota el espejo`→"rub reflection", `gira el
interruptor con el destornillador`→"turn switch with screwdriver" all GOOD.

### Browser/UAT mechanics (UAT-es-3)

- **Input queue has a ~6-command cap** — submitting ~10 rapid commands prints
  "Queue full — dropped: «…»" and silently loses the overflow. Put a 1s wait
  between each type+Return; keep ≤~7 commands per batch.
- Window resized to **~1466×838** on first interaction; transcript input sits at
  about **(537, 819)**. Click it each batch and verify Turnos advanced (a resize
  silently eats a whole batch).

### Output gap (UAT-es-3) — dynamic disambiguation template

- The only es `loquorMisses()` entry was `"What do you want to put the torch
in?"`, rendered garbled as «¿Qué quieres poner la cera?» (object slot → "cera",
  wrong structure). Off-golden-path (only fires on an incomplete `put X`), exactly
  the dynamic-template blind spot above. Likely shared with French.

## ⭐ ENDGAME / VICTORY VERIFIED CLEAN (UAT-es-4, 2026-06-15) — the mission is DONE

Drove the resumed 207-pt save to a **deathless 350/350 win** (turn 373) in real
Spanish + compounds, and finally saw the **VICTORY/ENDGAME text** — the only scene
never reached in any language. **It is fully, cleanly translated.** `loquorMisses()`
stayed at exactly the ONE pre-existing baseline entry (the `put X` disambiguation
template, identical timestamp) for the ENTIRE endgame — **zero new misses**.

Verified clean in es (screenshots in session): the **whisper** («Una voz casi
inaudible te susurra al oído: "Busca el secreto final entre tus tesoros"»), the
**map appearing** in the case (`examina la vitrina` → «un pergamino antiguo que
parece ser un mapa»), the **map text** («…hacia el suroeste, lleva la inscripción
"Hacia el Túmulo de Piedra"»), **West of House** secret path («Un sendero secreto se
interna hacia el suroeste»), **Stone Barrow** («Túmulo de piedra… enorme puerta de
piedra… oscuridad del sepulcro»), and the **full victory text** inside the barrow:
the closing door, the bridge, the floating sign's complete congratulation
(«…Habéis dominado la primera parte de la trilogía ZORK…»), the sequel plug («ZORK
II: El Mago de Frobozz» / «ZORK III: El Maestro del Calabozo»), score line («Tu
puntuación es 350 (de un total de 350 puntos), en 373 jugadas»), and rank («…el
rango de Maestro Aventurero»).

- **Minor (NOT a miss — intentional):** the final line «(Escribe RESTART, RESTORE o
  QUIT):» keeps the command tokens in English while the question above it is Spanish
  («¿Quieres reiniciar… restaurar… o terminar…?»). No miss logged → it's in the
  corpus as authored. Reasonable (the meta-commands are parser keywords), but flag
  for review if a fully-localized restart prompt is wanted.
- **NOTE on the route:** casing 18/19 treasures only reaches **344**; the **torch is
  the 19th treasure** and the endgame trigger needs it too (350, not 349 — the prior
  "torch optional / 349" note was wrong). The Living Room is **daylit** (you see it at
  game start with no lamp), so `mete la antorcha en la vitrina` does NOT plunge you
  into darkness — you can case the torch even after dropping the lamp at Atlantis.

### Spanish INPUT-NL findings (UAT-es-4) — driving in es, output stayed clean

NEW bugs:

- **`sal del bote` → "move raft"** (should be exit/leave boat) → «Mover el bote no
  revela nada». Boat-exit broken in es. Workaround: `"get out of boat"` passthrough ✓.
  **[RESOLVED 2026-06-20 — `del`-as-article handling (mirroring fr `du`) added so
  `sal del bote` parses correctly as `exit boat`. Pinned in
  `src/llm/lexicon/parse.es-uat.test.ts` (commit 27442e6)]**
- **`entra en el bote` → `miss`** (boat _enter_ fails; enter-arity is a separate,
  lower-value fix). Workarounds: `aborda`/`embarca`→board ✓. **[DEFERRED Ovid
  2026-06-19 — do not re-file as new; workaround: `aborda`/`embarca`→board]**
- **`mata al ladrón con el cuchillo` → "attack thief with stiletto"** → «No tienes el
  estilete». The instrument-slot noun "cuchillo" mis-maps to the thief's _estilete_,
  even though `coge el cuchillo` → "take nasty knives" is CORRECT and `deja el
cuchillo` → "drop knife" is CORRECT. So the bug is specific to the `con <arma>`
  instrument slot. Workaround: `"kill thief with knife"` passthrough ✓.
  **[RESOLVED 2026-06-20 — personal-`a` stripping in the prep-split object span
  fixed in `src/llm/lexicon/parse.ts` (shared code change); `mata al ladron con
  el cuchillo` → "attack thief with rusty knives" now correct. This is the ONE
  genuine shared parse.ts change in the branch. Pinned in
  `src/llm/lexicon/parse.es-uat.test.ts` (commit 8b65679)]**

CONFIRMED-GOOD this run (several BETTER than prior notes feared):

- **`infla el plástico con la bomba` → "inflate valve with pump"** → the boat
  inflates! «El bote se hincha…». "plástico" dodges the `bote`→bottle false friend —
  no passthrough needed to inflate (only to enter/launch).
- **`espera` → "wait"** ✓ — Spanish works for the river drift; supersedes the old
  `"wait"`-passthrough advice. (Drift still probabilistic; screenshot each.)
- **`da cuerda al canario` → "give rope to canary"** — songbird bug STILL present;
  `"wind up canary"` passthrough still required (and works — the bauble drops at the
  Forest Path; `coge la chuchería` → "take bauble" ✓).
- **`Ulysses`** typed plain (no quotes) passes through to the game ✓ (cyclops flees).
- **`coge la barra de platino` → "take bar"** ✓ — the `de platino` modifier does NOT
  break it (unlike `calavera de cristal`→"take crack"). `coge el huevo` → "take
  jeweled egg" ✓ (correct, unlike `coge el jade`→egg).
- `cruza el arcoíris`→cross rainbow, `sube al árbol`→climb tree, `subir`→up (reliable
  all run), `cava la arena con la pala`→dig sand with shovel, `da el huevo al
ladrón`→give egg to thief, `abre la trampilla`→open trapdoor, `coge el canario`→take
  canary — all ✓. Conjoined takes/drops (incl. 3-object `deja el baúl, el tridente y
la boya`) distribute the verb reliably; `mete X en la vitrina` (one obj + prep) ✓.
- **Thief combat** (give egg → he admires it → 3× `"kill thief with knife"` → fatal
  blow → hoard reappears) renders in beautiful clean Spanish. The **platinum bar was
  in the thief's hoard** (he'd stolen it), so no Loud Room trip was needed.
- Above-ground nav trap (re-confirmed): from **North of House `sur` is blocked**
  («Las ventanas están todas tapiadas») — circle the house via the **east** side
  (North of House ↔ Behind House is E/W, not N/S). The forest loops (Bosque↔Sendero
  del bosque).

## Accessibility (a11y) UAT — technique & traps (UAT-a11y-1, 2026-06-17)

- **For a11y, the accessibility tree IS the deliverable — screenshots aren't
  enough.** Pair each screenshot with `javascript_tool` DOM/AOM inspection:
  `getAttribute('role'/'aria-live'/'aria-label'/'aria-describedby'/'aria-hidden')`,
  `aria-checked`/`tabindex` (roving radiogroup), `aria-selected`/`aria-activedescendant`
  (combobox/listbox), and `document.activeElement` (focus). `read_page filter:interactive`
  gives the computed accessible names/roles fast (the picker is `combobox`→`listbox`
  with per-option `lang`; the input's accessible name reflects the active NL language).
- **Focus restoration is the bug-magnet.** To debug, install a document tracer
  before acting: `addEventListener('focusin'/'focusout', …, true)` logging
  `desc(target)` + `closest('[inert]')`, mark `--PRESS-ENTER--`/`--PRESS-ESC--`,
  then read the trajectory. That's how the M9 regression was found: closing a
  modal/overlay dropped focus to `<body>` instead of the trigger.
- **Two compounding causes bit focus-restore, and BOTH hide from jsdom:** (1) the
  M9 `inert` on the trigger's ancestor makes the trap's synchronous
  `previouslyFocused.focus()` a **no-op** (jsdom doesn't enforce inert
  focus-blocking, so the unit test passed while the browser failed); (2)
  **StrictMode** (dev, `src/main.tsx`) double-invokes the open effect, and the
  first cleanup's swallowed restore lets the second invoke capture the
  in-dialog control as the restore target. Fix lived in `useFocusTrap`: capture
  the opener in a ref ignoring in-container candidates + retry focus on the next
  `requestAnimationFrame` if it didn't land. **Always verify focus/inert fixes in
  the real browser**, not just vitest.
- **Coordinate scale:** with `devicePixelRatio=2` the screenshot is downscaled
  (e.g. CSS `innerWidth=1757` → screenshot `1407`). `getBoundingClientRect()`
  returns CSS px; multiply by `screenshotW/innerWidth` (~0.80) to get click
  coords, or just drive clicks by element `ref` from `read_page`.
- **A new origin/port needs Chrome-extension site permission** and may be
  denied (a `vite preview` on :4174 was). To check production behavior, prefer
  reasoning + a robust fix verified on the already-permitted dev origin over
  fighting the permission prompt.
- **Grammar-only-gated UI (the `✦ improve` button M1, the `· basic`/`simplifié`
  chip m3, install/download chips M7) is NOT reachable once the full WebLLM
  model is cached** (picking a language auto-upgrades). Don't wipe the user's
  model cache to see them — verify via the unit tests (`NlLanguagePicker.test.tsx`,
  `notices.test.ts`), which pin the exact aria-label and per-language chips.
- **Switching language retranslates the EXISTING transcript** (output-translation
  is a display overlay), so FR→DE→ES on one screen re-renders prior output —
  handy for checking all three corpora without replaying turns.

## Responsive / narrow-viewport UAT — how to actually get a small viewport (UAT-responsive, 2026-06-19)

- **`resize_window` is a silent no-op on this macOS Chrome.** It returns
  "Successfully resized…" every time but `window.innerWidth` never changes
  (stayed frozen at 1400→1750); `outerWidth/outerHeight` read `0`. Don't trust
  the success string — always re-read `innerWidth` after, and after ~2 no-ops
  stop fighting it. The window also drifted to 80% zoom on its own (DPR 2.0→1.6),
  inflating `innerWidth`.
- **The reliable path is human-in-the-loop, two levers:** (1) ask Ovid to **drag
  the Chrome window narrow** — macOS Chrome bottoms out at **~500 CSS px** wide
  (enough to fire `@media (max-width:520px)`); (2) to go narrower than 500, ask
  him to **zoom the browser IN with `Cmd +`** — real browser page-zoom shrinks
  the CSS layout viewport and _does_ re-fire width media queries. 150% zoom on a
  500px window → **innerWidth 333** (≈ the 320 breakpoint floor), DPR 3. Reset
  with `Cmd 0`. Measure `innerWidth` + `matchMedia('(max-width:NNNpx)').matches`
  after each step to confirm.
- **Things that DON'T work for narrowing:** the `computer` tool's `key` action
  for `cmd+0` / `cmd+plus` (browser-chrome shortcuts aren't delivered to the
  page); and `document.documentElement.style.zoom` (CSS root-zoom does NOT change
  `innerWidth` or fire width media queries — `matchMedia` stayed false).
- **getBoundingClientRect on a multi-glyph title gives FALSE-POSITIVE overlaps.**
  A `range.selectNodeContents(title)` ink box for "LOQUOR" reported its right edge
  (253) overlapping the top-right toggle (left 243) by 10px — but the actual "R"
  glyph sits _below_ the pill; the box's top spans the whole line so it
  mathematically intersects empty space the toggle lives in. **Confirm corner
  control vs. title collisions with a `zoom` screenshot of the corner**, not the
  bounding box. (Left side "L" with a true 16px gap was the honest clear case.)
- The scroll-trap fix is **height-driven** (content taller than viewport →
  `.screen:not(.term)`/`.modal-backdrop` scroll, top stays reachable via
  `overflow-y:auto` + `align-items:flex-start` + child `margin:auto` collapsing
  its top margin to 0). You can verify it without a literal wide-short landscape
  window: any case where `scrollHeight > clientHeight` (overlay at 643px AND at
  428px both scrolled, ✕ reachable) exercises the same mechanism.

## Input-parity branch findings (branch `ovid/zork1-input-parity`, 2026-06-19/20)

### Escape-hatch passthrough bug (Task 8) — `vocabWordSet` emit omission

Pinning the advertised quoted-English escape (`"kill thief with knife"`) surfaced a
**real bug**: `vocabWordSet` did not include noun `emit` words (only `match` words
were added), so the canonical English noun in the passthrough command (`knife`,
`torch`, etc.) failed the vocab gate and was rejected. Fix: added `addWords(n.emit)`
alongside `addWords(n.match)` in `vocabWordSet`. Side-effects of that fix (all
committed atomically):

- Newly-visible **emit/match lexicon collisions** for several es nouns (where the
  display form differs from the canonical) had to be recorded in `KNOWN_COLLISIONS`
  so the collision-detector test stayed green.
- The **open-mailbox passthrough test fixture** was wrong (it was testing a no-op
  path that no longer existed); corrected to the actual passing case.
- The fix made the `isIdentityEcho` English-echo-suppression guard in
  `translatePipeline.ts` **permanently unreachable dead code** — it was a defensive
  check for "the passthrough verb+noun matches the raw input exactly, so don't
  double-echo", but with emit words now in the vocab set the passthrough never
  reaches `isIdentityEcho`'s branch. The guard is **harmless** and was flagged for
  the owner but left in place (optional cleanup). Commits: 2ef4d25, 73a3f2d,
  5d99784, b767e94, f93a075.

### fr/de cross-language verification (Task 7)

Both fr and de were found to already pass the shared puzzle-verb cases (songbird,
echo/Loud Room, boat-exit, quantifier-all). Regression pins added in
`src/llm/lexicon/parse.fr-uat.test.ts` and `src/llm/lexicon/parse.de-uat.test.ts`
(commit 76dce58) to lock the passing state. No new lexicon changes needed.

### P2.2 disambiguation templates — DIVERGED from plan (ka-only)

The plan called for per-language disambiguation templates for fr/de/es/ka. On
investigation, the fr/de/es prompts are **deliberately LLM-fallback-routed** — no
raw English leaks for those three languages. Only **ka (corpus-only, no LLM)** had
raw English leaking through. Additionally, `Which of the {obj}s do you mean?` (the
plural form) does not exist in Zork I; the real wording is `Which {raw} do you mean,
the {obj} or the {obj2}?`. Fix was **ka-only**: generalized ka's disambiguation
template to match the real Zork I wording. A new test enforces the
`NATIVE-REVIEW-DRAFT` marker on ka lines (commits 89b1d3f, ef12bce). The orphan
`What do you want to …?` prompt remains a known ka limitation (unbounded object
slot; no fix this branch). **fr/de/es got no disambiguation template changes —
they did not need them.**

> **CORRECTION (UAT 2026-06-20): the "no raw English leaks for fr/de/es" claim is
> FALSE for the `What do you want to put the {obj} in?` prompt** (spec P2.2
> template #1). Browser-verified: typing `mete el folleto` (→ `put advertisement`,
> input translation correct) makes Zork emit that prompt, and it renders **raw
> English in es AND fr** (confirmed universal via the language-switch retranslation
> classifier — the line stays English in both), logged in `loquorMisses()`. Root
> cause is in the console: `[xlate] output translation failed (engine not loaded);
will retry once when the engine is idle: What do you want to put the advertisement
in?`. The WebLLM **weights are cached** (`caches.keys()` → `webllm/model|config|
wasm`, no grammar-only `· basic` chip / `✦ improve` button) but the **inference
> engine is not warm** — and because the improved lexicon resolves every command
> deterministically (stage:`lexicon`, never `llm`), no input ever loads the engine,
> so the queued output-fallback retry never fires and the leak is **permanent for
> that session**. This is the irony the spec foresaw: relying on the LLM for an
> uncovered output line fails exactly when the deterministic path is working well;
> a **corpus template** (engine-independent, as the spec's P2.2 originally
> prescribed for all four languages) is the correct fix. **This is an
> under-delivery against spec P2.2, not a regression** — the leak pre-existed (see
> UAT-es-3 "What do you want to put the torch in?" at line ~294) and P2.2 #1 set out
> to fix it but only shipped the ka multi-candidate template. NOT pinned by any
> test, which is why the green suite missed it. Flagged for Ovid (player-experience
> decision per CLAUDE.md — the "route to LLM" choice leaves a documented player
> harm); /paad:vibe ready to author the es/fr/de corpus template + ka
> NATIVE-REVIEW-DRAFT on his go-ahead.
>
> **RESOLVED 2026-06-20 (Ovid go-ahead → /paad:vibe, TDD).** Authored a
> deterministic corpus template `What do you want to put the {raw} in?` in
> `zork1.{es,fr,de,ka}.templates.ts`. Bound `{raw}` (not `{obj}`) because the
> echoed noun can be a lexicon-emit synonym absent from the object table
> (`advertisement` for the leaflet) — an `{obj}` slot would still leak it — and
> dropped the object on the out side (gender/number-neutral; ka dodges the §4
> locative case). es `¿Dónde quieres ponerlo?` / fr `Où voulez-vous le mettre ?`
> (vous) / de `Wohin möchtest du es legen?` (du) / ka `რაში გსურთ მისი ჩადება?`
> (NATIVE-REVIEW-DRAFT). Pins: cross-language no-leak in
> `composed-lines.uat.test.ts` (the de home), exact-string in
> `zork1.{es,fr,ka}.uat.test.ts`, marker in `ka-native-review-draft.test.ts`.
> `make all` green (1215). Live-verified in a fresh tab across es/fr/de/ka,
> `loquorMisses()` = 0. (`{obj}` "name the object" rendering for table objects is
> a possible nicety follow-up; the uniform object-drop matches ka and never
> leaks.) **The `{raw}`-bound template only covers `put X in?`; the OTHER P2.2
> template, the multi-candidate `Which {raw} do you mean…`, was already shipped
> for ka and was not reached live (needs two ambiguous objects).**
>
> **Compounding (separate, likely out of P2.2 scope):** a disambiguation **answer**
> typed in the target language is **not translated** — `buzon` (mailbox) → no
> `[nl] clause` log, raw-sent → `No conozco la palabra «buzon».`. So even past the
> English prompt, a non-English player cannot _answer_ a disambiguation in their
> language (bare-noun continuation bypasses `nl.translate`). Together these break
> the disambiguation flow for non-English players, undercutting the branch goal
> "completable without ever secretly switching to English." Logged as a follow-up,
> not auto-fixed.

### P3 signposting — localized `help` and one-time escape-hatch notice

Zork I has **no native help/info/commands** (they print "I don't know the word") —
the localized `help` command override is therefore strictly an improvement (verified
by audit in the spec). The help override + one-time escape-hatch activation notice +
localized input placeholder (a11y) were added for fr/de/es/ka (commits e7b4f03,
662015e, 41dc1ab). These are passive; no on-failure detection was implemented.

#### Georgian `help` was DEAD — intercept never wired for ka (UAT 2026-06-20)

**Found in browser UAT (Ovid's headline ask).** en/fr/de/es `help` worked, but
typing `help` in **ka** printed `არ ვიცი სიტყვა „help".` ("I don't know the word
help") — and the ka activation notice _itself_ tells the player
`დახმარებისთვის აკრიფეთ help` ("for help, type help"), so a Georgian player who
followed the on-screen instruction hit a dead end. Root cause: the localized help
intercept (`isHelpTrigger`→`helpResponse`) lives **inside `nl.translate`**
(`translatePipeline.ts:645`), but ka is OUTPUT-ONLY — `Terminal.tsx` routes its
input through the raw-send `else` branch (`engineRef.current.sendLine`), so it
**never calls `nl.translate`** and never reaches the intercept. `help.ts` had a `ka`
alias + `helpResponse('ka')` block, but they were **unreachable dead code**. The
spec's "Georgian caveat" claim that _"the `help` intercept [is] wired for the English
`help` trigger"_ was false. `make test` stayed green because `Terminal.test.tsx`
pins _"ka raw-sends English, never `nl.translate`"_ — the unit tests verified the
building blocks existed while a wiring test verified they were disconnected (a
"tested-in" bug).

**Fix (TDD):** a Loquor-level help intercept at the `Terminal` boundary for the
OUTPUT-ONLY case — `else if (outputOnly && isHelpTrigger(text, activeLang))
nl.showHelp(activeLang)` — before the raw-send. New hook seam `showHelp(lang)` =
`setNotice(helpResponse(lang))` (reuses the same role=status aria-live notice
channel as the in-pipeline help). Every other ka command still raw-sends (the
existing `open mailbox` test passes unchanged — no rewrite needed). Verified in a
fresh tab: `help` → Georgian help block, **moves unchanged** (no turn burned);
`open mailbox` → game opens it, **moves +1**. New pin:
`Terminal.test.tsx` "ka: the help word is intercepted to the Georgian help block".

### Stale catalogue items (already working before this branch)

The following items in the UAT-es-3 catalogue above were confirmed **already
working** in the shipping lexicon before this branch touched them — the catalogue
was stale. Each has been regression-pinned so the passing state is now locked:

- **Conjoined objects + trailing prep phrase** (`mete la antorcha y el destornillador
en la cesta`): `distributePrepTail` already handled this. Pinned commit fd3559c.
- **`apaga` imperative** (`apaga las velas`→extinguish candles): already worked.
  Pinned in commit 51cdc47 alongside `apagar`.

## Input-parity verification UAT (2026-06-20, HEAD cd913f8, suite 1201✓)

Black-box browser run against `2026-06-19-loquor-zork1-input-parity-design.md`.
Method: drive real target-language input at West of House and read the authoritative
console `[nl] clause` `result.text` (the `>` line echoes the _source_, not the
canonical) + screenshots; meta-UI (help/notice/placeholder) read off the DOM.

**P1.1 input puzzle-verbs — ALL PASS (es, via stage:`lexicon`):**
`da cuerda al canario`→`wind up canary`; `sal del bote`→`exit boat`; `eco`→`echo`;
`mata al ladron con el cuchillo`→`attack thief with knife` (personal-`a` stripped:
object=`thief` not `al ladron`; emits generic `knife` off-scope, scoped `rusty
knives` in the attic); `deja todo`→`drop all`; `coge todo`→`take all`; `abre/cierra
la tapa`→`open/close machine`; `coge el jade`→`take figurine`; `coge la calavera de
cristal`→`take skull`; conjoined+prep `mete la antorcha y el destornillador en la
cesta`→ two clauses `put torch in cage`+`put screwdriver in cage`.

**Escape-hatch passthrough — ALL PASS:** quoted `"wind up canary"`, `"echo"`,
`"kill thief with knife"`, `"enter boat"` reach the game with the English canonical
intact (vocabWordSet emit-omission bug confirmed gone).

**P3 signposting — ALL PASS (es/fr/de/ka):** localized `ayuda`/`aide`/`hilfe`/`help`
each render the full localized help block (meta-commands save/restore/restart/quit/
score/diagnose/look/inventory/verbose/brief/version with per-language glosses; the
four named escape commands for fr/de/es; "type in English" for ka) via the
`role="status"` aria-live `.nl-status` region, **no turn burned** (moves unchanged).
Activation notices (es "Consejo…", ka "…for help type help") + localized
placeholders + input aria-labels confirmed for all four. **ka `help`** (cd913f8) is
the headline fix — verified working in a fresh tab.

**P2.2 disambiguation — 1 FAIL + 1 follow-up** (see the CORRECTION block above):
`What do you want to put the {obj} in?` leaks **raw English in es/fr/ka** (engine
not warm → output LLM fallback never runs; no corpus template). Under-delivery vs
spec P2.2 #1, not pinned, flagged for Ovid. The ka multi-candidate "Which … do you
mean" template (the part that DID ship) was not reachable at West of House (needs
two ambiguous objects) — left to unit pins + a deep-gameplay pass (⚠️ DEFERRED).
