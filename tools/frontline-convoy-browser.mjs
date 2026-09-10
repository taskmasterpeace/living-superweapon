import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='artifacts/frontline-convoy-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1671,height:941},recordVideo:{dir:out,size:{width:1671,height:941}}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwGo').click();
 await page.waitForFunction(()=>LSW.game.pwStage?.convoy?.ready&&LSW.game.pwStage.frontlineReady,{},{polling:100,timeout:60000});
 result.loaded=await page.evaluate(()=>{const g=LSW.game;return {vehicles:g.pwStage.convoy.vehicles.length,cover:g.world.cover.filter(c=>c.frontlineVehicle).length,meshes:g.pwStage.convoy.vehicles.map(v=>{let n=0;v.mesh.traverse(o=>{if(o.isMesh)n++;});return n;})};});assert.equal(result.loaded.vehicles,3);assert.equal(result.loaded.cover,3);
 await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
 await page.screenshot({path:out+'/native-flight.png'});await page.keyboard.up('w');await page.keyboard.up('d');
 // Position a real native fighter for a repeatable shot. Mouse-down drives the
 // real attack/beam contact; no HP writes or direct damage invocations.
 await page.evaluate(async()=>{const g=LSW.game;g.startMode('powerworld',{p1:'sol',p2:'kano'});await g.pwStage.preparation.promise;if(!g.pwStage.frontlineReady)throw Error('Fixture graphics preparation failed');const v=g.pwStage.convoy.vehicles[0],p=g.player;
  for(const e of g.entities)if(e!==p)e.ai=null;
  // This is an isolated damage fixture, not a navigation proof. Shoot from
  // above the revised bank so placing a test actor cannot embed it in a rock.
  p.pos.set(v.cover.x,v.cover.top+40,v.cover.z-50);p.vel.set(0,0,0);p.flying=true;p.flyHeld=false;p.invuln=0;
  const dy=(v.cover.bottom+v.cover.top)/2-(p.pos.y+5.4),distance=Math.hypot(50,dy);
  g.hardLock=null;g.world._lookActive=true;g.world._lookYaw=0;g.world._lookPitch=Math.atan2(dy,50)-Math.asin(9/distance);g.world._chaseSnap=true;window.convoyTarget=v;
 });
 const pkg=JSON.parse(await readFile('artifacts/sound-library/library.json','utf8'));const binding={...pkg.bindings.light,name:'vehicle-explosion-proof.wav'};
 await page.evaluate(async binding=>{await LSW.game.audio.soundLibrary.importPackage({format:'lsw.sound-library',version:1,bindings:{'vehicle-explosion':binding},settings:{'vehicle-explosion':{source:'chosen'}}});},binding);
 await page.waitForTimeout(300);await page.screenshot({path:out+'/before-beam.png'});
 await page.mouse.down({button:'left'});await page.waitForFunction(()=>window.convoyTarget.destroyed,{},{timeout:8000,polling:30});
 result.contact=await page.evaluate(()=>({destroyed:convoyTarget.destroyed,hp:convoyTarget.cover.hp,remaining:LSW.game.world.cover.filter(c=>c.frontlineVehicle).length,sounds:[...LSW.game.audio.soundLibrary.active].filter(h=>h.id==='vehicle-explosion').map(h=>({id:h.id,source:h.source,name:h.name})),ema:LSW.game.world._ema}));
 await page.screenshot({path:out+'/native-beam-destruction.png'});await page.mouse.up({button:'left'});
 await page.waitForTimeout(1000);await page.screenshot({path:out+'/native-impact-dust.png'});
 result.dust=await page.evaluate(()=>({active:LSW.game.pwStage.convoy.dust.active,visible:LSW.game.pwStage.convoy.dust.mesh.visible}));assert.equal(result.dust.active,16);assert.equal(result.dust.visible,true);
 assert.equal(result.contact.destroyed,true);assert.equal(result.contact.remaining,2);assert.ok(result.contact.sounds.some(h=>h.source==='chosen-recording'&&h.name==='vehicle-explosion-proof.wav'));
 result.rematch=await page.evaluate(async()=>{const g=LSW.game,old=g.pwStage.convoy;g.startMode('powerworld',{p1:'vega',p2:'kano'});await g.pwStage.preparation.promise;if(!g.pwStage.frontlineReady)throw Error('Rematch graphics preparation failed');return {oldDisposed:old.disposed,groups:g.scene.children.filter(o=>o.name==='frontline-convoy').length,vehicles:g.pwStage.convoy.vehicles.length,cover:g.world.cover.filter(c=>c.frontlineVehicle).length};});
 assert.deepEqual(result.rematch,{oldDisposed:true,groups:1,vehicles:3,cover:3});assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(error){result.failure=error.message;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
finally{await writeFile(out+'/results.json',JSON.stringify({...result,errors},null,2));await page.context().close();await browser.close();}
