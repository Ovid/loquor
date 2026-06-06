import type { BufferLine, GlkOteUpdate, StatusLine, ViewState } from './types'

let nextId = 1

// --- Helpers -----------------------------------------------------------------

/**
 * Join the ODD-indexed elements of a flat alternating [style, text, ...] array.
 * Even indices are style names; odd indices are the text strings we want.
 * Gracefully handles an empty array or malformed input.
 */
function joinRunText(content: unknown[]): string {
  let result = ''
  for (let i = 1; i < content.length; i += 2) {
    const part = content[i]
    if (typeof part === 'string') result += part
  }
  return result
}

/**
 * Given a buffer content entry (`c.text[]`), yield lines as strings, honoring
 * `append:true` by merging the text onto the previous emitted line rather than
 * starting a new one.
 */
function bufferParagraphs(
  c: Record<string, unknown>,
  previousLines: string[],
): string[] {
  const paragraphs = (c.text ?? []) as Array<Record<string, unknown>>
  const emitted = previousLines.slice()

  for (const para of paragraphs) {
    // An empty entry {} is a blank line
    if (!para.content) {
      emitted.push('')
      continue
    }

    const content = para.content as unknown[]
    const text = joinRunText(content)

    if (para.append && emitted.length > 0) {
      // Merge onto the last line
      emitted[emitted.length - 1] = emitted[emitted.length - 1] + text
    } else {
      emitted.push(text)
    }
  }

  return emitted
}

/**
 * Parse a grid content entry (`c.lines[]`) into a flat status string, then
 * split it into `{ location, right }` on the first run of 2+ consecutive spaces.
 * After trimming, if no 2+ space gap exists, the whole text is `location`
 * with empty `right`.
 */
function parseStatus(c: Record<string, unknown>): StatusLine | null {
  const gridLines = (c.lines ?? []) as Array<{
    line: number
    content: unknown[]
  }>
  if (gridLines.length === 0) return null

  // Concatenate all row texts (usually just row 0 for Zork v3)
  const full = gridLines
    .map(gl => joinRunText(gl.content ?? []))
    .join(' ')
    .trim()

  // Split on first run of 2+ spaces
  const match = full.match(/^(.*?)\s{2,}(.*)$/)
  if (match) {
    return {
      location: match[1].trim(),
      right: match[2].trim(),
    }
  }

  return { location: full, right: '' }
}

/**
 * Classify a line of text as 'room', 'input', or 'output'.
 * Room headings are short, start with a capital letter, and have no terminal
 * punctuation. Style-based 'input' classification is not reliable from text
 * alone here, so we only detect 'room'; everything else is 'output'.
 */
function classify(text: string): BufferLine['kind'] {
  if (/^[A-Z][^.!?]{2,40}$/.test(text.trim())) return 'room'
  return 'output'
}

/**
 * Detect end-of-game.
 * Per PROTOCOL-NOTES.md §"End-of-game signal", the exit update carries
 * `exit: true` (alongside `disable: true` and `input: []`). We key off the
 * most explicit marker.
 */
function isEndOfGame(update: GlkOteUpdate): boolean {
  return update.exit === true
}

// --- Reducer -----------------------------------------------------------------

/**
 * Pure reducer: folds one GlkOte `update` object into the current ViewState.
 * Never mutates `prev`.
 *
 * Window discrimination (per PROTOCOL-NOTES.md):
 *   - `windows` is only sent when the layout changes; it is null on every
 *     subsequent update. We discriminate by CONTENT ENTRY SHAPE:
 *     - entry has `lines[]` → grid (status) window
 *     - entry has `text[]`  → buffer (main transcript) window
 */
export function reduce(prev: ViewState, update: GlkOteUpdate): ViewState {
  let { status, lines, inputRequest, ended } = prev

  // Build the new lines list from the previous one, tracking strings so we
  // can honour append:true before converting to BufferLine objects.
  let lineTexts = lines.map(l => l.text)

  for (const c of update.content ?? []) {
    const entry = c as Record<string, unknown>

    if (Array.isArray(entry.lines)) {
      // Grid (status) window — has a `lines[]` array
      const parsed = parseStatus(entry)
      if (parsed !== null) status = parsed
    } else if (Array.isArray(entry.text)) {
      // Buffer (main transcript) window — has a `text[]` array
      lineTexts = bufferParagraphs(entry, lineTexts)
    }
  }

  // Convert string array to BufferLine objects, assigning new ids only for
  // lines that are genuinely new (beyond the previous count).
  const prevCount = lines.length
  const newLines: BufferLine[] = lineTexts.map((text, i) => {
    if (i < prevCount) {
      // Preserve the existing BufferLine (might have been mutated by append)
      // but refresh text if append changed the last line.
      const prev = lines[i]
      if (prev.text === text) return prev
      // Last line may have changed due to append — create a fresh object.
      return { id: prev.id, kind: prev.kind, text }
    }
    return { id: nextId++, kind: classify(text), text }
  })

  // Input request: last one wins (Zork I only ever has one).
  if (update.input !== undefined) {
    if (update.input.length === 0) {
      inputRequest = null
    } else {
      const req = update.input.find(
        (i: Record<string, unknown>) => i.type === 'line' || i.type === 'char',
      )
      inputRequest = (req?.type as 'line' | 'char' | undefined) ?? null
    }
  }

  // disable:true suppresses any input request (redundant with exit, but safe)
  if (update.disable) inputRequest = null

  // End-of-game is keyed off the observed `exit` marker (PROTOCOL-NOTES §"End-of-game signal")
  if (isEndOfGame(update)) {
    inputRequest = null
    ended = true
  }

  return { status, lines: newLines, inputRequest, ended }
}
