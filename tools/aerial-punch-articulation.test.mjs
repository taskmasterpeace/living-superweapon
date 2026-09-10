import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {TYPES} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

// VEGA / E Rush Combo: production procedural ability overlay, NOT a source clip.
function fixture(hz=120,phase=0){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega'))),dt=1/hz;
 Object.assign(f,{_openSky:true,flying:true,gait:'airborne'});f.pos.set(0,80,0);f.vel.set(0,0,65);f.aim.set(0,0,1);f.aim3.copy(f.aim);
 f.animT=phase;
 const g={audio:{zap(){},impact(){},boom(){}},world:{shake(){},punch(){}},vfx:{impact(){},impactStar(){}},trail(){},slowmo(){},coneFoe(){return null}};
 for(let i=0;i<hz;i++)f._animate(dt);
 const slot=f.slots.e;
 const sample=()=>{f.obj.updateMatrixWorld(true);const arm=f.parts.armR,hand=arm.children[2].getWorldPosition(new THREE.Vector3()),shoulder=arm.getWorldPosition(new THREE.Vector3());return {reach:hand.clone().sub(shoulder).dot(f.aim3),hand:hand.toArray(),pitch:f.parts.g.rotation.x,twist:f.parts.body.rotation.y,elbow:-arm.children[1].rotation.x};};
 return {f,g,slot,dt,sample,start(){TYPES.melee(f,slot.def,slot,g,{pressed:true,dt});},step(){TYPES.melee(f,slot.def,slot,g,{dt});f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);}};
}

test('legacy cone ability contact holds an extended fist during native hitstop, not a chambered hand',()=>{
 const x=fixture();try{
  delete x.slot.def.contact; // Legacy powers remain supported beside physical Rush Combo.
  x.start();x.g.coneFoe=()=>({id:'target',pos:new THREE.Vector3(0,80,7),guarding:false,staggerT:0,takeDamage(){}});
  TYPES.melee(x.f,x.slot.def,x.slot,x.g,{dt:x.dt});assert.ok(x.f.hitstop>0);
  // Native Fighter.update calls _animate but skips advanceActionPose in hitstop.
  x.f._animate(x.dt);const hit=x.sample();
  assert.ok(hit.reach>3,`impact froze a retracted fist: ${JSON.stringify(hit)}`);
  assert.ok(hit.pitch>1,'impact must not stand the forward-flying body upright');
  const first=x.sample();for(let i=0;i<8;i++)x.f._animate(x.dt);
  assert.ok(x.sample().reach>3,'contact must remain extended throughout hitstop');
  assert.equal(x.f._abilityMeleePose.elapsed,0,'render may synchronize contact, never advance simulation time');
  assert.ok(first.elbow<.5,'contact should visibly straighten the punch elbow');
 }finally{x.f.dispose();}
});

for(const hz of [30,60,120])test(`Rush Combo has distinct chamber/contact/recovery while prone (${hz}Hz)`,()=>{
 const x=fixture(hz);try{
  const pos=x.f.pos.clone();x.start();const samples=[];
  for(let i=0;i<Math.ceil(.5*hz);i++){x.step();samples.push({t:(i+1)/hz,...x.sample()});}
  const at=t=>samples.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a);
  const windup=at(.04),contact=at(.14),follow=at(.25),recovery=at(.4);
  assert.ok(contact.reach-windup.reach>1.1,`missing punch stroke ${JSON.stringify({windup,contact})}`);
  assert.ok(windup.elbow-contact.elbow>.8,'chamber must bend then straighten the elbow');
  assert.ok(recovery.elbow-contact.elbow>.5,'follow-through must recover the fist, not hold the flight lead indefinitely');
  assert.ok(follow.twist<windup.twist-.1,'shoulder rotation must drive the punch');
  assert.ok(samples.every(s=>s.pitch>1),'ability must keep forward flight through its entire action');
  assert.ok(x.f.pos.equals(pos),'visual articulation cannot translate authoritative physics root');
 }finally{x.f.dispose();}
});

for(const phase of Array.from({length:32},(_,i)=>i*10/32))test(`aerial punch rendered forearm/fist volumes clear torso throughout one-shot / phase ${phase}`,()=>{
 const x=fixture(120,phase),inside=trunkProbe(x.f.parts.torso),point=new THREE.Vector3();
 try{
  x.start();
  for(let frame=0;frame<75;frame++){
   x.step();const inverse=x.f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [x.f.parts.armL,x.f.parts.armR]){
    const surface=x.f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]);
    const check=(mesh,indices)=>{for(const i of indices){point.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);assert.ok(!inside(point,inverse),`${arm===x.f.parts.armR?'right':'left'} ${mesh.name} vertex ${i} penetrates torso at ${frame/120}s`);}};
    const indices=[];for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++)indices.push(row*surface.segments+j);
    check(surface.mesh,indices);const fist=arm.children[2];check(fist,Array.from({length:fist.geometry.attributes.position.count},(_,i)=>i));
   }
  }
 }finally{x.f.dispose();}
});
