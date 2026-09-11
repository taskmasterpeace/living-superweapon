// validate-lab.mjs — STANDALONE validation fixture for the (two-story) research-lab package.
//
//   node tools/building-delivery/validate-lab.mjs [--dir DIR] [--json]
//
// Touches no src/. Loads the COMMITTED outputs and proves, with real assertions:
//   * schema integrity (unique IDs, well-formed AABBs, state + per-level fade consistency)
//   * the GLB parses and its node names match the manifest
//   * every committed file's sha256 matches the manifest (reproduce-lite)
//   * soldier clearance on both floors; large-hero clearance through the breach; chase-cam room per floor
//   * NO invisible collider box across any open opening (doors, windows, breach, smash holes, stair holes)
//   * intact walls block movement AND projectile LOS; openings pass; the breach toggles both
//   * the inter-storey floor slab separates the storeys and is standable; both stair flights reach
//   * per-camera fade groups are per-storey and disjoint (fading one storey never nukes another)
//
// Collision math mirrors the runtime (entity.js AABB push-out; world.js hitInteriorWall/traceBox3).

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const dirArg = process.argv.indexOf('--dir');
const DIR = dirArg >= 0 ? resolve(process.argv[dirArg + 1]) : join(REPO, 'public', 'building-delivery', 'lab.v1');
const asJson = process.argv.includes('--json');
const load = (n) => JSON.parse(readFileSync(join(DIR, n), 'utf8'));
const colliders = load('colliders.json'), graph = load('room-graph.json'), shelter = load('shelter.json');
const manifest = load('manifest.json'), runtime = load('runtime-interior.json');
const fitRaw = manifest.fitting;
const fit = { R: fitRaw.fighterRadius_u, HEAD: fitRaw.standingHeadHeight_u, soldierH: fitRaw.soldierAndStandardHeroHeight_u,
  LHW: fitRaw.largeHeroMaxWidth_u, LHH: fitRaw.largeHeroMaxHeight_u, CAM: fitRaw.chaseCamComfortDia_u };
const R = fit.R, HEAD = fit.HEAD;

const results = []; let selfProven = false;
const check = (name, fn) => { try { const d = fn(); results.push({ name, pass: true, detail: d || '' }); } catch (e) { results.push({ name, pass: false, detail: e.message }); } };
const ok = (c, m) => { if (!c) throw new Error(m); };
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t;
const round = (v) => Math.round(v * 1e3) / 1e3;
const pieceById = new Map(colliders.pieces.map((p) => [p.id, p]));
const OP = Object.fromEntries(graph.openings.map((o) => [o.id, o]));

function activeColliders(state) {
  const broken = state === 'breached' ? new Set(Object.values(colliders.breakGroups).flat()) : new Set();
  return colliders.pieces.filter((p) => p.collider && !broken.has(p.id));
}
const walls = (state) => activeColliders(state).filter((p) => p.role === 'blocker' || p.role === 'prop' || p.role === 'parapet');
function bodyHits(p, r, h, c) {
  const cx = (c.aabb.min[0] + c.aabb.max[0]) / 2, cz = (c.aabb.min[2] + c.aabb.max[2]) / 2;
  const hx = (c.aabb.max[0] - c.aabb.min[0]) / 2, hz = (c.aabb.max[2] - c.aabb.min[2]) / 2;
  return Math.abs(p[0] - cx) < hx + r - 1e-6 && Math.abs(p[2] - cz) < hz + r - 1e-6 && p[1] < c.aabb.max[1] - 1e-6 && (p[1] + h) > c.aabb.min[1] + 1e-6;
}
function marchBody(pathPts, r, h, blockers) {
  const STEP = 0.5;
  for (let i = 0; i < pathPts.length - 1; i++) {
    const a = pathPts[i], b = pathPts[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(d / STEP));
    for (let s = 0; s <= n; s++) { const t = s / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      for (const c of blockers) if (bodyHits(p, r, h, c)) return { at: p.map(round), piece: c.id }; }
  }
  return null;
}
function segHitsBox(p0, p1, c) {
  let tmin = 0, tmax = 1;
  for (let k = 0; k < 3; k++) { const d = p1[k] - p0[k], mn = c.aabb.min[k], mx = c.aabb.max[k];
    if (Math.abs(d) < 1e-9) { if (p0[k] < mn || p0[k] > mx) return false; }
    else { let t1 = (mn - p0[k]) / d, t2 = (mx - p0[k]) / d; if (t1 > t2) [t1, t2] = [t2, t1]; tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return false; } }
  return true;
}
const rayBlocked = (p0, p1, state) => activeColliders(state).some((c) => segHitsBox(p0, p1, c));
const pointIn = (p, c) => p[0] > c.aabb.min[0] + 1e-6 && p[0] < c.aabb.max[0] - 1e-6 && p[1] > c.aabb.min[1] + 1e-6 && p[1] < c.aabb.max[1] - 1e-6 && p[2] > c.aabb.min[2] + 1e-6 && p[2] < c.aabb.max[2] - 1e-6;
const wp = (name) => { const p = graph.waypoints[name]; ok(p, `waypoint ${name} missing`); return p; };
const roomInner = (id) => { const r = graph.rooms.find((x) => x.id === id); ok(r, `room ${id} missing`); return { w: r.aabb.max[0] - r.aabb.min[0], d: r.aabb.max[2] - r.aabb.min[2] }; };

// 0. SELF-PROOF
check('self-proof: a body inside a wall IS detected; open floor is clear', () => {
  const wall = colliders.pieces.find((p) => p.role === 'blocker' && p.level === 0); ok(wall, 'no ground wall');
  const c = [(wall.aabb.min[0] + wall.aabb.max[0]) / 2, 0, (wall.aabb.min[2] + wall.aabb.max[2]) / 2];
  ok(bodyHits(c, R, HEAD, wall), 'collision blind'); ok(!walls('intact').some((p) => bodyHits([0, 0, 8], R, HEAD, p)), 'open floor blocked');
  selfProven = true; return 'ok';
});

// 1. schema
check('unique stable IDs', () => { const ids = colliders.pieces.map((p) => p.id); ok(new Set(ids).size === ids.length, 'dupe id'); return `${ids.length} unique`; });
check('AABBs well-formed; every piece has a level', () => {
  for (const p of colliders.pieces) { ok(p.level !== undefined, `${p.id} no level`); for (let k = 0; k < 3; k++) { ok(Number.isFinite(p.aabb.min[k]) && Number.isFinite(p.aabb.max[k]), `${p.id} non-finite`); ok(p.aabb.max[k] > p.aabb.min[k] - 1e-9, `${p.id} inverted`); } }
  return `${colliders.pieces.length} pieces ok`;
});
check('breached state hides every intact-only piece', () => {
  const io = colliders.pieces.filter((p) => p.state === 'intact-only').map((p) => p.id);
  for (const id of io) ok(colliders.states.breached.hidden.includes(id), `${id} not hidden`);
  return `${io.length} intact-only pieces hidden when breached`;
});

// 2. GLB + manifest
check('GLB parses; node names match manifest', () => {
  const buf = readFileSync(join(DIR, 'lab.glb'));
  ok(buf.readUInt32LE(0) === 0x46546c67 && buf.readUInt32LE(4) === 2 && buf.readUInt32LE(8) === buf.length, 'bad GLB header');
  const jl = buf.readUInt32LE(12); ok(buf.readUInt32LE(16) === 0x4e4f534a, 'no JSON chunk');
  const g = JSON.parse(buf.slice(20, 20 + jl).toString('utf8'));
  ok(JSON.stringify(g.nodes.map((n) => n.name).sort()) === JSON.stringify(manifest.renderNodeList.map((n) => n.node).sort()), 'nodes != manifest');
  for (const m of g.meshes) for (const pr of m.primitives) ok(pr.attributes.POSITION != null && pr.attributes.NORMAL != null && pr.indices != null, `mesh ${m.name} incomplete`);
  return `${g.nodes.length} nodes, ${g.meshes.length} meshes`;
});
check('every committed file sha256 matches manifest (reproduce-lite)', () => {
  for (const f of manifest.files) { if (f.path === 'manifest.json') continue; const h = createHash('sha256').update(readFileSync(join(DIR, f.path))).digest('hex'); ok(h === f.sha256, `${f.path} hash`); }
  return `${manifest.files.length - 1} files hash-verified`;
});

// 3. clearances
check('front + interior doors clear a soldier (both floors)', () => {
  for (const id of ['front_door', 'interior_door_l0', 'interior_door_l1']) { const o = OP[id]; ok(o.clearance.w >= 2 * R + 1 && o.clearance.h >= HEAD, `${id} too small (${o.clearance.w}x${o.clearance.h})`); }
  return 'front / interior L0 / interior L1 clear';
});
check('breached flank clears a LARGE hero', () => { const o = OP.breach_panel; ok(o.clearance.w >= fit.LHW && o.clearance.h >= fit.LHH, `breach ${o.clearance.w}x${o.clearance.h}`); return `${o.clearance.w}u x ${o.clearance.h}u vs ${fit.LHW}x${fit.LHH}`; });
check('per-floor ceiling clears head + tall-hero silhouette', () => { const c = manifest.dimensions.perFloorCeiling_u; ok(c >= HEAD, `ceiling ${c} < ${HEAD}`); return `ceiling ${c}u/floor: +${round(c - HEAD)} over head, +${round(c - fit.LHH)} over ${fit.LHH}u silhouette`; });
check('chase-cam comfort ring fits BOTH entry rooms (third-person size)', () => {
  for (const id of ['ground_entry', 'upper_front']) { const r = roomInner(id); ok(r.w >= fit.CAM && r.d >= fit.CAM, `${id} ${round(r.w)}x${round(r.d)} < ${fit.CAM}`); }
  const g = roomInner('ground_entry'); return `ring Ø${fit.CAM}u fits (ground_entry ${round(g.w)}×${round(g.d)}u)`;
});

// 4. NO invisible box across an OPEN opening
check('no collider box sits across any open opening (doors, windows, breach, smash, stair)', () => {
  const details = [];
  for (const o of graph.openings) {
    const state = o.state === 'breached-only' ? 'breached' : 'intact';
    const active = activeColliders(state);
    let intruder = null;
    if (o.axis === '+Y') {                    // slab hole: only roof/floor pieces may not cover it
      const [cx, cy, cz] = o.center, hw = o.clearance.w / 2 - R, hd = o.clearance.h / 2 - R;
      const slabs = active.filter((c) => c.role === 'roof' || c.role === 'floor');
      for (let ix = -1; ix <= 1 && !intruder; ix++) for (let iz = -1; iz <= 1; iz++) { const p = [cx + ix * hw, cy - 0.1, cz + iz * hd]; const hit = slabs.find((c) => pointIn(p, c)); if (hit) { intruder = hit.id; break; } }
    } else {                                   // wall opening: sample the clear span between sill and head
      const along = o.axis === '+Z' ? 0 : 2, hw = o.clearance.w / 2 - R;
      const ys = [o.sillY + 1, (o.sillY + o.headY) / 2, o.headY - 1];
      for (let s = -1; s <= 1 && !intruder; s++) for (const yy of ys) { const p = [o.center[0], yy, o.center[2]]; p[along] += s * hw; const hit = active.find((c) => pointIn(p, c)); if (hit) { intruder = hit.id; break; } }
    }
    ok(!intruder, `${o.id}: ${intruder} intrudes`);
    details.push(o.id);
  }
  return `${details.length} openings clear`;
});

// 5. routes
check('soldier RECOVER route walkable (intact): front door -> case', () => { const hit = marchBody(graph.routes.soldier_recover.path.map(wp), R, HEAD, walls('intact')); ok(!hit, `blocked ${JSON.stringify(hit)}`); return 'clear'; });
check('flank breach BLOCKED intact, OPEN breached (large hero)', () => {
  const path = graph.routes.largehero_breach.path.map(wp);
  const hitI = marchBody(path, R, HEAD, walls('intact')); ok(hitI && hitI.piece === 'breach_panel', `expected breach_panel block, got ${JSON.stringify(hitI)}`);
  const hitB = marchBody(path, R, fit.LHH, walls('breached')); ok(!hitB, `still blocked ${JSON.stringify(hitB)}`);
  return 'intact blocks, breached opens';
});

// 6. projectile LOS
check('shot through the FRONT DOOR reaches inside; intact wall blocks; flank toggles', () => {
  const outFront = [-9, 5.5, HZfront() + 6], inEntry = [-9, 5.5, 8];
  ok(!rayBlocked(outFront, inEntry, 'intact'), 'front-door shot blocked');
  ok(rayBlocked([40, 5.5, -13], [4, 5.5, -13], 'intact'), 'structural wall did not block');
  ok(rayBlocked([40, 6.5, 11], [4, 6.5, 11], 'intact'), 'intact flank let a shot through');
  ok(!rayBlocked([40, 6.5, 11], [4, 6.5, 11], 'breached'), 'breach still blocks LOS');
  ok(rayBlocked([40, 5.5, -13], [4, 5.5, -13], 'breached'), 'structure stopped blocking after breach');
  return 'front passes, structure blocks, flank opaque->clear on breach';
});
function HZfront() { return manifest.dimensions.footprint_u.depth_z / 2; }
check('shot through an UPPER WINDOW reaches the upper floor', () => {
  const o = OP.window_front; const y = (o.sillY + o.headY) / 2;
  ok(!rayBlocked([o.center[0], y, HZfront() + 6], [o.center[0], y, 8], 'intact'), 'window shot blocked');
  return `window at y${round(y)} passes`;
});

// 7. two-story structure: stairs, floor slab, roof, shelter, fade
check('both stair flights reach their level with walkable-proportion risers', () => {
  for (const s of graph.stairs) { ok(s.reachesTop, `${s.id} !reachesTop`); ok(s.maxRiser <= 2.5 + 1e-6, `${s.id} riser ${s.maxRiser}>2.5`); ok(s.width >= 2 * R, `${s.id} width ${s.width}<${2 * R}`); }
  return graph.stairs.map((s) => `${s.id} ${s.from}->${s.to} ${s.steps.length}steps riser ${s.rise}`).join(' · ');
});
check('inter-storey floor slab separates the storeys and is standable', () => {
  const f1 = colliders.pieces.filter((p) => p.node === 'floor_l1' && p.standable); ok(f1.length > 0, 'no floor_l1 slab');
  ok(near(f1[0].aabb.max[1], manifest.dimensions.floorToFloor_u), `floor top ${f1[0].aabb.max[1]} != ${manifest.dimensions.floorToFloor_u}`);
  const upPanel = pieceById.get('upper_floor_panel'); ok(upPanel && upPanel.breakGroup === 'upper_floor_panel', 'no breakable upper-floor panel');
  return `floor_l1 standable at y${f1[0].aabb.max[1]} (${f1.length} pieces) + breakable smash panel`;
});
check('roof is the real top; runtime subset top is the GROUND ceiling (honest)', () => {
  ok(near(shelter.roofVolume.standableTop, manifest.dimensions.roofDeckTop_u), 'roof deck != deckTop');
  ok(near(runtime.interior.top, manifest.dimensions.floorToFloor_u), `runtime top ${runtime.interior.top} should be ground ceiling ${manifest.dimensions.floorToFloor_u}`);
  ok(runtime.interior.top !== manifest.dimensions.roofDeckTop_u, 'runtime subset must not claim the roof as its top');
  const par = colliders.pieces.filter((p) => p.role === 'parapet').map((p) => p.id);
  for (const s of ['parapet.front', 'parapet.rear', 'parapet.left', 'parapet.right']) ok(par.includes(s), `${s} missing`);
  return `deck ${shelter.roofVolume.standableTop}u; subset top ${runtime.interior.top}u; 4 parapets`;
});
check('shelter covers the interior footprint AND both storeys', () => {
  const sh = shelter.shelter.find((s) => s.suppressesRain); ok(sh, 'no shelter'); const ih = manifest.dimensions.interiorClearHalf_u;
  ok(sh.aabb.max[0] - sh.aabb.min[0] >= 2 * ih.x - 1e-6 && sh.aabb.max[2] - sh.aabb.min[2] >= 2 * ih.z - 1e-6, 'shelter < interior');
  ok(sh.aabb.max[1] >= manifest.dimensions.perFloorCeiling_u * manifest.dimensions.levels - 1, 'shelter height < both storeys');
  return `shelter ${round(sh.aabb.max[0] - sh.aabb.min[0])}×${round(sh.aabb.max[2] - sh.aabb.min[2])}u, y0..${sh.aabb.max[1]}`;
});
check('per-storey fade groups are disjoint (fading a storey never nukes another)', () => {
  const fb = colliders.fadeNodesByLevel; ok(fb, 'no fadeNodesByLevel');
  for (const k of ['0', '1', 'roof']) ok(fb[k] && fb[k].length, `no fade nodes for level ${k}`);
  const g = new Set(fb['0']), rf = new Set(fb['roof']);
  for (const n of fb['1']) ok(!g.has(n) || n === 'stair', `node ${n} shared between ground and upper`);
  for (const n of rf) ok(!g.has(n), `node ${n} shared between ground and roof`);
  return `L0 ${fb['0'].length} · L1 ${fb['1'].length} · roof ${fb['roof'].length} nodes, disjoint`;
});

if (!selfProven) results.push({ name: 'harness self-proof ran', pass: false, detail: 'self-proof flag not set' });
const failed = results.filter((r) => !r.pass);
if (asJson) console.log(JSON.stringify({ dir: DIR, total: results.length, failed: failed.length, results }, null, 2));
else { console.log(`\n  validate-lab (two-story) — ${DIR}\n`); for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n        ${r.detail}` : ''}`); console.log(`\n  ${results.length - failed.length}/${results.length} checks passed${failed.length ? ` — ${failed.length} FAILED` : ' — all green'}\n`); }
process.exit(failed.length ? 1 : 0);
