/** ZVM keys autosaves by the first 0x1E bytes of the story, hex-encoded.
 *  Shared by the engine (autosave key) and the UI (per-game resume hint) so
 *  both agree on the slot. */
export function signature(bytes: Uint8Array): string {
  // A truncated download or an HTML error page served in place of a .z3 file
  // can be shorter than the signature range; bytes[i] would be undefined and
  // throw an opaque TypeError deep in the boot path. Fail loud and early.
  if (bytes.length < 0x1e)
    throw new Error('story too short — not a valid game file')
  // ifvms keys autosave from the extracted Z-code (origram); we hash the raw
  // file bytes, which only matches for a *raw* story. A wrapped container (e.g.
  // a .zblorb, which starts with the IFF "FORM" tag) would hash to a different
  // key than ifvms uses and silently never resume. Byte 0 of raw Z-code is the
  // version (1-8); anything else is not raw Z-code — fail loud and early.
  const version = bytes[0]
  if (version < 1 || version > 8)
    throw new Error('not raw Z-code — wrapped story files are unsupported')
  let s = ''
  for (let i = 0; i < 0x1e; i++) s += bytes[i].toString(16).padStart(2, '0')
  return s
}
