// RETICLE TRUTH GATE — the crosshair marks the gun's ACTUAL impact solution:
// same muzzle, same direction, same obstacle geometry the shell flies
// through, own hull excluded. If the solver says a wall, a shell fired with
// identical state must land at that wall (proved against the real Projectiles
// system, not against the solver's own math).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initVehicleState } from '../src/engine/vehicle-pilot.js';
import { attachMount, muzzleWorld } from '../src/engine/vehicle-weapons.js';
import { attachVehicleHull } from '../src/engine/vehicle-combat.js';
import { reticleSolution } from '../src/engine/vehicle-reticle.js';
import { Projectiles } from '../src/engine/projectiles.js';

function world(cover = []) { return { cover, coverAll: [], heightAt: () => 0, waterAt: () => false, ARENA: 60000, refreshFogBoxes() {} }; }
function tank(w, over = {}) {
  const a = { id: 'tank', cls: 'tracked', env: VEHICLE_ENVELOPES.tank, motion: initVehicleState('tracked', 0), pos: { x: 0, y: 0, z: 0 }, bodyRadius: 8, bodyHeight: 12, team: 0, occupant: null, ...over };
  attachMount(a);
  return a;
}

test('the solution marks the wall the shell will actually hit — own hull never blocks it', () => {
  const wall = { x: 0, z: 120, hx: 30, hz: 4, top: 40, bottom: 0, h: 40, hp: 100, projectileShape: 'box' };
  const w = world([wall]);
  const g = { world: w };
  const a = tank(w);
  attachVehicleHull(g, a);                       // own hull cover registered in world.cover
  const sol = reticleSolution(w, a);
  assert.ok(sol, 'a solution exists');
  assert.equal(sol.kind, 'cover');
  assert.ok(Math.abs(sol.point.z - (120 - 4)) < 2, `marks the wall face (z ${sol.point.z.toFixed(1)})`);
  assert.ok(sol.point.z > 20, 'the OWN hull did not eat the ray at the muzzle');
});

test('no obstacle → the mark sits at the shell expiry range on the gun axis', () => {
  const w = world([]);
  const a = tank(w); a.motion.turretYaw = 0.5; a.motion.turretPitch = 0.2;
  const sol = reticleSolution(w, a);
  assert.equal(sol.kind, 'expiry', 'a gun pitched up over empty ground marks shell expiry');
  const { pos, dir } = muzzleWorld(a);
  const t = sol.range / (a.weapon.spec.speed * a.weapon.spec.life);
  assert.ok(Math.abs(sol.point.x - (pos.x + dir.x * a.weapon.spec.speed * a.weapon.spec.life * t)) < 1e-6, 'the mark lies ON the gun axis');
  assert.ok(sol.point.y > pos.y, 'pitched up: the mark climbs with the gun');
});

test('CANNOT LIE: a real shell fired with identical state lands where the mark said', () => {
  const wall = { x: 6, z: 200, hx: 40, hz: 5, top: 60, bottom: 0, h: 60, hp: 1e9, projectileShape: 'box' };
  const w = world([wall]);
  const g = {
    world: w, entities: [], scene: { add() {}, remove() {} }, hud: { feed() {} },
    particles: { burst() {}, spawn() {} }, vfx: { borrowLight: () => null, returnLight() {}, flash() {}, impactStar() {}, explode() {}, ring() {}, scorch() {}, shockwave() {}, lightning() {} },
    audio: { boom() {}, hit() {}, zap() {}, soundLibrary: { play() {} } },
    areaDamage() {}, worldImpact() {}, damageBlock() {}, noise() {}, onHit() {}, later() {},
    overlapShot: () => null, overlapFoe: () => null, isFoe: () => false,
  };
  const a = tank(w); a.motion.yaw = 0.05; a.motion.turretYaw = -0.02; a.motion.turretPitch = 0.05;
  const sol = reticleSolution(w, a);
  assert.equal(sol.kind, 'cover');
  g.projectiles = new Projectiles(g);
  const { pos, dir } = muzzleWorld(a);
  const s = a.weapon.spec;
  const pr = g.projectiles.spawnProjectile({ name: 'SOL', team: 0, powerBuff: 1, alive: true, pos: new THREE.Vector3() }, {
    pos: new THREE.Vector3(pos.x, pos.y, pos.z), vel: new THREE.Vector3(dir.x, dir.y, dir.z).multiplyScalar(s.speed),
    damage: s.damage, radius: s.radius, blast: s.blast, power: s.power, life: s.life, grav: 0, dtype: 'physical',
  });
  let impact = null;
  for (let i = 0; i < 60 * 5 && !impact; i++) {
    g.projectiles.update(1 / 60, g);
    if (pr.dead) impact = { x: pr.pos.x, y: pr.pos.y, z: pr.pos.z };
  }
  assert.ok(impact, 'the shell resolved');
  const err = Math.hypot(impact.x - sol.point.x, impact.z - sol.point.z);
  assert.ok(err < 6, `shell landed where the reticle pointed (${err.toFixed(2)}u apart)`);
});

