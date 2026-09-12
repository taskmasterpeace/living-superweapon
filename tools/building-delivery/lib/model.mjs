// model.mjs — SINGLE SOURCE OF TRUTH for the research-lab building package (multi-story).
//
// buildModel(recipe) turns the authored recipe into a fully-derived model: render pieces (boxes),
// collider AABBs with stable IDs and a `level`, the room/opening graph, stairs, roof/shelter
// volumes, and bounded debris. Every emitter (GLB writer, colliders.json, room-graph.json, the
// annotated views, the standalone fixture) consumes THIS, so nothing can drift.
//
// Multi-story is first-class: a building is a stack of levels. Each level has shell walls + a
// partition, an inter-storey floor slab above the level below it (the upper floor IS the lower
// ceiling — one thick box), and the topmost slab is the roof. Stairs connect levels; a stair's head
// punches a hole in the slab it reaches. Node names carry the level so the runtime can fade only the
// storey/slab between the chase camera and the player (never a global roof removal).
//
// All coordinates are PowerWorld world units (u). Origin (0,0,0) = footprint ground-centre, floor
// plane y=0, entrance faces +Z, breach flank +X.

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const EPS = 1e-6;
const round = (v) => Math.round(v * 1e5) / 1e5;
const box = (min, max) => ({ min: min.map(round), max: max.map(round) });
const bboxUnion = (boxes) => {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], b.min[k]); mx[k] = Math.max(mx[k], b.max[k]); }
  return { min: mn.map(round), max: mx.map(round) };
};

// Rectangle (plane a,b) minus axis-aligned holes -> covering rectangles (edge sweep + row merge).
function rectMinusHoles(outer, holes) {
  const xs = new Set([outer.a0, outer.a1]), ys = new Set([outer.b0, outer.b1]);
  for (const h of holes) {
    xs.add(clamp(h.a0, outer.a0, outer.a1)); xs.add(clamp(h.a1, outer.a0, outer.a1));
    ys.add(clamp(h.b0, outer.b0, outer.b1)); ys.add(clamp(h.b1, outer.b0, outer.b1));
  }
  const X = [...xs].sort((p, q) => p - q), Y = [...ys].sort((p, q) => p - q), cells = [];
  for (let j = 0; j < Y.length - 1; j++) {
    const b0 = Y[j], b1 = Y[j + 1]; if (b1 - b0 < EPS) continue;
    let run = null;
    for (let i = 0; i < X.length - 1; i++) {
      const a0 = X[i], a1 = X[i + 1]; if (a1 - a0 < EPS) continue;
      const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
      let inHole = false;
      for (const h of holes) if (ca > h.a0 + EPS && ca < h.a1 - EPS && cb > h.b0 + EPS && cb < h.b1 - EPS) { inHole = true; break; }
      if (inHole) { if (run) { cells.push(run); run = null; } continue; }
      if (run && Math.abs(run.a1 - a0) < EPS) run.a1 = a1; else { if (run) cells.push(run); run = { a0, a1, b0, b1 }; }
    }
    if (run) cells.push(run);
  }
  return cells;
}

export function buildModel(recipe) {
  const R = recipe, fp = R.footprint, st = R.storey, mats = R.materials;
  const T = fp.wallThickness, ht = T / 2;
  const HX = fp.width_x / 2, HZ = fp.depth_z / 2, inX = HX - T, inZ = HZ - T;
  const Hc = st.clearHeight, Ts = st.slabThickness, F2F = Hc + Ts;      // floor-to-floor
  const NL = R.levels.length;
  const levelY = (i) => ({ floorY: i * F2F, ceil: i * F2F + Hc, slabTop: i * F2F + F2F });
  const roofDeckTop = NL * F2F, roofCeil = roofDeckTop - Ts;
  const parapetTop = roofDeckTop + st.parapetHeight;

  const pieces = [];
  let auto = 0;
  const add = (p) => {
    const m = mats[p.material] || {};
    const id = p.id || `p${(auto++).toString().padStart(3, '0')}`;
    pieces.push({
      id, level: p.level, role: p.role, material: p.material,
      node: (p.node || 'node').replace(/[^A-Za-z0-9_-]/g, '_'),   // dot-free: GLTFLoader sanitises '.'→'_'
      aabb: p.aabb,
      collider: p.collider !== false && p.role !== 'decor',
      standable: !!p.standable,
      breakable: !!(m.breakable && p.breakGroup),
      breakGroup: p.breakGroup || null,
      hp: p.hp != null ? p.hp : (m.hp != null ? m.hp : null),
      dtype: p.dtype || m.dtype || 'structural',
      color: m.color, metallic: m.metallic ?? 0, roughness: m.roughness ?? 0.9, emissive: m.emissive || null,
      state: p.state || 'always',
      note: p.note || undefined,
    });
    return pieces[pieces.length - 1];
  };

  // A punched wall in its (horizontal-axis, y) plane, extruded by thickness. openings: {c,w,sillY,headY} absolute Y.
  function punchedWall({ orient, fixed, aFrom, aTo, yBot, yTop, openings, material, node, level, role = 'blocker' }) {
    const cells = rectMinusHoles({ a0: aFrom, a1: aTo, b0: yBot, b1: yTop },
      (openings || []).map((o) => ({ a0: o.c - o.w / 2, a1: o.c + o.w / 2, b0: o.sillY, b1: o.headY })));
    for (const c of cells) {
      const min = orient === 'x' ? [c.a0, c.b0, fixed - ht] : [fixed - ht, c.b0, c.a0];
      const max = orient === 'x' ? [c.a1, c.b1, fixed + ht] : [fixed + ht, c.b1, c.a1];
      add({ role, material, node, level, aabb: box(min, max) });
    }
  }
  // A horizontal slab (x,z plane) minus holes, extruded in y by [yBot,yTop].
  function punchedSlab({ holes, yBot, yTop, material, node, level, role, standable }) {
    for (const c of rectMinusHoles({ a0: -HX, a1: HX, b0: -HZ, b1: HZ }, holes))
      add({ role, standable, material, node, level, aabb: box([c.a0, yBot, c.b0], [c.a1, yTop, c.b1]) });
  }

  const WALLS = { '+Z': { orient: 'x', fixed: HZ - ht, a: [-HX, HX] }, '-Z': { orient: 'x', fixed: -(HZ - ht), a: [-HX, HX] },
                  '+X': { orient: 'z', fixed: HX - ht, a: [-HZ, HZ] }, '-X': { orient: 'z', fixed: -(HX - ht), a: [-HZ, HZ] } };

  const openings = [], rooms = [], stripes = [];

  // ---- per level: shell walls (+ openings), partition, floor slab below (if i>=1), rooms ----
  R.levels.forEach((L, i) => {
    const { floorY, ceil } = levelY(i);
    const node = `shell_l${i}`;
    for (const side of ['+Z', '-Z', '+X', '-X']) {
      const w = WALLS[side];
      const ops = L.exterior.filter((o) => o.wall === side).map((o) => ({ c: o.center, w: o.width, sillY: floorY + o.sill, headY: floorY + o.height }));
      punchedWall({ orient: w.orient, fixed: w.fixed, aFrom: w.a[0], aTo: w.a[1], yBot: floorY, yTop: ceil, openings: ops, material: 'structural', node, level: i });
    }
    // partition across X with an interior doorway
    const pd = L.partition.door;
    punchedWall({ orient: 'x', fixed: L.partition.z, aFrom: -inX, aTo: inX, yBot: floorY, yTop: ceil,
      openings: [{ c: pd.centerX, w: pd.width, sillY: floorY, headY: floorY + pd.height }], material: 'structural', node, level: i });
    const frontRoom = L.rooms.find((r) => r.side === 'front'), rearRoom = L.rooms.find((r) => r.side === 'rear');
    openings.push({ id: `interior_door_l${i}`, level: i, connects: [frontRoom && frontRoom.id, rearRoom && rearRoom.id], axis: '+Z',
      center: [pd.centerX, round(floorY + pd.height / 2), L.partition.z].map(round), clearance: { w: pd.width, h: pd.height },
      sillY: floorY, headY: round(floorY + pd.height), state: 'always', route: 'soldier', kind: 'door' });

    // rooms (front/rear split at partition.z)
    for (const rm of L.rooms) {
      const aabb = rm.side === 'front'
        ? box([-inX, floorY, L.partition.z + ht], [inX, ceil, inZ])
        : box([-inX, floorY, -inZ], [inX, ceil, L.partition.z - ht]);
      rooms.push({ id: rm.id, name: rm.name, level: i, floorY, ceilingY: ceil, aabb });
    }

    // exterior openings -> graph + hazard stripes for the breach
    for (const o of L.exterior) {
      const w = WALLS[o.wall], axisIsX = w.orient === 'x';
      const center = axisIsX ? [o.center, floorY + (o.sill + o.height) / 2, w.fixed] : [w.fixed, floorY + (o.sill + o.height) / 2, o.center];
      openings.push({ id: o.id, level: i, connects: o.connects, axis: o.wall, center: center.map(round),
        clearance: { w: o.width, h: o.height - o.sill }, sillY: round(floorY + o.sill), headY: round(floorY + o.height),
        state: o.state === 'opens-when-breached' ? 'breached-only' : 'always', route: o.route, breakGroup: o.breakGroup, kind: o.kind });
      if (o.kind === 'breach') {   // filled by a weak panel until breached
        const z0 = o.center - o.width / 2, z1 = o.center + o.width / 2;
        add({ id: o.breakGroup, role: 'blocker', material: 'weak_panel', node: `breakable_${o.breakGroup}`, level: i, breakGroup: o.breakGroup, state: 'intact-only',
          aabb: box([w.fixed - ht, floorY + o.sill, z0], [w.fixed + ht, floorY + o.height, z1]) });
        for (let s = 0; s < 3; s++) { const zc = o.center + (s - 1) * (o.width / 3.2);
          add({ id: `${o.breakGroup}.stripe${s}`, role: 'decor', collider: false, material: 'hazard_stripe', node: `breakable_${o.breakGroup}_stripe`, level: i, breakGroup: o.breakGroup, state: 'intact-only',
            aabb: box([w.fixed + ht + 0.02, floorY + 1.5, zc - 0.9], [w.fixed + ht + 0.22, floorY + o.height - 1.5, zc + 0.9]) }); }
      }
      if (o.kind === 'door' && o.breakGroup) {   // swung-open leaf, hinged clear of the opening (never fills it)
        const fdx0 = o.center - o.width / 2;
        add({ id: o.breakGroup, role: 'decor', collider: false, material: 'door_leaf', node: `breakable_${o.breakGroup}`, level: i, breakGroup: o.breakGroup, state: 'intact-only',
          aabb: box([fdx0 - o.width + 0.4, floorY, w.fixed - ht - 0.2], [fdx0 - 0.2, floorY + o.height, w.fixed - ht + 0.2]) });
        // gold frame (decor)
        const fdx1 = o.center + o.width / 2;
        add({ id: `${o.id}.frame.l`, role: 'decor', collider: false, material: 'door_frame', node: `trim_l${i}`, level: i, aabb: box([fdx0 - 0.6, floorY, w.fixed - ht - 0.1], [fdx0, floorY + o.height + 0.6, w.fixed + ht + 0.1]) });
        add({ id: `${o.id}.frame.r`, role: 'decor', collider: false, material: 'door_frame', node: `trim_l${i}`, level: i, aabb: box([fdx1, floorY, w.fixed - ht - 0.1], [fdx1 + 0.6, floorY + o.height + 0.6, w.fixed + ht + 0.1]) });
        add({ id: `${o.id}.frame.h`, role: 'decor', collider: false, material: 'door_frame', node: `trim_l${i}`, level: i, aabb: box([fdx0 - 0.6, floorY + o.height, w.fixed - ht - 0.1], [fdx1 + 0.6, floorY + o.height + 0.6, w.fixed + ht + 0.1]) });
      }
    }

    // case pedestal + cyan marker (ground)
    if (L.casePedestal) {
      const cp = L.casePedestal;
      add({ id: 'case.pedestal', role: 'prop', standable: true, material: 'pedestal', node: 'case_pedestal', level: i, aabb: box([cp.x - cp.width / 2, floorY, cp.z - cp.depth / 2], [cp.x + cp.width / 2, floorY + cp.height, cp.z + cp.depth / 2]) });
      add({ id: 'case.glow', role: 'decor', collider: false, material: 'case_glow', node: 'case_glow', level: i, aabb: box([cp.x - 1.2, floorY + cp.height, cp.z - 1.2], [cp.x + 1.2, floorY + cp.height + 0.6, cp.z + 1.2]) });
    }
  });

  // A stair's OPEN SHAFT = the slab-above hole covering the whole run, so a climbing fighter has
  // headroom the entire way up (not just a landing hole). Derived from the run, never hand-authored.
  const stairShaft = (s) => {
    const zA = s.startZ, zB = s.startZ + s.dir * s.steps * s.tread, m = s.shaftMargin ?? 0.5;
    return { a0: s.bayMinX, a1: s.bayMaxX, b0: Math.min(zA, zB) - m, b1: Math.max(zA, zB) + m,
      centerX: (s.bayMinX + s.bayMaxX) / 2, exitZ: zB, width: s.bayMaxX - s.bayMinX, depth: Math.abs(zB - zA) + 2 * m };
  };

  // ---- inter-storey floor slabs (upper floor = lower ceiling) ----
  const floorHolesFor = (i) => {
    const holes = [];
    for (const s of R.stairs) if (levelY(i).floorY === s.topY) { const sh = stairShaft(s); holes.push({ a0: sh.a0, a1: sh.a1, b0: sh.b0, b1: sh.b1 }); }
    for (const fpnl of (R.floorPanels || [])) if (fpnl.level === i) holes.push({ a0: fpnl.centerX - fpnl.width / 2, a1: fpnl.centerX + fpnl.width / 2, b0: fpnl.centerZ - fpnl.depth / 2, b1: fpnl.centerZ + fpnl.depth / 2 });
    return holes;
  };
  for (let i = 1; i < NL; i++) {
    const yBot = levelY(i - 1).ceil, yTop = levelY(i).floorY;   // 14.8..16 for i=1
    punchedSlab({ holes: floorHolesFor(i), yBot, yTop, material: 'floor_struct', node: `floor_l${i}`, level: i, role: 'floor', standable: true });
    // breakable floor panels filling their holes
    for (const fpnl of (R.floorPanels || [])) if (fpnl.level === i) {
      add({ id: fpnl.id, role: 'floor', standable: true, material: fpnl.material || 'roof_panel_weak', node: `breakable_${fpnl.breakGroup}`, level: i, breakGroup: fpnl.breakGroup, state: 'intact-only',
        aabb: box([fpnl.centerX - fpnl.width / 2, yBot, fpnl.centerZ - fpnl.depth / 2], [fpnl.centerX + fpnl.width / 2, yTop, fpnl.centerZ + fpnl.depth / 2]) });
      add({ id: `${fpnl.id}.mark`, role: 'decor', collider: false, material: 'hazard_stripe', node: `breakable_${fpnl.breakGroup}_mark`, level: i, breakGroup: fpnl.breakGroup, state: 'intact-only',
        aabb: box([fpnl.centerX - fpnl.width / 2, yTop, fpnl.centerZ - fpnl.depth / 2], [fpnl.centerX - fpnl.width / 2 + 1.4, yTop + 0.12, fpnl.centerZ + fpnl.depth / 2]) });
      openings.push({ id: `${fpnl.id}_smash`, level: i, connects: ['upper_front', 'ground_entry'], axis: '+Y', center: [fpnl.centerX, yTop, fpnl.centerZ].map(round), clearance: { w: fpnl.width, h: fpnl.depth }, state: 'breached-only', route: 'large-hero', breakGroup: fpnl.breakGroup, kind: 'smash' });
    }
  }

  // ---- roof: topmost slab (holes: top stair head + weak panel), breakable panel, parapet ----
  const roofHoles = [];
  for (const s of R.stairs) if (s.topY === roofDeckTop) { const sh = stairShaft(s); roofHoles.push({ a0: sh.a0, a1: sh.a1, b0: sh.b0, b1: sh.b1 }); }
  const rwp = R.roof.weakPanel;
  roofHoles.push({ a0: rwp.centerX - rwp.width / 2, a1: rwp.centerX + rwp.width / 2, b0: rwp.centerZ - rwp.depth / 2, b1: rwp.centerZ + rwp.depth / 2 });
  punchedSlab({ holes: roofHoles, yBot: roofCeil, yTop: roofDeckTop, material: 'roof_slab', node: 'roof_structural', level: 'roof', role: 'roof', standable: true });
  add({ id: rwp.id, role: 'roof', standable: true, material: 'roof_panel_weak', node: `breakable_${rwp.breakGroup}`, level: 'roof', breakGroup: rwp.breakGroup, state: 'intact-only',
    aabb: box([rwp.centerX - rwp.width / 2, roofCeil, rwp.centerZ - rwp.depth / 2], [rwp.centerX + rwp.width / 2, roofDeckTop, rwp.centerZ + rwp.depth / 2]) });
  add({ id: `${rwp.id}.mark`, role: 'decor', collider: false, material: 'hazard_stripe', node: `breakable_${rwp.breakGroup}_mark`, level: 'roof', breakGroup: rwp.breakGroup, state: 'intact-only',
    aabb: box([rwp.centerX - rwp.width / 2, roofDeckTop, rwp.centerZ - rwp.depth / 2], [rwp.centerX - rwp.width / 2 + 1.4, roofDeckTop + 0.12, rwp.centerZ + rwp.depth / 2]) });
  openings.push({ id: `${rwp.id}_smash`, level: 'roof', connects: ['roof', 'upper_rear'], axis: '+Y', center: [rwp.centerX, roofDeckTop, rwp.centerZ].map(round), clearance: { w: rwp.width, h: rwp.depth }, state: 'breached-only', route: 'large-hero', breakGroup: rwp.breakGroup, kind: 'smash' });
  // parapet ring
  const pT = st.parapetThickness, pTop = parapetTop;
  const par = (min, max, id) => add({ id, role: 'parapet', material: 'parapet', node: 'roof_parapet', level: 'roof', aabb: box(min, max), standable: false });
  par([-HX, roofDeckTop, HZ - pT], [HX, pTop, HZ], 'parapet.front');
  par([-HX, roofDeckTop, -HZ], [HX, pTop, -HZ + pT], 'parapet.rear');
  par([-HX, roofDeckTop, -HZ + pT], [-HX + pT, pTop, HZ - pT], 'parapet.left');
  par([HX - pT, roofDeckTop, -HZ + pT], [HX, pTop, HZ - pT], 'parapet.right');

  // ---- stairs (step boxes) + vertical openings ----
  const stairsOut = [];
  for (const s of R.stairs) {
    const rise = (s.topY - s.baseY) / s.steps, steps = [];
    for (let k = 1; k <= s.steps; k++) {
      const zA = s.startZ + s.dir * (k - 1) * s.tread, zB = s.startZ + s.dir * k * s.tread;
      const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB), top = s.baseY + k * rise;
      const p = add({ id: `${s.id}.step${k}`, role: 'step', standable: true, material: 'stair', node: 'stair', level: s.from, aabb: box([s.bayMinX, s.baseY, z0], [s.bayMaxX, top, z1]) });
      steps.push({ id: p.id, index: k, top: round(top), aabb: p.aabb });
    }
    const sh = stairShaft(s);
    stairsOut.push({ id: s.id, from: s.from, to: s.to, steps, rise: round(rise), tread: s.tread, width: round(s.bayMaxX - s.bayMinX), reachesTop: round(steps[steps.length - 1].top) === s.topY, maxRiser: round(rise), baseY: s.baseY, topY: s.topY, shaft: box([sh.a0, s.baseY, sh.b0], [sh.a1, s.topY, sh.b1]) });
    openings.push({ id: s.id, level: s.from, connects: [s.from, s.to], axis: '+Y', center: [round(sh.centerX), s.topY, round((sh.b0 + sh.b1) / 2)], clearance: { w: round(sh.width), h: round(sh.depth) }, state: 'always', route: 'soldier', kind: 'stair' });
  }

  // ---- thin ground cosmetic floor ----
  add({ id: 'floor.slab', role: 'decor', collider: false, material: 'floor_slab', node: 'floor_l0', level: 0, aabb: box([-inX, -st.floorSlabThickness, -inZ], [inX, 0, inZ]) });

  // ---- waypoints + routes ----
  const roomC = (id) => { const r = rooms.find((x) => x.id === id); return r ? [round((r.aabb.min[0] + r.aabb.max[0]) / 2), r.floorY, round((r.aabb.min[2] + r.aabb.max[2]) / 2)] : [0, 0, 0]; };
  const fd = R.levels[0].exterior.find((o) => o.kind === 'door'), bp = R.levels[0].exterior.find((o) => o.kind === 'breach');
  const cp = R.levels[0].casePedestal, Rrad = R.fitting.fighterRadius_u;
  const sA = R.stairs[0], sB = R.stairs[1], shA = stairShaft(sA), shB = stairShaft(sB);
  const bayMid = (s) => (s.bayMinX + s.bayMaxX) / 2;
  const waypoints = {
    exterior_front: [fd.center, 0, HZ + 4],
    threshold_front_door: [fd.center, 0, HZ - ht],
    ground_entry_center: [fd.center, 0, (R.levels[0].partition.z + inZ) / 2],
    interior_door_l0: [R.levels[0].partition.door.centerX, 0, R.levels[0].partition.z],
    interior_door_l0_inner: [R.levels[0].partition.door.centerX, 0, R.levels[0].partition.z - ht - Rrad],
    ground_case_center: [R.levels[0].partition.door.centerX, 0, (cp.z + R.levels[0].partition.z) / 2 - 1],
    case_reach: [cp.x - cp.width / 2 - Rrad - 0.6, 0, cp.z],
    case_spawn: [cp.x, cp.height, cp.z],
    breach_exterior: [HX + 4, 0, bp.center],
    breach_threshold: [HX - ht, 0, bp.center],
    stair_a_base: [round(bayMid(sA)), 0, round(sA.startZ - sA.dir * sA.tread / 2)],   // bottom of the front flight
    stair_a_top: [round(shA.centerX), 16, round(shA.b0 - 1.4)],                        // step off onto the solid upper floor (past the shaft)
    upper_center: roomC('upper_front'),
    stair_b_base: [round(bayMid(sB)), 16, round(sB.startZ + sB.dir * sB.tread / 2)],   // bottom of the rear flight, on the upper floor
    stair_b_top: [round(shB.centerX), roofDeckTop, round(shB.b1 + 1.4)],               // step off onto the solid roof deck
    roof_center: [0, roofDeckTop, 0],
    upper_floor_smash_top: [(R.floorPanels[0]).centerX, 16, (R.floorPanels[0]).centerZ],
    roof_smash_top: [rwp.centerX, roofDeckTop, rwp.centerZ],
  };
  const routes = {
    soldier_recover: { desc: 'Front door to the case on foot (ground floor).', state: 'intact', path: ['exterior_front', 'threshold_front_door', 'ground_entry_center', 'interior_door_l0', 'interior_door_l0_inner', 'ground_case_center', 'case_reach'] },
    soldier_upstairs: { desc: 'Ground floor up the stair to the upper floor.', state: 'intact', path: ['ground_entry_center', 'interior_door_l0', 'interior_door_l0_inner', 'stair_a_base', 'stair_a_top', 'upper_center'] },
    soldier_roof: { desc: 'Upper floor up the second flight to the roof.', state: 'intact', path: ['upper_center', 'stair_b_base', 'stair_b_top', 'roof_center'] },
    largehero_breach: { desc: 'Large hero breaches the ground flank panel.', state: 'breached', path: ['breach_exterior', 'breach_threshold', 'ground_entry_center'] },
    largehero_roofsmash: { desc: 'Heavy hero smashes the roof panel into the upper floor.', state: 'breached', path: ['roof_center', 'roof_smash_top', 'upper_center'] },
    largehero_floorsmash: { desc: 'Heavy hero smashes the upper-floor panel into the ground floor.', state: 'breached', path: ['upper_center', 'upper_floor_smash_top', 'ground_entry_center'] },
  };

  // ---- shelter (rain/ambient/camera) covering the whole interior; roof deck volume ----
  const topCeil = levelY(NL - 1).ceil;
  const shelter = [{ id: 'interior_shelter', aabb: box([-inX, 0, -inZ], [inX, topCeil, inZ]), suppressesRain: true, interiorAmbient: true, cameraBoomShorten: true, note: 'Under-roof interior (both storeys). Rain suppressed, ambient transitions at openings, chase boom shortens (collision-safe) while inside.' }];
  const roofVolume = { id: 'roof_deck', aabb: box([-HX, roofDeckTop, -HZ], [HX, parapetTop, HZ]), standableTop: roofDeckTop, note: 'Accessible roof deck; standable at deckTop, parapet to parapetTop.' };

  // ---- debris (bounded, per breakable) ----
  const debris = [];
  for (const [grp, spec] of Object.entries(R.breakables)) {
    const owner = pieces.find((p) => p.breakGroup === grp && p.role !== 'decor') || pieces.find((p) => p.breakGroup === grp);
    debris.push({ forBreakGroup: grp, chunks: spec.debris.chunks, sizeRange: spec.debris.sizeRange, lifetimeS: spec.debris.lifetimeS, triBudget: spec.debris.triBudget, dtype: spec.dtype, spawnAABB: owner ? owner.aabb : null,
      note: `Bounded debris for ${grp}; ${spec.debris.chunks} chunks, <= ${spec.debris.triBudget} tris, ${spec.debris.lifetimeS}s. Never whole-building collapse.` });
  }

  // ---- per-storey fade node groups (the chase-cam occlusion contract) ----
  const fadeNodesByLevel = {};
  for (const p of pieces) { const key = String(p.level); (fadeNodesByLevel[key] ||= new Set()).add(p.node); }
  for (const k of Object.keys(fadeNodesByLevel)) fadeNodesByLevel[k] = [...fadeNodesByLevel[k]].sort();

  // ---- state sets ----
  const colliderIds = pieces.filter((p) => p.collider).map((p) => p.id);
  const breakGroups = {};
  for (const p of pieces) if (p.breakGroup) (breakGroups[p.breakGroup] ||= []).push(p.id);
  const states = {
    intact: { desc: 'Nothing broken.', visible: pieces.map((p) => p.id), colliders: colliderIds.slice(), openOpenings: openings.filter((o) => o.state === 'always').map((o) => o.id) },
    breached: { desc: 'All breakables broken.', hidden: pieces.filter((p) => p.state === 'intact-only').map((p) => p.id), colliders: colliderIds.filter((id) => !pieces.find((p) => p.id === id).breakGroup), openOpenings: openings.map((o) => o.id) },
  };

  const bbox = bboxUnion(pieces.map((p) => p.aabb));
  return {
    meta: { id: R.id, version: R.version, title: R.title, kind: R.kind, levels: NL },
    units: R.units, axes: R.axes, fitting: R.fitting,
    footprint: fp,
    storey: { ...st, floorToFloor: F2F, ceilingUnderside_y: round(levelY(0).ceil), deckTop_y: roofDeckTop, parapetTop_y: round(parapetTop), interiorHalf: { x: round(inX), z: round(inZ) }, levelFloorY: R.levels.map((_, i) => levelY(i).floorY) },
    bbox, pieces, openings, rooms, waypoints, routes,
    stairs: stairsOut, shelter, roofVolume, debris, states, breakGroups, fadeNodesByLevel,
  };
}
