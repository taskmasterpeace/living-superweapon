// THE BASE, BUILT — the facility grid raised as a walkable indoor space.
//
// Robert: "make sure we can have characters in the base that we build. Layout should match what we
// built — think XCOM, indoor, no destructible environment."
//
// ⚠ THE LAYOUT IS THE DATA. Every wall in here is a consequence of `data/base.js` — a room exists
// because a slot is dug, a doorway exists because two dug rooms touch, a room is dark because
// nobody is assigned to it. Nothing is authored twice. Walk the base and you are reading the grid.
//
// ⚠ NOTHING HERE IS DESTRUCTIBLE (`hp: 1e9`, the training-hall idiom). This is not decoration: the
// city's destruction model assumes cover can be shattered and removed from `world.cover`, and a
// base that can be knocked down by its own occupants would delete the rooms you paid weeks for.
// The one thing that should threaten a base is a RAID, which is a designed event, not stray splash.
//
// ⚠ IT REUSES THE TRAINING HALL'S CONSTRUCTION, deliberately — "layout should match what we built".
// Same materials, same wall thickness, same ceiling-beam restraint (an isometric camera looks
// THROUGH a ceiling at a shallow angle, so anything up there is drawn across the whole frame).

import * as THREE from 'three';
import { COLS, ROWS, SLOTS, ENTRANCE, idx, colOf, rowOf, baseState, facilityById, staffed } from '../data/base.js';

const ROOM = 58, CORR = 18, PITCH = ROOM + CORR;
const WALL_H = 30, WALL_T = 3, CEIL = 34;

// floor accent by what the room is FOR — one hue family per kind, so you read the base's shape
// from the floor at a glance rather than by reading every sign.
const KIND_COLOR = { core: '#f5b21a', life: '#5fbf7a', work: '#6aa8e8', built: '#e0803a' };

export class BaseRoom {
  constructor(game) {
    this.game = game; this.world = game.world;
    this._meshes = []; this._cover = []; this._mats = []; this._geos = [];
    this._occupants = [];
    this.open();
  }

  _add(mesh) { this.world.scene.add(mesh); this._meshes.push(mesh); return mesh; }
  _mat(o) { const m = new THREE.MeshStandardMaterial(o); this._mats.push(m); return m; }
  _geo(g) { this._geos.push(g); return g; }

  // a solid, permanent block — the base's own cover contract
  _solid(mesh, x, z, w, d, h, top) {
    const co = { mesh, crack: null, x, z, r: Math.max(w, d) * 0.6, h, hx: w / 2, hz: d / 2,
                 top: top ?? h, hp: 1e9, maxHp: 1e9, y0: h / 2, w, d, destroyed: false, _base: true };
    this.world.cover.push(co); this.world.coverAll.push(co); this._cover.push(co);
    return co;
  }

  centreOf(slot) {
    return { x: (colOf(slot) - (COLS - 1) / 2) * PITCH, z: (rowOf(slot) - (ROWS - 1) / 2) * PITCH };
  }

  open() {
    const W = this.world, b = baseState();
    this.b = b;
    // ⚠ THE CITY IS STILL THERE. `startMode` calls `world.setSim(id === 'training')`, so any mode
    // that is not the Danger Room BUILDS THE REAL CITY — a base would otherwise be a bunker sitting
    // inside a downtown. The training hall solves this by hiding the scene, and so does this: hide
    // every scene child that is not ours, a light, a camera, or a live system, and put every one of
    // them back in close() exactly as found. Hiding, not removing — the theater you travelled to
    // must be untouched when you leave.
    this._hidden = [];
    const hide = (m) => { if (m && m.visible) { this._hidden.push(m); m.visible = false; } };
    const keep = new Set();
    for (const e of this.game.entities) if (e && e.obj) keep.add(e.obj);
    if (this.game.particles && this.game.particles.points) keep.add(this.game.particles.points);
    this._keep = keep;
    for (const child of W.scene.children) {
      if (keep.has(child) || child.isLight || child.isCamera) continue;
      hide(child);
    }
    for (const m of (W._cityBits || [])) hide(m);
    for (const m of (W._roadMeshes || [])) hide(m);
    // ⚠ AND THE PROPS, not just the pixels. propInReach walks the world's cars/planes/rocks/tree
    // arrays, not the scene — the training hall paid for this with a "G HOIST" prompt for an
    // invisible car two hundred units away. Stash and restore.
    this._props = { cars: W.cars, planes: W.planes, rocks: W.rocks, trees: W.treeSpots };
    W.cars = []; W.planes = []; W.rocks = []; W.treeSpots = [];
    W.setFogEnabled && W.setFogEnabled(false);

    // ⚠ AN INDOOR ROOM MAKES ITS OWN LIGHT. The first pass inherited the world's sun and rendered
    // very nearly black — every assertion still passed, because no assertion can see "too dark".
    // One HemisphereLight, exactly as the training hall does it, added on open and removed on
    // close. ⚠ This changes the scene's light COUNT, which forces a material recompile (the
    // light-count law) — acceptable ONCE at a mode transition, never per frame.
    const lamp = new THREE.HemisphereLight(0xf6ecd9, 0x2a241c, 1.15);
    lamp.position.set(0, CEIL + 20, 0);
    this._add(lamp);
    this._lamp = lamp;

    const floorM = this._mat({ color: '#4a443a', roughness: 0.92, metalness: 0.03 });
    const wallM  = this._mat({ color: '#615949', roughness: 0.85, metalness: 0.06 });
    const steelM = this._mat({ color: '#8a8177', roughness: 0.55, metalness: 0.35 });
    const rockM  = this._mat({ color: '#241f19', roughness: 1.0,  metalness: 0.0 });

    // THE BEDROCK the base is cut into — one slab under everything, so unbuilt slots read as
    // undug rock rather than as a hole you can fall through.
    const bw = COLS * PITCH + 60, bd = ROWS * PITCH + 60;
    const rock = this._add(new THREE.Mesh(this._geo(new THREE.BoxGeometry(bw, 8, bd)), rockM));
    rock.position.set(0, -4, 0); rock.receiveShadow = true;

    for (let s = 0; s < SLOTS; s++) {
      const rm = b.rooms[s];
      if (!rm) continue;                              // undug: bedrock, nothing to build
      const { x, z } = this.centreOf(s);
      const f = facilityById(rm.fid) || { n: '?', kind: 'core' };
      const lit = rm.built && staffed(s, b);

      // FLOOR — an accent inlay says what the room is for. ⚠ DECAL_LIFT is not needed here because
      // the inlay is a SEPARATE, SMALLER slab sitting in a recess, not a decal laid on the floor:
      // the floor slab is ROOM wide and the inlay is ROOM-16, so they never share a plane.
      const fl = this._add(new THREE.Mesh(this._geo(new THREE.BoxGeometry(ROOM, 2, ROOM)), floorM));
      fl.position.set(x, -1, z); fl.receiveShadow = true;
      const accent = this._mat({ color: KIND_COLOR[f.kind] || '#f5b21a',
        roughness: 0.7, emissive: KIND_COLOR[f.kind] || '#f5b21a',
        // ⚠ TONED DOWN AFTER LOOKING AT IT. At 0.85 the gold core accent bloomed through the
        // composer and washed out the whole corner of the base — an emissive floor panel is a
        // FLOOR, not a light source. No assertion catches a blowout; only the screenshot does.
        emissiveIntensity: rm.built ? (lit ? 0.34 : 0.12) : 0.06 });
      const in2 = this._add(new THREE.Mesh(this._geo(new THREE.BoxGeometry(ROOM - 16, 2.4, ROOM - 16)), accent));
      in2.position.set(x, -0.6, z);

      // WALLS, with a DOORWAY toward every dug neighbour. This is the whole "layout is the data"
      // idea in one loop: you cannot build a door, you build a room next door and the door appears.
      const c = colOf(s), r = rowOf(s);
      const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dc, dr] of sides) {
        const c2 = c + dc, r2 = r + dr;
        const inside = c2 >= 0 && c2 < COLS && r2 >= 0 && r2 < ROWS;
        const open = inside && !!b.rooms[idx(c2, r2)];
        const wx = x + dc * (ROOM / 2), wz = z + dr * (ROOM / 2);
        const along = dc ? 'z' : 'x';
        if (!open) {                                   // a solid wall
          const w2 = dc ? WALL_T : ROOM + WALL_T, d2 = dc ? ROOM + WALL_T : WALL_T;
          const m = this._add(new THREE.Mesh(this._geo(new THREE.BoxGeometry(w2, WALL_H, d2)), wallM));
          m.position.set(wx, WALL_H / 2, wz); m.castShadow = true; m.receiveShadow = true;
          this._solid(m, wx, wz, w2, d2, WALL_H);
        } else {                                       // two stubs and a gap = a doorway
          const gap = 20;
          for (const sgn of [-1, 1]) {
            const len = (ROOM - gap) / 2, off = sgn * (gap / 2 + len / 2);
            const w2 = dc ? WALL_T : len, d2 = dc ? len : WALL_T;
            const px = wx + (along === 'x' ? off : 0), pz = wz + (along === 'z' ? off : 0);
            const m = this._add(new THREE.Mesh(this._geo(new THREE.BoxGeometry(w2, WALL_H, d2)), wallM));
            m.position.set(px, WALL_H / 2, pz); m.castShadow = true; m.receiveShadow = true;
            this._solid(m, px, pz, w2, d2, WALL_H);
          }
          // a lintel over the opening, so a doorway reads as a doorway and not a missing wall
          const lw = dc ? WALL_T : gap, ld = dc ? gap : WALL_T;
          const lin = this._add(new THREE.Mesh(this._geo(new THREE.BoxGeometry(lw, 5, ld)), steelM));
          lin.position.set(wx, WALL_H - 2.5, wz);
        }
      }

      // THE SIGN — the room says what it is, and an unfinished room says how long is left.
      const label = rm.built ? f.n : f.n + '  ·  ' + rm.weeksLeft + 'w';
      const sign = this._signMesh(label, rm.built ? (lit ? '#ffd24a' : '#8b8577') : '#e0803a');
      sign.position.set(x, 17, z - ROOM / 2 + 3.2);
      this._add(sign);

      // ⚠ THE CEILING IS THREE THIN BEAMS, not a slab — the training hall's lesson. An isometric
      // camera looks THROUGH a ceiling plane at a shallow angle, so a slab is drawn across the
      // entire frame and reads as a lid over the game rather than as a roof over the room.
      for (let i = -1; i <= 1; i++) {
        const bm = this._add(new THREE.Mesh(this._geo(new THREE.BoxGeometry(ROOM, 1.6, 3)), steelM));
        bm.position.set(x, CEIL, z + i * (ROOM / 3)); bm.castShadow = false;
      }
    }

    // CORRIDOR FLOORS between dug neighbours, so you are not walking on bedrock between rooms
    for (let s = 0; s < SLOTS; s++) {
      if (!b.rooms[s]) continue;
      const c = colOf(s), r = rowOf(s);
      for (const [dc, dr] of [[1, 0], [0, 1]]) {
        const c2 = c + dc, r2 = r + dr;
        if (c2 >= COLS || r2 >= ROWS || !b.rooms[idx(c2, r2)]) continue;
        const { x: x1, z: z1 } = this.centreOf(s), { x: x2, z: z2 } = this.centreOf(idx(c2, r2));
        const fl = this._add(new THREE.Mesh(this._geo(new THREE.BoxGeometry(dc ? CORR + 4 : 22, 2, dc ? 22 : CORR + 4)), floorM));
        fl.position.set((x1 + x2) / 2, -1, (z1 + z2) / 2); fl.receiveShadow = true;
      }
    }
    this._populate();
  }

  // a canvas sign — literals only, canvas 2d cannot read CSS tokens (the map-maker lesson)
  _signMesh(text, color) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const x = cv.getContext('2d');
    x.fillStyle = 'rgba(14,12,9,0.9)'; x.fillRect(0, 0, 512, 96);
    x.strokeStyle = color; x.lineWidth = 4; x.strokeRect(4, 4, 504, 88);
    x.font = '700 40px Rajdhani, system-ui, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color;
    x.fillText(text, 256, 50);
    const tex = new THREE.CanvasTexture(cv);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    this._mats.push(m); this._signTex = this._signTex || []; this._signTex.push(tex);
    const g = this._geo(new THREE.PlaneGeometry(30, 5.6));
    return new THREE.Mesh(g, m);
  }

  // ---- THE PEOPLE IN IT ---------------------------------------------------------------------
  // "make sure we can have characters in the base that we build". A base with nobody in it is a
  // floor plan. ⚠ Everyone here is on the PLAYER'S TEAM, so `isFoe` is false both ways and nobody
  // throws a punch — this is a place you walk through, not an arena.
  _populate() {
    const g = this.game, b = this.b;
    const ROSTER = (window.LSW && window.LSW.ROSTER) || [];
    const placed = [];
    for (let s = 0; s < SLOTS; s++) {
      const rm = b.rooms[s];
      if (!rm || !rm.built) continue;
      const { x, z } = this.centreOf(s);
      const crew = (rm.staff || []).length;
      const n = Math.min(3, crew || (s === ENTRANCE ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const def = ROSTER[(s * 7 + i * 3) % Math.max(1, ROSTER.length)];
        if (!def) continue;
        // ⚠ addFighter is the real API (there is no spawnFighter), and the TEAM must be the
        // player's own — spawnRival uses team 1 precisely because that is the hostile side. An
        // occupant on the wrong team is an ambush in your own kitchen.
        const team = (g.player && g.player.team != null) ? g.player.team : 0;
        const f = g.addFighter(def, { team, x: x + (i - 1) * 12, z: z + (i % 2 ? 8 : -8) });
        if (!f) continue;
        f.ai = null;                                  // no AI: an occupant, not a combatant
        f._baseOccupant = true;
        placed.push(f);
      }
    }
    this._occupants = placed;
    // the player arrives at the lift
    const p = g.humans[0] && g.humans[0].fighter;
    if (p) { const c = this.centreOf(ENTRANCE); p.pos.set(c.x, 0, c.z + 14); p.aim.set(0, 0, -1); p.aim3.set(0, 0, -1); }
  }

  update(dt) {
    // the ceiling is a hard lid — you cannot fly out of your own basement
    for (const e of this.game.entities) if (e.pos && e.pos.y > CEIL - 6) {
      e.pos.y = CEIL - 6; if (e.vel && e.vel.y > 0) e.vel.y = 0;
    }
  }

  close() {
    const W = this.world;
    for (const m of this._hidden || []) m.visible = true;      // put the world back exactly as found
    this._hidden = [];
    if (this._props) { W.cars = this._props.cars; W.planes = this._props.planes;
                       W.rocks = this._props.rocks; W.treeSpots = this._props.trees; this._props = null; }
    W.setFogEnabled && W.setFogEnabled(true);
    for (const m of this._meshes) { W.scene.remove(m); }
    for (const g of this._geos) g.dispose();
    for (const m of this._mats) m.dispose();
    for (const t of (this._signTex || [])) t.dispose();
    // ⚠ the cover records must leave world.cover AND coverAll, or the next match inherits invisible
    // walls — the reset law, and the exact failure mode the training hall paid for.
    for (const co of this._cover) {
      let i = W.cover.indexOf(co); if (i >= 0) W.cover.splice(i, 1);
      i = W.coverAll.indexOf(co); if (i >= 0) W.coverAll.splice(i, 1);
    }
    W.refreshFogBoxes && W.refreshFogBoxes();
    this._meshes = []; this._cover = []; this._mats = []; this._geos = []; this._signTex = [];
    this._occupants = [];
  }
}
