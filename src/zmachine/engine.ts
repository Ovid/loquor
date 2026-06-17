import { ZVM } from 'ifvms'
// Deep CJS import of ifvms's Glk-dispatch class. Importing { ZVM } from 'ifvms'
// is supposed to run dispatch.js's `window.GiDispa = new ZVMDispatch()`
// side-effect, but under vitest's jsdom + Vite transform that branch does not
// register window.GiDispa reliably, so we construct the instance ourselves from
// this class. `module.exports = ZVMDispatch` → esbuild exposes it as default.
import ZVMDispatch from 'ifvms/src/zvm/dispatch.js'
import { getGlk } from './glk'
import { GlkOteBridge } from '../glkote-react/bridge'
import type { ViewState, TurnResult } from '../glkote-react/types'
import { signature } from './signature'

/**
 * ZVM's native autosave Dialog contract (subset we use). Task 2.3 wires the
 * IndexedDB-backed implementation; for the boot-only gate any object with these
 * methods (or a no-op stub) suffices.
 */
export interface Dialog {
  streaming: boolean
  autosave_read(signature: string): unknown
  autosave_write(signature: string, snapshot: unknown): void
  /**
   * Warm the sync autosave cache before boot. ZVM.start() reads the autosave
   * SYNCHRONOUSLY, so an async (IndexedDB-backed) Dialog MUST declare this and
   * `boot()` awaits it first — otherwise autosave silently never resumes (F-4).
   * Optional because a no-op / in-memory stub Dialog has nothing to warm.
   */
  preload?(signature: string): Promise<void>
  /** Whether a settled autosave exists; `flushAutosave()` polls this. Optional. */
  hasSave?(signature: string): Promise<boolean>
  /** Stop persisting FUTURE writes when the owning engine is torn down. Optional. */
  dispose?(): void
}

export interface ZMachineOptions {
  dialog: Dialog
  onState: (v: ViewState) => void
  onEnd?: () => void
  /**
   * Optional turn-boundary observer (fired on each line-input request). The
   * autosave itself is performed natively (see boot); this is just the seam.
   */
  onTurn?: () => void
}

/**
 * Engine façade owning the VM (ifvms ZVM) + the vendored Glk singleton + our
 * GlkOte→React bridge, plus the boot lifecycle.
 *
 * Pipeline: player input ─► GlkOteBridge ─► Glk (vendored glkapi.js) ─► ZVM,
 * and game output back the other way (Glk calls bridge.update → reducer →
 * onState). See CLAUDE.md "Architecture".
 */
export class ZMachine {
  private vm: any
  private bridge: GlkOteBridge
  private opts: ZMachineOptions
  private signature = ''

  constructor(opts: ZMachineOptions) {
    this.opts = opts
    this.bridge = new GlkOteBridge(opts.onState)
    this.bridge.onEnd = opts.onEnd
    this.bridge.onTurn = opts.onTurn
  }

  /**
   * Boot the VM with native per-game autosave enabled. Returns the story
   * signature (the per-game autosave key).
   *
   * Autosave mechanism (all native to ifvms + the vendored glkapi — we add NO
   * manual do_autosave calls):
   *  - RESTORE on boot: with `do_vm_autosave: true`, ZVM.start() synchronously
   *    calls Dialog.autosave_read(signature) and, if a snapshot exists,
   *    do_autorestore()s it. Because that read is SYNCHRONOUS but our Dialog is
   *    IndexedDB-backed, we MUST `await dialog.preload(signature)` first so the
   *    sync cache is warm.
   *  - SAVE on turn: glkapi.update() (called after every VM run) checks
   *    `option_do_vm_autosave` and, when GiDispa.check_autosave() is truthy
   *    (i.e. !vm.glk_blocking_call — the line-input wait / turn boundary), calls
   *    VM.do_autosave(eventarg). runtime.do_autosave saves when its arg >= 0.
   *  - CLEAR on quit: when the VM has exited, glkapi.update() calls
   *    VM.do_autosave(-1); a negative arg writes a null snapshot, clearing the
   *    slot, so a finished game does not auto-resume.
   * The bridge's onTurn hook fires at the same line-input boundary purely as the
   * documented seam; it does NOT call do_autosave (that would double-save).
   *
   * Each save embeds the bridge's `save_allstate()` (the rendered transcript tail,
   * capped at SNAPSHOT_MAX_LINES) as `snapshot.glk.glkote`, so the UI-only
   * nl-source / nl-canonical kinds survive a reload; glkapi hands it back on the
   * first post-restore `update(arg.autorestore)`. See bridge.save_allstate().
   */
  async boot(storyBytes: Uint8Array): Promise<string> {
    const Glk = getGlk()
    this.vm = new ZVM()
    // ifvms uses the story bytes as the VM's LIVE, mutable Z-machine memory
    // (file.identify → MemoryView wraps the same ArrayBuffer; it does not copy),
    // and start()/restart() writes interpreter bits into the header — including
    // Flags 1 at byte 0x01, which is inside the 0x1E-byte autosave signature.
    // The app fetches each story once and passes ONE Uint8Array to Terminal, so
    // under React StrictMode (and any re-boot on the same buffer) a second engine
    // would read a header already dirtied by the first, derive a DIFFERENT
    // signature, and autosave under a key no clean-boot session ever looks up —
    // i.e. "autosave silently never resumes". Boot on a PRIVATE copy so each
    // engine mutates only its own memory and the signature stays stable.
    const bytes = storyBytes.slice()
    this.signature = signature(bytes)

    // Warm the Dialog's sync cache before booting: ZVM.start() reads the
    // autosave synchronously, so the snapshot must already be cached. This
    // preload→prepare→init ordering (F-5) is temporal coupling the type system
    // can't express; if a refactor moves Glk.init() ahead of this, IdbDialog's
    // autosave_read guard (F-5/F-11) fires loudly during start() instead of
    // silently failing to resume.
    const dialog = this.opts.dialog
    if (dialog.preload) {
      await dialog.preload(this.signature)
    }
    // glkapi.save_allstate() does getlibrary('Dialog') to read Dialog.streaming.
    this.bridge.dialog = dialog

    // --- GiDispa: the ifvms Glk-dispatch layer ---------------------------
    // We construct a FRESH ZVMDispatch per boot. ifvms's dispatch.js registers a
    // `window.GiDispa = new ZVMDispatch()` singleton, but that singleton carries
    // per-session mutable state (its class_map of Glk-object disprocks and
    // last_used_id). Reusing it across boots — together with a fresh Glk
    // instance whose objects re-use those ids — corrupts the dispatch map and
    // breaks native autorestore. A fresh dispatch keeps each ZMachine isolated.
    // (Construct from the deep-imported class; default export under esbuild.)
    const Dispatch: any = (ZVMDispatch as any)?.default ?? ZVMDispatch
    const GiDispa: any = new Dispatch()

    // --- GiDispa version skew shim ---------------------------------------
    // The pinned vendored glkapi.js (erkyrath/glkote@366c8271) calls
    // GiDispa.init({ io, vm }) during Glk.init — an older dispatch contract.
    // ifvms's installed ZVMDispatch (ifvms@1.x) provides only set_vm(vm) and has
    // NO init(), so without this shim Glk.init throws "GiDispa.init is not a
    // function". See tests/fixtures/PROTOCOL-NOTES.md §"GiDispa version skew".
    if (typeof GiDispa.init !== 'function') {
      GiDispa.init = (o: any) => GiDispa.set_vm(o.vm)
    }

    const options: any = {
      vm: this.vm,
      Glk,
      GlkOte: this.bridge,
      Dialog: this.opts.dialog,
      GiDispa,
      // Enable ifvms's native autosave. This makes ZVM.start() restore-on-boot
      // (reads the preloaded snapshot), glkapi.update() save-on-turn, and
      // glkapi.update() clear-on-quit (do_autosave(-1)). See boot() doc above.
      do_vm_autosave: true,
    }

    this.vm.prepare(bytes, options)
    // bridge.init (called by Glk.init) fires the startup {type:'init'} event,
    // which runs the VM and flushes the first update(s) through onState.
    Glk.init(options)
    return this.signature
  }

  /**
   * Wait until the most recent autosave write has actually settled in
   * IndexedDB, so a freshly-booted engine can read it back. The native save is
   * fire-and-forget (Dialog.autosave_write writes to the sync cache and kicks
   * off an async IDB put), so we poll the Dialog's async read until the snapshot
   * is present. Bounded so a test can't hang. Primarily for tests/explicit
   * flushes; normal play does not need to await this.
   */
  async flushAutosave(): Promise<void> {
    const dialog = this.opts.dialog
    if (!dialog.hasSave) return
    for (let i = 0; i < 100; i++) {
      if (await dialog.hasSave(this.signature)) return
      await new Promise(r => setTimeout(r, 5))
    }
  }

  /**
   * Tear down this engine: stop the bridge responding to VM updates and stop the
   * Dialog persisting FUTURE writes (an already in-flight IDB write still
   * settles — see IdbDialog.dispose). Under React StrictMode the boot effect
   * runs twice on one shared buffer; disposing the throwaway engine in cleanup
   * keeps it from emitting state or autosaving the same IDB key behind the live
   * engine. The throwaway is disposed before it runs a turn, so its only write
   * is the identical initial snapshot — the unblocked in-flight write is benign.
   */
  dispose() {
    this.bridge.dispose()
    const dialog = this.opts.dialog
    if (dialog.dispose) dialog.dispose()
  }

  /** UI-only source-line echo (the player's English). Pass-through to the bridge. */
  echoLocal(text: string) {
    this.bridge.echoLocal(text)
  }

  sendLine(text: string) {
    this.bridge.sendLine(text)
  }

  /** Canonical (NL-translated) send — see GlkOteBridge.sendLineCanonical. */
  sendLineCanonical(text: string) {
    this.bridge.sendLineCanonical(text)
  }

  sendChar(key: string) {
    this.bridge.sendChar(key)
  }

  ackMore() {
    this.bridge.ackMore()
  }

  awaitingKey() {
    return this.bridge.awaitingKey()
  }

  /** Resolve at the next turn boundary (locked decision 8). Pass-through to the bridge. */
  awaitTurn(): Promise<TurnResult> {
    return this.bridge.awaitTurn()
  }
}
