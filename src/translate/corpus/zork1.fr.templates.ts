// Zork I × French composing patterns (output-translation spec §4.3). Tried in
// specificity order; {obj}-resolving templates beat {raw} ones of the same
// shape (match.ts owns the ordering — author in any order).
//
// AUTHORING RULES
//
// EN sides are BYTE-EXACT (in normalize()d form: collapsed whitespace) against
// the game source — every entry below was verified against the vendored ZIL
// TELL strings (gverbs.zil / gparser.zil / gglobals.zil / 1actions.zil, cited
// per group) and, where possible, against composed lines in the committed
// walkthrough fixture (src/test/zork1.walkthrough.en.json). Never guess a
// wording — the real game says "You already have that!", not "You already
// have the X.".
//
// Slots: {obj} {obj2} {num} {num2} {raw} — each slot name AT MOST ONCE per
// template (see types.ts; {obj2}/{num2} exist for second occurrences). The
// out side references {obj.<key>} with the French form keys {indef, def,
// bare}, plus {num}/{num2}/{raw}. `cap: true` whenever the out side begins
// with a lowercase pre-composed form ("la …" → "La …").
//
// {raw} vs {obj}: parser lines that echo the player's TYPED dictionary token
// ('I don't know the word "…"') use {raw} (the token is not a printed object
// name and passes through verbatim). Lines printing a real object DESC use
// {obj}. Where one ZIL shape serves both (NOT-HERE-OBJECT-F), BOTH variants
// are authored — the {obj} one wins the specificity tie-break.
//
// FRENCH COMPOSITION RULES (why some phrasings are not literal):
// - NEVER put «de» or «à» immediately before a slot: contraction (de+le→du,
//   à+le→au, de+les→des…) and elision (de+eau→d'eau) cannot be composed at
//   runtime. The pre-composed def/indef forms carry their own article and
//   elision ("l'œuf", "de l'eau"), so «dans/sur/avec/derrière/à travers» +
//   {obj.def}/{obj.indef} is always safe. The one exception below hard-codes
//   «du» where the object set is provably masculine-singular (see the
//   vehicle template).
// - GENDER/NUMBER NEUTRALITY: prefer phrasings where NOTHING agrees with the
//   object — keep {obj} in complement/object position ("Vous fermez
//   {obj.def}." rather than "… est maintenant fermé(e)"), or behind an
//   existential («Il y a déjà {obj.def} dans …»). This matters because the
//   objects table has NINE inherently PLURAL entries that any
//   {obj}-agreeing template can compose wrong: blessings («les
//   bénédictions»), group of tool chests («les caisses à outils»),
//   matchbook («les allumettes»), mountain range («les montagnes»), number
//   of ghosts («les fantômes»), pair of candles («les bougies»), pair of
//   hands («les mains»), set of teeth («les dents»), white cliffs («les
//   falaises blanches») — «les bougies est vide» is not French.
//   Lines whose natural French still forces agreement get pinned per-object
//   as full strings (spec §5 escape hatch, Task 16). Known Task 16 pins —
//   every remaining shape below that can compose a wrong number/gender:
//     - The two "(providing light)" templates say «allumée» (gender-true
//       for the feminine-singular lamp/torch/match but wrong in NUMBER for
//       the candles/matchbook). The walkthrough fixture contains the exact
//       line "There is a pair of candles here (providing light)." → pin
//       «Il y a des bougies ici (allumées).»; likewise the listing shape
//       "A pair of candles (providing light)" → «Des bougies (allumées)»,
//       and the same two shapes for the matchbook should it ever carry
//       ONBIT («allumées», fem-plural).
//     - "The {obj} has it." → «C'est {obj.def} qui l'a.» stays singular; a
//       plural holder needs «Ce sont … qui l'ont» (e.g. "The number of
//       ghosts has it." → «Ce sont les fantômes qui l'ont.»).
//     - "Opening the brown sack reveals a clove of garlic, and a lunch."
//       (two-item reveal — only {obj}/{obj2} exist; the one-item shape is
//       templated below).
//     - "You can't see any songbird here." (1actions.zil:90 — period, not
//       bang; a fixed full string, not this template family).
import type { Template } from '../types'

export const ZORK1_FR_TEMPLATES: readonly Template[] = [
  // ── Parser feedback echoing the player's typed token ──────────────────
  // gparser.zil:670 UNKNOWN-WORD / :681 CANT-USE; gglobals.zil:67
  // NOT-HERE-OBJECT-F (prints dictionary words, hence {raw}; the {obj}
  // variant catches full printed names and wins the tie-break).
  {
    en: 'I don\'t know the word "{raw}".',
    out: 'Je ne connais pas le mot « {raw} ».',
  },
  {
    en: 'You used the word "{raw}" in a way that I don\'t understand.',
    out: "Vous avez employé le mot « {raw} » d'une manière que je ne comprends pas.",
  },
  // «nulle part» / mention-guillemets keep both variants agreement- and
  // elision-safe («pas de épée» would be wrong; «d'» cannot be composed).
  {
    en: "You can't see any {obj} here!",
    out: 'Vous ne voyez {obj.def} nulle part !',
  },
  {
    en: "You can't see any {raw} here!",
    out: 'Vous ne voyez aucun « {raw} » ici !',
  },
  // Parser object-disambiguation prompt (gparser.zil WHICH-PRINT, two
  // candidates). Runtime-composed from the ambiguous books the player holds, in
  // an order the parser does not guarantee; a {obj}/{obj2} template renders any
  // book pair either way round, using each book's def form. No «de»/«à» precedes
  // a slot, so contraction/elision is not engaged. es UAT finding F3, shared
  // with French.
  {
    en: 'Which book do you mean, the {obj} or the {obj2}?',
    out: 'De quel livre parlez-vous, {obj.def} ou {obj2.def} ?',
  },

  // ── Presence & listings (gverbs.zil DESCRIBE-OBJECT :1704-1725,
  //    PRINT-CONT :1835; thief treasure listing 1actions.zil:2053) ─────────
  { en: 'There is a {obj} here.', out: 'Il y a {obj.indef} ici.' },
  // ONBIT suffix — light sources are all feminine («allumée» is gender-true
  // for lampe/torche/allumette); the plural candles/matchbook lines are
  // Task 16 pins (see header).
  {
    en: 'There is a {obj} here (providing light).',
    out: 'Il y a {obj.indef} ici (allumée).',
  },
  {
    en: 'A {obj} (providing light)',
    out: '{obj.indef} (allumée)',
    cap: true,
  },
  {
    en: 'A {obj} (being worn)',
    out: '{obj.indef} (que vous portez)',
    cap: true,
  },
  // Vehicle tail (gverbs.zil:1725). «du» is hard-coded: the ONLY VEHBIT
  // object in Zork I is the magic boat (1dungeon.zil:599), masculine
  // singular — revisit if another vehicle ever appears.
  {
    en: 'There is a {obj} here. (outside the {obj2})',
    out: "Il y a {obj.indef} ici. (à l'extérieur du {obj2.bare})",
  },
  // Thief-death treasure listing, one-content case (1actions.zil:2053-2057).
  {
    en: 'A {obj}, with a {obj2}',
    out: '{obj.indef}, avec {obj2.indef}',
    cap: true,
  },
  // gverbs.zil:1835 (PRINT-CONT) — «il y a» dodges «contient/contiennent».
  { en: 'The {obj} contains:', out: 'Dans {obj.def}, il y a :' },
  { en: '(You are in the {obj}.)', out: '(Vous êtes dans {obj.def}.)' },
  // GWIM/orphan parentheticals (gparser.zil) — the parser echoing the noun it
  // assumed: bare "take" → "(sword)"; implicit tool → "(with the shovel)".
  // UAT-4 misses; only "(magic boat)" (the fixture's one instance) had been
  // pinned as a full line.
  { en: '({obj})', out: '({obj.def})' },
  { en: '(with the {obj})', out: '(avec {obj.def})' },

  // ── Score (1actions.zil V-SCORE :4028-4033; " move." is the MOVES=1
  //    variant in the same routine; fixture: "Your score is 350 (total of
  //    350 points), in 365 moves.") ────────────────────────────────────────
  {
    en: 'Your score is {num} (total of 350 points), in {num2} moves.',
    out: 'Votre score est de {num} (sur un total de 350 points), en {num2} tours.',
  },
  {
    en: 'Your score is {num} (total of 350 points), in {num2} move.',
    out: 'Votre score est de {num} (sur un total de 350 points), en {num2} tour.',
  },

  // ── Multi-object command prefix (gmain.zil:144 prints "<obj>: " before
  //    the per-object verb output; "Taken."/"Dropped." are gverbs.zil:1387
  //    /:481). Rephrased verbally to dodge «pris(e)/posé(e)» agreement. ───
  { en: '{obj}: Taken.', out: 'Vous prenez {obj.def}.' },
  { en: '{obj}: Dropped.', out: 'Vous posez {obj.def}.' },
  // The per-object FAILURE reason carries the same "<obj>: " prefix (UAT: a
  // `take all` over capacity printed "broken timber: Your load is too heavy.",
  // leaking English because only the success reasons above were templated).
  // Keep the label form ("<obj> : <reason>") — the reason is about the whole
  // load, not the item — with the corpus's space-before-colon convention.
  {
    en: '{obj}: Your load is too heavy.',
    out: '{obj.bare} : Votre chargement est trop lourd.',
  },
  {
    en: '{obj}: Your load is too heavy, especially in light of your condition.',
    out: '{obj.bare} : Votre chargement est trop lourd, surtout vu votre état.',
  },
  // Object-specific `take all` failure reasons (UAT 2026-06-19: the Living Room
  // rug/trophy case leaked English on `take all` — same gap as the too-heavy
  // reasons above). Reason reused from each standalone string pin.
  {
    en: '{obj}: The rug is extremely heavy and cannot be carried.',
    out: '{obj.bare} : Le tapis est extrêmement lourd et ne peut pas être porté.',
  },
  {
    en: '{obj}: The trophy case is securely fastened to the wall.',
    out: '{obj.bare} : La vitrine à trophées est solidement fixée au mur.',
  },

  // ── take/drop/have family (gverbs.zil :1969, :1105, :185) ──────────────
  {
    en: "You're not carrying the {obj}.",
    out: "Vous n'avez pas {obj.def} sur vous.",
  },
  { en: "You don't have the {obj}.", out: "Vous n'avez pas {obj.def}." },
  {
    en: "You aren't even holding the {obj}.",
    out: 'Vous ne tenez même pas {obj.def}.',
  },

  // ── open/close & containers (gverbs.zil :980/:990, :983, :353, :871/:888/
  //    :1557/:1973, :1093, :886, :1098, :1375). "is (now) closed/isn't open/
  //    is empty/is already in" would force gender or number agreement on a
  //    mixed set → all rephrased agreement-free (vous-verbs / «il y a»). ───
  { en: 'The {obj} opens.', out: 'Vous ouvrez {obj.def}.' },
  {
    en: 'Opening the {obj} reveals a {obj2}.',
    out: 'En ouvrant {obj.def}, vous découvrez {obj2.indef}.',
  },
  { en: 'The {obj} is now closed.', out: 'Vous fermez {obj.def}.' },
  {
    en: 'The {obj} is closed.',
    out: "Il faudrait d'abord ouvrir {obj.def}.",
  },
  {
    en: "The {obj} isn't open.",
    out: "Il faudrait d'abord ouvrir {obj.def}.",
  },
  { en: 'The {obj} is empty.', out: "Il n'y a rien dans {obj.def}." },
  {
    en: 'The {obj} is already in the {obj2}.',
    out: 'Il y a déjà {obj.def} dans {obj2.def}.',
  },
  {
    en: "The {obj} isn't in the {obj2}.",
    out: 'Vous ne trouvez pas {obj.def} dans {obj2.def}.',
  },

  // ── Devices (gverbs.zil V-LAMP-ON :792 / V-LAMP-OFF :779). Verbal
  //    rephrase dodges «allumé(e)/éteint(e)» agreement. ───────────────────
  { en: 'The {obj} is now on.', out: 'Vous allumez {obj.def}.' },
  { en: 'The {obj} is now off.', out: 'Vous éteignez {obj.def}.' },

  // ── Vehicles & boarding (gverbs.zil :213, :225, :221, :2040) ───────────
  {
    en: 'You are already in the {obj}!',
    out: 'Vous êtes déjà dans {obj.def} !',
  },
  {
    en: 'You are now in the {obj}.',
    out: 'Vous êtes maintenant dans {obj.def}.',
  },
  {
    en: 'You have a theory on how to board a {obj}, perhaps?',
    out: 'Vous avez peut-être une théorie sur la façon de monter dans {obj.indef} ?',
  },
  {
    en: "You can't go there in a {obj}.",
    out: 'Vous ne pouvez pas y aller avec {obj.indef}.',
  },

  // ── Wearing & winding (gverbs.zil :1385, :1599, :1608) ─────────────────
  {
    en: 'You are now wearing the {obj}.',
    out: 'Vous portez maintenant {obj.def}.',
  },
  {
    en: "You can't wear the {obj}.",
    out: 'Vous ne pouvez pas mettre {obj.def}.',
  },
  {
    en: 'You cannot wind up a {obj}.',
    out: 'Vous ne pouvez pas remonter {obj.indef}.',
  },

  // ── Verb-default refusals & quips (gverbs.zil, line cited per entry) ───
  // :274
  {
    en: "You can't burn a {obj}.",
    out: 'Vous ne pouvez pas brûler {obj.indef}.',
  },
  // :298
  {
    en: "You can't climb onto the {obj}.",
    out: 'Vous ne pouvez pas grimper sur {obj.def}.',
  },
  // :916, :918
  {
    en: 'Moving the {obj} reveals nothing.',
    out: 'Déplacer {obj.def} ne révèle rien.',
  },
  {
    en: "You can't move the {obj}.",
    out: 'Vous ne pouvez pas déplacer {obj.def}.',
  },
  // :863
  {
    en: 'There is nothing behind the {obj}.',
    out: "Il n'y a rien derrière {obj.def}.",
  },
  // :630
  {
    en: "There's nothing special about the {obj}.",
    out: 'Rien de particulier concernant {obj.def}.',
  },
  // :853 («en écoutant» keeps {obj} in object position — number-free)
  {
    en: 'The {obj} makes no sound.',
    out: "Vous n'entendez rien en écoutant {obj.def}.",
  },
  // :361 («laisser de marbre» — «laisse» agrees with «cela», never {obj})
  {
    en: 'The {obj} pays no attention.',
    out: 'Cela laisse {obj.def} de marbre.',
  },
  // :715, :717 («refusée» agrees with «offre», never {obj}; the refusing
  // actor — the addressee — is obvious from context, so the slot is dropped)
  {
    en: "You can't give a {obj} to a {obj2}!",
    out: 'Vous ne pouvez pas donner {obj.indef} à {obj2.indef} !',
  },
  {
    en: 'The {obj} refuses it politely.',
    out: 'Votre offre est poliment refusée.',
  },
  // :1399 («avec» dodges à+le→au)
  {
    en: "You can't talk to the {obj}!",
    out: 'Vous ne pouvez pas parler avec {obj.def} !',
  },
  // :1469
  {
    en: "You can't tie the {obj} to that.",
    out: 'Vous ne pouvez pas attacher {obj.def} à cela.',
  },
  // :339
  {
    en: 'You must tell me how to do that to a {obj}.',
    out: 'Vous devez me dire comment faire cela à {obj.indef}.',
  },
  // :249 (punctuation cluster kept verbatim)
  { en: 'With a {obj}??!?', out: 'Avec {obj.indef} ??!?' },
  // 1actions.zil:62
  {
    en: 'A nice idea, but with a {obj}?',
    out: "L'idée est bonne, mais avec {obj.indef} ?",
  },
  // gverbs.zil:188
  {
    en: 'Trying to attack the {obj} with a {obj2} is suicidal.',
    out: 'Attaquer {obj.def} avec {obj2.indef} est suicidaire.',
  },
  // :769
  { en: 'Why knock on a {obj}?', out: 'Pourquoi frapper sur {obj.indef} ?' },
  // :414, :416
  {
    en: 'Digging with the {obj} is slow and tedious.',
    out: 'Creuser avec {obj.def} est lent et fastidieux.',
  },
  {
    en: 'Digging with a {obj} is silly.',
    out: 'Creuser avec {obj.indef} est ridicule.',
  },
  // :400 (EN really prints four dots)
  {
    en: 'Strange concept, cutting the {obj}....',
    out: "Drôle d'idée que de couper {obj.def}...",
  },
  // :1145, :1141
  {
    en: 'How does one read a {obj}?',
    out: 'Comment peut-on lire {obj.indef} ?',
  },
  {
    en: 'How does one look through a {obj}?',
    out: 'Comment peut-on regarder à travers {obj.indef} ?',
  },
  // :890 («dans» dodges de+indef elision)
  {
    en: "You can't look inside a {obj}.",
    out: 'Vous ne pouvez pas regarder dans {obj.indef}.',
  },
  // :1279 (the def form gives the idiomatic «Cela sent la gousse d'ail.»)
  { en: 'It smells like a {obj}.', out: 'Cela sent {obj.def}.' },
  // :1289 («a» agrees with «cela»; «pour» is contraction-safe)
  {
    en: 'The {obj} does not understand this.',
    out: "Cela n'a aucun sens pour {obj.def}.",
  },
  // :1157
  {
    en: 'It is hardly likely that the {obj} is interested.',
    out: "Cela n'intéresse probablement pas {obj.def}.",
  },
  // :1126
  {
    en: "There's no good surface on the {obj}.",
    out: "Il n'y a pas de surface convenable sur {obj.def}.",
  },
  // :587
  {
    en: "You can't filch the {obj}!",
    out: 'Vous ne pouvez pas dérober {obj.def} !',
  },
  // :599 (the infinitive «disparaître» never agrees with {obj})
  {
    en: 'The {obj} goes up in a puff of smoke.',
    out: 'Vous voyez {obj.def} disparaître dans un nuage de fumée.',
  },
  // ── V-FIND replies (gverbs.zil :693-:697) — «l'» elides, so the sought
  //    object's gender never surfaces. «C'est … qui l'a» stays SINGULAR; a
  //    plural holder is a Task 16 pin («Ce sont … qui l'ont», see header). ─
  { en: 'The {obj} has it.', out: "C'est {obj.def} qui l'a." },
  { en: "It's on the {obj}.", out: "C'est sur {obj.def}." },
  { en: "It's in the {obj}.", out: "C'est dans {obj.def}." },
  // :2027 («trouvez» agrees with vous, never {obj})
  {
    en: "The {obj} isn't here!",
    out: 'Vous ne trouvez pas {obj.def} ici !',
  },
  // ── Waking (gverbs.zil :160, :168 — verbal rephrases keep {obj} in
  //    object position; «se réveille»/«ne dort pas» would agree in number) ─
  {
    en: 'The {obj} is rudely awakened.',
    out: 'Vous réveillez brutalement {obj.def}.',
  },
  {
    en: "The {obj} isn't sleeping.",
    out: 'Inutile de réveiller {obj.def} : aucun signe de sommeil.',
  },

  // ── Off-path composition shapes (Task 17 — inventory-gate sweep). The
  //    TELL pieces these compose from live in zork1.extraction-ignore.ts;
  //    citations point at the composing ZIL. ───────────────────────────────
  // 1actions.zil:3615-:3643 melee LTABLEs — F-DEF slots only ever hold the
  // three villains (troll/voleur/cyclope, ALL masculine in FR), so the
  // masculine participles («assommé», «étourdi») are provably safe; F-WEP
  // slots use «votre {obj.bare}» (possessive carries no gender surface).
  {
    en: 'A good slash, but it misses the {obj} by a mile.',
    out: "Un bon coup de taille, mais il rate {obj.def} d'une lieue.",
  },
  {
    en: 'You charge, but the {obj} jumps nimbly aside.',
    out: "Vous chargez, mais {obj.def} s'écarte d'un bond agile.",
  },
  {
    en: 'A quick stroke, but the {obj} is on guard.',
    out: 'Un coup rapide, mais {obj.def} est sur ses gardes.',
  },
  {
    en: "A good stroke, but it's too slow; the {obj} dodges.",
    out: 'Un bon coup, mais trop lent ; {obj.def} esquive.',
  },
  {
    en: 'A furious exchange, and the {obj} is knocked out!',
    out: 'Un échange furieux, et {obj.def} est assommé !',
  },
  {
    en: 'The haft of your {obj} knocks out the {obj2}.',
    out: 'Le pommeau de votre {obj.bare} assomme {obj2.def}.',
  },
  {
    en: "It's curtains for the {obj} as your {obj2} removes his head.",
    out: "C'en est fini de {obj.def} : votre {obj2.bare} lui tranche la tête.",
  },
  {
    en: 'The fatal blow strikes the {obj} square in the heart: He dies.',
    out: 'Le coup fatal frappe {obj.def} en plein cœur : il meurt.',
  },
  {
    en: 'The force of your blow knocks the {obj} back, stunned.',
    out: 'La force de votre coup projette {obj.def} en arrière, étourdi.',
  },
  {
    en: 'The quickness of your thrust knocks the {obj} back, stunned.',
    out: 'La vivacité de votre botte projette {obj.def} en arrière, étourdi.',
  },
  {
    en: 'Almost as soon as the {obj} breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.',
    out: "À peine {obj.def} a-t-il rendu son dernier souffle qu'un nuage de brume noire et sinistre l'enveloppe, et quand la brume se dissipe, la carcasse a disparu.",
  },
  // gverbs.zil:2111 — grue death inside a vehicle (the plain-room variant is
  // a full-string pin; the only VEHBIT object is the masculine boat but
  // «dans {obj.def}» is agreement-free anyway).
  {
    en: 'Oh, no! A lurking grue slithered into the {obj} and devoured you!',
    out: "Oh non ! Un grue à l'affût s'est glissé dans {obj.def} et vous a dévoré !",
  },
  // gverbs.zil:264 — burning a held/occupied object («l'aviez» elides, «à
  // l'intérieur» is agreement-free).
  {
    en: 'The {obj} catches fire. Unfortunately, you were holding it at the time.',
    out: "{obj.def} prend feu. Malheureusement, vous l'aviez en main à ce moment-là.",
    cap: true,
  },
  {
    en: 'The {obj} catches fire. Unfortunately, you were in it at the time.',
    out: "{obj.def} prend feu. Malheureusement, vous étiez à l'intérieur à ce moment-là.",
    cap: true,
  },
  // gverbs.zil:725-:731 V-HELLO — greeting an actor / a thing.
  {
    en: 'The {obj} bows his head to you in greeting.',
    out: '{obj.def} incline la tête pour vous saluer.',
    cap: true,
  },
  {
    en: 'It\'s a well known fact that only schizophrenics say "Hello" to a {obj}.',
    out: "C'est un fait bien connu : il n'y a que les schizophrènes pour dire « Bonjour » à {obj.indef}.",
  },
  // gverbs.zil:1202 V-SEND, :1001 V-THROW-OFF, :897 V-LOOK-ON.
  {
    en: 'Why would you send for the {obj}?',
    out: 'Pourquoi envoyer chercher {obj.def} ?',
  },
  {
    en: 'Ahoy -- {obj} overboard!',
    out: 'Ohé — {obj.indef} à la mer !',
  },
  {
    en: 'Look on a {obj}???',
    out: 'Regarder sur {obj.indef} ???',
  },

  // ── HERO-MELEE rows not covered above (1actions.zil:3611-:3648). F-DEF
  //    is only ever the troll or the thief (CYCLOPS-FCN intercepts ATTACK
  //    at 1actions.zil:1575 and never reaches HERO-BLOW), so the masculine
  //    participles and the hard-coded «du {obj.bare}» are provably safe;
  //    F-WEP is the player's weapon → «votre {obj.bare}» (no agreement
  //    surface). Exact pins for single villains (troll parries, thief
  //    staggered…) still win over these by the exact-first rule. ──────────
  {
    en: 'Your {obj} misses the {obj2} by an inch.',
    out: "Votre {obj.bare} manque {obj2.def} d'un pouce.",
  },
  {
    en: 'Clang! Crash! The {obj} parries.',
    out: 'Cling ! Clang ! {obj.def} pare le coup.',
  },
  {
    en: 'Your {obj} crashes down, knocking the {obj2} into dreamland.',
    out: "Votre {obj.bare} s'abat, expédiant {obj2.def} au pays des rêves.",
  },
  {
    en: 'The {obj} is battered into unconsciousness.',
    out: "{obj.def} est roué de coups jusqu'à perdre connaissance.",
    cap: true,
  },
  {
    en: 'The {obj} is knocked out!',
    out: '{obj.def} est assommé !',
    cap: true,
  },
  {
    en: 'The {obj} takes a fatal blow and slumps to the floor dead.',
    out: "{obj.def} reçoit un coup fatal et s'effondre au sol, mort.",
    cap: true,
  },
  {
    en: 'The {obj} is struck on the arm; blood begins to trickle down.',
    out: '{obj.def} est touché au bras ; le sang commence à couler.',
    cap: true,
  },
  {
    en: "Your {obj} pinks the {obj2} on the wrist, but it's not serious.",
    out: "Votre {obj.bare} pique {obj2.def} au poignet, mais ce n'est pas grave.",
  },
  {
    en: "The blow lands, making a shallow gash in the {obj}'s arm!",
    out: 'Le coup porte, ouvrant une entaille superficielle au bras du {obj.bare} !',
  },
  {
    en: 'The {obj} receives a deep gash in his side.',
    out: '{obj.def} reçoit une profonde entaille au flanc.',
    cap: true,
  },
  {
    en: 'A savage blow on the thigh! The {obj} is stunned but can still fight!',
    out: 'Un coup sauvage à la cuisse ! {obj.def} est étourdi mais peut encore se battre !',
  },
  {
    en: 'The {obj} is staggered, and drops to his knees.',
    out: '{obj.def} chancelle et tombe à genoux.',
    cap: true,
  },
  {
    en: "The {obj} is momentarily disoriented and can't fight back.",
    out: '{obj.def} est un instant désorienté et ne peut pas riposter.',
    cap: true,
  },
  {
    en: "The {obj} is confused and can't fight back.",
    out: '{obj.def} est déconcerté et ne peut pas riposter.',
    cap: true,
  },
  {
    en: "The {obj}'s weapon is knocked to the floor, leaving him unarmed.",
    out: "L'arme du {obj.bare} est projetée au sol, le laissant désarmé.",
  },
  {
    en: 'The {obj} is disarmed by a subtle feint past his guard.',
    out: '{obj.def} est désarmé par une feinte subtile qui déjoue sa garde.',
    cap: true,
  },
  // HERO-BLOW frame lines (1actions.zil:3499-:3507, :3419) — the unarmed
  // troll / unconscious thief combos are exact pins; these cover the rest.
  {
    en: 'The unarmed {obj} cannot defend himself: He dies.',
    out: '{obj.def} désarmé ne peut pas se défendre : il meurt.',
    cap: true,
  },
  {
    en: 'The unconscious {obj} cannot defend himself: He dies.',
    out: '{obj.def} inconscient ne peut pas se défendre : il meurt.',
    cap: true,
  },
  {
    en: 'The {obj} slowly regains his feet.',
    out: '{obj.def} se relève lentement.',
    cap: true,
  },
  {
    en: 'Attacking the {obj} is pointless.',
    out: 'Attaquer {obj.def} ne sert à rien.',
  },
  // VILLAIN-BLOW :3473 — the remaining weapon after a disarm.
  {
    en: 'Fortunately, you still have a {obj}.',
    out: 'Heureusement, il vous reste {obj.indef}.',
  },

  // ── Villain-disarm rows (TROLL-MELEE :3720-:3723, THIEF-MELEE :3774-
  //    :3779, CYCLOPS-MELEE :3674-:3678 — F-WEP = the PLAYER's weapon).
  //    «votre arme» picks up EN's "it" so nothing agrees with the weapon's
  //    gender (épée f / couteau m / stylet m). ──────────────────────────────
  {
    en: 'The axe hits your {obj} and knocks it spinning.',
    out: "La hache heurte votre {obj.bare} et l'envoie valser.",
  },
  {
    en: 'The troll swings, you parry, but the force of his blow knocks your {obj} away.',
    out: 'Le troll frappe, vous parez, mais la force de son coup fait voler votre {obj.bare}.',
  },
  {
    en: 'The axe knocks your {obj} out of your hand. It falls to the floor.',
    out: 'La hache fait sauter votre {obj.bare} de votre main. Votre arme tombe au sol.',
  },
  {
    en: 'A long, theatrical slash. You catch it on your {obj}, but the thief twists his knife, and the {obj2} goes flying.',
    out: "Un long coup de taille théâtral. Vous le bloquez avec votre {obj.bare}, mais le voleur tord son couteau, et votre {obj2.bare} s'envole.",
  },
  {
    en: 'The thief neatly flips your {obj} out of your hands, and it drops to the floor.',
    out: "D'une pichenette adroite, le voleur fait sauter votre {obj.bare} de vos mains, et votre arme tombe au sol.",
  },
  {
    en: 'You parry a low thrust, and your {obj} slips out of your hand.',
    out: 'Vous parez une botte basse, et votre {obj.bare} vous glisse de la main.',
  },
  // «le tout» dodges agreeing "it" with the weapon (and keeps the gag).
  {
    en: 'The Cyclops grabs your {obj}, tastes it, and throws it to the ground in disgust.',
    out: 'Le Cyclope attrape votre {obj.bare}, y goûte, et jette le tout au sol avec dégoût.',
  },
  {
    en: 'The monster grabs you on the wrist, squeezes, and you drop your {obj} in pain.',
    out: 'Le monstre vous saisit le poignet, serre, et la douleur vous fait lâcher votre {obj.bare}.',
  },
  // TROLL-MELEE light-wound :3710 — "your sword arm" (the arm holding it).
  {
    en: 'The troll charges, and his axe slashes you on your {obj} arm.',
    out: 'Le troll charge, et sa hache vous entaille le bras qui tient votre {obj.bare}.',
  },
  // Shared WEAPON-FUNCTION weapon-recovery guards (1actions.zil:629-:638),
  // reached via AXE-F (troll/axe) AND STILETTO-FUNCTION (thief/stiletto).
  // The feminine «chauffée»/«la» below are exact for the axe («la hache»);
  // the thief/stiletto compositions (masculine «le stylet») are pinned as
  // exact full lines in zork1.fr.strings.ts — exact-first beats these.
  {
    en: 'The {obj} swings it out of your reach.',
    out: '{obj.def} la balance hors de votre portée.',
    cap: true,
  },
  {
    en: "The {obj} seems white-hot. You can't hold on to it.",
    out: '{obj.def} semble chauffée à blanc. Impossible de la garder en main.',
    cap: true,
  },

  // ── V-ATTACK / V-STAB / PRE-MUNG refusals (gverbs.zil :176-:188, :1297-
  //    :1303, :923-:937). ──────────────────────────────────────────────────
  {
    en: "I've known strange people, but fighting a {obj}?",
    out: "J'ai connu des gens étranges, mais se battre contre {obj.indef} ?",
  },
  {
    en: 'Trying to attack a {obj} with your bare hands is suicidal.',
    out: 'Attaquer {obj.indef} à mains nues est suicidaire.',
  },
  {
    en: 'No doubt you propose to stab the {obj} with your pinky?',
    out: 'Vous comptez sans doute poignarder {obj.def} avec votre petit doigt ?',
  },
  {
    en: 'Trying to destroy the {obj} with your bare hands is futile.',
    out: 'Essayer de détruire {obj.def} à mains nues est peine perdue.',
  },
  {
    en: 'Trying to destroy the {obj} with a {obj2} is futile.',
    out: 'Essayer de détruire {obj.def} avec {obj2.indef} est peine perdue.',
  },
  // gverbs.zil:398 — cut with a non-weapon («Comme tranchant, …» dodges
  // the banned de+indef elision).
  {
    en: 'The "cutting edge" of a {obj} is hardly adequate.',
    out: 'Comme tranchant, {obj.indef} laisse plutôt à désirer.',
  },
  // gverbs.zil:394 — the "{wep}smanship" splice ("nasty knifesmanship"…);
  // the matcher resolves the slot mid-word. «en virtuose» carries the joke;
  // «taillant» keeps {obj2} agreement-free (le tableau / les feuilles).
  {
    en: 'Your skillful {obj}smanship slices the {obj2} into innumerable slivers which blow away.',
    out: "Vous maniez votre {obj.bare} en virtuose, taillant {obj2.def} en innombrables copeaux qui s'envolent.",
  },

  // ── HACK-HACK verb defaults (gverbs.zil:2024-:2037): five gerund
  //    prefixes (V-KICK :760, V-LOWER/V-RAISE :902/:1131, V-PUSH :1070,
  //    V-RUB :1165, V-WAVE :1595) × the three HO-HUM suffixes — all 15
  //    composed lines, enumerated. French keeps the infinitive-subject
  //    shape («Pousser X n'a aucun effet»), agreement-free. ────────────────
  {
    en: "Kicking the {obj} doesn't seem to work.",
    out: 'Donner des coups de pied dans {obj.def} ne semble pas marcher.',
  },
  {
    en: "Kicking the {obj} isn't notably helpful.",
    out: "Donner des coups de pied dans {obj.def} n'est pas d'une utilité notable.",
  },
  {
    en: 'Kicking the {obj} has no effect.',
    out: "Donner des coups de pied dans {obj.def} n'a aucun effet.",
  },
  {
    en: "Waving the {obj} doesn't seem to work.",
    out: 'Agiter {obj.def} ne semble pas marcher.',
  },
  {
    en: "Waving the {obj} isn't notably helpful.",
    out: "Agiter {obj.def} n'est pas d'une utilité notable.",
  },
  {
    en: 'Waving the {obj} has no effect.',
    out: "Agiter {obj.def} n'a aucun effet.",
  },
  {
    en: "Fiddling with the {obj} doesn't seem to work.",
    out: 'Tripoter {obj.def} ne semble pas marcher.',
  },
  {
    en: "Fiddling with the {obj} isn't notably helpful.",
    out: "Tripoter {obj.def} n'est pas d'une utilité notable.",
  },
  {
    en: 'Fiddling with the {obj} has no effect.',
    out: "Tripoter {obj.def} n'a aucun effet.",
  },
  {
    en: "Playing in this way with the {obj} doesn't seem to work.",
    out: 'Jouer de cette façon avec {obj.def} ne semble pas marcher.',
  },
  {
    en: "Playing in this way with the {obj} isn't notably helpful.",
    out: "Jouer de cette façon avec {obj.def} n'est pas d'une utilité notable.",
  },
  {
    en: 'Playing in this way with the {obj} has no effect.',
    out: "Jouer de cette façon avec {obj.def} n'a aucun effet.",
  },
  {
    en: "Pushing the {obj} doesn't seem to work.",
    out: 'Pousser {obj.def} ne semble pas marcher.',
  },
  {
    en: "Pushing the {obj} isn't notably helpful.",
    out: "Pousser {obj.def} n'est pas d'une utilité notable.",
  },
  {
    en: 'Pushing the {obj} has no effect.',
    out: "Pousser {obj.def} n'a aucun effet.",
  },

  // ── V-DIAGNOSE wound lines (1actions.zil:3998-:4010) — the wound phrase
  //    and the «cured after N moves» carrier print as ONE line; {num} is
  //    the cure countdown. The "You can …" prognosis and "You have been
  //    killed …" lines are finite pins in zork1.fr.strings.ts. ─────────────
  {
    en: 'You have a light wound, which will be cured after {num} moves.',
    out: 'Vous avez une blessure légère, qui sera guérie au bout de {num} tours.',
  },
  {
    en: 'You have a serious wound, which will be cured after {num} moves.',
    out: 'Vous avez une blessure sérieuse, qui sera guérie au bout de {num} tours.',
  },
  {
    en: 'You have several wounds, which will be cured after {num} moves.',
    out: 'Vous avez plusieurs blessures, qui seront guéries au bout de {num} tours.',
  },
  {
    en: 'You have serious wounds, which will be cured after {num} moves.',
    out: 'Vous avez des blessures sérieuses, qui seront guéries au bout de {num} tours.',
  },

  // ── V-THROW (gverbs.zil:1443-:1455). The at-self line glues the TELL and
  //    the JIGS-UP DESC into one display paragraph — matched whole. ─────────
  {
    en: "A terrific throw! The {obj} hits you squarely in the head. Normally, this wouldn't do much damage, but by incredible mischance, you fall over backwards trying to duck, and break your neck, justice being swift and merciful in the Great Underground Empire.",
    out: "Un lancer formidable ! Vous recevez {obj.def} en pleine tête. Normalement, cela ne ferait pas grand mal, mais par une malchance incroyable, vous basculez en arrière en essayant d'esquiver et vous vous brisez la nuque, la justice étant prompte et clémente dans le Grand Empire Souterrain.",
  },
  {
    en: 'The {obj} ducks as the {obj2} flies by and crashes to the ground.',
    out: "{obj.def} se baisse tandis que {obj2.def} passe en sifflant et s'écrase au sol.",
    cap: true,
  },

  // ── Thief gifts (1actions.zil:2002-:2013). The jewel-encrusted-egg
  //    variant of the first line stays pinned (exact wins). ────────────────
  {
    en: 'The thief is taken aback by your unexpected generosity, but accepts the {obj} and stops to admire its beauty.',
    out: "Le voleur est décontenancé par votre générosité inattendue, mais il accepte {obj.def} et s'arrête pour en admirer la beauté.",
  },
  {
    en: 'The thief places the {obj} in his bag and thanks you politely.',
    out: 'Le voleur range {obj.def} dans son sac et vous remercie poliment.',
  },

  // ── Machine lid (1actions.zil:2509) — one-content case; the huge-diamond
  //    line stays pinned. Multi-item PRINT-CONTENTS lists ("a X and a Y")
  //    are unbounded → LLM fallback (see extraction-ignore notes). ──────────
  {
    en: 'The lid opens, revealing a {obj}.',
    out: "Le couvercle s'ouvre, révélant {obj.indef}.",
  },

  // ── More verb-default refusals & quips, swept while making the
  //    extraction-ignore reasons true (citations per entry). ────────────────
  // gverbs.zil:508, :511, :516 (eat/drink guards).
  {
    en: 'You have to be holding the {obj} first.',
    out: "Il faudrait d'abord tenir {obj.def}.",
  },
  {
    en: "You'll have to open the {obj} first.",
    out: "Il faudrait d'abord ouvrir {obj.def}.",
  },
  {
    en: "I don't think that the {obj} would agree with you.",
    out: 'Je ne crois pas que {obj.def} vous réussirait.',
  },
  // gverbs.zil:799 (turn on a burnable), :908 (melt — «puisse fondre» keeps
  // the object agreement-free).
  {
    en: 'If you wish to burn the {obj}, you should say so.',
    out: 'Si vous souhaitez brûler {obj.def}, dites-le.',
  },
  {
    en: "It's not clear that a {obj} can be melted.",
    out: "Il n'est pas évident que {obj.indef} puisse fondre.",
  },
  // gverbs.zil:1037 pour-on; 1actions.zil:192 pour-into («laisse fuir»
  // dodges the banned «hors de + slot» contraction).
  {
    en: 'The water spills over the {obj}, to the floor, and evaporates.',
    out: "L'eau ruisselle sur {obj.def}, se répand au sol et s'évapore.",
  },
  {
    en: 'The water leaks out of the {obj} and evaporates immediately.',
    out: "{obj.def} laisse fuir l'eau, qui s'évapore aussitôt.",
    cap: true,
  },
  // gverbs.zil:1059 V-PUMP, :1189 V-TALK («interpeller» dodges à+le→au).
  {
    en: 'Pump it up with a {obj}?',
    out: 'Le gonfler avec {obj.indef} ?',
  },
  {
    en: 'You must address the {obj} directly.',
    out: 'Vous devez interpeller {obj.def} directement.',
  },
  // gverbs.zil:1222 V-SHAKE («en répandez le contenu» dodges de+le→du; the
  // EN "disappears" grammar slip is not reproduced).
  {
    en: 'The contents of the {obj} spill to the ground.',
    out: 'En secouant {obj.def}, vous en répandez le contenu au sol.',
  },
  {
    en: 'The contents of the {obj} spill out and disappears.',
    out: 'En secouant {obj.def}, vous en répandez le contenu, qui disparaît.',
  },
  // gverbs.zil:1328 V-SWIM (the "dungeon." tail is a pin), :1439 climb.
  {
    en: "Swimming isn't usually allowed in the {obj}.",
    out: "La baignade n'est généralement pas autorisée dans {obj.def}.",
  },
  {
    en: 'You hit your head against the {obj} as you attempt this feat.',
    out: 'Vous vous cognez la tête contre {obj.def} en tentant cet exploit.',
  },
  // gverbs.zil:1831/:1833 PRINT-CONT headers (trailing space normalizes off;
  // the contains: variant is templated above).
  {
    en: 'Sitting on the {obj} is:',
    out: 'Sur {obj.def}, il y a :',
  },
  {
    en: 'The {obj} is holding:',
    out: '{obj.def} tient :',
    cap: true,
  },
  // 1actions.zil:724 (troll/axe), :869 (grating), :1211 (bolt), :2551
  // (machine switch).
  {
    en: 'You would have to get the {obj} first, and that seems unlikely.',
    out: "Il faudrait d'abord mettre la main sur {obj.def}, ce qui semble peu probable.",
  },
  {
    en: 'Can you unlock a grating with a {obj}?',
    out: 'Peut-on déverrouiller une grille avec {obj.indef} ?',
  },
  {
    en: "The bolt won't turn using the {obj}.",
    out: 'Le boulon refuse de tourner avec {obj.def}.',
  },
  {
    en: "It seems that a {obj} won't do.",
    out: "On dirait que {obj.indef} ne fera pas l'affaire.",
  },
  // 1actions.zil:2768 boat puncture (one glued display paragraph).
  {
    en: "It seems that the {obj} didn't agree with the boat, as evidenced by the loud hissing noise issuing therefrom. With a pathetic sputter, the boat deflates, leaving you without.",
    out: "On dirait que {obj.def} n'était pas du goût du bateau, comme en témoigne le sifflement sonore qui s'en échappe. Dans un crachotement pathétique, le bateau se dégonfle, vous laissant démuni.",
  },
  // 1actions.zil:2938/:2942 (egg-opening tools).
  {
    en: "Not to say that using the {obj} isn't original too...",
    out: "Non pas qu'utiliser {obj.def} manque d'originalité non plus...",
  },
  {
    en: 'The concept of using a {obj} is certainly original.',
    out: "L'idée d'utiliser {obj.indef} est assurément originale.",
  },
  // 1actions.zil:3060/:3063 tie-up («le ligoter» — villains are masculine).
  {
    en: 'The {obj} struggles and you cannot tie him up.',
    out: '{obj.def} se débat et vous ne pouvez pas le ligoter.',
    cap: true,
  },
  {
    en: 'Why would you tie up a {obj}?',
    out: 'Pourquoi ligoter {obj.indef} ?',
  },
  // 1actions.zil:3970 (sacred-object vanish), :4158 (dumb container).
  {
    en: 'You suddenly notice that the {obj} vanished.',
    out: 'Vous remarquez soudain que {obj.def} a disparu.',
  },
  {
    en: 'It looks pretty much like a {obj}.',
    out: 'Cela ressemble à peu près à {obj.indef}.',
  },

  // ── Parser multiple-object refusals (gparser.zil:1302-:1310) — the verb
  //    echoed is the player's TYPED token, hence {raw}. ─────────────────────
  {
    en: 'You can\'t use multiple direct objects with "{raw}".',
    out: 'Vous ne pouvez pas employer plusieurs compléments directs avec « {raw} ».',
  },
  {
    en: 'You can\'t use multiple indirect objects with "{raw}".',
    out: 'Vous ne pouvez pas employer plusieurs compléments indirects avec « {raw} ».',
  },
]
