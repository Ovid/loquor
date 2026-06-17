/** Turn a story-load failure into a message that names WHY it failed, not just
 *  that it did (review #2). `fetch` REJECTS (TypeError) when the request never
 *  completes — server down, offline, DNS/CORS — which a bare "try again" hid
 *  behind the same copy as a genuinely missing file. Every branch keeps the
 *  "could not be loaded" stem so the UI copy stays recognizable. */
export function describeLoadError(title: string, err: unknown): string {
  const stem = `“${title}” could not be loaded`
  const msg = err instanceof Error ? err.message : String(err)
  // A rejected fetch (vs. an ok:false response) means the file was never
  // reached. The browser surfaces this as a TypeError ("Failed to fetch").
  if (
    err instanceof TypeError ||
    /failed to fetch|networkerror|load failed/i.test(msg)
  )
    // Player-facing wording, not "Is the server running?" dev-speak (m5); the
    // cause distinction (unreachable vs missing vs server error) from review #2
    // is preserved, and the raw error is still logged by the caller.
    return `${stem}: the game file couldn’t be reached — you may be offline.`
  const http = msg.match(/HTTP (\d+)/)
  if (http)
    return http[1] === '404'
      ? `${stem}: the game file is missing (HTTP 404).`
      : `${stem}: the server returned an error (HTTP ${http[1]}).`
  if (/too short to be a game/i.test(msg))
    return `${stem}: the file isn’t a valid game.`
  return `${stem}. Please try again.`
}
