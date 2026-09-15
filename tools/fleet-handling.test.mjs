// FLEET HANDLING GATE — every reference-fleet model resolves to a way to be
// controlled, verified against the SOURCE catalog fixture (not deployment coverage). "Everything needs a pilot."
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { classOf, drives, envelopeFor, controllable, baseId, fleetHandlingReport } from '../src/data/fleet-handling.js';

const require = createRequire(import.meta.url);
const catalog = require('./fixtures/fleet-catalog-source.json');
const models = catalog.models;
const byId = Object.fromEntries(models.map(m => [m.id, m]));
const base = models.filter(m => !/-(damaged|destroyed)$/.test(m.id));

test('every DRIVING-group base model gets a motion class + an envelope with a finite top', () => {
  for (const m of base) {
    if (!['Aircraft', 'Ground', 'Mechs', 'Sea'].includes(m.group)) continue;
    assert.ok(drives(m), `${m.id} (${m.group}) drives`);
    const e = envelopeFor(m);
    assert.ok(e && Number.isFinite(e.top) && e.top > 0, `${m.id} has a real envelope (top ${e && e.top})`);
  }
});

test('classes land where expected', () => {
  assert.equal(classOf(byId['aircraft-carrier']), 'ship');
  assert.ok(envelopeFor(byId['aircraft-carrier']).top <= 20, 'the carrier is SLOW');
  assert.equal(classOf(byId['mothership']), 'rotor');   // a hovering capital ship, not an aerodynamic plane
  assert.ok(envelopeFor(byId['mothership']).top < 60, 'the mothership flies slow');
  assert.equal(classOf(byId['tank']), 'tracked');
  assert.equal(classOf(byId['helicopter']), 'rotor');
  assert.equal(classOf(byId['hoverboard']), 'hover');
  assert.equal(classOf(byId['motorcycle']), 'wheeled');
  assert.equal(classOf(byId['mech-light']), 'mech');
});

test('condition variants inherit the base vehicle handling', () => {
  assert.equal(classOf(byId['mothership-destroyed']), classOf(byId['mothership']));
  assert.equal(classOf(byId['tank-damaged']), classOf(byId['tank']));
  assert.equal(baseId('jet-b-destroyed'), 'jet-b');
});

test('Defense: manned turrets can be manned, radar is static, none of them drive', () => {
  assert.equal(classOf(byId['aa-gun-manned']), 'turret');
  assert.ok(controllable(byId['aa-gun-manned']), 'a manned gun can be manned');
  assert.ok(!drives(byId['aa-gun-manned']), 'but it does not drive');
  assert.equal(classOf(byId['radar-station']), 'static');
  assert.ok(!controllable(byId['aa-gun-auto']), 'an auto gun is AI, not player-piloted');
});

test('Drones are the swarm system, not the boardable-pilot path', () => {
  assert.equal(classOf(byId['swarm-drone']), 'drone');
  assert.ok(!drives(byId['swarm-drone']));
});

test('non-vehicles never drive (Equipment / Facilities / Ordnance)', () => {
  for (const m of base) {
    if (['Equipment', 'Facilities', 'Ordnance'].includes(m.group)) {
      assert.ok(!drives(m) && !controllable(m), `${m.id} (${m.group}) is not pilotable`);
    }
  }
});

test('ALL vehicles resolved: every one of the 157 catalog models has a definite disposition', () => {
  // "resolved" = it either DRIVES (a real motion class + a finite-top envelope) or is
  // deliberately non-driving; nothing throws, nothing drives without an envelope, and no
  // non-driver leaks a driving class. Variants included — this is the whole catalog.
  const DRIVE = new Set(['fixedwing', 'rotor', 'wheeled', 'tracked', 'hover', 'mech', 'ship']);
  let driveN = 0, nonN = 0; const problems = [];
  for (const m of models) {
    let cls, dr, env;
    try { cls = classOf(m); dr = drives(m); env = dr ? envelopeFor(m) : null; }
    catch (e) { problems.push(`${m.id}: threw ${e.message}`); continue; }
    if (dr) {
      driveN++;
      if (!env || !(Number.isFinite(env.top) && env.top > 0)) problems.push(`${m.id}: drives as ${cls} but no envelope top`);
    } else {
      nonN++;
      if (DRIVE.has(cls)) problems.push(`${m.id}: non-driving yet class ${cls} is a driving class`);
    }
  }
  assert.deepEqual(problems, [], `unresolved models: ${problems.join(' | ')}`);
  assert.equal(driveN + nonN, models.length, 'every model accounted for');
  assert.ok(driveN >= 70, `a full drivable fleet (${driveN} of ${models.length} drive)`);
});

test('no coverage gap: every driving base model resolves to an envelope', () => {
  const { byClass, gaps } = fleetHandlingReport(models);
  assert.deepEqual(gaps, [], `driving models missing an envelope: ${gaps.join(', ')}`);
  const driveTotal = [...['fixedwing', 'rotor', 'wheeled', 'tracked', 'hover', 'mech', 'ship']].reduce((n, c) => n + (byClass[c] || 0), 0);
  assert.ok(driveTotal >= 20, `a real drivable fleet (${driveTotal} base vehicles: ${JSON.stringify(byClass)})`);
});
