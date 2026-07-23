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
  stadium:     { label: 'THE BOWL',    c: '#8fe08a' },
  hospital:    { label: 'MEDICAL',     c: '#e8e2d6' },
  market:      { label: 'THE MARKET',  c: '#e8a24a' },
  metro:       { label: 'THE LINE',    c: '#7fd0c0' },
  farmland:    { label: 'THE COUNTY',  c: '#9ab061' },
};
export const VARIANTS = { residential: 3, commercial: 3, company: 2, industrial: 3, military: 2, political: 2, educational: 2, temple: 3, mining: 2, seaport: 2, resort: 2, park: 2, plaza: 2, stadium: 2, hospital: 2, market: 2, metro: 2, farmland: 3 };

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
  // --- THE LINE: a metro cut laid in a STRAIGHT ROW across the city ---
  // Everything else here is placed by a concentric-ring score, which is why every city came out
  // as squares-inside-squares. The metro is the one feature that runs in a LINE — the tiles
  // overshoot their cells so consecutive stations join into one continuous 13u-deep trench you
  // can be knocked into. Towns and up: a real transit city needs the population to justify it.
  const rural = N <= 3 || city.popType === 'Village' || city.popType === 'Small Town';
  if (!rural && N >= 4) {
    const row = 1 + ((rng() * (N - 2)) | 0);                       // never the outermost row
    const span = N >= 6 ? 3 : 2;
    const start = Math.max(0, Math.min(N - span - (water ? 1 : 0), 1 + ((rng() * (N - span)) | 0)));
    plan.metroRow = row;
    for (let i = 0; i < span; i++) {
      const c = start + i;
      const idx = free.findIndex(([r2, c2]) => r2 === row && c2 === c);
      if (idx >= 0) { const rc = free.splice(idx, 1)[0]; C[rc[0]][rc[1]] = { t: 'metro', v: i === 0 ? 0 : (rng() < 0.45 ? 0 : 1) }; }
    }
  }
  // --- civic amenities: every real city has these regardless of what it's FAMOUS for ---
  // (bigger places get more of them — this is what makes two same-type cities feel different)
  put(take((r, c) => -Math.abs(edge(r, c) - 1) * 2), 'hospital');          // always a hospital
  if (N >= 5) put(take((r, c) => edge(r, c) * 1.5), 'stadium');           // the bowl sits out of the core
  if (N >= 4) put(take((r, c) => -edge(r, c)), 'market');                 // markets want footfall
  if (N >= 6) put(take((r, c) => -edge(r, c)), 'market');
  // --- the base fill ---
  const parks = N >= 6 ? 3 : N >= 5 ? 2 : 1;
  for (let i = 0; i < parks; i++) put(take((r, c) => -Math.abs(edge(r, c) - 1) + (rng() - 0.5)), 'park');
  while (free.length) {
    const [r, c] = free[0];
    // A VILLAGE IS NOT A SMALL CITY. Rural places got filled with commercial and residential
    // blocks, so a hamlet in the hills read as a downtown with fewer buildings. They now fill
    // with FARMLAND — a hard core of homes at the centre, open country everywhere else.
    const t = rural
      ? (edge(r, c) === 0 ? 'residential' : rng() < 0.78 ? 'farmland' : 'residential')
      : (edge(r, c) <= mid * 0.55 ? 'commercial' : rng() < 0.62 ? 'residential' : 'commercial');
    put(take((r2, c2) => (r2 === r && c2 === c) ? 9 : 0), t);
  }
  plan.rural = rural;
  // ---- EDGE SOCKETS: every cell learns what it is next to --------------------------------
  // ⚠ THE STRUCTURAL FIX. Until this existed a builder received only (cx, cz, variant) — it never
  // knew its own (row, col), its neighbours, or which way it faced. That is why fences ran on all
  // four sides regardless of what was next door, why nothing could meet its neighbour, and why the
  // metro had to be hacked by making every station OVERSHOOT its own cell and hope the overlap
  // lined up. Sockets are the general form of that hack.
  //   'edge'   the map boundary          'water'  the shore
  //   'same'   an identical district      'open'   a park or plaza
  //   'street' a real street between two different districts
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
  // --- structural budget: farthest-from-center overflow becomes plaza (open ground) ---
  const structural = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = C[r][c];
    // farmland carries only 2-3 cover pieces, so it doesn't eat the structural budget the way a
    // block of towers does — a rural map keeps ALL its country instead of being plaza'd flat.
    if (cell && cell.t !== 'water' && cell.t !== 'park' && cell.t !== 'plaza' && cell.t !== 'farmland') structural.push([r, c, edge(r, c)]);
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
