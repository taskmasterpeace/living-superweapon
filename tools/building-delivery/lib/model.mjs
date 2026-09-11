// model.mjs — the SINGLE SOURCE OF TRUTH for the research-lab building package.
//
// buildModel(recipe) turns the authored recipe (authoring/buildings/lab.v1/recipe.json) into a
// fully-derived model: render pieces (boxes), collider AABBs with stable IDs, the room/opening
// graph, stair steps, roof/shelter volumes, and bounded debris specs. Every emitter (GLB writer,
// colliders.json, room-graph.json, the annotated views, the standalone validation fixture) consumes
// THIS — so the mesh, the colliders, the graph and the pictures cannot disagree.
//
// All coordinates are PowerWorld world units (u). Building-space origin (0,0,0) = ground-centre of
// the footprint, floor plane y=0, entrance faces +Z, breach flank on +X (see recipe.axes).

// ---- geometry helpers ------------------------------------------------------

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const EPS = 1e-6;

// Rectangle (in a 2D plane a,b) minus axis-aligned holes -> covering rectangles.
// Edge-sweep grid decomposition, then a greedy merge of adjacent cells along `a` within one b-row,
// so a punched wall becomes a handful of clean segments (flanks + lintel) rather than a fine grid.
function rectMinusHoles(outer, holes) {
  const xs = new Set([outer.a0, outer.a1]);
  const ys = new Set([outer.b0, outer.b1]);
  for (const h of holes) {
    xs.add(clamp(h.a0, outer.a0, outer.a1)); xs.add(clamp(h.a1, outer.a0, outer.a1));
    ys.add(clamp(h.b0, outer.b0, outer.b1)); ys.add(clamp(h.b1, outer.b0, outer.b1));
  }
  const X = [...xs].sort((p, q) => p - q);
  const Y = [...ys].sort((p, q) => p - q);
  const cells = [];
  for (let j = 0; j < Y.length - 1; j++) {
    const b0 = Y[j], b1 = Y[j + 1];
    if (b1 - b0 < EPS) continue;
    let run = null;
    for (let i = 0; i < X.length - 1; i++) {
      const a0 = X[i], a1 = X[i + 1];
      if (a1 - a0 < EPS) continue;
      const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
      let inHole = false;
      for (const h of holes) {
        if (ca > h.a0 + EPS && ca < h.a1 - EPS && cb > h.b0 + EPS && cb < h.b1 - EPS) { inHole = true; break; }
      }
      if (inHole) { if (run) { cells.push(run); run = null; } continue; }
      if (run && Math.abs(run.a1 - a0) < EPS) run.a1 = a1;         // extend the current run
      else { if (run) cells.push(run); run = { a0, a1, b0, b1 }; }
    }
    if (run) cells.push(run);
  }
  return cells;
}

const box = (min, max) => ({ min: min.map(round), max: max.map(round) });
const round = (v) => Math.round(v * 1e5) / 1e5;
const bboxUnion = (boxes) => {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], b.min[k]); mx[k] = Math.max(mx[k], b.max[k]); }
  return { min: mn.map(round), max: mx.map(round) };
};

// ---- main builder ----------------------------------------------------------

export function buildModel(recipe) {
  const R = recipe;
  const fp = R.footprint, st = R.storey, mats = R.materials;
  const T = fp.wallThickness, ht = T / 2;
  const HX = fp.width_x / 2, HZ = fp.depth_z / 2;      // outer half-extents
  const inX = HX - T, inZ = HZ - T;                    // interior clear half-extents
  const wallTop = st.roofDeckTop_y - st.roofSlabThickness;   // shell wall height / ceiling underside
  const deckTop = st.roofDeckTop_y;
  const ceil = wallTop;

  const pieces = [];
  let auto = 0;
  const add = (p) => {
    const id = p.id || `p${(auto++).toString().padStart(3, '0')}`;
    const m = mats[p.material] || {};
    pieces.push({
      // ⚠ node names are glTF node names; three.js GLTFLoader sanitizes '.'/':' etc. to '_', so keep
      // them dot-free at the source — the render mesh name then survives verbatim for any consumer.
      id, role: p.role, material: p.material, node: (p.node || 'node').replace(/[^A-Za-z0-9_-]/g, '_'),
      aabb: p.aabb,
      collider: p.collider !== false && p.role !== 'decor',
      standable: !!p.standable,
      breakable: !!(m.breakable && p.breakable !== false && p.breakGroup),
      breakGroup: p.breakGroup || null,
      hp: p.hp != null ? p.hp : (m.hp != null ? m.hp : null),
      dtype: p.dtype || m.dtype || 'structural',
      color: m.color, metallic: m.metallic ?? 0, roughness: m.roughness ?? 0.9,
      emissive: m.emissive || null,
      state: p.state || 'always',   // 'always' | 'intact-only' (removed when its breakGroup breaks)
      note: p.note || undefined,
    });
    return pieces[pieces.length - 1];
  };

  // ---- WALLS -----------------------------------------------------------------
  // A wall is a punched rectangle in its own (horizontal-axis, y) plane, extruded by thickness.
  // openings: [{c, w, sillY, headY}] in the horizontal axis. `orient` = 'x' (runs along X, thick in Z)
  // or 'z' (runs along Z, thick in X). `fixed` = the constant coordinate of the wall centreline.
  function punchedWall({ orient, fixed, aFrom, aTo, height, openings, material, node, role = 'blocker', breakGroup, hp, dtype }) {
    const cells = rectMinusHoles({ a0: aFrom, a1: aTo, b0: 0, b1: height },
      (openings || []).map((o) => ({ a0: o.c - o.w / 2, a1: o.c + o.w / 2, b0: o.sillY || 0, b1: o.headY })));
    const out = [];
    for (const c of cells) {
      let min, max;
      if (orient === 'x') { min = [c.a0, c.b0, fixed - ht]; max = [c.a1, c.b1, fixed + ht]; }
      else { min = [fixed - ht, c.b0, c.a0]; max = [fixed + ht, c.b1, c.a1]; }
      out.push(add({ role, material, node, breakGroup, hp, dtype, aabb: box(min, max) }));
    }
    return out;
  }

  const O = R.openings;

  // Shell +Z (front) — carries the front door.
  punchedWall({ orient: 'x', fixed: HZ - ht, aFrom: -HX, aTo: HX, height: wallTop,
    openings: [{ c: O.front_door.centerX, w: O.front_door.width, sillY: O.front_door.sillY, headY: O.front_door.height }],
    material: 'structural', node: 'shell.structural' });
  // Shell -Z (rear) — solid.
  punchedWall({ orient: 'x', fixed: -(HZ - ht), aFrom: -HX, aTo: HX, height: wallTop,
    openings: [], material: 'structural', node: 'shell.structural' });
  // Shell -X (left) — solid.
  punchedWall({ orient: 'z', fixed: -(HX - ht), aFrom: -HZ, aTo: HZ, height: wallTop,
    openings: [], material: 'structural', node: 'shell.structural' });
  // Shell +X (right / flank) — carries the breach panel HOLE (filled by the weak panel piece below).
  punchedWall({ orient: 'z', fixed: HX - ht, aFrom: -HZ, aTo: HZ, height: wallTop,
    openings: [{ c: O.breach_panel.centerZ, w: O.breach_panel.width, sillY: O.breach_panel.sillY, headY: O.breach_panel.height }],
    material: 'structural', node: 'shell.structural' });
  // Interior partition (across X at z=partition.z) — carries the interior doorway.
  punchedWall({ orient: 'x', fixed: R.partition.z, aFrom: -inX, aTo: inX, height: wallTop,
    openings: [{ c: O.interior_door.centerX, w: O.interior_door.width, sillY: O.interior_door.sillY, headY: O.interior_door.height }],
    material: 'structural', node: 'shell.structural' });

  // ---- THE BREACH WEAK PANEL (fills the +X hole; removed when breached) ------
  {
    const bp = O.breach_panel;
    const z0 = bp.centerZ - bp.width / 2, z1 = bp.centerZ + bp.width / 2;
    add({ id: 'breach_panel', role: 'blocker', material: 'weak_panel', node: 'breakable.breach_panel',
      breakGroup: 'breach_panel', state: 'intact-only',
      aabb: box([HX - T, bp.sillY, z0], [HX, bp.height, z1]),
      note: 'Flank weak wall; intact it blocks, breached it becomes a 12x13u opening for a large hero.' });
    // hazard stripes on the exterior face (danger-red), same break group
    for (let i = 0; i < 3; i++) {
      const zc = bp.centerZ + (i - 1) * (bp.width / 3.2);
      add({ id: `breach_panel.stripe${i}`, role: 'decor', material: 'hazard_stripe', node: 'breakable.breach_panel.stripe',
        breakGroup: 'breach_panel', state: 'intact-only', collider: false,
        aabb: box([HX + 0.02, 1.5, zc - 0.9], [HX + 0.22, bp.height - 1.5, zc + 0.9]) });
    }
  }

  // ---- ROOF SLAB (punched by the hatch, and by the weak-panel area) ----------
  const hatch = O.roof_hatch;
  const rwp = R.roofWeakPanel;
  const roofHoles = [
    { a0: hatch.centerX - hatch.width / 2, a1: hatch.centerX + hatch.width / 2, b0: hatch.centerZ - hatch.depth / 2, b1: hatch.centerZ + hatch.depth / 2 },
    { a0: rwp.centerX - rwp.width / 2, a1: rwp.centerX + rwp.width / 2, b0: rwp.centerZ - rwp.depth / 2, b1: rwp.centerZ + rwp.depth / 2 },
  ];
  for (const c of rectMinusHoles({ a0: -HX, a1: HX, b0: -HZ, b1: HZ }, roofHoles)) {
    add({ role: 'roof', standable: true, material: 'roof_slab', node: 'roof.structural',
      aabb: box([c.a0, wallTop, c.b0], [c.a1, deckTop, c.b1]) });
  }
  // The breakable roof panel fills the weak-panel hole; removed when smashed.
  add({ id: 'roof_weak_panel', role: 'roof', standable: true, material: 'roof_panel_weak', node: 'breakable.roof_weak_panel',
    breakGroup: 'roof_weak_panel', state: 'intact-only',
    aabb: box([rwp.centerX - rwp.width / 2, wallTop, rwp.centerZ - rwp.depth / 2], [rwp.centerX + rwp.width / 2, deckTop, rwp.centerZ + rwp.depth / 2]),
    note: 'A selected floor-from-above panel; smashed by a heavy hero to drop into the case room.' });
  // hazard corner mark on the weak roof panel
  add({ id: 'roof_weak_panel.mark', role: 'decor', material: 'hazard_stripe', node: 'breakable.roof_weak_panel.mark',
    breakGroup: 'roof_weak_panel', state: 'intact-only', collider: false,
    aabb: box([rwp.centerX - rwp.width / 2, deckTop, rwp.centerZ - rwp.depth / 2], [rwp.centerX - rwp.width / 2 + 1.4, deckTop + 0.15, rwp.centerZ + rwp.depth / 2]) });

  // ---- PARAPET (safety edge around the deck) ---------------------------------
  const pT = st.parapetThickness, pH = st.parapetHeight, pTop = deckTop + pH;
  const par = (min, max, id) => add({ id, role: 'parapet', material: 'parapet', node: 'roof.parapet', aabb: box(min, max), standable: false });
  par([-HX, deckTop, HZ - pT], [HX, pTop, HZ], 'parapet.front');
  par([-HX, deckTop, -HZ], [HX, pTop, -HZ + pT], 'parapet.rear');
  par([-HX, deckTop, -HZ + pT], [-HX + pT, pTop, HZ - pT], 'parapet.left');
  par([HX - pT, deckTop, -HZ + pT], [HX, pTop, HZ - pT], 'parapet.right');

  // ---- STAIRS (straight flight in the case-room +X bay, floor -> deck) -------
  const S = R.stair;
  const rise = deckTop / S.steps;
  const runLen = Math.abs(inZ - (-inZ));          // available depth (unused; tread is derived to fit the bay)
  // fit the run inside the case room: from startZ down to the rear inner wall
  const rearInnerZ = -inZ;
  const tread = (S.startZ - rearInnerZ) / S.steps;
  const steps = [];
  for (let i = 1; i <= S.steps; i++) {
    const zTop = S.startZ - (i - 1) * tread;      // near partition = bottom step
    const zBot = S.startZ - i * tread;
    const top = i * rise;
    const p = add({ id: `stair.step${i}`, role: 'step', standable: true, material: 'stair', node: 'stair',
      aabb: box([S.bayMinX, 0, zBot], [S.bayMaxX, top, zTop]) });
    steps.push({ id: p.id, index: i, top: round(top), aabb: p.aabb });
  }

  // ---- CASE PEDESTAL + cyan marker -------------------------------------------
  const cp = R.casePedestal;
  add({ id: 'case.pedestal', role: 'prop', standable: true, material: 'pedestal', node: 'case.pedestal',
    aabb: box([cp.x - cp.width / 2, 0, cp.z - cp.depth / 2], [cp.x + cp.width / 2, cp.height, cp.z + cp.depth / 2]) });
  add({ id: 'case.glow', role: 'decor', collider: false, material: 'case_glow', node: 'case.glow',
    aabb: box([cp.x - 1.2, cp.height, cp.z - 1.2], [cp.x + 1.2, cp.height + 0.6, cp.z + 1.2]) });

  // ---- DOOR FRAME (gold accent, decor) + FRONT DOOR LEAF (breakable) ---------
  const fd = O.front_door;
  const fdx0 = fd.centerX - fd.width / 2, fdx1 = fd.centerX + fd.width / 2;
  const frameZ = HZ - ht;
  add({ id: 'trim.doorframe.left', role: 'decor', collider: false, material: 'door_frame', node: 'trim.doorframe',
    aabb: box([fdx0 - 0.6, 0, frameZ - ht - 0.1], [fdx0, fd.height + 0.6, frameZ + ht + 0.1]) });
  add({ id: 'trim.doorframe.right', role: 'decor', collider: false, material: 'door_frame', node: 'trim.doorframe',
    aabb: box([fdx1, 0, frameZ - ht - 0.1], [fdx1 + 0.6, fd.height + 0.6, frameZ + ht + 0.1]) });
  add({ id: 'trim.doorframe.head', role: 'decor', collider: false, material: 'door_frame', node: 'trim.doorframe',
    aabb: box([fdx0 - 0.6, fd.height, frameZ - ht - 0.1], [fdx1 + 0.6, fd.height + 0.6, frameZ + ht + 0.1]) });
  // The leaf stands OPEN against the inner wall — it NEVER fills the opening (no closed box across the door).
  add({ id: 'front_door_leaf', role: 'decor', collider: false, material: 'door_leaf', node: 'breakable.front_door_leaf',
    breakGroup: 'front_door_leaf', state: 'intact-only',
    aabb: box([fdx0 - fd.width + 0.4, 0, frameZ - ht - 0.2], [fdx0 - 0.2, fd.height, frameZ - ht + 0.2]),
    note: 'The swung-open leaf, hinged clear of the opening. Breakable; its removal never changes passability.' });

  // ---- THIN FLOOR SLAB (cosmetic; terrain at y=0 is the real floor) ----------
  add({ id: 'floor.slab', role: 'decor', collider: false, standable: false, material: 'floor_slab', node: 'floor',
    aabb: box([-inX, -st.floorSlabThickness, -inZ], [inX, 0, inZ]) });

  // ---- ROOMS + OPENING GRAPH -------------------------------------------------
  const rooms = [
    { id: 'entry_lab', name: 'Entry Lab (front)', aabb: box([-inX, 0, R.partition.z + ht], [inX, ceil, inZ]), floorY: 0, ceilingY: ceil },
    { id: 'case_room', name: 'Case Room (rear)', aabb: box([-inX, 0, -inZ], [inX, ceil, R.partition.z - ht]), floorY: 0, ceilingY: ceil },
  ];

  const openings = [
    { id: 'front_door', connects: ['exterior', 'entry_lab'], axis: '+Z', center: [fd.centerX, fd.height / 2, HZ - ht], clearance: { w: fd.width, h: fd.height }, sillY: fd.sillY, headY: fd.height, state: 'always', route: 'soldier' },
    { id: 'interior_door', connects: ['entry_lab', 'case_room'], axis: '+Z', center: [O.interior_door.centerX, O.interior_door.height / 2, R.partition.z], clearance: { w: O.interior_door.width, h: O.interior_door.height }, sillY: 0, headY: O.interior_door.height, state: 'always', route: 'soldier' },
    { id: 'breach_panel', connects: ['exterior', 'entry_lab'], axis: '+X', center: [HX - ht, O.breach_panel.height / 2, O.breach_panel.centerZ], clearance: { w: O.breach_panel.width, h: O.breach_panel.height }, sillY: 0, headY: O.breach_panel.height, state: 'breached-only', route: 'large-hero', breakGroup: 'breach_panel' },
    { id: 'roof_hatch', connects: ['roof', 'case_room'], axis: '+Y', center: [hatch.centerX, deckTop, hatch.centerZ], clearance: { w: hatch.width, h: hatch.depth }, state: 'always', route: 'soldier' },
    { id: 'roof_smash', connects: ['roof', 'case_room'], axis: '+Y', center: [rwp.centerX, deckTop, rwp.centerZ], clearance: { w: rwp.width, h: rwp.depth }, state: 'breached-only', route: 'large-hero', breakGroup: 'roof_weak_panel' },
  ];

  // ---- WAYPOINTS + ROUTES (navigation; centres of openings match runtime `doorways`) ----
  const waypoints = {
    exterior_front: [fd.centerX, 0, HZ + 4],
    threshold_front_door: [fd.centerX, 0, HZ - ht],
    entry_center: [fd.centerX, 0, (R.partition.z + inZ) / 2],
    interior_doorway: [O.interior_door.centerX, 0, R.partition.z],
    interior_door_inner: [O.interior_door.centerX, 0, R.partition.z - ht - R.fitting.fighterRadius_u],   // just past the partition, still aligned with the door — go straight through before turning
    case_room_center: [O.interior_door.centerX, 0, (cp.z + R.partition.z) / 2 - 1],   // down the -X aisle, clear of the plinth
    case_reach: [cp.x - cp.width / 2 - R.fitting.fighterRadius_u - 0.6, 0, cp.z],       // stand beside the plinth to take the case (never walk through it)
    case_spawn: [cp.x, cp.height, cp.z],
    breach_exterior: [HX + 4, 0, O.breach_panel.centerZ],
    breach_threshold: [HX - ht, 0, O.breach_panel.centerZ],
    stair_base: [(S.bayMinX + S.bayMaxX) / 2, 0, S.startZ - tread / 2],
    stair_top: [(S.bayMinX + S.bayMaxX) / 2, deckTop, S.startZ - S.steps * tread + tread / 2],
    roof_hatch: [hatch.centerX, deckTop, hatch.centerZ],
    roof_center: [0, deckTop, 0],
  };
  const routes = {
    soldier_recover: { desc: 'Front door to the case on foot (soldier, standard hero).', state: 'intact', path: ['exterior_front', 'threshold_front_door', 'entry_center', 'interior_doorway', 'interior_door_inner', 'case_room_center', 'case_reach'] },
    soldier_roof: { desc: 'Interior to the roof via the stair and hatch.', state: 'intact', path: ['entry_center', 'interior_doorway', 'case_room_center', 'stair_base', 'stair_top', 'roof_hatch', 'roof_center'] },
    largehero_breach: { desc: 'Large hero breaches the flank panel and enters.', state: 'breached', path: ['breach_exterior', 'breach_threshold', 'entry_center'] },
    largehero_roofsmash: { desc: 'Heavy hero smashes the roof panel and drops into the case room.', state: 'breached', path: ['roof_center', 'roof_smash-top', 'case_room_center'] },
  };
  waypoints['roof_smash-top'] = [rwp.centerX, deckTop, rwp.centerZ];

  // ---- SHELTER / ROOF VOLUMES (rain suppression, interior ambient, camera boom) ----
  const shelter = [
    { id: 'interior_shelter', aabb: box([-inX, 0, -inZ], [inX, ceil, inZ]), suppressesRain: true, interiorAmbient: true, cameraBoomShorten: true,
      note: 'Under-roof interior volume. Rain suppressed, ambient transitions at openings, camera boom shortens (collision-safe) while the player is inside.' },
  ];
  const roofVolume = { id: 'roof_deck', aabb: box([-HX, deckTop, -HZ], [HX, pTop, HZ]), standableTop: deckTop, note: 'Accessible roof deck; standable surface at y=deckTop, parapet to pTop.' };

  // ---- DEBRIS (bounded; per breakable) ---------------------------------------
  const debris = [];
  for (const [grp, spec] of Object.entries(R.breakables)) {
    const owner = pieces.find((p) => p.breakGroup === grp && p.role !== 'decor') || pieces.find((p) => p.breakGroup === grp);
    debris.push({
      forBreakGroup: grp, chunks: spec.debris.chunks, sizeRange: spec.debris.sizeRange,
      lifetimeS: spec.debris.lifetimeS, triBudget: spec.debris.triBudget, dtype: spec.dtype,
      spawnAABB: owner ? owner.aabb : null,
      note: `Bounded debris for ${grp}; ${spec.debris.chunks} chunks, <= ${spec.debris.triBudget} tris total, ${spec.debris.lifetimeS}s lifetime. Never whole-building collapse.`,
    });
  }

  // ---- STATE SETS (for the fixture and integration) --------------------------
  const colliderIds = pieces.filter((p) => p.collider).map((p) => p.id);
  const breakGroupIds = (grp) => pieces.filter((p) => p.breakGroup === grp).map((p) => p.id);
  const states = {
    intact: {
      desc: 'Nothing broken.',
      visible: pieces.map((p) => p.id),
      colliders: colliderIds.slice(),
      openOpenings: openings.filter((o) => o.state === 'always').map((o) => o.id),
    },
    breached: {
      desc: 'All three breakables broken (breach panel, front door leaf, roof weak panel).',
      hidden: pieces.filter((p) => p.state === 'intact-only').map((p) => p.id),
      colliders: colliderIds.filter((id) => !pieces.find((p) => p.id === id).breakGroup),
      openOpenings: openings.filter((o) => o.state === 'always' || o.state === 'breached-only').map((o) => o.id),
    },
  };

  const allBoxes = pieces.map((p) => p.aabb);
  const bbox = bboxUnion(allBoxes);

  return {
    meta: { id: R.id, version: R.version, title: R.title, kind: R.kind },
    units: R.units, axes: R.axes, fitting: R.fitting,
    footprint: fp, storey: { ...st, ceilingUnderside_y: round(ceil), deckTop_y: deckTop, parapetTop_y: round(pTop), interiorHalf: { x: round(inX), z: round(inZ) } },
    bbox,
    pieces, openings, rooms, waypoints, routes,
    stairs: { steps, rise: round(rise), tread: round(tread), maxRiser: round(rise), width: round(S.bayMaxX - S.bayMinX), reachesDeck: round(steps[steps.length - 1].top) === deckTop },
    shelter, roofVolume, debris, states,
    breakGroups: Object.keys(R.breakables).reduce((o, g) => (o[g] = breakGroupIds(g), o), {}),
  };
}
