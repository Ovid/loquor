import { useState } from 'react'

export function CommandInput({
  onSubmit,
  disabled,
  awaitingKey = false,
  onKey,
}: {
  onSubmit: (text: string) => void
  disabled: boolean
  /** When true, a single keystroke satisfies a pending char-input prompt. */
  awaitingKey?: boolean
  onKey?: (key: string) => void
}) {
  const [value, setValue] = useState('')
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
