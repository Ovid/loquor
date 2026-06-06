import { ZVM } from 'ifvms'
// Deep CJS import of ifvms's Glk-dispatch class. Importing { ZVM } from 'ifvms'
// is supposed to run dispatch.js's `window.GiDispa = new ZVMDispatch()`
// side-effect, but under vitest's jsdom + Vite transform that branch does not
// register window.GiDispa reliably, so we construct the instance ourselves from
// this class. `module.exports = ZVMDispatch` → esbuild exposes it as default.
import ZVMDispatch from 'ifvms/src/zvm/dispatch.js'
import { getGlk } from './glk'
import { GlkOteBridge } from '../glkote-react/bridge'
import type { ViewState } from '../glkote-react/types'

/**
 * ZVM's native autosave Dialog contract (subset we use). Task 2.3 wires the
 * IndexedDB-backed implementation; for the boot-only gate any object with these
 * methods (or a no-op stub) suffices.
 */
export interface Dialog {
  streaming: boolean
  autosave_read(signature: string): unknown
  autosave_write(signature: string, snapshot: unknown): void
  [k: string]: unknown
}

export interface ZMachineOptions {
  dialog: Dialog
  onState: (v: ViewState) => void
  onEnd?: () => void
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

  constructor(opts: ZMachineOptions) {
    this.opts = opts
    this.bridge = new GlkOteBridge(opts.onState)
    this.bridge.onEnd = opts.onEnd
  }

  async boot(storyBytes: Uint8Array): Promise<void> {
    const Glk = getGlk()
    this.vm = new ZVM()

    // --- GiDispa: the ifvms Glk-dispatch layer ---------------------------
    // ifvms's dispatch.js registers `window.GiDispa = new ZVMDispatch()` at
    // import time, but under vitest's jsdom + Vite transform that side-effect
    // does not register window.GiDispa reliably. So prefer the registered
    // instance and otherwise construct one from the deep-imported class. Both
    // paths yield the same ZVMDispatch instance the VM expects.
    const Dispatch: any = (ZVMDispatch as any)?.default ?? ZVMDispatch
    const GiDispa: any = (window as any).GiDispa ?? new Dispatch()

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
      // do_vm_autosave wired in Task 2.3 — omitted here so glkapi does not call
      // GiDispa.check_autosave during the boot-only gate.
    }

    this.vm.prepare(storyBytes, options)
    // bridge.init (called by Glk.init) fires the startup {type:'init'} event,
    // which runs the VM and flushes the first update(s) through onState.
    Glk.init(options)
  }

  sendLine(text: string) {
    this.bridge.sendLine(text)
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
}
