/** One rendered line in the main (buffer) window. */
export interface BufferLine {
  id: number
  kind: 'output' | 'input' | 'room'
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
}

export const emptyView: ViewState = {
  status: null,
  lines: [],
  inputRequest: null,
  ended: false,
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
