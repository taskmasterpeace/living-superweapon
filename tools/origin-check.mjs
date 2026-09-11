import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {POWERS} from '../src/data/creator.js';
import {powerNumbers} from '../src/engine/creatorUI.js';
for(const p of POWERS)assert.doesNotMatch(powerNumbers(p.ab),/undefined|NaN|Infinity/,p.id);
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[];
const base=process.env.LSW_BASE_URL||'http://127.0.0.1:5180';
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/studio.html');await page.waitForFunction(()=>window.STUDIO);
 await page.getByRole('link',{name:'Power kits / ORIGIN ↗'}).click();await page.waitForFunction(()=>window.LSW?.creator?.ui);
 await page.locator('#oName').fill('STUDIO TEST');
 const cards=page.locator('#origin .pcard');await cards.filter({has:page.locator('b',{hasText:/^Energy Beam$/})}).click();
 await page.locator('#origin [data-s="rmb"]').click();
 await cards.filter({has:page.locator('b',{hasText:/^Energy Bolt$/})}).click();
 await page.locator('#oTest').click();
 await page.waitForFunction(()=>LSW.game.player?.name==='STUDIO TEST');
 const id=await page.evaluate(()=>LSW.game.player.def.id);
 await page.goto(`${base}/studio.html?hero=${id}`);await page.waitForFunction(()=>window.STUDIO);
 assert.equal(await page.evaluate(()=>STUDIO.history.value.heroId),id);
 await page.getByLabel('Bulk value',{exact:true}).fill('1.2');await page.getByLabel('Bulk value',{exact:true}).press('Tab');
 await page.getByRole('button',{name:'Save local',exact:true}).click();
 await page.goto(`${base}/powerworld.html?hero=${id}`);await page.waitForFunction(()=>window.LSW?.game);
 await page.locator('#pwGo').click();assert.equal(await page.evaluate(()=>LSW.game.player.def.id),id);
 assert.equal(await page.evaluate(()=>LSW.game.player.parts.torso.scale.x),1.2);
 assert.equal(await page.evaluate(()=>LSW.game.player.def.abilities.lmb.type),'beam');
 assert.deepEqual(errors,[]);console.log(`PASS ${POWERS.length} catalog descriptions; ORIGIN create → save/test → Studio → PowerWorld; 0 errors`);
}finally{await browser.close();}
