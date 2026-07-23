// THRESHOLD — GEOGRAPHY: what the land under a city is actually like.
//
// The world sheet says who lives here, how dangerous it is, and what the city is famous for. It
// says nothing about the GROUND — and the ground is half of a fight. Every map was a table.
//
// ⚠ THIS FILE IS AUTHORED DATA, not derived. Robert's sheet has no terrain column and no
// coordinates, so there is nothing to derive it FROM: the sector reference is blank on half the
// rows and encodes a grid square, not a landform. Rather than rewrite 1,050 rows of his sheet with
// values he did not enter, terrain lives here and is JOINED on at load — the same pattern the
// roster uses for civilian identities. His CSV stays his; this stays reviewable and diffable.
//
//   relief  what the heightfield does      flat · hills · valley · plateau · coastal · mountains
//   biome   what grows on it               grass · forest · jungle · desert · mountain · tundra
//
// Resolution order, most specific first:
//   1. CITY_GEO   — a named city that is famously not like its country (Denver, Manaus, La Paz)
//   2. COUNTRY_GEO — the country's dominant landform
//   3. REGION_GEO  — fallback by architectural region, so an unlisted country is never wrong-looking
// A city on the coast (the plan has water) softens `mountains` to `coastal` in the planner, so a
// seaport in Norway still meets the sea.

export const COUNTRY_GEO = {
  // --- AFRICA ---------------------------------------------------------------------------------
  Algeria: ['plateau', 'desert'], Angola: ['plateau', 'grass'], Benin: ['flat', 'grass'],
  'Burkina Faso': ['flat', 'desert'], Burundi: ['hills', 'forest'], Cameroon: ['hills', 'jungle'],
  'Central African Republic': ['hills', 'jungle'], Chad: ['flat', 'desert'],
  'DR Congo': ['hills', 'jungle'], Djibouti: ['hills', 'desert'], Egypt: ['flat', 'desert'],
  Eritrea: ['mountains', 'desert'], Ethiopia: ['mountains', 'grass'], Gabon: ['hills', 'jungle'],
  Ghana: ['flat', 'forest'], Guinea: ['hills', 'jungle'], 'Guinea-Bissau': ['coastal', 'jungle'],
  'Ivory Coast': ['flat', 'jungle'], Kenya: ['plateau', 'grass'], Liberia: ['hills', 'jungle'],
  Libya: ['flat', 'desert'], Madagascar: ['mountains', 'jungle'], Malawi: ['hills', 'grass'],
  Mali: ['flat', 'desert'], Mauritania: ['flat', 'desert'], Morocco: ['mountains', 'desert'],
  Mozambique: ['coastal', 'grass'], Niger: ['flat', 'desert'], Nigeria: ['flat', 'grass'],
  'Republic of the Congo': ['hills', 'jungle'], Rwanda: ['mountains', 'forest'],
  Senegal: ['flat', 'grass'], 'Sierra Leone': ['hills', 'jungle'], Somalia: ['plateau', 'desert'],
  'South Africa': ['plateau', 'grass'], Sudan: ['flat', 'desert'], Tanzania: ['plateau', 'grass'],
  Togo: ['hills', 'forest'], Tunisia: ['hills', 'desert'], Uganda: ['plateau', 'forest'],
  Zambia: ['plateau', 'grass'], Zimbabwe: ['plateau', 'grass'],
  // --- THE AMERICAS ---------------------------------------------------------------------------
  Argentina: ['flat', 'grass'], Bolivia: ['mountains', 'mountain'], Brazil: ['hills', 'jungle'],
  Canada: ['hills', 'forest'], Chile: ['mountains', 'mountain'], Colombia: ['mountains', 'jungle'],
  'Costa Rica': ['mountains', 'jungle'], Cuba: ['hills', 'jungle'],
  'Dominican Republic': ['mountains', 'jungle'], Ecuador: ['mountains', 'jungle'],
  'El Salvador': ['mountains', 'forest'], Guatemala: ['mountains', 'jungle'], Haiti: ['mountains', 'forest'],
  Honduras: ['mountains', 'jungle'], Jamaica: ['mountains', 'jungle'], Mexico: ['plateau', 'desert'],
  Nicaragua: ['hills', 'jungle'], Panama: ['hills', 'jungle'], Paraguay: ['flat', 'grass'],
  Peru: ['mountains', 'mountain'], 'Puerto Rico': ['mountains', 'jungle'],
  'Trinidad and Tobago': ['hills', 'jungle'], 'United States': ['hills', 'forest'],
  Uruguay: ['flat', 'grass'], Venezuela: ['hills', 'jungle'],
  // --- ASIA -----------------------------------------------------------------------------------
  Afghanistan: ['mountains', 'mountain'], Armenia: ['mountains', 'mountain'],
  Azerbaijan: ['hills', 'grass'], Bahrain: ['flat', 'desert'], Bangladesh: ['flat', 'jungle'],
  Cambodia: ['flat', 'jungle'], China: ['hills', 'forest'], 'Hong Kong': ['mountains', 'jungle'],
  India: ['flat', 'grass'], Indonesia: ['mountains', 'jungle'], Iran: ['mountains', 'desert'],
  Iraq: ['flat', 'desert'], Israel: ['hills', 'desert'], Japan: ['mountains', 'forest'],
  Jordan: ['plateau', 'desert'], Kazakhstan: ['flat', 'grass'], Kuwait: ['flat', 'desert'],
  Kyrgyzstan: ['mountains', 'mountain'], Laos: ['mountains', 'jungle'], Lebanon: ['mountains', 'forest'],
  Malaysia: ['hills', 'jungle'], Mongolia: ['plateau', 'grass'], Myanmar: ['hills', 'jungle'],
  Nepal: ['mountains', 'mountain'], 'North Korea': ['mountains', 'forest'], Oman: ['mountains', 'desert'],
  Pakistan: ['mountains', 'desert'], Palestine: ['hills', 'desert'], Philippines: ['mountains', 'jungle'],
  Qatar: ['flat', 'desert'], 'Saudi Arabia': ['plateau', 'desert'], Singapore: ['flat', 'jungle'],
  'South Korea': ['mountains', 'forest'], 'Sri Lanka': ['hills', 'jungle'], Syria: ['plateau', 'desert'],
  Taiwan: ['mountains', 'jungle'], Tajikistan: ['mountains', 'mountain'], Thailand: ['flat', 'jungle'],
  Turkey: ['mountains', 'grass'], Turkmenistan: ['flat', 'desert'],
  'United Arab Emirates': ['flat', 'desert'], Uzbekistan: ['flat', 'desert'],
  Vietnam: ['hills', 'jungle'], Yemen: ['mountains', 'desert'], Georgia: ['mountains', 'forest'],
  // --- EUROPE ---------------------------------------------------------------------------------
  Austria: ['mountains', 'forest'], Belarus: ['flat', 'forest'], Belgium: ['flat', 'forest'],
  Bulgaria: ['mountains', 'forest'], Croatia: ['mountains', 'forest'], 'Czech Republic': ['hills', 'forest'],
  Denmark: ['flat', 'grass'], Finland: ['flat', 'forest'], France: ['hills', 'forest'],
  Germany: ['hills', 'forest'], Greece: ['mountains', 'grass'], Hungary: ['flat', 'grass'],
  Ireland: ['hills', 'grass'], Italy: ['mountains', 'forest'], Latvia: ['flat', 'forest'],
  Lithuania: ['flat', 'forest'], Netherlands: ['flat', 'grass'], Norway: ['mountains', 'forest'],
  Poland: ['flat', 'forest'], Portugal: ['hills', 'forest'], Romania: ['mountains', 'forest'],
  Russia: ['flat', 'forest'], Serbia: ['hills', 'forest'], Spain: ['plateau', 'grass'],
  Sweden: ['hills', 'forest'], Switzerland: ['mountains', 'mountain'], Ukraine: ['flat', 'grass'],
  'United Kingdom': ['hills', 'grass'],
  // --- OCEANIA --------------------------------------------------------------------------------
  Australia: ['flat', 'desert'], 'New Zealand': ['mountains', 'forest'],
};

// Cities that are famously NOT like the rest of their country. This list is short on purpose — it
// is for places where getting it wrong would be obviously wrong, not an attempt at a gazetteer.
export const CITY_GEO = {
  'Denver': ['mountains', 'mountain'],        'Salt Lake City': ['mountains', 'mountain'],
  'Phoenix': ['flat', 'desert'],              'Las Vegas': ['flat', 'desert'],
  'Tucson': ['hills', 'desert'],              'Albuquerque': ['plateau', 'desert'],
  'Seattle': ['hills', 'forest'],             'San Francisco': ['hills', 'grass'],
  'Miami': ['flat', 'jungle'],                'New Orleans': ['flat', 'grass'],
  'Anchorage': ['mountains', 'tundra'],       'Honolulu': ['mountains', 'jungle'],
  'Manaus': ['flat', 'jungle'],               'Rio de Janeiro': ['mountains', 'jungle'],
  'La Paz': ['mountains', 'mountain'],        'Quito': ['mountains', 'mountain'],
  'Bogota': ['plateau', 'mountain'],          'Cusco': ['mountains', 'mountain'],
  'Cape Town': ['mountains', 'grass'],        'Nairobi': ['plateau', 'grass'],
  'Cairo': ['flat', 'desert'],                'Alexandria': ['coastal', 'desert'],
  'Marrakesh': ['flat', 'desert'],            'Casablanca': ['coastal', 'grass'],
  'Kathmandu': ['mountains', 'mountain'],     'Lhasa': ['mountains', 'mountain'],
  'Kabul': ['mountains', 'mountain'],         'Tehran': ['mountains', 'desert'],
  'Sarajevo': ['mountains', 'forest'],        'Innsbruck': ['mountains', 'mountain'],
  'Bergen': ['mountains', 'forest'],          'Reykjavik': ['hills', 'tundra'],
  'Vancouver': ['mountains', 'forest'],       'Calgary': ['plateau', 'grass'],
  'Chongqing': ['mountains', 'forest'],       'Hong Kong': ['mountains', 'jungle'],
  'Wellington': ['mountains', 'grass'],       'Queenstown': ['mountains', 'mountain'],
  'Ushuaia': ['mountains', 'tundra'],         'Murmansk': ['hills', 'tundra'],
};

// Last resort, by architectural region — an unlisted country still gets something plausible
// rather than a table with grass on it.
const REGION_GEO = {
  1: ['flat', 'desert'], 2: ['hills', 'jungle'], 3: ['plateau', 'grass'], 4: ['mountains', 'mountain'],
  5: ['flat', 'grass'], 6: ['hills', 'forest'], 7: ['hills', 'jungle'], 8: ['mountains', 'jungle'],
  9: ['hills', 'forest'], 10: ['flat', 'forest'], 11: ['hills', 'grass'], 12: ['mountains', 'jungle'],
  13: ['hills', 'forest'], 14: ['plateau', 'desert'], 0: ['hills', 'grass'],
};

// The join. Returns { terrain, biome } for a city row — never null, never guesses silently.
export function geoOf(city) {
  const hit = (city && CITY_GEO[city.name]) || (city && COUNTRY_GEO[city.country])
           || REGION_GEO[(city && city.cultureCode) || 0] || REGION_GEO[0];
  return { terrain: hit[0], biome: hit[1] };
}
