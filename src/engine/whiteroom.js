// THE WHITE ROOM — the project's first large INDOOR environment, and a training hall.
//
// Not a city. A roofed volume with its own ceiling, pillars, gantries you can stand on, and
// apparatus: target sleds that run on rails, wall turrets that shoot at you, a flight course, and
// an instrumented dummy. Drills are chosen at a CONSOLE you walk up to and use — the same
// interactable/G-chain the rest of the game uses — so nothing here is a menu.
//
// THE MEASUREMENT LAW: every damage number the board reports is captured at `game.onHit`, the
// choke point every damage source already routes through. Nothing is re-derived from ability data.
// A training readout that models its own damage lies the first time the pipeline changes.
//
// THE APPARATUS LAW: the moving targets are FIGHTERS on rails, not bespoke hit-test objects. That
// buys real projectile collision, real melee reach, real damage types, guard, and scoring, for
// free and forever — a hand-rolled hit test would drift from combat the first time combat changed.
import * as THREE from 'three';
import { SETTINGS, keymap } from '../core/settings.js';
import { sinkSurface } from '../core/util.js';

const ROOM = 130, WALL_H = 62, CEIL = 58;      // half-extent, wall height, flight ceiling
const KEEP = 12;                               // distinct attacks held for comparison
const SLEDS = 4, TURRETS = 4, RINGS = 6;

export const DRILLS = [
  { id: 'free',     name: 'FREE PRACTICE', blurb: 'Dummy only. Nothing shoots back.' },
  { id: 'targets',  name: 'MOVING TARGETS', blurb: 'Sleds run the rails. Hit as many as you can.' },
  { id: 'evasion',  name: 'EVASION',        blurb: 'The turrets fire. Do not get hit.' },
  { id: 'course',   name: 'FLIGHT COURSE',  blurb: 'Fly the gates in order, against the clock.' },
  { id: 'sparring', name: 'SPARRING',       blurb: 'The dummy fights back.' },
];

// ---------------------------------------------------------------------------------------------
export class Telemetry {
  constructor() { this.reset(); }
  reset() { this.last = null; this.log = []; this.best = new Map(); this.shots = 0; this.total = 0; }
  // ⚠ THE BURST RULE. A punch lands once for 8; a beam lands sixty times for 1. Filed separately
  // the board ranks the punch above the beam, which is backwards and makes the table worse than
  // useless. Consecutive hits from one attack inside a short window are ONE burst, compared on
  // their total — so a sustained weapon is measured by what it actually did.
  record(rec) {
    const BURST = 0.35, cur = this.last;
    if (cur && cur.label === rec.label && (rec.t - cur.tEnd) < BURST) {
      cur.tEnd = rec.t; cur.ticks++;
      cur.dmg = +(cur.dmg + rec.dmg).toFixed(1);
      cur.kb = Math.max(cur.kb, rec.kb); cur.speed = Math.max(cur.speed, rec.speed);
      cur.blocked = cur.blocked && rec.blocked;
      this.shots++; this.total += rec.dmg;
      const p0 = this.best.get(cur.label);
      if (!p0 || cur.dmg > p0.dmg) this.best.set(cur.label, cur);
      return;
    }
    rec.tEnd = rec.t; rec.ticks = 1;
    this.last = rec; this.shots++; this.total += rec.dmg;
    this.log.unshift(rec); if (this.log.length > 40) this.log.length = 40;
    const prev = this.best.get(rec.label);
    if (!prev || rec.dmg > prev.dmg) this.best.set(rec.label, rec);
    if (this.best.size > KEEP) {
      let wk = null, wv = Infinity;
      for (const [k, v] of this.best) if (v.dmg < wv) { wv = v.dmg; wk = k; }
      if (wk !== rec.label) this.best.delete(wk);
    }
  }
  table() { return [...this.best.values()].sort((a, b) => b.dmg - a.dmg); }
}

// ---------------------------------------------------------------------------------------------
export class WhiteRoom {
  constructor(game) {
    this.g = game;
    this.telemetry = new Telemetry();
    this.group = null; this.dummy = null;
    // ⚠ THE BLUE ROOM IS THE DEFAULT, AND NOTHING IN IT CAN HURT YOU (Robert, 2026-07-25: "don't
    // add any enemies, I can't even train — they just start attacking me and I die because I don't
    // have the controls yet"). A training space whose first act is to kill you teaches nothing.
    // BLUE  — learn the controls. No AI, no turrets, no drills, no damage taken. A bag to hit.
    // WHITE — opt IN to danger: the instrumented chamber, the moving targets, the turrets, sparring.
    this.room = 'blue';
    this.aggressive = false;
    this.drill = 'free'; this.drillT = 0; this.score = 0; this.taken = 0; this.ring = 0;
    this.sleds = []; this.turrets = []; this.rings = [];
    this._boardCv = null; this._boardTex = null; this._boardT = 0;
    this._prevFog = null; this._console = null; this._hidden = null;
    this._msg = ''; this._msgT = 0;
  }

  // ---------------------------------------------------------------- build
  open() {
    const g = this.g, W = g.world;
    if (this.group) this.close();
    const grp = new THREE.Group(); this.group = grp;

    // ⚠ NOT actually white. #f2f0ea walls under the scene lights AND the bloom pass clipped
    // completely and both fighters read as pale ghosts. A test chamber must make the SUBJECT the
    // brightest thing in frame, so the shell sits at a light grey.
    const wall = new THREE.MeshStandardMaterial({ color: '#cfcbc2', roughness: 0.96, metalness: 0 });
    const floor = new THREE.MeshStandardMaterial({ color: '#c2beb5', roughness: 0.94, metalness: 0 });
    const trim = new THREE.MeshStandardMaterial({ color: '#14120e', roughness: 0.8, metalness: 0 });
    const steel = new THREE.MeshStandardMaterial({ color: '#8b8577', roughness: 0.6, metalness: 0.35 });
    const gold = new THREE.MeshBasicMaterial({ color: '#ffd24a' });
    const live = new THREE.MeshBasicMaterial({ color: '#7fe6ff' });
    this._mats = [wall, floor, trim, steel, gold, live];
    this.M = { wall, floor, trim, steel, gold, live };

    const add = (m) => { grp.add(m); return m; };
    // ⚠ THE FLICKER WAS THREE FLAT SURFACES FIGHTING FOR THE SAME MILLIMETRE. The floor sat at
    // y=0.06 and a GridHelper at y=0.09 — while every fighter's contact shadow is pinned at
    // groundY+0.05. At 1:1 scale (1u ≈ 0.19m) those are 10 and 30 MILLIMETRES apart, far inside
    // the depth buffer's precision at match camera range, so the shadow disc and the floor
    // swapped depth per-pixel and the disc came out with a torn, crawling edge.
    // The fix is to stop having three surfaces: the grid is PAINTED INTO the floor texture (the
    // same thing world._gridTexture does for the city ground) so there is ONE plane, it sits at
    // y=0 where the ground actually is, and polygonOffset makes it lose every remaining depth
    // tie on purpose — anything drawn AT floor level wins, by rule rather than by luck.
    floor.map = this._floorTexture();
    sinkSurface(floor);           // see THE SURFACE-SEPARATION LAW in core/util.js
    const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), floor));
    fl.rotation.x = -Math.PI / 2; fl.position.y = 0; fl.receiveShadow = true;

    // ⚠ THE ISOMETRIC INTERIOR PROBLEM. An indoor room in a fixed isometric game has two surfaces
    // that will always be between the camera and the fight: the roof, and the two near walls. A
    // solid ceiling photographed as one enormous blank slab with the entire hall hidden under it.
    // So: the two camera-side walls are built LOW (a parapet you can see over — the standard
    // cutaway), and the roof is a LATTICE OF BEAMS rather than a slab. You read "roofed" from the
    // beams and the light rig, and you can still see your own fight.
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const near = (Math.sin(a) > 0.5 || Math.cos(a) > 0.5);        // the +x / +z sides face the camera
      const h = near ? 9 : WALL_H;
      const w = add(new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, h, 3), wall));
      w.position.set(Math.sin(a) * ROOM, h / 2, Math.cos(a) * ROOM); w.rotation.y = a; w.receiveShadow = true;
      // ⚠ the capping band must sit BELOW the wall top, not flush with it. Centred at h−0.8 its
      // own top face landed at exactly h — 260 units of perfectly coplanar surface, the single
      // biggest z-fight in the room. Half a unit of drop is ~10cm and reads as a proper coping.
      const sk = add(new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 1.6, 3.4), trim));
      sk.position.copy(w.position).setY(h - 1.4); sk.rotation.y = a;
    }
    // the roof: beams, not a slab. It is only possible at all because a room is a BOX — the terrain
    // heightfield cannot fold over itself, which is why the metro is an open cut and there are no
    // tunnels. Flight is clamped to CEIL in update() regardless of what you can see.
    // ⚠ keep the roof QUIET. The first pass used seven thick beams and five bright strips, and from
    // the match camera they read as enormous bars laid across the fight. A ceiling's job here is to
    // say "indoors" in peripheral vision and then get out of the way.
    // ⚠ SECOND PASS, and the note was the same one: from the match camera an isometric view looks
    // THROUGH the ceiling plane at a shallow angle, so anything up there is drawn across the whole
    // frame and reads as bars laid over the fight — five beams plus three gold light strips owned
    // more pixels than the room did. Three thin beams and no strips: enough to say "roofed" in
    // peripheral vision, and nothing you have to look past.
    for (let i = -1; i <= 1; i++) {
      const b = add(new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 0.7, 1.4), steel));
      b.position.set(0, CEIL + 3, i * 78); b.castShadow = false;
    }

    // PILLARS — real cover, so line of sight and dodging mean something indoors
    this._cover = [];
    for (const [px, pz] of [[-58, -46], [58, -46], [-58, 46], [58, 46], [0, -74], [0, 74]]) {
      const p = add(new THREE.Mesh(new THREE.BoxGeometry(13, WALL_H, 13), wall));
      p.position.set(px, WALL_H / 2, pz); p.castShadow = true; p.receiveShadow = true;
      const co = { mesh: p, crack: null, x: px, z: pz, r: 9, h: WALL_H, hx: 6.5, hz: 6.5, top: WALL_H,
                   hp: 1e9, maxHp: 1e9, y0: WALL_H / 2, w: 13, d: 13, destroyed: false, _lab: true };
      W.cover.push(co); W.coverAll.push(co); this._cover.push(co);
    }
    // GANTRIES — somewhere to fight from that is not the floor
    for (const s of [-1, 1]) {
      const gy = 24;
      const gan = add(new THREE.Mesh(new THREE.BoxGeometry(46, 2.4, 26), steel));
      gan.position.set(s * 92, gy, 0); gan.castShadow = true; gan.receiveShadow = true;
      const co = { mesh: gan, crack: null, x: s * 92, z: 0, r: 24, h: gy + 1.2, hx: 23, hz: 13, top: gy + 1.2,
                   hp: 1e9, maxHp: 1e9, y0: gy, w: 46, d: 26, destroyed: false, _lab: true };
      W.cover.push(co); W.coverAll.push(co); this._cover.push(co);
      const rail = add(new THREE.Mesh(new THREE.BoxGeometry(46, 4, 0.8), trim));
      rail.position.set(s * 92, gy + 3.4, s > 0 ? -13 : 13);
    }

    // ⚠ EVERYTHING BELOW THIS LINE IS DRILL APPARATUS, and it is SWITCHED OFF in the blue room.
    // "maybe we got too much stuff in there" — a room full of rails, turrets and gates is a room
    // that is telling you about itself instead of letting you learn. The blue room keeps the shell,
    // the two floors, the pillars, the board and the bag; the white room turns the machinery on.
    this._apparatus = [];
    const rig = (m) => { this._apparatus.push(m); return m; };

    // ⚠ THE FIRST BUILDING IN THE GAME WITH TWO FLOORS (Robert's ruling: "these kind of buildings
    // definitely need to have two floors"). It works here and nowhere else yet for one reason: a
    // ROOM is a box, and a box can have a slab across it. The terrain heightfield is a single
    // surface that cannot fold over itself — which is why the metro is an open cut and why there
    // are still no tunnels. Floors are the roofed-volume system arriving one room at a time.
    // The upper floor covers the NORTH half only, so from the fixed isometric camera you look
    // straight down onto the ground floor through the open south half — the same "take the roof
    // off" cutaway, applied to a storey instead of a ceiling.
    const F2 = 24;                                    // storey height: a real 4.5m at 1u ≈ 0.19m
    const slab = add(new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2 - 6, 2.2, ROOM - 20), floor));
    slab.position.set(0, F2, -(ROOM / 2) - 4); slab.castShadow = true; slab.receiveShadow = true;
    {
      const co = { mesh: slab, crack: null, x: 0, z: -(ROOM / 2) - 4, r: ROOM, h: F2 + 1.1,
                   hx: ROOM - 3, hz: (ROOM - 20) / 2, top: F2 + 1.1, hp: 1e9, maxHp: 1e9,
                   y0: F2, w: ROOM * 2 - 6, d: ROOM - 20, destroyed: false, _lab: true };
      W.cover.push(co); W.coverAll.push(co); this._cover.push(co);
    }
    const lip = add(new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2 - 6, 3.2, 0.9), trim));
    lip.position.set(0, F2 + 2.6, -14.5);
    // ⚠ STAIRS, NOT A RAMP. The first version drew a tilted slab and registered nothing, so it was
    // scenery you fell straight through. Physics is AABB — a rotated box has no honest collider —
    // and the stand-on-top test only catches you when you are already within 2.5u of the surface,
    // so a step taller than that is a WALL that pushes you back rather than a stair you climb.
    // Ten 2.4u risers clear both problems and mean a GROUNDED hero (SARGE, GALE — flightTier 0)
    // can reach the second floor on foot. A floor only fliers can use is not a floor.
    // ⚠ the flight is placed by TWO clearances, both learned the hard way. It must miss the west
    // gantry (which spans x −117…−67 and z ±15 — the first version ran straight into its side and
    // a fighter climbed three steps and stopped dead), and its TOP step must overlap the
    // mezzanine's south edge, because a step that stops short of the slab leaves a gap with
    // nothing under it. Everything else about a staircase is arithmetic.
    const STEPS = 10, RISE = F2 / STEPS, RUN = 7, SX = -30, SZ0 = 54;
    for (let i = 0; i < STEPS; i++) {
      const top = RISE * (i + 1), zc = SZ0 - i * RUN;
      const st = add(new THREE.Mesh(new THREE.BoxGeometry(30, top, RUN), floor));
      st.position.set(SX, top / 2, zc); st.castShadow = true; st.receiveShadow = true;
      const co = { mesh: st, crack: null, x: SX, z: zc, r: 16, h: top, hx: 15, hz: RUN / 2,
                   top, hp: 1e9, maxHp: 1e9, y0: top / 2, w: 30, d: RUN, destroyed: false, _lab: true };
      W.cover.push(co); W.coverAll.push(co); this._cover.push(co);
    }

    // TARGET SLEDS — the rails they run on
    for (let i = 0; i < SLEDS; i++) {
      const z = -60 + i * 40, y = 10 + (i % 2) * 16;
      const rail = rig(add(new THREE.Mesh(new THREE.BoxGeometry(150, 0.6, 0.6), trim)));
      rail.position.set(0, y + 7.5, z);
      this.sleds.push({ z, y, x: -60 + i * 12, dir: i % 2 ? 1 : -1, spd: 26 + i * 7, f: null, rail, downT: 0 });
    }

    // WALL TURRETS — the thing you dodge
    for (let i = 0; i < TURRETS; i++) {
      const a = (i / TURRETS) * Math.PI * 2 + 0.4;
      const x = Math.cos(a) * (ROOM - 8), z = Math.sin(a) * (ROOM - 8);
      const body = rig(add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3.6, 5, 10), steel)));
      body.position.set(x, 26, z); body.rotation.z = Math.PI / 2; body.lookAt(0, 26, 0);
      const eye = rig(add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), live)));
      eye.position.set(x * 0.95, 26, z * 0.95);
      this.turrets.push({ x, y: 26, z, body, eye, cd: 1.4 + i * 0.7, tel: 0 });
    }

    // FLIGHT GATES
    for (let i = 0; i < RINGS; i++) {
      const a = (i / RINGS) * Math.PI * 2;
      const r = new THREE.Mesh(new THREE.TorusGeometry(9, 0.9, 8, 22), steel);
      r.position.set(Math.cos(a) * 74, 16 + (i % 3) * 14, Math.sin(a) * 74);
      r.lookAt(0, r.position.y, 0);
      rig(add(r)); this.rings.push({ mesh: r, i });
    }

    // THE CONSOLE — drills are chosen by walking up to it, not from a menu
    const plinth = add(new THREE.Mesh(new THREE.BoxGeometry(7, 5, 4), trim));
    plinth.position.set(-26, 2.5, 30);
    const screen = add(new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 0.4), live));
    screen.position.set(-26, 5.6, 29.4); screen.rotation.x = -0.4;
    this._consolePos = { x: -26, y: 0, z: 30 };
    this._console = g.registerInteractable({
      pos: this._consolePos, r: 11, label: 'DRILL CONSOLE', verb: 'CHANGE DRILL', priority: 5,
      onUse: () => this.cycleDrill(),
    });

    // THE BOARD
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
    this._boardCv = cv;
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8; this._boardTex = tex;
    const board = add(new THREE.Mesh(new THREE.PlaneGeometry(112, 56), new THREE.MeshBasicMaterial({ map: tex })));
    board.position.set(0, 32, -ROOM + 2.4);
    this._board = board;

    const lamp = add(new THREE.HemisphereLight(0xffffff, 0xb9b5ac, 0.35));
    this._lamp = lamp;

    // ⚠ HIDE THE CITY, don't tear it down. A white box built inside a live Tokyo is a wall with a
    // skyline behind it. Hiding restores instantly, so the theater you travelled to survives.
    // ⚠ HIDE EVERYTHING THAT ISN'T THE ROOM. The first pass hid the arena group, the city bits and
    // the roads by name, and a lone ambulance parked outside the wall survived every one of those
    // lists. Enumerating what to hide is a losing game — the room hides ALL scene content except
    // its own group, the lights, and the living fighters, which is a rule that cannot be
    // out-grown by whatever gets added to the world next.
    this._hidden = [];
    const hide = (m) => { if (m && m.visible) { this._hidden.push(m); m.visible = false; } };
    // ⚠ but PROTECT the live systems. `particles.points` is a persistent scene child, so a blanket
    // hide silently kills every particle effect in the room — the one thing a test chamber must
    // never do is stop showing you what your attack looked like. vfx and projectiles attach their
    // objects at fire time, after this runs, so they are safe by construction.
    const keep = new Set([grp]);
    for (const e of g.entities) if (e && e.obj) keep.add(e.obj);
    if (g.particles && g.particles.points) keep.add(g.particles.points);
    for (const child of g.scene.children) {
      if (keep.has(child) || child.isLight || child.isCamera) continue;
      hide(child);
    }
    for (const m of (W._cityBits || [])) hide(m);
    for (const m of (W._roadMeshes || [])) hide(m);

    // ⚠ HIDING A MESH DOES NOT REMOVE THE THING. The city's cars, planes and rocks stay in the
    // world's PROP arrays, and propInReach walks those arrays, not the scene — so the hall offered
    // a "G HOIST" prompt for an invisible car parked in a street two hundred units away, and would
    // have handed the player a car they could not see. Same lesson as the ambulance that survived
    // the hide list: the room must take the DATA away, not just the pixels. Stashed, and put back
    // in close() exactly as found so the theater you travelled to is untouched.
    this._props = { cars: W.cars, planes: W.planes, rocks: W.rocks };
    W.cars = []; W.planes = []; W.rocks = [];

    // ⚠ NOTHING IS HIDDEN IN A TRAINING HALL. The vision system runs even with fog off, and the
    // pillars are real cover — so targets standing in plain sight behind a column picked up "last
    // known position" ghosts, and the hall filled with red question marks. Vision is overridden
    // for the duration and restored on close; this is the one room where the honesty law has
    // nothing to protect, because there is no opponent being given an unfair read.
    this._prevVision = g.updateVision;
    g.updateVision = () => { for (const e of g.entities) { e._vis = 1; e._lastKnown = null; if (e.obj) e.obj.visible = true; } };

    g.scene.add(grp);
    this._prevFog = W.fogEnabled; W.setFogEnabled(false);
    if (W.wildlife) W.wildlife.enabled = false;
    if (g.peds) { if (g.peds.mesh) g.peds.mesh.visible = false; if (g.peds.head) g.peds.head.visible = false; }
    this.spawnDummy();
    this.setDrill('free');
    this._paintShell();
    this._drawBoard();
    return this;
  }

  close() {
    const g = this.g, W = g.world;
    for (const s of this.sleds) if (s.f) this._killFighter(s.f);
    this.sleds.length = 0; this.turrets.length = 0; this.rings.length = 0;
    if (this.dummy) { this._killFighter(this.dummy); this.dummy = null; }
    if (this._console) { g.unregisterInteractable(this._console); this._console = null; }
    for (const co of (this._cover || [])) {
      let i = W.cover.indexOf(co); if (i >= 0) W.cover.splice(i, 1);
      i = W.coverAll.indexOf(co); if (i >= 0) W.coverAll.splice(i, 1);
    }
    this._cover = [];
    if (this.group) {
      g.scene.remove(this.group);
      this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      for (const m of (this._mats || [])) m.dispose();
      if (this._board) this._board.material.dispose();
      if (this._boardTex) this._boardTex.dispose();
      if (this._floorTex) { this._floorTex.dispose(); this._floorTex = null; }
      this.group = null; this._board = null; this._boardTex = null; this._boardCv = null;
    }
    if (this._mirrorEl) { this._mirrorEl.remove(); this._mirrorEl = null; this._mirrorHidden = undefined; }
    for (const m of (this._hidden || [])) if (m) m.visible = true;
    this._hidden = null;
    if (this._props) { W.cars = this._props.cars; W.planes = this._props.planes; W.rocks = this._props.rocks; this._props = null; }
    if (this._prevVision) { g.updateVision = this._prevVision; this._prevVision = null; }
    if (this._prevFog != null) W.setFogEnabled(this._prevFog);
    if (W.wildlife) W.wildlife.enabled = true;
    if (g.peds) { if (g.peds.mesh) g.peds.mesh.visible = true; if (g.peds.head) g.peds.head.visible = true; }
    if (W.refreshFogBoxes) W.refreshFogBoxes();
  }

  // the calibration grid, painted rather than stacked (see the flicker note in open())
  _floorTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const x = cv.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(20,18,14,0.20)'; x.lineWidth = 2;
    x.strokeRect(1, 1, 254, 254);
    x.strokeStyle = 'rgba(20,18,14,0.09)'; x.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const q = i * 64;
      x.beginPath(); x.moveTo(q, 0); x.lineTo(q, 256); x.moveTo(0, q); x.lineTo(256, q); x.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26); t.anisotropy = 8;
    this._floorTex = t;
    return t;
  }

  _killFighter(f) {
    const g = this.g;
    this._disposeBag(f);
    try { g.scene.remove(f.obj); f.dispose && f.dispose(); } catch (e) {}
    const i = g.entities.indexOf(f); if (i >= 0) g.entities.splice(i, 1);
  }

  // ---------------------------------------------------------------- fighters
  _holoDef(o) {
    return {
      id: o.id, name: o.name, threat: 'Moderate',
      colors: { primary: o.c1 || '#2f6f86', secondary: '#1d4a5c', accent: o.c2 || '#7fe6ff', skin: '#8fd8ee' },
      hp: o.hp, ki: 60, speed: o.speed || 0, strength: 5, holo: true,
      meleeTiers: 2, guardType: 'block', flightTier: 0, abilities: {},
      ai: { style: 'rusher', range: 14, aggro: 0.9, fly: 0 },
    };
  }

  // ⚠ A TRAINING DUMMY MUST LOOK LIKE A TRAINING DUMMY (Robert, 2026-07-25: "the dummies don't
  // even look like dummies to me"). It was a cyan humanoid, which reads as an opponent — so a
  // passive one standing perfectly still read as a bug, and an aggressive one read as an ambush.
  // A gym has TWO objects and they look nothing alike, so this room has two as well:
  //   PASSIVE  — the BAG: weighted base, sprung post, padded body, two wooden arms. Obviously
  //              furniture. Obviously not going to hit you.
  //   SPARRING — the humanoid holo partner, because a bag cannot throw a punch.
  // It is a SKIN, not a second entity: the same Fighter underneath, so every measurement, every
  // damage type, guard, reach and knockback number on the board still comes from real combat.
  _dummySkin(f, bag) {
    if (!f || !f.parts) return;
    if (bag && !f._bagRig) {
      const M = this.M;
      const pad = new THREE.MeshStandardMaterial({ color: '#8a5a2f', roughness: 0.92, metalness: 0 });
      const band = new THREE.MeshStandardMaterial({ color: '#e8e2d6', roughness: 0.9, metalness: 0 });
      const rig = new THREE.Group();
      const put = (m, y, z) => { m.position.set(0, y, z || 0); rig.add(m); return m; };
      put(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.2, 1.1, 14), M.trim), 0.55);   // weighted base
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 3.4, 10), M.steel), 2.8);  // sprung post
      const body = put(new THREE.Mesh(new THREE.CapsuleGeometry(2.35, 3.4, 6, 14), pad), 7.1);
      for (const y of [5.9, 8.3]) put(new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.24, 6, 18), band), y).rotation.x = Math.PI / 2;
      put(new THREE.Mesh(new THREE.SphereGeometry(1.55, 12, 10), pad), 10.6);             // head ball
      for (const sx of [-1, 1]) {                                                          // wooden arms
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 4.6, 8), M.steel);
        arm.position.set(sx * 2.7, 8.0, 0.6); arm.rotation.z = Math.PI / 2 * sx * -1; arm.rotation.x = 0.15;
        rig.add(arm);
      }
      rig.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      f._bagRig = rig; f._bagMats = [pad, band];
      f.parts.g.add(rig);
      body.name = 'bagBody';
    }
    // hide/show the humanoid WITHOUT enumerating it — the ground markers are the state display and
    // must survive, everything else under the figure group is the body.
    for (const c of f.parts.g.children) {
      if (c === f._bagRig || c === f.parts.groundRig) continue;
      c.visible = !bag;
    }
    if (f._bagRig) f._bagRig.visible = !!bag;
  }
  _disposeBag(f) {
    if (!f || !f._bagRig) return;
    f._bagRig.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of (f._bagMats || [])) m.dispose();
    f._bagRig.removeFromParent(); f._bagRig = null; f._bagMats = null;
  }

  // ⚠ NOT `dummy: true`. That flag makes a fighter untargetable — game.isFoe returns false for it,
  // which is right for a sim construct nobody should shoot at, and fatal here: a sparring AI could
  // never find a foe and stood still. Immortality comes from pinning health instead.
  spawnDummy() {
    const g = this.g;
    if (this.dummy) this._killFighter(this.dummy);
    const d = g.addFighter(this._holoDef({ id: '_labdummy', name: 'TEST DUMMY', hp: 100000, speed: 26 }),
      { team: 1, x: 26, z: 0 });
    d._labDummy = true; d.maxHp = 100000; d.hp = d.maxHp;
    this.dummy = d;
    this.setAggressive(this.aggressive);
    return d;
  }

  // THE MOVING TARGET. A fighter on a rail — so a bullet, a beam, a thrown car and a fist all hit
  // it through the same code that hits everything else in the game.
  _spawnSled(s) {
    const g = this.g;
    if (s.f) this._killFighter(s.f);
    const f = g.addFighter(this._holoDef({ id: '_labsled', name: 'TARGET', hp: 34, c1: '#8a5a2f', c2: '#ffd24a' }),
      { team: 1, x: s.x, z: s.z });
    f._labSled = s; f.ai = null;
    this.sleds.indexOf(s) >= 0 && (s.f = f);
    return f;
  }

  setAggressive(on) {
    this.aggressive = !!on;
    const d = this.dummy; if (!d) return this.aggressive;
    if (on) { d.speed = 26; if (!d.ai && this._AI && this._AI.AI) d.ai = new this._AI.AI(d, 1.1); }
    else { d.speed = 0; d.ai = null; d.vel.set(0, 0, 0); d.pos.set(26, d.pos.y, 0); }
    this._dummySkin(d, !on);            // passive = the bag, sparring = the holo partner
    d.name = on ? 'SPARRING PARTNER' : 'TRAINING DUMMY';
    return this.aggressive;
  }

  // ---------------------------------------------------------------- drills
  // THE DOOR BETWEEN THEM. One console: in the blue room it walks you next door; in the white room
  // it cycles the drills, and stepping back to blue is always one use away.
  setRoom(id) {
    this.room = id === 'white' ? 'white' : 'blue';
    const blue = this.room === 'blue';
    if (this._console) this._console.label = blue ? 'DOOR — THE WHITE ROOM' : 'DRILL CONSOLE';
    if (this._console) this._console.verb = blue ? 'GO NEXT DOOR' : 'CHANGE DRILL';
    if (blue) { this.setAggressive(false); this.setDrill('free'); }
    this._paintShell();
    this._flash(blue ? 'THE BLUE ROOM — nothing here can hurt you.'
                     : 'THE WHITE ROOM — targets, turrets and a dummy that fights back.');
    if (this.g.hud && this.g.hud.feed) this.g.hud.feed(blue ? 'THE BLUE ROOM — safe' : 'THE WHITE ROOM — live', blue ? '#7fe6ff' : '#ffd24a');
    this._boardT = 0;
    return this.room;
  }
  // the shell takes the room's colour, so you always know which one you are standing in — and the
  // machinery is physically absent from the blue room, not merely idle
  _paintShell() {
    if (!this.M) return;
    const blue = this.room === 'blue';
    this.M.wall.color.set(blue ? '#b9c6cf' : '#cfcbc2');
    this.M.floor.color.set(blue ? '#a9b6c0' : '#c2beb5');
    for (const m of (this._apparatus || [])) m.visible = !blue;
    if (blue) for (const s of this.sleds) if (s.f) { this._killFighter(s.f); s.f = null; }
  }

  cycleDrill() {
    if (this.room === 'blue') return this.setRoom('white');   // the console is the door in here
    const i = DRILLS.findIndex(d => d.id === this.drill);
    // ⚠ THE WAY BACK IS ON THE SAME BUTTON. Past the last drill the cycle returns to the blue room
    // rather than wrapping to the first — a safe room you can only reach by restarting the match
    // is not somewhere anyone retreats to when a drill goes badly.
    if (i >= DRILLS.length - 1) return this.setRoom('blue');
    const next = DRILLS[i + 1];
    this.setDrill(next.id);
    return next;
  }
  setDrill(id) {
    // the blue room only ever runs FREE PRACTICE — the danger lives next door, on purpose
    if (this.room === 'blue') id = 'free';
    const D = DRILLS.find(d => d.id === id) || DRILLS[0];
    this.drill = D.id; this.drillT = 0; this.score = 0; this.taken = 0; this.ring = 0;
    // clear the board of anything the last drill left standing
    for (const s of this.sleds) { if (s.f) { this._killFighter(s.f); s.f = null; } s.downT = 0; }
    for (const t of this.turrets) { t.cd = 1.2 + Math.random(); t.tel = 0; t.eye.material = this.M.live; }
    for (const r of this.rings) r.mesh.material = this.M.steel;
    if (D.id === 'targets') for (const s of this.sleds) this._spawnSled(s);
    if (D.id === 'course') this.rings[0].mesh.material = this.M.gold;
    this.setAggressive(D.id === 'sparring');
    this._flash(D.name + ' — ' + D.blurb);
    if (this.g.hud && this.g.hud.feed) this.g.hud.feed('DRILL: ' + D.name, '#ffd24a');
    this._boardT = 0;
    return D;
  }
  _flash(t) { this._msg = t; this._msgT = 3.5; }
  // ⚠ read the ACTIVE scheme — CLASSIC/PILOT/HYBRID move guard, gadget and descend between keys,
  // and a wall that lies about your bindings is worse than a blank wall.
  _keys() {
    const m = keymap(SETTINGS.scheme) || {};
    return { guard: m.guardLabel || 'C', up: m.upLabel || 'SPACE', down: m.downLabel || 'Z', item: m.itemLabel || 'X' };
  }

  // ---------------------------------------------------------------- capture
  capture(target, amount, opts, blocked) {
    const src = opts && opts.src;
    if (!src || src !== this.g.player) return;
    if (target && target._labSled) {                       // scoring a moving target
      if (this.drill === 'targets' && target.hp - amount <= 0) this.score++;
    }
    if (!this.dummy || target !== this.dummy) return;
    const kb = opts && opts.kb ? Math.hypot(opts.kb.x || 0, opts.kb.y || 0, opts.kb.z || 0) : 0;
    this.telemetry.record({
      label: this._labelFor(src, opts),
      dmg: +(+amount || 0).toFixed(1),
      dtype: (opts && opts.dtype) || 'physical',
      dmgClass: (opts && opts.dmgClass) || (opts && opts.strike ? 'strike' : opts && opts.slam ? 'slam' : 'blast'),
      kb: +kb.toFixed(1),
      blocked: !!blocked, dot: !!(opts && opts.dot),
      speed: +((src._momSpd != null ? src._momSpd : Math.hypot(src.vel.x, src.vel.y, src.vel.z)) || 0).toFixed(1),
      ki: this._kiFor(src, opts),
      t: this.g.matchT || 0,
    });
    this._boardT = 0;
  }
  // ⚠ nothing is stamped onto the combat hot path for this: runSlot already writes c._lastSlot
  _slotOf(src) { const k = src && src._lastSlot, s = k && src.slots && src.slots[k]; return s && s.def ? s.def : null; }
  _labelFor(src, opts) {
    if (opts && opts.strike && !opts.dmgClass) return (src._heavyT > 0 || (src.meleeCharge || 0) > 0.5) ? 'HAYMAKER' : 'JAB';
    if (opts && opts.slam) return 'SLAM';
    const d = this._slotOf(src);
    if (d && d.name) return d.name;
    if (opts && opts.dot) return 'DAMAGE OVER TIME';
    return opts && opts.strike ? 'STRIKE' : 'IMPACT';
  }
  _kiFor(src, opts) {
    if (opts && (opts.strike || opts.slam)) return 0;
    const d = this._slotOf(src);
    return d ? Math.round(d.cost || d.kiPerSec || 0) : 0;
  }

  // ---------------------------------------------------------------- tick
  update(dt) {
    if (!this.group) return;
    const g = this.g, p = g.player;
    this.drillT += dt;
    if (this._msgT > 0) this._msgT -= dt;

    // THE CEILING IS REAL — you cannot fly out of an indoor room
    if (p) {
      if (p.pos.y > CEIL) { p.pos.y = CEIL; if (p.vel.y > 0) p.vel.y = 0; }
      const lim = ROOM - 6;
      if (Math.abs(p.pos.x) > lim) { p.pos.x = Math.sign(p.pos.x) * lim; p.vel.x = 0; }
      if (Math.abs(p.pos.z) > lim) { p.pos.z = Math.sign(p.pos.z) * lim; p.vel.z = 0; }
    }

    // the dummy: immortal, and back on its mark when passive
    let d = this.dummy;
    if (!d || !d.alive || d.state === 'ko') {
      this._reviveT = (this._reviveT || 0) - dt;
      if (this._reviveT <= 0) { this._reviveT = 0.6; d = this.spawnDummy(); }
    } else {
      d.hp = d.maxHp;
      if (!this.aggressive) { d.vel.set(0, 0, 0); d.pos.x = 26; d.pos.z = 0; }
    }

    this._keepSafe();
    if (this.room === 'white') {
      if (this.drill === 'targets') this._tickSleds(dt);
      if (this.drill === 'evasion') this._tickTurrets(dt, p);
      if (this.drill === 'course') this._tickCourse(dt, p);
    }

    this._boardT -= dt;
    if (this._boardT <= 0) { this._boardT = 0.2; this._drawBoard(); }
    this._updateMirror(p);
  }

  // THE MIRROR (Robert's call). The board lives on the north wall, which means it is only readable
  // when you happen to be facing that way — and a readout you have to turn around for is a readout
  // you stop using. So: face the wall and the wall board IS the display; turn away and the same
  // canvas appears as a small panel in the screen corner. One canvas, two surfaces, never both
  // competing for your attention.
  _updateMirror(p) {
    if (!p || !this._boardCv) return;
    // are we looking at the north wall? the board sits at -Z, so aiming -Z means facing it
    const facing = (-p.aim3.z) > 0.25;
    if (facing === this._mirrorHidden) return;               // only touch the DOM on a change
    this._mirrorHidden = facing;
    let el = this._mirrorEl;
    if (!el) {
      el = document.createElement('div');
      el.id = 'labMirror';
      // ⚠ TOP-LEFT, not top-right. The right rail already carries the radar AND the controls panel,
      // and a 300px readout dropped straight on top of the latter — two dense text blocks fighting
      // for the same pixels. Top-left is the only quadrant the HUD leaves empty (the player panel
      // is bottom-left, the stick area below that).
      el.style.cssText = 'position:fixed;left:14px;top:14px;width:300px;z-index:19;' +
        'border:2px solid rgba(255,210,74,.55);border-radius:4px;overflow:hidden;' +
        'box-shadow:0 6px 20px rgba(0,0,0,.55);pointer-events:none;transition:opacity .18s';
      this._boardCv.style.cssText = 'display:block;width:100%;height:auto';
      el.appendChild(this._boardCv);                          // the SAME canvas the wall samples
      document.body.appendChild(el);
      this._mirrorEl = el;
    }
    el.style.opacity = facing ? '0' : '1';
  }

  _tickSleds(dt) {
    for (const s of this.sleds) {
      if (!s.f || !s.f.alive) {                       // knocked out: respawn on a beat
        s.downT -= dt;
        if (s.downT <= 0) { s.downT = 1.1; s.x = -60 + Math.random() * 120; this._spawnSled(s); }
        continue;
      }
      s.x += s.dir * s.spd * dt;
      if (s.x > 62) { s.x = 62; s.dir = -1; }
      if (s.x < -62) { s.x = -62; s.dir = 1; }
      const f = s.f;
      f.hp = Math.min(f.hp, f.maxHp);
      f.pos.set(s.x, s.y, s.z); f.vel.set(0, 0, 0);
      f.facing = Math.atan2(-s.dir, 0);
    }
  }

  // THE DODGE DRILL. Each turret telegraphs before it fires — a training hall that shoots you with
  // no warning teaches nothing except to stand still. The shot itself is a REAL projectile through
  // the real system, so guarding, evading, deflecting and phasing all work exactly as they do in a
  // match.
  _tickTurrets(dt, p) {
    if (!p || !p.alive) return;
    const g = this.g;
    for (const t of this.turrets) {
      if (t.tel > 0) {
        t.tel -= dt;
        t.eye.material = this.M.gold;
        if (t.tel <= 0) {
          t.eye.material = this.M.live;
          const lead = 0.34;
          const tx = p.pos.x + p.vel.x * lead, ty = p.pos.y + 4.5, tz = p.pos.z + p.vel.z * lead;
          const v = new THREE.Vector3(tx - t.x, ty - t.y, tz - t.z).setLength(62);
          try {
            g.projectiles.spawnProjectile(this.dummy, {
              pos: new THREE.Vector3(t.x, t.y, t.z), vel: v,
              radius: 1.5, damage: 6, blast: 4, power: 0.7,
              color: '#7fe6ff', color2: '#ffffff', dtype: 'energy',
            });
            g.audio && g.audio.zap && g.audio.zap(680, { x: t.x, y: t.y, z: t.z });
          } catch (e) {}
        }
      } else {
        t.cd -= dt;
        if (t.cd <= 0) { t.cd = 1.7 + Math.random() * 1.4; t.tel = 0.55; }
      }
    }
  }

  _tickCourse(dt, p) {
    if (!p) return;
    const r = this.rings[this.ring]; if (!r) return;
    const q = r.mesh.position;
    if (Math.hypot(p.pos.x - q.x, p.pos.y - q.y, p.pos.z - q.z) < 11) {
      r.mesh.material = this.M.steel;
      this.ring++;
      this.score++;
      if (this.ring >= this.rings.length) {
        this._flash(`COURSE CLEAR — ${this.drillT.toFixed(1)}s`);
        this.g.hud && this.g.hud.announce && this.g.hud.announce('COURSE CLEAR', this.drillT.toFixed(1) + 's', '#ffd24a');
        this.ring = 0; this.drillT = 0;
        for (const rr of this.rings) rr.mesh.material = this.M.steel;
      }
      const nx = this.rings[this.ring];
      if (nx) nx.mesh.material = this.M.gold;
    }
  }

  // called from game.onHit when the PLAYER is the one taking it
  noteHitTaken() { if (this.drill === 'evasion') this.taken++; }
  // THE BLUE ROOM'S PROMISE, enforced rather than merely intended: hp is restored every frame, so
  // whatever you set off in here — your own nova, a thrown car, a bad landing — cannot end you.
  // ⚠ RESTORING HEALTH IS NOT IMMORTALITY. The first version pinned hp back to full every frame,
  // which looks identical right up until one hit is bigger than the whole bar: the KO happens
  // INSIDE takeDamage, before any per-frame repair can run, so the player ended the barrage at
  // full health and dead. The engine already has the right switch — `invuln`, the same one a
  // respawn and a teleport-escape use, checked at the top of takeDamage — so the blue room simply
  // holds it down. Nothing lands, so nothing can accumulate into a knockout.
  _keepSafe() {
    const p = this.g.player;
    if (!p || this.room !== 'blue') return;
    p.invuln = Math.max(p.invuln, 0.2);
    if (p.hp < p.maxHp) p.hp = p.maxHp;
    if (p.downedT > 0) { p.downedT = 0; p.staggerT = 0; }
    p.stunT = 0; p.frozenT = 0;
  }

  // ---------------------------------------------------------------- the board
  _drawBoard() {
    const cv = this._boardCv; if (!cv) return;
    const x = cv.getContext('2d');
    const T = this.telemetry, L = T.last;
    // ⚠ Canvas 2D cannot read CSS tokens — every colour here is a literal on purpose.
    const INK = '#14120e', GOLD = '#ffd24a', DIM = '#8b8577', PAPER = '#f7f4ec', RED = '#ff5a4a', CY = '#7fe6ff';
    const D = DRILLS.find(d => d.id === this.drill) || DRILLS[0];
    x.fillStyle = INK; x.fillRect(0, 0, 1024, 512);
    x.fillStyle = GOLD; x.fillRect(0, 0, 1024, 8);

    const blue = this.room === 'blue';
    x.font = '700 20px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM;
    x.fillText('THRESHOLD TREATY OFFICE  ·  TRAINING HALL', 26, 44);
    x.textAlign = 'right'; x.fillStyle = blue ? CY : GOLD;
    x.fillText(blue ? 'THE BLUE ROOM' : 'THE WHITE ROOM  ·  ' + D.name, 998, 44); x.textAlign = 'left';

    // drill state band
    x.fillStyle = '#201c16'; x.fillRect(26, 58, 972, 74);
    const stat = (cx, label, val, col) => {
      x.font = '700 16px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM; x.fillText(label, cx, 84);
      x.font = '800 40px Rajdhani, Inter, sans-serif'; x.fillStyle = col || PAPER; x.fillText(val, cx, 124);
    };
    if (blue)                          { stat(44, 'STATUS', 'NOTHING CAN HURT YOU', CY); }
    else if (this.drill === 'targets') { stat(44, 'TARGETS DOWN', String(this.score), GOLD); stat(300, 'TIME', this.drillT.toFixed(0) + 's'); }
    else if (this.drill === 'evasion') { stat(44, 'HITS TAKEN', String(this.taken), this.taken ? RED : GOLD); stat(300, 'SURVIVED', this.drillT.toFixed(0) + 's'); }
    else if (this.drill === 'course')  { stat(44, 'GATE', `${this.ring + 1}/${this.rings.length}`, CY); stat(300, 'CLOCK', this.drillT.toFixed(1) + 's'); }
    else if (this.drill === 'sparring'){ stat(44, 'DUMMY', 'FIGHTING BACK', RED); }
    else                               { stat(44, 'DUMMY', 'PASSIVE', CY); }
    x.font = '600 17px Inter, sans-serif'; x.fillStyle = DIM;
    x.textAlign = 'right';
    x.fillText(blue ? 'WALK TO THE CONSOLE TO OPEN THE WHITE ROOM   ·   SHIFT+R: CLEAR'
                    : 'CONSOLE: CHANGE DRILL   ·   N: DUMMY   ·   SHIFT+R: CLEAR', 998, 122);
    x.textAlign = 'left';

    if (this._msgT > 0 && this._msg) {
      x.font = '800 26px Rajdhani, Inter, sans-serif'; x.fillStyle = GOLD;
      x.fillText(this._msg.slice(0, 58), 26, 172);
    }

    if (!L) {
      if (blue) {
        // THE BOARD IS THE TUTOR IN HERE. The one thing a first-time player needs is not a damage
        // table, it is the buttons — and a wall you can read while standing still beats a hint
        // panel you dismissed. Bindings come from the LIVE keymap, so it cannot print a key the
        // player's scheme doesn't use.
        const K = this._keys();
        x.font = '800 38px Rajdhani, Inter, sans-serif'; x.fillStyle = PAPER;
        x.fillText('TAKE YOUR TIME', 26, 214);
        x.font = '400 20px Inter, sans-serif'; x.fillStyle = DIM;
        x.fillText('Two floors, a ramp, and a bag. No turrets, no opponent, no way to lose.', 26, 246);
        const rows = [
          ['W A S D', 'move — W goes where the mouse points'],
          ['MOUSE', 'aim · LMB / RMB / Q / E fire your powers'],
          ['V', 'punch — hold it for a haymaker'],
          [K.guard, 'guard · hold it with nobody near to charge ki'],
          ['G', 'grab — and pick things up'],
          ['F  ·  ' + K.up + ' / ' + K.down, 'flight on, then up and down'],
        ];
        let ry = 292;
        for (const [k, what] of rows) {
          x.font = '800 22px Rajdhani, Inter, sans-serif'; x.fillStyle = GOLD;
          x.fillText(k, 30, ry);
          x.font = '400 21px Inter, sans-serif'; x.fillStyle = PAPER;
          x.fillText(what, 250, ry);
          ry += 34;
        }
        this._boardTex.needsUpdate = true; return;
      }
      x.font = '800 40px Rajdhani, Inter, sans-serif'; x.fillStyle = PAPER;
      x.fillText('HIT SOMETHING', 26, 236);
      x.font = '400 21px Inter, sans-serif'; x.fillStyle = DIM;
      x.fillText('Every landed attack is measured at the damage choke point and compared here.', 26, 272);
      this._boardTex.needsUpdate = true; return;
    }

    x.font = '800 27px Rajdhani, Inter, sans-serif'; x.fillStyle = GOLD;
    x.fillText(String(L.label).toUpperCase().slice(0, 28), 26, 208);
    x.font = '800 84px Rajdhani, Inter, sans-serif'; x.fillStyle = L.blocked ? DIM : PAPER;
    x.fillText(L.dmg.toFixed(1), 26, 282);
    x.font = '700 18px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM;
    x.fillText('DAMAGE' + (L.ticks > 1 ? `  ·  ${L.ticks} TICKS` : '') + (L.blocked ? '  ·  BLOCKED' : ''), 28, 306);

    const cell = (cx, label, val, hot) => {
      x.font = '700 15px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM; x.fillText(label, cx, 226);
      x.font = '800 30px Rajdhani, Inter, sans-serif'; x.fillStyle = hot ? GOLD : PAPER; x.fillText(val, cx, 258);
    };
    cell(330, 'TYPE', String(L.dtype).toUpperCase());
    cell(530, 'KNOCKBACK', L.kb ? L.kb.toFixed(0) + 'u' : '—');
    cell(730, 'CONTACT', L.speed ? L.speed.toFixed(0) + ' u/s' : '—', L.speed > 26);
    cell(900, 'KI', L.ki ? String(L.ki) : '—');

    const rows = T.table();
    x.fillStyle = '#2a2620'; x.fillRect(26, 326, 972, 2);
    x.font = '700 16px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM; x.fillText('BEST BY ATTACK', 26, 352);
    x.textAlign = 'right'; x.fillText(`${T.shots} HITS  ·  Σ ${Math.round(T.total)}`, 998, 352); x.textAlign = 'left';
    const max = rows.length ? rows[0].dmg : 1;
    let y = 380;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const r = rows[i], w = Math.max(3, (r.dmg / max) * 600);
      x.fillStyle = i === 0 ? GOLD : '#4a453c'; x.fillRect(320, y - 14, w, 18);
      x.font = '700 19px Rajdhani, Inter, sans-serif';
      x.fillStyle = r.label === L.label ? GOLD : PAPER; x.fillText(String(r.label).slice(0, 22), 26, y);
      x.font = '800 19px Rajdhani, Inter, sans-serif'; x.fillStyle = PAPER;
      x.textAlign = 'right'; x.fillText(r.dmg.toFixed(1), 990, y); x.textAlign = 'left';
      y += 26;
    }
    this._boardTex.needsUpdate = true;
  }
}
