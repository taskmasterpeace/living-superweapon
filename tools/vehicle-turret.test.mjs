// TURRET / AIM TRUTH GATE — story 3 of the fleet workstream. The mouse aims a
// WORLD yaw/pitch; the slew solver converts to hull-relative intents the
// steppers already accept; the muzzle/direction helpers are the ONE source the
// reticle and the shell both read. Proves: convergence, envelope rate/limit
// honesty, world-stable aim under a turning hull, mech torso clamp, the
// FleetPilot mouse wiring (Alt = freelook, no gun movement), and muzzle truth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initVehicleState, driveActor } from '../src/engine/vehicle-pilot.js';
import { stepVehicle } from '../src/engine/vehicle-motion.js';
import { turretSlewIntent, turretDirWorld, muzzleWorld, wrapAngle } from '../src/engine/vehicle-weapons.js';
import { FleetPilot } from '../src/engine/fleet-pilot.js';

const DT = 1 / 60;
const tankEnv = VEHICLE_ENVELOPES.tank, mechEnv = VEHICLE_ENVELOPES['mech-light'];

test('turret converges onto a world aim and the rate limit is the envelope, not the solver', () => {
  const m = initVehicleState('tracked', 0), aim = { yaw: 0.9, pitch: 0.2 };
  let maxStep = 0, prev = 0;
  for (let i = 0; i < 240; i++) {
    const s = turretSlewIntent('tracked', m, tankEnv, aim, DT);
    stepVehicle('tracked', m, { throttle: 0, steer: 0, turretX: s.turretX, turretY: s.turretY }, DT, tankEnv, {});
    maxStep = Math.max(maxStep, Math.abs(m.turretYaw - prev)); prev = m.turretYaw;
  }
  assert.ok(Math.abs(m.turretYaw - 0.9) < 0.01, `turret reached the aim (${m.turretYaw.toFixed(3)})`);
  assert.ok(Math.abs(m.turretPitch - 0.2) < 0.01, `gun reached the elevation (${m.turretPitch.toFixed(3)})`);
  assert.ok(maxStep <= tankEnv.turretRate * DT + 1e-9, `slew never exceeds turretRate (${(maxStep / DT).toFixed(2)} rad/s cap ${tankEnv.turretRate})`);
});

test('the aim is WORLD-stable: a pivoting hull does not drag the gun off target', () => {
  const m = initVehicleState('tracked', 0), aim = { yaw: 0.6, pitch: 0 };
  // settle onto the aim, then pivot the hull hard
  for (let i = 0; i < 200; i++) {
    const s = turretSlewIntent('tracked', m, tankEnv, aim, DT);
    stepVehicle('tracked', m, { throttle: 0, steer: i > 100 ? 1 : 0, turretX: s.turretX, turretY: s.turretY }, DT, tankEnv, {});
  }
  const worldYaw = wrapAngle(m.yaw + m.turretYaw);
  assert.ok(Math.abs(wrapAngle(worldYaw - 0.6)) < 0.05, `gun still on the world aim after the pivot (${worldYaw.toFixed(3)}, hull ${m.yaw.toFixed(2)})`);
});

test('gun elevation clamps to the envelope limits', () => {
  const m = initVehicleState('tracked', 0);
  for (let i = 0; i < 400; i++) {
    const s = turretSlewIntent('tracked', m, tankEnv, { yaw: 0, pitch: 9 }, DT);
    stepVehicle('tracked', m, { turretX: 0, turretY: s.turretY }, DT, tankEnv, {});
  }
  assert.ok(m.turretPitch <= tankEnv.turretPitchMax + 1e-9, `max elevation honored (${m.turretPitch} <= ${tankEnv.turretPitchMax})`);
  for (let i = 0; i < 400; i++) {
    const s = turretSlewIntent('tracked', m, tankEnv, { yaw: 0, pitch: -9 }, DT);
    stepVehicle('tracked', m, { turretX: 0, turretY: s.turretY }, DT, tankEnv, {});
  }
  assert.ok(m.turretPitch >= tankEnv.turretPitchMin - 1e-9, `depression honored (${m.turretPitch} >= ${tankEnv.turretPitchMin})`);
});

test('mech torso aims the same way and clamps at torsoMax', () => {
  const m = initVehicleState('mech', 0); m.power = 1;
  for (let i = 0; i < 400; i++) {
    const s = turretSlewIntent('mech', m, mechEnv, { yaw: 3.0, pitch: 0 }, DT);
    stepVehicle('mech', m, { throttle: 0, powerOn: true, torsoX: s.torsoX }, DT, mechEnv, {});
  }
  assert.ok(Math.abs(m.torsoYaw - mechEnv.torsoMax) < 0.02, `torso pinned at its limit (${m.torsoYaw.toFixed(2)} vs ${mechEnv.torsoMax})`);
});

test('muzzle truth: the muzzle sits on the gun axis, above the hull, outside the body circle', () => {
  const a = { cls: 'tracked', env: tankEnv, motion: initVehicleState('tracked', 0.4), pos: { x: 10, y: 2, z: -5 }, bodyRadius: 8, bodyHeight: 12 };
  a.motion.turretYaw = 0.5; a.motion.turretPitch = 0.2;
  const { pos, dir } = muzzleWorld(a);
  const d2 = turretDirWorld(a);
  assert.deepEqual(dir, d2, 'reticle and shell read the SAME direction');
  const yaw = 0.4 + 0.5;
  assert.ok(Math.abs(dir.x - Math.sin(yaw) * Math.cos(0.2)) < 1e-9 && Math.abs(dir.y - Math.sin(0.2)) < 1e-9, 'direction = hull yaw + turret yaw + pitch');
  assert.ok(Math.hypot(pos.x - a.pos.x, pos.z - a.pos.z) > a.bodyRadius, 'muzzle clears the hull collision circle');
  assert.ok(pos.y > a.pos.y, 'muzzle above the hull origin');
});

// ---- FleetPilot wiring: the mouse aims the gun; Alt is freelook ----
const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, copy(v) { Object.assign(this, { x: v.x, y: v.y, z: v.z }); return this; } });
function rigTank() {
  const p = { alive: true, radius: 2, flying: false, moveDir: { x: 0, z: 0 }, slots: {}, pos: vec(), vel: { set() {} }, obj: { visible: true, position: vec() } };
  const a = { id: 'tank', name: 'tank', cls: 'tracked', env: tankEnv, motion: initVehicleState('tracked', 0), pos: vec(), wrapper: { position: vec(), rotation: { set() {} } }, bodyRadius: 10, groundOffset: 2, ready: true, occupant: null };
  const world = { ARENA: 6000, heightAt: () => 0, waterAt: () => false, cover: [], _lookSens: .0024 };
  const game = { player: p, world, paused: false, running: true, matchOver: false, hud: { feed() {} }, _fleetActors: [a] };
  return { pilot: new FleetPilot(game), p, a };
}
const inp = (pressed = [], down = [], mouse = { dx: 0, dy: 0 }) => ({ pressed: c => pressed.includes(c), down: c => down.includes(c), justPressed: { delete() {} }, mouse });

test('the mouse slews the tank turret through the pilot; Alt+mouse leaves the gun alone', () => {
  const { pilot, a } = rigTank();
  pilot.handleInput(inp(['KeyJ']));
  for (let i = 0; i < 120; i++) { pilot.handleInput(inp([], [], { dx: 6, dy: 0 })); pilot.update(DT); }
  assert.ok(a.motion.turretYaw > 0.3, `mouse right slewed the turret (${a.motion.turretYaw.toFixed(3)} rad)`);
  const held = a.motion.turretYaw;
  for (let i = 0; i < 90; i++) { pilot.handleInput(inp([], ['AltLeft'], { dx: 9, dy: 4 })); pilot.update(DT); }
  assert.ok(Math.abs(a.motion.turretYaw - held) < 0.01, `Alt freelook never moved the gun (${a.motion.turretYaw.toFixed(3)} vs ${held.toFixed(3)})`);
});

test('mouse up raises the gun within limits; a driving, turning tank keeps the world aim', () => {
  const { pilot, a } = rigTank();
  pilot.handleInput(inp(['KeyJ']));
  for (let i = 0; i < 200; i++) { pilot.handleInput(inp([], [], { dx: 0, dy: -400 })); pilot.update(DT); }
  assert.ok(Math.abs(a.motion.turretPitch - tankEnv.turretPitchMax) < 0.02, `pinned at max elevation (${a.motion.turretPitch.toFixed(3)})`);
  // now hold a fixed world aim while driving a turn: gun world yaw must hold
  for (let i = 0; i < 90; i++) { pilot.handleInput(inp([], [])); pilot.update(DT); }         // settle, no mouse
  const aimYaw = wrapAngle(a.motion.yaw + a.motion.turretYaw);
  for (let i = 0; i < 150; i++) { pilot.handleInput(inp([], ['KeyW', 'KeyD'])); pilot.update(DT); }
  const worldYaw = wrapAngle(a.motion.yaw + a.motion.turretYaw);
  assert.ok(Math.abs(wrapAngle(worldYaw - aimYaw)) < 0.06, `driving turn did not drag the gun (${worldYaw.toFixed(3)} vs ${aimYaw.toFixed(3)})`);
});
