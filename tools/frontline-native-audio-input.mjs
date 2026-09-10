// Actual player input/contact routing. Only the opponent placement and the
// previously UI-exported local recording are fixtures; no audio method invoked.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const manifest=JSON.parse(await readFile('artifacts/sound-library/library.json','utf8'));
const out='artifacts/frontline-native-audio-input';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'kano',p2:'vega',two:false,ai:.1})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwGo').click();
 await page.waitForFunction(()=>LSW.game.running&&LSW.game.pwStage?.frontlineReady,{},{polling:100,timeout:60000});
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 result.setup=await page.evaluate(async manifest=>{
  const g=LSW.game,a=g.audio,p=g.player,v=g.entities.find(f=>f!==p&&!f.isDummy);
  await a.soundLibrary.ready();await a.soundLibrary.importPackage(manifest);
  v.ai=null;v.invuln=0;v.hp=v.maxHp=1000;v.vel.set(0,0,0);v.flying=false;v.gait='grounded';
  const yaw=g.world._lookYaw;v.pos.set(p.pos.x+Math.sin(yaw)*7.5,0,p.pos.z+Math.cos(yaw)*7.5);v.faceDir(p.pos.x-v.pos.x,p.pos.z-v.pos.z);
  window.inputVictim=v;window.inputPeak=0;const probe=a.ctx.createAnalyser();probe.fftSize=2048;a.master.connect(probe);
  window.inputProbeTimer=setInterval(()=>{const data=new Float32Array(2048);probe.getFloatTimeDomainData(data);for(const value of data)inputPeak=Math.max(inputPeak,Math.abs(value));},5);
  return {player:p.def.id,target:v.def.id,position:p.pos.toArray(),targetPosition:v.pos.toArray()};
 },manifest);
 await page.keyboard.down('v');await page.waitForTimeout(45);await page.keyboard.up('v');
 await page.waitForFunction(()=>inputVictim.hp<1000,{},{timeout:5000});
 await page.waitForTimeout(250);
 result.contact=await page.evaluate(()=>{clearInterval(inputProbeTimer);return {hp:inputVictim.hp,peak:inputPeak,playback:LSW.game.audio.soundLibrary.lastPlayback};});
 assert.equal(result.contact.playback.id,'light');assert.equal(result.contact.playback.native,true);assert.equal(result.contact.playback.source,'chosen-recording');assert.equal(result.contact.playback.name,'contact-proof.wav');assert.ok(result.contact.peak>.0001);
 await page.screenshot({path:`out/contact.png`.replace('out/',out+'/')});assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(e){result.failure=e.message;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
finally{await writeFile(out+'/results.json',JSON.stringify({...result,errors},null,2));await browser.close();}
