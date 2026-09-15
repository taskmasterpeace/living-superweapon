// FLEET PILOT GATE — the one boarding manager: walk up, press J, drive any class,
// press J to leave. Verified headless with stub actors (no GLB), across ground/air/sea.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initVehicleState } from '../src/engine/vehicle-pilot.js';
import { FleetPilot, fleetIntent } from '../src/engine/fleet-pilot.js';

const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; } });
function wrap() { return { position: vec(), rotation: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } } }; }
function player() { return { alive: true, radius: 2, flying: false, moveDir: { x: 0, z: 0 }, slots: {}, pos: vec(), vel: { set() {} }, obj: { visible: true, position: vec() } }; }
function fleetActor(envId, cls) {
  const e = VEHICLE_ENVELOPES[envId];
  return { id: envId, name: envId, cls: cls || e.cls, env: e, motion: initVehicleState(cls || e.cls, 0), pos: vec(), wrapper: wrap(), bodyRadius: 10, groundOffset: 2, span: 20, ready: true, occupant: null };
}
function rig(envId, cls) {
  const p = player(), a = fleetActor(envId, cls);
  const world = { ARENA: 6000, heightAt: () => 0, waterAt: () => false, cover: [], _chaseSnap: false };
  const game = { player: p, world, paused: false, running: true, matchOver: false, hud: { feed() {} }, _fleetActors: [a] };
  return { pilot: new FleetPilot(game), p, a, game };
}
const inp = (pressed = [], down = []) => ({ pressed: c => pressed.includes(c), down: c => down.includes(c), justPressed: { delete() {} } });

test('board with J, hide the driver, then exit with J restores', () => {
  const { pilot, p, a } = rig('tank');
  assert.equal(pilot.handleInput(inp(['KeyJ'])), true);
  assert.equal(pilot.actor, a); assert.equal(p._fleetVehicle, a); assert.equal(p.obj.visible, false);
  pilot.handleInput(inp(['KeyJ']));
  assert.equal(pilot.actor, null); assert.equal(p._fleetVehicle, null); assert.equal(p.obj.visible, true);
});

test('_nearest skips un-ready and occupied actors', () => {
  const { pilot, a } = rig('tank');
  a.ready = false; assert.equal(pilot.handleInput(inp(['KeyJ'])), false, 'cannot board a still-loading vehicle');
  a.ready = true; a.occupant = {}; assert.equal(pilot.handleInput(inp(['KeyJ'])), false, 'cannot board an occupied vehicle');
});

for (const [envId, cls, drive] of [['tank', 'tracked', ['KeyW']], ['humvee', 'wheeled', ['KeyW']], ['aircraft-carrier', 'ship', ['KeyW']], ['jet-a', 'fixedwing', ['KeyR']], ['helicopter', 'rotor', ['KeyW']]]) {
  test(`drive a ${cls} (${envId}) through the fleet pilot: it moves, driver rides along`, () => {
    const { pilot, p, a } = rig(envId, cls);
    pilot.handleInput(inp(['KeyJ']));
    for (let k = 0; k < 300; k++) { pilot.handleInput(inp([], drive)); pilot.update(1 / 60); }
    assert.ok(Math.hypot(a.pos.x, a.pos.z) > 2, `${cls} travelled (${Math.hypot(a.pos.x, a.pos.z).toFixed(1)}u)`);
    assert.ok(Math.abs(p.pos.x - a.pos.x) < 1 && Math.abs(p.pos.z - a.pos.z) < 1, 'the driver is seated in the vehicle');
    assert.ok(['x', 'y', 'z'].every(kk => Number.isFinite(a.pos[kk])), 'finite');
  });
}

test('fleetIntent maps each class to the right stepper fields', () => {
  assert.equal(fleetIntent('tracked', { fwd: 1, turn: 1, aimX: 1 }).turretX, 1);
  assert.equal(fleetIntent('mech', { fwd: 1, aimX: 1 }).powerOn, true);
  assert.equal(fleetIntent('rotor', { fwd: 1, lift: 1 }).on, true);
  assert.equal(fleetIntent('fixedwing', { throttle: 1, pitch: 1 }).pitch, 1);
});
