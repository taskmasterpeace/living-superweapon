// Isolated live cliff-shader A/B. Current geometry, ground, camera, actors and
// lighting stay identical in code; baseline routes only the immutable shader.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/frontline-cliff-material-native-ab';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),results={};
try{
 for(const variant of ['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1671,height:941}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(variant==='baseline')await page.route('**/src/engine/frontline-surface.js*',async route=>{
   const response=await page.request.get('http://127.0.0.1:5180/assets-src/frontline-cliff-normal/surface-before.js');await route.fulfill({contentType:'application/javascript',body:await response.text()});
  });
  await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline',encounter:'frontline'})));
  await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
  await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady&&LSW.game.pwStage.convoy.ready&&LSW.game.pwStage.aircraft.ready,null,{timeout:60000});
  await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');
  await page.mouse.move(835,535,{steps:5});await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
  const read=()=>page.evaluate(()=>{
   const g=LSW.game,cliff=g.pwStage.group.children.find(o=>o.userData.frontlineFormation);
   return {pos:g.player.pos.toArray(),alive:g.player.alive,pitch:g.world._lookPitch,range:g.world._chaseDist,fov:g.world._chaseFov,ground:g.world.ground.material.customProgramCacheKey(),cliff:cliff.material.customProgramCacheKey()};
  });
  const before=await read();await page.screenshot({path:out+'/'+variant+'.png'});const after=await read();await page.keyboard.up('d');await page.keyboard.up('w');
  assert.ok(before.alive&&after.alive,'Player KO interrupted the material frame');assert.deepEqual(errors,[]);
  results[variant]={beforeScreenshot:before,afterScreenshot:after,errors};await page.close();
 }
 console.log(JSON.stringify(results));
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
