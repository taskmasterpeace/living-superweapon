// THE SOLAR SYSTEM — the planets as DATA, exactly like the cities (manual §17).
// Real distances in AU (and km, for the map's honest labels). A LANDABLE world carries a
// `settlement` row shaped like a city-sheet row: the SAME planner that raises Miami raises
// Ares Landing — the difference is environmental data, never a second map architecture.
// No-surface worlds say WHY they refuse (a grayed row with a reason beats a control that lies).

export const AU_KM = 149597870.7;

export const PLANETS = [
  { id: 'mercury', name: 'Mercury', au: 0.39, kind: 'rocky',
    landable: false, reason: 'NO SETTLEMENT — 430°C days, −180°C nights' },
  { id: 'venus', name: 'Venus', au: 0.72, kind: 'rocky',
    landable: false, reason: 'NO LANDING — the surface melts lead' },
  { id: 'earth', name: 'Earth', au: 1.0, kind: 'home',
    landable: true, home: true },
  { id: 'moon', name: 'The Moon', au: 1.0026, kind: 'moon',
    landable: true,
    settlement: { name: 'TRANQUILITY REACH', popType: 'Small Town', pop: 8200, popLabel: '8.2K',
      types: ['Mining', 'Military'], crime: 8, safety: 88, relief: 'flat', biome: 'tundra' } },
  { id: 'mars', name: 'Mars', au: 1.52, kind: 'rocky',
    landable: true,
    settlement: { name: 'ARES LANDING', popType: 'Town', pop: 31000, popLabel: '31K',
      types: ['Mining', 'Corporate'], crime: 24, safety: 71, relief: 'plateau', biome: 'desert' } },
  { id: 'jupiter', name: 'Jupiter', au: 5.2, kind: 'gas',
    landable: false, reason: 'NO SURFACE — a gas giant has no ground to stand on' },
  { id: 'saturn', name: 'Saturn', au: 9.58, kind: 'gas',
    landable: false, reason: 'NO SURFACE — rings, storms, nowhere to land' },
  { id: 'uranus', name: 'Uranus', au: 19.2, kind: 'ice',
    landable: false, reason: 'NO SURFACE — an ice giant swallows what lands' },
  { id: 'neptune', name: 'Neptune', au: 30.1, kind: 'ice',
    landable: false, reason: 'NO SURFACE — 2,000 km/h winds all the way down' },
  { id: 'pluto', name: 'Pluto', au: 39.5, kind: 'dwarf',
    landable: true,
    settlement: { name: 'PERIMETER STATION', popType: 'Village', pop: 340, popLabel: '340',
      types: ['Military'], crime: 2, safety: 96, relief: 'mountains', biome: 'tundra' } },
];

// The edge of the sun's weather, and the honest numbers act three of the crossing uses.
export const HELIOPAUSE_AU = 123;          // Voyager 1 crossed at ~121.6 AU in 2012
export const TERMINATION_SHOCK_AU = 94;
export const SCALE_LADDER = [              // powers of ten, each an act-three zoom step
  { au: 100, label: '100 AU', note: 'the heliopause — the solar wind stops' },
  { au: 1000, label: '1,000 AU', note: 'the inner Oort cloud begins near 2,000 AU' },
  { au: 10000, label: '10,000 AU', note: 'THE OORT CLOUD — a trillion sleeping comets' },
  { au: 100000, label: '100,000 AU', note: '1.6 light-years — the sun’s gravity finally lets go' },
  { au: 300000, label: '4.4 LIGHT-YEARS', note: 'PROXIMA & ALPHA CENTAURI — the nearest fires' },
];
export const NEAR_STARS = [                // honest neighbours for the final frame (ly)
  { name: 'PROXIMA CENTAURI', ly: 4.25, a: 0.6 },
  { name: 'ALPHA CENTAURI A+B', ly: 4.37, a: 0.7 },
  { name: "BARNARD'S STAR", ly: 5.96, a: 2.4 },
  { name: 'SIRIUS', ly: 8.6, a: 4.1 },
];

export function transitSecsFor(p) {        // distance over an open throttle, game-honest
  return Math.max(5, Math.min(14, 4 + Math.log10((p.au || 1) + 1) * 6.5));
}
