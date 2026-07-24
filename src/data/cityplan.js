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
import { pickLandmarks, nameLandmark, faithOf, POP_TIER } from './landmarks.js';
export { POP_TIER };

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
  forest:      { label: 'THE WOODS',   c: '#3f7a3a' },
  mountain:    { label: 'THE HEIGHTS', c: '#8a8478' },
  airport:     { label: 'THE FIELD',   c: '#bfc8d8' },
  railyard:    { label: 'THE YARDS',   c: '#b08d5a' },
  // --- LANDMARKS (chosen per city by data/landmarks.js, never by a fixed placement row) ---
  monument:    { label: 'THE MONUMENT', c: '#e8dcc0' },
  tower:       { label: 'THE SPIRE',    c: '#cfe0f0' },
  cathedral:   { label: 'THE GREAT HOUSE', c: '#f0e0b0' },
  palace:      { label: 'THE PALACE',   c: '#f5d99a' },
  fortress:    { label: 'THE CITADEL',  c: '#a89880' },
  university:  { label: 'THE COLLEGE',  c: '#a8e08a' },
};
export const VARIANTS = { residential: 3, commercial: 3, company: 2, industrial: 3, military: 2, political: 2, educational: 2, temple: 3, mining: 2, seaport: 2, resort: 2, park: 2, plaza: 2, stadium: 2, hospital: 2, market: 2, metro: 2, farmland: 3, forest: 3, mountain: 2, airport: 2, railyard: 2, monument: 4, tower: 3, cathedral: 4, palace: 2, fortress: 2, university: 2 };

// ---- MULTI-CELL FOOTPRINTS ------------------------------------------------------------------
// A tile used to be exactly one 96u cell, which is why there could be no airport, no rail yard,
// and no stadium that read as a stadium. A footprint tile claims a RECTANGLE: the ANCHOR cell
// holds the real structure and knows its own size, and every cell it covers holds a `ref` back to
// the anchor so the planner, the roads, the districts and the editor all agree on who owns it.
//   anchor  { t, v, r, c, fh, fw }          covered  { t, ref: [ar, ac] }
// `foot` is [rows, cols]; the planner also tries it ROTATED, so a 1×3 yard can run either way.
export const isRef = (cell) => !!(cell && cell.ref);

// ---- SIZE TIERS -------------------------------------------------------------------------------
// ⚠ A STRUCTURE IS NOT ONE SIZE. A port is a fishing wharf in a small town and a container terminal
// in a mega city — the same TYPE at a different SCALE, not two different tiles. Before this every
// type had exactly one footprint, so a village got the same institutional slab as Tokyo and there
// was no way to author "a small one here, a big one there".
//
// Each entry is a ladder, smallest first:
//   f     [rows, cols] footprint          n     what a structure of this size is CALLED
//   tier  smallest population tier that earns it (1 Village … 7 Mega City)
//
// The builder is handed `ctx.W`/`ctx.D` for the WHOLE footprint and sizes its contents to fit — so
// a 1×1 wharf has one berth and a 2×2 terminal has four, from the same code. The name goes on the
// cell, so the news desk says THE CONTAINER TERMINAL rather than THE DOCKLANDS.
// ⚠ Some footprints have a MEANINGFUL orientation and must not be rotated to fit. A port runs
// ALONG the shore — rotated, a 3×1 quay becomes a 1×3 pier sticking three blocks inland.
export const NO_ROTATE = { seaport: 1 };
export const TILE_SIZES = {
  seaport:     [{ f: [1, 1], n: 'FISHING WHARF',     tier: 2 },
                { f: [2, 1], n: 'CARGO QUAY',        tier: 4 },
                { f: [3, 1], n: 'CONTAINER TERMINAL', tier: 6 }],
  university:  [{ f: [1, 1], n: 'THE COLLEGE',       tier: 3 },
                { f: [1, 2], n: 'THE UNIVERSITY',    tier: 5 },
                { f: [2, 2], n: 'THE CAMPUS',        tier: 6 }],
  hospital:    [{ f: [1, 1], n: 'THE CLINIC',        tier: 1 },
                { f: [1, 2], n: 'GENERAL HOSPITAL',  tier: 5 },
                { f: [2, 2], n: 'THE MEDICAL CENTRE', tier: 7 }],
  market:      [{ f: [1, 1], n: 'THE MARKET',        tier: 1 },
                { f: [1, 2], n: 'THE GRAND BAZAAR',  tier: 5 }],
  military:    [{ f: [1, 1], n: 'THE OUTPOST',       tier: 2 },
                { f: [1, 2], n: 'THE GARRISON',      tier: 4 },
                { f: [2, 2], n: 'THE AIRBASE',       tier: 6 }],
  industrial:  [{ f: [1, 1], n: 'THE WORKS',         tier: 2 },
                { f: [2, 1], n: 'THE PLANT',         tier: 5 },
                { f: [2, 2], n: 'THE INDUSTRIAL PARK', tier: 7 }],
  company:     [{ f: [1, 1], n: 'THE OFFICE BLOCK',  tier: 3 },
                { f: [2, 1], n: 'THE CORPORATE CORE', tier: 6 }],
  stadium:     [{ f: [1, 1], n: 'THE ARENA',         tier: 4 },
                { f: [2, 2], n: 'THE STADIUM',       tier: 6 },
                { f: [2, 3], n: 'THE OLYMPIC BOWL',  tier: 7 }],
  airport:     [{ f: [1, 2], n: 'THE AIRSTRIP',      tier: 4 },
                { f: [2, 2], n: 'THE REGIONAL FIELD', tier: 6 },
                { f: [2, 3], n: 'INTERNATIONAL',     tier: 7 }],
  railyard:    [{ f: [1, 2], n: 'THE SIDINGS',       tier: 4 },
                { f: [1, 3], n: 'THE MARSHALLING YARDS', tier: 6 }],
  palace:      [{ f: [1, 1], n: 'THE RESIDENCY',     tier: 3 },
                { f: [1, 2], n: 'THE PALACE',        tier: 5 }],
  fortress:    [{ f: [1, 1], n: 'THE REDOUBT',       tier: 3 },
                { f: [2, 2], n: 'THE CITADEL',       tier: 5 }],
  educational: [{ f: [1, 1], n: 'THE SCHOOL',        tier: 2 },
                { f: [1, 2], n: 'THE FACULTY',       tier: 6 }],
  resort:      [{ f: [1, 1], n: 'THE HOTEL',         tier: 3 },
                { f: [1, 2], n: 'THE RESORT STRIP',  tier: 6 }],
};
// The default footprint for a type — used when nothing asks for a specific size (the map maker's
// plain paint, and every caller that predates size tiers). Middle of the ladder, so painting a
// stadium gives you a stadium rather than the smallest or the most extravagant thing on the list.
export const TILE_FOOT = (() => {
  const out = {};
  for (const t in TILE_SIZES) {
    const L = TILE_SIZES[t];
    out[t] = L[Math.min(L.length - 1, Math.max(0, Math.floor((L.length - 1) / 2)))].f;
  }
  return out;
})();
// Which size of a thing THIS city gets. Biggest it has earned and that fits, with a chance of
// dropping a rung so two mega cities don't produce identical skylines.
export function sizeFor(t, popTier, rng, N, want) {
  const L = TILE_SIZES[t];
  if (!L) return { f: [1, 1], n: null, i: 0 };
  if (want != null && L[want]) return { ...L[want], i: want };
  let best = 0;
  for (let i = 0; i < L.length; i++) {
    const [fh, fw] = L[i].f;
    if (L[i].tier <= popTier && fh <= N && fw <= N) best = i;
  }
  // a modest chance to build one rung smaller — variety, and it keeps a big city from being
  // uniformly maximal
  if (best > 0 && rng && rng() < 0.3) best--;
  return { ...L[best], i: best };
}

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
  { t: 'seaport',     need: 'seaport',     rural: 'ok', score: { water: 4 } },
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
  // ⚠ THE SPECIAL STRUCTURES ARE NOT LISTED HERE ANY MORE. Airport, stadium, rail yard and the
  // new monument/tower/cathedral/palace/fortress/university are chosen per city by
  // `pickLandmarks` (data/landmarks.js) from a budget derived off the city's own row, and are
  // injected into this table at generate time. Adding one as a fixed row here would give it to
  // every city again, which is exactly what made them read as furniture.
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
  // --- THE WILD. What is left over at the edge of the map is not a vacant lot — it is the country
  // the city was built in. `biome` decides which: woods, jungle or bare rock.
  { t: 'forest',   biome: ['forest', 'jungle'], score: { rim: 3, jitter: 1 } },
  { t: 'forest',   biome: ['forest', 'jungle'], minN: 5, score: { rim: 3, cluster: 2 } },
  { t: 'forest',   biome: ['forest', 'jungle'], minN: 7, score: { rim: 2, cluster: 2 } },
  { t: 'mountain', biome: ['mountain'], score: { rim: 4 } },
  { t: 'mountain', biome: ['mountain'], minN: 5, score: { rim: 3, cluster: 2 } },
  { t: 'mountain', biome: ['mountain'], minN: 7, score: { rim: 3, cluster: 2 } },
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

// ---- RELIEF: what the land under this city is doing -------------------------------------------
// The terrain was a table everywhere. `plan.relief` raises it before anything is built (see
// world._buildRelief), and the built-up cells are then levelled onto terraces so a block stands on
// flat ground. `amp` is the peak-to-trough height in base units — 0 is the old flat world.
//   flat       nothing (the default; costs nothing and changes nothing)
//   hills      gentle rolling ground, sightlines break over a rise
//   valley     ringed by high ground — the city sits in a bowl
//   plateau    the town stands up on a shelf, ground falls away at the rim
//   coastal    falls steadily toward the water
//   mountains  serious relief at the rim, a hard bowl in the middle
export const RELIEFS = {
  flat:      { kind: 'flat',      amp: 0 },
  hills:     { kind: 'hills',     amp: 16 },
  valley:    { kind: 'valley',    amp: 30 },
  plateau:   { kind: 'plateau',   amp: 26 },
  coastal:   { kind: 'coastal',   amp: 14 },
  mountains: { kind: 'mountains', amp: 54 },
};
export const RELIEF_KEYS = Object.keys(RELIEFS);
// What kind of country is this? Derived from the sheet — `terrain` if the row has one, otherwise a
// sane read of what the city IS. ⚠ Never invents: an uncoded city on no water is 'hills', which is
// the least opinionated thing that isn't a table.
export function reliefFor(city, water) {
  let key = (city && city.terrain && RELIEFS[city.terrain]) ? city.terrain : null;
  if (!key) {
    const types = (city && city.types || []).map(t => t.toLowerCase());
    key = types.includes('mining') ? 'hills' : water ? 'coastal' : 'hills';
  }
  // ⚠ A PORT IS ON THE SEA. A city with a shoreline cannot also be ringed by mountains — the water
  // column would sit at the bottom of a wall. Coastal cities soften to a slope down to the water.
  if (water && (key === 'mountains' || key === 'valley')) key = 'coastal';
  return RELIEFS[key];
}

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
  mining: 1, resort: 2, park: 1, plaza: 1, farmland: 0, forest: 0, mountain: 0, water: 0,
};
export const NO_RESCUE = { water: 1, forest: 1, mountain: 1, farmland: 1, park: 1, plaza: 1 };
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
  // ⚠ WILD GROUND IS NOT LANDLOCKED, IT IS WILD. The rescue exists so a BUILDING is never
  // unreachable; running a street to every patch of forest, mountain or field turned an all-woods
  // map into a street grid with trees in it. Nobody needs vehicle access to a wood.
  // ⚠ EXPORTED, because the map maker's validator has to apply the SAME rule — when it didn't, the
  // tool reported 32 "landlocked" cells that were open country doing exactly what they should.
  let rescued = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = C[r][c];
    if (!cell || cell.ref || NO_RESCUE[cell.t]) continue;
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
  // ---- ROUNDABOUTS are a DECISION, not a geometry rule ----------------------------------------
  // The first pass built one at every junction where an arterial met anything, which on a city
  // with a highway ring meant nineteen of them — roundabouts scattered like confetti down a
  // straight road. A city gets AT MOST a couple, at its genuinely busiest crossings, and they are
  // chosen here so the road geometry can TRIM its ribbons back to them instead of running through.
  plan.roundabouts = [];
  if (!rural && N >= 5) {
    const cands = [];
    for (let r = 1; r < N; r++) for (let c = 1; c < N; c++) {
      const jn = junctionAt(plan, r, c);
      if (!jn || jn.deg < 3) continue;
      const cls = [jn.n, jn.e, jn.s, jn.w].filter(Boolean).sort((a, b) => b - a);
      if (cls[0] < R_ARTERIAL || cls[1] < R_STREET) continue;
      // busiest crossing wins: total class weight, degree, and a nudge toward the centre
      cands.push({ r, c, s: cls.reduce((a, b) => a + b, 0) * 2 + jn.deg * 3
        - (Math.abs(r - N / 2) + Math.abs(c - N / 2)) + rng() * 2 });
    }
    cands.sort((a, b) => b.s - a.s);
    const want = N >= 8 ? 2 : 1;
    for (const cd of cands) {
      if (plan.roundabouts.length >= want) break;
      // never two in a row — they must read as landmarks, not as a pattern
      if (plan.roundabouts.some(([r2, c2]) => Math.abs(r2 - cd.r) + Math.abs(c2 - cd.c) < 3)) continue;
      plan.roundabouts.push([cd.r, cd.c]);
    }
  }
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
  // THE METRIC CONTRACT — how tall the PEOPLE are (world units; 9.6u = today's 1.8m heroes).
  // Distinct from `cell` (map footprint): doors, storey heights, lamps and cars derive from this,
  // so a game with taller or shorter characters gets architecture proportioned to THEM.
  const humanH = Math.max(4.8, Math.min(19.2, opts.humanH || 9.6));
  const rng = mulberry((seed * 7919 + city.pop % 997 + city.name.length * 31) | 0);
  const popType = opts.popType || city.popType;
  const N = Math.max(2, Math.min(9, opts.N || GRID_BY_POP[popType] || 5));
  const cell = Math.max(CELL_RANGE[0], Math.min(CELL_RANGE[1], opts.cell || CELL));
  const types = city.types.length ? city.types.map(t => t.toLowerCase()) : ['company', 'industrial'];
  const wantWater = types.includes('seaport') || types.includes('resort');
  const waterCols = Math.max(0, Math.min(N - 1, opts.waterCols != null ? opts.waterCols : (wantWater ? 1 : 0)));
  const plan = {
    metric: { humanH },
    name: city.name, country: city.country, popType, popLabel: popLabel(popType, city.pop),
    types: city.types, crime: city.crime, safety: city.safety, seed, N,
    cell, scale: cell / CELL, arena: N * cell / 2,
    water: waterCols > 0, waterCols, flagship: false,
    culture: cultureOf(city), region: regionOf(cultureOf(city)),
    // ⚠ the water guard applies to an OVERRIDE too — forcing 'mountains' on a port would otherwise
    // build a sea running over a ridge, which is exactly the bug the guard exists to prevent
    relief: reliefFor(opts.relief ? { terrain: opts.relief, types: city.types } : city, waterCols > 0),
    biome: opts.biome || city.biome || null,
    cells: Array.from({ length: N }, () => Array(N).fill(null)),
  };
  const water = plan.water;
  const C = plan.cells, mid = (N - 1) / 2;
  const rural = RURAL_POP[popType] || N <= 3;
  const popTier = POP_TIER[popType] || 5;      // what size of thing this city has earned
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
  const stamp = (r, c, fh, fw, t, landmark, sname, si) => {
    let v = (rng() * (VARIANTS[t] || 1)) | 0;
    // ⚠ residential variant 2 is TOWERS-IN-THE-PARK. The base fill already guards against putting
    // apartment blocks in a hamlet; the PLACEMENT table has to guard too, or the village CORE —
    // the one cell that is definitely houses — comes out as a tower.
    if (rural && t === 'residential' && v === 2) v = rng() < 0.5 ? 0 : 1;
    C[r][c] = { t, v, fh, fw, landmark: !!landmark, sname: sname || null, sz: si || 0 };
    for (let i = 0; i < fh; i++) for (let j = 0; j < fw; j++) {
      if (i || j) C[r + i][c + j] = { t, v, ref: [r, c] };
    }
    // the anchor is stamped with its name later; ref cells resolve through `ref` when asked
    (placed[t] || (placed[t] = [])).push([r, c]);
    return [r, c];
  };
  // Find the best free rectangle for a row, trying the footprint BOTH ways round. The SIZE comes
  // from the ladder (see TILE_SIZES) unless the row pins one — and if the chosen size won't fit
  // anywhere, it steps DOWN the ladder rather than dropping the structure entirely. A crowded map
  // should give you a small port, not no port.
  const place = (row) => {
    const ladder = TILE_SIZES[row.t];
    let tries;
    // ⚠ THE LADDER WINS when the type has one. `row.foot` is a FLOOR for types with no ladder (and
    // for the landmark pool's fit check) — if it short-circuited the ladder, giving a type size
    // tiers would silently do nothing for every landmark, which is where most of them are used.
    if (!ladder && row.foot) tries = [{ f: row.foot, n: row.sname || null, i: row.sz || 0 }];
    else if (ladder) {
      const pick = sizeFor(row.t, popTier, row.big ? null : rng, N, row.sz);
      tries = [];
      for (let i = pick.i; i >= 0; i--) tries.push({ ...ladder[i], i });
    } else tries = [{ f: [1, 1], n: null, i: 0 }];
    for (const sz of tries) {
      const [fh0, fw0] = sz.f;
      const shapes = (fh0 === fw0 || NO_ROTATE[row.t]) ? [[fh0, fw0]] : [[fh0, fw0], [fw0, fh0]];
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
      if (best) return stamp(best[0], best[1], best[2], best[3], row.t, row.landmark, sz.n, sz.i);
    }
    return null;
  };
  // --- THE LANDMARKS GO FIRST. They are the reason this city is worth fighting in, so they get
  // first pick of the ground; everything else arranges itself around them. Each one is named here
  // and the name rides on the cell, so districtNameAt, the news desk and the atlas all cite it.
  plan.landmarks = [];
  for (const L of pickLandmarks(city, popType, rng, N)) {
    const rc = place({ ...L, landmark: true });
    if (!rc) continue;
    const cell = C[rc[0]][rc[1]];
    cell.landmark = true;
    cell.lname = nameLandmark(L.t, city, plan.region, rng);
    cell.faith = L.t === 'cathedral' ? faithOf(plan.region) : null;
    plan.landmarks.push({ t: L.t, name: cell.lname, r: rc[0], c: rc[1], fh: cell.fh, fw: cell.fw, why: L.why });
  }
  // --- run the table ---
  for (const row of PLACEMENT) {
    if (row.need && !types.includes(row.need)) continue;
    if (row.biome && !row.biome.includes(plan.biome)) continue;
    if (row.minN && N < row.minN) continue;
    if (row.rural === 'only' && !rural) continue;
    // `rural: 'ok'` = a row that belongs in the country too. A coastal village IS a fishing
    // village; without this the rural gate silently denied it the one thing it is defined by.
    if (rural && row.rural !== 'only' && row.rural !== 'ok' && row.t !== 'park') continue;
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
  const OPEN = { water: 1, park: 1, plaza: 1, farmland: 1, forest: 1, mountain: 1 };
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
    // the painted SIZE (an index into the type's ladder) decides the footprint; without one it
    // falls back to the type's default, which is what every edit made before size tiers existed
    const L = TILE_SIZES[e.t];
    const chosen = (L && e.sz != null && L[e.sz]) ? L[e.sz] : null;
    const [fh, fw] = chosen ? chosen.f : (TILE_FOOT[e.t] || [1, 1]);
    if (r + fh > N || c + fw > N) continue;                   // won't fit here — leave the generator's cell
    for (let i = 0; i < fh; i++) for (let j = 0; j < fw; j++) clearFootprint(plan, r + i, c + j);
    C[r][c] = { t: e.t, v: e.v || 0, fh, fw, painted: true, lock: !!e.lock, landmark: fh * fw > 1,
                sname: chosen ? chosen.n : null, sz: e.sz || 0 };
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
    metric: { humanH: 9.6 },
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
  // ⚠ THE BENCH SIZES ITSELF TO THE LIBRARY. It was a hard-coded 5×5 — 20 buildable cells — so the
  // moment the library passed 20 tiles the last ones silently never appeared on the proving ground.
  // A bench you can outgrow without noticing is worse than no bench.
  const N = Math.max(5, Math.ceil(Math.sqrt(order.length + 1)) + 1);
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
  let cell = plan.cells[r] && plan.cells[r][c];
  if (!cell) return 'THE OUTSKIRTS';
  if (cell.ref) cell = plan.cells[cell.ref[0]][cell.ref[1]] || cell;   // a landmark is one place
  if (cell.t === 'water') return 'THE WATERFRONT';
  if (cell.lname) return cell.lname;            // "THE SPIRE OF TOKYO", not "THE DISTRICT"
  if (cell.sname) return cell.sname;            // "THE CONTAINER TERMINAL", not "THE DOCKLANDS"
  return 'THE ' + (TILE_INFO[cell.t] ? TILE_INFO[cell.t].label : 'DISTRICT');
}

// ---- VALIDATION — the checks that found the real bugs. ONE implementation, exported: the ATLAS
// panel, the headless sweep and any future test all call THIS. (It lived in hud.js first; when the
// tool and the test drifted they disagreed by 32 phantom problems — never reimplement it.)
export function validatePlan(plan) {
  const out = [];
  if (!plan || !plan.cells) return out;
  const N = plan.N, C = plan.cells;
  let landlocked = 0, orphan = 0, holes = 0, offgrid = 0, nosock = 0, structural = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const cell = C[r][c];
    if (!cell) { out.push({ bad: 1, t: `EMPTY CELL at ${r},${c}` }); continue; }
    if (!cell.edge || !cell.nb) nosock++;
    if (cell.ref) {
      const a = C[cell.ref[0]] && C[cell.ref[0]][cell.ref[1]];
      if (!a || a.ref || a.t !== cell.t) orphan++;
      continue;
    }
    if (cell.t !== 'water' && cell.t !== 'park' && cell.t !== 'plaza' && cell.t !== 'farmland') structural++;
    const fh = cell.fh || 1, fw = cell.fw || 1;
    if (r + fh > N || c + fw > N) offgrid++;
    else for (let i = 0; i < fh; i++) for (let j = 0; j < fw; j++) {
      if (!i && !j) continue;
      const o = C[r + i][c + j];
      if (!o || !o.ref || o.ref[0] !== r || o.ref[1] !== c) holes++;
    }
    // the SAME rule the generator uses (NO_RESCUE) — open country is not landlocked, it is
    // open country, and a validator that doesn't know that reports phantom problems.
    if (NO_RESCUE[cell.t] || !plan.roads) continue;
    if (!(plan.roads.h[r][c] || plan.roads.h[r + 1][c] || plan.roads.v[r][c] || plan.roads.v[r][c + 1])) landlocked++;
  }
  if (landlocked) out.push({ bad: 1, t: `${landlocked} LANDLOCKED — no road on any side` });
  if (orphan) out.push({ bad: 1, t: `${orphan} ORPHANED footprint cells` });
  if (holes) out.push({ bad: 1, t: `${holes} HOLES in a footprint` });
  if (offgrid) out.push({ bad: 1, t: `${offgrid} footprints RUN OFF the grid` });
  if (nosock) out.push({ bad: 1, t: `${nosock} cells have NO SOCKETS` });
  out.push({ bad: 0, t: `${structural} structural · ${N * N} cells · ${plan.arena * 2}u across` });
  return out;
}
