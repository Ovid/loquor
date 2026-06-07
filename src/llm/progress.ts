/**
 * Clamp a load-progress fraction to an integer 0..100 percent. Single helper
 * shared by the download modal and the toggle so the rounding/guard logic isn't
 * triplicated (review S3).
 */
export function pct(loaded: number, total: number): number {
  return total > 0 ? Math.round((loaded / total) * 100) : 0
}
