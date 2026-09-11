import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:860}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto('http://127.0.0.1:5182/studio.html?hero=webline');
 await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 await page.getByLabel('Attack slot',{exact:true}).selectOption('r');
 assert.equal(await page.getByLabel('Kit source',{exact:true}).inputValue(),'');
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.r),undefined);
 await page.getByLabel('Kit source',{exact:true}).selectOption('maximum-spider');
 await page.waitForFunction(()=>STUDIO.preview.fighter.slots.r?.def.name==='Maximum Spider');
 assert.equal(await page.evaluate(()=>STUDIO.history.value.kit.r),'maximum-spider');
 assert.equal(await page.evaluate(()=>STUDIO.history.dirty),true);
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter?.slots?.r?.def?.name==='Maximum Spider');
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('r');
 assert.equal(await page.getByLabel('Kit source',{exact:true}).inputValue(),'maximum-spider');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lsw.studio.profiles.v1')).webline.kit.r),'maximum-spider');
 for(const [heroId,slot] of [['apex','r'],['vanguard','f']]){
  await page.goto(`http://127.0.0.1:5182/studio.html?hero=${heroId}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  assert.equal(await page.evaluate(slot=>STUDIO.preview.fighter.slots[slot],slot),undefined,`${heroId} default ${slot.toUpperCase()} was not empty`);
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption(slot);
  assert.ok(await page.getByLabel('Kit source',{exact:true}).isVisible());
  if(heroId==='apex'){
   await page.getByLabel('Kit source',{exact:true}).selectOption('perfect-wave');
   await page.waitForFunction(()=>STUDIO.preview.fighter.slots.r?.def.name==='Perfect Wave');
   const width=page.locator('[data-attack-key="radius"][type="number"]');await width.fill('3.8');await width.press('Enter');
   await page.waitForFunction(()=>STUDIO.preview.fighter.slots.r?.def.radius===3.8);
   await page.getByLabel('Kit source',{exact:true}).selectOption('');await page.waitForFunction(()=>!STUDIO.preview.fighter.slots.r);
   await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
   await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('r');
   await page.getByLabel('Kit source',{exact:true}).selectOption('perfect-wave');
   await page.waitForFunction(()=>STUDIO.preview.fighter.slots.r?.def.radius===3.8);
   assert.equal(await page.evaluate(()=>STUDIO.history.value.attacks.r.values.radius),3.8);
   await page.getByRole('button',{name:'Save local',exact:true}).click();
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS pilot alternatives are deliberate, live, persisted, and default-empty in Studio; 0 page errors');
}finally{await browser.close();}
