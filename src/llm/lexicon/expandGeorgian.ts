// src/llm/lexicon/expandGeorgian.ts
// Georgian input pre-stage (spec §3.2, review-fix C1). Runs AFTER the verb is
// resolved, on the object-span remainder (NOT the whole clause — a Georgian
// imperative often ends in -ი, so stripping before verb lookup would mangle it),
// ONLY when core.postpositions is present (i.e. only ka). For each
// token, in FIXED precedence: (1) postposition split — longest-first over the
// closed suffix set, emitting [suffix, stem] so the existing prep-split fires;
// (2) nominative -ი strip — only if no postposition matched. No stemmer, no
// general analyzer: only this fixed, closed suffix list. The -ი strip is
// gate-enforced safe for the closed Zork I noun set (round-trip + UAT pins),
// NOT provably safe in general — genuine -ი-final stems are hand-tuned in the
// lexicon (listed in both forms).
export function expandGeorgian(
  tokens: readonly string[],
  postpositions: Readonly<Record<string, string>>,
): string[] {
  // Longest-first so -ით wins over a -ი strip and over shorter suffixes.
  const suffixes = Object.keys(postpositions).sort((a, b) => b.length - a.length)
  const out: string[] = []
  for (const token of tokens) {
    const post = suffixes.find(s => token.length > s.length && token.endsWith(s))
    if (post) {
      // Emit [suffix, stem]: prep token precedes the noun (spec §3.2).
      out.push(post, token.slice(0, token.length - post.length))
      continue
    }
    // Nominative -ი strip — only when no postposition matched.
    if (token.length > 1 && token.endsWith('ი'))
      out.push(token.slice(0, -1))
    else out.push(token)
  }
  return out
}
