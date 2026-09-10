// Supplemental UI-only fixtures; NOT evidence of gameplay or camera recording.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chromium'}),result={kind:'UI fixtures for deck/keyboard/modal lifecycle',errors:[]};
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForSelector('.field-footage');
 await page.evaluate(async()=>{
  const blob=await (await fetch('/artifacts/field-footage/saved-still.png')).blob();
  PW.game._fieldClips=[{title:'First test clip',tag:'standup',fps:12,frames:Array.from({length:24},()=>URL.createObjectURL(blob))},{title:'Second test clip',tag:'ko',fps:12,frames:Array.from({length:24},()=>URL.createObjectURL(blob))}];
 });
 await page.waitForFunction(()=>document.querySelector('.ff-empty').hidden);
 assert.equal(await page.locator('.ff-caption strong').innerText(),'Second test clip');
 await page.locator('[data-action="next"]').click();assert.equal(await page.locator('.ff-caption strong').innerText(),'First test clip');
 await page.locator('[data-action="previous"]').click();assert.equal(await page.locator('.ff-caption strong').innerText(),'Second test clip');
 await page.locator('.ff-screen').click();
 const opt=await page.locator('#pwOpt').boundingBox();await page.mouse.click(opt.x+opt.width/2,opt.y+opt.height/2);
 assert.equal(await page.evaluate(()=>!!PW.hud.overlayOpen()),false,'Expanded viewer must block underlying Options click');
 if(await page.locator('.field-footage').getAttribute('aria-modal'))await page.keyboard.press('Escape');
 await page.locator('.ff-screen').click();await page.locator('.ff-list button').last().focus();await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.closest('.field-footage')!==null),true,'Focus remains in expanded viewer');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.field-footage').getAttribute('aria-modal'),null);
 await page.evaluate(()=>{for(const c of PW.game._fieldClips)c._dead=true;});
 await page.waitForFunction(()=>document.querySelector('.ff-count').textContent==='0 CLIPS');
 assert.equal(await page.locator('[data-action="save"]').isDisabled(),true);
 assert.deepEqual(result.errors,[]);result.pass=true;
}catch(e){result.error=String(e);process.exitCode=1;}finally{console.log(result);await writeFile('artifacts/field-footage/ui-results.json',JSON.stringify(result,null,2));await browser.close();}
