// THRESHOLD — the WITNESS LAYER, act II: a KMK 9 ACTION NEWS field crew ON THE GROUND.
// One camera operator + one field reporter chase the fight for the whole match, doing what
// real news shooters do: find a vantage with line of sight, keep the action FRAMED (auto-zoom
// from subject spread, handheld sway that worsens when running or scared), duck blasts, get
// knocked flat by close ones (the camera hits the deck and keeps rolling, tilted), and cut
// away for reporter stand-ups when the fight lulls. Their van waits at the curb.
//
// THE CAMERA IS REAL: on highlight moments (KOs, tier-ups, building collapses, car chains)
// the operator's POV is actually rendered — a 320×180 perspective pass scissored into the
// canvas corner BEFORE the main composer pass (so it never flashes on screen), blitted to a
// 2D canvas, stamped with the broadcast package (channel bug, LIVE tag, the in-world clock,
// district lower-thirds), and recorded as JPEG frame CLIPS with a rolling pre-roll. The HUD
// shows the live monitor while ON AIR; hud.showEndScreen replays the clips on a TV.
// This layer only WATCHES — nothing in gameplay reads it.
import * as THREE from 'three';
import { clamp, damp, TAU } from '../core/util.js';
import { clockStr, pickCrew, fmtClock } from '../data/news.js';

const W = 320, H = 180;                       // broadcast frame (16:9)
const PREROLL_MAX = 4, PREROLL_INT = 0.24;    // rolling ~1s memory before every event
const CLIP_FRAME_CAP = 380, CLIP_CAP = 9;     // memory budget across the whole match
const WALK = 13, HUSTLE = 24, SPRINT = 34;

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _e = new THREE.Euler();

export class NewsCrew {
  constructor(game) {
    this.g = game;
    this.enabled = false;
    this.clips = [];
    this.rec = null; this._onAirT = 0;
    this.reporterName = 'DANA OKAFOR'; this.operatorName = 'J. WHITFIELD';
    this.t = 0;
    // --- the POV camera + broadcast canvas (this canvas IS the live monitor the HUD shows) ---
    this.cam = new THREE.PerspectiveCamera(34, W / H, 0.5, 1100);
    this.fov = 34; this._punchT = 0;
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this._buildOverlayAssets();
    // --- crew state ---
    this.opPos = new THREE.Vector3(); this.rpPos = new THREE.Vector3();
    this.goal = new THREE.Vector3();
    this.focusSm = new THREE.Vector3(); this.spreadSm = 20;
    this.lookSm = new THREE.Vector3();
    this._evalT = 0; this._losBadT = 0; this._kick = 0;
    this.downT = 0; this._downK = 0; this.duckT = 0;
    this.standupT = 0; this._standupCd = 9; this._standupClips = 0; this._lastEventT = 0;
    this._koFocus = null;
    this._preroll = []; this._capT = 0;
    this._np = [Math.random() * 9, Math.random() * 9, Math.random() * 9]; // handheld noise phases
    this._buildMeshes();
  }

  // ---------- the crew on camera: van + operator + reporter (LSW pedestrian scale) ----------
  _buildMeshes() {
    const grp = this.grp = new THREE.Group(); grp.visible = false;
    const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.85, metalness: o.m ?? 0.05, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 0.6 } : {}) });
    // --- the van ---
    const van = this.van = new THREE.Group();
    // TRUE SCALE: a real broadcast van (~5m long, roof over head height)
    const body = new THREE.Mesh(new THREE.BoxGeometry(26, 10.5, 10), M('#e6e0d2', { r: 0.55, m: 0.3 }));
    body.position.y = 6.4; body.castShadow = true; body.receiveShadow = true; van.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(26.15, 1.7, 10.1), M('#d81f26', { r: 0.5, m: 0.3 }));
    stripe.position.y = 5.2; van.add(stripe);
    const shield = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.6), M('#20242e', { r: 0.25, m: 0.6 }));
    shield.position.set(13.08, 9.2, 0); shield.rotation.y = Math.PI / 2; van.add(shield);
    const logoTex = this._vanLogoTex();
    for (const s of [1, -1]) {
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.6), new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.5, emissive: '#ffffff', emissiveMap: logoTex, emissiveIntensity: 0.14 }));
      logo.position.set(-2.4, 7.6, s * 5.06); logo.rotation.y = s > 0 ? 0 : Math.PI; van.add(logo);
    }
    const wheelG = new THREE.CylinderGeometry(1.9, 1.9, 1.3, 10), wheelM = M('#14161c', { r: 0.9 });
    for (const [wx, wz] of [[-8.6, 4.7], [-8.6, -4.7], [8.6, 4.7], [8.6, -4.7]]) { const w = new THREE.Mesh(wheelG, wheelM); w.rotation.x = Math.PI / 2; w.position.set(wx, 1.9, wz); van.add(w); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 13, 6), M('#8b8fa0', { r: 0.4, m: 0.7 }));
    mast.position.set(-9.4, 18.2, 0); van.add(mast);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 14), M('#e6e0d2', { r: 0.4, m: 0.5 }));
    dish.position.set(-9.4, 24.6, 0); dish.rotation.z = 0.85; van.add(dish);
    const dishGlow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5), M('#ff3b3b', { e: '#ff3b3b', ei: 1.6 }));
    dishGlow.position.set(-9.4, 25.7, 0); van.add(dishGlow); this._dishGlow = dishGlow.material;
    grp.add(van);
    // --- the camera operator ---
    const op = this.op = new THREE.Group();
    const opBody = new THREE.Mesh(new THREE.CapsuleGeometry(1.05, 4.6, 3, 8), M('#24384f', { r: 0.9 }));
    opBody.position.y = 3.6; opBody.castShadow = true; op.add(opBody);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.3, 0.8), M('#1a2230', { r: 0.9 }));
    pack.position.set(0, 4.7, -1.2); op.add(pack);
    const opHead = new THREE.Mesh(new THREE.SphereGeometry(0.95, 9, 8), M('#caa27a', { r: 0.7 }));
    opHead.position.y = 8.3; op.add(opHead);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.99, 1.02, 0.55, 10), M('#d81f26', { r: 0.8 }));
    cap.position.y = 8.95; op.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.95), M('#d81f26', { r: 0.8 }));
    brim.position.set(0, 8.72, 0.95); op.add(brim);
    // the shoulder rig
    const cg = this.camGrp = new THREE.Group(); cg.position.set(1.28, 7.4, 0.25);
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.2, 2.6), M('#22252c', { r: 0.6, m: 0.35 }));
    cg.add(camBody);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 1.0, 10), M('#101318', { r: 0.4, m: 0.5 }));
    lens.rotation.x = Math.PI / 2; lens.position.z = 1.75; cg.add(lens);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), M('#3a5a7f', { e: '#6fa0d0', ei: 0.5, r: 0.2, m: 0.8 }));
    glass.position.z = 2.27; cg.add(glass);
    const tally = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5), M('#ff2f2f', { e: '#ff2f2f', ei: 1.5 }));
    tally.position.set(0.34, 0.74, 1.05); cg.add(tally); this.tally = tally.material;
    const vf = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55), M('#0c0e12', { e: '#9fd0ff', ei: 0.7, r: 0.3 }));
    vf.position.set(-0.68, 0.15, -0.6); vf.rotation.y = -Math.PI / 2 - 0.25; cg.add(vf);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 1.4), M('#101318', { r: 0.7 }));
    handle.position.set(0, 0.78, 0.2); cg.add(handle);
    op.add(cg);
    grp.add(op);
    // --- the reporter ---
    const rp = this.rp = new THREE.Group();
    const rpBody = new THREE.Mesh(new THREE.CapsuleGeometry(1.02, 4.5, 3, 8), M('#8a2430', { r: 0.85 }));
    rpBody.position.y = 3.55; rpBody.castShadow = true; rp.add(rpBody);
    const rpHead = new THREE.Mesh(new THREE.SphereGeometry(0.95, 9, 8), M('#8a5a3a', { r: 0.7 }));
    rpHead.position.y = 8.2; rp.add(rpHead);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(1.02, 9, 8), M('#221a14', { r: 0.95 }));
    hair.position.set(0, 8.45, -0.18); hair.scale.set(1, 0.92, 1); rp.add(hair);
    const micG = this.micG = new THREE.Group(); micG.position.set(0.85, 6.2, 1.0); micG.rotation.x = -0.35;
    const micStem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.0, 6), M('#181a20', { r: 0.5, m: 0.4 }));
    micG.add(micStem);
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 6), M('#1c1e24', { r: 1 }));
    foam.position.y = 0.62; micG.add(foam);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.55), M('#d81f26', { r: 0.7 }));
    flag.position.y = 0.05; micG.add(flag);
    rp.add(micG);
    grp.add(rp);
    this.g.scene.add(grp);
  }
  _vanLogoTex() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 118;
    const x = c.getContext('2d');
    x.fillStyle = '#d81f26'; x.beginPath(); x.arc(52, 52, 42, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.font = '900 62px Inter,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('9', 52, 56);
    x.fillStyle = '#16181e'; x.font = '900 34px Inter,sans-serif'; x.textAlign = 'left';
    x.fillText('KMK', 106, 40);
    x.fillStyle = '#a8462a'; x.font = '800 19px Inter,sans-serif';
    x.fillText('ACTION NEWS', 106, 72);
    x.fillStyle = '#6b6455'; x.font = '600 13px Inter,sans-serif';
    x.fillText('FIRST ON THE SCENE', 106, 96);
    return new THREE.CanvasTexture(c);
  }

  // ---------- lifecycle ----------
  reset(modeId) {
    this.enabled = !!modeId && modeId !== 'training';
    this.grp.visible = this.enabled;
    this.clips = []; this._preroll = []; this.rec = null; this._onAirT = 0;
    this._standupClips = 0; this._standupCd = 9; this.standupT = 0;
    this.downT = 0; this._downK = 0; this.duckT = 0; this._kick = 0; this._koFocus = null; this._lastEventT = 0;
    const crew = pickCrew(Date.now());
    this.reporterName = crew.reporter; this.operatorName = crew.operator;
    // the van parks at a south-side curb (scaled to whatever city we're in); the crew jogs in
    const A = this.g.world.ARENA || 240;
    this.van.position.set(-A * 0.24, 0, A * 0.49); this.van.rotation.y = Math.PI / 2;
    this.opPos.set(-A * 0.2, 0, A * 0.44); this.rpPos.set(-A * 0.22, 0, A * 0.42);
    this.goal.copy(this.opPos);
    this.focusSm.set(0, 5, 0); this.lookSm.set(0, 5, 0); this.spreadSm = 20;
    this.op.position.copy(this.opPos); this.rp.position.copy(this.rpPos);
    this.op.rotation.set(0, 0, 0); this.rp.rotation.set(0, 0, 0);
  }

  get onAir() { return !!this.rec || this._onAirT > 0; }

  // ---------- events from the game ----------
  // A highlight worth broadcasting. priority: 3 KO · 2 building/tier · 1 big hit · 0 stand-up.
  // KOs and huge hits shoot HIGH-SPEED (20fps) and carry a slow-window so the TV can replay
  // the exact moment of impact in slow motion.
  highlight(tag, title, opts = {}) {
    if (!this.enabled || this.g.matchOver) return;
    const dur = opts.dur ?? 2.6, priority = opts.priority ?? 1;
    const SLOWTAGS = { ko: 20, bighit: 20, building: 14 };
    const slow = tag in SLOWTAGS;
    this._lastEventT = this.t;
    if (opts.focus) { this._koFocus = { pos: opts.focus.clone ? opts.focus.clone() : new THREE.Vector3(opts.focus.x, opts.focus.y || 4, opts.focus.z), until: this.t + Math.min(dur, 2.2) }; }
    this._punchT = 0.45;
    if (this.rec) {
      this.rec.until = Math.max(this.rec.until, this.t + (priority >= this.rec.priority ? dur * 0.85 : dur * 0.35));
      if (priority > this.rec.priority) {
        this.rec.priority = priority; this.rec.tag = tag; this.rec.title = title; this.rec.lt = this._ltFor(tag, title);
        if (slow) { this.rec.slow = true; this.rec.ev = this.rec.frames.length; }   // the moment is NOW — slow window starts here
      }
      return;
    }
    const fps = this.g.world._qTier === 0 ? Math.ceil((SLOWTAGS[tag] || 12) * 0.6) : (SLOWTAGS[tag] || 12);
    this.rec = {
      tag, title, priority, fps, slow,
      frames: this._preroll.slice(), until: this.t + dur, acc: 0,
      t0: this.g.matchT || 0, lt: this._ltFor(tag, title),
    };
    this.rec.ev = this.rec.frames.length;   // pre-roll plays at speed; the event itself gets the slo-mo
  }
  _ltFor(tag, title) {
    const KICKERS = { ko: 'BREAKING', bighit: 'DEVELOPING', building: 'STRUCTURE DOWN', collateral: 'COLLATERAL', tier: 'POWER SURGE', car: 'DEVELOPING', standup: 'LIVE', police: 'POLICE RESPONSE' };
    return { kicker: KICKERS[tag] || 'BREAKING', title };
  }
  // A blast landed near the crew — duck, or go down (the camera keeps rolling on the ground).
  onBlast(pos, radius, power = 1) {
    if (!this.enabled) return;
    const d = Math.hypot(pos.x - this.opPos.x, pos.z - this.opPos.z);
    this._kick = Math.min(3, this._kick + clamp(power * (1 - d / (radius * 4 + 40)), 0, 2.2));
    if (d < radius * 0.8 + 8 && power >= 0.9 && this.downT <= 0) this.downT = 2.4;
    else if (d < radius * 2.2 + 14) this.duckT = Math.max(this.duckT, 1.1);
  }

  // ---------- the shoot: focus, vantage, movement ----------
  _principals() {
    const g = this.g;
    let A = null, B = null;
    for (const h of g.humans) if (h.fighter && h.fighter.alive) { A = h.fighter; break; }
    if (!A) for (const e of g.entities) if (e.alive && e.def && !e.isDummy) { A = e; break; }
    if (A) B = (g.hardLock && g.hardLock.alive && g.hardLock !== A) ? g.hardLock : g.nearestFoe(A, A.pos, 400);
    return [A, B];
  }
  _updateFocus(dt) {
    const [A, B] = this._principals();
    let fx = 0, fy = 5, fz = 0, spread = 16;
    if (this._koFocus && this.t < this._koFocus.until) {
      fx = this._koFocus.pos.x; fy = Math.max(2, this._koFocus.pos.y); fz = this._koFocus.pos.z;
      if (A && B) spread = Math.hypot(A.pos.x - B.pos.x, A.pos.z - B.pos.z) * 0.6 + 10;
    } else if (A && B) {
      fx = (A.pos.x + B.pos.x) / 2; fz = (A.pos.z + B.pos.z) / 2;
      fy = (A.pos.y + B.pos.y) / 2 + 5;
      spread = Math.hypot(A.pos.x - B.pos.x, A.pos.z - B.pos.z) + Math.abs(A.pos.y - B.pos.y) * 0.8 + 10;
    } else if (A) { fx = A.pos.x; fz = A.pos.z; fy = A.pos.y + 5; }
    this.focusSm.x = damp(this.focusSm.x, fx, 5, dt);
    this.focusSm.y = damp(this.focusSm.y, fy, 4, dt);
    this.focusSm.z = damp(this.focusSm.z, fz, 5, dt);
    this.spreadSm = damp(this.spreadSm, spread, 3, dt);
    if (A && B) { this._abOn = true; (this._abV || (this._abV = new THREE.Vector3())).set(B.pos.x - A.pos.x, 0, B.pos.z - A.pos.z).normalize(); }
    else this._abOn = false;
  }
  _losClear(x, z) {
    return this.g.canSee({ pos: { x, y: 2.0, z } }, { pos: { x: this.focusSm.x, y: this.focusSm.y, z: this.focusSm.z } });
  }
  _pickVantage() {
    const g = this.g, F = this.focusSm, world = g.world;
    const R = clamp(24 + this.spreadSm * 0.55, 30, 64);
    let bx = this.opPos.x - F.x, bz = this.opPos.z - F.z;
    const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
    let best = null, bestScore = -1e9;
    for (const off of [0, 0.45, -0.45, 0.9, -0.9, 1.5, -1.5, 2.1, -2.1, 2.8, -2.8, Math.PI]) {
      const ca = Math.cos(off), sa = Math.sin(off);
      const dx = bx * ca - bz * sa, dz = bx * sa + bz * ca;
      let px = F.x + dx * R, pz = F.z + dz * R;
      px = clamp(px, -world.ARENA + 14, Math.min(world.ARENA - 14, world.waterX - 9));
      pz = clamp(pz, -world.ARENA + 14, world.ARENA - 14);
      let inBlock = false;
      for (const c of world.cover) if (Math.abs(px - c.x) < (c.hx ?? c.r) + 2.5 && Math.abs(pz - c.z) < (c.hz ?? c.r) + 2.5) { inBlock = true; break; }
      if (inBlock) continue;
      let score = 0;
      if (!this._losClear(px, pz)) score -= 44;                     // a shot you can't see is no shot
      score -= Math.hypot(px - this.opPos.x, pz - this.opPos.z) * 0.25;   // don't sprint across town for 2%
      if (this._abOn) score -= Math.abs(dx * this._abV.x + dz * this._abV.z) * 15;  // film from the SIDE, not down the barrel
      for (const e of g.entities) { if (!e.alive || !e.def) continue; const d = Math.hypot(px - e.pos.x, pz - e.pos.z); if (d < 16) score -= (16 - d) * 3; }
      if (score > bestScore) { bestScore = score; best = { x: px, z: pz }; }
    }
    if (best) this.goal.set(best.x, 0, best.z);
  }
  _pushOut(p) {
    for (const c of this.g.world.cover) {
      const hx = (c.hx ?? c.r) + 1.6, hz = (c.hz ?? c.r) + 1.6;
      const dx = p.x - c.x, dz = p.z - c.z;
      if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
        if (hx - Math.abs(dx) < hz - Math.abs(dz)) p.x = c.x + Math.sign(dx || 1) * hx;
        else p.z = c.z + Math.sign(dz || 1) * hz;
      }
    }
    p.x = clamp(p.x, -this.g.world.ARENA + 10, this.g.world.waterX - 8);
    p.z = clamp(p.z, -this.g.world.ARENA + 10, this.g.world.ARENA - 10);
  }

  // ---------- per-frame ----------
  update(dt) {
    if (!this.enabled) return;
    this.t += dt;
    const g = this.g;
    this._kick = Math.max(0, this._kick - dt * 2.4);
    if (this.duckT > 0) this.duckT -= dt;
    if (this._punchT > 0) this._punchT -= dt;
    this._updateFocus(dt);

    // knocked flat → fall, stay down, get back up
    if (this.downT > 0) { this.downT -= dt; this._downK = Math.min(1, this._downK + dt * 5); }
    else this._downK = Math.max(0, this._downK - dt * 2.2);

    const F = this.focusSm;
    const distF = Math.hypot(this.opPos.x - F.x, this.opPos.z - F.z);

    // stand-up cutaways when the fight goes quiet (and we still owe the desk B-roll)
    if (this.standupT > 0) {
      this.standupT -= dt;
      if (this.standupT <= 0) this._standupCd = 14 + Math.random() * 8;
    } else if (!this.rec && !g.matchOver && this.downT <= 0) {
      this._standupCd -= dt;
      if (this._standupCd <= 0 && this.t - this._lastEventT > 6 && this._standupClips < 2 && distF > 30 && distF < 90) {
        this.standupT = 3.4; this._standupClips++;
        this.highlight('standup', `${this.reporterName} · KMK 9 ACTION NEWS`, { dur: 3.2, priority: 0 });
      }
    }

    // vantage re-evaluation: on a clock, when framing breaks, or when the fight walks over us
    this._evalT -= dt;
    const losOK = this._losClear(this.opPos.x, this.opPos.z);
    this._losBadT = losOK ? 0 : this._losBadT + dt;
    if (this._evalT <= 0 || this._losBadT > 0.7 || distF < 17 || distF > 84) { this._pickVantage(); this._evalT = 1.15; }

    // --- operator movement ---
    const moving = this.downT <= 0 && this.standupT <= 0;
    let spd = 0;
    if (moving) {
      const gd = Math.hypot(this.goal.x - this.opPos.x, this.goal.z - this.opPos.z);
      if (gd > 2.2) {
        spd = gd > 90 ? SPRINT : gd > 34 ? HUSTLE : WALK;
        if (distF < 15) spd = SPRINT;                       // the fight is ON US — move move move
        const k = Math.min(1, (spd * dt) / gd);
        this.opPos.x += (this.goal.x - this.opPos.x) * k;
        this.opPos.z += (this.goal.z - this.opPos.z) * k;
      }
      this._pushOut(this.opPos);
    }
    // face travel when hustling, face the shot when planted
    const fdx = spd > WALK ? this.goal.x - this.opPos.x : F.x - this.opPos.x;
    const fdz = spd > WALK ? this.goal.z - this.opPos.z : F.z - this.opPos.z;
    const wantYaw = Math.atan2(fdx, fdz);
    let dy = (wantYaw - this.op.rotation.y) % TAU;
    if (dy > Math.PI) dy -= TAU; if (dy < -Math.PI) dy += TAU;
    this.op.rotation.y += dy * (1 - Math.exp(-9 * dt));
    // bob + duck + fall
    const bob = spd > 0 ? Math.abs(Math.sin(this.t * (4 + spd * 0.18))) * 0.42 : Math.sin(this.t * 1.6) * 0.05;
    this.op.position.set(this.opPos.x, bob * (1 - this._downK), this.opPos.z);
    this.op.rotation.z = -1.5 * this._downK;
    this.op.rotation.x = (spd > WALK ? 0.1 : 0) * (1 - this._downK);
    const duckS = this.duckT > 0 ? 0.82 : 1;
    this.op.scale.y = damp(this.op.scale.y, duckS, 10, dt);
    // shoulder camera pitches at the subject (lowered only once the last shot has wrapped)
    const pitch = Math.atan2(F.y - 7.4, Math.max(6, distF));
    this.camGrp.rotation.x = damp(this.camGrp.rotation.x, (g.matchOver && !this.rec) ? 0.5 : -pitch, 8, dt);
    // tally light: blinking hard while ON AIR
    this.tally.emissiveIntensity = this.rec ? (this.t * 5 % 1 < 0.5 ? 3.0 : 0.7) : (this.t * 1.1 % 1 < 0.1 ? 1.6 : 0.3);
    this._dishGlow.emissiveIntensity = this.t * 0.8 % 1 < 0.5 ? 1.8 : 0.4;

    // --- reporter movement: beside the shooter, out of frame; front-and-center for stand-ups ---
    let rx, rz;
    if (this.standupT > 0) {
      const dl = Math.hypot(F.x - this.opPos.x, F.z - this.opPos.z) || 1;
      rx = this.opPos.x + ((F.x - this.opPos.x) / dl) * 7.5;      // reporter between camera and skyline
      rz = this.opPos.z + ((F.z - this.opPos.z) / dl) * 7.5;
    } else {
      const dl = Math.hypot(F.x - this.opPos.x, F.z - this.opPos.z) || 1;
      const px = -(F.z - this.opPos.z) / dl, pz = (F.x - this.opPos.x) / dl;   // perpendicular
      rx = this.opPos.x + px * 4.8 - ((F.x - this.opPos.x) / dl) * 1.8;
      rz = this.opPos.z + pz * 4.8 - ((F.z - this.opPos.z) / dl) * 1.8;
    }
    const rd = Math.hypot(rx - this.rpPos.x, rz - this.rpPos.z);
    if (rd > 0.6) {
      const rspd = rd > 40 ? SPRINT : rd > 12 ? HUSTLE : WALK;
      const k = Math.min(1, (rspd * dt) / rd);
      this.rpPos.x += (rx - this.rpPos.x) * k; this.rpPos.z += (rz - this.rpPos.z) * k;
      this._pushOut(this.rpPos);
    }
    const rBob = rd > 1.5 ? Math.abs(Math.sin(this.t * 5.2)) * 0.38 : 0;
    this.rp.position.set(this.rpPos.x, rBob, this.rpPos.z);
    // reporter faces the action; faces the LENS on a stand-up (with the little mic lift)
    const rTx = this.standupT > 0 ? this.opPos.x : F.x, rTz = this.standupT > 0 ? this.opPos.z : F.z;
    let rdy = (Math.atan2(rTx - this.rpPos.x, rTz - this.rpPos.z) - this.rp.rotation.y) % TAU;
    if (rdy > Math.PI) rdy -= TAU; if (rdy < -Math.PI) rdy += TAU;
    this.rp.rotation.y += rdy * (1 - Math.exp(-8 * dt));
    this.micG.position.y = damp(this.micG.position.y, this.standupT > 0 ? 6.9 : 6.2, 8, dt);
    this.micG.rotation.x = damp(this.micG.rotation.x, this.standupT > 0 ? -0.1 : -0.35, 8, dt);
    this.rp.scale.y = damp(this.rp.scale.y, this.duckT > 0 ? 0.8 : 1, 10, dt);

    // --- the broadcast: pose the lens, then capture on the record clock ---
    this._poseCamera(dt);
    if (this.rec) {
      this.rec.acc += dt;
      const int = 1 / this.rec.fps;
      while (this.rec.acc >= int) {
        this.rec.acc -= int;
        if (this.rec.frames.length < 90) this.rec.frames.push(this._capture(this.rec.lt));
      }
      if (this.t >= this.rec.until) this._finalize();   // records THROUGH match end — the last KO wraps on its own clock
      this._onAirT = 0.8;
    } else {
      if (this._onAirT > 0) this._onAirT -= dt;
      // rolling pre-roll so clips include the CAUSE, not just the crater
      this._capT += dt;
      if (this._capT >= PREROLL_INT && !g.matchOver && this.g.world._qTier > 0) {
        this._capT = 0;
        this._preroll.push(this._capture(null));
        if (this._preroll.length > PREROLL_MAX) this._preroll.shift();
      }
    }
  }

  _finalize() {
    const r = this.rec; this.rec = null;
    if (!r || r.frames.length < 6) return;
    this.clips.push({
      tag: r.tag, title: r.title, t0: r.t0, tLabel: fmtClock(r.t0), fps: r.fps, frames: r.frames, priority: r.priority, shotBy: this.operatorName,
      slow: !!r.slow, slowFrom: r.ev || 0, slowTo: (r.ev || 0) + Math.round(r.fps * 1.4),   // the TV slows THIS window
    });
    // memory budget: shed lowest-priority, oldest first — but the latest KO is sacred
    const lastKO = [...this.clips].reverse().find(c => c.tag === 'ko');
    let total = this.clips.reduce((s, c) => s + c.frames.length, 0);
    while ((total > CLIP_FRAME_CAP || this.clips.length > CLIP_CAP) && this.clips.length > 1) {
      let drop = -1, dp = 1e9;
      for (let i = 0; i < this.clips.length; i++) { const c = this.clips[i]; if (c === lastKO) continue; if (c.priority < dp) { dp = c.priority; drop = i; } }
      if (drop < 0) break;
      total -= this.clips[drop].frames.length; this.clips.splice(drop, 1);
    }
  }

  // ---------- the lens ----------
  _poseCamera(dt) {
    const F = this.focusSm;
    const down = this._downK;
    // eye: shoulder height, dropped to the pavement when the operator is down
    const eyeY = 7.5 * (1 - down) + 1.3 * down + (this.duckT > 0 ? -1.1 : 0);
    _v.set(this.opPos.x, eyeY, this.opPos.z);
    let lookX = F.x, lookY = F.y, lookZ = F.z, fovT;
    if (this.standupT > 0 && down === 0) {
      // frame the REPORTER, skyline behind — a real piece-to-camera
      lookX = this.rpPos.x; lookY = 7.2; lookZ = this.rpPos.z;
      fovT = 30;
    } else {
      const dist = Math.max(8, _v.distanceTo(_v2.set(F.x, F.y, F.z)));
      fovT = clamp(THREE.MathUtils.radToDeg(2 * Math.atan((this.spreadSm * 0.5 + 9) / dist)), 21, 58);
      if (down > 0) fovT = 52;
    }
    if (this._punchT > 0) fovT *= 0.86;                          // the snap zoom on a moment
    this.fov = damp(this.fov, fovT, 3.2, dt);
    // handheld: layered sine sway, worse when moving/scared/blasted
    const unst = 0.45 + this._kick * 1.6 + (this.duckT > 0 ? 1.2 : 0) + Math.min(1.4, Math.hypot(this.goal.x - this.opPos.x, this.goal.z - this.opPos.z) * 0.02);
    const n = (i, f) => Math.sin(this.t * f + this._np[i]) * 0.6 + Math.sin(this.t * f * 2.13 + this._np[(i + 1) % 3]) * 0.4;
    const sway = unst * (0.014 * this.fov);
    lookX += n(0, 1.7) * sway; lookY += n(1, 2.1) * sway * 0.7; lookZ += n(2, 1.5) * sway;
    this.cam.position.copy(_v);
    this.cam.fov = this.fov; this.cam.updateProjectionMatrix();
    this.cam.lookAt(lookX, lookY, lookZ);
    const roll = down * 1.25 + n(0, 0.9) * 0.012 * unst;
    if (roll) this.cam.rotateZ(roll);
  }

  // ---------- capture: render POV → blit → stamp the broadcast package ----------
  _capture(lt) {
    const g = this.g, world = g.world, r = world.renderer, cv = r.domElement;
    const pr = r.getPixelRatio();
    // hide the player-UI layer of the scene — news cameras don't see fog-of-war or reticles
    const hidden = [];
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    hide(world.fog); hide(g.reticle); hide(g.redTri);
    const shown = [];
    for (const e of g.entities) if (e.obj && !e.obj.visible) { e.obj.visible = true; shown.push(e.obj); }
    const sm = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;   // reuse this frame's shadow maps
    r.setRenderTarget(null);
    r.setViewport(0, 0, W / pr, H / pr);
    r.setScissor(0, 0, W / pr, H / pr);
    r.setScissorTest(true);
    r.render(g.scene, this.cam);
    r.setScissorTest(false);
    r.setViewport(0, 0, innerWidth, innerHeight);
    r.shadowMap.autoUpdate = sm;
    for (const o of hidden) o.visible = true;
    for (const o of shown) o.visible = false;
    // blit the freshly rendered corner (bottom-left of the GL buffer) into the broadcast frame
    const x = this.ctx;
    x.drawImage(cv, 0, cv.height - H, W, H, 0, 0, W, H);
    this._overlay(x, lt);
    return this.canvas.toDataURL('image/jpeg', 0.62);
  }

  _buildOverlayAssets() {
    // channel bug, drawn once
    const b = document.createElement('canvas'); b.width = 92; b.height = 30;
    const bx = b.getContext('2d');
    bx.fillStyle = 'rgba(10,11,14,0.55)'; this._rr(bx, 0, 0, 62, 17, 3); bx.fill();
    bx.fillStyle = '#d81f26'; this._rr(bx, 2, 2, 15, 13, 2); bx.fill();
    bx.fillStyle = '#fff'; bx.font = '900 11px Inter,sans-serif'; bx.textBaseline = 'middle';
    bx.fillText('9', 6.5, 9.5);
    bx.font = '800 9px Inter,sans-serif'; bx.fillText('KMK', 21, 9.5);
    bx.fillStyle = '#f5b21a'; bx.font = '700 6px Inter,sans-serif';
    bx.fillText('A C T I O N   N E W S', 2, 24);
    this._bug = b;
    const vg = this.ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.82);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    this._vig = vg;
  }
  _rr(x, px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }

  _overlay(x, lt) {
    // lens vignette
    x.fillStyle = this._vig; x.fillRect(0, 0, W, H);
    // signal degradation while the camera is on the pavement
    if (this._downK > 0.35) {
      x.fillStyle = 'rgba(255,255,255,0.07)';
      for (let i = 0; i < 4; i++) x.fillRect(0, (Math.random() * H) | 0, W, 1 + Math.random() * 2);
    }
    // bug + LIVE
    x.drawImage(this._bug, 6, 6);
    if (this.rec) {
      x.fillStyle = 'rgba(10,11,14,0.55)'; this._rr(x, 72, 6, 40, 13, 2); x.fill();
      if (this.t * 2 % 1 < 0.62) { x.fillStyle = '#ff2f2f'; x.beginPath(); x.arc(80, 12.5, 3, 0, TAU); x.fill(); }
      x.fillStyle = '#fff'; x.font = '800 9px Inter,sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'left';
      x.fillText('LIVE', 87, 13);
    }
    // the in-world clock (the city's actual sun) top-right
    const ck = clockStr(this.g.world.dayT);
    x.fillStyle = 'rgba(10,11,14,0.55)'; this._rr(x, W - 62, 6, 56, 13, 2); x.fill();
    x.fillStyle = '#f5d99a'; x.font = '700 8.5px Inter,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ck + ' LOCAL', W - 34, 13);
    x.textAlign = 'left';
    // lower third
    if (lt) {
      const D = this.g.world.districtAt(this.opPos.x, this.opPos.z);
      const y0 = H - 30;
      x.font = '900 8px Inter,sans-serif';
      const kw = x.measureText(lt.kicker).width + 10;
      x.fillStyle = lt.kicker === 'LIVE' ? '#b3121a' : '#d81f26';
      this._rr(x, 8, y0 - 11, kw, 11, 1.5); x.fill();
      x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(lt.kicker, 13, y0 - 5);
      x.fillStyle = 'rgba(238,232,220,0.95)'; this._rr(x, 8, y0 + 1, W - 16, 17, 1.5); x.fill();
      x.fillStyle = '#f5b21a'; x.fillRect(8, y0 + 18, W - 16, 1.6);
      x.fillStyle = '#141519'; x.font = '800 9.5px Inter,sans-serif';
      x.fillText(this._fit(x, lt.title.toUpperCase(), W - 110), 14, y0 + 10);
      x.fillStyle = '#8a5a1a'; x.font = '700 7px Inter,sans-serif'; x.textAlign = 'right';
      x.fillText(D, W - 14, y0 + 10);
      x.textAlign = 'left';
    }
  }
  _fit(x, s, w) { if (x.measureText(s).width <= w) return s; while (s.length > 4 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
}
