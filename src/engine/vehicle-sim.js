// THE VEHICLE SIMULATOR — the Threat Lab's proving ground. Robert: "you choose what you
// want 3D printed... you get in the vehicle and you're teleported somewhere else, it looks
// like VR and you're there — a walled base near water, mountains, a valley: high ground,
// low ground, water, a cliff." One sculpted arena, every drivable fleet model, all driven
// through the generic FleetPilot. The terrain edits are a TRANSIENT — restored on close,
// like any venue (clearTransients owns the restore).
//
// levelArea cuts a flat pad with a smoothstep apron, so a tall pad beside a low one reads
// as a CLIFF (a small apron = a steep face). The stage's own spires stand in as MOUNTAINS.
// Verified in a live PowerWorld match: the base plateau, its cliff faces and the valley all
// render on the playable ground and vehicles sit flush on them.

// cx,  cz,   hw,  hd,   y,  apron
const AREAS = [
  [  0,    0, 150, 130,  48,  34],   // BASE PLATEAU — high ground, where you print + start
  [  0,  300, 150, 120,  -6,  20],   // VALLEY — low ground; the base's front is a cliff down to it
  [  0,  470, 120,  90, -34,  16],   // BASIN — the water bowl (the water SURFACE is a later slice)
  [300,    0, 130, 130,  48,  30],   // MAZE PAD — a flat plateau to the right for the mech/tank maze
];

export const SIM = Object.freeze({
  bay: { x: 0, z: -12 },   // the print bay / respawn point, on top of the high base
  baseY: 48,
  menuKey: 'KeyL',         // opens the sim menu (swap vehicle · exit) — Robert's "press L"
});

// Cut the arena into the terrain. Returns an undo record (one per area) for restoreSimArena;
// null if the world has no terrain sculptor (a safe no-op, never a throw).
export function sculptSimArena(world) {
  if (!world || typeof world.levelArea !== 'function') return null;
  const undo = [];
  for (const [x, z, hw, hd, y, ap] of AREAS) { const u = world.levelArea(x, z, hw, hd, y, ap); if (u) undo.push(u); }
  return undo.length ? undo : null;
}

// Put the land back exactly — the venue restore contract, for the sim.
export function restoreSimArena(world, undo) {
  if (!world || typeof world.restoreTerrainPatch !== 'function' || !undo) return;
  for (const u of undo) world.restoreTerrainPatch(u);
}

// The bay spawn point on the (already sculpted) base — reads the live terrain so it sits flush.
export function bayPos(world) {
  const y = (world && typeof world.heightAt === 'function') ? (world.heightAt(SIM.bay.x, SIM.bay.z) ?? SIM.baseY) : SIM.baseY;
  return { x: SIM.bay.x, y, z: SIM.bay.z };
}

// --- ARENA PROPS (walls + water). These build THREE meshes, so game.js passes THREE in — kept out
// of the pure functions above so the headless arena test needs no renderer. teardownSimProps
// disposes them (clearTransients calls it, the venue restore contract).

const WALL = Object.freeze({ h: 16, t: 5, gate: 34, color: 0xc7b083 });   // sun-bleached sand — reads as a desert outpost
const WATER = Object.freeze({ cx: 0, cz: 470, hw: 120, hd: 90, y: -16, color: 0x2a6f9e });

// A WALLED BASE — perimeter boxes on top of the plateau with a GATE gap at the front (toward the
// valley), registered as indestructible cover so vehicles and shots stop at them.
export function buildSimWalls(game, THREE) {
  if (!THREE || !game || !game.scene || !game.world) return null;
  const W = game.world, baseY = SIM.baseY, hx = 150, hz = 130, cx = 0, cz = 0, H = WALL.h, T = WALL.t, gate = WALL.gate;
  const mat = new THREE.MeshStandardMaterial({ color: WALL.color, roughness: 0.92, metalness: 0.04 });
  const segs = [
    [cx, cz - hz, hx, T],                                  // back wall
    [cx - hx, cz, T, hz],                                  // left wall
    [cx + hx, cz, T, hz],                                  // right wall
    [cx - (hx + gate) / 2, cz + hz, (hx - gate) / 2, T],   // front-left  (centre gate stays open)
    [cx + (hx + gate) / 2, cz + hz, (hx - gate) / 2, T],   // front-right
  ];
  const meshes = [], cover = [];
  for (const [x, z, shx, shz] of segs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(shx * 2, H, shz * 2), mat);
    m.position.set(x, baseY + H * 0.5, z); m.castShadow = true; m.receiveShadow = true;
    game.scene.add(m); meshes.push(m);
    const co = { x, z, hx: shx, hz: shz, top: baseY + H, h: baseY + H, r: Math.max(shx, shz), w: shx * 2, d: shz * 2, projectileShape: 'box', hp: 1e9, maxHp: 1e9, mesh: m, y0: m.position.y, destroyed: false };
    W.cover.push(co); W.coverAll.push(co); cover.push(co);
  }
  return { meshes, cover, mat };
}

// A still blue WATER surface over the basin — Robert: "a walled base near water that you can see."
// (Going under + the breath/drown timer is a later sub-slice; this is the visible surface.)
export function buildSimWater(game, THREE) {
  if (!THREE || !game || !game.scene) return null;
  const mat = new THREE.MeshStandardMaterial({ color: WATER.color, roughness: 0.25, metalness: 0.0, transparent: true, opacity: 0.72 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(WATER.hw * 2, WATER.hd * 2), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(WATER.cx, WATER.y, WATER.cz); m.renderOrder = 1;
  game.scene.add(m);
  return { mesh: m, cx: WATER.cx, cz: WATER.cz, hw: WATER.hw, hd: WATER.hd, y: WATER.y };
}

// SKY RINGS — a flight course: gold gates ascending and weaving over the valley for the planes to
// fly through (Robert's "those little circles to fly through for the planes"). Visual for now; a
// pass-through scoring trigger is a later sub-slice.
export const SKY_RING_R = 22;
export function buildSimSkyRings(game, THREE) {
  if (!THREE || !game || !game.scene) return null;
  const meshes = [], mats = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0x5a3a00, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.25 });   // per-ring so it can light on a fly-through
    const m = new THREE.Mesh(new THREE.TorusGeometry(SKY_RING_R, 3, 10, 30), mat);   // default torus hole faces +Z — a plane flying forward passes through
    m.position.set(i % 2 ? 26 : -26, 46 + i * 34, 300 + i * 130);
    m.userData = { passed: false, mat };
    game.scene.add(m); meshes.push(m); mats.push(mat);
  }
  return { meshes, mats };
}

// THE OCTAGON — the UFC cage (Robert: the round arena "should be for UFC stuff"). An 8-sided
// platform ringed by a chain-link CAGE (posts + panels, NOT ropes — the cage is what separates it
// from the boxing ring). FULL COMBAT here: powers stay ON (only the square boxing ring is
// punches-only). Teleport in with K; flight is refused inside the cage, the match rules are their
// own slice. Return `r` is the flight-off containment radius.
export function buildSimRing(game, THREE) {
  if (!THREE || !game || !game.scene) return null;
  const cx = -330, cz = 20, topY = SIM.baseY, R = 76, off = Math.PI / 8, meshes = [];   // off: a flat face toward the front, not a vertex
  const platMat = new THREE.MeshStandardMaterial({ color: 0x8f7d5a, roughness: 0.95, metalness: 0.05 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0x8f9488, roughness: 0.9 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2b2925, roughness: 0.7, metalness: 0.35 });
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x3a3d38, roughness: 0.6, metalness: 0.5, transparent: true, opacity: 0.28, side: THREE.DoubleSide });   // chain-link read
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 6, 70, 8), platMat); plat.rotation.y = off; plat.position.set(cx, topY - 35, cz); plat.receiveShadow = true; game.scene.add(plat); meshes.push(plat);
  // the canvas is STANDABLE — register the platform as cover so a fighter stands on its top, not falls through it
  const platCover = { x: cx, z: cz, hx: R - 6, hz: R - 6, top: topY, h: topY, r: R, w: (R - 6) * 2, d: (R - 6) * 2, projectileShape: 'box', hp: 1e9, maxHp: 1e9, mesh: plat, y0: plat.position.y, destroyed: false };
  game.world.cover.push(platCover); game.world.coverAll.push(platCover);
  const canvas = new THREE.Mesh(new THREE.CylinderGeometry(R - 4, R - 4, 2, 8), canvasMat); canvas.rotation.y = off; canvas.position.set(cx, topY + 1, cz); game.scene.add(canvas); meshes.push(canvas);
  const cageH = 30, rr = R - 5, chord = 2 * rr * Math.sin(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const ang = off + i * (Math.PI / 4);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, cageH + 4, 8), postMat);
    post.position.set(cx + Math.cos(ang) * rr, topY + cageH / 2, cz + Math.sin(ang) * rr); game.scene.add(post); meshes.push(post);
    const mang = off + (i + 0.5) * (Math.PI / 4);   // a cage panel spans the edge between two posts
    const panel = new THREE.Mesh(new THREE.BoxGeometry(chord, cageH, 0.6), cageMat);
    panel.position.set(cx + Math.cos(mang) * rr, topY + cageH / 2, cz + Math.sin(mang) * rr);
    panel.lookAt(cx, panel.position.y, cz);   // thin axis points radially in, width runs tangentially
    game.scene.add(panel); meshes.push(panel);
  }
  return { meshes, mats: [platMat, canvasMat, postMat, cageMat], cover: [platCover], cx, cz, r: R - 6, top: topY };   // bounds for the flight-off / teleport
}

// THE BOXING RING — a SQUARE ring for PUNCHES ONLY (Robert: "boxing only where you can only do
// punches... square instead of round"). Corner posts + three ropes on all four sides (ROPES, not a
// cage — the ropes are what separate it from the octagon). Close-quarters scale on purpose (~48u
// interior, the boxing lesson). Teleport in with P; inside, flight is refused AND `noPowers` is set
// so only fists land — the same pure-boxing flag the boxing MODE uses. Sits south of the octagon so
// the two read as separate venues.
const BOXRING = Object.freeze({ cx: -330, cz: 200, hw: 24, top: SIM.baseY });
export function buildSimBoxRing(game, THREE) {
  if (!THREE || !game || !game.scene) return null;
  const { cx, cz, hw, top } = BOXRING, meshes = [];
  const platMat = new THREE.MeshStandardMaterial({ color: 0x6b6257, roughness: 0.95, metalness: 0.03 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0x9a9488, roughness: 0.9 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xcc3030, emissive: 0x2a0606, roughness: 0.6 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x33302b, roughness: 0.8, metalness: 0.2 });
  const plat = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 12, 70, hw * 2 + 12), platMat); plat.position.set(cx, top - 35, cz); plat.receiveShadow = true; game.scene.add(plat); meshes.push(plat);
  // STANDABLE — register the square platform as cover (box shape, so the corners are solid)
  const cover = { x: cx, z: cz, hx: hw, hz: hw, top, h: top, r: hw * 1.42, w: hw * 2, d: hw * 2, projectileShape: 'box', hp: 1e9, maxHp: 1e9, mesh: plat, y0: plat.position.y, destroyed: false };
  game.world.cover.push(cover); game.world.coverAll.push(cover);
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 2, hw * 2), canvasMat); canvas.position.set(cx, top + 1, cz); game.scene.add(canvas); meshes.push(canvas);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // four corner posts
    const post = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 30, 8), postMat);
    post.position.set(cx + sx * hw, top + 15, cz + sz * hw); game.scene.add(post); meshes.push(post);
  }
  for (let r = 0; r < 3; r++) {   // three ropes on each of the four sides
    const y = top + 8 + r * 8;
    for (const az of [-hw, hw]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, hw * 2, 6), ropeMat); rope.rotation.z = Math.PI / 2; rope.position.set(cx, y, cz + az); game.scene.add(rope); meshes.push(rope); }   // front & back run along X
    for (const ax of [-hw, hw]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, hw * 2, 6), ropeMat); rope.rotation.x = Math.PI / 2; rope.position.set(cx + ax, y, cz); game.scene.add(rope); meshes.push(rope); }   // left & right run along Z
  }
  return { meshes, mats: [platMat, canvasMat, ropeMat, postMat], cover: [cover], cx, cz, hx: hw, hz: hw, top };
}

// THE MAZE — a walled labyrinth on the right-hand pad for mech + tank combat (Robert's "a little
// maze for mech combat, for tank combat"). A perimeter with an entrance facing the base plus
// internal corridors, all registered as indestructible cover so the walkers have to navigate it.
const MAZE = Object.freeze({ cx: 300, cz: 0, hw: 130, hd: 130, y: SIM.baseY, h: 12, t: 5, gate: 30 });
export function buildSimMaze(game, THREE) {
  if (!THREE || !game || !game.scene || !game.world) return null;
  const W = game.world, { cx, cz, hw, hd, y, h: H, t: T, gate } = MAZE;
  const mat = new THREE.MeshStandardMaterial({ color: 0xb39c6f, roughness: 0.9, metalness: 0.05 });
  const segs = [
    [cx, cz - hd, hw, T], [cx, cz + hd, hw, T], [cx + hw, cz, T, hd],           // back / front / right
    [cx - hw, cz - (hd + gate) / 2, T, (hd - gate) / 2],                          // left wall, split for an
    [cx - hw, cz + (hd + gate) / 2, T, (hd - gate) / 2],                          //   entrance facing the base
    [cx - 55, cz + 10, 6, 70], [cx + 50, cz - 20, 6, 65],                         // internal corridors
    [cx - 5, cz - 70, 55, 6], [cx + 15, cz + 55, 60, 6],
    [cx - 40, cz - 25, 45, 6], [cx + 35, cz + 15, 40, 6],
  ];
  const meshes = [], cover = [];
  for (const [x, z, shx, shz] of segs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(shx * 2, H, shz * 2), mat);
    m.position.set(x, y + H * 0.5, z); m.castShadow = true; m.receiveShadow = true; game.scene.add(m); meshes.push(m);
    const co = { x, z, hx: shx, hz: shz, top: y + H, h: y + H, r: Math.max(shx, shz), w: shx * 2, d: shz * 2, projectileShape: 'box', hp: 1e9, maxHp: 1e9, mesh: m, y0: m.position.y, destroyed: false };
    W.cover.push(co); W.coverAll.push(co); cover.push(co);
  }
  return { meshes, mats: [mat], cover };
}

// ANTI-AIR EMPLACEMENTS — procedural SAM turrets on the base corners (Robert: "this place should
// have the anti-air missiles there"). They swivel to TRACK the nearest airborne target as menacing
// set dressing — game.js owns the frame-loop swivel. They do NOT fire.
export function buildSimDefenses(game, THREE) {
  if (!THREE || !game || !game.scene) return null;
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x7d7050, roughness: 0.7, metalness: 0.3 });
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0x2e2e2a, roughness: 0.6, metalness: 0.4 });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xcc3020, emissive: 0x2a0805, roughness: 0.5 });
  const meshes = [], turrets = [], y = SIM.baseY;
  for (const [x, z] of [[-138, -118], [138, -118], [138, 118]]) {   // three base-top corners
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 4, 16), baseMat); pad.position.set(x, y + 2, z); game.scene.add(pad); meshes.push(pad);
    const turret = new THREE.Group(); turret.position.set(x, y + 7, z);
    turret.add(new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), baseMat));
    for (let i = 0; i < 4; i++) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 10, 8), tubeMat);
      tube.position.set((i % 2 ? 1 : -1) * 2.6, 3, (i < 2 ? 1 : -1) * 1.6); tube.rotation.x = -0.9; turret.add(tube);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2, 8), tipMat);
      tip.position.set(tube.position.x, tube.position.y + 4.2, tube.position.z + 3.3); tip.rotation.x = -0.9; turret.add(tip);
    }
    turret.rotation.y = Math.atan2(-x, -z); game.scene.add(turret); meshes.push(turret); turrets.push(turret);
  }
  return { meshes, mats: [baseMat, tubeMat, tipMat], turrets };
}

// The turrets are TRACKING set dressing — they swivel to face the nearest airborne target and do
// NOT fire (an earlier pass launched guided missiles; that behaviour was removed by request). Only
// two numbers are needed: how far a turret bothers to track, and how high a target must be to count.
export const AA = {
  range: 620,   // a turret only tracks a target within this ground distance
  minY: 22,     // a target must be at least this far above the base floor to count as airborne
};

// THE DESERT AROUND IT — Robert: put the proving ground "on the same map as our desert place" and it
// should read as somewhere FAR AWAY. A ring of low, wide dunes on the horizon (far and low, so they
// say "the world keeps going" without walling you in), plus a few nearer mounds so the facility reads
// as sitting IN the dunes. Pure set dressing — no cover, no collision; disposed on teardown.
export function buildSimDesert(game, THREE) {
  if (!THREE || !game || !game.scene) return null;
  const baseY = SIM.baseY, meshes = [];
  const sand = new THREE.MeshStandardMaterial({ color: 0xcaa96e, roughness: 1, metalness: 0 });
  const sandFar = new THREE.MeshStandardMaterial({ color: 0xb89864, roughness: 1, metalness: 0 });
  const N = 22;
  for (let i = 0; i < N; i++) {                              // the far dune ring
    const ang = (i / N) * Math.PI * 2 + (i % 2 ? 0.17 : 0), r = 940 + (i % 3) * 240;
    const h = 60 + (i % 4) * 46, w = 300 + (i % 3) * 170;
    const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), sandFar);
    dune.scale.set(w, h, w * 0.8); dune.position.set(Math.cos(ang) * r, baseY - h * 0.62, Math.sin(ang) * r);   // buried so only the crest shows
    game.scene.add(dune); meshes.push(dune);
  }
  for (const [x, z, w, h] of [[-560, -250, 150, 44], [520, 340, 180, 56], [150, 520, 130, 40], [-520, 380, 165, 50], [560, -300, 145, 42]]) {   // nearer mounds, clear of the structures
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), sand);
    m.scale.set(w, h, w * 0.85); m.position.set(x, baseY - h * 0.55, z); game.scene.add(m); meshes.push(m);
  }
  // scattered SANDSTONE ROCKS in the mid-ground so the desert floor has texture (irregular, sitting
  // on the ground; hand-placed clear of the base / rings / maze / water). Faceted, low-poly.
  const rock = new THREE.MeshStandardMaterial({ color: 0x9a835c, roughness: 1, metalness: 0, flatShading: true });
  for (const [x, z, s] of [[-200, -180, 9], [210, -150, 7], [-190, 120, 11], [250, 150, 8], [-450, -120, 10], [430, -60, 6], [-120, 300, 8], [180, 340, 12], [-470, 130, 7], [80, -260, 9]]) {
    const gy = (game.world && game.world.heightAt) ? (game.world.heightAt(x, z) ?? baseY) : baseY;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rock);
    r.scale.y = 0.6 + (x % 3) * 0.1; r.rotation.set(x * 0.3, z * 0.2, x * 0.1); r.position.set(x, gy + s * 0.28, z);
    r.castShadow = true; game.scene.add(r); meshes.push(r);
  }
  return { meshes, mats: [sand, sandFar, rock] };
}

// THE GATE — a proper entrance at the base's front opening (Robert: "a little wall with an entrance,
// like a gate... how would a base look in our game"). Two flanking towers, a header arch and a lit
// sign over the road in. Towers register as cover; the opening between them stays clear to drive in.
export function buildSimGate(game, THREE) {
  if (!THREE || !game || !game.scene || !game.world) return null;
  const W = game.world, baseY = SIM.baseY, gx = 0, gz = 130, gap = 34;   // front-wall gate at (0, 130)
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xc2a97a, roughness: 0.88, metalness: 0.06 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x5a5348, roughness: 0.8, metalness: 0.2 });
  const signMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0x4a3000, emissiveIntensity: 0.6, roughness: 0.5 });
  const meshes = [], cover = [], th = 28;
  for (const side of [-1, 1]) {
    const tx = gx + side * (gap + 8);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(16, th, 16), towerMat); tower.position.set(tx, baseY + th / 2, gz); tower.castShadow = true; tower.receiveShadow = true; game.scene.add(tower); meshes.push(tower);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(19, 3, 19), trimMat); cap.position.set(tx, baseY + th + 1.5, gz); game.scene.add(cap); meshes.push(cap);
    const co = { x: tx, z: gz, hx: 8, hz: 8, top: baseY + th, h: baseY + th, r: 11, w: 16, d: 16, projectileShape: 'box', hp: 1e9, maxHp: 1e9, mesh: tower, y0: tower.position.y, destroyed: false };
    W.cover.push(co); W.coverAll.push(co); cover.push(co);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(gap * 2 + 22, 5, 7), trimMat); beam.position.set(gx, baseY + 24, gz); game.scene.add(beam); meshes.push(beam);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 1), signMat); sign.position.set(gx, baseY + 24, gz + 4.2); game.scene.add(sign); meshes.push(sign);
  return { meshes, mats: [towerMat, trimMat, signMat], cover };
}

// Clear the stage's own spires/rocks standing inside the arena structures so nothing clips through
// the base, ring or maze — the difference between "looks built" and "looks broken". Hides the mesh
// AND drops the cover record (an invisible wall inside the ring is worse than the clip). Run BEFORE
// building the structures so only stage cover is touched; restored on teardown.
export function clearSimObstructions(game) {
  const W = game && game.world; if (!W || !W.coverAll) return null;
  const inZone = (x, z) =>
    (Math.abs(x) < 175 && Math.abs(z) < 160) ||            // base + margin
    (Math.hypot(x + 330, z - 20) < 105) ||                 // the octagon
    (Math.abs(x + 330) < 45 && Math.abs(z - 200) < 45) ||  // the boxing ring
    (Math.abs(x - 300) < 160 && Math.abs(z) < 160);        // maze pad
  const hidden = [];
  for (const c of [...W.coverAll]) {
    if (c.mesh && inZone(c.x, c.z)) {
      c.mesh.visible = false;
      const i = W.cover.indexOf(c); if (i >= 0) { W.cover.splice(i, 1); c._simDropped = true; }
      hidden.push(c);
    }
  }
  return hidden.length ? hidden : null;
}

// Put the cleared spires back (mesh + collision) — the venue restore contract.
export function restoreSimObstructions(game, hidden) {
  if (!hidden || !game) return; const W = game.world;
  for (const c of hidden) { if (c.mesh) c.mesh.visible = true; if (c._simDropped) { W.cover.push(c); c._simDropped = false; } }
}

// Dispose the sim's walls + water + sky rings + ring + maze + defenses, and unregister any cover.
export function teardownSimProps(game) {
  if (!game) return; const W = game.world;
  for (const e of [game.player, game._simFoe]) { if (e && e._boxRing) { e.noPowers = false; e._boxRing = false; } }   // the pure-boxing flag must not outlive the sim
  if (game._simCleared) { restoreSimObstructions(game, game._simCleared); game._simCleared = null; }   // restore the spires we hid
  if (game._simWalls) {
    for (const m of game._simWalls.meshes) { game.scene.remove(m); m.geometry && m.geometry.dispose(); }
    game._simWalls.mat && game._simWalls.mat.dispose();
    for (const c of game._simWalls.cover) { let i = W.cover.indexOf(c); if (i >= 0) W.cover.splice(i, 1); i = W.coverAll.indexOf(c); if (i >= 0) W.coverAll.splice(i, 1); }
    game._simWalls = null;
  }
  if (game._simWater) { game.scene.remove(game._simWater.mesh); const mm = game._simWater.mesh; mm.geometry && mm.geometry.dispose(); mm.material && mm.material.dispose(); game._simWater = null; }
  for (const key of ['_simDesert', '_simSkyRings', '_simRing', '_simBoxRing', '_simMaze', '_simDefenses', '_simGate']) {
    const p = game[key]; if (!p) continue;
    for (const m of p.meshes) { game.scene.remove(m); m.traverse ? m.traverse(o => o.geometry && o.geometry.dispose()) : (m.geometry && m.geometry.dispose()); }
    for (const mt of (p.mats || [])) mt && mt.dispose();
    if (p.cover) for (const c of p.cover) { let i = W.cover.indexOf(c); if (i >= 0) W.cover.splice(i, 1); i = W.coverAll.indexOf(c); if (i >= 0) W.coverAll.splice(i, 1); }
    game[key] = null;
  }
}
