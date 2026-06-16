import { useEffect, useRef } from 'react'
import type { LoadProgress } from '../llm/types'
import { pct as toPct, formatEta } from '../llm/progress'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

export function ModelDownloadModal({
  open,
  progress,
  etaSeconds = null,
  onAccept,
  onDecline,
  onCancel,
}: {
  open: boolean
  progress: LoadProgress | null
  /** Estimated seconds remaining for the download (computed by the NL hook), or
   * null when not yet estimable. */
  etaSeconds?: number | null
  onAccept: () => void
  onDecline: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Modal focus management (2.4.3): on open, move focus into the dialog and
  // remember what had it; on close/unmount, restore focus to the trigger. Keyed
  // on `open` and placed before the early return so the hook runs every render.
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    return () => previouslyFocused?.focus?.()
  }, [open])

  if (!open) return null
  const downloading = progress !== null
  const pct = progress ? toPct(progress.loaded, progress.total) : 0
  const eta = formatEta(etaSeconds)

  // Escape dismisses (Cancel while downloading, else Not now); Tab cycles within
  // the dialog so focus can't escape into the obscured game (aria-modal alone
  // doesn't trap DOM focus).
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      ;(downloading ? onCancel : onDecline)()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = [
      ...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ]
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

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nl-modal-title"
      ref={dialogRef}
      onKeyDown={onKeyDown}
    >
      <div className="modal">
        <h2 id="nl-modal-title">Natural-language input</h2>
        <p>
          The first time, this fetches a language model (a sizable, one-time
          download) from third-party hosts: the model weights from Hugging Face
          and a small support library from GitHub. After that it runs entirely
          on your device — offline and private — and is cached, so it is not
          downloaded again.
        </p>
        {downloading ? (
          <>
            <progress
              value={pct}
              max={100}
              aria-label="Model download progress"
            />
            <p aria-live="polite">
              {pct}% — {progress!.text}
              {eta ? ` · ${eta}` : ''}
            </p>
            <button className="sw" type="button" onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <div className="modal-actions">
            <button className="sw" type="button" onClick={onAccept}>
              Download &amp; enable
            </button>
            <button className="sw" type="button" onClick={onDecline}>
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
