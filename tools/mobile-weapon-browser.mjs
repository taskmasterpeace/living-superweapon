import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/mobile-weapons-2026-09-10';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1}),page=await context.newPage(),errors=[],result={};
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=recon');await page.locator('[data-encounter="practice"]').tap();await page.locator('#pwGo').tap();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing&&PW.game.touch.enabled,null,{timeout:90000});
 await page.waitForFunction(()=>document.querySelector('.ps-portrait img').naturalWidth>0);
 assert.equal(await page.locator('#hud .combat-dock').isVisible(),false);assert.equal(await page.locator('#hRotate').isVisible(),false);
 result.stage='rifle tap';await page.locator('#touch [data-b="q"]').tap();
 await page.waitForFunction(()=>PW.game.player._selSlot==='q'&&PW.game.player.slots.q.ammo?.loaded<5);
 assert.equal(await page.locator('#touch [data-b="scope"]').isVisible(),true);
 await page.screenshot({path:`${out}/portrait.png`});
 const box=await page.locator('#touch [data-b="scope"]').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await page.waitForFunction(()=>PW.game.player._scopeHeld);await page.waitForTimeout(350);result.scope=await page.evaluate(()=>({held:PW.game.player._scopeHeld,secondaryCharging:PW.game.player.slots.rmb.charging}));await page.mouse.up();await page.waitForFunction(()=>!PW.game.player._scopeHeld);
 await page.locator('#touch [data-b="reload"]').tap();await page.waitForFunction(()=>!!PW.game.player._firearmReload);result.reload=await page.evaluate(()=>PW.game.player._firearmReload.key);await page.screenshot({path:`${out}/reload.png`});
 for(const size of [{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){await page.setViewportSize(size);await page.waitForTimeout(300);const rows=await page.locator('#touch .tpad .tbtn:visible').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {id:b.dataset.b,label:b.getAttribute('aria-label'),x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}));assert.ok(rows.every(r=>r.x>=0&&r.y>=0&&r.right<=size.width&&r.bottom<=size.height),JSON.stringify(rows));assert.ok(rows.every(r=>r.w>=44&&r.h>=44));result[size.width]=rows;await page.screenshot({path:`${out}/${size.width}x${size.height}.png`});}
 await page.evaluate(()=>PW.game.touch.show(false));assert.equal(await page.locator('#touch').isVisible(),false,'disabled controls cover a report/menu');
 assert.equal(result.reload,'q');assert.equal(result.scope.secondaryCharging,false);assert.deepEqual(errors,[]);result.passed=true;
}catch(e){result.failure=String(e);result.last=await page.evaluate(()=>({slot:PW.game.player._selSlot,ammo:PW.game.player.slots.q.ammo,cur:PW.game.touch.cur,pad:PW.game.pad.cur,phase:PW.game.player.slots.q.phase})).catch(()=>null);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{result.errors=errors;await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));await context.close();await browser.close();}
