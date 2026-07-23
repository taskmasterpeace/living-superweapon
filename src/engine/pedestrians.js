// THRESHOLD — the crowd, v2. LSW-SCALE civilians (creator ruling: same size as the heroes)
// with heads, who walk the SIDEWALKS in straight lines — turning only at intersections —
// instead of jittering around the road. They still stop to FILM nearby superweapons
// (phone flashes), scatter from violence, and get knocked flat by blasts (collateral).
// Two instanced draws total (bodies + heads).
import * as THREE from 'three';

const COUNT = 30;
const WALK = 0, FLEE = 1, DOWN = 2, FILM = 3, ARMED = 4;

// THE VIGILANTISM LAW (Robert's ruling, 2026-07-23) — the country sheet decides how a street
// reacts to a superweapon, and it does it through the people ON that street:
//   · A civilian who SEES you hurt someone starts FILMING. Where vigilantism is BANNED, that
//     footage is evidence — every phone pointed at you pushes POLICE HEAT up.
//   · Where vigilantism is BANNED, some of them don't film. They draw. An armed citizen is not
//     a threat to a superweapon on paper (a pistol against a Might-10 frame does almost nothing —
//     see the ballistic scale) but it is a statement: this city does not want you here, and every
//     shot fired is another siren.
//   · Where it is LEGAL, nobody films you like a criminal and nobody draws. You are supposed to
//     be here.
// Chance a witness to VIOLENCE is carrying, by the country's stance on vigilantes:
//   Legal      — you're a sanctioned Ascendant. Nobody draws on you. Ever. (They cheer clean wins.)
//   Regulated  — neutral. They'll only pull a weapon if you bring the violence CLOSE to them.
//   Banned     — you're a criminal on sight of violence; they draw from across the street.
const ARM_RATE = { Banned: 0.34, Regulated: 0.18, Legal: 0 };

const GRID = 96, SIDEWALK = 8;                          // street pitch + sidewalk offset from the lane line
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1);

export class Pedestrians {
  constructor(scene, arena, waterX) {
    this.arena = arena; this.waterX = waterX;
    // body + head — hero-height (≈9.4u vs the 9.6u figures)
    const bodyGeo = new THREE.CapsuleGeometry(1.05, 5.0, 3, 8); bodyGeo.translate(0, 3.65, 0);
    const headGeo = new THREE.SphereGeometry(0.98, 8, 7); headGeo.translate(0, 8.35, 0);
    this.mesh = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), COUNT);
    this.head = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }), COUNT);
    for (const m of [this.mesh, this.head]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; }
    const col = new THREE.Color();
    const CIV = ['#8a8577', '#5a6a7a', '#7a5a4a', '#4a5a4a', '#9a8a6a', '#6a4a5a', '#7a7a8a'];
    const SKIN = ['#e8c39a', '#caa27a', '#8a5a3a', '#5a3a24'];
    for (let i = 0; i < COUNT; i++) {
      this.mesh.setColorAt(i, col.set(CIV[i % CIV.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08));
      this.head.setColorAt(i, col.set(SKIN[i % SKIN.length]));
    }
    this.px = new Float32Array(COUNT); this.pz = new Float32Array(COUNT);
    this.dir = new Float32Array(COUNT);                  // facing/travel angle (axis-aligned while walking)
    this.spd = new Float32Array(COUNT);
    this.state = new Uint8Array(COUNT); this.t = new Float32Array(COUNT);
    this._turnCd = new Float32Array(COUNT);              // no double-turning at one crossing
    this._fire = new Float32Array(COUNT);                // armed-citizen trigger cycle
    this.vigilantism = 'Regulated'; this.armRate = ARM_RATE.Regulated;
    this._embolden = 0;   // crowd bravado 0..1 — one drawn weapon emboldens the next witness (a mob)
    this._panic = 0;      // seconds of terror after a civilian dies — bravado collapses, they flee
    this.reset();
    scene.add(this.mesh); scene.add(this.head);
  }

  _lane() { const k = ((Math.random() * ((this.arena * 2) / GRID - 1)) | 0) + 1; return -this.arena + k * GRID; }
  _respawn(i) {
    const alongX = Math.random() < 0.5;
    const lane = this._lane() + (Math.random() < 0.5 ? -SIDEWALK : SIDEWALK);   // ON the sidewalk, not mid-street
    const along = (Math.random() * 2 - 1) * (this.arena - 24);
    let x = alongX ? along : lane, z = alongX ? lane : along;
    if (x > this.waterX - 10) x -= 90;
    this.px[i] = x; this.pz[i] = z;
    this.dir[i] = alongX ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() < 0.5 ? 0 : Math.PI);
    this.spd[i] = 6.5 + Math.random() * 3;
    this.state[i] = WALK; this.t[i] = 2 + Math.random() * 4; this._turnCd[i] = 0;
  }
  reset() { for (let i = 0; i < COUNT; i++) this._respawn(i); this._writeAll(); }
  // a new theater: re-grid the crowd to the new arena + shoreline
  setCity(arena, waterX) { this.arena = arena; this.waterX = waterX; this.reset(); }
  // THE STANCE — 'Banned' | 'Regulated' | 'Legal', read off the country sheet when the theater is
  // raised. Drives whether witnesses film you as evidence and whether any of them are carrying.
  setVigilantism(v) { this.vigilantism = v || 'Regulated'; this.armRate = ARM_RATE[this.vigilantism] ?? 0.1; }
  _writeAll() {
    for (let i = 0; i < COUNT; i++) this._write(i);
    this.mesh.instanceMatrix.needsUpdate = true; this.head.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.head.instanceColor) this.head.instanceColor.needsUpdate = true;
  }
  _write(i) {
    if (this.state[i] === DOWN) {
      _q.setFromAxisAngle(_Z, Math.PI / 2).premultiply(_q2.setFromAxisAngle(_Y, this.dir[i]));
      _m4.compose(_p.set(this.px[i], 1.1, this.pz[i]), _q, _s.set(1, 1, 1));
    } else {
      _q.setFromAxisAngle(_Y, -this.dir[i] + Math.PI / 2);
      _m4.compose(_p.set(this.px[i], 0, this.pz[i]), _q, _s.set(1, 1, 1));
    }
    this.mesh.setMatrixAt(i, _m4); this.head.setMatrixAt(i, _m4);
  }

  // the soundscape handle, set by game so blast()/scare() can speak without a game reference
  set soundscape(v) { this._ss = v; }
  scare(x, z, r) {
    const r2 = r * r;
    for (let i = 0; i < COUNT; i++) {
      if (this.state[i] === DOWN) continue;
      const dx = this.px[i] - x, dz = this.pz[i] - z;
      if (dx * dx + dz * dz > r2) continue;
      this.state[i] = FLEE; this.t[i] = 2.2 + Math.random() * 1.6;
      this.dir[i] = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.5;
      if (this._ss && Math.random() < 0.35) this._ss.say({ x: this.px[i], z: this.pz[i] }, 'fear', { urgent: true });
    }
  }
  // THE HERO SIDE. In a country where vigilantism is LEGAL, a clean takedown — a rival dropped with
  // no civilians hurt — earns a CHEER, not a scream. Nearby people turn, raise their phones, and
  // the block goes up. This is the flip of the villain law: keep your hands clean and you're a hero.
  cheer(x, z) {
    if (this.vigilantism !== 'Legal') return;
    const r2 = 130 * 130; let cheered = 0;
    for (let i = 0; i < COUNT; i++) {
      const stt = this.state[i]; if (stt === DOWN || stt === ARMED) continue;
      const dx = this.px[i] - x, dz = this.pz[i] - z; if (dx * dx + dz * dz > r2) continue;
      this.state[i] = FILM; this.t[i] = 2.5 + Math.random() * 2; this.dir[i] = Math.atan2(-dx, -dz); cheered++;
      if (this._ss && cheered <= 4 && Math.random() < 0.7) this._ss.say({ x: this.px[i], z: this.pz[i] }, Math.random() < 0.5 ? 'awe' : 'point', { urgent: true, gain: 0.4 });
    }
    if (cheered) { this.mesh.instanceMatrix.needsUpdate = true; this.head.instanceMatrix.needsUpdate = true; }
    return cheered;
  }
  blast(x, z, r) {
    const r2 = r * r; let downed = 0;
    for (let i = 0; i < COUNT; i++) {
      if (this.state[i] === DOWN) continue;
      const dx = this.px[i] - x, dz = this.pz[i] - z;
      if (dx * dx + dz * dz > r2) continue;
      const wasArmed = this.state[i] === ARMED;
      this.state[i] = DOWN; this.t[i] = 4.5; this._write(i); downed++;
      // A PERSON GOING DOWN SCREAMS. This is the sound that should make you feel it.
      if (this._ss && downed <= 3) this._ss.say({ x: this.px[i], z: this.pz[i] }, 'scream', { urgent: true, gain: 0.5 });
      // A FRESH CORPSE BREAKS NERVE. Seeing one of their own fall — especially one who dared to
      // draw — scatters the crowd: panic spikes, the mob's bravado collapses.
      this._panic = Math.max(this._panic, wasArmed ? 4.5 : 3);
      this._embolden *= wasArmed ? 0.25 : 0.55;
    }
    if (downed) { this.mesh.instanceMatrix.needsUpdate = true; this.head.instanceMatrix.needsUpdate = true; }
    this.scare(x, z, r * 3.2);
    return downed;
  }

  update(dt, game) {
    const A = this.arena - 10;
    let moved = false;
    const P = game.player;
    // crowd mood eases back to calm — bravado bleeds off, terror fades
    if (this._embolden > 0) this._embolden = Math.max(0, this._embolden - dt * 0.12);
    if (this._panic > 0) this._panic -= dt;
    for (let i = 0; i < COUNT; i++) {
      const st = this.state[i];
      this.t[i] -= dt; this._turnCd[i] -= dt;
      if (st === DOWN) { if (this.t[i] <= 0) { this._respawn(i); moved = true; } continue; }
      if (st === FILM) {
        if (P && Math.random() < dt * 2.2) {
          game.particles.spawn({ x: this.px[i], y: 7.4, z: this.pz[i], vx: 0, vy: 1, vz: 0, life: 0.12, size: 3.6, color: ['#ffffff', '#cfe8ff'], drag: 0, shrink: true });
          // EVERY PHONE IS EVIDENCE. Where vigilantism is banned, being filmed while you are
          // already flagged pushes the police response — the crowd is what calls them.
          if (this.vigilantism === 'Banned' && game.police && game.police.witnessed) game.police.witnessed(this.px[i], this.pz[i]);
        }
        if (this.t[i] <= 0) { this.state[i] = WALK; this.t[i] = 3 + Math.random() * 4; }
        continue;
      }
      // AN ARMED CITIZEN. Not a real threat to a superweapon — a pistol round meets the ballistic
      // scale like any other — but it is the street answering back, and it makes noise the police
      // can hear. They hold position, face you, and fire on a slow cycle until they lose nerve.
      if (st === ARMED) {
        if (P && P.alive) {
          const dx = P.pos.x - this.px[i], dz = P.pos.z - this.pz[i];
          this.dir[i] = Math.atan2(dx, dz);
          this._fire[i] -= dt;
          if (this._fire[i] <= 0 && dx * dx + dz * dz < 9000) {
            this._fire[i] = 0.9 + Math.random() * 0.8;
            if (game.civilianShot) game.civilianShot(this.px[i], this.pz[i], P);
          }
        }
        if (this.t[i] <= 0) { this.state[i] = FLEE; this.t[i] = 1.8; }   // nerve runs out
        continue;
      }
      const speed = st === FLEE ? this.spd[i] * 2.7 : this.spd[i];
      this.px[i] += Math.sin(this.dir[i]) * speed * dt;
      this.pz[i] += Math.cos(this.dir[i]) * speed * dt;
      moved = true;
      // bounds + harbor: turn around, stay on land
      if (Math.abs(this.px[i]) > A || Math.abs(this.pz[i]) > A || this.px[i] > this.waterX - 8) {
        this.px[i] = Math.max(-A, Math.min(Math.min(A, this.waterX - 8), this.px[i]));
        this.pz[i] = Math.max(-A, Math.min(A, this.pz[i]));
        this.dir[i] += Math.PI;
      }
      if (st === FLEE) { if (this.t[i] <= 0) { this._respawn(i); } this._write(i); continue; }   // fled far enough — rejoin the flow elsewhere
      // WALK: straight down the sidewalk; turn ONLY at intersections, sometimes
      const walkingX = Math.abs(Math.sin(this.dir[i])) > 0.5;
      const alongPos = walkingX ? this.px[i] : this.pz[i];
      const nearLine = Math.round((alongPos + this.arena) / GRID) * GRID - this.arena;
      if (this._turnCd[i] <= 0 && Math.abs(alongPos - nearLine) < 2.2 && Math.abs(nearLine) < this.arena - 4 && Math.random() < 0.3) {
        const side = Math.random() < 0.5 ? -SIDEWALK : SIDEWALK;
        if (walkingX) { this.px[i] = nearLine + side; this.dir[i] = Math.random() < 0.5 ? 0 : Math.PI; }
        else { this.pz[i] = nearLine + side; this.dir[i] = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2; }
        this._turnCd[i] = 4;
      }
      if (P) {
        const dx = P.pos.x - this.px[i], dz = P.pos.z - this.pz[i], d2 = dx * dx + dz * dz;
        if (d2 < 120) {
          this.state[i] = FLEE; this.t[i] = 1.6; this.dir[i] = Math.atan2(-dx, -dz);
          // they SAY something when they bolt — the closer you are, the more panicked
          if (game.soundscape) game.soundscape.say({ x: this.px[i], z: this.pz[i] }, d2 < 60 ? 'panic' : 'fear', { urgent: true });
        }
        else if (d2 < 1100 && this.t[i] <= 0) {
          // Seeing you HURT someone is different from seeing you exist. What a witness DOES about it
          // is the country's stance made personal:
          const witnessed = game.police && game.police.heatOf && game.police.heatOf(P) > 8;
          // DRAW CHANCE by stance. Banned: from across the street. Regulated: only if the violence
          // is CLOSE (they feel personally in it). Legal: never — you're supposed to be here.
          // Contagion: a mob emboldens itself (_embolden); a fresh corpse terrifies it (_panic).
          let drawChance = 0;
          if (witnessed) {
            if (this.vigilantism === 'Banned') drawChance = this.armRate;
            else if (this.vigilantism === 'Regulated' && d2 < 320) drawChance = this.armRate;   // ~18u — up close
          }
          drawChance *= (1 + this._embolden);
          if (this._panic > 0) drawChance *= 0.35;
          if (drawChance > 0 && Math.random() < drawChance) {
            this.state[i] = ARMED; this.t[i] = 6 + Math.random() * 6; this._fire[i] = 0.4;
            this._embolden = Math.min(1, this._embolden + 0.28);   // one drawn weapon rallies the block
            if (game.soundscape) game.soundscape.say({ x: this.px[i], z: this.pz[i] }, Math.random() < 0.5 ? 'anger' : 'challenge');
          } else {
            this.state[i] = FILM; this.t[i] = 2 + Math.random() * 2.5;
            if (game.soundscape && Math.random() < 0.5) game.soundscape.say({ x: this.px[i], z: this.pz[i] }, Math.random() < 0.5 ? 'awe' : 'point');
          }
          this.dir[i] = Math.atan2(dx, dz);
        }
        else if (this.t[i] <= 0) this.t[i] = 3 + Math.random() * 4;
      } else if (this.t[i] <= 0) this.t[i] = 3 + Math.random() * 4;
      this._write(i);
    }
    if (moved) { this.mesh.instanceMatrix.needsUpdate = true; this.head.instanceMatrix.needsUpdate = true; }
  }
}
