# Loquor responsive pass — design

Date: 2026-06-19
Status: approved (design); plan pending

## Problem

The UI is not responsive and has an acute scroll-trap bug.

1. **Scroll trap (acute).** `.screen` (landing + in-game "Change story" overlay)
   and `.modal-backdrop` (download / preferences modals) are `position:fixed;
   inset:0` flex containers that *center* a single child with **no `overflow`
   scroll**, and `body` is `overflow:hidden`. Whenever the plate/modal is taller
   than the viewport — a narrow phone where content stacks tall, or a short
   landscape window — the top of the child is clipped with no way to scroll to
   it. The corner controls (the dismiss ✕ top-left and the theme toggle
   top-right) then become unreachable, so the player cannot close the Change
   story overlay. This is the reported bug.

2. **No width adaptation.** There are no responsive media queries anywhere except
   `prefers-reduced-motion`. Specifically:
   - `.plate` uses fixed `padding: 46px 48px 40px` and a fixed `.title` of `4rem`;
     `.volumes` is a 3-column grid at *every* width, so it cramps on phones.
   - `.statusbar` / `.meta` is a `white-space:nowrap` row of up to five controls
     (score · Change story · language · ⚙ preferences · theme) with no
     `flex-wrap`, so it overflows horizontally on narrow viewports.

## Goal

A genuinely usable layout from **320px** wide up, including short landscape
windows, in both themes, across all four UI languages (en/fr/de/es) and the
Georgian (ka) display. CSS-only; no new dependencies and no JS layout logic.

Non-goals: a container-query / spacing-token fluid system (over-built for one
plate + one terminal), JS `useMediaQuery` layout switching, and any change to
the game transcript's own scrolling (`.scroll` already scrolls and its `8vw`
side padding already adapts).

## Approach (chosen: targeted CSS, native only)

### 1. Scrollable, top-safe overlay/modal containers

The single root cause of the acute bug is centered fixed containers with no
overflow. Fix it once, in a pattern shared by `.screen` and `.modal-backdrop`:

- `overflow-y: auto` so content taller than the viewport scrolls. (`body` stays
  `overflow:hidden`; these containers own their own scroll.)
- Stop hard-centering. Use vertical padding + `margin:auto` on the child (or
  `align-items: safe center`) so that when the child is *taller* than the
  viewport it pins to the top with breathing room above instead of clipping
  upward off-screen. Both corner controls stay on-screen and scrollable-to.
- `overscroll-behavior: contain` so scrolling the overlay doesn't chain-scroll
  the inert game behind it.

This covers the initial landing, the in-game Change story overlay, and both
modals with one rule pattern — no per-overlay special-casing.

### 2. One phone breakpoint — `@media (max-width: 520px)`

- `.plate` padding `46px 48px 40px` → roughly `28px 20px 28px`; keep
  `width: min(680px, 92vw)`.
- `.volumes` 3-column grid → **single column** so the numerals + names stop
  cramping.
- Verify the absolutely-positioned corner controls (✕ top-left, theme toggle
  top-right) do not overlap the title at 320px; nudge the title's top margin at
  this breakpoint only if they do.
- `.statusbar` gets `flex-wrap: wrap` and `.meta` gets `flex-wrap: wrap` with a
  `row-gap`, so the control cluster wraps to a second line instead of
  overflowing. `.loc` keeps its existing ellipsis truncation.

### 3. Fluid typography

- `.title`: `4rem` → `clamp(2.5rem, 9vw, 4rem)`.
- `.tagline`: a matching small `clamp` so it tracks the title.
- Everything else already uses small `rem` sizes that hold at 320px — leave them.

### 4. Short viewports

No separate height breakpoint: the scroll fix in (1) already makes short /
landscape windows usable (the plate scrolls within the viewport).

## Preserve (regression criteria, already implemented)

These already work and are already tested; the refactor must not break them:

- **Escape dismisses when the ✕ is visible.** `useFocusTrap` routes Escape →
  `onDismiss` whenever `onDismiss` is set (the same condition that renders the
  ✕). Pinned by `Landing.test.tsx` ("dismisses on the Escape key (overlay
  mode)"), and the modals by `ModelDownloadModal`/`PreferencesModal` tests.
- **Focus trap + initial focus on the dismiss control**, and focus restoration
  on close. The scroll-container change touches the plate wrapper markup, so
  confirm the trap still finds its focusables and `dismissRef` still receives
  initial focus.

## Accessibility

The scroll fix is itself an a11y fix: today a keyboard / screen-reader user
literally cannot reach the ✕ when the overlay overflows. No colour, role, or
accessible-name changes are introduced, so no new a11y test surface — but the
focus-trap regression criteria above are part of acceptance.

## Testing / verification

Layout CSS cannot be meaningfully unit-tested in jsdom (no layout engine), and
the stack has no Playwright. Therefore:

- **All existing Vitest + a11y tests stay green.** This is CSS-only with no DOM
  structure change beyond, at most, a wrapper around the centered child; confirm
  no test asserts the old centering (none currently do) and the focus-trap tests
  still pass.
- **Manual acceptance**, both themes, at **320 / 375 / 520px** and one short
  landscape window:
  1. Change story overlay scrolls; the ✕ is reachable and Escape dismisses.
  2. Initial landing on a short window scrolls; nothing is clipped.
  3. `.volumes` stacks to one column ≤520px.
  4. Status bar wraps instead of overflowing.
  5. Download + preferences modals scroll when taller than the viewport.

## Files in scope

- `src/ui/landing.css` — `.screen`, `.plate`, `.volumes`, `.title`, `.tagline`,
  new `@media (max-width: 520px)` block.
- `src/ui/components.css` — `.modal-backdrop` overflow, `.statusbar` / `.meta`
  wrap.
- `src/ui/Landing.tsx` — only if a wrapper element is needed for the top-safe
  scroll pattern (prefer pure CSS; touch the component only if unavoidable).
