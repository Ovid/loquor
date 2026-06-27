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
// NATIVE-REVIEW-DRAFT (alpha): model-seeded forms pending the Tbilisi loop
// (spec §9). Full coverage of every Zork I display object is now enforced by the
// corpus round-trip (Task 10, src/translate/corpus/roundtrip.test.ts) and is
// completed below; the walkthrough-parse gate (Task 11) layers on top. Every
// value is the corpus indef run through expandGeorgian's nominative -ი strip,
// plus a bare head-noun synonym a player would actually type (also stripped).
//
// G1 dative recipients (thief, wooden railing) list BOTH the bare nominative
// stem AND the dative -ს form, so the dative path resolves e.g. ქურდს → thief.
//
// RECONCILIATION ITEM #1 (per-token -ი strip hits ADJECTIVES/NUMERALS too):
// expandGeorgian runs per-token over the WHOLE phrase, so every nominative -ი is
// dropped — not just the head noun's, but the adjective's/numeral's as well
// (e.g. corpus 'შავი წიგნი' → stored 'შავ წიგნ'; 'ლამაზი ...' → 'ლამაზ ...';
// 'ორი ...' → 'ორ ...'). Every multi-word value here is therefore the FULLY
// reduced form. Task 10's round-trip compares against expandGeorgian-produced
// forms (via its `reduce` step), NOT the raw corpus indef strings.
//
// RECONCILIATION ITEM #2 (the -ით instrumental morphology): FIVE corpus indef
// forms originally embedded an instrumental-looking participle: 'broken
// jewel-encrusted egg' and 'jewel-encrusted egg' (თვლებით), 'leather bag of
// coins' (მონეტებით), 'sapphire-encrusted bracelet' (საფირონებით), and 'boarded
// window' (ფიცრებით). Task 10's display-corpus `reduce` applies the -ი strip
// ONLY, not the postposition split (review M2), so it accepts those forms — BUT
// the sibling lexicon round-trip (src/llm/lexicon/roundtrip.test.ts) feeds every
// stored value back through the REAL parser, whose ka pre-stage runs the FULL
// expandGeorgian INCLUDING the split, which shears -ით off and mangles the
// phrase ('თვლებით მოოჭვილი კვერცხი' → 'ით თვლებ მოოჭვილ კვერცხ'). A form no
// player can type. So these are resolved via M2 OPTION (b): the DISPLAY CORPUS
// (zork1.ka.objects.ts) was simplified to a split-safe construction — the
// -იანი adjectival ('jeweled' = თვლებიანი, as in 'jeweled scarab'; sapphire =
// საფირონიანი; boarded = ფიცრებიანი) or a genitive ('coins' bag' = მონეტების
// ტყავის ტომარა) — which round-trips cleanly through BOTH gates. The stored
// values below are those simplified forms' strip-only reductions.
import type { NounLexicon } from './types'

export const KA_ZORK1: NounLexicon = {
  altar: ['სამსხვერპლო'], // vowel-final (-ო), no -ი strip
  'ancient map': ['უძველეს რუკა', 'რუკა'], // map რუკა vowel-final
  basket: ['კალათა'], // vowel-final (-ა) (cage/dumbwaiter)
  bat: ['ღამურა'], // vowel-final (bat)
  'beautiful brass bauble': ['ლამაზ სპილენძის ბურთულა', 'ბურთულა'],
  'beautiful jeweled scarab': ['ლამაზ თვლებიან სკარაბეუს', 'სკარაბეუს'],
  "bird's nest": ['ფრინველის ბუდე', 'ბუდე'], // nest ბუდე vowel-final
  'black book': ['შავ წიგნ', 'წიგნ'], // წიგნი → წიგნ (book)
  'blast of air': ['ჰაერის ნაკად', 'ჰაერ'], // head-noun ჰაერი → ჰაერ
  blessings: ['კურთხევებ'], // კურთხევები → კურთხევებ (plural)
  'bloody axe': ['სისხლიან ცულ', 'ცულ'], // ცული → ცულ
  'blue button': ['ლურჯ ღილაკ', 'ღილაკ'], // ღილაკი → ღილაკ
  board: ['ფიცარ'], // ფიცარი → ფიცარ (board)
  'boarded window': ['ფიცრებიან ფანჯარა', 'ფანჯარა'], // window ფანჯარა vowel-final (M2 opt b)
  bolt: ['ხრახნ'], // ხრახნი → ხრახნ
  'brass bell': ['სპილენძის ზარ', 'ზარ'], // ზარი → ზარ (bell)
  'brass lantern': ['სპილენძის ფარან', 'ფარან'], // ფარანი → ფარან; UAT trap (lamp/lantern)
  'broken clockwork canary': ['გატეხილ მექანიკურ კანარა', 'კანარა'], // კანარა vowel-final
  // jeweled = -იანი adjective (M2 opt b: corpus simplified off the -ით participle).
  // ablative 'კანარა კვერცხიდან' (take canary FROM egg): expandGeorgian splits
  // -დან but does NOT re-strip the stem's -ი, so the residue is 'კვერცხი' (not
  // 'კვერცხ') — list both so the ablative source resolves (review reconciliation).
  'broken jewel-encrusted egg': [
    'გატეხილ თვლებიან კვერცხ',
    'გატეხილ თვლებიან კვერცხი', // ablative -ი-residue: 'გატეხილ თვლებიან კვერცხიდან' → [..., კვერცხი]
    'კვერცხ',
    'კვერცხი',
  ], // კვერცხი → კვერცხ (egg)
  'broken lantern': ['გატეხილ ფარან', 'ფარან'], // ფარანი → ფარან
  'broken timber': ['გადატეხილ ძელ', 'ძელ'], // ძელი → ძელ (timber)
  'brown button': ['ყავისფერ ღილაკ', 'ღილაკ'], // ღილაკი → ღილაკ
  'brown sack': ['ყავისფერ ტომარა', 'ტომარა'], // ტომარა vowel-final (sack)
  'burned-out lantern': ['ჩამქრალ ფარან', 'ფარან'], // ფარანი → ფარან
  carpet: ['ხალიჩა'], // vowel-final (rug)
  chalice: ['თას'], // თასი → თას (cup)
  chimney: ['საკვამურ'], // საკვამური → საკვამურ
  chute: ['ღარ'], // ღარი → ღარ (slide/ramp)
  cliff: ['კლდე'], // vowel-final (ledge)
  'clove of garlic': ['ნივრის კბილ', 'ნიორ'], // კბილი → კბილ; garlic ნიორი → ნიორ
  'control panel': ['სამართავ დაფა', 'დაფა'], // panel დაფა vowel-final
  crack: ['ნაპრალ'], // ნაპრალი → ნაპრალ
  'crystal skull': ['ბროლის თავის ქალა', 'ქალა'], // skull თავის ქალა; ქალა vowel-final
  'crystal trident': ['ბროლის სამკაპა', 'სამკაპა'], // trident სამკაპა vowel-final
  cyclops: ['ციკლოპ'], // ციკლოპი → ციკლოპ
  dam: ['კაშხალ'], // კაშხალი → კაშხალ
  door: ['კარ'], // კარი → კარ (the boarded front door)
  forest: ['ტყე'], // vowel-final (forest/trees)
  'glass bottle': ['შუშის ბოთლ', 'ბოთლ'], // ბოთლი → ბოთლ
  'gold coffin': ['ოქროს კუბო', 'კუბო'], // კუბო vowel-final (coffin)
  'golden clockwork canary': ['ოქროს მექანიკურ კანარა', 'კანარა'], // კანარა vowel-final
  'granite wall': ['გრანიტის კედელ', 'კედელ'], // wall კედელი → კედელ
  grating: ['ცხაურ'], // ცხაური → ცხაურ (grate)
  'green bubble': ['მწვანე ბუშტ', 'ბუშტ'], // bubble ბუშტი → ბუშტ
  ground: ['მიწა'], // vowel-final (ground/floor)
  'group of tool chests': ['ხელსაწყოების ყუთებ', 'ყუთებ'], // ყუთები → ყუთებ (chests)
  // ტუმბო is vowel-final. Its FORMAL instrumental 'ტუმბოთი' fuses -ით → -თი; the
  // KA_FUSED_INSTRUMENTALS map (ka.core.ts) routes 'ტუმბოთი' → [ით, ტუმბო] so the
  // -ით prep-split emits 'with pump' (spec §2). The colloquial 'ტუმბოით' splits
  // the same way. The old 'ტუმბოთ' bare synonym is REMOVED: with the fused map it
  // is redundant for commands, and as a round-trip image it reroutes to "with
  // pump" and reddens the gate (spec §2.2). The instrumental orphan reply
  // ('ტუმბოთი'/'ტუმბოით', answering „რით?") resolves via the reply-path leading-
  // prep drop (spec §2.3).
  'hand-held air pump': ['ხელის ჰაერის ტუმბო', 'ტუმბო'], // ტუმბო vowel-final (pump)
  'huge diamond': ['უზარმაზარ ბრილიანტ', 'ბრილიანტ'], // ბრილიანტი → ბრილიანტ (diamond)
  'jade figurine': ['ნეფრიტის ფიგურა', 'ფიგურა', 'ნეფრიტ'], // ფიგურა vowel-final; jade ნეფრიტი → ნეფრიტ
  // jeweled = -იანი adjective (M2 opt b: corpus simplified off the -ით participle).
  'jewel-encrusted egg': [
    'თვლებიან კვერცხ',
    'თვლებიან კვერცხი',
    'კვერცხ',
    'კვერცხი',
  ], // +ablative -ი-residue 'თვლებიან კვერცხი'
  'kitchen table': ['სამზარეულოს მაგიდა', 'მაგიდა'], // table მაგიდა vowel-final
  'kitchen window': ['სამზარეულოს ფანჯარა', 'ფანჯარა'], // window ფანჯარა vowel-final
  'large bag': ['დიდ ტომარა', 'ტომარა'], // ტომარა vowel-final (the thief's bag)
  'large emerald': ['დიდ ზურმუხტ', 'ზურმუხტ'], // ზურმუხტი → ზურმუხტ (emerald)
  leaflet: ['ფურცელ'], // ფურცელი → ფურცელ
  leak: ['ჟონვა'], // vowel-final (leak/drip)
  // genitive 'coins' leather bag' (M2 opt b: corpus simplified off the -ით form)
  // + bare head nouns (coins / bag) the player types.
  'leather bag of coins': ['მონეტების ტყავის ტომარა', 'მონეტებ', 'ტომარა'], // coins / bag
  lunch: ['სადილ'], // სადილი → სადილ (food/lunch)
  'lurking grue': ['ჩასაფრებულ გრუ', 'გრუ'], // grue გრუ (untranslatable monster)
  machine: ['მანქანა'], // vowel-final (also the diamond-machine 'lid')
  'magic boat': ['ჯადოსნურ ნავ', 'ნავ'], // ნავი → ნავ (boat)
  matchbook: ['ასანთის კოლოფ', 'ასანთ'], // head-noun matches ასანთი → ასანთ
  mirror: ['სარკე'], // vowel-final
  'mountain range': ['მთათა ქედ', 'მთა', 'მთებ'], // mountain მთა (vowel-final) / plural მთები → მთებ
  // დანა is vowel-final, so its instrumental 'დანით' (kill thief WITH knife)
  // reduces to 'დან' after the -ით split — list that residue too (review M2-style
  // reconciliation). NOTE: 'დან' is also the ablative postposition word, but a
  // postposition is only ever split off as a SEPARATE prep token (index > 0),
  // never handed to resolveNoun as a whole object span, so the overlap is inert
  // for the walkthrough — the only ablative command (take canary from egg) keeps
  // 'დან' as a prep, never an object. ← review: revisit if a real -დან object collides.
  'nasty knife': ['საზიზღარ დანა', 'დანა', 'დან'], // დანა vowel-final (knife)
  'number of ghosts': ['მოჩვენებებ'], // მოჩვენებები → მოჩვენებებ (ghosts/spirits)
  painting: ['ნახატ'], // ნახატი → ნახატ
  // singular სანთელი → სანთელ; displayed PLURAL სანთები + syncopated plural
  // სანთლები → stems სანთებ / სანთლებ (UAT run 3: the Altar shows the plural).
  'pair of candles': ['ორ სანთელ', 'სანთელ', 'სანთებ', 'სანთლებ'],
  'pair of hands': ['ორ ხელ', 'ხელ'], // hands ხელი → ხელ
  passage: ['გასასვლელ'], // გასასვლელი → გასასვლელ (path/trail)
  pedestal: ['კვარცხლბეკ'], // კვარცხლბეკი → კვარცხლბეკ
  'pile of bodies': ['გვამების გროვა', 'გროვა'], // bodies; გროვა (pile) vowel-final
  'pile of leaves': ['ფოთლების გროვა', 'გროვა'], // leaves; გროვა (pile) vowel-final
  'pile of plastic': ['პლასტმასის გროვა', 'პლასტმას'], // plastic პლასტმასი → პლასტმას
  'platinum bar': ['პლატინის ზოდ', 'ზოდ'], // ზოდი → ზოდ (the platinum bar)
  'pot of gold': ['ოქროს ქოთან', 'ქოთან', 'ოქრო'], // ქოთანი → ქოთან; gold ოქრო vowel-final
  prayer: ['ლოცვა'], // vowel-final (prayer)
  'punctured boat': ['გახვრეტილ ნავ', 'ნავ'], // boat ნავი → ნავ
  'quantity of water': ['წყალ'], // წყალი → წყალ (water)
  rainbow: ['ცისარტყელა'], // vowel-final
  'red buoy': ['წითელ ბაკან', 'ბაკან'], // ბაკანი → ბაკან (buoy)
  'red button': ['წითელ ღილაკ', 'ღილაკ'], // ღილაკი → ღილაკ
  'red hot brass bell': ['ცეცხლისფრად გავარვარებულ სპილენძის ზარ', 'ზარ'], // bell ზარი → ზარ
  river: ['მდინარე'], // vowel-final (river)
  rope: ['თოკ'], // თოკი → თოკ
  'rusty knife': ['დაჟანგულ დანა', 'დანა'], // დანა vowel-final
  sailor: ['მეზღვაურ'], // მეზღვაური → მეზღვაურ (sailor/aviator)
  sand: ['ქვიშა'], // vowel-final
  // sapphire-bearing -იანი adjective (M2 opt b: corpus simplified off the -ით form).
  'sapphire-encrusted bracelet': ['საფირონიან სამაჯურ', 'სამაჯურ'], // სამაჯური → სამაჯურ
  sceptre: ['სკიპტრა'], // vowel-final
  screwdriver: ['სახრახნის'], // სახრახნისი → სახრახნის
  'set of teeth': ['კბილებ'], // კბილები → კბილებ (teeth)
  shovel: ['ნიჩაბ'], // ნიჩაბი → ნიჩაბ
  skeleton: ['ჩონჩხ'], // ჩონჩხი → ჩონჩხ (skeleton/bones)
  'skeleton key': ['ღია გასაღებ', 'გასაღებ'], // გასაღები → გასაღებ (key)
  // +displayed middle form 'საფოსტო ყუთ': a player types the on-screen name,
  // dropping the leading adjective პატარა "small" (UAT finding 1). Unambiguous —
  // საფოსტო "postal" appears only here.
  'small mailbox': ['პატარა საფოსტო ყუთ', 'საფოსტო ყუთ', 'ყუთ'], // ყუთი → ყუთ (mailbox)
  'small piece of vitreous slag': ['მინისებრ წიდის პატარა ნაჭერ', 'ნაჭერ'], // slag piece ნაჭერი → ნაჭერ
  'small pile of coal': ['ნახშირის პატარა გროვა', 'ნახშირ'], // coal ნახშირი → ნახშირ
  songbird: ['მგალობელ ფრინველ', 'ფრინველ'], // ფრინველი → ფრინველ (bird)
  stairs: ['კიბე'], // vowel-final (stairs/staircase)
  stiletto: ['სტილეტ'], // სტილეტი → სტილეტ
  'stone barrow': ['ქვის ყორღან', 'ყორღან'], // ყორღანი → ყორღან
  'stone door': ['ქვის კარ', 'კარ'], // door კარი → კარ
  'surrounding wall': ['შემომავლებ კედელ', 'კედელ'], // wall კედელი → კედელ
  switch: ['ჩამრთველ'], // ჩამრთველი → ჩამრთველ
  sword: ['მახვილ'], // მახვილი → მახვილ
  table: ['მაგიდა'], // vowel-final (table)
  'tan label': ['მოყვითალო ეტიკეტ', 'ეტიკეტ'], // label ეტიკეტი → ეტიკეტ
  thief: ['ქურდ', 'ქურდს'], // ქურდი → ქურდ; G1 dative recipient ქურდს → thief
  torch: ['ჩირაღდან'], // ჩირაღდანი → ჩირაღდან
  'tour guidebook': ['ტურისტულ გზამკვლევ', 'გზამკვლევ'], // guide გზამკვლევი → გზამკვლევ
  // corpus has a hyphen (ხაფანგი-კარი) → folds to two tokens → reduced
  // 'საიდუმლო ხაფანგ კარ'. Keep that reduced display form, the on-screen middle
  // form 'ხაფანგ კარ' (player drops the leading adjective საიდუმლო "secret" — UAT
  // finding 4), AND the hyphen-free head noun (ხაფანგ). NOT resolved by a generic
  // modifier strip: dropping ხაფანგ → bare კარ mis-binds to the ambiguous door set
  // (trap door's salient word is ხაფანგ "trap", not the head კარ "door").
  'trap door': ['საიდუმლო ხაფანგ კარ', 'ხაფანგ კარ', 'ხაფანგ'], // trap ხაფანგი → ხაფანგ
  tree: ['ხე'], // vowel-final
  troll: ['ტროლ'], // ტროლი → ტროლ
  'trophy case': ['ჯილდოების ვიტრინა', 'ვიტრინა'], // ვიტრინა vowel-final (case)
  'trunk of jewels': ['ძვირფასეულობის ზანდუკ', 'ზანდუკ'], // ზანდუკი → ზანდუკ (trunk)
  tube: ['ტუბ'], // ტუბი → ტუბ (tube/paste)
  'viscous material': ['ბლანტ მასალა', 'მასალა'], // material მასალა vowel-final
  'wall with engravings': ['მოჩუქურთმებულ კედელ', 'კედელ'], // wall კედელი → კედელ
  water: ['წყალ'], // წყალი → წყალ (water)
  'white cliffs': ['თეთრ კლდეებ', 'კლდეებ'], // cliffs კლდეები → კლდეებ
  'white house': ['თეთრ სახლ', 'სახლ'], // სახლი → სახლ (house)
  'wooden door': ['ხის კარ', 'კარ'], // door კარი → კარ (the west lettering door)
  'wooden ladder': ['ხის კიბე', 'კიბე'], // ladder კიბე vowel-final
  'wooden railing': ['ხის მოაჯირ', 'მოაჯირ', 'მოაჯირს'], // G1 dative recipient მოაჯირს
  // wrench = 'nut-key' (ქანჩის გასაღები), a genitive compound. ONLY the full
  // two-word form — bare გასაღებ is the skeleton key, so no bare synonym. The -ით
  // instrumental resolves via the stranded-modifier rejoin in parse.ts.
  wrench: ['ქანჩის გასაღებ'],
  'yellow button': ['ყვითელ ღილაკ', 'ღილაკ'], // ღილაკი → ღილაკ
  // ZORK owner's manual: canonical 'zork owner's manual' (see ZORK1_KA_CANONICAL).
  "zork owner's manual": ['მფლობელის სახელმძღვანელო', 'სახელმძღვანელო'], // manual; vowel-final
  zorkmid: ['ზორკმიდ'], // ზორკმიდი → ზორკმიდ (the Zork currency)
}
