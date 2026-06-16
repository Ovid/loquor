import { useEffect, useRef, useState, type RefObject } from 'react'

export function CommandInput({
  onSubmit,
  disabled = false,
  awaitingKey = false,
  awaitingLine = false,
  onKey,
  inputRef,
}: {
  onSubmit: (text: string) => void
  disabled?: boolean
  /** When true, a single keystroke satisfies a pending char-input prompt. */
  awaitingKey?: boolean
  /** True while the VM is waiting for a typed command (a turn boundary). */
  awaitingLine?: boolean
  onKey?: (key: string) => void
  /** Shared ref so the transcript can refocus the prompt on click. */
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const internalRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? internalRef
  const [value, setValue] = useState('')

  // Keep focus on the prompt whenever the VM awaits a line AND the field is
  // enabled, so the player can keep typing without clicking back in. `disabled`
  // is a dependency on purpose: while the NL layer translates, the field is
  // disabled (pending) and the browser blurs it; awaitingLine does not transition
  // across that, so re-focusing only on awaitingLine would never restore focus
  // when the field re-enables. Focusing a disabled field is a no-op, so the
  // !disabled guard avoids a wasted focus() call during the pending window.
  useEffect(() => {
    if (awaitingLine && !disabled) ref.current?.focus()
  }, [awaitingLine, disabled, ref])

  return (
    <form
      className="inputline"
      onSubmit={e => {
        e.preventDefault()
        const command = value.trim()
        if (!command) return
        onSubmit(command)
        setValue('')
      }}
    >
      <span className="car">&gt;</span>
      <input
        ref={ref}
        className="cmd"
        value={value}
        disabled={disabled}
        autoFocus
        aria-label="Game command"
        placeholder="type a command…"
        onKeyDown={e => {
          if (awaitingKey && onKey && e.key.length === 1) {
            e.preventDefault()
            onKey(e.key)
          }
        }}
        onChange={e => setValue(e.target.value)}
      />
    </form>
  )
}
