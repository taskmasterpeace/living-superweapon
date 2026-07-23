// THRESHOLD — the CITY PLANNER. Turns a row of the world sheet (city type + population +
// indices) into a buildable PLAN on the sectional grid the White City proved out: 96-unit
// district cells separated by 22u streets (the ground texture draws one road ring per cell).
// world.buildCity(plan) raises the meshes; this file only decides WHAT goes WHERE.
//
// A plan: { name, country, popType, popLabel, types, crime, safety, seed,
//           N (cells per side), arena (half-extent = N*48), water (bool), waterCols,
//           cells[row][col] = { t: tileType, v: variant } | null (open street/plaza ground) }
// Tile types are whatever TILE_INFO declares — see below. Do not maintain a second list here;
// the gallery/proving-ground and the atlas both derive from that one table.
import { mulberry } from './news.js';
import { cultureOf } from './cities.js';

// THE BASE CELL. Every tile builder is authored against this: a 96-unit district block, sized so a
// 9.6u (1.8m) hero fights DOWN through a real city. It is the UNIT, not a hard limit — a plan can
// carry its own `cell` and the whole world scales with it (see `ctx.S` in citytiles.js), which is
// what makes this generator usable for a game that isn't at superhero scale.
export const CELL = 96;
export const CELL_RANGE = [32, 240];             // what the map maker will let you dial it to
export const TILE_INFO = {
  residential: { label: 'RESIDENTIAL', c: '#ff9a3a' },
  commercial:  { label: 'COMMERCIAL',  c: '#9fc0ff' },
  company:     { label: 'CORPORATE',   c: '#7fe6ff' },
  industrial:  { label: 'INDUSTRIAL',  c: '#c0d0e0' },
  military:    { label: 'MILITARY',    c: '#a8c070' },
  political:   { label: 'CAPITOL',     c: '#f5d99a' },
  educational: { label: 'CAMPUS',      c: '#8fe08a' },
  temple:      { label: 'TEMPLE',      c: '#ffd24a' },
  mining:      { label: 'MINEWORKS',   c: '#c9a227' },
  seaport:     { label: 'DOCKLANDS',   c: '#7fb0d0' },
  resort:      { label: 'RESORT',      c: '#ffd6a0' },
  park:        { label: 'GREENBELT',   c: '#6a9a4a' },
  plaza:       { label: 'PLAZA',       c: '#d8d2c4' },
  stadium:     { label: 'THE BOWL',    c: '#8fe08a' },
  hospital:    { label: 'MEDICAL',     c: '#e8e2d6' },
  market:      { label: 'THE MARKET',  c: '#e8a24a' },
  metro:       { label: 'THE LINE',    c: '#7fd0c0' },
  farmland:    { label: 'THE COUNTY',  c: '#9ab061' },
  airport:     { label: 'THE FIELD',   c: '#bfc8d8' },
  railyard:    { label: 'THE YARDS',   c: '#b08d5a' },
};
export const VARIANTS = { residential: 3, commercial: 3, company: 2, industrial: 3, military: 2, political: 2, educational: 2, temple: 3, mining: 2, seaport: 2, resort: 2, park: 2, plaza: 2, stadium: 2, hospital: 2, market: 2, metro: 2, farmland: 3, airport: 2, railyard: 2 };

// ---- MULTI-CELL FOOTPRINTS ------------------------------------------------------------------
// A tile used to be exactly one 96u cell, which is why there could be no airport, no rail yard,
// and no stadium that read as a stadium. A footprint tile claims a RECTANGLE: the ANCHOR cell
// holds the real structure and knows its own size, and every cell it covers holds a `ref` back to
// the anchor so the planner, the roads, the districts and the editor all agree on who owns it.
//   anchor  { t, v, r, c, fh, fw }          covered  { t, ref: [ar, ac] }
// `foot` is [rows, cols]; the planner also tries it ROTATED, so a 1×3 yard can run either way.
export const TILE_FOOT = { stadium: [2, 2], airport: [2, 3], railyard: [1, 3] };
export const isRef = (cell) => !!(cell && cell.ref);

// ⚠ SCALE HAS TO READ. City and Large City were BOTH 5×5 and a Mega City was only 6×6, so the
// three tiers 96% of the sheet falls into produced almost the same map — measured 17.1 / 17.0 /
// 20.6 structural cells. The ladder is spread out now, and a Village is finally a hamlet rather
// than a small downtown.
export const GRID_BY_POP = { 'Village': 2, 'Small Town': 3, 'Town': 4, 'Small City': 5, 'City': 5, 'Large City': 6, 'Mega City': 8 };
export const POP_TYPES = ['Village', 'Small Town', 'Town', 'Small City', 'City', 'Large City', 'Mega City'];
// Where the countryside starts. This is the switch that decides farmland-and-tracks vs blocks-and-
// streets, so it is named data rather than an inline string comparison in three places.
const RURAL_POP = { 'Village': 1, 'Small Town': 1 };
// DENSITY. This used to be a hard 24 to match a fixed-size array in the fog shader, which meant a
// Mega City (36 cells) threw a third of itself away as empty plaza and came out FEELING EMPTIER
// than a small city. The fog now uses a coarse occupancy GRID instead of a uniform array, so the
// budget scales with the map: a big city is allowed to be a big city.
const structCap = (N) => Math.min(64, Math.round(N * N * 0.82) + 4);

// ---- THE PLACEMENT TABLE --------------------------------------------------------------------
// Which tile goes where used to be a hand-written chain of `if` statements inside the generator.
// It is a TABLE now: one row per structure the planner may place, evaluated top to bottom. Rarity,
// landmarks, footprints and "only cities big enough" are content you can edit here — no code.
//
//   t         the tile type to place
//   need      only if the city sheet lists this specialisation (omit = every city)
//   minN      smallest grid that gets one            chance   probability it appears at all
//   foot      [rows, cols] footprint (default 1×1)   landmark never demoted by the density budget
//   rural     'only' | 'never' (default: never — villages don't get a hospital district)
//   score     where it wants to sit, as named terms summed:
//               center  toward the middle          rim     toward the outskirts
//               ring    the first ring in          water   toward the shore
//               south   the lower half             cluster near others of its own type
//               jitter  random spice
// Rows are ATOMIC — a second berth or a second campus is a second row. That keeps the table flat
// and legible instead of hiding counts inside per-row min/max arithmetic.
export const PLACEMENT = [
  // --- identity: what the city is FAMOUS for lands first and owns the best ground
  { t: 'seaport',     need: 'seaport',     score: { water: 4 } },
  { t: 'seaport',     need: 'seaport',     score: { water: 4, cluster: 1 } },
  { t: 'resort',      need: 'resort',      score: { water: 3, south: 1 } },
  { t: 'resort',      need: 'resort',      minN: 5, score: { water: 3 } },
  { t: 'political',   need: 'political',   score: { center: 3 }, landmark: true },
  { t: 'military',    need: 'military',    score: { rim: 3, water: -1 } },
  { t: 'military',    need: 'military',    minN: 5, score: { cluster: 2 } },
  { t: 'mining',      need: 'mining',      score: { rim: 3 } },
  { t: 'mining',      need: 'mining',      minN: 5, chance: 0.7, score: { cluster: 2 } },
  { t: 'educational', need: 'educational', score: { ring: 2 } },
  { t: 'educational', need: 'educational', minN: 5, score: { cluster: 2 } },
  { t: 'temple',      need: 'temple',      score: { ring: 1 } },
  { t: 'company',     need: 'company',     score: { center: 2 } },
  { t: 'company',     need: 'company',     minN: 5, score: { center: 2 } },
  { t: 'industrial',  need: 'industrial',  score: { rim: 1, water: 2 } },
  { t: 'industrial',  need: 'industrial',  minN: 5, score: { rim: 1, water: 2 } },
  // --- the multi-cell landmarks: things that simply could not exist on a 1×1 grid
  { t: 'airport',  minN: 6, foot: [2, 3], landmark: true, score: { rim: 4, water: -2 } },
  { t: 'railyard', minN: 5, foot: [1, 3], landmark: true, chance: 0.75, score: { rim: 2, cluster: 1 } },
  { t: 'stadium',  minN: 5, foot: [2, 2], landmark: true, score: { rim: 1.5 } },
  // --- civic amenities: every real city has these regardless of what it's famous for
  { t: 'hospital', score: { ring: 2 } },
  { t: 'market',   minN: 4, score: { center: 1 } },
  { t: 'market',   minN: 6, score: { center: 1, cluster: -1 } },
  // --- THE COUNTRYSIDE. Rural maps skip every row above (a hamlet has no corporate core and no
  // hospital district), so the few things a village DOES have are declared here explicitly.
  // ⚠ Without these a 2×2 village generated as pure farmland with nobody living in it: the old
  // "centre cell becomes homes" rule tested `edge === 0`, which no cell satisfies on an even grid.
  { t: 'residential', rural: 'only', score: { center: 3 } },                    // the village core
  { t: 'residential', rural: 'only', minN: 3, chance: 0.7, score: { center: 2, cluster: 1.5 } },
  { t: 'temple',      rural: 'only', minN: 3, chance: 0.55, score: { center: 1 } },   // the parish church
  { t: 'market',      rural: 'only', minN: 4, chance: 0.6, score: { center: 2 } },    // market day
  // --- greenbelt
  { t: 'park',     score: { ring: 1, jitter: 1 } },
  { t: 'park',     minN: 5, score: { ring: 1, jitter: 1 } },
  { t: 'park',     minN: 6, score: { ring: 1, jitter: 1 } },
];

// ---- REGION SKINS ---------------------------------------------------------------------------
// Every city already carried a `cultureCode` (14 architectural regions) and NOTHING read it, so
// Kabul was built out of the same greys as Oslo. One table, keyed by that code, tints the whole
// build: wall tone, roof, ground, greenery, and how often a flat/pitched/domed roof turns up.
// ⚠ Code 0 means UNSET in the sheet (22 rows) — `regionOf` falls back, never assumes.
export const REGIONS = {
  0:  { key: 'default', name: 'INTERNATIONAL',   wall: '#cfc7b6', roof: '#8d8677', ground: '#c2bba9', green: '#6f9a4e', pitch: 0.25, dome: 0.02, warm: 0 },
  1:  { key: 'nafrica', name: 'NORTH AFRICA',    wall: '#e2cfa8', roof: '#c9a978', ground: '#d8c9a4', green: '#7d8f4a', pitch: 0.10, dome: 0.22, warm: 0.35 },
  2:  { key: 'cafrica', name: 'CENTRAL AFRICA',  wall: '#d8bf95', roof: '#a8703f', ground: '#c0a274', green: '#4f8a3c', pitch: 0.35, dome: 0.02, warm: 0.30 },
  3:  { key: 'safrica', name: 'SOUTHERN AFRICA', wall: '#ded2b8', roof: '#9c6b45', ground: '#c9b78e', green: '#7e9350', pitch: 0.30, dome: 0.02, warm: 0.22 },
  4:  { key: 'casia',   name: 'CENTRAL ASIA',    wall: '#d6c6a6', roof: '#8a7a5e', ground: '#c8b894', green: '#78854a', pitch: 0.15, dome: 0.28, warm: 0.25 },
  5:  { key: 'sasia',   name: 'SOUTH ASIA',      wall: '#e0cdb0', roof: '#b06a4a', ground: '#c6b291', green: '#4d8f45', pitch: 0.30, dome: 0.14, warm: 0.28 },
  6:  { key: 'easia',   name: 'EAST ASIA',       wall: '#c9ccd2', roof: '#5c6470', ground: '#b7b8b4', green: '#5d9457', pitch: 0.45, dome: 0.03, warm: -0.10 },
  7:  { key: 'carib',   name: 'THE CARIBBEAN',   wall: '#efd9bd', roof: '#c2553f', ground: '#ccc0a2', green: '#4f9c4a', pitch: 0.55, dome: 0.02, warm: 0.30 },
  8:  { key: 'camerica',name: 'CENTRAL AMERICA', wall: '#e6cfa9', roof: '#b45f42', ground: '#c8b78f', green: '#589349', pitch: 0.50, dome: 0.06, warm: 0.26 },
  9:  { key: 'weurope', name: 'WEST EUROPE',     wall: '#d9d2c2', roof: '#8f5f4c', ground: '#c3bcac', green: '#6b9a4e', pitch: 0.45, dome: 0.05, warm: 0.05 },
  10: { key: 'eeurope', name: 'EAST EUROPE',     wall: '#c8c3b4', roof: '#6d6a62', ground: '#b8b3a4', green: '#63894c', pitch: 0.35, dome: 0.12, warm: -0.05 },
  11: { key: 'oceania', name: 'OCEANIA',         wall: '#dfd8c8', roof: '#7a8a92', ground: '#c7c0ac', green: '#6ea24f', pitch: 0.40, dome: 0.02, warm: 0.10 },
  12: { key: 'samerica',name: 'SOUTH AMERICA',   wall: '#dfcaa6', roof: '#a85d43', ground: '#c5b48e', green: '#569148', pitch: 0.40, dome: 0.05, warm: 0.22 },
  13: { key: 'namerica',name: 'NORTH AMERICA',   wall: '#d2cbbb', roof: '#7c766a', ground: '#c2bba9', green: '#6f9a4e', pitch: 0.28, dome: 0.03, warm: 0.05 },
  14: { key: 'meast',   name: 'MIDDLE EASTERN',  wall: '#e8d7b4', roof: '#c0a173', ground: '#d5c6a2', green: '#7f8f48', pitch: 0.08, dome: 0.30, warm: 0.32 },
};
export const regionOf = (code) => REGIONS[code] || REGIONS[0];

// ---- THE ROAD GRAPH -------------------------------------------------------------------------
// Roads used to be a wrapped ground TEXTURE that painted a street on all four sides of every cell,
// forever. That forbade T-junctions, dead ends, dirt tracks, road hierarchy, and any road that
// connects one specific place to another. Roads are now DATA on the plan:
//
//   nodes  — the (N+1)² lattice of cell corners
//   edges  — plan.roads.h[r][c] joins node(r,c)→node(r,c+1);  .v[r][c] joins node(r,c)→node(r+1,c)
//            each value is a ROAD CLASS id; 0 means THERE IS NO ROAD HERE (that's the whole point)
//
// Everything downstream — geometry, junction type, pedestrians, traffic, police approach — reads
// this one structure, so there is a single source of truth for "where is there a road".
export const ROAD = [
  { key: 'none',     width: 0,  mat: null,       markings: 'none' },
  { key: 'track',    width: 9,  mat: 'dirt',     markings: 'none' },     // farm track — no markings
  { key: 'street',   width: 22, mat: 'asphalt',  markings: 'dash' },     // the default city street
  { key: 'arterial', width: 30, mat: 'asphalt',  markings: 'double' },   // the big through-road
  { key: 'highway',  width: 38, mat: 'asphalt',  markings: 'divided' },  // ring / bypass
];
export const R_NONE = 0, R_TRACK = 1, R_STREET = 2, R_ARTERIAL = 3, R_HIGHWAY = 4;

// How important is the traffic between these two districts? That decides the road class.
const WEIGHT = {
  company: 5, political: 5, commercial: 4, market: 4, metro: 4, stadium: 3, hospital: 3,
  residential: 2, educational: 2, temple: 2, seaport: 3, industrial: 3, military: 2,
  mining: 1, resort: 2, park: 1, plaza: 1, farmland: 0, water: 0,
};
function buildRoads(plan, rng) {
  const N = plan.N, C = plan.cells, rural = !!plan.rural;
  const h = [], v = [];
  const tAt = (r, c) => (C[r] && C[r][c]) ? C[r][c].t : null;
  const wAt = (r, c) => { const t = tAt(r, c); return t == null ? -1 : (WEIGHT[t] ?? 2); };
  // Which structure owns this cell? A footprint's anchor owns itself and every ref cell.
  const ownerOf = (r, c) => {
    const cell = (C[r] && C[r][c]) ? C[r][c] : null;
    if (!cell) return null;
    return cell.ref ? cell.ref[0] * 1000 + cell.ref[1] : (cell.fh > 1 || cell.fw > 1) ? r * 1000 + c : null;
  };
  // an edge sits BETWEEN two cells; its class comes from the heavier of the two sides
  const classFor = (a, b) => {
    const wa = wAt(a[0], a[1]), wb = wAt(b[0], b[1]);
    // ⚠ NO ROAD RUNS THROUGH A BUILDING. Two cells of the SAME multi-cell structure have no street
    // between them — this is the thing a texture-grid could never express, and it is what makes an
    // airport read as one field instead of six blocks with taxiways painted over the streets.
    const oa = ownerOf(a[0], a[1]);
    if (oa != null && oa === ownerOf(b[0], b[1])) return R_NONE;
    if (wa < 0 && wb < 0) return R_NONE;
    if (tAt(a[0], a[1]) === 'water' || tAt(b[0], b[1]) === 'water') return R_NONE;   // no road into the sea
    const w = Math.max(wa, wb);
    if (w <= 0) return R_NONE;                        // open country either side — no made road
    if (w === 1) return R_TRACK;                      // a dirt track serves the quiet edge
    // ⚠ THE COUNTRYSIDE IS NOT A CITY WITH FEWER HOUSES. A village used to come out with 13 paved
    // streets because a farmhouse counts as `residential` (weight 2) and any weight ≥2 got asphalt.
    // Rural places top out at ONE metalled road; everything else is a dirt track.
    if (rural) return w >= 4 ? R_STREET : R_TRACK;
    if (w >= 5) return R_ARTERIAL;
    return R_STREET;
  };
  // horizontal edges: (N+1) lattice rows, each with N spans
  for (let r = 0; r <= N; r++) {
    h.push(new Uint8Array(N));
    for (let c = 0; c < N; c++) h[r][c] = classFor([r - 1, c], [r, c]);
  }
  // vertical edges: N lattice cols spans over (N+1)
  for (let r = 0; r < N; r++) {
    v.push(new Uint8Array(N + 1));
    for (let c = 0; c <= N; c++) v[r][c] = classFor([r, c - 1], [r, c]);
  }
  // ONE RING ROAD: promote a full row and column to highway on cities big enough to warrant it.
  // This is the linear structure the concentric-square placement never had.
  if (N >= 5 && !rural) {
    const hr = 1 + ((rng() * (N - 1)) | 0);
    for (let c = 0; c < N; c++) if (h[hr][c] !== R_NONE) h[hr][c] = R_HIGHWAY;
    plan.highwayRow = hr;
    // a big city gets a cross street too, so the network has a spine both ways instead of one
    // stripe and a grid of side roads
    if (N >= 7) {
      const vc = 2 + ((rng() * (N - 3)) | 0);
      for (let r = 0; r < N; r++) if (v[r][vc] !== R_NONE) v[r][vc] = R_ARTERIAL;
      plan.arterialCol = vc;
    }
  }
  plan.roads = { h, v };
  // ⚠ NOTHING IS LANDLOCKED. A block with no road on any of its four sides is an unreachable
  // building — measured on 11 real cities before this. Give every structural cell at least one
  // approach, choosing the side whose neighbour is the busiest thing next door.
  let rescued = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = C[r][c];
    if (!cell || cell.ref || cell.t === 'water') continue;
    if (h[r][c] || h[r + 1][c] || v[r][c] || v[r][c + 1]) continue;
    const sides = [
      { w: wAt(r - 1, c), put: (k) => h[r][c] = k },
      { w: wAt(r + 1, c), put: (k) => h[r + 1][c] = k },
      { w: wAt(r, c - 1), put: (k) => v[r][c] = k },
      { w: wAt(r, c + 1), put: (k) => v[r][c + 1] = k },
    ];
    sides.sort((a, b) => b.w - a.w);
    sides[0].put(rural ? R_TRACK : R_STREET);
    rescued++;
  }
  plan.rescuedCells = rescued;
  return plan;
}

// Where is there a road at this world point, and of what class? The single query every consumer
// (pedestrians, traffic, police approach, the news chopper) should use instead of re-deriving a grid.
export function roadAt(plan, x, z) {
  if (!plan || !plan.roads) return 0;
  const N = plan.N, A = plan.arena, R = plan.roads, K = plan.cell || CELL, S = plan.scale || 1;
  const fx = (x + A) / K, fz = (z + A) / K;               // lattice coords
  const nr = Math.round(fz), nc = Math.round(fx);
  let best = 0;
  // horizontal edge near this z line
  if (nr >= 0 && nr <= N) {
    const c = Math.floor(fx);
    if (c >= 0 && c < N && R.h[nr] && R.h[nr][c]) {
      const dist = Math.abs(z - (-A + nr * K));
      if (dist <= ROAD[R.h[nr][c]].width * S / 2) best = Math.max(best, R.h[nr][c]);
    }
  }
  if (nc >= 0 && nc <= N) {
    const r = Math.floor(fz);
    if (r >= 0 && r < N && R.v[r] && R.v[r][nc]) {
      const dist = Math.abs(x - (-A + nc * K));
      if (dist <= ROAD[R.v[r][nc]].width * S / 2) best = Math.max(best, R.v[r][nc]);
    }
  }
  return best;
}
// The junction at a lattice node: how many roads meet, and which way they run.
export function junctionAt(plan, r, c) {
  const R = plan.roads; if (!R) return null;
  const N = plan.N;
  const w = (c > 0 && R.h[r]) ? R.h[r][c - 1] : 0;
  const e = (c < N && R.h[r]) ? R.h[r][c] : 0;
  const n = (r > 0 && R.v[r - 1]) ? R.v[r - 1][c] : 0;
  const s = (r < N && R.v[r]) ? R.v[r][c] : 0;
  const deg = [n, e, s, w].filter(Boolean).length;
  return { n, e, s, w, deg, kind: deg >= 4 ? 'cross' : deg === 3 ? 'tee' : deg === 2 ? ((n && s) || (e && w) ? 'through' : 'corner') : deg === 1 ? 'end' : 'none' };
}

export function popLabel(popType, pop) {
  const m = pop >= 1e6 ? (pop / 1e6).toFixed(1) + 'M' : pop >= 1e3 ? Math.round(pop / 1e3) + 'K' : String(pop);
  return `${popType.toUpperCase()} · POP ${m}`;
}

// The generator: deterministic for (city, seed) — reroll the seed, get a sibling city.
// `opts` is the MAP MAKER's override channel: { N, waterCols, landmarks } — the editor can resize
// the grid, move the coastline, and pin a structure without the sheet having to know about it.
export function generatePlan(city, seed = 1, opts = {}) {
  const rng = mulberry((seed * 7919 + city.pop % 997 + city.name.length * 31) | 0);
  const popType = opts.popType || city.popType;
  const N = Math.max(2, Math.min(9, opts.N || GRID_BY_POP[popType] || 5));
  const cell = Math.max(CELL_RANGE[0], Math.min(CELL_RANGE[1], opts.cell || CELL));
  const types = city.types.length ? city.types.map(t => t.toLowerCase()) : ['company', 'industrial'];
  const wantWater = types.includes('seaport') || types.includes('resort');
  const waterCols = Math.max(0, Math.min(N - 1, opts.waterCols != null ? opts.waterCols : (wantWater ? 1 : 0)));
  const plan = {
    name: city.name, country: city.country, popType, popLabel: popLabel(popType, city.pop),
    types: city.types, crime: city.crime, safety: city.safety, seed, N,
    cell, scale: cell / CELL, arena: N * cell / 2,
    water: waterCols > 0, waterCols, flagship: false,
    culture: cultureOf(city), region: regionOf(cultureOf(city)),
    cells: Array.from({ length: N }, () => Array(N).fill(null)),
  };
  const water = plan.water;
  const C = plan.cells, mid = (N - 1) / 2;
  const rural = RURAL_POP[popType] || N <= 3;
  const freeAt = (r, c) => r >= 0 && r < N && c >= 0 && c < N && C[r][c] == null;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c >= N - waterCols) C[r][c] = { t: 'water' };                  // the east shore
  }
  const edge = (r, c) => Math.max(Math.abs(r - mid), Math.abs(c - mid));
  const nearWater = (r, c) => water ? -(N - 1 - waterCols - c) : 0;
  const placed = {};                                                    // type -> [[r,c], …] for `cluster`
  const scoreAt = (S, t, r, c) => {
    let s = 0;
    if (S.center) s += -edge(r, c) * S.center;
    if (S.rim) s += edge(r, c) * S.rim;
    if (S.ring) s += -Math.abs(edge(r, c) - 1) * S.ring;
    if (S.water) s += nearWater(r, c) * S.water;
    if (S.south) s += (r > mid ? 1 : 0) * S.south;
    if (S.cluster && placed[t] && placed[t].length) {
      let best = 1e9;
      for (const [pr, pc] of placed[t]) best = Math.min(best, Math.abs(r - pr) + Math.abs(c - pc));
      s += -best * S.cluster;
    }
    if (S.jitter) s += (rng() - 0.5) * S.jitter;
    return s;
  };
  // STAMP a footprint: the anchor carries the structure and its size, the covered cells carry a
  // ref. Nothing downstream has to guess — roads, districts and the editor all read the same shape.
  const stamp = (r, c, fh, fw, t, landmark) => {
    let v = (rng() * (VARIANTS[t] || 1)) | 0;
    // ⚠ residential variant 2 is TOWERS-IN-THE-PARK. The base fill already guards against putting
    // apartment blocks in a hamlet; the PLACEMENT table has to guard too, or the village CORE —
    // the one cell that is definitely houses — comes out as a tower.
    if (rural && t === 'residential' && v === 2) v = rng() < 0.5 ? 0 : 1;
    C[r][c] = { t, v, fh, fw, landmark: !!landmark };
    for (let i = 0; i < fh; i++) for (let j = 0; j < fw; j++) {
      if (i || j) C[r + i][c + j] = { t, v, ref: [r, c] };
    }
    (placed[t] || (placed[t] = [])).push([r, c]);
    return [r, c];
  };
  // find the best free rectangle for a row, trying the footprint BOTH ways round
  const place = (row) => {
    const [fh0, fw0] = row.foot || [1, 1];
    const shapes = fh0 === fw0 ? [[fh0, fw0]] : [[fh0, fw0], [fw0, fh0]];
    let best = null, bs = -1e9;
    for (const [fh, fw] of shapes) {
      for (let r = 0; r + fh <= N; r++) for (let c = 0; c + fw <= N; c++) {
        let ok = true;
        for (let i = 0; i < fh && ok; i++) for (let j = 0; j < fw; j++) if (!freeAt(r + i, c + j)) { ok = false; break; }
        if (!ok) continue;
        const s = scoreAt(row.score || {}, row.t, r + (fh - 1) / 2, c + (fw - 1) / 2) + rng() * 0.3;
        if (s > bs) { bs = s; best = [r, c, fh, fw]; }
      }
    }
    return best ? stamp(best[0], best[1], best[2], best[3], row.t, row.landmark) : null;
  };
  // --- run the table ---
  for (const row of PLACEMENT) {
    if (row.need && !types.includes(row.need)) continue;
    if (row.minN && N < row.minN) continue;
    if (row.rural === 'only' && !rural) continue;
    if (rural && row.rural !== 'only' && row.t !== 'park') continue;   // a village is not a small city
    if (row.chance != null && rng() > row.chance) continue;
    place(row);
  }
  // --- per-city LANDMARKS: pinned structures the generator must honour (editor / sheet driven) ---
  for (const L of (opts.landmarks || city.landmarks || [])) {
    const [fh, fw] = TILE_FOOT[L.t] || [1, 1];
    if (L.r == null || L.c == null) { place({ t: L.t, foot: [fh, fw], landmark: true, score: L.score || {} }); continue; }
    let ok = true;
    for (let i = 0; i < fh && ok; i++) for (let j = 0; j < fw; j++) if (!(L.r + i < N && L.c + j < N)) { ok = false; break; }
    if (!ok) continue;
    for (let i = 0; i < fh; i++) for (let j = 0; j < fw; j++) C[L.r + i][L.c + j] = null;
    stamp(L.r, L.c, fh, fw, L.t, true);
  }
  // --- THE LINE: a metro cut laid in a STRAIGHT ROW across the city ---
  // Everything else here is placed by a concentric-ring score, which is why every city came out
  // as squares-inside-squares. The metro is the one feature that runs in a LINE — the tiles
  // overshoot their cells so consecutive stations join into one continuous 13u-deep trench you
  // can be knocked into. Towns and up: a real transit city needs the population to justify it.
  if (!rural && N >= 4) {
    const row = 1 + ((rng() * (N - 2)) | 0);                       // never the outermost row
    const span = N >= 6 ? 3 : 2;
    const start = Math.max(0, Math.min(N - span - waterCols, 1 + ((rng() * (N - span)) | 0)));
    plan.metroRow = row;
    for (let i = 0; i < span; i++) {
      const c = start + i;
      if (freeAt(row, c)) C[row][c] = { t: 'metro', v: i === 0 ? 0 : (rng() < 0.45 ? 0 : 1) };
    }
  }
  // --- the base fill: whatever the table left open becomes the fabric of the city ---
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!freeAt(r, c)) continue;
    // A VILLAGE IS NOT A SMALL CITY. Rural places got filled with commercial and residential
    // blocks, so a hamlet in the hills read as a downtown with fewer buildings. They now fill
    // with FARMLAND — a hard core of homes at the centre, open country everywhere else.
    const t = rural
      ? (edge(r, c) === 0 ? 'residential' : rng() < 0.82 ? 'farmland' : 'residential')
      : (edge(r, c) <= mid * 0.55 ? 'commercial' : rng() < 0.62 ? 'residential' : 'commercial');
    // ⚠ residential variant 2 is TOWERS-IN-THE-PARK — four-storey walk-ups. A village was getting
    // apartment blocks, which is the single loudest thing wrong with the countryside.
    let v = (rng() * (VARIANTS[t] || 1)) | 0;
    if (rural && t === 'residential' && v === 2) v = rng() < 0.5 ? 0 : 1;
    // ⚠ Farmland variants are a PATCHWORK, not a dice roll. Rolled independently, three of four
    // fields in a hamlet came up as orchards and the whole village was one crop. Offsetting by
    // position guarantees adjacent fields differ — which is also what real farmland looks like.
    if (t === 'farmland') v = (r * 2 + c + ((rng() * 3) | 0)) % VARIANTS.farmland;
    C[r][c] = { t, v };
  }
  plan.rural = rural;
  // --- structural budget: farthest-from-center overflow becomes plaza (open ground) ---
  // A LANDMARK is never demoted — an airport that turns into a car park is not an airport — and a
  // covered `ref` cell isn't its own structure, so it can't be spent twice.
  const OPEN = { water: 1, park: 1, plaza: 1, farmland: 1 };
  const structural = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = C[r][c];
    // farmland carries only 2-3 cover pieces, so it doesn't eat the structural budget the way a
    // block of towers does — a rural map keeps ALL its country instead of being plaza'd flat.
    if (cell && !cell.ref && !cell.landmark && !OPEN[cell.t]) structural.push([r, c, edge(r, c)]);
  }
  structural.sort((a, b) => a[2] - b[2]);
  const cap = structCap(N);
  for (let i = cap; i < structural.length; i++) C[structural[i][0]][structural[i][1]] = { t: 'plaza', v: (rng() * 2) | 0 };
  // ⚠ sockets are derived LAST, after the density budget has demoted whatever it is going to
  // demote. They used to run before it, so a cell plaza'd by the budget kept the neighbour data
  // of the tower it used to be, and its neighbours kept fences facing a district that was gone.
  computeSockets(plan);
  buildRoads(plan, rng);
  return plan;
}

// ---- EDGE SOCKETS: every cell learns what it is next to ---------------------------------------
// ⚠ THE STRUCTURAL FIX. Until this existed a builder received only (cx, cz, variant) — it never
// knew its own (row, col), its neighbours, or which way it faced. That is why fences ran on all
// four sides regardless of what was next door, why nothing could meet its neighbour, and why the
// metro had to be hacked by making every station OVERSHOOT its own cell and hope the overlap
// lined up. Sockets are the general form of that hack.
//   'edge'   the map boundary          'water'  the shore
//   'same'   an identical district      'open'   a park or plaza
//   'street' a real street between two different districts
// Exported because the MAP MAKER has to re-derive them: paint a park next to a barracks and the
// barracks' fence must know, or the editor is drawing a lie.
export function computeSockets(plan) {
  const N = plan.N, C = plan.cells, mid = (N - 1) / 2;
  if (!C) return plan;
  const DIRS = { n: [-1, 0], e: [0, 1], s: [1, 0], w: [0, -1] };
  const RANK = { water: 3, street: 2, open: 1, same: 0, edge: 0 };
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = C[r][c]; if (!cell) continue;
    cell.r = r; cell.c = c;
    const nb = {}, edge = {};
    for (const d in DIRS) {
      const nr = r + DIRS[d][0], nc = c + DIRS[d][1];
      const o = (nr >= 0 && nr < N && nc >= 0 && nc < N) ? C[nr][nc] : undefined;
      nb[d] = o ? o.t : null;
      edge[d] = !o ? 'edge' : o.t === 'water' ? 'water'
              : o.t === cell.t ? 'same'
              : (o.t === 'park' || o.t === 'plaza') ? 'open' : 'street';
    }
    cell.nb = nb; cell.edge = edge;
    // FRONTAGE — which way this tile presents itself. A dock faces the sea; a shop faces the
    // busiest street; ties break toward the city centre so a block never picks a side at random.
    let best = 's', bs = -1e9;
    for (const d of ['n', 'e', 's', 'w']) {
      const s = RANK[edge[d]] * 10 - (Math.abs(r + DIRS[d][0] - mid) + Math.abs(c + DIRS[d][1] - mid));
      if (s > bs) { bs = s; best = d; }
    }
    cell.face = best;
    // A CORNER is a cell with streets on two ADJACENT sides — where a bodega goes.
    const st = (d) => edge[d] === 'street' || edge[d] === 'open' || edge[d] === 'edge';
    cell.corner = (st('n') && st('e')) ? 'ne' : (st('e') && st('s')) ? 'es'
                : (st('s') && st('w')) ? 'sw' : (st('w') && st('n')) ? 'wn' : null;
  }
  return plan;
}

// ---- THE MAP MAKER'S EDIT LAYER ---------------------------------------------------------------
// Hand-painted cells are stored SEPARATELY from the generated plan as { "r,c": {t, v, lock} }, so
// the generator stays the author of everything you haven't touched: reroll the seed and your edits
// survive, because they are re-applied afterwards. This lives in the PLANNER, not the HUD, because
// after an edit the sockets and the ROAD GRAPH have to be re-derived — a painted park really does
// downgrade the street beside it, and a painted airport really does close the road through it.
//   { t }            paint that tile (footprint tiles stamp their whole rectangle)
//   { t, lock:true } a LOCKED cell — the generator's own choice, frozen against rerolls
//   { t:'water' }    paint sea; { t:'plaza' } is the eraser-to-open-ground
export function clearFootprint(plan, r, c) {
  const C = plan.cells, cell = C[r] && C[r][c];
  if (!cell) return;
  const [ar, ac] = cell.ref || [r, c];
  const a = C[ar] && C[ar][ac];
  const fh = (a && a.fh) || 1, fw = (a && a.fw) || 1;
  for (let i = 0; i < fh; i++) for (let j = 0; j < fw; j++) {
    if (C[ar + i] && C[ar + i][ac + j]) C[ar + i][ac + j] = { t: 'plaza', v: 0 };
  }
}
export function applyPlanEdits(plan, edits) {
  if (!edits || !plan || !plan.cells) return plan;
  const N = plan.N, C = plan.cells;
  let touched = false;
  for (const key in edits) {
    const e = edits[key]; if (!e || !e.t) continue;
    const [r, c] = key.split(',').map(Number);
    if (!(r >= 0 && c >= 0 && r < N && c < N)) continue;      // survives a grid RESIZE, just clipped
    const [fh, fw] = TILE_FOOT[e.t] || [1, 1];
    if (r + fh > N || c + fw > N) continue;                   // won't fit here — leave the generator's cell
    for (let i = 0; i < fh; i++) for (let j = 0; j < fw; j++) clearFootprint(plan, r + i, c + j);
    C[r][c] = { t: e.t, v: e.v || 0, fh, fw, painted: true, lock: !!e.lock, landmark: fh * fw > 1 };
    for (let i = 0; i < fh; i++) for (let j = 0; j < fw; j++) if (i || j) C[r + i][c + j] = { t: e.t, v: e.v || 0, ref: [r, c], painted: true };
    touched = true;
  }
  if (touched) { computeSockets(plan); buildRoads(plan, mulberry((plan.seed * 131 + plan.N * 17) | 0)); }
  return plan;
}

// The flagship — the hand-tuned WHITE CITY the engine shipped with, expressed as a plan
// (world.js keeps its bespoke builder for this one; the planner just needs its card + districts).
export function thresholdPlan() {
  return {
    name: 'THE WHITE CITY', country: 'Threshold Treaty Zone', popType: 'City', popLabel: 'CITY · POP 1.2M',
    types: ['Commercial', 'Industrial', 'Military'], crime: 38, safety: 62, seed: 0, N: 5, arena: 240,
    water: true, waterCols: 1, flagship: true, cells: null,
  };
}

// The TILE PROVING GROUND — every tile type laid out on one map for review (the map-maker's bench).
export function galleryPlan() {
  // ⚠ DERIVED, never hand-listed. This was a literal array and it had already drifted — `plaza`
  // was missing, so plaza variants could not be reviewed on the proving ground at all. A new tile
  // now shows up here for free, which is the whole point of the bench.
  const order = Object.keys(TILE_INFO);
  const N = 5;
  const plan = {
    name: 'TILE PROVING GROUND', country: 'Registry Test Range', popType: 'City', popLabel: 'EVERY TILE · FOR REVIEW',
    types: ['All'], crime: 0, safety: 100, seed: 1, N, arena: N * CELL / 2, water: true, waterCols: 1, flagship: false,
    cells: Array.from({ length: N }, () => Array(N).fill(null)),
  };
  let i = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c === N - 1) { plan.cells[r][c] = { t: 'water' }; continue; }
    const t = order[i % order.length];
    plan.cells[r][c] = { t, v: Math.floor(i / order.length) % (VARIANTS[t] || 1) };
    i++;
  }
  // ⚠ THE BENCH HAS TO BE A REAL PLAN. This used to hand back bare cells with no sockets and no
  // road graph, so every socket-aware tile (temple precinct, military perimeter, the bodega, farm
  // hedgerows) behaved differently here than in a real city — and the first tile to read
  // `cell.edge` without a guard threw outright. If the proving ground isn't built the same way a
  // city is, it is not proving anything.
  computeSockets(plan);
  buildRoads(plan, mulberry(1));
  return plan;
}

// district naming for the news desk + lower thirds ("STRUCTURE COLLAPSE — THE MINEWORKS")
export function districtNameAt(plan, x, z) {
  if (!plan) return null;
  if (!plan.cells) {   // flagship keeps its canon names
    if (x > 150) return 'THE HARBOR FRONT';
    if (x < -140 && z > 140) return 'THE GARRISON';
    if (x < -140 && z > -130) return 'MEMORIAL PARK';
    if (z < -60) return 'DOWNTOWN';
    if (z > 60) return 'THE SOUTHSIDE';
    return 'MIDTOWN PLAZA';
  }
  const N = plan.N, A = plan.arena, K = plan.cell || CELL;
  const c = Math.max(0, Math.min(N - 1, Math.floor((x + A) / K)));
  const r = Math.max(0, Math.min(N - 1, Math.floor((z + A) / K)));
  const cell = plan.cells[r] && plan.cells[r][c];
  if (!cell) return 'THE OUTSKIRTS';
  if (cell.t === 'water') return 'THE WATERFRONT';
  return 'THE ' + (TILE_INFO[cell.t] ? TILE_INFO[cell.t].label : 'DISTRICT');
}
