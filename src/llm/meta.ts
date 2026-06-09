// src/llm/meta.ts
// Single source of truth for Z-machine meta-commands: bare verbs that are NOT
// in-world actions and must bypass the NL model (sent raw to the interpreter).
// BOTH translate.ts (runtime, via isMetaCommand) and scripts/extract-vocab.mjs
// (the vocab generator, which subtracts these from verbsOnly) consume this list,
// so the grammar can never offer a meta verb as an emittable action AND a typed
// meta command is still routed raw — no verb falls through the gap between the
// two paths.
//
// 'again'/'g' are parser BUZZ words (<BUZZ AGAIN G OOPS> in gsyntax.zil; no
// <SYNTAX> rule), routed raw so "again"/"g" repeat the previous turn.
// 'inventory' is deliberately NOT here: it is a real in-world verb-only action
// (<SYNTAX INVENTORY = V-INVENTORY>) and stays emittable in verbsOnly.
// 'super' AND 'superbrief': the ZIL rule is <SYNTAX SUPER = V-SUPER-BRIEF> with
// <SYNONYM SUPER SUPERBRIEF> (gsyntax.zil:44-45). The generator canonicalises the
// SYNTAX *head* ('super'), so 'super' — not 'superbrief' — is what would otherwise
// land in verbsOnly; both are listed so the verb is subtracted from the grammar
// AND a typed "super"/"superbrief" is routed raw.
export const META_COMMANDS: readonly string[] = [
  'restart',
  'save',
  'restore',
  'quit',
  'version',
  'script',
  'unscript',
  'verbose',
  'brief',
  'super',
  'superbrief',
  'diagnose',
  'score',
  'again',
  'g',
]
