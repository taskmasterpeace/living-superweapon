// VEHICLE WEAPONS — the weapon-truth layer for fleet vehicles. Part one (aim):
// the turret/torso SLEW solver and the muzzle. The reticle, the AI gunner and
// the projectile spawn must all read the SAME numbers from here, so the
// crosshair is incapable of lying about where the shell will actually leave.
//
// Conventions match vehicle-motion.js: heading forward = (sin yaw, cos yaw);
// turretYaw/torsoYaw are HULL-RELATIVE; pitch > 0 raises the gun. The player's
// (and AI's) aim is a WORLD yaw/pitch — world-stable, so a turning hull does
// not drag the gun off target; the solver converts to hull-relative and emits
// the slew intents the steppers already accept (rate- and limit-honest: the
// intent is clamped to ±1, so the envelope's turretRate is the real cap).

import * as THREE from 'three';
import { VEHICLE_MOUNTS } from '../data/vehicle-mounts.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const wrapAngle = a => { a = a % (Math.PI * 2); return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };

// desired WORLD aim {yaw, pitch} -> per-class slew intents for stepVehicle.
export function turretSlewIntent(cls, m, e, aim, dt) {
  if (!m || !e || !aim || !(dt > 0)) return {};
  const hullYaw = m.yaw || 0;
  if (cls === 'tracked') {
    const yawErr = wrapAngle(aim.yaw - hullYaw - (m.turretYaw || 0));
    const wantPitch = clamp(aim.pitch || 0, e.turretPitchMin ?? -0.2, e.turretPitchMax ?? 0.5);
    const pitchErr = wantPitch - (m.turretPitch || 0);
    return {
      turretX: clamp(yawErr / (Math.max(e.turretRate || 1, 1e-6) * dt), -1, 1),
      turretY: clamp(pitchErr / (Math.max(e.turretPitchRate || 1, 1e-6) * dt), -1, 1),
    };
  }
  if (cls === 'mech') {
    const want = clamp(wrapAngle(aim.yaw - hullYaw), -(e.torsoMax ?? 1.2), e.torsoMax ?? 1.2);
    const err = want - (m.torsoYaw || 0);
    return { torsoX: clamp(err / (Math.max(e.torsoRate || 1, 1e-6) * dt), -1, 1) };
  }
  return {};
}

// Where the mounted gun ACTUALLY points, in world — hull yaw + turret/torso yaw
// + gun pitch. This is the truth the reticle and the shell both use.
export function turretDirWorld(actor) {
  const m = actor?.motion || {};
  const yaw = (m.yaw || 0) + (m.turretYaw ?? m.torsoYaw ?? 0);
  const pitch = m.turretPitch || 0, cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp };
}

// The muzzle: the point the shell leaves. actor.muzzle {up, fwd} is measured
// from the real model at spawn where THREE is available (turret height + barrel
// length); the fallback derives from the collision body and always starts the
// round OUTSIDE the hull circle so a shell can never spawn inside its own cover
// record (the aircraft-combat lesson).
export function muzzleWorld(actor) {
  const d = turretDirWorld(actor);
  const up = actor?.muzzle?.up ?? (actor?.bodyHeight || 10) * 0.75;
  const fwd = actor?.muzzle?.fwd ?? (actor?.bodyRadius || 6) * 1.25;
  return {
    pos: { x: actor.pos.x + d.x * fwd, y: actor.pos.y + up + d.y * fwd, z: actor.pos.z + d.z * fwd },
    dir: d,
  };
}

// ---- PART TWO: the mounted weapon state machine + the one fire path --------

// Ammunition, cycle and reload as a pure state machine. Auto-reloads when the
// magazine empties and reserve remains; a dry weapon says so and refuses.
export class MountedWeapon {
  constructor(spec) {
    this.spec = spec;
    this.mag = spec.magazine; this.reserve = spec.reserve;
    this.cycleT = 0; this.reloadT = 0;
  }
  get reloading() { return this.reloadT > 0; }
  get dry() { return this.mag <= 0 && this.reserve <= 0 && this.reloadT <= 0; }
  get canFire() { return this.mag > 0 && this.cycleT <= 0 && this.reloadT <= 0; }
  update(dt) {
    if (!(dt > 0)) return;
    this.cycleT = Math.max(0, this.cycleT - dt);
    if (this.reloadT > 0) {
      this.reloadT = Math.max(0, this.reloadT - dt);
      if (this.reloadT === 0 && this.reserve > 0) {
        const take = Math.min(this.spec.magazine, this.reserve);
        this.mag = take; this.reserve -= take;
      }
    }
  }
  // returns true when a round actually leaves — the ONLY place ammo is spent
  fire() {
    if (!this.canFire) return false;
    this.mag--; this.cycleT = this.spec.cycleS || 0;
    if (this.mag <= 0 && this.reserve > 0) this.reloadT = this.spec.reloadS || 0;
    return true;
  }
  reloadNow() {
    if (this.reloadT > 0 || this.reserve <= 0 || this.mag >= this.spec.magazine) return false;
    this.reserve += this.mag; this.mag = 0;              // partial mag goes back to reserve
    this.reloadT = this.spec.reloadS || 0;
    return true;
  }
  ammoLine() {
    if (this.dry) return `${this.spec.label || 'GUN'} DRY`;
    if (this.reloading) return `${this.spec.label || 'GUN'} RELOADING ${this.reloadT.toFixed(1)}s`;
    return `${this.spec.label || 'GUN'} ${this.mag}/${this.reserve}`;
  }
}

export function attachMount(actor) {
  if (actor.weapon !== undefined) return actor.weapon;
  const spec = VEHICLE_MOUNTS[actor.id] || null;
  actor.weapon = spec ? new MountedWeapon(spec) : null;
  return actor.weapon;
}

// THE ONE FIRE PATH — player and AI both leave the muzzle through here, into
// the game's own projectile system: muzzle truth, hull-velocity inheritance,
// launchCover so a shell can never hit its own hull, real recoil (barrel slide
// + hull nudge against the shot line), the audible report broadcast through
// game.noise (a suppressed-weapons lesson: every shot is HEARD).
export function fireVehicleWeapon(game, actor, caster) {
  const w = actor.weapon;
  if (!w || !caster || !w.fire()) return false;
  const s = w.spec, { pos, dir } = muzzleWorld(actor);
  const vel = new THREE.Vector3(dir.x, dir.y, dir.z).multiplyScalar(s.speed);
  const m = actor.motion || {};
  vel.add(new THREE.Vector3(m.vx || 0, m.vy || 0, m.vz || 0));
  game.projectiles?.spawnProjectile(caster, {
    pos: new THREE.Vector3(pos.x, pos.y, pos.z), vel,
    damage: s.damage, radius: s.radius, blast: s.blast, power: s.power,
    life: s.life, grav: 0, kb: s.kb ?? 0, dtype: s.dtype || 'physical',
    color: s.color || '#f8cf85', launchCover: actor.cover,
    ...(s.bullet ? { bullet: true, ballistic: true, weapon: 'rifle' } : {}),
  });
  actor.recoilT = Math.max(actor.recoilT || 0, s.recoil || 0);
  if (s.recoilKick && 'speed' in m) {
    const hullDot = Math.sin(m.yaw || 0) * dir.x + Math.cos(m.yaw || 0) * dir.z;
    m.speed -= s.recoilKick * hullDot;                   // the hull rocks against the shot
  }
  game.audio?.soundLibrary?.play?.(s.sound || 'scout-gunshot', { pos });
  game.particles?.burst?.(pos.x, pos.y, pos.z, { count: 6, speed: 8, life: .12, size: 1.6, color: ['#ffe3a1', '#ffac52'], up: 0, grav: 0 });
  game.noise?.(pos, 1.4, caster);
  return true;
}

// Measure {up, fwd} from a bound rig (call once at spawn, THREE passed in).
// Uses the barrel node's world transform against the actor origin so the
// muzzle rides the authored mount, not a guess.
export function measureMuzzle(actor, THREE) {
  const barrel = actor?.parts?.barrel, wrapper = actor?.wrapper;
  if (!barrel?.getWorldPosition || !wrapper || !THREE) return null;
  wrapper.updateMatrixWorld?.(true);
  const bp = barrel.getWorldPosition(new THREE.Vector3());
  const box = new THREE.Box3().setFromObject(barrel);
  const len = Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, (actor.bodyRadius || 6) * 0.4);
  const up = Math.max(1, bp.y - wrapper.position.y);
  const fwd = Math.max((actor.bodyRadius || 6) * 1.1, Math.hypot(bp.x - wrapper.position.x, bp.z - wrapper.position.z) + len);
  actor.muzzle = { up, fwd };
  return actor.muzzle;
}
