import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/locomotion';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1500,height:1000},recordVideo:{dir:out,size:{width:1500,height:1000}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const source=await new GLTFLoader().loadAsync('/assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf');
  // Neutral review materials expose articulation; source mesh/skin/clips remain exact.
  source.scene.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.set('#c8c1ac');}});
  window.sourceReview={source,THREE,mixer:new THREE.AnimationMixer(source.scene)};STUDIO.preview.scene.add(source.scene);
  const label=document.createElement('div');label.id='source-comparison';label.style.cssText='position:absolute;bottom:48px;left:20px;right:20px;display:flex;justify-content:space-around;color:#f2ead9;font:12px system-ui;pointer-events:none';
  label.innerHTML='<span>CC0 SOURCE · QUATERNIUS</span><span>RETARGET · PRODUCTION FIGHTER</span>';document.querySelector('.viewport').append(label);
  window.poseSourceReview=()=>{
   const p=STUDIO.preview,f=p.fighter,{source,mixer,THREE}=sourceReview;
   const clip=source.animations.find(c=>c.name===f._groundMotion.take);
   mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(f._groundMotion.phase*clip.duration);
   const angle=sourceReview.angle??'front',eye=angle==='side'?new THREE.Vector3(36,3,0):angle==='threequarter'?new THREE.Vector3(24,3,26):new THREE.Vector3(0,3,36);
   const right=new THREE.Vector3(eye.z,0,-eye.x).normalize();
   source.scene.scale.setScalar(5.2*f.parts.rig.pivotHeight/4.6);source.scene.position.copy(f.pos).addScaledVector(right,-13);source.scene.updateMatrixWorld(true);
   p.view='front';p.controls.enabled=false;const center=f.pos.clone().addScaledVector(right,-6.5).add(new THREE.Vector3(0,5,0));p.controls.target.copy(center);
   p.camera.position.copy(center).add(eye);p.camera.fov=38;p.camera.lookAt(center);p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent='SOURCE / RETARGET · '+angle.toUpperCase();
   document.querySelector('.viewport-note').textContent='Custom inspection camera · source phase matched · not BFP camera evidence';
  };
 });
 const rows=[];
 for(const [state,duration]of Object.entries({groundWalk:4/3,groundJog:11/12,groundSprint:2/3})){
  await page.evaluate(()=>{sourceReview.angle='front';});
  await page.getByLabel('Motion state',{exact:true}).selectOption(state);
  for(const fraction of [0,.25,.5,.75,1,2]){
   rows.push(await page.evaluate(({fraction,duration})=>{const p=STUDIO.preview;p.seek(duration*fraction);poseSourceReview();return {state:p.state,fraction,phase:p.fighter._groundMotion.phase,take:p.fighter._groundMotion.take};},{fraction,duration}));
   await page.locator('.viewport').screenshot({path:`${out}/source-sol-${state}-${fraction}.png`});
  }
  await page.evaluate(async()=>{
   const p=STUDIO.preview;p.seek(0);
   for(let i=0;i<180;i++){p.time+=1/60;p.step(1/60,false,false);poseSourceReview();await new Promise(requestAnimationFrame);}
  });
  for(const angle of ['side','threequarter']){
   await page.evaluate(async({angle,duration})=>{
    sourceReview.angle=angle;const p=STUDIO.preview;p.seek(0);
    for(let i=0;i<Math.round(duration*120);i++){p.time+=1/60;p.step(1/60,false,false);poseSourceReview();await new Promise(requestAnimationFrame);}
    p.seek(duration*.5);poseSourceReview();
   },{angle,duration});
   await page.locator('.viewport').screenshot({path:`${out}/source-sol-${state}-${angle}.png`});
  }
 }
 await page.evaluate(()=>{STUDIO.preview.scene.remove(sourceReview.source.scene);document.querySelector('#source-comparison').remove();});
 await page.getByRole('button',{name:/^SARGE/}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('groundJog');
 for(const [name,offset]of Object.entries({front:[0,2,24],left:[-24,2,0],right:[24,2,0],rear:[0,2,-24]})){
  await page.evaluate(({name,offset})=>{const p=STUDIO.preview;p.seek(.42);p.view='front';p.controls.enabled=false;const c=p.fighter.pos.clone();c.y+=5;p.controls.target.copy(c);p.camera.position.copy(c).add({x:offset[0],y:offset[1],z:offset[2]});p.camera.lookAt(c);p.renderer.render(p.scene,p.camera);document.querySelector('.view-tag').textContent='ARMED RIG / '+name.toUpperCase();document.querySelector('.viewport-note').textContent='Custom inspection camera · production hand attachments · not BFP camera evidence';},{name,offset});
  await page.locator('.viewport').screenshot({path:`${out}/sarge-jog-${name}.png`});
 }
 await writeFile(`${out}/review-results.json`,JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({rows,errors},null,2));
 assert.deepEqual(errors,[],'source/target review must finish without page errors');
}finally{await context.close();await browser.close();}
