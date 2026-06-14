import type { MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm'
import type { ChatMessages, LlmEngine, LoadProgress } from './types'
import { DEFAULT_MODEL } from './models'
import { ABSTAIN } from './translate'

/**
 * Real LLM boundary over @mlc-ai/web-llm (WebGPU). The single file that imports
 * web-llm. Constrained decoding uses XGrammar GBNF via response_format.
 *
 * Open items confirmed at the walking-skeleton gate (spec open notes):
 *  - exact GBNF response_format shape (`type: 'grammar'` + `grammar` field — confirmed
 *    in ResponseFormat interface from 0.2.84 openai_api_protocols/chat_completion.d.ts);
 *  - cached-model detection for the installed/not-installed toggle;
 *  - aborting an in-flight load (AbortSignal wiring).
 *
 * JSDOM NOTE: The runtime imports (CreateMLCEngine, hasModelInCache) are lazy
 * dynamic imports inside the methods, NOT top-level static imports. This is
 * required because @mlc-ai/web-llm references browser globals (Worker, WebGPU)
 * at module-evaluation time, which would crash the jsdom test environment on
 * import. The `import type` lines above are type-only and erased at compile
 * time, so they are safe as static imports.
 */
export class WebLlmEngine implements LlmEngine {
  private engine: MLCEngineInterface | null = null
  private modelId: string
  /** Monotonic load token ([L2]): CreateMLCEngine cannot be aborted, so a
   * cancelled or superseded load can land LATE — only the newest load may
   * install its engine; every loser releases its own. */
  private loadEpoch = 0
  constructor(modelId: string = DEFAULT_MODEL) {
    this.modelId = modelId
  }

  async load(
    onProgress: (p: LoadProgress) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError')
    const epoch = ++this.loadEpoch
    const { CreateMLCEngine: create } = await import('@mlc-ai/web-llm')
    // NETWORK EGRESS (review I1, documented in CLAUDE.md): passing no `appConfig`
    // makes WebLLM use its built-in prebuiltAppConfig, which fetches model weights
    // from huggingface.co and the model-lib WASM from raw.githubusercontent.com on
    // first use (no SRI). Gated behind explicit opt-in; one-time, then cached and
    // offline. Follow-up: pin self-hosted/integrity-checked URLs under public/.
    const engine = await create(this.modelId, {
      initProgressCallback: (r: InitProgressReport) => {
        // web-llm reports a 0..1 `progress`; normalize to loaded/total.
        // Stale loads stay silent: their progress is no longer this engine's.
        if (epoch !== this.loadEpoch) return
        onProgress({
          loaded: Math.round(r.progress * 100),
          total: 100,
          text: r.text,
        })
      },
    })
    // [L2] The loser of a race releases ITS OWN engine. Assigning this.engine
    // before the abort check (as before) let a late-landing cancelled load
    // clobber the fresh winner and then unload() it — leaking the winner's
    // VRAM and leaving the hook in phase 'on' with isLoaded() false.
    if (signal.aborted || epoch !== this.loadEpoch) {
      await engine.unload?.()
      throw new DOMException('aborted', 'AbortError')
    }
    this.engine = engine
  }

  async generate(
    prompt: ChatMessages,
    grammar: string | null,
    signal?: AbortSignal,
  ): Promise<string> {
    if (!this.engine) throw new Error('engine not loaded')
    const engine = this.engine
    // On abort (watchdog timeout / supersession) interrupt the in-flight WebGPU
    // inference so a timed-out generation stops consuming the GPU rather than
    // running to completion orphaned (review I4).
    const onAbort = () => engine.interruptGenerate()
    signal?.addEventListener('abort', onAbort)
    try {
      const res = await engine.chat.completions.create({
        messages: prompt,
        temperature: 0,
        // ResponseFormat in 0.2.84 supports { type: 'grammar', grammar } natively;
        // omit it entirely for the plain-text output-translation fallback.
        ...(grammar === null
          ? {}
          : { response_format: { type: 'grammar', grammar } }),
      })
      return (
        res.choices[0]?.message?.content ?? (grammar === null ? '' : ABSTAIN)
      )
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }
  }

  async unload(): Promise<void> {
    await this.engine?.unload?.()
    this.engine = null
  }

  isLoaded(): boolean {
    return this.engine !== null
  }

  /**
   * Whether the model weights are already in WebLLM's on-disk cache (survives
   * reloads) — drives the off·installed vs off·not-installed toggle state so a
   * returning player is not re-prompted. Distinct from isLoaded().
   * Dynamic import for jsdom safety (see class-level JSDoc).
   */
  async isCached(): Promise<boolean> {
    try {
      const { hasModelInCache: check } = await import('@mlc-ai/web-llm')
      return await check(this.modelId)
    } catch (err) {
      // Degrade to "not cached" so a probe fault never blocks play — but
      // surface it instead of swallowing silently (F-19). An unswallowed false
      // is otherwise indistinguishable from a genuine cache miss, with no clue
      // when debugging. Mirrors capability.ts's probe-failure warn.
      console.warn('isCached: model-cache probe failed', err)
      return false
    }
  }
}
