# Loquor NL Compound Commands — Design

Status: approved (brainstormed 2026-06-07)
Companion plan: `docs/superpowers/plans/2026-06-07-loquor-nl-compound-commands.md` (to be written)
Builds on: `docs/superpowers/specs/2026-06-07-loquor-nl-scene-resolution-design.md`

## Why

The NL layer translates one line of English into **one** canonical Zork command
(locked decision 2: `{verb, object?, prep?, indirect?}`). A player who types a
compound instruction — e.g. `ouvrez la boîte aux lettres and prenez le papier`
("open the mailbox and take the leaflet") — gets only the first action; the rest
is silently dropped. This pass adds **sequential multi-action** support: break the
input into clauses, translate and issue them one at a time, and stop early on the
first clause that cannot be translated or whose command fails in-game.

The motivating case is **dependent**: the leaflet is not in scope until the
mailbox has actually been opened, so the clauses cannot all be translated up front
against the pre-turn scene. Each clause must be translated against the scene that
exists *after* the previous clause has run.

## Goals

1. A compound English input runs as a sequence of canonical commands, one per
   game turn, in order.
2. Each clause is translated against the **live scene** — so a later clause can
   reference objects revealed or moved by an earlier clause (`open mailbox` →
   leaflet in scope → `take it` → `take leaflet`).
3. The sequence **stops and discards the remaining clauses** when either:
   - a clause cannot be translated (the model abstains, a slot is out of scope,
     or the translation times out / errors), or
   - a clause's command **fails in-game**, detected via the existing no-op
     signals (`vocab.failurePat` — "is already…" / "cannot be…" — or
     `vocab.absencePat` — "you can't see any…").
4. Single-action input (no clause separator) behaves **exactly as today** — same
   code path, no behavioral change, no new latency.

## Non-goals (this pass)

- **Model-driven clause splitting / a command-array grammar.** Splitting is
  deterministic JS. The grammar still emits one command object per model call.
  (Rejected approach B — a single up-front translation cannot resolve a dependent
  clause whose object does not yet exist in scope.)
- **Robust general failure detection.** We reuse only the existing no-op patterns
  (`failurePat`/`absencePat`). Open-ended refusals ("you can't go that way") are
  NOT detected; such a clause is treated as succeeded and the sequence continues.
  Broader failure-phrase matching is deferred (it trades recall for false
  "failed" verdicts that would wrongly drop valid remaining actions).
- **Parallel / batched execution.** Always one clause per turn, sequential, to
  preserve the dependency ordering and keep the scene correct between clauses.
- **Comma-separated object lists as clauses.** `take the lamp, sword and key` is
  left to the model/Zork as a single clause; comma is not a clause separator.

## Locked decisions

1. **Deterministic clause split, sequential translation.** `splitClauses(english)`
   splits on word separators `and` / `then` / `et` / `puis` / `ensuite` and
   sentence punctuation `.` / `;` (case-insensitive, surrounded by whitespace for
   the word forms). Commas are NOT separators. Empty/whitespace clauses are
   dropped. A single resulting clause means "not compound".
2. **One clause per turn.** Each clause is sent with `sendLine` and the pipeline
   waits for that turn's line-input boundary before translating the next clause.
3. **Stop conditions (discard the rest):** translation failure OR a no-op/absence
   match in the clause's own output. Commands already executed are kept.
4. **Stop, do not raw-send, on a mid-sequence untranslatable clause.** Once at
   least one command has been issued, an untranslatable later clause simply stops
   the sequence — its raw text is NOT sent to Zork (it would be French/garbage to
   the parser). EXCEPTION: if the **first** clause is untranslatable and nothing
   has been sent yet, fall back to today's behavior — raw-send the **original**
   full input — so non-compound-looking untranslatable input is unchanged.
5. **Echo the full English once.** `echoLocal(english)` is called a single time
   at the start of a compound sequence (the player's literal input). Each clause's
   canonical command then appears as the VM's own input echo + response, in order.
6. **Safety cap.** At most `MAX_CLAUSES = 8` clauses are processed; extras are
   dropped with a visible notice. Guards against a pathological input spawning an
   unbounded turn loop.

## Architecture & per-turn data flow

```
English ─► splitClauses() ─► [c1, c2, …]
   │
   ├─ length 1 ─► EXISTING single-command path (unchanged)
   │
   └─ length >1 ─► echoLocal(english) once, then for each clause in order:
                     scene   = tracker.scene()                 // live, post-prev-clause
                     grammar = buildGrammar(vocab, scene)
                     raw     = engine.generate(buildPrompt(clause, ctx), grammar)
                     result  = parseCommand(raw, scene, vocab)
                     result.kind !== 'command' ─► STOP (see locked decision 4)
                     sendLine(result.text); lastCommand = result.text
                     view    = await awaitTurn()               // turn-boundary view
                     tracker.observe(eventFrom(view, lastCommand))
                     failed(view, vocab) ─► STOP               // no-op / absence
```

`awaitTurn()` is the one new seam. It resolves at the **next line-input boundary**
with the settled `ViewState`. It is registered *before* `sendLine` so a
synchronously-executed turn (Zork turns run synchronously inside `accept`) cannot
fire `onTurn` before the listener is attached.

## Components

### Clause splitter (`src/llm/translate.ts`)

```ts
/** Split a compound English instruction into ordered clauses. A single clause
 *  (no separator) returns a length-1 array — the caller treats that as
 *  "not compound" and uses the existing single-command path. */
export function splitClauses(english: string): string[]
```

Pure, total, game-agnostic. Separators: `/\s+(?:and|then|et|puis|ensuite)\s+/i`
and `/\s*[.;]\s*/`. Trims, drops empties.

### Turn-boundary seam (`src/glkote-react/bridge.ts`, `src/zmachine/engine.ts`)

```ts
// bridge.ts — resolve the next onTurn with the settled view.
awaitTurn(): Promise<ViewState>
// engine.ts — pass-through façade.
awaitTurn(): Promise<ViewState>
```

Implementation: the bridge keeps a list of pending turn-resolvers. `update()`,
at the point it already calls `onTurn?.()` for a `line` request, also drains and
resolves those resolvers with the current `this.view`. `awaitTurn()` pushes a
resolver and returns the promise. (The existing `onTurn` observer hook is
retained and unchanged.)

### Hook orchestration (`src/llm/useNaturalLanguage.ts`)

- New arg: `awaitTurn: () => Promise<ViewState>` (wired in Terminal to
  `engine.awaitTurn`).
- `translate()` gains the compound branch above. The meta / confirmation /
  disambiguation bypasses still run first, on the **whole** input, before any
  split. The concurrency guard (`translatingRef`) and `pending` span the entire
  sequence; the per-clause `engine.generate` keeps its own watchdog.
- Between clauses the hook calls `tracker.observe(...)` directly (it cannot wait
  for Terminal's effect-driven observe within a synchronous loop). `reduceScene`
  is idempotent, so Terminal's later observe of the final view is a no-op.

### Wiring (`src/ui/Terminal.tsx`)

Pass `awaitTurn: () => engineRef.current?.awaitTurn() ?? Promise.resolve(view)`
to the hook. No other Terminal change; single-clause turns still observe via the
existing `view.inputRequest === 'line'` effect.

### Unchanged

`buildGrammar`, `buildPrompt`, `parseCommand`, the scene tracker reducer, the
grammar/vocab, the download/toggle state machine, and the single-command path.

## Error handling

- **Mid-sequence translation failure** (abstain/timeout/error): stop; keep what
  ran; optional notice "Stopped after N actions." Watchdog/generate errors are
  treated as "couldn't translate this clause" (stop), matching the single-path
  fallback intent but without raw-sending a later clause.
- **First-clause untranslatable, nothing sent:** raw-send the original input
  (today's abstain behavior preserved).
- **In-game no-op failure:** stop after observing; the failing command's own
  (no-op) output is already on screen.
- **`awaitTurn` never resolves** (defensive): the per-clause path is bounded by
  `MAX_CLAUSES`; a missing turn boundary would hang the sequence, so `awaitTurn`
  resolvers are also settled if the VM ends (`onEnd`) to avoid a wedged promise.

## Testing

- `splitClauses`: separators (and/then/et/puis/ensuite, `.`/`;`), comma is NOT a
  separator, trims/drops empties, single clause → length 1, case-insensitivity.
- `bridge.awaitTurn`: resolves on the next `line` update with the settled view;
  multiple concurrent awaiters all resolve; resolves (or rejects cleanly) on end.
- Hook (fake engine + scripted `awaitTurn` views):
  - dependent success: `open mailbox and take it` → `open mailbox`, scene gains
    leaflet, `take it` → `take leaflet` (two `sendLine`s, in order).
  - stop on untranslatable later clause: `open mailbox and xyzzy the grue` →
    `open mailbox` sent, then stop; only one command issued.
  - stop on in-game no-op: `open mailbox and read leaflet` where `open mailbox`
    output is "It is already open." → stop after the first; second not sent.
  - first-clause untranslatable → raw-send original input (unchanged abstain).
  - single-clause input → identical to today (regression guard).
  - meta/confirmation/disambiguation bypass still short-circuits a whole input
    that happens to contain "and" (e.g. is unaffected by the split).

## Open questions / future

- **Richer in-game failure detection** (beyond no-op/absence) without false
  positives — possibly verb-specific success/failure oracles per vocab.
- **Partial-failure feedback** — a clearer player-facing summary of how many of N
  actions ran and why the sequence stopped.
- **Model-emitted sequences** if/when an authoritative object-table scene provider
  removes the in-scope-after-effect dependency that currently forces JS splitting.
