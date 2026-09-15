// GENERIC VEHICLE PILOT GATE — one driver moves EVERY motion class. Proves the
// "everything drives through one system" contract headlessly: build a stub actor per
// class from a real envelope, drive it on flat ground, assert it moves, poses, and
// never NaNs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { driveActor, initVehicleState, poseFor } from '../src/engine/vehicle-pilot.js';

function wrap() { return { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, rotation: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } }; }
function world() { return { ARENA: 6000, heightAt: () => 0, waterAt: () => false, cover: [] }; }
function actor(envId) {
  const e = VEHICLE_ENVELOPES[envId], cls = e.cls, air = cls === 'fixedwing' || cls === 'rotor';
  return { cls, env: e, motion: initVehicleState(cls, 0), pos: { x: 0, y: air ? 6 : 2, z: 0 }, wrapper: wrap(), bodyRadius: 8, groundOffset: air ? 6 : 2 };
}
const drive = (a, intent, n, w) => { for (let k = 0; k < n; k++) driveActor(a, intent, 1 / 60, w); };
const moved = a => Math.hypot(a.pos.x, a.pos.z);
const finite = a => ['x', 'y', 'z'].every(k => Number.isFinite(a.pos[k])) && Object.values(a.motion).every(v => typeof v === 'boolean' || Number.isFinite(v));

const CASES = [
  ['fixedwing', 'jet-a', { throttle: 1 }],
  ['rotor', 'helicopter', { throttle: 1, lift: 1, on: true }],
  ['wheeled', 'humvee', { throttle: 1 }],
  ['tracked', 'tank', { throttle: 1, turretX: 1 }],
  ['hover', 'hover-transport', { throttle: 1 }],
  ['mech', 'mech-medium', { throttle: 1, powerOn: true }],
  ['ship', 'aircraft-carrier', { throttle: 1 }],
];

for (const [cls, envId, intent] of CASES) {
  test(`${cls} (${envId}) drives through the generic pilot: moves, poses, stays finite`, () => {
    const w = world(), a = actor(envId);
    drive(a, intent, 360, w);
    assert.ok(finite(a), `${cls} state is finite`);
    assert.ok(moved(a) > 2, `${cls} travels forward (${moved(a).toFixed(1)}u)`);
    const p = poseFor(cls, a.motion);
    assert.ok(Number.isFinite(p.rx) && Number.isFinite(p.ry) && Number.isFinite(p.rz), `${cls} pose finite`);
    assert.ok(a.wrapper.position.x === a.pos.x && a.wrapper.rotation.y === p.ry, `${cls} model transform written`);
  });
}

test('AIR: a jet climbs when it pitches up; a helicopter climbs on collective', () => {
  const w = world();
  const jet = actor('jet-a'); drive(jet, { throttle: 1 }, 300, w); const jy = jet.pos.y;
  drive(jet, { throttle: 1, pitch: 1 }, 180, w);
  assert.ok(jet.pos.y > jy + 15, `jet climbs (${(jet.pos.y - jy).toFixed(0)}u)`);
  const heli = actor('helicopter'); const hy = heli.pos.y;
  drive(heli, { throttle: 0, lift: 1, on: true }, 180, w);
  assert.ok(heli.pos.y > hy + 8, `heli climbs on collective (${(heli.pos.y - hy).toFixed(0)}u)`);
});

test('GROUND: a wheeled vehicle follows the terrain height (rides on the ground)', () => {
  const w = { ARENA: 6000, heightAt: (x, z) => z * 0.05, waterAt: () => false, cover: [] };
  const jeep = actor('humvee'); drive(jeep, { throttle: 1 }, 240, w);
  const expected = w.heightAt(jeep.pos.x, jeep.pos.z) + jeep.groundOffset;
  assert.ok(Math.abs(jeep.pos.y - expected) < 0.5, `sits on the ground (y ${jeep.pos.y.toFixed(1)} vs ${expected.toFixed(1)})`);
});

test('TRACKED: the turret slews while the generic pilot drives the hull', () => {
  const w = world(), tank = actor('tank');
  drive(tank, { throttle: 1, turretX: 1 }, 120, w);
  assert.ok(tank.motion.turretYaw > 0.5, `turret slews independently (${tank.motion.turretYaw.toFixed(2)} rad)`);
});

test('COVER stops a ground vehicle (swept collision, no tunneling)', () => {
  const w = { ARENA: 6000, heightAt: () => 0, waterAt: () => false, cover: [{ x: 0, z: 40, hx: 10, hz: 4, top: 20, hp: 100 }] };
  const jeep = actor('humvee'); drive(jeep, { throttle: 1 }, 300, w);
  assert.ok(jeep.pos.z < 40, `stopped before the wall at z=40 (reached ${jeep.pos.z.toFixed(1)})`);
});

test('GIANT platforms ride OVER the scatter — a rock never stops a carrier/mothership', () => {
  const wall = () => ({ ARENA: 6000, heightAt: () => 0, waterAt: () => false, cover: [{ x: 0, z: 30, hx: 10, hz: 4, top: 20, hp: 100 }] });
  const blocked = actor('humvee'); drive(blocked, { throttle: 1 }, 300, wall());
  assert.ok(blocked.pos.z < 30, `a normal vehicle is stopped by the wall (reached ${blocked.pos.z.toFixed(1)})`);
  const giant = actor('humvee'); giant.giant = true; drive(giant, { throttle: 1 }, 300, wall());
  assert.ok(giant.pos.z > 35, `a giant rides straight through it (reached ${giant.pos.z.toFixed(1)})`);
});
