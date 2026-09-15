// AUTOMATED ANTI-AIR — a genuine emplacement, never an invisible damage
// volume. It (1) senses an eligible aerial target legitimately (altitude,
// range, faction via game.isFoe, LOS via game.canSee), (2) tracks within its
// traverse limits at a finite rate, (3) establishes fire eligibility
// (alignment + a real acquisition delay), (4) launches an ACTUAL Missile from
// the family architecture, (5) consumes ammunition and reloads, (6) loses and
// reacquires targets, and (7) receives damage through a real hull cover
// record (VehicleHull on a static pseudo-actor) — disabled slows its
// traverse, destroyed silences it.
//
// Configs are data: a fixed ground emplacement and a tower/hardpoint variant
// share the one implementation.
import * as THREE from 'three';
import { Missile, buildMissileMesh } from './missile-profiles.js';
import { VehicleHull } from './vehicle-combat.js';

export const AA_CONFIGS = {
  fixed: { profile: 'aa-standard', range: 620, minY: 22, traverse: 1.6, elevate: 1.2, acquireS: 1.4, salvo: 1, reloadS: 4.5, ammo: 12, hull: { hp: 220, disabledAt: .3 }, muzzleUp: 6 },
  tower: { profile: 'aa-sprint', range: 420, minY: 14, traverse: 2.4, elevate: 1.8, acquireS: 1.0, salvo: 2, reloadS: 3.2, ammo: 10, hull: { hp: 140, disabledAt: .3 }, muzzleUp: 3 },
};

const approach = (a, b, s) => a + THREE.MathUtils.clamp(Math.atan2(Math.sin(b - a), Math.cos(b - a)), -s, s);
const _v = new THREE.Vector3();

export class AAEmplacement {
  constructor(game, { config = 'fixed', pos, team = 1, turret = null, name = 'AA EMPLACEMENT' } = {}) {
    this.game = game; this.cfg = AA_CONFIGS[config] || AA_CONFIGS.fixed; this.kind = config;
    this.team = team; this.name = name;
    this.pos = new THREE.Vector3(pos.x, pos.y ?? (game.world?.heightAt?.(pos.x, pos.z) || 0), pos.z);
    this.turret = turret;                                  // optional scene node to swivel (the sim's SAM tubes)
    this.yaw = turret?.rotation?.y || 0; this.pitch = 0;
    this.ammo = this.cfg.ammo; this.reloadT = 0; this.acquired = 0;
    this.target = null; this.missiles = [];
    this.source = { name, team, pos: this.pos, powerBuff: 1, alive: true, _emplacement: true };
    // the damage receiver: a static pseudo-actor through the SAME hull recipe
    this.actor = { id: `aa-${config}`, name, cls: 'static', pos: this.pos, bodyRadius: 7, bodyHeight: 10, team, occupant: null, env: {} };
    this.hull = new VehicleHull(game, this.actor, this.cfg.hull);
    this.dead = false;
  }

  get destroyed() { return this.hull.dead; }

  // an ELIGIBLE aerial target: hostile, airborne above minY, in range, visible
  _eligible(t) {
    const g = this.game, p = t.pos || t;
    if (!p || !Number.isFinite(p.x)) return false;
    if (!targOod(t)) return false;
    if (p.y < this.pos.y + this.cfg.minY) return false;                       // too low — AA, not artillery
    if (Math.hypot(p.x - this.pos.x, p.y - this.pos.y, p.z - this.pos.z) > this.cfg.range) return false;
    const owner = t._aaOwner || t;                                            // faction through the game's own rule
    if (!g.isFoe(this.source, owner)) return false;
    // LOS honesty: pass the ENTITY itself where there is one (canSee reads
    // identity for the own-hull exemption); a fleet target keeps its proxy.
    const subject = t._fleetActor ? { pos: p, _fleetVehicle: t._fleetActor } : t;
    return g.canSee ? g.canSee(this.source, subject) : true;
  }

  _pickTarget() {
    const g = this.game; let best = null, bd = Infinity;
    // flying fighters
    for (const e of g.entities || []) {
      if (!e?.alive || !e.flying) continue;
      if (!this._eligible(e)) continue;
      const d = _v.set(e.pos.x, e.pos.y, e.pos.z).distanceTo(this.pos);
      if (d < bd) { best = e; bd = d; }
    }
    // airborne fleet vehicles (through their crew for faction, hull for damage)
    for (const a of g._fleetActors || []) {
      if (a.destroyed || !a.occupant?.alive) continue;
      const proxy = { pos: a.pos, alive: true, _aaOwner: a.occupant, _fleetActor: a, aimHeight: (a.bodyHeight || 8) * .5, destroyed: a.destroyed };
      if (!this._eligible(proxy)) continue;
      const d = _v.set(a.pos.x, a.pos.y, a.pos.z).distanceTo(this.pos);
      if (d < bd) { best = proxy; bd = d; }
    }
    return best;
  }

  update(dt) {
    if (!(dt > 0) || this.destroyed) { if (this.destroyed && !this.dead) this._silence(); return; }
    const g = this.game, cfg = this.cfg;
    this.hull.update(dt);
    // missiles fly regardless of what the launcher is doing
    for (const m of this.missiles) m.update(dt);
    this.missiles = this.missiles.filter(m => !m.dead);
    this.reloadT = Math.max(0, this.reloadT - dt);

    // sense / lose / reacquire
    if (!this.target || !this._eligible(this.target)) {
      const next = this._pickTarget();
      if (next !== this.target) this.acquired = 0;
      this.target = next;
    }
    const t = this.target;
    if (!t) { this.acquired = 0; return; }

    // track within traverse limits (a mauled emplacement slews at half rate)
    const p = t.pos || t, rate = (this.actor.disabled ? .5 : 1);
    const wantYaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    const flat = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    const wantPitch = Math.atan2(p.y - (this.pos.y + cfg.muzzleUp), Math.max(flat, 1));
    this.yaw = approach(this.yaw, wantYaw, cfg.traverse * rate * dt);
    this.pitch = approach(this.pitch, wantPitch, cfg.elevate * rate * dt);
    if (this.turret?.rotation) this.turret.rotation.y = this.yaw;

    // fire eligibility: aligned + acquisition + ammo + reload
    const aligned = Math.abs(Math.atan2(Math.sin(wantYaw - this.yaw), Math.cos(wantYaw - this.yaw))) < 0.12
      && Math.abs(wantPitch - this.pitch) < 0.15;
    if (aligned) this.acquired += dt; else this.acquired = Math.max(0, this.acquired - dt);
    if (aligned && this.acquired >= cfg.acquireS && this.reloadT <= 0 && this.ammo > 0) this._launch(t);
  }

  _launch(t) {
    const cfg = this.cfg;
    const n = Math.min(cfg.salvo, this.ammo);
    for (let i = 0; i < n; i++) {
      this.ammo--;
      const cp = Math.cos(this.pitch);
      const dir = { x: Math.sin(this.yaw) * cp, y: Math.sin(this.pitch), z: Math.cos(this.yaw) * cp };
      const muzzle = { x: this.pos.x + dir.x * 3, y: this.pos.y + cfg.muzzleUp + i * .8, z: this.pos.z + dir.z * 3 };
      const m = new Missile(this.game, cfg.profile, { pos: muzzle, dir, target: t, source: this.source });
      m.launchCover = this.hull.cover;
      if (this.game.scene?.add) this.game.scene.add(buildMissileMesh(m));
      this.missiles.push(m);
    }
    this.reloadT = cfg.reloadS;
    this.acquired = 0;
    this.game.audio?.soundLibrary?.play?.('vehicle-explosion', { pos: this.pos, gain: .2 });
    this.game.noise?.(this.pos, 1.2, this.source);
    this.game.hud?.feed?.(`${this.name} — MISSILE AWAY (${this.ammo} left)`, '#ff8b63');
  }

  _silence() {
    this.dead = true; this.source.alive = false; this.target = null;
  }

  dispose() {
    for (const m of this.missiles) m.expire();
    this.missiles.length = 0;
    this.hull.dispose(); this._silence();
  }
}

// target is still worth shooting at
function targOod(t) { return !(t.alive === false || t.destroyed); }
