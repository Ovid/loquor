# Agentic Code Review: ovid/todo-features

**Date:** 2026-06-17 19:38:23
**Branch:** ovid/todo-features -> main
**Commit:** 523db5c537ae24729a6afe7ecace6818c7aa2bed
**Files changed:** 31 | **Lines changed:** +2762 / -110
**Diff size category:** Large (production-code surface is ~363 lines across 12 files; the rest is docs + tests)

## Executive Summary

This branch ships the preferences/debug feature cleanly: a `nl-canonical` line kind, a send-seam canonical flag, a localized Preferences modal, a `useDebug` hook, and menu-bar polish. Plan alignment is complete (Tasks 1–12) with no contradictions to the design. The review surfaced **one real correctness bug** (a compound-command passthrough clause is wrongly hidden in debug-off), **one player-experience decision worth a conversation** (hiding the canonical command makes a *wrong* translation undiagnosable by default), and a cluster of low-severity hardening/consistency items around the new autosave-restore path and the type-ahead queue rendering. No security issues. Overall confidence: high — the core `sendCanonical`/`nl-canonical` contract is wired correctly end-to-end and all consumers handle the new kind.

## Critical Issues

None found.

## Important Issues

### [I1] Compound passthrough clause after a translated clause is wrongly tagged `nl-canonical` (hidden in debug-off)
- **File:** `src/llm/translatePipeline.ts:722-723, 731, 739` (and `:525-533`)
- **Bug:** `echoed` is a turn-level latch — set once on the first `TRANSLATED_STAGES` clause and never reset — but it is passed as the `canonical` argument to **every** subsequent `sendTracked` in the same compound. So in a mixed compound like `va au nord et take lamp`, clause 2 (`take lamp`) is a `vocab` passthrough of the player's **own** words, yet it inherits `canonical=true` and its echo `> take lamp` is filtered out in debug-off.
- **Impact:** In debug-off (the default), the player's own literally-typed words for that clause vanish from the transcript. This directly contradicts the code's own `TRANSLATED_STAGES` contract (`translatePipeline.ts:113-121`: passthrough stages "send the player's OWN words verbatim … so they need no echo," i.e. should stay `input`/visible). A single-passthrough turn stays visible; the same clause hidden only because it followed a translated clause is an order-dependent inconsistency.
- **Suggested fix:** Pass a **per-clause** canonical decision instead of the latch — reuse the same predicate that already guards the `nl-source` echo: `TRANSLATED_STAGES.has(stage) && !(activeLang === 'en' && isIdentityEcho(line, result.text))` — at the `sendTracked` calls (`:731`, `:739`), not the bare `echoed`.
- **Confidence:** High (verified at 88)
- **Found by:** Logic & Correctness; confirmed by Verifier

### [I2] Hiding the canonical command in debug-off (default) makes a *wrong* translation undiagnosable — design decision, needs a conversation
- **File:** `src/ui/Scrollback.tsx:48-51` (filters `nl-canonical` when `!debug`); `src/ui/useDebug.ts:13-19` (default `false`)
- **Behavior:** With debug off (the default), a turn renders the player's own words as a command line (`> abre el buzón`) followed by the game's response, but the actual canonical command that executed (`> open mailbox`) is filtered out entirely. When the NL layer **mistranslates** — e.g. the player types "abre el buzón" but the pipeline sends `take lamp` — the player sees `> abre el buzón`, then "Taken.", with no signal that the wrong command ran. They will blame the game, not the translation.
- **Why it's flagged, not fixed:** Per CLAUDE.md's "Player experience overrides product decisions — talk to me first" rule, this is exactly a documented design choice (hide canonical echoes from the default transcript / screen-reader announcements) with arguable player harm. It is **not** classified as a code defect.
  - *What the player sees/feels:* on a normal FR/DE/ES playthrough, a mistranslation looks like a buggy game; mistranslation is non-trivially common per the UAT notes.
  - *The decision:* hide `nl-canonical` by default (debug shows it).
  - *Rationale (from the spec/comments):* `> up` is "noise" for an ordinary player and shouldn't be announced to screen readers (design §"Debug preference"; Scrollback comments).
  - *Override options to weigh:* (a) make debug discoverable / default-on for non-English; (b) render the canonical in a subdued-but-present form when it diverges from a clean round-trip; (c) surface it only on low-confidence translations.
- **Confidence:** High that the behavior exists (verified at 85); the *call* is Ovid's.
- **Found by:** Accessibility & UX; confirmed by Verifier

## Suggestions

- **[S1] Type-ahead queued lines use the old bare `you` label and ignore `debug`** — `src/ui/Terminal.tsx:212-221` renders `<span className="you">you</span>` unconditionally, while committed `nl-source` lines render as the `you-pill` (debug-on) or a `> text` command line (debug-off) via `Scrollback.tsx:82,97-110`. The same input visibly relabels as it drains from queued → committed. Transient, but a player-facing inconsistency; gate the queued marker on `debug` the same way Scrollback does, or share the rendering. (Confirmed, 80 — Contract & Integration, Accessibility)
- **[S2] `autorestore.lines` is restored with no per-element validation** — `src/glkote-react/bridge.ts:127-134` only checks `Array.isArray`; elements become `ViewState` and are rendered (`Scrollback.tsx:50` does `l.text.trim()`). The snapshot is an **unversioned** IndexedDB blob keyed by story signature; a future `BufferLine` schema change could ship a crash-on-resume (`l.text.trim()` on `undefined`). Not reachable by current code (the paired `save_allstate` always writes the current shape), so it's hardening for cross-release drift: validate each element and fall back to the reducer-built view on failure. (Partially-confirmed latent, 65 — Error Handling, Security, Concurrency)
- **[S3] `nextId` restore fallback can collide ids** — `src/glkote-react/bridge.ts:132` `nextId: restore.nextId ?? this.view.nextId`. On a partial/old snapshot missing `nextId`, the fallback is the freshly-reduced (small) value, which can be ≤ `max(id)` in `restore.lines`, so future `nextId++` reuses an id → duplicate React keys. Clamp: `Math.max(this.view.nextId, ...restore.lines.map(l => l.id + 1))`. Same snapshot-drift class as S2; fix both together. (Confirmed latent, 70 — Logic, Error Handling, Concurrency)
- **[S4] One-frame `aria-live="off"` could silence output if a debug toggle and a `lines` append flush in one commit** — `src/ui/Scrollback.tsx:33-38,74`. The compare-and-sync is correct today: `debug` flips via a modal `onChange` and `lines` arrives via the async bridge `onState`, so in React 18 they're separate commits (and the modal makes the game inert). Latent hazard only; cheap guard: suppress only when `debug` changed **and** `lines` identity is unchanged. (Partially-confirmed latent, 62 — Logic, Accessibility, Concurrency)
- **[S5] `useDebug` duplicates `useTheme`'s structure** — `src/ui/useDebug.ts` mirrors `src/ui/useTheme.ts` (lazy validated read, try/catch, write effect, memoized toggle). A future fix to one (e.g. cross-tab `storage` sync) silently misses the other; consider a shared `usePersistentToggle(key, sentinel)`. (Confirmed, 75 — Contract & Integration)
- **[S6] Stale comments** — (a) `src/ui/NlLanguagePicker.tsx:13` JSDoc still says the component adds the visible `"Language:"` label, which Task 10 removed (only the combobox `aria-label="Language"` remains). (b) `src/glkote-react/types.ts:56` `save_allstate` doc says "only the metrics need to round-trip," but the implementation now round-trips `lines`/`nextId` (`bridge.ts:177-181`). Both stale. (Confirmed, 90 — Logic, Concurrency, Verifier)

## Plan Alignment

Design/plan: `docs/superpowers/specs/2026-06-17-loquor-preferences-debug-design.md` + `docs/superpowers/plans/2026-06-17-loquor-preferences-debug.md`.

- **Implemented:** All preferences-debug plan tasks (1–12) — `nl-canonical` reducer tagging, the bridge `canonicalEcho` send-seam flag, engine/pipeline/hook threading of `sendCanonical`, the `loquor.debug` storage key, the `useDebug` hook, Scrollback debug rendering + live-region suppression, the localized (EN/FR/DE/ES) `PreferencesModal`, the StatusBar `⚙` slot + caret unification, removal of the `Language:` text, and the `.you-pill` CSS. Plus in-scope hardening (commit `006a86b`) carrying NL line kinds through native autosave so a resume keeps hiding canonical echoes.
- **Not yet implemented:** Task 13 (full-suite verification / manual smoke) is verification-only. The two other 2026-06-17 designs present in the diff (landing-language-picker, landing-localization) ship only their docs on this branch — their production code is not in this diff and their target files already exist on `main`; neutral, out of this branch's stated scope.
- **Deviations:** None. The four specifically-checked areas all match — the "translated turn" gate and `nl-source` ordering invariant, the send-seam canonical marking ("first echoLocal-firing clause until the turn ends"), the live-region suppression approach, and the four-language panel localization. The spec's original "input path untouched" line was deliberately revised in the non-goals to permit the labelling-only send-seam flag; the actual change matches that revised intent with no further creep (the VM event payload is byte-identical). *Note: finding I1 is a bug in how that gate is reused for the canonical send-flag on later clauses, not a plan deviation.*

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases; Contract & Integration; Concurrency & State; Security; Accessibility & UX (added — CLAUDE.md treats a11y as correctness-level and the diff is UI-heavy); Plan Alignment (design docs found). Single Verifier pass.
- **Scope:** Changed production files (`src/glkote-react/{bridge,reduce,types}.ts`, `src/llm/{translatePipeline,useNaturalLanguage}.ts`, `src/ui/{Scrollback,PreferencesModal,Terminal,StatusBar,NlLanguagePicker,useDebug}.tsx/ts`, `src/zmachine/engine.ts`, `src/storageKeys.ts`) plus adjacent: `useTheme.ts`, `useFocusTrap.ts`, `useOutputTranslation.ts`, `logger.ts`.
- **Raw findings:** ~16 (across 7 specialists, before dedup/verification)
- **Verified findings:** 8 (1 Important bug, 1 Important player-experience item, 6 Suggestions)
- **Filtered out / downgraded:** False positives and below-threshold items dropped (e.g. an `aria-describedby` binding concern withdrawn after re-read; `clearTimeout` non-null assertions confirmed benign; security found nothing material; B/C/D downgraded from "crash/race" to latent snapshot-drift / batching hazards).
- **Steering files consulted:** `CLAUDE.md` (a11y-is-correctness, multilingual fix-everywhere, player-experience-overrides rules applied; noted stale: it doesn't yet list the preferences-debug spec, and `types.ts` save_allstate comment now contradicts the impl).
- **Plan/design docs consulted:** `2026-06-17-loquor-preferences-debug-design.md` + plan; noted (neutral) the two unimplemented landing-* 2026-06-17 designs.
