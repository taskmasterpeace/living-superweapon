// Isolated bank-only native material A/B. Baseline routes just the authoritative
// bed import and exposure name; every other current actor/camera/material is common.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='assets-src/frontline-convoy-bank-study/',out='artifacts/frontline-convoy-bank-native-ab',base='http://127.0.0.1:5180';
await mkdir(out,{recursive:true});
const substitutions=[['frontline-escarpment.js','frontline-convoy-bank-data.json','frontline-escarpment-data.json'],['frontline-terrain.js','geology-mask-convoy-bank.webp','geology-mask-escarpment.webp']];
for(const [name,candidate,baseline]of substitutions){
 const live=await readFile('src/engine/'+name,'utf8'),before=await readFile(root+'runtime-before/'+name,'utf8');
 assert.equal(live.replace(candidate,baseline),before,'Unrelated runtime changes invalidate isolated bank snapshot: '+name);
}
const browser=await chromium.launch({channel:'chromium',headless:false}),results={};
try{
 for(const variant of ['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1671,height:941}}),errors=[];await page.bringToFront();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(variant==='baseline')for(const [name,candidate,baseline]of substitutions)await page.route(`**/src/engine/${name}*`,async route=>{
   const response=await route.fetch(),body=await response.text();assert.ok(body.includes(candidate),'Baseline route did not find candidate dependency');
   await route.fulfill({response,body:body.replaceAll(candidate,baseline)});
  });
  await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline',encounter:'frontline'})));
  await page.goto(base+'/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
  await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady&&LSW.game.pwStage.convoy.ready&&LSW.game.pwStage.aircraft.ready,null,{timeout:60000});
  await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');
  await page.mouse.move(835,535,{steps:5});await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
  const read=()=>page.evaluate(()=>{
   const g=LSW.game,s=g.pwStage,hash=array=>{let h=2166136261;for(const b of new Uint8Array(array.buffer,array.byteOffset,array.byteLength))h=Math.imul(h^b,16777619);return(h>>>0).toString(16);};
   return {pos:g.player.pos.toArray(),alive:g.player.alive,pitch:g.world._lookPitch,yaw:g.world._lookYaw,range:g.world._chaseDist,fov:g.world._chaseFov,skins:s.frontlineRockCount,cover:g.world.coverAll.length,interiorHash:hash(g.world._ghBase),exteriorHash:hash(s.group.getObjectByName('frontline-distant-ground').geometry.attributes.position.array),near:s._cover.filter(c=>c.mesh.userData.frontlineFormation).map(c=>[c.x,c.z,c.top]),vehicles:s.convoy.vehicles.map(v=>({center:[v.cover.x,v.cover.z],matrix:v.mesh.matrixWorld.toArray()})),far:s.group.children.filter(o=>o.userData.frontlineDistant).map(o=>o.position.toArray())};
  });
  const before=await read();await page.screenshot({path:out+'/'+variant+'.png'});const after=await read();await page.keyboard.up('d');
  const timing=await page.evaluate(()=>new Promise(resolve=>{
   const g=LSW.game,times=[],start=performance.now();let previous;
   const frame=now=>{if(previous!==undefined)times.push(now-previous);previous=now;if(now-start<6000){requestAnimationFrame(frame);return;}
    const sorted=[...times].sort((a,b)=>a-b),mean=times.reduce((a,b)=>a+b,0)/times.length;
    resolve({label:'headed browser six-second real native W flight; actual AI active, not user-session FPS',frames:times.length,elapsed:now-start,mean,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),fps:1000/mean,alive:g.player.alive,drawCalls:g.world.renderer.info.render.calls,triangles:g.world.renderer.info.render.triangles,quality:g.world._quality,pixelRatio:g.world.renderer.getPixelRatio(),documentHidden:document.hidden});
   };requestAnimationFrame(frame);
  }));
  await page.keyboard.up('w');assert.ok(before.alive&&after.alive,'KO interrupted material frame');
  results[variant]={beforeScreenshot:before,afterScreenshot:after,timing,errors};
  if(variant==='candidate')results.contracts=await page.evaluate(async()=>{
   const g=LSW.game,w=g.world,s=g.pwStage,T=LSW.THREE,original=g.update;g.update=()=>w.render();w.resetTerrain();s.group.updateMatrixWorld(true);
   let crownError=0,crowns=0;for(const c of s._cover.filter(c=>c.mesh.userData.frontlineFormation||c.mesh.userData.frontlineTalus!==undefined)){
    const hit=new T.Raycaster(new T.Vector3(c.x,c.top+40,c.z),new T.Vector3(0,-1,0)).intersectObject(c.mesh)[0];if(!hit)throw Error('Missing physical crown');crownError=Math.max(crownError,Math.abs(hit.point.y-c.top));crowns++;
   }
   const raw=await fetch('/assets-src/frontline-convoy-bank-study/native-bed.f32').then(r=>r.arrayBuffer()),bed=new Float32Array(raw);let baseError=0;for(let i=0;i<bed.length;i++)baseError=Math.max(baseError,Math.abs(bed[i]-w._ghBase[i]));
   const checks=[];for(const [x,z]of [[-280,280],[-155,220],[-290,395]]){
    const before=w.heightAt(x,z);w.crater(x,z,30,4);const after=w.heightAt(x,z),hit=new T.Raycaster(new T.Vector3(x,180,z),new T.Vector3(0,-1,0)).intersectObject(w.ground)[0];checks.push({x,z,before,after,rayError:Math.abs(hit.point.y-after)});
   }
   const encounter=g.ms.frontline;encounter._syncTerrain();const markerErrors=encounter._groundMarkers.map(({mesh,lift})=>Math.abs(mesh.position.y-lift-w.heightAt(mesh.position.x,mesh.position.z)));
   const p=g.player;p.pos.set(-280,130,280);p.vel.set(0,0,0);p.flying=false;p.flyHeld=false;p.descendHeld=false;for(let i=0;i<240;i++)p.update(1/60,g);const landingError=Math.abs(p.pos.y-w.heightAt(p.pos.x,p.pos.z));
   w.resetTerrain();const resetExact=w._gh.every((h,i)=>h===bed[i]);g.update=original;
   return {label:'posed native physics contracts, not combat acceptance',crowns,crownError,baseError,checks,markerErrors,landingError,resetExact,arena:w.ARENA};
  });
  assert.deepEqual(errors,[]);await page.close();
 }
 const a=results.baseline.beforeScreenshot,b=results.candidate.beforeScreenshot,c=results.contracts;
 assert.notEqual(a.interiorHash,b.interiorHash);for(const key of ['exteriorHash','near','far','vehicles'])assert.deepEqual(a[key],b[key],`Bank changed ${key}`);
 assert.equal(c.baseError,0);assert.equal(c.crowns,27);assert.ok(c.crownError<.001);assert.ok(c.checks.every(v=>v.after<v.before-2&&v.rayError<.0001));assert.ok(c.markerErrors.every(v=>v<.0001));assert.ok(c.landingError<.0001);assert.ok(c.resetExact);assert.equal(c.arena,900);
 console.log(JSON.stringify(results));
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
