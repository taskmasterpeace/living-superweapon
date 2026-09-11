import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const capture=process.env.LSW_CAPTURE_DIR;
if(capture)await mkdir(capture,{recursive:true});

const base = process.env.LSW_BASE_URL || 'http://127.0.0.1:5180';
assert.equal(new URL(base).hostname, '127.0.0.1',
  'Hero skin integration must use an isolated 127.0.0.1 origin, never localhost storage');

const browser = await chromium.launch({headless: true});
const allErrors = [];

async function openFresh(path = '/studio.html?hero=sol') {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(base + path);
  await page.waitForFunction(() => window.STUDIO?.preview?.fighter);
  allErrors.push(errors);
  return {context, page, errors};
}

async function selectBody(page, body) {
  await page.getByLabel('Body source', {exact: true}).selectOption(body);
  await page.waitForFunction(expected => {
    const fighter = window.STUDIO?.preview?.fighter;
    return expected === 'procedural'
      ? fighter && !fighter.parts.skin
      : fighter?.parts.skin?.id === expected;
  }, body);
}

async function skinSnapshot(page) {
  return page.evaluate(() => {
    const fighter = STUDIO.preview.fighter;
    const meshes = [];
    fighter.obj.traverse(object => {
      if (object.isSkinnedMesh) meshes.push(object);
    });
    const belt=fighter.obj.getObjectByName('costume-belt');
    if(!belt?.visible||!belt.layers.isEnabled(0))throw Error('Body choice lost its fitted belt');
    if(fighter.parts.skin&&belt.skeleton!==fighter.parts.skin.skeleton)throw Error('Belt is not carried by the selected skin');
    return {
      selected: document.querySelector('[data-path="model.body"]')?.value,
      id: fighter.parts.skin?.id ?? null,
      license: fighter.parts.skin?.source?.license ?? null,
      meshCount: meshes.length,
      maxVertices: Math.max(0, ...meshes.map(mesh =>
        mesh.geometry.getAttribute('position')?.count ?? 0)),
      proceduralTorsoVisible: fighter.parts.torso.layers.isEnabled(0),
    };
  });
}

async function assertSourceControlState(page, imported) {
  for (const label of ['Costume module', 'Neck value']) {
    const control = page.getByLabel(label, {exact: true});
    assert.equal(await control.count(), 1, `${label} must remain visible`);
    assert.equal(await control.isDisabled(), imported, `${label} disabled state`);
    if (imported) assert.match(await control.getAttribute('title') ?? '', /procedural/i,
      `${label} needs an explanatory tooltip`);
  }
  const definition = page.getByLabel('Body definition value', {exact: true});
  assert.equal(await definition.count(), imported ? 0 : 1,
    imported ? 'source anatomy must hide the incompatible definition control'
      : 'procedural anatomy must restore the definition control');
  if (!imported) assert.equal(await definition.isEnabled(), true);
}

async function downloadJson(page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export JSON', exact: true}).click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

try {
  // Shipped fighter: catalog, both real choices, fallback, and saved profile reload.
  const shipped = await openFresh();
  const p = shipped.page;
  assert.deepEqual(await p.evaluate(() => Object.keys(localStorage)), [],
    'new Playwright context must begin with empty origin storage');
  await p.getByRole('button', {name: 'Pause preview', exact: true}).click();

  const options = await p.getByLabel('Body source', {exact: true}).locator('option')
    .evaluateAll(nodes => nodes.map(option => ({value: option.value, label: option.textContent.trim()})));
  assert.deepEqual(options, [
    {value: 'procedural', label: 'Procedural modules'},
    {value: 'superhero-male', label: 'Quaternius · Superhero male'},
    {value: 'superhero-female', label: 'Quaternius · Superhero female'},
  ]);
  assert.deepEqual(await skinSnapshot(p), {
    selected: 'procedural', id: null, license: null, meshCount: 0,
    maxVertices: 0, proceduralTorsoVisible: true,
  });
  await assertSourceControlState(p, false);
  await p.getByLabel('Body definition value', {exact: true}).fill('0.37');
  await p.getByLabel('Body definition value', {exact: true}).press('Tab');

  await selectBody(p, 'superhero-male');
  const male = await skinSnapshot(p);
  assert.deepEqual({...male, maxVertices: undefined}, {
    selected: 'superhero-male', id: 'superhero-male', license: 'CC0-1.0',
    meshCount: 4, maxVertices: undefined, proceduralTorsoVisible: false,
  });
  assert.ok(male.maxVertices > 5000, 'male must retain source-authored anatomy density');
  await assertSourceControlState(p, true);
  assert.match(await p.locator('#inspector-panel').innerText(), /source-authored skinned anatomy/i);
  assert.match(await p.locator('#inspector-panel').innerText(), /apply only to Procedural modules/i);
  const sourceLink = p.locator(
    'a[href="https://quaternius.com/packs/universalbasecharacters.html"]');
  assert.equal(await sourceLink.isVisible(), true);
  assert.equal(await sourceLink.getAttribute('href'),
    'https://quaternius.com/packs/universalbasecharacters.html');

  await selectBody(p, 'superhero-female');
  const female = await skinSnapshot(p);
  assert.deepEqual({...female, maxVertices: undefined}, {
    selected: 'superhero-female', id: 'superhero-female', license: 'CC0-1.0',
    meshCount: 4, maxVertices: undefined, proceduralTorsoVisible: false,
  });
  assert.ok(female.maxVertices > 5000, 'female must retain source-authored anatomy density');
  if(capture)await p.screenshot({path:`${capture}/body-source.png`});

  await selectBody(p, 'procedural');
  assert.deepEqual(await skinSnapshot(p), {
    selected: 'procedural', id: null, license: null, meshCount: 0,
    maxVertices: 0, proceduralTorsoVisible: true,
  });
  await assertSourceControlState(p, false);
  assert.equal(await p.getByLabel('Body definition value', {exact: true}).inputValue(), '0.37',
    'returning to Procedural must restore the retained definition value');

  await selectBody(p, 'superhero-male');
  await p.getByRole('button', {name: 'Save local', exact: true}).click();
  assert.match(await p.locator('.save-state').innerText(), /Saved/);
  await p.reload();
  await p.waitForFunction(() => window.STUDIO?.preview?.fighter?.parts?.skin?.id === 'superhero-male');
  assert.equal(await p.getByLabel('Body source', {exact: true}).inputValue(), 'superhero-male');
  assert.ok((await skinSnapshot(p)).maxVertices > 5000);
  assert.deepEqual(shipped.errors, []);
  await shipped.context.close();

  // Custom package: create through ORIGIN, choose the body in Studio, export,
  // then import into a second empty context and launch the actual game Fighter.
  const authored = await openFresh();
  const a = authored.page;
  assert.deepEqual(await a.evaluate(() => Object.keys(localStorage)), []);
  await a.getByRole('button', {name: 'New character', exact: true}).click();
  await a.locator('#oName').fill('SKINWARD');
  const powerCards = a.locator('#origin .pcard');
  await powerCards.filter({has: a.locator('b', {hasText: /^Energy Beam$/})}).click();
  await a.locator('#origin [data-s="rmb"]').click();
  await powerCards.filter({has: a.locator('b', {hasText: /^Energy Bolt$/})}).click();
  await a.locator('#oSave').click();
  await a.waitForFunction(() => STUDIO.preview.fighter.def.name === 'SKINWARD');
  await selectBody(a, 'superhero-female');
  await a.getByRole('button', {name: 'Save local', exact: true}).click();
  const pack = await downloadJson(a);
  assert.equal(pack.format, 'lsw-character');
  assert.equal(pack.version, 1);
  assert.equal(pack.profile.model.body, 'superhero-female');
  assert.ok(JSON.stringify(pack).length < 100000,
    'package must preserve only the known catalog ID, not embed source geometry');
  assert.deepEqual(authored.errors, []);
  await authored.context.close();

  const imported = await openFresh('/studio.html');
  const q = imported.page;
  assert.deepEqual(await q.evaluate(() => Object.keys(localStorage)), []);
  await q.getByRole('button', {name: 'Import JSON', exact: true}).click();
  await q.locator('#profile-json').fill(JSON.stringify(pack));
  await q.getByRole('button', {name: 'Import profile', exact: true}).click();
  await q.waitForFunction(() => STUDIO.preview.fighter.def.name === 'SKINWARD');
  const importedId = await q.evaluate(() => STUDIO.preview.fighter.def.id);
  assert.notEqual(importedId, pack.sourceId, 'package import creates a safe local copy');
  assert.equal(await q.getByLabel('Body source', {exact: true}).inputValue(), 'superhero-female');
  assert.equal((await skinSnapshot(q)).id, 'superhero-female');

  await q.reload();
  await q.waitForFunction(() => window.STUDIO?.preview?.fighter);
  await q.locator(`[data-hero="${importedId}"]`).click();
  await q.waitForFunction(id => STUDIO.preview.fighter.def.id === id, importedId);
  assert.equal(await q.getByLabel('Body source', {exact: true}).inputValue(), 'superhero-female');
  assert.ok((await skinSnapshot(q)).maxVertices > 5000);

  await q.getByRole('button', {name: 'Play Test ↗', exact: true}).click();
  await q.waitForFunction(() => window.LSW?.game);
  await q.locator('#pwGo').click();
  await q.waitForFunction(id => LSW.game.player?.def?.id === id, importedId);
  const runtime = await q.evaluate(() => {
    const fighter = LSW.game.player;
    const meshes = [];
    fighter.obj.traverse(object => {
      if (object.isSkinnedMesh) meshes.push(object);
    });
    const belt=fighter.obj.getObjectByName('costume-belt');
    if(!belt?.visible||belt.skeleton!==fighter.parts.skin?.skeleton)throw Error('Imported gameplay character lost its weighted belt');
    return {
      id: fighter.def.id,
      body: fighter.def.model.body,
      skin: fighter.parts.skin?.id,
      meshCount: meshes.length,
      maxVertices: Math.max(...meshes.map(mesh =>
        mesh.geometry.getAttribute('position')?.count ?? 0)),
      license: fighter.parts.skin?.source?.license,
    };
  });
  assert.deepEqual({...runtime, maxVertices: undefined}, {
    id: importedId,
    body: 'superhero-female',
    skin: 'superhero-female',
    meshCount: 4,
    maxVertices: undefined,
    license: 'CC0-1.0',
  });
  assert.ok(runtime.maxVertices > 5000,
    'Play Test Fighter must contain the source-authored body mesh');
  if(capture)await q.screenshot({path:`${capture}/imported-gameplay.png`});
  assert.deepEqual(imported.errors, []);
  await imported.context.close();

  assert.deepEqual(allErrors.flat(), []);
  console.log('PASS Body source catalog, source-control gating, save/reload, procedural fallback, custom package import and source-backed Play Test');
} finally {
  await browser.close();
}
