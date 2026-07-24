// THRESHOLD — LANDMARKS: the special structures a city is KNOWN for.
//
// THE PROBLEM. Stadiums, airports and rail yards were placed by fixed rows in the PLACEMENT table:
// every city big enough got one of each, in roughly the same spot, with no name. That makes them
// furniture. A landmark is the opposite of furniture — it is the thing you say when someone asks
// where the fight was.
//
// THE DESIGN, in four parts:
//
//   1. A landmark is TYPED, NAMED and UNIQUE. The type is what it is; the name is generated from
//      the city, so KMK 9 can report "the fighting has reached THE SPIRE OF TOKYO" and the codex
//      can cite it. No two landmarks in one city share a type.
//
//   2. Every city has a BUDGET derived from its own row of the sheet — population tier, how many
//      specialisations it has, its rating, whether it is flagged high-value. Derived, not rolled,
//      so it is stable and explicable: a hamlet gets none, a mega city gets four or five.
//
//   3. Candidates are drawn from a WEIGHTED POOL filtered by what the city actually is. A capital
//      is eligible for a palace and a triumphal monument; a university town for a great library; a
//      shrine city for a cathedral or a grand mosque. `needs` gates it, `weight` ranks it, the seed
//      breaks ties — so the same city always produces the same landmarks.
//
//   4. The ARCHITECTURAL REGION picks the FORM. The same "great religious building" slot builds a
//      gothic cathedral in West Europe, a domed mosque in the Middle East, and a pagoda in East
//      Asia. One slot, fourteen answers — this is what stops every city's landmark looking alike.
//
// Placement itself is not special-cased: a landmark becomes a row handed to the normal placement
// machinery, so footprints, scoring and the density budget all behave exactly as they do for
// anything else. It is only the CHOOSING and the NAMING that live here.

// ---- THE POOL ---------------------------------------------------------------------------------
//   t        the tile that builds it              needs   city types that qualify it (any-of)
//   weight   how strongly it wants to exist       minPop  smallest population tier (see POP_TIER)
//   foot     footprint in cells                   score   where it wants to sit (placement terms)
//   solo     only one of these per city (all landmarks are solo by type; this is documentation)
export const LANDMARK_POOL = [
  { t: 'monument',   weight: 9,  minPop: 2, score: { center: 3 },
    needs: null,                                   // every city of any size can raise a monument
    why: 'the square everyone meets at' },
  { t: 'tower',      weight: 8,  minPop: 4, score: { center: 2.5 },
    needs: ['company', 'political'],
    why: 'the spire you navigate by' },
  { t: 'cathedral',  weight: 8,  minPop: 3, score: { ring: 1.5, center: 1 },
    needs: ['temple', 'political'],
    why: 'the great religious building' },
  { t: 'palace',     weight: 7,  minPop: 3, foot: [1, 2], score: { center: 3 },
    needs: ['political'],
    why: 'the seat of power' },
  { t: 'fortress',   weight: 6,  minPop: 3, foot: [2, 2], score: { rim: 2, water: 1 },
    needs: ['military'],
    why: 'the old citadel the city grew around' },
  { t: 'university', weight: 6,  minPop: 3, foot: [1, 2], score: { ring: 2 },
    needs: ['educational'],
    why: 'the great library and its quad' },
  { t: 'stadium',    weight: 5,  minPop: 4, foot: [2, 2], score: { rim: 1.5 },
    needs: null,
    why: 'the bowl' },
  { t: 'airport',    weight: 5,  minPop: 6, foot: [2, 3], score: { rim: 4, water: -2 },
    needs: null,
    why: 'the international field' },
  { t: 'railyard',   weight: 4,  minPop: 4, foot: [1, 3], score: { rim: 2 },
    needs: ['industrial', 'company'],
    why: 'the yards' },
  { t: 'seaport',    weight: 4,  minPop: 4, foot: [2, 1], score: { water: 5 },
    needs: ['seaport'],
    why: 'the deep-water terminal' },
  { t: 'funfair',    weight: 6,  minPop: 4, foot: [2, 2], score: { water: 2, south: 1 },
    needs: ['resort'],
    why: 'the wonder wheel' },
];

// The population ladder. Lives here because cityplan imports THIS file, so it cannot go the
// other way round; cityplan re-exports it for the tool.
export const POP_TIER = { 'Village': 1, 'Small Town': 2, 'Town': 3, 'Small City': 4, 'City': 5, 'Large City': 6, 'Mega City': 7 };

// How many landmarks this city earns. Derived from the sheet so it can be explained, never rolled.
export function landmarkBudget(city, popType) {
  const tier = POP_TIER[popType || city.popType] || 5;
  let n = tier <= 2 ? 0 : tier <= 3 ? 1 : tier <= 5 ? 2 : tier === 6 ? 3 : 4;
  if ((city.types || []).length >= 3) n++;            // a city famous for several things shows it
  if (city.popRating >= 7) n++;                       // the sheet's own importance rating
  if (city.hvt) n++;                                  // flagged high-value target
  return Math.max(0, Math.min(5, n));
}

// Which landmarks this city gets. Deterministic for (city, seed): same row, same map, forever.
export function pickLandmarks(city, popType, rng, N) {
  const tier = POP_TIER[popType || city.popType] || 5;
  const budget = landmarkBudget(city, popType);
  if (!budget) return [];
  const types = (city.types || []).map(t => t.toLowerCase());
  const scored = [];
  for (const L of LANDMARK_POOL) {
    if (tier < L.minPop) continue;
    const [fh, fw] = L.foot || [1, 1];
    if (fh > N || fw > N) continue;                   // it has to physically fit on this grid
    const match = !L.needs ? 0.6 : (L.needs.some(t => types.includes(t)) ? 1.6 : 0);
    if (!match) continue;
    // ⚠ a landmark takes the BIGGEST size it has earned — it is the thing the city is known for,
    // so it must not roll a small one. `foot` here is only a floor; the planner's size ladder
    // decides the rest (and steps down if the grid genuinely has no room).
    scored.push({ ...L, big: true, s: L.weight * match + rng() * 3 });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, budget);
}

// ---- NAMING -----------------------------------------------------------------------------------
// A landmark without a name is scenery. These read as places, and the region decides the FORM the
// name takes as well as the building: you do not put a cathedral in Mazar-e Sharif.
const REGION_FAITH = {
  meast: 'mosque', nafrica: 'mosque', casia: 'mosque', sasia: 'temple',
  easia: 'pagoda', weurope: 'cathedral', eeurope: 'cathedral', namerica: 'cathedral',
  samerica: 'cathedral', camerica: 'cathedral', carib: 'cathedral',
  cafrica: 'cathedral', safrica: 'cathedral', oceania: 'cathedral', default: 'cathedral',
};
const FAITH_NAMES = {
  mosque:    ['THE GRAND MOSQUE OF {C}', 'THE {C} JAMI', 'THE BLUE MOSQUE'],
  pagoda:    ['THE {C} PAGODA', 'THE TEMPLE OF NINE TIERS', 'THE {C} SHRINE'],
  temple:    ['THE {C} MANDIR', 'THE GREAT TEMPLE OF {C}', 'THE {C} SHRINE'],
  cathedral: ['{C} CATHEDRAL', 'THE CATHEDRAL OF {C}', 'THE OLD BASILICA'],
};
const NAMES = {
  monument:   ['THE {C} ARCH', 'THE COLUMN OF {C}', 'THE {C} MEMORIAL', 'THE OBELISK', 'LIBERATION SQUARE'],
  tower:      ['{C} TOWER', 'THE {C} SPIRE', 'THE NEEDLE', 'THE {C} BEACON'],
  palace:     ['THE {C} PALACE', 'THE PRESIDENTIAL PALACE', 'THE OLD RESIDENCY', 'THE STATE HOUSE'],
  fortress:   ['THE {C} CITADEL', 'FORT {C}', 'THE OLD KEEP', 'THE RAMPARTS'],
  university: ['THE UNIVERSITY OF {C}', '{C} COLLEGE', 'THE GREAT LIBRARY', 'THE {C} INSTITUTE'],
  stadium:    ['{C} STADIUM', 'THE {C} BOWL', 'THE GRAND ARENA', 'THE COLISEUM'],
  airport:    ['{C} INTERNATIONAL', '{C} AIRFIELD', 'THE {C} AERODROME'],
  railyard:   ['THE {C} YARDS', 'CENTRAL DEPOT', 'THE MARSHALLING YARDS'],
  seaport:    ['THE PORT OF {C}', '{C} DEEP WATER', 'THE CONTAINER TERMINAL'],
  funfair:    ['THE {C} WONDER WHEEL', 'THE {C} PIER', 'THE {C} FUNFAIR', 'LUNA PARK'],
  cathedral:  null,                                   // filled from the region's faith, above
};
export function nameLandmark(t, city, region, rng) {
  const C = (city.name || 'THE CITY').toUpperCase();
  let pool = NAMES[t];
  if (t === 'cathedral') pool = FAITH_NAMES[REGION_FAITH[(region && region.key) || 'default'] || 'cathedral'];
  if (!pool || !pool.length) return C + ' LANDMARK';
  return pool[(rng() * pool.length) | 0].replace('{C}', C);
}
// Which FORM a great religious building takes here — the tile builder reads this, so one slot
// produces a gothic cathedral, a domed mosque or a tiered pagoda from the same placement row.
export const faithOf = (region) => REGION_FAITH[(region && region.key) || 'default'] || 'cathedral';
