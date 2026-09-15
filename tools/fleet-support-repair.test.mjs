// THE SUPPORT CONTRACT REPAIR GATE — the fleet contact/support adapter
// (vehicle-pilot.js driveActor) used to FIGHT the wheeled stepper: it fed the
// stepper a wheelbase-averaged ground height, then pinned pos.y to a point
// sample, so on any sloped ground the stepper believed it was airborne for a
// large fraction of frames (no drive force, no grip) while the adapter reported
// grounded=true — and the stepper's whole authored air branch (VEHICLE_GRAV,
// airSteer, hard-landing scrub, the motocross barrel roll) was unreachable
// because pos.y was hard-set to the terrain every frame.
//
// This suite pins the repaired contract:
//   1. one ground number — the height the adapter enforces IS the height the
//      stepper reasons about (no phantom-airborne thrash on rolling ground);
//   2. the air branch is REAL — a bike off a cliff flies a ballistic arc and lands;
//   3. hover rides its authored cushion (hoverH + bob), not flush on the dirt;
//   4. a glancing wall contact SLIDES, only a head-on is a full stop;
//   5. the other ground classes still terrain-follow exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { driveActor, initVehicleState } from '../src/engine/vehicle-pilot.js';

function wrap() { return { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, rotation: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } }; }
function flat() { return { ARENA: 60000, heightAt: () => 0, waterAt: () => false, cover: [] }; }
function actor(envId, over = {}) {
  const e = VEHICLE_ENVELOPES[envId], cls = e.cls;
  return { cls, env: e, motion: initVehicleState(cls, 0), pos: { x: 0, y: 0, z: 0 }, wrapper: wrap(), bodyRadius: 4, groundOffset: 1.5, ...over };
}
const DT = 1 / 60;

test('one ground number: rolling hills no longer make the wheeled stepper thrash airborne', () => {
  // sin(z*0.05)*6 — the measured failure ground: the old adapter produced 43%
  // phantom-airborne frames here; only genuine crest launches should remain.
  const w = { ARENA: 60000, heightAt: (x, z) => Math.sin(z * 0.05) * 6, waterAt: () => false, cover: [] };
  const a = actor('humvee');   // humvee tops at 47 — slow enough that no crest is a real launch
  let airFrames = 0, frames = 600;
  for (let i = 0; i < frames; i++) { driveActor(a, { throttle: 1 }, DT, w); if (a.motion.air) airFrames++; }
  assert.ok(airFrames / frames < 0.06, `phantom airborne fraction ${(100 * airFrames / frames).toFixed(1)}% (was 42.8%)`);
  // and the drive force actually reached the ground: it holds near top speed
  assert.ok(a.motion.speed > VEHICLE_ENVELOPES.humvee.top * 0.7, `holds speed on rolling ground (${a.motion.speed.toFixed(1)} u/s)`);
});

test('the enforced height and the stepper height are the SAME number', () => {
  const w = { ARENA: 60000, heightAt: (x, z) => Math.sin(z * 0.07) * 4 + z * 0.01, waterAt: () => false, cover: [] };
  const a = actor('humvee');
  for (let i = 0; i < 300; i++) {
    driveActor(a, { throttle: 1 }, DT, w);
    assert.ok(Math.abs(a.pos.y - (a.motion.y + a.groundOffset)) < 1e-9, `pos.y == m.y + off at frame ${i}`);
  }
});

test('the air branch is REAL: a motorcycle off a cliff flies a ballistic arc and lands', () => {
  const CLIFF = 120, DROP = 40;
  const w = { ARENA: 60000, heightAt: (x, z) => z > CLIFF ? -DROP : 0, waterAt: () => false, cover: [] };
  const a = actor('motorcycle');
  let airFrames = 0, sawFallingVy = false, maxY = -Infinity;
  for (let i = 0; i < 900; i++) {
    driveActor(a, { throttle: 1 }, DT, w);
    if (a.motion.air) { airFrames++; if (a.motion.vy < -5) sawFallingVy = true; maxY = Math.max(maxY, a.motion.y); }
  }
  assert.ok(airFrames > 5, `real airtime off the cliff (${airFrames} frames; the old adapter gave 0)`);
  assert.ok(sawFallingVy, 'gravity pulled vy negative during the arc');
  assert.equal(a.motion.air, false, 'it LANDED');
  assert.ok(Math.abs(a.pos.y - (-DROP + a.groundOffset)) < 0.6, `rests on the lower ground (y ${a.pos.y.toFixed(2)})`);
  assert.equal(a.grounded, true, 'grounded flag honest after landing');
});

test('grounded flag is honest DURING the arc', () => {
  const w = { ARENA: 60000, heightAt: (x, z) => z > 60 ? -50 : 0, waterAt: () => false, cover: [] };
  const a = actor('motorcycle');
  let sawAirUngrounded = false;
  for (let i = 0; i < 600; i++) {
    driveActor(a, { throttle: 1 }, DT, w);
    if (a.motion.air) { assert.equal(a.grounded, false, 'grounded=false while airborne'); sawAirUngrounded = true; }
  }
  assert.ok(sawAirUngrounded, 'the arc actually happened');
});

test('spawn on high or low ground never opens with a phantom fall', () => {
  const w = { ARENA: 60000, heightAt: () => 33, waterAt: () => false, cover: [] };
  const a = actor('motorcycle');
  driveActor(a, { throttle: 0 }, DT, w);
  assert.equal(a.motion.air, false, 'seeded onto the terrain, not falling from y=0');
  assert.ok(Math.abs(a.pos.y - (33 + a.groundOffset)) < 1e-6, `sits at terrain height (${a.pos.y})`);
});

test('hover rides its authored cushion, not flush on the dirt', () => {
  const w = flat(), a = actor('hover-transport');
  for (let i = 0; i < 240; i++) driveActor(a, { throttle: 1 }, DT, w);
  const e = VEHICLE_ENVELOPES['hover-transport'];
  const lift = a.pos.y - a.groundOffset;
  assert.ok(lift > e.hoverH - e.bob - 0.01 && lift < e.hoverH + e.bob + 0.01,
    `floats at hoverH±bob (${lift.toFixed(2)} vs hoverH ${e.hoverH})`);
});

test('a glancing wall contact SLIDES along it; only a head-on is a full stop', () => {
  // wall alongside the path: driving nearly parallel with a slight angle in
  const graze = { ARENA: 60000, heightAt: () => 0, waterAt: () => false, cover: [{ x: 8, z: 60, hx: 3, hz: 120, top: 20, hp: 100 }] };
  const a = actor('humvee');
  a.motion.yaw = 0.12;                      // mostly +z, slightly +x toward the wall
  for (let i = 0; i < 360; i++) driveActor(a, { throttle: 1, steer: 0 }, DT, graze);
  assert.ok(a.pos.z > 60, `slid down the wall instead of parking at first touch (z ${a.pos.z.toFixed(1)})`);
  assert.ok(a.motion.speed > VEHICLE_ENVELOPES.humvee.top * 0.4, `kept most speed in the graze (${a.motion.speed.toFixed(1)} u/s)`);
  // head-on stays a stop
  const wall = { ARENA: 60000, heightAt: () => 0, waterAt: () => false, cover: [{ x: 0, z: 40, hx: 30, hz: 4, top: 20, hp: 100 }] };
  const b = actor('humvee');
  for (let i = 0; i < 360; i++) driveActor(b, { throttle: 1 }, DT, wall);
  assert.ok(b.pos.z < 40, `head-on stopped before the wall (z ${b.pos.z.toFixed(1)})`);
});

test('tracked / mech / ship terrain-follow exactly as before', () => {
  const w = { ARENA: 60000, heightAt: (x, z) => z * 0.04, waterAt: () => false, cover: [] };
  for (const [id, intent] of [['tank', { throttle: 1 }], ['mech-medium', { throttle: 1, powerOn: true }], ['aircraft-carrier', { throttle: 1 }]]) {
    const a = actor(id);
    for (let i = 0; i < 240; i++) driveActor(a, intent, DT, w);
    const expected = w.heightAt(a.pos.x, a.pos.z) + a.groundOffset;
    assert.ok(Math.abs(a.pos.y - expected) < 0.5, `${id} rides the terrain (y ${a.pos.y.toFixed(2)} vs ${expected.toFixed(2)})`);
    assert.equal(a.grounded, true);
  }
});
