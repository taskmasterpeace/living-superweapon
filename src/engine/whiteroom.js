// THE WHITE ROOM — a clean test chamber with an instrumented dummy.
//
// The Danger Room's other half. Training mode is a sandbox in a real city; this is a laboratory:
// no city, no crowd, no weather, no police — a white box, a dummy, and a wall board that reports
// exactly what your attacks did.
//
// THE MEASUREMENT LAW: every number on the board is captured at `game.onHit`, which is the choke
// point every damage source in the game already routes through. Nothing here recomputes damage
// from an ability's data — it reports what the engine actually applied, after armour, resistance,
// guard and momentum. A training readout that models its own damage is a readout that lies the
// first time someone edits the pipeline.
//
// The board is drawn INTO THE WORLD on the far wall, not into the HUD, because the ask was that
// people in the room with you can read it off the monitor. Big type, four columns, no chrome.
import * as THREE from 'three';

// ⚠ Sized against the MATCH CAMERA, not against a floorplan. At 150 the chamber was bigger than
// the camera's view, so the board on the far wall sat permanently off-screen and the room read as
// a white void. 90 puts the dummy, the player and the board in frame together at the game's own
// isometric framing — which is the whole requirement: readable from across a real room.
const ROOM = 90, WALL_H = 54;
const KEEP = 12;                     // distinct attacks held for comparison

// ---------------------------------------------------------------------------------------------
// TELEMETRY — one record per landed attack, plus a best-of table for comparing them
// ---------------------------------------------------------------------------------------------
export class Telemetry {
  constructor() { this.reset(); }
  reset() {
    this.last = null;
    this.log = [];                   // newest first, capped
    this.best = new Map();           // label -> best record
    this.shots = 0; this.total = 0;
  }
  // ⚠ THE BURST RULE. A discrete punch lands once for 8; a beam lands sixty times for 1. Filed as
  // separate records the board would rank the punch above the beam, which is exactly backwards and
  // makes the comparison table worse than useless. Consecutive hits from the SAME attack inside a
  // short window are one BURST, and the burst's total is what gets compared — so a sustained
  // weapon is measured by what it actually did to the target, like everything else.
  record(rec) {
    const BURST = 0.35;
    const cur = this.last;
    if (cur && cur.label === rec.label && (rec.t - cur.tEnd) < BURST) {
      cur.tEnd = rec.t; cur.ticks++;
      cur.dmg = +(cur.dmg + rec.dmg).toFixed(1);
      cur.kb = Math.max(cur.kb, rec.kb);
      cur.speed = Math.max(cur.speed, rec.speed);
      cur.blocked = cur.blocked && rec.blocked;
      this.shots++; this.total += rec.dmg;
      const p0 = this.best.get(cur.label);
      if (!p0 || cur.dmg > p0.dmg) this.best.set(cur.label, cur);
      return;
    }
    rec.tEnd = rec.t; rec.ticks = 1;
    this.last = rec;
    this.shots++; this.total += rec.dmg;
    this.log.unshift(rec);
    if (this.log.length > 40) this.log.length = 40;
    const prev = this.best.get(rec.label);
    if (!prev || rec.dmg > prev.dmg) this.best.set(rec.label, rec);
    if (this.best.size > KEEP) {                       // drop the weakest to keep the board readable
      let worstK = null, worstV = Infinity;
      for (const [k, v] of this.best) if (v.dmg < worstV) { worstV = v.dmg; worstK = k; }
      if (worstK !== rec.label) this.best.delete(worstK);
    }
  }
  table() { return [...this.best.values()].sort((a, b) => b.dmg - a.dmg); }
}

// ---------------------------------------------------------------------------------------------
// THE ROOM
// ---------------------------------------------------------------------------------------------
export class WhiteRoom {
  constructor(game) {
    this.g = game;
    this.telemetry = new Telemetry();
    this.group = null;
    this.dummy = null;
    this.aggressive = false;          // the toggle: a punching bag, or a sparring partner
    this._boardCv = null; this._boardTex = null; this._boardT = 0;
    this._prevFog = null;
  }

  // ---- build ----
  open() {
    const g = this.g, W = g.world;
    if (this.group) this.close();
    const grp = new THREE.Group();
    this.group = grp;

    // ⚠ NOT actually white. A #f2f0ea box under the scene lights AND the bloom pass came back
    // completely blown out — the walls clipped and both fighters read as pale ghosts against them.
    // A test chamber has to make the SUBJECT the brightest thing in frame, so the walls sit at a
    // light grey and let the characters and their effects be what the eye lands on.
    const wallMat = new THREE.MeshStandardMaterial({ color: '#cfcbc2', roughness: 0.96, metalness: 0 });
    const floorMat = new THREE.MeshStandardMaterial({ color: '#c2beb5', roughness: 0.94, metalness: 0 });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#14120e', roughness: 0.8, metalness: 0 });
    this._mats = [wallMat, floorMat, trimMat];

    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.06; floor.receiveShadow = true;
    grp.add(floor);

    // a calibration grid so distance and knockback are READABLE, not just numbers on a wall
    const grid = new THREE.GridHelper(ROOM * 2, 20, 0x14120e, 0xbdb9b0);
    grid.position.y = 0.09; grid.material.opacity = 0.30; grid.material.transparent = true;
    grp.add(grid);
    this._grid = grid;

    // four walls
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, WALL_H, 3), wallMat);
      const a = i * Math.PI / 2;
      w.position.set(Math.sin(a) * ROOM, WALL_H / 2, Math.cos(a) * ROOM);
      w.rotation.y = a; w.receiveShadow = true;
      grp.add(w);
      // a dark skirting line gives the eye a horizon in an all-white box
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 1.6, 3.4), trimMat);
      skirt.position.copy(w.position).setY(0.8); skirt.rotation.y = a;
      grp.add(skirt);
    }

    // THE BOARD — a canvas on the north wall, sized to be read from across a room
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
    this._boardCv = cv;
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8;
    this._boardTex = tex;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(104, 52),
      new THREE.MeshBasicMaterial({ map: tex }));                 // unlit: a screen is not lit by the sun
    board.position.set(0, 29, -ROOM + 2.2);
    grp.add(board);
    this._board = board;
    this._drawBoard();

    // a gentle fill only — the scene's own key light is already doing the work, and stacking a
    // bright hemisphere on top of it is what clipped the walls in the first place
    const lamp = new THREE.HemisphereLight(0xffffff, 0xb9b5ac, 0.35);
    grp.add(lamp); this._lamp = lamp;

    // ⚠ HIDE THE CITY. Building a white box inside a live city leaves the city standing around it —
    // the first version photographed a wall with Tokyo behind it. The lab hides the world's own
    // meshes and puts them back on close, rather than tearing the city down, so leaving the room
    // costs nothing and the theater you travelled to is still there when you go back to it.
    this._hidden = [];
    for (const child of g.scene.children) {
      if (child === grp || child.isLight || child.isCamera) continue;
      const big = child.isGroup && child.children.length > 6;      // the arena group
      const isGround = child === W.ground || child === W.groundMesh;
      if (big || isGround) { if (child.visible) { this._hidden.push(child); child.visible = false; } }
    }
    for (const m of (W._cityBits || [])) if (m && m.visible) { this._hidden.push(m); m.visible = false; }
    for (const m of (W._roadMeshes || [])) if (m && m.visible) { this._hidden.push(m); m.visible = false; }
    // street furniture and wildlife live on the scene in their own right — disabling the wildlife
    // TICK stops them moving but leaves 64 birds hanging in the air inside a sealed test chamber
    for (const c of (W.cars || [])) { const m = c && (c.mesh || c.obj || c); if (m && m.visible) { this._hidden.push(m); m.visible = false; } }
    if (W.wildlife) for (const m of [W.wildlife.birds, W.wildlife.litter])
      if (m && m.visible) { this._hidden.push(m); m.visible = false; }

    g.scene.add(grp);
    this._prevFog = W.fogEnabled;
    W.setFogEnabled(false);
    if (W.wildlife) W.wildlife.enabled = false;
    if (g.peds) { if (g.peds.mesh) g.peds.mesh.visible = false; if (g.peds.head) g.peds.head.visible = false; }
    this.spawnDummy();
    return this;
  }

  close() {
    const g = this.g, W = g.world;
    if (this.group) {
      g.scene.remove(this.group);
      this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      for (const m of (this._mats || [])) m.dispose();
      if (this._board) this._board.material.dispose();
      if (this._boardTex) this._boardTex.dispose();
      this.group = null; this._board = null; this._boardTex = null; this._boardCv = null;
    }
    for (const m of (this._hidden || [])) if (m) m.visible = true;    // the city was only hidden, never torn down
    this._hidden = null;
    if (this._prevFog != null) W.setFogEnabled(this._prevFog);
    if (W.wildlife) W.wildlife.enabled = true;
    if (g.peds) { if (g.peds.mesh) g.peds.mesh.visible = true; if (g.peds.head) g.peds.head.visible = true; }
    this.dummy = null;
  }

  // ---- the dummy ----
  // ⚠ NOT game.spawnDummy(). That construct is authored to be a static bag — `speed: 0` and no
  // abilities — so giving it an AI produced a sparring partner that could not take a step. The lab
  // needs a dummy that can do both jobs, so it gets its own def: real legs, one honest jab, and a
  // guard it will actually raise, because measuring an attack against a raised guard is half the
  // reason to have the room.
  spawnDummy() {
    const g = this.g;
    const old = g.entities.find(e => e && e._labDummy);
    if (old) { try { g.scene.remove(old.obj); old.dispose && old.dispose(); } catch (e) {}
               const i = g.entities.indexOf(old); if (i >= 0) g.entities.splice(i, 1); }
    const def = {
      id: '_labdummy', name: 'TEST DUMMY', threat: 'Moderate',
      colors: { primary: '#2f6f86', secondary: '#1d4a5c', accent: '#7fe6ff', skin: '#8fd8ee' },
      hp: 100000, ki: 100, speed: 26, strength: 5, holo: true,
      meleeTiers: 2, guardType: 'block', flightTier: 0,
      abilities: {}, ai: { style: 'rusher', range: 14, aggro: 0.9, fly: 0 },
    };
    // ⚠ NOT `dummy: true`. That flag makes a fighter untargetable — `game.isFoe` returns false for
    // it, which is right for a sim construct nobody should shoot at, and fatal here: the sparring
    // AI never found a foe and stood still for twelve seconds. This is a real fighter kept alive by
    // pinning its health instead, which also means status effects land on it visibly — a bonus,
    // since watching your own bleed or stun take hold is exactly what a test chamber is for.
    const d = g.addFighter(def, { team: 1, x: 26, z: 0 });
    d._labDummy = true;
    d.maxHp = 100000; d.hp = d.maxHp;              // it never dies — this is a measuring instrument
    this.dummy = d;
    this.setAggressive(this.aggressive);
    return d;
  }

  // THE TOGGLE. Off: a punching bag that stands and takes it. On: it closes and throws hands, so
  // you can measure what an attack does against something that is actually fighting back —
  // guard, spacing and momentum all change the number.
  setAggressive(on) {
    this.aggressive = !!on;
    const d = this.dummy;
    if (!d) return this.aggressive;
    if (on) {
      d.speed = 26;
      if (!d.ai) { const { AI } = this._AI || {}; if (AI) d.ai = new AI(d, 1.1); }
    } else {
      d.speed = 0; d.ai = null;
      d.vel.set(0, 0, 0);
      d.pos.set(26, d.pos.y, 0);
    }
    return this.aggressive;
  }

  // ---- capture: called from game.onHit ----
  // `opts` is the same options object the damage source handed takeDamage, so everything here is
  // what the engine actually used — never a re-derivation.
  capture(target, amount, opts, blocked) {
    if (!this.dummy || target !== this.dummy) return;
    const src = opts && opts.src;
    if (!src || src !== this.g.player) return;
    const kb = opts && opts.kb ? Math.hypot(opts.kb.x || 0, opts.kb.y || 0, opts.kb.z || 0) : 0;
    const label = this._labelFor(src, opts);
    this.telemetry.record({
      label,
      dmg: +(+amount || 0).toFixed(1),
      dtype: (opts && opts.dtype) || 'physical',
      dmgClass: (opts && opts.dmgClass) || (opts && opts.strike ? 'strike' : opts && opts.slam ? 'slam' : 'blast'),
      kb: +kb.toFixed(1),
      launch: opts && opts.launch ? +(+opts.launch).toFixed(1) : 0,
      blocked: !!blocked,
      dot: !!(opts && opts.dot),
      speed: +((src._momSpd != null ? src._momSpd : Math.hypot(src.vel.x, src.vel.y, src.vel.z)) || 0).toFixed(1),
      ki: this._kiFor(src, opts),
      t: this.g.matchT || 0,
    });
    this._boardT = 0;                    // repaint on the next tick
  }

  // ⚠ Nothing is stamped onto the combat hot path for this. `c._lastSlot` is already written by
  // runSlot (it feeds the mastery counter), so the room reads that instead of adding its own.
  _slotOf(src) {
    const k = src && src._lastSlot;
    const s = k && src.slots && src.slots[k];
    return s && s.def ? s.def : null;
  }
  _labelFor(src, opts) {
    if (opts && opts.strike && !opts.dmgClass) {          // the trifecta, not a kit melee power
      if (src._heavyT > 0 || (src.meleeCharge || 0) > 0.5) return 'HAYMAKER';
      return 'JAB';
    }
    if (opts && opts.slam) return 'SLAM';
    const d = this._slotOf(src);
    if (d && d.name) return d.name;
    if (opts && opts.dot) return 'DAMAGE OVER TIME';
    return opts && opts.strike ? 'STRIKE' : 'IMPACT';
  }
  _kiFor(src, opts) {
    if (opts && (opts.strike || opts.slam)) return 0;     // fists are free
    const d = this._slotOf(src);
    return d ? Math.round(d.cost || (d.kiPerSec ? d.kiPerSec : 0)) : 0;
  }

  // ---- per-frame ----
  update(dt) {
    if (!this.group) return;
    let d = this.dummy;
    // ⚠ PINNING HEALTH IS NOT IMMORTALITY. The kill happens inside takeDamage, so restoring hp on
    // the next frame resurrects nothing — one ult with a big enough number left a corpse on the
    // floor and the room had no dummy. If it does go down, the chamber simply projects a new one.
    if (!d || !d.alive || d.state === 'ko') {
      this._reviveT = (this._reviveT || 0) - dt;
      if (this._reviveT <= 0) { this._reviveT = 0.6; d = this.spawnDummy(); }
      else return;
    }
    if (d) {
      d.hp = d.maxHp;                                  // an instrument does not wear out
      if (!this.aggressive) { d.vel.set(0, 0, 0); d.pos.x = 26; d.pos.z = 0; }
    }
    this._boardT -= dt;
    if (this._boardT <= 0) { this._boardT = 0.25; this._drawBoard(); }   // 4Hz is plenty for a wall
  }

  // ---- the wall board ----
  _drawBoard() {
    const cv = this._boardCv; if (!cv) return;
    const x = cv.getContext('2d');
    const T = this.telemetry, L = T.last;
    // ⚠ Canvas 2D cannot read CSS custom properties — every colour here is a literal on purpose.
    const INK = '#14120e', GOLD = '#ffd24a', DIM = '#8b8577', PAPER = '#f7f4ec', RED = '#ff5a4a';
    x.fillStyle = INK; x.fillRect(0, 0, 1024, 512);
    x.fillStyle = GOLD; x.fillRect(0, 0, 1024, 8);

    x.font = '700 20px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM;
    x.fillText('THRESHOLD TREATY OFFICE  ·  IMPACT TEST CHAMBER', 26, 46);
    x.textAlign = 'right';
    x.fillStyle = this.aggressive ? RED : DIM;
    x.fillText(this.aggressive ? 'DUMMY: SPARRING' : 'DUMMY: PASSIVE', 998, 46);
    x.textAlign = 'left';

    if (!L) {
      x.font = '800 44px Rajdhani, Inter, sans-serif'; x.fillStyle = PAPER;
      x.fillText('HIT THE DUMMY', 26, 140);
      x.font = '400 24px Inter, sans-serif'; x.fillStyle = DIM;
      x.fillText('Every landed attack is measured at the damage choke point', 26, 182);
      x.fillText('and compared here.  N toggles the dummy between passive and sparring.', 26, 216);
      this._boardTex.needsUpdate = true; return;
    }

    // ---- the headline: the last attack ----
    x.font = '800 30px Rajdhani, Inter, sans-serif'; x.fillStyle = GOLD;
    x.fillText(String(L.label).toUpperCase().slice(0, 30), 26, 96);
    x.font = '800 108px Rajdhani, Inter, sans-serif'; x.fillStyle = L.blocked ? DIM : PAPER;
    x.fillText(L.dmg.toFixed(1), 26, 196);
    x.font = '700 22px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM;
    x.fillText('DAMAGE' + (L.ticks > 1 ? `  ·  ${L.ticks} TICKS` : '') + (L.blocked ? '  ·  BLOCKED' : ''), 28, 226);

    // ---- the breakdown ----
    const cell = (cx, label, val, hot) => {
      x.font = '700 17px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM; x.fillText(label, cx, 122);
      x.font = '800 34px Rajdhani, Inter, sans-serif'; x.fillStyle = hot ? GOLD : PAPER;
      x.fillText(val, cx, 160);
    };
    cell(340, 'TYPE', String(L.dtype).toUpperCase());
    cell(340, 'CLASS', String(L.dmgClass).toUpperCase()); // overwritten below; kept for spacing calc
    x.fillStyle = INK; x.fillRect(330, 130, 700, 40);     // clear the doubled row
    cell(340, 'TYPE', String(L.dtype).toUpperCase());
    cell(560, 'KNOCKBACK', L.kb ? L.kb.toFixed(0) + 'u' : '—');
    cell(740, 'CONTACT', L.speed ? L.speed.toFixed(0) + ' u/s' : '—', L.speed > 26);
    cell(900, 'KI', L.ki ? String(L.ki) : '—');

    // ---- the comparison table: this is the point of the room ----
    const rows = T.table();
    x.fillStyle = '#2a2620'; x.fillRect(26, 250, 972, 2);
    x.font = '700 17px Rajdhani, Inter, sans-serif'; x.fillStyle = DIM;
    x.fillText('BEST BY ATTACK', 26, 278);
    x.textAlign = 'right'; x.fillText(`${T.shots} HITS  ·  Σ ${Math.round(T.total)}`, 998, 278);
    x.textAlign = 'left';

    const max = rows.length ? rows[0].dmg : 1;
    let y = 306;
    for (let i = 0; i < Math.min(rows.length, 7); i++) {
      const r = rows[i], w = Math.max(3, (r.dmg / max) * 620);
      x.fillStyle = i === 0 ? GOLD : '#4a453c';
      x.fillRect(300, y - 15, w, 20);
      x.font = '700 20px Rajdhani, Inter, sans-serif';
      x.fillStyle = r.label === L.label ? GOLD : PAPER;
      x.fillText(String(r.label).slice(0, 22), 26, y);
      x.font = '800 20px Rajdhani, Inter, sans-serif'; x.fillStyle = PAPER;
      x.textAlign = 'right'; x.fillText(r.dmg.toFixed(1), 990, y); x.textAlign = 'left';
      y += 28;
    }
    this._boardTex.needsUpdate = true;
  }
}
