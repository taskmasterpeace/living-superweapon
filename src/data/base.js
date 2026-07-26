// THE BASE — a 9×9 site on two floors, and what the world will actually let you build on it.
//
// Robert: "Improve bases. May need a holding cell or prison — cost depends on threat level
// capacity. We need all kinds of facilities. The player should be able to build the layer by
// connecting rooms on a 9x9 grid, with one having stairs for a 2nd floor… all the way down to a
// single cell for one thing that can be built (the poorest country). Not sure what attributes would
// determine this, but let's use as many country or even city stats as possible."
//
// Four rules shape everything here:
//
// ⚠ 1. THE SITE IS DERIVED, NOT CHOSEN. `siteSurvey()` reads eleven fields off the country and city
// sheets and returns how much ground you are permitted — from a full 9×9 in a rich, permissive,
// unwatched city down to a SINGLE CELL where you are broke, banned, and being looked at. That is
// Robert's ask taken literally, and it is the thing that makes WHERE you set up a real decision
// rather than a backdrop.
//
// ⚠ 2. A BASE IS A LAYOUT. Rooms must CONNECT back to the entrance, orthogonally, through other
// rooms — and between floors ONLY through a stairwell. Without connectivity a grid is an inventory
// with coordinates.
//
// ⚠ 3. CONTAINMENT IS PRICED BY WHAT IT HOLDS. A holding cell for a street thug is a locked door. A
// vault that holds an Earthshaker is a national-scale engineering project, and the ladder between
// them is the SAME rank ladder the fighters are measured on (data/scale.js). Cost rises with the
// square of the band, which is why a small firm builds a drunk tank and not a Cosmic vault.
//
// ⚠ 4. TIME IS THE CURRENCY. Every facility costs WEEKS as well as cash, and the career already
// counts weeks — building the vault is a season you did not spend fighting.

import { RESEARCH, MAJORS, STAGES, visibleResearch, researchLegal, universitiesTeaching, studyWeeks } from './education.js';
import { countryOf } from './countries.js';
import { cityList } from './cities.js';
import { BANDS } from './scale.js';

// -------------------------------------------------------------------------------------------------
// THE GRID. Nine by nine, two floors. A slot is `floor * AREA + row * GRID + col`.
export const GRID = 9, FLOORS = 2, AREA = GRID * GRID, SLOTS = AREA * FLOORS;
export const idx = (c, r, f = 0) => f * AREA + r * GRID + c;
export const colOf = (i) => i % GRID;
export const rowOf = (i) => Math.floor((i % AREA) / GRID);
export const floorOf = (i) => Math.floor(i / AREA);
export const ENTRANCE = idx(4, 8, 0);            // ground floor, centre of the near edge

// -------------------------------------------------------------------------------------------------
// THE SITE SURVEY — how much ground the world will actually let you have.
// ⚠ ELEVEN SHEET FIELDS, each earning its place by pushing in a direction you can argue for.

// THE TERMS, computed once and shared by the survey and the calibration so they cannot disagree.
export function siteTerms(city, country) {
  const co = country || (city && countryOf(city.country)) || null;
  const f = {};

  f.wealth = ((co && co.gdpPerCapita) || 20) / 100;                       // can this economy pour concrete
  const pop = (city && city.pop) || 50000;
  f.scale = Math.max(0, Math.min(1, (Math.log10(pop) - 3.6) / 3.6));      // contractors, power, road access
  const regs = (co && co.lswRegs) || 'Regulated';
  f.legal = regs === 'Legal' ? 1 : regs === 'Regulated' ? 0.55 : 0.16;    // a banned firm gets no permit
  // ⚠ INTEGRITY CUTS BACKWARDS. A clean state enforces its zoning; a bought one does not care what
  // is under your warehouse. High integrity therefore COSTS you footprint.
  f.permissive = 1 - ((co && co.integrity) != null ? co.integrity : 50) / 100;
  f.infra = (((co && co.science) || 20) + ((co && co.healthcare) || 20)) / 200;
  // ⚠ MEDIA FREEDOM IS THE SURVEILLANCE SIGNAL, and leaving it out was a real bug: without it
  // Pyongyang surveyed as a 9×9 national-scale site, because North Korea's law and intel BUDGETS
  // are small on the sheet. A state with no press is a state that watches everything, and that
  // column is the only one that says so — it is the difference between poor and closed.
  f.watched = Math.max(0, Math.min(1,
    ((city && city.hvt) ? 0.30 : 0)
    + (((co && co.lawBudget) || 40) / 100) * 0.26
    + (((co && co.intelBudget) || 40) / 100) * 0.24
    + (1 - ((co && co.mediaFreedom) != null ? co.mediaFreedom : 50) / 100) * 0.46));
  f.chaos = Math.max(0, Math.min(1,
    (((city && city.crime) || 40) / 100) * 0.6 + (1 - ((city && city.safety) || 50) / 100) * 0.5));
  const terr = (city && city.terrain) || 'flat';
  f.ground = terr === 'flat' ? 1 : terr === 'hills' ? 0.85 : terr === 'plateau' ? 0.9
    : terr === 'coastal' ? 0.7 : terr === 'mountains' ? 0.55 : 0.8;
  const types = (city && city.types) || [];
  f.cover = types.some((t) => /military|industrial|mining/i.test(t)) ? 0.25
    : types.some((t) => /seaport|company/i.test(t)) ? 0.15 : 0;

  // ⚠ THE HARD GATES MULTIPLY. A weighted SUM of eleven 0–1 terms regresses to the mean — measured
  // over all 1,050 cities it produced nothing below 4×4. Being banned is not something good roads
  // average away, and being watched is not offset by being rich.
  f.ability = Math.max(0, Math.min(1, f.wealth * 0.34 + f.scale * 0.26 + f.infra * 0.24 + f.ground * 0.16));
  f.legalMult = 0.30 + f.legal * 0.70;
  f.scrutinyMult = Math.max(0.20, 1 - f.watched * 0.85);
  // ⚠ LOOSENESS IS A NUDGE, NOT A LEVER. At ×0.30 it dominated everything and handed Zimbabwe a
  // national-scale site — being able to bribe a planning office does not pour concrete.
  f.looseness = 1 + f.chaos * 0.12 + f.permissive * 0.10 + f.cover * 0.6;
  f.raw = f.ability * f.legalMult * f.scrutinyMult * f.looseness;
  return f;
}
export const rawScore = (city, country) => siteTerms(city, country).raw;

// ⚠ THE WHOLE DISTRIBUTION, measured once from the real sheet — not just its endpoints.
// Three passes of hand-picked constants each left rungs unreachable (first nothing below 4×4, then
// a hole at 4×4, then a ceiling of 7×7) — the same unreachable-rung failure the university standing
// ladder had. Min/max normalisation does not fix it either, because the world's raw scores are
// CLUSTERED: normalising the ends still piles everyone into the middle.
//
// So a site's rung is its PERCENTILE against every real city on earth. All nine rungs are occupied
// by construction, the ordering is exactly the data's ordering, and "a 3×3 site" becomes a sentence
// you can say out loud: the bottom third of the world.
let _dist = null;
export function calibration() {
  if (_dist) return _dist;
  _dist = { sorted: [], n: 0 };                    // safe identity while computing (no recursion)
  const vals = [];
  try {
    for (const c of cityList()) {
      const v = rawScore(c, countryOf(c.country));
      if (Number.isFinite(v)) vals.push(v);
    }
  } catch { /* sheet unavailable — percentileOf then returns 0.5 for everyone */ }
  vals.sort((a, b) => a - b);
  _dist = { sorted: vals, n: vals.length };
  return _dist;
}
export function percentileOf(raw) {
  const d = calibration();
  if (!d.n) return 0.5;
  let lo = 0, hi = d.n;
  while (lo < hi) { const m = (lo + hi) >> 1; if (d.sorted[m] < raw) lo = m + 1; else hi = m; }
  return lo / Math.max(1, d.n - 1);
}

export function siteSurvey(city, country) {
  const f = siteTerms(city, country);
  // ⚠ AN S-CURVE OVER THE PERCENTILE, not the percentile raw. A flat percentile gives nine equal
  // ninths, which would make a single-room site exactly as common as a national installation —
  // neither should be ordinary. Smoothstep fattens the middle and keeps both extremes rare but REAL.
  const q = percentileOf(f.raw);
  const score = q * q * (3 - 2 * q);
  const n = Math.max(1, Math.min(GRID, Math.round(1 + score * 8)));
  // the upper floor is a bigger ask than more ground — it needs the wealth AND the infrastructure
  const twoFloors = n >= 4 && f.wealth > 0.34 && f.infra > 0.36;
  return {
    n, twoFloors, score: +score.toFixed(3), pct: +q.toFixed(3), terms: f,
    label: n <= 1 ? 'A SINGLE ROOM' : n <= 2 ? 'A BACK ROOM AND A CELLAR' : n <= 4 ? 'A SMALL COMPOUND'
      : n <= 6 ? 'A WORKING FACILITY' : n <= 8 ? 'A MAJOR INSTALLATION' : 'A NATIONAL-SCALE SITE',
    why: n <= 3
      ? (f.legal < 0.3 ? 'UNREGISTERED FIRMS DO NOT GET PLANNING PERMISSION HERE'
        : f.watched > 0.62 ? 'YOU ARE BEING WATCHED TOO CLOSELY TO DIG'
        : 'THE LOCAL ECONOMY CANNOT POUR THAT MUCH CONCRETE')
      : (f.cover ? 'A COMPOUND HERE RAISES NO QUESTIONS' : 'PERMITTED FOOTPRINT'),
  };
}

// -------------------------------------------------------------------------------------------------
// CONTAINMENT — the holding cells, priced by what they are rated to hold.
// ⚠ THE TIERS ARE THE RANK LADDER'S OWN BANDS, not a parallel invention. A cell states the highest
// DESIGNATION it will hold, and the cost climbs with the square of the tier because containment is
// an engineering problem that gets worse much faster than the thing being contained gets stronger.
export const CELL_TIERS = [
  { t: 0, n: 'DRUNK TANK',        holds: 19,   band: 'Above Avg Human',  wk: 2,  $: 25,   cap: 4,
    d: 'A locked door and a bench. It holds people.' },
  { t: 1, n: 'SECURE CELL',       holds: 39,   band: 'Max Human Limit',  wk: 4,  $: 70,   cap: 3,
    d: 'Reinforced, monitored, and rated for someone at the peak of what a person can be.' },
  { t: 2, n: 'DAMPENED CELL',     holds: 49,   band: 'Low Superhuman',   wk: 7,  $: 190,  cap: 2,
    d: 'A suppression field in the walls. The first cell that holds something that should not be holdable.',
    needs: 'cuffs' },
  { t: 3, n: 'CONTAINMENT VAULT', holds: 79,   band: 'Superhuman',       wk: 12, $: 520,  cap: 2,
    d: 'Layered fields, an airlock, and a corridor nobody walks down alone.', needs: 'containment' },
  { t: 4, n: 'DEEP VAULT',        holds: 99,   band: 'High Superhuman',  wk: 20, $: 1400, cap: 1,
    d: 'Buried, isolated, and built to lose power without opening.', needs: 'containment' },
  { t: 5, n: 'OMEGA VAULT',       holds: 4999, band: 'Low Cosmic',       wk: 34, $: 4200, cap: 1,
    d: 'A national-scale engineering project for one prisoner. Most states cannot build this at all.',
    needs: 'suppression' },
];
export const cellTierFor = (rank) => CELL_TIERS.find((c) => rank <= c.holds) || CELL_TIERS[CELL_TIERS.length - 1];
export const canHold = (cellId, rank) => {
  const t = CELL_TIERS.find((c) => 'cell' + c.t === cellId);
  return !!t && rank <= t.holds;
};

// -------------------------------------------------------------------------------------------------
// THE FACILITIES. Every one hooks into a system that exists — the same rule the majors follow.
export const CORE = [
  { id: 'access',   n: 'ACCESS LIFT',      wk: 0,  $: 0,   staff: 0, kind: 'core', fixed: true,
    d: 'The way in. Everything must connect back to it.' },
  { id: 'stairs',   n: 'STAIRWELL',        wk: 3,  $: 55,  staff: 0, kind: 'core', stairs: true,
    d: 'The only way to the upper floor. Build it and the level above it opens.' },
  { id: 'corridor', n: 'CORRIDOR',         wk: 1,  $: 8,   staff: 0, kind: 'core',
    d: 'Nothing but a way through — and on a nine-square site that is often exactly what you need.' },

  // life
  { id: 'quarters', n: 'LIVING QUARTERS',  wk: 3,  $: 40,  staff: 6, kind: 'life', houses: 6,
    d: 'Houses six. Nobody works out of a room they do not sleep near.' },
  { id: 'mess',     n: 'MESS HALL',        wk: 2,  $: 30,  staff: 2, kind: 'life',
    d: 'Where the staff actually talk to each other. Morale is a real resource.' },
  { id: 'medical',  n: 'MEDICAL WING',     wk: 5,  $: 90,  staff: 3, kind: 'life', hook: 'the injury ledger',
    d: 'Treats the injury ledger in-house instead of paying a clinic.' },
  { id: 'surgery',  n: 'SURGICAL THEATRE', wk: 8,  $: 220, staff: 3, kind: 'life',
    d: 'The rung above a medical wing — it can put someone back together, not just patch them.' },
  { id: 'gym',      n: 'TRAINING HALL',    wk: 4,  $: 60,  staff: 2, kind: 'life', hook: 'the training hall',
    d: 'The blue room and the white room, on site.' },
  { id: 'range',    n: 'FIRING RANGE',     wk: 3,  $: 50,  staff: 1, kind: 'life', hook: 'the armory',
    d: 'Proficiency is a real multiplier. This is where it is bought.' },

  // work
  { id: 'lab',      n: 'RESEARCH LAB',     wk: 6,  $: 120, staff: 4, kind: 'work', hook: 'RESEARCH',
    d: 'Where a blueprint happens. No lab, no research stage.' },
  { id: 'drafting', n: 'DRAFTING TABLE',   wk: 4,  $: 70,  staff: 2, kind: 'work', hook: 'DESIGN',
    d: 'Where a blueprint becomes a spec you chose.' },
  { id: 'workshop', n: 'WORKSHOP',         wk: 5,  $: 100, staff: 3, kind: 'work', hook: 'MANUFACTURE',
    d: 'Where a spec becomes a thing you own.' },
  { id: 'armoury',  n: 'ARMOURY',          wk: 3,  $: 55,  staff: 1, kind: 'work',
    d: 'Holds what you made. Worth raiding — which is what makes defence matter.' },
  { id: 'ops',      n: 'OPERATIONS',       wk: 4,  $: 80,  staff: 3, kind: 'work', hook: 'the circuit',
    d: 'The contract desk and the world map.' },
  { id: 'intel',    n: 'INTELLIGENCE CELL', wk: 5, $: 110, staff: 3, kind: 'work',
    d: 'Reads the world sheet instead of guessing at it. Investigations start here.' },
  { id: 'comms',    n: 'COMMS CENTRE',     wk: 3,  $: 65,  staff: 2, kind: 'work',
    d: 'Squad radio that the enemy has to jam rather than simply outrange.' },
  { id: 'server',   n: 'SERVER ROOM',      wk: 4,  $: 95,  staff: 1, kind: 'work',
    d: 'Everything the intelligence cell knows has to live somewhere.' },
  { id: 'hangar',   n: 'HANGAR',           wk: 7,  $: 160, staff: 3, kind: 'work', hook: 'aerospace',
    d: 'A transport needs somewhere to sit.' },
  { id: 'motorpool', n: 'MOTOR POOL',      wk: 4,  $: 75,  staff: 2, kind: 'work',
    d: 'Ground vehicles, and the people who keep them running.' },
  { id: 'store',    n: 'STORES',           wk: 2,  $: 26,  staff: 1, kind: 'work',
    d: 'Salvage, materials and ammunition. A workshop with no stores builds nothing.' },
  { id: 'generator', n: 'GENERATOR',       wk: 4,  $: 85,  staff: 1, kind: 'work',
    d: 'A containment field that loses power is a door. This is why it does not.' },

  // security
  { id: 'security', n: 'SECURITY POST',    wk: 3,  $: 60,  staff: 2, kind: 'sec',
    d: 'Cameras, a door you control, and somebody watching them.' },
  { id: 'turret',   n: 'AUTOMATED DEFENCE', wk: 6, $: 175, staff: 1, kind: 'sec',
    d: 'The base can fight back on its own. That is what makes a raid a battle.' },
  { id: 'interrog', n: 'INTERROGATION',    wk: 3,  $: 55,  staff: 2, kind: 'sec',
    d: 'A prisoner is a source. This is the room where that is true.' },
  { id: 'morgue',   n: 'MORGUE',           wk: 3,  $: 45,  staff: 1, kind: 'sec',
    d: 'Somebody has to account for the dead, and a registry will ask.' },
];

// the containment rooms, generated from the tier ladder so the two can never disagree
export const CELLS = CELL_TIERS.map((t) => ({
  id: 'cell' + t.t, n: t.n, wk: t.wk, $: t.$, staff: t.t >= 2 ? 2 : 1, kind: 'hold',
  holds: t.holds, band: t.band, cap: t.cap, needs: t.needs, d: t.d,
}));

export function researchedRooms() {
  return RESEARCH.filter((r) => r.base).map((r) => ({
    id: 'r_' + r.id, n: r.n.toUpperCase(), wk: Math.max(2, Math.round(r.w * 0.5)),
    $: 40 + r.t * 90, staff: r.t, kind: 'built', needs: r.id, tier: r.t,
    d: r.d, major: r.major, majorName: r.major ? MAJORS[r.major].name : 'any',
  }));
}
export const allFacilities = () => CORE.concat(CELLS).concat(researchedRooms());
export const facilityById = (fid) => allFacilities().find((f) => f.id === fid) || null;

// -------------------------------------------------------------------------------------------------
// STATE
const LS = 'threshold_base_v2';
const blank = (site) => {
  const rooms = new Array(SLOTS).fill(null);
  rooms[ENTRANCE] = { fid: 'access', built: true, weeksLeft: 0, staff: [] };
  return { name: '', country: '', city: '', site: site || null, rooms, staff: [], prisoners: [] };
};

let _base = null;
export function baseState() {
  if (_base) return _base;
  try {
    const raw = localStorage.getItem(LS);
    if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.rooms) && p.rooms.length === SLOTS) { _base = p; return _base; } }
  } catch {}
  _base = blank();
  return _base;
}
export function saveBase() { try { localStorage.setItem(LS, JSON.stringify(_base)); } catch {} return _base; }
export function resetBase(site) { _base = blank(site); return saveBase(); }
export function setSite(city, country) {
  const b = baseState();
  b.site = siteSurvey(city, country);
  b.city = (city && city.name) || ''; b.country = (city && city.country) || (country && country.name) || '';
  saveBase();
  return b.site;
}

// The permitted window on the grid, centred on the entrance column. A 1×1 site is exactly the
// entrance cell — which is why the entrance is a real room and not a marker.
export function permitted(b = baseState()) {
  const n = (b.site && b.site.n) || GRID;
  const half = Math.floor((n - 1) / 2);
  const c0 = Math.max(0, Math.min(GRID - n, colOf(ENTRANCE) - half));
  const r0 = Math.max(0, GRID - n);                       // grows AWAY from the entrance edge
  return { n, c0, c1: c0 + n - 1, r0, r1: GRID - 1, floors: (b.site && b.site.twoFloors) ? 2 : 1 };
}
export function inPermit(slot, b = baseState()) {
  const p = permitted(b), c = colOf(slot), r = rowOf(slot), f = floorOf(slot);
  if (f >= p.floors) return false;
  return c >= p.c0 && c <= p.c1 && r >= p.r0 && r <= p.r1;
}

// ⚠ CONNECTIVITY, INCLUDING VERTICALLY. Orthogonal on a floor; between floors ONLY through a built
// stairwell at the same column and row. That is what makes the stairwell a real decision instead of
// a decoration — put it in the wrong place and half the upper floor is unreachable.
export function reachable(b = baseState()) {
  const seen = new Set([ENTRANCE]), q = [ENTRANCE];
  while (q.length) {
    const i = q.pop(), c = colOf(i), r = rowOf(i), f = floorOf(i);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c2 = c + dc, r2 = r + dr;
      if (c2 < 0 || c2 >= GRID || r2 < 0 || r2 >= GRID) continue;
      const j = idx(c2, r2, f);
      if (seen.has(j) || !b.rooms[j]) continue;
      seen.add(j); q.push(j);
    }
    const here = b.rooms[i], fac = here && facilityById(here.fid);
    if (fac && fac.stairs && here.built) {
      for (const f2 of [f - 1, f + 1]) {
        if (f2 < 0 || f2 >= FLOORS) continue;
        const j = idx(c, r, f2);
        if (!seen.has(j) && b.rooms[j]) { seen.add(j); q.push(j); }
      }
    }
  }
  return seen;
}

export function buildableSlots(b = baseState()) {
  const reach = reachable(b), out = [];
  for (let i = 0; i < SLOTS; i++) {
    if (b.rooms[i] || !inPermit(i, b)) continue;
    const c = colOf(i), r = rowOf(i), f = floorOf(i);
    let ok = false;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c2 = c + dc, r2 = r + dr;
      if (c2 < 0 || c2 >= GRID || r2 < 0 || r2 >= GRID) continue;
      if (reach.has(idx(c2, r2, f))) { ok = true; break; }
    }
    // an upper-floor slot is also reachable if a built stairwell stands directly below it
    if (!ok && f > 0) {
      const below = b.rooms[idx(c, r, f - 1)], fac = below && facilityById(below.fid);
      if (fac && fac.stairs && below.built && reach.has(idx(c, r, f - 1))) ok = true;
    }
    if (ok) out.push(i);
  }
  return out;
}

export function canBuild(slot, fid, b = baseState()) {
  const f = facilityById(fid);
  if (!f) return { ok: false, why: 'NO SUCH FACILITY' };
  if (f.fixed) return { ok: false, why: 'THE ACCESS LIFT CANNOT BE BUILT TWICE' };
  if (slot < 0 || slot >= SLOTS) return { ok: false, why: 'OFF THE GRID' };
  if (b.rooms[slot]) return { ok: false, why: 'THAT SLOT IS ALREADY DUG' };
  if (!inPermit(slot, b)) {
    return { ok: false, why: floorOf(slot) > 0 && permitted(b).floors < 2
      ? 'THIS SITE IS NOT RATED FOR A SECOND FLOOR' : 'OUTSIDE YOUR PERMITTED FOOTPRINT' };
  }
  if (!buildableSlots(b).includes(slot)) {
    return { ok: false, why: floorOf(slot) > 0 ? 'NO STAIRWELL REACHES THAT PART OF THE UPPER FLOOR'
      : 'NOT CONNECTED TO THE ACCESS LIFT' };
  }
  return { ok: true, weeks: f.wk, cost: f.$ };
}

export function startBuild(slot, fid, b = baseState()) {
  const chk = canBuild(slot, fid, b);
  if (!chk.ok) return chk;
  const f = facilityById(fid);
  b.rooms[slot] = { fid, built: f.wk === 0, weeksLeft: f.wk, staff: [] };
  saveBase();
  return { ok: true, weeks: f.wk, cost: f.$ };
}
export function tickWeeks(n = 1, b = baseState()) {
  const done = [];
  for (let i = 0; i < SLOTS; i++) {
    const rm = b.rooms[i]; if (!rm || rm.built) continue;
    rm.weeksLeft -= n;
    if (rm.weeksLeft <= 0) { rm.weeksLeft = 0; rm.built = true; done.push({ slot: i, fid: rm.fid }); }
  }
  if (done.length) saveBase();
  return done;
}
export function demolish(slot, b = baseState()) {
  if (slot === ENTRANCE) return { ok: false, why: 'THE ACCESS LIFT IS THE BASE' };
  if (!b.rooms[slot]) return { ok: false, why: 'NOTHING THERE' };
  const keep = b.rooms[slot]; b.rooms[slot] = null;
  const reach = reachable(b);
  for (let i = 0; i < SLOTS; i++) if (b.rooms[i] && !reach.has(i)) {
    b.rooms[slot] = keep;
    return { ok: false, why: floorOf(slot) === 0 && facilityById(keep.fid)?.stairs
      ? 'THAT STAIRWELL IS THE ONLY WAY UPSTAIRS' : 'THAT WOULD CUT OFF ROOMS BEHIND IT' };
  }
  saveBase();
  return { ok: true };
}

// -------------------------------------------------------------------------------------------------
// PEOPLE AND PRISONERS
export const ROLES = ['Researcher', 'Engineer', 'Physician', 'Analyst', 'Technician', 'Instructor', 'Warden'];
const FIRST = ['Ada','Ivo','Neta','Osei','Reza','Mira','Ken','Yara','Tomas','Ines','Bilal','Sena','Petra','Kwame','Anja','Dmitri'];
const LAST  = ['Okonjo','Varga','Nakamura','Haddad','Lindqvist','Barros','Novak','Adeyemi','Rossi','Petrov','Chandra','Mbeki'];

export function hireStaff(seedN, major, b = baseState()) {
  const h = (seedN * 2654435761) >>> 0;
  const p = { id: 's' + h.toString(36) + b.staff.length,
    n: FIRST[h % FIRST.length] + ' ' + LAST[(h >>> 7) % LAST.length],
    role: ROLES[(h >>> 3) % ROLES.length], major: major || null,
    level: 1 + ((h >>> 11) % 3), slot: null };
  b.staff.push(p); saveBase();
  return p;
}
export const housing = (b = baseState()) => b.rooms.reduce((a, rm) =>
  a + (rm && rm.built ? (facilityById(rm.fid)?.houses || 0) : 0), 0);

export function staffed(slot, b = baseState()) {
  const rm = b.rooms[slot];
  if (!rm || !rm.built) return false;
  const f = facilityById(rm.fid);
  return (f?.staff || 0) === 0 || (rm.staff || []).length > 0;
}
export function assign(personId, slot, b = baseState()) {
  const rm = b.rooms[slot];
  if (!rm || !rm.built) return { ok: false, why: 'THAT ROOM IS NOT FINISHED' };
  const f = facilityById(rm.fid);
  if ((rm.staff || []).length >= (f?.staff || 0)) return { ok: false, why: 'THAT ROOM IS FULL' };
  for (const r2 of b.rooms) if (r2 && r2.staff) { const k = r2.staff.indexOf(personId); if (k >= 0) r2.staff.splice(k, 1); }
  const per = b.staff.find((x) => x.id === personId);
  if (per) per.slot = slot;
  (rm.staff = rm.staff || []).push(personId);
  saveBase();
  return { ok: true };
}

// ⚠ A PRISONER NEEDS A CELL RATED FOR THEM. This is the payoff of pricing containment by rank: you
// cannot hold an Earthshaker in a drunk tank, and the refusal says exactly why.
export function cellsFor(rank, b = baseState()) {
  const out = [];
  for (let i = 0; i < SLOTS; i++) {
    const rm = b.rooms[i]; if (!rm || !rm.built) continue;
    const f = facilityById(rm.fid);
    if (!f || f.kind !== 'hold') continue;
    const held = (b.prisoners || []).filter((p) => p.slot === i).length;
    out.push({ slot: i, fac: f, held, free: (f.cap || 1) - held, rated: rank <= f.holds });
  }
  return out;
}
export function jail(who, rank, b = baseState()) {
  const opts = cellsFor(rank, b).filter((c) => c.rated && c.free > 0);
  if (!opts.length) {
    const any = cellsFor(rank, b);
    return { ok: false, why: !any.length ? 'YOU HAVE NO CELLS'
      : any.some((c) => c.rated) ? 'EVERY RATED CELL IS FULL'
      : 'NOTHING YOU HAVE BUILT IS RATED TO HOLD A ' + (BANDS.find((x) => rank <= x.hi) || BANDS[0]).name.toUpperCase() };
  }
  opts.sort((a, z) => a.fac.holds - z.fac.holds);          // use the WEAKEST cell that will do
  const cell = opts[0];
  (b.prisoners = b.prisoners || []).push({ id: who.id || who, name: who.name || String(who), rank, slot: cell.slot });
  saveBase();
  return { ok: true, slot: cell.slot, cell: cell.fac.n };
}
export function release(id, b = baseState()) {
  const i = (b.prisoners || []).findIndex((p) => p.id === id);
  if (i < 0) return { ok: false, why: 'NOT IN CUSTODY' };
  b.prisoners.splice(i, 1); saveBase();
  return { ok: true };
}

export function capabilities(b = baseState()) {
  const out = { rooms: 0, building: 0, beds: housing(b), staff: b.staff.length,
                prisoners: (b.prisoners || []).length, cellCap: 0, can: {}, floors: 1 };
  for (let i = 0; i < SLOTS; i++) {
    const rm = b.rooms[i]; if (!rm) continue;
    if (floorOf(i) > 0) out.floors = 2;
    if (!rm.built) { out.building++; continue; }
    out.rooms++;
    const f = facilityById(rm.fid);
    if (f && f.kind === 'hold') out.cellCap += f.cap || 1;
    if (staffed(i, b)) out.can[rm.fid] = (out.can[rm.fid] || 0) + 1;
  }
  return out;
}

// -------------------------------------------------------------------------------------------------
// THE PIPELINE, WIRED TO THE BUILDING. THEORY → RESEARCH → DESIGN → MANUFACTURE was authored in
// data/education.js and had nowhere to happen; the base has the rooms. This is the join, and it is
// the reason education stops being a data island: a stage you have not BUILT and STAFFED cannot run.
const STAGE_ROOM = { theory: null, research: 'lab', design: 'drafting', manufacture: 'workshop' };

// ⚠ WHAT YOUR PEOPLE ACTUALLY KNOW. A major counts only if the person holding it is on staff — this
// is Robert's "staff are the answer to who studies", made load-bearing rather than decorative.
export function heldMajors(b = baseState()) {
  return [...new Set((b.staff || []).map((p) => p.major).filter(Boolean))];
}

// Which of the four stages this base can currently run, and why not when it cannot.
export function pipeline(b = baseState()) {
  const cap = capabilities(b);
  return STAGES.map((st) => {
    const room = STAGE_ROOM[st.id];
    if (!room) {
      // THEORY happens at a university, in the world — never in your building. A base cannot teach.
      const majors = heldMajors(b);
      return { ...st, ok: majors.length > 0, at: 'a university, abroad',
               why: majors.length ? majors.length + ' DISCIPLINE(S) ON STAFF' : 'NOBODY HERE HAS A DEGREE' };
    }
    const built = (b.rooms || []).some((rm, i) => rm && rm.built && rm.fid === room && staffed(i, b));
    const dug = (b.rooms || []).some((rm) => rm && rm.fid === room);
    return { ...st, ok: built, at: st.where, room,
             why: built ? 'READY' : dug ? 'BUILT BUT UNSTAFFED — A ROOM WITH NOBODY IN IT DOES NOTHING'
                                        : 'NO ' + (facilityById(room)?.n || room) };
  });
}

// ⚠ VISIBILITY IS THE POINT (education.js): a row you have no graduate for is ABSENT, not greyed
// out with a price. This layers the BUILDING on top of that — you can see it, but you still need
// the lab to start it, and the host country still has to allow it.
export function researchOptions(b = baseState(), country) {
  const majors = heldMajors(b);
  const pipe = pipeline(b);
  const canResearch = pipe.find((p) => p.id === 'research')?.ok;
  return visibleResearch(majors).map((r) => {
    const legal = researchLegal(r, country || b.country);
    return { ...r, canStart: !!canResearch && legal.ok, legal,
             why: !canResearch ? 'NO STAFFED RESEARCH LAB' : legal.ok ? 'READY' : legal.why };
  });
}

// Where in the world you would have to go to study a discipline you do not have.
export function studyOptions(mid, n = 5) {
  return universitiesTeaching(mid).slice(0, n).map((u) => {
    const w = studyWeeks(u, mid);
    return { id: u.id, name: u.name, city: u.city, country: u.country, rank: u.rank,
             standing: u.standing.label, weeks: w ? w.weeks : null, shadow: w ? w.shadow : false };
  });
}

export function baseLine(b = baseState()) {
  const cap = capabilities(b), p = permitted(b);
  return `${b.name || 'UNNAMED FIRM'} · ${cap.rooms} ROOM${cap.rooms === 1 ? '' : 'S'} OF ${p.n}×${p.n}` +
    (cap.building ? ` · ${cap.building} BUILDING` : '') +
    (cap.floors > 1 ? ' · 2 FLOORS' : '') +
    ` · ${cap.staff}/${cap.beds} QUARTERED` +
    (cap.cellCap ? ` · ${cap.prisoners}/${cap.cellCap} HELD` : '');
}
