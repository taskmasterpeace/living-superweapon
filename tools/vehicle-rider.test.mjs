// VISIBLE RIDER GATE — story 7: the motorcycle rider is SEEN. Open seats keep
// the actual runtime character visible, posed on the saddle (hands to bars,
// knees bent), following the machine's lean; closed hulls still hide crew;
// release hands the body back cleanly. The pose module is the single interim
// owner the Mac Mini animation pipeline will later replace.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initVehicleState, driveActor } from '../src/engine/vehicle-pilot.js';
import { isOpenSeat, poseRider } from '../src/engine/vehicle-rider.js';
import { sessionOf, SEAT_DRIVER } from '../src/engine/vehicle-session.js';
import { FleetPilot } from '../src/engine/fleet-pilot.js';

const DT = 1 / 60;
const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, copy(v) { Object.assign(this, { x: v.x, y: v.y, z: v.z }); return this; } });
function rider() {
  const limb = () => ({ rotation: { x: 0, y: 0, z: 0 }, userData: { knee: { rotation: { x: 0 } } } });
  return {
    alive: true, team: 0, radius: 2, flying: false, moveDir: { x: 0, z: 0 }, slots: {},
    pos: vec(), vel: { set() {} },
    obj: { visible: true, position: vec(), rotation: { x: 0, y: 0, z: 0, order: 'XYZ' } },
    parts: { armL: limb(), armR: limb(), legL: limb(), legR: limb() },
    stunT: 0, frozenT: 0, staggerT: 0, sleepT: 0, launchT: 0, grabbedBy: null, grabbing: null, _carry: null, _personCarry: null,
  };
}
function bike(id = 'motorcycle') {
  const e = VEHICLE_ENVELOPES[id];
  return { id, name: id, cls: e.cls, env: e, motion: initVehicleState(e.cls, 0), pos: vec(), wrapper: { position: vec(), rotation: { set() {} } }, bodyRadius: 4, bodyHeight: 5, groundOffset: 1, ready: true, occupant: null };
}
const game = () => ({ world: { ARENA: 60000, heightAt: () => 0, waterAt: () => false, cover: [], _lookSens: .0024 }, hud: { feed() {} }, paused: false, running: true, matchOver: false });

test('open seats are data: motorcycle/atv/hoverboard open, tank closed', () => {
  assert.equal(isOpenSeat(bike('motorcycle')), true);
  assert.equal(isOpenSeat(bike('atv')), true);
  assert.equal(isOpenSeat(bike('hoverboard')), true);
  assert.equal(isOpenSeat({ env: VEHICLE_ENVELOPES.tank }), false);
});

test('claiming an open seat keeps the rider VISIBLE and posed; a closed hull hides', () => {
  const g = game(), b = bike(), s = sessionOf(g, b), r = rider();
  assert.equal(s.claim(SEAT_DRIVER, r), null);
  assert.equal(r.obj.visible, true, 'the rider is SEEN');
  s.tick();
  assert.equal(r.obj.visible, true);
  assert.ok(r.parts.armL.rotation.x < -0.5, 'hands reach to the bars');
  assert.ok(r.parts.legL.rotation.x < -0.5, 'thighs up in the saddle');
  assert.ok(r.parts.legL.userData.knee.rotation.x > 0.5, 'knees bent to the pegs');
  const tank = { id: 'tank', env: VEHICLE_ENVELOPES.tank, pos: vec(), groundOffset: 1, ready: true, occupant: null };
  const s2 = sessionOf(g, tank), r2 = rider();
  assert.equal(s2.claim(SEAT_DRIVER, r2), null);
  assert.equal(r2.obj.visible, false, 'closed hull still hides the crew');
});

test('the rider follows the lean and sits ON the saddle while driving', () => {
  const g = game(), b = bike(), s = sessionOf(g, b), r = rider();
  s.claim(SEAT_DRIVER, r);
  // drive forward then commit a hard turn — the bike leans, the rider leans with it
  for (let i = 0; i < 240; i++) { driveActor(b, { throttle: 1, steer: i > 120 ? 1 : 0 }, DT, g.world); s.tick(); }
  assert.ok(Math.abs(b.motion.lean) > 0.05, `the bike leans in the turn (${b.motion.lean.toFixed(3)})`);
  assert.ok(Math.abs(r.obj.rotation.z - b.motion.lean) < 1e-9, 'the rider rolls WITH the machine');
  assert.equal(r.obj.rotation.y, b.motion.yaw, 'the rider faces where the bike points');
  const saddleY = b.pos.y + b.bodyHeight * (b.env.saddleH ?? .62);
  assert.ok(Math.abs(r.pos.y - saddleY) < 1e-9, 'seated at the saddle height');
  assert.ok(Math.abs(r.pos.x - b.pos.x) < 1e-9 && Math.abs(r.pos.z - b.pos.z) < 1e-9, 'rides the machine, never floats behind');
});

test('release hands the body back: limbs unposed, roll cleared, visible', () => {
  const g = game(), b = bike(), s = sessionOf(g, b), r = rider();
  s.claim(SEAT_DRIVER, r);
  for (let i = 0; i < 90; i++) { driveActor(b, { throttle: 1, steer: 1 }, DT, g.world); s.tick(); }
  s.release(SEAT_DRIVER, { destination: { x: 5, y: 0, z: 5 } });
  assert.equal(r.obj.rotation.z, 0, 'lean cleared on dismount');
  assert.equal(r.parts.armL.rotation.x, 0, 'arms handed back');
  assert.equal(r.parts.legL.userData.knee.rotation.x, 0, 'knees handed back');
  assert.equal(r.obj.visible, true);
  assert.equal(r._fleetVehicle, null);
});

test('FleetPilot end-to-end on the motorcycle: board visible, ride, exit clean', () => {
  const g = game(), b = bike(), p = rider();
  g.player = p; g._fleetActors = [b];
  const pilot = new FleetPilot(g);
  const inp = (pressed = [], down = []) => ({ pressed: c => pressed.includes(c), down: c => down.includes(c), justPressed: { delete() {} }, mouse: { dx: 0, dy: 0 } });
  assert.equal(pilot.handleInput(inp(['KeyJ'])), true);
  assert.equal(p.obj.visible, true, 'boarded and still visible');
  for (let i = 0; i < 200; i++) { pilot.handleInput(inp([], ['KeyW'])); pilot.update(DT); }
  assert.ok(Math.hypot(b.pos.x, b.pos.z) > 20, 'rode somewhere');
  assert.ok(Math.abs(p.pos.x - b.pos.x) < 1 && Math.abs(p.pos.z - b.pos.z) < 1, 'the rider is ON the bike');
  pilot.handleInput(inp(['KeyJ']));
  assert.equal(p._fleetVehicle, null, 'dismounted');
  assert.equal(p.obj.rotation.z, 0, 'no residual lean on foot');
});
