// THRESHOLD — CLIMATE: what January is like where the fight happens.
//
// The Miami-vs-New-York problem: the two read as the same biome, but it can never snow in one and
// it snows every winter in the other. The sheet has no climate column and no coordinates, so —
// like terrain — climate is AUTHORED here and JOINED at load. Robert's CSV stays his.
//
// ⚠ ATLAS IS A DATA PLATFORM (Robert's ruling 2026-07-24): games render their own weather —
// particles, palettes, seasons are the consuming game's business. This file only KNOWS:
// zone, latitude, a 12-month temperature curve, and which months can snow.
//
// The curve is a cosine over the year from (köppen zone, |latitude|, hemisphere) — approximate ON
// PURPOSE. The contract is the API and the right answer to "can it snow here in January?", not
// meteorology. When real per-city normals are wanted, a run-once offline bake against public data
// (Köppen–Geiger grids, WorldClim/NOAA normals) regenerates THIS file — no runtime network, ever.
//
// Resolution order, most specific first (same as geography.js):
//   1. CITY_CLIMATE    — a named city that is not like its country (Miami, Harbin, La Paz…)
//   2. COUNTRY_CLIMATE — the country's dominant zone + a representative latitude
//   3. a temperate default, so an unlisted row is never broken — just mild

export const ZONES = {
  Af:  { mean: 26.5, amp0: 1.5, ampK: 0,    label: 'tropical rainforest', wet: 'year-round rain' },
  Am:  { mean: 26.5, amp0: 2,   ampK: 0,    label: 'tropical monsoon',    wet: 'monsoon' },
  Aw:  { mean: 26,   amp0: 2.5, ampK: 0.02, label: 'tropical savanna',    wet: 'wet summer' },
  BWh: { mean: 25,   amp0: 8,   ampK: 0.10, label: 'hot desert',          wet: 'arid' },
  BSh: { mean: 22,   amp0: 8,   ampK: 0.10, label: 'hot steppe',          wet: 'semi-arid' },
  BWk: { mean: 13,   amp0: 11,  ampK: 0.10, label: 'cold desert',         wet: 'arid' },
  BSk: { mean: 10,   amp0: 10,  ampK: 0.10, label: 'cold steppe',         wet: 'semi-arid' },
  Csa: { mean: 17,   amp0: 9,   ampK: 0.08, label: 'mediterranean',       wet: 'wet winter' },
  Csb: { mean: 14,   amp0: 7,   ampK: 0.06, label: 'cool mediterranean',  wet: 'wet winter' },
  Cfa: { mean: 16,   amp0: 9,   ampK: 0.10, label: 'humid subtropical',   wet: 'year-round rain' },
  Cfb: { mean: 10.5, amp0: 7,   ampK: 0.05, label: 'oceanic',             wet: 'year-round rain' },
  Cwa: { mean: 18,   amp0: 8,   ampK: 0.06, label: 'monsoon subtropical', wet: 'wet summer' },
  Cwb: { mean: 13,   amp0: 5,   ampK: 0.04, label: 'highland subtropical', wet: 'wet summer' },
  Dfa: { mean: 9,    amp0: 13,  ampK: 0.05, label: 'humid continental',   wet: 'year-round' },
  Dfb: { mean: 4.5,  amp0: 13,  ampK: 0.06, label: 'continental',         wet: 'year-round' },
  Dwa: { mean: 7,    amp0: 15,  ampK: 0.04, label: 'monsoon continental', wet: 'dry winter' },
  Dwb: { mean: 2,    amp0: 16,  ampK: 0.04, label: 'cold continental',    wet: 'dry winter' },
  Dfc: { mean: -2,   amp0: 14,  ampK: 0.08, label: 'subarctic',           wet: 'sparse' },
  Dwc: { mean: -4,   amp0: 17,  ampK: 0.04, label: 'dry subarctic',       wet: 'sparse' },
  ET:  { mean: -8,   amp0: 12,  ampK: 0.10, label: 'tundra',              wet: 'sparse' },
  EF:  { mean: -25,  amp0: 15,  ampK: 0,    label: 'ice cap',             wet: 'sparse' },
  H:   { mean: 9,    amp0: 2.5, ampK: 0.28, label: 'highland',            wet: 'varies' },
  // ⚠ H amplitude rides |latitude| hard: an equatorial highland (Nairobi, Quito) is famously
  // FLAT year-round, while a high-latitude one (Lhasa) swings like a continental city.
};

// { k: köppen zone, lat: representative latitude (SIGNED — south is negative), mean?: override }
export const COUNTRY_CLIMATE = {
  // --- AFRICA ---------------------------------------------------------------------------------
  Algeria: { k: 'BWh', lat: 30 }, Angola: { k: 'Aw', lat: -12 }, Benin: { k: 'Aw', lat: 9 },
  'Burkina Faso': { k: 'BSh', lat: 12 }, Burundi: { k: 'Aw', lat: -3, mean: 20 },
  Cameroon: { k: 'Am', lat: 5 }, 'Central African Republic': { k: 'Aw', lat: 6 },
  Chad: { k: 'BWh', lat: 15 }, 'DR Congo': { k: 'Af', lat: -2 }, Djibouti: { k: 'BWh', lat: 11 },
  Egypt: { k: 'BWh', lat: 28 }, Eritrea: { k: 'BSh', lat: 15 }, Ethiopia: { k: 'Cwb', lat: 9, mean: 17 },
  Gabon: { k: 'Af', lat: 0 }, Ghana: { k: 'Aw', lat: 7 }, Guinea: { k: 'Am', lat: 10 },
  'Guinea-Bissau': { k: 'Aw', lat: 12 }, 'Ivory Coast': { k: 'Am', lat: 7 },
  Kenya: { k: 'Aw', lat: -1, mean: 21 }, Liberia: { k: 'Af', lat: 6 }, Libya: { k: 'BWh', lat: 29 },
  Madagascar: { k: 'Aw', lat: -19 }, Malawi: { k: 'Cwa', lat: -14 }, Mali: { k: 'BWh', lat: 16 },
  Mauritania: { k: 'BWh', lat: 20 }, Morocco: { k: 'Csa', lat: 33 }, Mozambique: { k: 'Aw', lat: -18 },
  Niger: { k: 'BWh', lat: 16 }, Nigeria: { k: 'Aw', lat: 9 },
  'Republic of the Congo': { k: 'Af', lat: -1 }, Rwanda: { k: 'Cwb', lat: -2, mean: 18 },
  Senegal: { k: 'BSh', lat: 15 }, 'Sierra Leone': { k: 'Am', lat: 8 }, Somalia: { k: 'BWh', lat: 5 },
  'South Africa': { k: 'BSk', lat: -29, mean: 16 }, Sudan: { k: 'BWh', lat: 15 },
  Tanzania: { k: 'Aw', lat: -6 }, Togo: { k: 'Aw', lat: 8 }, Tunisia: { k: 'Csa', lat: 35 },
  Uganda: { k: 'Aw', lat: 0, mean: 22 }, Zambia: { k: 'Cwa', lat: -15 }, Zimbabwe: { k: 'Cwa', lat: -19 },
  // --- THE AMERICAS ---------------------------------------------------------------------------
  Argentina: { k: 'Cfa', lat: -34 }, Bolivia: { k: 'Cwb', lat: -17, mean: 12 },
  Brazil: { k: 'Aw', lat: -15 }, Canada: { k: 'Dfb', lat: 46 }, Chile: { k: 'Csb', lat: -33 },
  Colombia: { k: 'Af', lat: 4 }, 'Costa Rica': { k: 'Am', lat: 10 }, Cuba: { k: 'Aw', lat: 22 },
  'Dominican Republic': { k: 'Aw', lat: 19 }, Ecuador: { k: 'Af', lat: 0 },
  'El Salvador': { k: 'Aw', lat: 14 }, Guatemala: { k: 'Aw', lat: 15, mean: 20 },
  Guyana: { k: 'Af', lat: 6 }, Haiti: { k: 'Aw', lat: 19 }, Honduras: { k: 'Aw', lat: 15 },
  Jamaica: { k: 'Aw', lat: 18 }, Mexico: { k: 'BSh', lat: 23 }, Nicaragua: { k: 'Aw', lat: 13 },
  Panama: { k: 'Am', lat: 9 }, Paraguay: { k: 'Cfa', lat: -25 }, Peru: { k: 'BWh', lat: -12 },
  'Puerto Rico': { k: 'Am', lat: 18 }, Suriname: { k: 'Af', lat: 5 },
  'Trinidad and Tobago': { k: 'Aw', lat: 11 }, 'United States': { k: 'Cfa', lat: 38 },
  Uruguay: { k: 'Cfa', lat: -33 }, Venezuela: { k: 'Aw', lat: 8 },
  // --- ASIA -----------------------------------------------------------------------------------
  Afghanistan: { k: 'BSk', lat: 34, mean: 12 }, Armenia: { k: 'BSk', lat: 40, mean: 9 },
  Azerbaijan: { k: 'BSk', lat: 40, mean: 13 }, Bahrain: { k: 'BWh', lat: 26 },
  Bangladesh: { k: 'Aw', lat: 24 }, Bhutan: { k: 'Cwb', lat: 27, mean: 12 },
  Cambodia: { k: 'Aw', lat: 12 }, China: { k: 'Cfa', lat: 32 }, Georgia: { k: 'Cfa', lat: 42 },
  India: { k: 'Aw', lat: 22 }, Indonesia: { k: 'Af', lat: -2 }, Iran: { k: 'BSk', lat: 33, mean: 15 },
  Iraq: { k: 'BWh', lat: 33 }, Israel: { k: 'Csa', lat: 32 }, Japan: { k: 'Cfa', lat: 36 },
  Jordan: { k: 'BWh', lat: 31 }, Kazakhstan: { k: 'Dfb', lat: 48 }, Kuwait: { k: 'BWh', lat: 29 },
  Kyrgyzstan: { k: 'Dfb', lat: 42, mean: 6 }, Laos: { k: 'Aw', lat: 18 }, Lebanon: { k: 'Csa', lat: 34 },
  Malaysia: { k: 'Af', lat: 3 }, Mongolia: { k: 'BSk', lat: 47, mean: 0 },
  Myanmar: { k: 'Am', lat: 20 }, Nepal: { k: 'Cwa', lat: 28, mean: 15 },
  'North Korea': { k: 'Dwa', lat: 39 }, Oman: { k: 'BWh', lat: 22 }, Pakistan: { k: 'BWh', lat: 29 },
  Philippines: { k: 'Af', lat: 13 }, Qatar: { k: 'BWh', lat: 25 },
  'Saudi Arabia': { k: 'BWh', lat: 24 }, Singapore: { k: 'Af', lat: 1 },
  'South Korea': { k: 'Dwa', lat: 37 }, 'Sri Lanka': { k: 'Af', lat: 7 }, Syria: { k: 'BSh', lat: 34, mean: 17 },
  Taiwan: { k: 'Cfa', lat: 24 }, Tajikistan: { k: 'BSk', lat: 39, mean: 12 },
  Thailand: { k: 'Aw', lat: 14 }, 'Timor-Leste': { k: 'Aw', lat: -9 },
  Turkey: { k: 'Csa', lat: 39 }, Turkmenistan: { k: 'BWk', lat: 39 },
  'United Arab Emirates': { k: 'BWh', lat: 24 }, Uzbekistan: { k: 'BWk', lat: 41 },
  Vietnam: { k: 'Aw', lat: 16 }, Yemen: { k: 'BWh', lat: 15 },
  'Hong Kong': { k: 'Cwa', lat: 22.3, mean: 23 }, Palestine: { k: 'Csa', lat: 31.9 },
  // --- EUROPE ---------------------------------------------------------------------------------
  Albania: { k: 'Csa', lat: 41 }, Austria: { k: 'Dfb', lat: 47 }, Belarus: { k: 'Dfb', lat: 53 },
  Belgium: { k: 'Cfb', lat: 51 }, 'Bosnia and Herzegovina': { k: 'Dfb', lat: 44 },
  Bulgaria: { k: 'Dfa', lat: 43 }, Croatia: { k: 'Cfa', lat: 45 }, Cyprus: { k: 'Csa', lat: 35 },
  'Czech Republic': { k: 'Dfb', lat: 50 }, Denmark: { k: 'Cfb', lat: 56 },
  Estonia: { k: 'Dfb', lat: 59 }, Finland: { k: 'Dfc', lat: 62 }, France: { k: 'Cfb', lat: 47 },
  Germany: { k: 'Cfb', lat: 51 }, Greece: { k: 'Csa', lat: 38 }, Hungary: { k: 'Dfb', lat: 47 },
  Iceland: { k: 'ET', lat: 64, mean: 2 }, Ireland: { k: 'Cfb', lat: 53 }, Italy: { k: 'Csa', lat: 42 },
  Latvia: { k: 'Dfb', lat: 57 }, Lithuania: { k: 'Dfb', lat: 55 }, Luxembourg: { k: 'Cfb', lat: 50 },
  Malta: { k: 'Csa', lat: 36 }, Moldova: { k: 'Dfa', lat: 47 }, Montenegro: { k: 'Cfa', lat: 42 },
  Netherlands: { k: 'Cfb', lat: 52 }, 'North Macedonia': { k: 'Dfa', lat: 42 },
  Norway: { k: 'Dfc', lat: 61, mean: 2 }, Poland: { k: 'Dfb', lat: 52 }, Portugal: { k: 'Csa', lat: 39 },
  Romania: { k: 'Dfa', lat: 45 }, Russia: { k: 'Dfb', lat: 56 }, Serbia: { k: 'Dfa', lat: 44 },
  Slovakia: { k: 'Dfb', lat: 48 }, Slovenia: { k: 'Dfb', lat: 46 }, Spain: { k: 'Csa', lat: 40 },
  Sweden: { k: 'Dfc', lat: 60, mean: 3 }, Switzerland: { k: 'Dfb', lat: 47 },
  Ukraine: { k: 'Dfa', lat: 49 }, 'United Kingdom': { k: 'Cfb', lat: 52 },
  // --- OCEANIA --------------------------------------------------------------------------------
  Australia: { k: 'BSh', lat: -27 }, Fiji: { k: 'Af', lat: -18 },
  'New Zealand': { k: 'Cfb', lat: -41 }, 'Papua New Guinea': { k: 'Af', lat: -6 },
};

// Named cities that are NOT like their country — the whole point of the join.
export const CITY_CLIMATE = {
  // United States — one country, five climates
  'New York': { k: 'Dfa', lat: 40.7 }, Miami: { k: 'Aw', lat: 25.8 }, 'Los Angeles': { k: 'Csb', lat: 34, mean: 17 },
  Chicago: { k: 'Dfa', lat: 41.9 }, Houston: { k: 'Cfa', lat: 29.8 }, Phoenix: { k: 'BWh', lat: 33.4 },
  Seattle: { k: 'Csb', lat: 47.6, mean: 11 }, Denver: { k: 'BSk', lat: 39.7, mean: 10 },
  Anchorage: { k: 'Dfc', lat: 61.2 }, Honolulu: { k: 'Aw', lat: 21.3 },
  'San Francisco': { k: 'Csb', lat: 37.8, mean: 14 }, 'New Orleans': { k: 'Cfa', lat: 30 },
  'Las Vegas': { k: 'BWh', lat: 36.2, mean: 20 }, Boston: { k: 'Dfa', lat: 42.4 },
  Minneapolis: { k: 'Dfa', lat: 45, mean: 7 }, Atlanta: { k: 'Cfa', lat: 33.7 }, Detroit: { k: 'Dfa', lat: 42.3 },
  // China — Harbin freezes, Guangzhou never does, Lhasa is the roof of the world
  Beijing: { k: 'Dwa', lat: 39.9 }, Shanghai: { k: 'Cfa', lat: 31.2 }, Guangzhou: { k: 'Cfa', lat: 23.1, mean: 22 },
  Harbin: { k: 'Dwb', lat: 45.8 }, Urumqi: { k: 'BWk', lat: 43.8, mean: 7 }, Lhasa: { k: 'H', lat: 29.7, mean: 8 },
  Kunming: { k: 'Cwb', lat: 25, mean: 15 }, 'Hong Kong': { k: 'Cwa', lat: 22.3, mean: 23 },
  // Russia — the widest spread on Earth
  Moscow: { k: 'Dfb', lat: 55.8 }, 'Saint Petersburg': { k: 'Dfb', lat: 59.9 },
  Novosibirsk: { k: 'Dfb', lat: 55, mean: 1.5 }, Vladivostok: { k: 'Dwb', lat: 43.1, mean: 5 },
  Yakutsk: { k: 'Dfc', lat: 62, mean: -8.5 }, Sochi: { k: 'Cfa', lat: 43.6 }, Murmansk: { k: 'Dfc', lat: 69 },
  // Brazil
  Manaus: { k: 'Af', lat: -3.1 }, 'Rio de Janeiro': { k: 'Aw', lat: -22.9, mean: 24 },
  'Sao Paulo': { k: 'Cfa', lat: -23.5, mean: 19 }, 'Porto Alegre': { k: 'Cfa', lat: -30 },
  Recife: { k: 'Am', lat: -8 }, Brasilia: { k: 'Aw', lat: -15.8, mean: 21 },
  // Australia
  Sydney: { k: 'Cfa', lat: -33.9, mean: 18 }, Melbourne: { k: 'Cfb', lat: -37.8, mean: 15 },
  Perth: { k: 'Csa', lat: -32 }, Darwin: { k: 'Aw', lat: -12.5 }, Brisbane: { k: 'Cfa', lat: -27.5, mean: 20 },
  Hobart: { k: 'Cfb', lat: -42.9, mean: 12 }, 'Alice Springs': { k: 'BWh', lat: -23.7, mean: 21 },
  // Canada
  Toronto: { k: 'Dfa', lat: 43.7, mean: 8 }, Vancouver: { k: 'Cfb', lat: 49.3, mean: 10 },
  Montreal: { k: 'Dfb', lat: 45.5, mean: 6 }, Calgary: { k: 'Dfb', lat: 51, mean: 4 },
  Yellowknife: { k: 'Dfc', lat: 62.5, mean: -4 },
  // India
  Mumbai: { k: 'Am', lat: 19.1 }, Delhi: { k: 'Cwa', lat: 28.6, mean: 24 }, Chennai: { k: 'Aw', lat: 13.1 },
  Kolkata: { k: 'Aw', lat: 22.6 }, Bangalore: { k: 'Aw', lat: 13, mean: 24 }, Shimla: { k: 'Cwb', lat: 31.1, mean: 13 },
  // South America / altitude
  'Buenos Aires': { k: 'Cfa', lat: -34.6 }, Ushuaia: { k: 'ET', lat: -54.8, mean: 5.5 },
  Mendoza: { k: 'BWk', lat: -32.9, mean: 16 }, Santiago: { k: 'Csb', lat: -33.5, mean: 15 },
  'Punta Arenas': { k: 'ET', lat: -53.2, mean: 6.5 }, Antofagasta: { k: 'BWk', lat: -23.7, mean: 17 },
  'La Paz': { k: 'H', lat: -16.5, mean: 8 }, Quito: { k: 'H', lat: -0.2, mean: 14 },
  Bogota: { k: 'H', lat: 4.7, mean: 14 }, Cusco: { k: 'H', lat: -13.5, mean: 12 },
  'Mexico City': { k: 'Cwb', lat: 19.4, mean: 16 },
  // Africa / Middle East / highland
  'Addis Ababa': { k: 'Cwb', lat: 9, mean: 16 }, Nairobi: { k: 'H', lat: -1.3, mean: 19 },
  'Cape Town': { k: 'Csb', lat: -33.9, mean: 17 }, Johannesburg: { k: 'Cwb', lat: -26.2, mean: 16 },
  Durban: { k: 'Cfa', lat: -29.9, mean: 21 }, Kampala: { k: 'Aw', lat: 0.3, mean: 22 },
  Kabul: { k: 'BSk', lat: 34.5, mean: 12 }, Riyadh: { k: 'BWh', lat: 24.7 }, Jeddah: { k: 'BWh', lat: 21.5, mean: 28 },
  Istanbul: { k: 'Cfa', lat: 41, mean: 14 }, Ankara: { k: 'BSk', lat: 39.9, mean: 12 },
  Cairo: { k: 'BWh', lat: 30, mean: 22 },
  // East Asia edges
  Sapporo: { k: 'Dfb', lat: 43.1, mean: 9 }, Okinawa: { k: 'Cfa', lat: 26.2, mean: 23 },
  Naha: { k: 'Cfa', lat: 26.2, mean: 23 }, Ulaanbaatar: { k: 'BSk', lat: 47.9, mean: 0 },
  // Europe edges
  Oslo: { k: 'Dfb', lat: 59.9, mean: 6 }, Hell: { k: 'Dfc', lat: 63.4, mean: 5 },
  Reykjavik: { k: 'ET', lat: 64.1, mean: 5 }, Lisbon: { k: 'Csa', lat: 38.7, mean: 17 },
};

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// mean + amp·cos over the year; the hottest month is July north of the equator, January south.
export function monthlyTemps(kop, lat, meanOverride) {
  const z = ZONES[kop] || ZONES.Cfb;
  const mean = meanOverride != null ? meanOverride : z.mean;
  const amp = z.amp0 + Math.abs(lat) * z.ampK;
  const hot = lat >= 0 ? 6.6 : 0.6;
  const t = [];
  for (let m = 0; m < 12; m++) {
    let d = Math.abs(m + 0.5 - hot); if (d > 6) d = 12 - d;
    t.push(Math.round((mean + amp * Math.cos((d / 6) * Math.PI)) * 10) / 10);
  }
  return t;
}

const NO_SNOW = { BWh: 1, BSh: 1 };                     // hot-arid: too dry even when a night dips

export function climateOf(city) {
  const o = (city && CITY_CLIMATE[city.name]) || (city && COUNTRY_CLIMATE[city.country]) || { k: 'Cfb', lat: 30 };
  const z = ZONES[o.k] || ZONES.Cfb;
  const t = monthlyTemps(o.k, o.lat, o.mean);
  const snowMonths = NO_SNOW[o.k] ? [] : t.map((v, i) => (v < 1.5 ? i : -1)).filter((i) => i >= 0);
  return { koppen: o.k, label: z.label, lat: o.lat, t, precip: z.wet, snowMonths };
}

// "Cfa · JAN −1° · JUL 29° · SNOW DEC–MAR" — the atlas card line. Handles the wrap-around range.
export function climateLine(cl) {
  let snow = '';
  const sm = cl.snowMonths;
  if (sm.length === 12) snow = ' · SNOW ALL YEAR';
  else if (sm.length) {
    const set = new Set(sm);
    let start = sm.find((m) => !set.has((m + 11) % 12));
    if (start === undefined) start = sm[0];
    const end = (start + sm.length - 1) % 12;
    const contiguous = sm.every((m) => { const d = (m - start + 12) % 12; return d < sm.length; });
    snow = contiguous ? ` · SNOW ${MONTHS[start]}–${MONTHS[end]}` : ` · SNOW ${sm.length} MO`;
  }
  return `${cl.koppen} ${cl.label.toUpperCase()} · JAN ${Math.round(cl.t[0])}° · JUL ${Math.round(cl.t[6])}°${snow}`;
}
