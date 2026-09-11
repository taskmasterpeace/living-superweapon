// Real menu/flight input comparison. The baseline route disables only the new
// bank delta; both variants retain scanned chips and all other current runtime.
// This isolates authored landform read, not historical whole-scene differences.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const materialAB=process.env.LSW_MATERIAL_AB==='1';
const out=materialAB?'artifacts/frontline-ground-material-native-ab':'artifacts/frontline-ground-native-ab';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),results={};
try{
 for(const variant of ['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1671,height:941}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  if(variant==='baseline'){
   if(materialAB)await page.route('**/src/engine/frontline-surface.js*',async route=>{
    const response=await page.request.get('http://127.0.0.1:5180/assets-src/frontline-ground-material/surface-before.js');
    await route.fulfill({contentType:'application/javascript',body:await response.text()});
   });
   else await page.route('**/src/engine/frontline-bank.js*',route=>route.fulfill({contentType:'application/javascript',body:'export function sampleFrontlineBankDelta(){return 0;}'}));
  }
  await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline',encounter:'frontline'})));
  await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
  await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady&&LSW.game.pwStage.convoy.ready&&LSW.game.pwStage.aircraft.ready,null,{timeout:60000});
  await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');
  await page.mouse.move(835,535,{steps:5});await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
  await page.screenshot({path:out+'/'+variant+'.png'});await page.keyboard.up('d');
  const sample=await page.evaluate(()=>({pos:LSW.game.player.pos.toArray(),pitch:LSW.game.world._lookPitch,range:LSW.game.world._chaseDist,fov:LSW.game.world._chaseFov,alive:LSW.game.player.alive,peak:Math.max(...LSW.game.world._ghBase),nearChips:LSW.game.pwStage.group.getObjectByName('frontline-surface-chips').count,groundMaterial:LSW.game.world.ground.material.customProgramCacheKey()}));
  assert.ok(sample.alive,'Native flight was interrupted before the comparison frame');assert.equal(sample.nearChips,3600);
  let performanceSample=null;
  if(variant==='candidate')performanceSample=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[],end=performance.now()+6000;let last=performance.now();
   const tick=now=>{frames.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);else{frames.sort((a,b)=>a-b);resolve({frames:frames.length,median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],ema:LSW.game.world._ema,quality:LSW.game.world._qTier});}};requestAnimationFrame(tick);
  }));
  await page.keyboard.up('w');assert.deepEqual(errors,[]);results[variant]={sample,performance:performanceSample,errors};await page.close();
 }
 console.log(JSON.stringify(results));
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
