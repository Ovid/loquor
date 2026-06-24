// src/llm/lexicon/ka.zork1.ts
// Georgian → Zork I noun lexicon (spec §4.2). KEYS are extracted-vocab
// canonicals (src/llm/grammar/zork1.vocab.ts), written in vocab canonical
// order. VALUES are folded, hyphen-free, BARE-STEM Georgian — the EXACT form
// expandGeorgian produces (nominative -ი dropped per-token when token
// length > 1; vowel-final stems kept whole). The input matcher (parse.ts
// resolveNoun) matches a span as ONE joined phrase string, so each full-phrase
// value here is the corpus indef run through expandGeorgian verbatim, plus a
// bare head-noun synonym a player would actually type (also expandGeorgian-form).
//
// NATIVE-REVIEW-DRAFT (beta): model-seeded forms pending the Tbilisi loop
// (spec §9). This is a SEED — the walkthrough head-nouns plus the G1 dative
// recipients. Full coverage of every Zork I object is forced later by the
// corpus round-trip (Task 10) and the walkthrough-parse gate (Task 11);
// remaining objects are filled there. Do not assume completeness yet.
//
// G1 dative recipients (thief, wooden railing) list BOTH the bare nominative
// stem AND the dative -ს form, so the dative path resolves e.g. ქურდს → thief.
//
// KNOWN RECONCILIATION ITEM for Task 10/11 (the -ით collision): four corpus
// indef forms embed an instrumental-looking participle (თვლებით / მონეტებით /
// საფირონებით). expandGeorgian's postposition split is per-token and longest-
// first, so it shears -ით off those tokens, mangling the FULL phrase (e.g.
// 'გატეხილი თვლებით მოოჭვილი კვერცხი' → 'გატეხილ ით თვლებ მოოჭვილ კვერცხ').
// No player types that, so we DROP the garbled full phrase for those objects
// and rely on the clean bare head-noun synonym (კვერცხ / მონეტებ / სამაჯურ).
// Task 10's round-trip should either accept the bare form as coverage or the
// corpus should switch those participles to a non-ით citation form.
import type { NounLexicon } from './types'

export const KA_ZORK1: NounLexicon = {
  altar: ['სამსხვერპლო'], // vowel-final (-ო), no -ი strip
  basket: ['კალათა'], // vowel-final (-ა) (cage/dumbwaiter)
  'beautiful brass bauble': ['ლამაზ სპილენძის ბურთულა', 'ბურთულა'],
  'beautiful jeweled scarab': ['ლამაზ თვლებიან სკარაბეუს', 'სკარაბეუს'],
  'black book': ['შავ წიგნ', 'წიგნ'], // წიგნი → წიგნ (book)
  'blast of air': ['ჰაერის ნაკად', 'ჰაერ'], // head-noun ჰაერი → ჰაერ
  'bloody axe': ['სისხლიან ცულ', 'ცულ'], // ცული → ცულ
  'blue button': ['ლურჯ ღილაკ', 'ღილაკ'], // ღილაკი → ღილაკ
  bolt: ['ხრახნ'], // ხრახნი → ხრახნ
  'brass bell': ['სპილენძის ზარ', 'ზარ'], // ზარი → ზარ (bell)
  'brass lantern': ['სპილენძის ფარან', 'ფარან'], // ფარანი → ფარან; UAT trap (lamp/lantern)
  'broken clockwork canary': ['გატეხილ მექანიკურ კანარა', 'კანარა'], // კანარა vowel-final
  // -ით collision: full phrase garbled by expandGeorgian; rely on bare head noun.
  'broken jewel-encrusted egg': ['კვერცხ'], // კვერცხი → კვერცხ (egg)
  'clove of garlic': ['ნივრის კბილ', 'ნიორ'], // კბილი → კბილ; garlic ნიორი → ნიორ
  cyclops: ['ციკლოპ'], // ციკლოპი → ციკლოპ
  dam: ['კაშხალ'], // კაშხალი → კაშხალ
  door: ['კარ'], // კარი → კარ (the boarded front door)
  'glass bottle': ['შუშის ბოთლ', 'ბოთლ'], // ბოთლი → ბოთლ
  'gold coffin': ['ოქროს კუბო', 'კუბო'], // კუბო vowel-final (coffin)
  grating: ['ცხაურ'], // ცხაური → ცხაურ (grate)
  'group of tool chests': ['ხელსაწყოების ყუთებ', 'ყუთებ'], // ყუთები → ყუთებ (chests)
  'hand-held air pump': ['ხელის ჰაერის ტუმბო', 'ტუმბო'], // ტუმბო vowel-final (pump)
  'huge diamond': ['უზარმაზარ ბრილიანტ', 'ბრილიანტ'], // ბრილიანტი → ბრილიანტ (diamond)
  'jade figurine': ['ნეფრიტის ფიგურა', 'ფიგურა', 'ნეფრიტ'], // ფიგურა vowel-final; jade ნეფრიტი → ნეფრიტ
  // -ით collision: full phrase garbled; rely on bare head noun.
  'jewel-encrusted egg': ['კვერცხ'], // კვერცხი → კვერცხ
  'large bag': ['დიდ ტომარა', 'ტომარა'], // ტომარა vowel-final (the thief's bag)
  'large emerald': ['დიდ ზურმუხტ', 'ზურმუხტ'], // ზურმუხტი → ზურმუხტ (emerald)
  leaflet: ['ფურცელ'], // ფურცელი → ფურცელ
  // -ით collision in 'მონეტებით'; rely on bare head nouns (coins / bag).
  'leather bag of coins': ['მონეტებ', 'ტომარა'], // coins / bag
  machine: ['მანქანა'], // vowel-final (also the diamond-machine 'lid')
  'magic boat': ['ჯადოსნურ ნავ', 'ნავ'], // ნავი → ნავ (boat)
  matchbook: ['ასანთის კოლოფ', 'ასანთ'], // head-noun matches ასანთი → ასანთ
  mirror: ['სარკე'], // vowel-final
  'mountain range': ['მთათა ქედ', 'მთა', 'მთებ'], // mountain მთა (vowel-final) / plural მთები → მთებ
  'nasty knife': ['საზიზღარ დანა', 'დანა'], // დანა vowel-final (knife)
  painting: ['ნახატ'], // ნახატი → ნახატ
  'pair of candles': ['ორ სანთელ', 'სანთელ'], // candles სანთელი → სანთელ
  'pile of plastic': ['პლასტმასის გროვა', 'პლასტმას'], // plastic პლასტმასი → პლასტმას
  'platinum bar': ['პლატინის ზოდ', 'ზოდ'], // ზოდი → ზოდ (the platinum bar)
  'pot of gold': ['ოქროს ქოთან', 'ქოთან', 'ოქრო'], // ქოთანი → ქოთან; gold ოქრო vowel-final
  rainbow: ['ცისარტყელა'], // vowel-final
  'red buoy': ['წითელ ბაკან', 'ბაკან'], // ბაკანი → ბაკან (buoy)
  'red button': ['წითელ ღილაკ', 'ღილაკ'], // ღილაკი → ღილაკ
  rope: ['თოკ'], // თოკი → თოკ
  'rusty knife': ['დაჟანგულ დანა', 'დანა'], // დანა vowel-final
  sand: ['ქვიშა'], // vowel-final
  // -ით collision in 'საფირონებით'; rely on bare head noun (bracelet).
  'sapphire-encrusted bracelet': ['სამაჯურ'], // სამაჯური → სამაჯურ
  sceptre: ['სკიპტრა'], // vowel-final
  screwdriver: ['სახრახნის'], // სახრახნისი → სახრახნის
  shovel: ['ნიჩაბ'], // ნიჩაბი → ნიჩაბ
  'skeleton key': ['ღია გასაღებ', 'გასაღებ'], // გასაღები → გასაღებ (key)
  'small mailbox': ['პატარა საფოსტო ყუთ', 'ყუთ'], // ყუთი → ყუთ (mailbox)
  'small pile of coal': ['ნახშირის პატარა გროვა', 'ნახშირ'], // coal ნახშირი → ნახშირ
  songbird: ['მგალობელ ფრინველ', 'ფრინველ'], // ფრინველი → ფრინველ (bird)
  stiletto: ['სტილეტ'], // სტილეტი → სტილეტ
  'stone barrow': ['ქვის ყორღან', 'ყორღან'], // ყორღანი → ყორღან
  switch: ['ჩამრთველ'], // ჩამრთველი → ჩამრთველ
  sword: ['მახვილ'], // მახვილი → მახვილ
  thief: ['ქურდ', 'ქურდს'], // ქურდი → ქურდ; G1 dative recipient ქურდს → thief
  torch: ['ჩირაღდან'], // ჩირაღდანი → ჩირაღდან
  // -კარი → -კარ; corpus has a hyphen (ხაფანგი-კარი); store the hyphen-free
  // head noun the player types (ხაფანგ). The hyphenated full phrase is dropped.
  'trap door': ['ხაფანგ'], // trap ხაფანგი → ხაფანგ
  tree: ['ხე'], // vowel-final
  troll: ['ტროლ'], // ტროლი → ტროლ
  'trophy case': ['ჯილდოების ვიტრინა', 'ვიტრინა'], // ვიტრინა vowel-final (case)
  'trunk of jewels': ['ძვირფასეულობის ზანდუკ', 'ზანდუკ'], // ზანდუკი → ზანდუკ (trunk)
  'white house': ['თეთრ სახლ', 'სახლ'], // სახლი → სახლ (house)
  'wooden railing': ['ხის მოაჯირ', 'მოაჯირ', 'მოაჯირს'], // G1 dative recipient მოაჯირს
  wrench: ['სასხლეტ გასაღებ', 'სასხლეტ'], // head-noun სასხლეტი → სასხლეტ
  'yellow button': ['ყვითელ ღილაკ', 'ღილაკ'], // ღილაკი → ღილაკ
}
