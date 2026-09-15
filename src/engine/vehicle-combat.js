// VEHICLE HULL — every fleet vehicle is a native finite-volume damage receiver:
// a MOVING cover record with onConstructHit/onShatter hooks, the same recipe
// AircraftCombat proved (never an invisible Fighter, never a bespoke damage
// path). The shared construct-hit admission then handles bullets, reached beam
// tips and splash once, shared-impact's vehicleContactSpeed sees the hull
// (frontlineVehicle), and rams/explosions all route through the game's own
// systems.
//
// ⚠ The cover record MUST carry x/z/hx/hz/r/top/bottom/h every frame — a
// record missing r and h is TRANSPARENT to gunfire while still stopping bodies
// (the PowerWorld spires bug). syncBounds is analytic off pos/bodyRadius/
// bodyHeight so it works headless and before the first render.
import * as THREE from 'three';
import { hullFor } from '../data/vehicle-mounts.js';

export class VehicleHull {
  constructor(game, actor, spec = hullFor(actor)) {
    this.game = game; this.actor = actor; this.dead = false; this.disposed = false;
    this.disabledAt = spec.disabledAt ?? .25;
    const c = this.cover = {
      mesh: actor.wrapper, hp: spec.hp, maxHp: spec.hp,
      fleetVehicle: true, frontlineVehicle: true, projectileShape: 'box', noCam: true,
      construct: this, blastBounds: new THREE.Box3(),
    };
    c.onConstructHit = (amount, o = {}) => this.hit(amount, o.src);
    c.onShatter = (_g, _c, src) => this.destroy(src);
    actor.cover = c; actor.hull = this;
    game.world?.cover?.push(c); game.world?.coverAll?.push(c);
    this.syncBounds(); game.world?.refreshFogBoxes?.();
  }

  team() { return this.actor.occupant?.team ?? this.actor.team ?? 1; }

  syncBounds() {
    const a = this.actor, c = this.cover, r = a.bodyRadius || 6, h = a.bodyHeight || r * 1.4;
    c.x = a.pos.x; c.z = a.pos.z; c.hx = r; c.hz = r; c.r = r;
    c.bottom = a.pos.y; c.y0 = a.pos.y; c.top = c.h = a.pos.y + h;
    c.blastBounds.min.set(a.pos.x - r, a.pos.y, a.pos.z - r);
    c.blastBounds.max.set(a.pos.x + r, a.pos.y + h, a.pos.z + r);
    // the hull rides the vehicle's velocity so ram/impact admission reads it
    const m = a.motion || {};
    (c._impactBody ||= {}).vx = m.vx || 0; c._impactBody.vy = m.vy || 0; c._impactBody.vz = m.vz || 0;
  }

  hit(amount, src) {
    if (this.dead || this.disposed || !Number.isFinite(amount) || amount <= 0) return 0;
    if (src?.team === this.team()) return 0;                     // no friendly hull fire
    const damage = Math.min(this.cover.hp, amount);
    this.cover.hp -= damage;
    this.actor.disabled = this.cover.hp > 0 && this.cover.hp < this.cover.maxHp * this.disabledAt;
    const p = this.actor.pos;
    this.game.particles?.burst?.(p.x, p.y + (this.actor.bodyHeight || 8) * .5, p.z, { count: 5, speed: 9, life: .3, size: 1.4, color: ['#ffd28a', '#5a5148'], up: 3, grav: 8 });
    if (this.actor.occupant === this.game.player) this.game.hud?.feed?.(`HULL ${Math.round(100 * this.cover.hp / this.cover.maxHp)}%${this.actor.disabled ? ' — DRIVETRAIN DAMAGED' : ''}`, '#ff8b63');
    if (this.cover.hp <= 0) this.destroy(src);
    return damage;
  }

  destroy(src) {
    if (this.dead || this.disposed) return;
    this.dead = true; this.cover.hp = 0;
    const a = this.actor, g = this.game, p = a.pos;
    // occupants take the loss of their vehicle as REAL damage through the choke
    // point, credited to whoever killed the hull — then the session frees them.
    for (const f of a.session?.occupants?.() || (a.occupant ? [a.occupant] : [])) {
      f.takeDamage?.(46, { src, dtype: 'physical', kb: 18, launch: 16, contactPoint: p });
    }
    a.destroyed = true; a.disabled = true; a.ready = false;
    this.retire();
    if (a.wrapper) a.wrapper.visible = false;   // wreck presentation is a recorded gap
    g.vfx?.flash?.(new THREE.Vector3(p.x, p.y + 4, p.z), '#ffb85c', 24, .6);
    g.particles?.burst?.(p.x, p.y + 2, p.z, { count: 40, speed: 26, life: 1.3, size: 5, color: ['#ffbc68', '#39352e'], up: 9, grav: 12 });
    g.audio?.soundLibrary?.play?.('vehicle-explosion', { pos: p });
    g.noise?.(p, 2.0, src);
    g.news?.highlight?.('car', `${(a.name || a.id).toUpperCase()} DESTROYED`, { dur: 2.2, priority: 2, focus: p });
  }

  update() { if (!this.dead && !this.disposed) this.syncBounds(); }

  retire() {
    const w = this.game.world;
    for (const arr of [w?.cover, w?.coverAll]) { const i = arr ? arr.indexOf(this.cover) : -1; if (i >= 0) arr.splice(i, 1); }
    w?.refreshFogBoxes?.();
  }

  dispose() { if (this.disposed) return; this.disposed = true; this.retire(); }
}

export function attachVehicleHull(game, actor) {
  if (actor.hull) return actor.hull;
  return new VehicleHull(game, actor);
}
