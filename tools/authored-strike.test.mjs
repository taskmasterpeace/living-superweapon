import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
import {STRIKES} from '../src/data/martial.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
import {loadSource,sampleSource} from './lib/quaternius-source.mjs';

function fighter(id='sol'){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id===id)));f._openSky=true;f.flying=false;f.gait='grounded';f.animT=0;f.vel.set(0,0,14);
 f.mId='jab';f.mstate='active';f.mT=.03;f.poseStrike=1;f._meleeMotion={side:1,point:new THREE.Vector3(0,7,5)};
 return f;
}
function surfaceInTorso(mesh,torso){
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3(),ray=new THREE.Ray();
 const direction=new THREE.Vector3(.872,.391,.294).normalize(),geometry=mesh.geometry,position=geometry.attributes.position,index=geometry.index,samples=[];
 for(let i=0;i<position.count;i++)samples.push(new THREE.Vector3().fromBufferAttribute(position,i));
 for(let i=0;i<(index?index.count:position.count);i+=3)samples.push(new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i):i).add(a.fromBufferAttribute(position,index?index.getX(i+1):i+1)).add(b.fromBufferAttribute(position,index?index.getX(i+2):i+2)).multiplyScalar(1/3));
 const tp=torso.geometry.attributes.position,ti=torso.geometry.index;
 return samples.filter(point=>{
  torso.worldToLocal(point.applyMatrix4(mesh.matrixWorld));ray.set(point,direction);const intersections=[];
  for(let i=0;i<(ti?ti.count:tp.count);i+=3){
   a.fromBufferAttribute(tp,ti?ti.getX(i):i);b.fromBufferAttribute(tp,ti?ti.getX(i+1):i+1);c.fromBufferAttribute(tp,ti?ti.getX(i+2):i+2);
   if(ray.intersectTriangle(a,b,c,false,hit)){const distance=hit.distanceTo(point);if(distance>1e-5&&!intersections.some(d=>Math.abs(d-distance)<1e-4))intersections.push(distance);}
  }
  return intersections.length%2===1;
 }).length;
}
test('an occupied off-hand carries its shield outside the rendered torso during authored punches',()=>{
 // AEGIS carries her shield during strikes; SARGE stows his when not guarding.
 const f=fighter('aegis');try{
  f.vel.set(0,0,0);const shield=f.parts.armL.userData.shield;assert.ok(shield?.isMesh);
  for(const [move,state,phase]of [['jab','startup',.25],['jab','recover',.5],['cross','startup',.75],['cross','active',.5]]){
   f.mId=move;f.mstate=state;f.mT=STRIKES[move][state]*(1-phase)/(f.def.meleePace||1);f._animate(1/60);f.obj.updateMatrixWorld(true);
   assert.equal(shield.visible,true,'Collision samples must belong to the rendered shield');
   assert.equal(f.parts.armL.userData.shield,shield,'The authored off-hand must remain occupied');
   assert.ok(f._authoredStrike?.take,'The fixture must exercise the authored strike pose');
   assert.equal(surfaceInTorso(shield,f.parts.torso),0,`${move} ${state} shield penetrates the actual torso surface`);
  }
 }finally{f.dispose();}
});
test('an active grounded punch plants a strike stance instead of running through contact',()=>{
 const f=fighter();try{
  for(let i=0;i<60;i++)f._animate(1/60);
  f.animT=.1;f._animate(1/60);const left=f.parts.legL.quaternion.clone(),right=f.parts.legR.quaternion.clone();
  f.animT=.8;f._animate(1/60);
  assert.ok(left.angleTo(f.parts.legL.quaternion)<.01&&right.angleTo(f.parts.legR.quaternion)<.01,'the same committed strike phase must not inherit the unrelated running clock');
  assert.equal(f._authoredStrike?.take,'Punch_Jab');
 }finally{f.dispose();}
});
test('light-strike source preference is validated and retained in character profiles',()=>{
 const profile=profileFromDef(ROSTER[0]);profile.model.strikes='procedural';
 assert.equal(applyProfile(ROSTER[0],validateProfile(JSON.parse(JSON.stringify(profile)))).model.strikes,'procedural');
 profile.model.strikes='unknown';assert.throws(()=>validateProfile(profile),/strikes/i);
});
test('the rendered target core follows the source core axis without importing its different bind lean',async()=>{
 const source=await loadSource(),f=fighter();
 try{
  f.vel.set(0,0,0);for(let i=0;i<60;i++)f._animate(1/60);f.obj.updateMatrixWorld(true);
  const points=sampleSource(source,'Punch_Jab',f._authoredStrike.time).points;
  const sourceAxis=points.chest.clone().sub(points.hip).normalize();
  const targetAxis=f.parts.torso.getWorldPosition(new THREE.Vector3()).sub(f.parts.pelvis.getWorldPosition(new THREE.Vector3())).normalize();
  assert.ok(targetAxis.angleTo(sourceAxis)<.02,`body lean differs from source by ${targetAxis.angleTo(sourceAxis)} radians`);
 }finally{f.dispose();}
});
test('the hips keep the source fighting base instead of inheriting the full shoulder twist',async()=>{
 const source=await loadSource(),f=fighter();
 try{
  for(let i=0;i<60;i++)f._animate(1/60);f.obj.updateMatrixWorld(true);
  const p=sampleSource(source,'Punch_Jab',f._authoredStrike.time).points;
  const sourceAxis=p.hipR.clone().sub(p.hipL).normalize();
  const targetAxis=f.parts.legR.getWorldPosition(new THREE.Vector3()).sub(f.parts.legL.getWorldPosition(new THREE.Vector3())).normalize();
  assert.ok(targetAxis.angleTo(sourceAxis)<.02,`hips incorrectly follow shoulders by ${targetAxis.angleTo(sourceAxis)} radians`);
 }finally{f.dispose();}
});
test('both hands keep fixed reach, grounded support and a stationary simulation root through the whole strike',()=>{
 for(const id of ['sol','sarge'])for(const side of [-1,1])for(const move of ['jab','cross','power']){
  const f=fighter(id);f.mId=move;f._meleeMotion.side=side;const root=f.pos.toArray(),velocity=f.vel.toArray();
  try{for(const state of ['startup','active','recover'])for(let i=0;i<=30;i++){
   f.mstate=state;f.mT=STRIKES[move][state]*(1-i/30)/(f.def.meleePace||1);f.animT=i/60;f._animate(1/60);f.obj.updateMatrixWorld(true);
   assert.deepEqual(f.pos.toArray(),root);assert.deepEqual(f.vel.toArray(),velocity);
   for(const arm of [f.parts.armL,f.parts.armR])assert.ok(Math.abs(arm.children[2].position.distanceTo(new THREE.Vector3(0,-arm.userData.upperLength,0))-arm.userData.foreLength)<1e-5);
   if(state==='active')assert.ok(Math.min(...[f.parts.legL,f.parts.legR].map(l=>new THREE.Box3().setFromObject(l.userData.boot).min.y))>=-.025,'active strike support cannot sink under the floor');
  }}finally{f.dispose();}
 }
});
test('authored stance and hit offsets cannot survive interruption or a mid-strike form replacement',()=>{
 for(const form of [false,true])for(const move of ['jab','power']){
  const f=fighter(),base=fighter();base.def.model={...base.def.model,strikes:'procedural'};
  f.mId=base.mId=move;base.def.model.heavyStrikes='procedural';
  try{
   for(let i=0;i<30;i++){f._animate(1/60);base._animate(1/60);}
   for(const a of [f,base]){queueHitReaction(a,16,{kb:new THREE.Vector3(1,0,0)});a._animate(1/60);if(form)a.applyForm({frame:{scale:1.2}});a.mstate=null;a.mId=null;a._meleeMotion=null;a.poseStrike=0;a.vel.set(0,0,0);}
   for(let i=0;i<600;i++)for(const a of [f,base]){a.animT+=1/60;a._animate(1/60);}
   for(const key of ['body','head','armL','armR','legL','legR']){
    assert.ok(f.parts[key].quaternion.angleTo(base.parts[key].quaternion)<.01,`${key} stale strike orientation, form=${form}`);
    assert.ok(f.parts[key].position.distanceTo(base.parts[key].position)<.01,`${key} stale strike offset, form=${form}`);
   }
  }finally{f.dispose();base.dispose();}
 }
});
test('source phase is stable across frame rates and hitstop while aerial leg poses remain owned by flight',()=>{
 const samples=[];
 for(const hz of [30,60,120]){
  const f=fighter(),base=fighter();base.def.model={...base.def.model,strikes:'procedural'};
  try{
   for(const a of [f,base]){a.flying=true;a.gait='airborne';a._flyPose=1;a.pos.y=80;}
   for(let i=0;i<hz;i++){f._animate(1/hz);base._animate(1/hz);}
   for(const key of ['legL','legR'])assert.ok(f.parts[key].quaternion.angleTo(base.parts[key].quaternion)<.002,'airborne light strikes must not replace the superhero leg pose');
   samples.push(f.parts.armR.quaternion.clone());const sourceTime=f._authoredStrike.time;
   f.hitstop=.2;for(let i=0;i<5;i++)f._animate(1/hz);assert.equal(f._authoredStrike.time,sourceTime);
  }finally{f.dispose();base.dispose();}
 }
 for(const q of samples)assert.ok(q.angleTo(samples[0])<.002,'frame rate must not choose a different source pose');
});
test('switching the committed hand mirrors the fighting stance and preserves the reachable contact point',()=>{
 const a=fighter(),b=fighter();a._meleeMotion.side=1;b._meleeMotion.side=-1;a._meleeMotion.point.x=.4;b._meleeMotion.point.x=-.4;
 try{
  for(let i=0;i<60;i++){a._animate(1/60);b._animate(1/60);}a.obj.updateMatrixWorld(true);b.obj.updateMatrixWorld(true);
  for(const [left,right]of [[a.parts.legL,b.parts.legR],[a.parts.legR,b.parts.legL],[a.parts.armR.children[2],b.parts.armL.children[2]]]){
   const v=left.getWorldPosition(new THREE.Vector3());v.x*=-1;
   assert.ok(v.distanceTo(right.getWorldPosition(new THREE.Vector3()))<.02,'mirrored punches must use mirrored anatomy, not only the opposite fist');
  }
 }finally{a.dispose();b.dispose();}
});

test('full startup/contact/recovery playback has no angular reset or pole flip',()=>{
 for(const id of ['sol','sarge'])for(const move of ['jab','cross','power'])for(const side of [-1,1]){
  const f=fighter(id);f.mId=move;f._meleeMotion.side=side;f.vel.set(0,0,0);let previous=null;
  try{
   const parts=[f.parts.body,f.parts.pelvis,f.parts.head,f.parts.armL,f.parts.armR,f.parts.legL,f.parts.legR];
   for(const state of ['startup','active','recover']){
    const count=Math.ceil(STRIKES[move][state]*120/(f.def.meleePace||1));
    for(let i=0;i<=count;i++){
     f.mstate=state;f.mT=STRIKES[move][state]*(1-i/count)/(f.def.meleePace||1);f.animT+=1/120;f._animate(1/120);
     if(previous)for(let j=0;j<parts.length;j++)assert.ok(previous[j].angleTo(parts[j].quaternion)<.6,`${id} ${move} side ${side} ${state} sample ${i}/${count} channel ${j} changed ${previous[j].angleTo(parts[j].quaternion)} rad`);
     previous=parts.map(p=>p.quaternion.clone());
    }
   }
  }finally{f.dispose();}
 }
});
