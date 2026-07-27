// WAR WORLD ASCENDANTS — THE DISTRICT REACTION TABLE.
//
// Robert's brief: "we can have building types — a nuclear place, versus tourists are more peds,
// that kinda stuff. Wire in what we HAVE. Military bases. Leverage the city stuff and have it
// react. Leverage population or size and all that."
//
// ⚠ THIS IS NOT A CITY SIMULATION, AND THE CONSTRAINT IS THE POINT. No per-cell fields, no update
// loop, no land value, no pollution gradient. Ascendants is a fighting game — nobody will ever zone
// a district in it. The honest version is far narrower and far better: WHERE YOU FIGHT SHOULD
// CHANGE HOW THE FIGHT GOES. This file is a LOOKUP from tile type to a handful of reaction numbers,
// read at four existing choke points. It has no state and no tick.
//
// ⚠ ONE TABLE, NOT FOUR. Four hard-coded lookups scattered across pedestrians.js / police.js /
// game.js / hud.js is how a rule like this drifts until the four halves disagree about what a
// MILITARY district is. Every consumer imports THIS. Same law as `resistOf` and the damage codex:
// a surface that reads the engine cannot lie about it.
//
// THE FOUR REACTIONS, and the one system each reaches:
//   crowd / kind   → engine/pedestrians.js   how many people are on this street, and who they are
//   respond        → engine/police.js        how fast the state answers a call here
//   heat           → engine/police.js        what hurting someone here costs you
//   hazard         → engine/game.js          what breaking the structures here does BACK
//
// Everything is a MULTIPLIER on a number that already existed, never a replacement — so a district
// bends the city's own police ETA and the crowd's own budget rather than overriding them, and the
// country sheet, the safety index and the population ladder all keep working underneath.
import { TILE_INFO } from './cityplan.js';

// ---- THE CROWD PALETTES -----------------------------------------------------------------------
// ⚠ ONE INSTANCED MESH, ONE FIXED BUDGET. A district changes the DISTRIBUTION and the CLOTHES, never
// the draw calls — the same seam `_reseed` already uses to put the Moon's crowd in pressure suits.
// A "kind" is a body palette; the head row stays skin (or a gold visor in vacuum).
export const CROWD_KINDS = {
  civil:   ['#8a8577', '#5a6a7a', '#7a5a4a', '#4a5a4a', '#9a8a6a', '#6a4a5a', '#7a7a8a'],  // the default street
  tourist: ['#e8d24a', '#e88a4a', '#4ab0c8', '#e8e2d4', '#d84a4a', '#5ac87a', '#f0a860'],  // holiday colours, a resort reads from across the map
  young:   ['#3a5a9a', '#c84a4a', '#e8e2d4', '#2a7a5a', '#d8a83a', '#5a5a6a', '#8ab0d8'],  // campus: team colours and hoodies
  worker:  ['#d8901a', '#c8b040', '#5a5a52', '#8a7a4a', '#d8a020', '#6a6a5a', '#a89040'],  // hi-vis over drab — an industrial estate
  office:  ['#22242c', '#2c3038', '#3a3a44', '#1c2028', '#42424c', '#2a2e36', '#32363e'],  // suits
  medical: ['#e8e8e4', '#dce8e8', '#5a8a9a', '#e0e4e0', '#c8d8d8', '#4a7a8a', '#eaeae6'],  // scrubs and coats
};

// ---- THE HAZARD LADDER ------------------------------------------------------------------------
// ⚠ ROUTED THROUGH `game.areaDamage` AND `addDot`, NEVER A NEW DAMAGE PATH. A hazard is one existing
// explosion with a bigger number plus one existing damage-over-time zone. It therefore inherits
// craters, car chains, collateral booking, kill attribution, noise broadcast and the whole
// resistance table for free — and it cannot do anything an ability could not already do.
//
// ⚠ EVERY HAZARD DECLARES A REAL `dtype` FROM THE EXISTING TABLE, which is what gives it a COUNTER
// that nobody had to author: `metal` resists fire 0.6 and is IMMUNE to toxic, and is WEAK to acid
// 1.6. So a robot walks out of a burning fuel farm and dies in a chemical works, straight out of
// `resistOf`. Fire = fuel. Toxic = what is in the tanks. Acid = the works that eat armour.
//
//   tell    the word the warning uses          blast/r/dmg   straight into areaDamage
//   dtype   from DTYPES (entity.js)            dot           the lingering cloud
//   linger  seconds the zone keeps working     color         the vent + cloud tint (NO PURPLE)
const H = (tell, color, blast, r, dmg, dtype, dot, linger) => ({ tell, color, blast, r, dmg, dtype, dot, linger });

// FUEL — tank farms, jet fuel, bunkering. The biggest bangs in the city, and they BURN after.
const FUEL_BIG   = H('FUEL',      '#ff8a3d', 3.1, 42, 42, 'fire',  { dps: 7, dur: 4, kind: 'burn', dtype: 'fire' }, 10);
const FUEL_MID   = H('FUEL',      '#ff8a3d', 2.4, 32, 30, 'fire',  { dps: 5.5, dur: 4, kind: 'burn', dtype: 'fire' }, 8);
// ORDNANCE — a munitions store. No lingering cloud: it is over, and everything nearby is gone.
const ORDNANCE   = H('ORDNANCE',  '#ffd24a', 3.4, 46, 50, 'fire',  null, 0);
// CHEMICAL — the works that corrode. This is the one that kills armour.
const CHEMICAL   = H('CHEMICAL',  '#c8d84a', 2.5, 34, 28, 'acid',  { dps: 6, dur: 5, kind: 'acid', dtype: 'acid', corrode: 5 }, 12);
// TOXIC — pressure cylinders, tank cars, medical gas. Small blast, long nasty cloud.
const TOXIC_MID  = H('TOXIC',     '#b8d86a', 2.0, 30, 22, 'toxic', { dps: 5, dur: 5, kind: 'gas', dtype: 'toxic' }, 12);
// ⚠ the tell is printed NEXT TO the district label, so it must not repeat it ("MEDICAL — … VOLATILE · MEDICAL")
const TOXIC_LOW  = H('MEDICAL GAS', '#dfe8c0', 1.5, 22, 16, 'toxic', { dps: 4, dur: 4, kind: 'gas', dtype: 'toxic' }, 9);

// ---- THE TABLE --------------------------------------------------------------------------------
// crowd   pedestrian density × (0 = nobody — a military compound has no civilians, by rule)
// kind    which palette those people wear
// respond police ETA × (below 1 = the state is already here; above 1 = you have time)
// heat    civilian-harm heat × (a hospital and a campus are where the city cares most)
// hazard  what a destroyed structure does back (null = nearly consequence-free)
export const DISTRICTS = {
  // --- where people live and shop -------------------------------------------------------------
  residential: { crowd: 1.00, kind: 'civil',   respond: 1.00, heat: 1.15, hazard: null },
  commercial:  { crowd: 1.35, kind: 'civil',   respond: 0.95, heat: 1.00, hazard: null },
  market:      { crowd: 1.70, kind: 'civil',   respond: 1.00, heat: 1.25, hazard: null },
  plaza:       { crowd: 1.20, kind: 'civil',   respond: 0.90, heat: 1.10, hazard: null },
  metro:       { crowd: 1.30, kind: 'civil',   respond: 0.95, heat: 1.20, hazard: null },
  // --- where the money is ----------------------------------------------------------------------
  // ⚠ A CORPORATE CORE ANSWERS FAST FOR THE SAME REASON A RESORT DOES: it is the money. That is not
  // cynicism dressed as a rule, it is the rule the police ladder already runs on (lawBudget).
  company:     { crowd: 0.90, kind: 'office',  respond: 0.75, heat: 1.00, hazard: null },
  resort:      { crowd: 1.60, kind: 'tourist', respond: 0.55, heat: 1.25, hazard: null },
  funfair:     { crowd: 1.50, kind: 'tourist', respond: 0.75, heat: 1.30, hazard: null },
  stadium:     { crowd: 1.40, kind: 'civil',   respond: 0.80, heat: 1.30, hazard: null },
  // --- where the state is ----------------------------------------------------------------------
  // A capitol and a military compound answer almost instantly and hard — the response is already
  // standing there. The military row is the only one in the table with a crowd of exactly ZERO.
  political:   { crowd: 0.70, kind: 'office',  respond: 0.35, heat: 1.30, hazard: null },
  military:    { crowd: 0.00, kind: 'worker',  respond: 0.45, heat: 1.00, hazard: ORDNANCE },
  fortress:    { crowd: 0.10, kind: 'worker',  respond: 0.40, heat: 1.00, hazard: ORDNANCE },
  palace:      { crowd: 0.60, kind: 'office',  respond: 0.40, heat: 1.25, hazard: null },
  // --- where the city cares most ---------------------------------------------------------------
  hospital:    { crowd: 1.10, kind: 'medical', respond: 0.50, heat: 1.80, hazard: TOXIC_LOW },
  educational: { crowd: 1.50, kind: 'young',   respond: 0.85, heat: 1.60, hazard: null },
  university:  { crowd: 1.45, kind: 'young',   respond: 0.85, heat: 1.55, hazard: null },
  temple:      { crowd: 0.80, kind: 'civil',   respond: 0.90, heat: 1.40, hazard: null },
  cathedral:   { crowd: 0.85, kind: 'civil',   respond: 0.85, heat: 1.45, hazard: null },
  monument:    { crowd: 1.00, kind: 'tourist', respond: 0.85, heat: 1.20, hazard: null },
  tower:       { crowd: 1.10, kind: 'tourist', respond: 0.80, heat: 1.20, hazard: null },
  // --- where the work is: thin crowds, slow response, things that go up -------------------------
  // ⚠ THE TRADE IS THE WHOLE DESIGN. An industrial edge is where you take a fight you do not want
  // witnessed — nobody around, nobody coming — and it is also where the ground tries to kill you.
  industrial:  { crowd: 0.35, kind: 'worker',  respond: 1.45, heat: 0.75, hazard: CHEMICAL },
  mining:      { crowd: 0.25, kind: 'worker',  respond: 1.60, heat: 0.75, hazard: FUEL_MID },
  seaport:     { crowd: 0.45, kind: 'worker',  respond: 1.20, heat: 0.85, hazard: FUEL_MID },
  railyard:    { crowd: 0.30, kind: 'worker',  respond: 1.30, heat: 0.80, hazard: TOXIC_MID },
  airport:     { crowd: 0.80, kind: 'tourist', respond: 0.60, heat: 1.20, hazard: FUEL_BIG },
  // --- open ground: consequence-free, and that is a real tactical fact ---------------------------
  park:        { crowd: 0.90, kind: 'civil',   respond: 1.05, heat: 1.10, hazard: null },
  farmland:    { crowd: 0.15, kind: 'worker',  respond: 1.80, heat: 0.90, hazard: null },
  forest:      { crowd: 0.05, kind: 'worker',  respond: 2.00, heat: 0.90, hazard: null },
  mountain:    { crowd: 0.05, kind: 'worker',  respond: 2.00, heat: 0.90, hazard: null },
};

// A district we have no row for behaves exactly as the game did before this file existed.
export const DISTRICT_DEFAULT = Object.freeze({ crowd: 1, kind: 'civil', respond: 1, heat: 1, hazard: null });

export function districtRow(type) { return (type && DISTRICTS[type]) || DISTRICT_DEFAULT; }

// ---- POPULATION AND SIZE ----------------------------------------------------------------------
// Robert asked for it directly: "leverage population or size". A Mega City's streets are denser
// than a village's — and this is the ONE place that decides it, so the crowd budget and the
// nameplate can never disagree about how busy a place is.
// ⚠ IT SCALES THE LIVE INSTANCE COUNT, NOT THE ALLOCATION. The mesh is built once at the maximum;
// `mesh.count` decides how many of those instances render, and that is still one draw call.
export const POP_CROWD = {
  'Village': 0.22, 'Small Town': 0.38, 'Town': 0.55, 'Small City': 0.72,
  'City': 0.86, 'Large City': 1.00, 'Mega City': 1.00,
};
export const popCrowd = (popType) => POP_CROWD[popType] ?? 0.86;

// ---- WHAT THE PLAYER IS TOLD ------------------------------------------------------------------
// ⚠ DERIVED FROM THE NUMBERS, NEVER AUTHORED PER ROW. If somebody retunes `respond` and the label
// still says RAPID RESPONSE, the surface is lying — so the words come out of the same figures the
// engine reads. Same law as the LeFevre threat words and the recovery tiers.
export function districtTags(type) {
  const d = districtRow(type), out = [];
  if (d.respond <= 0.62) out.push('RAPID RESPONSE');
  else if (d.respond >= 1.35) out.push('SLOW RESPONSE');
  if (d.crowd >= 1.30) out.push('CROWDED');
  else if (d.crowd <= 0.10) out.push('DESERTED');
  if (d.heat >= 1.40) out.push('PROTECTED');
  else if (d.heat <= 0.80) out.push('UNWATCHED');
  if (d.hazard) out.push('VOLATILE · ' + d.hazard.tell);
  return out;
}

// The one-line meaning for the city nameplate: "MILITARY DISTRICT — RAPID RESPONSE · DESERTED".
export function districtLine(type) {
  if (!type) return '';
  const label = (TILE_INFO[type] && TILE_INFO[type].label) || String(type).toUpperCase();
  const tags = districtTags(type);
  return tags.length ? `${label} — ${tags.join(' · ')}` : label;
}

// ---- THE VALIDATOR ----------------------------------------------------------------------------
// ⚠ THE SAME LAW `validateTiles` RUNS ON THE PLANNER SIDE. A tile type added later with no district
// row would silently behave as generic city forever — quietly incomplete, which is the failure mode
// this codebase has paid for more than once. Reported, never defaulted in silence.
export function validateDistricts() {
  const problems = [];
  for (const t of Object.keys(TILE_INFO)) {
    if (t === 'water') continue;
    if (!DISTRICTS[t]) { problems.push({ t, msg: 'no DISTRICTS row — reacts as generic city' }); continue; }
    const d = DISTRICTS[t];
    if (!CROWD_KINDS[d.kind]) problems.push({ t, msg: `crowd kind "${d.kind}" is not a palette` });
    if (!(d.crowd >= 0) || !(d.respond > 0) || !(d.heat > 0)) problems.push({ t, msg: 'crowd/respond/heat must be positive numbers' });
    if (d.hazard && !d.hazard.dtype) problems.push({ t, msg: 'hazard has no dtype — it would skip every resistance' });
  }
  for (const t of Object.keys(DISTRICTS)) if (!TILE_INFO[t]) problems.push({ t, msg: 'DISTRICTS row for a tile type that does not exist' });
  return problems;
}
