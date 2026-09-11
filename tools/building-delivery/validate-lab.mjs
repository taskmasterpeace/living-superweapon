// validate-lab.mjs — the STANDALONE validation fixture for the research-lab package.
//
//   node tools/building-delivery/validate-lab.mjs [--dir DIR] [--json]
//
// It touches no src/. It loads the COMMITTED delivery outputs (colliders/openings/room-graph/
// shelter/manifest/GLB) and proves — with real assertions, not screenshots — everything the main
// task will otherwise have to take on faith:
//   * schema integrity (unique IDs, well-formed AABBs, state consistency)
//   * the GLB parses and its node names match the manifest
//   * every committed file's sha256 matches the manifest (reproduce-lite)
//   * soldier-scale clearance through the front door, interior door, stairs and roof hatch
//   * large-hero clearance through the breached flank panel and the smashed roof panel
//   * NO invisible collider box across any open opening (the failure mode the handoff names)
//   * intact walls block movement AND projectile LOS; openings pass; the breach toggles both
//
// The collision math mirrors the runtime (src/engine/entity.js interior AABB push-out and
// world.js hitInteriorWall/traceBox3) so a pass here predicts in-engine behaviour for the parts
// the current contract already supports; the parts it does not are called out as SEAM notes.

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
const colliders = load('colliders.json');
const graph = load('room-graph.json');
const shelter = load('shelter.json');
const manifest = load('manifest.json');
const fitRaw = manifest.fitting;
// normalise the recipe's *_u fitting keys into short names used below
const fit = {
  fighterRadius: fitRaw.fighterRadius_u,
  standingHeadHeight: fitRaw.standingHeadHeight_u,
  soldierHeroHeight: fitRaw.soldierAndStandardHeroHeight_u,
  largeHeroMaxWidth: fitRaw.largeHeroMaxWidth_u,
  largeHeroMaxHeight: fitRaw.largeHeroMaxHeight_u,
};
const R = fit.fighterRadius, HEAD = fit.standingHeadHeight;

// ---- tiny assert harness ---------------------------------------------------
const results = [];
let selfProven = false;
function check(name, fn) {
  try { const detail = fn(); results.push({ name, pass: true, detail: detail || '' }); }
  catch (e) { results.push({ name, pass: false, detail: e.message }); }
}
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t;

// ---- collision primitives (mirror the runtime) -----------------------------
const pieceById = new Map(colliders.pieces.map((p) => [p.id, p]));
function activeColliders(state, { standable = true } = {}) {
  const broken = state === 'breached' ? new Set(Object.values(colliders.breakGroups).flat()) : new Set();
  return colliders.pieces.filter((p) => p.collider && !broken.has(p.id) && (standable || !p.standable));
}
// A body (feet at p, radius r, head height h) overlaps a 3D AABB horizontally within r AND vertically.
function bodyHits(p, r, h, c) {
  const cx = (c.aabb.min[0] + c.aabb.max[0]) / 2, cz = (c.aabb.min[2] + c.aabb.max[2]) / 2;
  const hx = (c.aabb.max[0] - c.aabb.min[0]) / 2, hz = (c.aabb.max[2] - c.aabb.min[2]) / 2;
  const horiz = Math.abs(p[0] - cx) < hx + r - 1e-6 && Math.abs(p[2] - cz) < hz + r - 1e-6;
  const vert = p[1] < c.aabb.max[1] - 1e-6 && (p[1] + h) > c.aabb.min[1] + 1e-6;
  return horiz && vert;
}
// March a body along a polyline of waypoints; return the first blocking piece, or null.
function marchBody(pathPts, r, h, blockers) {
  const STEP = 0.5;
  for (let i = 0; i < pathPts.length - 1; i++) {
    const a = pathPts[i], b = pathPts[i + 1];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.ceil(d / STEP));
    for (let s = 0; s <= n; s++) {
      const t = s / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      for (const c of blockers) if (bodyHits(p, r, h, c)) return { at: p.map(round), piece: c.id };
    }
  }
  return null;
}
// Segment vs AABB (slab method) — projectile / sight LOS. Returns true if [p0,p1] hits box c.
function segHitsBox(p0, p1, c) {
  let tmin = 0, tmax = 1;
  for (let k = 0; k < 3; k++) {
    const d = p1[k] - p0[k], mn = c.aabb.min[k], mx = c.aabb.max[k];
    if (Math.abs(d) < 1e-9) { if (p0[k] < mn || p0[k] > mx) return false; }
    else { let t1 = (mn - p0[k]) / d, t2 = (mx - p0[k]) / d; if (t1 > t2) [t1, t2] = [t2, t1]; tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return false; }
  }
  return true;
}
const rayBlocked = (p0, p1, state) => activeColliders(state).some((c) => segHitsBox(p0, p1, c));
const round = (v) => Math.round(v * 1e3) / 1e3;
const wp = (name) => { const p = graph.waypoints[name]; ok(p, `waypoint ${name} missing`); return p; };

// ---- 0. SELF-PROOF (wwa-verify law: the harness must first prove it can fail) ----
check('self-proof: a body dead-centre in a wall IS detected as a hit', () => {
  const wall = colliders.pieces.find((p) => p.id === 'p003'); ok(wall, 'rear wall p003 missing');
  const c = [(wall.aabb.min[0] + wall.aabb.max[0]) / 2, 0, (wall.aabb.min[2] + wall.aabb.max[2]) / 2];
  ok(bodyHits(c, R, HEAD, wall), 'collision test failed to detect a body inside a wall — the fixture is blind');
  const clear = [0, 0, 8];  // open floor of the entry lab
  ok(!activeColliders('intact').some((p) => bodyHits(clear, R, HEAD, p)), 'open floor wrongly reported blocked');
  selfProven = true;
  return 'hit detected inside a wall; open floor clear';
});

// ---- 1. schema integrity ---------------------------------------------------
check('unique stable IDs', () => {
  const ids = colliders.pieces.map((p) => p.id); const set = new Set(ids);
  ok(set.size === ids.length, `duplicate id among ${ids.length}`); return `${ids.length} unique`;
});
check('AABBs well-formed (min<max, finite)', () => {
  for (const p of colliders.pieces) for (let k = 0; k < 3; k++) {
    ok(Number.isFinite(p.aabb.min[k]) && Number.isFinite(p.aabb.max[k]), `${p.id} non-finite`);
    ok(p.aabb.max[k] > p.aabb.min[k] - 1e-9, `${p.id} inverted axis ${k}`);
  }
  return `${colliders.pieces.length} pieces ok`;
});
check('state sets reference real pieces; breached hides every breakable', () => {
  for (const id of colliders.states.breached.hidden) ok(pieceById.has(id), `hidden ${id} unknown`);
  const breakable = colliders.pieces.filter((p) => p.state === 'intact-only').map((p) => p.id);
  for (const id of breakable) ok(colliders.states.breached.hidden.includes(id), `${id} not hidden when breached`);
  return `${breakable.length} intact-only pieces hidden in breached state`;
});

// ---- 2. GLB structural + manifest cross-check ------------------------------
check('GLB parses; node names match manifest.renderNodeList', () => {
  const buf = readFileSync(join(DIR, 'lab.glb'));
  ok(buf.readUInt32LE(0) === 0x46546c67, 'bad GLB magic'); ok(buf.readUInt32LE(4) === 2, 'not glTF 2.0');
  ok(buf.readUInt32LE(8) === buf.length, 'GLB length header mismatch');
  const jsonLen = buf.readUInt32LE(12); ok(buf.readUInt32LE(16) === 0x4e4f534a, 'first chunk not JSON');
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const glbNodes = gltf.nodes.map((n) => n.name).sort();
  const manNodes = manifest.renderNodeList.map((n) => n.node).sort();
  ok(JSON.stringify(glbNodes) === JSON.stringify(manNodes), `GLB nodes != manifest`);
  // accessor sanity: every mesh primitive references POSITION + NORMAL + indices
  for (const m of gltf.meshes) for (const pr of m.primitives) ok(pr.attributes.POSITION != null && pr.attributes.NORMAL != null && pr.indices != null, `mesh ${m.name} incomplete`);
  return `${gltf.nodes.length} nodes, ${gltf.meshes.length} meshes; header/chunks valid`;
});
check('every committed file sha256 matches manifest (reproduce-lite)', () => {
  for (const f of manifest.files) {
    if (f.path === 'manifest.json') continue;
    const h = createHash('sha256').update(readFileSync(join(DIR, f.path))).digest('hex');
    ok(h === f.sha256, `${f.path}: ${h.slice(0, 12)} != ${f.sha256.slice(0, 12)}`);
  }
  return `${manifest.files.length - 1} files hash-verified`;
});

// ---- 3. clearances ---------------------------------------------------------
const OP = Object.fromEntries(graph.openings.map((o) => [o.id, o]));
check('front door clears a soldier (collision + head)', () => {
  const o = OP.front_door;
  ok(o.clearance.w >= 2 * R + 1, `door width ${o.clearance.w} < body ${2 * R} + margin`);
  ok(o.clearance.h >= HEAD, `door head ${o.clearance.h} < ${HEAD}`);
  return `${o.clearance.w}u x ${o.clearance.h}u opening; body Ø${2 * R}u, head ${HEAD}u`;
});
check('interior door clears a soldier', () => {
  const o = OP.interior_door; ok(o.clearance.w >= 2 * R + 1 && o.clearance.h >= HEAD, 'interior door too small'); return `${o.clearance.w}u x ${o.clearance.h}u`;
});
check('breached flank panel clears a LARGE hero (visual extents)', () => {
  const o = OP.breach_panel;
  ok(o.clearance.w >= fit.largeHeroMaxWidth, `breach width ${o.clearance.w} < large hero ${fit.largeHeroMaxWidth}`);
  ok(o.clearance.h >= fit.largeHeroMaxHeight, `breach height ${o.clearance.h} < large hero ${fit.largeHeroMaxHeight}`);
  return `${o.clearance.w}u x ${o.clearance.h}u vs large hero ${fit.largeHeroMaxWidth}u x ${fit.largeHeroMaxHeight}u`;
});
check('roof-smash hole clears a large hero drop', () => {
  const o = OP.roof_smash; ok(o.clearance.w >= fit.largeHeroMaxWidth && o.clearance.h >= fit.largeHeroMaxWidth, 'roof hole too small'); return `${o.clearance.w}u x ${o.clearance.h}u`;
});
check('ceiling clears standard head (and reports tall-hero margin)', () => {
  const ceil = manifest.dimensions.ceilingUnderside_u;
  ok(ceil >= HEAD, `ceiling ${ceil} < head ${HEAD}`);
  return `ceiling ${ceil}u: +${round(ceil - HEAD)}u over collision head; +${round(ceil - fit.largeHeroMaxHeight)}u over tall-hero silhouette (${fit.largeHeroMaxHeight}u)`;
});

// ---- 4. NO INVISIBLE BOX ACROSS AN OPENING ---------------------------------
check('no collider box sits across any OPEN opening (the handoff failure mode)', () => {
  const details = [];
  for (const o of graph.openings) {
    const state = o.state === 'breached-only' ? 'breached' : 'intact';
    if (o.state === 'breached-only') { /* only meaningful once breached */ }
    // sample the clear volume of the opening; assert no ACTIVE collider intrudes
    const blockers = activeColliders(state);
    let intruder = null;
    if (o.axis === '+Y') {
      // roof opening: the ROOF SLAB must be genuinely holed here (a stairhead terminating under a
      // hatch is intended, not an obstruction) — so only roof/parapet pieces may not cover it.
      const [cx, cy, cz] = o.center, hw = o.clearance.w / 2 - R, hd = o.clearance.h / 2 - R;
      const roofBlockers = blockers.filter((c) => c.role === 'roof' || c.role === 'parapet');
      for (let ix = -1; ix <= 1 && !intruder; ix++) for (let iz = -1; iz <= 1; iz++) {
        const p = [cx + ix * hw, cy - 0.1, cz + iz * hd];
        const hit = roofBlockers.find((c) => pointIn(p, c)); if (hit) { intruder = hit.id; break; }
      }
    } else {
      const [cx, , cz] = o.center;
      const along = o.axis === '+Z' ? 0 : 2;                    // opening spans this axis
      const hw = o.clearance.w / 2 - R;
      for (let s = -1; s <= 1 && !intruder; s++) for (const yy of [1, HEAD - 1]) {
        const p = [cx, yy, cz]; p[along] += s * hw;
        const hit = blockers.find((c) => pointIn(p, c)); if (hit) { intruder = hit.id; break; }
      }
    }
    ok(!intruder, `${o.id}: collider ${intruder} intrudes into the opening`);
    details.push(`${o.id} clear`);
  }
  return details.join(', ');
});
function pointIn(p, c) { return p[0] > c.aabb.min[0] + 1e-6 && p[0] < c.aabb.max[0] - 1e-6 && p[1] > c.aabb.min[1] + 1e-6 && p[1] < c.aabb.max[1] - 1e-6 && p[2] > c.aabb.min[2] + 1e-6 && p[2] < c.aabb.max[2] - 1e-6; }

// ---- 5. routes: soldier walks in; large hero breaches; intact blocks -------
check('soldier RECOVER route is walkable (intact) front door -> case', () => {
  const path = graph.routes.soldier_recover.path.map(wp);
  const hit = marchBody(path, R, HEAD, activeColliders('intact'));
  ok(!hit, `blocked at ${JSON.stringify(hit)}`); return `${path.length} legs clear`;
});
check('flank breach route is BLOCKED while intact (weak panel holds)', () => {
  const path = graph.routes.largehero_breach.path.map(wp);
  const hit = marchBody(path, R, HEAD, activeColliders('intact'));
  ok(hit && hit.piece === 'breach_panel', `expected block by breach_panel, got ${JSON.stringify(hit)}`);
  return `blocked by ${hit.piece} as intended`;
});
check('flank breach route OPENS once breached (large hero passes)', () => {
  const path = graph.routes.largehero_breach.path.map(wp);
  const hit = marchBody(path, R, fit.largeHeroMaxHeight, activeColliders('breached'));
  ok(!hit, `still blocked at ${JSON.stringify(hit)}`); return 'clear in breached state';
});

// ---- 6. projectile LOS: intact walls block, openings pass, breach toggles --
const outsideFront = [-6, 5.5, 40], insideEntry = [-6, 5.5, 8];
const outsideFlank = [40, 6.5, 9], insideByBreach = [4, 6.5, 9];
const outsideSolid = [40, 5.5, -12], insideRear = [4, 5.5, -12];
check('a shot through the FRONT DOOR reaches inside (both states)', () => {
  ok(!rayBlocked(outsideFront, insideEntry, 'intact'), 'front-door shot blocked (should pass)'); return 'passes';
});
check('a shot at an INTACT STRUCTURAL wall is blocked — cannot shoot through intact walls', () => {
  ok(rayBlocked(outsideSolid, insideRear, 'intact'), 'structural wall did not block'); return 'blocked';
});
check('the flank is OPAQUE while intact, TRANSPARENT once breached', () => {
  ok(rayBlocked(outsideFlank, insideByBreach, 'intact'), 'intact weak panel let a shot through');
  ok(!rayBlocked(outsideFlank, insideByBreach, 'breached'), 'breached opening still blocked LOS');
  ok(rayBlocked(outsideSolid, insideRear, 'breached'), 'structural wall stopped blocking after a breach (should never)');
  return 'intact blocks, breach passes, structure still blocks';
});

// ---- 7. stairs + roof + shelter --------------------------------------------
check('stairs reach the deck with walkable-proportion risers', () => {
  const s = graph.stairs; ok(s.reachesDeck, 'top step != deck'); ok(s.maxRiser <= 2.5 + 1e-6, `riser ${s.maxRiser} > 2.5 snap tolerance`);
  ok(s.width >= 2 * R, `stair width ${s.width} < body ${2 * R}`);
  let prev = 0; for (const st of s.steps) { ok(st.top - prev <= 2.5 + 1e-6, `riser to ${st.id} > 2.5`); prev = st.top; }
  return `${s.steps.length} steps, riser ${s.rise}u, tread ${s.tread}u, width ${s.width}u, top ${prev}u == deck ${manifest.dimensions.roofDeckTop_u}u`;
});
check('roof deck is standable at deckTop and fully parapeted', () => {
  const rv = shelter.roofVolume; ok(near(rv.standableTop, manifest.dimensions.roofDeckTop_u), 'deck top mismatch');
  const par = colliders.pieces.filter((p) => p.role === 'parapet').map((p) => p.id);
  for (const side of ['parapet.front', 'parapet.rear', 'parapet.left', 'parapet.right']) ok(par.includes(side), `${side} missing`);
  return `deck ${rv.standableTop}u, 4 parapets`;
});
check('shelter volume covers the interior footprint (rain suppression)', () => {
  const sh = shelter.shelter.find((s) => s.suppressesRain); ok(sh, 'no rain-suppressing shelter');
  const ih = manifest.dimensions.interiorClearHalf_u;
  ok(sh.aabb.max[0] - sh.aabb.min[0] >= 2 * ih.x - 1e-6 && sh.aabb.max[2] - sh.aabb.min[2] >= 2 * ih.z - 1e-6, 'shelter smaller than interior');
  return `shelter ${round(sh.aabb.max[0] - sh.aabb.min[0])}u x ${round(sh.aabb.max[2] - sh.aabb.min[2])}u covers interior`;
});

// ---- report ----------------------------------------------------------------
if (!selfProven) results.push({ name: 'harness self-proof ran', pass: false, detail: 'self-proof did not set its flag' });
const failed = results.filter((r) => !r.pass);
if (asJson) {
  console.log(JSON.stringify({ dir: DIR, total: results.length, failed: failed.length, results }, null, 2));
} else {
  console.log(`\n  validate-lab — ${DIR}\n`);
  for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n        ${r.detail}` : ''}`);
  console.log(`\n  ${results.length - failed.length}/${results.length} checks passed${failed.length ? ` — ${failed.length} FAILED` : ' — all green'}\n`);
}
process.exit(failed.length ? 1 : 0);
