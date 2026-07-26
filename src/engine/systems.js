// TIER THREE — the engine systems from docs/POWERS_BRIEF.md Part Five.
//
// The brief's framing: *"Each of these requires a new engine system. Each system should unlock
// an entire family of future kits rather than serving only one character."* So these live here,
// together, as SYSTEMS with public verbs — not as abilities. `abilities.js` calls into them;
// so can the police, the career, a cutscene, or a hero we haven't written yet.
//
// Every one keeps the house laws: damage goes through `takeDamage`, nothing is keyed on a hero
// id, each has a readable tell and a counter, and each cleans up after itself.
import * as THREE from 'three';

// ============================================================================================
// 1 · WEATHER COMMAND — a real layer: rain, wind, cloud density, lightning.
// Global, gradual (never a switch), and it MOVES things: rain bends with wind, debris and
// smoke drift, and lightning lights whole building silhouettes.
// ============================================================================================
import { STATES, WIND_DRAG, pickWeather } from '../data/weather.js';

export class Weather {
  constructor(game) {
    this.g = game;
    this.rain = 0; this.wind = 0; this.windDir = 0; this.cloud = 0; this.storm = 0;
    this._target = { rain: 0, wind: 0, cloud: 0 };
    this._mesh = null; this._boltT = 0; this._srcT = 0; this._src = null;
    this.stateId = 'clear'; this._hold = 0; this._natural = 'clear';
  }
  // ⚠ EXTENDED IN PLACE, NOT REPLACED. I wrote a second Weather class beside this one and the
  // duplicate silently won the import — the exact failure `docs/SYSTEM_MAP.md` exists to prevent
  // (build THROUGH a system, never beside it). What was missing here was not the ramping or the
  // rain, which were already good; it was a NAMED STATE the rest of the game can read, a wind
  // VECTOR that other systems can ask for a force from, and a visibility figure for the AI.

  /** The named state (data/weather.js). Other systems read this, never the raw numbers. */
  set(id, { hold = 0, instant = false } = {}) {
    const S = STATES[id]; if (!S) return this.stateId;
    this.stateId = id;
    this._target = { rain: S.rain, wind: S.wind, cloud: S.cloud };
    this.storm = S.thunder ? Math.max(this.storm, 0.7) : 0;
    this._hold = hold;
    if (instant) { this.rain = S.rain; this.wind = S.wind; this.cloud = S.cloud; }
    if (this.g && this.g.hud && this.g.hud.feed) this.g.hud.feed('WEATHER — ' + S.n, '#9fd0ff');
    return id;
  }
  get state() { return STATES[this.stateId] || STATES.clear; }
  /** ⚠ THE ONE THE AI READS — and the only wire weather needs into it. Shortening sight range is
   *  enough, because the honesty law already forbids acting on anything not earned by sight, radio
   *  or noise. A bot in a storm genuinely loses you, with no weather branch in ai.js. */
  get visMult() { const S = this.state; return 1 - (1 - S.vis) * Math.min(1, this.rain + this.cloud * 0.4); }
  get windSpeed() { return this.wind * 42 * (1 + Math.sin(this._srcT * 0.7) * 0.28); }

  /**
   * Wind force on a moving thing, units/second. ⚠ `kind` is a LOOKUP in WIND_DRAG; a projectile
   * whose kind is not in that table — every ki blast, beam and orb — gets ZERO. Energy is exempt BY
   * CONSTRUCTION, never by an `if`. Callers pass a kind, never a boolean.
   */
  force(kind, out) {
    const d = WIND_DRAG[kind];
    const o = out || { x: 0, y: 0, z: 0 };
    if (!d || this.wind <= 0.002) { o.x = o.y = o.z = 0; return o; }
    const a = this.windDir || 0, s = this.windSpeed * d;
    o.x = Math.cos(a) * s; o.y = 0; o.z = Math.sin(a) * s;
    return o;
  }

  /** Raised with a city: the world decides what is possible, the climate biases it. */
  setCity(plan, climate) {
    this._natural = pickWeather((plan && plan.world) || 'earth', climate);
    return this.set(this._natural, { instant: true });
  }

  // a power (or a script) ASKS for weather; it arrives over `ramp` seconds, never instantly
  command({ rain = 0, wind = 0, cloud = 0, storm = 0, dur = 12, src = null } = {}) {
    // ⚠ AN ABILITY ASKS FOR A STATE, IT DOES NOT AUTHOR ONE — so a commanded storm and a natural
    // storm are the same thing to every reader.
    const want = storm >= 0.7 ? 'storm' : rain >= 0.6 ? 'rain' : rain > 0 ? 'drizzle'
      : cloud >= 0.6 ? 'cloudy' : wind >= 0.6 ? 'storm' : 'fair';
    this.stateId = want; this._hold = dur;
    this._target = { rain, wind, cloud };
    this.storm = storm; this._srcT = dur; this._src = src;
    this.windDir = Math.random() * Math.PI * 2;
    return this;
  }
  clear() { this._target = { rain: 0, wind: 0, cloud: 0 }; this.storm = 0; this._src = null; }

  _buildRain() {
    const N = 1400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * 300;
      pos[i * 3 + 1] = Math.random() * 220;
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * 300;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: '#a8c4d8', size: 1.1, transparent: true, opacity: 0.5, depthWrite: false });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    this.g.scene.add(p);
    this._mesh = p;
    return p;
  }
  update(dt) {
    const T = this._target;
    if (this._srcT > 0) { this._srcT -= dt; if (this._srcT <= 0) this.clear(); }
    // GRADUAL — the brief is explicit that global weather must build, not switch
    this.rain += (T.rain - this.rain) * Math.min(1, dt * 0.55);
    this.wind += (T.wind - this.wind) * Math.min(1, dt * 0.4);
    this.cloud += (T.cloud - this.cloud) * Math.min(1, dt * 0.35);

    if (this.rain > 0.02) {
      if (!this._mesh) this._buildRain();
      const p = this._mesh;
      p.visible = true;
      p.material.opacity = 0.12 + this.rain * 0.5;
      const arr = p.geometry.attributes.position.array;
      const fall = (90 + this.rain * 120) * dt;
      const wx = Math.cos(this.windDir) * this.wind * 40 * dt, wz = Math.sin(this.windDir) * this.wind * 40 * dt;
      const cam = this.g.world.camera;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= fall; arr[i] += wx; arr[i + 2] += wz;                 // RAIN BENDS WITH WIND
        // the same law as the tether: a persistent buffer never takes a non-finite value
        if (!Number.isFinite(arr[i]) || !Number.isFinite(arr[i + 1]) || !Number.isFinite(arr[i + 2])) { arr[i] = 0; arr[i + 1] = 200; arr[i + 2] = 0; }
        if (arr[i + 1] < 0) {
          arr[i + 1] = 200 + Math.random() * 30;
          arr[i] = cam.position.x + (Math.random() * 2 - 1) * 280;
          arr[i + 2] = cam.position.z + (Math.random() * 2 - 1) * 280;
        }
      }
      p.geometry.attributes.position.needsUpdate = true;
    } else if (this._mesh) this._mesh.visible = false;

    // WIND MOVES THE WORLD: loose debris and smoke drift, and fighters in the air get pushed
    if (this.wind > 0.15) {
      const wx = Math.cos(this.windDir) * this.wind, wz = Math.sin(this.windDir) * this.wind;
      for (const f of this.g.entities) {
        if (!f.alive || f.grounded) continue;
        f.vel.x += wx * 14 * dt; f.vel.z += wz * 14 * dt;
      }
    }
    // LIGHTNING lights the whole skyline, and can actually strike
    if (this.storm > 0) {
      this._boltT -= dt;
      if (this._boltT <= 0) {
        this._boltT = 1.2 + Math.random() * (7 - this.storm * 4);
        const px = (this.g.player ? this.g.player.pos.x : 0) + (Math.random() * 2 - 1) * 120;
        const pz = (this.g.player ? this.g.player.pos.z : 0) + (Math.random() * 2 - 1) * 120;
        this.g.hud && this.g.hud.flashScreen && this.g.hud.flashScreen('#c8d8ff', 0.09);
        this.g.vfx.lightning(new THREE.Vector3(px, 0, pz), { color: '#dfe9ff', count: 5, radius: 6, height: 120 });
        this.g.later(() => this.g.audio.boom(0.85, { x: px, y: 0, z: pz }), 220 + Math.random() * 500);   // thunder must not outlive its storm
        if (this.storm > 0.6 && this._src) this.g.areaDamage(this._src, new THREE.Vector3(px, 1, pz), 9, 26, 1.2, { dtype: 'energy', shock: true });
      }
    }
  }
  dispose() {
    if (this._mesh) {
      this.g.scene.remove(this._mesh);
      this._mesh.geometry.dispose(); this._mesh.material.dispose();
      this._mesh = null;
    }
  }
}

// ============================================================================================
// 2 · SIZE CHANGE — scale-aware body, mass, reach and impact.
// The brief warns this "touches nearly everything", so it deliberately rides the systems that
// ALREADY exist: applyFrame reshapes the meshes (never the group — the ragdoll law), the weight
// ladder gives mass, and reach/damage scale from the same number.
// ============================================================================================
export function setSize(f, scale, dur = 0, game = null) {
  const s = Math.max(0.35, Math.min(3.2, scale));
  if (!f._sizeBase) f._sizeBase = { radius: f.radius, speed: f.def.speed || 30, str: f.def.strength ?? 5 };
  f.sizeScale = s;
  f._sizeT = dur;
  // the BODY: reshape the meshes, never the group (markers + ragdoll assume group scale 1)
  const P = f.parts;
  if (P && P.torso) {
    for (const key of ['torso', 'head', 'pelvis', 'armL', 'armR', 'legL', 'legR', 'neck']) {
      const m = P[key]; if (!m) continue;
      if (!m.userData._sz0) m.userData._sz0 = m.scale.clone();
      m.scale.copy(m.userData._sz0).multiplyScalar(s);
    }
    if (P.torso.parent) {
      // stand taller: lift the whole rig off the ground by the extra height it now has
      f._sizeLift = (s - 1) * 4.6;
    }
  }
  f.radius = f._sizeBase.radius * s;
  // MASS and REACH move together — a giant is slower, hits harder, and is harder to move
  f.speed = f._sizeBase.speed * (s > 1 ? 1 / (1 + (s - 1) * 0.45) : 1 + (1 - s) * 0.55);
  f._sizeMight = s > 1 ? 1 + (s - 1) * 0.9 : 1 - (1 - s) * 0.35;
  f._sizeKb = s > 1 ? 1 / (1 + (s - 1) * 1.2) : 1 + (1 - s) * 0.8;
  if (game) {
    game.vfx.ring(f.pos.clone().setY(1), { color: s > 1 ? '#ffd24a' : '#7fe6ff', r0: s > 1 ? 1 : 10, r1: s > 1 ? 12 * s : 1, life: 0.35, flat: true, y: 0.6 });
    game.particles.burst(f.pos.x, f.pos.y + 4, f.pos.z, { count: 16, speed: s > 1 ? 22 : 8, life: 0.5, size: 3, color: ['#c9c2b4', '#8b8577'], up: s > 1 ? 6 : -4, drag: 1.2 });
    game.audio.impact(s > 1 ? 1.3 : 0.5, f.pos);
    if (s > 1) game.world.shake(0.8 * s);
  }
  return s;
}
export function updateSize(f, dt, game) {
  if (!f._sizeT || f._sizeT <= 0) return;
  f._sizeT -= dt;
  if (f._sizeT <= 0) setSize(f, 1, 0, game);
}

// ============================================================================================
// 3 · TIME DILATION FIELD — a local time-scale bubble.
// The world already has slow-motion hooks; this makes them SPATIAL. Inside the sphere everything
// but the caster's side runs slow; crossing the boundary is readable because the trail stretches.
// ============================================================================================
export class TimeFields {
  constructor(game) { this.g = game; this.list = []; }
  add(pos, r, dur, scale, src) {
    const f = { x: pos.x, y: pos.y, z: pos.z, r, t: dur, dur, scale, src, mesh: null };
    const geo = new THREE.SphereGeometry(r, 18, 12);
    const mat = new THREE.MeshBasicMaterial({ color: '#9fd0ff', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
    f.mesh = new THREE.Mesh(geo, mat);
    f.mesh.position.set(pos.x, pos.y, pos.z);
    this.g.scene.add(f.mesh);
    this.list.push(f);
    this.g.audio.zap(220, pos);
    return f;
  }
  // the multiplier a given fighter is currently living under
  scaleFor(fighter) {
    let s = 1;
    for (const f of this.list) {
      if (fighter === f.src) continue;                 // the caster is who this is FOR
      const dx = fighter.pos.x - f.x, dy = fighter.pos.y - f.y, dz = fighter.pos.z - f.z;
      if (dx * dx + dy * dy + dz * dz <= f.r * f.r) s = Math.min(s, f.scale);
    }
    return s;
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]; f.t -= dt;
      const k = Math.max(0, f.t / f.dur);
      if (f.mesh) { f.mesh.material.opacity = 0.06 + k * 0.09; f.mesh.scale.setScalar(0.9 + 0.1 * Math.sin(this.g.time * 3)); }
      // suspended matter: dust hangs inside the bubble
      if (Math.random() < dt * 12) {
        const a = Math.random() * Math.PI * 2, rr = f.r * Math.sqrt(Math.random());
        this.g.particles.spawn({ x: f.x + Math.cos(a) * rr, y: f.y + (Math.random() * 2 - 1) * f.r * 0.6, z: f.z + Math.sin(a) * rr,
          vx: 0, vy: 0.2, vz: 0, life: 1.4, size: 1.2, color: ['#9fd0ff', '#cfe6ff'], drag: 4 });
      }
      if (f.t <= 0) {
        this.g.scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose();
        this.list.splice(i, 1);
      }
    }
  }
  clear() { for (const f of this.list) { this.g.scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); } this.list.length = 0; }
}

// ============================================================================================
// 7 · INVISIBILITY — a render state AND a perception layer.
// The brief is specific: never perfectly invisible to the CONTROLLING player, and enemy
// perception should depend on movement, proximity and disturbance. So it is a VISIBILITY
// SCORE, not a boolean — and moving fast, attacking, or standing in rain gives you away.
// ============================================================================================
export function setInvisible(f, dur, game) {
  f._invis = { t: dur, seen: 0 };
  if (f.obj) f.obj.traverse(o => {
    if (o.material && o.material.transparent !== undefined) {
      if (!o.userData._inv0) o.userData._inv0 = o.material.opacity ?? 1;
      o.material.transparent = true;
    }
  });
  game.vfx.ring(f.pos.clone().setY(4), { color: '#cfe6ff', r0: 6, r1: 0.5, life: 0.35 });
  game.audio.teleport(f.pos);
}
export function updateInvisible(f, dt, game) {
  const I = f._invis; if (!I) return;
  I.t -= dt;
  const spd = Math.hypot(f.vel.x, f.vel.z);
  // WHAT GIVES YOU AWAY: movement, and having just attacked. Standing still is near-perfect.
  const disturb = Math.min(1, spd / 34) * 0.75 + (f._bright > 0 ? 0.5 : 0);
  I.seen += (disturb - I.seen) * Math.min(1, dt * 3);
  const vis = Math.max(0.06, Math.min(0.9, I.seen));
  if (f.obj) f.obj.traverse(o => {
    if (o.material && o.userData._inv0 !== undefined) o.material.opacity = (game.isHuman(f) ? Math.max(0.28, vis) : vis) * o.userData._inv0;
  });
  // the rain outlines you — disturbance is the counter the brief asks for
  if (game.weather && game.weather.rain > 0.3 && Math.random() < dt * 20) {
    game.particles.spawn({ x: f.pos.x + (Math.random() * 2 - 1) * 2, y: f.pos.y + Math.random() * 9, z: f.pos.z + (Math.random() * 2 - 1) * 2,
      vx: 0, vy: -6, vz: 0, life: 0.25, size: 0.9, color: ['#a8c4d8'], drag: 1 });
  }
  if (I.t <= 0) {
    f._invis = null;
    if (f.obj) f.obj.traverse(o => { if (o.material && o.userData._inv0 !== undefined) o.material.opacity = o.userData._inv0; });
    game.vfx.ring(f.pos.clone().setY(4), { color: '#cfe6ff', r0: 0.5, r1: 6, life: 0.3 });
  }
}
// what an ENEMY can perceive — used by AI vision, so invisibility is a real perception layer
export function perceivedVisibility(f) {
  if (!f._invis) return 1;
  return Math.max(0.05, Math.min(1, f._invis.seen));
}

// ============================================================================================
// 17 · REGENERATION FACTOR — a knockout becomes a DOWNED window unless you are finished.
// Second Wind (manual §13) proved the downed state for humans; this is the data-driven version
// any fighter can carry, with the finisher window the brief asks for.
// ============================================================================================
export function beginRegen(f, cfg, game) {
  f._regen = { t: cfg.window || 4, hp: cfg.hp || 0.45, rate: cfg.rate || 0, done: false };
  f.hp = 1; f.downedT = Math.max(f.downedT || 0, cfg.window || 4);
  game.vfx.ring(f.pos.clone().setY(1), { color: '#8fe08a', r0: 1, r1: 9, life: 0.5, flat: true, y: 0.5 });
  game.slowmo(0.25, 0.5);
  if (game.hud) game.hud.announce('REGENERATING', 'finish them, or they get up', '#8fe08a');
}
export function updateRegen(f, dt, game) {
  const R = f._regen; if (!R) return;
  R.t -= dt;
  // the pulse travels outward from the heart — wounds closing in reverse
  if (Math.random() < dt * 10) game.particles.spawn({ x: f.pos.x, y: f.pos.y + 5, z: f.pos.z, vx: (Math.random() * 2 - 1) * 5, vy: 3, vz: (Math.random() * 2 - 1) * 5, life: 0.5, size: 1.8, color: ['#8fe08a', '#cfffd0'], drag: 1.4 });
  if (R.t <= 0) {
    f._regen = null;
    f.hp = Math.min(f.maxHp, f.maxHp * R.hp);
    f.downedT = 0; f.staggerT = 0; f.invuln = Math.max(f.invuln || 0, 1.2);
    f.clotBleed && f.clotBleed(game);
    game.vfx.ring(f.pos.clone().setY(1), { color: '#8fe08a', r0: 1, r1: 14, life: 0.4, flat: true, y: 0.5 });
    game.audio.kiRelease(0.6, f.pos);
    if (game.hud) game.hud.announce('BACK UP', f.name + ' regenerated', '#8fe08a');
  }
}

// ============================================================================================
// 18 · BANISHMENT — a pocket dimension, for a fixed period.
// The victim leaves the field entirely (not a teleport across it), a return SCAR marks where
// they went, and they come back exactly there.
// ============================================================================================
export function banish(victim, dur, game, src) {
  if (!victim || victim._banished || victim.def.police) return false;
  const at = victim.pos.clone();
  victim._banished = { t: dur, at, src };
  victim.obj.visible = false;
  victim.invuln = 9999;                      // they are not HERE — nothing can touch them
  victim._banishNoAct = true;
  // the cage: a vertical shadow lattice that collapses to a point
  const cage = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 16, 0.4), new THREE.MeshBasicMaterial({ color: '#2a2030', transparent: true, opacity: 0.85 }));
    bar.position.set(at.x + Math.cos(a) * 4, at.y + 8, at.z + Math.sin(a) * 4);
    cage.add(bar);
  }
  game.scene.add(cage);
  victim._banished.cage = cage;
  // the SCAR stays behind — you can see where someone was taken from
  game.vfx.ring(at.clone().setY(0.4), { color: '#5a4a6a', r0: 5, r1: 1.5, life: 0.6, flat: true, y: 0.4 });
  game.audio.teleport(at); game.audio.boom(0.4, at);
  if (game.hud) game.hud.announce('BANISHED', victim.name + ' is elsewhere', '#8b7aa0');
  return true;
}
export function updateBanish(f, dt, game) {
  const B = f._banished; if (!B) return;
  B.t -= dt;
  if (B.cage) {
    const k = Math.max(0, B.t / 1);
    B.cage.scale.setScalar(Math.max(0.02, Math.min(1, B.t > 0.4 ? 1 : B.t / 0.4)));
    B.cage.rotation.y += dt * 1.6;
  }
  // the scar pulses at the departure point the whole time
  if (Math.random() < dt * 6) game.particles.spawn({ x: B.at.x + (Math.random() * 2 - 1) * 3, y: 0.5, z: B.at.z + (Math.random() * 2 - 1) * 3, vx: 0, vy: 2, vz: 0, life: 0.6, size: 2, color: ['#5a4a6a', '#8b7aa0'], drag: 1.5 });
  if (B.t <= 0) {
    f.pos.copy(B.at); f.obj.visible = true; f.invuln = 0.6; f._banishNoAct = false;
    if (B.cage) { game.scene.remove(B.cage); B.cage.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    f._banished = null;
    game.vfx.ring(B.at.clone().setY(1), { color: '#8b7aa0', r0: 1, r1: 8, life: 0.4 });
    game.audio.teleport(B.at);
  }
}

// ============================================================================================
// 19 · GRAVITY INVERSION ZONE — reverse gravity in an area.
// Debris and dust react FIRST (the warning), then bodies lift. The ceiling becomes the floor.
// ============================================================================================
export class GravityZones {
  constructor(game) { this.g = game; this.list = []; }
  add(pos, r, dur, mult, src) {
    const z = { x: pos.x, y: pos.y, z: pos.z, r, t: dur, dur, mult, src, warn: 0.6 };
    this.list.push(z);
    this.g.audio.blast(90, 0.4, pos);
    this.g.vfx.ring(pos.clone().setY(0.5), { color: '#9fd0ff', r0: 1, r1: r, life: 0.5, flat: true, y: 0.5 });
    return z;
  }
  gravityFor(f) {
    for (const z of this.list) {
      if (z.warn > 0) continue;                       // the warning beat: debris only, bodies later
      const dx = f.pos.x - z.x, dz = f.pos.z - z.z;
      if (dx * dx + dz * dz <= z.r * z.r) return z.mult;
    }
    return 1;
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const z = this.list[i];
      if (z.warn > 0) z.warn -= dt;
      z.t -= dt;
      // particles fall UP inside the boundary — the readable tell
      if (Math.random() < dt * 40) {
        const a = Math.random() * Math.PI * 2, rr = z.r * Math.sqrt(Math.random());
        this.g.particles.spawn({ x: z.x + Math.cos(a) * rr, y: z.y + Math.random() * 4, z: z.z + Math.sin(a) * rr,
          vx: 0, vy: 9 + Math.random() * 6, vz: 0, life: 1.2, size: 1.4, color: ['#9fd0ff', '#cfe6ff', '#6a6f7a'], drag: 0.4 });
      }
      // A GROUNDED fighter is pinned by the floor clamp, so a sign flip alone would do nothing.
      // Inside an inverted zone the ground lets go: they come off the deck and fall upward.
      if (z.warn <= 0 && z.mult < 0) {
        for (const f of this.g.entities) {
          if (!f.alive || f === z.src) continue;
          const dx = f.pos.x - z.x, dz = f.pos.z - z.z;
          if (dx * dx + dz * dz > z.r * z.r) continue;
          if (f.grounded || f.pos.y < 1.2) { f.pos.y = Math.max(f.pos.y, 1.4); f.vel.y = Math.max(f.vel.y, 16); f.onBlock = false; }
        }
      }
      if (z.t <= 0) this.list.splice(i, 1);
    }
  }
  clear() { this.list.length = 0; }
}

