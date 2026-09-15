import test from 'node:test';
import assert from 'node:assert/strict';
import { FIREARMS, BLADES, GEAR } from '../src/data/armory.js';
import { ITEM_ICON_SPEC, ITEM_PRESENTATION, itemPresentationById } from '../src/data/item-presentation.js';

test('presentation covers every real armory entry once, retaining source identity', () => {
  const registries = { FIREARMS, BLADES, GEAR };
  assert.equal(ITEM_PRESENTATION.length, Object.values(registries).flat().length);
  assert.equal(new Set(ITEM_PRESENTATION.map(item => item.id)).size, ITEM_PRESENTATION.length);
  assert.equal(new Set(ITEM_PRESENTATION.map(item => item.icon.id)).size, ITEM_PRESENTATION.length);
  for (const [registry, entries] of Object.entries(registries)) {
    for (const entry of entries) {
      const matches = ITEM_PRESENTATION.filter(item => item.registry === registry && item.registryId === entry.id);
      assert.equal(matches.length, 1, `${registry}.${entry.id}`);
      assert.equal(matches[0].name, entry.n);
      assert.equal(itemPresentationById(matches[0].id), matches[0]);
      assert.equal(matches[0].authoredHeroWeapon, entry.hero === true);
      assert.equal(entry.proposedFootprint, undefined, 'presentation must not mutate gameplay data');
    }
  }
  assert.equal(itemPresentationById('prototype.unknown'), null);
});

test('unproduced icons stay explicitly missing and footprints stay proposals', () => {
  for (const item of ITEM_PRESENTATION) {
    assert.equal(item.icon.status, 'missing');
    assert.equal(item.icon.src, null);
    assert.equal(item.proposedFootprint.status, 'proposed');
    for (const dimension of ['columns', 'rows']) assert.ok(Number.isInteger(item.proposedFootprint[dimension]) && item.proposedFootprint[dimension] > 0);
    assert.ok(Object.isFrozen(item) && Object.isFrozen(item.icon) && Object.isFrozen(item.proposedFootprint));
  }
  assert.equal(itemPresentationById('firearm.p9').proposedEquipmentRole, 'sidearm');
  assert.equal(itemPresentationById('firearm.m16').proposedEquipmentRole, 'primary-weapon');
});

test('master safe area fits square source at every standard renderer size', () => {
  const { masterPixels, safeArea, renderPixels } = ITEM_ICON_SPEC;
  assert.equal(masterPixels, 512);
  assert.equal(ITEM_ICON_SPEC.transparent, true);
  assert.equal(ITEM_ICON_SPEC.fit, 'contain');
  assert.ok(safeArea.x > 0 && safeArea.y > 0);
  assert.ok(safeArea.x + safeArea.width < masterPixels && safeArea.y + safeArea.height < masterPixels);
  assert.equal(safeArea.width, safeArea.height);
  assert.deepEqual(Object.values(renderPixels), [48, 64, 96]);
});
