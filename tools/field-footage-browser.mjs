import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/field-footage';await mkdir(out,{recursive:true});
const result={errors:[],kind:'Real native recorded footage; input-only combat, no clip injection'},browser=await chromium.launch({channel:'chromium',headless:false});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.waitForSelector('.field-footage');assert.match(await page.locator('.ff-empty').innerText(),/NO FOOTAGE/);
 assert.equal(await page.locator('[data-action="play"]').isDisabled(),true);
 await page.screenshot({path:out+'/empty-selection.png'});
 await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 // Sparring emits real press coverage as the AI engages; attack through native inputs.
 await page.mouse.move(800,450);await page.mouse.down();await page.keyboard.down('w');
 await page.waitForTimeout(1800);await page.keyboard.up('w');await page.mouse.up();
 await page.waitForFunction(()=>PW.game.news?.clips?.some(c=>c.frames.some(f=>f?.startsWith('blob:'))),null,{timeout:35000});
 await page.keyboard.press('Tab');await page.waitForSelector('#pwTitle',{state:'visible'});
 await page.waitForFunction(()=>document.querySelector('.ff-empty')?.hidden===true,null,{timeout:10000});
 result.clips=await page.evaluate(()=>PW.game.news.clips.map(c=>({title:c.title,tag:c.tag,frames:c.frames.length,fps:c.fps,shotBy:c.shotBy})));
 assert.ok(result.clips.length>0);
 await page.locator('[data-action="play"]').click();assert.equal(await page.locator('[data-action="play"]').getAttribute('aria-label'),'Play footage');
 await page.locator('.ff-seek input').fill('5');await page.waitForTimeout(150);
 assert.equal(await page.locator('.ff-seek input').inputValue(),'5');
 await page.locator('.ff-controls select').selectOption('0.5');
 await page.locator('[data-action="loop"]').click();assert.equal(await page.locator('[data-action="loop"]').getAttribute('aria-pressed'),'false');
 await page.locator('.ff-screen').click();assert.equal(await page.locator('.field-footage').getAttribute('aria-modal'),'true');
 await page.screenshot({path:out+'/expanded-footage.png'});
 await page.keyboard.press('Escape');assert.equal(await page.locator('.field-footage').getAttribute('aria-modal'),null);
 await page.locator('[data-action="play"]').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>PW.hud.titleOpen&&!PW.game.running),true);
 const download=page.waitForEvent('download');await page.locator('[data-action="save"]').click();await (await download).saveAs(out+'/saved-still.png');
 // Character changes rebuild the menu; the player and playhead must survive that reparenting.
 await page.locator('.pwc[data-id="sol"]').click();assert.equal(await page.locator('.ff-seek input').inputValue(),'5');
 await page.screenshot({path:out+'/selection-footage.png',fullPage:true});
 for(const [width,height] of [[1280,720],[390,844]]){
  await page.setViewportSize({width,height});await page.locator('.field-footage').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.querySelector('#pwTitle').scrollWidth<=innerWidth),true);
  await page.screenshot({path:`${out}/selection-${width}.png`});
 }
 // Starting again hides the replay; previous footage remains available via the boot handoff.
 await page.setViewportSize({width:1600,height:1000});await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.running&&!PW.game._frontlinePreparing,null,{timeout:60000});
 await page.keyboard.press('Tab');await page.waitForSelector('#pwTitle',{state:'visible'});
 await page.waitForFunction(()=>document.querySelector('.ff-empty')?.hidden===true,null,{timeout:10000});
 assert.deepEqual(result.errors,[]);result.pass=true;
}catch(e){result.error=String(e);process.exitCode=1;}finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
