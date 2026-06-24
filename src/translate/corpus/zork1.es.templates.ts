// Zork I × Spanish composing patterns (spec §4.3). EN sides match
// zork1.fr.templates.ts BYTE-EXACT (normalize()d form); Spanish out sides
// authored in Task 6. Tried in specificity order; {obj}-resolving templates
// beat {raw} ones of the same shape (match.ts owns the ordering).
//
// SPANISH COMPOSITION RULES (mirroring the FR discipline):
// - «de»/«a» BEFORE a slot use the contraction FORMS, not a bare preposition:
//   write {obj.delDef} / {obj.alDef} (not "de {obj.def}" / "a {obj.def}"), so
//   a masculine "el X" composes the required «del X»/«al X» and everything else
//   the bare «de la X»/«a la X». The forms are derived for EVERY object by
//   withContractions() (zork1.es.objects.ts), so no contraction template can
//   miss and the matcher stays grammar-free. (The FR corpus, which has no such
//   contraction, instead bans de/a before a slot — that rule does NOT apply
//   here.) A line whose Spanish still resists composition is pinned per-object
//   as a full string (zork1.es.strings.ts).
// - GENDER/NUMBER NEUTRALITY: prefer verbal phrasings where nothing agrees
//   with the object (e.g. «Abres {obj.def}.» rather than «… está cerrado»),
//   because the objects table has plural entries (velas, cerillas, manos,
//   dientes, montañas, fantasmas, cadáveres, bendiciones, cajas de
//   herramientas, acantilados blancos) that an agreeing template composes
//   wrong. Lines whose natural Spanish forces agreement are pinned per-object
//   as full strings (see the candle/matchbook pins in the strings file).
// - {raw} vs {obj}: parser echoes of the player's typed token use {raw}
//   (verbatim passthrough); printed object names use {obj}.
// - Inverted punctuation (¿…?, ¡…!) lives in the out value.
import type { Template } from '../types'

export const ZORK1_ES_TEMPLATES: readonly Template[] = [
  // ── Parser feedback echoing the player's typed token ──────────────────
  {
    en: 'I don\'t know the word "{raw}".',
    out: 'No conozco la palabra «{raw}».',
  },
  {
    en: 'You used the word "{raw}" in a way that I don\'t understand.',
    out: 'Has usado la palabra «{raw}» de una manera que no entiendo.',
  },
  {
    en: "You can't see any {obj} here!",
    out: 'No ves {obj.indef} por ninguna parte.',
  },
  {
    en: "You can't see any {raw} here!",
    out: '¡No ves ningún «{raw}» aquí!',
  },
  // Parser object-disambiguation prompt (gparser.zil WHICH-PRINT, two
  // candidates). Runtime-composed from the ambiguous books the player holds, in
  // an order the parser does not guarantee; a {obj}/{obj2} template renders any
  // book pair either way round, using each book's gendered def form. No «a»/«de»
  // precedes a slot, so the al/del contraction rule above is not engaged. UAT
  // finding F3 (window.loquorMisses()).
  {
    en: 'Which book do you mean, the {obj} or the {obj2}?',
    out: '¿A qué libro te refieres, {obj.def} o {obj2.def}?',
  },
  // Generic disambiguation for any OTHER same-noun set (e.g. the dam buttons):
  // DROP the queried noun ({raw} matched, not echoed) — the translated candidates
  // disambiguate on their own, so no raw English noun is forced on a non-English
  // reader in basic mode (deterministic-no-english goal; the `push button` dam
  // prompt was LLM-routed → an EN leak with no model). «cuál» is gender-neutral.
  // Sorts AFTER the literal book pin, so book keeps its natural «libro» mention.
  {
    en: 'Which {raw} do you mean, the {obj} or the {obj2}?',
    out: '¿A cuál te refieres, {obj.def} o {obj2.def}?',
  },
  {
    en: 'Which {raw} do you mean, the {obj}, the {obj2}, or the {obj3}?',
    out: '¿A cuál te refieres, {obj.def}, {obj2.def} o {obj3.def}?',
  },
  {
    en: 'Which {raw} do you mean, the {obj}, the {obj2}, the {obj3}, or the {obj4}?',
    out: '¿A cuál te refieres, {obj.def}, {obj2.def}, {obj3.def} o {obj4.def}?',
  },
  // Parser orphan prompt (gparser.zil:760-774): "What do you want to <verb>[ the
  // <noun>] <prep>?". Off-walkthrough, runtime-composed, so both gates miss it; it
  // leaked RAW English (UAT 2026-06-20). {verb}/{raw} capture the player's echoed
  // tokens for MATCHING; the out is verb-neutral generic (drops both — «lo», the
  // unmarked default clitic, no agreeing slot). One template per confirmed
  // orphaning prep covers every verb that orphans on it. Reachable preps: `in`
  // (bare `put X`) and `with` (`cut`/`strike X`); `on`->WEAR and
  // `under`/`behind`->unparsed never orphan, so they are not authored.
  {
    en: 'What do you want to {verb} the {raw} in?',
    out: '¿Dónde quieres ponerlo?',
  },
  {
    en: 'What do you want to {verb} the {raw} with?',
    out: '¿Con qué quieres hacerlo?',
  },
  { en: 'What do you want to {verb}?', out: '¿Qué quieres hacer?' },

  // ── Presence & listings ─────────────────────────────────────────────────
  { en: 'There is a {obj} here.', out: 'Hay {obj.indef} aquí.' },
  {
    en: 'There is a {obj} here (providing light).',
    out: 'Hay {obj.indef} aquí (que da luz).',
  },
  {
    en: 'A {obj} (providing light)',
    out: '{obj.indef} (que da luz)',
    cap: true,
  },
  {
    en: 'A {obj} (being worn)',
    out: '{obj.indef} (que llevas puesta)',
    cap: true,
  },
  {
    en: 'There is a {obj} here. (outside the {obj2})',
    out: 'Hay {obj.indef} aquí. (fuera {obj2.delDef})',
  },
  {
    en: 'A {obj}, with a {obj2}',
    out: '{obj.indef}, con {obj2.indef}',
    cap: true,
  },
  { en: 'The {obj} contains:', out: 'Dentro {obj.delDef} hay:' },
  { en: '(You are in the {obj}.)', out: '(Estás en {obj.def}.)' },
  { en: '({obj})', out: '({obj.def})' },
  { en: '(with the {obj})', out: '(con {obj.def})' },

  // ── Score ────────────────────────────────────────────────────────────────
  {
    en: 'Your score is {num} (total of 350 points), in {num2} moves.',
    out: 'Tu puntuación es {num} (de un total de 350 puntos), en {num2} jugadas.',
  },
  {
    en: 'Your score is {num} (total of 350 points), in {num2} move.',
    out: 'Tu puntuación es {num} (de un total de 350 puntos), en {num2} jugada.',
  },

  // ── Multi-object command prefix ──────────────────────────────────────────
  { en: '{obj}: Taken.', out: 'Coges {obj.def}.' },
  { en: '{obj}: Dropped.', out: 'Sueltas {obj.def}.' },
  {
    en: '{obj}: Your load is too heavy.',
    out: '{obj.bare}: Tu carga es demasiado pesada.',
  },
  {
    en: '{obj}: Your load is too heavy, especially in light of your condition.',
    out: '{obj.bare}: Tu carga es demasiado pesada, sobre todo dado tu estado.',
  },
  // Object-specific `take all` failure reasons (UAT 2026-06-19: the Living Room
  // rug/trophy case leaked English on `take all`). Reason reused from each
  // standalone string pin.
  {
    en: '{obj}: The rug is extremely heavy and cannot be carried.',
    out: '{obj.bare}: La alfombra es sumamente pesada y no puede transportarse.',
  },
  {
    en: '{obj}: The trophy case is securely fastened to the wall.',
    out: '{obj.bare}: La vitrina está firmemente sujeta a la pared.',
  },

  // ── take/drop/have family ────────────────────────────────────────────────
  {
    en: "You're not carrying the {obj}.",
    out: 'No llevas {obj.def} encima.',
  },
  { en: "You don't have the {obj}.", out: 'No tienes {obj.def}.' },
  {
    en: "You aren't even holding the {obj}.",
    out: 'Ni siquiera sostienes {obj.def}.',
  },

  // ── open/close & containers ──────────────────────────────────────────────
  { en: 'The {obj} opens.', out: 'Abres {obj.def}.' },
  {
    en: 'Opening the {obj} reveals a {obj2}.',
    out: 'Al abrir {obj.def}, descubres {obj2.indef}.',
  },
  { en: 'The {obj} is now closed.', out: 'Cierras {obj.def}.' },
  {
    en: 'The {obj} is closed.',
    out: 'Primero habría que abrir {obj.def}.',
  },
  {
    en: "The {obj} isn't open.",
    out: 'Primero habría que abrir {obj.def}.',
  },
  { en: 'The {obj} is empty.', out: 'No hay nada en {obj.def}.' },
  // V-POUR-ON / HOT-BELL-F (Hades exorcism) — nominative subject.
  { en: 'The {obj} is extinguished.', out: '{obj.def} se apaga.' },
  {
    en: 'The {obj} burns and is consumed.',
    out: '{obj.def} se quema y se consume.',
  },
  {
    en: 'The {obj} is already in the {obj2}.',
    out: 'Ya hay {obj.def} en {obj2.def}.',
  },
  {
    en: "The {obj} isn't in the {obj2}.",
    out: 'No encuentras {obj.def} en {obj2.def}.',
  },

  // ── Devices ──────────────────────────────────────────────────────────────
  { en: 'The {obj} is now on.', out: 'Enciendes {obj.def}.' },
  { en: 'The {obj} is now off.', out: 'Apagas {obj.def}.' },

  // ── Vehicles & boarding ──────────────────────────────────────────────────
  {
    en: 'You are already in the {obj}!',
    out: '¡Ya estás en {obj.def}!',
  },
  {
    en: 'You are now in the {obj}.',
    out: 'Ahora estás en {obj.def}.',
  },
  {
    en: 'You have a theory on how to board a {obj}, perhaps?',
    out: '¿Tienes acaso una teoría sobre cómo subir a {obj.indef}?',
  },
  {
    en: "You can't go there in a {obj}.",
    out: 'No puedes ir allí con {obj.indef}.',
  },

  // ── Wearing & winding ────────────────────────────────────────────────────
  {
    en: 'You are now wearing the {obj}.',
    out: 'Ahora llevas puesta {obj.def}.',
  },
  {
    en: "You can't wear the {obj}.",
    out: 'No puedes ponerte {obj.def}.',
  },
  {
    en: 'You cannot wind up a {obj}.',
    out: 'No puedes dar cuerda a {obj.indef}.',
  },

  // ── Verb-default refusals & quips ────────────────────────────────────────
  {
    en: "You can't burn a {obj}.",
    out: 'No puedes quemar {obj.indef}.',
  },
  {
    en: "You can't climb onto the {obj}.",
    out: 'No puedes trepar sobre {obj.def}.',
  },
  {
    en: 'Moving the {obj} reveals nothing.',
    out: 'Mover {obj.def} no revela nada.',
  },
  {
    en: "You can't move the {obj}.",
    out: 'No puedes mover {obj.def}.',
  },
  {
    en: 'There is nothing behind the {obj}.',
    out: 'No hay nada detrás {obj.delDef}.',
  },
  {
    en: "There's nothing special about the {obj}.",
    out: 'Nada especial en cuanto {obj.alDef}.',
  },
  {
    en: 'The {obj} makes no sound.',
    out: 'No oyes nada al escuchar {obj.def}.',
  },
  {
    en: 'The {obj} pays no attention.',
    out: 'Eso deja indiferente {obj.alDef}.',
  },
  {
    en: "You can't give a {obj} to a {obj2}!",
    out: '¡No puedes dar {obj.indef} a {obj2.indef}!',
  },
  {
    en: 'The {obj} refuses it politely.',
    out: 'Tu ofrecimiento es rechazado cortésmente.',
  },
  {
    en: "You can't talk to the {obj}!",
    out: '¡No puedes hablar con {obj.def}!',
  },
  {
    en: "You can't tie the {obj} to that.",
    out: 'No puedes atar {obj.def} a eso.',
  },
  {
    en: 'You must tell me how to do that to a {obj}.',
    out: 'Debes decirme cómo hacer eso a {obj.indef}.',
  },
  { en: 'With a {obj}??!?', out: '¿¿Con {obj.indef}??!?' },
  {
    en: 'A nice idea, but with a {obj}?',
    out: 'Buena idea, pero ¿con {obj.indef}?',
  },
  {
    en: 'Trying to attack the {obj} with a {obj2} is suicidal.',
    out: 'Atacar {obj.def} con {obj2.indef} es un suicidio.',
  },
  { en: 'Why knock on a {obj}?', out: '¿Por qué llamar a {obj.indef}?' },
  {
    en: 'Digging with the {obj} is slow and tedious.',
    out: 'Cavar con {obj.def} es lento y tedioso.',
  },
  {
    en: 'Digging with a {obj} is silly.',
    out: 'Cavar con {obj.indef} es ridículo.',
  },
  {
    en: 'Strange concept, cutting the {obj}....',
    out: 'Qué idea más rara, cortar {obj.def}...',
  },
  {
    en: 'How does one read a {obj}?',
    out: '¿Cómo se lee {obj.indef}?',
  },
  {
    en: 'How does one look through a {obj}?',
    out: '¿Cómo se mira a través de {obj.indef}?',
  },
  {
    en: "You can't look inside a {obj}.",
    out: 'No puedes mirar dentro de {obj.indef}.',
  },
  { en: 'It smells like a {obj}.', out: 'Huele a {obj.bare}.' },
  {
    en: 'The {obj} does not understand this.',
    out: 'Esto no tiene sentido para {obj.def}.',
  },
  {
    en: 'It is hardly likely that the {obj} is interested.',
    out: 'Es poco probable que esto le interese {obj.alDef}.',
  },
  {
    en: "There's no good surface on the {obj}.",
    out: 'No hay una superficie adecuada en {obj.def}.',
  },
  {
    en: "You can't filch the {obj}!",
    out: '¡No puedes hurtar {obj.def}!',
  },
  {
    en: 'The {obj} goes up in a puff of smoke.',
    out: 'Ves desaparecer {obj.def} en una nube de humo.',
  },
  { en: 'The {obj} has it.', out: 'Lo tiene {obj.def}.' },
  { en: "It's on the {obj}.", out: 'Está sobre {obj.def}.' },
  { en: "It's in the {obj}.", out: 'Está en {obj.def}.' },
  {
    en: "The {obj} isn't here!",
    out: '¡No encuentras {obj.def} aquí!',
  },
  {
    en: 'The {obj} is rudely awakened.',
    out: 'Despiertas bruscamente {obj.alDef}.',
  },
  {
    en: "The {obj} isn't sleeping.",
    out: 'Inútil despertar {obj.alDef}: no hay señal de sueño.',
  },

  // ── Off-path composition shapes (melee LTABLEs etc.) ─────────────────────
  {
    en: 'A good slash, but it misses the {obj} by a mile.',
    out: 'Un buen tajo, pero falla {obj.alDef} por un buen trecho.',
  },
  {
    en: 'You charge, but the {obj} jumps nimbly aside.',
    out: 'Cargas, pero {obj.def} se aparta con un ágil salto.',
  },
  {
    en: 'A quick stroke, but the {obj} is on guard.',
    out: 'Un golpe rápido, pero {obj.def} está en guardia.',
  },
  {
    en: "A good stroke, but it's too slow; the {obj} dodges.",
    out: 'Un buen golpe, pero demasiado lento; {obj.def} lo esquiva.',
  },
  {
    en: 'A furious exchange, and the {obj} is knocked out!',
    out: '¡Un furioso intercambio, y {obj.def} queda fuera de combate!',
  },
  {
    en: 'The haft of your {obj} knocks out the {obj2}.',
    out: 'El mango {obj.delDef} deja sin sentido {obj2.alDef}.',
  },
  {
    en: "It's curtains for the {obj} as your {obj2} removes his head.",
    out: 'Se acabó para {obj.def}: {obj2.def} le corta la cabeza.',
  },
  {
    en: 'The fatal blow strikes the {obj} square in the heart: He dies.',
    out: 'El golpe fatal alcanza {obj.alDef} de lleno en el corazón: muere.',
  },
  {
    en: 'The force of your blow knocks the {obj} back, stunned.',
    out: 'La fuerza de tu golpe lanza {obj.alDef} hacia atrás, aturdido.',
  },
  {
    en: 'The quickness of your thrust knocks the {obj} back, stunned.',
    out: 'La rapidez de tu estocada lanza {obj.alDef} hacia atrás, aturdido.',
  },
  {
    en: 'Almost as soon as the {obj} breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.',
    out: 'Apenas {obj.def} exhala su último aliento, una nube de niebla negra y siniestra lo envuelve, y cuando la niebla se disipa, el cadáver ha desaparecido.',
  },
  {
    en: 'Oh, no! A lurking grue slithered into the {obj} and devoured you!',
    out: '¡Oh, no! ¡Un grue al acecho se deslizó dentro {obj.delDef} y te devoró!',
  },
  {
    en: 'The {obj} catches fire. Unfortunately, you were holding it at the time.',
    // 2nd-clause subject is the object itself ("estaba…"), so it agrees by
    // gender automatically — the BURNBIT held set is mostly masculine (el libro,
    // el saco, el folleto…). A "la/lo sostenías" clitic would mis-agree. (UAT)
    out: '{obj.def} se prende fuego. Por desgracia, estaba en tus manos en ese momento.',
    cap: true,
  },
  {
    en: 'The {obj} catches fire. Unfortunately, you were in it at the time.',
    out: '{obj.def} se prende fuego. Por desgracia, estabas dentro en ese momento.',
    cap: true,
  },
  {
    en: 'The {obj} bows his head to you in greeting.',
    out: '{obj.def} inclina la cabeza para saludarte.',
    cap: true,
  },
  {
    en: 'It\'s a well known fact that only schizophrenics say "Hello" to a {obj}.',
    out: 'Es bien sabido que solo los esquizofrénicos dicen «Hola» a {obj.indef}.',
  },
  {
    en: 'Why would you send for the {obj}?',
    out: '¿Por qué mandarías llamar {obj.alDef}?',
  },
  {
    en: 'Ahoy -- {obj} overboard!',
    out: '¡Eh de la nave: {obj.indef} por la borda!',
  },
  {
    en: 'Look on a {obj}???',
    out: '¿¿¿Mirar sobre {obj.indef}???',
  },

  // ── HERO-MELEE rows not covered above ────────────────────────────────────
  {
    en: 'Your {obj} misses the {obj2} by an inch.',
    out: 'Tu {obj.bare} falla {obj2.alDef} por un pelo.',
  },
  {
    en: 'Clang! Crash! The {obj} parries.',
    out: '¡Cling! ¡Clang! {obj.def} para el golpe.',
  },
  {
    en: 'Your {obj} crashes down, knocking the {obj2} into dreamland.',
    out: 'Tu {obj.bare} se abate y manda {obj2.alDef} al país de los sueños.',
  },
  {
    en: 'The {obj} is battered into unconsciousness.',
    out: '{obj.def} recibe una paliza hasta perder el conocimiento.',
    cap: true,
  },
  {
    en: 'The {obj} is knocked out!',
    out: '¡{obj.def} queda fuera de combate!',
    cap: true,
  },
  {
    en: 'The {obj} takes a fatal blow and slumps to the floor dead.',
    out: '{obj.def} recibe un golpe fatal y se desploma muerto en el suelo.',
    cap: true,
  },
  {
    en: 'The {obj} is struck on the arm; blood begins to trickle down.',
    out: '{obj.def} es alcanzado en el brazo; la sangre empieza a chorrear.',
    cap: true,
  },
  {
    en: "Your {obj} pinks the {obj2} on the wrist, but it's not serious.",
    out: 'Tu {obj.bare} pincha {obj2.alDef} en la muñeca, pero no es grave.',
  },
  {
    en: "The blow lands, making a shallow gash in the {obj}'s arm!",
    out: '¡El golpe acierta y abre un corte superficial en el brazo {obj.delDef}!',
  },
  {
    en: 'The {obj} receives a deep gash in his side.',
    out: '{obj.def} recibe un profundo corte en el costado.',
    cap: true,
  },
  {
    en: 'A savage blow on the thigh! The {obj} is stunned but can still fight!',
    out: '¡Un golpe salvaje en el muslo! ¡{obj.def} queda aturdido pero aún puede luchar!',
  },
  {
    en: 'The {obj} is staggered, and drops to his knees.',
    out: '{obj.def} se tambalea y cae de rodillas.',
    cap: true,
  },
  {
    en: "The {obj} is momentarily disoriented and can't fight back.",
    out: '{obj.def} queda momentáneamente desorientado y no puede contraatacar.',
    cap: true,
  },
  {
    en: "The {obj} is confused and can't fight back.",
    out: '{obj.def} está confundido y no puede contraatacar.',
    cap: true,
  },
  {
    en: "The {obj}'s weapon is knocked to the floor, leaving him unarmed.",
    out: 'El arma {obj.delDef} cae al suelo, dejándolo desarmado.',
  },
  {
    en: 'The {obj} is disarmed by a subtle feint past his guard.',
    out: '{obj.def} es desarmado por una sutil finta que burla su guardia.',
    cap: true,
  },
  {
    en: 'The unarmed {obj} cannot defend himself: He dies.',
    out: '{obj.def} desarmado no puede defenderse: muere.',
    cap: true,
  },
  {
    en: 'The unconscious {obj} cannot defend himself: He dies.',
    out: '{obj.def} inconsciente no puede defenderse: muere.',
    cap: true,
  },
  {
    en: 'The {obj} slowly regains his feet.',
    out: '{obj.def} se incorpora lentamente.',
    cap: true,
  },
  {
    en: 'Attacking the {obj} is pointless.',
    out: 'Atacar {obj.alDef} no sirve de nada.',
  },
  {
    en: 'Fortunately, you still have a {obj}.',
    out: 'Por suerte, todavía te queda {obj.indef}.',
  },

  // ── Villain-disarm rows (F-WEP = the PLAYER's weapon) ────────────────────
  {
    en: 'The axe hits your {obj} and knocks it spinning.',
    out: 'El hacha golpea tu {obj.bare} y la hace girar lejos.',
  },
  {
    en: 'The troll swings, you parry, but the force of his blow knocks your {obj} away.',
    out: 'El trol golpea, paras, pero la fuerza de su golpe hace volar tu {obj.bare}.',
  },
  {
    en: 'The axe knocks your {obj} out of your hand. It falls to the floor.',
    out: 'El hacha hace saltar tu {obj.bare} de tu mano. Cae al suelo.',
  },
  {
    en: 'A long, theatrical slash. You catch it on your {obj}, but the thief twists his knife, and the {obj2} goes flying.',
    out: 'Un largo y teatral tajo. Lo bloqueas con tu {obj.bare}, pero el ladrón retuerce su cuchillo, y tu {obj2.bare} sale volando.',
  },
  {
    en: 'The thief neatly flips your {obj} out of your hands, and it drops to the floor.',
    out: 'Con un giro limpio, el ladrón hace saltar tu {obj.bare} de tus manos, y cae al suelo.',
  },
  {
    en: 'You parry a low thrust, and your {obj} slips out of your hand.',
    out: 'Paras una estocada baja, y tu {obj.bare} se te escapa de la mano.',
  },
  {
    en: 'The Cyclops grabs your {obj}, tastes it, and throws it to the ground in disgust.',
    out: 'El Cíclope agarra tu {obj.bare}, la prueba y la arroja al suelo con asco.',
  },
  {
    en: 'The monster grabs you on the wrist, squeezes, and you drop your {obj} in pain.',
    out: 'El monstruo te agarra de la muñeca, aprieta, y el dolor te hace soltar tu {obj.bare}.',
  },
  {
    en: 'The troll charges, and his axe slashes you on your {obj} arm.',
    out: 'El trol carga, y su hacha te corta el brazo con que sostienes tu {obj.bare}.',
  },
  {
    en: 'The {obj} swings it out of your reach.',
    out: '{obj.def} la lanza fuera de tu alcance.',
    cap: true,
  },
  {
    en: "The {obj} seems white-hot. You can't hold on to it.",
    out: '{obj.def} parece al rojo vivo. No puedes sujetarla.',
    cap: true,
  },

  // ── V-ATTACK / V-STAB / PRE-MUNG refusals ────────────────────────────────
  {
    en: "I've known strange people, but fighting a {obj}?",
    out: 'He conocido gente rara, pero ¿pelear contra {obj.indef}?',
  },
  {
    en: 'Trying to attack a {obj} with your bare hands is suicidal.',
    out: 'Atacar a {obj.indef} con las manos desnudas es un suicidio.',
  },
  {
    en: 'No doubt you propose to stab the {obj} with your pinky?',
    out: '¿Acaso pretendes apuñalar {obj.alDef} con el meñique?',
  },
  {
    en: 'Trying to destroy the {obj} with your bare hands is futile.',
    out: 'Intentar destruir {obj.def} con las manos desnudas es inútil.',
  },
  {
    en: 'Trying to destroy the {obj} with a {obj2} is futile.',
    out: 'Intentar destruir {obj.def} con {obj2.indef} es inútil.',
  },
  {
    en: 'The "cutting edge" of a {obj} is hardly adequate.',
    out: 'Como filo cortante, {obj.indef} deja bastante que desear.',
  },
  {
    en: 'Your skillful {obj}smanship slices the {obj2} into innumerable slivers which blow away.',
    out: 'Manejas tu {obj.bare} con maestría y cortas {obj2.def} en innumerables astillas que salen volando.',
  },

  // ── HACK-HACK verb defaults ──────────────────────────────────────────────
  {
    en: "Kicking the {obj} doesn't seem to work.",
    out: 'Dar patadas {obj.alDef} no parece funcionar.',
  },
  {
    en: "Kicking the {obj} isn't notably helpful.",
    out: 'Dar patadas {obj.alDef} no resulta de gran ayuda.',
  },
  {
    en: 'Kicking the {obj} has no effect.',
    out: 'Dar patadas {obj.alDef} no tiene ningún efecto.',
  },
  {
    en: "Waving the {obj} doesn't seem to work.",
    out: 'Agitar {obj.def} no parece funcionar.',
  },
  {
    en: "Waving the {obj} isn't notably helpful.",
    out: 'Agitar {obj.def} no resulta de gran ayuda.',
  },
  {
    en: 'Waving the {obj} has no effect.',
    out: 'Agitar {obj.def} no tiene ningún efecto.',
  },
  {
    en: "Fiddling with the {obj} doesn't seem to work.",
    out: 'Trastear con {obj.def} no parece funcionar.',
  },
  {
    en: "Fiddling with the {obj} isn't notably helpful.",
    out: 'Trastear con {obj.def} no resulta de gran ayuda.',
  },
  {
    en: 'Fiddling with the {obj} has no effect.',
    out: 'Trastear con {obj.def} no tiene ningún efecto.',
  },
  {
    en: "Playing in this way with the {obj} doesn't seem to work.",
    out: 'Jugar de esta manera con {obj.def} no parece funcionar.',
  },
  {
    en: "Playing in this way with the {obj} isn't notably helpful.",
    out: 'Jugar de esta manera con {obj.def} no resulta de gran ayuda.',
  },
  {
    en: 'Playing in this way with the {obj} has no effect.',
    out: 'Jugar de esta manera con {obj.def} no tiene ningún efecto.',
  },
  {
    en: "Pushing the {obj} doesn't seem to work.",
    out: 'Empujar {obj.def} no parece funcionar.',
  },
  {
    en: "Pushing the {obj} isn't notably helpful.",
    out: 'Empujar {obj.def} no resulta de gran ayuda.',
  },
  {
    en: 'Pushing the {obj} has no effect.',
    out: 'Empujar {obj.def} no tiene ningún efecto.',
  },

  // ── V-DIAGNOSE wound lines ───────────────────────────────────────────────
  {
    en: 'You have a light wound, which will be cured after {num} moves.',
    out: 'Tienes una herida leve, que sanará al cabo de {num} jugadas.',
  },
  {
    en: 'You have a serious wound, which will be cured after {num} moves.',
    out: 'Tienes una herida grave, que sanará al cabo de {num} jugadas.',
  },
  {
    en: 'You have several wounds, which will be cured after {num} moves.',
    out: 'Tienes varias heridas, que sanarán al cabo de {num} jugadas.',
  },
  {
    en: 'You have serious wounds, which will be cured after {num} moves.',
    out: 'Tienes heridas graves, que sanarán al cabo de {num} jugadas.',
  },

  // ── V-THROW ──────────────────────────────────────────────────────────────
  {
    en: "A terrific throw! The {obj} hits you squarely in the head. Normally, this wouldn't do much damage, but by incredible mischance, you fall over backwards trying to duck, and break your neck, justice being swift and merciful in the Great Underground Empire.",
    out: '¡Un lanzamiento formidable! Recibes {obj.def} de lleno en la cabeza. Normalmente esto no haría mucho daño, pero por una increíble mala suerte caes de espaldas al intentar agacharte y te rompes el cuello, pues la justicia es rápida y clemente en el Gran Imperio Subterráneo.',
  },
  {
    en: 'The {obj} ducks as the {obj2} flies by and crashes to the ground.',
    out: '{obj.def} se agacha mientras {obj2.def} pasa silbando y se estrella contra el suelo.',
    cap: true,
  },

  // ── Thief gifts ──────────────────────────────────────────────────────────
  {
    en: 'The thief is taken aback by your unexpected generosity, but accepts the {obj} and stops to admire its beauty.',
    out: 'El ladrón se queda desconcertado ante tu inesperada generosidad, pero acepta {obj.def} y se detiene a admirar su belleza.',
  },
  {
    en: 'The thief places the {obj} in his bag and thanks you politely.',
    out: 'El ladrón guarda {obj.def} en su bolsa y te da las gracias cortésmente.',
  },

  // ── Machine lid ──────────────────────────────────────────────────────────
  {
    en: 'The lid opens, revealing a {obj}.',
    out: 'La tapa se abre, revelando {obj.indef}.',
  },

  // ── More verb-default refusals & quips ───────────────────────────────────
  {
    en: 'You have to be holding the {obj} first.',
    out: 'Primero tendrías que sostener {obj.def}.',
  },
  {
    en: "You'll have to open the {obj} first.",
    out: 'Primero tendrás que abrir {obj.def}.',
  },
  {
    en: "I don't think that the {obj} would agree with you.",
    out: 'No creo que {obj.def} te siente bien.',
  },
  {
    en: 'If you wish to burn the {obj}, you should say so.',
    out: 'Si quieres quemar {obj.def}, dilo.',
  },
  {
    en: "It's not clear that a {obj} can be melted.",
    out: 'No está claro que {obj.indef} pueda fundirse.',
  },
  {
    en: 'The water spills over the {obj}, to the floor, and evaporates.',
    out: 'El agua resbala por {obj.def}, cae al suelo y se evapora.',
  },
  {
    en: 'The water leaks out of the {obj} and evaporates immediately.',
    out: '{obj.def} deja escapar el agua, que se evapora al instante.',
    cap: true,
  },
  {
    en: 'Pump it up with a {obj}?',
    out: '¿Inflarlo con {obj.indef}?',
  },
  {
    en: 'You must address the {obj} directly.',
    out: 'Debes dirigirte {obj.alDef} directamente.',
  },
  {
    en: 'The contents of the {obj} spill to the ground.',
    out: 'Al sacudir {obj.def}, derramas su contenido por el suelo.',
  },
  {
    en: 'The contents of the {obj} spill out and disappears.',
    out: 'Al sacudir {obj.def}, derramas su contenido, que desaparece.',
  },
  {
    en: "Swimming isn't usually allowed in the {obj}.",
    out: 'Por lo general no se permite nadar en {obj.def}.',
  },
  {
    en: 'You hit your head against the {obj} as you attempt this feat.',
    out: 'Te golpeas la cabeza contra {obj.def} al intentar esta proeza.',
  },
  {
    en: 'Sitting on the {obj} is:',
    out: 'Sobre {obj.def} hay:',
  },
  {
    en: 'The {obj} is holding:',
    out: '{obj.def} contiene:',
    cap: true,
  },
  {
    en: 'You would have to get the {obj} first, and that seems unlikely.',
    out: 'Primero tendrías que hacerte con {obj.def}, y eso parece poco probable.',
  },
  {
    en: 'Can you unlock a grating with a {obj}?',
    out: '¿Se puede abrir una reja con {obj.indef}?',
  },
  {
    en: "The bolt won't turn using the {obj}.",
    out: 'El perno no quiere girar con {obj.def}.',
  },
  {
    en: "It seems that a {obj} won't do.",
    out: 'Parece que {obj.indef} no servirá.',
  },
  {
    en: "It seems that the {obj} didn't agree with the boat, as evidenced by the loud hissing noise issuing therefrom. With a pathetic sputter, the boat deflates, leaving you without.",
    out: 'Parece que {obj.def} no le sentó bien al bote, como atestigua el sonoro silbido que de él sale. Con un patético resoplido, el bote se deshincha, dejándote sin él.',
  },
  {
    en: "Not to say that using the {obj} isn't original too...",
    out: 'No es que usar {obj.def} carezca de originalidad...',
  },
  {
    en: 'The concept of using a {obj} is certainly original.',
    out: 'La idea de usar {obj.indef} es sin duda original.',
  },
  {
    en: 'The {obj} struggles and you cannot tie him up.',
    out: '{obj.def} forcejea y no puedes atarlo.',
    cap: true,
  },
  {
    en: 'Why would you tie up a {obj}?',
    out: '¿Por qué atarías a {obj.indef}?',
  },
  {
    en: 'You suddenly notice that the {obj} vanished.',
    out: 'De pronto notas que {obj.def} ha desaparecido.',
  },
  {
    en: 'It looks pretty much like a {obj}.',
    out: 'Se parece bastante a {obj.indef}.',
  },

  // ── Parser multiple-object refusals ──────────────────────────────────────
  {
    en: 'You can\'t use multiple direct objects with "{raw}".',
    out: 'No puedes usar varios complementos directos con «{raw}».',
  },
  {
    en: 'You can\'t use multiple indirect objects with "{raw}".',
    out: 'No puedes usar varios complementos indirectos con «{raw}».',
  },
]
