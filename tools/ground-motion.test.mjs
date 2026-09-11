import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {GAIT} from '../src/core/util.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';

function fighter(id='sol',scale=1){
 const def=structuredClone(ROSTER.find(d=>d.id===id));def.frame={...def.frame,scale};
 const f=new Fighter(def);f._openSky=true;f.gait=GAIT.GROUNDED;f.flying=false;
 f.animT=0;f.vel.set(0,0,14);f.pos.set(12,0,24);f.obj.position.copy(f.pos);return f;
}
const tick=(f,dt)=>{f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);};

test('real grounded animation uses varying source elbow articulation without changing physics',()=>{
 const f=fighter(),elbows=[],pos=f.pos.toArray(),vel=f.vel.toArray();
 try{
  for(let i=0;i<150;i++){tick(f,1/60);elbows.push(-f.parts.armR.children[1].rotation.x);}
  assert.ok(Math.max(...elbows)-Math.min(...elbows)>.18,'Ground running must use source elbow motion, not the constant procedural bend');
  assert.deepEqual(f.pos.toArray(),pos);assert.deepEqual(f.vel.toArray(),vel);
  assert.equal(f._groundMotion.take,'Jog_Fwd_Loop');
 }finally{f.dispose();}
});
test('retargeting preserves scaled limb lengths, driven weapons and boot support over two cycles',()=>{
 for(const id of ['sol','sarge'])for(const scale of [.65,1,1.5]){
  const f=fighter(id,scale);
  try{for(let i=0;i<180;i++){
   tick(f,1/60);
   for(const arm of [f.parts.armL,f.parts.armR]){
    const upper=arm.userData.upperLength,fore=arm.userData.foreLength;
    const wrist=arm.children[2].position,elbow=new THREE.Vector3(0,-upper,0);
    assert.ok(Math.abs(wrist.distanceTo(elbow)-fore)<1e-5,'No telescoping forearm');
   }
   if(i>50){
    const a=new THREE.Box3().setFromObject(f.parts.legL.userData.boot),b=new THREE.Box3().setFromObject(f.parts.legR.userData.boot);
    assert.ok(Math.min(a.min.y,b.min.y)>=-.02,'Rendered boots must not penetrate the floor');
   }
  }}finally{f.dispose();}
 }
});
test('ground source phase is frame-rate independent and pauses with hitstop',()=>{
 const samples=[];
 for(const hz of [30,60,120]){
  const f=fighter();try{
   for(let i=0;i<hz*2;i++)tick(f,1/hz);
   assert.ok(f._groundMotion,'A ground motion channel must exist');
   samples.push(f.parts.armR.quaternion.clone());const phase=f._groundMotion.phase;
   f.hitstop=.2;for(let i=0;i<5;i++)tick(f,1/hz);
   assert.equal(f._groundMotion.phase,phase);
  }finally{f.dispose();}
 }
 for(const q of samples)assert.ok(q.angleTo(samples[0])<.025,'Sampling at another frame rate cannot change the take phase');
});
for(const hz of [30,60,120])for(const sign of [-1,1])test(`ground contact observation retains the native signed phase at ${hz}Hz (${sign})`,()=>{
 const f=fighter();f.vel.set(0,0,sign*15);
 try{
  tick(f,1/hz);const sample=f._groundMotion.contactSample;
  assert.equal(Math.sign(sample.phaseDelta),sign);assert.ok(Math.abs(sample.phaseDelta-sign*15/15/hz)<1e-10);
  assert.ok(Math.abs(sample.weights.reduce((a,b)=>a+b,0)-1)<1e-12);
  const serial=sample.serial,phase=sample.phase;f.hitstop=.2;tick(f,1/hz);
  assert.equal(f._groundMotion.contactSample.phaseDelta,0);assert.equal(f._groundMotion.contactSample.phase,phase);
  assert.equal(f._groundMotion.contactSample.serial,serial+1,'presentation produces one observation, not another motion clock');
 }finally{f.dispose();}
});
test('a planted source toe keeps the rendered walking boots near the floor',()=>{
 const f=fighter();f.vel.set(0,0,7.5);
 try{
  for(let i=0;i<33;i++)tick(f,1/60);
  const low=Math.min(...[f.parts.legL,f.parts.legR].map(leg=>new THREE.Box3().setFromObject(leg.userData.boot).min.y));
  assert.ok(low>=-.02&&low<.08,`Walking toe support must stay grounded, got ${low}`);
 }finally{f.dispose();}
});
test('flight and guard take priority and procedural selection restores the unchanged base',()=>{
 const f=fighter(),base=fighter();base.def.model={...base.def.model,locomotion:'procedural'};
 try{
  for(let i=0;i<90;i++){tick(f,1/60);tick(base,1/60);}
  for(const state of ['guard','flight']){
   if(state==='guard'){f.poseGuard=base.poseGuard=1;f.guarding=base.guarding=true;}
   else{f.poseGuard=base.poseGuard=0;f.guarding=base.guarding=false;f.gait=base.gait=GAIT.AIRBORNE;f.flying=base.flying=true;}
   for(let i=0;i<120;i++){tick(f,1/60);tick(base,1/60);}
   assert.ok(f.parts.armR.quaternion.angleTo(base.parts.armR.quaternion)<.005,state);
   assert.ok(f.parts.body.position.distanceTo(base.parts.body.position)<.005,state+' body recovery');
  }
 }finally{f.dispose();base.dispose();}
});
test('ground animation preference survives validated presentation round trips',()=>{
 const def=ROSTER[0],profile=profileFromDef(def);profile.model.locomotion='procedural';
 const restored=validateProfile(JSON.parse(JSON.stringify(profile)));
 assert.equal(applyProfile(def,restored).model.locomotion,'procedural');
 profile.model.locomotion='unknown';assert.throws(()=>validateProfile(profile),/locomotion/i);
});
test('changing form during a run cannot bake locomotion lean into the new body',()=>{
 for(const interrupted of [false,true]){
 const f=fighter(),base=fighter();base.def.model={...base.def.model,locomotion:'procedural'};
 try{
  for(let i=0;i<90;i++){tick(f,1/60);tick(base,1/60);}
  if(interrupted)for(const actor of [f,base]){queueHitReaction(actor,16,{kb:new THREE.Vector3(1,0,0)});tick(actor,1/60);}
  f.applyForm({frame:{scale:1.2}});base.applyForm({frame:{scale:1.2}});
  f.vel.set(0,0,0);base.vel.set(0,0,0);
  for(let i=0;i<600;i++){tick(f,1/60);tick(base,1/60);}
  for(const key of ['body','head','armL','armR'])assert.ok(f.parts[key].quaternion.angleTo(base.parts[key].quaternion)<.005,`${key}: a temporary run/hit pose must not become the new rest pose`);
 }finally{f.dispose();base.dispose();}
 }
});
