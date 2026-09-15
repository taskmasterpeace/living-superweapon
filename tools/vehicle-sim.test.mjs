// VEHICLE SIMULATOR GATE — the proving-ground arena is sculpted from the terrain and
// restored on close. THREE-free: stub the world's levelArea/restoreTerrainPatch/heightAt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sculptSimArena, restoreSimArena, bayPos, SIM, AA } from '../src/engine/vehicle-sim.js';

test('sculpts the base / valley / basin and returns one undo token per area', () => {
  const calls = []; const world = { levelArea: (...a) => { calls.push(a); return { tag: a.join(',') }; } };
  const undo = sculptSimArena(world);
  assert.equal(calls.length, 4, 'four areas sculpted (base, valley, basin, maze pad)');
  assert.equal(undo.length, 4, 'one undo token per area');
  const ys = calls.map(c => c[4]);
  assert.ok(ys[0] > ys[1] && ys[1] > ys[2], `high ground > valley > basin (${ys})`);   // it IS a slope
});

test('restore puts every terrain patch back', () => {
  const restored = []; const world = { restoreTerrainPatch: u => restored.push(u), levelArea: () => ({}) };
  restoreSimArena(world, [{ a: 1 }, { a: 2 }, { a: 3 }]);
  assert.equal(restored.length, 3);
});

test('the bay sits on the base height the terrain reports', () => {
  const b = bayPos({ heightAt: () => 48 });
  assert.equal(b.x, SIM.bay.x); assert.equal(b.z, SIM.bay.z); assert.equal(b.y, 48);
});

test('sculpt/restore are safe no-ops without a terrain sculptor (never throw)', () => {
  assert.equal(sculptSimArena({}), null);
  assert.doesNotThrow(() => restoreSimArena({}, null));
  assert.equal(bayPos({}).y, SIM.baseY);   // falls back to the declared base height
});

test('sim AA geometry data stays presentation-only — the REAL fire behaviour lives in aa-emplacement.js', () => {
  // Fleet workstream §8: genuine AA returned as AAEmplacement (base-defense
  // team, hostile flyers only — the no-missiles-at-the-player ruling holds).
  // This module keeps ONLY the passive-tracking numbers; every fire knob
  // belongs to AA_CONFIGS/MISSILE_PROFILES, never duplicated here.
  assert.equal(typeof AA.range, 'number', 'passive tracking range');
  assert.equal(typeof AA.minY, 'number', 'airborne threshold');
  for (const k of ['speed', 'turnRate', 'hitR', 'life', 'damage', 'cooldown', 'aimTol']) {
    assert.equal(AA[k], undefined, `AA.${k} lives in the missile/emplacement data, not here`);
  }
});
