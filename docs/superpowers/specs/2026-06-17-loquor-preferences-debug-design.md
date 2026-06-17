# Loquor: preferences panel, debug echo, menu-bar polish

**Date:** 2026-06-17
**Status:** Design (approved for planning)
**Scope:** A small, self-contained UI change. Three related pieces: (1) a debug
preference that controls how natural-language-translated turns appear in the
transcript, (2) a preferences modal that houses the debug toggle, (3) two
menu-bar consistency fixes.

## Problem

1. **The translated command leaks into the transcript.** When a player types a
   non-English command (e.g. Spanish `arriba`), the NL layer injects a UI-only
   `nl-source` line (`you arriba`) and then sends the canonical English command
   (`up`) to the VM, which echoes its own `> up`. The player sees **both**:

   ```
   you arriba

   > up
   ```

   For an ordinary player, `> up` is noise — they typed Spanish and don't need
   to see the English the game actually ran. It should be hidden by default and
   only shown when the player deliberately turns on a debug view.

2. **The `you` label is easy to misread.** In `you arriba` the bare `you` reads
   as the first word of the input rather than a label, so even in debug view the
   distinction between "what you typed" and "the label" is muddy.

3. **Menu-bar inconsistency.** The `Language:` text label is redundant in front
   of the picker, and the "Change story" button uses a different down-caret
   glyph (`⌄`, U+2304) and placement than the language picker's trailing `▾`
   (U+25BE).

## Non-goals

- No change to what is sent to the VM or to translation. **The input path is
  touched minimally:** the bridge/NL send seam gains a flag so canonical sends
  can be tagged (see Architecture §1) — this is the only input-side change, and
  it alters *labelling*, not *what command runs*. (Originally a non-goal; revised
  to fix the compound-command leak below.)
- No new settings beyond the debug toggle. The panel is the home for future
  settings but ships with exactly one.
- No relocation of the theme toggle or language picker into the panel (they stay
  in the status bar).

## Behavior

### Debug preference

A new boolean preference, **debug**, **default `false`**, persisted to
`localStorage`. It is purely a display concern: it changes how already-captured
transcript lines render, so toggling it re-renders history live with no replay.

**What counts as a "translated turn."** A turn gets the `nl-source` +
`nl-canonical` treatment **iff `echoLocal` fired** for it — i.e. some clause was
produced by a `TRANSLATED_STAGES` stage and was not an English identity echo
(the exact gate at `translatePipeline.ts:709`). This — not "the command looks
different" — is the definition the implementation keys off, so the two can't
drift. Ordering invariant: the single `nl-source` line is emitted at the **first**
such clause, so it always precedes that turn's canonical echo(es). A turn whose
first clause is a non-translated stage (meta/alias) but whose later clause *is*
translated still emits the `nl-source` line at the translated clause — the
earlier meta echo stays a plain `input` line ahead of it.

Per NL-translated turn (original `arriba` → canonical `up`):

| Line | Debug OFF (default) | Debug ON |
| --- | --- | --- |
| original (`arriba`) | `> arriba` | `‹you› arriba` (pill, see below) |
| canonical echo(es) (`up`) | *not rendered* | `> up` |

**Compound commands.** `echoLocal` fires **once** per compound (one `nl-source`
line for `ve al norte y coge la lámpara`), but the VM echoes **each** canonical
clause (`> north`, then `> take lamp`). All of those echoes must be tagged
`nl-canonical` so debug-OFF hides the whole set — not just the first. The
buffer-position heuristic (tail is `nl-source`) only catches the first echo;
later clauses land after intervening room output, so canonical-ness is marked at
the **send seam** instead (see Architecture §1).

A turn that produced **no** translation — English identity passthrough, vocab
passthrough, NL off, or a directly-typed command (`echoLocal` did not fire) —
emits no `nl-source` line and is unaffected: its `> …` echo shows in both modes,
exactly as today.

### The `you` pill (debug-on only)

In debug view, replace the bare `you` text with a small inline **pill/badge**:
the pill's background is the current theme's foreground colour and its text is
the current theme's background colour (an inversion). Because it swaps an
fg/bg pair the theme already ships at WCAG 2.2 AA, the inverted pill keeps the
same contrast ratio in both themes. The pill shape + padding is a non-colour
cue, so the label is distinguishable without relying on colour. The label stays
`lang="en"` (it is the English word "you" regardless of game language) and
remains decorative-ish text inside the line, not an interactive control.

### Preferences panel

- A new **`⚙` button** is added to the status bar, between the language picker
  and the theme toggle. It has `aria-label="Preferences"` (localized) and a
  visible focus indicator, and is keyboard-operable like the other `.sw`
  buttons.
- Activating it opens a **modal dialog** that **reuses the existing modal
  chrome and focus management**: the `.modal-backdrop` / `.modal` markup and
  classes from `ModelDownloadModal`, `role="dialog"` + `aria-modal="true"` +
  `aria-labelledby`, and the shared `useFocusTrap` hook (traps Tab, moves focus
  in on open, restores focus to the `⚙` opener on close, routes Escape to
  close). While it is open the status bar is marked `inert` (the existing M9
  pattern used for the download modal / change-story overlay).
- Contents: a single labelled control — a checkbox (or switch) named **Debug
  mode** with helper text *"Show translated commands (e.g. `> up`) in the
  transcript."* and a close/done affordance. The checkbox's accessible name is
  the visible label; the helper text is associated via `aria-describedby`.
- The panel copy is **localized in EN/FR/DE/ES**, mirroring the `COPY` record in
  `ModelDownloadModal.tsx`, and rendered in the active NL language when one is
  selected, falling back to English (debug is available even when NL is off or
  English).

### Menu-bar polish

- **Remove** the visible `Language: ` text in `NlLanguagePicker.tsx`. The
  underlying `LanguageCombobox` keeps `aria-label="Language"`, so the picker's
  accessible name is unchanged — no a11y regression.
- **Change story** (`StatusBar.tsx`): drop the leading `⌄` (U+2304) and render
  the button as `Change story ▾` using the **same trailing `▾` (U+25BE)** as the
  language picker, kept `aria-hidden="true"` (decorative).

## Architecture

All work is in the display layer (`src/glkote-react/reduce.ts`, `src/ui/**`,
`src/storageKeys.ts`, `src/ui/components.css`). The VM, Glk bridge input path,
and NL pipeline are untouched.

### 1. A new line kind: `nl-canonical`, marked at the send seam

Today the VM-echoed canonical command lands as a normal `input` line right after
the `nl-source` tail (see the review-I3 comment at `reduce.ts:64-82`: the echo is
pushed as a **new** line rather than merged onto the `nl-source` line). To let
the renderer tell a *translated* command echo apart from a normally-typed
command, that echo line is tagged with a new `BufferLine['kind']` value
**`nl-canonical`**.

A buffer-position heuristic ("the tail is an `nl-source` line") is **not enough**:
it tags only the *first* echo of a translated turn, so a compound command leaks
its 2nd..n canonical echoes in debug-OFF (the very leak this spec exists to fix).
Canonical-ness is a property of *how the command was sent* (the NL pipeline's
`sendTracked`), not of buffer position — so we mark it at the send seam:

- **types.ts:** add `'nl-canonical'` to the `BufferLine['kind']` union.
- **Send seam (bridge / NL pipeline):** `sendTracked` (and the single-command
  send) marks its send as *canonical* for the duration of the translated turn
  — from the first `echoLocal`-firing clause until the turn ends. The bridge
  carries a small "next echoed input is canonical" flag that the reducer reads
  when it converts an echoed `input` paragraph, so **every** canonical echo in
  the turn (including compound clauses 2..n that land after room output) is
  classified `nl-canonical`. Directly-typed commands and non-translated turns
  leave the flag clear and stay `input`. This is a labelling-only change: the
  command sent to the VM is identical.
- **reduce.ts:** when `bufferParagraphs` pushes an echoed `input` paragraph whose
  send was flagged canonical, assign `nl-canonical` instead of `input`. Like
  `nl-source`, this kind is **carried inertly** across subsequent updates
  (preserved via `prev.kind`, not reclassified), so it survives later appends the
  same way `nl-source` does. No other line is affected.

### 2. Threading the debug flag and rendering

- **storageKeys.ts:** add `debug: 'loquor.debug'` to `LS_KEYS`.
- **A `useDebug` hook** (mirrors `useTheme.ts`): `[debug, toggle]`, reading a
  validated boolean from `localStorage` (default `false`), writing on change,
  wrapped in try/catch for blocked/quota'd storage.
- **Scrollback.tsx** gains a `debug?: boolean` prop. Rendering rules:
  - `nl-canonical` lines: rendered like `input` (`> {text}`) when `debug`,
    **filtered out entirely** when not (so screen readers don't announce the
    hidden `> up`).
  - `nl-source` lines: rendered as the `‹you›` pill + text when `debug`;
    rendered as a command line (`> {text}`, the `.echo`/caret styling) when not.
  - All other kinds: unchanged. The existing bare-`>` filter stays.
  - **Toggle does not flood the live region.** Flipping debug ON inserts every
    previously-hidden `nl-canonical` line (and re-renders `nl-source` lines from
    `> arriba` to the pill) into the `role="log"` / `aria-live="polite"` /
    `aria-relevant="additions"` transcript at once — which a screen reader would
    otherwise announce as a burst of historical commands. The toggle is a
    deliberate settings action, not new game output, so the bulk re-render must
    **not** be announced: suppress the live region across the toggle commit
    (e.g. set `aria-live="off"` for that render, then restore) so only genuine
    subsequent game output is announced. Flipping OFF needs no guard
    (`aria-relevant="additions"` ignores removals).
- **Terminal.tsx** owns the `useDebug` state, passes `debug` to `Scrollback`,
  renders the `⚙` button (passed into `StatusBar` alongside the existing
  toggles) and the new `PreferencesModal`, and toggles the status bar's `inert`
  while the modal is open (same wiring as the download modal).
- **StatusBar.tsx** accepts the `⚙` control as a node (like `themeToggle` /
  `nlToggle`) and renders it between the picker and theme toggle; updates the
  "Change story" glyph.

### 3. `PreferencesModal.tsx` (new)

A small component modelled on `ModelDownloadModal.tsx`: `open` / `onClose`
props, a localized `COPY` record (`heading`, `debugLabel`, `debugHelp`,
`close`), the `useFocusTrap` hook, the `.modal-backdrop`/`.modal` chrome, and a
controlled checkbox bound to the `debug` value.

## Error handling / edge cases

- **Storage unavailable:** `useDebug` defaults to `false` and silently no-ops on
  write (same contract as `useTheme`).
- **Corrupt persisted value:** validated on read; anything other than the
  truthy sentinel is treated as `false`.
- **Live toggle:** because debug only affects rendering of persisted
  `ViewState` lines, flipping it updates the transcript immediately with no
  re-fetch or replay. The live region is suppressed across that commit so the
  bulk re-render is not announced (see Scrollback rendering rules above).
- **Compound / mixed-stage turns:** all canonical echoes of a translated turn
  are tagged `nl-canonical` via the send-seam flag (Architecture §1), so
  debug-OFF hides every clause, not just the first. A turn that mixes a
  non-translated clause (meta/alias) with a translated one emits its `nl-source`
  line at the translated clause; the earlier meta echo stays a plain `input`
  line.
- **A pathological `nl-source` whose text is literally `>`:** already handled by
  the kind-aware bare-`>` filter in `Scrollback` (review S13); unaffected.

## Testing

- **reduce.ts / send seam:** an NL-translated turn tags the canonical echo as
  `nl-canonical`; the tag persists across a following update; a directly-typed
  or passthrough command stays `input`; an English-identity passthrough emits no
  `nl-source` and no `nl-canonical`.
- **Compound commands:** a multi-clause translated turn (one `nl-source`, two
  canonical sends) tags **both** echoes `nl-canonical`, so debug-OFF hides both
  `> north` and `> take lamp` (regression guard for the leak this spec fixes).
- **Mixed-stage compound:** a turn whose first clause is meta/alias and whose
  later clause is translated emits the `nl-source` line at the translated clause;
  the earlier meta echo remains a plain `input` line.
- **Scrollback:** debug-off renders `> arriba` and omits the `> up` line;
  debug-on renders the `‹you›` pill and the `> up` line; flipping the `debug`
  prop re-renders without any new line data.
- **Live region on toggle:** flipping debug ON does not enqueue the historical
  `nl-canonical` lines as live-region additions (the region is suppressed across
  the toggle commit), while subsequent genuine game output still announces.
- **a11y:**
  - the `⚙` button resolves by `getByRole('button', { name: /preferences/i })`;
  - the modal traps focus, restores focus to the opener on close, and closes on
    Escape (reusing the `useFocusTrap` guarantees, asserted as in the existing
    modal/focus-trap suites);
  - the debug checkbox resolves by its accessible name and reflects/persists
    state;
  - after removing the `Language:` text, the picker still resolves by
    `getByRole('combobox', { name: 'Language' })` (regression guard);
  - the "Change story" button still resolves by name with the glyph
    `aria-hidden`.
- **Persistence:** the debug pref round-trips through `localStorage` and tolerates
  storage throwing.
- **Localization:** the panel copy is present for EN/FR/DE/ES (parallels the
  `ModelDownloadModal` copy test).

## Out of scope / future

- Additional preferences (the panel is built to grow, but YAGNI for now).
- Moving theme/language into the panel.
