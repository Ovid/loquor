# Loquor — Natural-Language Layer Design (first NL pass)

**Date:** 2026-06-07
**Branch:** `ovid/web-llm`
**Status:** Approved (design). Ready for implementation planning.

## Summary

Loquor (*Latin: "I speak"*) gets the headline feature it is named for: the player
types plain English, an in-browser LLM maps it to a canonical command the
Z-machine understands, and that command is fed into the game exactly as a typed
command would be. The VM, the vendored Glk layer, and the game files are
untouched — this layer sits entirely in front of line input.

This is the **first NL pass**. It is deliberately scoped to prove the layer out
end-to-end with a *static, hand-curated, per-game* grammar and *direct command
strings*. The richer ideas in [`docs/notes.md`](../../notes.md) (ZIL-derived
vocabulary, dynamic per-turn vocabulary, a JSON command object, a lighter-model
tier, output rewriting) are explicitly deferred and listed under Non-Goals.

Everything is gated on device capability and is fully optional: a player on any
device keeps the complete first-pass grammar-only experience, and the player can
toggle natural language on and off at any time mid-game.

## Goals

- Type English → get a canonical command executed in the game, fully
  client-side, in the browser.
- Show the translation transparently: the player sees their English, a thinking
  indicator while the model runs, and the canonical command (via the VM's own
  input echo), then the game's response.
- Gate the feature on device capability so it is never offered where it cannot
  run; degrade to grammar-only everywhere else with nothing broken.
- Make the model download explicit, cancellable, and one-time (cached).
- Let the player toggle natural language on/off at any time without re-download.
- Keep the GlkOte bridge pure and quarantine WebLLM/WebGPU behind one swappable
  interface so the whole layer is unit-testable with a fake engine.

## Non-Goals (this pass — subsystem "E", each its own future spec)

- **ZIL-derived vocabulary.** Grammars are hand-curated this pass; deriving the
  noun/adjective/verb terminals from the MIT ZIL source is the deferred upgrade.
- **Dynamic per-turn vocabulary** regenerated from currently visible objects
  (needs game-state introspection the Z-machine does not expose cleanly).
- **JSON-intermediate command object** (`{verb, object, prep, indirect}`) with
  pronoun resolution / disambiguation. This pass emits direct command strings.
- **The `small` capability tier / lighter model.** The tier is returned by the
  capability check as a reserved seam, but only `full` is wired this pass.
- **LLM rewriting of game output** into richer prose.
- **In-game `SAVE`/`RESTORE` UI.** Already a carried first-pass limitation; NL
  does not touch save/restore.

## Locked decisions

1. **Scope:** one spec covering capability gating + model lifecycle + static
   translation + UI/wiring. The feature only has value end-to-end.
2. **Translation UX:** echo + thinking. Player sees their English, a transient
   `…thinking` indicator, then the canonical command (from the VM's own echo),
   then the game response.
3. **Model source:** the MLC/HuggingFace CDN (WebLLM's prebuilt config). This is
   the single deliberate network call in an otherwise offline/privacy-respecting
   app, documented as such. Weights cache locally after first download.
4. **Abstain path (`__UNKNOWN__`):** pass the player's raw English straight to
   the game's own Z-machine parser and let its error message handle it. No extra
   UI; always makes progress.
5. **Grammar scope:** per-game static GBNF, selected by the per-game story
   signature (the same signature already used for save slots). Hand-curated this
   pass; the selection seam is exactly what ZIL extraction will reuse.
6. **Architecture:** the GlkOte bridge stays a pure protocol adapter and gains
   exactly one input-side method, `echoLocal(text)`. All LLM logic lives in
   `src/llm/` behind a TypeScript `LlmEngine` interface and is orchestrated by a
   `useNaturalLanguage` hook that `Terminal` consumes.

## Stack additions

- **`@mlc-ai/web-llm@0.2.84`** added to `package.json` dependencies (matching the
  vendored read-only reference at `web-llm/`). It is the only file-level
  dependency of `engine.webllm.ts`; nothing else imports it.
- **Model:** `Llama-3-8B-Instruct-q4f32_1-MLC-1k` — the 1k-context variant
  (ample for a short room description plus a command, and lower memory).
- **Grammar-constrained decoding** via WebLLM/XGrammar GBNF. Confirm exact GBNF
  literal-vs-operator syntax against current XGrammar docs before wiring.

## Architecture

The natural-language layer is an asynchronous pre-processor in front of Glk line
input. Observation (room/status text) is already available on the React
`ViewState`; input still enters through the bridge (via `echoLocal`/`sendLine`),
honoring the intent of "the bridge is the seam" while keeping the bridge pure.

```
player English ─► CommandInput.onSubmit ─► useNaturalLanguage.translate()
                                              │  (reads ViewState for context)
                                              ├─► buildPrompt() ─► LlmEngine.generate(prompt, grammar)
                                              │                         │ (WebLLM + GBNF, on WebGPU)
                                              ├─► parseCompletion(raw)
                                              │     • command → bridge.echoLocal(english); engine.sendLine(canonical)
                                              │     • abstain → engine.sendLine(english)
                                              └─► transient "…thinking" UI state cleared on resolve

game output ◄─ Glk ◄─ ZVM   (unchanged; VM echoes the command it received as an `input` line)
```

### Module layout

```
src/llm/
  capability.ts          detectCapability(nav?, gpu?) → { tier, reasons[] }   (pure, injectable)
  types.ts               LlmEngine, NlState, Tier, TranslateResult, progress shapes
  engine.webllm.ts       real LlmEngine over @mlc-ai/web-llm (ONLY importer of it)
  engine.fake.ts         test/dev fake LlmEngine (canned completions, scripted progress)
  grammar/
    index.ts             grammarForSignature(sig) → GBNF string | null
    zork1.gbnf.ts        per-game grammars (hand-curated; ZIL-derived = future)
    zork2.gbnf.ts
    zork3.gbnf.ts
  prompt.ts              buildPrompt(english, { location, recentOutput }) → ChatMessages  (pure)
  translate.ts           parseCompletion(raw) → TranslateResult                           (pure)
  useNaturalLanguage.ts  React hook: owns the engine + NL state machine, exposes translate()
src/ui/
  NlToggle.tsx           five-state control beside ThemeToggle in StatusBar
  ModelDownloadModal.tsx accept / decline / cancel (+ progress)
src/glkote-react/
  bridge.ts              + echoLocal(text): appends a UI-only source line (no VM round-trip)
  types.ts               + BufferLine.kind: 'nl-source'
```

## Components

### 1. Capability gating — `capability.ts`

Pure function taking injectable `navigator` / WebGPU adapter so it is unit-testable
without WebGPU. Returns a **tier**, not a boolean:

- `none` — no `navigator.gpu`; `requestAdapter()` returns null or a
  software/fallback adapter; mobile (`navigator.userAgentData?.mobile === true`
  or a UA fallback for iOS/Android); or adapter limits below threshold
  (`maxBufferSize`, `maxStorageBufferBindingSize`), with `navigator.deviceMemory`
  as a coarse soft signal (capped at 8) paired with the limits rather than
  trusted alone.
- `full` — passes all checks → the 8B model is offered.
- `small` — **reserved seam only.** Never returned this pass; documented so the
  later lighter-model fallback slots in without changing the signature.

The result carries `reasons[]` so the toggle's `unavailable` tooltip can explain
*why*. A **manual override** ("force-enable anyway") lets a power user on a
capable-but-misdetected machine attempt the download at their own risk (still
cancellable). Any probe that throws is treated as tier `none` — never crashes the
game.

### 2. Model lifecycle — `engine.webllm.ts` behind `LlmEngine`

```ts
interface LlmEngine {
  load(onProgress: (p: { loaded: number; total: number; text: string }) => void,
       signal: AbortSignal): Promise<void>
  generate(prompt: ChatMessages, grammar: string): Promise<string>
  unload(): Promise<void>
  isLoaded(): boolean
}
```

- **Download is cancellable:** `load()` takes an `AbortSignal`; cancelling aborts
  the in-flight download and returns the UI to its pre-download state. WebLLM
  caches weights, so a later retry reuses cached shards.
- **"Installed?"** = WebLLM reports the model present in its cache; the hook
  surfaces this so the toggle distinguishes *off · not installed* from
  *off · installed*.
- `generate()` runs constrained decoding against the per-game GBNF and returns the
  raw completion string.

### 3. Translation — `grammar/`, `prompt.ts`, `translate.ts`

- **`grammarForSignature(sig)`** maps the per-game story signature to that game's
  hand-curated GBNF, or `null` if unknown. Each grammar follows the
  `scratch/grammar.txt` structure — shared verbs/structure/directions plus that
  game's noun/adjective/container/etc. sets — and **always includes the
  `abstain ::= "__UNKNOWN__"` production.** Grammars are curated *out of* the
  gitignored `scratch/` into `src/llm/grammar/`; the read-only vendored sources
  are never modified.
- **`buildPrompt(english, context)`** (pure) assembles chat messages from the
  player's English plus context read from `ViewState` — the current `location`
  and recent buffer output (the room/look text). The system prompt instructs the
  model to emit one canonical command from the grammar, or `__UNKNOWN__` when the
  input is not a game action.
- **`parseCompletion(raw)`** (pure, total) → `{ kind:'command', text }` or
  `{ kind:'abstain' }` when the output is `__UNKNOWN__`. Constrained decoding
  guarantees grammar-valid output, so parsing is trivial.

### 4. UI — `NlToggle`, `ModelDownloadModal`

**`NlToggle`** sits beside `ThemeToggle` in `StatusBar`. State derives from
`(tier, installed, on)`:

| State                | Shown when                                              |
| -------------------- | ------------------------------------------------------- |
| `unavailable`        | tier === `none` (tooltip explains why; offers override) |
| `off · not installed`| capable, never downloaded                               |
| `off · installed`    | capable, cached, currently grammar-only                 |
| `on`                 | active — English is translated                           |
| `downloading… X%`    | transient, during `load`, with a cancel affordance      |

Toggling **on** when not installed re-opens the download modal; toggling **off**
is instant (model stays cached). The on/off choice and a prior "declined" persist
across reloads via `localStorage`, mirroring the theme preference. The toggle is
an in-layout status-bar item, never a `position:fixed` overlay (project
convention).

**`ModelDownloadModal`** — shown the first time NL is requested on a capable
device. Explains that `Llama-3-8B-Instruct-q4f32_1-MLC-1k` is large and slow.
**Accept** → progress bar fed by `load`'s `onProgress` → English enabled.
**Decline** → stays grammar-only (told they are restricted to the game's own
parser). **Cancel** mid-download → aborts via the `AbortSignal`, discards/keeps
cached partial, returns the toggle to its pre-download state. This modal is only
ever reachable by devices that pass the capability gate.

### 5. Bridge change — `echoLocal(text)`

The single bridge addition. Appends a UI-only **source line** to `ViewState`
(new `BufferLine.kind: 'nl-source'`, rendered with a `>` marker) without sending
anything to the VM. It is carried inertly through subsequent reducer passes (like
any other prior line), so it stays put while the VM's own `input` echo
(rendered with `›`) and output append after it. The bridge remains otherwise
pure; no WebLLM dependency enters it.

## Data flow (NL on)

```
player types English ─► CommandInput.onSubmit ─► useNaturalLanguage.translate(english)
  1. show transient pending block:  "> <english>"  +  "…thinking"   (local UI state)
  2. raw = engine.generate(buildPrompt(english, viewContext), grammarForSignature(sig))
  3. parseCompletion(raw):
       • command → bridge.echoLocal(english); sendLine(canonical)
                   → VM echoes "› canonical" + output; clear thinking
       • abstain → sendLine(english)
                   → VM echoes the raw English + its own parser error; clear thinking
  input is locked while a translation is in flight (one turn at a time)
```

When NL is **off** (or tier `none`), `onSubmit` calls `sendLine` directly —
behaviorally identical to the first pass. The canonical command line is never
UI-injected: it arrives as the VM's own `input`-styled echo, so the command and
abstain paths share the same rendering and the abstain case cannot duplicate the
echoed line.

### Worked examples

```
> grab the brass lantern        (nl-source, UI-injected)
  …thinking                      (transient)
  › take lantern                 (VM input echo of the canonical command)
Taken.                           (VM output)
```

```
> what should I do?              (VM input echo of the raw pass-through)
  …thinking                      (transient, then cleared)
I don't know the word "should".  (VM parser error)
```

## Error handling

- **WebGPU/adapter probe throws** → tier `none`. Never crashes the game.
- **`load()` fails** (OOM, network) → notice + revert to `off · not installed`;
  the game keeps playing grammar-only.
- **Cancel** → `AbortSignal`; partial discarded (or cached for resume), pre-download
  state restored.
- **`generate()` throws or exceeds a watchdog timeout** → fall back to raw
  pass-through (`sendLine(english)`) so the turn never wedges; log it.
- **Unknown signature** (`grammarForSignature` returns `null`) → NL is silently
  unavailable for that game; grammar-only. All three shipped games are covered.
- NL never touches save/restore, char-input prompts, or the VM. Existing autosave
  and persistence are unaffected.

## Testing strategy

Mirrors the first pass: pure units fully tested; the untestable WebGPU/model
boundary proven by a manual walking-skeleton gate.

**Unit (vitest, with `engine.fake.ts`):**

- `capability` — injected fake `navigator`/adapter across the tier matrix,
  including mobile detection and the manual override.
- `prompt` — context assembly from a `ViewState`.
- `translate` — command vs `__UNKNOWN__` (abstain).
- `grammar/index` — signature → grammar mapping, and the `null` path.
- `useNaturalLanguage` — state machine: `off → modal → download → on → off`;
  cancel; load-failure revert; `generate`-failure → raw fallback; input lock
  during translation.
- `NlToggle` / `ModelDownloadModal` — React Testing Library, all five states and
  accept/decline/cancel.
- `bridge.echoLocal` — reducer-level: the source line appears with kind
  `nl-source`, is distinct from a VM `input` echo, and survives later updates.

**Not unit-tested (by nature):** `engine.webllm.ts` real model load/generate —
WebGPU does not exist in jsdom.

**Walking-skeleton gate (go/no-go, like Milestone 1 of the first pass):** on a
capable machine, load the model and confirm end-to-end:

1. *"grab the brass lantern" → `› take lantern` → "Taken."*
2. An abstain case (e.g. *"what should I do?"*) passes through to the game's
   parser error.
3. A mid-download **cancel** returns cleanly to grammar-only.

If constrained decoding or the model proves intractable in-browser, the
documented fallback is to narrow the first NL pass to a single game and grammar
while keeping the same seams.

## Open implementation notes (resolve during planning)

- Confirm exact GBNF literal/operator syntax against current XGrammar docs.
- Confirm the precise WebLLM API for cached-model detection (drives the
  installed/not-installed toggle state) and for aborting an in-flight `load`.
- Decide the watchdog timeout for `generate()` empirically during the
  walking-skeleton gate (latency on an 8B q4 model in-browser).
