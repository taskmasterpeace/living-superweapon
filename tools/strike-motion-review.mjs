import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/strikes';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1500,height:1050},recordVideo:{dir:out,size:{width:1500,height:1050}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const {STRIKE_CLIPS}=await import('/src/engine/strike-motion.js'),{STRIKES}=await import('/src/data/martial.js');
  const source=await new GLTFLoader().loadAsync('/assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf');
  source.scene.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.set('#c8c1ac');}});
  STUDIO.preview.scene.add(source.scene);window.strikeReview={T,source,mixer:new T.AnimationMixer(source.scene),clips:STRIKE_CLIPS,STRIKES};
  const label=document.createElement('div');label.id='strike-source-label';label.style.cssText='position:absolute;bottom:48px;left:20px;right:20px;display:flex;justify-content:space-around;color:#f2ead9;font:12px system-ui;pointer-events:none';label.innerHTML='<span>CC0 SOURCE · QUATERNIUS</span><span>PRODUCTION POSE · FINAL CONTACT IK</span>';document.querySelector('.viewport').append(label);
  window.strikePoseReview=({id,fraction,air=false,angle='threequarter'})=>{
   const p=STUDIO.preview,f=p.fighter,{T,source,mixer,clips,STRIKES}=strikeReview,c=clips[id],time=fraction*c.duration;
   f.pos.set(0,air?8:0,0);f.vel.set(0,0,0);f.flying=air;f.gait=air?'airborne':'grounded';f._flyPose=air?1:0;f.animT=0;f.facing=0;f.poseStrike=1;f.poseGuard=0;f.guarding=false;f.mId=id;
   f.mstate=time<c.contactStart?'startup':time<c.contactEnd?'active':'recover';
   const t=f.mstate==='startup'?time/c.contactStart:f.mstate==='active'?(time-c.contactStart)/(c.contactEnd-c.contactStart):(time-c.contactEnd)/(c.duration-c.contactEnd);
   f.mT=STRIKES[id][f.mstate]*(1-t)/(f.def.meleePace||1);f._meleeMotion={side:1,point:new T.Vector3(.3,air?15:7,5)};
   f._animate(1/60);f.obj.updateMatrixWorld(true);
   const clip=source.animations.find(x=>x.name===c.take);mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(time);
   const scale=5.2*f.parts.rig.pivotHeight/4.6;source.scene.scale.set(c.side===1?scale:-scale,scale,scale);
   const eye=angle==='side'?new T.Vector3(36,4,0):angle==='front'?new T.Vector3(0,4,36):new T.Vector3(24,4,26),right=new T.Vector3(eye.z,0,-eye.x).normalize();
   source.scene.position.copy(f.pos).addScaledVector(right,-13);source.scene.updateMatrixWorld(true);
   const center=f.pos.clone().addScaledVector(right,-6.5).add(new T.Vector3(0,5,0));p.view='front';p.controls.enabled=false;p.controls.target.copy(center);p.camera.position.copy(center).add(eye);p.camera.fov=38;p.camera.lookAt(center);p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent=`${c.take} · ${air?'AIR ADAPTATION':'GROUND'} · ${angle.toUpperCase()}`;
   document.querySelector('.measurements').textContent=`${time.toFixed(3)} / ${c.duration.toFixed(3)}s source · ${f.mstate} · ${c.side===1?'original':'mirrored'} hand`;
   document.querySelector('.viewport-note').textContent='Custom inspection camera · source-time comparison, not live combat timing · entry/exit blend to hero base';
  };
 });
 if(!process.argv.includes('--contacts-only'))for(const id of ['jab','cross'])for(const air of [false,true]){
  for(const fraction of [0,.25,.5,.75,1]){
   await page.evaluate(({id,air,fraction})=>{for(let i=0;i<45;i++)strikePoseReview({id,air,fraction});},{id,air,fraction});
   await page.locator('.viewport').screenshot({path:`${out}/${id}-${air?'air':'ground'}-${fraction}.png`});
  }
  for(const angle of ['side','threequarter'])await page.evaluate(async({id,air,angle})=>{for(let i=0;i<=90;i++){strikePoseReview({id,air,angle,fraction:i/90});await new Promise(requestAnimationFrame);}},{id,air,angle});
 }
 await page.evaluate(()=>{STUDIO.preview.scene.remove(strikeReview.source.scene);document.querySelector('#strike-source-label').remove();});
 const rows=[];
 for(const hero of ['SOL','SARGE']){
  if(hero!=='SOL')await page.getByRole('button',{name:new RegExp('^'+hero)}).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('melee');
  for(const stage of ['grounded','airborne']){
   await page.getByLabel('Melee stage',{exact:true}).selectOption(stage);
   for(const [angle,offset]of Object.entries({front:[0,5,32],left:[32,5,0],right:[-32,5,0],rear:[0,5,-32]})){
    await page.evaluate(({offset,angle})=>{const p=STUDIO.preview;p.seek(.45);p.view='front';p.controls.enabled=false;const center=p.fighter.pos.clone().lerp(p.combat.target.pos,.5);center.y+=5;p.controls.target.copy(center);p.camera.position.copy(center).add({x:offset[0],y:offset[1],z:offset[2]});p.camera.fov=38;p.camera.updateProjectionMatrix();p.camera.lookAt(center);p.renderer.render(p.scene,p.camera);document.querySelector('.view-tag').textContent='REAL CONTACT / '+angle.toUpperCase();document.querySelector('.viewport-note').textContent='Scripted production melee · opponent and hand attachments present · custom inspection camera';},{offset,angle});
    await page.locator('.viewport').screenshot({path:`${out}/${hero.toLowerCase()}-${stage}-${angle}.png`});
   }
   rows.push(await page.evaluate(async()=>{const p=STUDIO.preview;p.setView('side');p.seek(0);for(let i=1;i<=150;i++){p.time=i/60;p.step(1/60);await new Promise(requestAnimationFrame);}return {hero:p.fighter.def.id,stage:p.combat.meleeStage,damage:p.combat.damage,events:p.combat.meleeEvents};}));
   if(hero==='SARGE'&&stage==='grounded'){
    await page.evaluate(()=>{const p=STUDIO.preview;p.seek(.45);const f=p.fighter;f.mId='cross';f.mstate='active';f.mT=.035/(f.def.meleePace||1);f._meleeMotion.side=1;f._animate(1/60);p.view='front';p.controls.enabled=false;const c=f.pos.clone();c.y+=5;p.controls.target.copy(c);p.camera.position.copy(c).add({x:-18,y:4,z:20});p.camera.fov=38;p.camera.updateProjectionMatrix();p.camera.lookAt(c);p.renderer.render(p.scene,p.camera);document.querySelector('.view-tag').textContent='ARMED CROSS / THREE-QUARTER';document.querySelector('.measurements').textContent='Production pose · shield/weapon clearance inspection';document.querySelector('.viewport-note').textContent='Posed active cross, not a damage event · opponent and attachments retained';});
    await page.locator('.viewport').screenshot({path:`${out}/sarge-grounded-cross-threequarter.png`});
   }
  }
 }
 await page.screenshot({path:`${out}/studio-desktop.png`});await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/studio-mobile.png`,fullPage:true});
 await writeFile(`${out}/review-results.json`,JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({rows,errors},null,2));assert.deepEqual(errors,[]);assert.ok(rows.every(r=>r.damage>0),'all rehearsals must make actual contact');
}finally{await context.close();await browser.close();}
