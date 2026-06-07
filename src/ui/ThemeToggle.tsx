export function ThemeToggle({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      className="themebtn"
      onClick={onToggle}
      aria-label="Toggle light/dark"
    >
      ☾ / ☀
    </button>
  )
}
