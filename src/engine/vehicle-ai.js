// VEHICLE AI OPERATOR — an AI crew that operates a fleet vehicle through the
// SAME legal paths the player uses: it claims the driver seat through the
// VehicleSession (source 'ai'), emits a VehicleIntent into the SAME driveActor
// adapter (so its physics, collision and envelope limits are identical), aims
// through turretSlewIntent, and fires through fireVehicleWeapon (same ammo,
// same reload, same projectiles, same attribution). It NEVER translates the
// mesh, never writes positions, never subtracts HP — faking any of that is the
// exact anti-pattern this workstream forbids.
//
// Perception is honest: it engages only targets it can SEE (game.canSee from
// the crew's seat), pays a real acquisition delay before the first shell, and
// loses the target when sight breaks.
import { driveActor } from './vehicle-pilot.js';
import { fleetIntent } from './fleet-pilot.js';
import { sessionOf, SEAT_DRIVER } from './vehicle-session.js';
import { turretSlewIntent, turretDirWorld, wrapAngle, attachMount, fireVehicleWeapon } from './vehicle-weapons.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class VehicleOperator {
  constructor(game, actor, { team = 1, acquireS = 1.2, preferRange = [70, 170] } = {}) {
    this.game = game; this.actor = actor; this.preferRange = preferRange; this.acquireS = acquireS;
    this.acquired = 0; this.target = null; this.retired = false;
    // the AI crew is the attribution source and the seat holder — a duck-typed
    // occupant, never a fake Fighter in game.entities
    this.crew = {
      name: `${(actor.name || actor.id).toUpperCase()} CREW`, team, alive: true, powerBuff: 1,
      _vehicleCrew: true, slots: {},
      pos: { x: actor.pos.x, y: actor.pos.y, z: actor.pos.z, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
      vel: { set() {} },
    };
    actor.team = team;
    const claim = sessionOf(game, actor).claim(SEAT_DRIVER, this.crew, { source: 'ai' });
    if (claim) { this.retired = true; return; }
    attachMount(actor);
  }

  _pickTarget() {
    const g = this.game; let best = null, bd = Infinity;
    for (const e of g.entities || []) {
      if (!e?.alive || e._vehicleCrew) continue;
      if (!g.isFoe(this.crew, e)) continue;
      if (!g.canSee(this.crew, e)) continue;                     // honesty: only what the crew can SEE
      const d = Math.hypot(e.pos.x - this.actor.pos.x, e.pos.z - this.actor.pos.z);
      if (d < bd) { best = e; bd = d; }
    }
    // hostile vehicle hulls are targets too (through their crews)
    for (const a of g._fleetActors || []) {
      const crew = a.occupant;
      if (a === this.actor || a.destroyed || !crew?.alive) continue;
      if (crew.team === this.crew.team) continue;
      if (!g.canSee(this.crew, { pos: a.pos, _fleetVehicle: a })) continue;
      const d = Math.hypot(a.pos.x - this.actor.pos.x, a.pos.z - this.actor.pos.z);
      if (d < bd) { best = crew; bd = d; }
    }
    return best;
  }

  update(dt) {
    const a = this.actor, g = this.game;
    if (this.retired || !(dt > 0)) return;
    if (a.destroyed || !this.crew.alive) { this.release(); return; }
    a.session?.tick();                                           // crew rides the hull
    // perceive / lose / reacquire
    const t = this.target;
    if (!t || !t.alive || !g.canSee(this.crew, t)) { this.target = this._pickTarget(); if (this.target !== t) this.acquired = 0; }
    const tgt = this.target;

    // ---- decide the VehicleIntent (drive) ----
    const m = a.motion, e = a.env;
    let throttle = 0, steer = 0;
    if (tgt) {
      const dx = tgt.pos.x - a.pos.x, dz = tgt.pos.z - a.pos.z, dist = Math.hypot(dx, dz);
      const wantYaw = Math.atan2(dx, dz), yawErr = wrapAngle(wantYaw - (m.yaw || 0));
      if (a.disabled) { throttle = -0.7; steer = clamp(-yawErr * 1.5, -1, 1); }      // mauled: back away
      else if (dist > this.preferRange[1]) { throttle = 1; steer = clamp(yawErr * 1.6, -1, 1); }
      else if (dist < this.preferRange[0]) { throttle = -0.6; steer = clamp(yawErr * 1.2, -1, 1); }
      else { throttle = 0; steer = clamp(yawErr * 0.8, -1, 1); }                     // hold the band, face them
    } else {
      throttle = 0.25; steer = Math.sin((this._wanderT = (this._wanderT || 0) + dt) * 0.4) * 0.4;   // patrol
    }
    const intent = fleetIntent(a.cls, { fwd: throttle, turn: steer, brake: 0, aimX: 0, aimY: 0 });

    // ---- aim the mount at the target through the same slew solver ----
    if (tgt) {
      const dx = tgt.pos.x - a.pos.x, dz = tgt.pos.z - a.pos.z;
      const muzzleY = a.pos.y + (a.muzzle?.up ?? (a.bodyHeight || 10) * .75);
      const dy = (tgt.pos.y + 4) - muzzleY, flat = Math.hypot(dx, dz);
      this.aim = { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.max(flat, 1)) };
      Object.assign(intent, turretSlewIntent(a.cls, m, e, this.aim, dt));
    }
    driveActor(a, intent, dt, g.world);                          // the SAME adapter the player drives through

    // ---- operate the mounted weapon: acquire → align → fire → reassess ----
    const w = a.weapon;
    if (w) {
      w.update(dt);
      if (tgt) {
        const dx = tgt.pos.x - a.pos.x, dz = tgt.pos.z - a.pos.z, dist = Math.hypot(dx, dz);
        const d = turretDirWorld(a), flat = Math.hypot(dx, dz) || 1;
        const aligned = (d.x * dx / flat + d.z * dz / flat) > 0.995;
        const inRange = dist > 18 && dist < this.preferRange[1] * 1.6;
        if (aligned && inRange) {
          this.acquired += dt;
          if (this.acquired >= this.acquireS && w.canFire) fireVehicleWeapon(g, a, this.crew);
        } else this.acquired = Math.max(0, this.acquired - dt * 2);
      } else this.acquired = 0;
    }
  }

  release() {
    if (this.retired) return;
    this.retired = true; this.crew.alive = false;
    this.actor.session?.release(SEAT_DRIVER, {});
    if (this.actor.operator === this) this.actor.operator = null;
  }
}

// Spawn + crew a hostile (or allied) AI vehicle in one call. Console:
// `LSW.game.spawnAIVehicle('tank', {x: 120, z: 40})`.
export async function spawnAIVehicle(game, id, pos, { team = 1 } = {}) {
  const a = await game.spawnFleetVehicle?.(id, pos || {});
  if (!a) return null;
  a.team = team;
  const op = new VehicleOperator(game, a, { team });
  if (op.retired) return a;
  a.operator = op;
  game.hud?.feed?.(`${(a.name || a.id).toUpperCase()} — AI CREW ABOARD`, '#ff8b63');
  return a;
}
