// Native loading cancellation/rematch witness, not a performance benchmark.
// One network response is held to make the cancellation window reproducible.
// No stage/game-state writes, simulation stepping, or disabled AI/news.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(process.env.LSW_PREPARATION_OUT||'artifacts/frontline-preparation-native');
await mkdir(out,{recursive:true});
const result={fixture:'Held boulder response + native loading dialog cancel + native reentry'},errors=[];
let releaseAsset,assetSeen=false,browser,page;
const heldAsset=new Promise(resolve=>releaseAsset=resolve);
const deadline=setTimeout(()=>page?.close().catch(()=>{}),90000);
try{
 browser=await chromium.launch({channel:'chromium'});page=await browser.newPage({viewport:{width:1600,height:900}});
 page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/models/frontline/boulder-04.glb*',async route=>{assetSeen=true;await heldAsset;await route.continue().catch(()=>{});});
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:1.25,cameraPreset:'frontline'})));
 await page.goto((process.env.LSW_TEST_URL||'http://127.0.0.1:5180')+'/powerworld.html');
 await page.locator('#pwEncounter [data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.locator('#frontlinePreparing').waitFor({state:'visible'});
 await page.waitForFunction(()=>LSW.game._frontlinePreparing?.status==='assets');
 const waitUntil=Date.now()+5000;while(!assetSeen&&Date.now()<waitUntil)await page.waitForTimeout(25);
 assert.equal(assetSeen,true,'The controlled asset request never reached the browser route');
 result.loading=await page.evaluate(()=>{
  const g=LSW.game,s=g.pwStage;
  window.__cancelWitness={task:s.preparation,group:s.group};
  return{ready:s.frontlineReady,time:g.time,pos:g.player.pos.toArray(),status:s.preparation.status};
 });
 // Deliberate loading-state input tests the guard; ordinary gameplay harnesses
 // wait graphics-ready before dispatching this verb.
 await page.keyboard.press('Space');await page.waitForTimeout(200);
 result.gated=await page.evaluate(()=>({time:LSW.game.time,pos:LSW.game.player.pos.toArray(),ready:LSW.game.pwStage.frontlineReady}));
 assert.equal(result.gated.time,result.loading.time);assert.deepEqual(result.gated.pos,result.loading.pos);assert.equal(result.gated.ready,false);
 await page.screenshot({path:resolve(out,'loading.png')});
 await page.locator('#frontlinePreparing button').click();await page.locator('#pwGo').waitFor({state:'visible'});
 result.canceled=await page.evaluate(()=>({gate:!!LSW.game._frontlinePreparing,status:window.__cancelWitness.task.status,
  detached:!window.__cancelWitness.group.parent,dialogs:document.querySelectorAll('#frontlinePreparing').length}));
 assert.deepEqual(result.canceled,{gate:false,status:'cancelled',detached:true,dialogs:0});
 releaseAsset();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
 result.rematch=await page.evaluate(async()=>{
  const g=LSW.game,s=g.pwStage,old=window.__cancelWitness;
  return{oldResult:await old.task.promise,oldDetached:!old.group.parent,ready:s.frontlineReady,
   gate:!!g._frontlinePreparing,dialogs:document.querySelectorAll('#frontlinePreparing').length,
   vehicles:s.convoy.vehicles.length,aircraft:s.aircraft.actors.length,
   convoyGroups:g.scene.children.filter(o=>o.name==='frontline-convoy').length,
   aircraftGroups:g.scene.children.filter(o=>o.name==='frontline-air-support').length,
   clones:g.ms.frontline.soldiers.length,allAI:g.ms.frontline.soldiers.every(f=>!!f.ai)};
 });
 assert.equal(result.rematch.oldResult,false);assert.equal(result.rematch.oldDetached,true);assert.equal(result.rematch.ready,true);
 assert.equal(result.rematch.gate,false);assert.equal(result.rematch.dialogs,0);assert.equal(result.rematch.vehicles,3);
 assert.equal(result.rematch.aircraft,2);assert.equal(result.rematch.convoyGroups,1);assert.equal(result.rematch.aircraftGroups,1);
 assert.equal(result.rematch.clones,4);assert.equal(result.rematch.allAI,true);
 await page.screenshot({path:resolve(out,'ready-rematch.png')});assert.deepEqual(errors,[]);result.success=true;
}catch(error){result.success=false;result.failure={message:error.message,stack:error.stack};process.exitCode=1;
}finally{
 releaseAsset();await browser?.close().catch(()=>{});clearTimeout(deadline);result.errors=errors;
 await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
