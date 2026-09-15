// VEHICLE CONTROL SESSION GATE — the shared seat/ownership contract every
// vehicle family boards through. Proves headlessly: claim validation, the
// stash/restore round trip, death-while-inside, destroyed-vehicle release,
// a second (gunner) seat, and AI-vs-player controller source bookkeeping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VehicleSession, sessionOf, seatLayoutOf, SEAT_DRIVER, SEAT_GUNNER } from '../src/engine/vehicle-session.js';

function fighter(over = {}) {
  return {
    alive: true, stunT: 0, frozenT: 0, staggerT: 0, sleepT: 0, launchT: 0,
    grabbedBy: null, grabbing: null, _carry: null, _personCarry: null,
    pos: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    vel: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    obj: { visible: true, position: { copy() {} } },
    slots: {}, ...over,
  };
}
function actor(over = {}) { return { id: 'tank', pos: { x: 10, y: 2, z: 20 }, groundOffset: 1, ready: true, destroyed: false, occupant: null, ...over }; }
function game() { return { world: { heightAt: () => 0 } }; }

test('claim validates, stashes, hides, pins ownership and the legacy occupant alias', () => {
  const g = game(), a = actor(), s = sessionOf(g, a), p = fighter();
  assert.equal(s.claim(SEAT_DRIVER, p), null);
  assert.equal(a.occupant, p, 'legacy driver alias set');
  assert.equal(p._fleetVehicle, a);
  assert.equal(p._fleetSeat, SEAT_DRIVER);
  assert.equal(p.obj.visible, false, 'occupant hidden');
  assert.equal(s.sourceOf(SEAT_DRIVER), 'player');
  // second claim on a taken seat refuses
  const q = fighter();
  assert.match(s.claim(SEAT_DRIVER, q), /taken/);
  // a fighter already crewing anything refuses
  const r = fighter({ _scoutVehicle: {} });
  const s2 = sessionOf(g, actor());
  assert.match(s2.claim(SEAT_DRIVER, r), /Already crewing/);
});

test('a busy fighter can never teleport into a hull', () => {
  const g = game(), s = sessionOf(g, actor());
  for (const bad of [{ stunT: 1 }, { frozenT: 1 }, { launchT: 1 }, { grabbedBy: {} }, { _personCarry: {} }, { alive: false }]) {
    assert.match(s.claimReason(SEAT_DRIVER, fighter(bad)) || '', /Cannot board|during/i, JSON.stringify(bad));
  }
});

test('release restores exactly what claim stashed', () => {
  const g = game(), a = actor(), s = sessionOf(g, a), p = fighter();
  s.claim(SEAT_DRIVER, p);
  assert.equal(s.release(SEAT_DRIVER, { destination: { x: 30, y: 0, z: 40 } }), true);
  assert.equal(p.obj.visible, true, 'visibility restored');
  assert.equal(p._fleetVehicle, null);
  assert.equal(p._fleetSeat, null);
  assert.equal(a.occupant, null);
  assert.deepEqual([p.pos.x, p.pos.z], [30, 40], 'placed at destination');
});

test('death while inside: tick releases the seat so the corpse returns to the world', () => {
  const g = game(), a = actor(), s = sessionOf(g, a), p = fighter();
  s.claim(SEAT_DRIVER, p);
  p.alive = false;
  s.tick();
  assert.equal(s.driver, null, 'seat freed');
  assert.equal(p._fleetVehicle, null);
  assert.equal(p.obj.visible, true, 'body visible again (ragdoll can show)');
  assert.equal(a.occupant, null);
});

test('destroyed vehicle: tick force-releases every occupant in place (no teleport)', () => {
  const g = game(), a = actor({ seatLayout: [SEAT_DRIVER, SEAT_GUNNER] }), s = sessionOf(g, a);
  const d = fighter(), gn = fighter();
  assert.equal(s.claim(SEAT_DRIVER, d), null);
  assert.equal(s.claim(SEAT_GUNNER, gn, { source: 'ai' }), null);
  assert.equal(s.sourceOf(SEAT_GUNNER), 'ai');
  s.tick();                                   // seats pin to the hull
  assert.deepEqual([d.pos.x, d.pos.z], [a.pos.x, a.pos.z]);
  a.destroyed = true;
  s.tick();
  assert.equal(s.occupants().length, 0, 'all seats released');
  assert.equal(d._fleetVehicle, null); assert.equal(gn._fleetVehicle, null);
  assert.deepEqual([d.pos.x, d.pos.z], [a.pos.x, a.pos.z], 'released in place, not teleported');
});

test('gunner seat exists only when the layout declares it', () => {
  const g = game(), plain = sessionOf(g, actor());
  assert.match(plain.claim(SEAT_GUNNER, fighter()), /No gunner seat/);
  assert.deepEqual(seatLayoutOf(actor({ seatLayout: ['driver', 'gunner'] })), ['driver', 'gunner']);
});

test('sessionOf is idempotent — one session per actor', () => {
  const g = game(), a = actor();
  const s1 = sessionOf(g, a), s2 = sessionOf(g, a);
  assert.equal(s1, s2);
  assert.ok(s1 instanceof VehicleSession);
});

test('tick pins living occupants to the hull every frame', () => {
  const g = game(), a = actor(), s = sessionOf(g, a), p = fighter();
  s.claim(SEAT_DRIVER, p);
  a.pos.x = 99; a.pos.z = -5;
  s.tick();
  assert.deepEqual([p.pos.x, p.pos.y, p.pos.z], [99, a.pos.y + 1, -5]);
  assert.equal(p.obj.visible, false, 'stays hidden while seated');
});
