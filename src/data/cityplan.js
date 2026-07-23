// THRESHOLD — the CITY PLANNER. Turns a row of the world sheet (city type + population +
// indices) into a buildable PLAN on the sectional grid the White City proved out: 96-unit
// district cells separated by 22u streets (the ground texture draws one road ring per cell).
// world.buildCity(plan) raises the meshes; this file only decides WHAT goes WHERE.
//
// A plan: { name, country, popType, popLabel, types, crime, safety, seed,
//           N (cells per side), arena (half-extent = N*48), water (bool), waterCols,
//           cells[row][col] = { t: tileType, v: variant } | null (open street/plaza ground) }
// Tile types: residential commercial company industrial military political educational
//             temple mining seaport resort park plaza  (+ 'bridge' on water maps)
import { mulberry } from './news.js';

export const CELL = 96;                          // one district cell, matching the ground texture
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
};
export const VARIANTS = { residential: 3, commercial: 3, company: 2, industrial: 3, military: 2, political: 2, educational: 2, temple: 3, mining: 2, seaport: 2, resort: 2, park: 2, plaza: 2 };

const GRID_BY_POP = { 'Village': 3, 'Small Town': 3, 'Town': 4, 'Small City': 4, 'City': 5, 'Large City': 5, 'Mega City': 6 };
const STRUCT_CAP = 24;   // hard ceiling on structural (cover/fog) cells — perf + fog shader budget

export function popLabel(popType, pop) {
  const m = pop >= 1e6 ? (pop / 1e6).toFixed(1) + 'M' : pop >= 1e3 ? Math.round(pop / 1e3) + 'K' : String(pop);
  return `${popType.toUpperCase()} · POP ${m}`;
}

// The generator: deterministic for (city, seed) — reroll the seed, get a sibling city.
export function generatePlan(city, seed = 1) {
  const rng = mulberry((seed * 7919 + city.pop % 997 + city.name.length * 31) | 0);
  const N = GRID_BY_POP[city.popType] || 5;
  const types = city.types.length ? city.types.map(t => t.toLowerCase()) : ['company', 'industrial'];
  const water = types.includes('seaport') || types.includes('resort');
  const plan = {
    name: city.name, country: city.country, popType: city.popType, popLabel: popLabel(city.popType, city.pop),
    types: city.types, crime: city.crime, safety: city.safety, seed, N, arena: N * CELL / 2,
    water, waterCols: water ? 1 : 0, flagship: false,
    cells: Array.from({ length: N }, () => Array(N).fill(null)),
  };
  const C = plan.cells, mid = (N - 1) / 2;
  const free = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (water && c === N - 1) { C[r][c] = { t: 'water' }; continue; }   // the east shore
    free.push([r, c]);
  }
  const take = (pred) => {
    let best = -1, bs = -1e9;
    for (let i = 0; i < free.length; i++) { const s = pred(free[i][0], free[i][1]) + rng() * 0.3; if (s > bs) { bs = s; best = i; } }
    return best >= 0 ? free.splice(best, 1)[0] : null;
  };
  const put = (rc, t) => { if (rc) C[rc[0]][rc[1]] = { t, v: (rng() * (VARIANTS[t] || 1)) | 0 }; return rc; };
  const edge = (r, c) => Math.max(Math.abs(r - mid), Math.abs(c - mid));
  const nearWater = (r, c) => water ? -(N - 1 - c) : 0;

  // --- the specials, strongest identity first (city types drive the skyline) ---
  for (const t of types) {
    if (t === 'seaport') { put(take((r, c) => nearWater(r, c) * 4), 'seaport'); put(take((r, c) => nearWater(r, c) * 4), 'seaport'); }
    if (t === 'resort') { put(take((r, c) => nearWater(r, c) * 3 + (r > mid ? 1 : 0)), 'resort'); if (N >= 5) put(take((r, c) => nearWater(r, c) * 3), 'resort'); }
    if (t === 'political') put(take((r, c) => -edge(r, c) * 3), 'political');
    if (t === 'military') { const a = put(take((r, c) => edge(r, c) * 3 - nearWater(r, c)), 'military'); if (N >= 5 && a) put(take((r, c) => -(Math.abs(r - a[0]) + Math.abs(c - a[1])) * 2), 'military'); }
    if (t === 'mining') { const a = put(take((r, c) => edge(r, c) * 3), 'mining'); if (N >= 5 && a && rng() < 0.7) put(take((r, c) => -(Math.abs(r - a[0]) + Math.abs(c - a[1])) * 2), 'mining'); }
    if (t === 'educational') { const a = put(take((r, c) => -Math.abs(edge(r, c) - 1) * 2), 'educational'); if (N >= 5 && a) put(take((r, c) => -(Math.abs(r - a[0]) + Math.abs(c - a[1])) * 2), 'educational'); }
    if (t === 'temple') put(take((r, c) => -Math.abs(edge(r, c) - 1)), 'temple');
    if (t === 'company') { put(take((r, c) => -edge(r, c) * 2), 'company'); if (N >= 5) put(take((r, c) => -edge(r, c) * 2), 'company'); }
    if (t === 'industrial') { put(take((r, c) => edge(r, c) + nearWater(r, c) * 2), 'industrial'); if (N >= 5) put(take((r, c) => edge(r, c) + nearWater(r, c) * 2), 'industrial'); }
  }
  // --- the base city: commercial core, residential ring, green lungs ---
  const parks = N >= 6 ? 3 : N >= 5 ? 2 : 1;
  for (let i = 0; i < parks; i++) put(take((r, c) => -Math.abs(edge(r, c) - 1) + (rng() - 0.5)), 'park');
  while (free.length) {
    const [r, c] = free[0];
    put(take((r2, c2) => (r2 === r && c2 === c) ? 9 : 0), edge(r, c) <= mid * 0.55 ? 'commercial' : rng() < 0.62 ? 'residential' : 'commercial');
  }
  // --- structural budget: farthest-from-center overflow becomes plaza (open ground) ---
  const structural = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = C[r][c];
    if (cell && cell.t !== 'water' && cell.t !== 'park' && cell.t !== 'plaza') structural.push([r, c, edge(r, c)]);
  }
  structural.sort((a, b) => a[2] - b[2]);
  for (let i = STRUCT_CAP; i < structural.length; i++) C[structural[i][0]][structural[i][1]] = { t: 'plaza', v: (rng() * 2) | 0 };
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
  const order = ['residential', 'commercial', 'company', 'industrial', 'military', 'political', 'educational', 'temple', 'mining', 'seaport', 'resort', 'park'];
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
  const N = plan.N, A = plan.arena;
  const c = Math.max(0, Math.min(N - 1, Math.floor((x + A) / CELL)));
  const r = Math.max(0, Math.min(N - 1, Math.floor((z + A) / CELL)));
  const cell = plan.cells[r] && plan.cells[r][c];
  if (!cell) return 'THE OUTSKIRTS';
  if (cell.t === 'water') return 'THE WATERFRONT';
  return 'THE ' + (TILE_INFO[cell.t] ? TILE_INFO[cell.t].label : 'DISTRICT');
}
