// THE MISSILE FAMILY — one configurable missile architecture, never a unique
// script per missile. A Missile is a REAL simulated body: launch impulse →
// ignition delay (ballistic) → boost → cruise, with a capped turn authority,
// an honest seeker (acquisition cone, lock persistence, reacquisition), a
// proximity/contact fuse, and a warhead that detonates through the game's OWN
// areaDamage (fighters, vehicle hulls via construct splash, terrain craters —
// never a scripted HP subtraction). A missile that loses the geometry MISSES:
// it flies past, tries to reacquire, and expires.
//
// Profiles are data. Derive a new missile by adding a row, not a class.
import * as THREE from 'three';

export const MISSILE_PROFILES = {
  // the proven first profile: surface-to-air interceptor
  'aa-standard': {
    launchSpeed: 26,        // leaves the rail with this impulse (u/s)
    ignitionDelay: 0.22,    // ballistic (gravity, no thrust, no steering) until the motor lights
    accel: 210,             // u/s² while boosting
    cruise: 190,            // u/s max
    turnRate: 2.4,          // rad/s max authority — the whole miss/hit geometry lives here
    seeker: { coneCos: 0.35, range: 900, lockPersist: 1.1, reacquire: 0.9 },
    fuse: { proximity: 9, contact: 1.6 },
    warhead: { damage: 52, blast: 11, power: 1.6, dtype: 'physical' },
    lifetime: 9,
    gravity: 58,
    trail: { color: ['#ffe3b0', '#c8c3ba'], rate: 90 },
  },
  // a slower, tighter-turning short-range variant (tower hardpoints)
  'aa-sprint': {
    launchSpeed: 40, ignitionDelay: 0.1, accel: 260, cruise: 150, turnRate: 3.6,
    seeker: { coneCos: 0.2, range: 480, lockPersist: 0.8, reacquire: 0.6 },
    fuse: { proximity: 7, contact: 1.4 },
    warhead: { damage: 34, blast: 8, power: 1.2, dtype: 'physical' },
    lifetime: 6, gravity: 58, trail: { color: ['#ffd28a', '#b9b3aa'], rate: 70 },
  },
};

const _v = new THREE.Vector3();

// target adapter: a Missile chases anything exposing {x,y,z} through this
export function targetPoint(t, out) {
  if (!t) return null;
  const p = t.pos || t;
  if (!Number.isFinite(p.x)) return null;
  out.set(p.x, (p.y ?? 0) + (t.aimHeight ?? 4), p.z);
  return out;
}
export function targetAlive(t) {
  if (!t) return false;
  if (t.alive === false || t.destroyed) return false;
  return true;
}

export class Missile {
  constructor(game, profileId, { pos, dir, target = null, source = null, launchVel = null }) {
    const p = this.profile = MISSILE_PROFILES[profileId];
    if (!p) throw Error(`No missile profile "${profileId}"`);
    this.game = game; this.id = profileId;
    this.source = source;                                // attribution: who fired
    this.target = target;
    this.pos = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.vel = new THREE.Vector3(dir.x, dir.y, dir.z).normalize().multiplyScalar(p.launchSpeed);
    if (launchVel) this.vel.add(launchVel);              // rail inherits the launcher's motion
    this.age = 0; this.dead = false; this.result = null; // 'hit' | 'ground' | 'expired'
    this.lockT = 0;                                      // time since the seeker last SAW the target
    this.locked = !!target;
    this._tp = new THREE.Vector3();
    this._trailT = 0;
    game.hud?.feed?.call && null;
  }

  // seeker geometry: is the target inside the acquisition cone and range?
  _seekerSees() {
    const p = this.profile, t = targetPoint(this.target, this._tp);
    if (!t || !targetAlive(this.target)) return false;
    const to = _v.copy(t).sub(this.pos); const d = to.length();
    if (d > p.seeker.range) return false;
    const speed = this.vel.length();
    if (speed > 1 && to.normalize().dot(_v2.copy(this.vel).divideScalar(speed)) < p.seeker.coneCos) return false;
    if (this.losBlocked?.(this.pos, t)) return false;    // optional owner-provided LOS honesty
    return true;
  }

  update(dt) {
    if (this.dead || !(dt > 0)) return;
    const p = this.profile, g = this.game;
    this.age += dt;
    const burning = this.age >= p.ignitionDelay;

    // ---- guidance: turn the VELOCITY toward the target, capped by authority ----
    if (burning && this.target) {
      const sees = this._seekerSees();
      if (sees) this.lockT = 0; else this.lockT += dt;
      if (this.lockT > p.seeker.lockPersist + p.seeker.reacquire || !targetAlive(this.target)) {
        this.locked = false; this.target = null;         // lock lost for good — it just flies
      } else if (this.lockT <= p.seeker.lockPersist) {
        // steer only while the lock is warm (inside persistence)
        const t = targetPoint(this.target, this._tp);
        if (t) {
          const want = _v.copy(t).sub(this.pos).normalize();
          const speed = this.vel.length() || 1, cur = _v2.copy(this.vel).divideScalar(speed);
          const angle = Math.acos(Math.min(1, Math.max(-1, cur.dot(want))));
          const step = Math.min(angle, p.turnRate * dt);
          if (angle > 1e-4) {
            const axis = _v3.crossVectors(cur, want).normalize();
            if (Number.isFinite(axis.x)) cur.applyAxisAngle(axis, step);
            this.vel.copy(cur.multiplyScalar(speed));
          }
        }
      }
    }

    // ---- propulsion ----
    if (burning) {
      const speed = this.vel.length();
      if (speed < p.cruise) {
        const boost = Math.min(p.cruise, speed + p.accel * dt);
        this.vel.setLength(boost || p.launchSpeed);
      }
    } else {
      this.vel.y -= p.gravity * dt;                      // unlit: it drops off the rail
    }

    // ---- fly, and resolve against real geometry ----
    const prev = _v3b.copy(this.pos);
    this.pos.addScaledVector(this.vel, dt);
    // proximity fuse against the target (checked at the swept midpoint too)
    const t = targetPoint(this.target, this._tp);
    if (t && targetAlive(this.target)) {
      const dNow = this.pos.distanceTo(t), dMid = _v.copy(prev).lerp(this.pos, .5).distanceTo(t);
      if (Math.min(dNow, dMid) <= p.fuse.proximity) return this.detonate('hit');
    }
    // terrain
    const groundY = g.world?.heightAt ? (g.world.heightAt(this.pos.x, this.pos.z) ?? 0) : 0;
    if (this.pos.y <= groundY + (p.fuse.contact || 1)) return this.detonate('ground');
    // cover (a missile that misses hits the world, not nothing)
    for (const c of g.world?.cover || []) {
      if (c === this.launchCover || c.hp <= 0) continue;
      if (this.pos.y > (c.top ?? c.h ?? Infinity) + 1 || this.pos.y < (c.bottom ?? 0) - 1) continue;
      const dx = Math.max(0, Math.abs(this.pos.x - c.x) - (c.hx ?? c.r ?? 0));
      const dz = Math.max(0, Math.abs(this.pos.z - c.z) - (c.hz ?? c.r ?? 0));
      if (dx * dx + dz * dz < (p.fuse.contact || 1.6) ** 2) return this.detonate('ground');
    }
    if (this.age >= p.lifetime) return this.expire();

    // ---- plume/trail (presentation only) ----
    if (burning && g.particles?.spawn) {
      this._trailT += dt * (p.trail?.rate || 60);
      while (this._trailT >= 1) {
        this._trailT -= 1;
        g.particles.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3, vz: (Math.random() - .5) * 3, life: .5 + Math.random() * .4, size: 1.1, color: p.trail?.color || ['#fff'], drag: 2, shrink: true });
      }
    }
    if (this.mesh) { this.mesh.position.copy(this.pos); this.mesh.quaternion.setFromUnitVectors(_axisZ, _v.copy(this.vel).normalize()); }
  }

  detonate(result) {
    if (this.dead) return;
    this.dead = true; this.result = result;
    const w = this.profile.warhead, g = this.game;
    g.areaDamage?.(this.source || { name: 'MISSILE', team: 1, powerBuff: 1 }, this.pos.clone(), w.blast, w.damage, w.power, { dtype: w.dtype });
    g.audio?.soundLibrary?.play?.('vehicle-explosion', { pos: this.pos });
    g.noise?.(this.pos, 1.6, this.source);
    this._disposeMesh();
  }

  expire() {
    if (this.dead) return;
    this.dead = true; this.result = 'expired';
    this._disposeMesh();
  }

  _disposeMesh() { if (this.mesh) { this.mesh.removeFromParent?.(); this.mesh.traverse?.(o => o.geometry?.dispose?.()); this.mesh = null; } }
}

const _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v3b = new THREE.Vector3(), _axisZ = new THREE.Vector3(0, 0, 1);

// small visible body + fins; the plume is the particles above
export function buildMissileMesh(m) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#cfcabf', roughness: .55, metalness: .35 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.28, .34, 4.2, 8), mat);
  body.rotation.x = Math.PI / 2; g.add(body);
  const noseMat = new THREE.MeshStandardMaterial({ color: '#8f2f26', roughness: .5 });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.28, .9, 8), noseMat);
  nose.rotation.x = Math.PI / 2; nose.position.z = 2.5; g.add(nose);
  m.mesh = g; g.position.copy(m.pos);
  return g;
}
