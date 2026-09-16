// FLEET CATALOG STATUS GATE — story 12. The ledger is honest by construction:
// every capability derives from the real data + a named acceptance gate, there
// is NO aggregate "working" badge, families organize by actual class, and
// non-vehicle collections never appear.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { vehicleStatus, fleetStatusTable, FLEET_FAMILIES } from '../src/engine/fleet-catalog-status.js';

const catalog = JSON.parse(fs.readFileSync(new URL('../public/reference-fleet/catalog.json', import.meta.url)));
const row = id => catalog.models.find(m => m.id === id);

test('the tank ledger matches what the gates actually proved', () => {
  const s = vehicleStatus(row('tank'));
  assert.equal(s.family, FLEET_FAMILIES.tracked);
  assert.equal(s.capabilities.model.state, 'yes');
  assert.equal(s.capabilities.playerMovement.state, 'accepted');
  assert.equal(s.capabilities.weapon.state, 'accepted');
  assert.equal(s.capabilities.damage.state, 'accepted');
  assert.equal(s.capabilities.aiOperation.state, 'accepted');
  assert.match(s.capabilities.aiOperation.note, /Gate A/);
});

test('the motorcycle exposes its open seat and interim rider animation honestly', () => {
  const s = vehicleStatus(row('motorcycle'));
  assert.match(s.capabilities.seats.note, /OPEN seat, visible rider/);
  assert.equal(s.capabilities.animation.state, 'interim');
  assert.match(s.capabilities.animation.note, /Mac Mini/);
  assert.equal(s.capabilities.weapon.state, 'incomplete', 'a bike has no mount and says so');
  assert.equal(s.capabilities.aiOperation.state, 'incomplete', 'no AI rider claimed');
});

test('aircraft say their audio is honestly silent, not "accepted"', () => {
  for (const id of ['helicopter', 'jet-a']) {
    const s = vehicleStatus(row(id));
    assert.equal(s.capabilities.audio.state, 'incomplete');
    assert.match(s.capabilities.audio.note, /silent until an authentic recording/);
  }
});

test('capital platforms admit the damage gap; defense rows are not fake vehicles', () => {
  const carrier = vehicleStatus(row('aircraft-carrier'));
  assert.equal(carrier.capabilities.damage.state, 'incomplete');
  assert.match(carrier.capabilities.damage.note, /per-section/);
  const aaRow = catalog.models.find(m => /^aa-gun|^aa-missile/.test(m.id)) || catalog.models.find(m => m.id === 'radar-station');
  if (aaRow) {
    const s = vehicleStatus(aaRow);
    assert.equal(s.capabilities.playerMovement.state, 'n/a');
    assert.match(s.capabilities.playerMovement.note, /aa-emplacement/);
  }
});

test('NO aggregate badge exists anywhere in the ledger', () => {
  for (const s of fleetStatusTable(catalog)) {
    assert.equal('working' in s, false);
    assert.equal('status' in s, false);
    assert.equal(Object.keys(s.capabilities).length, 9, `${s.id}: all nine capabilities, separately`);
    for (const c of Object.values(s.capabilities)) assert.ok(['yes', 'no', 'accepted', 'incomplete', 'interim', 'n/a'].includes(c.state), `${s.id}: honest state (${c.state})`);
  }
});

test('the table covers the whole fleet collection, organized by family, and nothing else', () => {
  const table = fleetStatusTable(catalog);
  const fleetRows = catalog.models.filter(m => (m.collection ?? 'fleet') === 'fleet');
  assert.equal(table.length, fleetRows.length);
  assert.ok(table.length >= 20, `real catalog breadth (${table.length} rows)`);
  const families = new Set(table.map(s => s.family));
  for (const f of ['Armor · tracked', 'Rotor / VTOL', 'Fixed-wing', 'Walker', 'Ground · wheeled']) assert.ok(families.has(f), `family ${f} present`);
  assert.ok(!table.some(s => /hound|(^|-)rat($|-)|nanite-cloud|dog/.test(s.id)), 'no creatures in the fleet ledger');
});
