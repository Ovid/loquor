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

// The CLOSED set of Zork I dative recipients, in the -ს dative surface form the
// player types (matched AFTER the verb is resolved; expandGeorgian leaves -ს
// attached because it collides with genitive -ის). The G1 give/tie path gates on
// membership here so a non-recipient noun whose STEM natively ends in ს (chalice
// თას, scarab სკარაბეუს, screwdriver სახრახნის) can never be read as a recipient
// (C1, plan M3). These two forms are also dual-listed in KA_ZORK1 so the recipient
// resolves to its emit. NATIVE-REVIEW-DRAFT. Zork-I-only, like the rest of ka.
const KA_DATIVE_RECIPIENTS: ReadonlySet<string> = new Set([
  'ქურდს', // thief
  'მოაჯირს', // wooden railing
])

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
    // look-into: a SEPARATE verb (not a postposition) → the 'look in' verb phrase,
    // so 'ჩახედე კალათა' → 'look in cage' (look is verbsOnly, so the bare prep-split
    // path can't emit the container; the multiword verb target carries the 'in').
    ჩახედე: 'look in', // ← review: confirm 'look into' reads naturally as ჩახედე
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
    // უბიძგე (imperative of ბიძგება, "push/shove") — replaces the odd `წადე`,
    // which read as neither push nor a natural verb. NATIVE-REVIEW-DRAFT.
    უბიძგე: 'push',
    გამოქაჩე: 'pull',
    მოქაჩე: 'pull',
    ასწიე: 'raise',
    ჩაუშვი: 'lower',
    // tie / inflate / wind / ring / wave / rub / dig / turn
    მიაბი: 'tie',
    // untie: მოხსენი (imperative of მოხსნა, "detach/unfasten") — replaces the
    // ambiguous ახსენი, which collided in sense with ახსენე ("mention") and the
    // ხსნა/"explain" reading. მოხსენი is DISTINCT from გახსენი ("open") and reads
    // cleanly as untying/unfastening the rope from the railing. NATIVE-REVIEW-DRAFT.
    მოხსენი: 'untie',
    გაბერე: 'inflate',
    დააქოქე: 'wind up',
    დარეკე: 'ring',
    დაიქნიე: 'wave',
    მოისვი: 'rub',
    თხარე: 'dig',
    მოატრიალე: 'turn',
    დაატრიალე: 'turn',
    // climb / cross / launch / pray / wait
    აძვერი: 'climb',
    ჩაძვერი: 'climb',
    // climb-down: the 'climb down' verb phrase (verbs1), so 'ჩამოძვერი ხე' →
    // 'climb down tree' — the player descends the tree he climbed for the egg.
    // (Bare descent is the direction 'down', owned by directions.ts.)
    ჩამოძვერი: 'climb down', // ← review: confirm ჩამოძვერი reads as "climb down"
    გადაკვეთე: 'cross',
    გაუშვი: 'launch',
    ილოცე: 'pray',
    დაიცადე: 'wait',
    // unlock — no single-word verb key: the 'გასაღებით გააღე' idiom below
    // (open-with-key) is the natural Georgian form; the Task-4 placeholder
    // (გააღე_გასაღებით) is removed since the idiom covers it.
  },
  verbIdioms: [
    // unlock = open-with-key; the contiguous idiom consumes verb+instrument
    // marker so the door resolves as the object. Review for naturalness.
    { phrase: 'გასაღებით გააღე', to: 'unlock' },
    // echo (Loud Room): like fr/de, ka does NOT idiom-map the English game verb
    // 'echo' — a player typing 'echo' (plain ASCII) raw-sends via §5.5, the
    // English-ASCII passthrough. An 'echo'→'echo' idiom would inject an English
    // token into the ka lexicon word set (KNOWN_COLLISIONS.ka must stay []).
  ],
  particleVerbs: [], // Georgian preverbs are fused, not separable (spec §4.1)
  // "all" quantifier — Georgian ყველა / ყველაფერ(ი), plus bare English for mixers.
  // The set is matched AFTER expandGeorgian, which strips the nominative -ი from
  // every object token: ყველაფერი → ყველაფერ. So the bare stem ყველაფერ is what
  // actually arrives — listing only the full ყველაფერი silently missed "take
  // everything" (I1). ყველა is vowel-final, so its strip is a no-op (unchanged).
  quantifiersAll: ['ყველა', 'ყველაფერ', 'all', 'everything'],
  quantifiersExcept: ['გარდა', 'except'],
  preps: {
    ...KA_POSTPOSITIONS,
  },
  postpositions: KA_POSTPOSITIONS,
  dativeRecipients: KA_DATIVE_RECIPIENTS,
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
