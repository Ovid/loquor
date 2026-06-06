# Naitfol — First Pass Design

**Date:** 2026-06-06
**Branch:** `ovid/first-pass`
**Status:** Approved (design); ready for implementation planning.

## Summary

Naitfol is a browser app for playing Zork I, II, and III on top of the
`ifvms.js` Z-machine. This first pass delivers a self-contained React app where
the player picks a game, plays it by typing commands the game's own parser
understands, and resumes automatically where they left off.

The natural-language / LLM layer that the project is ultimately named for
(*Nitfol* — the Enchanter spell that lets you converse with creatures) is
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
- **Glk layer:** reuse the published `glkapi` Glk implementation (the layer
  ZVM calls into), distributed with the Parchment/`glkote` packages.
- **GlkOte display + Dialog:** **ours** — these are the React/storage seams.

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
- Window identification follows ZVM's rocks: `201` = main buffer, `202` =
  status, `203` = upper window.

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
- We call `engine.do_autosave()` after each completed turn (each time the VM
  blocks for line input), so a tab close never loses more than the current
  unsubmitted line.

### 4. UI — `ui/`

- **Landing screen:** title, how-to panel with sample commands, the three games
  presented as "volumes" (I / II / III), an Enter button, and a resume hint when
  a saved game exists for the selected volume.
- **Terminal screen:** brass status bar (location · score · moves · change-volume),
  line-by-line fading scrollback, and a command input pinned to the bottom.
- **Theme toggle** (dark/light), persisted as a user preference (localStorage).

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
5. Engine calls `do_autosave()` → `Dialog.autosave_write(signature, snapshot)`.

On game open: fetch bytes → `prepare()` → `start()` → if an autosave exists ZVM
auto-restores; otherwise it runs from the beginning.

## Visual identity — "Folio" (locked)

Two themes, one identity, driven by CSS custom properties. Display font
**IM Fell English / IM Fell English SC** (title, room headings, chrome); body /
game text **JetBrains Mono**. Shared motifs: paper-grain overlay, radial
light/vignette, brass accent, glowing `>` caret, one-time lantern-flicker on the
title at load, line-by-line fade-in of room text.

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
`.superpowers/brainstorm/<session>/content/lamplit-folio-v2.html`.

## Risks & first milestone

The load-bearing risk is getting **ZVM + Glk + our custom GlkOte display** to run
standalone under Vite (CommonJS modules, the Glk↔display protocol, browser
bundling). Implementation therefore starts with a **walking skeleton**: boot
Zork I and render "West of House" with a working input loop and a single hard-coded
command round-trip — *before* any styling, persistence, or game picker. Styling,
autosave, and the second/third games layer on once the skeleton runs.

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
