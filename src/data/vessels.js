// THE CRAFT CATALOG — everything that can make the crossing, as DATA.
//
// Robert's scope: "when we add vehicles stuff characters can travel with ships, space ships and
// alien ships and all… make sure it's dynamic enough to have groups of flyers, a flyer and a ship,
// and more." So the space layer never asks "which hero is travelling". It asks a PARTY — a list of
// travellers — and a party may be one flyer, six flyers, a flyer escorting a freighter, or an alien
// scout shadowing all of them.
//
// A VESSEL IS A PARTS LIST, NOT A MODEL. Each craft is an array of primitives with a material role,
// so adding a ship is adding a row here — no mesh files, no loader, no second art pipeline, and the
// flat-shaded low-poly look is guaranteed because every part is built from the same five geometries
// the rest of the game uses. That is the whole reason this file is data and not a builder.
//
// ⚠ NO PURPLE — engine glows and hull trims stay warm (gold/amber/red) or cold (cyan/ice/steel).
// Alien craft get sickly greens and hot oranges, which read as "other" without breaking the law.

// material roles a part can ask for; the builder resolves them per vessel from its palette
export const MAT_ROLES = ['hull', 'trim', 'glass', 'engine', 'dark'];

// geo kinds the builder knows. Keep this list short — a bigger vocabulary is how a data format
// turns back into code.
export const GEO_KINDS = ['box', 'cyl', 'cone', 'ico', 'plate', 'sphere'];

// ---------------------------------------------------------------------------------------------
// `parts` entries: { g: kind, s: [x,y,z] size, at: [x,y,z], rot: [rx,ry,rz], m: role }
// The craft's NOSE points down −Z, matching every other forward-facing thing in the engine.
export const VESSELS = [
  {
    id: 'shuttle', name: 'ORBITAL SHUTTLE', kind: 'ship', crew: 6, length: 34,
    blurb: 'Treaty Office transport. Slow, pressurised, and it has a kettle.',
    palette: { hull: '#d8d3c6', trim: '#8b8577', glass: '#2a3a44', engine: '#7fe6ff', dark: '#1b1916' },
    cruise: 0.72,
    parts: [
      { g: 'box',  s: [7, 5.5, 20], at: [0, 0, 0], m: 'hull' },
      { g: 'cone', s: [3.4, 8, 3.4], at: [0, 0.2, -13], rot: [-Math.PI / 2, 0, 0], m: 'hull' },
      { g: 'plate', s: [22, 0.9, 6], at: [0, -0.4, 3], m: 'trim' },
      { g: 'box',  s: [5, 2.4, 4], at: [0, 2.6, -4], m: 'glass' },
      { g: 'box',  s: [1.6, 4.6, 5], at: [0, 3.2, 8], m: 'trim' },
      { g: 'cyl',  s: [1.9, 1.9, 4], at: [-4.4, -0.6, 10.5], rot: [Math.PI / 2, 0, 0], m: 'engine' },
      { g: 'cyl',  s: [1.9, 1.9, 4], at: [4.4, -0.6, 10.5], rot: [Math.PI / 2, 0, 0], m: 'engine' },
    ],
    exhaust: [[-4.4, -0.6, 13], [4.4, -0.6, 13]],
  },
  {
    id: 'freighter', name: 'BULK FREIGHTER', kind: 'ship', crew: 11, length: 62,
    blurb: 'Container spine, four burners, no manners. Everything you own rides in the middle.',
    palette: { hull: '#9a8f7c', trim: '#4a453c', glass: '#2a3a44', engine: '#ffb03a', dark: '#14120e' },
    cruise: 0.55,
    parts: [
      { g: 'box', s: [6, 6, 40], at: [0, 0, 0], m: 'dark' },
      { g: 'box', s: [11, 8, 9], at: [0, 1, -18], m: 'hull' },
      { g: 'box', s: [6, 3, 4], at: [0, 5, -20], m: 'glass' },
      { g: 'box', s: [13, 7, 8], at: [0, 0, -4], m: 'hull' },
      { g: 'box', s: [13, 7, 8], at: [0, 0, 6], m: 'trim' },
      { g: 'box', s: [13, 7, 8], at: [0, 0, 16], m: 'hull' },
      { g: 'cyl', s: [2.6, 2.6, 6], at: [-5, -3, 24], rot: [Math.PI / 2, 0, 0], m: 'engine' },
      { g: 'cyl', s: [2.6, 2.6, 6], at: [5, -3, 24], rot: [Math.PI / 2, 0, 0], m: 'engine' },
      { g: 'cyl', s: [2.6, 2.6, 6], at: [-5, 3, 24], rot: [Math.PI / 2, 0, 0], m: 'engine' },
      { g: 'cyl', s: [2.6, 2.6, 6], at: [5, 3, 24], rot: [Math.PI / 2, 0, 0], m: 'engine' },
    ],
    exhaust: [[-5, -3, 27], [5, -3, 27], [-5, 3, 27], [5, 3, 27]],
  },
  {
    id: 'interceptor', name: 'INTERCEPTOR', kind: 'ship', crew: 1, length: 22,
    blurb: 'One seat, two guns, and enough fuel to regret it.',
    palette: { hull: '#c9482f', trim: '#f2efe6', glass: '#1d2b33', engine: '#ffd24a', dark: '#14120e' },
    cruise: 1.25,
    parts: [
      { g: 'cone', s: [2.6, 14, 2.6], at: [0, 0, -3], rot: [-Math.PI / 2, 0, 0], m: 'hull' },
      { g: 'box',  s: [3.2, 2.2, 9], at: [0, 0, 4], m: 'hull' },
      { g: 'plate', s: [17, 0.7, 5], at: [0, 0.2, 4], rot: [0, 0, 0], m: 'trim' },
      { g: 'box',  s: [2.2, 1.5, 3], at: [0, 1.5, -1], m: 'glass' },
      { g: 'cyl',  s: [1.5, 1.5, 3.4], at: [0, 0, 9], rot: [Math.PI / 2, 0, 0], m: 'engine' },
    ],
    exhaust: [[0, 0, 11]],
  },
  {
    id: 'scout', name: 'XENO SCOUT', kind: 'alien', crew: 0, length: 18,
    blurb: 'Nobody has ever seen the inside of one. It does not appear to have a front.',
    palette: { hull: '#6f7d4a', trim: '#c2d16a', glass: '#0f1410', engine: '#b6ff3a', dark: '#0d120c' },
    cruise: 1.6,
    parts: [
      { g: 'ico',  s: [7, 3.4, 7], at: [0, 0, 0], m: 'hull' },
      { g: 'ico',  s: [4.2, 4.2, 4.2], at: [0, 1.2, 0], m: 'glass' },
      { g: 'plate', s: [15, 0.6, 15], at: [0, -1.2, 0], m: 'trim' },
      { g: 'sphere', s: [1.5, 1.5, 1.5], at: [0, -1.8, 0], m: 'engine' },
    ],
    exhaust: [[0, -2.6, 0]],
  },
  {
    id: 'hauler', name: 'ARK HAULER', kind: 'alien', crew: 0, length: 96,
    blurb: 'It is not going anywhere near you. It is simply going, and it is very large.',
    palette: { hull: '#3f4a52', trim: '#e08a3a', glass: '#101820', engine: '#ff6a1a', dark: '#0b0f12' },
    cruise: 0.4,
    parts: [
      { g: 'box', s: [18, 10, 62], at: [0, 0, 0], m: 'hull' },
      { g: 'cone', s: [9, 22, 9], at: [0, 0, -40], rot: [-Math.PI / 2, 0, 0], m: 'hull' },
      { g: 'plate', s: [46, 1.4, 26], at: [0, 4, 6], m: 'trim' },
      { g: 'box', s: [8, 5, 10], at: [0, 7, -6], m: 'glass' },
      { g: 'cyl', s: [4, 4, 9], at: [-7, 0, 36], rot: [Math.PI / 2, 0, 0], m: 'engine' },
      { g: 'cyl', s: [4, 4, 9], at: [7, 0, 36], rot: [Math.PI / 2, 0, 0], m: 'engine' },
    ],
    exhaust: [[-7, 0, 41], [7, 0, 41]],
  },
];

export const vesselById = (id) => VESSELS.find(v => v.id === id) || VESSELS[0];

// ---------------------------------------------------------------------------------------------
// FORMATIONS — where each traveller sits relative to the party's lead. Offsets are in "party
// units", scaled at build time by the biggest craft present, so a lone hero and a hero escorting a
// freighter both read correctly without anyone tuning numbers per journey.
//
// ⚠ A formation is a FUNCTION of the index, not a fixed table, so it works for any party size —
// the whole point is that six flyers and one flyer take the same code path.
export const FORMATIONS = {
  solo:   (i) => [0, 0, 0],
  vee:    (i) => { const k = Math.ceil(i / 2), s = i % 2 ? 1 : -1; return [s * k * 1.5, 0, k * 1.7]; },
  line:   (i) => [0, 0, i * 2.2],
  echelon:(i) => [i * 1.2, i * 0.35, i * 1.5],
  escort: (i) => { if (!i) return [0, 0, 0]; const k = Math.ceil(i / 2), s = i % 2 ? 1 : -1; return [s * 2.4, 0.6 * k, -0.8 + k * 0.6]; },
  swarm:  (i) => { const a = i * 2.399963; return [Math.cos(a) * (0.7 + i * 0.22), Math.sin(a * 1.7) * 0.5, 0.5 + i * 0.4]; },
};

// Pick a formation from what the party actually IS. A single traveller flies solo; flyers around a
// big ship escort it; a pack of flyers flies a vee; anything alien swarms.
export function formationFor(party) {
  if (party.length <= 1) return 'solo';
  if (party.some(t => t.kind === 'alien')) return 'swarm';
  const big = party.find(t => t.vessel && t.vessel.length >= 40);
  if (big && party.some(t => t.kind === 'flyer')) return 'escort';
  if (party.every(t => t.kind === 'flyer')) return party.length > 4 ? 'echelon' : 'vee';
  return 'line';
}

// ---------------------------------------------------------------------------------------------
// THE PARTY. `makeParty` turns loose intent into the list the director flies.
//   makeParty({ hero: def })                       → one flyer
//   makeParty({ hero: def, ship: 'shuttle' })       → a flyer and a ship
//   makeParty({ heroes: [a, b, c] })                → a flight of three
//   makeParty({ heroes: [...], ship: 'freighter', escort: 'interceptor' }) → a convoy
// Everything derives from live data — a flyer's wake colours come from its OWN afterburner row, so
// a custom hero built in ORIGIN arrives in space wearing its own colours with nobody wiring it up.
export function makeParty(spec = {}) {
  const out = [];
  const push = (t) => { t.slot = out.length; out.push(t); return t; };
  const heroes = spec.heroes || (spec.hero ? [spec.hero] : []);
  if (spec.ship) {
    const v = vesselById(spec.ship);
    push({ kind: v.kind === 'alien' ? 'alien' : 'ship', vessel: v, name: v.name, lead: true });
  }
  for (const def of heroes) {
    const ab = def && def.afterburner;
    push({
      kind: 'flyer', def, name: (def && def.name) || 'ASCENDANT',
      wake: (ab && ab.wake) || [(def && def.colors && def.colors.accent) || '#ffd24a', '#ffffff'],
      lead: !spec.ship && out.length === 0,
    });
  }
  for (let i = 0; i < (spec.escortCount || (spec.escort ? 1 : 0)); i++) {
    const v = vesselById(spec.escort);
    push({ kind: v.kind === 'alien' ? 'alien' : 'ship', vessel: v, name: v.name });
  }
  for (let i = 0; i < (spec.alienCount || 0); i++) {
    const v = vesselById(spec.alien || 'scout');
    push({ kind: 'alien', vessel: v, name: v.name });
  }
  if (!out.length) push({ kind: 'flyer', def: null, name: 'ASCENDANT', wake: ['#ffd24a', '#ffffff'], lead: true });
  out.formation = spec.formation || formationFor(out);
  return out;
}

// -------------------------------------------------------------------------------------------------
// ATMOSPHERIC AIRCRAFT — at TRUE 1:1 scale, which is the entire point of the exercise.
//
// Robert: "considering the size of people and cars and such, show me what a jet, a quinjet and a
// helicopter would look like in this world."
//
// ⚠ EVERY LENGTH HERE IS THE REAL AIRCRAFT, converted once. The world is 1u ≈ 0.19 m, so
// `u = metres × 5.263`. A hero is 9.6u (1.8 m) and a street car is 24u (4.5 m) — those two numbers
// are the yardstick, and they are what make these things frightening. A utility helicopter is not
// "a big prop": it is 104u, which is TEN AND A HALF PEOPLE laid end to end, and its rotor disc is
// wider than three cars parked nose to tail.
//
// ⚠ THIS IS WHY AIRCRAFT CANNOT BE STREET SCENERY. A street is 22u wide. A heavy transport spans
// 272u — TWELVE lanes. Anything past the gunship belongs to the airport tile, the sky, or a
// cutscene; it cannot set down between two buildings, and pretending otherwise is exactly how a
// scale system becomes a lie.
export const M2U = 1 / 0.19;                    // metres → world units (5.263)
export const REF = { hero: 9.6, car: 24, bus: 63, street: 22, tower: 150 };

export const AIRCRAFT = [
  {
    id: 'lightheli', name: 'LIGHT HELICOPTER', real: 'news / police ship', kind: 'heli',
    lengthM: 12.9, spanM: 11.0, crew: 4,
    blurb: 'The one already circling your fight. Small enough to put down in a plaza.',
    palette: { hull: '#2e3540', trim: '#8b8577', glass: '#1d2a33', engine: '#ffb03a', dark: '#14120e' },
    rotor: { r: 11.0, at: [0, 3.2, -1] },
    parts: [
      { g: 'box',  s: [3.4, 3.2, 9], at: [0, 0, 0], m: 'hull' },
      { g: 'box',  s: [2.6, 2.2, 3], at: [0, 0.3, -5.2], m: 'glass' },
      { g: 'box',  s: [1.1, 1.1, 7], at: [0, 1.1, 6.4], m: 'hull' },
      { g: 'plate', s: [0.5, 3.4, 2], at: [0, 2.6, 9.4], m: 'trim' },
      { g: 'cyl',  s: [0.3, 0.3, 5], at: [-1.5, -2, 0], rot: [Math.PI / 2, 0, 0], m: 'trim' },
      { g: 'cyl',  s: [0.3, 0.3, 5], at: [1.5, -2, 0], rot: [Math.PI / 2, 0, 0], m: 'trim' },
    ],
  },
  {
    id: 'blackhawk', name: 'UTILITY HELICOPTER', real: 'UH-60 class', kind: 'heli',
    lengthM: 19.76, spanM: 16.36, crew: 11,
    blurb: 'Eleven seats and a door gun. What a state sends when it stops asking.',
    palette: { hull: '#3a4038', trim: '#6b6f60', glass: '#1d2a33', engine: '#ffb03a', dark: '#14120e' },
    rotor: { r: 16.36, at: [0, 4.4, -2] },
    parts: [
      { g: 'box',  s: [5, 4.4, 14], at: [0, 0, 0], m: 'hull' },
      { g: 'box',  s: [4.2, 3, 4], at: [0, 0.6, -8], m: 'glass' },
      { g: 'box',  s: [1.6, 1.6, 9], at: [0, 1.4, 10], m: 'hull' },
      { g: 'plate', s: [0.6, 5, 2.6], at: [0, 3.6, 14], m: 'trim' },
      { g: 'box',  s: [1.2, 0.6, 5], at: [-3.4, 0.6, 0], m: 'trim' },
      { g: 'box',  s: [1.2, 0.6, 5], at: [3.4, 0.6, 0], m: 'trim' },
      { g: 'cyl',  s: [0.4, 0.4, 6], at: [-2, -2.8, 0], rot: [Math.PI / 2, 0, 0], m: 'dark' },
      { g: 'cyl',  s: [0.4, 0.4, 6], at: [2, -2.8, 0], rot: [Math.PI / 2, 0, 0], m: 'dark' },
    ],
  },
  {
    id: 'gunship', name: 'ATTACK HELICOPTER', real: 'AH-64 class', kind: 'heli',
    lengthM: 17.73, spanM: 14.63, crew: 2,
    blurb: 'Two seats, no cargo, and a chin gun slaved to where the gunner is looking.',
    palette: { hull: '#2f3730', trim: '#585d4e', glass: '#14202a', engine: '#ffb03a', dark: '#101410' },
    rotor: { r: 14.63, at: [0, 3.9, -1] },
    parts: [
      { g: 'box',  s: [2.6, 3.4, 15], at: [0, 0, 0], m: 'hull' },
      { g: 'box',  s: [2.2, 1.8, 3.4], at: [0, 1.2, -6.4], m: 'glass' },
      { g: 'box',  s: [2.2, 1.8, 3], at: [0, 2.6, -3.2], m: 'glass' },
      { g: 'cyl',  s: [0.5, 0.5, 2.4], at: [0, -2, -7.4], rot: [Math.PI / 2, 0, 0], m: 'dark' },
      { g: 'box',  s: [11, 0.5, 2.2], at: [0, -0.4, 1], m: 'trim' },
      { g: 'box',  s: [1.6, 1, 3], at: [-4.6, -1.2, 1], m: 'dark' },
      { g: 'box',  s: [1.6, 1, 3], at: [4.6, -1.2, 1], m: 'dark' },
      { g: 'plate', s: [0.5, 3.6, 2.2], at: [0, 3, 8.4], m: 'trim' },
    ],
  },
  {
    id: 'quinjet', name: 'QUINJET', real: 'tiltrotor VTOL', kind: 'vtol',
    lengthM: 20.0, spanM: 18.0, crew: 8,
    blurb: 'Vertical off a rooftop, supersonic in a straight line, eight aboard with gear.',
    palette: { hull: '#3b3f46', trim: '#9aa0a8', glass: '#16242c', engine: '#7fe6ff', dark: '#141619' },
    parts: [
      { g: 'box',  s: [6, 4, 15], at: [0, 0, 0], m: 'hull' },
      { g: 'cone', s: [3, 5, 3], at: [0, 0.2, -9.5], rot: [-Math.PI / 2, 0, 0], m: 'hull' },
      { g: 'box',  s: [4.4, 2.2, 4], at: [0, 1.4, -5.6], m: 'glass' },
      { g: 'plate', s: [17, 0.8, 6], at: [0, -0.2, 1.5], m: 'trim' },
      { g: 'box',  s: [0.6, 5, 4], at: [-2.6, 2.6, 6.4], rot: [0, 0, -0.32], m: 'trim' },
      { g: 'box',  s: [0.6, 5, 4], at: [2.6, 2.6, 6.4], rot: [0, 0, 0.32], m: 'trim' },
      { g: 'cyl',  s: [1.7, 1.7, 5], at: [-6.4, -0.2, 2], rot: [Math.PI / 2, 0, 0], m: 'engine' },
      { g: 'cyl',  s: [1.7, 1.7, 5], at: [6.4, -0.2, 2], rot: [Math.PI / 2, 0, 0], m: 'engine' },
      { g: 'cyl',  s: [1.3, 1.3, 4], at: [0, -1.4, 7], rot: [Math.PI / 2, 0, 0], m: 'engine' },
    ],
    exhaust: [[-6.4, -0.2, 5], [6.4, -0.2, 5], [0, -1.4, 9.5]],
  },
  {
    id: 'fighter', name: 'AIR SUPERIORITY FIGHTER', real: 'F-22 class', kind: 'jet',
    lengthM: 18.92, spanM: 13.56, crew: 1,
    blurb: 'One seat. Not here to fight you — here to be somewhere else very quickly.',
    palette: { hull: '#4a5058', trim: '#767d86', glass: '#1a2830', engine: '#ffb03a', dark: '#14161a' },
    parts: [
      { g: 'box',  s: [3.4, 2.4, 16], at: [0, 0, 0], m: 'hull' },
      { g: 'cone', s: [2, 5, 2], at: [0, 0.1, -10.4], rot: [-Math.PI / 2, 0, 0], m: 'hull' },
      { g: 'box',  s: [2.2, 1.4, 3.6], at: [0, 1.5, -4.6], m: 'glass' },
      { g: 'plate', s: [13, 0.5, 7], at: [0, -0.3, 2], m: 'hull' },
      { g: 'plate', s: [6, 0.5, 3.4], at: [0, -0.3, 7.4], m: 'trim' },
      { g: 'box',  s: [0.5, 4, 3.4], at: [-1.6, 2.2, 6.6], rot: [0, 0, -0.28], m: 'trim' },
      { g: 'box',  s: [0.5, 4, 3.4], at: [1.6, 2.2, 6.6], rot: [0, 0, 0.28], m: 'trim' },
      { g: 'cyl',  s: [1.2, 1.2, 3.4], at: [-1.2, -0.2, 8.4], rot: [Math.PI / 2, 0, 0], m: 'engine' },
      { g: 'cyl',  s: [1.2, 1.2, 3.4], at: [1.2, -0.2, 8.4], rot: [Math.PI / 2, 0, 0], m: 'engine' },
    ],
    exhaust: [[-1.2, -0.2, 10.4], [1.2, -0.2, 10.4]],
  },
  {
    id: 'transport', name: 'HEAVY TRANSPORT', real: 'C-17 class', kind: 'jet',
    lengthM: 53.0, spanM: 51.75, crew: 3,
    blurb: 'It does not land in your city. It lands at the airport and the city comes to it.',
    palette: { hull: '#5c6158', trim: '#8b8f82', glass: '#1a2830', engine: '#ffb03a', dark: '#161814' },
    parts: [
      { g: 'cyl',  s: [4.4, 4.4, 46], at: [0, 0, 0], rot: [Math.PI / 2, 0, 0], m: 'hull' },
      { g: 'cone', s: [4.2, 7, 4.2], at: [0, 0, -25], rot: [-Math.PI / 2, 0, 0], m: 'hull' },
      { g: 'box',  s: [5, 2.6, 5], at: [0, 2.6, -18], m: 'glass' },
      { g: 'plate', s: [49, 1.2, 11], at: [0, 2.4, -1], m: 'hull' },
      { g: 'box',  s: [1.2, 15, 11], at: [0, 9, 20], m: 'trim' },
      { g: 'plate', s: [19, 0.9, 5], at: [0, 15.5, 21.5], m: 'trim' },
      { g: 'cyl',  s: [2.6, 2.6, 7], at: [-11, 0.4, -2], rot: [Math.PI / 2, 0, 0], m: 'dark' },
      { g: 'cyl',  s: [2.6, 2.6, 7], at: [11, 0.4, -2], rot: [Math.PI / 2, 0, 0], m: 'dark' },
      { g: 'cyl',  s: [2.6, 2.6, 7], at: [-19, 1.2, 1], rot: [Math.PI / 2, 0, 0], m: 'dark' },
      { g: 'cyl',  s: [2.6, 2.6, 7], at: [19, 1.2, 1], rot: [Math.PI / 2, 0, 0], m: 'dark' },
    ],
  },
];

export const aircraftById = (id) => AIRCRAFT.find((a) => a.id === id) || null;

// the real numbers, expressed in the units the game actually thinks in
export function aircraftScale(a) {
  const L = a.lengthM * M2U, S = a.spanM * M2U;
  return {
    lengthU: +L.toFixed(1), spanU: +S.toFixed(1),
    heroes: +(L / REF.hero).toFixed(1), cars: +(L / REF.car).toFixed(1),
    streets: +(S / REF.street).toFixed(1),
    fitsInAStreet: S <= REF.street,
  };
}
