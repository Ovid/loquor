// src/llm/lexicon/ka.core.ts
// Georgian (ქართული) core lexicon — Zork I imperative sublanguage (spec §4.1).
// STORED FOLDED + HYPHEN-FREE. Imperatives are aorist-stem 2sg; the direct
// object is nominative = citation form (spec §2), so NO case tables for objects.
// Only indirect/prepositional slots carry the CLOSED postposition set.
// preps SPREADS postpositions (the §3.1 merge): after expandGeorgian splits
// `ყუთში` → [ში, ყუთ], the existing prep-split reads preps['ში'] = 'in'.
//
// EVERY entry below is NATIVE-REVIEW-DRAFT (alpha): model-seeded forms pending
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
  დან: 'from', // ablative (vowel-stem: მდინარე → მდინარედან)
  // ablative on a CONSONANT stem carries a linking -ი- (ნავი → ნავიდან, სახლი →
  // სახლიდან). The bare `-დან` split would leave the stem WITH that -ი (ნავი ≠
  // stored stem ნავ), so it missed. Listed longest-first, `იდან` wins and strips
  // both, yielding the bare stem. Vowel-stem ablatives (…ედან/…ადან) still match
  // `-დან`. UAT-completion Finding 3 (exit boat). (No noun in the closed Zork I
  // set ends in a literal -იდან, so this never over-splits a nominative.)
  იდან: 'from',
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

// Fused-instrumental surface forms (spec §2). Vowel stems where the instrumental
// -ით fuses to -თი, so expandGeorgian's generic -ით split can't fire. Exact-token
// → emit [ით, stem]. ტუმბო (pump) is the ONLY vowel-stem instrument in Zork I.
// NATIVE-REVIEW-DRAFT. Zork-I-only, like the rest of ka.
const KA_FUSED_INSTRUMENTALS: Readonly<Record<string, string>> = {
  ტუმბოთი: 'ტუმბო', // pump: instrumental -ით fuses to -თი on the vowel stem
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
    // enter / board / exit
    შედი: 'enter',
    ჩაჯექი: 'board',
    გადი: 'exit',
    // exit/disembark the boat (UAT-completion Finding 3): the natural antonyms of
    // შედი ნავში — დატოვე "leave", გამოდი "get out", ჩამოდი "get down". ALL emit
    // `exit` (V-EXIT, which takes the vehicle), NEVER `leave`: Zork `LEAVE OBJECT`
    // is V-DROP (it would drop the boat). `ჩამოდი`/`გამოდი` don't collide with the
    // `down`/`out` directions, which are separate words (ქვემოთ / გარეთ).
    დატოვე: 'exit',
    გამოდი: 'exit',
    ჩამოდი: 'exit',
    // move / push / pull / raise / lower
    გადააადგილე: 'move',
    წაანაცვლე: 'move',
    // colloquial "shove aside / displace" — what most speakers type first for
    // "move rug" (the only way underground). UAT finding 3. NATIVE-REVIEW-DRAFT.
    გადასწიე: 'move',
    გადაწიე: 'move',
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
    // wind-up synonyms (G3): ამოქოქე ("wind out") / მოქოქე ("wind"), the natural
    // forms a native speaker reaches for at the songbird; only დააქოქე mapped, so
    // the bauble puzzle forced the `"wind up canary"` English escape. ka has no LLM
    // net. notes/uat-georgian-playthrough.md.
    ამოქოქე: 'wind up',
    მოქოქე: 'wind up',
    დარეკე: 'ring',
    დაიქნიე: 'wave',
    მოისვი: 'rub',
    თხარე: 'dig',
    // dig synonyms (G2, candidate hard blocker): the natural perfective გათხარე
    // ("dig it up") / ამოთხარე ("dig out") abstained — only the bare თხარე mapped,
    // with NO on-screen hint. The scarab (a 350-point-win treasure) is gated on
    // dig, so a speaker who never guesses თხარე was stuck. notes/uat-georgian-playthrough.md.
    გათხარე: 'dig',
    ამოთხარე: 'dig',
    მოატრიალე: 'turn',
    დაატრიალე: 'turn',
    // climb / cross / launch / pray / wait
    აძვერი: 'climb',
    ჩაძვერი: 'climb',
    // აცოცდი ("clamber up") — the other natural climb imperative; `აცოცდი ხეზე`
    // abstained in run 2 (only აძვერი mapped). UAT-completion Finding (minor).
    აცოცდი: 'climb',
    // climb-down: the 'climb down' verb phrase (verbs1), so 'ჩამოძვერი ხე' →
    // 'climb down tree' — the player descends the tree he climbed for the egg.
    // (Bare descent is the direction 'down', owned by directions.ts.)
    ჩამოძვერი: 'climb down', // ← review: confirm ჩამოძვერი reads as "climb down"
    გადაკვეთე: 'cross',
    // გადააბიჯე ("step across") — the other natural cross imperative; only
    // გადაკვეთე mapped, so `გადააბიჯე ცისარტყელა` abstained at Aragain Falls,
    // stranding a prose-following player above the falls (the endgame becomes
    // unreachable in ka — no LLM net). UAT-completion Finding (cross rainbow).
    გადააბიჯე: 'cross',
    გაუშვი: 'launch',
    // გაცურე ("sail/set off") — the natural word a player reaches for at the
    // Frigid River; გაუშვი already works but no one types it. UAT finding 7.
    გაცურე: 'launch',
    ილოცე: 'pray',
    დაიცადე: 'wait',
    // მოიცადე — the other natural imperative of "wait". UAT finding 6.
    მოიცადე: 'wait',
    // echo (Loud Room): ექო is the natural Georgian, and echo is an INTRANSITIVE
    // game verb (verbsOnly), so it maps as a core verb here — NOT as an English
    // 'echo'→'echo' idiom, which would inject the ASCII token 'echo' into the ka
    // word set (KNOWN_COLLISIONS.ka must stay []). The Georgian key ექო is
    // non-ASCII, so no collision. UAT finding 5; parallels the Spanish eco→echo fix.
    ექო: 'echo',
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
  fusedInstrumentals: KA_FUSED_INSTRUMENTALS,
  articles: [],
  pronounsDirect: [],
  pronounsContainer: [],
  pronounsSelf: ['მე'],
  metaAliases: {
    // Georgian meta words → raw English command. English meta verbs (i, l,
    // save, quit) STILL work via isMetaCommand, which runs BEFORE the lexicon.
    ინვენტარი: 'inventory',
    // ნივთები ("things/items") — the natural alternative to the loanword
    // ინვენტარი; it abstained (UAT-completion). Same upstream meta path.
    ნივთები: 'inventory',
    შენახვა: 'save',
    აღდგენა: 'restore',
    გასვლა: 'quit',
    ქულა: 'score',
    ყურება: 'look',
    // ოდისევსი (Odysseus) — the cyclops scare-word. Zork accepts ODYSSEUS as a
    // synonym of ULYSSES (gsyntax.zil:335), so the natural Georgian mythological
    // name resolves to the raw English `odysseus` rather than forcing the player
    // to type the Latin `Ulysses`. UAT-completion Finding (Ulysses).
    ოდისევსი: 'odysseus',
    // ულისე (Ulysses, Latin) — the cyclops scare-word's other accepted name. Zork
    // accepts both ODYSSEUS and ULYSSES (gsyntax.zil:335); ოდისევსი already maps,
    // but a player who reaches for the Latin form abstained (UAT-completion).
    ულისე: 'ulysses',
  },
}
