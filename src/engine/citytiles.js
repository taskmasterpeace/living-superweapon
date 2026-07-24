// THRESHOLD — the TILE LIBRARY. One builder per city-type, 2–3 variants each, all sized to the
// 96u sectional cell the White City proved out (buildings inset so every cell keeps its street
// ring). world.rebuildCity() calls buildTiles() for generated cities; the flagship keeps its
// bespoke hand-tuned builder. Big structures register as COVER (destructible, crack overlays,
// fog boxes, collision); flavor props are decor the fights smash through visually.
// House rules apply: NO purple anywhere, warm-neutral + gold, per-district accent temperature.
import * as THREE from 'three';
import { CELL, regionOf, TILE_MAX_H } from '../data/cityplan.js';

// ---- REGION SKINS ---------------------------------------------------------------------------
// Every city carries a `cultureCode` (14 architectural regions) and until now NOTHING read it, so
// Kabul was built out of the same greys as Oslo. The whole palette is now pulled toward the
// region's table entry before a single tile is raised: walls, roofs, greenery, sand, plaza.
// One lever, applied once per city build — no per-tile branching, no `if (country === …)`.
const _c = new THREE.Color();
const tint = (base, toward, k) => '#' + _c.set(base).lerp(new THREE.Color(toward), k).getHexString();

// ⚠ ONE WINDOW ROW = ONE FLOOR ≈ 17 UNITS (a real ~3.2m storey at hero scale). The divisor is the
// height of the WHOLE TEXTURE TILE, not of one window — and every facade texture draws a GRID of
// windows (commercial 4×4, residential 3×3, military 2×3). Dividing by 17 therefore squeezed four
// floors into seventeen units: every storey in the game was ~0.8m tall, which is why a one-storey
// farmhouse rendered as a four-storey apartment block and towers read as toys. Each window
// material now declares the world height of its tile (`userData.bay`) and that is what we divide by.
function scaleBoxUV(geo, w, h, d, bay = 17) {
  const uv = geo.attributes.uv, B = bay, R = 16;
  const f = [[d / B, h / B], [d / B, h / B], [w / R, d / R], [w / R, d / R], [w / B, h / B], [w / B, h / B]];
  for (let fi = 0; fi < 6; fi++) for (let v = 0; v < 4; v++) { const i = fi * 4 + v; uv.setXY(i, uv.getX(i) * f[fi][0], uv.getY(i) * f[fi][1]); }
  uv.needsUpdate = true;
}

function mats(world, region) {
  const R = region || regionOf(0);
  // ⚠ The cache is keyed by REGION. Teardown runs BEFORE the next city is built, so the old
  // region's materials are disposed with the meshes that used them — dispose here too if the
  // region changes mid-session (atlas hopping between continents) or they orphan silently.
  if (world._tileMats && world._tileMatsRegion === R.key) return world._tileMats;
  if (world._tileMats) for (const m of Object.values(world._tileMats)) { if (Array.isArray(m)) m.forEach(x => x.dispose()); else m.dispose(); }
  world._tileMatsRegion = R.key;
  const S = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.85, metalness: o.m ?? 0.05, ...(o.fs ? { flatShading: true } : {}), ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 0.4 } : {}) });
  const B = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o.o ?? 0.85, depthWrite: false });
  world._tileMats = {
    stone: S(tint('#cfc8b6', R.wall, 0.8)), white: S(tint('#e8e2d4', R.wall, 0.55), { r: 0.7 }), marble: S(tint('#efe9dc', R.wall, 0.3), { r: 0.55 }),
    terraRoof: S(tint('#a85c3e', R.roof, 0.85), { r: 0.92 }), paleRoof: S(tint('#b9b2a0', R.roof, 0.4)), steelRoof: S('#5f666c', { r: 0.75, m: 0.35 }), oliveRoof: S('#5c6044'),
    steel: S('#8f979c', { r: 0.6, m: 0.5 }), rust: S('#8a5a3a', { r: 0.95 }), dark: S('#22252c', { r: 0.7, m: 0.3 }),
    olive: S('#6b6f52'), fence: S('#55583f', { r: 0.8, m: 0.3 }),
    gold: S('#c9a227', { r: 0.55, m: 0.4 }), domeGold: S('#d8b24a', { r: 0.4, m: 0.6, e: '#7a5a10', ei: 0.25 }),
    wood: S('#7a5a3a', { r: 0.95 }), deck: S('#c9b89a', { r: 0.9 }),
    sandM: B(tint('#d8c090', R.ground, 0.5), { o: 0.9 }), poolM: B('#5ad0e8', { o: 0.9 }), plazaM: B(tint('#e0d8c4', R.ground, 0.5), { o: 0.55 }),
    lawnM: B(tint('#7aa456', R.green, 0.75), { o: 0.9 }), pondM: B('#5aa8cc', { o: 0.9 }),   // unlit decals — write the value you want to SEE
    palmT: S('#8a6a42', { r: 0.95, fs: true }), palmF: S(tint('#3a7a3a', R.green, 0.6), { r: 0.9, fs: true }),
    canvas: S('#e8e2d4', { r: 0.95 }), red: S('#a8362e', { r: 0.8 }),
    containers: ['#8a2a24', '#2a4a6a', '#3a6a4a', '#c9762a', '#5a5a64'].map(c => S(c, { r: 0.6, m: 0.3 })),
    // --- THE METRO ---
    platform: S('#bdb6a6', { r: 0.92 }), stationTile: S('#e6dfd0', { r: 0.55 }),
    trainSide: S('#c2c8d0', { r: 0.45, m: 0.55 }), trainTrim: S('#2a5a8a', { r: 0.6, m: 0.3 }),
    metroSign: S('#d8d2c4', { r: 0.7, e: '#f5b21a', ei: 0.55 }),
    // --- THE COUNTRY ---
    // ⚠ crops are UNLIT decals (B, not S). Written as lit standard materials they rendered
    // near-black and every field read as a hole cut in the ground. Write the value you want to SEE.
    cropA: B(tint('#9aa956', R.green, 0.35), { o: 1 }), cropB: B(tint('#c2b45e', R.green, 0.2), { o: 1 }),
    cropC: B(tint('#7f9a4c', R.green, 0.45), { o: 1 }), fallow: B(tint('#a4855c', R.ground, 0.45), { o: 1 }),
    furrow: B('#6d5a3c', { o: 0.35 }), dirtYard: B(tint('#b09872', R.ground, 0.5), { o: 0.95 }),
    hedge: S(tint('#4e7038', R.green, 0.5), { r: 1, fs: true }), hay: S('#cbb267', { r: 1 }),
    fieldA: S('#7d7c44', { r: 1 }), fieldB: S('#6b5a38', { r: 1 }),
    barn: S('#8a3a2e', { r: 0.95 }), barnRoof: S('#4c4a46', { r: 0.9 }),
    silo: S('#c8c2b2', { r: 0.7, m: 0.2 }), stoneWall: S(tint('#a8a294', R.wall, 0.4), { r: 0.95 }),
    tractorBody: S('#2f6b34', { r: 0.6, m: 0.3 }), tyre: S('#26262a', { r: 0.95 }),
    // --- LANDMARKS ---
    bronze: S('#8a6a3a', { r: 0.45, m: 0.7 }), slate: S(tint('#4a4e56', R.roof, 0.35), { r: 0.85 }),
    beacon: S('#ff5a3a', { r: 0.4, e: '#ff3b20', ei: 1.6 }),
    // --- THE WILD (ground decals are UNLIT, same law as the lawns and the crops) ---
    // ⚠ a forest FLOOR is leaf litter in shade, not a lawn. Tinted too far toward the region's
    // greenery it came out as bright meadow with trees standing on it.
    forestFloor: B(tint('#3d4a2c', R.green, 0.22), { o: 1 }), jungleFloor: B(tint('#263a24', R.green, 0.18), { o: 1 }),
    trail: B(tint('#8a7148', R.ground, 0.4), { o: 0.95 }), scree: B(tint('#8f887c', R.ground, 0.45), { o: 1 }),
    rock: S(tint('#7d7770', R.wall, 0.25), { r: 1, fs: true }), fern: S(tint('#3f7038', R.green, 0.5), { r: 1, fs: true }),
    // --- THE FIELD + THE YARDS (multi-cell landmarks) ---
    tarmac: S('#63615c', { r: 0.98 }), runwayLine: B('#f0ead8', { o: 0.9 }),
    ballast: S('#7d766a', { r: 1 }), rail: S('#6a6a70', { r: 0.5, m: 0.6 }),
    fuselage: S('#e6e8ea', { r: 0.4, m: 0.35 }), livery: S('#2a5a8a', { r: 0.5, m: 0.3 }),
    doorL: S('#4d3a26', { r: 0.7 }), doorMetal: S('#59616b', { r: 0.5, m: 0.55 }),
    doorGlass: S('#1e3038', { r: 0.3, m: 0.4 }), brass: S('#c9a24d', { r: 0.32, m: 0.85 }),
  };
  return world._tileMats;
}

// ---------- shared builders ----------
// ⚠ THE SCALE CONTRACT. A tile builder is written in BASE units — the 96-unit cell the White City
// proved out — and never thinks about scale. `ctx.S` (= plan.cell / 96) is applied HERE, at the
// five helpers every tile goes through, by scaling each mesh and its OFFSET FROM THE CELL CENTRE.
// Nothing reparents, so cover boxes stay in world space and the ragdoll, resetTerrain, occlusion
// and physics all keep working untouched. Set plan.cell and the whole city changes size.
// THE METRIC — how tall the people are, as a multiplier (plan.metric.humanH / 9.6). Set once per
// build by buildTiles; door sizes and window-bay storey heights ride it. NEVER the cell dial.
let CUR_M = 1;
const sx = (ctx, x) => ctx.cx + (x - ctx.cx) * ctx.S;      // world X from a base-unit X
const sz = (ctx, z) => ctx.cz + (z - ctx.cz) * ctx.S;      // world Z from a base-unit Z
// THE GROUND A TILE STANDS ON. Flat maps return 0 and nothing changes; on a map with relief this
// is the cell's levelled pad height, so a whole block sits together on its terrace instead of each
// piece floating or burying itself independently.
function mesh(ctx, geo, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(sx(ctx, x), y * ctx.S + ctx.gy, sz(ctx, z));
  if (ctx.S !== 1) m.scale.setScalar(ctx.S);
  if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = !!o.cast; m.receiveShadow = o.recv !== false;
  m.userData.gy = ctx.gy;                          // reg() needs it to make `top` absolute
  ctx.g.add(m); return m;
}
// a structural, destructible building with a windowed facade + roof slab + crack overlay
function tower(ctx, x, z, w, h, d, winMat, roofMat, o = {}) {
  const world = ctx.world, S = ctx.S;
  h = Math.min(h, ctx.maxH || Infinity);           // THE LAYER CONTRACT — never above the declared max
  const geo = new THREE.BoxGeometry(w, h, d); scaleBoxUV(geo, w, h, d, ((winMat && winMat.userData.bay) || 17) * CUR_M);
  const m = new THREE.Mesh(geo, winMat);
  const wx = sx(ctx, x), wz = sz(ctx, z), W = w * S, H = h * S, D = d * S, gy = ctx.gy;
  m.position.set(wx, gy + H / 2, wz); m.castShadow = H >= 44; m.receiveShadow = true;
  if (S !== 1) m.scale.setScalar(S);
  ctx.g.add(m);
  if (roofMat) { const roof = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roofMat); roof.rotation.x = -Math.PI / 2; roof.position.y = h / 2 + 0.05; roof.receiveShadow = true; m.add(roof); }
  const crack = new THREE.Mesh(new THREE.BoxGeometry(w * 1.015, h * 1.006, d * 1.015), new THREE.MeshBasicMaterial({ map: world._crackTex, transparent: true, opacity: 0, depthWrite: false }));
  crack.position.copy(m.position); crack.scale.copy(m.scale); crack.visible = false; ctx.g.add(crack);
  const hp = Math.round(70 + W * H * D * 0.0075);
  // ⚠ `top` is the ABSOLUTE height you stand on — physics compares it to a fighter's world y — so
  // it has to include the ground the building sits on, not just its own height.
  const co = { mesh: m, crack, x: wx, z: wz, r: Math.max(W, D) * 0.6, h: H, hx: W / 2, hz: D / 2, top: gy + H, hp, maxHp: hp, y0: gy + H / 2, w: W, d: D, destroyed: false };
  world.cover.push(co); world.coverAll.push(co);
  return m;
}
// Register an already-built mesh as destructible cover. tower() does this for buildings; this is
// for the pieces that aren't box towers (metro platforms, train cars, barns, stone walls). Must
// push to BOTH lists — `cover` is the live set, `coverAll` is what resetTerrain restores from.
// ⚠ Position and extent come from the MESH, which mesh() has already scaled — the x/z arguments
// are the caller's base-unit intent and would be wrong at any scale but 1.
function reg(world, m, x, z, hx, hz, top, hp) {
  const S = m.scale.x || 1;
  hx *= S; hz *= S; top *= S;
  top += (m.userData.gy || 0);                     // stand on the terrace, not on y=0
  const co = { mesh: m, crack: null, x: m.position.x, z: m.position.z, r: Math.max(hx, hz), h: top, hx, hz, top,
               hp, maxHp: hp, y0: m.position.y, w: hx * 2, d: hz * 2, destroyed: false };
  world.cover.push(co); world.coverAll.push(co);
  return co;
}
const disc = (ctx, mat, x, z, r, y = 0.1, seg = 26) => { const p = mesh(ctx, new THREE.CircleGeometry(r, seg), mat, x, y, z, { recv: false }); p.rotation.x = -Math.PI / 2; return p; };
// a box with the facade UVs already scaled — for the structures that aren't tower()s
const boxUV = (w, h, d, mat) => { const g = new THREE.BoxGeometry(w, h, d); scaleBoxUV(g, w, h, d, ((mat && mat.userData && mat.userData.bay) || 17) * CUR_M); return g; };
const slab = (ctx, mat, x, z, w, d, y = 0.14) => { const p = mesh(ctx, new THREE.PlaneGeometry(w, d), mat, x, y, z, { recv: false }); p.rotation.x = -Math.PI / 2; return p; };
// a parked tractor — the one piece of machinery that tells you which century the farm is in
function tractor(ctx, x, z, yaw) {
  const M2 = ctx.mats;
  mesh(ctx, new THREE.BoxGeometry(11, 4, 5), M2.tractorBody, x, 3.4, z, { ry: yaw, cast: true });
  mesh(ctx, new THREE.BoxGeometry(4.4, 5, 4.6), M2.tractorBody, x - 2.6 * Math.cos(yaw), 7.4, z - 2.6 * Math.sin(yaw), { ry: yaw, cast: true });
  for (const [d, r] of [[4.6, 3.4], [-3.4, 2.1]]) for (const s of [-1, 1])
    mesh(ctx, new THREE.CylinderGeometry(r, r, 1.8, 10), M2.tyre,
      x + d * Math.cos(yaw) - s * 3 * Math.sin(yaw), r, z + d * Math.sin(yaw) + s * 3 * Math.cos(yaw), { rz: Math.PI / 2, ry: yaw });
}
// a parked airliner — decor, not cover; it exists so the apron reads as a working field
function plane(ctx, x, z, yaw) {
  const M2 = ctx.mats;
  const body = mesh(ctx, new THREE.CylinderGeometry(3.4, 2.6, 40, 10), M2.fuselage, x, 5.6, z, { rz: Math.PI / 2, ry: yaw, cast: true });
  body.rotation.set(0, yaw, Math.PI / 2);
  mesh(ctx, new THREE.BoxGeometry(4, 0.9, 38), M2.fuselage, x, 5.2, z, { ry: yaw, cast: true });        // wings
  mesh(ctx, new THREE.BoxGeometry(7, 9, 0.8), M2.livery, x - 17 * Math.cos(yaw), 10, z - 17 * Math.sin(yaw), { ry: yaw, cast: true });   // tail
  for (const s of [-1, 1]) mesh(ctx, new THREE.CylinderGeometry(2, 2, 7, 8), M2.livery, x + s * 4 * Math.sin(-yaw), 3.4, z + s * 11 * Math.cos(yaw), { rz: Math.PI / 2, ry: yaw });
}
function palm(ctx, x, z, s = 1) {
  const M2 = ctx.mats;
  mesh(ctx, new THREE.CylinderGeometry(0.7 * s, 1.1 * s, 18 * s, 5), M2.palmT, x, 9 * s, z, { cast: true });
  for (let i = 0; i < 5; i++) {
    const f = mesh(ctx, new THREE.ConeGeometry(2 * s, 11 * s, 4), M2.palmF, x, 18.8 * s, z);
    f.rotation.z = 1.25; f.rotation.y = (i / 5) * Math.PI * 2; f.translateY(4.4 * s);
  }
}
function flagpole(ctx, x, z, h = 26) {
  mesh(ctx, new THREE.CylinderGeometry(0.2, 0.3, h, 6), ctx.mats.steel, x, h / 2, z);
  mesh(ctx, new THREE.PlaneGeometry(6, 3.6), ctx.mats.red, x + 3.1, h - 2.6, z, { recv: false }).material.side = THREE.DoubleSide;
}

// ---------- DOORS — the metric contract made visible ----------
// Every inhabited structure gets an entrance sized to the PEOPLE, not the map: door dimensions are
// authored in human units and scaled by ctx.M — NEVER by ctx.S. A bigger cell is a bigger city;
// it is not a city for bigger people. The door's POSITION rides the cell scale (it sits on a wall
// the cell dial moved); its SIZE rides the metric. Registered into world.doors so the future
// interior system (and the build report) knows every way in.
// kinds: swing - double - slide (storefront) - revolve (corporate/hotel) - roller (industrial) -
//        turnstile (one fare lane; stadium/metro gates place a bank of them)
function door(ctx, x, z, ry, kind = 'swing') {
  const M2 = ctx.mats, M = ctx.M || 1;
  const g = new THREE.Group();
  g.position.set(sx(ctx, x), ctx.gy, sz(ctx, z)); g.rotation.y = ry;
  const add = (geo, mat, px, py, pz, cast) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = !!cast; m.receiveShadow = true; g.add(m); return m; };
  const DH = 11.2 * M, t = 0.55 * M;                    // a 2.1m doorway in a 1.8m-human world
  let w = 4.8 * M, h = DH;
  if (kind === 'swing') {
    add(new THREE.BoxGeometry(w + 1.6 * M, DH + 0.8 * M, t * 0.7), M2.doorMetal, 0, (DH + 0.8 * M) / 2, 0);
    add(new THREE.BoxGeometry(w, DH, t), M2.doorL, 0.06 * M, DH / 2, 0.16 * M, true);
    add(new THREE.SphereGeometry(0.3 * M, 6, 5), M2.brass, w * 0.34, DH * 0.47, 0.5 * M);
  } else if (kind === 'double') {
    w = 9.6 * M;
    add(new THREE.BoxGeometry(w + 1.8 * M, DH + 1 * M, t * 0.7), M2.doorMetal, 0, (DH + 1 * M) / 2, 0);
    for (const sgn of [-1, 1]) {
      add(new THREE.BoxGeometry(w / 2 - 0.2 * M, DH, t), M2.doorL, sgn * w / 4, DH / 2, 0.16 * M, true);
      add(new THREE.SphereGeometry(0.3 * M, 6, 5), M2.brass, sgn * 0.9 * M, DH * 0.47, 0.5 * M);
    }
  } else if (kind === 'slide') {
    w = 12 * M; h = 10 * M;
    add(new THREE.BoxGeometry(w + 1.2 * M, 1 * M, t), M2.doorMetal, 0, h + 0.5 * M, 0);
    for (const sgn of [-1, 1]) add(new THREE.BoxGeometry(w / 2 - 0.3 * M, h, t * 0.8), M2.doorGlass, sgn * w / 4, h / 2, 0.12 * M, true);
    for (const px of [-w / 2, 0, w / 2]) add(new THREE.BoxGeometry(0.5 * M, h, t), M2.doorMetal, px, h / 2, 0.1 * M);
  } else if (kind === 'revolve') {
    const r = 3.6 * M; w = r * 2; h = 11.6 * M;
    add(new THREE.CylinderGeometry(r, r, h, 12, 1, true, 0.5, Math.PI * 1.6), M2.doorGlass, 0, h / 2, 0, true).material.side = THREE.DoubleSide;
    add(new THREE.CylinderGeometry(r + 0.3 * M, r + 0.3 * M, 0.8 * M, 12), M2.doorMetal, 0, h + 0.3 * M, 0);
    for (let i = 0; i < 4; i++) { const f = add(new THREE.BoxGeometry(r * 0.94, h - 1 * M, 0.28 * M), M2.doorGlass, 0, h / 2, 0, false); f.rotation.y = (i / 4) * Math.PI * 2; f.translateX(r * 0.47); }
  } else if (kind === 'roller') {
    w = 21 * M; h = 13.5 * M;
    add(new THREE.BoxGeometry(w, h, t * 0.8), M2.doorMetal, 0, h / 2, 0.1 * M, true);
    for (let i = 1; i < 5; i++) add(new THREE.BoxGeometry(w, 0.35 * M, t), M2.dark, 0, (h / 5) * i, 0.18 * M);
    for (const sgn of [-1, 1]) add(new THREE.BoxGeometry(1 * M, h + 1 * M, t), M2.doorMetal, sgn * (w / 2 + 0.6 * M), (h + 1 * M) / 2, 0);
  } else if (kind === 'turnstile') {
    w = 4.3 * M; h = 4.2 * M;                            // waist-high, sized to a body — the ruling
    for (const sgn of [-1, 1]) add(new THREE.BoxGeometry(0.9 * M, h, 0.9 * M), M2.doorMetal, sgn * w / 2, h / 2, 0, true);
    add(new THREE.CylinderGeometry(0.22 * M, 0.22 * M, h * 0.9, 6), M2.steel, -w / 2 + 0.7 * M, h * 0.45, 0);
    for (let i = 0; i < 3; i++) { const a = add(new THREE.BoxGeometry(w * 0.8, 0.3 * M, 0.3 * M), M2.brass, 0, h * 0.62, 0, false); a.rotation.y = (i / 3) * Math.PI * 2; a.position.x = -w / 2 + 0.7 * M; a.translateX(w * 0.4); }
  }
  ctx.g.add(g);
  ctx.world.doors.push({ x: g.position.x, z: g.position.z, ry, kind, w, h, tile: ctx._tile || '' });
  return g;
}

// ---- EDGE SOCKETS (see generatePlan) — what each side of this cell faces ----
// A perimeter should stop where the district stops. `side(cell,'n')` is 'same' when the block
// north of you is the same district, so the fence between them should not be built at all.
const side = (cell, d) => (cell && cell.edge && cell.edge[d]) || 'street';
const sameNb = (cell, d) => side(cell, d) === 'same';
// Build a perimeter ONLY on the sides that face something else. `run(w,d,ox,oz)` per side.
function perimeter(cell, run) {
  const H = 1;
  if (!sameNb(cell, 'n')) run('n');
  if (!sameNb(cell, 's')) run('s');
  if (!sameNb(cell, 'w')) run('w');
  if (!sameNb(cell, 'e')) run('e');
}
// Which world direction a side points: n=-z, s=+z, w=-x, e=+x
const SIDE_VEC = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };

// THE BODEGA — a single-storey corner shop with an awning and a lit sign, tucked into the
// corner of a block where two streets actually meet. This is the first thing in the generator
// that could not exist before edge sockets: `cell.corner` is the planner telling the builder
// WHICH two of its sides are open, so the shop faces the junction instead of a random direction.
function bodega(ctx, cx, cz, cell, rng) {
  const c = cell && cell.corner; if (!c) return;
  const M2 = ctx.mats, W = ctx.world, K = CELL / 2 - 15;
  // corner code is two side letters, e.g. 'ne' = open to the north and east
  const sx = c.includes('e') ? 1 : -1, sz = c.includes('s') ? 1 : -1;
  const bx = cx + sx * K, bz = cz + sz * K;
  const shop = mesh(ctx, new THREE.BoxGeometry(24, 11, 20), W._winMats[2], bx, 5.5, bz, { cast: true });
  reg(W, shop, bx, bz, 12, 10, 11, 120);
  mesh(ctx, new THREE.BoxGeometry(26, 1, 22), M2.terraRoof, bx, 11.4, bz);
  // the awning hangs over the pavement on the street-facing side
  const aw = mesh(ctx, new THREE.BoxGeometry(26, 0.7, 7), M2.red, bx, 8.6, bz + sz * 12, { cast: true });
  aw.rotation.x = sz * 0.12;
  // the lit sign — this is what you actually see at night from down the block
  mesh(ctx, new THREE.BoxGeometry(15, 3.2, 0.6), M2.metroSign, bx, 12.9, bz + sz * 10.2, { cast: true });
  door(ctx, bx, bz + sz * 10.6, sz > 0 ? 0 : Math.PI, 'slide');
  for (let i = 0; i < 3; i++)   // crates on the pavement
    mesh(ctx, new THREE.BoxGeometry(3.4, 3, 3), M2.wood, bx - 9 + i * 4.2, 1.5, bz + sz * 13.5 + (rng() - 0.5) * 2);
}

// ---------- the tiles ----------
const T = {
  residential(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[2], R = ctx.mats.terraRoof, rng = ctx.rng;
    if (v === 0) {          // four low homes around a shared yard (1-1.5 stories)
      for (const [ox, oz] of [[-19, -19], [19, -19], [-19, 19], [19, 19]]) {
        const hx = cx + ox + (rng() - 0.5) * 4, hz = cz + oz + (rng() - 0.5) * 4;
        tower(ctx, hx, hz, 26, 16 + rng() * 8, 26, wm, R);
        door(ctx, hx, hz + (oz < 0 ? 13.4 : -13.4), oz < 0 ? 0 : Math.PI, 'swing');   // front door on the yard
      }
      disc(ctx, ctx.mats.lawnM, cx, cz, 12, 0.1);
      ctx.treeSpots.push([cx + (rng() - 0.5) * 10, cz + (rng() - 0.5) * 10]);
    } else if (v === 1) {   // an L-block with a private court
      tower(ctx, cx - 10, cz - 14, 48, 21, 24, wm, R);
      door(ctx, cx - 10, cz - 1.6, 0, 'swing');
      tower(ctx, cx - 22, cz + 12, 24, 25, 30, wm, R);
      door(ctx, cx - 9.6, cz + 12, Math.PI / 2, 'swing');
      disc(ctx, ctx.mats.lawnM, cx + 14, cz + 14, 13, 0.1);
      ctx.treeSpots.push([cx + 14, cz + 14], [cx + 22, cz + 4]);
    } else {                // towers-in-the-park (4-story walk-ups)
      tower(ctx, cx - 14, cz - 8, 22, 70, 22, wm, ctx.mats.paleRoof);
      door(ctx, cx - 14, cz + 3.4, 0, 'double');
      tower(ctx, cx + 15, cz + 10, 22, 58, 22, wm, ctx.mats.paleRoof);
      door(ctx, cx + 15, cz + 21.4, 0, 'double');
      disc(ctx, ctx.mats.lawnM, cx, cz, 26, 0.09);
      ctx.treeSpots.push([cx - 2, cz + 20], [cx + 18, cz - 16], [cx - 24, cz + 12]);
    }
  },
  commercial(ctx, cx, cz, v, cell) {
    const W = ctx.world, wm = W._winMats[v % 2], R = ctx.mats.paleRoof, rng = ctx.rng;
    if (v === 0) { tower(ctx, cx - 15, cz - 10, 30, 96 + rng() * 26, 30, wm, R); tower(ctx, cx + 17, cz + 12, 26, 64 + rng() * 20, 26, wm, R);
      door(ctx, cx - 15, cz + 5.4, 0, 'slide'); door(ctx, cx + 17, cz + 25.4, 0, 'slide'); }
    else if (v === 1) { const p = tower(ctx, cx, cz, 52, 18, 40, wm, R); tower(ctx, cx - 6, cz - 2, 24, 112, 24, wm, R); p.castShadow = false;
      door(ctx, cx + 12, cz + 20.4, 0, 'slide'); }
    else { tower(ctx, cx, cz, 30, 118 + rng() * 22, 44, wm, R); door(ctx, cx, cz + 22.4, 0, 'slide'); }
    bodega(ctx, cx, cz, cell, rng);
  },
  // THE OFFICE BLOCK → THE CORPORATE CORE. A bigger site means MORE TOWERS, not a taller one —
  // a downtown core is a cluster, and the plaza and skybridges between them are the fight.
  company(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[0], M2 = ctx.mats, rng = ctx.rng;
    const HW = ctx.W / 2, HD = ctx.D / 2, core = ctx.W > CELL * 1.4 || ctx.D > CELL * 1.4;
    if (v === 0) {          // the HQ: one glass monolith + logo pylon + parking field
      tower(ctx, cx - HW * 0.1, cz, 30, 150, 30, wm, M2.steelRoof);
      door(ctx, cx - HW * 0.1, cz + 15.6, 0, 'revolve');
      mesh(ctx, new THREE.BoxGeometry(2.6, 30, 2.6), M2.steel, cx + HW * 0.45, 15, cz - HD * 0.45, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(13, 6.5, 1), M2.gold, cx + HW * 0.45, 33, cz - HD * 0.45, { cast: true });
      disc(ctx, M2.plazaM, cx + HW * 0.3, cz + HD * 0.35, 15, 0.09);
    } else {                // twin towers with a skybridge
      tower(ctx, cx - HW * 0.3, cz, 24, 104, 26, wm, M2.steelRoof);
      door(ctx, cx - HW * 0.3, cz + 13.6, 0, 'revolve');
      tower(ctx, cx + HW * 0.3, cz, 24, 122, 26, wm, M2.steelRoof);
      door(ctx, cx + HW * 0.3, cz + 13.6, 0, 'revolve');
      mesh(ctx, new THREE.BoxGeometry(HW * 0.6, 5, 9), M2.steel, cx, 78, cz, { cast: true });
    }
    if (core) {             // the rest of the core — satellites of varied height, and a plaza
      const n = Math.max(2, Math.round((ctx.W * ctx.D) / (CELL * CELL) ) );
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.7;
        const x = cx + Math.cos(a) * HW * 0.62, z = cz + Math.sin(a) * HD * 0.62;
        tower(ctx, x, z, 22 + rng() * 8, 70 + rng() * 70, 22 + rng() * 8, wm, M2.steelRoof);
      }
      disc(ctx, M2.plazaM, cx, cz, Math.min(HW, HD) * 0.4, 0.09, 26);
    }
  },
  // THE WORKS → THE PLANT → THE INDUSTRIAL PARK. Sheds, tanks and stacks multiply across the site.
  industrial(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[3], M2 = ctx.mats, rng = ctx.rng;
    const HW = ctx.W / 2, HD = ctx.D / 2;
    const reps = Math.max(1, Math.round((ctx.W * ctx.D) / (CELL * CELL)));   // one "unit" per cell
    for (let k = 0; k < reps; k++) {
      // lay the units out along the site's long axis so a 2×1 plant reads as one works, not two
      const t = reps === 1 ? 0 : (k / (reps - 1) - 0.5);
      const ox = ctx.W >= ctx.D ? t * HW * 1.15 : 0, oz = ctx.W >= ctx.D ? 0 : t * HD * 1.15;
      const bx = cx + ox, bz = cz + oz;
      if (v === 0) {          // warehouse rows (real ~4m sheds) + container spill
        tower(ctx, bx - 15, bz - 12, 26, 20, 52, wm, M2.steelRoof);
        door(ctx, bx - 15, bz + 14.6, 0, 'roller');
        tower(ctx, bx + 16, bz + 6, 26, 24, 44, wm, M2.steelRoof);
        door(ctx, bx + 16, bz + 28.6, 0, 'roller');
        for (let i = 0; i < 4; i++) mesh(ctx, new THREE.BoxGeometry(11, 4.4, 4.6), M2.containers[(rng() * 5) | 0], bx + 8 + (rng() - 0.5) * 16, 2.2, bz - 28, { cast: true });
      } else if (v === 1) {   // tank farm + stacks
        tower(ctx, bx + 12, bz + 12, 34, 24, 34, wm, M2.steelRoof);
        door(ctx, bx + 12, bz + 29.6, 0, 'roller');
        for (const [dx, dz, r] of [[-20, -14, 7], [-6, -22, 6], [-24, 2, 6]])
          mesh(ctx, new THREE.CylinderGeometry(r, r, 18, 12), M2.steel, bx + dx, 9, bz + dz, { cast: true });
        mesh(ctx, new THREE.CylinderGeometry(1.6, 2.2, 46, 8), M2.rust, bx - 2, 23, bz + 4, { cast: true });
        mesh(ctx, new THREE.CylinderGeometry(1.3, 1.7, 38, 8), M2.rust, bx + 4, 19, bz - 2, { cast: true });
      } else {                // the works: factory + conveyor ramp
        tower(ctx, bx - 6, bz - 6, 44, 26, 34, wm, M2.steelRoof);
        door(ctx, bx - 6, bz + 11.6, 0, 'roller');
        const ramp = mesh(ctx, new THREE.BoxGeometry(34, 1.6, 5), M2.steel, bx + 16, 12, bz + 22, { cast: true });
        ramp.rotation.z = -0.32;
        mesh(ctx, new THREE.BoxGeometry(10, 12, 10), M2.rust, bx + 32, 6, bz + 22, { cast: true });
      }
    }
  },
  // THE OUTPOST → THE GARRISON → THE AIRBASE. The compound fills whatever ground it has: barracks
  // rows multiply, and once it is big enough it earns a runway and hangars.
  military(ctx, cx, cz, v, cell) {
    const W = ctx.world, wm = W._winMats[4], M2 = ctx.mats;
    const HW = ctx.W / 2 - 8, HD = ctx.D / 2 - 8;
    const airbase = ctx.W > CELL * 1.6 && ctx.D > CELL * 1.6;
    // The perimeter fence runs only where the compound MEETS something else. Two adjacent
    // military cells are one base, not two fenced boxes with a corridor between them.
    const RUNS = { n: [HW * 2, 1, 0, -HD], s: [HW * 2, 1, 0, HD], w: [1, HD * 2, -HW, 0], e: [1, HD * 2, HW, 0] };
    perimeter(cell, (d) => { const [w2, d2, ox, oz] = RUNS[d];
      mesh(ctx, new THREE.BoxGeometry(w2, 6, d2), M2.fence, cx + ox, 3, cz + oz); });
    if (airbase) {          // a runway, hangars, and the tower — the base is an airfield now
      slab(ctx, M2.tarmac, cx, cz + HD * 0.45, HW * 1.7, 30);
      for (let i = -3; i <= 3; i++) slab(ctx, M2.runwayLine, cx + i * (HW * 0.4), cz + HD * 0.45, 16, 1.6, 0.16);
      for (let i = 0; i < 2; i++) {
        const hx = cx - HW * 0.4 + i * HW * 0.7, hz = cz - HD * 0.3;
        const h = mesh(ctx, boxUV(46, 24, 30, wm), wm, hx, 12, hz, { cast: true });
        reg(W, h, hx, hz, 23, 15, 24, 220);
        door(ctx, hx, hz + 15.6, 0, 'roller');
        mesh(ctx, new THREE.CylinderGeometry(15, 15, 46, 12, 1, false, 0, Math.PI), M2.oliveRoof, hx, 24, hz, { rz: Math.PI / 2, cast: true });
      }
      const tx = cx + HW * 0.75, tz = cz - HD * 0.55;
      const twr = mesh(ctx, boxUV(12, 44, 12, wm), wm, tx, 22, tz, { cast: true });
      reg(W, twr, tx, tz, 6, 6, 44, 240);
      mesh(ctx, new THREE.BoxGeometry(18, 9, 18), wm, tx, 48, tz, { cast: true });
    }
    if (v === 0) {          // bunkers + watchtower + pad
      tower(ctx, cx - HW * 0.3, cz - HD * 0.25, 34, 15, 28, wm, ctx.mats.oliveRoof);
      door(ctx, cx - HW * 0.3, cz - HD * 0.25 + 14.5, 0, 'swing');
      tower(ctx, cx + HW * 0.4, cz + HD * 0.35, 26, 12, 22, wm, ctx.mats.oliveRoof);
      door(ctx, cx + HW * 0.4, cz + HD * 0.35 + 11.5, 0, 'swing');
      mesh(ctx, new THREE.BoxGeometry(5, 36, 5), M2.olive, cx + HW * 0.6, 18, cz - HD * 0.55, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(9, 5, 9), M2.fence, cx + HW * 0.6, 38.5, cz - HD * 0.55, { cast: true });
      if (ctx.world._heliTex) disc(ctx, new THREE.MeshBasicMaterial({ map: ctx.world._heliTex, transparent: true, opacity: 0.8, depthWrite: false }), cx - HW * 0.35, cz + HD * 0.55, 12, 0.12, 24);
    } else {                // barracks rows + motor pool — more rows on a bigger compound
      const n = Math.max(3, Math.round(ctx.W / 32));
      for (let i = 0; i < n; i++) {
        const rx = cx - HW * 0.7 + i * (HW * 1.4 / n);
        tower(ctx, rx, cz - HD * 0.3, 16, 14, 34, wm, ctx.mats.oliveRoof);
        door(ctx, rx, cz - HD * 0.3 + 17.5, 0, 'swing');
      }
      for (let i = 0; i < 2; i++) mesh(ctx, new THREE.BoxGeometry(16, 7, 8), M2.olive, cx - 8 + i * 20, 3.5, cz + HD * 0.6, { cast: true });
      flagpole(ctx, cx + HW * 0.75, cz + HD * 0.4);
    }
  },
  political(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    if (v === 0) {          // the capitol: base + drum + dome + colonnade + flags
      const base = tower(ctx, cx, cz - 4, 48, 18, 34, M2.marble, null);
      door(ctx, cx, cz + 13.6, 0, 'double');
      mesh(ctx, new THREE.CylinderGeometry(13, 15, 11, 18), M2.marble, cx, 23.5, cz - 4, { cast: true });
      mesh(ctx, new THREE.SphereGeometry(12, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M2.domeGold, cx, 29, cz - 4, { cast: true });
      for (let i = 0; i < 6; i++) mesh(ctx, new THREE.CylinderGeometry(1.3, 1.6, 16, 8), M2.marble, cx - 17.5 + i * 7, 8, cz + 15, { cast: true });
      disc(ctx, M2.plazaM, cx, cz + 28, 16, 0.09);
      flagpole(ctx, cx - 26, cz + 24); flagpole(ctx, cx + 26, cz + 24);
      base.castShadow = true;
    } else {                // ministry slabs + obelisk
      tower(ctx, cx - 16, cz - 8, 26, 56, 20, W._winMats[0], M2.paleRoof);
      door(ctx, cx - 16, cz + 2.6, 0, 'double');
      tower(ctx, cx + 16, cz - 8, 26, 56, 20, W._winMats[0], M2.paleRoof);
      door(ctx, cx + 16, cz + 2.6, 0, 'double');
      mesh(ctx, new THREE.CylinderGeometry(1.2, 3.2, 36, 4), M2.marble, cx, 18, cz + 22, { cast: true });
      disc(ctx, M2.plazaM, cx, cz + 22, 13, 0.09);
    }
  },
  educational(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[2], M2 = ctx.mats;
    if (v === 0) {          // the quad + bell tower
      tower(ctx, cx, cz - 20, 52, 22, 18, wm, M2.terraRoof);
      door(ctx, cx, cz - 10.4, 0, 'double');
      tower(ctx, cx - 22, cz + 6, 18, 20, 34, wm, M2.terraRoof);
      tower(ctx, cx + 22, cz + 6, 18, 20, 34, wm, M2.terraRoof);
      mesh(ctx, new THREE.BoxGeometry(7, 46, 7), M2.stone, cx, 23, cz - 34, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(9.5, 5, 9.5), M2.terraRoof, cx, 48.5, cz - 34, { cast: true });
      disc(ctx, M2.lawnM, cx, cz + 10, 15, 0.1);
      ctx.treeSpots.push([cx - 8, cz + 12], [cx + 8, cz + 8]);
    } else {                // the library + dorms
      tower(ctx, cx - 8, cz - 8, 36, 44, 26, wm, M2.paleRoof);
      door(ctx, cx - 8, cz + 5.6, 0, 'double');
      tower(ctx, cx + 22, cz + 14, 16, 28, 28, wm, M2.terraRoof);
      disc(ctx, M2.lawnM, cx - 6, cz + 24, 12, 0.1);
      ctx.treeSpots.push([cx - 6, cz + 24]);
    }
  },
  temple(ctx, cx, cz, v, cell) {
    const M2 = ctx.mats;
    const court = CELL / 2 - 14;
    const CRUNS = { n: [court * 2, 1, 0, -court], s: [court * 2, 1, 0, court], w: [1, court * 2, -court, 0], e: [1, court * 2, court, 0] };
    perimeter(cell, (d) => { const [w2, d2, ox, oz] = CRUNS[d];        // one precinct, not four walls
      mesh(ctx, new THREE.BoxGeometry(w2, 2.2, d2), M2.stone, cx + ox, 1.1, cz + oz); });
    if (v === 0) {          // tiered pagoda — one structural base, ornamental upper tiers
      tower(ctx, cx, cz, 30, 14, 30, M2.stone, null);
      door(ctx, cx, cz + 15.6, 0, 'double');
      let y = 14;
      for (const [s, h] of [[22, 12], [14, 10]]) {
        mesh(ctx, new THREE.BoxGeometry(s, h, s), M2.stone, cx, y + h / 2, cz, { cast: true });
        mesh(ctx, new THREE.BoxGeometry(s + 8, 2.4, s + 8), M2.terraRoof, cx, y + h + 1.2, cz, { cast: true });
        y += h;
      }
      mesh(ctx, new THREE.BoxGeometry(38, 2.4, 38), M2.terraRoof, cx, 15.5, cz, { cast: true });
      mesh(ctx, new THREE.CylinderGeometry(0.5, 0.5, 9, 6), M2.gold, cx, y + 5.5, cz, { cast: true });
    } else if (v === 1) {   // the golden dome shrine
      tower(ctx, cx, cz, 26, 16, 26, M2.stone, null);
      door(ctx, cx, cz + 13.6, 0, 'double');
      mesh(ctx, new THREE.SphereGeometry(13, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M2.domeGold, cx, 16, cz, { cast: true });
      mesh(ctx, new THREE.CylinderGeometry(1.8, 2.2, 40, 8), M2.stone, cx + 20, 20, cz + 18, { cast: true });
      mesh(ctx, new THREE.SphereGeometry(2.8, 10, 8), M2.domeGold, cx + 20, 41.5, cz + 18, { cast: true });
    } else {                // the ziggurat — the base tier is the structural cover
      const base = mesh(ctx, new THREE.BoxGeometry(40, 10, 40), M2.stone, cx, 5, cz, { cast: true });
      let y = 10;
      for (const [s, h] of [[30, 10], [20, 10], [10, 10]]) { mesh(ctx, new THREE.BoxGeometry(s, h, s), M2.stone, cx, y + h / 2, cz, { cast: true }); y += h; }
      const stair = mesh(ctx, new THREE.BoxGeometry(8, 1.8, 36), M2.stone, cx, 9, cz + 24, { cast: true }); stair.rotation.x = -0.5;
      const co = { mesh: base, crack: null, x: cx, z: cz, r: 22, h: 40, hx: 20, hz: 20, top: 40, hp: 820, maxHp: 820, y0: 5, w: 40, d: 40, destroyed: false };
      ctx.world.cover.push(co); ctx.world.coverAll.push(co);
    }
  },
  mining(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    W._pendingPits = W._pendingPits || [];
    W._pendingPits.push([cx, cz, v === 0 ? 30 : 24, v === 0 ? 5.2 : 4]);   // dug into the terrain after the ground exists
    if (v === 0) {          // headframe + conveyor + spoil
      const legs = mesh(ctx, new THREE.BoxGeometry(2.4, 36, 2.4), M2.rust, cx + 30, 18, cz - 26, { cast: true }); legs.rotation.z = 0.18;
      const legs2 = mesh(ctx, new THREE.BoxGeometry(2.4, 36, 2.4), M2.rust, cx + 24, 18, cz - 26, { cast: true }); legs2.rotation.z = -0.18;
      mesh(ctx, new THREE.TorusGeometry(4, 0.6, 8, 18), M2.dark, cx + 27, 35, cz - 26, { cast: true });
      const conv = mesh(ctx, new THREE.BoxGeometry(38, 1.8, 5), M2.steel, cx + 18, 10, cz + 24, { cast: true }); conv.rotation.z = -0.26;
      mesh(ctx, new THREE.ConeGeometry(11, 12, 10), M2.rust, cx + 34, 6, cz + 30, { cast: true });
      mesh(ctx, new THREE.ConeGeometry(8, 9, 10), M2.rust, cx + 24, 4.5, cz + 36, { cast: true });
      tower(ctx, cx - 30, cz + 30, 18, 14, 14, W._winMats[3], M2.steelRoof);
      door(ctx, cx - 30, cz + 37.6, 0, 'swing');
    } else {                // quarry terraces + crusher
      tower(ctx, cx + 28, cz - 28, 20, 18, 16, W._winMats[3], M2.steelRoof);
      door(ctx, cx + 28, cz - 19.4, 0, 'swing');
      mesh(ctx, new THREE.BoxGeometry(12, 14, 12), M2.dark, cx + 28, 7, cz + 26, { cast: true });
      mesh(ctx, new THREE.ConeGeometry(9, 10, 10), M2.rust, cx - 30, 5, cz - 30, { cast: true });
    }
  },
  // THE PORT — the clearest case for size tiers. A fishing wharf, a cargo quay and a container
  // terminal are the same TYPE at three scales: the frontage, the number of berths, the number of
  // cranes and whether there is a warehouse row at all all fall out of `ctx.D` (the run along the
  // shore) rather than being three separate tiles.
  seaport(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world, rng = ctx.rng;
    const HW = ctx.W / 2, HD = ctx.D / 2;
    const big = ctx.D > CELL * 1.5, mid = ctx.D > CELL * 1.2;
    const berths = Math.max(1, Math.round(ctx.D / 78));            // one berth per ~78u of frontage
    if (v === 0) {          // THE CONTAINER SIDE — stacks, cranes, a shed per berth
      for (let b = 0; b < berths; b++) {
        const bz = cz - HD + (b + 0.5) * (ctx.D / berths);
        tower(ctx, cx - HW * 0.55, bz, 24, 20, Math.min(44, ctx.D / berths - 12), W._winMats[3], M2.steelRoof);
        door(ctx, cx - HW * 0.55 + 12.5, bz, Math.PI / 2, 'roller');
        for (let i = 0; i < 6; i++) {
          const st = (rng() * 2) | 0;
          mesh(ctx, new THREE.BoxGeometry(11, 4.4, 4.6), M2.containers[(rng() * 5) | 0],
            cx - 6 + (i % 3) * 13, 2.2 + st * 4.4, bz - 12 + ((i / 3) | 0) * 12, { cast: true });
        }
        // one crane per berth, reaching for the water
        const kx = cx + HW * 0.32;
        mesh(ctx, new THREE.BoxGeometry(7, 4, 7), M2.gold, kx, 2, bz + 14, { cast: true });
        mesh(ctx, new THREE.BoxGeometry(2.6, 50, 2.6), M2.gold, kx, 27, bz + 14, { cast: true });
        mesh(ctx, new THREE.BoxGeometry(40, 2.2, 2.2), M2.gold, kx + 16, 50, bz + 14, { cast: true });
      }
      if (big) {            // a terminal is big enough to need its own admin block and gantry road
        const ax = cx - HW * 0.8;
        const adm = mesh(ctx, boxUV(26, 34, 22, W._winMats[0]), W._winMats[0], ax, 17, cz, { cast: true });
        reg(W, adm, ax, cz, 13, 11, 34, 300);
        door(ctx, ax + 13.5, cz, Math.PI / 2, 'double');
      }
    } else {                // THE PIER SIDE — decks, bollards, and a ship if there is room
      tower(ctx, cx - HW * 0.6, cz + 6, 22, 18, 40, W._winMats[3], M2.steelRoof);
      door(ctx, cx - HW * 0.6 + 11.5, cz + 6, Math.PI / 2, 'roller');
      const piers = Math.max(2, Math.round(ctx.D / 62));
      for (let p = 0; p < piers; p++) {
        const oz = -HD + (p + 0.5) * (ctx.D / piers);
        mesh(ctx, new THREE.BoxGeometry(HW * 1.1, 1.6, 9), M2.deck, cx + HW * 0.36, 1.3, cz + oz);
        for (let i = 0; i < 4; i++) mesh(ctx, new THREE.CylinderGeometry(0.7, 0.85, 3.6, 6), M2.wood, cx - HW * 0.1 + i * 16, 1.6, cz + oz + 5);
      }
      if (mid) {            // a working ship only fits once the quay is long enough to berth it
        const hull = mesh(ctx, new THREE.BoxGeometry(Math.min(74, ctx.D * 0.5), 7, 12), M2.red, cx + HW * 0.5, 2.4, cz - HD * 0.2, { cast: true });
        hull.rotation.y = 0.06;
        mesh(ctx, new THREE.BoxGeometry(10, 7, 9), M2.white, cx + HW * 0.5 + 18, 9.4, cz - HD * 0.2, { cast: true });
      }
    }
  },
  resort(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    if (v === 0) {          // the grand hotel + pool deck
      tower(ctx, cx - 16, cz - 8, 44, 76, 20, W._winMats[2], M2.paleRoof);
      door(ctx, cx - 16, cz + 2.6, 0, 'revolve');
      disc(ctx, M2.sandM, cx + 12, cz + 22, 22, 0.08);
      disc(ctx, M2.plazaM, cx + 10, cz + 20, 13, 0.1);
      disc(ctx, M2.poolM, cx + 10, cz + 20, 10, 0.12, 22);
      palm(ctx, cx + 28, cz + 8); palm(ctx, cx - 4, cz + 30, 0.9); palm(ctx, cx + 26, cz + 32, 1.05);
      for (let i = 0; i < 3; i++) { mesh(ctx, new THREE.CylinderGeometry(0.2, 0.26, 5.5, 5), M2.wood, cx + 2 + i * 8, 2.75, cz + 12); mesh(ctx, new THREE.ConeGeometry(3.4, 2, 8), M2.red, cx + 2 + i * 8, 6, cz + 12, { cast: true }); }
    } else {                // boardwalk + cabana row
      disc(ctx, M2.sandM, cx + 14, cz, 30, 0.08);
      mesh(ctx, new THREE.BoxGeometry(10, 1.4, CELL - 20), M2.deck, cx + 34, 1, cz);
      for (let i = 0; i < 4; i++) {
        mesh(ctx, new THREE.BoxGeometry(8, 6.5, 7), M2.canvas, cx + 10, 3.25, cz - 30 + i * 19, { cast: true });
        mesh(ctx, new THREE.BoxGeometry(9.6, 1.6, 8.6), M2.red, cx + 10, 7.3, cz - 30 + i * 19, { cast: true });
      }
      tower(ctx, cx - 22, cz + 4, 24, 52, 30, W._winMats[2], M2.paleRoof);
      door(ctx, cx - 9.4, cz + 4, Math.PI / 2, 'revolve');
      palm(ctx, cx + 22, cz - 32); palm(ctx, cx + 20, cz + 30, 0.9);
    }
  },
  park(ctx, cx, cz, v) {
    const M2 = ctx.mats, rng = ctx.rng;
    disc(ctx, M2.lawnM, cx, cz, 38, 0.09, 30);
    const n = 7;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rng(); ctx.treeSpots.push([cx + Math.cos(a) * (24 + rng() * 8), cz + Math.sin(a) * (24 + rng() * 8)]); }
    if (v === 1) { disc(ctx, M2.pondM, cx + 6, cz - 4, 12, 0.11, 22); mesh(ctx, new THREE.CylinderGeometry(1.2, 2.8, 24, 4), M2.marble, cx - 16, 12, cz + 12, { cast: true }); }
    else ctx.treeSpots.push([cx, cz]);
  },
  // ---- NEW TILES: the city gets more to fight through ----
  // THE BOWL — the first tile to claim a real FOOTPRINT. On a 2×2 anchor `ctx.W`/`ctx.D` are
  // ~192u, so the stands are a genuine ring you run laps inside rather than ten blocks crammed
  // into one 96u cell. It still builds correctly at 1×1 (the proving ground) — everything is
  // derived from the footprint, nothing is hard-coded to one size.
  stadium(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    const R = Math.min(ctx.W, ctx.D) * 0.42, inner = R * 0.72;
    disc(ctx, M2.lawnM, cx, cz, inner * 0.86, 0.1, 30);
    const N = Math.max(10, Math.round(R * 0.26));
    for (let i = 0; i < N; i++) {     // the ring of stands, each a real standable block
      const a = (i / N) * Math.PI * 2;
      const w = Math.max(15, (2 * Math.PI * R / N) * 0.92);
      tower(ctx, cx + Math.cos(a) * R, cz + Math.sin(a) * R, w, v === 0 ? 22 : 30, w, W._winMats[0], M2.paleRoof);
    }
    for (let i = -1; i <= 1; i++) {                     // turnstile banks at the two main gates
      door(ctx, cx - R - 5, cz + i * 5.5, -Math.PI / 2, 'turnstile');
      door(ctx, cx + R + 5, cz + i * 5.5, Math.PI / 2, 'turnstile');
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const mx = cx + sx * R * 0.88, mz = cz + sz * R * 0.88;
      mesh(ctx, new THREE.BoxGeometry(1.2, 34, 1.2), M2.steel, mx, 17, mz, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(9, 5, 1), M2.gold, mx, 33, mz, { cast: true });                   // floodlight masts
    }
  },
  // THE FIELD — a 2×3 airport. This is the proof that footprints are real: a 570u runway cannot
  // be expressed on a 96u grid at all, and because the planner marks the covered cells as one
  // owner, the road graph refuses to cut a street across the strip.
  airport(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world, rng = ctx.rng;
    const RW = ctx.W - 24, RD = Math.min(34, ctx.D * 0.2);
    slab(ctx, M2.tarmac, cx, cz + ctx.D * 0.12, RW, RD);
    for (let i = -Math.floor(RW / 40); i <= Math.floor(RW / 40); i++)                                    // centreline
      slab(ctx, M2.runwayLine, cx + i * 40, cz + ctx.D * 0.12, 18, 1.6, 0.16);
    slab(ctx, M2.tarmac, cx - RW * 0.1, cz - ctx.D * 0.2, RW * 0.55, RD * 0.8);                          // apron
    // the terminal — long, low, glass, facing the apron
    const tW = ctx.W * 0.42, tz = cz - ctx.D * 0.34;
    const term = mesh(ctx, boxUV(tW, 22, 30, W._winMats[0]), W._winMats[0], cx - ctx.W * 0.08, 11, tz, { cast: true });
    reg(W, term, cx - ctx.W * 0.08, tz, tW / 2, 15, 22, 340);
    door(ctx, cx - ctx.W * 0.08 - 10, tz + 15.6, 0, 'slide');
    door(ctx, cx - ctx.W * 0.08 + 10, tz + 15.6, 0, 'slide');
    mesh(ctx, new THREE.BoxGeometry(tW + 4, 1.4, 32), M2.paleRoof, cx - ctx.W * 0.08, 22.4, tz);
    // the control tower — the landmark you navigate by from the far side of the city
    const cwx = cx + ctx.W * 0.26, cwz = tz - 4;
    const shaft = mesh(ctx, boxUV(13, 62, 13), M2.white, cwx, 31, cwz, { cast: true });
    reg(W, shaft, cwx, cwz, 6.5, 6.5, 62, 260);
    mesh(ctx, new THREE.CylinderGeometry(11, 9, 12, 8), W._winMats[0], cwx, 68, cwz, { cast: true });
    mesh(ctx, new THREE.CylinderGeometry(11.5, 11.5, 1.4, 8), M2.steelRoof, cwx, 74.6, cwz);
    // hangars along the far edge + parked aircraft, so the field reads as working
    for (let i = 0; i < 2; i++) {
      const hx = cx - ctx.W * 0.28 + i * ctx.W * 0.3, hz = cz + ctx.D * 0.36;
      const h = mesh(ctx, boxUV(52, 26, 34, W._winMats[3]), W._winMats[3], hx, 13, hz, { cast: true });
      reg(W, h, hx, hz, 26, 17, 26, 220);
      mesh(ctx, new THREE.CylinderGeometry(17, 17, 52, 12, 1, false, 0, Math.PI), M2.steelRoof, hx, 26, hz, { rz: Math.PI / 2, cast: true });
    }
    for (let i = 0; i < 3; i++) plane(ctx, cx - RW * 0.22 + i * 44, cz - ctx.D * 0.16, rng() * 0.4 - 0.2);
  },
  // THE YARDS — a 1×3 rail yard: parallel tracks, rolling stock, a loading shed and a water
  // tower. Linear like the metro, but at grade, so it is long low cover across a whole flank.
  railyard(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world, rng = ctx.rng;
    const L = ctx.W - 20, lanes = ctx.D > 120 ? 6 : 4;
    slab(ctx, M2.ballast, cx, cz, L, lanes * 13 + 10, 0.12);
    for (let i = 0; i < lanes; i++) {
      const z = cz - (lanes - 1) * 6.5 + i * 13;
      for (const s of [-1, 1]) mesh(ctx, new THREE.BoxGeometry(L, 0.9, 1.1), M2.rail, cx, 0.7, z + s * 3.2);
      for (let j = 0; j < 3; j++) if (rng() < 0.62) {                          // rolling stock as real cover
        const w = 34 + rng() * 16, wx = cx - L / 2 + 22 + j * (L / 3) + rng() * 10;
        const car = mesh(ctx, boxUV(w, 13, 11), M2.containers[(rng() * M2.containers.length) | 0], wx, 8, z, { cast: true });
        reg(W, car, wx, z, w / 2, 5.5, 14.5, 70);
        mesh(ctx, new THREE.BoxGeometry(w * 0.9, 1.2, 12), M2.dark, wx, 1.6, z);
      }
    }
    const sx = cx - L * 0.32, sz = cz + (lanes * 6.5 + 22);
    const shed = mesh(ctx, boxUV(74, 24, 30, W._winMats[3]), W._winMats[3], sx, 12, sz, { cast: true });
    reg(W, shed, sx, sz, 37, 15, 24, 240);
    door(ctx, sx, sz + 15.6, 0, 'roller');
    mesh(ctx, new THREE.BoxGeometry(78, 1.6, 33), M2.steelRoof, sx, 24.6, sz);
    const wx = cx + L * 0.3, wz = sz - 4;                                       // the water tower
    for (const [ox, oz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) mesh(ctx, new THREE.BoxGeometry(1.6, 30, 1.6), M2.steel, wx + ox, 15, wz + oz, { cast: true });
    const tank = mesh(ctx, new THREE.CylinderGeometry(11, 11, 16, 10), M2.rust, wx, 38, wz, { cast: true });
    reg(W, tank, wx, wz, 11, 11, 46, 130);
    mesh(ctx, new THREE.ConeGeometry(11.6, 6, 10), M2.steelRoof, wx, 49, wz, { cast: true });
  },
  // THE CLINIC → GENERAL HOSPITAL → MEDICAL CENTRE. A bigger site buys WINGS off the main slab
  // and a second pad, not a taller version of the same box.
  hospital(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    const HW = ctx.W / 2, HD = ctx.D / 2, big = ctx.W > CELL * 1.4 || ctx.D > CELL * 1.4;
    const h = v === 0 ? 60 : 84;
    const mw = Math.min(46, ctx.W * 0.42);
    tower(ctx, cx - HW * 0.08, cz - HD * 0.1, mw, h, 34, W._winMats[0], M2.paleRoof);
    door(ctx, cx - HW * 0.08 - 8, cz - HD * 0.1 + 17.6, 0, 'double');
    door(ctx, cx - HW * 0.08 + 9, cz - HD * 0.1 + 17.6, 0, 'slide');
    if (W._heliTex) disc(ctx, new THREE.MeshBasicMaterial({ map: W._heliTex, transparent: true, opacity: 0.85, depthWrite: false }), cx - HW * 0.08, cz - HD * 0.1, 11, h + 0.3, 24);
    if (big) {                        // the wings — lower, longer, flanking the tower
      for (const s of [-1, 1]) {
        const wx = cx + s * HW * 0.52;
        tower(ctx, wx, cz + HD * 0.12, Math.min(34, ctx.W * 0.24), 34, Math.min(58, ctx.D * 0.5), W._winMats[0], M2.paleRoof);
      }
      if (W._heliTex) disc(ctx, new THREE.MeshBasicMaterial({ map: W._heliTex, transparent: true, opacity: 0.7, depthWrite: false }), cx + HW * 0.52, cz + HD * 0.12, 9, 34.3, 20);
    }
    mesh(ctx, new THREE.BoxGeometry(26, 7, 12), M2.white, cx + HW * 0.2, 3.5, cz + HD * 0.5, { cast: true });      // the bay canopy
    for (const s of [-1, 1]) mesh(ctx, new THREE.BoxGeometry(1.2, 7, 1.2), M2.steel, cx + HW * 0.2 + s * 12, 3.5, cz + HD * 0.5 + 6);
    disc(ctx, M2.plazaM, cx - HW * 0.45, cz + HD * 0.45, 13, 0.09);
    ctx.treeSpots.push([cx - HW * 0.5, cz + HD * 0.5]);
  },
  // THE MARKET → THE GRAND BAZAAR. Stalls tile the whole site, so a bigger market is genuinely
  // more market — dense low cover you fight through, never anything tall.
  market(ctx, cx, cz, v) {
    const M2 = ctx.mats, rng = ctx.rng;
    const HW = ctx.W / 2 - 12, HD = ctx.D / 2 - 12;
    disc(ctx, M2.plazaM, cx, cz, Math.min(HW, HD) * 1.15, 0.08, 30);
    const cols = Math.max(3, Math.round(ctx.W / 32)), rows = Math.max(3, Math.round(ctx.D / 24));
    for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) {
      const x = cx - HW + (c2 + 0.5) * (HW * 2 / cols);
      const z = cz - HD + (r + 0.5) * (HD * 2 / rows) + (rng() - 0.5) * 3;
      mesh(ctx, new THREE.BoxGeometry(14, 6, 9), M2.wood, x, 3, z, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(16, 1.2, 11), (rng() < 0.5 ? M2.red : M2.canvas), x, 7, z, { cast: true });
    }
    // a bazaar is covered — a colonnaded arcade down one side, which is real cover
    if (ctx.W > CELL * 1.4 || ctx.D > CELL * 1.4) {
      const ax = cx - HW - 6;
      const arc = mesh(ctx, new THREE.BoxGeometry(12, 14, HD * 2), M2.stone, ax, 7, cz, { cast: true });
      reg(ctx.world, arc, ax, cz, 6, HD, 14, 220);
      mesh(ctx, new THREE.BoxGeometry(18, 2, HD * 2 + 6), M2.terraRoof, ax, 15, cz, { cast: true });
    }
    ctx.treeSpots.push([cx + HW * 0.9, cz - HD * 0.9], [cx - HW * 0.9, cz + HD * 0.9]);
  },
  // THE METRO — a real cut-and-cover trench you fight IN, not a decal. The planner lays these
  // in a straight line along one grid row, so consecutive metro cells form ONE continuous cut
  // across the city: the linear spine the concentric-square layout never had. 13u deep, so
  // being knocked off the street into the station is a genuine fall.
  metro(ctx, cx, cz, v, cell) {
    const M2 = ctx.mats, W = ctx.world, rng = ctx.rng;
    const D = 13, HD = 26;                       // cut depth, half-depth across the tracks
    W._pendingCuts = W._pendingCuts || [];
    // ⚠ The cut now extends ONLY toward neighbours that are also metro. Before sockets this
    // overshot 12u past the cell on BOTH sides unconditionally — so the last station on a line
    // dug a trench into whatever district happened to be next door, and the shared stretch
    // between two stations was excavated twice.
    const ext = (d) => (cell && cell.nb && cell.nb[d] === 'metro') ? 12 : -6;   // negative = stop short
    const wW = ext('w'), wE = ext('e');
    W._pendingCuts.push([cx + (wE - wW) / 2, cz, CELL / 2 + (wW + wE) / 2, HD, D, 0]);
    const fy = -D;                               // the station floor
    if (v === 0) {
      // --- platforms: raised slabs either side of the track, standable + destructible
      for (const oz of [-15, 15]) {
        const p = mesh(ctx, new THREE.BoxGeometry(CELL + 20, 2.4, 15), M2.platform, cx, fy + 1.2, cz + oz, { cast: true });
        reg(W, p, cx, cz + oz, (CELL + 20) / 2, 7.5, fy + 2.4, 240);
        for (let i = -2; i <= 2; i++)            // platform pillars up to the street deck
          mesh(ctx, new THREE.CylinderGeometry(1.5, 1.7, D - 2, 8), M2.marble, cx + i * 22, fy + (D - 2) / 2 + 2.4, cz + oz, { cast: true });
      }
      // --- track bed + rails down the middle
      mesh(ctx, new THREE.BoxGeometry(CELL + 20, 0.6, 14), M2.dark, cx, fy + 0.3, cz);
      for (const oz of [-3.2, 3.2]) mesh(ctx, new THREE.BoxGeometry(CELL + 20, 0.7, 0.9), M2.steel, cx, fy + 0.9, cz + oz);
      // --- THE TRAIN: three cars stopped at the platform, each its own destructible block
      for (let i = 0; i < 3; i++) {
        const tx = cx - 34 + i * 34;
        const car = mesh(ctx, new THREE.BoxGeometry(31, 11, 11), M2.trainSide, tx, fy + 7.2, cz, { cast: true });
        mesh(ctx, new THREE.BoxGeometry(31.4, 2.6, 11.4), M2.trainTrim, tx, fy + 9.2, cz);
        reg(W, car, tx, cz, 15.5, 5.5, fy + 12.7, 300);
      }
    } else {
      // --- open-air halt: no train, a footbridge over the cut and a signal gantry
      for (const oz of [-15, 15]) {
        const p = mesh(ctx, new THREE.BoxGeometry(CELL + 20, 2.4, 15), M2.platform, cx, fy + 1.2, cz + oz, { cast: true });
        reg(W, p, cx, cz + oz, (CELL + 20) / 2, 7.5, fy + 2.4, 240);
      }
      mesh(ctx, new THREE.BoxGeometry(CELL + 20, 0.6, 14), M2.dark, cx, fy + 0.3, cz);
      for (const oz of [-3.2, 3.2]) mesh(ctx, new THREE.BoxGeometry(CELL + 20, 0.7, 0.9), M2.steel, cx, fy + 0.9, cz + oz);
      const br = mesh(ctx, new THREE.BoxGeometry(9, 1.4, 62), M2.deck, cx + 18, 1.6, cz, { cast: true });   // footbridge at street level
      reg(W, br, cx + 18, cz, 4.5, 31, 2.3, 150);
      mesh(ctx, new THREE.BoxGeometry(1.6, 22, 1.6), M2.steel, cx - 26, fy + 11, cz - 20, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(1.6, 1.6, 16), M2.steel, cx - 26, fy + 21, cz - 12);
    }
    // --- STAIR HEADHOUSES on the street: the way in, and the landmark that says METRO
    for (const [ex, ez] of [[cx - 36, cz - 34], [cx + 36, cz + 34]]) {
      mesh(ctx, new THREE.BoxGeometry(11, 7, 9), M2.stationTile, ex, 3.5, ez, { cast: true });
      door(ctx, ex + 8.4, ez, Math.PI / 2, 'turnstile');
      mesh(ctx, new THREE.BoxGeometry(12, 1, 10), M2.metroSign, ex, 7.4, ez, { cast: true });
      for (let s = 0; s < 7; s++)                 // the steps down into the cut
        mesh(ctx, new THREE.BoxGeometry(9, 1.9, 2.6), M2.platform, ex, -s * 1.9 + 0.5, ez + (ez > cz ? -1 : 1) * (5 + s * 2.6));
    }
  },
  // THE COUNTRY — Villages and Small Towns were being built as miniature cities. Farmland gives
  // the small places the rural character they actually have: open sightlines, low cover, long grass.
  // ---- THE LANDMARKS ---------------------------------------------------------------------------
  // Chosen per city by data/landmarks.js, named there too. These are the structures a city is
  // KNOWN for, so they are deliberately taller, stranger and more expensive than their neighbours —
  // if a landmark doesn't dominate its skyline it isn't doing its job.
  //
  // THE MONUMENT — the thing in the square everyone meets at. Four forms, and the REGION picks
  // which reads as native: an arch, a column, a stepped obelisk, a standing figure.
  monument(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world, R = ctx.region;
    disc(ctx, M2.plazaM, cx, cz, 40, 0.09, 34);
    for (const [ox, oz] of [[-30, -30], [30, -30], [-30, 30], [30, 30]]) ctx.treeSpots.push([cx + ox, cz + oz]);
    const stone = M2.marble;
    // the plinth is shared by every form — it is what makes it read as a monument, not a building
    const pl = mesh(ctx, new THREE.BoxGeometry(24, 5, 24), stone, cx, 2.5, cz, { cast: true });
    reg(W, pl, cx, cz, 12, 12, 5, 260);
    if (v === 0) {                       // A TRIUMPHAL ARCH — you can run through it
      const legW = 9, span = 34, h = 40;
      for (const s of [-1, 1]) {
        const lx = cx + s * (span / 2 - legW / 2);
        const leg = mesh(ctx, new THREE.BoxGeometry(legW, h, 16), stone, lx, 5 + h / 2, cz, { cast: true });
        reg(W, leg, lx, cz, legW / 2, 8, 5 + h, 420);
      }
      mesh(ctx, new THREE.BoxGeometry(span + 6, 12, 19), stone, cx, 5 + h + 6, cz, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(span + 10, 3, 22), M2.gold, cx, 5 + h + 13.5, cz, { cast: true });
    } else if (v === 1) {                // A COLUMN — a single vertical you can see across the city
      const h = 62;
      const col = mesh(ctx, new THREE.CylinderGeometry(4.4, 5.4, h, 14), stone, cx, 5 + h / 2, cz, { cast: true });
      reg(W, col, cx, cz, 5.4, 5.4, 5 + h, 380);
      mesh(ctx, new THREE.CylinderGeometry(7, 5, 5, 14), stone, cx, 5 + h + 2.5, cz, { cast: true });
      mesh(ctx, new THREE.SphereGeometry(4.4, 12, 10), M2.gold, cx, 5 + h + 8, cz, { cast: true });
    } else if (v === 2) {                // A STEPPED OBELISK
      let y = 5, s = 17;
      for (let i = 0; i < 4; i++) { const h = 13 - i * 1.6; mesh(ctx, new THREE.BoxGeometry(s, h, s), stone, cx, y + h / 2, cz, { cast: true }); y += h; s *= 0.72; }
      const sp = mesh(ctx, new THREE.CylinderGeometry(0.4, 3.4, 26, 4), R.dome > 0.2 ? M2.domeGold : stone, cx, y + 13, cz, { cast: true });
      reg(W, sp, cx, cz, 8, 8, y + 26, 340);
    } else {                             // A STANDING FIGURE on a tall plinth
      const h = 26;
      const p2 = mesh(ctx, new THREE.BoxGeometry(15, h, 15), stone, cx, 5 + h / 2, cz, { cast: true });
      reg(W, p2, cx, cz, 7.5, 7.5, 5 + h, 300);
      const y0 = 5 + h;
      mesh(ctx, new THREE.CylinderGeometry(2.6, 3.2, 15, 8), M2.bronze, cx, y0 + 7.5, cz, { cast: true });   // body
      mesh(ctx, new THREE.SphereGeometry(2.9, 10, 8), M2.bronze, cx, y0 + 17, cz, { cast: true });           // head
      const arm = mesh(ctx, new THREE.CylinderGeometry(1.1, 1.1, 13, 6), M2.bronze, cx + 3.4, y0 + 12, cz, { rz: -0.9, cast: true });
      arm.rotation.z = -0.9;
    }
  },
  // THE SPIRE — the tallest thing for miles. Deliberately far above the 150u tower ceiling, because
  // a landmark you can't see from the far side of the map is not a landmark.
  tower(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    const H = v === 0 ? 210 : v === 1 ? 250 : 180;
    disc(ctx, M2.plazaM, cx, cz, 34, 0.09, 30);
    if (v === 1) {                       // a LATTICE mast — four legs tapering to a spire
      const base = 26;
      for (let i = 0; i < 5; i++) {
        const t0 = i / 5, t1 = (i + 1) / 5;
        const s0 = base * (1 - t0 * 0.82), s1 = base * (1 - t1 * 0.82);
        const seg = mesh(ctx, new THREE.CylinderGeometry(s1 / 2, s0 / 2, H / 5, 4, 1, true), M2.steel, cx, H * t0 + H / 10, cz, { cast: true });
        seg.material = M2.steel;
      }
      const core = mesh(ctx, new THREE.BoxGeometry(9, H, 9), M2.steel, cx, H / 2, cz, { cast: true });
      reg(W, core, cx, cz, 13, 13, H, 900);
      mesh(ctx, new THREE.CylinderGeometry(0.6, 2.4, 40, 6), M2.steel, cx, H + 20, cz, { cast: true });
      mesh(ctx, new THREE.SphereGeometry(2.2, 8, 6), M2.beacon, cx, H + 42, cz);
    } else {                             // a CONCRETE shaft with an observation pod
      const rB = v === 0 ? 9 : 11;
      const shaft = mesh(ctx, new THREE.CylinderGeometry(rB * 0.55, rB, H, 14), M2.white, cx, H / 2, cz, { cast: true });
      reg(W, shaft, cx, cz, rB, rB, H, 950);
      const py = H * 0.78;
      mesh(ctx, new THREE.CylinderGeometry(rB * 2.4, rB * 1.6, 15, 16), W._winMats[0], cx, py, cz, { cast: true });
      mesh(ctx, new THREE.CylinderGeometry(rB * 2.5, rB * 2.5, 1.6, 16), M2.steelRoof, cx, py + 8.3, cz, { cast: true });
      door(ctx, cx, cz + rB + 0.6, 0, 'revolve');
      mesh(ctx, new THREE.CylinderGeometry(0.5, 2, 34, 6), M2.steel, cx, H + 17, cz, { cast: true });
      mesh(ctx, new THREE.SphereGeometry(2, 8, 6), M2.beacon, cx, H + 35, cz);
    }
  },
  // THE GREAT HOUSE — one slot, four forms. `cell.faith` comes from the architectural region, so
  // this builds a gothic cathedral in Oslo and a domed mosque in Kabul from the same placement row.
  cathedral(ctx, cx, cz, v, cell) {
    const M2 = ctx.mats, W = ctx.world;
    const faith = (cell && cell.faith) || 'cathedral';
    disc(ctx, M2.plazaM, cx, cz, 42, 0.09, 32);
    if (faith === 'mosque') {
      const hall = mesh(ctx, boxUV(50, 20, 50, M2.white), M2.white, cx, 10, cz, { cast: true });
      reg(W, hall, cx, cz, 25, 25, 20, 620);
      door(ctx, cx, cz + 25.6, 0, 'double');
      mesh(ctx, new THREE.SphereGeometry(21, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), M2.domeGold, cx, 20, cz, { cast: true });
      mesh(ctx, new THREE.SphereGeometry(3.4, 10, 8), M2.domeGold, cx, 43, cz, { cast: true });
      for (const [ox, oz] of [[-30, -30], [30, -30], [-30, 30], [30, 30]]) {      // four minarets
        const mn = mesh(ctx, new THREE.CylinderGeometry(2.6, 3.4, 58, 10), M2.white, cx + ox, 29, cz + oz, { cast: true });
        reg(W, mn, cx + ox, cz + oz, 3.4, 3.4, 58, 240);
        mesh(ctx, new THREE.ConeGeometry(4.2, 9, 10), M2.domeGold, cx + ox, 62, cz + oz, { cast: true });
      }
    } else if (faith === 'pagoda') {
      let y = 0, s = 42;
      for (let i = 0; i < 5; i++) {
        const h = 15 - i * 1.4;
        const t = mesh(ctx, boxUV(s, h, s, M2.stone), M2.stone, cx, y + h / 2, cz, { cast: true });
        if (i === 0) reg(W, t, cx, cz, s / 2, s / 2, h, 560);
        mesh(ctx, new THREE.BoxGeometry(s + 12, 2.6, s + 12), M2.terraRoof, cx, y + h + 1.3, cz, { cast: true });
        y += h + 2.6; s *= 0.82;
      }
      mesh(ctx, new THREE.CylinderGeometry(0.6, 1.6, 16, 6), M2.gold, cx, y + 8, cz, { cast: true });
      door(ctx, cx, cz + 21.6, 0, 'double');
    } else if (faith === 'temple') {
      const base = mesh(ctx, boxUV(52, 14, 52, M2.stone), M2.stone, cx, 7, cz, { cast: true });
      reg(W, base, cx, cz, 26, 26, 14, 600);
      door(ctx, cx, cz + 26.6, 0, 'double');
      let y = 14, s = 30;
      for (let i = 0; i < 6; i++) { const h = 9 - i * 0.9; mesh(ctx, new THREE.CylinderGeometry(s * 0.42, s * 0.5, h, 8), M2.stone, cx, y + h / 2, cz, { cast: true }); y += h; s *= 0.86; }
      mesh(ctx, new THREE.SphereGeometry(4, 10, 8), M2.gold, cx, y + 4, cz, { cast: true });
    } else {                             // a GOTHIC cathedral: nave, transept, two west towers
      const nave = mesh(ctx, boxUV(30, 30, 62, M2.stone), M2.stone, cx, 15, cz, { cast: true });
      reg(W, nave, cx, cz, 15, 31, 30, 640);
      door(ctx, cx, cz - 31.6, Math.PI, 'double');
      mesh(ctx, new THREE.BoxGeometry(58, 26, 22), M2.stone, cx, 13, cz + 4, { cast: true });          // transept
      const roof = mesh(ctx, new THREE.CylinderGeometry(16, 16, 62, 3, 1, false, 0, Math.PI), M2.slate, cx, 30, cz, { cast: true });
      roof.rotation.z = -Math.PI / 2; roof.rotation.y = Math.PI / 2;
      for (const s of [-1, 1]) {
        const tx = cx + s * 11, tz = cz - 34;
        const tw = mesh(ctx, boxUV(15, 66, 15, M2.stone), M2.stone, tx, 33, tz, { cast: true });
        reg(W, tw, tx, tz, 7.5, 7.5, 66, 380);
        mesh(ctx, new THREE.ConeGeometry(11, 26, 4), M2.slate, tx, 79, tz, { cast: true });
      }
      mesh(ctx, new THREE.CylinderGeometry(9, 9, 1.4, 16), M2.gold, cx, 24, cz - 30.5, { rx: Math.PI / 2, cast: true });  // rose window
    }
  },
  // THE PALACE — a long colonnaded front, wings, a court and a formal garden. 1×2, so it reads as
  // a compound rather than a block.
  palace(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    const HW = ctx.W / 2 - 10, HD = ctx.D / 2 - 10;
    disc(ctx, M2.plazaM, cx, cz + HD * 0.5, HW * 0.9, 0.09, 30);
    const main = mesh(ctx, boxUV(HW * 1.3, 30, 34, M2.marble), M2.marble, cx, 15, cz - HD * 0.25, { cast: true });
    reg(W, main, cx, cz - HD * 0.25, HW * 0.65, 17, 30, 700);
    mesh(ctx, new THREE.BoxGeometry(HW * 1.34, 3, 38), M2.paleRoof, cx, 31.5, cz - HD * 0.25);
    for (const s of [-1, 1]) {                        // the wings, reaching forward to make a court
      const wx = cx + s * HW * 0.58;
      const wing = mesh(ctx, boxUV(24, 24, HD * 0.9, M2.marble), M2.marble, wx, 12, cz + HD * 0.15, { cast: true });
      reg(W, wing, wx, cz + HD * 0.15, 12, HD * 0.45, 24, 420);
    }
    for (let i = -5; i <= 5; i++)                     // the colonnade
      mesh(ctx, new THREE.CylinderGeometry(2.2, 2.4, 26, 10), M2.marble, cx + i * (HW * 0.2), 13, cz - HD * 0.25 + 19, { cast: true });
    mesh(ctx, new THREE.BoxGeometry(HW * 0.5, 3.4, 4), M2.marble, cx, 27, cz - HD * 0.25 + 19, { cast: true });
    door(ctx, cx, cz - HD * 0.25 + 17.6, 0, 'double');
    if (v === 1) mesh(ctx, new THREE.SphereGeometry(15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M2.domeGold, cx, 31, cz - HD * 0.25, { cast: true });
    for (const s of [-1, 1]) flagpole(ctx, cx + s * HW * 0.3, cz + HD * 0.45, 30);
    disc(ctx, M2.lawnM, cx, cz + HD * 0.62, HW * 0.55, 0.1, 26);
  },
  // THE CITADEL — the old fortress the city grew around. Ramparts you can stand on, corner towers,
  // a gate, and a keep. This is the one landmark that is mostly WALLS, so it fights differently.
  fortress(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    const HW = ctx.W / 2 - 12, HD = ctx.D / 2 - 12, H = 26;
    const wall = (x, z, w, d) => {
      const m = mesh(ctx, boxUV(w, H, d, M2.stone), M2.stone, x, H / 2, z, { cast: true });
      reg(W, m, x, z, w / 2, d / 2, H, 520);
    };
    wall(cx, cz - HD, HW * 2, 9);
    wall(cx, cz + HD, HW * 2, 9);
    wall(cx - HW, cz, 9, HD * 2);
    wall(cx + HW, cz, 9, HD * 2);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {         // corner drum towers
      const tx = cx + sx * HW, tz = cz + sz * HD;
      const t = mesh(ctx, new THREE.CylinderGeometry(13, 14, H + 12, 12), M2.stone, tx, (H + 12) / 2, tz, { cast: true });
      reg(W, t, tx, tz, 13, 13, H + 12, 460);
      mesh(ctx, new THREE.ConeGeometry(15, 12, 12), M2.slate, tx, H + 18, tz, { cast: true });
    }
    // the gate — a real opening you fight through
    mesh(ctx, new THREE.BoxGeometry(18, 15, 11), M2.dark, cx, 7.5, cz + HD);
    door(ctx, cx, cz + HD + 6, 0, 'roller');
    const keep = mesh(ctx, boxUV(38, 52, 38, M2.stone), M2.stone, cx, 26, cz - HD * 0.15, { cast: true });
    reg(W, keep, cx, cz - HD * 0.15, 19, 19, 52, 780);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      mesh(ctx, new THREE.BoxGeometry(9, 62, 9), M2.stone, cx + sx * 17, 31, cz - HD * 0.15 + sz * 17, { cast: true });
    flagpole(ctx, cx, cz - HD * 0.15, 74);
    disc(ctx, M2.dirtYard, cx, cz + HD * 0.3, HW * 0.7, 0.1, 24);
  },
  // THE COLLEGE — a quadrangle you can run the cloister of, a domed library, a bell tower.
  university(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    const HW = ctx.W / 2 - 12, HD = ctx.D / 2 - 12;
    disc(ctx, M2.lawnM, cx, cz, Math.min(HW, HD) * 0.62, 0.1, 30);
    const range = (x, z, w, d, h) => {
      const m = mesh(ctx, boxUV(w, h, d, W._winMats[2]), W._winMats[2], x, h / 2, z, { cast: true });
      reg(W, m, x, z, w / 2, d / 2, h, 380);
      mesh(ctx, new THREE.BoxGeometry(w + 3, 2.4, d + 3), M2.slate, x, h + 1.2, z);
    };
    range(cx, cz - HD * 0.8, HW * 1.6, 22, 26);
    door(ctx, cx, cz - HD * 0.8 + 11.6, 0, 'double');
    range(cx, cz + HD * 0.8, HW * 1.6, 22, 22);
    door(ctx, cx, cz + HD * 0.8 - 11.6, Math.PI, 'double');
    range(cx - HW * 0.85, cz, 20, HD * 1.3, 24);
    range(cx + HW * 0.85, cz, 20, HD * 1.3, 24);
    // the library: a rotunda with a dome — the one piece that says "this is not an office block"
    const lx = cx + HW * 0.35, lz = cz - HD * 0.15;
    const lib = mesh(ctx, new THREE.CylinderGeometry(17, 18, 30, 16), M2.marble, lx, 15, lz, { cast: true });
    reg(W, lib, lx, lz, 17, 17, 30, 480);
    mesh(ctx, new THREE.SphereGeometry(17, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M2.paleRoof, lx, 30, lz, { cast: true });
    door(ctx, lx, lz + 18.4, 0, 'double');
    const bx = cx - HW * 0.5, bz = cz + HD * 0.2;                          // the bell tower
    const bt = mesh(ctx, boxUV(14, 58, 14, M2.stone), M2.stone, bx, 29, bz, { cast: true });
    reg(W, bt, bx, bz, 7, 7, 58, 340);
    mesh(ctx, new THREE.BoxGeometry(17, 4, 17), M2.stone, bx, 59, bz, { cast: true });
    mesh(ctx, new THREE.ConeGeometry(11, 14, 4), M2.slate, bx, 68, bz, { cast: true });
    for (let i = 0; i < 6; i++) ctx.treeSpots.push([cx - 20 + (i % 3) * 20, cz - 12 + ((i / 3) | 0) * 24]);
  },

  // ---- THE WILD ---------------------------------------------------------------------------------
  // THE WOODS. A forest is not a park with more trees: a park is open ground you can see across,
  // a forest is a place where SIGHTLINES DIE. Cover here is soft and everywhere (trunks), the
  // hard cover is rare (boulders, fallen giants), and the only fast ground is the path — which
  // curves, so you never see far down it. `v` sets how thick it is: woodland, deep forest, jungle.
  forest(ctx, cx, cz, v, cell) {
    const M2 = ctx.mats, W = ctx.world, rng = ctx.rng;
    const HW = ctx.W / 2 - 2, HD = ctx.D / 2 - 2;
    const jungle = v === 2;
    slab(ctx, jungle ? M2.jungleFloor : M2.forestFloor, cx, cz, HW * 2, HD * 2, 0.07);
    // THE PATH — a meander, not a line. Three control points wobbled off the axis and walked with
    // short quads, so it reads as a trail worn by feet rather than a road that happens to be brown.
    const along = (cell && cell.face === 'e') || (cell && cell.face === 'w') || rng() < 0.5;
    const amp = HW * 0.42, segs = 14;
    const pathPts = [];
    const ph = rng() * 6.28, wob = 0.7 + rng() * 0.9;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, u = -1 + t * 2;
      const off = Math.sin(ph + t * 3.1 * wob) * amp * (0.35 + 0.65 * Math.sin(t * Math.PI));
      pathPts.push(along ? [cx + u * HW, cz + off] : [cx + off, cz + u * HD]);
    }
    for (let i = 0; i < pathPts.length - 1; i++) {
      const [x0, z0] = pathPts[i], [x1, z1] = pathPts[i + 1];
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
      const q = mesh(ctx, new THREE.PlaneGeometry(len + 2.2, 7.5), M2.trail, (x0 + x1) / 2, 0.1, (z0 + z1) / 2, { recv: false });
      q.rotation.x = -Math.PI / 2; q.rotation.z = -Math.atan2(dz, dx);
    }
    // trees everywhere EXCEPT on the trail — a forest you cannot walk through is a wall
    const near = (x, z) => { for (const [px, pz] of pathPts) if ((x - px) ** 2 + (z - pz) ** 2 < 150) return true; return false; };
    const n = jungle ? 46 : v === 1 ? 34 : 22;
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() * 2 - 1) * HW * 0.94, z = cz + (rng() * 2 - 1) * HD * 0.94;
      if (near(x, z)) continue;
      ctx.treeSpots.push([x, z]);
    }
    // the hard cover: boulders, and fallen giants you vault or shelter behind
    const rocks = jungle ? 2 : 4;
    for (let i = 0; i < rocks; i++) {
      const x = cx + (rng() * 2 - 1) * HW * 0.8, z = cz + (rng() * 2 - 1) * HD * 0.8;
      if (near(x, z)) continue;
      const s = 5 + rng() * 6;
      const b = mesh(ctx, new THREE.DodecahedronGeometry(s, 0), M2.rock, x, s * 0.62, z, { cast: true });
      b.rotation.set(rng(), rng(), rng());
      reg(W, b, x, z, s * 0.85, s * 0.85, s * 1.2, 200);
    }
    for (let i = 0; i < 2; i++) {
      const x = cx + (rng() * 2 - 1) * HW * 0.7, z = cz + (rng() * 2 - 1) * HD * 0.7;
      if (near(x, z)) continue;
      const L = 26 + rng() * 16, a = rng() * 3.14;
      const log = mesh(ctx, new THREE.CylinderGeometry(2.6, 3.2, L, 8), M2.palmT, x, 2.9, z, { rz: Math.PI / 2, ry: a, cast: true });
      log.rotation.set(0, a, Math.PI / 2);
      reg(W, log, x, z, L * 0.4, 3.2, 5.5, 90);
    }
    if (jungle) for (let i = 0; i < 10; i++) {                       // undergrowth: waist-high, blocks nothing but hides feet
      const x = cx + (rng() * 2 - 1) * HW * 0.9, z = cz + (rng() * 2 - 1) * HD * 0.9;
      if (near(x, z)) continue;
      const f = mesh(ctx, new THREE.IcosahedronGeometry(5 + rng() * 3, 0), M2.fern, x, 2.4, z);
      f.scale.set(1, 0.42, 1);
    }
  },
  // THE HEIGHTS. Rock, scree and a switchback trail. The tile does not raise the land itself —
  // `plan.relief` does that globally — but it is where the land is left UNPADDED, so this is the
  // only ground in a city that is genuinely uneven under your feet.
  mountain(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world, rng = ctx.rng;
    const HW = ctx.W / 2 - 2, HD = ctx.D / 2 - 2;
    slab(ctx, M2.scree, cx, cz, HW * 2, HD * 2, 0.07);
    // outcrops — big enough to break a beam, irregular enough not to read as boxes
    const n = v === 0 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() * 2 - 1) * HW * 0.82, z = cz + (rng() * 2 - 1) * HD * 0.82;
      const s = 11 + rng() * 16;
      const b = mesh(ctx, new THREE.DodecahedronGeometry(s, 0), M2.rock, x, s * 0.5, z, { cast: true });
      b.rotation.set(rng() * 0.4, rng() * 3, rng() * 0.4);
      b.scale.set(1, 0.7 + rng() * 0.6, 1);
      reg(W, b, x, z, s * 0.8, s * 0.8, s * 1.1, 300);
    }
    for (let i = 0; i < 14; i++) {                                   // scree: small stuff underfoot
      const x = cx + (rng() * 2 - 1) * HW, z = cz + (rng() * 2 - 1) * HD, s = 1.6 + rng() * 2.6;
      const r2 = mesh(ctx, new THREE.DodecahedronGeometry(s, 0), M2.rock, x, s * 0.5, z);
      r2.rotation.set(rng(), rng(), rng());
    }
    if (v === 1) for (let i = 0; i < 6; i++)                         // a stand of hardy pines
      ctx.treeSpots.push([cx + (rng() * 2 - 1) * HW * 0.7, cz + (rng() * 2 - 1) * HD * 0.7]);
  },

  // ---- THE COUNTRYSIDE ------------------------------------------------------------------------
  // The country is not a city with fewer buildings — it is a DIFFERENT FIGHT: open sightlines, low
  // cover you vault rather than hide behind, and long runs of nothing. Everything here is built to
  // read from the air, because that is how you will usually see it.
  // ⚠ Fields are UNLIT decals (MeshBasic), like the lawns. Written as lit materials they came out
  // near-black and the whole village looked like holes cut in the ground.
  farmland(ctx, cx, cz, v, cell) {
    const M2 = ctx.mats, W = ctx.world, rng = ctx.rng, R = ctx.region;
    const HW = ctx.W / 2 - 4, HD = ctx.D / 2 - 4;
    // --- the fields: strips, not squares. Real farmland is ploughed in long runs, and the stripes
    // are what makes the countryside legible from altitude instead of a flat green nothing.
    const strips = 3 + ((rng() * 3) | 0), along = rng() < 0.5;
    const crops = [M2.cropA, M2.cropB, M2.cropC, M2.fallow];
    for (let i = 0; i < strips; i++) {
      const t = (i + 0.5) / strips, m = crops[(rng() * crops.length) | 0];
      if (along) slab(ctx, m, cx, cz - HD + t * HD * 2, HW * 2, (HD * 2) / strips - 1.2, 0.07);
      else slab(ctx, m, cx - HW + t * HW * 2, cz, (HW * 2) / strips - 1.2, HD * 2, 0.07);
      // furrows — a few darker lines per strip so a field has grain at ground level too
      for (let f = 1; f < 4; f++) {
        const u = (f / 4 - 0.5) * ((HD * 2) / strips - 1.2);
        if (along) slab(ctx, M2.furrow, cx, cz - HD + t * HD * 2 + u, HW * 2, 0.9, 0.08);
        else slab(ctx, M2.furrow, cx - HW + t * HW * 2 + u, cz, 0.9, HD * 2, 0.08);
      }
    }
    // --- HEDGEROWS: the field boundary, and the countryside's only chest-high cover. Sockets tell
    // us which sides face open country, so a hedge never runs down the middle of the village road.
    const hedge = (x, z, w, d) => {
      const m = mesh(ctx, new THREE.BoxGeometry(w, 6, d), M2.hedge, x, 3, z, { cast: true });
      reg(W, m, x, z, w / 2, d / 2, 6, 60);
    };
    // ⚠ guard the sockets. A builder must never assume they exist — a hand-authored or imported
    // plan can hand you bare cells, and a tile that throws takes the whole city build with it.
    if (cell && cell.edge && cell.nb) perimeter(cell, (side) => {
      if (cell.edge[side] === 'water') return;
      const o = HW - 3;
      if (side === 'n') hedge(cx, cz - o, HW * 1.7, 3.4);
      else if (side === 's') hedge(cx, cz + o, HW * 1.7, 3.4);
      else if (side === 'w') hedge(cx - o, cz, 3.4, HD * 1.7);
      else hedge(cx + o, cz, 3.4, HD * 1.7);
    });
    if (v === 0) {          // THE HOMESTEAD — barn, silo, farmhouse, yard
      const bx = cx - 22, bz = cz - 20;
      const barn = mesh(ctx, boxUV(26, 16, 18), M2.barn, bx, 8, bz, { cast: true });
      reg(W, barn, bx, bz, 13, 9, 16, 190);
      const roof = mesh(ctx, new THREE.CylinderGeometry(10, 10, 18, 3, 1, false, 0, Math.PI), M2.barnRoof, bx, 16, bz, { cast: true });
      roof.rotation.z = -Math.PI / 2; roof.rotation.y = Math.PI / 2;
      mesh(ctx, new THREE.BoxGeometry(9, 11, 0.6), M2.dark, bx, 5.5, bz + 9.2);            // the barn door
      const silo = mesh(ctx, new THREE.CylinderGeometry(6, 6, 34, 12), M2.silo, cx + 4, 17, cz - 24, { cast: true });
      reg(W, silo, cx + 4, cz - 24, 6, 6, 34, 200);
      mesh(ctx, new THREE.ConeGeometry(6.6, 7, 12), M2.steelRoof, cx + 4, 37.5, cz - 24, { cast: true });
      tower(ctx, cx + 28, cz + 24, 17, 12, 15, W._winMats[2], M2.terraRoof);
      door(ctx, cx + 28, cz + 32.1, 0, 'swing');
      slab(ctx, M2.dirtYard, cx - 6, cz - 20, 46, 30, 0.1);                                 // the packed yard
      tractor(ctx, cx + 12, cz - 6, rng() * 6);
      for (let i = 0; i < 5; i++) mesh(ctx, new THREE.CylinderGeometry(3, 3, 4.4, 10), M2.hay, cx - 34 + i * 8, 2.2, cz + 30, { rz: Math.PI / 2, cast: true });
    } else if (v === 1) {   // THE ORCHARD — trees in rows are the cover, plus a windpump landmark
      const rows = 4, per = 5;
      for (let i = 0; i < rows * per; i++) ctx.treeSpots.push([cx - 32 + (i % per) * 16, cz - 28 + ((i / per) | 0) * 18]);
      const wx = cx + 34, wz = cz - 30;
      for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) mesh(ctx, new THREE.BoxGeometry(0.9, 30, 0.9), M2.steel, wx + ox * (1 - 0.5), 15, wz + oz * (1 - 0.5), { cast: true });
      const hub = mesh(ctx, new THREE.CylinderGeometry(1.2, 1.2, 1.6, 8), M2.steel, wx, 31, wz, { rz: Math.PI / 2, cast: true });
      for (let i = 0; i < 8; i++) {                                                          // the wind pump fan
        const b = mesh(ctx, new THREE.PlaneGeometry(2.2, 7), M2.white, wx, 31, wz, { recv: false });
        b.material.side = THREE.DoubleSide; b.rotation.z = (i / 8) * Math.PI * 2; b.translateY(4.6);
      }
      const shed = mesh(ctx, boxUV(15, 8, 12), M2.barn, cx - 26, 4, cz + 22, { cast: true });
      reg(W, shed, cx - 26, cz + 22, 7.5, 6, 8, 120);
    } else {                // GRAZING LAND — dry stone walls you vault, a trough, scattered oaks
      const wall = (x, z, w, d, hp) => { const m = mesh(ctx, new THREE.BoxGeometry(w, 5.5, d), M2.stoneWall, x, 2.75, z, { cast: true }); reg(W, m, x, z, w / 2, d / 2, 5.5, hp); };
      wall(cx, cz - 18, 70, 2.4, 90);
      wall(cx + 26, cz + 14, 2.4, 54, 80);
      wall(cx - 30, cz + 26, 34, 2.4, 60);
      const tr = mesh(ctx, new THREE.BoxGeometry(12, 3, 4), M2.stoneWall, cx - 6, 1.5, cz + 6, { cast: true });   // water trough
      mesh(ctx, new THREE.BoxGeometry(11, 0.4, 3.2), M2.pondM, cx - 6, 2.9, cz + 6, { recv: false });
      for (let i = 0; i < 6; i++) ctx.treeSpots.push([cx - 34 + rng() * 68, cz + 8 + rng() * 32]);
    }
  },
  plaza(ctx, cx, cz, v) {
    const M2 = ctx.mats, rng = ctx.rng;
    disc(ctx, M2.plazaM, cx, cz, 34, 0.08, 30);
    if (v === 0) { mesh(ctx, new THREE.CylinderGeometry(1, 3, 30, 4), M2.marble, cx, 15, cz, { cast: true }); }
    else for (let i = 0; i < 3; i++) {
      mesh(ctx, new THREE.BoxGeometry(6, 3, 4), M2.wood, cx - 14 + i * 14, 1.5, cz + 10 + (rng() - 0.5) * 8, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(7, 0.8, 5), M2.red, cx - 14 + i * 14, 3.4, cz + 10 + (rng() - 0.5) * 8, { cast: true });
    }
  },
};

// Build every cell of a generated plan into `group`. Returns { treeSpots } for the tree system.
export function buildTiles(world, group, plan, rng) {
  const region = plan.region || regionOf(plan.culture);
  const M2 = mats(world, region);
  // the facades are cached once at boot (they carry baked textures) — the REGION drives their
  // colour multiply, so a Middle Eastern city warms up without rebuilding a single canvas
  if (world._winMats) {
    const wt = [0.85, 0.9, 0.8, 0.25, 0.0];               // industrial/military keep their identity
    for (let i = 0; i < world._winMats.length; i++) {
      const m = world._winMats[i];
      m.userData._baseCol = m.userData._baseCol || m.color.clone();
      m.color.copy(m.userData._baseCol).lerp(new THREE.Color(region.wall), wt[i] ?? 0.3);
    }
  }
  const A = plan.arena, cellSize = plan.cell || CELL, S = cellSize / CELL;
  const M = ((plan.metric && plan.metric.humanH) || 9.6) / 9.6;
  CUR_M = M;                                             // boxUV/tower read it for the window bay
  const ctx = { world, g: group, rng, mats: M2, region, treeSpots: [], plan, M,
                W: CELL, D: CELL, fw: 1, fh: 1, S, cell: cellSize, cx: 0, cz: 0, gy: 0 };
  world._pendingCuts = world._pendingCuts || []; world._pendingPits = world._pendingPits || [];
  for (let r = 0; r < plan.N; r++) for (let c = 0; c < plan.N; c++) {
    const cell = plan.cells[r][c];
    // ⚠ a `ref` cell is COVERED by a multi-cell structure — its anchor already built it. Building
    // it again is how you get three stadiums stacked inside one stadium.
    if (!cell || cell.t === 'water' || cell.ref) continue;
    const fw = cell.fw || 1, fh = cell.fh || 1;
    ctx.fw = fw; ctx.fh = fh;
    ctx.W = fw * CELL; ctx.D = fh * CELL;                                  // BASE units — helpers scale
    ctx.cx = -A + (c + fw / 2) * cellSize; ctx.cz = -A + (r + fh / 2) * cellSize;
    ctx.gy = world.heightAt ? world.heightAt(ctx.cx, ctx.cz) : 0;   // the terrace this block sits on
    const builder = T[cell.t];
    if (!builder) continue;
    ctx._tile = cell.t;
    ctx.maxH = TILE_MAX_H[cell.t] ?? Infinity;
    // the three things builders push as raw world coordinates have to be scaled too — snapshot the
    // lengths, run the tile, then convert whatever it appended
    const t0 = ctx.treeSpots.length, k0 = world._pendingCuts.length, p0 = world._pendingPits.length;
    builder(ctx, ctx.cx, ctx.cz, cell.v || 0, cell);   // cell carries r/c, neighbours, sockets, frontage
    if (S !== 1) {
      for (let i = t0; i < ctx.treeSpots.length; i++) { const t = ctx.treeSpots[i]; t[0] = sx(ctx, t[0]); t[1] = sz(ctx, t[1]); }
      for (let i = k0; i < world._pendingCuts.length; i++) { const k = world._pendingCuts[i]; k[0] = sx(ctx, k[0]); k[1] = sz(ctx, k[1]); k[2] *= S; k[3] *= S; k[4] *= S; }
      for (let i = p0; i < world._pendingPits.length; i++) { const p = world._pendingPits[i]; p[0] = sx(ctx, p[0]); p[1] = sz(ctx, p[1]); p[2] *= S; p[3] *= S; }
    }
  }
  return { treeSpots: ctx.treeSpots };
}
