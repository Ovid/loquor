// Zork I × Georgian object forms (spec §2.3, §4). Keys are EN printed names —
// byte-identical to zork1.fr.objects.ts. Georgian ships a MINIMAL key union:
// just `indef` (= the bare nominative citation form). Georgian has NO articles,
// so the nominative citation form serves both the matcher's built-in "A {obj}"
// listing (which hardcodes {obj.indef}) AND every nominative template slot —
// `bare`/`nom` would be byte-identical to `indef`, so we don't carry them.
// Case-needing lines (ergative subject, dative/genitive object, instrumental
// "with X") are pinned as full strings in zork1.ka.strings.ts, not templated.
// NO capitalization — Mkhedruli is unicameral.
//
// TERMINOLOGY (drafts pending native review, (alpha)): one Georgian word per
// concept, reused across the glossary so the string-authoring steps that follow
// share a single vocabulary. Notable picks, flagged for the reviewer:
//   - button → ღილაკი; lantern/lamp → ფარანი; torch → ჩირაღდანი
//   - sack/bag → ტომარა (brown sack / large bag / leather bag of coins)
//   - knife → დანა; sword → მახვილი; axe → ცული; stiletto → სტილეტი
//   - door → კარი; window → ფანჯარა; wall → კედელი
//   - egg → კვერცხი; canary → კანარა; bird/songbird → ფრინველი/მგალობელი ფრინველი
//   - troll → ტროლი; thief → ქურდი; cyclops → ციკლოპი; grue → გრუ (untranslatable monster)
//   - boat → ნავი; machine → მანქანა; mirror → სარკე
import type { ObjectsTable } from '../types'

export const ZORK1_KA_OBJECTS: ObjectsTable = {
  altar: { indef: 'სამსხვერპლო' },
  'ancient map': { indef: 'უძველესი რუკა' },
  basket: { indef: 'კალათა' },
  bat: { indef: 'ღამურა' },
  'beautiful brass bauble': { indef: 'ლამაზი სპილენძის ბურთულა' },
  'beautiful jeweled scarab': { indef: 'ლამაზი თვლებიანი სკარაბეუსი' },
  "bird's nest": { indef: 'ფრინველის ბუდე' },
  'black book': { indef: 'შავი წიგნი' },
  'blast of air': { indef: 'ჰაერის ნაკადი' },
  blessings: { indef: 'კურთხევები' },
  'bloody axe': { indef: 'სისხლიანი ცული' },
  'blue button': { indef: 'ლურჯი ღილაკი' },
  board: { indef: 'ფიცარი' },
  // Task 10 / M2 option (b): board-bearing -იანი adjective, NOT the instrumental
  // 'ფიცრებით ამოჭედილი' — the -ით participle would be sheared by the parser's
  // postposition split, leaving a form no Georgian player could type.
  'boarded window': { indef: 'ფიცრებიანი ფანჯარა' },
  bolt: { indef: 'ხრახნი' },
  'brass bell': { indef: 'სპილენძის ზარი' },
  'brass lantern': { indef: 'სპილენძის ფარანი' },
  'broken clockwork canary': { indef: 'გატეხილი მექანიკური კანარა' },
  // Task 10 / M2 option (b): jeweled = -იანი adjective (as 'jeweled scarab'),
  // NOT the instrumental 'თვლებით მოოჭვილი' (-ით sheared by the parser split).
  'broken jewel-encrusted egg': { indef: 'გატეხილი თვლებიანი კვერცხი' },
  'broken lantern': { indef: 'გატეხილი ფარანი' },
  'broken timber': { indef: 'გადატეხილი ძელი' },
  'brown button': { indef: 'ყავისფერი ღილაკი' },
  'brown sack': { indef: 'ყავისფერი ტომარა' },
  'burned-out lantern': { indef: 'ჩამქრალი ფარანი' },
  carpet: { indef: 'ხალიჩა' },
  chalice: { indef: 'თასი' },
  chimney: { indef: 'საკვამური' },
  chute: { indef: 'ღარი' },
  cliff: { indef: 'კლდე' },
  'clove of garlic': { indef: 'ნივრის კბილი' },
  'control panel': { indef: 'სამართავი დაფა' },
  crack: { indef: 'ნაპრალი' },
  'crystal skull': { indef: 'ბროლის თავის ქალა' },
  'crystal trident': { indef: 'ბროლის სამკაპა' },
  cyclops: { indef: 'ციკლოპი' },
  dam: { indef: 'კაშხალი' },
  door: { indef: 'კარი' },
  forest: { indef: 'ტყე' },
  'glass bottle': { indef: 'შუშის ბოთლი' },
  'gold coffin': { indef: 'ოქროს კუბო' },
  'golden clockwork canary': { indef: 'ოქროს მექანიკური კანარა' },
  'granite wall': { indef: 'გრანიტის კედელი' },
  grating: { indef: 'ცხაური' },
  'green bubble': { indef: 'მწვანე ბუშტი' },
  ground: { indef: 'მიწა' },
  'group of tool chests': { indef: 'ხელსაწყოების ყუთები' },
  'hand-held air pump': { indef: 'ხელის ჰაერის ტუმბო' },
  'huge diamond': { indef: 'უზარმაზარი ბრილიანტი' },
  'jade figurine': { indef: 'ნეფრიტის ფიგურა' },
  // Task 10 / M2 option (b): -იანი adjective, not the instrumental participle.
  'jewel-encrusted egg': { indef: 'თვლებიანი კვერცხი' },
  'kitchen table': { indef: 'სამზარეულოს მაგიდა' },
  'kitchen window': { indef: 'სამზარეულოს ფანჯარა' },
  'large bag': { indef: 'დიდი ტომარა' },
  'large emerald': { indef: 'დიდი ზურმუხტი' },
  leaflet: { indef: 'ფურცელი' },
  leak: { indef: 'ჟონვა' },
  // Task 10 / M2 option (b): genitive 'coins' leather bag', NOT the instrumental
  // 'ტომარა მონეტებით' (the trailing -ით participle would be sheared by the split).
  'leather bag of coins': { indef: 'მონეტების ტყავის ტომარა' },
  lunch: { indef: 'სადილი' },
  // 'grue' kept as the untranslatable Zork monster; transliterated to Mkhedruli.
  'lurking grue': { indef: 'ჩასაფრებული გრუ' },
  machine: { indef: 'მანქანა' },
  'magic boat': { indef: 'ჯადოსნური ნავი' },
  matchbook: { indef: 'ასანთის კოლოფი' },
  mirror: { indef: 'სარკე' },
  'mountain range': { indef: 'მთათა ქედი' },
  'nasty knife': { indef: 'საზიზღარი დანა' },
  'number of ghosts': { indef: 'მოჩვენებები' },
  painting: { indef: 'ნახატი' },
  'pair of candles': { indef: 'ორი სანთელი' },
  'pair of hands': { indef: 'ორი ხელი' },
  passage: { indef: 'გასასვლელი' },
  pedestal: { indef: 'კვარცხლბეკი' },
  'pile of bodies': { indef: 'გვამების გროვა' },
  'pile of leaves': { indef: 'ფოთლების გროვა' },
  'pile of plastic': { indef: 'პლასტმასის გროვა' },
  'platinum bar': { indef: 'პლატინის ზოდი' },
  'pot of gold': { indef: 'ოქროს ქოთანი' },
  prayer: { indef: 'ლოცვა' },
  'punctured boat': { indef: 'გახვრეტილი ნავი' },
  'quantity of water': { indef: 'წყალი' },
  rainbow: { indef: 'ცისარტყელა' },
  'red buoy': { indef: 'წითელი ბაკანი' },
  'red button': { indef: 'წითელი ღილაკი' },
  'red hot brass bell': { indef: 'ცეცხლისფრად გავარვარებული სპილენძის ზარი' },
  river: { indef: 'მდინარე' },
  rope: { indef: 'თოკი' },
  'rusty knife': { indef: 'დაჟანგული დანა' },
  sailor: { indef: 'მეზღვაური' },
  sand: { indef: 'ქვიშა' },
  // Task 10 / M2 option (b): sapphire-bearing -იანი adjective, NOT the
  // instrumental 'საფირონებით მოოჭვილი' (-ით sheared by the parser split).
  'sapphire-encrusted bracelet': { indef: 'საფირონიანი სამაჯური' },
  sceptre: { indef: 'სკიპტრა' },
  screwdriver: { indef: 'სახრახნისი' },
  'set of teeth': { indef: 'კბილები' },
  shovel: { indef: 'ნიჩაბი' },
  skeleton: { indef: 'ჩონჩხი' },
  'skeleton key': { indef: 'ღია გასაღები' },
  'small mailbox': { indef: 'პატარა საფოსტო ყუთი' },
  'small piece of vitreous slag': { indef: 'მინისებრი წიდის პატარა ნაჭერი' },
  'small pile of coal': { indef: 'ნახშირის პატარა გროვა' },
  songbird: { indef: 'მგალობელი ფრინველი' },
  stairs: { indef: 'კიბე' },
  stiletto: { indef: 'სტილეტი' },
  'stone barrow': { indef: 'ქვის ყორღანი' },
  'stone door': { indef: 'ქვის კარი' },
  'surrounding wall': { indef: 'შემომავლები კედელი' },
  switch: { indef: 'ჩამრთველი' },
  sword: { indef: 'მახვილი' },
  table: { indef: 'მაგიდა' },
  'tan label': { indef: 'მოყვითალო ეტიკეტი' },
  thief: { indef: 'ქურდი' },
  torch: { indef: 'ჩირაღდანი' },
  'tour guidebook': { indef: 'ტურისტული გზამკვლევი' },
  'trap door': { indef: 'საიდუმლო ხაფანგი-კარი' },
  tree: { indef: 'ხე' },
  troll: { indef: 'ტროლი' },
  'trophy case': { indef: 'ჯილდოების ვიტრინა' },
  'trunk of jewels': { indef: 'ძვირფასეულობის ზანდუკი' },
  tube: { indef: 'ტუბი' },
  'viscous material': { indef: 'ბლანტი მასალა' },
  'wall with engravings': { indef: 'მოჩუქურთმებული კედელი' },
  water: { indef: 'წყალი' },
  'white cliffs': { indef: 'თეთრი კლდეები' },
  'white house': { indef: 'თეთრი სახლი' },
  'wooden door': { indef: 'ხის კარი' },
  'wooden ladder': { indef: 'ხის კიბე' },
  'wooden railing': { indef: 'ხის მოაჯირი' },
  wrench: { indef: 'ქანჩის გასაღები' },
  'yellow button': { indef: 'ყვითელი ღილაკი' },
  // Printed name keeps the game's "ZORK" capitalization; ZORK1_KA_CANONICAL
  // maps it onto the lowercase vocab canonical. Display drops the brand.
  "ZORK owner's manual": { indef: 'მფლობელის სახელმძღვანელო' },
  zorkmid: { indef: 'ზორკმიდი' },
}

/** EN printed name → vocab canonical, identical to ZORK1_FR_CANONICAL (both
 * sides are ENGLISH, language-independent). */
export const ZORK1_KA_CANONICAL: Readonly<Record<string, string>> = {
  "ZORK owner's manual": "zork owner's manual",
}
