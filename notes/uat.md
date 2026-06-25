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
- **CORRECTION (2026-06-23): most "window resized between shots" drift was
  actually the transcript NOT scrolled to the bottom — now fixed (commit
  127243c).** Root-caused in-browser via `/systematic-debugging`:
  `Scrollback.tsx` auto-scrolled once in a `useEffect([lines])` and landed a
  dead-stable **56px short** of the bottom (the command prompt is the last
  child of the `div.scroll` container; its box lays out AFTER the scroll), so
  the prompt sat clipped and content rendered ~one line off the y you read a
  moment earlier. The viewport itself was stable (`innerW/H` constant;
  screenshot px == CSS px), so it was **scroll, not resize**. Fixed with
  `useLayoutEffect` + a `requestAnimationFrame` re-assert. **Belt-and-braces
  for any session, even post-fix:** before reading a y-coordinate or zooming,
  pin the bottom yourself —
  `document.querySelector('div.scroll')?.scrollTo(0, 1e9)` — so a screenshot
  and a follow-up click/zoom see the SAME scroll position. Genuine viewport
  resizes still happen occasionally (screenshot dims jumped 1384→1456 once
  this session), so still re-screenshot fresh after a real size change.
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

- **Find warm-LLM gate gaps OFFLINE first, with a `isVocabPassthrough` sweep —
  no browser turns needed (UAT 2026-06-22, found BUG E + BUG F).** The whole
  A/C/D/E/F bug class is one shape: a natural English command with ONE token the
  vocab gate doesn't know routes to the warm LLM, which mangles it. Enumerate the
  candidates en masse in a throwaway `*.test.ts`: feed natural-English
  rephrasings of every walkthrough action (articles + adjectives + the game's own
  display nouns + verb/prep synonyms) to `isVocabPassthrough(cmd, ZORK1_VOCAB,
null)`, and for each `false`, print the tokens that fail
  `words.has(t) || words.has(t.slice(0,6))` (the same 6-char-truncation widening
  the gate uses). The unknown token IS the root cause: a SHARED unknown across
  many probes is a high-value systemic gap (`of` → 10 "X of Y" object names;
  `all` → the modified-quantifier forms), a one-off unknown is usually a non-Zork
  word (`shove`, `inspect`) where the LLM mapping is actually fine. Then confirm
  only the shared-cause hits live (`stage:"llm"`) and fix the gate. Cross-check
  any candidate against the ZIL before calling it a bug: `gsyntax.zil` `<BUZZ …>`
  (noise words like `of` the parser ignores) and `<SYNONYM …>` (verb/prep
  synonyms); a token that's neither a buzz/synonym/verb/noun is genuinely unknown
  to Zork, so raw-sending would fail and the LLM is the right path.
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
- **A clean-looking GAME response can MASK an LLM mangle — the screen lies, the
  `[nl] clause` log doesn't.** (UAT 2026-06-22, BUG C.) `inflate plastic with
pump` printed "You can't see any pump here!", which reads as a correct parse —
  but the console showed `stage:"llm"` / `result.text:"turn on pump"`: the LLM
  had dropped the verb. The plausible game error came from the _mangled_ command,
  not the typed one. **ALWAYS confirm a command raw-sent (`stage:"vocab"`/
  `"lexicon"`, `result.text` ≈ input) before trusting it parsed** — a missing
  vocab word produces a different-but-still-plausible Zork error every time.
  Fastest capture for English `full` runs (the console reader DUPLICATES history):
  patch `console.log` once to push `[nl] clause` payloads into a
  `window.__nlClauses` array, reset it per probe, read it after.
- **A verb in the vocab as a 6-char-truncated form (`inflat`) raw-sends for
  fr/de/es but NOT for English.** The lexicon `hasVerbForm` is truncation-aware;
  the English `vocabWordSet`/`isVocabPassthrough` gate is exact-match. So a
  truncated verb head is an English-only leak (fixed for BUG C by de-truncating
  in `scripts/lib/zil.mjs`). When a puzzle verb fails ONLY in English, suspect a
  truncated `verbs2`/`verbs1` entry: `grep -n "'[a-z]\{6\}'" zork{N}.vocab.ts`.

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
> **Compounding (separate; diagnosed 2026-06-20, a ROUTING fix not a lexicon
> one):** a disambiguation **answer** typed in the target language is **not
> translated** — `buzon` (mailbox) → no `[nl] clause` log, raw-sent → `No conozco
la palabra «buzon».`. Sharpened diagnosis: when the game is mid-orphan-prompt the
> next line **bypasses `nl.translate` and raw-sends** — even `mira` (a known verb →
> `look`) printed `No conozco la palabra «mira»` mid-prompt while translating fine
> at a normal prompt. A parse-level "bare noun → canonical" fix (`parse.ts`
> `if (!verb)` → `resolveNoun`) was prototyped and **reverted**: it correctly makes
> `buzon`→`mailbox` at a NORMAL prompt (→ Zork's `¡No había ningún verbo en esa
frase!`) but can't help the answer, which is bypassed before parsing. The real
> fix lives in the input-queue / turn-boundary handling (`translatePipeline.ts` /
> the Terminal queue). Logged as a follow-up in `notes/next.md` (P2.2); deferred as
> genuinely complicated, not auto-fixed.

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

## Review-fix verification UAT (2026-06-20, branch `ovid/zork1-input-parity`)

Verified the agentic-review fixes (`notes/uat-run.md`). I3 ✅ (ka cmd-input has NO
`lang`, es has `lang="es"` — input `lang` follows INPUT language), help intercept
✅ (en/es/ka live, no turn burned, `role=status` aria-live, S2 escape examples
present), I4 (model cached → upgrade modal unreproducible; trust unit pins).

### ⭐ The on/under/behind put-orphan prompts DO NOT EXIST in this Zork I (I1)

The I1 review fix templated `What do you want to put the {raw} on/under/behind?` in
all four corpora, assuming `put X on` reprints the prep. **Browser UAT (plain
English) proved the parser never emits those prompts:** `put lamp on` resolves to
the WEAR verb → `You can't wear the brass lantern.`; `put lamp under` / `put lamp
behind` are unparsed → `That sentence isn't one I recognize.` Only the **bare
`put X`** orphan fires (defaulting to "in") → `What do you want to put the lamp
in?` — reached by OMITTING the prep, NOT by typing `put X in` (a dangling `in` is
also "that sentence isn't one I recognize"). So the on/under/behind templates were
unreachable dead code (removed, commit 4fb4912). The REAL player-facing leaks those
inputs produce — `You can't wear the {obj}.` and (closed container) `The {obj}
isn't open.` — leaked raw English in **ka only** (fr/de/es template them); fixed
with ka corpus templates (commit c3c50d9). **Lesson:** a green unit suite can pin a
template's TRANSLATION without proving the game ever emits the English string —
always confirm the trigger live before trusting "fixed".

### I2a 4-button disambiguation — ✅ verified live (the deep-gameplay pass)

Reached the Maintenance Room and confirmed `push button` → the ka 4-candidate
prompt `რომელ button-ს გულისხმობ — ლურჯი ღილაკი, წითელი ღილაკი, ყავისფერი ღილაკი
თუ ყვითელი ღილაკი?` (typed noun `button` kept English, all 4 colors Georgian,
joined by `თუ`, no raw-English frame, `loquorMisses()`=0). Confirmed BOTH by the
language-switch retranslation classifier (works even mid-disambiguation: type
`push button` in English, switch picker to ka, the pending prompt retranslates in
place) AND a fresh live `push button` in ka.

**Dam-buttons route (from a West-of-House save, ~17 turns, ONE troll fight):**
Living Room → `take sword` + `turn on lamp` (grue-safety!) → `move rug` → `open
trap door` → `down` (Cellar) → `north` (Troll Room) → `kill troll with sword`
(died in 1 hit this run) → `east` (E-W Passage) → `east` (Round Room) → `north`
(North-South Passage) → `northeast` (Deep Canyon) → `east` (Dam) → `north` (Dam
Lobby) → `north` (Maintenance Room). The 4 buttons all answer to `button`. **Do
NOT press the BLUE button** (floods the room, drowns you) — to abandon the
disambiguation safely, type a non-button command like `look`. I2b (2-candidate) was
not independently reachable (needs two same-noun objects in scope, late-game); the
2-candidate template is the strictly-simpler sibling of the verified 4-candidate
and is unit-pinned — covered by extension.

## Walkthrough NL sweep (2026-06-22, branch `ovid/fix-the-it-bug`) — ⭐ BUG G: PSEUDO-scenery LLM mangle

Ran the offline `isVocabPassthrough` sweep over 214 natural-English rephrasings of
every Zork I walkthrough action (articles + the game's _display_ nouns + adjectives

- verb synonyms), then the recommended ZIL cross-check, then live confirmation in a
  warm-LLM browser session. **Two technique refinements that made the result rigorous:**

* **Diff the game's WHOLE dictionary against our gate, not just the probes.** Extract
  every `(SYNONYM …)` + `(ADJECTIVE …)` word from `1dungeon.zil`/`zork1.zil` (319
  words) and check `our.has(g) || our.has(g[:6])` for each. Result: **0 of 318 game
  dictionary words are rejected** by our gate when the player types the game's own
  word — the BUG A–F fixes hold, the gate is healthy. So every sweep rejection is
  EITHER flavor prose the game ALSO rejects (LLM route is correct) OR an edge class.
* **The edge class the dictionary-diff misses: room-level `(PSEUDO "WORD" FUNC)`
  scenery.** `extractNouns` (`scripts/lib/zil.mjs:483`) only scans `<OBJECT …>`
  forms; `(PSEUDO …)` lives inside `<ROOM …>` blocks and is **never extracted**, so
  those words reach neither `vocabWordSet` NOR the GBNF grammar. Grep them with
  `grep -hoE '\(PSEUDO[^)]*\)' zork1/1dungeon.zil`. Zork I has 13 distinct PSEUDO
  words; **10 are absent from our gate**: `chain, chasm, dome, gas, lake, nail,
nails, odor, paint, stream` (`door`/`gate`/`gates` are covered by real objects).

**⭐ BUG G (live-verified twice, full LLM mode, East-West Passage):** examining a
PSEUDO-scenery object **silently mangles to `look`**. The grammar lacks the noun, so
the constrained LLM cannot emit it and **drops the object entirely**:

- `examine the iron chain` → `stage:"llm"`, `raw:{"verb":"look"}`, `result.text:"look"`
  → prints the room description, +1 turn. Player's command silently lost.
- `examine the dome` → `stage:"llm"`, `{"verb":"look"}` → same.
- CONTRAST (why it's specifically the missing noun): `examine the sword of great
antiquity` → `{"verb":"examine","object":"sword"}` → "There's nothing special about
  the sword." The grammar-constrained LLM strips the flavor adjectives FINE when the
  noun (`sword`) is in the grammar; it only fails when the noun itself is missing.
  This is exactly the BUG C masking lesson — a clean-looking room redraw hides a
  dropped command. The `[nl] clause` log is the only tell.
- Also verified healthy this run: English conjoined objects `drop the lunch and the
glass bottle` → two `stage:"vocab"` raw-sends, both "Dropped." (no LLM); and the
  modified-quantifier fixes (`drop all but the lamp` / `put all in case` / `take all
except the lamp`) all worked in the resumed transcript (BUG F holds).

**RESOLVED 2026-06-23 (Ovid go-ahead "A" → option A, TDD).** Added a NEW
`extractScenery(dungeonSrc, knownWords)` in `scripts/lib/zil.mjs` that reads room
`(PSEUDO "WORD" FUNC …)` properties (the part of `<ROOM>` blocks `extractNouns`
never sees), deduped/sorted, EXCLUDING words already known via real objects/verbs
(door/gate/gates back real objects → not re-added). Chose a **separate
`Vocab.scenery?: string[]` field** (NOT folding scenery into `nouns`) so the words
feed ONLY the GBNF grammar (`buildGrammar` noun production) + the passthrough gate
(`vocabWordSet`) + the `parseCommand` emit-validation set — and stay OUT of the
scene tracker (`mentions`/`surfaceForms`/antecedent). Rationale: pseudo-objects are
stateless room-local flavor, never an "it" referent, and this avoids perturbing the
scope/"it" machinery (the very thing this `ovid/fix-the-it-bug` branch is about) and
the emit-uniqueness/collision logic. Regenerated `zork{1,2,3}.vocab.ts`: zork1
scenery = `chain chasm dome gas lake nail nails odor paint stream` (the 10 leaking
words exactly); zork2 got `homunculi mortar owl pestle riddle stalactite stalagmite`;
zork3 `torch torche`. **Live-verified in a fresh tab:** `examine the chain` →
`stage:"vocab"` raw-send; `examine the iron chain` → `stage:"llm"` now emits
`{"verb":"examine","object":"chain"}` (object PRESERVED) → both print Zork's honest
"You can't see any chain here!" instead of the silent "look" room-redraw. `make all`
green (1322). Pins: `scripts/lib/zil.test.mjs` (extractScenery + buildVocabModule),
`buildGrammar.test.ts`, `inputTranslate.test.ts` (gate + parseCommand, fixture AND
real ZORK1_VOCAB "examine the chain"), `vocab-invariants.test.ts` (scenery set,
disjoint-from-nouns, door/gate/gates excluded, grammar-emittable). Multilingual: the
scenery words are the GAME's English nouns → they help ALL LLM input languages
(fr/de/es scenery typed in-language → lexicon miss → LLM can now emit the English
canonical) + English passthrough; ka (output-only, raw-sends English) is unaffected
on input, exactly as required. Note for a future pass: Zork II/III scenery is now
extracted too but was NOT live-played this session (zork1 only) — worth a quick
in-game scenery probe when those games get a UAT.

## Pronoun / "it"-resolution sweep (2026-06-23, branch `ovid/fix-the-it-bug`) — ⭐ BUG H + BUG I

The vocab gate is healthy after BUG A–G, so this pass mined the OTHER NL surface
the branch is named for: **English "it"/"them" resolution.** The walkthrough spells
out every object, but a real player leans on pronouns constantly ("take lamp; turn
it on", "open coffin; take it", "put it in the case"). Two new bugs, both live-
confirmed and fixed (TDD), both in the same family the deterministic-pronoun path
was built to close.

**Technique — offline scene-tracker replay + a `runClause` LLM-sentinel.** No new
gate sweep needed; instead replay walkthrough turns through the REAL machinery in a
throwaway `*.test.ts`:

- Fold `reduceScene(prev, {location, outputText, lastCommand}, ZORK1_VOCAB)` over
  the walkthrough's own command/output pairs to build the live `antecedent`/`inScope`
  at each step (the walkthrough IS the game output, so the replay is faithful).
- Classify a probe by calling the REAL `runClause(clause, scene, 'en', null, false,
deps)` with `generateRaw: async () => { throw LLM_SENTINEL }`. Any probe that
  throws the sentinel REACHES THE LLM (= candidate "it"-bug, since the LLM ignores
  the antecedent and anchors the pronoun to a constant noun). A probe that returns
  `stage:"vocab"`/`"lexicon"` is safe.
- Then confirm live in a warm-LLM English session and read `window.__nlClauses`
  (`[nl] clause` capture hook) — the screen LIES (BUG C lesson): "turn it on" printed
  the correct "It is already on." while the log showed `stage:"llm"`,
  `raw:{"verb":"turn on","object":"light"}` — the LLM dropped "it" and hit the lamp
  only by luck (light≈lamp). The decisive proof is comparing the LLM route to the
  quoted raw-send escape hatch: `put lunch in it` → LLM → "take food" → "You already
  have that!" vs. `"put lunch in it"` (quoted, raw-sent) → Zork's correct "There's no
  room." **Zork's native "it" is authoritative — it even beat our tracker (which had
  a stale `antecedent`).**

**⭐ BUG H (RESOLVED 2026-06-23, commit ae43cc9):** richer English pronoun forms —
particle `turn it on` / `pick it up`, container `put painting in it`, prep-tail
`give it to thief` — fell through BOTH `resolveEnglishPronoun` AND the old
`isEnglishPronounClause` to the warm LLM, which mangled them. Root cause:
`englishVerbBeforeTail` only matches a pronoun in FINAL position after EXACTLY one
verb phrase, so word order alone decided the outcome (`turn on it` → deterministic
"turn on lamp", but `turn it on` → LLM). Fix: broaden `isEnglishPronounClause` (the
raw-send net, parse.ts) to raw-send ANY clause that leads with a known vocab verb,
holds exactly one `it`/`them` token, and whose every other token is a Z-parser word
(`vocabKnows`, truncation-aware) — Zork's parser tracks "it" natively. Bare-form
`resolveEnglishPronoun` (deterministic substitution, nicer echo) unchanged and still
runs first. ENGLISH-SPECIFIC: raw-send presumes the English VM; fr/de/es already
resolve container/direct pronouns in `parseLexicon`'s `pronounsContainer`/
`pronounsDirect` branches (the English particle-in-the-middle construction has no
fr/de/es analog — they attach a clitic, a different path). Pinned:
`parse.test.ts` "richer pronoun forms (BUG H)". Live-verified fresh tab: `turn it
on`/`put lunch in it` now `stage:"vocab"`, correct Zork responses.

**⭐ BUG I (RESOLVED 2026-06-23, commit fdffbe4):** examining/looking-in an EMPTY
container scrubbed it from scope, so `examine bottle` then `open it` opened the
PREVIOUSLY-referenced object (live: `examine sword` → `examine bottle` → `open it`
→ "You must tell me how to do that to a sword."; log `stage:"lexicon"`,
`text:"open sword"`). Root cause: `ABSENCE_PAT`'s `"X is empty"` clause (present
since the first scene-tracker commit) captured the CONTAINER named before "is empty"
and `suppressed()` removed it — but "X is empty" means X is PRESENT, only its unnamed
CONTENTS are absent, so suppressing X is backwards (and there were never named
contents to suppress). Fix: drop the `\b([a-z]+)\s+is\s+empty\b` alternative from
`ABSENCE_PAT` (patterns.ts). Correct on all three consumers — `suppressed()`
(tracker), `clauseFailed()` (compound abort), `refusalApplies()` (`failurePat`, never
used "is empty" anyway): examining an empty container is a SUCCESSFUL command, not an
absence/failure. Multilingual: `ABSENCE_PAT` is shared EN/FR/DE/ES, so all input
languages get the corrected scope; output corpora unaffected. Pinned:
`tracker.test.ts` "an empty-container line keeps the container as the antecedent";
the two tests that pinned the old suppression (`patterns.test.ts`, `tracker.test.ts`
"absence/negation suppresses a mention") updated to corrected behavior. Live-verified
fresh tab: `open it` after `examine bottle` → `stage:"lexicon"`,
`antecedent:"glass bottle"`, "open bottle".

**Confirmed healthy this pass (no bug):** compound + pronoun (`drop sword and take
it` → clause 2 `take it` → "take sword"; the compound loop observes between clauses);
`look in it` after `examine bottle` (raw-send net covers `verbsOnly` verbs);
bare `open it`/`read it`/`take it` still deterministically substitute via
`resolveEnglishPronoun`. The emit-form echo (`take it` → "take advertisement" for the
leaflet) is BY DESIGN — `advertisement` is a real Zork dictionary word, so it
resolves correctly; only the nl-source echo looks odd.

## Implicit-instrument parenthetical UAT (`ka (with the …)`, 2026-06-24, branch `ovid/composed-line-gate`)

- **GWIM fires BEFORE the verb's scope check, so you can test ANY weapon's
  `(with the X)` instrumental with ZERO combat risk** — hold exactly one weapon and
  `attack <non-target>` (e.g. `attack trophy case`) or even `attack <gone-enemy>`
  (`attack troll` after the troll is dead): the parenthetical prints, then the verb
  refuses ("…you don't have…", "I can't see any troll here!"). This is how I confirmed
  the **bloody axe** `(სისხლიანი ცულით)` with no live enemy: kill troll with sword →
  `take axe` → `drop sword` → `attack troll` (gone) → GWIM auto-supplies the lone axe.
- **"sole eligible member of the bit-class" is the whole trick.** Holding two weapons
  makes `attack`/`cut` DISAMBIGUATE instead of auto-supplying — you'll never see the
  parenthetical. `drop` the others first. (sword vs nasty knife: drop one to test the
  other.)
- **Check own-line-vs-glued via per-`<p>` DOM read, not screenshots.**
  `[...document.querySelector('div[role="log"]').querySelectorAll('p,h1,h2')]
.map(e=>({lang:e.getAttribute('lang'),text:e.textContent.trim()}))` shows each line as
  its own element. The §6 "is the parenthetical glued to the combat result?" question is
  answered instantly: `(მახვილით)` is its own `<p lang="ka">`, the result is a separate
  `<p>`. Confirmed across 6 live `attack troll` rounds — gluing does NOT happen (GlkOte
  newline-terminates the parenthetical regardless of verb).
- **The autosave resumes a partly-played game** — this session resumed straight into a
  lit Living Room with the sword/lantern on the floor (golden-path start, no replay
  needed). A fresh tab + navigate resumed it cleanly.
- **⭐ The troll fight is a corpus-LEAK MAGNET for no-LLM `ka`: combat messages are
  PROBABILISTIC, so the walkthrough-coverage gate only captured the variants its one
  recorded run happened to roll.** A 6-round troll fight surfaced 6 distinct
  **player-attack-result** lines leaking raw English in `ka` (staggered/drops to knees,
  regains feet, "good slash misses by a mile", "good stroke too slow; dodges", "knocks
  back stunned", "It's curtains…removes his head") — while the **troll's-own-attack**
  variants and the death-fog line WERE covered. Lesson for any `ka`/no-LLM output UAT:
  **fight something for several rounds and read `loquorMisses()` after each** — the
  randomized combat tail is exactly where the coverage gate is blind, and `ka` has no
  LLM net to paper over it. (Logged 2026-06-24 as a native-review follow-up, not a
  parenthetical-branch bug.)

## Georgian genitive-case objects + the disambiguation-window trap (2026-06-25, branch `ovid/georgian-genitive-case-objects`)

- **Feature verdict: genitive-compound objects work end-to-end.** `wrench` is now
  `ქანჩის გასაღები` ('nut-key', a genitive compound) with NO bare `გასაღებ` synonym
  (that's the skeleton key). Confirmed live in the Maintenance Room: `აიღე ქანჩის
გასაღები` → "Taken.", renders as `ქანჩის გასაღები` in both room desc AND inventory,
  bare `გასაღები` still → skeleton `key` (no collision). The stranded-modifier rejoin
  (k=1 case, k=2 air-pump, egg ablatives, mis-bind guard) is fully pinned at the parse
  layer — black-box probe via a throwaway `*.tmp.test.ts` importing `parseLexicon`
  (imports: `parse`, `ka.core`, `ka.zork1`, `../grammar/zork1.vocab`,
  `Scene` from `../scene/types`; `empty = {inScope:[],antecedent:null}`).
- **⭐ BUG FOUND + FIXED: the disambiguation/confirmation/orphan detector stayed "stuck
  on" for several turns after the prompt was answered, swallowing the player's NEXT
  command with the "answer with the full name" hint.** Root cause: `viewToContext`
  (`src/llm/prompt.ts`) bounded `recentOutput` by scanning for `kind === 'input'`, but
  TRANSLATED-language command echoes are `kind === 'nl-canonical'`, never `input`
  (`reduce.ts`, because ka/fr/de/es send via the canonical seam). So the boundary never
  reset and `recentOutput` spanned the last 1500 chars of the WHOLE transcript — a prior
  turn's `which … do you mean` lingered and kept `isDisambiguationPrompt` true. Fix: the
  boundary scan now also resets on `nl-canonical`. One-liner, but it's a CENTRAL fn (all
  languages + the LLM prompt context) → full-suite re-run + a live repro were required.
- **⭐ How to inspect line KINDS live (you can't tell `input`/`nl-canonical`/`nl-source`
  apart from the DOM — Scrollback renders them all as class `echo`).** Walk the React
  fiber from a `.echo` node to the Scrollback `lines` prop:
  `function getFiber(el){for(const k in el)if(k.startsWith('__reactFiber$'))return el[k];}`
  then climb `f.return` until `f.memoizedProps.lines` is an array of `{kind,text}`. This
  is THE way to diagnose `recentOutput`-boundary / prompt-detection bugs.
- **GOTCHA: the autosave can resume mid-disambiguation.** This session resumed straight
  into a pending "Which button do you mean?" in the Maintenance Room — a confound for any
  input test. **Escape hatch:** an English/ASCII raw-send (`look`) breaks out even while
  the (believed) disambiguation is active — and because a raw send echoes as `kind:
'input'`, it ALSO resets the `recentOutput` boundary, which is what tipped off the root
  cause above. A Georgian-only player had NO such escape before the fix.
- **The 4-candidate button disambiguation renders fully in Georgian** (`რომელი
გულისხმობ — ლურჯი ღილაკი, …?`), and the I3 reply resolver works: `ყვითელი ღილაკი`
  → "yellow button" → `წკაპ.` ("Click."). The fix only RELEASES the trap once the
  prompt is answered; it doesn't touch the reply resolver.
