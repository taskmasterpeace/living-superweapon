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
