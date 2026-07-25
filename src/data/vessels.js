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
