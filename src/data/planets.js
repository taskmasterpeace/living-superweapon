// THE SOLAR SYSTEM — the planets as DATA, exactly like the cities (manual §17).
// Real distances in AU (and km, for the map's honest labels). A LANDABLE world carries a
// `settlement` row shaped like a city-sheet row: the SAME planner that raises Miami raises
// Ares Landing — the difference is environmental data, never a second map architecture.
// No-surface worlds say WHY they refuse (a grayed row with a reason beats a control that lies).

import { separationAU, positionAt, gameDate, dateStr, moonsOf, moonDistanceInRadii } from './orbits.js';

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


// =================================================================================================
// THE LOOK — how each world is painted, so a flyby is in the SAME art style as the street below.
//
// Robert: "space earth view should fit our art style… keep the same art style and scale."
// Flat-shaded low-poly, a warm-neutral palette and one accent, exactly like the city. So every
// world here is a FEW FLAT COLOURS and a band count — no photographs, no gradients, no normal maps.
// `atmo` is the shell colour (and what an entry burns); `bands` paints latitude stripes on the gas
// and ice giants; `ring` is drawn as flat concentric discs, which is the only honest way to do a
// ring in a style with no transparency tricks.
// ⚠ NO PURPLE, including here: Neptune and Uranus go to deep teal and ice-blue, never violet.
export const PLANET_LOOK = {
  mercury: { base: '#8b8577', bands: ['#9a927f', '#6f6a5e'], atmo: null,      r: 0.38 },
  venus:   { base: '#e0c489', bands: ['#f0d9a6', '#c9a86a'], atmo: '#ffe6b0', r: 0.95 },
  earth:   { base: '#3f7a56', bands: ['#2f5f86', '#4d8a5f'], atmo: '#7fc4ff', r: 1.0, night: true, sea: '#2f5f86', land: '#4d8a5f', ice: '#eaf2ff' },
  moon:    { base: '#a8a49b', bands: ['#b8b4aa', '#8b8577'], atmo: null,      r: 0.27 },
  mars:    { base: '#b4532f', bands: ['#c96a3a', '#8e3f24'], atmo: '#e08a5a', r: 0.53, night: true, ice: '#f2efe6' },
  jupiter: { base: '#c9a06a', bands: ['#e0c08a', '#a87a4a', '#d8b07a', '#8e6238'], atmo: '#f0d8a8', r: 11.2, spot: '#c9482f' },
  saturn:  { base: '#d8c08a', bands: ['#e8d4a2', '#bfa06a'], atmo: '#f0e0b0', r: 9.4, ring: ['#cfc3a0', '#9a8f7c', '#e0d6b8'] },
  uranus:  { base: '#7fc4c4', bands: ['#96d4d2', '#5f9fa4'], atmo: '#aee4e4', r: 4.0, tilt: 1.7 },
  neptune: { base: '#2f6f96', bands: ['#3f86ac', '#245a7c'], atmo: '#7fb8d8', r: 3.9 },
  pluto:   { base: '#b8ab96', bands: ['#c9bda8', '#8e8272'], atmo: null,      r: 0.19 },
  sun:     { base: '#ffd24a', bands: ['#ffe9a0', '#ff9a2a'], atmo: '#ffb03a', r: 109, star: true },
};

export const lookOf = (id) => PLANET_LOOK[id] || PLANET_LOOK.mercury;

// =================================================================================================
// THE ROUTE — what a journey actually passes, computed from the real AU ladder.
//
// A crossing from Earth to Pluto goes BY Mars, Jupiter, Saturn, Uranus and Neptune, and the
// cinematic should say so. This is the only place that decides it, so the flyby beats, the map's
// route line and any future in-flight event all read the same list.
//
//   from / to  — planet ids (or {au} for an arbitrary point, e.g. the heliopause)
//   returns    — { from, to, legs, outbound, passes[], au, deep }
//   passes[]   — every body the route sweeps past, in order, each with the fraction of the trip
//                at which it happens, so a director can key a beat to t.
//
// ⚠ It is a RADIAL model, not an orbital one: bodies are treated as sitting at their mean radius
// on one line out from the sun. That is a deliberate simplification and it is written down rather
// than hidden — real ephemerides would make a Mars flyby depend on the date, which is a promise
// this game has no reason to keep. What it DOES get right is the ORDER and the SPACING, which is
// everything the cinematic is trying to say.
export function buildRoute(fromId, toId, opts = {}) {
  const byId = (id) => PLANETS.find(p => p.id === id);
  const a = byId(fromId) || byId('earth');
  // ⚠ AN ARBITRARY POINT IS NOT A DESTINATION YOU CAN LAND ON. `{au: 123}` means "out to the
  // heliopause", and without an id it fell through as an ordinary target — so a crossing into
  // empty space was handed an ATMOSPHERIC ENTRY beat for a world that isn't there.
  let b = typeof toId === 'object' ? toId : byId(toId);
  if (b && b.id == null) b = { id: 'deep', name: b.name || 'THE DARK', au: b.au, kind: 'void', landable: false };
  const auA = a.au, auB = (b && b.au) != null ? b.au : (opts.au || HELIOPAUSE_AU);
  // ⚠ THE TRIP IS A DIFFERENT LENGTH IN APRIL THAN IN OCTOBER, and that is the whole point of
  // having orbits at all. `au` used to be |a.au − b.au| — the difference of two orbital RADII,
  // which is the distance only on the day the two worlds happen to be lined up on the same side of
  // the sun. The real separation is the chord between where they actually are today: Earth→Mars
  // ranges from 0.52 AU to 2.51 AU across a single year, nearly a five-fold swing.
  const date = opts.date || gameDate();
  const outbound = auB >= auA;
  const lo = Math.min(auA, auB), hi = Math.max(auA, auB);
  const span = Math.max(1e-6, hi - lo);
  const passes = [];
  for (const p of PLANETS) {
    if (p.id === a.id || (b && p.id === b.id)) continue;
    if (p.au < lo - 1e-9 || p.au > hi + 1e-9) continue;
    const t = (p.au - lo) / span;
    passes.push({ id: p.id, name: p.name, au: p.au, t: outbound ? t : 1 - t, kind: p.kind });
  }
  passes.sort((x, y) => x.t - y.t);
  // a run past the giants is a DEEP crossing — the director earns its heliosphere act
  const deep = auB > 30 || opts.deep === true;
  // the true separation when both ends are real worlds; the radial gap when one is a bare AU mark
  const trueAu = (b && b.id && positionAt(a.id, date).au != null && positionAt(b.id, date).au != null)
    ? separationAU(a.id, b.id, date) : Math.abs(auB - auA);
  return {
    from: a, to: b || { id: 'deep', name: 'THE DARK', au: auB, kind: 'void' },
    outbound, au: trueAu, radialAu: Math.abs(auB - auA), passes, deep,
    date, dateLabel: dateStr(date),
    lonFrom: positionAt(a.id, date).lon,
    lonTo: b && b.id ? positionAt(b.id, date).lon : null,
    secs: opts.secs || transitSecsFor({ au: trueAu }),
  };
}
