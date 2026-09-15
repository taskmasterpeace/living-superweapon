// FLEET PILOT GATE — the one boarding manager: walk up, press J, drive any class,
// press J to leave. Verified headless with stub actors (no GLB), across ground/air/sea.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { initVehicleState } from '../src/engine/vehicle-pilot.js';
import { FleetPilot, fleetIntent } from '../src/engine/fleet-pilot.js';

const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; } });
function wrap() { return { position: vec(), rotation: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } } }; }
function player() { return { alive: true, radius: 2, flying: false, moveDir: { x: 0, z: 0 }, slots: {}, pos: vec(), vel: { set() {} }, obj: { visible: true, position: vec() } }; }
function fleetActor(envId, cls) {
  const e = VEHICLE_ENVELOPES[envId];
  return { id: envId, name: envId, cls: cls || e.cls, env: e, motion: initVehicleState(cls || e.cls, 0), pos: vec(), wrapper: wrap(), bodyRadius: 10, groundOffset: 2, span: 20, ready: true, occupant: null };
}
function rig(envId, cls) {
  const p = player(), a = fleetActor(envId, cls);
  const world = { ARENA: 6000, heightAt: () => 0, waterAt: () => false, cover: [], _chaseSnap: false };
  const game = { player: p, world, paused: false, running: true, matchOver: false, hud: { feed() {} }, _fleetActors: [a] };
  return { pilot: new FleetPilot(game), p, a, game };
}
const inp = (pressed = [], down = []) => ({ pressed: c => pressed.includes(c), down: c => down.includes(c), justPressed: { delete() {} } });

test('board with J, hide the driver, then exit with J restores', () => {
  const { pilot, p, a } = rig('tank');
  assert.equal(pilot.handleInput(inp(['KeyJ'])), true);
  assert.equal(pilot.actor, a); assert.equal(p._fleetVehicle, a); assert.equal(p.obj.visible, false);
  pilot.handleInput(inp(['KeyJ']));
  assert.equal(pilot.actor, null); assert.equal(p._fleetVehicle, null); assert.equal(p.obj.visible, true);
});

test('_nearest skips un-ready and occupied actors', () => {
  const { pilot, a } = rig('tank');
  a.ready = false; assert.equal(pilot.handleInput(inp(['KeyJ'])), false, 'cannot board a still-loading vehicle');
  a.ready = true; a.occupant = {}; assert.equal(pilot.handleInput(inp(['KeyJ'])), false, 'cannot board an occupied vehicle');
});

for (const [envId, cls, drive] of [['tank', 'tracked', ['KeyW']], ['humvee', 'wheeled', ['KeyW']], ['aircraft-carrier', 'ship', ['KeyW']], ['jet-a', 'fixedwing', ['KeyR']], ['helicopter', 'rotor', ['KeyW']]]) {
  test(`drive a ${cls} (${envId}) through the fleet pilot: it moves, driver rides along`, () => {
    const { pilot, p, a } = rig(envId, cls);
    pilot.handleInput(inp(['KeyJ']));
    for (let k = 0; k < 300; k++) { pilot.handleInput(inp([], drive)); pilot.update(1 / 60); }
    assert.ok(Math.hypot(a.pos.x, a.pos.z) > 2, `${cls} travelled (${Math.hypot(a.pos.x, a.pos.z).toFixed(1)}u)`);
    assert.ok(Math.abs(p.pos.x - a.pos.x) < 1 && Math.abs(p.pos.z - a.pos.z) < 1, 'the driver is seated in the vehicle');
    assert.ok(['x', 'y', 'z'].every(kk => Number.isFinite(a.pos[kk])), 'finite');
  });
}

test('fleetIntent maps each class to the right stepper fields', () => {
  assert.equal(fleetIntent('tracked', { fwd: 1, turn: 1, aimX: 1 }).turretX, 1);
  assert.equal(fleetIntent('mech', { fwd: 1, aimX: 1 }).powerOn, true);
  assert.equal(fleetIntent('rotor', { fwd: 1, lift: 1 }).on, true);
  assert.equal(fleetIntent('fixedwing', { throttle: 1, pitch: 1 }).pitch, 1);
});

test('boarding requires real vertical proximity and direct entry shares the same rejection',()=>{
 const {pilot,p,a}=rig('jet-a');a.pos.y=160;
 assert.equal(pilot._nearest(p),null);assert.equal(pilot.enter(a,p),false);assert.equal(p._fleetVehicle,undefined);
 p.pos.y=160;assert.equal(pilot.enter(a,p),true);pilot.dispose();
});

test('boarding rejects incapacitation and a blocked entrance without changing owners',()=>{
 const {pilot,p,a,game}=rig('tank');p.stunT=1;assert.equal(pilot.enter(a,p),false);p.stunT=0;
 game.world._camNearestT=()=>.2;assert.equal(pilot.enter(a,p),false);assert.equal(pilot._nearest(p),null);
 game.world._camNearestT=()=>1;assert.equal(pilot.enter(a,p),true);pilot.dispose();
});

test('exit searches around a parked vehicle instead of placing the player in the right wall',()=>{
 const {pilot,p,a,game}=rig('tank');pilot.enter(a,p);
 game.world.cover=[{x:15,z:0,hx:3,hz:20,top:40}];assert.equal(pilot.exit(),true);
 assert.ok(p.pos.x<10);assert.equal(p.pos.y,0);assert.equal(p._fleetVehicle,null);assert.equal(p.obj.visible,true);
});

test('blocked exits retain driver ownership and HUD until space becomes available',()=>{
 const {pilot,p,a,game}=rig('tank');pilot.enter(a,p);game.world.cover=[{x:0,z:0,hx:30,hz:30,top:40}];
 assert.equal(pilot.exit(),false);assert.equal(pilot.actor,a);assert.equal(p._fleetVehicle,a);assert.equal(p.obj.visible,false);
 game.world.cover=[];assert.equal(pilot.exit(),true);
});

test('ordinary soldiers cannot abandon an aircraft in midair; capable flyers can',()=>{
 const {pilot,p,a}=rig('helicopter');pilot.enter(a,p);a.pos.y=100;pilot._seat();
 assert.equal(pilot.exit(),false);assert.equal(p._fleetVehicle,a);
 p.flightTier=3;assert.equal(pilot.exit(),true);assert.equal(p.flying,true);assert.equal(p.pos.y,100);
});

test('forced lifecycle cleanup detaches a dead or boxed-in driver without wall teleport',()=>{
 const {pilot,p,a,game}=rig('tank');pilot.enter(a,p);const before={x:p.pos.x,y:p.pos.y,z:p.pos.z};
 game.world.cover=[{x:0,z:0,hx:50,hz:50,top:100}];p.alive=false;pilot.update(.1);
 assert.equal(pilot.actor,null);assert.equal(p._fleetVehicle,null);assert.equal(a.occupant,null);
 assert.deepEqual({x:p.pos.x,y:p.pos.y,z:p.pos.z},before);
});
