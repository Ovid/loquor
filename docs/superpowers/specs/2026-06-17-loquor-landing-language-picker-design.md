# Loquor — Landing language picker + honest how-to copy (design)

**Date:** 2026-06-17
**Status:** Approved (brainstorm), pending implementation plan
**Scope:** `src/ui/Landing.tsx` and supporting data/tests. No engine, NL-pipeline,
or in-game-picker behavior changes.

## Problem

The title screen (`src/ui/Landing.tsx`) does two things that hurt the player:

1. **The how-to copy describes only canonical two-word Zork commands** ("Type
   what you want to do, the way the game expects it." + `look · go north · open
   mailbox · take lamp · read leaflet · inventory`). This hides Loquor's headline
   feature — you can type in plain language, in four languages, and chain
   actions — and implies a two-word ceiling that doesn't exist.
2. **There is no way to choose a language before entering the game.** Language is
   only selectable from the in-game status-bar picker (`NlLanguagePicker`), so a
   non-English player must start an English-framed game, find the picker, and
   switch. The choice belongs on the title screen, next to the game choice.

Loquor must also be honest and legally clear on the title screen: the richer
free-form understanding is an **optional, experimental, third-party model
download** (it may not support every language), and the Zork **name** is a
trademark even though the **game code** is open source.

## What we are building

A revised landing plate with: honest plain-language how-to copy, **localized
live examples**, a **language picker** that sets the player's language
preference, a **one-line model caveat** under the picker, and a **trademark /
open-source footnote**.

### Locked decisions (from brainstorm)

- **Picker is set-preference-only.** Picking a language writes the existing
  `nlpref` localStorage preference; it does **not** trigger the model download on
  the landing. The in-game flow (`useModelDownload`) already reads `readNlPref()`
  on boot and restores the language, and still owns the one-time download/upgrade
  offer. No NL state is hoisted into `App`.
- **Examples: one set per language** (EN/FR/DE/ES), **game-independent** (not
  per-game). Game-independent matches today's behavior (the landing already shows
  the same examples regardless of selected volume) and avoids a 12-set matrix.
- **Caveat: one wording for all languages.** Per-language nuance is handled by
  the in-game notices once playing.

## Copy (final wording)

**How-to block** (replaces the current `.howto` contents):

> **How to play.** Type what you want to do in plain language.
> *‹localized examples — see below›*
> Your progress is kept; close the tab and return whenever you like.

The third line is unchanged. The examples line is **live**: it renders the set
for the currently-selected language (English when the selection is `off` or
`en`).

**Model caveat** (directly under the language picker, one wording for all):

> Basic commands work now. To understand more of what you type, you can add an
> optional, experimental model — a one-time download that may not support every
> language.

"Basic commands" intentionally echoes the picker's existing "· basic" mode
vocabulary.

**Footnote** (bottom of the plate, muted, real text — not a tooltip):

> Zork is a trademark of Activision Publishing, Inc. (a Microsoft company); the
> name and brand are not licensed here. The Zork I–III game code was released by
> Microsoft under the MIT License in 2025 — this project plays those open-source
> games.

Factual basis: Microsoft released the Zork I/II/III **source code** under the MIT
License on 2025-11-20; the grant is code-only and explicitly **excludes
trademarks/brands**, which remain with the owner (Activision, a Microsoft
company).

## Examples (data + correctness gate)

Examples are **data**, one ordered array per language, each entry a single
example command string. Each set deliberately dispels the "two words only"
impression by including:

1. one command with an **article + multi-word object** (e.g. EN `open the small
   mailbox`),
2. one **compound** command (e.g. EN `take the lantern and go east`),
3. one short **single verb** (e.g. EN `look`).

FR/DE/ES sets are the natural-language equivalents using each language's own
words and connectors (`et`/`puis`, `und`/`dann`, `y`).

**Player-first correctness gate (mandatory test).** A shown example must never
fail the player who types it verbatim. The default mode on entry is **basic
(grammar-only)**, so a test runs **every example string** through `splitClauses`
and validates each clause the way that clause is actually handled at runtime, for
**Zork I, II, and III**:

- **FR/DE/ES** go through the real deterministic path — `parseDirection`, then
  `parseLexicon` against each game's extracted vocab + the language's lexicons —
  and each clause must yield a **command, not a miss**.
- **English has no lexicon**, so in basic mode a non-direction English clause
  abstains and is **raw-sent to Zork's own parser** (it never reaches
  `parseLexicon`). The faithful check is therefore that each English clause is a
  direction *or* is composed entirely of **real game words** (vocab verbs,
  movement, prepositions, noun surface forms, plus articles/conjunctions).

Examples are game-independent, so they must pass for all three games. This
mirrors the existing corpus-coverage / round-trip gating pattern.

**Note on example richness (accepted limitation):** under the game-independent
constraint, no multi-word noun phrase resolves across all three games (the only
universal object is the lamp, and multi-word lamp phrasings resolve only in Zork
I). The examples therefore dispel the "two-word ceiling" via a **natural
compound** (object + movement) rather than a multi-word noun phrase. Single-word
objects are accepted; revisit only if examples ever go per-game.

Rationale this is safe: basic mode already handles articles (the parser drops
leading articles `le`/`la`/`der`/`el`/`the`), multi-word objects, and compound
clauses (the conjunction set `and|then|et|puis|ensuite|und|dann|danach|y` is
recognized). The optional model only **adds** capability, so a basic-mode-valid
example is valid in every mode.

## Language picker

Reuse the option list, render it landing-native:

- **Shared options:** export the existing `OPTIONS` array from
  `src/ui/NlLanguagePicker.tsx` (Off / English / Français / Deutsch / Español,
  each with its `lang` attribute) and consume it in both places — one source of
  truth so the two pickers can't drift.
- **Form:** a **radiogroup** following the same WAI-ARIA pattern already used by
  the "choose your descent" volumes in `Landing.tsx` (roving `tabindex`, arrow
  keys cycle selection+focus, `role="radiogroup"` named by a visible label,
  `lang` per option for screen-reader pronunciation). **Not** a native `<select>`
  (rejected project-wide for theming) and **not** the in-game combobox (it is
  wired to NL phases / download chips that don't exist pre-game).
- **Default selection:** `readNlPref().language` — a returning player sees their
  saved choice; a first-timer sees `Off`.
- **Commit on entry:** the "Light the lamp →" handler calls
  `writeNlPref({ language: selected })` before `onEnter(slug)`. The in-game NL
  hook restores it on boot. (The in-game picker remains for mid-game changes; it
  already writes the same pref.)

### Placement (plate order)

1. title / tagline (unchanged)
2. how-to block (revised copy + localized examples)
3. **language picker** (new) + **model caveat line** (new)
4. "— choose your descent —" game radiogroup (unchanged)
5. "Light the lamp →" (unchanged; now also persists language)
6. resume hint / load error (unchanged)
7. **trademark / open-source footnote** (new)

## Accessibility (hard requirement)

- **Language picker:** keyboard-operable radiogroup with correct
  `role`/`aria-checked`/roving `tabindex`, a visible label and visible focus
  indicator, `lang` on each foreign option. Add a test asserting the accessible
  name/role of the group and options (the picker suite's
  `getByRole('radio', { name })` pattern).
- **Live examples:** the examples region is `aria-live="polite"` so swapping the
  language announces the new examples to assistive tech rather than silently
  mutating the DOM.
- **Caveat + footnote:** real text in semantic elements, meeting WCAG 2.2 AA
  contrast in **both** themes; any state cue is not color-only.
- The picker, caveat, and footnote also render inside the in-game "Change story"
  overlay variant of `Landing` (it reuses the same component). The picker must
  remain operable there and inside the focus trap; the footnote/caveat are static
  text and need no special handling.

## Out of scope (YAGNI)

- Per-game examples (one set per language only).
- Triggering the model download from the landing (set-preference-only).
- Per-language caveat wording.
- Localizing the static how-to/footnote prose (English UI chrome; only the
  in-game-style **examples** localize). Revisit if/when the whole UI is localized.
- Changing the in-game `NlLanguagePicker` behavior (only its `OPTIONS` export is
  shared).

## Testing

- **Examples correctness gate** (above): every example, every language, parses to
  a command under basic mode for Zork I–III.
- **Picker → pref:** selecting a language and pressing "Light the lamp" writes
  the expected `nlpref`; default selection reflects a pre-seeded `nlpref`.
- **Live examples:** changing the selected language swaps the rendered example
  set (and English shows for Off/`en`).
- **a11y:** radiogroup/option roles and accessible names; `aria-live` on the
  examples region; footnote/caveat are present as text.
- Existing Landing tests updated for the new copy/structure; output stays
  pristine (no stray console output, no `act` warnings).
