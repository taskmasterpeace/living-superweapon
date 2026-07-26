// THE BASE — an XCOM-style facility grid, and the people who live in it.
//
// Robert: "improve base building and make sure we can have characters in the base that we build.
// Layout should match what we built — think XCOM, indoor, no destructible environment."
//
// Three rules shape everything here:
//
// ⚠ 1. A BASE IS A LAYOUT, NOT A SHOPPING LIST. XCOM's base works because the grid is a real
// constraint: rooms must CONNECT back to the entrance through other rooms, so where you dig is a
// decision you live with. Without connectivity a grid is just an inventory with coordinates.
//
// ⚠ 2. TIME IS THE CURRENCY (the education ruling, applied). Every facility costs WEEKS as well as
// cash, and the career already counts weeks — so building the lab is a season you did not spend
// fighting. Cash alone would be meaningless because cash is always replaceable.
//
// ⚠ 3. THE ROOMS ARE STAFFED BY PEOPLE, and people are the thing you can lose. A facility with
// nobody in it does nothing at all — it is a built room with the lights off. That is what makes a
// raid that takes your only geneticist a catastrophe rather than a repair bill.
//
// The catalogue is NOT invented: the 26 rows tagged `base: true` in data/education.js are the
// installations Robert listed, and they arrive here as buildable rooms once researched. What this
// file adds is the handful of CORE rooms a base needs before any research exists.

import { RESEARCH, MAJORS } from './education.js';

export const COLS = 5, ROWS = 4;
export const SLOTS = COLS * ROWS;
export const ENTRANCE = 2;                       // slot index of the access lift — always built

export const idx = (c, r) => r * COLS + c;
export const colOf = (i) => i % COLS;
export const rowOf = (i) => Math.floor(i / COLS);

// -------------------------------------------------------------------------------------------------
// THE CORE ROOMS — what a base needs before it has researched anything. Every one of these hooks
// into a system that already exists, which is the same rule the majors follow: if a room has no
// hook, it should not be a room.
export const CORE = [
  { id: 'access',   n: 'ACCESS LIFT',     wk: 0,  $: 0,   staff: 0, kind: 'core',
    d: 'the way in. Everything must connect back to it.', fixed: true },
  { id: 'quarters', n: 'LIVING QUARTERS', wk: 3,  $: 40,  staff: 6, kind: 'life',
    d: 'houses six. Nobody works out of a room they do not sleep near.', houses: 6 },
  { id: 'medical',  n: 'MEDICAL WING',    wk: 5,  $: 90,  staff: 3, kind: 'life',
    d: 'treats the injury ledger in-house instead of paying a clinic.', hook: 'the injury ledger' },
  { id: 'gym',      n: 'TRAINING HALL',   wk: 4,  $: 60,  staff: 2, kind: 'life',
    d: 'the blue room and the white room, on site.', hook: 'the training hall' },
  { id: 'lab',      n: 'RESEARCH LAB',    wk: 6,  $: 120, staff: 4, kind: 'work',
    d: 'where a blueprint happens. No lab, no research stage.', hook: 'RESEARCH' },
  { id: 'drafting', n: 'DRAFTING TABLE',  wk: 4,  $: 70,  staff: 2, kind: 'work',
    d: 'where a blueprint becomes a spec you chose.', hook: 'DESIGN' },
  { id: 'workshop', n: 'WORKSHOP',        wk: 5,  $: 100, staff: 3, kind: 'work',
    d: 'where a spec becomes a thing you own.', hook: 'MANUFACTURE' },
  { id: 'armoury',  n: 'ARMOURY',         wk: 3,  $: 55,  staff: 1, kind: 'work',
    d: 'holds what you made. Worth raiding — which is what makes defence matter.' },
  { id: 'ops',      n: 'OPERATIONS',      wk: 4,  $: 80,  staff: 3, kind: 'work',
    d: 'the contract desk and the world map.', hook: 'the circuit' },
  { id: 'hangar',   n: 'HANGAR',          wk: 7,  $: 160, staff: 3, kind: 'work',
    d: 'a transport needs somewhere to sit.', hook: 'aerospace' },
];

// The researched installations become rooms. Derived, never re-typed — if Robert edits the research
// list, the buildable room list moves with it and cannot disagree.
export function researchedRooms() {
  return RESEARCH.filter((r) => r.base).map((r) => ({
    id: 'r_' + r.id, n: r.n.toUpperCase(), wk: Math.max(2, Math.round(r.w * 0.5)),
    $: 40 + r.t * 90, staff: r.t, kind: 'built', needs: r.id, tier: r.t,
    d: r.d, major: r.major, majorName: r.major ? MAJORS[r.major].name : 'any',
  }));
}
export const allFacilities = () => CORE.concat(researchedRooms());
export const facilityById = (fid) => allFacilities().find((f) => f.id === fid) || null;

// -------------------------------------------------------------------------------------------------
// THE GRID
const LS = 'threshold_base_v1';
const blank = () => {
  const rooms = new Array(SLOTS).fill(null);
  rooms[ENTRANCE] = { fid: 'access', built: true, weeksLeft: 0, staff: [] };
  return { name: '', country: '', city: '', rooms, staff: [], founded: null };
};

let _base = null;
export function baseState() {
  if (_base) return _base;
  try { const raw = localStorage.getItem(LS); if (raw) { const p = JSON.parse(raw);
    if (p && Array.isArray(p.rooms) && p.rooms.length === SLOTS) { _base = p; return _base; } } } catch {}
  _base = blank();
  return _base;
}
export function saveBase() { try { localStorage.setItem(LS, JSON.stringify(_base)); } catch {} return _base; }
export function resetBase() { _base = blank(); return saveBase(); }

// ⚠ CONNECTIVITY IS THE RULE THAT MAKES THE GRID A LAYOUT. A slot is buildable only if it touches a
// room that already reaches the access lift — flood fill from the entrance, orthogonal only. Without
// this the grid is an inventory with coordinates and where you dig means nothing.
export function reachable(b = baseState()) {
  const seen = new Set([ENTRANCE]), q = [ENTRANCE];
  while (q.length) {
    const i = q.pop(), c = colOf(i), r = rowOf(i);
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const c2 = c + dc, r2 = r + dr;
      if (c2 < 0 || c2 >= COLS || r2 < 0 || r2 >= ROWS) continue;
      const j = idx(c2, r2);
      if (seen.has(j) || !b.rooms[j]) continue;
      seen.add(j); q.push(j);
    }
  }
  return seen;
}

// where you may dig next: empty, and orthogonally touching something already connected
export function buildableSlots(b = baseState()) {
  const reach = reachable(b), out = [];
  for (let i = 0; i < SLOTS; i++) {
    if (b.rooms[i]) continue;
    const c = colOf(i), r = rowOf(i);
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const c2 = c + dc, r2 = r + dr;
      if (c2 < 0 || c2 >= COLS || r2 < 0 || r2 >= ROWS) continue;
      if (reach.has(idx(c2, r2))) { out.push(i); break; }
    }
  }
  return out;
}

export function canBuild(slot, fid, b = baseState()) {
  const f = facilityById(fid);
  if (!f) return { ok: false, why: 'NO SUCH FACILITY' };
  if (f.fixed) return { ok: false, why: 'THE ACCESS LIFT CANNOT BE BUILT TWICE' };
  if (slot < 0 || slot >= SLOTS) return { ok: false, why: 'OFF THE GRID' };
  if (b.rooms[slot]) return { ok: false, why: 'THAT SLOT IS ALREADY DUG' };
  if (!buildableSlots(b).includes(slot)) return { ok: false, why: 'NOT CONNECTED TO THE ACCESS LIFT' };
  return { ok: true, weeks: f.wk, cost: f.$ };
}

// Building starts a CLOCK, it does not finish a room. `tickWeeks` is called by the career's week
// turn, so a facility genuinely costs you the weeks it says it does.
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
  // ⚠ demolishing must not ORPHAN rooms behind it — the connectivity rule cuts both ways.
  const reach = reachable(b);
  for (let i = 0; i < SLOTS; i++) if (b.rooms[i] && !reach.has(i)) {
    b.rooms[slot] = keep;
    return { ok: false, why: 'THAT WOULD CUT OFF ROOMS BEHIND IT' };
  }
  saveBase();
  return { ok: true };
}

// -------------------------------------------------------------------------------------------------
// THE PEOPLE. Robert's ruling: staff are the answer to "who studies?" — researchers who never throw
// a punch. They have a major, a level, and a room they work in.
export const ROLES = ['Researcher', 'Engineer', 'Physician', 'Analyst', 'Technician', 'Instructor'];
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

// ⚠ A ROOM WITH NOBODY IN IT DOES NOTHING. This is the whole point of staff, so `staffed()` is what
// every consumer must ask — never `built`.
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

// What the base can currently DO — the one query every other system should ask.
export function capabilities(b = baseState()) {
  const out = { rooms: 0, building: 0, beds: housing(b), staff: b.staff.length, can: {} };
  for (let i = 0; i < SLOTS; i++) {
    const rm = b.rooms[i]; if (!rm) continue;
    if (!rm.built) { out.building++; continue; }
    out.rooms++;
    if (staffed(i, b)) out.can[rm.fid] = (out.can[rm.fid] || 0) + 1;
  }
  return out;
}

// one line for a surface, so nothing invents its own vocabulary
export function baseLine(b = baseState()) {
  const cap = capabilities(b);
  return `${b.name || 'UNNAMED FIRM'} · ${cap.rooms} ROOM${cap.rooms === 1 ? '' : 'S'}` +
    (cap.building ? ` · ${cap.building} UNDER CONSTRUCTION` : '') +
    ` · ${cap.staff}/${cap.beds} QUARTERED`;
}
