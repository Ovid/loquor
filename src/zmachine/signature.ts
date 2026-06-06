/** ZVM keys autosaves by the first 0x1E bytes of the story, hex-encoded.
 *  Shared by the engine (autosave key) and the UI (per-game resume hint) so
 *  both agree on the slot. */
export function signature(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < 0x1e; i++) s += bytes[i].toString(16).padStart(2, '0')
  return s
}
