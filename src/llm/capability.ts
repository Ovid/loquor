import type { CapabilityResult, Tier } from './types'

interface AdapterLike {
  limits?: { maxBufferSize?: number; maxStorageBufferBindingSize?: number }
  isFallbackAdapter?: boolean
}
interface NavLike {
  gpu?: { requestAdapter(opts?: unknown): Promise<AdapterLike | null> }
  userAgentData?: { mobile?: boolean }
  userAgent?: string
  deviceMemory?: number
}
export interface CapabilityDeps {
  navigator?: NavLike
}

// Thresholds are starting values; tune at the walking-skeleton gate.
const SMALL_MIN_BUFFER = 128 * 1024 * 1024 // 128 MiB
const FULL_MIN_BUFFER = 1024 * 1024 * 1024 // 1 GiB
const LOW_MEMORY_GB = 4

function isMobile(nav: NavLike): boolean {
  if (nav.userAgentData?.mobile === true) return true
  return /android|iphone|ipad|ipod|mobile/i.test(nav.userAgent ?? '')
}

export async function detectCapability(
  deps: CapabilityDeps,
  override = false,
): Promise<CapabilityResult> {
  const reasons: string[] = []
  const bump = (): CapabilityResult =>
    override
      ? { tier: 'small', reasons: [...reasons, 'override'] }
      : { tier: 'none', reasons }

  try {
    const nav = deps.navigator ?? {}
    if (!nav.gpu) {
      reasons.push('no-webgpu')
      return bump()
    }
    const adapter = await nav.gpu.requestAdapter()
    if (!adapter) {
      reasons.push('no-adapter')
      return bump()
    }
    if (adapter.isFallbackAdapter) {
      reasons.push('software-adapter')
      return bump()
    }
    const maxBuffer = adapter.limits?.maxBufferSize ?? 0
    const maxBinding = adapter.limits?.maxStorageBufferBindingSize ?? 0
    if (maxBuffer < SMALL_MIN_BUFFER || maxBinding < SMALL_MIN_BUFFER) {
      reasons.push('insufficient-limits')
      return bump()
    }

    // Soft signals: present but capable → small, not none.
    const mobile = isMobile(nav)
    // navigator.deviceMemory is spec-capped at 8, so only the low end matters —
    // a Math.min(_, 8) clamp here was dead (review S7).
    const lowMemory =
      typeof nav.deviceMemory === 'number' && nav.deviceMemory < LOW_MEMORY_GB
    if (mobile) reasons.push('mobile')
    if (lowMemory) reasons.push('low-memory')

    const roomy = maxBuffer >= FULL_MIN_BUFFER && maxBinding >= FULL_MIN_BUFFER
    const tier: Tier = roomy && !mobile && !lowMemory ? 'full' : 'small'
    return { tier, reasons }
  } catch (err) {
    // Surface the real probe exception — otherwise a genuine WebGPU error is
    // indistinguishable from "no GPU" when debugging (review S8).
    console.warn('detectCapability: WebGPU probe failed', err)
    reasons.push('probe-error')
    return bump()
  }
}
