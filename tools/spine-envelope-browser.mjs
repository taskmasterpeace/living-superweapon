import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const label=process.argv[2]||'inspection';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid capture label');
const out=`artifacts/spine-envelope/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),rows=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,{spineCombatFixture}=await import('/tools/helpers/spine-combat-fixture.mjs');
  p.playing=false;p.controls.enabled=false;p.combat.clear();p.scene.remove(p.fighter.obj);
  for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0';p.resize();
  let x,motion,at=-1;const q=p.camera.quaternion.clone(),a=p.camera.rotation.clone();a.order='YXZ';
  window.spineChapter=name=>{x?.close();motion=name;x=spineCombatFixture({motion,source:'chest',scene:p.scene});for(let i=0;i<60;i++)x.step();x.start('lmb');for(let i=0;i<60;i++)x.step();at=-1;};
  window.spineFrame=frame=>{
   while(at<frame){at++;if(at===0)x.aim(170,25);if(at===60)x.aim(-100,-30);if(at===120)x.aim(5,60);if(at===180)x.stop('lmb');x.step();}
   const f=x.f;q.copy(f.parts.pelvis.quaternion).invert().multiply(f.parts.torso.quaternion);a.setFromQuaternion(q);
   return {motion,frame,yaw:a.y,source:f._groundMotion?.take||'procedural flight',position:f.pos.toArray(),velocity:f.vel.toArray(),beamAge:f.slots.lmb.active?.emissionAge};
  };
  window.spineView=angle=>{
   const height=x.f.pos.y;p.camera.position.set(Math.sin(angle)*28,height+11,Math.cos(angle)*28);p.camera.lookAt(0,height+5,0);p.camera.fov=36;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=`SOL / ${motion.toUpperCase()} / CHEST AIM REVERSAL`;
   document.querySelector('.measurements').textContent=`frame ${at} · ${(at/60).toFixed(2)}s · spine ${(a.y*180/Math.PI).toFixed(1)}°`;
   document.querySelector('.viewport-note').textContent='Production rig + native power · source gait / procedural aiming overlay · fixed-position articulation, not integrated travel';
   p.renderer.render(p.scene,p.camera);return p.renderer.domElement.toDataURL('image/jpeg',.92);
  };
 });
 for(const [chapter,motion]of ['strafe','fly'].entries()){
  await page.evaluate(motion=>spineChapter(motion),motion);
  for(let frame=0;frame<240;frame++){
   rows.push(await page.evaluate(frame=>spineFrame(frame),frame));
   if(frame%3===0){const jpg=await page.evaluate(()=>spineView(-1.15));await writeFile(`${out}/frames/${String(chapter*80+frame/3).padStart(4,'0')}.jpg`,Buffer.from(jpg.split(',')[1],'base64'));}
   if([0,30,61,90,150,210,239].includes(frame))for(const [view,angle]of [['front',0],['left',-Math.PI/2],['right',Math.PI/2],['rear',Math.PI]]){
    await page.evaluate(angle=>spineView(angle),angle);await page.screenshot({path:`${out}/${motion}-${frame}-${view}.png`});
   }
  }
  console.log(`${label}: ${motion} captured`);
 }
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors,scope:'Native fixed-position articulation and effects, not integrated travel'},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/chest-reversals.mp4`]);
