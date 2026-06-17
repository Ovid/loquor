import { useEffect, useRef } from 'react'

// Shared with the modal and the change-story overlay (review I2): a single
// definition of "what counts as focusable" so the two traps can't drift.
const FOCUSABLE =
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
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
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
      previouslyFocused?.focus?.()
    }
  }, [active, containerRef, initialFocusRef])
}
