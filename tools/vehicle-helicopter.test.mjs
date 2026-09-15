// HELICOPTER GATE — story 8: an accessible third-person combat helicopter,
// not a cockpit sim. Proves headlessly: ascend/descend, forward/back, yaw,
// LATERAL translation, assisted hover (release the collective and the machine
// holds, no death-sink), momentum, landing to a grounded state, and the chin
// gun through the SAME mounted-weapon interface as the tank.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { VEHICLE_MOUNTS } from '../src/data/vehicle-mounts.js';
import { initVehicleState, driveActor } from '../src/engine/vehicle-pilot.js';
import { FleetPilot } from '../src/engine/fleet-pilot.js';

const DT = 1 / 60, env = VEHICLE_ENVELOPES.helicopter;
const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, copy(v) { Object.assign(this, { x: v.x, y: v.y, z: v.z }); return this; } });
function heli() {
  return { id: 'helicopter', name: 'helicopter', cls: 'rotor', env, motion: initVehicleState('rotor', 0), pos: { x: 0, y: 6, z: 0 }, wrapper: { position: vec(), rotation: { set() {} } }, bodyRadius: 10, bodyHeight: 12, groundOffset: 3, ready: true, occupant: null };
}
const flat = () => ({ ARENA: 60000, heightAt: () => 0, waterAt: () => false, cover: [] });
const fly = (a, i, n, w) => { for (let k = 0; k < n; k++) driveActor(a, { on: true, ...i }, DT, w); };

test('ascend, assisted hover, descend, land: the collective owns the axis', () => {
  const w = flat(), a = heli();
  fly(a, { lift: 1 }, Math.ceil(env.spool / DT) + 120, w);
  const climbed = a.pos.y;
  assert.ok(climbed > 30, `climbed on collective (${climbed.toFixed(0)}u)`);
  fly(a, { lift: 0 }, 90, w);                             // vertical rate eases out
  const settled = a.pos.y;
  fly(a, { lift: 0 }, 240, w);                            // hands off — assisted hover
  assert.ok(Math.abs(a.pos.y - settled) < 2, `HOVER HOLDS with the collective released (drift ${(a.pos.y - settled).toFixed(2)}u over 4s)`);
  fly(a, { lift: -1 }, 1200, w);
  assert.equal(a.grounded, true, 'descended all the way to a LANDING');
  assert.ok(Math.abs(a.pos.y - a.groundOffset) < 0.5, 'resting on the ground');
});

test('forward/back, yaw, and LATERAL translation are three separate channels', () => {
  const w = flat(), a = heli();
  fly(a, { lift: 1 }, Math.ceil(env.spool / DT) + 60, w);
  fly(a, { throttle: 1 }, 180, w);
  assert.ok(a.pos.z > 20, `forward along heading (+z at yaw 0: ${a.pos.z.toFixed(0)}u)`);
  const z0 = a.pos.z, x0 = a.pos.x;
  fly(a, { throttle: 0 }, 300, w);                        // momentum decays, no cliff-stop
  const coast = a.pos.z - z0;
  assert.ok(coast > 4, `MOMENTUM carries after input release (${coast.toFixed(1)}u)`);
  // pure strafe: x moves, heading unchanged
  const yaw0 = a.motion.yaw, x1 = a.pos.x;
  fly(a, { strafe: 1 }, 180, w);
  assert.ok(a.pos.x - x1 > 12, `lateral translation right (${(a.pos.x - x1).toFixed(1)}u)`);
  assert.equal(a.motion.yaw, yaw0, 'strafe does not turn the nose');
  assert.ok(a.motion.tiltZ < -0.02, 'banks INTO the strafe (presentation)');
  // yaw on the spot
  fly(a, { strafe: 0, steer: 1 }, 60, w);
  assert.ok(a.motion.yaw > yaw0 + 0.5, 'yaw channel turns the nose');
});

test('the chin gun fires through the SAME mounted-weapon interface as the tank', () => {
  const spec = VEHICLE_MOUNTS.helicopter;
  assert.equal(spec.bullet, true, 'rotary is a ballistic stream');
  const shots = [];
  const g = { world: flat(), paused: false, running: true, matchOver: false, hud: { feed() {} }, player: null, _fleetActors: [], projectiles: { spawnProjectile: (c, o) => shots.push({ c, o }) }, noise() {} };
  const p = { alive: true, team: 0, name: 'SOL', radius: 2, flying: false, moveDir: { x: 0, z: 0 }, slots: {}, pos: vec(), vel: { set() {} }, obj: { visible: true, position: vec() } };
  g.player = p;
  const a = heli(); a.pos = vec(); a.pos.y = 6; g._fleetActors = [a];
  const pilot = new FleetPilot(g);
  const inp = (mouseLeft) => ({ pressed: c => c === '_never', down: () => false, justPressed: { delete() {} }, mouse: { dx: 0, dy: 0, left: mouseLeft } });
  pilot.enter(a, p);
  for (let i = 0; i < 60; i++) { pilot.handleInput(inp(true)); pilot.update(DT); }
  assert.ok(shots.length >= 8, `rotary stream at the authored cycle (${shots.length} rounds in 1s)`);
  assert.equal(shots[0].o.bullet, true, 'ballistic rounds through the real projectile options');
  assert.equal(shots[0].c, p, 'attributed to the pilot');
  assert.ok(a.weapon.mag < spec.magazine, 'magazine drains');
});
