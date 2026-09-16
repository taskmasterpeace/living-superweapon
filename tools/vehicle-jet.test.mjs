// JET ENVELOPE GATE — story 10. The jet is deliberately arcade/hybrid (no
// aerodynamic-simulation claim); this gate tests the actual PLAYABLE envelope:
// valid airborne start, throttle, pitch/bank/rudder, stall as a RECOVERABLE
// state, climb/dive/turn, approach → landing → rollout → takeoff roll, and
// crash policy through the real hull receiver.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initAirborneVehicleState, initVehicleState, driveActor } from '../src/engine/vehicle-pilot.js';
import { attachVehicleHull } from '../src/engine/vehicle-combat.js';
import { FleetPilot } from '../src/engine/fleet-pilot.js';

const DT = 1 / 60, env = VEHICLE_ENVELOPES['jet-a'];
const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, copy(v) { Object.assign(this, { x: v.x, y: v.y, z: v.z }); return this; } });
function jet(airborne = true) {
  return { id: 'jet-a', name: 'jet-a', cls: 'fixedwing', env, motion: airborne ? initAirborneVehicleState(env, 0) : initVehicleState('fixedwing', 0), pos: { x: 0, y: airborne ? 160 : 2, z: 0 }, wrapper: { position: vec(), rotation: { set() {} } }, bodyRadius: 8, bodyHeight: 6, groundOffset: 2, ready: true, occupant: null };
}
const flat = () => ({ ARENA: 600000, heightAt: () => 0, waterAt: () => false, cover: [] });
const fly = (a, i, n, w) => { for (let k = 0; k < n; k++) driveActor(a, i, DT, w); };

test('valid airborne start: above stall, lever matched, level cruise holds', () => {
  const a = jet();
  assert.ok(a.motion.speed > env.stall + env.liftRamp, 'starts flying, not falling');
  assert.ok(a.motion.lever > 0, 'throttle matches the airspeed');
  const w = flat(); fly(a, {}, 600, w);
  assert.equal(a.motion.stalled, false, 'hands-off cruise never stalls (trim)');
  assert.ok(Math.abs(a.pos.y - 160) < 5, `altitude holds level (${a.pos.y.toFixed(1)})`);
});

test('stall is a RECOVERABLE state: throttle starves it, the nose falls, a dive + power recovers', () => {
  const w = flat(), a = jet(); a.pos.y = 700;
  fly(a, { throttle: -1, pitch: .6 }, 60 * 9, w);           // drag the lever back, hold the nose up
  assert.equal(a.motion.stalled, true, `it STALLED (speed ${a.motion.speed.toFixed(0)} < ${env.stall})`);
  assert.ok(a.motion.pitch < 0, 'the nose FELL through the hold — you cannot hang on the prop');
  const sink = a.motion.vy;
  assert.ok(sink < 0, 'losing lift means sinking');
  fly(a, { throttle: 1 }, 60 * 6, w);                       // power on, nose already down
  assert.equal(a.motion.stalled, false, 'the dive + throttle RECOVERED it');
  fly(a, { throttle: 1, pitch: 1 }, 60 * 4, w);
  assert.ok(a.motion.vy > 0, 'and it climbs again');
});

test('climb, dive, turn: pitch owns the vertical, bank turns the nose', () => {
  const w = flat(), a = jet(); a.pos.y = 300;
  const y0 = a.pos.y; fly(a, { throttle: 1, pitch: 1 }, 180, w);
  assert.ok(a.pos.y > y0 + 30, 'climbs on pitch up');
  const y1 = a.pos.y; fly(a, { throttle: 0, pitch: -1 }, 120, w);
  assert.ok(a.pos.y < y1 - 30, 'dives on pitch down');
  const yaw0 = a.motion.yaw; fly(a, { steer: 1, rudder: 1 }, 180, w);
  assert.ok(Math.abs(a.motion.yaw - yaw0) > 0.3, `bank + rudder turn the nose (${(a.motion.yaw - yaw0).toFixed(2)} rad)`);
});

function pilotRig(airborne = true) {
  const p = { alive: true, team: 0, radius: 2, flying: false, moveDir: { x: 0, z: 0 }, slots: {}, pos: vec(), vel: { set() {} }, obj: { visible: true, position: vec() } };
  const a = jet(airborne); a.pos = Object.assign(vec(), a.pos);
  const world = flat(); world.cover = []; world.coverAll = [];
  const game = { player: p, world, paused: false, running: true, matchOver: false, hud: { feed(m) { (game.feeds ??= []).push(m); } }, _fleetActors: [a], particles: { burst() {} }, vfx: { flash() {} }, audio: { soundLibrary: { play() {} } }, noise() {}, news: null };
  attachVehicleHull(game, a);
  const pilot = new FleetPilot(game);
  const inp = (down = []) => ({ pressed: () => false, down: c => down.includes(c), justPressed: { delete() {} }, mouse: { dx: 0, dy: 0 } });
  return { pilot, p, a, game, inp };
}

test('approach → LANDING → rollout stop → takeoff roll → airborne again', () => {
  const { pilot, p, a, game, inp } = pilotRig();
  p.pos.set(a.pos.x, a.pos.y, a.pos.z);                     // the sim teleports the pilot to the airborne start
  assert.equal(pilot.enter(a, p), true, 'boarded');
  // approach: throttle back, let it sink on low lift with gear down
  let frames = 0;
  while (!a.grounded && frames++ < 60 * 60) { pilot.handleInput(inp(['KeyF'])); pilot.update(DT); }
  assert.equal(a.grounded, true, 'it came down');
  assert.equal(a.hull.cover.hp, a.hull.cover.maxHp, `a gear-down glide arrival costs nothing (feeds: ${game.feeds?.slice(-1)})`);
  // rollout: on the ground with idle throttle it STOPS
  for (let i = 0; i < 60 * 14; i++) { pilot.handleInput(inp([])); pilot.update(DT); }
  assert.ok(a.motion.speed < 2, `rollout came to rest (${a.motion.speed.toFixed(1)} u/s)`);
  // takeoff: full throttle down the strip, rotate, climb out
  for (let i = 0; i < 60 * 25 && a.grounded; i++) { pilot.handleInput(inp(['KeyR'])); pilot.update(DT); }
  for (let i = 0; i < 60 * 4; i++) { pilot.handleInput(inp(['KeyR', 'KeyS'])); pilot.update(DT); }
  assert.equal(a.grounded, false, 'took off again');
  assert.ok(a.pos.y > 12, `climbing out (${a.pos.y.toFixed(1)}u)`);
});

test('crash policy: a belly arrival costs the hull through the REAL receiver', () => {
  const { pilot, p, a, inp } = pilotRig();
  p.pos.set(a.pos.x, a.pos.y, a.pos.z);
  assert.equal(pilot.enter(a, p), true, 'boarded');
  a.motion.gearDown = false; a.motion.gearAmount = 0;       // gear up
  let frames = 0;
  while (!a.grounded && frames++ < 60 * 90) { pilot.handleInput(inp(['KeyF'])); pilot.update(DT); }
  assert.equal(a.grounded, true);
  assert.ok(a.hull.cover.hp < a.hull.cover.maxHp, `belly landing damaged the hull (${a.hull.cover.hp}/${a.hull.cover.maxHp})`);
});
