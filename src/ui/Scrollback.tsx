import { useEffect, useRef, type ReactNode } from 'react'
import type { DisplayLine } from '../translate/useOutputTranslation'

export function Scrollback({
  lines,
  onActivate,
  children,
}: {
  lines: DisplayLine[]
  /** Focus the prompt when the player clicks into the transcript. */
  onActivate?: () => void
  /** The inline command prompt, rendered at the end of the transcript. */
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo?.(0, ref.current.scrollHeight)
  }, [lines])

  // The game prints a bare '>' to the buffer as its line-input prompt. The
  // inline CommandInput already shows that prompt, so the bare-'>' lines are
  // redundant — drop them. (Historical echoes like '>open mailbox' are never
  // bare, so they survive.) Filter on kind too, so a (pathological) nl-source
  // line whose English is literally '>' is not swallowed (review S13).
  const visible = lines.filter(
    l => l.kind === 'nl-source' || l.text.trim() !== '>',
  )

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
      {visible.map(l => (
        <p
          key={l.id}
          className={
            (l.kind === 'room'
              ? 'room'
              : l.kind === 'input'
                ? 'echo'
                : l.kind === 'nl-source'
                  ? 'nl-source'
                  : '') + (l.pending ? ' xl-pending' : '')
          }
        >
          {l.kind === 'input' ? (
            <>
              <span className="car">&gt;</span> {l.text}
            </>
          ) : l.kind === 'nl-source' ? (
            <>
              <span className="you">you</span> {l.text}
            </>
          ) : (
            l.text
          )}
        </p>
      ))}
      {children}
    </div>
  )
}
