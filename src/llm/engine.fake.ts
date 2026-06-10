import type { ChatMessages, LlmEngine, LoadProgress } from './types'
import { ABSTAIN } from './translate'

export interface FakeOptions {
  completions?: Record<string, string>
  default?: string
  progress?: LoadProgress[]
  failLoad?: boolean
  failGenerate?: boolean
  /** Delay generate() by this many ms (use with fake timers to test the watchdog). */
  generateDelayMs?: number
  /** Simulate a model already present in the on-disk cache (cross-reload). */
  cached?: boolean
}

export class FakeLlmEngine implements LlmEngine {
  private loaded = false
  private opts: FakeOptions
  /** generate() invocation count — the UAT regression suite (Task 24) asserts
   * deterministic pipeline stages never consult the model. */
  generateCalls = 0
  constructor(opts: FakeOptions = {}) {
    this.opts = opts
  }

  async isCached(): Promise<boolean> {
    return this.opts.cached === true || this.loaded
  }

  async load(
    onProgress: (p: LoadProgress) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (this.opts.failLoad) throw new Error('fake load failure')
    for (const p of this.opts.progress ?? []) {
      if (signal.aborted) throw new DOMException('aborted', 'AbortError')
      onProgress(p)
    }
    // Re-check after the progress loop (mirrors WebLlmEngine's post-create
    // check): with no progress entries, an abort mid-load would otherwise slip
    // through and report a successful load.
    if (signal.aborted) throw new DOMException('aborted', 'AbortError')
    this.loaded = true
  }

  async generate(
    prompt: ChatMessages,
    _grammar: string | null,
    signal?: AbortSignal,
  ): Promise<string> {
    this.generateCalls++
    // Faithful to WebLlmEngine: generating before the weights are in memory
    // throws. A cached model auto-restored to 'on' across a page reload is NOT
    // loaded until load() runs this session, so the hook must load before it
    // generates — this models that contract so the unit suite can catch it.
    if (!this.loaded) throw new Error('engine not loaded')
    if (this.opts.failGenerate) throw new Error('fake generate failure')
    if (this.opts.generateDelayMs) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, this.opts.generateDelayMs)
        // Honor abort so a watchdog timeout actually unblocks the fake inference
        // (mirrors WebLlmEngine.interruptGenerate); lets tests assert the orphan
        // generation is cancelled, not just discarded (review I4).
        signal?.addEventListener('abort', () => {
          clearTimeout(t)
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
    }
    const lastUser = [...prompt].reverse().find(m => m.role === 'user')
    const key = lastUser?.content ?? ''
    return this.opts.completions?.[key] ?? this.opts.default ?? ABSTAIN
  }

  async unload(): Promise<void> {
    this.loaded = false
  }

  isLoaded(): boolean {
    return this.loaded
  }
}
