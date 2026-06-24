import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { DisplayLine } from '../translate/useOutputTranslation'

export function Scrollback({
  lines,
  debug = false,
  pinKey,
  onActivate,
  children,
}: {
  lines: DisplayLine[]
  /** Debug view: show nl-canonical echoes and the ‹you› pill (default off). */
  debug?: boolean
  /** Out-of-band content-height signal: a value that changes whenever children
   *  rendered INSIDE this scroll container grow/shrink the transcript WITHOUT a
   *  `lines` change — the NL thinking indicator, abstain notice, and queued
   *  lines (Terminal passes them as children from nl state). The bottom-pin
   *  effect watches it too, so the focused input isn't left clipped below the
   *  fold during translation (WCAG 2.4.11 — review I1). */
  pinKey?: string
  /** Focus the prompt when the player clicks into the transcript. */
  onActivate?: () => void
  /** The inline command prompt, rendered at the end of the transcript. */
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Pin the transcript to the bottom as new lines arrive. The command prompt
  // (`children`) renders at the END of this same scroll container, so its box
  // is part of the scrollable content. A single post-commit scroll lands ~one
  // line short: the prompt's final layout (and any just-mounted nl-status
  // notice) settles AFTER the scroll, so the bottom grows and the focused input
  // is left clipped below the fold — a stable ~56px gap, debugged in-browser
  // (WCAG 2.4.11 "focus not obscured"; worse on short/phone viewports). Fix:
  // scroll in a layout effect (before paint — no visible jump) and re-assert on
  // the next frame, once that late layout has settled. Mirrors the
  // requestAnimationFrame re-try idiom in useFocusTrap. There is no automated
  // pixel guard (jsdom has no layout engine); the responsive spec's manual
  // checklist covers the rendered behavior — re-run it when touching this.
  //
  // Keyed on `lines` AND `pinKey` (review I1): the thinking indicator, abstain
  // notice, and queued lines render as children INSIDE this scroller from nl
  // state — they grow scrollHeight with NO `lines` change, so `lines` alone
  // would not re-pin and the input would clip during translation. `pinKey`
  // carries those out-of-band signals, so the same re-assert fires for them.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const toBottom = () => el.scrollTo?.(0, el.scrollHeight)
    toBottom()
    const raf = requestAnimationFrame(toBottom)
    return () => cancelAnimationFrame(raf)
  }, [lines, pinKey])

  // Toggling debug re-renders the whole history at once (canonical echoes appear/
  // disappear, nl-source flips pill↔command); that bulk mutation must NOT be
  // announced — it's a settings action, not game output. Mute the live region for
  // the toggle commit, then restore 'polite' on the next render driven by real
  // output. prevDebugRef is READ during render and synced in an effect below.
  // This compare-and-sync read is deliberate: it yields exactly one committed
  // aria-live="off" frame (the toggle render), then 'polite' resumes. A
  // setState-during-render alternative can't do this — it re-renders before
  // commit so 'off' never reaches the DOM — and a lines-identity-based reset
  // would be clobbered when the parent rebuilds the lines array each render.
  // Suppress ONLY when the debug flag flipped AND no new line arrived in the same
  // commit (review S3): if a genuine game-output line and a debug toggle happen to
  // batch into one render, the new line must still be announced, so we don't mute
  // it. lines.length is the cheap identity proxy — the parent rebuilds the array
  // each render, so a reference compare is useless, but a new line always grows it.
  const prevDebugRef = useRef(debug)
  const prevLenRef = useRef(lines.length)

  // Reading these refs DURING RENDER is deliberate (see the block comment above):
  // we need the PREVIOUS committed values to emit exactly one committed
  // aria-live="off" frame on the debug-toggle render. The alternatives the
  // react-hooks/refs rule would steer toward don't work here — setState-during-
  // render collapses before commit (the 'off' frame never reaches the DOM), and a
  // layout-effect would mute only AFTER the bulk lines already rendered 'polite'
  // (announcing them — the regression this pattern exists to avoid). So the read
  // is correct; suppress the rule for this one intentional previous-value read.
  /* eslint-disable react-hooks/refs */
  const toggled =
    prevDebugRef.current !== debug && prevLenRef.current === lines.length
  /* eslint-enable react-hooks/refs */
  useEffect(() => {
    prevDebugRef.current = debug
    prevLenRef.current = lines.length
  }, [debug, lines.length])

  // The game prints a bare '>' to the buffer as its line-input prompt. The
  // inline CommandInput already shows that prompt, so the bare-'>' lines are
  // redundant — drop them. (Historical echoes like '>open mailbox' are never
  // bare, so they survive.) Filter on kind too, so a (pathological) nl-source
  // line whose English is literally '>' is not swallowed (review S13).
  //
  // In debug-OFF also drop nl-canonical lines entirely — so screen readers don't
  // announce the hidden '> up' (the canonical translation of the player's text).
  const visible = lines.filter(l => {
    if (l.kind === 'nl-canonical') return debug
    return l.kind === 'nl-source' || l.text.trim() !== '>'
  })

  return (
    <div
      className="scroll"
      ref={ref}
      onMouseUp={() => {
        // Clicking anywhere in the transcript focuses the prompt — unless the
        // player is selecting text to copy.
        if (onActivate && !window.getSelection()?.toString()) onActivate()
      }}
    >
      {/* role=log wraps ONLY the transcript prose, not the prompt or the NL
          status messages (S1): every appended line (room descriptions,
          responses) is announced, while the input and the transient
          thinking/abstain notices live in their own role=status sibling so a
          status message isn't mixed into the sequential log. aria-relevant=
          additions reads only new lines, not the prompt's removals; the inner
          div is always mounted, so the live region is registered before updates
          arrive. aria-live drops to 'off' for the single commit that toggles
          debug, so the bulk history re-render isn't announced. */}
      <div
        role="log"
        aria-live={toggled ? 'off' : 'polite'}
        aria-relevant="additions"
        aria-label="Game transcript"
      >
        {visible.map(l => {
          // nl-canonical renders exactly like a typed command echo.
          const asCommand = l.kind === 'input' || l.kind === 'nl-canonical'
          // nl-source: the ‹you› pill in debug, else a plain command line.
          const asPill = l.kind === 'nl-source' && debug
          return (
            <p
              key={l.id}
              lang={l.lang}
              className={
                (l.kind === 'room'
                  ? 'room'
                  : asCommand || (l.kind === 'nl-source' && !debug)
                    ? 'echo'
                    : asPill
                      ? 'nl-source'
                      : '') + (l.pending ? ' xl-pending' : '')
              }
            >
              {asPill ? (
                <>
                  <span className="you-pill" lang="en">
                    you
                  </span>{' '}
                  {l.text}
                </>
              ) : asCommand || l.kind === 'nl-source' ? (
                <>
                  <span className="car">&gt;</span> {l.text}
                </>
              ) : (
                l.text
              )}
            </p>
          )
        })}
      </div>
      {children}
    </div>
  )
}
