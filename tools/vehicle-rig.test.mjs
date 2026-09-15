// VEHICLE RIG GATE — the movable sub-parts are found by the fleet naming convention
// and driven from the sim: turret slews, barrel pitches, rotors spin, wheels roll,
// ailerons/elevators deflect, mech torso twists. THREE-free stubs (name + rotation).
import test from 'node:test';
import assert from 'node:assert/strict';
import { bindVehicleParts, rigParts } from '../src/engine/vehicle-rig.js';

const node = name => ({ name, rotation: { x: 0, y: 0, z: 0 }, userData: {} });
const model = (...names) => { const nodes = names.map(node); return { nodes, traverse(fn) { for (const n of this.nodes) fn(n); }, byName: n => nodes.find(x => x.name === n) }; };

test('binds only real articulation nodes, never -painted/-fleet variants', () => {
  const m = model('turret', 'turret-painted', 'turret-fleet-armor', 'barrel', 'wheel-1-1');
  const p = bindVehicleParts(m);
  assert.equal(p.turret, m.byName('turret'), 'the bare turret node is bound');
  assert.notEqual(p.turret, m.byName('turret-painted'), 'not the painted variant');
  assert.ok(p.barrel && p.wheels.length === 1, 'barrel + one wheel bound');
});

test('TRACKED: turret slews, barrel pitches, wheels roll', () => {
  const m = model('turret', 'barrel', 'wheel-1-1', 'wheel--1-1');
  const a = { cls: 'tracked', parts: bindVehicleParts(m), motion: { turretYaw: 0.8, turretPitch: 0.2, vx: 0, vz: 5, speed: 5 } };
  rigParts(a, 1 / 60);
  assert.ok(Math.abs(m.byName('turret').rotation.y - 0.8) < 1e-6, 'turret yaw = turretYaw');
  assert.ok(Math.abs(m.byName('barrel').rotation.x + 0.2) < 1e-6, 'barrel pitched');
  assert.ok(m.byName('wheel-1-1').rotation.x > 0, 'wheels rolled with speed');
});

test('ROTOR: main + tail rotors spin while spooled', () => {
  const m = model('rotor-main', 'tail-rotor');
  const a = { cls: 'rotor', parts: bindVehicleParts(m), motion: { spool: 1, vx: 0, vz: 0 } };
  rigParts(a, 1 / 60); const y1 = m.byName('rotor-main').rotation.y; rigParts(a, 1 / 60);
  assert.ok(y1 > 0 && m.byName('rotor-main').rotation.y > y1, 'main rotor keeps spinning');
  assert.ok(m.byName('tail-rotor').rotation.x > 0, 'tail rotor spins');
});

test('ROTOR: rotors do NOT spin before spool-up', () => {
  const m = model('rotor-main');
  const a = { cls: 'rotor', parts: bindVehicleParts(m), motion: { spool: 0, vx: 0, vz: 0 } };
  rigParts(a, 1 / 60);
  assert.equal(m.byName('rotor-main').rotation.y, 0, 'no spin at zero spool');
});

test('FIXEDWING: ailerons deflect opposite with bank, elevators with pitch', () => {
  const m = model('aileron-left', 'aileron-right', 'elevator-left', 'elevator-right');
  const a = { cls: 'fixedwing', parts: bindVehicleParts(m), motion: { roll: 0.6, pitch: 0.3 } };
  rigParts(a, 1 / 60);
  assert.ok(m.byName('aileron-left').rotation.x > 0 && m.byName('aileron-right').rotation.x < 0, 'ailerons deflect opposite (roll)');
  assert.ok(m.byName('elevator-left').rotation.x > 0, 'elevators deflect (pitch)');
});

test('MECH: torso twists free of the legs', () => {
  const m = model('mech-torso');
  const a = { cls: 'mech', parts: bindVehicleParts(m), motion: { torsoYaw: 0.5 } };
  rigParts(a, 1 / 60);
  assert.ok(Math.abs(m.byName('mech-torso').rotation.y - 0.5) < 1e-6, 'torso yaw = torsoYaw');
});

test('rigParts is a no-op on a part-less stub actor (never throws)', () => {
  assert.doesNotThrow(() => rigParts({ cls: 'wheeled', motion: { vx: 5, vz: 0 } }, 1 / 60));
  assert.doesNotThrow(() => rigParts(null, 1 / 60));
});
