import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-flight-showcase';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1671,height:941},recordVideo:{dir:out,size:{width:1671,height:941}}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline',encounter:'frontline'})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady&&LSW.game.pwStage.convoy.ready&&LSW.game.pwStage.aircraft.ready);
 await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');
 // The actual mouse-look input looks down over the valley; no camera or actor writes.
 await page.mouse.move(835,535,{steps:5});await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
 await page.screenshot({path:out+'/flight.png'});await page.keyboard.up('d');
 result.sample=await page.evaluate(()=>({pos:LSW.game.player.pos.toArray(),pitch:LSW.game.world._lookPitch,alive:LSW.game.player.alive,range:LSW.game.world._chaseDist,terrain:LSW.game.pwStage.frontlineReady}));
 assert.ok(result.sample.alive);assert.equal(result.sample.range,20);
 result.performance=await page.evaluate(()=>new Promise(resolve=>{const frames=[],end=performance.now()+6000;let last=performance.now();const tick=now=>{frames.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);else{frames.sort((a,b)=>a-b);resolve({frames:frames.length,median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],ema:LSW.game.world._ema,quality:LSW.game.world._qTier,renderer:LSW.game.world.renderer.info.render});}};requestAnimationFrame(tick);}));
 await page.keyboard.up('w');await page.screenshot({path:out+'/flight-end.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await writeFile(out+'/results.json',JSON.stringify({...result,errors},null,2));await page.context().close();await browser.close();}
