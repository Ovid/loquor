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

1. **Remove the English half entirely** from both the beta and no-corpus
   notices. They become Georgian-only (`lang="ka"`). A Georgian screen reader
   voices `lang="ka"` text correctly; this is consistent with the rest of the
   all-Georgian display. **Accepted tradeoff:** an English-TTS user who selects
   Georgian output loses that one English warning — but they have already opted
   into an all-Georgian screen, so this is consistent, not a regression.
2. **New bottom status bar** holds the persistent `ka` mode info. It mirrors the
   top `StatusBar`'s brass/rule styling but reads quieter (smaller, dimmer).
3. **The activation tip becomes permanent bar content**, not a one-time inline
   nudge — so a player who forgets always has the type-English / `help`
   reference, and it can never scroll away or be missed. (`ka` only — see below.)
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
- **`ka` + no `ka` corpus** (Zork II/III, `corpusFor === null`, signature
  resolved): the **no-corpus notice** only. The type-English guidance is omitted
  — the display *is* English there, so "type in English" is moot.

### What moves where

| Notice | Today | After |
| --- | --- | --- |
| Beta notice (ka+en) | inline `nl-status`, bilingual | **bottom bar**, Georgian-only |
| No-corpus notice (ka+en) | inline `nl-status`, bilingual | **bottom bar**, Georgian-only |
| Activation tip (ka) | transient `nl.notice`, one-time | **bottom bar**, persistent |
| `…thinking`, abstain, "ran N of M", `help` reply | inline `nl-status` | **unchanged** (inline) |
| All en/fr/de/es notices (incl. their one-time activation nudges) | inline | **unchanged** (inline) |

The `ka` activation tip no longer writes the `nl.notice` channel. For `ka`, that
channel then carries only `help` responses (still inline). fr/de/es/en continue
to use `nl.notice` for their activation nudge, abstain, timeout, etc. — **no
change**.

### Accessibility

- The bar is a **labeled static region** — a `<footer>` (or a region with an
  explicit `aria-label`, e.g. "Georgian mode") — **not** a chattering live
  region, since its content is persistent.
- **Critical-onboarding announcement:** because the type-English instruction is
  must-read, on `ka` activation it *also* fires **once** through a polite live
  region so a screen-reader user hears it on entry. After that the bar is a
  quiet, navigable, always-available reference. (Implementation: reuse the
  existing `role="status"` polite region for the one-shot announcement, or a
  dedicated one — the plan decides; the requirement is "announced once on entry,
  not re-announced on every render".)
- **Contrast:** WCAG 2.2 AA in **both** themes (the dim styling must still pass).
- **Responsive:** usable from 320px — the bar wraps to 1–3 short lines at the
  very bottom; no overflow, no clipping, in both themes.
- Decorative glyphs (e.g. a leading `ⓘ`) are `aria-hidden`.

### Styling

Mirrors `.statusbar` tokens (brass text, `--rule` border — a **top** border
since it sits at the bottom, `--status-grad` or a dimmer variant), at a smaller
font / lower emphasis than the top bar so it reads as ambient chrome. Honors
`prefers-reduced-motion` for any transition. CSS-only, no new dependencies; the
phone behavior lives with the existing `@media (max-width: 520px)` rules.

## Out of scope

- Any change to en/fr/de/es notice content, placement, or styling.
- Authoring new or compact Georgian wording (reuse existing strings verbatim).
- A per-language "basic mode" line in the bar (structure allows it later; not
  built now).
- Georgian *input* (Phase 2) — the type-English constraint and its tip remain.

## Testing

1. `ka` active + corpus game → bottom bar present; Georgian-only; **no English
   substring**; contains the type-English / `help` guidance.
2. `ka` active + no-corpus game (Zork II/III) → bar shows the no-corpus notice;
   no type-English guidance.
3. en/fr/de/es active → **no `<footer>` bottom bar** in the tree; their inline
   notice flow (activation nudge, abstain, thinking) asserts unchanged.
4. a11y: the bar exposes a correct accessible name/role; a one-time polite
   announcement fires on `ka` entry and is not re-announced on re-render;
   decorative glyph is `aria-hidden`.
5. Transients (`…thinking`, abstain, "ran N of M", `help` reply) still render
   inline above the input, not in the bar.
6. Switching `ka` → en mid-session removes the bar (and its content) with no
   stray remnant; en → `ka` shows it.

## Manual checklist (no automated layout guard — jsdom has no layout engine)

Per the responsive spec: verify at **320 / 375 / 520px** and a short landscape
window, in **both themes**, that the bottom bar wraps without overflow/clipping
and the top-of-content stays reachable. Re-run whenever `landing.css` /
`components.css` change.
