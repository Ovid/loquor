import type { Theme } from './useTheme'

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme
  onToggle: () => void
}) {
  // Name the action by its target so the accessible name conveys current state
  // (it's an action button, not a binary state control). Glyphs are decorative.
  const target = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      className="themebtn"
      onClick={onToggle}
      aria-label={`Switch to ${target} theme`}
    >
      <span aria-hidden="true">☾ / ☀</span>
    </button>
  )
}
