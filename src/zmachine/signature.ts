/** ZVM keys autosaves by the first 0x1E bytes of the story, hex-encoded.
 *  Shared by the engine (autosave key) and the UI (per-game resume hint) so
 *  both agree on the slot. */
export function signature(bytes: Uint8Array): string {
  // A truncated download or an HTML error page served in place of a .z3 file
  // can be shorter than the signature range; bytes[i] would be undefined and
  // throw an opaque TypeError deep in the boot path. Fail loud and early.
  if (bytes.length < 0x1e)
    throw new Error('story too short — not a valid game file')
  let s = ''
  for (let i = 0; i < 0x1e; i++) s += bytes[i].toString(16).padStart(2, '0')
  return s
}
