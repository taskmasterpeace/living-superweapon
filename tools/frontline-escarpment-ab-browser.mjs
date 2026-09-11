// Separate structural A/B: immutable prior layout/ground/loader versus the
// reviewed kit and bed, both using the accepted current materials and actors.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.LSW_ART_AB_OUT||'artifacts/frontline-escarpment-native-ab',base='http://127.0.0.1:5180';await mkdir(out,{recursive:true});
const snapshot=process.env.LSW_ART_AB_SNAPSHOT||'frontline-escarpment-study',modules=(process.env.LSW_ART_AB_MODULES||'frontline-ground.js,frontline-terrain.js,frontline-layout.js,powerworld.js').split(',');
const browser=await chromium.launch({channel:'chromium'}),results={};
try{
 for(const variant of ['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1671,height:941}}),errors=[];await page.bringToFront();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(variant==='baseline')for(const name of modules)await page.route(`**/src/engine/${name}*`,async route=>{
   const response=await page.request.get(`${base}/assets-src/${snapshot}/runtime-before/${name}`);assert.ok(response.ok());await route.fulfill({contentType:'application/javascript',body:await response.text()});
  });
  await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline',encounter:'frontline'})));
  await page.goto(base+'/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
  await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady&&LSW.game.pwStage.convoy.ready&&LSW.game.pwStage.aircraft.ready,null,{timeout:60000});
  await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');
  await page.mouse.move(835,535,{steps:5});await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
  const read=()=>page.evaluate(()=>{
   const g=LSW.game,s=g.pwStage,cliff=s.group.children.find(o=>o.userData.frontlineFormation);
   const hash=array=>{let h=2166136261;for(const b of new Uint8Array(array.buffer,array.byteOffset,array.byteLength))h=Math.imul(h^b,16777619);return (h>>>0).toString(16);};
   return {pos:g.player.pos.toArray(),alive:g.player.alive,pitch:g.world._lookPitch,yaw:g.world._lookYaw,range:g.world._chaseDist,fov:g.world._chaseFov,ground:g.world.ground.material.customProgramCacheKey(),cliff:cliff.material.customProgramCacheKey(),rocks:s.frontlineRockCount,cover:g.world.coverAll.length,profile:cliff.geometry.userData.frontlineMesa,assetError:s.frontlineError,
    interiorHash:hash(g.world._ghBase),exteriorHash:hash(s.group.getObjectByName('frontline-distant-ground').geometry.attributes.position.array),near:s._cover.filter(c=>c.mesh.userData.frontlineFormation).map(c=>[c.x,c.z,c.top]),vehicles:s.convoy.vehicles.map(v=>[v.cover.x,v.cover.z]),far:s.group.children.filter(o=>o.userData.frontlineDistant).map(o=>o.geometry.userData.frontlineMesa)};
  });
  const before=await read();await page.screenshot({path:out+'/'+variant+'.png'});const after=await read();await page.keyboard.up('d');
  const timing=await page.evaluate(()=>new Promise(resolve=>{
   const g=LSW.game,times=[],start=performance.now(),first=g.player.pos.toArray();let previous;
   const frame=now=>{if(previous!==undefined)times.push(now-previous);previous=now;if(now-start<6000){requestAnimationFrame(frame);return;}
    const sorted=[...times].sort((a,b)=>a-b),mean=times.reduce((a,b)=>a+b,0)/times.length;
    resolve({label:'six-second foreground native W flight; real AI and simulation active',frames:times.length,elapsed:now-start,mean,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),fps:1000/mean,start:first,end:g.player.pos.toArray(),alive:g.player.alive,drawCalls:g.world.renderer.info.render.calls,triangles:g.world.renderer.info.render.triangles,quality:g.world._quality,pixelRatio:g.world.renderer.getPixelRatio(),documentHidden:document.hidden});
   };requestAnimationFrame(frame);
  }));
  await page.keyboard.up('w');assert.ok(before.alive&&after.alive,'Player KO interrupted structural frame');assert.deepEqual(errors,[]);
  results[variant]={beforeScreenshot:before,afterScreenshot:after,timing,errors};await page.close();
 }
 console.log(JSON.stringify(results));
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
