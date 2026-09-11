import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const output='artifacts/dual-trigger';await mkdir(output,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:1280,height:800}}}),page=await context.newPage(),errors=[];
page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const {game:g,SETTINGS,hud}=LSW;SETTINGS.scheme='classic';g.startMode('powerworld',{p1:'sol',p2:'kano'});hud.setPlayer(g.player.def);
  for(const f of g.entities){f.ai=null;if(f!==g.player)f.pos.set(0,24,95);}
  g.player.pos.set(0,24,0);g.player.flying=true;g.player.gait='airborne';g.player.level=10;g.player.invuln=999;g.player.energyInfinite=true;
  g.world._lookYaw=0;g.world._lookPitch=0;g.world._lookActive=true;g.hardLock=null;g.news.enabled=false;g.news.grp.visible=false;hud.hintFull(false);
 });
 await page.mouse.move(710,420);await page.mouse.wheel(0,100);await page.waitForFunction(()=>LSW.game.player._selSlot==='rmb');
 assert.equal(await page.evaluate(()=>LSW.game.player.def.id),'sol');
 // RMB+wheel arrives in one event batch, then key-up before the next tick still owns secondary.
 await page.evaluate(()=>{const c=LSW.game.world.renderer.domElement;c.dispatchEvent(new MouseEvent('mousedown',{button:2,bubbles:true}));c.dispatchEvent(new WheelEvent('wheel',{deltaY:100,buttons:2,bubbles:true,cancelable:true}));dispatchEvent(new MouseEvent('mouseup',{button:2,bubbles:true}));});
 await page.waitForFunction(()=>LSW.game.player._selSecondary==='q');
 assert.equal(await page.evaluate(()=>LSW.game.player.slots.q.cd),0);
 await page.mouse.down({button:'right'});await page.mouse.wheel(0,100);await page.waitForFunction(()=>LSW.game.player._selSecondary==='e');await page.mouse.up({button:'right'});
 assert.equal(await page.evaluate(()=>LSW.game.player.slots.e.cd),0);
 await page.mouse.click(710,420,{button:'right'});await page.waitForFunction(()=>LSW.game.player.slots.e.cd>0);
 const shot=await page.evaluate(()=>({hero:LSW.game.player.def.id,primary:LSW.game.player._selSlot,secondary:LSW.game.player._selSecondary,cooldown:LSW.game.player.slots.e.cd}));
 await page.mouse.wheel(0,-100);await page.waitForFunction(()=>LSW.game.player._selSlot==='lmb');
 await page.keyboard.down('KeyD');await page.mouse.down();await page.waitForFunction(()=>LSW.game.player.slots.lmb.active?.sustaining);
 await page.waitForTimeout(2200);await page.screenshot({path:output+'/moving-eye-beam.png'});await page.mouse.up();await page.keyboard.up('KeyD');
 await page.waitForFunction(()=>!LSW.game.player.slots.lmb.active&&LSW.game.player.slots.lmb.cd<=0);
 await page.mouse.down();await page.waitForFunction(()=>LSW.game.player.slots.lmb.active?.sustaining);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>LSW.game.running),false);
 await page.mouse.up();await page.keyboard.press('Escape');await page.waitForFunction(()=>LSW.game.running);
 assert.equal(await page.evaluate(()=>!!LSW.game.player.slots.lmb.active?.sustaining),false);
 await page.screenshot({path:output+'/two-trigger-hud.png'});
 const hud=await page.locator('.trigger-pair').innerText();assert.match(hud,/LMB/);assert.match(hud,/RMB/);assert.match(hud,/Heat Ray/);assert.match(hud,/Solar Flare/);
 await page.setViewportSize({width:960,height:640});await page.waitForTimeout(250);await page.screenshot({path:output+'/compact-hud.png'});
 const fits=await page.locator('.trigger-pair').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,rect:el.getBoundingClientRect().toJSON()}));assert.ok(fits.scroll<=fits.width+1);
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/studio.html?hero=sol');await page.waitForSelector('[data-tab="camera"]');await page.locator('[data-tab="camera"]').click();
 await page.locator('[data-broadcast="crashZoom"][type="number"]').fill('0.4');await page.locator('[data-broadcast="crashZoom"][type="number"]').press('Tab');
 await page.reload();await page.waitForSelector('[data-tab="camera"]');await page.locator('[data-tab="camera"]').click();
 assert.equal(Number(await page.locator('[data-broadcast="crashZoom"][type="number"]').inputValue()),0.4);await page.locator('#broadcast-export').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/studio-correspondent.png'});
 assert.deepEqual(errors,[]);await writeFile(output+'/results.json',JSON.stringify({shot,hud,fits,pauseEndsBeam:true,studioSaved:true,errors},null,2));console.log(JSON.stringify({shot,fits,pauseEndsBeam:true,studioSaved:true,errors},null,2));
}catch(e){await page.screenshot({path:output+'/failure.png'});console.error(await page.evaluate(()=>window.LSW?{errors:LSW.game._errors,sel:LSW.game.player?._selSlot,secondary:LSW.game.player?._selSecondary}:{}));throw e;}
finally{await context.close();await browser.close();}
