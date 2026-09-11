import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='artifacts/frontline-aircraft-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwGo').click();await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
 assert.equal(await page.evaluate(()=>!!LSW.game.pwStage.aircraft),true,'Actual native stage must own air support');
 await page.waitForFunction(()=>LSW.game.pwStage.aircraft.ready);
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>155);await page.keyboard.up('Space');
 await page.keyboard.down('w');await page.waitForTimeout(450);await page.screenshot({path:out+'/native-flight.png'});await page.keyboard.up('w');
 result.flight=await page.evaluate(()=>{const a=LSW.game.pwStage.aircraft;return {ready:a.ready,actors:a.actors.map(v=>({kind:v.kind,pos:v.wrapper.position.toArray(),mixerTime:v.mixer?.time||0})),loops:[...LSW.game.audio.soundLibrary.active].map(h=>({id:h.id,source:h.source})),player:LSW.game.player.pos.toArray(),ema:LSW.game.world._ema};});
 assert.equal(result.flight.actors.length,2);assert.ok(result.flight.actors.find(a=>a.kind==='helicopter').mixerTime>0);assert.ok(result.flight.loops.some(h=>h.id==='rotor'));assert.ok(result.flight.loops.some(h=>h.id==='jet'));
 result.asset=await page.evaluate(()=>{const w=LSW.game.world,a=LSW.game.pwStage.aircraft.actors.find(a=>a.kind==='helicopter');return {name:a.model.getObjectByName('GenericAttackHelicopter')?.name,rate:a.mixer.timeScale,shadowSize:w.sun.shadow.mapSize.x,shadowRange:w.sun.shadow.camera.right};});
 assert.equal(result.asset.name,'GenericAttackHelicopter');assert.equal(result.asset.rate,1.5);assert.equal(result.asset.shadowSize,4096);assert.equal(result.asset.shadowRange,1000);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!LSW.game.running);const paused=await page.evaluate(()=>LSW.game.pwStage.aircraft.time);await page.waitForTimeout(750);
 assert.equal(await page.evaluate(()=>LSW.game.pwStage.aircraft.time),paused);assert.equal(await page.evaluate(()=>[...LSW.game.audio.soundLibrary.active].filter(h=>['rotor','jet'].includes(h.id)).length),0);
 const badge=page.locator('#hFieldRec');assert.equal(await badge.isVisible(),true);assert.equal(await badge.innerText(),'CAM PAUSED');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>LSW.game.running);await page.waitForFunction(()=>LSW.game.audio.soundLibrary.active.size>=2);
 const library=JSON.parse(await readFile('artifacts/sound-library/library.json','utf8')),binding={...library.bindings.light,name:'rotor-proof.wav'};
 // Import fixture only; the real moving aircraft owns playback, not an audition.
 await page.evaluate(async binding=>{await LSW.game.audio.soundLibrary.importPackage({format:'lsw.sound-library',version:1,bindings:{rotor:binding},settings:{rotor:{source:'chosen'}}});},binding);
 await page.waitForFunction(()=>[...LSW.game.audio.soundLibrary.active].some(h=>h.id==='rotor'&&h.source==='chosen-recording'));
 result.chosen=await page.evaluate(()=>{const h=[...LSW.game.audio.soundLibrary.active].find(h=>h.id==='rotor');return {id:h.id,name:h.name,source:h.source};});assert.equal(result.chosen.name,'rotor-proof.wav');
 result.rematch=await page.evaluate(async()=>{const g=LSW.game,old=g.pwStage.aircraft;g.startMode('powerworld',{p1:'vega',p2:'kano'});await g.pwStage.preparation.promise;if(!g.pwStage.frontlineReady)throw Error('Rematch graphics preparation failed');return {disposed:old.disposed,oldActors:old.actors.length,groups:g.scene.children.filter(o=>o.name==='frontline-air-support').length,actors:g.pwStage.aircraft.actors.length};});
 assert.deepEqual(result.rematch,{disposed:true,oldActors:0,groups:1,actors:2});assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(e){result.failure=e.message;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
finally{await writeFile(out+'/results.json',JSON.stringify({...result,errors},null,2));await browser.close();}
