import type { LoadProgress } from '../llm/types'
import { pct as toPct } from '../llm/progress'

export function ModelDownloadModal({
  open,
  progress,
  onAccept,
  onDecline,
  onCancel,
}: {
  open: boolean
  progress: LoadProgress | null
  onAccept: () => void
  onDecline: () => void
  onCancel: () => void
}) {
  if (!open) return null
  const downloading = progress !== null
  const pct = progress ? toPct(progress.loaded, progress.total) : 0
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nl-modal-title"
    >
      <div className="modal">
        <h2 id="nl-modal-title">Natural-language input</h2>
        <p>
          The first time, this fetches a language model (a sizable, one-time
          download) from a third-party host (Hugging Face). After that it runs
          entirely on your device — offline and private — and is cached, so it is
          not downloaded again.
        </p>
        {downloading ? (
          <>
            <progress value={pct} max={100} />
            <p>
              {pct}% — {progress!.text}
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
