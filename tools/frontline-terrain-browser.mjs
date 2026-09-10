import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.LSW_TEST_OUT||'artifacts/frontline-terrain-native',base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 // Deliberately let the cliff finish first: geometry type changes at adoption,
 // so a late boulder callback must not reskin an already-adopted cliff.
 await page.route('**/boulder-04.glb',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue();});
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1})));
 await page.goto(base+'/powerworld.html');await page.locator('#pwEncounter [data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement,{},{polling:100});
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>80,{},{polling:100});await page.keyboard.up('Space');
 await page.mouse.move(800,465,{steps:3});await page.keyboard.down('w');await page.waitForTimeout(550);await page.screenshot({path:`${out}/flight.png`});await page.keyboard.up('w');
 result.flight=await page.evaluate(()=>{
  const g=LSW.game,s=g.pwStage,T=LSW.THREE;let witnesses=0;
  for(const c of s._cover.filter(c=>!c.frontlineVehicle)){if(!c.destroyed){const bounds=new T.Box3().setFromObject(c.mesh,true);if(bounds.min.x<c.x-c.hx-.001||bounds.max.x>c.x+c.hx+.001||bounds.min.z<c.z-c.hz-.001||bounds.max.z>c.z+c.hz+.001||bounds.max.y>c.top+.001)throw Error('Scanned mesh escaped cover bounds: '+JSON.stringify({x:c.x,z:c.z,hx:c.hx,hz:c.hz,top:c.top,position:c.mesh.position.toArray(),scale:c.mesh.scale.toArray(),min:bounds.min.toArray(),max:bounds.max.toArray()}));}witnesses++;}
  const talus=s._cover.filter(c=>c.mesh.userData.frontlineTalus!==undefined);let crownError=0;
  for(const c of talus){
   if(!c.mesh.geometry.userData.frontlineTalus)throw Error('Talus fallback was not replaced');
   const hit=new T.Raycaster(new T.Vector3(c.x,c.top+40,c.z),new T.Vector3(0,-1,0)).intersectObject(c.mesh)[0];
   if(!hit)throw Error('Missing talus landing crown');crownError=Math.max(crownError,Math.abs(hit.point.y-c.top));
  }
  const mesas=s._cover.filter(c=>c.mesh.userData.frontlineFormation);let mesaCrownError=0;
  for(const c of mesas){
   const hit=new T.Raycaster(new T.Vector3(c.x,c.top+40,c.z),new T.Vector3(0,-1,0)).intersectObject(c.mesh)[0];
   if(!hit)throw Error('Missing mesa landing crown');mesaCrownError=Math.max(mesaCrownError,Math.abs(hit.point.y-c.top));
  }
  return {ready:s.frontlineReady,rocks:s.frontlineRockCount,coverWitnesses:witnesses,totalCover:g.world.coverAll.length,talus:talus.length,crownError,mesas:mesas.length,mesaCrownError,position:g.player.pos.toArray(),ema:g.world._ema,print:g.world.print.settings,assetError:s.frontlineError||null};
 });
 assert.equal(result.flight.rocks,55);assert.equal(result.flight.assetError,null);assert.equal(result.flight.print.ink,0);
 assert.equal(result.flight.talus,12);assert.ok(result.flight.crownError<.001,'Native talus top floats above scanned stone crown');
 assert.equal(result.flight.mesas,15);assert.ok(result.flight.mesaCrownError<.001,'Native mesa top floats above its central rock crown');
 // Posed native-crater fixture, not a manual combat victory: settle bodies with
 // native physics, sync the real objective markers and freeze the camera only.
 result.craterFixture=await page.evaluate(()=>{
  const g=LSW.game,w=g.world,e=g.ms.frontline,p=g.player,T=LSW.THREE;
  window._frontlineGroundUpdate=g.update;g.update=()=>w.render();
  w.resetTerrain();const at=e.casePosition.clone();w.crater(at.x,at.z,30,5);
  p.pos.copy(at).add(new T.Vector3(8,10,0));p.flying=false;p.gait='grounded';p.flyHeld=false;p.descendHeld=false;p.vel.set(0,0,0);
  for(const f of [p,...e.soldiers]){f.flying=false;f.flyHeld=false;f.descendHeld=false;for(let i=0;i<180;i++)f.update(1/60,g);}
  e._syncTerrain();w.camera.position.copy(at).add(new T.Vector3(44,35,50));w.camera.lookAt(at.x,at.y+1,at.z);w.camera.updateMatrixWorld(true);w.render();
  const a=w.groundGeo.attributes.position;let displaced=0,maxVertexError=0;
  w.ground.updateWorldMatrix(true,false);
  for(let i=0;i<a.count;i++)if(Math.abs(a.getZ(i)-w._ghBase[i])>.001){displaced++;const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(w.ground.matrixWorld);maxVertexError=Math.max(maxVertexError,Math.abs(v.y-w.heightAt(v.x,v.z)));}
  const markerErrors=e._groundMarkers.map(({mesh,lift})=>Math.abs(mesh.position.y-lift-w.heightAt(mesh.position.x,mesh.position.z)));
  const far=g.pwStage.group.getObjectByName('frontline-distant-ground'),ray=new T.Raycaster(new T.Vector3(at.x,20,at.z),new T.Vector3(0,-1,0));
  return {label:'posed native crater and grounded-body fixture',displaced,maxVertexError,markerErrors,playerY:p.pos.y,playerGround:w.heightAt(p.pos.x,p.pos.z),
   physicalGeometryVisible:w.ground.parent===g.pwStage.group,normalsFlushed:!w._normalsDirty,distantHits:ray.intersectObject(far).length,
   materialShared:far.material===w.ground.material,textureLoaded:!!w.ground.material.map?.image,arena:w.ARENA,heightfieldSpan:w._ghArena};
 });
 assert.ok(result.craterFixture.displaced>20);assert.ok(result.craterFixture.maxVertexError<.0001);
 assert.ok(result.craterFixture.markerErrors.every(v=>v<.0001));assert.ok(Math.abs(result.craterFixture.playerY-result.craterFixture.playerGround)<.0001);
 assert.equal(result.craterFixture.physicalGeometryVisible,true);assert.equal(result.craterFixture.normalsFlushed,true);assert.equal(result.craterFixture.distantHits,0);
 assert.equal(result.craterFixture.materialShared,true);assert.equal(result.craterFixture.textureLoaded,true);assert.equal(result.craterFixture.arena,900);
 await page.screenshot({path:`${out}/ground-crater-fixture.png`});
 result.hillsideFixture=await page.evaluate(()=>{
  const g=LSW.game,w=g.world,p=g.player;
  p.pos.set(250,120,200);p.vel.set(0,0,0);p.flying=false;p.flyHeld=false;p.descendHeld=false;
  for(let i=0;i<240;i++)p.update(1/60,g);
  const hillside={position:p.pos.toArray(),ground:w.heightAt(p.pos.x,p.pos.z),grounded:p.grounded};
  const c=g.pwStage._cover.find(c=>c.h>120&&!c.destroyed);
  p.pos.set(c.x,c.top+15,c.z);p.vel.set(0,0,0);p.flying=false;p.flyHeld=false;p.descendHeld=false;
  for(let i=0;i<240;i++)p.update(1/60,g);
  return {label:'posed native physics hillside and mesa landing fixture',hillside,mesa:{top:c.top,y:p.pos.y,onBlock:!!p.onBlock},authoredPeak:Math.max(...w._ghBase)};
 });
 assert.ok(result.hillsideFixture.hillside.ground>4);assert.ok(Math.abs(result.hillsideFixture.hillside.position[1]-result.hillsideFixture.hillside.ground)<.0001);
 assert.ok(result.hillsideFixture.mesa.onBlock);assert.ok(Math.abs(result.hillsideFixture.mesa.y-result.hillsideFixture.mesa.top)<.0001);
 // Native stage close/reopen, including in-flight asset callbacks. No loader mocking.
 result.rematch=await page.evaluate(async()=>{
  const g=LSW.game;g.startMode('powerworld',{p1:'vega',p2:'kano'});const stale=g.pwStage.group,loading=g.pwStage.preparation.promise;
  g.startMode('powerworld',{p1:'vega',p2:'kano'});await Promise.all([loading,g.pwStage.preparation.promise]);
  let playable=0,distant=0;g.world.scene.traverse(o=>{if(o.name==='frontline-playable-ground')playable++;if(o.name==='frontline-distant-ground')distant++;});
  const result={ready:g.pwStage.frontlineReady,rocks:g.pwStage.frontlineRockCount,cover:g.pwStage._cover.filter(c=>!c.frontlineVehicle).length,totalCover:g.world.coverAll.length,playable,distant,staleDetached:!stale.parent,
   ownsGround:g.world.ground.parent===g.pwStage.group,baseRestored:g.world._gh.every((h,i)=>h===g.world._ghBase[i]),authoredRelief:g.world._ghBase.some(h=>h>15)};
  g.update=window._frontlineGroundUpdate;delete window._frontlineGroundUpdate;return result;
 });
 assert.equal(result.rematch.ready,true);assert.equal(result.rematch.cover,result.flight.coverWitnesses);assert.equal(result.rematch.cover,37);
 assert.equal(result.rematch.playable,1);assert.equal(result.rematch.distant,1);assert.equal(result.rematch.staleDetached,true);assert.equal(result.rematch.ownsGround,true);assert.equal(result.rematch.baseRestored,true);assert.equal(result.rematch.authoredRelief,true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(e){result.failure=e.message;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
