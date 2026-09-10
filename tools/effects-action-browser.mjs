// Silent, scripted Studio captures. Native effects/abilities, not an AI playtest.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const out='artifacts/combat-effects/action';await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let index=0;
try{
 for(const scenario of [
  {hero:'aurum',slot:'q',kind:'construct',title:'AURUM / PARTICLE-BUILT BARRIER',duration:2.6},
  {hero:'aurum',slot:'lmb',kind:'construct',title:'AURUM / WILL FIST · FORM, SEIZE, SLAM',duration:6.8},
  {hero:'aurum',kind:'shield',title:'AURUM / REAL GUARD CONTACT',duration:1.6},
  {hero:'kano',kind:'charge',title:'KANO / GATHER, CHARGE, RELEASE',duration:3.2},
 ]){
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${scenario.hero}`);
  await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.evaluate(s=>{
   const p=STUDIO.preview;p.playing=false;p.setView('orbit');
   if(s.kind==='shield'){p.combat.meleeSequence='block';p.combat.meleeStage='grounded';p.setState('melee');}
   else{
    const slot=s.slot||Object.entries(p.fighter.slots).find(([,v])=>v.def.type==='beam'&&v.def.charge)?.[0];
    if(!slot)throw Error('No native charge slot for capture');
    p.combat.slot=slot;p.combat.shooterMotion='ground-forward';p.combat.motion='static';p.combat.elevation=0;p.combat.chargeHold=1.8;p.setState('attack');
   }
   p.controls.enabled=false;
   for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
   document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0';p.resize();
   window.effectFrame=frame=>{
    p.time=frame/60;p.step(1/60,false,false);
    const center=p.fighter.pos.clone().add(p.combat.target.pos).multiplyScalar(.5);center.y=s.kind==='shield'?5.2:7;
    p.camera.position.copy(center).add({x:s.kind==='shield'?17:29,y:s.kind==='shield'?8:17,z:s.kind==='shield'?16:36});
    p.camera.lookAt(center);p.camera.fov=s.kind==='shield'?39:43;p.camera.updateProjectionMatrix();
    document.querySelector('.view-tag').textContent=s.title;
    document.querySelector('.viewport-note').textContent='Scripted Studio rehearsal · native abilities and contact · silent';
    document.querySelector('.measurements').textContent=`${p.time.toFixed(2)}s · ${p.combat.phase} · ${p.combat.damage.toFixed(1)} actual damage`;
    p.renderer.render(p.scene,p.camera);
    return {time:p.time,phase:p.combat.phase,damage:p.combat.damage,constructs:p.combat.game.constructs.length,
     charge:p.fighter.slots[p.combat.slot]?.gather?.readyRing.visible||false,
     shieldHits:p.fighter.parts.guardArc.material.hits.filter(h=>h.w>=0).length};
   };
  },scenario);
  const rows=[];
  for(let sample=0;sample<Math.round(scenario.duration*15);sample++){
   const frame=await page.evaluate(sample=>{let row;for(let k=1;k<=4;k++)row=effectFrame(sample*4+k);return {row,png:STUDIO.preview.renderer.domElement.toDataURL('image/jpeg',.95)};},sample);
   rows.push(frame.row);await writeFile(`${out}/frames/${String(index++).padStart(4,'0')}.jpg`,Buffer.from(frame.png.split(',')[1],'base64'));
   if([11,22,Math.round(scenario.duration*15)-1].includes(sample))await page.screenshot({path:`${out}/${scenario.kind}-${scenario.slot||scenario.hero}-${sample}.png`});
  }
  if(scenario.kind==='construct')assert.ok(rows.some(r=>r.constructs>0));
  if(scenario.kind==='shield')assert.ok(rows.some(r=>r.shieldHits>0));
  if(scenario.kind==='charge')assert.ok(rows.some(r=>r.charge),'Full native charge must show its readiness stage');
  results.push({scenario,rows});console.log(`${scenario.title}: captured`);
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Scripted Studio, not AI gameplay',results,errors},null,2));await browser.close();}
await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','15','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/effects-reel.mp4`]);
console.log(`PASS ${index} captured frames; no browser/shader errors`);
