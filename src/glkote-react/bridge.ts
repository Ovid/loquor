import { reduce } from './reduce'
import { emptyView } from './types'
import type { GlkOteDisplay, GlkOteInitIface, GlkOteUpdate, ViewState } from './types'

const METRICS = {
  width: 80, height: 50, gridcharwidth: 1, gridcharheight: 1,
  buffercharwidth: 1, buffercharheight: 1, outspacingx: 0, outspacingy: 0,
  inspacingx: 0, inspacingy: 0, gridmarginx: 0, gridmarginy: 0,
  buffermarginx: 0, buffermarginy: 0,
}

export class GlkOteBridge implements GlkOteDisplay {
  private accept?: (e: any) => void
  private view: ViewState = emptyView
  private gen = 0
  private mainWindow = 0
  /**
   * Whether the pending char request is a (synthetic) [MORE]/paging prompt
   * (auto-acked by ackMore()) rather than a genuine single-key prompt (routed
   * to the player via sendChar()).
   *
   * Per tests/fixtures/PROTOCOL-NOTES.md §"MORE-vs-genuine-key char
   * discrimination: DOES NOT EXIST at this layer": glkapi never emits paging
   * char requests; Zork I–III are line-input games and never issue a `char`
   * request at all. Therefore a `char` request that arrives from a real game is
   * ALWAYS a genuine single-key prompt — awaitingKey() returns true and it is
   * satisfied by sendChar().
   *
   * The synthetic `more: true` field in the update (never set by the real VM)
   * lets the unit test exercise the auto-ack code path and keeps it available
   * for a future display-injected [MORE] marker if the UI ever needs it.
   */
  private charIsMore = false
  /** Set by the engine; called when the VM quits. */
  onEnd?: () => void
  private onState: (v: ViewState) => void

  constructor(onState: (v: ViewState) => void) {
    this.onState = onState
  }

  init(iface: GlkOteInitIface) {
    this.accept = iface.accept as (e: any) => void
    this.accept({ type: 'init', gen: 0, metrics: METRICS })
  }

  update(arg: GlkOteUpdate) {
    if (typeof arg.gen === 'number') this.gen = arg.gen
    const req = (arg.input ?? []).find((i: any) => i.type === 'line' || i.type === 'char')
    if (req) this.mainWindow = (req as any).id as number
    this.charIsMore = (req as any)?.type === 'char' && isMorePrompt(arg)
    this.view = reduce(this.view, arg)
    this.onState(this.view)
    if (this.view.ended) this.onEnd?.()
  }

  getlibrary(_name: string): unknown { return null }
  log(_msg: string) {}
  warning(_msg: string) {}
  error(msg: string) { console.error('[glk]', msg) }

  sendLine(text: string) {
    this.accept?.({ type: 'line', gen: this.gen, window: this.mainWindow, value: text })
  }

  /**
   * Satisfies a char-input request — either a [MORE] auto-ack or the player's
   * genuine keystroke. See charIsMore for the discrimination logic.
   */
  sendChar(key: string) {
    this.accept?.({ type: 'char', gen: this.gen, window: this.mainWindow, value: key })
  }

  /**
   * Auto-acknowledge a pending (synthetic) [MORE] prompt with a space. No-ops
   * for a genuine single-key request (which must be answered via sendChar).
   * Per PROTOCOL-NOTES.md, real glkapi/Zork I–III never emit paging char
   * requests, so this path is only exercised by tests and future display-owned
   * MORE markers.
   */
  ackMore() {
    if (this.view.inputRequest === 'char' && this.charIsMore) this.sendChar(' ')
  }

  /**
   * True when a genuine single-key prompt (not a synthetic MORE) is pending,
   * meaning the player must press a key (satisfied via sendChar).
   */
  awaitingKey(): boolean {
    return this.view.inputRequest === 'char' && !this.charIsMore
  }
}

/**
 * True when a char-input request is a [MORE]/paging prompt. Per
 * tests/fixtures/PROTOCOL-NOTES.md §"MORE-vs-genuine-key char discrimination:
 * DOES NOT EXIST at this layer", glkapi does NOT emit paging requests and Zork
 * I–III never request char input, so real updates NEVER satisfy this — a
 * genuine char request always routes to the input box (awaitingKey() = true).
 * The synthetic `more` marker keeps the auto-ack path available/testable for a
 * future display-injected MORE marker.
 */
function isMorePrompt(u: GlkOteUpdate): boolean {
  return (u as { more?: boolean }).more === true
}
