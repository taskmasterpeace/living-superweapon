// VEHICLE HULL GATE — story 5: the tank is a native finite-volume damage
// receiver (a moving cover record with onConstructHit/onShatter), never a
// scripted HP subtraction. Proves headlessly: the cover record is complete
// every frame (the transparent-to-gunfire trap), friendly fire rejects,
// disabled state, destruction (occupant damage through takeDamage, retire,
// audible), a REAL projectile from the game's own Projectiles system striking
// the hull, and a REAL shell from the tank's own gun destroying a target hull.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initVehicleState } from '../src/engine/vehicle-pilot.js';
import { VehicleHull, attachVehicleHull } from '../src/engine/vehicle-combat.js';
import { attachMount, fireVehicleWeapon } from '../src/engine/vehicle-weapons.js';
import { sessionOf, SEAT_DRIVER } from '../src/engine/vehicle-session.js';
import { Projectiles } from '../src/engine/projectiles.js';
import { Game } from '../src/engine/game.js';

function world() { return { cover: [], coverAll: [], heightAt: () => 0, waterAt: () => false, ARENA: 60000, refreshFogBoxes() {} }; }
function gameStub(w = world()) {
  return {
    world: w, entities: [], hud: { feed() {} }, news: null,
    audio: { boom() {}, blast() {}, hit() {}, zap() {}, impact() {}, gunshot() {}, soundLibrary: { play() {} } },
    particles: { burst() {}, spawn() {} },
    vfx: { borrowLight: () => null, returnLight() {}, flash() {}, explode() {}, impact() {}, scorch() {}, shockwave() {}, lightning() {} },
    scene: { add() {}, remove() {} },
    // PRODUCTION splash admission — the construct-hit loop is the real blast→hull path
    areaDamage(...args) { return Game.prototype.areaDamage.call(this, ...args); },
    friendlyFire: false, cityStats: {},
    damageBlock(c, amt, pos, src) { c.onShatter && c.hp - amt <= 0 ? (c.hp = 0, c.onShatter(this, c, src)) : (c.hp -= amt); },
    worldImpact() {}, later() {}, slowmo() {}, onHit() {},
    overlapShot: () => null, overlapFoe: () => null, canSee: () => true,
    noise() { (this._noises ??= []).push(1); },
    isFoe: (a, b) => !!b && a?.team !== b?.team,
    nearestFoe: () => null,
    _noises: [],
  };
}
function tank(w, over = {}) {
  return { id: 'tank', name: 'tank', cls: 'tracked', env: VEHICLE_ENVELOPES.tank, motion: initVehicleState('tracked', 0), pos: { x: 0, y: 0, z: 0 }, bodyRadius: 8, bodyHeight: 12, groundOffset: 0, ready: true, occupant: null, ...over };
}

test('the cover record is COMPLETE — r, h, top, bottom, hx/hz all live and ride the hull', () => {
  const g = gameStub(), a = tank(g.world), hull = attachVehicleHull(g, a);
  for (const k of ['x', 'z', 'hx', 'hz', 'r', 'top', 'bottom', 'h', 'y0']) assert.ok(Number.isFinite(hull.cover[k]), `cover.${k} finite`);
  a.pos.x = 50; a.pos.z = -20; a.pos.y = 3;
  hull.update(1 / 60);
  assert.equal(hull.cover.x, 50); assert.equal(hull.cover.z, -20);
  assert.equal(hull.cover.bottom, 3); assert.equal(hull.cover.top, 15);
  assert.equal(g.world.cover.includes(hull.cover), true, 'registered as world cover');
});

test('friendly fire rejects; hostile damage lands; disabled state below the threshold', () => {
  const g = gameStub(), a = tank(g.world), hull = attachVehicleHull(g, a);
  a.occupant = { team: 0 };
  assert.equal(hull.hit(50, { team: 0 }), 0, 'same-team shot rejected');
  assert.equal(hull.hit(50, { team: 1 }), 50, 'hostile shot lands');
  assert.equal(hull.cover.hp, hull.cover.maxHp - 50);
  hull.hit(hull.cover.maxHp - 50 - 40, { team: 1 });     // down to 40 (< 25% of 420)
  assert.equal(a.disabled, true, 'drivetrain damaged below the disabled threshold');
  assert.equal(hull.dead, false, 'still alive while hull remains');
});

test('destruction: occupant hurt through takeDamage with attribution, cover retired, heard', () => {
  const g = gameStub(), a = tank(g.world), hull = attachVehicleHull(g, a);
  const hits = [];
  const driver = { team: 0, alive: true, pos: { set() {} }, vel: { set() {} }, obj: { visible: false, position: { copy() {} } }, takeDamage(am, o) { hits.push({ am, o }); return am; }, slots: {} };
  const s = sessionOf(g, a); s.claim(SEAT_DRIVER, driver);
  const killer = { team: 1, name: 'RAGE' };
  hull.hit(hull.cover.maxHp, killer);
  assert.equal(hull.dead, true);
  assert.equal(a.destroyed, true);
  assert.equal(hits.length, 1, 'occupant took the loss as real damage');
  assert.equal(hits[0].o.src, killer, 'credited to the hull killer');
  assert.equal(g.world.cover.includes(hull.cover), false, 'cover retired from the world');
  assert.ok(g._noises.length > 0, 'the explosion is HEARD');
  s.tick();
  assert.equal(driver._fleetVehicle, null, 'session freed the occupant');
});

test('a REAL projectile from the game Projectiles system strikes the hull cover', () => {
  const w = world(), g = gameStub(w);
  const a = tank(w, { pos: { x: 0, y: 0, z: 40 }, team: 0 });
  const hull = attachVehicleHull(g, a);
  g.projectiles = new Projectiles(g);
  const shooter = { name: 'RAGE', team: 1, pos: new THREE.Vector3(0, 5, 0), powerBuff: 1, alive: true };
  g.projectiles.spawnProjectile(shooter, { pos: new THREE.Vector3(0, 6, 0), vel: new THREE.Vector3(0, 0, 120), damage: 30, radius: .5, blast: 2, power: .8, life: 2, grav: 0, dtype: 'physical' });
  const before = hull.cover.hp;
  for (let i = 0; i < 90; i++) { hull.update(1 / 60); g.projectiles.update(1 / 60, g); }
  assert.ok(hull.cover.hp < before, `hull took real projectile damage (${before} -> ${hull.cover.hp})`);
});

test('GATE A combat leg: the tank main gun destroys a hostile hull through the real pipeline', () => {
  const w = world(), g = gameStub(w);
  g.projectiles = new Projectiles(g);
  const shooterTank = tank(w, { pos: { x: 0, y: 0, z: 0 } });
  attachVehicleHull(g, shooterTank); attachMount(shooterTank);
  const targetTank = tank(w, { id: 'drone-tank', pos: { x: 0, y: 0, z: 120 }, team: 1 });
  const targetHull = attachVehicleHull(g, targetTank);
  const driver = { name: 'SOL', team: 0, powerBuff: 1, alive: true, pos: new THREE.Vector3() };
  shooterTank.occupant = driver;
  let shells = 0;
  for (let frame = 0; frame < 60 * 60 && !targetHull.dead; frame++) {
    shooterTank.weapon.update(1 / 60);
    if (shooterTank.weapon.canFire && fireVehicleWeapon(g, shooterTank, driver)) shells++;
    for (const actor of [shooterTank, targetTank]) actor.hull.update(1 / 60);
    g.projectiles.update(1 / 60, g);
  }
  assert.equal(targetHull.dead, true, `target hull destroyed by real shells (${shells} fired)`);
  assert.ok(shells >= 2 && shells <= 12, `took a believable number of shells (${shells})`);
  assert.equal(shooterTank.hull.dead, false, 'launchCover: the shooter never hit itself');
});
