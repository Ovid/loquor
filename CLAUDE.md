# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Loquor** is a fully client-side web app for playing Zork I, II, and III in the
browser on top of the `ifvms.js` Z-machine, with a custom React UI. The headline
feature is a WebLLM-powered natural-language layer (type English → translated to a
canonical game command). The **first pass is built** (the playable engine + UI);
the **natural-language layer is built and under active refinement** (UAT-driven
parser/scene/vocab work on feature branches such as `ovid/more-parser-work`).

## Repository state: first pass built; NL layer v2 built

**The application IS scaffolded.** `package.json`, the Vite app, and `src/` all
exist, with the first pass implemented and tested (engine, GlkOte bridge, storage,
UI). The natural-language layer **v2 is implemented and tested**: a
deterministic-first multilingual pipeline (EN/FR/DE/ES) — per-language lexicons
with an LLM fallback, vocab passthrough, quoted escape, full-vocab grammar,
literal-translation prompt, input queue, language picker, and a UAT regression
suite pinning every UAT-1/UAT-2 finding. Sources of truth, in priority order:

1. `docs/superpowers/specs/2026-06-09-loquor-nl-multilingual-design.md` — the
   **current NL layer design** (v2, deterministic-first multilingual). Its
   implementation plan, `docs/superpowers/plans/2026-06-09-loquor-nl-multilingual.md`,
   is executed. UAT findings live in `notes/uat-1.md` / `notes/uat-2.md`.
2. `docs/superpowers/specs/2026-06-07-loquor-nl-layer-design.md` — the **NL layer
   v1 design** (revised after pushback review; superseded by v2 where they
   conflict). Its companion implementation plan is
   `docs/superpowers/plans/2026-06-07-loquor-nl-layer.md`. Follow-on designs live
   beside it (compound commands, scene resolution, vocab extraction).
3. `docs/superpowers/plans/2026-06-06-loquor-first-pass.md` — the first-pass TDD
   plan (largely executed; historical reference).
4. `docs/superpowers/specs/2026-06-06-loquor-design.md` — the first-pass design and
   locked decisions (architecture, theme tokens, persistence model).
5. `docs/spikes/2026-06-06-glk-vite-spike.md` — resolved feasibility spike (how the
   Glk layer is sourced; CommonJS/Vite interop).
6. `docs/notes.md` — the deferred LLM/grammar roadmap (post-first-NL-pass ideas).

Read the relevant spec/plan before writing code. NL-layer work happens on
feature branches (currently `ovid/more-parser-work`); **execute plans with
`superpowers:subagent-driven-development` or `superpowers:executing-plans`.**

## Read-only vendored directories (NEVER modify)

These are gitignored (see `.gitignore`) and present locally as references. **Read
from them and copy their data into the repo, but never edit them:**

- `ifvms.js/` — the Z-machine VM source (the `ifvms` npm package). Browser-safe core.
- `web-llm/` — WebLLM reference (for the future LLM layer only).
- `zork1/`, `zork2/`, `zork3/` — MIT-licensed (© 2025 Microsoft) game source.
  The compiled story files live at `zork{N}/COMPILED/zork{N}.z3` and get copied
  into `public/games/`. The `.zil` source is for future grammar extraction.
- `scratch/` — throwaway notes (e.g. the draft GBNF grammar).

`.superpowers/` (brainstorming mockups) is also gitignored.

## Architecture (the big picture)

The VM never touches the DOM. Data flows through a layered pipeline that is the
core thing to understand before editing any one piece:

```
player input ─► GlkOte bridge ─► Glk (vendored glkapi.js) ─► ZVM (ifvms)
game output  ◄─ GlkOte bridge ◄─ Glk                       ◄─ ZVM
                    │
                    ├─► React view state (reducer: GlkOte "update" JSON → ViewState)
                    └─► Dialog (IndexedDB) ── native ZVM autosave, keyed by story signature
```

- **`ifvms` (npm, CommonJS)** is the VM. It calls a large standard **Glk** API; it
  does not call our display directly.
- **`glkapi.js` is vendored** under `vendor/glkote/` (from erkyrath/glkote, MIT,
  pinned by commit SHA) — *not* an npm install. The spike found no clean npm
  package for a browser Glk. Crucially, `glkapi.js` accepts an **injected,
  swappable GlkOte display** via `vm_options.GlkOte` — that injection point is our
  entire integration seam.
- **The GlkOte bridge (`src/glkote-react/`)** is our implementation of the GlkOte
  display contract. It reduces the VM's GlkOte "update" objects into a React
  `ViewState` (pure reducer) and sends player input back as Glk events. It also
  exposes the input-side `echoLocal()` seam the NL layer uses to inject the
  player's English as a UI-only `nl-source` line. (The NL layer intercepts the
  *typed input* upstream, at `CommandInput.onSubmit` → `nl.translate`, not in the
  bridge; the bridge's `onTurn` is an observer-only turn-boundary seam.)
- **Dialog (`src/storage/`)** is our IndexedDB-backed implementation of ZVM's
  native autosave. ZVM keys saves by a per-game **signature** (first 0x1E bytes of
  the story), so per-game slots are automatic. ZVM reads autosave *synchronously*
  during `start()`, so the engine **preloads** the snapshot into a sync cache
  before booting. Autosave fires at each **line-input request** (the turn
  boundary); the slot is **cleared on clean quit** so a dead game doesn't resume.

When implementing the GlkOte protocol details, **observe the real shapes** by
reading the vendored `glkapi.js`/`ifvms` source or running the capture harness
(`scripts/capture-protocol.mjs`, Task 1.4) — do not invent field names.

## Walking-skeleton gate

Milestone 1 of the plan is a **go/no-go gate**: prove ZVM + vendored Glk + the
custom GlkOte display run under Vite and play Zork I before building the rest. If
the custom bridge proves intractable, the documented fallback is to embed the
stock DOM `glkote.js` (same upstream repo) for the first pass.

## Commands

Tasks run through the `Makefile` (targets call tools via `npx`, so they work once
`make install` has run against the scaffolded app):

- `make help` — list targets (works now)
- `make install` / `make dev` / `make build` / `make preview`
- `make test` — full suite (`vitest run`)
- `make cover` — coverage (one-shot)
- `make lint` (ESLint, autofix) / `make format` (Prettier) / `make typecheck` (`tsc --noEmit`)
- `make all` — lint + format + typecheck + test

Run a **single test** with Vitest directly:

```bash
npx vitest run path/to/file.test.ts          # one file
npx vitest run -t "substring of test name"    # by name
```

## Conventions

- **TDD throughout** (the plan is written red→green→refactor); **frequent, small
  commits** — one per plan step.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Self-host fonts (Fontsource, OFL) — **no CDN font loads**; the offline/privacy
  promise depends on it.
- The theme toggle is an in-layout element (landing-plate corner + status-bar
  item), never a `position:fixed` overlay.

## Known network egress (NL layer)

The "fully client-side / offline / no-CDN" promise holds for the **base game**
(engine, fonts, story files are all self-hosted). It has **one documented
exception**: enabling the natural-language layer triggers a **one-time
third-party download** — WebLLM (`engine.webllm.ts`) fetches the model weights
from `huggingface.co` and the model-lib **WASM** from `raw.githubusercontent.com`
via its built-in `prebuiltAppConfig` (no `appConfig` is passed). After that
one-time fetch the model is cached and inference runs entirely on-device/offline.

This is gated behind explicit user opt-in (the download modal, which now
discloses the third-party fetch) and uses HTTPS, but it is **not** integrity-pinned
(no SRI), and the model-lib WASM executes in the page origin. To make the offline
promise fully true, the follow-up is to **self-host** (or integrity-check) the
`model` + `model_lib` URLs under `public/` and pin them via an explicit
`appConfig`. Until then, keep the modal disclosure accurate (review I1).

## Finish

When you have finished reading this file, announce "ClAUDE.md read". After that, please
address me as "Ovid" from time-to-time so I know that you have read this file. For some
reason, this file is not always read and it's important that I understand if it's been read.
