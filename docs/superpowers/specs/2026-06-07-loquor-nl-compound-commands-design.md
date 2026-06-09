# Loquor NL Compound Commands — Design

Status: approved (brainstormed 2026-06-07; revised 2026-06-07 after pushback review)
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
3. The sequence **stops and discards the remaining clauses** when any of:
   - a clause cannot be translated (the model abstains, a slot is out of scope,
     or the translation times out / errors), or
   - a clause's command **fails in-game**, detected via the existing no-op
     signals (`vocab.failurePat` — "is already…" / "cannot be…" — or
     `vocab.absencePat` — "you can't see any…"), or
   - a clause's turn lands on an **interactive prompt** the player must answer —
     a disambiguation ("Which do you mean…?") or yes/no confirmation — detected
     between clauses by re-running the existing `isDisambiguationPrompt` /
     `isConfirmationPrompt` checks; the prompt is left on screen for the player.
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
  Note: a conjoined object phrase *without* a comma (`take the lamp and the
  sword`) DOES split on `and` into `take the lamp` / `take the sword` and runs as
  two turns. That is acceptable (both are valid commands); only a genuinely
  verbless fragment (`behind the painting`) abstains and stops the sequence with a
  partial-progress notice (locked decision 7).

## Locked decisions

1. **Deterministic clause split, sequential translation.** `splitClauses(english)`
   splits on word separators `and` / `then` / `et` / `puis` / `ensuite` and
   sentence punctuation `.` / `;` (case-insensitive, surrounded by whitespace for
   the word forms). Commas are NOT separators. Empty/whitespace clauses are
   dropped. A single resulting clause means "not compound".
2. **One clause per turn.** Each clause is sent with `sendLine` and the pipeline
   waits for that turn's line-input boundary before translating the next clause.
3. **Stop conditions (discard the rest):** translation failure OR a no-op/absence
   match in the clause's own output OR the clause's turn lands on an interactive
   prompt (disambiguation / yes-no confirmation, re-checked between clauses) OR
   `awaitTurn` settles on a genuine single-key prompt, end-of-game, or timeout.
   Commands already executed are kept; an interactive prompt is left on screen.
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
7. **No up-front false-split detection; abstain-stop + a visible notice.** There is
   NO lexical verb-token pre-check. (A check against the vocab's verbs would only
   recognise English verbs, so it would misclassify every non-English clause — e.g.
   the French motivating example `… and prenez le papier` — as a "false split" and
   wrongly route the whole input to the single-command path.) Instead, a false
   split (`look under the rug and behind the painting`, or any clause the model
   can't translate) is handled by the existing stop condition: the unparseable
   clause abstains and the sequence stops (locked decision 4). To remove the
   *silent* part of a mid-sequence truncation, whenever a sequence stops early
   after at least one command has run, the hook sets a visible notice
   `Ran N of M actions.` (N = commands issued, M = clauses attempted). This is
   language-agnostic and needs no verb lexicon.
8. **`awaitTurn` is self-bounding.** It acks through MORE pagination to the next
   `line` boundary, stops on a genuine single-key prompt or end-of-game, and is
   time-bounded per clause; no clause can wedge the UI with input disabled.
9. **The hook owns observation during a sequence.** An `inSequenceRef` latch is
   set for the duration of a compound run; Terminal's `view`-driven observe effect
   early-returns while it is set, so the hook's in-order, per-clause
   `tracker.observe(...)` calls are the *only* observations. This removes the
   render/effect-timing race that keyed idempotency alone does not close (a stale
   intermediate `view` observed with a mismatched `lastCommand` could otherwise
   shift the antecedent). The single-clause path is unaffected — `inSequenceRef`
   stays false and the existing effect observes as today.

## Architecture & per-turn data flow

```
English ─► splitClauses() ─► [c1, c2, …]
   │
   ├─ length 1 ─► EXISTING single-command path (unchanged)
   │
   └─ length >1 ─► inSequenceRef = true (Terminal's observe effect now no-ops),
                   echoLocal(english) once, then for each clause (index i) in order:
                     scene   = tracker.scene()                 // live, post-prev-clause
                     grammar = buildGrammar(vocab, scene)
                     raw     = engine.generate(buildPrompt(clause, ctx), grammar)
                     result  = parseCommand(raw, scene, vocab)
                     result.kind !== 'command' ─► STOP (locked dec. 4) ─► notice
                     sendLine(result.text); lastCommand = result.text; done++
                     { view, reason } = await awaitTurn()      // turn-boundary (bounded)
                     reason !== 'line'  ─► STOP (locked dec. 8) ─► notice  // key/end/timeout
                     tracker.observe(eventFrom(view, lastCommand))   // hook owns observe
                     failed(view, vocab) ─► STOP               // no-op / absence ─► notice
                     isConfirmationPrompt | isDisambiguationPrompt(view) ─► STOP ─► notice
                   finally: inSequenceRef = false
                   // notice = setNotice(`Ran ${done} of ${clauses.length} actions.`)
                   //          only when stopped early AND done >= 1 (locked dec. 7)
```

`awaitTurn()` is the one new seam. It resolves at the **next line-input boundary**
with the settled `ViewState`, and it is **self-bounding** so a clause can never
wedge the UI (locked decision 8):

- It **acks through MORE pagination**: while the boundary is a MORE `char` prompt
  (`charIsMore`), it `ackMore()`s and keeps waiting for the next `line` boundary.
- It **settles (and the sequence stops)** on a *genuine* single-key prompt
  (`awaitingKey()` true, not MORE) or on `onEnd` — neither yields a clean line
  boundary for an independent next command.
- It is **time-bounded** per clause (a multiple of `watchdogMs`); on timeout it
  resolves as "stop" so the loop ends and re-enables input rather than hanging.

It is registered *before* `sendLine` so a synchronously-executed turn (Zork turns
run synchronously once the VM is pumped) cannot fire `onTurn` before the listener
is attached.

## Components

### Clause splitter (`src/llm/translate.ts`)

```ts
/** Split a compound English instruction into ordered clauses. A single clause
 *  (no separator) returns a length-1 array — the caller treats that as
 *  "not compound" and uses the existing single-command path. */
export function splitClauses(english: string): string[]
```

Pure, total, game-agnostic, vocab-free. Separators:
`/\s+(?:and|then|et|puis|ensuite)\s+/i` and `/\s*[.;]\s*/`. Trims, drops empties.
There is no verb-token pre-check (locked decision 7): false splits are caught by
per-clause abstain-stop, not lexically.

### Turn-boundary seam (`src/glkote-react/bridge.ts`, `src/zmachine/engine.ts`)

```ts
// bridge.ts — resolve the next turn boundary with the settled view + how it ended.
//   reason: 'line'  → clean line boundary, ready for the next command
//           'key'   → genuine single-key prompt (awaitingKey, not MORE) → caller stops
//           'end'   → game ended → caller stops
awaitTurn(): Promise<{ view: ViewState; reason: 'line' | 'key' | 'end' }>
// engine.ts — pass-through façade.
awaitTurn(): Promise<{ view: ViewState; reason: 'line' | 'key' | 'end' }>
```

Implementation: the bridge keeps a list of pending turn-resolvers. In `update()`:

- **MORE pagination** (`charIsMore`): `ackMore()` and keep waiting — do **not**
  resolve; the sequence should page through long output transparently.
- **`line` request:** drain and resolve the pending resolvers with
  `{ view: this.view, reason: 'line' }` (the same point that already fires
  `onTurn?.()`, which is retained and unchanged).
- **Genuine single-key prompt** (`awaitingKey()` true, not MORE): resolve with
  `reason: 'key'` — there is no clean line boundary; the caller stops.
- **End of game** (`onEnd`): resolve any outstanding resolvers with `reason: 'end'`.

`awaitTurn()` pushes a resolver and returns the promise. The **per-clause timeout**
(locked decision 8) is owned by the hook's loop (it already has `watchdogMs`), not
the bridge: the loop races `awaitTurn()` against a timer and treats a timeout as a
stop, so the bridge seam stays free of timing policy.

### Hook orchestration (`src/llm/useNaturalLanguage.ts`)

- New arg: `awaitTurn: () => Promise<{ view: ViewState; reason: 'line' | 'key' | 'end' }>`
  (wired in Terminal to `engine.awaitTurn`).
- New ref: `inSequenceRef` (locked decision 9), exposed to Terminal (e.g. via the
  returned hook state or an `isSequencing()` accessor) so Terminal's observe effect
  can early-return while a sequence is in flight.
- `translate()` gains the compound branch above. The meta / confirmation /
  disambiguation bypasses still run first, on the **whole** input, before any
  split — and the confirmation / disambiguation checks are **re-run between
  clauses** on each clause's settled view (a mid-sequence prompt stops the
  sequence and is left on screen for the player). The concurrency guard
  (`translatingRef`) and `pending` span the entire sequence; the per-clause
  `engine.generate` keeps its own watchdog, and the loop additionally bounds each
  `awaitTurn` with a timer (locked decision 8).
- On any early stop after `done >= 1` commands ran, the hook sets a visible notice
  `Ran ${done} of ${clauses.length} actions.` (locked decision 7) so a truncated
  sequence is never silent. A stop before anything ran (first clause untranslatable)
  keeps today's abstain raw-send with no compound notice.
- The hook **owns all observation during a sequence**: with `inSequenceRef` set,
  Terminal's effect no-ops, and the loop calls `tracker.observe(eventFrom(view,
  lastCommand))` itself, in order, once per clause with that clause's command.
  This is deterministic — it does not rely on `reduceScene` idempotency to paper
  over a render/effect-timing race (the prior "idempotent, so it's a no-op"
  assumption did not hold against intermediate views observed with a mismatched
  `lastCommand`).

### Wiring (`src/ui/Terminal.tsx`)

Pass `awaitTurn: () => engineRef.current?.awaitTurn() ?? Promise.resolve({ view,
reason: 'line' })` to the hook. The existing observe effect gains one guard: it
**early-returns while `inSequenceRef` is set** (read via the hook's
`isSequencing()` / state), so it does not double-observe intermediate views during
a sequence:

```ts
useEffect(() => {
  if (nl.isSequencing()) return            // hook owns observe during a sequence
  if (view.inputRequest === 'line') nl.observe(view)
}, [view, nl])
```

Single-clause turns are unaffected — `inSequenceRef` stays false and they observe
via the existing `view.inputRequest === 'line'` effect exactly as today.

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
- **Mid-sequence interactive prompt** (disambiguation / yes-no): detected by
  re-running `isDisambiguationPrompt` / `isConfirmationPrompt` on the clause's
  settled view; stop and leave the prompt on screen so the player answers it
  directly (the next clause would otherwise be eaten as the answer).
- **False split / untranslatable later clause** (e.g. verbless `behind the
  painting`): the clause abstains and the sequence stops (locked decision 4); the
  partial-progress notice (locked decision 7) makes the truncation visible. We do
  NOT raw-send the fragment or re-translate the whole input.
- **`awaitTurn` wedge / non-line boundary** (defensive, locked decision 8): the
  seam acks through MORE pagination, but resolves with `reason: 'key'` on a
  genuine single-key prompt and `reason: 'end'` on game end — both stop the
  sequence. The loop additionally races each `awaitTurn` against a per-clause
  timer; on timeout it stops with a notice. In every case `pending` is cleared and
  input re-enabled, so no clause can leave the UI wedged with input disabled.

## Testing

- `splitClauses`: separators (and/then/et/puis/ensuite, `.`/`;`), comma is NOT a
  separator, trims/drops empties, single clause → length 1, case-insensitivity.
- `bridge.awaitTurn`: resolves `reason:'line'` on the next `line` update with the
  settled view; multiple concurrent awaiters all resolve; **acks through a MORE
  `char` prompt** and resolves on the following `line`; resolves `reason:'key'` on
  a genuine single-key prompt (not MORE); resolves `reason:'end'` on game end.
- Hook (fake engine + scripted `awaitTurn` results):
  - dependent success: `open mailbox and take it` → `open mailbox`, scene gains
    leaflet, `take it` → `take leaflet` (two `sendLine`s, in order).
  - stop on untranslatable later clause: `open mailbox and xyzzy the grue` →
    `open mailbox` sent, then stop; only one command issued.
  - stop on in-game no-op: `open mailbox and read leaflet` where `open mailbox`
    output is "It is already open." → stop after the first; second not sent.
  - **stop on mid-sequence interactive prompt:** a clause whose settled view is a
    disambiguation/confirmation prompt → stop; next clause NOT sent; prompt left
    on screen.
  - **stop on `awaitTurn` `reason:'key'` / `reason:'end'` / timeout:** sequence
    ends, `pending` cleared, input re-enabled; no further `sendLine`.
  - **false split → abstain-stop + notice:** `look behind the painting and behind
    the rug` where clause 2 abstains → only clause 1 runs, sequence stops, notice
    `Ran 1 of 2 actions.` (locked decision 7).
  - **partial-progress notice:** any early stop with `done >= 1` sets
    `Ran ${done} of ${total} actions.`; a full run sets no notice.
  - first-clause untranslatable → raw-send original input, NO compound notice
    (unchanged abstain).
  - single-clause input → identical to today (regression guard).
  - meta/confirmation/disambiguation bypass still short-circuits a whole input
    that happens to contain "and" (e.g. is unaffected by the split).
- **Terminal observe guard:** while `nl.isSequencing()` is true the `view` effect
  does not call `nl.observe`; single-clause turns still observe via the effect.

## Open questions / future

- **Richer in-game failure detection** (beyond no-op/absence) without false
  positives — possibly verb-specific success/failure oracles per vocab.
- **Richer partial-failure feedback** — beyond the `Ran N of M actions.` notice
  (locked decision 7), a clearer summary of *why* the sequence stopped (which
  clause, which reason).
- **Model-emitted sequences** if/when an authoritative object-table scene provider
  removes the in-scope-after-effect dependency that currently forces JS splitting.
