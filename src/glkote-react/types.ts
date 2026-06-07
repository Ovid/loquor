/** One rendered line in the main (buffer) window. */
export interface BufferLine {
  id: number
  kind: 'output' | 'input' | 'room' | 'nl-source'
  text: string
}

/** Parsed status line (Z-machine v3 status window: location + score/moves). */
export interface StatusLine {
  location: string
  right: string // e.g. "Score: 0   Moves: 1" — raw right-hand text
}

/** What the UI renders. Produced by the reducer from GlkOte 'update' objects. */
export interface ViewState {
  status: StatusLine | null
  lines: BufferLine[]
  /** What input the VM is currently waiting for, or null if running/ended. */
  inputRequest: 'line' | 'char' | null
  ended: boolean
  /**
   * Monotonic counter for the next BufferLine id, carried per stream so two
   * concurrent reducers (StrictMode / two engines) don't share a global and
   * produce coupled, non-deterministic React keys.
   */
  nextId: number
}

export const emptyView: ViewState = {
  status: null,
  lines: [],
  inputRequest: null,
  ended: false,
  nextId: 1,
}

/** The GlkOte display contract our bridge implements (subset glkapi calls). */
export interface GlkOteDisplay {
  init(iface: GlkOteInitIface): void
  update(arg: GlkOteUpdate): void
  getlibrary(name: string): unknown
  log(msg: string): void
  warning(msg: string): void
  error(msg: string): void
  extevent?(val: unknown): void
  /**
   * Capture display-layer state for ifvms's native autosave (glkapi's
   * save_allstate() stores our return value as `snapshot.glk.glkote`). Must be
   * JSON-serializable. We rebuild the React view from the post-restore update(),
   * so only the metrics need to round-trip.
   */
  save_allstate(): unknown
  /**
   * Part of the GlkOte display contract for shape-compatibility with the stock
   * glkote.js (the documented fallback). The vendored glkapi.js does NOT call
   * this — it stashes save_allstate()'s value and replays it via the second arg
   * of update() during autorestore (glkapi.js:781) — so our implementation is a
   * no-op kept only for contract completeness.
   */
  restore_allstate(state: unknown): void
}

/** glkapi passes this to GlkOte.init; `accept` receives player events. */
export interface GlkOteInitIface {
  accept(event: GlkOteEvent): void
  [k: string]: unknown
}

/** Output side of the GlkOte protocol (shape validated against captured fixtures). */
export interface GlkOteUpdate {
  type: 'update'
  gen?: number
  windows?: Array<Record<string, unknown>>
  content?: Array<Record<string, unknown>>
  input?: Array<Record<string, unknown>>
  disable?: boolean
  [k: string]: unknown
}

/** Input side of the GlkOte protocol — what we send via iface.accept. */
export type GlkOteEvent =
  | { type: 'init'; gen: number; metrics: Record<string, number> }
  | { type: 'line'; gen: number; window: number; value: string }
  | { type: 'char'; gen: number; window: number; value: string }
  | { type: 'arrange'; gen: number; metrics: Record<string, number> }
