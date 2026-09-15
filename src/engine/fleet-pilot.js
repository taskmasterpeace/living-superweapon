// FLEET PILOT — the ONE boarding + driving manager for spawned reference-fleet
// vehicles. Robert: "everything needs a pilot." It owns game._fleetActors (spawned by
// game.spawnFleetVehicle), lets the player walk up + press J to board any of them, and
// each frame reads WASD into a per-class intent and runs the generic driveActor
// (vehicle-pilot.js) — so a tank, mech, hovercraft, ship, the carrier or the mothership
// all board and drive through this single path. Powerworld-gated; the city is untouched.
import { driveActor } from './vehicle-pilot.js';
import { cancelHeldAttacks } from './abilities.js';
import { FleetAudio } from './fleet-audio.js';
import {FleetControlsHud,fleetControls} from './fleet-controls.js';

// Normalised controls → the intent shape each class's stepper expects. Ground classes
// drive on W/S; aircraft keep flight-sim mapping (throttle R/F, pitch W/S, bank A/D).
export function fleetIntent(cls, c) {
  if (cls === 'fixedwing') return { throttle: c.throttle, steer: c.bank, rudder: c.bank, pitch: c.pitch, barrel: 0, gearToggle:c.gearToggle, parked: false };
  if (cls === 'rotor') return { throttle: c.fwd, steer: c.turn, lift: c.lift, barrel: c.barrel, on: true };
  if (cls === 'tracked') return { throttle: c.fwd, steer: c.turn, brake: c.brake, turretX: c.aimX, turretY: c.aimY };
  if (cls === 'mech') return { throttle: c.fwd, steer: c.turn, brake: c.brake, torsoX: c.aimX, powerOn: true };
  if (cls === 'hover' || cls === 'ship') return { throttle: c.fwd, steer: c.turn, brake: c.brake };
  return { throttle: c.fwd, steer: c.turn, brake: c.brake, barrel: c.barrel };           // wheeled
}

export class FleetPilot {
  constructor(game) { this.game = game; this.actor = null; this._tapT = 0; this._tapKey = ''; this._audio = new FleetAudio(game.audio); this._hud=new FleetControlsHud(); }

  _blocked() { const g = this.game; return g.paused || g.running === false || g.matchOver || g.hud?.titleOpen || g.combatOverlayOpen; }

  handleInput(input) {
    const g = this.game, p = g.player;
    if (this._blocked()) { this._audio.pause(); return !!this.actor; }
    if (input?.pressed?.('KeyJ')) {
      input.justPressed?.delete?.('KeyJ');
      if (this.actor) { this.exit(); return true; }
      const a = this._nearest(p);
      if (a) { this.enter(a, p); return true; }
    }
    if (!this.actor) return false;
    const d = code => !!input?.down?.(code), cls = this.actor.cls;
    // Steering taps never trigger an aerobatic maneuver.
    const barrel = 0;
    this._c = {
      fwd: Number(d('KeyW')) - Number(d('KeyS')),
      turn: Number(d('KeyD')) - Number(d('KeyA')),
      bank: Number(d('KeyD')) - Number(d('KeyA')),
      throttle: Number(d('KeyR')) - Number(d('KeyF')),      // aircraft throttle
      pitch: Number(d('KeyS')) - Number(d('KeyW')),          // aircraft collective
      lift: Number(d('Space')) - Number(d('ControlLeft') || d('KeyZ')),
      brake: d('Space'),
      aimX: 0, aimY: 0, barrel, gearToggle:!!input?.pressed?.('KeyG'),
    };
    return true;
  }

  _nearest(p) {
    if (!p?.alive || p._fleetVehicle || p._scoutVehicle || p._aircraftVehicle) return null;
    let best = null, dist = Infinity;
    for (const a of (this.game._fleetActors || [])) {
      if (!a.ready || a.occupant || a.destroyed) continue;
      const d = Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
      if (d < (a.bodyRadius || 8) + 8 && d < dist) { best = a; dist = d; }
    }
    return best;
  }

  enter(a, p) {
    cancelHeldAttacks(p); this.actor = a; a.occupant = p; p._fleetVehicle = a; p._occVisible = p.obj?.visible;
    p.flying = p.flyHeld = p.descendHeld = p.guarding = p.prone = p.crouching = p.sprintHeld = false;
    if (p.moveDir) p.moveDir = { x: 0, z: 0 }; p.vel?.set?.(0, 0, 0); if (p.obj) p.obj.visible = false;
    this._c = null; this.game.world && (this.game.world._chaseSnap = true);
    this._seat();
    this._hud.update(a);
    this._audio.enter(a);
    this.game.hud?.feed?.(`${(a.name || a.id).toUpperCase()} — ${fleetControls(a.cls)}`, '#ffce75');
    return true;
  }

  _seat() { const a = this.actor, p = a?.occupant; if (!p) return; p.pos?.set ? p.pos.set(a.pos.x, a.pos.y + (a.groundOffset || 2), a.pos.z) : (p.pos.x = a.pos.x, p.pos.y = a.pos.y, p.pos.z = a.pos.z); p.vel?.set?.(0, 0, 0); if (p.obj) { p.obj.position?.copy?.(p.pos); p.obj.visible = false; } }

  update(dt) {
    const a = this.actor; if (!a) { this._audio.stop(); return; }
    if (a.destroyed || !a.occupant?.alive || a.occupant !== this.game.player) { this.exit(); return; }
    if (this._blocked() || !(dt > 0)) { this._audio.pause(); return; }
    this._audio.update(this._c || {});
    driveActor(a, fleetIntent(a.cls, this._c || {}), dt, this.game.world);
    if(this._c)this._c.gearToggle=false;
    this._hud.update(a);
    this._seat();
  }

  exit() {
    this._hud.dispose();
    this._audio.stop({off:!this._blocked()});
    const a = this.actor, p = a?.occupant; if (!p) { this.actor = null; return false; }
    const r = (p.radius || 2) + (a.bodyRadius || 8) + 3;
    p.pos?.set ? p.pos.set(a.pos.x + r, a.pos.y, a.pos.z) : (p.pos.x = a.pos.x + r);
    p.obj && (p.obj.position?.copy?.(p.pos), p.obj.visible = p._occVisible !== false);
    p.vel?.set?.(0, 0, 0); p._fleetVehicle = null; a.occupant = null;
    this.actor = null; this._c = null; this.game.world && (this.game.world._chaseSnap = true);
    return true;
  }

  dispose() { this._audio.stop(); if (this.actor) this.exit(); }
}
