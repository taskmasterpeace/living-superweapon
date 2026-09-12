import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-readability';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5182/',{waitUntil:'domcontentloaded'});await page.waitForSelector('#hSelect.on');
 await page.locator('.scard').filter({has:page.locator('.snm',{hasText:/^VEGA$/})}).click();
 await page.waitForFunction(()=>document.querySelector('.selname')?.textContent==='VEGA');
 assert.ok(await page.locator('.selcombat [data-damage-type]').count());
 await page.screenshot({path:`${out}/selection-symbols.png`});
 await page.keyboard.press('Escape'); await page.locator('[data-encounter=practice]').click(); await page.locator('#pwGo').click();await page.waitForFunction(()=>LSW.game.running&&!LSW.game._frontlinePreparing,null,{timeout:120000});await page.waitForTimeout(1000);
 await page.bringToFront(); await page.mouse.click(720,450); await page.waitForFunction(()=>!!document.pointerLockElement); await page.keyboard.down('Space');await page.waitForTimeout(1700);await page.keyboard.up('Space');await page.waitForTimeout(500);
 const hover=await page.evaluate(()=>({hero:LSW.game.player.def.id,flying:LSW.game.player.flying,ankle:LSW.game.player._flightAnkle,y:LSW.game.player.pos.y}));
 console.log(JSON.stringify({hover,errors})); await page.screenshot({path:`${out}/hover.png`}); assert.ok(hover.flying&&hover.ankle>.4);
 await page.screenshot({path:`${out}/hover.png`});
 await page.keyboard.down('AltLeft');await page.mouse.move(1060,450);await page.waitForTimeout(350);await page.screenshot({path:`${out}/hover-side.png`});await page.keyboard.up('AltLeft');await page.waitForTimeout(250);
 await page.evaluate(()=>{window._speedSamples=[];window._speedTimer=setInterval(()=>{const p=LSW.game.player;_speedSamples.push({time:performance.now(),speed:p.vel.length(),gear:p.movementGear.gear,ankle:p._flightAnkle,booms:p._flightSense?.booms||0});},40);});
 await page.keyboard.down('KeyW');await page.waitForTimeout(700);
 for(let i=0;i<2;i++){await page.keyboard.down('ShiftLeft');await page.waitForTimeout(70);await page.keyboard.up('ShiftLeft');await page.waitForTimeout(70);}
 await page.keyboard.down('ShiftLeft');await page.waitForTimeout(1300);
 await page.screenshot({path:`${out}/boost.png`});await page.waitForTimeout(700);
 await page.keyboard.up('ShiftLeft');await page.keyboard.up('KeyW');await page.waitForTimeout(800);
 const result=await page.evaluate(()=>{clearInterval(_speedTimer);return {hover:null,samples:_speedSamples,errors:[...(LSW.game._errSeen||[])],booms:LSW.game.player._flightSense?.booms||0};});
 result.hover=hover;await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));
 assert.ok(result.samples.some(s=>s.gear===3));assert.ok(result.booms>0);assert.deepEqual(errors,[]);assert.deepEqual(result.errors,[]);
 await page.screenshot({path:`${out}/recovery.png`});
 await page.keyboard.down('ControlLeft');await page.waitForFunction(()=>!LSW.game.player.flying,null,{timeout:15000});await page.keyboard.up('ControlLeft');
 await page.waitForFunction(()=>LSW.game.player._flightAnkle===0);await page.waitForTimeout(900);await page.screenshot({path:`${out}/landed.png`});
 await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 // Presentation-only check: open the existing HUD codex; combat remains covered by native input above.
 await page.evaluate(()=>LSW.hud.showDamage());await page.screenshot({path:`${out}/damage-codex-mobile.png`});
 assert.equal(await page.locator('.dgtag [data-damage-type]').count(),8);
 console.log(JSON.stringify({hover,booms:result.booms,peakSpeed:Math.max(...result.samples.map(s=>s.speed)),errors}));
}finally{await context.close();await page.video().saveAs(`${out}/native-flight.webm`);await browser.close();}
