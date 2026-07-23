// THRESHOLD — the POLICE. The Witness Layer grows teeth: THE VILLAIN IS WHOEVER HURTS HUMANS.
// Every civilian a fighter puts down builds HEAT; cross the line and the city dispatches units —
// how FAST depends on the theater's SAFETY INDEX off the world sheet (safe cities respond in
// seconds; lawless ones take their time). Cruisers roll in from the map edge with light bars
// running, officers pile out and FIXATE on the villain only — heroes who keep civilians out of
// it never see a badge. KO'ing an officer is villainy squared. Heat decays; the news covers all
// of it. Police are real Fighters (AI, ragdolls, the crew films them) but never enter the Elo book.
import * as THREE from 'three';
import { AI } from './ai.js';
import { clamp } from '../core/util.js';

const HEAT_CIV = 12, HEAT_COP = 40, THRESH = 35;

export const COP_DEF = {
  id: 'police', police: true, name: 'OFFICER', title: 'City Police', role: 'Response Unit',
  colors: { primary: '#1c2d4a', secondary: '#14161c', accent: '#5aa0ff', skin: '#caa27a' },
  hp: 60, ki: 60, speed: 26, strength: 3, overdrive: 0, threat: 'Low', flightTier: 0, meleeTiers: 2,
  ai: { style: 'zoner', range: 36, aggro: 0.6, fly: 0 },
  evade: { kind: 'dash', name: 'Take Cover' },
  abilities: {
    lmb: { type: 'rifle', name: 'Service Pistol', cost: 1.5, interval: 0.46, damage: 5, speed: 130, radius: 0.6, color: '#cfe0ff' },
    shift: { type: 'dash', name: 'Sprint', cost: 4, cd: 0.9, power: 70, iframes: 0.1, color: '#5aa0ff' },
  },
};
export const SWAT_DEF = {
  ...COP_DEF, id: 'police', name: 'SWAT', title: 'Special Response', role: 'Tactical Unit',
  colors: { primary: '#16181e', secondary: '#0e1013', accent: '#5aa0ff', skin: '#caa27a' },
  hp: 95, speed: 28, strength: 5, meleeTiers: 3,
  abilities: {
    lmb: { type: 'rifle', name: 'Tactical Carbine', cost: 1.5, interval: 0.16, damage: 4, speed: 150, radius: 0.55, color: '#cfe0ff' },
    shift: { type: 'dash', name: 'Breach Sprint', cost: 4, cd: 0.8, power: 80, iframes: 0.12, color: '#5aa0ff' },
  },
};

export class PoliceSystem {
  constructor(game) {
    this.g = game;
    this.heat = new Map();          // fighter → heat
    this.cruisers = [];             // { grp, barR, barB, t, from, to, arrived, spawned }
    this.cops = [];
    this._reinforceT = 0; this._respT = -1; this._unitNo = 0;
    this._lastHarmT = -99; this._announced = false;
  }
  reset() {
    this.heat.clear();
    for (const c of this.cruisers) { this.g.scene.remove(c.grp); c.grp.traverse(o => { if (o.geometry && o.geometry !== this.g.world._carGeo) o.geometry.dispose(); if (o.material && !o.material._shared) o.material.dispose(); }); }
    this.cruisers.length = 0;
    this.cops.length = 0;           // the fighters themselves are cleared by startMode
    this._respT = -1; this._reinforceT = 0; this._announced = false; this._lastHarmT = -99;
  }
  get active() { return !!(this.g.mode && this.g.modeId !== 'training' && !(this.g.netplay && this.g.netplay.active)); }

  heatOf(f) { return this.heat.get(f) || 0; }
  wantedLevel(f) { const h = this.heatOf(f); return h >= 160 ? 3 : h >= 90 ? 2 : h >= THRESH ? 1 : 0; }
  villain() {
    let best = null, bh = THRESH - 0.01;
    for (const [f, h] of this.heat) if (f.alive !== undefined && h > bh && f.def && !f.def.police && this.g.entities.includes(f)) { bh = h; best = f; }
    return best;
  }

  // a blast just put civilians on the ground — the perpetrator owns that
  onCivHarm(src, n) {
    if (!this.active || !src || !src.def || src.def.police) return;
    this.heat.set(src, this.heatOf(src) + n * HEAT_CIV);
    this._lastHarmT = this.g.time;
    const lvl = this.wantedLevel(src);
    if (lvl > 0 && this.g.hud && this.g.isHuman(src)) this.g.hud.feed(`🚨 WANTED ${'★'.repeat(lvl)} — civilians harmed`, '#5aa0ff');
  }
  onCopDown(killer) {
    if (!this.active || !killer || !killer.def || killer.def.police) return;
    this.g.cityStats.cops = (this.g.cityStats.cops || 0) + 1;
    this.heat.set(killer, this.heatOf(killer) + HEAT_COP);
    this._lastHarmT = this.g.time;
  }

  // response delay from the theater's safety index: safety 80 ≈ 6s · safety 20 ≈ 22s
  _responseDelay() {
    const safety = (this.g.world.plan && this.g.world.plan.safety) || 50;
    return clamp(26 - safety * 0.25, 5, 24);
  }

  update(dt) {
    const g = this.g;
    if (!this.active) return;
    // heat decays once the harming stops
    if (g.time - this._lastHarmT > 6) {
      for (const [f, h] of this.heat) { const nh = h - dt * 1.3; if (nh <= 0) this.heat.delete(f); else this.heat.set(f, nh); }
    }
    const V = this.villain();
    // escalation drama: each wanted star is NEWS ("SWAT AUTHORIZED" at three)
    if (V) {
      const lvl = this.wantedLevel(V);
      if (lvl > (this._lastLvl || 0) && this.cops.length > 0) {
        if (g.hud) g.hud.announce(`WANTED ${'★'.repeat(lvl)}`, lvl >= 3 ? 'SPECIAL RESPONSE AUTHORIZED' : 'ADDITIONAL UNITS EN ROUTE', '#5aa0ff');
        try { g.audio.siren(V.pos, lvl); } catch {}
        if (g.news && lvl >= 3) g.news.highlight('police', 'SWAT AUTHORIZED — ' + g.world.districtAt(V.pos.x, V.pos.z), { dur: 2.2, priority: 2, focus: V.pos });
      }
      this._lastLvl = lvl;
    } else this._lastLvl = 0;
    // cruiser drive-ins
    for (const c of this.cruisers) {
      if (!c.arrived) {
        c.t += dt / 1.7;
        const k = Math.min(1, c.t), e = 1 - Math.pow(1 - k, 3);
        c.grp.position.lerpVectors(c.from, c.to, e);
        if (k >= 1) { c.arrived = true; this._deploy(c, V); }
      }
      const blink = (g.time * 4) % 1 < 0.5;
      c.barR.material.emissiveIntensity = blink ? 2.6 : 0.3;
      c.barB.material.emissiveIntensity = blink ? 0.3 : 2.6;
    }
    this.cops = this.cops.filter(f => g.entities.includes(f));
    // no villain → units stand down (officers jog off and vanish)
    if (!V) {
      this._respT = -1; this._announced = false;
      for (const f of this.cops) if (!f._leaving) { f._leaving = true; f._leaveT = 3.2; }
      for (const f of this.cops) if (f._leaving && f.alive) { f._leaveT -= dt; if (f._leaveT <= 0) { f.noRespawn = true; f._remove = true; } }
      return;
    }
    // villain confirmed: the clock starts (speed = the city's safety index)
    for (const f of this.cops) { f._leaving = false; f.fixation = V; if (f.ai) f.ai.level = 0.85 + this.wantedLevel(V) * 0.15; }
    if (this._respT < 0 && this.cops.length === 0) {
      this._respT = this._responseDelay();
      if (g.hud && !this._announced) {
        this._announced = true;
        g.hud.announce('🚨 WANTED', `${V.name} — units dispatched (ETA ${Math.round(this._respT)}s)`, '#5aa0ff');
        g.hud.feed(`🚨 ${V.name} flagged — response en route`, '#5aa0ff');
        if (g.news) g.news.highlight('police', 'POLICE DISPATCHED — ' + g.world.districtAt(V.pos.x, V.pos.z), { dur: 2.2, priority: 1, focus: V.pos });
        g.matchLog.push({ t: g.matchT, type: 'police', v: V.name, vid: V.def.id, at: g.world.districtAt(V.pos.x, V.pos.z) });
      }
    }
    if (this._respT > 0) { this._respT -= dt; if (this._respT <= 0) this._sendCruiser(V); }
    // reinforcements while the villain stays hot
    this._reinforceT -= dt;
    const cap = 2 + this.wantedLevel(V) * 2;
    if (this._reinforceT <= 0 && this.cops.filter(f => f.alive).length < Math.min(cap, 8) && this.cops.length > 0) {
      this._reinforceT = 16;
      this._sendCruiser(V);
    }
  }

  _sendCruiser(V) {
    const g = this.g, w = g.world, A = w.ARENA;
    // roll in from the nearest dry edge, stop short of the villain
    const edges = [[-A + 6, V.pos.z], [Math.min(A, w.waterX) - 10, V.pos.z], [V.pos.x, -A + 6], [V.pos.x, A - 6]]
      .filter(([x]) => x < w.waterX - 8);
    let from = edges[0], bd = 1e9;
    for (const e of edges) { const d = Math.hypot(e[0] - V.pos.x, e[1] - V.pos.z); if (d < bd) { bd = d; from = e; } }
    const dx = V.pos.x - from[0], dz = V.pos.z - from[1], dl = Math.hypot(dx, dz) || 1;
    const stop = new THREE.Vector3(V.pos.x - (dx / dl) * 44, 0, V.pos.z - (dz / dl) * 44);
    stop.x = clamp(stop.x, -A + 16, w.waterX - 14); stop.z = clamp(stop.z, -A + 16, A - 16);
    // the cruiser: shared car body in black-and-white + a working light bar
    const grp = new THREE.Group();
    const white = w._cruiserMat || (w._cruiserMat = Object.assign(new THREE.MeshStandardMaterial({ color: '#e8e8ea', roughness: 0.4, metalness: 0.4 }), { _shared: true }));
    const body = new THREE.Mesh(w._carGeo, white); body.castShadow = false; body.receiveShadow = true; grp.add(body);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 9.7), Object.assign(new THREE.MeshStandardMaterial({ color: '#16181e', roughness: 0.6 }), {}));
    hood.position.set(8, 5.3, 0); grp.add(hood);
    const barR = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 3.6), new THREE.MeshStandardMaterial({ color: '#7a1616', emissive: '#ff2f2f', emissiveIntensity: 2 }));
    barR.position.set(-1.6, 9.1, -2.2); grp.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 3.6), new THREE.MeshStandardMaterial({ color: '#16307a', emissive: '#3a7aff', emissiveIntensity: 0.3 }));
    barB.position.set(-1.6, 9.1, 2.2); grp.add(barB);
    grp.position.set(from[0], 0, from[1]);
    grp.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    g.scene.add(grp);
    const cr = { grp, barR, barB, t: 0, from: new THREE.Vector3(from[0], 0, from[1]), to: stop, arrived: false };
    this.cruisers.push(cr);
    try { g.audio.siren({ x: from[0], z: from[1] }, 2); } catch {}
  }
  _deploy(cruiser, V) {
    const g = this.g;
    if (!V || !this.active) return;
    const lvl = this.wantedLevel(V);
    const def = lvl >= 3 ? SWAT_DEF : COP_DEF;
    const n = lvl >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      this._unitNo++;
      const d = { ...def, name: `${def.name} ${String(this._unitNo).padStart(2, '0')}` };
      const f = g.addFighter(d, { team: 2, x: cruiser.grp.position.x + (i - n / 2) * 7, z: cruiser.grp.position.z + 6 });
      f.ai = new AI(f, 0.85); f.fixation = V; f.noRespawn = true;
      g.vfx.ring(f.pos.clone().setY(0.5), { color: '#5aa0ff', r0: 1, r1: 6, life: 0.3, flat: true, y: 0.5 });
    }
    this.cops.push(...g.entities.slice(-n));
    // the cruiser parks and becomes part of the street (destructible like any car)
    g.world.cars.push({ mesh: cruiser.grp, x: cruiser.grp.position.x, z: cruiser.grp.position.z, hp: 30, maxHp: 30, dead: false, paint: cruiser.grp.children[0].material });
    if (g.hud) g.hud.feed(`🚔 Units on scene — ${V.name} is the target`, '#5aa0ff');
    if (g.news) g.news.highlight('police', 'UNITS ON SCENE — ' + g.world.districtAt(cruiser.grp.position.x, cruiser.grp.position.z), { dur: 2.2, priority: 1, focus: cruiser.grp.position });
  }
}
