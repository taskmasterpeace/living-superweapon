// THRESHOLD — the TILE LIBRARY. One builder per city-type, 2–3 variants each, all sized to the
// 96u sectional cell the White City proved out (buildings inset so every cell keeps its street
// ring). world.rebuildCity() calls buildTiles() for generated cities; the flagship keeps its
// bespoke hand-tuned builder. Big structures register as COVER (destructible, crack overlays,
// fog boxes, collision); flavor props are decor the fights smash through visually.
// House rules apply: NO purple anywhere, warm-neutral + gold, per-district accent temperature.
import * as THREE from 'three';
import { CELL } from '../data/cityplan.js';

// one window bay ≈ 17 units (a real ~3.2m floor at hero scale) — facades stay true on any box
function scaleBoxUV(geo, w, h, d) {
  const uv = geo.attributes.uv, B = 17, R = 16;
  const f = [[d / B, h / B], [d / B, h / B], [w / R, d / R], [w / R, d / R], [w / B, h / B], [w / B, h / B]];
  for (let fi = 0; fi < 6; fi++) for (let v = 0; v < 4; v++) { const i = fi * 4 + v; uv.setXY(i, uv.getX(i) * f[fi][0], uv.getY(i) * f[fi][1]); }
  uv.needsUpdate = true;
}

function mats(world) {
  if (world._tileMats) return world._tileMats;
  const S = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.85, metalness: o.m ?? 0.05, ...(o.fs ? { flatShading: true } : {}), ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 0.4 } : {}) });
  const B = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o.o ?? 0.85, depthWrite: false });
  world._tileMats = {
    stone: S('#cfc8b6'), white: S('#e8e2d4', { r: 0.7 }), marble: S('#efe9dc', { r: 0.55 }),
    terraRoof: S('#a85c3e', { r: 0.92 }), paleRoof: S('#b9b2a0'), steelRoof: S('#5f666c', { r: 0.75, m: 0.35 }), oliveRoof: S('#5c6044'),
    steel: S('#8f979c', { r: 0.6, m: 0.5 }), rust: S('#8a5a3a', { r: 0.95 }), dark: S('#22252c', { r: 0.7, m: 0.3 }),
    olive: S('#6b6f52'), fence: S('#55583f', { r: 0.8, m: 0.3 }),
    gold: S('#c9a227', { r: 0.55, m: 0.4 }), domeGold: S('#d8b24a', { r: 0.4, m: 0.6, e: '#7a5a10', ei: 0.25 }),
    wood: S('#7a5a3a', { r: 0.95 }), deck: S('#c9b89a', { r: 0.9 }),
    sandM: B('#d8c090', { o: 0.9 }), poolM: B('#5ad0e8', { o: 0.9 }), plazaM: B('#e0d8c4', { o: 0.55 }),
    lawnM: B('#4a683a', { o: 0.8 }), pondM: B('#4a90b8', { o: 0.85 }),
    palmT: S('#8a6a42', { r: 0.95, fs: true }), palmF: S('#3a7a3a', { r: 0.9, fs: true }),
    canvas: S('#e8e2d4', { r: 0.95 }), red: S('#a8362e', { r: 0.8 }),
    containers: ['#8a2a24', '#2a4a6a', '#3a6a4a', '#c9762a', '#5a5a64'].map(c => S(c, { r: 0.6, m: 0.3 })),
  };
  return world._tileMats;
}

// ---------- shared builders ----------
function mesh(ctx, geo, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = !!o.cast; m.receiveShadow = o.recv !== false;
  ctx.g.add(m); return m;
}
// a structural, destructible building with a windowed facade + roof slab + crack overlay
function tower(ctx, x, z, w, h, d, winMat, roofMat, o = {}) {
  const world = ctx.world;
  const geo = new THREE.BoxGeometry(w, h, d); scaleBoxUV(geo, w, h, d);
  const m = new THREE.Mesh(geo, winMat);
  m.position.set(x, h / 2, z); m.castShadow = h >= 44; m.receiveShadow = true;
  ctx.g.add(m);
  if (roofMat) { const roof = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roofMat); roof.rotation.x = -Math.PI / 2; roof.position.y = h / 2 + 0.05; roof.receiveShadow = true; m.add(roof); }
  const crack = new THREE.Mesh(new THREE.BoxGeometry(w * 1.015, h * 1.006, d * 1.015), new THREE.MeshBasicMaterial({ map: world._crackTex, transparent: true, opacity: 0, depthWrite: false }));
  crack.position.copy(m.position); crack.visible = false; ctx.g.add(crack);
  const hp = Math.round(70 + w * h * d * 0.0075);
  const co = { mesh: m, crack, x, z, r: Math.max(w, d) * 0.6, h, hx: w / 2, hz: d / 2, top: h, hp, maxHp: hp, y0: h / 2, w, d, destroyed: false };
  world.cover.push(co); world.coverAll.push(co);
  return m;
}
const disc = (ctx, mat, x, z, r, y = 0.1, seg = 26) => { const p = mesh(ctx, new THREE.CircleGeometry(r, seg), mat, x, y, z, { recv: false }); p.rotation.x = -Math.PI / 2; return p; };
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

// ---------- the tiles ----------
const T = {
  residential(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[2], R = ctx.mats.terraRoof, rng = ctx.rng;
    if (v === 0) {          // four low homes around a shared yard (1-1.5 stories)
      for (const [ox, oz] of [[-19, -19], [19, -19], [-19, 19], [19, 19]])
        tower(ctx, cx + ox + (rng() - 0.5) * 4, cz + oz + (rng() - 0.5) * 4, 26, 16 + rng() * 8, 26, wm, R);
      disc(ctx, ctx.mats.lawnM, cx, cz, 12, 0.1);
      ctx.treeSpots.push([cx + (rng() - 0.5) * 10, cz + (rng() - 0.5) * 10]);
    } else if (v === 1) {   // an L-block with a private court
      tower(ctx, cx - 10, cz - 14, 48, 21, 24, wm, R);
      tower(ctx, cx - 22, cz + 12, 24, 25, 30, wm, R);
      disc(ctx, ctx.mats.lawnM, cx + 14, cz + 14, 13, 0.1);
      ctx.treeSpots.push([cx + 14, cz + 14], [cx + 22, cz + 4]);
    } else {                // towers-in-the-park (4-story walk-ups)
      tower(ctx, cx - 14, cz - 8, 22, 70, 22, wm, ctx.mats.paleRoof);
      tower(ctx, cx + 15, cz + 10, 22, 58, 22, wm, ctx.mats.paleRoof);
      disc(ctx, ctx.mats.lawnM, cx, cz, 26, 0.09);
      ctx.treeSpots.push([cx - 2, cz + 20], [cx + 18, cz - 16], [cx - 24, cz + 12]);
    }
  },
  commercial(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[v % 2], R = ctx.mats.paleRoof, rng = ctx.rng;
    if (v === 0) { tower(ctx, cx - 15, cz - 10, 30, 96 + rng() * 26, 30, wm, R); tower(ctx, cx + 17, cz + 12, 26, 64 + rng() * 20, 26, wm, R); }
    else if (v === 1) { const p = tower(ctx, cx, cz, 52, 18, 40, wm, R); tower(ctx, cx - 6, cz - 2, 24, 112, 24, wm, R); p.castShadow = false; }
    else tower(ctx, cx, cz, 30, 118 + rng() * 22, 44, wm, R);
  },
  company(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[0], M2 = ctx.mats;
    if (v === 0) {          // the HQ: one glass monolith + logo pylon + parking field
      tower(ctx, cx - 6, cz, 30, 150, 30, wm, M2.steelRoof);
      mesh(ctx, new THREE.BoxGeometry(2.6, 30, 2.6), M2.steel, cx + 26, 15, cz - 26, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(13, 6.5, 1), M2.gold, cx + 26, 33, cz - 26, { cast: true });
      disc(ctx, M2.plazaM, cx + 18, cz + 20, 15, 0.09);
    } else {                // twin towers with a skybridge
      tower(ctx, cx - 17, cz, 24, 104, 26, wm, M2.steelRoof);
      tower(ctx, cx + 17, cz, 24, 122, 26, wm, M2.steelRoof);
      mesh(ctx, new THREE.BoxGeometry(14, 5, 9), M2.steel, cx, 78, cz, { cast: true });
    }
  },
  industrial(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[3], M2 = ctx.mats, rng = ctx.rng;
    if (v === 0) {          // warehouse rows (real ~4m sheds) + container spill
      tower(ctx, cx - 15, cz - 12, 26, 20, 52, wm, M2.steelRoof);
      tower(ctx, cx + 16, cz + 6, 26, 24, 44, wm, M2.steelRoof);
      for (let i = 0; i < 4; i++) mesh(ctx, new THREE.BoxGeometry(11, 4.4, 4.6), M2.containers[(rng() * 5) | 0], cx + 8 + (rng() - 0.5) * 16, 2.2, cz - 28, { cast: true });
    } else if (v === 1) {   // tank farm + stacks
      tower(ctx, cx + 12, cz + 12, 34, 24, 34, wm, M2.steelRoof);
      for (const [ox, oz, r] of [[-20, -14, 7], [-6, -22, 6], [-24, 2, 6]])
        mesh(ctx, new THREE.CylinderGeometry(r, r, 18, 12), M2.steel, cx + ox, 9, cz + oz, { cast: true });
      mesh(ctx, new THREE.CylinderGeometry(1.6, 2.2, 46, 8), M2.rust, cx - 2, 23, cz + 4, { cast: true });
      mesh(ctx, new THREE.CylinderGeometry(1.3, 1.7, 38, 8), M2.rust, cx + 4, 19, cz - 2, { cast: true });
    } else {                // the works: factory + conveyor ramp
      tower(ctx, cx - 6, cz - 6, 44, 26, 34, wm, M2.steelRoof);
      const ramp = mesh(ctx, new THREE.BoxGeometry(34, 1.6, 5), M2.steel, cx + 16, 12, cz + 22, { cast: true });
      ramp.rotation.z = -0.32;
      mesh(ctx, new THREE.BoxGeometry(10, 12, 10), M2.rust, cx + 32, 6, cz + 22, { cast: true });
    }
  },
  military(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[4], M2 = ctx.mats;
    const H = CELL / 2 - 8;
    for (const [w2, d2, ox, oz] of [[H * 2, 1, 0, -H], [H * 2, 1, 0, H], [1, H * 2, -H, 0], [1, H * 2, H, 0]])
      mesh(ctx, new THREE.BoxGeometry(w2, 6, d2), M2.fence, cx + ox, 3, cz + oz);
    if (v === 0) {          // bunkers + watchtower + pad
      tower(ctx, cx - 12, cz - 10, 34, 15, 28, wm, ctx.mats.oliveRoof);
      tower(ctx, cx + 16, cz + 14, 26, 12, 22, wm, ctx.mats.oliveRoof);
      mesh(ctx, new THREE.BoxGeometry(5, 36, 5), M2.olive, cx + 24, 18, cz - 22, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(9, 5, 9), M2.fence, cx + 24, 38.5, cz - 22, { cast: true });
      if (ctx.world._heliTex) disc(ctx, new THREE.MeshBasicMaterial({ map: ctx.world._heliTex, transparent: true, opacity: 0.8, depthWrite: false }), cx - 14, cz + 22, 12, 0.12, 24);
    } else {                // barracks rows + motor pool
      for (let i = 0; i < 3; i++) tower(ctx, cx - 22 + i * 22, cz - 12, 16, 14, 34, wm, ctx.mats.oliveRoof);
      for (let i = 0; i < 2; i++) mesh(ctx, new THREE.BoxGeometry(16, 7, 8), M2.olive, cx - 8 + i * 20, 3.5, cz + 24, { cast: true });
      flagpole(ctx, cx + 30, cz + 16);
    }
  },
  political(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    if (v === 0) {          // the capitol: base + drum + dome + colonnade + flags
      const base = tower(ctx, cx, cz - 4, 48, 18, 34, M2.marble, null);
      mesh(ctx, new THREE.CylinderGeometry(13, 15, 11, 18), M2.marble, cx, 23.5, cz - 4, { cast: true });
      mesh(ctx, new THREE.SphereGeometry(12, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M2.domeGold, cx, 29, cz - 4, { cast: true });
      for (let i = 0; i < 6; i++) mesh(ctx, new THREE.CylinderGeometry(1.3, 1.6, 16, 8), M2.marble, cx - 17.5 + i * 7, 8, cz + 15, { cast: true });
      disc(ctx, M2.plazaM, cx, cz + 28, 16, 0.09);
      flagpole(ctx, cx - 26, cz + 24); flagpole(ctx, cx + 26, cz + 24);
      base.castShadow = true;
    } else {                // ministry slabs + obelisk
      tower(ctx, cx - 16, cz - 8, 26, 56, 20, W._winMats[0], M2.paleRoof);
      tower(ctx, cx + 16, cz - 8, 26, 56, 20, W._winMats[0], M2.paleRoof);
      mesh(ctx, new THREE.CylinderGeometry(1.2, 3.2, 36, 4), M2.marble, cx, 18, cz + 22, { cast: true });
      disc(ctx, M2.plazaM, cx, cz + 22, 13, 0.09);
    }
  },
  educational(ctx, cx, cz, v) {
    const W = ctx.world, wm = W._winMats[2], M2 = ctx.mats;
    if (v === 0) {          // the quad + bell tower
      tower(ctx, cx, cz - 20, 52, 22, 18, wm, M2.terraRoof);
      tower(ctx, cx - 22, cz + 6, 18, 20, 34, wm, M2.terraRoof);
      tower(ctx, cx + 22, cz + 6, 18, 20, 34, wm, M2.terraRoof);
      mesh(ctx, new THREE.BoxGeometry(7, 46, 7), M2.stone, cx, 23, cz - 34, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(9.5, 5, 9.5), M2.terraRoof, cx, 48.5, cz - 34, { cast: true });
      disc(ctx, M2.lawnM, cx, cz + 10, 15, 0.1);
      ctx.treeSpots.push([cx - 8, cz + 12], [cx + 8, cz + 8]);
    } else {                // the library + dorms
      tower(ctx, cx - 8, cz - 8, 36, 44, 26, wm, M2.paleRoof);
      tower(ctx, cx + 22, cz + 14, 16, 28, 28, wm, M2.terraRoof);
      disc(ctx, M2.lawnM, cx - 6, cz + 24, 12, 0.1);
      ctx.treeSpots.push([cx - 6, cz + 24]);
    }
  },
  temple(ctx, cx, cz, v) {
    const M2 = ctx.mats;
    const court = CELL / 2 - 14;
    for (const [w2, d2, ox, oz] of [[court * 2, 1, 0, -court], [court * 2, 1, 0, court], [1, court * 2, -court, 0], [1, court * 2, court, 0]])
      mesh(ctx, new THREE.BoxGeometry(w2, 2.2, d2), M2.stone, cx + ox, 1.1, cz + oz);
    if (v === 0) {          // tiered pagoda — one structural base, ornamental upper tiers
      tower(ctx, cx, cz, 30, 14, 30, M2.stone, null);
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
    } else {                // quarry terraces + crusher
      tower(ctx, cx + 28, cz - 28, 20, 18, 16, W._winMats[3], M2.steelRoof);
      mesh(ctx, new THREE.BoxGeometry(12, 14, 12), M2.dark, cx + 28, 7, cz + 26, { cast: true });
      mesh(ctx, new THREE.ConeGeometry(9, 10, 10), M2.rust, cx - 30, 5, cz - 30, { cast: true });
    }
  },
  seaport(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world, rng = ctx.rng;
    if (v === 0) {          // the container terminal
      tower(ctx, cx - 20, cz - 10, 24, 20, 44, W._winMats[3], M2.steelRoof);
      for (let i = 0; i < 9; i++) {
        const st = (rng() * 2) | 0;
        mesh(ctx, new THREE.BoxGeometry(11, 4.4, 4.6), M2.containers[(rng() * 5) | 0], cx + 4 + (i % 3) * 13, 2.2 + st * 4.4, cz - 20 + ((i / 3) | 0) * 12, { cast: true });
      }
      // the yard crane, reaching for the water
      mesh(ctx, new THREE.BoxGeometry(7, 4, 7), M2.gold, cx + 26, 2, cz + 28, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(2.6, 50, 2.6), M2.gold, cx + 26, 27, cz + 28, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(40, 2.2, 2.2), M2.gold, cx + 42, 50, cz + 28, { cast: true });
    } else {                // the piers
      tower(ctx, cx - 22, cz + 6, 22, 18, 40, W._winMats[3], M2.steelRoof);
      for (const oz of [-22, 10]) {
        mesh(ctx, new THREE.BoxGeometry(60, 1.6, 9), M2.deck, cx + 30, 1.3, cz + oz);
        for (let i = 0; i < 4; i++) mesh(ctx, new THREE.CylinderGeometry(0.7, 0.85, 3.6, 6), M2.wood, cx + 6 + i * 16, 1.6, cz + oz + 5);
      }
      const hull = mesh(ctx, new THREE.BoxGeometry(34, 7, 12), M2.red, cx + 40, 2.4, cz - 6, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(10, 7, 9), M2.white, cx + 50, 9.4, cz - 6, { cast: true });
      hull.rotation.y = 0.06;
    }
  },
  resort(ctx, cx, cz, v) {
    const M2 = ctx.mats, W = ctx.world;
    if (v === 0) {          // the grand hotel + pool deck
      tower(ctx, cx - 16, cz - 8, 44, 76, 20, W._winMats[2], M2.paleRoof);
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
  stadium(ctx, cx, cz, v) {           // an arena bowl: banked stands you can stand on, open field
    const M2 = ctx.mats, W = ctx.world;
    disc(ctx, M2.lawnM, cx, cz, 30, 0.1, 30);
    const N = 10;
    for (let i = 0; i < N; i++) {     // the ring of stands, each a real standable block
      const a = (i / N) * Math.PI * 2, r = 40;
      tower(ctx, cx + Math.cos(a) * r, cz + Math.sin(a) * r, 17, v === 0 ? 22 : 30, 17, W._winMats[0], M2.paleRoof);
    }
    for (const s of [-1, 1]) { mesh(ctx, new THREE.BoxGeometry(1.2, 34, 1.2), M2.steel, cx + s * 34, 17, cz - 34, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(9, 5, 1), M2.gold, cx + s * 34, 33, cz - 34, { cast: true }); }   // floodlight masts
  },
  hospital(ctx, cx, cz, v) {          // civic block with a helipad roof and an ambulance bay
    const M2 = ctx.mats, W = ctx.world;
    tower(ctx, cx - 4, cz - 6, 46, v === 0 ? 60 : 84, 34, W._winMats[0], M2.paleRoof);
    if (W._heliTex) disc(ctx, new THREE.MeshBasicMaterial({ map: W._heliTex, transparent: true, opacity: 0.85, depthWrite: false }), cx - 4, cz - 6, 11, (v === 0 ? 60 : 84) + 0.3, 24);
    mesh(ctx, new THREE.BoxGeometry(26, 7, 12), M2.white, cx + 16, 3.5, cz + 26, { cast: true });      // the bay canopy
    for (const s of [-1, 1]) mesh(ctx, new THREE.BoxGeometry(1.2, 7, 1.2), M2.steel, cx + 16 + s * 12, 3.5, cz + 32);
    disc(ctx, M2.plazaM, cx - 22, cz + 24, 13, 0.09);
    ctx.treeSpots.push([cx - 24, cz + 26]);
  },
  market(ctx, cx, cz, v) {            // low stalls + awnings: dense cover, nothing tall
    const M2 = ctx.mats, rng = ctx.rng;
    disc(ctx, M2.plazaM, cx, cz, 36, 0.08, 28);
    const rows = v === 0 ? 3 : 4;
    for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < 3; c2++) {
      const x = cx - 26 + c2 * 26, z = cz - 26 + r * 18 + (rng() - 0.5) * 3;
      mesh(ctx, new THREE.BoxGeometry(14, 6, 9), M2.wood, x, 3, z, { cast: true });
      mesh(ctx, new THREE.BoxGeometry(16, 1.2, 11), (rng() < 0.5 ? M2.red : M2.canvas), x, 7, z, { cast: true });
    }
    ctx.treeSpots.push([cx + 30, cz - 28], [cx - 30, cz + 30]);
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
  const M2 = mats(world);
  const ctx = { world, g: group, rng, mats: M2, treeSpots: [] };
  const A = plan.arena;
  for (let r = 0; r < plan.N; r++) for (let c = 0; c < plan.N; c++) {
    const cell = plan.cells[r][c];
    if (!cell || cell.t === 'water') continue;
    const cx = -A + c * CELL + CELL / 2, cz = -A + r * CELL + CELL / 2;
    const builder = T[cell.t];
    if (builder) builder(ctx, cx, cz, cell.v || 0);
  }
  return { treeSpots: ctx.treeSpots };
}
