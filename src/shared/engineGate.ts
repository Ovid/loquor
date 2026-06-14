// Priority mutex over the single shared WebLLM engine (output-translation
// spec §6): one generation at a time; queued INPUT work always starts before
// queued OUTPUT work — input latency is felt at the prompt, while a shimmering
// transcript line is designed to be visibly pending. The gate never aborts an
// in-flight task; preemption is strictly about who starts NEXT.
//
// Handoff invariant: when a waiter exists the gate is handed off directly
// (busy stays true) so no run() call arriving in the microtask window between
// the holder finishing and the waiter resuming can observe a free gate.
export type GatePriority = 'input' | 'output'

export class EngineGate {
  private busy = false
  private waiters: Array<{ p: GatePriority; start: () => void }> = []

  async run<T>(p: GatePriority, fn: () => Promise<T>): Promise<T> {
    if (this.busy) {
      await new Promise<void>(res => this.waiters.push({ p, start: res }))
    }
    this.busy = true
    try {
      return await fn()
    } finally {
      const i = this.waiters.findIndex(w => w.p === 'input')
      const next = i >= 0 ? this.waiters.splice(i, 1)[0] : this.waiters.shift()
      if (next)
        next.start() // hand off: gate stays busy — no free window
      else this.busy = false
    }
  }
}
