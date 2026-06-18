# Agentic Code Review: ovid/todo-features

**Date:** 2026-06-17 20:04:29
**Branch:** ovid/todo-features -> main
**Commit:** afd61b949f8ee7d15b5ed310fad29bcdb8898615
**Files changed:** 32 (25 code) | **Lines changed:** +2947 / -124 (code ~ +1008 / -92; rest docs/notes/image)
**Diff size category:** Large (code portion Medium)

## Executive Summary

This branch implements the "preferences panel + debug echo + menu-bar polish" spec: a `debug`
display preference, a new `nl-canonical` line kind for translated command echoes (hidden in
debug-off), a `PreferencesModal`, and menu-bar tweaks — plus an _unplanned but justified_ autosave
round-trip that carries the rendered transcript so NL line kinds survive a page reload. The plan is
implemented faithfully and the a11y/localization work is solid. No critical or security issues.
The highest-value finding is **F4**: the autosave fix now serializes the entire, ever-growing
transcript to IndexedDB on **every turn**, with no scrollback cap — a real perf/storage regression
on long playthroughs. Two more Important items concern a spec/code conflict on `alias` echoes (F1)
and an empty-array gap in the restore validator (F2).

## Critical Issues

None found.

## Important Issues

### [I1] Autosave serializes the entire transcript on every turn (unbounded growth)

- **File:** `src/glkote-react/bridge.ts:203-213` (`save_allstate`)
- **Bug:** `save_allstate()` now returns `lines: this.view.lines` in full (was `{ metrics }` only).
  Native autosave fires at **every** line-input turn boundary (`engine.ts:147` `do_vm_autosave:true`
  → `vendor/glkote/glkapi.js:786-795`), and there is **no scrollback cap** anywhere (no `slice` /
  max-lines in `reduce.ts`, `types.ts`, or `Terminal.tsx`). So each command re-serializes an
  ever-growing `BufferLine[]` into the VM snapshot written to IndexedDB.
- **Impact:** O(transcript) serialization latency on the hot turn-boundary path and O(transcript)
  storage that grows without bound for the life of a game — progressively slower autosaves and
  IndexedDB quota pressure on long playthroughs. A slow/failing autosave is player-visible (CLAUDE.md
  "talk to me first" territory).
- **Suggested fix:** Cap the carried lines to a recent tail, or persist only the lines whose kind is
  `nl-source` / `nl-canonical` (the only kinds the VM buffer replay can't reproduce) plus enough
  context to re-key. Older lines reduce fine from the VM's own buffer on resume.
- **Confidence:** High (90)
- **Found by:** Error Handling, Contract & Integration, Verifier

### [I2] `alias`-stage echoes are hidden in debug-off, contradicting the spec

- **File:** `src/llm/translatePipeline.ts:122-127` (`TRANSLATED_STAGES`) vs `:723-744`
- **Bug:** `alias` is a member of `TRANSLATED_STAGES`. For a non-English language an alias clause
  (e.g. ES `inventario` → `inventory`) computes `translated = true`, sends via `sendCanonical`, and
  its echo is tagged `nl-canonical` → **hidden in debug-off** (`Scrollback.tsx:49`). The spec says a
  meta/**alias** clause's echo "stays a plain `input` line" (visible) — design doc lines 63-65,
  217-219, 232-234. (`meta` is _not_ in `TRANSLATED_STAGES` and correctly stays `input`; the conflict
  is alias-specific. This refines the plan-alignment reviewer's "meta stays plain" claim, which holds
  only for `meta`.)
- **Impact:** Spec/code divergence on the exact behavior this feature controls. Arguably the
  debug-off result (player sees their own `> inventario`, the English `> inventory` hidden) is _better_
  for the player — which is why this is a clarify-then-decide item, not a clear defect. Existing tests
  assert the command text but do **not** pin debug-off visibility either way.
- **Suggested fix:** Decide intended behavior. If alias echoes should stay visible, pass
  `canonical=false` for alias clauses (keep the nl-source echo, send via `sendLine`); if hidden is
  intended, correct the spec text and the mixed-stage test expectation. Per CLAUDE.md, worth a quick
  product conversation since it's a player-facing labelling call.
- **Confidence:** Medium-High (85)
- **Found by:** Logic & Correctness, Verifier (adjudicated against Plan Alignment)

### [I3] Empty `lines: []` passes restore validation and blanks the transcript

- **File:** `src/glkote-react/bridge.ts:154`
- **Bug:** `restore.lines.every(isBufferLine)` returns `true` for an empty array (`[].every() === true`),
  so an `autorestore` blob with `lines: []` is "trusted" and replaces the reducer-built view with zero
  lines — clearing the transcript on resume. There is no `length > 0` guard. The `nextId` clamp also
  degenerates (no per-line term) in this case.
- **Impact:** The S2 guard's stated contract ("on any miss fall back to the reducer-built view") is not
  honored for the empty case; a snapshot saved at a no-output moment, or a future schema emitting `[]`,
  silently wipes the screen instead of falling back. Production `save_allstate` writes non-empty lines
  at a turn boundary, so likelihood is low — but it's a genuine gap in defensive code that exists
  precisely to defend an unversioned blob.
- **Suggested fix:** `Array.isArray(restore.lines) && restore.lines.length > 0 && restore.lines.every(isBufferLine)`.
- **Confidence:** Medium-High (85)
- **Found by:** Logic & Correctness, Error Handling, Verifier

## Suggestions

- **[S1] Validate `nextId` is a finite number on restore.** `src/glkote-react/bridge.ts:162` —
  `restore.nextId ?? 0` guards only null/undefined; a string/NaN from a corrupt blob flows into
  `Math.max` → NaN poisons all subsequent ids/React keys. Add `Number.isFinite` / `typeof === 'number'`.
  Fold into the I3 hardening. (Verifier 72)
- **[S2] Reject duplicate `id`s among restored lines.** `src/glkote-react/bridge.ts:154` — per-element
  `isBufferLine` doesn't check cross-element uniqueness; duplicate ids → duplicate React keys. Same
  corrupt-blob-only reach as S1; fold into the same validation fix. (Verifier 68)
- **[S3] `aria-live` toggle suppression lacks a lines-identity guard.** `src/ui/Scrollback.tsx:33-38,74` —
  if a debug toggle and a genuine new game-output line commit in the same React batch, the new line
  renders under `aria-live="off"` and isn't announced. Rare (different trigger sources; next real-output
  render restores `polite`), but per CLAUDE.md's a11y bar, gate suppression on "debug toggled AND lines
  identity unchanged." (Verifier 62)
- **[S4] Reset `canonicalEcho` after the reducer consumes it (latent).** `src/glkote-react/bridge.ts:80,138,242` —
  the flag is cleared only by `sendLine`; resetting it in `update()` right after `reduce()` would make it
  a true one-shot tied to the send→echo pair instead of an open-lifetime latch, hardening against any
  future input-styled echo that arrives without a preceding send. No live bug today (every turn ends
  through `sendLine`/`sendCanonical`). (Verifier downgraded to latent, 45 — included as defensive note)
- **[S5] Doc drift.** The design doc's Architecture preamble (lines 132-133) still says "the Glk bridge
  input path … [is] untouched," which contradicts its own §1 (and this branch, which adds
  `sendLineCanonical` + the `canonicalEcho` flag). The `engine.ts` boot autosave doc block doesn't
  mention the now-serialized transcript. Reconcile so future readers don't trust the stale claim.

## Plan Alignment

Design: `docs/superpowers/specs/2026-06-17-loquor-preferences-debug-design.md`
Plan: `docs/superpowers/plans/2026-06-17-loquor-preferences-debug.md`

- **Implemented:** All 13 plan tasks — `nl-canonical` kind + send-seam marking (`canonicalEcho`,
  `sendLineCanonical`, `sendCanonical` threaded engine→bridge→pipeline→hook→Terminal); per-clause
  `translated` flag (I1-passthrough regression covered); `loquor.debug` key + `useDebug` hook
  (sentinel `'1'`, default false, try/catch); Scrollback debug rendering (canonical filtered out in
  debug-off, `you` pill in debug-on, live-region suppression on toggle); `PreferencesModal` (focus
  trap, Escape, restore-to-opener, `aria-describedby`, EN/FR/DE/ES copy); StatusBar `prefsToggle` +
  `⌄`→`▾` glyph; `Language:` text removed with combobox name preserved; `.you-pill` fg/bg inversion;
  Terminal integration with `inert` wiring. a11y + localization tests present.
- **Not yet implemented:** Nothing material (Task 13 `make all` is verification-only, not assessable
  from a diff).
- **Deviations:** No contradictions of the spec. One **scope addition beyond the plan**: the autosave
  round-trip of NL line kinds (`save_allstate` returns `lines`/`nextId`; `update()` restores via
  `isBufferLine` + nextId clamp). It is well-tested and genuinely required for the spec's
  "debug-off hides canonical" guarantee to survive a reload — but it is the source of finding I1
  (unbounded growth). The `alias` behavior (I2) is the one place where the shipped behavior conflicts
  with the spec's "meta/alias stays plain input" wording.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration;
  Concurrency & State; Security; Plan Alignment; Verifier
- **Scope:** changed code + adjacent (bridge.ts, reduce.ts, types.ts, Scrollback.tsx, Terminal.tsx,
  StatusBar.tsx, translatePipeline.ts, useNaturalLanguage.ts, engine.ts, useDebug.ts,
  PreferencesModal.tsx, NlLanguagePicker.tsx, components.css; one-level callers/callees;
  vendored glkapi.js for the autorestore contract)
- **Raw findings:** 13 (before verification)
- **Verified findings:** 8 (3 Important + 5 Suggestions/notes)
- **Filtered out:** 5 — F5 canonicalEcho stale-latch (latent, not live), F8 restored-lines aliasing
  (reducer is functional, no in-place mutation), F9 no first-frame restore latch (glkapi nulls
  autorestore after one delivery, glkapi.js:777-779), plus two security non-findings (React escapes
  all rendered text; no new HTML/URL/eval sink)
- **Security:** No findings. Restored/translated text reaches the DOM only as escaped JSX (no
  `dangerouslySetInnerHTML`); `lang` is an escaped attribute and isn't carried by the restored blob;
  the unversioned blob is whitelist-validated; worst case is self-authored content in one's own
  IndexedDB in a no-backend, single-user app.
- **Steering files consulted:** CLAUDE.md (multilingual rule, a11y mandate, "talk to me first" —
  honored; one doc-drift note in S5)
- **Plan/design docs consulted:** the 2026-06-17 preferences-debug design + plan
