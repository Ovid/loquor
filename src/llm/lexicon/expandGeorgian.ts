// src/llm/lexicon/expandGeorgian.ts
// Georgian input pre-stage (spec §3.2, review-fix C1). Runs AFTER the verb is
// resolved, on the object-span remainder (NOT the whole clause — a Georgian
// imperative often ends in -ი, so stripping before verb lookup would mangle it),
// ONLY when core.postpositions is present (i.e. only ka). For each
// token, in FIXED precedence: (0) fused-instrumental exact-token map (ka) —
// vowel stems whose instrumental -ით fused to -თი (ტუმბოთი), emitting [ით, stem];
// (1) postposition split — longest-first over the closed suffix set, emitting
// [suffix, stem] so the existing prep-split fires; (2) nominative -ი strip —
// only if neither of the above matched. No stemmer, no
// general analyzer: only this fixed, closed suffix list. The -ი strip is
// gate-enforced safe for the closed Zork I noun set (round-trip + UAT pins),
// NOT provably safe in general — genuine -ი-final stems are hand-tuned in the
// lexicon (listed in both forms).
export function expandGeorgian(
  tokens: readonly string[],
  postpositions: Readonly<Record<string, string>>,
  fusedInstrumentals: Readonly<Record<string, string>> = {},
): string[] {
  // Longest-first so -ით wins over a -ი strip and over shorter suffixes.
  const suffixes = Object.keys(postpositions).sort(
    (a, b) => b.length - a.length,
  )
  const out: string[] = []
  for (const token of tokens) {
    // Closed fused-instrumental map (ka): vowel stems where the instrumental -ით
    // fuses to -თი (ტუმბოთი "with the pump"). Exact-token, checked FIRST so the
    // token is never -ი-stripped to a bare object; emit [ით, stem] so the
    // existing -ით prep-split fires. Exact match ⇒ no collision with თ-stem
    // nominatives (ასანთი/ყუთი are not keys).
    const fused = fusedInstrumentals[token]
    if (fused) {
      out.push('ით', fused)
      continue
    }
    const post = suffixes.find(
      s => token.length > s.length && token.endsWith(s),
    )
    if (post) {
      // Emit [suffix, stem]: prep token precedes the noun (spec §3.2).
      out.push(post, token.slice(0, token.length - post.length))
      continue
    }
    // Nominative -ი strip — only when no postposition matched, and never on a
    // token that IS itself a bare postposition (too short to split above), which
    // would otherwise mangle 'ში' → 'შ' (S2). A bare suffix is unrealistic input;
    // left whole it can only miss, never mis-resolve.
    if (token.length > 1 && token.endsWith('ი') && !(token in postpositions))
      out.push(token.slice(0, -1))
    else out.push(token)
  }
  return out
}
