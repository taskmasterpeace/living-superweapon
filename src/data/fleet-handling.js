// FLEET HANDLING — the one place that gives EVERY reference-fleet model a way to
// be controlled. Robert: "everything needs a pilot." Rather than hand-wiring ~90
// vehicles, this DERIVES, from a catalog model (public/reference-fleet/catalog.json),
// a motion CLASS + an ENVELOPE (data/vehicle-envelopes.js) + whether it DRIVES (has
// a stepper in vehicle-motion.js) or is a manned turret / static / drone.
//
// The envelope rows were authored to the catalog's base ids, so an authored row
// wins; anything without one falls to a per-class default so a new model still moves.
import { VEHICLE_ENVELOPES, envelopeOf } from './vehicle-envelopes.js';

// -damaged / -destroyed are CONDITION variants of the same vehicle — they inherit
// the base id's handling. `mothership-fighter` is its own vehicle, not a variant.
const VARIANT = /-(damaged|destroyed)$/;
export const baseId = id => String(id || '').replace(VARIANT, '');

// Classes that have a motion stepper (they DRIVE). turret/static/drone do not —
// a turret rigs (rotates) and is manned, static is scenery, drone is the swarm system.
export const DRIVING = new Set(['fixedwing', 'rotor', 'wheeled', 'tracked', 'hover', 'mech', 'ship']);

// Per-class fallback envelope for a model with no authored row (keeps a new catalog
// entry drivable). Real rows in vehicle-envelopes.js always win.
export const CLASS_DEFAULTS = Object.freeze({
  fixedwing: { cls: 'fixedwing', top: 180, burnTop: 0, thrust: 40, throttleRate: .6, stall: 46, liftRamp: 28, sink: 26, bank: 1.1, bankCap: .9, turnK: 38, pitchRate: .5, pitchCap: .45, climbBleed: 1.15, rotate: 70, windK: 1 },
  rotor: { cls: 'rotor', top: 80, accelK: 2, climb: 30, sinkMax: 38, turn: 1.0, lean: .18, leanK: .010, rock: .03, rockHz: .8, spool: 2.4, windK: .85 },
  wheeled: { cls: 'wheeled', top: 46, reverse: 16, accel: 32, brake: 56, coast: .8, grip: 9, turnRate: 1.4, hiSteer: .44, slopePull: 46, maxGrade: .58, windK: .05, lean: 0 },
  tracked: { cls: 'tracked', top: 34, reverse: 13, accel: 14, brake: 28, pivot: 1.1, moveTurn: .55, slopePull: 34, maxGrade: .7, windK: 0, turretRate: 1.4, turretPitchRate: .8, turretPitchMin: -.14, turretPitchMax: .35 },
  hover: { cls: 'hover', top: 60, accel: 28, brake: 30, grip: 3.2, turnRate: 1.2, hoverH: 3, bob: .4, bobHz: 1.8, windK: .45, lean: .2 },
  mech: { cls: 'mech', top: 26, accel: 18, brake: 32, turn: 1.2, torsoRate: 1.8, torsoMax: 1.22, powerTime: 2.4, stride: 1.7, slopePull: 22, maxGrade: .85, windK: 0 },
  ship: { cls: 'ship', top: 16, reverse: 5, accel: 1.6, brake: 2.4, turn: .055, windK: .08 },
});

// The motion class for a catalog model. An authored envelope row wins; otherwise it
// derives from the group + id/name/note keywords.
export function classOf(model) {
  const id = baseId(model && (model.id ?? model));
  const row = envelopeOf(id);
  if (row) return row.cls;                                   // authored row wins
  const g = model && model.group;
  const s = (id + ' ' + ((model && model.name) || '') + ' ' + ((model && model.note) || '')).toLowerCase();
  if (g === 'Sea') return 'ship';
  if (g === 'Mechs') return 'mech';
  if (g === 'Drones') return 'drone';                        // swarm system owns these
  if (g === 'Aircraft') return /heli|rotor|chopper|gunship/.test(s) ? 'rotor' : 'fixedwing';
  if (g === 'Ground') {
    if (/hover/.test(s)) return 'hover';
    if (/tank|tracked|track\b|self-propelled|apc/.test(s)) return 'tracked';
    return 'wheeled';
  }
  if (g === 'Defense') {
    if (/tank|tracked|mobile|self-propelled|spaag/.test(s)) return 'tracked';
    if (/radar|station|silo|bunker/.test(s)) return 'static';
    return 'turret';                                         // aa-gun / aa-missile emplacements (manned or auto)
  }
  return 'static';                                           // Equipment / Facilities / Ordnance
}

export function drives(model) { return DRIVING.has(classOf(model)); }

// The envelope a driving model uses (authored row, else the class default). null for
// non-driving classes.
export function envelopeFor(model) {
  const cls = classOf(model);
  if (!DRIVING.has(cls)) return null;
  return envelopeOf(baseId(model && (model.id ?? model))) || CLASS_DEFAULTS[cls] || null;
}

// A person can take control of it: anything that drives, plus a MANNED turret. Auto
// turrets, static scenery and swarm drones are AI/self-managed, not player-piloted.
export function controllable(model) {
  if (drives(model)) return true;
  return classOf(model) === 'turret' && /manned/.test(baseId(model && (model.id ?? model)));
}

// Coverage report for the whole catalog — the gate reads this so it can't drift.
export function fleetHandlingReport(models) {
  const byClass = {}, gaps = [];
  for (const m of models) {
    if (VARIANT.test(m.id || '')) continue;                  // count base vehicles only
    const cls = classOf(m);
    byClass[cls] = (byClass[cls] || 0) + 1;
    if (DRIVING.has(cls) && !envelopeFor(m)) gaps.push(m.id); // a driving model with no envelope at all
  }
  return { byClass, gaps };
}
