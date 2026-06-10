# Loquor Output Translation — Design (v1: Zork I × French)

**Date:** 2026-06-10
**Status:** Approved (brainstormed with Ovid; revised 2026-06-10 after
pushback review; supersedes nothing — extends the NL multilingual design,
`2026-06-09-loquor-nl-multilingual-design.md`, which explicitly deferred
output translation in its non-goals)

## 1. Goal

When the player has selected a non-English language, **all game output is
displayed in that language, instantly** — room descriptions, responses,
inventory/contents listings, the score line, death messages, and the status
bar. The first slice is **Zork I × French**; German and Spanish follow as
data-only additions (see §8), and Zork II/III reuse the same machinery with
their own corpora.

"Instantly" is a hard requirement: the common path adds zero perceptible
latency over the English game. The on-device LLM is a **rare fallback only**.

## 2. Locked decisions

1. **Instant via pre-translated tables; LLM as rare fallback.** No runtime
   LLM call on the common path.
2. **Claude generates the corpus during implementation** (batched subagent
   translation work, committed as reviewable data files). No API keys, no
   build-time model dependency; UAT feedback hand-fixes entries, same
   lifecycle as the input lexicons.
3. **Scope: Zork I × French only** for this effort. DE/ES and Zork II/III are
   mechanical follow-ups.
4. **On a table miss, the line blocks with a translation shimmer** until the
   LLM fallback responds — the player never sees English on the transcript
   for a translatable line. Fallback results are cached in IndexedDB (each
   miss costs once per device, ever) and logged for corpus improvement.
   Exception: if the engine is unavailable or generation fails, show English
   rather than shimmer forever (§6).
5. **Status bar: translated** (display-only; parsing and scene tracker stay
   English). **Echoed canonical command: kept in English, de-emphasized**
   (the player's own words already show as the `nl-source` line; the English
   echo is useful parser feedback). **App chrome (modals, buttons,
   indicators): out of scope** — separate UI-i18n effort.
6. **Approach A: full-line exact match + curated template layer** (rejected:
   sentence-level matching — fragment alignment fights French word order;
   walkthrough-capture corpus — coverage too thin for "instant is required").

## 3. Architecture: translation as a display overlay

English remains the single source of truth everywhere internally. The bridge,
reducer, `ViewState`, scene tracker, prompt context, autosave, and
restore-rebuild path are **untouched**. Translation is a display-layer module
(`src/translate/`) between `ViewState` and the React components:

```
ViewState (English, unchanged)
    │
    ▼
useOutputTranslation(view, language)          ← new hook
    │  per BufferLine (kind 'output' | 'room' only):
    │    1. exact match, string table       → French (sync, instant)
    │    2. template match + object table   → French (sync, instant)
    │    3. miss → shimmer; LLM fallback    → French (async, cached, logged)
    ▼
overlay: Map<lineId, string | 'pending'>  +  translated StatusLine
    │
    ▼
components render overlay text when present, English otherwise
```

Properties:

- `input` and `nl-source` lines never reach the matcher.
- Overlay entries are memoized on **line text** (not just id), so
  `append: true` merges re-translate correctly when a line's text changes.
- When language is `en` or `off`, the hook is a no-op passthrough.
- Lookups are pure functions of the English text, so rehydration after an
  autosave restore re-translates identically for free. Nothing translated is
  persisted except the LLM fallback cache.
- **Backlog rule (language switch / restore):** lines already on screen when
  the language switches — and the transcript rebuilt by an autosave restore —
  get **matcher + cache hits only**; a backlog miss stays English (no shimmer,
  no generation burst over hundreds of historical lines). The shimmer + LLM
  fallback applies only to lines appended after the switch (the live turn
  onward). Switching back to `en`/`off` mid-drain abandons queued output
  generations (§6).

## 4. Corpus: extraction and data files

### Extraction (build-time tooling)

`scripts/extract-strings.mjs` decodes the complete string table from the
compiled story file (`zork1/COMPILED/zork1.z3` — vendored read-only; we only
read). Z-machine v3 string decoding (with abbreviation expansion) is ~100
lines; the output is every string the game can print, exactly as the bridge
receives it. Z-strings may contain embedded newlines (the banner is one
string, many displayed lines): the extractor **splits these so every emitted
entry — and therefore every committed corpus key — is a single normalized
display line**, the same unit the matcher sees (and the unit the inventory
gate, §7, compares against). It emits `scripts/out/zork1.strings.json`
(**gitignored** — the inventory is derived data). The vendored `.zil` source
is the cross-check and the mine for composing patterns (`TELL` fragments)
when curating templates.

### Committed data files (`src/translate/corpus/`)

1. **`zork1.fr.strings.ts`** — `Record<string, string>`: normalized English
   line → French. Room descriptions, static responses ("Done." → « Fait. »),
   death messages, the banner, and any irregular composition pinned as a full
   line (escape hatch, §5).
2. **`zork1.fr.objects.ts`** — object/room names with **pre-composed article
   forms**: `"glass bottle": { indef: "une bouteille en verre", def: "la
   bouteille en verre", bare: "bouteille en verre" }`. Gender lives entirely
   in data; there is no grammar code.
   **Input-lexicon alignment:** the player types what they read, so the
   French base noun phrases here are **sourced from the FR input lexicon**
   (`src/llm/lexicon/`), with articles/composition added on top; a round-trip
   gate (§7) asserts every form resolves through the input lexicon to the
   same canonical English object, so the display vocabulary and the input
   vocabulary cannot drift — at authoring time or during UAT hand-fixes.
3. **`zork1.fr.templates.ts`** — curated composing patterns with typed
   slots: `{ en: "There is a {obj} here.", fr: "Il y a {obj.indef} ici." }`,
   plus `{num}` and `{raw}` slots. `{num}` matches **signed** integers
   (`-?\d+`): Zork I scores go negative — death applies an unclamped
   `<SCORE-UPD -10>` (`1actions.zil:4058`, `gverbs.zil:1851`), so `-10` is a
   real status/score value. `{raw}` captures **verbatim** — no table lookup —
   for lines that quote the player's own token back (`I don't know the word
   "{raw}".` → « Je ne connais pas le mot "{raw}". »); without it these
   high-frequency parser replies would be unbounded misses (every typo and
   rejected passthrough noun a shimmer + an uncacheable one-off generation).
   Each template compiles once at load into a matcher (object alternation
   from the EN side of the objects file). Expected size for Zork I: ~50–150
   patterns.

**Normalization** (applied identically at table-generation time and runtime
lookup): collapse whitespace runs, trim. Case and punctuation are preserved —
they are part of string identity. A line's **leading-whitespace indent**
(nested listing structure: "The glass bottle contains:" / "  A quantity of
water") is split off before normalization/lookup and re-applied verbatim to
the translated text, so French listings keep their nesting.

### Open form keys (the DE/ES contract)

The forms record on object entries is an **open set of named keys per
language**, not a fixed `{indef, def}`. French ships `{indef, def, bare}`;
German will ship the case forms its templates reference (`nomIndef`,
`akkIndef`, `datDef`, …) with adjective declension inside the pre-composed
string. The matcher never interprets form names — a template references
`{obj.<key>}` and the data supplies it. **Implementation must not hard-code
French's key set** (tested, §7). A template only matches if every slot
resolves; a missing form key on a matched object is a miss, not a crash.

## 5. Runtime matcher

`src/translate/match.ts`, pure functions. Given a normalized English line:

1. **Exact** string-table hit → French. Runs first, so irregular
   compositions ("A quantity of water" → « De l'eau ») can be pinned as full
   lines and never reach templates.
2. **Templates**, tried in specificity order (most literal characters
   first, so `You can't see any {obj} here!` beats looser patterns), with
   `{obj}`-resolving templates tried **before** `{raw}` templates of the same
   shape — a known object gets its proper French form; only then does the
   verbatim capture apply. Every `{obj}`/`{num}` slot must resolve — an
   unknown object inside a known pattern is a miss (correctness over
   coverage; the fallback catches it) **unless** a `{raw}` variant of the
   pattern exists, in which case the verbatim match is a hit (no fallback
   fires). `{raw}` content substitutes as **plain text only** (a React text
   node — never markup, never into the LLM prompt path).
3. Otherwise `null` → miss.

A built-in listing template `"A {obj}" → "{obj.indef}"` (result capitalized)
covers every inventory/contents line, since the reducer delivers each listing
entry as its own `BufferLine`. Suffix parentheticals like "(providing
light)" are string-table entries composed as suffix templates.

### Status bar

`parseStatus()` continues to operate on English and is **untouched** — note
it yields the right side as a **raw string** (`right: "Score: 0   Moves: 1"`,
`src/glkote-react/reduce.ts`); nothing parses the numbers today, so the
translate layer parses them itself (**signed** — scores go negative, §4). At
display time the room name is looked up via the objects/strings tables, and
the parsed numbers are rendered through a French format string (« Score :
340  Coups : 470 »), preserving the existing layout/delimiter. On a room-name
miss **or an unparseable right side**, the status bar shows English (no
shimmer in a one-line bar), and the miss is logged like any other.

## 6. LLM fallback, cache, miss log

- **Shimmer:** a missed transcript line renders « …traduction » in place of
  its text.
- **Cache first:** before showing a shimmer, consult a new IndexedDB store
  keyed by `(game, language, normalized English)`. A hit resolves
  synchronously-ish with no generation.
- **Single-flight queue:** one generation at a time, FIFO (misses are rare
  by design). The prompt is a literal-translation instruction — translate
  exactly, no commentary, no invented state (same philosophy as the input
  layer's literal prompt); plain-text output, no grammar constraint.
- **Shared-engine arbitration: input preempts output.** There is one WebLLM
  engine and two consumers; the input pipeline's translation requests always
  run before queued output generations at a shared single-flight gate (an
  in-flight output generation is never aborted, merely not followed while an
  input request waits). Output misses cluster exactly when the player wants
  to type next; input latency is felt, a shimmering line is by design
  tolerable. The output queue **abandons pending generations** on a switch to
  `off`/`en` and on story swap, mirroring the input layer's drain semantics
  (`c7e56dd`).
- **Engine API change (touches the input layer's seam):** `LlmEngine.generate()`
  currently *requires* a grammar (`src/llm/types.ts`), and the WebLLM impl
  always sends `response_format: { type: 'grammar', … }`. The shared
  interface grows a grammar-free path (optional `grammar` or a
  `generateText()` method), with `engine.fake.ts` updated in step — this
  feature is not buildable inside `src/translate/` alone.
- **On success:** update the overlay, write the cache, log the miss (it
  still represents a corpus gap).
- **On failure** (engine unavailable, model still loading, generation error,
  watchdog timeout): the line falls back to **English** rather than
  shimmering forever — a visible English line beats a stuck UI — and the
  failure is logged.
- **Miss log:** every table miss (string, template-with-unresolved-slot,
  status room name) goes to a capped localStorage ring buffer with the
  English text and turn context, surfaced via a dev affordance
  (`window.loquorMisses()` returning a copy-pastable list) so UAT sessions
  can dump it straight into the notes. This is the corpus-improvement loop.
- **Accepted injection surface (documented, not new):** game lines can quote
  player-typed tokens back (the §4 `{raw}` class that *doesn't* match a
  template), so player-influenced text can reach the fallback prompt — the
  same low-stakes class the input layer accepts. The literal prompt invites
  no action, output renders as plain text, and the worst case is a weird
  cached translation on the player's own device.

## 7. Testing

TDD throughout (red → green → refactor; frequent small commits).

1. **Matcher units:** normalization (incl. indent split/re-apply); exact
   hits; template specificity ordering; every-slot-must-resolve; `{obj}`
   tried before `{raw}` for the same shape; `{raw}` verbatim capture as plain
   text; the built-in listing template; capitalization; signed `{num}` slots;
   **open-form-keys contract** via a fake language with case forms (so French
   can't hard-code `{indef, def}`).
2. **Overlay/hook:** scripted ViewStates — `input`/`nl-source` untouched;
   memoization across `append` merges; `en`/`off` passthrough; the backlog
   rule (switch/restore lines are matcher-only, live lines shimmer); shimmer
   → resolved → cached transitions with a fake engine; failure → English +
   logged; input-preempts-output ordering at the shared engine gate.
3. **Coverage gate (the big one):** run the full Zork I walkthrough
   transcript through the matcher and assert **zero misses on the golden
   path**. The prerequisite capture is a **workstream, not existing
   infrastructure**: the capture harness grows a **seeded-RNG mode** — ifvms
   rolls all randomness through `Math.random`
   (`ifvms.js/src/zvm/runtime.js`), so the Node harness patches it
   deterministically (the vendored directory is never edited) — plus a
   committed **walkthrough command script** (~350+ commands; troll/thief
   combat is random, so iterate seed + script until a run completes). The
   captured English transcript is committed as a **fixture**; CI runs the
   matcher over the fixture (no replay), staying fast and deterministic.
   This is "instant is required" as an executable test; corpus regressions
   fail CI.
4. **Inventory gate (cheap second net):** every line-shaped entry in the
   extracted `zork1.strings.json` (per-display-line, §4) must match the
   string table or a template — catches corpus drift on lines the golden
   path never visits (death messages, off-path responses). It cannot
   validate *composed* lines; that is the walkthrough gate's job.
5. **Lexicon round-trip gate:** every French form in `zork1.fr.objects.ts`
   (articles stripped per the existing lexicon fold rules) must resolve
   through the FR input lexicon to the same canonical English object — the
   player types what they read, so display and input vocabularies must not
   drift. Same philosophy as the generated lexicon gates (`2044080`).
6. **Status bar + miss log:** French formatting; signed scores (`-10` after
   an early death); English fallback on unknown room or unparseable right
   side; ring-buffer capping.

Plus the established UAT loop: play in French, dump `window.loquorMisses()`,
feed the corpus.

## 8. Follow-ups (out of scope here)

- **German & Spanish corpora** (data-only: new form-key vocabularies + tables).
- **Zork II/III corpora** (rerun extraction; new tables; same matcher).
- **App chrome i18n** (separate effort).
- **Echo-hiding polish toggle** (hide/restyle the English canonical echo).
- **Self-hosting model weights** (pre-existing follow-up; unchanged).
