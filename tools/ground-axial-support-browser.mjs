import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const label=process.argv[2]||'inspection';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const chapters=process.argv[3]==='running'?[{motion:'jog',height:1000},{motion:'jog',height:250,speed:32,key:'sprint'}]:[{motion:'stand',height:1000},{motion:'strafe',height:250}];
const out=`artifacts/ground-axial-support/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),rows=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,{spineCombatFixture}=await import('/tools/helpers/spine-combat-fixture.mjs');
  p.playing=false;p.controls.enabled=false;p.combat.clear();p.scene.remove(p.fighter.obj);
  for(const s of ['header','.library','.inspector'])document.querySelector(s).style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0';p.resize();
  let x,motion,height,at=-1;
  window.groundChapter=spec=>{x?.close();({motion,height}=spec);x=spineCombatFixture({motion,source:'chest',scene:p.scene});if(spec.speed)x.f.vel.set(spec.speed,0,0);motion=spec.key||motion;for(let i=0;i<60;i++)x.step();at=-1;};
  window.groundFrame=frame=>{
   while(at<frame){at++;if(at===12){x.aim(170,height);x.start('lmb');}if(at===180)x.stop('lmb');x.step();}
   return {motion,height,frame,phase:x.f._groundMotion?.phase,source:x.f._groundMotion?.take||'procedural standing',beamAge:x.f.slots.lmb.active?.emissionAge||0,position:x.f.pos.toArray(),velocity:x.f.vel.toArray()};
  };
  window.groundView=angle=>{
   p.camera.position.set(Math.sin(angle)*27,12,Math.cos(angle)*27);p.camera.lookAt(0,5,0);p.camera.fov=36;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=`SOL / ${motion.toUpperCase()} / CHEST AIM +${height}u`;
   document.querySelector('.measurements').textContent=`frame ${at} · ${x.f.slots.lmb.active?.emissionAge?'EMITTING':at<180?'PREPARING':'RECOVERY'}`;
   document.querySelector('.viewport-note').textContent='Native rig + chest test power · source gait / procedural support · fixed-position articulation, not integrated travel';
   p.renderer.render(p.scene,p.camera);return p.renderer.domElement.toDataURL('image/jpeg',.92);
  };
 });
 for(const [chapter,spec]of chapters.entries()){
  await page.evaluate(spec=>groundChapter(spec),spec);
  for(let frame=0;frame<240;frame++){
   rows.push(await page.evaluate(frame=>groundFrame(frame),frame));
   if(frame%3===0){const jpg=await page.evaluate(()=>groundView(-1.2));await writeFile(`${out}/frames/${String(chapter*80+frame/3).padStart(4,'0')}.jpg`,Buffer.from(jpg.split(',')[1],'base64'));}
   if([11,59,120,179,239].includes(frame))for(const [view,angle]of [['front',0],['left',-Math.PI/2],['right',Math.PI/2],['rear',Math.PI]]){
    await page.evaluate(angle=>groundView(angle),angle);await page.screenshot({path:`${out}/${spec.key||spec.motion}-${frame}-${view}.png`});
   }
  }
  console.log(`${label}: ${spec.motion} captured`);
 }
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors,scope:'Fixed-position native articulation and FX, not integrated travel'},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/grounded-chest.mp4`]);
