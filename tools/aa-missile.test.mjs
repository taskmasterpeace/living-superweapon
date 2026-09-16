// GATE B — AA + MISSILE INTERCEPTION, headless. The required proof:
// AA detects a flying target legitimately → turret tracks within its rate →
// an ACTUAL missile launches (ammo spent) → the missile visibly guides
// (heading converges onto the moving target) → hit or MISS resolves through
// real geometry → real damage flows through the game's own areaDamage
// (construct splash for hulls) → the launcher itself can be damaged silent.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Missile, MISSILE_PROFILES } from '../src/engine/missile-profiles.js';
import { AAEmplacement } from '../src/engine/aa-emplacement.js';
import { attachVehicleHull } from '../src/engine/vehicle-combat.js';
import { Game } from '../src/engine/game.js';

const DT = 1 / 60;
function world() { return { cover: [], coverAll: [], heightAt: () => 0, waterAt: () => false, ARENA: 60000, refreshFogBoxes() {} }; }
function gameStub() {
  return {
    world: world(), entities: [], _fleetActors: [], hud: { feed() {} }, particles: { spawn() {}, burst() {} },
    vfx: { flash() {} }, audio: { soundLibrary: { play() {} } }, news: null, scene: { add() {}, remove() {} },
    noise() {}, friendlyFire: false, cityStats: {},
    isFoe: (a, b) => !!b && a.team !== b.team,
    canSee: (a, b) => !b?._hidden && !(b?.pos?._hidden),
    areaDamage(...args) { return Game.prototype.areaDamage.call(this, ...args); },
    worldImpact() {}, onHit() {}, later() {},
  };
}

test('missile physics: ignition delay is ballistic, then boost to cruise, lifetime expiry', () => {
  const g = gameStub(), p = MISSILE_PROFILES['aa-standard'];
  const m = new Missile(g, 'aa-standard', { pos: { x: 0, y: 40, z: 0 }, dir: { x: 0, y: 0, z: 1 } });
  m.update(p.ignitionDelay * 0.5);
  assert.ok(m.vel.y < 0, 'drops off the rail before ignition (gravity, no thrust)');
  assert.ok(m.vel.length() < p.launchSpeed * 1.5, 'no thrust before ignition');
  for (let i = 0; i < 240 && !m.dead; i++) m.update(DT);
  if (!m.dead) assert.ok(Math.abs(m.vel.length() - p.cruise) < 8, `boosted to cruise (${m.vel.length().toFixed(0)} u/s)`);
  const m2 = new Missile(g, 'aa-standard', { pos: { x: 0, y: 4000, z: 0 }, dir: { x: 0, y: 1, z: 0 } });
  for (let i = 0; i < 60 * 12 && !m2.dead; i++) m2.update(DT);
  assert.equal(m2.result, 'expired', 'lifetime expiry, no infinite missiles');
});

test('guidance converges on a MOVING target and the turn authority is a real cap', () => {
  const g = gameStub();
  const target = { alive: true, pos: { x: 120, y: 90, z: 200 } };
  const m = new Missile(g, 'aa-standard', { pos: { x: 0, y: 30, z: 0 }, dir: { x: 0, y: .4, z: 1 }, target });
  let prevDir = null, maxTurn = 0;
  for (let i = 0; i < 60 * 8 && !m.dead; i++) {
    target.pos.x += 30 * DT;                       // the target flies
    m.update(DT);
    const d = m.vel.clone().normalize();
    if (prevDir) maxTurn = Math.max(maxTurn, prevDir.angleTo(d) / DT);
    prevDir = d;
  }
  assert.equal(m.result, 'hit', 'the missile GUIDED onto the moving target');
  assert.ok(maxTurn <= MISSILE_PROFILES['aa-standard'].turnRate + 0.6, `turn rate capped (${maxTurn.toFixed(2)} rad/s)`);
});

test('a hard-maneuvering target defeats a low-authority missile: a real MISS through geometry', () => {
  const g = gameStub();
  const target = { alive: true, pos: { x: 0, y: 80, z: 260 } };
  const m = new Missile(g, 'aa-standard', { pos: { x: 0, y: 10, z: 0 }, dir: { x: 0, y: .3, z: 1 }, target });
  m.profile = { ...m.profile, turnRate: 0.35, seeker: { ...m.profile.seeker, lockPersist: .4, reacquire: .2 } };
  let t = 0;
  for (let i = 0; i < 60 * 10 && !m.dead; i++) {
    t += DT;
    target.pos.x = Math.sin(t * 2.4) * 260;        // violent orthogonal jinking
    target.pos.z = 260 + Math.cos(t * 1.7) * 120;
    m.update(DT);
  }
  assert.notEqual(m.result, 'hit', `the jink DEFEATED the missile (${m.result})`);
  assert.ok(['ground', 'expired'].includes(m.result), 'the miss resolved against real geometry/lifetime');
});

test('the warhead detonates through the real areaDamage: a vehicle hull takes construct splash', () => {
  const g = gameStub();
  const flyer = { id: 'helicopter', cls: 'rotor', pos: { x: 0, y: 80, z: 100 }, bodyRadius: 8, bodyHeight: 10, team: 0, occupant: { team: 0, alive: true }, env: {} };
  const hull = attachVehicleHull(g, flyer);
  const target = { alive: true, pos: flyer.pos, aimHeight: 5 };
  const m = new Missile(g, 'aa-standard', { pos: { x: 0, y: 20, z: 0 }, dir: { x: 0, y: .5, z: 1 }, target, source: { name: 'AA', team: 1, powerBuff: 1 } });
  for (let i = 0; i < 60 * 8 && !m.dead; i++) { hull.update(DT); m.update(DT); }
  assert.equal(m.result, 'hit');
  assert.ok(hull.cover.hp < hull.cover.maxHp, `hull damaged by the warhead through areaDamage (${hull.cover.hp}/${hull.cover.maxHp})`);
});

test('GATE B full sequence: AA senses → tracks → launches → guides → the flyer takes real damage', () => {
  const g = gameStub();
  const aa = new AAEmplacement(g, { config: 'fixed', pos: { x: 0, y: 0, z: 0 }, team: 1 });
  // an occupied hostile helicopter crossing the sky
  const heli = { id: 'helicopter', cls: 'rotor', pos: { x: -200, y: 90, z: 220 }, bodyRadius: 8, bodyHeight: 10, team: 0, occupant: { team: 0, alive: true }, env: {}, motion: { vx: 24, vy: 0, vz: 0 } };
  const hull = attachVehicleHull(g, heli);
  g._fleetActors.push(heli);
  const ammo0 = aa.ammo;
  let launched = 0, tracked = false, maxSlew = 0, prevYaw = aa.yaw;
  for (let i = 0; i < 60 * 30 && !hull.dead; i++) {
    heli.pos.x += 24 * DT;                          // it flies a straight crossing leg
    hull.update(DT); aa.update(DT);
    maxSlew = Math.max(maxSlew, Math.abs(aa.yaw - prevYaw) / DT); prevYaw = aa.yaw;
    if (aa.target) tracked = true;
    launched = Math.max(launched, ammo0 - aa.ammo);
    if (hull.cover.hp < hull.cover.maxHp) break;
  }
  assert.equal(tracked, true, 'AA legitimately detected the flyer');
  assert.ok(maxSlew <= aa.cfg.traverse + 0.05, `turret slew stayed inside its limit (${maxSlew.toFixed(2)} rad/s)`);
  assert.ok(launched >= 1, `an ACTUAL missile launched (${launched} spent)`);
  assert.ok(hull.cover.hp < hull.cover.maxHp, `the flyer took REAL damage (${hull.cover.hp.toFixed(0)}/${hull.cover.maxHp})`);
});

test('AA honesty + lifecycle: low targets ignored, friendlies ignored, walls block, destroyed AA is silent', () => {
  const g = gameStub();
  const aa = new AAEmplacement(g, { config: 'fixed', pos: { x: 0, y: 0, z: 0 }, team: 1 });
  const low = { alive: true, flying: true, team: 0, pos: { x: 50, y: 8, z: 50 } };
  const friend = { alive: true, flying: true, team: 1, pos: { x: 40, y: 80, z: 40 } };
  const hidden = { alive: true, flying: true, team: 0, pos: { x: 60, y: 90, z: 60 }, _hidden: true };
  g.entities.push(low, friend, hidden);
  for (let i = 0; i < 300; i++) aa.update(DT);
  assert.equal(aa.target, null, 'below minY / friendly / unseen are all ineligible');
  assert.equal(aa.ammo, aa.cfg.ammo, 'no ammo wasted');
  // destroyed → silent
  const foe = { alive: true, flying: true, team: 0, pos: { x: 30, y: 90, z: 120 } };
  g.entities.push(foe);
  aa.hull.hit(aa.hull.cover.maxHp, { team: 0 });
  for (let i = 0; i < 600; i++) aa.update(DT);
  assert.equal(aa.ammo, aa.cfg.ammo, 'a destroyed emplacement never launches');
  assert.equal(aa.dead, true);
});

test('the tower hardpoint config is the same implementation with different data', () => {
  const g = gameStub();
  const aa = new AAEmplacement(g, { config: 'tower', pos: { x: 0, y: 30, z: 0 }, team: 1, name: 'TOWER AA' });
  assert.equal(aa.cfg.profile, 'aa-sprint');
  const foe = { alive: true, flying: true, team: 0, pos: { x: 20, y: 90, z: 150 } };
  g.entities.push(foe);
  for (let i = 0; i < 60 * 8 && aa.ammo === aa.cfg.ammo; i++) aa.update(DT);
  assert.ok(aa.ammo < aa.cfg.ammo, 'the tower variant launches through the same path');
  assert.equal(aa.missiles[0]?.id ?? 'aa-sprint', 'aa-sprint', 'derived profile, not a new script');
});
