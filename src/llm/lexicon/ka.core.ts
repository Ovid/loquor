// src/llm/lexicon/ka.core.ts
// Georgian (ქართული) core lexicon — Zork I imperative sublanguage (spec §4.1).
// STORED FOLDED + HYPHEN-FREE. Imperatives are aorist-stem 2sg; the direct
// object is nominative = citation form (spec §2), so NO case tables for objects.
// Only indirect/prepositional slots carry the CLOSED postposition set.
// preps SPREADS postpositions (the §3.1 merge): after expandGeorgian splits
// `ყუთში` → [ში, ყუთ], the existing prep-split reads preps['ში'] = 'in'.
//
// EVERY entry below is NATIVE-REVIEW-DRAFT (beta): model-seeded forms pending
// the Tbilisi loop (spec §9). Pronoun arrays are empty — Georgian object
// pronouns are verb suffixes, not tokens ("it" deferred, spec §8).
import type { CoreLexicon } from './types'

// Closed postposition set (spec §2/§3.1). English values MUST be vocab.preps.
// `-კენ` (toward) is OMITTED — it is a movement marker owned by directions.ts,
// not an object preposition. `-თან` (at) is included only because vocab.preps
// has 'at' (throw … at); the validate gate (Task 8) enforces the membership.
const KA_POSTPOSITIONS: Readonly<Record<string, string>> = {
  ში: 'in', // inessive
  ზე: 'on', // superessive
  ით: 'with', // instrumental
  დან: 'from', // ablative
  თან: 'at', // adessive (only if 'at' ∈ vocab.preps — see validate gate)
}

export const KA_CORE: CoreLexicon = {
  verbs: {
    // take / get
    აიღე: 'take',
    აიღეთ: 'take',
    წაიღე: 'take',
    // drop / put down
    დადე: 'drop',
    დააგდე: 'drop',
    გადააგდე: 'drop',
    // open / close
    გააღე: 'open',
    გახსენი: 'open',
    დახურე: 'close',
    // read / examine / look
    წაიკითხე: 'read',
    დაათვალიერე: 'examine',
    შეხედე: 'examine',
    მიმოიხედე: 'look',
    // attack / kill
    დაესხი: 'attack',
    შეუტიე: 'attack',
    მოკალი: 'kill',
    // put (in/on)
    ჩადე: 'put',
    დადგი: 'put',
    // give
    მიეცი: 'give',
    // light / turn on/off
    აანთე: 'light',
    ჩართე: 'turn on',
    გამორთე: 'turn off',
    ჩააქრე: 'extinguish',
    // enter / board / leave
    შედი: 'enter',
    ჩაჯექი: 'board',
    გადი: 'exit',
    // move / push / pull / raise / lower
    გადააადგილე: 'move',
    წაანაცვლე: 'move',
    დააჭირე: 'push',
    წადე: 'push',
    გამოქაჩე: 'pull',
    მოქაჩე: 'pull',
    ასწიე: 'raise',
    ჩაუშვი: 'lower',
    // tie / inflate / wind / ring / wave / rub / dig / turn
    მიაბი: 'tie',
    გახსენი_თოკი: 'untie', // ← review: ensure not colliding with open; rename if so
    გაბერე: 'inflate',
    დააქოქე: 'wind up',
    დარეკე: 'ring',
    დაიქნიე: 'wave',
    მოისვი: 'rub',
    თხარე: 'dig',
    მოატრიალე: 'turn',
    დაატრიალე: 'turn',
    // climb / cross / launch / pray / wait / echo
    აძვერი: 'climb',
    ჩაძვერი: 'climb',
    გადაკვეთე: 'cross',
    გაუშვი: 'launch',
    ილოცე: 'pray',
    დაიცადე: 'wait',
    // unlock
    გააღე_გასაღებით: 'unlock', // ← review: prefer an idiom (see verbIdioms)
  },
  verbIdioms: [
    // unlock = open-with-key; the contiguous idiom consumes verb+instrument
    // marker so the door resolves as the object. Review for naturalness.
    { phrase: 'გასაღებით გააღე', to: 'unlock' },
    // echo (Loud Room): the player types the English game verb verbatim.
    { phrase: 'echo', to: 'echo' },
  ],
  particleVerbs: [], // Georgian preverbs are fused, not separable (spec §4.1)
  // "all" quantifier — Georgian ყველა / ყველაფერი, plus bare English for mixers.
  quantifiersAll: ['ყველა', 'ყველაფერი', 'all', 'everything'],
  quantifiersExcept: ['გარდა', 'except'],
  preps: {
    ...KA_POSTPOSITIONS,
  },
  postpositions: KA_POSTPOSITIONS,
  articles: [],
  pronounsDirect: [],
  pronounsContainer: [],
  pronounsSelf: ['მე'],
  metaAliases: {
    // Georgian meta words → raw English command. English meta verbs (i, l,
    // save, quit) STILL work via isMetaCommand, which runs BEFORE the lexicon.
    ინვენტარი: 'inventory',
    შენახვა: 'save',
    აღდგენა: 'restore',
    გასვლა: 'quit',
    ქულა: 'score',
    ყურება: 'look',
  },
}
