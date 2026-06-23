// Zork I × Georgian composing patterns (spec §2.4, §4). EN sides match
// zork1.fr.templates.ts BYTE-EXACT (normalize()d form); Georgian `out` sides
// reference ONLY {obj.indef} (the bare nominative citation form), {num}/{num2}
// (numerals stay Arabic), and {raw} (verbatim passthrough). NO capitalization —
// Mkhedruli is unicameral.
//
// GEORGIAN COMPOSITION RULES (the case discipline, spec §4):
// - Georgian has seven noun cases and we carry exactly ONE form (`indef` =
//   nominative citation). So a template may bind {obj} ONLY where the natural
//   Georgian keeps the noun in the NOMINATIVE: a subject of არის/არ არის ("X is
//   here"), a bare listing/citation entry, or a noun named with no case marker.
// - Any English line whose natural Georgian needs the object in the ERGATIVE
//   (aorist subject), DATIVE (present-series direct/indirect object — "I burn X"
//   → "X-ს ვწვავ"), GENITIVE ("the contents of X" → "X-ის შიგთავსი"), or
//   INSTRUMENTAL ("with X" → "X-ით") is NOT templated here. It is pinned as a
//   full string in zork1.ka.strings.ts (the §4 escape hatch). This is the
//   Georgian analog of the FR "never put de/à before a slot" rule — except
//   Georgian's case markers are SUFFIXES we cannot compose onto a citation form,
//   so the bar for templating is higher: only genuinely caseless slots qualify.
// - Georgian has NO grammatical gender and NO articles, so the nine
//   inherently-plural objects (კურთხევები, მოჩვენებები, …) compose correctly in
//   every kept template — none of them agrees with the noun.
// - {raw} (parser echoes of the player's typed token) and {num}/{num2} (score /
//   wound countdowns) pass through verbatim; these are language-neutral and
//   always safe.
import type { Template } from '../types'

export const ZORK1_KA_TEMPLATES: readonly Template[] = [
  // ── Parser feedback echoing the player's typed token ({raw} passthrough) ──
  // The quoted token is the player's own input; Georgian uses „…“ quotes.
  {
    en: 'I don\'t know the word "{raw}".',
    out: 'არ ვიცი სიტყვა „{raw}“.',
  },
  {
    en: 'You used the word "{raw}" in a way that I don\'t understand.',
    out: 'სიტყვა „{raw}“ ისე გამოიყენე, რომ ვერ გავიგე.',
  },
  {
    en: "You can't see any {raw} here!",
    out: 'აქ ვერანაირ „{raw}“-ს ვერ ვხედავ!',
  },
  {
    en: 'You can\'t use multiple direct objects with "{raw}".',
    out: 'სიტყვასთან „{raw}“ ვერ გამოიყენებ რამდენიმე პირდაპირ დამატებას.',
  },
  {
    en: 'You can\'t use multiple indirect objects with "{raw}".',
    out: 'სიტყვასთან „{raw}“ ვერ გამოიყენებ რამდენიმე ირიბ დამატებას.',
  },

  // ── Parser object-disambiguation prompt (gparser.zil WHICH-PRINT, ~1146-1166):
  //    the REAL string is "Which <noun> do you mean, the X or the Y?" where
  //    <noun> is the player's TYPED noun word (English — ka players type
  //    English), captured here as {raw} (verbatim, NOT corpus-translated). The
  //    two candidates are corpus objects in a "this OR that" choice; the natural
  //    Georgian keeps each in the bare NOMINATIVE citation form (§4: caseless
  //    listing position, no case marker), so {obj.indef}/{obj2.indef} compose
  //    safely either way the parser orders the pair. fr/de/es route this to the
  //    LLM fallback; ka has none, so this template is what prevents the raw-
  //    English leak for Georgian players. NATIVE-REVIEW-DRAFT (ka §4 case forms):
  //    provisional wording pending native review.
  {
    en: 'Which {raw} do you mean, the {obj} or the {obj2}?',
    out: 'რომელ {raw}-ს გულისხმობ — {obj.indef} თუ {obj2.indef}?',
  },
  // ── …and the 3+/4-candidate forms WHICH-PRINT prints for more than two
  //    matches: "the A, the B, or the C?" / "the A, the B, the C, or the D?"
  //    (Oxford comma before the final "or"). Zork I's largest co-located
  //    same-noun set is the 4 dam-control buttons (yellow/brown/red/blue, all in
  //    the Maintenance Room, SYNONYM BUTTON SWITCH), so `push button` there is a
  //    GUARANTEED 4-candidate prompt on the dam puzzle — a golden-path raw-English
  //    leak for ka (no LLM net) until these match (I2). Each button is in the ka
  //    object corpus, so the slots resolve. The candidates stay in the bare
  //    NOMINATIVE citation form (caseless listing position, §4); Georgian has no
  //    articles, so no "the" repeats, and "თუ" ("or") precedes the last. fr/de/es
  //    route 3+/4-candidate prompts to the LLM (which renders them cleanly without
  //    embedding the English noun), so they keep only the 2-candidate book pin.
  //    NATIVE-REVIEW-DRAFT (ka §4 case forms): provisional wording pending review.
  {
    en: 'Which {raw} do you mean, the {obj}, the {obj2}, or the {obj3}?',
    out: 'რომელ {raw}-ს გულისხმობ — {obj.indef}, {obj2.indef} თუ {obj3.indef}?',
  },
  {
    en: 'Which {raw} do you mean, the {obj}, the {obj2}, the {obj3}, or the {obj4}?',
    out: 'რომელ {raw}-ს გულისხმობ — {obj.indef}, {obj2.indef}, {obj3.indef} თუ {obj4.indef}?',
  },

  // === COMPOSED-GATE-DRAFTS (P2.1) BEGIN — NATIVE-REVIEW-DRAFT (all entries to
  //     END are machine-authored, provisional, pending native review:
  //     notes/georgian-composed-line-review.md). Verb-neutral caseless reframes:
  //     the `out` drops {verb}/{raw} (en-side for matching only), like the shipped
  //     put-in line — so ka never declines an echoed English token (§4 sidestep).
  { en: 'What do you want to {verb} the {raw} in?', out: 'რაში გსურთ მისი ჩადება?' },
  { en: 'What do you want to {verb} the {raw} with?', out: 'რით გსურთ მისი გაკეთება?' },
  { en: 'What do you want to {verb}?', out: 'რისი გაკეთება გსურს?' },
  // ── Listing engine (P2.1 Task 6; gverbs.zil DESCRIBE-OBJECT/PRINT-CONT). ka
  //    shipped only per-object pins, so the lit BRASS LANTERN, the vehicle tail,
  //    the surface header and the actor "is holding:" leaked raw English. Each
  //    keeps {obj} in the NOMINATIVE citation form (no case agreement) or drops
  //    the noun where a case would be forced (§4).
  { en: 'There is a {obj} here (providing light).', out: 'აქ {obj.indef} არის (ანათებს).' },
  { en: 'A {obj} (providing light)', out: '{obj.indef} (ანათებს)' },
  // Vehicle tail — a colon avoids declining the boat (mirrors de "(außerhalb: …)").
  { en: 'There is a {obj} here. (outside the {obj2})', out: 'აქ {obj.indef} არის. (გარეთ: {obj2.indef})' },
  // Surface header — the surface would need the -ზე postposition case (§4) and is
  // on-screen, so drop it: "on top lies:".
  { en: 'Sitting on the {obj} is:', out: 'ზედ დევს:' },
  // Actor-contents header — reuse the reviewed "contains" predicate (de/es also
  // render "is holding" → "contains"); {obj} stays the nominative subject.
  { en: 'The {obj} is holding:', out: '{obj.indef} შეიცავს:' },
  // ── 7a State/idempotent (gverbs.zil). {obj} is the nominative subject of the
  //    predicate — caseless, so it composes safely (like the open-success line).
  { en: 'The {obj} is now closed.', out: '{obj.indef} იხურება.' },
  { en: 'The {obj} is empty.', out: '{obj.indef} ცარიელია.' },
  // ── 7b Container/placement failures (gverbs.zil V-PUT). Two-object lines drop
  //    the container (on-screen; -ში would shift a multi-word adjective, §4); the
  //    rest keep {obj} as the nominative subject ("have" takes the nominative).
  { en: 'The {obj} is already in the {obj2}.', out: '{obj.indef} უკვე შიგ დევს.' },
  { en: "The {obj} isn't in the {obj2}.", out: '{obj.indef} შიგ არ არის.' },
  { en: "You don't have the {obj}.", out: '{obj.indef} არ გაქვს.' },
  { en: "The {obj} isn't here!", out: '{obj.indef} აქ არ არის!' },
  { en: "There's no good surface on the {obj}.", out: 'ამაზე ვერაფერს დადებ.' },
  // ── 7d-i Standard-verb refusals/statuses (gverbs.zil). NS = {obj} kept as the
  //    nominative subject; DN = dropped to a demonstrative (caseless, §4).
  { en: 'Moving the {obj} reveals nothing.', out: 'გადაადგილებამ არაფერი გამოაჩინა.' },
  { en: 'You can\'t move the {obj}.', out: '{obj.indef} ადგილიდან არ იძვრება.' },
  { en: 'You are now in the {obj}.', out: 'ახლა შიგ ხარ.' },
  { en: 'You are now wearing the {obj}.', out: 'ახლა {obj.indef} გაცვია.' },
  { en: "You're not carrying the {obj}.", out: '{obj.indef} თან არ გაქვს.' },
  { en: 'How does one read a {obj}?', out: 'ეს როგორ უნდა წაიკითხო?' },
  { en: "You aren't even holding the {obj}.", out: '{obj.indef} ხელშიც კი არ გიჭირავს.' },
  // === COMPOSED-GATE-DRAFTS (P2.1) END ===
  // NB (UAT 2026-06-20 / recon 2026-06-23): orphan preps `in` (bare `put X`) and
  // `with` (`cut`/`strike X`) are templated above; `on`->WEAR and
  // `under`/`behind`->unparsed never orphan, so they are intentionally not authored.

  // ── Presence & listings — {obj} is the NOMINATIVE subject of არის, or a bare
  //    listing entry (no case marker). These are the productive caseless slots.
  // gverbs.zil DESCRIBE-OBJECT / PRINT-CONT; thief treasure listing.
  { en: 'There is a {obj} here.', out: 'აქ {obj.indef} არის.' },
  // Built-in "A {obj}" / "An {obj}" listings resolve {obj.indef} directly; the
  // "(being worn)" / "(providing light)" listing tails attach to the same bare
  // nominative entry with no case agreement.
  {
    en: 'A {obj} (being worn)',
    out: '{obj.indef} (ნახმარი)',
  },

  // ── Multi-object command prefix ("<obj>: " then the per-object verb output;
  //    "Dropped." is gverbs.zil:481). {obj} is the bare nominative label — the
  //    same caseless citation position as a listing entry, so it composes
  //    safely (mirrors the standalone 'Dropped.' pin). Covers the multi-drop
  //    "<name>: Dropped." lines (bracelet/figurine/garlic/canary/lantern). ───
  { en: '{obj}: Dropped.', out: '{obj.indef}: დაგდებულია.' },
  // ...and the multi-TAKE analog ("<name>: Taken." from `take all`); the same
  // caseless nominative-label position as Dropped (mirrors the standalone
  // 'Taken.' → 'აღებულია.' pin). UAT 2026-06-19: this leaked English.
  { en: '{obj}: Taken.', out: '{obj.indef}: აღებულია.' },
  // ...and the per-object FAILURE reasons `take all` can print (gverbs.zil
  // ITAKE). The "<obj>:" label is the caseless nominative; the reason is reused
  // verbatim from its standalone string pin. UAT 2026-06-19: these leaked
  // English (the success analogs were templated, these reasons were not).
  {
    en: '{obj}: The rug is extremely heavy and cannot be carried.',
    out: '{obj.indef}: ხალიჩა უაღრესად მძიმეა და მისი ზიდვა შეუძლებელია.',
  },
  {
    en: '{obj}: The trophy case is securely fastened to the wall.',
    out: '{obj.indef}: ჯილდოების ვიტრინა მყარადაა კედელზე დამაგრებული.',
  },

  // ── Container header (gverbs.zil:1835 PRINT-CONT). {obj} is the NOMINATIVE
  //    subject of "შეიცავს" (contains) — no case marker, so it composes
  //    safely. Covers "The X contains:" (bottle/sack/basket/magic boat). ────
  { en: 'The {obj} contains:', out: '{obj.indef} შეიცავს:' },

  // ── Devices (gverbs.zil V-LAMP-ON :792 / V-LAMP-OFF :779). {obj} is the
  //    NOMINATIVE subject of the predicate "ახლა ჩართულია/გამორთულია" (is now
  //    on/off) — caseless, so it composes safely. Covers the brass lantern. ─
  { en: 'The {obj} is now on.', out: '{obj.indef} ახლა ჩართულია.' },
  { en: 'The {obj} is now off.', out: '{obj.indef} ახლა გამორთულია.' },

  // ── open/close (gverbs.zil :980/:990, :983). {obj} is the NOMINATIVE
  //    subject of "იღება" (opens) / "დახურულია" (is closed) — caseless, so it
  //    composes safely (mirrors the pinned 'ცხაური იღება…' / 'ცხაური
  //    დახურულია!' lines). "The X opens." covers gold coffin AND grating;
  //    "The X is closed." covers grating / trap door / tube. ────────────────
  { en: 'The {obj} opens.', out: '{obj.indef} იღება.' },
  { en: 'The {obj} is closed.', out: '{obj.indef} დახურულია.' },
  // "isn't open" (gverbs.zil, e.g. `put X in <closed container>` → the trophy
  // case) is the same caseless nominative predicate as "is closed"; fr/de/es
  // collapse both to "first you'd have to open it", and ka reuses the already-
  // reviewed 'დახურულია' string here too. Leaked raw English in ka before this
  // (UAT 2026-06-20: `put lamp in case` with the case shut).
  { en: "The {obj} isn't open.", out: '{obj.indef} დახურულია.' },

  // ── Examine default (gverbs.zil V-EXAMINE). fr/de/es bind {obj} inside the
  //    sentence, but "about the X" needs the object in a CASE (genitive/
  //    postpositional), which §4 forbids composing onto the citation form. So
  //    the `out` DROPS the object and renders an object-agnostic, caseless
  //    sentence — "there's nothing special about this" — which is still natural
  //    Georgian and far better than the English leak (UAT 2026-06-19). The {obj}
  //    slot stays on the `en` side only so the regex still requires a KNOWN
  //    object (an unknown one misses → English, like every other template).
  //    Native-review item (§8): naming the object would need per-object pins.
  {
    en: "There's nothing special about the {obj}.",
    out: 'ამაში განსაკუთრებული არაფერია.',
  },

  // ── Wearing (gverbs.zil V-WEAR). `put X on` resolves to the WEAR verb, so
  //    trying to wear a non-clothing object (`put lamp on` → the brass lantern)
  //    prints this — NOT the orphan put-prompt the I1 fix assumed (UAT
  //    2026-06-20). {obj} is the direct object of "wear", which §4 would case;
  //    like the examine-default and rug lines, the `out` DROPS the object and
  //    renders caselessly with მისი ("it"). Leaked raw English in ka (no LLM
  //    net); fr/de/es already template it.
  //    NATIVE-REVIEW-DRAFT (ka §4 case forms): provisional wording pending review.
  {
    en: "You can't wear the {obj}.",
    out: 'მისი ჩაცმა შეუძლებელია.',
  },

  // ── Score (numerals stay Arabic; no object slot) ──────────────────────────
  {
    en: 'Your score is {num} (total of 350 points), in {num2} moves.',
    out: 'შენი ქულაა {num} (სულ 350 ქულიდან), {num2} სვლაში.',
  },
  {
    en: 'Your score is {num} (total of 350 points), in {num2} move.',
    out: 'შენი ქულაა {num} (სულ 350 ქულიდან), {num2} სვლაში.',
  },

  // ── V-DIAGNOSE wound lines ({num} = cure countdown; no object slot) ────────
  {
    en: 'You have a light wound, which will be cured after {num} moves.',
    out: 'მსუბუქი ჭრილობა გაქვს, რომელიც {num} სვლის შემდეგ მოგირჩება.',
  },
  {
    en: 'You have a serious wound, which will be cured after {num} moves.',
    out: 'სერიოზული ჭრილობა გაქვს, რომელიც {num} სვლის შემდეგ მოგირჩება.',
  },
  {
    en: 'You have several wounds, which will be cured after {num} moves.',
    out: 'რამდენიმე ჭრილობა გაქვს, რომლებიც {num} სვლის შემდეგ მოგირჩება.',
  },
  {
    en: 'You have serious wounds, which will be cured after {num} moves.',
    out: 'სერიოზული ჭრილობები გაქვს, რომლებიც {num} სვლის შემდეგ მოგირჩება.',
  },
]
