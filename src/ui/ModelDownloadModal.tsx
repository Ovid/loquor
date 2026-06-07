import type { LoadProgress } from '../llm/types'

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
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : 0
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Natural-language input</h2>
        <p>
          This downloads a language model (a sizable, one-time download) so you
          can type plain English. It runs entirely on your device and is cached
          after the first download.
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
