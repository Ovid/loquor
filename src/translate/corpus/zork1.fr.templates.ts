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
]
