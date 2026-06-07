# Loquor — First Pass Design

**Date:** 2026-06-06
**Branch:** `ovid/first-pass`
**Status:** Approved (design); pushback review applied (2026-06-06). Ready for the
pre-planning spike, then implementation planning.

## Summary

Loquor is a browser app for playing Zork I, II, and III on top of the
`ifvms.js` Z-machine. This first pass delivers a self-contained React app where
the player picks a game, plays it by typing commands the game's own parser
understands, and resumes automatically where they left off.

The natural-language / LLM layer that the project is ultimately named for
(*Loquor* — Latin for "I speak") is
**explicitly out of scope for this pass** and is documented separately in
[`docs/notes.md`](../../notes.md).

## Goals

- Play Zork I, II, and III in the browser, fully client-side (no server).
- Landing screen with instructions and a game picker → in-game terminal.
- Automatic save/resume per game: close the tab, come back, continue.
- A distinctive, intentional visual identity ("Folio") with dark and light modes.
- Code structured so the future LLM layer drops into a known seam without a
  rewrite.

## Non-Goals (this pass)

- No LLM, no grammar-constrained decoding, no natural-language input.
- No vocabulary extraction from ZIL source.
- No model-download modal.
- No multiplayer, accounts, or cloud sync. Storage is local to the browser.

## Stack

- **Vite + React + TypeScript.**
- **Z-machine:** `ifvms.js` (ZVM), consumed from npm rather than the gitignored
  local checkout, so we never modify vendored source.
- **Glk layer:** **vendor `glkapi.js`** from
  [erkyrath/glkote](https://github.com/erkyrath/glkote) (MIT), pinned by upstream
  commit SHA, under `vendor/glkote/` with a thin ESM wrapper. This is the
  classic Glk layer already paired with ifvms in Parchment, and it **injects
  GlkOte as a swappable dependency** (`vm_options.GlkOte`) — exactly our seam. It
  is *not* an npm install: the spike confirmed no clean browser-Glk package exists
  on npm (`asyncglk` is GitHub-only/v0.1.0/Svelte; `parchment` on npm is an
  unrelated Quill package). See the spike:
  [`docs/spikes/2026-06-06-glk-vite-spike.md`](../../spikes/2026-06-06-glk-vite-spike.md).
- **GlkOte display + Dialog:** **ours**, injected into the vendored Glk via
  options — these are the React/storage seams.

## Architecture

The VM does not touch the DOM. It calls into a **Glk** API; Glk batches output
into JSON "update" objects and drives a **GlkOte** display; player input comes
back as Glk "event" objects. Save state flows through a **Dialog** object. We
build the display and Dialog; we reuse the VM and Glk.

Four units, each with one responsibility and a clear interface:

### 1. `zmachine/` — engine wrapper

A typed façade over ZVM. Owns the VM + Glk instances and the run lifecycle.

- `prepare(storyBytes, { Glk, GlkOte, Dialog, do_vm_autosave: true })`
- `start()` — boots the VM; auto-restores from autosave if one exists.
- `sendLine(text)` / `sendChar(key)` — deliver player input as Glk events.
- Exposes lifecycle/state (running, quit) to the UI.

Verified ZVM contracts (from `ifvms.js/src/zvm.js`, `runtime.js`):
- `prepare()` requires a `Glk`; throws otherwise.
- The story header yields a **signature** (`ram[0..0x1E]`) that ZVM uses as the
  autosave key — i.e. per-game slots are automatic.
- On `start()` with `do_vm_autosave`, ZVM reads `Dialog.autosave_read(signature)`
  and, if a snapshot exists, calls `do_autorestore()` — no transcript replay.
- `do_autosave()` builds a serializable snapshot `{ glk, io, ram, read_data,
  xorshift_seed }` and calls `Dialog.autosave_write(signature, snapshot)`.

### 2. GlkOte React bridge — `glkote-react/`

Our implementation of the GlkOte display contract that Glk drives.

- Receives `update` objects (status grid window, main buffer window, input
  request) and reduces them into React state (scrollback lines, status line,
  awaiting-input flag).
- Sends the player's submitted line back to Glk as a line-input event.
- Window identification is by the GlkOte window **`type`** (`'buffer'` = main,
  `'grid'` = status/upper) carried on each `update`'s `windows` entries — this is
  the strategy the reducer uses. ZVM's rocks (`201` = main buffer, `202` = status,
  `203` = upper window) are a stable cross-check if a `type` is ever ambiguous.
- **Handles non-line-input interactions** (not just the happy-path line loop):
  - **`[MORE]` paging:** the VM issues a char-input request when output overflows.
    In an infinitely-scrolling web UI this would silently stall the game, so the
    bridge **auto-acknowledges** MORE prompts — all text flows into the scrollback
    continuously.
  - **Char-input / "press any key":** intro screens and some prompts request a
    single key rather than a line. The bridge satisfies a pending char-input
    request from **any keypress** in the input box (rather than requiring Enter).
  - **Turn boundary / autosave trigger:** the precise moment the game autosaves
    is when the bridge receives a **line-input request** (the VM has finished the
    previous command and is asking for the next line). The autosave is performed
    **natively** by ifvms+glkapi (`do_vm_autosave: true`), which fires at this
    exact boundary; the bridge exposes an observer-only `onTurn` seam at the same
    point. The bridge does **not** call `do_autosave()` itself — doing so would
    double-save against the native write.

**This is the future LLM interception seam:** raw player text enters here before
becoming a Glk event, and room/status text is observable here. The later
natural-language layer hooks this boundary without touching the VM or UI.

### 3. `storage/` — IndexedDB Dialog

Our `Dialog` implementation backed by IndexedDB.

- `autosave_read(signature)` / `autosave_write(signature, snapshot|null)` — the
  transparent-resume path. Keyed by game signature.
- Minimal fileref handling so explicit in-game `SAVE` / `RESTORE` map to named
  slots in the same store and do not crash. (Named saves are a thin extra on top
  of autosave, not the headline feature.)
- Autosave fires **natively** (`do_vm_autosave: true`) at each turn boundary
  (when the GlkOte bridge receives a line-input request — see unit 2), so a tab
  close never loses more than the current unsubmitted line. The engine adds no
  manual `do_autosave()` call (that would double-save).
- **On clean game end** (the VM reaches `quit`, e.g. death or victory followed by
  `QUIT`), the autosave slot for that game is **cleared** — so reopening the game
  starts a fresh session rather than auto-resuming into a "You have died" screen.

### 4. UI — `ui/`

- **Landing screen:** title, how-to panel with sample commands, the three games
  presented as "volumes" (I / II / III), an Enter button, and a resume hint when
  a saved game exists for the selected volume.
- **Terminal screen:** brass status bar (location · score · moves · change-volume),
  line-by-line fading scrollback, and a command input pinned to the bottom.
- **Game-end behavior:** when the VM quits/ends, the command input **stays live**
  so the player can still type `RESTART` / `RESTORE` (the game's own end prompt).
  The autosave slot is cleared on clean quit (see *storage*), so leaving and
  returning begins anew.
- **Theme toggle** (dark/light), persisted as a user preference (localStorage).
  It is an **in-layout element** — placed in the corner of the landing plate and
  as an item inside the terminal status bar (after "change volume", separated by
  rules). It is **never** a free-floating `position:fixed` overlay, which would
  collide with the status-bar chrome. The status-bar location text truncates with
  ellipsis so a long room name never crowds the score/moves/toggle cluster.

## Game files

`zork1.z3`, `zork2.z3`, `zork3.z3` are copied from the gitignored
`zork{1,2,3}/COMPILED/` directories into the app's `public/` assets and committed
to this repo (~85 KB each). The app fetches the selected game's bytes at runtime
and hands them to the engine. This keeps the runtime independent of the
gitignored source and works offline. The gitignored directories are never
modified.

## Data flow (one turn)

1. Player types a command, presses Enter.
2. GlkOte bridge delivers it to Glk as a line-input event.
3. ZVM runs, emits Glk output; Glk produces an `update`; the bridge reduces it
   into React state (new scrollback + updated status line).
4. VM blocks for the next line input.
5. Native autosave (`do_vm_autosave`) fires at that boundary →
   `Dialog.autosave_write(signature, snapshot)`. (The bridge's `onTurn` seam
   fires here too, but only as an observer — it does not autosave.)

On game open: fetch bytes → `prepare()` → `start()` → if an autosave exists ZVM
auto-restores; otherwise it runs from the beginning.

## Visual identity — "Folio" (locked)

Two themes, one identity, driven by CSS custom properties. Display font
**IM Fell English / IM Fell English SC** (title, room headings, chrome); body /
game text **JetBrains Mono**. Shared motifs: paper-grain overlay, radial
light/vignette, brass accent, glowing `>` caret, one-time lantern-flicker on the
title at load, line-by-line fade-in of room text.

**Fonts are self-hosted, not loaded from a CDN.** Both faces are SIL Open Font
License (IM Fell English: OFL; JetBrains Mono: OFL 1.1), which permits bundling
them unmodified. We ship the `woff2` files as app assets referenced via local
`@font-face`, and include each font's `OFL.txt` alongside them (the license's only
obligation for us). This honors the "fully client-side / works offline" promise —
a CDN dependency would leak the user's IP to a third party and silently degrade
the entire visual identity to system fonts when offline.

### Lamplit Folio (dark, default)

| token | value |
|---|---|
| `--bg-base` | `#0E0B08` |
| `--text` / `--text-dim` | `#e7dcc4` / `#b8ac90` |
| `--brass` / `--brass-soft` | `#E8A33D` / `#caa46a` |
| `--ember` | `#c5482f` |
| `--rule` | `#3a2c1c` |
| `--vignette` | `rgba(0,0,0,.55)` |
| grain | opacity `.05`, blend `overlay` |
| caret | glows (`0 0 12px rgba(232,163,61,.6)`) |

### Daylit Folio (light)

Same identity as an aged manuscript page. Brass is **darkened** for contrast on
parchment (bright `#E8A33D` is unreadable on light), glow softened, grain switched
to `multiply`, vignette warmed to read as aged page edges.

| token | value |
|---|---|
| `--bg-base` | `#e7dcc4` (parchment) |
| `--text` / `--text-dim` | `#3a2c1c` / `#6b5740` (sepia ink) |
| `--brass` / `--brass-soft` | `#9a6312` / `#7c5a2a` |
| `--ember` | `#a5371f` |
| `--rule` | `rgba(90,65,35,.40)` |
| `--vignette` | `rgba(90,60,25,.26)` |
| grain | opacity `.07`, blend `multiply` |
| caret | no glow (solid brass) |

The approved interactive mockup is preserved at
`.superpowers/brainstorm/<session>/content/lamplit-folio-v3.html` (v3 places the
theme toggle in-layout; supersedes v1/v2).

## Risks & first milestone

The load-bearing risk is getting **ZVM + Glk + our custom GlkOte display** to run
standalone under Vite. It is addressed in two steps:

### Pre-planning spike — **DONE (2026-06-06)**

Both questions resolved; see
[`docs/spikes/2026-06-06-glk-vite-spike.md`](../../spikes/2026-06-06-glk-vite-spike.md).

1. **Glk layer — pinned.** Vendor `glkapi.js` (erkyrath/glkote, MIT) by commit
   SHA; it injects a swappable GlkOte, so the custom-display architecture holds.
   No clean npm browser-Glk package exists, so this is vendored, not installed.
2. **Vite ↔ CommonJS — confirmed.** `ifvms@1.1.6` loads and instantiates as CJS;
   esbuild pre-bundling handles the interop.

**Outcome: GO** on the custom-GlkOte-bridge path.

### Walking skeleton + go/no-go gate

Then build a **walking skeleton**: boot Zork I and render "West of House" with a
working input loop, a single command round-trip, **and at least one non-line-input
path** (a `[MORE]`/char-input prompt) to prove the bridge's harder cases — *before*
any styling, persistence, or game picker.

This milestone is a **go/no-go decision point.** If the custom GlkOte bridge proves
substantially deeper than expected, the **fallback** is to embed the stock browser
GlkOte display for this first pass and defer the custom bridge until the LLM layer
actually requires the interception seam. Either path keeps the roadmap intact.
Styling, autosave, and the second/third games layer on once the skeleton runs.

## Testing

- **Engine wrapper:** unit-test the typed façade against a small story file;
  assert a known command produces expected output text.
- **GlkOte bridge reducer:** unit-test that representative `update` objects
  reduce to the expected scrollback/status state (pure function, no VM needed).
- **Storage Dialog:** unit-test `autosave_write` → `autosave_read` round-trips a
  snapshot under a signature, and that `null` clears it.
- **Resume:** integration test — play N turns, snapshot, re-prepare, assert state
  matches.
- **UI:** smoke test landing → terminal transition and theme toggle persistence.

## Out of scope → future work

See [`docs/notes.md`](../../notes.md) for the natural-language / LLM roadmap:
WebLLM, GBNF grammar, vocabulary extraction from ZIL, static→dynamic grammar, the
`__UNKNOWN__` abstain hatch, JSON-intermediate validation, and the model-download
modal.
