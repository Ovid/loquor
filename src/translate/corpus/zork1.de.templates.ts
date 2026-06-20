// Zork I × German composing patterns (output-translation spec §4.3, §2.4). EN
// sides match zork1.fr.templates.ts BYTE-EXACT (normalize()d form); German out
// sides select the right grammatical CASE per slot. Tried in specificity order;
// {obj}-resolving templates beat {raw} ones of the same shape (match.ts owns
// the ordering — author in any order).
//
// GERMAN COMPOSITION RULES (the case-form discipline, spec §2.4):
// - {obj} as a DIRECT OBJECT → {obj.akkDef} (the default object case; every
//   object supplies akkDef). As a SUBJECT/citation → {obj.def} (= nominative
//   definite; nomDef differs only on masc-singular der/den objects, where the
//   adjective ending changes, so subjects always use {obj.def} which carries
//   the correct nominative form). For indefinite listings → {obj.indef}
//   (= nominative indefinite), also the key the matcher's BUILTIN "A {obj}"
//   listing hardcodes.
// - NEVER push {obj} into the DATIVE in a SHARED template: a dative-governing
//   preposition before a slot (in/auf/mit/aus/von …) would need a datDef key
//   that most objects don't carry (spec §2.4: dat* keys are supplied only for a
//   bounded set, and German has NO derivation helper). So every line whose
//   natural German would put {obj} after a dative preposition is REPHRASED to
//   keep {obj} accusative — German has plenty of accusative-governing options
//   (durch/für/ohne/gegen/um) and verbal phrasings ("Du durchsuchst {obj.akkDef}"
//   instead of "in {obj.dat}"). Genuinely dative-only niche lines for a single
//   bounded object are pinned as full strings in zork1.de.strings.ts (the §2.4
//   escape hatch), never templated. This is the German analog of the FR rule
//   "never put de/à before a slot".
// - GENDER/NUMBER NEUTRALITY: German verbal phrasings ("Du öffnest {obj.akkDef}.")
//   never agree with the object, so the NINE inherently-plural objects
//   (Segnungen, Werkzeugkisten, Streichhölzer, Berge, Geister, Kerzen, Hände,
//   Zähne, weiße Klippen) compose correctly. The two "(providing light)"
//   listing lines and "The {obj} has it." are pinned per-object as full strings
//   in zork1.de.strings.ts where a shared template can't be number-true.
// - {raw} vs {obj}: parser echoes of the player's TYPED token use {raw}
//   (verbatim passthrough); printed object names use {obj}.
// - German capitalizes ALL nouns; the pre-composed forms already carry the
//   capitalized noun ("den blauen Knopf"). `cap: true` whenever the out side
//   begins with a lowercase pre-composed form so the listing reads as a
//   sentence start.
import type { Template } from '../types'

export const ZORK1_DE_TEMPLATES: readonly Template[] = [
  // ── Parser feedback echoing the player's typed token ──────────────────
  {
    en: 'I don\'t know the word "{raw}".',
    out: 'Ich kenne das Wort „{raw}“ nicht.',
  },
  {
    en: 'You used the word "{raw}" in a way that I don\'t understand.',
    out: 'Du hast das Wort „{raw}“ auf eine Weise verwendet, die ich nicht verstehe.',
  },
  {
    en: "You can't see any {obj} here!",
    out: 'Du siehst {obj.akkDef} hier nirgends!',
  },
  {
    en: "You can't see any {raw} here!",
    out: 'Du siehst hier kein „{raw}“!',
  },
  // Parser object-disambiguation prompt (two candidate books): {obj}/{obj2} in
  // nominative definite. No dative preposition precedes a slot.
  {
    en: 'Which book do you mean, the {obj} or the {obj2}?',
    out: 'Welches Buch meinst du, {obj.def} oder {obj2.def}?',
  },
  // Parser incomplete-`put` prompt (gparser.zil): "What do you want to put the
  // {obj} in?". Off-walkthrough, runtime-composed; leaked RAW English (UAT
  // 2026-06-20). The named object is the player's echoed noun — possibly a
  // lexicon-emit synonym absent from the object table — so bind {raw} (any token)
  // and drop the object on the out side („es“, generic neuter). Informal du, like
  // the rest of this corpus.
  // The orphan reprints whatever preposition the matched PUT syntax carries
  // (gparser.zil PREP-PRINT): gsyntax.zil defines PUT … IN/ON/UNDER/BEHIND, so
  // `put lamp on` / `put X under` / `put X behind` reach the same prompt with a
  // sibling prep (I1). The out side already DROPS the prep („Wohin möchtest du
  // es legen?“ = "where do you want to put it?"), so every variant renders the
  // same — they just need their own en keys to match.
  {
    en: 'What do you want to put the {raw} in?',
    out: 'Wohin möchtest du es legen?',
  },
  {
    en: 'What do you want to put the {raw} on?',
    out: 'Wohin möchtest du es legen?',
  },
  {
    en: 'What do you want to put the {raw} under?',
    out: 'Wohin möchtest du es legen?',
  },
  {
    en: 'What do you want to put the {raw} behind?',
    out: 'Wohin möchtest du es legen?',
  },

  // ── Presence & listings ──────────────────────────────────────────────────
  { en: 'There is a {obj} here.', out: 'Hier ist {obj.indef}.' },
  // ONBIT suffix — light sources read fem/neut; the plural candle/matchbook
  // lines are pinned per-object as full strings (see the strings header).
  {
    en: 'There is a {obj} here (providing light).',
    out: 'Hier ist {obj.indef} (leuchtet).',
  },
  {
    en: 'A {obj} (providing light)',
    out: '{obj.indef} (leuchtet)',
    cap: true,
  },
  {
    en: 'A {obj} (being worn)',
    out: '{obj.indef} (getragen)',
    cap: true,
  },
  // Vehicle tail — "außerhalb" governs the genitive, but the only VEHBIT object
  // is the magic boat; "neben {obj2.akkDef}" (here accusative for direction)
  // keeps the slot in a key every object carries and reads naturally.
  {
    en: 'There is a {obj} here. (outside the {obj2})',
    out: 'Hier ist {obj.indef}. (außerhalb: {obj2.bare})',
  },
  // Thief-death treasure listing, one-content case.
  {
    en: 'A {obj}, with a {obj2}',
    out: '{obj.indef}, mit {obj2.bare}',
    cap: true,
  },
  // PRINT-CONT header — verbal phrasing dodges a dative slot ("Inhalt von" +
  // genitive would need a key; "{obj.def} enthält:" keeps the slot nominative).
  { en: 'The {obj} contains:', out: '{obj.def} enthält:', cap: true },
  { en: '(You are in the {obj}.)', out: '(Standort: {obj.def}.)' },
  // GWIM/orphan parentheticals — the parser echoing the assumed noun.
  { en: '({obj})', out: '({obj.def})' },
  { en: '(with the {obj})', out: '(mit {obj.bare})' },

  // ── Score ──────────────────────────────────────────────────────────────
  {
    en: 'Your score is {num} (total of 350 points), in {num2} moves.',
    out: 'Dein Punktestand ist {num} (von insgesamt 350 Punkten), in {num2} Zügen.',
  },
  {
    en: 'Your score is {num} (total of 350 points), in {num2} move.',
    out: 'Dein Punktestand ist {num} (von insgesamt 350 Punkten), in {num2} Zug.',
  },

  // ── Multi-object command prefix ──────────────────────────────────────────
  { en: '{obj}: Taken.', out: 'Du nimmst {obj.akkDef}.' },
  { en: '{obj}: Dropped.', out: 'Du legst {obj.akkDef} ab.' },
  {
    en: '{obj}: Your load is too heavy.',
    out: '{obj.bare}: Deine Last ist zu schwer.',
  },
  {
    en: '{obj}: Your load is too heavy, especially in light of your condition.',
    out: '{obj.bare}: Deine Last ist zu schwer, zumal in deinem Zustand.',
  },
  // Object-specific `take all` failure reasons (UAT 2026-06-19: the Living Room
  // rug/trophy case leaked English on `take all`). Reason reused from each
  // standalone string pin.
  {
    en: '{obj}: The rug is extremely heavy and cannot be carried.',
    out: '{obj.bare}: Der Teppich ist äußerst schwer und kann nicht getragen werden.',
  },
  {
    en: '{obj}: The trophy case is securely fastened to the wall.',
    out: '{obj.bare}: Die Trophäenvitrine ist fest an der Wand verankert.',
  },

  // ── take/drop/have family ────────────────────────────────────────────────
  {
    en: "You're not carrying the {obj}.",
    out: 'Du trägst {obj.akkDef} nicht bei dir.',
  },
  { en: "You don't have the {obj}.", out: 'Du hast {obj.akkDef} nicht.' },
  {
    en: "You aren't even holding the {obj}.",
    out: 'Du hältst {obj.akkDef} nicht einmal.',
  },

  // ── open/close & containers ──────────────────────────────────────────────
  { en: 'The {obj} opens.', out: 'Du öffnest {obj.akkDef}.' },
  {
    en: 'Opening the {obj} reveals a {obj2}.',
    // "von {obj.bare}" was ungrammatical (von + bare nominative); rephrase with
    // the accusative so it works for every object without a per-object genitive
    // form (UAT O1).
    out: 'Als du {obj.akkDef} öffnest, kommt {obj2.indef} zum Vorschein.',
  },
  { en: 'The {obj} is now closed.', out: 'Du schließt {obj.akkDef}.' },
  {
    en: 'The {obj} is closed.',
    out: 'Du müsstest {obj.akkDef} erst öffnen.',
  },
  {
    en: "The {obj} isn't open.",
    out: 'Du müsstest {obj.akkDef} erst öffnen.',
  },
  { en: 'The {obj} is empty.', out: 'In {obj.akkDef} ist nichts hinein.' },
  {
    en: 'The {obj} is already in the {obj2}.',
    out: '{obj.def} ist bereits da, {obj2.bare} braucht nichts mehr.',
    cap: true,
  },
  {
    en: "The {obj} isn't in the {obj2}.",
    out: 'Du findest {obj.akkDef} nicht — {obj2.bare} enthält das nicht.',
  },

  // ── Devices ──────────────────────────────────────────────────────────────
  { en: 'The {obj} is now on.', out: 'Du schaltest {obj.akkDef} ein.' },
  { en: 'The {obj} is now off.', out: 'Du schaltest {obj.akkDef} aus.' },

  // ── Vehicles & boarding ──────────────────────────────────────────────────
  {
    en: 'You are already in the {obj}!',
    out: 'Du bist bereits an Bord: {obj.def}!',
  },
  {
    en: 'You are now in the {obj}.',
    out: 'Du bist nun an Bord: {obj.def}.',
  },
  {
    en: 'You have a theory on how to board a {obj}, perhaps?',
    out: 'Hast du etwa eine Theorie, wie man {obj.akkDef} besteigt?',
  },
  {
    en: "You can't go there in a {obj}.",
    out: 'Dorthin kommst du nicht mit so etwas wie {obj.bare}.',
  },

  // ── Wearing & winding ─────────────────────────────────────────────────────
  {
    en: 'You are now wearing the {obj}.',
    out: 'Du trägst nun {obj.akkDef}.',
  },
  {
    en: "You can't wear the {obj}.",
    out: 'Du kannst {obj.akkDef} nicht anziehen.',
  },
  {
    en: 'You cannot wind up a {obj}.',
    out: 'Du kannst {obj.akkDef} nicht aufziehen.',
  },

  // ── Verb-default refusals & quips ─────────────────────────────────────────
  {
    en: "You can't burn a {obj}.",
    out: 'Du kannst {obj.akkDef} nicht verbrennen.',
  },
  {
    en: "You can't climb onto the {obj}.",
    out: 'Du kannst {obj.akkDef} nicht erklimmen.',
  },
  {
    en: 'Moving the {obj} reveals nothing.',
    out: 'Wenn du {obj.akkDef} bewegst, kommt nichts zum Vorschein.',
  },
  {
    en: "You can't move the {obj}.",
    out: 'Du kannst {obj.akkDef} nicht bewegen.',
  },
  {
    en: 'There is nothing behind the {obj}.',
    out: 'Hinter {obj.akkDef} ist nichts.',
  },
  {
    en: "There's nothing special about the {obj}.",
    out: 'An {obj.akkDef} ist nichts Besonderes.',
  },
  {
    en: 'The {obj} makes no sound.',
    out: 'Du hörst nichts, wenn du {obj.akkDef} belauschst.',
  },
  {
    en: 'The {obj} pays no attention.',
    out: 'Das lässt {obj.akkDef} völlig kalt.',
  },
  {
    en: "You can't give a {obj} to a {obj2}!",
    out: 'Du kannst {obj.akkDef} nicht so etwas wie {obj2.bare} geben!',
  },
  {
    en: 'The {obj} refuses it politely.',
    out: 'Dein Angebot wird höflich abgelehnt.',
  },
  {
    en: "You can't talk to the {obj}!",
    out: 'Du kannst mit so etwas wie {obj.bare} nicht reden!',
  },
  {
    en: "You can't tie the {obj} to that.",
    out: 'Du kannst {obj.akkDef} daran nicht festbinden.',
  },
  {
    en: 'You must tell me how to do that to a {obj}.',
    out: 'Du musst mir sagen, wie ich das mit so etwas wie {obj.bare} anstellen soll.',
  },
  { en: 'With a {obj}??!?', out: 'Mit so etwas wie {obj.bare}??!?' },
  {
    en: 'A nice idea, but with a {obj}?',
    out: 'Eine nette Idee, aber mit so etwas wie {obj.bare}?',
  },
  {
    en: 'Trying to attack the {obj} with a {obj2} is suicidal.',
    out: 'Der Versuch, {obj.akkDef} mit so etwas wie {obj2.bare} anzugreifen, ist Selbstmord.',
  },
  {
    en: 'Why knock on a {obj}?',
    out: 'Warum an so etwas wie {obj.bare} klopfen?',
  },
  {
    en: 'Digging with the {obj} is slow and tedious.',
    out: 'Mit {obj.bare} zu graben ist langsam und mühsam.',
  },
  {
    en: 'Digging with a {obj} is silly.',
    out: 'Mit so etwas wie {obj.bare} zu graben ist albern.',
  },
  {
    en: 'Strange concept, cutting the {obj}....',
    out: 'Seltsame Vorstellung, {obj.akkDef} zu schneiden...',
  },
  {
    en: 'How does one read a {obj}?',
    out: 'Wie liest man so etwas wie {obj.akkDef}?',
  },
  {
    en: 'How does one look through a {obj}?',
    out: 'Wie schaut man durch so etwas wie {obj.akkDef}?',
  },
  {
    en: "You can't look inside a {obj}.",
    out: 'Du kannst nicht in so etwas wie {obj.akkDef} hineinsehen.',
  },
  { en: 'It smells like a {obj}.', out: 'Das riecht nach {obj.bare}.' },
  {
    en: 'The {obj} does not understand this.',
    out: 'Für {obj.akkDef} ergibt das keinen Sinn.',
  },
  {
    en: 'It is hardly likely that the {obj} is interested.',
    out: 'Es ist kaum anzunehmen, dass {obj.akkDef} das interessiert.',
  },
  {
    en: "There's no good surface on the {obj}.",
    out: 'An {obj.akkDef} gibt es keine geeignete Fläche.',
  },
  {
    en: "You can't filch the {obj}!",
    out: 'Du kannst {obj.akkDef} nicht stibitzen!',
  },
  {
    en: 'The {obj} goes up in a puff of smoke.',
    out: 'Du siehst {obj.akkDef} in einer Rauchwolke verschwinden.',
  },
  // ── V-FIND replies ───────────────────────────────────────────────────────
  { en: 'The {obj} has it.', out: '{obj.def} hat es.', cap: true },
  { en: "It's on the {obj}.", out: 'Es liegt obenauf: {obj.def}.' },
  { en: "It's in the {obj}.", out: 'Es steckt darin: {obj.def}.' },
  {
    en: "The {obj} isn't here!",
    out: 'Du findest {obj.akkDef} hier nicht!',
  },
  // ── Waking ─────────────────────────────────────────────────────────────
  {
    en: 'The {obj} is rudely awakened.',
    out: 'Du weckst {obj.akkDef} unsanft.',
  },
  {
    en: "The {obj} isn't sleeping.",
    out: 'Es bringt nichts, {obj.akkDef} zu wecken: kein Anzeichen von Schlaf.',
  },

  // ── Off-path melee/combat shapes ─────────────────────────────────────────
  // F-DEF slots only ever hold the three villains (troll/thief/cyclops, all
  // masculine), so masculine participles are provably safe; F-WEP slots use
  // "dein {obj.bare}".
  {
    en: 'A good slash, but it misses the {obj} by a mile.',
    out: 'Ein guter Hieb, doch er verfehlt {obj.akkDef} um Längen.',
  },
  {
    en: 'You charge, but the {obj} jumps nimbly aside.',
    out: 'Du stürmst vor, doch {obj.def} springt flink zur Seite.',
    cap: true,
  },
  {
    en: 'A quick stroke, but the {obj} is on guard.',
    out: 'Ein schneller Streich, doch {obj.def} ist auf der Hut.',
    cap: true,
  },
  {
    en: "A good stroke, but it's too slow; the {obj} dodges.",
    out: 'Ein guter Streich, aber zu langsam; {obj.def} weicht aus.',
  },
  {
    en: 'A furious exchange, and the {obj} is knocked out!',
    out: 'Ein wilder Schlagabtausch, und {obj.def} wird bewusstlos geschlagen!',
  },
  {
    en: 'The haft of your {obj} knocks out the {obj2}.',
    out: 'Der Knauf deines {obj.bare} schlägt {obj2.akkDef} bewusstlos.',
  },
  {
    en: "It's curtains for the {obj} as your {obj2} removes his head.",
    out: 'Aus ist es mit {obj.bare}: dein {obj2.bare} trennt ihm den Kopf ab.',
  },
  {
    en: 'The fatal blow strikes the {obj} square in the heart: He dies.',
    out: 'Der tödliche Schlag trifft {obj.akkDef} mitten ins Herz: Er stirbt.',
  },
  {
    en: 'The force of your blow knocks the {obj} back, stunned.',
    out: 'Die Wucht deines Schlags wirft {obj.akkDef} benommen zurück.',
  },
  {
    en: 'The quickness of your thrust knocks the {obj} back, stunned.',
    out: 'Die Schnelligkeit deines Stoßes wirft {obj.akkDef} benommen zurück.',
  },
  {
    en: 'Almost as soon as the {obj} breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.',
    out: 'Kaum hat {obj.def} den letzten Atemzug getan, hüllt ihn eine finstere schwarze Nebelwolke ein, und als der Nebel sich lichtet, ist der Kadaver verschwunden.',
  },
  // Grue death inside a vehicle (the only VEHBIT object is the masculine boat).
  {
    en: 'Oh, no! A lurking grue slithered into the {obj} and devoured you!',
    out: 'Oh nein! Ein lauernder Grue kroch in {obj.akkDef} und verschlang dich!',
  },
  // Burning a held/occupied object.
  {
    en: 'The {obj} catches fire. Unfortunately, you were holding it at the time.',
    out: '{obj.def} fängt Feuer. Leider hattest du es gerade in der Hand.',
    cap: true,
  },
  {
    en: 'The {obj} catches fire. Unfortunately, you were in it at the time.',
    out: '{obj.def} fängt Feuer. Leider warst du gerade darin.',
    cap: true,
  },
  // V-HELLO — greeting an actor / a thing.
  {
    en: 'The {obj} bows his head to you in greeting.',
    out: '{obj.def} neigt dir grüßend den Kopf.',
    cap: true,
  },
  {
    en: 'It\'s a well known fact that only schizophrenics say "Hello" to a {obj}.',
    out: 'Bekanntlich sagen nur Schizophrene zu so etwas wie {obj.bare} „Hallo“.',
  },
  // V-SEND, V-THROW-OFF, V-LOOK-ON.
  {
    en: 'Why would you send for the {obj}?',
    out: 'Warum solltest du nach {obj.bare} schicken?',
  },
  {
    en: 'Ahoy -- {obj} overboard!',
    out: 'Ahoi — {obj.indef} über Bord!',
  },
  {
    en: 'Look on a {obj}???',
    out: 'Auf so etwas wie {obj.akkDef} schauen???',
  },

  // ── HERO-MELEE rows. F-DEF is the troll or the thief (masculine); F-WEP is
  //    the player's weapon → "dein {obj.bare}". ─────────────────────────────
  {
    en: 'Your {obj} misses the {obj2} by an inch.',
    out: 'Dein {obj.bare} verfehlt {obj2.akkDef} um Haaresbreite.',
  },
  {
    en: 'Clang! Crash! The {obj} parries.',
    out: 'Kling! Krach! {obj.def} pariert.',
    cap: true,
  },
  {
    en: 'Your {obj} crashes down, knocking the {obj2} into dreamland.',
    out: 'Dein {obj.bare} saust herab und schickt {obj2.akkDef} ins Reich der Träume.',
  },
  {
    en: 'The {obj} is battered into unconsciousness.',
    out: '{obj.def} wird in die Bewusstlosigkeit geprügelt.',
    cap: true,
  },
  {
    en: 'The {obj} is knocked out!',
    out: '{obj.def} wird bewusstlos geschlagen!',
    cap: true,
  },
  {
    en: 'The {obj} takes a fatal blow and slumps to the floor dead.',
    out: '{obj.def} erleidet einen tödlichen Schlag und sinkt tot zu Boden.',
    cap: true,
  },
  {
    en: 'The {obj} is struck on the arm; blood begins to trickle down.',
    out: '{obj.def} wird am Arm getroffen; Blut beginnt herabzurinnen.',
    cap: true,
  },
  {
    en: "Your {obj} pinks the {obj2} on the wrist, but it's not serious.",
    out: 'Dein {obj.bare} ritzt {obj2.akkDef} am Handgelenk, aber es ist nicht ernst.',
  },
  {
    en: "The blow lands, making a shallow gash in the {obj}'s arm!",
    out: 'Der Schlag sitzt und reißt eine flache Wunde in den Arm von {obj.bare}!',
  },
  {
    en: 'The {obj} receives a deep gash in his side.',
    out: '{obj.def} erhält eine tiefe Wunde in der Seite.',
    cap: true,
  },
  {
    en: 'A savage blow on the thigh! The {obj} is stunned but can still fight!',
    out: 'Ein wilder Schlag auf den Schenkel! {obj.def} ist benommen, kann aber noch kämpfen!',
  },
  {
    en: 'The {obj} is staggered, and drops to his knees.',
    out: '{obj.def} wankt und sinkt auf die Knie.',
    cap: true,
  },
  {
    en: "The {obj} is momentarily disoriented and can't fight back.",
    out: '{obj.def} ist einen Moment lang orientierungslos und kann sich nicht wehren.',
    cap: true,
  },
  {
    en: "The {obj} is confused and can't fight back.",
    out: '{obj.def} ist verwirrt und kann sich nicht wehren.',
    cap: true,
  },
  {
    en: "The {obj}'s weapon is knocked to the floor, leaving him unarmed.",
    out: 'Die Waffe von {obj.bare} wird zu Boden geschlagen und lässt ihn unbewaffnet.',
  },
  {
    en: 'The {obj} is disarmed by a subtle feint past his guard.',
    out: '{obj.def} wird durch eine geschickte Finte entwaffnet.',
    cap: true,
  },
  {
    en: 'The unarmed {obj} cannot defend himself: He dies.',
    out: 'Der unbewaffnete {obj.bare} kann sich nicht verteidigen: Er stirbt.',
  },
  {
    en: 'The unconscious {obj} cannot defend himself: He dies.',
    out: 'Der bewusstlose {obj.bare} kann sich nicht verteidigen: Er stirbt.',
  },
  {
    en: 'The {obj} slowly regains his feet.',
    out: '{obj.def} rappelt sich langsam wieder auf.',
    cap: true,
  },
  {
    en: 'Attacking the {obj} is pointless.',
    out: 'Es ist sinnlos, {obj.akkDef} anzugreifen.',
  },
  {
    en: 'Fortunately, you still have a {obj}.',
    out: 'Zum Glück hast du noch {obj.akkDef}.',
  },

  // ── Villain-disarm rows (F-WEP = the player's weapon). ──────────────────
  {
    en: 'The axe hits your {obj} and knocks it spinning.',
    out: 'Die Axt trifft deinen {obj.bare} und schleudert ihn fort.',
  },
  {
    en: 'The troll swings, you parry, but the force of his blow knocks your {obj} away.',
    out: 'Der Troll holt aus, du parierst, doch die Wucht seines Schlags schlägt dir deinen {obj.bare} aus der Hand.',
  },
  {
    en: 'The axe knocks your {obj} out of your hand. It falls to the floor.',
    out: 'Die Axt schlägt dir deinen {obj.bare} aus der Hand. Er fällt zu Boden.',
  },
  {
    en: 'A long, theatrical slash. You catch it on your {obj}, but the thief twists his knife, and the {obj2} goes flying.',
    out: 'Ein langer, theatralischer Hieb. Du fängst ihn mit deinem {obj.bare} ab, doch der Dieb dreht sein Messer, und dein {obj2.bare} fliegt davon.',
  },
  {
    en: 'The thief neatly flips your {obj} out of your hands, and it drops to the floor.',
    out: 'Geschickt schnellt der Dieb dir deinen {obj.bare} aus den Händen, und er fällt zu Boden.',
  },
  {
    en: 'You parry a low thrust, and your {obj} slips out of your hand.',
    out: 'Du parierst einen tiefen Stoß, und dein {obj.bare} gleitet dir aus der Hand.',
  },
  {
    en: 'The Cyclops grabs your {obj}, tastes it, and throws it to the ground in disgust.',
    out: 'Der Zyklop greift sich deinen {obj.bare}, kostet davon und wirft alles angewidert zu Boden.',
  },
  {
    en: 'The monster grabs you on the wrist, squeezes, and you drop your {obj} in pain.',
    out: 'Das Ungeheuer packt dich am Handgelenk, drückt zu, und vor Schmerz lässt du deinen {obj.bare} fallen.',
  },
  {
    en: 'The troll charges, and his axe slashes you on your {obj} arm.',
    out: 'Der Troll stürmt vor, und seine Axt trifft dich an dem Arm, der deinen {obj.bare} hält.',
  },
  // Shared WEAPON-FUNCTION weapon-recovery guards (axe is feminine "die Axt").
  {
    en: 'The {obj} swings it out of your reach.',
    out: '{obj.def} schleudert sie außer Reichweite.',
    cap: true,
  },
  {
    en: "The {obj} seems white-hot. You can't hold on to it.",
    out: '{obj.def} scheint weißglühend. Du kannst sie nicht halten.',
    cap: true,
  },

  // ── V-ATTACK / V-STAB / PRE-MUNG refusals ────────────────────────────────
  {
    en: "I've known strange people, but fighting a {obj}?",
    out: 'Ich habe schon seltsame Leute gekannt, aber gegen so etwas wie {obj.akkDef} kämpfen?',
  },
  {
    en: 'Trying to attack a {obj} with your bare hands is suicidal.',
    out: 'Der Versuch, so etwas wie {obj.akkDef} mit bloßen Händen anzugreifen, ist Selbstmord.',
  },
  {
    en: 'No doubt you propose to stab the {obj} with your pinky?',
    out: 'Du gedenkst {obj.akkDef} wohl mit dem kleinen Finger zu erstechen?',
  },
  {
    en: 'Trying to destroy the {obj} with your bare hands is futile.',
    out: 'Der Versuch, {obj.akkDef} mit bloßen Händen zu zerstören, ist zwecklos.',
  },
  {
    en: 'Trying to destroy the {obj} with a {obj2} is futile.',
    out: 'Der Versuch, {obj.akkDef} mit so etwas wie {obj2.bare} zu zerstören, ist zwecklos.',
  },
  {
    en: 'The "cutting edge" of a {obj} is hardly adequate.',
    out: 'Die „Schneide“ von so etwas wie {obj.bare} taugt kaum dazu.',
  },
  {
    en: 'Your skillful {obj}smanship slices the {obj2} into innumerable slivers which blow away.',
    out: 'Du führst deinen {obj.bare} wie ein Meister und schneidest {obj2.akkDef} in zahllose Späne, die davonwehen.',
  },

  // ── HACK-HACK verb defaults ──────────────────────────────────────────────
  {
    en: "Kicking the {obj} doesn't seem to work.",
    out: 'Gegen {obj.akkDef} zu treten scheint nichts zu bringen.',
  },
  {
    en: "Kicking the {obj} isn't notably helpful.",
    out: 'Gegen {obj.akkDef} zu treten hilft nicht sonderlich.',
  },
  {
    en: 'Kicking the {obj} has no effect.',
    out: 'Gegen {obj.akkDef} zu treten hat keine Wirkung.',
  },
  {
    en: "Waving the {obj} doesn't seem to work.",
    out: '{obj.akkDef} zu schwenken scheint nichts zu bringen.',
  },
  {
    en: "Waving the {obj} isn't notably helpful.",
    out: '{obj.akkDef} zu schwenken hilft nicht sonderlich.',
  },
  {
    en: 'Waving the {obj} has no effect.',
    out: '{obj.akkDef} zu schwenken hat keine Wirkung.',
  },
  {
    en: "Fiddling with the {obj} doesn't seem to work.",
    out: 'An {obj.akkDef} herumzufummeln scheint nichts zu bringen.',
  },
  {
    en: "Fiddling with the {obj} isn't notably helpful.",
    out: 'An {obj.akkDef} herumzufummeln hilft nicht sonderlich.',
  },
  {
    en: 'Fiddling with the {obj} has no effect.',
    out: 'An {obj.akkDef} herumzufummeln hat keine Wirkung.',
  },
  {
    en: "Playing in this way with the {obj} doesn't seem to work.",
    out: 'Auf diese Weise mit {obj.bare} zu spielen scheint nichts zu bringen.',
  },
  {
    en: "Playing in this way with the {obj} isn't notably helpful.",
    out: 'Auf diese Weise mit {obj.bare} zu spielen hilft nicht sonderlich.',
  },
  {
    en: 'Playing in this way with the {obj} has no effect.',
    out: 'Auf diese Weise mit {obj.bare} zu spielen hat keine Wirkung.',
  },
  {
    en: "Pushing the {obj} doesn't seem to work.",
    out: '{obj.akkDef} zu drücken scheint nichts zu bringen.',
  },
  {
    en: "Pushing the {obj} isn't notably helpful.",
    out: '{obj.akkDef} zu drücken hilft nicht sonderlich.',
  },
  {
    en: 'Pushing the {obj} has no effect.',
    out: '{obj.akkDef} zu drücken hat keine Wirkung.',
  },

  // ── V-DIAGNOSE wound lines ──────────────────────────────────────────────
  {
    en: 'You have a light wound, which will be cured after {num} moves.',
    out: 'Du hast eine leichte Wunde, die nach {num} Zügen verheilt sein wird.',
  },
  {
    en: 'You have a serious wound, which will be cured after {num} moves.',
    out: 'Du hast eine ernste Wunde, die nach {num} Zügen verheilt sein wird.',
  },
  {
    en: 'You have several wounds, which will be cured after {num} moves.',
    out: 'Du hast mehrere Wunden, die nach {num} Zügen verheilt sein werden.',
  },
  {
    en: 'You have serious wounds, which will be cured after {num} moves.',
    out: 'Du hast ernste Wunden, die nach {num} Zügen verheilt sein werden.',
  },

  // ── V-THROW ──────────────────────────────────────────────────────────────
  {
    en: "A terrific throw! The {obj} hits you squarely in the head. Normally, this wouldn't do much damage, but by incredible mischance, you fall over backwards trying to duck, and break your neck, justice being swift and merciful in the Great Underground Empire.",
    out: 'Ein gewaltiger Wurf! {obj.def} trifft dich mitten am Kopf. Normalerweise würde das nicht viel Schaden anrichten, doch durch ein unglaubliches Missgeschick kippst du beim Ausweichen rückwärts und brichst dir das Genick — die Gerechtigkeit ist rasch und gnädig im Großen Unterirdischen Imperium.',
    cap: true,
  },
  {
    en: 'The {obj} ducks as the {obj2} flies by and crashes to the ground.',
    out: '{obj.def} duckt sich, während {obj2.def} vorbeifliegt und zu Boden kracht.',
    cap: true,
  },

  // ── Thief gifts ────────────────────────────────────────────────────────
  {
    en: 'The thief is taken aback by your unexpected generosity, but accepts the {obj} and stops to admire its beauty.',
    out: 'Der Dieb ist von deiner unerwarteten Großzügigkeit verblüfft, nimmt aber {obj.akkDef} an und hält inne, um ihre Schönheit zu bewundern.',
  },
  {
    en: 'The thief places the {obj} in his bag and thanks you politely.',
    out: 'Der Dieb steckt {obj.akkDef} in seinen Sack und dankt dir höflich.',
  },

  // ── Machine lid ──────────────────────────────────────────────────────────
  {
    en: 'The lid opens, revealing a {obj}.',
    out: 'Der Deckel öffnet sich und gibt {obj.akkDef} frei.',
  },

  // ── More verb-default refusals & quips ──────────────────────────────────
  {
    en: 'You have to be holding the {obj} first.',
    out: 'Du müsstest {obj.akkDef} erst in der Hand halten.',
  },
  {
    en: "You'll have to open the {obj} first.",
    out: 'Du müsstest {obj.akkDef} erst öffnen.',
  },
  {
    en: "I don't think that the {obj} would agree with you.",
    out: 'Ich glaube nicht, dass {obj.def} dir bekommen würde.',
  },
  {
    en: 'If you wish to burn the {obj}, you should say so.',
    out: 'Wenn du {obj.akkDef} verbrennen willst, solltest du das sagen.',
  },
  {
    en: "It's not clear that a {obj} can be melted.",
    out: 'Es ist nicht ausgemacht, dass sich so etwas wie {obj.def} schmelzen lässt.',
  },
  {
    en: 'The water spills over the {obj}, to the floor, and evaporates.',
    out: 'Das Wasser rinnt über {obj.akkDef} zu Boden und verdunstet.',
  },
  {
    en: 'The water leaks out of the {obj} and evaporates immediately.',
    out: '{obj.def} lässt das Wasser entweichen, das sofort verdunstet.',
    cap: true,
  },
  {
    en: 'Pump it up with a {obj}?',
    out: 'Mit so etwas wie {obj.bare} aufpumpen?',
  },
  {
    en: 'You must address the {obj} directly.',
    out: 'Du musst {obj.akkDef} unmittelbar ansprechen.',
  },
  {
    en: 'The contents of the {obj} spill to the ground.',
    out: 'Beim Schütteln von {obj.bare} fällt der Inhalt zu Boden.',
  },
  {
    en: 'The contents of the {obj} spill out and disappears.',
    out: 'Beim Schütteln von {obj.bare} fällt der Inhalt heraus und verschwindet.',
  },
  {
    en: "Swimming isn't usually allowed in the {obj}.",
    out: 'Baden ist in so etwas wie {obj.bare} normalerweise nicht erlaubt.',
  },
  {
    en: 'You hit your head against the {obj} as you attempt this feat.',
    out: 'Bei diesem Kunststück stößt du dir den Kopf an {obj.akkDef}.',
  },
  {
    en: 'Sitting on the {obj} is:',
    out: 'Obenauf befindet sich — {obj.def}:',
  },
  {
    en: 'The {obj} is holding:',
    out: '{obj.def} enthält:',
    cap: true,
  },
  {
    en: 'You would have to get the {obj} first, and that seems unlikely.',
    out: 'Du müsstest dir {obj.akkDef} erst beschaffen, und das scheint unwahrscheinlich.',
  },
  {
    en: 'Can you unlock a grating with a {obj}?',
    out: 'Kann man ein Gitter mit so etwas wie {obj.bare} aufschließen?',
  },
  {
    en: "The bolt won't turn using the {obj}.",
    out: 'Der Riegel lässt sich mit {obj.bare} nicht drehen.',
  },
  {
    en: "It seems that a {obj} won't do.",
    out: 'Es scheint, so etwas wie {obj.def} reicht nicht.',
  },
  {
    en: "It seems that the {obj} didn't agree with the boat, as evidenced by the loud hissing noise issuing therefrom. With a pathetic sputter, the boat deflates, leaving you without.",
    out: 'Es scheint, {obj.def} ist dem Boot nicht bekommen, wie das laute Zischen beweist, das daraus entweicht. Mit einem klagenden Prusten verliert das Boot die Luft und lässt dich ohne zurück.',
  },
  {
    en: "Not to say that using the {obj} isn't original too...",
    out: 'Nicht dass {obj.akkDef} zu benutzen nicht auch originell wäre...',
  },
  {
    en: 'The concept of using a {obj} is certainly original.',
    out: 'Der Gedanke, so etwas wie {obj.akkDef} zu benutzen, ist gewiss originell.',
  },
  {
    en: 'The {obj} struggles and you cannot tie him up.',
    out: '{obj.def} wehrt sich, und du kannst ihn nicht fesseln.',
    cap: true,
  },
  {
    en: 'Why would you tie up a {obj}?',
    out: 'Warum solltest du so etwas wie {obj.akkDef} fesseln?',
  },
  {
    en: 'You suddenly notice that the {obj} vanished.',
    out: 'Du bemerkst plötzlich, dass {obj.def} verschwunden ist.',
  },
  {
    en: 'It looks pretty much like a {obj}.',
    out: 'Das sieht ziemlich nach so etwas wie {obj.bare} aus.',
  },

  // ── Parser multiple-object refusals (verb echoed is the typed token). ──────
  {
    en: 'You can\'t use multiple direct objects with "{raw}".',
    out: 'Du kannst „{raw}“ nicht mit mehreren direkten Objekten verwenden.',
  },
  {
    en: 'You can\'t use multiple indirect objects with "{raw}".',
    out: 'Du kannst „{raw}“ nicht mit mehreren indirekten Objekten verwenden.',
  },
]
