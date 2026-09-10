import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const label=process.argv[2]||'inspection';assert.match(label,/^[a-z0-9-]+$/);
const out=`artifacts/disjoint-hands/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),rows=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 await page.getByLabel('Attack slot',{exact:true}).selectOption('rmb');await page.getByLabel('Beam pose',{exact:true}).selectOption('palm');
 await page.getByLabel('Attack slot',{exact:true}).selectOption('lmb');await page.getByLabel('Firing hands',{exact:true}).selectOption('left');
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.notEqual(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.handPattern),'left');
 await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.handPattern),'left');
 await page.getByLabel('Preview level',{exact:true}).selectOption('10');await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
 await page.locator('#combat-slot').selectOption('rmb');await page.getByLabel('Co-fire attack',{exact:true}).selectOption('lmb');
 await page.locator('#charge-hold').fill('0.6');await page.locator('#charge-hold').press('Tab');
 const studio=await page.evaluate(()=>{
  const p=STUDIO.preview;p.seek(0);p.fighter.energyInfinite=true;
  for(let i=1;i<=120;i++)p.combat.step(i/60,1/60);
  p.time=2;p.renderer.render(p.scene,p.camera);
  return {phase:p.combat.phase,damage:p.combat.damage,beamAge:p.fighter.slots.rmb.active?.emissionAge,leftOpen:p.fighter.parts.armL.children[2].morphTargetInfluences[0],leftShots:p.fighter.slots.lmb.handShots?.[-1],denied:p.fighter.slots.lmb._handsBusy};
 });
 assert.ok(studio.beamAge>0&&studio.leftOpen>.9&&studio.leftShots>0&&!studio.denied,JSON.stringify(studio));
 await page.screenshot({path:`${out}/studio-authoring.png`});await writeFile(`${out}/studio.json`,JSON.stringify(studio,null,2));
 console.log('Studio authored free-hand co-fire and undo/redo verified.');
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,{disjointCombatFixture}=await import('/tools/helpers/disjoint-combat-fixture.mjs');p.playing=false;p.controls.enabled=false;p.combat.clear();p.scene.remove(p.fighter.obj);
  for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0';p.resize();
  let x,motion,at=-1;
  window.handChapter=name=>{x?.close();motion=name;x=disjointCombatFixture({motion,scene:p.scene});for(let i=0;i<60;i++)x.step();at=-1;};
  window.handFrame=frame=>{
   while(at<frame){at++;if(at===12)x.start('lmb');if(at===60)x.start('rmb');if(at===150)x.stop('rmb');if(at===200)x.stop('lmb');x.step();}
   return {motion,frame,position:x.f.pos.toArray(),velocity:x.f.vel.toArray(),leftOpen:x.f.parts.armL.children[2].morphTargetInfluences[0],beamAge:x.f.slots.lmb.active?.emissionAge,source:x.f._groundMotion?.take||'procedural flight + combat overlay'};
  };
  window.handView=angle=>{
   const height=x.f.pos.y;p.camera.position.set(Math.sin(angle)*25,height+10,Math.cos(angle)*25);p.camera.lookAt(0,height+5,0);p.camera.fov=36;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=`SOL / ${motion.toUpperCase()} / RIGHT BEAM + LEFT VOLLEY`;
   document.querySelector('.measurements').textContent=`frame ${at} · ${(at/60).toFixed(2)}s`;
   document.querySelector('.viewport-note').textContent='Production rig + native powers · procedural attack overlay · fixed-position articulation, not integrated travel';
   p.renderer.render(p.scene,p.camera);
   return p.renderer.domElement.toDataURL('image/jpeg',.92);
  };
 });
 for(const [chapter,motion]of ['strafe','fly'].entries()){
  await page.evaluate(motion=>handChapter(motion),motion);
  for(let frame=0;frame<240;frame++){
   rows.push(await page.evaluate(frame=>handFrame(frame),frame));
   if(frame%3===0){const jpg=await page.evaluate(()=>handView(-1.15));await writeFile(`${out}/frames/${String(chapter*80+frame/3).padStart(4,'0')}.jpg`,Buffer.from(jpg.split(',')[1],'base64'));}
   if([11,59,75,120,165,239].includes(frame))for(const [view,angle]of [['front',0],['left',-Math.PI/2],['right',Math.PI/2]]){
    await page.evaluate(angle=>handView(angle),angle);await page.screenshot({path:`${out}/${motion}-${frame}-${view}.png`});
   }
  }
  console.log(`${label}: ${motion} captured`);
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({rows,errors,scope:'Authored disjoint power definitions, native production rig/managers. Fixed-position articulation; no integrated travel claim.'},null,2));
}finally{await browser.close();}
await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/independent-hands.mp4`]);
