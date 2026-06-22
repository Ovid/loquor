# Loquor — Georgian-mode bottom status bar (design)

**Date:** 2026-06-21
**Status:** Approved (brainstorming), pending implementation plan
**Scope:** Display-layer only. Relocates and restyles the Georgian (`ka`)
output-only mode notices into a new bottom status bar; removes their English
half. No engine, pipeline, or non-`ka` behavior changes.

## Problem

In Georgian (`ka`) Phase-1 output-only play, two notices render inline in the
`role="status"` region just above the command input (`Terminal.tsx`):

1. **Beta notice** — "Georgian is a beta translation; some text may still appear
   in English." Rendered **bilingually** today: a `lang="ka"` span followed by a
   `lang="en"` span.
2. **No-corpus notice** (Zork II/III, which have no `ka` corpus) — "Georgian
   isn't available for this story yet; it is shown in English." Also bilingual.

Plus a one-time **activation tip** (`escapeHatchOnActivation('ka')`,
`notices.ts`): "Tip: type commands in English; text appears in Georgian. For
help, type help." — routed through the transient `nl.notice` channel.

Player-reported problems (UAT):

- The **English half is visually intrusive** for a Georgian reader — it reads as
  untranslated text, the same complaint as prior localization bugs (but here the
  English is *intentional*, for screen-reader pronunciation).
- The notices sit **in the command flow**, not out of the way, and aren't
  visually distinguished from gameplay.

Why the activation tip exists at all (context, not a bug to "fix" here):
Georgian Phase 1 is deliberately **read-Georgian / type-English** — `ka` is the
one output-only language, with no input lexicon and no input LLM (small models
can't parse Georgian). The command field raw-sends English to the Z-parser, so
without the tip a Georgian reader types Georgian and every command fails with
"I don't know the word …". The tip is mandatory onboarding, not a preference;
real Georgian input is Phase 2 (not built).

## Decisions (locked in brainstorming)

1. **Remove the English half from the BETA notice only — the no-corpus notice
   stays bilingual.** The two notices are NOT symmetric:
   - **Beta notice** fires when the screen IS Georgian (corpus present). It
     becomes Georgian-only (`lang="ka"`); a Georgian screen reader voices it
     correctly and it's consistent with the all-Georgian display. This is the
     player-reported clutter, and removing English here is safe.
   - **No-corpus notice** (Zork II/III) fires precisely when the screen has
     **fallen back to English** (`corpusFor === null`). Its message is "Georgian
     isn't available — shown in English," and its audience is a player who wanted
     Georgian and got English (possibly an English reader). Telling them *only in
     Georgian* that the game is in English is self-defeating, and wrapping an
     all-English screen's notice in `lang="ka"` makes a screen reader pronounce
     English with Georgian phonemes (WCAG 3.1.2 — the actual point behind the
     original review-I1 bilingual-span rationale). So the no-corpus notice
     **keeps its `lang="ka"` + `lang="en"` bilingual form.** (Adversarial-review
     finding [1].)
2. **New bottom status bar** holds the persistent `ka` mode info. It mirrors the
   top `StatusBar`'s brass/rule styling but reads quieter (smaller, dimmer).
3. **The activation tip becomes permanent bar content**, not a one-time inline
   nudge — so a player who forgets always has the type-English / `help`
   reference, and it can never scroll away or be missed. (`ka` only — see below.)
   This is a deliberate UX call we discussed: the type-English requirement is a
   known Phase-1 limitation (real Georgian input is Phase 2), and making the
   reference permanent-but-quiet beats a one-time nudge that can be missed. It is
   recorded here (not an un-had "talk to me first" — the rationale was reviewed
   and endorsed) so the tradeoff is explicit. **Mechanism — do NOT reinvent
   "fire once":** keep `ka`'s tip flowing through the existing
   `makeActivationNotice` once-per-language latch (`notices.ts` /
   `useNaturalLanguage.ts:204-220`) to drive the **one-shot AT announcement** on
   `ka` entry (this is the tested mechanism guarded against the re-announce bug
   that commit `3ac3508` fixed); render the **persistent visible** bar text from
   a SEPARATE static element. The latch handles "announce once on entry"; the
   static element handles "always visible." Don't delete the latch and rebuild
   one-shot logic from scratch. (Adversarial-review finding [2].)
4. **Transient messages stay inline** above the input, unchanged: `…thinking`,
   abstain/timeout, "ran N of M", and `help` responses.
5. **`ka`-only rendering.** The bar is absent (not empty) for en/fr/de/es —
   `<main>` is `flex: 1` and reclaims the space, so there is **no layout change**
   for those languages and their inline notice flow is untouched.
6. **Reuse the existing approved-draft Georgian strings.** No new/compact
   Georgian wording is authored — `ka` has no native review and no LLM, so
   inventing text is out of scope (the existing strings are already
   NATIVE-REVIEW-DRAFT, §8 of the Georgian output-translation spec).

## Design

### Structure

A new component (e.g. `GeorgianStatusBar` / `BottomBar`) rendered as a sibling
**after** `<main>` inside `.screen.term`:

```
.screen.term  (flex column)
 ├─ <StatusBar>        top bar (banner)
 ├─ <main .term-main>  flex:1  — scrollback + inline transient notices + input
 └─ <footer …>         NEW — only when outLang === 'ka'
```

Because the column already pins the footer to the bottom, **no `position:
fixed`** is used (consistent with the responsive spec's scroll-safe rules).

### Render gate

Renders only when the active **output** language is `ka` (the existing
`outLang === 'ka'` condition that already gates `showBetaNotice` /
`showNoCorpusNotice`). Content within, mirroring the existing mutually-exclusive
gates:

- **`ka` + this game has a `ka` corpus** (`corpusFor(signature,'ka') !== null`):
  the **beta notice** (Georgian only) **plus** the **type-English / `help`
  guidance** (the relocated activation-tip text).
- **`ka` + no `ka` corpus** (Zork II/III, `signature !== '' && corpusFor ===
  null`): the **no-corpus notice** (bilingual — see Decision 1). The type-English
  guidance is omitted — the display *is* English there, so "type in English" is
  moot.

**Preserve the boot-flash guard.** The no-corpus branch MUST keep the existing
`signature !== ''` condition (`Terminal.tsx:189-190`): `corpusFor` returns null
for every game until the signature resolves at boot, so without the guard the
bar would flash the no-corpus notice during the boot window before the corpus is
known. Don't lose this in reimplementation. (Adversarial-review finding [5].)

### What moves where

| Notice | Today | After |
| --- | --- | --- |
| Beta notice (ka) | inline `nl-status`, bilingual | **bottom bar**, Georgian-only |
| No-corpus notice (ka) | inline `nl-status`, bilingual | **bottom bar**, **still bilingual** (Decision 1) |
| Activation tip (ka) | transient `nl.notice`, one-time inline | **bottom bar** (persistent visible) + one-shot AT announcement via the existing latch (Decision 3) |
| `…thinking`, abstain, "ran N of M", `help` reply | inline `nl-status` | **unchanged** (inline) |
| All en/fr/de/es notices (incl. their one-time activation nudges) | inline | **unchanged** (inline) |

The `ka` activation tip's **persistent visible** copy moves to the bar; its
**one-shot announcement** still rides the existing `makeActivationNotice` latch
on entry (Decision 3). The inline `nl.notice` region for `ka` otherwise carries
only `help` responses. fr/de/es/en continue to use `nl.notice` for their
activation nudge, abstain, timeout, etc. — **no change**. If the one-shot
announcement and a `help` reply could co-occupy the same live region in one
render (player types `help` immediately on entry), the plan must keep them from
clobbering each other — simplest is a dedicated one-shot announcement region
separate from the inline `help`/abstain region. (Adversarial-review finding [6].)

### Accessibility

- The bar is a **labeled static region** — a **`<footer>`** (mirroring the top
  bar's `<header>` banner) with an **explicit `aria-label`** (e.g. "Georgian mode
  information"). It is **not** a live region itself — its content is persistent,
  and a persistent live region chatters on every re-render (finding [7]: pin the
  element + name, don't leave it to the plan).
- **Critical-onboarding announcement:** because the type-English instruction is
  must-read, on `ka` activation it *also* fires **once** so a screen-reader user
  hears it on entry. This rides the existing `makeActivationNotice` once-per-
  language latch (Decision 3) into a **dedicated** polite live region — NOT the
  static `<footer>`, and NOT the inline `nl.notice` region that carries `help`/
  abstain (finding [6]). The latch already guarantees "announced once on entry,
  not re-announced on every render" (the property commit `3ac3508` protects);
  reusing it avoids rebuilding that subtle behavior.
- **Contrast:** WCAG 2.2 AA in **both** themes (the dim styling must still pass).
- **Responsive:** usable from 320px — the bar wraps to 1–3 short lines at the
  very bottom; no overflow, no clipping, in both themes.
- Decorative glyphs (e.g. a leading `ⓘ`) are `aria-hidden`.

### Styling

Mirrors `.statusbar` tokens (brass text, `--rule` border — a **top** border
since it sits at the bottom, `--status-grad` or a dimmer variant), at a smaller
font / lower emphasis than the top bar so it reads as ambient chrome. Honors
`prefers-reduced-motion` for any transition. CSS-only, no new dependencies.

**New CSS is required — existing rules do NOT cover this.** The current
`@media (max-width: 520px)` block (`components.css:437-446`) styles only
`.statusbar`/`.meta`; the new bar needs its own base rules AND its own wrap rules
in that media block (finding [3]). Two `ka`-specific space concerns the rules
must address, because the bar is **always present** during `ka` play (unlike the
absent-for-everyone-else case):
- On a narrow/short window the bar competes with the top bar + scrollback +
  inline notices + input for height. It must wrap to at most a few short lines
  and never push the input off-screen or clip the top of content (the responsive
  spec's locked "top of content stays reachable" rule).
- Keep it visually compact (smaller font, tight padding) so the persistent strip
  costs minimal play area on a phone.

## Out of scope

- Any change to en/fr/de/es notice content, placement, or styling.
- Authoring new or compact Georgian wording (reuse existing strings verbatim).
- A per-language "basic mode" line in the bar (structure allows it later; not
  built now).
- Georgian *input* (Phase 2) — the type-English constraint and its tip remain.

## Testing

1. `ka` active + corpus game → bottom bar present; beta notice is **Georgian-
   only** (**no English substring**); bar contains the type-English / `help`
   guidance.
2. `ka` active + no-corpus game (Zork II/III) → bar shows the no-corpus notice,
   **still bilingual** (asserts BOTH the `lang="ka"` and the `lang="en"` halves
   are present); no type-English guidance.
3. en/fr/de/es active → **no `<footer>` bottom bar** in the tree; their inline
   notice flow (activation nudge, abstain, thinking) asserts unchanged.
4. a11y: the `<footer>` exposes its accessible name (`aria-label`); the one-shot
   announcement fires on `ka` entry through its dedicated live region and is
   **not re-announced on re-render**; the static `<footer>` is not a live region;
   decorative glyph is `aria-hidden`.
5. Transients (`…thinking`, abstain, "ran N of M", `help` reply) still render
   inline above the input, not in the bar.
6. Switching `ka` → en mid-session removes the bar (and its content) with no
   stray remnant; en → `ka` shows it.
7. Boot-flash guard: before the signature resolves (`signature === ''`), the
   no-corpus branch does NOT render — the bar shows no premature no-corpus notice
   during boot (finding [5]).
8. Mid-session **story switch** while `ka` is active flips bar content: a
   corpus game → a no-corpus game moves beta+tip → bilingual no-corpus notice
   (and vice-versa), with no stale content from the prior game (finding [5]).

## Manual checklist (no automated layout guard — jsdom has no layout engine)

Per the responsive spec: verify at **320 / 375 / 520px** and a short landscape
window, in **both themes**, that the bottom bar wraps without overflow/clipping
and the top-of-content stays reachable. **Exercise the `ka` case specifically** —
the bar only renders under Georgian, and on a phone it is *always present*,
permanently shrinking the play area, so the squeeze (top bar + scrollback +
inline notices + input + persistent bar) must be checked under `ka`, not just the
default English layout. Re-run whenever `landing.css` / `components.css` change.
