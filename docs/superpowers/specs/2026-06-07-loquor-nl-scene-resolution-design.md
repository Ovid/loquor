# Loquor NL Scene Resolution — Design

> **Status:** approved design, pre-plan. Builds on the merged NL layer
> (`docs/superpowers/specs/2026-06-07-loquor-nl-layer-design.md`). Read that
> first — this spec assumes its architecture (the `LlmEngine` boundary, the
> `useNaturalLanguage` hook, the GBNF-constrained `generate`, the abstain hatch).

## Why

The NL layer works end-to-end on real hardware — it even translates other
languages for free. This transcript (typed in French) is the motivating bug:

```
> Ouvrez la boîte aux lettres   ("open the mailbox")
› open mailbox
Opening the small mailbox reveals a leaflet.

> prends-le                     ("take it")
› open mailbox                  ← WRONG: confidently-wrong, cost a turn
It is already open.

> prends-le leaflet             (player forced to over-specify)
› take leaflet
Taken.
```

`prends-le` = "take **it**." The model had no antecedent for "it," the static
grammar could not express "take the thing just revealed," and the abstain hatch
did not fire — so constrained decoding forced out a grammar-valid-but-wrong
command (`open mailbox`). This is exactly the two hard problems `docs/notes.md`
predicted: **static vs. dynamic vocabulary** and **the abstain hatch is not
optional**.

## Goals

1. **Pronoun resolution** — "it" / "them" / "le" / "la" resolve to the object the
   player most plausibly means, on both the direct and indirect object slots.
2. **Dynamic, per-turn vocabulary** — the model can only name objects actually in
   scope this turn, so it cannot reference absent things.
3. **Stronger abstain** — when the layer is unsure (object out of scope, pronoun
   unresolvable, malformed output), it abstains and passes the raw English to
   Zork's own parser instead of emitting a confident wrong command.
4. **Two-object commands** — `unlock grating with key`, `put coffin in case`,
   `give amulet to troll` — the commands that actually solve the game.

## Non-goals (this pass)

- **Reading the Z-machine object table.** The scene source is text-derived; the
  authoritative object-table provider is a documented future swap behind the
  `SceneProvider` interface (see "Open questions / future").
- **Disambiguation of two same-noun objects** (two doors). We serialize the bare
  noun and let Zork ask "Which door?". Adjectives in the vocab help; full
  disambiguation is future work.
- **Lighter/heavier model ladder, self-hosting weights, SAVE/RESTORE prompt** —
  untouched; tracked elsewhere.

## Locked decisions

1. **Scene source: text-derived, behind a `SceneProvider` interface (hybrid).**
   Ship the cheap text implementation; keep the seam for an authoritative
   Z-machine-object-table provider later (`docs/notes.md` "start static, measure,
   go dynamic only if justified").
2. **Command shape: full two-object** — `{verb, object?, prep?, indirect?}`.
3. **Scene tracking: stateful running tracker** — a reducer over transcript
   events, not a stateless per-turn snapshot, so carried inventory items stay
   referenceable across rooms (required for two-object commands).
4. **JSON-intermediate.** The model emits a JSON command object constrained by a
   dynamically-built GBNF; a pure validator checks it against the scene and
   serializes the canonical command string (`docs/notes.md`
   "direct strings to prove it out; add the JSON seam for anything shippable").
5. **Abstain defers to Zork.** Any validation failure → pass the raw English
   through; Zork's own parser (including its own "it" tracking) handles it.

## Architecture & per-turn data flow

When NL is `on` and the player submits English, the turn runs this pipeline.
Everything new is pure JS except the existing `engine.generate` call; the VM
engine boundary is unchanged (`generate(messages, grammar, signal)` already takes
a per-call grammar string).

```
English ─► Scene (from the running tracker)
            │
            ├─► buildGrammar(vocab, scene) ──► dynamic GBNF (JSON shape; noun = in-scope objects)
            ├─► buildPrompt(english, ctx, scene) ──► messages (lists in-scope objects + antecedent)
            ▼
      engine.generate(messages, grammar) ─► JSON  {verb, object?, prep?, indirect?}
            ▼
      parseCommand(json, scene, vocab) ─► TranslateResult
            │  • resolve pronouns → antecedent   • each slot in-scope?   • verb/prep/arity coherent?
            ├─ command ─► echoLocal(english) + sendLine("unlock grating with key")
            └─ abstain  ─► sendLine(english)            ← raw to Zork's own parser
```

Worked examples:

- `prends-le`, scene `{inScope:[mailbox, leaflet], antecedent:leaflet}` →
  `{"verb":"take","object":"leaflet"}` → `take leaflet`. (The motivating bug.)
- `unlock it with the key`, scene `{inScope:[grating, key], antecedent:grating}` →
  `{"verb":"unlock","object":"grating","prep":"with","indirect":"key"}` →
  `unlock grating with key`.

## Components

### Scene model + tracker (`src/llm/scene/`)

```ts
// scene/types.ts
export interface SceneObject {
  canonical: string          // grammar-canonical noun, e.g. "mailbox"
  adjectives?: string[]      // optional, for future disambiguation
  carried?: boolean          // in inventory → stays in scope across rooms
}
export interface Scene {
  inScope: SceneObject[]
  antecedent: string | null  // most-recently-named canonical noun ("it" target)
}

// A turn-boundary observation, derived from the live ViewState + last command.
export interface SceneEvent {
  location: string           // current room (status.location)
  outputText: string         // the room/response block since the last input
  lastCommand: string | null // the canonical command we last sent, if any
}

/** The swappable scene source. Text impl now; Z-object-table impl later. */
export interface SceneProvider {
  observe(event: SceneEvent): void
  scene(): Scene
  reset(): void              // new game / story change
}
```

`tracker.ts` — `TextSceneTracker implements SceneProvider`. State transition is a
pure `reduceScene(prev: SceneState, event, vocab) → SceneState`; the class is a
thin stateful wrapper so the hook can call `observe`/`scene`. Rules:

- **Room change** (`location` differs from prior) → drop non-carried objects;
  keep carried ones; clear antecedent unless re-mentioned.
- **Object mention** — a known vocab noun/synonym/adjective phrase appears in
  `outputText` → it enters scope and becomes the antecedent (latest wins; ties
  broken by appearance order, last one wins).
- **Take** — `lastCommand` is `take X` and `outputText` matches a "taken"
  acknowledgement → mark X `carried`.
- **Drop** — `lastCommand` is `drop X` and a "dropped" acknowledgement → unset
  `carried`; X leaves scope when the room is next left.

The take/drop acknowledgement phrases are game-specific; they live in the per-game
vocab (`takeAck` / `dropAck` patterns), not hard-coded in the tracker.

### Vocabulary + dynamic grammar (`src/llm/grammar/`)

The monolithic static `*.gbnf.ts` strings cannot be intersected with text or
rebuilt per turn, so they become **structured vocab data**:

```ts
// grammar/types.ts
export interface NounEntry {
  canonical: string
  synonyms?: string[]        // surface forms that map to canonical (any language: "boîte" → mailbox is the MODEL's job; synonyms here are game-dictionary forms)
  adjectives?: string[]
}
export interface Vocab {
  verbsOnly: string[]        // look, inventory, wait …
  movement: string[]         // north, up, enter …
  verbs1: string[]           // single-object transitives: take, open, read …
  verbs2: string[]           // two-object verbs: unlock, put, give, attack …
  preps: string[]            // with, in, to, on …
  nouns: NounEntry[]
  takeAck: RegExp            // recognises a successful take in output text
  dropAck: RegExp            // recognises a successful drop
}
```

- `grammar/zork{1,2,3}.vocab.ts` — the per-game vocab (reworked from the existing
  `*.gbnf.ts` + corpus knowledge).
- `grammar/buildGrammar.ts` — `buildGrammar(vocab, scene) → string` emits the
  **JSON-shaped** GBNF. The `noun` production is filled from `scene.inScope`
  (canonical + adjectives), verbs/preps from the static vocab, plus an
  always-present abstain production. Sketch (exact escaping confirmed at the gate):

  ```
  root        ::= command | abstain
  abstain     ::= "{\"verb\":\"__UNKNOWN__\"}"
  command     ::= "{" "\"verb\":" verb obj? "}"
  obj         ::= ",\"object\":" noun two?
  two         ::= ",\"prep\":" prep ",\"indirect\":" noun
  verb        ::= "\"take\"" | "\"open\"" | "\"unlock\"" | …
  prep        ::= "\"with\"" | "\"in\"" | "\"to\"" | …
  noun        ::= "\"mailbox\"" | "\"leaflet\"" | …          ← dynamic = scene.inScope
  ```

  When `scene.inScope` is empty, `noun` is empty → only verb-only/movement
  commands or abstain are producible (the model cannot invent an object).

- `grammar/index.ts` — `vocabForSignature(sig) → Vocab | null` replaces
  `grammarForSignature`.

### JSON-intermediate validation (`src/llm/translate.ts`)

`parseCommand(rawJson, scene, vocab) → TranslateResult` replaces `parseCompletion`
(stays pure and total; `TranslateResult` keeps `{kind:'command';text} | {kind:'abstain'}`):

1. Parse the GBNF-guaranteed JSON `{verb, object?, prep?, indirect?}`.
   (Malformed/empty → abstain — defensive; GBNF should prevent it.)
2. Verb `__UNKNOWN__` → abstain.
3. Resolve any pronoun slot value to `scene.antecedent`; if a pronoun has no
   antecedent → abstain.
4. Validate each named object is in `scene.inScope` (by canonical) → else abstain.
5. Arity/prep coherence: `verbs2` require both `prep` and `indirect`; `verbs1`
   forbid them → else abstain.
6. Serialize to the canonical string, skipping null slots:
   `take leaflet` / `unlock grating with key` / `put coffin in case`.

`ABSTAIN` stays the single shared sentinel.

### Prompt (`src/llm/prompt.ts`)

`PromptContext` gains `inScope: string[]` and `antecedent: string | null`.
`buildPrompt` lists the in-scope objects and the antecedent ("most recently
mentioned: leaflet"), and instructs the model to emit one single-line JSON command
object or the `__UNKNOWN__` abstain. The review-S12 untrusted-text delimiting of
game output is retained.

### Hook (`src/llm/useNaturalLanguage.ts`)

Owns a `SceneProvider`. On each `ViewState` update it builds a `SceneEvent`
(location, output block since last input, last canonical command) and calls
`observe`. On `translate(english)`: `scene = provider.scene()` →
`buildGrammar(vocab, scene)` + `buildPrompt(english, ctx, scene)` →
`engine.generate(messages, grammar, signal)` → `parseCommand(raw, scene, vocab)` →
command (`echoLocal` + `sendLine(canonical)`) or abstain (`sendLine(english)`).
The watchdog, pending-lock, notice, and persistence behavior are unchanged.

### Unchanged

`engine.webllm.ts`, `engine.fake.ts` interface (fake just returns JSON strings
now), the GlkOte bridge, the VM engine, capability gating, `nlpref`, and all UI
components (`NlToggle`, `ModelDownloadModal`, `Scrollback`, `StatusBar`,
`Terminal` wiring).

## Testing

Unit (sandbox, fake engine):

- **tracker** — room change drops non-carried / keeps carried; mention adds +
  sets antecedent; take marks carried; drop unsets; reset clears.
- **buildGrammar** — in-scope nouns appear as JSON-string terminals; abstain
  production always present; empty scope yields no `noun` alternatives.
- **parseCommand** — pronoun → antecedent; out-of-scope object → abstain;
  two-object serialize; `verbs2` missing `prep`/`indirect` → abstain; malformed
  JSON → abstain.
- **prompt** — in-scope list + antecedent present; untrusted-text delimiting kept.
- **hook** — replays the French transcript with a scripted JSON engine:
  `open mailbox` → mention leaflet → `prends-le` resolves to `take leaflet`.
- **corpora** — extended with two-object, pronoun, and should-abstain cases.

Deferred to the **manual walking-skeleton gate** (needs real WebGPU; same gate as
the prior pass):

- Does the small (1.5B) model emit well-formed JSON slots under the JSON GBNF, and
  at what latency vs. the single-token command path? Tune `WATCHDOG_MS`; escalate
  to the 8B model or narrow scope if it misses.
- The take/drop tracker keys off game phrasing (`takeAck`/`dropAck`) — confirm on
  real transcripts; the `SceneProvider` seam is the escape hatch if brittle.

## Open questions / future

- **Authoritative scene from the Z-machine object table.** The live `ZMachine.vm`
  holds the running object tree; an object-table `SceneProvider` would be ground
  truth and remove the text-heuristic's blind spots, at the cost of a VM-memory
  seam, ZSCII short-name decoding, and game-specific player-object identification
  (v3 has no standard header pointer for the player). Swap-in only; nothing
  downstream changes.
- **Disambiguation** of same-noun objects via adjectives, rather than deferring to
  Zork's "Which door?".
- **Plurality** — distinct "them" handling vs. "it" (currently both resolve to the
  single antecedent).
