import { useRef, type ReactNode } from 'react'
import { useFocusTrap } from './useFocusTrap'

/**
 * The shared dialog scaffolding for the app's modals (Preferences, model
 * download). Owns the single definition of the modal a11y contract so the two
 * can't drift (WCAG 2.4.3 / 2.1.2 + 4.1.2): the backdrop is a labelled
 * `role="dialog"` with `aria-modal`, `useFocusTrap` traps Tab / moves focus in
 * on open / restores it on close, and Escape routes to `onEscape`. The visible
 * `<h2>` supplies the accessible name via `aria-labelledby`.
 *
 * The in-game change-story overlay (`Landing.tsx`) is intentionally NOT built on
 * this — it is a full plate, not a centered card — but it shares `useFocusTrap`
 * for the same reason.
 */
export function Modal({
  open,
  titleId,
  title,
  onEscape,
  children,
}: {
  open: boolean
  /** id wired to the heading; the dialog is named by it via aria-labelledby. */
  titleId: string
  title: ReactNode
  /** Invoked on Escape (consumers decide what closing means). */
  onEscape: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef, { active: open, onEscape })

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={dialogRef}
    >
      <div className="modal">
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
