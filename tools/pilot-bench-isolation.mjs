import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.LSW_BASE_URL || 'http://127.0.0.1:5182';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

try {
  await page.goto(`${baseURL}/powerworld.html`);
  await page.waitForFunction(() => window.LSW?.abilityList && window.LSW?.stageAbility);
  await page.evaluate(() => LSW.abilityList());
  await page.evaluate(() => LSW.enter({ mode: 'training', p1: 'sol' }));
  await page.waitForFunction(() => LSW.game.running && !LSW.hud.titleOpen);
  await page.evaluate(() => { LSW.game.world.render = () => {}; });

  const isolation = await page.evaluate(async () => {
    const g = LSW.game;
    const w = g.world;
    const baseline = w.heightAt(0, 0);
    w.crater(0, 0, 14, 4);
    g.vfx.scorch({ x: 0, y: w.heightAt(0, 0) + 0.14, z: 0 }, 7, '#161a22');
    const contaminated = {
      center: w.heightAt(0, 0),
      caster: w.heightAt(-13, 0),
      target: w.heightAt(13, 0),
      scorches: g.vfx.scorches.length,
    };
    const row = await LSW.stageAbility('rime', 'shift', { resume: true });
    const dummy = g.entities.find((entity) => entity.isDummy);
    return {
      baseline,
      contaminated,
      reset: {
        center: w.heightAt(0, 0),
        scorches: g.vfx.scorches.length,
      },
      row,
      caster: {
        y: g.player.pos.y,
        groundY: g.player.groundY,
        floor: w.heightAt(g.player.pos.x, g.player.pos.z),
      },
      dummy: dummy && {
        y: dummy.pos.y,
        groundY: dummy.groundY,
        floor: w.heightAt(dummy.pos.x, dummy.pos.z),
      },
    };
  });

  assert.ok(isolation.contaminated.center < -0.5, 'fixture must deform the real bench lane');
  assert.ok(isolation.contaminated.scorches > 0, 'fixture must add a real scorch decal');
  assert.ok(
    Math.abs(isolation.reset.center - isolation.baseline) < 0.001,
    `the next bench row must flatten prior crater damage (baseline ${isolation.baseline}, reset ${isolation.reset.center})`,
  );
  assert.equal(isolation.reset.scorches, 0, 'the next bench row must clear prior scorch decals');
  assert.equal(isolation.row.ok, true, 'RIME shift must still pass after isolation');
  assert.ok(isolation.row.raw.move > 6, 'RIME shift must preserve the >6 unit travel criterion');
  assert.ok(Math.abs(isolation.caster.groundY - isolation.caster.floor) < 0.001, 'caster groundY must match its terrain');
  assert.ok(isolation.dummy, 'bench must stage a target');
  assert.ok(Math.abs(isolation.dummy.groundY - isolation.dummy.floor) < 0.001, 'dummy groundY must match its terrain');

  const cases = [
    ['rime', 'shift'],
    ['volt', 'shift'],
    ['warden', 'shift'],
    ['torch', 'shift'],
    ['volt', 'lmb'],
  ];
  const rows = [];
  for (const [heroId, slot] of cases) {
    rows.push(await page.evaluate(({ heroId, slot }) => LSW.stageAbility(heroId, slot, { resume: true }), { heroId, slot }));
  }
  for (const row of rows) {
    assert.equal(row.ok, true, `${row.heroId}.${row.slot} must pass its unchanged activation check`);
    if (row.slot === 'shift') assert.ok(row.raw.move > 6, `${row.heroId}.shift must travel more than 6 units`);
  }
  const flurry = rows.find((row) => row.heroId === 'volt' && row.slot === 'lmb');
  assert.ok(flurry.dmg > 0, 'VOLT Lightning Flurry must acquire, collide with, and damage its target');

  const calibration = await page.evaluate(async () => {
    const g = LSW.game;
    const w = g.world;
    const hero = LSW.ROSTER.find((entry) => entry.id === 'sol');
    const original = hero.abilities.lmb;
    const resetTerrain = w.resetTerrain.bind(w);
    try {
      hero.abilities.lmb = { type: '__deliberately_unimplemented__', name: 'Inert calibration', cost: 5, cd: 1 };
      w.resetTerrain = () => {
        resetTerrain();
        w.crater(-15, 0, 5, 1);
        w.crater(15, 0, 5, 1);
      };
      const row = await LSW.stageAbility('sol', 'lmb', { resume: true });
      const dummy = g.entities.find((entity) => entity.isDummy);
      const placed = (fighter) => ({
        x: fighter.pos.x,
        y: fighter.pos.y,
        spawnX: fighter.spawn.x,
        spawnY: fighter.spawn.y,
        groundY: fighter.groundY,
        floor: w.heightAt(fighter.pos.x, fighter.pos.z),
      });
      return { row, caster: placed(g.player), dummy: placed(dummy) };
    } finally {
      w.resetTerrain = resetTerrain;
      resetTerrain();
      hero.abilities.lmb = original;
    }
  });
  assert.equal(calibration.row.ok, false, 'deliberately inert handler must be rejected');
  assert.deepEqual(calibration.row.evidence, [], 'deliberately inert handler must produce no evidence');
  for (const [name, fighter] of [['caster', calibration.caster], ['dummy', calibration.dummy]]) {
    assert.ok(fighter.floor < -0.5, `${name} placement fixture must use deformed real terrain`);
    assert.ok(Math.abs(fighter.groundY - fighter.floor) < 0.001, `${name} groundY must match staged terrain`);
    assert.ok(Math.abs(fighter.spawnY - fighter.floor) < 0.001, `${name} respawn height must match staged terrain`);
    assert.ok(Math.abs(fighter.spawnX - fighter.x) < 0.001, `${name} respawn X must match staged placement`);
  }
  assert.deepEqual(errors, [], 'browser console must remain error-free');

  console.log(JSON.stringify({ isolation, rows, calibration, errors }, null, 2));
} finally {
  await browser.close();
}
