// =================================================================================================
// POWERWORLD — THE STAGE. See docs/POWERWORLD.md.
//
// Robert: *"wide open space… no pedestrians, maps look like Bid for Power."*
//
// ⚠ THIS IS A VENUE, NOT A CITY PLAN. `generatePlan` cannot make an empty stage — its base fill
// always builds a city — and a whole new plan KIND is a bigger commitment than this needs. The
// pattern used instead has now been proven three times in this repo (`whiteroom.js`, `baseroom.js`,
// `boxingring.js`): hide the theatre you arrived in, raise your own geometry, and put every single
// thing back on the way out. The restore contract is the hard part, not the rocks.
//
// ⚠ WHAT MAKES A BFP STAGE IS NEGATIVE SPACE. The instinct is to build more; the reference builds
// less. A DBZ arena is a floor, a horizon, and a few things big enough to be thrown through — the
// emptiness is what lets you read a fighter two hundred units away, and it is why these maps still
// look right twenty years on. Every rock here is either something to slam someone into or a scale
// reference so the sky reads as far away. There is nothing decorative.
// =================================================================================================
import * as THREE from 'three';
import { GROUND_LAYER } from '../core/util.js';

export const STAGE = {
  radius: 900,          // the ground disc. Generous: the chase loop needs somewhere to chase TO.
  spires: 15,           // slam targets, sparse on purpose
  boulders: 22,
  // ⚠ A DIFFERENT DIMENSION SHOULD NOT LOOK LIKE EARTH AT DUSK. This palette is PowerWorld's own —
  // a cold, high, thin sky over warm rock, so the two worlds are told apart in one glance while the
  // fighters, the gold accent and every HUD token stay exactly as they are. Sameness in the chrome is
  // what keeps them one game; the SKY is where a dimension gets to be somewhere else. No purple.
  sky:  { topDay: '#0d2436', topNight: '#050b12', horDay: '#3f7d86', horNight: '#12222b',
          glow: '#7fd8ff', sunDay: '#ffe6c4', sunGold: '#ffb066',
          hemiDay: '#8fd0e0', hemiNight: '#16222c', gndDay: '#6b4a33', gndNight: '#1a1208' },
  rock: '#6d5340', rockDark: '#3d2d22', ground: '#7a5c44',
};

export class PowerWorldStage {
  constructor(game) {
    this.g = game; this.group = null;
    this._mats = []; this._hidden = []; this._cover = [];
    this._props = null; this._cover0 = null; this._coverAll0 = null; this._int0 = null;
    this._arena0 = null; this._fog0 = null;
  }

  open() {
    const g = this.g, W = g.world;
    if (this.group) this.close();
    this._hideTheatre();
    const grp = new THREE.Group(); this.group = grp;
    const add = (m) => { grp.add(m); return m; };

    const groundM = new THREE.MeshStandardMaterial({ color: STAGE.ground, roughness: 0.97 });
    const rockM = new THREE.MeshStandardMaterial({ color: STAGE.rock, roughness: 0.9, flatShading: true });
    const darkM = new THREE.MeshStandardMaterial({ color: STAGE.rockDark, roughness: 0.95, flatShading: true });
    this._mats.push(groundM, rockM, darkM);

    // ---- THE FLOOR. A disc, not a box: a straight edge would read as a level boundary, and the
    // whole point is that the horizon is far away and unremarkable.
    const floor = add(new THREE.Mesh(new THREE.CircleGeometry(STAGE.radius, 64), groundM));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = GROUND_LAYER.shadow * 0.5;   // a rung from the ladder, never an invented number
    floor.receiveShadow = true;

    // ---- SPIRES. Tall, thin, and REGISTERED AS COVER, because the reason they exist is that being
    // hurled into one has to hurt — `onSlam` and `worldImpact` already do that work for free.
    // ⚠ Deterministic placement (a fixed hash, not Math.random) so a stage is the same stage twice.
    let seed = 1337;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (let i = 0; i < STAGE.spires; i++) {
      const a = (i / STAGE.spires) * Math.PI * 2 + rnd() * 0.4;
      const r = 90 + rnd() * 470;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = 60 + rnd() * 150, w = 9 + rnd() * 16;
      const m = add(new THREE.Mesh(new THREE.CylinderGeometry(w * 0.45, w, h, 6, 1), rnd() > 0.5 ? rockM : darkM));
      m.position.set(x, h / 2, z); m.rotation.y = rnd() * 3.14; m.castShadow = h > 90;
      this._reg(x, z, w, w, h);
    }
    // ---- BOULDERS. Low cover and, more importantly, scale: without something human-sized near the
    // camera a 900u disc reads as a small room.
    for (let i = 0; i < STAGE.boulders; i++) {
      const a = rnd() * Math.PI * 2, r = 40 + rnd() * 520;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 6 + rnd() * 13;
      const m = add(new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rnd() > 0.4 ? rockM : darkM));
      m.position.set(x, s * 0.55, z); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      this._reg(x, z, s * 1.3, s * 1.3, s * 1.1);
    }
    W.scene.add(grp);
    this._skin();
    g._pwStage = this;
    return this;
  }

  /** A cover record, so physics, LOS and the slam rules all know the rock is there. */
  _reg(x, z, hx, hz, top) {
    const W = this.g.world;
    const co = { x, z, hx: hx * 0.5, hz: hz * 0.5, top, hp: 1e9, maxHp: 1e9 };
    W.cover.push(co); W.coverAll.push(co); this._cover.push(co);
  }

  /**
   * ⚠ THE THEATRE YOU ARRIVED IN IS HIDDEN, NEVER REMOVED — it has to be exactly as you left it when
   * you cross back. This is `boxingring.js`'s pass, including its hard-won second half: the props are
   * ARRAYS (`propInReach` walks `world.cars/planes/rocks/treeSpots`, not the scene) and `interiors`
   * is a THIRD list that physics consults separately from `cover`. Missing either one is an invisible
   * wall or a hoistable car that is not there.
   */
  _hideTheatre() {
    const g = this.g, W = g.world;
    this._arena0 = W.ARENA;
    W.ARENA = STAGE.radius;                       // the sky is open and so is the ground
    this._hidden = [];
    const hide = (m) => { if (m && m.visible) { this._hidden.push(m); m.visible = false; } };
    const keep = new Set([this.group]);
    for (const e of g.entities) if (e && e.obj) keep.add(e.obj);
    if (g.particles && g.particles.points) keep.add(g.particles.points);
    for (const child of W.scene.children) {
      if (keep.has(child) || child.isLight || child.isCamera) continue;
      hide(child);
    }
    for (const m of (W._cityBits || [])) hide(m);
    for (const m of (W._roadMeshes || [])) hide(m);
    this._props = { cars: W.cars, planes: W.planes, rocks: W.rocks, trees: W.treeSpots };
    W.cars = []; W.planes = []; W.rocks = []; W.treeSpots = [];
    this._cover0 = W.cover; this._coverAll0 = W.coverAll; this._int0 = W.interiors;
    W.cover = []; W.coverAll = []; W.interiors = [];
    W.refreshFogBoxes && W.refreshFogBoxes();
    if (W.scene.fog) { this._fog0 = W.scene.fog.density; W.scene.fog.density = this._fog0 * 0.35; }
  }

  /** PowerWorld's own sky, written into the palette the day/night cycle already drives. */
  _skin() {
    const W = this.g.world, P = W._dnc, S = STAGE.sky;
    if (!P) return;
    // ⚠ WRITTEN INTO `_dnc`, NOT ALONGSIDE IT. The clock keeps running here — the sun still crosses,
    // dusk still happens — it simply crosses a different sky. And `setSkyWorld(null)` already knows
    // how to restore every one of these keys from `_dncEarth`, so the exit path costs nothing new.
    // ⚠ STASH WHICH SKY WE CAME FROM. `setSkyWorld(null)` restores EARTH, and the theatre you
    // travelled from may well not be Earth — measured: crossing back into Tranquility Reach handed
    // the Moon an Earth sky. Restore the id, not the default.
    this._sky0 = W.skyWorld || null;
    const set = (k, v) => { if (P[k]) P[k].set(v); };
    set('topDay', S.topDay); set('topNight', S.topNight);
    set('horDay', S.horDay); set('horNight', S.horNight);
    set('glowTint', S.glow); set('sunDay', S.sunDay); set('sunGold', S.sunGold);
    set('hemiDay', S.hemiDay); set('hemiNight', S.hemiNight);
    set('gndDay', S.gndDay); set('gndNight', S.gndNight);
    W.skyWorld = 'powerworld';
  }

  close() {
    if (!this.group) return;
    const W = this.g.world;
    if (this._arena0 != null) { W.ARENA = this._arena0; this._arena0 = null; }
    if (this._props) { W.cars = this._props.cars; W.planes = this._props.planes; W.rocks = this._props.rocks; W.treeSpots = this._props.trees; this._props = null; }
    // ⚠ our own cover records leave BOTH arrays before the originals come back, or the next match
    // inherits invisible rocks — the exact bug the venue paid for.
    if (this._cover0) { W.cover = this._cover0; W.coverAll = this._coverAll0; this._cover0 = this._coverAll0 = null; }
    if (this._int0) { W.interiors = this._int0; this._int0 = null; }
    this._cover = [];
    W.refreshFogBoxes && W.refreshFogBoxes();
    for (const m of this._hidden) m.visible = true;
    this._hidden = [];
    if (this._fog0 != null && W.scene.fog) { W.scene.fog.density = this._fog0; this._fog0 = null; }
    W.setSkyWorld(this._sky0 || null);       // the one restore path — and back to the sky we CAME from
    this._sky0 = null;
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this._mats) m.dispose();
    W.scene.remove(this.group);
    this.group = null; this._mats = [];
    if (this.g._pwStage === this) this.g._pwStage = null;
  }
}
