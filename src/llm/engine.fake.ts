import type { ChatMessages, LlmEngine, LoadProgress } from './types'

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

  async generate(prompt: ChatMessages, _grammar: string): Promise<string> {
    if (this.opts.failGenerate) throw new Error('fake generate failure')
    if (this.opts.generateDelayMs) {
      await new Promise(r => setTimeout(r, this.opts.generateDelayMs))
    }
    const lastUser = [...prompt].reverse().find(m => m.role === 'user')
    const key = lastUser?.content ?? ''
    return this.opts.completions?.[key] ?? this.opts.default ?? '__UNKNOWN__'
  }

  async unload(): Promise<void> {
    this.loaded = false
  }

  isLoaded(): boolean {
    return this.loaded
  }
}
