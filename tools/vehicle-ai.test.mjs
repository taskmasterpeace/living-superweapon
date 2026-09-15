// AI VEHICLE OPERATOR GATE — story 6: an AI tank that drives, aims and fires
// through the SAME legal paths the player uses. Proves headlessly: the crew
// claims the seat through the session (source 'ai'); it drives only through
// driveActor (envelope-bounded yaw/speed); it perceives only what it can SEE
// (honesty), pays a real acquisition delay, fires through fireVehicleWeapon
// (same ammo/reload/attribution), backs off when its drivetrain is mauled,
// and releases the seat when the hull dies. No mesh translation, no scripted
// damage, anywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initVehicleState } from '../src/engine/vehicle-pilot.js';
import { VehicleOperator } from '../src/engine/vehicle-ai.js';
import { attachVehicleHull } from '../src/engine/vehicle-combat.js';
import { SEAT_DRIVER } from '../src/engine/vehicle-session.js';

const DT = 1 / 60;
function world() { return { cover: [], coverAll: [], heightAt: () => 0, waterAt: () => false, ARENA: 60000, refreshFogBoxes() {} }; }
function gameStub() {
  const shots = [];
  return {
    shots, world: world(), entities: [], _fleetActors: [], hud: { feed() {} },
    projectiles: { spawnProjectile: (c, o) => shots.push({ c, o }) },
    particles: { burst() {} }, audio: { soundLibrary: { play() {} } }, noise() {},
    isFoe: (a, b) => !!b?.alive && a.team !== b.team,
    canSee: (a, b) => !b._hidden,
  };
}
function aiTank(g, over = {}) {
  const a = { id: 'tank', name: 'tank', cls: 'tracked', env: VEHICLE_ENVELOPES.tank, motion: initVehicleState('tracked', 0), pos: { x: 0, y: 0, z: 0 }, bodyRadius: 8, bodyHeight: 12, groundOffset: 0, ready: true, occupant: null, ...over };
  attachVehicleHull(g, a);
  g._fleetActors.push(a);
  a.operator = new VehicleOperator(g, a, { team: 1 });
  return a;
}
const foe = (x, z, over = {}) => ({ alive: true, team: 0, pos: { x, y: 0, z }, ...over });

test('the crew claims the seat through the session, source ai; hull answers to the crew team', () => {
  const g = gameStub(), a = aiTank(g);
  assert.equal(a.operator.retired, false);
  assert.equal(a.occupant, a.operator.crew, 'crew holds the driver seat');
  assert.equal(a.session.sourceOf(SEAT_DRIVER), 'ai');
  assert.equal(a.hull.team(), 1, 'hull team = crew team');
});

test('drive → turn → acquire → aim → fire, all through the legal paths', () => {
  const g = gameStub(), a = aiTank(g);
  g.entities.push(foe(60, 400));                              // far outside gun range and off-axis: it must DRIVE and TURN
  let maxYawStep = 0, prevYaw = 0;
  for (let i = 0; i < 60 * 40 && !g.shots.length; i++) {
    a.hull.update(DT); a.operator.update(DT);
    maxYawStep = Math.max(maxYawStep, Math.abs(a.motion.yaw - prevYaw)); prevYaw = a.motion.yaw;
  }
  assert.ok(g.shots.length >= 1, 'the AI tank FIRED a real shell');
  assert.equal(g.shots[0].c, a.operator.crew, 'attributed to the crew');
  assert.ok(a.weapon.mag + a.weapon.reserve < 21, 'ammo actually spent from the shared MountedWeapon');
  assert.ok(Math.hypot(a.pos.x, a.pos.z) > 100, `it DROVE toward the target (${Math.hypot(a.pos.x, a.pos.z).toFixed(0)}u)`);
  assert.ok(maxYawStep <= VEHICLE_ENVELOPES.tank.pivot * DT + 1e-6, `hull turn stayed inside the envelope (${(maxYawStep / DT).toFixed(2)} rad/s)`);
  assert.ok(Math.abs(a.motion.speed) <= VEHICLE_ENVELOPES.tank.top + 1e-6, 'speed stayed inside the envelope');
});

test('honesty: a target it cannot SEE is never engaged', () => {
  const g = gameStub(), a = aiTank(g);
  g.entities.push(foe(0, 120, { _hidden: true }));
  for (let i = 0; i < 60 * 10; i++) { a.hull.update(DT); a.operator.update(DT); }
  assert.equal(g.shots.length, 0, 'no shells at an unseen target');
  assert.equal(a.operator.target, null, 'no belief without sight');
});

test('acquisition is a real delay — no instant snap-shot', () => {
  const g = gameStub(), a = aiTank(g);
  a.motion.turretYaw = 0;                                     // gun already on the axis
  g.entities.push(foe(0, 100));
  let framesToShot = 0;
  for (let i = 0; i < 60 * 20 && !g.shots.length; i++) { a.hull.update(DT); a.operator.update(DT); framesToShot++; }
  assert.ok(g.shots.length >= 1, 'fired eventually');
  assert.ok(framesToShot >= Math.floor(1.2 / DT), `paid the acquisition delay (${(framesToShot * DT).toFixed(2)}s >= 1.2s)`);
});

test('damage response: a mauled drivetrain disengages away from the threat', () => {
  const g = gameStub(), a = aiTank(g);
  g.entities.push(foe(0, 90));
  for (let i = 0; i < 120; i++) { a.hull.update(DT); a.operator.update(DT); }   // engage first
  a.hull.hit(a.hull.cover.maxHp * 0.8, { team: 0 });          // maul it (below the disabled line)
  assert.equal(a.disabled, true);
  const before = Math.hypot(a.pos.x - 0, a.pos.z - 90);
  for (let i = 0; i < 60 * 6; i++) { a.hull.update(DT); a.operator.update(DT); }
  const after = Math.hypot(a.pos.x - 0, a.pos.z - 90);
  assert.ok(after > before + 5, `backed away while disabled (${before.toFixed(0)} -> ${after.toFixed(0)}u)`);
});

test('hull death releases the seat and stops the operator', () => {
  const g = gameStub(), a = aiTank(g), op = a.operator;
  a.hull.hit(a.hull.cover.maxHp, { team: 0 });
  op.update(DT);
  assert.equal(op.retired, true);
  assert.equal(a.operator, null, 'operator detached');
  assert.equal(a.occupant, null, 'seat released');
});
