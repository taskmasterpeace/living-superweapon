// THRESHOLD — the cast. Every Living Superweapon is a PERSON from a real place:
// civilian name, home city, country, flag. Canon anchors respected (KIVULI is Kampala's,
// KING STEFANOS is the President of Greece, SANDRA is the L.A. Jackal, the Hand trio are
// East/West African, RAMIRO hunts cartels out of Juárez). Non-humans get their designation
// and where they were built/found — honest paperwork for honest monsters.
// Shape: { n: real name, c: city, co: country, f: flag }

export const IDENTITIES = {
  sol:        { n: 'Samuel Ellison',        c: 'Ellsworth, Kansas',   co: 'USA',          f: '🇺🇸' },
  kano:       { n: 'Ryuji Kano',            c: 'Okinawa',             co: 'Japan',        f: '🇯🇵' },
  vega:       { n: 'Adrián Vega y Castillo', c: 'Seville',            co: 'Spain',        f: '🇪🇸' },
  aurum:      { n: 'Aurélio Campos',        c: 'São Paulo',           co: 'Brazil',       f: '🇧🇷' },
  nova:       { n: 'Novalie Strand',        c: 'Tromsø',              co: 'Norway',       f: '🇳🇴' },
  rime:       { n: 'Rúnar Ísleifsson',      c: 'Reykjavík',           co: 'Iceland',      f: '🇮🇸' },
  volt:       { n: 'Baek Jin-ho',           c: 'Seoul',               co: 'South Korea',  f: '🇰🇷' },
  warden:     { n: 'Desmond Ward',          c: 'Manchester',          co: 'United Kingdom', f: '🇬🇧' },
  hive:       { n: 'Anže Čebular',          c: 'Ljubljana',           co: 'Slovenia',     f: '🇸🇮' },
  pyre:       { n: 'Piper Reardon',         c: 'Alice Springs',       co: 'Australia',    f: '🇦🇺' },
  torch:      { n: 'Tommy Carideo',         c: 'New York City',       co: 'USA',          f: '🇺🇸' },
  apex:       { n: 'A.P.X.-01 (lab-grown)', c: 'Geneva',              co: 'Switzerland',  f: '🇨🇭' },
  specter:    { n: 'Unit SPC-3 (synthezoid)', c: 'Cambridge',         co: 'United Kingdom', f: '🇬🇧' },
  vanguard:   { n: 'Viktor Andreyev',       c: 'Volgograd',           co: 'Russia',       f: '🇷🇺' },
  kraken:     { n: 'Rógvi Djurhuus',        c: 'Tórshavn',            co: 'Faroe Islands', f: '🇫🇴' },
  rift:       { n: 'Arjun Deshpande',       c: 'Mumbai',              co: 'India',        f: '🇮🇳' },
  titan:      { n: 'Unit T-1TAN (war engine)', c: 'Detroit',          co: 'USA',          f: '🇺🇸' },
  sarge:      { n: 'Marcus Cole',           c: 'Columbus, Georgia',   co: 'USA',          f: '🇺🇸' },
  kivuli:     { n: 'Kato Ssemanda',         c: 'Kampala',             co: 'Uganda',       f: '🇺🇬' },
  gale:       { n: 'Gwendolyn Alderwood',   c: 'Inverness',           co: 'United Kingdom', f: '🇬🇧' },
  stefanos:   { n: 'Stefanos Vasilakis',    c: 'Athens',              co: 'Greece',       f: '🇬🇷' },
  sandra:     { n: 'Sandra Vance',          c: 'Los Angeles',         co: 'USA',          f: '🇺🇸' },
  ironclad:   { n: 'Ivan Radcliffe',        c: 'Palo Alto',           co: 'USA',          f: '🇺🇸' },
  rage:       { n: 'Dr. Barnaby Rooke',     c: 'Dayton, Ohio',        co: 'USA',          f: '🇺🇸' },
  stormcall:  { n: 'Sten Torvaldsen',       c: 'Uppsala',             co: 'Sweden',       f: '🇸🇪' },
  webline:    { n: 'Miles Otero',           c: 'Queens, New York',    co: 'USA',          f: '🇺🇸' },
  ripclaw:    { n: 'Jack Sutherland',       c: 'Fort McMurray',       co: 'Canada',       f: '🇨🇦' },
  majesty:    { n: 'Maya Jefferson',        c: 'Boston',              co: 'USA',          f: '🇺🇸' },
  mystward:   { n: 'Tenzin Dorje',          c: 'Kathmandu',           co: 'Nepal',        f: '🇳🇵' },
  onyx:       { n: 'Dawit Negasi',          c: 'Addis Ababa',         co: 'Ethiopia',     f: '🇪🇹' },
  chainfire:  { n: 'Ezequiel Barraza',      c: 'Monterrey',           co: 'Mexico',       f: '🇲🇽' },
  tempest:    { n: 'Nailah Hassanein',      c: 'Cairo',               co: 'Egypt',        f: '🇪🇬' },
  knightfall: { n: 'Elliot Wexler-Kane',    c: 'Chicago',             co: 'USA',          f: '🇺🇸' },
  aegis:      { n: 'Alexia Stavrou',        c: 'Heraklion, Crete',    co: 'Greece',       f: '🇬🇷' },
  olympus:    { n: 'Owen Palmer (age 13)',  c: 'Philadelphia',        co: 'USA',          f: '🇺🇸' },
  marshal:    { n: '"John Marsh" (refugee of a dead world)', c: 'Denver (adopted)', co: 'USA', f: '🇺🇸' },
  circuit:    { n: 'Silas Boateng',         c: 'Accra',               co: 'Ghana',        f: '🇬🇭' },
  trench:     { n: 'Kaimana Aukai',         c: 'Honolulu (surface) · the Pacific Deep', co: 'USA', f: '🇺🇸' },
  decibel:    { n: 'Bianca Leone',          c: 'Naples',              co: 'Italy',        f: '🇮🇹' },
  coldsnap:   { n: 'Viktor Fromm',          c: 'Winnipeg',            co: 'Canada',       f: '🇨🇦' },
  foundry:    { n: 'Beatrix Kowalczyk',     c: 'Pittsburgh',          co: 'USA',          f: '🇺🇸' },
  talon:      { n: 'Teodoro Almeida',       c: 'Lisbon',              co: 'Portugal',     f: '🇵🇹' },
  abeo:       { n: 'Abeo Adeyemi',          c: 'Lagos',               co: 'Nigeria',      f: '🇳🇬' },
  jelani:     { n: 'Jelani Mwakasege',      c: 'Dar es Salaam',       co: 'Tanzania',     f: '🇹🇿' },
  kamaria:    { n: 'Kamaria Odhiambo',      c: 'Mombasa',             co: 'Kenya',        f: '🇰🇪' },
  ramiro:     { n: 'Ramiro Ontiveros',      c: 'Ciudad Juárez',       co: 'Mexico',       f: '🇲🇽' },
  jawah:      { n: 'Jawah Matu',            c: 'Nairobi',             co: 'Kenya',        f: '🇰🇪' },
  moses:      { n: 'Moses Apio',            c: 'Gulu',                co: 'Uganda',       f: '🇺🇬' },
  dune:       { n: 'Amadou Cissé',          c: 'Timbuktu',            co: 'Mali',         f: '🇲🇱' },
  graven:     { n: 'Grigor Petrossian',     c: 'Yerevan',             co: 'Armenia',      f: '🇦🇲' },
  bulwark:    { n: 'Bogdan Zelenko',        c: 'Kyiv',                co: 'Ukraine',      f: '🇺🇦' },
  feral:      { n: 'Yara Ticuna',           c: 'Manaus',              co: 'Brazil',       f: '🇧🇷' },
};

// Merge identities onto the defs at boot (def.person). Custom heroes carry their own person
// from the ORIGIN creator; anything unknown gets honest unknown-paperwork.
export function applyIdentities(roster) {
  for (const def of roster) {
    if (!def.person && IDENTITIES[def.id]) def.person = IDENTITIES[def.id];
  }
}
export function identityOf(def) {
  return def.person || IDENTITIES[def.id] || { n: 'Identity sealed', c: 'Unknown', co: 'Unknown', f: '🏳' };
}


// The flag for ANY homeland the creator can pick — name → ISO2 → regional indicators.
// Loose match (case-insensitive, 'the ' stripped). Unknown lands fly the neutral banner.
const ISO2 = {
  'afghanistan':'AF','albania':'AL','algeria':'DZ','andorra':'AD','angola':'AO','argentina':'AR','armenia':'AM',
  'australia':'AU','austria':'AT','azerbaijan':'AZ','bahamas':'BS','bahrain':'BH','bangladesh':'BD','belarus':'BY',
  'belgium':'BE','belize':'BZ','benin':'BJ','bolivia':'BO','bosnia and herzegovina':'BA','botswana':'BW','brazil':'BR',
  'brunei':'BN','bulgaria':'BG','burkina faso':'BF','burundi':'BI','cambodia':'KH','cameroon':'CM','canada':'CA',
  'central african republic':'CF','chad':'TD','chile':'CL','china':'CN','colombia':'CO','congo':'CG',
  'republic of the congo':'CD','costa rica':'CR','croatia':'HR','cuba':'CU','czech republic':'CZ','denmark':'DK',
  'djibouti':'DJ','dominican republic':'DO','ecuador':'EC','egypt':'EG','el salvador':'SV','equatorial guinea':'GQ',
  'eritrea':'ER','estonia':'EE','eswatini':'SZ','ethiopia':'ET','faroe islands':'FO','fiji':'FJ','finland':'FI',
  'france':'FR','gabon':'GA','georgia':'GE','germany':'DE','ghana':'GH','greece':'GR','guatemala':'GT','guinea':'GN',
  'guinea-bissau':'GW','guyana':'GY','haiti':'HT','honduras':'HN','hong kong':'HK','hungary':'HU','iceland':'IS',
  'india':'IN','indonesia':'ID','iran':'IR','iraq':'IQ','ireland':'IE','israel':'IL','italy':'IT','ivory coast':'CI',
  'jamaica':'JM','japan':'JP','jordan':'JO','kazakhstan':'KZ','kenya':'KE','kuwait':'KW','kyrgyzstan':'KG','laos':'LA',
  'latvia':'LV','lebanon':'LB','liberia':'LR','libya':'LY','lithuania':'LT','madagascar':'MG','malawi':'MW',
  'malaysia':'MY','mali':'ML','mauritania':'MR','mexico':'MX','moldova':'MD','monaco':'MC','mongolia':'MN',
  'montenegro':'ME','morocco':'MA','mozambique':'MZ','myanmar':'MM','namibia':'NA','nepal':'NP','netherlands':'NL',
  'new zealand':'NZ','nicaragua':'NI','niger':'NE','nigeria':'NG','north korea':'KP','north macedonia':'MK',
  'norway':'NO','oman':'OM','pakistan':'PK','palestine':'PS','panama':'PA','papua new guinea':'PG','paraguay':'PY',
  'peru':'PE','philippines':'PH','poland':'PL','portugal':'PT','puerto rico':'PR','qatar':'QA','romania':'RO',
  'russia':'RU','rwanda':'RW','são tomé and príncipe':'ST','saudi arabia':'SA','senegal':'SN','serbia':'RS',
  'sierra leone':'SL','singapore':'SG','slovakia':'SK','slovenia':'SI','solomon islands':'SB','somalia':'SO',
  'south africa':'ZA','south korea':'KR','south sudan':'SS','spain':'ES','sri lanka':'LK','sudan':'SD',
  'suriname':'SR','sweden':'SE','switzerland':'CH','syria':'SY','taiwan':'TW','tajikistan':'TJ','tanzania':'TZ',
  'thailand':'TH','togo':'TG','trinidad and tobago':'TT','tunisia':'TN','turkey':'TR','turkmenistan':'TM',
  'uganda':'UG','ukraine':'UA','united arab emirates':'AE','united kingdom':'GB','united states':'US','usa':'US',
  'uruguay':'UY','uzbekistan':'UZ','venezuela':'VE','vietnam':'VN','western sahara':'EH','yemen':'YE','zambia':'ZM',
  'zimbabwe':'ZW','mars':'MARS','the moon':'MOON','pluto':'PLUTO',
};
export function flagFor(country) {
  if (!country) return '🌐';
  const k = String(country).toLowerCase().replace(/^the /, '').trim();
  const iso = ISO2[k] || ISO2[k.replace(/^republic of /, '')];
  if (!iso) return '🌐';
  if (iso.length !== 2) return iso === 'MARS' ? '🔴' : iso === 'MOON' ? '🌙' : '❄';   // off-world homelands
  return String.fromCodePoint(...[...iso].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}
