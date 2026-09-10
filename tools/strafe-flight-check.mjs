// Real production rig: lateral flight must stay oriented toward the fight,
// not become a forward-flight pose rolled onto its side.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const tag=process.argv.includes('--before')?'before':'after';
const out='artifacts/flight-review/combat-strafe';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),s=STUDIO.preview;
  cancelAnimationFrame(s.raf);s.controls.enabled=false;
  s.setProfile({...s.def,build:{weaponR:'rifle'}},s.profile);
  const f=s.fighter,rows=[],continuity=[],motion=[],vertical=[],longitudinalDrift=[];
  f._flightBrake=0;f._flyPose=1;f.faceDir(0,1);
  for(const hz of [30,60,144])for(const side of [-1,1])for(const z of [-2.1,-1.9,0,1.9,2.1]){
   f.vel.set(side*60,0,z);f.cruiseHeld=false;
   for(let i=0;i<hz*2;i++){f.animT+=1/hz;f._animate(1/hz);}
   f.obj.updateMatrixWorld(true);
   const axis=f.parts.head.getWorldPosition(new T.Vector3()).sub(f.parts.pelvis.getWorldPosition(new T.Vector3())).normalize();
   const headForward=new T.Vector3(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(new T.Quaternion()));
   rows.push({hz,side,z,up:axis.y,headForward:headForward.z,kneeL:f.parts.legL.userData.knee.rotation.x,kneeR:f.parts.legR.userData.knee.rotation.x,
     elbowL:-f.parts.armL.children[1].rotation.x,elbowR:-f.parts.armR.children[1].rotation.x,
     armed:!!f.parts.armR.children[2].userData.gripOccupied,state:f._flightPoseState});
  }
  // Adjacent settled directions must not jump at an arbitrary forward-speed
  // threshold. Compare the rendered rig, not the name of the selected state.
  for(const z of [-2.1,-1.9]){
   f.vel.set(60,0,z);for(let i=0;i<240;i++)f._animate(1/120);
   continuity.push([f.parts.g.rotation.x,f.parts.g.rotation.z,f.parts.armR.rotation.x,f.parts.head.rotation.x]);
  }
  for(const x of [0,.2]) {
   f.vel.set(x,-60,0);for(let i=0;i<240;i++)f._animate(1/120);
   vertical.push(f.parts.g.quaternion.clone());
  }
  const verticalJump=vertical[0].angleTo(vertical[1]);
  for(const y of [-60,60]) {
   let previous=null;
   for(const z of [-.2,0,.2]) {
    f.vel.set(0,y,z);for(let i=0;i<240;i++)f._animate(1/120);
    const sample={q:f.parts.g.quaternion.clone(),head:f.parts.head.rotation.x,arm:f.parts.armR.rotation.x};
    if(previous)longitudinalDrift.push({y,z,angle:previous.q.angleTo(sample.q),head:Math.abs(previous.head-sample.head),arm:Math.abs(previous.arm-sample.arm)});
    previous=sample;
   }
  }
  f.vel.set(0,0,60);for(let i=0;i<180;i++)f._animate(1/60);
  let previous=f.parts.g.quaternion.clone(),lastJoints=null;
  const origin=f.pos.clone();
  for(let frame=0;frame<=360;frame++) {
   const t=frame/30,a=t*Math.PI/3;f.vel.set(Math.sin(a)*60,0,Math.cos(a)*60);
   f.animT=t;f._animate(1/30);f.obj.updateMatrixWorld(true);
   const joints=[f.parts.armL.rotation.x,f.parts.armR.rotation.x,f.parts.legL.rotation.x,f.parts.legR.rotation.x,f.parts.head.rotation.x];
   motion.push({frame,rotationStep:previous.angleTo(f.parts.g.quaternion),jointStep:lastJoints?Math.max(...joints.map((v,i)=>Math.abs(v-lastJoints[i]))):0,
    rootShift:f.pos.distanceTo(origin),finite:f.parts.rig.limbSurfaces.every(s=>Array.from(s.mesh.geometry.attributes.position.array).every(Number.isFinite))});
   previous.copy(f.parts.g.quaternion);lastJoints=joints;
  }
  window.strafeReview={s,f,T};return {rows,continuity,motion,verticalJump,longitudinalDrift};
 });
 for(const side of [-1,1])for(const view of ['front','left','right','rear']){
  await page.evaluate(({side,view})=>{
   const {s,f,T}=strafeReview;f.vel.set(side*60,0,0);for(let i=0;i<180;i++)f._animate(1/120);
   const center=f.parts.pelvis.getWorldPosition(new T.Vector3());
   const offset=({front:[0,4,23],left:[-23,4,0],right:[23,4,0],rear:[0,4,-23]})[view];
   document.querySelector('.view-tag').textContent=`PROCEDURAL STRAFE / ${view.toUpperCase()}`;
   document.querySelector('.measurements').textContent=`${side>0?'Left':'Right'} · 60 u/s · rifle attached`;
   s.camera.position.copy(center).add(new T.Vector3(...offset));s.camera.lookAt(center.clone().add(new T.Vector3(0,2,0)));s.camera.updateMatrixWorld(true);
   s.renderer.render(s.scene,s.camera);
  },{side,view});
  await page.locator('.viewport canvas').first().screenshot({path:`${out}/${tag}-${side}-${view}.png`});
 }
 await writeFile(`${out}/${tag}.json`,JSON.stringify({...result,errors},null,2));
 const jump=Math.max(...result.continuity[0].map((v,i)=>Math.abs(v-result.continuity[1][i])));
 console.log({cases:result.rows.length,minUp:Math.min(...result.rows.map(r=>r.up)),minHeadForward:Math.min(...result.rows.map(r=>r.headForward)),jump,errors});
 assert.equal(errors.length,0);
 assert.ok(result.rows.every(r=>r.up>.8),'Lateral flight rolls the body out of an upright fighting stance');
 assert.ok(result.rows.every(r=>r.headForward>.85),'Strafing fighter looks down instead of toward the fight');
 assert.ok(result.rows.every(r=>r.kneeL>.3&&r.kneeR>.3&&r.elbowL>.5&&r.elbowR>.5&&r.armed),'Armed strafe needs flexed legs and ready arms');
 assert.ok(jump<.08,'Tiny diagonal heading changes switch between incompatible whole-body poses');
 assert.ok(result.verticalJump<.03,'A tiny lateral drift flips a vertical dive into a strafe');
 assert.ok(result.longitudinalDrift.every(r=>r.angle<.03&&r.head<.03&&r.arm<.03),'Tiny forward/back drift flips a vertical flight pose');
 assert.ok(result.motion.every(r=>r.rotationStep<.22&&r.jointStep<.22&&r.rootShift===0&&r.finite),'Directional loop resets, deforms invalidly, or moves the simulation root');
} finally {await browser.close();}
