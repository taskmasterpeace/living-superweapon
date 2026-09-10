import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const label=process.argv[2]||'inspection';assert.match(label,/^[a-z0-9-]+$/);
const out=`artifacts/paired-entry/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),rows=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,{pairedCombatFixture}=await import('/tools/helpers/paired-combat-fixture.mjs');p.playing=false;p.controls.enabled=false;p.combat.clear();p.scene.remove(p.fighter.obj);
  for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0';p.resize();
  let x,motion,at=-1,previous=null,previousTorso=null;
  window.entryChapter=name=>{x?.close();motion=name;x=pairedCombatFixture({motion,scene:p.scene});for(let i=0;i<90;i++)x.step();at=-1;previous=null;previousTorso=null;};
  window.entryFrame=frame=>{
   while(at<frame){at++;x.sequence(at);}
   const f=x.f,p=f.parts,joints=[p.armL,p.armR].map(a=>p.torso.quaternion.clone().invert().multiply(a.quaternion));
   const rate=previous?Math.max(...joints.map((q,i)=>q.angleTo(previous[i])))*60:0;previous=joints;
   const torsoRate=previousTorso?previousTorso.angleTo(p.torso.quaternion)*60:0;previousTorso=p.torso.quaternion.clone();
   return {motion,frame,rate,torsoRate,phase:f._combatAim.weight,position:f.pos.toArray(),velocity:f.vel.toArray(),channels:Object.fromEntries(Object.entries(f.slots).map(([key,s])=>[key,{preparing:s.active?.pendingLaunch,emissionAge:s.active?.emissionAge}])),source:f._groundMotion?.take||'procedural flight + combat overlay'};
  };
  window.entryView=angle=>{
   const f=x.f;p.camera.position.set(Math.sin(angle)*23,58,Math.cos(angle)*23);p.camera.lookAt(0,55,0);p.camera.fov=36;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=`SOL / ${motion.toUpperCase()} / PAIRED + OPTIC ENTRY`;
   document.querySelector('.measurements').textContent=`frame ${at} · ${(at/60).toFixed(2)}s`;
   document.querySelector('.viewport-note').textContent='Production rig and native powers · procedural flight/attack overlay · fixed-position articulation inspection';
   p.renderer.render(p.scene,p.camera);return p.renderer.domElement.toDataURL('image/jpeg',.94);
  };
 });
 for(const [chapter,motion]of ['hover','fly'].entries()){
  await page.evaluate(motion=>entryChapter(motion),motion);
  for(let frame=0;frame<240;frame++){
   rows.push(await page.evaluate(frame=>entryFrame(frame),frame));
   if(frame%3===0){const jpg=await page.evaluate(()=>entryView(-.7));await writeFile(`${out}/frames/${String(chapter*80+frame/3).padStart(4,'0')}.jpg`,Buffer.from(jpg.split(',')[1],'base64'));}
   if([0,11,12,13,30,60,120,180,239].includes(frame))for(const [view,angle]of [['front',0],['left',-Math.PI/2],['right',Math.PI/2],['rear',Math.PI]]){
    await page.evaluate(angle=>entryView(angle),angle);await page.screenshot({path:`${out}/${motion}-${frame}-${view}.png`});
   }
  }
  console.log(`${label}: ${motion} captured`);
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({rows,errors,scope:'Fixed-position production articulation; no imported flight clip or gameplay travel claim'},null,2));
}finally{await browser.close();}
await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/entry.mp4`]);
