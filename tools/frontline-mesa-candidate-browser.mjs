// Candidate-only asset interception: production GLB and source URLs stay intact.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-mesa-candidate',results={};await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});
try{
 for(const candidate of [false,true]){
  const label=candidate?'candidate':'current',page=await browser.newPage({viewport:{width:1671,height:941}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(candidate)await page.route('**/eroded-mesa-kit.glb',r=>r.fulfill({path:'assets-src/frontline-mesas-candidate/eroded-mesa-kit.glb',contentType:'model/gltf-binary'}));
  await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline',encounter:'frontline'})));
  await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
  await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady&&LSW.game.pwStage.convoy.ready&&LSW.game.pwStage.aircraft.ready);
  await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');
  await page.mouse.move(835,535,{steps:5});await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
  await page.screenshot({path:`${out}/native-${label}.png`});await page.keyboard.up('d');await page.keyboard.up('w');
  results[label]=await page.evaluate(()=>({position:LSW.game.player.pos.toArray(),pitch:LSW.game.world._lookPitch,range:LSW.game.world._chaseDist,alive:LSW.game.player.alive,skins:LSW.game.pwStage.frontlineRockCount,ema:LSW.game.world._ema,quality:LSW.game.world._qTier}));
  results[label].crowns=await page.evaluate(()=>{
   const T=LSW.THREE,s=LSW.game.pwStage;
   return s._cover.filter(c=>c.mesh.userData.frontlineFormation).map(c=>{
    const hit=new T.Raycaster(new T.Vector3(c.x,c.top+20,c.z),new T.Vector3(0,-1,0)).intersectObject(c.mesh)[0];
    return {x:c.x,z:c.z,top:c.top,error:hit?c.top-hit.point.y:null};
   });
  });
  results[label].errors=errors;assert.ok(results[label].alive);assert.deepEqual(errors,[]);await page.close();
 }
}finally{await writeFile(`${out}/native-results.json`,JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results));
