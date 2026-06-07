# Loquor — Natural-Language Layer Design (first NL pass)

**Date:** 2026-06-07
**Branch:** `ovid/web-llm`
**Status:** Approved (design), revised 2026-06-07 after pushback review. Ready for
implementation planning.

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
   app, documented as such. Weights cache locally after first download. **Only
   model weights are fetched — no game state or player input ever leaves the
   device.**
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
7. **Model choice — spike a small model first.** The translation task is narrow
   and *grammar-constrained* (English → one canonical command from a fixed GBNF),
   so it likely does not need an 8B model. Before committing to weights/latency,
   the walking-skeleton gate first proves a **small** WebLLM model (e.g. a 1–3B
   instruct, or a sub-1B model) against the per-game translation corpus (see
   Testing). If the small model meets the corpus and the latency target, it
   becomes the **default** path; the 8B `Llama-3-8B-Instruct-q4f32_1` is retained
   as the **documented heavy fallback** for when the small model proves
   insufficient. (This inverts the earlier "8B default, narrow-to-one-game
   fallback" stance.) The `small` capability tier is therefore **wired this pass**,
   not merely reserved.

## Stack additions

- **`@mlc-ai/web-llm@0.2.84`** added to `package.json` dependencies (matching the
  vendored read-only reference at `web-llm/`). It is the only file-level
  dependency of `engine.webllm.ts`; nothing else imports it.
- **Model id is configuration, decided by the spike, not hardcoded.** The default
  is the small model that passes the gate (see Locked decision 7); the heavy
  fallback is `Llama-3-8B-Instruct-q4f32_1-MLC-1k` (the 1k-context variant —
  ample for a short room description plus a command, and lower memory). The
  capability tier (`small`/`full`) selects which id `engine.webllm.ts` loads.
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
    zork1.corpus.ts      per-game translation corpus: {english, expect}[] — the
    zork2.corpus.ts        coverage bar + gate pass/fail set (see Testing)
    zork3.corpus.ts
  prompt.ts              buildPrompt(english, { location, recentOutput }) → ChatMessages  (pure)
  translate.ts           parseCompletion(raw) → TranslateResult                           (pure)
  useNaturalLanguage.ts  React hook: owns the engine + NL state machine, exposes translate()
src/ui/
  NlToggle.tsx           five-state control beside ThemeToggle in StatusBar
  ModelDownloadModal.tsx accept / decline / cancel (+ progress)
src/glkote-react/
  bridge.ts              + echoLocal(text): appends a UI-only source line (no VM round-trip)
  types.ts               + BufferLine.kind: 'nl-source'
src/ui/
  Scrollback.tsx         + render 'nl-source' lines (marker `>`, class .nl-source);
                           switch the VM `input` echo marker from `>` to `›`
```

## Components

### 1. Capability gating — `capability.ts`

Pure function taking injectable `navigator` / WebGPU adapter so it is unit-testable
without WebGPU. Returns a **tier**, not a boolean:

- `none` — no `navigator.gpu`; `requestAdapter()` returns null or a
  software/fallback adapter; or adapter limits below the minimum threshold
  (`maxBufferSize`, `maxStorageBufferBindingSize`).
- `small` — passes the WebGPU/adapter checks but sits below the `full` thresholds
  (modest limits, or a soft signal such as mobile / low `navigator.deviceMemory`).
  Offered the **small default model**. This is the common case and is **wired this
  pass**.
- `full` — passes all checks with headroom → may additionally be offered the heavy
  8B fallback model.

**Mobile is a soft signal, not a hard veto.** `navigator.userAgentData?.mobile ===
true` (or a UA fallback for iOS/Android) and a low `navigator.deviceMemory`
(coarse, capped at 8) push a device toward `small` rather than forcing `none`; the
adapter-limit checks do the real gating, so a capable phone that passes them can
still run the small model. `navigator.deviceMemory` is paired with the limits
rather than trusted alone.

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
  player's English plus a `{ location, recentOutput }` context. The system prompt
  instructs the model to emit one canonical command from the grammar, or
  `__UNKNOWN__` when the input is not a game action.

  **Context contract** (the `useNaturalLanguage` hook derives this from `ViewState`
  so `buildPrompt` stays pure and unit-testable against a fixed shape):
  - `location = status?.location ?? ''`. When empty, the prompt **omits** the
    location line entirely (don't emit a blank one). `status` is nullable and is
    `null` before the first status update.
  - `recentOutput =` the buffer text accumulated **since the last `input`-kind
    line** — i.e. the current room/response block the player is looking at —
    joined with newlines and **capped at ~1500 characters** (keep the *tail* if it
    overflows). The cap is a starting value, tunable at the walking-skeleton gate
    alongside latency.
  - `nl-source` lines are excluded from `recentOutput` (they are the player's own
    prior English, not game text).
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
device. Explains that the model (the small default, or the 8B fallback when the
tier offers it) is a sizable one-time download. **Accept** → progress bar fed by
`load`'s `onProgress` → English enabled.
**Decline** → stays grammar-only (told they are restricted to the game's own
parser). **Cancel** mid-download → aborts via the `AbortSignal`, discards/keeps
cached partial, returns the toggle to its pre-download state. This modal is only
ever reachable by devices that pass the capability gate.

### 5. Bridge change — `echoLocal(text)` + rendering contract

The single bridge addition. Appends a UI-only **source line** to `ViewState`
(new `BufferLine.kind: 'nl-source'`) without sending anything to the VM. It is
carried inertly through subsequent reducer passes (like any other prior line), so
it stays put while the VM's own `input` echo and output append after it. The
bridge remains otherwise pure; no WebLLM dependency enters it.

**Rendering contract** (`Scrollback.tsx` — an explicit change, with its test):

- **`nl-source`** (the player's literal English) renders with a `>` marker and a
  distinct `.nl-source` class (e.g. muted) so it reads as *"what I typed."*
- **`input`** (the VM's echo of the command it actually received) switches from its
  current `>` marker to **`›`** (U+203A) so the canonical command reads as
  *"what the game ran."* This is the one change to existing echo rendering.
- **Abstain path emits no `nl-source` line.** On abstain the raw English is sent
  straight to the VM, so the VM's own `›` echo already shows the player's words —
  adding an `nl-source` line would duplicate it. Only the *command* path calls
  `echoLocal` (English) before `sendLine` (canonical).

This is why the two worked examples differ: the command example shows both a
`>` nl-source line and a `›` VM echo; the abstain example shows only the `›` VM
echo of the pass-through.

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
  …thinking                      (transient, then cleared)
› what should I do?              (VM input echo of the raw pass-through; no nl-source line)
I don't know the word "should".  (VM parser error)
```

## Error handling

- **WebGPU/adapter probe throws** → tier `none`. Never crashes the game.
- **`load()` fails** (OOM, network) → notice + revert to `off · not installed`;
  the game keeps playing grammar-only.
- **Cancel** → `AbortSignal`; partial discarded (or cached for resume), pre-download
  state restored.
- **`generate()` throws or exceeds a watchdog timeout** → fall back to raw
  pass-through (`sendLine(english)`) so the turn never wedges, but first surface a
  brief transient notice (e.g. *"translation timed out — sent as typed"*) so the
  player can tell a timeout from a normal abstain (which produces a similar parser
  error); also log it. A timeout must not silently masquerade as an abstain.
- **Unknown signature** (`grammarForSignature` returns `null`) → NL is silently
  unavailable for that game; grammar-only. All three shipped games are covered.
- NL never touches save/restore, char-input prompts, or the VM. Existing autosave
  and persistence are unaffected.

## Testing strategy

Mirrors the first pass: pure units fully tested; the untestable WebGPU/model
boundary proven by a manual walking-skeleton gate.

**Unit (vitest, with `engine.fake.ts`):**

- `capability` — injected fake `navigator`/adapter across the tier matrix
  (`none`/`small`/`full`), including mobile as a *soft* push toward `small`
  (not a hard `none`) and the manual override.
- `prompt` — context assembly: `location` null-handling (omitted when empty),
  `recentOutput` window (since last `input` line, capped, tail kept), `nl-source`
  exclusion.
- `translate` — command vs `__UNKNOWN__` (abstain).
- `grammar/index` — signature → grammar mapping, and the `null` path.
- **Translation corpus (per game)** — `grammar/zork1.corpus.ts` (etc.): a fixture
  of ~15–30 `{ english, expect }` pairs, where `expect` is either the canonical
  command or `__UNKNOWN__`. It pins the grammars' **coverage bar** and includes
  *should-abstain* cases (non-actions) plus near-misses that must NOT silently map
  to a plausible-but-wrong valid command (the inherent risk of constrained
  decoding — a missing noun gets forced to *some* grammar-valid command). The
  corpus is asserted structurally in unit tests (every `expect` is grammar-valid
  or `__UNKNOWN__`) and is the model's pass/fail set at the walking-skeleton gate.
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
capable machine, load **the small default model** (Locked decision 7) and confirm
end-to-end:

1. *"grab the brass lantern" → `› take lantern` → "Taken."*
2. An abstain case (e.g. *"what should I do?"*) passes through to the game's
   parser error.
3. A mid-download **cancel** returns cleanly to grammar-only.
4. **The small model passes the per-game translation corpus** (above) — every
   non-abstain pair yields its canonical command, abstain pairs yield
   `__UNKNOWN__`, and the near-miss pairs do not silently mis-map.
5. **Latency target:** translation **p50 < ~2s, p95 < ~5s** on the reference
   machine. These set the `generate()` watchdog timeout empirically.

**Fallback ladder** (most → least preferred), if a step fails:

1. Small model misses the corpus or the latency target → **escalate to the 8B
   model** and re-run the corpus/latency check.
2. 8B also intractable in-browser (latency/OOM) → **narrow the first NL pass to a
   single game** (Zork I) and its grammar, keeping all the same seams.
3. Constrained decoding itself proves unworkable → ship grammar-only (the feature
   is fully optional and degrades cleanly).

## Open implementation notes (resolve during planning)

- Confirm exact GBNF literal/operator syntax against current XGrammar docs.
- Confirm the precise WebLLM API for cached-model detection (drives the
  installed/not-installed toggle state) and for aborting an in-flight `load`.
- Decide the watchdog timeout for `generate()` empirically during the
  walking-skeleton gate, against the latency target (p50 < ~2s, p95 < ~5s) on
  whichever model the spike selects.
- Pick the concrete small default model id during the spike (candidates: a 1–3B
  instruct, or a sub-1B model) and confirm it supports XGrammar GBNF constrained
  decoding under WebLLM.
