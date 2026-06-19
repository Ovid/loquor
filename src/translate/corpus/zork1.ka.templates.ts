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
