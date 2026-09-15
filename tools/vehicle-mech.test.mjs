// MECH LOCOMOTION GATE — story 11. The law under test: PHYSICS OWNS TRAVEL,
// animation only presents around it. Stride phase is proportional to actual
// distance covered (no foot-skating in phase terms), the gait fades in/out on
// start/stop, the rig can NEVER move the body, powered-down is parked, the
// torso aims independently, and a hull hit rocks the torso and recovers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initVehicleState, driveActor } from '../src/engine/vehicle-pilot.js';
import { rigParts } from '../src/engine/vehicle-rig.js';
import { attachVehicleHull } from '../src/engine/vehicle-combat.js';

const DT = 1 / 60, env = VEHICLE_ENVELOPES['mech-light'];
const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
const node = () => ({ rotation: { x: 0, y: 0, z: 0 }, position: { z: 0 }, userData: {} });
function legs() { const l = {}; for (let i = 0; i < 4; i++) l[i] = { hip: node(), knee: node(), ankle: node() }; for (const c of Object.values(l)) for (const j of Object.values(c)) j.userData = { _restX: 0 }; return l; }
function mech(withParts = true) {
  const a = { id: 'mech-light', cls: 'mech', env, motion: initVehicleState('mech', 0), pos: { x: 0, y: 0, z: 0 }, wrapper: { position: vec(), rotation: { set() {} } }, bodyRadius: 6, bodyHeight: 16, groundOffset: 0 };
  a.motion.power = 1;
  if (withParts) { a.parts = { wheels: [], rotors: [], tailRotors: [], ailerons: {}, elevators: {}, landingGear: [], legs: legs(), torso: node() }; a.parts.torso.userData = { _restX: 0, _restY: 0 }; }
  return a;
}
const flat = () => ({ ARENA: 60000, heightAt: () => 0, waterAt: () => false, cover: [] });

test('stride phase is PROPORTIONAL to distance covered — half speed, half phase per meter... same phase per meter', () => {
  const w = flat();
  const run = throttle => {
    const a = mech(false);
    for (let i = 0; i < 600; i++) driveActor(a, { throttle, powerOn: true }, DT, w);
    return { dist: Math.hypot(a.pos.x, a.pos.z), phase: a.motion.strideT };
  };
  const full = run(1), half = run(0.5);
  const perMeterFull = full.phase / full.dist, perMeterHalf = half.phase / half.dist;
  assert.ok(Math.abs(perMeterFull - perMeterHalf) / perMeterFull < 0.02,
    `phase per meter is speed-invariant (${perMeterFull.toFixed(4)} vs ${perMeterHalf.toFixed(4)}) — no skating`);
});

test('PHYSICS OWNS TRAVEL: the rig never moves the body', () => {
  const w = flat(), withRig = mech(true), noRig = mech(false);
  for (let i = 0; i < 480; i++) {
    driveActor(withRig, { throttle: 1, powerOn: true, torsoX: 1 }, DT, w);
    driveActor(noRig, { throttle: 1, powerOn: true, torsoX: 1 }, DT, w);
  }
  assert.equal(withRig.pos.x, noRig.pos.x);
  assert.equal(withRig.pos.z, noRig.pos.z);
  assert.equal(withRig.motion.yaw, noRig.motion.yaw, 'articulation changed NOTHING about travel');
});

test('gait fades in on start and back to rest on stop; legs are driven while walking', () => {
  const w = flat(), a = mech(true);
  driveActor(a, { throttle: 0, powerOn: true }, DT, w);
  assert.ok((a.parts.gaitWeight || 0) < 0.05, 'standing: no gait');
  for (let i = 0; i < 300; i++) driveActor(a, { throttle: 1, powerOn: true }, DT, w);
  assert.ok(a.parts.gaitWeight > 0.8, `walking: gait engaged (${a.parts.gaitWeight.toFixed(2)})`);
  let maxHip = 0, maxSplit = 0;
  for (let i = 0; i < 90; i++) {
    driveActor(a, { throttle: 1, powerOn: true }, DT, w);
    const hips = Object.values(a.parts.legs).map(l => l.hip.rotation.x);
    maxHip = Math.max(maxHip, ...hips.map(Math.abs));
    maxSplit = Math.max(maxSplit, Math.abs(hips[0] - hips[1]));
  }
  assert.ok(maxHip > 0.1, `hips actually swing (peak ${maxHip.toFixed(3)})`);
  assert.ok(maxSplit > 0.1, `diagonal pairs oppose (peak split ${maxSplit.toFixed(3)})`);
  for (let i = 0; i < 400; i++) driveActor(a, { throttle: 0, brake: 1, powerOn: true }, DT, w);
  assert.ok(a.parts.gaitWeight < 0.05, 'stopped: gait faded');
  assert.ok(Object.values(a.parts.legs).every(l => Math.abs(l.hip.rotation.x) < 0.05), 'legs settle to stance');
});

test('powered down is PARKED: nothing answers until the spool completes', () => {
  const w = flat(), a = mech(false);
  a.motion.power = 0;
  for (let i = 0; i < 30; i++) driveActor(a, { throttle: 1, powerOn: true }, DT, w);   // still spooling (powerTime 1.6s)
  assert.ok(Math.hypot(a.pos.x, a.pos.z) < 0.5, 'no travel while powering up');
  for (let i = 0; i < 300; i++) driveActor(a, { throttle: 1, powerOn: true }, DT, w);
  assert.ok(Math.hypot(a.pos.x, a.pos.z) > 20, 'walks once powered');
});

test('torso aims independently of the legs and clamps at its stop', () => {
  const w = flat(), a = mech(true);
  for (let i = 0; i < 400; i++) driveActor(a, { throttle: 1, powerOn: true, torsoX: 1 }, DT, w);
  assert.ok(Math.abs(a.motion.torsoYaw - env.torsoMax) < 0.02, `torso pinned at its stop (${a.motion.torsoYaw.toFixed(2)})`);
  assert.equal(a.parts.torso.rotation.y, a.motion.torsoYaw, 'rig presents exactly the sim torso');
});

test('impact reaction: a hull hit rocks the torso, then it recovers to rest', () => {
  const w = flat(), a = mech(true);
  const g = { world: { ...w, cover: [], coverAll: [], refreshFogBoxes() {} }, hud: { feed() {} }, particles: { burst() {} }, noise() {}, audio: null, vfx: null, news: null };
  const hull = attachVehicleHull(g, a);
  hull.hit(40, { team: 0 });
  assert.ok(a.flinchT > 0, 'flinch armed by the hit');
  rigParts(a, DT);
  assert.ok(a.parts.torso.rotation.x < -0.05, 'torso rocked back');
  for (let i = 0; i < 90; i++) rigParts(a, DT);
  assert.equal(a.parts.torso.rotation.x, 0, 'recovered to rest');
});
