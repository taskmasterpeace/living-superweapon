// MOUNTED WEAPON GATE — story 4: tank firing / ammunition / reload through the
// game's own projectile system. Proves headlessly: the ammo state machine
// (magazine, cycle, auto+manual reload, depletion), the ONE fire path (muzzle
// truth, hull-velocity inheritance, launchCover, recoil, audible report via
// game.noise), and the FleetPilot LMB wiring with real fire-rate consequences.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { VEHICLE_MOUNTS } from '../src/data/vehicle-mounts.js';
import { initVehicleState } from '../src/engine/vehicle-pilot.js';
import { MountedWeapon, fireVehicleWeapon, muzzleWorld, attachMount } from '../src/engine/vehicle-weapons.js';
import { FleetPilot } from '../src/engine/fleet-pilot.js';

const DT = 1 / 60, tankSpec = VEHICLE_MOUNTS.tank;

test('ammo state machine: magazine, cycle, auto-reload, manual reload, depletion', () => {
  const w = new MountedWeapon({ ...tankSpec, magazine: 2, reserve: 3, cycleS: .5, reloadS: 2 });
  assert.equal(w.fire(), true); assert.equal(w.mag, 1);
  assert.equal(w.fire(), false, 'cycle gate holds');
  w.update(.6);
  assert.equal(w.fire(), true, 'cycle expired');
  assert.equal(w.mag, 0); assert.ok(w.reloading, 'auto-reload started on empty mag');
  assert.equal(w.fire(), false, 'cannot fire during reload');
  w.update(2.1);
  assert.equal(w.mag, 2); assert.equal(w.reserve, 1, 'reload took from reserve');
  // manual reload returns the partial mag to reserve
  w.fire(); w.update(.6);
  assert.equal(w.reloadNow(), true);
  assert.equal(w.mag, 0); assert.equal(w.reserve, 2);
  w.update(2.1);
  assert.equal(w.mag, 2); assert.equal(w.reserve, 0);
  // depletion: burn everything → DRY refuses forever
  w.fire(); w.update(.6); w.fire(); w.update(9);
  assert.equal(w.dry, true);
  assert.equal(w.fire(), false, 'a dry weapon refuses');
  assert.match(w.ammoLine(), /DRY/);
});

function armedTank() {
  const a = { id: 'tank', cls: 'tracked', env: VEHICLE_ENVELOPES.tank, motion: initVehicleState('tracked', 0.3), pos: { x: 5, y: 1, z: 9 }, bodyRadius: 8, bodyHeight: 12, cover: { tag: 'hull' } };
  a.motion.speed = 10; a.motion.vx = Math.sin(0.3) * 10; a.motion.vz = Math.cos(0.3) * 10;
  a.motion.turretYaw = 0.4; a.motion.turretPitch = 0.15;
  attachMount(a);
  return a;
}
function recorder() {
  const shots = [], noises = [];
  return { shots, noises, game: { projectiles: { spawnProjectile: (caster, o) => shots.push({ caster, o }) }, noise: (p, l, s) => noises.push({ p, l, s }), hud: { feed() {} } } };
}

test('the one fire path: muzzle truth, hull velocity inheritance, launchCover, recoil, heard', () => {
  const a = armedTank(), { shots, noises, game } = recorder(), caster = { name: 'SOL', team: 0 };
  assert.equal(fireVehicleWeapon(game, a, caster), true);
  assert.equal(shots.length, 1);
  const { caster: c, o } = shots[0];
  assert.equal(c, caster, 'the occupant IS the attribution source');
  const truth = muzzleWorld(a);
  assert.ok(Math.abs(o.pos.x - truth.pos.x) < 1e-9 && Math.abs(o.pos.y - truth.pos.y) < 1e-9, 'round leaves the real muzzle');
  // velocity = muzzle dir * speed + hull velocity
  const expect = { x: truth.dir.x * tankSpec.speed + a.motion.vx, z: truth.dir.z * tankSpec.speed + a.motion.vz };
  assert.ok(Math.abs(o.vel.x - expect.x) < 1e-6 && Math.abs(o.vel.z - expect.z) < 1e-6, 'shell inherits hull velocity');
  assert.equal(o.launchCover, a.cover, 'cannot hit its own hull');
  assert.equal(o.damage, tankSpec.damage); assert.equal(o.blast, tankSpec.blast);
  assert.ok(a.recoilT > 0, 'recoil armed');
  assert.ok(a.motion.speed < 10, `hull nudged against the shot (${a.motion.speed.toFixed(2)})`);
  assert.equal(noises.length, 1, 'the shot is HEARD');
  // a second immediate shot refuses (single-shell magazine → reload)
  assert.equal(fireVehicleWeapon(game, a, caster), false);
  assert.ok(a.weapon.reloading, 'main gun reloading after the shell');
});

test('no caster, no round — a driverless mount cannot fire', () => {
  const a = armedTank(), { shots, game } = recorder();
  assert.equal(fireVehicleWeapon(game, a, null), false);
  assert.equal(shots.length, 0);
  assert.equal(a.weapon.mag, 1, 'no ammo spent on a refused fire');
});

// ---- FleetPilot LMB wiring ----
const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, copy(v) { Object.assign(this, { x: v.x, y: v.y, z: v.z }); return this; } });
function rig() {
  const p = { alive: true, team: 0, name: 'SOL', radius: 2, flying: false, moveDir: { x: 0, z: 0 }, slots: {}, pos: vec(), vel: { set() {} }, obj: { visible: true, position: vec() } };
  const a = { id: 'tank', name: 'tank', cls: 'tracked', env: VEHICLE_ENVELOPES.tank, motion: initVehicleState('tracked', 0), pos: vec(), wrapper: { position: vec(), rotation: { set() {} } }, bodyRadius: 10, bodyHeight: 12, groundOffset: 2, ready: true, occupant: null };
  const shots = [];
  const world = { ARENA: 6000, heightAt: () => 0, waterAt: () => false, cover: [], _lookSens: .0024 };
  const game = { player: p, world, paused: false, running: true, matchOver: false, hud: { feed() {} }, _fleetActors: [a], projectiles: { spawnProjectile: (c, o) => shots.push({ c, o }) }, noise() {} };
  return { pilot: new FleetPilot(game), p, a, shots };
}
const inp = (pressed = [], down = [], mouse = { dx: 0, dy: 0, left: false }) => ({ pressed: c => pressed.includes(c), down: c => down.includes(c), justPressed: { delete() {} }, mouse });

test('LMB fires the main gun through the pilot: one shell, ammo down, reload, then the next', () => {
  const { pilot, a, shots } = rig();
  pilot.handleInput(inp(['KeyJ']));
  const startTotal = VEHICLE_MOUNTS.tank.magazine + VEHICLE_MOUNTS.tank.reserve;
  for (let i = 0; i < 30; i++) { pilot.handleInput(inp([], [], { dx: 0, dy: 0, left: true })); pilot.update(DT); }
  assert.equal(shots.length, 1, 'holding fire lands exactly ONE shell before the reload');
  assert.equal(shots[0].c, a.occupant, 'attributed to the seated player');
  assert.ok(a.weapon.reloading, 'reload running');
  // ride out the reload, still holding fire → the second shell leaves
  for (let i = 0; i < Math.ceil((VEHICLE_MOUNTS.tank.reloadS + .3) / DT); i++) { pilot.handleInput(inp([], [], { dx: 0, dy: 0, left: true })); pilot.update(DT); }
  assert.equal(shots.length, 2, 'second shell after reload timing');
  assert.equal(a.weapon.mag + a.weapon.reserve, startTotal - 2, 'total rounds down by exactly the shells fired');
});
