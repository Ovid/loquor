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
3. **Stronger abstain — two distinct mechanisms, only one of which is new
   strength.** (a) **Deterministic validator abstains** (object out of scope,
   malformed output, arity/prep incoherence) are new, total, and fully in our
   control. (b) **Model-elective abstain** on ambiguity (ambiguous/absent pronoun
   antecedent) still depends on the model voluntarily choosing `__UNKNOWN__`; it is
   *no stronger* than the prior pass except that the in-scope-only noun set bounds
   a wrong guess to an object that is at least present. We do **not** ship a
   confidence/logprob-gated abstain (see "Open questions / future"). Either way, a
   layer-side abstain passes the raw English to Zork's own parser instead of
   emitting a confident wrong command.
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
6. **Pronouns are resolved by the model, not the validator.** The GBNF `noun`
   production carries only in-scope canonical nouns (no pronoun terminal), so the
   model maps "it"/"le"/"la"/"them" → the antecedent's canonical noun using the
   prompt's antecedent hint; on ambiguous/absent antecedent it emits `__UNKNOWN__`.
   The validator never resolves pronouns (there is no pronoun-resolution step in
   `parseCommand`). The cost: model-elective abstain on ambiguity is only as strong
   as the model — a gate criterion measures whether the 1.5B model actually chooses
   `__UNKNOWN__` on a genuinely ambiguous pronoun rather than guessing.

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
            │  • each slot in-scope?   • verb/prep/arity coherent?   • __UNKNOWN__?
            ├─ command ─► echoLocal(english) + sendLine("unlock grating with key")
            └─ abstain  ─► sendLine(english)            ← raw to Zork's own parser
```

**Pronoun resolution is the MODEL's job, not the validator's (locked decision 6).**
The dynamic GBNF restricts the `object`/`indirect` slots to in-scope **canonical**
nouns — there is no pronoun terminal — so the model can never emit a literal "it".
The prompt names the antecedent ("most recently mentioned: leaflet") and the model
maps the pronoun to that canonical noun directly. When the antecedent is ambiguous
or absent, the model is instructed to emit the `__UNKNOWN__` abstain rather than
guess. The validator therefore never sees a pronoun; it only validates canonicals.

Worked examples:

- `prends-le`, scene `{inScope:[mailbox, leaflet], antecedent:leaflet}` → the model
  resolves "le"→leaflet from the prompt hint → `{"verb":"take","object":"leaflet"}`
  → `take leaflet`. (The motivating bug.)
- `unlock it with the key`, scene `{inScope:[grating, key], antecedent:grating}` →
  model resolves "it"→grating → `{"verb":"unlock","object":"grating","prep":"with","indirect":"key"}`
  → `unlock grating with key`.

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
thin stateful wrapper so the hook can call `observe`/`scene`. `reduceScene` is
**idempotent**: re-applying the same `(location, outputText, lastCommand)` triple
is a no-op (the hook dedups too, but the reducer must not corrupt scope/antecedent
if called twice on identical content). Rules:

- **Room change** (`location` differs from prior) → drop non-carried objects;
  keep carried ones; clear antecedent unless re-mentioned this turn.
- **Object mention** — a known vocab noun/synonym/adjective phrase appears in
  `outputText` → it enters scope. **Matching is word-boundary (token), not raw
  substring** (so `door` does not match `trapdoor`, `egg` not `begged`,
  `troll` not `controlled`); multi-word/adjective phrases use **longest-match-wins**.
  A per-game **negation/absence** pattern (`absencePat`, sibling to
  `takeAck`/`dropAck`) **suppresses** a mention so absent objects never enter scope
  (e.g. "there is no lamp here", "the trophy case is empty", "you can't see any
  troll"). False-positive precision is a tested property (see Testing) and a gate
  criterion (zero absent objects in-scope across N real-transcript turns).
- **Antecedent precedence (three tiers, highest wins).** After reducing a turn,
  the antecedent is chosen as: (1) **revealed-in-output** — the newest object
  *mentioned* in this turn's `outputText` (latest wins; ties by appearance order,
  last one wins); else (2) **player's-just-acted object** — the direct object of a
  **successful** `lastCommand` (ack matched / no failure), so `take lamp` → "Taken."
  makes `lamp` the antecedent even though prose never names it; else (3) the
  **prior antecedent** carries over. This handles both `open mailbox / take it`
  (tier 1 reveal) and `take lamp / turn it on` (tier 2 acted-object).
- **Take** — `lastCommand` is `take X` and `outputText` matches `takeAck` → mark X
  `carried`.
- **Drop** — `lastCommand` is `drop X` and `outputText` matches `dropAck` → unset
  `carried`; X leaves scope when the room is next left.

The acknowledgement and absence phrases are game-specific; they live in the
per-game vocab (`takeAck` / `dropAck` / `absencePat`), not hard-coded in the
tracker.

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
  absencePat: RegExp         // suppresses a mention (negation/absence: "no <noun>", "<noun> is empty", "can't see")
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
3. Validate each named object is in `scene.inScope` (by canonical) → else abstain.
   (There is **no** pronoun-resolution step: under locked decision 6 the model has
   already mapped any pronoun to a canonical in-scope noun, so the validator only
   ever sees canonicals. A pronoun in the JSON is impossible under the GBNF.)
4. Arity/prep coherence: `verbs2` require both `prep` and `indirect`; `verbs1`
   forbid them → else abstain.
5. Serialize to the canonical string, skipping null slots:
   `take leaflet` / `unlock grating with key` / `put coffin in case`.

`ABSTAIN` stays the single shared sentinel.

### Prompt (`src/llm/prompt.ts`)

`PromptContext` gains `inScope: string[]` and `antecedent: string | null`.
`buildPrompt` lists the in-scope objects and the antecedent ("most recently
mentioned: leaflet"), and instructs the model to (a) map any pronoun
("it"/"them"/"le"/"la") to the **antecedent's canonical noun** and emit that noun
in the slot — never a literal pronoun (the GBNF forbids it anyway); (b) emit the
`__UNKNOWN__` abstain when the antecedent is **ambiguous or absent** rather than
guessing an in-scope object; and (c) emit one single-line JSON command object
otherwise. The review-S12 untrusted-text delimiting of game output is retained.

### Hook (`src/llm/useNaturalLanguage.ts`) — args & seam deltas

The hook's public args change: **`grammar: string | null` is replaced by
`vocab: Vocab | null`** (the hook builds the grammar per turn). It owns a
`SceneProvider`.

**Observe seam (turn-boundary, not per-render).** The tracker must observe **once
per turn**, gated on the same signal `viewToContext` already uses — a *new*
line-input request / new `input` line (the bridge's documented turn boundary), not
on every `ViewState` re-render. The event's `outputText` is the block since the
last input (reuse the existing derivation). The hook keeps a **`lastCommandRef`**:
set to the canonical command when `translate` sends one, left **null on abstain /
raw pass-through**, and the event carries it so take/drop/acted-object attribution
pairs the *output* with the command that produced it. After observing a turn, the
latch is cleared/advanced. Duplicate `(location, outputText, lastCommand)` triples
are deduped here (and `reduceScene` is idempotent as a backstop).

On `translate(english)`: `scene = provider.scene()` → `buildGrammar(vocab, scene)`
+ `buildPrompt(english, ctx, scene)` → `engine.generate(messages, grammar, signal)`
→ `parseCommand(raw, scene, vocab)` → command (`echoLocal` + `sendLine(canonical)`,
**and set `lastCommandRef`**) or abstain (`sendLine(english)`, `lastCommandRef`
stays null). The watchdog, pending-lock, notice, and persistence behavior are
unchanged.

### Changed wiring (`src/ui/Terminal.tsx`)

- `grammarForSignature(signature)` → **`vocabForSignature(signature)`**; the memo
  yields `Vocab | null` and is passed as the hook's `vocab` prop.
- A **new observe seam**: Terminal feeds turn-boundary view updates into the hook
  (e.g. an effect keyed on the line-input-request / latest `input` line) so the
  tracker's `observe` runs once per turn. This is the one genuinely new bit of
  Terminal integration and carries its own test.

### Unchanged

`engine.webllm.ts`, the `engine.fake.ts` *interface* (fake now returns JSON
strings), the GlkOte bridge, the VM engine, capability gating, `nlpref`, the
watchdog/pending-lock/notice/persistence internals of the hook, and the UI
components `NlToggle`, `ModelDownloadModal`, `Scrollback`, `StatusBar`. (Terminal's
NL *wiring* changes per "Changed wiring" above — it is **not** unchanged.)

## Testing

Unit (sandbox, fake engine):

- **tracker** — room change drops non-carried / keeps carried; mention adds to
  scope; take marks carried; drop unsets; reset clears; `reduceScene` idempotent on
  a duplicate `(location, outputText, lastCommand)` triple.
- **tracker mention precision** — word-boundary matching rejects the false-positive
  classes (`door`⊄`trapdoor`, `egg`⊄`begged`, `troll`⊄`controlled`); `absencePat`
  suppresses negated/absent mentions ("there is no lamp here", "the case is empty",
  "you can't see any troll") so they never enter scope; longest-match-wins on an
  adjective phrase.
- **tracker antecedent precedence** — tier 1 revealed-in-output wins
  (`open mailbox`→reveal leaflet ⇒ antecedent leaflet); tier 2 acted-object on a
  successful `lastCommand` with no prose mention (`take lamp`→"Taken." ⇒ antecedent
  lamp); tier 3 prior antecedent carries over when neither fires.
- **buildGrammar** — in-scope nouns appear as JSON-string terminals; abstain
  production always present; empty scope yields no `noun` alternatives; **no pronoun
  terminal is ever emitted** (pronouns are the model's job, not the grammar's).
- **parseCommand** — out-of-scope object → abstain; two-object serialize; `verbs2`
  missing `prep`/`indirect` → abstain; `verbs1` *with* `prep`/`indirect` → abstain;
  `__UNKNOWN__` verb → abstain; malformed JSON → abstain. (No pronoun-resolution
  test — there is no such step under locked decision 6.)
- **prompt** — in-scope list + antecedent present; untrusted-text delimiting kept.
- **hook** — replays the French transcript with a scripted JSON engine:
  `open mailbox` → observe leaflet → `prends-le` (model emits `{"verb":"take",
  "object":"leaflet"}`) → `take leaflet`. Also asserts the observe seam fires
  **once per turn** (not per render) and `lastCommandRef` is null after an abstain.
- **corpora** — extended with two-object, pronoun (both `open mailbox / take it`
  and `take lamp / turn it on`), and **should-abstain-on-ambiguous-pronoun** cases.

Deferred to the **manual walking-skeleton gate** (needs real WebGPU; same gate as
the prior pass):

- Does the small (1.5B) model emit well-formed JSON slots under the JSON GBNF, and
  at what latency vs. the single-token command path? Tune `WATCHDOG_MS`; escalate
  to the 8B model or narrow scope if it misses.
- **Does the model resolve pronouns from the antecedent hint, and — the load-
  bearing question for goal #1/#3 — does it actually emit `__UNKNOWN__` on a
  genuinely ambiguous pronoun rather than guessing an in-scope object?** If it
  guesses, the cheap lever is a few-shot ambiguous→`__UNKNOWN__` example in the
  prompt; measure lift.
- The tracker keys off game phrasing (`takeAck`/`dropAck`/`absencePat`) — confirm
  on real transcripts. **Gate criterion:** across N real Zork I turns the in-scope
  set contains **zero absent objects** (no false-positive or negated mentions). The
  `SceneProvider` seam is the escape hatch if the text heuristic stays brittle.

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
- **Confidence/logprob-gated abstain.** Model-elective abstain on ambiguity
  (goal #3b) is only as strong as the model's willingness to choose `__UNKNOWN__`.
  A token-logprob gate ("if the top-2 in-scope nouns are within ε, abstain") would
  make ambiguity-abstain deterministic, but needs token-level logprobs from WebLLM
  that may not be exposed. Out of scope this pass; named here so the gate's
  expectations are honest.
