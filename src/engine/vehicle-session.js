// VEHICLE CONTROL SESSION — the ONE seat/ownership contract for every vehicle
// family. The repo grew four separate enter/exit implementations (fleet, scout,
// aircraft, transport) that each hand-roll occupancy, visibility stashing and
// control restoration; every next seat consumer (a tank gunner, an AI crew, a
// second motorcycle passenger) was about to be a fifth. This module is the
// shared half: WHO sits WHERE, which controller SOURCE owns the seat
// (player | ai), what state was stashed at claim time, and the one restore
// path that death-inside, vehicle-destruction and ordinary dismount all share.
//
// It deliberately does NOT own input mapping, proximity/obstruction rules,
// cameras, HUD or audio — those stay with the per-family pilot (FleetPilot,
// AircraftPiloting…). A session is pure occupancy + restoration, so it is
// headlessly testable with stub fighters.
import { cancelHeldAttacks } from './abilities.js';
import { isOpenSeat, poseRider, unposeRider } from './vehicle-rider.js';

export const SEAT_DRIVER = 'driver';
export const SEAT_GUNNER = 'gunner';

// Which seats a vehicle offers. Authored per actor (actor.seatLayout) with a
// one-seat default — a catalog row can later declare crew without code.
export function seatLayoutOf(actor) { return actor?.seatLayout || [SEAT_DRIVER]; }

// The one busy oracle for "can this fighter change seats right now" — shared by
// every claim so a grabbed/frozen/carried fighter can never teleport into a hull.
export function seatBusy(p) {
  return !p?.alive || p.stunT > 0 || p.frozenT > 0 || p.staggerT > 0 || p.sleepT > 0 ||
    p.launchT > 0 || !!p.grabbedBy || !!p.grabbing || !!p._carry || !!p._personCarry;
}

export function sessionOf(game, actor) {
  if (!actor) return null;
  return actor.session instanceof VehicleSession ? actor.session : new VehicleSession(game, actor);
}

export class VehicleSession {
  constructor(game, actor) {
    this.game = game; this.actor = actor;
    this.seats = new Map();            // seat name -> { fighter, source, stash }
    actor.session = this;
  }

  occupantOf(seat = SEAT_DRIVER) { return this.seats.get(seat)?.fighter || null; }
  get driver() { return this.occupantOf(SEAT_DRIVER); }
  sourceOf(seat = SEAT_DRIVER) { return this.seats.get(seat)?.source || null; }
  occupants() { return [...this.seats.values()].map(s => s.fighter); }

  // Why a claim would be refused, or null. Occupancy/state only — the pilot
  // layers proximity/obstruction on top of this, never instead of it.
  claimReason(seat, f) {
    if (!seatLayoutOf(this.actor).includes(seat)) return `No ${seat} seat on this vehicle.`;
    if (this.actor.destroyed || this.actor.ready === false) return 'Vehicle is unavailable.';
    if (this.seats.get(seat)?.fighter?.alive) return `The ${seat} seat is taken.`;
    // honor occupancy set outside the session (legacy spawn paths, tests)
    if (seat === SEAT_DRIVER && this.actor.occupant && this.actor.occupant !== this.occupantOf(SEAT_DRIVER)) return 'Vehicle is unavailable.';
    if (seatBusy(f)) return 'Cannot board during this action.';
    if (f._fleetVehicle || f._scoutVehicle || f._aircraftVehicle || f._passengerTransport) return 'Already crewing a vehicle.';
    return null;
  }

  // Take the seat: stash what boarding suppresses, suppress it, pin ownership.
  claim(seat, f, { source = 'player' } = {}) {
    const reason = this.claimReason(seat, f);
    if (reason) return reason;
    cancelHeldAttacks(f);
    const stash = { visible: f.obj ? f.obj.visible : true };
    f.flying = f.flyHeld = f.descendHeld = f.guarding = f.prone = f.crouching = f.sprintHeld = false;
    if (f.moveDir) f.moveDir = { x: 0, z: 0 };
    f.vel?.set?.(0, 0, 0);
    // an OPEN seat (motorcycle/ATV/hoverboard) keeps the rider VISIBLE and
    // posed on the saddle; a closed hull hides the crew
    if (f.obj && !isOpenSeat(this.actor)) f.obj.visible = false;
    f._fleetVehicle = this.actor; f._fleetSeat = seat; f._occVisible = stash.visible;
    this.seats.set(seat, { fighter: f, source, stash });
    if (seat === SEAT_DRIVER) this.actor.occupant = f;     // legacy alias every existing reader uses
    return null;
  }

  // The ONE restore path. destination (optional) places the fighter; without it
  // they keep the seat position (forced release when boxed in / killed / actor
  // destroyed — never teleport through a wall).
  release(seat, { destination = null } = {}) {
    const rec = this.seats.get(seat);
    if (!rec) return false;
    const f = rec.fighter;
    this.seats.delete(seat);
    if (seat === SEAT_DRIVER) this.actor.occupant = null;
    if (destination) {
      f.pos?.set ? f.pos.set(destination.x, destination.y, destination.z) : Object.assign(f.pos, destination);
      if ('air' in destination) f.flying = !!destination.air && f.alive;
      f.groundY = this.game?.world?.heightAt?.(destination.x, destination.z) ?? 0;
    }
    if (isOpenSeat(this.actor)) unposeRider(f);
    if (f.obj) { f.obj.position?.copy?.(f.pos); f.obj.visible = rec.stash.visible !== false; }
    f.vel?.set?.(0, 0, 0);
    f._fleetVehicle = null; f._fleetSeat = null;
    return true;
  }

  releaseAll() { for (const seat of [...this.seats.keys()]) this.release(seat); }

  // Per-frame: pin every occupant to the hull (they have no physics of their own
  // while seated — entity.js gates on _fleetVehicle), and give the corpse of a
  // dead occupant back to the world immediately.
  tick() {
    for (const [seat, rec] of [...this.seats]) {
      const f = rec.fighter;
      if (!f.alive || this.actor.destroyed) { this.release(seat); continue; }
      f.vel?.set?.(0, 0, 0);
      if (isOpenSeat(this.actor)) { poseRider(this.actor, f); continue; }
      const y = this.actor.pos.y + (this.actor.groundOffset || 2);
      f.pos?.set ? f.pos.set(this.actor.pos.x, y, this.actor.pos.z) : (f.pos.x = this.actor.pos.x, f.pos.y = y, f.pos.z = this.actor.pos.z);
      if (f.obj) { f.obj.position?.copy?.(f.pos); f.obj.visible = false; }
    }
  }
}
