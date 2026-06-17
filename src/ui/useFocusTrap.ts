import { useEffect, useRef } from 'react'

// Shared with the modal and the change-story overlay (review I2): a single
// definition of "what counts as focusable" so the two traps can't drift.
export const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Modal focus management for a dialog/overlay (WCAG 2.4.3 / 2.1.2): while
 * `active`, move focus into the container, trap Tab so it cycles first↔last
 * within it (aria-modal alone doesn't contain DOM focus), route Escape to
 * `onEscape`, and restore focus to the previously-focused element on close.
 *
 * Extracted from duplicated copies in the modal and the landing overlay so an
 * a11y fix lands in one place. `onEscape` is read through a ref so a changing
 * handler (e.g. cancel-while-downloading vs decline) doesn't re-run the effect
 * and steal focus on every render; the effect only re-runs when `active` flips.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  {
    active,
    onEscape,
    initialFocusRef,
  }: {
    active: boolean
    onEscape: () => void
    /** Control to focus on open; defaults to the first focusable in the container. */
    initialFocusRef?: React.RefObject<HTMLElement | null>
  },
): void {
  // Keep the latest onEscape in a ref (updated in an effect, not during render)
  // so a changing handler doesn't re-run the trap effect and steal focus.
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  // The control to return focus to on close — the opener, held in a ref so it
  // survives StrictMode's mount double-invoke. The first invoke's cleanup tries
  // to restore focus, but if the opener's ancestor is `inert` (M9) that restore
  // is a no-op, leaving focus inside the dialog; the second invoke must then NOT
  // capture that in-dialog control as the restore target.
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const candidate = document.activeElement as HTMLElement | null
    // Only treat focus that's currently OUTSIDE the trap as the opener.
    if (
      candidate &&
      candidate !== document.body &&
      !container?.contains(candidate)
    ) {
      restoreRef.current = candidate
    }
    const focusables = () => [
      ...(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    ]
    ;(initialFocusRef?.current ?? focusables()[0])?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscapeRef.current()
        return
      }
      if (e.key !== 'Tab' || !container) return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const toRestore = restoreRef.current
      toRestore?.focus?.()
      // If the opener's ancestor was marked `inert` while the modal was open
      // (M9), this synchronous focus() lands before `inert` clears and is a
      // silent no-op — focus falls to <body>. Retry once on the next frame,
      // after the close commit, but only if focus is still lost, so we never
      // steal focus the app intentionally moved elsewhere (WCAG 2.4.3 / APG).
      if (toRestore && document.activeElement !== toRestore) {
        requestAnimationFrame(() => {
          const here = document.activeElement
          if (here === document.body || here === null) toRestore.focus?.()
        })
      }
    }
  }, [active, containerRef, initialFocusRef])
}
