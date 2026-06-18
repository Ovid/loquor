# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Loquor** is a fully client-side web app for playing Zork I, II, and III in the
browser on top of the `ifvms.js` Z-machine, with a custom React UI. The headline
feature is a WebLLM-powered natural-language layer (type English → translated to a
canonical game command). The **first pass is built** (the playable engine + UI);
the **natural-language layer is built and under active refinement** (UAT-driven
parser/scene/vocab work on feature branches such as `ovid/more-parser-work`).

## Repository state: first pass built; NL layer v2 + grammar-only fallback built; output translation v1 built

**The application IS scaffolded.** `package.json`, the Vite app, and `src/` all
exist, with the first pass implemented and tested (engine, GlkOte bridge, storage,
UI). The natural-language layer **v2 is implemented and tested**: a
deterministic-first multilingual pipeline (EN/FR/DE/ES) — per-language lexicons
with an LLM fallback, vocab passthrough, quoted escape, full-vocab grammar,
literal-translation prompt, input queue, language picker, and a UAT regression
suite pinning every UAT-1/UAT-2 finding. The **grammar-only fallback is built and
tested** (design/plan `2026-06-16-loquor-grammar-only-fallback*`): the WebLLM
model is now an **optional upgrade, not a gate** — picking a language activates
the deterministic pipeline **immediately** in grammar-only "basic mode", and the
download modal is reframed as an upgrade offer (shown once, then on demand via the
picker's "✦ improve"). A device that can't or won't run the model stays in
grammar-only; English raw-sends, non-English abstains with a notice. (The old
`unavailable` NL state is gone; the state now carries `canUpgrade` / `model`
(`full | grammar`).) **Output translation v1 is implemented and tested** (Zork I,
corpora for French/Spanish/German, plus **Georgian (`ka`)** as a Phase-1
output-only language — read-Georgian / type-English, corpus-only with no LLM
fallback since small models can't produce Georgian): a display-layer overlay
(`src/translate/`) with a pre-translated corpus (strings/templates/objects) gated
by a walkthrough-coverage test and a string-inventory test, plus an LLM fallback
behind the shared engine gate (for fr/de/es only). Sources of truth, in priority
order:

1. `docs/superpowers/specs/2026-06-16-loquor-grammar-only-fallback-design.md` —
   the **current NL-activation design** (model as optional upgrade; immediate
   grammar-only activation). Its implementation plan,
   `docs/superpowers/plans/2026-06-16-loquor-grammar-only-fallback.md`, is
   executed. Supersedes the v2 download-gate where they conflict.
2. `docs/superpowers/specs/2026-06-17-loquor-output-translation-georgian-design.md`
   — the **Georgian (`ka`) Phase-1 output-translation design** (output-only,
   type-English, corpus-only). Builds on the v1 output-translation design below.
2b. `docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md` — the
   **current output-translation design** (v1, Zork I; French/Spanish/German). Its
   implementation plan, `docs/superpowers/plans/2026-06-10-loquor-output-translation.md`,
   is executed.
3. `docs/superpowers/specs/2026-06-09-loquor-nl-multilingual-design.md` — the
   **NL layer pipeline design** (v2, deterministic-first multilingual). Its
   implementation plan, `docs/superpowers/plans/2026-06-09-loquor-nl-multilingual.md`,
   is executed. UAT findings live in `notes/uat-1.md` / `notes/uat-2.md`.
4. `docs/superpowers/specs/2026-06-07-loquor-nl-layer-design.md` — the **NL layer
   v1 design** (revised after pushback review; superseded by v2 where they
   conflict). Its companion implementation plan is
   `docs/superpowers/plans/2026-06-07-loquor-nl-layer.md`. Follow-on designs live
   beside it (compound commands, scene resolution, vocab extraction).
5. `docs/superpowers/plans/2026-06-06-loquor-first-pass.md` — the first-pass TDD
   plan (largely executed; historical reference).
6. `docs/superpowers/specs/2026-06-06-loquor-design.md` — the first-pass design and
   locked decisions (architecture, theme tokens, persistence model).
7. `docs/spikes/2026-06-06-glk-vite-spike.md` — resolved feasibility spike (how the
   Glk layer is sourced; CommonJS/Vite interop).
8. `docs/notes.md` — the deferred LLM/grammar roadmap (post-first-NL-pass ideas).

Read the relevant spec/plan before writing code. NL-layer work happens on
feature branches; **execute plans with
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
- `make lint` (ESLint, autofix) / `make format` (Prettier) / `make typecheck` (`tsc -b` — the root tsconfig is solution-style, so plain `tsc --noEmit` checks nothing)
- `make all` — lint + format + typecheck + test

Run a **single test** with Vitest directly:

```bash
npx vitest run path/to/file.test.ts          # one file
npx vitest run -t "substring of test name"    # by name
```

## Conventions

- **TDD throughout** (the plan is written red→green→refactor); **frequent, small
  commits** — one per plan step.
- **Tests emit only test data — output stays pristine.** A passing test must
  produce no stray `console.error`/`console.warn` and no React `act(...)`
  warnings on stderr. A test that exercises an error/log path must **spy on and
  assert** the expected output (`const s = vi.spyOn(console, 'error')
  .mockImplementation(() => {})` in a `try { … } finally { s.mockRestore() }`,
  then assert it was called), so the test *owns* the log instead of leaking it.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Self-host fonts (Fontsource, OFL) — **no CDN font loads**; the offline/privacy
  promise depends on it.
- The theme toggle is an in-layout element (landing-plate corner + status-bar
  item), never a `position:fixed` overlay.
- **A fix in one language is usually a fix in all of them.** The NL layer and
  output translation are multilingual (EN/FR/DE/ES). When you change something
  language-specific — a lexicon/corpus entry, a prompt-detection regex, an
  affirmative/key mapping, a clause transform — **stop and check whether the
  same issue exists in the other languages**, and apply it there too (or say
  why it doesn't apply). Fixing German while Spanish is broken for the identical
  reason doesn't help the player. Watch especially for code that was written
  German-first (or English-first) and hardcodes one language's words/forms.

## Accessibility is mandatory — not a "nice to have"

**Accessibility (a11y) is a hard requirement, on the same footing as
correctness.** Loquor is a text adventure: for many players the *only* way in is
a screen reader, keyboard-only navigation, or high-contrast/zoomed display. A UI
element that a screen-reader or keyboard user cannot operate is a **bug**, not a
polish item — treat it exactly as you would a crash.

Every change that touches user-facing UI (any `src/ui/**` component, the
Terminal, pickers, modals, notices, status bar, the game transcript) MUST:

1. **Be operable by keyboard alone** — every interactive control reachable and
   activatable via Tab/Enter/Space/Esc, with a visible focus indicator and a
   sensible tab order. No mouse-only affordances.
2. **Expose a correct accessible name and role** — use semantic elements
   (`<button>`, `<nav>`, real headings) over `div`/`span` with click handlers.
   Icon-only or symbol controls (e.g. the `✦ improve` button, the theme toggle)
   need an `aria-label`. Decorative glyphs (the `· basic` marker) are not
   announced as controls.
3. **Announce dynamic changes** — game output, translated text, and NL notices
   (the "basic mode" / first-abstain messages) must reach assistive tech, via an
   appropriate `aria-live` region rather than a silent DOM mutation.
4. **Not rely on colour or contrast alone** — state conveyed by colour (theme,
   `nl-source` lines, the basic marker) needs a non-colour cue too, and text must
   meet WCAG 2.2 AA contrast in **both** themes.
5. **Respect user settings** — honour `prefers-reduced-motion`; never trap focus
   except in a modal (which must trap focus *and* restore it on close, and close
   on Esc).

When you add or change a control, **add a test that asserts its accessible
name/role** (`getByRole('button', { name: ... })` already used in the picker
suite is the pattern) — an a11y regression should fail the suite, not ship. If a
change arguably degrades accessibility and the reason is a product/design
decision, that falls squarely under the "talk to me first" rule below.

## Player experience overrides "product decisions" — talk to me first

**"It's a product decision" is NOT a reason to defer, skip, or accept a behavior
that arguably hurts the player.** Player experience comes first. The fact that
something is a locked decision, a documented design choice, or a "known
limitation" does not settle the question — those are exactly the cases that need
a conversation, not a silent pass.

If you encounter — or are about to introduce or leave in place — any behavior
that **arguably hurts the player experience** (a natural command that fails, a
confusing/garbled message, a puzzle that can't be solved without secret
knowledge, a needless friction, a worse-than-original-Zork interaction), and the
reason it exists is a product/design decision, you **MUST stop and have a
conversation with me** before treating it as settled. That conversation must
cover, explicitly:

1. **Why it hurts the player experience** — concretely, what the player actually
   sees/feels, on what kind of playthrough, and how often.
2. **What the product decision is** — the exact behavior that was chosen.
3. **The reasoning behind that decision, if known** — quote or summarize the
   spec/plan/commit/locked-decision rationale (and say so if the reason is
   unknown).
4. **An explicit offer to override** — give me the chance to overrule the
   decision in favor of the player, and wait for my call before finalizing.

Only after that conversation (or if the player-harm is negligible AND you say so
and why) may you proceed. When the fix is clear, low-risk, and unambiguously
pro-player, just fix it — but still tell me what you changed and why. Do **not**
hide a player-harming choice behind "deferred — product decision" in a summary
and move on.

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
