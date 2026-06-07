# UAT notes

Running notes to make future UAT passes faster. Add to this freely.

## Autosave / resume: how to test it without being fooled

The native ZVM autosave fires at **each line-input prompt** — including the very
first one, right after the opening room prints and **before the player types
anything**. Consequence:

- An unplayed game still has a save, and **resuming a Turns-0 save looks
  identical to a fresh boot** (same opening room, Turns 0). You cannot tell
  "resume worked" from "resume silently failed" by looking at the screen alone.

How to test resume _decisively_:

1. Play the game to a recognizable, non-trivial state (Turns > 0, a different
   room, an item taken — e.g. Zork III: `take lantern` / `south` / `turn on
lantern` lands you in **Junction** at Turns 3 with the lamp on).
2. Reload the whole page, re-select that game, "Light the lamp →".
3. PASS = the exact state comes back (location, Turns, full scrollback) and the
   resumed VM is **live** (type `look`; Turns must increment).

Ground-truth shortcut: the storage layer logs `[autosave]` lines to the console
(`src/storage/dialog.ts`). Filter the console by `autosave` and read:

- `preload … HIT (will resume)` vs `MISS (no save)`
- `autosave_read … snapshot present` vs `none → fresh start`
  This tells you immediately whether a save existed and was read, independent of
  what the screen shows.

## Save signature: 0300… vs 0360… keys in IndexedDB (loquor → kv store)

Saves are keyed by `autosave:<first-0x1E-story-bytes-hex>`. Byte offset 1 is the
Z-machine **Flags1** header byte, which the VM mutates at runtime (e.g. `00` →
`60`). The engine guards against this by booting on a private copy and capturing
the signature _before_ `prepare()`/`Glk.init()` (see `src/zmachine/engine.ts`
comment ~L83-94), so current saves are stable at `0300…`.

If you see stale `0360…` duplicate keys in IndexedDB, they are orphans from
before that fix — harmless (current code never looks them up), but dead weight.
Inspect with: open `loquor` DB, `kv` store, `getAllKeys()`.

## Misc

- React StrictMode double-mounts the engine in dev, so the initial snapshot is
  written twice on boot (two `autosave_write` log lines). Expected; handled by
  `IdbDialog.dispose()` no-oping the throwaway engine's future writes.
- These games are text adventures with no money/cargo/mission economy, so the
  ovid-uat §6 "Game Balancing" economic lenses do not apply.

## Driving a full Zork I playthrough (proven: 350/350, "Master Adventurer")

A complete win is achievable end-to-end via `scratch/walkthrough.txt` (read-only).
**Caveat:** our story file is **Release 119 / Serial 880429**, but the walkthrough
was written against **Rev 88 / Serial 840726**. Puzzle _solutions_ match, but a few
behaviours differ — watch for these:

- **Loud Room scramble is random.** Entering the Loud Room while the reservoir is
  still draining ejects you out a _random_ adjacent exit (the walkthrough assumes
  "Round Room"). Never batch fixed directions after a Loud Room entry. Once the
  reservoir is fully drained, entry no longer ejects you and `echo` → `take bar`
  works normally.
- **Combat is RNG; the thief can stagger-lock you.** If every attack returns
  "still recovering from that last blow" while you take hits, you're losing
  initiative. Don't grind it out — flee to a lit, thief-free room (the **Living
  Room**), `diagnose` (reports wound severity + "cured after N moves"), `wait` to
  full health, then re-engage. At full health the thief dies in ~3 hits. The thief
  also wanders and _steals treasures from your inventory_ — that's fine, you
  recover everything (incl. an opened egg with intact canary, and any treasure he
  picked up off the floor like the Atlantis-dropped torch) when you kill him.

## Browser-automation gotchas that slow UAT down

- **The "Claude is active in this tab group" overlay steals input focus.** It
  reappears periodically at the bottom of the tab. If it grabs focus _between_
  command batches, an entire batch of typed commands silently no-ops (the Turns
  counter does **not** advance — the tell-tale sign). Mitigation: **start every
  command batch with a `left_click` on the input field** (≈ x=400 at the very
  bottom, which is left of the overlay), then type. Always sanity-check that Turns
  advanced by the number of commands you sent.
- **Type commands via `browser_batch`** (one round trip): click input once, then
  repeated `type "<cmd>"` + `key Return` pairs, ending with a `screenshot`. Focus
  is retained _within_ a batch, so you can fire 10-25 commands at once.
- **Prefer screenshots over `get_page_text` for verification.** `get_page_text`
  returns the _entire_ growing transcript (token-expensive); a screenshot shows the
  recent tail + the status bar (room / Score / Turns), which is what you need.
  Reserve `get_page_text` for tracing a divergence.
- The **Living Room and Kitchen are naturally lit** (no lamp needed) — handy spots
  to `wait`/heal without burning lamp battery.

## Forcing a fresh game (clear the Zork I autosave)

To start a new game instead of resuming, delete the IndexedDB `kv` key for the
story signature, then reload. The **Zork I** key is the one whose 30-byte signature
matches `/games/zork1.z3` (Release 119 ends `…2c12004038383034323901f0a99bbf44`).
Compute/compare the signature _inside_ the page and return only the match index or
a dash-joined hex string — returning the raw hex/key trips a base64 content filter
in the JS tool. After deletion + reload, the landing drops the "a saved descent
awaits" hint and "Light the lamp" begins at West of House (Turns 0).
