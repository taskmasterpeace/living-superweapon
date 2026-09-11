// Continuous production Studio sparring, not a fabricated gameplay replay.
// Both chapters use the native KANO kit, shared Fighter articulation and real
// damage contacts. Studio owns the prescribed movement; this is not a FPS test.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const frameCapture=process.argv.includes('--frames');
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8);
if(label&&!/^[a-z0-9-]+$/.test(label))throw new Error('Capture label must contain only lowercase letters, digits and hyphens');
const out=`artifacts/palm-action/${label||(frameCapture?'motion':'final')}`;await mkdir(out,{recursive:true});
if(frameCapture)await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1280,height:800},...(frameCapture?{}:{recordVideo:{dir:out,size:{width:1280,height:800}}})});
const page=await context.newPage(),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.evaluate(()=>{
  const p=STUDIO.preview;p.playing=false;p.controls.enabled=false;p.view='front';
  // A clean recording crop; no saved profile or global game UI mutation.
  document.querySelector('header').style.display='none';document.querySelector('.library').style.display='none';document.querySelector('.inspector').style.display='none';
  const viewport=document.querySelector('.viewport');viewport.style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0;';p.resize();
  window.actionChapter=air=>{
   p.combat.shooterMotion=air?'air-right':'ground-right';p.combat.motion='orbit-left';p.combat.distance=24;p.combat.elevation=air?10:0;p.combat.targetSpeed=14;p.seek(0);
  };
  window.actionStep=(frame,air)=>{
   p.time=frame/60;p.step(1/60,false,false);const f=p.fighter;
   const foe=p.combat.target,center=f.pos.clone().lerp(foe.pos,.5);center.y+=5;
   const fit=(f.pos.distanceTo(foe.pos)*.5+8)/Math.tan(24*Math.PI/180);
   p.camera.position.set(.7,.38,.85).normalize().multiplyScalar(fit).add(center);p.camera.lookAt(center);p.camera.fov=48;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=air?'KANO / AIRBORNE WAVE CANNON':'KANO / MOVING WAVE CANNON';
   document.querySelector('.measurements').textContent=`${p.combat.phase} · ${p.combat.damage.toFixed(0)} damage`;
   document.querySelector('.viewport-note').textContent='Live engine · Studio sparring · native kit · scripted travel / real attack contacts';
   p.renderer.render(p.scene,p.camera);
   const beam=Object.values(f.slots).find(s=>s.active?.sustaining)?.active;
   const arms=[f.parts.armL,f.parts.armR];
   return {air,frame,time:p.time,phase:p.combat.phase,damage:p.combat.damage,pos:f.pos.toArray(),open:arms.map(a=>a.children[2].morphTargetInfluences[0]),
    emissionAge:beam?.emissionAge||0,pending:beam?.pendingLaunch||false,
    armForward:beam?arms.map(a=>a.children[2].getWorldPosition(f.pos.clone()).sub(a.getWorldPosition(f.pos.clone())).normalize().dot(beam.dir)):null};
  };
 });
 for(const air of [false,true]){
  await page.evaluate(air=>actionChapter(air),air);
  let capturedLaunch=false;
  if(frameCapture){
   // Background RAF is throttled. Capture exact simulated samples for honest
   // normal-speed playback, rather than presenting a slowed browser recording.
   for(let sample=0;sample<160;sample++){
    const result=await page.evaluate(({sample,air})=>{
     const result=[];for(let n=1;n<=3;n++)result.push(actionStep(sample*3+n,air));
     return {rows:result,png:STUDIO.preview.renderer.domElement.toDataURL('image/png')};
    },{sample,air});
    rows.push(...result.rows);const index=(air?160:0)+sample;
    await writeFile(`${out}/frames/${String(index).padStart(4,'0')}.png`,Buffer.from(result.png.split(',')[1],'base64'));
    if(!capturedLaunch&&result.rows.some(r=>r.emissionAge>0)){
     capturedLaunch=true;await page.screenshot({path:`${out}/${air?'air':'ground'}-first-emission.png`});
    }
    if([6,60,140].includes(sample))await page.screenshot({path:`${out}/${air?'air':'ground'}-${sample===6?'preparation':sample===60?'sustain':'recovered'}.png`});
    if(sample%40===0)console.log(`${air?'air':'ground'} motion samples ${sample}/160`);
   }
  }else for(const [start,end,name]of [[1,61,'start'],[61,151,'quarter'],[151,241,'mid'],[241,361,'recovery'],[361,480,'end']]){
   rows.push(...await page.evaluate(async({start,end,air})=>{const result=[];for(let i=start;i<end;i++){result.push(actionStep(i,air));await new Promise(requestAnimationFrame);}return result;},{start,end,air}));
   await page.screenshot({path:`${out}/${air?'air':'ground'}-${name}.png`});
  }
 }
 assert.deepEqual(errors,[]);
 for(const air of [false,true]){
  const chapter=rows.filter(r=>r.air===air);assert.ok(chapter.some(r=>r.damage>0),'Native Wave Cannon must actually contact its target');
  assert.ok(chapter.some(r=>r.open.every(v=>v>.95)),'Both hands must visibly open during emission');
  assert.ok(chapter.at(-1).open.every(v=>v<.001),'Hands must recover after the power ends');
  const first=chapter.find(r=>r.emissionAge>0);assert.ok(first?.open.every(v=>v>=.7)&&first.armForward.every(v=>v>=.75),'Native charged release starts before the arms and palms are braced');
 }
 console.log(JSON.stringify({frames:rows.length,chapters:[false,true].map(air=>({air,damage:Math.max(...rows.filter(r=>r.air===air).map(r=>r.damage)),firstEmission:rows.find(r=>r.air===air&&r.emissionAge>0)})),errors}));
}finally{
 await writeFile(`${out}/results.json`,JSON.stringify({scope:'Native Wave Cannon / Studio-scripted travel / real damage / silent',rows,errors},null,2));
 await context.close();await page.video()?.saveAs(`${out}/palm-action.webm`);await browser.close();
}
if(frameCapture){
 await promisify(execFile)('ffmpeg',['-y','-v','error','-framerate','20','-start_number','0','-i',`${out}/frames/%04d.png`,'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-fps_mode','passthrough','-movflags','+faststart',`${out}/palm-action.mp4`]);
 console.log(`${out}/palm-action.mp4: 16 seconds, 20 rendered fps / 60 Hz simulation, silent Studio sparring`);
}
