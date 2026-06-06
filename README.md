# Naitfol

> *Nitfol* — in Infocom's *Enchanter*, the spell that lets you understand and
> converse with creatures in their own tongue. With WebLLM, **Naitfol** lets you
> talk to Zork.

Naitfol is a fully client-side web app for playing **Zork I, II, and III** in the
browser, on top of a JavaScript Z-machine. Pick a game, play it, and resume
automatically where you left off — nothing leaves your machine.

The eventual goal (the spell the project is named for) is to let you type plain
English and have an in-browser LLM translate it into commands the game
understands. That natural-language layer is **future work** — see
[`docs/notes.md`](docs/notes.md). The current first pass focuses on getting the
three games running with a custom interface; see the design spec at
[`docs/superpowers/specs/2026-06-06-naitfol-design.md`](docs/superpowers/specs/2026-06-06-naitfol-design.md).

## Why we can do this — Zork is open source

In November 2025, Microsoft released the original source code for Zork I, II, and
III under the **MIT License** (the `LICENSE` files in the game directories read
*Copyright (c) 2025 Microsoft*). This is what makes Naitfol possible: we can ship
the games, read their ZIL source, and — later — derive a command grammar directly
from that source.

- Announcement: [*Preserving code that shaped generations: Zork I, II, and III go open source*](https://opensource.microsoft.com/blog/2025/11/20/preserving-code-that-shaped-generations-zork-i-ii-and-iii-go-open-source/) (Microsoft Open Source Blog, 2025-11-20)

Zork was written by Marc Blank, Dave Lebling, Bruce Daniels, and Tim Anderson and
originally published by Infocom, in **ZIL** (Zork Implementation Language).

## Tech stack

| Component | What it does | License |
|---|---|---|
| [ifvms.js](https://github.com/curiousdannii/ifvms.js) | The Z-machine virtual machine that runs the compiled `.z3` Zork story files in the browser (the engine behind Parchment and Lectrote). | MIT |
| [WebLLM](https://github.com/mlc-ai/web-llm) | High-performance in-browser LLM inference (WebGPU). Powers the planned natural-language layer; not used in the first pass. | Apache-2.0 |
| [Zork I/II/III source](https://opensource.microsoft.com/blog/2025/11/20/preserving-code-that-shaped-generations-zork-i-ii-and-iii-go-open-source/) | The games themselves — compiled story files we ship, plus ZIL source for future grammar extraction. | MIT (© 2025 Microsoft) |
| React + Vite + TypeScript | The application itself. | — |

These upstream projects are vendored locally for reference (and are
git-ignored — we never modify them); the application consumes `ifvms.js` and
WebLLM from npm.

## Running locally

    make install     # install dependencies
    make dev         # start the dev server
    make test        # run the test suite
    make all         # lint + format + typecheck + test
    make build       # production build

The three Zork story files live in `public/games/` and the Glk layer is vendored
under `vendor/glkote/` (pinned by commit SHA in `vendor/glkote/PINNED.md`).

`make install` runs `npm ci` (a clean, lockfile-exact install). Use it rather
than a bare `npm install` so the platform-specific native bundler binding (Vite 8
uses Rolldown, which ships per-OS/arch `@rolldown/binding-*` packages) installs
correctly. If you ever see `Error: Cannot find native binding` /
`Cannot find module '@rolldown/binding-...'` — an [npm optional-dependency
bug](https://github.com/npm/cli/issues/4828) that can leave a partial
`node_modules` — fix it with a clean reinstall:

    rm -rf node_modules && npm ci   # (or: make install)

The committed `package-lock.json` already lists every platform's binding, so a
clean `npm ci` resolves the correct one for your machine (macOS, Linux, Windows).

## Status

First pass — in active development on the `ovid/first-pass` branch. See the design
spec and notes linked above.
