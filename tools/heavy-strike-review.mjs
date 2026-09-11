import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const stills=process.argv.includes('--stills'),motionOnly=process.argv.includes('--motion-only'),out=`artifacts/heavy-strikes${stills?'/stills':motionOnly?'/motion':''}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},...(stills?{}:{recordVideo:{dir:out,size:{width:1440,height:1000}}})}),page=await context.newPage(),errors=[],rows=[],segments=[],started=Date.now();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('melee');await page.getByLabel('Melee sequence',{exact:true}).selectOption('heavy');
 await page.getByLabel('Heavy punch animation',{exact:true}).selectOption('procedural');
 await page.evaluate(()=>STUDIO.preview.seek(1.2));assert.equal(await page.evaluate(()=>STUDIO.preview.fighter._authoredStrike?.applied??false),false);
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 assert.equal(await page.getByLabel('Heavy punch animation',{exact:true}).inputValue(),'procedural');
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Heavy punch animation',{exact:true}).selectOption('authored');
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.getByLabel('Heavy punch animation',{exact:true}).inputValue(),'procedural');
 await page.getByLabel('Heavy punch animation',{exact:true}).selectOption('authored');
 await page.getByLabel('Motion state',{exact:true}).selectOption('melee');await page.getByLabel('Melee sequence',{exact:true}).selectOption('heavy');
 await page.evaluate(()=>STUDIO.preview.seek(1.2));assert.match(await page.locator('.measurements').innerText(),/Melee_Hook/);
 await page.screenshot({path:`${out}/editor.png`});
 await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{ROSTER}=await import('/src/data/characters.js'),{profileFromDef}=await import('/src/tool/studio-profile.js');
  const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js'),{STRIKE_CLIPS}=await import('/src/engine/strike-motion.js'),{STRIKES}=await import('/src/data/martial.js');
  const p=STUDIO.preview;cancelAnimationFrame(p.raf);p.controls.enabled=false;
  const source=await new GLTFLoader().loadAsync('/assets-src/quaternius/library-2/UAL2_Standard.glb'),mixer=new T.AnimationMixer(source.scene);
  source.scene.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of [].concat(o.material))m.color.set(m.name==='M_Joints'?'#343c40':'#c8c1ac');}});source.scene.visible=false;p.scene.add(source.scene);
  window.heavyFixture=(body,stage='grounded',hero='sol')=>{
   const def=ROSTER.find(d=>d.id===hero),profile=profileFromDef(def);profile.model.body=body;profile.model.heavyStrikes='authored';
   p.setProfile(def,profile);p.combat.meleeSequence='heavy';p.combat.meleeStage=stage;p.setState('melee');p.setIsolated(false);p.seek(0);
  };
  window.heavyCamera=(angle='threequarter',comparison=false)=>{
   const center=p.fighter.parts.torso.getWorldPosition(new T.Vector3());center.y-=1;
   const offset=new T.Vector3(...({front:[0,3,30],left:[-30,3,0],right:[30,3,0],rear:[0,3,-30],threequarter:[20,4,28]}[angle]));
   if(comparison){center.x-=7;offset.multiplyScalar(1.2);}
   else if(!p.isolated){const other=p.combat.target.parts.torso.getWorldPosition(new T.Vector3());other.y-=1;const distance=center.distanceTo(other);center.lerp(other,.5);offset.setLength(Math.max(offset.length(),(distance*.5+8)/Math.tan(19*Math.PI/180)/Math.min(1,p.camera.aspect)*1.12));}
   p.view='front';p.controls.enabled=false;p.camera.fov=38;p.camera.position.copy(center).add(offset);p.camera.lookAt(center);p.camera.updateProjectionMatrix();p.camera.updateMatrixWorld(true);p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent=`${p.fighter.def.name} / ${p.fighter.parts.skin?.id??'procedural'} / HEAVY / ${angle}`;
   document.querySelector('.viewport-note').textContent=comparison?'SOURCE (left) / PRODUCTION + contact IK (right) · source-time comparison · custom inspection camera':`Actual contact · ${p.isolated?'opponent hidden':'opponent visible'} · silent rehearsal · custom inspection camera`;
   document.querySelector('.attack-phase').textContent=p.combat.phase.toUpperCase();
   document.querySelector('.measurements').textContent=`${p.time.toFixed(3)}s · ${p.combat.damage.toFixed(1)} damage · ${p.combat.contacts} contact · ${p.combat.phase}${p.fighter._authoredStrike?.take?` · ${p.fighter._authoredStrike.take}`:''}`;
  };
  window.heavyCompare=(fraction,stage)=>{
   const f=p.fighter,c=STRIKE_CLIPS.power,time=fraction*c.duration;source.scene.visible=true;p.setIsolated(true);
   f.pos.set(0,stage==='airborne'?80:0,0);f.vel.set(0,0,0);f.poseStrike=1;f.poseGuard=0;f.guarding=false;f.mId='power';f.facing=0;f.animT=0;
   f.mstate=time<c.contactStart?'startup':time<c.contactEnd?'active':'recover';
   const phase=f.mstate==='startup'?time/c.contactStart:f.mstate==='active'?(time-c.contactStart)/(c.contactEnd-c.contactStart):(time-c.contactEnd)/(c.duration-c.contactEnd);
   f.mT=STRIKES.power[f.mstate]*(1-phase)/(f.def.meleePace||1);f._meleeMotion={side:-1,point:new T.Vector3(-.3,f.pos.y+7,5)};
   // Static comparison settles the existing yaw/base-pose filters without
   // advancing the source clock. Actual encounter capture below never does this.
   for(let i=0;i<60;i++)f._animate(1/60);f.obj.updateMatrixWorld(true);
   const segment=time<c.segments[1].start?c.segments[0]:c.segments[1],clip=source.animations.find(x=>x.name===segment.take);
   mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(time-segment.start);
   source.scene.scale.setScalar(5.2*f.parts.rig.pivotHeight/4.6);source.scene.position.copy(f.pos);source.scene.position.x-=14;source.scene.updateMatrixWorld(true);heavyCamera('front',true);
   document.querySelector('.measurements').textContent=`${segment.take} / ${time.toFixed(3)}s source / ${f.mstate}`;
   document.querySelector('.attack-phase').textContent='SOURCE-TIME COMPARISON';
   const sourceAxis=source.scene.getObjectByName('spine_03').getWorldPosition(new T.Vector3()).sub(source.scene.getObjectByName('pelvis').getWorldPosition(new T.Vector3())).normalize();
   const targetAxis=f.parts.torso.getWorldPosition(new T.Vector3()).sub(f.parts.pelvis.getWorldPosition(new T.Vector3())).normalize();
   return {fraction,stage,take:f._authoredStrike?.take,sourceTime:f._authoredStrike?.time,axisError:sourceAxis.angleTo(targetAxis),rootRotation:f.obj.rotation.toArray()};
  };
  window.heavyActual=()=>{source.scene.visible=false;p.setIsolated(false);p.seek(0);};
  window.heavySample=()=>({body:p.fighter.parts.skin?.id??'procedural',stage:p.combat.meleeStage,hero:p.fighter.def.id,time:p.time,phase:p.combat.phase,take:p.fighter._authoredStrike?.take,sourceTime:p.fighter._authoredStrike?.time,events:structuredClone(p.combat.meleeEvents),root:p.fighter.pos.toArray(),target:p.combat.target.pos.toArray()});
 });
 for(const body of ['procedural','superhero-male','superhero-female'])for(const stage of ['grounded','airborne']){
  await page.evaluate(([b,s])=>heavyFixture(b,s),[body,stage]);
  for(const fraction of (motionOnly?[]:[0,.25,.5,.75,1])){
   rows.push({comparison:await page.evaluate(([fraction,stage])=>heavyCompare(fraction,stage),[fraction,stage]),body});await page.locator('.viewport').screenshot({path:`${out}/${body}-${stage}-source-${fraction}.png`});
  }
  await page.evaluate(()=>heavyActual());
  for(const [label,time] of (motionOnly?[]:[['windup',1.12],['contact',1.4],['recovery',1.8]]))for(const angle of ['front','left','right','rear']){
   rows.push(await page.evaluate(([t,a])=>{const p=STUDIO.preview;p.seek(t);heavyCamera(a);return heavySample();},[time,angle]));
   await page.locator('.viewport').screenshot({path:`${out}/${body}-${stage}-${label}-${angle}.png`});
  }
  const contact=await page.evaluate(()=>{STUDIO.preview.seek(3);return heavySample();});rows.push(contact);
  assert.equal(contact.events.filter(e=>e.move==='heavy').length,1,`${body} ${stage}: heavy must hit exactly once`);
  if(!stills)for(const angle of ['front','left','right','rear']){
   const segment={body,stage,angle,startSeconds:(Date.now()-started)/1000};
   rows.push(...await page.evaluate(async a=>{
   const p=STUDIO.preview;p.seek(0);const samples=[];
   for(let i=0;i<105;i++){for(let j=0;j<2;j++){p.time=(i*2+j+1)/60;p.step(1/60,false,false);}heavyCamera(a);if(i%5===0)samples.push(heavySample());await new Promise(requestAnimationFrame);}return samples;
   },angle));segment.endSeconds=(Date.now()-started)/1000;segments.push(segment);
  }
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({rows,segments,errors},null,2));console.log(`PASS ${rows.filter(r=>!r.comparison).length} actual heavy phase samples and ${rows.filter(r=>r.comparison).length} source comparisons; editor save/reload/undo and contact verified`);
}finally{await context.close();if(!stills)await page.video()?.saveAs(`${out}/motion.webm`);await browser.close();}
