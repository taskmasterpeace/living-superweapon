// THRESHOLD — the WITNESS LAYER, act II: a KMK 9 ACTION NEWS field crew ON THE GROUND.
// One camera operator + one field reporter chase the fight for the whole match, doing what
// real news shooters do: find a vantage with line of sight, keep the action FRAMED (auto-zoom
// from subject spread, handheld sway that worsens when running or scared), duck blasts, get
// knocked flat by close ones (the camera hits the deck and keeps rolling, tilted), and cut
// away for reporter stand-ups when the fight lulls. Their van waits at the curb.
//
// THE CAMERA IS REAL: on highlight moments (KOs, tier-ups, building collapses, car chains)
// the operator's POV is actually rendered — a bounded 640×360 perspective pass scissored into the
// canvas corner BEFORE the main composer pass (so it never flashes on screen), blitted to a
// 2D canvas, stamped with the broadcast package (channel bug, LIVE tag, the in-world clock,
// district lower-thirds), and recorded as WebP frame CLIPS with a rolling pre-roll. The HUD
// shows the live monitor while ON AIR; hud.showEndScreen replays the clips on a TV.
// This layer only WATCHES — nothing in gameplay reads it.
import * as THREE from 'three';
import { clamp, damp, TAU } from '../core/util.js';
import { clockStr, pickCrew, fmtClock } from '../data/news.js';
import { hasCivilians, hasCity, MODES } from '../data/modes.js';
import { normalizeNewsCameraProfile, sampleNewsShot } from './news-camera.js';
import { NewsFrameEncoder, newsFrameBytes, revokeFrames } from './news-capture.js';
import { createNewsPerson, poseNewsPerson } from './news-figure.js';
import {OUTPOST_PRESS_PARK} from './frontline-outpost-layout.js';
import {persistNewsClip} from './news-archive-adapter.js';
export { normalizeNewsCameraProfile, sampleNewsShot, NewsFrameEncoder, revokeFrames, createNewsPerson, poseNewsPerson };

const W = 320, H = 180, FRAME_W = 640, FRAME_H = 360; // logical overlay / recorded frame
const PREROLL_MAX = 4, PREROLL_INT = 0.24;    // rolling ~1s memory before every event
const CLIP_FRAME_CAP = 360, CLIP_CAP = 9, CLIP_BYTE_CAP = 24 * 1024 * 1024;
const WALK = 13, HUSTLE = 24, SPRINT = 34;

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _e = new THREE.Euler();
const _groundPoint = new THREE.Vector3();
const _reporterMark = new THREE.Vector3();
const _newsWorldQ = new THREE.Quaternion(), _newsParentQ = new THREE.Quaternion();
const _newsFacingFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

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
    this.cameraProfile = normalizeNewsCameraProfile();
    this._encoder = new NewsFrameEncoder({ onReady: () => this._trimClips() });
    this.canvas = document.createElement('canvas'); this.canvas.width = FRAME_W; this.canvas.height = FRAME_H;
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
    const pressCanvas = document.createElement('canvas'); pressCanvas.width = 128; pressCanvas.height = 64;
    const pressContext = pressCanvas.getContext('2d');
    pressContext.fillStyle = '#fff3d8'; pressContext.fillRect(0, 0, 128, 64);
    pressContext.fillStyle = '#262a2c'; pressContext.textAlign = 'center'; pressContext.textBaseline = 'middle';
    pressContext.font = '900 31px Inter,sans-serif'; pressContext.fillText('PRESS', 64, 26);
    pressContext.fillStyle = '#a93e34'; pressContext.font = '800 13px Inter,sans-serif'; pressContext.fillText('KMK 9', 64, 51);
    const pressTexture = new THREE.CanvasTexture(pressCanvas); pressTexture.colorSpace = THREE.SRGBColorSpace;
    const op = this.op = createNewsPerson('operator', pressTexture);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.3, 0.8), M('#1a2230', { r: 0.9 }));
    pack.position.set(0, 4.7, -1.2); op.add(pack);
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
    const rp = this.rp = createNewsPerson('reporter', pressTexture);
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
    // ⚠ USE-AFTER-REVOKE: the cold open and the end-screen TV hold these same clip objects. Revoking
    // a URL but LEAVING the string in the array hands them a dangling handle — the <img> then fails
    // with ERR_FILE_NOT_FOUND (68 of them in one stress run). Blank the slot as you revoke it, and
    // mark the clip dead so a viewer drops it instead of discovering it the hard way.
    for (const c of this.clips || []) { revokeFrames(c.frames); c._dead = true; }
    revokeFrames(this.rec?.frames);
    revokeFrames(this._preroll);
    this._pool = this._pool || [];
    this._warmed = false;
    // A sports crew may cover an empty arena; this does not turn on city civilians or police.
    this.enabled = hasCivilians(modeId) || modeId === 'powerworld' || modeId === 'ascendance';
    this.grp.visible = this.enabled;
    this.clips = []; this._preroll = []; this.rec = null; this._onAirT = 0;
    this.t = 0; this._event = null; this._ending = null; this._finished = false;
    this.matchId = globalThis.crypto?.randomUUID?.() || `match-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this._standupClips = 0; this._standupCd = 0; this.standupT = 0;
    this.downT = 0; this._downK = 0; this.duckT = 0; this._kick = 0; this._koFocus = null; this._lastEventT = 0;
    const crew = pickCrew(Date.now());
    this.reporterName = crew.reporter; this.operatorName = crew.operator;
    // the van parks at a south-side curb (scaled to whatever city we're in); the crew jogs in
    const A = this.g.world.ARENA || 240;
    this.van.position.set(-A * 0.24, 0, A * 0.49); this.van.rotation.y = Math.PI / 2;
    if(modeId==='powerworld')this.van.position.set(OUTPOST_PRESS_PARK.x,0,OUTPOST_PRESS_PARK.z);
    this.opPos.set(-A * 0.2, 0, A * 0.44); this.rpPos.set(-A * 0.22, 0, A * 0.42);
    this.goal.copy(this.opPos);
    this.focusSm.set(0, 5, 0); this.lookSm.set(0, 5, 0); this.spreadSm = 20;
    this.op.position.copy(this.opPos); this.rp.position.copy(this.rpPos);
    this.op.rotation.set(0, 0, 0); this.rp.rotation.set(0, 0, 0);
  }

  get onAir() { return !!this.rec || this._onAirT > 0; }

  setCameraProfile(profile) { this.cameraProfile = normalizeNewsCameraProfile(profile); return { ...this.cameraProfile }; }

  // Menu/rematch transitions transfer the one owner, including in-flight encoder destinations.
  takeClips() {
    this._finalize();
    const clips = this.clips; this.clips = [];
    this._ending = null; this._finished = true;
    return clips;
  }

  async flush() { this._finalize(); await this._encoder?.flush(); return this.clips; }

  // ---------- events from the game ----------
  // A highlight worth broadcasting. priority: 3 KO · 2 building/tier · 1 big hit · 0 stand-up.
  // KOs and huge hits shoot HIGH-SPEED (20fps) and carry a slow-window so the TV can replay
  // the exact moment of impact in slow motion.
  highlight(tag, title, opts = {}) {
    if (!this.enabled || this._finished || (this.g.matchOver && !opts.closing)) return;
    const dur = opts.dur ?? 2.6, priority = opts.priority ?? 1;
    const SLOWTAGS = { ko: 20, bighit: 20, building: 14 };
    const slow = tag in SLOWTAGS;
    this._lastEventT = this.t;
    if (priority > 0) this.standupT = 0;
    // Sustained damage does not re-trigger a crash every frame. Let each shot settle.
    if (tag !== 'standup' && (!this._event || this.t - this._event.time > 1.25 || priority > this._event.priority)) {
      this._event = { tag, time: this.t, priority, actor: opts.actor || null, target: opts.target || null,
        focus: opts.focus ? { x: opts.focus.x, y: opts.focus.y || 4, z: opts.focus.z } : null };
    }
    if (opts.focus) { this._koFocus = { pos: opts.focus.clone ? opts.focus.clone() : new THREE.Vector3(opts.focus.x, opts.focus.y || 4, opts.focus.z), until: this.t + Math.min(dur, 2.2) }; }
    this._punchT = 0.45;
    if (this.rec) {
      for (const fighter of [opts.actor, opts.target]) if (fighter?.def?.id) this.rec.heroIds.add(fighter.def.id);
      this.rec.until = Math.min(this.rec.started + 5.5, Math.max(this.rec.until, this.t + (priority >= this.rec.priority ? dur * 0.85 : dur * 0.35)));
      if (priority > this.rec.priority) {
        this.rec.priority = priority; this.rec.tag = tag; this.rec.title = title; this.rec.lt = this._ltFor(tag, title);
        if (slow) { this.rec.slow = true; this.rec.ev = this.rec.frames.length; }   // the moment is NOW — slow window starts here
      }
      return;
    }
    const fps = this.g.world._qTier === 0 ? Math.ceil((SLOWTAGS[tag] || 12) * 0.6) : (SLOWTAGS[tag] || 12);
    this.rec = {
      id: globalThis.crypto?.randomUUID?.() || `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      matchId: this.matchId, createdAt: Date.now(), heroIds: new Set([opts.actor?.def?.id, opts.target?.def?.id].filter(Boolean)),
      tag, title, priority, fps, slow,
      frames: this._preroll, until: this.t + Math.min(dur, 5.5), started: this.t, acc: 0, shots: [],
      t0: this.g.matchT || 0, lt: this._ltFor(tag, title),
    };
    this._preroll = [];
    this.rec.ev = this.rec.frames.length;   // pre-roll plays at speed; the event itself gets the slo-mo
  }
  _ltFor(tag, title) {
    const KICKERS = { ko: 'BREAKING', bighit: 'DEVELOPING', building: 'STRUCTURE DOWN', collateral: 'COLLATERAL', tier: 'POWER SURGE', car: 'DEVELOPING', standup: 'LIVE', police: 'POLICE RESPONSE' };
    return { kicker: KICKERS[tag] || 'BREAKING', title };
  }
  endMatch(result = {}) {
    if (!this.enabled || this._ending || this._finished) return;
    const human = this.g.humans?.[0]?.fighter || this.g.player;
    const winner = result.winner?.pos ? result.winner : result.win && human?.alive ? human
      : this.g.entities.filter(e => e.alive && e.def && !e.isDummy && e !== human && e.team !== human?.team)
        .sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    this._ending = { start: this.t, winner, signoff: false };
    this.standupT = 0;
    this.highlight('winner', winner ? `${winner.name} — AFTER THE BATTLE` : 'THE DUST SETTLES',
      { priority: 3, dur: 2.6, closing: true, actor: winner, focus: winner?.pos });
  }

  _updateEnding() {
    if (!this._ending) return;
    const age = this.t - this._ending.start;
    if (age >= 2.6 && !this._ending.signoff) {
      this._finalize(); this._ending.signoff = true;
      this.standupT = 2.6;
      this.highlight('standup', `${this.reporterName} — REPORTING FROM THE SCENE`, { priority: 0, dur: 2.5, closing: true });
    }
    if (age >= 5.2) { this._finalize(); this._ending = null; this._finished = true; this.standupT = 0; }
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
    const [principalA, principalB] = this._principals();
    const followEvent = this._event && this.t - this._event.time < 2.6;
    const A = followEvent && this._event.actor?.pos ? this._event.actor : principalA;
    const B = followEvent && this._event.target?.pos ? this._event.target : principalB;
    this._subjects = [A, B];
    let fx = 0, fy = 5, fz = 0, spread = 16;
    if (this._ending?.winner?.pos && !this._ending.signoff) {
      fx = this._ending.winner.pos.x; fy = this._ending.winner.pos.y + 5; fz = this._ending.winner.pos.z;
    } else if (this._koFocus && this.t < this._koFocus.until) {
      fx = this._koFocus.pos.x; fy = Math.max(2, this._koFocus.pos.y); fz = this._koFocus.pos.z;
      if (A && B) spread = Math.hypot(A.pos.x - B.pos.x, A.pos.z - B.pos.z) * 0.6 + 10;
    } else if (A && B) {
      fx = (A.pos.x + B.pos.x) / 2; fz = (A.pos.z + B.pos.z) / 2;
      fy = (A.pos.y + B.pos.y) / 2 + 5;
      spread = Math.hypot(A.pos.x - B.pos.x, A.pos.z - B.pos.z) + Math.abs(A.pos.y - B.pos.y) * 0.8 + 10;
    } else if (A) { fx = A.pos.x; fz = A.pos.z; fy = A.pos.y + 5; }
    if (!this._warmed) {
      // Seed the actual bout before choosing the arrival vantage. Damping from
      // world origin can otherwise put the opening crew inside the action.
      this.focusSm.set(fx, fy, fz); this.lookSm.copy(this.focusSm); this.spreadSm = spread;
    } else {
      this.focusSm.x = damp(this.focusSm.x, fx, 5, dt);
      this.focusSm.y = damp(this.focusSm.y, fy, 4, dt);
      this.focusSm.z = damp(this.focusSm.z, fz, 5, dt);
      this.spreadSm = damp(this.spreadSm, spread, 3, dt);
    }
    if (A && B) { this._abOn = true; (this._abV || (this._abV = new THREE.Vector3())).set(B.pos.x - A.pos.x, 0, B.pos.z - A.pos.z).normalize(); }
    else this._abOn = false;
  }
  _losClear(x, z) {
    return this.g.canSee({ pos: { x, y: this._groundAt(x, z) + 7.5, z } }, { pos: { x: this.focusSm.x, y: this.focusSm.y, z: this.focusSm.z } });
  }
  _groundAt(x, z) {
    const g = this.g, stage = g._pwStage?.group;
    // The active stage draws its own flat floor over a hidden city heightfield. A cached or
    // detached venue must not override the city after returning to it.
    if (g.modeId === 'powerworld' && stage?.visible && stage.parent === g.scene) {
      const floor = stage.children.find(o => o.visible && o.isMesh && o.geometry?.type === 'CircleGeometry');
      if (floor) return floor.getWorldPosition(_groundPoint).y;
    }
    const y = g.world.heightAt?.(x, z);
    return Number.isFinite(y) ? y : 0;
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
      const east = hasCity(g.modeId) ? world.waterX ?? world.ARENA : world.ARENA;
      px = clamp(px, -world.ARENA + 14, Math.min(world.ARENA - 14, east - 9));
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
    const east = hasCity(this.g.modeId) ? this.g.world.waterX ?? this.g.world.ARENA : this.g.world.ARENA;
    p.x = clamp(p.x, -this.g.world.ARENA + 10, Math.min(this.g.world.ARENA - 10, east - 8));
    p.z = clamp(p.z, -this.g.world.ARENA + 10, this.g.world.ARENA - 10);
  }

  _reporterMark(standup, out) {
    const eye = this.opPos, F = this.focusSm;
    const length = Math.hypot(F.x - eye.x, F.z - eye.z) || 1;
    const fx = (F.x - eye.x) / length, fz = (F.z - eye.z) / length;
    const px = -fz, pz = fx;
    const forward = standup ? 13 : -1.8;
    let side = standup ? 6.8 : 4.8;
    if (standup) for (const subject of this._subjects || []) {
      const p = subject?.pos; if (!p) continue;
      const x = p.x - eye.x, z = p.z - eye.z;
      const depth = x * fx + z * fz;
      if (depth <= forward) continue;
      // Stand off the principal's projected silhouette, not directly in front of
      // the fight. The actual lens pans to the reporter for the stand-up; an
      // interrupt can now see contact without hiding or teleporting this body.
      const lateral = x * px + z * pz;
      side = Math.max(side, (lateral + 6) * forward / depth + 4.5);
    }
    return out.set(eye.x + fx * forward + px * side, 0, eye.z + fz * forward + pz * side);
  }

  // ---------- per-frame ----------
  update(dt) {
    if (!this.enabled || this._finished) return;
    if(this.g._threatRoom?.active){
      this.grp.visible=false;this.t+=dt;const room=this.g._threatRoom,focus=this.g.player.pos.clone();const target=this.g.ms.threatLab?.meleeTrial?.target;if(target?.alive)focus.add(target.pos).multiplyScalar(.5);focus.y+=6;
      this.cam.position.set(0,270,80);this.cam.lookAt(focus);const spread=target?.alive?target.pos.distanceTo(this.g.player.pos):0;this.cam.fov=THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2*Math.atan((20+spread*.65)/this.cam.position.distanceTo(focus))),8,65);this.cam.updateProjectionMatrix();this._shot={kind:'training-security'};room.securityCamera?.lookAt(focus);this._updateRecording(dt);return;
    }
    this.grp.visible = true; // venue entry hides city scene children; the active crew owns this group
    this.t += dt;
    const g = this.g;
    this._updateEnding();
    if (this._finished) return;
    this._kick = Math.max(0, this._kick - dt * 2.4);
    if (this.duckT > 0) this.duckT -= dt;
    if (this._punchT > 0) this._punchT -= dt;
    this._updateFocus(dt);

    // knocked flat → fall, stay down, get back up
    if (this.downT > 0) { this.downT -= dt; this._downK = Math.min(1, this._downK + dt * 5); }
    else this._downK = Math.max(0, this._downK - dt * 2.2);

    const F = this.focusSm;
    if (!this._warmed) {
      // The crew arrives with the bout, already at a valid vantage; no city-length opening jog.
      this._pickVantage(); this.opPos.copy(this.goal);
    }
    const distF = Math.hypot(this.opPos.x - F.x, this.opPos.z - F.z);

    // stand-up cutaways when the fight goes quiet (and we still owe the desk B-roll)
    if (this.standupT > 0) {
      this.standupT -= dt;
      if (this.standupT <= 0) this._standupCd = 14 + Math.random() * 8;
    } else if (!this.rec && !g.matchOver && this.downT <= 0) {
      this._standupCd -= dt;
      if (this._standupCd <= 0 && (this.t < 0.2 || this.t - this._lastEventT > 6) && this._standupClips < 2 && distF >= 30 && distF < 90) {
        this.standupT = 3.4; this._standupClips++;
        this.highlight('standup', `${this.reporterName} · KMK 9 ACTION NEWS`, { dur: 3.2, priority: 0 });
      }
    }
    if (!this._warmed) {
      this._reporterMark(this.standupT > 0, this.rpPos);
      this._pushOut(this.rpPos);
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
    this.opPos.y = this._groundAt(this.opPos.x, this.opPos.z);
    // face travel when hustling, face the shot when planted
    const face = this.standupT > 0 ? this.rpPos : this._shot?.look || F;
    const fdx = spd > WALK ? this.goal.x - this.opPos.x : face.x - this.opPos.x;
    const fdz = spd > WALK ? this.goal.z - this.opPos.z : face.z - this.opPos.z;
    const wantYaw = Math.atan2(fdx, fdz);
    let dy = (wantYaw - this.op.rotation.y) % TAU;
    if (dy > Math.PI) dy -= TAU; if (dy < -Math.PI) dy += TAU;
    this.op.rotation.y += dy * (1 - Math.exp(-9 * dt));
    // bob + duck + fall
    const bob = spd > 0 ? Math.abs(Math.sin(this.t * (4 + spd * 0.18))) * 0.42 : Math.sin(this.t * 1.6) * 0.05;
    this.op.position.set(this.opPos.x, this.opPos.y + Math.max(0, bob) * (1 - this._downK), this.opPos.z);
    this.op.rotation.z = -1.5 * this._downK;
    this.op.rotation.x = (spd > WALK ? 0.1 : 0) * (1 - this._downK);
    const crouch = this.duckT > 0 ? 1 : 0;
    this._crouch = damp(this._crouch || 0, crouch, 10, dt);
    this.camGrp.position.y = 7.4 - this._crouch * 0.78;
    // tally light: blinking hard while ON AIR
    this.tally.emissiveIntensity = this.rec ? (this.t * 5 % 1 < 0.5 ? 3.0 : 0.7) : (this.t * 1.1 % 1 < 0.1 ? 1.6 : 0.3);
    this._dishGlow.emissiveIntensity = this.t * 0.8 % 1 < 0.5 ? 1.8 : 0.4;

    // --- reporter movement: beside the operator; a clear action lane even during stand-ups ---
    const { x: rx, z: rz } = this._reporterMark(this.standupT > 0, _reporterMark);
    const rd = Math.hypot(rx - this.rpPos.x, rz - this.rpPos.z);
    if (rd > 0.6) {
      const rspd = rd > 40 ? SPRINT : rd > 12 ? HUSTLE : WALK;
      const k = Math.min(1, (rspd * dt) / rd);
      this.rpPos.x += (rx - this.rpPos.x) * k; this.rpPos.z += (rz - this.rpPos.z) * k;
      this._pushOut(this.rpPos);
    }
    this.rpPos.y = this._groundAt(this.rpPos.x, this.rpPos.z);
    const rBob = rd > 1.5 ? Math.abs(Math.sin(this.t * 5.2)) * 0.38 : 0;
    this.rp.position.set(this.rpPos.x, this.rpPos.y + rBob, this.rpPos.z);
    // reporter faces the action; faces the LENS on a stand-up (with the little mic lift)
    const rTx = this.standupT > 0 ? this.opPos.x : F.x, rTz = this.standupT > 0 ? this.opPos.z : F.z;
    let rdy = (Math.atan2(rTx - this.rpPos.x, rTz - this.rpPos.z) - this.rp.rotation.y) % TAU;
    if (rdy > Math.PI) rdy -= TAU; if (rdy < -Math.PI) rdy += TAU;
    this.rp.rotation.y += rdy * (1 - Math.exp(-8 * dt));
    this.micG.position.y = damp(this.micG.position.y, (this.standupT > 0 ? 6.9 : 6.2) - this._crouch * 0.78, 8, dt);
    this.micG.rotation.x = damp(this.micG.rotation.x, this.standupT > 0 ? -0.1 : -0.35, 8, dt);
    // --- the broadcast: pose the lens, then capture on the record clock ---
    this._poseCamera(dt);
    // Solve grips after the physical camera has followed the final recorded shot.
    poseNewsPerson(this.op, { time: this.t, speed: spd, duck: this._crouch, camera: this.camGrp });
    poseNewsPerson(this.rp, { time: this.t, speed: rd > 1.5 ? Math.min(24, rd) : 0, duck: this._crouch, microphone: this.micG });
    // warm the news camera's shader path ONCE, at the top of the match — its POV compiles
    // programs the main camera never used, and a first-compile mid-fight is a visible hitch
    if (!this._warmed) { this._warmed = true; try { this._renderPOV(null); } catch (e) {} }
    this._updateRecording(dt);
  }

  _updateRecording(dt) {
    const g=this.g;
    if (this.rec) {
      this.rec.acc += dt;
      const int = 1 / this.rec.fps;
      // ⚠ ONE capture per sim frame, and the accumulator CLAMPS. The old `while` burst-captured
      // to catch up after any stall — a 300ms hitch queued six captures into the next frame, so
      // one spike became a freeze train. A dropped broadcast frame is invisible; a frozen game
      // is not. The EMA guard keeps the recorder polite while the frame budget is already tight.
      if (this.rec.acc >= int) {
        this.rec.acc = Math.min(this.rec.acc - int, int);
        if (this.rec.frames.length < 90 && g.world._ema < 34) this._captureFrame(this.rec.frames, this.rec.lt);
      }
      if (this.t >= this.rec.until || this.rec.frames.length >= 90) this._finalize();
      this._onAirT = 0.8;
    } else {
      if (this._onAirT > 0) this._onAirT -= dt;
      // rolling pre-roll so clips include the CAUSE, not just the crater
      this._capT += dt;
      if (this._capT >= PREROLL_INT && !g.matchOver && this.g.world._qTier > 0 && g.world._ema < 30) {
        this._capT = 0;
        this._captureFrame(this._preroll, null);
        if (this._preroll.length > PREROLL_MAX) {
          const dead = this._preroll.shift();
          revokeFrames([dead]);
        }
      }
    }
  }

  _finalize() {
    const r = this.rec; this.rec = null;
    if (!r) return;
    if (r.frames.length < 6) { revokeFrames(r.frames); return; }
    const clip = {
      id: r.id, matchId: r.matchId, createdAt: r.createdAt, heroIds: [...r.heroIds], favorite: false, audio: false,
      tag: r.tag, title: r.title, t0: r.t0, tLabel: fmtClock(r.t0), fps: r.fps, frames: r.frames, priority: r.priority, shotBy: this.operatorName,
      slow: !!r.slow, slowFrom: r.ev || 0, slowTo: (r.ev || 0) + Math.round(r.fps * 1.4),   // the TV slows THIS window
      shots: r.shots || [], width: FRAME_W, height: FRAME_H,
      archiveState: 'saving', archiveError: '',
    };
    this.clips.push(clip);
    // Archive acquires Blob ownership independently; the live reel remains bounded and revocable.
    persistNewsClip(clip, this._encoder).then(()=>{clip.archiveState='saved';},error=>{
      clip.archiveState='error';clip.archiveError=error?.message||String(error);
    });
    this._trimClips();
  }
  _trimClips() {
    // memory budget: shed lowest-priority, oldest first — but the latest KO is sacred
    const lastKO = [...this.clips].reverse().find(c => c.tag === 'ko');
    const live = [this.rec?.frames, this._preroll].filter(Boolean);
    let total = this.clips.reduce((s, c) => s + c.frames.length, 0) + live.reduce((s, a) => s + a.length, 0);
    let bytes = this.clips.reduce((s, c) => s + newsFrameBytes(c.frames), 0) + live.reduce((s, a) => s + newsFrameBytes(a), 0);
    while ((total > CLIP_FRAME_CAP || bytes > CLIP_BYTE_CAP || this.clips.length > CLIP_CAP) && this.clips.length > 1) {
      let drop = -1, dp = 1e9;
      for (let i = 0; i < this.clips.length; i++) { const c = this.clips[i]; if (c === lastKO) continue; if (c.priority < dp) { dp = c.priority; drop = i; } }
      if (drop < 0) break;
      total -= this.clips[drop].frames.length;
      bytes -= newsFrameBytes(this.clips[drop].frames);
      revokeFrames(this.clips[drop].frames); this.clips[drop]._dead = true;   // a shed clip may still be on someone's screen
      this.clips.splice(drop, 1);
    }
    // Even one unusual encoded stream must obey the byte ceiling. Keep indices stable for viewers
    // and pending callbacks; missing slots hold the previous visible frame during playback.
    if (bytes > CLIP_BYTE_CAP) for (const frames of [...this.clips.map(c => c.frames), ...live]) {
      for (let i = 0; i < frames.length && bytes > CLIP_BYTE_CAP; i++) {
        const size = newsFrameBytes([frames[i]]);
        if (size) { bytes -= size; revokeFrames([frames[i]]); frames[i] = null; }
      }
    }
  }

  // ---------- the lens ----------
  _poseCamera(dt) {
    const F = this.focusSm;
    const down = this._downK;
    // eye: shoulder height, dropped to the pavement when the operator is down
    const eyeY = this.opPos.y + 7.5 * (1 - down) + 1.3 * down - (this.duckT > 0 ? 1.1 * (1 - down) : 0);
    _v.set(this.opPos.x, eyeY, this.opPos.z);
    const [actor, target] = this._subjects || [];
    const shot = this._shot = sampleNewsShot({ time: this.t, eye: _v, focus: F, spread: this.spreadSm,
      actor, target, event: this._event, reporter: this.rpPos, standup: this.standupT > 0, down,
      winner: this._ending && !this._ending.signoff ? this._ending.winner : null, profile: this.cameraProfile });
    this.lookSm.lerp(_v2.set(shot.look.x, shot.look.y, shot.look.z), 1 - Math.exp(-shot.response * dt));
    let lookX = this.lookSm.x, lookY = this.lookSm.y, lookZ = this.lookSm.z;
    this.fov = damp(this.fov, shot.fov, shot.response, dt);
    // handheld: layered sine sway, worse when moving/scared/blasted
    const unst = (this.cameraProfile?.handheld ?? 0.35) * (0.45 + this._kick * 1.6 + (this.duckT > 0 ? 1.2 : 0) + Math.min(1.4, Math.hypot(this.goal.x - this.opPos.x, this.goal.z - this.opPos.z) * 0.02));
    const n = (i, f) => Math.sin(this.t * f + this._np[i]) * 0.6 + Math.sin(this.t * f * 2.13 + this._np[(i + 1) % 3]) * 0.4;
    const sway = unst * (0.014 * this.fov);
    lookX += n(0, 1.7) * sway; lookY += n(1, 2.1) * sway * 0.7; lookZ += n(2, 1.5) * sway;
    this.cam.position.copy(_v);
    const sky = this.g.world.skyMesh, scale = sky?.scale;
    const skyRadius = sky?.geometry?.parameters?.radius || sky?.geometry?.boundingSphere?.radius || 0;
    this.cam.far = Math.max(1100, this.g.world.camera?.far || 0, skyRadius * Math.max(scale?.x || 1, scale?.y || 1, scale?.z || 1) * 1.05);
    this.cam.fov = this.fov; this.cam.updateProjectionMatrix();
    this.cam.lookAt(lookX, lookY, lookZ);
    const roll = down * 1.25 + n(0, 0.9) * 0.012 * unst;
    if (roll) this.cam.rotateZ(roll);
    if (this.camGrp) {
      // Three cameras look down -Z; the shoulder model's lens points +Z. Convert the exact
      // world view into the operator's local frame, including body yaw/lean and lens roll.
      this.camGrp.quaternion.copy(this.op.getWorldQuaternion(_newsParentQ).invert())
        .multiply(this.cam.getWorldQuaternion(_newsWorldQ)).multiply(_newsFacingFlip);
    }
  }

  // ---------- capture: render POV → blit → stamp the broadcast package ----------
  // ⚠ THE ENCODE IS ASYNC NOW. The old path called canvas.toDataURL('image/jpeg') SYNCHRONOUSLY
  // for every captured frame — a main-thread JPEG encode inside the sim frame, over and over while
  // a blocked beam kept the recorder hot. That was the "blocking completely freezes the game"
  // report. The POV render + overlay still land in `this.canvas` (the live PiP monitor), then a
  // SNAPSHOT transfers to a worker for WebP encoding and its readback. Browsers
  // without worker canvas support retain the bounded async pooled fallback.
  // The frame slot holds a '#enc…' token until the blob lands,
  // written back by token so pre-roll shifts and clip
  // shedding can never mis-file a frame. The TV and the cold open skip frames that never landed.
  _captureFrame(arr, lt) {
    if (!this._encoder.available || this.g.world.renderer.isContextLost?.()) return false;
    try { this._renderPOV(lt); } catch { return false; }
    if (this.rec && arr === this.rec.frames && this.rec.shots.at(-1)?.kind !== this._shot?.kind) {
      this.rec.shots.push({ frame: arr.length, kind: this._shot?.kind || 'action' });
    }
    return this._encoder.capture(this.canvas, arr);
  }
  _renderPOV(lt) {
    const g = this.g, world = g.world, r = world.renderer, cv = r.domElement;
    const pr = r.getPixelRatio();
    const target = r.getRenderTarget(), cubeFace = r.getActiveCubeFace(), mip = r.getActiveMipmapLevel();
    const viewport = r.getViewport(new THREE.Vector4()), scissor = r.getScissor(new THREE.Vector4());
    const scissorTest = r.getScissorTest(), sky = world.skyMesh?.position.clone();
    // On small windows the GL canvas can be smaller than the broadcast. Preserve its aspect.
    const scale = Math.min(1, cv.width / FRAME_W, cv.height / FRAME_H);
    const width = Math.max(1, Math.floor(FRAME_W * scale)), height = Math.max(1, Math.floor(FRAME_H * scale));
    // hide the player-UI layer of the scene — news cameras don't see fog-of-war or reticles
    const hidden = [];
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    hide(world.fog); hide(g.reticle); hide(g.redTri); hide(g.playerMark); hide(g.blinkMark);
    hide(this.op); // a shoulder camera cannot film the back of its own operator's head
    const shown = [];
    for (const e of g.entities) if (e.obj && !e.obj.visible) { e.obj.visible = true; shown.push(e.obj); }
    const sm = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;   // reuse this frame's shadow maps
    // the sky rides the EYE (world render loop does the same for the main camera) — without this
    // the POV footage keeps the dome centered on the iso camera and the broadcast horizon skews
    try {
      if (world.skyMesh) world.skyMesh.position.copy(this.cam.position);
      r.setRenderTarget(null);
      r.setViewport(0, 0, width / pr, height / pr);
      r.setScissor(0, 0, width / pr, height / pr);
      r.setScissorTest(true);
      r.render(g.scene, this.cam);
      // Copy before the main scene renders; captures are real scene frames, never re-simulation.
      this.ctx.drawImage(cv, 0, cv.height - height, width, height, 0, 0, FRAME_W, FRAME_H);
      this._overlay(this.ctx, lt);
    } finally {
      r.setRenderTarget(target, cubeFace, mip);
      r.setViewport(viewport); r.setScissor(scissor); r.setScissorTest(scissorTest);
      r.shadowMap.autoUpdate = sm;
      if (sky) world.skyMesh.position.copy(sky);
      for (const o of hidden) o.visible = true;
      for (const o of shown) o.visible = false;
    }
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
    x.save(); x.scale(FRAME_W / W, FRAME_H / H);
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
      const D = this._venueLabel();
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
    x.restore();
  }
  _venueLabel() {
    const g = this.g;
    if (g.modeId === 'ascendance') return 'ASCENDANCE ARENA';
    return hasCity(g.modeId) ? g.world.districtAt(this.opPos.x, this.opPos.z)
      : MODES.find(m => m.id === g.modeId)?.name || 'ASCENDANCE ARENA';
  }
  _fit(x, s, w) { if (x.measureText(s).width <= w) return s; while (s.length > 4 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
}
