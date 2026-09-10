import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.LSW_BASE_URL||'http://127.0.0.1:5182';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(7000);
try{
  let denyGrenade=true;
  await page.route('**/motion.hero-ual2/v1/pose-bank.json',route=>denyGrenade?route.fulfill({status:503,body:'Test source unavailable'}):route.continue());
  await page.goto(base+'/studio.html?hero=sarge');
  await page.waitForFunction(()=>window.STUDIO);
  const refs={body:'body.hero-heavy@1','motion.locomotion':'motion.hero-ual@1','motion.reload':'motion.hero-ual@1','motion.grenade':'motion.hero-ual2@1','equipment.rifle':'equipment.carbine@1','equipment.pistol':'equipment.sidearm@1'};
  await page.locator('.asset-catalog > summary').click();
  await page.locator('[data-catalog="body"]').waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-catalog="body"]')?.options.length>1);
  for(const [path,ref] of Object.entries(refs)){
    await page.locator(`[data-catalog="${path}"]`).selectOption(ref);
    if(path==='body')await page.waitForFunction(()=>STUDIO.history.value.frame.scale===1.3&&STUDIO.history.value.frame.bulk===1.45);
    if(path==='motion.grenade'){
      await page.waitForFunction(()=>STUDIO.preview.fighter._authoredMotionStatus?.grenade?.state==='fallback');
      assert.match(await page.locator('#catalog-runtime').textContent(),/fallback/i);
      denyGrenade=false;
      await page.locator('#catalog-motion-retry').click();
      await page.waitForFunction(()=>STUDIO.preview.fighter._authoredMotionStatus?.grenade?.state==='ready');
    }
  }
  assert.equal(await page.evaluate(()=>STUDIO.history.value.model.assets.equipment.pistol),'equipment.sidearm@1');
  await page.locator('#undo').click();
  assert.equal(await page.evaluate(()=>STUDIO.history.value.model.assets.equipment.pistol),undefined);
  await page.locator('#redo').click();
  await page.waitForFunction(()=>STUDIO.preview.fighter._authoredMotionStatus?.grenade?.state==='ready');
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter._motionSources.reload.packageId),'motion.hero-ual@1');
  assert.match(await page.locator('[data-catalog-note="equipment.rifle"]').textContent(),/unapproved-placeholder/);
  assert.match(await page.locator('[data-catalog-note="equipment.rifle"]').textContent(),/full-extension-support-hand/);
  await page.locator('#save').click();
  const expected=await page.evaluate(()=>STUDIO.history.value.model.assets);
  await mkdir('artifacts/authoring-integration',{recursive:true});
  const download=page.waitForEvent('download');await page.locator('#export').click();
  await(await download).saveAs('artifacts/authoring-integration/sarge-profile.json');
  const exported=JSON.parse(await readFile('artifacts/authoring-integration/sarge-profile.json','utf8'));
  assert.deepEqual(exported.model.assets,expected);
  await page.locator('[data-catalog="equipment.pistol"]').selectOption('');
  await page.locator('#undo').click();
  await page.locator('#save').click();
  await page.locator('#import').click();await page.locator('#profile-json').fill(JSON.stringify(exported));
  await page.getByRole('button',{name:'Import profile',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>STUDIO.history.value.model.assets),expected);
  await page.locator('#save').click();
  await page.reload();await page.waitForFunction(()=>window.STUDIO);
  await page.locator('.asset-catalog > summary').click();
  assert.deepEqual(await page.evaluate(()=>STUDIO.history.value.model.assets),expected);
  await page.waitForFunction(()=>document.querySelector('[data-catalog="body"]')?.options.length>1);
  await page.locator('[data-catalog="equipment.rifle"]').scrollIntoViewIfNeeded();
  await mkdir('artifacts/authoring-integration',{recursive:true});
  await page.screenshot({path:'artifacts/authoring-integration/catalog-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-catalog="equipment.rifle"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/authoring-integration/catalog-mobile.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow inspector overflows');
  // A portable package can reference a future catalog. Never erase it on reload.
  await page.evaluate(()=>{const key='lsw.studio.profiles.v1',profiles=JSON.parse(localStorage.getItem(key));profiles.sarge.model.assets.equipment.rifle='equipment.future@2';localStorage.setItem(key,JSON.stringify(profiles));});
  await page.reload();await page.waitForFunction(()=>window.STUDIO);
  await page.locator('.asset-catalog > summary').click();
  await page.waitForFunction(()=>document.querySelector('[data-catalog-note="equipment.rifle"]')?.textContent.includes('Unavailable'));
  assert.equal(await page.locator('[data-catalog="equipment.rifle"]').inputValue(),'equipment.future@2');
  await page.locator('#save').click();
  assert.equal(await page.evaluate(()=>STUDIO.history.value.model.assets.equipment.rifle),'equipment.future@2');
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#playtest').click();await page.waitForFunction(()=>window.LSW?.game);
  await page.locator('#pwGo').click();
  await page.waitForFunction(()=>LSW.game.player?._authoredMotionStatus?.grenade?.state==='ready');
  assert.equal(await page.evaluate(()=>LSW.game.player.def.model.body),'superhero-male');
  assert.equal(await page.evaluate(()=>LSW.game.player.def.frame.scale),1.3);
  assert.equal(await page.evaluate(()=>LSW.game.player._motionSources.reload.packageId),'motion.hero-ual@1');
  assert.equal(await page.evaluate(()=>LSW.game.player.def.model.assets.equipment.rifle),'equipment.future@2');
  assert.deepEqual(errors,[]);
  console.log('PASS: catalog selection, Undo/Redo, Save/reload, export/import, unavailable references, narrow viewport and native Play Test motion preload. Equipment activation/contact remains a separate gate.');
}finally{await browser.close();}
