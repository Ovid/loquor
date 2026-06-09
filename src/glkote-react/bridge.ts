import { reduce } from './reduce'
import { emptyView } from './types'
import type {
  GlkOteDisplay,
  GlkOteInitIface,
  GlkOteUpdate,
  ViewState,
  TurnResult,
} from './types'

const METRICS = {
  width: 80,
  height: 50,
  gridcharwidth: 1,
  gridcharheight: 1,
  buffercharwidth: 1,
  buffercharheight: 1,
  outspacingx: 0,
  outspacingy: 0,
  inspacingx: 0,
  inspacingy: 0,
  gridmarginx: 0,
  gridmarginy: 0,
  buffermarginx: 0,
  buffermarginy: 0,
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
  /** Pending awaitTurn() resolvers, drained at the next turn boundary. */
  private turnResolvers: Array<(r: TurnResult) => void> = []
  /** Latches once onEnd has fired so a trailing update can't re-fire it. */
  private endedFired = false
  /** Once disposed (e.g. a StrictMode throwaway engine), ignore VM updates. */
  private disposed = false
  /** Set by the engine; called when the VM quits. */
  onEnd?: () => void
  /**
   * Documented turn-boundary seam. Fired from update() whenever the VM issues a
   * LINE input request — i.e. a turn has completed and the game is waiting for
   * the next command. This is the canonical "a turn happened" point — an
   * OBSERVER-ONLY hook (no current caller wires it; see ZMachineOptions.onTurn).
   * Note: the NL layer does NOT intercept input here — it does so upstream at
   * CommandInput.onSubmit → nl.translate, using the bridge's echoLocal() seam.
   *
   * NOTE: it does NOT itself perform the autosave. The save is done natively by
   * ifvms+glkapi (do_vm_autosave: true → glkapi.update() → check_autosave() →
   * VM.do_autosave(eventarg)), which fires at this exact same boundary. Having
   * onTurn call do_autosave here too would double-save (and with different arg
   * semantics). So onTurn is purely the observable seam. See engine.ts boot().
   */
  onTurn?: () => void
  /**
   * The Dialog glkapi asks for via getlibrary('Dialog') during save_allstate
   * (it reads Dialog.streaming for any open File streams). Set by the engine.
   */
  dialog?: unknown
  private onState: (v: ViewState) => void

  constructor(onState: (v: ViewState) => void) {
    this.onState = onState
  }

  init(iface: GlkOteInitIface) {
    this.accept = iface.accept as (e: any) => void
    this.accept({ type: 'init', gen: 0, metrics: METRICS })
  }

  /** Stop responding to VM updates. Used to silence a throwaway engine. */
  dispose() {
    this.disposed = true
  }

  update(arg: GlkOteUpdate) {
    if (this.disposed) return
    if (typeof arg.gen === 'number') this.gen = arg.gen
    const req = (arg.input ?? []).find(
      (i: any) => i.type === 'line' || i.type === 'char',
    )
    if (req) this.mainWindow = (req as any).id as number
    // Only reclassify the prompt when this update actually carries an `input`
    // field. A content-only update (no `input`) leaves inputRequest untouched in
    // the reducer; recomputing here would reset charIsMore to false and desync
    // it from a still-pending char prompt.
    if (arg.input !== undefined)
      this.charIsMore = (req as any)?.type === 'char' && isMorePrompt(arg)
    this.view = reduce(this.view, arg)
    this.onState(this.view)
    // Turn boundary handling. The line path still fires onTurn AFTER onState so
    // observers see the settled view; the native autosave fires here too.
    const reqType = (req as { type?: string } | undefined)?.type
    if (reqType === 'line') {
      this.onTurn?.()
      this.resolveTurn('line')
    } else if (reqType === 'char' && this.charIsMore) {
      // Page through MORE transparently, but only when a sequence is awaiting a
      // turn — otherwise leave the existing (Terminal-effect) MORE handling alone.
      if (this.turnResolvers.length > 0) this.ackMore()
    } else if (this.awaitingKey()) {
      // A genuine single-key prompt: no clean line boundary for a next command.
      this.resolveTurn('key')
    }
    // `ended` latches true in the reducer, so guard against re-firing onEnd on
    // every subsequent update.
    if (this.view.ended && !this.endedFired) {
      this.endedFired = true
      this.onEnd?.()
      this.resolveTurn('end')
    }
  }

  getlibrary(name: string): unknown {
    return name === 'Dialog' ? (this.dialog ?? null) : null
  }

  /**
   * Native-autosave display state. glkapi's save_allstate() embeds this as
   * snapshot.glk.glkote; on restore glkapi stashes it and passes it back to our
   * update() (second arg) for the first post-restore frame. We rebuild the React
   * ViewState from that update()'s content, so only the metrics need to survive
   * the round-trip. Must be JSON-serializable. See engine.ts boot() for the full
   * autosave mechanism description.
   */
  save_allstate(): unknown {
    return { metrics: METRICS }
  }
  restore_allstate(_state: unknown): void {
    // Never called by the vendored glkapi.js: it replays autorestore state via
    // the second arg of update() (glkapi.js:781), not through this method. Kept
    // as a no-op only for shape-compatibility with the stock glkote.js fallback.
  }

  log(_msg: string) {}
  warning(_msg: string) {}
  error(msg: string) {
    console.error('[glk]', msg)
  }

  sendLine(text: string) {
    this.accept?.({
      type: 'line',
      gen: this.gen,
      window: this.mainWindow,
      value: text,
    })
  }

  /**
   * Append a UI-only "source" line (the player's literal English) to ViewState
   * WITHOUT sending anything to the VM. The reducer seeds its accumulator from
   * the prior lines, so this line is carried inertly through later updates while
   * the VM's own `input` echo and output append after it. The future LLM layer's
   * only input-side bridge addition.
   */
  echoLocal(text: string) {
    const id = this.view.nextId
    this.view = {
      ...this.view,
      lines: [...this.view.lines, { id, kind: 'nl-source', text }],
      nextId: id + 1,
    }
    this.onState(this.view)
  }

  /**
   * Satisfies a char-input request — either a [MORE] auto-ack or the player's
   * genuine keystroke. See charIsMore for the discrimination logic.
   */
  sendChar(key: string) {
    this.accept?.({
      type: 'char',
      gen: this.gen,
      window: this.mainWindow,
      value: key,
    })
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

  /**
   * Resolve at the next turn boundary with the settled view and how it ended
   * (locked decision 8). Registers a resolver that update() drains. Used by the
   * NL compound-command loop to wait one clause's turn before issuing the next.
   */
  awaitTurn(): Promise<TurnResult> {
    return new Promise<TurnResult>(resolve => {
      this.turnResolvers.push(resolve)
    })
  }

  /** Drain and settle all pending awaitTurn() resolvers with the current view. */
  private resolveTurn(reason: TurnResult['reason']) {
    if (this.turnResolvers.length === 0) return
    const resolvers = this.turnResolvers
    this.turnResolvers = []
    const result: TurnResult = { view: this.view, reason }
    for (const resolve of resolvers) resolve(result)
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
