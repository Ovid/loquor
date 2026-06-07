import type { BufferLine, GlkOteUpdate, StatusLine, ViewState } from './types'

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

/** The style name of a run is its first (even-index) element. */
function firstStyle(content: unknown[]): string | undefined {
  return typeof content[0] === 'string' ? (content[0] as string) : undefined
}

/**
 * An accumulating buffer line: its display text, whether it is an echoed player
 * command (run style `"input"`), and the BufferLine it carried in the previous
 * state (so ids stay stable across `append`-driven mutations).
 */
interface Para {
  text: string
  input: boolean
  prev?: BufferLine
}

/**
 * Given a buffer content entry (`c.text[]`), fold its paragraphs into the
 * accumulating line list, honoring:
 *   - `append:true` — merge text onto the previous emitted line;
 *   - run style `"input"` — the line is an echoed command. It arrives appended
 *     onto the bare `">"` prompt; we replace that prompt with the command alone
 *     (the caret renders the `">"`) and mark the line `input`.
 */
function bufferParagraphs(
  c: Record<string, unknown>,
  previous: Para[],
): Para[] {
  const paragraphs = (c.text ?? []) as Array<Record<string, unknown>>
  const emitted = previous.slice()

  for (const para of paragraphs) {
    // An empty entry {} is a blank line
    if (!para.content) {
      emitted.push({ text: '', input: false })
      continue
    }

    const content = para.content as unknown[]
    const text = joinRunText(content)
    const isInput = firstStyle(content) === 'input'
    const last = emitted[emitted.length - 1]
    // A locally-injected nl-source line (the player's English) is the buffer tail
    // the VM never knows about. Its append:true echo was meant to merge onto the
    // VM's bare ">" prompt, so merging onto the nl-source line instead would
    // corrupt it (review I3). Push the echo as a NEW line and leave nl-source be.
    const lastIsNlSource = last?.prev?.kind === 'nl-source'

    if (isInput && para.append && last && last.text.trim() === '>') {
      // Echoed command: drop the prompt char, keep the command, mark as input.
      emitted[emitted.length - 1] = { text, input: true, prev: last.prev }
    } else if (para.append && last && !lastIsNlSource) {
      // Merge onto the previous line (preserving its identity/input flag).
      emitted[emitted.length - 1] = {
        text: last.text + text,
        input: last.input || isInput,
        prev: last.prev,
      }
    } else {
      emitted.push({ text, input: isInput })
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
  let { status, inputRequest, ended, nextId } = prev
  const { lines } = prev

  // Seed the accumulator from the previous lines, carrying each line's identity
  // so append-driven edits keep stable React keys.
  let paras: Para[] = lines.map(l => ({
    text: l.text,
    input: l.kind === 'input',
    prev: l,
  }))

  for (const c of update.content ?? []) {
    const entry = c as Record<string, unknown>

    if (Array.isArray(entry.lines)) {
      // Grid (status) window — has a `lines[]` array
      const parsed = parseStatus(entry)
      if (parsed !== null) status = parsed
    } else if (Array.isArray(entry.text)) {
      // Buffer (main transcript) window — has a `text[]` array.
      // glk_window_clear sets clear:true (glkapi.js:600-608) — drop the prior
      // transcript (and its prev refs) so RESTART/screen-clears start fresh.
      if (entry.clear) paras = []
      paras = bufferParagraphs(entry, paras)
    }
  }

  // Convert to BufferLine objects, reusing the previous object when a line is
  // unchanged (stable identity) and assigning a fresh id only to genuinely new
  // lines. An `input` line is an echoed command regardless of its text shape.
  // UI-only kinds (e.g. 'nl-source') are carried inertly — the VM never touches
  // them, so we preserve their original kind rather than reclassifying.
  const newLines: BufferLine[] = paras.map(p => {
    const kind = p.input
      ? 'input'
      : p.prev?.kind === 'nl-source'
        ? 'nl-source'
        : classify(p.text)
    if (p.prev && p.prev.text === p.text && p.prev.kind === kind) return p.prev
    return { id: p.prev ? p.prev.id : nextId++, kind, text: p.text }
  })

  // Input request: last one wins (Zork I only ever has one).
  if (update.input !== undefined) {
    if (update.input.length === 0) {
      inputRequest = null
    } else {
      // Non-empty input: adopt a line/char request if present, but if it holds
      // only other request shapes (hyperlink/mouse), leave inputRequest as-is —
      // the VM is still waiting, so we must not clear a pending line/char.
      const req = update.input.find(
        (i: Record<string, unknown>) => i.type === 'line' || i.type === 'char',
      )
      if (req) {
        inputRequest = req.type as 'line' | 'char'
        // A fresh line-input request means the game is alive and asking for a
        // command — an in-place RESTART after death lands here, so unlatch
        // `ended` rather than leaving the restarted game flagged as over.
        if (req.type === 'line') ended = false
      }
    }
  }

  // disable:true suppresses any input request (redundant with exit, but safe)
  if (update.disable) inputRequest = null

  // End-of-game is keyed off the observed `exit` marker (PROTOCOL-NOTES §"End-of-game signal")
  if (isEndOfGame(update)) {
    inputRequest = null
    ended = true
  }

  return { status, lines: newLines, inputRequest, ended, nextId }
}
