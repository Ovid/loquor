# Loquor Output Translation — Design (v1: Zork I × French)

**Date:** 2026-06-10
**Status:** Approved (brainstormed with Ovid; supersedes nothing — extends the
NL multilingual design, `2026-06-09-loquor-nl-multilingual-design.md`, which
explicitly deferred output translation in its non-goals)

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

## 4. Corpus: extraction and data files

### Extraction (build-time tooling)

`scripts/extract-strings.mjs` decodes the complete string table from the
compiled story file (`zork1/COMPILED/zork1.z3` — vendored read-only; we only
read). Z-machine v3 string decoding (with abbreviation expansion) is ~100
lines; the output is every string the game can print, exactly as the bridge
receives it. It emits `scripts/out/zork1.strings.json` (**gitignored** — the
inventory is derived data). The vendored `.zil` source is the cross-check and
the mine for composing patterns (`TELL` fragments) when curating templates.

### Committed data files (`src/translate/corpus/`)

1. **`zork1.fr.strings.ts`** — `Record<string, string>`: normalized English
   line → French. Room descriptions, static responses ("Done." → « Fait. »),
   death messages, the banner, and any irregular composition pinned as a full
   line (escape hatch, §5).
2. **`zork1.fr.objects.ts`** — object/room names with **pre-composed article
   forms**: `"glass bottle": { indef: "une bouteille en verre", def: "la
   bouteille en verre", bare: "bouteille en verre" }`. Gender lives entirely
   in data; there is no grammar code.
3. **`zork1.fr.templates.ts`** — curated composing patterns with typed
   slots: `{ en: "There is a {obj} here.", fr: "Il y a {obj.indef} ici." }`,
   plus `{num}` slots (score line, etc.). Each template compiles once at load
   into a matcher (object alternation from the EN side of the objects file;
   numbers as `\d+`). Expected size for Zork I: ~50–150 patterns.

**Normalization** (applied identically at table-generation time and runtime
lookup): collapse whitespace runs, trim. Case and punctuation are preserved —
they are part of string identity.

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
   first, so `You can't see any {obj} here!` beats looser patterns). Every
   slot must resolve — an unknown object inside a known pattern is a miss
   (correctness over coverage; the fallback catches it).
3. Otherwise `null` → miss.

A built-in listing template `"A {obj}" → "{obj.indef}"` (result capitalized)
covers every inventory/contents line, since the reducer delivers each listing
entry as its own `BufferLine`. Suffix parentheticals like "(providing
light)" are string-table entries composed as suffix templates.

### Status bar

`parseStatus()` continues to operate on English (score/moves parsing and the
scene tracker are untouched). At display time the room name is looked up via
the objects/strings tables, and the right side is rendered from the
already-parsed numbers through a French format string (« Score : 340  Coups :
470 »), preserving the existing layout/delimiter. On a room-name miss the
status bar shows English (no shimmer in a one-line bar), and the miss is
logged like any other.

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

## 7. Testing

TDD throughout (red → green → refactor; frequent small commits).

1. **Matcher units:** normalization; exact hits; template specificity
   ordering; every-slot-must-resolve; the built-in listing template;
   capitalization; `{num}` slots; **open-form-keys contract** via a fake
   language with case forms (so French can't hard-code `{indef, def}`).
2. **Overlay/hook:** scripted ViewStates — `input`/`nl-source` untouched;
   memoization across `append` merges; `en`/`off` passthrough; shimmer →
   resolved → cached transitions with a fake engine; failure → English +
   logged.
3. **Coverage gate (the big one):** run the full Zork I walkthrough
   transcript (captured English lines via the existing capture harness)
   through the matcher and assert **zero misses on the golden path**. This is
   "instant is required" as an executable test; corpus regressions fail CI.
4. **Status bar + miss log:** French formatting; English fallback on unknown
   room; ring-buffer capping.

Plus the established UAT loop: play in French, dump `window.loquorMisses()`,
feed the corpus.

## 8. Follow-ups (out of scope here)

- **German & Spanish corpora** (data-only: new form-key vocabularies + tables).
- **Zork II/III corpora** (rerun extraction; new tables; same matcher).
- **App chrome i18n** (separate effort).
- **Echo-hiding polish toggle** (hide/restyle the English canonical echo).
- **Self-hosting model weights** (pre-existing follow-up; unchanged).
