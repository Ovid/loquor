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

  // Return focus to the prompt at each turn boundary (after the engine has
  // processed the previous command) so the player can keep typing without
  // clicking back into the field.
  useEffect(() => {
    if (awaitingLine) ref.current?.focus()
  }, [awaitingLine, ref])

  return (
    <form
      className="inputline"
      onSubmit={e => {
        e.preventDefault()
        if (!value.trim()) return
        onSubmit(value)
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
