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
